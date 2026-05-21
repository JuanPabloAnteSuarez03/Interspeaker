"""Servicio Text-to-Speech usando Deepgram Aura."""

import os
import logging
import requests

logger = logging.getLogger(__name__)

def synthesize_speech(text: str, voice: str = "aura-2-diana-es") -> bytes:
    """Convierte texto en audio MP3 usando Deepgram."""
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        logger.error("DEEPGRAM_API_KEY no configurada. TTS abortado.")
        return b""

    url = f"https://api.deepgram.com/v1/speak?model={voice}&encoding=mp3"
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json"
    }
    payload = {"text": text}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        return response.content
    except Exception as exc:
        logger.exception(f"Error generando TTS con Deepgram: {exc}")
        return b""
