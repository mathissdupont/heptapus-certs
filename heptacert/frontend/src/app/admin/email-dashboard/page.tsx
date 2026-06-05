"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import {
  BarChart3,
  Loader2,
  Mail,
  Send,
  Settings,
  ShieldCheck,
  Webhook,
  ChevronRight,
  Layers3,
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { FeatureGate } from "@/lib/useSubscription";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type EventItem = { id: number; name: string };

type CardItem = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tone: string;
  stat: string;
};

export default function EmailDashboard() {
  const { lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [templateCount, setTemplateCount] = useState(0);
  const [webhookCount, setWebhookCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  const copy = lang === "tr"
    ? {
        title: "Email Merkezi",
        subtitle: "SMTP bağlantısını, şablonları, kampanyaları ve teslimat analitiğini tek panelden yönetin.",
        setupTitle: "Çalışma mantığı",
        setupBody: "Email akışları etkinlik bazlı çalışır. Önce SMTP ayarınızı tamamlayın, ardından bir etkinlik içinden şablon ve kampanya yönetimine geçin.",
        metricTemplates: "Şablonlar",
        metricWebhooks: "Webhooklar",
        metricEvents: "Etkinlikler",
        statTemplates: "Sistem şablonu",
        statWebhooks: "Aktif webhook",
        statEvents: "etkinlik",
        smtpTitle: "SMTP ve teslimat",
        smtpBody: "Gönderici hesabını doğrulayın, bağlantıyı test edin ve otomatik sertifika maillerini güvene alın.",
        smtpStat: "Bağlantıyı test et",
        templatesTitle: "Şablon kütüphanesi",
        templatesBody: "Etkinlik bazlı özel şablonlar ve sistem şablonlarını yönetin. Otomatik sertifika mailleri de buradan beslenir.",
        templatesStat: "Etkinlik bazlı",
        campaignsTitle: "Kampanyalar",
        campaignsBody: "Toplu e-posta, planlı gönderim ve kayıt sonrası iletişim akışlarını etkinlikten başlatın.",
        campaignsStat: "Toplu ve planlı",
        analyticsTitle: "Analitik",
        analyticsBody: "Teslimat durumu, iş geçmişi ve etkinlik bazlı email performansını izleyin.",
        analyticsStat: "Teslimat görünümü",
        webhooksTitle: "Webhook entegrasyonu",
        webhooksBody: "Email olaylarını Slack, CRM veya diğer sistemlere iletin.",
        webhooksStat: "Gerçek zamanlı",
        open: "Aç",
        eventsHint: "Şablon ve kampanya yönetimi etkinlik sayfalarından yapılır.",
        goEvents: "Etkinlikleri Aç",
        goAnalytics: "Analitiğe Git",
      }
    : {
        title: "Email Center",
        subtitle: "Manage SMTP connectivity, templates, campaigns and delivery analytics from one control surface.",
        setupTitle: "How it works",
        setupBody: "Email flows are event-based. Configure SMTP first, then manage templates and campaigns from the relevant event workspace.",
        metricTemplates: "Templates",
        metricWebhooks: "Webhooks",
        metricEvents: "Events",
        statTemplates: "system templates",
        statWebhooks: "active webhooks",
        statEvents: "events",
        smtpTitle: "SMTP and deliverability",
        smtpBody: "Verify the sender account, test connectivity, and stabilize automatic certificate delivery emails.",
        smtpStat: "Run connection test",
        templatesTitle: "Template library",
        templatesBody: "Manage event-specific templates and system templates. Automatic certificate emails also draw from here.",
        templatesStat: "Event scoped",
        campaignsTitle: "Campaigns",
        campaignsBody: "Launch bulk email, scheduled sends, and post-registration communication from each event.",
        campaignsStat: "Bulk and scheduled",
        analyticsTitle: "Analytics",
        analyticsBody: "Track delivery status, job history and event-level email performance.",
        analyticsStat: "Delivery view",
        webhooksTitle: "Webhook integrations",
        webhooksBody: "Send email events to Slack, your CRM, or other downstream systems.",
        webhooksStat: "Real time",
        open: "Open",
        eventsHint: "Template and campaign management lives inside each event workspace.",
        goEvents: "Open Events",
        goAnalytics: "Go to Analytics",
      };

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [templatesRes, webhooksRes, eventsRes] = await Promise.all([
        apiFetch("/system/email-templates"),
        apiFetch("/admin/webhooks"),
        apiFetch("/admin/events"),
      ]);
      const templates = await templatesRes.json();
      const webhooks = await webhooksRes.json();
      const events = (await eventsRes.json()) as EventItem[];
      setTemplateCount(Array.isArray(templates) ? templates.length : 0);
      setWebhookCount(Array.isArray(webhooks) ? webhooks.length : 0);
      setEventCount(Array.isArray(events) ? events.length : 0);
    } catch (error) {
      console.error("Failed to load email dashboard stats", error);
    } finally {
      setLoading(false);
    }
  }

  const cards: CardItem[] = useMemo(
    () => [
      {
        title: copy.smtpTitle,
        description: copy.smtpBody,
        href: "/admin/email-settings",
        icon: Settings,
        tone: "bg-surface-50 border-surface-100 text-surface-800",
        stat: copy.smtpStat,
      },
      {
        title: copy.templatesTitle,
        description: copy.templatesBody,
        href: "/admin/events",
        icon: Layers3,
        tone: "bg-surface-50 border-surface-100 text-surface-800",
        stat: copy.templatesStat,
      },
      {
        title: copy.campaignsTitle,
        description: copy.campaignsBody,
        href: "/admin/events",
        icon: Send,
        tone: "bg-surface-50 border-surface-100 text-surface-800",
        stat: copy.campaignsStat,
      },
      {
        title: copy.analyticsTitle,
        description: copy.analyticsBody,
        href: "/admin/email-analytics",
        icon: BarChart3,
        tone: "bg-surface-50 border-surface-100 text-surface-800",
        stat: copy.analyticsStat,
      },
      {
        title: copy.webhooksTitle,
        description: copy.webhooksBody,
        href: "/admin/webhooks",
        icon: Webhook,
        tone: "bg-surface-50 border-surface-100 text-surface-800",
        stat: copy.webhooksStat,
      },
    ],
    [copy],
  );

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="flex w-full flex-col gap-6 pb-16 antialiased text-surface-900">
        {/* GLOBAL BAŞLIK KARTI */}
        <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<Mail className="h-4 w-4 stroke-[2]" />} />

        {/* 3'LÜ METRİK ÖZET ALANI */}
        <div className="grid gap-3.5 grid-cols-2 md:grid-cols-3">
          {[
            { label: copy.metricTemplates, count: templateCount, sub: copy.statTemplates },
            { label: copy.metricWebhooks, count: webhookCount, sub: copy.statWebhooks },
            { label: copy.metricEvents, count: eventCount, sub: copy.statEvents },
          ].map((metric, i) => (
            <div key={i} className="w-full rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
              <p className="text-11 font-bold uppercase tracking-widest text-surface-400">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-surface-900 tabular-nums">
                {loading ? "..." : metric.count}
              </p>
              <p className="mt-1 text-11 font-medium text-surface-400">{metric.sub}</p>
            </div>
          ))}
        </div>

        {/* ANA KART DÜZENİ VE SAĞ KILAVUZ SÜTUNU */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px] items-start">
          
          {/* Sol Izgara: Aksiyon Kartları */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link 
                  key={card.title} 
                  href={card.href} 
                  className="group flex flex-col justify-between gap-5 rounded-2xl border border-surface-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-surface-300 hover:bg-surface-50/40"
                >
                  <div className="space-y-4">
                    {/* Minimalist Apple İkon Kafesi */}
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm group-hover:scale-105 transition-transform ${card.tone}`}>
                      <Icon className="h-4 w-4 stroke-[1.8]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight text-surface-900">{card.title}</h2>
                      <p className="mt-1.5 text-xs leading-relaxed text-surface-400">{card.description}</p>
                    </div>
                  </div>
                  
                  {/* Kart Altı Statü ve İlerleme Okları */}
                  <div className="flex items-center justify-between gap-2 text-11 font-semibold tracking-tight pt-1.5 border-t border-gray-50">
                    <span className="text-surface-400 font-medium">{card.stat}</span>
                    <span className="inline-flex items-center gap-0.5 text-surface-900 group-hover:text-surface-900">
                      <span>{copy.open}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-60 translate-x-0 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Sağ Sütun: Sistem Çalışma Rehberi */}
          <aside className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm space-y-4">
            <div className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-11 font-bold text-emerald-700 shadow-sm">
              <ShieldCheck className="mr-1 h-3 w-3 stroke-[2.5]" />
              <span>{copy.setupTitle}</span>
            </div>
            
            <div>
              <h2 className="text-sm font-bold tracking-tight text-surface-900">{copy.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-surface-500">{copy.setupBody}</p>
            </div>

            {/* İçi Boş Şablon Yönetim Uyarı Kapsülü */}
            <div className="space-y-2 rounded-xl border border-surface-100 bg-surface-50/50 p-3.5 text-xs">
              <p className="font-semibold leading-relaxed text-surface-700 tracking-tight">{copy.eventsHint}</p>
              <div className="pt-1.5 space-y-2">
                <Link href="/admin/events" className="w-full inline-flex min-h-[34px] items-center justify-center rounded-lg border border-surface-200 bg-white text-xs font-semibold text-surface-800 shadow-sm transition hover:bg-surface-50">
                  {copy.goEvents}
                </Link>
                <Link href="/admin/email-analytics" className="w-full inline-flex min-h-[34px] items-center justify-center rounded-lg bg-surface-900 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800">
                  {copy.goAnalytics}
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </FeatureGate>
  );
}