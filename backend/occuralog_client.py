"""
occuralog_client.py

The client layer Occuris Command uses to reach occuralog.

Thin, and loud on failure. It does not catch an error and return an empty
list, and it does not fall back to anything — a caller that gets a value back
from this module is holding data that occuralog actually returned.

Configuration:
    OCCURALOG_URL   base URL, default http://localhost:8010
"""

from __future__ import annotations

import os

import httpx

DEFAULT_TIMEOUT = 60.0
# Ingest parses the whole export; a resolve pass calls a local model once per
# unattributed message and takes minutes on a few hundred messages.
INGEST_TIMEOUT = 300.0
RESOLVE_TIMEOUT = 1800.0


class OccuralogError(RuntimeError):
    """
    occuralog could not be reached, or returned an error.

    `status` is occuralog's HTTP status when it answered, and None when the
    request never got there. `detail` is whatever it said, preserved so the
    caller can pass the real reason on rather than inventing one.
    """

    def __init__(self, message: str, status: int | None = None, detail=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.detail = detail


def base_url() -> str:
    """Read at call time, not at import — see the sap_client ordering bug."""
    return os.getenv("OCCURALOG_URL", "http://localhost:8010").rstrip("/")


def _raise_for_response(response: httpx.Response, action: str) -> None:
    if response.is_success:
        return
    try:
        body = response.json()
        detail = body.get("detail", body)
    except Exception:
        detail = response.text[:500]
    raise OccuralogError(
        f"{action} failed: occuralog returned {response.status_code}",
        status=response.status_code,
        detail=detail,
    )


def _request(method: str, path: str, action: str, timeout: float = DEFAULT_TIMEOUT, **kwargs):
    url = f"{base_url()}{path}"
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.request(method, url, **kwargs)
    except Exception as exc:
        raise OccuralogError(
            f"{action} failed: could not reach occuralog at {url} ({exc})"
        ) from exc

    _raise_for_response(response, action)
    if response.status_code == 204:
        return None
    return response.json()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
def health() -> dict:
    return _request("GET", "/health", "occuralog health check", timeout=10.0)


def ingest(filename: str, content: bytes, content_type: str = "text/plain") -> dict:
    return _request(
        "POST",
        "/sessions",
        "Ingest",
        timeout=INGEST_TIMEOUT,
        files={"file": (filename, content, content_type)},
    )


def list_sessions() -> dict:
    return _request("GET", "/sessions", "Listing sessions")


def get_session(session_id: str) -> dict:
    return _request("GET", f"/sessions/{session_id}", "Loading session")


def delete_session(session_id: str) -> None:
    _request("DELETE", f"/sessions/{session_id}", "Deleting session")


def resolve_session(session_id: str) -> dict:
    return _request(
        "POST",
        f"/sessions/{session_id}/resolve",
        "Attribution pass",
        timeout=RESOLVE_TIMEOUT,
    )


def get_orders(session_id: str, include_inferred: bool = False) -> dict:
    return _request(
        "GET",
        f"/sessions/{session_id}/orders",
        "Loading orders",
        params={"include_inferred": str(include_inferred).lower()},
    )


def get_order(session_id: str, order_no: str, include_inferred: bool = False) -> dict:
    return _request(
        "GET",
        f"/sessions/{session_id}/orders/{order_no}",
        f"Loading order {order_no}",
        params={"include_inferred": str(include_inferred).lower()},
    )
