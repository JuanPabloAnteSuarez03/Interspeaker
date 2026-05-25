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
from services.gemini_service import evaluate_session, generate_question, get_llm_status
from services.tts_service import synthesize_speech


# ---------------------------------------------------------------------------
# CA1 - Conexion correcta al LLM
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_llm_status_unit_returns_dict():
    """get_llm_status() siempre retorna un dict con los campos requeridos."""
    status = get_llm_status()
    assert isinstance(status, dict)
    for field in ("provider", "model", "mode", "api_key_configured", "status"):
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
def test_generate_question_returns_string():
    """generate_question() siempre retorna un string no vacio."""
    q = generate_question(area="backend", level="junior", history=[])
    assert isinstance(q, str) and len(q) > 0


@pytest.mark.unit
def test_generate_question_content():
    """El texto stub menciona el area o el nivel del candidato."""
    q = generate_question(area="frontend", level="senior", history=[])
    lower = q.lower()
    assert "frontend" in lower or "senior" in lower


@pytest.mark.unit
@pytest.mark.skipif(
    os.getenv("SKIP_GEMINI", "1").lower() not in ("1", "true", "yes"),
    reason="Solo aplica en modo stub: en live el LLM puede devolver preguntas similares",
)
def test_generate_question_increments_with_history():
    """Preguntas sucesivas tienen numero de pregunta creciente en modo stub."""
    history_1 = [{"role": "interviewer", "text": "Primera pregunta"}]
    q1 = generate_question(area="backend", level="mid", history=[])
    q2 = generate_question(area="backend", level="mid", history=history_1)
    assert q1 != q2


@pytest.mark.integration
def test_interview_start_returns_required_fields(client):
    """POST /api/interview/start devuelve question, history y session_id."""
    r = client.post("/api/interview/start", json={
        "area": "datos",
        "level": "mid",
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
    r = client.post("/api/interview/start", json={"level": "junior"})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# CA6 - Coherencia conversacional
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_interview_next_preserves_history(client):
    """POST /api/interview/next anade la nueva pregunta al historial recibido."""
    history = [
        {"role": "interviewer", "text": "Que es REST?"},
        {"role": "candidate", "text": "Es un estilo arquitectonico basado en HTTP."},
    ]
    r = client.post("/api/interview/next", json={
        "area": "backend",
        "level": "junior",
        "history": history,
        "session_id": "test-ca6-next",
    })
    assert r.status_code == 200
    body = r.get_json()
    assert len(body["history"]) == 3
    assert body["history"][-1]["role"] == "interviewer"
    llm_metrics.clear_session("test-ca6-next")


@pytest.mark.integration
def test_interview_next_missing_area(client):
    """POST /api/interview/next sin area devuelve 400."""
    r = client.post("/api/interview/next", json={"history": []})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# CA4 / CA5 - Evaluacion estructurada
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_evaluate_session_structure():
    """evaluate_session() devuelve la estructura con los 4 campos requeridos."""
    result = evaluate_session(
        area="backend",
        level="junior",
        transcripts=["Respuesta de prueba 1", "Respuesta de prueba 2"],
    )
    for key in ("score", "strengths", "weaknesses", "recommendations"):
        assert key in result, f"Campo ausente: {key}"
    assert isinstance(result["score"], (int, float))
    assert isinstance(result["strengths"], list)
    assert isinstance(result["weaknesses"], list)
    assert isinstance(result["recommendations"], list)


@pytest.mark.integration
def test_evaluation_endpoint_ok(client):
    """POST /api/evaluation/report con datos validos devuelve 200."""
    r = client.post("/api/evaluation/report", json={
        "area": "backend",
        "level": "junior",
        "transcripts": ["Respuesta 1", "Respuesta 2"],
        "session_id": "test-ca5-eval",
    })
    assert r.status_code == 200
    body = r.get_json()
    for key in ("score", "strengths", "weaknesses", "recommendations"):
        assert key in body
    llm_metrics.clear_session("test-ca5-eval")


@pytest.mark.integration
def test_evaluation_endpoint_missing_transcripts(client):
    """POST /api/evaluation/report sin transcripts devuelve 400."""
    r = client.post("/api/evaluation/report", json={"area": "backend"})
    assert r.status_code == 400


@pytest.mark.integration
def test_evaluation_endpoint_missing_area(client):
    """POST /api/evaluation/report sin area devuelve 400."""
    r = client.post("/api/evaluation/report", json={"transcripts": ["x"]})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# CA7 - Metricas de consumo y latencia
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_metrics_recorded_after_generate_question():
    """generate_question() registra metricas con latencia >= 0."""
    sid = "test-ca7-gen"
    llm_metrics.clear_session(sid)

    generate_question(area="backend", level="junior", history=[], session_id=sid)

    summary = llm_metrics.get_session_summary(sid)
    assert summary["total_calls"] == 1
    assert summary["avg_latency_ms"] >= 0
    assert summary["total_estimated_tokens"] > 0

    call = summary["calls"][0]
    assert call["operation"] == "generate_question"
    assert call["latency_ms"] >= 0
    assert call["stub"] is llm_settings.stub_mode()

    llm_metrics.clear_session(sid)


@pytest.mark.unit
def test_metrics_recorded_after_evaluate_session():
    """evaluate_session() tambien registra metricas."""
    sid = "test-ca7-eval"
    llm_metrics.clear_session(sid)

    evaluate_session("backend", "junior", ["respuesta"], session_id=sid)

    summary = llm_metrics.get_session_summary(sid)
    assert summary["total_calls"] == 1
    assert summary["calls"][0]["operation"] == "evaluate_session"

    llm_metrics.clear_session(sid)


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
        "area": "backend", "level": "junior", "session_id": sid,
    })

    r = client.get(f"/api/llm/metrics/{sid}")
    assert r.status_code == 200
    body = r.get_json()
    assert body["session_id"] == sid
    assert body["total_calls"] >= 1
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
        "level": "junior",
        "session_id": "test-ca8-audio",
        "include_audio": True,
    })
    assert r.status_code == 200
    body = r.get_json()
    assert "audio_base64" in body
    assert len(body["audio_base64"]) > 0
    llm_metrics.clear_session("test-ca8-audio")


@pytest.mark.integration
def test_full_interview_flow(client):
    """
    Flujo completo: start -> STT transcribe -> next -> evaluate -> metricas.

    Simula la secuencia real de la aplicacion:
    1. Iniciar entrevista -> primera pregunta
    2. Transcribir respuesta de voz del candidato (STT stub)
    3. Generar siguiente pregunta con el historial actualizado
    4. Evaluar la sesion completa
    5. Verificar metricas registradas a lo largo del flujo
    """
    sid = "test-ca8-full-flow"
    llm_metrics.clear_session(sid)

    # 1. Iniciar entrevista
    r1 = client.post("/api/interview/start", json={
        "area": "backend", "level": "mid", "session_id": sid,
    })
    assert r1.status_code == 200
    history = r1.get_json()["history"]
    assert len(history) == 1

    # 2. Simular STT: el candidato responde por voz -> transcript
    audio_payload = {"audio": (io.BytesIO(b"x" * 600), "answer.webm")}
    r_stt = client.post(
        "/api/stt/transcribe",
        data={**audio_payload, "session_id": sid},
        content_type="multipart/form-data",
    )
    assert r_stt.status_code == 200
    transcript = r_stt.get_json()["transcript"]

    # Agregar respuesta del candidato al historial (como hace el frontend)
    history.append({"role": "candidate", "text": transcript})

    # 3. Siguiente pregunta con el historial actualizado
    r2 = client.post("/api/interview/next", json={
        "area": "backend", "level": "mid",
        "history": history,
        "session_id": sid,
        "include_audio": True,
    })
    assert r2.status_code == 200
    body2 = r2.get_json()
    assert len(body2["history"]) == 3
    assert "audio_base64" in body2

    # 4. Evaluacion final con los transcripts del candidato
    candidate_transcripts = [
        t["text"] for t in body2["history"] if t["role"] == "candidate"
    ]
    r3 = client.post("/api/evaluation/report", json={
        "area": "backend", "level": "mid",
        "transcripts": candidate_transcripts,
        "session_id": sid,
    })
    assert r3.status_code == 200
    report = r3.get_json()
    for key in ("score", "strengths", "weaknesses", "recommendations"):
        assert key in report

    # 5. Metricas: al menos start + next + evaluate = 3 llamadas al LLM
    r4 = client.get(f"/api/llm/metrics/{sid}")
    assert r4.status_code == 200
    metrics = r4.get_json()
    assert metrics["total_calls"] >= 3
    assert metrics["avg_latency_ms"] >= 0

    llm_metrics.clear_session(sid)
