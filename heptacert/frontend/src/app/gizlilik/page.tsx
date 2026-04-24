"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function GizlilikPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const sections = isTr
    ? [
        ["1. Politikanın Kapsamı", "Bu politika, HeptaCert platformu kapsamında Heptapus Group tarafından yürütülen kişisel veri işleme faaliyetlerini açıklar. Etkinlik düzenleyicilerinin kendi veri işleme faaliyetleri ayrıca kendi sorumluluklarındadır."],
        ["2. Rol Ayrımı", "Platformun hesap yönetimi ve teknik işletimi bakımından Heptapus Group, işleme bağlamına göre veri sorumlusu veya veri işleyen olarak hareket edebilir. Etkinlik kayıt formlarında toplanan etkinliğe özgü veriler bakımından etkinlik düzenleyicisi bağımsız veri sorumlusu olabilir."],
        ["3. Toplanan Bilgiler", "Hesap bilgileri, oturum/cihaz verileri, platform kullanım kayıtları, güvenlik logları, ödeme referansları ve kullanıcıların etkinlik bazında girdiği ek bilgiler işlenebilir."],
        ["4. Kullanım Amaçları", "Veriler hizmetin sunulması, kimlik doğrulama, sertifika üretimi, etkinlik operasyonları, destek, güvenlik, kötüye kullanımın önlenmesi ve yasal yükümlülüklerin yerine getirilmesi için kullanılır."],
        ["5. Kullanıcı ve Organizatör Sorumluluğu", "Kullanıcılar ve etkinlik düzenleyicileri platforma yükledikleri verilerin hukuka uygunluğundan, gerekli aydınlatma/rıza süreçlerinden ve üçüncü kişi haklarına uyumdan sorumludur. Etkinliğe özel metin ve onayların hazırlanması/delillendirilmesi düzenleyicinin sorumluluğundadır."],
        ["6. Çerezler ve Benzer Teknolojiler", "Platform temel olarak zorunlu ve güvenlik amaçlı çerezler kullanır. Performans veya analiz amaçlı araçlar kullanılması halinde gerekli hukuki gereklilikler ayrıca uygulanır."],
        ["7. Veri Paylaşımı", "Veriler pazarlama amacıyla satılmaz. Yalnızca hizmetin çalışması için gerekli tedarikçilerle, ödeme altyapılarıyla ve hukuken yetkili kurumlarla paylaşılabilir."],
        ["8. Saklama ve Silme", "Veriler hizmet ilişkisi ve yasal saklama süreleri boyunca tutulur; ihtiyaç sona erdiğinde silinir, yok edilir veya anonim hale getirilir."],
        ["9. Güvenlik", "HTTPS/TLS, erişim kontrolü, parola hashleme, kayıt izleme, oran sınırlama ve benzeri teknik/idari tedbirler uygulanır. Buna rağmen hiçbir sistem için mutlak güvenlik garantisi verilemez."],
        ["10. Haklar ve Başvurular", "Mevzuat kapsamındaki haklarınızı kullanabilirsiniz. Talebin niteliğine göre başvuru Heptapus Group'a veya ilgili etkinlik düzenleyicisine yöneltilmelidir; yanlış muhataba yapılan başvurular makul ölçüde doğru kanala yönlendirilir."],
      ]
    : [
        ["1. Scope", "This policy explains personal data processing activities carried out by Heptapus Group within HeptaCert. Event organizers may carry out additional processing under their own responsibility."],
        ["2. Role Allocation", "For account management and technical platform operations, Heptapus Group may act as a data controller or data processor depending on context. For event-specific registration data, the event organizer may act as an independent data controller."],
        ["3. Information We Collect", "We may process account details, session/device metadata, platform usage records, security logs, payment references, and additional event-level information entered by users."],
        ["4. Purposes of Use", "Data is used for service delivery, authentication, certificate generation, event operations, support, security, abuse prevention, and legal compliance."],
        ["5. User and Organizer Responsibility", "Users and event organizers are responsible for legal compliance of uploaded data, required notices/consents, and third-party rights compliance. Preparing and evidencing event-specific notices/consents is primarily the organizer's responsibility."],
        ["6. Cookies and Similar Technologies", "The platform primarily uses essential and security-related cookies. Where analytics/performance tools are used, applicable legal requirements are followed."],
        ["7. Data Sharing", "Data is not sold for marketing. It may be shared only with required service providers, payment infrastructure partners, and legally authorized authorities."],
        ["8. Retention and Deletion", "Data is retained for the service relationship and legal retention periods, then deleted, destroyed, or anonymized."],
        ["9. Security", "Technical and organizational safeguards such as HTTPS/TLS, access control, password hashing, logging, and abuse prevention are used. Absolute security cannot be guaranteed."],
        ["10. Rights and Requests", "You may exercise your legal rights. Depending on request scope, you may need to contact Heptapus Group and/or the relevant event organizer; misdirected requests may be reasonably redirected to the proper channel."],
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition-colors hover:text-brand-600">{isTr ? "Ana Sayfa" : "Home"}</Link>
        <span>/</span>
        <span className="font-medium text-gray-600">{isTr ? "Gizlilik Politikası" : "Privacy Policy"}</span>
      </div>

      <div className="space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-card md:p-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">{isTr ? "Hukuki Bilgilendirme" : "Legal Notice"}</p>
          <h1 className="text-3xl font-extrabold text-gray-900">{isTr ? "Gizlilik Politikası" : "Privacy Policy"}</h1>
          <p className="mt-2 text-sm text-gray-500">{isTr ? "Son güncelleme: 23 Nisan 2026" : "Last updated: April 23, 2026"}</p>
        </div>

        {sections.map(([title, body]) => (
          <section key={title} className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <p className="text-sm leading-relaxed text-gray-600">{body}</p>
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div>
            <p className="text-xs text-gray-500">{isTr ? "Gizlilik talepleri için" : "For privacy requests"}</p>
            <a href="mailto:gizlilik@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">gizlilik@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/kvkk" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "KVKK" : "Privacy Notice"}</Link>
            <Link href="/kullanim-kosullari" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Kullanım Koşulları" : "Terms of Use"}</Link>
            <Link href="/iletisim" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "İletişim" : "Contact"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
