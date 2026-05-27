"""Configuracion de Google Cloud Speech-to-Text (HU05 / IN-61)."""

import os


def stub_mode() -> bool:
    """Modo sin llamadas a Deepgram (tests, CI, desarrollo sin credenciales)."""
    flag = os.getenv("SKIP_STT", "").strip().lower()
    if flag in ("1", "true", "yes"):
        return True
    if os.getenv("STT_LIVE_IN_CI", "").strip().lower() in ("1", "true", "yes"):
        return False
    if os.getenv("GITHUB_ACTIONS", "").strip().lower() == "true":
        return True
    return not credentials_configured()


def credentials_configured() -> bool:
    return bool(deepgram_api_key())


def deepgram_api_key() -> str | None:
    raw = os.getenv("DEEPGRAM_API_KEY", "").strip()
    return raw or None


def default_language() -> str:
    return os.getenv("STT_LANGUAGE_CODE", "es-ES").strip() or "es-ES"


def default_sample_rate() -> int:
    try:
        return int(os.getenv("STT_SAMPLE_RATE_HERTZ", "48000"))
    except ValueError:
        return 48000


def min_audio_bytes() -> int:
    try:
        return int(os.getenv("STT_MIN_AUDIO_BYTES", "500"))
    except ValueError:
        return 500
