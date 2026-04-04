"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function MesafeliSatisPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const sections = isTr
    ? [
        ["Madde 1 - Taraflar", "Satıcı Heptapus Group'tur. Alıcı, platform üzerinden satın alma yapan kayıtlı kullanıcıdır."],
        ["Madde 2 - Konu", "Bu sözleşme, HeptaCoin ve abonelik gibi dijital hizmetlerin uzaktan satışı ile ilgili hak ve yükümlülükleri düzenler."],
        ["Madde 3 - Hizmet", "Satın alım sonrası dijital hizmet ve bakiye hesabınıza elektronik olarak tanımlanır; fiziksel teslimat yoktur."],
        ["Madde 4 - Ödeme", "Ödeme sipariş sırasında gösterilen bedel üzerinden güvenli ödeme altyapısı ile peşin tahsil edilir."],
        ["Madde 5 - Cayma Hakkı", "İfasına anında başlanan dijital hizmetlerde mevzuat kapsamındaki cayma hakkı sınırlı olabilir; detaylar iade politikasında açıklanır."],
        ["Madde 6 - Uyuşmazlık", "Uyuşmazlıklarda Türk Hukuku uygulanır ve tüketici mevzuatındaki yetkili merciler esas alınır."],
      ]
    : [
        ["Article 1 - Parties", "The seller is Heptapus Group. The buyer is the registered user purchasing through the platform."],
        ["Article 2 - Subject", "This agreement governs the rights and obligations related to the remote sale of digital services such as HeptaCoin and subscriptions."],
        ["Article 3 - Service Delivery", "After purchase, digital services and balances are assigned electronically to your account; there is no physical delivery."],
        ["Article 4 - Payment", "Payment is collected upfront through secure payment infrastructure based on the amount shown during checkout."],
        ["Article 5 - Right of Withdrawal", "For digital services that begin immediately, the statutory right of withdrawal may be limited; details are explained in the refund policy."],
        ["Article 6 - Disputes", "Turkish law applies to disputes and the competent consumer authorities and courts are determined under applicable regulation."],
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition-colors hover:text-brand-600">{isTr ? "Ana Sayfa" : "Home"}</Link>
        <span>/</span>
        <span className="font-medium text-gray-600">{isTr ? "Mesafeli Satış Sözleşmesi" : "Distance Sales Agreement"}</span>
      </div>

      <div className="space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-card md:p-12">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">{isTr ? "Hukuki Belge" : "Legal Document"}</p>
          <h1 className="text-3xl font-extrabold text-gray-900">{isTr ? "Mesafeli Satış Sözleşmesi" : "Distance Sales Agreement"}</h1>
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
            <p className="text-xs text-gray-500">{isTr ? "Sözleşme soruları için" : "For agreement questions"}</p>
            <a href="mailto:legal@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">legal@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/iade" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "İade Politikası" : "Refund Policy"}</Link>
            <Link href="/kvkk" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "KVKK" : "Privacy Notice"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
