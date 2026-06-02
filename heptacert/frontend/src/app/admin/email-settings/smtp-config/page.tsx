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
      await loadConfig();
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
      <div className="flex w-full items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_320px] antialiased text-gray-900 w-full">
        
        {/* SOL ALAN: FORM VE BAĞLANTI TESTİ */}
        <div className="space-y-5">
          <PageHeader
            title="SMTP Yapılandırması"
            subtitle="Sertifika ve sistem e-postalarını kendi kurumsal gönderici hesabınız üzerinden güvenle ulaştırın."
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
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="border-b border-gray-100 pb-2.5 text-xs font-bold uppercase tracking-wider text-gray-950">SMTP Sunucu Ayarları</h2>

            {/* Durum Aktiflik Seçimi */}
            <label className="inline-flex cursor-pointer items-center gap-2.5 select-none py-1">
              <input
                type="checkbox"
                checked={config.smtp_enabled}
                onChange={(event) => handleInputChange("smtp_enabled", event.target.checked)}
                className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-800 tracking-tight">Bu hesabın SMTP servis bağlantısını etkinleştir</span>
            </label>

            {/* Grid Form Girdileri */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">SMTP Sunucusu (Host)</span>
                <div className="relative">
                  <Server className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 stroke-[1.8]" />
                  <input
                    type="text"
                    value={config.smtp_host}
                    onChange={(event) => handleInputChange("smtp_host", event.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                    placeholder="smtp.example.com"
                  />
                </div>
              </label>

              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Port</span>
                <input
                  type="number"
                  value={config.smtp_port}
                  onChange={(event) => handleInputChange("smtp_port", Number(event.target.value || 0))}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </label>
            </div>

            {/* TLS Ayar Seçimi */}
            <label className="inline-flex cursor-pointer items-center gap-2.5 select-none py-1">
              <input
                type="checkbox"
                checked={config.smtp_use_tls}
                onChange={(event) => handleInputChange("smtp_use_tls", event.target.checked)}
                className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-800 tracking-tight">TLS / Güvenli şifreli bağlantı katmanı kullan</span>
            </label>

            {/* Kimlik Doğrulama Alanları */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Kullanıcı Adı</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 stroke-[1.8]" />
                  <input
                    type="text"
                    value={config.smtp_user}
                    onChange={(event) => handleInputChange("smtp_user", event.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                    placeholder="hesap@example.com"
                  />
                </div>
              </label>

              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Şifre / Uygulama Şifresi</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 stroke-[1.8]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={config.smtp_password}
                    onChange={(event) => handleInputChange("smtp_password", event.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white pl-9 pr-9 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                    placeholder="••••••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            {/* Gönderici Kimlik Bilgileri */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Gönderici E-posta Adresi (From Email)</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 stroke-[1.8]" />
                  <input
                    type="email"
                    value={config.from_email}
                    onChange={(event) => handleInputChange("from_email", event.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                    placeholder="noreply@kurumunuz.com"
                  />
                </div>
              </label>

              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Gönderici Adı (From Name)</span>
                <input
                  type="text"
                  value={config.from_name}
                  onChange={(event) => handleInputChange("from_name", event.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                  placeholder="HeptaCert"
                />
              </label>
            </div>

            {/* İleri Seviye Yönlendirme Alanları */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Yanıt Adresi (Reply-To)</span>
                <input
                  type="email"
                  value={config.reply_to}
                  onChange={(event) => handleInputChange("reply_to", event.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                  placeholder="destek@kurumunuz.com"
                />
              </label>

              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">Otomatik CC</span>
                <input
                  type="text"
                  value={config.auto_cc}
                  onChange={(event) => handleInputChange("auto_cc", event.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
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
                className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-800 tracking-tight">Gelişmiş e-posta açılma takip pikselini aktif tut</span>
            </label>

            {/* Kaydetme Buton İstasyonu */}
            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-98 disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{saving ? "Kaydediliyor..." : "Yapılandırmayı Kaydet"}</span>
              </button>
            </div>
          </div>

          {/* İKİNCİL KART: BAĞLANTI TEST MODÜLÜ */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="flex items-center gap-1.5 border-b border-gray-100 pb-2.5 text-xs font-bold uppercase tracking-wider text-gray-950">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 stroke-[1.5]" />
              <span>Canlı Bağlantı Testi</span>
            </h2>

            <label className="block w-full">
              <span className="block text-[11px] font-bold text-gray-500 mb-1">Test E-posta Adresi</span>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
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
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-40"
            >
              {testing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Test Ediliyor...</span>
                </>
              ) : (
                <>
                  <TestTube className="h-3.5 w-3.5 text-gray-500 stroke-[2]" />
                  <span>Bağlantı Testi Yap</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SAĞ YAN SÜTUN: KAYITLI SMTP HESAPLARI LİSTESİ */}
        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 h-fit">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2.5">Kayıtlı SMTP Sunucuları</h2>
          
          {savedAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/30 p-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400">Henüz kayıtlı bir SMTP hesabı bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {savedAccounts.map((account) => (
                <div key={account.id} className="rounded-xl border border-gray-100/80 bg-white p-3.5 shadow-sm space-y-2.5 hover:border-gray-200 transition-colors">
                  <div className="flex items-center justify-between gap-2.5">
                    <p className="truncate text-xs font-bold text-gray-950 tracking-tight">
                      {account.from_name || account.from_email || "SMTP Sunucusu"}
                    </p>
                    <span
                      className={`shrink-0 inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight shadow-sm ${
                        account.smtp_enabled 
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700 animate-pulse" 
                          : "border-gray-100 bg-gray-50 text-gray-400"
                      }`}
                    >
                      {account.smtp_enabled ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  
                  {/* Teknik Detay Matrisi */}
                  <div className="space-y-1 text-[11px] font-medium text-gray-500 leading-normal font-mono border-t border-gray-50/50 pt-2">
                    <p className="truncate"><span className="text-gray-300 font-sans font-semibold">Host:</span> {account.smtp_host || "-"}</p>
                    <p><span className="text-gray-300 font-sans font-semibold">Port/TLS:</span> {account.smtp_port || "-"} · {account.smtp_use_tls ? "Açık" : "Kapalı"}</p>
                    <p className="truncate"><span className="text-gray-300 font-sans font-semibold">User:</span> {account.smtp_user || "-"}</p>
                    <p className="truncate"><span className="text-gray-300 font-sans font-semibold">Gönderici:</span> {account.from_email || "-"}</p>
                    <p className="flex items-center gap-1">
                      <ShieldCheck className={`h-3 w-3 ${account.has_password ? "text-emerald-500" : "text-gray-300"}`} />
                      <span className="font-sans font-medium text-[10px] text-gray-400">{account.has_password ? "Kimlik bilgisi şifreli" : "Şifre girilmedi"}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 font-sans pt-1 border-t border-gray-50/30">
                      {new Date(account.updated_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
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