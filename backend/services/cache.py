"""In-process TTL cache.

Replaces the previous Redis-backed cache so the app runs with zero external
infrastructure (free-tier friendly, single-instance). The public async
signatures are preserved so callers (leaderboard, sessions) don't change.

Caveats vs. Redis:
  • State is per-process and lost on restart — fine for a short-TTL leaderboard
    cache, which is the only consumer.
  • In a multi-worker deployment each worker has its own cache. Acceptable for
    now; revisit if we scale horizontally.
"""

import time
from threading import Lock

# key -> (expires_at_epoch_seconds, value)
_store: dict[str, tuple[float, object]] = {}
_lock = Lock()


async def cache_get(key: str) -> dict | list | None:
    """Get a cached value by key. Returns None on miss or if expired."""
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at < time.time():
            # Lazily evict expired entries on access.
            _store.pop(key, None)
            return None
        return value


async def cache_set(key: str, value: dict | list, ttl_seconds: int = 300) -> None:
    """Set a cached value with a TTL (time-to-live in seconds)."""
    with _lock:
        _store[key] = (time.time() + ttl_seconds, value)


async def cache_delete(pattern: str) -> None:
    """Delete cache keys.

    Supports a single trailing "*" as a prefix wildcard (e.g. "lb:*" deletes
    every key starting with "lb:"). Without a wildcard, deletes the exact key.
    """
    with _lock:
        if pattern.endswith("*"):
            prefix = pattern[:-1]
            for key in [k for k in _store if k.startswith(prefix)]:
                _store.pop(key, None)
        else:
            _store.pop(pattern, None)


async def rate_limit_ok(key: str, cooldown_seconds: int) -> bool:
    """Lightweight per-process cooldown gate for spam-prone actions.

    Returns True and arms the cooldown if the action is allowed right now;
    returns False if the same `key` fired within the last `cooldown_seconds`.
    Used to de-dupe nudges and friend requests (per-user-per-target). Like the
    rest of this module the state is per-process and lost on restart — fine for
    cheap anti-spam, where the worst case is a slightly more permissive window.
    """
    now = time.time()
    with _lock:
        entry = _store.get(key)
        if entry is not None:
            expires_at, _ = entry
            if expires_at > now:
                return False  # still in cooldown
        _store[key] = (now + cooldown_seconds, True)
        return True


async def check_cache_health() -> bool:
    """Health check — the in-process cache is always available."""
    return True


# Backwards-compatible alias: main.py historically imported check_redis_health.
# Kept so nothing crashes; the in-process cache is always healthy.
async def check_redis_health() -> bool:
    return True
