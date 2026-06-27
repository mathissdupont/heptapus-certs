# HeptaCert Sistem Use-Case Dokumani (Sunum Metni)

## 1) Sistem Ozeti

HeptaCert, etkinlik yonetimi, katilimci kaydi, sertifika uretimi ve sertifika dogrulama akisini tek platformda birlestiren bir sistemdir.

Sistem iki ana alani kapsar:
- Etkinlik ve sertifika yonetimi (admin odakli)
- Topluluk ve kesif deneyimi (public member odakli)

Bu dokumanin amaci, sunumda dogrudan kullanilabilecek sekilde:
- Temel use-case akislarini
- Sertifikalarin hangi guvenlik sistemiyle uretildigini
- Hangi algoritmalarin kullanildigini
tek bir yerde net ve detayli anlatmaktir.

---

## 2) Aktorler

- Superadmin: Tum sistemde tam yetki sahibi yonetici
- Admin: Kendi etkinliklerini yoneten, katilimci ve sertifika surecini isleten kullanici
- Public Member (Katilimci): Etkinlige kayit olan, sertifika sahibi olabilen ve toplulukta etkilesime giren kullanici
- Dogrulayici (3. kisi): Sertifikanin gecerliligini UUID/QR veya gorsel yukleme ile kontrol eden kisi

---

## 3) Is Hedefleri

- Sahtecilige dayanikli sertifika uretmek
- Sertifikanin kamuya acik, hizli ve guvenilir sekilde dogrulanabilmesini saglamak
- Etkinlik operasyonunu (kayit, check-in, sertifika dagitimi) olceklenebilir hale getirmek
- Topluluktaki iceriklerin bot/suni etkilesim yerine gercek etkilesimle one cikmasini saglamak

---

## 4) Ana Use-Case Listesi

1. Etkinlik olusturma ve yonetme
2. Katilimci kaydi ve check-in
3. Sertifika uretme (tekli/toplu)
4. Sertifika dogrulama (UUID/QR)
5. Sertifika dogrulama (gorsel icindeki gorunmez damga)
6. Sertifika durum yonetimi (active/revoked/expired)
7. Toplulukta icerik kesfi (Trending/Popular/Recent)
8. Rol ve plan tabanli yetkilendirme

---

## 5) Detayli Use-Case Tanimlari

## UC-01: Etkinlik Olusturma ve Yonetme

Amaç:
Adminin yeni etkinlik acmasi, etkinlik ayarlarini guncellemesi ve operasyonu yonetmesi.

On Kosullar:
- Kullanici girisi yapmis olmalidir.
- Kullanici rolu admin veya superadmin olmalidir.

Ana Akiș:
1. Admin panelinden yeni etkinlik olusturulur.
2. Etkinlik temel bilgileri (ad, tarih, template vb.) kaydedilir.
3. Etkinlige ait session/katilimci akislari tanimlanir.
4. Etkinlik yayina alinir.

Alternatif Akiș:
1. Yetkisiz rol ile islem yapilmaya calisilirsa 403 doner.
2. Gecersiz veri girisinde dogrulama hatasi doner.

Sonuc:
- Etkinlik olusur ve sertifika uretilmesine hazir hale gelir.

---

## UC-02: Katilimci Kaydi ve Check-in

Amaç:
Katilimcinin etkinlige kaydolmasi ve check-in ile sertifika uygunlugu kazanmasi.

On Kosullar:
- Etkinlik yayinda olmalidir.
- Katilimci kayit formu erisilebilir olmalidir.

Ana Akiș:
1. Katilimci kayit olur.
2. Etkinlik gunu check-in islemi yapilir.
3. Sistem katilim kaydini attendance olarak isler.
4. Katilimci sertifika uygun listesine girer.

Alternatif Akiș:
1. Cift kayit/tekrar check-in girisimleri kurallara gore engellenir.

Sonuc:
- Katilimci sertifika uretim surecine dahil edilir.

---

## UC-03: Sertifika Uretme (Tekli/Toplu)

Amaç:
Uygun katilimcilar icin sertifika PDF ve dogrulama gorseli uretmek.

On Kosullar:
- Admin yetkisi ve gerekli plan kosullari saglanmis olmalidir.
- Etkinlikte uygun katilimci verisi bulunmalidir.

Ana Akiș:
1. Sistem her katilimci icin benzersiz UUID uretir (uuid4).
2. Etkinlik bazli sirali public_id olusturulur (format: EV{event_id}-{seq}).
3. Sertifika tasarimi uzerine ad, public_id, QR ve guvenlik oge(leri) yerlestirilir.
4. PDF cikti uretilir ve dijital olarak imzalanir.
5. Ayrica PNG cikti uretilir ve gorunmez dijital damga gomulur.
6. Sertifika kaydi veritabanina active statusu ile yazilir.

Alternatif Akiș:
1. Imzalama hatasi olursa sistem fallback ile imzasiz PDF doner (uretim durmaz).
2. Watermark gommede hata olursa watermarksiz PNG fallback kullanilir.

Sonuc:
- Sertifika dosyalari depolanir, dogrulama linki aktif olur.

---

## UC-04: Sertifika Dogrulama (UUID/QR)

Amaç:
Belge sahibinin veya 3. kisinin UUID/QR ile sertifika gecerliligini aninda kontrol etmesi.

On Kosullar:
- Sertifikanin verify URL/UUID bilgisi bulunmalidir.

Ana Akiș:
1. Kullanici dogrulama sayfasina UUID ile gelir.
2. Sistem sertifika kaydini bulur.
3. Sertifikanin durumu kontrol edilir (active/revoked/expired).
4. Sonuc ekrana dondurulur (katilimci, etkinlik, tarih, durum).

Alternatif Akiș:
1. Kayit yoksa 404/invalid sonucu doner.
2. Hosting suresi dolmussa status expired olarak isaretlenir.

Sonuc:
- Belgenin gecerliligi, durum bilgisi ve izlenebilirligi saglanir.

---

## UC-05: Sertifika Dogrulama (Gorsel + Gorunmez Damga)

Amaç:
Gorsel dosya yukleyerek sertifikanin icindeki gorunmez damgadan kimlik dogrulamak.

On Kosullar:
- Gorsel dosya image/* tipinde olmalidir.
- Dosya boyutu sistem limitini asmamalidir.

Ana Akiș:
1. Kullanici sertifika gorselini yukler.
2. Sistem gorunmez damgayi cikarir.
3. Cikarilan payload (public_id) ile veritabaninda sertifika aranir.
4. Kayit ve status active ise valid doner.

Alternatif Akiș:
1. Damga bulunamazsa invalid doner.
2. Damga bulundu ama kayit yoksa supheli durum mesaji doner.

Sonuc:
- QR/UUID girisi olmadan da gorsel tabanli orijinallik kontrolu yapilir.

Not:
- Implementasyonda kayipsiz PNG dogrulama icin esas formattir. JPEG gibi kayipli donusumlerde LSB tabanli damga bozulabilecegi icin orijinal PNG onerilir.

---

## UC-06: Sertifika Durum Yonetimi (Active/Revoked/Expired)

Amaç:
Sertifika yasam dongusunu guvenli sekilde yonetmek.

Durumlar:
- active: Gecerli ve goruntulenebilir
- revoked: Iptal edilmis
- expired: Suresi dolmus

Ana Akiș:
1. Dogrulama aninda durum hesaplanir/kontrol edilir.
2. Sure asimi varsa active -> expired gecisi uygulanir.
3. Revoked/expired belgelerde erisim ve guven sinyalleri buna gore sinirlanir.

Sonuc:
- Sertifikanin yalnizca gecerli oldugu surece aktif kabul edilmesi saglanir.

---

## UC-07: Topluluk Kesfi ve Siralama

Amaç:
Topluluktaki paylasimlari bot etkisinden arindirip kaliteli icerigi one cikarmak.

Ana Akiș:
1. Postlar icin virality, quality, velocity, freshness skorleri hesaplanir.
2. Agirlikli final skor uretilir.
3. Kullaniciya Trending / Popular / Recent modlarinda liste sunulur.

Sonuc:
- Yeni ama hizla buyuyen ve yorum etkileşimi yuksek postlar daha adil sekilde kesfedilir.

---

## 6) Sertifikalari Hangi Guvenlik Sistemiyle Uretiyoruz?

HeptaCert sertifika guvenligi tek bir katmana degil, cok katmanli bir guven modeline dayanir:

1. Kimlik ve yetki guvenligi
- JWT tabanli kimlik dogrulama (HS256)
- Rol tabanli yetkilendirme (superadmin/admin/public_member)
- Plan bazli erisim kontrolu (ozellik bazli gate)

2. Uretim guvenligi
- Her sertifika icin benzersiz UUID (uuid4)
- Etkinlik bazli izlenebilir public_id uretimi
- Sertifika icerigine dogrulama URL'si ve QR kod yerlestirme

3. Kriptografik PDF imzalama
- pyHanko ile PDF icine gorunmez dijital imza alani eklenir
- Ilk calismada self-signed P12 sertifika uretilir ve tekrar kullanilir
- Anahtar algoritmasi: RSA 2048
- Ozet/imza algoritmasi: SHA-256
- Sertifika anahtari PKCS#12 formatinda sifreli saklanir

4. Gorsel tabanli steganografik koruma
- PNG ciktiya gorunmez dijital damga gomulur
- LSB steganografi (Red channel LSB) + tekrar kodlama (REPS=32)
- Magic header: HC1 (yanlis pozitifleri azaltmak icin)
- Cikarma asamasinda majority voting ile bit geri kazanimi

5. Dogrulama ve yasam dongusu guvenligi
- /api/verify/{uuid} ile kayit/durum kontrolu
- /api/verify-watermark ile gorsel icinden payload cikarma ve kayit eslestirme
- active/revoked/expired durum yonetimi

6. API ve veri katmani guvenligi
- Rate limiting
- Giris dogrulama (Pydantic)
- SQLAlchemy parametreli sorgular (SQL injection riskini azaltir)
- Path traversal korumasi ve kontrollu dosya servisleme

---

## 7) Hangi Algoritmalari Kullaniyoruz?

## 7.1 Sertifika guvenlik algoritmalari

1. UUID uretimi
- Algoritma: UUIDv4
- Amac: Sertifika bazinda global benzersiz kimlik

2. PDF dijital imzalama
- Asimetrik anahtar: RSA-2048
- Ozet algoritmasi: SHA-256
- Arac: pyHanko

3. Steganografik watermark
- Teknik: LSB (Least Significant Bit) steganography
- Dayaniklilik artirimi: repetition coding (REPS=32)
- Cozumleme: majority voting
- Cerceve: HC1 + uzunluk + payload

4. QR guvenilirligi
- QR olusturma: qrcode kutuphanesi
- Logo bindirme durumunda yuksek hata duzeltme seviyesi (H)

## 7.2 Topluluk kesif algoritmasi

Topluluk icerigi icin agirlikli bir skor modeli kullanilir:

finalScore = (Virality x 0.40) + (Quality x 0.30) + (Velocity x 0.20) + (Freshness x 0.10)

Alt sinyaller:
- Virality: Etkilesimin ne kadar hizli buyudugu
- Quality: Yorum derinligi ve like/comment dengesi
- Velocity: Kisa vadeli momentum penceresi
- Freshness: Zamansal tazelik etkisi

Bu model bot-benzeri yuzeysel etkilesimi zayiflatip gercek tartisma ureten postlari one cikarir.

---

## 8) Sunumda Kullanilacak Kisa Mesajlar

- HeptaCert, sertifika guvenligini tek bir kontrolle degil, kimlik + kriptografi + steganografi + dogrulama katmanlariyla saglar.
- PDF tarafinda RSA-2048 + SHA-256 dijital imza, gorsel tarafinda LSB tabanli gorunmez damga birlikte calisir.
- Dogrulama sadece UUID/QR ile degil, gorsel yukleyerek de yapilabildigi icin sahtecilik maliyeti artar.
- Topluluk algoritmasinda basit like sayisi degil, kalite ve momentum odakli agirlikli model kullanilir.

---

## 9) NFR (Sunumda Vurgulanacak)

- Guvenlik: Cok katmanli dogrulama ve imza
- Izlenebilirlik: Verification hit ve durum kayitlari
- Dayaniklilik: Uretimde fallback mekanizmalari (imza/watermark)
- Olceklenebilirlik: Toplu sertifika ve asenkron operasyonlara uygun yapi
- Kullanilabilirlik: UUID/QR ve gorsel yukleme ile kolay dogrulama deneyimi

---

## 10) Sonuc

HeptaCert'in use-case modeli, etkinlikten dogrulamaya kadar tum akislari tek cati altinda toplar. Sertifika guvenligi tarafinda RSA-2048 + SHA-256 dijital imza ve LSB tabanli gorunmez damga birlikte kullanilarak hem kriptografik hem de operasyonel guvence saglanir. Topluluk tarafinda ise virality/quality/velocity/freshness tabanli siralama ile adil ve nitelikli icerik kesfi hedeflenir.
