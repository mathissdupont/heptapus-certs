"""PowerPoint to PDF conversion helpers for uploaded event presentations."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from .config import settings


POWERPOINT_SUFFIXES = {".ppt", ".pptx"}


class PresentationConversionError(RuntimeError):
    pass


def is_powerpoint_path(value: str | None) -> bool:
    return Path(value or "").suffix.lower() in POWERPOINT_SUFFIXES


def convert_powerpoint_to_pdf(source_rel_path: str, output_rel_path: str) -> str:
    storage_root = Path(settings.local_storage_dir).resolve()
    source_path = (storage_root / source_rel_path).resolve()
    output_path = (storage_root / output_rel_path).resolve()

    if not source_path.is_relative_to(storage_root) or not output_path.is_relative_to(storage_root):
        raise PresentationConversionError("Presentation path escapes storage root")
    if not source_path.exists():
        raise PresentationConversionError("Presentation source file was not found")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="heptadeck-", dir=str(output_path.parent)) as tmp_dir:
        profile_dir = Path(tmp_dir) / "profile"
        profile_dir.mkdir(parents=True, exist_ok=True)
        env = os.environ.copy()
        env["HOME"] = str(profile_dir)
        cmd = [
            settings.soffice_bin,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            f"-env:UserInstallation=file://{profile_dir.as_posix()}",
            "--convert-to",
            "pdf",
            "--outdir",
            tmp_dir,
            str(source_path),
        ]
        completed = subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            env=env,
            text=True,
            timeout=settings.presentation_converter_timeout_seconds,
        )
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout or "LibreOffice conversion failed").strip()
            raise PresentationConversionError(detail[:1000])

        candidates = sorted(Path(tmp_dir).glob("*.pdf"))
        if not candidates:
            raise PresentationConversionError("LibreOffice did not produce a PDF")
        shutil.move(str(candidates[0]), str(output_path))
    return output_rel_path
