"""
sap_client.py

This file connects to a REAL SAP system using its OData API.
It will only be used once we have real SAP credentials from a client
(SAP_USE_MOCK=false in .env).

Nothing here runs unless a real pilot customer gives us access.
"""

import httpx
import os

SAP_BASE_URL = os.getenv("SAP_ODATA_URL")   # e.g. https://client-sap-server.com/sap/opu/odata/sap/API_MATERIAL_SRV
SAP_USERNAME = os.getenv("SAP_USERNAME")
SAP_PASSWORD = os.getenv("SAP_PASSWORD")


async def fetch_sap_materials():
    """
    Calls the real SAP OData API and returns the raw material list.
    Raises an error if the request fails (bad credentials, server down, etc.)
    """
    if not SAP_BASE_URL or not SAP_USERNAME or not SAP_PASSWORD:
        raise ValueError(
            "Missing SAP credentials in .env. "
            "Set SAP_ODATA_URL, SAP_USERNAME, SAP_PASSWORD, "
            "or set SAP_USE_MOCK=true to use mock data instead."
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{SAP_BASE_URL}/MaterialSet",
            auth=(SAP_USERNAME, SAP_PASSWORD),
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        data = response.json()
        return data["d"]["results"]