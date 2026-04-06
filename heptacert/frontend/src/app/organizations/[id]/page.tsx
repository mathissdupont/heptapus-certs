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
    back: "Topluluklara dön",
    loading: "Topluluk yükleniyor...",
    error: "Topluluk yüklenemedi.",
    followers: "takipçi",
    events: "public etkinlik",
    follow: "Takip Et",
    unfollow: "Takibi Bırak",
    loginToFollow: "Takip için giriş yap",
    upcoming: "Topluluk Etkinlikleri",
    noEvents: "Bu topluluk henüz public etkinlik yayınlamadı.",
  } : {
    back: "Back to communities",
    loading: "Loading community...",
    error: "Failed to load community.",
    followers: "followers",
    events: "public events",
    follow: "Follow",
    unfollow: "Unfollow",
    loginToFollow: "Sign in to follow",
    upcoming: "Community Events",
    noEvents: "This organization has not published any public events yet.",
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
        <div
          className="px-6 py-8 sm:px-8"
          style={{ background: `linear-gradient(160deg, ${org.brand_color}22 0%, rgba(255,255,255,0.96) 62%)` }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-sm">
                {org.brand_logo ? (
                  <img src={org.brand_logo} alt={org.org_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-slate-700">{org.org_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-4xl font-black tracking-tight text-slate-950">{org.org_name}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{org.bio || org.org_name}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {org.follower_count} {copy.followers}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {org.event_count} {copy.events}
                  </span>
                </div>
                {socialLinks.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {socialLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.label}
                          href={item.href || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleFollowToggle()}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {getPublicMemberToken() ? (org.is_following ? copy.unfollow : copy.follow) : copy.loginToFollow}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-8 sm:px-8">
          <h2 className="text-2xl font-black text-slate-950">{copy.upcoming}</h2>
          {org.events.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              {copy.noEvents}
            </div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {org.events.map((event) => (
                <Link
                  key={event.public_id}
                  href={`/events/${event.public_id}`}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="h-40 bg-slate-100">
                    {event.event_banner_url ? (
                      <img src={event.event_banner_url} alt={event.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-slate-900">{event.name}</h3>
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <Users className="h-4 w-4" />
                      {event.session_count}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-8 sm:px-8">
          <h2 className="text-2xl font-black text-slate-950">{lang === "tr" ? "Topluluk Akisi" : "Community Feed"}</h2>

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            {viewer ? (
              <div className="space-y-3">
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  value={postBody}
                  onChange={(event) => setPostBody(event.target.value)}
                  maxLength={1500}
                  placeholder={lang === "tr" ? "Topluluga bir guncelleme, soru veya duyuru birak..." : "Share an update, question, or note with this community..."}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleCreatePost()}
                    disabled={posting || !postBody.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {posting ? (lang === "tr" ? "Paylasiliyor..." : "Posting...") : (lang === "tr" ? "Paylas" : "Post")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                {lang === "tr" ? "Paylasim yapmak icin uye girisi yap" : "Sign in with a member account to post"}
              </div>
            )}
          </div>

          {loadingFeed ? (
            <div className="mt-5 flex items-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{copy.loading}</div>
          ) : posts.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              {lang === "tr" ? "Henuz paylasim yok. Ilk gonderiyi bu toplulukta sen baslat." : "No posts yet. Be the first one to start the conversation."}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {posts.map((post) => (
                <article key={post.public_id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {post.author_avatar_url ? (
                        <img src={post.author_avatar_url} alt={post.author_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-slate-700">{post.author_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">{post.author_name}</p>
                      <p className="text-xs text-slate-500">{formatTimestamp(post.created_at, lang)}</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.body}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
                    <button
                      type="button"
                      onClick={() => void handleToggleLike(post)}
                      disabled={busyPostId === post.public_id}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition ${post.liked_by_me ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {busyPostId === post.public_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />}
                      {post.like_count} {post.liked_by_me ? (lang === "tr" ? "Begendin" : "Liked") : (lang === "tr" ? "Begen" : "Like")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadComments(post.public_id)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 transition hover:bg-slate-200"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.comment_count} {lang === "tr" ? "yorum" : "comments"}
                    </button>
                  </div>

                  {commentsByPost[post.public_id] ? (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      {(commentsByPost[post.public_id] || []).map((comment) => (
                        <div key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-700">{comment.member_name}</p>
                            <p className="text-[11px] text-slate-400">{formatTimestamp(comment.created_at, lang)}</p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{comment.body}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={commentInputs[post.public_id] || ""}
                          onChange={(event) => setCommentInputs((current) => ({ ...current, [post.public_id]: event.target.value }))}
                          placeholder={lang === "tr" ? "Yorum yaz..." : "Write a comment..."}
                          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => void handleComment(post.public_id)}
                          disabled={busyPostId === post.public_id || !(commentInputs[post.public_id] || "").trim()}
                          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {lang === "tr" ? "Yorum yap" : "Comment"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
