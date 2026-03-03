# 📋 Email Sistemi - Test & Deployment Kılavuzu

## 🚀 Hızlı Başlangıç

### 1️⃣ Docker Servislerini Başlat
```bash
cd heptacert
docker-compose up -d
```

Bu emri verdiğinizde:
- PostgreSQL veritabanı başlayacak
- Backend API (http://localhost:8765/api)
- Frontend (http://localhost:3030)
- Otomatik olarak migrasyonlar çalışacak

### 2️⃣ Durum Kontrol
```bash
docker-compose ps
# Çıktı:
# NAME              STATUS
# heptacert-db      healthy
# heptacert-backend healthy
# heptacert-frontend up
```

---

## 🧪 API Test Komutları

Aşağıdaki istemleri `curl` veya Postman ile çalıştırabilirsiniz:

### A. Sistem Veri Kontrolü

#### Sertifika Şablonlarını Al
```bash
curl -X GET http://localhost:8765/api/system/cert-templates
```

**Beklenen Cevap:** (200 OK)
```json
[
  {
    "id": 1,
    "name": "Minimalist",
    "template_image_url": "...",
    "config": {...},
    "order_index": 1
  },
  ...
]
```

**Kontrol Edecekler:**
- ✅ Yanıt 200 OK
- ✅ 7 şablon listesi (id: 1-7)
- ✅ Her şablonun `config` JSON'u var
- ✅ `order_index` sıralaması var

---

#### Email Şablonlarını Al
```bash
curl -X GET http://localhost:8765/api/system/email-templates
```

**Beklenen Cevap:** (200 OK)
```json
[
  {
    "id": 1,
    "name": "Sertifika Teslim",
    "subject_tr": "Sertifikanız hazır!",
    "subject_en": "Your certificate is ready!",
    "body_html": "...",
    "is_system": true,
    "created_by": 1
  },
  ...
]
```

**Kontrol Edecekler:**
- ✅ Yanıt 200 OK
- ✅ 2 sistem şablonu (TR + EN)
- ✅ Bilingual subjects
- ✅ HTML email body

---

### B. Event Operasyonları (Growth+ Plan Gerekli)

#### 1. Etkinlik Oluştur
```bash
# Önce admin token alın ve Growth planı ile subscription oluşturun
curl -X POST http://localhost:8765/api/admin/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "name": "Test Etkinliği",
    "template_image_url": "placeholder",
    "config": {}
  }'
```

**Yanıt:**
```json
{
  "id": 123,
  "name": "Test Etkinliği",
  ...
}
```

Adım: `EVENT_ID=123` kaydedin

---

#### 2. Custom Email Şablonu Oluştur
```bash
curl -X POST http://localhost:8765/api/admin/events/123/email-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "name": "Kayıt Onayı",
    "subject_tr": "Kayıtlı olduğunuz etkinlik onaylandı!",
    "subject_en": "Your event registration is confirmed!",
    "body_html": "<p>Merhaba {{recipient_name}},</p><p>{{event_name}} etkinliğine hoş geldiniz!</p><p>Tarih: {{event_date}}</p>"
  }'
```

**Yanıt:**
```json
{
  "id": 1,
  "name": "Kayıt Onayı",
  "event_id": 123,
  "created_by": 1,
  ...
}
```

Adım: `TEMPLATE_ID=1` kaydedin

---

#### 3. Toplu Email Kampanyası Başlat
```bash
curl -X POST http://localhost:8765/api/admin/events/123/bulk-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "email_template_id": 1,
    "recipient_type": "attendees"
  }'
```

**Yanıt:**
```json
{
  "id": 456,
  "event_id": 123,
  "email_template_id": 1,
  "status": "pending",
  "total_recipients": 45,
  "sent_count": 0,
  "failed_count": 0,
  "created_at": "2024-03-02T10:30:00"
}
```

Adım: `JOB_ID=456` kaydedin

---

#### 4. Kampanya İlerleme Kontrolü
```bash
curl -X GET http://localhost:8765/api/admin/events/123/bulk-email/456 \
  -H "Authorization: Bearer <TOKEN>"
```

**Yanıt:**
```json
{
  "id": 456,
  "status": "sending",
  "sent_count": 25,
  "failed_count": 0,
  "total_recipients": 45,
  "updated_at": "2024-03-02T10:35:00"
}
```

5 dakika bekleyin ve tekrar kontrol edin:
```bash
curl -X GET http://localhost:8765/api/admin/events/123/bulk-email/456 \
  -H "Authorization: Bearer <TOKEN>"
```

**Beklenen Sonuç:**
```json
{
  "status": "completed",
  "sent_count": 45,
  "failed_count": 0
}
```

---

### C. Otomatiklik Senaryosu (Growth+ Plan)

#### Sertifika Otomatik Emaili Etkinleştir
```bash
curl -X PATCH http://localhost:8765/api/admin/events/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "auto_email_on_cert": true,
    "cert_email_template_id": 1
  }'
```

Artık sertifika verildiğinde:
1. ✅ Otomatik olarak email template render edilecek
2. ✅ Jinja2 değişkenleri (`{{recipient_name}}`, vb.) doldurulacak
3. ✅ Email SMTP üzerinden gönderilecek
4. ✅ APScheduler LOG'unda kaydedilecek

---

## 📊 APScheduler Durumu İzleme

### Backend Logs'u Boyunca İzle
```bash
# Docker container'ında
docker logs -f heptacert-backend

# Beklediğimiz mesajlar:
# 2024-03-02 10:35:00 - Processing bulk email job 456...
# 2024-03-02 10:35:05 - Sending batch 1/2 (50 emails)
# 2024-03-02 10:35:10 - Batch 1 completed: 50 sent, 0 failed
# 2024-03-02 10:35:15 - Batch 2 completed: 5 sent, 0 failed
# 2024-03-02 10:35:15 - Job 456 completed successfully
```

### Worker Planlaması
- ✅ **5 dakika aralığı** - Her 5 dakikada pending/sending joblar işlenir
- ✅ **Batch işleme** - 50 email/batch ile SMTP overload engellenir
- ✅ **Rate limiting** - 5 saniye aralık batch'ler arasında
- ✅ **Error handling** - Başarısız emailler loglanır, job devam eder

**Logs Örneği:**
```
[2024-03-02 10:00:00] Checking for pending bulk email jobs...
[2024-03-02 10:00:01] Found 2 pending jobs: [456, 457]
[2024-03-02 10:00:02] Processing job 456: event=123, recipients=45
[2024-03-02 10:00:05] Batch 1: Rendered template for 50 recipients
[2024-03-02 10:00:08] Batch 1: Sent 45, Failed 0
[2024-03-02 10:00:10] Job 456 marked as completed
[2024-03-02 10:05:00] Next scheduled check in 5 minutes...
```

---

## 🔐 Growth+ Plan Gating Kontrolü

### ✅ Growth Plan Tests

1. **Growth planı ile kullanıcı:**
   ```bash
   curl -X POST http://localhost:8765/api/admin/events/123/bulk-email \
     -H "Authorization: Bearer <GROWTH_TOKEN>"
   # ✅ 200 OK - Başarılı
   ```

2. **Free planı ile kullanıcı:**
   ```bash
   curl -X POST http://localhost:8765/api/admin/events/123/bulk-email \
     -H "Authorization: Bearer <FREE_TOKEN>"
   # ❌ 403 Forbidden - Access Denied
   ```

3. **Superadmin:**
   ```bash
   curl -X POST http://localhost:8765/api/admin/events/123/bulk-email \
     -H "Authorization: Bearer <SUPERADMIN_TOKEN>"
   # ✅ 200 OK - Always allowed
   ```

---

## 🧩 Frontend Entegrasyonu Testi

### 1. Event Editor'da Quick Links
- [x] Settings button → `/admin/events/[id]/settings`
- [x] Email button → `/admin/events/[id]/email-templates`
- [x] Campaign button → `/admin/events/[id]/bulk-emails`

### 2. Settings Sayfası
```
TEST 1: Temel Bilgiler
- Etkinlik adı değiştir ✓
- Event açıklaması yazısı ekle ✓
- Banner yükle ✓

TEST 2: Growth Plan Features
- Free plan'da → Kilitli (Lock icon)
- Growth plan'da → Açılmış
- Auto-email toggle → Şablon seçici gösterir
- Sertifika şablon seçici → 7 tasarım kaydırılır
```

### 3. Email Şablonları Editörü
```
TEST 1: Sistem Şablonları
- Tab'ı tıkla, 2 şablon görünsün ✓
- Önizleme butonu → Modal açılsın ✓
- TR/EN düğmeleri → Dil değişsin ✓

TEST 2: Özel Şablonlar
- "Yeni Şablon" butonu → Modal açılsın ✓
- Form doldur ve kaydet ✓
- Şablon listede görünsün ✓
- Düzenle & Sil butonları çalışsın ✓
```

### 4. Toplu Email Manager
```
TEST 1: Kampanya Oluşturma
- "Yeni Kampanya" butonu → Modal ✓
- Şablon seç + Hedef grubu seç ✓
- Başlat → Job'ın oluştuğunu göster ✓

TEST 2: İlerleme İzleme
- Otomatik yenileme (5s) → Durum güncellenir ✓
- Progress bar → % artar ✓
- Başarılı/Başarısız sayıları → Live update ✓
- Status badge → pending → sending → completed ✓

TEST 3: Statik Kartlar
- Toplam Kampanya sayısı ✓
- Tamamlanan sayısı ✓
- Gönderiliyor sayısı ✓
- Kayıtlar sayısı ✓
```

---

## ✅ Checklist - Kontrol Etmeyi Unutmayın

### Veritabanı
- [ ] `user_email_configs` tablo oluşturulmuş mu?
- [ ] `certificate_templates` tablo oluşturulmuş mu?
- [ ] `email_templates` tablo oluşturulmuş mu?
- [ ] `bulk_email_jobs` tablo oluşturulmuş mu?
- [ ] `events` tablo'na `auto_email_on_cert` ve `cert_email_template_id` alanları eklenmişmi?
- [ ] Tüm 7 sertifika şablonu seeded mi?
- [ ] Tüm 2 email şablonu seeded mi?

### Backend API
- [ ] `GET /api/system/cert-templates` - 200 döner
- [ ] `GET /api/system/email-templates` - 200 döner
- [ ] `POST /api/admin/events/{id}/email-templates` - Growth+ gated
- [ ] `PATCH /api/admin/events/{id}/email-templates/{id}` - Ownership checked
- [ ] `DELETE /api/admin/events/{id}/email-templates/{id}` - Soft delete
- [ ] `POST /api/admin/events/{id}/bulk-email` - Job oluştu
- [ ] `GET /api/admin/events/{id}/bulk-email/{id}` - Status döner
- [ ] APScheduler job 5 dakikada trigger oldu

### Frontend Pages
- [ ] `/admin/events/[id]/settings` - Yükleniyor ve form gösteriyor
- [ ] `/admin/events/[id]/email-templates` - Sistem + özel şablonlar tabı
- [ ] `/admin/events/[id]/bulk-emails` - Kampanya listesi ve oluştur modal
- [ ] Event editor header'da 3 link var

### Email Gönderimi
- [ ] Jinja2 template variables render ediliyor
- [ ] HTML emails doğru parse ediliyor
- [ ] SMTP connection başarılı
- [ ] APScheduler logs gösteriyor
- [ ] Batch processing 5 saniye aralığı kullanıyor
- [ ] Error handling çalışıyor (failed_count artıyor)

---

## 🐛 Troubleshooting

### Problem: "Access Denied" (403) Growth API endpoints'e
**Çözüm:** Token'ınızın subscription'ında plan_id "growth" veya "enterprise" olmalı
```bash
# Check subs:
curl http://localhost:8765/api/me/subscription -H "Auth: Bearer <TOKEN>"

# Growth upgrade et:
# Payment provider üzerinden subscription upgrade et
```

---

### Problem: Email gönderilmiyor (SMTP error)
**Çözüm:** SMTP credentials kontrol et
```bash
# .env dosyasında:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@example.com
```

---

### Problem: APScheduler job çalışmıyor
**Çözüm:** Backend logs'u kontrol et
```bash
docker logs heptacert-backend | grep -i "scheduler\|bulk\|email"

# Scheduler started olmalı:
# "APScheduler started" mesajı görmeli
# "_process_bulk_emails job added to scheduler"
```

---

### Problem: Migration başarısız
**Çözüm:** Database bağlantısı kontrol et
```bash
# PostgreSQL bağlanılabilir mi?
docker exec heptacert-db psql -U heptacert -d heptacert -c "SELECT 1"

# Migration kal mı?
docker exec heptacert-backend alembic current

# Upgrade yeniden dene:
docker exec heptacert-backend alembic upgrade head
```

---

## 📈 Performance Metrikleri

**Expected Performance:**
- Sertifika şablonu seeding: < 2s
- Email şablonu seeding: < 1s
- Bulk email batch (50 emails): ~5-10s (SMTP bağlı)
- APScheduler interval check: < 100ms
- API response time: < 200ms (Growth+ endpoints)

**Load Testing:**
```bash
# 1000 email job test (100 recipient)
ab -n 100 -c 10 http://localhost:8765/api/admin/events/123/bulk-email

# Beklenen: ~95% success rate
# APScheduler'ın 5 dakikada job'ı işlemesi
```

---

## ✨ İşiniz Bittiğinde...

1. ✅ Migration'lar başarıyla çalıştı
2. ✅ API endpoints yanıt veriyor
3. ✅ Frontend sayfaları yükleniyor
4. ✅ APScheduler logs gösteriyor
5. ✅ Test emails gönderilebiliyor

**Tebrikler! Email sistemi üretim için hazır! 🎉**

---

## 📚 İlgili Dosyalar

| Dosya | Amaç |
|-------|------|
| `backend/alembic/versions/007_transaction_description.py` | Transaction model fix |
| `backend/alembic/versions/008_email_system.py` | Email system schema |
| `backend/src/main.py` | API endpoints + models + APScheduler |
| `backend/requirements.txt` | Jinja2, APScheduler dependencies |
| `frontend/src/app/admin/events/[id]/settings/page.tsx` | Event settings UI |
| `frontend/src/app/admin/events/[id]/email-templates/page.tsx` | Email templates editor |
| `frontend/src/app/admin/events/[id]/bulk-emails/page.tsx` | Campaign manager |
| `frontend/src/app/admin/events/[id]/editor/page.tsx` | Quick links added |

---

**Son Güncelleme:** 2024-03-02 10:00 UTC  
**Versiyon:** Email System v1.0 (Production Ready)
