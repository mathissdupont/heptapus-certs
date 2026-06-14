# Sistem Temizliği & Teknik Borç Oturumu — Durum / Devir Notu

> **Amaç:** Güvenlik açıkları, atıl (kullanılmayan) kod, "backend var ama frontend'de yok" boşlukları ve spagetti/teknik borcun temizlenmesi.
> **Bu dosya:** Nerede kalındı, ne yapıldı, ne kaldı ve nasıl yapılacağı. Oturum biterse buradan devam edilir.
> **Son güncelleme:** 2026-06-14

---

## 0) DOĞRULAMA NASIL YAPILIR (her değişiklikten sonra)

Backend yerelde bağımlılıksız çalışmıyor (deps yalnızca Docker'da). Test için:

```bash
cd heptacert/backend
docker build -q -t heptacert-backend-test .          # kod değişince yeniden build (pip cache'li, hızlı)
docker run --rm heptacert-backend-test python -m pytest -o addopts="" -p no:cacheprovider -q
```

- `pytest.ini` içinde `-x` var (ilk hatada durur); tüm hataları görmek için yukarıdaki gibi `-o addopts=""` ile override et.
- Testler **SQLite in-memory** kullanır (PostgreSQL gerekmez); env'leri `tests/conftest.py` ayarlar.
- **BASELINE (bu notun yazıldığı an): 392 passed, 10 failed.** Kalan 10 = bayat testler (aşağıda).
- Refactor kapısı: "yeni hata çıkmadı" = hâlâ tam olarak bu 10 (veya daha az) hata.

---

## 1) TAMAMLANAN İŞ (commit'lendi)

Git log (yeni → eski), hepsi `main` üzerinde:
```
a2c3098 test: fix stale test (require_email_verification)
c6d0061 fix: restore SQLite compatibility so the test suite can run
8d92854 docs: add phased main.py refactor plan
c84c1b0 chore: archive disabled LMS subsystem
2ae95a1 fix: add auth to accreditation bodies endpoint + fix email-preferences 404
```

### FAZA 1 — Güvenlik (denetlendi, sağlam)
- CORS, security headers, JWT (secret min-32, exp), login rate-limit (5/dk), file upload (path-traversal + ClamAV + mimetype allowlist), org-scoping — hepsi sağlam.
- **Fix:** `/api/admin/accreditation/bodies` auth'suzdu → kardeşleriyle aynı `require_role(admin, superadmin)` eklendi. ([accreditation_api.py](../heptacert/backend/src/accreditation_api.py))

### FAZA 2 — Atıl / Ölü Kod
- **LMS tamamen arşivlendi** (kasıtlı devre dışıydı): `lms_api.py`+`lms_extended_api.py` → `backend/_archive_lms/`; `courses/`(8)+`admin/lms/`(19) frontend sayfası → `frontend/_archive_lms/`. Modeller `src/`'de kaldı (marketplace bağımlı). Her arşivde README var.
- `lib/api.ts`'ten 5 öksüz LMS fonksiyonu silindi.
- Backend'de başka ölü modül yok (seed/bootstrap script'leri kasıtlı, korundu).
- TODO/FIXME envanteri: temiz (tüm projede 5 adet).

### FAZA 3 — Frontend/Backend Gap
- **email-preferences typo bug FIX:** frontend `/public/me/email-preferences` çağırıyordu, backend `/email-prefereonces` (eski `nc→onc` bozulması) sunuyordu → 404. Doğru route alias eklendi (GET+PATCH), eski path geriye dönük uyumluluk için kaldı. ([main.py:11944](../heptacert/backend/src/main.py))
- `nc→onc` bozulması: çoğu yerde değişken adı (kozmetik, çalışıyor); attendance route'larının zaten doğru alias'ı vardı; sadece email-preferences gerçekten kırıktı.

### FAZA 4 — God Dosya
- `main.py` = ~21.117 satır / 938KB, ~245 SQLAlchemy model, ~164 Pydantic şema, 230 route. Bölme planı: [docs/main_py_refactor_plan.md](main_py_refactor_plan.md).

### BONUS — Kırık SQLite Test Harness Onarıldı (büyük kazanç)
Test suite SQLite'da hiç çalışmıyordu (kimse görememiş). 3 pre-existing bug onarıldı:
1. **JSONB variant:** 5 model dosyası ham postgres `JSONB` import ediyordu → `src/db_types.py` (dialect-aware JSONB/INET) oluşturuldu, 5 dosya ona yönlendirildi. Postgres davranışı aynı.
2. **Çift index:** `lead_capture_submissions.form_id` hem `index=True` hem aynı isimli explicit `Index` → redundant olan silindi.
3. **Bayat test:** `require_email_verification` Event kwarg'ı → `config`'e taşındı.
Sonuç: **0 → 392 passed.**

---

## 2) ŞU AN: Kalan 10 Bayat Test (temizlenecek)

> Hepsi koddan sapmış testler. **Gerçek bug / güvenlik açığı YOK** (3 "güvenlik kokan" test ayrıca incelendi). Sıra: önce kolay/net olanlar.

| # | Test | Teşhis | Fix yaklaşımı | Durum |
|---|------|--------|---------------|-------|
| 1 | `test_training.py::...::test_html_escape_in_training_email` | Kod doğru escape ediyor; test `'onerror' not in escaped` diye yanlış varsayıyor (escape edilmiş metinde substring zararsız) | Assertion'ı düzelt: escaped çıktıda `<`/`>` yok / `&lt;` var şeklinde kontrol et | ⬜ |
| 2 | `test_training.py::...::test_html_in_event_name_escaped` | Aynı (yanlış `'onload' not in`) | Aynı | ⬜ |
| 3 | `test_jobs.py::...::test_stripe_rejects_expired_timestamp` | `StripeProvider(publishable_key=...)` — constructor'da artık bu param yok | Testteki constructor çağrısını güncel imzaya göre düzelt | ⬜ |
| 4 | `test_jobs.py::TestAutomationLoopProtection::test_validate_no_circular_trigger_passes_for_different_segments` | İncelenecek | İncele → muhtemelen API/sinyatür değişimi | ⬜ |
| 5 | `test_jobs.py::TestAutomationLoopProtection::test_validate_detects_duplicate_active_segment` | İncelenecek | İncele | ⬜ |
| 6 | `test_venues_api.py::test_venue_manager_can_reserve_but_cannot_manage_organization_team` | İncelenecek (izin/rol) | İncele | ⬜ |
| 7 | `test_venues_api.py::test_profile_manager_can_update_profile_but_not_venues` | İncelenecek | İncele | ⬜ |
| 8 | `test_venues_api.py::test_event_manager_sees_and_updates_organization_events` | İncelenecek | İncele | ⬜ |
| 9 | `test_api.py::TestAccountDeletionFlows::test_public_member_delete_account_removes_related_social_data` | Kod **soft-delete + anonimleştirme** yapıyor (KVKK), test eski **hard-delete** bekliyor | ⚠️ ÜRÜN KARARI gerek (aşağı bak) | ⬜ |
| 10 | `test_api.py::TestAccountDeletionFlows::test_admin_delete_account_success` | Muhtemelen aynı soft-delete semantiği | ⚠️ ÜRÜN KARARI | ⬜ |

### ⚠️ Açık Ürün Sorusu (Test #9, #10 için)
Üye/admin hesap silme `DELETE /api/public/me` ([main.py:12139](../heptacert/backend/src/main.py)) şu an: `deleted_at` set ediyor, PII anonimleştiriyor (`display_name="Silinmiş Üye"`), OrganizationFollower + CommunityPostLike siliyor. AMA post/comment/attendee'yi **silmiyor** (anonim kalıyor). Test ise hepsinin silinmesini + member'ın hard-delete olmasını bekliyor.
**Karar gerekli:** Doğru davranış soft-delete+anonimleştirme mi (testi ona göre yaz), yoksa post/comment de silinmeli mi (kod eksikse düzelt)? Sahibinin onayı olmadan tahminle yazılmamalı.

---

## 3) SONRAKİ: Schema Extraction (bayat testler bitince)

Plan: [docs/main_py_refactor_plan.md](main_py_refactor_plan.md). Sıra (her adımda Docker pytest, "yeni hata yok" kapısı):
1. **config.py** — `Settings` sınıfı (main.py:247-318) + `settings = Settings()`. main.py'da `from .config import settings, Settings` ile geri ver. En düşük risk.
2. **utils.py** — saf yardımcılar (rich-text sanitizer, token/format helper'ları).
3. **schemas/** — ~164 Pydantic `BaseModel`. main.py'da `from .schemas import *` ile isimleri koru (72 dosya `from .main import X` yapıyor → re-export şart).
4+ (ayrı oturum, daha riskli): models → db.py/models/, deps.py, routers/.

**Kritik not:** 72 dosyada 166 `from .main import ...` var → main.py merkezi hub. Bir şeyi çıkarınca main.py'da MUTLAKA geri re-export et, yoksa import zinciri kırılır. Model/relationship taşımada import sırası kritik (LMS dersi: yanlış sıra SQLAlchemy startup'ını kilitler).

---

## 4) Diğer Notlar / İleride
- `.claude/settings.json` değişikliği bana ait değil, commit edilmedi.
- Topluluk/social özelliği: backend (`community_api`+`social_api`) + component'ler (PostCard, CommentTree, CreatePostForm, ReplyForm) hazır ama **bağlayan sayfa yok** → "yazılmış ama UI'da yok". Karar: sil / bağla / bırak (kullanıcı "önce gap analizini bekle" demişti; analiz bitti, karar bekliyor).
- 10 öksüz frontend component (CommunityFeed kümesi dahil) — silinmedi, karar bekliyor.
- LMS yeniden açılırsa: `_archive_lms/README.md`'ler adım adım anlatıyor.
