"""
sap_routes.py

Exposes SAP material data, writing into a `sap_materials` Supabase table.

Nothing reads that table. /api/materials, its only reader, was deleted because
it was the last remnant of the mock-data path and the table does not exist in
the database.

  GET  /api/sap/materials   -> preview mapped data, do not save
  POST /api/sap/sync        -> fetch AND upsert into Supabase

STATUS: the auth gate on these routes is real and enforced. What sits behind
it is not: the SAP client and mapper are unverified scaffolding that has never
run against a real system (see sap_client.py). Neither route is called from
the frontend today.

tenant_id is never read from the URL. It is derived from the authenticated
session via get_current_tenant() (auth.py), so a client cannot ask for another
tenant's data by editing a path.
"""

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_tenant
from database import supabase
from sap_mapper import map_sap_materials_list
from sap_service import get_materials_from_sap, is_configured, missing_config

router = APIRouter()

# 501 rather than 500: the request was valid, the integration simply is not
# configured on this deployment. A caller can tell "you have not set this up"
# apart from "this broke", which a generic error does not allow.
UNCONFIGURED_STATUS = 501


def _unconfigured_detail() -> dict:
    return {
        "error": "sap_not_configured",
        "message": (
            "SAP is not configured on this server. Set "
            + ", ".join(missing_config())
            + " in backend/.env."
        ),
        "missing": missing_config(),
        "note": (
            "The SAP client is unverified scaffolding and has never run "
            "against a real SAP system. Configuring it enables the code path; "
            "it does not make the integration proven."
        ),
    }


@router.get("/api/sap/materials")
async def get_sap_materials(tenant_id: str = Depends(get_current_tenant)):
    """
    Fetch materials from SAP and return them in `sap_materials` shape.
    Does not write to the database.
    """
    if not is_configured():
        raise HTTPException(status_code=UNCONFIGURED_STATUS, detail=_unconfigured_detail())

    try:
        raw_data = await get_materials_from_sap()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SAP fetch failed: {exc}") from exc

    mapped_data = map_sap_materials_list(raw_data, tenant_id)
    return {"count": len(mapped_data), "materials": mapped_data, "verified_integration": False}


@router.post("/api/sap/sync")
async def sync_sap_materials(tenant_id: str = Depends(get_current_tenant)):
    """
    Fetch materials from SAP and upsert them into the `sap_materials` table.
    """
    if not is_configured():
        raise HTTPException(status_code=UNCONFIGURED_STATUS, detail=_unconfigured_detail())

    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in backend/.env.",
        )

    try:
        raw_data = await get_materials_from_sap()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SAP fetch failed: {exc}") from exc

    mapped_data = map_sap_materials_list(raw_data, tenant_id)

    try:
        for item in mapped_data:
            supabase.table("sap_materials").upsert(item).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SAP sync write failed: {exc}") from exc

    return {"synced": len(mapped_data), "tenant_id": tenant_id, "status": "success"}
