"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type LegalSection = [title: string, body: string, items?: string[]];

export default function GizlilikPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const sections: LegalSection[] = isTr
    ? [
        [
 "1. Veri Sorumlusu",
 "HeptaCert platformu Samet Ünsal tarafından bireysel olarak işletilmektedir. \"Heptapus Group\" bir marka adıdır; tescilli bir şirket unvanı değildir. Bu politikada \"HeptaCert\", \"biz\" veya \"işleten\" ifadeleri Samet Ünsal'ı ifade eder. Kişisel verilerle ilgili talepleriniz için: contact@heptapusgroup.com",
        ],
        [
 "2. Politikanın Kapsamı",
 "Bu politika, HeptaCert platformu kapsamında işleten tarafından yürütülen kişisel veri işleme faaliyetlerini açıklar. Etkinlik düzenleyicilerinin kendi veri işleme faaliyetleri ayrıca kendi sorumluluklarındadır.",
        ],
        [
 "3. Rol Ayrımı",
 "Platformun hesap yönetimi ve teknik işletimi bakımından işleten, işleme bağlamına göre veri sorumlusu veya veri işleyen olarak hareket edebilir. Etkinlik kayıt formlarında toplanan etkinliğe özgü veriler bakımından etkinlik düzenleyicisi bağımsız veri sorumlusu olabilir.",
        ],
        [
 "4. Toplanan Bilgiler",
 "Hesap bilgileri, oturum/cihaz verileri, platform kullanım kayıtları, güvenlik logları, ödeme referansları ve kullanıcıların etkinlik bazında girdiği ek bilgiler işlenebilir.",
        ],
        [
 "5. Kullanım Amaçları",
 "Veriler hizmetin sunulması, kimlik doğrulama, sertifika üretimi, etkinlik operasyonları, destek, güvenlik, kötüye kullanımın önlenmesi ve yasal yükümlülüklerin yerine getirilmesi için kullanılır.",
        ],
        [
 "6. Hukuki Sebepler",
 "Kişisel veriler; sözleşmenin kurulması ve ifası (hesap, plan, etkinlik ve sertifika hizmetleri), hukuki yükümlülüklerin yerine getirilmesi (ör. fatura ve vergi kayıtları), meşru menfaat (güvenlik, kötüye kullanımın önlenmesi, hizmetin iyileştirilmesi) ve gerekli olduğu hallerde açık rıza hukuki sebeplerine dayanılarak işlenir (KVKK md. 5; GDPR md. 6/1-a, b, c, f).",
        ],
        [
 "7. Google ile Giriş, Google Sheets, Google Drive ve Google Calendar Erişimi",
 "HeptaCert, Google ile giriş özelliğini kullanıcıların kimliğini doğrulamak ve hesap oluşturma/giriş sürecini kolaylaştırmak amacıyla kullanır. Google tarafından sağlanması halinde ad, soyad, e-posta adresi ve profil görseli gibi temel profil bilgileri işlenebilir. Kullanıcı veya organizatör tarafından açıkça yetki verilmesi halinde HeptaCert, etkinliklere ilişkin katılımcı, kayıt, check-in, bilet ve sertifika verilerinin Google Sheets’e aktarılması, oluşturulan tabloların güncellenmesi ve yönetilmesi amacıyla Google Sheets ve Google Drive dosya erişimini kullanabilir. Organizasyon salon rezervasyonu veya etkinlik takvimi entegrasyonu açıkça etkinleştirildiğinde HeptaCert, Google Calendar erişimini yalnızca ilgili rezervasyon/etkinlik kayıtlarını oluşturmak, güncellemek, silmek, uygunluk kontrolü yapmak ve çift yönlü senkronizasyon sağlamak amacıyla kullanabilir. HeptaCert, Google Drive erişimini yalnızca uygulama tarafından oluşturulan veya kullanıcının uygulama ile kullanmayı seçtiği dosyalar için, Google Calendar erişimini ise yalnızca kullanıcının bağladığı ve entegrasyon kapsamında seçtiği takvimler için kullanır; ilgisiz Google Drive dosyalarına, Gmail içeriklerine veya entegrasyon kapsamı dışındaki Google kullanıcı içeriklerine erişmez.",
        ],
        [
 "8. Microsoft 365 Excel ve OneDrive Entegrasyonu",
 "Organizasyon yöneticisinin açıkça yetki vermesi halinde HeptaCert, Microsoft 365 OAuth akışını kullanarak kullanıcının OneDrive’ında etkinlik katılımcı ve segment verilerini içeren Excel çalışma kitabı oluşturabilir, güncelleyebilir ve yönetebilir. Erişim yalnızca HeptaCert tarafından oluşturulan dosyalar kapsamında gerçekleştirilir; kullanıcının diğer OneDrive dosyalarına, e-postalarına veya Microsoft 365 hizmetlerinin entegrasyon kapsamı dışındaki içeriklerine erişilmez. Microsoft kimlik bilgileri şifreli olarak saklanır ve yalnızca söz konusu senkronizasyon işlemleri için kullanılır.",
        ],
        [
 "9. Kurumsal Entegrasyonlar (Salesforce, Mailchimp/Brevo, WhatsApp Business, Zoom, OIDC/SSO)",
 "HeptaCert, organizasyon yöneticilerinin kendi hesaplarını platforma bağlamasına olanak tanıyan isteğe bağlı kurumsal entegrasyonlar sunar. Bu entegrasyonlar yalnızca ilgili organizasyon yöneticisi tarafından açıkça etkinleştirildiğinde aktif olur. Salesforce entegrasyonu etkinleştirildiğinde etkinlik katılımcılarının adı, e-posta adresi ve sertifika durumu gibi veriler organizasyonun Salesforce hesabına aktarılabilir. Mailchimp veya Brevo entegrasyonu etkinleştirildiğinde etkinlik segmentlerine ait e-posta adresleri ilgili mailing listesine aktarılabilir. WhatsApp Business entegrasyonu etkinleştirildiğinde organizasyon tarafından yapılandırılan telefon numaralarına bilet, hatırlatma ve sertifika bildirimleri gönderilebilir; mesaj içeriği HeptaCert tarafından oluşturulur ve Meta’nın Cloud API’si üzerinden iletilir. Zoom entegrasyonu etkinleştirildiğinde webinar katılım raporlarındaki e-posta adresleri çekilerek ilgili CRM profilleriyle eşleştirilir; Zoom’dan alınan veriler yalnızca sertifika uygunluk kontrolü amacıyla kullanılır. OIDC/SSO entegrasyonu etkinleştirildiğinde organizasyonun kimlik sağlayıcısı (Microsoft Entra ID, Okta vb.) üzerinden kimlik doğrulaması yapılarak platforma giriş sağlanır; bu kapsamda yalnızca e-posta adresi ve temel profil bilgileri işlenir. Tüm bu entegrasyonlarda üçüncü taraf sistemlere aktarılan veriler organizasyon yöneticisinin sorumluluğundadır ve ilgili üçüncü tarafın gizlilik politikasına tabidir. Entegrasyon kimlik bilgileri (API anahtarları, token’lar, client secret’lar) şifreli olarak saklanır ve yalnızca ilgili entegrasyon işlemleri için kullanılır.",
        ],
        [
 "10. Bildirim Entegrasyonları (Slack, Microsoft Teams, Zapier, Make, SMS)",
 "Organizasyon yöneticisi tarafından yapılandırılan webhook URL’leri aracılığıyla etkinlik kaydı, check-in ve sertifika gibi operasyonel olaylar ilgili kanallara bildirilebilir. Bu bildirimler yalnızca yönetici tarafından seçilen olayları ve organizasyon adı, etkinlik adı gibi bağlamsal verileri içerir; kişisel veri aktarımı asgari düzeyde tutulur ve yapılandırma organizasyon yöneticisinin tercihine bırakılır.",
        ],
        [
 "11. Yapay Zekâ Asistanı Entegrasyonları (ChatGPT Eklentisi ve MCP)",
 "HeptaCert, organizatörlerin hesaplarını ChatGPT eklentisi ve Model Context Protocol (MCP) uyumlu diğer yapay zekâ asistanlarıyla bağlamasına olanak tanır. Bu bağlantı isteğe bağlıdır ve yalnızca kullanıcı OAuth onay ekranında izin verdiğinde kurulur.",
 ["Hangi veriler aktarılır: Yalnızca kullanıcının asistandan istediği işlem için gereken veriler; örneğin etkinlik adı ve tarihi, katılımcı adı ve e-posta adresi, check-in durumu, sertifika durumu ve doğrulama bağlantısı, e-posta şablonları, anket ayarları ve istatistikler. Parola, API anahtarı ve webhook imza anahtarı gibi gizli bilgiler aktarılmaz.", "Kime aktarılır: Kullanıcının kullandığı asistan sağlayıcısına (ChatGPT için OpenAI, L.L.C., ABD). Bu aktarım, kullanıcı asistanı kullandığında ve kullanıcının talebi üzerine gerçekleşir. Sağlayıcının bu verileri işlemesi kendi gizlilik politikasına tabidir (OpenAI: https://openai.com/policies/privacy-policy).", "Yurt dışına aktarım: Asistan sağlayıcısının sunucuları Türkiye ve Avrupa Birliği dışında bulunabilir. Bu aktarım, kullanıcının asistanı bağlayıp talepte bulunmasıyla, 6698 sayılı KVKK'nın yurt dışına aktarım hükümleri ve uygulanabildiği ölçüde GDPR çerçevesinde gerçekleşir.", "Yetki ve sınırlar: Asistan yalnızca bağlanan hesabın ve organizasyonun mevcut yetkileri kapsamında işlem yapabilir. Toplu e-posta, silme, iptal ve sertifika üretimi gibi yüksek etkili işlemler kullanıcının açık onayı olmadan yürütülmez.", "Bağlantıyı kaldırma: Kullanıcı bağlantıyı asistan ayarlarından veya HeptaCert'te Entegrasyonlar sayfasından istediği zaman kaldırabilir; bu durumda yeni veri aktarımı durur. Daha önce asistana aktarılmış veriler, asistan sağlayıcısının saklama kurallarına tabidir.", "Organizatörün sorumluluğu: Katılımcı verilerini bir yapay zekâ asistanıyla işlemeden önce katılımcıları bu konuda bilgilendirmek organizatörün sorumluluğundadır. 13 yaşından küçük kişilerin verileri bu entegrasyonlar üzerinden işlenmemelidir."],
        ],
        [
 "12. Kullanıcı ve Organizatör Sorumluluğu",
 "Kullanıcılar ve etkinlik düzenleyicileri platforma yükledikleri verilerin hukuka uygunluğundan, gerekli aydınlatma/rıza süreçlerinden ve üçüncü kişi haklarına uyumdan sorumludur. Etkinliğe özel metin ve onayların hazırlanması ve ispatlanması düzenleyicinin sorumluluğundadır. TC kimlik no, pasaport no, öğrenci no, doğum tarihi, adres ve benzeri kişisel verilerin toplanmasının amacı ve saklama süresi organizatör tarafından belirlenmelidir.",
        ],
        [
 "13. Çerezler ve Benzer Teknolojiler",
 "Platform temel olarak zorunlu ve güvenlik amaçlı çerezler kullanır. Performans veya analiz amaçlı araçlar kullanılması halinde gerekli hukuki gereklilikler ayrıca uygulanır.",
        ],
        [
 "14. Veri Paylaşımı ve Yurt Dışı Altyapı",
 "Veriler pazarlama amacıyla satılmaz. Kişisel veriler yalnızca hizmetin çalışması için gerekli tedarikçilerle, ödeme altyapılarıyla, teknik altyapı sağlayıcılarıyla, hukuken yetkili kurumlarla ve kullanıcının talebi üzerine bağladığı yapay zekâ asistanı sağlayıcılarıyla (bkz. bölüm 11) paylaşılabilir. HeptaCert, teknik altyapı ve sunucu barındırma hizmetleri kapsamında Hetzner Online GmbH tarafından sağlanan sunucu ve veri merkezi altyapısından yararlanmaktadır. HeptaCert ile Hetzner Online GmbH arasında veri işleme faaliyetlerine ilişkin Data Processing Agreement / Veri İşleme Sözleşmesi akdedilmiştir. Bu kapsamda Hetzner Online GmbH, kişisel verileri yalnızca barındırma ve teknik altyapı hizmetlerinin sağlanması amacıyla, HeptaCert’in talimatları doğrultusunda ve uygun teknik/organizasyonel tedbirler çerçevesinde işleyen altyapı sağlayıcısı olarak hareket eder. Kullanılan sunucular Finlandiya'nın Helsinki bölgesinde bulunmaktadır. Bu nedenle hesap bilgileri, oturum/cihaz verileri, platform kullanım kayıtları, güvenlik logları, ödeme referansları ve kullanıcıların etkinlik bazında girdiği ek bilgiler; hizmetin sunulması, sistem güvenliği, yedekleme, bakım, teknik destek ve hizmet sürekliliği amaçlarıyla Finlandiya'nın Helsinki bölgesinde bulunan sunucularda saklanabilir, işlenebilir veya teknik olarak erişilebilir hale gelebilir. Yurt dışına aktarım ve veri işleme faaliyetleri, 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili mevzuata uygun olarak yürütülür.",
        ],
        [
 "15. Saklama ve Silme",
 "Veriler hizmet ilişkisi süresince ve yasal saklama süreleri boyunca tutulur; kategori bazındaki saklama süreleri KVKK Aydınlatma Metni'nde yer alır. Organizatörler, etkinlik verileri için HeptaCert'teki saklama politikası ayarlarıyla kendi sürelerini belirleyebilir; süresi dolan veriler geri döndürülemez şekilde silinir veya anonim hale getirilir. Hesabınızın ve hesap verilerinizin silinmesini contact@heptapusgroup.com adresinden de talep edebilirsiniz; talebiniz yasal saklama yükümlülükleri saklı kalmak kaydıyla en geç 30 gün içinde sonuçlandırılır.",
        ],
        [
 "16. Güvenlik",
 "HeptaCert; HTTPS/TLS ile şifreli bağlantı, parola hashleme, rol ve organizasyon bazlı erişim yetkilendirmesi, OAuth kapsam (scope) sınırları, kayıt izleme, oran sınırlama, yedekleme ve sunucu güvenliği gibi makul teknik ve idari tedbirler uygular. Sunucu altyapısı, Veri İşleme Sözleşmesi (Data Processing Agreement) akdedilmiş olan Hetzner Online GmbH tarafından Finlandiya'nın Helsinki bölgesinde sağlanır; bu sözleşme teknik ve organizasyonel tedbirler, gizlilik yükümlülükleri, veri ihlali bildirimleri, alt işleyen kullanımı ve denetim/destek süreçlerini düzenler. Kişisel verilerin bulunduğu sistemlere erişim yalnızca yetkilendirilmiş kişilerle sınırlıdır. İnternet üzerinden sunulan hiçbir sistem için mutlak güvenlik garantisi verilemez.",
        ],
        [
 "17. Çocuklar",
 "HeptaCert, 13 yaşından küçük çocuklara yönelik değildir ve bilerek bu yaştaki çocuklardan veri toplamaz. Organizatörler, reşit olmayan katılımcıların verilerini yalnızca ilgili mevzuatın gerektirdiği veli/vasi bilgilendirmesi ve onayı ile işleyebilir; 13 yaşından küçük kişilerin verileri yapay zekâ asistanı entegrasyonları üzerinden işlenmemelidir. Bu tür bir veri işlendiğini fark ederseniz contact@heptapusgroup.com adresine bildirin; veriyi sileriz.",
        ],
        [
 "18. Haklar ve Başvurular",
 "KVKK md. 11 ve uygulanabildiği ölçüde GDPR md. 15–22 kapsamında; verilerinizin işlenip işlenmediğini öğrenme, bunlara erişme, düzeltilmesini, silinmesini veya işlenmesinin kısıtlanmasını isteme, veri taşınabilirliği, işlemeye itiraz etme ve otomatik işleme sonucu aleyhinize bir sonuca itiraz etme haklarına sahipsiniz. Başvurularınızı contact@heptapusgroup.com adresine iletebilirsiniz; başvurular en geç 30 gün içinde yanıtlanır. Bir etkinlik kapsamında toplanan veriler için ilgili etkinlik düzenleyicisine de başvurabilirsiniz; yanlış muhataba yapılan başvurular makul ölçüde doğru kanala yönlendirilir. Yanıtımızdan memnun kalmazsanız Kişisel Verileri Koruma Kurulu'na; Avrupa Birliği'nde bulunuyorsanız bulunduğunuz ülkenin veri koruma denetim makamına şikâyette bulunabilirsiniz.",
        ],
      ]
    : [
        [
 "1. Data Controller",
 "The HeptaCert platform is operated by Samet Ünsal as an individual. \"Heptapus Group\" is a brand name, not a registered company. In this policy \"HeptaCert\", \"we\" or \"the operator\" refers to Samet Ünsal. For personal data requests: contact@heptapusgroup.com",
        ],
        [
 "2. Scope",
 "This policy explains personal data processing activities carried out by the operator within HeptaCert. Event organizers may carry out additional processing under their own responsibility.",
        ],
        [
 "3. Role Allocation",
 "For account management and technical platform operations, the operator may act as a data controller or data processor depending on context. For event-specific registration data, the event organizer may act as an independent data controller.",
        ],
        [
 "4. Information We Collect",
 "We may process account details, session/device metadata, platform usage records, security logs, payment references, and additional event-level information entered by users.",
        ],
        [
 "5. Purposes of Use",
 "Data is used for service delivery, authentication, certificate generation, event operations, support, security, abuse prevention, and legal compliance.",
        ],
        [
 "6. Legal Bases",
 "Personal data is processed on the basis of entering into and performing a contract (account, plan, event and certificate services), compliance with legal obligations (e.g. invoicing and tax records), legitimate interests (security, abuse prevention, service improvement) and, where required, consent (KVKK Art. 5; GDPR Art. 6(1)(a), (b), (c), (f)).",
        ],
        [
 "7. Google Sign-In, Google Sheets, Google Drive and Google Calendar Access",
 "HeptaCert uses Google Sign-In to authenticate users and simplify account creation and login. Where provided by Google, basic profile information such as name, email address, and profile picture may be processed. When explicitly authorized by the user or organizer, HeptaCert may use Google Sheets and Google Drive file access to export, create, update, and manage spreadsheets containing event-related participant, registration, check-in, ticket, and certificate data. When organization venue reservation or event calendar integration is explicitly enabled, HeptaCert may use Google Calendar access only to create, update, delete, check availability for, and perform two-way synchronization of the relevant reservation/event records. HeptaCert uses Google Drive access only for files created by the app or files the user chooses to use with the app, and Google Calendar access only for calendars connected and selected by the user within the integration scope. HeptaCert does not access unrelated Google Drive files, Gmail content, or Google user content outside the integration scope.",
        ],
        [
 "8. Microsoft 365 Excel and OneDrive Integration",
 "When explicitly authorized by the organization administrator, HeptaCert uses Microsoft 365 OAuth to create, update, and manage Excel workbooks in the user's OneDrive containing event participant and segment data. Access is limited to files created by HeptaCert; the user's other OneDrive files, emails, or Microsoft 365 content outside the integration scope are not accessed. Microsoft credentials are stored encrypted and used solely for the relevant synchronization operations.",
        ],
        [
 "9. Enterprise Integrations (Salesforce, Mailchimp/Brevo, WhatsApp Business, Zoom, OIDC/SSO)",
 "HeptaCert offers optional enterprise integrations that allow organization administrators to connect their own accounts to the platform. These integrations are only active when explicitly enabled by the relevant organization administrator. When Salesforce integration is enabled, participant name, email address, and certificate status data may be exported to the organization's Salesforce account. When Mailchimp or Brevo integration is enabled, email addresses from event segments may be added to the configured mailing list. When WhatsApp Business integration is enabled, ticket, reminder, and certificate notifications may be sent to phone numbers configured by the organization via Meta's Cloud API. When Zoom integration is enabled, email addresses from webinar attendance reports are fetched and matched with CRM profiles; data obtained from Zoom is used solely for certificate eligibility purposes. When OIDC/SSO integration is enabled, authentication is performed via the organization's identity provider (Microsoft Entra ID, Okta, etc.); only the email address and basic profile information are processed. For all such integrations, the organization administrator is responsible for data transferred to third-party systems, and such data is subject to the relevant third party's privacy policy. Integration credentials (API keys, tokens, client secrets) are stored encrypted and used only for the relevant integration operations.",
        ],
        [
 "10. Notification Integrations (Slack, Microsoft Teams, Zapier, Make, SMS)",
 "Operational events such as event registration, check-in, and certificate issuance may be delivered to configured channels via webhook URLs set up by the organization administrator. These notifications contain only the events selected by the administrator and contextual data such as organization name and event name; personal data transfer is minimized and configuration is left to the organization administrator's preference.",
        ],
        [
 "11. AI Assistant Integrations (ChatGPT Plugin and MCP)",
 "HeptaCert lets organizers connect their accounts to the ChatGPT plugin and other AI assistants that support the Model Context Protocol (MCP). The connection is optional and is established only after the user grants permission on the OAuth consent screen.",
 ["What is shared: Only the data needed for the action the user asks the assistant to perform, for example event name and date, attendee name and email address, check-in status, certificate status and verification link, email templates, survey settings and statistics. Secrets such as passwords, API keys and webhook signing keys are not shared.", "With whom: The assistant provider the user chooses (for ChatGPT: OpenAI, L.L.C., USA). Sharing happens when, and because, the user uses the assistant. The provider's processing is governed by its own privacy policy (OpenAI: https://openai.com/policies/privacy-policy).", "International transfer: The assistant provider's servers may be located outside Türkiye and the European Union. The transfer takes place at the user's request, within the international-transfer provisions of Turkish Law No. 6698 (KVKK) and, where applicable, the GDPR.", "Permissions and limits: The assistant can act only within the existing permissions of the connected account and organization. High-impact actions such as bulk email, deletion, revocation and certificate issuance are not executed without the user's explicit confirmation.", "Disconnecting: The user can remove the connection at any time from the assistant's settings or from the Integrations page in HeptaCert; further sharing then stops. Data already shared with the assistant is subject to the provider's retention rules.", "Organizer responsibility: Before processing attendee data with an AI assistant, the organizer is responsible for informing attendees accordingly. Data of persons under 13 must not be processed through these integrations."],
        ],
        [
 "12. User and Organizer Responsibility",
 "Users and event organizers are responsible for legal compliance of uploaded data, required notices/consents, and third-party rights compliance. Preparing and evidencing event-specific notices and consents is primarily the organizer's responsibility.",
        ],
        [
 "13. Cookies and Similar Technologies",
 "The platform primarily uses essential and security-related cookies. Where analytics/performance tools are used, applicable legal requirements are followed.",
        ],
        [
 "14. Data Sharing and Overseas Infrastructure",
 "Data is not sold for marketing. Personal data may be shared only with required service providers, payment infrastructure partners, technical infrastructure providers, legally authorized authorities and, at the user's request, the AI assistant providers the user connects (see section 11). HeptaCert uses server and data center infrastructure provided by Hetzner Online GmbH for technical infrastructure and server hosting services. HeptaCert has entered into a Data Processing Agreement with Hetzner Online GmbH regarding data processing activities. Under this agreement, Hetzner Online GmbH acts as an infrastructure and hosting provider and processes personal data only for the purposes of providing hosting and technical infrastructure services, in accordance with HeptaCert’s instructions and applicable technical and organizational measures. The servers used are located in Helsinki, Finland. Therefore, account details, session/device metadata, platform usage records, security logs, payment references and additional event-level information entered by users may be stored, processed or technically made accessible on servers located in Helsinki, Finland for service delivery, system security, backup, maintenance, technical support and service continuity purposes. International transfer and processing activities are carried out in accordance with Turkish Personal Data Protection Law No. 6698 and applicable legislation.",
        ],
        [
 "15. Retention and Deletion",
 "Data is kept for the duration of the service relationship and applicable legal retention periods; retention periods per category are listed in the Privacy Disclosure Notice. Organizers can set their own retention periods for event data in HeptaCert's retention policy settings; expired data is irreversibly deleted or anonymized. You can also request deletion of your account and account data at contact@heptapusgroup.com; we complete the request within 30 days at the latest, subject to legal retention obligations.",
        ],
        [
 "16. Security",
 "HeptaCert applies reasonable technical and administrative measures including HTTPS/TLS, password hashing, role- and organization-based access control, OAuth scope limits, logging, rate limiting, backups and server hardening. Server infrastructure is provided in Helsinki, Finland by Hetzner Online GmbH under a Data Processing Agreement covering technical and organizational measures, confidentiality obligations, personal data breach notifications, use of subprocessors and audit/support processes. Access to systems containing personal data is limited to authorized persons. No internet-based system can be guaranteed to be absolutely secure.",
        ],
        [
 "17. Children",
 "HeptaCert is not directed at children under 13 and does not knowingly collect data from them. Organizers may process minors' data only with the parental notice and consent that applicable law requires, and must not process data of persons under 13 through AI assistant integrations. If you become aware of such processing, contact contact@heptapusgroup.com and we will delete the data.",
        ],
        [
 "18. Rights and Requests",
 "Under KVKK Art. 11 and, where applicable, GDPR Arts. 15–22, you have the right to learn whether your data is processed, to access it, to request rectification, erasure or restriction, to data portability, to object to processing and to object to an adverse outcome of automated processing. Send requests to contact@heptapusgroup.com; we respond within 30 days at the latest. For data collected for a specific event you may also contact that event's organizer; misdirected requests are reasonably redirected. If you are not satisfied with our response you may complain to the Turkish Personal Data Protection Board or, if you are in the European Union, to your local data protection supervisory authority.",
        ],
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-content-muted">
        <Link href="/" className="transition-colors hover:text-brand-600">
          {isTr ? "Ana Sayfa" : "Home"}
        </Link>
        <span>/</span>
        <span className="font-medium text-content-secondary">
          {isTr ? "Gizlilik Politikası" : "Privacy Policy"}
        </span>
      </div>

      <div className="space-y-8 rounded-2xl border border-outline-subtle bg-raised p-8 shadow-card md:p-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">
            {isTr ? "Hukuki Bilgilendirme" : "Legal Notice"}
          </p>
          <h1 className="text-3xl font-extrabold text-content-primary">
            {isTr ? "HeptaCert Gizlilik Politikası" : "HeptaCert Privacy Policy"}
          </h1>
          <p className="mt-2 text-sm text-content-muted">
            {isTr ? "Son güncelleme: 3 Ekim 2026" : "Last updated: October 3, 2026"}
          </p>
        </div>

        {sections.map(([title, body, items]) => (
          <section key={title} className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary">{title}</h2>
            <p className="text-sm leading-relaxed text-content-secondary">{body}</p>
            {items && (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-content-secondary">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-subtle bg-canvas p-5">
          <div>
            <p className="text-xs text-content-muted">
              {isTr ? "Gizlilik talepleri için" : "For privacy requests"}
            </p>
            <a
              href="mailto:contact@heptapusgroup.com"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              contact@heptapusgroup.com
            </a>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/kvkk"
              className="text-sm text-content-muted transition-colors hover:text-brand-600"
            >
              {isTr ? "KVKK" : "Privacy Notice"}
            </Link>
            <Link
              href="/acik-riza"
              className="text-sm text-content-muted transition-colors hover:text-brand-600"
            >
              {isTr ? "Açık Rıza Metni" : "Explicit Consent Text"}
            </Link>
            <Link
              href="/kullanim-kosullari"
              className="text-sm text-content-muted transition-colors hover:text-brand-600"
            >
              {isTr ? "Kullanım Koşulları" : "Terms of Use"}
            </Link>
            <Link
              href="/iletisim"
              className="text-sm text-content-muted transition-colors hover:text-brand-600"
            >
              {isTr ? "İletişim" : "Contact"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
