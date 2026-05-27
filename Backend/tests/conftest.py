import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ.setdefault("SKIP_STT", "1")
os.environ.setdefault("SKIP_GEMINI", "1")
os.environ.setdefault("SKIP_TTS", "1")
os.environ.setdefault("TESTING", "1")

from app import create_app

from unittest.mock import MagicMock


@pytest.fixture
def app():
    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def mock_firestore(monkeypatch):
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "questions": [],
        "area": "backend",
        "experience": "junior",
    }

    mock_document = MagicMock()
    mock_document.get.return_value = mock_doc
    mock_document.id = "test-session"

    mock_collection = MagicMock()
    mock_collection.document.return_value = mock_document

    mock_db = MagicMock()
    mock_db.collection.return_value = mock_collection

    monkeypatch.setattr("routes.interview.db", mock_db)