import React from 'react';
import { MessageSquareOff, ChevronRight } from 'lucide-react';
import CommentCard from './CommentCard';

export interface CommentData {
  id: string;
  body: string;
  authorName: string;
  authorAvatar?: string;
  timestamp: string;
  upvoteCount: number;
  downvoteCount: number;
  userVote?: 'upvote' | 'downvote' | null;
  parentCommentId?: string | null;
  replies?: CommentData[];
  depth?: number;
}

interface CommentTreeProps {
  comments: CommentData[];
  maxDepth?: number;
  onUpvote: (commentId: string) => void;
  onDownvote: (commentId: string) => void;
  onReply: (commentId: string, parentCommentId?: string) => void;
  isLoading?: boolean;
}

export default function CommentTree({
  comments,
  maxDepth = 3,
  onUpvote,
  onDownvote,
  onReply,
  isLoading = false,
}: CommentTreeProps) {
  const renderComment = (comment: CommentData, depth: number = 0) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const canShowReplies = depth < maxDepth;

    return (
      <div key={comment.id} className="relative group/thread">
        <CommentCard
          commentId={comment.id}
          body={comment.body}
          authorName={comment.authorName}
          authorAvatar={comment.authorAvatar}
          timestamp={comment.timestamp}
          upvoteCount={comment.upvoteCount}
          downvoteCount={comment.downvoteCount}
          userVote={comment.userVote}
          depth={depth}
          onUpvote={() => onUpvote(comment.id)}
          onDownvote={() => onDownvote(comment.id)}
          onReply={() => onReply(comment.id, comment.id)}
          isLoading={isLoading}
        />

        {/* Nested Replies (İç İçe Yanıtlar) */}
        {hasReplies && canShowReplies && (
          <div className="relative mt-1">
            {/* CommentCard halihazırda depth > 0 ise ml-6 ve border uyguluyor.
              Burada container'a hafif bir margin vererek her alt kademenin
              matruşka gibi içeri kaymasını sağlıyoruz.
            */}
            <div className="ml-2 sm:ml-6 flex flex-col gap-1">
              {comment.replies!.map((reply) => renderComment(reply, depth + 1))}
            </div>
          </div>
        )}

        {/* Sınır aşıldığında gösterilecek "Daha fazla yanıt" butonu */}
        {hasReplies && !canShowReplies && (
          <div className="ml-8 sm:ml-14 mt-3 inline-flex items-center gap-1.5 rounded-full border border-outline-subtle bg-canvas px-3 py-1.5 text-xs font-medium text-content-muted transition-colors hover:bg-sunken hover:text-content-primary cursor-pointer shadow-sm">
            <ChevronRight className="h-3 w-3 text-content-muted" />
            {comment.replies!.length} {comment.replies!.length === 1 ? 'yanıt' : 'yanıt'} daha var...
          </div>
        )}
      </div>
    );
  };

  // Şık bir "Empty State" (Boş Durum) tasarımı
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-strong bg-canvas/50 py-12 px-6 text-center">
        <MessageSquareOff className="h-8 w-8 text-content-muted mb-3" />
        <p className="text-sm font-medium text-content-muted">
          Bu gönderiye henüz yorum yapılmamış.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {comments.map((comment) => renderComment(comment))}
    </div>
  );
}