"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Camera, Globe, KeyRound, Loader2, MapPin, Save, UserCircle2, ShieldAlert, CheckCircle2, Crown, Lock } from "lucide-react";
import { PUBLIC_MEMBER_TOKEN_EVENT, changePublicMemberPassword, clearPublicMemberToken, deletePublicMemberAccount, getMyConnectionPrivacy, getPublicMemberMe, getPublicMemberSubscription, updateMyConnectionPrivacy, updatePublicMemberProfile, uploadPublicMemberAvatar, type PublicMemberSubscriptionInfo } from "@/lib/api";
import { normalizeExternalUrl } from "@/lib/url";
import { useI18n } from "@/lib/i18n";
import SubscriptionGate from "@/components/SubscriptionGate";

export default function ProfilePage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            eyebrow: "Hesap Ayarları",
            title: "Profilim",
            subtitle: "Kişisel bilgilerinizi, güvenlik ayarlarınızı ve topluluk tercihlerinizi buradan yönetin.",
            loginRequiredTitle: "Giriş Yapmanız Gerekiyor",
            loginRequiredBody: "Profilinizi görüntülemek ve düzenlemek için üye hesabınızla giriş yapmalısınız.",
            loginCta: "Giriş Ekranına Git",
            profileCard: "Profil Bilgileri",
            profileDesc: "Bu bilgiler topluluktaki diğer üyeler tarafından görülecektir.",
            displayName: "Görünen Ad",
            email: "E-posta Adresi",
            contactEmail: "İletişim E-posta Adresi",
            contactEmailPlaceholder: "iletisim@ornek.com",
            bio: "Hakkımda (Bio)",
            bioPlaceholder: "Kendinizden ve ilgi alanlarınızdan kısaca bahsedin.",
            headline: "Kısa Başlık (Unvan)",
            headlinePlaceholder: "Örn. Yazılım Geliştirici, UI/UX Tasarımcı",
            location: "Konum",
            locationPlaceholder: "İstanbul, Türkiye",
            website: "Kişisel Website",
            websitePlaceholder: "https://...",
            avatar: "Profil Fotoğrafı",
            avatarHint: "JPG, PNG veya WEBP formatında bir resim yükleyin.",
            saveProfile: "Değişiklikleri Kaydet",
            savingProfile: "Kaydediliyor...",
            passwordCard: "Şifre ve Güvenlik",
            passwordDesc: "Hesabınızın güvenliği için şifrenizi güçlü tutun.",
            currentPassword: "Mevcut Şifre",
            newPassword: "Yeni Şifre",
            confirmPassword: "Yeni Şifre (Tekrar)",
            passwordPlaceholder: "En az 8 karakter",
            savePassword: "Şifreyi Güncelle",
            savingPassword: "Güncelleniyor...",
            passwordMismatch: "Yeni şifreler birbiriyle uyuşmuyor.",
            profileSuccess: "Profil bilgileriniz başarıyla güncellendi.",
            passwordSuccess: "Şifreniz başarıyla güncellendi.",
            fallback: "Bir hata oluştu. Lütfen tekrar deneyin.",
            memberPlanCard: "Üyelik Planı",
            memberPlanDesc: "Mevcut abonelik durumunuzu ve plan detaylarını inceleyin.",
            memberPlanNone: "Ücretsiz Plan",
            memberPlanActive: "Premium Plan (Aktif)",
            memberPlanExpires: "Yenilenme / Bitiş Tarihi",
            memberPlanCta: "Planları İncele",
            memberPlanBody: "Premium özellikler sayesinde toplulukta öne çıkın ve tüm sosyal araçlara erişin.",
            privacyCard: "Takip ve Gizlilik",
            privacyDesc: "Bağlantılarınızın kimler tarafından görülebileceğini seçin.",
            hideFollowers: "Takipçi listemi gizle",
            hideFollowing: "Takip ettiğim kişileri gizle",
            privacyHint: "Aktif edildiğinde bu listeler profilinizde diğer kullanıcılara kapalı olur.",
            savePrivacy: "Gizliliği Kaydet",
            savingPrivacy: "Kaydediliyor...",
            privacySuccess: "Gizlilik ayarlarınız güncellendi.",
            dangerZone: "Tehlikeli Bölge",
            deleteAccount: "Hesabı Sil",
            deleteDesc: "Hesabınızı ve size ait tüm verileri kalıcı olarak silin. Bu işlem geri alınamaz.",
            deleteConfirm: "İşlemi onaylamak için mevcut şifrenizi girin",
            deleteBtn: "Hesabı ve Verileri Kalıcı Olarak Sil",
            deleting: "Siliniyor...",
          }
        : {
            eyebrow: "Account Settings",
            title: "My Profile",
            subtitle: "Manage your personal information, security settings, and community preferences.",
            loginRequiredTitle: "Sign In Required",
            loginRequiredBody: "You need to sign in with your member account to access your profile.",
            loginCta: "Go to Sign In",
            profileCard: "Profile Information",
            profileDesc: "This information will be visible to other members in the community.",
            displayName: "Display Name",
            email: "Email Address",
            contactEmail: "Public Contact Email",
            contactEmailPlaceholder: "contact@example.com",
            bio: "Bio",
            bioPlaceholder: "Write a short introduction about yourself and your interests.",
            headline: "Headline",
            headlinePlaceholder: "e.g. Software Engineer, UI/UX Designer",
            location: "Location",
            locationPlaceholder: "London, UK",
            website: "Personal Website",
            websitePlaceholder: "https://...",
            avatar: "Profile Photo",
            avatarHint: "Upload a picture in JPG, PNG, or WEBP format.",
            saveProfile: "Save Changes",
            savingProfile: "Saving...",
            passwordCard: "Password & Security",
            passwordDesc: "Keep your password strong to secure your account.",
            currentPassword: "Current Password",
            newPassword: "New Password",
            confirmPassword: "Confirm New Password",
            passwordPlaceholder: "At least 8 characters",
            savePassword: "Update Password",
            savingPassword: "Updating...",
            passwordMismatch: "New passwords do not match.",
            profileSuccess: "Your profile has been updated successfully.",
            passwordSuccess: "Your password has been updated successfully.",
            fallback: "An error occurred. Please try again.",
            memberPlanCard: "Membership Plan",
            memberPlanDesc: "Review your current subscription status and plan details.",
            memberPlanNone: "Free Plan",
            memberPlanActive: "Premium Plan (Active)",
            memberPlanExpires: "Renewal / Expiry Date",
            memberPlanCta: "Explore Plans",
            memberPlanBody: "Unlock premium features to stand out in the community and access all social tools.",
            privacyCard: "Privacy & Connections",
            privacyDesc: "Choose who can see your connections.",
            hideFollowers: "Hide my followers list",
            hideFollowing: "Hide who I follow",
            privacyHint: "When enabled, these lists will be hidden from other users on your profile.",
            savePrivacy: "Save Privacy",
            savingPrivacy: "Saving...",
            privacySuccess: "Your privacy settings have been updated.",
            dangerZone: "Danger Zone",
            deleteAccount: "Delete Account",
            deleteDesc: "Permanently delete your account and all associated data. This action cannot be undone.",
            deleteConfirm: "Enter your current password to confirm",
            deleteBtn: "Permanently Delete Account & Data",
            deleting: "Deleting...",
          },
    [lang],
  );

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  
  const [memberSubscription, setMemberSubscription] = useState<PublicMemberSubscriptionInfo | null>(null);
  const [hideFollowers, setHideFollowers] = useState(false);
  const [hideFollowing, setHideFollowing] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

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
        setContactEmail(member.contact_email || "");
        setBio(member.bio || "");
        setAvatarUrl(member.avatar_url || "");
        setHeadline(member.headline || "");
        setLocation(member.location || "");
        setWebsiteUrl(member.website_url || "");
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

    getPublicMemberSubscription()
      .then((subscription) => {
        if (!active) return;
        setMemberSubscription(subscription);
      })
      .catch(() => {
        if (!active) return;
        setMemberSubscription(null);
      });

    getMyConnectionPrivacy()
      .then((privacy) => {
        if (!active) return;
        setHideFollowers(privacy.hide_followers);
        setHideFollowing(privacy.hide_following);
      })
      .catch(() => {
        if (!active) return;
        setHideFollowers(false);
        setHideFollowing(false);
      });

    return () => {
      active = false;
    };
  }, [copy.fallback]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setError(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSavingProfile(true);
    try {
      const member = await updatePublicMemberProfile({
        display_name: displayName,
        bio,
        headline,
        location,
        website_url: normalizeExternalUrl(websiteUrl),
        contact_email: contactEmail.trim() || null,
      });
      setDisplayName(member.display_name || "");
      setContactEmail(member.contact_email || "");
      setBio(member.bio || "");
      setAvatarUrl(member.avatar_url || "");
      setHeadline(member.headline || "");
      setLocation(member.location || "");
      setWebsiteUrl(member.website_url || "");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PUBLIC_MEMBER_TOKEN_EVENT));
      }
      showSuccess(copy.profileSuccess);
    } catch (err: any) {
      setError(err?.message || copy.fallback);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(file: File | null) {
    if (!file) return;
    setError(null);
    setUploadingAvatar(true);
    try {
      const member = await uploadPublicMemberAvatar(file);
      setAvatarUrl(member.avatar_url || "");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PUBLIC_MEMBER_TOKEN_EVENT));
      }
      showSuccess(copy.profileSuccess);
    } catch (err: any) {
      setError(err?.message || copy.fallback);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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
      showSuccess(result.detail || copy.passwordSuccess);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || copy.fallback);
    } finally {
      setSavingPassword(false);
    }
  }

  async function handlePrivacySubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSavingPrivacy(true);
    try {
      const updated = await updateMyConnectionPrivacy({
        hide_followers: hideFollowers,
        hide_following: hideFollowing,
      });
      setHideFollowers(updated.hide_followers);
      setHideFollowing(updated.hide_following);
      showSuccess(copy.privacySuccess);
    } catch (err: any) {
      setError(err?.message || copy.fallback);
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleDeleteAccount(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDeletingAccount(true);
    try {
      await deletePublicMemberAccount({ current_password: deletePassword });
      clearPublicMemberToken();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err?.message || copy.fallback);
      setDeletingAccount(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-gray-500 font-medium">Yükleniyor...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 mb-6">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{copy.loginRequiredTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{copy.loginRequiredBody}</p>
          <Link 
            href="/login?mode=member" 
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-slate-900 transition-colors hover:bg-slate-800 dark:hover:bg-gray-100 shadow-sm"
          >
            {copy.loginCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 pb-20">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          <UserCircle2 className="h-4 w-4" />
          {copy.eyebrow}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-10">
        
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            {copy.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {copy.subtitle}
          </p>
        </div>

        {/* Global Notifications */}
        <div className="mb-8 space-y-3 empty:hidden">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-400">
              <ShieldAlert className="h-5 w-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="font-medium">{successMsg}</p>
            </motion.div>
          )}
        </div>

        <SubscriptionGate requiredPlan="member_plus">
          <div className="space-y-8">
            
            {/* PROFILE SECTION */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{copy.profileCard}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{copy.profileDesc}</p>
              </div>
              
              <form onSubmit={handleProfileSubmit} className="p-6">
                {/* Avatar Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
                  <div className="h-20 w-20 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.avatar}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">{copy.avatarHint}</p>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                      {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      Fotoğraf Değiştir
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void handleAvatarChange(e.target.files?.[0] || null)} disabled={uploadingAvatar} />
                    </label>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.displayName}</label>
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        required 
                        maxLength={120} 
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.headline}</label>
                      <input 
                        type="text" 
                        value={headline} 
                        onChange={(e) => setHeadline(e.target.value)} 
                        placeholder={copy.headlinePlaceholder} 
                        maxLength={160} 
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.email}</label>
                    <input 
                      type="email" 
                      value={email} 
                      disabled 
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.contactEmail}</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder={copy.contactEmailPlaceholder}
                      maxLength={320}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.location}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          type="text" 
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)} 
                          placeholder={copy.locationPlaceholder} 
                          maxLength={160} 
                          className="w-full pl-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.website}</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          type="url" 
                          value={websiteUrl} 
                          onChange={(e) => setWebsiteUrl(e.target.value)} 
                          placeholder={copy.websitePlaceholder} 
                          maxLength={2000} 
                          className="w-full pl-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.bio}</label>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      placeholder={copy.bioPlaceholder} 
                      maxLength={1000} 
                      rows={4}
                      className="w-full resize-y rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={savingProfile} 
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 transition-colors hover:bg-slate-800 dark:hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto shadow-sm"
                  >
                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingProfile ? copy.savingProfile : copy.saveProfile}
                  </button>
                </div>
              </form>
            </section>

            {/* MEMBERSHIP PLAN */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500">
                  <Crown className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{copy.memberPlanCard}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{copy.memberPlanDesc}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                      {memberSubscription?.active && memberSubscription.plan_id ? copy.memberPlanActive : copy.memberPlanNone}
                    </p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">
                      {memberSubscription?.active && memberSubscription.plan_id
                        ? memberSubscription.plan_id.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
                        : copy.memberPlanNone}
                    </p>
                    {memberSubscription?.active && memberSubscription.expires_at && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <span className="font-semibold">{copy.memberPlanExpires}:</span> {new Date(memberSubscription.expires_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/pricing/member"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm whitespace-nowrap"
                  >
                    {copy.memberPlanCta}
                  </Link>
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {copy.memberPlanBody}
                </p>
              </div>
            </section>

            {/* PRIVACY SETTINGS */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{copy.privacyCard}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{copy.privacyDesc}</p>
              </div>
              <form onSubmit={handlePrivacySubmit} className="p-6">
                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{copy.hideFollowers}</span>
                    <input 
                      type="checkbox" 
                      checked={hideFollowers} 
                      onChange={(e) => setHideFollowers(e.target.checked)} 
                      className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900" 
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{copy.hideFollowing}</span>
                    <input 
                      type="checkbox" 
                      checked={hideFollowing} 
                      onChange={(e) => setHideFollowing(e.target.checked)} 
                      className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900" 
                    />
                  </label>
                </div>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{copy.privacyHint}</p>
                <div className="mt-6 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={savingPrivacy} 
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 transition-colors hover:bg-slate-800 dark:hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto shadow-sm"
                  >
                    {savingPrivacy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {savingPrivacy ? copy.savingPrivacy : copy.savePrivacy}
                  </button>
                </div>
              </form>
            </section>

            {/* PASSWORD & SECURITY */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{copy.passwordCard}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{copy.passwordDesc}</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.currentPassword}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.newPassword}</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder={copy.passwordPlaceholder}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">{copy.confirmPassword}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder={copy.passwordPlaceholder}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={savingPassword} 
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 transition-colors hover:bg-slate-800 dark:hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto shadow-sm"
                  >
                    {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {savingPassword ? copy.savingPassword : copy.savePassword}
                  </button>
                </div>
              </form>
            </section>

            {/* DANGER ZONE */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/30 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-900/10">
                <h2 className="text-lg font-bold text-red-700 dark:text-red-500">{copy.dangerZone}</h2>
              </div>
              <form onSubmit={handleDeleteAccount} className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{copy.deleteAccount}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      {copy.deleteDesc}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{copy.deleteConfirm}</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors"
                  />
                  <div className="mt-4 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={deletingAccount} 
                      className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 w-full sm:w-auto shadow-sm"
                    >
                      {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {deletingAccount ? copy.deleting : copy.deleteBtn}
                    </button>
                  </div>
                </div>
              </form>
            </section>

          </div>
        </SubscriptionGate>
      </div>
    </div>
  );
}