# HeptaCert — Uluslararasılaşma & Çoklu Dil Geçiş Planı

> Hedef: **Gerçek uluslararası varlık + dil-başına organik SEO.** Çekirdek Avrupa/Amerika
> dilleri, sonra (gerekirse) Çince ve Arapça. Bu doküman; mimariyi, mevcut durumu,
> **kritik bulguları**, sayfa envanterini, sayfa-başına taşıma reçetesini, riskleri ve
> work package eşlemesini belgeler.
>
> Karar kayıtları: [ADR-0019](../adr/0019-internationalization-architecture.md) (custom i18n),
> [ADR-0021](../adr/0021-international-seo-locale-routed-ssr.md) (hibrit SSR/SEO).
> Work packages: [WP18](../work-packages/WP18-internationalization.md) (temel — büyük ölçüde teslim),
> WP28–WP31 (public taşıma — planlandı).

---

## 1. Mimari özet (hibrit)

| Yüzey | Sistem | Routing | Diller |
|-------|--------|---------|--------|
| Auth'lu app (admin/portal) | custom i18n (`src/lib/i18n.tsx`) | prefix yok | tr/en |
| Public (pazarlama/etkinlik) | **next-intl** | `/{locale}/...` SSR | tr/en/de/fr/es/it/pt/nl/ru |

**Tek çeviri kaynağı:** next-intl, custom i18n ile **aynı** `src/locales/<locale>.ts` düz-anahtar
kataloglarını okur (`src/i18n/request.ts`). Bir string bir kez çevrilir, iki yüzeyde de kullanılır.

---

## 2. Mevcut durum (TAMAMLANAN — branch `feat/i18n-public-ssr`)

- ✅ **9 dil katalogu**, her biri **490 anahtar** tam (tr, en, de, fr, es, it, pt, nl, ru).
  Marka terimleri + `{placeholder}`'lar korunmuş; `tsc` eksiksizliği `TranslationKey`'e karşı doğruluyor.
- ✅ **next-intl altyapısı:** `src/i18n/{routing,request,navigation}.ts`, `next.config.mjs` plugin,
  middleware kompozisyonu (mevcut white-label/method/legacy-token mantığı korunarak; yalnız
  locale-prefix'li yollar next-intl'e delege).
- ✅ **`app/[locale]/layout.tsx`** + pilot (`/[locale]/i18n-pilot`) — SSR i18n + metadata + hreflang kanıtlandı.
- ✅ **LanguageSwitcher** (next-intl) + **HtmlLangSetter** (istemci tarafı `<html lang>`).
- ✅ **DeepL çeviri hattı** (`scripts/i18n-translate.mjs`) — gelecekte bakım/ölçek için (şu an manuel çeviri kullanıldı).
- ✅ `next build` geçiyor (9 locale), mevcut hiçbir route bozulmadı.

---

## 3. KRİTİK BULGU — neden taşıma "hook değiştir" değil

Public sayfalar **katalog `t()` ile değil, koda gömülü `lang === "tr" ? "..." : "..."`**
ikili koşullarıyla yazılmış (ör. `_home-client.tsx`: 0 `t()` çağrısı, **19** `lang` kullanımı).
Bunun sonuçları:

1. **String çıkarımı gerekli.** Her sayfanın gömülü tr/en metinleri katalog anahtarlarına
   çıkarılmalı ve 7 yeni dile çevrilmeli (sayfa başına onlarca yeni anahtar).
2. **Paylaşılan shell custom i18n'e bağlı.** `ClientShell` (nav, footer, `LanguageToggle`)
   `useI18n` (tr/en) kullanıyor ve admin ile **ortak**. `/de` sayfasında içerik Almanca olsa
   bile menü tr/en kalır → tutarsız. **Önce locale-aware public shell gerekir.**
3. **Custom `Lang` genişletilemez.** Admin'de çok sayıda satır-içi `{ tr, en }[lang]` kopya
   haritası var; `Lang`'e dil eklemek bunları kırar (hem TS hem runtime). Bu yüzden custom
   tarafı tr/en kalır, ek diller yalnız next-intl tarafında yaşar.
4. **Çift hook.** Admin `useT` (custom), public `useTranslations` (next-intl). Anahtarlar
   ortak olduğundan çeviri çatallaşmaz, ama bileşen hangi tarafa aitse o hook'u kullanmalı.

> Özet: pages bilingual-inline yazıldığı için her sayfa **gerçek bir refactor** (çıkar → çevir →
> next-intl'e geçir → `[locale]` altına taşı → eski URL'e 301 → linkleri locale-aware yap).

---

## 4. Public sayfa envanteri (taşıma ağırlığı)

Ağırlık = gömülü koşul sayısı + alt-route + animasyon karmaşıklığı. (Gerçek i18n çoğunlukla
`_*-client.tsx` bileşenlerinde.)

| Route | Ağırlık | Alt-route | Not |
|-------|---------|-----------|-----|
| `/` (home) | **Ağır** | 8 | `_home-client.tsx` 726 satır, 19 gömülü koşul, framer-motion |
| `/events` (+ `/events/[id]` ve quiz/register/survey/status) | **Ağır** | var | Çok alt-route; detay sayfaları da i18n ister |
| `/discover` | Orta | yok | 357 satır, 7 gömülü koşul; leaf |
| `/marketplace` (+ `[event_id]`, `courses`) | Orta | var | 201 satır, 1 gömülü |
| `/organizations` (+ `[id]`) | Orta | var | Topluluk sayfaları |
| `/learning-paths` (+ `[id]`) | Orta | var | |
| `/members`, `/community`, `/post` | Orta | var | Topluluk/sosyal |
| `/verify`, `/verify/[uuid]` | Hafif-orta | var | Doğrulama (yüksek değerli, az metin) |
| `/pricing/business`, `/pricing/member` | Orta | yok | **Hardcoded** metin (katalogda yok) — çıkarım gerek |
| **Hukuki:** `/gizlilik` `/kvkk` `/iade` `/mesafeli-satis` `/kullanim-kosullari` `/iletisim` | — | yok | **Çoğu Türk pazarına özgü (KVKK = TR yasası). Uluslararasılaştırma şüpheli; MT YASAK — insan çeviri.** Muhtemelen kapsam dışı. |

---

## 5. Sayfa-başına taşıma reçetesi (tekrarlanabilir adımlar)

Her public sayfa için, sırayla:

1. **String çıkarımı:** gömülü `lang === "tr" ? A : B` → `t("yeni_anahtar")`. Yeni anahtarları
   9 katalog dosyasına ekle (tr/en kaynak metinden, 7 dile çeviri).
2. **Hook geçişi:** `useI18n()/useT()` → next-intl `useTranslations()` / `useLocale()`. Anahtarlar aynı kalır.
3. **Dosya taşıma:** `app/<route>/` → `app/[locale]/<route>/`. Alt-route'lar da taşınmalı (yoksa locale kopar).
4. **Metadata:** `generateMetadata` ile locale'e özel `title`/`description` + `hreflang` alternates + canonical.
5. **Eski URL → 301:** prefix'siz eski yol tercih edilen locale'e yönlenir (SEO/backlink korunur).
6. **Linkler:** sayfaya işaret eden iç `<Link>`'ler locale-aware (`@/i18n/navigation`).
7. **Doğrulama:** `tsc` + `next build` + her locale URL'i manuel kontrol.

---

## 6. Faz / sıra (her biri bir work package)

**Önce paylaşılan shell** — tüm sayfaların ön-koşulu; o olmadan her sayfada menü tutarsız.

| Sıra | WP | İş |
|------|----|----|
| 1 | **WP28** | **Localized public shell** — `[locale]` için next-intl nav/footer/LanguageSwitcher; admin shell'inden ayrık |
| 2 | **WP29** | **Sayfa-başına taşıma** — §5 reçetesiyle, ağırlık sırası: discover → marketplace → organizations → learning-paths → events → home (en ağır en sona) |
| 3 | **WP30** | **Uluslararası SEO mekaniği** — locale'li `sitemap.ts`, `hreflang`, SSR `<html lang>`, canonical, eski-URL 301 standardı |
| 4 | **WP31** | **İçerik i18n** — organizatör verisi (etkinlik adı/açıklama, e-posta, sertifika) `Event.config.i18n` JSONB + public okuma yolları + cache anahtarına locale |

---

## 7. Riskler & kararlar

- **Canlı site:** Tüm iş `feat/i18n-public-ssr` branch'inde; main'e ancak build + manuel test sonrası merge. Prod korunur.
- **URL göçü:** Eski prefix'siz public URL'ler 301 ile locale'liye taşınır — backlink/SEO değeri korunur, ama mevcut paylaşılmış linkler yönlendirilir.
- **Alt-route bütünlüğü:** Bir liste sayfası taşınırken detay/alt sayfaları da taşınmalı; yoksa kullanıcı dilini kaybeder.
- **Duplicate content:** Çevirisi olmayan dilde URL açma → SEO cezası. Kural: bir locale yalnız katalogu tamamsa `routing.locales`'e eklenir (şu an 9'u tam).
- **Hukuki sayfalar:** KVKK/şartlar TR pazarına özgü + MT'ye bırakılamaz → muhtemelen kapsam dışı; gerekiyorsa profesyonel/insan çeviri.
- **Çeviri kalitesi:** 9 katalog elle çevrildi; öncelikli diller native-review önerilir. DeepL hattı (WP18) gelecekte yeni anahtarları otomatik çevirebilir.
- **RTL (Arapça/İbranice):** Eklenirse ayrı layout workstream (`dir="rtl"` + logical CSS) — şu an kapsam dışı.

---

## 8. Kapsam dışı (bilinçli)

- Native mobil app, native sanal sahne (FEATURE_ROADMAP_2026 Faz 4).
- Hukuki sayfaların MT çevirisi.
- RTL dilleri (ileride ayrı workstream).
- Lokalize URL slug'ları (`/de/preise` gibi) — ilk turda slug'lar ortak kalır; ileride next-intl `pathnames` ile.

---
_Son güncelleme: 2026-06-30 · Next 15.5 App Router · 9 katalog + altyapı hazır (branch); public taşıma WP28–WP31 ile planlandı._
