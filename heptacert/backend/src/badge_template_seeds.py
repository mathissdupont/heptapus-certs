"""
Built-in badge template presets.

These are platform-level badge definitions that organizers can apply to
their events as starting points. They are NOT automatically inserted into
every event — organizers pick them via the Gamification UI.

Usage (standalone):
    python -m src.badge_template_seeds

Or import BUILTIN_BADGE_TEMPLATES and use it in the frontend API to serve
a "template gallery" endpoint.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Badge template definitions
# ---------------------------------------------------------------------------
# Each entry represents one badge definition a user can apply to an event.
# `criteria` keys must match CriteriaDef keys in the gamification frontend:
#   - min_sessions        : int  — minimum number of sessions with check-in
#   - attendance_rate     : int  — 0-100 percentage of sessions attended
#   - registered_rank_max : int  — must be among first N registrants
#   - survey_completed    : bool — must have completed the survey
#   - can_download_cert   : bool — must have certificate download permission
# ---------------------------------------------------------------------------

BUILTIN_BADGE_TEMPLATES: list[dict[str, Any]] = [
    # ── Erken Kuş ────────────────────────────────────────────────────────────
    {
        "slug": "erken-kus",
        "type": "erken_kus",
        "name_tr": "Erken Kuş",
        "name_en": "Early Bird",
        "description_tr": "Etkinliğe ilk 50 kayıt arasında bulunan katılımcılara verilir.",
        "description_en": "Awarded to participants who are among the first 50 registrants.",
        "color_hex": "#F59E0B",
        "icon_emoji": "🐦",
        "criteria": {
            "registered_rank_max": 50,
        },
        "notes_tr": "Kapasiteye göre sayıyı (50) düşürebilir veya artırabilirsiniz.",
        "notes_en": "You can lower or raise the count (50) depending on event capacity.",
    },
    # ── Tam Katılım ──────────────────────────────────────────────────────────
    {
        "slug": "tam-katilim",
        "type": "tam_katilim",
        "name_tr": "Tam Katılım",
        "name_en": "Full Attendance",
        "description_tr": "Tüm oturumların %100'üne check-in yapan katılımcılara verilir.",
        "description_en": "Awarded to participants who checked in to 100% of all sessions.",
        "color_hex": "#10B981",
        "icon_emoji": "🏆",
        "criteria": {
            "attendance_rate": 100,
        },
        "notes_tr": "Kısmen katılımcıları da dahil etmek istiyorsanız oranı %80'e düşürün.",
        "notes_en": "Lower the rate to 80% if you want to include partial attendees.",
    },
    # ── Devamlılık Rozeti ────────────────────────────────────────────────────
    {
        "slug": "devamlilik",
        "type": "devamlilik",
        "name_tr": "Devamlılık Ödülü",
        "name_en": "Consistency Award",
        "description_tr": "En az 3 farklı oturuma check-in yapan katılımcılara verilir.",
        "description_en": "Awarded to participants who checked in to at least 3 sessions.",
        "color_hex": "#6366F1",
        "icon_emoji": "🎯",
        "criteria": {
            "min_sessions": 3,
        },
        "notes_tr": "Oturum sayısını etkinliğinizdeki toplam oturum sayısına göre ayarlayın.",
        "notes_en": "Adjust the session count based on total sessions in your event.",
    },
    # ── Anket Şampiyonu ──────────────────────────────────────────────────────
    {
        "slug": "anket-sampiyonu",
        "type": "anket_sampiyonu",
        "name_tr": "Anket Şampiyonu",
        "name_en": "Survey Champion",
        "description_tr": "Etkinlik anketini eksiksiz dolduran katılımcılara verilir.",
        "description_en": "Awarded to participants who completed the event survey.",
        "color_hex": "#3B82F6",
        "icon_emoji": "📝",
        "criteria": {
            "survey_completed": True,
        },
        "notes_tr": "Sertifika koşuluna anket zorunluluğu eklediyseniz bu rozeti de tanımlayın.",
        "notes_en": "Define this badge alongside any survey requirement on certificate criteria.",
    },
    # ── Yıldız Katılımcı ─────────────────────────────────────────────────────
    {
        "slug": "yildiz-katilimci",
        "type": "yildiz_katilimci",
        "name_tr": "Yıldız Katılımcı",
        "name_en": "Star Attendee",
        "description_tr": "Oturumların en az %80'ine katılan ve anketi tamamlayan kişilere verilir.",
        "description_en": "Awarded to those who attended at least 80% of sessions and completed the survey.",
        "color_hex": "#EAB308",
        "icon_emoji": "⭐",
        "criteria": {
            "attendance_rate": 80,
            "survey_completed": True,
        },
        "notes_tr": "İki kriter bir arada — katılım oranı yüksek ve geri bildirim veren kişiler.",
        "notes_en": "Two criteria combined — high attendance and feedback givers.",
    },
    # ── Sertifika Sahibi ─────────────────────────────────────────────────────
    {
        "slug": "sertifika-sahibi",
        "type": "sertifika_sahibi",
        "name_tr": "Sertifika Sahibi",
        "name_en": "Certificate Holder",
        "description_tr": "Sertifika indirme yetkisi kazanan katılımcılara otomatik verilir.",
        "description_en": "Automatically awarded when a participant earns certificate download permission.",
        "color_hex": "#8B5CF6",
        "icon_emoji": "🎓",
        "criteria": {
            "can_download_cert": True,
        },
        "notes_tr": "Sertifika koşullarını karşılayan herkesi görsel olarak öne çıkarmak için idealdir.",
        "notes_en": "Ideal for visually highlighting all participants who met certificate conditions.",
    },
    # ── Mükemmellik ──────────────────────────────────────────────────────────
    {
        "slug": "mukemmellik",
        "type": "mukemmellik",
        "name_tr": "Mükemmellik Rozeti",
        "name_en": "Excellence Badge",
        "description_tr": "Tüm koşulları sağlayan; tam katılım, anket ve sertifika sahibi katılımcılara.",
        "description_en": "For participants who satisfy all conditions: full attendance, survey, and certificate.",
        "color_hex": "#EC4899",
        "icon_emoji": "💎",
        "criteria": {
            "attendance_rate": 90,
            "survey_completed": True,
            "can_download_cert": True,
        },
        "notes_tr": "En değerli katılımcıları ayırt etmek için kullanın. Sayı az olacaktır.",
        "notes_en": "Use to distinguish top participants. Numbers will be low by design.",
    },
]


# ---------------------------------------------------------------------------
# Alembic / startup seed helper  (optional — badges are event-level, not global)
# ---------------------------------------------------------------------------

async def get_builtin_badge_templates(lang: str = "tr") -> list[dict[str, Any]]:
    """
    Return badge template list in the requested language.
    Used by an API endpoint so organizers can pick from a gallery.
    """
    result = []
    for t in BUILTIN_BADGE_TEMPLATES:
        name_key = "name_tr" if lang == "tr" else "name_en"
        desc_key = "description_tr" if lang == "tr" else "description_en"
        notes_key = "notes_tr" if lang == "tr" else "notes_en"
        result.append(
            {
                "slug": t["slug"],
                "type": t["type"],
                "name": t[name_key],
                "description": t[desc_key],
                "color_hex": t["color_hex"],
                "icon_emoji": t["icon_emoji"],
                "criteria": t["criteria"],
                "notes": t[notes_key],
            }
        )
    return result


# ---------------------------------------------------------------------------
# Standalone runner — prints the template gallery
# ---------------------------------------------------------------------------

async def _main() -> None:
    import json

    lang = os.environ.get("LANG_CODE", "tr")
    templates = await get_builtin_badge_templates(lang)
    print(json.dumps(templates, ensure_ascii=False, indent=2))
    print(f"\nTotal: {len(templates)} badge templates")


if __name__ == "__main__":
    asyncio.run(_main())
