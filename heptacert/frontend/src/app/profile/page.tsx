"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, Save, UserCircle2 } from "lucide-react";
import { PUBLIC_MEMBER_TOKEN_EVENT, changePublicMemberPassword, getPublicMemberMe, updatePublicMemberProfile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function ProfilePage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            eyebrow: "Üye Profili",
            title: "Profilim",
            subtitle: "Hesap bilgilerini güncelleyebilir, kendin hakkında kısa bir biyografi ekleyebilir ve şifreni değiştirebilirsin.",
            loginRequiredTitle: "Giriş Yapman Gerekiyor",
            loginRequiredBody: "Profilini görüntülemek ve düzenlemek için üye hesabınla giriş yapmalısın.",
            loginCta: "Üye Girişine Git",
            profileCard: "Profil Bilgileri",
            displayName: "Görünen Ad",
            email: "E-posta",
            bio: "Biyografi",
            bioPlaceholder: "Kendinden kısaca bahsetmek istersen buraya yazabilirsin.",
            saveProfile: "Profili Kaydet",
            savingProfile: "Kaydediliyor...",
            passwordCard: "Şifreyi Değiştir",
            currentPassword: "Mevcut Şifre",
            newPassword: "Yeni Şifre",
            confirmPassword: "Yeni Şifre Tekrar",
            passwordPlaceholder: "En az 8 karakter",
            savePassword: "Şifreyi Güncelle",
            savingPassword: "Güncelleniyor...",
            passwordMismatch: "Yeni şifre alanları birbiriyle aynı olmalı.",
            profileSuccess: "Profil bilgileri güncellendi.",
            passwordSuccess: "Şifren başarıyla güncellendi.",
            fallback: "Profil bilgileri yüklenemedi.",
          }
        : {
            eyebrow: "Member Profile",
            title: "My Profile",
            subtitle: "Update your account details, add a short bio, and change your password.",
            loginRequiredTitle: "Sign In Required",
            loginRequiredBody: "You need to sign in with your member account to edit your profile.",
            loginCta: "Go to Member Login",
            profileCard: "Profile Details",
            displayName: "Display Name",
            email: "Email",
            bio: "Bio",
            bioPlaceholder: "Write a short introduction about yourself.",
            saveProfile: "Save Profile",
            savingProfile: "Saving...",
            passwordCard: "Change Password",
            currentPassword: "Current Password",
            newPassword: "New Password",
            confirmPassword: "Confirm New Password",
            passwordPlaceholder: "At least 8 characters",
            savePassword: "Update Password",
            savingPassword: "Updating...",
            passwordMismatch: "New password fields must match.",
            profileSuccess: "Profile updated successfully.",
            passwordSuccess: "Password updated successfully.",
            fallback: "Failed to load profile.",
          },
    [lang],
  );

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setAuthError(false);

    getPublicMemberMe()
      .then((member) => {
        if (!active) return;
        setDisplayName(member.display_name || "");
        setEmail(member.email || "");
        setBio(member.bio || "");
      })
      .catch((err: any) => {
        if (!active) return;
        if (err?.status === 401 || String(err?.message || "").includes("401")) {
          setAuthError(true);
          return;
        }
        setError(err?.message || copy.fallback);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [copy.fallback]);

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setProfileMessage(null);
    setSavingProfile(true);
    try {
      const member = await updatePublicMemberProfile({
        display_name: displayName,
        bio,
      });
      setDisplayName(member.display_name || "");
      setBio(member.bio || "");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PUBLIC_MEMBER_TOKEN_EVENT));
      }
      setProfileMessage(copy.profileSuccess);
    } catch (err: any) {
      setError(err?.message || copy.fallback);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }
    setSavingPassword(true);
    try {
      const result = await changePublicMemberPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMessage(result.detail || copy.passwordSuccess);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || copy.fallback);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/40">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <UserCircle2 className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">{copy.loginRequiredTitle}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{copy.loginRequiredBody}</p>
          <Link href="/login?mode=member" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800">
            {copy.loginCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12 lg:px-8">
      <section>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 shadow-sm">
          <UserCircle2 className="h-4 w-4" />
          {copy.eyebrow}
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {copy.title}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
          {copy.subtitle}
        </motion.p>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {profileMessage ? <div className="success-banner">{profileMessage}</div> : null}
      {passwordMessage ? <div className="success-banner">{passwordMessage}</div> : null}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleProfileSubmit} className="card space-y-5 p-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{copy.profileCard}</h2>
          </div>
          <div>
            <label className="label">{copy.displayName}</label>
            <input className="input-field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={120} />
          </div>
          <div>
            <label className="label">{copy.email}</label>
            <input className="input-field bg-slate-50 text-slate-500" value={email} disabled />
          </div>
          <div>
            <label className="label">{copy.bio}</label>
            <textarea
              className="input-field min-h-[180px] resize-y"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder={copy.bioPlaceholder}
              maxLength={1000}
            />
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary justify-center">
            {savingProfile ? copy.savingProfile : <><Save className="h-4 w-4" /> {copy.saveProfile}</>}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="card space-y-5 p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{copy.passwordCard}</h2>
          </div>
          <div>
            <label className="label">{copy.currentPassword}</label>
            <input
              className="input-field"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">{copy.newPassword}</label>
            <input
              className="input-field"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={copy.passwordPlaceholder}
            />
          </div>
          <div>
            <label className="label">{copy.confirmPassword}</label>
            <input
              className="input-field"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={copy.passwordPlaceholder}
            />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary justify-center">
            {savingPassword ? copy.savingPassword : <><KeyRound className="h-4 w-4" /> {copy.savePassword}</>}
          </button>
        </form>
      </div>
    </div>
  );
}
