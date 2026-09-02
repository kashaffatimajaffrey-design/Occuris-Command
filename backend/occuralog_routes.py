"""
occuralog_routes.py

Authenticated proxy in front of occuralog.

occuralog has no auth of its own. Reached directly on port 8010 its ingestion
API is open to anyone who can route to it, which is why the frontend no longer
talks to it. Every route here requires a verified session, and occuralog should
not be exposed beyond this process.

    POST   /api/occuralog/sessions
    GET    /api/occuralog/sessions
    GET    /api/occuralog/sessions/{sid}
    DELETE /api/occuralog/sessions/{sid}
    POST   /api/occuralog/sessions/{sid}/resolve
    GET    /api/occuralog/sessions/{sid}/orders
    GET    /api/occuralog/sessions/{sid}/orders/{order_no}
    GET    /api/occuralog/health

KNOWN GAP: sessions are not tenant-scoped. occuralog has no tenant concept, so
any authenticated user sees every session, including exports uploaded by
another tenant. Authentication is enforced here; isolation is not. Do not put
two customers' data behind this until sessions carry a tenant.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

import occuralog_client
from auth import get_current_tenant
from occuralog_client import OccuralogError

router = APIRouter(prefix="/api/occuralog", tags=["occuralog"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _fail(exc: OccuralogError) -> HTTPException:
    """
    Turn a client failure into a response that keeps occuralog's own reason.

    A 4xx from occuralog is passed through unchanged — a file with no
    recognisable messages must reach the user as that, not as a generic
    upstream error. Anything else becomes a 502, because from the caller's
    point of view the upstream failed.
    """
    if exc.status and 400 <= exc.status < 500:
        return HTTPException(status_code=exc.status, detail=exc.detail)
    return HTTPException(
        status_code=502,
        detail={"error": "occuralog_unavailable", "message": exc.message, "upstream": exc.detail},
    )


@router.get("/health")
def occuralog_health(tenant_id: str = Depends(get_current_tenant)) -> dict:
    try:
        return {"reachable": True, "occuralog": occuralog_client.health()}
    except OccuralogError as exc:
        # Reported, not raised: "is the parser up" is a status question, and a
        # down parser is an answer to it rather than a failure of this call.
        return {"reachable": False, "error": exc.message}


@router.post("/sessions", status_code=201)
async def ingest_export(
    file: UploadFile = File(...), tenant_id: str = Depends(get_current_tenant)
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is {len(raw) / 1e6:.1f} MB; the limit is {MAX_UPLOAD_BYTES / 1e6:.0f} MB.",
        )

    try:
        return occuralog_client.ingest(
            file.filename or "export.txt", raw, file.content_type or "text/plain"
        )
    except OccuralogError as exc:
        raise _fail(exc) from exc


@router.get("/sessions")
def list_sessions(tenant_id: str = Depends(get_current_tenant)) -> dict:
    try:
        return occuralog_client.list_sessions()
    except OccuralogError as exc:
        raise _fail(exc) from exc


@router.get("/sessions/{session_id}")
def get_session(session_id: str, tenant_id: str = Depends(get_current_tenant)) -> dict:
    try:
        return occuralog_client.get_session(session_id)
    except OccuralogError as exc:
        raise _fail(exc) from exc


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: str, tenant_id: str = Depends(get_current_tenant)):
    try:
        occuralog_client.delete_session(session_id)
    except OccuralogError as exc:
        raise _fail(exc) from exc


@router.post("/sessions/{session_id}/resolve")
def resolve_session(session_id: str, tenant_id: str = Depends(get_current_tenant)) -> dict:
    """Run occuralog's thread-context attribution pass. Takes minutes."""
    try:
        return occuralog_client.resolve_session(session_id)
    except OccuralogError as exc:
        raise _fail(exc) from exc


@router.get("/sessions/{session_id}/orders")
def get_orders(
    session_id: str,
    include_inferred: bool = False,
    tenant_id: str = Depends(get_current_tenant),
) -> dict:
    try:
        return occuralog_client.get_orders(session_id, include_inferred)
    except OccuralogError as exc:
        raise _fail(exc) from exc


@router.get("/sessions/{session_id}/orders/{order_no}")
def get_order(
    session_id: str,
    order_no: str,
    include_inferred: bool = False,
    tenant_id: str = Depends(get_current_tenant),
) -> dict:
    try:
        return occuralog_client.get_order(session_id, order_no, include_inferred)
    except OccuralogError as exc:
        raise _fail(exc) from exc
