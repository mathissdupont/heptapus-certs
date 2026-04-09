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
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar with Fallback */}
        <div className="h-10 w-10 flex-shrink-0">
          {authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={authorAvatar}
              alt={authorName}
              className="h-full w-full rounded-full object-cover border border-gray-100 bg-gray-50"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full border border-gray-200 bg-slate-50 text-sm font-semibold text-slate-500">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">
            {authorName}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">
            {timestamp}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mb-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
        {body}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2">
        
        {/* Voting Pill Group */}
        <div className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200/60 p-0.5">
          <button
            onClick={onUpvote}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              userVote === 'upvote'
                ? 'bg-emerald-100/50 text-emerald-700'
                : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
            } disabled:opacity-50`}
            title="Upvote"
          >
            <ThumbsUp
              className={`h-4 w-4 ${
                userVote === 'upvote' ? 'fill-emerald-200 text-emerald-600' : ''
              }`}
            />
            <span>{upvoteCount}</span>
          </button>

          <div className="h-4 w-px bg-gray-300 mx-0.5" />

          <button
            onClick={onDownvote}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              userVote === 'downvote'
                ? 'bg-rose-100/50 text-rose-700'
                : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
            } disabled:opacity-50`}
            title="Downvote"
          >
            <ThumbsDown
              className={`h-4 w-4 ${
                userVote === 'downvote' ? 'fill-rose-200 text-rose-600' : ''
              }`}
            />
            <span>{downvoteCount}</span>
          </button>
        </div>

        {/* Comment Button */}
        <button
          onClick={onCommentClick}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <MessageSquare className="h-4 w-4" />
          <span>{commentCount}</span>
        </button>

        {/* Reply Action */}
        <button
          onClick={onReply}
          className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          Yanıtla
        </button>

        {/* Share/Extra Action (Optional but adds a premium feel) */}
        <button
          className="ml-auto flex items-center justify-center h-8 w-8 rounded-full text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
          title="Paylaş"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}