"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { apiFetch, registerPublicMember } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type RegisterMode = "organizer" | "member";

export default function RegisterHub() {
  const { lang } = useI18n();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<RegisterMode>("organizer");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            organizer: {
              label: "Organizatör",
              title: "Etkinlik planlayıcı hesabı oluştur",
              subtitle: "Etkinliklerini yönet, sertifika üret ve yönetim paneline eriş.",
              benefit: "100 HC hediye bakiye ile başlayın",
              verifyTitle: "Organizatör hesabını doğrula",
              verifyBody: "adresine organizatör hesabın için doğrulama bağlantısı gönderdik.",
              loginHref: "/admin/login",
              loginLabel: "Yönetici Girişine Git",
            },
            member: {
              label: "Katılımcı",
              title: "Üye hesabı oluştur",
              subtitle: "Açık etkinlikleri keşfet, kayıt ol ve topluluk alanına bağlan.",
              benefit: "Etkinlik keşfi ve katılım için kişisel üye hesabı",
              verifyTitle: "Üye hesabını doğrula",
              verifyBody: "adresine üye hesabın için doğrulama bağlantısı gönderdik.",
              loginHref: "/login?mode=member",
              loginLabel: "Üye Girişine Git",
            },
            passwordMin: "Şifre en az 8 karakter olmalı.",
            passwordMismatch: "Şifreler eşleşmiyor.",
            termsRequired: "Devam etmek için Kullanım Koşulları'nı kabul etmelisiniz.",
            registerFailed: "Kayıt işlemi başarısız oldu.",
            verifyHint: "E-posta gelmediyse spam klasörünü de kontrol edin.",
            createAccount: "Hesap Oluştur",
            name: "Ad Soyad",
            namePlaceholder: "Örn. Ayşe Yılmaz",
            email: "E-posta Adresi",
            password: "Şifre",
            confirmPassword: "Şifre Tekrar",
            emailPlaceholder: "siz@example.com",
            passwordPlaceholder: "En az 8 karakter",
            confirmPlaceholder: "Şifrenizi tekrar girin",
            loading: "Kayıt yapılıyor...",
            submitOrganizer: "Organizatör Hesabı Oluştur",
            submitMember: "Üye Hesabı Oluştur",
            hasAccount: "Zaten hesabın var mı?",
            signInOrganizer: "Yönetici girişi",
            signInMember: "Üye girişi",
            switchHint: "İstersen diğer hesap tipine de hemen geçebilirsin.",
            termsPrefix: "Devam ederek",
            termsLink: "Kullanım Koşulları",
            termsMiddle: "ve",
            privacyLink: "Gizlilik Politikası",
            termsSuffix: "metinlerini okuduğunu ve kabul ettiğini beyan edersin.",
          }
        : {
            organizer: {
              label: "Organizer",
              title: "Create an organizer account",
              subtitle: "Manage events, issue certificates, and access the admin control panel.",
              benefit: "Start with a 100 HC welcome balance",
              verifyTitle: "Verify your organizer account",
              verifyBody: "We sent a verification link to this address for your organizer account.",
              loginHref: "/admin/login",
              loginLabel: "Go to Admin Login",
            },
            member: {
              label: "Member",
              title: "Create a member account",
              subtitle: "Discover public events, register faster, and join the community layer.",
              benefit: "A personal member profile for event discovery and participation",
              verifyTitle: "Verify your member account",
              verifyBody: "We sent a verification link to this address for your member account.",
              loginHref: "/login?mode=member",
              loginLabel: "Go to Member Login",
            },
            passwordMin: "Password must be at least 8 characters.",
            passwordMismatch: "Passwords do not match.",
            termsRequired: "You must accept the Terms of Use to continue.",
            registerFailed: "Registration failed.",
            verifyHint: "If you do not see the email, check your spam folder too.",
            createAccount: "Create Account",
            name: "Full Name",
            namePlaceholder: "e.g. Ayse Yilmaz",
            email: "Email Address",
            password: "Password",
            confirmPassword: "Confirm Password",
            emailPlaceholder: "you@example.com",
            passwordPlaceholder: "At least 8 characters",
            confirmPlaceholder: "Re-enter your password",
            loading: "Creating account...",
            submitOrganizer: "Create Organizer Account",
            submitMember: "Create Member Account",
            hasAccount: "Already have an account?",
            signInOrganizer: "Admin login",
            signInMember: "Member login",
            switchHint: "You can switch to the other account type anytime.",
            termsPrefix: "By continuing, you agree to the",
            termsLink: "Terms of Use",
            termsMiddle: "and",
            privacyLink: "Privacy Policy",
            termsSuffix: ".",
          },
    [lang],
  );

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    setMode(requestedMode === "member" ? "member" : "organizer");
  }, [searchParams]);

  const modeCopy = copy[mode];

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErr(null);

    if (password.length < 8) {
      setErr(copy.passwordMin);
      return;
    }

    if (password !== confirm) {
      setErr(copy.passwordMismatch);
      return;
    }

    if (!termsAccepted) {
      setErr(copy.termsRequired);
      return;
    }

    setLoading(true);
    try {
      if (mode === "organizer") {
        await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, terms_accepted: termsAccepted }),
        });
      } else {
        await registerPublicMember({
          display_name: displayName,
          email,
          password,
          terms_accepted: termsAccepted,
        });
      }
      setSuccess(true);
    } catch (error: any) {
      setErr(error?.message || copy.registerFailed);
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
          <h2 className="mb-3 text-xl font-bold text-gray-900">{modeCopy.verifyTitle}</h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-500">
            <strong className="text-gray-700">{email}</strong> {modeCopy.verifyBody}
          </p>
          <p className="text-xs text-gray-400">{copy.verifyHint}</p>
          <Link href={modeCopy.loginHref} className="btn-secondary mt-6 w-full justify-center">
            {modeCopy.loginLabel}
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
        className="card w-full max-w-xl p-10"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{copy.createAccount}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{modeCopy.subtitle}</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
          <button
            type="button"
            onClick={() => setMode("organizer")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "organizer" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            <Building2 className="h-4 w-4" />
            {copy.organizer.label}
          </button>
          <button
            type="button"
            onClick={() => setMode("member")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "member" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            <UserRound className="h-4 w-4" />
            {copy.member.label}
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="font-semibold text-slate-900">{modeCopy.title}</div>
          <div className="mt-1">{modeCopy.benefit}</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {mode === "member" ? (
            <div>
              <label className="label">{copy.name}</label>
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="input-field pl-10"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={copy.namePlaceholder}
                  required
                  autoComplete="name"
                />
              </div>
            </div>
          ) : null}

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
                onChange={(event) => setPassword(event.target.value)}
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
                onChange={(event) => setConfirm(event.target.value)}
                placeholder={copy.confirmPlaceholder}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              required
            />
            <span>
              {copy.termsPrefix}{" "}
              <Link href="/kullanim-kosullari" className="font-semibold text-brand-600 hover:text-brand-700">
                {copy.termsLink}
              </Link>{" "}
              {copy.termsMiddle}{" "}
              <Link href="/gizlilik" className="font-semibold text-brand-600 hover:text-brand-700">
                {copy.privacyLink}
              </Link>{" "}
              {copy.termsSuffix}
            </span>
          </label>

          <AnimatePresence mode="wait">
            {err ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="error-banner">{err}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? (
              copy.loading
            ) : (
              <>
                {mode === "organizer" ? copy.submitOrganizer : copy.submitMember}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {copy.hasAccount}{" "}
          <Link href={mode === "organizer" ? "/admin/login" : "/login?mode=member"} className="font-semibold text-brand-600 hover:text-brand-700">
            {mode === "organizer" ? copy.signInOrganizer : copy.signInMember}
          </Link>
        </div>
        <div className="mt-2 text-center text-xs text-slate-400">{copy.switchHint}</div>
      </motion.div>
    </div>
  );
}
