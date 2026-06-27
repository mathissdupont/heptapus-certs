# WP02 — Identity, Access & Multi-Tenancy

**Phase:** 0 — Foundations · **Status:** ✅ Delivered · **Related ADRs:** [0005](../adr/0005-multi-tenancy-organization-scoping.md), [0006](../adr/0006-rbac-and-dual-identity.md)

## Objective
Provide secure authentication, fine-grained authorization, and organization-scoped
multi-tenancy so that multiple organizations, their staff, and public end-users can
operate on one platform without data leakage.

## Scope
**In:** admin/staff login, JWT issuance, 2FA, password hashing; public-member
identity; role-based access control; organization membership and permission scoping;
an OAuth2 authorization server (for third-party/agent access); enterprise SSO/OIDC.
**Out:** plan-based feature gating (WP11), per-integration auth (WP12).

## Key deliverables
- JWT access tokens for two identity classes: **admin users** and **public members**.
- TOTP-based 2FA with recovery backup codes.
- Role model (`Role`: superadmin/admin/manager/viewer) enforced via dependencies.
- Organization membership with effective-permission resolution and
  `X-Organization-Id` request scoping.
- First-party OAuth2 server so external apps/agents obtain scoped tokens.
- Enterprise SSO (OIDC/SAML) configuration per organization.
- Soft-delete for users; audit logging of sensitive actions.

## Key components
- `heptacert/backend/src/main.py` — `hash_password`, `verify_password`, login flows,
  `require_paid_plan`/role guards.
- `heptacert/backend/src/services.py` — `require_role`, `write_audit_log`.
- `heptacert/backend/src/utils.py` — `create_access_token`, `create_public_member_access_token`, `create_partial_token`.
- `heptacert/backend/src/auth_2fa_api.py` — 2FA setup, verify, backup codes.
- `heptacert/backend/src/organization_access_api.py` — `effective_organization_permissions`, `member_allows`, `organization_id_from_request`, enterprise checks.
- `heptacert/backend/src/org_staff_api.py` — staff invitations & roles.
- `heptacert/backend/src/oauth_api.py` — OAuth2 clients, codes, refresh tokens.
- `heptacert/backend/src/sso_api.py` — per-org SSO config.
- `heptacert/frontend/src/middleware.ts` — route protection.
- Migrations: `072_2fa_backup_codes`, `085_org_staff`, `088_sso_config`, `096_oauth_server`, `068_soft_delete_users`.

## Acceptance criteria
- Tokens are scoped to identity class and role; expired/invalid tokens are rejected.
- A member of organization A cannot read organization B's data, even with a valid token.
- 2FA can be enabled, challenged, and recovered with backup codes.
- OAuth clients receive only the scopes granted; SSO login maps to the correct org.

## Dependencies & related ADRs
Upstream: WP01. Downstream: every authenticated WP. See ADR-0005, ADR-0006.
