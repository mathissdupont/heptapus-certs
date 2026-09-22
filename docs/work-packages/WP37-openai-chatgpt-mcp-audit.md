# WP37 — HeptaCert ChatGPT MCP / Plugin denetimi (2026-09-22)

Durum: OAuth resource binding, audience/issuer doğrulaması, per-tool `securitySchemes` ve `mcp/www_authenticate` kodlandı; **canlı ChatGPT Developer Mode bağlantısı ve public submission yapılmadı**. Canlı ortamı kullanıcı yayımlıyor. Bu belge hem denetim hem sonraki asistan için devir notudur. OpenAI'nin güncel terimi “Plugin”; MCP-only, UI'sız bir plugin mümkündür. Custom GPT Actions ayrı OpenAPI hattı olarak korunur.

## A. Mevcut mimari

`ChatGPT/diğer MCP istemcisi → HTTPS /mcp → FastMCP (stateless Streamable HTTP) → HeptaCert REST API → rol, scope ve kaynak yetkisi`. `/mcp` FastAPI'ye ASGI mount olarak bağlı; frontend `next.config.mjs` proxy rewrite içeriyor. `oauth_metadata_api.py` protected-resource ve AS discovery sunuyor; `oauth_api.py` DCR, authorization code + PKCE S256 ve refresh token sunuyor. Stdio istemcileri ayrıca `HEPTACERT_API_KEY` kullanabiliyor. Custom GPT Actions şemaları `heptacert/frontend/public/openapi-gpt*.json` dosyalarında, MCP'den bağımsızdır.

## B. MCP tool envanteri

Tüm araçların adı korunmuştur. Aşağıda `E` etkinlik, `A` katılımcı, `S` oturum, `C` sertifika, `R` otomasyon kuralı ID'sidir. `+` veri değiştirir; `!` geri alınması zor/çoklu etkidir; `↗` dış etki/iletişim olasılığıdır. Bütün tool'ların `inputSchema`'sı Python imzasından otomatik üretilir; tabloda yalnızca **required** girdiler yazılıdır, varsayılanı olanlar opsiyoneldir. `title`, adın okunur Title Case biçimidir (ör. `list_events` → `List Events`). `description` mevcut docstring'dir. **38 aracın tamamı şu an JSON metni `content` içinde döndürür; ayrı `outputSchema` ve `structuredContent` yoktur.**

| Tool (`title` = okunur ad) | Required input | REST endpoint / servis | Etki |
| --- | --- | --- | --- |
| `list_events` | — | GET `/api/admin/events` | Oku |
| `get_event` | E | GET `/api/admin/events/{E}` | Oku |
| `get_event_stats` | E | GET `/api/admin/events/{E}/health` | Oku |
| `create_event` | name | POST `/api/admin/events`, PATCH `/api/admin/events/{E}` | +↗ (public visibility) |
| `update_event` | E | PATCH `/api/admin/events/{E}` | +↗ (public visibility) |
| `delete_event` | E | GET önizleme, DELETE `/api/admin/events/{E}` | +! |
| `close_registration` | E | PATCH `/api/admin/events/{E}` | + |
| `open_registration` | E | PATCH `/api/admin/events/{E}` | + |
| `list_attendees` | E | GET `/api/admin/events/{E}/attendees` | Oku, PII |
| `add_attendee` | E, first_name, last_name, email | POST `/api/admin/events/{E}/attendees` | + |
| `bulk_add_attendees` | E, attendees | Çoklu POST `/api/admin/events/{E}/attendees` | +! (100/çağrı) |
| `update_attendee` | E, A | PATCH `/api/admin/events/{E}/attendees/{A}` | + |
| `remove_attendee` | E, A | DELETE `/api/admin/events/{E}/attendees/{A}` | +! |
| `list_sessions` | E | GET `/api/admin/events/{E}/sessions` | Oku |
| `create_session` | E, title | POST `/api/admin/events/{E}/sessions` | + |
| `update_session` | E, S | PATCH `/api/admin/events/{E}/sessions/{S}` | + |
| `delete_session` | E, S | GET önizleme, DELETE `/api/admin/events/{E}/sessions/{S}` | +! |
| `checkin_lookup` | E, query | GET `/api/admin/events/{E}/checkin-lookup` | Oku, PII |
| `manual_checkin` | E, S, attendee_email | POST `/api/admin/events/{E}/sessions/{S}/checkin` | + |
| `get_attendance_summary` | E | GET `/api/admin/events/{E}/attendance` | Oku |
| `list_certificates` | E | GET `/api/admin/events/{E}/certificates` | Oku, PII |
| `issue_certificates` | E | POST `/api/admin/events/{E}/bulk-certify-queue` | +!↗, önizleme/onay |
| `revoke_certificate` | C | POST `/api/admin/certificates/{C}/revoke` | +!, önizleme/onay |
| `get_certificate_tier_summary` | E | GET `/api/admin/events/{E}/certificates/tier-summary` | Oku |
| `list_automation_rules` | E | GET `/api/admin/events/{E}/automations` | Oku |
| `create_automation_rule` | E, name, trigger, actions | POST `/api/admin/events/{E}/automations` | +↗ |
| `get_survey_responses` | E | GET `/api/admin/events/{E}/surveys/responses` | Oku, PII |
| `get_organization_settings` | — | GET `/api/admin/organization/settings` | Oku |
| `list_agent_logs` | — | GET `/api/admin/mcp/agent-logs` | Oku, PII ayıklanır |
| `update_automation_rule` | E, R | PATCH `/api/admin/events/{E}/automations/{R}` | +↗ |
| `delete_automation_rule` | E, R | DELETE `/api/admin/events/{E}/automations/{R}` | +! |
| `list_webhooks` | — | GET `/api/admin/webhooks` | Oku, secret maskelenir |
| `create_webhook` | url, events | POST `/api/admin/webhooks` | +↗, secret maskelenir |
| `delete_webhook` | webhook_id | DELETE `/api/admin/webhooks/{id}` | +! |
| `search_attendees_across_events` | query | GET `/api/admin/crm/contacts` | Oku, PII |
| `export_event_attendees` | E | Sayfalı GET `/api/admin/events/{E}/attendees` | Oku, toplu PII (en çok 2000) |
| `get_event_analytics` | E | GET `/api/admin/events/{E}/analytics` | Oku |
| `get_certificate_by_public_id` | public_id | GET `/api/verify/{public_id}` | Oku |

`destructiveHint=true`: `delete_event`, `bulk_add_attendees`, `remove_attendee`, `delete_session`, `issue_certificates`, `revoke_certificate`, `delete_automation_rule`, `delete_webhook`. `openWorldHint=true`: `create_event`, `update_event`, `issue_certificates`, `create_automation_rule`, `update_automation_rule`, `create_webhook`. Salt okuma araçları `readOnlyHint=true, idempotentHint=true`; yazmalar false. Bunlar istemciye verilen ipuçlarıdır, sunucu yetkisinin yerini almaz.

## C. Zaten doğru olanlar

- MCP ile Custom GPT OpenAPI ayrı; hiçbir OpenAPI dosyasına dokunulmadı.
- OAuth discovery, DCR, PKCE S256, 401 `WWW-Authenticate` ve REST'te token/rol/scope kontrolü var.
- Etkinlik ve sertifika erişiminde `_get_event_for_admin` / organizasyon kontrolü var; ID tek başına yetki vermiyor. Mevcut event IDOR regresyon testleri tüm suite içinde çalışıyor.
- Silme/iptal araçları önizleme + `confirm=True` akışını zaten kullanıyordu.
- API key için isteğe bağlı dakika limiti ve DCR için IP/saat limiti var; LMS araçları MCP'den kaldırılmış.

## D. Tespit edilen eksikler

1. **Kritik (düzeltildi):** HTTP'de eksik/bozuk Bearer başlığı sunucunun `HEPTACERT_API_KEY` ortam değişkenine düşebiliyordu. Scope kimlik çağrısı hata verirse boş scope = sınırsız yetki sayılıyordu.
2. **Kritik (düzeltildi):** OAuth'ta bilinmeyen scope isteği boş grant üretebiliyor; boş scope REST'te sınırsız kabul ediliyordu. DCR'da tümü geçersiz scope isteği tüm grantable scope'lara genişleyebiliyordu.
3. **Yüksek (düzeltildi):** Webhook REST yanıtındaki `secret` model çıktısına sızıyordu; audit log geçmiş payload'ında PII görülebiliyordu. MCP audit-log endpointi scope muafiyetindeydi.
4. **Yüksek (düzeltildi):** `issue_certificates` yanlış endpoint/body kullanıyordu; `attendee_ids` backend'de desteklenmiyordu. Sertifika listeleme için API-key/OAuth okuma scope'u ile event-team yönetim izni ayrı katmanlardır.
5. **Yüksek (düzeltildi; canlı test bekliyor):** `resource` authorization code ve refresh token üzerinde korunuyor; bağlı JWT'de `aud`/`iss` var. `/mcp` yalnızca doğru audience/issuer taşıyan OAuth JWT'yi veya etkin `hc_live_` API key'i kabul ediyor. Önceki audience'sız Custom GPT REST token'ları REST tarafında çalışmayı sürdürüyor ama MCP'ye alınmıyor. Migration `113_oauth_resource_binding` canlıya kodla birlikte alınmalı.
6. **Orta (düzeltildi; ChatGPT UI testi bekliyor):** Dış MCP katmanı `initialize/tools/list` dahil her HTTP isteğinde gerçek token/key'i ve kullanıcı durumunu kontrol ediyor. Python `mcp==1.28.1` Tool modelinin izin verdiği extension field ile 38 tool'un `securitySchemes` alanı üretiliyor; 401/403/scope hata sonucuna `_meta["mcp/www_authenticate"]` ekleniyor.
7. **Orta (açık):** Çıktılar JSON string; `structuredContent`, `outputSchema`, gizli client `_meta` yok. Özellikle liste/sertifika/önizleme araçları için şema sürümlendirmesi ve geriye uyumlu dönüşüm gerekli.
8. **Orta (açık):** OAuth token'lı yoğun tool çağrıları için anahtar başına rate limit yok; DCR cache kesilirse kayıt limiti fail-open. Bazı imzalarda serbest `list[dict]`, tarih/enum ve pagination sınırları daha sıkı tanımlanabilir. `include_certificates` uyumluluk için duruyor ama uygulanmıyor.
9. **Orta (açık):** Canlı ChatGPT developer-mode OAuth bağlantısı, `/mcp` production çağrısı ve directory incelemesi bu yerel denetimde yapılmadı; kullanıcı dağıtımı sonrası gerekir.

## E. Yapılan değişiklikler

- 38 tool'a okunabilir `title` ve davranışa göre dört annotation eklendi; adlar korunarak eski istemciler bozulmadı.
- HTTP header zorunlu ve scope lookup fail-closed. REST hataları model için güvenli 401/403/404/409/422/429/5xx mesajlarına indirgeniyor.
- Tool sonuçlarında iç içe sır/token alanları maskeleniyor; MCP audit log'unda eski payload/özet çıkarıldı; yeni attendee/check-in logları PII yazmıyor.
- Toplu katılımcı ekleme 1–100 aralığına sınırlandı; hata gövdesi yerine yalnızca durum kodu dönüyor.
- Sertifika toplu işi gerçek kuyruk endpointine yönlendirildi. `confirm` olmadan mutasyon yok; seçili attendee ID verilirse yanlış işlem yapmak yerine açık hata dönüyor.
- OAuth sıfır/geçersiz scope reddediliyor; audit log REST endpointi `events:read` ister. Sertifika listelemede mevcut event-team izin kuralı korunur.

## F. Şimdilik değiştirilmeyenler / gerekçe

- Eski audience'sız OAuth token'lar Custom GPT REST hattında geçerli kalır; MCP için yeniden OAuth bağlantısı gerekir. Canlı migration sonrası ChatGPT'de bağlantı testi ve dönen token'ın `aud` doğrulaması yapılmalı.
- `structuredContent`/`outputSchema` tüm 38 tool için aşamalı sözleşme dönüşümü ister; JSON text mevcut istemciler için korundu.
- OAuth rate limit ve veri export politikasının PII/onay modeli ayrı paketler olmalı. `securitySchemes` extension alanı SDK sürüm yükseltmesinde yeniden doğrulanmalı.
- Yeni Apps SDK UI/asset, Codex kişisel plugin iskeleti veya App Directory gönderimi yapılmadı. Bu iş mevcut remote MCP denetimiydi; `plugin-creator` becerisi bu yüzden kullanılmadı.

## G. ChatGPT UI için sonraki adımlar

Önce stabil `structuredContent` alanları: EventCard (`id,name,date,visibility`), EventList (`events,total,next_page`), ParticipantTable (`attendees,total,page`, PII minimize), CertificateCard (`id,status,verify_url`), CertificateIssueConfirmation (`event_id,eligible_count,estimated_cost,requires_confirm`). Böylece UI'sız tool yanıtları da yeterli kalır. Sonra `ui://` resource/component ve widget metadata'sı, mobil/dark/a11y testleri. UI isteğe bağlıdır; bu fazda sıfırdan frontend yazılmadı.

## H. Public OpenAI Plugin Directory öncesi kontrol listesi

1. **Kodlandı:** OAuth `resource` → code/refresh token → `aud` zinciri, issuer/audience/scope/expiry doğrulaması ve eski REST token'ları için uyumluluk. **Canlı kontrol:** ChatGPT'nin kaydettiği callback URI ve yeni token audience'ı.
2. **Kodlandı:** MCP `initialize/tools/list` dahil her istekte token doğrulama; 38 per-tool auth declaration/runtime challenge. **Canlı kontrol:** ChatGPT'de gerçek `tools/list` çıktısı ve linking UI.
3. Production HTTPS `/mcp`, discovery metadata ve 401 challenge uçtan uca; 38 tool taraması, yanlış event ID/rol/organizasyon, 401/403/404/429, destructive onay, PII ve webhook sır testi.
4. Veri kullanımı, gizlilik politikası, saklama/silme, destek bağlantıları, yayıncı doğrulaması; hukuk danışmanı bulunmadığı için sözleşme/KVKK metinleri onaylanmadan hukuki beyan yapılmamalı.
5. Developer mode'da bağlantı ve gerçek OAuth login testi; kullanıcı onayıyla submission draft ve review. MCP-only plugin mümkündür; dizine ekleme otomatik değildir.

Resmî kaynaklar: [MCP server](https://developers.openai.com/plugins/build/mcp-server), [Authentication](https://developers.openai.com/plugins/build/auth), [Connect/test](https://developers.openai.com/plugins/deploy/connect-chatgpt), [Package](https://developers.openai.com/plugins/build/plugins), [Submit](https://developers.openai.com/plugins/deploy/submission).

### Değişen dosyalar

- `heptacert/backend/src/mcp_server.py`: metadata, güvenli auth/scope/hata/yanıt ve doğru certificate queue.
- `heptacert/backend/src/oauth_api.py`: boş veya geçersiz OAuth scope grant'ini kapatma.
- `heptacert/backend/src/services.py`: boş OAuth scope'u reddetme ve audit-log REST scope kontrolü.
- `heptacert/backend/src/main.py`: HTTP Bearer doğrulaması; sertifika listelemede rol/scope ayrımını belirginleştiren açıklama.
- `heptacert/backend/tests/test_mcp_contract.py`: MCP sözleşmesi, auth, redaction ve yüksek etkili işlem regresyonları.
- Bu belge: araç envanteri, açık kalan submission engelleri ve devir notu.

Doğrulama: Docker `python -m pytest tests -q --disable-warnings` → **582 passed** (yerel test veritabanı); `tests/test_mcp_oauth.py` + `tests/test_mcp_contract.py` → **50 passed**. Frontend `npm run check:ui`, `npx tsc --noEmit` ve `npm test -- --run` → **78 passed**. Canlı ortam / ChatGPT hesabı doğrulaması yapılmadı.

## I. Canlıya alma ve Developer Mode kabul testi

1. Kodla birlikte `113_oauth_resource_binding` migration'ını uygula; backend ve frontend'i aynı sürüme al. Eski Custom GPT Actions REST hattı çalışmaya devam eder, ancak eski audience'sız OAuth token ile MCP'ye girilemez; MCP bağlantısını yenile.
2. Canlı HTTPS üzerinde `/.well-known/oauth-protected-resource` alanındaki `resource` değerinin tam `https://heptacert.com/mcp` olduğunu, `/.well-known/oauth-authorization-server` issuer/token/authorization URL'lerini ve kimliksiz `POST /mcp` yanıtındaki 401 `WWW-Authenticate` başlığını kontrol et.
3. ChatGPT Developer Mode'da yeni MCP bağlantısı olarak `https://heptacert.com/mcp` ekle; gerçek HeptaCert hesabıyla OAuth consent'i tamamla. HeptaCert henüz authorization response `iss` ilan etmediğinden ChatGPT'nin gösterdiği bağlantıya özel callback URI beklenir; DCR onu kaydetmelidir. Bağlantı başarısızsa ChatGPT'nin gösterdiği tam hata ile authorization/token isteklerinin HTTP durumlarını kaydet; token/secret paylaşma.
4. `tools/list` sonucunda 38 tool ve her birinde `securitySchemes` görünmeli. `list_events` gibi okuma ve `create_event` gibi yazma araçlarını yalnızca ayrı bir test organizasyonu üzerinde dene; eksik scope hata sonucunda `_meta["mcp/www_authenticate"]` dönmeli. Yanlış event ID başka organizasyon verisini göstermemeli.
5. Bu canlı adımlar doğrulanmadan Developer Mode testi veya public submission **tamamlandı** olarak işaretlenmez. `structuredContent`, Apps SDK UI ve public submission bu paketin dışında, sonraki aşamadır.
