"""
TaxOS Backend — FastAPI main application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import settings
from db.database import create_tables, get_db_health
from api.routes import auth, clients, notices, dashboard, users

# ── Rate limiting (slowapi) ───────────────────────────────────────────
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMIT_AVAILABLE = True
except ImportError:
    limiter = None
    RATE_LIMIT_AVAILABLE = False
    print("⚠️  slowapi not installed — rate limiting disabled. Run: pip install slowapi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    print(f"✅ TaxOS API started ({settings.app_env}). Database ready.")
    if not settings.mistral_api_key:
        print("⚠️  MISTRAL_API_KEY not set — AI pipeline will use fallback responses.")
    yield


# ── App setup ─────────────────────────────────────────────────────────
app = FastAPI(
    title="TaxOS API",
    description="The Operating System for Indian Tax Compliance — AI-powered notice management for CA firms",
    version="1.0.0",
    # Hide docs in production
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None if settings.is_production else "/api/redoc",
    openapi_url=None if settings.is_production else "/api/openapi.json",
    lifespan=lifespan,
)

# Attach rate limiter
if RATE_LIMIT_AVAILABLE:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Middleware ─────────────────────────────────────────────────────────

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


# ── Routers ───────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(notices.router, prefix="/api")
app.include_router(users.router, prefix="/api")


# ── Root & Health ─────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "app": "TaxOS API",
        "version": "1.0.0",
        "env": settings.app_env,
        "status": "running",
    }


@app.get("/health")
def health():
    """
    Health check — returns status of DB and AI service.
    Used by Render/Railway load balancers and uptime monitors.
    """
    db_ok = get_db_health()
    ai_ok = bool(settings.mistral_api_key)
    status = "ok" if db_ok else "degraded"

    return {
        "status": status,
        "database": "ok" if db_ok else "error",
        "ai_service": "ok" if ai_ok else "no_api_key",
        "env": settings.app_env,
    }
