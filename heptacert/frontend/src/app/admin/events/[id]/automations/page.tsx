"use client";

import { useEffect, useState, useMemo, type ElementType } from "react";
import { useParams } from "next/navigation";
import { Bell, Loader2, Mail, Plus, Trash2, Webhook, Workflow, ChevronRight, ChevronDown, AlertCircle, CheckCircle2, History, Layers } from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import EmailTemplateSelect from "@/components/Admin/EmailTemplateSelect";
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
  
  const copy = lang === "tr" ? {
    gate: "Otomasyon kuralları Growth ve Enterprise planlarında kullanılabilir.",
    title: "Otomasyon Kuralları",
    subtitle: "Katılım, no-show, sertifika, anket ve rozet durumlarına göre e-posta, hatırlatma veya webhook aksiyonları tanımlayın.",
    loadError: "Otomasyonlar yüklenemedi.",
    nameRequired: "Kural adı gerekli.",
    templateRequired: "E-posta aksiyonu için şablon seçin.",
    saveError: "Kural kaydedilemedi.",
    deleteConfirm: "Bu otomasyon kuralı silinsin mi?",
    deleteError: "Kural silinemedi.",
    dispatchResult: (sent: number, skipped: number, failed: number) => `${sent} aksiyon çalıştı, ${skipped} zaten işlenmiş, ${failed} başarısız.`,
    dispatchError: "Otomasyonlar çalıştırılamadı.",
    dryRun: "Simülasyon Önizleme",
    logs: "Otomasyon Çalışma Geçmişi",
    dryRunResult: (count: number) => `${count} hedef bulundu.`,
    newRule: "Yeni Kural",
    runNow: "Şimdi Tetikle",
  } : {
    gate: "Automation rules are available on Growth and Enterprise plans.",
    title: "Automation Rules",
    subtitle: "Define email, reminder, or webhook actions based on attendance, no-shows, certificates, surveys, and badges.",
    loadError: "Could not load automations.",
    nameRequired: "Rule name is required.",
    templateRequired: "Choose a template for the email action.",
    saveError: "Could not save rule.",
    deleteConfirm: "Delete this automation rule?",
    deleteError: "Could not delete rule.",
    dispatchResult: (sent: number, skipped: number, failed: number) => `${sent} actions ran, ${skipped} already processed, ${failed} failed.`,
    dispatchError: "Could not run automations.",
    dryRun: "Preview Simulation",
    logs: "Automation Run History",
    dryRunResult: (count: number) => `${count} targets found.`,
    newRule: "New Rule",
    runNow: "Trigger Now",
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
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]} message={copy.gate}>
    <div className="w-full flex flex-col gap-5 antialiased text-gray-900">
      
      {/* ÜST NAVİGASYON VE BAŞLIK BARLARI */}
      <EventAdminNav eventId={eventId} active="automations" className="mb-1" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Post-event automation</p>
          <h1 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">{copy.title}</h1>
          <p className="text-xs text-gray-400 font-medium max-w-2xl">{copy.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button type="button" onClick={() => setForm(DEFAULT_FORM)} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95">
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{copy.newRule}</span>
          </button>
          <button type="button" onClick={dispatchNow} disabled={dispatching} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-95 disabled:opacity-40">
            {dispatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Workflow className="h-3.5 w-3.5 stroke-[2]" />}
            <span>{copy.runNow}</span>
          </button>
        </div>
      </div>

      {/* DİNAMİK DURUM BANNERLARI */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {dispatchResult && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
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
                  ? "border-gray-900 bg-white shadow-md ring-1 ring-gray-950"
                  : "border-gray-200 bg-white shadow-sm hover:border-gray-300"
              }`}
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate">{trigger.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-gray-950 font-mono tabular-nums">{triggerCounts[trigger.value] ?? 0}</p>
              <p className="mt-2 text-[10px] font-medium leading-normal text-gray-400 line-clamp-2">{trigger.body}</p>
            </button>
          );
        })}
      </div>

      {/* ANA FORM EDITÖRÜ VE AKTİF AKIŞLAR ÇİFT SÜTUNU */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start">
        
        {/* SOL SÜTUN: KURAL OLUŞTURMA & EDİTÖR FORMU */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4.5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
            <Workflow className="h-4 w-4 text-gray-800 stroke-[2]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{form.id ? "Kuralı Düzenle" : "Yeni Kural Tanımla"}</h2>
          </div>

          <div className="space-y-4">
            <label className="block w-full">
              <span className="block text-[11px] font-bold text-gray-500 mb-1">Kural Tanımlama Adı</span>
              <input
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                maxLength={120}
              />
            </label>

            <label className="block w-full">
              <span className="block text-[11px] font-bold text-gray-500 mb-1">Tetikleyici (Trigger Sınırı)</span>
              <div className="relative inline-flex items-center w-full">
                <select
                  value={form.trigger}
                  onChange={event => setForm(prev => ({ ...prev, trigger: event.target.value as AutomationTrigger }))}
                  className="w-full min-h-[38px] appearance-none rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 cursor-pointer"
                >
                  {TRIGGERS.map(trigger => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400" />
              </div>
            </label>

            {/* Aksiyon Tipi Dağılım Grubu */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-bold text-gray-500">Çıktı Aksiyon Türü</span>
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
                          ? "border-gray-900 bg-gray-950 text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-950"
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
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Hatırlatma Gecikme Periyodu (Saat)</span>
                <input
                  type="number"
                  min={0}
                  max={720}
                  value={form.action.reminder_delay_hours ?? 24}
                  onChange={event => setForm(prev => ({ ...prev, action: { ...prev.action, reminder_delay_hours: Number(event.target.value) } }))}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900"
                />
              </label>
            )}

            {form.action.type === "webhook_dispatch" && (
              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Uç Nokta Webhook Hedef URL</span>
                <input
                  type="url"
                  value={form.action.webhook_url || ""}
                  onChange={event => setForm(prev => ({ ...prev, action: { ...prev.action, webhook_url: event.target.value } }))}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 placeholder:text-gray-400 font-mono"
                  placeholder="https://api.kurumunuz.com/webhook"
                />
              </label>
            )}

            {/* Switch Aktif / Pasif */}
            <label className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-3.5 py-2 select-none cursor-pointer">
              <span className="text-xs font-bold text-gray-700">Otomasyon Statüsünü Aktifleştir</span>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={event => setForm(prev => ({ ...prev, enabled: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-gray-950 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>

            {/* Form Kaydetme Butonu */}
            <button type="button" onClick={saveRule} disabled={saving} className="w-full inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 disabled:opacity-40 active:scale-98">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Workflow className="h-3.5 w-3.5 stroke-[2.5]" />}
              <span>{form.id ? "Kural Yapılandırmasını Güncelle" : "Kuralı Üret ve Çalıştır"}</span>
            </button>
          </div>
        </section>

        {/* SAĞ SÜTUN: AKTİF OTOMASYON AKIŞLARI LİSTESİ */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-gray-800 stroke-[2]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Aktif İş Akışları</h2>
            </div>
            <span className="rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
              {summary?.rules.length || 0} kural tanımlı
            </span>
          </div>

          {!summary || summary.rules.length === 0 ? (
            <div className="py-14 text-center">
              <Workflow className="mx-auto h-9 w-9 text-gray-300 stroke-[1.8]" />
              <p className="mt-3 text-xs font-bold text-gray-950 tracking-tight">Henüz kural tanımlanmadı</p>
              <p className="mt-1 text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">Katılımcı eylemlerine göre otomatik iş akışları kurgulamak için ilk kural formunu doldurun.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-none">
              {summary.rules.map((rule) => {
                const action = rule.actions[0];
                const actionLabel = action?.label || selectedActionMeta.label;
                return (
                  <div key={rule.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-gray-200 transition-colors flex flex-col justify-between sm:flex-row sm:items-center gap-3 group">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-xs text-gray-950 tracking-tight">{rule.name}</p>
                        <span className={`inline-flex rounded-md border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-tight shadow-sm ${rule.enabled ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-gray-100 bg-gray-50 text-gray-400"}`}>
                          {rule.enabled ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-gray-400">
                        {rule.trigger_label} <span className="font-sans text-gray-300 mx-0.5">→</span> {actionLabel}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 font-mono">
                        Öngörülen Hedef: {triggerCounts[rule.trigger] ?? 0} tekil alıcı
                      </p>
                    </div>
                    
                    {/* Liste İçi Küçük Aksiyon Düğmeleri */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button type="button" onClick={() => void previewRule(rule.id)} disabled={busyRuleId === rule.id} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm">
                        {copy.dryRun.split(" ")[0]}
                      </button>
                      <button type="button" onClick={() => editRule(rule)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-50 shadow-sm">
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        disabled={busyRuleId === rule.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 shadow-sm"
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
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Workflow className="h-4 w-4 text-gray-400 stroke-[2]" /> {copy.dryRun}
            </h2>
            <span className="rounded-md bg-gray-950 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              {dryRun.target_count} kuyruk hedefi
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 max-w-4xl">
            {dryRun.sample_recipients.map((item) => (
              <div key={`${item.attendee_id}-${item.email}`} className="rounded-xl border border-gray-100 bg-gray-50/40 p-3 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950 tracking-tight truncate">{item.name || item.email}</p>
                  <p className="text-[10px] font-medium text-gray-400 font-mono truncate">{item.email || "-"}</p>
                </div>
                {item.suppressed && <span className="rounded-md bg-amber-50 border border-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase tracking-wide">Bastırıldı</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. TARİHSEL ÇALIŞMA GÜNLÜĞÜ GEÇMİŞİ (Run History Logs) */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <History className="h-4 w-4 text-gray-800 stroke-[2]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">{copy.logs}</h2>
          </div>
          <span className="rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">{logs.length}</span>
        </div>
        
        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="text-xs font-semibold text-gray-400 py-4">Henüz kural tetikleme geçmişi kaydedilmedi.</p>
          ) : (
            logs.map((log) => (
              <div key={`${log.rule_id}-${log.updated_at}`} className="rounded-xl border border-gray-100 bg-white p-4 space-y-3 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50/50 pb-2">
                  <p className="text-xs font-bold text-gray-950 tracking-tight font-mono truncate">İş Akışı ID: #{log.rule_id}</p>
                  <div className="flex flex-wrap gap-1.5 text-[9px] font-bold">
                    <span className="bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 text-emerald-700 rounded-md">Başarılı: {log.sent}</span>
                    <span className="bg-amber-50 border border-amber-100/50 px-2 py-0.5 text-amber-700 rounded-md">Atlanan: {log.skipped}</span>
                    <span className="bg-red-50 border border-red-100/50 px-2 py-0.5 text-red-600 rounded-md">Hata: {log.failed}</span>
                  </div>
                </div>
                
                {/* Mikro Alıcı Detay Log Ögeleri */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
                  {log.recent.slice(0, 6).map((item: any) => (
                    <div key={`${item.id}-${item.status}`} className="rounded-lg border border-gray-50 bg-gray-50/30 p-2.5 space-y-1">
                      <p className="text-[11px] font-bold text-gray-900 truncate font-mono">{item.email || `#${item.attendee_id}`}</p>
                      <p className="text-[10px] font-medium text-gray-400 flex items-center justify-between gap-2 pt-0.5 border-t border-gray-50/50">
                        <span className="capitalize">{item.action_type.replace("_", " ")}</span>
                        <span className={`font-semibold ${item.status === "success" ? "text-emerald-500" : "text-gray-500"}`}>
                          {item.status} · {item.attempts || 0} deneme
                        </span>
                      </p>
                      {item.message && <p className="text-[10px] font-semibold text-red-500 line-clamp-1 pt-0.5" title={item.message}>{item.message}</p>}
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