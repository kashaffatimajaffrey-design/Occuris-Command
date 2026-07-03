from pathlib import Path
import os

import httpx
from agents import run_decision_agent
from alerts import alert_hub
from database import supabase
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from intelligence import DISRUPTIONS, disruption_scan, lifecycle_watch, scenario_plan, specmatch
from knowledge import eval_retrieval, ingest_source, init_knowledge_db, query_knowledge
from live_feeds import fetch_news_signals, fetch_supplier_quote, fetch_weather_risk, hormuz_countermeasures
from pydantic import BaseModel
from scheduler import start_scheduler
from store import create_bom, get_bom, init_db, list_boms

# NEW IMPORTS FOR RISK PREDICTION
from risk import router as risk_router
from vector_stores import vector_manager  # This initializes Chroma + Pinecone

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="Occuris Command API")


class ChatRequest(BaseModel):
    agentInstruction: str
    history: list
    userInput: str


class BomCreateRequest(BaseModel):
    tenant_id: str
    name: str
    raw_text: str
    actor: str = "pilot-user"


class SpecMatchRequest(BaseModel):
    mpn: str


class DisruptionScanRequest(BaseModel):
    mpns: list[str]


class ScenarioPlanRequest(BaseModel):
    mpns: list[str]
    demand_growth_percent: int = 20
    buffer_days: int = 60
    shipping_delay_days: int = 14
    geo_risk_multiplier: float = 1.2


class KnowledgeIngestRequest(BaseModel):
    tenant_id: str
    source_type: str
    title: str
    raw_text: str


class KnowledgeQueryRequest(BaseModel):
    tenant_id: str
    query: str
    limit: int = 6


class WebhookEventRequest(BaseModel):
    tenant_id: str
    source_type: str = "webhook"
    title: str
    payload: dict


class AgentRequest(BaseModel):
    tenant_id: str
    question: str


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()
    init_knowledge_db()
    start_scheduler()
    # Initialize vector stores (Chroma + Pinecone)
    print("Vector stores (ChromaDB + Pinecone) initialized")


@app.get("/")
def root():
    return {"message": "Occuris Command API running"}


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "occuris-command-backend"}


@app.get("/api/boms/{tenant_id}")
def get_boms(tenant_id: str):
    return list_boms(tenant_id)


@app.get("/api/bom/{bom_id}")
def get_bom_by_id(bom_id: str):
    try:
        return get_bom(bom_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="BOM not found") from exc


@app.post("/api/boms")
def post_bom(request: BomCreateRequest):
    try:
        return create_bom(request.tenant_id, request.name, request.raw_text, request.actor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/materials/{tenant_id}")
async def get_materials(tenant_id: str):
    if not supabase:
        return get_mock_materials(tenant_id)
    try:
        response = supabase.table("sap_materials").select("*").eq("tenant_id", tenant_id).execute()
        if hasattr(response, "data"):
            return response.data
        return []
    except Exception as exc:
        print(f"Material lookup failed: {exc}")
        return get_mock_materials(tenant_id)


@app.post("/api/specmatch")
def post_specmatch(request: SpecMatchRequest):
    return specmatch(request.mpn)


@app.get("/api/lifecycle/{mpn}")
def get_lifecycle(mpn: str):
    return lifecycle_watch(mpn)


@app.get("/api/disruptions")
def get_disruptions():
    return {"signals": DISRUPTIONS}


@app.post("/api/disruption-scan")
def post_disruption_scan(request: DisruptionScanRequest):
    return disruption_scan(request.mpns)


@app.post("/api/scenario-plan")
def post_scenario_plan(request: ScenarioPlanRequest):
    return scenario_plan(
        request.mpns,
        request.demand_growth_percent,
        request.buffer_days,
        request.shipping_delay_days,
        request.geo_risk_multiplier,
    )


@app.post("/api/knowledge/ingest")
def post_knowledge_ingest(request: KnowledgeIngestRequest):
    return ingest_source(request.tenant_id, request.source_type, request.title, request.raw_text)


@app.post("/api/knowledge/query")
def post_knowledge_query(request: KnowledgeQueryRequest):
    return query_knowledge(request.tenant_id, request.query, request.limit)


@app.get("/api/knowledge/eval/{tenant_id}")
def get_knowledge_eval(tenant_id: str):
    return eval_retrieval(tenant_id)


@app.get("/api/live/news")
async def live_news(query: str = "semiconductor supply chain Strait of Hormuz"):
    return {"signals": await fetch_news_signals(query)}


@app.get("/api/live/weather")
async def live_weather(location: str = "Strait of Hormuz"):
    return await fetch_weather_risk(location)


@app.get("/api/live/supplier/{mpn}")
async def live_supplier(mpn: str):
    return await fetch_supplier_quote(mpn)


@app.get("/api/playbooks/hormuz")
def get_hormuz_playbook():
    return hormuz_countermeasures()


@app.post("/api/webhooks/ingest")
async def webhook_ingest(request: WebhookEventRequest):
    raw_text = str(request.payload)
    result = ingest_source(request.tenant_id, request.source_type, request.title, raw_text)
    await alert_hub.broadcast({"type": "webhook_ingested", "title": request.title, "result": result})
    return result


@app.post("/api/agents/decision")
def decision_agent(request: AgentRequest):
    evidence = query_knowledge(request.tenant_id, request.question, 5)
    return run_decision_agent(request.question, evidence)


# ============== NEW RISK PREDICTION ENDPOINTS ==============
app.include_router(risk_router)


@app.websocket("/ws/alerts/{tenant_id}")
async def websocket_alerts(websocket: WebSocket, tenant_id: str):
    await alert_hub.connect(websocket)
    await websocket.send_json({"type": "connected", "tenant_id": tenant_id})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        alert_hub.disconnect(websocket)


@app.post("/api/chat")
async def chat(request: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"text": "Error: GEMINI_API_KEY not configured on server"}

    model = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
    contents = [
        {
            "role": "user",
            "parts": [{"text": f"{request.agentInstruction}\n\n{request.userInput}"}],
        }
    ]

    for msg in request.history:
        contents.append(
            {
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [{"text": msg["content"]}],
            }
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                params={"key": api_key},
                json={
                    "contents": contents,
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 1024,
                    },
                },
                timeout=30.0,
            )

            if response.status_code != 200:
                print(f"Gemini API error: {response.text}")
                return {"text": f"Error from Gemini API: {response.status_code}"}

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return {"text": "No candidates in response"}

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                return {"text": "No parts in response"}

            return {"text": parts[0].get("text", "Empty response text")}
    except Exception as exc:
        return {"text": f"Error: {str(exc)}"}


def get_mock_materials(tenant_id: str):
    mock_data = {
        "global-semi-01": [
            {"matnr": "MAT-7701", "name": "ASML NXE:3400C Mask", "category": "Lithography", "stock_level": 4, "safety_stock": 2, "lead_time": 180, "supplier": "ASML", "abc_class": "A", "unit": "Units"},
            {"matnr": "MAT-1205", "name": "EUV Photoresist (Type-B)", "category": "Chemicals", "stock_level": 850, "safety_stock": 200, "lead_time": 30, "supplier": "JSR Corp", "abc_class": "A", "unit": "Liters"},
            {"matnr": "MAT-9920", "name": "Silicon Wafer 300mm", "category": "Substrate", "stock_level": 5400, "safety_stock": 1000, "lead_time": 45, "supplier": "Sumco", "abc_class": "B", "unit": "Wafers"},
        ],
        "litho-tech-solutions": [
            {"matnr": "MAT-4412", "name": "Palladium Sputtering Target", "category": "Metals", "stock_level": 12, "safety_stock": 5, "lead_time": 90, "supplier": "Heraeus", "abc_class": "A", "unit": "Kg"},
        ],
        "nano-foundry-ops": [
            {"matnr": "MAT-3301", "name": "HBM3 Memory Die (8GB)", "category": "Component", "stock_level": 12000, "safety_stock": 3000, "lead_time": 60, "supplier": "SK Hynix", "abc_class": "A", "unit": "Die"},
        ],
    }
    return mock_data.get(tenant_id, [])


print("Occuris Command server startup complete.")