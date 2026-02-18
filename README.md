## SemiChain AI - Semiconductor Supply Chain Intelligence Platform

## 📋 Overview
SemiChain AI is a production-grade multi-agent platform for semiconductor supply chain intelligence. Built specifically to demonstrate enterprise-ready AI capabilities for Fortune 500 electronics companies, it combines:

🤖 Multi-Agent AI System - Specialized agents for Procurement, Inventory, Risk, and Compliance

🔍 Hybrid RAG Architecture - All 4 major vector databases (FAISS, ChromaDB, pgvector, Qdrant)

🏢 Enterprise SaaS Features - Multi-tenancy, RBAC, audit logging

⚡ Real-time Monitoring - Prometheus-style metrics, Kubernetes visualization

📊 SAP Integration - S/4HANA material master data modeling

## 🎥 Demo Video

https://youtu.be/dibV1tmRAR4 

## ✨ Key Features
🧠 AI Agent System
Agent	Expertise	Tools
Procurement	SAP MM (EKKO/EKPO)	PO analysis, vendor evaluation
Inventory	S/4HANA Material Master	ABC/XYZ classification, safety stock
Supplier Risk	Geopolitical monitoring	Financial health, disruption alerts
Compliance	EAR/ITAR export control	Conflict minerals, audit trails
🔍 Vector Database Architecture

┌─────────────────────────────────────┐
│         Hybrid RAG Engine           │
├─────────────────────────────────────┤
│  FAISS     │  ChromaDB  │  pgvector │
│  (Local)   │  (File)    │  (SQL)    │
├─────────────────────────────────────┤
│           Qdrant (Cloud)            │
│      Ensemble Reranking Layer       │
└─────────────────────────────────────┘
🏢 Enterprise Features
✅ Multi-tenancy - Complete tenant isolation with RLS

✅ RBAC - Admin, Procurement, Viewer roles

✅ Audit Logging - Full traceability of all actions

✅ Tool Security - IAM-based permission validation

⚡ Production Ready
✅ Kubernetes-style monitoring - Node health, pod counts

✅ Prometheus metrics - Request rates, error tracking

✅ CORS configured - Secure frontend-backend communication

✅ Environment-based config - Dev/prod ready

## 🏗️ Architecture

┌─────────────────────────────────────────────────────┐
│              React + TypeScript Frontend            │
│         Multi-tenant Dashboard + Agent Chat         │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              FastAPI Backend (Port 8000)            │
│         ┌─────────────────────────────────┐         │
│         │   API Endpoints:                 │         │
│         │   • /api/chat - Agent proxy      │         │
│         │   • /api/materials - SAP data    │         │
│         │   • /api/health - System status  │         │
│         └─────────────────────────────────┘         │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
┌───────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   Supabase    │ │  Gemini  │ │  Vector  │ │  Redis   │
│  (PostgreSQL) │ │    AI    │ │   DBs    │ │ (Caching)│
└───────────────┘ └──────────┘ └──────────┘ └──────────┘
## 🚀 Tech Stack
Frontend
⚛️ React 18 + TypeScript

🎨 Tailwind CSS for styling

📊 Recharts for data visualization

🔄 React Router for navigation

🧩 Custom hooks for tenant context

Backend
🚀 FastAPI (Python 3.11+)

🔐 JWT authentication ready

📦 Supabase (PostgreSQL + pgvector)

🤖 Gemini AI Pro for agent intelligence

🌐 HTTPX for async API calls

Vector Databases
🔍 FAISS - Local similarity search

📁 ChromaDB - Persistent file store

🗄️ pgvector - SQL-based vector search

☁️ Qdrant - Cloud distributed search

DevOps
🐳 Docker containerization

🔄 GitHub Actions CI/CD

📊 Prometheus + Grafana monitoring

☁️ Vercel + Render deployment

## 📦 Installation
Prerequisites
Python 3.11+

Node.js 18+

Supabase account (free tier)

Gemini API key

Backend Setup
bash
# Clone repository
git clone https://github.com/yourusername/semichain-ai.git
cd semichain-ai

# Set up Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_KEY
# - GEMINI_API_KEY

# Run database migrations (Supabase SQL in /migrations)

# Start backend server
python -m uvicorn main:app --reload --port 8000
Frontend Setup
bash
# In a new terminal
cd frontend
npm install

# Configure environment
cp .env.example .env
# Add VITE_GEMINI_API_KEY

# Start development server
npm run dev
Environment Variables
Backend .env

env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
Frontend .env

env
VITE_GEMINI_API_KEY=your_gemini_api_key
🎯 API Endpoints
Method	Endpoint	Description
GET	/	API health check
GET	/api/health	Detailed health status
GET	/api/materials/{tenant_id}	Get SAP materials for tenant
POST	/api/chat	Agent chat endpoint
Chat Request Format
json
{
  "agentInstruction": "You are a procurement expert...",
  "history": [
    {"role": "user", "content": "Previous message"},
    {"role": "model", "content": "Previous response"}
  ],
  "userInput": "What is the lead time for ASML masks?"
}
🧪 Testing
bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test
📊 Project Structure

semichain-ai/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py           # Supabase connection
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Backend environment
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API services
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── types.ts          # TypeScript types
│   │   └── constants.ts      # App constants
│   ├── public/               # Static assets
│   └── .env                  # Frontend environment
├── docker/                   # Docker configurations
├── k8s/                      # Kubernetes manifests
└── README.md                 # This file
🚀 Deployment
Backend (Render)
Connect GitHub repository

Set build command: pip install -r requirements.txt

Set start command: uvicorn main:app --host 0.0.0.0 --port $PORT

Add environment variables

Frontend (Vercel)
Import GitHub repository

Set build command: npm run build

Set output directory: dist

Add environment variables

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

Fork the repository

Create your feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

## 📧 Contact
Kashaf Fatima - kash.fatima7@gmail.com

