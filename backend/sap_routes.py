"""
sap_routes.py

This exposes SAP material data to your frontend, writing into the
SAME `sap_materials` Supabase table that main.py's
/api/materials/{tenant_id} endpoint already reads from.

  GET  /api/sap/materials/{tenant_id}   -> preview data, don't save
  POST /api/sap/sync/{tenant_id}        -> fetch AND save into Supabase

To wire this up, in your main.py add:
    from sap_routes import router as sap_router
    app.include_router(sap_router)
"""

from fastapi import APIRouter, HTTPException
from database import supabase
from sap_service import get_materials_from_sap
from sap_mapper import map_sap_materials_list

router = APIRouter()


@router.get("/api/sap/materials/{tenant_id}")
async def get_sap_materials(tenant_id: str):
    """
    Fetches materials from SAP (mock or real) and returns them
    already converted into the sap_materials table format.
    Does NOT save to database - just lets you preview the data.
    """
    try:
        raw_data = await get_materials_from_sap()
        mapped_data = map_sap_materials_list(raw_data, tenant_id)
        return {"count": len(mapped_data), "materials": mapped_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SAP fetch failed: {str(e)}")


@router.post("/api/sap/sync/{tenant_id}")
async def sync_sap_materials(tenant_id: str):
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