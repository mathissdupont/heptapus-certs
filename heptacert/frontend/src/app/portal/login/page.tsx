"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Lock, Mail } from "lucide-react";
import { getPublicMemberToken, loginPublicMember, publicApiFetch, setPublicMemberToken } from "@/lib/api";

type OrgBranding = {
  org_id: number;
  org_name: string;
  brand_color: string;
  brand_logo: string | null;
  lms_portal_title: string;
  lms_support_email: string;
  lms_welcome_text: string;
};

export default function PortalLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgParam = searchParams.get("org");

  const [branding, setBranding] = useState<OrgBranding | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getPublicMemberToken()) {
      const dest = orgParam ? `/portal?org=${orgParam}` : "/portal";
      router.replace(dest);
      return;
    }
    if (!orgParam) return;
    publicApiFetch(`/public/orgs/${orgParam}/lms-branding`)
      .then((r) => (r as Response).json())
      .then((d: OrgBranding) => setBranding(d))
      .catch(() => null);
  }, [orgParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginPublicMember({ email, password });
      setPublicMemberToken(data.access_token);
      const dest = orgParam ? `/portal?org=${orgParam}` : "/portal";
      router.push(dest);
    } catch (err: any) {
      setError(err?.message || "Giriş başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  const brandColor = branding?.brand_color || "#6366f1";
  const portalTitle = branding?.lms_portal_title || branding?.org_name || "Öğrenci Portalı";
  const welcomeText = branding?.lms_welcome_text || "Kurslarınıza ve sertifikalarınıza erişmek için giriş yapın.";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: `${brandColor}08` }}>
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: brandColor }} />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">

          {/* Brand header */}
          <div className="text-center space-y-3">
            {branding?.brand_logo ? (
              <img
                src={branding.brand_logo}
                alt={portalTitle}
                className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-md"
              />
            ) : (
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-md"
                style={{ backgroundColor: brandColor }}
              >
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{portalTitle}</h1>
              {branding?.org_name && branding.lms_portal_title && (
                <p className="text-sm text-slate-500">{branding.org_name}</p>
              )}
            </div>
          </div>

          {/* Welcome card */}
          {welcomeText && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-white"
              style={{ backgroundColor: brandColor }}
            >
              {welcomeText}
            </div>
          )}

          {/* Login form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
          >
            <h2 className="text-base font-semibold text-slate-800">Öğrenci Girişi</h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="siz@example.com"
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                  style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: brandColor }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>

            <div className="text-center">
              <a
                href="/forgot-password"
                className="text-xs text-slate-400 hover:underline"
              >
                Şifremi unuttum
              </a>
            </div>
          </form>

          {branding?.lms_support_email && (
            <p className="text-center text-xs text-slate-400">
              Yardım için:{" "}
              <a href={`mailto:${branding.lms_support_email}`} className="hover:underline">
                {branding.lms_support_email}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
