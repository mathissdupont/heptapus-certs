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
            back: "Etkinlik listesine dön",
            loading: "Etkinlik detayları yükleniyor...",
            error: "Etkinlik detayları yüklenemedi.",
            register: "Etkinliğe Kayıt Ol",
            registrationClosed: "Kayıt Kapalı",
            sessions: "Oturumlar",
            customFields: "Kayıtta istenecek ek bilgiler",
            minSessions: "Sertifika için minimum oturum",
            unlisted: "Liste dışı paylaşım",
            noSessions: "Henüz oturum eklenmedi.",
            defaultFields: "Bu etkinlikte şimdilik standart ad ve e-posta alanları kullanılıyor.",
            defaultHelper: "Kayıt sırasında doldurulacak ek alan.",
            required: "Zorunlu",
            commentsTitle: "Yorumlar",
            commentsSubtitle: "Topluluğun etkinlik hakkındaki görüşlerini inceleyin veya siz de yorum bırakın.",
            noComments: "Henüz yorum yok. İlk yorumu sen bırak.",
            commentPlaceholder: "Bu etkinlik hakkında ne düşünüyorsun?",
            commentSubmit: "Yorum Gönder",
            loginPrompt: "Yorum yazmak için üye hesabınla giriş yap.",
            loginCta: "Üye Girişi",
            report: "Bildir",
            reportBusy: "Gönderiliyor",
            writeError: "Yorum gönderilemedi.",
            sessionLabel: "Oturum",
            fieldType: "Alan tipi",
            postingAs: "olarak yorum yapıyorsunuz.",
          }
        : {
            back: "Back to events",
            loading: "Loading event details...",
            error: "Failed to load event details.",
            register: "Register for Event",
            registrationClosed: "Registration Closed",
            sessions: "Sessions",
            customFields: "Additional registration fields",
            minSessions: "Minimum sessions for certificate",
            unlisted: "Unlisted share",
            noSessions: "No session has been added yet.",
            defaultFields: "This event currently uses the standard name and email fields only.",
            defaultHelper: "Additional field collected during registration.",
            required: "Required",
            commentsTitle: "Comments",
            commentsSubtitle: "Read what the community thinks about this event or leave your own note.",
            noComments: "There are no comments yet. Be the first to post.",
            commentPlaceholder: "What do you think about this event?",
            commentSubmit: "Post Comment",
            loginPrompt: "Sign in with your member account to write a comment.",
            loginCta: "Member Login",
            report: "Report",
            reportBusy: "Sending",
            writeError: "Failed to submit comment.",
            sessionLabel: "Session",
            fieldType: "Field type",
            postingAs: "posting as.",
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
    return <div className="card p-10 text-center text-sm text-slate-500">{copy.loading}</div>;
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
        <div className="error-banner">{error || copy.error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </Link>

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
        <div className="h-56 bg-slate-100">
          {event.event_banner_url ? (
            <img src={event.event_banner_url} alt={event.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(59,130,246,0.08))] text-3xl font-black text-slate-800">
              {event.name}
            </div>
          )}
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {event.visibility === "unlisted" ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {copy.unlisted}
                  </span>
                ) : null}
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {copy.minSessions}: {event.min_sessions_required}
                </span>
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{event.name}</h1>
              {event.organization_public_id && event.organization_name ? (
                <Link
                  href={`/organizations/${event.organization_public_id}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {event.organization_logo ? (
                    <img src={event.organization_logo} alt={event.organization_name} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {event.organization_name}
                </Link>
              ) : null}
              {event.event_description ? (
                <div
                  className="rich-text-content mt-4 max-w-3xl text-sm text-slate-600 sm:text-base"
                  dangerouslySetInnerHTML={{ __html: event.event_description }}
                />
              ) : null}
            </div>
            {event.registration_closed ? (
              <span className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-500">
                {copy.registrationClosed}
              </span>
            ) : (
              <Link href={`/events/${event.public_id}/register`} className="btn-primary inline-flex justify-center">
                {copy.register}
              </Link>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-900">
                <CalendarDays className="h-4 w-4 text-brand-500" />
                {formatDate(event.event_date, lang)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-900">
                <MapPin className="h-4 w-4 text-brand-500" />
                {event.event_location || "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="h-4 w-4 text-brand-500" />
                {event.sessions.length} {copy.sessions.toLowerCase()}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-6">
          <h2 className="text-2xl font-bold text-slate-950">{copy.sessions}</h2>
          <div className="mt-5 space-y-4">
            {event.sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                {copy.noSessions}
              </div>
            ) : (
              event.sessions.map((session, index) => (
                <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {copy.sessionLabel} {index + 1}
                  </div>
                  <div className="mt-2 text-lg font-bold text-slate-900">{session.name}</div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-brand-500" />
                      {formatDate(session.session_date, lang)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-brand-500" />
                      {session.session_start || "-"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand-500" />
                      {session.session_location || "-"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-2xl font-bold text-slate-950">{copy.customFields}</h2>
          <div className="mt-5 space-y-3">
            {event.registration_fields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                {copy.defaultFields}
              </div>
            ) : (
              event.registration_fields.map((field) => (
                <div key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{field.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{field.helper_text || copy.defaultHelper}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                        {copy.fieldType}: {field.type}
                      </span>
                      {field.required ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-600">
                          {copy.required}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-slate-950">{copy.commentsTitle}</h2>
          <p className="text-sm text-slate-500">{copy.commentsSubtitle}</p>
        </div>

        {error ? (
          <div className="error-banner mt-5">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {member ? (
            <form className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900" onSubmit={handleCommentSubmit}>
              <textarea
                value={commentBody}
                onChange={(eventArg) => setCommentBody(eventArg.target.value)}
                rows={3}
                placeholder={copy.commentPlaceholder}
                className="w-full resize-none border-none bg-transparent p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
              <div className="mt-2 flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-slate-50/50 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-400">
                  {member.display_name || member.email} {copy.postingAs}
                </div>
                <button type="submit" disabled={commentBusy || !commentBody.trim()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
                  {commentBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {copy.commentSubmit}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <MessageSquare className="mb-4 h-8 w-8 text-slate-300" />
              <p className="max-w-md text-sm text-slate-500">{copy.loginPrompt}</p>
              <Link href="/login?mode=member" className="btn-secondary mt-4 inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {copy.loginCta}
              </Link>
            </div>
          )}

          {comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              {copy.noComments}
            </div>
          ) : (
            comments.map((comment) => (
              <article key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Link href={`/members/${comment.member_public_id}`} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {comment.member_avatar_url ? <img src={comment.member_avatar_url} alt={comment.member_name} className="h-full w-full object-cover" /> : <MessageSquare className="h-4 w-4 text-slate-300" />}
                    </Link>
                    <div>
                    <Link href={`/members/${comment.member_public_id}`} className="text-sm font-semibold text-slate-900 transition hover:text-slate-600">{comment.member_name}</Link>
                    <div className="mt-1 text-xs text-slate-400">
                      {new Date(comment.created_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}
                    </div>
                    </div>
                  </div>
                  {member && member.public_id !== comment.member_public_id ? (
                    <button
                      type="button"
                      onClick={() => void handleReport(comment.id)}
                      disabled={reportingId === comment.id}
                      className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                    >
                      {reportingId === comment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                      {reportingId === comment.id ? copy.reportBusy : copy.report}
                    </button>
                  ) : null}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{comment.body}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
