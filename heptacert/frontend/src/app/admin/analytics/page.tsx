"use client";

import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Users,
  Calendar,
  TrendingUp,
  Target,
  Loader2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  getOrgOverview,
  getTrainingCompliance,
  getLearningPathsAnalytics,
  getCrmAnalytics,
  getCertTimeline,
  type OrgOverview,
  type TrainingCompliance,
  type LearningPathStat,
  type CrmAnalytics,
  type CertTimelineDay,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Tab = "overview" | "training" | "learning-paths" | "crm";

const PERIOD_OPTIONS = [7, 30, 90, 365];

const LIFECYCLE_LABELS_TR: Record<string, string> = {
  lead: "Lead",
  prospect: "Aday",
  customer: "Müşteri",
  churned: "Kayıp",
  partner: "Partner",
};

const LIFECYCLE_LABELS_EN: Record<string, string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Customer",
  churned: "Churned",
  partner: "Partner",
};

const STAGE_LABELS_TR: Record<string, string> = {
  lead: "Lead",
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

function formatNumber(value: number, lang: string) {
  return value.toLocaleString(lang === "tr" ? "tr-TR" : "en-US");
}

function formatCurrency(value: number, lang: string) {
  return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "brand",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  tone?: "brand" | "green" | "amber" | "blue";
}) {
  const toneClass = {
    brand: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="card-meta">{label}</p>
          <p className="mt-1 text-2xl font-bold text-surface-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
          {sub && <p className="mt-0.5 text-xs text-surface-400">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, tone = "brand" }: { value: number; max: number; tone?: "brand" | "green" | "amber" | "red" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const barColor = {
    brand: "bg-brand-700",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-400",
  }[tone];

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-surface-500">{pct}%</span>
    </div>
  );
}

function SimpleBarChart({ data, maxVal, lang }: { data: { label: string; value: number }[]; maxVal: number; lang: string }) {
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-xs text-surface-500">
            <span>{item.label}</span>
            <span className="font-medium">{formatNumber(item.value, lang)}</span>
          </div>
          <ProgressBar value={item.value} max={maxVal} />
        </div>
      ))}
    </div>
  );
}

export default function OrgAnalyticsPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const copy = isTr
    ? {
        pageTitle: "Analitik",
        pageSubtitle: "Organizasyon geneli raporlar ve metrikler",
        periodSuffix: "gün",
        tabOverview: "Genel bakış",
        tabTraining: "Eğitim & Uyum",
        tabLearningPaths: "Öğrenme yolları",
        tabCrm: "CRM & Satış",
        loadError: "Yüklenemedi.",
        metricTotalEvents: "Toplam etkinlik",
        metricCertificates: "Sertifika",
        metricMembers: "Üye",
        metricCrmContacts: "CRM kişi",
        metricSubPeriod: (period: number) => `son ${period} günde`,
        metricSubNew: "yeni",
        certTimelineTitle: (period: number) => `Sertifika zaman serisi (son ${period} gün)`,
        certTooltipSuffix: "sertifika",
        metricTotalRegistered: "Toplam kayıt",
        metricTotalCertified: "Sertifika alan",
        metricOverallCompliance: "Genel uyum",
        tableEvent: "Etkinlik",
        tableRegistered: "Kayıt",
        tableCertified: "Sertifika",
        tableCompletionRate: "Tamamlama oranı",
        noLearningPaths: "Henüz öğrenme yolu yok.",
        badgeDraft: "Taslak",
        lpSteps: (n: number) => `${n} adım`,
        lpEnrolled: "Kayıtlı",
        lpCompleted: "Tamamladı",
        lpRate: "Oran",
        lpCompletion: "Tamamlama",
        lpAvgProgress: (v: number) => `Ort. ilerleme: %${v}`,
        crmTotalContacts: "Toplam kişi",
        crmHotLeads: "Sıcak lead",
        crmHotLeadsSub: "Skor >= 70",
        crmPipelineValue: "Pipeline değeri",
        crmWon: "Kazanılan",
        crmWinRateSub: (r: number) => `%${r} başarı`,
        lifecycleTitle: "Yaşam döngüsü dağılımı",
        noData: "Veri yok.",
        pipelineTitle: "Pipeline aşamaları",
        noOpportunities: "Fırsat yok.",
        lifecycleLabels: LIFECYCLE_LABELS_TR,
        stageLabels: STAGE_LABELS_TR,
      }
    : {
        pageTitle: "Analytics",
        pageSubtitle: "Organization-wide reports and metrics",
        periodSuffix: "days",
        tabOverview: "Overview",
        tabTraining: "Training & Compliance",
        tabLearningPaths: "Learning Paths",
        tabCrm: "CRM & Sales",
        loadError: "Failed to load.",
        metricTotalEvents: "Total events",
        metricCertificates: "Certificates",
        metricMembers: "Members",
        metricCrmContacts: "CRM contacts",
        metricSubPeriod: (period: number) => `last ${period} days`,
        metricSubNew: "new",
        certTimelineTitle: (period: number) => `Certificate timeline (last ${period} days)`,
        certTooltipSuffix: "certificates",
        metricTotalRegistered: "Total registered",
        metricTotalCertified: "Certified",
        metricOverallCompliance: "Overall compliance",
        tableEvent: "Event",
        tableRegistered: "Registered",
        tableCertified: "Certified",
        tableCompletionRate: "Completion rate",
        noLearningPaths: "No learning paths yet.",
        badgeDraft: "Draft",
        lpSteps: (n: number) => `${n} steps`,
        lpEnrolled: "Enrolled",
        lpCompleted: "Completed",
        lpRate: "Rate",
        lpCompletion: "Completion",
        lpAvgProgress: (v: number) => `Avg. progress: ${v}%`,
        crmTotalContacts: "Total contacts",
        crmHotLeads: "Hot leads",
        crmHotLeadsSub: "Score >= 70",
        crmPipelineValue: "Pipeline value",
        crmWon: "Won",
        crmWinRateSub: (r: number) => `${r}% win rate`,
        lifecycleTitle: "Lifecycle distribution",
        noData: "No data.",
        pipelineTitle: "Pipeline stages",
        noOpportunities: "No opportunities.",
        lifecycleLabels: LIFECYCLE_LABELS_EN,
        stageLabels: STAGE_LABELS_EN,
      };

  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState(30);
  const [overview, setOverview] = useState<OrgOverview | null>(null);
  const [compliance, setCompliance] = useState<TrainingCompliance | null>(null);
  const [lpStats, setLpStats] = useState<LearningPathStat[]>([]);
  const [crmStats, setCrmStats] = useState<CrmAnalytics | null>(null);
  const [certTimeline, setCertTimeline] = useState<CertTimelineDay[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  async function loadOverview() {
    setLoading((l) => ({ ...l, overview: true }));
    setErrors((e) => ({ ...e, overview: false }));
    try {
      const [ov, tl] = await Promise.all([getOrgOverview(period), getCertTimeline(period)]);
      setOverview(ov);
      setCertTimeline(tl.timeline);
    } catch {
      setErrors((e) => ({ ...e, overview: true }));
    } finally {
      setLoading((l) => ({ ...l, overview: false }));
    }
  }

  async function loadCompliance() {
    if (compliance) return;
    setLoading((l) => ({ ...l, compliance: true }));
    try {
      setCompliance(await getTrainingCompliance());
    } catch {
      setErrors((e) => ({ ...e, compliance: true }));
    } finally {
      setLoading((l) => ({ ...l, compliance: false }));
    }
  }

  async function loadLp() {
    if (lpStats.length) return;
    setLoading((l) => ({ ...l, lp: true }));
    try {
      const d = await getLearningPathsAnalytics();
      setLpStats(d.paths);
    } catch {
      setErrors((e) => ({ ...e, lp: true }));
    } finally {
      setLoading((l) => ({ ...l, lp: false }));
    }
  }

  async function loadCrm() {
    if (crmStats) return;
    setLoading((l) => ({ ...l, crm: true }));
    try {
      setCrmStats(await getCrmAnalytics());
    } catch {
      setErrors((e) => ({ ...e, crm: true }));
    } finally {
      setLoading((l) => ({ ...l, crm: false }));
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [period]);

  useEffect(() => {
    if (tab === "training") void loadCompliance();
    if (tab === "learning-paths") void loadLp();
    if (tab === "crm") void loadCrm();
  }, [tab]);

  const maxCertDay = certTimeline.length > 0 ? Math.max(...certTimeline.map((d) => d.count)) : 1;

  return (
    <div className="page-content mx-auto max-w-5xl px-4 py-8">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-2 text-brand-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title">{copy.pageTitle}</h1>
            <p className="page-subtitle">{copy.pageSubtitle}</p>
          </div>
        </div>
        {tab === "overview" && (
          <div className="flex items-center gap-2">
            <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="input w-auto">
              {PERIOD_OPTIONS.map((d) => (
                <option key={d} value={d}>{d} {copy.periodSuffix}</option>
              ))}
            </select>
            <button type="button" onClick={() => { setOverview(null); void loadOverview(); }} className="btn-secondary px-3">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="tab-group">
        {([
          { id: "overview", label: copy.tabOverview },
          { id: "training", label: copy.tabTraining },
          { id: "learning-paths", label: copy.tabLearningPaths },
          { id: "crm", label: copy.tabCrm },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tab === t.id ? "tab-btn-active flex-1" : "tab-btn flex-1"}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {loading.overview ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
          ) : errors.overview ? (
            <div className="error-banner justify-center"><AlertCircle className="h-5 w-5" /> {copy.loadError}</div>
          ) : overview ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <MetricCard icon={Calendar} label={copy.metricTotalEvents} value={formatNumber(overview.events.total, lang)} sub={`+${overview.events.period} ${copy.metricSubPeriod(period)}`} tone="blue" />
                <MetricCard icon={Award} label={copy.metricCertificates} value={formatNumber(overview.certificates.total, lang)} sub={`+${overview.certificates.period} ${copy.metricSubPeriod(period)}`} tone="green" />
                <MetricCard icon={Users} label={copy.metricMembers} value={formatNumber(overview.members.total, lang)} sub={`+${overview.members.period} ${copy.metricSubNew}`} />
                <MetricCard icon={Target} label={copy.metricCrmContacts} value={formatNumber(overview.crm_contacts.total, lang)} tone="amber" />
              </div>

              {certTimeline.length > 0 && (
                <div className="card p-6">
                  <h2 className="card-title mb-4">{copy.certTimelineTitle(period)}</h2>
                  <div className="flex h-24 items-end gap-0.5">
                    {certTimeline.map((d) => (
                      <div
                        key={d.date}
                        className="flex-1 cursor-default rounded-t bg-brand-200 transition hover:bg-brand-500"
                        style={{ height: `${maxCertDay > 0 ? Math.max(4, Math.round((d.count / maxCertDay) * 100)) : 4}%` }}
                        title={`${d.date}: ${d.count} ${copy.certTooltipSuffix}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-surface-400">
                    <span>{certTimeline[0]?.date}</span>
                    <span>{certTimeline[certTimeline.length - 1]?.date}</span>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {tab === "training" && (
        <div className="space-y-5">
          {loading.compliance ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
          ) : errors.compliance ? (
            <div className="error-banner justify-center"><AlertCircle className="h-5 w-5" /> {copy.loadError}</div>
          ) : compliance ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard icon={Users} label={copy.metricTotalRegistered} value={formatNumber(compliance.total_registered, lang)} tone="blue" />
                <MetricCard icon={Award} label={copy.metricTotalCertified} value={formatNumber(compliance.total_certified, lang)} tone="green" />
                <MetricCard icon={CheckCircle2} label={copy.metricOverallCompliance} value={`%${compliance.overall_completion_rate}`} tone="amber" />
              </div>

              <div className="table-shell">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">{copy.tableEvent}</th>
                      <th className="table-th text-center">{copy.tableRegistered}</th>
                      <th className="table-th text-center">{copy.tableCertified}</th>
                      <th className="table-th">{copy.tableCompletionRate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compliance.events.map((ev) => (
                      <tr key={ev.event_id} className="table-tr-hover">
                        <td className="table-td">
                          <div className="line-clamp-1 font-semibold text-surface-900">{ev.event_name}</div>
                          {ev.event_date && <div className="text-xs text-surface-400">{new Date(ev.event_date).toLocaleDateString(isTr ? "tr-TR" : "en-US")}</div>}
                        </td>
                        <td className="table-td text-center">{ev.registered}</td>
                        <td className="table-td text-center">{ev.certified}</td>
                        <td className="table-td">
                          <ProgressBar value={ev.completion_rate} max={100} tone={ev.completion_rate >= 75 ? "green" : ev.completion_rate >= 40 ? "amber" : "red"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === "learning-paths" && (
        <div className="space-y-4">
          {loading.lp ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
          ) : errors.lp ? (
            <div className="error-banner justify-center"><AlertCircle className="h-5 w-5" /> {copy.loadError}</div>
          ) : lpStats.length === 0 ? (
            <div className="card empty-state">
              <BookOpen className="h-8 w-8 text-surface-300" />
              <p className="empty-state-title">{copy.noLearningPaths}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lpStats.map((lp) => (
                <div key={lp.path_id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-surface-900">{lp.path_name}</h3>
                        {!lp.published && <span className="badge-neutral">{copy.badgeDraft}</span>}
                      </div>
                      <p className="card-meta">{copy.lpSteps(lp.step_count)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-right">
                      <div>
                        <div className="text-lg font-bold text-surface-900">{lp.enrolled}</div>
                        <div className="text-xs text-surface-400">{copy.lpEnrolled}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-emerald-600">{lp.completed}</div>
                        <div className="text-xs text-surface-400">{copy.lpCompleted}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-brand-700">%{lp.completion_rate}</div>
                        <div className="text-xs text-surface-400">{copy.lpRate}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-surface-500">
                      <span>{copy.lpCompletion}</span>
                      <span>%{lp.completion_rate}</span>
                    </div>
                    <ProgressBar value={lp.completion_rate} max={100} tone="green" />
                    <div className="text-xs text-surface-400">{copy.lpAvgProgress(lp.avg_progress)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "crm" && (
        <div className="space-y-5">
          {loading.crm ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
          ) : errors.crm ? (
            <div className="error-banner justify-center"><AlertCircle className="h-5 w-5" /> {copy.loadError}</div>
          ) : crmStats ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetricCard icon={Users} label={copy.crmTotalContacts} value={formatNumber(crmStats.total_contacts, lang)} tone="blue" />
                <MetricCard icon={Target} label={copy.crmHotLeads} value={formatNumber(crmStats.hot_leads, lang)} sub={copy.crmHotLeadsSub} tone="amber" />
                <MetricCard icon={TrendingUp} label={copy.crmPipelineValue} value={formatCurrency(crmStats.total_pipeline_value, lang)} />
                <MetricCard icon={Award} label={copy.crmWon} value={formatCurrency(crmStats.won_value, lang)} sub={copy.crmWinRateSub(crmStats.win_rate)} tone="green" />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="card space-y-3 p-5">
                  <h2 className="card-title">{copy.lifecycleTitle}</h2>
                  {Object.keys(crmStats.lifecycle_distribution).length === 0 ? (
                    <p className="body-xs">{copy.noData}</p>
                  ) : (
                    <SimpleBarChart
                      data={Object.entries(crmStats.lifecycle_distribution).map(([k, v]) => ({
                        label: copy.lifecycleLabels[k] ?? k,
                        value: v,
                      }))}
                      maxVal={Math.max(...Object.values(crmStats.lifecycle_distribution))}
                      lang={lang}
                    />
                  )}
                </div>

                <div className="card space-y-3 p-5">
                  <h2 className="card-title">{copy.pipelineTitle}</h2>
                  {Object.keys(crmStats.pipeline_by_stage).length === 0 ? (
                    <p className="body-xs">{copy.noOpportunities}</p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.entries(crmStats.pipeline_by_stage).map(([stage, data]) => (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-xs text-surface-500">{copy.stageLabels[stage] ?? stage}</span>
                          <div className="flex flex-1 items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${crmStats.total_pipeline_value > 0 ? Math.round((data.value / crmStats.total_pipeline_value) * 100) : 0}%` }} />
                            </div>
                            <span className="text-xs text-surface-500">{data.count}</span>
                            {data.value > 0 && <span className="text-xs text-surface-400">{formatCurrency(data.value, lang)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
