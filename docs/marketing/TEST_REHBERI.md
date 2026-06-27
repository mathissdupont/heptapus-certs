# HeptaCert — Test Rehberi & Yol Haritası

> Backend test altyapısı, yazım pattern'leri ve risk-öncelikli genişletme planı.
> Son güncelleme: 2026-06-14 · Mevcut: **402 test, %41 kapsam**

---

## 1. Felsefe: "Her şey" değil, "risk × düşük-kapsam"

694 route / ~13.000 test edilmemiş satırı tek seferde test etmek gerçekçi değil. Hedef: **bir hatanın en çok zarar vereceği + şu an en az test edilen** yerleri önce kapatmak. Önce kritik akışlar (auth, ödeme, sertifika, izin sınırları), sonra büyük modüller, sonra gerisi.

**Kapsam yanıltıcı olabilir:** `models.py`/`schemas.py` sırf import edildikleri için %100 görünür. Asıl önemli olan **route handler** kapsamı (şu an main.py %21).

> **2026-06-15 bulgusu (önemli):** 22 yeni test (auth + event CRUD + IDOR) eklendi → 402'den **424'e** çıktı, AMA kapsam %'si neredeyse hiç değişmedi (main.py %21 sabit). Sebep: mevcut testler büyük handler'ların **happy path'lerini setup olarak zaten çalıştırıyor** (event/member oluşturuyorlar). Yeni testler **risk/davranış değeri** yüksek (kritik akış + güvenlik kilitlendi) ama **% düşük**. **Sonuç:** kapsam %'sini hareket ettirmek için **mevcut hiçbir testin dokunmadığı SOĞUK yolları** hedefle — büyük hiç-çağrılmayan API modülleri (`event_crm_api`, `email_api`, `analytics_api`...) ve handler'ların **hata/edge branch'leri**. "Risk kilidi" ile "% artışı" iki ayrı hedef; ikisini de bilinçli seç.

---

## 2. Test Altyapısı Nasıl Çalışır

- **Çerçeve:** pytest + pytest-asyncio (`asyncio_mode=auto`), **SQLite in-memory** (PostgreSQL gerekmez).
- **Env:** `tests/conftest.py` app import'undan ÖNCE env'leri set eder; `setup_database` fixture'ı `Base.metadata.create_all` ile tabloları kurar.
- **Çalıştırma (Docker — yerelde backend deps yok):**
  ```bash
  cd heptacert/backend
  docker build -q -t heptacert-backend-test .
  # tüm suite (tüm hatalar):
  docker run --rm heptacert-backend-test python -m pytest -o addopts="" -p no:cacheprovider -q
  # kapsam raporu:
  docker run --rm heptacert-backend-test python -m pytest -o addopts="" -p no:cacheprovider --cov=src --cov-report=term-missing
  # tek dosya/sınıf:
  docker run --rm heptacert-backend-test python -m pytest -o addopts="" tests/test_api.py::TestHealthEndpoint -q
  ```
  > `pytest.ini`'de `-x` (ilk hatada dur) var; tüm sonuçları görmek için `-o addopts=""` ile override et.

---

## 3. Yazım Pattern'leri (mevcut koddan)

### 3.1 Endpoint testi (ASGI + httpx)
```python
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app  # app + re-export'lar (modeller/helper'lar) buradan gelir

class TestSomething:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
```

### 3.2 Veri kurulumu yardımcıları (tekrar kullan)
`tests/test_api.py` içinde hazır:
- `_create_public_member(email, public_id, ...)` → `(member_id, member_token)`
- `_create_admin_with_org(email, org_public_id, org_name, premium_plan="growth")` → `(admin_id, org_id, admin_token)`

Token fixture'ları: `admin_token`, `superadmin_token`, `partial_token`.

> **Öneri:** Bu helper'lar test dosyalarına dağılmış (test_api, test_social, test_venues her biri kendi `_create_*`'ini tanımlıyor). Yeni testler yazarken bunları **`conftest.py`'a taşıyıp paylaşılan fixture** yapmak tekrarı azaltır. (Küçük bir refactor; ilk batch'te yapılabilir.)

### 3.3 Auth gerektiren endpoint
```python
admin_id, org_id, token = await _create_admin_with_org(
    email="t@test.com", org_public_id="org_t", org_name="T")
headers = {"Authorization": f"Bearer {token}"}
resp = await ac.post("/api/admin/...", headers=headers, json={...})
assert resp.status_code == 201
```

### 3.4 İzin sınırı / IDOR testi (KRİTİK)
İki ayrı kullanıcı/org kur; A'nın token'ıyla B'nin kaynağına eriş → **403/404 bekle**.
Çok-org context için `X-Organization-Id` header'ı (bkz. `test_venues_api.py`).

### 3.5 Doğrudan fonksiyon/birim testi
```python
from src.utils import create_access_token          # yeni: ilgili modülden import
# (src.main re-export'u da çalışır ama netlik için modülden alın)
def test_token_roundtrip(): ...
```

### 3.6 İskelet konvansiyonu
- Dosya: `tests/test_<alan>.py`, sınıf: `Test<Konu>`, fonksiyon: `test_<davranış>`.
- Marker'lar (pytest.ini): `unit`, `integration`, `security`, `slow`.
- Her test **kendi verisini benzersiz** kursun (email/public_id çakışmasın — DB session boyunca paylaşılır).

---

## 4. Önceliklendirilmiş Yol Haritası

> Her batch'ten sonra kapsamı ölç, regresyon yoksa commit'le.

### TIER 1 — Kritik akışlar (bir bug = gerçek zarar) 🔴
| Alan | Şu an | Hedef test örnekleri |
|------|-------|----------------------|
| Auth: login / register / verify / forgot-reset | main %21 | başarılı + hatalı şifre + doğrulanmamış + rate-limit + silinmiş hesap |
| 2FA / OAuth / SSO / OIDC | 36/49/32/21% | setup-confirm-validate, geçersiz state, callback |
| Kayıt akışı (`/events/{id}/register`) | main %21 | KVKK onayı, e-posta doğrulama, kota, kapasite |
| Sertifika üretimi & doğrulama (`/verify/{uuid}`) | generator %54 | issue → verify → revoke; watermark |
| Ödeme webhook'ları | payments %70 | imza/timestamp reddi (replay), idempotency |
| **IDOR / izin sınırları** | dağınık | org A ↔ org B izolasyonu; rol bazlı 403 |
| API key auth (`get_current_user` hc_ path) | services %39 | geçerli/expired/iptal key, rate-limit |

### TIER 2 — En büyük test edilmemiş modüller 🟡
| Modül | Satır | Kapsam |
|-------|-------|--------|
| `event_crm_api` | 1069 | %28 |
| `email_api` | 625 | %19 |
| `audience_segments_api` | 536 | %25 |
| `mcp_server` | 522 | %21 |
| `notification_integrations_api` | 531 | %38 |
| `quiz_api` | 322 | %24 |

### TIER 3 — Geri kalan API'ler + edge case'ler 🟢
analytics (%14), learning_path (%23), community (%21), org_analytics (%25), connections, lead_forms, marketplace, vb.

### Kapsam hedefleri
- Kısa vade: kritik akışlar **route handler kapsamı %21 → %50+**.
- Orta vade: toplam **%41 → %65+**; her *_api modülü ≥ %50.
- Yeni eklenen her endpoint için en az 1 happy-path + 1 auth/hata testi (PR kuralı).

---

## 5. Routers Refactor'ü ile İlişki (önemli)

God-dosya bölmenin son adımı (Adım 4d — `routers/`) route handler'ları taşıyacak. **Bu testleri ÖNCE yazmak** o refactor'ü çok daha güvenli yapar: route davranışı testlerle kilitlenince, handler'lar taşınırken regresyonlar anında yakalanır. Bu yüzden sıra: **Tier 1 testleri → routers ayıklaması.**

---

## 6. İlerleme Takibi
Her batch sonrası bu komutla kapsamı kaydet ve karşılaştır:
```bash
docker run --rm heptacert-backend-test python -m pytest -o addopts="" -p no:cacheprovider --cov=src --cov-report=term 2>&1 | grep -E "TOTAL|<modül>"
```
Baseline (2026-06-14): **TOTAL 22769 stmt, 13444 miss, %41** · main.py %21 · services.py %39.

### İlerleme kaydı
- **2026-06-15:** +40 test (402→442). Bulgular: **2 gerçek bug bulundu+düzeltildi** — (1) analytics CSV/XLSX export 500 (`att.checked_in_at` yok); (2) CRM entegrasyon DELETE persist etmiyordu (3 sağlayıcıda da; JSONB plain kolon + yerinde mutation → SQLAlchemy snapshot bozulması, deepcopy ile çözüldü). Modül kapsamı: analytics %14→%20, event_crm_api %28→%31. TOTAL ~%41 (büyük modüllerin derin branch'leri hâlâ açık).
- **Gerçek:** derin-per-modül ~8-12 test → o modülde +3-6%, ama feature-zengin veri kurulumu emek ister. 41→55 hedefi ~10+ modül = çok-oturumluk. **En yüksek pratik değer: bug bulma** (2 batch'te 1 kesin + 1 olası bug). "Test everything" için en hızlı yol smoke-test taramasıdır (bkz. Bölüm 4 notu).
