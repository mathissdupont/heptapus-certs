# HeptaCert 0.9.9 — submission preparation

Status: **draft package prepared, not submitted for review**.

## Public web distribution draft 0.9.9 (2026-10-02)

- Why: the private owned plugin behaves like a local/desktop install on the web
  ("Open desktop app"), and Developer mode is not visible in the owner's Plus UI.
  End users only avoid Developer mode once the same remote-MCP package is published
  through the public plugin directory. The private v0.9.8 plugin is not deleted or
  modified by this draft.
- Added a dedicated product page at `/{locale}/chatgpt-plugin` in all nine languages
  (sitemap + hreflang), so the portal can check what the plugin is and who publishes it
  without relying on the home page. `websiteURL` now points to
  `https://heptacert.com/en/chatgpt-plugin`.
- **Deploy the frontend before uploading the ZIP.** On 2026-10-02 that URL returned
  **404** in production because the page was not yet deployed (`/en/discover` → 200).
- `publication.translations` adds subtitle (≤30 chars) and description for eight
  non-English locales; the packaging script asserts their count and lengths.
- The packaging script now also copies the verified archive to
  `dist/heptacert-plugin-<version>-draft.zip` (git-ignored) for upload.
- The first upload failed: "Plugin zip member contains an unsafe path: `…\skills\`".
  Windows PowerShell's `Compress-Archive` wrote `\` separators plus a directory entry.
  The script now writes file-only entries with `/` and asserts the raw ZIP names
  (no `\`, no directory entries, no `..`); .NET and Python readers hide `\`.
- The portal tool scan flagged `update_event`, `update_attendee`, `update_session`,
  `update_automation_rule` and `update_email_template`: marked `destructiveHint: false`
  although they overwrite stored values. They are now `destructiveHint: true` and the
  contract test pins them. Create, open/close registration and check-in stay
  non-destructive. Requires a backend deploy and a portal re-scan.
- Re-scan then flagged `update_session` as open-world. Its changes reach the public
  agenda and `.ics` calendar feeds, so it is now `openWorldHint: true`. Investigating it
  exposed a functional bug: `create_session`/`update_session` sent `title`, `start_time`,
  `location`, `speaker` while the REST schema requires `name` and uses
  `session_date`/`session_start`/`session_end`/`session_location`/`speaker_name`, so both
  tools were rejected (422). They now map fields, keep the current name on partial
  updates and set `is_active` (check-in open) through the toggle endpoint only when it
  differs. Tests validate the bodies against `SessionCreateIn`.
- Full write-tool audit (all 27 write tools vs. their real FastAPI body models) found and
  fixed more drift: `update_event`, `close_registration`, `open_registration` omitted the
  `name` the REST PATCH requires; `update_automation_rule` sent partial bodies to a
  full-replace endpoint, and both rule tools typed the string rule ID as `int`; automation
  actions documented `template_id`/`delay_hours`/`url`, which pydantic silently dropped
  (now `email_template_id`/`reminder_delay_hours`/`webhook_url`, aliases mapped, unknown
  fields rejected); `create_webhook` sent `events` while the API takes one `event_type`
  and offered event types the API rejects (now one subscription per type, limited to the
  dispatched `attendee.register`, `email.sent`, `email.failed`); `bulk_add_attendees`
  posted empty names (rows are now validated/split). LMS triggers are not offered.
  `tests/test_mcp_rest_contract.py` runs every write tool and validates each body against
  its route model; it also fails if a write tool is added without coverage. Verified the
  test fails on the pre-fix code (11 failures). Backend tests **656/656**.
- Portal note "This tool update needs further review" on the automation tools is a manual
  review of changed open-world tools (they send email and call external URLs), not a
  scanner defect; these fixes change the tools again and will also be reviewed.
- Backend finding left unchanged: the webhook API accepts `email.opened` and
  `email.bouonced` (typo), but neither is ever dispatched.
- If ChatGPT says the connection exposes no tools (e.g. no `list_events`), check that the
  backend deploy has finished before anything else. On 2026-10-03 this was the cause:
  the rebuild was still running. Then retry in a new chat.
- Release notes describe this release: web-distribution page, localized listing,
  54 hosted tools, confirmations, OAuth tenant boundaries and eight skills.
  The 54-tool count is from the source; authenticated discovery in ChatGPT is still
  unverified.

## Owned private plugin updated and read back (2026-10-01)

- Exact plugin: `plugin_c1567b8f1ed481919920f209efc45059`.
- Version **0.9.7 → 0.9.8**, saved release
  `pluginrel_6abeacd815ec81919d9d8a3420c82a8b`.
- Added portable `mcp.json` pointing at `https://heptacert.com/mcp`.
  The host generated the equivalent `.mcp.json` and compatibility-manifest mapping.
- Read-back verifies both versions, all eight skills and their support files unchanged,
  the original starter prompts preserved, and personal/private scope unchanged.
- This is a private account update, not a public submission, OAuth success or tool scan.
- The public-upload source now preserves the real package name, author and starter
  prompts and includes all eight skills. Do not reuse the old three-file 1.0.1 ZIP.
- Owner chose Samet Ünsal as the fallback publishing identity (Heptapus Group is not
  a registered company), Turkey plus all Europe, and no plugin purchase/payment flow.
  `commerce=false` is recorded. Identity verification still needs the portal.
  The owner subsequently added the United States. The draft allowlist has 49 ISO codes,
  covering the US and European countries including Turkey,
  Cyprus and transcontinental Armenia/Azerbaijan/Georgia/Kazakhstan. Russia/Belarus
  are excluded from this draft because they are absent from OpenAI's API access list;
  that list is not proof of ChatGPT plugin targeting eligibility. Confirm the exact
  accepted countries against the submission portal before publication.
- Public checks after owner-reported deployment: MCP **401** with protected-resource
  discovery challenge; both OAuth metadata endpoints **200**; domain challenge **404**.
  Authenticated initialization, 54-tool discovery and review cases remain unverified.

The source server now declares 54 tools, including 16 tools adapted from the
owner-supplied `mcp_server_expanded.py`. That root reference file is preserved;
the deployed entry point remains `backend/src/mcp_server.py`, next to its widgets.

## Completed in the repository

- Listing subtitle: 25 characters; the existing three Turkish starter prompts preserved.
- Website and support page were publicly readable on 2026-10-01; support points to
  `https://heptacert.com/iletisim`, which publishes contact channels.
- Five distinct positive and three unsupported-task negative cases are included
  in the single-server manifest. Release notes describe the implemented behavior.
- A 512×512 PNG is rendered from the existing brand SVG. The original 6250×6250
  logo is preserved in source and excluded from the public-upload copy.
- Packaging creates a separate directory with `plugin.json`, `mcp.json`, the referenced
  `assets/icon.png` and all eight skills/support files, then opens the ZIP and verifies
  its version, case counts and inventory. No credentials or app bindings are included.
- Scope classification matches all 16 new tools. POST email preview remains a
  read, delivery logs are bounded, and raw SMTP failure reasons are omitted.
- Survey webhook keys are masked in both JSON text and structured content.
  Bulk sending, template deletion, certificate-design replacement, survey
  replacement and email-job cancellation preview before an explicit confirmation.
- The REST layer rejects a delivery job from a different event and rejects email
  templates belonging to a different event; shared system defaults remain usable.

## Missing publication facts and host evidence

| Item | Current evidence / next action |
| --- | --- |
| ChatGPT feedback | Supplied: v0.9.7 skills modularization, 16 proposed tools and missing MCP configuration. Tools are integrated and the private v0.9.8 connection configuration is now saved. No public portal rejection was supplied. |
| Publisher identity | Owner authorized Samet Ünsal; verify that individual identity in the target portal. Heptapus Group is not assumed to be a verified business. |
| Countries | Owner requested Turkey + all Europe + US; 49-code draft allowlist recorded. Confirm portal eligibility before publication. |
| Commerce | Owner confirmed no plugin purchase/payment flow; `commerce=false` and explanation recorded. |
| Privacy and terms | Existing URLs are retained. The browser tool could not retrieve their content on 2026-10-01; plugin-specific data-practice coverage is unverified. Legal source and translation review remain on hold. |
| Category | Existing `Productivity` remains a draft choice; verify against the target portal. |
| Demo recording | Owner recorded the walkthrough in the ChatGPT desktop app with the review account and uploaded it unlisted: `https://youtu.be/FmSnfd4resA` (oEmbed 200 on 2026-10-03, so it is reachable by link). Added as `review.demo_recording_url`. Video content was not reviewed by the assistant. |
| Reviewer access | No dedicated test account or host connection evidence supplied. Keep credentials in secure portal fields only. |
| Review cases | All eight are **Not run in ChatGPT**. Local Python tests do not establish host acceptance. |
| Deployment / scan | Owner reported deployment; public MCP/OAuth discovery passes. Sign in to the updated development connection and verify the actual 54-tool list. Domain verification and saved-submission scan are not completed. |

## Recording walkthrough

Use the existing development connection and a dedicated sample organization.
The sample event is named **Plugin Review Workshop** and contains sample
attendees, a session, an email template, a survey and an issued certificate.
The manifest's positive descriptions document this setup; don't substitute
production attendee information.

Record the five positive prompts from `plugin.json` in order:

1. Find the sample event; show the returned date and registration state.
2. Show attendees and participation summary; leave attendance unchanged.
3. Prepare the sample bulk email; show the template preview and confirmation
   request. Stop before approving any send.
4. Show the existing survey's questions and requirement; no webhook key is exposed.
5. Find and verify the sample certificate; show its returned status and link.

Then try “Buy two event tickets for me and charge my credit card.” Show that the
assistant explains the unsupported operation without pretending to purchase.
Keep prompts and results readable and keep credentials off screen. Play the
recording back, host it at a reviewer-accessible URL and verify playback before
adding `review.demo_recording_url`. A script is not a recorded demo.

Run the eight manifest cases in the same authenticated host connection and
record their actual tools, arguments and observed results. Unsupported task
cases are distinct from permission errors; separately exercise missing scopes,
foreign event IDs and destructive confirmation boundaries.

## Build the draft ZIP

From the repository root on Windows:

```powershell
node scripts/package-chatgpt-plugin.mjs
```

Frontend dependencies must already be installed (the script uses its existing
`sharp` dependency). The script prints the verified inventory and the upload copy
at `dist/heptacert-plugin-<version>-draft.zip` (the temporary staging path is also
printed). It does not upload, create a second plugin, submit policy attestations
or publish a release. Complete the missing facts/materials before calling it ready.

Sources:
[OpenAI submission reference](https://developers.openai.com/plugins/deploy/submission)
and [tool reference](https://developers.openai.com/plugins/reference).
