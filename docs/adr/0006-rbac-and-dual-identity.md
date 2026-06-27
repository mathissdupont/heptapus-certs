# ADR-0006 — RBAC and Dual Identity (Admins vs Public Members)

**Status:** Accepted · **Date:** 2026-06-27

## Context
Two very different user populations exist: organization staff who operate the
platform, and public end-users (attendees/members) who register, hold certificates,
and participate in the community. Their auth, capabilities, and data differ.

## Decision
Maintain **two identity classes** with separate token types: **admin users**
(`Role`: superadmin/admin/manager/viewer) and **public members**. Authorization uses
**role-based access control** via dependencies (`require_role`), layered with
organization permissions (ADR-0005) and plan gates (ADR-0007).

## Consequences
- Clear separation of admin vs member surfaces, tokens, and permissions.
- Superadmin bypasses tenant/plan gates for operations; viewers are read-only.
- Trade-off: two identity systems mean two login flows and token validators; shared
  helpers keep them consistent. Some endpoints must explicitly pick the right class.
