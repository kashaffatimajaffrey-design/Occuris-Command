"""
sap_mock.py

This file FAKES a SAP system's response, so we can build and test
our entire integration WITHOUT needing real SAP access.

Once a real client gives us SAP credentials, we simply stop using
this file (see sap_service.py) and nothing else in the app changes.
"""

def fetch_sap_materials_mock():
    """
    Returns fake material data in the shape a real SAP OData API
    would return it (standard SAP field names: Matnr, Maktx, etc).

    This intentionally mirrors the SAME materials already used in
    main.py's get_mock_materials() fallback, so once this gets mapped
    and synced, it lines up with what the frontend already expects
    in the `sap_materials` table.
    """
    return [
        {
            "Matnr": "MAT-7701",
            "Maktx": "ASML NXE:3400C Mask",
            "Matkl": "Lithography",
            "Meins": "Units",
            "Werks": "1000",
            "Lifnr": "ASML",
            "Labst": 4,
            "Eisbe": 2,
            "Plifz": 180,
            "AbcInd": "A",
        },
        {
            "Matnr": "MAT-1205",
            "Maktx": "EUV Photoresist (Type-B)",
            "Matkl": "Chemicals",
            "Meins": "Liters",
            "Werks": "1000",
            "Lifnr": "JSR Corp",
            "Labst": 850,
            "Eisbe": 200,
            "Plifz": 30,
            "AbcInd": "A",
        },
        {
            "Matnr": "MAT-9920",
            "Maktx": "Silicon Wafer 300mm",
            "Matkl": "Substrate",
            "Meins": "Wafers",
            "Werks": "1000",
            "Lifnr": "Sumco",
            "Labst": 5400,
            "Eisbe": 1000,
            "Plifz": 45,
            "AbcInd": "B",
        },
    ]