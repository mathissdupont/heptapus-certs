"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { useParams } from "next/navigation";
import { Bell, Loader2, Mail, Plus, Trash2, Webhook, Workflow } from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import { FeatureGate } from "@/lib/useSubscription";
import { useI18n } from "@/lib/i18n";
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
  { value: "registered_no_show", label: "Kayıt oldu ama gelmedi", body: "Kaydı var, check-in/katılım kaydı yok." },
  { value: "certificate_issued", label: "Sertifika aldı", body: "Sertifikası üretilmiş katılımcılar." },
  { value: "survey_not_completed", label: "Anketi tamamlamadı", body: "Anket zorunlu olup henüz cevap vermeyenler." },
  { value: "badge_earned", label: "Rozet kazandı", body: "Etkinlikte rozet kazanmış katılımcılar." },
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
  const copy = lang === "tr" ? {
    gate: "Otomasyon kuralları Growth ve Enterprise planlarında kullanılabilir.",
    title: "Otomasyon Kuralları",
    subtitle: "Katılım, no-show, sertifika, anket ve rozet durumlarına göre e-posta, hatırlatma veya webhook aksiyonları tanımlayın.",
    loadError: "Otomasyonlar yüklenemedi.",
    nameRequired: "Kural adı gerekli.",
    saveError: "Kural kaydedilemedi.",
    deleteConfirm: "Bu otomasyon kuralı silinsin mi?",
    deleteError: "Kural silinemedi.",
    dispatchResult: (sent: number, skipped: number, failed: number) => `${sent} aksiyon çalıştı, ${skipped} zaten işlenmiş, ${failed} başarısız.`,
    dispatchError: "Otomasyonlar çalıştırılamadı.",
    dryRun: "Önizle",
    logs: "Çalışma geçmişi",
    dryRunResult: (count: number) => `${count} hedef bulundu.`,
    newRule: "Yeni kural",
    runNow: "Şimdi çalıştır",
  } : {
    gate: "Automation rules are available on Growth and Enterprise plans.",
    title: "Automation Rules",
    subtitle: "Define email, reminder, or webhook actions based on attendance, no-shows, certificates, surveys, and badges.",
    loadError: "Could not load automations.",
    nameRequired: "Rule name is required.",
    saveError: "Could not save rule.",
    deleteConfirm: "Delete this automation rule?",
    deleteError: "Could not delete rule.",
    dispatchResult: (sent: number, skipped: number, failed: number) => `${sent} actions ran, ${skipped} already processed, ${failed} failed.`,
    dispatchError: "Could not run automations.",
    dryRun: "Preview",
    logs: "Run history",
    dryRunResult: (count: number) => `${count} targets found.`,
    newRule: "New rule",
    runNow: "Run now",
  };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]} message={copy.gate}>
    <div className="space-y-6">
      <EventAdminNav eventId={eventId} active="automations" className="mb-2 flex flex-col gap-2" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Post-event automation</p>
          <h1 className="mt-2 text-2xl font-black text-surface-900">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-surface-500">
            {copy.subtitle}
          </p>
        </div>
        <button type="button" onClick={() => setForm(DEFAULT_FORM)} className="btn-secondary">
          <Plus className="h-4 w-4" />
          {copy.newRule}
        </button>
        <button type="button" onClick={dispatchNow} disabled={dispatching} className="btn-primary">
          {dispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
          {copy.runNow}
        </button>
      </div>

      {error && <div className="error-banner text-sm">{error}</div>}
      {dispatchResult && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{dispatchResult}</div>}

      <div className="grid gap-3 md:grid-cols-5">
        {TRIGGERS.map((trigger) => (
          <button
            key={trigger.value}
            type="button"
            onClick={() => setForm(prev => ({ ...prev, trigger: trigger.value }))}
            className={`rounded-lg border p-3 text-left transition ${
              form.trigger === trigger.value
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-surface-200 bg-white text-surface-700 hover:border-surface-300"
            }`}
          >
            <p className="text-xs font-black">{trigger.label}</p>
            <p className="mt-2 text-2xl font-black">{triggerCounts[trigger.value] ?? 0}</p>
            <p className="mt-1 text-[11px] leading-4 text-surface-500">{trigger.body}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="surface-panel p-5">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-black text-surface-900">{form.id ? "Kuralı düzenle" : "Yeni kural"}</h2>
          </div>

          <div className="mt-5 space-y-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-surface-600">Kural adı</span>
              <input
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                className="input-field"
                maxLength={120}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-surface-600">Trigger</span>
              <select
                value={form.trigger}
                onChange={event => setForm(prev => ({ ...prev, trigger: event.target.value as AutomationTrigger }))}
                className="input-field"
              >
                {TRIGGERS.map(trigger => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}
              </select>
            </label>

            <div className="grid gap-2">
              <span className="text-xs font-bold text-surface-600">Aksiyon</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, action: { type: action.value, reminder_delay_hours: action.value === "create_reminder" ? 24 : 0 } }))}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        form.action.type === action.value
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.action.type === "send_email" && (
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-surface-600">E-posta şablon ID</span>
                <input
                  type="number"
                  min={1}
                  value={form.action.email_template_id || ""}
                  onChange={event => setForm(prev => ({ ...prev, action: { ...prev.action, email_template_id: event.target.value ? Number(event.target.value) : null } }))}
                  className="input-field"
                  placeholder="Örn. 12"
                />
              </label>
            )}

            {form.action.type === "create_reminder" && (
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-surface-600">Hatırlatma gecikmesi (saat)</span>
                <input
                  type="number"
                  min={0}
                  max={720}
                  value={form.action.reminder_delay_hours ?? 24}
                  onChange={event => setForm(prev => ({ ...prev, action: { ...prev.action, reminder_delay_hours: Number(event.target.value) } }))}
                  className="input-field"
                />
              </label>
            )}

            {form.action.type === "webhook_dispatch" && (
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-surface-600">Webhook URL</span>
                <input
                  value={form.action.webhook_url || ""}
                  onChange={event => setForm(prev => ({ ...prev, action: { ...prev.action, webhook_url: event.target.value } }))}
                  className="input-field"
                  placeholder="https://..."
                />
              </label>
            )}

            <label className="flex items-center justify-between rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
              <span className="text-xs font-bold text-surface-700">Aktif</span>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={event => setForm(prev => ({ ...prev, enabled: event.target.checked }))}
                className="h-4 w-4 accent-brand-600"
              />
            </label>

            <button type="button" onClick={saveRule} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
              {form.id ? "Kuralı güncelle" : "Kuralı oluştur"}
            </button>
          </div>
        </section>

        <section className="surface-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-surface-900">Aktif Akışlar</h2>
            <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-bold text-surface-500">
              {summary?.rules.length || 0} kural
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-brand-600" /></div>
          ) : !summary || summary.rules.length === 0 ? (
            <div className="py-12 text-center">
              <Workflow className="mx-auto h-10 w-10 text-surface-300" />
              <p className="mt-3 text-sm font-bold text-surface-700">Henüz otomasyon kuralı yok</p>
              <p className="mt-1 text-xs text-surface-500">İlk kuralı oluşturarak etkinlik sonrası takip akışını başlatın.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {summary.rules.map((rule) => {
                const action = rule.actions[0];
                const actionLabel = action?.label || selectedActionMeta.label;
                return (
                  <div key={rule.id} className="rounded-lg border border-surface-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-surface-900">{rule.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 text-surface-500"}`}>
                            {rule.enabled ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-surface-500">
                          {rule.trigger_label} → {actionLabel}
                        </p>
                        <p className="mt-2 text-xs font-bold text-brand-700">
                          Tahmini hedef: {triggerCounts[rule.trigger] ?? 0}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void previewRule(rule.id)} disabled={busyRuleId === rule.id} className="btn-secondary px-3 py-1.5 text-xs">
                          {copy.dryRun}
                        </button>
                        <button type="button" onClick={() => editRule(rule)} className="btn-secondary px-3 py-1.5 text-xs">
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRule(rule.id)}
                          disabled={busyRuleId === rule.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                          title="Sil"
                        >
                          {busyRuleId === rule.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {dryRun && (
        <section className="surface-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-black text-surface-900">{copy.dryRun}</h2>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
              {dryRun.target_count} hedef
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {dryRun.sample_recipients.map((item) => (
              <div key={`${item.attendee_id}-${item.email}`} className="rounded-lg border border-surface-200 bg-white p-3">
                <p className="text-sm font-black text-surface-900">{item.name || item.email}</p>
                <p className="mt-1 text-xs text-surface-500">{item.email || "-"}</p>
                {item.suppressed && <p className="mt-2 text-xs font-bold text-amber-700">suppressed</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="surface-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-surface-900">{copy.logs}</h2>
          <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-bold text-surface-500">{logs.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-surface-500">Henüz çalışma kaydı yok.</p>
          ) : (
            logs.map((log) => (
              <div key={`${log.rule_id}-${log.updated_at}`} className="rounded-lg border border-surface-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-black text-surface-900">{log.rule_id}</p>
                  <p className="text-xs font-bold text-surface-500">
                    sent {log.sent} / failed {log.failed} / skipped {log.skipped}
                  </p>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {log.recent.slice(0, 6).map((item: any) => (
                    <div key={`${item.id}-${item.status}`} className="rounded-md bg-surface-50 px-3 py-2">
                      <p className="text-xs font-bold text-surface-800">{item.email || `#${item.attendee_id}`} · {item.action_type}</p>
                      <p className="mt-1 text-[11px] text-surface-500">{item.status} · attempts {item.attempts || 0}</p>
                      {item.message && <p className="mt-1 line-clamp-2 text-[11px] text-surface-500">{item.message}</p>}
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
