# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **43 routes** and touches: auth, db, cache, queue, email, payment, ai.

## Routes

- `POST` `/confirm` → out: TwoFAStatusOut [auth, db]
  `heptacert\backend\src\auth_2fa_api.py`
- `POST` `/api/auth/login` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/auth/2fa/validate` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/auth/register` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/auth/verify-email` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/auth/resend-verification` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/auth/oauth/bridge/exchange` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/auth/google/start` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/auth/google/callback` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/google/sheets/status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/google/sheets/start` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/google/sheets/callback` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/microsoft/excel/status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/microsoft/excel/start` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/microsoft/excel/callback` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/public/auth/register` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/public/auth/login` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/auth/verify-email` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/public/auth/resend-verification` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/public/auth/forgot-password` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/public/auth/reset-password` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/auth/forgot-password` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/auth/reset-password` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/public/me/password` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/me/password` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/verify/{uuid}` params(uuid) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/auth/magic-link` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/auth/magic-link/verify` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/events/{event_id}/register` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/oauth/validate` → in: st, out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `POST` `/api/oauth/authorize` → in: AuthorizeIn, out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `POST` `/api/oauth/token` → in: AuthorizeIn, out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `GET` `/api/oauth/userinfo` → in: st, out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `DELETE` `/api/oauth/disconnect/{client_id}` params(client_id) → out: ValidateOut [auth, db]
  `heptacert\backend\src\oauth_api.py`
- `GET` `/api/auth/oidc/start` → in: in [auth, db]
  `heptacert\backend\src\oidc_sso_api.py`
- `GET` `/api/auth/oidc/callback` → in: in [auth, db]
  `heptacert\backend\src\oidc_sso_api.py`
- `POST` `/api/admin/events/{event_id}/raffles/{raffle_id}/reset` params(event_id, raffle_id) → out: List [auth, db]
  `heptacert\backend\src\raffles_api.py`
- `GET` `/api/admin/sso` [auth, db]
  `heptacert\backend\src\sso_api.py`
- `POST` `/api/admin/sso` [auth, db]
  `heptacert\backend\src\sso_api.py`
- `PATCH` `/api/admin/sso/{config_id}` params(config_id) [auth, db]
  `heptacert\backend\src\sso_api.py`
- `DELETE` `/api/admin/sso/{config_id}` params(config_id) [auth, db]
  `heptacert\backend\src\sso_api.py`
- `GET` `/api/auth/sso/{provider}/authorize` params(provider) [auth, db]
  `heptacert\backend\src\sso_api.py`
- `GET` `/api/auth/sso/{provider}/callback` params(provider) [auth, db]
  `heptacert\backend\src\sso_api.py`

## Middleware

- **auth_2fa_api** (auth) — `heptacert\backend\src\auth_2fa_api.py`
- **ratelimit** (auth) — `heptacert\backend\src\ratelimit.py`
- **auth** (auth) — `heptacert\cli\heptacert_cli\commands\auth.py`
- **middleware** (auth) — `heptacert\frontend\src\middleware.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\auth_2fa_api.py`
- `heptacert\backend\src\main.py`
- `heptacert\backend\src\oauth_api.py`
- `heptacert\backend\src\oidc_sso_api.py`
- `heptacert\backend\src\raffles_api.py`
- `heptacert\backend\src\sso_api.py`

---
_Back to [overview.md](./overview.md)_