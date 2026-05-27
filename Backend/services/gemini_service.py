from __future__ import annotations

import json
import logging
import time
import os
from typing import Any, List, Dict

from google import genai
from google.genai import types
from google.genai.errors import APIError

from config import llm_settings
from services import llm_metrics

logger = logging.getLogger(__name__)

def _get_client() -> genai.Client:
    """Inicializa y devuelve el cliente oficial de Gemini."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    return genai.Client(api_key=api_key)

def generate_interview_questions(area: str, experience: str, num_questions: int = 10) -> List[str]:
    """
    Genera un lote completo de preguntas al inicio de la entrevista utilizando
    Structured Outputs (JSON Schema) para asegurar un formato de retorno limpio.
    """
    start_time = time.perf_counter()
    model = llm_settings.model_name()
    if llm_settings.stub_mode():
        logger.info("Gemini en modo STUB: Generando preguntas simuladas.")
        stub_questions = [
            f"¿Podrías describir tu experiencia trabajando en el área de {area} durante {experience}?",
            f"¿Qué herramientas o metodologías consideras indispensables para tu rol?",
            "Describe una situación desafiante en un proyecto técnico y cómo la resolviste.",
            "¿Cómo manejas el control de versiones y el trabajo en equipo en repositorios grandes?",
            "¿Cuáles son tus estrategias principales para optimizar el rendimiento de una aplicación?"
        ]
        return stub_questions[:num_questions]

    system_instruction = (
        "Eres un reclutador técnico experto y un entrevistador automatizado para la plataforma Avanza Empleo. "
        "Tu objetivo es diseñar un cuestionario inicial de entrevista técnico-comportamental interactivo y fluido."
    )

    prompt = (
        f"Genera exactamente {num_questions} preguntas de entrevista profesional para un candidato.\n"
        f"Área de especialidad: {area}\n"
        f"Experiencia adquirida: {experience}\n\n"
        f"Requisitos de las preguntas:\n"
        f"- Deben evaluar competencias técnicas específicas del área y habilidades blandas necesarias.\n"
        f"- Deben ser directas, claras y redactadas para ser escuchadas vía voz (evita bloques de código complejos).\n"
        f"- No incluyas números de índice ni introducciones dentro del texto de la pregunta.\n\n"
        f"IMPORTANTE: Responde SOLO con un array JSON de strings válido. Comienza tu respuesta con '[' y termina con ']'.\n"
        f"Ejemplo de formato: [\"Pregunta 1\", \"Pregunta 2\", \"Pregunta 3\"]"
    )

    try:
        client = _get_client()
        
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.6
            )
        )

        latency_ms = (time.perf_counter() - start_time) * 1000
        
        response_text = response.text.strip()
        
        import re
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group()
        
        questions = json.loads(response_text)
        
        estimated_tokens = len(prompt + response.text) // 4
        llm_metrics.record(
            session_id="bulk_init",
            operation="generate_interview_questions",
            latency_ms=latency_ms,
            estimated_tokens=estimated_tokens,
            model=model,
            stub=False
        )

        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("El modelo no retornó una lista válida de preguntas.")

        return questions

    except (APIError, json.JSONDecodeError) as exc:
        logger.error("Error al generar/parsear preguntas con Gemini: %s", exc)
        raise
    except Exception as exc:
        logger.exception("Error inesperado en generate_interview_questions: %s", exc)
        raise


def evaluate_interview_full(area: str, experience: str, qa_pairs: List[Dict[str, Any]]) -> str:
    """
    Analiza la entrevista completa recibiendo un mapa con las preguntas y 
    las respuestas obtenidas por el STT para retornar un feedback integral.
    """
    start_time = time.perf_counter()
    model = llm_settings.model_name()

    if llm_settings.stub_mode():
        logger.info("Gemini en modo STUB: Generando feedback simulado.")
        return (
            "Felicidades por completar la entrevista. "
            f"Has demostrado un entendimiento sólido en los conceptos clave de {area}. "
            "Tus respuestas reflejan una buena capacidad analítica, especialmente al resolver "
            "problemas de arquitectura. Como recomendación, profundiza más en los detalles de "
            "optimización en tus próximos proyectos. ¡Mucho éxito!"
        )

    conversation_history = ""
    for qa in qa_pairs:
        idx = qa.get("index", 0) + 1
        pregunta = qa.get("question_text", "Pregunta no registrada")
        respuesta = qa.get("answer_text", "El candidato no respondió o el audio fue ilegible.")
        conversation_history += f"--- Turno {idx} ---\nEntrevistador: {pregunta}\nCandidato: {respuesta}\n\n"

    system_instruction = (
        "Eres el comité de evaluación técnica de una empresa que está evaluando a un candidato. Tu trabajo es analizar la trascripción "
        "de una entrevista de trabajo y proveer una devolución constructiva, profesional y motivadora al candidato."
    )

    prompt = (
        f"Evalúa críticamente el desempeño técnico del candidato para el área de {area} ({experience}).\n\n"
        f"Historial de la entrevista:\n"
        f"{conversation_history}\n"
        f"Instrucciones estrictas de evaluación y formato:\n"
        f"1. Dirígete directamente al candidato en primera persona.\n"
        f"2. Sé ultra-conciso. Dictamina de inmediato qué competencias técnicas demostró y qué errores conceptuales específicos cometió, ayudando al usuario a mejorar su desempeño.\n"
        f"3. LIMITACIÓN DE EXTENSIÓN: La respuesta total debe tener un límite estricto de menos de 1800 caracteres totales.\n"
        f"4. OBLIGATORIO PARA TTS: Genera la salida exclusivamente en párrafos limpios y continuos. "
        f"Está estrictamente prohibido usar viñetas, asteriscos, guiones, subtítulos o cualquier formato Markdown."
    )

    try:
        client = _get_client()
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.5
            )
        )

        latency_ms = (time.perf_counter() - start_time) * 1000
        feedback_text = response.text.strip()

        estimated_tokens = len(prompt + feedback_text) // 4
        llm_metrics.record(
            session_id="evaluation_final",
            operation="evaluate_interview_full",
            latency_ms=latency_ms,
            estimated_tokens=estimated_tokens,
            model=model,
            stub=False
        )

        return feedback_text

    except APIError as exc:
        logger.error("Error de API en Gemini durante la evaluación: %s", exc)
        raise
    except Exception as exc:
        logger.exception("Error inesperado en evaluate_interview_full: %s", exc)
        raise


def get_llm_status() -> dict:
    """Verifica la conectividad básica con la API de Gemini (Health Check)."""
    if llm_settings.stub_mode():
        return {
            "provider": "google-gemini",
            "model": llm_settings.model_name(),
            "mode": "stub",
            "credentials_configured": llm_settings.credentials_configured(),
            "status": "ok",
            "latency_ms": 0.0
        }
    
    start_time = time.perf_counter()
    try:
        client = _get_client()
        client.models.generate_content(
            model=llm_settings.model_name(),
            contents="ping",
            config=types.GenerateContentConfig(max_output_tokens=5)
        )
        latency_ms = (time.perf_counter() - start_time) * 1000
        return {
            "provider": "google-gemini",
            "model": llm_settings.model_name(),
            "mode": "live",
            "credentials_configured": True,
            "status": "ok",
            "latency_ms": round(latency_ms, 2)
        }
    except Exception as exc:
        latency_ms = (time.perf_counter() - start_time) * 1000
        return {
            "provider": "google-gemini",
            "model": llm_settings.model_name(),
            "mode": "live",
            "credentials_configured": llm_settings.credentials_configured(),
            "status": "error",
            "error": str(exc),
            "latency_ms": round(latency_ms, 2)
        }