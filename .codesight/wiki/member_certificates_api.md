# Member_certificates_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Member_certificates_api subsystem handles **6 routes** and touches: auth, db, cache.

## Routes

- `POST` `/api/public/members/me/wallet-analytics` → out: WalletAnalyticsOut [auth, db, cache]
  `heptacert\backend\src\member_certificates_api.py`
- `GET` `/api/public/members/me/wallet-analytics` → in: CurrentPublicMembe, out: WalletAnalyticsOut [auth, db, cache]
  `heptacert\backend\src\member_certificates_api.py`
- `GET` `/api/public/members/me/certificate-privacy/audit` → in: CurrentPublicMembe, out: WalletAnalyticsOut [auth, db, cache]
  `heptacert\backend\src\member_certificates_api.py`
- `POST` `/api/public/certificates/{certificate_uuid}/share-cache` params(certificate_uuid) → out: WalletAnalyticsOut [auth, db, cache]
  `heptacert\backend\src\member_certificates_api.py`
- `GET` `/api/public/members/me/certificate-privacy` → in: CurrentPublicMembe, out: WalletAnalyticsOut [auth, db, cache]
  `heptacert\backend\src\member_certificates_api.py`
- `PATCH` `/api/public/members/me/certificate-privacy` → in: CertificatePrivacyIn, out: WalletAnalyticsOut [auth, db, cache]
  `heptacert\backend\src\member_certificates_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\member_certificates_api.py`

---
_Back to [overview.md](./overview.md)_