# HeptaCert Sıfırdan Uzmanlığa — Tam Yapım Kitabı

> **Versiyon:** 1.0  
> **Hazırlayan:** Samet Ünsal  
> **Durum:** Taslak  
> **Son Güncelleme:** Haziran 2026

---

## İçindekiler

1. [Seri Hakkında](#1-seri-hakkında)
2. [Yayın Takvimi](#2-yayın-takvimi)
3. [Çekim Ortamı ve Teknik Kurulum](#3-çekim-ortamı-ve-teknik-kurulum)
4. [Standart Açılış / Kapanış Şablonu](#4-standart-açılış--kapanış-şablonu)
5. [Demo Ortamı Hazırlığı](#5-demo-ortamı-hazırlığı)
6. [Bölümler — Detaylı Senaryo](#6-bölümler--detaylı-senaryo)
7. [Thumbnail ve SEO Rehberi](#7-thumbnail-ve-seo-rehberi)
8. [Yayın Kontrol Listesi](#8-yayın-kontrol-listesi)

---

## 1. Seri Hakkında

### 1.1 Genel Tanım

**Seri Adı:** HeptaCert Sıfırdan Uzmanlığa  
**Platform:** YouTube (birincil) + heptacert.com/egitim (gömülü)  
**Toplam Video Sayısı:** ~58 video  
**Toplam Süre:** ~14 saat  
**Dil:** Türkçe (altyazı: İngilizce, sonraki sürümde)

### 1.2 Hedef Kitle

| Segment | Profil | Hangi Bölümler |
|---|---|---|
| **Yeni Başlayan** | Platformu ilk kez kullanan organizatör | Bölüm 0–3 |
| **Orta Seviye** | Temel akışı biliyor, otomasyon/analitik öğrenmek istiyor | Bölüm 4–10 |
| **İleri Seviye** | API, SSO, webhook, kurumsal entegrasyon | Bölüm 11–13 |
| **Platform Yöneticisi** | SuperAdmin paneli | Bölüm 14 |
| **Kullanım Senaryosu** | Belirli bir iş akışı arayan deneyimli kullanıcı | Bölüm 15 |

### 1.3 Serinin Felsefesi

- **Göster, anlat:** Her özellik canlı demoda gösterilmeli — slayt yok
- **Modüler:** Her video kendi içinde tamamlanmış, bağımsız izlenebilir
- **Pratik önce:** Teori minimum, uygulama maksimum
- **Plan bağlantısı:** Her video başında "Bu özellik hangi planlarda?" açıkça belirtilmeli

---

## 2. Yayın Takvimi

### Öneri: Haftada 2 Video

| Hafta | Bölüm | Notlar |
|---|---|---|
| H1 | 0.1, 0.2 | Lansman haftası — sosyal medya tanıtımı |
| H2 | 1.1, 1.2 | |
| H3 | 1.3, 2.1 | |
| H4 | 2.2, 2.3 | CRM bölümü uzun — ayrı tanıtım post'u |
| H5 | 3.1, 3.2 | |
| H6 | 4.1, 4.2 | |
| H7 | 4.3, 5.1 | |
| H8 | 5.2, 5.3 | |
| H9 | 6.1, 6.2 | |
| H10 | 6.3, 6.4 | |
| H11 | 7.1, 7.2 | |
| H12 | 8.1, 8.2 | |
| H13 | 9.1, 9.2 | |
| H14 | 10.1, 10.2 | |
| H15 | 10.3, 11.1 | |
| H16 | 11.2, 11.3 | |
| H17 | 11.4, 12.1 | |
| H18 | 12.2, 12.3 | |
| H19 | 13.1, 13.2 | |
| H20 | 14.1, 14.2 | |
| H21 | 14.3, 15.1 | |
| H22 | 15.2, 15.3 | Seri finali — genel özet videosu ekle |

### Öncelikli Yayın Sırası (ilk 10 video zorunlu)
1. 0.1 Tanıtım
2. 0.2 İlk Kurulum
3. 1.1 Etkinlik Oluşturma
4. 2.1 Katılımcı Akışı
5. 5.1 Sertifika Şablonu
6. 5.2 Sertifika Gönderimi
7. 4.2 Check-in
8. 6.3 Zamanlanmış E-posta
9. 10.1 Analitik
10. 15.1 Üniversite Kongre Senaryosu

---

## 3. Çekim Ortamı ve Teknik Kurulum

### 3.1 Ekran Kurulumu

```
Çözünürlük     : 1920×1080 (tam ekran tarayıcı)
Tarayıcı zoom  : %100 — küçültme/büyütme yok
Font boyutu    : Sistem varsayılanı
Tema           : Açık tema (daha iyi okunabilirlik)
Bildirimler    : Kapat (Do Not Disturb açık)
Tarayıcı sekmesi sayısı : Sadece demo tab, diğerleri kapalı
URL bar        : Gizlenmiş değil (izleyici nerede olduğunu görmeli)
```

### 3.2 Demo Hesap Hazırlığı (her çekim öncesi)
- Demo kurum: **"Akademi Demo A.Ş."** — gerçek kurum bilgisi çıkmasın
- Demo etkinlik: **"İleri Yazılım Eğitimi 2026"** — genel amaçlı
- Demo katılımcılar: CSV dosyası hazır (50 kişi — gerçek isim yok, `ornek1@test.com` formatı)
- Ödeme ayarları: Test modu açık
- E-posta: SMTP test sunucusuna bağlı (Mailtrap veya benzeri)

### 3.3 Ses ve Görüntü
- Mikrofon: Gürültü filtreleme açık
- Arka plan: Sade, marka rengiyle uyumlu
- Kamera: Varsa küçük köşe PiP (face cam), yoksa sadece ekran
- Ses seviyesi: -12 dB hedef (YouTube normalize eder)

### 3.4 Video Kalite Kontrol
- [ ] Ekranda kişisel bilgi (e-posta, telefon, şifre) görünmüyor
- [ ] Gerçek müşteri/kurum adı yok
- [ ] Mikrofon test edildi
- [ ] Bildirimler kapalı
- [ ] Tarayıcı geçmişi temiz (autocomplete istemeden açılmasın)

---

## 4. Standart Açılış / Kapanış Şablonu

### 4.1 Açılış (30 saniye — her videoda aynı)

**Görsel:** HeptaCert logosu + seri başlığı animasyonu  
**Söz:**
> "HeptaCert Sıfırdan Uzmanlığa serisine hoş geldiniz. Ben Samet. Bu videoda [KONU] öğreneceğiz."

Ardından o videoya özel 2–3 cümle:
> "Özellikle [ŞU SENARYODA] çok işinize yarayacak. Başlayalım."

### 4.2 Bölüm Geçişi (tekrarlayan yapı, video içinde)

Her ana adım değişiminde kısa başlık kartı:
> **Ekran üzerinde küçük overlay:** "Adım 2 — [başlık]"

### 4.3 Kapanış (45 saniye — her videoda)

**Söz:**
> "[KONU]'nu bu videoda ele aldık. Özetle: [1-2 cümle özet]."
>
> "Bir sonraki videoda [SONRAKİ KONU] konusuna bakıyoruz — o videoya geçmek için [kart/link]."
>
> "Sorunuz varsa yorum bırakın. Görüşmek üzere."

**Görsel:** End screen — sonraki video kartı + playlist kartı

### 4.4 Plan Bant (her video başında — 5 saniye overlay)

Her videoda, açılıştan hemen sonra ekranda şu bilgi görünmeli:

```
📋 Bu özellik:  ☐ Free  ☑ Starter  ☑ Growth  ☑ Enterprise
```

---

## 5. Demo Ortamı Hazırlığı

### 5.1 Demo Etkinlik Yapısı

**Etkinlik 1 — Ana Demo:** "İleri Yazılım Eğitimi 2026"
- Tip: Sertifikalı eğitim
- Tarih: 2 hafta ileri (dinamik olsun — her çekim günü güncelle)
- Konum: İstanbul / Online (her ikisi de denenecek)
- Özellikler: Hepsi açık (certificate ✓, checkin ✓, ticketing ✓, surveys ✓, raffles ✓, gamification ✓)
- Katılımcı sayısı: 50 kişi (CSV ile önceden yüklü)

**Etkinlik 2 — Çekiliş Demo:** "Yıl Sonu Ödül Töreni"
- Tip: Konser / Tören
- Sadece ticketing + raffles özelliği açık

**Etkinlik 3 — Check-in Demo:** "Sabah Brifingi"
- Tip: Seminer
- Sadece checkin açık, tek oturum
- Katılımcı: 10 kişi (telefonda QR testi için)

### 5.2 Demo CSV İçeriği

```csv
first_name,last_name,email,phone
Ahmet,Yılmaz,ahmet.yilmaz@test.com,+90 555 000 0001
Ayşe,Kaya,ayse.kaya@test.com,+90 555 000 0002
Mehmet,Demir,mehmet.demir@test.com,+90 555 000 0003
...
```

> 50 satır hazır olsun. Gerçek isim + `@test.com` domain.

### 5.3 Demo Sertifika Şablonu

- Arka plan: Marka rengi + beyaz alan
- Alanlar: Ad Soyad, Etkinlik Adı, Tarih, İmza
- Hazır şablon kayıtlı ve etkinliğe bağlı

### 5.4 Demo E-posta Şablonları

3 hazır şablon:
1. **Hoş Geldiniz** — kayıt onayı
2. **Hatırlatma** — etkinlik 1 gün önce
3. **Sertifikan Hazır** — etkinlik sonrası

---

## 6. Bölümler — Detaylı Senaryo

---

### BÖLÜM 0 — Giriş ve Platform Tanıtımı

---

#### Video 0.1 — HeptaCert Nedir? Büyük Resim

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Yok (izleme videosu)  
**Ön Koşul:** Yok  
**SEO Başlığı:** HeptaCert Nedir? Etkinlik Yönetim ve Sertifika Platformu Tanıtımı

**Amaç:** İzleyicinin "bu platform bana ne yapacak?" sorusunu yanıtlamak.

**Anlatım Sırası:**

1. **(0:00–1:00)** Açılış + seri tanıtımı
   > "Bu seri boyunca HeptaCert'i sıfırdan öğreneceksiniz. Üniversite kongreleri, şirket eğitimleri, büyük konferanslar — hepsini bu platformla yönetebilirsiniz."

2. **(1:00–3:00)** Platform ne yapıyor? — Büyük Resim
   - Ekranda: Anasayfa ve dashboard yan yana
   - Söyle: Üç taraf var — **Organizatör** (admin), **Katılımcı** (attendee), **SuperAdmin** (platform)
   - Bağlantı: "Tıpkı bir konser için bilet satan platform gibi düşünün — ama üstüne sertifika, check-in, analitik, otomasyon da var"

3. **(3:00–5:00)** Katılımcı tarafı gezintisi
   - Göster: Public etkinlik sayfası, kayıt formu, sertifika indirme
   - Söyle: "İzleyicinin gördüğü bu — sizin yönettiğiniz ise admin paneli"

4. **(5:00–8:00)** Admin paneli hızlı tur
   - Dashboard → Events → bir etkinliğe gir → sol menü (EventAdminNav)
   - Her modülü tek cümleyle tanıt: "Checkin — kapıda QR okutma", "Certificates — otomatik sertifika", vb.

5. **(8:00–9:30)** Gerçek kullanım senaryoları
   - "200 kişilik üniversite kongresi" → hangi modüller
   - "50 kişilik kurumsal eğitim" → hangi modüller
   - "5000 kişilik konferans" → hangi modüller

6. **(9:30–10:30)** Plan yapısı (hızlı)
   - Free / Starter / Growth / Enterprise — farkı tek cümle
   - "Bu serinin büyük çoğunluğu Starter ve Growth planlarını kapsıyor"

7. **(10:30–12:00)** Kapanış + sıradaki video tanıtımı

**Gösterilecek Ekranlar:**
- [ ] Anasayfa (public)
- [ ] Bir etkinliğin public sayfası
- [ ] Admin dashboard
- [ ] Events listesi
- [ ] Bir etkinliğin sol nav menüsü (hızlı geçiş)
- [ ] Fiyatlandırma sayfası

**Dikkat:** Demo hesabı açık olsun, gerçek kurum bilgisi görünmesin.

---

#### Video 0.2 — Hesap Açma ve İlk Kurulum

**Süre:** 8–10 dakika  
**Plan Gereksinimi:** Free (hesap açma ücretsiz)  
**SEO Başlığı:** HeptaCert Hesap Açma ve Kurum Profili Kurulumu | Başlangıç Rehberi

**Anlatım Sırası:**

1. **(0:00–1:30)** Kayıt akışı
   - Kayıt sayfasına git → e-posta + şifre gir
   - E-posta doğrulama adımı
   - Söyle: "Kurumsal e-posta kullanın — ileride domain doğrulamasında işinize yarar"

2. **(1:30–4:00)** Kurum profili doldurma
   - Kurum adı, web sitesi, sektör
   - Logo yükleme (önerilen boyut belirt)
   - Sosyal medya linkleri
   - Marka rengi seçimi
   - Söyle: "Bu bilgiler sertifikalarda ve e-postalarda görünecek — eksiksiz doldurun"

3. **(4:00–6:30)** İki faktörlü doğrulama (2FA)
   - Ayarlar → Güvenlik sekmesi
   - Google Authenticator veya Authy uygulaması
   - QR kodu tara → kodu gir → etkinleştir
   - **Yedek kodları kaydet** — önemle vurgula
   - Söyle: "2FA olmadan hesabınız risk altında — özellikle kurumsal kullanımda zorunlu"

4. **(6:30–8:00)** Dashboard'a ilk bakış
   - Sol menü yapısı
   - Komut paleti (Cmd+K / Ctrl+K) — hızlı navigasyon
   - Dil değiştirme (TR/EN)

5. **(8:00–10:00)** İlk etkinlik oluşturma teaser
   - CreateEventDrawer'ı aç, göster, kapat
   - "Bir sonraki videoda bunu detaylıca yapıyoruz"

**Gösterilecek Ekranlar:**
- [ ] Kayıt formu
- [ ] E-posta doğrulama ekranı
- [ ] Kurum profil ayarları
- [ ] 2FA kurulum ekranı
- [ ] Yedek kodlar ekranı
- [ ] Dashboard
- [ ] Komut paleti (Cmd+K)

**İzleyici Notu:**
> 💡 "Logo dosyası önerilen: PNG, şeffaf arka plan, minimum 400×400 px"

---

### BÖLÜM 1 — İlk Etkinliği Oluşturmak

---

#### Video 1.1 — Etkinlik Tipleri ve Yapısı

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Free (temel etkinlik oluşturma)  
**SEO Başlığı:** HeptaCert'te Etkinlik Nasıl Oluşturulur? Etkinlik Tipleri ve Özellikler

**Anlatım Sırası:**

1. **(0:00–2:00)** Etkinlik tipleri açıklaması
   - CreateEventDrawer'ı aç
   - Tipleri göster: Sertifikalı Eğitim, Seminer, Workshop, Konferans, Konser, Kulüp Etkinliği, Online, Özel
   - Söyle: "Tip seçimi otomatik olarak hangi özelliklerin açılacağını belirliyor"
   - Tablo göster (ekranda veya overlay):
     | Tip | Certificate | Checkin | Ticketing |
     |-----|-------------|---------|-----------|
     | Sertifikalı Eğitim | ✓ Varsayılan | ✓ | Opsiyonel |
     | Konser | — | ✓ | ✓ Varsayılan |
     | Online | ✓ | — | Opsiyonel |

2. **(2:00–5:00)** AI asistan ile hızlı etkinlik oluşturma
   - Admin dashboard → AI asistan aç
   - "İstanbul'da 3 günlük bir yazılım konferansı oluşturmak istiyorum, 300 kişi kapasiteli, biletli"
   - Asistanın sorularını yanıtla
   - Sonuçta oluşan taslağı göster
   - Söyle: "AI başlangıcı hızlandırıyor ama sonrasında her şeyi elle düzenleyeceksiniz"

3. **(5:00–9:00)** Manuel oluşturma (adım adım)
   - Başlık, alt başlık
   - Tarih ve saat (DateTimeField kullanımı)
   - Lokasyon: fiziksel adres veya online link
   - Kapasite limiti
   - Kapak görseli yükleme
   - Görünürlük: Public / Unlisted / Private
   - Özellik toggle'ları: certificate, checkin, ticketing, surveys, raffles, gamification
   - Her toggle için 1 cümle açıklama

4. **(9:00–11:00)** Etkinliği kaydetme ve ilk görünüm
   - Kaydet → event detail sayfasına yönlenme
   - Setup Checklist görünümü — "Şu an kaçta kaçı tamamladınız?"
   - Sol nav menüsü → aktif/pasif sekmeler (toggle'a göre değişiyor)

5. **(11:00–12:00)** Kapanış

**Gösterilecek Ekranlar:**
- [ ] CreateEventDrawer — tip seçimi
- [ ] AI asistan sohbet akışı
- [ ] Manuel form alanları
- [ ] Özellik toggle'ları
- [ ] Kaydedilmiş etkinlik sayfası
- [ ] Setup Checklist bileşeni

---

#### Video 1.2 — Etkinlik Detayları ve Sayfa Editörü

**Süre:** 12–15 dakika  
**Plan Gereksinimi:** Starter ve üzeri (sayfa editörü)  
**SEO Başlığı:** HeptaCert Etkinlik Sayfası Editörü — Özel Landing Page Oluşturma

**Anlatım Sırası:**

1. **(0:00–2:00)** Setup Checklist nedir?
   - Yeni oluşturulmuş etkinliğin checklist'ini göster
   - Her adımın üzerine gel, kısa açıklama: "Temel bilgileri tamamla → şu an buradayız"
   - "Bu listeyi tamamlamadan etkinliği yayına almayın"

2. **(2:00–6:00)** Kayıt formu düzenleme
   - Etkinlik Ayarları → Kayıt Formu sekmesi
   - Varsayılan alanlar: ad, soyad, e-posta
   - Özel alan ekleme: dropdown, checkbox, text
   - KVKK onay metnini görüntüleme ve düzenleme
   - Söyle: "KVKK onay kutucuğu Türkiye'de yasal zorunluluk — silmeyin"

3. **(6:00–11:00)** Sayfa editörü
   - Editor sekmesine geç
   - Mevcut blokları göster: başlık, metin, görsel, konuşmacılar, program, SSS
   - Blok ekleme: + butonuna tıkla
   - Bir blok düzenleme: drag ile yeniden sıralama
   - Mobil ön izleme
   - Kaydet

4. **(11:00–13:00)** Preview (Katılımcı ön izleme)
   - Preview sekmesine tıkla
   - "Katılımcının göreceği tam olarak bu"
   - Kayıt butonuna tıkla → kayıt formu görünümü
   - Geri dön

5. **(13:00–15:00)** Public link ve yayına alma
   - Public link kopyalama
   - Görünürlük: Unlisted → Public değiştir
   - Söyle: "Unlisted linki bilen herkese açık — tam public ise arama motoru ve platform keşfinde çıkar"

**Gösterilecek Ekranlar:**
- [ ] Setup Checklist (tamamlanmamış hali)
- [ ] Kayıt formu düzenleme
- [ ] KVKK onay metni
- [ ] Sayfa editörü — blok ekleme/düzenleme
- [ ] Mobil ön izleme
- [ ] Preview modu (katılımcı görünümü)
- [ ] Görünürlük ayarı

---

#### Video 1.3 — Ekip ve Yetkilendirme

**Süre:** 8–10 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert Ekip Davet Etme ve Rol Yönetimi

**Anlatım Sırası:**

1. **(0:00–2:00)** Neden ekip kurulumu önemli?
   - "Büyük etkinliklerde tek kişi her şeyi yapamaz"
   - Örnek senaryo: "Check-in görevlisi, tasarımcı, içerik editörü — hepsinin farklı erişim seviyesi"

2. **(2:00–5:00)** Kurum düzeyinde ekip üyesi daveti
   - Ayarlar → Ekip sekmesi
   - E-posta ile davet
   - Rol seçimi: Admin, Editor, Görüntüleyici
   - Davet e-postası nasıl görünüyor (test gönder)
   - Bekleyen davetleri yönetme

3. **(5:00–8:00)** Etkinlik düzeyinde ekip
   - Etkinlik → Team sekmesi
   - Kişi ekle → rol: Operatör, Görevli
   - Görevli modu ne anlama geliyor: sadece check-in erişimi
   - "Check-in görevlisine tam admin yetkisi vermeyin — Görevli rolü yeterli"

4. **(8:00–10:00)** Mevcut ekibi düzenleme ve rol değiştirme
   - Rol değiştirme
   - Erişimi kaldırma
   - Davet iptal etme

**Gösterilecek Ekranlar:**
- [ ] Ayarlar → Ekip sekmesi
- [ ] Davet e-postası önizlemesi
- [ ] Etkinlik → Team sekmesi
- [ ] Rol dropdown'ları

---

### BÖLÜM 2 — Kayıt ve Katılımcı Yönetimi

---

#### Video 2.1 — Katılımcı Akışı — Baştan Sona

**Süre:** 12–15 dakika  
**Plan Gereksinimi:** Free  
**SEO Başlığı:** HeptaCert Katılımcı Yönetimi — Kayıt, Import, Detay Sayfası

**Anlatım Sırası:**

1. **(0:00–2:00)** Katılımcı nasıl sisteme girer?
   - 3 yol: a) Kendi kaydoluyor, b) Admin ekliyor, c) Excel import
   - Demo: Public sayfadan kayıt ol (başka tarayıcı/gizli sekme)
   - Admin panelinde anlık görünüm

2. **(2:00–5:00)** Manuel katılımcı ekleme
   - Attendees → "Katılımcı Ekle" butonu
   - Ad, soyad, e-posta doldur
   - Kaydet → listede görünüm

3. **(5:00–8:00)** Excel/CSV ile toplu import
   - "İçe Aktar" butonu
   - Şablon indir → Excel'de göster → kayıt ekle → yükle
   - Import sonucu: kaç kişi eklendi, kaç güncellendi, hata var mı?
   - Sık yapılan hata: "E-posta sütunu zorunlu — header tam eşleşmeli"

4. **(8:00–11:00)** Katılımcı listesi kullanımı
   - Arama kutusu
   - Filtreler: check-in durumu, sertifika, bilet tipi
   - Sütun bazlı sıralama
   - Toplu seçim → e-posta gönder / CSV dışa aktar
   - BulkActionBar kullanımı

5. **(11:00–15:00)** Katılımcı detay sayfası
   - Katılımcıya tıkla
   - Profil bilgileri
   - Biletleri
   - Sertifikaları
   - Anket yanıtları
   - Check-in geçmişi
   - Zaman çizelgesi (Activity Timeline)

**Gösterilecek Ekranlar:**
- [ ] Public kayıt formu (gizli sekme)
- [ ] Admin attendees listesi — anlık güncelleme
- [ ] AddAttendeeModal
- [ ] ImportAttendeeModal + şablon
- [ ] Import sonuç ekranı
- [ ] Filtrelenmiş liste
- [ ] Katılımcı detay sayfası

---

#### Video 2.2 — Segmentasyon — Doğru Kişiye Doğru İletişim

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Segmentasyon — Katılımcı Gruplarını Yönetme

**Anlatım Sırası:**

1. **(0:00–2:00)** Segment nedir, neden lazım?
   - Senaryo: "500 katılımcın var — 200'ü check-in yaptı, 300'ü gelmedi. Gelmeyenlere 'kaçırdınız' maili atmak istiyorsun. Nasıl?"
   - Cevap: Segment yarat, o segmente mail gönder

2. **(2:00–8:00)** Segment oluşturma
   - Segments sekmesi → Yeni Segment
   - Filtre kuralları tek tek ekle:
     - Kayıt durumu
     - Check-in yapıp yapmadığı
     - Sertifika alıp almadığı
     - Belirli bilet tipi
     - Anket tamamlama durumu
     - Kayıt tarihi aralığı
   - AND / OR kombinasyonları
   - "Önizle" butonu → kaç kişi eşleşiyor
   - Kaydet ve isimlendir

3. **(8:00–12:00)** Segmenti kullanma
   - Kayıtlı segment → E-posta Gönder bağlantısı
   - Segmenti e-posta kampanyasına bağlama
   - Segment → CSV dışa aktarma

4. **(12:00–15:00)** Dinamik segment nedir?
   - Her sorgu çalıştığında güncel listeyi döner
   - Örnek: "Şu an check-in yapmamış kişiler" — anlık değişiyor
   - Zamanlanmış e-posta + dinamik segment kombinasyonu

5. **(15:00–18:00)** Pratik örnekler
   - "VIP davetliler" segmenti
   - "Sertifika almamış katılımcılar" segmenti
   - "Son 3 etkinliğe katılanlar" segmenti (CRM bağlantısı)

**Gösterilecek Ekranlar:**
- [ ] Segments sekmesi (boş hali)
- [ ] Yeni segment oluşturma — filtre kuralları
- [ ] AND/OR kombinasyon
- [ ] Önizleme sayısı
- [ ] Segment → E-posta bağlantısı

---

#### Video 2.3 — CRM — Katılımcı İlişki Yönetimi

**Süre:** 18–22 dakika  
**Plan Gereksinimi:** Enterprise  
**SEO Başlığı:** HeptaCert Event CRM — Katılımcı Yaşam Döngüsü ve HubSpot Entegrasyonu

**Anlatım Sırası:**

1. **(0:00–2:00)** CRM nedir, event yönetiminden farkı nedir?
   - "Event yönetimi tek etkinliği yönetir. CRM o kişinin kurumunuzla tüm geçmişini yönetir"
   - Senaryo: "Ahmet 3 farklı etkinliğinize katıldı. CRM'de Ahmet'in tüm katılım geçmişini, sertifikalarını, notlarınızı tek ekranda görürsünüz"

2. **(2:00–5:00)** CRM listesi gezintisi
   - Admin → CRM menüsü
   - Liste görünümü: katılımcılar, skor, yaşam döngüsü
   - Arama ve filtre: isim, e-posta, durum, etiket
   - Liste → Kanban görünümüne geçiş

3. **(5:00–10:00)** Katılımcı CRM profili
   - Katılımcıya tıkla → sağ panel açılır
   - Yaşam döngüsü durumu değiştir: Lead → Aktif → VIP
   - Etiket ekle
   - Müşteri önceliği ve lead skoru
   - Takip tarihi ayarla
   - Notlar yaz ve kaydet
   - Özel alanlar (JSON format)

4. **(10:00–14:00)** Toplu işlemler
   - Birden fazla kişi seç
   - Toplu e-posta gönder (şablon seçimli)
   - CSV dışa aktar
   - No-show etiketle

5. **(14:00–18:00)** HubSpot entegrasyonu
   - HubSpot'ta private app token nasıl alınır (kısa adımlar)
   - CRM → HubSpot bölümü → token gir → kaydet
   - Bağlantı testi
   - Seçili katılımcıları HubSpot'a push et
   - Sonuç: kaç kişi gönderildi, kaçı yeni, kaçı güncellendi

6. **(18:00–22:00)** Mükerrer kayıt ve birleştirme
   - "Olası Mükerrer Kayıtlar" paneli
   - Ahmet Yılmaz / ahmetyilmaz → aynı kişi
   - "Kayıtları Birleştir" butonu
   - Birleştirme sonucu

**Gösterilecek Ekranlar:**
- [ ] CRM ana sayfası — liste görünümü
- [ ] Kanban görünümü
- [ ] Katılımcı profil paneli (sağ)
- [ ] Yaşam döngüsü dropdown
- [ ] No-show etiketleme sonucu
- [ ] HubSpot token girişi + test
- [ ] Mükerrer kayıt paneli

---

### BÖLÜM 3 — Biletleme Sistemi

---

#### Video 3.1 — Bilet Tipleri ve Yönetimi

**Süre:** 12–14 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert Biletleme Sistemi — QR Bilet Oluşturma ve Yönetme

**Anlatım Sırası:**

1. **(0:00–2:00)** Biletleme neden ayrı bir modül?
   - "Kayıt = bilgi toplamak. Bilet = kapıda geçiş yetkisi"
   - "Her kayıt bir bilet oluşturabilir — ama her bilet farklı erişim yetkisi taşıyabilir"

2. **(2:00–6:00)** Bilet tipleri oluşturma
   - Tickets → Bilet Tipleri
   - Tip 1: "Genel Katılımcı" — ücretsiz, sınırsız
   - Tip 2: "VIP" — ücretli, 50 adet limit
   - Tip 3: "Erken Kayıt" — indirimli, 30 Mayıs'a kadar
   - Her tür için: isim, açıklama, fiyat, limit, tarih aralığı

3. **(6:00–10:00)** Bilet listesi yönetimi
   - Tüm biletleri listele
   - Durum filtresi: Hazır / Giriş Yapıldı / İptal / İptal Edildi
   - Arama: isim, e-posta, token
   - Bireysel bilet detayı: QR görseli, oluşturma tarihi, check-in tarihi

4. **(10:00–14:00)** Bilet QR mantığı
   - Her biletin benzersiz token'ı var
   - QR = tokenın encode edilmiş hali
   - "Aynı QR iki kez okutulunca ne olur?" → sistemi göster (duplicate uyarısı)
   - Bilet iptal etme

**Gösterilecek Ekranlar:**
- [ ] Bilet tipi oluşturma formu
- [ ] Çoklu bilet tipi listesi
- [ ] Bilet listesi filtrelenmiş
- [ ] Bireysel bilet detayı + QR
- [ ] Duplicate check-in uyarısı

---

#### Video 3.2 — Ödeme ve İşlemler

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Growth ve üzeri (ücretli bilet)  
**SEO Başlığı:** HeptaCert Ödeme Sistemi — Ücretli Bilet ve İşlem Yönetimi

**Anlatım Sırası:**

1. **(0:00–2:00)** Ödeme altyapısı nasıl çalışıyor?
   - Ödeme sağlayıcısı bağlantısı
   - Test modu vs canlı mod

2. **(2:00–6:00)** Checkout deneyimi
   - Katılımcı tarafından ücretli bilet seçimi
   - Checkout sayfası (katılımcı görünümü)
   - Ödeme onayı → otomatik bilet oluşturma

3. **(6:00–10:00)** İşlem yönetimi
   - Admin → Payments → Transactions
   - İşlem detayı: tutar, durum, tarih, katılımcı
   - İade işlemi nasıl yapılır
   - Aylık özet raporu

4. **(10:00–12:00)** İade politikası ayarı
   - Ayarlar'dan iade politikası metni
   - Etkinlik başına farklı politika

---

### BÖLÜM 4 — Check-in Sistemi

---

#### Video 4.1 — Oturum Yönetimi

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert Oturum Yönetimi — Paralel Seanslar ve Yoklama Takibi

**Anlatım Sırası:**

1. **(0:00–2:00)** Oturum nedir, ne zaman gerekir?
   - Senaryo: "2 günlük konferans, her gün 3 paralel panel"
   - "Her oturumun ayrı katılım kaydı → sertifika için en az 2 oturum katılımı şartı koyabilirsin"

2. **(2:00–7:00)** Oturum oluşturma
   - Sessions sekmesi → Yeni Oturum
   - İsim, tarih, başlangıç/bitiş saati
   - Konum / salon
   - Kapasite limiti
   - Görevli atama
   - Birden fazla oturum oluştur (demo: 3 oturum)

3. **(7:00–10:00)** Oturum listesi yönetimi
   - Oturumları sürükle-bırak ile sırala
   - Oturum bazında check-in sayısı görünümü
   - Oturumu kopyalama (aynı formatı birden fazla güne yaymak için)

4. **(10:00–12:00)** Oturumu check-in ekranına bağlama
   - Check-in ekranından oturum seçimi
   - "Oturum seçmeden check-in yapılabilir mi?" → Etkinlik ayarına göre değişir, göster

---

#### Video 4.2 — Hızlı Check-in Kapısı

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Free (manuel), Starter+ (QR tarayıcı)  
**SEO Başlığı:** HeptaCert Check-in Sistemi — QR Okutma, Offline Mod ve Gerçek Zamanlı Takip

**Anlatım Sırası:**

1. **(0:00–2:00)** Check-in ekranını açma
   - Event → Checkin sekmesi
   - Oturum seçim ekranı
   - "Oturum seçmeden başlayabilir miyiz?" — evet, ana etkinlik check-in'i

2. **(2:00–6:00)** Manuel e-posta ile check-in
   - E-posta input alanına yaz → Kabul Et
   - Başarılı: yeşil bildirim + giriş logu
   - Başarısız (yanlış e-posta): kırmızı uyarı
   - Zaten giriş yapmış: sarı uyarı (duplicate)

3. **(6:00–11:00)** QR tarayıcı
   - "Canlı QR Tarayıcı Aç" butonu
   - Kamera izni ver
   - Bilet QR'ini oku (hazır bilet QR'i ekranında tut)
   - Başarılı check-in animasyonu
   - Hatalı QR senaryosu: oturum QR'i okutma hatası
   - Tarayıcıyı kapat

4. **(11:00–14:00)** Giriş logu
   - "Kapı Giriş Hareketleri Günlüğü"
   - Her kaydı: e-posta, zaman, başarı/hata
   - Logu temizleme

5. **(14:00–17:00)** Offline mod
   - Uçak modunu aç (veya bağlantıyı kes)
   - Check-in dene → "Offline kuyruğa alındı" mesajı
   - Offline kuyruk sayacı
   - İnternet gel → otomatik senkronizasyon
   - "Konferans salonunda WiFi kesildiyse ne olur?" sorusunu cevapla

6. **(17:00–18:00)** Canlı kapı istatistikleri (sol panel)
   - Aktif oturum, kabul sayısı, çevrimiçi/çevrimdışı durum

---

#### Video 4.3 — Mobil Operasyon ve Metrikleri

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Mobil Check-in ve Kapı Akışı Metrikleri

**Anlatım Sırası:**

1. **(0:00–2:00)** Görevli modu nedir?
   - URL'ye `?staff=1` ekle → görevli moduna geç
   - Fark: üst menü yok, sadece check-in ekranı
   - "Telefona bu linki kaydet ve görevliye ver"

2. **(2:00–5:00)** Mobil cihazda check-in testi
   - Telefondan URL aç
   - Kamera izni ver
   - QR tara
   - Yeşil/kırmızı ekran göster (büyük font, uzaktan görülebilsin)

3. **(5:00–9:00)** Kapı akışı metrikleri
   - Sağ panel: Kapı Akışı metrikleri
   - Saat başına kabul hızı
   - Sevk başarı oranı
   - En aktif masa
   - Tekrarlanan tarama sayısı
   - Geçersiz QR sayısı
   - "Darboğaz var mı?" analizini nasıl yaparsın

4. **(9:00–11:00)** Kapasite uyarısı
   - "Salon doluluk uyarısı" bildirimi nasıl tetiklenir
   - Sınır alarma ne zaman gelindiğinde ne gösterir

5. **(11:00–12:00)** Kapanış: check-in sonrası analitik
   - "Check-in verisi daha sonra Advanced Analytics'te ne gösteriyor" — teaser

---

### BÖLÜM 5 — Sertifika Sistemi

---

#### Video 5.1 — Sertifika Şablonu Tasarlama

**Süre:** 18–22 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert Sertifika Şablonu Tasarlama — Özel Tasarım ve Dinamik Alanlar

**Anlatım Sırası:**

1. **(0:00–2:00)** Sertifika sistemi genel bakış
   - "Tasarla → etkinliğe bağla → otomatik ya da manuel gönder"
   - Sertifika = PDF çıktısı, QR doğrulama linki içeriyor

2. **(2:00–10:00)** Şablon editörü
   - Certificates → Şablonlar → Yeni Şablon
   - Arka plan görseli yükleme (A4 yatay, 1920×1358 px önerilir)
   - Dinamik alan ekleme:
     - `{{recipient_name}}` — alıcı adı
     - `{{event_name}}` — etkinlik adı
     - `{{issue_date}}` — tarih
     - `{{cert_number}}` — sertifika numarası
   - Her alanı konumlandırma: sürükle, boyutlandır
   - Font seçimi ve boyutu
   - Renk ayarı
   - İmza görseli yükleme
   - QR kod alanı (doğrulama için otomatik ekleniyor)

3. **(10:00–15:00)** Canlı ön izleme
   - "Önizle" butonu → demo isimle PDF render
   - PDF indir, gerçek görünümü kontrol et
   - Hizalama sorunlarını düzelt
   - "QR kodu sertifika üzerinde küçük ve görünmez kılma hatası" — dikkat

4. **(15:00–18:00)** Şablonu etkinliğe bağlama
   - Etkinlik → Certificates → Şablon Seç
   - Birden fazla şablon: "Katılım Sertifikası" vs "Başarı Sertifikası"
   - Hangi koşulda hangisi → ileriki videoda

5. **(18:00–22:00)** Şablon kopyalama ve düzenleme
   - Mevcut şablonu kopyala → küçük değişiklik yap
   - Versiyonlama önerisi: isimlendirme kuralı (Şablon_v2_2026)

**Gösterilecek Ekranlar:**
- [ ] Şablon listesi (boş ve dolu hali)
- [ ] Şablon editörü — alan ekleme
- [ ] Dinamik alan dropdown'ı
- [ ] PDF önizleme
- [ ] Etkinliğe bağlama ekranı

---

#### Video 5.2 — Sertifika Gönderimi ve Kuralları

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert Otomatik Sertifika Gönderimi — Koşullar ve Toplu Dağıtım

**Anlatım Sırası:**

1. **(0:00–3:00)** Otomatik vs manuel sertifika
   - Otomatik: koşul sağlandığında sistem kendisi gönderir
   - Manuel: admin istediği kişiye tek tek veya toplu verir
   - "Genellikle: etkinlik bitti, koşul kontrolü çalışır, uygun herkese otomatik gönderilir"

2. **(3:00–8:00)** Sertifika koşulları ayarı
   - Certificates → Ayarlar
   - Koşul seçenekleri:
     - Check-in yapıldı mı?
     - Katılım oranı: en az %80
     - Anket tamamlandı mı?
     - Manuel onay gerekiyor mu?
   - Birden fazla koşul: hepsi mi sağlanmalı, herhangi biri mi?

3. **(8:00–12:00)** Toplu sertifika gönderimi
   - Certificates → "Toplu Gönder"
   - Koşulu sağlayan kişi listesini göster
   - Onay → gönder
   - İlerleme barı

4. **(12:00–15:00)** Manuel sertifika verme
   - IssueCertificateModal
   - Katılımcı seç, şablon seç
   - "Bu kişi koşulu sağlamıyor ama özel durumu var" senaryosu

5. **(15:00–18:00)** Sertifika durumları ve iptal
   - Aktif, İptal, Süresi Dolmuş
   - Sertifika iptal etme → doğrulama QR çalışmaz
   - İptal sonrası katılımcı ne görür?

---

#### Video 5.3 — Sertifika Doğrulama

**Süre:** 8–10 dakika  
**Plan Gereksinimi:** Free (doğrulama herkes için açık)  
**SEO Başlığı:** HeptaCert Sertifika Doğrulama — QR Kod ve Online Doğrulama

**Anlatım Sırası:**

1. **(0:00–3:00)** Doğrulama URL'si nasıl çalışır?
   - Sertifika PDF'indeki QR'i tara
   - `heptacert.com/verify/[token]` sayfası
   - Göster: isim, etkinlik, tarih, geçerlilik durumu
   - İptal edilmiş sertifika → "Bu sertifika geçersizdir" göster

2. **(3:00–6:00)** Özel domain ile doğrulama
   - `sertifika.kurumadi.com/verify/...` yapısı
   - "Kurumsal kullanımda kendi domain'inizden doğrulama = marka güveni"

3. **(6:00–10:00)** API ile doğrulama
   - `GET /api/certificates/verify/{token}` endpoint'i
   - Yanıt yapısı: JSON
   - Kullanım senaryosu: "HRMS sisteminiz çalışana işe başlarken sertifikayı otomatik doğrulayabilir"
   - Postman üzerinde demo

---

### BÖLÜM 6 — E-posta ve Otomasyon

---

#### Video 6.1 — E-posta Altyapısı Kurulumu

**Süre:** 12–15 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert SMTP Kurulumu ve E-posta Altyapısı Yapılandırması

**Anlatım Sırası:**

1. **(0:00–2:00)** Neden SMTP kurulumu önemli?
   - Platform e-postası → spam filtresine düşebilir
   - Kendi SMTP → kendi domain'iniz → teslim oranı yüksek

2. **(2:00–7:00)** SMTP yapılandırması
   - Email Ayarları → SMTP Config
   - Sağlayıcı örnekleri: Gmail (uygulama şifresi), Outlook, SendGrid, Mailgun
   - Demo: SendGrid API key ile kurulum
   - Test e-postası gönder
   - Başarı / hata mesajları

3. **(7:00–10:00)** Domain ve SPF/DKIM
   - SPF kaydı nedir? Bir cümle.
   - DKIM nedir? Bir cümle.
   - DNS'e eklenecek kayıtları kopyala
   - "IT ekibinize bu kayıtları iletin — 24-48 saat yayılır"

4. **(10:00–12:00)** E-posta sağlık paneli
   - Email Dashboard
   - Gönderim hacmi, hata oranı, bounce rate
   - Domain bazında istatistik

5. **(12:00–15:00)** Gönderici kimliği
   - "Gönderen Ad" ve "Gönderen E-posta" ayarı
   - Reply-to adresi
   - Altbilgi (unsubscribe linki zorunlu — hatırlat)

---

#### Video 6.2 — E-posta Şablonları

**Süre:** 12–14 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert E-posta Şablonu Oluşturma — Dinamik Değişkenler ve Tasarım

**Anlatım Sırası:**

1. **(0:00–2:00)** Şablon mantığı
   - "Bir kez tasarla, defalarca kullan"
   - Şablon kategorileri: karşılama, hatırlatma, sertifika, teşekkür, anket daveti

2. **(2:00–8:00)** Şablon oluşturma
   - Email Templates → Yeni Şablon
   - İsim ve kategori
   - Konu satırı yazma (dinamik: `{{first_name}}, etkinliğinizi bekliyoruz!`)
   - HTML editörü: blok bazlı
   - Dinamik değişkenler listesi:
     - `{{first_name}}`, `{{last_name}}`
     - `{{event_name}}`, `{{event_date}}`
     - `{{cert_link}}`, `{{ticket_link}}`
     - `{{org_name}}`, `{{org_logo}}`
   - Ön izleme: test verisiyle render

3. **(8:00–11:00)** Test gönderimi
   - "Test Gönder" → kendi e-postana gönder
   - Mobil görünümü kontrol et
   - Spam skoru (varsa entegre araç)

4. **(11:00–14:00)** Şablon kütüphanesi
   - Hazır şablonları kopyala
   - Şablon versiyonları
   - Kullanıldığı etkinlikler → "Bu şablonu silerseniz bağlı otomasyonlar etkilenir" uyarısı

---

#### Video 6.3 — Zamanlanmış E-posta (Schedule Email)

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Otomatik E-posta Kurulumu — Tetikleyiciler ve Zamanlama

**Anlatım Sırası:**

1. **(0:00–2:00)** Zamanlanmış e-posta neden güçlü?
   - "Bir kez kur, sonsuza dek çalışır"
   - Örnek: "Kayıt olan herkes 1 saat sonra hoş geldin maili alır. Etkinlik günü sabah 8'de hatırlatma gider. Etkinlik bitince sertifikası hazır maili gider."
   - "Bunları tek tek kendiniz yapamazsınız — otomasyon yapmalısınız"

2. **(2:00–8:00)** Yeni zamanlanmış e-posta kuralı
   - Schedule Email sekmesi → Yeni Kural
   - **Tetikleyici tipi:**
     - Kayıt sonrası
     - Check-in sonrası
     - Etkinlik başlamadan X saat önce
     - Etkinlik bittikten X saat sonra
     - Belirli tarih ve saatte
   - **Gecikme:** 0 (hemen) / 30 dakika / 2 saat / 1 gün / 3 gün
   - **Şablon seçimi**
   - **Koşul (opsiyonel):**
     - Sadece check-in yapanlara
     - Sertifika almamış olanlara
     - Belirli bilet tipine sahip olanlara

3. **(8:00–13:00)** 3 kural kurulumu (canlı demo)
   - Kural 1: Kayıt → anında hoş geldin
   - Kural 2: Etkinlik 24 saat önce → hatırlatma
   - Kural 3: Etkinlik bittikten 2 saat sonra → sertifika daveti

4. **(13:00–16:00)** Kuralı aktif/pasif etme
   - Toggle ile an/kapat
   - "Etkinlik iptal oldu mu? Tüm kuralları pasife al"
   - Gönderim geçmişi: kaç kişiye, ne zaman, başarı/hata

5. **(16:00–18:00)** Sık yapılan hatalar
   - Gecikmeyi 0 yapmak (hemen göndermek) ve aynı anda 500 kişiye gönderim → rate limit
   - Koşul koymadan "sertifika bağlantısı" içeren mail → sertifika henüz hazır olmayabilir
   - Test etmeden yayına almak → her zaman bir test kaydıyla dene

---

#### Video 6.4 — Toplu E-posta ve Kampanyalar

**Süre:** 12–14 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Toplu E-posta Kampanyası Gönderme

**Anlatım Sırası:**

1. **(0:00–2:00)** Zamanlanmış vs Toplu
   - "Zamanlanmış: otomatik kural. Toplu: şimdi, bu kişilere, bu maili gönder"
   - Kullanım senaryosu: "Etkinlik yerini değiştirdiniz — şimdi herkese bildirmeniz lazım"

2. **(2:00–7:00)** Toplu e-posta gönderimi
   - Bulk Emails → Yeni Kampanya
   - Alıcı listesi: tüm kayıtlılar / segment / manuel seçim
   - Şablon seç
   - Gönderim zamanı: hemen / tarih seçimi
   - "Büyük listelerde rate limiting var — binlerce kişiye gönderimde kuyruk sistemi çalışır"
   - Gönder

3. **(7:00–11:00)** Kampanya analitikleri
   - Açılma oranı
   - Tıklama oranı
   - Bounce ve unsubscribe
   - "Açılma oranı %20'nin altındaysa konu satırını gözden geçirin"

4. **(11:00–14:00)** Otomasyonlar (Automations) kısa bakış
   - Event tetikleyicili karmaşık akışlar
   - "Bu gelişmiş kullanıcılar için — ayrı bir video serisi gerektirebilir"
   - Temel bir akış göster: kayıt → bekleme → check-in yaptı → farklı kol

---

### BÖLÜM 7 — Anket Sistemi

---

#### Video 7.1 — Anket Oluşturma

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Anket Oluşturma — Soru Tipleri ve Harici Entegrasyon

**Anlatım Sırası:**

1. **(0:00–2:00)** Anket neden önemli?
   - "Etkinlik kalitesini ölçmenin en doğrudan yolu"
   - Ek bağlantı: "Anket tamamlamayı sertifika koşuluna bağlayabilirsiniz → tamamlama oranı %90'a çıkar"

2. **(2:00–10:00)** Anket oluşturma
   - Surveys → Yeni Anket
   - **Soru tipleri:**
     - Kısa Metin: "Etkinlik hakkında bir kelime?"
     - Uzun Metin: "Geliştirilmesini istediğiniz konular?"
     - Çoktan Seçmeli: "Konuyu nasıl değerlendirdiniz?" → seçenek ekle
     - Değerlendirme: 1–5 yıldız veya 1–10 skala
     - Evet/Hayır: "Bir sonraki etkinliğimize katılır mıydınız?"
   - Soru zorunluluğu toggle'ı
   - Soru sıralama (drag)
   - Anket ön izlemesi

3. **(10:00–14:00)** Sertifika koşuluna bağlama
   - Certificates → Koşullar → "Anket tamamlandı: Evet"
   - Etki: anket doldurmayan kişi sertifika alamaz
   - "Bu bir baskı unsuru değil, geri bildirim teşviki"

4. **(14:00–18:00)** Harici anket entegrasyonu
   - "Typeform veya Google Forms kullanıyorsanız direkt bağlayabilirsiniz"
   - Surveys → Harici Kaynak → URL gir
   - Tamamlama durumu senkronizasyonu nasıl çalışır

---

#### Video 7.2 — Anket Yanıtlarını Analiz Etme

**Süre:** 12–14 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Anket Analizi — Yanıt Raporları ve CSV Dışa Aktarma

**Anlatım Sırası:**

1. **(0:00–3:00)** Yanıt genel bakışı
   - Surveys → anket seç → Yanıtlar sekmesi
   - Toplam yanıt, tamamlanma oranı, ortalama süre

2. **(3:00–8:00)** Soru bazında analiz
   - Değerlendirme sorusu → ortalama puan + dağılım bar
   - Çoktan seçmeli → pasta grafiği / yüzde dağılım
   - Metin yanıtları → liste (anahtar kelime arama)

3. **(8:00–11:00)** Bireysel yanıt detayı
   - Belirli katılımcının tüm yanıtlarını gör
   - "Anket yanıtını sertifika ile ilişkilendirme" senaryosu

4. **(11:00–14:00)** CSV dışa aktarma
   - Tüm yanıtları Excel/CSV'ye aktar
   - Sütun yapısı
   - "Bu veriyi kendi raporlama araçlarınıza alabilirsiniz"

---

### BÖLÜM 8 — Gamifikasyon ve Rozetler

---

#### Video 8.1 — Rozet Sistemi Kurulumu

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Rozet Sistemi — Katılımcı Motivasyonu ve Kriter Kuralları

**Anlatım Sırası:**

1. **(0:00–2:00)** Gamifikasyon neden işe yarar?
   - Psikoloji: rozetler tamamlama güdüsü yaratır
   - Örnek: "Erken kayıt olan ilk 50 kişiye özel rozet → erken kayıt oranı 2 katına çıkar"

2. **(2:00–8:00)** Rozet oluşturma
   - Gamification → Yeni Rozet
   - İsim: "Erken Kuş", "Devam Ödülü", "Anket Şampiyonu"
   - Renk: 8 renk seçeneği
   - İkon seçimi
   - Açıklama metni

3. **(8:00–14:00)** Kriter kuralları
   - "Kriteria Ekle" butonu
   - **Minimum Oturum Katılımı:** 3 oturum
   - **Minimum Katılım Oranı:** %75
   - **Erken Kayıt Limiti:** ilk 50 kişi
   - **Anket Tamamlandı:** Evet
   - **Sertifika İzni Var:** Evet
   - Birden fazla kriter: hepsi sağlanmalı
   - "Üçüncü oturuma katılan ve anketi dolduran" kombinasyon demo

4. **(14:00–18:00)** Toplu hesaplama
   - "Rozetleri Hesapla" butonu
   - Kaç kişi hangi rozeti hak etti?
   - Hesaplama sonucu listesi

---

#### Video 8.2 — Rozet Dağıtımı ve Takibi

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Rozet Dağıtımı — Otomatik ve Manuel Verme

**Anlatım Sırası:**

1. **(0:00–3:00)** Otomatik rozet dağıtımı
   - Hesaplama sonrası "Dağıt" butonu
   - Katılımcıya bildirim gönderme
   - "Rozet ne zaman görünür?" — anlık

2. **(3:00–7:00)** Manuel rozet verme
   - Katılımcı detayından rozet ekle
   - "VIP listesindeki herkese özel rozet" senaryosu
   - Toplu rozet atama

3. **(7:00–10:00)** Rozet analitikleri
   - Rozet başına alan kişi sayısı
   - En çok kazanılan rozet
   - Zaman bazlı dağıtım

4. **(10:00–12:00)** Katılımcı deneyimi
   - Katılımcı profilinde rozetler nasıl görünüyor
   - "Paylaş" özelliği (LinkedIn vb.) — varsa göster

---

### BÖLÜM 9 — Çekiliş Sistemi

---

#### Video 9.1 — Çekiliş Oluşturma ve Kurallar

**Süre:** 12–14 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Çekiliş Kurulumu — Havuz Kuralları ve Kazanan Ayarları

**Anlatım Sırası:**

1. **(0:00–2:00)** Çekiliş sistemi neden farklı?
   - "Rastgelelik + adalet + sahne sunumu"
   - "Sadece koşulu karşılayanlar havuza giriyor — hile yok"

2. **(2:00–7:00)** Çekiliş oluşturma
   - Raffles → Yeni Çekiliş
   - İsim, açıklama
   - Havuz kuralı: "En az kaç oturuma katılanlar?"
   - Asil kazanan sayısı: 3
   - Yedek kazanan sayısı: 2
   - Tur sayısı (birden fazla ödül için)
   - Tarih ve zamanlama

3. **(7:00–11:00)** Havuz önizlemesi
   - "Uygun Aday Havuzu" göster
   - Kaç kişi koşulu karşılıyor?
   - "Az kişi varsa koşulu gevşetin"

4. **(11:00–14:00)** Çoklu tur çekilişi
   - "3 farklı ödül için 3 ayrı tur"
   - Kazanan bir sonraki tura dahil olur mu? Ayar

---

#### Video 9.2 — Sahne Sunumu — Canlı Çekiliş

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Canlı Çekiliş Sunumu — Sahne Animasyonu ve Operatör Modu

**Anlatım Sırası:**

1. **(0:00–2:00)** İki mod: Sahne vs Operatör
   - Sahne: projeksiyon/büyük ekrana at → animasyon görünümü
   - Operatör: telefondan/laptoptan çekilişi başlat
   - "Sahne ekranı → projeksiyon. Kontrol → elinde tablet"

2. **(2:00–6:00)** Sahne görünümü
   - `/present` URL'sine git
   - Arka plan animasyonu, havuz isimleri döner
   - Bekleme ekranı: "Çekiliş Başlamaya Hazır"

3. **(6:00–11:00)** Operatör görünümü + çekiliş başlatma
   - `?mode=operator` ile aç (telefondan)
   - "Başlat" butonuna bas
   - Senkronize animasyon: sahne ekranında isimler hızlanır, durur
   - Kazanan açıklanır: büyük isim + konfeti animasyonu
   - Asil: yeşil, Yedek: sarı renk
   - Bir sonraki tura geç

4. **(11:00–15:00)** Çekiliş geçmişi
   - Tüm kazananlar listesi
   - Tur bazında özet
   - PDF veya CSV dışa aktarma

5. **(15:00–18:00)** Tekrar oynatma
   - Kaydedilmiş çekiliş sonucunu tekrar sahne modunda gösterme
   - "Etkinlik sonrası sosyal medya videosu için"

---

### BÖLÜM 10 — Analitik ve Raporlar

---

#### Video 10.1 — Temel Analitik

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert Etkinlik Analitikleri — Katılım Trendi ve Temel Metrikler

**Anlatım Sırası:**

1. **(0:00–2:00)** Analitik nerede?
   - Event → Analytics sekmesi (temel)
   - Event → Advanced Analytics sekmesi (ileri)
   - "Temel bu videoda, ileri sonraki videoda"

2. **(2:00–6:00)** Temel metrikler
   - Kayıt trendi (günlük/haftalık)
   - Toplam kayıtlı vs kapasitesi
   - Check-in başarı oranı
   - Bilet satış dağılımı (tip bazında)
   - Sertifika gönderim oranı

3. **(6:00–9:00)** Grafikleri okuma
   - Kayıt spike'ları: "Duyuru sonrası artış görüyorsunuz"
   - Check-in vs Kayıt farkı: "500 kayıt, 420 check-in → %84 katılım oranı"
   - Bilet tipi dağılımı: "VIP daha az satıyor — fiyat veya içerik sorunu"

4. **(9:00–12:00)** Raporları paylaşma
   - CSV dışa aktarma
   - "Yöneticiye sunmak için Excel'e al, pivot tablo yap"

---

#### Video 10.2 — İleri Analitik

**Süre:** 18–20 dakika  
**Plan Gereksinimi:** Enterprise  
**SEO Başlığı:** HeptaCert İleri Analitik — Engagement Skoru, Rozet Dağılımı ve Trend Analizi

**Anlatım Sırası:**

1. **(0:00–2:00)** Neden İleri Analitik?
   - "Temel analitik ne oldu gösterir. İleri analitik neden oldu ve ne yapmalısın gösterir"

2. **(2:00–6:00)** Engagement tab
   - Engagement skoru nedir? (check-in + anket + sertifika kombinasyonu)
   - Skor dağılımı: yüksek/orta/düşük engagement segmentleri
   - "Düşük engagement grubuna özel takip maili"

3. **(6:00–10:00)** Sertifika trendleri
   - Günlük sertifika dağıtım grafiği
   - "Toplu gönderim yapıldıktan 2 gün sonra indirme piki — normali bu"
   - İptal oranı ve sebepleri

4. **(10:00–14:00)** Rozet analitikleri tab
   - Hangi rozetler en çok alınmış
   - Kriterlere göre ulaşım oranı
   - "Minimum oturum katılımı kriterini düşürünce rozet alan sayısı nasıl değişir"

5. **(14:00–17:00)** Katılımcı katman analizi (Tiers)
   - Sertifika varlığına göre katman dağılımı
   - Zaman çizelgesi görünümü

6. **(17:00–20:00)** Dashboard'a pin etme
   - Önemli metriği sabitleyebilir misiniz? → göster

---

#### Video 10.3 — E-posta Analitikleri

**Süre:** 8–10 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert E-posta Analitik Raporu — Açılma Oranı ve Teslim Sorunları

**Anlatım Sırası:**

1. **(0:00–3:00)** E-posta analitik paneli
   - Email Analytics sayfası
   - Gönderim hacmi, açılma oranı, tıklama oranı, bounce, unsubscribe

2. **(3:00–7:00)** Metrikleri yorumlama
   - Açılma oranı %20-30: normal, %15 altı: konu satırını değiştir
   - Bounce %5 üzeri: domain temizliği gerekli
   - Unsubscribe yüksekse: hedefleme sorunu

3. **(7:00–10:00)** Domain bazında rapor
   - Gmail vs Outlook vs diğer
   - "Gmail filtreleri sıkı — SPF/DKIM zorunlu"
   - Aksiyon: bounce listesi → bu adresleri sisteme engelle

---

### BÖLÜM 11 — Entegrasyonlar ve API

---

#### Video 11.1 — API Anahtarları Yönetimi

**Süre:** 12–14 dakika  
**Plan Gereksinimi:** Enterprise  
**SEO Başlığı:** HeptaCert API Key Yönetimi — Güvenli Entegrasyon Kurulumu

**Anlatım Sırası:**

1. **(0:00–2:00)** API ne zaman gerekli?
   - Senaryolar: "HRMS → HeptaCert katılımcı sync", "Web sitesi → etkinlik listesi çekme", "Custom dashboard"

2. **(2:00–7:00)** API anahtarı oluşturma
   - API Keys → Yeni Anahtar
   - İsim: "Prod-HRMS-Entegrasyon"
   - Kapsam seçimi (varsa)
   - Oluştur → **tek seferlik görüntüleme**
   - "Bu anahtarı şimdi kopyalayın — bir daha göremezsiniz"
   - Güvenli saklama yöntemleri: ortam değişkeni, secret manager

3. **(7:00–10:00)** Güvenlik kuralları
   - Git geçmişine ekleme: **asla**
   - Staging ve Production için ayrı anahtar
   - Rate limiting: kaç istek/dakika
   - Anahtarı iptal etme

4. **(10:00–14:00)** API kullanımı
   - Authorization header: `Bearer <API_KEY>`
   - Postman üzerinde temel istek
   - Yanıt yapısı
   - Hata kodları

---

#### Video 11.2 — Webhook Sistemi

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Enterprise  
**SEO Başlığı:** HeptaCert Webhook Kurulumu — Olayları Kendi Sisteminize Gönderme

**Anlatım Sırası:**

1. **(0:00–2:00)** Webhook nedir?
   - "API'de siz sorarsınız. Webhook'ta sistem size söyler"
   - Örnek: "Katılımcı check-in yapınca Slack'e mesaj gönder"

2. **(2:00–8:00)** Webhook oluşturma
   - Webhooks → Yeni Webhook
   - Endpoint URL: webhook.site üzerinden test URL'i al (demo için)
   - Olay seçimi:
     - `attendee.registered`
     - `attendee.checked_in`
     - `certificate.issued`
     - `ticket.purchased`
   - Secret key (imza doğrulama için)
   - Kaydet → test gönder

3. **(8:00–13:00)** Webhook.site üzerinde payload inceleme
   - Gelen JSON yapısı
   - Event type, timestamp, data objesi
   - "Kendi sisteminizde bu payload'ı nasıl işlersiniz" — örnek Python kodu

4. **(13:00–16:00)** İmza doğrulama
   - `X-Heptacert-Signature` header'ı
   - HMAC-SHA256 hesaplama
   - "İmzayı doğrulamayan sistemler güvenlik açığı taşır"

5. **(16:00–18:00)** Webhook log takibi
   - Webhook Logs sayfası
   - Başarısız gönderimler
   - Retry mekanizması
   - "Endpoint'iniz 5xx verirse sistem otomatik tekrar dener"

---

#### Video 11.3 — SSO ve OIDC Entegrasyonu

**Süre:** 12–14 dakika  
**Plan Gereksinimi:** Enterprise  
**SEO Başlığı:** HeptaCert SSO Kurulumu — Microsoft ve Google ile Kurumsal Giriş

**Anlatım Sırası:**

1. **(0:00–2:00)** SSO neden önemli kurumsal kullanımda?
   - "500 kişilik şirket. Her çalışanın ayrı şifre oluşturması değil — kurumsal hesapla direkt giriş"
   - "IT güvenlik politikasıyla uyumlu"

2. **(2:00–7:00)** Microsoft Entra ID (Azure AD) entegrasyonu
   - Azure portal'da uygulama kaydı adımları (kısa)
   - Client ID, Client Secret, Tenant ID
   - HeptaCert → Integrations → OIDC/SSO
   - Değerleri gir, kaydet
   - Test girişi

3. **(7:00–11:00)** Google Workspace entegrasyonu
   - Google Cloud Console → OAuth ayarları
   - Redirect URI ekle
   - HeptaCert'e gir
   - Test

4. **(11:00–14:00)** SSO ile kullanıcı deneyimi
   - Katılımcı kayıt sayfasında "Microsoft ile Giriş Yap" butonu
   - Admin panelinde SSO kullanıcısı yönetimi

---

#### Video 11.4 — HubSpot Entegrasyonu

> Bkz. Video 2.3 CRM — Bu konunun önemli kısmı CRM videosunda ele alınıyor. Bu video daha teknik ve bağımsız entegrasyon kurulumu için.

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Enterprise  
**SEO Başlığı:** HeptaCert HubSpot Entegrasyonu — Kurumsal CRM Senkronizasyonu

**Anlatım Sırası:**

1. **(0:00–2:00)** Neden HubSpot entegrasyonu?
   - "Satış ve pazarlama HubSpot kullanıyor, etkinlik yönetimi HeptaCert — veriyi köprüle"

2. **(2:00–6:00)** HubSpot Private App Token alma
   - HubSpot → Settings → Integrations → Private Apps
   - Yeni app oluştur, scopes: contacts (read/write)
   - Token kopyala

3. **(6:00–10:00)** HeptaCert'e bağlama ve push
   - CRM → HubSpot alanı → token gir → kaydet → test
   - Katılımcıları seç → Push
   - HubSpot Contacts'ta görüntüle

4. **(10:00–12:00)** Senkronizasyon mantığı
   - Yeni kişi → HubSpot'a create
   - Mevcut kişi → update
   - Çakışma yönetimi

---

### BÖLÜM 12 — Gelişmiş Ayarlar

---

#### Video 12.1 — Özel Domain Kurulumu

**Süre:** 12–14 dakika  
**Plan Gereksinimi:** Enterprise  
**SEO Başlığı:** HeptaCert Özel Domain — Sertifika Doğrulama Sayfasını Kendi Alan Adınıza Taşıyın

**Anlatım Sırası:**

1. **(0:00–2:00)** Neden özel domain?
   - `heptacert.com/verify/...` → `sertifika.kurumadi.com/verify/...`
   - "Kurumsal güven: kendi alan adınızdan sertifika"

2. **(2:00–7:00)** Domain ekleme ve DNS
   - Ayarlar → Domain
   - Alt domain gir: `sertifika.kurumadi.com`
   - Sistem CNAME kaydını gösterir
   - DNS sağlayıcısında kaydı ekle (Cloudflare örneği)
   - "Yayılma süresi 1–24 saat"

3. **(7:00–10:00)** Doğrulama ve SSL
   - Domain doğrulama butonu
   - SSL sertifikası otomatik alınır (Let's Encrypt)
   - Test: doğrulama URL'sini aç

4. **(10:00–14:00)** Sertifika e-postasında özel domain
   - E-posta şablonundaki `{{cert_link}}` artık özel domain kullanıyor
   - Demo: sertifika gönder → linke tıkla → özel domain göster

---

#### Video 12.2 — Marka Kimliği ve Beyaz Etiket

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Growth ve üzeri  
**SEO Başlığı:** HeptaCert Marka Özelleştirme — Logo, Renk ve Beyaz Etiket Kurulumu

**Anlatım Sırası:**

1. **(0:00–3:00)** Marka tutarlılığı neden önemli?
   - Sertifika, e-posta, kayıt formu — hepsi aynı marka kimliği
   - "Kurumunuzun dışarıya sunduğu yüz"

2. **(3:00–8:00)** Marka ayarları
   - Ayarlar → Marka Kimliği
   - Logo yükle (light ve dark versiyon)
   - Birincil renk seçimi
   - Yazı tipi seçimi
   - E-posta altbilgisi özelleştirme
   - "HeptaCert ile Güçlendirilmiştir" yazısını kaldırma (Enterprise)

3. **(8:00–12:00)** Değişikliklerin yansıdığı yerler
   - Katılımcı kayıt formu
   - E-posta şablonları
   - Sertifika şablonu (zaten özel — ama footer)
   - Sertifika doğrulama sayfası

---

#### Video 12.3 — KVKK ve Uyumluluk

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Tüm planlar  
**SEO Başlığı:** HeptaCert KVKK Uyumluluğu — Açık Rıza ve Veri Yönetimi

**Anlatım Sırası:**

1. **(0:00–2:00)** KVKK Türkiye'de zorunlu mu?
   - Kısa yasal durum: "Kişisel veri işleyen herkes için zorunlu"
   - "Platform size altyapıyı veriyor — içeriği siz dolduruyorsunuz"

2. **(2:00–6:00)** Açık rıza metni yönetimi
   - Ayarlar → Uyumluluk
   - Mevcut KVKK metni görüntüleme ve düzenleme
   - Etkinlik başına özel metin ekleme
   - "Bu metni hukuk danışmanınızla hazırlayın"

3. **(6:00–9:00)** Rıza log görüntüleme
   - Katılımcı kayıt sırasında onay kutusunu işaretledi mi?
   - Zaman damgası ve IP adresi kaydı
   - "Denetimde ispat belgesi olarak kullanılabilir"

4. **(9:00–12:00)** Veri silme talebi
   - Katılımcı "Verilerimi sil" talep ettiğinde akış
   - Admin tarafından silme
   - "Silme sonrası sertifika doğrulama ne olur?" — göster

---

### BÖLÜM 13 — Abonelik ve Plan Yönetimi

---

#### Video 13.1 — Plan Karşılaştırması ve Feature Gate Sistemi

**Süre:** 10–12 dakika  
**Plan Gereksinimi:** Yok (tanıtım)  
**SEO Başlığı:** HeptaCert Plan Karşılaştırması — Hangi Özellik Hangi Plandan?

**Anlatım Sırası:**

1. **(0:00–3:00)** Plan yapısı
   - Free / Starter / Growth / Enterprise
   - Her plan için ana özellik sınırları
   - Fiyatlandırma sayfasına git (anlık fiyat)

2. **(3:00–7:00)** Feature Gate nedir?
   - "İleri analitik" butonuna bas → "Enterprise plan gerekiyor" mesajı
   - "Bu çalışma şekli: kullanmak istediğinizde yükseltmenizi sağlar"
   - Hangi sayfalar hangi planla açılır — liste

3. **(7:00–10:00)** Plan seçim rehberi
   - "100 kişilik tek etkinlik → Free veya Starter yeterli"
   - "Yıllık 10+ etkinlik, otomasyon lazım → Growth"
   - "API, SSO, HubSpot, özel domain → Enterprise"

4. **(10:00–12:00)** Plan değiştirme
   - Ayarlar → Abonelik
   - Yükseltme/düşürme akışı
   - Anında mı, dönem sonunda mı?

---

#### Video 13.2 — Ödeme ve Fatura

**Süre:** 8–10 dakika  
**Plan Gereksinimi:** Starter ve üzeri  
**SEO Başlığı:** HeptaCert Abonelik Ödemesi ve Fatura Yönetimi

**Anlatım Sırası:**

1. Abonelik satın alma adımları
2. Ödeme yöntemi ekleme
3. Fatura geçmişi ve indirme
4. İptal politikası
5. "Yıllık ödeme avantajı"

---

### BÖLÜM 14 — SuperAdmin Paneli

> ⚠️ Bu bölüm sadece platform yöneticileri (HeptaCert operatörleri) içindir. Bireysel müşteriler için değil.

---

#### Video 14.1 — SuperAdmin Genel Bakış

**Süre:** 12–14 dakika  
**SEO Başlığı:** HeptaCert SuperAdmin Paneli — Platform Yönetimi ve Sistem Sağlığı

**Anlatım Sırası:**

1. SuperAdmin erişimi nasıl alınır?
2. Dashboard: toplam kurum, etkinlik, sertifika sayıları
3. Sistem Sağlık paneli (Health): servis durumları
4. Sistem Digest: günlük/haftalık özet
5. Autonmatik uyarılar ve eşikler

---

#### Video 14.2 — Kurum ve Kullanıcı Yönetimi

**Süre:** 10–12 dakika  
**SEO Başlığı:** HeptaCert SuperAdmin Kurum Yönetimi

**Anlatım Sırası:**

1. Kurumlar listesi: arama, filtre
2. Kurum detayı: plan, kullanım, etkinlikler
3. Plan değiştirme (SuperAdmin tarafından)
4. Kurum askıya alma/aktif etme
5. Waitlist yönetimi: onaylama akışı

---

#### Video 14.3 — Destek ve İzleme

**Süre:** 10–12 dakika  
**SEO Başlığı:** HeptaCert SuperAdmin Destek Takibi ve Audit Logları

**Anlatım Sırası:**

1. Support Tickets listesi ve yanıtlama
2. Audit Log: kim ne zaman ne yaptı
3. Mail Log: gönderim izleme ve hata
4. Ödeme sorun giderme adımları

---

### BÖLÜM 15 — Gerçek Hayat Senaryoları

---

#### Video 15.1 — Üniversite Kongre Senaryosu (Uçtan Uca)

**Süre:** 20–25 dakika  
**Plan Gereksinimi:** Growth  
**SEO Başlığı:** HeptaCert ile Üniversite Kongresi Yönetimi — Tam Akış

**Senaryo:** "3 günlük Bilgisayar Mühendisliği Kongresi, 400 kayıt, 8 paralel oturum, sertifika koşulu: en az 4 oturum check-in + anket"

**Anlatım Sırası:**

1. **(0:00–3:00)** Senaryo tanıtımı ve gereksinimler
2. **(3:00–8:00)** Etkinlik kurulumu (tüm özellikler açık)
3. **(8:00–12:00)** 8 oturum oluşturma + görevli atama
4. **(12:00–16:00)** Kayıt formu + KVKK + sayfa düzenleme
5. **(16:00–19:00)** Sertifika şablonu + koşullar (4 oturum + anket)
6. **(19:00–22:00)** Check-in günü: 3 kapı, 3 görevli, offline test
7. **(22:00–25:00)** Kongre bitti: analitik bakışı + toplu sertifika gönderimi

---

#### Video 15.2 — Kurumsal Eğitim Sertifikası Senaryosu

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Starter  
**SEO Başlığı:** HeptaCert ile Şirket İçi Eğitim Sertifikası — HR Kullanım Senaryosu

**Senaryo:** "50 kişilik "Siber Güvenlik Farkındalığı" eğitimi, katılım %100 zorunlu, sertifika koşulsuz (herkese), SMTP kendi şirket sunucusu"

**Anlatım Sırası:**

1. Etkinlik kurulumu (çok basit, sadece certificate + checkin)
2. Kendi SMTP bağlantısı
3. Özel sertifika şablonu (şirket logolu)
4. Toplu katılımcı import (HR listesi)
5. Eğitim günü check-in
6. Etkinlik bitti → tüm katılımcılara otomatik sertifika
7. API ile HRMS'e kayıt düşme fikri (teaser)

---

#### Video 15.3 — Büyük Etkinlik Operasyonu Senaryosu

**Süre:** 15–18 dakika  
**Plan Gereksinimi:** Enterprise  
**SEO Başlığı:** HeptaCert ile 1000+ Kişilik Etkinlik Yönetimi — Kapı Akışı ve Çekiliş Finali

**Senaryo:** "Teknoloji festivali, 1500 bilet, 6 kapı, offline hazırlık, kapanış çekilişi"

**Anlatım Sırası:**

1. Kapasite planlaması ve bilet tipleri
2. 6 görevli için 6 ayrı check-in cihazı kurulumu
3. Offline moda hazırlık: "Arızaya karşı ne yapırsınız?"
4. Canlı kapı akışı metriklerini monitörden izleme
5. Doluluk uyarısı geldiğinde aksiyon
6. Kapanış: çekiliş kurulumu + sahne sunumu
7. Etkinlik sonrası: analitik özeti + sertifika + e-posta kampanyası

---

## 7. Thumbnail ve SEO Rehberi

### 7.1 Thumbnail Tasarım Şablonu

**Boyut:** 1280×720 px  
**Yapı:**
```
[Sol %40]  HeptaCert logosu + bölüm numarası
[Sağ %60]  Konuyu anlatan screenshot veya ikon
[Alt şerit] Video başlığı — kalın, beyaz, koyu arka plan
```

**Renk paleti:** Marka rengi + beyaz + koyu gri  
**Font:** Bold, en az 60px — küçük ekranda da okunabilmeli

### 7.2 YouTube Başlık Formatı

```
HeptaCert [Konu] — [Ne Öğreneceksiniz] | Bölüm X.Y
```

Örnekler:
- `HeptaCert Check-in Sistemi — QR Okutma ve Offline Mod | Bölüm 4.2`
- `HeptaCert Sertifika Şablonu Tasarlama — Adım Adım | Bölüm 5.1`

### 7.3 Açıklama Kutusu Şablonu

```
Bu videoda: [2 cümle özet]

⏱ Bölümler:
0:00 Giriş
X:XX [Konu 1]
X:XX [Konu 2]
...

📋 Bu özellik için gereken plan: [Plan adı]

🔗 Faydalı Linkler:
• HeptaCert: https://heptacert.com
• Dokümantasyon: https://docs.heptacert.com
• Bu Serinin Oynatma Listesi: [link]

#HeptaCert #EtkinlikYönetimi #Sertifika
```

### 7.4 Etiket (Tag) Listesi — Her Videoya Ekle

```
HeptaCert, etkinlik yönetimi, sertifika platformu, etkinlik sertifikası,
check-in sistemi, QR kod check-in, katılımcı yönetimi, e-posta otomasyonu,
etkinlik analitik, rozet sistemi, gamifikasyon, çekiliş sistemi,
KVKK uyumluluk, API entegrasyon, webhook, HubSpot entegrasyon
```

---

## 8. Yayın Kontrol Listesi

### Her Video Çekim Öncesi
- [ ] Demo hesabı temizlendi (önceki çekimden kalan veri yok)
- [ ] Demo etkinlik hazır (tarihler güncellendi)
- [ ] Demo katılımcı listesi yüklü
- [ ] SMTP test sunucusu aktif
- [ ] Ekran çözünürlüğü 1080p, zoom %100
- [ ] Bildirimler kapalı
- [ ] Mikrofon test edildi
- [ ] Senaryo son kez okundu

### Her Video Kurgu Sonrası
- [ ] Kişisel/gizli bilgi ekranda görünmüyor
- [ ] Gerçek müşteri adı/verisi yok
- [ ] Ses seviyesi dengeli
- [ ] Açılış ve kapanış var
- [ ] Plan bandı görünüyor
- [ ] Alt yazı (otomatik veya manuel) eklendi

### Her Video Yayın Öncesi
- [ ] Thumbnail yüklendi
- [ ] Başlık formata uygun
- [ ] Açıklama kutusu dolduruldu (bölümler, linkler, etiketler)
- [ ] Oynatma listesine eklendi
- [ ] End screen kuruldu (sonraki video + playlist)
- [ ] Kartlar eklendi (ilgili video referansları)
- [ ] Yayın zamanı planlandı (hafta içi sabah 9 önerilir)

### Seri Tamamlanınca
- [ ] Tüm videolar tek oynatma listesinde
- [ ] Playlist açıklaması yazıldı
- [ ] heptacert.com/egitim sayfasına gömüldü
- [ ] Sosyal medya duyurusu yapıldı
- [ ] Dönemsel güncelleme takvimi belirlendi (6 ayda bir gözden geçir)

---

*Bu doküman canlı tutulmalıdır. Platform güncellemeleri sonrasında ilgili bölümler revize edilmelidir.*
