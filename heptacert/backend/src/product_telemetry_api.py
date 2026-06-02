"""Privacy-safe product telemetry endpoints."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import CurrentUser, ProductTelemetryEvent, Role, get_current_user, get_db, require_role
from .product_telemetry import ALLOWED_EVENTS, sanitize_metadata

router = APIRouter()


class ProductTelemetryIn(BaseModel):
    event_name: str = Field(min_length=2, max_length=80)
    feature_key: str = Field(min_length=2, max_length=80)
    resource_type: Optional[str] = Field(default=None, max_length=64)
    resource_id: Optional[str] = Field(default=None, max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.post("/api/admin/product-telemetry")
async def record_product_telemetry(
    payload: ProductTelemetryIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event_name = payload.event_name.strip()
    if event_name not in ALLOWED_EVENTS:
        return {"ok": False, "reason": "unsupported_event"}
    db.add(
        ProductTelemetryEvent(
            user_id=me.id,
            event_name=event_name,
            feature_key=payload.feature_key.strip()[:80],
            resource_type=(payload.resource_type or "")[:64] or None,
            resource_id=(payload.resource_id or "")[:80] or None,
            metadata_json=sanitize_metadata(payload.metadata),
            user_agent=request.headers.get("user-agent"),
        )
    )
    await db.commit()
    return {"ok": True}


@router.get("/api/superadmin/product-telemetry/summary", dependencies=[Depends(require_role(Role.superadmin))])
async def product_telemetry_summary(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(ProductTelemetryEvent.feature_key, ProductTelemetryEvent.event_name, func.count(ProductTelemetryEvent.id))
            .group_by(ProductTelemetryEvent.feature_key, ProductTelemetryEvent.event_name)
            .order_by(func.count(ProductTelemetryEvent.id).desc())
            .limit(40)
        )
    ).all()
    return [
        {"feature_key": feature_key, "event_name": event_name, "count": int(count or 0)}
        for feature_key, event_name, count in rows
    ]
