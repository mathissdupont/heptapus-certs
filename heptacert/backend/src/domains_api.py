from __future__ import annotations

import secrets
import re
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, field_validator
from typing import Optional
import dns.resolver
import logging
from urllib.parse import urlparse

from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    SessionLocal,
    get_current_user,
    CurrentUser,
    require_role,
    Role,
    Organization,
    settings,
)
from .domains import Domain

logger = logging.getLogger("heptacert.domains")

router = APIRouter()


async def _get_owned_domain_or_404(db: AsyncSession, domain: str, owner_id: int) -> Domain:
    dom = await Domain.get_by_domain(db, domain)
    if not dom or dom.owner != str(owner_id):
        raise HTTPException(status_code=404, detail="Domain not found")
    return dom


async def _resolve_org(
    request: Request,
    me: CurrentUser,
    db: AsyncSession,
    permission: str = "organization:profile_write",
) -> Organization:
    """Aktif org context'ini (X-Organization-Id) ve izni dikkate alarak kurumu cozer.

    Domain'ler kurum sahibinin user id'siyle (str(org.user_id)) sahiplenilir; boylece
    bir uye, profile_write izniyle uyesi oldugu kurumun (kendi bos org'unun degil)
    domain'lerini yonetebilir. Kurum sahibi izin kontrolunden muaftir.
    """
    from .organization_access_api import get_organization_for_access, organization_id_from_request

    return await get_organization_for_access(db, me, permission, organization_id_from_request(request))


class DomainCreateIn(BaseModel):
    domain: str
    owner: Optional[str] = None

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: str) -> str:
        domain = value.strip().lower().rstrip(".")
        if not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", domain):
            raise ValueError("Domain must be a valid hostname")
        return domain


class DomainOut(BaseModel):
    id: int
    domain: str
    owner: Optional[str]
    status: str
    token: str
    created_at: Optional[str] = None
    verification_host: Optional[str] = None
    dns_target: Optional[str] = None


class OrganizationDomainOut(BaseModel):
    custom_domain: Optional[str] = None


class OrganizationDomainUpdateIn(BaseModel):
    custom_domain: Optional[str] = None


def _custom_domain_dns_target() -> str:
    parsed = urlparse(settings.frontend_base_url)
    return (parsed.hostname or settings.frontend_base_url.replace("https://", "").replace("http://", "").split("/", 1)[0]).strip()


def _domain_out(dom: Domain) -> DomainOut:
    return DomainOut(
        id=dom.id,
        domain=dom.domain,
        owner=dom.owner,
        status=dom.status,
        token=dom.token,
        created_at=dom.created_at.isoformat() if getattr(dom, "created_at", None) else None,
        verification_host=f"_heptacert-verify.{dom.domain}",
        dns_target=_custom_domain_dns_target(),
    )


@router.post("/api/domains", response_model=DomainOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_domain(payload: DomainCreateIn, request: Request, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        org = await _resolve_org(request, me, db)
        owner_key = str(org.user_id)
        normalized_domain = payload.domain.strip().lower()
        exists = await Domain.get_by_domain(db, normalized_domain)
        if exists:
            raise HTTPException(status_code=409, detail="Domain already exists")

        dom = await Domain.create(db, normalized_domain, owner=owner_key)

        org.custom_domain = normalized_domain

        await db.commit()
        await db.refresh(dom)

        return _domain_out(dom)


@router.get("/api/domains/{domain}", response_model=DomainOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_domain(domain: str, request: Request, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        org = await _resolve_org(request, me, db, "organization:view")
        dom = await _get_owned_domain_or_404(db, domain.strip().lower(), org.user_id)
        return _domain_out(dom)


@router.post("/api/domains/{domain}/regenerate", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def regenerate_domain_token(domain: str, request: Request, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        org = await _resolve_org(request, me, db)
        dom = await _get_owned_domain_or_404(db, domain.strip().lower(), org.user_id)
        new = await Domain.regenerate_token(db, dom.domain)
        await db.commit()
        return {"token": new}


@router.delete("/api/domains/{domain}", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_domain(domain: str, request: Request, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        org = await _resolve_org(request, me, db)
        dom = await _get_owned_domain_or_404(db, domain.strip().lower(), org.user_id)
        if org.custom_domain == dom.domain:
            org.custom_domain = None
        ok = await Domain.delete_by_domain(db, dom.domain)
        if not ok:
            raise HTTPException(status_code=404, detail="Domain not found")
        await db.commit()
        return {"deleted": True}


@router.get("/api/admin/organization/domains", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_my_domains(request: Request, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        org = await _resolve_org(request, me, db, "organization:view")
        q = select(Domain).where(Domain.owner == str(org.user_id)).order_by(Domain.created_at.desc())
        res = await db.execute(q)
        items = res.scalars().all()
        out = []
        for d in items:
            out.append(_domain_out(d))
        return out


@router.get(
    "/api/admin/organization/domain",
    response_model=OrganizationDomainOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_organization_domain(request: Request, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        org = await _resolve_org(request, me, db, "organization:view")
        return OrganizationDomainOut(custom_domain=org.custom_domain)


@router.put(
    "/api/admin/organization/domain",
    response_model=OrganizationDomainOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_organization_domain(payload: OrganizationDomainUpdateIn, request: Request, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        org = await _resolve_org(request, me, db)
        next_domain = payload.custom_domain.strip().lower().rstrip(".") if payload.custom_domain else None
        if next_domain:
            domain = await _get_owned_domain_or_404(db, next_domain, org.user_id)
            org.custom_domain = domain.domain
        else:
            org.custom_domain = None
        await db.commit()
        return OrganizationDomainOut(custom_domain=org.custom_domain)


@router.get("/api/domains/{domain}/check")
async def check_domain(domain: str, request: Request, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        org = await _resolve_org(request, me, db)
        d = await _get_owned_domain_or_404(db, domain.strip().lower(), org.user_id)

        txt_name = f"_heptacert-verify.{domain}"

        try:
            answers = dns.resolver.resolve(txt_name, "TXT", lifetime=5)
            tokens = []
            for r in answers:
                for s in r.strings:
                    tokens.append(s.decode() if isinstance(s, bytes) else str(s))

            if d.token in tokens:
                d.status = "active"
                db.add(d)
                org.custom_domain = d.domain

                await db.commit()
                return {"status": "active"}

            return {"status": d.status}

        except Exception as exc:
            logger.debug("DNS check failed for %s: %s", domain, exc)
            return {"status": d.status}

@router.get("/.internal/caddy/authorize")
async def caddy_authorize(domain: Optional[str] = Query(None)):
    if not domain:
        raise HTTPException(status_code=400, detail="missing domain")
    async with SessionLocal() as db:
        d = await Domain.get_by_domain(db, domain)
        if d and d.status == "active":
            return {"authorized": True}
        raise HTTPException(status_code=403, detail="unauthorized")
