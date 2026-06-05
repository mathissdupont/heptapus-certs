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
  Server,
  User,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import { FeatureGate } from "@/lib/useSubscription";
import { useI18n } from "@/lib/i18n";

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

type SavedSMTPAccount = {
  id: number;
  smtp_enabled: boolean;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_use_tls: boolean;
  smtp_user?: string | null;
  from_email?: string | null;
  from_name?: string | null;
  updated_at: string;
  has_password: boolean;
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
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const copy = {
    pageTitle: isTr ? "SMTP Yapılandırması" : "SMTP Configuration",
    pageSubtitle: isTr
      ? "Sertifika ve sistem e-postalarını kendi kurumsal gönderici hesabınız üzerinden güvenle ulaştırın."
      : "Deliver certificate and system emails securely through your own corporate sender account.",
    smtpSettings: isTr ? "SMTP Sunucu Ayarları" : "SMTP Server Settings",
    enableSmtp: isTr ? "Bu hesabın SMTP servis bağlantısını etkinleştir" : "Enable SMTP service connection for this account",
    smtpHost: isTr ? "SMTP Sunucusu (Host)" : "SMTP Server (Host)",
    port: isTr ? "Port" : "Port",
    useTls: isTr ? "TLS / Güvenli şifreli bağlantı katmanı kullan" : "Use TLS / Secure encrypted connection layer",
    username: isTr ? "Kullanıcı Adı" : "Username",
    password: isTr ? "Şifre / Uygulama Şifresi" : "Password / App Password",
    fromEmail: isTr ? "Gönderici E-posta Adresi (From Email)" : "Sender Email Address (From Email)",
    fromName: isTr ? "Gönderici Adı (From Name)" : "Sender Name (From Name)",
    replyTo: isTr ? "Yanıt Adresi (Reply-To)" : "Reply Address (Reply-To)",
    autoCc: isTr ? "Otomatik CC" : "Auto CC",
    trackingPixel: isTr ? "Gelişmiş e-posta açılma takip pikselini aktif tut" : "Enable advanced email open tracking pixel",
    saveConfig: isTr ? "Yapılandırmayı Kaydet" : "Save Configuration",
    saving: isTr ? "Kaydediliyor..." : "Saving...",
    liveConnectionTest: isTr ? "Canlı Bağlantı Testi" : "Live Connection Test",
    testConnection: isTr ? "Bağlantı Testi Yap" : "Test Connection",
    testing: isTr ? "Test Ediliyor..." : "Testing...",
    testEmail: isTr ? "Test E-posta Adresi" : "Test Email Address",
    savedServers: isTr ? "Kayıtlı SMTP Sunucuları" : "Saved SMTP Servers",
    noSavedAccounts: isTr ? "Henüz kayıtlı bir SMTP hesabı bulunmuyor." : "No SMTP accounts saved yet.",
    tlsOpen: isTr ? "Açık" : "On",
    tlsClosed: isTr ? "Kapalı" : "Off",
    credentialsEncrypted: isTr ? "Kimlik bilgisi şifreli" : "Credentials encrypted",
    noPassword: isTr ? "Şifre girilmedi" : "No password set",
    errorLoadFailed: isTr ? "SMTP ayarları yüklenemedi." : "Failed to load SMTP settings.",
    errorRequiredFields: isTr
      ? "SMTP sunucusu, port ve gönderici e-posta adresi gerekli."
      : "SMTP server, port and sender email address are required.",
    successSaved: isTr ? "SMTP yapılandırması başarıyla kaydedildi." : "SMTP configuration saved successfully.",
    errorSaveFailed: isTr ? "SMTP yapılandırması kaydedilemedi." : "Failed to save SMTP configuration.",
    errorTestEmailRequired: isTr ? "Test e-posta adresi gerekli." : "Test email address is required.",
    errorTestFieldsRequired: isTr
      ? "Bağlantı testi için host, port, kullanıcı, şifre ve gönderici e-postası doldurulmalı."
      : "Host, port, user, password and sender email must be filled in for connection test.",
    errorConnectionFailed: isTr ? "SMTP bağlantısı başarısız oldu." : "SMTP connection failed.",
  };

  const [config, setConfig] = useState<SMTPConfig>(DEFAULT_CONFIG);
  const [savedAccounts, setSavedAccounts] = useState<SavedSMTPAccount[]>([]);
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
      const [configResponse, savedAccountsResponse] = await Promise.all([
        apiFetch("/admin/email-config"),
        apiFetch("/admin/email-config/saved-accounts"),
      ]);
      const data = await configResponse.json();
      const savedList = await savedAccountsResponse.json();
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
      setSavedAccounts(Array.isArray(savedList) ? savedList : []);
    } catch (err: any) {
      setError(err?.message || copy.errorLoadFailed);
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
      setError(copy.errorRequiredFields);
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

      setSuccess(copy.successSaved);
      setConfig((prev) => ({ ...prev, smtp_password: "" }));
      await loadConfig();
    } catch (err: any) {
      setError(err?.message || copy.errorSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!testEmail) {
      setError(copy.errorTestEmailRequired);
      return;
    }
    if (!config.smtp_host || !config.smtp_port || !config.smtp_user || !config.smtp_password || !config.from_email) {
      setError(copy.errorTestFieldsRequired);
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
      setTestMessage(err?.message || copy.errorConnectionFailed);
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_320px] antialiased text-surface-900 w-full">

        {/* SOL ALAN: FORM VE BAĞLANTI TESTİ */}
        <div className="space-y-5">
          <PageHeader
            title={copy.pageTitle}
            subtitle={copy.pageSubtitle}
            icon={<Mail className="h-4 w-4 stroke-[2]" />}
          />

          {/* GLOBAL DURUM BANNERLARI */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* ANA SMTP AYAR KARTI */}
          <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="border-b border-surface-100 pb-2.5 text-xs font-bold uppercase tracking-wider text-surface-900">{copy.smtpSettings}</h2>

            {/* Durum Aktiflik Seçimi */}
            <label className="inline-flex cursor-pointer items-center gap-2.5 select-none py-1">
              <input
                type="checkbox"
                checked={config.smtp_enabled}
                onChange={(event) => handleInputChange("smtp_enabled", event.target.checked)}
                className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-surface-800 tracking-tight">{copy.enableSmtp}</span>
            </label>

            {/* Grid Form Girdileri */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.smtpHost}</span>
                <div className="relative">
                  <Server className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400 stroke-[1.8]" />
                  <input
                    type="text"
                    value={config.smtp_host}
                    onChange={(event) => handleInputChange("smtp_host", event.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white pl-9 pr-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                    placeholder="smtp.example.com"
                  />
                </div>
              </label>

              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.port}</span>
                <input
                  type="number"
                  value={config.smtp_port}
                  onChange={(event) => handleInputChange("smtp_port", Number(event.target.value || 0))}
                  className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900"
                />
              </label>
            </div>

            {/* TLS Ayar Seçimi */}
            <label className="inline-flex cursor-pointer items-center gap-2.5 select-none py-1">
              <input
                type="checkbox"
                checked={config.smtp_use_tls}
                onChange={(event) => handleInputChange("smtp_use_tls", event.target.checked)}
                className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-surface-800 tracking-tight">{copy.useTls}</span>
            </label>

            {/* Kimlik Doğrulama Alanları */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.username}</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400 stroke-[1.8]" />
                  <input
                    type="text"
                    value={config.smtp_user}
                    onChange={(event) => handleInputChange("smtp_user", event.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white pl-9 pr-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                    placeholder="hesap@example.com"
                  />
                </div>
              </label>

              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.password}</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400 stroke-[1.8]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={config.smtp_password}
                    onChange={(event) => handleInputChange("smtp_password", event.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white pl-9 pr-9 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                    placeholder="••••••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-900 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            {/* Gönderici Kimlik Bilgileri */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.fromEmail}</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400 stroke-[1.8]" />
                  <input
                    type="email"
                    value={config.from_email}
                    onChange={(event) => handleInputChange("from_email", event.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white pl-9 pr-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                    placeholder="noreply@kurumunuz.com"
                  />
                </div>
              </label>

              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.fromName}</span>
                <input
                  type="text"
                  value={config.from_name}
                  onChange={(event) => handleInputChange("from_name", event.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                  placeholder="HeptaCert"
                />
              </label>
            </div>

            {/* İleri Seviye Yönlendirme Alanları */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.replyTo}</span>
                <input
                  type="email"
                  value={config.reply_to}
                  onChange={(event) => handleInputChange("reply_to", event.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                  placeholder="destek@kurumunuz.com"
                />
              </label>

              <label className="block w-full">
                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.autoCc}</span>
                <input
                  type="text"
                  value={config.auto_cc}
                  onChange={(event) => handleInputChange("auto_cc", event.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                  placeholder="arsiv@kurumunuz.com"
                />
              </label>
            </div>

            {/* Takip Pikseli */}
            <label className="inline-flex cursor-pointer items-center gap-2.5 select-none py-1">
              <input
                type="checkbox"
                checked={config.enable_tracking_pixel}
                onChange={(event) => handleInputChange("enable_tracking_pixel", event.target.checked)}
                className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-surface-800 tracking-tight">{copy.trackingPixel}</span>
            </label>

            {/* Kaydetme Buton İstasyonu */}
            <div className="border-t border-surface-100 pt-4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-[0.98] disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{saving ? copy.saving : copy.saveConfig}</span>
              </button>
            </div>
          </div>

          {/* İKİNCİL KART: BAĞLANTI TEST MODÜLÜ */}
          <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="flex items-center gap-1.5 border-b border-surface-100 pb-2.5 text-xs font-bold uppercase tracking-wider text-surface-900">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 stroke-[1.5]" />
              <span>{copy.liveConnectionTest}</span>
            </h2>

            <label className="block w-full">
              <span className="block text-11 font-bold text-surface-500 mb-1">{copy.testEmail}</span>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                placeholder="dogrulama@example.com"
              />
            </label>

            {/* Test Sonuç Panelleri */}
            {testResult && (
              <div className={`rounded-xl border p-3.5 text-xs font-semibold flex items-start gap-2.5 ${
                testResult === "success" ? "border-emerald-100 bg-emerald-50/40 text-emerald-600" : "border-red-100 bg-red-50/40 text-red-600"
              }`}>
                {testResult === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span className="leading-relaxed">{testMessage}</span>
              </div>
            )}

            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-white px-4 text-xs font-semibold text-surface-800 shadow-sm transition hover:bg-surface-50 active:scale-95 disabled:opacity-40"
            >
              {testing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{copy.testing}</span>
                </>
              ) : (
                <>
                  <TestTube className="h-3.5 w-3.5 text-surface-500 stroke-[2]" />
                  <span>{copy.testConnection}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SAĞ YAN SÜTUN: KAYITLI SMTP HESAPLARI LİSTESİ */}
        <aside className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm space-y-4 h-fit">
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900 border-b border-surface-100 pb-2.5">{copy.savedServers}</h2>

          {savedAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-200 bg-surface-50/30 p-4 text-center">
              <p className="text-11 font-semibold text-surface-400">{copy.noSavedAccounts}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {savedAccounts.map((account) => (
                <div key={account.id} className="rounded-xl border border-surface-100/80 bg-white p-3.5 shadow-sm space-y-2.5 hover:border-surface-200 transition-colors">
                  <div className="flex items-center justify-between gap-2.5">
                    <p className="truncate text-xs font-bold text-surface-900 tracking-tight">
                      {account.from_name || account.from_email || "SMTP Sunucusu"}
                    </p>
                    <span
                      className={`shrink-0 inline-flex rounded-md border px-1.5 py-0.5 text-11 font-bold uppercase tracking-tight shadow-sm ${
                        account.smtp_enabled
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700 animate-pulse"
                          : "border-surface-100 bg-surface-50 text-surface-400"
                      }`}
                    >
                      {account.smtp_enabled ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  {/* Teknik Detay Matrisi */}
                  <div className="space-y-1 text-11 font-medium text-surface-500 leading-normal font-mono border-t border-gray-50/50 pt-2">
                    <p className="truncate"><span className="text-surface-300 font-sans font-semibold">Host:</span> {account.smtp_host || "-"}</p>
                    <p><span className="text-surface-300 font-sans font-semibold">Port/TLS:</span> {account.smtp_port || "-"} · {account.smtp_use_tls ? copy.tlsOpen : copy.tlsClosed}</p>
                    <p className="truncate"><span className="text-surface-300 font-sans font-semibold">User:</span> {account.smtp_user || "-"}</p>
                    <p className="truncate"><span className="text-surface-300 font-sans font-semibold">{isTr ? "Gönderici" : "Sender"}:</span> {account.from_email || "-"}</p>
                    <p className="flex items-center gap-1">
                      <ShieldCheck className={`h-3 w-3 ${account.has_password ? "text-emerald-500" : "text-surface-300"}`} />
                      <span className="font-sans font-medium text-11 text-surface-400">{account.has_password ? copy.credentialsEncrypted : copy.noPassword}</span>
                    </p>
                    <p className="text-11 text-surface-400 font-sans pt-1 border-t border-gray-50/30">
                      {new Date(account.updated_at).toLocaleDateString(isTr ? "tr-TR" : "en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

      </div>
    </FeatureGate>
  );
}
