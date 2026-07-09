"""
onboarding_routes.py

Handles the missing "front door": what happens right after someone signs up.

Flow:
  1. User signs up via Supabase Auth on the frontend (creates an auth.users row)
  2. Frontend calls POST /api/onboarding/create-tenant with their new session token
  3. This endpoint creates a new tenant row, links it to that user via profiles,
     and returns the tenant_id

After this, get_current_tenant() (auth.py) will always resolve this user
to this tenant automatically — no further manual steps needed.
"""

import traceback
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from database import supabase

router = APIRouter()


class CreateTenantRequest(BaseModel):
    company_name: str
    region: str = ""


@router.post("/api/onboarding/create-tenant")
async def create_tenant(request: CreateTenantRequest, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.replace("Bearer ", "").strip()

    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured on server")

    # Verify this is a real, logged-in user
    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
    except Exception:
        print("=== AUTH VERIFY FAILED ===")
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    try:
        # Don't let someone who already has a tenant create a second one
        existing = (
            supabase.table("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=400, detail="This account is already linked to a tenant")

        # Create the new tenant
        tenant_insert = (
            supabase.table("tenants")
            .insert({"name": request.company_name, "region": request.region})
            .execute()
        )
        if not tenant_insert.data:
            raise HTTPException(status_code=500, detail="Failed to create tenant")

        new_tenant_id = tenant_insert.data[0]["id"]

        # Link this user to the new tenant
        supabase.table("profiles").insert(
            {"id": user.id, "tenant_id": new_tenant_id, "email": user.email}
        ).execute()

        return {"tenant_id": new_tenant_id, "company_name": request.company_name}

    except HTTPException:
        raise
    except Exception as e:
        print("=== CREATE TENANT FAILED ===")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"create_tenant failed: {str(e)}")