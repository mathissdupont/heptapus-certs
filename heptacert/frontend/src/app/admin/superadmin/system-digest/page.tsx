"use client";

import { useEffect, useState } from "react";
import { Sparkles, Mail, Loader2 } from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { useI18n, translate } from "@/lib/i18n";
import { getSystemDigestConfig, updateSystemDigestConfig, sendSystemDigestNow, sendSystemDigestTest, SystemEmailDigestConfigOut } from "@/lib/api";

export default function SuperadminSystemDigestPage() {
  const { lang } = useI18n();
  const [config, setConfig] = useState<SystemEmailDigestConfigOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [previewing, setPreviewing] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const c = await getSystemDigestConfig();
        setConfig(c);
      } catch (e: any) {
        setError(e?.message || "Failed to load config");
      } finally {
        setLoading(false);
      }
    })();
  }, [lang]);

  useEffect(() => {
    if (!config) return;
    const errs: Record<string, string> = {};
    if (config.send_hour < 0 || config.send_hour > 23 || Number.isNaN(config.send_hour)) errs.send_hour = "Must be 0-23";
    if (config.frequency === "weekly") {
      const w = config.send_weekday ?? -1;
      if (w < 0 || w > 6 || Number.isNaN(w)) errs.send_weekday = "Must be 0-6";
    }
    if (config.max_events < 0 || Number.isNaN(config.max_events)) errs.max_events = "Must be 0 or greater";
    if (config.max_posts < 0 || Number.isNaN(config.max_posts)) errs.max_posts = "Must be 0 or greater";
    setFormErrors(errs);
  }, [config]);

  const copy = {
    title: translate(lang, "migrated_app_admin_superadmin_system_digest_system_digest_7bef07d8"),
    subtitle: translate(lang, "migrated_app_admin_superadmin_system_digest_configure_scheduled_system_digest_emails_c53b120b"),
    save: translate(lang, "migrated_app_admin_superadmin_system_digest_save_99f14ae0"),
    sendNow: translate(lang, "migrated_app_admin_superadmin_system_digest_send_now_6b9041bd"),
  };

  if (loading) return (<div className="flex items-center justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>);

  if (!config) return (<div className="p-6">{error || "No config available"}</div>);

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<Sparkles className="h-5 w-5" />} />

      <div className="card p-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
          <span className="ml-2">{translate(lang, "migrated_app_admin_superadmin_system_digest_enabled_71c10122")}</span>
        </label>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-1">{translate(lang, "migrated_app_admin_superadmin_system_digest_frequency_adcdd102")}</label>
            <select value={config.frequency} onChange={(e) => setConfig({ ...config, frequency: e.target.value as any })} className="input-field w-full">
              <option value="daily">{translate(lang, "migrated_app_admin_superadmin_system_digest_daily_84a9ea51")}</option>
              <option value="weekly">{translate(lang, "migrated_app_admin_superadmin_system_digest_weekly_b3a07e44")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-1">{translate(lang, "migrated_app_admin_superadmin_system_digest_send_hour_0_23_45e41847")}</label>
            <input type="number" min={0} max={23} value={config.send_hour} onChange={(e) => setConfig({ ...config, send_hour: Number(e.target.value) })} className={`input-field w-full ${formErrors.send_hour ? "border-status-danger-border" : ""}`} />
            {formErrors.send_hour && <p className="text-xs text-status-danger-content mt-1">{formErrors.send_hour}</p>}
          </div>

          {config.frequency === "weekly" && (
            <div>
              <label className="block text-sm text-surface-600 mb-1">{translate(lang, "migrated_app_admin_superadmin_system_digest_send_weekday_0_sun_6_sat_d029f256")}</label>
              <input type="number" min={0} max={6} value={config.send_weekday ?? 0} onChange={(e) => setConfig({ ...config, send_weekday: Number(e.target.value) })} className={`input-field w-full ${formErrors.send_weekday ? "border-status-danger-border" : ""}`} />
              {formErrors.send_weekday && <p className="text-xs text-status-danger-content mt-1">{formErrors.send_weekday}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm text-surface-600 mb-1">{translate(lang, "migrated_app_admin_superadmin_system_digest_max_events_bf4d9a01")}</label>
            <input type="number" min={0} value={config.max_events} onChange={(e) => setConfig({ ...config, max_events: Number(e.target.value) })} className={`input-field w-full ${formErrors.max_events ? "border-status-danger-border" : ""}`} />
            {formErrors.max_events && <p className="text-xs text-status-danger-content mt-1">{formErrors.max_events}</p>}
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-1">{translate(lang, "migrated_app_admin_superadmin_system_digest_max_posts_59244c56")}</label>
            <input type="number" min={0} value={config.max_posts} onChange={(e) => setConfig({ ...config, max_posts: Number(e.target.value) })} className={`input-field w-full ${formErrors.max_posts ? "border-status-danger-border" : ""}`} />
            {formErrors.max_posts && <p className="text-xs text-status-danger-content mt-1">{formErrors.max_posts}</p>}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button disabled={saving || Object.keys(formErrors).length > 0} onClick={async () => {
            try { setSaving(true); setError(null); await updateSystemDigestConfig(config); setSaving(false); setSuccessMessage(translate(lang, "migrated_app_admin_superadmin_system_digest_saved_dc738aea")); setTimeout(() => setSuccessMessage(null), 4000); }
            catch (e: any) { setSaving(false); setError(e?.message || "Save failed"); }
          }} className="btn-primary">{saving ? "Saving..." : copy.save}</button>

          <button disabled={sending} onClick={async () => {
            if (!confirm(translate(lang, "migrated_app_admin_superadmin_system_digest_send_system_digest_now_bb86be01"))) return;
            try { setSending(true); setError(null); await sendSystemDigestNow(); setSending(false); setSuccessMessage(translate(lang, "migrated_app_admin_superadmin_system_digest_sent_e6516f52")); setTimeout(() => setSuccessMessage(null), 4000); }
            catch (e: any) { setSending(false); setError(e?.message || "Send failed"); }
          }} className="btn-secondary">{sending ? "Sending..." : copy.sendNow}</button>

          <button disabled={previewing} onClick={async () => {
            try {
              setPreviewing(true);
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api"}/superadmin/system-digest/preview`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("heptacert_token") || ""}` },
                cache: "no-store",
              });
              if (!res.ok) throw new Error("Preview request failed");
              const j = await res.json();
              const win = window.open("about:blank", "_blank");
              if (win) {
                win.document.open();
                win.document.write('<!doctype html><html><head><title>Email preview</title><style>html,body,iframe{height:100%;width:100%;margin:0;border:0}</style></head><body><iframe id="email-preview" sandbox=""></iframe></body></html>');
                win.document.close();
                const frame = win.document.getElementById("email-preview") as HTMLIFrameElement | null;
                if (frame) frame.srcdoc = String(j.body_html || "");
              } else {
                alert("Could not open preview window");
              }
            } catch (err: any) {
              setError(err?.message || "Preview failed");
            } finally { setPreviewing(false); }
          }} className="btn-ghost">{previewing ? (translate(lang, "migrated_app_admin_superadmin_system_digest_previewing_7b71d18b")) : (translate(lang, "migrated_app_admin_superadmin_system_digest_preview_8d23e7fe"))}</button>
        </div>
        {config.last_sent_at && <p className="mt-4 text-sm text-surface-500">{(translate(lang, "migrated_app_admin_superadmin_system_digest_last_sent_0815fe0a"))}: {new Date(config.last_sent_at).toLocaleString()}</p>}
        <div className="mt-6 grid gap-3 rounded-2xl border border-surface-200 bg-surface-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
              {translate(lang, "migrated_app_admin_superadmin_system_digest_test_recipient_71da74cf")}
            </span>
            <input
              type="email"
              className="input-field w-full"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button disabled={testSending} onClick={async () => {
            if (!testEmail.trim() || !testEmail.includes("@")) {
              setError(translate(lang, "migrated_app_admin_superadmin_system_digest_enter_a_valid_test_recipient_81e02928"));
              return;
            }
            try {
              setTestSending(true);
              setError(null);
              const res = await sendSystemDigestTest(testEmail.trim());
              setSuccessMessage(`${translate(lang, "migrated_app_admin_superadmin_system_digest_test_digest_sent_2101041f")}: ${res.to_email}`);
              setTimeout(() => setSuccessMessage(null), 4000);
            } catch (e: any) {
              setError(e?.message || (translate(lang, "migrated_app_admin_superadmin_system_digest_failed_to_send_test_digest_a88ad8f2")));
            } finally {
              setTestSending(false);
            }
          }} className="btn-secondary">
            {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {testSending
              ? translate(lang, "migrated_app_admin_superadmin_system_digest_sending_test_4420c34a")
              : translate(lang, "migrated_app_admin_superadmin_system_digest_send_test_digest_d52bbc31")}
          </button>
        </div>
        {error && <div className="error-banner mt-4">{error}</div>}
        {successMessage && <div className="success-banner mt-4">{successMessage}</div>}
      </div>
    </div>
  );
}
