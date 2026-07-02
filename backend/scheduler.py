from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from knowledge import ingest_source
from live_feeds import fetch_news_signals


scheduler = AsyncIOScheduler()


async def ingest_live_news_job() -> None:
    signals = await fetch_news_signals()
    for signal in signals:
        if signal.get("status") == "live":
            ingest_source(
                "global-semi-01",
                "news",
                signal.get("title") or "Live news signal",
                f"{signal.get('title', '')}\n{signal.get('summary', '')}\n{signal.get('url', '')}",
            )


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(ingest_live_news_job, "interval", minutes=15, id="live-news-ingest", replace_existing=True)
        scheduler.start()

