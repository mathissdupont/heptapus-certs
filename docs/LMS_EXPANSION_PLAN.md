# HeptaCert — LMS Genişleme & Platform Büyüme Planı

**Tarih:** 2026-06-07  
**Hedef:** HeptaCert'i Canvas seviyesinde kurumsal bir LMS'e dönüştürmek + tüm modülleri entegre etmek

---

## Mevcut Durum Özeti

| Bileşen | Durum |
|---------|-------|
| Event yönetimi | ✅ Tam |
| Quiz motoru | ✅ Tam |
| LMS temel (kurs + modül + journey) | ✅ Altyapı hazır (081 migration) |
| Rol sistemi | ✅ OrgStaff + OrgLmsStaff uygulandı |
| Org personel modeli | ✅ org_staff_api.py + migration 085 |
| Gradebook | ✅ lms_extended_api.py + /admin/lms/courses/[id]/gradebook |
| Discussions | ✅ lms_extended_api.py + /courses/[id]/discussions |
| Rubrics | ✅ lms_extended_api.py + /admin/lms/courses/[id]/rubrics |
| Learning Outcomes | ✅ lms_extended_api.py + /admin/lms/outcomes |
| Automation LMS trigger'ları | ✅ automation_api.py genişletildi |
| TrainingAssignment → LMS bağlantısı | ✅ course_id FK eklendi + migration 083 |

---

## KATMAN 1 — Temel Altyapı (Diğer Her Şey Buna Bağlı)

### 1A. Rol Sistemi Genişlemesi

**Kapsam:** Yeni `OrgStaff` modeli + org içi roller

**Backend — Yeni model** (`org_staff_models.py`):
```python
class OrgStaff(Base):
    __tablename__ = "org_staff"
    id, org_id, user_id (nullable), email, display_name
    role: Enum("instructor", "teaching_assistant", "content_editor", "department_admin", "viewer")
    department_id (FK → organization_departments, nullable)
    invited_at, joined_at, is_active
```

**Neden kritik:**
- `instructor` rolü olmadan "kim kurs oluşturabilir" kontrolü yapılamaz
- `teaching_assistant` olmadan ödev notlandırma yetki sistemi kurulumaz
- `department_admin` olmadan departman bazlı compliance raporlaması mümkün değil

**Backend tasks:**
- [ ] `org_staff_models.py` oluştur
- [ ] `082_org_staff.py` alembic migration
- [ ] `org_staff_api.py` — CRUD + davet sistemi (email ile davet, kabul linki)
- [ ] `main.py`'e router ekle

**Frontend tasks:**
- [ ] `/admin/settings/team` — ekip üyeleri sayfası (davet, rol atama, kaldırma)
- [ ] Mevcut yetki kontrolleri: `instructor` + `content_editor` kurs oluşturabilsin

**Bağımlılıklar:** Yok — başlangıç noktası

---

### 1B. TrainingAssignment → LMS Bağlantısı

**Kapsam:** Compliance modülünün LMS kurslarını tanıması

**Backend değişikliği** (`main.py` TrainingAssignment modeli):
```python
# Mevcut: event_id, renewal_event_id
# Eklenecek:
course_id: Optional[int] = mapped_column(Integer, ForeignKey("training_courses.id"), nullable=True)
```

**Alembic migration** `083_training_assignment_course_fk.py`:
```sql
ALTER TABLE training_assignments ADD COLUMN course_id INTEGER REFERENCES training_courses(id);
```

**Etki:** Dept admin artık "Bu departman şu LMS kursunu X tarihine kadar tamamlamalı" diyebilir.

**Tasks:**
- [ ] Model değişikliği + migration
- [ ] `compliance_api.py` (veya bulunduğu dosya) — `course_id` alanını kabul etsin
- [ ] Frontend compliance atama formuna "Kurs seç" seçeneği ekle

**Bağımlılıklar:** 1A (dept_admin rolü için)

---

### 1C. Automation — LMS Trigger Genişlemesi

**Kapsam:** Mevcut 6 trigger → 12 trigger

**Mevcut triggerlar:** `attended_event`, `registered_no_show`, `certificate_issued`, `survey_not_completed`, `badge_earned`, `audience_segment`

**Eklenecek triggerlar:**
```python
"lms_course_enrolled"      # kursa kayıt olundu
"lms_course_completed"     # kurs tamamlandı
"lms_module_completed"     # modül tamamlandı
"lms_assignment_graded"    # ödev notlandırıldı
"lms_journey_completed"    # öğrenme yolu tamamlandı
"compliance_overdue"       # uyum görevi tarihi geçti
```

**Eklenecek actionlar:**
```python
"enroll_in_course"    # kursa otomatik kayıt et (payload: course_id)
"assign_compliance"   # uyum görevi oluştur
```

**Tasks:**
- [ ] `automation_api.py` — trigger enum genişletme
- [ ] `lms_api.py` — kurs tamamlama endpoint'lerinde trigger dispatch ekle
- [ ] Frontend automation builder'a yeni trigger/action seçenekleri ekle

**Bağımlılıklar:** Mevcut automation altyapısı var, sadece genişletme

---

## KATMAN 2 — LMS Derinleştirme (Canvas Özellikleri)

### 2A. Gradebook (Not Defteri)

**Kapsam:** Kurs başına ağırlıklı ortalama hesaplama + admin not defteri

**Backend — Yeni modeller** (`lms_gradebook_models.py`):
```python
class CourseGradeItem(Base):
    # Modül bazlı notlandırma kalemi (quiz, assignment, participation)
    id, course_id, item_type: Enum("quiz","assignment","participation")
    item_id (module_id veya assignment_id), title, max_points, weight_pct

class CourseGradeSummary(Base):
    # Her enrollment için hesaplanmış özet
    enrollment_id (unique), weighted_avg, letter_grade, passed, computed_at
```

**API endpoints:**
```
GET  /admin/lms/courses/{id}/gradebook          → tüm öğrenci notları
GET  /admin/lms/courses/{id}/gradebook/export   → CSV export
POST /admin/lms/courses/{id}/gradebook/recalc   → ağırlıklı ortalamaları yeniden hesapla
GET  /public/lms/courses/{id}/my-grades         → öğrenci kendi notlarını görür
```

**Frontend tasks:**
- [ ] `/admin/lms/courses/[id]/gradebook` — tablo: öğrenci × not kalemi grid
- [ ] CSV export butonu
- [ ] Öğrenci tarafı: `/courses/[id]/grades` — kendi not özeti

**Bağımlılıklar:** Mevcut `CourseAssignment` + `AssignmentSubmission` modelleri var

---

### 2B. Discussions (Tartışma Paneli)

**Kapsam:** Canvas-tarzı kurs/modül bazlı tartışma başlıkları

**Backend — Yeni modeller** (`lms_discussions_models.py`):
```python
class CourseDiscussion(Base):
    id, course_id, module_id (nullable), author_member_id
    title, body, is_pinned, is_locked
    created_at, updated_at

class DiscussionReply(Base):
    id, discussion_id, parent_reply_id (nullable — threading)
    author_member_id, body, created_at
    is_instructor_reply: bool  # instructor/ta ise vurgulanır
```

**API endpoints:**
```
GET  /public/lms/courses/{id}/discussions
POST /public/lms/courses/{id}/discussions
GET  /public/lms/discussions/{id}
POST /public/lms/discussions/{id}/replies
PATCH /admin/lms/discussions/{id}  → pin/lock (instructor/ta)
```

**Frontend tasks:**
- [ ] `/courses/[id]/discussions` — başlık listesi
- [ ] `/courses/[id]/discussions/[did]` — thread görünümü
- [ ] Admin: pin/lock kontrolleri

**Bağımlılıklar:** 1A (instructor rolü için)

---

### 2C. Rubrics (Değerlendirme Kriterleri)

**Kapsam:** Ödevi puan kırmalarına göre notlandırma

**Backend — Yeni modeller** (`lms_rubric_models.py`):
```python
class Rubric(Base):
    id, course_id, title, description

class RubricCriterion(Base):
    id, rubric_id, title, description, points, order

class RubricRating(Base):
    id, criterion_id, description, points  # örn: Mükemmel=10, İyi=7, Orta=4, Eksik=0

class SubmissionRubricScore(Base):
    submission_id, criterion_id, rating_id (nullable), points_earned, comment
```

**API endpoints:**
```
POST /admin/lms/courses/{id}/rubrics
GET  /admin/lms/courses/{id}/rubrics
PATCH /admin/lms/submissions/{id}/grade  → rubric_scores[] kabul etsin
```

**Frontend tasks:**
- [ ] Rubric builder: drag-drop kriterler + rating seçenekleri
- [ ] SpeedGrader'a (bkz 2F) rubric sidebar entegrasyonu

**Bağımlılıklar:** 2A (Gradebook hesaplamasına entegre)

---

### 2D. Learning Outcomes (Öğrenme Çıktıları)

**Kapsam:** Competency mapping — akreditasyon + raporlama için kritik

**Backend — Yeni modeller** (`lms_outcomes_models.py`):
```python
class LearningOutcome(Base):
    id, org_id, title, description, mastery_points, display_name

class CourseOutcomeAlignment(Base):
    course_id, outcome_id, module_id (nullable)

class OutcomeMastery(Base):
    member_id, outcome_id, score, mastered_at, evidence_type, evidence_id
```

**API endpoints:**
```
GET/POST /admin/lms/outcomes
PATCH    /admin/lms/outcomes/{id}
POST     /admin/lms/courses/{id}/outcome-alignments
GET      /admin/lms/outcomes/report  → org genelinde mastery dağılımı
```

**Frontend tasks:**
- [ ] `/admin/lms/outcomes` — outcomes yönetimi
- [ ] Kurs editöründe "Bu kurs hangi outcome'ları karşılıyor?" seçimi
- [ ] Outcomes raporu

**Bağımlılıklar:** Yok, bağımsız

---

### 2E. Groups (Öğrenci Grupları)

**Kapsam:** Kurs içi gruplar, grup ödevleri

**Backend — Yeni modeller**:
```python
class CourseGroup(Base):
    id, course_id, name, max_members, created_by_user_id

class CourseGroupMember(Base):
    group_id, member_id, joined_at

# AssignmentSubmission'a group_id ekle (grup ödevi desteği)
```

**Tasks:**
- [ ] Migration + modeller
- [ ] Admin: grup oluştur, üye ata
- [ ] Öğrenci: hangi gruplarda olduğunu görür

**Bağımlılıklar:** 2C (grup ödevleri için rubric entegrasyonu)

---

### 2F. SpeedGrader UI

**Kapsam:** Öğrenci sırayla geçer, hızlı notlandırma arayüzü

**Sadece frontend** (backend API'leri var — `PATCH /submissions/{id}/grade`):
- [ ] `/admin/lms/courses/[id]/assignments/[mid]/speedgrader`
  - Sol panel: öğrenci listesi (önceki/sonraki ok)
  - Sağ panel: submission içeriği (metin/link/dosya)
  - Alt panel: rubric + puan girişi + yorum
  - Klavye kısayolları: `←` `→` öğrenci geçişi, `Enter` kaydet

**Bağımlılıklar:** 2C (Rubrics)

---

### 2G. Badges (Dijital Rozetler)

**Kapsam:** Kurs/journey tamamlama veya custom trigger'a bağlı rozet

**Backend — Yeni modeller**:
```python
class Badge(Base):
    id, org_id, name, description, image_url, criteria_text
    trigger_type: Enum("course_completed","journey_completed","manual","automation")
    trigger_ref_id (course_id veya journey_id, nullable)

class BadgeAward(Base):
    badge_id, member_id, issued_at, evidence_url, issued_by_user_id
```

**Mevcut `badge_earned` automation trigger ile bağlantı:**
- Badge kazanıldığında → automation engine'e `badge_earned` event gönder

**Tasks:**
- [ ] Migration + modeller + `badge_api.py`
- [ ] Admin: rozet tasarlama (SVG upload veya emoji + renk seçici)
- [ ] Öğrenci profili: kazanılan rozetler galeri

**Bağımlılıklar:** 1C (automation trigger)

---

### 2H. Calendar + Syllabus

**Kapsam:** Kurs takvimi (vade tarihleri) + ders programı sayfası

**Backend — Yeni modeller**:
```python
class CourseCalendarEvent(Base):
    id, course_id, title
    event_type: Enum("due_date","lecture","exam","office_hours","other")
    starts_at, ends_at, module_id (nullable), conference_url, description

class CourseSyllabus(Base):
    course_id (unique), content_html, updated_at
```

**Tasks:**
- [ ] Migration + API
- [ ] Admin: takvim etkinliği ekle, syllabus HTML editörü
- [ ] Öğrenci: kurs takvimi görünümü (haftaya göre filtreleme)

**Bağımlılıklar:** Yok, bağımsız

---

## KATMAN 3 — Cross-Module Entegrasyon

### 3A. Events ↔ LMS Köprüsü

**Model:**
```python
class EventLmsBridge(Base):
    id, event_id, course_id
    trigger_on: Enum("attendance","cert_issued","quiz_pass")
    action: Enum("enroll_in_course","unlock_module","award_badge")
    action_ref_id (course_id veya module_id)
```

**Kullanım örneği:** "Bu etkinliğe katılanlar otomatik olarak Temel Python kursuna kayıt olsun"

**Tasks:**
- [ ] Model + migration
- [ ] Event tamamlama hook'larına bridge kontrolü ekle
- [ ] Admin UI: event detay sayfasında "LMS Bağlantısı" sekmesi

---

### 3B. Sertifika → LMS Kurs Tamamlama

**Mevcut generator.py zaten var** — sadece bağlantı kodu gerekiyor:

```python
# lms_api.py içinde kurs tamamlandığında:
async def maybe_issue_lms_certificate(enrollment: CourseEnrollment, db, org):
    if not enrollment.course.cert_template_url:
        return
    cert_pdf = render_certificate_pdf(
        template_image_bytes=...,
        student_name=member.display_name,
        verify_url=...,
        ...
    )
    # certificates tablosuna kaydet, enrollment.certificate_id güncelle
```

**Tasks:**
- [ ] `lms_api.py` kurs tamamlama endpoint'ine certificate generation hook ekle
- [ ] Journey tamamlama için aynısı

---

### 3C. Email Bildirimleri — LMS Notification Tipleri

**Eklenecek email tipleri:**
```
lms_enrollment_welcome    — kursa kayıt hoş geldiniz
lms_assignment_due_soon   — ödev hatırlatma (3 gün önce)
lms_grade_posted          — not yayınlandı
lms_announcement          — kurs duyurusu
lms_discussion_reply      — tartışmana cevap geldi
lms_certificate_issued    — sertifikan hazır
```

**Tasks:**
- [ ] Email template'leri oluştur
- [ ] İlgili LMS endpoint'lerine email dispatch ekle
- [ ] APScheduler: due_date yaklaşan ödev hatırlatmaları için günlük job

---

## KATMAN 4 — Kurumsal (Enterprise)

### 4A. SSO / SAML

**Hedef:** Üniversiteler, büyük kurumlar

```python
class OrgSsoConfig(Base):
    id, org_id
    provider: Enum("saml", "oauth2", "ldap")
    config_json  # entity_id, cert, endpoints (şifrelenmiş)
    is_active
```

**Tasks:**
- [ ] `python-saml` veya `pysaml2` entegrasyonu
- [ ] `/auth/sso/{org_slug}` endpoint
- [ ] Admin: SSO konfigürasyon sayfası

---

### 4B. Multi-tenant Kurs Kataloğu (Kurs Pazaryeri)

**Mevcut event marketplace pattern'i LMS'e genişlet:**

```python
class CourseMarketplaceListing(Base):
    course_id (unique), listed_at, price, commission_pct
    description_long, preview_video_url
    category, tags_json
    total_enrollments, avg_rating
```

**Tasks:**
- [ ] Model + migration
- [ ] `/marketplace/courses` public endpoint
- [ ] `/marketplace/courses` frontend sayfası
- [ ] Kurs satın alma → enrollment akışı

---

### 4C. LTI (Learning Tools Interoperability)

**Hedef:** Zoom, H5P, Kahoot, Moodle araçlarını embed et

```python
class LtiTool(Base):
    id, org_id, name, launch_url
    consumer_key_encrypted, shared_secret_encrypted
    custom_params_json
    provider: Enum("lti_1_1", "lti_1_3")
```

**Tasks:**
- [ ] `lti_api.py` — launch URL generator, HMAC signing
- [ ] Module editöründe "LTI Aracı" content type
- [ ] `/courses/[id]/modules/[mid]/lti-launch` — secure launch sayfası

---

### 4D. Gelişmiş LMS Analytics

**Yeni metrikler:**
```
GET /admin/analytics/lms/overview
    → total_enrollments, avg_completion_rate, avg_time_to_complete

GET /admin/analytics/lms/courses/{id}/funnel
    → module_drop_off_rates[]  (hangi modülde bırakıyorlar)

GET /admin/analytics/lms/outcomes/report
    → outcome_mastery_distribution (org geneli)

GET /admin/analytics/lms/compliance
    → dept_completion_heatmap (departman × kurs grid)
```

**Frontend tasks:**
- [ ] `/admin/analytics` sayfasına "LMS" sekmesi ekle
- [ ] Module drop-off funnel chart
- [ ] Departman uyum ısı haritası

---

## Uygulama Sırası & Bağımlılık Haritası

```
KATMAN 1 (Temel Altyapı)
├── 1A. OrgStaff + Rol Sistemi           [1 hafta]  ← EN KRİTİK
│   └── 1B. TrainingAssignment course_id  [2 gün]
│   └── 1C. Automation LMS Trigger'ları  [2 gün]
│
KATMAN 2 (LMS Canvas Özellikleri)
├── 2A. Gradebook                        [3 gün]   ← 1A sonrası
├── 2B. Discussions                      [3 gün]   ← 1A sonrası
├── 2C. Rubrics                          [4 gün]   ← 2A sonrası
├── 2D. Learning Outcomes                [4 gün]   ← bağımsız
├── 2E. Groups                           [3 gün]   ← 2C sonrası
├── 2F. SpeedGrader UI                   [1 hafta] ← 2C sonrası
├── 2G. Badges                           [3 gün]   ← 1C sonrası
└── 2H. Calendar + Syllabus              [3 gün]   ← bağımsız
│
KATMAN 3 (Entegrasyon)
├── 3A. Events ↔ LMS Köprüsü            [2 gün]   ← 1C sonrası
├── 3B. Sertifika → LMS Tamamlama       [2 gün]   ← bağımsız (generator var)
└── 3C. Email LMS Bildirimleri          [3 gün]   ← bağımsız
│
KATMAN 4 (Enterprise)
├── 4A. SSO / SAML                       [1 hafta] ← 1A sonrası
├── 4B. Multi-tenant Kurs Kataloğu       [1 hafta] ← bağımsız
├── 4C. LTI Entegrasyonu                 [1 hafta] ← bağımsız
└── 4D. LMS Analytics                   [4 gün]   ← 2A + 2D sonrası
```

---

## Mimari Prensipler (Değişmeyecek)

1. **Yeni her şey ayrı dosyada** — `main.py` sadece `include_router()` alır
2. **LMS ↔ Events bağımsız** — FK yok, sadece shared services (generator, public_members, quiz engine)
3. **Shared services** — `generator.py`, `public_members`, `email_api.py`, `automation_api.py`, `quiz_api.py`
4. **Public sayfalar** → `publicApiFetch`, admin sayfalar → `apiFetch`
5. **apiFetch her zaman `.json()` çağırır** — eksik bırakılmaz

---

## Dosya Yaratma Listesi

### Backend (yeni dosyalar)
- [ ] `org_staff_models.py` + `org_staff_api.py`
- [ ] `lms_gradebook_models.py` + gradebook endpoints → `lms_api.py`'e ekle
- [ ] `lms_discussions_models.py` + `lms_discussions_api.py`
- [ ] `lms_rubric_models.py` + rubric endpoints → `lms_api.py`'e ekle
- [ ] `lms_outcomes_models.py` + `lms_outcomes_api.py`
- [ ] `lms_badge_api.py`
- [ ] `lms_calendar_models.py`
- [ ] `lti_api.py`

### Alembic Migrations
- [ ] `082_org_staff.py`
- [ ] `083_training_assignment_course_fk.py`
- [ ] `084_lms_gradebook.py`
- [ ] `085_lms_discussions.py`
- [ ] `086_lms_rubrics.py`
- [ ] `087_lms_outcomes.py`
- [ ] `088_lms_groups.py`
- [ ] `089_lms_badges.py`
- [ ] `090_lms_calendar.py`
- [ ] `091_event_lms_bridge.py`
- [ ] `092_lti_tools.py`

### Frontend (yeni sayfalar)
- [ ] `/admin/settings/team` — OrgStaff yönetimi
- [ ] `/admin/lms/courses/[id]/gradebook`
- [ ] `/admin/lms/courses/[id]/assignments/[mid]/speedgrader`
- [ ] `/admin/lms/outcomes`
- [ ] `/admin/lms/journeys/[id]` — Journey detay/builder (EKSİK)
- [ ] `/courses/[id]/discussions`
- [ ] `/courses/[id]/grades`
- [ ] `/courses/[id]/calendar`
- [ ] `/courses/journeys` — Public journey kataloğu (EKSİK)

---

## Başlangıç Noktası: 1A — OrgStaff Modeli

İlk implementasyona bu modelle başlıyoruz çünkü:
- Tüm LMS yetki kontrolleri buraya dayanır
- `instructor` olmadan "kim kurs oluşturabilir/yayınlayabilir" yapılamaz
- Davet sistemi (email → join link) diğer modüllerin de ihtiyacı

**Sıradaki:** 1A tamamlanınca 1B + 1C paralel ilerletilebilir, ardından Katman 2.
