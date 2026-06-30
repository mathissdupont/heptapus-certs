# HeptaCert — Özellik Yol Haritası (Rakip Boşluğu Kapatma)

> Amaç: HeptaCert'i Cvent / Bizzabo / Swapcard / Whova / Eventbrite karşısında
> rekabetçi kılan eksikleri, **sistemi karmaşıklaştırmadan** ve her etkinlik-bazlı
> özelliği **etkinlik ayarlarından aç/kapa** edilebilir biçimde eklemek.
>
> İşaretleme: ✅ Doğrulanmış mevcut · ❌ Doğrulanmış eksik · 🟡 Kısmi/kabuk.
> Şiddet/efor analizi `docs/reference` rakip-boşluğu çalışmasına dayanır.

---

## 0. Üç Tasarım İlkesi (değişmez)

1. **Tek sözleşme — her etkinlik özelliği aynı şekilde eklenir.** Yeni özellik =
   - `models.py` → `Event.<x>_enabled` boolean kolonu (+ Alembic migration),
   - `event_features.py` → `FEATURE_DEFAULTS["<x>_enabled"]` + `is_<x>_enabled()` helper,
   - `plan_policy.py` → bir `FeaturePolicy` (hangi abonelik planında açık + TR/EN etiket),
   - Etkinlik Ayarları UI'da **tek toggle**.

   Bu desen **zaten var** (`event_features.py`, migration 038). Tüm yeni işler buna
   uyacak — böylece "sistem büyüdükçe karışmaz".

2. **İki katmanlı kapı.** Bir özellik katılımcıya yalnızca **iki şart** sağlanınca görünür:
   `plan izin veriyor (org)` **VE** `admin bu etkinlikte açtı (event)`. Plan kapısı
   ticari, event toggle'ı operasyonel. İkisi `event_features.py` + `plan_policy.py`
   dışında hiçbir yere dağılmaz.

3. **Etkinlik tipi ön-ayarı = sadeliğin anahtarı.** Admin 20 toggle görmez. `event_type`
   (`certificate_event`, `seminar`, `workshop`, `conference`, `concert`, `training`,
   `club_event`, `online_event`, `custom` — zaten mevcut) seçilince **mantıklı bir
   varsayılan set** otomatik açılır; "Gelişmiş" sekmesinde tek tek değiştirilebilir.
   Karmaşıklık varsayılan olarak gizli, isteyene açık.

---

## 1. Etkinlik Tipi → Varsayılan Özellik Setleri (önce bu yapılmalı)

Yeni hiçbir özellik eklemeden, **mevcut bayrakları** etkinlik tipine göre ön-ayarlayan
bir harita. Admin deneyimini anında sadeleştirir; sonraki tüm fazların temeli.

| event_type | Önerilen açık varsayılanlar |
|---|---|
| certificate_event | certificate, registration, checkin |
| conference | registration, checkin, sessions(agenda), speakers, ticketing |
| workshop / training | registration, checkin, certificate, quiz, cpd |
| concert | ticketing, registration, checkin |
| club_event | registration, checkin, gamification |
| online_event | registration, sessions, (virtual link) |

**İş:** `event_features.py` içine `PRESET_BY_EVENT_TYPE: dict[str, dict[str,bool]]` +
etkinlik oluşturma/tip değiştirmede uygulanması. **Efor: Düşük.** Risk: yok (mevcut alanlar).

---

## 2. Çoklu Dil / i18n (KULLANICI ÖNCELİĞİ — kesişen iş, toggle değil)

i18n bir "özellik toggle'ı" değil, **altyapı**. İki ayrı eksen, karıştırılmamalı:

### 2a. Ürün arayüzü dili (frontend statik metinler)
- **Yaklaşım:** `next-intl` veya `next-i18next` ile mesaj sözlükleri (`tr`, `en` başlangıç).
- Tüm hardcoded string'ler `t("key")` ile dışarı alınır; sözlük dosyaları `locales/`.
- Dil seçimi: kullanıcı tercihi + tarayıcı `Accept-Language` fallback.
- **Efor: Orta-Yüksek** (string çıkarımı geniş ama mekanik).

### 2b. Müşteri içeriği çok-dilliliği (admin'in girdiği etkinlik adı/açıklama, e-posta şablonu, sertifika metni)
- **Yaklaşım:** çevrilebilir alanlar `JSONB` ile `{"tr": "...", "en": "..."}` saklanır
  (mevcut `Event.config`/`email_templates` JSONB deseniyle uyumlu).
- Katılımcı sayfası `?lang=` / profile diline göre doğru varyantı seçer; eksikse varsayılan dile düşer.
- E-posta şablonları zaten Jinja2 (sandboxed) — dil bazlı şablon seçimi eklenir.
- **Efor: Orta.**

> **Sıra önerisi:** Önce 2a (arayüz tr/en) — en görünür uluslararası satış engelini kaldırır.
> 2b ardından, çevrilebilir alan başına aşamalı. Yeni dil eklemek = yalnızca sözlük dosyası.

---

## 3. Faz Planı (rakip boşlukları)

Her satır tek sözleşmeye uyar: **Event toggle + FeaturePolicy + helper**. Sıra
**düşük efor / yüksek getiri** önceliğine göre.

### Faz 1 — Hızlı kazanımlar (düşük efor, doğrudan getiri)
| Özellik | Durum | Toggle alanı | Plan kapısı | Efor |
|---|---|---|---|---|
| **Promosyon/indirim kodu** ❌ | yok | `promo_codes_enabled` | pro+ | Düşük |
| **Kişisel ajanda + oturum kapasitesi/rezervasyon** 🟡 | session var, "my schedule"/kapasite yok | `agenda_enabled` | tümü | Orta |
| **Gamification'ı gerçekten doldur** 🟡 | bayrak var, arkası boş | (mevcut `gamification_enabled`) | growth+ | Düşük-Orta |

> Gamification bayrağı zaten mevcut ama implementasyon yok — leaderboard/puan/rozet-kuralı
> eklenince "boş kabuk" kapanır, yeni migration gerekmez.

### Faz 2 — Farklılaştırıcılar (kimlikle uyumlu, rakipte pahalı)
| Özellik | Durum | Toggle alanı | Plan kapısı | Efor |
|---|---|---|---|---|
| **Speaker portal + Call-for-Papers / abstract inceleme** ❌ | `abstract` geçiyor, akış yok | `cfp_enabled` | growth+ | Orta |
| **Randevu / 1:1 toplantı planlama (matchmaking temeli)** ❌ | `connections_api` sadece takip grafiği | `networking_meetings_enabled` | growth+ | Yüksek |
| **Canlı katılım: oturum-içi Q&A + canlı poll** ❌ | quiz/survey async var | `live_engagement_enabled` | pro+ | Orta |

> Networking: `connections_api`'nin takip/blok grafiği temel; üstüne takvim + slot +
> 1:1 talep/onay eklenir. AI eşleştirme sonraya bırakılabilir (önce manuel/etiket bazlı).

### Faz 3 — Yüz yüze / fuar operasyonu (orta efor)
| Özellik | Durum | Toggle alanı | Plan kapısı | Efor |
|---|---|---|---|---|
| **Exhibitor / stand yönetimi + lead retrieval** ❌ | yok (lead-forms var) | `exhibitors_enabled` | growth+ | Yüksek |
| **Fiziksel badge tasarım + on-site yazdırma** ❌ | check-in/kiosk var | `badge_print_enabled` | pro+ | Orta |
| **Salon/koltuk planı (seating)** ❌ | yok | `seating_enabled` | growth+ | Orta |

### Faz 4 — Stratejik karar gerektiren ağır yatırımlar (segment netleşmeden başlama)
| Özellik | Durum | Not |
|---|---|---|
| **Native mobil uygulama (iOS/Android push)** ❌ | web-only; FCM/APNS yok | Çok yüksek efor. Önce **PWA + web-push** ara adımı değerlendirilebilir. |
| **Native sanal/hibrit sahne (stream/breakout/sanal stand)** ❌ | Zoom/Teams sadece yoklama içe-aktarımı | Çok yüksek efor; harici stream + embed ile hafif başlanabilir. |

---

## 4. Kapsam Dışı (bilinçli — Cvent "her şey" tuzağına düşmemek için)

- **Venue sourcing / RFP marketplace** — Cvent kurumsal çekirdeği; niş, ağır, ROI düşük.
- **Seyahat & otel blok yönetimi** — niş; gerekiyorsa harici entegrasyon.
- **Bütçe/harcama/etkinlik finansmanı modülü** — muhasebe entegrasyonuyla çözülebilir.

> Gerekçe: HeptaCert'in avantajı **odak** (sertifikasyon + CRM + CPD). Bu modüller
> sistemi ağırlaştırır, ilkemiz #3'e (sadelik) aykırı. İhtiyaç doğarsa yeniden değerlendirilir.

---

## 5. Önerilen Uygulama Sırası (tek geliştirici / tek sunucu gerçeğine göre)

1. **Etkinlik tipi ön-ayarları** (Bölüm 1) — sadeliğin temeli, düşük efor.
2. **i18n 2a** (arayüz tr/en) — uluslararası satış engelini kaldırır.
3. **Promosyon kodu** (Faz 1) — hızlı ticari getiri.
4. **Kişisel ajanda + oturum kapasitesi** (Faz 1) — katılımcı deneyimi.
5. **Speaker/CFP** (Faz 2) — kimlikle en uyumlu farklılaştırıcı.
6. **i18n 2b** (içerik çok-dilliliği) + **Randevu/matchmaking** (Faz 2).
7. Faz 3 (fuar) ve Faz 4 (mobil/sanal) — segment kararından sonra.

---

## 6. Tamamlanma Tanımı (her özellik için kontrol listesi)

- [ ] `Event.<x>_enabled` kolonu + Alembic migration (varsayılan **kapalı** — yeni gelişmiş özellikler eski etkinlikleri değiştirmez).
- [ ] `event_features.py`: `FEATURE_DEFAULTS` + `is_<x>_enabled()` helper.
- [ ] `plan_policy.py`: `FeaturePolicy` (plan listesi + TR/EN etiket).
- [ ] Etkinlik tipi ön-ayar haritasına dahil (uygunsa).
- [ ] Etkinlik Ayarları UI: tek toggle (plan kapalıysa "yükselt" durumu).
- [ ] Katılımcı/public yüzeyi yalnızca **plan VE event** açıkken render eder.
- [ ] i18n: yeni kullanıcı-yüzü metinler `t()` ile; çevrilebilir alanlar JSONB.
- [ ] Test: yetki/tenant izolasyonu + toggle kapalıyken 404/gizli.

---
_Oluşturma: 2026-06-30 · Mevcut mimari (`event_features.py` migration 038, `plan_policy.py`) üzerine kuruldu._
