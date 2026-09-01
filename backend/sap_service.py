"""
sap_service.py

Single entry point for SAP material data.

There is no mock mode. If SAP credentials are not configured, the call fails
loudly (see sap_client.fetch_sap_materials) rather than substituting invented
materials that the caller cannot distinguish from real ones.

To connect a real pilot client:
  1. Add SAP_ODATA_URL, SAP_USERNAME, SAP_PASSWORD to backend/.env
  2. Nothing else in the codebase needs to change.
"""

from sap_client import fetch_sap_materials


async def get_materials_from_sap():
    """
    Returns material data from the configured SAP OData endpoint.

    Raises ValueError if SAP credentials are missing, or httpx.HTTPStatusError
    if SAP rejects the request. Both surface to the caller as a 5xx.
    """
    return await fetch_sap_materials()
