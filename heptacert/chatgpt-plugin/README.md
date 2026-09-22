# HeptaCert ChatGPT plugin package

The portable manifest for submitting HeptaCert to the OpenAI Plugins Directory.
The plugin is the hosted MCP server at `https://heptacert.com/mcp` plus the six
inline UI components it serves; there is no separate runtime in this folder.

| File | Purpose |
| --- | --- |
| `plugin.json` | Listing metadata, legal links and starter prompts |
| `mcp.json` | Points the plugin at the hosted streamable-HTTP MCP endpoint |
| `assets/logo.png` | Copy of `frontend/public/logo.png`, referenced as icon and logo |

Related code: `backend/src/mcp_server.py` (tools, schemas, component wiring),
`backend/src/mcp_widgets/` (the components), `backend/src/oauth_api.py` and
`oauth_metadata_api.py` (OAuth + discovery + domain verification).

## Publisher: individual verification

HeptaCert is not yet a registered legal entity, so business verification is not
available. The decision (2026-09-22) is to publish under **individual
verification**: the app is still listed as "HeptaCert" (`displayName`), while
the publisher line carries the person's own name.

`developerName` and `author.name` are therefore set to `Samet Unsal`.

## Confirm before submitting

These values are taken from what the repository already publishes. A human
should confirm each one against the account actually submitting, because
reviewers check that they match the verified publisher identity:

- **`developerName` / `author.name` spelling.** These must match the
  government ID used for verification, character for character. The value here
  came from the repository's git config, which may have dropped Turkish
  diacritics — check whether it should be `Ünsal`.
- `author.email` — `destek@heptacert.com`, the address on the public developers
  page. Confirm it is monitored for plugin support.
- `privacyPolicyURL` / `termsOfServiceURL` — the live `/gizlilik` and
  `/kullanim-kosullari` pages. Two separate problems:
  1. **They name no data controller.** Neither page identifies a legal person,
     trade name, tax number or MERSIS — only the "HeptaCert" brand. Reviewers
     check that the privacy and terms match the verified publisher, and KVKK
     expects an identifiable *veri sorumlusu*. Publishing as an individual means
     these pages have to name that individual.
  2. **They were written for the web product, not for a ChatGPT plugin,** and
     have not been reviewed for whether they cover data shared with OpenAI. No
     legal counsel has approved them for this purpose.
- `category` — `Productivity` is a guess; pick from the portal's list.
- `version` — bump on every resubmission.
- `assets/logo.png` is 738 KB. Check the portal's size and aspect requirements
  and re-export if it rejects the file.

## Environment the deployment needs

| Variable | Why |
| --- | --- |
| `HEPTACERT_WIDGET_ORIGIN` | Origin declared to OpenAI for the UI components (`ui.domain`). Defaults to the public origin. |
| `OPENAI_APPS_CHALLENGE_TOKEN` | Per-plugin domain-verification token from the submission portal. Until it is set, `/.well-known/openai-apps-challenge` returns 404. |

Full status, open questions and the acceptance matrix live in
`docs/work-packages/WP37-openai-chatgpt-mcp-audit.md`.
