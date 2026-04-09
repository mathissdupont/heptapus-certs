"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
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
import CreatePostForm from "@/components/CommunityFeed/CreatePostForm";
import PostCard from "@/components/CommunityFeed/PostCard";
import CommentTree from "@/components/CommunityFeed/CommentTree";
import ReplyForm from "@/components/CommunityFeed/ReplyForm";

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

  async function handleComment(postPublicId: string, body: string) {
    if (!body.trim()) return;
    if (!viewer) {
      window.location.href = "/login?mode=member";
      return;
    }
    setBusyPostId(postPublicId);
    try {
      const created = await createCommunityPostComment(postPublicId, body);
      setCommentsByPost((current) => ({ ...current, [postPublicId]: [...(current[postPublicId] || []), created] }));
      setPosts((current) => current.map((item) => item.public_id === postPublicId ? { ...item, comment_count: item.comment_count + 1 } : item));
    } catch (err: any) {
      setError(err?.message || copy.error);
    } finally {
      setBusyPostId(null);
    }
  }

  async function handleCreatePost(body: string) {
    if (!body.trim()) return;
    if (!viewer) {
      window.location.href = "/login?mode=member";
      return;
    }
    setPublishing(true);
    try {
      const created = await createPublicFeedPost(body);
      setPosts((current) => [created, ...current]);
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

      <div className="mt-8">
        {viewer ? (
          <CreatePostForm
            userAvatar={viewer.avatar_url}
            placeholder={copy.composerPlaceholder}
            isSubmitting={publishing}
            onSubmit={handleCreatePost}
            maxLength={1500}
          />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
            <Link href="/login?mode=member" className="text-sm font-semibold text-blue-600 hover:underline">
              {copy.login}
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{copy.title}</div>
      ) : posts.length === 0 ? (
        <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">{copy.empty}</div>
      ) : (
        <div className="mt-10 space-y-6">
          {posts.map((post) => (
            <div key={post.public_id} className="space-y-4">
              {/* Post Card */}
              <PostCard
                postId={post.public_id}
                authorName={post.author_name}
                timestamp={formatTimestamp(post.created_at, lang)}
                body={post.body}
                commentCount={post.comment_count}
                upvoteCount={post.like_count}
                downvoteCount={0}
                userVote={post.liked_by_me ? "up" : undefined}
                onUpvote={() => void handleToggleLike(post)}
                onDownvote={() => {}}
                onCommentClick={() => void loadComments(post.public_id)}
                onReply={() => void loadComments(post.public_id)}
              />

              {/* Organization badge if applicable */}
              {post.organization_public_id && post.organization_name && (
                <div className="ml-4 text-xs text-slate-500">
                  <Link href={`/organizations/${post.organization_public_id}`} className="font-semibold text-slate-900 hover:underline">
                    {post.organization_name}
                  </Link>
                </div>
              )}

              {/* Comments Section */}
              {commentsByPost[post.public_id]?.length > 0 && (
                <div className="ml-4 space-y-3">
                  <CommentTree
                    comments={commentsByPost[post.public_id] || []}
                    maxDepth={3}
                    onUpvote={() => {}}
                    onDownvote={() => {}}
                    onReply={() => void loadComments(post.public_id)}
                  />
                </div>
              )}

              {/* Reply Form */}
              {viewer && (
                <div className="ml-4">
                  <ReplyForm
                    onSubmit={(body) => handleComment(post.public_id, body)}
                    isSubmitting={busyPostId === post.public_id}
                    placeholder="Yanıt ekle..."
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
