# HeptaCert Pitch Deck

## Slide 1 - Title

**HeptaCert**

The trust layer for events, credentials, and professional communities.

HeptaCert helps organizations run events, issue verifiable certificates, automate post-event engagement, and build trusted member communities from one integrated platform.

---

## Slide 2 - The Problem

Events and credential programs are still fragmented.

- Organizers manage registrations, check-ins, certificates, emails, CRM follow-up, and reporting across disconnected tools.
- Certificates are often easy to copy, difficult to verify, and hard to track after distribution.
- Professional communities lose engagement after the event ends because attendee data, learning history, and certificate ownership are not connected.
- Enterprise teams need auditability, access control, localization, white-labeling, and compliance workflows that generic event tools do not handle deeply.

---

## Slide 3 - The Opportunity

The market is moving from one-off events to lifelong credential relationships.

Organizations increasingly need to:

- Prove participation and learning outcomes.
- Re-engage attendees after the event.
- Track training renewal and compliance.
- Build communities around verified professional identity.
- Integrate event data with CRM, analytics, and automation workflows.

HeptaCert is positioned to become the operating system for this post-event credential economy.

---

## Slide 4 - The Solution

HeptaCert combines event operations, secure credentialing, community, and automation in one platform.

Core capabilities:

- Event creation, registration, attendance, sessions, tickets, and check-in.
- Single and bulk certificate generation.
- QR, UUID, and image-based certificate verification.
- Digital certificate wallet for members.
- Email templates, bulk campaigns, and automation rules.
- Audience segmentation, event CRM, analytics, and exports.
- Training assignment, renewal tracking, and compliance reporting.
- White-label domains, API keys, webhooks, and organization access control.

---

## Slide 5 - Why Now

Credential trust is becoming infrastructure.

- Remote and hybrid learning created more digital certificates, but verification quality has not kept up.
- Event teams need measurable ROI after the event, not just registration counts.
- Organizations want owned communities and first-party participant data.
- Compliance-heavy industries need verifiable training records and renewal visibility.
- AI-generated and easily copied documents make authenticity harder to prove.

HeptaCert answers this shift with a platform built around verification, traceability, and operational continuity.

---

## Slide 6 - Product Workflow

From event to verified credential to ongoing relationship:

1. Organization creates an event, registration flow, sessions, and ticket rules.
2. Participants register, verify email, attend, and check in through staff or kiosk workflows.
3. HeptaCert issues certificates in bulk or individually.
4. Certificates can be verified through QR/UUID links or by uploading the certificate image.
5. Members store certificates in a public or private wallet and share them to LinkedIn or CV exports.
6. Admins segment attendees, trigger follow-up campaigns, update CRM status, and track renewals.

---

## Slide 7 - Trust and Security Layer

HeptaCert does not rely on a single verification method.

The platform uses a layered certificate trust model:

- Unique UUIDv4 identity per certificate.
- Event-scoped public certificate IDs for traceability.
- QR and verification URL embedded into certificate outputs.
- PDF digital signing with RSA-2048 and SHA-256.
- Invisible PNG watermarking using LSB steganography, repetition coding, and majority voting.
- Certificate lifecycle states: active, revoked, expired.
- API protections including authentication, role-based access, plan gates, rate limiting, validation, and safe file handling.

This makes certificate fraud harder while keeping verification simple for third parties.

---

## Slide 8 - Platform Depth

HeptaCert is already structured as a full product platform, not a single-purpose certificate tool.

Current codebase scale:

- 690 API routes.
- 155 database models.
- 238 frontend components.
- FastAPI backend, Next.js frontend, SQLAlchemy, PostgreSQL, Redis, Docker workflows.
- Middleware for authentication, rate limiting, and custom operational controls.

Major product modules include:

- Events and attendance.
- Certificates and verification.
- Email, automation, and bulk messaging.
- Segmentation and CRM.
- LMS, learning paths, quizzes, training, and renewal.
- Community feed, social graph, comments, likes, and discovery ranking.
- Billing, subscriptions, payments, admin, superadmin, and white-label operations.

---

## Slide 9 - Differentiation

HeptaCert stands apart by connecting credential trust with event operations and community growth.

| Generic Event Tools | Generic Certificate Tools | HeptaCert |
|---|---|---|
| Focus on registration and attendance | Focus on PDF generation | Full event-to-credential lifecycle |
| Limited certificate verification | Often QR-only verification | UUID, QR, signed PDF, invisible watermark |
| Weak post-event workflows | No CRM or community layer | Segmentation, CRM, automation, wallet |
| Minimal compliance support | Limited renewal tracking | Training assignments, renewals, compliance exports |
| Brand-limited | Rarely enterprise-ready | White-label domains, plan gates, API, webhooks |

---

## Slide 10 - Business Model

HeptaCert is built for SaaS packaging with expansion revenue.

Suggested packaging:

- Free / Starter: basic event and certificate workflows.
- Growth: automation, segmentation, advanced analytics, bulk email, certificate templates.
- Enterprise: white-label domains, hidden HeptaCert branding, organization access control, API keys, webhooks, CRM, training compliance, and advanced exports.

Potential add-ons:

- Venue reservations.
- Training compliance reporting.
- High-volume credential archive.
- Premium verification and brand trust pages.
- Managed onboarding for institutions and associations.

---

## Slide 11 - Target Customers

Primary customer segments:

- Professional associations.
- Training companies and academies.
- Universities and continuing education teams.
- Conference and event organizers.
- Corporate HR and compliance departments.
- Certification bodies and accreditation-driven organizations.

Best-fit buyers:

- Teams running recurring events or training programs.
- Organizations that need credible, shareable, verifiable certificates.
- Teams that want participant data to become CRM, renewal, and community intelligence.

---

## Slide 12 - Go-To-Market

Initial wedge: secure certificate issuance for events and training programs.

Expansion path:

1. Start with event registration, attendance, and certificate generation.
2. Add verification, branded certificate wallet, and LinkedIn/CV sharing.
3. Expand into post-event automation, segmentation, and CRM.
4. Move enterprise accounts into white-label domains, API/webhooks, and compliance reporting.
5. Build network effects through public member profiles, certificate wallets, and community discovery.

Suggested channels:

- Direct sales to associations, training providers, and corporate learning teams.
- Partnerships with event agencies and certification bodies.
- Product-led acquisition through public verification pages and share cards.
- Content marketing around certificate fraud prevention and compliance readiness.

---

## Slide 13 - Traction and Proof Points

Current product proof:

- Full-stack platform implementation with backend, frontend, docs, tests, and deployment workflows.
- Broad feature coverage across events, credentials, payments, email, CRM, LMS, community, and admin.
- Roadmap phases completed across credential wallet, certificate templates, automation, segmentation, CRM, training, compliance, kiosk operations, and platform QA.
- Local and containerized development support with PostgreSQL, Redis, ClamAV, Docker, and migration workflows.

Metrics to insert before investor use:

- Number of organizations onboarded.
- Certificates issued.
- Verification checks completed.
- Events managed.
- Monthly active admins or members.
- Revenue, pilot pipeline, or signed LOIs.

---

## Slide 14 - Roadmap

Near-term priorities:

- Continue UI polish and product localization.
- Strengthen onboarding flows for event organizers and training teams.
- Package demo data and vertical-specific templates.
- Improve investor-facing analytics and dashboard reporting.
- Add production-grade observability for automation, email, workers, and exports.

Expansion priorities:

- Institution-grade credential archive.
- More integrations with CRM, LMS, calendar, and identity providers.
- Public trust pages for organizations and credential issuers.
- Advanced fraud detection around certificate verification and suspicious uploads.
- Marketplace for certificate templates, event workflows, and automation recipes.

---

## Slide 15 - The Ask

HeptaCert is looking for partners to accelerate go-to-market and production scaling.

Potential ask options:

- Pilot partnerships with associations, training companies, and compliance-heavy organizations.
- Strategic design partners for enterprise credential workflows.
- Investment to support product hardening, sales, onboarding, and infrastructure.

Use of funds or resources:

- Product and UX refinement.
- Security review and production compliance hardening.
- Sales pipeline development.
- Customer onboarding and support.
- Infrastructure, monitoring, and scalability improvements.

---

## Slide 16 - Closing

HeptaCert turns certificates from static PDFs into trusted, verifiable, and actionable professional records.

By combining secure credentialing, event operations, automation, CRM, and community into one platform, HeptaCert helps organizations move beyond running events and start building long-term credential relationships.

**HeptaCert: trusted credentials for every event, learner, and professional community.**
