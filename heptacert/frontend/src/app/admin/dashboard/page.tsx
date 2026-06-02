"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ShieldOff,
  Clock,
  Calendar,
  AlertCircle,
  TrendingUp,
  Award,
  Plus,
  Send,
  Settings,
  ArrowRight,
  AlertTriangle,
  Activity,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { StatCard, StatCardSkeleton } from "@/components/Admin/StatCard";
import PageHeader from "@/components/Admin/PageHeader";
import { useI18n } from "@/lib/i18n";
import { EmptyState as AdminEmptyState } from "@/components/Admin/AdminState";

type EventStat = {
  event_id: number;
  event_name?: string;
  name?: string;
  active?: number;
  revoked?: number;
  expired?: number;
  total?: number;
  active_count?: number;
  revoked_count?: number;
  expired_count?: number;
  cert_count?: number;
};

type DashboardStats = {
  total_certs: number;
  active_certs: number;
  revoked_certs: number;
  expired_certs: number;
  total_events: number;
  events_with_stats: EventStat[];
};

export default function DashboardPage() {
  const { lang } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  const copy = {
    tr: {
      subtitle: "Genel sertifika istatistikleri ve hızlı aksiyonlar",
      loadError: "İstatistikler yüklenemedi.",
      quickCreate: "Yeni Etkinlik",
      quickCreateDesc: "Etkinlik ekle",
      quickCertificates: "Sertifikalar",
      quickCertificatesDesc: "Yönet ve kontrol et",
      quickEmail: "E-posta Kampanyaları",
      quickEmailDesc: "Yönet ve takip et",
      quickSettings: "Ayarlar",
      quickSettingsDesc: "Yapılandır ve özelleştir",
      quickOrgSocial: "Topluluk Profili",
      quickOrgSocialDesc: "Sosyal ağları yönet",
      totalEvents: "Toplam Etkinlik",
      totalCertificates: "Toplam Sertifika",
      active: "Aktif",
      revoked: "İptal",
      expired: "Süresi Dolmuş",
      expiredTitle: "Süresi Dolmuş Sertifikalar",
      expiredBody: (count: number) =>
        `${count} adet sertifikanın süresi dolmuş. Lütfen durumu gözden geçirin ve gerekli işlemleri yapın.`,
      reviewCertificates: "Sertifikaları Gözden Geçir",
      activeRate: "Genel Aktif Oran",
      revokeShort: "İptal",
      recentEvents: "Son Etkinlik Detayları",
      noEvents: "Henüz etkinlik yok.",
      eventFallback: (id: number) => `Etkinlik #${id}`,
      total: "Toplam",
      eventsViewAll: "Tüm Etkinlikleri Görüntüle",
      workspaceLabel: "Çalışma Alanı",
      actionHubTitle: "Hızlı Aksiyonlar",
      overviewLabel: "Genel Görünüm",
      organizerTitle: "Organizatör Dashboard",
      organizerBody: "Bugünkü önceliği hızlıca seç: etkinlik akışı, sertifika sağlığı veya e-posta iletişimi.",
      commandHint: "Her yerden Ctrl/⌘ + K ile komut paletini açabilirsin.",
    },
    en: {
      subtitle: "Overall certificate metrics and quick actions",
      loadError: "Failed to load statistics.",
      quickCreate: "New Event",
      quickCreateDesc: "Create an event",
      quickCertificates: "Certificates",
      quickCertificatesDesc: "Manage and review",
      quickEmail: "Email Campaigns",
      quickEmailDesc: "Manage and monitor",
      quickSettings: "Settings",
      quickSettingsDesc: "Configure and customize",
      quickOrgSocial: "Organization Profile",
      quickOrgSocialDesc: "Manage social links",
      totalEvents: "Total Events",
      totalCertificates: "Total Certificates",
      active: "Active",
      revoked: "Revoked",
      expired: "Expired",
      expiredTitle: "Expired Certificates",
      expiredBody: (count: number) =>
        `${count} certificates have expired. Please review them and take the necessary actions.`,
      reviewCertificates: "Review Certificates",
      activeRate: "Overall Active Rate",
      revokeShort: "Revoked",
      recentEvents: "Recent Event Details",
      noEvents: "No events yet.",
      eventFallback: (id: number) => `Event #${id}`,
      total: "Total",
      eventsViewAll: "View All Events",
      workspaceLabel: "Workspace",
      actionHubTitle: "Action Hub",
      overviewLabel: "Overview",
      organizerTitle: "Organizer Dashboard",
      organizerBody: "Pick today's priority quickly: event flow, certificate health, or email communication.",
      commandHint: "Open the command palette anywhere with Ctrl/⌘ + K.",
    },
  }[lang];

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/admin/dashboard/stats");
        setStats(await r.json());
      } catch (e: any) {
        const message = e?.message || copy.loadError;
        setErr(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [copy.loadError, toast]);

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-5 pb-16 antialiased text-gray-900">
        <PageHeader title="Dashboard" subtitle={copy.subtitle} icon={<BarChart3 className="h-4 w-4 stroke-[2]" />} />
        <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-gray-100" />
                <div className="h-6 w-12 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (err || !stats) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" /> 
        <span>{err}</span>
      </div>
    );
  }

  const activePercent = stats.total_certs > 0 ? Math.round((stats.active_certs / stats.total_certs) * 100) : 0;
  
  const normalizedEvents = (stats.events_with_stats || []).map((ev) => ({
    event_id: ev.event_id,
    event_name: ev.event_name || ev.name || copy.eventFallback(ev.event_id),
    total: Number(ev.total ?? ev.cert_count ?? 0),
    active: Number(ev.active ?? ev.active_count ?? 0),
    revoked: Number(ev.revoked ?? ev.revoked_count ?? 0),
    expired: Number(ev.expired ?? ev.expired_count ?? 0),
  }));

  const quickActions = [
    {
      title: copy.quickCreate,
      description: copy.quickCreateDesc,
      href: "/admin/events",
      icon: Plus,
      color: "bg-gray-50 text-gray-900 border border-gray-100",
    },
    {
      title: copy.quickCertificates,
      description: copy.quickCertificatesDesc,
      href: "/admin/events",
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600 border border-emerald-100/50",
    },
    {
      title: copy.quickEmail,
      description: copy.quickEmailDesc,
      href: "/admin/email-dashboard",
      icon: Send,
      color: "bg-gray-50 text-gray-900 border border-gray-100",
    },
    {
      title: copy.quickSettings,
      description: copy.quickSettingsDesc,
      href: "/admin/settings",
      icon: Settings,
      color: "bg-gray-50 text-gray-900 border border-gray-100",
    },
    {
      title: copy.quickOrgSocial || "Topluluk Profili",
      description: copy.quickOrgSocialDesc || "Sosyal ağları yönet",
      href: "/admin/organization-social",
      icon: Users,
      color: "bg-gray-50 text-gray-900 border border-gray-100",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 pb-16 antialiased text-gray-900">
      
      {/* GLOBAL SAYFA BAŞLIĞI */}
      <PageHeader
        title="Dashboard"
        subtitle={copy.subtitle}
        icon={<BarChart3 className="h-4 w-4 stroke-[2]" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/events" className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
              {copy.eventsViewAll}
            </Link>
            <Link href="/admin/email-dashboard" className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900">
              {copy.quickEmail}
            </Link>
          </div>
        }
      />

      {/* METRİK STAT KARTLARI SETİ */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-5">
        <StatCard label={copy.totalEvents} value={stats.total_events} icon={<Calendar className="h-4 w-4 text-gray-500 stroke-[1.8]" />} delay={0} />
        <StatCard label={copy.totalCertificates} value={stats.total_certs} icon={<Award className="h-4 w-4 text-gray-500 stroke-[1.8]" />} delay={0.03} />
        <StatCard label={copy.active} value={stats.active_certs} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500 stroke-[2]" />} iconBg="bg-emerald-50/50 border border-emerald-100/30" delay={0.06} />
        <StatCard label={copy.revoked} value={stats.revoked_certs} icon={<ShieldOff className="h-4 w-4 text-red-500 stroke-[1.8]" />} iconBg="bg-red-50/50 border border-red-100/30" delay={0.09} />
        <StatCard label={copy.expired} value={stats.expired_certs} icon={<Clock className="h-4 w-4 text-amber-500 stroke-[1.8]" />} iconBg="bg-amber-50/50 border border-amber-100/30" delay={0.12} />
      </div>

      {/* MERKEZİ ORGANİZATÖR BİLGİ ALANI */}
      <section className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.workspaceLabel}</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-gray-950">{copy.organizerTitle}</h2>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{copy.organizerBody}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/events" className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm">
              {copy.eventsViewAll}
            </Link>
            <Link href="/admin/events" className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300 shadow-sm">
              {copy.reviewCertificates}
            </Link>
          </div>
        </div>
        
        {/* Komut Paleti Yönerge Bloğu */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Command Palette</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{copy.commandHint}</p>
          </div>
          <kbd className="mt-4 w-fit rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-[10px] font-bold text-gray-400 shadow-inner">
            ⌘ + K
          </kbd>
        </div>
      </section>

      {/* AKSİYON HUBI VE ANALİTİK SAĞLIK PANELİ */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        
        {/* Hızlı Aksiyon Grid İstasyonu */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.workspaceLabel}</p>
              <h2 className="text-sm font-bold tracking-tight text-gray-950 mt-0.5">{copy.actionHubTitle}</h2>
            </div>
            <span className="rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
              {stats.total_events} {copy.totalEvents.toLowerCase()}
            </span>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href} className="group flex items-center gap-3.5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-gray-200 hover:bg-gray-50/40">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm group-hover:scale-105 transition-transform ${action.color}`}>
                    <Icon className="h-4 w-4 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-semibold text-gray-800 group-hover:text-gray-950 tracking-tight">{action.title}</p>
                    <p className="text-[10px] font-medium text-gray-400 truncate">{action.description}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-gray-600" />
                </Link>
              );
            })}
          </div>
        </motion.section>

        {/* Sertifika Sağlığı İlerleme Paneli */}
        <motion.aside initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-800 tracking-tight">
                <TrendingUp className="h-4 w-4 text-gray-400" /> {copy.activeRate}
              </p>
              <span className="text-base font-extrabold text-emerald-500 tracking-tight">{activePercent}%</span>
            </div>
            
            {/* Apple Tarzı İnce İlerleme Barı */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${activePercent}%` }}
                transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
                className="h-full bg-gray-950 rounded-full"
              />
            </div>
            
            {/* Alt Sayaç Hapları */}
            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50/40 px-2 py-0.5 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {copy.active}: {stats.active_certs}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-red-100 bg-red-50/40 px-2 py-0.5 text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {copy.revokeShort}: {stats.revoked_certs}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-100 bg-amber-50/40 px-2 py-0.5 text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {copy.expired}: {stats.expired_certs}
              </span>
            </div>
          </div>

          {/* Dinamik Uyarı Paneli */}
          <div className="mt-4 pt-1">
            {stats.expired_certs > 0 ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 stroke-[2]" />
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs font-bold text-amber-900 tracking-tight">{copy.expiredTitle}</h3>
                  <p className="text-[11px] leading-relaxed text-amber-800">{copy.expiredBody(stats.expired_certs)}</p>
                  <Link href="/admin/events" className="block text-[11px] font-semibold text-amber-700 hover:underline pt-1">
                    {copy.reviewCertificates} →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 stroke-[2]" />
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs font-bold text-emerald-900 tracking-tight">{copy.activeRate}</h3>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    {lang === "tr" ? "Sertifika sağlığı şimdilik temiz görünüyor." : "Certificate health looks clean for now."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      </div>

      {/* SON ETKİNLİK DETAYLARI LİSTE ALANI */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-900 shadow-sm">
              <Activity className="h-4 w-4 stroke-[2]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.overviewLabel}</p>
              <h2 className="text-base font-semibold tracking-tight text-gray-950">{copy.recentEvents}</h2>
            </div>
          </div>
          {normalizedEvents.length > 0 && (
            <Link href="/admin/events" className="inline-flex min-h-[34px] items-center justify-center rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
              {copy.eventsViewAll}
            </Link>
          )}
        </div>

        {/* Veri Boş Durum Kontrolü */}
        {normalizedEvents.length === 0 ? (
          <AdminEmptyState
            icon={<Calendar className="h-5 w-5 stroke-[1.5]" />}
            title={copy.noEvents}
            description={
              lang === "tr"
                ? "İlk etkinliği oluşturduğunda sertifika, e-posta ve operasyon özetleri burada akıllı kartlar olarak görünür."
                : "Once you create the first event, certificate, email, and operations summaries will appear here as smart cards."
            }
            action={<Link href="/admin/events" className="inline-flex min-h-[34px] items-center justify-center rounded-xl bg-gray-950 px-3.5 text-xs font-semibold text-white transition hover:bg-gray-900 shadow-sm">{copy.quickCreate}</Link>}
          />
        ) : (
          /* Son Etkinliklerin Kart Grid Akışı */
          <div className="grid gap-3.5 xl:grid-cols-2">
            {normalizedEvents.slice(0, 6).map((ev, i) => {
              return (
                <motion.div
                  key={ev.event_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.03 }}
                  className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between sm:flex-row sm:items-center gap-4">
                    <div className="min-w-0 space-y-0.5">
                      <Link href={`/admin/events/${ev.event_id}`} className="block truncate text-xs font-bold text-gray-950 transition-colors hover:text-gray-700 tracking-tight">
                        {ev.event_name}
                      </Link>
                      <p className="text-[10px] font-semibold text-gray-400 tracking-wide uppercase">ID: #{ev.event_id}</p>
                    </div>

                    <Link 
                      href={`/admin/events/${ev.event_id}`} 
                      className="inline-flex min-h-[32px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50 transition-all shrink-0 text-center"
                    >
                      {lang === "tr" ? "Etkinlik Detayları" : "Event Details"}
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}