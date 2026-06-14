"""Paylasilan enum'lar.

Hem SQLAlchemy modelleri (main.py) hem Pydantic semalari tarafindan kullanilir.
Ayri modulde tutulur ki sema ayiklamasinda main<->schemas dongusel importu
olusmasin. main.py bunlari tekrar export eder (geriye donuk uyumluluk:
`from .main import Role` calismaya devam eder).
"""

from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    superadmin = "superadmin"
    admin = "admin"


class CertStatus(str, Enum):
    active = "active"
    revoked = "revoked"
    expired = "expired"


class TxType(str, Enum):
    credit = "credit"
    spend = "spend"


class OrderStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class AttendeeSource(str, Enum):
    import_ = "import"
    self_register = "self_register"


__all__ = ["Role", "CertStatus", "TxType", "OrderStatus", "AttendeeSource"]
