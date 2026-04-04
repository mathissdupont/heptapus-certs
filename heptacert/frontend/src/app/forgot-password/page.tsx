"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            failed: "İstek gönderilemedi.",
            sentTitle: "E-posta Gönderildi",
            sentBody: "Şifre sıfırlama talimatları",
            sentBody2: "adresine gönderildi. Spam klasörünüzü de kontrol edin.",
            backToLogin: "Giriş Sayfasına Dön",
            title: "Şifremi Unuttum",
            subtitle: "E-posta adresinizi girin, sıfırlama bağlantısı göndereceğiz.",
            email: "E-posta Adresi",
            emailPlaceholder: "siz@sirket.com",
            sending: "Gönderiliyor...",
            submit: "Sıfırlama Bağlantısı Gönder",
          }
        : {
            failed: "Request could not be sent.",
            sentTitle: "Email Sent",
            sentBody: "Password reset instructions were sent to",
            sentBody2: ". Please also check your spam folder.",
            backToLogin: "Back to Login",
            title: "Forgot Password",
            subtitle: "Enter your email address and we will send a reset link.",
            email: "Email Address",
            emailPlaceholder: "you@company.com",
            sending: "Sending...",
            submit: "Send Reset Link",
          },
    [lang]
  );

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (e: any) {
      setErr(e?.message || copy.failed);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">{copy.sentTitle}</h2>
          <p className="mb-6 text-sm text-gray-500">
            {copy.sentBody} <strong className="text-gray-700">{email}</strong> {copy.sentBody2}
          </p>
          <Link href="/admin/login" className="btn-secondary w-full justify-center">{copy.backToLogin}</Link>
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
            <label className="label">{copy.email}</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={copy.emailPlaceholder} required autoComplete="email" />
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
            {loading ? copy.sending : <><ArrowRight className="h-4 w-4" /> {copy.submit}</>}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">{copy.backToLogin}</Link>
        </div>
      </motion.div>
    </div>
  );
}
