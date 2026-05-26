"""Deepgram Speech-to-Text (HU05 / IN-61, IN-62)."""

from __future__ import annotations

import logging
from typing import Optional

from config import stt_settings

logger = logging.getLogger(__name__)

try:
    from deepgram import DeepgramClient, PrerecordedOptions, FileSource
except ImportError:  # pragma: no cover
    DeepgramClient = None


class STTError(Exception):
    """Error base de STT."""

    def __init__(self, message: str, code: str = "stt_error"):
        super().__init__(message)
        self.message = message
        self.code = code


class STTNotConfiguredError(STTError):
    def __init__(self):
        super().__init__(
            "Speech-to-Text no configurado. Define DEEPGRAM_API_KEY.",
            code="stt_not_configured",
        )


class STTValidationError(STTError):
    pass


class STTTranscriptionError(STTError):
    pass


def get_status() -> dict:
    """Estado de la integracion para health checks y depuracion."""
    return {
        "provider": "deepgram",
        "mode": "stub" if stt_settings.stub_mode() else "live",
        "credentials_configured": stt_settings.credentials_configured(),
        "language_default": stt_settings.default_language(),
    }


def transcribe_audio(
    audio_bytes: bytes,
    *,
    language: Optional[str] = None,
    filename: str = "answer.webm",
    content_type: Optional[str] = None,
) -> str:
    """
    Transcribe audio del usuario.
    En stub devuelve texto fijo; con credenciales llama a Deepgram.
    """
    if not audio_bytes:
        raise STTValidationError("El audio esta vacio.", code="audio_empty")

    if len(audio_bytes) < stt_settings.min_audio_bytes():
        raise STTValidationError(
            "El audio es demasiado corto. Graba al menos un par de segundos.",
            code="audio_too_short",
        )

    lang = language or stt_settings.default_language()

    if stt_settings.stub_mode():
        return f"[stub] Respuesta transcrita ({lang}, {len(audio_bytes)} bytes)"

    if DeepgramClient is None:
        raise STTNotConfiguredError()

    if not stt_settings.credentials_configured():
        raise STTNotConfiguredError()

    try:
        client = DeepgramClient(api_key=stt_settings.deepgram_api_key())
        payload: FileSource = {"buffer": audio_bytes}
        
        # Deepgram uses two-letter language codes usually (e.g. 'es' instead of 'es-ES')
        dg_lang = lang.split('-')[0] if lang else "es"
        
        options = PrerecordedOptions(
            model="nova-2",
            language=dg_lang,
            smart_format=True,
        )
        
        response = client.listen.prerecorded.v("1").transcribe_file(payload, options)
        
        text = ""
        if response.results and response.results.channels:
            text = response.results.channels[0].alternatives[0].transcript.strip()
            
        if not text:
            raise STTTranscriptionError(
                "No se detecto voz en el audio. Intenta grabar de nuevo.",
                code="no_speech_detected",
            )
        return text

    except STTError:
        raise
    except Exception as exc:  # pragma: no cover
        logger.exception("Error en Deepgram STT")
        raise STTTranscriptionError(
            f"Error al transcribir: {exc}",
            code="stt_provider_error",
        ) from exc
