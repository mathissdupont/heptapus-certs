"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n";
import { apiFetch, type RetentionPolicy } from "@/lib/api";
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

/** WP28: org-wide default retention policy (applied to events without their own). */
export default function OrgRetentionDefault() {
  const t = useT();
  const [policy, setPolicy] = useState<RetentionPolicy>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/organization/settings");
      const data = await res.json();
      const rd = data?.settings?.retention_default;
      if (rd) setPolicy({ ...EMPTY, ...rd });
    } catch {
      /* leave defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patch(p: Partial<RetentionPolicy>) {
    setPolicy((current) => ({ ...current, ...p }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch("/admin/organization/settings", {
        method: "PATCH",
        body: JSON.stringify({ retention_default: policy }),
      });
      setMsg(t("retention_org_saved"));
    } catch {
      setMsg(t("retention_save_error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <section className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
        <ShieldCheck className="h-4 w-4 text-surface-800 stroke-[1.8]" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{t("retention_org_title")}</h2>
      </div>
      <p className="text-11 leading-relaxed text-surface-400 font-medium">{t("retention_org_desc")}</p>

      <RetentionPolicyFields policy={policy} onPatch={patch} enabledLabel={t("retention_org_enabled")} />

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
