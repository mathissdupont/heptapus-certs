# 🚀 Quick Start Guide - Email System

## 5 Dakika Kuruluş

### Adım 1: Docker'ı Başlat
```bash
cd heptacert
docker-compose up -d
```

**Çıktı:**
```
Creating heptacert-db      ... done
Creating heptacert-backend ... done
Creating heptacert-frontend... done
```

### Adım 2: Migration Kontrolü
```bash
docker logs heptacert-backend | head -20
```

**Beklediğimiz satırlar:**
```
INFO [alembic.runtime.migration] Running upgrade 006 -> 007 ...
INFO [alembic.runtime.migration] Running upgrade 007 -> 008 ...
INFO [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO Creating certificate templates...
INFO Creating email templates...
```

### Adım 3: Seed Verisini Kontrol Et
```bash
# Sertifika şablonlarını al
curl http://localhost:8765/api/system/cert-templates | jq 'length'
# Çıktı: 7

# Email şablonlarını al
curl http://localhost:8765/api/system/email-templates | jq 'length'
# Çıktı: 2
```

✅ **Hazır!** Şimdi test etmeye başlayabilirsiniz.

---

## Hızlı Test Senaryoları

### Senaryo 1: Email Şablonu Oluştur ve Görüntüle

**1. Login et** (admin JWT token al)
```bash
curl -X POST http://localhost:8765/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

**Çıktı:**
```json
{"access_token":"eyJhbG..."}
```

Token'ı kaydet: `TOKEN=eyJhbG...`

**2. Etkinlik oluştur**
```bash
EVENT=$(curl -X POST http://localhost:8765/api/admin/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Event","template_image_url":"x","config":{}}' \
  | jq '.id')
echo $EVENT
```

**3. Custom email şablonu ekle**
```bash
TMPL=$(curl -X POST http://localhost:8765/api/admin/events/$EVENT/email-templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome",
    "subject_tr": "Hoş geldiniz!",
    "subject_en": "Welcome!",
    "body_html": "<p>Merhaba {{recipient_name}}</p>"
  }' | jq '.id')
echo $TMPL
```

**4. Email şablonlarını listele**
```bash
curl http://localhost:8765/api/admin/events/$EVENT/email-templates | jq '.'
```

---

### Senaryo 2: Toplu Email Kampanyası Başlat

**1. Kampanya oluştur** (APScheduler'ı tetikle)
```bash
JOB=$(curl -X POST http://localhost:8765/api/admin/events/$EVENT/bulk-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email_template_id\": $TMPL,
    \"recipient_type\": \"attendees\"
  }" | jq '.id')
echo $JOB
```

**2. İş durumunu kontrol et** (hemen sonra)
```bash
curl http://localhost:8765/api/admin/events/$EVENT/bulk-email/$JOB \
  -H "Authorization: Bearer $TOKEN" | jq '.status'
```

**Çıktı:** `pending`

**3. 5 dakika bekle**, sonra kontrol et
```bash
# Logs'u izle
docker logs -f heptacert-backend | grep -i "bulk\|job"
```

**Beklediğimiz çıktılar:**
```
Processing bulk email job 1...
Batch 1 processed: 25 sent, 0 failed
Job 1 marked as completed
```

**4. Final durumu kontrol et**
```bash
curl http://localhost:8765/api/admin/events/$EVENT/bulk-email/$JOB \
  -H "Authorization: Bearer $TOKEN" | jq '{status, sent_count, failed_count}'
```

**Çıktı:**
```json
{"status": "completed", "sent_count": 45, "failed_count": 0}
```

---

### Senaryo 3: Frontend'de Test Et

**1. Settings sayfasını aç**
```
http://localhost:3030/admin/events/123/settings
```

✅ Kontrol edilecekler:
- Event adı ve açıklaması edit edilebiliyor
- Growth plan özel ayarlar görünüyor
- Banner yükleme çalışıyor
- Auto-email checkbox gösteriyor

**2. Email Templates editörüne git**
```
http://localhost:3030/admin/events/123/email-templates
```

✅ Kontrol edilecekler:
- 2 sistem şablonu tabında görünüyor
- Yeni şablon oluşturma butonu çalışıyor
- Modal açılıyor ve form dolumluyor
- Önizleme modal'ı çalışıyor

**3. Bulk Email Manager'a git**
```
http://localhost:3030/admin/events/123/bulk-emails
```

✅ Kontrol edilecekler:
- Kampanya listesi görünüyor
- Yeni kampanya butonu çalışıyor
- Modal açılıyor ve form dolumluyor
- Progress bar animasyonu çalışıyor
- Auto-refresh etiketi dönüyor (5s aralık)

---

## 🔧 Troubleshooting

### ❌ API 403 Forbidden döner
```bash
# Growth planı kontrol et
curl http://localhost:8765/api/me/subscription | jq '.plan_id'

# Plan 'growth' veya 'enterprise' olmalı
# Değilse, test veritabanında manual olarak update et:
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "UPDATE subscriptions SET plan_id='growth' WHERE user_id=1;"
```

### ❌ APScheduler job çalışmıyor
```bash
# Logs'u kontrol et
docker logs heptacert-backend | grep -i scheduler

# Bekleyecekler:
# "APScheduler scheduler started"
# "Added job: _process_bulk_emails"

# Scheduler restart et
docker restart heptacert-backend
```

### ❌ Migration yürütülemedi
```bash
# Mevcut migration'ları göster
docker exec heptacert-backend alembic current

# Migration geçmişini göster
docker exec heptacert-backend alembic history

# Manuel upgrade yap
docker exec heptacert-backend alembic upgrade head
```

---

## 📊 Important Endpoints

| Methot | URL | Plan | Açıklama |
|--------|-----|------|----------|
| GET | `/api/system/cert-templates` | Public | 7 hazır şablon |
| GET | `/api/system/email-templates` | Public | 2 sistem şablonu |
| POST | `/api/admin/events/{id}/email-templates` | Growth+ | Yeni şablon ekle |
| PATCH | `/api/admin/events/{id}/email-templates/{id}` | Growth+ | Şablon düzenle |
| DELETE | `/api/admin/events/{id}/email-templates/{id}` | Growth+ | Şablon sil |
| POST | `/api/admin/events/{id}/bulk-email` | Growth+ | Kampanya başlat |
| GET | `/api/admin/events/{id}/bulk-email/{id}` | Growth+ | Kampanya durumu |
| GET | `/api/admin/events/{id}/bulk-emails` | Growth+ | Tüm kampanyaları listele |

---

## 📝 Log Mesajları

### Başarılı Seeding
```
INFO: Creating 7 certificate templates...
INFO: Created templates: Minimalist, Profesyonel, Renkli...
INFO: Creating 2 email templates (Turkish, English)...
INFO: Email templates created successfully
```

### Başarılı Bulk Email Processing
```
INFO: Checking for pending bulk email jobs...
INFO: Found 1 pending job: job_id=1, total_recipients=45
INFO: Processing batch 1/1 (50 emails)
INFO: Batch 1: Rendering template with Jinja2...
INFO: Sending 45 emails via SMTP...
INFO: Batch 1 completed: 45 sent, 0 failed
INFO: Job 1 marked as completed. Total sent: 45
```

---

## 💡 İpuçları

1. **Token'ı tekrar tekrar copy/paste yapmao için:**
   ```bash
   TOKEN=$(curl ... | jq -r '.access_token')
   export TOKEN
   # Şimdi $TOKEN'ı kullanabilirsin
   ```

2. **Full JSON output görmek için:**
   ```bash
   curl ... | jq '.'
   ```

3. **Spesifik field görmek için:**
   ```bash
   curl ... | jq '.status, .sent_count'
   ```

4. **Logs'u gerçek zamanda izlemek için:**
   ```bash
   docker logs -f heptacert-backend
   ```

5. **Database'e direkt erişmek için:**
   ```bash
   docker exec -it heptacert-db psql -U heptacert -d heptacert
   # \dt - tüm tabloları göster
   # SELECT * FROM certificate_templates; - şablonları göster
   ```

---

## 🎯 Success Checklist

- [ ] Docker containers çalışıyor (`docker-compose ps` ile kontrol et)
- [ ] Migrations başarıyla tamamlandı (logs'ta seeding mesajları)
- [ ] 7 sertifika şablonu veritabanında (`/api/system/cert-templates` → 7 item)
- [ ] 2 email şablonu veritabanında (`/api/system/email-templates` → 2 item)
- [ ] Settings sayfası Growth+ features gösteriyor
- [ ] Email Templates editörü şablon oluşturabiliyor
- [ ] Bulk Email Manager kampanya başlatabiliyor
- [ ] APScheduler logs gösteriyor job processing
- [ ] 5 dakika sonra job'ın status'u "completed" oluyor

---

## 📞 Support

**Sorun varsa kontrol et:**

1. `EMAIL_SYSTEM_TESTING.md` - Detaylı testing guide
2. `IMPLEMENTATION_COMPLETED.md` - Tüm implementation özeti
3. Docker logs: `docker logs heptacert-backend`
4. Database: `docker exec -it heptacert-db psql -U heptacert -d heptacert`

**Başlıca sorunlar:**
- Migration yürütülemedi → `alembic upgrade head`
- API 403 → Growth plan'ı kontrol et
- Email gönderilmiyor → SMTP credentials kontrol et
- APScheduler çalışmıyor → Logs'ta "scheduler started" mesajı var mı?

---

**Happy email sending! 🎉**
