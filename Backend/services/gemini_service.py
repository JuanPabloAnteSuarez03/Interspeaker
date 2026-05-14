"""Servicio de integracion con Gemini 2.5 Flash para generacion de preguntas y evaluacion."""

import os

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None


MODEL_NAME = "gemini-2.5-flash"


def _stub_mode() -> bool:
    """No llamar a la API en tests/CI salvo opt-in explicito."""
    if os.getenv("SKIP_GEMINI", "").strip().lower() in ("1", "true", "yes"):
        return True
    if os.getenv("GEMINI_LIVE_IN_CI", "").strip().lower() in ("1", "true", "yes"):
        return False
    if os.getenv("GITHUB_ACTIONS", "").strip().lower() == "true":
        return True
    key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not key:
        return True
    low = key.lower()
    if low.startswith("dummy") or "dummy_key" in low:
        return True
    return False


def _get_model():
    if _stub_mode() or genai is None:
        return None
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(MODEL_NAME)


def generate_question(area: str, level: str, history: list) -> str:
    """Genera una pregunta tecnica contextualizada al area y nivel del usuario."""
    model = _get_model()
    if model is None:
        return f"[stub] Pregunta de {area} ({level})"

    prompt = (
        f"Eres un entrevistador tecnico de {area}. Nivel del candidato: {level}. "
        "Genera UNA sola pregunta tecnica clara, sin repetir las previas. "
        f"Historial:\n{history}"
    )
    response = model.generate_content(prompt)
    return response.text.strip()


def evaluate_session(area: str, level: str, transcripts: list) -> dict:
    """Evalua las respuestas del usuario y devuelve reporte estructurado."""
    model = _get_model()
    if model is None:
        return {
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "recommendations": ["Configura GEMINI_API_KEY para obtener evaluacion real."],
        }

    prompt = (
        f"Evalua una entrevista de {area} (nivel {level}). "
        "Responde en JSON con: score (0-100), strengths, weaknesses, recommendations. "
        f"Respuestas del candidato:\n{transcripts}"
    )
    response = model.generate_content(prompt)
    return {"raw": response.text}
