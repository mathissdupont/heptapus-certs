"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Heart, UserPlus, Loader2, AlertCircle } from "lucide-react";
import {
  getMemberFollowers,
  getMemberFollowing,
  getPublicMemberMe,
} from "@/lib/api";
import type { ConnectionMemberInfo, PublicMemberMe } from "@/lib/api";
import { FollowButton } from "@/components/FollowButton";

interface ConnectionTab {
  id: "followers" | "following" | "stats";
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export function ConnectionsClient() {
  const router = useRouter();
  const [member, setMember] = useState<PublicMemberMe | null>(null);
  const [activeTab, setActiveTab] = useState<"followers" | "following" | "stats">("followers");
  const [followers, setFollowers] = useState<ConnectionMemberInfo[]>([]);
  const [following, setFollowing] = useState<ConnectionMemberInfo[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current member info
        const memberData = await getPublicMemberMe();
        setMember(memberData);

        // Load followers
        const followersData = await getMemberFollowers(memberData.public_id, 50);
        setFollowers(followersData);
        setFollowerCount(followersData.length);

        // Load following
        const followingData = await getMemberFollowing(memberData.public_id, 50);
        setFollowing(followingData);
        setFollowingCount(followingData.length);
      } catch (err) {
        console.error("Failed to load connections:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load connections"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading connections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs: ConnectionTab[] = [
    { id: "followers", label: "Followers", icon: <Heart className="h-5 w-5" />, count: followerCount },
    { id: "following", label: "Following", icon: <UserPlus className="h-5 w-5" />, count: followingCount },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Connections</h1>
          </div>
          <p className="text-gray-600">Manage your network and discover new members</p>
        </div>

        {/* Connection Stats Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{followerCount}</div>
              <p className="text-gray-600 mt-1">Followers</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{followingCount}</div>
              <p className="text-gray-600 mt-1">Following</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow-md border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className="ml-1 text-sm bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-lg shadow-md">
          {activeTab === "followers" && (
            <div className="divide-y">
              {followers.length === 0 ? (
                <div className="p-12 text-center">
                  <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No followers yet</p>
                </div>
              ) : (
                followers.map((follower) => (
                  <div
                    key={follower.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        router.push(`/community/profile/${follower.public_id}`)
                      }
                    >
                      <div className="flex items-center gap-3">
                        {follower.avatar_url && (
                          <img
                            src={follower.avatar_url}
                            alt={follower.display_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {follower.display_name}
                          </p>
                          {follower.headline && (
                            <p className="text-sm text-gray-600">{follower.headline}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <FollowButton
                      memberId={follower.public_id}
                      isFollowing={false}
                      variant="compact"
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "following" && (
            <div className="divide-y">
              {following.length === 0 ? (
                <div className="p-12 text-center">
                  <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">You're not following anyone yet</p>
                </div>
              ) : (
                following.map((followedMember) => (
                  <div
                    key={followedMember.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/community/profile/${followedMember.public_id}`
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        {followedMember.avatar_url && (
                          <img
                            src={followedMember.avatar_url}
                            alt={followedMember.display_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {followedMember.display_name}
                          </p>
                          {followedMember.headline && (
                            <p className="text-sm text-gray-600">
                              {followedMember.headline}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <FollowButton
                      memberId={followedMember.public_id}
                      isFollowing={true}
                      variant="compact"
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
