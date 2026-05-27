"""Almacenamiento temporal de transcripciones por sesion (HU05 / IN-66)."""

from datetime import datetime, timezone
from threading import Lock
from typing import Any
from uuid import uuid4

_lock = Lock()
_sessions: dict[str, list[dict[str, Any]]] = {}


def create_session_id() -> str:
    return str(uuid4())


def append(session_id: str, entry: dict[str, Any]) -> dict[str, Any]:
    record = {
        **entry,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with _lock:
        _sessions.setdefault(session_id, []).append(record)
    return record


def list_for_session(session_id: str) -> list[dict[str, Any]]:
    with _lock:
        return list(_sessions.get(session_id, []))


def clear_session(session_id: str) -> None:
    with _lock:
        _sessions.pop(session_id, None)
