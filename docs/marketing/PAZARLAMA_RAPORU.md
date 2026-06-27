# HeptaCert — Pazarlama Yetkilisi Satış Destek Raporu (Enablement)

> Hazırlık tarihi: 2026-06-24
> Hazırlayan kaynak: Kod tabanı taraması (`.codesight/CODESIGHT.md`, `wiki/`, backend kaynak dosyaları, `featureMetadata.ts`, `plan_policy.py`, arayüz bileşen envanteri)
> Hedef okuyucu: Pazarlama / satış yetkilisi (teknik olmayan)
> Kapsam dışı: LMS modülü (arşivlenmiş — `_archive_lms`). Bu raporda LMS bir pazarlama vaadi olarak kullanılmaz.

**Bu rapor üç soruya cevap verir:**
1. **Neyi pazarlayabiliriz?** → Bölüm 2 (özellik envanteri) ve Bölüm 4 (dikey pazarlar)
2. **Kime, hangi mesajla?** → Bölüm 3 (kişiler) ve Bölüm 5 (mesaj mimarisi)
3. **Hangi sorularla karşılaşırız, ne deriz?** → Bölüm 7 (SSS & itiraz kataloğu) — en uzun bölüm

> ⚠️ **Önemli:** Bölüm 9'daki "Söylenebilir / Söylenemez" kılavuzunu okumadan kampanya yayınlamayın. Org politikası gereği var olmayan müşteri/ortaklık/sertifikasyon iddiası yasaktır; yasal uyum iddiaları hukuki onay gerektirir.

---

## 1. Yönetici Özeti — HeptaCert Nedir?

**HeptaCert bir Etkinlik İşletim Sistemidir (Event OS).** Etkinliğin tüm yaşam döngüsünü — keşif, kayıt, ödeme, sahada operasyon, etkileşim, etkinlik sonrası ilişki yönetimi ve doğrulanabilir sertifika — tek platformda toplar.

**Ölçek (somut kanıt):** 715 API rotası · 157 veri modeli · 247 arayüz bileşeni. Bu, bir "sertifika aracı" değil, bir platform ölçeğidir.

**Bir cümlelik satış mesajı:**
> "Etkinlik için kullandığınız 8 ayrı aracı tek platforma indirin — ve katılımcıya sahteciliğe kapalı, ömür boyu doğrulanabilir bir belge bırakın."

**En güçlü 3 ayrıştırıcı:**
1. **Sahteciliğe kapalı, doğrulanabilir sertifika** (görünmez filigran + kriptografik imza + genel doğrulama)
2. **Uçtan uca tek platform** (8 ayrı aracın yerini alır)
3. **Yapay zekâ ile yönetim** (MCP ajan arayüzü + AI içerik üretimi)

---

## 2. Pazarlanabilir Özellik Envanteri (Ne Pazarlayabiliriz?)

> Her satır kodda doğrulanmıştır. "Plan" sütunu hangi pakette satılabileceğini gösterir (`featureMetadata.ts` / `plan_policy.py`). Pazarlama açısı = reklam/landing'de kullanılacak kanca.

### 2.1. Sertifika & Belge (Çekirdek farklılaştırıcı)

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Görünmez steganografik filigran | "Taklit edilemez sertifika" | Tüm planlar (üretim) |
| Kriptografik PDF imzası | "Belgeniz değiştirilirse anında belli olur" | Tüm planlar |
| Herkese açık doğrulama (QR/link) | "İşveren 5 saniyede doğrular" | Starter dahil (doğrulama ücretsiz) |
| Toplu sertifika üretimi | "Binlerce sertifika tek tıkla" | Pro+ |
| Sertifika şablon kütüphanesi + versiyonlama + geri alma | "Markaya uygun şablon, hata olursa eski sürüme dön" | Growth+ |
| Sertifika kademeleri (tier) | "Katılıma göre farklı sertifika otomatik" | Pro+ |
| Sertifika iptali (revocation) | "Yanlış verilen belgeyi geri çek" | Tüm planlar |
| Apple Wallet + Google Wallet | "Sertifika telefonun cüzdanında" | Tüm planlar |
| Watermark/PDF doğrulama uç noktaları | "Programatik doğrulama (API)" | Growth+ (API) |

### 2.2. Etkinlik Operasyonu

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Etkinlik oluşturma, oturum (session) yönetimi | "Çok oturumlu etkinlikleri yönet" | Tüm planlar |
| Çoklu bilet türü + kapasite | "Erken kuş, VIP, ücretsiz — hepsi bir arada" | Pro+ |
| Özel kayıt formları | "Hangi bilgiyi soracağına sen karar ver" | Pro+ |
| QR check-in | "Kapıda kuyruk yok" | Pro+ |
| Kiosk modu | "Self-servis giriş standı" | Enterprise |
| Gerçek zamanlı check-in akışı (canlı) | "Salon dolarken canlı sayaç" | Pro+ |
| Katılımcı içe aktarma (CSV/Excel) | "Mevcut listeni 1 dakikada aktar" | Pro+ |
| Yoklama (attendance) + dışa aktarma | "Kim geldi, kim gelmedi — raporla" | Pro+ |
| Mekân & rezervasyon + Google Calendar + .ics | "Salon çakışmasını önle" | Enterprise |

### 2.3. Etkileşim & Gamifikasyon

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Anketler (survey) | "Etkinlik sonrası geri bildirim topla" | Tüm planlar |
| Quiz / sınav + sertifika bağlama | "Sınavı geçen sertifikayı otomatik alsın" | Tüm planlar |
| Çekilişler (raffle) + denetimli çekim | "Şeffaf, denetlenebilir çekiliş" | Growth+ |
| Rozetler (badges) / gamifikasyon | "Katılımı oyunlaştır" | Pro+ |
| Sponsor vitrinleri | "Sponsoruna görünürlük sat" | Pro+ |
| Etkinlik yorumları / topluluk | "Katılımcılar etkileşsin" | Tüm planlar |

### 2.4. İletişim & Pazarlama Otomasyonu

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Toplu e-posta + şablonlar | "Tüm katılımcılara tek tıkla" | Growth+ |
| Zamanlanmış e-posta | "Etkinlikten 1 gün önce otomatik hatırlatma" | Growth+ |
| Açılma / tıklama takibi + teslimat logları | "E-postan açıldı mı, gör" | Growth+ |
| Otomasyon kuralları (koşullu iş akışı) | "X olursa Y yap — elle uğraşma" | Growth+ |
| AI ile e-posta metni üretimi | "Metni yapay zekâ yazsın" | Growth+ |
| AI ile form üretimi | "Formu cümleyle tarif et, AI kursun" | Growth+ |
| Katılımcı segmentasyonu | "Doğru mesajı doğru kişiye" | Growth+ |

### 2.5. Etkinlik CRM & Satış (Etkinlik sonrası değer)

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Yerleşik Event CRM (hesap/kişi/fırsat) | "Katılımcı listesi değil, satış hattı" | Enterprise |
| Lead scoring (puanlama) | "En sıcak lead'i otomatik bul" | Enterprise |
| Satış hattı (pipeline) | "Fırsatları aşamalara göre yönet" | Enterprise |
| E-posta dizileri (sequences/drip) | "Otomatik takip e-postaları" | Enterprise |
| No-show otomatik etiketleme | "Gelmeyenleri ayrı işle" | Enterprise |
| Mükerrer kayıt birleştirme | "Temiz veri" | Enterprise |
| HubSpot / Salesforce / Mailchimp push | "Var olan CRM'ine de gönder" | Enterprise |
| Lead formları (builder) | "Web sitende lead topla" | Enterprise |

### 2.6. Sunum (Presentation)

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Sunum yükleme / AI ile üretme | "Slaytı AI hazırlasın" | Growth+ |
| Sunucu (presenter) modu + notlar | "Konuşmacı notları yanında" | Growth+ |
| İzleyici için uzaktan QR | "Salon slaytı telefonundan takip etsin" | Growth+ |
| Ayrı uzaktan kumanda ekranı | "Telefonla slayt geç" | Growth+ |
| Sunum güvenliği ayarları | "Slaytı kimse indiremesin" | Growth+ |

### 2.7. Kurumsal Eğitim Uyumluluğu (Training Compliance)

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Eğitim atamaları + departman filtreleri | "Hangi departman hangi eğitimi aldı" | Enterprise |
| Toplu atama + tekrarlayan kurallar | "Yıllık zorunlu eğitimi otomatik ata" | Enterprise |
| Yenileme önerileri + bildirimleri | "Süresi dolan sertifikayı hatırlat" | Enterprise |
| Uyumluluk raporu + dışa aktarma | "Denetime hazır rapor" | Enterprise |

### 2.8. Akreditasyon & CPD (Mesleki Gelişim)

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Akreditasyon kurumu tanımı | "Akredite kurumlarla uyumlu" | Enterprise |
| Etkinlik bazında CPD kredi yapılandırması | "Her etkinliğe kredi tanımla" | Enterprise |
| Üye bazında CPD kredi geçmişi | "Üyenin tüm kredisi tek yerde" | Enterprise |
| CPD özet & raporlama | "Krediyi sistem saysın, Excel değil" | Enterprise |

### 2.9. Platform & Genişletilebilirlik (Neden bir "OS")

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| Açık API + scope'lu API anahtarları | "Kendi sistemlerinle entegre et" | Growth+ |
| OAuth2 / OIDC kimlik sağlayıcı ("HeptaCert ile giriş") | "Diğer uygulamalar HeptaCert ile giriş yapsın" | Enterprise (SSO) |
| MCP sunucusu (AI ajan arayüzü) | "Etkinliği yapay zekâ ile yönet" | Growth+ (API) |
| Webhook'lar (imzalı) | "Olaylar dış sisteme aksın" | Growth+ |
| Entegrasyon kataloğu (Sheets, Excel, Zoom) | "Sevdiğin araçlara bağlan" | Enterprise |
| Geliştirici portalı | "Developer dokümantasyonu hazır" | Growth+ |

### 2.10. Marka, Çok Kiracılılık & Topluluk

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| White-label marka yönetimi (logo/renk) | "Kendi markan görünsün" | Growth+ |
| Özel alan adı + otomatik SSL | "events.markan.com" | Growth+ |
| Organizasyon ekibi & rol yönetimi | "Ekip üyelerine yetki ver" | Enterprise |
| SSO (kurumsal giriş) | "Şirket hesabıyla giriş" | Enterprise |
| Halka açık etkinlik marketplace'i | "Etkinliğin keşfedilsin" | Tüm planlar |
| Üye profilleri + takip + bağlantılar | "Katılımcı topluluğu kur" | Tüm planlar |
| Topluluk akışı (gönderi/yorum/oylama) | "Etkinlik sonrası etkileşim devam etsin" | Tüm planlar |
| Üye portalı (takvim, etkinliklerim) | "Katılımcının kişisel paneli" | Tüm planlar |

### 2.11. Güvenlik, Uyumluluk & Yönetim

| Özellik | Pazarlama açısı | Plan |
|---|---|---|
| 2FA (TOTP + yedek kodlar) | "Hesap güvenliği üst düzey" | Tüm planlar |
| Denetim günlükleri + güvenlik olayları | "Kim ne yaptı, kayıtlı" | Enterprise |
| KVKK/GDPR araçları (veri dışa aktarma & silme, onay kaydı) | "Veri haklarını destekleyen araçlar" | Tüm planlar |
| Yerleşik Türkçe yasal sayfalar (KVKK, gizlilik, mesafeli satış, iade, açık rıza) | "Yasal sayfalar hazır gelir" | Tüm planlar |
| Yerleşik ödeme (iyzico) + abonelik + HeptaCoin | "Türkiye'ye uygun ödeme" | Pro+ |
| Platform sağlığı / gözlemlenebilirlik | "Sistem durumu şeffaf" | Enterprise |
| In-app AI asistan + komut paleti + tur rehberi | "Öğrenmesi kolay arayüz" | Tüm planlar |

> **Not:** Plan eşlemeleri kod tabanındaki mevcut politikayı yansıtır; ticari paketleme kararı değişebilir. Kampanyada plan vaadi vermeden önce güncel `plan_policy.py` / fiyatlandırma sayfasını teyit edin.

---

## 3. Hedef Kişiler (Personas) ve Acı Noktaları

| Kişi | Kim | En büyük acısı | HeptaCert'in cevabı | İlk satılacak özellik |
|---|---|---|---|---|
| **Dernek/Oda Yöneticisi** | Meslek odası, dernek genel sekreteri | Üye kredisi & sertifika kaosu, Excel | CPD + doğrulanabilir sertifika + topluluk | Akreditasyon/CPD modülü |
| **Kongre Organizatörü** | Konferans/fuar düzenleyen | 8 ayrı araç, kapıda kaos | Tek platform + kiosk + canlı check-in | Ticketing + check-in |
| **Eğitim Kurumu Sahibi** | Kurs/sertifika programı | Sahte sertifika, doğrulama zorluğu | Filigran + imza + genel doğrulama | Güvenli sertifika |
| **Kurumsal Etkinlik/Pazarlama Müdürü** | Şirket içi/dışı etkinlik ekibi | Lead'ler kayboluyor, ROI ölçülemiyor | Event CRM + segmentasyon + analitik | CRM + e-posta |
| **Ajans / White-label Kullanıcı** | Müşterisine etkinlik hizmeti veren | Marka tutarsızlığı, çoklu hesap | Branding + özel alan adı + ekip | White-label paket |
| **İK / Eğitim Sorumlusu (kurumsal)** | Zorunlu eğitim takibi | "Kim eğitimi aldı?" belirsizliği | Eğitim uyumluluğu + yenileme | Training compliance |

---

## 4. Dikey Pazarlar ve Kullanım Senaryoları (Nereleri Pazarlayabiliriz?)

### 4.1. Meslek Odaları & Dernekler (EN GÜÇLÜ DİKEY)
- **Neden:** CPD/akreditasyon + üye topluluğu + doğrulanabilir belge kombinasyonu burada eşsiz.
- **Senaryo:** Bir mühendis odası, üyelerine düzenlediği seminerlerde otomatik CPD kredisi işler, üye profilinde kredi geçmişini gösterir, dönem sonunda akreditasyon raporu çıkarır.
- **Kanca:** "Üyelerinizin mesleki gelişimini Excel'de değil, sistemde yönetin."

### 4.2. Kongre, Konferans, Fuar Organizatörleri
- **Senaryo:** Çok oturumlu bir kongre — biletleme, oturum bazlı QR check-in, kiosk girişi, canlı sunum kontrolü, etkinlik sonrası katılım sertifikası ve anket, hepsi tek panelden.
- **Kanca:** "Kayıttan kapıya, sahneden sertifikaya — tek ekran."

### 4.3. Eğitim & Sertifikasyon Kurumları
- **Senaryo:** Bir eğitim kurumu, kursu bitiren katılımcıya sınav (quiz) sonucu başarılıysa otomatik, sahteciliğe kapalı sertifika verir; işverenler QR ile doğrular.
- **Kanca:** "Sertifikanız bir PDF değil, kanıtlanabilir bir kimlik bilgisi."

### 4.4. Kurumsal Etkinlik & Pazarlama Ekipleri
- **Senaryo:** Bir yazılım şirketi webinar düzenler (Zoom import), katılımcıları lead scoring ile puanlar, sıcak lead'leri Salesforce'a push eder, e-posta dizisiyle takip eder.
- **Kanca:** "Etkinliğiniz bir maliyet kalemi değil, bir satış hattı olsun."

### 4.5. Ajanslar (White-label)
- **Senaryo:** Bir etkinlik ajansı, her müşterisi için kendi alan adı ve markasıyla izole bir ortam sunar; ekip üyelerine rol verir.
- **Kanca:** "Müşteriniz HeptaCert'i değil, sizi görür."

### 4.6. Kurumsal İK / Uyumluluk
- **Senaryo:** Bir fabrika, yıllık zorunlu İSG eğitimlerini departmanlara otomatik atar, süresi dolanları hatırlatır, denetime hazır uyumluluk raporu çıkarır.
- **Kanca:** "Denetçi kapıyı çaldığında rapor hazır olsun."

---

## 5. Mesaj Mimarisi (Kullanıma Hazır)

**Ana slogan adayları:**
- "Etkinliğinizin işletim sistemi."
- "8 araç yerine 1 platform."
- "Tek sistem. Tüm etkinlik. Kanıtlanabilir sonuç."
- "Keşiften topluluğa, kayıttan krediye — uçtan uca."

**30 saniyelik pitch:** (Bkz. `PAZARLAMA_KONUMLANDIRMA.md` Bölüm 8)

**Üç katmanlı mesaj:**
1. **Genişlik:** "Her şeyi tek platformda yap." (stack replacement)
2. **Derinlik:** "Sertifikan taklit edilemez, doğrulanabilir." (farklılaştırıcı)
3. **Zekâ:** "Yapay zekâ ile yönet." (gelecek vaadi)

---

## 6. Plan/Paket Bazlı Pazarlama (Upsell Haritası)

| Plan | Konum | Pazarlama odağı | Yükseltme tetikleyicisi |
|---|---|---|---|
| **Starter** | Ücretsiz — doğrulama & hafif belge | "Sertifika doğrulaması her zaman ücretsiz" | Etkinlik operasyonu gerekince → Pro |
| **Pro** | Etkinlik operasyonu | Check-in, biletleme, toplu sertifika, özel form | E-posta/otomasyon/marka gerekince → Growth |
| **Growth** | Ölçeklenen operasyon | Otomasyon, e-posta, segmentasyon, analitik, API, marka, alan adı, sunum, çekiliş | CRM/ekip/uyumluluk gerekince → Enterprise |
| **Enterprise** | Kurumsal & uyumluluk | CRM, lead formları, entegrasyonlar, eğitim uyumluluğu, akreditasyon, SSO, kiosk, ekip, raporlar | — |

**Upsell mesajı örneği:** *"Toplu sertifika veriyorsunuz (Pro) — peki katılımcılara otomatik hatırlatma e-postası göndermek ister misiniz? Growth'a geçin."*

---

## 7. SSS & İtiraz Kataloğu (Hangi Sorularla Karşılaşırız?)

> En kritik bölüm. Kategoriye göre sıralı. Her cevap kod gerçeğine dayanır; abartı yoktur.

### 7.1. Ürün & Kapsam Soruları

**S: HeptaCert tam olarak ne yapıyor? Sadece sertifika mı?**
C: Hayır. HeptaCert uçtan uca bir etkinlik platformudur: kayıt, biletleme, ödeme, check-in, e-posta, anket, çekiliş, CRM, analitik ve sertifika. Sertifika güçlü bir ayrıştırıcımız ama platformun bir parçası.

**S: Eventbrite/Cvent/Biletino'dan farkınız ne?**
C: Onlar genelde tek aşamayı (bilet/kayıt) çözer. Biz tüm yaşam döngüsünü tek sistemde topluyoruz ve katılımcıya doğrulanabilir, sahteciliğe kapalı bir sertifika bırakıyoruz. Ayrıca yerleşik CRM, CPD takibi ve AI yönetimi sunuyoruz.

**S: Online mı, yüz yüze mi etkinlikler için?**
C: İkisi de. Yüz yüze için QR check-in/kiosk; online için Zoom webinar entegrasyonu ve canlı sunum araçları var.

**S: Mevcut katılımcı listemi aktarabilir miyim?**
C: Evet, CSV/Excel içe aktarma ve Google Sheets/Microsoft Excel senkron mevcut.

**S: Türkçe mi?**
C: Evet, Türkçe birincil dildir; çok dilli (i18n) altyapı vardır. Yasal sayfalar (KVKK, gizlilik, mesafeli satış vb.) Türkçe yerleşik gelir.

### 7.2. Sertifika & Güvenlik Soruları

**S: Sertifikanın "taklit edilemez" olduğunu nasıl iddia ediyorsunuz?**
C: Üç katman: (1) görsele gömülü, gözle görünmeyen filigran; (2) PDF'e uygulanan kriptografik dijital imza; (3) her sertifikanın benzersiz genel doğrulama bağlantısı. Belge değiştirilirse doğrulama bozulur.

**S: Birisi sertifikanın ekran görüntüsünü/fotokopisini alırsa?**
C: Doğrulama, görselin içindeki filigrana ve sisteme kayıtlı benzersiz kimliğe bakar; sahte bir kopya doğrulamayı geçemez. (Teknik not: filigran PNG'de güvenle taşınır; ağır JPEG sıkıştırması filigranı bozabilir — bu yüzden orijinal dosya paylaşımı önerilir.)

**S: Sertifikayı yanlış kişiye verdik, geri çekebilir miyiz?**
C: Evet, iptal (revocation) özelliği var; iptal edilen sertifika doğrulamada "geçersiz/iptal" görünür.

**S: Verilerimiz güvende mi?**
C: 2FA, denetim günlükleri, güvenlik olayı kaydı, rol bazlı erişim ve scope'lu API anahtarları mevcut. *(Belirli sertifikasyon/standart iddiası için Bölüm 9'a bakın — hukuki/teknik onaysız söylenmez.)*

### 7.3. Fiyat & Ticari Sorular

**S: Fiyatlandırma nasıl?**
C: Kademeli abonelik var (Starter/Pro/Growth/Enterprise). *(Güncel rakamları fiyatlandırma sayfasından/satış ekibinden teyit edin — bu raporda fiyat yer almaz.)*

**S: Ücretsiz deneyebilir miyim?**
C: Starter planı ücretsizdir ve sertifika doğrulamasını içerir; etkinlik operasyonu için ücretli planlara geçilir.

**S: Ödeme nasıl alınıyor?**
C: Yerleşik ödeme altyapısı (iyzico entegrasyonu) ile; abonelik ve sipariş yönetimi platformda.

**S: Sözleşmeli/kurumsal anlaşma var mı?**
C: Enterprise planı kurumsal ihtiyaçlara yöneliktir; ticari limitler sözleşmeyle belirlenebilir.

### 7.4. Teknik & Entegrasyon Soruları

**S: Kendi sistemlerimizle entegre olur mu?**
C: Evet — açık API, scope'lu API anahtarları, imzalı webhook'lar ve hazır entegrasyonlar (Google Sheets, Microsoft Excel, Zoom, HubSpot/Salesforce/Mailchimp).

**S: "HeptaCert ile giriş" yaptırabilir miyiz?**
C: Evet, HeptaCert bir OAuth2/OIDC kimlik sağlayıcıdır; başka uygulamalarınız HeptaCert hesabıyla giriş kabul edebilir.

**S: Yapay zekâ entegrasyonu ne demek?**
C: HeptaCert bir MCP sunucusuyla gelir; Claude gibi AI ajanları, güvenli yetki sınırları içinde etkinlik/katılımcı/sertifika işlemlerini doğal dille yapabilir. Ayrıca e-posta/form metni AI ile üretilebilir.

**S: Kendi alan adımızda yayınlayabilir miyiz?**
C: Evet, özel alan adı desteği ve otomatik SSL sertifikası var (white-label).

**S: Mobil uygulama var mı?**
C: Sertifika/bilet Apple & Google Wallet'a eklenebilir; arayüz mobil uyumludur. *(Ayrı bir native uygulama iddiası kodda doğrulanmadı — bunu vaat etmeyin.)*

### 7.5. Uyumluluk & Yasal Sorular

**S: KVKK/GDPR uyumlu musunuz?**
C: Veri dışa aktarma, hesap silme ve yasal onay (consent) kaydı gibi **uyum süreçlerini destekleyen araçlar** sunuyoruz; yerleşik Türkçe yasal sayfalar gelir. **Kesin "uyumludur" beyanı hukuki incelemeye tabidir** (Bölüm 9).

**S: Verilerim nerede tutuluyor?**
C: *(Barındırma/lokasyon iddiası bu raporda doğrulanmadı — altyapı/DevOps ekibinden teyit alın; uydurmayın.)*

**S: Denetim/audit izi var mı?**
C: Evet, denetim günlükleri ve güvenlik olayı kayıtları (Enterprise) mevcut; dışa aktarılabilir.

### 7.6. AI'a Özel Sorular (Sıkça gelir)

**S: AI bizim verimizle model mi eğitiyor?**
C: *(Bu, kullanılan AI sağlayıcısının politikasına bağlıdır — kesin cevap için teknik ekip teyidi gerekir. "Verinizle eğitilmez" gibi bir garanti vermeyin, doğrulamadan.)*

**S: AI yanlış işlem yaparsa?**
C: Yıkıcı işlemler (silme, iptal) zorunlu onay gerektirir; her AI işlemi denetim günlüğüne kaydedilir ve API anahtarı yetki (scope) sınırları içinde çalışır.

### 7.7. Rakip & Karşılaştırma Soruları

**S: Zaten X aracını kullanıyoruz, neden değişelim?**
C: "Kaç ayrı araç kullanıyorsunuz ve aralarında ne kadar veri taşıyorsunuz?" sorusuyla başlayın. HeptaCert bu yığını birleştirir; ayrıca doğrulanabilir sertifika, CPD ve AI gibi onlarda olmayan katmanları ekler.

**S: "Best-of-breed" (her iş için en iyi ayrı araç) yaklaşımını tercih ederiz.**
C: Anlaşılır — bu yüzden açık API, OAuth sağlayıcı ve webhook'larımız var; istediğinizi entegre edin. Ama bilet→ödeme→check-in→CRM→sertifika arası veri akışını biz dikişsiz veriyoruz.

### 7.8. Benimseme/Kullanım Kolaylığı Soruları

**S: Bu kadar özellik karmaşık değil mi?**
C: Paket bazlı açılır; sadece ihtiyacınız olanla başlarsınız. Arayüzde in-app AI asistan, komut paleti ve adım adım tur rehberi var; etkinlik kurulum kontrol listesi sizi yönlendirir.

**S: Ekibimi nasıl eklerim?**
C: Organizasyon ekibi ve rol yönetimiyle ekip üyelerine yetki verirsiniz (Enterprise); etkinlik bazında işbirlikçi (collaborator) ataması da var.

---

## 8. Rakip Konumlandırma Çerçevesi

> Belirli rakip hakkında kesin iddia içermez; kategori genelini özetler ve HeptaCert'in güçlü yönlerini öne çıkarır.

| Boyut | Tipik etkinlik aracı | HeptaCert |
|---|---|---|
| Kapsam | Tek aşama | Tüm yaşam döngüsü (Event OS) |
| Sertifika | Basit PDF / yok | Filigran + imza + doğrulama + iptal |
| Dijital cüzdan | Nadiren | Apple + Google Wallet |
| CRM | Harici araç | Yerleşik + push |
| CPD/akreditasyon | Yok | Yerleşik |
| AI yönetimi | Nadiren | MCP ajan + AI üretim |
| White-label + alan adı | Sınırlı | Otomatik SSL ile tam |
| Genişletilebilirlik | Sınırlı API | API + OAuth/OIDC sağlayıcı + webhook + MCP |
| Türkiye uyumu | Değişken | iyzico + Türkçe yasal sayfalar |

**Savunma cümlesi:** *"Onlar etkinliğin bir parçasını yönetir; biz etkinliğin işletim sistemiyiz."*

---

## 9. ⚠️ Söylenebilir / Söylenemez — Pazarlama Sınırları (Org Politikası)

> Bu bölüm zorunludur. Org talimatı: var olmayan müşteri/ortaklık/sertifikasyon/yasal iddia yasak; doğrulanmış ile varsayım ayrılmalı.

**✅ Rahatça söylenebilir (kodda doğrulanmış):**
- Görünmez filigran, kriptografik PDF imzası, genel doğrulama, sertifika iptali/kademesi/şablon versiyonlama
- Apple/Google Wallet entegrasyonu
- Toplu sertifika, check-in, kiosk, biletleme, özel kayıt formları
- Toplu/zamanlanmış e-posta + takip, otomasyon, segmentasyon
- Yerleşik Event CRM (lead scoring, pipeline, sequences), HubSpot/Salesforce/Mailchimp push
- CPD/akreditasyon, kurumsal eğitim uyumluluğu
- Canlı sunum + uzaktan QR/kumanda
- Açık API, OAuth/OIDC sağlayıcı, MCP, webhook
- White-label + özel alan adı + SSO + ekip yönetimi
- 2FA, denetim günlükleri, KVKK/GDPR **araçları** (dışa aktarma/silme/onay), Türkçe yasal sayfalar
- iyzico ile ödeme, kademeli abonelik

**⚠️ Dikkatli/koşullu söylenmeli (önce teyit):**
- "KVKK/GDPR uyumlu" → bunun yerine "uyum süreçlerini destekleyen araçlar sunar" deyin; kesin uyum beyanı **hukuki onay** ister.
- Veri barındırma lokasyonu / sunucu konumu → DevOps teyidi olmadan söylenmez.
- AI veri gizliliği garantileri ("verinizle eğitilmez") → AI sağlayıcı politikası teyidi olmadan söylenmez.
- Native mobil uygulama → kodda doğrulanmadı; "mobil uyumlu + cüzdan entegrasyonu" deyin.
- Performans/ölçek rakamları ("X bin eş zamanlı kullanıcı") → yük testi verisi olmadan söylenmez.

**❌ Asla söylenmez (org politikası):**
- Var olmayan müşteri adı, vaka çalışması, referans
- Var olmayan ortaklık, entegrasyon ortağı, resmî onay
- Sahip olunmayan sertifikasyon/standart (ISO, SOC2 vb.) iddiası
- "Pazar lideri", "Türkiye'nin #1'i" gibi kanıtlanamaz üstünlük iddiaları
- Rakip hakkında kanıtlanamaz olumsuz iddia

---

## 10. Pazarlama Kanalları & İçerik Önerileri

- **LinkedIn (B2B birincil):** dernekler, kongre organizatörleri, İK/uyumluluk müdürleri hedefli. Konu liderliği + ürün anlatımı.
- **Demo/webinar:** "8 araç → 1 platform" canlı demosu en güçlü dönüşüm aracı.
- **SEO/Blog:** "doğrulanabilir sertifika", "CPD takibi", "etkinlik check-in" anahtar kelimeleri.
- **Sektör etkinlikleri:** HeptaCert'i kendi etkinliğinde kullanıp "kendi ilacını iç" (dogfooding) vakası — *gerçekleştiğinde* vaka çalışmasına dönüştürün.
- **Detaylı sosyal medya planı:** `docs/SOSYAL_MEDYA_ICERIK.md`

---

## 11. Terimler Sözlüğü (Pazarlama Ekibi İçin)

| Terim | Basit anlamı |
|---|---|
| **Steganografik filigran** | Görselin içine gizlenmiş, gözle görünmeyen kimlik damgası |
| **Kriptografik imza** | Belgenin değiştirilmediğini matematiksel olarak kanıtlayan dijital mühür |
| **CPD** | Sürekli Mesleki Gelişim — profesyonellerin kazandığı eğitim kredisi |
| **Akreditasyon** | Bir kurumun resmî olarak yetkili/onaylı sayılması |
| **CRM** | Müşteri/katılımcı ilişkileri yönetimi yazılımı |
| **Lead scoring** | Potansiyel müşterileri ilgilerine göre puanlama |
| **Pipeline** | Satış sürecinin aşamalarını gösteren hat |
| **Segmentasyon** | Katılımcıları gruplara ayırma (doğru mesaj için) |
| **Webhook** | Bir olay olunca başka sisteme otomatik bildirim gönderen bağlantı |
| **API** | Yazılımların birbiriyle konuşmasını sağlayan arayüz |
| **OAuth/OIDC** | "X ile giriş yap" sistemleri; kimlik doğrulama standardı |
| **MCP** | Model Context Protocol — yapay zekâ ajanlarının yazılımı kullanmasını sağlayan standart |
| **SSO** | Tek Oturum Açma — şirket hesabıyla tüm sistemlere giriş |
| **White-label** | Ürünün başka markanın adıyla sunulması |
| **Kiosk modu** | Self-servis dokunmatik giriş standı |
| **Multi-tenancy (çok kiracılılık)** | Tek sistemde birçok kurumun izole şekilde çalışması |
| **Steganografi vs JPEG** | Filigran PNG'de güvenli; ağır JPEG sıkıştırması bozabilir |

---

## 12. İlgili Dosyalar

- **Konumlandırma & mesaj kütüphanesi:** `docs/PAZARLAMA_KONUMLANDIRMA.md`
- **Sosyal medya içerik takvimi:** `docs/SOSYAL_MEDYA_ICERIK.md`
- **Bu rapor:** `docs/PAZARLAMA_RAPORU.md`

> Kod tabanı değiştikçe (`.codesight` yeniden tarandıkça) bu raporu güncelleyin; özellikle plan eşlemeleri ve yeni modüller için.
