"""Tests STT (IN-61, IN-62, IN-64, IN-63, IN-66, IN-67)."""

import io

import pytest

from services import transcript_store
from services.stt_service import STTValidationError, get_status, transcribe_audio


def test_stt_status_stub(client):
    r = client.get("/api/stt/status")
    assert r.status_code == 200
    data = r.get_json()
    assert data["provider"] == "deepgram"
    assert data["mode"] == "stub"


def test_transcribe_missing_audio(client):
    assert client.post("/api/stt/transcribe").status_code == 400


def test_transcribe_empty_audio(client):
    data = {"audio": (io.BytesIO(b""), "answer.webm")}
    r = client.post("/api/stt/transcribe", data=data, content_type="multipart/form-data")
    assert r.status_code == 400
    assert r.get_json()["code"] == "audio_empty"


def test_transcribe_audio_too_short(client):
    data = {"audio": (io.BytesIO(b"x"), "answer.webm")}
    r = client.post("/api/stt/transcribe", data=data, content_type="multipart/form-data")
    assert r.status_code == 400
    assert r.get_json()["code"] == "audio_too_short"


def test_transcribe_stub_ok(client):
    payload = b"x" * 600
    data = {"audio": (io.BytesIO(payload), "answer.webm")}
    r = client.post("/api/stt/transcribe", data=data, content_type="multipart/form-data")
    assert r.status_code == 200
    body = r.get_json()
    assert "transcript" in body
    assert body["mode"] == "stub"
    assert "[stub]" in body["transcript"]


def test_transcribe_persists_session(client):
    transcript_store.clear_session("test-session-1")
    payload = b"x" * 600
    data = {
        "audio": (io.BytesIO(payload), "answer.webm"),
        "session_id": "test-session-1",
        "question_index": "0",
    }
    r = client.post("/api/stt/transcribe", data=data, content_type="multipart/form-data")
    assert r.status_code == 200
    assert r.get_json().get("stored") is True

    listed = client.get("/api/stt/transcripts/test-session-1")
    assert listed.status_code == 200
    assert listed.get_json()["count"] == 1
    transcript_store.clear_session("test-session-1")


def test_transcribe_audio_unit_stub():
    text = transcribe_audio(b"0" * 600, filename="answer.webm")
    assert "stub" in text.lower()


def test_transcribe_audio_unit_empty():
    with pytest.raises(STTValidationError) as exc:
        transcribe_audio(b"")
    assert exc.value.code == "audio_empty"
