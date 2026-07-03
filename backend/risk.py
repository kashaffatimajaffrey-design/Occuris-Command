from fastapi import APIRouter
from pydantic import BaseModel
import requests
import os
from datetime import datetime
from vector_stores import vector_manager
from llama_index.core import Document

router = APIRouter(prefix="/api/risk", tags=["risk"])

class RiskReport(BaseModel):
    overall_risk_score: int
    components_at_risk: list
    geopolitical_alerts: list
    weather_disruptions: list
    recommended_actions: list

@router.get("/report/{tenant_id}")
async def get_risk_report(tenant_id: str = "demo"):
    chroma_index = vector_manager.get_chroma_index()
    pinecone_index = vector_manager.get_pinecone_index()

    # Fetch real news
    try:
        news_resp = requests.get(
            f"https://newsapi.org/v2/everything?q=taiwan+semiconductor+supply+chain&apiKey={os.getenv('NEWS_API_KEY')}&sortBy=publishedAt&language=en"
        ).json()
        
        articles = news_resp.get("articles", [])
        news_title = articles[0].get("title", "No recent news") if articles else "No recent news"
        news_content = articles[0].get("description", "") if articles else ""
        
        print(f"✅ Fetched latest news: {news_title[:100]}...")
    except Exception as e:
        print("NewsAPI error:", e)
        news_title = "News API not available"
        news_content = ""

    # Save to vector stores
    try:
        document_text = f"Geopolitical Risk Alert: {news_title}. {news_content}"
        
        doc = Document(
            text=document_text,
            metadata={
                "type": "geopolitical",
                "source": "newsapi",
                "timestamp": datetime.now().isoformat()
            }
        )

        chroma_index.insert(doc)
        pinecone_index.insert(doc)
        
        print("✅ Risk data successfully saved to ChromaDB and Pinecone")
    except Exception as e:
        print("Vector store save failed:", str(e))

    components = [
        {"name": "chip-A123", "score": 78, "type": "geopolitical"},
        {"name": "sensor-X45", "score": 45, "type": "weather"},
        {"name": "board-B77", "score": 62, "type": "shipping"}
    ]

    report = RiskReport(
        overall_risk_score=68,
        components_at_risk=components,
        geopolitical_alerts=[news_title],
        weather_disruptions=["Potential delay in Shanghai port due to storm"],
        recommended_actions=[
            "Diversify suppliers for chip-A123 immediately",
            "Increase buffer stock by 25% for critical components",
            "Activate alternative routing for Taiwan shipments"
        ]
    )

    return report.dict()