"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import { PlanGateCard, isPlanGateError } from "@/lib/useSubscription";
import { useI18n, useT } from "@/lib/i18n";
import {
  apiFetch,
  getCfpConfig,
  setCfpConfig,
  listCfpReviewers,
  listCfpSubmissionsAdmin,
  assignCfpReviewers,
  submitCfpReview,
  decideCfpSubmission,
  type CfpConfig,
  type CfpCriterion,
  type CfpReviewer,
  type CfpSubmission,
} from "@/lib/api";
import {
  Loader2, Plus, Trash2, Settings2, Check, X, Star, CalendarPlus,
  ChevronDown, ChevronUp, Megaphone, Users,
} from "lucide-react";

const STATUS_FILTERS = ["all", "submitted", "under_review", "accepted", "rejected", "withdrawn"] as const;

function slugifyId(label: string): string {
  const base = (label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `c_${Math.abs(hashCode(label))}`;
}
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return h;
}

export default function CfpAdminPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const { lang } = useI18n();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [planOk, setPlanOk] = useState<boolean | null>(null);
  const [planGateMessage, setPlanGateMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [meId, setMeId] = useState<number | null>(null);

  const [submissions, setSubmissions] = useState<CfpSubmission[]>([]);
  const [config, setConfig] = useState<CfpConfig>({ criteria: [] });
  const [reviewers, setReviewers] = useState<CfpReviewer[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const [showSettings, setShowSettings] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    try {
      const [subs, cfg, revs, meRes] = await Promise.all([
        listCfpSubmissionsAdmin(eventId, filter),
        getCfpConfig(eventId),
        listCfpReviewers(eventId).catch(() => []),
        apiFetch(`/me`).then((r) => r.json()).catch(() => null),
        apiFetch(`/admin/events/${eventId}`).then((r) => r.json()).then((ev) => setEventName(ev.name)).catch(() => {}),
      ]);
      setPlanOk(true);
      setSubmissions(subs);
      setConfig(cfg);
      setReviewers(revs);
      setMeId(meRes?.id ?? null);
    } catch (e: any) {
      if (e?.status === 403 && isPlanGateError(e?.message)) {
        setPlanOk(false);
        setPlanGateMessage(e.message);
      } else {
        setError(e?.message || t("cfp_action_failed"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (eventId) loadAll(); /* eslint-disable-next-line */ }, [eventId, filter]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-surface-400" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <EventAdminNav eventId={eventId} eventName={eventName} active="cfp" className="mb-2" />

      {planOk === false ? (
        <PlanGateCard feature="Bildiri Çağrısı (CFP)" serverMessage={planGateMessage} />
      ) : (
        <>
          <PageHeader
            title={t("cfp_admin_title")}
            subtitle={eventName}
            actions={
              <button onClick={() => setShowSettings((v) => !v)} className="btn-secondary text-xs">
                <Settings2 className="h-3.5 w-3.5" /> {t("cfp_settings_heading")}
              </button>
            }
          />

          {error && <div className="error-banner">{error}</div>}

          {showSettings && (
            <CfpSettingsPanel
              eventId={eventId}
              config={config}
              onSaved={(cfg) => { setConfig(cfg); }}
            />
          )}

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === s ? "border-surface-900 bg-surface-900 text-white" : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50"
                }`}
              >
                {s === "all" ? t("cfp_filter_all") : t(`cfp_status_${s}` as any)}
              </button>
            ))}
          </div>

          {submissions.length === 0 ? (
            <div className="card border-dashed p-12 text-center text-surface-500">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">{t("cfp_no_proposals")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  eventId={eventId}
                  sub={sub}
                  criteria={config.criteria}
                  reviewers={reviewers}
                  meId={meId}
                  expanded={expandedId === sub.id}
                  onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                  busy={busy}
                  setBusy={setBusy}
                  onUpdated={(updated) => setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
                  onError={(m) => setError(m)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const tone: Record<string, string> = {
    submitted: "bg-sky-50 text-sky-700 border-sky-200",
    under_review: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    withdrawn: "bg-surface-100 text-surface-500 border-surface-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-11 font-semibold ${tone[status] || tone.withdrawn}`}>
      {t(`cfp_status_${status}` as any)}
    </span>
  );
}

function CfpSettingsPanel({ eventId, config, onSaved }: { eventId: number; config: CfpConfig; onSaved: (c: CfpConfig) => void }) {
  const t = useT();
  const [opensAt, setOpensAt] = useState(config.opens_at ? config.opens_at.slice(0, 16) : "");
  const [closesAt, setClosesAt] = useState(config.closes_at ? config.closes_at.slice(0, 16) : "");
  const [maxPer, setMaxPer] = useState(config.max_per_member != null ? String(config.max_per_member) : "");
  const [instructions, setInstructions] = useState(config.instructions || "");
  const [criteria, setCriteria] = useState<CfpCriterion[]>(config.criteria || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function addCriterion() {
    setCriteria((prev) => [...prev, { id: `c_${prev.length + 1}`, label: "", max: 5 }]);
  }
  function updateCriterion(idx: number, patch: Partial<CfpCriterion>) {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function removeCriterion(idx: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true); setMsg(null);
    // Derive stable ids from labels; ensure uniqueness.
    const seen = new Set<string>();
    const normalized = criteria
      .filter((c) => c.label.trim())
      .map((c) => {
        let id = (c.id && c.id.trim()) || slugifyId(c.label);
        while (seen.has(id)) id = `${id}_x`;
        seen.add(id);
        return { id, label: c.label.trim(), max: Math.max(1, Math.min(c.max || 5, 100)) };
      });
    try {
      const saved = await setCfpConfig(eventId, {
        opens_at: opensAt ? new Date(opensAt).toISOString() : null,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        instructions: instructions.trim() || null,
        max_per_member: maxPer.trim() ? Math.max(1, parseInt(maxPer, 10) || 1) : null,
        criteria: normalized,
      });
      setCriteria(saved.criteria);
      onSaved(saved);
      setMsg(t("cfp_saved"));
    } catch (e: any) {
      setMsg(e?.message || t("cfp_action_failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-semibold text-surface-900">{t("cfp_settings_heading")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-surface-600">{t("cfp_opens_at")}</span>
          <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-surface-600">{t("cfp_closes_at")}</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-surface-600">{t("cfp_max_per_member")}</span>
          <input type="number" min={1} value={maxPer} onChange={(e) => setMaxPer(e.target.value)} className="input-field" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-surface-600">{t("cfp_instructions_title")}</span>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="input-field resize-y" />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-surface-700">{t("cfp_criteria")}</span>
          <button onClick={addCriterion} className="btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> {t("cfp_add_criterion")}</button>
        </div>
        <div className="space-y-2">
          {criteria.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={c.label}
                onChange={(e) => updateCriterion(idx, { label: e.target.value })}
                placeholder={t("cfp_criterion_label")}
                className="input-field flex-1"
              />
              <input
                type="number" min={1} max={100}
                value={c.max}
                onChange={(e) => updateCriterion(idx, { max: parseInt(e.target.value, 10) || 1 })}
                title={t("cfp_criterion_max")}
                className="input-field w-24"
              />
              <button onClick={() => removeCriterion(idx)} className="p-2 rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-xs text-surface-500">{msg}</span>}
        <button onClick={save} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {t("cfp_save_settings")}
        </button>
      </div>
    </div>
  );
}

function SubmissionCard({
  eventId, sub, criteria, reviewers, meId, expanded, onToggle, busy, setBusy, onUpdated, onError,
}: {
  eventId: number;
  sub: CfpSubmission;
  criteria: CfpCriterion[];
  reviewers: CfpReviewer[];
  meId: number | null;
  expanded: boolean;
  onToggle: () => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onUpdated: (s: CfpSubmission) => void;
  onError: (m: string) => void;
}) {
  const t = useT();
  const myReview = useMemo(() => sub.reviews.find((r) => r.reviewer_user_id === meId) || null, [sub.reviews, meId]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [addToAgenda, setAddToAgenda] = useState(false);
  const [sDate, setSDate] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");
  const [sLoc, setSLoc] = useState("");
  const [assignSel, setAssignSel] = useState<number[]>([]);

  useEffect(() => {
    if (expanded) {
      setScores((myReview?.scores as Record<string, number>) || {});
      setComment(myReview?.comment || "");
      setAssignSel(sub.reviews.map((r) => r.reviewer_user_id));
    }
    // eslint-disable-next-line
  }, [expanded]);

  async function saveReview() {
    setBusy(true);
    try {
      const updated = await submitCfpReview(eventId, sub.id, { scores, comment: comment.trim() || undefined });
      onUpdated(updated);
    } catch (e: any) { onError(e?.message || t("cfp_action_failed")); } finally { setBusy(false); }
  }
  async function assign() {
    setBusy(true);
    try {
      const updated = await assignCfpReviewers(eventId, sub.id, assignSel);
      onUpdated(updated);
    } catch (e: any) { onError(e?.message || t("cfp_action_failed")); } finally { setBusy(false); }
  }
  async function decide(decision: "accepted" | "rejected") {
    setBusy(true);
    try {
      const updated = await decideCfpSubmission(eventId, sub.id, {
        decision,
        note: decisionNote.trim() || undefined,
        create_session: decision === "accepted" && addToAgenda,
        session_date: sDate || undefined,
        session_start: sStart || undefined,
        session_end: sEnd || undefined,
        session_location: sLoc || undefined,
      });
      onUpdated(updated);
    } catch (e: any) { onError(e?.message || t("cfp_action_failed")); } finally { setBusy(false); }
  }

  return (
    <div className="card p-4">
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-surface-900">{sub.title}</span>
            <StatusBadge status={sub.status} />
            {sub.session_id != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-11 font-semibold text-emerald-700">
                <CalendarPlus className="h-3 w-3" /> {t("cfp_session_linked")}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-surface-500">
            <span>{sub.speaker_name}</span>
            {sub.track && <span>· {sub.track}</span>}
            {sub.average_score != null && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <Star className="h-3.5 w-3.5" /> {t("cfp_avg_score")}: {sub.average_score}
              </span>
            )}
            <span>{t("cfp_reviews_count", { count: sub.review_count })}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-surface-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-surface-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-5 border-t border-surface-100 pt-4">
          {/* Abstract + bio */}
          <div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-surface-700">{sub.abstract}</p>
            {sub.speaker_bio && (
              <p className="mt-2 text-xs text-surface-500"><span className="font-semibold">{t("cfp_speaker_bio_label")}:</span> {sub.speaker_bio}</p>
            )}
          </div>

          {/* Existing reviews */}
          {sub.reviews.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-surface-700">{t("cfp_reviewers_label")}</p>
              {sub.reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-surface-100 bg-surface-50/50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-surface-700">{r.reviewer_name || `#${r.reviewer_user_id}`}</span>
                    <span className="text-surface-500">
                      {r.status === "submitted" && r.overall_score != null ? `${r.overall_score} / 100` : t(`cfp_status_${r.status === "submitted" ? "submitted" : "under_review"}` as any)}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-surface-500">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {/* My review (rubric) */}
          <div className="rounded-lg border border-surface-200 p-3">
            <p className="mb-2 text-xs font-semibold text-surface-700">{t("cfp_my_review")}</p>
            {criteria.length === 0 ? (
              <p className="text-xs text-surface-400">{t("cfp_no_criteria_hint")}</p>
            ) : (
              <div className="space-y-2">
                {criteria.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-surface-600">{c.label}</span>
                    <input
                      type="number" min={0} max={c.max}
                      value={scores[c.id] ?? ""}
                      onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: Math.max(0, Math.min(parseFloat(e.target.value) || 0, c.max)) }))}
                      className="input-field w-20"
                    />
                    <span className="text-11 text-surface-400">/ {c.max}</span>
                  </div>
                ))}
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder={t("cfp_comment")} className="input-field resize-y" />
                <div className="flex justify-end">
                  <button onClick={saveReview} disabled={busy} className="btn-primary text-xs disabled:opacity-50">
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />} {t("cfp_save_review")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Assign reviewers */}
          {reviewers.length > 0 && (
            <div className="rounded-lg border border-surface-200 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-surface-700"><Users className="h-3.5 w-3.5" /> {t("cfp_assign_reviewers")}</p>
              <div className="flex flex-wrap gap-2">
                {reviewers.map((rev) => {
                  const on = assignSel.includes(rev.user_id);
                  return (
                    <button
                      key={rev.user_id}
                      onClick={() => setAssignSel((prev) => (on ? prev.filter((x) => x !== rev.user_id) : [...prev, rev.user_id]))}
                      className={`rounded-full border px-3 py-1 text-11 font-semibold transition-colors ${on ? "border-surface-900 bg-surface-900 text-white" : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50"}`}
                    >
                      {rev.name || rev.email || `#${rev.user_id}`}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-end">
                <button onClick={assign} disabled={busy} className="btn-secondary text-xs disabled:opacity-50">{t("cfp_assign_reviewers")}</button>
              </div>
            </div>
          )}

          {/* Decision */}
          {sub.status !== "withdrawn" && (
            <div className="rounded-lg border border-surface-200 p-3 space-y-2">
              <textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} rows={2} placeholder={t("cfp_decision_note")} className="input-field resize-y" />
              <label className="flex items-center gap-2 text-xs text-surface-600">
                <input type="checkbox" checked={addToAgenda} onChange={(e) => setAddToAgenda(e.target.checked)} className="h-4 w-4 rounded border-surface-300" />
                {t("cfp_add_to_agenda")}
              </label>
              {addToAgenda && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} className="input-field" />
                  <input type="time" value={sStart} onChange={(e) => setSStart(e.target.value)} className="input-field" />
                  <input type="time" value={sEnd} onChange={(e) => setSEnd(e.target.value)} className="input-field" />
                  <input type="text" value={sLoc} onChange={(e) => setSLoc(e.target.value)} placeholder="Salon A" className="input-field" />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => decide("rejected")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                  <X className="h-3.5 w-3.5" /> {t("cfp_reject")}
                </button>
                <button onClick={() => decide("accepted")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> {t("cfp_accept")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
