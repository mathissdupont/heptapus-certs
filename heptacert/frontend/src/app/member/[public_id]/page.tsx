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
            error: "Profil bulunamadı",
            recommended: "Önerilen Üyeler",
            noRecommendations: "Henüz kimse önerilmiyor",
            events: "Etkinlik",
            comments: "Yorum",
            joined: "Katılma Tarihi",
            location: "Konum",
            visitWebsite: "Web Sitesi",
            contact: "İletişim",
            viewProfile: "Profili İncele",
          }
        : {
            back: "Back",
            loading: "Loading profile...",
            error: "Profile not found",
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm font-medium">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{copy.error}</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-12">
      {/* Navbar / Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-12">
          {/* Subtle Cover Photo Area */}
          <div className="h-32 bg-slate-100/80 border-b border-gray-100 w-full" />

          <div className="px-6 sm:px-10 pb-8">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 -mt-16 mb-6">
              {/* Avatar - Circular and Clean */}
              <div className="relative flex-shrink-0">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.display_name}
                    className="h-32 w-32 rounded-full object-cover shadow-sm border-4 border-white bg-white"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-slate-100 border-4 border-white shadow-sm flex items-center justify-center">
                    <span className="text-4xl font-semibold text-slate-400">
                      {member.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Subtle Status Indicator */}
                <div className="absolute bottom-2 right-2 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" title="Active" />
              </div>

              {/* Info Section */}
              <div className="flex-1 pt-2 sm:pt-16">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {member.display_name}
                </h1>

                {member.headline && (
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span className="text-base font-medium">{member.headline}</span>
                  </div>
                )}

                {member.location && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>{member.location}</span>
                  </div>
                )}

                {member.bio && (
                  <p className="text-gray-600 text-sm leading-relaxed max-w-2xl mb-6">
                    {member.bio}
                  </p>
                )}

                {/* Clean Stats Cards */}
                <div className="flex gap-4 mb-8">
                  <div className="flex flex-col justify-center rounded-xl bg-gray-50 px-5 py-3 border border-gray-100 min-w-[120px]">
                    <span className="text-2xl font-bold text-slate-800">
                      {member.event_count}
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-0.5">
                      {copy.events}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center rounded-xl bg-gray-50 px-5 py-3 border border-gray-100 min-w-[120px]">
                    <span className="text-2xl font-bold text-slate-800">
                      {member.comment_count}
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-0.5">
                      {copy.comments}
                    </span>
                  </div>
                </div>

                {/* Action Buttons - Minimalist */}
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://heptapusgroup.com/contact?member=${member.display_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium text-sm shadow-sm"
                  >
                    <Mail className="h-4 w-4" />
                    {copy.contact}
                  </a>
                  {member.website_url && (
                    <a
                      href={member.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm border border-gray-200 shadow-sm"
                    >
                      <Globe className="h-4 w-4" />
                      {copy.visitWebsite}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Members Section */}
        {recommended.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">
              {copy.recommended}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended.map((rec) => (
                <Link
                  key={rec.public_id}
                  href={`/member/${rec.public_id}`}
                  className="group flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5 flex items-start gap-4">
                    {/* Small Circular Avatar */}
                    {rec.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rec.avatar_url}
                        alt={rec.display_name}
                        className="h-14 w-14 rounded-full object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-slate-100 border border-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-slate-500">
                          {rec.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base truncate group-hover:text-blue-600 transition-colors">
                        {rec.display_name}
                      </h3>
                      
                      {rec.headline ? (
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {rec.headline}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          Üye
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <Users className="h-3.5 w-3.5" />
                          <span>{rec.event_count} Etkinlik</span>
                        </div>
                      </div>
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