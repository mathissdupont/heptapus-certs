"use client";

import { useEffect, useState, useMemo, type ElementType } from "react";
import { useParams } from "next/navigation";
import { Bell, Loader2, Mail, Plus, Trash2, Webhook, Workflow, ChevronRight, ChevronDown, AlertCircle, CheckCircle2, History, Layers } from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import EmailTemplateSelect from "@/components/Admin/EmailTemplateSelect";
import { FeatureGate } from "@/lib/useSubscription";
import { useI18n, translate } from "@/lib/i18n";
import {
  createEventAutomation,
  deleteEventAutomation,
  dispatchEventAutomationsNow,
  dryRunEventAutomation,
  getEventAutomations,
  listEventAutomationLogs,
  updateEventAutomation,
  type AutomationAction,
  type AutomationActionType,
  type AutomationDispatchLog,
  type AutomationDryRun,
  type AutomationRule,
  type AutomationSummary,
  type AutomationTrigger,
} from "@/lib/api";

const TRIGGERS: Array<{ value: AutomationTrigger; label: string; body: string }> = [
  { value: "attended_event", label: "Katıldı", body: "Check-in veya oturum katılımı olan kişiler." },
  { value: "registered_no_show", label: "Kayıt Oldu / Gelmedi", body: "Kaydı var, check-in/katılım kaydı yok." },
  { value: "certificate_issued", label: "Sertifika Aldı", body: "Sertifikası üretilmiş katılımcılar." },
  { value: "survey_not_completed", label: "Anketi Tamamlamadı", body: "Anket zorunlu olup henüz cevap vermeyenler." },
  { value: "badge_earned", label: "Rozet Kazandı", body: "Etkinlikte rozet kazanmış katılımcılar." },
];

const ACTIONS: Array<{ value: AutomationActionType; label: string; icon: ElementType }> = [
  { value: "send_email", label: "E-posta gönder", icon: Mail },
  { value: "create_reminder", label: "Hatırlatma oluştur", icon: Bell },
  { value: "webhook_dispatch", label: "Webhook tetikle", icon: Webhook },
];

const DEFAULT_ACTION: AutomationAction = { type: "send_email", reminder_delay_hours: 0 };

type RuleForm = {
  id?: string;
  name: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  action: AutomationAction;
};

const DEFAULT_FORM: RuleForm = {
  name: "Etkinlik sonrası takip",
  trigger: "attended_event",
  enabled: true,
  action: DEFAULT_ACTION,
};

export default function EventAutomationsPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const { lang } = useI18n();

  const copy = { gate: translate(lang, "migrated_app_admin_events_id_automations_automation_rules_are_available_on_growth_a_1636de74"), title: translate(lang, "migrated_app_admin_events_id_automations_automation_rules_8686c775"), subtitle: translate(lang, "migrated_app_admin_events_id_automations_define_email_reminder_or_webhook_actions_b_7328999e"), loadError: translate(lang, "migrated_app_admin_events_id_automations_could_not_load_automations_12ba9ebe"), nameRequired: translate(lang, "migrated_app_admin_events_id_automations_rule_name_is_required_ff2b99d9"), templateRequired: translate(lang, "migrated_app_admin_events_id_automations_choose_a_template_for_the_email_action_df3042b3"), saveError: translate(lang, "migrated_app_admin_events_id_automations_could_not_save_rule_87cf5edf"), deleteConfirm: translate(lang, "migrated_app_admin_events_id_automations_delete_this_automation_rule_f7e8df55"), deleteError: translate(lang, "migrated_app_admin_events_id_automations_could_not_delete_rule_fef49ab5"), dispatchResult: (sent: number, skipped: number, failed: number) => translate(lang, "migrated_app_admin_events_id_automations_value0_actions_ran_value1_already_processe_7673b6fb", { value0: sent, value1: skipped, value2: failed }), dispatchError: translate(lang, "migrated_app_admin_events_id_automations_could_not_run_automations_d440a808"), dryRun: translate(lang, "migrated_app_admin_events_id_automations_preview_simulation_c725a012"), logs: translate(lang, "migrated_app_admin_events_id_automations_automation_run_history_9329a5a1"), dryRunResult: (count: number) => translate(lang, "migrated_app_admin_events_id_automations_value0_targets_found_578fe4d0", { value0: count }), newRule: translate(lang, "migrated_app_admin_events_id_automations_new_rule_7b3954cc"), runNow: translate(lang, "migrated_app_admin_events_id_automations_trigger_now_000a50d9") };

  const [summary, setSummary] = useState<AutomationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<AutomationDispatchLog[]>([]);
  const [dryRun, setDryRun] = useState<AutomationDryRun | null>(null);
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(DEFAULT_FORM);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getEventAutomations(eventId));
      setLogs(await listEventAutomationLogs(eventId, { limit: 20 }));
    } catch (ex: any) {
      setError(ex?.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [eventId]);

  const selectedActionMeta = useMemo(
    () => ACTIONS.find((item) => item.value === form.action.type) || ACTIONS[0],
    [form.action.type],
  );

  function editRule(rule: AutomationRule) {
    setForm({
      id: rule.id,
      name: rule.name,
      trigger: rule.trigger,
      enabled: rule.enabled,
      action: rule.actions[0] || DEFAULT_ACTION,
    });
  }

  async function saveRule() {
    const name = form.name.trim();
    if (!name) {
      setError(copy.nameRequired);
      return;
    }
    if (form.action.type === "send_email" && !form.action.email_template_id) {
      setError(copy.templateRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        trigger: form.trigger,
        enabled: form.enabled,
        actions: [form.action],
      };
      const next = form.id
        ? await updateEventAutomation(eventId, form.id, payload)
        : await createEventAutomation(eventId, payload);
      setSummary(next);
      setForm(DEFAULT_FORM);
    } catch (ex: any) {
      setError(ex?.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(ruleId: string) {
    if (!confirm(copy.deleteConfirm)) return;
    setBusyRuleId(ruleId);
    setError(null);
    try {
      setSummary(await deleteEventAutomation(eventId, ruleId));
      if (form.id === ruleId) setForm(DEFAULT_FORM);
    } catch (ex: any) {
      setError(ex?.message || copy.deleteError);
    } finally {
      setBusyRuleId(null);
    }
  }

  async function dispatchNow() {
    setDispatching(true);
    setDispatchResult(null);
    setError(null);
    try {
      const result = await dispatchEventAutomationsNow(eventId);
      setDispatchResult(copy.dispatchResult(result.sent, result.skipped, result.failed));
      await load();
    } catch (ex: any) {
      setError(ex?.message || copy.dispatchError);
    } finally {
      setDispatching(false);
    }
  }

  async function previewRule(ruleId: string) {
    setBusyRuleId(ruleId);
    setDryRun(null);
    setError(null);
    try {
      const result = await dryRunEventAutomation(eventId, ruleId);
      setDryRun(result);
      setDispatchResult(copy.dryRunResult(result.target_count));
    } catch (ex: any) {
      setError(ex?.message || copy.dispatchError);
    } finally {
      setBusyRuleId(null);
    }
  }

  const triggerCounts: Partial<Record<AutomationTrigger, number>> = summary?.trigger_counts || {};

  if (loading && !summary) {
    return (
      <div className="flex w-full min-h-[340px] items-center justify-center antialiased">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]} message={copy.gate}>
    <div className="w-full flex flex-col gap-5 antialiased text-surface-900">

      {/* ÜST NAVİGASYON VE BAŞLIK BARLARI */}
      <EventAdminNav eventId={eventId} active="automations" className="mb-1" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-11 font-bold uppercase tracking-widest text-surface-400">Post-event automation</p>
          <h1 className="text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">{copy.title}</h1>
          <p className="text-xs text-surface-400 font-medium max-w-2xl">{copy.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button type="button" onClick={() => setForm(DEFAULT_FORM)} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 active:scale-95">
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{copy.newRule}</span>
          </button>
          <button type="button" onClick={dispatchNow} disabled={dispatching} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-95 disabled:opacity-40">
            {dispatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Workflow className="h-3.5 w-3.5 stroke-[2]" />}
            <span>{copy.runNow}</span>
          </button>
        </div>
      </div>

      {/* DİNAMİK DURUM BANNERLARI */}
      {error && (
        <div className="rounded-xl border border-status-danger-border bg-status-danger-bg/40 p-4 text-xs font-semibold text-status-danger-content flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {dispatchResult && (
        <div className="rounded-xl border border-status-success-border bg-status-success-bg/40 p-4 text-xs font-semibold text-status-success-content flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{dispatchResult}</span>
        </div>
      )}

      {/* TETİKLEYİCİ MİKRO SAYAÇ MATRİSİ (Trigger Grid) */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-5">
        {TRIGGERS.map((trigger) => {
          const isSelected = form.trigger === trigger.value;
          return (
            <button
              key={trigger.value}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, trigger: trigger.value }))}
              className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-outline-strong bg-raised shadow-md ring-1 ring-outline-strong"
                  : "border-surface-200 bg-raised shadow-sm hover:border-surface-300"
              }`}
            >
              <p className="text-11 font-bold text-surface-400 uppercase tracking-tight truncate">{trigger.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-surface-900 font-mono tabular-nums">{triggerCounts[trigger.value] ?? 0}</p>
              <p className="mt-2 text-11 font-medium leading-normal text-surface-400 line-clamp-2">{trigger.body}</p>
            </button>
          );
        })}
      </div>

      {/* ANA FORM EDITÖRÜ VE AKTİF AKIŞLAR ÇİFT SÜTUNU */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start">

        {/* SOL SÜTUN: KURAL OLUŞTURMA & EDİTÖR FORMU */}
        <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4.5">
          <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
            <Workflow className="h-4 w-4 text-surface-800 stroke-[2]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{form.id ? "Kuralı Düzenle" : "Yeni Kural Tanımla"}</h2>
          </div>

          <div className="space-y-4">
            <label className="block w-full">
              <span className="block text-11 font-bold text-surface-500 mb-1">Kural Tanımlama Adı</span>
              <input
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900"
                maxLength={120}
              />
            </label>

            <label className="block w-full">
              <span className="block text-11 font-bold text-surface-500 mb-1">Tetikleyici (Trigger Sınırı)</span>
              <div className="relative inline-flex items-center w-full">
                <select
                  value={form.trigger}
                  onChange={event => setForm(prev => ({ ...prev, trigger: event.target.value as AutomationTrigger }))}
                  className="w-full min-h-[38px] appearance-none rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 cursor-pointer"
                >
                  {TRIGGERS.map(trigger => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-surface-400" />
              </div>
            </label>

            {/* Aksiyon Tipi Dağılım Grubu */}
            <div className="space-y-1.5">
              <span className="block text-11 font-bold text-surface-500">Çıktı Aksiyon Türü</span>
              <div className="grid gap-2 grid-cols-3">
                {ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const isActSelected = form.action.type === action.value;
                  return (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, action: { type: action.value, reminder_delay_hours: action.value === "create_reminder" ? 24 : 0 } }))}
                      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-all active:scale-95 ${
                        isActSelected
                          ? "border-outline-strong bg-surface-900 text-white shadow-sm"
                          : "border-surface-200 bg-raised text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 stroke-[1.8]" />
                      <span className="truncate">{action.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dinamik Form Alanları Gövdesi */}
            {form.action.type === "send_email" && (
              <EmailTemplateSelect
                eventId={eventId}
                value={form.action.email_template_id || null}
                onChange={(templateId) => setForm(prev => ({ ...prev, action: { ...prev.action, email_template_id: templateId } }))}
                label="Otomasyon E-posta Şablonu"
                placeholder="Bir şablon seçin..."
                emptyText="CRM veya sistem bülten şablonu arayın."
              />
            )}

            {form.action.type === "create_reminder" && (
              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">Hatırlatma Gecikme Periyodu (Saat)</span>
                <input
                  type="number"
                  min={0}
                  max={720}
                  value={form.action.reminder_delay_hours ?? 24}
                  onChange={event => setForm(prev => ({ ...prev, action: { ...prev.action, reminder_delay_hours: Number(event.target.value) } }))}
                  className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900"
                />
              </label>
            )}

            {form.action.type === "webhook_dispatch" && (
              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">Uç Nokta Webhook Hedef URL</span>
                <input
                  type="url"
                  value={form.action.webhook_url || ""}
                  onChange={event => setForm(prev => ({ ...prev, action: { ...prev.action, webhook_url: event.target.value } }))}
                  className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 placeholder:text-surface-400 font-mono"
                  placeholder="https://api.kurumunuz.com/webhook"
                />
              </label>
            )}

            {/* Switch Aktif / Pasif */}
            <label className="flex items-center justify-between rounded-xl border border-surface-100 bg-surface-50/50 px-3.5 py-2 select-none cursor-pointer">
              <span className="text-xs font-bold text-surface-700">Otomasyon Statüsünü Aktifleştir</span>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={event => setForm(prev => ({ ...prev, enabled: event.target.checked }))}
                className="h-4 w-4 rounded border-surface-300 text-surface-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>

            {/* Form Kaydetme Butonu */}
            <button type="button" onClick={saveRule} disabled={saving} className="w-full inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 disabled:opacity-40 active:scale-[0.98]">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Workflow className="h-3.5 w-3.5 stroke-[2.5]" />}
              <span>{form.id ? "Kural Yapılandırmasını Güncelle" : "Kuralı Üret ve Çalıştır"}</span>
            </button>
          </div>
        </section>

        {/* SAĞ SÜTUN: AKTİF OTOMASYON AKIŞLARI LİSTESİ */}
        <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-surface-800 stroke-[2]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">Aktif İş Akışları</h2>
            </div>
            <span className="rounded-md bg-surface-50 border border-surface-100 px-2 py-0.5 text-11 font-bold text-surface-400">
              {summary?.rules.length || 0} kural tanımlı
            </span>
          </div>

          {!summary || summary.rules.length === 0 ? (
            <div className="py-14 text-center">
              <Workflow className="mx-auto h-9 w-9 text-surface-300 stroke-[1.8]" />
              <p className="mt-3 text-xs font-bold text-surface-900 tracking-tight">Henüz kural tanımlanmadı</p>
              <p className="mt-1 text-11 text-surface-400 max-w-xs mx-auto leading-relaxed">Katılımcı eylemlerine göre otomatik iş akışları kurgulamak için ilk kural formunu doldurun.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-none">
              {summary.rules.map((rule) => {
                const action = rule.actions[0];
                const actionLabel = action?.label || selectedActionMeta.label;
                return (
                  <div key={rule.id} className="rounded-xl border border-surface-100 bg-raised p-4 shadow-sm hover:border-surface-200 transition-colors flex flex-col justify-between sm:flex-row sm:items-center gap-3 group">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-xs text-surface-900 tracking-tight">{rule.name}</p>
                        <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-11 font-bold uppercase tracking-tight shadow-sm ${rule.enabled ? "border-status-success-border bg-status-success-bg text-status-success-content" : "border-surface-100 bg-surface-50 text-surface-400"}`}>
                          {rule.enabled ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      <p className="text-11 font-medium text-surface-400">
                        {rule.trigger_label} <span className="font-sans text-surface-300 mx-0.5">→</span> {actionLabel}
                      </p>
                      <p className="text-11 font-bold text-surface-500 font-mono">
                        Öngörülen Hedef: {triggerCounts[rule.trigger] ?? 0} tekil alıcı
                      </p>
                    </div>

                    {/* Liste İçi Küçük Aksiyon Düğmeleri */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button type="button" onClick={() => void previewRule(rule.id)} disabled={busyRuleId === rule.id} className="rounded-lg border border-surface-200 bg-raised px-2.5 py-1 text-11 font-bold text-surface-700 hover:bg-surface-50 shadow-sm">
                        {copy.dryRun.split(" ")[0]}
                      </button>
                      <button type="button" onClick={() => editRule(rule)} className="rounded-lg border border-surface-200 bg-raised px-2.5 py-1 text-11 font-bold text-surface-700 hover:bg-surface-50 shadow-sm">
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        disabled={busyRuleId === rule.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-100 bg-raised text-surface-400 hover:bg-status-danger-bg hover:text-status-danger-content transition-all active:scale-90 shadow-sm"
                        title="Sil"
                      >
                        {busyRuleId === rule.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 stroke-[1.8]" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 6. SİMÜLASYON HEDEF ÖNİZLEME ALANI (Dry Run) */}
      {dryRun && (
        <section className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-4 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900 flex items-center gap-1.5">
              <Workflow className="h-4 w-4 text-surface-400 stroke-[2]" /> {copy.dryRun}
            </h2>
            <span className="rounded-md bg-surface-900 px-2 py-0.5 text-11 font-bold text-white shadow-sm">
              {dryRun.target_count} kuyruk hedefi
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 max-w-4xl">
            {dryRun.sample_recipients.map((item) => (
              <div key={`${item.attendee_id}-${item.email}`} className="rounded-xl border border-surface-100 bg-surface-50/40 p-3 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-surface-900 tracking-tight truncate">{item.name || item.email}</p>
                  <p className="text-11 font-medium text-surface-400 font-mono truncate">{item.email || "-"}</p>
                </div>
                {item.suppressed && <span className="rounded-md bg-status-warning-bg border border-status-warning-border px-1.5 py-0.5 text-11 font-bold text-status-warning-content uppercase tracking-wide">Bastırıldı</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. TARİHSEL ÇALIŞMA GÜNLÜĞÜ GEÇMİŞİ (Run History Logs) */}
      <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <History className="h-4 w-4 text-surface-800 stroke-[2]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.logs}</h2>
          </div>
          <span className="rounded-md bg-surface-50 border border-surface-100 px-2 py-0.5 text-11 font-bold text-surface-400">{logs.length}</span>
        </div>

        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="text-xs font-semibold text-surface-400 py-4">Henüz kural tetikleme geçmişi kaydedilmedi.</p>
          ) : (
            logs.map((log) => (
              <div key={`${log.rule_id}-${log.updated_at}`} className="rounded-xl border border-surface-100 bg-raised p-4 space-y-3 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-subtle/50 pb-2">
                  <p className="text-xs font-bold text-surface-900 tracking-tight font-mono truncate">İş Akışı ID: #{log.rule_id}</p>
                  <div className="flex flex-wrap gap-1.5 text-11 font-bold">
                    <span className="bg-status-success-bg border border-status-success-border/50 px-2 py-0.5 text-status-success-content rounded-md">Başarılı: {log.sent}</span>
                    <span className="bg-status-warning-bg border border-status-warning-border/50 px-2 py-0.5 text-status-warning-content rounded-md">Atlanan: {log.skipped}</span>
                    <span className="bg-status-danger-bg border border-status-danger-border/50 px-2 py-0.5 text-status-danger-content rounded-md">Hata: {log.failed}</span>
                  </div>
                </div>

                {/* Mikro Alıcı Detay Log Ögeleri */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
                  {log.recent.slice(0, 6).map((item: any) => (
                    <div key={`${item.id}-${item.status}`} className="rounded-lg border border-outline-subtle bg-surface-50/30 p-2.5 space-y-1">
                      <p className="text-11 font-bold text-surface-900 truncate font-mono">{item.email || `#${item.attendee_id}`}</p>
                      <p className="text-11 font-medium text-surface-400 flex items-center justify-between gap-2 pt-0.5 border-t border-outline-subtle/50">
                        <span className="capitalize">{item.action_type.replace("_", " ")}</span>
                        <span className={`font-semibold ${item.status === "success" ? "text-status-success-content" : "text-surface-500"}`}>
                          {item.status} · {item.attempts || 0} deneme
                        </span>
                      </p>
                      {item.message && <p className="text-11 font-semibold text-status-danger-content line-clamp-1 pt-0.5" title={item.message}>{item.message}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
    </FeatureGate>
  );
}
