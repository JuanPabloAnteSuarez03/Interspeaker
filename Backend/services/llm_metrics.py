"""
Registro en memoria de metricas de consumo y latencia del LLM - HU16 (CA7).

Mismo patron thread-safe que transcript_store.py (Lock + dict en memoria).
Organizado por session_id para correlacionar metricas con la sesion del usuario.
"""

from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any

_lock: Lock = Lock()
_metrics: dict[str, list[dict[str, Any]]] = {}


def record(
    session_id: str,
    operation: str,
    latency_ms: float,
    estimated_tokens: int,
    model: str,
    stub: bool = False,
) -> dict[str, Any]:
    """
    Registra una llamada al LLM.

    Args:
        session_id:        ID de la sesion de entrevista.
        operation:         Operacion ejecutada: generate_question, evaluate_session, status_check.
        latency_ms:        Tiempo de respuesta medido con time.perf_counter(), en ms.
        estimated_tokens:  Estimacion de tokens: len(prompt + respuesta) // 4.
        model:             Nombre del modelo (ej: gemini-2.5-flash).
        stub:              True si la llamada fue simulada (modo stub/test).
    """
    entry: dict[str, Any] = {
        "operation": operation,
        "latency_ms": round(latency_ms, 2),
        "estimated_tokens": estimated_tokens,
        "model": model,
        "stub": stub,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    with _lock:
        _metrics.setdefault(session_id, []).append(entry)
    return entry


def get_session_metrics(session_id: str) -> list[dict[str, Any]]:
    """Devuelve la lista completa de entradas para una sesion (copia defensiva)."""
    with _lock:
        return list(_metrics.get(session_id, []))


def get_session_summary(session_id: str) -> dict[str, Any]:
    """
    Resumen agregado de metricas para una sesion.

    Returns:
        Dict con: session_id, total_calls, avg_latency_ms, max_latency_ms,
        total_estimated_tokens y la lista detallada de calls.
    """
    entries = get_session_metrics(session_id)

    if not entries:
        return {
            "session_id": session_id,
            "total_calls": 0,
            "avg_latency_ms": 0.0,
            "max_latency_ms": 0.0,
            "total_estimated_tokens": 0,
            "calls": [],
        }

    latencies = [e["latency_ms"] for e in entries]
    tokens = [e["estimated_tokens"] for e in entries]

    return {
        "session_id": session_id,
        "total_calls": len(entries),
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2),
        "max_latency_ms": round(max(latencies), 2),
        "total_estimated_tokens": sum(tokens),
        "calls": entries,
    }


def clear_session(session_id: str) -> None:
    """Elimina las metricas de una sesion. Usado en tests."""
    with _lock:
        _metrics.pop(session_id, None)
