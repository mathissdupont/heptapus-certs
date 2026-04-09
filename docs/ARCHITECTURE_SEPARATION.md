# Architecture: Events vs Social System Separation

**Date:** April 9, 2026  
**Version:** 1.0  
**Status:** Implemented

---

## Overview

The Heptapus-Certs system has two distinct but integrated subsystems:

1. **Events System** - Event management, attendance, certificates
2. **Social System** - Community feed, organization profiles, member interaction

While these systems are modularized and conceptually separate, they **share core data entities** (PublicMember, Organization) but maintain distinct comment systems and permission models.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    HEPTAPUS-CERTS BACKEND                   │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│     EVENTS SYSTEM        │      SOCIAL SYSTEM              │
│   (main.py)              │    (social_api.py)              │
│                          │                                  │
│  Models:                 │  Models:                        │
│  • Event                 │  • CommunityPost                │
│  • EventSession          │  • CommunityPostLike            │
│  • Attendee              │  • CommunityPostComment         │
│  • Certificate           │                                  │
│  • EventComment          │  Features:                      │
│  • AttendanceRecord      │  • Global Feed                  │
│  • EventRaffle           │  • Org-specific Feeds           │
│  • etc.                  │  • Post Management              │
│                          │  • Like/Comment System          │
│  Features:              │  • Member Profiles              │
│  • Event CRUD           │                                  │
│  • Attendance Tracking  │  Permission Model:              │
│  • Certification        │  • FREE: View+Comment+Like      │
│  • Registration         │  • GROWTH+: Post to Global      │
│  • Check-in             │  • ENTERPRISE: Org Feeds        │
│  • Event Comments       │  • SUPERADMIN: All Access       │
│                          │                                  │
│  Permission Model:      │  Components:                    │
│  • PAID_PLAN: Admin     │  • _load_community_...()        │
│  • PUBLIC: Register     │  • _ensure_enabled_org()        │
│  • ANY: View Public     │  • _serialize_posts()           │
│  • FREE: Comments       │  • _generate_post_public_id()   │
└──────────────────────────┴──────────────────────────────────┘
                          │
        ┌─────────────────┴──────────────────────┐
        │                                        │
    ┌───▼─────────────────────┐    ┌──────────┬─▼──────┐
    │  SHARED DATA ENTITIES   │    │ SHARED  │ SEPARATE
    │                         │    │ENTITIES │ENTITIES 
    │ PublicMember (Table)    │    │         │
    │ ├─ public_id            │    │─Public  │─Event
    │ ├─ email                │    │ Member  │ Comment
    │ ├─ display_name         │    │─Org     │
    │ ├─ avatar_url           │    │ization  │
    │ └─ attendees (REL)      │    │         │
    │                         │    │         │
    │ Organization (Table)    │    │         │
    │ ├─ public_id            │    │         │
    │ ├─ org_name             │    │         │
    │ ├─ brand_logo           │    │         │
    │ └─ created_at           │    │         │
    │                         │    │         │
    └─────────────────────────┘    └────────┴────────┘
        (Used by both)            (Separate systems)
```

---

## Data Entities

### SHARED ENTITIES (Used by both Event and Social systems)

#### PublicMember
- **Purpose:** User profiles for event attendees AND social members
- **Used By:**
  - **Events:** Attendee registration, event comments, certificate tracking
  - **Social:** Member profiles, post authors, commenters, likers
- **Key Fields:** `public_id`, `email`, `display_name`, `avatar_url`, `headline`, `location`, `website_url`
- **Relationships:**
  - `attendees` → Multiple event registrations (event participations)
  - `comments` → Multiple event page comments (NOT social posts)

**Design Note:** When a person registers for an event, they become an Attendee with a `public_member_id` link. This allows both systems to reference the same person's profile while maintaining distinct activity tracking.

#### Organization
- **Purpose:** Organizational profiles for event management and community presence
- **Used By:**
  - **Events:** Admin's organization context (for future org-specific event management)
  - **Social:** Organization profiles, org-specific community feeds
- **Key Fields:** `public_id`, `org_name`, `brand_logo`, `brand_color`, `user_id`
- **Relationships:**
  - `CommunityPost` → Organization-specific feed posts
  - `OrganizationFollower` → Social followers

---

### SEPARATE ENTITIES (System-specific)

#### EventComment (Event System Only)
- **Purpose:** Comments on EVENT PAGES, not social feed
- **NOT** shared with Community Feed system
- **Endpoints:**
  - GET/POST: `/api/public/events/{event_id}/comments`
- **Key Differences from Community Posts:**
  - Event-specific (scoped to single event)
  - Visible only on event detail page
  - Free for all authenticated members (no subscription tier)
  - No organization feed equivalent

#### CommunityPost (Social System Only)
- **Purpose:** Posts to global feed or organization feeds
- **Completely separate** from EventComment
- **Endpoints:**
  - Global: GET/POST `/api/public/feed`
  - Org-specific: GET `/api/public/organizations/{org_id}/feed`
  - Admin: `/api/admin/community/posts`
- **Subscription Tiers:**
  - FREE: Can post to global feed, cannot post to org feeds
  - GROWTH/ENTERPRISE: All posting capabilities
  - SUPERADMIN: Moderation + all access

---

## API Endpoints by System

### Events System Endpoints

**Admin Events Management:**
- `GET/POST /api/admin/events` - Create/list events
- `GET /api/admin/events/{id}` - Event details
- `GET/POST /api/admin/events/{id}/sessions` - Session management
- `GET /api/admin/events/{id}/attendees` - Attendee list
- `GET /api/admin/events/{id}/attendance` - **FIXED: Attendance matrix export (CSV/XLSX)**
- `GET/POST /api/admin/events/{id}/comments` - Moderate event comments

**Public Events:**
- `GET /api/public/events` - Browse public events
- `GET /api/public/events/{id}` - Event detail
- `GET/POST /api/public/events/{id}/comments` - Comment on event
- `POST /api/events/{id}/register` - Register for event
- `POST /api/attend/{token}` - Check-in

### Social System Endpoints

**Public Feed:**
- `GET /api/public/feed` - Global community feed
- `POST /api/public/feed` - Create post to global feed (free tier allowed)
- `GET/POST /api/public/organizations/{org_id}/feed` - Organization-specific feed
- `POST/DELETE /api/public/posts/{id}/like` - Like/unlike posts
- `GET/POST /api/public/posts/{id}/comments` - Comments on posts

**Admin Community:**
- `GET /api/admin/community/posts` - List org's posts
- `POST /api/admin/community/posts` - Create org post (Growth/Enterprise required)
- `DELETE /api/admin/community/posts/{id}` - Delete post

---

## Permission Model

### Events System
- **Registration/Comments:** FREE (no subscription required)
- **Admin Panel:** Requires PAID_PLAN subscription
- **Certificate Download:** FREE for registered attendees
- **Check-in:** On-site, no auth required (QR token)

### Social System

| Action | Tier | Limit | Notes |
|--------|------|-------|-------|
| **View Feed** | FREE | None | Can see all public posts |
| **Like Post** | FREE | None | No rate limit tracking yet |
| **Comment on Post** | FREE | 8/min | Rate limited by FastAPI limiter |
| **Post to Global Feed** | FREE | None | Can participate in discussions |
| **Post to Org Feed** | GROWTH+ | None | Admin endpoint, subscription required |
| **Organization Feed** | GROWTH+ | N/A | Organizations need subscription to enable |
| **Moderation** | SUPERADMIN | None | Delete posts, manage comments |

---

## Module Separation Strategy

### Backend Modules

**`main.py` (Core/Events Module)**
- Entry point, event management, certificates
- Contains: Event, EventSession, Attendee, EventComment, Certificate models
- Dependency: Imports from social_api (vice-versa importing not allowed)

**`social_api.py` (Social Module)**
- Community feed, posts, comments, likes
- Contains: API routes only, models imported from main.py
- Dependency: Imports Organization, PublicMember, CommunityPost from main.py
- Size: ~470 lines, clean separation of concerns

**`community_api.py` (Public APIs)**
- Might consolidate with social_api in future
- Currently: Public organization/event listing

### Frontend Structure

```
src/app/
├── admin/          # Admin dashboard (Events)
├── attend/         # Check-in pages (Events)
├── events/         # Event listing & detail (Events)
├── organizations/  # Organization profiles (Social)
├── feed/           # Community feed (Social)
├── members/        # Member profiles (Shared)
├── profile/        # User settings (Shared)
└── ...
```

---

## Key Design Decisions

### 1. **No Schema Separation**
- PublicMember and Organization tables are shared
- Both systems read/write to same tables
- No duplication, single source of truth

### 2. **Application-Level Separation**
- Code is modularized despite shared data
- Different permission checks per system
- Different rate limiting strategies

### 3. **Distinct Comment Systems**
- Event comments: Event-specific, free, not in social feed
- Community comments: Posted system, subscription-aware

### 4. **Subscription Tiers**
- **FREE:** Can participate in events + basic social
- **GROWTH:** Organization management + posting features
- **ENTERPRISE:** Advanced features (future)

---

## Code Organization

### Permissions Check Pattern

**Events System (in main.py):**
```python
async def _get_event_for_admin(event_id: int, me: CurrentUser, db):
    # Checks: Is user admin of this event?
    # Returns: Event if allowed, 403 if not
```

**Social System (in social_api.py):**
```python
async def _ensure_enabled_org(db, org_public_id):
    # Checks: Does org user have growth/enterprise subscription?
    # Returns: Organization if allowed, 403 if not

async def _load_community_enabled_user_ids(db, user_ids):
    # Returns: Set of user IDs with community posting access
    # (superadmin + growth/enterprise only)
```

### Entity Relationship Example

```
User (Admin)
  ↓ has one
Organization
  ↓ has many
CommunityPost (org feed)
  ├─ Authored by: User (via author_user_id)
  └─ Comments by: PublicMembers (via community_post_comments)

PublicMember (Event Attendee)
  ├─ Can register for → Attendee → Event
  ├─ Can comment on → Event (via event_comments)
  └─ Can like/comment → CommunityPost (via community_post_likes/comments)
```

---

## Future Enhancements

1. **Event-specific Feeds:** Per-event social activity
2. **Member Subscriptions:** PublicMemberSubscription tier tracking
3. **Rate Limiting:** Track likes/comments per user per day
4. **Analytics:** Post engagement metrics for GROWTH/ENTERPRISE
5. **Moderation Queue:** Spam/report management
6. **Organization Pages:** Consolidated member profiles + event history
7. **Direct Messaging:** Member-to-member communication

---

## Testing Strategy

**Social System Tests (`test_social_api.py`):**
```python
# Permission tests
- test_free_tier_can_view_feed()
- test_free_tier_can_post_global()
- test_free_tier_cannot_post_org()
- test_growth_plan_can_manage_org_feed()

# Rate limit tests
- test_comment_rate_limit_8_per_min()
- test_like_tracking()

# Integration tests
- test_shared_public_member_in_events_and_social()
- test_organization_feed_isolation()
```

**Events System Tests (in `test_api.py`):**
```python
# Attendance matrix (NEWLY FIXED)
- test_get_attendance_matrix_xlsx()
- test_get_attendance_matrix_csv()
- test_get_attendance_matrix_with_registration_fields()

# Event comments
- test_free_tier_can_comment_on_event()
- test_event_comments_separate_from_social()
```

---

## Migration Path

### Phase 1 ✅ DONE
- Fix attendance matrix endpoint (2 bugs fixed)
- Add free tier support to social system
- Document shared entities
- Describe separation strategy

### Phase 2 (Future)
- Create social-only tests
- Implement rate limiting DB tables
- Create architecture documentation ✅
- Frontend route reorganization (optional)

### Phase 3 (Future)
- Member subscription tiers (PublicMemberSubscription usage)
- Advanced analytics for GROWTH/ENTERPRISE
- Moderation dashboard
- Event-specific social feeds

---

## Related Files

- [heptacert/backend/src/main.py](../heptacert/backend/src/main.py) - Events system, shared entities
- [heptacert/backend/src/social_api.py](../heptacert/backend/src/social_api.py) - Social system
- [heptacert/backend/src/community_api.py](../heptacert/backend/src/community_api.py) - Public listing
- [heptacert/backend/tests/test_api.py](../heptacert/backend/tests/test_api.py) - Event tests
- Database schema: [heptacert/backend/alembic/versions/](../heptacert/backend/alembic/versions/)

---

## Summary

The Heptapus-Certs architecture successfully separates **Events** and **Social** systems conceptually while pragmatically sharing core user and organization entities. This hybrid approach:

✅ Avoids data duplication  
✅ Maintains clear module boundaries  
✅ Allows independent permission models  
✅ Supports future scaling (separate databases possible)  
✅ Keeps code maintainable and testable  

The key is that while data is shared, **logic and permissions are NOT shared** - each system enforces its own rules at the application layer.
