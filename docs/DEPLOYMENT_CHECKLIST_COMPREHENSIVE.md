# 🚀 Pre-Deployment Checklist

Last Updated: April 9, 2026

## Phase 1: Test & Build Verification

### Backend Tests
- [ ] All pytest tests pass: `pytest tests/ -v --cov=src`
  - [ ] Health endpoint test: `TestHealthEndpoint`
  - [ ] Auth endpoints: `TestAuthEndpoints` (9 tests)
  - [ ] Auth required checks: `TestAuthRequired` (9 tests)
  - [ ] File serving security: `TestFileServingSecurity` (3 tests)
  - [ ] Public endpoints: `TestPublicEndpoints` (2 tests)
  - [ ] Social & event controls: `TestPublicSocialAndEventControls` (11 tests)
  - [ ] CORS headers: `TestCORS` (1 test)
  - [ ] Rate limiting: `TestRateLimitingExists` (4 tests)
  - [ ] Superadmin subscriptions: `TestSuperadminSubscriptions` (5 tests)
  - [ ] Email config: `TestEmailConfigEndpoints` (5 tests)
  - [ ] Router registration: `TestRouterRegistration` (1 test)
  - [ ] Account deletion: `TestAccountDeletionFlows` (4 tests)
  - [ ] Community social flows: `TestCommunitySocialFlows` (2 tests)
- [ ] Code coverage >= 35% (current: 35%)
  - [ ] Critical paths covered: main.py, social_api.py, community_api.py
  - [ ] No untested critical functions
- [ ] No syntax errors in src/ (flake8 pass)
- [ ] No import errors (all dependencies installed)

### Frontend Build
- [ ] TypeScript compilation succeeds: `tsc --noEmit`
  - [ ] No type errors in src/app, src/components, src/lib
  - [ ] No missing type definitions
  - [ ] All i18n keys properly typed
- [ ] Next.js build succeeds: `npm run build`
  - [ ] No build warnings (non-critical)
  - [ ] Bundle size acceptable (<5MB main bundle)
  - [ ] All env vars configured (NEXT_PUBLIC_API_URL, etc.)
- [ ] Dependencies audit: `npm audit`
  - [ ] No critical vulnerabilities
  - [ ] No high vulnerabilities without remediation plan

### Security Checks
- [ ] Trivy vulnerability scan completes (container fs scan)
  - [ ] No critical CVEs
  - [ ] No high CVEs without mitigation
- [ ] No hardcoded secrets in code
  - [ ] No database credentials in source
  - [ ] No API keys in repositories
  - [ ] All secrets in environment variables
- [ ] CORS configuration reviewed
  - [ ] CORS_ORIGINS set correctly for environment
  - [ ] No overly permissive origins in production

---

## Phase 2: Code Review & Architecture

### Previous Changes (Faze 1 & 2)
- [x] Attendance matrix bug fixes
  - [x] `fmt` query parameter added (line 12286)
  - [x] `registration_fields` variable added (line 12327)
  - [x] 5 comprehensive tests added
  - [x] Test passed in CI
- [x] Social/Events separation implemented
  - [x] Free tier support in social system
  - [x] Permission hierarchy documented
  - [x] EventComment separated from CommunityPostComment
  - [x] ARCHITECTURE_SEPARATION.md created
  - [x] 12 permission tier tests added
  - [x] Test passed in CI
- [x] Member org feed posting fixed
  - [x] Members cannot post to org feeds (403) ✅
  - [x] Only org admins can post via `/api/admin/community/posts`
  - [x] Test assertion corrected

### Current Scope (Faze 3-4)
- [ ] Turkish Localization (Faze 1)
  - [ ] All hardcoded Turkish strings extracted from 11 files
  - [ ] src/locales/tr.ts updated with 200+ new keys
  - [ ] src/locales/en.ts updated with English equivalents
  - [ ] All hardcoded strings replaced with `useT()` hook
  - [ ] Turkish diacritics (ö, ş, ü, ğ, ı, ç) render correctly
  - [ ] Profile page encoding issues fixed ("özellikler" → "özellikler")
  - [ ] Pricing page encoding issues fixed ("Geliştirilmiş" → "Geliştirilmiş")
  - [ ] Language toggle works (TR/EN)
  - [ ] Test: Language switching functionality

- [ ] Feed Components - Reddit Style (Faze 3)
  - [ ] 5 new components created:
    - [ ] PostCard.tsx (avatar, post, vote buttons, comment count)
    - [ ] CommentTree.tsx (recursive nested comment renderer)
    - [ ] CommentCard.tsx (individual comment with voting)
    - [ ] ReplyForm.tsx (inline reply form)
    - [ ] CreatePostForm.tsx (updated)
  - [ ] Backend support verified:
    - [ ] CommunityPostComment has parent_comment_id field (or migration created)
    - [ ] Comment endpoints support nesting: createCommunityPostComment(parent_comment_id)
    - [ ] Comment voting API working: upvote/downvote/undo
    - [ ] Post voting API working: like/unlike
  - [ ] Feed pages refactored:
    - [ ] src/app/feed/page.tsx (Reddit-style personal feed)
    - [ ] src/app/organizations/[id]/page.tsx (org feed with same style)
  - [ ] Styling complete:
    - [ ] Vote buttons functional (↑↓ upvote/downvote)
    - [ ] Comment nesting indentation (border-l-2, connecting lines optional)
    - [ ] Hover effects on post cards
    - [ ] Empty state messages
    - [ ] Desktop-first responsive design verified
  - [ ] Tests:
    - [ ] Post rendering test
    - [ ] Nested comments depth test (max 2-3 levels)
    - [ ] Vote button functionality test
    - [ ] Reply form show/hide test
    - [ ] Performance: 100+ comments loading test

- [ ] Admin Dashboard - Org Sosyal Profil (Faze 4)
  - [ ] Admin dashboard tab added
    - [ ] "Sosyal Profil" tab visible in navigation
    - [ ] Tab link routes to new social profile page
  - [ ] New social profile page created: src/app/admin/organization-social-profile/page.tsx
  - [ ] Form components created:
    - [ ] OrgSocialProfileForm.tsx (bio, banner, links)
    - [ ] Image upload with preview
    - [ ] URL validation (website, GitHub, Instagram)
    - [ ] Email validation
  - [ ] API integration:
    - [ ] updateOrgSocialProfile() function in src/lib/api.ts
    - [ ] Backend endpoint: PATCH /api/admin/organization-social-profile
    - [ ] Form submission handling
    - [ ] Error handling & toast notifications
    - [ ] Success confirmation message
  - [ ] Tests:
    - [ ] Form loads existing data
    - [ ] Form submission updates database
    - [ ] Image upload works
    - [ ] Social links validated
    - [ ] Member data properly stored

---

## Phase 3: Integration Testing

### API Endpoints
- [ ] All public endpoints responding correctly
  - [ ] GET /api/health (200 OK)
  - [ ] GET /api/public/feed (200 OK)
  - [ ] POST /api/public/feed (201 Created with auth)
  - [ ] GET /api/public/organizations (200 OK)
  - [ ] GET /api/public/organizations/{org_id} (200 OK)
  - [ ] POST /api/public/organizations/{org_id}/feed (403 for members, OK)
  - [ ] POST /api/admin/community/posts (201 for admins, 403 for others)
  - [ ] Comment endpoints working (CRUD)
  - [ ] Vote endpoints working (like/unlike, upvote/downvote)
- [ ] Admin endpoints require authentication
  - [ ] Missing auth returns 401
  - [ ] Invalid token returns 401
  - [ ] Expired token returns 401
- [ ] Permission checks working
  - [ ] Free tier restrictions enforced
  - [ ] Growth tier features available
  - [ ] Enterprise tier features available
  - [ ] Superadmin has all access

### Database
- [ ] All migrations applied successfully
  - [ ] Tables created: organizations, users, subscriptions, community_posts, community_post_comments, etc.
  - [ ] Indexes created for performance
  - [ ] Constraints properly enforced
- [ ] No orphaned records
  - [ ] No community posts without org
  - [ ] No comments without posts
  - [ ] No subscriptions without users
- [ ] Backup procedures tested
  - [ ] Pre-deployment backup created
  - [ ] Backup restore tested on staging

### Frontend
- [ ] UI renders without errors
  - [ ] Feed page loads
  - [ ] Organization pages load
  - [ ] Event pages load
  - [ ] Admin dashboard loads
  - [ ] New social profile page loads
- [ ] i18n working
  - [ ] Language toggle switches TR/EN
  - [ ] Turkish characters display correctly
  - [ ] No "undefined" strings showing
- [ ] Forms work
  - [ ] Post creation form submits
  - [ ] Comment form submits
  - [ ] Org social profile form updates
  - [ ] Validation messages show
- [ ] Mobile responsive
  - [ ] Feed layout on mobile (<=768px)
  - [ ] Comments readable on mobile
  - [ ] Forms usable on mobile (touch-friendly buttons)
  - [ ] No horizontal scrolling

---

## Phase 4: Performance & Load Testing

- [ ] Page load times < 3s (First Contentful Paint)
  - [ ] Feed page
  - [ ] Organization pages
  - [ ] Admin dashboard
- [ ] API response times:
  - [ ] GET endpoints < 200ms
  - [ ] POST endpoints < 300ms
  - [ ] List endpoints with 50 items < 500ms
- [ ] Database query optimization
  - [ ] N+1 query issues resolved
  - [ ] Indexes on frequently queried columns
  - [ ] No full table scans in critical paths
- [ ] Memory usage acceptable
  - [ ] No memory leaks detected
  - [ ] Container memory limits not exceeded
- [ ] Concurrent connections
  - [ ] 100 simultaneous connections handled
  - [ ] Rate limiting working (5/min for posts, 8/min for comments)
  - [ ] No dropped connections

---

## Phase 5: Environment-Specific Checks

### Staging Environment
- [ ] All services deployed successfully
  - [ ] Backend container running
  - [ ] Frontend container running
  - [ ] Database initialized
  - [ ] Redis/cache initialized (if applicable)
- [ ] Monitoring & logging
  - [ ] Logs visible in centralized logging system
  - [ ] No error spikes in logs
  - [ ] Health checks passing
- [ ] Smoke tests pass
  - [ ] Can register account
  - [ ] Can login
  - [ ] Can create event
  - [ ] Can create org
  - [ ] Can post to feed
  - [ ] Can vote/comment

### Production Environment
- [ ] DNS configured and resolving
- [ ] SSL/TLS certificates valid
  - [ ] Certificate not expired
  - [ ] Certificate covers domain(s)
  - [ ] No SSL warnings
- [ ] Database replication (if applicable)
  - [ ] Replica in sync
  - [ ] Backup retention policy met
- [ ] CDN configuration (if applicable)
  - [ ] Cache invalidation working
  - [ ] Static assets serving from CDN
- [ ] Email delivery working (if applicable)
  - [ ] SMTP credentials correct
  - [ ] Test email delivers
  - [ ] No delivery failures

---

## Phase 6: Security Validation

- [ ] HTTPS enforced
  - [ ] HTTP redirects to HTTPS
  - [ ] HSTS header set
- [ ] Security headers present
  - [ ] Content-Security-Policy
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
- [ ] Auth tokens secure
  - [ ] JWT tokens using HS256 or stronger
  - [ ] Tokens have expiration
  - [ ] Refresh tokens separate from access tokens
- [ ] CORS properly configured
  - [ ] Only necessary origins allowed
  - [ ] Credentials properly handled
- [ ] Input validation
  - [ ] SQL injection protection
  - [ ] XSS protection
  - [ ] CSRF protection (if applicable)
- [ ] Sensitive data
  - [ ] Passwords hashed (bcrypt or better)
  - [ ] Sensitive fields not logged
  - [ ] No sensitive data in error messages

---

## Phase 7: Post-Deployment

- [ ] Monitor error rates for 24 hours
  - [ ] Target: < 0.1% error rate
  - [ ] No spike in 5xx errors
  - [ ] P99 latency stable
- [ ] Monitor user engagement
  - [ ] Feed loading
  - [ ] Comments and voting
  - [ ] New org profile features used
- [ ] Monitor resource usage
  - [ ] CPU usage normal
  - [ ] Memory usage stable
  - [ ] Disk space usage acceptable
- [ ] Verify backup strategy
  - [ ] Daily backups running
  - [ ] Backup integrity verified
  - [ ] Restore procedure documented

---

## Rollback Plan

If critical issues appear in production:

1. **Immediate Actions:**
   - [ ] Stop deployment
   - [ ] Notify team on Slack
   - [ ] Collect error logs and metrics
   - [ ] Announce status page update (if public)

2. **Rollback Procedure:**
   - [ ] Revert to previous Docker image version
   - [ ] Run database migrations rollback (if needed)
   - [ ] Verify health checks pass
   - [ ] Run smoke tests again
   - [ ] Monitor for 30 minutes

3. **Post-Incident:**
   - [ ] Root cause analysis
   - [ ] Fix issue in develop branch
   - [ ] Add regression test
   - [ ] Schedule redeploy after fix

---

## Sign-Off

| Role | Name | Date | Approval |
|------|------|------|----------|
| Backend Lead | | | ☐ |
| Frontend Lead | | | ☐ |
| DevOps | | | ☐ |
| QA Lead | | | ☐ |
| Product Manager | | | ☐ |

---

## Notes

- Keep this checklist updated as deployment procedures change
- Add new items after incidents or learnings
- Review checklist quarterly for applicability
- Link related incident reports or postmortems in comments
