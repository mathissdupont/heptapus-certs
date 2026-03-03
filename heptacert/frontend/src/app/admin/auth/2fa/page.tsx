"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Check,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { get2FAStatus, setup2FA, enable2FA, disable2FA, TwoFAStatusOut } from "@/lib/api";

export default function TwoFAManagementPage() {
  const router = useRouter();

  const [status, setStatus] = useState<TwoFAStatusOut | null>(null);
  const [setupData, setSetupData] = useState<TwoFAStatusOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setError(null);
      const data = await get2FAStatus();
      setStatus(data);
    } catch (e: any) {
      console.error("Failed to load 2FA status:", e);
      setError(e?.message || "2FA durumu yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupClick = async () => {
    try {
      setError(null);
      const data = await setup2FA();
      setSetupData(data);
      setShowSetupModal(true);
    } catch (e: any) {
      console.error("Failed to setup 2FA:", e);
      setError(e?.message || "2FA kurulumu başarısız");
    }
  };

  const handleEnable = async () => {
    if (!verificationCode.trim()) {
      setError("Doğrulama kodu gerekli");
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      await enable2FA(verificationCode);
      await fetchStatus();
      setShowSetupModal(false);
      setVerificationCode("");
    } catch (e: any) {
      console.error("Failed to enable 2FA:", e);
      setError(e?.message || "2FA etkinleştirilemedi");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword.trim()) {
      setError("Şifre gerekli");
      return;
    }

    try {
      setDisabling(true);
      setError(null);
      await disable2FA(disablePassword);
      await fetchStatus();
      setDisablePassword("");
    } catch (e: any) {
      console.error("Failed to disable 2FA:", e);
      setError(e?.message || "2FA devre dışı bırakılamadı");
    } finally {
      setDisabling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h1 className="text-3xl font-black text-gray-900">İki Faktörlü Kimlik Doğrulama</h1>
            <p className="text-sm text-gray-500 mt-1">Hesabınızı korumak için 2FA etkinleştirin</p>
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

        {/* Current Status Card */}
        <div
          className={`rounded-xl border-2 p-6 mb-8 ${
            status?.is_enabled
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-center gap-4">
            <Smartphone
              className={`h-8 w-8 ${
                status?.is_enabled ? "text-emerald-600" : "text-amber-600"
              }`}
            />
            <div>
              <p className={`text-sm font-semibold ${
                status?.is_enabled ? "text-emerald-700" : "text-amber-700"
              }`}>
                Mevcut Durum
              </p>
              <p
                className={`text-2xl font-black ${
                  status?.is_enabled ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {status?.is_enabled ? "Etkin" : "Devre Dışı"}
              </p>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        {!status?.is_enabled && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nasıl Kurulur?</h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-brand-600 w-6">1</span>
                <span>Aşağıdaki butona tıklayarak kurulum kodunu alın</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-brand-600 w-6">2</span>
                <span>Google Authenticator, Microsoft Authenticator veya Authy uygulamasını cihazınıza kurun</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-brand-600 w-6">3</span>
                <span>Uygulamada QR kodunu tarayın veya gizli anahtarı girin</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-brand-600 w-6">4</span>
                <span>Uygulamada gösterilen 6 haneli kodu girin ve etkinleştirin</span>
              </li>
            </ol>
          </div>
        )}

        {/* Action Button */}
        {!status?.is_enabled && (
          <button
            onClick={handleSetupClick}
            className="w-full px-6 py-3 rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors mb-8"
          >
            2FA Kurulumunu Başlat
          </button>
        )}

        {/* Recovery Codes */}
        {status?.is_enabled && status?.recovery_codes && status.recovery_codes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Yedek Kodları</h2>
            <p className="text-sm text-gray-600 mb-4">
              Telefonunuzu kaybederseniz bu kodları kullanabilirsiniz. Güvenli bir yerde saklayın.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {status.recovery_codes.map((code, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-amber-100 rounded p-2 font-mono text-sm text-gray-700"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disable 2FA */}
        {status?.is_enabled && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">2FA Devre Dışı Bırak</h2>
            <p className="text-sm text-gray-600 mb-4">
              Hesabınızdan 2FA'yı kaldırmak istiyorsanız aşağıdaki alan şifrenizi girin.
            </p>
            <input
              type="password"
              placeholder="Şifrenizi girin"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <button
              onClick={handleDisable}
              disabled={disabling || !disablePassword}
              className="w-full px-6 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:bg-gray-300 transition-colors"
            >
              {disabling ? "İşleniyor..." : "2FA Devre Dışı Bırak"}
            </button>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetupModal && setupData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2FA Kurulumunu Tamamlayın</h2>

            {/* QR Code */}
            <div className="bg-gray-100 rounded-lg p-4 mb-4 flex justify-center">
              {setupData.qr_code && (
                <img
                  src={setupData.qr_code}
                  alt="2FA QR Code"
                  className="w-64 h-64"
                />
              )}
            </div>

            {/* Secret Key */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Gizli Anahtar</p>
              <div className="flex items-center gap-2">
                <input
                  type={showSecret ? "text" : "password"}
                  value={setupData.secret}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 font-mono text-sm bg-gray-50"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4 text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => setupData.secret && copyToClipboard(setupData.secret)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Verification Code Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doğrulama Kodu
              </label>
              <input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-center text-2xl font-bold tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-2">
                Authenticator uygulamanızdan 6 haneli kodu girin
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSetupModal(false);
                  setVerificationCode("");
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleEnable}
                disabled={verifying || verificationCode.length !== 6}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:bg-gray-300 transition-colors"
              >
                {verifying ? "Doğrulanıyor..." : "Etkinleştir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
