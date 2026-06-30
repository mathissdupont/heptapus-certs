# HeptaCert — Uluslararasılaşma & Çoklu Dil Geçiş Planı

> Hedef: **Gerçek uluslararası varlık + dil-başına organik SEO.** Çok sayıda Avrupa/Amerika
> dili, sonra Çince, gerekirse Arapça. Bu doküman; mimariyi, SEO mekaniğini, çeviri hattını
> ve fazlı geçişi belgeler. Karar kaydı: [ADR-0021](../adr/0021-international-seo-locale-routed-ssr.md)
> ([ADR-0019](../adr/0019-internationalization-architecture.md)'u SEO yönünde rafine eder).

## 0. Neden mevcut custom i18n tek başına yetmiyor (net)

Mevcut sistem `localStorage` + istemci tarafı. Google **tek URL** görür ve onu **tek dilde**
(varsayılan) render edilmiş HTML olarak indeksler. Dil-başına SEO için şart olanlar — ayrı
URL (`/de/...`), sunucuda dile-özel HTML, `hreflang`, dile-özel `<title>`/`description`,
sitemap — istemci tarafı toggle ile **üretilemez**. Bu yüzden public yüzeylerde SSR i18n
(next-intl) gerekiyor. Auth'lu panelde SEO değeri olmadığından orada custom kalır.

## 1. Mimari: Hibrit (yüzeye göre ayrım)

| Yüzey | Sistem | Routing | Neden |
|-------|--------|---------|-------|
| Public/pazarlama/etkinlik | **next-intl** | `/{locale}/...` (SSR) | SEO buradan gelir |
| Auth'lu app (admin/portal/checkout/auth) | **custom i18n** (mevcut) | prefix yok | SEO yok; 130+ dosya korunur |

**Sınır:** `app/[locale]/(public)/...` altına yalnızca public route grupları taşınır
(`events`, `marketplace`, `discover`, `community`, `pricing`, `developers`,
`learning-paths`, public member/profile, anasayfa, hukuki sayfalar). Admin/portal/auth
mevcut `I18nProvider` ile prefix'siz kalır. İki sistem **tek ortak temel katalog** ve
çeviri hattını paylaşır → string'ler çatallaşmaz.

## 2. SEO mekaniği (public yüzeyde teslim edilecekler)

- **URL stratejisi:** locale-prefixed path (`/tr/...`, `/en/...`, `/de/...`). Varsayılan
  dil (tr) için strateji: `as-needed` yerine **her zaman prefix** (tutarlı canonical + net
  hreflang). next-intl middleware yönlendirir.
- **hreflang alternates:** her sayfa `generateMetadata` → `alternates.languages` ile tüm
  dil varyantlarını + `x-default` bildirir.
- **Dile-özel metadata:** `<title>`, `description`, OpenGraph her locale için katalogdan.
- **`<html lang>`** locale'e göre; **canonical** locale'li URL.
- **Sitemap:** `sitemap.ts` her public URL'i × her locale + hreflang ile üretir.
- **robots.ts** locale yollarını engellemez; eski prefix'siz URL'ler için 301 → tercih
  edilen locale.

## 3. İçerik i18n (organizatör verisi) — ADR-0019 18b

UI string'lerinden ayrı: etkinlik adı/açıklama, e-posta şablonu, sertifika metni.
- **Saklama:** `Event.config` JSONB → `config.i18n.<field> = {"tr":..,"en":..,"de":..}`
  (migration yok). E-posta şablonları zaten JSONB.
- **Çözümleme:** tek `resolve_i18n(map, locale, fallback)` helper; eksik dil → temel değere
  düşer. Public okuma yolları (`get_public_event_detail`, `public_event_info`,
  `list_public_events`) locale'e göre çözer.
- **Cache:** cached liste (`_pe_cache_key`) anahtarına **locale eklenir** (yanlış dil
  servis etmemek için — kritik).

## 4. Çeviri hattı (490 anahtar × N dil = ölçek sorunu)

Elle çeviri ölçeklenmez. **Makine çevirisi + insan revizyonu** hattı:
- **Tek doğru kaynak:** temel katalog = **İngilizce** (MT kalitesi en→X en yüksek). TR de
  birinci sınıf (mevcut). 
- **Pipeline:** `scripts/i18n-translate.ts` → temel katalogu okur, **DeepL API** (AB
  dilleri + ZH + AR'de güçlü) ile hedef dillere çevirir, `src/locales/<lang>.ts` yazar,
  her değere `// MT — needs review` işareti koyar. Var olan insan-onaylı çeviriyi ezmez
  (idempotent: yalnız eksik/işaretli anahtarları çevirir).
- **Fallback zinciri** (kodda hazır): aktif dil → İngilizce → Türkçe → anahtar. Yani bir
  dil %100 çevrilmeden de site kırılmadan çalışır.
- **Kalite:** öncelikli diller (de/fr/es/nl/ru) insan revizyonu; gerisi MT + topluluk
  düzeltmesi. Hukuki sayfalar (KVKK vb.) **mutlaka** profesyonel/insan çeviri — MT yeterli değil.

## 5. Dil yayılımı (kademeli)

| Tier | Diller | Not |
|------|--------|-----|
| **Tier 0 (mevcut)** | tr, en | Hazır |
| **Tier 1 (lansman)** | de, fr, es, nl, ru, it, pt | Latin/Kiril; çekirdek AB + Amerika (es/pt) |
| **Tier 2** | pl, sv, da, fi, no, cs, el, ro, hu, uk, pt-BR | AB geneli + Brezilya |
| **Tier 3** | zh (中文), ja, ko | CJK; layout/yazı tipi testi gerek |
| **Tier 4 (RTL — ayrı iş)** | ar, he | `dir="rtl"` + logical CSS + ikon/yön çevirme |

> "Tüm Avrupa+Amerika dilleri" pratikte Tier 1–2 ile karşılanır (Amerika kıtası ağırlıkla
> en/es/pt/fr). CJK Tier 3. Arapça (RTL) bilinçli olarak ayrı faz — layout işi büyük.

## 6. Fazlar (efor sırası)

1. **Faz A — Altyapı (motor hazır ✅):** custom i18n N-dile genelleştirildi (registry,
   fallback zinciri aktif→en→tr→key, tarayıcı-dili tespiti, 3+ dilde dropdown). *(Bu commit.)*
2. **Faz B — next-intl + locale routing (public iskelet):** next-intl kur, `[locale]`
   segmenti + middleware, public route gruplarını `app/[locale]/(public)/` altına taşı,
   eski URL'lere 301. Henüz tr/en.
3. **Faz C — SEO mekaniği:** dile-özel `generateMetadata` + hreflang + canonical +
   `<html lang>` + locale'li `sitemap.ts`. Lighthouse/Search Console doğrulama.
4. **Faz D — Çeviri hattı:** DeepL pipeline script + temel katalog (en) + Tier 1 dilleri
   üret, öncelikli dilleri revize et.
5. **Faz E — İçerik i18n (18b):** `resolve_i18n` helper + `Event.config.i18n` + public
   okuma yolları + cache anahtarına locale + admin çeviri girişi UI.
6. **Faz F — Tier 2/3 diller + RTL (ayrı):** kademeli dil ekleme; Arapça için RTL workstream.

## 7. Riskler & kararlar

- **Coexistence netliği:** bir ekran ya `[locale]` (next-intl) ya da custom — route grubu
  sınırı bunu belirler. Karışıklık riskini sınır mimarisi kapatır.
- **MT maliyeti/kalitesi:** DeepL API ücretli; hacim = 490 × dil. Hukuki metinler MT'ye
  bırakılmaz. Karar: API bütçesi + öncelikli dil revizyonu.
- **URL göçü:** mevcut prefix'siz public URL'ler → 301; backlink/SEO değeri korunur.
- **RTL:** Arapça layout işi büyük; ayrı faz, ayrı QA.

## 8. Onay gereken kararlar (uygulamadan önce)

1. **Hibrit kapsam** onayı: public→next-intl, admin→custom (önerilen) — yoksa tam göç mü?
2. **Dil tier listesi**: Tier 1 = de/fr/es/nl/ru/it/pt yeterli mi? CJK/Arapça ne zaman?
3. **Çeviri hattı**: DeepL API (önerilen) onayı + bütçe; hukuki metinler için insan çeviri.

---
_Oluşturma: 2026-06-30 · Mevcut: Next 15.5 App Router, custom i18n (490 anahtar, tr/en). Faz A motoru bu turda hazır._
