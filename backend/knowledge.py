from __future__ import annotations

import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4


DB_PATH = Path(__file__).parent / "occuris_command.db"


def conn() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_knowledge_db() -> None:
    with conn() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_sources (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                source_type TEXT NOT NULL,
                title TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_chunks (
                id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                text TEXT NOT NULL,
                tokens TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS operational_events (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                entity_ref TEXT NOT NULL,
                severity TEXT NOT NULL,
                summary TEXT NOT NULL,
                source_id TEXT,
                event_time TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def tokenize(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9+\-]{3,}", text.lower())}


def split_chunks(text: str, max_words: int = 90) -> list[str]:
    words = text.split()
    return [" ".join(words[i : i + max_words]) for i in range(0, len(words), max_words)] or [text]


def classify_event(text: str) -> tuple[str, str]:
    lower = text.lower()
    if any(term in lower for term in ["eol", "obsolete", "last time buy", "pdn", "pcn"]):
        return "lifecycle_notice", "critical" if "eol" in lower or "obsolete" in lower else "watch"
    if any(term in lower for term in ["delay", "late", "stuck", "port", "shipment", "truck", "customs"]):
        return "logistics_delay", "watch"
    if any(term in lower for term in ["taiwan", "strait", "sanction", "export", "itar", "ear"]):
        return "geopolitical_compliance", "critical"
    if any(term in lower for term in ["stock", "inventory", "buffer", "shortage"]):
        return "inventory_signal", "watch"
    return "general_note", "stable"


def ingest_source(tenant_id: str, source_type: str, title: str, raw_text: str) -> dict[str, Any]:
    init_knowledge_db()
    source_id = str(uuid4())
    created = now()
    chunks = split_chunks(raw_text)
    event_type, severity = classify_event(raw_text)

    with conn() as db:
        db.execute(
            "INSERT INTO knowledge_sources VALUES (?, ?, ?, ?, ?, ?)",
            (source_id, tenant_id, source_type, title, raw_text, created),
        )
        for index, chunk in enumerate(chunks):
            db.execute(
                "INSERT INTO knowledge_chunks VALUES (?, ?, ?, ?, ?, ?, ?)",
                (str(uuid4()), source_id, tenant_id, index, chunk, " ".join(sorted(tokenize(chunk))), created),
            )
        db.execute(
            "INSERT INTO operational_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                str(uuid4()),
                tenant_id,
                event_type,
                extract_entity_ref(raw_text),
                severity,
                raw_text[:240],
                source_id,
                created,
                created,
            ),
        )

    return {"source_id": source_id, "chunks": len(chunks), "event_type": event_type, "severity": severity}


def extract_entity_ref(text: str) -> str:
    match = re.search(r"\b[A-Z0-9]{2,}[A-Z0-9+\-]{3,}\b", text)
    return match.group(0) if match else "unlinked"


def query_knowledge(tenant_id: str, query: str, limit: int = 6) -> dict[str, Any]:
    init_knowledge_db()
    query_tokens = tokenize(query)
    results = []
    with conn() as db:
        rows = db.execute("SELECT * FROM knowledge_chunks WHERE tenant_id = ?", (tenant_id,)).fetchall()
        events = db.execute(
            "SELECT * FROM operational_events WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20",
            (tenant_id,),
        ).fetchall()

    for row in rows:
        chunk_tokens = set(row["tokens"].split())
        overlap = query_tokens & chunk_tokens
        score = len(overlap) / max(len(query_tokens), 1)
        if score > 0:
            results.append({**dict(row), "score": round(score, 3), "matched_terms": sorted(overlap)})

    results.sort(key=lambda item: item["score"], reverse=True)
    return {
        "query": query,
        "retrieved_chunks": results[:limit],
        "recent_events": [dict(event) for event in events],
        "answer_basis": "keyword retrieval v0; replace with pgvector embeddings once Supabase is connected",
    }


def eval_retrieval(tenant_id: str) -> dict[str, Any]:
    cases = [
        {"query": "which component has EOL or obsolete risk", "expected": {"lifecycle", "eol", "obsolete", "pdn", "pcn"}},
        {"query": "what shipment or port delays affect production", "expected": {"delay", "shipment", "port", "late", "customs"}},
        {"query": "which records mention Taiwan export risk", "expected": {"taiwan", "export", "itar", "ear", "strait"}},
    ]
    scores = []
    for case in cases:
        result = query_knowledge(tenant_id, case["query"], limit=3)
        found = set()
        for chunk in result["retrieved_chunks"]:
            found.update(chunk["matched_terms"])
        expected = case["expected"]
        true_positive = len(found & expected)
        precision = true_positive / max(len(found), 1)
        recall = true_positive / max(len(expected), 1)
        f1 = 0 if precision + recall == 0 else 2 * precision * recall / (precision + recall)
        scores.append({"query": case["query"], "precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3)})

    avg_f1 = sum(score["f1"] for score in scores) / len(scores)
    return {"metric": "retrieval_f1_v0", "average_f1": round(avg_f1, 3), "cases": scores}

