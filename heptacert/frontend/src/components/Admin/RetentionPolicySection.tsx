"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  getEventRetentionPolicy,
  setEventRetentionPolicy,
  getAnonymizationStatus,
  approveAnonymization,
  type RetentionPolicy,
  type AnonymizationStatus,
} from "@/lib/api";
import RetentionPolicyFields from "@/components/Admin/RetentionPolicyFields";

const EMPTY: RetentionPolicy = {
  enabled: false,
  mode: "relative",
  retention_days: 365,
  fixed_date: null,
  trigger: "auto",
  notify_before_days: 7,
  notify_email: null,
  include_name_email: false,
};

/** WP28: per-event KVKK retention policy editor + approve-mode disposal confirmation. */
export default function RetentionPolicySection({ eventId }: { eventId: number }) {
  const t = useT();
  const [policy, setPolicy] = useState<RetentionPolicy>(EMPTY);
  const [hasOrgDefault, setHasOrgDefault] = useState(false);
  const [status, setStatus] = useState<AnonymizationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [pol, st] = await Promise.all([
        getEventRetentionPolicy(eventId),
        getAnonymizationStatus(eventId),
      ]);
      setPolicy({ ...EMPTY, ...(pol.policy || {}) });
      setHasOrgDefault(Boolean(pol.org_default?.enabled));
      setStatus(st);
    } catch {
      /* leave defaults; save/approve surface their own errors */
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function patch(p: Partial<RetentionPolicy>) {
    setPolicy((current) => ({ ...current, ...p }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await setEventRetentionPolicy(eventId, policy);
      setMsg(t("retention_saved", { count: res.attendees_rescheduled ?? 0 }));
      await refresh();
    } catch {
      setMsg(t("retention_save_error"));
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!window.confirm(t("retention_approve_confirm"))) return;
    setApproving(true);
    setMsg(null);
    try {
      const res = await approveAnonymization(eventId);
      setMsg(t("retention_approved", { count: res.disposed }));
      await refresh();
    } catch {
      setMsg(t("retention_save_error"));
    } finally {
      setApproving(false);
    }
  }

  if (loading) return null;

  return (
    <section className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
        <ShieldCheck className="h-4 w-4 text-surface-800 stroke-[1.8]" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{t("retention_title")}</h2>
      </div>
      <p className="text-11 leading-relaxed text-surface-400 font-medium">{t("retention_desc")}</p>

      {policy.enabled && policy.trigger === "approve" && status && status.pending > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-bold">{t("retention_pending", { count: status.pending })}</span>
          </div>
          <p className="text-11 text-amber-700">{t("retention_pending_hint")}</p>
          <button
            type="button"
            onClick={approve}
            disabled={approving}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {approving ? t("retention_approving") : t("retention_approve_btn")}
          </button>
        </div>
      )}

      <RetentionPolicyFields policy={policy} onPatch={patch} />

      {!policy.enabled && hasOrgDefault && (
        <p className="text-11 text-surface-500">{t("retention_org_default_active")}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-surface-900 px-4 py-2 text-xs font-semibold text-white hover:bg-surface-800 disabled:opacity-50"
        >
          {saving ? t("retention_saving") : t("retention_save")}
        </button>
        {msg && <span className="text-11 font-medium text-surface-600">{msg}</span>}
      </div>
    </section>
  );
}
