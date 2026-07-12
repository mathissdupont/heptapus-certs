"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Search, RefreshCw, ClipboardList } from "lucide-react";
import { apiFetch } from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
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
      not_required: { cls: "bg-surface-100 text-surface-500", label: "—", icon: null },
    };
    const b = map[s];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-11 font-semibold ${b.cls}`}>
        {b.icon}
        {b.label}
      </span>
    );
  };

  const FILTERS: Filter[] = ["pending", "approved", "rejected", "all"];

  return (
    <div className="space-y-6">
      <EventAdminNav eventId={eventId} active="approvals" />
      <PageHeader title={t.title} subtitle={t.subtitle} icon={<ClipboardList className="h-6 w-6" />} />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors ${
              filter === f
                ? "bg-surface-900 text-white"
                : "border border-surface-200 bg-white text-surface-500 hover:bg-surface-50"
            }`}
          >
            {t[f === "all" ? "all" : f]}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPh}
            className="min-h-[38px] rounded-xl border border-surface-200 bg-white py-1.5 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-surface-900 placeholder:text-surface-400"
          />
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-surface-200 bg-white p-2 text-surface-500 transition-colors hover:bg-surface-50 hover:text-surface-900"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-surface-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-200 bg-white py-16 text-center text-xs font-medium text-surface-500">
          {t.empty}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.attendee_id} className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-surface-900">{r.name}</span>
                    {badge(r.approval_status)}
                  </div>
                  <div className="truncate text-xs text-surface-500">{r.email}</div>
                  {r.registered_at && (
                    <div className="mt-0.5 text-11 text-surface-400">
                      {t.registered}: {new Date(r.registered_at).toLocaleString(isTr ? "tr-TR" : "en-US")}
                    </div>
                  )}
                  {r.approval_note && (
                    <div className="mt-1 text-11 italic text-surface-500">“{r.approval_note}”</div>
                  )}
                </div>
                {r.approval_status === "pending" && (
                  <div className="flex flex-col items-end gap-2">
                    <input
                      id={`note-${r.attendee_id}`}
                      placeholder={t.note}
                      className="w-56 rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-11 font-medium outline-none transition focus:border-surface-900 placeholder:text-surface-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === r.attendee_id}
                        onClick={() => decide(r.attendee_id, "approve")}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === r.attendee_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {t.approve}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.attendee_id}
                        onClick={() => decide(r.attendee_id, "reject")}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
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
  );
}
