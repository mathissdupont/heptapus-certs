"use client";

import Link from "next/link";
import { Mail, Globe, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function IletisimPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const cards = isTr
    ? [
        {
          title: "Genel Destek",
          subtitle: "E-posta",
          href: "mailto:contact@heptapusgroup.com",
          label: "contact@heptapusgroup.com",
          desc: "Hesap sorunları, ödeme, teknik destek ve genel sorular için. Yanıt süresi: 1-2 iş günü.",
          icon: Mail,
          iconClass: "bg-brand-50 text-brand-600",
        },
        {
          title: "Ana Site",
          subtitle: "Heptapus Group",
          href: "https://heptapusgroup.com",
          label: "heptapusgroup.com",
          desc: "Heptapus Group bünyesindeki tüm ürünler ve şirket hakkında bilgi almak için ziyaret edin.",
          icon: Globe,
          iconClass: "bg-violet-50 text-violet-600",
        },
        {
          title: "Hukuki ve KVKK",
          subtitle: "Yasal Talepler",
          href: "mailto:legal@heptapusgroup.com",
          label: "legal@heptapusgroup.com",
          desc: "KVKK başvuruları, gizlilik talepleri ve hukuki bildirimler için.",
          icon: MessageCircle,
          iconClass: "bg-emerald-50 text-emerald-600",
        },
        {
          title: "İade ve Ödeme",
          subtitle: "Finans Destek",
          href: "mailto:iade@heptapusgroup.com",
          label: "iade@heptapusgroup.com",
          desc: "İade talepleri, fatura itirazları ve ödeme sorunları için.",
          icon: Mail,
          iconClass: "bg-amber-50 text-amber-600",
        },
      ]
    : [
        {
          title: "General Support",
          subtitle: "Email",
          href: "mailto:contact@heptapusgroup.com",
          label: "contact@heptapusgroup.com",
          desc: "For account issues, payments, technical support, and general questions. Response time: 1-2 business days.",
          icon: Mail,
          iconClass: "bg-brand-50 text-brand-600",
        },
        {
          title: "Main Website",
          subtitle: "Heptapus Group",
          href: "https://heptapusgroup.com",
          label: "heptapusgroup.com",
          desc: "Visit to learn more about Heptapus Group and its products.",
          icon: Globe,
          iconClass: "bg-violet-50 text-violet-600",
        },
        {
          title: "Legal and Privacy",
          subtitle: "Formal Requests",
          href: "mailto:legal@heptapusgroup.com",
          label: "legal@heptapusgroup.com",
          desc: "For privacy requests, legal notices, and compliance matters.",
          icon: MessageCircle,
          iconClass: "bg-emerald-50 text-emerald-600",
        },
        {
          title: "Refunds and Billing",
          subtitle: "Finance Support",
          href: "mailto:iade@heptapusgroup.com",
          label: "iade@heptapusgroup.com",
          desc: "For refund requests, invoice objections, and payment issues.",
          icon: Mail,
          iconClass: "bg-amber-50 text-amber-600",
        },
      ];

  const timings = isTr
    ? [
        { channel: "Teknik Destek", time: "1-2 iş günü", color: "bg-brand-100 text-brand-700" },
        { channel: "İade Talebi", time: "3 iş günü", color: "bg-amber-100 text-amber-700" },
        { channel: "KVKK / Hukuki", time: "30 gün", color: "bg-emerald-100 text-emerald-700" },
        { channel: "İş Geliştirme", time: "3-5 iş günü", color: "bg-violet-100 text-violet-700" },
      ]
    : [
        { channel: "Technical Support", time: "1-2 business days", color: "bg-brand-100 text-brand-700" },
        { channel: "Refund Request", time: "3 business days", color: "bg-amber-100 text-amber-700" },
        { channel: "Privacy / Legal", time: "30 days", color: "bg-emerald-100 text-emerald-700" },
        { channel: "Business Development", time: "3-5 business days", color: "bg-violet-100 text-violet-700" },
      ];

  const legalLinks = isTr
    ? [
        { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
        { href: "/gizlilik", label: "Gizlilik Politikası" },
        { href: "/iade", label: "İade ve İptal Politikası" },
        { href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
      ]
    : [
        { href: "/kvkk", label: "Privacy Disclosure Notice" },
        { href: "/gizlilik", label: "Privacy Policy" },
        { href: "/iade", label: "Refund and Cancellation Policy" },
        { href: "/mesafeli-satis", label: "Distance Sales Agreement" },
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition-colors hover:text-brand-600">{isTr ? "Ana Sayfa" : "Home"}</Link>
        <span>/</span>
        <span className="font-medium text-gray-600">{isTr ? "İletişim" : "Contact"}</span>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-card md:p-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">{isTr ? "Bize Ulaşın" : "Get in Touch"}</p>
          <h1 className="text-3xl font-extrabold text-gray-900">{isTr ? "İletişim" : "Contact"}</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-gray-500">
            {isTr
              ? "Platform desteği, iş birlikleri veya hukuki talepler için aşağıdaki kanalları kullanabilirsiniz. Mesajınızı en kısa sürede değerlendirip size geri döneceğiz."
              : "Use the channels below for platform support, partnerships, or legal matters. We will review your message and get back to you as soon as possible."}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">{card.title}</p>
                    <p className="text-sm font-bold text-gray-800">{card.subtitle}</p>
                  </div>
                </div>
                <a href={card.href} target={card.href.startsWith("http") ? "_blank" : undefined} rel={card.href.startsWith("http") ? "noopener noreferrer" : undefined} className="block text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 hover:underline">
                  {card.label}
                </a>
                <p className="text-xs leading-relaxed text-gray-500">{card.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-base font-bold text-gray-800">{isTr ? "Yanıt Süreleri" : "Response Times"}</h2>
          <div className="space-y-3">
            {timings.map((item) => (
              <div key={item.channel} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.channel}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.color}`}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">{isTr ? "Yasal Belgeler" : "Legal Documents"}</p>
          <div className="grid grid-cols-2 gap-3">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-gray-600 transition-colors hover:text-brand-600 hover:underline">
                {isTr ? "→" : "→"} {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
