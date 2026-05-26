"""
Servicio Text-to-Speech usando Deepgram Aura - HU16.

Cambios:
- Modo stub controlado por SKIP_TTS (par a SKIP_STT y SKIP_GEMINI).
- Excepciones tipadas: TTSError, TTSNotConfiguredError, TTSSynthesisError.
- La API key se lee exclusivamente de DEEPGRAM_API_KEY en el .env.
"""

from __future__ import annotations

import logging
import os

import requests

logger = logging.getLogger(__name__)

# Bytes de un frame MP3 de silencio valido para modo stub.
# Permite que el frontend reciba audio sin romper aunque sea silencio.
_STUB_SILENT_MP3 = b"\xff\xfb\x90\x00" + b"\x00" * 413


# ---------------------------------------------------------------------------
# Excepciones tipadas
# ---------------------------------------------------------------------------

class TTSError(Exception):
    """Error base del servicio TTS."""

    def __init__(self, message: str, code: str = "tts_error") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class TTSNotConfiguredError(TTSError):
    """La API key de Deepgram no esta configurada."""

    def __init__(self) -> None:
        super().__init__(
            "Text-to-Speech no configurado. Define DEEPGRAM_API_KEY en el archivo .env.",
            code="tts_not_configured",
        )


class TTSSynthesisError(TTSError):
    """Error durante la sintesis de audio en Deepgram."""

    def __init__(self, detail: str) -> None:
        super().__init__(
            f"Error al sintetizar audio: {detail}",
            code="tts_synthesis_error",
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stub_mode() -> bool:
    """
    Devuelve True cuando no se deben hacer llamadas reales a Deepgram TTS.
    Se activa con SKIP_TTS=1 o cuando DEEPGRAM_API_KEY no esta configurada.
    """
    if os.getenv("SKIP_TTS", "").strip().lower() in ("1", "true", "yes"):
        return True
    return not _api_key_configured()


def _api_key_configured() -> bool:
    return bool(os.getenv("DEEPGRAM_API_KEY", "").strip())


def get_status() -> dict:
    """Estado del servicio TTS para health checks."""
    return {
        "provider": "deepgram-aura",
        "mode": "stub" if _stub_mode() else "live",
        "credentials_configured": _api_key_configured(),
    }


# ---------------------------------------------------------------------------
# API publica
# ---------------------------------------------------------------------------

def synthesize_speech(text: str, voice: str = "aura-2-diana-es") -> bytes:
    """
    Convierte texto en audio MP3 usando Deepgram Aura.

    El texto debe llegar ya sanitizado (sin markdown) desde gemini_service,
    ya que Deepgram leera cualquier simbolo que encuentre.

    Args:
        text:  Texto a sintetizar.
        voice: Modelo de voz Deepgram Aura (default: aura-2-diana-es).

    Returns:
        Bytes de audio MP3.

    Raises:
        TTSNotConfiguredError: Si DEEPGRAM_API_KEY no esta configurada.
        TTSSynthesisError:     Si Deepgram devuelve un error HTTP.
    """
    if not text or not text.strip():
        logger.warning("synthesize_speech: texto vacio, retornando silencio.")
        return _STUB_SILENT_MP3

    if _stub_mode():
        logger.debug("synthesize_speech: modo stub, retornando audio ficticio.")
        return _STUB_SILENT_MP3

    api_key = os.getenv("DEEPGRAM_API_KEY", "").strip()
    if not api_key:
        raise TTSNotConfiguredError()

    url = f"https://api.deepgram.com/v1/speak?model={voice}&encoding=mp3"
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json={"text": text},
            timeout=15,
        )
        response.raise_for_status()
        return response.content
    except requests.HTTPError as exc:
        logger.error("Deepgram TTS HTTP error: %s", exc.response.status_code)
        raise TTSSynthesisError(f"HTTP {exc.response.status_code}") from exc
    except requests.RequestException as exc:
        logger.error("Deepgram TTS request error: %s", exc)
        raise TTSSynthesisError(str(exc)) from exc
