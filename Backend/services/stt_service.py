"""Servicio Speech-to-Text usando Google Cloud Speech."""

import os

try:
    from google.cloud import speech
except ImportError:  # pragma: no cover
    speech = None


def transcribe_audio(audio_bytes: bytes, language: str = "es-ES") -> str:
    """Transcribe audio (LINEAR16/FLAC/MP3) usando Google Cloud Speech-to-Text."""
    if speech is None or not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        return "[stub] transcripcion no disponible"

    client = speech.SpeechClient()
    audio = speech.RecognitionAudio(content=audio_bytes)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
        language_code=language,
        enable_automatic_punctuation=True,
    )
    response = client.recognize(config=config, audio=audio)
    return " ".join(r.alternatives[0].transcript for r in response.results)
