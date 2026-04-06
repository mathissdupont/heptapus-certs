"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Heart, Loader2, MessageCircle, Send } from "lucide-react";
import {
  createPublicFeedPost,
  createCommunityPostComment,
  getPublicMemberMe,
  getPublicMemberToken,
  likeCommunityPost,
  listCommunityPostComments,
  listPublicFeed,
  unlikeCommunityPost,
  type CommunityPost,
  type CommunityPostComment,
  type PublicMemberMe,
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

export default function PublicFeedPage() {
  const { lang } = useI18n();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [viewer, setViewer] = useState<PublicMemberMe | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityPostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postBody, setPostBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    eyebrow: "Topluluk",
    title: "Community Feed",
    subtitle: "Premium toplulukların en yeni paylaşımlarını tek akışta keşfedin.",
    empty: "Henüz yayında bir topluluk gönderisi yok.",
    error: "Topluluk akışı yüklenemedi.",
    login: "Yorum ve beğeni için giriş yap",
    comments: "Yorumları Gör",
    publish: "Gönder",
    composerPlaceholder: "Topluluğa bir şey yaz...",
    globalPost: "Üye Gönderisi",
  } : {
    eyebrow: "Community",
    title: "Community Feed",
    subtitle: "Explore the latest posts from premium communities in one place.",
    empty: "No community posts are live yet.",
    error: "Failed to load community feed.",
    login: "Sign in to like and comment",
    comments: "View Comments",
    publish: "Post",
    composerPlaceholder: "Share something with the community...",
    globalPost: "Member Post",
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listPublicFeed({ limit: 30 }),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([items, viewerData]) => {
        setPosts(items);
        setViewer(viewerData);
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => setLoading(false));
  }, [copy.error]);

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

  async function handleCreatePost() {
    const body = postBody.trim();
    if (!body) return;
    if (!viewer) {
      window.location.href = "/login?mode=member";
      return;
    }
    setPublishing(true);
    try {
      const created = await createPublicFeedPost(body);
      setPosts((current) => [created, ...current]);
      setPostBody("");
    } catch (err: any) {
      setError(err?.message || copy.error);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-12 lg:px-8">
      <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 inline-flex items-center gap-2">
        <Building2 className="h-3.5 w-3.5" />
        {copy.eyebrow}
      </div>
      <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">{copy.title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{copy.subtitle}</p>

      {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        {viewer ? (
          <div className="space-y-4">
            <textarea
              value={postBody}
              onChange={(event) => setPostBody(event.target.value)}
              placeholder={copy.composerPlaceholder}
              maxLength={1500}
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleCreatePost()}
                disabled={publishing || !postBody.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {copy.publish}
              </button>
            </div>
          </div>
        ) : (
          <Link href="/login?mode=member" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            {copy.login}
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{copy.title}</div>
      ) : posts.length === 0 ? (
        <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">{copy.empty}</div>
      ) : (
        <div className="mt-10 space-y-5">
          {posts.map((post) => (
            <article key={post.public_id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {post.organization_public_id && post.organization_name ? (
                    <Link href={`/organizations/${post.organization_public_id}`} className="text-sm font-bold text-slate-900 hover:text-slate-600">
                      {post.organization_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-slate-900">{copy.globalPost}</span>
                  )}
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{post.author_name}</p>
                </div>
                <span className="text-xs text-slate-400">{formatTimestamp(post.created_at, lang)}</span>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.body}</p>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => void handleToggleLike(post)}
                  disabled={busyPostId === post.public_id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${post.liked_by_me ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-600 hover:text-slate-900"}`}
                >
                  <Heart className="h-4 w-4" />
                  {post.like_count}
                </button>
                <button
                  type="button"
                  onClick={() => void loadComments(post.public_id)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comment_count} {copy.comments}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {(commentsByPost[post.public_id] || []).map((comment) => (
                  <div key={comment.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">{comment.member_name}</span>
                      <span className="text-xs text-slate-400">{formatTimestamp(comment.created_at, lang)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{comment.body}</p>
                  </div>
                ))}

                <div className="rounded-2xl border border-slate-200 p-3">
                  {viewer ? (
                    <div className="flex items-center gap-3">
                      <input
                        value={commentInputs[post.public_id] || ""}
                        onChange={(event) => setCommentInputs((current) => ({ ...current, [post.public_id]: event.target.value }))}
                        placeholder={copy.login}
                        className="flex-1 border-none bg-transparent text-sm text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleComment(post.public_id)}
                        disabled={busyPostId === post.public_id}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Link href="/login?mode=member" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                      {copy.login}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
