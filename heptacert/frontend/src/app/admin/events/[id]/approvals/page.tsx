"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Search, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import { useI18n } from "@/lib/i18n";

type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

interface Registration {
  attendee_id: number;
  name: string;
  email: string;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  approval_note: string | null;
  registered_at: string | null;
}

type Filter = "pending" | "approved" | "rejected" | "all";

export default function ApprovalsPage() {
  const params = useParams();
  const eventId = String(params?.id ?? "");
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const t = useMemo(
    () => ({
      title: isTr ? "Kayıt Onayları" : "Registration Approvals",
      subtitle: isTr
        ? "Ödeme/onay bekleyen kayıtları buradan onaylayın veya reddedin. Onaylanan katılımcı check-in yapabilir ve sertifika alabilir."
        : "Approve or reject registrations awaiting payment/approval. Approved attendees can check in and receive certificates.",
      pending: isTr ? "Bekleyen" : "Pending",
      approved: isTr ? "Onaylı" : "Approved",
      rejected: isTr ? "Reddedilen" : "Rejected",
      all: isTr ? "Tümü" : "All",
      searchPh: isTr ? "İsim veya e-posta ara..." : "Search name or email...",
      empty: isTr ? "Bu filtrede kayıt yok." : "No registrations in this filter.",
      approve: isTr ? "Onayla" : "Approve",
      reject: isTr ? "Reddet" : "Reject",
      loadErr: isTr ? "Kayıtlar yüklenemedi." : "Failed to load registrations.",
      actionErr: isTr ? "İşlem başarısız." : "Action failed.",
      registered: isTr ? "Kayıt" : "Registered",
      note: isTr ? "Not (ödeme referansı vb., opsiyonel)" : "Note (payment ref etc., optional)",
    }),
    [isTr],
  );

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const res = await apiFetch(`/admin/events/${eventId}/registrations${qs}`);
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as Registration[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError(t.loadErr);
    } finally {
      setLoading(false);
    }
  }, [eventId, filter, t.loadErr]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(attendeeId: number, action: "approve" | "reject") {
    setBusyId(attendeeId);
    setError(null);
    try {
      const noteEl = document.getElementById(`note-${attendeeId}`) as HTMLInputElement | null;
      const note = noteEl?.value?.trim() || null;
      const res = await apiFetch(`/admin/events/${eventId}/attendees/${attendeeId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("action");
      await load();
    } catch {
      setError(t.actionErr);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle),
    );
  }, [rows, search]);

  const badge = (s: ApprovalStatus) => {
    const map: Record<ApprovalStatus, { cls: string; label: string; icon: React.ReactNode }> = {
      pending: { cls: "bg-amber-100 text-amber-800", label: t.pending, icon: <Clock className="h-3.5 w-3.5" /> },
      approved: { cls: "bg-emerald-100 text-emerald-800", label: t.approved, icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      rejected: { cls: "bg-rose-100 text-rose-800", label: t.rejected, icon: <XCircle className="h-3.5 w-3.5" /> },
      not_required: { cls: "bg-slate-100 text-slate-600", label: "—", icon: null },
    };
    const b = map[s];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${b.cls}`}>
        {b.icon}
        {b.label}
      </span>
    );
  };

  const FILTERS: Filter[] = ["pending", "approved", "rejected", "all"];

  return (
    <div className="min-h-screen bg-slate-50">
      <EventAdminNav eventId={eventId} active="approvals" />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-extrabold text-slate-900">{t.title}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">{t.subtitle}</p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t[f === "all" ? "all" : f]}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPh}
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
            {t.empty}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li key={r.attendee_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-slate-900">{r.name}</span>
                      {badge(r.approval_status)}
                    </div>
                    <div className="truncate text-sm text-slate-500">{r.email}</div>
                    {r.registered_at && (
                      <div className="mt-0.5 text-xs text-slate-400">
                        {t.registered}: {new Date(r.registered_at).toLocaleString(isTr ? "tr-TR" : "en-US")}
                      </div>
                    )}
                    {r.approval_note && (
                      <div className="mt-1 text-xs italic text-slate-500">“{r.approval_note}”</div>
                    )}
                  </div>
                  {r.approval_status === "pending" && (
                    <div className="flex flex-col items-end gap-2">
                      <input
                        id={`note-${r.attendee_id}`}
                        placeholder={t.note}
                        className="w-56 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === r.attendee_id}
                          onClick={() => decide(r.attendee_id, "approve")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busyId === r.attendee_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {t.approve}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.attendee_id}
                          onClick={() => decide(r.attendee_id, "reject")}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          {t.reject}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
