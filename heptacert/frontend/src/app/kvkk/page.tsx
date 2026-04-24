"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function KVKKPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const sections = isTr
    ? [
        ["1. Veri Sorumluluğu Rolleri", "HeptaCert platformunun üyelik, hesap güvenliği, sistem kayıtları ve platform işletimi kapsamındaki verilerde Heptapus Group işleme bağlamına göre veri sorumlusu veya veri işleyen sıfatıyla hareket edebilir."],
        ["2. Etkinlik Düzenleyicisinin Rolü", "Etkinlik kayıt sürecinde toplanan ad-soyad, iletişim bilgisi, form yanıtları, belge yüklemeleri ve benzeri etkinliğe özgü verilerde etkinliği düzenleyen kişi/kurum ayrıca bağımsız veri sorumlusu olabilir."],
        ["3. İşlenen Veri Kategorileri", "Kimlik ve iletişim verileri, hesap/oturum verileri, işlem geçmişi, ödeme referansları, güvenlik logları ve kullanıcı tarafından etkinlik bazında girilen ek veriler işlenebilir."],
        ["4. İşleme Amaçları", "Hesap açılışı, kimlik doğrulama, etkinlik kayıt operasyonu, sertifika üretimi, ödeme süreçleri, güvenlik, dolandırıcılık önleme, destek hizmetleri ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla veri işlenir."],
        ["5. Hukuki Sebepler", "Veriler; sözleşmenin kurulması/ifası, hukuki yükümlülüklerin yerine getirilmesi, meşru menfaat ve gerektiğinde açık rıza hukuki sebeplerine dayanılarak işlenir. Etkinlik düzenleyicileri kendi hukuki sebep seçimi ve aydınlatma yükümlülüklerinden sorumludur."],
        ["6. Veri Aktarımı", "Veriler yalnızca hizmetin sunulması için gerekli altyapı/teknoloji sağlayıcılarına, ödeme kuruluşlarına ve hukuken yetkili kamu kurumlarına KVKK'ya uygun olarak aktarılabilir."],
        ["7. Saklama Süresi", "Veriler hizmetin gerektirdiği süre ve ilgili mevzuatta öngörülen zamanaşımı/saklama süreleri boyunca tutulur; süre sonunda silinir, yok edilir veya anonimleştirilir."],
        ["8. Veri Güvenliği", "Şifreleme, erişim kontrolü, loglama, oran sınırlama, güvenlik testleri ve benzeri teknik/idari tedbirlerle verilerin güvenliği korunur; mutlak güvenlik garantisi verilemez."],
        ["9. Haklarınız", "KVKK md. 11 kapsamındaki bilgi alma, düzeltme, silme, işleme itiraz ve diğer haklarınızı kullanabilirsiniz. Talebin niteliğine göre başvuru ilgili veri sorumlusuna (Heptapus Group veya etkinlik düzenleyicisi) yönlendirilmelidir."],
        ["10. Başvuru", "Heptapus Group kapsamındaki talepler için kvkk@heptapusgroup.com adresine yazabilirsiniz. Etkinliğe özgü veri taleplerinde etkinlik düzenleyicisi kurumla ayrıca iletişime geçilmelidir; talebin yanlış muhataba gitmesi halinde makul ölçüde yönlendirme yapılır."],
      ]
    : [
        ["1. Data Controller Roles", "For membership, account security, system logs, and platform operations, Heptapus Group may act as a data controller or data processor depending on processing context."],
        ["2. Event Organizer Role", "For event-specific registration data such as attendee details, custom form responses, and uploaded documents, the event organizer may also act as an independent data controller."],
        ["3. Data Categories", "Identity and contact data, account/session data, transaction records, payment references, security logs, and additional event-level data provided by users may be processed."],
        ["4. Processing Purposes", "Data is processed for account setup, authentication, event registration operations, certificate generation, payments, security, fraud prevention, support, and legal compliance."],
        ["5. Legal Bases", "Processing may rely on contract performance, legal obligations, legitimate interests, and explicit consent where required. Event organizers remain responsible for selecting legal basis and providing notice for their own processing."],
        ["6. Data Transfers", "Data may be shared with required infrastructure/technology providers, payment partners, and legally authorized public authorities in compliance with applicable law."],
        ["7. Retention", "Data is retained for the duration required by service needs and legal retention/limitation periods, then deleted, destroyed, or anonymized."],
        ["8. Security", "Data security is protected through technical and organizational measures such as encryption, access control, logging, and abuse prevention; absolute security cannot be guaranteed."],
        ["9. Your Rights", "You may exercise rights such as access, correction, deletion, and objection under applicable data protection law. Depending on the request scope, you may need to contact the relevant data controller (Heptapus Group or the event organizer)."],
        ["10. Requests", "For requests related to Heptapus Group processing, contact kvkk@heptapusgroup.com. For event-specific data processing, you should also contact the relevant event organizer; where requests are misdirected, reasonable redirection support may be provided."],
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
            <p className="text-xs text-gray-500">{isTr ? "Sorularınız için" : "For questions"}</p>
            <a href="mailto:kvkk@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">kvkk@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/gizlilik" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Gizlilik Politikası" : "Privacy Policy"}</Link>
            <Link href="/kullanim-kosullari" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Kullanım Koşulları" : "Terms of Use"}</Link>
            <Link href="/iletisim" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "İletişim" : "Contact"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
