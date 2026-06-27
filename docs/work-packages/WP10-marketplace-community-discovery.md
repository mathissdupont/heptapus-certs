# WP10 — Marketplace, Community & Discovery

**Phase:** 3 — Platform & ecosystem · **Status:** ✅ Delivered

## Objective
Create a public, network-effect surface: a training marketplace where organizations
publish programs, a member community with social features, and a discovery feed that
ranks content intelligently rather than chronologically.

## Scope
**In:** public marketplace catalog and event/course listings; public member
profiles and certificate wallets; community posts, comments, votes; follow/connect/
block graph; discovery ranking; presentations module for live sessions.
**Out:** SEO/structured-data of these pages (WP15).

## Key deliverables
- Marketplace catalog with categories, price/free filters, and rich listings.
- Public member profiles with shareable, privacy-controlled certificate wallets.
- Community feed: posts, comments, edit history, voting, moderation.
- Social graph: follow/unfollow, connection requests, blocking.
- Discovery ranking algorithm (engagement-weighted, not naive upvote/downvote).
- Presentations: deck upload/convert, speaker notes, live audience view via WebSocket.

## Key components
- `heptacert/backend/src/marketplace_api.py` — catalog, categories, listing settings.
- `heptacert/backend/src/member_certificates_api.py` — public wallet, privacy, analytics.
- `heptacert/backend/src/social_api.py`, `connections_api.py`, `community_notifications.py` — feed, graph, moderation.
- `heptacert/backend/src/presentation_api.py`, `presentation_ws.py`, `presentation_conversion_worker.py` — decks, live control, conversion.
- Reference: [`../reference/DISCOVERY_ALGORITHM.md`](../reference/DISCOVERY_ALGORITHM.md), [`../reference/ALGORITHM_COMPARISON.md`](../reference/ALGORITHM_COMPARISON.md), [`../reference/ARCHITECTURE_SEPARATION.md`](../reference/ARCHITECTURE_SEPARATION.md).
- Migrations: `020_public_members`, `021_member_social`, `027_org_public_profile_follow`, `028_soc_feed`, `029_glob_feed`, `031–033_connections/votes`, `079_marketplace_fields`, `086_course_marketplace`, `099–103_presentation_*`.

## Acceptance criteria
- Published programs appear in the public marketplace with correct filters.
- Members control certificate-wallet visibility.
- The discovery feed surfaces relevant content; abusive content is moderated.
- Live presentations sync slide state to the audience in real time.

## Dependencies & related ADRs
Upstream: WP02, WP03, WP05, WP08. Downstream: WP15. See ADR-0005.
