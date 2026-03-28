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
        exists = await Domain.get_by_domain(db, payload.domain)
        if exists:
            raise HTTPException(status_code=409, detail="Domain already exists")

        owner = payload.owner or str(me.id)
        dom = await Domain.create(db, payload.domain, owner=owner)

        org_res = await db.execute(
            select(Organization).where(Organization.user_id == me.id)
        )
        org = org_res.scalar_one_or_none()

        if not org:
            org = Organization(
                user_id=me.id,
                org_name="",
                brand_color="#6366f1",
                custom_domain=payload.domain,
            )
            db.add(org)
        else:
            org.custom_domain = payload.domain

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


@router.post("/api/domains/{domain}/regenerate")
async def regenerate_domain_token(domain: str):
    async with SessionLocal() as db:
        new = await Domain.regenerate_token(db, domain)
        if new is None:
            raise HTTPException(status_code=404, detail="Domain not found")
        await db.commit()
        return {"token": new}


@router.delete("/api/domains/{domain}")
async def delete_domain(domain: str):
    async with SessionLocal() as db:
        ok = await Domain.delete_by_domain(db, domain)
        if not ok:
            raise HTTPException(status_code=404, detail="Domain not found")
        await db.commit()
        return {"deleted": True}


@router.get("/api/admin/organization/domains", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_my_domains(me: CurrentUser = Depends(get_current_user)):
    async with SessionLocal() as db:
        q = select(Domain).where(Domain.owner == str(me.id))
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
        d = await Domain.get_by_domain(db, domain)
        if not d:
            raise HTTPException(status_code=404, detail="Domain not found")

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
            else:
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