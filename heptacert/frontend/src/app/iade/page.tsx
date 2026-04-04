"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function IadePage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const sections = isTr
    ? [
        ["1. Genel Bilgi", "HeptaCert hizmetleri HeptaCoin ve abonelik modeli üzerinden sunulur. Bu politika iade ve iptal koşullarını özetler."],
        ["2. Kullanılmamış HeptaCoin", "Satın alımdan itibaren 14 gün içinde ve coinler hiç kullanılmamışsa tam iade talep edebilirsiniz."],
        ["3. Kısmen Kullanılmış Paketler", "Kısmen veya tamamen kullanılmış coin paketleri için iade yapılamaz."],
        ["4. Abonelik İptali", "Aboneliğinizi istediğiniz zaman iptal edebilirsiniz. Hizmet dönem sonuna kadar devam eder, kısmi iade yapılmaz."],
        ["5. Süreç", "İade talepleri e-posta ile alınır, 3 iş günü içinde değerlendirilir ve onaylanan iadeler ödeme yöntemine göre işlenir."],
      ]
    : [
        ["1. Overview", "HeptaCert services are offered through HeptaCoin packages and subscription plans. This policy summarizes refund and cancellation terms."],
        ["2. Unused HeptaCoin", "You may request a full refund within 14 days of purchase if the coins have not been used at all."],
        ["3. Partially Used Packages", "No refund is available for coin packages that are partially or fully used."],
        ["4. Subscription Cancellation", "You may cancel your subscription anytime. Service continues until the end of the billing period and no partial refund is provided."],
        ["5. Process", "Refund requests are handled by email, reviewed within 3 business days, and approved refunds are processed back to the original payment method."],
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition-colors hover:text-brand-600">{isTr ? "Ana Sayfa" : "Home"}</Link>
        <span>/</span>
        <span className="font-medium text-gray-600">{isTr ? "İade ve İptal Politikası" : "Refund and Cancellation Policy"}</span>
      </div>

      <div className="space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-card md:p-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">{isTr ? "Hukuki Bilgilendirme" : "Legal Notice"}</p>
          <h1 className="text-3xl font-extrabold text-gray-900">{isTr ? "İade ve İptal Politikası" : "Refund and Cancellation Policy"}</h1>
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
            <p className="text-xs text-gray-500">{isTr ? "İade talepleri için" : "For refund requests"}</p>
            <a href="mailto:iade@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">iade@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/mesafeli-satis" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Mesafeli Satış" : "Distance Sales"}</Link>
            <Link href="/iletisim" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "İletişim" : "Contact"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
