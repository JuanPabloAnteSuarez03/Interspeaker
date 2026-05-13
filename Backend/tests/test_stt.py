import io


def test_transcribe_requires_audio(client):
    response = client.post("/api/stt/transcribe")
    assert response.status_code == 400


def test_transcribe_returns_stub(client):
    data = {"audio": (io.BytesIO(b"fake audio"), "sample.wav")}
    response = client.post(
        "/api/stt/transcribe",
        data=data,
        content_type="multipart/form-data",
    )
    assert response.status_code == 200
    assert "transcript" in response.get_json()
