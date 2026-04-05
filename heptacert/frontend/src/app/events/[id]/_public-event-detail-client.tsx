"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  Users,
  Flag,
  FileText,
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

const reveal = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

export default function PublicEventDetailClient() {
  const params = useParams();
  const rawEventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const eventId = Number(rawEventId);
  const { lang } = useI18n();

  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [comments, setComments] = useState<PublicEventComment[]>([]);
  const [member, setMember] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [reportingId, setReportingId] = useState<number | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    back: "Etkinliklere Dön",
    loading: "Etkinlik detayları yükleniyor...",
    error: "Etkinlik detayları yüklenemedi.",
    register: "Etkinliğe Kayıt Ol",
    sessions: "Oturum Programı",
    customFields: "Kayıt Gereksinimleri",
    minSessions: "Minimum Oturum",
    unlisted: "Gizli Etkinlik",
    noSessions: "Bu etkinlik için henüz oturum planı eklenmemiş.",
    defaultFields: "Sadece temel iletişim bilgileri (Ad, E-posta) istenmektedir.",
    defaultHelper: "Kayıt sırasında doldurulacak ek alan.",
    required: "Zorunlu",
    commentsTitle: "Tartışma ve Yorumlar",
    commentsSubtitle: "Topluluğun etkinlik hakkındaki fikirlerine katılın.",
    noComments: "Henüz yorum yok. İlk yorumu sen bırak!",
    commentPlaceholder: "Bu etkinlik hakkında ne düşünüyorsun?",
    commentSubmit: "Yorum Gönder",
    loginPrompt: "Yorum yazmak ve tartışmaya katılmak için giriş yapmalısınız.",
    loginCta: "Sistem Girişi",
    report: "Bildir",
    reportBusy: "İşleniyor",
    writeError: "Yorum gönderilirken bir hata oluştu.",
    sessionLabel: "Oturum",
    fieldType: "Tip",
    about: "Etkinlik Hakkında",
    timeInfo: "Tarih ve Konum"
  } : {
    back: "Back to Events",
    loading: "Loading event details...",
    error: "Failed to load event details.",
    register: "Register for Event",
    sessions: "Event Schedule",
    customFields: "Registration Requirements",
    minSessions: "Min. Sessions",
    unlisted: "Unlisted Event",
    noSessions: "No sessions have been scheduled for this event yet.",
    defaultFields: "Only basic contact info (Name, Email) is required.",
    defaultHelper: "Additional field collected during registration.",
    required: "Required",
    commentsTitle: "Discussion",
    commentsSubtitle: "Join the community conversation about this event.",
    noComments: "No comments yet. Be the first to start the discussion!",
    commentPlaceholder: "What are your thoughts on this event?",
    commentSubmit: "Post Comment",
    loginPrompt: "You must be signed in to join the discussion.",
    loginCta: "Member Login",
    report: "Report",
    reportBusy: "Processing",
    writeError: "Failed to submit your comment.",
    sessionLabel: "Session",
    fieldType: "Type",
    about: "About the Event",
    timeInfo: "Date & Location"
  }, [lang]);

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(eventId) || eventId <= 0) {
      setEvent(null);
      setComments([]);
      setMember(null);
      setError(copy.error);
      setLoading(false);
      return () => { active = false; };
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

    return () => { active = false; };
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

  // --- SKELETON LOADER (Kurumsal Yükleme Ekranı) ---
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 pb-12 pt-6">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200"></div>
        <div className="h-[280px] w-full animate-pulse rounded-[2rem] bg-slate-200"></div>
        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="h-10 w-3/4 animate-pulse rounded-lg bg-slate-200"></div>
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200"></div>
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200"></div>
              <div className="h-4 w-4/6 animate-pulse rounded bg-slate-200"></div>
            </div>
          </div>
          <div className="h-[300px] w-full animate-pulse rounded-3xl bg-slate-200"></div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pt-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <ShieldAlert className="h-8 w-8 text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{copy.error}</h2>
        <p className="text-slate-500">{error}</p>
        <Link href="/events" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" /> {copy.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10 selection:bg-slate-200">

      {/* BREADCRUMB */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
      </motion.div>

      {/* HERO BANNER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mb-12 aspect-[21/9] w-full overflow-hidden rounded-[2rem] bg-slate-900 shadow-sm sm:aspect-[4/1]">
        {event.event_banner_url ? (
          <img src={event.event_banner_url} alt={event.name} className="h-full w-full object-cover opacity-90" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
            <ShieldAlert className="h-16 w-16 text-slate-700/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {event.visibility === "unlisted" && (
              <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm">
                {copy.unlisted}
              </span>
            )}
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-emerald-100 shadow-sm">
              <CheckCircle2 className="inline mr-1.5 h-3.5 w-3.5" />
              {copy.minSessions}: {event.min_sessions_required}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">{event.name}</h1>
        </div>
      </motion.div>

      {/* MAIN CONTENT & SIDEBAR */}
      <div className="grid gap-12 lg:grid-cols-[1fr_360px] lg:items-start">

        {/* LEFT COLUMN (Details, Sessions, Comments) */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-12">

          {/* About */}
          {event.event_description && (
            <motion.section variants={reveal}>
              <h2 className="text-xl font-bold text-slate-900 mb-4">{copy.about}</h2>
              <p className="text-base leading-relaxed text-slate-600 whitespace-pre-wrap">{event.event_description}</p>
            </motion.section>
          )}

          <hr className="border-slate-100" />

          {/* Sessions Timeline */}
          <motion.section variants={reveal}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Clock3 className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{copy.sessions}</h2>
            </div>

            <div className="space-y-4">
              {event.sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                  {copy.noSessions}
                </div>
              ) : (
                <div className="relative pl-4 sm:pl-6 border-l-2 border-slate-100 space-y-8">
                  {event.sessions.map((session, index) => (
                    <div key={session.id} className="relative">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[21px] sm:-left-[29px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-900 shadow-sm"></div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {copy.sessionLabel} {index + 1}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{session.name}</h3>
                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {formatDate(session.session_date, lang)}
                          </span>
                          {session.session_start && (
                            <span className="flex items-center gap-1.5">
                              <Clock3 className="h-4 w-4 text-slate-400" />
                              {session.session_start}
                            </span>
                          )}
                          {session.session_location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {session.session_location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          <hr className="border-slate-100" />

          {/* Comments Section */}
          <motion.section variants={reveal}>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">{copy.commentsTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">{copy.commentsSubtitle}</p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-600">
                <ShieldAlert className="h-5 w-5" /> {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Comment Input Box */}
              {member ? (
                <form onSubmit={handleCommentSubmit} className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all">
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={3}
                    placeholder={copy.commentPlaceholder}
                    className="w-full resize-none border-none bg-transparent p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2 mt-2 rounded-b-xl">
                    <div className="text-[11px] font-semibold text-slate-400">
                      {member.name} {lang === "tr" ? "olarak yorum yapıyorsunuz." : "posting as."}
                    </div>
                    <button type="submit" disabled={commentBusy || !commentBody.trim()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
                      {commentBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {copy.commentSubmit}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 px-6 text-center">
                  <MessageSquare className="mb-4 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">{copy.loginPrompt}</p>
                  <Link href="/login?mode=member" className="mt-4 inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    {copy.loginCta}
                  </Link>
                </div>
              )}

              {/* Comment List */}
              <div className="mt-10 space-y-5">
                {comments.length === 0 ? (
                  <div className="py-10 text-center text-sm font-medium text-slate-400">
                    {copy.noComments}
                  </div>
                ) : (
                  comments.map((comment) => (
                    <article key={comment.id} className="group relative flex gap-4">
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 ring-1 ring-slate-200/50">
                        {comment.member_name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{comment.member_name}</h4>
                            <span className="text-xs font-medium text-slate-400">
                              {new Date(comment.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          {member && member.id !== comment.member_id && (
                            <button
                              type="button"
                              onClick={() => void handleReport(comment.id)}
                              disabled={reportingId === comment.id}
                              className="invisible flex items-center gap-1.5 rounded-lg text-[11px] font-bold text-slate-400 transition-all hover:text-rose-600 group-hover:visible disabled:opacity-50"
                            >
                              {reportingId === comment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Flag className="h-3 w-3" />}
                              {copy.report}
                            </button>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{comment.body}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </motion.section>
        </motion.div>

        {/* RIGHT COLUMN (Sticky Sidebar) */}
        <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="sticky top-24 space-y-6">

          {/* Quick Info & Register Card */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
            <div className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-5">{copy.timeInfo}</h3>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{formatDate(event.event_date, lang)}</p>
                    <p className="text-xs font-medium text-slate-500">{event.sessions.length} {copy.sessions.toLowerCase()}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{event.event_location || "-"}</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 p-6 border-t border-slate-100">
              <Link href={`/events/${event.id}/register`} className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md">
                {copy.register}
              </Link>
            </div>
          </div>

          {/* Registration Fields Info */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
              <FileText className="h-4 w-4 text-slate-400" />
              {copy.customFields}
            </h3>

            <div className="space-y-3">
              {event.registration_fields.length === 0 ? (
                <p className="text-xs leading-relaxed text-slate-500">{copy.defaultFields}</p>
              ) : (
                <ul className="space-y-3">
                  {event.registration_fields.map((field) => (
                    <li key={field.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{field.label}</p>
                        <p className="text-[10px] font-medium text-slate-400">{field.type}</p>
                      </div>
                      {field.required && (
                        <span className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                          {copy.required}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </motion.aside>

      </div>
    </div>
  );
}