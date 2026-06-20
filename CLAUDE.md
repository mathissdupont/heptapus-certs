# Project Context

This is a typescript project using fastapi, next-pages, next-app with sqlalchemy.
It is a microservices repo with workspaces: backend (heptacert\backend), heptacert-docs (heptacert\docs), heptacert-frontend (heptacert\frontend).

The API has 690 routes. See .codesight/routes.md for the full route map with methods, paths, and tags.
The database has 155 models. See .codesight/schema.md for the full schema with fields, types, and relations.
The UI has 238 components. See .codesight/components.md for the full list with props.
Middleware includes: custom, rate-limit, auth.

High-impact files (most imported, changes here affect many other files):
- /main.py (imported by 64 files)
- /organization_access_api.py (imported by 14 files)
- //output.py (imported by 11 files)
- //client.py (imported by 10 files)
- /db_types.py (imported by 7 files)
- /config.py (imported by 7 files)
- /enums.py (imported by 5 files)
- /generator.py (imported by 4 files)

Required environment variables (no defaults):
- ALLOW_QA_SEED (heptacert\backend\src\qa_seed_api.py)
- APPLE_WALLET_CERT_PATH (heptacert\backend\.env.example)
- APPLE_WALLET_KEY_PASSWORD (heptacert\backend\.env.example)
- APPLE_WALLET_KEY_PATH (heptacert\backend\.env.example)
- APPLE_WALLET_PASS_TYPE_ID (heptacert\backend\.env.example)
- APPLE_WALLET_TEAM_ID (heptacert\backend\.env.example)
- APPLE_WALLET_WWDR_CERT_PATH (heptacert\backend\.env.example)
- GOOGLE_OAUTH_CLIENT_ID (heptacert\backend\.env.example)
- GOOGLE_OAUTH_CLIENT_SECRET (heptacert\backend\.env.example)
- HEPTACERT_API_BASE (heptacert\backend\src\mcp_server.py)
- HEPTACERT_API_KEY (heptacert\backend\src\mcp_server.py)
- HEPTACERT_UNIT_ONLY (heptacert\backend\tests\conftest.py)
- INTERNAL_API_BASE (heptacert\frontend\src\app\layout.tsx)
- IYZICO_API_KEY (heptacert\backend\.env.example)
- IYZICO_SECRET_KEY (heptacert\backend\.env.example)

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.
