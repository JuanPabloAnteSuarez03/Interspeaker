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

    class FakeDoc:
        exists = True

        def __init__(self):
            self.id = "test-session"

        def get(self):
            return self

        def set(self, *args, **kwargs):
            pass

        def update(self, *args, **kwargs):
            pass

        def to_dict(self):
            return {
                "questions": [],
                "area": "backend",
                "experience": "junior",
            }

        def collection(self, *args, **kwargs):
            """Allow calling collection on a document reference"""
            return FakeCollection()

    class FakeCollection:
        def document(self, *args, **kwargs):
            return FakeDoc()

        def order_by(self, *args, **kwargs):
            return self

        def get(self):
            return []

    class FakeDB:
        def collection(self, *args, **kwargs):
            return FakeCollection()

    monkeypatch.setattr("routes.interview.db", FakeDB())

    monkeypatch.setattr(
        "routes.interview.synthesize_speech",
        lambda text, voice: b"fake-audio"
    )