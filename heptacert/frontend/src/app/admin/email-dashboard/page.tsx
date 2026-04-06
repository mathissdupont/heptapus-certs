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
        tone: "bg-blue-50 text-blue-700 border-blue-200",
        stat: copy.smtpStat,
      },
      {
        title: copy.templatesTitle,
        description: copy.templatesBody,
        href: "/admin/events",
        icon: Layers3,
        tone: "bg-violet-50 text-violet-700 border-violet-200",
        stat: copy.templatesStat,
      },
      {
        title: copy.campaignsTitle,
        description: copy.campaignsBody,
        href: "/admin/events",
        icon: Send,
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        stat: copy.campaignsStat,
      },
      {
        title: copy.analyticsTitle,
        description: copy.analyticsBody,
        href: "/admin/email-analytics",
        icon: BarChart3,
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        stat: copy.analyticsStat,
      },
      {
        title: copy.webhooksTitle,
        description: copy.webhooksBody,
        href: "/admin/webhooks",
        icon: Webhook,
        tone: "bg-rose-50 text-rose-700 border-rose-200",
        stat: copy.webhooksStat,
      },
    ],
    [copy],
  );

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="flex flex-col gap-6 pb-20">
        <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<Mail className="h-5 w-5" />} />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.metricTemplates}</p>
            <p className="mt-3 text-3xl font-black text-surface-900">{loading ? "..." : templateCount}</p>
            <p className="mt-1 text-sm text-surface-500">{copy.statTemplates}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.metricWebhooks}</p>
            <p className="mt-3 text-3xl font-black text-surface-900">{loading ? "..." : webhookCount}</p>
            <p className="mt-1 text-sm text-surface-500">{copy.statWebhooks}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.metricEvents}</p>
            <p className="mt-3 text-3xl font-black text-surface-900">{loading ? "..." : eventCount}</p>
            <p className="mt-1 text-sm text-surface-500">{copy.statEvents}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.title} href={card.href} className="card group flex flex-col gap-5 p-5 transition hover:-translate-y-0.5 hover:shadow-soft-lg">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">{card.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-surface-500">{card.description}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-surface-400">{card.stat}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-600 group-hover:text-brand-700">
                      {copy.open}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <aside className="card p-6 sm:p-7">
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              {copy.setupTitle}
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-surface-900">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-surface-500">{copy.setupBody}</p>

            <div className="mt-6 space-y-3 rounded-3xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
              <p className="font-semibold text-surface-900">{copy.eventsHint}</p>
              <Link href="/admin/events" className="btn-secondary w-full justify-center">
                {copy.goEvents}
              </Link>
              <Link href="/admin/email-analytics" className="btn-primary w-full justify-center">
                {copy.goAnalytics}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </FeatureGate>
  );
}
