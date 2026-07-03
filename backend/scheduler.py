from __future__ import annotations
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

from knowledge import ingest_source
from live_feeds import fetch_news_signals
from risk import get_risk_report   # Import risk function
from alerts import alert_hub       # Import alert hub


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


async def daily_risk_check() -> None:
    """Check risk every 15 minutes and broadcast alerts if high"""
    try:
        report = await get_risk_report("demo")
        if report.get("overall_risk_score", 0) > 60:
            await alert_hub.broadcast_risk_alert(report)
            print("🚨 High Risk Alert Broadcasted via WebSocket")
        else:
            print("Risk check completed - Risk level normal")
    except Exception as e:
        print(f"Risk check failed: {e}")


def start_scheduler() -> None:
    if not scheduler.running:
        # Existing news job
        scheduler.add_job(ingest_live_news_job, "interval", minutes=15, id="live-news-ingest", replace_existing=True)
        
        # New Risk Prediction Job
        scheduler.add_job(daily_risk_check, "interval", minutes=15, id="risk-check", replace_existing=True)
        
        scheduler.start()
        print("Scheduler started with Risk Prediction checks")