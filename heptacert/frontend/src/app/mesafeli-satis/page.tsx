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
        ["Madde 6 - İade ve İptal Politikaları", "İade ve iptal koşulları, ilgili iade politikası ve platform bildirimleri kapsamında uygulanır."],
        ["Madde 7 - Kişisel Veriler", "Alıcı'nın kişisel verileri; siparişin alınması, ödemenin gerçekleştirilmesi, dijital hizmetin kullanıcı hesabına tanımlanması, faturalandırma, destek, güvenlik ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenebilir. Kişisel verilerin işlenmesine, saklanmasına, yurt dışındaki sunuculara aktarılmasına ve altyapı sağlayıcılarıyla kurulan veri işleme ilişkilerine ilişkin ayrıntılı bilgi KVKK Aydınlatma Metni, Gizlilik Politikası ve Açık Rıza Metni’nde yer almaktadır."],
        ["Madde 8 - Yurt Dışı Altyapı Bilgilendirmesi", "HeptaCert'in teknik altyapısı kapsamında yurt dışında bulunan sunucu ve veri merkezi hizmetlerinden yararlanılabilir. Bu kapsamda sunucu altyapısı Finlandiya'nın Helsinki bölgesinde bulunan Hetzner Online GmbH üzerinden sağlanabilir. Kişisel verilerin yurt dışında saklanması veya işlenmesine ilişkin detaylı açıklamalar KVKK Aydınlatma Metni, Gizlilik Politikası ve Açık Rıza Metni’nde düzenlenir."],
        ["Madde 9 - Uyuşmazlık", "Uyuşmazlıklarda Türk Hukuku uygulanır ve tüketici mevzuatındaki yetkili merciler esas alınır."],
      ]
    : [
        ["Article 1 - Parties", "The seller is Heptapus Group. The buyer is the registered user purchasing through the platform."],
        ["Article 2 - Subject", "This agreement governs the rights and obligations related to the remote sale of digital services such as HeptaCoin and subscriptions."],
        ["Article 3 - Service Delivery", "After purchase, digital services and balances are assigned electronically to your account; there is no physical delivery."],
        ["Article 4 - Payment", "Payment is collected upfront through secure payment infrastructure based on the amount shown during checkout."],
        ["Article 5 - Right of Withdrawal", "For digital services that begin immediately, the statutory right of withdrawal may be limited; details are explained in the refund policy."],
        ["Article 6 - Refund and Cancellation Policies", "Refund and cancellation conditions are applied in line with the relevant refund policy and platform notices."],
        ["Article 7 - Personal Data", "The buyer's personal data may be processed for the purposes of receiving the order, processing payment, assigning the digital service to the user account, invoicing, support, security and fulfilling legal obligations. Detailed information regarding the processing, storage, international transfer of personal data and the data processing relationship with infrastructure providers is provided in the Privacy Notice, Privacy Policy and Explicit Consent Text."],
        ["Article 8 - Overseas Infrastructure Notice", "HeptaCert may use overseas server and data center services as part of its technical infrastructure. In this context, server infrastructure may be provided through Hetzner Online GmbH, whose servers are located in Helsinki, Finland. Detailed explanations regarding the storage or processing of personal data abroad and the data processing relationship with infrastructure providers are set out in the Privacy Notice, Privacy Policy and Explicit Consent Text."],
        ["Article 9 - Disputes", "Turkish law applies to disputes and the competent consumer authorities and courts are determined under applicable regulation."],
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
            <p className="text-xs text-gray-500">{isTr ? "Sözleşme soruları için" : "For agreement questions"}</p>
            <a href="mailto:contact@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">contact@heptapusgroup.com</a>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/iade" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "İade Politikası" : "Refund Policy"}</Link>
            <Link href="/kvkk" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "KVKK" : "Privacy Notice"}</Link>
            <Link href="/gizlilik" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Gizlilik Politikası" : "Privacy Policy"}</Link>
            <Link href="/acik-riza" className="text-sm text-gray-500 transition-colors hover:text-brand-600">{isTr ? "Açık Rıza Metni" : "Explicit Consent Text"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
