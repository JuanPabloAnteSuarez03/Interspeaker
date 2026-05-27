"""
Configuracion centralizada del LLM (Gemini) - HU16.

Todas las variables se leen desde el archivo .env (nunca hardcodeadas).
El .env esta en .gitignore: la API key nunca llega al repositorio.
"""

from __future__ import annotations

import os

_DEFAULT_MODEL = "gemini-2.5-flash"
_DEFAULT_TIMEOUT = 30


def stub_mode() -> bool:
    """
    Devuelve True cuando NO se deben hacer llamadas reales a Gemini.

    Orden de evaluacion:
    1. SKIP_GEMINI=1         -> stub forzado (tests locales y CI).
    2. GEMINI_LIVE_IN_CI=1   -> usa la API real aunque estemos en GitHub Actions.
    3. GITHUB_ACTIONS=true   -> stub automatico si no se fuerzo live.
    4. API key ausente/placeholder -> stub.
    """
    if os.getenv("SKIP_GEMINI", "").strip().lower() in ("1", "true", "yes"):
        return True
    if os.getenv("GEMINI_LIVE_IN_CI", "").strip().lower() in ("1", "true", "yes"):
        return False
    if os.getenv("GITHUB_ACTIONS", "").strip().lower() == "true":
        return True
    return not credentials_configured()


def credentials_configured() -> bool:
    """True si GEMINI_API_KEY existe y no es un valor de placeholder."""
    key = _api_key()
    return bool(key) and not key.lower().startswith("dummy") and key != "your_gemini_api_key_here"


def model_name() -> str:
    """Nombre del modelo leido de GEMINI_MODEL (default: gemini-2.5-flash)."""
    return os.getenv("GEMINI_MODEL", _DEFAULT_MODEL).strip() or _DEFAULT_MODEL


def request_timeout() -> int:
    """Timeout en segundos para llamadas al LLM (default: 30)."""
    try:
        return int(os.getenv("GEMINI_TIMEOUT", str(_DEFAULT_TIMEOUT)))
    except ValueError:
        return _DEFAULT_TIMEOUT


def _api_key() -> str:
    """Clave de API leida exclusivamente desde la variable de entorno."""
    return os.getenv("GEMINI_API_KEY", "").strip()
