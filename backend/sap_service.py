"""
sap_service.py

Single entry point for SAP material data.

STATUS: UNVERIFIED SCAFFOLDING. Nothing in this chain — this module,
sap_client, or sap_mapper — has ever run against a real SAP system.

A previous version of this docstring said that connecting a real client was a
matter of adding three settings to .env and that "nothing else in the codebase
needs to change". That was wrong, and removing the mock alternative made it
read as more settled than it is. Expect to change sap_client and sap_mapper
when a client provides access: see the numbered gaps in sap_client.py and the
field-origin notes in sap_mapper.py.

There is no mock mode. If SAP is not configured the call fails loudly rather
than substituting invented materials the caller cannot distinguish from real
ones.
"""

from sap_client import fetch_sap_materials, is_configured, missing_config

__all__ = ["get_materials_from_sap", "is_configured", "missing_config"]


async def get_materials_from_sap():
    """
    Return material data from the configured SAP OData endpoint.

    Raises ValueError when SAP credentials are missing, or
    httpx.HTTPStatusError when SAP rejects the request. Callers should check
    is_configured() first if they want to report unconfigured separately from
    failed.
    """
    return await fetch_sap_materials()
