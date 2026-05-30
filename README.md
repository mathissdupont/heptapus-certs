# HeptaCert

HeptaCert is a full-stack platform for event management, certificate generation, community engagement, transactional messaging, billing, and administrative operations. The repository combines a Python backend API, a Next.js frontend, shared documentation, and Docker-based workflows for development and deployment.

## What This Repository Contains

HeptaCert is organized as a product platform rather than a single service. It is meant to support the complete lifecycle of digital events and community operations:

- Event creation, configuration, attendance, and certificate issuance
- Community feeds, comments, likes, and member interactions
- Email verification, SMTP delivery, and template-driven notifications
- Subscription, billing, and payment integrations
- Admin dashboards for moderation and operational control
- Local development, containerized deployment, and validation tooling

The backend and frontend can be worked on independently, but they are designed to function as one integrated application.

## Architecture Overview

The codebase is split into the following primary application areas:

- `heptacert/backend` - FastAPI-based Python service layer, persistence, and business logic
- `heptacert/frontend` - Next.js user interface and client-side application logic

Supporting infrastructure is provided through Docker Compose and includes:

- PostgreSQL for durable relational storage
- Redis for cache, coordination, and queue-oriented workflows
- ClamAV for file and content scanning support

In practical terms, the backend handles API access, authentication, persistence, email, payments, certificates, moderation, and operational tasks. The frontend renders the public product, community pages, and admin experiences.

## Key Capabilities

The platform currently covers the following product areas:

- Event lifecycle management, including sessions, attendees, and certificates
- Community features such as feeds, comments, likes, and member interactions
- Email verification, delivery, and template rendering
- Subscription, billing, and payment provider integration
- Moderation, admin tooling, and internal operational support
- Security and validation flows around uploads and account actions
- Local-first development with optional full-stack container orchestration

## Technology Stack

- Backend: Python, FastAPI, SQLAlchemy, Alembic, Uvicorn
- Frontend: Next.js 15, React 18, TypeScript, Tailwind CSS
- Data layer: PostgreSQL, Redis
- Security and utilities: ClamAV, password hashing, token-based auth, QR and PDF tooling
- Delivery and orchestration: Docker and Docker Compose

## Repository Layout

- `heptacert/backend` - API source code, migrations, tests, Dockerfile, runtime configuration
- `heptacert/frontend` - UI source code, pages, components, static assets, Dockerfile
- `docs` - architecture notes, implementation summaries, deployment guides, test reports, and status documents
- `loadtest` - load testing scripts and scenarios
- `test_*.py`, `test_*.ps1` - repository-level validation helpers

## Getting Started

### Prerequisites

- Python 3.11+ or the provided virtual environment
- Node.js 18+ or 20+
- Docker and Docker Compose

### Recommended Workflow

Most contributors will have the smoothest experience with the following sequence:

1. Start the database and support services.
2. Install backend and frontend dependencies.
3. Run backend migrations.
4. Launch the backend and frontend in development mode.

If you prefer a fully containerized workflow, Docker Compose can run the complete stack.

## Setup

### Backend

```bash
cd heptacert/backend
pip install -r requirements.txt
```

If you are using the project virtual environment, activate it before installing dependencies.

### Frontend

```bash
cd heptacert/frontend
npm install
```

### Full Local Stack

To run the infrastructure locally with containers:

```bash
cd heptacert
docker compose -f docker-compose.local.yml up --build
```

This launches PostgreSQL, Redis, ClamAV, the backend, and the frontend.

## Running the Application

### Backend in Development Mode

```bash
cd heptacert/backend
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend in Development Mode

```bash
cd heptacert/frontend
npm run dev
```

The frontend defaults to port `3000` and the backend defaults to port `8000` when run manually.

### Docker Compose Development Environment

```bash
cd heptacert
docker compose -f docker-compose.local.yml up --build
```

## Environment Variables

The application depends on environment-specific configuration. The most important variables are:

- `DATABASE_URL`
- `ALEMBIC_DATABASE_URL`
- `JWT_SECRET`
- `EMAIL_TOKEN_SECRET`
- `NEXT_PUBLIC_API_BASE`
- `REDIS_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `PAYMENT_ENABLED` and provider-specific keys such as `IYZICO_*`, `PAYTR_*`, and `STRIPE_*`
- `OPENAI_API_KEY` and `OPENAI_MODEL` if AI-powered features are enabled

For local defaults, review `heptacert/env.local.example` and the Docker Compose files.

## Configuration Notes

- `docker-compose.local.yml` is optimized for development on a local machine.
- `docker-compose.yml` is aimed at a broader deployment setup with external network and persistent storage assumptions.
- Backend startup typically applies database migrations before starting the API.
- Frontend API calls expect the backend base URL to be available through `NEXT_PUBLIC_API_BASE`.

## Testing

Backend tests can be run with:

```bash
cd heptacert/backend
pytest
```

Project-level verification scripts are also available from the repository root:

- `test_import.py`
- `test_all_endpoints.py`
- `test_all_endpoints.ps1`

If you are validating API behavior manually, the docs folder also contains implementation and test summaries that explain the expected flows.

## Documentation Map

The `docs` directory is intentionally detailed and serves as the operational knowledge base for the repository. Useful starting points include:

- `docs/QUICK_START.md` for a fast onboarding path
- `docs/TECHNICAL_ARCHITECTURE.md` for the system design
- `docs/DEPLOYMENT_CHECKLIST.md` for release and deployment steps
- `docs/TEST_RESULTS.md` for quality and validation history
- `docs/IMPLEMENTATION_COMPLETE_SUMMARY.md` for a broader feature overview

## Deployment Guidance

The repository includes Docker assets and environment conventions that support both local and hosted deployments. Before production use, verify the following:

- Database credentials and connection strings are set correctly
- SMTP and payment secrets are populated
- Frontend and backend base URLs point to the intended environment
- Storage paths are mounted or mapped to persistent volumes
- Security-related features such as ClamAV and rate limiting are configured as required

## Support and Maintenance

This repository contains implementation summaries and status documents that explain design decisions, test coverage, and delivery notes. When making changes, review the docs first to avoid duplicating work or breaking established flows.

## License

This repository is distributed under a proprietary, highly restrictive license. The license terms are defined in [LICENSE](LICENSE).
