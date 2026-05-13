from flask import Blueprint, request, jsonify

from services.gemini_service import evaluate_session

evaluation_bp = Blueprint("evaluation", __name__)


@evaluation_bp.route("/report", methods=["POST"])
def report():
    """Genera reporte final con metricas y feedback del usuario."""
    data = request.get_json(silent=True) or {}
    area = data.get("area")
    level = data.get("level", "junior")
    transcripts = data.get("transcripts", [])

    if not area or not transcripts:
        return jsonify({"error": "Faltan 'area' o 'transcripts'"}), 400

    report_data = evaluate_session(area=area, level=level, transcripts=transcripts)
    return jsonify(report_data), 200
