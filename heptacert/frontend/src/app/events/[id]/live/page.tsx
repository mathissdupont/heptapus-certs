"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n, useT } from "@/lib/i18n";
import {
  getPublicMemberToken,
  getPublicEventDetail,
  listLiveQuestions,
  askLiveQuestion,
  upvoteLiveQuestion,
  listLivePolls,
  voteLivePoll,
  type LiveQuestion,
  type LivePoll,
} from "@/lib/api";
import { ArrowLeft, Loader2, MessageCircleQuestion, ChevronUp, BarChart3, CheckCircle2, Radio } from "lucide-react";

const POLL_MS = 4000;

export default function LiveEngagementPage() {
  const params = useParams();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const eventId = rawId ? String(rawId) : "";
  const { lang } = useI18n();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [polls, setPolls] = useState<LivePoll[]>([]);
  const [text, setText] = useState("");
  const [asking, setAsking] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const [qs, ps] = await Promise.all([
        listLiveQuestions(eventId).catch(() => questions),
        listLivePolls(eventId).catch(() => polls),
      ]);
      setQuestions(qs);
      setPolls(ps);
    } catch {
      /* keep last good state during transient errors */
    }
  }

  async function init() {
    const isIn = Boolean(getPublicMemberToken());
    setLoggedIn(isIn);
    try {
      const ev = await getPublicEventDetail(eventId);
      setEnabled(Boolean(ev.live_engagement_enabled));
      if (ev.live_engagement_enabled && isIn) {
        await refresh();
      }
    } catch (e: any) {
      setError(e?.message || t("live_action_failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (eventId) init(); /* eslint-disable-next-line */ }, [eventId]);

  // Short-polling for near real-time updates while the tab is visible.
  useEffect(() => {
    if (!enabled || !loggedIn) return;
    timer.current = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line
  }, [enabled, loggedIn]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setAsking(true); setError(null);
    try {
      const q = await askLiveQuestion(eventId, text.trim());
      setText("");
      setQuestions((prev) => [q, ...prev.filter((x) => x.id !== q.id)]);
    } catch (e: any) { setError(e?.message || t("live_action_failed")); } finally { setAsking(false); }
  }

  async function upvote(qid: number) {
    // optimistic
    setQuestions((prev) => prev.map((q) => q.id === qid ? { ...q, my_vote: !q.my_vote, upvotes: q.upvotes + (q.my_vote ? -1 : 1) } : q));
    try { const updated = await upvoteLiveQuestion(eventId, qid); setQuestions((prev) => prev.map((q) => q.id === qid ? updated : q)); }
    catch (e: any) { setError(e?.message || t("live_action_failed")); await refresh(); }
  }

  async function vote(pid: number, optionId: string) {
    try { const updated = await voteLivePoll(eventId, pid, optionId); setPolls((prev) => prev.map((p) => p.id === pid ? updated : p)); }
    catch (e: any) { setError(e?.message || t("live_action_failed")); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  if (!enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-500">
        <Radio className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p>{t("live_disabled")}</p>
        <Link href={`/events/${eventId}`} className="mt-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> {lang === "tr" ? "Etkinliğe dön" : "Back to event"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link href={`/events/${eventId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> {lang === "tr" ? "Etkinliğe dön" : "Back to event"}
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Radio className="h-6 w-6 text-rose-500" /> {t("live_title")}
      </h1>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {!loggedIn ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">{t("live_login_required")}</p>
          <Link href={`/login?mode=member&next=${encodeURIComponent(`/events/${eventId}/live`)}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            {t("live_login_cta")}
          </Link>
        </div>
      ) : (
        <>
          {/* Polls */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><BarChart3 className="h-5 w-5 text-gray-400" /> {t("live_polls")}</h2>
            {polls.filter((p) => p.status !== "draft").length === 0 ? (
              <p className="text-sm text-gray-500">{t("live_no_polls")}</p>
            ) : (
              polls.filter((p) => p.status !== "draft").map((p) => {
                const voted = Boolean(p.my_vote);
                const showResults = voted || p.status === "closed";
                return (
                  <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900">{p.prompt}</p>
                      <span className={`rounded-full px-2 py-0.5 text-11 font-semibold ${p.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.status === "open" ? t("live_poll_open") : t("live_poll_closed")}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {p.options.map((o) => {
                        const pct = p.total_votes > 0 ? Math.round((o.votes / p.total_votes) * 100) : 0;
                        const mine = p.my_vote === o.id;
                        return showResults ? (
                          <div key={o.id} className="relative overflow-hidden rounded-lg border border-gray-200">
                            <div className="absolute inset-y-0 left-0 bg-rose-100" style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center justify-between px-3 py-1.5 text-sm">
                              <span className={mine ? "font-semibold text-gray-900" : "text-gray-700"}>{o.label} {mine && "✓"}</span>
                              <span className="text-gray-500">{pct}%</span>
                            </div>
                          </div>
                        ) : (
                          <button key={o.id} onClick={() => vote(p.id, o.id)} disabled={p.status !== "open"} className="block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-left text-sm text-gray-700 hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50">
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-11 text-gray-400">{t("live_total_votes", { count: p.total_votes })}{voted ? ` · ${t("live_voted")}` : ""}</p>
                  </div>
                );
              })
            )}
          </section>

          {/* Q&A */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><MessageCircleQuestion className="h-5 w-5 text-gray-400" /> {t("live_qa")}</h2>
            <form onSubmit={ask} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("live_ask_placeholder")} maxLength={1000} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <button type="submit" disabled={asking || !text.trim()} className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
                {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : t("live_ask")}
              </button>
            </form>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">{t("live_no_questions")}</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className={`flex items-start gap-3 rounded-xl border p-3 ${q.status === "answered" ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-white"}`}>
                    <button onClick={() => upvote(q.id)} className={`flex shrink-0 flex-col items-center rounded-lg border px-2 py-1 ${q.my_vote ? "border-rose-300 bg-rose-50 text-rose-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                      <ChevronUp className="h-4 w-4" />
                      <span className="text-xs font-bold">{q.upvotes}</span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">{q.text}</p>
                      <p className="mt-0.5 text-11 text-gray-400">
                        {q.author_name && `${t("live_by")}: ${q.author_name}`}
                        {q.status === "answered" && <span className="ml-2 inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {t("live_answered")}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
