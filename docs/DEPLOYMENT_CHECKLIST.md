# ✅ Deployment Checklist & Monitoring

## Pre-Deployment (Before `docker-compose up`)

- [ ] **Code Review**
  - [ ] All Python files compile (`python -m py_compile`)
  - [ ] All TypeScript files valid (no syntax errors)
  - [ ] No secrets in code
  - [ ] Environment variables documented

- [ ] **Dependencies**
  - [ ] `requirements.txt` updated with `jinja2==3.1.2`
  - [ ] `package.json` has necessary packages
  - [ ] No compatibility issues

- [ ] **Database**
  - [ ] Migration files created (007, 008)
  - [ ] Migration syntax valid
  - [ ] Rollback functions implemented
  - [ ] Schema is sound

- [ ] **Environment**
  - [ ] `.env` file configured with SMTP settings
  - [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` set
  - [ ] `SMTP_FROM` configured
  - [ ] Database credentials correct

---

## Deployment Command

```bash
# Navigate to project directory
cd heptacert

# Start all services (database, backend, frontend)
docker-compose up -d

# Verify all containers are running
docker-compose ps

# Expected output:
# NAME                  STATUS           PORTS
# heptacert-db          healthy          5432/tcp
# heptacert-backend     healthy          8765:8000
# heptacert-frontend    Up 10 seconds     3030:3000
```

---

## Post-Deployment - Phase 1: Initialization (2-5 minutes)

### Step 1: Monitor Migration Execution

```bash
# Watch backend logs for migration start
docker logs -f heptacert-backend | grep -i "alembic\|migration\|creating"
```

**Expected output:**
```
INFO [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO [alembic.runtime.migration] Will assume transactional DDL.
INFO [alembic.runtime.migration] Running upgrade 006 -> 007 ...
INFO [alembic.runtime.migration] Running upgrade 007 -> 008 ...
INFO Creating 7 certificate templates...
INFO Creating 2 email templates (Turkish and English)...
```

⏰ **Time:** 30-60 seconds

### Step 2: Verify Database Tables Created

```bash
docker exec heptacert-db psql -U heptacert -d heptacert -c "\dt"
```

**Expected tables:**
```
Schema |              Name              | Type  | Owner
-------+--------------------------------+-------+-----------
public | alembic_version                | table | heptacert
public | bulk_email_jobs                | table | heptacert
public | certificate_templates          | table | heptacert
public | email_templates                | table | heptacert
public | user_email_configs             | table | heptacert
... (other existing tables)
```

### Step 3: Verify Seed Data

```bash
# Check certificate templates (should be 7)
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "SELECT COUNT(*), STRING_AGG(name, ', ') FROM certificate_templates;"

# Output should show:
# count | string_agg
# ----+----------
#   7 | Minimalist, Profesyonel, Renkli, Kurumsal, Modern, Elegant, Akademik
```

```bash
# Check email templates (should be 2)
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "SELECT COUNT(*), STRING_AGG(name, ', ') FROM email_templates WHERE is_system=true;"

# Output should show:
# count | string_agg
# ----+----------
#   2 | Sertifika Teslim, Kayıt Onayı
```

### Step 4: Backend API Health Check

```bash
curl -s http://localhost:8765/api/health | jq '.'
```

**Expected response:**
```json
{"status": "ok"}
```

If failed, check logs:
```bash
docker logs heptacert-backend | tail -50
```

### Step 5: Frontend Availability Check

```bash
curl -s http://localhost:3030 | head -20
```

**Expected:** HTML page (Next.js startup)

---

## Post-Deployment - Phase 2: API Validation (5-10 minutes)

### Test 1: Certificate Templates Endpoint

```bash
curl -s http://localhost:8765/api/system/cert-templates | jq 'length'
# Expected: 7
```

**Full response check:**
```bash
curl -s http://localhost:8765/api/system/cert-templates | jq '.[0]'
# Should show: {id: 1, name: "Minimalist", template_image_url: "...", config: {...}}
```

### Test 2: Email Templates Endpoint

```bash
curl -s http://localhost:8765/api/system/email-templates | jq 'length'
# Expected: 2
```

### Test 3: Plan Gating (403 Protection)

```bash
# Get admin token (assuming demo admin exists)
TOKEN=$(curl -s -X POST http://localhost:8765/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | jq -r '.access_token')

# Create test event
EVENT=$(curl -s -X POST http://localhost:8765/api/admin/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","template_image_url":"x","config":{}}' | jq '.id')

# Try to create bulk email (should work if Growth plan)
curl -s -X POST http://localhost:8765/api/admin/events/$EVENT/bulk-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email_template_id":1,"recipient_type":"attendees"}' | jq '.status'

# Expected: (if Growth plan) "pending"
# Expected: (if Free plan) contains "403" error
```

### Test 4: APScheduler Registration

```bash
docker logs heptacert-backend 2>&1 | grep -i "scheduler\|apscheduler"
```

**Expected messages:**
```
INFO Starting APScheduler
INFO Scheduler started
INFO Added job: _process_bulk_emails | next run at: ...
```

---

## Post-Deployment - Phase 3: Frontend Validation (10-15 minutes)

### Test 1: Settings Page Load

```
Visit: http://localhost:3030/admin/events/1/settings

Verify:
- [ ] Page loads without errors
- [ ] Event name field visible
- [ ] Event description textarea visible
- [ ] Banner upload section visible
- [ ] Growth plan indicator (if applicable)
```

### Test 2: Email Templates Editor

```
Visit: http://localhost:3030/admin/events/1/email-templates

Verify:
- [ ] Custom Templates tab loads
- [ ] System Templates tab loads
- [ ] "Yeni Şablon" button present
- [ ] Click creates modal
- [ ] Form fields appear (name, subject_tr, subject_en, body_html)
```

### Test 3: Bulk Email Manager

```
Visit: http://localhost:3030/admin/events/1/bulk-emails

Verify:
- [ ] Page loads
- [ ] "Yeni Kampanya" button visible
- [ ] Click opens modal
- [ ] Email template dropdown populates
- [ ] Recipient type options visible (attendees, certified)
```

### Test 4: Event Editor Quick Links

```
Visit: http://localhost:3030/admin/events/1/editor

Verify:
- [ ] Top navigation bar has 3 new buttons:
  - [ ] Settings (gear icon)
  - [ ] Email (mail icon)
  - [ ] Campaign (send icon)
- [ ] Each button clicks and navigates correctly
```

---

## Post-Deployment - Phase 4: Full Workflow Test (20+ minutes)

### Workflow: Complete Email Campaign

**Step 1: Create Email Template**
```bash
curl -X POST http://localhost:8765/api/admin/events/$EVENT/email-templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "subject_tr": "Test Türkçe",
    "subject_en": "Test English",
    "body_html": "<p>Hello {{recipient_name}}</p>"
  }'

# Save template ID from response
TEMPLATE_ID=<response.id>
```

**Step 2: Start Bulk Email Job**
```bash
JOB=$(curl -X POST http://localhost:8765/api/admin/events/$EVENT/bulk-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email_template_id\": $TEMPLATE_ID,
    \"recipient_type\": \"attendees\"
  }" | jq '.id')

echo "Job created: $JOB"
```

**Step 3: Check Initial Status (should be "pending")**
```bash
curl -s http://localhost:8765/api/admin/events/$EVENT/bulk-email/$JOB \
  -H "Authorization: Bearer $TOKEN" | jq '{status, sent_count, failed_count}'

# Expected: {"status": "pending", "sent_count": 0, "failed_count": 0}
```

**Step 4: Wait 5+ Minutes for APScheduler**
```bash
# Monitor logs
docker logs -f heptacert-backend | grep -i "bulk\|job"

# Expect to see:
# Processing bulk email job 1...
# Batch 1: Rendering 45 templates
# Batch 1 completed: 45 sent, 0 failed
# Job 1 marked as completed
```

**Step 5: Check Final Status (should be "completed")**
```bash
curl -s http://localhost:8765/api/admin/events/$EVENT/bulk-email/$JOB \
  -H "Authorization: Bearer $TOKEN" | jq '{status, sent_count, failed_count, total_recipients}'

# Expected: {"status": "completed", "sent_count": X, "failed_count": 0, "total_recipients": X}
```

**Step 6: Frontend Auto-Refresh Check**
```
Visit: http://localhost:3030/admin/events/1/bulk-emails

Verify:
- [ ] Job appears in list
- [ ] Status shows "Gönderiliyor" initially
- [ ] Progress bar appears
- [ ] After 5 minutes, status changes to "Tamamlandı"
- [ ] Progress bar shows 100%
- [ ] Statistics update (45 sent, 0 failed)
```

---

## Ongoing Monitoring (After Deployment)

### Daily Tasks

```bash
# 1. Check APScheduler is running
docker logs heptacert-backend | grep -i "scheduler" | tail -5

# 2. Look for errors
docker logs heptacert-backend | grep -i "error\|exception" | tail -10

# 3. Check failed jobs
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "SELECT COUNT(*) as failed_jobs FROM bulk_email_jobs WHERE status='failed';"

# 4. Monitor database size
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "SELECT pg_size_pretty(pg_database_size('heptacert'));"
```

### Weekly Tasks

```bash
# 1. Job completion rate
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "SELECT 
     COUNT(*) as total,
     SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
     SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
   FROM bulk_email_jobs 
   WHERE created_at > NOW() - INTERVAL '7 days';"

# 2. Email success rate
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "SELECT 
     SUM(sent_count) as total_sent,
     SUM(failed_count) as total_failed,
     ROUND(100 * SUM(sent_count) / (SUM(sent_count) + SUM(failed_count)), 2) as success_rate
   FROM bulk_email_jobs 
   WHERE status='completed' 
   AND created_at > NOW() - INTERVAL '7 days';"

# 3. Template usage
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "SELECT 
     et.name,
     COUNT(bej.id) as usage_count
   FROM email_templates et
   LEFT JOIN bulk_email_jobs bej ON et.id = bej.email_template_id
   GROUP BY et.id, et.name
   ORDER BY usage_count DESC;"
```

### Health Checks

```bash
# Create a monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash

echo "=== Email System Health Check ==="
echo

echo "1. Docker Containers:"
docker-compose ps

echo -e "\n2. APScheduler Status:"
docker logs heptacert-backend | grep -i "scheduler" | tail -1

echo -e "\n3. Failed Jobs (last 7 days):"
docker exec heptacert-db psql -U heptacert -d heptacert -c \
  "SELECT COUNT(*) FROM bulk_email_jobs WHERE status='failed' AND created_at > NOW() - INTERVAL '7 days';" 2>/dev/null | tail -1

echo -e "\n4. Recent Errors:"
docker logs heptacert-backend | grep -i "error" | tail -3

echo -e "\n=== Health Check Complete ==="
EOF

chmod +x monitor.sh
./monitor.sh  # Run periodically via cron
```

---

## Troubleshooting Guide

### ❌ Containers Won't Start

**Diagnosis:**
```bash
docker-compose logs backend
docker-compose logs db
```

**Common Issues:**
1. Port already in use
   ```bash
   # Free port 8765
   lsof -i :8765
   kill -9 <PID>
   ```

2. Database won't initialize
   ```bash
   # Check PostgreSQL logs
   docker logs heptacert-db | tail -20
   # Verify credentials in .env
   ```

3. Out of disk space
   ```bash
   docker system df
   docker system prune  # Clean up unused images
   ```

### ❌ Migrations Failed

**Diagnosis:**
```bash
docker exec heptacert-backend alembic current
docker exec heptacert-backend alembic history
```

**Recovery:**
```bash
# Check what failed
docker logs heptacert-backend | grep -i "alembic\|migration"

# Option 1: Clear and restart
docker exec heftacert-backend alembic downgrade base
docker restart heptacert-backend

# Option 2: Manual database reset (⚠️ Data loss!)
docker exec heptacert-db psql -U heptacert -d heptacert -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker restart heptacert-backend
```

### ❌ APScheduler Not Running

**Diagnosis:**
```bash
docker logs heptacert-backend | grep -i "scheduler\|apscheduler"
```

**Should see:**
```
INFO Starting APScheduler
INFO Scheduler started
INFO Added job
```

**If missing:**
```bash
# Check for startup errors
docker logs heptacert-backend | tail -50

# Restart backend
docker restart heptacert-backend

# Verify restart
docker logs heptacert-backend | grep -i "scheduler"
```

### ❌ Emails Not Sending

**Diagnosis:**
```bash
# Check SMTP configuration
docker exec heptacert-backend env | grep SMTP

# Check logs for SMTP errors
docker logs heptacert-backend | grep -i "smtp\|mail"
```

**Common Issues:**
1. SMTP credentials wrong → Update `.env` and restart
2. SMTP provider quota reached → Check provider dashboard
3. Firewall blocking port 587 → Contact infrastructure

**Test SMTP manually:**
```bash
# From inside container
docker exec heptacert-backend python3 -c "
import smtplib
try:
    with smtplib.SMTP('{SMTP_HOST}', {SMTP_PORT}) as server:
        server.starttls()
        server.login('{SMTP_USER}', '{SMTP_PASSWORD}')
        print('✓ SMTP connection successful')
except Exception as e:
    print(f'✗ SMTP error: {e}')
"
```

### ❌ API Returns 403 Forbidden

**Diagnosis:**
```bash
# Check user's subscription
curl http://localhost:8765/api/me/subscription -H "Authorization: Bearer $TOKEN" | jq '.plan_id'

# Should be 'growth' or 'enterprise', not 'free' or 'pro'
```

**Fix:**
1. User upgrades plan via payment
2. Or manually in database (for testing):
   ```bash
   docker exec heptacert-db psql -U heptacert -d heptacert -c \
     "UPDATE subscriptions SET plan_id='growth' WHERE user_id=1;"
   ```

### ❌ Frontend Pages Not Loading

**Diagnosis:**
```bash
curl -i http://localhost:3030/admin/events/1/settings
```

**Common Issues:**
1. Frontend server crashed → Check logs
   ```bash
   docker logs heptacert-frontend | tail -50
   ```

2. API is unreachable → Check backend
   ```bash
   curl http://localhost:8765/api/health
   ```

3. Browser cache → Clear cookies
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```

---

## Rollback Procedure

**If something goes wrong:**

### Option 1: Rollback One Migration
```bash
docker exec heptacert-backend alembic downgrade 007
docker restart heptacert-backend
```

### Option 2: Full Rollback
```bash
# Stop containers
docker-compose down

# Remove volumes (⚠️ Deletes data)
docker volume rm heptacert_db_data

# Start fresh
docker-compose up -d

# Fresh migration will run
```

### Option 3: Keep Data, Revert Code
```bash
# Revert Git changes
git checkout HEAD -- backend/ frontend/

# Restart containers
docker-compose restart

# Re-run deployments
```

---

## Compliance Checklist

- [ ] All SMTP traffic uses TLS encryption
- [ ] No credentials logged to stdout
- [ ] Database accessed only via authenticated user
- [ ] Plan gating prevents unauthorized access
- [ ] Audit logs track email sending
- [ ] GDPR/Privacy compliance (unsubscribe headers)
- [ ] Data retention policies defined
- [ ] Backup procedures documented
- [ ] Disaster recovery plan ready

---

## Success Criteria

✅ Deployment is complete when:

1. All containers healthy (`docker-compose ps` shows all "healthy")
2. Database migrations succeeded (no "ERROR" messages)
3. 7 certificate templates seeded
4. 2 email templates seeded
5. API endpoints respond (health check passes)
6. Frontend pages load (no 404 errors)
7. APScheduler logs show "Scheduler started"
8. Test email campaign completes within 5 minutes
9. Email reaches user inbox (or spam folder)
10. UI shows campaign status updates in real-time

---

**When all checks pass, your Email System is production-ready! 🎉**

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Monitoring Contact:** _______________
