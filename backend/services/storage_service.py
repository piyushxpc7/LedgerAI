"""
Storage Service — abstracts local disk vs S3/Cloudflare R2.

In dev:  files saved to ./uploads/ on disk.
In prod: files uploaded to S3-compatible bucket (AWS S3 or Cloudflare R2).

Cloudflare R2 is FREE (10 GB storage, free egress) and S3-compatible.
Set in .env:
    USE_S3=true
    AWS_ACCESS_KEY_ID=<r2-access-key>
    AWS_SECRET_ACCESS_KEY=<r2-secret-key>
    AWS_S3_BUCKET=ledgerai-docs
    AWS_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
    AWS_REGION=auto
"""
import os
import uuid
import shutil
from typing import Optional
from fastapi import UploadFile
from core.config import settings


def _ext(filename: str) -> str:
    return os.path.splitext(filename or "")[-1].lower()


# ── Validation ────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".pdf"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_upload(file: UploadFile) -> None:
    """Raise ValueError if file is invalid (wrong type or too large)."""
    ext = _ext(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Only PDF files are accepted. Got: '{file.filename}'")
    # Read content-length header if available
    content_length = None
    if hasattr(file, "headers") and file.headers:
        content_length = file.headers.get("content-length")
    if content_length and int(content_length) > MAX_SIZE_BYTES:
        raise ValueError("File is too large. Maximum allowed size is 10 MB.")


# ── Save / Upload ─────────────────────────────────────────────────────
def save_file(file: UploadFile, subfolder: str = "notices") -> str:
    """
    Save an uploaded file. Returns a storage key (path or S3 key).
    The key is what gets persisted in the database.
    """
    validate_upload(file)
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    key = f"{subfolder}/{unique_name}"

    if settings.use_s3:
        return _upload_s3(file, key)
    else:
        return _save_local(file, key)


def get_download_url(key: str, expires: int = 3600) -> str:
    """
    Return a URL to access the file.
    - Local: just returns the local path (frontend won't use this directly)
    - S3/R2: returns a signed URL valid for `expires` seconds
    """
    if settings.use_s3:
        return _signed_url_s3(key, expires)
    return key  # local path — backend serves via a dedicated route if needed


# ── Local storage ─────────────────────────────────────────────────────
def _save_local(file: UploadFile, key: str) -> str:
    dest = os.path.join(settings.upload_dir, key)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    file.file.seek(0)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return dest  # absolute local path as the "key"


# ── S3 / Cloudflare R2 ────────────────────────────────────────────────
def _get_s3_client():
    try:
        import boto3
    except ImportError:
        raise RuntimeError("boto3 is not installed. Run: pip install boto3")

    kwargs = dict(
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client("s3", **kwargs)


def _upload_s3(file: UploadFile, key: str) -> str:
    s3 = _get_s3_client()
    file.file.seek(0)
    s3.upload_fileobj(
        file.file,
        settings.aws_s3_bucket,
        key,
        ExtraArgs={"ContentType": "application/pdf"},
    )
    return key


def _signed_url_s3(key: str, expires: int) -> str:
    s3 = _get_s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_s3_bucket, "Key": key},
        ExpiresIn=expires,
    )
