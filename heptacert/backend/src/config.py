"""Uygulama ayarlari (environment degiskenlerinden).

main.py'dan ayiklandi (god-dosya bolme, Adim 1). Geriye donuk uyumluluk icin
main.py bu modulden `Settings` ve `settings`'i tekrar export eder; mevcut
`from .main import settings` kullanimlari calismaya devam eder.
"""

from __future__ import annotations

from pydantic import EmailStr, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    db_pool_size: int = Field(default=20, alias="DB_POOL_SIZE")
    db_pool_max_overflow: int = Field(default=20, alias="DB_POOL_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=15, alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=1800, alias="DB_POOL_RECYCLE")
    jwt_secret: str = Field(min_length=32, alias="JWT_SECRET")
    jwt_expires_minutes: int = Field(default=1440, alias="JWT_EXPIRES_MINUTES")

    bootstrap_superadmin_email: EmailStr = Field(alias="BOOTSTRAP_SUPERADMIN_EMAIL")
    bootstrap_superadmin_password: str = Field(alias="BOOTSTRAP_SUPERADMIN_PASSWORD")

    public_base_url: str = Field(default="http://localhost:8000", alias="PUBLIC_BASE_URL")
    frontend_base_url: str = Field(default="http://localhost:3000", alias="FRONTEND_BASE_URL")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")
    cors_allow_origin_regex: str = Field(default="", alias="CORS_ALLOW_ORIGIN_REGEX")
    clamav_enabled: bool = Field(default=False, alias="CLAMAV_ENABLED")
    clamav_host: str = Field(default="127.0.0.1", alias="CLAMAV_HOST")
    clamav_port: int = Field(default=3310, alias="CLAMAV_PORT")
    require_clamav: bool = Field(default=False, alias="REQUIRE_CLAMAV")
    trusted_proxy_networks: str = Field(default="", alias="TRUSTED_PROXY_NETWORKS")
    redis_url: str = Field(default="", alias="REDIS_URL")
    rate_limit_storage_uri: str = Field(default="", alias="RATE_LIMIT_STORAGE_URI")
    google_oauth_client_id: str = Field(default="", alias="GOOGLE_OAUTH_CLIENT_ID")
    google_oauth_client_secret: str = Field(default="", alias="GOOGLE_OAUTH_CLIENT_SECRET")
    ms365_oauth_client_id: str = Field(default="", alias="MS365_OAUTH_CLIENT_ID")
    ms365_oauth_client_secret: str = Field(default="", alias="MS365_OAUTH_CLIENT_SECRET")
    apple_wallet_pass_type_id: str = Field(default="", alias="APPLE_WALLET_PASS_TYPE_ID")
    apple_wallet_team_id: str = Field(default="", alias="APPLE_WALLET_TEAM_ID")
    apple_wallet_cert_path: str = Field(default="", alias="APPLE_WALLET_CERT_PATH")
    apple_wallet_key_path: str = Field(default="", alias="APPLE_WALLET_KEY_PATH")
    apple_wallet_key_password: str = Field(default="", alias="APPLE_WALLET_KEY_PASSWORD")
    apple_wallet_wwdr_cert_path: str = Field(default="", alias="APPLE_WALLET_WWDR_CERT_PATH")

    storage_mode: str = Field(default="local", alias="STORAGE_MODE")
    local_storage_dir: str = Field(default="/data", alias="LOCAL_STORAGE_DIR")

    # SMTP (optional — if not set, verification tokens are printed to logs)
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="noreply@heptapus.com", alias="SMTP_FROM")
    email_batch_size: int = Field(default=10, ge=1, le=100, alias="EMAIL_BATCH_SIZE")
    email_batch_pause_seconds: float = Field(default=2.0, ge=0, le=60, alias="EMAIL_BATCH_PAUSE_SECONDS")

    email_token_secret: str = Field(min_length=32, alias="EMAIL_TOKEN_SECRET")

    # Payment (feature-flagged — off by default)
    payment_enabled: bool = Field(default=False, alias="PAYMENT_ENABLED")
    active_payment_provider: str = Field(default="iyzico", alias="ACTIVE_PAYMENT_PROVIDER")
    # iyzico
    iyzico_api_key: str = Field(default="", alias="IYZICO_API_KEY")
    iyzico_secret_key: str = Field(default="", alias="IYZICO_SECRET_KEY")
    iyzico_base_url: str = Field(default="https://sandbox-api.iyzipay.com", alias="IYZICO_BASE_URL")
    # PayTR
    paytr_merchant_id: str = Field(default="", alias="PAYTR_MERCHANT_ID")
    paytr_merchant_key: str = Field(default="", alias="PAYTR_MERCHANT_KEY")
    paytr_merchant_salt: str = Field(default="", alias="PAYTR_MERCHANT_SALT")
    # Stripe
    stripe_secret_key: str = Field(default="", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", alias="STRIPE_WEBHOOK_SECRET")
    stripe_publishable_key: str = Field(default="", alias="STRIPE_PUBLISHABLE_KEY")

    enable_scheduler: bool = Field(default=True, alias="ENABLE_SCHEDULER")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4.1-mini", alias="OPENAI_MODEL")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-sonnet-4-6", alias="ANTHROPIC_MODEL")


settings = Settings()
