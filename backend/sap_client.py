"""
sap_client.py

SAP OData client for material master data.

STATUS: UNVERIFIED SCAFFOLDING. This code has never run against a real SAP
system. It was written alongside a mock (since deleted) and every field name
and response shape in this module was validated against that mock, not against
a live service's $metadata. There are no tests, no recorded responses, and no
commit in this repository's history that shows it executing against SAP.

Treat it as a starting point for a real integration, not as a working one.
Expect to change it when a pilot client provides access. The known gaps are
documented inline below, at the lines where they would bite.

Configuration (see .env.example):
    SAP_ODATA_URL   base service URL, e.g.
                    https://host/sap/opu/odata/sap/API_MATERIAL_SRV
    SAP_USERNAME
    SAP_PASSWORD
"""

import os

import httpx

# Entity set appended to SAP_ODATA_URL.
#
# UNVERIFIED: "MaterialSet" follows the SEGW convention for a custom-generated
# Gateway service (entity "Material" -> set "MaterialSet"). SAP's own material
# APIs do not use it — API_PRODUCT_SRV exposes "A_Product". Confirm the real
# entity set from the service's $metadata before trusting this.
MATERIAL_ENTITY_SET = "MaterialSet"


def sap_config() -> dict:
    """
    Read SAP credentials from the environment at call time.

    Deliberately not module-level constants. Those are evaluated once at
    import, which froze the values before .env had necessarily been loaded:
    credentials set later were never seen, and the client reported "missing
    credentials" even when they were correctly configured. It only worked at
    all because database.py happens to call load_dotenv() and happens to be
    imported first in main.py — main.py's own load_dotenv() runs *after*
    sap_routes is imported. Reordering those imports would have silently
    broken this.
    """
    return {
        "base_url": os.getenv("SAP_ODATA_URL"),
        "username": os.getenv("SAP_USERNAME"),
        "password": os.getenv("SAP_PASSWORD"),
    }


def missing_config() -> list[str]:
    """Names of the required SAP settings that are not currently set."""
    config = sap_config()
    return [
        name
        for name, value in (
            ("SAP_ODATA_URL", config["base_url"]),
            ("SAP_USERNAME", config["username"]),
            ("SAP_PASSWORD", config["password"]),
        )
        if not value
    ]


def is_configured() -> bool:
    """True when all three SAP settings are present."""
    return not missing_config()


async def fetch_sap_materials():
    """
    Fetch the material list from the configured SAP OData service.

    Raises ValueError when credentials are missing, or httpx.HTTPStatusError
    when SAP rejects the request. Never returns substitute data.

    UNVERIFIED against a real system. See the numbered gaps below.
    """
    absent = missing_config()
    if absent:
        raise ValueError(
            "Missing SAP credentials in backend/.env. Set: " + ", ".join(absent)
        )

    config = sap_config()

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{config['base_url']}/{MATERIAL_ENTITY_SET}",
            auth=(config["username"], config["password"]),
            headers={"Accept": "application/json"},
            # GAP 1 — $format=json is not sent. SAP Gateway OData v2 defaults
            # to Atom XML. The Accept header usually persuades it to return
            # JSON, but not on every configuration; when it does not,
            # response.json() below raises JSONDecodeError on an XML body.
            # A real integration should send params={"$format": "json"}.
            #
            # GAP 2 — sap-client is not sent. SAP systems are multi-client
            # (mandant). Without ?sap-client=NNN the request goes to the
            # system default client, which is frequently not the one holding
            # the data. This needs to be configurable per pilot client.
            #
            # GAP 5 — Basic auth only. Many productive S/4HANA systems require
            # OAuth2, SAML, or X.509 instead. GETs need no CSRF token, so this
            # module is fine on that count, but /api/sap/sync writing back to
            # SAP would need one.
        )
        response.raise_for_status()
        data = response.json()

        # GAP 3 — the OData v2 envelope is hardcoded. {"d": {"results": [...]}}
        # is correct for OData v2 only. S/4HANA Cloud services are OData v4 and
        # return {"value": [...]}, against which this line raises KeyError: 'd'.
        # The service version must be established before this is trusted.
        #
        # GAP 4 — no pagination. SAP OData v2 pages at the service's configured
        # limit (commonly 1000 rows) and signals more via data["d"]["__next"].
        # This returns only the first page and reports no truncation, so a
        # material master of any realistic size would be silently cut off and
        # still look like a successful sync. Follow __next until exhausted.
        return data["d"]["results"]
