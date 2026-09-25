# WP37 — HeptaCert ChatGPT MCP / Plugin denetimi (2026-09-22)

Durum: OAuth resource binding, audience/issuer doğrulaması, per-tool `securitySchemes` ve `mcp/www_authenticate` kodlandı. **Canlı ChatGPT Developer Mode bağlantısı, OAuth ve bir gerçek tool çağrısı kullanıcı tarafından doğrulandı.** Sonraki adımda 38 aracın tamamına `structuredContent` + `outputSchema`, altı Apps SDK UI bileşeni, domain doğrulama ucu ve submission manifesti eklendi (branch `feat/wp37-structured-content-apps-ui`). **Genişletilmiş kabul matrisi, UI'ın ChatGPT'de gözle doğrulanması ve public submission hâlâ yapılmadı.** Canlı ortamı kullanıcı yayımlıyor. Bu belge hem denetim hem sonraki asistan için devir notudur. OpenAI'nin güncel terimi “Plugin”; MCP-only UI'sız bir plugin mümkündür ama kullanıcı ilk sürümde UI istedi (2026-09-22). Custom GPT Actions ayrı OpenAPI hattı olarak korunur.

## A. Mevcut mimari

`ChatGPT/diğer MCP istemcisi → HTTPS /mcp → FastMCP (stateless Streamable HTTP) → HeptaCert REST API → rol, scope ve kaynak yetkisi`. `/mcp` FastAPI'ye ASGI mount olarak bağlı; frontend `next.config.mjs` proxy rewrite içeriyor. `oauth_metadata_api.py` protected-resource ve AS discovery sunuyor; `oauth_api.py` DCR, authorization code + PKCE S256 ve refresh token sunuyor. Stdio istemcileri ayrıca `HEPTACERT_API_KEY` kullanabiliyor. Custom GPT Actions şemaları `heptacert/frontend/public/openapi-gpt*.json` dosyalarında, MCP'den bağımsızdır.

## B. MCP tool envanteri

Tüm araçların adı korunmuştur. Aşağıda `E` etkinlik, `A` katılımcı, `S` oturum, `C` sertifika, `R` otomasyon kuralı ID'sidir. `+` veri değiştirir; `!` geri alınması zor/çoklu etkidir; `↗` dış etki/iletişim olasılığıdır. Bütün tool'ların `inputSchema`'sı Python imzasından otomatik üretilir; tabloda yalnızca **required** girdiler yazılıdır, varsayılanı olanlar opsiyoneldir. `title`, adın okunur Title Case biçimidir (ör. `list_events` → `List Events`). `description` mevcut docstring'dir. **38 aracın tamamı artık hem JSON metni `content` içinde hem aynı payload'ı `structuredContent` içinde döndürür ve hepsinin `outputSchema`'sı vardır** (§J).

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
7. **Orta (düzeltildi; ChatGPT UI testi bekliyor):** 38 aracın tamamı `structuredContent` + `outputSchema` döndürüyor; altı araç `ui://` bileşenine bağlandı. Ayrıntı ve kırıcı sözleşme değişiklikleri §J'de.
8. **Orta (açık):** OAuth token'lı yoğun tool çağrıları için anahtar başına rate limit yok; DCR cache kesilirse kayıt limiti fail-open. Bazı imzalarda serbest `list[dict]`, tarih/enum ve pagination sınırları daha sıkı tanımlanabilir. `include_certificates` uyumluluk için duruyor ama uygulanmıyor.
9. **Orta (kısmen doğrulandı):** Kullanıcı ChatGPT Developer Mode'da HeptaCert OAuth hesabını bağladı, Refresh sonrasında araçları gördü ve gerçek bir araç çağrısının çalıştığını bildirdi (2026-09-22). Tool adı/yanıtı bu kayıtta yok; farklı scope'lar, yazma onayı, 401/403, tenant sınırları ve directory incelemesi hâlâ kabul testinde.

## E. Yapılan değişiklikler

- 38 tool'a okunabilir `title` ve davranışa göre dört annotation eklendi; adlar korunarak eski istemciler bozulmadı.
- HTTP header zorunlu ve scope lookup fail-closed. REST hataları model için güvenli 401/403/404/409/422/429/5xx mesajlarına indirgeniyor.
- Tool sonuçlarında iç içe sır/token alanları maskeleniyor; MCP audit log'unda eski payload/özet çıkarıldı; yeni attendee/check-in logları PII yazmıyor.
- Toplu katılımcı ekleme 1–100 aralığına sınırlandı; hata gövdesi yerine yalnızca durum kodu dönüyor.
- Sertifika toplu işi gerçek kuyruk endpointine yönlendirildi. `confirm` olmadan mutasyon yok; seçili attendee ID verilirse yanlış işlem yapmak yerine açık hata dönüyor.
- OAuth sıfır/geçersiz scope reddediliyor; audit log REST endpointi `events:read` ister. Sertifika listelemede mevcut event-team izin kuralı korunur.

## F. Şimdilik değiştirilmeyenler / gerekçe

- Eski audience'sız OAuth token'lar Custom GPT REST hattında geçerli kalır; MCP için yeniden OAuth bağlantısı gerekir. Canlı migration sonrası ChatGPT'de bağlantı testi ve dönen token'ın `aud` doğrulaması yapılmalı.
- OAuth rate limit ve veri export politikasının PII/onay modeli ayrı paketler olmalı. `securitySchemes` extension alanı SDK sürüm yükseltmesinde yeniden doğrulanmalı.
- App Directory gönderimi **yapılmadı** — manifest hazır, gönderim kullanıcının hesabından yapılacak (§K).

## G. ChatGPT UI — yapıldı

Planlanan `structuredContent` alanları ve bileşenler kodlandı; ayrıntı §J'de. Kalan iş gözle doğrulama: ChatGPT'de altı bileşenin inline/fullscreen, açık/koyu tema ve dar ekran görünümü, buton davranışı ve `ui.domain` origin'inin canlıda doğru olması.

## H. Public OpenAI Plugin Directory öncesi kontrol listesi

1. **Kodlandı:** OAuth `resource` → code/refresh token → `aud` zinciri, issuer/audience/scope/expiry doğrulaması ve eski REST token'ları için uyumluluk. **Canlı kontrol:** ChatGPT'nin kaydettiği callback URI ve yeni token audience'ı.
2. **Kodlandı:** MCP `initialize/tools/list` dahil her istekte token doğrulama; 38 per-tool auth declaration/runtime challenge. **Canlı kontrol:** ChatGPT'de gerçek `tools/list` çıktısı ve linking UI.
3. Production HTTPS `/mcp`, discovery metadata ve 401 challenge uçtan uca; 38 tool taraması, yanlış event ID/rol/organizasyon, 401/403/404/429, destructive onay, PII ve webhook sır testi.
4. Veri kullanımı, gizlilik politikası, saklama/silme, destek bağlantıları, yayıncı doğrulaması; hukuk danışmanı bulunmadığı için sözleşme/KVKK metinleri onaylanmadan hukuki beyan yapılmamalı.
5. Developer mode'da bağlantı ve gerçek OAuth login testi; kullanıcı onayıyla submission draft ve review. MCP-only plugin mümkündür; dizine ekleme otomatik değildir.
6. **Kodlandı:** `/.well-known/openai-apps-challenge` (token env'den, yokken 404), `plugin.json` + `mcp.json` manifesti, `ui.domain` için `HEPTACERT_WIDGET_ORIGIN`. **Canlı kontrol:** portaldan alınan token'ı deploy et ve yolun 200 + düz metin döndüğünü doğrula.

Resmî kaynaklar: [MCP server](https://developers.openai.com/plugins/build/mcp-server), [Authentication](https://developers.openai.com/plugins/build/auth), [Connect/test](https://developers.openai.com/plugins/deploy/connect-chatgpt), [Package](https://developers.openai.com/plugins/build/plugins), [Submit](https://developers.openai.com/plugins/deploy/submission).

### Değişen dosyalar

İlk tur (audit, `87371ec`–`dd2e1ac`):

- `heptacert/backend/src/mcp_server.py`: metadata, güvenli auth/scope/hata/yanıt ve doğru certificate queue.
- `heptacert/backend/src/oauth_api.py`: boş veya geçersiz OAuth scope grant'ini kapatma.
- `heptacert/backend/src/services.py`: boş OAuth scope'u reddetme ve audit-log REST scope kontrolü.
- `heptacert/backend/src/main.py`: HTTP Bearer doğrulaması; sertifika listelemede rol/scope ayrımını belirginleştiren açıklama.
- `heptacert/backend/tests/test_mcp_contract.py`: MCP sözleşmesi, auth, redaction ve yüksek etkili işlem regresyonları.

İkinci tur (structuredContent + UI + submission, `feat/wp37-structured-content-apps-ui`):

- `heptacert/backend/src/mcp_server.py`: 38 aracın çıktı sözleşmesi, `_result()`, projeksiyon yardımcıları, widget kayıt/metadata katmanı.
- `heptacert/backend/src/mcp_widgets/`: **yeni** — altı bileşen + paylaşılan `common.css` / `common.js`.
- `heptacert/backend/src/oauth_metadata_api.py`, `config.py`: domain doğrulama ucu ve token ayarı.
- `heptacert/frontend/next.config.mjs`, `heptacert/Caddyfile.whitelabel.example`: challenge yolunun backend'e yönlenmesi.
- `heptacert/chatgpt-plugin/`: **yeni** — `plugin.json`, `mcp.json`, `assets/logo.png`, README.
- `heptacert/backend/.env.example`: `HEPTACERT_WIDGET_ORIGIN`, `OPENAI_APPS_CHALLENGE_TOKEN`.

Doğrulama (ilk tur): Docker `python -m pytest tests -q` → **582 passed**; MCP testleri → **50 passed**. Frontend `npm run check:ui`, `npx tsc --noEmit`, `npm test -- --run` → **78 passed**. Canlı `/.well-known/oauth-protected-resource` 200 ve kimliksiz `/mcp` 401 + `WWW-Authenticate` bağımsız gözlendi (2026-09-22). Kullanıcı ChatGPT OAuth bağlantısını, araç keşfini ve bir gerçek çağrıyı doğruladı; bunlar kullanıcı beyanıdır, ham çağrı kaydı elde edilmedi.

Doğrulama (ikinci tur, 2026-09-22): Docker `python -m pytest tests -q --disable-warnings` → **589 passed** (öncesi 582). Frontend `npx tsc --noEmit` temiz, `npm test -- --run` → **86 passed** (öncesi 78), `npm run check:ui` baseline'da.

Bileşenler için `frontend/src/test/mcpWidgets.test.ts` eklendi: jsdom altında altı bileşeni `_widget_html()` ile aynı sırada gerçekten çalıştırıyor, `window.openai`'yi taklit ediyor ve render edilen metni, `openai:set_globals` üzerine yeniden render'ı, tema geçişini, `openExternal` köprüsünü ve "host yok" fallback'ini doğruluyor. Ayrıca `issue-confirmation`'daki onay düğmesinin yazma yapmayıp yalnızca takip istemi ürettiği teste bağlandı.

**Hâlâ doğrulanmadı:** bileşenlerin ChatGPT içindeki gerçek görünümü. jsdom düzen, kontrast, mobil genişlik veya fullscreen davranışını ölçmez; bunlar canlı Developer Mode'da gözle kontrol edilmeli.

## I. Canlıya alma ve Developer Mode kabul testi

1. Kodla birlikte `113_oauth_resource_binding` migration'ını uygula; backend ve frontend'i aynı sürüme al. Eski Custom GPT Actions REST hattı çalışmaya devam eder, ancak eski audience'sız OAuth token ile MCP'ye girilemez; MCP bağlantısını yenile.
2. Canlı HTTPS üzerinde `/.well-known/oauth-protected-resource` alanındaki `resource` değerinin tam `https://heptacert.com/mcp` olduğunu, `/.well-known/oauth-authorization-server` issuer/token/authorization URL'lerini ve kimliksiz `POST /mcp` yanıtındaki 401 `WWW-Authenticate` başlığını kontrol et.
3. ChatGPT Developer Mode'da yeni MCP bağlantısı olarak `https://heptacert.com/mcp` ekle; gerçek HeptaCert hesabıyla OAuth consent'i tamamla. HeptaCert henüz authorization response `iss` ilan etmediğinden ChatGPT'nin gösterdiği bağlantıya özel callback URI beklenir; DCR onu kaydetmelidir. Bağlantı başarısızsa ChatGPT'nin gösterdiği tam hata ile authorization/token isteklerinin HTTP durumlarını kaydet; token/secret paylaşma.
4. `tools/list` sonucunda 38 tool ve her birinde `securitySchemes` görünmeli. `list_events` gibi okuma ve `create_event` gibi yazma araçlarını yalnızca ayrı bir test organizasyonu üzerinde dene; eksik scope hata sonucunda `_meta["mcp/www_authenticate"]` dönmeli. Yanlış event ID başka organizasyon verisini göstermemeli.
5. İlk Developer Mode bağlantı/çağrı smoke testi kullanıcı tarafından doğrulandı. Tam kabul için 38 aracın ve gerekli scope'ların kapsamlı testi, yanlış tenant ID, 401/403/404, yıkıcı işlem onayı ve PII/sır kontrolü ayrıca yapılır. Public submission **tamamlandı değildir**.

## J. Çıktı sözleşmesi ve UI bileşenleri (ikinci tur)

**Kırıcı değişiklik.** MCP `structuredContent` bir nesne olmak zorunda olduğundan, düz JSON dizisi döndüren araçlar artık adlandırılmış zarf döndürüyor. Bu, yayın öncesi bilinçli kırılmadır: tek canlı istemci kullanıcının kendi developer-mode bağlantısıdır ve kötü sözleşmeyi dizine taşımak istemedik. Yeniden bağlanma gerekmez; istemci yeni şemayı `tools/list`'ten okur.

| Eskiden | Şimdi |
| --- | --- |
| `list_sessions` → dizi | `{event_id, total, sessions}` |
| `checkin_lookup` → dizi | `{event_id, query, total, matches}` |
| `list_webhooks` / `list_automation_rules` / `list_agent_logs` → dizi | `{total, webhooks}` / `{event_id, total, rules}` / `{total, logs}` |
| `get_event` → düz event nesnesi | `{event, stats}` |
| `get_event_stats` → ham health payload | `{event_id, generated_at, stats, latest_jobs}` |
| `list_attendees` → ham REST sayfası | `{event_id, total, page, limit, has_more, attendees}` |
| `list_certificates` → ham REST sayfası | `{event_id, total, page, limit, has_more, certificates}` |

Şema kuralları: modellerin tüm alanları opsiyonel ve `extra="allow"` — yeni bir REST alanı çalışan bir çağrıyı doğrulama hatasına çeviremez. `content` içindeki JSON metni korunuyor, `structuredContent` aynı redakte edilmiş payload'ın birebir aynısı (`_result()` `_fmt` üzerinden round-trip yapar, ikisi ayrışamaz).

Yol boyunca çıkan iki gerçek hata düzeltildi:

1. **`delete_event` önizlemesi tüm sayıları "unknown" gösteriyordu.** `/health` sayıları `overview` altında ve farklı adlarla (`attendees`, `sessions`, `certificates`) döndürüyor; kod bunları üst seviyeden okuyordu. Yıkıcı onay, tam da var olma sebebi olan sayılardan sessizce yoksundu. `_event_stats()` düzleştirmesi eklendi, regresyon testi yazıldı.
2. **`list_attendees` docstring'inin vaat etmediği PII'ı modele veriyordu.** Ham REST kaydı `registration_answers` (organizatörün sorduğu serbest sorulara verilen yanıtlar — TC kimlik gibi alanlar dahil olabilir) ve bağlı public member'ın id/ad/e-postasını taşıyor. `_attendee()` projeksiyonu bunları kesiyor; `export_event_attendees` ve `add/update_attendee` de aynı projeksiyondan geçiyor.

Sertifikalarda `pdf_url` çıktıdan kaldırıldı, yerine public doğrulama sayfasına `verify_url` konuyor.

Bileşenler (`backend/src/mcp_widgets/`, altı adet): `event-list`, `event-card`, `attendee-table`, `certificate-list`, `certificate-card`, `issue-confirmation`. Vanilla JS/CSS, build adımı yok; `_widget_html()` paylaşılan `common.css` + `common.js`'i her bileşenin başına ekler. Tasarım kısıtları OpenAI UI kılavuzundan: host fontu, düz sistem renkleri, WCAG AA kontrast, iç scroll yok, kart başına en çok iki birincil aksiyon, kendi logomuz yok.

**Güvenlik duruşu:** bileşenler yalnızca sunucunun zaten redakte ettiği `structuredContent`'i render eder. Kimlik bilgisi tutmazlar, ağa çıkmazlar (`ui.csp.connectDomains: []`) ve kendi başlarına yazma yapmazlar — `issue-confirmation`'daki "Yes, issue them" düğmesi bile sadece takip istemi taslağı yazar; gerçek yazma modelin `confirm=True` akışında kalır. Test bunu `fetch(`/`XMLHttpRequest`/`<script src=`/`localStorage` yasağıyla zorluyor.

Tool ↔ bileşen eşlemesi tek tabloda (`TOOL_WIDGETS`), `securitySchemes` tablosunun yanında; `_meta` 38 decorator yerine `list_tools()` içinde tek yerden basılıyor. Hem `ui.resourceUri` hem ChatGPT alias'ı `openai/outputTemplate` yazılıyor ve test ikisinin ayrışmadığını doğruluyor.

## K. Public submission — kalan işler

Teknik taraf hazır; aşağıdakiler **kullanıcının hesabından** yapılır ve kod değişikliği değildir.

1. **Deploy.** `feat/wp37-structured-content-apps-ui` branch'ini main'e al ve canlıya çık. Production'da `HEPTACERT_WIDGET_ORIGIN`'i OpenAI'ye bildirilecek origin'e ayarla (varsayılan public origin). Yeni migration yok.
2. **Doğrulanmış yayıncı kimliği — karar verildi: bireysel (2026-09-22).** HeptaCert henüz vergi numarası olan tüzel kişi olmadığı için kurumsal doğrulama yapılamıyor; OpenAI business verification resmi sicildeki unvan, kayıtlı adres ve vergi/sicil numarası istiyor. Bu yüzden `developerName` ve `author.name` = `Samet Unsal`. Uygulama adı (`displayName`) "HeptaCert" kalıyor. Doğrulamayı [platform.openai.com/settings/organization/general](https://platform.openai.com/settings/organization/general) üzerinden yayın yapacak organizasyonda tamamla; gönderen hesapta "Apps Management" yazma yetkisi olmalı. **Manifestteki ad kimlikteki yazımla birebir aynı olmalı** — repodaki git config'ten geldiği için Türkçe karakter düşmüş olabilir (`Ünsal` mı?).
3. **Domain doğrulama.** Portaldan plugin'e özel token'ı al, `OPENAI_APPS_CHALLENGE_TOKEN` olarak deploy et, `https://heptacert.com/.well-known/openai-apps-challenge` adresinin sadece o token'ı düz metin döndürdüğünü doğrula.
4. **Hukuki metinler — açık risk, bireysel yayıncılıkla büyüdü.** İki ayrı sorun: (a) `/gizlilik` ve `/kullanim-kosullari` sayfalarında **hiçbir veri sorumlusu tanımlı değil** — tüzel kişi adı, ticaret unvanı, vergi no, MERSIS yok, sadece "HeptaCert" markası geçiyor (2026-09-22'de dosyalarda tarandı). İnceleyiciler bu metinlerin yayıncı kimliğiyle eşleştiğini kontrol ediyor ve KVKK kimliği belirli bir veri sorumlusu bekliyor; bireysel yayıncılıkta bu kişinin metinlerde adlandırılması gerekir. (b) Metinler web ürünü için yazıldı; OpenAI ile paylaşılan veriyi kapsayıp kapsamadıkları **incelenmedi**, hukuk danışmanı onayı yok. Gönderimdeki politika beyanları onaylanmadan işaretlenmemeli.

   ⚠️ Kullanıcı 2026-09-22'de önce "kendi adıma yayımlamak istemiyorum" dedi, sonra bilerek bireysel doğrulamayı seçti. Yayıncı satırında gerçek adının görüneceği ve KVKK aydınlatma metninin kimlik/adres bilgisi isteyebileceği kabul edilmiş sayılır; şirket kurulduğunda kurumsal doğrulamaya geçilip manifest güncellenebilir.
5. **Demo hesabı.** İncelemeye MFA/SMS/e-posta onayı gerektirmeyen bir test organizasyonu hesabı verilmeli; içinde en az bir etkinlik, katılımcılar ve verilmiş bir sertifika bulunsun ki pozitif test vakaları çalışsın.
6. **Test vakaları.** Form beş pozitif + üç negatif vaka istiyor. Negatifler için doğal adaylar: başka organizasyonun event ID'si (veri görünmemeli), eksik scope'lu bağlantı (`mcp/www_authenticate` dönmeli), `confirm=True` olmadan `delete_event` (önizleme dönmeli, silmemeli).
7. **Listeleme içeriği.** `plugin.json`'daki kategori tahmindir; portalın listesinden seç. Logo 738 KB — portal reddederse yeniden dışa aktar. Ekran görüntüsü henüz yok.
8. **Scan Tools.** Portalda MCP taramasını çalıştır ve 38 aracın adı, açıklaması, annotation'ları ve çıktı şemasıyla göründüğünü kontrol et.
