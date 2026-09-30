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
  Pencil,
  Trash2,
  History,
  X,
} from "lucide-react";
import {
  listPublicFeed,
  getPublicMemberMe,
  getPublicMemberToken,
  likeCommunityPost,
  unlikeCommunityPost,
  listCommunityPostComments,
  createCommunityPostComment,
  updateCommunityPost,
  deleteCommunityPost,
  listCommunityPostEditHistory,
  type CommunityPost,
  type CommunityPostComment,
  type CommunityPostEditHistoryItem,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export default function PostDetailPage() {
  const { t } = useI18n();
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
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editHistory, setEditHistory] = useState<CommunityPostEditHistoryItem[]>([]);

  const formatTimeAgo = (dateString: string) => {
    const diffInSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diffInSeconds < 60) return t("public_hub_just_now");
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return t("public_hub_minutes_ago", { count: diffInMinutes });
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t("public_hub_hours_ago", { count: diffInHours });
    return t("public_hub_days_ago", { count: Math.floor(diffInHours / 24) });
  };

  const copy = {
    back: t("onboarding_back"),
    loading: t("migrated_components_admin_adminstate_loading_1cc7f473"),
    error: t("public_hub_error"),
    noComments: t("event_detail_no_comments"),
    commentPlaceholder: t("feed_comment_placeholder"),
    send: t("feed_comment_submit"),
    loginRequired: t("feed_login_prompt"),
    edit: t("cfp_edit"),
    delete: t("events_delete"),
    save: t("cfp_save"),
    cancel: t("cfp_cancel"),
    editHistory: t("post_detail_edit_history"),
    deleting: t("post_detail_deleting"),
    confirmDelete: t("post_detail_confirm_delete"),
  };

  const isOwner = !!(viewer && post && post.author_type === "member" && post.author_public_id === viewer.public_id);

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
        return listPublicFeed({ limit: 50 }).then((items) => {
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
          msg = t("post_detail_not_found");
        }
        setError(msg);
        setPost(null);
      })
      .finally(() => {
        setLoading(false);
        setLoadingComments(false);
      });
  }, [postId, copy.error, t]);

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
      alert(err?.message || t("post_detail_comment_error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = () => {
    if (!post) return;
    setEditText(post.body);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!post || !editText.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await updateCommunityPost(post.public_id, editText.trim());
      setPost(updated);
      setEditing(false);
    } catch (err: any) {
      alert(err?.message || t("post_detail_update_error"));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!window.confirm(copy.confirmDelete)) return;
    setDeletingPost(true);
    try {
      await deleteCommunityPost(post.public_id);
      window.location.href = "/discover";
    } catch (err: any) {
      alert(err?.message || t("post_detail_delete_error"));
      setDeletingPost(false);
    }
  };

  const handleToggleHistory = async () => {
    if (!post) return;
    const next = !showHistory;
    setShowHistory(next);
    if (!next || editHistory.length > 0) return;
    setHistoryLoading(true);
    try {
      const items = await listCommunityPostEditHistory(post.public_id);
      setEditHistory(items);
    } catch {
      setEditHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 sm:px-6 py-10">
        <Link href="/discover" className="inline-flex items-center gap-2 text-status-info-content hover:text-status-info-content mb-6">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-content-muted">
          <Loader2 className="mb-3 h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">{copy.loading}</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 sm:px-6 py-10">
        <Link href="/discover" className="inline-flex items-center gap-2 text-status-info-content hover:text-status-info-content mb-6">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
        <div className="rounded-lg border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-content">
          {error || copy.error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 sm:px-6 py-10">
      {/* Back Button */}
      <Link href="/discover" className="inline-flex items-center gap-2 text-status-info-content hover:text-status-info-content mb-6">
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </Link>

      {/* Post */}
      <div className="bg-raised rounded-xl shadow-sm border border-outline-subtle overflow-hidden mb-8">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-sunken border border-outline-subtle flex items-center justify-center overflow-hidden flex-shrink-0">
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
            <div className="flex-1 min-w-0">
              <div>
                {post.author_public_id && post.author_type === "member" ? (
                  <Link
                    href={`/member/${post.author_public_id}`}
                    className="text-base font-semibold text-content-primary hover:text-status-info-content transition"
                  >
                    {post.author_name}
                  </Link>
                ) : (
                  <p className="text-base font-semibold text-content-primary">
                    {post.author_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-content-muted mt-0.5">
                <span>{post.organization_name || "Üye"}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.created_at)}</span>
              </div>
            </div>
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleHistory}
                  className="inline-flex items-center gap-1 rounded-md border border-outline-subtle px-2.5 py-1.5 text-xs font-medium text-content-secondary hover:bg-canvas"
                >
                  <History className="h-3.5 w-3.5" />
                  {copy.editHistory}
                </button>
                {!editing ? (
                  <button
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1 rounded-md border border-outline-subtle px-2.5 py-1.5 text-xs font-medium text-content-secondary hover:bg-canvas"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {copy.edit}
                  </button>
                ) : (
                  <button
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1 rounded-md border border-outline-subtle px-2.5 py-1.5 text-xs font-medium text-content-secondary hover:bg-canvas"
                  >
                    <X className="h-3.5 w-3.5" />
                    {copy.cancel}
                  </button>
                )}
                <button
                  onClick={handleDeletePost}
                  disabled={deletingPost}
                  className="inline-flex items-center gap-1 rounded-md border border-status-danger-border px-2.5 py-1.5 text-xs font-medium text-status-danger-content hover:bg-status-danger-bg disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingPost ? copy.deleting : copy.delete}
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {editing ? (
            <div className="mb-6">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-2 text-sm text-content-primary placeholder-content-faint focus:border-status-info-border focus:outline-none focus:ring-1 focus:ring-status-info-border resize-y"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-canvas rounded-lg border border-outline-subtle transition"
                >
                  {copy.cancel}
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() || savingEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                >
                  {savingEdit ? copy.loading : copy.save}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-base text-content-primary leading-relaxed mb-6 whitespace-pre-wrap">
              {post.body}
            </p>
          )}

          {showHistory && (
            <div className="mb-6 rounded-lg border border-outline-subtle bg-canvas p-4">
              <h3 className="mb-3 text-sm font-semibold text-content-primary">{copy.editHistory}</h3>
              {historyLoading ? (
                <div className="text-sm text-content-muted">{copy.loading}</div>
              ) : editHistory.length === 0 ? (
                <div className="text-sm text-content-muted">{t("post_detail_no_edits")}</div>
              ) : (
                <div className="space-y-3">
                  {editHistory.map((item, idx) => (
                    <div key={`${item.edited_at}-${idx}`} className="rounded-md border border-outline-subtle bg-raised p-3">
                      <div className="mb-2 text-xs text-content-muted">{formatTimeAgo(item.edited_at)}</div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-semibold text-content-secondary">{t("post_detail_old")}</div>
                          <p className="text-sm text-content-secondary whitespace-pre-wrap">{item.old_body}</p>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-semibold text-content-secondary">{t("post_detail_new")}</div>
                          <p className="text-sm text-content-primary whitespace-pre-wrap">{item.new_body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Engagement */}
          <div className="flex items-center gap-6 pt-4 border-t border-outline-subtle">
            <button
              onClick={handleToggleLike}
              disabled={busyLike}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                post.liked_by_me
                  ? "text-status-danger-content"
                  : "text-content-muted hover:text-content-primary"
              } disabled:opacity-50`}
            >
              <Heart className={`h-5 w-5 ${post.liked_by_me ? "fill-current" : ""}`} />
              <span>{formatNumber(post.like_count)}</span>
            </button>

            <div className="flex items-center gap-2 text-sm font-medium text-content-muted">
              <MessageCircle className="h-5 w-5" />
              <span>{formatNumber(post.comment_count)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-raised rounded-xl shadow-sm border border-outline-subtle overflow-hidden">
        <div className="border-b border-outline-subtle p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">
            {t("event_detail_comments_title")}
          </h2>

          {/* Comment Form */}
          {viewer ? (
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-sunken border border-outline-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
                {viewer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewer.avatar_url}
                    alt={viewer.display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-content-muted">
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
                  className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-2 text-sm text-content-primary placeholder-content-faint focus:border-status-info-border focus:outline-none focus:ring-1 focus:ring-status-info-border resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setCommentText("")}
                    className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-canvas rounded-lg border border-outline-subtle transition"
                  >
                    {copy.cancel}
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
            <div className="rounded-lg bg-status-info-bg border border-status-info-border px-4 py-3 text-center">
              <button
                onClick={() => (window.location.href = "/login?mode=member")}
                className="text-sm font-medium text-status-info-content hover:text-status-info-content"
              >
                {copy.loginRequired}
              </button>
            </div>
          )}
        </div>

        {/* Comments List */}
        <div className="divide-y divide-outline-subtle">
          {loadingComments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
            </div>
          ) : comments.length === 0 ? (
            <div className="p-6 text-center text-content-muted text-sm">
              {copy.noComments}
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-sunken border border-outline-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {comment.member_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.member_avatar_url}
                        alt={comment.member_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-content-muted">
                        {comment.member_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-content-primary">
                        {comment.member_name}
                      </p>
                      <span className="text-xs text-content-muted">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-content-secondary leading-relaxed whitespace-pre-wrap">
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
