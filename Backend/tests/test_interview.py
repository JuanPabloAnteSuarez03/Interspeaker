def test_start_requires_area(client):
    response = client.post("/api/interview/start", json={})
    assert response.status_code == 400


def test_start_returns_question(client):
    response = client.post("/api/interview/start", json={"area": "backend", "level": "junior"})
    assert response.status_code == 200
    data = response.get_json()
    assert "question" in data
    assert isinstance(data["history"], list)


def test_next_question(client):
    response = client.post(
        "/api/interview/next",
        json={"area": "frontend", "level": "junior", "history": []},
    )
    assert response.status_code == 200
    assert "question" in response.get_json()
