"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            passwordMin: "Şifre en az 8 karakter olmalıdır.",
            passwordMismatch: "Şifreler eşleşmiyor.",
            registerFailed: "Kayıt işlemi başarısız oldu.",
            verifyTitle: "E-postanızı Doğrulayın",
            verifyBody: "adresine bir doğrulama bağlantısı gönderdik. Gelen kutunuzu kontrol edin ve hesabınızı aktif edin.",
            verifyHint: "E-posta gelmedi mi? Spam klasörünüzü kontrol edin.",
            goLogin: "Giriş Sayfasına Git",
            createAccount: "Hesap Oluştur",
            giftBalance: "100 HC hediye bakiye ile başlayın",
            email: "E-posta Adresi",
            password: "Şifre",
            confirmPassword: "Şifre Tekrar",
            emailPlaceholder: "siz@sirket.com",
            passwordPlaceholder: "En az 8 karakter",
            confirmPlaceholder: "Şifrenizi tekrar girin",
            loading: "Kayıt yapılıyor...",
            submit: "Hesap Oluştur",
            hasAccount: "Zaten hesabınız var mı?",
            signIn: "Giriş Yapın",
          }
        : {
            passwordMin: "Password must be at least 8 characters.",
            passwordMismatch: "Passwords do not match.",
            registerFailed: "Registration failed.",
            verifyTitle: "Verify your email",
            verifyBody: "We sent a verification link to this address. Check your inbox and activate your account.",
            verifyHint: "Did not receive the email? Check your spam folder.",
            goLogin: "Go to Login",
            createAccount: "Create Account",
            giftBalance: "Start with a 100 HC gift balance",
            email: "Email Address",
            password: "Password",
            confirmPassword: "Confirm Password",
            emailPlaceholder: "you@company.com",
            passwordPlaceholder: "At least 8 characters",
            confirmPlaceholder: "Re-enter your password",
            loading: "Creating account...",
            submit: "Create Account",
            hasAccount: "Already have an account?",
            signIn: "Sign In",
          },
    [lang]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (password.length < 8) {
      setErr(copy.passwordMin);
      return;
    }
    if (password !== confirm) {
      setErr(copy.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSuccess(true);
    } catch (e: any) {
      setErr(e?.message || copy.registerFailed);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card w-full max-w-md p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mb-3 text-xl font-bold text-gray-900">{copy.verifyTitle}</h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-500">
            <strong className="text-gray-700">{email}</strong> {copy.verifyBody}
          </p>
          <p className="text-xs text-gray-400">{copy.verifyHint}</p>
          <Link href="/admin/login" className="btn-secondary mt-6 w-full justify-center">
            {copy.goLogin}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="card w-full max-w-md p-10"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{copy.createAccount}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{copy.giftBalance}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label">{copy.email}</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-10"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.emailPlaceholder}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="label">{copy.password}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-10 pr-10"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={copy.passwordPlaceholder}
                required
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">{copy.confirmPassword}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-10"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={copy.confirmPlaceholder}
                required
                autoComplete="new-password"
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

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? copy.loading : <>{copy.submit} <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {copy.hasAccount}{" "}
          <Link href="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">
            {copy.signIn}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
