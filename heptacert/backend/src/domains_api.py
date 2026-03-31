from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
import dns.resolver
import logging

from sqlalchemy.future import select

from .main import SessionLocal, get_current_user, CurrentUser, require_role, Role, Organization
from .domains import Domain

logger = logging.getLogger("heptacert.domains")

router = APIRouter()


async def _get_or_create_org(db: AsyncSession, user_id: int) -> Organization:
    org_res = await db.execute(select(Organization).where(Organization.user_id == user_id))
    org = org_res.scalar_one_or_none()
    if org:
        return org

    org = Organization(user_id=user_id, org_name="", brand_color="#6366f1")
    try:
        org.settings = {}
    except Exception:
        pass
    db.add(org)
    await db.flush()
    return org


async def _get_owned_domain_or_404(db: AsyncSession, domain: str, owner_id: int) -> Domain:
    dom = await Domain.get_by_domain(db, domain)
    if not dom or dom.owner != str(owner_id):
        raise HTTPException(status_code=404, detail="Domain not found")
    return dom


class DomainCreateIn(BaseModel):
    domain: str
    owner: Optional[str] = None


class DomainOut(BaseModel):
    id: int
    domain: str
    owner: Optional[str]
    status: str
    token: str
    created_at: Optional[str] = None


@router.post("/api/domains", response_model=DomainOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_domain(payload: DomainCreateIn, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        normalized_domain = payload.domain.strip().lower()
        exists = await Domain.get_by_domain(db, normalized_domain)
        if exists:
            raise HTTPException(status_code=409, detail="Domain already exists")

        owner = payload.owner or str(me.id)
        dom = await Domain.create(db, normalized_domain, owner=owner)

        org = await _get_or_create_org(db, me.id)
        org.custom_domain = normalized_domain

        await db.commit()
        await db.refresh(dom)

        return DomainOut(
            id=dom.id,
            domain=dom.domain,
            owner=dom.owner,
            status=dom.status,
            token=dom.token,
            created_at=dom.created_at.isoformat() if getattr(dom, "created_at", None) else None,
        )


@router.get("/api/domains/{domain}", response_model=DomainOut, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_domain(domain: str, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        dom = await _get_owned_domain_or_404(db, domain.strip().lower(), me.id)
        return DomainOut(
            id=dom.id,
            domain=dom.domain,
            owner=dom.owner,
            status=dom.status,
            token=dom.token,
            created_at=dom.created_at.isoformat() if getattr(dom, "created_at", None) else None,
        )


@router.post("/api/domains/{domain}/regenerate", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def regenerate_domain_token(domain: str, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        dom = await _get_owned_domain_or_404(db, domain.strip().lower(), me.id)
        new = await Domain.regenerate_token(db, dom.domain)
        await db.commit()
        return {"token": new}


@router.delete("/api/domains/{domain}", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_domain(domain: str, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        dom = await _get_owned_domain_or_404(db, domain.strip().lower(), me.id)
        org = await _get_or_create_org(db, me.id)
        if org.custom_domain == dom.domain:
            org.custom_domain = None
        ok = await Domain.delete_by_domain(db, dom.domain)
        if not ok:
            raise HTTPException(status_code=404, detail="Domain not found")
        await db.commit()
        return {"deleted": True}


@router.get("/api/admin/organization/domains", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_my_domains(me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        q = select(Domain).where(Domain.owner == str(me.id)).order_by(Domain.created_at.desc())
        res = await db.execute(q)
        items = res.scalars().all()
        out = []
        for d in items:
            out.append(DomainOut(
                id=d.id,
                domain=d.domain,
                owner=d.owner,
                status=d.status,
                token=d.token,
                created_at=d.created_at.isoformat() if getattr(d, "created_at", None) else None,
            ))
        return out


@router.get("/api/domains/{domain}/check")
async def check_domain(domain: str, me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        d = await _get_owned_domain_or_404(db, domain.strip().lower(), me.id)

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

                org_res = await db.execute(
                    select(Organization).where(Organization.user_id == me.id)
                )
                org = org_res.scalar_one_or_none()
                if org:
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
