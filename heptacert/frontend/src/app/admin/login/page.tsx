"use client";

import { useMemo, useState } from "react";
import { apiFetch, setToken, clearToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, KeyRound, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type MeOut = {
  id: number;
  email: string;
  role: "admin" | "superadmin";
  heptacoin_balance: number;
};

export default function AdminLogin() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            tokenMissing: "Token alınamadı.",
            loginFailed: "Giriş başarısız oldu. Bilgilerinizi kontrol edin.",
            otpFailed: "Doğrulama başarısız.",
            invalidCode: "Geçersiz kod. Tekrar deneyin.",
            magicFailed: "Magic link gönderilemedi.",
            title: "Giriş Yap",
            subtitle: "HeptaCert Yönetim Paneli",
            email: "E-posta Adresi",
            password: "Şifre",
            forgot: "Şifremi Unuttum",
            signIn: "Giriş Yap",
            signingIn: "Giriş yapılıyor...",
            noAccount: "Hesabınız yok mu?",
            register: "Ücretsiz Kayıt Ol",
            magicLogin: "Magic link ile giriş yap",
            otpTitle: "İki Faktörlü Doğrulama",
            otpSubtitle: "Kimlik doğrulama uygulamanızdaki 6 haneli kodu girin",
            otpCode: "Doğrulama Kodu",
            verify: "Doğrula",
            verifying: "Doğrulanıyor...",
            back: "Geri Dön",
            magicTitle: "Magic Link ile Giriş",
            magicSubtitle: "E-postanıza şifresiz giriş bağlantısı göndeririz.",
            sentTitle: "Bağlantı gönderildi!",
            sentBody: "E-postanızı kontrol edin. Bağlantı 15 dakika geçerli.",
            close: "Kapat",
            send: "Link Gönder",
            sending: "Gönderiliyor...",
            cancel: "İptal",
            emailPlaceholder: "siz@sirket.com",
          }
        : {
            tokenMissing: "Token could not be retrieved.",
            loginFailed: "Login failed. Please check your credentials.",
            otpFailed: "Verification failed.",
            invalidCode: "Invalid code. Please try again.",
            magicFailed: "Could not send the magic link.",
            title: "Sign In",
            subtitle: "HeptaCert Admin Panel",
            email: "Email Address",
            password: "Password",
            forgot: "Forgot Password",
            signIn: "Sign In",
            signingIn: "Signing in...",
            noAccount: "Don't have an account?",
            register: "Create Free Account",
            magicLogin: "Sign in with a magic link",
            otpTitle: "Two-Factor Authentication",
            otpSubtitle: "Enter the 6-digit code from your authenticator app",
            otpCode: "Verification Code",
            verify: "Verify",
            verifying: "Verifying...",
            back: "Back",
            magicTitle: "Sign In with Magic Link",
            magicSubtitle: "We will send a passwordless sign-in link to your email.",
            sentTitle: "Link sent!",
            sentBody: "Check your email. The link is valid for 15 minutes.",
            close: "Close",
            send: "Send Link",
            sending: "Sending...",
            cancel: "Cancel",
            emailPlaceholder: "you@company.com",
          },
    [lang]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [partialToken, setPartialToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [magicMode, setMagicMode] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data?.requires_2fa) {
        setPartialToken(data.partial_token);
        setStep("otp");
        setLoading(false);
        return;
      }

      const token = data?.access_token as string | undefined;
      if (!token) throw new Error(copy.tokenMissing);
      await finishLogin(token);
    } catch (e: any) {
      clearToken();
      setErr(e?.message || copy.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/2fa/validate", {
        method: "POST",
        body: JSON.stringify({ partial_token: partialToken, code: otpCode }),
      });
      const data = await res.json();
      const token = data?.access_token as string | undefined;
      if (!token) throw new Error(copy.otpFailed);
      await finishLogin(token);
    } catch (e: any) {
      setErr(e?.message || copy.invalidCode);
    } finally {
      setLoading(false);
    }
  }

  async function finishLogin(token: string) {
    setToken(token);
    const meRes = await apiFetch("/me", { method: "GET" });
    const me = (await meRes.json()) as MeOut;
    if (me.role === "superadmin") router.push("/admin/superadmin");
    else router.push("/admin/events");
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMagicLoading(true);
    try {
      await apiFetch("/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email: magicEmail }),
      });
      setMagicSent(true);
    } catch (ex: any) {
      setErr(ex?.message || copy.magicFailed);
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="card w-full max-w-md p-10">
        <AnimatePresence mode="wait">
          {step === "credentials" ? (
            <motion.div key="credentials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
                <p className="mt-1.5 text-sm text-gray-500">{copy.subtitle}</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="label">{copy.email}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input-field pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={copy.emailPlaceholder}
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="label mb-0">{copy.password}</label>
                    <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                      {copy.forgot}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input-field pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {err && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="error-banner">{err}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button disabled={loading} className="btn-primary group w-full justify-center py-3">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {copy.signingIn}</>
                  ) : (
                    <>{copy.signIn} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500">
                {copy.noAccount}{" "}
                <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                  {copy.register}
                </Link>
              </div>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMagicMode(true);
                    setErr(null);
                    setMagicSent(false);
                  }}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  <Sparkles className="h-4 w-4" /> {copy.magicLogin}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{copy.otpTitle}</h1>
                <p className="mt-1.5 text-sm text-gray-500">{copy.otpSubtitle}</p>
              </div>

              <form onSubmit={onOtpSubmit} className="space-y-5">
                <div>
                  <label className="label">{copy.otpCode}</label>
                  <input
                    className="input-field text-center font-mono text-2xl tracking-[0.5em]"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                  />
                </div>

                <AnimatePresence mode="wait">
                  {err && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="error-banner">{err}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button disabled={loading || otpCode.length !== 6} className="btn-primary group w-full justify-center py-3">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {copy.verifying}</>
                  ) : (
                    <>{copy.verify} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials");
                    setErr(null);
                    setOtpCode("");
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  ← {copy.back}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {magicMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setMagicMode(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="card w-full max-w-md p-8"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{copy.magicTitle}</h2>
                <p className="mt-1 text-sm text-gray-500">{copy.magicSubtitle}</p>
              </div>

              {magicSent ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="font-semibold text-gray-800">{copy.sentTitle}</p>
                  <p className="text-sm text-gray-500">{copy.sentBody}</p>
                  <button onClick={() => { setMagicMode(false); setMagicSent(false); }} className="btn-ghost mt-2 text-sm">{copy.close}</button>
                </div>
              ) : (
                <form onSubmit={sendMagicLink} className="space-y-4">
                  <div>
                    <label className="label">{copy.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        className="input-field pl-10"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder={copy.emailPlaceholder}
                        type="email"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {err && <div className="error-banner text-sm">{err}</div>}

                  <button disabled={magicLoading} className="btn-primary w-full justify-center py-3">
                    {magicLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {copy.sending}</> : <><Sparkles className="h-4 w-4" /> {copy.send}</>}
                  </button>
                  <button type="button" onClick={() => setMagicMode(false)} className="w-full text-center text-sm text-gray-500 hover:text-gray-700">
                    ← {copy.cancel}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
