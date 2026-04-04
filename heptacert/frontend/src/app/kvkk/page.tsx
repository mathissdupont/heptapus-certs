"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function KVKKPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const sections = isTr
    ? [
        ["1. Veri Sorumlusu", "6698 sayılı KVKK kapsamında kişisel verileriniz Heptapus Group tarafından veri sorumlusu sıfatıyla işlenir."],
        ["2. İşlenen Veriler", "Ad soyad, e-posta, işlem kayıtları, ödeme referansları ve güvenlik logları gibi hizmet için gerekli veriler işlenir."],
        ["3. İşleme Amaçları", "Hesap açılışı, sertifika üretimi, ödeme, güvenlik, destek ve yasal yükümlülüklerin yerine getirilmesi amacıyla veri işlenir."],
        ["4. Aktarım", "Veriler yalnızca zorunlu altyapı sağlayıcılarına ve hukuken yetkili kurumlara KVKK'ya uygun şekilde aktarılır."],
        ["5. Haklarınız", "KVKK md. 11 kapsamında bilgi alma, düzeltme, silme ve itiraz haklarına sahipsiniz."],
        ["6. Başvuru", "Haklarınızı kullanmak için kvkk@heptapusgroup.com adresine yazabilirsiniz."],
      ]
    : [
        ["1. Data Controller", "Your personal data is processed by Heptapus Group as the data controller under Turkish Personal Data Protection Law."],
        ["2. Processed Data", "We process the data required for the service, such as your name, email, transaction records, payment references, and security logs."],
        ["3. Processing Purposes", "Data is processed for account setup, certificate issuance, payments, security, support, and legal compliance."],
        ["4. Transfers", "Data is shared only with necessary infrastructure providers and legally authorized institutions in compliance with applicable law."],
        ["5. Your Rights", "You have the right to request access, correction, deletion, and objection regarding your personal data."],
        ["6. Requests", "You can exercise your rights by writing to kvkk@heptapusgroup.com."],
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
          <p className="mt-2 text-sm text-gray-500">{isTr ? "Son güncelleme: 1 Mart 2026" : "Last updated: March 1, 2026"}</p>
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
            <Link href="/iletisim" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "İletişim" : "Contact"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
