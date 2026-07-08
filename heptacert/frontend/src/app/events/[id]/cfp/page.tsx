"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n, useT } from "@/lib/i18n";
import {
  getCfpPublicInfo,
  listMyCfpSubmissions,
  createCfpSubmission,
  updateCfpSubmission,
  withdrawCfpSubmission,
  getPublicMemberToken,
} from "@/lib/api";
import type { CfpPublicInfo, CfpSubmission, CfpSubmissionInput } from "@/lib/api";
import { ArrowLeft, Loader2, Megaphone, Plus, Pencil, Trash2, Check, X } from "lucide-react";

const EMPTY_FORM: CfpSubmissionInput = { title: "", abstract: "", speaker_name: "", speaker_bio: "", track: "" };

export default function CfpSpeakerPage() {
  const params = useParams();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const eventId = rawId ? String(rawId) : "";
  const { lang } = useI18n();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CfpPublicInfo | null>(null);
  const [mine, setMine] = useState<CfpSubmission[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CfpSubmissionInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  function fmt(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
  }

  async function load() {
    const isLoggedIn = Boolean(getPublicMemberToken());
    setLoggedIn(isLoggedIn);
    try {
      const inf = await getCfpPublicInfo(eventId);
      setInfo(inf);
      if (isLoggedIn && inf.cfp_enabled) {
        setMine(await listMyCfpSubmissions(eventId).catch(() => []));
      }
    } catch (e: any) {
      setError(e?.message || t("cfp_action_failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (eventId) load(); /* eslint-disable-next-line */ }, [eventId]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }
  function openEdit(s: CfpSubmission) {
    setEditingId(s.id);
    setForm({ title: s.title, abstract: s.abstract, speaker_name: s.speaker_name, speaker_bio: s.speaker_bio || "", track: s.track || "" });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.abstract.trim() || !form.speaker_name.trim()) return;
    setSaving(true); setError(null);
    try {
      const payload: CfpSubmissionInput = {
        title: form.title.trim(),
        abstract: form.abstract.trim(),
        speaker_name: form.speaker_name.trim(),
        speaker_bio: form.speaker_bio?.trim() || undefined,
        track: form.track?.trim() || undefined,
      };
      const saved = editingId ? await updateCfpSubmission(eventId, editingId, payload) : await createCfpSubmission(eventId, payload);
      setMine((prev) => (editingId ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...prev]));
      setShowForm(false);
    } catch (e: any) {
      setError(e?.message || t("cfp_action_failed"));
    } finally {
      setSaving(false);
    }
  }

  async function withdraw(id: number) {
    setBusyId(id);
    try {
      const updated = await withdrawCfpSubmission(eventId, id);
      setMine((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (e: any) {
      setError(e?.message || t("cfp_action_failed"));
    } finally { setBusyId(null); }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  if (!info || !info.cfp_enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-500">
        <Megaphone className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p>{t("cfp_closed")}</p>
        <Link href={`/events/${eventId}`} className="mt-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> {lang === "tr" ? "Etkinliğe dön" : "Back to event"}
        </Link>
      </div>
    );
  }

  const atLimit = info.max_per_member != null && info.my_submission_count >= info.max_per_member;
  const canSubmit = info.is_open && !atLimit;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link href={`/events/${eventId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> {lang === "tr" ? "Etkinliğe dön" : "Back to event"}
      </Link>

      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Megaphone className="h-6 w-6 text-gray-400" /> {t("cfp_portal_title")}
        </h1>
        {(info.opens_at || info.closes_at) && (
          <p className="text-sm text-gray-500">
            {t("cfp_window")}: {fmt(info.opens_at) || "—"} → {fmt(info.closes_at) || "—"}
          </p>
        )}
        {!info.is_open && <p className="text-sm font-medium text-amber-600">{t("cfp_closed")}</p>}
        {info.max_per_member != null && (
          <p className="text-xs text-gray-400">{t("cfp_max_per_member_hint", { count: info.max_per_member })}</p>
        )}
      </header>

      {info.instructions && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("cfp_instructions_title")}</p>
          <p className="whitespace-pre-line text-sm text-gray-700">{info.instructions}</p>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {!loggedIn ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">{t("cfp_login_required")}</p>
          <Link href={`/login?mode=member&next=${encodeURIComponent(`/events/${eventId}/cfp`)}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            {t("cfp_login_cta")}
          </Link>
        </div>
      ) : (
        <>
          {/* New / edit form */}
          {showForm ? (
            <form onSubmit={submit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">{t("cfp_field_title")}</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">{t("cfp_field_abstract")}</label>
                <textarea value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} required rows={5} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t("cfp_field_speaker_name")}</label>
                  <input value={form.speaker_name} onChange={(e) => setForm({ ...form, speaker_name: e.target.value })} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t("cfp_field_track")}</label>
                  <input value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">{t("cfp_field_speaker_bio")}</label>
                <textarea value={form.speaker_bio} onChange={(e) => setForm({ ...form, speaker_bio: e.target.value })} rows={2} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">{t("cfp_cancel")}</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {editingId ? t("cfp_save") : t("cfp_submit")}
                </button>
              </div>
            </form>
          ) : (
            canSubmit && (
              <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                <Plus className="h-4 w-4" /> {t("cfp_new_submission")}
              </button>
            )
          )}
          {atLimit && !showForm && <p className="text-sm text-amber-600">{t("cfp_limit_reached")}</p>}

          {/* My submissions */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">{t("cfp_my_submissions")}</h2>
            {mine.length === 0 ? (
              <p className="text-sm text-gray-500">{t("cfp_no_submissions")}</p>
            ) : (
              mine.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{s.title}</span>
                        <SpeakerStatusBadge status={s.status} />
                      </div>
                      {s.track && <p className="mt-0.5 text-xs text-gray-500">{s.track}</p>}
                      {s.decision_note && <p className="mt-1 text-xs text-gray-500 italic">“{s.decision_note}”</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {s.status === "submitted" && (
                        <button onClick={() => openEdit(s)} title={t("cfp_edit")} className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"><Pencil className="h-4 w-4" /></button>
                      )}
                      {s.status !== "accepted" && s.status !== "withdrawn" && (
                        <button onClick={() => withdraw(s.id)} disabled={busyId === s.id} title={t("cfp_withdraw")} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-gray-600">{s.abstract}</p>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SpeakerStatusBadge({ status }: { status: string }) {
  const t = useT();
  const tone: Record<string, string> = {
    submitted: "bg-sky-50 text-sky-700 border-sky-200",
    under_review: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-11 font-semibold ${tone[status] || tone.withdrawn}`}>
      {t(`cfp_status_${status}` as any)}
    </span>
  );
}
