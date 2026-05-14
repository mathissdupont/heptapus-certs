"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
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
} from "lucide-react";
import { apiFetch, type EventOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type EventIndexPageProps = {
  params: { id: string };
};

export default function EventIndexPage({ params }: EventIndexPageProps) {
  const { lang } = useI18n();
  const [event, setEvent] = useState<EventOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = {
    tr: {
      eyebrow: "Etkinlik Detayları",
      loading: "Etkinlik detayları yükleniyor...",
      error: "Etkinlik detayları yüklenemedi.",
      registration: "Kayıt Sayfası",
      copyLink: "Kayıt Linkini Kopyala",
      copied: "Kopyalandı",
      openPublic: "Kayıt sayfasını aç",
      description: "Bu standart girişten katılımcı, sertifika, bilet, e-posta ve ayar ekranlarına geçebilirsiniz.",
      modules: "Yönetim Alanları",
      quickSetup: "Hızlı Başlangıç",
      quickSetupBody: "Önce kayıt formunu ve KVKK metnini ayarlayın, sonra katılımcıları ve otomasyonları bu ekrandan yönetin.",
      attendees: "Katılımcılar",
      attendeesBody: "Kayıtları, soru bazlı cevapları, Excel/Sheets akışını ve katılımcı kartlarını yönetin.",
      settings: "Ayarlar",
      settingsBody: "Kayıt formu, KVKK, banner, e-posta ve modül ayarlarını düzenleyin.",
      certificates: "Sertifikalar",
      certificatesBody: "Üretilen sertifikaları takip edin ve toplu üretim durumunu görün.",
      editor: "Sertifika Editörü",
      editorBody: "Sertifika tasarımını ve alan konumlarını düzenleyin.",
      sessions: "Oturumlar",
      sessionsBody: "QR check-in oturumlarını ve katılım eşiğini yönetin.",
      tickets: "Biletler",
      ticketsBody: "Etkinlik giriş kartlarını ve bilet doğrulama akışını yönetin.",
      raffles: "Çekilişler",
      rafflesBody: "Katılım koşullu çekilişleri hazırlayın ve sunum modunu açın.",
      gamification: "Oyunlaştırma",
      gamificationBody: "Rozet, puan ve katılım motivasyonu akışlarını yönetin.",
      email: "E-posta",
      emailBody: "Etkinliğe özel e-posta şablonları ve gönderim akışlarını yönetin.",
    },
    en: {
      eyebrow: "Event Details",
      loading: "Loading event details...",
      error: "Could not load event details.",
      registration: "Registration Page",
      copyLink: "Copy Registration Link",
      copied: "Copied",
      openPublic: "Open registration page",
      description: "Use this standard entry point to manage attendees, certificates, tickets, email, and settings.",
      modules: "Management Areas",
      quickSetup: "Quick Start",
      quickSetupBody: "Set the registration form and privacy notice first, then manage attendees and automations from here.",
      attendees: "Attendees",
      attendeesBody: "Manage registrations, question-based answers, Excel/Sheets flow, and attendee cards.",
      settings: "Settings",
      settingsBody: "Edit registration form, privacy, banner, email, and module settings.",
      certificates: "Certificates",
      certificatesBody: "Track issued certificates and bulk generation status.",
      editor: "Certificate Editor",
      editorBody: "Edit certificate design and field positions.",
      sessions: "Sessions",
      sessionsBody: "Manage QR check-in sessions and attendance thresholds.",
      tickets: "Tickets",
      ticketsBody: "Manage event passes and ticket validation.",
      raffles: "Raffles",
      rafflesBody: "Prepare attendance-based raffles and presentation mode.",
      gamification: "Gamification",
      gamificationBody: "Manage badges, points, and engagement flows.",
      email: "Email",
      emailBody: "Manage event-specific email templates and sending flows.",
    },
  }[lang];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch(`/admin/events/${params.id}`)
      .then((response) => response.json())
      .then((data: EventOut) => {
        if (active) setEvent(data);
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
        tone: "text-sky-700 bg-sky-50 border-sky-100",
        show: true,
      },
      {
        href: `/admin/events/${event.id}/settings`,
        title: copy.settings,
        body: copy.settingsBody,
        icon: Settings,
        tone: "text-brand-700 bg-brand-50 border-brand-100",
        show: true,
      },
      {
        href: `/admin/events/${event.id}/certificates`,
        title: copy.certificates,
        body: copy.certificatesBody,
        icon: Shield,
        tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
        show: event.certificate_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/editor`,
        title: copy.editor,
        body: copy.editorBody,
        icon: Palette,
        tone: "text-violet-700 bg-violet-50 border-violet-100",
        show: event.certificate_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/sessions`,
        title: copy.sessions,
        body: copy.sessionsBody,
        icon: QrCode,
        tone: "text-indigo-700 bg-indigo-50 border-indigo-100",
        show: event.checkin_enabled !== false,
      },
      {
        href: `/admin/events/${event.id}/tickets`,
        title: copy.tickets,
        body: copy.ticketsBody,
        icon: Ticket,
        tone: "text-amber-700 bg-amber-50 border-amber-100",
        show: event.ticketing_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/raffles`,
        title: copy.raffles,
        body: copy.rafflesBody,
        icon: Gift,
        tone: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100",
        show: event.checkin_enabled !== false && event.raffles_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/gamification`,
        title: copy.gamification,
        body: copy.gamificationBody,
        icon: Sparkles,
        tone: "text-purple-700 bg-purple-50 border-purple-100",
        show: event.checkin_enabled !== false && event.gamification_enabled === true,
      },
      {
        href: `/admin/events/${event.id}/email-templates`,
        title: copy.email,
        body: copy.emailBody,
        icon: Mail,
        tone: "text-slate-700 bg-slate-50 border-slate-100",
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
    return (
      <div className="surface-panel flex items-center gap-3 p-6 text-sm font-semibold text-surface-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {copy.loading}
      </div>
    );
  }

  if (error || !event) {
    return <div className="error-banner">{error || copy.error}</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <section className="surface-panel p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-surface-400">{copy.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-black text-surface-950">{event.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">{copy.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-surface-500">
              {event.event_date && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(event.event_date).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1">
                <FileText className="h-3.5 w-3.5" />
                ID {event.id}
              </span>
            </div>
          </div>

          <div className="w-full rounded-lg border border-surface-200 bg-surface-50 p-4 lg:w-[340px]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-surface-400">{copy.registration}</p>
            <p className="mt-2 break-all text-sm font-semibold text-surface-800">{registrationUrl}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button type="button" onClick={copyRegistrationLink} className="btn-secondary inline-flex items-center justify-center gap-2">
                <Copy className="h-4 w-4" />
                {copied ? copy.copied : copy.copyLink}
              </button>
              <a href={registrationUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" />
                {copy.openPublic}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.6fr]">
        <div className="card p-5">
          <div className="rounded-lg bg-brand-50 p-3 text-brand-700 w-fit">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-surface-900">{copy.quickSetup}</h2>
          <p className="mt-2 text-sm leading-6 text-surface-600">{copy.quickSetupBody}</p>
          <Link href={`/admin/events/${event.id}/settings`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
            {copy.settings}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-surface-900">{copy.modules}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-lg border border-surface-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg border ${item.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-surface-900">{item.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-surface-500">{item.body}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-surface-300 transition group-hover:text-brand-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
