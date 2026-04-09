"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  Users,
  Loader2,
} from "lucide-react";
import {
  getPublicMemberProfile,
  listPublicFeed,
  getPublicMemberMe,
  getPublicMemberToken,
  type PublicMemberProfile,
  type CommunityPost,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface RecommendedMember {
  public_id: string;
  display_name: string;
  headline?: string;
  location?: string;
  avatar_url?: string;
  event_count: number;
}

function getRecommendedMembers(
  allPosts: CommunityPost[],
  currentMemberId: string,
  viewerId: string | undefined
): RecommendedMember[] {
  // Extract unique members from posts (excluding current member and viewer)
  const memberMap = new Map<string, RecommendedMember>();

  allPosts.forEach((post) => {
    if (
      post.author_type === "member" &&
      post.author_public_id &&
      post.author_public_id !== currentMemberId &&
      post.author_public_id !== viewerId
    ) {
      if (!memberMap.has(post.author_public_id)) {
        memberMap.set(post.author_public_id, {
          public_id: post.author_public_id,
          display_name: post.author_name,
          avatar_url: post.author_avatar_url || undefined,
          headline: "Active Member",
          event_count: 0,
        });
      }
    }
  });

  return Array.from(memberMap.values()).slice(0, 6);
}

export default function PublicMemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = Array.isArray(params?.public_id)
    ? params.public_id[0]
    : params?.public_id;
  const { lang } = useI18n();

  const [member, setMember] = useState<PublicMemberProfile | null>(null);
  const [recommended, setRecommended] = useState<RecommendedMember[]>([]);
  const [viewer, setViewer] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            back: "Geri Dön",
            loading: "Profil yükleniyor...",
            error: "Profil yüklenemedi",
            recommended: "Önerilen Üyeler",
            noRecommendations: "Henüz kimse önerilmiyor",
            events: "Etkinlik",
            comments: "Yorum",
            joined: "Katılma Tarihi",
            location: "Konum",
            visitWebsite: "Web Sitesi",
            contact: "İletişim",
            viewProfile: "Profili Gör",
          }
        : {
            back: "Back",
            loading: "Loading profile...",
            error: "Failed to load profile",
            recommended: "Recommended People",
            noRecommendations: "No recommendations yet",
            events: "Events",
            comments: "Comments",
            joined: "Joined",
            location: "Location",
            visitWebsite: "Visit Website",
            contact: "Contact",
            viewProfile: "View Profile",
          },
    [lang]
  );

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      setError(copy.error);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getPublicMemberProfile(memberId),
      listPublicFeed({ limit: 50 }),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([memberData, postsData, viewerData]) => {
        setMember(memberData);
        setViewer(viewerData);
        const recommended = getRecommendedMembers(
          postsData,
          memberId,
          viewerData?.public_id
        );
        setRecommended(recommended);
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => setLoading(false));
  }, [memberId, copy.error, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{copy.error}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-50 to-slate-100 overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Main Profile Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-12">
          {/* Dynamic Gradient Cover */}
          <div className="relative h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 via-transparent to-pink-600/40 opacity-50" />
            <div className="absolute inset-0 backdrop-blur-3xl" />
          </div>

          {/* Profile Content */}
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row gap-6 -mt-24 mb-8">
              {/* Avatar - Large & Prominent */}
              <div className="relative z-10 flex-shrink-0">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.display_name}
                    className="h-48 w-48 rounded-2xl object-cover shadow-2xl ring-4 ring-white hover:shadow-3xl transition duration-300"
                  />
                ) : (
                  <div className="h-48 w-48 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-2xl ring-4 ring-white hover:shadow-3xl transition duration-300">
                    <span className="text-6xl font-bold text-white">
                      {member.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Status indicator */}
                <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 ring-4 ring-white shadow-lg" />
              </div>

              {/* Info Section */}
              <div className="flex-1 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 mb-2">
                      {member.display_name}
                    </h1>

                    {member.headline && (
                      <p className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                        {member.headline}
                      </p>
                    )}

                    {member.location && (
                      <p className="text-slate-600 mb-3 flex items-center gap-2 text-base">
                        <MapPin className="h-5 w-5 text-slate-400" />
                        {member.location}
                      </p>
                    )}

                    {member.bio && (
                      <p className="text-slate-700 mb-6 text-base leading-relaxed max-w-xl">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 px-5 py-4 border border-blue-200/50 hover:shadow-lg transition duration-300">
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-700">
                      {member.event_count}
                    </div>
                    <div className="text-sm font-semibold text-blue-700 mt-1">{copy.events} Katılımı</div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 px-5 py-4 border border-purple-200/50 hover:shadow-lg transition duration-300">
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-700">
                      {member.comment_count}
                    </div>
                    <div className="text-sm font-semibold text-purple-700 mt-1">{copy.comments} İçeriği</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {member.website_url && (
                    <a
                      href={member.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition font-semibold text-sm border-2 border-slate-300 hover:border-slate-400 shadow-md hover:shadow-lg"
                    >
                      <Globe className="h-4 w-4" />
                      {copy.visitWebsite}
                    </a>
                  )}
                  <a
                    href={`https://heptapusgroup.com/contact?member=${member.display_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition font-semibold text-sm shadow-lg hover:shadow-2xl transform hover:scale-105"
                  >
                    <Mail className="h-4 w-4" />
                    {copy.contact}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Members Section */}
        {recommended.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <span className="text-3xl">👥</span>
              {copy.recommended}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommended.map((rec) => (
                <Link
                  key={rec.public_id}
                  href={`/member/${rec.public_id}`}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 overflow-hidden transform hover:-translate-y-2"
                >
                  {/* Image Header */}
                  <div className="relative h-40 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 overflow-hidden">
                    {rec.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rec.avatar_url}
                        alt={rec.display_name}
                        className="h-full w-full object-cover group-hover:scale-110 transition duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-5xl font-bold text-white opacity-30">
                          {rec.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">
                      {rec.display_name}
                    </h3>

                    {rec.headline && (
                      <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                        {rec.headline}
                      </p>
                    )}

                    {rec.location && (
                      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {rec.location}
                      </p>
                    )}

                    {/* Event Stats */}
                    <div className="flex items-center gap-1 text-xs text-slate-600 mb-4 bg-blue-50 rounded-lg px-3 py-2">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span className="font-semibold text-blue-600">{rec.event_count}</span>
                      <span className="text-blue-700">{copy.events}</span>
                    </div>

                    {/* CTA */}
                    <div className="w-full px-3 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold text-sm text-center">
                      {copy.viewProfile}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
