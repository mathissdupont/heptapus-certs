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
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { get2FAStatus, setup2FA, enable2FA, disable2FA, TwoFAStatusOut } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";

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

  const handleDeleteKey = async () => {
    // Projenin genel yapısını bozmamak adına handleDisable ismini içeride bağlıyoruz.
    await handleDisable();
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
      <div className="flex w-full items-center justify-center p-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 antialiased text-gray-900 space-y-6">
      
      {/* ÜST BİLGİ ALANI (Header) */}
      <div className="flex items-center gap-3.5 pb-2">
        <Link
          href="/admin/settings"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-gray-950 sm:text-lg">İki Faktörlü Kimlik Doğrulama (2FA)</h1>
          <p className="text-xs text-gray-400">Platform giriş güvenliğinizi en üst düzeye taşıyın.</p>
        </div>
      </div>

      {/* HATA BANNERI */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* MEVCUT DURUM KARTI - Apple Tarzı Duru Tasarım */}
      <div
        className={`rounded-2xl border p-5 shadow-sm transition-all duration-300 ${
          status?.is_enabled
            ? "border-emerald-200 bg-emerald-50/10"
            : "border-amber-200 bg-amber-50/10"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${
            status?.is_enabled ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-amber-100 bg-amber-50 text-amber-600"
          }`}>
            {status?.is_enabled ? <ShieldCheck className="h-5 w-5 stroke-[2]" /> : <ShieldAlert className="h-5 w-5 stroke-[2]" />}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mevcut Durum</p>
            <h2 className={`text-base font-bold tracking-tight ${status?.is_enabled ? "text-emerald-700" : "text-amber-700"}`}>
              {status?.is_enabled ? "Etkinleştirildi (Güvenli)" : "Devre Dışı (Risk Altında)"}
            </h2>
          </div>
        </div>
      </div>

      {/* KURULUM TALİMATLARI ADIMLARI */}
      {!status?.is_enabled && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2.5">Güvenli Kurulum Adımları</h2>
          <div className="relative pl-4 before:absolute before:bottom-1 before:left-1 before:top-1 before:w-[1px] before:bg-gray-100">
            <div className="space-y-4 text-xs font-medium text-gray-500 leading-relaxed">
              {[
                "Aşağıdaki butona tıklayarak sistem tarafından üretilecek özel kurulum kodunu alın.",
                "Mobil cihazınıza Google Authenticator, Microsoft Authenticator veya Authy uygulamasını indirin.",
                "Uygulama içerisinden kamerayı açıp QR kodunu taratın veya alternatif olarak gizli anahtarı girin.",
                "Uygulamanın anlık ürettiği 6 haneli doğrulama kodunu ekrana yazarak sistemi aktif hale getirin."
              ].map((step, index) => (
                <div key={index} className="relative group flex items-start gap-3">
                  <div className="absolute -left-[19.5px] top-0.5 flex h-2 w-2 items-center justify-center rounded-full bg-white ring-4 ring-white border border-gray-400 group-hover:border-gray-900 transition-colors" />
                  <p className="flex-1"><strong className="text-gray-900 mr-1">{index + 1}.</strong> {step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AKSİYON ETKİNLEŞTİRME BUTONU */}
      {!status?.is_enabled && (
        <button
          onClick={handleSetupClick}
          className="w-full inline-flex min-h-[42px] items-center justify-center rounded-xl bg-gray-950 text-xs font-semibold text-white transition hover:bg-gray-900 active:scale-[0.98] shadow-sm"
        >
          2FA Kurulumunu Başlat
        </button>
      )}

      {/* YEDEK RECOVERY KODLARI ALANI */}
      {status?.is_enabled && status?.recovery_codes && status.recovery_codes.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Güvenlik Yedek Kodları</h2>
            <p className="mt-1 text-xs text-gray-400">Telefonunuza veya doğrulama uygulamanıza erişemediğiniz acil durumlar için bu kodları güvenli bir fiziksel/dijital alanda saklayın.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {status.recovery_codes.map((code, idx) => (
              <div
                key={idx}
                className="bg-gray-50/50 border border-gray-100 rounded-xl p-2.5 font-mono text-xs font-semibold text-gray-800 text-center tracking-wide"
              >
                {code}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2FA İPTAL ETME PANELI */}
      {status?.is_enabled && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-600">2FA Güvenliğini Kaldır</h2>
            <p className="mt-1 text-xs text-gray-400">İki faktörlü kimlik doğrulamayı devre dışı bırakmak hesabınızı saldırılara karşı savunmasız hale getirecektir. Devam etmek için şifrenizi girin.</p>
          </div>
          <input
            type="password"
            placeholder="Mevcut şifrenizi yazın"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder:text-gray-400"
            disabled={disabling}
          />
          <button
            onClick={handleDeleteKey}
            disabled={disabling || !disablePassword}
            className="w-full inline-flex min-h-[38px] items-center justify-center rounded-xl bg-red-500 text-xs font-semibold text-white transition hover:bg-red-600 active:scale-[0.98] disabled:opacity-40 shadow-sm"
          >
            {disabling ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Devre Dışı Bırakılıyor...
              </span>
            ) : "2FA Güvenliğini Kapat"}
          </button>
        </div>
      )}

      {/* GÖRSEL QR DOĞRULAMA MODALI (AnimatePresence Akıcılığı) */}
      <AnimatePresence>
        {showSetupModal && setupData && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/20 backdrop-blur-md"
              onClick={() => { if (!verifying) { setShowSetupModal(false); setVerificationCode(""); } }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-xl backdrop-blur-xl space-y-4"
            >
              <div>
                <h2 className="text-sm font-bold text-gray-950 tracking-tight">2FA Kurulumunu Tamamla</h2>
                <p className="mt-1 text-[11px] text-gray-400">Aşağıdaki karekodu authenticator uygulamanıza taratın.</p>
              </div>

              {/* QR Code Çerçevesi */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-center shadow-inner">
                {setupData.qr_code && (
                  <img
                    src={setupData.qr_code}
                    alt="2FA QR Code"
                    className="w-52 h-52 object-contain mix-blend-multiply"
                  />
                )}
              </div>

              {/* Secret Key Metin Alanı */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-gray-500">Alternatif Gizli Anahtar</p>
                <div className="flex items-center gap-1.5">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={setupData.secret}
                    readOnly
                    className="flex-1 min-h-[34px] px-3 rounded-xl border border-gray-200 font-mono text-xs bg-gray-50/50 text-gray-800 font-semibold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-900 transition-all shadow-sm"
                  >
                    {showSecret ? <EyeOff className="h-3.5 w-3.5 stroke-[2]" /> : <Eye className="h-3.5 w-3.5 stroke-[2]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setupData.secret && copyToClipboard(setupData.secret)}
                    className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-900 transition-all shadow-sm"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" /> : <Copy className="h-3.5 w-3.5 stroke-[2]" />}
                  </button>
                </div>
              </div>

              {/* 6 Haneli Token Giriş Hücresi */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500">
                  Uygulamadaki 6 Haneli Kod
                </label>
                <input
                  type="text"
                  placeholder="000 000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="w-full min-h-[46px] rounded-xl border border-gray-200 bg-white px-4 text-center text-xl font-bold tracking-[0.25em] outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-300 placeholder:tracking-normal"
                />
              </div>

              {/* Modal Alt Buton Setleri */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSetupModal(false);
                    setVerificationCode("");
                  }}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={verifying || verificationCode.length !== 6}
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-[0.98] disabled:opacity-30"
                >
                  {verifying ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Doğrulanıyor...
                    </span>
                  ) : "Etkinleştir"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
