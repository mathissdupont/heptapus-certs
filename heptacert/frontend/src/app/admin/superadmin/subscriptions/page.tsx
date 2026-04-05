"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CreditCard,
  Gift,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import EmptyState from "@/components/Admin/EmptyState";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/lib/i18n";

type SubscriptionRow = {
  id: number;
  user_id: number;
  user_email: string;
  plan_id: string;
  order_id?: string | null;
  started_at: string;
  expires_at?: string | null;
  is_active: boolean;
};

const PLAN_OPTIONS = ["starter", "pro", "growth", "enterprise"] as const;
const PLAN_TONES: Record<string, string> = {
  starter: "bg-surface-100 text-surface-700",
  pro: "bg-violet-100 text-violet-700",
  growth: "bg-rose-100 text-rose-700",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function SuperadminSubscriptionsPage() {
  const toast = useToast();
  const { lang } = useI18n();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPlan, setGrantPlan] = useState<(typeof PLAN_OPTIONS)[number]>("starter");
  const [grantDays, setGrantDays] = useState(30);

  const copy = lang === "tr"
    ? {
        title: "Abonelikler",
        subtitle: "Kullanıcılara manuel plan tanımlayın, süreleri takip edin ve aktif abonelikleri denetleyin",
        loadFailed: "Abonelikler yüklenemedi",
        grantFailed: "Abonelik verilemedi",
        grantSuccess: "Abonelik verildi",
        revokeFailed: "Abonelik iptal edilemedi",
        revokeSuccess: "Abonelik iptal edildi",
        total: "Toplam abonelik",
        active: "Aktif",
        enterprise: "Kurumsal",
        endingSoon: "Yakında biten",
        grantTitle: "Manuel abonelik ver",
        email: "Kullanıcı e-postası",
        plan: "Plan",
        days: "Gün",
        grant: "Ver",
        startedAt: "Başlangıç",
        expiresAt: "Bitiş",
        status: "Durum",
        activeState: "Aktif",
        inactiveState: "Pasif",
        emptyTitle: "Henüz abonelik yok",
        emptyBody: "İlk manuel plan atamasını yaparak listeyi oluşturmaya başlayın.",
        deleteTitle: "Aboneliği iptal et",
        deleteBody: "Bu aboneliği pasif duruma almak istediğinizden emin misiniz?",
        locale: "tr-TR",
      }
    : {
        title: "Subscriptions",
        subtitle: "Grant plans manually, monitor durations, and review active subscriptions",
        loadFailed: "Failed to load subscriptions",
        grantFailed: "Failed to grant subscription",
        grantSuccess: "Subscription granted",
        revokeFailed: "Failed to revoke subscription",
        revokeSuccess: "Subscription revoked",
        total: "Subscriptions",
        active: "Active",
        enterprise: "Enterprise",
        endingSoon: "Ending soon",
        grantTitle: "Grant manual subscription",
        email: "User email",
        plan: "Plan",
        days: "Days",
        grant: "Grant",
        startedAt: "Started",
        expiresAt: "Expires",
        status: "Status",
        activeState: "Active",
        inactiveState: "Inactive",
        emptyTitle: "No subscriptions yet",
        emptyBody: "Start by assigning the first manual plan from the panel above.",
        deleteTitle: "Revoke subscription",
        deleteBody: "Are you sure you want to set this subscription to inactive?",
        locale: "en-US",
      };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/superadmin/subscriptions");
      setRows(await response.json());
    } catch (e: any) {
      setError(e?.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const stats = useMemo(() => {
    const activeCount = rows.filter((row) => row.is_active).length;
    const enterpriseCount = rows.filter((row) => row.plan_id === "enterprise").length;
    const endingSoon = rows.filter((row) => row.expires_at && new Date(row.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && row.is_active).length;
    return [
      { label: copy.total, value: rows.length, detail: "records" },
      { label: copy.active, value: activeCount, detail: copy.activeState },
      { label: copy.enterprise, value: enterpriseCount, detail: "enterprise" },
      { label: copy.endingSoon, value: endingSoon, detail: "7d" },
    ];
  }, [copy.active, copy.activeState, copy.endingSoon, copy.enterprise, copy.total, rows]);

  const grantSubscription = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setGranting(true);
      setError(null);
      await apiFetch("/superadmin/subscriptions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: grantEmail, plan_id: grantPlan, days: grantDays }),
      });
      toast.success(copy.grantSuccess);
      setGrantEmail("");
      setGrantPlan("starter");
      setGrantDays(30);
      await load();
    } catch (e: any) {
      const message = e?.message || copy.grantFailed;
      setError(message);
      toast.error(message);
    } finally {
      setGranting(false);
    }
  };

  const revokeSubscription = async () => {
    if (!revokeId) return;
    try {
      setRevoking(true);
      await apiFetch(`/superadmin/subscriptions/${revokeId}`, { method: "DELETE" });
      toast.success(copy.revokeSuccess);
      setRevokeId(null);
      await load();
    } catch (e: any) {
      const message = e?.message || copy.revokeFailed;
      setError(message);
      toast.error(message);
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<CreditCard className="h-5 w-5" />} />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{stat.label}</p>
            <p className="mt-3 text-2xl font-black text-surface-900">{stat.value}</p>
            <p className="mt-1 text-sm text-surface-500">{stat.detail}</p>
          </div>
        ))}
      </div>

      <form onSubmit={grantSubscription} className="card grid gap-4 p-5 lg:grid-cols-[minmax(0,1.4fr)_220px_150px_auto] lg:items-end">
        <div className="lg:col-span-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-surface-900">{copy.grantTitle}</h2>
            <p className="text-sm text-surface-500">{copy.subtitle}</p>
          </div>
        </div>

        <label className="space-y-2">
          <span className="label">{copy.email}</span>
          <input type="email" required value={grantEmail} onChange={(event) => setGrantEmail(event.target.value)} className="input-field" />
        </label>

        <label className="space-y-2">
          <span className="label">{copy.plan}</span>
          <select value={grantPlan} onChange={(event) => setGrantPlan(event.target.value as (typeof PLAN_OPTIONS)[number])} className="input-field capitalize">
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>{plan}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="label">{copy.days}</span>
          <input type="number" min={1} max={3650} value={grantDays} onChange={(event) => setGrantDays(Number(event.target.value))} className="input-field" />
        </label>

        <button type="submit" disabled={granting} className="btn-primary gap-2 text-sm">
          {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {copy.grant}
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-7 w-7" />} title={copy.emptyTitle} description={copy.emptyBody} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-surface-900">{row.user_email}</h2>
                  <p className="mt-1 text-sm text-surface-500">User ID #{row.user_id}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${PLAN_TONES[row.plan_id] || PLAN_TONES.starter}`}>
                  {row.plan_id}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{copy.startedAt}</p>
                  <p className="mt-2 text-sm font-medium text-surface-800">{new Date(row.started_at).toLocaleDateString(copy.locale)}</p>
                </div>
                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{copy.expiresAt}</p>
                  <p className="mt-2 text-sm font-medium text-surface-800">{row.expires_at ? new Date(row.expires_at).toLocaleDateString(copy.locale) : "-"}</p>
                </div>
                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{copy.status}</p>
                  <p className={`mt-2 text-sm font-semibold ${row.is_active ? "text-emerald-700" : "text-surface-500"}`}>{row.is_active ? copy.activeState : copy.inactiveState}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-surface-400">{row.order_id ? `Order ${row.order_id}` : "Manual"}</p>
                <button onClick={() => setRevokeId(row.id)} className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100">
                  <Trash2 className="h-4 w-4" />
                  {copy.deleteTitle}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmModal
        open={revokeId !== null}
        title={copy.deleteTitle}
        description={copy.deleteBody}
        danger
        loading={revoking}
        onConfirm={revokeSubscription}
        onCancel={() => setRevokeId(null)}
      />
    </div>
  );
}
