"""Servicio de integracion con Gemini 2.5 Flash para generacion de preguntas y evaluacion."""

import os

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None


MODEL_NAME = "gemini-2.5-flash"


def _get_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
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
