"""
sap_service.py

This is the ONE switch that controls everything.

Right now, SAP_USE_MOCK=true (default), so the app uses fake data
from sap_mock.py — perfect for demos and development.

The day a real pilot client gives us SAP access:
  1. Add their SAP_ODATA_URL, SAP_USERNAME, SAP_PASSWORD to .env
  2. Change SAP_USE_MOCK to false in .env
  3. Nothing else in the codebase needs to change.
"""

import os
from sap_client import fetch_sap_materials
from sap_mock import fetch_sap_materials_mock

USE_MOCK = os.getenv("SAP_USE_MOCK", "true").lower() == "true"


async def get_materials_from_sap():
    """
    Returns material data — either fake (mock) or real,
    depending on the SAP_USE_MOCK setting in .env.
    """
    if USE_MOCK:
        return fetch_sap_materials_mock()
    else:
        return await fetch_sap_materials()