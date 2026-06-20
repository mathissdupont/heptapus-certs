# Dependency Graph

## Most Imported Files (change these carefully)

- `/main.py` — imported by **64** files
- `/organization_access_api.py` — imported by **14** files
- `//output.py` — imported by **11** files
- `//client.py` — imported by **10** files
- `/db_types.py` — imported by **7** files
- `/config.py` — imported by **7** files
- `/enums.py` — imported by **5** files
- `/generator.py` — imported by **4** files
- `/db.py` — imported by **4** files
- `/event_team.py` — imported by **3** files
- `/lms_models.py` — imported by **3** files
- `heptacert\frontend\src\lib\assistant\text.ts` — imported by **3** files
- `/email_rendering.py` — imported by **2** files
- `/crm_accounts_models.py` — imported by **2** files
- `/document_outputs.py` — imported by **2** files
- `/learning_path_models.py` — imported by **2** files
- `/quiz_models.py` — imported by **2** files
- `/moderation.py` — imported by **2** files
- `/event_features.py` — imported by **2** files
- `/services.py` — imported by **2** files

## Import Map (who imports what)

- `/main.py` ← `heptacert\backend\src\accreditation_api.py`, `heptacert\backend\src\accreditation_models.py`, `heptacert\backend\src\ai_content_api.py`, `heptacert\backend\src\ai_proactive_api.py`, `heptacert\backend\src\analytics_api.py` +59 more
- `/organization_access_api.py` ← `heptacert\backend\src\accreditation_api.py`, `heptacert\backend\src\checkin_ops_api.py`, `heptacert\backend\src\crm_accounts_api.py`, `heptacert\backend\src\crm_sequences_api.py`, `heptacert\backend\src\event_crm_api.py` +9 more
- `//output.py` ← `heptacert\cli\heptacert_cli\commands\attendees.py`, `heptacert\cli\heptacert_cli\commands\auth.py`, `heptacert\cli\heptacert_cli\commands\automations.py`, `heptacert\cli\heptacert_cli\commands\certs.py`, `heptacert\cli\heptacert_cli\commands\checkin.py` +6 more
- `//client.py` ← `heptacert\cli\heptacert_cli\commands\attendees.py`, `heptacert\cli\heptacert_cli\commands\auth.py`, `heptacert\cli\heptacert_cli\commands\automations.py`, `heptacert\cli\heptacert_cli\commands\certs.py`, `heptacert\cli\heptacert_cli\commands\checkin.py` +5 more
- `/db_types.py` ← `heptacert\backend\src\accreditation_models.py`, `heptacert\backend\src\crm_accounts_models.py`, `heptacert\backend\src\lead_forms_models.py`, `heptacert\backend\src\models.py`, `heptacert\backend\src\oauth_api.py` +2 more
- `/config.py` ← `heptacert\backend\src\db.py`, `heptacert\backend\src\main.py`, `heptacert\backend\src\ratelimit.py`, `heptacert\backend\src\services.py`, `heptacert\backend\src\utils.py` +2 more
- `/enums.py` ← `heptacert\backend\src\main.py`, `heptacert\backend\src\models.py`, `heptacert\backend\src\schemas.py`, `heptacert\backend\src\services.py`, `heptacert\backend\src\utils.py`
- `/generator.py` ← `heptacert\backend\src\main.py`, `heptacert\backend\src\quiz_api.py`, `heptacert\backend\src\services.py`, `heptacert\backend\_archive_lms\lms_api.py`
- `/db.py` ← `heptacert\backend\src\main.py`, `heptacert\backend\src\models.py`, `heptacert\backend\src\ratelimit.py`, `heptacert\backend\src\services.py`
- `/event_team.py` ← `heptacert\backend\src\main.py`, `heptacert\backend\src\schemas.py`, `heptacert\backend\src\services.py`
