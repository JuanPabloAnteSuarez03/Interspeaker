"""Tests minimos para CI (GitHub Actions)."""

import io


def test_health(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Interspeaker" in r.get_json()["message"]


def test_openapi(client):
    r = client.get("/api/openapi.json")
    assert r.status_code == 200
    assert r.get_json()["info"]["title"] == "Interspeaker Backend API"


def test_interview_start_stub(client):
    r = client.post("/api/interview/start", json={"area": "backend", "level": "junior"})
    assert r.status_code == 200
    assert "question" in r.get_json()


def test_stt_missing_audio(client):
    assert client.post("/api/stt/transcribe").status_code == 400


def test_stt_status(client):
    assert client.get("/api/stt/status").status_code == 200


def test_stt_stub_transcript(client):
    data = {"audio": (io.BytesIO(b"x" * 600), "answer.webm")}
    r = client.post("/api/stt/transcribe", data=data, content_type="multipart/form-data")
    assert r.status_code == 200
    assert "transcript" in r.get_json()


def test_tts_requires_text(client):
    assert client.post("/api/tts/synthesize", json={}).status_code == 400


def test_evaluation_requires_transcripts(client):
    r = client.post("/api/evaluation/report", json={"area": "backend"})
    assert r.status_code == 400
