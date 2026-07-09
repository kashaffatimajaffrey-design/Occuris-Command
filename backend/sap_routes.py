"""
sap_routes.py

This exposes SAP material data to your frontend, writing into the
SAME `sap_materials` Supabase table that main.py's
/api/materials/{tenant_id} endpoint already reads from.

  GET  /api/sap/materials   -> preview data, don't save
  POST /api/sap/sync        -> fetch AND save into Supabase

SECURITY NOTE: tenant_id no longer comes from the URL. It's derived
from the authenticated session via get_current_tenant() (auth.py) —
the same protection every other real endpoint now uses. This closes
the gap where anyone could type a different tenant_id in the URL
and pull someone else's SAP data.

To wire this up, in your main.py add:
    from sap_routes import router as sap_router
    app.include_router(sap_router)
"""

from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from auth import get_current_tenant
from sap_service import get_materials_from_sap
from sap_mapper import map_sap_materials_list

router = APIRouter()


@router.get("/api/sap/materials")
async def get_sap_materials(tenant_id: str = Depends(get_current_tenant)):
    """
    Fetches materials from SAP (mock or real) and returns them
    already converted into the sap_materials table format.
    Does NOT save to database - just lets you preview the data.

    tenant_id is resolved from the logged-in user's session,
    never trusted from client input.
    """
    try:
        raw_data = await get_materials_from_sap()
        mapped_data = map_sap_materials_list(raw_data, tenant_id)
        return {"count": len(mapped_data), "materials": mapped_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SAP fetch failed: {str(e)}")


@router.post("/api/sap/sync")
async def sync_sap_materials(tenant_id: str = Depends(get_current_tenant)):
    """
    Fetches materials from SAP AND writes them into the existing
    sap_materials Supabase table (the same table your
    /api/materials/{tenant_id} endpoint in main.py already reads from).

    This is what you'd call on a schedule, or with a
    "Sync from SAP" button on the frontend.
    """
    if not supabase:
        raise HTTPException(
            status_code=500,
            detail="Supabase not connected. Check SUPABASE_URL / SUPABASE_KEY in .env",
        )

    try:
        raw_data = await get_materials_from_sap()
        mapped_data = map_sap_materials_list(raw_data, tenant_id)

        for item in mapped_data:
            supabase.table("sap_materials").upsert(item).execute()

        return {"synced": len(mapped_data), "tenant_id": tenant_id, "status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SAP sync failed: {str(e)}")