"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Gift,
  Loader2,
  Mail,
  Palette,
  QrCode,
  Settings,
  Shield,
  Sparkles,
  Ticket,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { apiFetch, type EventOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ErrorState, LoadingState } from "@/components/Admin/AdminState";
import EventSetupChecklist from "@/components/Admin/EventSetupChecklist";
import EventActivityTimeline from "@/components/Admin/EventActivityTimeline";

type EventHealthCheck = {
  key: string;
  label: string;
  status: "ok" | "warning" | "error" | "idle";
  detail: string;
};

type EventHealthOut = {
  overview: {
    attendees: number;
    sessions: number;
    attendance_records: number;
    tickets: number;
    used_tickets: number;
    certificates: number;
    active_certificates: number;
    expired_certificates: number;
    revoked_certificates: number;
  };
  checks: EventHealthCheck[];
};

function healthTone(status: EventHealthCheck["status"]) {
  if (status === "ok") return "border-emerald-100 bg-emerald-50/30 text-emerald-700";
  if (status === "warning") return "border-amber-100 bg-amber-50/30 text-amber-700";
  if (status === "error") return "border-red-100 bg-red-50/30 text-red-600";
  return "border-gray-100 bg-gray-50/40 text-gray-500";
}

function getHealthIcon(status: EventHealthCheck["status"]) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 stroke-[2.5]" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 stroke-[2]" />;
  if (status === "error") return <XCircle className="h-4 w-4 shrink-0 text-red-500 stroke-[2]" />;
  return <Activity className="h-4 w-4 shrink-0 text-gray-400 stroke-[1.8]" />;
}

export default function EventIndexPage() {
  const params = useParams<{ id: string }>();
  const { lang } = useI18n();
  const [event, setEvent] = useState<EventOut | null>(null);
  const [health, setHealth] = useState<EventHealthOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = {
    tr: {
      eyebrow: "Etkinlik Detayları",
      loading: "Etkinlik detayları yükleniyor...",
      error: "Etkinlik detayları yüklenemedi.",
      registration: "Kayıt İstasyonu",
      copyLink: "Kayıt Linkini Kopyala",
      copied: "Kopyalandı",
      openPublic: "Kayıt Sayfasını Aç",
      description: "Katılımcı yönetimi, akıllı sertifika üretimi, bilet check-in oturumları ve e-posta akışlarını tek panelden yapılandırın.",
      modules: "Yönetim Alanları",
      quickSetup: "Hızlı Başlangıç",
      quickSetupBody: "Önce kayıt formunu ve KVKK metnini ayarlayın, sonra katılımcıları ve otomasyonları bu ekrandan yönetin.",
      attendees: "Katılımcılar",
      attendeesBody: "Kayıtları, özel soru cevaplarını, biletleri ve katılımcı listelerini filtreleyin.",
      settings: "Ayarlar",
      settingsBody: "Kayıt formu kurgusu, KVKK metinleri, bilet ve akıllı otomasyon modüllerini yapılandırın.",
      certificates: "Sertifikalar",
      certificatesBody: "Üretilen dijital sertifikaları doğrulayın, listeleri ve dışa aktarım süreçlerini izleyin.",
      editor: "Sertifika Editörü",
      editorBody: "Zengin sertifika şablon tasarımlarını ve dinamik alan konumlarını ölçekleyin.",
      sessions: "Oturumlar",
      sessionsBody: "Giriş ve yoklama için QR check-in seanslarını ve katılım barajlarını yönetin.",
      tickets: "Biletler",
      ticketsBody: "Katılımcı giriş kartlarını, geçiş politikalarını ve bilet doğrulama akışını yönetin.",
      raffles: "Çekilişler",
      rafflesBody: "Katılım şartlarına uygun canlı çekiliş havuzları hazırlayın ve sunum modunu başlatın.",
      gamification: "Oyunlaştırma",
      gamificationBody: "Topluluk motivasyonu için rozet, puanlama ve görev ödüllendirme akışlarını kurgulayın.",
      email: "E-posta",
      emailBody: "Etkinliğe özel akıllı e-posta şablonlarını ve bildirim otomasyonlarını yönetin.",
    },
    en: {
      eyebrow: "Event Details",
      loading: "Loading event details...",
      error: "Could not load event details.",
      registration: "Registration Station",
      copyLink: "Copy Registration Link",
      copied: "Copied",
      openPublic: "Open Registration Page",
      description: "Finalize participant engagement, automated credential generation, ticket check-in workflows, and targeted email configurations.",
      modules: "Management Areas",
      quickSetup: "Quick Start",
      quickSetupBody: "Set the registration form and privacy notice first, then manage attendees and automations from here.",
      attendees: "Attendees",
      attendeesBody: "Filter registrations, question-based responses, credential tags, and attendee lists.",
      settings: "Settings",
      settingsBody: "Configure registration rules, privacy nodes, ticket layouts, and organizational metadata.",
      certificates: "Certificates",
      certificatesBody: "Audit issued digital credentials, verify lookups, and track generation logs.",
      editor: "Certificate Editor",
      editorBody: "Design professional credential canvases and map dynamic variable placeholders.",
      sessions: "Sessions",
      sessionsBody: "Coordinate batch QR check-in sessions and control minimum compliance thresholds.",
      tickets: "Tickets",
      ticketsBody: "Govern event passes, credential bindings, and check-in validation pipelines.",
      raffles: "Raffles",
      rafflesBody: "Launch parameter-driven live engagement drawings and activate immersive stage view.",
      gamification: "Gamification",
      gamificationBody: "Deploy achievement badges, reward score rules, and behavior incentive pipelines.",
      email: "Email",
      emailBody: "Govern automated confirmation matrices and event-scoped template assets.",
    },
  }[lang];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch(`/admin/events/${params.id}`).then((response) => response.json()),
      apiFetch(`/admin/events/${params.id}/health`)
        .then((response) => response.json())
        .catch(() => null),
    ])
      .then(([eventData, healthData]: [EventOut, EventHealthOut | null]) => {
        if (!active) return;
        setEvent(eventData);
        setHealth(healthData);
      })
      .catch((err: any) => {
        if (active) setError(err?.message || copy.error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id, copy.error]);

  const registrationUrl = useMemo(() => {
    if (typeof window === "undefined" || !event) return "";
    return `${window.location.origin}/events/${event.public_id || event.id}/register`;
  }, [event]);

  const modules = useMemo(() => {
    if (!event) return [];
    return [
      {
        href: `/admin/events/${event.id}/attendees`,
        title: copy.attendees,
        body: copy.attendeesBody,
        icon: Users,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: true,
      },
      {
        href: `/admin/events/${event.id}/settings`,
        title: copy.settings,
        body: copy.settingsBody,
        icon: Settings,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: true,
      },
      {
        href: `/admin/events/${event.id}/certificates`,
        title: copy.certificates,
        body: copy.certificatesBody,
        icon: Shield,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: event.certificate_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/editor`,
        title: copy.editor,
        body: copy.editorBody,
        icon: Palette,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: event.certificate_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/sessions`,
        title: copy.sessions,
        body: copy.sessionsBody,
        icon: QrCode,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: event.checkin_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/tickets`,
        title: copy.tickets,
        body: copy.ticketsBody,
        icon: Ticket,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: event.ticketing_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/raffles`,
        title: copy.raffles,
        body: copy.rafflesBody,
        icon: Gift,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: event.checkin_enabled !== false && event.raffles_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/gamification`,
        title: copy.gamification,
        body: copy.gamificationBody,
        icon: Sparkles,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: event.checkin_enabled !== false && event.gamification_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/email-templates`,
        title: copy.email,
        body: copy.emailBody,
        icon: Mail,
        tone: "text-gray-900 bg-gray-50 border-gray-100",
        show: true,
      },
    ].filter((item) => item.show);
  }, [copy, event]);

  async function copyRegistrationLink() {
    if (!registrationUrl) return;
    await navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return <LoadingState description={copy.loading} />;
  }

  if (error || !event) {
    return <ErrorState title={copy.error} description={error || undefined} />;
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-16 antialiased text-gray-900">
      
      {/* 1. ANA ETKİNLİK BAŞLIK KARTI */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1.5 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.eyebrow}</p>
            <h1 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">{event.name}</h1>
            <p className="max-w-2xl text-xs leading-relaxed text-gray-400 font-medium">{copy.description}</p>
            
            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-gray-500">
              {event.event_date && (
                <span className="inline-flex items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-0.5 shadow-sm font-mono uppercase">
                  <CalendarDays className="h-3 w-3 text-gray-400" />
                  {new Date(event.event_date).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-0.5 shadow-sm font-mono">
                <FileText className="h-3 w-3 text-gray-400" />
                ID: {event.id}
              </span>
            </div>
          </div>

          {/* Kayıt İstasyonu Yan Kartı (Apple Özelleştirilmiş Dock) */}
          <div className="w-full rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 lg:w-[320px] shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.registration}</p>
            <p className="mt-1.5 break-all font-mono text-[11px] font-medium text-gray-700 select-all tracking-tight">{registrationUrl}</p>
            
            <div className="mt-4 flex flex-col gap-1.5 sm:flex-row lg:flex-col w-full">
              <button 
                type="button" 
                onClick={copyRegistrationLink} 
                className="flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
              >
                <Copy className="h-3.5 w-3.5 text-gray-400 stroke-[2]" />
                <span>{copied ? copy.copied : copy.copyLink}</span>
              </button>
              <a 
                href={registrationUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-gray-950 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-[0.98] text-center"
              >
                <ExternalLink className="h-3.5 w-3.5 text-gray-400 stroke-[2.5]" />
                <span>{copy.openPublic}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OPERASYONEL SAĞLIK ÖZET METRİKLERİ */}
      {health && (
        <section className="grid gap-4 xl:grid-cols-[340px_1fr]">
          {/* Sol Panel: Operasyon Başlığı ve Hızlı Durum Matrisi */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                <Activity className="h-4 w-4 stroke-[2]" />
              </div>
              <h2 className="mt-3.5 text-sm font-bold tracking-tight text-gray-950">
                {lang === "tr" ? "Operasyon durumu" : "Operations health"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                {lang === "tr"
                  ? "Yoklama, sertifika ve bilet akış matrisini tek bakışta izleyin."
                  : "Monitor attendance, ticket check-ins, and credential matrices."}
              </p>
            </div>
            
            {/* Küçük Bilgi Matrisi */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {[
                [lang === "tr" ? "Yoklama kaydı" : "Attendance", health.overview.attendance_records],
                [lang === "tr" ? "Aktif sertifika" : "Credentials", health.overview.active_certificates],
                [copy.attendees, health.overview.attendees],
                [lang === "tr" ? "Bilet kullanımı" : "Tickets", `${health.overview.used_tickets}/${health.overview.tickets}`],
              ].map(([lbl, val], idx) => (
                <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/40 p-2.5 font-medium">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">{String(lbl)}</p>
                  <p className="mt-0.5 text-base font-bold text-gray-950 tracking-tight tabular-nums">{String(val)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ Panel: Canlı Sistem Sağlık Kontrolleri Listesi */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-center">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {health.checks.map((item) => (
                <div key={item.key} className={`rounded-xl border p-3.5 transition-colors ${healthTone(item.status)}`}>
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3 className="font-bold text-xs text-gray-950 tracking-tight flex items-center gap-1.5">
                        {getHealthIcon(item.status)}
                        <span className="truncate">{item.label}</span>
                      </h3>
                      <p className="text-[11px] font-medium text-gray-400 leading-normal line-clamp-2">{item.detail}</p>
                    </div>
                    
                    <span className="shrink-0 inline-flex rounded-md border border-white/60 bg-white/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500 shadow-sm">
                      {item.status === "ok"
                        ? lang === "tr" ? "Sağlıklı" : "Healthy"
                        : item.status === "warning"
                          ? lang === "tr" ? "İnceleme" : "Review"
                          : item.status === "error"
                            ? lang === "tr" ? "Hata" : "Error"
                            : lang === "tr" ? "Pasif" : "Idle"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. ADIM KONTROL LİSTESİ VE YÖNETİM MODÜLLERİ GRIDİ */}
      <section className="grid gap-4 lg:grid-cols-[320px_1fr] items-start">
        {/* Sol Sütun: Kurulum Kontrol Listesi */}
        <EventSetupChecklist event={event} overview={health?.overview} lang={lang} />

        {/* Sağ Sütun: Modül Kısayol Kartları Havuzu */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="mb-4 border-b border-gray-100 pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">{copy.modules}</h2>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:border-gray-200 hover:bg-gray-50/40"
                >
                  <div className="space-y-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm group-hover:scale-105 transition-transform ${item.tone}`}>
                      <Icon className="h-4 w-4 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-xs font-bold text-gray-950 tracking-tight">{item.title}</h3>
                      <p className="text-[11px] leading-relaxed text-gray-400 line-clamp-2">{item.body}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-1">
                    <ArrowRight className="h-3.5 w-3.5 text-gray-300 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-gray-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. DİNAMİK EKİP AKTİVİTE ZAMAN AKIŞI */}
      <EventActivityTimeline eventId={event.id} />
      
    </div>
  );
}