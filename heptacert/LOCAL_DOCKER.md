# Local Docker

This setup is for local development only. It does not change the production/server
`docker-compose.yml`.

## First run

```powershell
Copy-Item env.local.example .env.local
docker compose -f docker-compose.local.yml --env-file .env.local up --build
```

Open:

- Frontend: http://localhost:3030
- Backend API: http://localhost:8765/api/health

Default local bootstrap admin comes from `.env.local`:

- Email: `superadmin@local.test`
- Email: `superadmin@example.com`
- Password: `StrongSuperAdminPass123!`

## Stop

```powershell
docker compose -f docker-compose.local.yml --env-file .env.local down
```

## Reset local data

This removes only the local Docker volumes used by `docker-compose.local.yml`.

```powershell
docker compose -f docker-compose.local.yml --env-file .env.local down -v
```

## Production

Keep using the existing server compose file:

```powershell
docker compose up -d --build
```

The production compose keeps its external Caddy network and server storage paths.

## Why local uses a different DB bootstrap

The production database already has the legacy baseline tables. A brand-new local
database does not, so the local compose first creates the current SQLAlchemy
schema and then stamps Alembic at `head`. The server compose still runs the real
`alembic upgrade head` flow.
