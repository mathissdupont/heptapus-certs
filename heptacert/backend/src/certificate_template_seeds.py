"""
Certificate template preset seeds.

Run directly to insert built-in template presets into the database:
    python -m src.certificate_template_seeds

Or call seed_builtin_presets(db, base_url) from a startup hook.

base_url should be the public frontend origin, e.g. "https://app.heptacert.com"
so that template SVG assets resolve correctly.
"""

import asyncio
import os
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# ---------------------------------------------------------------------------
# Template definitions
# Each entry maps to one CertificateTemplatePreset row.
# `image_path` is relative to /public (served by Next.js as static asset).
# ---------------------------------------------------------------------------

BUILTIN_TEMPLATES: list[dict] = [
    {
        "slug": "builtin-klasik-altin",
        "name": "Klasik Altın",
        "image_path": "/templates/certificates/klasik-altin.svg",
        "min_plan": "growth",
        "enterprise_locked": False,
        "config": {
            "image_width": 1240,
            "image_height": 877,
            "certificate_footer": "",
            "name": {
                "x": 620,
                "y": 438,
                "font_size": 52,
                "font_color": "#3D2B0A",
                "font_weight": "bold",
                "font_style": "normal",
                "text_align": "center",
                "show": True,
            },
            "cert_id": {
                "x": 580,
                "y": 800,
                "font_size": 12,
                "font_color": "#8B6914",
                "font_weight": "normal",
                "font_style": "normal",
                "text_align": "left",
                "show": True,
            },
            "qr": {"x": 80, "y": 700, "size": 115, "show": True},
        },
    },
    {
        "slug": "builtin-minimalist-beyaz",
        "name": "Minimalist Beyaz",
        "image_path": "/templates/certificates/minimalist-beyaz.svg",
        "min_plan": "growth",
        "enterprise_locked": False,
        "config": {
            "image_width": 1240,
            "image_height": 877,
            "certificate_footer": "",
            "name": {
                "x": 90,
                "y": 420,
                "font_size": 56,
                "font_color": "#0F172A",
                "font_weight": "bold",
                "font_style": "normal",
                "text_align": "left",
                "show": True,
            },
            "cert_id": {
                "x": 300,
                "y": 800,
                "font_size": 11,
                "font_color": "#94A3B8",
                "font_weight": "normal",
                "font_style": "normal",
                "text_align": "left",
                "show": True,
            },
            "qr": {"x": 90, "y": 720, "size": 110, "show": True},
        },
    },
    {
        "slug": "builtin-kurumsal-mavi",
        "name": "Kurumsal Mavi",
        "image_path": "/templates/certificates/kurumsal-mavi.svg",
        "min_plan": "growth",
        "enterprise_locked": False,
        "config": {
            "image_width": 1240,
            "image_height": 877,
            "certificate_footer": "",
            "name": {
                "x": 620,
                "y": 438,
                "font_size": 50,
                "font_color": "#0F172A",
                "font_weight": "bold",
                "font_style": "normal",
                "text_align": "center",
                "show": True,
            },
            "cert_id": {
                "x": 620,
                "y": 856,
                "font_size": 11,
                "font_color": "#93C5FD",
                "font_weight": "normal",
                "font_style": "normal",
                "text_align": "center",
                "show": True,
            },
            "qr": {"x": 80, "y": 738, "size": 100, "show": True},
        },
    },
    {
        "slug": "builtin-akademik",
        "name": "Akademik Diploma",
        "image_path": "/templates/certificates/akademik.svg",
        "min_plan": "growth",
        "enterprise_locked": False,
        "config": {
            "image_width": 1240,
            "image_height": 877,
            "certificate_footer": "",
            "name": {
                "x": 620,
                "y": 440,
                "font_size": 48,
                "font_color": "#3D2B1F",
                "font_weight": "bold",
                "font_style": "italic",
                "text_align": "center",
                "show": True,
            },
            "cert_id": {
                "x": 480,
                "y": 847,
                "font_size": 11,
                "font_color": "#8B6914",
                "font_weight": "normal",
                "font_style": "normal",
                "text_align": "left",
                "show": True,
            },
            "qr": {"x": 80, "y": 756, "size": 95, "show": True},
        },
    },
    {
        "slug": "builtin-modern-gradyan",
        "name": "Modern Gradyan",
        "image_path": "/templates/certificates/modern-gradyan.svg",
        "min_plan": "enterprise",
        "enterprise_locked": False,
        "config": {
            "image_width": 1240,
            "image_height": 877,
            "certificate_footer": "",
            "name": {
                "x": 620,
                "y": 438,
                "font_size": 52,
                "font_color": "#1E1B4B",
                "font_weight": "bold",
                "font_style": "normal",
                "text_align": "center",
                "show": True,
            },
            "cert_id": {
                "x": 620,
                "y": 788,
                "font_size": 11,
                "font_color": "#7C3AED",
                "font_weight": "normal",
                "font_style": "normal",
                "text_align": "center",
                "show": True,
            },
            "qr": {"x": 100, "y": 766, "size": 90, "show": True},
        },
    },
    {
        "slug": "builtin-zumrut-yesil",
        "name": "Zümrüt Yeşil",
        "image_path": "/templates/certificates/zumrut-yesil.svg",
        "min_plan": "growth",
        "enterprise_locked": False,
        "config": {
            "image_width": 1240,
            "image_height": 877,
            "certificate_footer": "",
            "name": {
                "x": 620,
                "y": 438,
                "font_size": 50,
                "font_color": "#064E3B",
                "font_weight": "bold",
                "font_style": "normal",
                "text_align": "center",
                "show": True,
            },
            "cert_id": {
                "x": 620,
                "y": 826,
                "font_size": 11,
                "font_color": "#10B981",
                "font_weight": "normal",
                "font_style": "normal",
                "text_align": "center",
                "show": True,
            },
            "qr": {"x": 80, "y": 760, "size": 95, "show": True},
        },
    },
]


async def seed_builtin_presets(db: AsyncSession, base_url: str = "") -> int:
    """
    Insert built-in certificate template presets if they don't exist yet.
    Uses slug as a stable identity key (stored in the preset id field as
    a prefixed UUID-like string so existing rows are detected).

    Returns the number of rows actually inserted.
    """
    # Import here to avoid circular imports when called from main
    from .main import CertificateTemplatePreset, CertificateTemplatePresetVersion  # noqa: PLC0415

    inserted = 0
    for tmpl in BUILTIN_TEMPLATES:
        # Check if already seeded (id prefix match)
        existing = (
            await db.execute(
                select(CertificateTemplatePreset).where(
                    CertificateTemplatePreset.id.like(f"builtin-{tmpl['slug'].split('-', 1)[-1]}%")
                    if tmpl["slug"].startswith("builtin-")
                    else CertificateTemplatePreset.id == tmpl["slug"]
                )
            )
        ).scalar_one_or_none()

        if existing:
            continue

        now = datetime.now(timezone.utc)
        preset_id = tmpl["slug"]  # stable, human-readable ID for builtins

        config_with_bg = {
            **tmpl["config"],
            "background_image": f"{base_url}{tmpl['image_path']}",
        }

        preset = CertificateTemplatePreset(
            id=preset_id,
            scope_type="builtin",
            scope_id=0,  # 0 = platform-wide, not org-specific
            name=tmpl["name"],
            template_image_url=f"{base_url}{tmpl['image_path']}",
            config=config_with_bg,
            min_plan=tmpl["min_plan"],
            enterprise_locked=tmpl["enterprise_locked"],
            version=1,
            locked_by=None,
            created_at=now,
            updated_at=now,
        )
        db.add(preset)

        # Also create version record
        version = CertificateTemplatePresetVersion(
            preset_id=preset_id,
            version=1,
            template_image_url=f"{base_url}{tmpl['image_path']}",
            config=config_with_bg,
            created_by=None,
            created_at=now,
        )
        db.add(version)
        inserted += 1

    if inserted:
        await db.commit()

    return inserted


# ---------------------------------------------------------------------------
# Standalone runner
# ---------------------------------------------------------------------------

async def _main() -> None:
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/heptacert",
    )
    base_url = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000")

    engine = create_async_engine(db_url, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        count = await seed_builtin_presets(db, base_url)
        print(f"Seeded {count} certificate template preset(s).")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
