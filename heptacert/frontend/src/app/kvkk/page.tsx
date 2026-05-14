"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function KVKKPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const sections = isTr
    ? [
        ["1. Veri Sorumluluğu Rolleri", "HeptaCert platformunun üyelik, hesap güvenliği, sistem kayıtları ve platform işletimi kapsamındaki verilerde Heptapus Group, işleme bağlamına göre veri sorumlusu veya veri işleyen sıfatıyla hareket edebilir."],
        ["2. Etkinlik Düzenleyicisinin Rolü", "Etkinlik kayıt sürecinde toplanan ad-soyad, iletişim bilgisi, TC kimlik no, pasaport no, öğrenci no, doğum tarihi, adres, form yanıtları, belge yüklemeleri ve benzeri etkinliğe özgü verilerde etkinliği düzenleyen kişi/kurum ayrıca bağımsız veri sorumlusu olabilir. Bu alanların hangi amaçla toplandığı, hangi hukuki sebebe dayandığı, kimlerle paylaşıldığı ve ne kadar süre saklandığı organizatörün sorumluluğundadır."],
        ["3. İşlenen Veri Kategorileri", "Kimlik ve iletişim verileri, hesap/oturum verileri, işlem geçmişi, ödeme referansları, güvenlik logları ve kullanıcı tarafından etkinlik bazında girilen ek veriler işlenebilir."],
        ["4. İşleme Amaçları", "Hesap açılışı, kimlik doğrulama, etkinlik kayıt operasyonu, sertifika üretimi, ödeme süreçleri, güvenlik, dolandırıcılık önleme, destek hizmetleri ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla veri işlenir."],
        ["5. Hukuki Sebepler", "Veriler; sözleşmenin kurulması/ifası, hukuki yükümlülüklerin yerine getirilmesi, meşru menfaat ve gerektiğinde açık rıza hukuki sebeplerine dayanılarak işlenir. Etkinlik düzenleyicileri kendi hukuki sebep seçimi ve aydınlatma yükümlülüklerinden sorumludur."],
        ["6. Kişisel Verilerin Aktarımı, Yurt Dışı Sunucular ve Hetzner Altyapısı", "HeptaCert hizmetlerinin sunulması, platform altyapısının işletilmesi, kullanıcı ve etkinlik kayıtlarının tutulması, sertifika oluşturma süreçlerinin yürütülmesi, sistem güvenliğinin sağlanması, yedekleme, bakım, teknik destek, hata kayıtlarının incelenmesi, siber güvenlik önlemlerinin uygulanması ve hizmet sürekliliğinin sağlanması amaçlarıyla kişisel verileriniz elektronik ortamda işlenebilir. HeptaCert, teknik altyapı ve sunucu barındırma hizmetleri kapsamında Hetzner Online GmbH tarafından sağlanan sunucu ve veri merkezi altyapısından yararlanmaktadır. HeptaCert ile Hetzner Online GmbH arasında veri işleme faaliyetlerine ilişkin Data Processing Agreement / Veri İşleme Sözleşmesi akdedilmiştir. Bu sözleşme kapsamında Hetzner Online GmbH, kişisel verileri altyapı ve barındırma hizmetlerinin sağlanması amacıyla, uygun teknik ve organizasyonel tedbirleri uygulayarak ve HeptaCert’in talimatları doğrultusunda işler. Kullanılan sunucular Finlandiya'nın Helsinki bölgesinde bulunmaktadır. Bu nedenle HeptaCert tarafından işlenen kişisel verileriniz, hizmetin sunulması için gerekli olduğu ölçüde Finlandiya'nın Helsinki bölgesinde bulunan sunucularda saklanabilir, işlenebilir, yedeklenebilir veya teknik olarak erişilebilir hale gelebilir. Bu kapsamda yurt dışına aktarılabilecek kişisel veriler; kimlik bilgileri, iletişim bilgileri, kullanıcı hesabı bilgileri, etkinlik kayıt bilgileri, sertifika bilgileri, işlem güvenliği bilgileri, log kayıtları, IP adresi, cihaz ve tarayıcı bilgileri ile hizmetin niteliğine göre kullanıcı tarafından sisteme girilen diğer bilgilerden oluşabilir. Yurt dışına aktarım; 6698 sayılı Kişisel Verilerin Korunması Kanunu, ilgili ikincil mevzuat ve Kişisel Verileri Koruma Kurulu kararlarına uygun olarak, ilgili aktarım şartlarının mevcut olması halinde gerçekleştirilir. Aktarım, hizmetin ifası, sistem güvenliği, veri yedekleme, teknik altyapı yönetimi ve sözleşmesel yükümlülüklerin yerine getirilmesi amaçlarıyla sınırlıdır. HeptaCert, kişisel verilerin yurt dışında işlenmesi sürecinde uygun teknik ve idari tedbirlerin alınması için makul özeni gösterir. Hetzner Online GmbH, altyapı sağlayıcısı sıfatıyla kişisel verileri yalnızca barındırma ve teknik altyapı hizmetlerinin sağlanması amacıyla işleyebilir."],
        ["7. Saklama Süresi", "Veriler hizmetin gerektirdiği süre ve ilgili mevzuatta öngörülen zamanaşımı/saklama süreleri boyunca tutulur; süre sonunda silinir, yok edilir veya anonimleştirilir."],
        ["8. Veri Güvenliği", "Hetzner Online GmbH ile akdedilen Data Processing Agreement / Veri İşleme Sözleşmesi kapsamında teknik ve organizasyonel tedbirlerin uygulanması, gizlilik yükümlülükleri, veri ihlali bildirimleri, alt işleyen kullanımı ve denetim/destek süreçlerine ilişkin hükümler düzenlenmiştir. HeptaCert ayrıca kendi sistemleri bakımından erişim yetkilendirmesi, güvenli bağlantı, parola hashleme, kayıt izleme, yedekleme, sunucu güvenliği, oran sınırlama ve yetkisiz erişimlerin önlenmesine yönelik makul teknik ve idari tedbirleri uygular. Kişisel verilerin saklandığı sistemlerde HTTPS/TLS, erişim yetkilendirmesi, güvenli bağlantı, parola hashleme, kayıt izleme, yedekleme, sunucu güvenliği, güvenlik duvarı, oran sınırlama, kötüye kullanım tespiti, yetkisiz erişimlerin önlenmesi ve gerekli görülen diğer teknik/idari tedbirler uygulanır. Sunuculara ve kişisel verilerin bulunduğu sistemlere erişim yalnızca yetkilendirilmiş kişilerle sınırlıdır. Buna rağmen internet üzerinden sunulan hiçbir sistem için mutlak güvenlik garantisi verilemez."],
        ["9. Haklarınız", "KVKK md. 11 kapsamındaki bilgi alma, düzeltme, silme, işleme itiraz ve diğer haklarınızı kullanabilirsiniz. Talebin niteliğine göre başvuru ilgili veri sorumlusuna (Heptapus Group veya etkinlik düzenleyicisi) yönlendirilmelidir."],
        ["10. İlgili Metinler", "Kişisel verilerinizin işlenmesine ilişkin ayrıntılı bilgiye Gizlilik Politikası ve Açık Rıza Metni üzerinden ulaşabilirsiniz."],
      ]
    : [
        ["1. Data Controller Roles", "For membership, account security, system logs, and platform operations, Heptapus Group may act as a data controller or data processor depending on processing context."],
        ["2. Event Organizer Role", "For event-specific registration data such as attendee details, national ID/passport numbers, student numbers, date of birth, address, custom form responses, and uploaded documents, the event organizer may also act as an independent data controller. The organizer is responsible for the collection purpose, legal basis, retention period, and notices applicable to those fields."],
        ["3. Data Categories", "Identity and contact data, account/session data, transaction records, payment references, security logs, and additional event-level data provided by users may be processed."],
        ["4. Processing Purposes", "Data is processed for account setup, authentication, event registration operations, certificate generation, payments, security, fraud prevention, support, and legal compliance."],
        ["5. Legal Bases", "Processing may rely on contract performance, legal obligations, legitimate interests, and explicit consent where required. Event organizers remain responsible for selecting legal basis and providing notice for their own processing."],
        ["6. Personal Data Transfers, Overseas Servers and Hetzner Infrastructure", "Your personal data may be processed electronically for the purposes of providing HeptaCert services, operating the platform infrastructure, creating and managing user accounts, carrying out event registration processes, generating certificates, supporting payment and invoicing processes, ensuring system security, performing backups, maintenance, technical support, reviewing error logs, implementing cybersecurity measures and ensuring service continuity. HeptaCert uses server and data center infrastructure provided by Hetzner Online GmbH for technical infrastructure and server hosting services. HeptaCert has entered into a Data Processing Agreement with Hetzner Online GmbH regarding data processing activities. Under this agreement, Hetzner Online GmbH acts as an infrastructure and hosting provider and processes personal data only for the purposes of providing hosting and technical infrastructure services, in accordance with HeptaCert’s instructions and applicable technical and organizational measures. The servers used are located in Helsinki, Finland. Therefore, your personal data may be stored, processed, backed up or technically made accessible on servers located in Helsinki, Finland to the extent necessary for the provision of the service. The personal data that may be transferred abroad based on your processing activities may include identity information, contact information, user account information, event registration information, certificate information, transaction security information, log records, IP address, device and browser information and other information entered into the system depending on the nature of the service. International transfer is carried out in compliance with Turkish Personal Data Protection Law No. 6698, applicable secondary legislation and relevant decisions of the Personal Data Protection Board, where the applicable transfer conditions exist. The transfer is limited to the purposes of service performance, system security, data backup, technical infrastructure management and contractual compliance. HeptaCert takes reasonable care to ensure that appropriate technical and organizational safeguards are in place when personal data is processed abroad. Hetzner Online GmbH may process personal data only for the provision of hosting and technical infrastructure services as an infrastructure provider."],
        ["7. Retention", "Data is retained for the duration required by service needs and legal retention/limitation periods, then deleted, destroyed, or anonymized."],
        ["8. Security", "The Data Processing Agreement entered into with Hetzner Online GmbH includes provisions regarding technical and organizational measures, confidentiality obligations, personal data breach notifications, use of subprocessors and audit/support processes. HeptaCert also applies reasonable technical and administrative measures for its own systems, including access authorization, secure connections, password hashing, logging, backups, server security, rate limiting and prevention of unauthorized access. Technical and organizational safeguards such as HTTPS/TLS, access control, password hashing, logging, abuse prevention, backup and server security measures are used. The server infrastructure is provided through Hetzner Online GmbH, whose servers are located in Helsinki, Finland. Access to servers and systems containing personal data is limited to authorized persons only. Absolute security cannot be guaranteed for any internet-based system."],
        ["9. Your Rights", "You may exercise rights such as access, correction, deletion, and objection under applicable data protection law. Depending on the request scope, you may need to contact the relevant data controller (Heptapus Group or the event organizer)."],
        ["10. Related Texts", "You can access detailed information regarding the processing of your personal data through the Privacy Policy and Explicit Consent Text."],
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition-colors hover:text-brand-600">{isTr ? "Ana Sayfa" : "Home"}</Link>
        <span>/</span>
        <span className="font-medium text-gray-600">{isTr ? "KVKK Aydınlatma Metni" : "Privacy Disclosure Notice"}</span>
      </div>

      <div className="space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-card md:p-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">{isTr ? "Hukuki Bilgilendirme" : "Legal Notice"}</p>
          <h1 className="text-3xl font-extrabold text-gray-900">{isTr ? "KVKK Aydınlatma Metni" : "Privacy Disclosure Notice"}</h1>
          <p className="mt-2 text-sm text-gray-500">{isTr ? "Son güncelleme: 14 Mayıs 2026" : "Last updated: May 14, 2026"}</p>
        </div>

        {sections.map(([title, body]) => (
          <section key={title} className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <p className="text-sm leading-relaxed text-gray-600">{body}</p>
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div>
            <p className="text-xs text-gray-500">{isTr ? "Sorularınız için" : "For questions"}</p>
            <a href="mailto:contact@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">contact@heptapusgroup.com</a>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/gizlilik" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Gizlilik Politikası" : "Privacy Policy"}</Link>
            <Link href="/acik-riza" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Açık Rıza Metni" : "Explicit Consent Text"}</Link>
            <Link href="/kullanim-kosullari" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Kullanım Koşulları" : "Terms of Use"}</Link>
            <Link href="/iletisim" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "İletişim" : "Contact"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
