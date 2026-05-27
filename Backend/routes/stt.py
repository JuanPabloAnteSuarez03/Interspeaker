from flask import Blueprint, jsonify, request

from config import stt_settings
from services import transcript_store
from services.stt_service import (
    STTError,
    STTNotConfiguredError,
    STTTranscriptionError,
    STTValidationError,
    get_status,
    transcribe_audio,
)

stt_bp = Blueprint("stt", __name__)


def _error_response(exc: STTError, status: int):
    return jsonify({"error": exc.message, "code": exc.code}), status


@stt_bp.route("/status", methods=["GET"])
@stt_bp.route("/status/", methods=["GET"])
def stt_status():
    """IN-61: estado de la integracion con Google Cloud STT."""
    return jsonify(get_status())


@stt_bp.route("/transcribe", methods=["POST"])
def transcribe():
    """
    IN-62: recibe audio del frontend, transcribe y opcionalmente persiste (IN-66).
  Form-data: audio (file), language?, session_id?, question_index?
    """
    if "audio" not in request.files:
        return jsonify({"error": "Falta archivo 'audio'", "code": "missing_audio"}), 400

    audio_file = request.files["audio"]
    raw = audio_file.read()
    language = request.form.get("language") or stt_settings.default_language()
    session_id = (request.form.get("session_id") or "").strip()
    question_index = request.form.get("question_index")

    try:
        transcript = transcribe_audio(
            raw,
            language=language,
            filename=audio_file.filename or "answer.webm",
            content_type=audio_file.content_type,
        )
    except STTValidationError as exc:
        return _error_response(exc, 400)
    except STTNotConfiguredError as exc:
        return _error_response(exc, 503)
    except STTTranscriptionError as exc:
        return _error_response(exc, 422)
    except STTError as exc:
        return _error_response(exc, 500)

    stored = None
    if session_id:
        entry = {
            "transcript": transcript,
            "language": language,
            "question_index": question_index,
            "audio_bytes": len(raw),
        }
        stored = transcript_store.append(session_id, entry)

    body = {
        "transcript": transcript,
        "language": language,
        "mode": get_status()["mode"],
    }
    if session_id:
        body["session_id"] = session_id
    if stored is not None:
        body["stored"] = True

    return jsonify(body), 200


@stt_bp.route("/transcripts/<session_id>", methods=["GET"])
def get_transcripts(session_id):
    """IN-66: listar transcripciones guardadas de una sesion."""
    items = transcript_store.list_for_session(session_id)
    return jsonify({"session_id": session_id, "transcripts": items, "count": len(items)}), 200
