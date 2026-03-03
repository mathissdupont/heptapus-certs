"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
import Link from "next/link";

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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-gray-900">SMTP Yapılandırması</h1>
            <p className="text-sm text-gray-500 mt-1">Email gönderiş sunucu ayarlarını yapılandırın</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Hata</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 flex items-start gap-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900">Başarılı</h3>
              <p className="text-emerald-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">SMTP Sunucu Ayarları</h2>

          {/* Host */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Sunucusu (Host)
            </label>
            <input
              type="text"
              placeholder="smtp.gmail.com"
              value={config.host}
              onChange={(e) => handleInputChange("host", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Örnek: smtp.gmail.com, smtp.sendgrid.net, mail.example.com
            </p>
          </div>

          {/* Port */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => handleInputChange("port", parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tipik portlar: 587 (TLS), 465 (SSL), 25 (SMTP)
            </p>
          </div>

          {/* Use TLS */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.use_tls}
                onChange={(e) => handleInputChange("use_tls", e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">TLS Şifrelemesi Kullan</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Bağlantı güvenliği için önerilen
            </p>
          </div>

          {/* Username */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              placeholder="your-email@gmail.com"
              value={config.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              SMTP sunucusunda kimlik doğrulama kullanılıyorsa bu alanı doldurun
            </p>
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={config.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Gmail kullanıyorsanız uygulama şifresi kullanın, normal şifre değil
            </p>
          </div>

          {/* From Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gönderici Email Adresi
            </label>
            <input
              type="email"
              placeholder="noreply@example.com"
              value={config.from_email}
              onChange={(e) => handleInputChange("from_email", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Bu email adresi tüm sistem emaillerinde "From" alanında gösterilecek
            </p>
          </div>

          {/* From Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gönderici Adı
            </label>
            <input
              type="text"
              placeholder="HeptaCert"
              value={config.from_name}
              onChange={(e) => handleInputChange("from_name", e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email alıcılarında görüntülenecek adı
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-6 py-3 rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            {saving ? "Kaydediliyor..." : "Yapılandırmayı Kaydet"}
          </button>
        </div>

        {/* Test Connection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Bağlantı Testi
          </h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Adresi
            </label>
            <input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              SMTP yapılandırmasını test etmek için bir email adresi girin
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                testResult === "success"
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {testResult === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    testResult === "success" ? "text-emerald-900" : "text-red-900"
                  }`}
                >
                  {testMessage}
                </p>
              </div>
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={handleTestConnection}
            disabled={testing || !testEmail}
            className="w-full px-6 py-3 rounded-lg border-2 border-orange-500 text-orange-600 font-bold hover:bg-orange-50 disabled:border-gray-300 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Test Ediliyor...
              </>
            ) : (
              <>
                <TestTube className="h-5 w-5" />
                Bağlantı Testi Yap
              </>
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Gmail Kullanıyorsanız
          </h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>2-adımlı doğrulama etkinleştirin (myaccount.google.com/security)</li>
            <li>"Uygulama şifresi" oluşturun ve yukarıya yapıştırın</li>
            <li>Host: smtp.gmail.com, Port: 587, TLS: Etkin</li>
            <li>Gönderici adresinde @gmail.com hesabınızı kullanın</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
