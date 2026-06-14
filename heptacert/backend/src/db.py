"""Veritabani altyapisi: engine, session factory, declarative Base, get_db.

main.py'dan ayiklandi (god-dosya bolme, Adim 4). main.py bunlari tekrar export
eder; mevcut `from .main import Base/engine/SessionLocal/get_db` kullanimlari
(18 dosya) etkilenmez.

ONEMLI: TUM SQLAlchemy modelleri ayni `Base.registry`'sini paylasmali (iliski
cozumu icin). Bu yuzden tek `Base` burada tanimli; modeller (main.py + *_models.py)
hep bu Base'i kullanir.
"""

from __future__ import annotations

from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

engine_options: Dict[str, Any] = {"pool_pre_ping": True}
if not settings.database_url.lower().startswith("sqlite"):
    engine_options.update(
        pool_size=max(1, settings.db_pool_size),
        max_overflow=max(0, settings.db_pool_max_overflow),
        pool_timeout=max(1, settings.db_pool_timeout),
        pool_recycle=max(60, settings.db_pool_recycle),
    )
engine = create_async_engine(settings.database_url, **engine_options)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


__all__ = ["engine", "engine_options", "SessionLocal", "Base", "get_db"]
