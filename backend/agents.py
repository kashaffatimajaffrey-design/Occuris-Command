from __future__ import annotations

from typing import Any


def run_decision_agent(question: str, evidence: dict[str, Any]) -> dict[str, Any]:
    # LangGraph will replace this deterministic graph once credentials/deps are wired.
    lower = question.lower()
    if "hormuz" in lower:
        decision = "activate_shipping_disruption_playbook"
    elif "eol" in lower or "obsolete" in lower:
        decision = "qualify_alternates_and_last_time_buy"
    elif "stock" in lower or "inventory" in lower:
        decision = "recalculate_buffer_and_reorder"
    else:
        decision = "retrieve_more_evidence"
    return {"engine": "deterministic_graph_v0", "decision": decision, "evidence": evidence}

