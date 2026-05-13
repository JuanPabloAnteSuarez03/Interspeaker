def test_synthesize_requires_text(client):
    response = client.post("/api/tts/synthesize", json={})
    assert response.status_code == 400


def test_synthesize_returns_audio(client):
    response = client.post("/api/tts/synthesize", json={"text": "Hola candidato"})
    assert response.status_code == 200
    assert response.mimetype == "audio/mpeg"


def test_evaluation_requires_data(client):
    response = client.post("/api/evaluation/report", json={"area": "backend"})
    assert response.status_code == 400
