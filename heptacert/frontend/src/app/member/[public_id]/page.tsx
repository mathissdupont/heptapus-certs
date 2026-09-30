"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  BadgeCheck,
  Users,
  Loader2,
  CalendarDays,
  MessageSquare,
  ExternalLink,
  X,
} from "lucide-react";
import {
  getPublicMemberProfile,
  listPublicFeed,
  getPublicMemberMe,
  getPublicMemberToken,
  getConnectionStats,
  getMemberFollowers,
  getMemberFollowing,
  type PublicMemberProfile,
  type CommunityPost,
  type PublicMemberMe,
  type ConnectionStats,
  type ConnectionMemberInfo,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { normalizeExternalUrl } from "@/lib/url";
import { FollowButton } from "@/components/FollowButton";

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
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [followers, setFollowers] = useState<ConnectionMemberInfo[]>([]);
  const [following, setFollowing] = useState<ConnectionMemberInfo[]>([]);
  const [followersLoaded, setFollowersLoaded] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [hideFollowersList, setHideFollowersList] = useState(false);
  const [hideFollowingList, setHideFollowingList] = useState(false);
  const websiteHref = normalizeExternalUrl(member?.website_url || null);
  const [connectionsModal, setConnectionsModal] = useState<"followers" | "following" | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
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
            followers: "Takipçi",
            following: "Takip Edilen",
            hiddenFollowers: "Bu kullanıcı takipçi listesini gizliyor.",
            hiddenFollowing: "Bu kullanıcı takip ettiklerini gizliyor.",
            noFollowers: "Henüz takipçisi yok.",
            noFollowing: "Henüz kimseyi takip etmiyor.",
            showFollowers: "Takipçileri Gör",
            showFollowing: "Takip Edilenleri Gör",
            certificates: "Sertifika Cüzdanı",
            noCertificates: "Henüz herkese açık doğrulanmış sertifika yok.",
            hiddenCertificates: "Bu kullanıcı sertifika cüzdanını gizliyor.",
            certificateCode: "Kod",
            verifyCertificate: "Doğrula",
            active: "Geçerli",
            revoked: "İptal",
            expired: "Süresi doldu",
            close: "Kapat",
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
            visitWebsite: "Website",
            contact: "Contact",
            viewProfile: "View Profile",
            followers: "Followers",
            following: "Following",
            hiddenFollowers: "This member hides their followers list.",
            hiddenFollowing: "This member hides who they follow.",
            noFollowers: "No followers yet.",
            noFollowing: "Not following anyone yet.",
            showFollowers: "View Followers",
            showFollowing: "View Following",
            certificates: "Certificate Wallet",
            noCertificates: "No public verified certificates yet.",
            hiddenCertificates: "This member hides their certificate wallet.",
            certificateCode: "Code",
            verifyCertificate: "Verify",
            active: "Valid",
            revoked: "Revoked",
            expired: "Expired",
            close: "Close",
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
      .then(async ([memberData, postsData, viewerData]) => {
        setMember(memberData);
        setViewer(viewerData);
        const recommended = getRecommendedMembers(
          postsData,
          memberId,
          viewerData?.public_id
        );
        setRecommended(recommended);

        try {
          const stats = await getConnectionStats(memberData.public_id);
          setConnectionStats(stats);
          const isOwner = viewerData?.public_id === memberData.public_id;
          setHideFollowersList(Boolean(stats.hide_followers && !isOwner));
          setHideFollowingList(Boolean(stats.hide_following && !isOwner));
          setFollowers([]);
          setFollowing([]);
          setFollowersLoaded(false);
          setFollowingLoaded(false);
        } catch {
          setConnectionStats(null);
          setFollowers([]);
          setFollowing([]);
          setFollowersLoaded(false);
          setFollowingLoaded(false);
        }
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => setLoading(false));
  }, [memberId, copy.error, lang]);

  const loadConnections = async (type: "followers" | "following") => {
    if (!member) return;

    const isHidden = type === "followers" ? hideFollowersList : hideFollowingList;
    if (isHidden) return;

    const hasLoaded = type === "followers" ? followersLoaded : followingLoaded;
    if (hasLoaded) return;

    setLoadingConnections(true);
    setConnectionsError(null);
    try {
      if (type === "followers") {
        const data = await getMemberFollowers(member.public_id, 100);
        setFollowers(data);
        setFollowersLoaded(true);
      } else {
        const data = await getMemberFollowing(member.public_id, 100);
        setFollowing(data);
        setFollowingLoaded(true);
      }
    } catch (err: any) {
      setConnectionsError(err?.message || copy.error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const openConnectionsModal = (type: "followers" | "following") => {
    const isHidden = type === "followers" ? hideFollowersList : hideFollowingList;
    if (isHidden) return;
    setConnectionsModal(type);
    void loadConnections(type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted mb-4" />
        <p className="text-sm font-medium text-content-muted">{copy.loading}</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-raised rounded-2xl border border-outline-subtle p-8 shadow-sm">
          <h1 className="text-lg font-bold text-content-primary mb-2">{copy.error}</h1>
          <p className="text-content-muted text-sm mb-6">{error}</p>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-canvas border border-outline-subtle text-content-secondary rounded-lg hover:bg-sunken transition text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-16">

      {/* Sticky Clean Header */}
      <div className="sticky top-0 z-40 bg-raised/80 backdrop-blur-md border-b border-outline-subtle px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm font-medium text-content-muted hover:text-content-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{copy.back}</span>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">

        {/* MAIN PROFILE CARD */}
        <article className="bg-raised rounded-2xl shadow-sm border border-outline-subtle overflow-hidden mb-8">
          {/* Cover Area */}
          <div className="h-28 sm:h-36 bg-gradient-to-r from-sunken to-canvas border-b border-outline-subtle" />

          <div className="px-5 sm:px-8 pb-6 sm:pb-8">
            {/* Avatar & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4 sm:mb-6">

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white bg-canvas shadow-sm flex items-center justify-center overflow-hidden">
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl font-bold text-content-muted">
                      {member.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons (Right aligned on desktop, full width on mobile) */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                {viewer && viewer.public_id !== member.public_id && (
                  <div className="flex-1 sm:flex-none">
                    <FollowButton memberId={member.public_id} isFollowing={!!connectionStats?.is_following} />
                  </div>
                )}

                {member.contact_email && (
                  <a
                    href={`mailto:${member.contact_email}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-inverse-surface text-white rounded-lg hover:bg-inverse-surface transition font-medium text-sm shadow-sm"
                  >
                    <Mail className="h-4 w-4" />
                    {copy.contact}
                  </a>
                )}

                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-raised text-content-secondary rounded-lg hover:bg-canvas transition font-medium text-sm border border-outline-subtle shadow-sm"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{copy.visitWebsite}</span>
                    <span className="sm:hidden">Web</span>
                  </a>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-content-primary truncate">
                {member.display_name}
              </h1>

              {/* Headline & Location */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-content-secondary">
                {member.headline && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-content-muted" />
                    <span className="font-medium truncate">{member.headline}</span>
                  </div>
                )}
                {member.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-content-muted" />
                    <span className="truncate">{member.location}</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              {member.bio && (
                <p className="mt-4 text-sm text-content-secondary leading-relaxed whitespace-pre-wrap break-words max-w-2xl">
                  {member.bio}
                </p>
              )}

              {/* Text-Based Clean Stats (Replacing Bulky Gray Boxes) */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6 pt-5 border-t border-outline-subtle">
                <div className="flex items-center gap-1.5">
                  {hideFollowersList ? (
                    <span className="text-sm text-content-muted">
                      <span className="font-bold text-content-primary">{connectionStats?.follower_count ?? 0}</span> {copy.followers}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openConnectionsModal("followers")}
                      className="text-sm text-content-muted hover:text-content-primary transition-colors"
                    >
                      <span className="font-bold text-content-primary">{connectionStats?.follower_count ?? 0}</span> {copy.followers}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {hideFollowingList ? (
                    <span className="text-sm text-content-muted">
                      <span className="font-bold text-content-primary">{connectionStats?.following_count ?? 0}</span> {copy.following}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openConnectionsModal("following")}
                      className="text-sm text-content-muted hover:text-content-primary transition-colors"
                    >
                      <span className="font-bold text-content-primary">{connectionStats?.following_count ?? 0}</span> {copy.following}
                    </button>
                  )}
                </div>
                <div className="h-4 w-px bg-sunken hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-content-muted" />
                  <span className="font-bold text-content-primary">{member.certificates?.length ?? 0}</span>
                  <span className="text-sm text-content-muted">{copy.certificates}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-content-muted" />
                  <span className="font-bold text-content-primary">{member.event_count}</span>
                  <span className="text-sm text-content-muted">{copy.events}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-content-muted" />
                  <span className="font-bold text-content-primary">{member.comment_count}</span>
                  <span className="text-sm text-content-muted">{copy.comments}</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <section className="bg-raised rounded-2xl border border-outline-subtle p-5 sm:p-6 shadow-sm mb-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-content-muted" />
              {copy.certificates}
            </h2>
            <span className="rounded-full border border-outline-subtle bg-canvas px-2.5 py-1 text-xs font-semibold text-content-muted">
              {(member.certificates?.length ?? 0).toLocaleString(localeTag(lang))}
            </span>
          </div>

          {member.certificates_hidden ? (
            <p className="rounded-xl border border-dashed border-outline-subtle bg-canvas px-4 py-6 text-center text-sm text-content-muted">
              {copy.hiddenCertificates}
            </p>
          ) : member.certificates?.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {member.certificates.map((cert) => {
                const statusLabel =
                  cert.status === "active" ? copy.active : cert.status === "revoked" ? copy.revoked : copy.expired;
                const statusClass =
                  cert.status === "active"
                    ? "border-status-success-border bg-status-success-bg text-status-success-content"
                    : cert.status === "revoked"
                      ? "border-status-danger-border bg-status-danger-bg text-status-danger-content"
                      : "border-status-warning-border bg-status-warning-bg text-status-warning-content";

                return (
                  <article key={cert.uuid} className="rounded-xl border border-outline-subtle bg-canvas/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-content-primary">{cert.event_name}</h3>
                        <p className="mt-1 text-xs text-content-muted">
                          {cert.issued_at
                            ? new Date(cert.issued_at).toLocaleDateString(localeTag(lang), {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : cert.event_date || ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-11 font-bold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {cert.public_id && (
                      <div className="mt-3 text-11 text-content-muted">
                        {copy.certificateCode}: <code className="font-mono text-content-secondary">{cert.public_id}</code>
                      </div>
                    )}

                    <Link
                      href={`/verify/${cert.uuid}`}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-outline-subtle bg-raised px-3 py-2 text-sm font-semibold text-content-secondary transition hover:bg-sunken"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {copy.verifyCertificate}
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-outline-subtle bg-canvas px-4 py-6 text-center text-sm text-content-muted">
              {copy.noCertificates}
            </p>
          )}
        </section>

        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-raised rounded-2xl border border-outline-subtle p-5 shadow-sm">
            <h2 className="text-base font-bold text-content-primary mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-content-muted" />
              {copy.followers}
            </h2>
            {hideFollowersList ? (
              <p className="text-sm text-content-muted">{copy.hiddenFollowers}</p>
            ) : (
              <button
                type="button"
                onClick={() => openConnectionsModal("followers")}
                className="text-sm text-content-secondary hover:text-content-primary transition-colors"
              >
                {copy.showFollowers}
              </button>
            )}
          </section>

          <section className="bg-raised rounded-2xl border border-outline-subtle p-5 shadow-sm">
            <h2 className="text-base font-bold text-content-primary mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-content-muted" />
              {copy.following}
            </h2>
            {hideFollowingList ? (
              <p className="text-sm text-content-muted">{copy.hiddenFollowing}</p>
            ) : (
              <button
                type="button"
                onClick={() => openConnectionsModal("following")}
                className="text-sm text-content-secondary hover:text-content-primary transition-colors"
              >
                {copy.showFollowing}
              </button>
            )}
          </section>
        </div>

        {/* RECOMMENDED MEMBERS */}
        {recommended.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-content-primary mb-4 px-1 flex items-center gap-2">
              {copy.recommended}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended.map((rec) => (
                <Link
                  key={rec.public_id}
                  href={`/member/${rec.public_id}`}
                  className="group flex flex-col bg-raised rounded-xl shadow-sm border border-outline-subtle hover:border-outline-strong transition-colors overflow-hidden min-w-0"
                >
                  <div className="p-4 flex items-start gap-3 min-w-0">
                    {/* Small Circular Avatar */}
                    <div className="h-12 w-12 flex-shrink-0 rounded-full bg-canvas border border-outline-subtle flex items-center justify-center overflow-hidden mt-0.5">
                      {rec.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rec.avatar_url}
                          alt={rec.display_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-semibold text-content-muted">
                          {rec.display_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-content-primary text-sm truncate group-hover:text-status-info-content transition-colors">
                        {rec.display_name}
                      </h3>

                      <p className="text-xs text-content-muted truncate mt-0.5">
                        {rec.headline || "Üye"}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="flex items-center gap-1 text-11 font-medium text-content-muted bg-canvas px-1.5 py-0.5 rounded border border-outline-subtle truncate">
                          <CalendarDays className="h-3 w-3" />
                          <span className="truncate">{rec.event_count} Etkinlik</span>
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

      {connectionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={copy.close}
            className="absolute inset-0 bg-black/40"
            onClick={() => setConnectionsModal(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-outline-subtle bg-raised shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-subtle px-4 py-3">
              <h3 className="text-base font-semibold text-content-primary">
                {connectionsModal === "followers" ? copy.followers : copy.following}
              </h3>
              <button
                type="button"
                onClick={() => setConnectionsModal(null)}
                className="rounded-md p-1 text-content-muted hover:bg-sunken hover:text-content-secondary"
                aria-label={copy.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-3">
              {loadingConnections ? (
                <div className="py-8 text-center text-sm text-content-muted">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  {copy.loading}
                </div>
              ) : connectionsError ? (
                <div className="py-6 text-center text-sm text-status-danger-content">{connectionsError}</div>
              ) : (connectionsModal === "followers" ? followers : following).length === 0 ? (
                <div className="py-6 text-center text-sm text-content-muted">
                  {connectionsModal === "followers" ? copy.noFollowers : copy.noFollowing}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {(connectionsModal === "followers" ? followers : following).map((f) => (
                    <Link
                      key={f.public_id}
                      href={`/member/${f.public_id}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-canvas transition-colors"
                      onClick={() => setConnectionsModal(null)}
                    >
                      <div className="h-9 w-9 flex-shrink-0 rounded-full bg-sunken border border-outline-subtle flex items-center justify-center overflow-hidden">
                        {f.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.avatar_url} alt={f.display_name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-content-muted">{f.display_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <p className="truncate text-sm font-semibold text-content-primary">{f.display_name}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
