---
name: certificates
description: Work with HeptaCert digital certificates, certificate verification, certificate templates, certificate tiers, issuance, and revocation.
---

# Certificates

- Use `list_certificates` to find certificate IDs and filter by recipient/status.
- Use `get_certificate_by_public_id` for verification links or public certificate IDs.
- Use `get_certificate_tier_summary` for tier distribution.
- `issue_certificates` currently targets all eligible attendees. Do not invent selected-recipient issuance when the tool does not support it.
- Call `issue_certificates` first with `confirm=false`; explain the eligible count and possible balance impact, then wait for explicit approval before `confirm=true`.
- Use `revoke_certificate` in preview mode first and require explicit approval before confirmation.
- When issuance returns a job ID/status, say that certificate generation was queued, not completed immediately.

## Certificate templates

When the connected MCP exposes them:
- Use `list_certificate_templates` to discover available template IDs.
- Use `apply_certificate_template` to apply a selected system template to an event.
- Do not claim support for drag-and-drop layout editing, organization preset CRUD, template rollback/versioning, or brand locks unless separate tools for those operations are exposed.
