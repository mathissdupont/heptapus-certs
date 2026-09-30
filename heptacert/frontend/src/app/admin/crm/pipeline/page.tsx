"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Briefcase, TrendingUp } from "lucide-react";
import { getPipeline, updateDeal, type PipelineOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STAGE_LABELS_TR: Record<string, string> = {
  lead: "Aday",
  qualified: "Nitelikli",
  proposal: "Teklif",
  negotiation: "Müzakere",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};

const STAGE_LABELS_EN: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "border-outline-subtle bg-canvas",
  qualified: "border-status-info-border bg-status-info-bg",
  proposal: "border-status-warning-border bg-status-warning-bg",
  negotiation: "border-status-warning-border bg-status-warning-bg",
  won: "border-status-success-border bg-status-success-bg",
  lost: "border-status-danger-border bg-status-danger-bg",
};

const STAGE_HEADER_COLORS: Record<string, string> = {
  lead: "text-content-secondary bg-sunken",
  qualified: "text-status-info-content bg-status-info-bg",
  proposal: "text-status-warning-content bg-status-warning-bg",
  negotiation: "text-status-warning-content bg-status-warning-bg",
  won: "text-status-success-content bg-status-success-bg",
  lost: "text-status-danger-content bg-status-danger-bg",
};

type DealCard = {
  id: number; name: string; account_id: number; account_name: string;
  amount: number | null; expected_close_date: string | null;
  owner_user_id: number | null; updated_at: string;
};

export default function CrmPipelinePage() {
  const { lang } = useI18n();
  const copy = lang === "tr"
    ? {
        pageTitle: "Pipeline",
        pageSubtitle: "Satış fırsatları kanban görünümü",
        deals: "fırsat",
        total: "Toplam",
        won: "Kazanılan",
        moveFailed: "Taşıma başarısız.",
        empty: "Boş",
      }
    : {
        pageTitle: "Pipeline",
        pageSubtitle: "Sales opportunities kanban view",
        deals: "deals",
        total: "Total",
        won: "Won",
        moveFailed: "Move failed.",
        empty: "Empty",
      };

  const STAGE_LABELS = lang === "tr" ? STAGE_LABELS_TR : STAGE_LABELS_EN;

  const [data, setData] = useState<PipelineOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [movingDeal, setMovingDeal] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    getPipeline()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleMoveStage(deal: DealCard, fromStage: string, toStage: string) {
    if (!data || fromStage === toStage) return;
    setMovingDeal(deal.id);
    try {
      await updateDeal(deal.id, { name: deal.name, stage: toStage, amount: deal.amount });
      setData((prev) => {
        if (!prev) return prev;
        const pipeline = { ...prev.pipeline };
        pipeline[fromStage] = pipeline[fromStage].filter((d) => d.id !== deal.id);
        pipeline[toStage] = [{ ...deal }, ...pipeline[toStage]];
        return { ...prev, pipeline };
      });
    } catch {
      showMsg(copy.moveFailed);
    } finally {
      setMovingDeal(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
      </div>
    );
  }

  if (!data) return null;

  const totalDeals = data.stages.reduce((acc, s) => acc + (data.pipeline[s]?.length ?? 0), 0);
  const totalValue = data.stages.reduce((acc, s) => {
    return acc + (data.pipeline[s] ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0);
  }, 0);
  const wonValue = (data.pipeline["won"] ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0);

  return (
    <div className="px-4 py-8 space-y-6 max-w-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-inverse-surface text-white text-sm rounded-xl px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-status-info-content" />
          <div>
            <h1 className="text-xl font-semibold text-content-primary">{copy.pageTitle}</h1>
            <p className="text-sm text-content-muted">{copy.pageSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-content-muted">
          <span><span className="font-semibold text-content-primary">{totalDeals}</span> {copy.deals}</span>
          <span>{copy.total}: <span className="font-semibold text-content-primary">₺{totalValue.toLocaleString(localeTag(lang))}</span></span>
          <span>{copy.won}: <span className="font-semibold text-status-success-content">₺{wonValue.toLocaleString(localeTag(lang))}</span></span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {data.stages.map((stage) => {
          const cards = data.pipeline[stage] ?? [];
          const stageValue = cards.reduce((sum, d) => sum + (d.amount ?? 0), 0);
          return (
            <div key={stage} className="flex-shrink-0 w-64 space-y-3">
              {/* Column header */}
              <div className={`rounded-xl px-3 py-2 flex items-center justify-between ${STAGE_HEADER_COLORS[stage] ?? "text-content-secondary bg-sunken"}`}>
                <span className="text-xs font-semibold">{STAGE_LABELS[stage] ?? stage}</span>
                <span className="text-xs opacity-75">{cards.length}</span>
              </div>

              {/* Cards */}
              <div className={`rounded-xl border min-h-32 p-2 space-y-2 ${STAGE_COLORS[stage] ?? "border-outline-subtle bg-canvas"}`}>
                {cards.map((deal) => (
                  <div
                    key={deal.id}
                    className={`rounded-xl border border-white bg-raised shadow-sm p-3 space-y-2 ${
                      movingDeal === deal.id ? "opacity-50" : ""
                    }`}
                  >
                    <Link
                      href={`/admin/crm/accounts/${deal.account_id}`}
                      className="block text-xs font-semibold text-content-primary hover:text-status-info-content line-clamp-2"
                    >
                      {deal.name}
                    </Link>
                    <p className="text-xs text-content-muted">{deal.account_name}</p>
                    {deal.amount != null && (
                      <p className="text-xs font-medium text-content-secondary">₺{deal.amount.toLocaleString(localeTag(lang))}</p>
                    )}
                    {/* Move buttons */}
                    <div className="flex gap-1 pt-1">
                      {data.stages
                        .filter((s) => s !== stage)
                        .slice(0, 3)
                        .map((toStage) => (
                          <button
                            key={toStage}
                            onClick={() => handleMoveStage(deal, stage, toStage)}
                            disabled={movingDeal === deal.id}
                            className="rounded-md border border-outline-subtle px-1.5 py-0.5 text-xs text-content-muted hover:bg-sunken hover:text-content-secondary disabled:opacity-30"
                          >
                            → {STAGE_LABELS[toStage]?.slice(0, 4)}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}

                {cards.length === 0 && (
                  <div className="text-center py-6 text-xs text-content-muted">
                    <Briefcase className="h-5 w-5 mx-auto mb-1 opacity-40" />
                    {copy.empty}
                  </div>
                )}
              </div>

              {stageValue > 0 && (
                <p className="text-xs text-right text-content-muted pr-1">
                  ₺{stageValue.toLocaleString(localeTag(lang))}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
