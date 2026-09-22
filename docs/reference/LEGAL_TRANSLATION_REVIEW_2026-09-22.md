# Legal-page translation: source review and release gate

Status: source audit, 2026-09-22. No served legal copy was changed. The product owner confirmed no legal reviewer is currently available and requested **unpublished drafts only**. The first held draft is [`/iade` in seven additional languages](../drafts/legal/iade-nine-language-draft.md). This checklist and draft are not legal advice or approval.

## Current UI state

All six unprefixed public routes — `/kullanim-kosullari`, `/gizlilik`, `/kvkk`, `/mesafeli-satis`, `/iade`, `/acik-riza` — select Turkish when `lang === "tr"` and English otherwise. The seven other advertised languages therefore show English legal text. Each route also contains fixed light-only colors. The routes must remain unprefixed because legal/contract links are shared by transactional flows; when migrated, each touched page must become catalog-first and semantic-token-only in the same change.

## Source claims requiring owner/legal confirmation before translation

| Source | Current claim to check | Review question |
|---|---|---|
| `/iade` and `/mesafeli-satis` | Unused HeptaCoin: full refund within 14 days; partially used packages: no refund; subscriptions: no partial refund; immediate digital services may have limited withdrawal rights; refund request review within 3 business days. | Does this match the actual checkout, fulfillment, consumer classification and current law? A blanket no-refund sentence must be approved rather than translated mechanically. Review against the [Turkish Ministry of Trade's current distance-contract guidance](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme). |
| `/kvkk`, `/gizlilik`, `/acik-riza`, `/mesafeli-satis` | Hetzner Online GmbH DPA is signed; relevant servers are in Helsinki, Finland; international transfer and technical-access descriptions. | Confirm signed agreement, actual production/subprocessor locations and the transfer mechanism with the data controller. Do not infer these from local Docker or marketing copy. |
| `/kvkk` | Category retention periods (including event/attendee records for 3 years, security logs for 1 year and deletion within 30 days) and role assignments between Heptapus Group and organizers. | Reconcile with live retention settings, backups, invoices and organizer contracts before publication in seven more languages. |
| `/kvkk` English section 9 | Adds “GDPR Art. 20 / KVKK Art. 11” beside data portability; the Turkish sentence describes JSON export without these same citations. | Legal reviewer should decide whether the citation and right characterization are correct; do not silently propagate the discrepancy. |
| `/acik-riza` and `/kvkk` | Separate disclosure and explicit-consent texts refer to international transfer. | Confirm the actual consent collection flow, wording, withdrawal handling and legal basis. The [Turkish Personal Data Protection Authority](https://www.kvkk.gov.tr/Icerik/6769/PUBLIC-ANNOUNCEMENT-ON-FULFILMENT-OF-OBLIGATION-TO-INFORM) says the duty to inform applies independently of explicit consent. |
| All six | Entity name, contact address, effective dates and cross-links. | Confirm legal entity and document versions; preserve effective-date meaning in each language. |

The [Authority's English translation of Law No. 6698](https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law) expressly says the Turkish original controls if meanings differ. Use its terminology as a reference, not as a substitute for legal review of HeptaCert's own documents.

## Safe implementation sequence after source approval

1. Freeze the approved Turkish source and review/align the existing English source, including effective dates and the claims above. Record who approved which version; keep unresolved claims out of a release. Until a reviewer exists, draft translations may be stored under `docs/drafts/legal/` but must not be imported into the app.
2. Split each page into catalog keys for title, metadata, section title/body, contact and cross-links. Translate the approved meaning into `tr`, `en`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `ru` with identical key and placeholder sets. Do not use inline `lang === "tr"` branches or pretend a fallback is a translation.
3. Migrate each touched page fully to semantic theme tokens. Keep the six routes unprefixed and link targets unchanged; add nine-locale render tests, parity checks, `check:ui`, TypeScript, build and both-theme review.
4. Have the designated legal reviewer compare each published language to the approved source. Mark catalog completeness and legal approval as **separate** gates; only then treat the legal wave as complete. An unreviewed translation must not be silently presented as an approved contract.

The product owner is handling the earlier tenant-isolation fix's production deployment separately; its authenticated foreign-event-ID smoke remains pending.
