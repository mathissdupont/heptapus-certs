from html import escape

from sqlalchemy import select

from .main import (
    Event,
    Organization,
    OrganizationFollower,
    PublicMember,
    SessionLocal,
    _get_event_visibility,
    _get_public_event_identifier,
    logger,
    send_email_async,
    settings,
)


async def send_public_event_announcement_to_followers(event_id: int) -> None:
    async with SessionLocal() as db:
        row = (
            await db.execute(
                select(Event, Organization)
                .join(Organization, Organization.user_id == Event.admin_id)
                .where(Event.id == event_id)
            )
        ).first()
        if not row:
            return

        event, organization = row
        if _get_event_visibility(event) != "public":
            return

        result = await db.execute(
            select(PublicMember)
            .join(OrganizationFollower, OrganizationFollower.public_member_id == PublicMember.id)
            .where(
                OrganizationFollower.org_id == organization.id,
                PublicMember.is_verified == True,
                PublicMember.digest_opt_in == True,
            )
            .order_by(PublicMember.id.asc())
        )
        followers = list(result.scalars().all())

    if not followers:
        return

    organization_name = escape(organization.org_name)
    event_name = escape(event.name)
    event_url = f"{settings.public_base_url.rstrip('/')}/events/{_get_public_event_identifier(event)}/register"
    subject = f"{organization.org_name} yeni bir etkinlik yayinladi: {event.name}"
    html_body = (
        f"<h2>{event_name}</h2>"
        f"<p>Takip ettiginiz <strong>{organization_name}</strong> herkese acik yeni bir etkinlik yayinladi.</p>"
        f"<p><a href=\"{event_url}\">Etkinligi incele ve kaydol</a></p>"
        "<p style=\"font-size:12px;color:#666\">Bu e-posta topluluk guncellemeleri tercihiniz nedeniyle gonderildi. "
        "<a href=\"{{ unsubscribe_url }}\">Bildirimlerden ayril</a></p>"
    )
    for follower in followers:
        try:
            await send_email_async(
                to=follower.email,
                subject=subject,
                html_body=html_body,
                sender_user_id=organization.user_id,
            )
        except Exception as exc:
            logger.warning("Public event follower notification failed for event %s: %s", event_id, exc)
