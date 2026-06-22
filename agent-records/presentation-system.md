# Presentation System Agent Record

Last updated: 2026-06-22

## Current Scope

HeptaCert presentation work is event-based. Users can upload PDF, PPTX, or PPT files to an event and present them through HeptaCert. PowerPoint files are converted to PDF by the backend worker with LibreOffice, while PDF display should stay client-side whenever possible to avoid extra server load.

## Completed

- Event-based presentation upload flow for PDF, PPTX, and PPT.
- LibreOffice conversion worker for PowerPoint to stage-ready PDF.
- ClamAV scanning added to presentation uploads and other high-risk upload entry points.
- Presentation stage page separated from normal admin chrome.
- Light, clean stage and remote UI aligned with the existing HeptaCert admin style.
- Organization logo support on the stage screen, with HeptaCert fallback.
- Phone remote page for next, previous, reset, and speaker notes.
- Speaker notes persisted per user, deck, and slide.
- Backend presentation session state for syncing phone remote and stage.
- Stage page no longer remounts the browser PDF iframe on every slide change.
- First PDF.js viewer added for stage rendering, replacing browser PDF toolbar dependency with a controlled canvas viewer.
- Presentation file access no longer accepts query-string auth tokens. Stage rendering uses Authorization headers, so copied file URLs do not expose confidential decks.
- QR phone remote entry added on the stage screen. QR now opens a scoped presenter-control link instead of exposing an admin-only remote URL.
- Phone remote upgraded into a presenter view with current/next PDF previews, persistent local timer state, elapsed/remaining time, final two-minute warning, slide controls, and saved speaker notes.
- Laser pointer added through cache-backed presentation session state. Phone drag gestures update normalized pointer coordinates; stage polls and renders a red pointer overlay.
- Stage PDF viewer preloads nearby pages in memory during idle time. This improves next/previous slide responsiveness and short network-drop tolerance without persisting confidential files to browser storage.
- Stage PDF viewer also supports an explicit preload-all action for controlled in-browser caching before a talk starts. It stays memory-only to avoid leaving confidential PDFs in persistent browser storage.
- Audience mode added with event/deck-scoped public read-only tokens. Audience links can be enabled or disabled per deck and can expire.
- Security controls added per deck: audience access, download permission, watermark overlay, audience token regeneration, and presenter-control token regeneration.
- Public file serving now respects deck download policy. Inline viewing remains possible for the viewer, while attachment/download behavior is only enabled when the deck allows it.
- Token-based presenter page added for phone control without requiring the presenter to navigate through the admin UI.
- Backend regression tests added for presentation security controls, audience access gating, expired audience links, scoped presenter-control session updates, and audience download policy.

## License Notes

- `pdfjs-dist@4.10.38` reports `Apache-2.0` in package metadata. This is suitable for commercial use, with normal license notice obligations.
- `pdfjs-dist` optional `@napi-rs/canvas` dependency reports `MIT`. Browser stage rendering does not use this server/native canvas path.
- Existing lockfile LGPL entries are from optional Next/Sharp platform packages, not from the PDF.js stage viewer addition.
- QR generation reuses the existing backend `qrcode` dependency already present in the project; no new QR package was added for this step.

## Server Load Principles

- Do not render presentation pages on the server during live presentation.
- Use the existing uploaded/converted PDF as the source of truth.
- Let PDF.js load and render pages in the presenter browser.
- Avoid generating thumbnails or previews server-side unless explicitly needed.
- Keep live remote control state small and cache-backed.
- Add analytics asynchronously, not inside the slide-change request path.

## Test Notes

- New test file: `heptacert/backend/tests/test_presentation_security.py`.
- Tests are intended to run in GitHub Actions with the existing backend CI dependency install.
- Local pytest was not completed because the local Python environments were missing backend dependencies; avoid running full dependency installs on the developer workstation for this step.
- Codesight is configured in `.github/workflows/codesight.yml` and should regenerate `.codesight` as a CI artifact on push.

## Priority Roadmap

1. PDF.js custom viewer
   - Own the full presentation surface.
   - Remove browser/Adobe PDF toolbar issues.
   - Keep page changes smooth by rendering from one loaded PDF document.

2. QR phone pairing
   - Show a small "control with phone" QR on stage.
   - Use scoped presenter/control access so not everyone can control the deck.
   - Completed with per-deck presenter-control tokens and QR entry from the stage toolbar.

3. Presenter view
   - Current page, next page preview, notes, elapsed time, remaining time.
   - Add warning states such as final two minutes.
   - Completed as a client-side presenter view. Further polish can add larger landscape layout and presenter-specific shortcuts.

4. Audience mode
   - Event-based read-only public/share link.
   - Optional download control, expiry, and event-end lock.
   - Completed first pass with read-only audience viewer, enable/disable switch, optional expiry backend field, and no-control public session polling.

5. Offline tolerance
   - Preload/cache the PDF in the stage browser.
   - Keep phone control tolerant of short network drops.
   - Completed first pass: nearby page preloading plus manual preload-all. Avoid persistent Cache Storage for confidential files unless a future explicit secure offline mode is designed.

6. Security controls
   - Disable downloads where configured.
   - Add time-limited tokens.
   - Restrict control links to event staff or presenter tokens.
   - Optional watermark overlay.
   - Completed first pass with token regeneration, public audience enablement, download toggle, and stage/audience watermark overlay.

7. Analytics
   - Track opens, watch time, and slide dwell time.
   - Keep writes batched or async to avoid live presentation latency.

8. Versioning
   - Preserve v1, v2, v3 when a new file is uploaded.
   - Allow rollback and event-specific version locks.

9. Stronger notes
   - Global deck notes.
   - Private speaker notes.
   - Team notes.
   - Post-presentation action notes.
