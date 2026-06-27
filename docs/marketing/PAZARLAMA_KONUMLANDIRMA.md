# HeptaCert — Pazarlama Konumlandırma Dokümanı

> Hazırlık tarihi: 2026-06-24
> Kaynak: Kod tabanı incelemesi (`.codesight/`, backend kaynak dosyaları, `featureMetadata.ts`, `plan_policy.py`)
> Kapsam dışı: LMS modülü (arşivlenmiş) — bu dokümanda pazarlama mesajı olarak kullanılmamıştır.

Bu doküman; web sitesi, satış sunumu, teklif metinleri ve reklam kampanyaları için **yeniden kullanılabilir** temel mesaj kütüphanesidir. Her iddianın kod tabanında karşılığı vardır.

> **Doğrulama notu:** "Kanıt" satırları kod tabanındaki gerçek modüllere işaret eder. Müşteri, ortaklık, sertifikasyon veya kesin yasal uyum iddiası **eklenmemiştir**; bu tür iddialar kullanılmadan önce ayrıca doğrulanmalıdır.

---

## 1. Ana Konumlandırma: HeptaCert bir **Etkinlik İşletim Sistemi**dir

**HeptaCert tek bir özellik (sertifika) değildir. Etkinliğin tüm yaşam döngüsünü — keşiften kayda, ödemeden sahadaki operasyona, etkileşimden etkinlik sonrası ilişki yönetimine kadar — tek bir sistemde çalıştıran bir *Etkinlik İşletim Sistemi (Event OS)*'dir.**

"İşletim sistemi" benzetmesi bilinçli. Bir işletim sistemi gibi HeptaCert:
- **Tek kayıt kaynağıdır (single system of record):** Bilet, katılımcı, oturum, ödeme, sertifika, CRM — hepsi aynı veride yaşar. Araçlar arası kopyala-yapıştır yok.
- **Üzerine inşa edilebilir bir platformdur:** Açık API, OAuth/OIDC kimlik sağlayıcı, MCP (AI ajan) arayüzü, webhook'lar ve marketplace ile diğer sistemler HeptaCert'in *üstüne* kurulur.
- **Çok kiracılı ve white-label çalışır:** Her organizasyon kendi markası, kendi alan adı ve kendi ekibiyle izole bir "işletim ortamı" alır.

> 715 API rotası · 157 veri modeli · 247 arayüz bileşeni — bu, bir "sertifika aracı" değil, bir platform ölçeğidir.

### Tek cümlelik konumlandırma
> **"6-8 ayrı araçla yürüttüğünüz etkinlik operasyonunu tek sistemde çalıştırın — ve katılımcıya sahteciliğe kapalı, ömür boyu doğrulanabilir bir belge bırakın."**

---

## 2. Çözdüğümüz Asıl Problem: Parçalı Araç Yığını (Tool Stack)

Bugün bir etkinlik ekibi tipik olarak şunları ayrı ayrı kullanır ve aralarında veri taşır:

| İhtiyaç | Tipik ayrı araç | HeptaCert'te |
|---|---|---|
| Bilet & kayıt | Eventbrite / Biletino | ✅ Yerleşik |
| Ödeme | Ayrı POS / sanal pos | ✅ Yerleşik (iyzico entegrasyonu) |
| Check-in / kapı | Ayrı uygulama | ✅ Kiosk + gerçek zamanlı akış |
| Toplu e-posta | Mailchimp | ✅ Yerleşik (takip + analitik) |
| CRM | HubSpot / Salesforce | ✅ Yerleşik (push da yapar) |
| Anket / quiz | Typeform / Google Forms | ✅ Yerleşik |
| Sunum & canlı kontrol | PowerPoint + ayrı clicker | ✅ Yerleşik (uzaktan QR) |
| Sertifika | Canva + elle dağıtım | ✅ Güvenli, doğrulanabilir, cüzdana eklenebilir |
| Mekân/rezervasyon | Takvim + e-tablo | ✅ Yerleşik (Google Calendar senkron) |
| Topluluk / üye profili | Ayrı sosyal araç | ✅ Yerleşik |

**Tek satırlık değer:** *"Aralarında veri taşıdığınız 8 sekmeyi kapatın. Etkinlik tek yerde yaşasın."*

> Bu "stack replacement" (yığını birleştirme) anlatısı, satışta en güçlü ROI argümanıdır: maliyet düşer, veri tutarlı kalır, hata azalır.

---

## 3. Etkinlik Yaşam Döngüsü — Uçtan Uca Kapsama

HeptaCert'in genişliğini en iyi anlatan şey, etkinliğin her aşamasını kapsamasıdır:

### 3.1. KEŞİF (etkinlikten önce)
- Herkese açık **etkinlik marketplace'i** ve kategori keşfi (`/api/public/marketplace`)
- Halka açık organizasyon ve üye profilleri, takip etme (`/api/public/organizations`, `follow`)
- Bekleme listesi (waitlist), lead formları

### 3.2. KAYIT & BİLET
- Özelleştirilebilir kayıt formları (`registration-fields`), e-posta doğrulamalı kayıt
- Çoklu bilet türleri (`ticket-types`), kapasite yönetimi
- Kayıt sırasında yasal onay (legal consent) kaydı

### 3.3. ÖDEME & ABONELİK
- Yerleşik ödeme (iyzico), sipariş ve fatura akışı (`/api/billing/*`)
- Çok katmanlı abonelik (Starter/Pro/Growth/Enterprise) ve HeptaCoin bakiye sistemi
- **Kanıt:** `payments.py`, `IYZICO_*` ortam değişkenleri, `/api/superadmin/coins/credit`

### 3.4. SAHADA OPERASYON (etkinlik günü)
- QR ile **check-in**, **kiosk modu**, oturum bazlı yoklama (`sessions/{id}/checkin`)
- **Gerçek zamanlı check-in akışı** (SSE — `/checkin/stream`) ve canlı metrikler
- **Canlı sunum sistemi:** sunucu token'ı, izleyici için uzaktan QR, ayrı uzaktan kumanda ekranı (`presentation_api.py`, 25 rota)
- Mekân ve rezervasyon yönetimi, Google Calendar senkron

### 3.5. ETKİLEŞİM & GAMİFİKASYON
- Anketler (survey), quiz, **çekilişler (raffles)**, rozetler (badges)
- Sponsor vitrinleri, etkinlik yorumları/topluluk
- Otomasyon kuralları (koşullu iş akışları, dry-run, dispatch-now)

### 3.6. İLETİŞİM
- Toplu e-posta, zamanlanmış e-posta, şablonlar, açılma/tıklama takibi, teslimat logları
- AI ile e-posta ve form metni üretimi
- **Kanıt:** `email_api.py` (21 rota), `/api/admin/ai/generate-email`

### 3.7. ETKİNLİK SONRASI — DEĞERİN HASADI
- **Yerleşik Event CRM:** lead scoring, satış hattı (pipeline), no-show etiketleme, mükerrer birleştirme; HubSpot/Salesforce/Mailchimp'e push
- Katılımcı segmentasyonu, segment dışa aktarma, CRM/otomasyona devretme (handoff)
- Gelişmiş analitik: katılım, kademe, zaman çizelgesi, CSV/XLSX dışa aktarma
- **Doğrulanabilir sertifika** üretimi ve dağıtımı (bkz. Bölüm 5.1)
- Akreditasyon / CPD kredisi işleme (bkz. Bölüm 5.4)

### 3.8. SÜREKLİLİK & TOPLULUK
- Üye profilleri, bağlantılar (connections), takip/takipçi, gizlilik kontrolleri
- Dijital cüzdandaki sertifikalar üzerinden uzun vadeli marka teması
- Sürekli etkinlik akışı ve topluluk gönderileri

> **Mesaj:** *"Etkinlik tek günlük değildir. HeptaCert; keşiften kayda, kapıdan sahneye, satıştan topluluğa kadar her aşamayı yönetir."*

---

## 4. Neden Bir "Araç" Değil de "İşletim Sistemi"? — Platform Katmanı

Bir aracı işletim sisteminden ayıran şey, *üzerine inşa edilebilmesidir.* HeptaCert bu katmana sahiptir:

- **Açık API + scope'lu API anahtarları** (`/api/admin/api-keys/v2`, granüler izinler)
- **HeptaCert bir kimlik sağlayıcıdır (Identity Provider):** OAuth2 + OIDC `authorize`/`token`/`userinfo` uç noktaları, OAuth client yönetimi. Başka uygulamalar "HeptaCert ile giriş yap" diyebilir.
  - **Kanıt:** `/api/oauth/authorize`, `/api/oauth/token`, `/api/oauth/userinfo`, `oauth-clients`, `oidc_sso_api.py`
- **MCP sunucusu:** AI ajanları platformu doğal dille yönetir (Bölüm 5.3).
- **Webhook'lar (imzalı):** Olaylar dış sistemlere anında akar.
- **Entegrasyon kataloğu:** Google Sheets, Microsoft Excel, Zoom webinar, CRM'ler.
- **Çok kiracılılık + white-label:** Organizasyon izolasyonu, özel alan adı + otomatik SSL (Caddy), marka yönetimi, SSO, ekip/rol yönetimi.

> **Mesaj:** *"HeptaCert'i sadece kullanmazsınız — üstüne kurarsınız. API'si, kimlik sağlayıcısı ve AI arayüzüyle ekosistemin merkezi olur."*

---

## 5. Taç Mücevherler — Bizi Rakiplerden Ayıran Yetenekler

> Bölüm 3 *genişliği* (her şeyi yapıyoruz) anlatır. Bu bölüm *derinliği* (ve hiçbir genel araçta olmayanı) anlatır.

### 5.1. 🔐 Sahteciliğe Kapalı, Doğrulanabilir Sertifika (en güçlü tekil ayrıştırıcı)
Üç bağımsız güvenlik katmanı:
1. **Görünmez steganografik filigran** — JPEG'e dayanıklı, `HC1` sihirli başlıklı (`watermark.py`)
2. **Kriptografik PDF imzası** — X.509, pyHanko ile (`signing.py`)
3. **Herkese açık doğrulama** — `/api/verify/{uuid}` + `/api/verify-watermark`

Ek: sertifika iptali, kademe (tier) sistemi, şablon presetleri + versiyonlama + geri alma.
> *"Bir PDF'i herkes taklit edebilir. HeptaCert sertifikasını kimse edemez."*

### 5.2. 📲 Dijital Cüzdan (Apple Wallet + Google Wallet)
Sertifika/bilet telefonun cüzdanında yaşar; wallet analitiği ile etkileşim ölçülür.
> **Kanıt:** `APPLE_WALLET_*` env'leri, `member_certificates_api.py`, wallet-analytics rotaları.

### 5.3. 🤖 Agentic AI & MCP Sunucusu
AI ajanları etkinlik/katılımcı/sertifika/check-in işlemlerini doğal dille yönetir; scope sınırları, denetim izi ve yıkıcı işlemlerde zorunlu onay ile.
> **Kanıt:** `mcp_server.py`. Ayrıca anomali tespiti, haftalık AI özet, etkinlik asistanı.

### 5.4. 🏛️ Akreditasyon & CPD (Sürekli Mesleki Gelişim)
Meslek odaları/dernekler için: etkinlik bazında kredi işleme, akreditasyon kurumlarına göre raporlama, üye bazında kredi geçmişi.
> **Kanıt:** `/api/admin/accreditation/*`, `/api/admin/members/{member_id}/cpd`.

### 5.5. 📇 Yerleşik Event CRM
Lead scoring, pipeline, no-show etiketleme, mükerrer birleştirme, kurumsal CRM push.

### 5.6. 🖥️ Canlı Sunum Sistemi
AI ile sunum üretme, izleyici QR'ı, uzaktan kumanda, konuşmacı notları.

---

## 6. Hedef Kitle / İdeal Müşteri Profilleri

| Segment | Onlar için "OS" anlamı | Belirleyici özellik |
|---|---|---|
| Meslek odaları & dernekler | Üye yaşam döngüsü + mesleki kredi tek sistemde | Akreditasyon/CPD + topluluk + sertifika |
| Kongre / konferans organizatörleri | Kayıttan kapıya, sahneden rapora tek platform | Ticketing + kiosk + presentation + analitik |
| Eğitim & sertifika kurumları | Sahteciliğe kapalı belge + doğrulama | Filigran + imza + cüzdan |
| Kurumsal etkinlik ekipleri | Pazarlama yığınını birleştirme | CRM + e-posta + segmentasyon + SSO |
| Ajanslar / white-label | Kendi markasıyla tüm operasyon | Branding + özel alan adı + ekip yönetimi |

---

## 7. Rakip Karşılaştırma Çerçevesi

> Kategori genelindeki tipik durumu özetler; belirli bir rakip hakkında kesin iddia içermez.

| Boyut | Tipik etkinlik aracı | HeptaCert |
|---|---|---|
| Kapsam | Tek aşama (genelde bilet/kayıt) | Tüm yaşam döngüsü (Event OS) |
| Veri | Araçlar arası dağınık | Tek kayıt kaynağı |
| Genişletilebilirlik | Sınırlı API | Açık API + OAuth/OIDC sağlayıcı + MCP + webhook |
| Sertifika | Basit PDF / yok | Filigran + imza + genel doğrulama + iptal |
| Dijital cüzdan | Nadiren | Apple + Google Wallet |
| CRM | Harici | Yerleşik (lead scoring, pipeline) |
| AI yönetimi | Nadiren | MCP ajan + AI üretim |
| White-label + alan adı | Sınırlı | Otomatik SSL ile tam white-label |
| CPD / akreditasyon | Yok | Yerleşik |

**Savunma cümlesi:** *"Onlar etkinliğin bir parçasını yönetir; biz etkinliğin işletim sistemiyiz."*

---

## 8. Kullanıma Hazır Mesajlar

**Slogan adayları:**
- "Etkinliğinizin işletim sistemi."
- "Tek sistem. Tüm etkinlik. Kanıtlanabilir sonuç."
- "8 araç yerine 1 platform."
- "Keşiften topluluğa, kayıttan krediye — uçtan uca."

**Elevator pitch (30 saniye):**
> HeptaCert bir Etkinlik İşletim Sistemi. Bilet satışı, ödeme, kayıt, sahada check-in ve kiosk, canlı sunum, toplu e-posta, anket, çekiliş, katılımcı CRM'i ve analitik — etkinlik için kullandığınız 8 ayrı aracı tek platforma indiriyoruz; veri araçlar arasında değil, tek yerde yaşıyor. Üstüne açık API'miz, kimlik sağlayıcımız ve AI arayüzümüzle platformun üzerine inşa edebiliyorsunuz. Ve etkinlik bittiğinde katılımcıya sahteciliğe kapalı, herkesçe doğrulanabilen, telefon cüzdanına eklenebilen bir sertifika kalıyor. Meslek odaları için mesleki gelişim kredilerini de otomatik işliyoruz.

---

## 9. İtiraz Karşılama

| İtiraz | Yanıt |
|---|---|
| "Zaten Eventbrite/benzeri kullanıyoruz." | "O bir bilet aracı, bir işletim sistemi değil. Ödeme, CRM, sertifika, sunum, kiosk için kaç ayrı araç ve kaç kopyala-yapıştır kullanıyorsunuz? Biz hepsini birleştiriyoruz." |
| "Tek bir devasa araç yerine en iyi tekil araçları seçeriz (best-of-breed)." | "Anladık — bu yüzden açık API, OAuth sağlayıcı ve webhook'larımız var; istediğinizi entegre edin. Ama bilet→ödeme→check-in→CRM→sertifika arası veri akışını biz dikişsiz veriyoruz." |
| "Çok kapsamlı, kullanması zor olmasın?" | "Paket bazlı (Starter→Enterprise) açılıyor; sadece ihtiyacınız olan modülle başlarsınız, büyüdükçe açılır." |
| "Sertifikayı zaten Canva'da yapıyoruz." | "Canva görsel üretir, güvenlik ve doğrulama üretmez. Bizimki taklit edilemez ve genel bağlantıyla doğrulanır." |

---

## 10. Demo Akışı (Wow anları)

1. **"8 sekme → 1 ekran":** Aynı etkinliğin kaydı, ödemesi, check-in'i, CRM kartı ve sertifikasını tek panelde göster.
2. **Doğrulama:** Sertifika indir → QR okut → "Gerçek ✓" → PDF'i boz → "Geçersiz".
3. **Cüzdan:** Tek tıkla Apple/Google Wallet.
4. **AI:** Claude'a "gelmeyenleri etiketle ve e-posta taslağı hazırla" → MCP üzerinden çalışsın.
5. **Platform:** "HeptaCert ile giriş yap" (OAuth sağlayıcı) demosu.

---

_İlgili dosya: Sosyal medya içerik takvimi → `docs/SOSYAL_MEDYA_ICERIK.md`_
