"""Authenticated 2FA setup and account security endpoints."""

import base64
from io import BytesIO

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentUser,
    TotpSecret,
    User,
    get_current_user,
    get_db,
    write_audit_log,
)

router = APIRouter(prefix="/api/auth/2fa", tags=["auth-2fa"])


class TwoFAStatusOut(BaseModel):
    enabled: bool
    configured: bool
    is_enabled: bool = False


class TwoFASetupOut(BaseModel):
    secret: str
    otp_auth_url: str
    qr_code: str
    is_enabled: bool = False


class TwoFACodeIn(BaseModel):
    code: str = Field(min_length=6, max_length=8)


def _normalize_code(code: str) -> str:
    cleaned = "".join(ch for ch in (code or "") if ch.isdigit())
    if len(cleaned) != 6:
        raise HTTPException(status_code=400, detail="6 haneli do\u011frulama kodu gerekli.")
    return cleaned


async def _get_user(db: AsyncSession, user_id: int) -> User:
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Kullan\u0131c\u0131 bulunamad\u0131.")
    return user


async def _get_totp_secret(db: AsyncSession, user_id: int) -> TotpSecret | None:
    res = await db.execute(select(TotpSecret).where(TotpSecret.user_id == user_id))
    return res.scalar_one_or_none()


def _verify_code(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(_normalize_code(code), valid_window=1)


def _qr_data_url(value: str) -> str:
    try:
        import qrcode
    except Exception as exc:
        raise HTTPException(status_code=503, detail="QR kod kütüphanesi kullanılamıyor.") from exc

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(value)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#111827", back_color="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


@router.get("/status", response_model=TwoFAStatusOut)
async def two_fa_status(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    totp = await _get_totp_secret(db, me.id)
    enabled = bool(totp and totp.enabled)
    return TwoFAStatusOut(enabled=enabled, configured=bool(totp), is_enabled=enabled)


@router.post("/setup", response_model=TwoFASetupOut)
async def setup_two_fa(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user(db, me.id)
    totp = await _get_totp_secret(db, me.id)
    if totp and totp.enabled:
        raise HTTPException(status_code=409, detail="2FA zaten etkin.")

    secret = pyotp.random_base32()
    if totp:
        totp.secret = secret
        totp.enabled = False
    else:
        totp = TotpSecret(user_id=me.id, secret=secret, enabled=False)
        db.add(totp)

    issuer = "HeptaCert"
    otp_auth_url = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=issuer)
    qr_code = _qr_data_url(otp_auth_url)
    await write_audit_log(
        db,
        user_id=me.id,
        action="security.2fa_setup_started",
        resource_type="auth",
        resource_id=str(me.id),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    await db.commit()
    return TwoFASetupOut(secret=secret, otp_auth_url=otp_auth_url, qr_code=qr_code, is_enabled=False)


async def _confirm_two_fa(
    request: Request,
    payload: TwoFACodeIn,
    me: CurrentUser,
    db: AsyncSession,
):
    totp = await _get_totp_secret(db, me.id)
    if not totp:
        raise HTTPException(status_code=400, detail="\u00d6nce 2FA kurulumu ba\u015flat\u0131lmal\u0131.")
    if not _verify_code(totp.secret, payload.code):
        raise HTTPException(status_code=401, detail="Ge\u00e7ersiz do\u011frulama kodu.")

    totp.enabled = True
    await write_audit_log(
        db,
        user_id=me.id,
        action="security.2fa_enabled",
        resource_type="auth",
        resource_id=str(me.id),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    await db.commit()
    return {"ok": True, "enabled": True}


@router.post("/confirm")
async def confirm_two_fa(
    request: Request,
    payload: TwoFACodeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _confirm_two_fa(request, payload, me, db)


@router.post("/enable")
async def enable_two_fa(
    request: Request,
    payload: TwoFACodeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _confirm_two_fa(request, payload, me, db)


@router.patch("/disable")
async def disable_two_fa(
    request: Request,
    payload: TwoFACodeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    totp = await _get_totp_secret(db, me.id)
    if not totp or not totp.enabled:
        raise HTTPException(status_code=400, detail="2FA zaten devre d\u0131\u015f\u0131.")
    if not _verify_code(totp.secret, payload.code):
        raise HTTPException(status_code=401, detail="Ge\u00e7ersiz do\u011frulama kodu.")

    await db.delete(totp)
    await write_audit_log(
        db,
        user_id=me.id,
        action="security.2fa_disabled",
        resource_type="auth",
        resource_id=str(me.id),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    await db.commit()
    return {"ok": True, "enabled": False}
