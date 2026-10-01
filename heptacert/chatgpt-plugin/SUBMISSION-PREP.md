# HeptaCert 0.9.8 — submission preparation

Status: **draft package prepared, not submitted for review**.

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
| Demo recording | No recording URL supplied; no video has been produced or verified. |
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
`sharp` dependency). The script prints a temporary archive path and its verified
inventory. It does not upload, create a second plugin, submit policy attestations
or publish a release. Complete the missing facts/materials before calling it ready.

Sources:
[OpenAI submission reference](https://developers.openai.com/plugins/deploy/submission)
and [tool reference](https://developers.openai.com/plugins/reference).
