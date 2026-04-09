"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Github, Globe, Heart, Instagram, Loader2, MessageCircle, Send, Users } from "lucide-react";
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
import { useI18n } from "@/lib/i18n";

function formatTimestamp(value: string, lang: "tr" | "en") {
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PublicOrganizationDetailPage() {
  const params = useParams();
  const orgPublicId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { lang } = useI18n();
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

  const copy = useMemo(() => lang === "tr" ? {
    back: "Topluluklara Dön",
    loading: "Topluluk yükleniyor...",
    error: "Topluluk yüklenemedi.",
    followers: "Takipçi",
    events: "Etkinlik",
    follow: "Takip Et",
    unfollow: "Takibi Bırak",
    loginToFollow: "Takip için giriş yap",
    feed: "Topluluk Akışı",
    noEvents: "Bu topluluk henüz etkinlik yayınlamadı.",
    social: "İletişim Kanalları",
  } : {
    back: "Back to Communities",
    loading: "Loading community...",
    error: "Failed to load community.",
    followers: "Followers",
    events: "Events",
    follow: "Follow",
    unfollow: "Unfollow",
    loginToFollow: "Sign in to follow",
    feed: "Community Feed",
    noEvents: "This organization has not published any events yet.",
    social: "Social Links",
  }, [lang]);

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
      listOrganizationFeed(orgPublicId, { limit: 20 }),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([orgData, feedData, viewerData]) => {
        setOrg(orgData);
        setPosts(feedData);
        setViewer(viewerData);
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => {
        setLoading(false);
        setLoadingFeed(false);
      });
  }, [copy.error, orgPublicId]);

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
    { href: org.website_url, label: "Website", icon: Globe },
    { href: org.linkedin_url, label: "LinkedIn", icon: ExternalLink },
    { href: org.github_url, label: "GitHub", icon: Github },
    { href: org.x_url, label: "X", icon: ExternalLink },
    { href: org.instagram_url, label: "Instagram", icon: Instagram },
  ].filter((item) => !!item.href) : [];

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{copy.loading}</div>;
  }

  if (error && !org) {
    return <div className="mx-auto max-w-4xl px-6 py-14"><div className="error-banner">{error}</div></div>;
  }

  if (!org) {
    return <div className="mx-auto max-w-4xl px-6 py-14"><div className="error-banner">{copy.error}</div></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <Link href="/organizations" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </Link>

      <section
        className="mt-6 overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)]"
      >
        {/* Header Background */}
        <div
          className="relative px-6 py-12 sm:px-8"
          style={{
            background: `linear-gradient(135deg, ${org.brand_color}40 0%, ${org.brand_color}20 50%, rgba(255,255,255,0.98) 100%)`,
            borderBottom: `2px solid ${org.brand_color}20`,
          }}
        >
          {/* Decorative elements */}
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ background: org.brand_color }}
          />
          <div
            className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-10 blur-3xl"
            style={{ background: org.brand_color }}
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            {/* Organization Info */}
            <div className="flex items-start gap-6 flex-1">
              {/* Logo */}
              <div
                className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/70 bg-white shadow-xl hover:shadow-2xl transition duration-300 flex-shrink-0"
                style={{ borderColor: org.brand_color }}
              >
                {org.brand_logo ? (
                  <img src={org.brand_logo} alt={org.org_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-slate-700">{org.org_name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 mb-2">
                  {org.org_name}
                </h1>
                <p className="mt-2 max-w-2xl text-base leading-8 text-slate-700 mb-6">
                  {org.bio || org.org_name}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div
                    className="rounded-full border-2 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-md hover:shadow-lg transition duration-300"
                    style={{ borderColor: org.brand_color, color: org.brand_color }}
                  >
                    👥 {org.follower_count.toLocaleString()} {copy.followers}
                  </div>
                  <div
                    className="rounded-full border-2 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-md hover:shadow-lg transition duration-300"
                    style={{ borderColor: org.brand_color, color: org.brand_color }}
                  >
                    📅 {org.event_count.toLocaleString()} {copy.events}
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
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-md"
                          style={{
                            borderColor: org.brand_color,
                            color: org.brand_color,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Follow Button */}
            <button
              type="button"
              onClick={() => void handleFollowToggle()}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-base font-bold transition disabled:opacity-60 shrink-0 whitespace-nowrap shadow-lg hover:shadow-xl transform hover:scale-105 duration-300"
              style={{
                backgroundColor: getPublicMemberToken()
                  ? org.is_following
                    ? "#f0f0f0"
                    : org.brand_color
                  : org.brand_color,
                color: getPublicMemberToken()
                  ? org.is_following
                    ? "#374151"
                    : "#ffffff"
                  : "#ffffff",
                borderWidth: getPublicMemberToken() && org.is_following ? "2px" : "0",
                borderColor: getPublicMemberToken() && org.is_following ? "#d1d5db" : "transparent",
              }}
            >
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {getPublicMemberToken()
                ? org.is_following
                  ? copy.unfollow
                  : copy.follow
                : copy.loginToFollow}
            </button>
          </div>
        </div>

        {/* Events Section */}
        <div className="border-t border-slate-100 px-6 py-10 sm:px-8 bg-gradient-to-b from-slate-50/50 to-white">
          <h2 className="text-3xl font-black text-slate-950 mb-8 flex items-center gap-2">
            📅 {copy.feed}
          </h2>
          {org.events.length === 0 ? (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              <p className="text-base">{copy.noEvents}</p>
            </div>
          ) : (
            <div className="
            mt-5 grid gap-6 md:grid-cols-2">
              {org.events.map((event) => (
                <Link
                  key={event.public_id}
                  href={`/events/${event.public_id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-1"
                >
                  <div className="relative h-48 bg-gradient-to-br from-slate-300 to-slate-400 overflow-hidden">
                    {event.event_banner_url ? (
                      <img
                        src={event.event_banner_url}
                        alt={event.name}
                        className="h-full w-full object-cover group-hover:scale-110 transition duration-300"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-5xl font-black text-white/30">📅</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                      {event.name}
                    </h3>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200">
                      <Users className="h-4 w-4" />
                      {event.session_count} {copy.events}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Community Feed Section */}
        <div className="border-t border-slate-100 px-6 py-10 sm:px-8">
          <h2 className="text-3xl font-black text-slate-950 mb-8 flex items-center gap-2">
            💬 {lang === "tr" ? "Topluluk Akışı" : "Community Feed"}
          </h2>

          {/* Post Input */}
          <div className="mb-8 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-md hover:shadow-lg transition duration-300">
            {viewer ? (
              <div className="space-y-4">
                <textarea
                  className="min-h-[140px] w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder-slate-400 resize-none"
                  value={postBody}
                  onChange={(event) => setPostBody(event.target.value)}
                  maxLength={1500}
                  placeholder={lang === "tr"
                    ? "Bu topluluğa bir güncelleme, soru veya duyuru bırak... 💡"
                    : "Share an update, question, or note with this community... 💡"}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    {postBody.length}/1500
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCreatePost()}
                    disabled={posting || !postBody.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white transition hover:shadow-lg disabled:opacity-60 hover:shadow-xl transform hover:scale-105 duration-300"
                  >
                    {posting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {lang === "tr" ? "Paylaşılıyor..." : "Posting..."}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {lang === "tr" ? "Paylaş" : "Post"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                <p className="mb-3">
                  {lang === "tr"
                    ? "Paylaşım yapmak için üye girişi yap"
                    : "Sign in with a member account to post"}
                </p>
                <button
                  onClick={() => (window.location.href = "/login?mode=member")}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  {lang === "tr" ? "Üye Girişi" : "Sign In"}
                </button>
              </div>
            )}
          </div>

          {/* Posts Feed */}
          {loadingFeed ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              {copy.loading}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              <p className="text-base">
                {lang === "tr"
                  ? "Henüz paylaşım yok. İlk gönderiyi bu toplulukta sen başlat! 🚀"
                  : "No posts yet. Be the first one to start the conversation! 🚀"}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {posts.map((post) => (
                <article
                  key={post.public_id}
                  className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-lg hover:shadow-xl transition duration-300 hover:border-slate-300"
                >
                  {/* Gradient Accent */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 group-hover:w-2 transition-all duration-300" />

                  <div className="px-6 py-5">
                    {/* Header with Avatar */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 ring-2 ring-slate-100 shadow-md">
                        {post.author_avatar_url ? (
                          <img
                            src={post.author_avatar_url}
                            alt={post.author_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-black text-white">
                            {post.author_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          {post.author_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatTimestamp(post.created_at, lang)}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-7 text-slate-700 mb-4 whitespace-pre-wrap group-hover:text-slate-900 transition">
                      {post.body}
                    </p>

                    {/* Engagement Bar */}
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => void handleToggleLike(post)}
                          disabled={busyPostId === post.public_id}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                            post.liked_by_me
                              ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          } disabled:opacity-60`}
                        >
                          {busyPostId === post.public_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Heart
                              className={`h-4 w-4 ${
                                post.liked_by_me ? "fill-current" : ""
                              }`}
                            />
                          )}
                          <span>{post.like_count}</span>
                          <span className="text-[12px]">
                            {post.liked_by_me
                              ? lang === "tr"
                                ? "Beğendin"
                                : "Liked"
                              : lang === "tr"
                              ? "Beğen"
                              : "Like"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void loadComments(post.public_id)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>{post.comment_count}</span>
                          <span className="text-[12px]">
                            {lang === "tr" ? "Yorum" : "Comments"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {commentsByPost[post.public_id] ? (
                      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          💬 {lang === "tr" ? "Yorumlar" : "Comments"}
                        </p>
                        {(commentsByPost[post.public_id] || []).map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 hover:bg-slate-100/50 transition"
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <p className="text-sm font-semibold text-slate-700">
                                {comment.member_name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {formatTimestamp(comment.created_at, lang)}
                              </p>
                            </div>
                            <p className="text-sm leading-5 text-slate-600">
                              {comment.body}
                            </p>
                          </div>
                        ))}

                        {/* Comment Input */}
                        {viewer && (
                          <div className="mt-3 flex gap-2">
                            <input
                              value={commentInputs[post.public_id] || ""}
                              onChange={(event) =>
                                setCommentInputs((current) => ({
                                  ...current,
                                  [post.public_id]: event.target.value,
                                }))
                              }
                              placeholder={
                                lang === "tr"
                                  ? "Yorum yaz..."
                                  : "Write a comment..."
                              }
                              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                            <button
                              type="button"
                              onClick={() => void handleComment(post.public_id)}
                              disabled={
                                busyPostId === post.public_id ||
                                !(commentInputs[post.public_id] || "").trim()
                              }
                              className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:opacity-60 hover:shadow-md"
                            >
                              {lang === "tr" ? "Yorum Yap" : "Reply"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
