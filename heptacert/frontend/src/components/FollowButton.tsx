"use client";

import { useCallback, useState } from "react";
import { Heart, UserMinus, UserPlus } from "lucide-react";
import { followMember, unfollowMember } from "@/lib/api";

interface FollowButtonProps {
  memberId: string;
  isFollowing: boolean;
  onFollowChange?: (newState: boolean) => void;
  variant?: "compact" | "full";
}

export function FollowButton({
  memberId,
  isFollowing: initialFollowing,
  onFollowChange,
  variant = "full",
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleFollow = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowMember(memberId);
      } else {
        await followMember(memberId);
      }
      
      const newState = !isFollowing;
      setIsFollowing(newState);
      onFollowChange?.(newState);
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, isLoading, memberId, onFollowChange]);

  if (variant === "compact") {
    return (
      <button
        onClick={handleToggleFollow}
        disabled={isLoading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          isFollowing
            ? "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600"
            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isFollowing ? (
          <>
            <Heart className="h-4 w-4 fill-current" />
            <span>Following</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span>Follow</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
        isFollowing
          ? "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200"
          : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isFollowing ? (
        <>
          <Heart className="h-5 w-5 fill-current" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="h-5 w-5" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}
