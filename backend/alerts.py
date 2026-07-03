from __future__ import annotations
from typing import Any
from datetime import datetime
from fastapi import WebSocket


class AlertHub:
    def __init__(self) -> None:
        self.connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, event: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for connection in self.connections:
            try:
                await connection.send_json(event)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)

    # NEW: Risk Alert Broadcast
    async def broadcast_risk_alert(self, risk_report: dict):
        alert = {
            "type": "risk_alert",
            "timestamp": datetime.now().isoformat(),
            "overall_risk_score": risk_report.get("overall_risk_score"),
            "high_risk_components": [c["name"] for c in risk_report.get("components_at_risk", []) if c.get("score", 0) > 60],
            "message": "High risk detected in supply chain components. Check Risk Dashboard."
        }
        await self.broadcast(alert)


alert_hub = AlertHub()