"""Worker loop for converting uploaded PowerPoint presentations to PDF."""

from __future__ import annotations

import asyncio
import logging
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import or_, select

from .config import settings
from .db import SessionLocal
from .presentation_converter import PresentationConversionError, convert_powerpoint_to_pdf, is_powerpoint_path
from .presentation_models import PresentationDeck

logger = logging.getLogger("heptacert.presentation_conversion_worker")


def _converted_rel_path(deck: PresentationDeck) -> str:
    return f"presentations/events/event_{deck.event_id}/deck_{deck.id}.converted.pdf"


async def _claim_next_deck() -> int | None:
    async with SessionLocal() as db:
        async with db.begin():
            stmt = (
                select(PresentationDeck)
                .where(
                    PresentationDeck.conversion_status == "queued",
                    PresentationDeck.file_path.is_not(None),
                    or_(
                        PresentationDeck.file_filename.ilike("%.ppt"),
                        PresentationDeck.file_filename.ilike("%.pptx"),
                        PresentationDeck.file_path.ilike("%.ppt"),
                        PresentationDeck.file_path.ilike("%.pptx"),
                    ),
                )
                .order_by(PresentationDeck.updated_at.asc(), PresentationDeck.id.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            deck = (await db.execute(stmt)).scalars().first()
            if not deck:
                return None
            deck.conversion_status = "processing"
            deck.conversion_error = None
            deck.conversion_attempts = (deck.conversion_attempts or 0) + 1
            deck.updated_at = datetime.now(timezone.utc)
            return deck.id


async def _mark_deck(deck_id: int, **updates: object) -> None:
    async with SessionLocal() as db:
        deck = await db.get(PresentationDeck, deck_id)
        if not deck:
            return
        for key, value in updates.items():
            setattr(deck, key, value)
        deck.updated_at = datetime.now(timezone.utc)
        await db.commit()


async def _process_deck(deck_id: int) -> None:
    async with SessionLocal() as db:
        deck = await db.get(PresentationDeck, deck_id)
        if not deck or not deck.file_path:
            return
        if not is_powerpoint_path(deck.file_filename or deck.file_path):
            await _mark_deck(deck_id, conversion_status="not_required", status="ready")
            return
        output_rel_path = _converted_rel_path(deck)

    try:
        convert_powerpoint_to_pdf(deck.file_path, output_rel_path)
    except (PresentationConversionError, subprocess.TimeoutExpired, OSError) as exc:  # type: ignore[name-defined]
        logger.exception("Presentation conversion failed for deck %s", deck_id)
        await _mark_deck(
            deck_id,
            conversion_status="failed",
            conversion_error=str(exc)[:2000],
            status="failed",
        )
        return

    await _mark_deck(
        deck_id,
        converted_file_path=output_rel_path,
        converted_file_filename=f"{Path(deck.file_filename or f'presentation-{deck_id}').stem}.pdf",
        conversion_status="ready",
        conversion_error=None,
        status="ready",
    )
    logger.info("Converted presentation deck %s to PDF", deck_id)


async def run_worker() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    if not settings.presentation_converter_enabled:
        logger.info("Presentation converter worker is disabled")
        return
    logger.info("Presentation converter worker started")
    while True:
        deck_id = await _claim_next_deck()
        if deck_id is None:
            await asyncio.sleep(settings.presentation_converter_interval_seconds)
            continue
        await _process_deck(deck_id)


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
