"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
} from "lucide-react";
import {
  listPublicFeed,
  getPublicMemberMe,
  getPublicMemberToken,
  likeCommunityPost,
  unlikeCommunityPost,
  listCommunityPostComments,
  createCommunityPostComment,
  type CommunityPost,
  type CommunityPostComment,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatTimeAgo(dateString: string, lang: "tr" | "en") {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return lang === "tr" ? "Az önce" : "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return lang === "tr" ? `${diffInMinutes}d` : `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return lang === "tr" ? `${diffInHours}s` : `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return lang === "tr" ? `${diffInDays}g` : `${diffInDays}d`;
}

export default function PostDetailPage() {
  const { lang } = useI18n();
  const params = useParams();
  const postId = params.postId as string;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityPostComment[]>([]);
  const [viewer, setViewer] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyLike, setBusyLike] = useState(false);

  const copy = {
    back: lang === "tr" ? "Geri" : "Back",
    loading: lang === "tr" ? "Yükleniyor..." : "Loading...",
    error: lang === "tr" ? "Gönderi yüklenemedi" : "Failed to load post",
    noComments: lang === "tr" ? "Henüz yorum yok. İlk yorum yapan ol!" : "No comments yet. Be the first to comment!",
    commentPlaceholder: lang === "tr" ? "Yorumunu yaz..." : "Write a comment...",
    send: lang === "tr" ? "Gönder" : "Send",
    loginRequired: lang === "tr" ? "Yorum yapmak için giriş yapın" : "Sign in to comment",
  };

  // Load post and comments
  useEffect(() => {
    if (!postId) return;

    setLoading(true);
    setError(null);

    Promise.all([
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([viewerData]) => {
        setViewer(viewerData);
        // Fetch all posts to find this one
        return listPublicFeed({ limit: 100 }).then((items) => {
          const found = items.find((p: CommunityPost) => p.public_id === postId);
          if (!found) {
            throw new Error(copy.error);
          }
          setPost(found);
          return found;
        });
      })
      .then(() => {
        // Load comments
        setLoadingComments(true);
        return listCommunityPostComments(postId);
      })
      .then((commentList) => {
        setComments(commentList);
      })
      .catch((err: any) => {
        console.error("Error loading post:", err);
        let msg = copy.error;
        if (typeof err === 'string') {
          msg = err;
        } else if (err?.message && typeof err.message === 'string') {
          msg = err.message;
        } else if (err?.status === 404) {
          msg = lang === "tr" ? "Gönderi bulunamadı" : "Post not found";
        }
        setError(msg);
        setPost(null);
      })
      .finally(() => {
        setLoading(false);
        setLoadingComments(false);
      });
  }, [postId, lang, copy.error]);

  const handleToggleLike = async () => {
    if (!post || !viewer) {
      window.location.href = "/login?mode=member";
      return;
    }

    setBusyLike(true);
    try {
      if (post.liked_by_me) {
        await unlikeCommunityPost(post.public_id);
        setPost({
          ...post,
          liked_by_me: false,
          like_count: Math.max(0, post.like_count - 1),
        });
      } else {
        await likeCommunityPost(post.public_id);
        setPost({
          ...post,
          liked_by_me: true,
          like_count: post.like_count + 1,
        });
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    } finally {
      setBusyLike(false);
    }
  };

  const handleAddComment = async () => {
    if (!viewer) {
      window.location.href = "/login?mode=member";
      return;
    }

    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const newComment = await createCommunityPostComment(postId, commentText.trim());
      setComments([...comments, newComment]);
      setCommentText("");
      
      // Update comment count on post
      if (post) {
        setPost({
          ...post,
          comment_count: post.comment_count + 1,
        });
      }
    } catch (err: any) {
      console.error("Error adding comment:", err);
      alert(err?.message || "Yorum güncellenirken hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 sm:px-6 py-10">
        <Link href="/discover" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="mb-3 h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">{copy.loading}</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 sm:px-6 py-10">
        <Link href="/discover" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || copy.error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 sm:px-6 py-10">
      {/* Back Button */}
      <Link href="/discover" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </Link>

      {/* Post */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {post.author_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author_avatar_url}
                  alt={post.author_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-slate-500">
                  {post.author_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div>
                {post.author_public_id && post.author_type === "member" ? (
                  <Link
                    href={`/member/${post.author_public_id}`}
                    className="text-base font-semibold text-gray-900 hover:text-blue-600 transition"
                  >
                    {post.author_name}
                  </Link>
                ) : (
                  <p className="text-base font-semibold text-gray-900">
                    {post.author_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                <span>{post.organization_name || "Üye"}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.created_at, lang)}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <p className="text-base text-gray-800 leading-relaxed mb-6 whitespace-pre-wrap">
            {post.body}
          </p>

          {/* Engagement */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleToggleLike}
              disabled={busyLike}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                post.liked_by_me
                  ? "text-rose-600"
                  : "text-gray-500 hover:text-gray-900"
              } disabled:opacity-50`}
            >
              <Heart className={`h-5 w-5 ${post.liked_by_me ? "fill-current" : ""}`} />
              <span>{formatNumber(post.like_count)}</span>
            </button>

            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <MessageCircle className="h-5 w-5" />
              <span>{formatNumber(post.comment_count)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {lang === "tr" ? "Yorumlar" : "Comments"}
          </h2>

          {/* Comment Form */}
          {viewer ? (
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {viewer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewer.avatar_url}
                    alt={viewer.display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-500">
                    {viewer.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={copy.commentPlaceholder}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setCommentText("")}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                  >
                    {lang === "tr" ? "İptal" : "Cancel"}
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || submitting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    {copy.send}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-center">
              <button
                onClick={() => (window.location.href = "/login?mode=member")}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {copy.loginRequired}
              </button>
            </div>
          )}
        </div>

        {/* Comments List */}
        <div className="divide-y divide-gray-100">
          {loadingComments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              {copy.noComments}
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {comment.member_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.member_avatar_url}
                        alt={comment.member_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        {comment.member_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {comment.member_name}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(comment.created_at, lang)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
