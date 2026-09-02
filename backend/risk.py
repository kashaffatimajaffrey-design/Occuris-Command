"""
risk.py

Every field this endpoint used to return was a hardcoded literal: an overall
risk score, three invented components with invented scores, a fixed weather
disruption line, and three canned recommendations. None of it was derived
from anything. The vector-store insert alongside it was write-only and never
read back. See git history for what was removed.

There is no risk model in this codebase. Until there is one, this endpoint
returns only what can actually be observed — the latest news headline, when a
NEWS_API_KEY is configured — and reports the absence of everything else
explicitly rather than filling it with plausible numbers.

C3 replaces this with real order data derived from the parsed event stream.
"""

import os

import requests
from fastapi import APIRouter

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/report/{tenant_id}")
async def get_risk_report(tenant_id: str = "demo"):
    """
    The current state of measurable risk signals.

    `risk_scoring_available` is False because no risk model exists. Callers
    must render the absence, not substitute a default. There is deliberately
    no score, no component ranking, and no recommended actions in this
    response — those were invented and have been removed.

    Note: tenant_id is accepted for URL compatibility but is not yet used to
    scope anything. Nothing here is tenant-specific.
    """
    response: dict = {
        "risk_scoring_available": False,
        "risk_scoring_note": (
            "No risk model exists yet. Scores, component rankings, and "
            "recommended actions are not computed and are not returned."
        ),
        "news": _fetch_news(),
    }
    return response


def _fetch_news() -> dict:
    """
    Latest headline from NewsAPI, or an explicit statement that it is
    unavailable and why.

    A failure is never returned as a headline string. The old code put "News
    API not available" into the alerts list, where the UI could not tell it
    apart from a real headline.
    """
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return {
            "available": False,
            "reason": "NEWS_API_KEY is not configured.",
            "headlines": [],
        }

    try:
        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={
                "q": "semiconductor supply chain",
                "apiKey": api_key,
                "sortBy": "publishedAt",
                "language": "en",
                "pageSize": 5,
            },
            timeout=15,
        )
        resp.raise_for_status()
        articles = resp.json().get("articles", []) or []
    except Exception as exc:
        return {
            "available": False,
            "reason": f"NewsAPI request failed: {exc}",
            "headlines": [],
        }

    return {
        "available": True,
        "headlines": [
            {
                "title": a.get("title"),
                "source": (a.get("source") or {}).get("name"),
                "published_at": a.get("publishedAt"),
                "url": a.get("url"),
            }
            for a in articles
            if a.get("title")
        ],
    }
