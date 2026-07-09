"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import { PlanGateCard, isPlanGateError } from "@/lib/useSubscription";
import { useT } from "@/lib/i18n";
import {
  apiFetch,
  moderatorListQuestions,
  moderateQuestion,
  moderatorListPolls,
  createLivePoll,
  setLivePollStatus,
  deleteLivePoll,
  type LiveQuestion,
  type LivePoll,
} from "@/lib/api";
import {
  Loader2, Radio, MessageCircleQuestion, BarChart3, CheckCircle2, EyeOff, Eye,
  Plus, Trash2, ChevronUp, Play, Square,
} from "lucide-react";

const POLL_MS = 5000;

export default function LiveModeratorPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [planOk, setPlanOk] = useState<boolean | null>(null);
  const [planGateMessage, setPlanGateMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");

  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [polls, setPolls] = useState<LivePoll[]>([]);
  const [showPollForm, setShowPollForm] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const [qs, ps] = await Promise.all([
        moderatorListQuestions(eventId),
        moderatorListPolls(eventId),
      ]);
      setQuestions(qs);
      setPolls(ps);
    } catch (e: any) {
      if (e?.status === 403 && isPlanGateError(e?.message)) { setPlanOk(false); setPlanGateMessage(e.message); }
    }
  }

  async function init() {
    try {
      await apiFetch(`/admin/events/${eventId}`).then((r) => r.json()).then((ev) => setEventName(ev.name)).catch(() => {});
      await refresh();
      setPlanOk((v) => (v === false ? false : true));
    } catch (e: any) {
      if (e?.status === 403 && isPlanGateError(e?.message)) { setPlanOk(false); setPlanGateMessage(e.message); }
      else setError(e?.message || t("live_action_failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (eventId) init(); /* eslint-disable-next-line */ }, [eventId]);
  useEffect(() => {
    if (planOk !== true) return;
    timer.current = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line
  }, [planOk]);

  async function moderate(qid: number, action: "answered" | "hidden" | "visible") {
    try { const u = await moderateQuestion(eventId, qid, action); setQuestions((prev) => prev.map((q) => q.id === qid ? u : q)); }
    catch (e: any) { setError(e?.message || t("live_action_failed")); }
  }
  async function pollStatus(pid: number, status: "open" | "closed") {
    try { const u = await setLivePollStatus(eventId, pid, status); setPolls((prev) => prev.map((p) => p.id === pid ? u : p)); }
    catch (e: any) { setError(e?.message || t("live_action_failed")); }
  }
  async function removePoll(pid: number) {
    try { await deleteLivePoll(eventId, pid); setPolls((prev) => prev.filter((p) => p.id !== pid)); }
    catch (e: any) { setError(e?.message || t("live_action_failed")); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-surface-400" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <EventAdminNav eventId={eventId} eventName={eventName} active="live" className="mb-2" />
      {planOk === false ? (
        <PlanGateCard feature="Canlı Katılım (Q&A + Poll)" serverMessage={planGateMessage} />
      ) : (
        <>
          <PageHeader title={t("live_title")} subtitle={eventName} actions={
            <button onClick={() => setShowPollForm((v) => !v)} className="btn-primary text-xs"><Plus className="h-3.5 w-3.5" /> {t("live_new_poll")}</button>
          } />
          {error && <div className="error-banner">{error}</div>}

          {showPollForm && <PollForm eventId={eventId} onCreated={(p) => { setPolls((prev) => [p, ...prev]); setShowPollForm(false); }} onError={setError} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Polls */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-surface-900"><BarChart3 className="h-4 w-4 text-surface-400" /> {t("live_polls")}</h2>
              {polls.length === 0 ? <p className="text-sm text-surface-500">{t("live_no_polls")}</p> : polls.map((p) => (
                <div key={p.id} className="card p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold text-surface-900">{p.prompt}</p>
                    <span className={`rounded-full px-2 py-0.5 text-11 font-semibold ${p.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 text-surface-500"}`}>
                      {p.status === "open" ? t("live_poll_open") : t("live_poll_closed")}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {p.options.map((o) => {
                      const pct = p.total_votes > 0 ? Math.round((o.votes / p.total_votes) * 100) : 0;
                      return (
                        <div key={o.id} className="relative overflow-hidden rounded-lg border border-surface-200">
                          <div className="absolute inset-y-0 left-0 bg-rose-100" style={{ width: `${pct}%` }} />
                          <div className="relative flex items-center justify-between px-3 py-1.5 text-sm">
                            <span className="text-surface-700">{o.label}</span>
                            <span className="text-surface-500">{o.votes} · {pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-11 text-surface-400">{t("live_total_votes", { count: p.total_votes })}</span>
                    <div className="flex gap-1">
                      {p.status === "open"
                        ? <button onClick={() => pollStatus(p.id, "closed")} className="inline-flex items-center gap-1 rounded-lg border border-surface-200 px-2 py-1 text-11 font-semibold text-surface-600 hover:bg-surface-50"><Square className="h-3 w-3" /> {t("live_close_poll")}</button>
                        : <button onClick={() => pollStatus(p.id, "open")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-11 font-semibold text-emerald-700 hover:bg-emerald-50"><Play className="h-3 w-3" /> {t("live_open_poll")}</button>}
                      <button onClick={() => removePoll(p.id)} className="rounded-lg p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Questions moderation */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-surface-900"><MessageCircleQuestion className="h-4 w-4 text-surface-400" /> {t("live_qa")}</h2>
              {questions.length === 0 ? <p className="text-sm text-surface-500">{t("live_no_questions")}</p> : questions.map((q) => (
                <div key={q.id} className={`card p-3 ${q.status === "hidden" ? "opacity-60" : ""} ${q.status === "answered" ? "border-emerald-200" : ""}`}>
                  <div className="flex items-start gap-2">
                    <span className="flex shrink-0 flex-col items-center rounded-lg border border-surface-200 px-2 py-1 text-surface-500">
                      <ChevronUp className="h-3.5 w-3.5" /><span className="text-11 font-bold">{q.upvotes}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-surface-800">{q.text}</p>
                      <p className="text-11 text-surface-400">
                        {q.author_name}
                        {q.status === "answered" && <span className="ml-2 text-emerald-600">· {t("live_status_answered")}</span>}
                        {q.status === "hidden" && <span className="ml-2 text-surface-400">· {t("live_status_hidden")}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    {q.status !== "answered" && <button onClick={() => moderate(q.id, "answered")} title={t("live_mark_answered")} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button>}
                    {q.status !== "hidden"
                      ? <button onClick={() => moderate(q.id, "hidden")} title={t("live_hide")} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100"><EyeOff className="h-4 w-4" /></button>
                      : <button onClick={() => moderate(q.id, "visible")} title={t("live_restore")} className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-100"><Eye className="h-4 w-4" /></button>}
                  </div>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function PollForm({ eventId, onCreated, onError }: { eventId: number; onCreated: (p: LivePoll) => void; onError: (m: string) => void }) {
  const t = useT();
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  async function create() {
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!prompt.trim() || clean.length < 2) return;
    setBusy(true);
    try { onCreated(await createLivePoll(eventId, { prompt: prompt.trim(), options: clean })); }
    catch (e: any) { onError(e?.message || t("live_action_failed")); } finally { setBusy(false); }
  }

  return (
    <div className="card space-y-3 p-5">
      <h2 className="font-semibold text-surface-900">{t("live_new_poll")}</h2>
      <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t("live_poll_prompt")} className="input-field" />
      <div className="space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={o} onChange={(e) => setOptions((prev) => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`${t("live_poll_option")} ${i + 1}`} className="input-field flex-1" />
            {options.length > 2 && <button onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))} className="p-2 text-surface-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
        {options.length < 10 && <button onClick={() => setOptions((prev) => [...prev, ""])} className="btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> {t("live_add_option")}</button>}
      </div>
      <div className="flex justify-end">
        <button onClick={create} disabled={busy} className="btn-primary text-xs disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />} {t("live_create_poll")}</button>
      </div>
    </div>
  );
}
