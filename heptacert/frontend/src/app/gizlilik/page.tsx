"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function GizlilikPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const sections = isTr
    ? [
        ["1. Giriş", "Heptapus Group, HeptaCert platformunu kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar."],
        ["2. Toplanan Bilgiler", "Hesap bilgileri, platform kullanım verileri ve güvenlik için gerekli teknik loglar işlenir."],
        ["3. Çerezler", "Platform yalnızca zorunlu ve güvenlik amaçlı çerezler kullanır."],
        ["4. Veri Paylaşımı", "Veriler pazarlama amacıyla paylaşılmaz; yalnızca hizmet sağlayıcılar ve yasal kurumlarla sınırlı olarak paylaşılır."],
        ["5. Saklama Süresi", "Veriler aktif hizmet süresi ve yasal yükümlülükler boyunca saklanır; gerekli olmayan veriler silinir veya anonimleştirilir."],
        ["6. Güvenlik", "HTTPS/TLS, bcrypt, JWT, 2FA ve oran sınırlama gibi modern güvenlik önlemleri uygulanır."],
      ]
    : [
        ["1. Introduction", "Heptapus Group explains how your personal data is collected, used, and protected while using the HeptaCert platform."],
        ["2. Information We Collect", "We process account details, platform usage data, and technical logs required for security and service delivery."],
        ["3. Cookies", "The platform only uses essential and security-related cookies."],
        ["4. Data Sharing", "Data is never shared for marketing purposes and is only shared with service providers or legally authorized institutions when necessary."],
        ["5. Retention", "Data is retained during the active service period and for legal obligations, then deleted or anonymized when no longer needed."],
        ["6. Security", "Modern safeguards such as HTTPS/TLS, bcrypt, JWT, 2FA, and rate limiting are applied."],
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
            <p className="text-xs text-gray-500">{isTr ? "Gizlilik talepleri için" : "For privacy requests"}</p>
            <a href="mailto:gizlilik@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">gizlilik@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/kvkk" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "KVKK" : "Privacy Notice"}</Link>
            <Link href="/iletisim" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "İletişim" : "Contact"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
