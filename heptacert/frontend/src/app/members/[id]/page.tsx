"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Globe, Loader2, MapPin, MessageSquare, UserCircle2 } from "lucide-react";
import { getPublicMemberProfile, type PublicMemberProfile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function PublicMemberProfilePage() {
  const params = useParams();
  const memberId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);
  const { lang } = useI18n();
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    back: "Etkinliklere dön",
    fallback: "Profil yüklenemedi.",
    events: "Katıldığı etkinlik",
    comments: "Görünür yorum",
    memberSince: "Üyelik başlangıcı",
  } : {
    back: "Back to events",
    fallback: "Could not load profile.",
    events: "Events joined",
    comments: "Visible comments",
    memberSince: "Member since",
  }, [lang]);

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      setError(copy.fallback);
      return;
    }
    setLoading(true);
    setError(null);
    getPublicMemberProfile(memberId)
      .then(setProfile)
      .catch((err: any) => setError(err?.message || copy.fallback))
      .finally(() => setLoading(false));
  }, [copy.fallback, memberId]);

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
  }

  if (!profile || error) {
    return <div className="mx-auto max-w-3xl px-6 py-12"><div className="error-banner">{error || copy.fallback}</div></div>;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-12 lg:px-8">
      <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
        {copy.back}
      </Link>

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),linear-gradient(135deg,#ffffff_0%,#eff6ff_48%,#f8fafc_100%)] px-6 py-8 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] border border-white bg-slate-50 shadow-sm">
              {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" /> : <UserCircle2 className="h-14 w-14 text-slate-300" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{profile.display_name}</h1>
              {profile.headline ? <p className="mt-2 text-base font-medium text-slate-600">{profile.headline}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.location ? <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"><MapPin className="h-3.5 w-3.5" />{profile.location}</span> : null}
                {profile.website_url ? <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-900"><Globe className="h-3.5 w-3.5" />{profile.website_url}</a> : null}
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"><CalendarDays className="h-3.5 w-3.5" />{copy.memberSince}: {new Date(profile.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-3 md:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.events}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{profile.event_count}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.comments}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{profile.comment_count}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.memberSince}</p>
            <p className="mt-2 text-base font-bold text-slate-900">{new Date(profile.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}</p>
          </div>
        </div>

        <div className="px-6 pb-8 md:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquare className="h-4 w-4" />
              Bio
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{profile.bio || "-"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
