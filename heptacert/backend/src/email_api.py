import asyncio
import hashlib
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from typing import Optional

from fastapi import Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from fastapi.routing import APIRouter
from apscheduler.triggers.cron import CronTrigger
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import distinct, func, literal, or_, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    BulkEmailJob,
    BulkEmailJobIn,
    BulkEmailJobOut,
    CertStatus,
    Certificate,
    CurrentUser,
    EmailConfigTestRequest,
    EmailConfigTestResponse,
    EmailDeliveryLog,
    EmailTemplate,
    EmailTemplateIn,
    EmailTemplateOut,
    Event,
    PublicMember,
    Role,
    SavedSMTPAccountOut,
    SuperadminAudienceItemOut,
    SuperadminAudienceOut,
    SuperadminBulkEmailIn,
    SuperadminBulkEmailJob,
    SuperadminBulkEmailJobIn,
    SuperadminBulkEmailJobOut,
    SuperadminBulkEmailOut,
    SuperadminEmailActivityItemOut,
    SuperadminEmailActivityOut,
    SystemEmailDigestConfigIn,
    SystemEmailDigestConfigOut,
    User,
    UserEmailConfigOut,
    EmailConfigUpdateIn,
    ScheduledEmailIn,
    _build_system_digest_email_content,
    _create_system_digest_job,
    _encrypt_smtp_password,
    _enqueue_superadmin_bulk_email_job,
    _get_event_for_admin,
    _ensure_system_digest_config,
    _ensure_user_email_config,
    _resolve_superadmin_recipient_emails,
    _superadmin_audience_union_stmt,
    get_current_user,
    get_db,
    logger,
    require_email_system_access,
    require_role,
    send_email_async,
    settings,
)

router = APIRouter()

SUPERADMIN_BULK_EMAIL_DAILY_JOB_QUOTA = 10
SUPERADMIN_BULK_EMAIL_DAILY_RECIPIENT_QUOTA = 2000
SUPERADMIN_DIGEST_MANUAL_DAILY_QUOTA = 1


class SuperadminBulkEmailTestIn(BaseModel):
    to_email: EmailStr
    subject: str = Field(min_length=3, max_length=240)
    body_html: str = Field(min_length=10, max_length=100_000)


class SuperadminSystemDigestTestIn(BaseModel):
    to_email: EmailStr


class SuperadminTestEmailOut(BaseModel):
    sent: bool
    to_email: EmailStr
    message: str


async def _enforce_superadmin_email_quota(
    db: AsyncSession,
    *,
    user_id: int,
    job_kind: str,
    target_count: int,
) -> None:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=1)
    count_res = await db.execute(
        select(
            func.count(SuperadminBulkEmailJob.id),
            func.coalesce(func.sum(SuperadminBulkEmailJob.total_targets), 0),
        ).where(
            SuperadminBulkEmailJob.created_by == user_id,
            SuperadminBulkEmailJob.job_kind == job_kind,
            SuperadminBulkEmailJob.created_at >= since,
            SuperadminBulkEmailJob.status.notin_(["cancelled", "failed"]),
        )
    )
    jobs_used, recipients_used = count_res.one()
    jobs_used = int(jobs_used or 0)
    recipients_used = int(recipients_used or 0)

    if job_kind == "system_digest":
        if jobs_used >= SUPERADMIN_DIGEST_MANUAL_DAILY_QUOTA:
            raise HTTPException(
                status_code=429,
                detail="Sistem digest'i 24 saat içinde en fazla 1 kez manuel gönderilebilir.",
            )
        return

    if jobs_used >= SUPERADMIN_BULK_EMAIL_DAILY_JOB_QUOTA:
        raise HTTPException(
            status_code=429,
            detail=f"Superadmin toplu e-posta kotası doldu: 24 saatte en fazla {SUPERADMIN_BULK_EMAIL_DAILY_JOB_QUOTA} kampanya oluşturabilirsiniz.",
        )
    if recipients_used + target_count > SUPERADMIN_BULK_EMAIL_DAILY_RECIPIENT_QUOTA:
        remaining = max(SUPERADMIN_BULK_EMAIL_DAILY_RECIPIENT_QUOTA - recipients_used, 0)
        raise HTTPException(
            status_code=429,
            detail=f"Superadmin toplu e-posta alıcı kotası doldu. Kalan günlük alıcı hakkı: {remaining}.",
        )
@router.get(
    "/api/admin/events/{event_id}/email-templates",
    response_model=list[EmailTemplateOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_event_email_templates(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all email templates for an event."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    res = await db.execute(
        select(EmailTemplate)
        .where(EmailTemplate.event_id == event_id)
        .order_by(EmailTemplate.created_at.desc())
    )
    return res.scalars().all()


@router.post(
    "/api/admin/events/{event_id}/email-templates",
    response_model=EmailTemplateOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def create_event_email_template(
    event_id: int,
    payload: EmailTemplateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new email template for an event."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    template = EmailTemplate(
        event_id=event_id,
        created_by=me.id,
        name=payload.name,
        subject_tr=payload.subject_tr,
        subject_en=payload.subject_en,
        body_html=payload.body_html,
        template_type="custom",
        is_default=False,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.patch(
    "/api/admin/events/{event_id}/email-templates/{template_id}",
    response_model=EmailTemplateOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def update_event_email_template(
    event_id: int,
    template_id: int,
    payload: EmailTemplateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an email template."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
    template.name = payload.name
    template.subject_tr = payload.subject_tr
    template.subject_en = payload.subject_en
    template.body_html = payload.body_html
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.delete(
    "/api/admin/events/{event_id}/email-templates/{template_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def delete_event_email_template(
    event_id: int,
    template_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an email template."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
    await db.delete(template)
    await db.commit()
    return {"message": "Template silindi"}


@router.post(
    "/api/admin/events/{event_id}/email-templates/{template_id}/preview",
    response_model=dict,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def preview_email_template(
    event_id: int,
    template_id: int,
    payload: dict,  # { language: "tr" | "en", sample_attendee: { name: str, email: str } }
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Preview an email template with sample data."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    # Get template
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.event_id == event_id)
    )
    template = t_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
    # Get event for details
    ev_res = await db.execute(select(Event).where(Event.id == event_id))
    event = ev_res.scalar_one_or_none()
    
    # Prepare sample data
    language = payload.get("language", "tr")
    sample_attendee = payload.get("sample_attendee", {"name": "Ãƒâ€“rnek KatÃ„Â±lÃ„Â±mcÃ„Â±", "email": "ornek@example.com"})
    
    # Simple template variable replacement
    variables = {
        f"{{{{{v}}}}}": sample_attendee[v] 
        for v in sample_attendee.keys()
        if hasattr(sample_attendee, '__getitem__') or isinstance(sample_attendee, dict)
    }
    variables = {
        "{{attendee_name}}": sample_attendee.get("name", "KatÃ„Â±lÃ„Â±mcÃ„Â±"),
        "{{attendee_email}}": sample_attendee.get("email", ""),
        "{{event_name}}": event.name if event else "Etkinlik",
        "{{event_date}}": event.date.isoformat() if (event and hasattr(event, 'date') and event.date) else "",
    }
    
    # Select subject and body based on language
    if language == "en" and hasattr(template, 'subject_en'):
        subject = template.subject_en
    else:
        subject = template.subject_tr
    
    body_html = template.body_html
    
    # Replace variables
    for var, value in variables.items():
        subject = subject.replace(var, str(value))
        body_html = body_html.replace(var, str(value))
    
    return {
        "subject": subject,
        "body_html": body_html,
        "language": language,
        "template_id": template_id,
        "event_id": event_id,
    }


@router.get(
    "/api/system/email-templates",
    response_model=list[EmailTemplateOut],
)
async def list_system_email_templates(db: AsyncSession = Depends(get_db)):
    """Get system default email templates."""
    res = await db.execute(
        select(EmailTemplate)
        .where(EmailTemplate.template_type == "system", EmailTemplate.is_default == True)
        .order_by(EmailTemplate.created_at.asc())
    )
    return res.scalars().all()




@router.get(
    "/api/admin/email-config",
    response_model=UserEmailConfigOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_email_config(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's email configuration."""
    return await _ensure_user_email_config(db, me.id)


@router.patch(
    "/api/admin/email-config",
    response_model=UserEmailConfigOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_email_config(
    payload: EmailConfigUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's email configuration (including encrypted SMTP password)."""
    config = await _ensure_user_email_config(db, me.id)

    config.smtp_enabled = payload.smtp_enabled
    config.smtp_use_tls = payload.smtp_use_tls
    if payload.smtp_host is not None:
        config.smtp_host = payload.smtp_host.strip() or None
    if payload.smtp_port is not None:
        config.smtp_port = payload.smtp_port
    if payload.from_email is not None:
        config.from_email = str(payload.from_email).strip().lower() or None
    if payload.smtp_user is not None:
        config.smtp_user = payload.smtp_user.strip() or None
    if payload.smtp_password:
        config.smtp_password = _encrypt_smtp_password(payload.smtp_password)
    if payload.from_name is not None:
        config.from_name = payload.from_name.strip() or None
    if payload.reply_to is not None:
        config.reply_to = payload.reply_to.strip() or None
    if payload.auto_cc is not None:
        config.auto_cc = payload.auto_cc.strip() or None
    config.enable_tracking_pixel = payload.enable_tracking_pixel

    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


@router.get(
    "/api/admin/email-config/saved-accounts",
    response_model=list[SavedSMTPAccountOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_saved_smtp_accounts(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await _ensure_user_email_config(db, me.id)
    if not (config.smtp_host or config.smtp_user or config.from_email):
        return []
    return [
        SavedSMTPAccountOut(
            id=config.id,
            smtp_enabled=bool(config.smtp_enabled),
            smtp_host=config.smtp_host,
            smtp_port=config.smtp_port,
            smtp_use_tls=bool(config.smtp_use_tls),
            smtp_user=config.smtp_user,
            from_email=config.from_email,
            from_name=config.from_name,
            updated_at=config.updated_at,
            has_password=bool(config.smtp_password),
        )
    ]


@router.post(
    "/api/admin/email-config/test-connection",
    response_model=EmailConfigTestResponse,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def test_smtp_connection(
    payload: EmailConfigTestRequest,
):
    """Test SMTP connection without storing credentials."""
    import smtplib
    from email.mime.text import MIMEText
    
    try:
        # Create SMTP connection
        server_factory = smtplib.SMTP_SSL if payload.smtp_use_tls and payload.smtp_port == 465 else smtplib.SMTP
        with server_factory(payload.smtp_host, payload.smtp_port, timeout=10) as server:
            if payload.smtp_use_tls and payload.smtp_port != 465:
                server.starttls()
            server.login(payload.smtp_user, payload.smtp_password)

            # Try to send a test email
            msg = MIMEText("Test connection")
            msg['Subject'] = "HeptaCert SMTP Test"
            msg['From'] = str(payload.from_email)
            msg['To'] = str(payload.test_email)
            server.send_message(msg, from_addr=str(payload.from_email), to_addrs=[str(payload.test_email)])
        
        return EmailConfigTestResponse(
            status="success",
            message="SMTP baÄŸlantÄ±sÄ± baÅŸarÄ±lÄ±",
            verified_at=datetime.utcnow()
        )
    except smtplib.SMTPAuthenticationError:
        return EmailConfigTestResponse(
            status="error",
            message="Kimlik doÄŸrulama hatasÄ±: geÃ§ersiz kullanÄ±cÄ± adÄ± veya ÅŸifre"
        )
    except smtplib.SMTPException as e:
        return EmailConfigTestResponse(
            status="error",
            message=f"SMTP hatasÄ±: {str(e)}"
        )
    except Exception as e:
        return EmailConfigTestResponse(
            status="error",
            message=f"BaÄŸlantÄ± hatasÄ±: {str(e)}"
        )


# â”€â”€ Admin: Bulk Email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€



@router.post(
    "/api/admin/events/{event_id}/bulk-email",
    response_model=BulkEmailJobOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def start_bulk_email(
    event_id: int,
    payload: BulkEmailJobIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a bulk email job."""
    event = await _get_event_for_admin(event_id, me, db, "email:write")
    
    # Verify template exists
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == payload.email_template_id)
    )
    if not t_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
    # Count recipients
    if payload.recipient_type == "attendees":
        count_res = await db.execute(
            select(func.count(Attendee.id)).where(
                Attendee.event_id == event_id,
                Attendee.email.is_not(None),
                func.trim(Attendee.email) != "",
                Attendee.unsubscribed_at.is_(None),
            )
        )
        recipients_count = count_res.scalar() or 0
    else:  # certified
        attendee_res = await db.execute(
            select(Attendee.name).where(
                Attendee.event_id == event_id,
                Attendee.email.is_not(None),
                func.trim(Attendee.email) != "",
                Attendee.unsubscribed_at.is_(None),
            )
        )
        attendee_names = {
            (name or "").strip().lower()
            for name in attendee_res.scalars().all()
            if (name or "").strip()
        }
        cert_res = await db.execute(
            select(Certificate.student_name).where(
                Certificate.event_id == event_id,
                Certificate.deleted_at.is_(None),
                Certificate.status == CertStatus.active,
            )
        )
        certified_names = {
            (name or "").strip().lower()
            for name in cert_res.scalars().all()
            if (name or "").strip()
        }
        recipients_count = len(attendee_names & certified_names)
    if recipients_count == 0:
        raise HTTPException(status_code=400, detail="Al??c?? bulunamad??")
    # Create job
    job = BulkEmailJob(
        event_id=event_id,
        created_by=me.id,
        email_template_id=payload.email_template_id,
        recipient_type=payload.recipient_type,
        recipients_count=recipients_count,
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # TODO: Schedule async task to process this job (APScheduler)
    return job


@router.get(
    "/api/admin/events/{event_id}/bulk-email/{job_id}",
    response_model=BulkEmailJobOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def get_bulk_email_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get bulk email job details."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadÃ„Â±")
    
    return job


@router.get(
    "/api/admin/events/{event_id}/bulk-emails",
    response_model=list[BulkEmailJobOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def list_bulk_email_jobs(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all bulk email jobs for an event."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    res = await db.execute(
        select(BulkEmailJob)
        .where(BulkEmailJob.event_id == event_id)
        .order_by(BulkEmailJob.created_at.desc())
    )
    return res.scalars().all()


@router.post(
    "/api/admin/events/{event_id}/scheduled-email",
    response_model=dict,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_email_system_access)],
)
async def schedule_email_job(
    event_id: int,
    payload: ScheduledEmailIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Schedule an email job for future delivery.
    
    Three modes:
    - immediate: Send now
    - datetime: Send at specific datetime
    - cron: Send on schedule (e.g., "0 9 * * MON" = every Monday at 9 AM)
    """
    event = await _get_event_for_admin(event_id, me, db, "email:write")
    
    # Verify template exists
    t_res = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == payload.email_template_id)
    )
    if not t_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Template bulunamadÃ„Â±")
    
    # Count recipients
    if payload.recipient_type == "attendees":
        count_res = await db.execute(
            select(func.count(Attendee.id)).where(
                Attendee.event_id == event_id,
                Attendee.email.is_not(None),
                func.trim(Attendee.email) != "",
                Attendee.unsubscribed_at.is_(None),
            )
        )
        recipients_count = count_res.scalar() or 0
    else:  # certified
        attendee_res = await db.execute(
            select(Attendee.name).where(
                Attendee.event_id == event_id,
                Attendee.email.is_not(None),
                func.trim(Attendee.email) != "",
                Attendee.unsubscribed_at.is_(None),
            )
        )
        attendee_names = {
            (name or "").strip().lower()
            for name in attendee_res.scalars().all()
            if (name or "").strip()
        }
        cert_res = await db.execute(
            select(Certificate.student_name).where(
                Certificate.event_id == event_id,
                Certificate.deleted_at.is_(None),
                Certificate.status == CertStatus.active,
            )
        )
        certified_names = {
            (name or "").strip().lower()
            for name in cert_res.scalars().all()
            if (name or "").strip()
        }
        recipients_count = len(attendee_names & certified_names)
    if recipients_count == 0:
        raise HTTPException(status_code=400, detail="Al??c?? bulunamad??")
    # Create the bulk email job
    job = BulkEmailJob(
        event_id=event_id,
        created_by=me.id,
        email_template_id=payload.email_template_id,
        recipient_type=payload.recipient_type,
        recipients_count=recipients_count,
        status="pending" if payload.schedule_type == "immediate" else "scheduled",
    )
    
    # Handle scheduling
    if payload.schedule_type == "immediate":
        job.status = "pending"  # Will be picked up by the 5-minute scheduler
    elif payload.schedule_type == "datetime":
        if not payload.scheduled_datetime:
            raise HTTPException(status_code=400, detail="scheduled_datetime gerekli")
        job.scheduled_at = payload.scheduled_datetime
        job.status = "scheduled"
    elif payload.schedule_type == "cron":
        if not payload.cron_expression:
            raise HTTPException(status_code=400, detail="cron_expression gerekli")
        try:
            CronTrigger.from_crontab(payload.cron_expression, timezone="UTC")
        except Exception:
            raise HTTPException(status_code=400, detail="GeÃƒÂ§ersiz cron ifadesi")
        job.cron_expression = payload.cron_expression
        job.status = "scheduled"
    else:
        raise HTTPException(status_code=400, detail="schedule_type geÃƒÂ§ersiz")
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    return {
        "id": job.id,
        "event_id": job.event_id,
        "status": job.status,
        "recipients_count": job.recipients_count,
        "scheduled_at": job.scheduled_at.isoformat() if job.scheduled_at else None,
        "cron_expression": job.cron_expression,
        "message": f"Email {payload.schedule_type} baÃ…Å¸arÃ„Â±lÃ„Â±" if payload.schedule_type != "datetime" else f"Email {payload.scheduled_datetime} tarihinde gÃƒÂ¶nderilmek ÃƒÂ¼zere zamanlandÃ„Â±",
    }


@router.get(
    "/api/admin/events/{event_id}/scheduled-emails",
    response_model=list[dict],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_scheduled_emails(
    event_id: int,
    status: Optional[str] = Query(None),  # Filter by status: scheduled, completed, failed, cancelled
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get scheduled email jobs for an event."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    q = select(BulkEmailJob).where(BulkEmailJob.event_id == event_id, BulkEmailJob.status != "pending")
    if status:
        q = q.where(BulkEmailJob.status == status)
    q = q.order_by(BulkEmailJob.created_at.desc())
    
    res = await db.execute(q)
    jobs = res.scalars().all()
    
    return [
        {
            "id": j.id,
            "email_template_id": j.email_template_id,
            "status": j.status,
            "recipients_count": j.recipients_count,
            "sent_count": j.sent_count,
            "failed_count": j.failed_count,
            "scheduled_at": j.scheduled_at.isoformat() if j.scheduled_at else None,
            "cron_expression": j.cron_expression,
            "created_at": j.created_at.isoformat(),
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


@router.post(
    "/api/admin/events/{event_id}/bulk-emails-cancel/{job_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def cancel_email_job(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a scheduled or pending email job."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadÃ„Â±")
    
    if job.status not in ["pending", "scheduled"]:
        raise HTTPException(status_code=400, detail="Sadece pending/scheduled joblar iptal edilebilir")
    
    job.status = "cancelled"
    db.add(job)
    await db.commit()
    
    return {"message": "Job baÃ…Å¸arÃ„Â±yla iptal edildi"}


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Email Delivery Tracking Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@router.post(
    "/api/admin/bulk-email-jobs/{job_id}/log-delivery",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def log_email_delivery(
    job_id: int,
    payload: dict,  # { attendee_id: int, status: "sent" | "failed" | "bounced", reason?: str }
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log email delivery status for tracking (internal API for background workers)."""
    # Simple validation - in production, this should have a secret token
    j_res = await db.execute(select(BulkEmailJob).where(BulkEmailJob.id == job_id))
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadÃ„Â±")
    
    attendee_id = payload.get("attendee_id")
    status = payload.get("status", "sent")
    reason = payload.get("reason")
    
    log_entry = EmailDeliveryLog(
        bulk_job_id=job_id,
        attendee_id=attendee_id,
        status=status,
        reason=reason,
        sent_at=datetime.utcnow(),
    )
    db.add(log_entry)
    await db.commit()
    
    return {"id": log_entry.id, "status": "logged"}


@router.get(
    "/api/admin/events/{event_id}/bulk-email-jobs/{job_id}/delivery-stats",
    response_model=dict,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_delivery_stats(
    event_id: int,
    job_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get delivery statistics for a bulk email job."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    # Get job
    j_res = await db.execute(
        select(BulkEmailJob).where(BulkEmailJob.id == job_id, BulkEmailJob.event_id == event_id)
    )
    job = j_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadÃ„Â±")
    
    # Get delivery logs
    logs_res = await db.execute(
        select(func.count(EmailDeliveryLog.id), EmailDeliveryLog.status)
        .where(EmailDeliveryLog.bulk_job_id == job_id)
        .group_by(EmailDeliveryLog.status)
    )
    logs_by_status = {status: count for count, status in logs_res.all()}
    
    return {
        "job_id": job_id,
        "total_recipients": job.recipients_count,
        "sent": logs_by_status.get("sent", 0),
        "failed": logs_by_status.get("failed", 0),
        "bounced": logs_by_status.get("bounced", 0),
        "opened": logs_by_status.get("opened", 0),
        "pending": job.recipients_count - sum(logs_by_status.values()),
        "open_rate": round(logs_by_status.get("opened", 0) / job.recipients_count * 100, 2) if job.recipients_count > 0 else 0,
        "bounce_rate": round(logs_by_status.get("bounced", 0) / job.recipients_count * 100, 2) if job.recipients_count > 0 else 0,
        "failure_rate": round(logs_by_status.get("failed", 0) / job.recipients_count * 100, 2) if job.recipients_count > 0 else 0,
    }


@router.get(
    "/api/admin/events/{event_id}/bulk-email-jobs/{job_id}/delivery-logs",
    response_model=dict,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_delivery_logs(
    event_id: int,
    job_id: int,
    status: Optional[str] = Query(None),  # Filter by status
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=500),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed delivery logs for a bulk email job."""
    await _get_event_for_admin(event_id, me, db, "email:write")
    
    # Get logs
    q = select(EmailDeliveryLog, Attendee).join(
        Attendee, EmailDeliveryLog.attendee_id == Attendee.id
    ).where(EmailDeliveryLog.bulk_job_id == job_id)
    
    if status:
        q = q.where(EmailDeliveryLog.status == status)
    
    # Count total
    count_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = int(count_res.scalar_one() or 0)
    
    # Paginate
    q = q.order_by(EmailDeliveryLog.sent_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(q)
    logs = res.all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "attendee": {"id": attendee.id, "name": attendee.name, "email": attendee.email},
                "status": log.status,
                "reason": log.reason,
                "sent_at": log.sent_at.isoformat(),
                "opened_at": log.opened_at.isoformat() if log.opened_at else None,
            }
            for log, attendee in logs
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


# Ã¢â€â‚¬Ã¢â€â‚¬ Admin: Webhook Subscriptions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@router.get(
    "/api/superadmin/email-audience",
    response_model=SuperadminAudienceOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def get_superadmin_email_audience(
    source: str = Query(default="all", pattern="^(all|public_members|attendees|organizers)$"),
    search: Optional[str] = Query(default=None, max_length=320),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    audience_union = _superadmin_audience_union_stmt(source).subquery("audience_union")

    grouped = select(
        audience_union.c.email,
        func.sum(audience_union.c.public_member_count).label("public_member_count"),
        func.sum(audience_union.c.attendee_count).label("attendee_count"),
        func.sum(audience_union.c.organizer_count).label("organizer_count"),
    ).group_by(audience_union.c.email)

    if search and search.strip():
        search_like = f"%{search.strip().lower()}%"
        grouped = grouped.where(audience_union.c.email.ilike(search_like))

    grouped_subquery = grouped.subquery("audience_grouped")

    total_res = await db.execute(select(func.count()).select_from(grouped_subquery))
    total = int(total_res.scalar_one() or 0)

    unique_public_res = await db.execute(
        select(func.count(distinct(func.lower(func.trim(PublicMember.email))))).where(
            PublicMember.email.is_not(None),
            func.trim(PublicMember.email) != "",
        )
    )
    unique_public_member_emails = int(unique_public_res.scalar_one() or 0)

    unique_attendee_res = await db.execute(
        select(func.count(distinct(func.lower(func.trim(Attendee.email))))).where(
            Attendee.email.is_not(None),
            func.trim(Attendee.email) != "",
        )
    )
    unique_attendee_emails = int(unique_attendee_res.scalar_one() or 0)

    unique_organizer_res = await db.execute(
        select(func.count(distinct(func.lower(func.trim(User.email))))).where(
            User.email.is_not(None),
            func.trim(User.email) != "",
            User.role == Role.admin,
        )
    )
    unique_organizer_emails = int(unique_organizer_res.scalar_one() or 0)

    rows_res = await db.execute(
        select(grouped_subquery)
        .order_by(grouped_subquery.c.email.asc())
        .offset(offset)
        .limit(limit)
    )
    rows = rows_res.all()

    items = [
        SuperadminAudienceItemOut(
            email=row.email,
            public_member_count=int(row.public_member_count or 0),
            attendee_count=int(row.attendee_count or 0),
        )
        for row in rows
    ]

    return SuperadminAudienceOut(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        source=source,
        unique_public_member_emails=unique_public_member_emails,
        unique_attendee_emails=unique_attendee_emails,
        unique_organizer_emails=unique_organizer_emails,
    )


@router.post(
    "/api/superadmin/bulk-email",
    response_model=SuperadminBulkEmailOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def send_superadmin_bulk_email(
    payload: SuperadminBulkEmailIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recipient_emails = await _resolve_superadmin_recipient_emails(db, payload.source)

    if not recipient_emails:
        return SuperadminBulkEmailOut(
            dry_run=payload.dry_run,
            source=payload.source,
            targeted=0,
            sent=0,
            failed=0,
            message="Hedef alici bulunamadi.",
        )

    if payload.dry_run:
        return SuperadminBulkEmailOut(
            dry_run=True,
            source=payload.source,
            targeted=len(recipient_emails),
            sent=0,
            failed=0,
            message="Dry-run tamamlandi. E-posta gonderimi yapilmadi.",
        )

    await _enforce_superadmin_email_quota(
        db,
        user_id=me.id,
        job_kind="manual",
        target_count=len(recipient_emails),
    )

    sem = asyncio.Semaphore(10)
    sent_count = 0
    failed_count = 0

    async def _send_single(to_email: str) -> None:
        nonlocal sent_count, failed_count
        async with sem:
            try:
                await send_email_async(
                    to=to_email,
                    subject=payload.subject,
                    html_body=payload.body_html,
                    raise_on_error=True,
                    sender_user_id=me.id,
                )
                sent_count += 1
            except Exception:
                failed_count += 1

    await asyncio.gather(*[_send_single(email) for email in recipient_emails])

    audit_job = SuperadminBulkEmailJob(
        created_by=me.id,
        source=payload.source,
        job_kind="manual",
        subject=payload.subject,
        body_html=payload.body_html,
        total_targets=len(recipient_emails),
        sent_count=sent_count,
        failed_count=failed_count,
        status="completed",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        cancel_requested=False,
    )
    db.add(audit_job)
    await db.commit()

    return SuperadminBulkEmailOut(
        dry_run=False,
        source=payload.source,
        targeted=len(recipient_emails),
        sent=sent_count,
        failed=failed_count,
        message="Toplu e-posta islemi tamamlandi.",
    )


@router.post(
    "/api/superadmin/bulk-email/test",
    response_model=SuperadminTestEmailOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def send_superadmin_bulk_email_test(
    payload: SuperadminBulkEmailTestIn,
    me: CurrentUser = Depends(get_current_user),
):
    to_email = str(payload.to_email).strip().lower()
    await send_email_async(
        to=to_email,
        subject=f"[TEST] {payload.subject}",
        html_body=payload.body_html,
        raise_on_error=True,
        sender_user_id=me.id,
    )
    return SuperadminTestEmailOut(
        sent=True,
        to_email=to_email,
        message="Test e-postası gönderildi.",
    )


@router.post(
    "/api/superadmin/bulk-email/jobs",
    response_model=SuperadminBulkEmailJobOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def create_superadmin_bulk_email_job(
    payload: SuperadminBulkEmailJobIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recipient_emails = await _resolve_superadmin_recipient_emails(db, payload.source)
    if not recipient_emails:
        raise HTTPException(status_code=400, detail="Hedef alici bulunamadi.")
    await _enforce_superadmin_email_quota(
        db,
        user_id=me.id,
        job_kind="manual",
        target_count=len(recipient_emails),
    )

    job = SuperadminBulkEmailJob(
        created_by=me.id,
        source=payload.source,
        job_kind="manual",
        subject=payload.subject,
        body_html=payload.body_html,
        total_targets=len(recipient_emails),
        status="pending",
        cancel_requested=False,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    await _enqueue_superadmin_bulk_email_job(job.id)
    return job


@router.get("/api/public/attendees/{attendee_id}/unsubscribe-verify")
async def verify_unsubscribe_token(
    attendee_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    a_res = await db.execute(select(Attendee).where(Attendee.id == attendee_id))
    attendee = a_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Katılımcı bulunamadı")

    expected_token = hashlib.sha256(f"{attendee_id}:{attendee.email}".encode()).hexdigest()[:16]
    is_valid = token == expected_token

    return {
        "valid": is_valid,
        "attendee_email": attendee.email if is_valid else None,
    }


@router.get(
    "/api/superadmin/system-digest/config",
    response_model=SystemEmailDigestConfigOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def get_system_digest_config(db: AsyncSession = Depends(get_db)):
    config = await _ensure_system_digest_config(db)
    return config


@router.patch(
    "/api/superadmin/system-digest/config",
    response_model=SystemEmailDigestConfigOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def update_system_digest_config(
    payload: SystemEmailDigestConfigIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await _ensure_system_digest_config(db)
    config.enabled = payload.enabled
    config.frequency = payload.frequency
    config.send_weekday = payload.send_weekday
    config.send_hour = payload.send_hour
    config.max_events = payload.max_events
    config.max_posts = payload.max_posts
    config.updated_by = me.id
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


@router.post(
    "/api/superadmin/system-digest/send-now",
    response_model=SuperadminBulkEmailJobOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def send_system_digest_now(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await _ensure_system_digest_config(db)
    subject, body_html, _, _ = await _build_system_digest_email_content(db, config)
    await _enforce_superadmin_email_quota(
        db,
        user_id=me.id,
        job_kind="system_digest",
        target_count=1,
    )
    return await _create_system_digest_job(db, me.id, subject, body_html)


@router.post(
    "/api/superadmin/system-digest/test",
    response_model=SuperadminTestEmailOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def send_system_digest_test(
    payload: SuperadminSystemDigestTestIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await _ensure_system_digest_config(db)
    subject, body_html, _, _ = await _build_system_digest_email_content(db, config)
    to_email = str(payload.to_email).strip().lower()
    await send_email_async(
        to=to_email,
        subject=f"[TEST] {subject}",
        html_body=body_html,
        raise_on_error=True,
        sender_user_id=me.id,
    )
    return SuperadminTestEmailOut(
        sent=True,
        to_email=to_email,
        message="Test sistem digest'i gönderildi.",
    )


@router.get(
    "/api/superadmin/system-digest/preview",
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def preview_system_digest(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await _ensure_system_digest_config(db)
    subject, body_html, events_count, posts_count = await _build_system_digest_email_content(db, config)
    return {
        "subject": subject,
        "body_html": body_html,
        "events_count": events_count,
        "posts_count": posts_count,
    }


@router.get(
    "/api/superadmin/bulk-email/jobs",
    response_model=list[SuperadminBulkEmailJobOut],
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def list_superadmin_bulk_email_jobs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(SuperadminBulkEmailJob)
        .order_by(SuperadminBulkEmailJob.created_at.desc(), SuperadminBulkEmailJob.id.desc())
        .offset(offset)
        .limit(limit)
    )
    return res.scalars().all()


@router.get(
    "/api/superadmin/email-activity",
    response_model=SuperadminEmailActivityOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def list_superadmin_email_activity(
    channel: str = Query(default="all", pattern="^(all|event_bulk|superadmin_bulk)$"),
    status: Optional[str] = Query(default=None, max_length=32),
    sender_user_id: Optional[int] = Query(default=None, ge=1),
    search: Optional[str] = Query(default=None, max_length=320),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    event_bulk_stmt = select(
        literal("event_bulk").label("channel"),
        BulkEmailJob.id.label("job_id"),
        BulkEmailJob.created_by.label("sender_user_id"),
        User.email.label("sender_email"),
        BulkEmailJob.event_id.label("event_id"),
        Event.name.label("event_name"),
        BulkEmailJob.recipient_type.label("recipient_group"),
        func.coalesce(EmailTemplate.subject_tr, EmailTemplate.subject_en, "(template)").label("subject"),
        BulkEmailJob.status.label("status"),
        func.coalesce(BulkEmailJob.recipients_count, 0).label("total_targets"),
        func.coalesce(BulkEmailJob.sent_count, 0).label("sent_count"),
        func.coalesce(BulkEmailJob.failed_count, 0).label("failed_count"),
        BulkEmailJob.created_at.label("created_at"),
        BulkEmailJob.started_at.label("started_at"),
        BulkEmailJob.completed_at.label("completed_at"),
        BulkEmailJob.error_message.label("error_message"),
    ).join(User, User.id == BulkEmailJob.created_by).outerjoin(Event, Event.id == BulkEmailJob.event_id).outerjoin(
        EmailTemplate, EmailTemplate.id == BulkEmailJob.email_template_id
    )

    superadmin_bulk_stmt = select(
        literal("superadmin_bulk").label("channel"),
        SuperadminBulkEmailJob.id.label("job_id"),
        SuperadminBulkEmailJob.created_by.label("sender_user_id"),
        User.email.label("sender_email"),
        literal(None).label("event_id"),
        literal(None).label("event_name"),
        SuperadminBulkEmailJob.source.label("recipient_group"),
        SuperadminBulkEmailJob.subject.label("subject"),
        SuperadminBulkEmailJob.status.label("status"),
        func.coalesce(SuperadminBulkEmailJob.total_targets, 0).label("total_targets"),
        func.coalesce(SuperadminBulkEmailJob.sent_count, 0).label("sent_count"),
        func.coalesce(SuperadminBulkEmailJob.failed_count, 0).label("failed_count"),
        SuperadminBulkEmailJob.created_at.label("created_at"),
        SuperadminBulkEmailJob.started_at.label("started_at"),
        SuperadminBulkEmailJob.completed_at.label("completed_at"),
        SuperadminBulkEmailJob.error_message.label("error_message"),
    ).join(User, User.id == SuperadminBulkEmailJob.created_by)

    if channel == "event_bulk":
        activity_query = event_bulk_stmt
    elif channel == "superadmin_bulk":
        activity_query = superadmin_bulk_stmt
    else:
        activity_query = union_all(event_bulk_stmt, superadmin_bulk_stmt)

    activity_sub = activity_query.subquery("email_activity")
    filtered = select(activity_sub)

    if status:
        filtered = filtered.where(activity_sub.c.status == status)
    if sender_user_id:
        filtered = filtered.where(activity_sub.c.sender_user_id == sender_user_id)
    if search and search.strip():
        search_like = f"%{search.strip().lower()}%"
        filtered = filtered.where(
            or_(
                activity_sub.c.sender_email.ilike(search_like),
                activity_sub.c.subject.ilike(search_like),
                activity_sub.c.event_name.ilike(search_like),
            )
        )

    filtered_sub = filtered.subquery("email_activity_filtered")
    total_res = await db.execute(select(func.count()).select_from(filtered_sub))
    total = int(total_res.scalar_one() or 0)

    rows_res = await db.execute(
        select(filtered_sub)
        .order_by(filtered_sub.c.created_at.desc(), filtered_sub.c.job_id.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = rows_res.all()

    items = [
        SuperadminEmailActivityItemOut(
            channel=row.channel,
            job_id=row.job_id,
            sender_user_id=row.sender_user_id,
            sender_email=row.sender_email,
            event_id=row.event_id,
            event_name=row.event_name,
            recipient_group=row.recipient_group,
            subject=row.subject,
            status=row.status,
            total_targets=int(row.total_targets or 0),
            sent_count=int(row.sent_count or 0),
            failed_count=int(row.failed_count or 0),
            created_at=row.created_at,
            started_at=row.started_at,
            completed_at=row.completed_at,
            error_message=row.error_message,
        )
        for row in rows
    ]

    return SuperadminEmailActivityOut(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/api/superadmin/bulk-email/jobs/{job_id}/cancel",
    response_model=SuperadminBulkEmailJobOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def cancel_superadmin_bulk_email_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(SuperadminBulkEmailJob).where(SuperadminBulkEmailJob.id == job_id))
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadi")

    if job.status in {"completed", "failed", "cancelled"}:
        return job

    job.cancel_requested = True
    if job.status == "pending":
        job.status = "cancelled"
        job.completed_at = datetime.now(timezone.utc)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.post(
    "/api/superadmin/bulk-email/jobs/{job_id}/retry",
    response_model=SuperadminBulkEmailJobOut,
    dependencies=[Depends(require_role(Role.superadmin))],
)
async def retry_superadmin_bulk_email_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(SuperadminBulkEmailJob).where(SuperadminBulkEmailJob.id == job_id))
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadi")

    if job.status in {"pending", "sending"}:
        return job

    recipient_emails = await _resolve_superadmin_recipient_emails(db, job.source)
    if not recipient_emails:
        raise HTTPException(status_code=400, detail="Hedef alici bulunamadi.")

    job.total_targets = len(recipient_emails)
    job.sent_count = 0
    job.failed_count = 0
    job.status = "pending"
    job.cancel_requested = False
    job.error_message = None
    job.started_at = None
    job.completed_at = None
    db.add(job)
    await db.commit()
    await db.refresh(job)

    await _enqueue_superadmin_bulk_email_job(job.id)
    return job




def _unsubscribe_success_html(title: str, message: str) -> str:
    return f"""
    <!doctype html>
    <html lang="tr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <style>
        body {{ margin: 0; font-family: Arial, Helvetica, sans-serif; background: #f8fafc; color: #0f172a; }}
        main {{ min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; }}
        section {{ max-width: 520px; background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; box-shadow: 0 18px 48px rgba(15,23,42,.08); }}
        h1 {{ margin: 0 0 10px; font-size: 24px; }}
        p {{ margin: 0; color: #475569; line-height: 1.6; }}
        a {{ display: inline-block; margin-top: 20px; color: #0f766e; font-weight: 700; text-decoration: none; }}
      </style>
    </head>
    <body>
      <main>
        <section>
          <h1>{title}</h1>
          <p>{message}</p>
          <a href="{settings.frontend_base_url}">Siteye dön</a>
        </section>
      </main>
    </body>
    </html>
    """.strip()


async def _unsubscribe_attendee(attendee_id: int, token: str, db: AsyncSession) -> dict[str, str]:
    a_res = await db.execute(select(Attendee).where(Attendee.id == attendee_id))
    attendee = a_res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Katılımcı bulunamadı")

    expected_token = hashlib.sha256(f"{attendee_id}:{attendee.email}".encode()).hexdigest()[:16]
    if token != expected_token:
        logger.warning(f"Invalid unsubscribe token for attendee {attendee_id}")
        raise HTTPException(status_code=401, detail="Geçersiz token")

    attendee.unsubscribed_at = datetime.now(timezone.utc)
    db.add(attendee)
    await db.commit()

    return {
        "status": "unsubscribed",
        "message": f"{attendee.email} adresi için e-posta aboneliği kaldırıldı.",
    }


@router.get("/api/public/attendees/{attendee_id}/unsubscribe", response_class=HTMLResponse)
async def unsubscribe_attendee_from_email_page(
    attendee_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await _unsubscribe_attendee(attendee_id, token, db)
    return HTMLResponse(_unsubscribe_success_html("Abonelikten çıktınız", result["message"]))


@router.post("/api/public/attendees/{attendee_id}/unsubscribe")
async def unsubscribe_from_email(
    attendee_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await _unsubscribe_attendee(attendee_id, token, db)


async def _unsubscribe_public_member_digest(member_id: int, token: str, db: AsyncSession) -> dict[str, str]:
    member_res = await db.execute(select(PublicMember).where(PublicMember.id == member_id))
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")

    expected_token = hashlib.sha256(f"public_member:{member.id}:{member.email}".encode()).hexdigest()[:16]
    if token != expected_token:
        logger.warning(f"Invalid digest unsubscribe token for public member {member_id}")
        raise HTTPException(status_code=401, detail="Geçersiz token")

    member.digest_opt_in = False
    db.add(member)
    await db.commit()

    return {
        "status": "unsubscribed",
        "message": f"{member.email} adresi için topluluk e-postaları kapatıldı.",
    }


@router.get("/api/public/members/{member_id}/unsubscribe-digest", response_class=HTMLResponse)
async def unsubscribe_public_member_digest_page(
    member_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await _unsubscribe_public_member_digest(member_id, token, db)
    return HTMLResponse(_unsubscribe_success_html("E-posta tercihiniz güncellendi", result["message"]))


@router.post("/api/public/members/{member_id}/unsubscribe-digest")
async def unsubscribe_public_member_digest(
    member_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await _unsubscribe_public_member_digest(member_id, token, db)
