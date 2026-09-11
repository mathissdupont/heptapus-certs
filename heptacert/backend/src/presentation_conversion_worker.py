"""Worker loop for converting uploaded PowerPoint presentations to PDF."""

from __future__ import annotations

import asyncio
import logging
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import or_, select

from .config import settings
from .db import SessionLocal
# The worker is a standalone process, so importing PresentationDeck alone does
# not register the tables targeted by its foreign keys (users, events and
# organizations) in Base.metadata. SQLAlchemy resolves those targets during an
# ORM flush; without this import every claimed job crashes with
# NoReferencedTableError before conversion starts.
from . import models as _core_models  # noqa: F401
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
                    PresentationDeck.conversion_attempts < settings.presentation_conversion_max_attempts,
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


async def _recover_stale_decks() -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.presentation_conversion_stale_seconds)
    recovered = 0
    async with SessionLocal() as db:
        decks = (
            await db.execute(
                select(PresentationDeck).where(
                    PresentationDeck.conversion_status == "processing",
                    PresentationDeck.updated_at < cutoff,
                )
            )
        ).scalars().all()
        for deck in decks:
            attempts = deck.conversion_attempts or 0
            if attempts >= settings.presentation_conversion_max_attempts:
                deck.conversion_status = "failed"
                deck.status = "failed"
                deck.conversion_error = "Presentation conversion timed out after the maximum number of attempts"
            else:
                deck.conversion_status = "queued"
                deck.status = "processing"
                deck.conversion_error = "Previous conversion attempt timed out; queued for retry"
            deck.updated_at = datetime.now(timezone.utc)
            recovered += 1
        if recovered:
            await db.commit()
    return recovered


async def _mark_deck(deck_id: int, **updates: object) -> None:
    async with SessionLocal() as db:
        deck = await db.get(PresentationDeck, deck_id)
        if not deck:
            return
        for key, value in updates.items():
            setattr(deck, key, value)
        deck.updated_at = datetime.now(timezone.utc)
        await db.commit()


async def _mark_conversion_failure(deck_id: int, error: str) -> None:
    async with SessionLocal() as db:
        deck = await db.get(PresentationDeck, deck_id)
        if not deck:
            return
        exhausted = (deck.conversion_attempts or 0) >= settings.presentation_conversion_max_attempts
        deck.conversion_status = "failed" if exhausted else "queued"
        deck.status = "failed" if exhausted else "processing"
        deck.conversion_error = error[:2000]
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
        await _mark_conversion_failure(deck_id, str(exc))
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
        recovered = await _recover_stale_decks()
        if recovered:
            logger.warning("Recovered %s stale presentation conversion job(s)", recovered)
        deck_id = await _claim_next_deck()
        if deck_id is None:
            await asyncio.sleep(settings.presentation_converter_interval_seconds)
            continue
        await _process_deck(deck_id)


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
