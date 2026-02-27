from __future__ import annotations

import io
import re
import uuid as uuid_lib
from dataclasses import dataclass
from typing import Optional

import qrcode
from PIL import Image, ImageDraw, ImageFont


HEX_RE = re.compile(r"^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")


@dataclass(frozen=True)
class TemplateConfig:
    # Name + QR
    isim_x: int
    isim_y: int
    qr_x: int
    qr_y: int
    font_size: int = 48
    font_color: str = "#FFFFFF"

    # Certificate ID text (public_id)
    cert_id_x: int = 60
    cert_id_y: int = 60
    cert_id_font_size: int = 18
    cert_id_color: str = "#94A3B8"


def new_certificate_uuid() -> str:
    return str(uuid_lib.uuid4())


def _load_font(font_size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, font_size)
        except Exception:
            continue
    return ImageFont.load_default()


def _hex_to_rgba(hex_color: str) -> tuple[int, int, int, int]:
    """
    #RRGGBB or #RRGGBBAA
    """
    c = (hex_color or "").strip()
    if not HEX_RE.match(c):
        # fallback white-ish
        return (255, 255, 255, 255)

    h = c[1:]
    if len(h) == 6:
        r = int(h[0:2], 16)
        g = int(h[2:4], 16)
        b = int(h[4:6], 16)
        return (r, g, b, 255)

    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    a = int(h[6:8], 16)
    return (r, g, b, a)


def _make_qr_png(data: str, box_size: int = 10, border: int = 1) -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGBA")


def render_certificate_pdf(
    template_image_bytes: bytes,
    student_name: str,
    verify_url: str,
    config: TemplateConfig,
    *,
    public_id: Optional[str] = None,
    qr_size_px: int = 260,
) -> bytes:
    """
    Renders:
      - student_name at (isim_x, isim_y)
      - QR pointing to verify_url at (qr_x, qr_y)
      - optional public_id at (cert_id_x, cert_id_y)
    """
    if not student_name or not student_name.strip():
        raise ValueError("student_name is empty")

    base = Image.open(io.BytesIO(template_image_bytes)).convert("RGBA")
    draw = ImageDraw.Draw(base)

    # Name
    name_font = _load_font(int(config.font_size))
    name_fill = _hex_to_rgba(config.font_color)
    draw.text(
        (int(config.isim_x), int(config.isim_y)),
        student_name.strip(),
        font=name_font,
        fill=name_fill,
    )

    # Certificate ID
    if public_id:
        id_font = _load_font(int(config.cert_id_font_size))
        id_fill = _hex_to_rgba(config.cert_id_color)
        draw.text(
            (int(config.cert_id_x), int(config.cert_id_y)),
            str(public_id),
            font=id_font,
            fill=id_fill,
        )

    # QR
    qr_img = _make_qr_png(verify_url).resize((qr_size_px, qr_size_px), resample=Image.LANCZOS)
    base.alpha_composite(qr_img, (int(config.qr_x), int(config.qr_y)))

    # Save PDF
    pdf_img = base.convert("RGB")
    out = io.BytesIO()
    pdf_img.save(out, format="PDF", resolution=300.0)
    return out.getvalue()