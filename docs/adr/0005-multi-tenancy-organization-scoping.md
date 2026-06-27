# ADR-0005 — Multi-Tenancy via Organization Scoping

**Status:** Accepted · **Date:** 2026-06-27

## Context
Many organizations operate on the platform, each with staff, events, members, and
data that must never leak across tenant boundaries. Users may also belong to more
than one organization.

## Decision
Adopt **organization-scoped multi-tenancy** in a shared database. Requests carry an
active-organization context (`X-Organization-Id`), resolved through membership and
permission checks (`get_organization_for_access`). Org-scoped endpoints must respect
that context rather than assuming the caller's own organization.

## Consequences
- A user can act within any organization they are a member of, with the right scope.
- Owner accounts are exempt from intra-org permission checks; members get effective
  permissions resolved per request.
- Trade-off: every org-scoped query must include the tenant filter — a discipline
  enforced by shared helpers; missing it is a security bug, so it is reviewed closely.
