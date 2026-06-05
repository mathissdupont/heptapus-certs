"""Minimal backend i18n helper.

Usage:
    from .i18n import t, lang_from_request

    @router.post("/foo")
    async def foo(request: Request):
        lang = lang_from_request(request)
        raise HTTPException(400, detail=t("invalid_code", lang))
"""

from __future__ import annotations

from fastapi import Request

# Key → {tr: ..., en: ...}
_MESSAGES: dict[str, dict[str, str]] = {
    # Auth / 2FA
    "invalid_token": {"tr": "Geçersiz token.", "en": "Invalid token."},
    "expired_token": {"tr": "Token süresi dolmuş.", "en": "Token has expired."},
    "user_not_found": {"tr": "Kullanıcı bulunamadı.", "en": "User not found."},
    "invalid_credentials": {"tr": "E-posta veya şifre hatalı.", "en": "Invalid email or password."},
    "account_deleted": {"tr": "Bu hesap silinmiştir.", "en": "This account has been deleted."},
    "2fa_required": {"tr": "2FA doğrulaması gerekli.", "en": "2FA verification required."},
    "2fa_already_enabled": {"tr": "2FA zaten etkin.", "en": "2FA is already enabled."},
    "2fa_not_enabled": {"tr": "2FA zaten devre dışı.", "en": "2FA is not enabled."},
    "2fa_not_active": {"tr": "2FA aktif değil.", "en": "2FA is not active."},
    "2fa_setup_first": {"tr": "Önce 2FA kurulumu başlatılmalı.", "en": "2FA setup must be started first."},
    "invalid_code": {"tr": "Geçersiz doğrulama kodu.", "en": "Invalid verification code."},
    "backup_codes_generated": {"tr": "Yedek kodlar oluşturuldu.", "en": "Backup codes generated."},
    # Events
    "event_not_found": {"tr": "Etkinlik bulunamadı.", "en": "Event not found."},
    "unauthorized": {"tr": "Yetkisiz erişim.", "en": "Unauthorized access."},
    "forbidden": {"tr": "Bu işlem için yetkiniz yok.", "en": "You do not have permission for this action."},
    # Registration
    "registration_closed": {"tr": "Kayıt kapalı.", "en": "Registration is closed."},
    "already_registered": {"tr": "Bu e-posta ile zaten kayıtlısınız.", "en": "You are already registered with this email."},
    "capacity_full": {"tr": "Etkinlik kapasitesi doldu.", "en": "Event capacity is full."},
    # Certificates
    "cert_not_found": {"tr": "Sertifika bulunamadı.", "en": "Certificate not found."},
    "cert_already_revoked": {"tr": "Sertifika zaten iptal edilmiş.", "en": "Certificate is already revoked."},
    # CRM
    "crm_not_found": {"tr": "CRM kaydı bulunamadı.", "en": "CRM profile not found."},
    "hubspot_not_configured": {"tr": "HubSpot entegrasyonu yapılandırılmamış.", "en": "HubSpot integration is not configured."},
    "salesforce_not_configured": {"tr": "Salesforce entegrasyonu yapılandırılmamış.", "en": "Salesforce integration is not configured."},
    # Integrations
    "oauth_not_configured": {"tr": "OAuth kimlik bilgileri yapılandırılmamış.", "en": "OAuth credentials are not configured."},
    "oauth_state_invalid": {"tr": "OAuth durumu geçersiz veya süresi dolmuş.", "en": "OAuth state is invalid or expired."},
    "token_exchange_failed": {"tr": "Token alışverişi başarısız.", "en": "Token exchange failed."},
    "connection_not_ready": {"tr": "Bağlantı henüz hazır değil.", "en": "Connection is not ready."},
    # Generic
    "internal_error": {"tr": "Beklenmedik bir hata oluştu.", "en": "An unexpected error occurred."},
    "rate_limit_exceeded": {"tr": "İstek limiti aşıldı. Lütfen bekleyin.", "en": "Rate limit exceeded. Please wait."},
    "invalid_request": {"tr": "Geçersiz istek.", "en": "Invalid request."},
    "not_found": {"tr": "Kayıt bulunamadı.", "en": "Record not found."},
    "email_required": {"tr": "E-posta adresi gerekli.", "en": "Email address is required."},
    "password_required": {"tr": "Şifre gerekli.", "en": "Password is required."},
}


def lang_from_request(request: Request) -> str:
    """Detect language from X-App-Lang or Accept-Language header. Returns 'tr' or 'en'."""
    app_lang = request.headers.get("X-App-Lang", "").strip().lower()
    if app_lang in ("tr", "en"):
        return app_lang
    accept = request.headers.get("Accept-Language", "").lower()
    if accept.startswith("en"):
        return "en"
    return "tr"


def t(key: str, lang: str = "tr", fallback: str | None = None) -> str:
    """Translate a message key to the given language."""
    entry = _MESSAGES.get(key)
    if entry:
        return entry.get(lang) or entry.get("tr") or key
    return fallback or key
