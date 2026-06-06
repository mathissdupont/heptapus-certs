"use client";

import { useEffect, useState } from "react";
import {
  Award, BookOpen, Users, Calendar, TrendingUp, Target,
  Loader2, BarChart3, CheckCircle2, AlertCircle, RefreshCw,
} from "lucide-react";
import {
  getOrgOverview, getTrainingCompliance, getLearningPathsAnalytics,
  getCrmAnalytics, getCertTimeline,
  type OrgOverview, type TrainingCompliance, type LearningPathStat,
  type CrmAnalytics, type CertTimelineDay,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Tab = "overview" | "training" | "learning-paths" | "crm";

const PERIOD_OPTIONS = [7, 30, 90, 365];

const LIFECYCLE_LABELS_TR: Record<string, string> = {
  lead: "Lead", prospect: "Aday", customer: "Müşteri",
  churned: "Kayıp", partner: "Partner",
};

const LIFECYCLE_LABELS_EN: Record<string, string> = {
  lead: "Lead", prospect: "Prospect", customer: "Customer",
  churned: "Churned", partner: "Partner",
};

const STAGE_LABELS_TR: Record<string, string> = {
  lead: "Lead", qualified: "Nitelikli", proposal: "Teklif",
  negotiation: "Müzakere", won: "Kazanıldı", lost: "Kaybedildi",
};

const STAGE_LABELS_EN: Record<string, string> = {
  lead: "Lead", qualified: "Qualified", proposal: "Proposal",
  negotiation: "Negotiation", won: "Won", lost: "Lost",
};

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "indigo",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: "indigo" | "green" | "amber" | "blue";
}) {
  const bg = { indigo: "bg-indigo-50", green: "bg-green-50", amber: "bg-amber-50", blue: "bg-blue-50" }[color];
  const text = { indigo: "text-indigo-600", green: "text-green-600", amber: "text-amber-600", blue: "text-blue-600" }[color];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{typeof value === "number" ? value.toLocaleString("tr-TR") : value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${bg}`}>
          <Icon className={`h-5 w-5 ${text}`} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color = "indigo" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  const barColor = color === "green" ? "bg-green-500" : color === "amber" ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
    </div>
  );
}

function SimpleBarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{item.label}</span>
            <span className="font-medium">{item.value.toLocaleString("tr-TR")}</span>
          </div>
          <ProgressBar value={item.value} max={maxVal} />
        </div>
      ))}
    </div>
  );
}

export default function OrgAnalyticsPage() {
  const { lang } = useI18n();
  const copy = lang === "tr"
    ? {
        pageTitle: "Analitik",
        pageSubtitle: "Organizasyon geneli raporlar ve metrikler",
        periodSuffix: "gün",
        tabOverview: "Genel Bakış",
        tabTraining: "Eğitim & Uyum",
        tabLearningPaths: "Öğrenme Yolları",
        tabCrm: "CRM & Satış",
        loadError: "Yüklenemedi.",
        metricTotalEvents: "Toplam Etkinlik",
        metricCertificates: "Sertifika",
        metricMembers: "Üye",
        metricCrmContacts: "CRM Kişi",
        metricSubPeriod: (period: number) => `son ${period} günde`,
        metricSubNew: "yeni",
        certTimelineTitle: (period: number) => `Sertifika Zaman Serisi (son ${period} gün)`,
        certTooltipSuffix: "sertifika",
        metricTotalRegistered: "Toplam Kayıt",
        metricTotalCertified: "Sertifika Alan",
        metricOverallCompliance: "Genel Uyum",
        tableEvent: "Etkinlik",
        tableRegistered: "Kayıt",
        tableCertified: "Sertifika",
        tableCompletionRate: "Tamamlama Oranı",
        noLearningPaths: "Henüz öğrenme yolu yok.",
        badgeDraft: "Taslak",
        lpSteps: (n: number) => `${n} adım`,
        lpEnrolled: "Kayıtlı",
        lpCompleted: "Tamamladı",
        lpRate: "Oran",
        lpCompletion: "Tamamlama",
        lpAvgProgress: (v: number) => `Ort. İlerleme: %${v}`,
        crmTotalContacts: "Toplam Kişi",
        crmHotLeads: "Sıcak Lead",
        crmHotLeadsSub: "Skor ≥ 70",
        crmPipelineValue: "Pipeline Değeri",
        crmWon: "Kazanılan",
        crmWinRateSub: (r: number) => `%${r} başarı`,
        lifecycleTitle: "Yaşam Döngüsü Dağılımı",
        noData: "Veri yok.",
        pipelineTitle: "Pipeline Aşamaları",
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
        metricTotalEvents: "Total Events",
        metricCertificates: "Certificates",
        metricMembers: "Members",
        metricCrmContacts: "CRM Contacts",
        metricSubPeriod: (period: number) => `last ${period} days`,
        metricSubNew: "new",
        certTimelineTitle: (period: number) => `Certificate Timeline (last ${period} days)`,
        certTooltipSuffix: "certificates",
        metricTotalRegistered: "Total Registered",
        metricTotalCertified: "Certified",
        metricOverallCompliance: "Overall Compliance",
        tableEvent: "Event",
        tableRegistered: "Registered",
        tableCertified: "Certified",
        tableCompletionRate: "Completion Rate",
        noLearningPaths: "No learning paths yet.",
        badgeDraft: "Draft",
        lpSteps: (n: number) => `${n} steps`,
        lpEnrolled: "Enrolled",
        lpCompleted: "Completed",
        lpRate: "Rate",
        lpCompletion: "Completion",
        lpAvgProgress: (v: number) => `Avg. Progress: ${v}%`,
        crmTotalContacts: "Total Contacts",
        crmHotLeads: "Hot Leads",
        crmHotLeadsSub: "Score ≥ 70",
        crmPipelineValue: "Pipeline Value",
        crmWon: "Won",
        crmWinRateSub: (r: number) => `${r}% win rate`,
        lifecycleTitle: "Lifecycle Distribution",
        noData: "No data.",
        pipelineTitle: "Pipeline Stages",
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
    loadOverview();
  }, [period]);

  useEffect(() => {
    if (tab === "training") loadCompliance();
    if (tab === "learning-paths") loadLp();
    if (tab === "crm") loadCrm();
  }, [tab]);

  const maxCertDay = certTimeline.length > 0 ? Math.max(...certTimeline.map((d) => d.count)) : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{copy.pageTitle}</h1>
            <p className="text-sm text-gray-500">{copy.pageSubtitle}</p>
          </div>
        </div>
        {tab === "overview" && (
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PERIOD_OPTIONS.map((d) => (
                <option key={d} value={d}>{d} {copy.periodSuffix}</option>
              ))}
            </select>
            <button
              onClick={() => { setOverview(null); loadOverview(); }}
              className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {([
          { id: "overview", label: copy.tabOverview },
          { id: "training", label: copy.tabTraining },
          { id: "learning-paths", label: copy.tabLearningPaths },
          { id: "crm", label: copy.tabCrm },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {loading.overview ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : errors.overview ? (
            <div className="text-center py-12 text-red-400 text-sm"><AlertCircle className="h-6 w-6 mx-auto mb-2" /> {copy.loadError}</div>
          ) : overview ? (
            <>
              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <MetricCard icon={Calendar} label={copy.metricTotalEvents} value={overview.events.total} sub={`+${overview.events.period} ${copy.metricSubPeriod(period)}`} color="blue" />
                <MetricCard icon={Award} label={copy.metricCertificates} value={overview.certificates.total} sub={`+${overview.certificates.period} ${copy.metricSubPeriod(period)}`} color="green" />
                <MetricCard icon={Users} label={copy.metricMembers} value={overview.members.total} sub={`+${overview.members.period} ${copy.metricSubNew}`} color="indigo" />
                <MetricCard icon={Target} label={copy.metricCrmContacts} value={overview.crm_contacts.total} color="amber" />
              </div>

              {/* Cert timeline mini chart */}
              {certTimeline.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-medium text-gray-700 mb-4">{copy.certTimelineTitle(period)}</h2>
                  <div className="flex items-end gap-0.5 h-24">
                    {certTimeline.map((d) => (
                      <div
                        key={d.date}
                        className="flex-1 bg-indigo-200 rounded-t hover:bg-indigo-400 transition cursor-default"
                        style={{ height: `${maxCertDay > 0 ? Math.max(4, Math.round(d.count / maxCertDay * 100)) : 4}%` }}
                        title={`${d.date}: ${d.count} ${copy.certTooltipSuffix}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>{certTimeline[0]?.date}</span>
                    <span>{certTimeline[certTimeline.length - 1]?.date}</span>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── Training Tab ── */}
      {tab === "training" && (
        <div className="space-y-5">
          {loading.compliance ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : errors.compliance ? (
            <div className="text-center py-12 text-red-400 text-sm"><AlertCircle className="h-6 w-6 mx-auto mb-2" /> {copy.loadError}</div>
          ) : compliance ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard icon={Users} label={copy.metricTotalRegistered} value={compliance.total_registered} color="blue" />
                <MetricCard icon={Award} label={copy.metricTotalCertified} value={compliance.total_certified} color="green" />
                <MetricCard icon={CheckCircle2} label={copy.metricOverallCompliance} value={`%${compliance.overall_completion_rate}`} color="amber" />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">{copy.tableEvent}</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{copy.tableRegistered}</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{copy.tableCertified}</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500">{copy.tableCompletionRate}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {compliance.events.map((ev) => (
                      <tr key={ev.event_id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900 line-clamp-1">{ev.event_name}</div>
                          {ev.event_date && (
                            <div className="text-xs text-gray-400">
                              {new Date(ev.event_date).toLocaleDateString("tr-TR")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{ev.registered}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{ev.certified}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${ev.completion_rate >= 75 ? "bg-green-500" : ev.completion_rate >= 40 ? "bg-amber-500" : "bg-red-400"}`}
                                style={{ width: `${ev.completion_rate}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-10">%{ev.completion_rate}</span>
                          </div>
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

      {/* ── Learning Paths Tab ── */}
      {tab === "learning-paths" && (
        <div className="space-y-4">
          {loading.lp ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : errors.lp ? (
            <div className="text-center py-12 text-red-400 text-sm"><AlertCircle className="h-6 w-6 mx-auto mb-2" /> {copy.loadError}</div>
          ) : lpStats.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{copy.noLearningPaths}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lpStats.map((lp) => (
                <div key={lp.path_id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">{lp.path_name}</h3>
                        {!lp.published && (
                          <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100 text-gray-500">{copy.badgeDraft}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{copy.lpSteps(lp.step_count)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right flex-shrink-0">
                      <div>
                        <div className="text-lg font-bold text-gray-900">{lp.enrolled}</div>
                        <div className="text-xs text-gray-400">{copy.lpEnrolled}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{lp.completed}</div>
                        <div className="text-xs text-gray-400">{copy.lpCompleted}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-indigo-600">%{lp.completion_rate}</div>
                        <div className="text-xs text-gray-400">{copy.lpRate}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{copy.lpCompletion}</span>
                      <span>%{lp.completion_rate}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${lp.completion_rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{copy.lpAvgProgress(lp.avg_progress)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CRM Tab ── */}
      {tab === "crm" && (
        <div className="space-y-5">
          {loading.crm ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : errors.crm ? (
            <div className="text-center py-12 text-red-400 text-sm"><AlertCircle className="h-6 w-6 mx-auto mb-2" /> {copy.loadError}</div>
          ) : crmStats ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetricCard icon={Users} label={copy.crmTotalContacts} value={crmStats.total_contacts} color="blue" />
                <MetricCard icon={Target} label={copy.crmHotLeads} value={crmStats.hot_leads} sub={copy.crmHotLeadsSub} color="amber" />
                <MetricCard icon={TrendingUp} label={copy.crmPipelineValue} value={`₺${crmStats.total_pipeline_value.toLocaleString("tr-TR")}`} color="indigo" />
                <MetricCard icon={Award} label={copy.crmWon} value={`₺${crmStats.won_value.toLocaleString("tr-TR")}`} sub={copy.crmWinRateSub(crmStats.win_rate)} color="green" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Lifecycle distribution */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
                  <h2 className="text-sm font-medium text-gray-700">{copy.lifecycleTitle}</h2>
                  {Object.keys(crmStats.lifecycle_distribution).length === 0 ? (
                    <p className="text-xs text-gray-400">{copy.noData}</p>
                  ) : (
                    <SimpleBarChart
                      data={Object.entries(crmStats.lifecycle_distribution).map(([k, v]) => ({
                        label: copy.lifecycleLabels[k] ?? k,
                        value: v,
                      }))}
                      maxVal={Math.max(...Object.values(crmStats.lifecycle_distribution))}
                    />
                  )}
                </div>

                {/* Pipeline by stage */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
                  <h2 className="text-sm font-medium text-gray-700">{copy.pipelineTitle}</h2>
                  {Object.keys(crmStats.pipeline_by_stage).length === 0 ? (
                    <p className="text-xs text-gray-400">{copy.noOpportunities}</p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.entries(crmStats.pipeline_by_stage).map(([stage, data]) => (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-24 flex-shrink-0">
                            {copy.stageLabels[stage] ?? stage}
                          </span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-400"
                                style={{ width: `${crmStats.total_pipeline_value > 0 ? Math.round(data.value / crmStats.total_pipeline_value * 100) : 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{data.count}</span>
                            {data.value > 0 && (
                              <span className="text-xs text-gray-400">₺{data.value.toLocaleString("tr-TR")}</span>
                            )}
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
