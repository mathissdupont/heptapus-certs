"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Globe,
  Heart,
  Instagram,
  Loader2,
  MessageCircle,
  Send,
  Users,
  Calendar,
} from "lucide-react";
import {
  createCommunityPostComment,
  createOrganizationFeedPost,
  followPublicOrganization,
  getPublicMemberMe,
  getPublicMemberToken,
  getPublicOrganizationDetail,
  likeCommunityPost,
  listCommunityPostComments,
  listOrganizationFeed,
  unfollowPublicOrganization,
  unlikeCommunityPost,
  type CommunityPost,
  type CommunityPostComment,
  type PublicMemberMe,
  type PublicOrganizationDetail,
} from "@/lib/api";
import { useI18n, type Lang } from "@/lib/i18n";
import { normalizeExternalUrl } from "@/lib/url";
import { fetchCurrentBranding, isWhiteLabelBranding } from "@/lib/whiteLabel";

function formatTimestamp(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(localeTag(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PublicOrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgPublicId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { lang, t } = useI18n();
  const [org, setOrg] = useState<PublicOrganizationDetail | null>(null);
  const [viewer, setViewer] = useState<PublicMemberMe | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityPostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postBody, setPostBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [posting, setPosting] = useState(false);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWhiteLabel, setIsWhiteLabel] = useState(false);

  const copy = useMemo(() => ({
    back: t("org_detail_back"),
    organizationBack: t("org_detail_organization_back"),
    loading: t("org_detail_loading"),
    error: t("org_detail_error"),
    followers: t("org_detail_followers"),
    events: t("org_detail_events"),
    follow: t("org_detail_follow"),
    unfollow: t("org_detail_unfollow"),
    loginToFollow: t("org_detail_login_follow"),
    feed: t("org_detail_feed_section"),
    noEvents: t("org_detail_no_events"),
    social: t("org_detail_social_links"),
  }), [t]);

  useEffect(() => {
    if (!orgPublicId) {
      setLoading(false);
      setLoadingFeed(false);
      setError(copy.error);
      return;
    }
    setLoading(true);
    setLoadingFeed(true);
    setError(null);
    Promise.all([
      getPublicOrganizationDetail(orgPublicId),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
      fetchCurrentBranding().catch(() => null),
    ])
      .then(([orgData, viewerData, brandingData]) => {
        const whiteLabel = isWhiteLabelBranding(brandingData, typeof window !== "undefined" ? window.location.hostname : "");
        if (whiteLabel && brandingData?.public_id && brandingData.public_id !== orgData.public_id) {
          router.replace("/");
          return;
        }
        setIsWhiteLabel(whiteLabel);
        setOrg(orgData);
        setViewer(viewerData);
        if (whiteLabel) {
          setPosts([]);
          setLoadingFeed(false);
          return;
        }
        listOrganizationFeed(orgPublicId, { limit: 20 })
          .then((feedData) => setPosts(feedData))
          .catch((err: any) => setError(err?.message || copy.error))
          .finally(() => setLoadingFeed(false));
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => {
        setLoading(false);
      });
  }, [copy.error, orgPublicId, router]);

  async function handleFollowToggle() {
    if (!org) return;
    if (!getPublicMemberToken()) {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (org.is_following) {
        await unfollowPublicOrganization(org.public_id);
        setOrg((current) => current ? { ...current, is_following: false, follower_count: Math.max(0, current.follower_count - 1) } : current);
      } else {
        await followPublicOrganization(org.public_id);
        setOrg((current) => current ? { ...current, is_following: true, follower_count: current.follower_count + 1 } : current);
      }
    } catch (err: any) {
      setError(err?.message || copy.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePost() {
    if (!org || !postBody.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const created = await createOrganizationFeedPost(org.public_id, postBody.trim());
      setPosts((current) => [created, ...current]);
      setPostBody("");
    } catch (err: any) {
      setError(err?.message || copy.error);
    } finally {
      setPosting(false);
    }
  }

  async function loadComments(postPublicId: string) {
    if (commentsByPost[postPublicId]) return;
    try {
      const items = await listCommunityPostComments(postPublicId, { limit: 20 });
      setCommentsByPost((current) => ({ ...current, [postPublicId]: items }));
    } catch (err: any) {
      setError(err?.message || copy.error);
    }
  }

  async function handleToggleLike(post: CommunityPost) {
    if (!viewer) {
      window.location.href = "/login?mode=member";
      return;
    }
    setBusyPostId(post.public_id);
    try {
      if (post.liked_by_me) {
        await unlikeCommunityPost(post.public_id);
        setPosts((current) => current.map((item) => item.public_id === post.public_id ? { ...item, liked_by_me: false, like_count: Math.max(0, item.like_count - 1) } : item));
      } else {
        await likeCommunityPost(post.public_id);
        setPosts((current) => current.map((item) => item.public_id === post.public_id ? { ...item, liked_by_me: true, like_count: item.like_count + 1 } : item));
      }
    } catch (err: any) {
      setError(err?.message || copy.error);
    } finally {
      setBusyPostId(null);
    }
  }

  async function handleComment(postPublicId: string) {
    const body = (commentInputs[postPublicId] || "").trim();
    if (!body) return;
    if (!viewer) {
      window.location.href = "/login?mode=member";
      return;
    }
    setBusyPostId(postPublicId);
    try {
      const created = await createCommunityPostComment(postPublicId, body);
      setCommentsByPost((current) => ({ ...current, [postPublicId]: [...(current[postPublicId] || []), created] }));
      setCommentInputs((current) => ({ ...current, [postPublicId]: "" }));
      setPosts((current) => current.map((item) => item.public_id === postPublicId ? { ...item, comment_count: item.comment_count + 1 } : item));
    } catch (err: any) {
      setError(err?.message || copy.error);
    } finally {
      setBusyPostId(null);
    }
  }

  const socialLinks = org ? [
    { href: normalizeExternalUrl(org.website_url), label: "Website", icon: Globe },
    { href: normalizeExternalUrl(org.linkedin_url), label: "LinkedIn", icon: ExternalLink },
    { href: normalizeExternalUrl(org.github_url), label: "GitHub", icon: Github },
    { href: normalizeExternalUrl(org.x_url), label: "X", icon: ExternalLink },
    { href: normalizeExternalUrl(org.instagram_url), label: "Instagram", icon: Instagram },
  ].filter((item) => !!item.href) : [];
  const backHref = isWhiteLabel ? "/" : "/organizations";
  const backLabel = isWhiteLabel ? copy.organizationBack : copy.back;

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center text-content-muted">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm font-medium">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="text-xl font-semibold text-content-primary mb-2">{copy.error || error}</h1>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-raised border border-outline-subtle text-content-secondary rounded-lg hover:bg-canvas transition text-sm font-medium shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-12">
      {/* Navbar / Header */}
      <div className="sticky top-0 z-40 bg-raised/80 backdrop-blur-md border-b border-outline-subtle px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-content-muted hover:text-content-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        {/* Main Organization Card */}
        <div className="bg-raised rounded-2xl shadow-sm border border-outline-subtle overflow-hidden mb-8">
          {/* Subtle Cover Photo with Brand Color */}
          <div
            className="h-32 w-full opacity-10"
            style={{ backgroundColor: org.brand_color || "rgb(var(--content-faint))" }}
          />

          <div className="px-6 sm:px-10 pb-8">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 -mt-16 mb-6">
              {/* Logo */}
              <div className="relative flex-shrink-0">
                <div className="h-32 w-32 rounded-xl bg-raised border-4 border-white shadow-sm flex items-center justify-center overflow-hidden">
                  {org.brand_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.brand_logo} alt={org.org_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl font-semibold text-content-muted">
                      {org.org_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 pt-2 sm:pt-16 flex flex-col sm:flex-row justify-between items-start gap-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-content-primary mb-3">
                    {org.org_name}
                  </h1>

                  {org.bio && (
                    <p className="text-content-secondary text-sm leading-relaxed max-w-2xl mb-6">
                      {org.bio}
                    </p>
                  )}

                  {/* Clean Stats */}
                  <div className="flex gap-4 mb-6">
                    <div className="flex flex-col justify-center rounded-xl bg-canvas px-5 py-3 border border-outline-subtle min-w-[120px]">
                      <span className="text-2xl font-bold text-content-primary">
                        {org.follower_count.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-content-muted uppercase tracking-wide mt-0.5">
                        {copy.followers}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center rounded-xl bg-canvas px-5 py-3 border border-outline-subtle min-w-[120px]">
                      <span className="text-2xl font-bold text-content-primary">
                        {org.event_count.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-content-muted uppercase tracking-wide mt-0.5">
                        {copy.events}
                      </span>
                    </div>
                  </div>

                  {/* Social Links */}
                  {socialLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {socialLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={item.label}
                            href={item.href || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-subtle bg-raised text-sm font-medium text-content-secondary hover:bg-canvas transition-colors shadow-sm"
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isWhiteLabel && (
                  <button
                    type="button"
                    onClick={() => void handleFollowToggle()}
                    disabled={busy}
                    className="inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition disabled:opacity-60 shrink-0 whitespace-nowrap shadow-sm w-full sm:w-auto"
                    style={{
                      backgroundColor: getPublicMemberToken()
                        ? org.is_following
                          ? "#f3f4f6"
                          : org.brand_color || "#0f172a"
                        : org.brand_color || "#0f172a",
                      color: getPublicMemberToken()
                        ? org.is_following
                          ? "#374151"
                          : "#ffffff"
                        : "#ffffff",
                      border: getPublicMemberToken() && org.is_following ? "1px solid #e5e7eb" : "1px solid transparent",
                    }}
                  >
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {getPublicMemberToken()
                      ? org.is_following
                        ? copy.unfollow
                        : copy.follow
                      : copy.loginToFollow}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-8 ${isWhiteLabel ? "" : "lg:grid-cols-3"}`}>
          {/* Main Feed Column (Left / 2-cols wide) */}
          {!isWhiteLabel && (
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-content-primary px-1">
              {copy.feed}
            </h2>

            {/* Post Input */}
            <div className="bg-raised rounded-xl shadow-sm border border-outline-subtle p-5">
              {viewer ? (
                <div className="space-y-4">
                  <textarea
                    className="w-full rounded-lg border border-outline-subtle bg-canvas px-4 py-3 text-sm text-content-primary outline-none transition focus:border-outline-strong focus:ring-1 focus:ring-outline-strong focus:bg-raised placeholder-content-faint resize-none min-h-[100px]"
                    value={postBody}
                    onChange={(event) => setPostBody(event.target.value)}
                    maxLength={1500}
                    placeholder={t("org_detail_post_placeholder")}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-content-muted">
                      {postBody.length}/1500
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCreatePost()}
                      disabled={posting || !postBody.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-inverse-surface px-5 py-2 text-sm font-medium text-white transition hover:bg-inverse-surface disabled:opacity-60 shadow-sm"
                    >
                      {posting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("org_detail_posting")}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {t("org_detail_post_submit")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm text-content-muted mb-4">
                    {t("org_detail_login_to_post")}
                  </p>
                  <button
                    onClick={() => (window.location.href = "/login?mode=member")}
                    className="inline-flex items-center rounded-lg bg-raised border border-outline-subtle px-4 py-2 text-sm font-medium text-content-secondary hover:bg-canvas transition shadow-sm"
                  >
                    {t("org_detail_sign_in")}
                  </button>
                </div>
              )}
            </div>

            {/* Posts List */}
            {loadingFeed ? (
              <div className="flex items-center justify-center py-12 text-sm text-content-muted">
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                {copy.loading}
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-strong bg-canvas px-6 py-12 text-center text-sm text-content-muted">
                <p>
                  {t("org_detail_no_feed")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <article
                    key={post.public_id}
                    className="bg-raised rounded-xl shadow-sm border border-outline-subtle p-5"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-sunken border border-outline-subtle flex items-center justify-center overflow-hidden flex-shrink-0">
                        {post.author_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.author_avatar_url}
                            alt={post.author_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-content-muted">
                            {post.author_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-content-primary">
                          {post.author_name}
                        </p>
                        <p className="text-xs text-content-muted mt-0.5">
                          {formatTimestamp(post.created_at, lang)}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed text-content-secondary mb-4 whitespace-pre-wrap">
                      {post.body}
                    </p>

                    {/* Engagement Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-outline-subtle">
                      <button
                        type="button"
                        onClick={() => void handleToggleLike(post)}
                        disabled={busyPostId === post.public_id}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          post.liked_by_me
                            ? "text-status-danger-content"
                            : "text-content-muted hover:text-content-secondary"
                        } disabled:opacity-60`}
                      >
                        {busyPostId === post.public_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Heart
                            className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`}
                          />
                        )}
                        <span>{post.like_count}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadComments(post.public_id)}
                        className="flex items-center gap-1.5 text-sm font-medium text-content-muted hover:text-content-secondary transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comment_count}</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {commentsByPost[post.public_id] && (
                      <div className="mt-4 pt-4 border-t border-outline-subtle space-y-4">
                        {(commentsByPost[post.public_id] || []).map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-sunken flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-medium text-content-muted">
                                {comment.member_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 bg-canvas rounded-xl px-4 py-3">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-medium text-content-primary">
                                  {comment.member_name}
                                </span>
                                <span className="text-11 text-content-muted">
                                  {formatTimestamp(comment.created_at, lang)}
                                </span>
                              </div>
                              <p className="text-sm text-content-secondary">
                                {comment.body}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Comment Input */}
                        {viewer && (
                          <div className="flex gap-2 pt-2">
                            <input
                              value={commentInputs[post.public_id] || ""}
                              onChange={(event) =>
                                setCommentInputs((current) => ({
                                  ...current,
                                  [post.public_id]: event.target.value,
                                }))
                              }
                              placeholder={t("feed_comment_placeholder")}
                              className="flex-1 rounded-lg border border-outline-subtle bg-raised px-3 py-2 text-sm text-content-primary outline-none transition focus:border-outline-strong focus:ring-1 focus:ring-outline-strong"
                            />
                            <button
                              type="button"
                              onClick={() => void handleComment(post.public_id)}
                              disabled={
                                busyPostId === post.public_id ||
                                !(commentInputs[post.public_id] || "").trim()
                              }
                              className="rounded-lg bg-inverse-surface px-4 py-2 text-sm font-medium text-white transition hover:bg-inverse-surface disabled:opacity-60 shadow-sm"
                            >
                              {t("org_detail_reply")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Sidebar / Events Column */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-content-primary px-1">
              {copy.events}
            </h2>

            {org.events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-strong bg-canvas px-6 py-8 text-center text-sm text-content-muted">
                {copy.noEvents}
              </div>
            ) : (
              <div className={isWhiteLabel ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-4"}>
                {org.events.map((event) => (
                  <Link
                    key={event.public_id}
                    href={`/events/${event.public_id}`}
                    className="group bg-raised rounded-xl shadow-sm border border-outline-subtle hover:border-outline-strong transition-all overflow-hidden"
                  >
                    {/* Banner Image */}
                    <div className="h-32 bg-sunken border-b border-outline-subtle overflow-hidden relative">
                      {event.event_banner_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.event_banner_url}
                          alt={event.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-canvas">
                          <Calendar className="h-8 w-8 text-content-muted" />
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-content-primary group-hover:text-status-info-content transition-colors line-clamp-2 mb-3">
                        {event.name}
                      </h3>
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-canvas px-2 py-1 text-xs font-medium text-content-secondary border border-outline-subtle">
                        <Users className="h-3 w-3" />
                        {t("org_detail_session_count", { count: event.session_count })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
