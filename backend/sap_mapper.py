"""
sap_mapper.py

Translates raw SAP material records into the shape the `sap_materials`
Supabase table expects, in one place.

STATUS: UNVERIFIED SCAFFOLDING. The field names below were taken from a mock
(since deleted), not from a real service's $metadata. Every key this module
reads was one the mock happened to produce, and it reads no key the mock did
not — which is the signature of a mapper written against a fixture rather than
against SAP.

Two specific reasons to expect this to be wrong against a live system:

  * The abbreviations are real SAP field names, but they come from four
    different tables and are read here as if they were one flat entity:
        Matnr, Matkl, Meins   MARA  (material master, general)
        Maktx                 MAKT  (descriptions, language-dependent)
        Labst                 MARD  (stock, per plant AND storage location)
        Eisbe, Plifz          MARC  (per plant)
        Lifnr                 LFA1 / EORD / EINA — vendor is not on the
                              material master at all; it comes from the source
                              list or purchasing info record
    No single OData entity returns all of these. Expect $expand, multiple
    calls, or a purpose-built CDS view.

  * AbcInd matches neither the SAP table field (MARC-MAABC) nor the standard
    OData property (ABCIndicator). It is unlikely to exist under this name.
"""


def map_sap_material_to_internal(sap_item: dict, tenant_id: str) -> dict:
    """
    Convert one raw SAP material record into a `sap_materials` row.

    GAP — no type coercion. SAP serialises Edm.Decimal and Edm.Int as JSON
    *strings*: a real v2 payload gives Labst "4.000", Eisbe "2.000", Plifz
    "180". Those pass straight through to stock_level / safety_stock /
    lead_time, which are numeric columns. The deleted mock returned Python
    ints, so this never surfaced. A real integration must parse these, and
    decide what to do with SAP's zero-padded keys: Matnr arrives as
    "000000000000001234" and Lifnr as a vendor *code* like "0000100025", not
    a name — InventoryTable renders both as display text.
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
    """Same as above, for a whole list of records."""
    return [map_sap_material_to_internal(item, tenant_id) for item in sap_items]
