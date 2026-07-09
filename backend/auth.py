"""
auth.py

This is the enforcement layer that fixes the "no auth gate" problem.

Every protected endpoint will use `get_current_tenant` as a dependency.
It does 3 things, in order:
  1. Reads the Authorization header (the token the frontend sends)
  2. Asks Supabase "who is this user, really?" (server-side verification —
     we never trust anything the client claims about itself)
  3. Looks up THAT user's tenant_id from the profiles table

The frontend can never pass a fake tenant_id and get away with it,
because we never read tenant_id from the request at all — only from
the verified session, looked up fresh in the database every time.
"""

from fastapi import Header, HTTPException
from database import supabase


async def get_current_tenant(authorization: str = Header(None)) -> str:
    """
    Use as a FastAPI dependency:

        @app.get("/api/materials")
        async def get_materials(tenant_id: str = Depends(get_current_tenant)):
            ...

    Raises 401 if there's no valid, logged-in user.
    Returns the real tenant_id — derived from the database, not the request.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.replace("Bearer ", "").strip()

    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured on server")

    # Step 1: verify the token is real and get the actual logged-in user
    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    # Step 2: look up which tenant THIS verified user belongs to
    profile_response = (
        supabase.table("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single()
        .execute()
    )

    if not profile_response.data:
        raise HTTPException(
            status_code=403,
            detail="No tenant is linked to this account yet. Complete onboarding first.",
        )

    return profile_response.data["tenant_id"]