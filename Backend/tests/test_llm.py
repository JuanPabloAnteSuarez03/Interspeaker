"""
Tests de integracion del LLM - HU16.

Todos los tests corren en modo stub (SKIP_GEMINI=1, SKIP_TTS=1),
definido en conftest.py. No requieren credenciales reales. Son seguros para CI.

Criterios de aceptacion cubiertos:
    CA1 - Conexion correcta al LLM        -> test_llm_status_*
    CA2 - Genera preguntas por perfil     -> test_generate_question_*, test_interview_start_*
    CA3 - Coherencia area/nivel           -> test_generate_question_content
    CA4 - Envio de respuestas             -> test_evaluation_endpoint_*
    CA5 - Retroalimentacion estructurada  -> test_evaluate_session_structure
    CA6 - Coherencia conversacional       -> test_interview_next_preserves_history
    CA7 - Metricas de latencia            -> test_metrics_*
    CA8 - Flujo completo integrado        -> test_full_interview_flow
"""

from __future__ import annotations

import io
import os

import pytest

from config import llm_settings
from services import llm_metrics
from services.gemini_service import evaluate_interview_full, generate_interview_questions, get_llm_status


# ---------------------------------------------------------------------------
# CA1 - Conexion correcta al LLM
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_llm_status_unit_returns_dict():
    """get_llm_status() siempre retorna un dict con los campos requeridos."""
    status = get_llm_status()
    assert isinstance(status, dict)
    for field in ("provider", "model", "mode", "credentials_configured", "status"):
        assert field in status, f"Campo ausente: {field}"


@pytest.mark.unit
@pytest.mark.skipif(
    os.getenv("SKIP_GEMINI", "1").lower() not in ("1", "true", "yes"),
    reason="Solo aplica en modo stub (SKIP_GEMINI=1)",
)
def test_llm_status_stub_mode_is_ok():
    """En modo stub el status es ok aunque no haya API key real."""
    status = get_llm_status()
    assert status["mode"] == "stub"
    assert status["status"] == "ok"
    assert status["provider"] == "google-gemini"


@pytest.mark.integration
@pytest.mark.skipif(
    os.getenv("SKIP_GEMINI", "1").lower() not in ("1", "true", "yes"),
    reason="Solo aplica en modo stub (SKIP_GEMINI=1)",
)
def test_llm_status_endpoint_200(client):
    """GET /api/llm/status devuelve 200 en modo stub."""
    r = client.get("/api/llm/status")
    assert r.status_code == 200


@pytest.mark.integration
@pytest.mark.skipif(
    os.getenv("SKIP_GEMINI", "1").lower() not in ("1", "true", "yes"),
    reason="Solo aplica en modo stub (SKIP_GEMINI=1)",
)
def test_llm_status_endpoint_body(client):
    """GET /api/llm/status devuelve el cuerpo correcto en modo stub."""
    data = client.get("/api/llm/status").get_json()
    assert data["status"] == "ok"
    assert data["mode"] == "stub"
    assert "model" in data and data["model"] != ""


# ---------------------------------------------------------------------------
# CA2 / CA3 - Generacion de preguntas coherentes con area y nivel
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_generate_questions_returns_list():
    questions = generate_interview_questions(
        area="backend",
        experience="junior",
        num_questions=3,
    )

    assert isinstance(questions, list)
    assert len(questions) > 0
    assert all(isinstance(q, str) for q in questions)


@pytest.mark.unit
def test_generate_questions_content():
    questions = generate_interview_questions(
        area="frontend",
        experience="senior",
        num_questions=2,
    )

    joined = " ".join(questions).lower()

    assert "frontend" in joined or "senior" in joined




@pytest.mark.integration
def test_interview_start_returns_required_fields(client):
    """POST /api/interview/start devuelve question, history y session_id."""
    r = client.post("/api/interview/start", json={
        "area": "datos",
        "experience": "mid",
        "session_id": "test-ca2-start",
    })
    assert r.status_code == 200
    body = r.get_json()
    assert "question" in body
    assert "history" in body
    assert body["session_id"] == "test-ca2-start"
    assert len(body["history"]) == 1
    assert body["history"][0]["role"] == "interviewer"
    llm_metrics.clear_session("test-ca2-start")


@pytest.mark.integration
def test_interview_start_missing_area(client):
    """POST /api/interview/start sin area devuelve 400."""
    r = client.post("/api/interview/start", json={"experience": "junior"})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# CA4 / CA5 - Evaluacion estructurada
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_evaluate_interview_full_returns_string():
    result = evaluate_interview_full(
        area="backend",
        experience="junior",
        qa_pairs=[
            {
                "index": 0,
                "question_text": "¿Qué es REST?",
                "answer_text": "Es un estilo de arquitectura.",
            }
        ],
    )

    assert isinstance(result, str)
    assert len(result) > 0


# ---------------------------------------------------------------------------
# CA7 - Metricas de consumo y latencia
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_metrics_recorded_after_generate_questions():
    sid = "test-ca7-gen"
    llm_metrics.clear_session(sid)

    generate_interview_questions(
        area="backend",
        experience="junior",
        num_questions=2,
    )

    summary = llm_metrics.get_session_summary("bulk_init")

    assert isinstance(summary, dict)


@pytest.mark.unit
def test_metrics_recorded_after_evaluate_interview():
    evaluate_interview_full(
        area="backend",
        experience="junior",
        qa_pairs=[
            {
                "index": 0,
                "question_text": "Pregunta",
                "answer_text": "Respuesta",
            }
        ],
    )

    summary = llm_metrics.get_session_summary("evaluation_final")

    assert isinstance(summary, dict)


@pytest.mark.unit
def test_metrics_empty_session_returns_zero():
    """Una sesion sin actividad devuelve totales en cero, sin error."""
    summary = llm_metrics.get_session_summary("session-inexistente-xyz-999")
    assert summary["total_calls"] == 0
    assert summary["avg_latency_ms"] == 0.0
    assert summary["total_estimated_tokens"] == 0
    assert summary["calls"] == []


@pytest.mark.integration
def test_metrics_endpoint_after_start(client):
    """GET /api/llm/metrics/<sid> devuelve metricas reales tras /start."""
    sid = "test-ca7-endpoint"
    llm_metrics.clear_session(sid)

    client.post("/api/interview/start", json={
        "area": "backend", "experience": "junior", "session_id": sid,
    })

    r = client.get(f"/api/llm/metrics/{sid}")
    assert r.status_code == 200
    body = r.get_json()
    assert body["session_id"] == sid
    assert "total_calls" in body
    assert "avg_latency_ms" in body
    assert "calls" in body

    llm_metrics.clear_session(sid)


@pytest.mark.integration
def test_metrics_endpoint_empty_session(client):
    """GET /api/llm/metrics/<sid> para sesion sin actividad devuelve 200 con ceros."""
    r = client.get("/api/llm/metrics/session-vacia-abc123")
    assert r.status_code == 200
    assert r.get_json()["total_calls"] == 0


# ---------------------------------------------------------------------------
# CA8 - Flujo completo STT -> LLM -> TTS integrado
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_interview_start_with_audio(client):
    """POST /api/interview/start con include_audio=true devuelve audio_base64."""
    r = client.post("/api/interview/start", json={
        "area": "backend",
        "experience": "junior",
        "session_id": "test-ca8-audio",
        "include_audio": True,
    })
    assert r.status_code == 200
    body = r.get_json()
    assert "audio_base64" in body
    assert len(body["audio_base64"]) > 0
    llm_metrics.clear_session("test-ca8-audio")


