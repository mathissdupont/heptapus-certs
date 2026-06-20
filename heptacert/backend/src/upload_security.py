"""Shared upload security helpers."""

from __future__ import annotations

import asyncio
import logging

from fastapi import HTTPException

from .config import settings

logger = logging.getLogger("heptacert.upload_security")


async def scan_upload_with_clamav(raw: bytes) -> None:
    if not settings.clamav_enabled:
        return
    try:
        reader, writer = await asyncio.open_connection(settings.clamav_host, settings.clamav_port)
        writer.write(b"zINSTREAM\0")
        await writer.drain()
        chunk_size = 1024 * 1024
        for idx in range(0, len(raw), chunk_size):
            chunk = raw[idx:idx + chunk_size]
            writer.write(len(chunk).to_bytes(4, "big") + chunk)
            await writer.drain()
        writer.write((0).to_bytes(4, "big"))
        await writer.drain()
        response = await asyncio.wait_for(reader.read(4096), timeout=15)
        writer.close()
        await writer.wait_closed()
        verdict = response.decode("utf-8", errors="ignore")
        if "FOUND" in verdict:
            raise HTTPException(status_code=400, detail="Uploaded file failed antivirus scan")
        if "OK" not in verdict:
            raise HTTPException(status_code=502, detail="Antivirus scan did not return a clean result")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("ClamAV scan failed: %s", exc)
        if settings.require_clamav:
            raise HTTPException(
                status_code=503,
                detail="Antivirus scan is required but temporarily unavailable. Please try again.",
            )
        logger.warning("ClamAV unavailable; REQUIRE_CLAMAV=false so upload proceeds without scan")
