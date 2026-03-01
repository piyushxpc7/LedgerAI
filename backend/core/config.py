from pydantic_settings import BaseSettings
from pydantic import Field
import os
import sys


class Settings(BaseSettings):
    app_name: str = "LedgerAI"
    app_env: str = "development"  # "development" | "production"
    debug: bool = True

    # Database — default is local SQLite for dev, set DATABASE_URL for postgres in prod
    database_url: str = Field(
        default="sqlite:///./ledgerai.db",
        description="Database connection URL. Use postgres://... in production."
    )

    # Auth
    jwt_secret: str = Field(default="ledgerai-dev-secret-change-in-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    # Mistral AI
    mistral_api_key: str = Field(default="")

    # File Storage — local by default; set use_s3=true + credentials for S3/R2 in prod
    upload_dir: str = "./uploads"
    use_s3: bool = False
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "ledgerai-docs"
    aws_region: str = "ap-south-1"
    aws_endpoint_url: str = ""   # Set to Cloudflare R2 endpoint for free egress

    # Email — Resend (free 3k/month). Leave blank to disable email.
    resend_api_key: str = ""
    email_from: str = "LedgerAI <noreply@yourdomain.com>"

    # Redis — for future Celery worker. Upstash is free.
    redis_url: str = "redis://localhost:6379/0"

    # CORS — comma-separated list of allowed origins
    allowed_origins_str: str = "http://localhost:3000,http://localhost:3001"

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins_str.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# ── Startup validation ────────────────────────────────────────────────
_DEFAULT_JWT = "ledgerai-dev-secret-change-in-production"

if settings.is_production:
    errors = []
    if settings.jwt_secret == _DEFAULT_JWT:
        errors.append("JWT_SECRET must be set to a strong random value in production.")
    if not settings.mistral_api_key:
        errors.append("MISTRAL_API_KEY is not set. AI pipeline will fail every request.")
    if "sqlite" in settings.database_url:
        errors.append("DATABASE_URL is still SQLite. Use a PostgreSQL URL in production.")
    if errors:
        print("\n❌ LedgerAI cannot start in production with the following issues:", file=sys.stderr)
        for e in errors:
            print(f"   • {e}", file=sys.stderr)
        sys.exit(1)
elif not settings.mistral_api_key:
    print("⚠️  MISTRAL_API_KEY not set — AI pipeline will return fallback responses.")

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)
