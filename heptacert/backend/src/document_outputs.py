"""Official Heptapus/HeptaCert document rendering helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from html import escape
from pathlib import Path
import base64
import re
import textwrap
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_TEMPLATE_PATH = Path(__file__).resolve().parent / "document_templates" / "heptacert_document_template.html"
FRONTEND_TEMPLATE_PATH = PROJECT_ROOT / "frontend" / "public" / "heptacert_document_template.html"

PDF_WIDTH = 1240
PDF_HEIGHT = 1754
MM_TO_PX = PDF_WIDTH / 210


def _read_template(template_path: Path | None = None) -> str:
    paths = [template_path] if template_path else [BACKEND_TEMPLATE_PATH, FRONTEND_TEMPLATE_PATH]
    for path in paths:
        if path and path.exists():
            return path.read_text(encoding="utf-8")
    return _fallback_template()


def _fallback_template() -> str:
    return """<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>{{title}}</title>
  <style>
    body { font-family: "Times New Roman", Times, serif; margin: 32px; color: #111; }
    .meta-row { display: flex; justify-content: space-between; font-weight: 700; margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #222; padding: 6px; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f1f1f1; text-align: left; }
  </style>
</head>
<body>
  <h1>{{title}}</h1>
  <section class="meta-row">
    <div>Date: <span>{{date}}</span></div>
    <div>Document No: <span>{{documentNo}}</span></div>
  </section>
  {{bodyHtml}}
</body>
</html>"""


def _document_no(prefix: str = "HPT") -> str:
    now = datetime.now(timezone.utc)
    return f"{prefix}-{now:%Y%m%d-%H%M%S}"


def render_official_document_html(
    *,
    title: str,
    body_html: str,
    document_no: str | None = None,
    date_text: str | None = None,
    left_signer_name: str = "Heptapus Group",
    left_signer_title: str = "Authorized Unit",
    right_signer_name: str = "HeptaCert",
    right_signer_title: str = "System Record",
    template_path: Path | None = None,
) -> str:
    template = _read_template(template_path)
    replacements = {
        "title": escape(title),
        "date": escape(date_text or datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M UTC")),
        "documentNo": escape(document_no or _document_no()),
        "bodyHtml": body_html,
        "recipientName": "",
        "description": "",
        "leftSignerName": escape(left_signer_name),
        "leftSignerTitle": escape(left_signer_title),
        "rightSignerName": escape(right_signer_name),
        "rightSignerTitle": escape(right_signer_title),
    }
    rendered = template
    for key, value in replacements.items():
        rendered = rendered.replace("{{" + key + "}}", value)
    return rendered


def render_key_value_table(rows: Iterable[tuple[str, Any]]) -> str:
    body = "\n".join(
        f"<tr><th>{escape(str(key))}</th><td>{escape(_stringify(value))}</td></tr>"
        for key, value in rows
    )
    return f"<table><tbody>{body}</tbody></table>"


def render_records_table(records: list[dict[str, Any]], columns: list[str] | None = None) -> str:
    if not records:
        return "<p>No records found.</p>"
    resolved_columns = columns or list(records[0].keys())
    head = "".join(f"<th>{escape(str(column))}</th>" for column in resolved_columns)
    body_rows = []
    for record in records:
        cells = "".join(f"<td>{escape(_stringify(record.get(column, '')))}</td>" for column in resolved_columns)
        body_rows.append(f"<tr>{cells}</tr>")
    return f"<table><thead><tr>{head}</tr></thead><tbody>{''.join(body_rows)}</tbody></table>"


def render_log_document_body(
    *,
    summary: dict[str, Any] | None = None,
    records: list[dict[str, Any]] | None = None,
    columns: list[str] | None = None,
    intro: str | None = None,
) -> str:
    parts: list[str] = []
    if intro:
        parts.append(f"<p>{escape(intro)}</p>")
    if summary:
        parts.append("<h2>Summary</h2>")
        parts.append(render_key_value_table(summary.items()))
    if records is not None:
        parts.append("<h2>Records</h2>")
        parts.append(render_records_table(records, columns))
    return "\n".join(parts) or "<p>No content was generated for this document.</p>"


def render_log_document_pdf_bytes(
    *,
    title: str,
    summary: dict[str, Any] | None = None,
    records: list[dict[str, Any]] | None = None,
    columns: list[str] | None = None,
    intro: str | None = None,
    document_no: str | None = None,
    left_signer_name: str = "Heptapus Group",
    left_signer_title: str = "Authorized Unit",
    right_signer_name: str = "HeptaCert",
    right_signer_title: str = "System Record",
    template_path: Path | None = None,
) -> bytes:
    """Render official log/report content onto the letterhead template as PDF bytes."""
    from PIL import Image, ImageDraw

    template = _read_template(template_path)
    background = _template_background(template)
    fonts = _pdf_fonts()
    pages: list[Image.Image] = []

    text_lines = _build_pdf_lines(intro=intro, summary=summary, records=records or [], columns=columns)
    max_lines_per_page = 54
    chunks = [text_lines[i : i + max_lines_per_page] for i in range(0, len(text_lines), max_lines_per_page)] or [[]]
    doc_no = document_no or _document_no()
    date_text = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M UTC")

    for page_index, chunk in enumerate(chunks, start=1):
        page = background.copy()
        draw = ImageDraw.Draw(page)
        _draw_centered(draw, title, y=_mm(38), font=fonts["title"], fill=(17, 17, 17), max_width=PDF_WIDTH - _mm(50))
        draw.text((_mm(25), _mm(50)), f"Date: {date_text}", font=fonts["meta"], fill=(17, 17, 17))
        right_meta = f"Document No: {doc_no}"
        right_bbox = draw.textbbox((0, 0), right_meta, font=fonts["meta"])
        draw.text((PDF_WIDTH - _mm(25) - (right_bbox[2] - right_bbox[0]), _mm(50)), right_meta, font=fonts["meta"], fill=(17, 17, 17))

        y = _mm(72)
        for item in chunk:
            kind = item.get("kind")
            if kind == "heading":
                y += 8
                draw.text((_mm(25), y), item["text"], font=fonts["heading"], fill=(17, 17, 17))
                y += 32
            elif kind == "rule":
                draw.line((_mm(25), y, PDF_WIDTH - _mm(25), y), fill=(34, 34, 34), width=1)
                y += 10
            else:
                for visual_line in _wrap_text_to_pixels(draw, item["text"], fonts["body"], PDF_WIDTH - _mm(50)):
                    draw.text((_mm(25), y), visual_line, font=fonts["body"], fill=(17, 17, 17))
                    y += 22

        footer = f"Page {page_index}/{len(chunks)}"
        footer_bbox = draw.textbbox((0, 0), footer, font=fonts["small"])
        draw.text((PDF_WIDTH - _mm(25) - (footer_bbox[2] - footer_bbox[0]), PDF_HEIGHT - _mm(24)), footer, font=fonts["small"], fill=(70, 70, 70))
        _draw_signature(draw, _mm(25), PDF_HEIGHT - _mm(43), left_signer_name, left_signer_title, fonts)
        _draw_signature(draw, PDF_WIDTH - _mm(25) - _mm(60), PDF_HEIGHT - _mm(43), right_signer_name, right_signer_title, fonts)
        pages.append(page.convert("RGB"))

    buffer = BytesIO()
    first, rest = pages[0], pages[1:]
    first.save(buffer, format="PDF", resolution=150.0, save_all=True, append_images=rest)
    return buffer.getvalue()


def _template_background(template: str) -> Any:
    from PIL import Image

    match = re.search(r"background-image:\s*url\(\"data:image/png;base64,([^\"]+)\"\)", template)
    if match:
        try:
            raw = base64.b64decode(match.group(1))
            image = Image.open(BytesIO(raw)).convert("RGB")
            return image.resize((PDF_WIDTH, PDF_HEIGHT), Image.Resampling.LANCZOS)
        except Exception:
            pass
    return Image.new("RGB", (PDF_WIDTH, PDF_HEIGHT), "white")


def _pdf_fonts() -> dict[str, Any]:
    from PIL import ImageFont

    candidates = [
        Path("C:/Windows/Fonts/times.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"),
    ]
    bold_candidates = [
        Path("C:/Windows/Fonts/timesbd.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
    ]
    regular = next((p for p in candidates if p.exists()), None)
    bold = next((p for p in bold_candidates if p.exists()), regular)

    def font(path: Path | None, size: int) -> Any:
        if path:
            return ImageFont.truetype(str(path), size=size)
        return ImageFont.load_default()

    return {
        "title": font(bold, 34),
        "meta": font(bold, 21),
        "heading": font(bold, 25),
        "body": font(regular, 18),
        "small": font(regular, 17),
        "signature": font(bold, 20),
        "signature_title": font(regular, 18),
    }


def _build_pdf_lines(
    *,
    intro: str | None,
    summary: dict[str, Any] | None,
    records: list[dict[str, Any]],
    columns: list[str] | None,
) -> list[dict[str, str]]:
    lines: list[dict[str, str]] = []
    if intro:
        for line in _wrap_pdf_text(intro, width=96):
            lines.append({"kind": "text", "text": line})
        lines.append({"kind": "rule", "text": ""})
    if summary:
        lines.append({"kind": "heading", "text": "Summary"})
        for key, value in summary.items():
            for line in _wrap_pdf_text(f"{key}: {_stringify(value)}", width=82):
                lines.append({"kind": "text", "text": line})
        lines.append({"kind": "rule", "text": ""})
    lines.append({"kind": "heading", "text": "Records"})
    if not records:
        lines.append({"kind": "text", "text": "No records found."})
        return lines
    resolved_columns = columns or ["id", "created_at", "user_email", "action", "resource_type", "resource_id", "ip_address", "details"]
    for index, record in enumerate(records[:500], start=1):
        for line in _wrap_pdf_text(f"{index}. {_record_summary(record, resolved_columns)}", width=84):
            lines.append({"kind": "text", "text": line})
        extra_summary = _extra_summary(record.get("extra"))
        if extra_summary:
            for line in _wrap_pdf_text("Details: " + extra_summary, width=78)[:3]:
                lines.append({"kind": "text", "text": "   " + line})
    if len(records) > 500:
        lines.append({"kind": "text", "text": f"... {len(records) - 500} additional records are available in the CSV export."})
    return lines


def _wrap_pdf_text(text: str, width: int) -> list[str]:
    return textwrap.wrap(str(text), width=width, replace_whitespace=False, drop_whitespace=True) or [""]


def _wrap_text_to_pixels(draw: Any, text: str, font: Any, max_width: int) -> list[str]:
    lines: list[str] = []
    for source_line in str(text).splitlines() or [""]:
        current = ""
        for token in _split_wrappable_tokens(source_line):
            candidate = f"{current}{token}" if current else token.lstrip()
            bbox = draw.textbbox((0, 0), candidate, font=font)
            if bbox[2] - bbox[0] <= max_width or not current:
                current = candidate
            else:
                lines.append(current.rstrip())
                current = token.lstrip()
        if current:
            lines.append(current.rstrip())
    return lines or [""]


def _split_wrappable_tokens(text: str) -> list[str]:
    tokens = re.findall(r"\S+\s*", text)
    expanded: list[str] = []
    for token in tokens:
        if len(token) <= 42:
            expanded.append(token)
            continue
        expanded.extend(token[i : i + 42] for i in range(0, len(token), 42))
    return expanded


def _record_summary(record: dict[str, Any], columns: list[str]) -> str:
    labels = {
        "id": "ID",
        "created_at": "Date",
        "user_email": "User",
        "action": "Action",
        "resource_type": "Resource",
        "resource_id": "Resource ID",
        "ip_address": "IP",
        "details": "Result",
    }
    parts: list[str] = []
    for column in columns:
        value = _stringify(record.get(column, "")).strip()
        if not value or column == "extra":
            continue
        if column == "created_at":
            value = _format_timestamp(value)
        parts.append(f"{labels.get(column, column)}: {_shorten(value, 96)}")
    return " | ".join(parts)


def _extra_summary(extra: Any) -> str:
    if not isinstance(extra, dict):
        return ""
    preferred_keys = [
        "email",
        "result",
        "event_id",
        "event_public_id",
        "attendee_id",
        "document",
        "context",
        "source_path",
        "status_code",
        "kvkk_required",
        "kvkk_accepted",
        "cross_border_transfer_consent_required",
        "cross_border_transfer_consent",
        "legal_document_version",
    ]
    parts = []
    for key in preferred_keys:
        if key in extra and extra.get(key) not in (None, ""):
            parts.append(f"{key}={_shorten(_stringify(extra.get(key)), 80)}")
    return "; ".join(parts[:10])


def _format_timestamp(value: str) -> str:
    return value.replace("T", " ").replace("+00:00", " UTC")


def _shorten(value: str, limit: int) -> str:
    text = str(value)
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "..."


def _mm(value: float) -> int:
    return int(value * MM_TO_PX)


def _draw_centered(
    draw: Any,
    text: str,
    *,
    y: int,
    font: Any,
    fill: tuple[int, int, int],
    max_width: int,
) -> None:
    lines: list[str] = []
    current = ""
    for word in str(text).split():
        candidate = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        draw.text(((PDF_WIDTH - (bbox[2] - bbox[0])) // 2, y), line, font=font, fill=fill)
        y += bbox[3] - bbox[1] + 8


def _draw_signature(
    draw: Any,
    x: int,
    y: int,
    name: str,
    title: str,
    fonts: dict[str, Any],
) -> None:
    width = _mm(60)
    draw.line((x, y, x + width, y), fill=(34, 34, 34), width=1)
    _draw_text_center_in_box(draw, name, x, y + 12, width, fonts["signature"])
    _draw_text_center_in_box(draw, title, x, y + 38, width, fonts["signature_title"])


def _draw_text_center_in_box(
    draw: Any,
    text: str,
    x: int,
    y: int,
    width: int,
    font: Any,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    draw.text((x + (width - (bbox[2] - bbox[0])) // 2, y), text, font=font, fill=(17, 17, 17))


def _stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (dict, list, tuple)):
        return str(value)
    return str(value)
