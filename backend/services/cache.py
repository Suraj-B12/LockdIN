"""Redis caching layer for frequently accessed data."""

import json
import redis.asyncio as aioredis
from config import get_settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Get or create the async Redis connection."""
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def cache_get(key: str) -> dict | list | None:
    """Get a cached value by key. Returns None on cache miss."""
    r = await get_redis()
    data = await r.get(key)
    if data:
        return json.loads(data)
    return None


async def cache_set(key: str, value: dict | list, ttl_seconds: int = 300):
    """Set a cached value with a TTL (time-to-live in seconds)."""
    r = await get_redis()
    await r.setex(key, ttl_seconds, json.dumps(value, default=str))


async def cache_delete(pattern: str):
    """Delete all keys matching a pattern (e.g., 'lb:daily:*')."""
    r = await get_redis()
    keys = []
    async for key in r.scan_iter(match=pattern):
        keys.append(key)
    if keys:
        await r.delete(*keys)


async def check_redis_health() -> bool:
    """Check if Redis is reachable."""
    try:
        r = await get_redis()
        await r.ping()
        return True
    except Exception:
        return False
