# Occuris Command - Semiconductor Supply Chain Intelligence Platform 

Formaly known as SemiChain AI

## 📋 Overview

Occuris Command (formerly SemiChain AI) is a multi-agent platform for semiconductor supply chain intelligence, built to demonstrate enterprise-relevant AI architecture for electronics/manufacturing supply chains. It combines a multi-agent reasoning layer, a hybrid retrieval architecture, and a Supabase-based multi-tenant data model.

**Status:** Core backend and frontend (Command Deck) are working locally today. A second layer of features — live external data feeds, geopolitical playbooks, webhook/alert infrastructure, and Supabase/pgvector-backed storage — has been scaffolded (routes, schema, and dependencies are in place) but is **not yet live**: it needs API credentials and a storage migration to become fully operational. See [Status Breakdown](#-status-breakdown) below for exactly what's running vs. what's wired-but-dormant.

## 🎥 Demo Video

[Watch on YouTube](https://youtu.be/dibV1tmRAR4)

*(Demonstrates the currently-working local version — see status breakdown for what's changed since.)*

## ✅ Status Breakdown

### Working now (local, no extra credentials required)

- FastAPI backend (`backend/main.py`)
- SQLite-based persistence, including basic BOM (bill-of-materials) storage
- Deterministic SpecMatch, lifecycle, risk, and scenario logic (rule-based, not yet LLM-adjudicated end-to-end)
- Basic keyword-based retrieval
- Basic F1-style evaluation harness
- React + TypeScript frontend ("Command Deck")
- Multi-agent chat (`/api/chat`) against Gemini
- `get_materials` Supabase branch (previously broken, now fixed)

### Scaffolded — code is merged, but needs API keys or a storage migration to actually go live

These endpoints exist, build, and compile, but currently respond without real data (or don't yet persist to the production store) until the corresponding credential is set:

| Feature | Endpoint / File | Needs |
|---|---|---|
| Live news feed | `GET /api/live/news` | `NEWS_API_KEY` |
| Live weather feed | `GET /api/live/weather` | `OPENWEATHER_API_KEY` |
| Live supplier lookup | `GET /api/live/supplier/{mpn}` | `SUPPLIER_API_KEY` |
| Strait of Hormuz playbook | `GET /api/playbooks/hormuz` | Live feed data above |
| Webhook ingestion | `POST /api/webhooks/ingest` | Inbound integration configured on sender side |
| Live per-tenant alerts | `ws://localhost:8000/ws/alerts/{tenant_id}` | Alert-producing pipeline (webhooks/scheduler) running |
| Decision agent | `POST /api/agents/decision` | Cross-agent signals populated (depends on above) |
| Scheduled ingestion worker | `backend/scheduler.py` | Same credentials as live feeds |
| Supabase production schema | [`supabase/schema.sql`](supabase/schema.sql) | `SUPABASE_URL`, `SUPABASE_KEY`, and a run of the migration — **not yet the live storage backend; SQLite is still what the app reads/writes today** |

New dependencies added to support this layer: `apscheduler`, `langchain`, `langgraph`, `llama-index`, `openai`, `resend`.

Build passes. Python compile passes. This reflects that the code is syntactically and structurally sound — it does not yet reflect end-to-end integration testing of the live-feed/Supabase layer.

### Not yet built

- Frontend panels wired to the new live endpoints
- SQLite → Supabase/pgvector migration for knowledge storage (schema is written; the app doesn't read/write it yet)
- End-to-end verification of the Supabase schema under real load

## 🏗️ Intended Architecture (once the migration above is complete)

```
┌─────────────────────────────────────────────────────┐
│              React + TypeScript Frontend             │
│         Multi-tenant Dashboard + Agent Chat           │
└─────────────────────┬───────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────┐
│              FastAPI Backend (Port 8000)              │
│  • /api/chat            - Agent proxy (LIVE)          │
│  • /api/materials       - SAP data (LIVE, SQLite)     │
│  • /api/health          - System status (LIVE)        │
│  • /api/live/*          - Live feeds (needs keys)     │
│  • /api/playbooks/hormuz - Hormuz playbook (needs feeds)│
│  • /api/webhooks/ingest - Webhook intake (scaffolded) │
│  • /api/agents/decision - Decision agent (scaffolded) │
│  • /ws/alerts/{tenant_id} - Alert stream (scaffolded) │
└─────────────────────┬───────────────────────────────┘
                       │
       ┌───────────────┼───────────────┬───────────────┐
       ▼               ▼               ▼               ▼
┌───────────────┐ ┌──────────┐   ┌──────────┐   ┌──────────┐
│ SQLite (today)│ │  Gemini  │   │  Vector  │   │  Redis   │
│ Supabase (WIP)│ │    AI    │   │   DBs    │   │(planned) │
└───────────────┘ └──────────┘   └──────────┘   └──────────┘
```

## 🚀 Tech Stack

**Frontend**
- React 18 + TypeScript, Tailwind CSS, Recharts, React Router

**Backend**
- FastAPI (Python 3.11+)
- SQLite (current storage) / Supabase + pgvector (in-progress migration target)
- Gemini AI for agent intelligence; OpenAI SDK as alternate provider
- LangChain + LangGraph for multi-agent orchestration (added, not fully wired into the live decision path yet)
- LlamaIndex for RAG indexing (added, not fully wired yet)
- APScheduler for scheduled live-feed ingestion (scaffolded)
- Resend for alert email delivery (scaffolded)

**Vector Databases (target architecture, not all active yet)**
- pgvector via Supabase — schema written, not yet the live read/write path
- FAISS / ChromaDB / Qdrant — referenced in architecture, integration status per-DB should be verified before claiming "hybrid RAG" externally

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account (only needed once you migrate off SQLite)
- Gemini API key

### Backend Setup

```bash
git clone https://github.com/kashaffatimajaffrey-design/Occuris-Command.git
cd Occuris-Command

python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

cd backend
pip install -r requirements.txt

cp .env.example .env
# Add GEMINI_API_KEY at minimum to run the working local features.
# Add NEWS_API_KEY / OPENWEATHER_API_KEY / SUPPLIER_API_KEY / SUPABASE_URL /
# SUPABASE_KEY / RESEND_API_KEY only if you want to exercise the scaffolded layer.

python -m uvicorn main:app --reload --port 8000

# Optional — only does something useful once live-feed keys are set:
python backend/scheduler.py
```

### Frontend Setup

```bash
npm install
cp .env.example .env
# Add VITE_GEMINI_API_KEY
npm run dev
```

## 🔑 Environment Variables

| Variable | Purpose | Required for |
|---|---|---|
| `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` | Agent intelligence | Core app (works today) |
| `NEWS_API_KEY` | `/api/live/news` | Scaffolded live-feed layer |
| `OPENWEATHER_API_KEY` | `/api/live/weather` | Scaffolded live-feed layer |
| `SUPPLIER_API_KEY` | `/api/live/supplier/{mpn}` | Scaffolded live-feed layer |
| `SUPABASE_URL` / `SUPABASE_KEY` | Production schema + pgvector | In-progress storage migration |
| `RESEND_API_KEY` | Alert email delivery | Scaffolded alerting layer |

Without the live-feed and Supabase keys, the app runs fully on its working local feature set — the new endpoints will still respond but without live data or persistence.

## 🗄️ Supabase Production Schema (in progress)

[`supabase/schema.sql`](supabase/schema.sql) defines the target production schema:

- `organizations` / `organization_members` — tenant + RBAC roles
- `boms` / `bom_items` — bill-of-materials and line items
- `knowledge_sources` / `knowledge_chunks` — ingested documents, chunked and embedded (`vector(1536)`, `ivfflat` cosine index)
- `operational_events` — timestamped events with severity
- `alerts` — alert records surfaced via the WebSocket stream

RLS is enabled on every table. **This schema has not yet been run end-to-end in production and the backend does not yet read/write to it** — SQLite remains the live storage layer until the migration is complete.

## 🧪 Testing

```bash
cd backend && pytest tests/
npm test
```

Current status: build passes, Python compile passes. This confirms structural correctness of the added code; it does not yet confirm end-to-end behavior of the live-feed/Supabase layer, since that requires credentials this environment doesn't have configured.

## 🎯 API Endpoints

| Method | Endpoint | Status |
|---|---|---|
| GET | `/` | Live |
| GET | `/api/health` | Live |
| GET | `/api/materials/{tenant_id}` | Live (SQLite) |
| POST | `/api/chat` | Live |
| GET | `/api/live/news` | Scaffolded — needs `NEWS_API_KEY` |
| GET | `/api/live/weather` | Scaffolded — needs `OPENWEATHER_API_KEY` |
| GET | `/api/live/supplier/{mpn}` | Scaffolded — needs `SUPPLIER_API_KEY` |
| GET | `/api/playbooks/hormuz` | Scaffolded — depends on live feeds |
| POST | `/api/webhooks/ingest` | Scaffolded — needs sender-side integration |
| POST | `/api/agents/decision` | Scaffolded — depends on live signal sources |
| WS | `/ws/alerts/{tenant_id}` | Scaffolded — depends on alert-producing pipeline |

## 🛣️ Roadmap

- [ ] Wire frontend panels to `/api/live/*`, `/api/playbooks/hormuz`, and the alert WebSocket
- [ ] Migrate knowledge storage from SQLite to Supabase/pgvector end-to-end
- [ ] Run and verify `supabase/schema.sql` against a live project under real data
- [ ] End-to-end test of the live-feed → knowledge store → decision-agent pipeline
- [x] Fixed previously broken `get_materials` Supabase branch

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

- Personal Email — [kash.fatima7@gmail.com](mailto:kash.fatima7@gmail.com)
- Company Email — [aioccuris@gmail.com](mailto:aioccuris@gmail.com)
- Personal LinkedIn — [linkedin.com/in/kashaf-fatima-jaffri67](https://www.linkedin.com/in/kashaf-fatima-jaffri67/)
- Company LinkedIn — [linkedin.com/company/occurisai](https://www.linkedin.com/company/occurisai)
