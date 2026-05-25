"""
Endpoint de evaluacion y retroalimentacion automatica - HU16 (CA4, CA5).

POST /api/evaluation/report -> evaluacion estructurada con score y feedback
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.gemini_service import evaluate_session

evaluation_bp = Blueprint("evaluation", __name__)


@evaluation_bp.route("/report", methods=["POST"])
def report():
    """
    Genera el reporte final de la entrevista con retroalimentacion estructurada.

    Las transcripciones del candidato provienen del STT (Deepgram), por lo que
    evaluate_session instruye al LLM a ser tolerante con imprecisiones de escritura.

    Body JSON:
        area        (str, requerido)
        level       (str, opcional, default: junior)
        transcripts (list, requerido, minimo 1 elemento)
        session_id  (str, opcional)

    Respuesta exitosa (200):
        score, strengths, weaknesses, recommendations

    Respuesta modo stub (200):
        score: 0, strengths: [], weaknesses: [],
        recommendations: [...], stub: true
    """
    data = request.get_json(silent=True) or {}
    area: str = data.get("area", "").strip()
    level: str = data.get("level", "junior").strip()
    transcripts: list = data.get("transcripts", [])
    session_id: str = (data.get("session_id") or "__anon__").strip()

    if not area or not transcripts:
        return jsonify({"error": "Faltan 'area' o 'transcripts'"}), 400

    report_data = evaluate_session(
        area=area,
        level=level,
        transcripts=transcripts,
        session_id=session_id,
    )
    return jsonify(report_data), 200
