"""Dialect-aware column types shared across models.

PostgreSQL'de native JSONB/INET kullanır; SQLite (testler) gibi diğer
dialect'lerde JSON/String'e düşer. Tüm model dosyaları ham
`sqlalchemy.dialects.postgresql.JSONB` yerine buradaki tipleri kullanmalı —
aksi halde SQLite tabanlı testlerde "can't render element of type JSONB"
hatası alınır (production davranışı PostgreSQL'de birebir aynı kalır).
"""

from __future__ import annotations

from sqlalchemy import JSON as _JSON, BigInteger, Integer, String
from sqlalchemy.dialects.postgresql import JSONB as _PgJSONB, INET as _PgINET

JSONB = _JSON().with_variant(_PgJSONB(), "postgresql")
INET = String(45).with_variant(_PgINET(), "postgresql")
# PostgreSQL'de BIGINT, SQLite'da INTEGER (autoincrement PK uyumlulugu icin)
BIGINT_PK = BigInteger().with_variant(Integer, "sqlite")

__all__ = ["JSONB", "INET", "BIGINT_PK"]
