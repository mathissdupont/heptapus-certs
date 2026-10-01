---
name: crm-analytics
description: Search HeptaCert contacts across events and analyze event, attendance, survey, and certificate data.
---

# CRM and Analytics

- Use `search_attendees_across_events` for organization-wide participant/contact lookup and event history.
- Use `get_event_analytics` for detailed event analytics.
- Use `get_event_stats` for a compact event health/count summary.
- Use `get_attendance_summary` for check-in metrics.
- Use `get_survey_responses` for collected survey responses.
- Combine read tools when the user asks for a reasoned operational summary, but distinguish observed data from interpretation.

The current baseline CRM toolset may be read-only. Do not claim to add CRM notes, change lifecycle status, assign an owner, modify lead score, merge duplicates, build saved views, create segments, or launch CRM campaigns unless those tools are actually exposed by the current connection.
