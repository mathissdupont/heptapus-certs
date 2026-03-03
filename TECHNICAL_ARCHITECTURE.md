# 🏗️ Email System - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Settings   │  │    Email     │  │    Bulk      │           │
│  │    Page      │  │  Templates   │  │    Email     │           │
│  │              │  │              │  │              │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
├────────────────────────────▼──────────────────────────────────┤
│                   HTTP REST API Layer                           │
├────────────────────────────────────────────────────────────────┤
│                        FastAPI                                  │
│                                                                 │
│  ┌────────────────────┬────────────────────┬──────────────┐    │
│  │   Email Template   │  Bulk Email        │  Cert        │    │
│  │   Endpoints        │  Endpoints         │  Template    │    │
│  │                    │                    │  Endpoints   │    │
│  ├────────────────────┼────────────────────┼──────────────┤    │
│  │ • POST/PATCH/DEL   │ • POST (start)     │ • GET (list) │    │
│  │ • GET (list/one)   │ • GET (status)     │              │    │
│  │                    │ • GET (list)       │              │    │
│  └────────────────────┴────────────────────┴──────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Plan Gating Middleware                                  │  │
│  │  • require_email_system_access dependency               │  │
│  │  • Checks: Plan == "growth" OR "enterprise" OR superadmin │  │
│  │  • Blocks: Free/Pro plan users with 403 Forbidden       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│              Business Logic & Data Layer                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────────────────┐   │
│  │   Jinja2 Engine    │  │  send_email_async()            │   │
│  │                    │  │                                │   │
│  │ • Template render  │  │ • SMTP connection (aiosmtplib)│   │
│  │ • Variable subs    │  │ • MIME encoding (multipart)   │   │
│  │ • HTML + Plain     │  │ • Attachments (PDF certs)     │   │
│  │ • Error logging    │  │ • Unsubscribe headers (RFC)   │   │
│  └────────────────────┘  └────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  APScheduler Background Worker                         │   │
│  │  _process_bulk_emails()                                │   │
│  │                                                         │   │
│  │  Schedule: Every 5 minutes                             │   │
│  │  Process: pending/sending jobs                         │   │
│  │  Batch: 50 emails per batch                            │   │
│  │  Rate: 5 second delay between batches                  │   │
│  │  Error: Per-recipient error tracking                   │   │
│  │  Logging: Comprehensive audit trail                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│            SQLAlchemy ORM Models                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  UserEmailConfig                                         │  │
│  │  ├─ from_name: str (display name)                       │  │
│  │  ├─ reply_to: str (reply address)                       │  │
│  │  ├─ auto_cc: str (carbon copy)                          │  │
│  │  └─ tracking_enabled: bool (delivery tracking)          │  │
│  │                                                          │  │
│  │  Relationship: User (1:1)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CertificateTemplate                                     │  │
│  │  ├─ name: str (e.g., "Minimalist")                      │  │
│  │  ├─ template_image_url: str (CDN URL)                   │  │
│  │  ├─ config: JSON (position, font, colors)              │  │
│  │  ├─ is_default: bool (shipped template)                │  │
│  │  └─ order_index: int (sort order)                       │  │
│  │                                                          │  │
│  │  Seeded: 7 designs                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  EmailTemplate                                           │  │
│  │  ├─ name: str (e.g., "Certificate Delivery")           │  │
│  │  ├─ subject_tr: str (Turkish subject)                  │  │
│  │  ├─ subject_en: str (English subject)                  │  │
│  │  ├─ body_html: str (HTML with {{variables}})           │  │
│  │  ├─ template_type: enum (system|custom)                │  │
│  │  ├─ is_system: bool (shipped template)                 │  │
│  │  ├─ event_id: int? (nullable for system)               │  │
│  │  ├─ created_by: int (admin user)                       │  │
│  │  └─ created_at: datetime                                │  │
│  │                                                          │  │
│  │  Seeded: 2 bilingual templates                          │  │
│  │  Variables: {{recipient_name}}, {{event_name}},        │  │
│  │             {{certificate_link}}, {{event_date}}        │  │
│  │                                                          │  │
│  │  Relationships:                                         │  │
│  │  ├─ Event (many)                                       │  │
│  │  └─ BulkEmailJob (many)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BulkEmailJob                                            │  │
│  │  ├─ event_id: int (target event)                        │  │
│  │  ├─ created_by: int (campaign creator)                  │  │
│  │  ├─ email_template_id: int (which template)             │  │
│  │  ├─ recipient_type: enum (attendees|certified)          │  │
│  │  ├─ sent_count: int (successfully sent)                 │  │
│  │  ├─ failed_count: int (delivery failures)               │  │
│  │  ├─ total_recipients: int (target size)                 │  │
│  │  ├─ status: enum (pending|sending|completed|failed)   │  │
│  │  ├─ error_message: str? (last error)                    │  │
│  │  ├─ created_at: datetime (job started)                  │  │
│  │  └─ updated_at: datetime (last update)                  │  │
│  │                                                          │  │
│  │  Relationships:                                         │  │
│  │  ├─ Event (many)                                       │  │
│  │  ├─ User (creator)                                     │  │
│  │  └─ EmailTemplate (one)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Events (Extended)                                       │  │
│  │  ├─ auto_email_on_cert: bool (Growth+ only)             │  │
│  │  └─ cert_email_template_id: int? (template choice)     │  │
│  │                                                          │  │
│  │  Relationships:                                         │  │
│  │  ├─ EmailTemplate (many)                               │  │
│  │  └─ BulkEmailJob (many)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                 PostgreSQL Database                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tables:                                                        │
│  ├─ user_email_configs     (SMTP per-user settings)           │
│  ├─ certificate_templates   (7 seeded designs)                │
│  ├─ email_templates         (custom + system)                 │
│  ├─ bulk_email_jobs         (campaign tracking)               │
│  ├─ events                  (extended with 2 cols)            │
│  ├─ users                   (existing)                        │
│  └─ subscriptions           (existing, plan gating)           │
│                                                                 │
│  Indexes:                                                       │
│  ├─ events.auto_email_on_cert                                 │
│  ├─ bulk_email_jobs.status (for worker queries)               │
│  ├─ bulk_email_jobs.event_id                                  │
│  ├─ email_templates.event_id                                  │
│  ├─ email_templates.is_system                                 │
│  └─ certificate_templates.order_index                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### A. Email Template Creation Flow

```
User (Admin)
    │
    ├─ POST /api/admin/events/{id}/email-templates
    │  • Verify ownership (event creator check)
    │  • Check plan (Growth+)
    │  • Validate schema (EmailTemplateIn)
    │
    ▼
  FastAPI Endpoint
    │
    ├─ require_email_system_access() dependency
    │  ├─ Get current user from JWT token
    │  ├─ Get user's subscription
    │  └─ Check: plan_id in ["growth", "enterprise"] OR superadmin
    │     └─ If not → 403 Forbidden
    │
    ▼
  Database
    │
    ├─ INSERT INTO email_templates (
    │     event_id, created_by, name,
    │     subject_tr, subject_en, body_html,
    │     is_system=false, template_type='custom'
    │   )
    │
    ▼
  FastAPI Response
    │
    └─ 200 OK {EmailTemplateOut}
```

### B. Bulk Email Campaign Flow (5-minute cycle)

```
Time: 00:00 - Campaign Creation
│
├─ User clicks "Yeni Kampanya" button
├─ Modal opens: Select template + recipient type
├─ POST /api/admin/events/{id}/bulk-email
│  │
│  ├─ Create BulkEmailJob record:
│  │  ├─ status = "pending"
│  │  ├─ sent_count = 0
│  │  ├─ failed_count = 0
│  │  └─ total_recipients = SELECT COUNT(*) FROM attendees
│  │
│  └─ Return 201 Created {BulkEmailJobOut}
│
└─ Response shown in UI with status: pending

Time: 00:00 - 05:00 - Waiting Period
│
└─ APScheduler monitoring every 5 minutes
   └─ Next check at 00:05

Time: 05:00 - APScheduler Triggers
│
├─ _process_bulk_emails() async function starts
├─ Query: SELECT * FROM bulk_email_jobs WHERE status IN ('pending','sending') LIMIT 10
│  └─ Found: BulkEmailJob#456 with status='pending'
│
├─ UPDATE bulk_email_jobs SET status='sending' WHERE id=456
│  └─ (Mark as actively processing)
│
├─ Retrieve email template:
│  └─ SELECT FROM email_templates WHERE id={template_id}
│
├─ Fetch recipients (batch):
│  └─ SELECT * FROM attendees WHERE event_id={event_id} LIMIT 50
│
├─ FOR EACH recipient (Batch processing):
│  │
│  ├─ Render Jinja2 template with variables:
│  │  ├─ {{recipient_name}} = recipient.full_name
│  │  ├─ {{event_name}} = event.name
│  │  ├─ {{certificate_link}} = generate_cert_url(recipient)
│  │  └─ {{event_date}} = event.event_date.format()
│  │
│  ├─ Call send_email_async():
│  │  ├─ Create MIME message
│  │  ├─ Set headers:
│  │  │  ├─ Subject: (rendered from subject_tr/subject_en)
│  │  │  ├─ From: {SMTP_FROM}
│  │  │  ├─ To: recipient.email
│  │  │  └─ List-Unsubscribe: <mailto:unsubscribe@...>
│  │  │
│  │  ├─ Add body (HTML):
│  │  │  └─ Template.render(**template_vars)
│  │  │
│  │  ├─ Connect to SMTP server (asyncio)
│  │  │  └─ aiosmtplib.SMTP(host=SMTP_HOST, port=SMTP_PORT)
│  │  │
│  │  ├─ TLS handshake & authenticate
│  │  │  └─ smtp.sendmail(from_addr, to_addr, msg)
│  │  │
│  │  └─ Close connection
│  │
│  ├─ On success: sent_count += 1
│  └─ On error: 
│     ├─ failed_count += 1
│     └─ Log error but continue to next recipient
│
├─ After batch complete:
│  ├─ UPDATE bulk_email_jobs SET 
│  │     sent_count=45, 
│  │     failed_count=0, 
│  │     updated_at=NOW()
│  │  WHERE id=456
│  │
│  └─ Wait 5 seconds (rate limiting)
│
├─ Check if more batches needed
│  └─ If sent + failed < total_recipients: Process next batch
│
└─ When all recipients done:
   ├─ UPDATE bulk_email_jobs SET 
   │     status='completed', 
   │     updated_at=NOW()
   │  WHERE id=456
   │
   └─ Log: "Job 456 completed: 45 sent, 0 failed"

Time: 05:10 - Frontend Auto-Refresh
│
├─ GET /api/admin/events/{id}/bulk-email/456
│  └─ Returns: {status: 'completed', sent_count: 45, failed_count: 0}
│
└─ UI updates:
   ├─ Progress bar → 100%
   ├─ Status badge → ✅ Tamamlandı
   └─ Statistics → 45 sent, 0 failed
```

### C. Auto-Email on Certificate Delivery (Growth+ only)

```
Event Flow:
│
├─ Admin marks attendee as "Certified"
├─ POST /api/attendees/{id}/certificate (issue cert)
│  │
│  ├─ Check Event.auto_email_on_cert
│  │  └─ If FALSE → Skip email, just save cert
│  │
│  ├─ If TRUE:
│  │  ├─ Get Email Template (Event.cert_email_template_id)
│  │  ├─ Generate certificate URL/PDF
│  │  │
│  │  └─ Call send_email_async():
│  │     ├─ Template variables:
│  │     │  ├─ {{recipient_name}} = attendee.full_name
│  │     │  ├─ {{event_name}} = event.name
│  │     │  ├─ {{certificate_link}} = cert_download_url
│  │     │  └─ {{event_date}} = event.event_date
│  │     │
│  │     ├─ Subject: Template.subject_en or subject_tr
│  │     └─ Body: Template.body_html (rendered)
│  │
│  └─ Save certificate record
│
└─ Response: 200 OK {CertificateOut}
   └─ Email sent asynchronously (non-blocking)
```

---

## API Contracts

### Endpoint: POST /api/admin/events/{id}/bulk-email

**Request:**
```json
{
  "email_template_id": 1,
  "recipient_type": "attendees"  // or "certified"
}
```

**Response (201 Created):**
```json
{
  "id": 456,
  "event_id": 123,
  "created_by": 1,
  "email_template_id": 1,
  "email_template": {
    "name": "Certificate Delivery",
    "subject_tr": "Sertifikanız hazır!"
  },
  "recipient_type": "attendees",
  "sent_count": 0,
  "failed_count": 0,
  "total_recipients": 45,
  "status": "pending",
  "created_at": "2024-03-02T10:30:00Z",
  "updated_at": "2024-03-02T10:30:00Z"
}
```

**Error Cases:**
- `400 Bad Request` - Invalid recipient_type or template_id
- `403 Forbidden` - User doesn't have Growth plan
- `404 Not Found` - Event or template not found
- `422 Unprocessable` - Validation error

---

### Endpoint: GET /api/admin/events/{id}/bulk-email/{job_id}

**Query Parameters:**
- None required

**Response (200 OK):**
```json
{
  "id": 456,
  "event_id": 123,
  "status": "sending",  // or pending, completed, failed
  "sent_count": 25,
  "failed_count": 0,
  "total_recipients": 45,
  "progress_percentage": 56,
  "email_template": {
    "name": "Certificate Delivery",
    "subject_tr": "Sertifikanız hazır!"
  },
  "recipient_type": "attendees",
  "created_at": "2024-03-02T10:30:00Z",
  "updated_at": "2024-03-02T10:35:15Z",
  "error_message": null
}
```

**Poll Frequency:**
- Frontend polls every 5 seconds
- Matches APScheduler cycle for optimal UX

---

## Template Variables Reference

### Available Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{recipient_name}}` | attendee.full_name | "Ahmet Yılmaz" |
| `{{event_name}}` | event.name | "DevConf 2024" |
| `{{certificate_link}}` | generated URL | "https://..." |
| `{{event_date}}` | event.event_date | "Mart 15, 2024" |
| `{{organization_name}}` | custom | "Heptapus" |

### Jinja2 Template Syntax

**Simple substitution:**
```html
<p>Merhaba {{recipient_name}},</p>
```

**Conditional sections:**
```html
{% if certificate_link %}
  <a href="{{certificate_link}}">Sertifikayı İndir</a>
{% endif %}
```

**Loops (if needed):**
```html
{% for item in items %}
  <li>{{item}}</li>
{% endfor %}
```

**Filters:**
```html
<p>{{recipient_name | upper}}</p>
<p>{{event_date | default('TBA')}}</p>
```

---

## Performance Characteristics

### Database Queries

**Job retrieval:** O(1)
```sql
SELECT * FROM bulk_email_jobs 
WHERE status IN ('pending','sending') 
LIMIT 10;
```

**Recipient fetch:** O(n) where n = batch size (50)
```sql
SELECT * FROM attendees 
WHERE event_id = ? 
OFFSET ? LIMIT 50;
```

**Template rendering:** O(n*m) where n = recipients, m = template variables
```
For each recipient:
  - Jinja2.render(template_string, variables_dict)
  - SMTP connection + send
```

### Network Characteristics

**SMTP Send Time:**
- Per recipient: ~100-500ms (SMTP dependent)
- Batch (50): ~5-10 seconds
- With rate limiting: +5 second delays between batches

**API Response Time:**
- Template operations: ~50-100ms
- Job creation: ~100-200ms
- Job status query: ~50-100ms

### Memory Usage

**Per APScheduler cycle:**
- Job fetching: ~10KB
- Template loading: ~50-200KB (depends on HTML size)
- Batch recipients: ~5KB per recipient
- Total per cycle: ~1-5MB

**Optimizations:**
- SQLAlchemy sessions closed after each batch
- No job data cached
- Streaming approach (not loading all recipients at once)

---

## Error Handling Strategy

### Per-Recipient Errors

When an email fails to send:

```python
try:
    await send_email_async(recipient.email, subject, body)
    job.sent_count += 1
except Exception as e:
    logger.error(f"Email failed for {recipient.id}: {e}")
    job.failed_count += 1
    continue  # Process next recipient
```

**Result:** Job completes with partial success

```json
{
  "status": "completed",
  "sent_count": 44,
  "failed_count": 1,
  "error_message": "Last error: Connection timeout for user@example.com"
}
```

### Job-Level Errors

When template or event doesn't exist:

```python
if not template:
    job.status = 'failed'
    job.error_message = 'Template not found'
    await db.commit()
    return
```

**Result:** Job marked as failed, no emails sent

---

## Security Considerations

### 1. Plan Gating
- ✅ Growth+ features protected by `require_email_system_access()`
- ✅ Superadmin always has access
- ✅ Free/Pro plans return 403 Forbidden

### 2. Ownership Verification
- ✅ Users can only access/edit their own events
- ✅ Query filters: `WHERE event.created_by = current_user.id`
- ✅ Email templates scoped to event

### 3. Input Validation
- ✅ Pydantic schemas validate all inputs
- ✅ Email addresses validated
- ✅ HTML sanitization (via Pydantic escaping)
- ✅ Template variables checked against whitelist

### 4. SMTP Security
- ✅ TLS encryption required
- ✅ Credentials in environment variables
- ✅ Connection pooling (aiosmtplib)
- ✅ No hardcoded passwords

### 5. Database Security
- ✅ SQL injection prevented (parameterized queries)
- ✅ Foreign key constraints enforce integrity
- ✅ Timestamps track modifications

---

## Scaling Considerations

### Current Limitations
- **APScheduler**: Single instance (no clustering)
- **Email rate**: SMTP-limited (~100 emails/min typical)
- **Batch size**: Fixed at 50 (optimized for most providers)

### Future Optimizations
1. **Multiple workers:**
   - Deploy multiple backend instances
   - Use Redis-backed APScheduler for coordination

2. **Email queuing:**
   - Use Celery + RabbitMQ for distributed task processing
   - Better error handling and retries

3. **Template caching:**
   - Cache rendered templates in Redis
   - Reduce Jinja2 rendering overhead

4. **CDN for attachments:**
   - Store certificate PDFs in S3/CloudFront
   - Send download links instead of attachments

---

## Monitoring & Debugging

### Key Metrics to Track

```
APScheduler:
├─ Job execution count (counter)
├─ Job execution time (histogram)
├─ Job failure rate (gauge)
└─ Pipeline queue depth (gauge)

Email Delivery:
├─ Emails sent (counter)
├─ Emails failed (counter)
├─ Success rate (gauge)
├─ SMTP connection time (histogram)
└─ Template rendering time (histogram)

Database:
├─ Query execution time (histogram)
├─ Connection pool usage (gauge)
└─ Transaction duration (histogram)
```

### Log Patterns

**Success pattern:**
```
INFO Processing job 456 (event 123, 45 recipients)
INFO Batch 1/1: Rendering 45 templates
INFO Batch 1/1: SMTP connected
INFO Batch completed: sent=45, failed=0 (10.2s)
INFO Job 456 completed successfully
```

**Failure pattern:**
```
ERROR Job 456 failed
ERROR Exception during batch processing
ERROR SMTP connection timeout: [errno 110]
ERROR Job marked as failed, retries: 0/3
```

---

## Testing Checklist

```
Unit Tests:
- [ ] Jinja2 template rendering with variables
- [ ] Recipient filtering (attendees vs certified)
- [ ] Email schema validation
- [ ] Plan gating logic

Integration Tests:
- [ ] Full email template CRUD
- [ ] Bulk job creation and tracking
- [ ] APScheduler job execution
- [ ] Database state transitions

E2E Tests:
- [ ] Frontend: Create email template
- [ ] Frontend: Start bulk campaign
- [ ] Backend: Process job (5 min wait)
- [ ] Verify: Job status updates in UI
- [ ] Verify: Emails received
```

---

## Maintenance Tasks

### Daily
- Monitor APScheduler logs for errors
- Check failed job count
- Verify SMTP connectivity

### Weekly
- Review email delivery stats
- Check database size growth
- Verify backup integrity

### Monthly
- Analyze email performance metrics
- Review plan usage
- Clean up old job records
  ```sql
  DELETE FROM bulk_email_jobs 
  WHERE status='completed' 
  AND updated_at < NOW() - INTERVAL '90 days'
  ```

---

**Technical Contact:** Architecture Documentation  
**Last Updated:** 2024-03-02  
**Version:** 1.0
