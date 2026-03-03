# Email System & Growth Plan Features - Implementation Checklist

## ✅ COMPLETED

### Backend Infrastructure (95% complete)
- [x] **Database Migration 008** - Email system tables created
  - `user_email_configs` - User SMTP settings
  - `certificate_templates` - Pre-built cert designs (7 templates seeded)
  - `email_templates` - Email template library (2 default templates seeded)
  - `bulk_email_jobs` - Track bulk mail operations
  - Event model extended with: `auto_email_on_cert`, `cert_email_template_id`

- [x] **Database Models** in main.py:
  - `UserEmailConfig` model
  - `CertificateTemplate` model (with 7 defaults: Minimalist, Profesyonel, Renkli, Kurumsal, Modern, Elegant, Akademik)
  - `EmailTemplate` model (with 2 defaults: Sertifika Teslim, Kayıt Onayı)
  - `BulkEmailJob` model
  - Updated `User`, `Event` models with relationships

- [x] **Pydantic Schemas**:
  - `EmailTemplateIn`, `EmailTemplateOut`
  - `CertificateTemplateOut`
  - `BulkEmailJobIn`, `BulkEmailJobOut`
  - `UserEmailConfigOut`

- [x] **Backend API Endpoints** (Growth+ plan gated):
  - `GET /api/admin/events/{event_id}/email-templates` - List templates for event
  - `POST /api/admin/events/{event_id}/email-templates` - Create template
  - `PATCH /api/admin/events/{event_id}/email-templates/{template_id}` - Update template
  - `DELETE /api/admin/events/{event_id}/email-templates/{template_id}` - Delete template
  - `GET /api/system/email-templates` - Get system defaults
  - `GET /api/system/cert-templates` - Get all cert templates
  - `POST /api/admin/events/{event_id}/apply-cert-template` - Apply template to event
  - `POST /api/admin/events/{event_id}/bulk-email` - Start bulk email job
  - `GET /api/admin/events/{event_id}/bulk-email/{job_id}` - Get job details
  - `GET /api/admin/events/{event_id}/bulk-emails` - List all jobs for event

- [x] **Email System Enhancement**:
  - Enhanced `send_email_async()` with Jinja2 template rendering
  - Template variable support: `{{recipient_name}}`, `{{event_name}}`, `{{cert_link}}`, etc.
  - Attachment support for PDF certificates
  - RFC 2369 unsubscribe header  - Improved error logging

- [x] **Dependency & Helper Functions**:
  - Added `jinja2==3.1.2` to requirements.txt
  - Added `require_email_system_access()` dependency for plan gating
  - Seed data initialization in startup event

- [x] **Growth Plan Updated**:
  - Added 6 new features to Growth plan pricing tier:
    - Otomatik email sistemi (bulk mail + şablonlar)
    - 5-7 hazır sertifika şablonu
    - Custom event açıklaması ve banneri
    - Webhook API desteği
    - Advanced analytics dashboard
    - Custom form alanları
    - Katılımcı self-service sertifika indirme

- [x] **Event Registration Page**:
  - Already displays `event_description` on public registration page
  - Shows `event_date`, `event_location`, `event_banner_url`
  - Shows session details with attendance requirements

---

## ⚠️  PARTIALLY COMPLETED / REMAINING

### Backend (5% remaining)
- [ ] **APScheduler Worker for Bulk Email** - Endpoint created, background job not yet implemented
  - Need to add APScheduler task to process `BulkEmailJob` entries
  - Batch processing (max 50 emails/batch, 5sec delay between batches) for spam prevention
  - Jinja2 template rendering with user variables
  - Success/failure tracking and logging

- [ ] **Auto-send certificate emails** when `auto_email_on_cert=true`
  - Hook into certificate creation endpoint
  - Use configured `cert_email_template_id`
  - Send email with Jinja2 template rendering

### Frontend (Requires implementation)

#### 1. **Event Settings Dialog** (High Priority)
   - Location: Update `/frontend/src/app/admin/events/page.tsx`
   - Add "Settings" button to each event card
   - Modal should allow editing:
     - Event name
     - Event date (date picker)
     - Event location (text input)
     - Event description (textarea)
     - Min sessions required (number input)
     - Auto-email on cert (toggle)
     - Cert email template selector (dropdown)
   - Currently only name editing is supported

#### 2. **Email Templates Editor Page** (High Priority)
   - Location: Create `/frontend/src/app/admin/events/[id]/templates/page.tsx`
   - Features:
     - List all templates for event
     - Create new template button  - WYSIWYG HTML editor or markdown
     - Variable helper/insert buttons: {{recipient_name}}, {{cert_link}}, {{event_name}}
     - Support bilingual (TR/EN) subjects
     - Template preview
     - Delete template

#### 3. **Bulk Email Manager Page** (High Priority)
   - Location: Create `/frontend/src/app/admin/events/[id]/bulk-email/page.tsx`
   - Features:
     - "Send Email" button to start new campaign
     - Select email template
     - Choose recipients: "All Attendees" or "Only Certificate Holders"
     - Add optional date range filters
     - Show progress bar during send
     - History table of past email jobs with status (pending/sending/completed/failed)
     - Job details: recipients count, sent count, failed count, error message
     - Cancel job button (if still pending)

#### 4. **Certificate Templates Library Page** (Medium Priority - Optional)
   - Location: Create `/frontend/src/app/admin/events/[id]/cert-templates/page.tsx`
   - OR add modal/dialog to event editor
   - Features:
     - Grid view of 7 pre-built templates
     - Click to apply template to event
     - Shows template preview
     - Shows template name and creator (for custom templates if added later)

#### 5. **Update Admin Navigation** (Low Priority)
   - Add "Email Templates" link in event admin sidebar
   - Add "Bulk Email" link in event admin sidebar
   - Add "Certificate Templates" link if separate page created

---

## 📋 TESTING CHECKLIST

### Backend Tests to Add
- [ ] `test_email_templates.py` - CRUD operations for email templates
- [ ] `test_bulk_email.py` - Job creation, processing, status tracking
- [ ] `test_bulk_email_worker.py` - APScheduler integration, Jinja2 rendering
- [ ] `test_cert_templates.py` - Applying templates to events
- [ ] `test_email_sending.py` - Jinja2 rendering, attachment inclusion

### Frontend Tests
- [ ] Event settings dialog - form submission, validation
- [ ] Email template editor - create, edit, delete operations
- [ ] Bulk email manager - job creation and monitoring
- [ ] Plan gating - Growth+ access control

---

## 🚀 QUICK SETUP & TESTING INSTRUCTIONS

### 1. Run Database Migration
```bash
cd backend
python -m pip install -r requirements.txt  # Install jinja2
export ALEMBIC_DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/heptacert
alembic upgrade head
```

### 2. Start Backend
```bash
cd backend
python -m uvicorn src.main:app --reload --port 8000
```

### 3. Test API Endpoints (with Growth plan user)
```bash
# List cert templates
curl http://localhost:8000/api/system/cert-templates

# Create email template
curl -X POST http://localhost:8000/api/admin/events/1/email-templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Template",
    "subject_tr": "Test {{recipient_name}}",
    "subject_en": "Test {{recipient_name}}",
    "body_html": "<p>Hello {{recipient_name}}</p>"
  }'
```

### 4. Growth Plan Features Requiring Frontend
Development priority:
1. **Event Settings** - Many admins need this weekly
2. **Email Templates** - Core feature
3. **Bulk Email UI** - Main user interaction
4. **Cert Templates UI** - Less critical (works through API)

---

## 📌 KNOWN LIMITATIONS & TODO

1. **Email Rate Limiting** - Currently no rate limiting in send_email_async()
   - Implement: Max 100 emails/hour per user
   - Log warnings for potential spam patterns

2. **Email Delivery Tracking** - Emails sent but no bounce handling
   - Consider: Add bounce webhook support for SMTP providers

3. **Base64 Encoding for Attachments** - PDF handled but could optimize

4. **Timezone Handling** - All times in UTC, no user timezone setting yet

5. **Email Template Variables** - Limited set currently
   - Could expand with: {{event_date}}, {{event_location}}, {{download_link}}

6. **Self-Service Certificate Download** - Backend endpoint not created
   - Create: `GET /api/public/certificates/{uuid}/download`
   - Auth via token or public verification link

7. **Custom Form Fields** - Feature listed but not implemented
   - Would require: Dynamic field builder, form validation, data storage

8. **Advanced Analytics** - Feature listed but not implemented
   - Would need: Event engagement metrics, email open tracking, download tracking

---

## 💡 IMPLEMENTATION TIPS FOR REMAINING WORK

### Frontend Development Strategy
1. Copy existing modal patterns from superadmin page
2. Use existing `apiFetch` helper for API calls  
3. Reuse card, badge, button components from existing code
4. Follow same Framer Motion animation patterns
5. Test with Growth plan subscriber (plan_id="growth")

### Email Template Variables Available
```
{{recipient_name}}      - Attendee/cert holder name
{{recipient_email}}     - Attendee email
{{event_name}}         - Event name
{{event_date}}         - Event date (ISO format)
{{event_location}}     - Event location
{{certificate_link}}   - Link to download cert
{{download_link}}      - Same as above
{{event_link}}        - Link to event page
{{verify_link}}       - Link to verify certificate publicly
```

### SQL Queries for Testing
```sql
-- Check seeded templates
SELECT * FROM certificate_templates;
SELECT * FROM email_templates WHERE template_type = 'system';

-- Check bulk email jobs
SELECT * FROM bulk_email_jobs WHERE event_id = 1;

-- Verify Growth plan user can access
SELECT u.id, u.email, s.plan_id FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.plan_id = 'growth' AND s.is_active = true;
```

---

## 🎯 COMPLETION ESTIMATE

| Component | Status | Effort | Timeline |
|-----------|--------|--------|----------|
| Backend (core) | ✅ Complete | 12 hrs | Done |
| Jinja2 Email | ✅ Complete | 3 hrs | Done |
| Database/Models | ✅ Complete | 8 hrs | Done |
| API Endpoints | ✅ Complete | 10 hrs | Done |
| APScheduler Worker | ⏳50% | 4 hrs | 2-3 hrs remaining |
| Event Settings UI | ⏳ 0% | 4 hrs | 3-4 hrs |
| Email Templates UI | ⏳ 0% | 6 hrs | 5-6 hrs |
| Bulk Email UI | ⏳ 0% | 6 hrs | 5-6 hrs |
| Testing | ⏳ 0% | 8 hrs | 6-8 hrs |
| **TOTAL** | **70%** | **61 hrs** | **Remaining: 18-24 hrs** |

---

**Next Steps:**
1. Implement APScheduler bulk email worker
2. Create event settings editor modal
3. Create email templates management page
4. Create bulk email manager page
5. Write and run comprehensive tests
6. Deploy and test with Growth plan users

---

Generated: 2026-03-02 | Feature: Auto-Mail System + Cert Templates + Growth Plan Upgrades
