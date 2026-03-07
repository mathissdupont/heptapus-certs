"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Save,
  TestTube,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";

interface SMTPConfig {
  host: string;
  port: number;
  use_tls: boolean;
  username?: string;
  password?: string;
  from_email: string;
  from_name?: string;
}

export default function SMTPConfigurationPage() {
  const router = useRouter();

  const [config, setConfig] = useState<SMTPConfig>({
    host: "",
    port: 587,
    use_tls: true,
    username: "",
    password: "",
    from_email: "",
    from_name: "HeptaCert",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Simulate loading existing SMTP config
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (key: keyof SMTPConfig, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!config.host || !config.port || !config.from_email) {
      setError("SMTP sunucusu, port ve gönderici email gerekli");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // In a real app, this would call an API endpoint
      // await updateSMTPConfig(config);
      
      setSuccess("SMTP yapılandırması başarıyla kaydedildi!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      console.error("Failed to save SMTP config:", e);
      setError(e?.message || "SMTP yapılandırması kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      setError("Test email adresi gerekli");
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setTestResult(null);
      setTestMessage(null);

      // In a real app, this would call an API endpoint
      // await testSMTPConnection({ ...config, test_email: testEmail });
      
      // Simulate successful test
      setTimeout(() => {
        setTestResult("success");
        setTestMessage("Bağlantı başarılı! Test email gönderildi.");
        setTesting(false);
      }, 2000);
    } catch (e: any) {
      console.error("Failed to test SMTP:", e);
      setTestResult("error");
      setTestMessage(e?.message || "SMTP bağlantısı başarısız oldu");
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="SMTP Yapılandırması"
        subtitle="Email gönderim sunucu ayarlarını yapılandırın"
        icon={<Mail className="h-5 w-5" />}
      />

      {/* Error/Success */}
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

      {/* Configuration Form */}
      <div className="card p-6 space-y-5">
        <h2 className="text-base font-semibold text-surface-800 pb-1 border-b border-surface-100">SMTP Sunucu Ayarları</h2>

        {/* Host */}
        <div>
          <label className="label">SMTP Sunucusu (Host)</label>
          <input
            type="text"
            placeholder="smtp.gmail.com"
            value={config.host}
            onChange={(e) => handleInputChange("host", e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-surface-400 mt-1.5">Örnek: smtp.gmail.com, smtp.sendgrid.net</p>
        </div>

        {/* Port */}
        <div>
          <label className="label">Port</label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => handleInputChange("port", parseInt(e.target.value))}
            className="input-field"
          />
          <p className="text-xs text-surface-400 mt-1.5">Tipik portlar: 587 (TLS), 465 (SSL), 25 (SMTP)</p>
        </div>

        {/* Use TLS */}
        <div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.use_tls}
              onChange={(e) => handleInputChange("use_tls", e.target.checked)}
              className="w-4 h-4 rounded accent-brand-600"
            />
            <span className="text-sm font-medium text-surface-700">TLS Şifrelemesi Kullan</span>
          </label>
          <p className="text-xs text-surface-400 mt-1.5 ml-6.5">Bağlantı güvenliği için önerilen</p>
        </div>

        {/* Username */}
        <div>
          <label className="label">Kullanıcı Adı</label>
          <input
            type="text"
            placeholder="your-email@gmail.com"
            value={config.username}
            onChange={(e) => handleInputChange("username", e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-surface-400 mt-1.5">SMTP kimlik doğrulaması için kullanıcı adınızı</p>
        </div>

        {/* Password */}
        <div>
          <label className="label">Şifre</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={config.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="input-field pl-10 pr-10"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-surface-400 mt-1.5">Gmail kullanıyorsanız uygulama şifresi kullanın</p>
        </div>

        {/* From Email */}
        <div>
          <label className="label">Gönderici Email Adresi</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="email"
              placeholder="noreply@example.com"
              value={config.from_email}
              onChange={(e) => handleInputChange("from_email", e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <p className="text-xs text-surface-400 mt-1.5">Tüm sistem emaillerinde "From" alanında gösterilir</p>
        </div>

        {/* From Name */}
        <div>
          <label className="label">Gönderici Adı</label>
          <input
            type="text"
            placeholder="HeptaCert"
            value={config.from_name}
            onChange={(e) => handleInputChange("from_name", e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-surface-400 mt-1.5">Email alıcılarında görüntülenecek ad</p>
        </div>

        {/* Save Button */}
        <div className="pt-2 border-t border-surface-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Kaydediliyor..." : "Yapılandırmayı Kaydet"}
          </button>
        </div>
      </div>

      {/* Test Connection */}
      <div className="card p-6 space-y-5">
        <h2 className="text-base font-semibold text-surface-800 pb-1 border-b border-surface-100 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Bağlantı Testi
        </h2>

        <div>
          <label className="label">Test Email Adresi</label>
          <input
            type="email"
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-surface-400 mt-1.5">SMTP yapılandırmasını test etmek için bir email adresi girin</p>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={testResult === "success" ? "success-banner" : "error-banner"}>
            {testResult === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{testMessage}</span>
          </div>
        )}

        {/* Test Button */}
        <button
          onClick={handleTestConnection}
          disabled={testing || !testEmail}
          className="btn-secondary gap-2"
        >
          {testing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Test Ediliyor...</>
          ) : (
            <><TestTube className="h-4 w-4" /> Bağlantı Testi Yap</>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="info-banner rounded-xl p-5 space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Gmail Kullanıyorsanız
        </h3>
        <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
          <li>2-adımlı doğrulama etkinleştirin (myaccount.google.com/security)</li>
          <li>"Uygulama şifresi" oluşturun ve yukarıya yapıştırın</li>
          <li>Host: smtp.gmail.com, Port: 587, TLS: Etkin</li>
          <li>Gönderici adresinde @gmail.com hesabınızı kullanın</li>
        </ul>
      </div>
    </div>
  );
}
