"use client";

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
  LogIn,
  CheckCircle2
} from "lucide-react";
import {
  createPublicEventComment,
  getPublicEventDetail,
  getPublicMemberMe,
  getPublicMemberToken,
  listPublicEventComments,
  reportPublicEventComment,
  type PublicEventComment,
  type PublicEventDetail,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function formatDate(value: string | null | undefined, lang: "tr" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
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

  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [comments, setComments] = useState<PublicEventComment[]>([]);
  const [member, setMember] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [reportingId, setReportingId] = useState<number | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            back: "Etkinliklere dön",
            loading: "Etkinlik detayları yükleniyor...",
            error: "Etkinlik detayları yüklenemedi.",
            register: "Kayıt Ol",
            registrationClosed: "Kayıtlar Kapandı",
            sessions: "Oturumlar",
            customFields: "Kayıt Bilgileri",
            minSessions: "Sertifika için min. oturum",
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
            viewStatus: "Durumu Görüntüle"
          }
        : {
            back: "Back to events",
            loading: "Loading event details...",
            error: "Failed to load event details.",
            register: "Register",
            registrationClosed: "Registration Closed",
            sessions: "Sessions",
            customFields: "Registration Fields",
            minSessions: "Min. sessions for certificate",
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
            viewStatus: "View Status"
          },
    [lang],
  );

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
    ])
      .then(([eventData, commentData, memberData]) => {
        if (!active) return;
        setEvent(eventData);
        setComments(commentData);
        setMember(memberData);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="flex flex-col items-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm font-medium">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{copy.error}</h1>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-16">
      {/* Navbar / Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        {/* Hero Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          {/* Cover Image / Banner */}
          <div className="relative h-48 sm:h-64 bg-slate-100 border-b border-gray-100 overflow-hidden">
            {event.event_banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.event_banner_url}
                alt={event.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <CalendarDays className="h-16 w-16 text-gray-300" />
              </div>
            )}
          </div>

          <div className="p-6 sm:p-10">
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {event.visibility === "unlisted" && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  <Lock className="h-3 w-3" />
                  {copy.unlisted}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                {copy.minSessions}: {event.min_sessions_required}
              </span>
            </div>

            {/* Title & Description */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                {event.name}
              </h1>

              {/* Organization Info */}
              {event.organization_public_id && event.organization_name && (
                <Link
                  href={`/organizations/${event.organization_public_id}`}
                  className="inline-flex items-center gap-2.5 mb-6 group"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                    {event.organization_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.organization_logo}
                        alt={event.organization_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    {event.organization_name}
                  </span>
                </Link>
              )}

              {event.event_description && (
                <div
                  className="prose prose-sm sm:prose-base max-w-none text-gray-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: event.event_description }}
                />
              )}
            </div>

            {/* Quick Info Bar */}
            <div className="flex flex-col sm:flex-row gap-4 py-6 border-y border-gray-100 mb-8">
              <div className="flex items-start gap-3 flex-1">
                <CalendarDays className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tarih</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {formatDate(event.event_date, lang)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 flex-1">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Konum</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {event.event_location || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 flex-1">
                <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Oturumlar</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {event.sessions.length} {copy.sessions.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              {event.registration_closed ? (
                <div className="inline-flex items-center px-6 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium">
                  {copy.registrationClosed}
                </div>
              ) : (
                <Link
                  href={`/events/${event.public_id}/register`}
                  className="inline-flex items-center justify-center px-8 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                >
                  {copy.register}
                </Link>
              )}
              <Link
                href={`/events/${event.public_id}/status`}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                {copy.viewStatus}
              </Link>
            </div>
          </div>
        </section>

        {/* Two Column Grid for Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Sessions Column */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <ListChecks className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900">{copy.sessions}</h2>
            </div>
            
            <div className="space-y-4">
              {event.sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center text-sm text-gray-500">
                  {copy.noSessions}
                </div>
              ) : (
                event.sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {copy.sessionLabel} {index + 1}
                      </p>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      {session.name}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        {formatDate(session.session_date, lang)}
                      </div>
                      {session.session_start && (
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-gray-400" />
                          {session.session_start}
                        </div>
                      )}
                      {session.session_location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {session.session_location}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Registration Fields Column */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900">{copy.customFields}</h2>
            </div>

            <div className="space-y-4">
              {event.registration_fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center text-sm text-gray-500">
                  {copy.defaultFields}
                </div>
              ) : (
                event.registration_fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-gray-900">{field.label}</h3>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                          {field.type}
                        </span>
                        {field.required && (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 border border-rose-100">
                            {copy.required}
                          </span>
                        )}
                      </div>
                    </div>
                    {field.helper_text && (
                      <p className="text-xs text-gray-500">{field.helper_text}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Comments Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-6 sm:px-8 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              {copy.commentsTitle}
            </h2>
            <p className="text-sm text-gray-500">{copy.commentsSubtitle}</p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-700">
                <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Comment Form */}
            {member ? (
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <div className="rounded-xl border border-gray-200 bg-white focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden shadow-sm">
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={3}
                    placeholder={copy.commentPlaceholder}
                    className="w-full resize-none border-none bg-transparent p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                  />
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600">
                        {member.display_name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                      </div>
                      {member.display_name || member.email}
                    </p>
                    <button
                      type="submit"
                      disabled={commentBusy || !commentBody.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
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
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center mb-8">
                <LogIn className="h-6 w-6 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">{copy.loginPrompt}</p>
                <Link
                  href="/login?mode=member"
                  className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                >
                  {copy.loginCta}
                </Link>
              </div>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{copy.noComments}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <article key={comment.id} className="flex gap-4">
                    <Link
                      href={`/member/${comment.member_public_id}`}
                      className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-100 border border-gray-200 overflow-hidden flex items-center justify-center mt-1"
                    >
                      {comment.member_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.member_avatar_url}
                          alt={comment.member_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-gray-500">
                          {comment.member_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/member/${comment.member_public_id}`}
                            className="text-sm font-semibold text-gray-900 hover:underline"
                          >
                            {comment.member_name}
                          </Link>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString(
                              lang === "tr" ? "tr-TR" : "en-US",
                              { dateStyle: 'medium', timeStyle: 'short' }
                            )}
                          </span>
                        </div>
                        {member && member.public_id !== comment.member_public_id && (
                          <button
                            type="button"
                            onClick={() => void handleReport(comment.id)}
                            disabled={reportingId === comment.id}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50"
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
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {comment.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}