"""Auth akislari icin uctan uca endpoint (integration) testleri.

Register / verify-email / login / forgot-reset / public-member auth route
handler'larini gercek HTTP katmaninda calistirir (main.py route kapsamini
artirir). Rate limiting ve e-posta gonderimi test boyunca devre disi.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import func, select

from src.main import app, SessionLocal, User, PublicMember, Role, hash_password, make_email_token


# ── Rate limiter + e-posta gonderimini devre disi birak (flaky 429 / SMTP yok) ──
@pytest.fixture(autouse=True)
def _disable_rl_and_email(monkeypatch):
    from src.main import limiter
    prev = limiter.enabled
    limiter.enabled = False

    async def _fake_send_email(*args, **kwargs):
        return None

    monkeypatch.setattr("src.main.send_email_async", _fake_send_email)
    yield
    limiter.enabled = prev


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _get_user(email: str) -> User | None:
    async with SessionLocal() as db:
        return (await db.execute(select(User).where(func.lower(User.email) == email.lower()))).scalar_one_or_none()


# ── Register ──────────────────────────────────────────────────────────────────
class TestRegisterFlow:
    @pytest.mark.asyncio
    async def test_register_success_creates_unverified_admin(self):
        email = "reg-success@test.com"
        async with _client() as ac:
            resp = await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})
        assert resp.status_code == 201
        user = await _get_user(email)
        assert user is not None
        assert user.is_verified is False
        assert user.role == Role.admin
        assert user.verification_token  # dogrulama token'i set edildi

    @pytest.mark.asyncio
    async def test_register_requires_terms_acceptance(self):
        async with _client() as ac:
            resp = await ac.post("/api/auth/register", json={
                "email": "reg-noterms@test.com", "password": "ValidPass123", "terms_accepted": False})
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_register_duplicate_email_rejected(self):
        email = "reg-dup@test.com"
        async with _client() as ac:
            r1 = await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})
            assert r1.status_code == 201
            r2 = await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})
        assert r2.status_code == 400

    @pytest.mark.asyncio
    async def test_register_short_password_rejected(self):
        async with _client() as ac:
            resp = await ac.post("/api/auth/register", json={
                "email": "reg-short@test.com", "password": "short", "terms_accepted": True})
        assert resp.status_code == 422  # Pydantic min_length


# ── Verify e-posta + login happy path ───────────────────────────────────────────
class TestVerifyAndLogin:
    @pytest.mark.asyncio
    async def test_register_verify_then_login_succeeds(self):
        email = "verify-login@test.com"
        async with _client() as ac:
            assert (await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})).status_code == 201
            user = await _get_user(email)
            token = user.verification_token

            v = await ac.get(f"/api/auth/verify-email?token={token}")
            assert v.status_code == 200

            user = await _get_user(email)
            assert user.is_verified is True

            login = await ac.post("/api/auth/login", json={"email": email, "password": "ValidPass123"})
            assert login.status_code == 200
            body = login.json()
            assert body.get("requires_2fa") is False
            assert body.get("access_token")

    @pytest.mark.asyncio
    async def test_verify_email_invalid_token_rejected(self):
        async with _client() as ac:
            resp = await ac.get("/api/auth/verify-email?token=not-a-real-token")
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_verify_email_unknown_user_404(self):
        # gecerli imzali ama DB'de olmayan e-posta icin token
        token = make_email_token({"email": "ghost-user@test.com", "action": "verify"})
        async with _client() as ac:
            resp = await ac.get(f"/api/auth/verify-email?token={token}")
        assert resp.status_code == 404


# ── Login hata yollari ──────────────────────────────────────────────────────────
class TestLoginErrors:
    async def _make_verified_user(self, email):
        async with _client() as ac:
            await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})
            u = await _get_user(email)
            await ac.get(f"/api/auth/verify-email?token={u.verification_token}")

    @pytest.mark.asyncio
    async def test_login_wrong_password_401(self):
        email = "login-wrongpw@test.com"
        await self._make_verified_user(email)
        async with _client() as ac:
            resp = await ac.post("/api/auth/login", json={"email": email, "password": "WrongPass999"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user_401(self):
        async with _client() as ac:
            resp = await ac.post("/api/auth/login", json={"email": "nobody@test.com", "password": "ValidPass123"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_unverified_blocked_403(self):
        email = "login-unverified@test.com"
        async with _client() as ac:
            await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})
            resp = await ac.post("/api/auth/login", json={"email": email, "password": "ValidPass123"})
        assert resp.status_code == 403


# ── Sifre sifirlama akisi ────────────────────────────────────────────────────────
class TestPasswordReset:
    async def _make_verified_user(self, email):
        async with _client() as ac:
            await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})
            u = await _get_user(email)
            await ac.get(f"/api/auth/verify-email?token={u.verification_token}")

    @pytest.mark.asyncio
    async def test_forgot_password_always_200_even_unknown(self):
        async with _client() as ac:
            resp = await ac.post("/api/auth/forgot-password", json={"email": "unknown-forgot@test.com"})
        assert resp.status_code == 200  # email enumeration'i engeller

    @pytest.mark.asyncio
    async def test_full_reset_flow_changes_password(self):
        email = "reset-flow@test.com"
        await self._make_verified_user(email)
        async with _client() as ac:
            assert (await ac.post("/api/auth/forgot-password", json={"email": email})).status_code == 200
            user = await _get_user(email)
            token = user.password_reset_token
            assert token

            r = await ac.post("/api/auth/reset-password", json={"token": token, "new_password": "BrandNewPass456"})
            assert r.status_code == 200

            # eski sifre artik calismamali, yeni sifre calismali
            old = await ac.post("/api/auth/login", json={"email": email, "password": "ValidPass123"})
            assert old.status_code == 401
            new = await ac.post("/api/auth/login", json={"email": email, "password": "BrandNewPass456"})
            assert new.status_code == 200

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token_400(self):
        async with _client() as ac:
            resp = await ac.post("/api/auth/reset-password", json={"token": "bogus", "new_password": "BrandNewPass456"})
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_reset_token_cannot_be_reused(self):
        email = "reset-reuse@test.com"
        await self._make_verified_user(email)
        async with _client() as ac:
            await ac.post("/api/auth/forgot-password", json={"email": email})
            user = await _get_user(email)
            token = user.password_reset_token
            first = await ac.post("/api/auth/reset-password", json={"token": token, "new_password": "FirstNewPass789"})
            assert first.status_code == 200
            second = await ac.post("/api/auth/reset-password", json={"token": token, "new_password": "SecondNewPass000"})
        assert second.status_code == 400  # token tek kullanimlik


# ── Public member auth ──────────────────────────────────────────────────────────
class TestPublicMemberAuth:
    @pytest.mark.asyncio
    async def test_public_member_register_and_login(self):
        email = "public-member@test.com"
        async with _client() as ac:
            reg = await ac.post("/api/public/auth/register", json={
                "display_name": "Public Tester", "email": email,
                "password": "MemberPass123", "terms_accepted": True})
            assert reg.status_code == 201

            async with SessionLocal() as db:
                m = (await db.execute(select(PublicMember).where(func.lower(PublicMember.email) == email))).scalar_one_or_none()
            assert m is not None


# ── Uyelik kimligi baglama (email -> user_id) ─────────────────────────────────────
class TestMembershipLinking:
    """E-posta ile davet edilmis OrganizationMember kayitlari, kullanici dogrulayinca
    (verify) veya giris yapinca (login) user_id ile baglanmali. Aksi halde kimlik
    yalnizca e-posta eslesmesine kalir (kirilgan, kopuk audit, orphan riski)."""

    async def _make_owner_org_and_invite(self, member_email: str, status: str = "active"):
        from src.main import _get_or_create_admin_organization
        from src.organization_access_api import OrganizationMember

        async with SessionLocal() as db:
            owner = User(
                email=f"link-owner-{member_email}", password_hash=hash_password("ValidPass123"), role=Role.admin
            )
            db.add(owner)
            await db.commit()
            await db.refresh(owner)
            org = await _get_or_create_admin_organization(db, owner.id)
            await db.flush()
            member = OrganizationMember(
                organization_id=org.id, user_id=None, email=member_email, role="venue_manager", status=status
            )
            db.add(member)
            await db.commit()
            await db.refresh(member)
            assert member.user_id is None
            return member.id

    @pytest.mark.asyncio
    async def test_verify_email_links_invited_membership(self):
        from src.organization_access_api import OrganizationMember

        email = "invited-verify@test.com"
        member_id = await self._make_owner_org_and_invite(email)

        async with _client() as ac:
            assert (await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})).status_code == 201
            user = await _get_user(email)
            assert (await ac.get(f"/api/auth/verify-email?token={user.verification_token}")).status_code == 200

        async with SessionLocal() as db:
            linked = (await db.execute(
                select(OrganizationMember).where(OrganizationMember.id == member_id))).scalar_one()
        assert linked.user_id == user.id

    @pytest.mark.asyncio
    async def test_login_links_membership_invited_after_registration(self):
        from src.organization_access_api import OrganizationMember

        email = "invited-login@test.com"
        # Once kullanici kayit + dogrula (uyelik henuz yok)
        async with _client() as ac:
            assert (await ac.post("/api/auth/register", json={
                "email": email, "password": "ValidPass123", "terms_accepted": True})).status_code == 201
            user = await _get_user(email)
            assert (await ac.get(f"/api/auth/verify-email?token={user.verification_token}")).status_code == 200

        # Kayit/dogrulama sonrasi davet edilir (user_id NULL)
        member_id = await self._make_owner_org_and_invite(email)

        async with _client() as ac:
            login = await ac.post("/api/auth/login", json={"email": email, "password": "ValidPass123"})
            assert login.status_code == 200

        async with SessionLocal() as db:
            linked = (await db.execute(
                select(OrganizationMember).where(OrganizationMember.id == member_id))).scalar_one()
        assert linked.user_id == user.id
