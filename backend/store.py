from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4


DB_PATH = Path(__file__).parent / "occuris_command.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS boms (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                name TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'paste',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bom_items (
                id TEXT PRIMARY KEY,
                bom_id TEXT NOT NULL,
                mpn TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                supplier TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                recommended_action TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def score_bom_item(mpn: str, quantity: int, supplier: str) -> tuple[int, str, str]:
    normalized = f"{mpn} {supplier}".lower()
    score = 18

    if quantity >= 500:
        score += 12
    elif quantity >= 100:
        score += 6

    risk_terms = {
        "stm32": 18,
        "max3232": 10,
        "asml": 20,
        "tsmc": 22,
        "hynix": 15,
        "china": 18,
        "taiwan": 22,
        "single": 10,
        "eol": 28,
        "obsolete": 35,
    }
    for term, weight in risk_terms.items():
        if term in normalized:
            score += weight

    if not supplier or supplier.strip().lower() in {"unknown", "n/a", "na"}:
        score += 16

    score = min(score, 100)
    if score >= 75:
        return score, "critical", "Review alternate sourcing and build a buffer plan before release."
    if score >= 50:
        return score, "watch", "Validate lead time, lifecycle state, and second-source coverage."
    return score, "stable", "Keep monitored; no immediate sourcing action required."


def parse_bom_lines(raw_text: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for line_number, line in enumerate(raw_text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue

        parts = [part.strip() for part in stripped.split(",")]
        if len(parts) < 3:
            raise ValueError(f"Line {line_number} must use: Part Number, Quantity, Supplier")

        mpn = parts[0]
        try:
            quantity = int(parts[1])
        except ValueError as exc:
            raise ValueError(f"Line {line_number} has an invalid quantity: {parts[1]}") from exc

        supplier = ", ".join(parts[2:]).strip()
        risk_score, risk_level, recommended_action = score_bom_item(mpn, quantity, supplier)
        items.append(
            {
                "id": str(uuid4()),
                "mpn": mpn,
                "quantity": quantity,
                "supplier": supplier,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "recommended_action": recommended_action,
            }
        )

    if not items:
        raise ValueError("BOM text did not contain any components.")

    return items


def create_bom(tenant_id: str, name: str, raw_text: str, actor: str = "pilot-user") -> dict[str, Any]:
    init_db()
    bom_id = str(uuid4())
    created_at = utc_now()
    items = parse_bom_lines(raw_text)

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO boms (id, tenant_id, name, source, created_at) VALUES (?, ?, ?, ?, ?)",
            (bom_id, tenant_id, name, "paste", created_at),
        )
        for item in items:
            conn.execute(
                """
                INSERT INTO bom_items (
                    id, bom_id, mpn, quantity, supplier, risk_score, risk_level,
                    recommended_action, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["id"],
                    bom_id,
                    item["mpn"],
                    item["quantity"],
                    item["supplier"],
                    item["risk_score"],
                    item["risk_level"],
                    item["recommended_action"],
                    created_at,
                ),
            )
        conn.execute(
            """
            INSERT INTO audit_logs (id, tenant_id, actor, action, entity_type, entity_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (str(uuid4()), tenant_id, actor, "bom.created", "bom", bom_id, created_at),
        )

    return get_bom(bom_id)


def get_bom(bom_id: str) -> dict[str, Any]:
    with get_connection() as conn:
        bom = conn.execute("SELECT * FROM boms WHERE id = ?", (bom_id,)).fetchone()
        if not bom:
            raise KeyError(bom_id)
        items = conn.execute(
            "SELECT * FROM bom_items WHERE bom_id = ? ORDER BY risk_score DESC, mpn ASC",
            (bom_id,),
        ).fetchall()

    return {**dict(bom), "items": [dict(item) for item in items]}


def list_boms(tenant_id: str) -> list[dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        boms = conn.execute(
            """
            SELECT
                b.*,
                COUNT(i.id) AS item_count,
                COALESCE(MAX(i.risk_score), 0) AS max_risk_score
            FROM boms b
            LEFT JOIN bom_items i ON i.bom_id = b.id
            WHERE b.tenant_id = ?
            GROUP BY b.id
            ORDER BY b.created_at DESC
            """,
            (tenant_id,),
        ).fetchall()
    return [dict(bom) for bom in boms]
