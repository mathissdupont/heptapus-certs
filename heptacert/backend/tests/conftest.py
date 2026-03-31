"""
Shared test fixtures for HeptaCert backend tests.
Uses SQLite in-memory for DB tests (no PostgreSQL dependency in CI).
"""
import os
from unittest.mock import patch

import pytest
import pytest_asyncio

# ── Set test env vars BEFORE any app imports ──────────────────────────────────
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-32chars-minimum!!")
os.environ.setdefault("EMAIL_TOKEN_SECRET", "test-email-token-secret")
os.environ.setdefault("BOOTSTRAP_SUPERADMIN_EMAIL", "super@test.com")
os.environ.setdefault("BOOTSTRAP_SUPERADMIN_PASSWORD", "SuperPass123!")
os.environ.setdefault("PUBLIC_BASE_URL", "http://localhost:8000")
os.environ.setdefault("FRONTEND_BASE_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "*")
os.environ.setdefault("STORAGE_MODE", "local")
os.environ.setdefault("LOCAL_STORAGE_DIR", "/tmp/heptacert_test")

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all database tables before the test session begins."""
    from src.main import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
