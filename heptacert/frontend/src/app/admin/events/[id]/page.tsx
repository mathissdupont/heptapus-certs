"use client";

import { localeTag } from "@/lib/localeTag";
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
import { useI18n, translate } from "@/lib/i18n";
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
  if (status === "ok") return "border-status-success-border bg-status-success-bg/30 text-status-success-content";
  if (status === "warning") return "border-status-warning-border bg-status-warning-bg/30 text-status-warning-content";
  if (status === "error") return "border-status-danger-border bg-status-danger-bg/30 text-status-danger-content";
  return "border-surface-150 bg-surface-50 text-surface-500";
}

function getHealthIcon(status: EventHealthCheck["status"]) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-content stroke-[2.5]" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning-content stroke-[2]" />;
  if (status === "error") return <XCircle className="h-4 w-4 shrink-0 text-status-danger-content stroke-[2]" />;
  return <Activity className="h-4 w-4 shrink-0 text-surface-400 stroke-[1.8]" />;
}

export default function EventIndexPage() {
  const params = useParams<{ id: string }>();
  const { lang } = useI18n();
  const [event, setEvent] = useState<EventOut | null>(null);
  const [health, setHealth] = useState<EventHealthOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = { eyebrow: translate(lang, "migrated_app_admin_events_id_event_details_f4e026ad"), loading: translate(lang, "migrated_app_admin_events_id_loading_event_details_30e14576"), error: translate(lang, "migrated_app_admin_events_id_could_not_load_event_details_84f3a849"), registration: translate(lang, "migrated_app_admin_events_id_registration_station_ac85f29e"), copyLink: translate(lang, "migrated_app_admin_events_id_copy_registration_link_06403873"), copied: translate(lang, "migrated_app_admin_events_id_copied_0f8c7aff"), openPublic: translate(lang, "migrated_app_admin_events_id_open_registration_page_bb4402ab"), description: translate(lang, "migrated_app_admin_events_id_finalize_participant_engagement_automated__2967f2e8"), modules: translate(lang, "migrated_app_admin_events_id_management_areas_a1519085"), quickSetup: translate(lang, "migrated_app_admin_events_id_quick_start_c377aacc"), quickSetupBody: translate(lang, "migrated_app_admin_events_id_set_the_registration_form_and_privacy_noti_b323a021"), attendees: translate(lang, "migrated_app_admin_events_id_attendees_038ec960"), attendeesBody: translate(lang, "migrated_app_admin_events_id_filter_registrations_question_based_respon_b73afe0f"), settings: translate(lang, "migrated_app_admin_events_id_settings_7ab971df"), settingsBody: translate(lang, "migrated_app_admin_events_id_configure_registration_rules_privacy_nodes_c12ad622"), certificates: translate(lang, "migrated_app_admin_events_id_certificates_19e72377"), certificatesBody: translate(lang, "migrated_app_admin_events_id_audit_issued_digital_credentials_verify_lo_8b1523d3"), editor: translate(lang, "migrated_app_admin_events_id_certificate_editor_de5bc0ad"), editorBody: translate(lang, "migrated_app_admin_events_id_design_professional_credential_canvases_an_584500eb"), sessions: translate(lang, "migrated_app_admin_events_id_sessions_1f85eec5"), sessionsBody: translate(lang, "migrated_app_admin_events_id_coordinate_batch_qr_check_in_sessions_and__1d4b9a64"), tickets: translate(lang, "migrated_app_admin_events_id_tickets_c19bf50d"), ticketsBody: translate(lang, "migrated_app_admin_events_id_govern_event_passes_credential_bindings_an_2665e31a"), raffles: translate(lang, "migrated_app_admin_events_id_raffles_a08e9b3d"), rafflesBody: translate(lang, "migrated_app_admin_events_id_launch_parameter_driven_live_engagement_dr_84a70abc"), gamification: translate(lang, "migrated_app_admin_events_id_gamification_68084f35"), gamificationBody: translate(lang, "migrated_app_admin_events_id_deploy_achievement_badges_reward_score_rul_afbbca8c"), email: translate(lang, "migrated_app_admin_events_id_email_8c229083"), emailBody: translate(lang, "migrated_app_admin_events_id_govern_automated_confirmation_matrices_and_fa106533") };

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
        tone: "text-surface-900 bg-surface-50 border-surface-100",
        show: true,
      },
      {
        href: `/admin/events/${event.id}/settings`,
        title: copy.settings,
        body: copy.settingsBody,
        icon: Settings,
        tone: "text-surface-900 bg-surface-50 border-surface-100",
        show: true,
      },
      {
        href: `/admin/events/${event.id}/certificates`,
        title: copy.certificates,
        body: copy.certificatesBody,
        icon: Shield,
        tone: "text-surface-900 bg-surface-50 border-surface-100",
        show: event.certificate_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/editor`,
        title: copy.editor,
        body: copy.editorBody,
        icon: Palette,
        tone: "text-surface-900 bg-surface-50 border-surface-100",
        show: event.certificate_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/sessions`,
        title: copy.sessions,
        body: copy.sessionsBody,
        icon: QrCode,
        tone: "text-surface-900 bg-surface-50 border-surface-100",
        show: event.checkin_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/tickets`,
        title: copy.tickets,
        body: copy.ticketsBody,
        icon: Ticket,
        tone: "text-surface-900 bg-surface-50 border-surface-100",
        show: event.ticketing_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/raffles`,
        title: copy.raffles,
        body: copy.rafflesBody,
        icon: Gift,
        tone: "text-surface-900 bg-surface-50 border-surface-100",
        show: event.checkin_enabled !== false && event.raffles_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/gamification`,
        title: copy.gamification,
        body: copy.gamificationBody,
        icon: Sparkles,
        tone: "text-surface-900 bg-surface-50 border-surface-100",
        show: event.checkin_enabled !== false && event.gamification_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/email-templates`,
        title: copy.email,
        body: copy.emailBody,
        icon: Mail,
        tone: "text-surface-900 bg-surface-50 border-surface-100",
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
    <div className="w-full flex flex-col gap-6 pb-16 antialiased text-surface-900">

      {/* 1. ANA ETKİNLİK BAŞLIK KARTI */}
      <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1.5 flex-1">
            <p className="text-11 font-bold uppercase tracking-widest text-surface-400">{copy.eyebrow}</p>
            <h1 className="text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">{event.name}</h1>
            <p className="max-w-2xl text-xs leading-relaxed text-surface-400 font-medium">{copy.description}</p>

            <div className="pt-2 flex flex-wrap gap-1.5 text-11 font-bold text-surface-500">
              {event.event_date && (
                <span className="inline-flex items-center gap-1 rounded-md border border-surface-100 bg-surface-50 px-2.5 py-0.5 shadow-sm font-mono uppercase">
                  <CalendarDays className="h-3 w-3 text-surface-400" />
                  {new Date(event.event_date).toLocaleDateString(localeTag(lang), { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md border border-surface-100 bg-surface-50 px-2.5 py-0.5 shadow-sm font-mono">
                <FileText className="h-3 w-3 text-surface-400" />
                ID: {event.id}
              </span>
            </div>
          </div>

          {/* Kayıt İstasyonu Yan Kartı (Apple Özelleştirilmiş Dock) */}
          <div className="w-full rounded-xl border border-surface-200/80 bg-surface-50/50 p-4 lg:w-[320px] shrink-0">
            <p className="text-11 font-bold uppercase tracking-widest text-surface-400">{copy.registration}</p>
            <p className="mt-1.5 break-all font-mono text-11 font-medium text-surface-700 select-all tracking-tight">{registrationUrl}</p>

            <div className="mt-4 flex flex-col gap-1.5 sm:flex-row lg:flex-col w-full">
              <button
                type="button"
                onClick={copyRegistrationLink}
                className="flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-raised text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 active:scale-[0.98]"
              >
                <Copy className="h-3.5 w-3.5 text-surface-400 stroke-[2]" />
                <span>{copied ? copy.copied : copy.copyLink}</span>
              </button>
              <a
                href={registrationUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-[0.98] text-center"
              >
                <ExternalLink className="h-3.5 w-3.5 text-surface-400 stroke-[2.5]" />
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
          <div className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-content shadow-sm">
                <Activity className="h-4 w-4 stroke-[2]" />
              </div>
              <h2 className="mt-3.5 text-sm font-bold tracking-tight text-surface-900">
                {translate(lang, "migrated_app_admin_events_id_operations_health_e9367bff")}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-surface-400">
                {translate(lang, "migrated_app_admin_events_id_monitor_attendance_ticket_check_ins_and_cr_52fef66c")}
              </p>
            </div>

            {/* Küçük Bilgi Matrisi */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {[
                [translate(lang, "migrated_app_admin_events_id_attendance_7f7a671c"), health.overview.attendance_records],
                [translate(lang, "migrated_app_admin_events_id_credentials_90ae32e8"), health.overview.active_certificates],
                [copy.attendees, health.overview.attendees],
                [translate(lang, "migrated_app_admin_events_id_tickets_c1f2dac3"), `${health.overview.used_tickets}/${health.overview.tickets}`],
              ].map(([lbl, val], idx) => (
                <div key={idx} className="rounded-xl border border-surface-100 bg-surface-50/40 p-2.5 font-medium">
                  <p className="text-11 font-bold uppercase tracking-wider text-surface-400 truncate">{String(lbl)}</p>
                  <p className="mt-0.5 text-base font-bold text-surface-900 tracking-tight tabular-nums">{String(val)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ Panel: Canlı Sistem Sağlık Kontrolleri Listesi */}
          <div className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm flex flex-col justify-center">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {health.checks.map((item) => (
                <div key={item.key} className={`rounded-xl border p-3.5 transition-colors ${healthTone(item.status)}`}>
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3 className="font-bold text-xs text-surface-900 tracking-tight flex items-center gap-1.5">
                        {getHealthIcon(item.status)}
                        <span className="truncate">{item.label}</span>
                      </h3>
                      <p className="text-11 font-medium text-surface-400 leading-normal line-clamp-2">{item.detail}</p>
                    </div>

                    <span className="shrink-0 inline-flex rounded-md border border-white/60 bg-raised/50 px-1.5 py-0.5 text-11 font-bold uppercase tracking-wider text-surface-500 shadow-sm">
                      {item.status === "ok"
                        ? translate(lang, "migrated_app_admin_events_id_healthy_06c24a06")
                        : item.status === "warning"
                          ? translate(lang, "migrated_app_admin_events_id_review_0af268a6")
                          : item.status === "error"
                            ? translate(lang, "migrated_app_admin_events_id_error_461da5fe")
                            : translate(lang, "migrated_app_admin_events_id_idle_5227c75c")}
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
        <EventSetupChecklist event={event} overview={health?.overview} />

        {/* Sağ Sütun: Modül Kısayol Kartları Havuzu */}
        <div className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="mb-4 border-b border-surface-100 pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.modules}</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col justify-between gap-4 rounded-xl border border-surface-100 bg-raised p-4 shadow-sm transition-all duration-300 hover:border-surface-200 hover:bg-surface-50/40"
                >
                  <div className="space-y-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm group-hover:scale-105 transition-transform ${item.tone}`}>
                      <Icon className="h-4 w-4 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-xs font-bold text-surface-900 tracking-tight">{item.title}</h3>
                      <p className="text-11 leading-relaxed text-surface-400 line-clamp-2">{item.body}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <ArrowRight className="h-3.5 w-3.5 text-surface-300 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-surface-600" />
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
