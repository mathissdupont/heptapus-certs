"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function GizlilikPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const sections = isTr
    ? [
        [
          "1. Politikanın Kapsamı",
          "Bu politika, HeptaCert platformu kapsamında Heptapus Group tarafından yürütülen kişisel veri işleme faaliyetlerini açıklar. Etkinlik düzenleyicilerinin kendi veri işleme faaliyetleri ayrıca kendi sorumluluklarındadır.",
        ],
        [
          "2. Rol Ayrımı",
          "Platformun hesap yönetimi ve teknik işletimi bakımından Heptapus Group, işleme bağlamına göre veri sorumlusu veya veri işleyen olarak hareket edebilir. Etkinlik kayıt formlarında toplanan etkinliğe özgü veriler bakımından etkinlik düzenleyicisi bağımsız veri sorumlusu olabilir.",
        ],
        [
          "3. Toplanan Bilgiler",
          "Hesap bilgileri, oturum/cihaz verileri, platform kullanım kayıtları, güvenlik logları, ödeme referansları ve kullanıcıların etkinlik bazında girdiği ek bilgiler işlenebilir.",
        ],
        [
          "4. Kullanım Amaçları",
          "Veriler hizmetin sunulması, kimlik doğrulama, sertifika üretimi, etkinlik operasyonları, destek, güvenlik, kötüye kullanımın önlenmesi ve yasal yükümlülüklerin yerine getirilmesi için kullanılır.",
        ],
        [
          "5. Google ile Giriş, Google Sheets, Google Drive ve Google Calendar Erişimi",
          "HeptaCert, Google ile giriş özelliğini kullanıcıların kimliğini doğrulamak ve hesap oluşturma/giriş sürecini kolaylaştırmak amacıyla kullanır. Google tarafından sağlanması halinde ad, soyad, e-posta adresi ve profil görseli gibi temel profil bilgileri işlenebilir. Kullanıcı veya organizatör tarafından açıkça yetki verilmesi halinde HeptaCert, etkinliklere ilişkin katılımcı, kayıt, check-in, bilet ve sertifika verilerinin Google Sheets’e aktarılması, oluşturulan tabloların güncellenmesi ve yönetilmesi amacıyla Google Sheets ve Google Drive dosya erişimini kullanabilir. Organizasyon salon rezervasyonu veya etkinlik takvimi entegrasyonu açıkça etkinleştirildiğinde HeptaCert, Google Calendar erişimini yalnızca ilgili rezervasyon/etkinlik kayıtlarını oluşturmak, güncellemek, silmek, uygunluk kontrolü yapmak ve çift yönlü senkronizasyon sağlamak amacıyla kullanabilir. Calendar verileri; etkinlik/salon adı, tarih-saat, açıklama, konum, organizasyon bilgisi, katılımcı veya yetkili e-posta adresleri ve senkronizasyon durum kayıtlarını içerebilir. HeptaCert, Google Drive erişimini yalnızca uygulama tarafından oluşturulan veya kullanıcının uygulama ile kullanmayı seçtiği dosyalar için, Google Calendar erişimini ise yalnızca kullanıcının bağladığı ve entegrasyon kapsamında seçtiği takvimler için kullanır; ilgisiz Google Drive dosyalarına, Gmail içeriklerine veya entegrasyon kapsamı dışındaki Google kullanıcı içeriklerine erişmez.",
        ],
        [
          "6. Kullanıcı ve Organizatör Sorumluluğu",
          "Kullanıcılar ve etkinlik düzenleyicileri platforma yükledikleri verilerin hukuka uygunluğundan, gerekli aydınlatma/rıza süreçlerinden ve üçüncü kişi haklarına uyumdan sorumludur. Etkinliğe özel metin ve onayların hazırlanması ve ispatlanması düzenleyicinin sorumluluğundadır. TC kimlik no, pasaport no, öğrenci no, doğum tarihi, adres ve benzeri kişisel verilerin toplanmasının amacı ve saklama süresi organizatör tarafından belirlenmelidir.",
        ],
        [
          "7. Çerezler ve Benzer Teknolojiler",
          "Platform temel olarak zorunlu ve güvenlik amaçlı çerezler kullanır. Performans veya analiz amaçlı araçlar kullanılması halinde gerekli hukuki gereklilikler ayrıca uygulanır.",
        ],
        [
          "8. Veri Paylaşımı ve Yurt Dışı Altyapı",
          "Veriler pazarlama amacıyla satılmaz. Kişisel veriler yalnızca hizmetin çalışması için gerekli tedarikçilerle, ödeme altyapılarıyla, teknik altyapı sağlayıcılarıyla ve hukuken yetkili kurumlarla paylaşılabilir. HeptaCert, teknik altyapı ve sunucu barındırma hizmetleri kapsamında Hetzner Online GmbH tarafından sağlanan sunucu ve veri merkezi altyapısından yararlanmaktadır. HeptaCert ile Hetzner Online GmbH arasında veri işleme faaliyetlerine ilişkin Data Processing Agreement / Veri İşleme Sözleşmesi akdedilmiştir. Bu kapsamda Hetzner Online GmbH, kişisel verileri yalnızca barındırma ve teknik altyapı hizmetlerinin sağlanması amacıyla, HeptaCert’in talimatları doğrultusunda ve uygun teknik/organizasyonel tedbirler çerçevesinde işleyen altyapı sağlayıcısı olarak hareket eder. Kullanılan sunucular Finlandiya'nın Helsinki bölgesinde bulunmaktadır. Bu nedenle hesap bilgileri, oturum/cihaz verileri, platform kullanım kayıtları, güvenlik logları, ödeme referansları ve kullanıcıların etkinlik bazında girdiği ek bilgiler; hizmetin sunulması, sistem güvenliği, yedekleme, bakım, teknik destek ve hizmet sürekliliği amaçlarıyla Finlandiya'nın Helsinki bölgesinde bulunan sunucularda saklanabilir, işlenebilir veya teknik olarak erişilebilir hale gelebilir. Yurt dışına aktarım ve veri işleme faaliyetleri, 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili mevzuata uygun olarak yürütülür.",
        ],
        [
          "9. Saklama ve Silme",
          "Veriler hizmet ilişkisi ve yasal saklama süreleri boyunca tutulur; ihtiyaç sona erdiğinde silinir, yok edilir veya anonim hale getirilir.",
        ],
        [
          "10. Güvenlik",
          "Hetzner Online GmbH ile akdedilen Data Processing Agreement / Veri İşleme Sözleşmesi kapsamında teknik ve organizasyonel tedbirlerin uygulanması, gizlilik yükümlülükleri, veri ihlali bildirimleri, alt işleyen kullanımı ve denetim/destek süreçlerine ilişkin hükümler düzenlenmiştir. HeptaCert ayrıca kendi sistemleri bakımından erişim yetkilendirmesi, güvenli bağlantı, parola hashleme, kayıt izleme, yedekleme, sunucu güvenliği, oran sınırlama ve yetkisiz erişimlerin önlenmesine yönelik makul teknik ve idari tedbirleri uygular. HTTPS/TLS, erişim kontrolü, parola hashleme, kayıt izleme, oran sınırlama, yedekleme ve sunucu güvenliği gibi teknik/idari tedbirler uygulanır. Sunucu altyapısı Finlandiya'nın Helsinki bölgesinde bulunan Hetzner Online GmbH üzerinden sağlanmaktadır. Sunuculara ve kişisel verilerin bulunduğu sistemlere erişim yalnızca yetkilendirilmiş kişilerle sınırlıdır. Buna rağmen hiçbir sistem için mutlak güvenlik garantisi verilemez.",
        ],
        [
          "11. Haklar ve Başvurular",
          "Mevzuat kapsamındaki haklarınızı kullanabilirsiniz. Talebin niteliğine göre başvuru Heptapus Group'a veya ilgili etkinlik düzenleyicisine yöneltilmelidir; yanlış muhataba yapılan başvurular makul ölçüde doğru kanala yönlendirilir.",
        ],
      ]
    : [
        [
          "1. Scope",
          "This policy explains personal data processing activities carried out by Heptapus Group within HeptaCert. Event organizers may carry out additional processing under their own responsibility.",
        ],
        [
          "2. Role Allocation",
          "For account management and technical platform operations, Heptapus Group may act as a data controller or data processor depending on context. For event-specific registration data, the event organizer may act as an independent data controller.",
        ],
        [
          "3. Information We Collect",
          "We may process account details, session/device metadata, platform usage records, security logs, payment references, and additional event-level information entered by users.",
        ],
        [
          "4. Purposes of Use",
          "Data is used for service delivery, authentication, certificate generation, event operations, support, security, abuse prevention, and legal compliance.",
        ],
        [
          "5. Google Sign-In, Google Sheets, Google Drive and Google Calendar Access",
          "HeptaCert uses Google Sign-In to authenticate users and simplify account creation and login. Where provided by Google, basic profile information such as name, email address, and profile picture may be processed. When explicitly authorized by the user or organizer, HeptaCert may use Google Sheets and Google Drive file access to export, create, update, and manage spreadsheets containing event-related participant, registration, check-in, ticket, and certificate data. When organization venue reservation or event calendar integration is explicitly enabled, HeptaCert may use Google Calendar access only to create, update, delete, check availability for, and perform two-way synchronization of the relevant reservation/event records. Calendar data may include venue/event name, date and time, description, location, organization details, attendee or authorized user email addresses, and synchronization status logs. HeptaCert uses Google Drive access only for files created by the app or files the user chooses to use with the app, and Google Calendar access only for calendars connected and selected by the user within the integration scope. HeptaCert does not access unrelated Google Drive files, Gmail content, or Google user content outside the integration scope.",
        ],
        [
          "6. User and Organizer Responsibility",
          "Users and event organizers are responsible for legal compliance of uploaded data, required notices/consents, and third-party rights compliance. Preparing and evidencing event-specific notices and consents is primarily the organizer's responsibility.",
        ],
        [
          "7. Cookies and Similar Technologies",
          "The platform primarily uses essential and security-related cookies. Where analytics/performance tools are used, applicable legal requirements are followed.",
        ],
        [
          "8. Data Sharing and Overseas Infrastructure",
          "Data is not sold for marketing. Personal data may be shared only with required service providers, payment infrastructure partners, technical infrastructure providers and legally authorized authorities. HeptaCert uses server and data center infrastructure provided by Hetzner Online GmbH for technical infrastructure and server hosting services. HeptaCert has entered into a Data Processing Agreement with Hetzner Online GmbH regarding data processing activities. Under this agreement, Hetzner Online GmbH acts as an infrastructure and hosting provider and processes personal data only for the purposes of providing hosting and technical infrastructure services, in accordance with HeptaCert’s instructions and applicable technical and organizational measures. The servers used are located in Helsinki, Finland. Therefore, account details, session/device metadata, platform usage records, security logs, payment references and additional event-level information entered by users may be stored, processed or technically made accessible on servers located in Helsinki, Finland for service delivery, system security, backup, maintenance, technical support and service continuity purposes. International transfer and processing activities are carried out in accordance with Turkish Personal Data Protection Law No. 6698 and applicable legislation.",
        ],
        [
          "9. Retention and Deletion",
          "Data is retained for the service relationship and legal retention periods, then deleted, destroyed, or anonymized.",
        ],
        [
          "10. Security",
          "The Data Processing Agreement entered into with Hetzner Online GmbH includes provisions regarding technical and organizational measures, confidentiality obligations, personal data breach notifications, use of subprocessors and audit/support processes. HeptaCert also applies reasonable technical and administrative measures for its own systems, including access authorization, secure connections, password hashing, logging, backups, server security, rate limiting and prevention of unauthorized access. Technical and organizational safeguards such as HTTPS/TLS, access control, password hashing, logging, abuse prevention, backup and server security measures are used. The server infrastructure is provided through Hetzner Online GmbH, whose servers are located in Helsinki, Finland. Access to servers and systems containing personal data is limited to authorized persons only. Absolute security cannot be guaranteed for any internet-based system.",
        ],
        [
          "11. Rights and Requests",
          "You may exercise your legal rights. Depending on request scope, you may need to contact Heptapus Group and/or the relevant event organizer; misdirected requests may be reasonably redirected to the proper channel.",
        ],
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition-colors hover:text-brand-600">
          {isTr ? "Ana Sayfa" : "Home"}
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-600">
          {isTr ? "Gizlilik Politikası" : "Privacy Policy"}
        </span>
      </div>

      <div className="space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-card md:p-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">
            {isTr ? "Hukuki Bilgilendirme" : "Legal Notice"}
          </p>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {isTr ? "HeptaCert Gizlilik Politikası" : "HeptaCert Privacy Policy"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isTr ? "Son güncelleme: 19 Mayıs 2026" : "Last updated: May 19, 2026"}
          </p>
        </div>

        {sections.map(([title, body]) => (
          <section key={title} className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <p className="text-sm leading-relaxed text-gray-600">{body}</p>
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div>
            <p className="text-xs text-gray-500">
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
              className="text-sm text-gray-500 transition-colors hover:text-brand-600"
            >
              {isTr ? "KVKK" : "Privacy Notice"}
            </Link>
            <Link
              href="/acik-riza"
              className="text-sm text-gray-500 transition-colors hover:text-brand-600"
            >
              {isTr ? "Açık Rıza Metni" : "Explicit Consent Text"}
            </Link>
            <Link
              href="/kullanim-kosullari"
              className="text-sm text-gray-500 transition-colors hover:text-brand-600"
            >
              {isTr ? "Kullanım Koşulları" : "Terms of Use"}
            </Link>
            <Link
              href="/iletisim"
              className="text-sm text-gray-500 transition-colors hover:text-brand-600"
            >
              {isTr ? "İletişim" : "Contact"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
