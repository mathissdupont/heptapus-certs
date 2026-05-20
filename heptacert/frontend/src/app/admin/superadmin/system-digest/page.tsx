"use client";

import { useEffect, useState } from "react";
import { Sparkles, Mail, Loader2 } from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { useI18n } from "@/lib/i18n";
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
    if (config.send_hour < 0 || config.send_hour > 23 || Number.isNaN(config.send_hour)) errs.send_hour = "Must be 0–23";
    if (config.frequency === "weekly") {
      const w = config.send_weekday ?? -1;
      if (w < 0 || w > 6 || Number.isNaN(w)) errs.send_weekday = "Must be 0–6";
    }
    if (config.max_events < 0 || Number.isNaN(config.max_events)) errs.max_events = "Must be 0 or greater";
    if (config.max_posts < 0 || Number.isNaN(config.max_posts)) errs.max_posts = "Must be 0 or greater";
    setFormErrors(errs);
  }, [config]);

  const copy = {
    title: lang === "tr" ? "Sistem Maili" : "System Digest",
    subtitle: lang === "tr" ? "Haftalik/gunluk arkaplan digesti ayarlari" : "Configure scheduled system digest emails",
    save: lang === "tr" ? "Kaydet" : "Save",
    sendNow: lang === "tr" ? "Simdi Gonder" : "Send Now",
  };

  if (loading) return (<div className="flex items-center justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>);

  if (!config) return (<div className="p-6">{error || "No config available"}</div>);

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<Sparkles className="h-5 w-5" />} />

      <div className="card p-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
          <span className="ml-2">{lang === "tr" ? "Etkin" : "Enabled"}</span>
        </label>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-1">{lang === "tr" ? "Siklik" : "Frequency"}</label>
            <select value={config.frequency} onChange={(e) => setConfig({ ...config, frequency: e.target.value as any })} className="input-field w-full">
              <option value="daily">{lang === "tr" ? "Günlük" : "Daily"}</option>
              <option value="weekly">{lang === "tr" ? "Haftalık" : "Weekly"}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-1">{lang === "tr" ? "Gönderim Saati (0-23)" : "Send Hour (0-23)"}</label>
            <input type="number" min={0} max={23} value={config.send_hour} onChange={(e) => setConfig({ ...config, send_hour: Number(e.target.value) })} className={`input-field w-full ${formErrors.send_hour ? "border-red-400" : ""}`} />
            {formErrors.send_hour && <p className="text-xs text-red-400 mt-1">{formErrors.send_hour}</p>}
          </div>

          {config.frequency === "weekly" && (
            <div>
              <label className="block text-sm text-surface-600 mb-1">{lang === "tr" ? "Haftanin Gunu (0=Paz,6=Cum)" : "Send Weekday (0=Sun,6=Sat)"}</label>
              <input type="number" min={0} max={6} value={config.send_weekday ?? 0} onChange={(e) => setConfig({ ...config, send_weekday: Number(e.target.value) })} className={`input-field w-full ${formErrors.send_weekday ? "border-red-400" : ""}`} />
              {formErrors.send_weekday && <p className="text-xs text-red-400 mt-1">{formErrors.send_weekday}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm text-surface-600 mb-1">{lang === "tr" ? "Maks Etkinlik Sayisi" : "Max Events"}</label>
            <input type="number" min={0} value={config.max_events} onChange={(e) => setConfig({ ...config, max_events: Number(e.target.value) })} className={`input-field w-full ${formErrors.max_events ? "border-red-400" : ""}`} />
            {formErrors.max_events && <p className="text-xs text-red-400 mt-1">{formErrors.max_events}</p>}
          </div>

          <div>
            <label className="block text-sm text-surface-600 mb-1">{lang === "tr" ? "Maks Gönderiler" : "Max Posts"}</label>
            <input type="number" min={0} value={config.max_posts} onChange={(e) => setConfig({ ...config, max_posts: Number(e.target.value) })} className={`input-field w-full ${formErrors.max_posts ? "border-red-400" : ""}`} />
            {formErrors.max_posts && <p className="text-xs text-red-400 mt-1">{formErrors.max_posts}</p>}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button disabled={saving || Object.keys(formErrors).length > 0} onClick={async () => {
            try { setSaving(true); setError(null); await updateSystemDigestConfig(config); setSaving(false); setSuccessMessage(lang === "tr" ? "Kaydedildi" : "Saved"); setTimeout(() => setSuccessMessage(null), 4000); }
            catch (e: any) { setSaving(false); setError(e?.message || "Save failed"); }
          }} className="btn-primary">{saving ? "Saving..." : copy.save}</button>

          <button disabled={sending} onClick={async () => {
            if (!confirm(lang === "tr" ? "Sistem digest'ini şimdi göndermek istediğinizden emin misiniz?" : "Send system digest now?")) return;
            try { setSending(true); setError(null); await sendSystemDigestNow(); setSending(false); setSuccessMessage(lang === "tr" ? "Gönderildi" : "Sent"); setTimeout(() => setSuccessMessage(null), 4000); }
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
                win.document.write(j.body_html);
                win.document.close();
              } else {
                alert("Could not open preview window");
              }
            } catch (err: any) {
              setError(err?.message || "Preview failed");
            } finally { setPreviewing(false); }
          }} className="btn-ghost">{previewing ? (lang === "tr" ? "Önizleniyor..." : "Previewing...") : (lang === "tr" ? "Önizle" : "Preview")}</button>
        </div>
        {config.last_sent_at && <p className="mt-4 text-sm text-surface-500">{(lang === "tr" ? "Son gönderim" : "Last sent")}: {new Date(config.last_sent_at).toLocaleString()}</p>}
        <div className="mt-6 grid gap-3 rounded-2xl border border-surface-200 bg-surface-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
              {lang === "tr" ? "Test alÄ±cÄ±sÄ±" : "Test recipient"}
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
              setError(lang === "tr" ? "GeÃ§erli bir test alÄ±cÄ±sÄ± girin" : "Enter a valid test recipient");
              return;
            }
            try {
              setTestSending(true);
              setError(null);
              const res = await sendSystemDigestTest(testEmail.trim());
              setSuccessMessage(`${lang === "tr" ? "Test digest gÃ¶nderildi" : "Test digest sent"}: ${res.to_email}`);
              setTimeout(() => setSuccessMessage(null), 4000);
            } catch (e: any) {
              setError(e?.message || (lang === "tr" ? "Test digest gÃ¶nderilemedi" : "Failed to send test digest"));
            } finally {
              setTestSending(false);
            }
          }} className="btn-secondary">
            {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {testSending
              ? lang === "tr" ? "Test gÃ¶nderiliyor..." : "Sending test..."
              : lang === "tr" ? "Test Digest GÃ¶nder" : "Send Test Digest"}
          </button>
        </div>
        {error && <div className="error-banner mt-4">{error}</div>}
        {successMessage && <div className="success-banner mt-4">{successMessage}</div>}
      </div>
    </div>
  );
}
