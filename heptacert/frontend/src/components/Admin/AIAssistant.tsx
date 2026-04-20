"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, AlertCircle, Lightbulb } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getToken } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

// FAQ Bilgi Tabanı
const FAQ_DATABASE = {
  tr: [
    { keywords: ["form", "alan", "registration", "field", "kayıt"], answer: "Form alanlarını eklemek için Etkinlik Ayarları > Kayıt Formu bölümüne gidin. '+Alan Ekle' butonunu tıklayarak yeni alanlar oluşturabilirsiniz. Her alan için türünü (metin, e-posta, tarih vb.), etiketini ve yardımcı metni belirleyebilirsiniz. Alan tipleri: Kısa Metin, E-posta, Telefon, Sayı, Tarih, Çoktan Seçmeli, Dosya Yükleme gibi seçenekler bulunmaktadır." },
    { keywords: ["sertifika", "certificate", "template", "şablon"], answer: "Sertifika şablonlarını Editor sayfasında özelleştirebilirsiniz. Şablonlara arka plan, logoları, metinleri ve tarzları ekleyebilirsiniz. Önizleme alanında değişiklikleri hemen görebilirsiniz. Sertifika yayınlanmadan önce test katılımcılarla kontrol edebilirsiniz." },
    { keywords: ["attendee", "katılımcı", "participant", "member", "üye"], answer: "Katılımcılar bölümünde etkinliğinize kayıtlı tüm üyeleri görebilirsiniz. Katılımcı durumunu (kayıtlı, geldimi, gelmedi) değiştirebilir, sertifika verişini yönetebilir veya toplu işlemler yapabilirsiniz. Ayrıca katılımcı bilgilerini dışa aktarabilirsiniz." },
    { keywords: ["email", "posta", "notification", "bildirim", "smtp"], answer: "E-posta ayarlarını Etkinlik Ayarları > E-posta bölümünde yapılandırabılırsinız. Otomatik sertifika e-postalarını özelleştirebilir, SMTP ayarlarını belirleyebilirsiniz. E-posta şablonlarını kişiselleştirebilir ve zamanlama seçeneklerini ayarlayabilirsiniz." },
    { keywords: ["raffle", "çekiliş", "draw", "prize", "ödül"], answer: "Çekiliş oluşturmak için Çekiliş sayfasına gidin. Ödüller ekleyin, katılımcı kurallarını belirleyin (kayıt yapanlar, sertifika alanlar, vb.) ve otomatik olarak kazananları seçtirebilirsiniz. Çekiliş tarihi ve saatini önceden planlayabilirsiniz." },
    { keywords: ["survey", "anket", "question", "soru"], answer: "Anketleri Etkinlik Ayarları > Anket bölümünde oluşturabilirsiniz. Soruları ekleyin, türlerini seçin (metin, çoktan seçme, çoklu seçim, vb.) ve katılımcılar tarafından cevaplanmasını sağlayabilirsiniz. Anket sonuçlarını detaylı olarak analiz edebilirsiniz." },
    { keywords: ["session", "oturum", "schedule", "timetable", "program"], answer: "Oturumları Oturumlar sayfasından ekleyebilirsiniz. Her oturumun tarihini, saatini, başlığını ve konuşmacısını belirleyebilirsiniz. Check-in sistemi otomatik olarak oturumlara göre çalışır. Katılımcılar etkinlik sayfasından oturumlara kaydolabilir." },
    { keywords: ["analytics", "istatistik", "report", "data", "grafik"], answer: "Analytics bölümünde etkinliğinizin kapsamlı istatistiklerini görebilirsiniz. Kayıt sayıları, katılımcı dağılımı, sertifika durumu, cinsiyete göre dağılım ve daha fazlasını analiz edebilirsiniz. Raporları Excel olarak dışa aktarabilirsiniz." },
    { keywords: ["domain", "custom", "özel", "alan adı", "url"], answer: "Etkinliğinize özel bir domain atamak için Etkinlik Ayarları > Domain bölümüne gidin. Kendi alan adınızı bağlayabilir veya HeptaCert tarafından sağlanan alt domain'i kullanabilirsiniz. Domain değişikliği DNS ayarlarından sonra yayına alınabilir." },
    { keywords: ["checkin", "check-in", "giriş", "kontrol"], answer: "Check-in sistemi etkinlik günü katılımcı kaydını hızlandırır. QR kod veya kontrol listesi kullanarak katılımcıları işaretleyebilirsiniz. Check-in panelinden katılımcı durumunu gerçek zamanlı takip edebilirsiniz." },
    { keywords: ["gamification", "badge", "rozet", "puan", "leaderboard"], answer: "Gamifikasyon özelliğini etkinleştirerek katılımcıları rozetler, puanlar ve liderlik tablosuyla motive edebilirsiniz. Farklı aktivitelere (oturum katılımı, anket cevaplama, vb.) puan atayabilirsiniz." },
    { keywords: ["branding", "tema", "renk", "logo", "görünüm"], answer: "Etkinlik Ayarları > Branding bölümünde kurumsal kimliğinizi ayarlayabilirsiniz. Logo, tema renkleri ve yazı tiplerini özelleştirebilirsiniz. Mobil ve masaüstü uyumluluğunu otomatik olarak sağlanır." },
    { keywords: ["payment", "ödeme", "ticket", "bilet", "fiyat"], answer: "Etkinliğiniz için ödeme sistemi kurmak için Etkinlik Ayarları > Ödeme bölümüne gidin. Bilet fiyatlandırması, erken kuş indirimi ve grup indirimlerini ayarlayabilirsiniz. Stripe ve diğer ödeme yöntemiyle entegredir." },
    { keywords: ["yorum", "comment", "moderasyon", "moderation"], answer: "Etkinlik sayfasına gelen yorumları yönetmek için Ayarlar > Yorumlar sekmesine gidin. Yorumları onaylayabilir, gizleyebilir veya raporlanmış olanları inceleyebilirsiniz. Her yorum için üye bilgisini ve tarihini görebilirsiniz." },
    { keywords: ["görünürlük", "visibility", "private", "public", "gizli"], answer: "Etkinliğin görünürlüğünü Ayarlar > Genel bölümünde değiştirebilirsiniz. Özel: Listede görünmez. Liste dışı: Sadece doğrudan bağlantı. Herkese açık: Keşif ekranında görünür. Mevcut kayıt linkleriniz etkilenmez." },
    { keywords: ["banner", "görsel", "image", "kapak", "cover"], answer: "Etkinlik bannerını Ayarlar > Banner sekmesinden yükleyebilirsiniz. Önerilen boyut: 1200×400 piksel. JPG, PNG veya WebP formatları desteklenmektedir. Banner, kayıt sayfasında ve etkinlik başlığında görüntülenir." },
    { keywords: ["toplu", "bulk", "export", "dışa", "aktarma"], answer: "Katılımcı listesini, sertifikaları ve anket sonuçlarını Excel formatında dışa aktarabilirsiniz. Katılımcılar bölümünden 'Dışa Aktar' butonunu kullanabilirsiniz. Toplu e-posta göndermek için E-posta bölümüne gidin." },
    { keywords: ["qr", "kod", "kodu", "tarama", "scan"], answer: "Check-in sırasında QR kod taratarak katılımcıları hızlıca işaretleyebilirsiniz. Her katılımcının benzersiz QR kodu vardır. Check-in sayfasında mobil cihazınızı kamera olarak kullanabilir veya kodu manuel olarak girebilirsiniz." },
    { keywords: ["hata", "error", "sorun", "problem", "bug"], answer: "Bir sorunla karşılaştıysanız, tarayıcı konsolunu (F12) açarak hata mesajlarını görebilirsiniz. Sayfayı yenileyin ve işlemi tekrarlayın. Sorun devam ederse, AI Asistan'dan 'Destek Talebi Aç' butonuyla destek ekibimize ulaşabilirsiniz." },
    { keywords: ["oturum", "session", "login", "logout", "giriş"], answer: "Oturum açmak için e-posta ve şifrenizi girebilir veya magic link kullanabilirsiniz. İki faktörlü kimlik doğrulama aktif ise, doğrulama kodunuzu girmeniz gerekir. Oturum otomatik olarak belirli süre sonra kapanabilir - sayfayı yenileyerek tekrar giriş yapabilirsiniz." },
    { keywords: ["sertifika", "certificate", "verme", "issue", "teslim"], answer: "Katılımcılara sertifika vermek için Sertifikalar bölümüne gidin. Katılımcıları seçin ve 'Sertifika Ver' butonunu tıklayın. Toplu olarak birden fazla katılımcıya sertifika verebilirsiniz. Otomatik e-posta göndermesini Ayarlar > E-posta'da ayarlayabilirsiniz." },
    { keywords: ["analiz", "analysis", "istatistik", "statistics", "dashboard"], answer: "İleri Analitik sayfasında etkinliğinizin detaylı verilerini görebilirsiniz. Kayıt trendi, cinsiyet dağılımı, zaman dilimine göre katılımcılar ve daha fazla grafikleri görüntüleyebilirsiniz. Raporları tarih aralığına göre filtreleyebilirsiniz." },
    { keywords: ["destek", "support", "yardım", "help", "asistan"], answer: "Sorularınız için bu AI Asistan'ı kullanabilirsiniz. Eğer cevap bulamazsanız 'Destek Talebi Aç' butonuyla destek ekibimize doğrudan yazabilirsiniz. Talebiniz oluşturulduktan sonra ekip sizi en kısa sürede çözüme ulaştıracaktır." },
    { keywords: ["webhook", "webhook setup", "integration", "api"], answer: "Webhook'ları Admin Ayarları > Webhook'lar bölümünde yönetebilirsiniz. Etkinlik tamamlandığında veya katılımcı kaydı yapıldığında otomatik olarak harici sistemlere veri gönderebilirsiniz. Webhook'ların test etmek için 'Test' butonunu kullanabilirsiniz." },
    { keywords: ["api", "api key", "geliştirici", "developer"], answer: "API anahtarlarını Admin > API Anahtarları'ndan oluşturabilirsiniz. Programlı olarak etkinlik verilerine erişmek için kullanabilirsiniz. Her API anahtarı için izinleri belirleyebilir ve manuel olarak iptal edebilirsiniz. API dokümantasyonu belgelerimizde mevcuttur." },
    { keywords: ["csv", "import", "içe aktarma", "yükleme"], answer: "Katılımcıları toplu olarak CSV dosyasından içe aktarabilirsiniz. Katılımcılar bölümünde 'CSV İçe Aktar' butonunu kullanın. CSV dosyası e-posta, ad, telefon gibi alanları içermelidir. Satırda hata varsa düzeltip tekrar yüklemeyi deneyin." },
    { keywords: ["sosyal", "social", "twitter", "facebook", "linkedin"], answer: "Etkinliğinizi sosyal medyada paylaşmak için Ayarlar > Sosyal Medya bölümüne gidin. Sosyal medya hesaplarınızı bağlayabilir ve otomatik paylaşım ayarlarını yapabilirsiniz. Paylaşım sırasında özel mesaj ve hashtag ekleyebilirsiniz." },
    { keywords: ["profil", "member profile", "üye profili", "hesap"], answer: "Üye profil sayfasında kişi bilgileri, rozetler, katıldığı etkinlikler ve indirilen sertifikalar gösterilir. Profili özelleştirmek için Profilim bölümüne gidin. Şifre, iki faktörlü kimlik doğrulama ve e-posta tercihlerini buradan yönetebilirsiniz." },
    { keywords: ["organizasyon", "organization", "şirket", "kurumsal"], answer: "Organizasyon ayarlarını Organizasyon Ayarları bölümünde yapılandırabilirsiniz. Logo, işletme adı, vergi numarası ve iletişim bilgilerini buradan güncelleyebilirsiniz. Organizasyonunuza kullanıcı ekleyebilir ve rolleri belirleyebilirsiniz." },
    { keywords: ["izin", "permission", "role", "yetki", "admin"], answer: "Kullanıcıların rollerini Organizasyon > Kullanıcılar'da belirleyebilirsiniz. Admin, Editor, Viewer gibi roller vardır. Her rol farklı izinlere sahiptir. Etkinlik düzeyinde de ayrıca izin ayarlaması yapabilirsiniz." },
    { keywords: ["mobilyapp", "mobile", "telefon", "uygulama"], answer: "HeptaCert mobil uygulaması iOS ve Android'de kullanılabilir. Check-in, katılımcı yönetimi ve hızlı raporlama için mobil uygulamayı kullanabilirsiniz. Masaüstü sürümüyle tüm verileriniz senkronize olur." },
    { keywords: ["cache", "hız", "performance", "optimize"], answer: "Uygulamanın performansını optimize etmek için tarayıcı cache'ini temizleyebilirsiniz. Ekran sayfada saygın olan veriler otomatik olarak cache'lenir. Çok yavaş hissediyorsanız, tarayıcı ayarlarından cache ve cookie'leri temizleyin." },
    { keywords: ["sso", "single sign-on", "oauth", "login"], answer: "Kurumsal SSO (Single Sign-On) desteğimiz bulunmaktadır. SAML veya OAuth 2.0 ile entegrasyon yapabilirsiniz. Bu özellik kurumsal planlarla sunulmaktadır. Detaylı bilgi için destek talebinde bulunabilirsiniz." },
    { keywords: ["white label", "beyaz etiket", "kendi markanız"], answer: "White Label (beyaz etiket) özelliğiyle tüm uygulamayı kendi markanız altında sunabilirsiniz. Domain, renk, logo ve e-posta tasarımını özelleştirebilirsiniz. Bu özellik Premium + planla mevcut olacaktır." },
    { keywords: ["gdpr", "privacy", "gizlilik", "privacy policy"], answer: "Uygulamada GDPR uyumluluğu sağlanmıştır. Katılımcıların verilerini silebilir ve ihraç edebilirsiniz. Gizlilik politikasını ve hizmet şartlarını özelleştirebilirsiniz. Detaylı bilgi için yasal dokümantasyona bakabilirsiniz." },
    { keywords: ["backup", "yedek", "veri tabanı", "recovery"], answer: "Verileriniz günlük olarak otomatik yedeklenir. İhtiyaç durumunda veri recovery talebinde bulunabilirsiniz. Eski sürümlere geri dönmek için destek ekibine başvurabilirsiniz." },
    { keywords: ["sms", "kısa mesaj", "telefon", "sms bildirimi"], answer: "SMS bildirimleri seçim etkinlikler için etkinleştirilebilir. Katılımcılara SMS ile check-in ve sertifika bildirimlerini gönderebilirsiniz. SMS kredi satın almak için faturalandırma bölümüne gidin." },
    { keywords: ["timezone", "saat dilimi", "zaman", "bölge"], answer: "Etkinlik saat dilimini Ayarlar > Genel bölümünde belirleyebilirsiniz. Tüm zamanlar seçilen saat dilimine göre gösterilir. Katılımcılar kendi saat dilimlerinde bildirimleri alırlar." },
    { keywords: ["calendar", "takvim", "google calendar", "sync"], answer: "Google Calendar ile sinkronizasyon yapabilirsiniz. Etkinlik ve oturumlar otomatik olarak takvime eklenir. Katılımcılarınız sertifikalar için geri sayım bildirimleri alabilir." },
    { keywords: ["slack", "discord", "telegram", "notification"], answer: "Slack, Discord ve Telegram'a bildirimler gönderebilirsiniz. Webhook ayarlarından notification kanalını seçebilirsiniz. Yeni kayıt, sertifika verme vs. olaylar otomatik olarak bildirilir." },
    { keywords: ["rate limit", "hız sınırı", "api limit"], answer: "API requests için hız sınırları uygulanmaktadır. Free plan: 100 req/min, Pro: 1000 req/min, Enterprise: özel limit. Rate limit'e ulaştıysanız, bir dakika bekleyin veya plannızı yükseltin." },
    { keywords: ["custom field", "özel alan", "alan ekleme"], answer: "Kayıt formunda istediğiniz kadar özel alan ekleyebilirsiniz. Alan türü, doğrulama kuralı ve bağımlılık ayarlarını belirleyebilirsiniz. Özel alanlar katılımcı profil sayfasında da görüntülenir." },
    { keywords: ["audience", "segment", "hedef", "segmentasyon"], answer: "Katılımcıları farklı özelliklere göre segmente edebilirsiniz. Segments'e göre farklı e-posta ve bildirim gönderebilirsiniz. Check-in ve sertifika verme işlemlerini segment bazında yapabilirsiniz." },
    { keywords: ["filter", "ara", "arama", "filtreleme"], answer: "Katılımcı listesinde ad, e-posta, telefon ve özel alan değerlerine göre arama yapabilirsiniz. Duruma göre filtreleme (kayıtlı, geldimi, gelmedi) da yapabilirsiniz. Filtreler kaydedilir ve sonraki oturumlarda erişilir." },
    { keywords: ["duplicate", "kopya", "etkinlik kopyası", "klonlama"], answer: "Etkinlik kopyalamak için etkinlik listesinde sağ tıklayıp 'Kopyala' seçeneğini kullanın. Tüm ayarları, form alanlarını ve şablonları kopyalayabilirsiniz. Katılımcılar kopyalanmaz, sadece ayarlar aktarılır." },
    { keywords: ["notification", "bildirim", "uyarı", "alert"], answer: "Bildirim tercihlerini Profil > Bildirimler'de ayarlayabilirsiniz. E-posta, push ve SMS bildirimlerini açıp kapatabilirsiniz. Hangi olaylar için bildirim almak istediğinizi seçebilirsiniz." },
    { keywords: ["language", "dil", "çoklu dil", "localization"], answer: "Uygulamaya kayıtlı katılımcılar tercih ettikleri dilde bildirimleri alırlar. Türkçe ve İngilizce'nin yanı sıra diğer dillerle genişlemeyi planlıyoruz. Admin paneli şu anda Türkçe ve İngilizce'de mevcuttur." },
    { keywords: ["2fa", "iki faktör", "authenticator", "google authenticator"], answer: "İki faktörlü kimlik doğrulamayı Profil > Güvenlik'te etkinleştirebilirsiniz. Google Authenticator veya SMS ile doğrulama yapabilirsiniz. Yedek kodları güvenli bir yerde saklayın, oturum açamayabilirsiniz." },
    { keywords: ["veri silme", "veri dışa aktarma", "export data", "gdpr"], answer: "Kişisel verilerinizi istediğiniz zaman dışa aktarabilir veya silebilirsiniz. Dışa aktarma işlemi ZIP dosyasıyla yapılır. Silme işlemini 30 gün sonra geri alamazsınız, lütfen emin olun." },
    { keywords: ["sertifika linksi", "sertifika url", "sertifika paylaş"], answer: "Sertifika URL'sini paylaşarak başkalarını gösterebilirsiniz. Sertifika linkinden doğrulama kodu ile gerçekliği kontrol edilebilir. Sertifika paylaşımını Ayarlar'da açıp kapatabilirsiniz." },
    { keywords: ["template library", "şablon kütüphanesi", "tasarım"], answer: "Hazır sertifika şablonları kütüphanesinden seçip kullanabilirsiniz. Her şablon tamamen özelleştirilebilir durumdadır. Sık kullanılan şablonları favoriler'e ekleyebilirsiniz." },
    { keywords: ["css", "özel css", "custom css", "styling"], answer: "Gelişmiş CSS özelleştirmesi için özel CSS bölümünü kullanabilirsiniz. Etkinlik sayfasının görünümünü tamamen değiştirebilirsiniz. CSS bilgisi gereklidir, hatalı CSS sayfayı bozabilir." },
    { keywords: ["dark mode", "karanlık mod", "tema"], answer: "Admin paneli temayı sistem ayarlarınızdan seçer. Karanlık mod desteklenmekte olup otomatik aktif olur. Sayfanın belirli kısımlarında açık tema kullanılabilir." },
    { keywords: ["responsive", "mobil uyumlu", "ekran boyutu"], answer: "Tüm sayfalar mobil uyumlu olarak tasarlanmıştır. Telefon, tablet ve bilgisayarlarda düzgün göründüğü kontrol edilmiştir. Açılış hızını optimize etmek için modern teknolojiler kullanılmaktadır." }
  ],
  en: [
    { keywords: ["form", "field", "registration", "input"], answer: "To add form fields, go to Event Settings > Registration Form. Click '+Add Field' to create new fields. You can set the field type (text, email, date, etc.), label, and helper text. Available types: Short Text, Email, Phone, Number, Date, Multiple Choice, File Upload and more." },
    { keywords: ["certificate", "template", "cert"], answer: "Customize certificate templates in the Editor page. Add backgrounds, logos, text, and styling. See changes in real-time in the preview area. Test certificates with sample attendees before publishing." },
    { keywords: ["attendee", "participant", "member", "user"], answer: "View all registered members in the Attendees section. Change status (registered, attended, no-show), manage certificates, or perform bulk operations. Export attendee data to Excel format." },
    { keywords: ["email", "mail", "notification", "smtp"], answer: "Configure email settings in Event Settings > Email. Customize automatic certificate emails and SMTP configuration. Personalize email templates and adjust scheduling options." },
    { keywords: ["raffle", "draw", "prize", "winner"], answer: "Create raffles in the Raffles page. Add prizes, set participant rules, and automatically select winners. Schedule raffle draws in advance." },
    { keywords: ["survey", "questionnaire", "question", "poll"], answer: "Create surveys in Event Settings > Survey. Add questions, choose types (text, multiple choice, etc.), and analyze results. Survey data is securely stored." },
    { keywords: ["session", "schedule", "timetable", "timing"], answer: "Add sessions from the Sessions page. Set date, time, title, and speaker. Check-in works based on sessions. Participants can register for sessions." },
    { keywords: ["analytics", "statistics", "report", "data", "metrics"], answer: "View comprehensive statistics in the Analytics section. Analyze registration trends, demographics, certificate status, and more. Export reports to Excel." },
    { keywords: ["domain", "custom", "url"], answer: "Assign a custom domain in Event Settings > Domain. Connect your own domain or use HeptaCert subdomain. Changes take effect after DNS settings." },
    { keywords: ["checkin", "check-in", "attendance"], answer: "The check-in system speeds up participant registration. Check in using QR codes or a checklist. Track participant status in real-time." },
    { keywords: ["gamification", "badge", "points", "leaderboard"], answer: "Enable gamification to motivate participants with badges and points. Assign points to different activities." },
    { keywords: ["branding", "theme", "color", "logo"], answer: "Customize brand identity in Event Settings > Branding. Personalize logo, colors, and typography. Mobile and desktop compatibility ensured." },
    { keywords: ["payment", "ticket", "pricing"], answer: "Set up payments in Event Settings > Payment. Configure pricing, early bird discounts, and group discounts. Integrated with Stripe and other methods." },
    { keywords: ["comment", "moderasyon", "moderation"], answer: "Manage comments in Settings > Comments. Approve, hide, or review reported comments. View member info and timestamps for each comment." },
    { keywords: ["visibility", "private", "public"], answer: "Control event visibility in Settings > General. Private: Not listed. Unlisted: Direct link only. Public: Listed in discover. Current links still work." },
    { keywords: ["banner", "image", "cover"], answer: "Upload banner in Settings > Banner. Recommended: 1200×400 pixels. JPG, PNG, WebP supported. Banner shows on registration and event pages." },
    { keywords: ["bulk", "export", "data"], answer: "Export attendees, certificates, and survey results to Excel. Use 'Export' button in Attendees section. Bulk email from Email section." },
    { keywords: ["qr", "code", "scan"], answer: "Scan QR codes during check-in to mark attendees. Each has a unique code. Use camera or enter manually on check-in page." },
    { keywords: ["error", "problem", "issue", "troubleshooting"], answer: "Open browser console (F12) to see error messages. Refresh page and retry. If problem persists, create support ticket for help." },
    { keywords: ["login", "logout", "authentication"], answer: "Sign in with email/password or magic link. If 2FA enabled, enter verification code. Session may auto-expire - refresh to sign in again." },
    { keywords: ["certificate", "issuance", "certificate award"], answer: "Issue certificates in Certificates section. Select attendees and click 'Award'. Bulk award multiple attendees. Configure auto-email in Email settings." },
    { keywords: ["advanced analytics", "detailed", "insights"], answer: "View detailed analytics on Advanced Analytics page. See registration trends, demographics, and custom metrics. Filter by date range and export." },
    { keywords: ["support", "help", "questions"], answer: "Use this AI Assistant for questions. If not answered, create support ticket. Our team responds as soon as possible." },
    { keywords: ["webhook", "integration", "api"], answer: "Manage webhooks in Admin > Webhooks. Send data to external systems on events. Test webhooks in the interface." },
    { keywords: ["api key", "developer", "access"], answer: "Create API keys in Admin > API Keys. Use to access event data programmatically. Set permissions per key. Revoke anytime. See documentation for details." },
    { keywords: ["csv", "import", "bulk import"], answer: "Import attendees from CSV in Attendees section. Click 'CSV Import'. File should contain email, name, phone, etc. Fix errors and retry if needed." },
    { keywords: ["social", "twitter", "facebook", "sharing"], answer: "Share events on social media in Settings > Social Media. Connect accounts and set auto-sharing. Add custom messages and hashtags." },
    { keywords: ["profile", "account", "personal"], answer: "View profile with badges, events, and certificates. Customize in My Profile. Manage password, 2FA, and notification preferences." },
    { keywords: ["organization", "company", "account"], answer: "Configure organization in Organization Settings. Update logo, name, tax ID, and contact info. Add users and set roles." },
    { keywords: ["permission", "role", "admin"], answer: "Set user roles in Organization > Users. Roles: Admin, Editor, Viewer with different permissions. Also set event-level permissions." },
    { keywords: ["mobile", "app", "smartphone"], answer: "HeptaCert mobile app available on iOS and Android. Use for check-in, attendee management, and quick reports. Syncs with desktop." },
    { keywords: ["performance", "speed", "optimization"], answer: "Clear browser cache for optimal performance. Data automatically cached. If slow, clear cache and cookies." },
    { keywords: ["sso", "oauth", "enterprise"], answer: "Enterprise SSO support available via SAML or OAuth 2.0. Available in enterprise plans. Contact support for setup." },
    { keywords: ["white label", "branding", "customization"], answer: "White label feature allows your branding throughout. Customize domain, colors, logo, email design. Available in Premium+ plans." },
    { keywords: ["gdpr", "privacy", "data"], answer: "GDPR compliant. Delete or export participant data anytime. Customize privacy and terms. See legal docs for details." },
    { keywords: ["backup", "disaster", "recovery"], answer: "Data automatically backed up daily. Request recovery if needed. Can restore to previous versions. Contact support." },
    { keywords: ["sms", "text", "notification"], answer: "Enable SMS notifications for select events. Send check-in and certificate notifications. Buy SMS credits in billing." },
    { keywords: ["timezone", "time", "schedule"], answer: "Set event timezone in Settings > General. All times shown in this timezone. Participants get notifications in their timezone." },
    { keywords: ["calendar", "sync", "google"], answer: "Sync with Google Calendar. Events and sessions auto-added. Participants get countdown reminders for certificates." },
    { keywords: ["slack", "discord", "chat"], answer: "Send notifications to Slack, Discord, Telegram via webhooks. Choose notification channel. Auto-notify on registrations, certificates, etc." },
    { keywords: ["rate limit", "api", "usage"], answer: "API rate limits: Free 100/min, Pro 1000/min, Enterprise custom. Hit limit? Wait a minute or upgrade plan." },
    { keywords: ["custom field", "field"], answer: "Add unlimited custom fields to registration. Set type, validation, and dependencies. Fields appear on participant profile." },
    { keywords: ["audience", "segment", "group"], answer: "Segment attendees by properties. Send emails/notifications by segment. Perform check-in and certificates per segment." },
    { keywords: ["filter", "search", "find"], answer: "Search attendees by name, email, phone, custom fields. Filter by status (registered, attended, no-show). Saved filters." },
    { keywords: ["duplicate", "clone", "copy"], answer: "Copy event via right-click menu. All settings and fields copied. Attendees not copied, only structure." },
    { keywords: ["notification", "alert", "setting"], answer: "Configure notifications in Profile > Notifications. Enable/disable email, push, SMS. Choose which events trigger notifications." },
    { keywords: ["language", "localization", "translation"], answer: "Interface available in Turkish and English. Admin panel in both languages. Participants get notifications in preferred language." },
    { keywords: ["2fa", "authenticator", "security"], answer: "Enable 2FA in Profile > Security. Use Google Authenticator or SMS. Save backup codes in safe place." },
    { keywords: ["data delete", "export", "download"], answer: "Export or delete personal data anytime. Export as ZIP file. Deletion permanent after 30 days, non-reversible." },
    { keywords: ["certificate link", "share"], answer: "Share certificate URL with others. Can verify authenticity with verification code. Control sharing in Settings." },
    { keywords: ["template", "design", "library"], answer: "Choose from certificate template library. Each fully customizable. Save favorites for quick access." },
    { keywords: ["custom css", "styling"], answer: "Use custom CSS for advanced styling. Fully customize event pages. Requires CSS knowledge - errors can break layout." },
    { keywords: ["dark mode", "theme"], answer: "Admin follows system theme. Dark mode auto-enabled if set. Certain page areas use light theme." },
    { keywords: ["responsive", "mobile", "tablet"], answer: "All pages mobile responsive. Works perfectly on phones, tablets, and desktops. Optimized for speed on all devices." }
  ]
};

export default function AIAssistant() {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      message: lang === "tr" ? "Merhaba! Size etkinlik oluşturma ve yönetiminde yardımcı olmak için buradayım. Ne sorunuz var?" : "Hello! I'm here to help you with event creation and management. What questions do you have?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findAnswer = (userMessage: string): string | null => {
    const faqDb = FAQ_DATABASE[lang as keyof typeof FAQ_DATABASE];
    const lowerMsg = userMessage.toLowerCase();

    for (const faq of faqDb) {
      if (faq.keywords.some(keyword => lowerMsg.includes(keyword))) {
        return faq.answer;
      }
    }
    return null;
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMsg: Message = {
      role: "user",
      message: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Find answer
    const answer = findAnswer(input);
    
    // Add assistant response
    const assistantMsg: Message = {
      role: "assistant",
      message: answer || (lang === "tr" ? "Maalesef bu soruya yanıt bulamadım. Lütfen 'Destek Talebi Aç' butonunu kullanarak detaylı açıklamayı yapınız." : "Sorry, I couldn't find an answer to this question. Please use 'Create Support Ticket' button for more details."),
      timestamp: new Date().toISOString()
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, assistantMsg]);
    }, 300);
  };

  const handleCreateSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) return;

    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? "❌ Oturum hatası. Lütfen sayfayı yenileyin ve tekrar deneyin." : "❌ Session error. Please refresh and try again.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/support-tickets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: supportSubject,
          message: supportMessage
        })
      });

      if (response.ok) {
        // Success
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? "✅ Destek talebiniz başarıyla oluşturuldu! Destek Ekibimiz en kısa sürede size ulaşacak. Email adresinizdeki güncellemeleri takip edin." : "✅ Your support ticket created! Our team will reach out soon. Check your email for updates.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setSupportSubject("");
        setSupportMessage("");
        setShowSupportForm(false);
      } else {
        try {
          const error = await response.json();
          const errorDetail = error?.detail || error?.message || (lang === "tr" ? "Destek talebini oluşturmada hata oluştu" : "Failed to create support ticket");
          const assistantMsg: Message = {
            role: "assistant",
            message: lang === "tr" ? `❌ Hata: ${errorDetail}` : `❌ Error: ${errorDetail}`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, assistantMsg]);
        } catch {
          const assistantMsg: Message = {
            role: "assistant",
            message: lang === "tr" ? "❌ Hata: Destek talebini oluşturmada hata oluştu" : "❌ Error: Failed to create support ticket",
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || (lang === "tr" ? "Bağlantı hatası" : "Connection error");
      const assistantMsg: Message = {
        role: "assistant",
        message: lang === "tr" ? `❌ ${errorMsg}. Lütfen daha sonra tekrar deneyin.` : `❌ ${errorMsg}. Please try again later.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 flex items-center justify-center h-14 w-14 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition z-40"
          title={lang === "tr" ? "AI Asistan" : "AI Assistant"}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-surface-200">
          {/* Header */}
          <div className="bg-brand-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              <h3 className="font-semibold">
                {lang === "tr" ? "HeptaCert AI Asistan" : "HeptaCert AI Assistant"}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-brand-700 p-1 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-br-none"
                      : "bg-white text-surface-900 border border-surface-200 rounded-bl-none"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Support Form */}
          {showSupportForm && (
            <div className="border-t border-surface-200 p-4 space-y-3 bg-amber-50">
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-sm text-amber-900">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
                <p className="font-medium">
                  {lang === "tr"
                    ? "Sorununuzu detaylı açıklayın. Destek Ekibimiz kısa sürede yanıtlayacak."
                    : "Describe your issue in detail. Our support team will respond shortly."}
                </p>
              </div>
              
              <input
                type="text"
                placeholder={lang === "tr" ? "Konu..." : "Subject..."}
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={loading}
              />
              
              <textarea
                placeholder={lang === "tr" ? "Mesajınız..." : "Your message..."}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                disabled={loading}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSupportForm(false)}
                  className="flex-1 px-3 py-2.5 border border-surface-300 rounded-lg text-sm font-semibold text-surface-700 bg-white hover:bg-surface-50 transition disabled:opacity-50"
                  disabled={loading}
                >
                  {lang === "tr" ? "İptal" : "Cancel"}
                </button>
                <button
                  onClick={handleCreateSupport}
                  className="flex-1 px-3 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-lg text-sm font-semibold hover:from-brand-700 hover:to-brand-800 transition disabled:opacity-50 shadow-md"
                  disabled={loading || !supportSubject.trim() || !supportMessage.trim()}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                      {lang === "tr" ? "Gönderiliyor..." : "Sending..."}
                    </span>
                  ) : (lang === "tr" ? "Talep Oluştur" : "Create Ticket")}
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-surface-200 p-4 space-y-2">
            {!showSupportForm ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={lang === "tr" ? "Sorunuzu sorun..." : "Ask your question..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim()}
                    className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => setShowSupportForm(true)}
                  className="w-full px-4 py-2.5 border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 rounded-lg text-sm font-semibold hover:from-amber-100 hover:to-orange-100 transition shadow-sm"
                >
                  <span className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {lang === "tr" ? "Destek Talebi Oluştur" : "Create Support Ticket"}
                  </span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
