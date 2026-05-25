"""
Endpoints de estado y metricas del LLM - HU16.

GET /api/llm/status               -> verifica conexion con Gemini (CA1)
GET /api/llm/metrics/<session_id> -> metricas de consumo y latencia (CA7)
"""

from __future__ import annotations

from flask import Blueprint, jsonify

from services.gemini_service import get_llm_status
from services.llm_metrics import get_session_summary

llm_bp = Blueprint("llm", __name__)


@llm_bp.route("/status", methods=["GET"])
def llm_status():
    """
    Verifica el estado de la conexion con el LLM.

    En modo stub responde inmediatamente sin llamar a la API.
    En modo live realiza una llamada minima de prueba y mide la latencia.

    Respuesta exitosa (200):
        provider, model, mode, api_key_configured, status: ok, latency_ms

    Respuesta con error de conexion (503):
        provider, model, mode, api_key_configured, status: error, error, latency_ms
    """
    status = get_llm_status()
    http_code = 200 if status.get("status") == "ok" else 503
    return jsonify(status), http_code


@llm_bp.route("/metrics/<session_id>", methods=["GET"])
def llm_metrics_for_session(session_id: str):
    """
    Devuelve metricas de consumo y latencia del LLM para una sesion.
    Una sesion sin actividad devuelve total_calls: 0 (no error).

    Respuesta (200):
        session_id, total_calls, avg_latency_ms, max_latency_ms,
        total_estimated_tokens, calls: [...]
    """
    summary = get_session_summary(session_id)
    return jsonify(summary), 200
