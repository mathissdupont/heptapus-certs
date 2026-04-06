"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Save,
  TestTube,
  XCircle,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { FeatureGate } from "@/lib/useSubscription";
import { apiFetch } from "@/lib/api";

type SMTPConfig = {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  reply_to: string;
  auto_cc: string;
  enable_tracking_pixel: boolean;
};

const DEFAULT_CONFIG: SMTPConfig = {
  smtp_enabled: false,
  smtp_host: "",
  smtp_port: 587,
  smtp_use_tls: true,
  smtp_user: "",
  smtp_password: "",
  from_email: "",
  from_name: "HeptaCert",
  reply_to: "",
  auto_cc: "",
  enable_tracking_pixel: false,
};

export default function SMTPConfigurationPage() {
  const [config, setConfig] = useState<SMTPConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/admin/email-config");
      const data = await response.json();
      setConfig({
        smtp_enabled: Boolean(data.smtp_enabled),
        smtp_host: data.smtp_host || "",
        smtp_port: data.smtp_port || 587,
        smtp_use_tls: data.smtp_use_tls ?? true,
        smtp_user: data.smtp_user || "",
        smtp_password: "",
        from_email: data.from_email || "",
        from_name: data.from_name || "HeptaCert",
        reply_to: data.reply_to || "",
        auto_cc: data.auto_cc || "",
        enable_tracking_pixel: Boolean(data.enable_tracking_pixel),
      });
    } catch (err: any) {
      setError(err?.message || "SMTP ayarları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange<K extends keyof SMTPConfig>(key: K, value: SMTPConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }

  async function handleSave() {
    if (!config.smtp_host || !config.smtp_port || !config.from_email) {
      setError("SMTP sunucusu, port ve gönderici e-posta adresi gerekli.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiFetch("/admin/email-config", {
        method: "PATCH",
        body: JSON.stringify(config),
      });

      setSuccess("SMTP yapılandırması başarıyla kaydedildi.");
      setConfig((prev) => ({ ...prev, smtp_password: "" }));
    } catch (err: any) {
      setError(err?.message || "SMTP yapılandırması kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!testEmail) {
      setError("Test e-posta adresi gerekli.");
      return;
    }
    if (!config.smtp_host || !config.smtp_port || !config.smtp_user || !config.smtp_password || !config.from_email) {
      setError("Bağlantı testi için host, port, kullanıcı, şifre ve gönderici e-postası doldurulmalı.");
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setTestResult(null);
      setTestMessage(null);

      const response = await apiFetch("/admin/email-config/test-connection", {
        method: "POST",
        body: JSON.stringify({
          smtp_host: config.smtp_host,
          smtp_port: config.smtp_port,
          smtp_use_tls: config.smtp_use_tls,
          smtp_user: config.smtp_user,
          smtp_password: config.smtp_password,
          from_email: config.from_email,
          test_email: testEmail,
        }),
      });
      const data = await response.json();
      setTestResult(data.status === "success" ? "success" : "error");
      setTestMessage(data.message || null);
    } catch (err: any) {
      setTestResult("error");
      setTestMessage(err?.message || "SMTP bağlantısı başarısız oldu.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="max-w-2xl space-y-6">
        <PageHeader
          title="SMTP Yapılandırması"
          subtitle="Doğrulama, sertifika ve kampanya e-postalarını kendi gönderici hesabınız üzerinden yollayın."
          icon={<Mail className="h-5 w-5" />}
        />

        {error && (
          <div className="error-banner">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="success-banner">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="card space-y-5 p-6">
          <h2 className="border-b border-surface-100 pb-1 text-base font-semibold text-surface-800">SMTP Sunucu Ayarları</h2>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={config.smtp_enabled}
              onChange={(event) => handleInputChange("smtp_enabled", event.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            <span className="text-sm font-medium text-surface-700">Bu hesabın SMTP ayarlarını etkinleştir</span>
          </label>

          <div>
            <label className="label">SMTP Sunucusu</label>
            <input
              type="text"
              value={config.smtp_host}
              onChange={(event) => handleInputChange("smtp_host", event.target.value)}
              className="input-field"
              placeholder="smtp.gmail.com"
            />
          </div>

          <div>
            <label className="label">Port</label>
            <input
              type="number"
              value={config.smtp_port}
              onChange={(event) => handleInputChange("smtp_port", Number(event.target.value || 0))}
              className="input-field"
            />
          </div>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={config.smtp_use_tls}
              onChange={(event) => handleInputChange("smtp_use_tls", event.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            <span className="text-sm font-medium text-surface-700">TLS / güvenli bağlantı kullan</span>
          </label>

          <div>
            <label className="label">Kullanıcı Adı</label>
            <input
              type="text"
              value={config.smtp_user}
              onChange={(event) => handleInputChange("smtp_user", event.target.value)}
              className="input-field"
              placeholder="your-email@gmail.com"
            />
          </div>

          <div>
            <label className="label">Şifre / Uygulama Şifresi</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={config.smtp_password}
                onChange={(event) => handleInputChange("smtp_password", event.target.value)}
                className="input-field pl-10 pr-10"
                placeholder="Şifrenizi yalnızca değiştirecekseniz yeniden girin"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Gönderici E-posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="email"
                value={config.from_email}
                onChange={(event) => handleInputChange("from_email", event.target.value)}
                className="input-field pl-10"
                placeholder="noreply@example.com"
              />
            </div>
          </div>

          <div>
            <label className="label">Gönderici Adı</label>
            <input
              type="text"
              value={config.from_name}
              onChange={(event) => handleInputChange("from_name", event.target.value)}
              className="input-field"
              placeholder="HeptaCert"
            />
          </div>

          <div>
            <label className="label">Yanıt Adresi</label>
            <input
              type="email"
              value={config.reply_to}
              onChange={(event) => handleInputChange("reply_to", event.target.value)}
              className="input-field"
              placeholder="destek@example.com"
            />
          </div>

          <div>
            <label className="label">Otomatik CC</label>
            <input
              type="text"
              value={config.auto_cc}
              onChange={(event) => handleInputChange("auto_cc", event.target.value)}
              className="input-field"
              placeholder="ekip@example.com"
            />
          </div>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={config.enable_tracking_pixel}
              onChange={(event) => handleInputChange("enable_tracking_pixel", event.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            <span className="text-sm font-medium text-surface-700">Takip pikseli ayarını sakla</span>
          </label>

          <div className="border-t border-surface-100 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Kaydediliyor..." : "Yapılandırmayı Kaydet"}
            </button>
          </div>
        </div>

        <div className="card space-y-5 p-6">
          <h2 className="flex items-center gap-2 border-b border-surface-100 pb-1 text-base font-semibold text-surface-800">
            <Zap className="h-4 w-4 text-amber-500" />
            Bağlantı Testi
          </h2>

          <div>
            <label className="label">Test E-posta Adresi</label>
            <input
              type="email"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              className="input-field"
              placeholder="test@example.com"
            />
          </div>

          {testResult && (
            <div className={testResult === "success" ? "success-banner" : "error-banner"}>
              {testResult === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              <span>{testMessage}</span>
            </div>
          )}

          <button onClick={handleTestConnection} disabled={testing} className="btn-secondary gap-2">
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Test Ediliyor...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4" />
                Bağlantı Testi Yap
              </>
            )}
          </button>
        </div>
      </div>
    </FeatureGate>
  );
}
