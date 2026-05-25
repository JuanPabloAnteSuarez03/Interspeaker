"""
Servicio de integracion con Gemini 2.5 Flash - HU16.

La API key se lee UNICAMENTE desde la variable de entorno GEMINI_API_KEY,
definida en el archivo .env (excluido del repositorio por .gitignore).
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any

from config import llm_settings
from services import llm_metrics

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Helpers privados
# ---------------------------------------------------------------------------

def _get_model() -> Any | None:
    """Inicializa el modelo de Gemini. Devuelve None en modo stub."""
    if llm_settings.stub_mode() or genai is None:
        return None
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(llm_settings.model_name())


def _estimate_tokens(text: str) -> int:
    """Estimacion rapida: 1 token ~ 4 caracteres."""
    return max(1, len(text) // 4)


def _sanitize_for_tts(text: str) -> str:
    """
    Limpia markdown de la respuesta del LLM antes de enviarla a Deepgram TTS.
    Sin esto, el TTS leeria simbolos como asteriscos o numeracion en voz alta.
    """
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", text)
    text = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", text)
    text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


def _call_model(model: Any, prompt: str) -> str:
    """Ejecuta la llamada al modelo y retorna el texto."""
    response = model.generate_content(prompt)
    return response.text.strip()


def _build_history_text(history: list[dict]) -> str:
    """Formatea el historial para el prompt, etiquetando cada turno."""
    if not history:
        return "Sin historial previo (primera pregunta de la entrevista)."
    lines = []
    for turn in history:
        role = turn.get("role", "desconocido").upper()
        text = turn.get("text", "").strip()
        lines.append(f"[{role}]: {text}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# API publica
# ---------------------------------------------------------------------------

def get_llm_status() -> dict[str, Any]:
    """
    Verifica el estado de la conexion con Gemini.
    En modo stub responde sin llamar a la API.
    En modo live hace una llamada minima y mide latencia.
    """
    model_id = llm_settings.model_name()
    configured = llm_settings.credentials_configured()
    is_stub = llm_settings.stub_mode()

    if is_stub:
        return {
            "provider": "google-gemini",
            "model": model_id,
            "mode": "stub",
            "api_key_configured": configured,
            "status": "ok",
            "latency_ms": None,
        }

    model = _get_model()
    if model is None:
        return {
            "provider": "google-gemini",
            "model": model_id,
            "mode": "live",
            "api_key_configured": configured,
            "status": "error",
            "error": "No se pudo inicializar el modelo. Revisa GEMINI_API_KEY en .env.",
            "latency_ms": None,
        }

    start = time.perf_counter()
    try:
        _call_model(model, "Responde unicamente con la palabra: ok")
        latency_ms = (time.perf_counter() - start) * 1000
        llm_metrics.record(
            session_id="__health__",
            operation="status_check",
            latency_ms=latency_ms,
            estimated_tokens=10,
            model=model_id,
            stub=False,
        )
        return {
            "provider": "google-gemini",
            "model": model_id,
            "mode": "live",
            "api_key_configured": configured,
            "status": "ok",
            "latency_ms": round(latency_ms, 2),
        }
    except Exception as exc:  # noqa: BLE001
        latency_ms = (time.perf_counter() - start) * 1000
        logger.error("LLM status check failed: %s", exc)
        return {
            "provider": "google-gemini",
            "model": model_id,
            "mode": "live",
            "api_key_configured": configured,
            "status": "error",
            "error": str(exc),
            "latency_ms": round(latency_ms, 2),
        }


def generate_question(
    area: str,
    level: str,
    history: list[dict],
    session_id: str = "__anon__",
) -> str:
    """
    Genera una pregunta tecnica contextualizada, lista para TTS.

    El texto pasa por _sanitize_for_tts() antes de retornarse.
    El prompt indica al modelo tolerancia a errores de transcripcion STT.

    Args:
        area:       Area tecnica (ej: backend, frontend, datos).
        level:      Nivel del candidato (junior, mid, senior).
        history:    Historial de turnos [{"role": "...", "text": "..."}].
        session_id: ID de sesion para vincular metricas.
    """
    model_id = llm_settings.model_name()
    is_stub = llm_settings.stub_mode()
    model = _get_model()

    start = time.perf_counter()

    if model is None:
        question_num = len([t for t in history if t.get("role") == "interviewer"]) + 1
        stub_text = (
            f"Esta es la pregunta numero {question_num} sobre {area} "
            f"para nivel {level}. Por favor, explica tu experiencia en este tema."
        )
        latency_ms = (time.perf_counter() - start) * 1000
        llm_metrics.record(
            session_id=session_id,
            operation="generate_question",
            latency_ms=latency_ms,
            estimated_tokens=_estimate_tokens(stub_text),
            model=model_id,
            stub=True,
        )
        return stub_text

    history_text = _build_history_text(history)
    question_number = len([t for t in history if t.get("role") == "interviewer"]) + 1

    prompt = (
        f"Eres un entrevistador tecnico experto en {area}, realizando una entrevista oral.\n"
        f"El candidato tiene nivel {level}.\n"
        f"Esta es la pregunta numero {question_number} de la entrevista.\n\n"
        "INSTRUCCIONES IMPORTANTES:\n"
        "- Formula UNA sola pregunta tecnica, clara y directa.\n"
        "- Habla como en una conversacion real: sin markdown, listas, asteriscos ni numeracion.\n"
        "- La pregunta debe tener maximo 2 oraciones para ser comoda de escuchar.\n"
        "- Adapta la dificultad al nivel: junior=conceptos basicos, "
        "mid=aplicacion practica, senior=diseno y decisiones arquitectonicas.\n"
        "- No repitas preguntas del historial.\n"
        "- El historial puede tener imperfecciones de transcripcion (es audio convertido "
        "a texto automaticamente). Ignora errores menores de escritura.\n"
        "- Responde SOLO con la pregunta. Sin prefijos como 'Pregunta:' ni aclaraciones.\n\n"
        f"HISTORIAL DE LA ENTREVISTA:\n{history_text}\n\n"
        "Nueva pregunta del entrevistador:"
    )

    question = ""
    try:
        raw = _call_model(model, prompt)
        question = _sanitize_for_tts(raw)
    except Exception as exc:  # noqa: BLE001
        logger.error("generate_question failed (session=%s): %s", session_id, exc)
        question = (
            f"Cuentame sobre tu experiencia con {area}. "
            "Que desafio tecnico reciente te parecio mas interesante?"
        )

    latency_ms = (time.perf_counter() - start) * 1000
    llm_metrics.record(
        session_id=session_id,
        operation="generate_question",
        latency_ms=latency_ms,
        estimated_tokens=_estimate_tokens(prompt + question),
        model=model_id,
        stub=is_stub,
    )
    return question


def evaluate_session(
    area: str,
    level: str,
    transcripts: list,
    session_id: str = "__anon__",
) -> dict[str, Any]:
    """
    Evalua las respuestas del candidato y devuelve retroalimentacion estructurada.

    Las transcripciones vienen del STT: el prompt indica al modelo tolerancia
    con imprecisiones fonoticas en el texto.

    Returns:
        Dict con: score (0-100), strengths, weaknesses, recommendations.
    """
    model_id = llm_settings.model_name()
    is_stub = llm_settings.stub_mode()
    model = _get_model()

    start = time.perf_counter()

    if model is None:
        latency_ms = (time.perf_counter() - start) * 1000
        stub_result: dict[str, Any] = {
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "recommendations": [
                "Configura GEMINI_API_KEY en el archivo .env para obtener evaluacion real."
            ],
            "stub": True,
        }
        llm_metrics.record(
            session_id=session_id,
            operation="evaluate_session",
            latency_ms=latency_ms,
            estimated_tokens=10,
            model=model_id,
            stub=True,
        )
        return stub_result

    def _extract_text(t: str | dict) -> str:
        if isinstance(t, str):
            return t
        return str(t.get("transcript", t))

    transcripts_text = "\n".join(
        f"- Respuesta {i + 1}: {_extract_text(t)}"
        for i, t in enumerate(transcripts)
    )

    prompt = (
        f"Evalua la siguiente entrevista tecnica de {area} para candidato nivel {level}.\n\n"
        "CONTEXTO: Las respuestas provienen de transcripciones de audio automaticas "
        "(Speech-to-Text). Puede haber imprecisiones en la escritura. "
        "Evalua el contenido tecnico, no la ortografia.\n\n"
        f"RESPUESTAS DEL CANDIDATO:\n{transcripts_text}\n\n"
        "Devuelve UNICAMENTE un objeto JSON valido con esta estructura, "
        "sin texto antes ni despues:\n"
        "{\n"
        '  "score": <entero 0-100>,\n'
        '  "strengths": [<fortalezas como strings>],\n'
        '  "weaknesses": [<areas de mejora como strings>],\n'
        '  "recommendations": [<recomendaciones de estudio como strings>]\n'
        "}"
    )

    result: dict[str, Any] = {}
    raw = ""
    try:
        raw = _call_model(model, prompt)
        clean = raw.strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\s*", "", clean)
            clean = re.sub(r"\s*```$", "", clean)
        parsed = json.loads(clean)
        result = {
            "score": int(parsed.get("score", 0)),
            "strengths": list(parsed.get("strengths", [])),
            "weaknesses": list(parsed.get("weaknesses", [])),
            "recommendations": list(parsed.get("recommendations", [])),
        }
    except json.JSONDecodeError:
        logger.warning(
            "evaluate_session: Gemini no devolvio JSON valido (session=%s). raw=%s",
            session_id, raw[:300],
        )
        result = {
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
            "raw": raw,
            "parse_error": True,
        }
    except Exception as exc:  # noqa: BLE001
        logger.error("evaluate_session failed (session=%s): %s", session_id, exc)
        result = {
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
            "error": str(exc),
        }

    latency_ms = (time.perf_counter() - start) * 1000
    llm_metrics.record(
        session_id=session_id,
        operation="evaluate_session",
        latency_ms=latency_ms,
        estimated_tokens=_estimate_tokens(prompt + str(result)),
        model=model_id,
        stub=is_stub,
    )
    return result
