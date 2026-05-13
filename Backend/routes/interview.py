from flask import Blueprint, request, jsonify

from services.gemini_service import generate_question

interview_bp = Blueprint("interview", __name__)


@interview_bp.route("/start", methods=["POST"])
def start_interview():
    """Inicia una sesion y genera la primera pregunta."""
    data = request.get_json(silent=True) or {}
    area = data.get("area")
    level = data.get("level", "junior")

    if not area:
        return jsonify({"error": "Falta el campo 'area'"}), 400

    question = generate_question(area=area, level=level, history=[])
    return jsonify({"question": question, "history": [{"role": "interviewer", "text": question}]}), 200


@interview_bp.route("/next", methods=["POST"])
def next_question():
    """Genera la siguiente pregunta usando el historial conversacional."""
    data = request.get_json(silent=True) or {}
    area = data.get("area")
    level = data.get("level", "junior")
    history = data.get("history", [])

    if not area:
        return jsonify({"error": "Falta el campo 'area'"}), 400

    question = generate_question(area=area, level=level, history=history)
    history.append({"role": "interviewer", "text": question})
    return jsonify({"question": question, "history": history}), 200
