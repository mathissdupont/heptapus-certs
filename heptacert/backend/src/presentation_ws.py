"""WebSocket transport for live presentation control.

The HTTP session endpoints stay as a fallback. This channel is for low-latency
stage updates, especially laser pointer movement, without turning every pointer
move into a REST request.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from .main import get_db
from .presentation_api import (
    _get_presentation_session_state,
    _public_control_deck,
    _store_presentation_slide_state,
)

router = APIRouter(prefix="/api/public/presentations", tags=["public-presentations"])


class PresentationConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[int, set[WebSocket]] = {}

    async def connect(self, deck_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms.setdefault(deck_id, set()).add(websocket)

    def disconnect(self, deck_id: int, websocket: WebSocket) -> None:
        room = self._rooms.get(deck_id)
        if not room:
            return
        room.discard(websocket)
        if not room:
            self._rooms.pop(deck_id, None)

    async def broadcast(self, deck_id: int, payload: dict[str, Any]) -> None:
        room = list(self._rooms.get(deck_id, set()))
        stale: list[WebSocket] = []
        for websocket in room:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(deck_id, websocket)


manager = PresentationConnectionManager()


def _state_payload(state: Any, event: str = "state") -> dict[str, Any]:
    return {
        "event": event,
        "slide_index": int(state.slide_index or 0),
        "pointer_active": bool(state.pointer_active or False),
        "pointer_x": state.pointer_x,
        "pointer_y": state.pointer_y,
        "updated_at": state.updated_at.isoformat() if isinstance(state.updated_at, datetime) else datetime.now(timezone.utc).isoformat(),
    }


def _pointer_payload(base_state: Any, message: dict[str, Any]) -> dict[str, Any]:
    active = bool(message.get("pointer_active") or False)
    pointer_x = message.get("pointer_x")
    pointer_y = message.get("pointer_y")
    if active and not isinstance(pointer_x, (int, float)):
        active = False
        pointer_x = None
        pointer_y = None
    if active and not isinstance(pointer_y, (int, float)):
        active = False
        pointer_x = None
        pointer_y = None
    if not active:
        pointer_x = None
        pointer_y = None
    return {
        "event": "pointer",
        "slide_index": int(base_state.slide_index or 0),
        "pointer_active": active,
        "pointer_x": max(0, min(1, float(pointer_x))) if active else None,
        "pointer_y": max(0, min(1, float(pointer_y))) if active else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.websocket("/control/{token}/ws")
async def presentation_control_ws(
    websocket: WebSocket,
    token: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    deck = await _public_control_deck(db, token)
    deck_id = int(deck["id"])
    await manager.connect(deck_id, websocket)
    try:
        current = await _get_presentation_session_state(deck_id)
        await websocket.send_json(_state_payload(current, "state"))
        while True:
            message = await websocket.receive_json()
            if not isinstance(message, dict):
                continue

            if "slide_index" in message:
                try:
                    slide_index = max(0, min(500, int(message.get("slide_index") or 0)))
                except (TypeError, ValueError):
                    continue
                state = await _store_presentation_slide_state(deck_id, slide_index)
                await manager.broadcast(deck_id, _state_payload(state, "slide"))
                continue

            if "pointer_active" in message:
                state = await _get_presentation_session_state(deck_id)
                await manager.broadcast(deck_id, _pointer_payload(state, message))
    except WebSocketDisconnect:
        manager.disconnect(deck_id, websocket)
    except Exception:
        manager.disconnect(deck_id, websocket)
        await websocket.close()
