from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import httpx


def ts() -> str:
    return datetime.now(timezone.utc).isoformat()


async def fetch_news_signals(query: str = "semiconductor supply chain Strait of Hormuz Taiwan export controls") -> list[dict[str, Any]]:
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return [{
            "source": "news_api",
            "status": "missing_credentials",
            "title": "NEWS_API_KEY not configured",
            "summary": "Add a news provider key to enable live geopolitical ingestion.",
            "published_at": ts(),
        }]
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://newsapi.org/v2/everything",
            params={"q": query, "language": "en", "sortBy": "publishedAt", "pageSize": 10, "apiKey": api_key},
        )
        response.raise_for_status()
        return [
            {
                "source": article.get("source", {}).get("name", "news"),
                "status": "live",
                "title": article.get("title"),
                "summary": article.get("description") or article.get("content") or "",
                "url": article.get("url"),
                "published_at": article.get("publishedAt"),
            }
            for article in response.json().get("articles", [])
        ]


async def fetch_weather_risk(location: str = "Strait of Hormuz") -> dict[str, Any]:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return {"source": "openweather", "status": "missing_credentials", "location": location, "risk": "unknown", "summary": "OPENWEATHER_API_KEY not configured"}
    async with httpx.AsyncClient(timeout=20) as client:
        geo = await client.get("https://api.openweathermap.org/geo/1.0/direct", params={"q": location, "limit": 1, "appid": api_key})
        geo.raise_for_status()
        places = geo.json()
        if not places:
            return {"source": "openweather", "status": "no_location", "location": location}
        lat, lon = places[0]["lat"], places[0]["lon"]
        weather = await client.get("https://api.openweathermap.org/data/2.5/weather", params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"})
        weather.raise_for_status()
        data = weather.json()
        wind = data.get("wind", {}).get("speed", 0)
        risk = "watch" if wind >= 10 else "stable"
        return {"source": "openweather", "status": "live", "location": location, "risk": risk, "wind_mps": wind, "summary": data.get("weather", [{}])[0].get("description", "")}


async def fetch_supplier_quote(mpn: str) -> dict[str, Any]:
    # Provider-specific distributor APIs differ. This adapter is the contract.
    if not os.getenv("SUPPLIER_API_KEY"):
        return {"source": "supplier_adapter", "status": "missing_credentials", "mpn": mpn, "stock": None, "lead_time_days": None}
    return {"source": "supplier_adapter", "status": "not_configured", "mpn": mpn}


def hormuz_countermeasures() -> dict[str, Any]:
    return {
        "scenario": "Strait of Hormuz disruption",
        "risk": "energy_shipping_chokepoint",
        "actions": [
            "Identify BOM lines tied to Gulf-region logistics, petrochemical inputs, and air-freight surcharge exposure.",
            "Increase buffers for high-margin assemblies with lead time above 60 days.",
            "Switch critical shipments from sea freight to split air freight where margin supports it.",
            "Ask suppliers for alternate routing and bonded warehouse availability.",
            "Run demand-downside and shipping-delay scenarios at 14, 30, and 45 days.",
        ],
    }

