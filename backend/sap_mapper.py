"""
sap_mapper.py

SAP uses its own field names (Matnr, Maktx, etc). Our app uses
different, friendlier names (matnr, name, category, etc).

This file translates one into the other, in ONE place, so the
rest of the app never has to think about SAP's naming again.
"""


def map_sap_material_to_internal(sap_item: dict, tenant_id: str) -> dict:
    """
    Takes one raw SAP material record and converts it into the EXACT
    shape the `sap_materials` Supabase table already expects (this
    matches the fields used in main.py's get_mock_materials fallback).
    """
    return {
        "tenant_id": tenant_id,
        "matnr": sap_item.get("Matnr"),
        "name": sap_item.get("Maktx"),
        "category": sap_item.get("Matkl"),
        "stock_level": sap_item.get("Labst"),
        "safety_stock": sap_item.get("Eisbe"),
        "lead_time": sap_item.get("Plifz"),
        "supplier": sap_item.get("Lifnr"),
        "abc_class": sap_item.get("AbcInd"),
        "unit": sap_item.get("Meins"),
    }


def map_sap_materials_list(sap_items: list, tenant_id: str) -> list:
    """
    Same as above, but for a whole list of records at once.
    """
    return [map_sap_material_to_internal(item, tenant_id) for item in sap_items]