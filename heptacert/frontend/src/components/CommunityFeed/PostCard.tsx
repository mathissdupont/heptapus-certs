import React from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';

interface PostCardProps {
  postId: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: string;
  body: string;
  commentCount: number;
  upvoteCount: number;
  downvoteCount: number;
  userVote?: 'upvote' | 'downvote' | null;
  onUpvote: () => void;
  onDownvote: () => void;
  onReply: () => void;
  onCommentClick: () => void;
  isLoading?: boolean;
}

export default function PostCard({
  postId,
  authorName,
  authorAvatar,
  timestamp,
  body,
  commentCount,
  upvoteCount,
  downvoteCount,
  userVote,
  onUpvote,
  onDownvote,
  onReply,
  onCommentClick,
  isLoading = false,
}: PostCardProps) {
  return (
    <article className="rounded-2xl border border-outline-subtle bg-raised p-5 shadow-sm transition-colors hover:border-outline-strong">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar with Fallback */}
        <div className="h-10 w-10 flex-shrink-0">
          {authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={authorAvatar}
              alt={authorName}
              className="h-full w-full rounded-full object-cover border border-outline-subtle bg-canvas"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full border border-outline-subtle bg-canvas text-sm font-semibold text-content-muted">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-content-primary truncate">
            {authorName}
          </p>
          <p className="text-xs font-medium text-content-muted mt-0.5 truncate">
            {timestamp}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mb-4 text-sm text-content-primary leading-relaxed whitespace-pre-wrap break-words">
        {body}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2">

        {/* Voting Pill Group */}
        <div className="inline-flex items-center rounded-full bg-canvas border border-outline-subtle/60 p-0.5">
          <button
            onClick={onUpvote}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              userVote === 'upvote'
                ? 'bg-status-success-bg/50 text-status-success-content'
                : 'text-content-muted hover:bg-sunken/50 hover:text-content-primary'
            } disabled:opacity-50`}
            title="Upvote"
          >
            <ThumbsUp
              className={`h-4 w-4 ${
                userVote === 'upvote' ? 'fill-status-success-content text-status-success-content' : ''
              }`}
            />
            <span>{upvoteCount}</span>
          </button>

          <div className="h-4 w-px bg-sunken mx-0.5" />

          <button
            onClick={onDownvote}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              userVote === 'downvote'
                ? 'bg-status-danger-bg/50 text-status-danger-content'
                : 'text-content-muted hover:bg-sunken/50 hover:text-content-primary'
            } disabled:opacity-50`}
            title="Downvote"
          >
            <ThumbsDown
              className={`h-4 w-4 ${
                userVote === 'downvote' ? 'fill-status-danger-content text-status-danger-content' : ''
              }`}
            />
            <span>{downvoteCount}</span>
          </button>
        </div>

        {/* Comment Button */}
        <button
          onClick={onCommentClick}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-content-muted transition-colors hover:bg-canvas hover:text-content-primary"
        >
          <MessageSquare className="h-4 w-4" />
          <span>{commentCount}</span>
        </button>

        {/* Reply Action */}
        <button
          onClick={onReply}
          className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-content-muted transition-colors hover:bg-canvas hover:text-content-primary"
        >
          Yanıtla
        </button>

        {/* Share/extra action */}
        <button
          className="ml-auto flex items-center justify-center h-8 w-8 rounded-full text-content-muted transition-colors hover:bg-canvas hover:text-content-primary"
          title="Paylaş"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
