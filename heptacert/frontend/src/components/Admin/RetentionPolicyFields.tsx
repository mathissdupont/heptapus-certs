"use client";

import { useT } from "@/lib/i18n";
import type { RetentionPolicy } from "@/lib/api";

const INPUT = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-surface-500 focus:ring-0";
const FIELD_LABEL = "text-11 font-bold uppercase tracking-wider text-surface-500";

/**
 * Presentational retention-policy form (enabled toggle + conditional fields).
 * Shared by the per-event section and the org-default editor (WP28). No data fetching.
 */
export default function RetentionPolicyFields({
  policy,
  onPatch,
  enabledLabel,
}: {
  policy: RetentionPolicy;
  onPatch: (patch: Partial<RetentionPolicy>) => void;
  enabledLabel?: string;
}) {
  const t = useT();

  return (
    <>
      <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
        <input
          type="checkbox"
          checked={policy.enabled}
          onChange={(e) => onPatch({ enabled: e.target.checked })}
          className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 cursor-pointer"
        />
        <span className="text-xs font-semibold text-surface-800">{enabledLabel ?? t("retention_enabled")}</span>
      </label>

      {policy.enabled && (
        <div className="space-y-4 pl-1">
          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>{t("retention_mode")}</label>
            <select
              value={policy.mode}
              onChange={(e) => onPatch({ mode: e.target.value as RetentionPolicy["mode"] })}
              className={INPUT}
            >
              <option value="relative">{t("retention_mode_relative")}</option>
              <option value="fixed">{t("retention_mode_fixed")}</option>
            </select>
          </div>

          {policy.mode === "relative" ? (
            <div className="space-y-1.5">
              <label className={FIELD_LABEL}>{t("retention_days")}</label>
              <input
                type="number"
                min={0}
                max={3650}
                value={policy.retention_days ?? 0}
                onChange={(e) => onPatch({ retention_days: Number(e.target.value) })}
                className={`${INPUT} w-40`}
              />
              <p className="text-11 text-surface-400">{t("retention_days_hint")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className={FIELD_LABEL}>{t("retention_fixed_date")}</label>
              <input
                type="date"
                value={policy.fixed_date ?? ""}
                onChange={(e) => onPatch({ fixed_date: e.target.value || null })}
                className={`${INPUT} w-52`}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>{t("retention_trigger")}</label>
            <select
              value={policy.trigger}
              onChange={(e) => onPatch({ trigger: e.target.value as RetentionPolicy["trigger"] })}
              className={INPUT}
            >
              <option value="auto">{t("retention_trigger_auto")}</option>
              <option value="approve">{t("retention_trigger_approve")}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={FIELD_LABEL}>{t("retention_notify_days")}</label>
              <input
                type="number"
                min={0}
                max={365}
                value={policy.notify_before_days ?? 0}
                onChange={(e) => onPatch({ notify_before_days: Number(e.target.value) })}
                className={INPUT}
              />
            </div>
            <div className="space-y-1.5">
              <label className={FIELD_LABEL}>{t("retention_notify_email")}</label>
              <input
                type="email"
                value={policy.notify_email ?? ""}
                onChange={(e) => onPatch({ notify_email: e.target.value || null })}
                placeholder={t("retention_notify_email_ph")}
                className={INPUT}
              />
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-start gap-2.5 select-none">
            <input
              type="checkbox"
              checked={Boolean(policy.include_name_email)}
              onChange={(e) => onPatch({ include_name_email: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded-md border-surface-300 text-amber-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-semibold text-surface-800">
              {t("retention_include_name_email")}
              <span className="block text-11 font-medium text-amber-700">{t("retention_include_name_email_warn")}</span>
            </span>
          </label>
        </div>
      )}
    </>
  );
}
