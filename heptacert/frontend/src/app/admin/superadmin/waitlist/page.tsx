"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  Download,
  Loader2,
  Mail,
  Phone,
  Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import EmptyState from "@/components/Admin/EmptyState";
import { useI18n } from "@/lib/i18n";

type WaitlistRow = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  plan_interest?: string | null;
  note?: string | null;
  created_at: string;
};

const PLAN_TONES: Record<string, string> = {
  starter: "bg-surface-100 text-surface-700",
  pro: "bg-violet-100 text-violet-700",
  growth: "bg-rose-100 text-rose-700",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function SuperadminWaitlistPage() {
  const { lang } = useI18n();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const copy = lang === "tr"
    ? {
        title: "Bekleme Listesi",
        subtitle: "Talep toplayan potansiyel müşterileri, plan ilgilerini ve iletişim bilgilerini tek listede takip edin",
        export: "CSV indir",
        loadFailed: "Bekleme listesi yüklenemedi",
        total: "Toplam talep",
        withPhone: "Telefon var",
        enterprise: "Kurumsal ilgi",
        today: "Bugün",
        search: "İsim, e-posta veya not ara...",
        emptyTitle: "Bekleme listesi boş",
        emptyBody: "Henüz yeni kayıt gelmediğinde potansiyel müşteri listesi burada görünecek.",
        noNote: "Not yok",
        noPlan: "Plan yok",
        locale: "tr-TR",
      }
    : {
        title: "Waitlist",
        subtitle: "Track incoming leads, their plan interest, and contact details in a single list",
        export: "Export CSV",
        loadFailed: "Failed to load waitlist",
        total: "Total leads",
        withPhone: "With phone",
        enterprise: "Enterprise interest",
        today: "Today",
        search: "Search by name, email, or notes...",
        emptyTitle: "Waitlist is empty",
        emptyBody: "New inbound leads will appear here once requests start arriving.",
        noNote: "No notes",
        noPlan: "No plan",
        locale: "en-US",
      };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/superadmin/waitlist");
      const data = await response.json();
      setRows(data.entries ?? []);
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

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!term) return true;
      return [row.name, row.email, row.note, row.plan_interest].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const withPhone = rows.filter((row) => !!row.phone).length;
    const enterprise = rows.filter((row) => row.plan_interest === "enterprise").length;
    const today = rows.filter((row) => new Date(row.created_at).toDateString() === new Date().toDateString()).length;
    return [
      { label: copy.total, value: rows.length, detail: "leads" },
      { label: copy.withPhone, value: withPhone, detail: "contacts" },
      { label: copy.enterprise, value: enterprise, detail: "enterprise" },
      { label: copy.today, value: today, detail: "new" },
    ];
  }, [copy.enterprise, copy.today, copy.total, copy.withPhone, rows]);

  const exportCsv = () => {
    const columns = ["id", "name", "email", "phone", "plan_interest", "note", "created_at"];
    const lines = [columns.join(","), ...filteredRows.map((row) => columns.map((column) => JSON.stringify((row as Record<string, unknown>)[column] ?? "")).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `waitlist_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
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
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<ClipboardList className="h-5 w-5" />}
        actions={
          <button onClick={exportCsv} disabled={filteredRows.length === 0} className="btn-secondary gap-2 text-xs">
            <Download className="h-3.5 w-3.5" />
            {copy.export}
          </button>
        }
      />

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

      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} className="input-field pl-10" placeholder={copy.search} />
      </label>

      {filteredRows.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title={copy.emptyTitle} description={copy.emptyBody} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRows.map((row) => (
            <article key={row.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-surface-900">{row.name}</h2>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-surface-500">
                    <span className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 text-surface-400" />{row.email}</span>
                    {row.phone && <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-surface-400" />{row.phone}</span>}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${PLAN_TONES[row.plan_interest || ""] || "bg-surface-100 text-surface-600"}`}>
                  {row.plan_interest || copy.noPlan}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-surface-200 bg-surface-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">Note</p>
                <p className="mt-2 text-sm text-surface-700">{row.note || copy.noNote}</p>
              </div>

              <div className="mt-4 text-xs text-surface-400">{new Date(row.created_at).toLocaleString(copy.locale)}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
