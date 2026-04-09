import React from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';

interface CommentCardProps {
  commentId: string;
  body: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: string;
  upvoteCount: number;
  downvoteCount: number;
  userVote?: 'upvote' | 'downvote' | null;
  depth?: number;
  onUpvote: () => void;
  onDownvote: () => void;
  onReply: () => void;
  isLoading?: boolean;
}

export default function CommentCard({
  commentId,
  body,
  authorName,
  authorAvatar,
  timestamp,
  upvoteCount,
  downvoteCount,
  userVote,
  depth = 0,
  onUpvote,
  onDownvote,
  onReply,
  isLoading = false,
}: CommentCardProps) {
  // İç içe yorumlarda girinti (indentation) ve sol kenar çizgisi oluşturmak için
  const isReply = depth > 0;

  return (
    <div
      className={`relative flex gap-3 transition-colors ${
        isReply
          ? 'ml-6 mt-3 border-l-2 border-gray-200 pl-4'
          : 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm mt-4'
      }`}
    >
      {/* Avatar Column */}
      <div className="flex-shrink-0 pt-0.5">
        {authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-8 w-8 rounded-full object-cover border border-gray-100 bg-gray-50"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-slate-50 text-xs font-semibold text-slate-500">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content Column */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {authorName}
          </p>
          <span className="text-[10px] text-gray-400">•</span>
          <p className="text-xs text-gray-500 truncate">{timestamp}</p>
        </div>

        {/* Body */}
        <p className="mb-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
          {body}
        </p>

        {/* Actions Bar */}
        <div className="flex items-center gap-4">
          {/* Voting Pill Group */}
          <div className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200/60 p-0.5">
            <button
              onClick={onUpvote}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                userVote === 'upvote'
                  ? 'bg-emerald-100/50 text-emerald-700'
                  : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
              } disabled:opacity-50`}
              title="Upvote"
            >
              <ThumbsUp
                className={`h-3.5 w-3.5 ${
                  userVote === 'upvote' ? 'fill-emerald-200 text-emerald-600' : ''
                }`}
              />
              <span>{upvoteCount}</span>
            </button>

            <div className="h-3 w-px bg-gray-300 mx-0.5" />

            <button
              onClick={onDownvote}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                userVote === 'downvote'
                  ? 'bg-rose-100/50 text-rose-700'
                  : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
              } disabled:opacity-50`}
              title="Downvote"
            >
              <ThumbsDown
                className={`h-3.5 w-3.5 ${
                  userVote === 'downvote' ? 'fill-rose-200 text-rose-600' : ''
                }`}
              />
              <span>{downvoteCount}</span>
            </button>
          </div>

          {/* Reply Button */}
          {depth < 2 && (
            <button
              onClick={onReply}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Yanıtla
            </button>
          )}
        </div>
      </div>
    </div>
  );
}