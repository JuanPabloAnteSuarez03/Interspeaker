"""
Endpoints del flujo de entrevista - HU16.

POST /api/interview/start  -> primera pregunta (LLM -> opcionalmente TTS)
POST /api/interview/next   -> siguiente pregunta con historial (LLM -> opcionalmente TTS)

El parametro opcional include_audio: true en el body indica que la respuesta
debe incluir el audio MP3 de la pregunta codificado en base64.
"""

from __future__ import annotations

import base64
import logging

from flask import Blueprint, jsonify, request

from services.gemini_service import generate_question
from services.tts_service import TTSError, synthesize_speech

logger = logging.getLogger(__name__)

interview_bp = Blueprint("interview", __name__)


def _maybe_synthesize(text: str, voice: str, include_audio: bool) -> str | None:
    """
    Sintetiza el texto con TTS si include_audio es True.
    Si el TTS falla, registra el error y devuelve None para no bloquear
    la respuesta: el frontend igual recibe el texto de la pregunta.
    """
    if not include_audio:
        return None
    try:
        audio_bytes = synthesize_speech(text=text, voice=voice)
        return base64.b64encode(audio_bytes).decode("utf-8")
    except TTSError as exc:
        logger.error("TTS fallo al sintetizar pregunta: %s", exc.message)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.error("TTS error inesperado: %s", exc)
        return None


@interview_bp.route("/start", methods=["POST"])
def start_interview():
    """
    Inicia una sesion y genera la primera pregunta.

    Body JSON:
        area          (str, requerido)
        level         (str, opcional, default: junior)
        session_id    (str, opcional)
        include_audio (bool, opcional, default: false)
        voice         (str, opcional, default: aura-2-diana-es)
    """
    data = request.get_json(silent=True) or {}
    area: str = data.get("area", "").strip()
    level: str = data.get("level", "junior").strip()
    session_id: str = (data.get("session_id") or "__anon__").strip()
    include_audio: bool = bool(data.get("include_audio", False))
    voice: str = data.get("voice", "aura-2-diana-es")

    if not area:
        return jsonify({"error": "Falta el campo 'area'"}), 400

    question = generate_question(
        area=area,
        level=level,
        history=[],
        session_id=session_id,
    )

    history = [{"role": "interviewer", "text": question}]
    response_body: dict = {
        "question": question,
        "history": history,
        "session_id": session_id,
    }

    audio_b64 = _maybe_synthesize(question, voice, include_audio)
    if audio_b64 is not None:
        response_body["audio_base64"] = audio_b64

    return jsonify(response_body), 200


@interview_bp.route("/next", methods=["POST"])
def next_question():
    """
    Genera la siguiente pregunta usando el historial conversacional.

    El historial debe incluir tanto los turnos del entrevistador como las
    respuestas transcritas del candidato (STT) para coherencia conversacional.

    Body JSON:
        area          (str, requerido)
        level         (str, opcional, default: junior)
        history       (list, opcional)
        session_id    (str, opcional)
        include_audio (bool, opcional, default: false)
        voice         (str, opcional, default: aura-2-diana-es)
    """
    data = request.get_json(silent=True) or {}
    area: str = data.get("area", "").strip()
    level: str = data.get("level", "junior").strip()
    history: list = data.get("history", [])
    session_id: str = (data.get("session_id") or "__anon__").strip()
    include_audio: bool = bool(data.get("include_audio", False))
    voice: str = data.get("voice", "aura-2-diana-es")

    if not area:
        return jsonify({"error": "Falta el campo 'area'"}), 400

    question = generate_question(
        area=area,
        level=level,
        history=history,
        session_id=session_id,
    )

    history.append({"role": "interviewer", "text": question})
    response_body: dict = {
        "question": question,
        "history": history,
        "session_id": session_id,
    }

    audio_b64 = _maybe_synthesize(question, voice, include_audio)
    if audio_b64 is not None:
        response_body["audio_base64"] = audio_b64

    return jsonify(response_body), 200
