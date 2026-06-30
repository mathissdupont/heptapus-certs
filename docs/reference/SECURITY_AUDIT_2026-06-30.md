# HeptaCert Güvenlik Denetimi — 2026-06-30

> Bu rapor; denetim kapsamını, bulunan açıkları, uygulanan düzeltmeleri, güvenli
> olduğu **doğrulanan** yüzeyleri ve artık riskleri belgeler. Amaç: sistemin
> güvenlik duruşunu kanıtlanabilir biçimde ortaya koymak.

## 1. Kapsam ve Yöntem

- **Hedef:** HeptaCert backend (FastAPI + SQLAlchemy, ~715 route), `heptacert/backend/src`.
- **Yöntem:** Kaynak kod incelemesi (statik), saldırı-yüzeyi bazlı; her bulgu gerçek
  koda (dosya:satır) dayandırıldı. İki tur yapıldı.
- **Sınıflandırma:** Kritik / Yüksek / Orta / Düşük.

---

## 2. Tur 1 — Kapatılan açıklar (auth/ödeme/çok-kiracılık)

| # | Şiddet | Açık | Düzeltme |
|---|--------|------|----------|
| 1 | Kritik | API key + OAuth token scope'ları REST'te hiç uygulanmıyordu | `get_current_user` içinde merkezi scope enforcement (boş-scope=tam yetki, geriye uyumlu) |
| 2 | Kritik | HeptaCoin eşzamanlı çift-harcama (satır kilidi yok) | Tüm harcama yollarında `with_for_update` / atomik `UPDATE` |
| 3 | Kritik | Check-in nonce mekanizması ölü kod (doğrulanmıyor) | Kiosk/opt-in akışında gerçek doğrulama+tüketim |
| 4 | Yüksek | OAuth token endpoint'te `client_secret` opsiyonel | Secret yoksa PKCE zorunlu; refresh'te secret zorunlu; sabit-zaman karşılaştırma |
| 5 | Yüksek | Kayıt kotası yarış durumu | Insert öncesi event-row kilitli atomik recount |
| 6 | Yüksek | Webhook: doğrulanamayan tutarda "paid"; refund'da provizyon temizlenmiyor | None-tutar reddi; refund'da abonelik deaktive + HC geri alımı (idempotent) |
| 7 | Yüksek | Ölü `attendaonce` export + N+1 | Batch sorgu |
| 8 | Orta | Sertifika eşleşmesi isim tabanlı | `Certificate.attendee_id` FK + ID-öncelikli eşleşme (migration 104) |
| 9 | Orta | E-posta sorguları case-sensitive | `func.lower` + normalize |
| 10 | Orta | Login timing ile kullanıcı enumeration | Dummy bcrypt ile sabit-zaman |
| 11 | Orta | 2FA başarısız deneme kilidi yok | Hesap-bazlı lockout (Redis, 5 hata/15 dk) + audit |

---

## 3. Tur 2 — Kapatılan açıklar (injection/SSRF/upload/IDOR/secrets)

| # | Şiddet | Açık | Dosya | Düzeltme |
|---|--------|------|-------|----------|
| 1 | **Kritik** | **SSTI → RCE**: admin e-posta şablonları sandbox'sız Jinja2 ile render ediliyordu | `email_rendering.py`, `main.py` | `SandboxedEnvironment`; tüm `Template()` çağrıları sandbox'a yönlendirildi |
| 2 | Yüksek | IDOR: `/api/admin/members/{id}/cpd` yetki+org kontrolü yok (çapraz-kiracı PII) | `accreditation_api.py` | `require_role` + org-scoped (event sahipliği) filtre |
| 3 | Yüksek | OIDC id_token imzası doğrulanmıyordu (hesap ele geçirme) | `oidc_sso_api.py` | JWKS ile RS256/ES256 imza + `aud`/`exp`/`iss` doğrulaması |
| 4 | Yüksek | SSRF: OIDC `issuer_url`/`token_endpoint`/`jwks_uri` + provider test `base_url` | `oidc_sso_api.py`, `notification_integrations_api.py` | https zorunlu + özel-IP reddi (`_is_private_address`) + `follow_redirects=False` |
| 5 | Orta | Kayıt device cookie'sinde `Secure` flag yok | `main.py` (3 nokta) | HTTPS'te `secure=True` |
| 6 | Orta | CSV formül enjeksiyonu (export) | `main.py` | `_csv_safe` ile `= + - @` öneki nötrleme (sertifika/attendee/attendance export) |
| 7 | Orta | PIL decompression-bomb koruması yok | `main.py` | `Image.MAX_IMAGE_PIXELS = 64MP` (süreç-geneli) |
| 8 | Orta | Global CSP yok | `main.py` | `frame-ancestors/object-src/base-uri 'none'` (Swagger'ı bozmadan) |
| 9 | Düşük | Malware taraması varsayılan kapalı | `docker-compose.yml` | `CLAMAV_ENABLED` varsayılan açık; `REQUIRE_CLAMAV` üretim notu |

---

## 3.5. Tur 3 — Kapatılan açıklar (rate-limit, XSS, open-redirect, internal uç)

| # | Şiddet | Açık | Dosya | Düzeltme |
|---|--------|------|-------|----------|
| 1 | **Yüksek** | Rate-limit **fiilen devre dışı**: `SlowAPIMiddleware` eklenmediğinden tüm `@limiter.limit` no-op'tu → login/register/forgot/2fa brute-force'a açık | `main.py`, `ratelimit.py` | `SlowAPIMiddleware` eklendi; global `default_limits` kaldırıldı (yalnız hassas uçlar limitli) |
| 2 | Orta | E-posta değişkenleri escape edilmiyordu (attendee adı → HTML/link enjeksiyonu) | `email_rendering.py` | `SandboxedEnvironment(autoescape=True)` |
| 3 | Orta | OIDC `next` open-redirect (savunma derinliği) | `oidc_sso_api.py` | Yalnız same-site relative path kabulü |
| 4 | Orta | `/.internal/caddy/authorize` app-seviyesi ağ kapısı yok (domain enumeration) | `domains_api.py` | Trusted-proxy peer kontrolü (TRUSTED_PROXY_NETWORKS ayarlıysa) |
| 5 | Düşük | Rol değişiminde user-cache invalidation yok (~120sn revocation gecikmesi) | `main.py` | `change_admin_role`'de cache invalidation |

**Tur 3'te temiz doğrulananlar:** mass-assignment / yetki yükseltme (Pydantic whitelist + `require_role`; self-register rolü hardcoded; superadmin uçları gated; QA-seed çift-kilit), CRM owner cross-org koruması, check-in SSE (auth + tenant-scoped), MCP auth (API-key hash + çift scope), verify uçları (minimum PII), OAuth `redirect_uri` allowlist, event açıklaması stored-XSS (allowlist sanitizer + WRITE'ta uygulanıyor).

**Tur 3 kabul edilen artık riskler:** sunum control-WS token'ında expiry yok (token 192-bit + yeniden üretilebilir; audience bayraklarına bağlamak presenter UX'ini bozar), MCP DNS-rebinding kapalı (kasıtlı, tehdit modeli için makul), yorum gövdesi HTML sanitize edilmiyor (şu an React escape ediyor; ileride HTML render edilirse riskli).

---

## 4. Güvenli olduğu DOĞRULANAN yüzeyler (kanıt)

Bu yüzeyler incelendi ve sağlam bulundu:

- **SQL injection:** Tüm kullanıcı-girdili sorgular ORM ile parametreli; `text(...)`
  kullanımları sabit string ya da bağlı parametre. Dinamik ORDER BY/kolon adı yok.
- **Path traversal (okuma):** `/api/files/{path}` — `..`/ters-slash/baştaki-slash reddi
  + `resolve()` + `is_relative_to(storage_root)`.
- **Dosya yükleme:** Yalnızca PNG/JPEG/WEBP, PIL `verify()` + magic-byte; SVG/HTML
  yüklenemez (stored XSS yok); boyut limitleri (413); kaydedilen ad `secrets` ile üretiliyor.
- **JWT:** `algorithms=["HS256"]` her decode'da sabit (alg-confusion/none yok); `exp`
  doğrulanıyor; secret min 32.
- **Parola:** bcrypt; **token'lar** CSPRNG (`secrets`) + durağanda hash + `hmac.compare_digest`.
- **CORS:** `*` ile `allow_credentials=True` yasak kombinasyonu yok.
- **CSRF:** Kimlik doğrulama bearer-JWT (cookie-oturum yok) → düşük risk.
- **Komut enjeksiyonu:** `subprocess` liste-form, `shell=False`, path doğrulamalı.
- **IDOR (geniş tarama):** Sertifika/webhook/api-key/CRM/deal/export-job/kiosk route'ları
  sahiplik/org kontrolü ile korunuyor (`_get_event_for_admin` deseni).

---

## 4.5. Tur 4 — Kapatılan artık riskler

| Açık | Şiddet | Düzeltme |
|------|--------|----------|
| Webhook DNS-rebinding | Orta | `_is_private_address` artık `getaddrinfo` ile TÜM A/AAAA (IPv4+IPv6) kayıtlarını kontrol ediyor; teslim anında yeniden-çözüm + reddetme + `follow_redirects=False` |
| CSV import satır sınırı yok | Düşük | `> 10000` satır reddi |
| `signing.py` hardcoded P12 parolası | Düşük | `PDF_SIGNING_P12_PASSWORD` env (legacy default geriye uyumlu) |
| Control-WS token expiry yok | Orta | Event'e bağlı deck'lerde `event_date + 7 gün` sonrası control linki 410 (standalone deck'ler etkilenmez) |
| Yorum gövdesi HTML | Düşük | **Kod değişikliği yok** — React metin olarak render ediyor (zaten güvenli); depolamada escape çift-escape regresyonu yaratır. Render daima metin kalmalı. |

## 5. Kalan / Öneriler (profesyonel inceleme gerektirir)

1. **E-posta verify/reset token'ları DB'de düz saklanıyor (Düşük):** İmzalı+süreli
   oldukları için risk düşük; hash'lenmeleri tercih edilir — verify akışı değişeceği
   için ayrı/test'li bir iş olarak planlandı.
2. **MCP DNS-rebinding kapalı (Bilgi):** Kasıtlı (sunucu-sunucu tehdit modeli); tarayıcı
   tabanlı MCP istemcisi eklenmedikçe risk yok. Bilinçli olarak değiştirilmedi.
3. **Webhook IP-pinning (Bilgi):** Teslimde yeniden-çözüm eklendi; tam TOCTOU kapanışı
   için tek-çözüm + pinned-IP transport ileride eklenebilir (kalan pencere çok dar).
4. **Yasal not:** Bu rapor mühendislik incelemesidir; uyumluluk/sertifikasyon (ör.
   ISO 27001, bağımsız sızma testi) için profesyonel denetim önerilir.

---

## 6. Doğrulama (nasıl kanıtlanır)

```bash
# Güvenlik birim testleri (SQLite, container içinde)
cd heptacert
docker compose run --rm \
  -e DATABASE_URL="sqlite+aiosqlite:///" -e CORS_ORIGINS="*" \
  -e PUBLIC_BASE_URL="http://localhost:8000" -e FRONTEND_BASE_URL="http://localhost:3000" \
  backend pytest tests/test_security.py tests/test_auth_flows.py tests/test_payments.py -q

# SSTI sandbox aktif mi (RCE payload'ı düz metin dönmeli, kod çalışmamalı):
#   admin e-posta şablonuna {{ 7*7 }} koy → "49"; {{ ''.__class__ }} → boş/escape
```

Migration'lar `docker compose` ile `alembic upgrade head` üzerinden otomatik uygulanır.

---
_Son güncelleme: 2026-06-30 · İki tur statik denetim + düzeltme._
