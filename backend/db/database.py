from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings


# ── Engine setup ──────────────────────────────────────────────────────
if settings.database_url.startswith("sqlite"):
    # SQLite: local dev only
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL (Supabase, Railway, Render, etc.)
    # Connection pooling: 5 persistent connections, up to 10 overflow
    engine = create_engine(
        settings.database_url,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,       # drop stale connections automatically
        pool_recycle=1800,        # recycle connections every 30 min
        connect_args={
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000",  # 30s query timeout
        },
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db_health() -> bool:
    """Returns True if DB is reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
