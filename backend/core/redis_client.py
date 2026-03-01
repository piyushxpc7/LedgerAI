"""Redis client helper for shared concerns (password reset tokens, future queues)."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

from core.config import settings

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover - import guard
    redis = None  # type: ignore


class RedisNotAvailable(RuntimeError):
    """Raised when Redis is not installed or cannot be used."""


@lru_cache
def get_redis() -> "redis.Redis":
    """
    Return a cached Redis client instance.

    Raises RedisNotAvailable if redis-py is missing or misconfigured.
    """
    if redis is None:
        raise RedisNotAvailable("redis library is not installed")

    try:
        client: "redis.Redis" = redis.from_url(settings.redis_url, decode_responses=True)
        # Lightweight connectivity check so failures surface early
        client.ping()
        return client
    except Exception as exc:  # pragma: no cover - network/infra dependent
        raise RedisNotAvailable(f"Redis not reachable at {settings.redis_url!r}: {exc}") from exc

