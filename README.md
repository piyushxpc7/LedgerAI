# LedgerAI — The Operating System for Indian Tax Compliance

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

### 2. Setup Frontend (Local)

```bash
cd frontend
npm install
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open **http://localhost:3000**

---

## 🌐 Production Deployment

### Frontend — Vercel (recommended)

The `frontend` app is a standard Next.js project and works out-of-the-box on Vercel:

1. Push this repo to GitHub.
2. In Vercel, **Create New Project** and select the repo.
3. Set **Root Directory** to `frontend/`.
4. Keep the default build settings (`npm install`, `npm run build`, `npm start` not needed for Vercel).
5. Configure environment variables in Vercel:
   - `NEXT_PUBLIC_API_URL=https://your-backend.example.com`
6. Deploy.  
   The Next.js rewrite in [`frontend/next.config.ts`](frontend/next.config.ts) will send all `/api/*` requests to your backend:

```ts
// frontend/next.config.ts
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

> In production, set `NEXT_PUBLIC_API_URL` to the public HTTPS URL of your backend (see below).

### Backend — Containerised FastAPI

The backend already ships with a production-ready Dockerfile and a `docker-compose.yml` you can adapt for your infra.

#### Option A — Single VM (e.g. EC2 / Droplet)

1. Provision a VM with Docker + Docker Compose.
2. Copy this repo (or just the `backend/` directory) onto the VM.
3. Create a `.env` on the host based on [`.env.example`](.env.example) and set at minimum:
   - `APP_ENV=production`
   - `DATABASE_URL=postgresql://user:password@host:5432/ledgerai`
   - `JWT_SECRET=<strong-random-secret>`
   - `MISTRAL_API_KEY=<your-mistral-key>`
   - `ALLOWED_ORIGINS_STR=https://your-vercel-domain.vercel.app,https://yourcustomdomain.com`
4. Use `docker-compose.yml` as a reference:
   - Run Postgres as a managed service **or** keep the bundled `postgres` service for smaller deployments.
   - Run the `backend` service built from [`backend/Dockerfile`](backend/Dockerfile).
5. Put Nginx/Caddy/Traefik in front of the backend container to terminate HTTPS and expose:
   - `https://your-backend.example.com/api/*` → `http://backend:8000/api/*`

#### Option B — Managed container service (ECS / Cloud Run / Render / Railway)

1. Build and push the backend image:

   ```bash
   cd backend
   docker build -t your-registry/ledgerai-backend:latest .
   docker push your-registry/ledgerai-backend:latest
   ```

2. Create a service in your provider of choice:
   - Image: `your-registry/ledgerai-backend:latest`
   - Port: `8000`
   - Health check: `GET /health` (expects JSON with `status: "ok"` or `"degraded"`).
3. Attach a managed Postgres instance and set `DATABASE_URL` accordingly.
4. Configure environment variables matching [`.env.example`](.env.example):
   - `APP_ENV=production`
   - `JWT_SECRET`, `MISTRAL_API_KEY`, `RESEND_API_KEY`, storage (`USE_S3`, `AWS_*`), `ALLOWED_ORIGINS_STR`, `REDIS_URL` (optional).
5. Expose the service over HTTPS using a managed load balancer or custom domain; use that URL as `NEXT_PUBLIC_API_URL` in Vercel.

---

## 🔑 Demo Login

| Field | Value |
|-------|-------|
| Email | `demo@ledgerai.ai` |
| Password | `ledgerai2026` |

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
- PDF files stored locally by default (configure S3/R2 via `.env` for production)
- All portal notice PDFs are decrypted using PAN+DOB — never stored plaintext

---

## 🛠 Operations & Runbooks

- **Environments**
  - `APP_ENV=development`: local dev, docs enabled, relaxed logging.
  - `APP_ENV=production`: stricter startup checks, docs hidden, HSTS enabled, warnings for missing AI keys.
- **Secret rotation**
  - `JWT_SECRET`: rotate by updating the value in your secret manager and restarting the backend; all existing sessions are invalidated.
  - `MISTRAL_API_KEY`, `RESEND_API_KEY`, `AWS_*`: update in your provider’s secret store and restart containers.
- **Monitoring health**
  - `GET /health`: used by load balancers; returns DB and AI status and current `app_env`.
  - Watch for `PIPELINE_FAILED` entries in `audit_logs` when debugging notice pipeline issues.
- **Logs**
  - Backend uses Python logging plus structured audit logs (`audit_logs` table) for key actions:
    - `NOTICE_UPLOADED`, `PIPELINE_COMPLETE`, `PIPELINE_FAILED`, `DRAFT_APPROVED`, `DRAFT_EDITED`, `ESCALATED_MANUAL`.
  - For production, forward container stdout/stderr to your log platform (CloudWatch, Loki, Datadog, etc.).
- **Notice pipeline failures**
  - When the AI pipeline crashes, the notice is marked `FAILED` and an audit log entry is created.
  - Typical remediation steps:
    1. Check raw PDF in storage for corruption.
    2. Verify `MISTRAL_API_KEY` and upstream AI availability.
    3. Re-upload the notice after fixing configuration.

### Future: Database migrations

Alembic is already included in `backend/requirements.txt` and can be adopted for schema evolution:

1. Create an Alembic config in `backend/` and point it at `db.database:Base`.
2. Generate an initial migration from the existing models.
3. For new schema changes, generate and apply migrations instead of relying on `create_all`.

This is recommended before large-scale production rollout, but the current setup is sufficient for early-stage deployments.

---

## ⚖ Liability

LedgerAI is software infrastructure, **not a legal advisor**. The CA firm holds all responsibility for submitted responses. LedgerAI mirrors Tally's established liability model.

---

*LedgerAI © 2026 — Confidential. YC Application Stage.*
