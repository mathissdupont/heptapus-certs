"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Flag,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  Users,
  Lock,
  ListChecks,
  FileText,
  CheckCircle2,
  Ticket,
  FileQuestion,
  CalendarPlus,
  Layers,
  Mic2,
  Megaphone,
  Handshake,
  Radio,
} from "lucide-react";
import {
  createPublicEventComment,
  getPublicEventDetail,
  getPublicMemberMe,
  getPublicMemberToken,
  listPublicEventComments,
  publicAgendaIcsUrl,
  reportPublicEventComment,
  type PublicEventComment,
  type PublicEventDetail,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n, useT, type Lang } from "@/lib/i18n";
import { fetchCurrentBranding, isWhiteLabelBranding } from "@/lib/whiteLabel";

function formatDate(value: string | null | undefined, lang: Lang) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag(lang), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function PublicEventDetailClient() {
  const params = useParams();
  const rawEventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const eventId = rawEventId ? String(rawEventId) : "";
  const { lang } = useI18n();
  const t = useT();
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [comments, setComments] = useState<PublicEventComment[]>([]);
  const [member, setMember] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [isWhiteLabel, setIsWhiteLabel] = useState(false);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            back: "Etkinliklere dön",
            organizationBack: "Kurum etkinliklerine dön",
            loading: "Etkinlik detayları yükleniyor...",
            error: "Etkinlik detayları yüklenemedi.",
            register: "Kayıt Ol",
            registrationClosed: "Kayıtlar Kapandı",
            sessions: "Oturumlar",
            customFields: "Kayıt Bilgileri",
            minSessions: "Sertifika için min. oturum",
            entryRequirement: "Giriş / katılım şartı",
            certificateFlow: "Sertifikalı akış",
            ticketFlow: "Biletli giriş",
            standardFlow: "Standart etkinlik",
            unlisted: "Liste Dışı",
            noSessions: "Henüz oturum eklenmedi.",
            defaultFields: "Bu etkinlikte sadece standart ad ve e-posta alanları kullanılıyor.",
            required: "Zorunlu",
            commentsTitle: "Yorumlar",
            commentsSubtitle: "Topluluğun etkinlik hakkındaki görüşlerini inceleyin.",
            noComments: "Henüz yorum yok. İlk yorumu siz yapın.",
            commentPlaceholder: "Bu etkinlik hakkında ne düşünüyorsunuz?",
            commentSubmit: "Gönder",
            loginPrompt: "Yorum yazmak için üye hesabınızla giriş yapın.",
            loginCta: "Giriş Yap",
            report: "Bildir",
            reportBusy: "İşleniyor",
            writeError: "Yorum gönderilemedi.",
            sessionLabel: "Oturum",
            viewStatus: "Durumu Görüntüle",
            takeQuiz: "Sınava Gir",
          }
        : {
            back: "Back to events",
            organizationBack: "Back to organization events",
            loading: "Loading event details...",
            error: "Failed to load event details.",
            register: "Register",
            registrationClosed: "Registration Closed",
            sessions: "Sessions",
            customFields: "Registration Fields",
            minSessions: "Min. sessions for certificate",
            entryRequirement: "Entry / participation rule",
            certificateFlow: "Certificate flow",
            ticketFlow: "Ticketed entry",
            standardFlow: "Standard event",
            unlisted: "Unlisted",
            noSessions: "No session has been added yet.",
            defaultFields: "This event currently uses standard name and email fields only.",
            required: "Required",
            commentsTitle: "Comments",
            commentsSubtitle: "Read what the community thinks about this event.",
            noComments: "There are no comments yet. Be the first to post.",
            commentPlaceholder: "What do you think about this event?",
            commentSubmit: "Post",
            loginPrompt: "Sign in with your member account to write a comment.",
            loginCta: "Sign In",
            report: "Report",
            reportBusy: "Processing",
            writeError: "Failed to submit comment.",
            sessionLabel: "Session",
            viewStatus: "View Status",
            takeQuiz: "Take Quiz",
          },
    [lang],
  );

  // WP20 agenda: when the organizer has enabled the agenda, the sessions column
  // becomes a filterable, calendar-exportable schedule. Otherwise it stays the
  // simple session list (backward compatible for check-in-only events).
  const agendaEnabled = Boolean(event?.agenda_enabled);
  const agendaTracks = useMemo(() => {
    const set = new Set<string>();
    (event?.sessions ?? []).forEach((s) => {
      if (s.track && s.track.trim()) set.add(s.track.trim());
    });
    return Array.from(set);
  }, [event]);
  const visibleSessions = useMemo(() => {
    const list = event?.sessions ?? [];
    if (!agendaEnabled || !selectedTrack) return list;
    return list.filter((s) => (s.track?.trim() || null) === selectedTrack);
  }, [event, agendaEnabled, selectedTrack]);

  useEffect(() => {
    let active = true;

    if (!eventId) {
      setEvent(null);
      setComments([]);
      setMember(null);
      setError(copy.error);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getPublicEventDetail(eventId),
      listPublicEventComments(eventId).catch(() => []),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
      fetchCurrentBranding().catch(() => null),
    ])
      .then(([eventData, commentData, memberData, brandingData]) => {
        if (!active) return;
        setEvent(eventData);
        setComments(commentData);
        setMember(memberData);
        setIsWhiteLabel(isWhiteLabelBranding(brandingData, typeof window !== "undefined" ? window.location.hostname : ""));
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || copy.error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [copy.error, eventId]);

  async function handleCommentSubmit(eventArg: React.FormEvent) {
    eventArg.preventDefault();
    if (!commentBody.trim()) return;

    setCommentBusy(true);
    setError(null);
    try {
      const created = await createPublicEventComment(eventId, commentBody.trim());
      setComments((current) => [created, ...current]);
      setCommentBody("");
    } catch (err: any) {
      setError(err?.message || copy.writeError);
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleReport(commentId: number) {
    setReportingId(commentId);
    setError(null);
    try {
      await reportPublicEventComment(eventId, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (err: any) {
      setError(err?.message || copy.writeError);
    } finally {
      setReportingId(null);
    }
  }

  const statusHref = event
    ? `/events/${event.public_id}/status`
    : `/events/${eventId}/status`;
  const statusLinkHref = member
    ? statusHref
    : `/login?mode=member&next=${encodeURIComponent(statusHref)}`;
  const backHref = isWhiteLabel ? "/" : "/events";
  const backLabel = isWhiteLabel ? copy.organizationBack : copy.back;
  const showStatusButton = !isWhiteLabel || Boolean(member);
  const isTicketedEvent = event?.ticketing_enabled === true;
  const isCertificateEvent = event?.certificate_enabled !== false;
  const flowLabel = isTicketedEvent ? copy.ticketFlow : isCertificateEvent ? copy.certificateFlow : copy.standardFlow;
  const requirementLabel = isCertificateEvent && !isTicketedEvent ? copy.minSessions : copy.entryRequirement;

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center text-content-muted">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm font-medium">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-semibold text-content-primary mb-2">{copy.error}</h1>
        <p className="text-content-muted text-sm mb-6">{error}</p>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 px-4 py-2 bg-raised border border-outline-subtle text-content-secondary rounded-lg hover:bg-canvas transition text-sm font-medium shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-16">
      {/* Navbar / Header */}
      <div className="sticky top-0 z-40 bg-raised/80 backdrop-blur-md border-b border-outline-subtle px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-content-muted hover:text-content-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        {/* Hero Section */}
        <section className="bg-raised rounded-2xl shadow-sm border border-outline-subtle overflow-hidden mb-8">
          {/* Cover Image / Banner */}
          <div className="relative h-48 sm:h-64 bg-sunken border-b border-outline-subtle overflow-hidden">
            {event.event_banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.event_banner_url}
                alt={event.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-canvas">
                <CalendarDays className="h-16 w-16 text-content-muted" />
              </div>
            )}
          </div>

          <div className="p-6 sm:p-10">
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {event.visibility === "unlisted" && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-xs font-semibold text-status-warning-content">
                  <Lock className="h-3 w-3" />
                  {copy.unlisted}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-status-success-border bg-status-success-bg px-2.5 py-1 text-xs font-semibold text-status-success-content">
                {isTicketedEvent ? <Ticket className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {flowLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-status-info-border bg-status-info-bg px-2.5 py-1 text-xs font-semibold text-status-info-content">
                <ListChecks className="h-3 w-3" />
                {requirementLabel}: {event.min_sessions_required}
              </span>
            </div>

            {/* Title & Description */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-content-primary mb-4 tracking-tight">
                {event.name}
              </h1>

              {/* Organization Info */}
              {event.organization_public_id && event.organization_name && (
                <Link
                  href={isWhiteLabel ? "/" : `/organizations/${event.organization_public_id}`}
                  className="inline-flex items-center gap-2.5 mb-6 group"
                >
                  <div className="h-8 w-8 rounded-full bg-sunken border border-outline-subtle overflow-hidden flex items-center justify-center">
                    {event.organization_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.organization_logo}
                        alt={event.organization_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-4 w-4 text-content-muted" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-content-secondary group-hover:text-content-primary transition-colors">
                    {event.organization_name}
                  </span>
                </Link>
              )}

              {event.event_description && (
                <div
                  className="prose prose-sm sm:prose-base max-w-none text-content-secondary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: event.event_description }}
                />
              )}
            </div>

            {/* Quick Info Bar */}
            <div className="flex flex-col sm:flex-row gap-4 py-6 border-y border-outline-subtle mb-8">
              <div className="flex items-start gap-3 flex-1">
                <CalendarDays className="h-5 w-5 text-content-muted mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-content-muted uppercase tracking-wide">Tarih</p>
                  <p className="text-sm font-semibold text-content-primary mt-0.5">
                    {formatDate(event.event_date, lang)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 flex-1">
                <MapPin className="h-5 w-5 text-content-muted mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-content-muted uppercase tracking-wide">Konum</p>
                  <p className="text-sm font-semibold text-content-primary mt-0.5">
                    {event.event_location || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 flex-1">
                <Users className="h-5 w-5 text-content-muted mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-content-muted uppercase tracking-wide">Oturumlar</p>
                  <p className="text-sm font-semibold text-content-primary mt-0.5">
                    {event.sessions.length} {copy.sessions.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              {event.registration_closed ? (
                <div className="inline-flex items-center px-6 py-2.5 rounded-lg border border-outline-subtle bg-canvas text-content-muted text-sm font-medium">
                  {copy.registrationClosed}
                </div>
              ) : (
                <Link
                  href={`/events/${event.public_id}/register`}
                  className="inline-flex items-center justify-center px-8 py-2.5 rounded-lg bg-inverse-surface text-white text-sm font-medium hover:bg-inverse-surface transition-colors shadow-sm"
                >
                  {copy.register}
                </Link>
              )}
              {showStatusButton && (
                <Link
                  href={statusLinkHref}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-outline-subtle bg-raised text-content-secondary text-sm font-medium hover:bg-canvas transition-colors shadow-sm"
                >
                  {copy.viewStatus}
                </Link>
              )}
              {event.has_active_quiz && (
                <Link
                  href={`/events/${event.public_id}/quiz`}
                  className="inline-flex items-center gap-2 justify-center px-6 py-2.5 rounded-lg border border-status-info-border bg-status-info-bg text-status-info-content text-sm font-medium hover:bg-status-info-bg transition-colors shadow-sm"
                >
                  <FileQuestion className="h-4 w-4" />
                  {copy.takeQuiz}
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Call-for-Papers CTA */}
        {event.cfp_enabled && (
          <Link
            href={`/events/${eventId}/cfp`}
            className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-status-info-border bg-status-info-bg/50 px-6 py-4 transition-colors hover:bg-status-info-bg"
          >
            <span className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-status-info-content" />
              <span className="text-sm font-semibold text-status-info-content">{t("cfp_public_cta")}</span>
            </span>
            <span className="text-sm font-semibold text-status-info-content">→</span>
          </Link>
        )}

        {/* Networking CTA */}
        {event.networking_meetings_enabled && (
          <Link
            href={`/events/${eventId}/networking`}
            className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-status-success-border bg-status-success-bg/50 px-6 py-4 transition-colors hover:bg-status-success-bg"
          >
            <span className="flex items-center gap-3">
              <Handshake className="h-5 w-5 text-status-success-content" />
              <span className="text-sm font-semibold text-status-success-content">{t("net_public_cta")}</span>
            </span>
            <span className="text-sm font-semibold text-status-success-content">→</span>
          </Link>
        )}

        {/* Live engagement CTA */}
        {event.live_engagement_enabled && (
          <Link
            href={`/events/${eventId}/live`}
            className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-status-danger-border bg-status-danger-bg/50 px-6 py-4 transition-colors hover:bg-status-danger-bg"
          >
            <span className="flex items-center gap-3">
              <Radio className="h-5 w-5 text-status-danger-content" />
              <span className="text-sm font-semibold text-status-danger-content">{t("live_public_cta")}</span>
            </span>
            <span className="text-sm font-semibold text-status-danger-content">→</span>
          </Link>
        )}

        {/* Two Column Grid for Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Sessions / Agenda Column */}
          <section className="bg-raised rounded-2xl shadow-sm border border-outline-subtle p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-content-muted" />
                <h2 className="text-lg font-bold text-content-primary">
                  {agendaEnabled ? t("agenda_title") : copy.sessions}
                </h2>
              </div>
              {agendaEnabled && event.sessions.length > 0 && (
                <a
                  href={publicAgendaIcsUrl(eventId)}
                  title={t("agenda_download_ics")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-xs font-semibold text-content-secondary shadow-sm transition-colors hover:bg-canvas hover:text-content-primary"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {t("agenda_add_to_calendar")}
                </a>
              )}
            </div>

            {/* Track filter (only with an enabled agenda and more than one track) */}
            {agendaEnabled && agendaTracks.length > 1 && (
              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrack(null)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedTrack === null
                      ? "border-outline-strong bg-inverse-surface text-white"
                      : "border-outline-subtle bg-raised text-content-secondary hover:bg-canvas"
                  }`}
                >
                  {t("agenda_all_tracks")}
                </button>
                {agendaTracks.map((track) => (
                  <button
                    key={track}
                    type="button"
                    onClick={() => setSelectedTrack(track)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      selectedTrack === track
                        ? "border-outline-strong bg-inverse-surface text-white"
                        : "border-outline-subtle bg-raised text-content-secondary hover:bg-canvas"
                    }`}
                  >
                    {track}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {visibleSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-strong bg-canvas px-6 py-8 text-center text-sm text-content-muted">
                  {agendaEnabled ? t("agenda_no_sessions") : copy.noSessions}
                </div>
              ) : (
                visibleSessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-outline-subtle bg-raised p-5 hover:border-outline-strong transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <p className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                        {copy.sessionLabel} {index + 1}
                      </p>
                      {agendaEnabled && session.track && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-status-info-bg px-2 py-0.5 text-11 font-semibold text-status-info-content">
                          <Layers className="h-3 w-3" />
                          {session.track}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-content-primary mb-3">
                      {session.name}
                    </h3>
                    <div className="space-y-2 text-sm text-content-secondary">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-content-muted" />
                        {formatDate(session.session_date, lang)}
                      </div>
                      {session.session_start && (
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-content-muted" />
                          {session.session_start}
                          {session.session_end ? `–${session.session_end}` : ""}
                        </div>
                      )}
                      {session.session_location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-content-muted" />
                          {session.session_location}
                        </div>
                      )}
                      {session.speaker_name && (
                        <div className="flex items-center gap-2">
                          <Mic2 className="h-4 w-4 text-content-muted" />
                          <span>
                            <span className="text-content-muted">{t("agenda_speaker_prefix")}: </span>
                            {session.speaker_name}
                          </span>
                        </div>
                      )}
                      {session.capacity != null && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-content-muted" />
                          {t("agenda_capacity_label", { count: session.capacity })}
                        </div>
                      )}
                      {session.description && (
                        <p className="pt-1 text-sm leading-relaxed text-content-muted whitespace-pre-line">
                          {session.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Registration Fields Column */}
          <section className="bg-raised rounded-2xl shadow-sm border border-outline-subtle p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-content-muted" />
              <h2 className="text-lg font-bold text-content-primary">{copy.customFields}</h2>
            </div>

            <div className="space-y-4">
              {event.registration_fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-strong bg-canvas px-6 py-8 text-center text-sm text-content-muted">
                  {copy.defaultFields}
                </div>
              ) : (
                event.registration_fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-outline-subtle bg-raised p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-content-primary">{field.label}</h3>
                      {field.required && (
                        <span className="inline-flex items-center rounded-md bg-status-danger-bg px-2 py-1 text-11 font-medium text-status-danger-content border border-status-danger-border">
                          {copy.required}
                        </span>
                      )}
                    </div>
                    {field.helper_text && (
                      <p className="text-xs text-content-muted">{field.helper_text}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Comments Section */}
        {!isWhiteLabel && (
        <section className="bg-raised rounded-2xl shadow-sm border border-outline-subtle overflow-hidden">
          <div className="px-6 py-6 sm:px-8 border-b border-outline-subtle bg-canvas/50">
            <h2 className="text-lg font-bold text-content-primary mb-1 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-content-muted" />
              {copy.commentsTitle}
            </h2>
            <p className="text-sm text-content-muted">{copy.commentsSubtitle}</p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-4 flex items-start gap-3 text-sm text-status-danger-content">
                <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Comment Form */}
            {member ? (
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <div className="rounded-xl border border-outline-subtle bg-raised focus-within:border-outline-strong focus-within:ring-1 focus-within:ring-outline-strong transition-all overflow-hidden shadow-sm">
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={3}
                    placeholder={copy.commentPlaceholder}
                    className="w-full resize-none border-none bg-transparent p-4 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-0"
                  />
                  <div className="flex items-center justify-between bg-canvas px-4 py-2 border-t border-outline-subtle">
                    <p className="text-xs font-medium text-content-muted flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-sunken flex items-center justify-center text-11 text-content-secondary">
                        {member.display_name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                      </div>
                      {member.display_name || member.email}
                    </p>
                    <button
                      type="submit"
                      disabled={commentBusy || !commentBody.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-inverse-surface px-4 py-1.5 text-xs font-medium text-white hover:bg-inverse-surface transition-colors disabled:opacity-50"
                    >
                      {commentBusy ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {copy.reportBusy}...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          {copy.commentSubmit}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-outline-subtle bg-canvas p-6 text-center mb-8">
                <p className="text-sm text-content-secondary mb-4">{copy.loginPrompt}</p>
                <Link
                  href="/login?mode=member"
                  className="inline-flex items-center gap-2 rounded-lg bg-raised border border-outline-subtle px-4 py-2 text-sm font-medium text-content-secondary hover:bg-sunken transition-colors shadow-sm"
                >
                  {copy.loginCta}
                </Link>
              </div>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-content-muted mx-auto mb-3" />
                <p className="text-sm text-content-muted">{copy.noComments}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <article key={comment.id} className="flex gap-4">
                    <Link
                      href={`/member/${comment.member_public_id}`}
                      className="h-10 w-10 flex-shrink-0 rounded-full bg-sunken border border-outline-subtle overflow-hidden flex items-center justify-center mt-1"
                    >
                      {comment.member_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.member_avatar_url}
                          alt={comment.member_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-content-muted">
                          {comment.member_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/member/${comment.member_public_id}`}
                            className="text-sm font-semibold text-content-primary hover:underline"
                          >
                            {comment.member_name}
                          </Link>
                          <span className="text-xs text-content-muted">
                            {new Date(comment.created_at).toLocaleString(
                              localeTag(lang),
                              { dateStyle: 'medium', timeStyle: 'short' }
                            )}
                          </span>
                        </div>
                        {member && member.public_id !== comment.member_public_id && (
                          <button
                            type="button"
                            onClick={() => void handleReport(comment.id)}
                            disabled={reportingId === comment.id}
                            className="text-content-muted hover:text-status-danger-content transition-colors p-1 rounded-md hover:bg-status-danger-bg disabled:opacity-50"
                            title={copy.report}
                          >
                            {reportingId === comment.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Flag className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-content-secondary leading-relaxed whitespace-pre-wrap">
                        {comment.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
