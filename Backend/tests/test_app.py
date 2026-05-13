def test_health(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Interspeaker" in response.get_json()["message"]


def test_openapi_spec(client):
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
    data = response.get_json()
    assert data["info"]["title"] == "Interspeaker Backend API"
