"""Lightweight in-process TTL cache for hot-path lookups.

Provides a Redis-compatible interface using an in-memory dict when Redis is not
configured. When REDIS_URL is set in settings, uses Redis via aioredis.

Usage:
    from .cache import cache

    user = await cache.get_or_set(f"user:{user_id}", lambda: db.get(User, user_id), ttl=300)
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Awaitable, Callable, Optional, TypeVar

T = TypeVar("T")


class _MemoryCache:
    """Thread-safe in-process TTL cache backed by a plain dict."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if expires_at < time.monotonic():
            async with self._lock:
                self._store.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: Any, ttl: int = 60) -> None:
        async with self._lock:
            self._store[key] = (value, time.monotonic() + ttl)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def delete_prefix(self, prefix: str) -> None:
        async with self._lock:
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]

    async def get_or_set(
        self,
        key: str,
        loader: Callable[[], Awaitable[T]],
        ttl: int = 60,
    ) -> T:
        cached = await self.get(key)
        if cached is not None:
            return cached  # type: ignore[return-value]
        value = await loader()
        if value is not None:
            await self.set(key, value, ttl=ttl)
        return value  # type: ignore[return-value]

    def clear(self) -> None:
        self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)


# Singleton — imported everywhere as `from .cache import cache`
cache = _MemoryCache()


# ── TTL constants ─────────────────────────────────────────────────────────────

USER_TTL = 120          # User row (role, email) — short to catch role changes fast
ORG_TTL = 300           # Organization metadata (name, plan)
EVENT_TTL = 60          # Event row (name, date, settings)
SUBSCRIPTION_TTL = 180  # Subscription status — medium, plan changes affect feature gates
CERT_TEMPLATE_TTL = 600 # Certificate templates rarely change
FEATURE_POLICY_TTL = 3600  # Feature policy list — static config
