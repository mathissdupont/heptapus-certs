# HeptaCert — Kapsamlı SaaS Geliştirme Planı

## Bağlam

HeptaCert, olgun bir event yönetimi + sertifika platformu. Backend (FastAPI + PostgreSQL + Redis) ve frontend (Next.js 15) sağlam. 
Hedef: Kurumsal eğitim sektöründe ciddi bir SaaS'a dönüşmek — LMS, güçlü CRM, entegrasyon ekosistemi ve analitik derinliği ile.

Her faz bağımsız deploy edilebilir, önceki fazın üzerine inşa eder.

---

## ✅ FAZ 1: Quiz / Sınav Motoru & Sertifika Bağlantısı — TAMAMLANDI 2026-06-06

### Neden Önce Bu?
Sertifika platformunun en eksik halkası: şu an sertifika sadece event attendance'a bağlı. Sınav bazlı sertifika olmadan kurumsal eğitim müşterisi gelmez.

### Backend Değişiklikler

**Yeni Modeller** (`main.py` içine veya `quiz_api.py` yeni dosya):
```python
Quiz               # event_id, passing_score(int), max_attempts, time_limit_minutes
QuizQuestion       # quiz_id, question_text, question_type(mcq/true_false/open), order, points
QuizChoice         # question_id, choice_text, is_correct
QuizAttempt        # quiz_id, participant_id/member_id, score, passed, started_at, completed_at, attempt_number
QuizAnswer         # attempt_id, question_id, selected_choice_id, open_text_answer
```

**Yeni API Dosyası:** `heptacert/backend/src/quiz_api.py`
- `POST /events/{event_id}/quiz` — quiz oluştur (admin)
- `GET /events/{event_id}/quiz` — quiz detayı (admin + public)
- `POST /events/{event_id}/quiz/questions` — soru ekle/düzenle
- `POST /events/{event_id}/quiz/attempt` — sınav başlat (üye)
- `POST /events/{event_id}/quiz/attempt/{attempt_id}/submit` — cevapları gönder, otomatik puanla, sertifika tetikle
- `GET /events/{event_id}/quiz/results` — admin: tüm sonuçlar
- `GET /events/{event_id}/quiz/my-result` — üye: kendi sonucu

**`main.py` Event modeline eklenecek alanlar:**
- `quiz_required: bool = False`
- `quiz_pass_to_get_cert: bool = False`

**`generator.py` entegrasyonu:**
- QuizAttempt.passed == True olduğunda mevcut `generate_certificate()` tetiklensin

### Frontend Değişiklikler

**Yeni Sayfalar:**
- `/admin/events/[id]/quiz` — Quiz builder (soru ekle, düzenle, sıralama, puan)
- `/events/[id]/quiz` — Üye: sınava giriş, sayaç, soru ekranı, sonuç
- `/events/[id]/quiz/result` — Skor, geçti/kaldı, sertifika linki

**Mevcut sayfa değişikliği:**
- `/admin/events/[id]/settings` — "Sertifika için sınav zorunlu" toggle ekle

### Alembic Migration: `quiz_tables`

---

## ✅ FAZ 2: Learning Path (Öğrenme Yolu) Builder — TAMAMLANDI 2026-06-06

### Neden Önce CRM'den?
LMS'in olmadığı bir CRM derinleştirmesi kurumsal satışta boşlukta kalır. Learning Path, quiz motoru üzerine inşa eder.

### Backend Değişiklikler

**Yeni Modeller:**
```python
LearningPath            # org_id, name, description, published, thumbnail_url
LearningPathStep        # path_id, event_id, order, required(bool), min_score_override
LearningPathEnrollment  # path_id, member_id, enrolled_at, completed_at, progress_pct
LearningPathStepCompletion  # enrollment_id, step_id, completed_at, certificate_id
```

**Yeni API:** `heptacert/backend/src/learning_path_api.py`
- CRUD for paths + steps
- `POST /learning-paths/{id}/enroll` — üye kayıt
- `GET /learning-paths/{id}/progress` — adım adım ilerleme
- Ön koşul kontrolü: önceki adım tamamlanmadan sonraki açılmasın

### Frontend Değişiklikler
- `/admin/learning-paths` — Path listesi, yeni oluştur
- `/admin/learning-paths/[id]` — Drag-drop step builder (event seç, sıra belirle, zorunlu/opsiyonel)
- `/learning-paths` — Üye: katalog
- `/learning-paths/[id]` — Üye: adım takibi, ilerleme çubuğu

---

## FAZ 3: CRM — Company/Account Katmanı
**Tahmini Süre: 4-5 gün**

### Mevcut Durum
`event_crm_api.py` + `ParticipantCrmProfile` var ama sadece bireysel kişi. Kurumsal satış için şirket bazlı görünüm şart.

### Backend Değişiklikler

**Yeni Modeller** (`main.py`'e ekle):
```python
CrmAccount          # org_id, name, domain, industry, size_bucket, owner_user_id, annual_value, notes, tags, status
CrmAccountContact   # account_id, participant_crm_profile_id, role, is_primary
CrmDeal             # account_id, org_id, name, stage, amount, expected_close_date, owner_user_id
CrmDealActivity     # deal_id, type(note/call/email/meeting), content, user_id, activity_at
```

**Yeni API:** `heptacert/backend/src/crm_accounts_api.py`
- CRUD accounts + contacts
- `GET /crm/accounts/{id}/timeline` — tüm etkileşim geçmişi
- Deal pipeline CRUD

**Mevcut `event_crm_api.py` değişikliği:**
- `ParticipantCrmProfile` modeline `account_id: Optional[FK]` ekle

### Frontend Değişiklikler
- `/admin/crm/accounts` — Şirket listesi (TanStack Table, mevcut pattern)
- `/admin/crm/accounts/[id]` — Şirket detayı: kişiler, deal'lar, aktivite timeline
- `/admin/crm/pipeline` — Kanban board (deal aşamaları: Lead/Qualified/Proposal/Won/Lost)
- Mevcut `/admin/events/[id]/crm` sayfasına "Şirket" sütunu + link ekle

---

## ✅ FAZ 4: Sequence (Damla Kampanya) Frontend — TAMAMLANDI 2026-06-06

**Tahmini Süre: 2-3 gün**

### Mevcut Durum
`crm_sequences_api.py` backend'de mevcut. Frontend hiç yok. En az eforla en yüksek etki.

### Frontend Değişiklikler (Backend DEĞİŞMEYECEK)
- `/admin/crm/sequences` — Sequence listesi
- `/admin/crm/sequences/new` — Builder:
  - Step 1: Tetikleyici seç (event katıldı, sertifika aldı, tag eklendi...)
  - Step 2+: Gecikme (3 gün) + Aksiyon (mail gönder, tag ekle, webhook)
  - Preview: hedef kitle sayısı (mevcut dry-run endpoint'i kullan)
- Sequence analitik: gönderilen, açılan, başarısız

**Mevcut API endpoint'leri kullanılacak** — sadece UI yazılacak.

---

## FAZ 5: Lead Capture Formları
**Tahmini Süre: 3-4 gün**

### Backend Değişiklikler

**Yeni Modeller:**
```python
LeadCaptureForm     # org_id, name, fields_json, destination(crm/segment), auto_tag, redirect_url
LeadCaptureSubmission  # form_id, data_json, source_url, utm_source, utm_medium, ip_addr, submitted_at
```

**Yeni API:** `heptacert/backend/src/lead_forms_api.py`
- CRUD forms
- `POST /public/forms/{form_slug}/submit` — public endpoint, auth yok
- Submission → ParticipantCrmProfile otomatik oluştur/güncelle + tag ekle

### Frontend Değişiklikler
- `/admin/lead-forms` — Form listesi
- `/admin/lead-forms/[id]` — Form builder (alan tipi: text/email/tel/dropdown/checkbox)
- `/admin/lead-forms/[id]/embed` — `<iframe>` embed kodu + standalone link
- `/public/forms/[slug]` — Public form sayfası (auth gerektirmez)

---

## FAZ 6: Slack & Microsoft Teams Entegrasyonu
**Tahmini Süre: 2-3 gün**

### Mevcut Altyapı
`webhooks.py` + `WebhookEndpoint` modeli + HMAC signing mevcut. Bunun üzerine inşa edilecek.

### Backend Değişiklikler

**`notification_integrations_api.py` genişletme:**
- Slack Incoming Webhook URL saklama (org bazlı)
- Teams Webhook URL saklama
- Bildirim tipi seçimi: `cert_issued`, `event_attended`, `training_overdue`, `new_lead`
- Mevcut `automation_api.py` dispatch sistemi ile entegre et

**Yeni servis:** `heptacert/backend/src/slack_teams_notify.py`
- `send_slack_message(webhook_url, event_type, payload)` — Block Kit formatında
- `send_teams_message(webhook_url, event_type, payload)` — Adaptive Card formatında

### Frontend Değişiklikler
- `/admin/integrations` sayfasına Slack/Teams kartları ekle (mevcut sayfa var)
- Webhook URL girişi + test mesajı gönder butonu
- Hangi olayları bildireceğini seçme (checkbox listesi)

---

## FAZ 7: WhatsApp Business API Entegrasyonu
**Tahmini Süre: 3-4 gün**

### Backend Değişiklikler

**Yeni Modeller:**
```python
WhatsAppConfig      # org_id, api_provider(360dialog/waba_cloud), api_key_encrypted, phone_number_id
WhatsAppTemplate    # org_id, wa_template_name, wa_language, local_name, variables_json
WhatsAppLog         # org_id, recipient_phone, template_name, status, sent_at, error_msg
```

**Yeni servis:** `heptacert/backend/src/whatsapp_api.py`
- 360dialog veya Meta Cloud API destekli
- Template message gönderimi (sertifika linki, etkinlik hatırlatması)
- Otomasyon action'larına "WhatsApp gönder" seçeneği ekle

### Frontend Değişiklikler
- `/admin/integrations` → WhatsApp konfigürasyon kartı
- Otomasyon builder'a "WhatsApp Gönder" aksiyonu

---

## FAZ 8: Gelişmiş Analitik Dashboard
**Tahmini Süre: 4-5 gün**

### Mevcut Durum
`analytics_api.py` event bazlı var. Org-wide, gelir, eğitim analitiği yok.

### Backend Değişiklikler

**`analytics_api.py` genişletme:**
- `GET /analytics/org/overview` — toplam cert, event, member, email metriği
- `GET /analytics/org/revenue` — plan bazlı gelir, MRR tahmini (süperadmin)
- `GET /analytics/org/training-compliance` — dept bazlı tamamlanma ısı haritası
- `GET /analytics/org/learning-paths` — enrollment, completion funnel
- `GET /analytics/org/crm` — lead→müşteri dönüşüm oranı, pipeline değeri

**Scheduled reports:** APScheduler'a haftalık özet job ekle

### Frontend Değişiklikler
- `/admin/dashboard` sayfasını yeniden tasarla — sekme bazlı:
  - Genel Bakış (mevcut)
  - Eğitim & Uyum (yeni)
  - CRM & Satış (yeni)
  - E-posta Performansı (mevcut analytics'i buraya taşı)
- Recharts veya mevcut Framer Motion ile görselleştirme

---

## FAZ 9: Rapor Planlama & PDF İhracat
**Tahmini Süre: 2-3 gün**

### Backend Değişiklikler

**Mevcut altyapı:** `document_export_jobs.py` + `SegmentExportJob` var. Bunun üzerine inşa et.

**Yeni Model:**
```python
ScheduledReport     # org_id, name, report_type, filters_json, frequency(daily/weekly/monthly), recipients_json, last_run_at
```

**APScheduler job:** Her gece scheduled report'ları kontrol et → PDF üret (Pillow/pandas mevcut) → email gönder

### Frontend Değişiklikler
- `/admin/reports` — Yeni sayfa
- Rapor tipi seç → filtreler → alıcılar → zamanlama
- Son çalışma geçmişi

---

## FAZ 10: Sertifika Marketplace (Public Katalog)
**Tahmini Süre: 3-4 gün**

### Backend Değişiklikler

**Event modeline eklenecek:**
- `is_marketplace_listed: bool = False`
- `marketplace_category: str`
- `marketplace_description: str`
- `marketplace_price: Optional[Decimal]`

**Yeni API:** `GET /marketplace/events` — public, auth yok, filtrelenebilir

### Frontend Değişiklikler
- `/marketplace` — Public sertifika kataloğu (kategori, organizasyon, ücretsiz/ücretli filtresi)
- `/marketplace/[event_id]` — Detay + kayıt CTA
- `/admin/events/[id]/settings` — "Marketplace'te listele" toggle
- SEO: Static generation ile marketplace sayfaları (Next.js generateStaticParams)

---

## FAZ 11: Developer API Portal
**Tahmini Süre: 2-3 gün**

### Mevcut Altyapı
FastAPI otomatik `/docs` (Swagger) üretiyor. API key sistemi (`ApiKey` modeli) mevcut.

### Backend Değişiklikler
- `ApiKey` modeline `scopes: list[str]` ekle (read:certs, write:events, vb.)
- `/api/v1/` prefix ile public API endpoint'leri işaretle
- Rate limit: API key başına (mevcut slowapi altyapısı)

### Frontend Değişiklikler
- `/admin/settings/api` sayfası — API key yönetimi UI (mevcut `/admin/settings` genişletme)
- `/developers` — Public sayfa: API dokümantasyonu, kullanım örnekleri, rate limit tablosu
- Swagger embed veya Redoc embed

---

## FAZ 12: Akreditasyon & MYK/CPD Modülü
**Tahmini Süre: 4-5 gün**

### Backend Değişiklikler

**Yeni Modeller:**
```python
AccreditationBody   # name, short_code(MYK/SMMM/TMMOB), logo_url, verification_url_pattern
OrgAccreditation    # org_id, body_id, accreditation_number, valid_from, valid_until, documents_json
EventCpdConfig      # event_id, body_id, cpd_hours, cpd_category, cpd_unit_type
MemberCpdLog        # member_id, event_id, body_id, cpd_hours, earned_at, certificate_id
```

**Sertifika generator değişikliği (`generator.py`):**
- CPD saati + akreditasyon logosu opsiyonel olarak sertifikaya basılsın

**Yeni API:** `heptacert/backend/src/accreditation_api.py`
- Org akreditasyon kaydı CRUD
- Üye CPD özeti: toplam saat, kurum bazlı dökümü
- CPD transcript PDF ihracat

### Frontend Değişiklikler
- `/admin/accreditation` — Akreditasyon kayıtları
- `/admin/events/[id]/settings` → CPD saati ekle, akreditasyon seç
- Üye profili → "CPD Geçmişim" sekmesi

---

## Teknoloji Kararları

| Karar | Seçim | Neden |
|---|---|---|
| Quiz timer | Frontend countdown (JS), backend validates submitted_at | Sunucu saatine güven |
| Kanban board | Mevcut react-draggable (package.json'da var) | Ek paket yok |
| WhatsApp provider | 360dialog öncelikli, Meta Cloud fallback | TR'de 360dialog yaygın |
| Charts | Recharts (eklenecek) veya CSS-only | Framer Motion ağır |
| Rapor PDF | Mevcut Pillow + WeasyPrint ekle | Pillow sertifika için zaten var |
| Marketplace SEO | Next.js generateStaticParams | Mevcut app router pattern |

---

## Uygulama Sırası (Bağımlılık Grafiği)

```
FAZ 1 (Quiz)
  └── FAZ 2 (Learning Path)  ← Quiz tamamlanmalı
        └── FAZ 8 (Analitik)  ← LP verisi gerekli

FAZ 3 (CRM Accounts)
  └── FAZ 4 (Sequences Frontend)  ← Account verisi bağlı
        └── FAZ 5 (Lead Forms)   ← CRM hedef olarak

FAZ 6 (Slack/Teams)  ← Bağımsız
FAZ 7 (WhatsApp)     ← Bağımsız, FAZ 6'dan sonra mantıklı

FAZ 9 (Rapor)        ← FAZ 8 (Analitik) sonrası
FAZ 10 (Marketplace) ← Bağımsız
FAZ 11 (API Portal)  ← Bağımsız
FAZ 12 (Akreditasyon) ← FAZ 1 (Quiz) + FAZ 2 (LP) sonrası
```

---

## Doğrulama Kriterleri (Her Faz İçin)

- Backend: Alembic migration başarılı, API endpoint'leri Swagger'da görünür
- Frontend: Sayfalar hatasız render, mevcut sayfalar bozulmadı
- Integration: Sertifika tetikleyicileri (quiz pass, LP complete) gerçek PDF üretiyor
- Security: Yeni public endpoint'ler rate limit + input validation içeriyor
- i18n: Yeni UI metinleri hem TR hem EN locale dosyalarına eklendi

---

## Kritik Dosyalar

- `heptacert/backend/src/main.py` — Model tanımları buraya veya ayrı modül
- `heptacert/backend/src/generator.py` — Sertifika tetikleme hook noktası  
- `heptacert/backend/src/automation_api.py` — Yeni aksiyonlar buraya entegre
- `heptacert/backend/src/analytics_api.py` — Genişletilecek
- `heptacert/frontend/src/lib/api.ts` — Yeni endpoint wrapper'ları
- `heptacert/frontend/src/locales/` — TR + EN çeviriler
- `heptacert/backend/alembic/versions/` — Her faz için yeni migration
