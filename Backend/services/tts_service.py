"""Servicio Text-to-Speech usando Google Cloud Text-to-Speech."""

import os

try:
    from google.cloud import texttospeech
except ImportError:  # pragma: no cover
    texttospeech = None


def synthesize_speech(text: str, voice: str = "es-ES-Standard-A") -> bytes:
    """Convierte texto en audio MP3."""
    if texttospeech is None or not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        return b""

    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice_params = texttospeech.VoiceSelectionParams(
        language_code=voice.rsplit("-", 1)[0],
        name=voice,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
    )
    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice_params,
        audio_config=audio_config,
    )
    return response.audio_content
