from flask import Blueprint, request, jsonify

from services.stt_service import transcribe_audio

stt_bp = Blueprint("stt", __name__)


@stt_bp.route("/transcribe", methods=["POST"])
def transcribe():
    """Recibe un audio y devuelve la transcripcion en texto."""
    if "audio" not in request.files:
        return jsonify({"error": "Falta archivo 'audio'"}), 400

    audio_file = request.files["audio"]
    language = request.form.get("language", "es-ES")

    text = transcribe_audio(audio_file.read(), language=language)
    return jsonify({"transcript": text}), 200
