"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { loginPublicMember, setPublicMemberToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type LoginMode = "member" | "organizer";

function MemberLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useI18n();
  const [mode, setMode] = useState<LoginMode>("member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            memberLabel: "Katılımcı",
            organizerLabel: "Organizatör",
            title: "Giriş Yap",
            memberTitle: "Üye hesabınla devam et",
            memberBody: "Açık etkinlikleri keşfetmek ve topluluk özelliklerini kullanmak için üye hesabına giriş yap.",
            organizerTitle: "Etkinlik yönetimi için yönetici paneli",
            organizerBody: "Etkinlik oluşturma, sertifika üretme ve operasyon ekranları için mevcut yönetici panelini kullan.",
            email: "E-posta Adresi",
            password: "Şifre",
            forgotPassword: "Şifremi unuttum",
            emailPlaceholder: "siz@example.com",
            passwordPlaceholder: "Şifreniz",
            submit: "Üye Girişi Yap",
            loading: "Giriş yapılıyor...",
            loginFailed: "Giriş başarısız oldu.",
            organizerCta: "Yönetici Paneline Git",
            noAccount: "Hesabın yok mu?",
            memberRegister: "Üye hesabı oluştur",
            organizerRegister: "Organizatör hesabı oluştur",
          }
        : {
            memberLabel: "Member",
            organizerLabel: "Organizer",
            title: "Sign In",
            memberTitle: "Continue with your member account",
            memberBody: "Sign in to discover public events and use the community layer.",
            organizerTitle: "Use the admin panel for event operations",
            organizerBody: "Keep using the existing admin panel for event creation, certification, and operations.",
            email: "Email Address",
            password: "Password",
            forgotPassword: "Forgot password",
            emailPlaceholder: "you@example.com",
            passwordPlaceholder: "Your password",
            submit: "Sign In as Member",
            loading: "Signing in...",
            loginFailed: "Login failed.",
            organizerCta: "Open Admin Panel",
            noAccount: "Need an account?",
            memberRegister: "Create member account",
            organizerRegister: "Create organizer account",
          },
    [lang],
  );

  useEffect(() => {
    setMode(searchParams.get("mode") === "organizer" ? "organizer" : "member");
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginPublicMember({ email, password });
      setPublicMemberToken(data.access_token);
      router.push("/events");
    } catch (err: any) {
      setError(err?.message || copy.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        <div className="card p-10">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
            <button
              type="button"
              onClick={() => setMode("member")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === "member" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <UserRound className="h-4 w-4" />
              {copy.memberLabel}
            </button>
            <button
              type="button"
              onClick={() => setMode("organizer")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === "organizer" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <Building2 className="h-4 w-4" />
              {copy.organizerLabel}
            </button>
          </div>

          {mode === "member" ? (
            <>
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="font-semibold text-slate-900">{copy.memberTitle}</div>
                <p className="mt-1 text-sm text-slate-600">{copy.memberBody}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">{copy.email}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input-field pl-10"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={copy.emailPlaceholder}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="label mb-0">{copy.password}</label>
                    <Link href="/forgot-password?mode=member" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                      {copy.forgotPassword}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input-field pl-10"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={copy.passwordPlaceholder}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="error-banner">{error}</div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? (
                    copy.loading
                  ) : (
                    <>
                      {copy.submit}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                {copy.noAccount}{" "}
                <Link href="/register?mode=member" className="font-semibold text-brand-600 hover:text-brand-700">
                  {copy.memberRegister}
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Admin
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">{copy.organizerTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{copy.organizerBody}</p>
              <Link href="/admin/login" className="btn-primary mt-6 inline-flex justify-center gap-2">
                {copy.organizerCta}
              </Link>
              <div className="mt-6 text-sm text-slate-500">
                {copy.noAccount}{" "}
                <Link href="/register?mode=organizer" className="font-semibold text-brand-600 hover:text-brand-700">
                  {copy.organizerRegister}
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function MemberLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <ShieldCheck className="h-8 w-8 animate-pulse text-brand-500" />
        </div>
      }
    >
      <MemberLoginContent />
    </Suspense>
  );
}
