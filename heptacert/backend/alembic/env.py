"""Alembic migration environment – synchronous (psycopg2) runner."""
from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add src/ to path so models can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:
    from src.main import Base  # noqa: E402
    target_metadata = Base.metadata
except Exception:
    # Fallback: create a bare metadata so alembic can still run migrations
    from sqlalchemy import MetaData
    target_metadata = MetaData()

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Allow ALEMBIC_DATABASE_URL env var to override alembic.ini.
# Normalize plain postgresql:// URLs so Alembic uses psycopg consistently.
_db_url = os.environ.get("ALEMBIC_DATABASE_URL") or config.get_main_option("sqlalchemy.url")
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
if _db_url:
    config.set_main_option("sqlalchemy.url", _db_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
