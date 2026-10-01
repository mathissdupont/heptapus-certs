# HeptaCert ChatGPT plugin package

The portable manifest for submitting HeptaCert to the OpenAI Plugins Directory.
The plugin is the hosted MCP server at `https://heptacert.com/mcp` plus the six
inline UI components it serves; there is no separate runtime in this folder.

| File | Purpose |
| --- | --- |
| `plugin.json` | Listing metadata, legal links and starter prompts |
| `mcp.json` | Points the plugin at the hosted streamable-HTTP MCP endpoint |
| `skills/` | All eight workflows and support files preserved from the owned v0.9.8 plugin |
| `assets/icon.png` | 512px PNG generated from the existing brand SVG; referenced as icon and logo |
| `assets/logo.png` | Original oversized source logo; retained, but excluded from the upload ZIP |
| `SUBMISSION-PREP.md` | Current gaps, review-case status and the recording walkthrough |

Related code: `backend/src/mcp_server.py` (tools, schemas, component wiring),
`backend/src/mcp_widgets/` (the components), `backend/src/oauth_api.py` and
`oauth_metadata_api.py` (OAuth + discovery + domain verification).

## Confirm before submitting

These values are taken from what the repository already publishes. A human
should confirm each one against the account actually submitting, because
reviewers check that they match the verified publisher identity:

- `author.name` / `developerName` — Samet Ünsal, authorized by the owner as the
  publishing identity. Portal verification has not yet been established.
- `privacyPolicyURL` / `termsOfServiceURL` — the live `/gizlilik` and
  `/kullanim-kosullari` pages. **These are Turkish-language pages and were
  written for the web product, not for a ChatGPT plugin.** They have not been
  reviewed for whether they cover data shared with OpenAI. No legal counsel has
  approved them for this purpose.
- `category` — `Productivity` is a guess; pick from the portal's list.
- `version` — bump on every resubmission.
- `assets/icon.png` is square at 512px. The 6250px original logo is excluded
  from the draft upload copy.

Run `node scripts/package-chatgpt-plugin.mjs` from the repository root to rebuild
and inspect a separate draft ZIP. This is not a completed public submission:
verified publisher identity, countries, commerce declaration, recording,
reviewer access, host test results and legal coverage remain in
[`SUBMISSION-PREP.md`](SUBMISSION-PREP.md).

## Environment the deployment needs

| Variable | Why |
| --- | --- |
| `HEPTACERT_WIDGET_ORIGIN` | Origin declared to OpenAI for the UI components (`ui.domain`). Defaults to the public origin. |
| `OPENAI_APPS_CHALLENGE_TOKEN` | Per-plugin domain-verification token from the submission portal. Until it is set, `/.well-known/openai-apps-challenge` returns 404. |

Full status, open questions and the acceptance matrix live in
`docs/work-packages/WP37-openai-chatgpt-mcp-audit.md`.
