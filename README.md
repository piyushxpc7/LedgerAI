# TaxOS — The Operating System for Indian Tax Compliance

> **AI-powered income tax notice management for CA firms.**
> Upload a notice PDF → 4-agent AI pipeline → get a legally drafted response in minutes.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Setup Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install fastapi 'uvicorn[standard]' sqlalchemy alembic aiosqlite \
  'python-jose[cryptography]' 'passlib[bcrypt]' python-multipart \
  pymupdf pdfplumber pikepdf langgraph langchain-core langchain-mistralai \
  mistralai httpx pydantic pydantic-settings aiofiles boto3 python-dotenv

# Configure environment
cp ../.env.example .env
# Edit .env and add your MISTRAL_API_KEY

# Seed demo data
python db/seed.py

# Start API server
uvicorn main:app --reload --port 8000
```

### 2. Setup Frontend

```bash
cd frontend
npm install
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open **http://localhost:3000**

---

## 🔑 Demo Login

| Field | Value |
|-------|-------|
| Email | `demo@taxos.ai` |
| Password | `taxos2026` |

---

## 🤖 AI Configuration

Add your **Mistral API key** in `backend/.env`:
```
MISTRAL_API_KEY=your_key_here
```
Get a key at [console.mistral.ai](https://console.mistral.ai)

> **Without a Mistral API key:** The 4-agent pipeline will run but return fallback default responses instead of AI-generated content. Seeded demo data with pre-generated drafts will work without any API key.

---

## 🏗 Architecture

```
frontend/         (Next.js 14, Tailwind CSS)
  app/
    page.tsx                 Landing page
    login/                   Auth pages
    register/
    dashboard/               Protected app
      page.tsx               Dashboard stats
      notices/               Notice management
        [id]/                Notice detail + approval
      upload/                Upload PDF + trigger pipeline
      clients/               Client PAN management
      intelligence/          Resolution Intelligence
  lib/api.ts                 Type-safe API client

backend/          (FastAPI, Python 3.11)
  main.py                    FastAPI app entrypoint
  core/
    config.py                App settings
    auth.py                  JWT authentication
  db/
    models.py                SQLAlchemy ORM (7 entities)
    schemas.py               Pydantic API schemas
    database.py              DB engine + sessions
    seed.py                  Demo data seeder
  services/
    pdf_service.py           PyMuPDF + pikepdf PDF processing
    mistral_service.py       Mistral AI client (classify, draft, strategy)
    cross_ref_service.py     26AS × ITR cross-reference engine
  agents/
    graph.py                 LangGraph 4-agent StateGraph pipeline
      ├── classifier_node    Extract & classify notice fields
      ├── analyst_node       Build ProofObject via cross-reference
      ├── strategist_node    Recommend resolution strategy
      └── drafter_node       Generate legal response letter
  api/routes/
    auth.py                  /auth/login, /register, /me
    clients.py               /clients CRUD
    notices.py               /notices upload, status, approve
    dashboard.py             /dashboard/stats, /intel
```

---

## 📋 Agent Pipeline

```
Upload PDF
    │
    ▼
[Agent 1: Classifier]  ──── Mistral extracts: section, AY, amount, deadline
    │
    ▼  
[Agent 2: Analyst]     ──── Cross-references vs 26AS + ITR → builds ProofObject
    │
    ▼
[Agent 3: Strategist]  ──── Mistral recommends: PAY / FILE_154 / REVISED / CONTEST
    │
    ▼
[Agent 4: Drafter]     ──── Mistral drafts legal response letter + doc checklist
    │
    ▼
CA Approval Card       ──── CA reviews proof + draft → Approve / Edit / Escalate
```

---

## 📊 Data Models

| Entity | Description |
|--------|-------------|
| `Firm` | CA firm account |
| `User` | Firm members (Partner / Senior CA / Article) |
| `Client` | Taxpayer PAN + DOB (for PDF decryption) |
| `Notice` | Central notice object with status lifecycle |
| `ProofObject` | Evidence map: notice claims vs our records |
| `ResolutionOutcome` | Resolution Intelligence learning record |
| `AuditLog` | Immutable action log for every decision |

---

## 🔐 Security Notes

- Passwords hashed with bcrypt
- JWT auth (7-day expiry)
- Firm-level data isolation
- PDF files stored locally (configure S3 via `.env` for production)
- All portal notice PDFs are decrypted using PAN+DOB — never stored plaintext

---

## ⚖ Liability

TaxOS is software infrastructure, **not a legal advisor**. The CA firm holds all responsibility for submitted responses. TaxOS mirrors Tally's established liability model.

---

*TaxOS © 2026 — Confidential. YC Application Stage.*
