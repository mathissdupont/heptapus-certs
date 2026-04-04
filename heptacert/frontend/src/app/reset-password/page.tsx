"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";

function ResetPasswordContent() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            passwordMin: "Şifre en az 8 karakter olmalıdır.",
            mismatch: "Şifreler eşleşmiyor.",
            invalidLink: "Geçersiz sıfırlama bağlantısı.",
            failed: "Şifre sıfırlama başarısız.",
            successTitle: "Şifre Güncellendi!",
            successBody: "Yeni şifrenizle giriş yapabilirsiniz.",
            login: "Giriş Yap",
            title: "Yeni Şifre Belirle",
            subtitle: "En az 8 karakterli yeni bir şifre seçin.",
            newPassword: "Yeni Şifre",
            confirmPassword: "Şifre Tekrar",
            passwordPlaceholder: "En az 8 karakter",
            confirmPlaceholder: "Şifrenizi tekrar girin",
            saving: "Kaydediliyor...",
            submit: "Şifreyi Güncelle",
          }
        : {
            passwordMin: "Password must be at least 8 characters.",
            mismatch: "Passwords do not match.",
            invalidLink: "Invalid reset link.",
            failed: "Password reset failed.",
            successTitle: "Password Updated!",
            successBody: "You can now sign in with your new password.",
            login: "Sign In",
            title: "Set New Password",
            subtitle: "Choose a new password with at least 8 characters.",
            newPassword: "New Password",
            confirmPassword: "Confirm Password",
            passwordPlaceholder: "At least 8 characters",
            confirmPlaceholder: "Re-enter your password",
            saving: "Saving...",
            submit: "Update Password",
          },
    [lang]
  );

  const params = useSearchParams();
  const token = params.get("token") || "";
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
      setErr(copy.mismatch);
      return;
    }
    if (!token) {
      setErr(copy.invalidLink);
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setSuccess(true);
    } catch (e: any) {
      setErr(e?.message || copy.failed);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">{copy.successTitle}</h2>
          <p className="mb-6 text-sm text-gray-500">{copy.successBody}</p>
          <Link href="/admin/login" className="btn-primary w-full justify-center">{copy.login}</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="card w-full max-w-md p-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{copy.subtitle}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label">{copy.newPassword}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10 pr-10" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={copy.passwordPlaceholder} required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">{copy.confirmPassword}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10" type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={copy.confirmPlaceholder} required autoComplete="new-password" />
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
            {loading ? copy.saving : copy.submit}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
