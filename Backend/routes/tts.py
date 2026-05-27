from flask import Blueprint, request, jsonify, Response

from services.tts_service import synthesize_speech

tts_bp = Blueprint("tts", __name__)


@tts_bp.route("/synthesize", methods=["POST"])
def synthesize():
    """Convierte texto en audio MP3 (entrevistador)."""
    data = request.get_json(silent=True) or {}
    text = data.get("text")
    voice = data.get("voice", "aura-2-diana-es")

    if not text:
        return jsonify({"error": "Falta el campo 'text'"}), 400

    audio_bytes = synthesize_speech(text=text, voice=voice)
    return Response(audio_bytes, mimetype="audio/mpeg")
