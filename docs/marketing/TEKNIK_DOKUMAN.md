# HeptaCert — Genel Teknik Doküman

> Platformun mimarisi, teknoloji yığını, modülleri, konvansiyonları ve bilinen teknik borçları.
> Son güncelleme: 2026-06-14

---

## 1. Genel Bakış

**HeptaCert**, etkinlik yönetimi + dijital sertifikasyon merkezli, çok kiracılı (multi-tenant) bir SaaS platformudur. Organizasyonlar; etkinlik oluşturur, katılımcı kaydı/biletleme yapar, yoklama (check-in) alır, dijital sertifika üretir ve dağıtır, topluluk/sosyal etkileşim, CRM, pazarlama otomasyonu, anketler, oyunlaştırma ve pazar yeri (marketplace) özelliklerini kullanır.

**Ana yetenek alanları:**
- Etkinlik yönetimi, biletleme, kayıt formları, yoklama (QR/kiosk)
- Dijital sertifika üretimi (PDF/PNG), şablonlar, dijital imza (pyHanko), watermark, doğrulama
- Topluluk & sosyal akış (post, yorum, beğeni, takip), üye profilleri
- CRM (hesaplar, anlaşmalar, lead scoring, sequences, Mailchimp/Salesforce entegrasyonu)
- Pazarlama otomasyonu, audience segments, toplu e-posta
- Abonelik & faturalama (iyzico / PayTR / Stripe)
- SSO/OAuth/OIDC sağlayıcı, API anahtarları, MCP server (AI ajan erişimi)
- Salon (venue) yönetimi & rezervasyon, akreditasyon & CPD
- Beyaz etiket (white-label) + özel alan adı (custom domain) desteği

---

## 2. Teknoloji Yığını

### Backend
- **Dil/Framework:** Python 3.12, FastAPI 0.135, Starlette, Uvicorn
- **ORM:** SQLAlchemy 2.0 (async), asyncpg sürücüsü
- **Migration:** Alembic (98 versiyon)
- **Validasyon:** Pydantic 2.x, pydantic-settings
- **Auth/Güvenlik:** PyJWT (HS256), passlib + bcrypt, PyOTP (2FA), slowapi (rate limit), cryptography, itsdangerous (imzalı token)
- **Cache/Zamanlayıcı:** Redis, APScheduler
- **Belge/Görsel:** Pillow, qrcode, pyHanko (PDF dijital imza), pandas/openpyxl
- **E-posta:** aiosmtplib, Jinja2 şablonları
- **AI:** Anthropic SDK, OpenAI SDK, MCP server
- **Dosya tarama:** ClamAV (opsiyonel)

### Frontend
- **Framework:** Next.js 15 (App Router), React 18, TypeScript 5
- **Stil:** Tailwind CSS
- **State:** Zustand
- **UI:** Lucide ikonlar, Framer Motion, TanStack Table, react-markdown, @uiw/react-md-editor, html5-qrcode

### Altyapı
- **DB:** PostgreSQL  **Cache:** Redis  **Tarama:** ClamAV
- **Reverse proxy:** Caddy (otomatik TLS + custom domain `ask` endpoint'i)
- **Orkestrasyon:** Docker Compose

---

## 3. Mimari

```
                    ┌──────────────┐
   Tarayıcı  ──────▶│   Caddy (TLS)│──────┐
   (custom domain)  └──────────────┘      │
                                          ▼
                    ┌─────────────────────────────┐
                    │  Frontend (Next.js :3000)    │  SSR + App Router
                    └─────────────────────────────┘
                                  │  apiFetch / publicApiFetch / memberApiFetch
                                  ▼
                    ┌─────────────────────────────┐
                    │  Backend (FastAPI :8000)     │  JWT auth, org-scoping
                    │  main.py + ~43 router modülü │
                    └─────────────────────────────┘
                       │            │            │
                  ┌────▼───┐   ┌────▼───┐   ┌────▼─────┐
                  │Postgres│   │ Redis  │   │ ClamAV   │
                  └────────┘   └────────┘   └──────────┘

   Ayrı servisler: backend_jobs (APScheduler), db_backup, db_init, docs
```

**Önemli mimari not:** `main.py` hem **uygulama giriş noktası** hem de **paylaşılan kütüphane**dir. 72 dosya `from .main import ...` ile model/dependency/şema çeker (166 import). Bu yüzden main.py merkezi bir hub'dır (bkz. Bölüm 11 — Teknik Borç).

---

## 4. Dizin Yapısı

```
heptacert/
├── backend/
│   ├── src/
│   │   ├── main.py              # ~18k satır: app + ~230 route + auth deps + helper'lar
│   │   ├── config.py           # Settings (env) — main.py'dan ayıklandı
│   │   ├── db.py               # engine, SessionLocal, Base, get_db
│   │   ├── enums.py            # Role, CertStatus, TxType, OrderStatus, AttendeeSource
│   │   ├── db_types.py         # Dialect-aware JSONB/INET/BIGINT_PK (postgres⇄sqlite)
│   │   ├── event_team.py       # Event-team rol/izin sabitleri + yardımcıları
│   │   ├── models.py           # 79 çekirdek SQLAlchemy modeli (tek Base.registry)
│   │   ├── schemas.py          # 166 Pydantic request/response şeması
│   │   ├── *_api.py            # ~43 router modülü (events, crm, community, venues, ...)
│   │   ├── *_models.py         # Ayrı SQLAlchemy modelleri (lms, crm, quiz, lead_forms, ...)
│   │   ├── generator.py        # Sertifika PDF/PNG üretimi
│   │   ├── payments.py         # iyzico / PayTR / Stripe sağlayıcıları
│   │   ├── webhooks.py, cache.py, moderation.py, signing.py, watermark.py
│   │   └── mcp_server.py       # AI ajanları için MCP endpoint'i
│   │   └── _archive_lms/       # DEVRE DIŞI LMS api'leri (arşiv)
│   ├── alembic/versions/       # 98 migration
│   ├── tests/                  # pytest (SQLite in-memory) — 402 test
│   ├── Dockerfile, requirements.txt, pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router rotaları (events, admin, portal, ...)
│   │   ├── components/         # Admin, Public, CommunityFeed, Brand, DataTable, ...
│   │   ├── lib/                # api.ts (API katmanı), i18n, theme, toast, url, ...
│   │   ├── stores/             # Zustand
│   │   └── locales/            # TR / EN
│   │   └── _archive_lms/       # DEVRE DIŞI LMS sayfaları (arşiv)
│   ├── Dockerfile, next.config.mjs, tailwind.config.ts
│
├── docs/                       # Teknik dokümanlar (bu dosya dahil)
├── docker-compose.yml          # Prod: db, redis, clamav, backend, backend_jobs, frontend, docs, db_backup
└── docker-compose.local.yml    # Lokal geliştirme
```

---

## 5. Backend

### 5.1 Router modülleri (main.py'a mount edilen ~43 router)
`domains, email, auth_2fa, document_outputs, document_export_jobs, community, social, connections, member_certificates, certificate_templates, automation, audience_segments, oidc_sso, event_crm, crm_sequences, training, checkin_ops, platform_health, product_telemetry, qa_seed, analytics, tickets, organization_access, venues, venue_reservations, notification_integrations, oauth, ai_content, ai_proactive, event_extras, quiz, learning_path, crm_accounts, lead_forms, org_modules, org_staff, org_analytics, report_scheduler, marketplace, lti, sso, api_keys_ext, accreditation`

> **Not:** `lms` ve `lms_extended` router'ları DEVRE DIŞI (arşivlendi). Modelleri (`lms_models`, `lms_extended_models`) hâlâ `src/`'de çünkü `marketplace_api` onlara bağımlı.

### 5.2 Route sayıları
- Toplam ~**694 route**. ~230'u doğrudan `main.py`'da (`@app.*`), kalanı router modüllerinde (`@router.*`).
- Prefix konvansiyonu: `/api/admin/*` (yönetici), `/api/public/*` (kimlik gerektirmeyen veya üye), `/api/superadmin/*` (platform yöneticisi).

### 5.3 Veri modeli
- `main.py` içinde **79 çekirdek SQLAlchemy modeli** (User, Organization, Event, Attendee, Certificate, Subscription, CommunityPost, ...) tek `Base` registry'de.
- Ayrı `*_models.py` dosyalarında ek modeller (CRM, quiz, lead_forms, learning_path, accreditation, report_scheduler).
- ~**164 Pydantic şeması** (request/response) — çoğu main.py'da, route handler'larının yanında.

### 5.4 Dialect-aware tipler (`db_types.py`)
PostgreSQL'de native `JSONB`/`INET`, diğer dialect'lerde (SQLite testleri) `JSON`/`String`'e düşer:
```python
JSONB = _JSON().with_variant(_PgJSONB(), "postgresql")
INET  = String(45).with_variant(_PgINET(), "postgresql")
```
⚠️ **Yeni model dosyalarında ham `from sqlalchemy.dialects.postgresql import JSONB` KULLANMAYIN** — `from .db_types import JSONB` kullanın, aksi halde SQLite testleri kırılır.

### 5.5 Arka plan işleri
`backend_jobs` servisi APScheduler ile: sertifika otomatik yenileme, e-posta digest, LMS due-date bildirimleri (devre dışı), CRM snapshot vb. zamanlanmış görevler.

---

## 6. Kimlik Doğrulama & Yetkilendirme

- **JWT (HS256):** `JWT_SECRET` (min 32 karakter zorunlu), `jwt_expires_minutes` (varsayılan 1440 = 24s). `get_current_user` dependency'si token'ı çözer.
- **Roller:** `Role.admin`, `Role.superadmin` + public üye (`get_current_public_member`). `require_role(...)` dependency'si.
- **Plan gate'leri:** `require_paid_plan`, `require_email_system_access`, `require_event_owner_premium_for_teams`. Bazı özellikler **Enterprise plan** gerektirir (ör. organizasyon `team_manage`).
- **Çok-org context:** `get_organization_for_access(db, me, permission, org_id)` + `X-Organization-Id` header'ı / `organization_id_from_request`. Kullanıcı kendi org'unun sahibi olabilir veya başka org'a belirli izinlerle (venue_manager, profile_manager, event_manager...) üye olabilir.
- **2FA:** PyOTP tabanlı (`auth_2fa_api`, `/api/auth/2fa/*`), backup kodları.
- **Public erişim koruması:** İmzalı token'lar (`itsdangerous`) ve e-posta doğrulaması — ör. anket erişimi, unsubscribe, katılımcı badge görüntüleme.

---

## 7. Ödeme & Entegrasyonlar

- **Sağlayıcılar:** iyzico (varsayılan), PayTR, Stripe — `payments.py` içinde `PaymentProvider` arayüzü. `PAYMENT_ENABLED` flag'i ile kapalı varsayılan.
- **Webhook'lar:** `/api/billing/webhook/{provider}` — imza/timestamp doğrulaması (Stripe için replay koruması).
- **Diğer entegrasyonlar:** Google Sheets, Microsoft Excel/Calendar (OAuth callback'leri), Mailchimp/Salesforce (CRM push), Zoom webinar, Apple Wallet (bilet), OpenAI/Anthropic (AI içerik).

---

## 8. Güvenlik

- **CORS:** `CORS_ORIGINS` env; wildcard ise `allow_credentials=False` (JWT header tabanlı, cookie yok).
- **Security headers middleware:** X-Content-Type-Options, X-Frame-Options=DENY, Referrer-Policy, Permissions-Policy, HSTS (https'te). Frontend `next.config.mjs`'de de aynı header'lar.
- **Rate limiting:** slowapi; login `5/dk`, global varsayılan `200/dk`. Redis veya memory backend.
- **Dosya yükleme:** content-type allowlist + uzantı kontrolü + boyut limiti + ClamAV taraması + `Path(...).name` ile filename sanitization. `/api/files/{path}` servis ederken path-traversal koruması (`..`, `\`, `is_relative_to`).
- **Audit log:** kritik işlemler `write_audit_log` ile (login_failed, soft_deleted, organization.member.create...).
- **Org izolasyonu:** `get_organization_for_access` ile kaynak erişimi org sahipliği/izinlere göre; host-header bazlı `_ensure_event_allowed_for_request_host`.

---

## 9. Veritabanı & Migrations

- **Postgres** (prod), **SQLite in-memory** (test). Aynı modeller `db_types.py` variant'ları sayesinde her ikisinde çalışır.
- **Alembic:** `backend/alembic/versions/` — 98 migration. Prod şema migration'larla yönetilir (`create_all` DEĞİL).
- ⚠️ Testler `Base.metadata.create_all` kullanır (migration değil) — bu yüzden model tanımları SQLite-uyumlu olmalı (JSONB variant, çift index olmaması).

---

## 10. Test & Doğrulama

- **Çerçeve:** pytest + pytest-asyncio, **SQLite in-memory** (PostgreSQL gerekmez). `tests/conftest.py` env'leri ayarlar ve tabloları `create_all` ile kurar.
- **Durum:** **402 passed, 0 failed.**
- **Yerel kısıt:** Backend bağımlılıkları (pydantic/fastapi/sqlalchemy) yerel Python'da YOK — yalnızca Docker imajında. Test/doğrulama Docker üzerinden:
  ```
  cd heptacert/backend
  docker build -q -t heptacert-backend-test .
  docker run --rm heptacert-backend-test python -m pytest -o addopts="" -p no:cacheprovider -q
  ```
  (`pytest.ini`'de `-x` var; tüm hataları görmek için `-o addopts=""` ile override edin.)

---

## 11. Önemli Konvansiyonlar & Tuzaklar

1. **`apiFetch` ham `Response` döner** — veri dönen tüm wrapper'lar `.json()` ÇAĞIRMALI. Eksik `.json()` sessiz runtime çökmesine yol açar.
2. **JSONB:** model dosyalarında `from .db_types import JSONB` (ham postgres JSONB değil) — yoksa SQLite testleri kırılır.
3. **God dosya:** `main.py` ~21k satır, merkezi hub. Bir şey ayıklarken main.py'da **mutlaka re-export** edin (72 dosya `from .main import ...` yapıyor).
4. **Model/relationship import sırası:** SQLAlchemy ilişkileri startup'ta çözülür; yanlış import sırası startup'ı kilitler (LMS dersi).
5. **`nc→onc` bozulması (tarihsel):** Geçmişte hatalı toplu bul-değiştir bazı isimleri bozmuş (`attendance→attendaonce`, `preferences→prefereonces`). Çoğu kozmetik değişken adı; route string'lerinde olanlar düzeltildi/alias'landı. Yeni kod yazarken bu bozuk isimleri kopyalamayın.
6. **Çok-org context:** Admin işlemlerinde doğru org'u hedeflemek için `X-Organization-Id` header'ı kritik; header yoksa kullanıcının kendi org'una gider.

---

## 12. Arşivlenmiş / Devre Dışı

- **LMS sistemi** tamamen arşivlendi (`backend/_archive_lms/`, `frontend/_archive_lms/`). Backend router'ları mount edilmiyor, frontend sayfaları route değil. Modeller `src/`'de kaldı (marketplace bağımlı). Yeniden aktive etme: ilgili `_archive_lms/README.md`.
- **Topluluk/social UI:** Backend (`community_api`, `social_api`) + component'ler (PostCard, CommentTree, CreatePostForm, ReplyForm) HAZIR ama bunları birleştiren bir sayfa YOK → özellik UI'da görünmüyor (karar bekliyor: sil/bağla/bırak).

---

## 13. Teknik Borç & Bilinen Konular

| Konu | Durum |
|------|-------|
| `main.py` ~21k satır god dosyası | Bölme planı [main_py_refactor_plan.md](main_py_refactor_plan.md); Adım 1 (config.py) tamam |
| ~164 Pydantic şema main.py'da (47'si route'larla serpilmiş) | Ayıklanacak (Adım 3) |
| ~79 SQLAlchemy modeli main.py'da tek Base'de | Ayıklanacak (Adım 4) |
| Öksüz frontend component'ler (CommunityFeed kümesi dahil) | Karar bekliyor |
| Pydantic v2 deprecation uyarıları (class-based Config) | Düşük öncelik |
| FastAPI `on_event` deprecated (lifespan'e geçilmeli) | Düşük öncelik |

> Ayrıntılı oturum geçmişi ve devam adımları: [TEMIZLIK_OTURUM_DURUMU.md](TEMIZLIK_OTURUM_DURUMU.md)

---

## 14. Deployment

- **Prod:** `docker-compose.yml` — servisler: `db` (Postgres), `redis`, `clamav`, `backend`, `backend_jobs` (APScheduler), `frontend`, `docs`, `db_init`, `db_backup`, `caddy` (TLS/proxy).
- **Önemli env değişkenleri:** `DATABASE_URL`, `JWT_SECRET` (min 32), `EMAIL_TOKEN_SECRET` (min 32), `REDIS_URL`, `PUBLIC_BASE_URL`, `FRONTEND_BASE_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_BASE`, ödeme sağlayıcı anahtarları, SMTP, `ENABLE_SCHEDULER`, `CLAMAV_ENABLED`.
- **Custom domain:** Caddy `ask` endpoint'i (`/.internal/caddy/authorize`) ile dinamik TLS; org `custom_domain` alanına göre host-bazlı branding.
