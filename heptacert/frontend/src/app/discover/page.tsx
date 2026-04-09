"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  Loader2, 
  TrendingUp, 
  Search, 
  Heart, 
  MessageCircle, 
  Flame, 
  Sparkles, 
  Zap, 
  Clock 
} from "lucide-react";
import {
  listPublicFeed,
  getPublicMemberMe,
  getPublicMemberToken,
  likeCommunityPost,
  unlikeCommunityPost,
  type CommunityPost,
  type PublicMemberMe,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface ScoredPost extends CommunityPost {
  score: number;
  engagement: number;
  viralityScore: number;
  velocityScore: number;
  qualityScore: number;
  freshnessScore: number;
  finalScore: number;
}

// Advanced Viral Score Algorithm (like Instagram/Reddit)
function calculateViralityScore(post: CommunityPost): number {
  const totalEngagement = post.like_count + (post.comment_count * 2);
  const ageInHours = (new Date().getTime() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  const ageInDays = Math.max(0.1, ageInHours / 24); 
  const engagementPerDay = totalEngagement / ageInDays;
  const viralScore = (Math.tanh(engagementPerDay / 10) + 1) * 50;
  return Math.min(100, viralScore);
}

// Engagement Velocity Score (how fast engagement is growing)
function calculateVelocityScore(post: CommunityPost): number {
  const now = new Date();
  const postDate = new Date(post.created_at);
  const ageMs = now.getTime() - postDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  if (ageHours < 1) return 30;
  if (ageHours < 6) return 20;
  if (ageHours < 24) return (post.like_count + post.comment_count > 5) ? 10 : 0;
  return 0;
}

// Quality Score based on comment depth and discussion
function calculateQualityScore(post: CommunityPost): number {
  const commentBonus = Math.min(50, post.comment_count * 2);
  const likeCommentRatio = post.comment_count > 0
    ? post.like_count / post.comment_count
    : post.like_count; 
  const ratioPenaline = Math.abs(likeCommentRatio - 2) > 5 ? -10 : 0;
  return Math.max(0, commentBonus + ratioPenaline);
}

// Freshness Score: newer = better
function calculateFreshnessScore(post: CommunityPost): number {
  const now = new Date();
  const postDate = new Date(post.created_at);
  const ageMs = now.getTime() - postDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  if (ageHours < 2) return 40; 
  if (ageHours < 6) return 35;
  if (ageHours < 24) return 25;
  if (ageHours < 72) return 15;
  return 5; 
}

// Main Algorithm: Combines all signals into one score
function calculateFinalScore(post: CommunityPost): number {
  const virality = calculateViralityScore(post);
  const velocity = calculateVelocityScore(post);
  const quality = calculateQualityScore(post);
  const freshness = calculateFreshnessScore(post);
  
  const finalScore = (
    (virality * 0.40) +
    (quality * 0.30) +
    (velocity * 0.20) +
    (freshness * 0.10)
  );
  
  return Math.min(100, Math.max(0, finalScore));
}

function calculateEngagementScore(post: CommunityPost): number {
  return post.like_count + (post.comment_count * 1.5);
}

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

export default function DiscoveryPage() {
  const { lang } = useI18n();
  const [posts, setPosts] = useState<ScoredPost[]>([]);
  const [viewer, setViewer] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"trending" | "recent" | "popular">("trending");

  const copy = useMemo(() => lang === "tr" ? {
    title: "Keşfet",
    subtitle: "Topluluktaki en ilginç gönderileri ve aktif üyeleri bulun",
    loading: "Gönderiler yükleniyor...",
    error: "Gönderiler yüklenemedi",
    empty: "Henüz gönderi yok",
    searchPlaceholder: "Gönderi, üye veya topluluk ara...",
    trending: "Trend",
    recent: "Yeni",
    popular: "Popüler",
    noResults: "Aramanızla eşleşen gönderi bulunamadı",
  } : {
    title: "Discover",
    subtitle: "Find the most interesting posts and active members in the community",
    loading: "Loading posts...",
    error: "Failed to load posts",
    empty: "No posts yet",
    searchPlaceholder: "Search posts, members or communities...",
    trending: "Trending",
    recent: "Recent",
    popular: "Popular",
    noResults: "No posts found matching your search",
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      listPublicFeed({ limit: 100 }).catch((err: any) => {
        console.error("Error fetching public feed:", err);
        throw err;
      }),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([items, viewerData]) => {
        console.log("Feed data received:", { itemsCount: items?.length, items });
        const scored = (Array.isArray(items) ? items : []).map((post) => ({
          ...post,
          score: calculateFinalScore(post),
          engagement: calculateEngagementScore(post),
          viralityScore: calculateViralityScore(post),
          velocityScore: calculateVelocityScore(post),
          qualityScore: calculateQualityScore(post),
          freshnessScore: calculateFreshnessScore(post),
          finalScore: calculateFinalScore(post),
        }));

        setPosts(scored);
        setViewer(viewerData);
        setError(null);
      })
      .catch((err: any) => {
        console.error("Error in discover page:", err);
        let msg = copy.error;
        if (typeof err === 'string') {
          msg = err;
        } else if (err?.message && typeof err.message === 'string') {
          msg = err.message;
        } else if (err?.status === 401) {
          msg = lang === "tr" ? "Bu sayfaya erişim için giriş yapın" : "Sign in to view this page";
        } else if (err?.status === 403) {
          msg = lang === "tr" ? "Bu sayfaya erişim izniniz yok" : "You don't have permission to view this page";
        } else if (err?.status === 404) {
          msg = lang === "tr" ? "Sayfa bulunamadı" : "Page not found";
        } else if (err?.status === 500) {
          msg = lang === "tr" ? "Sunucu hatası oluştu" : "Server error occurred";
        }
        setError(msg);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [copy.error, lang]);

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = posts.filter(
        (post) =>
          post.body.toLowerCase().includes(term) ||
          post.author_name.toLowerCase().includes(term) ||
          (post.organization_name?.toLowerCase().includes(term) ?? false)
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "trending":
          const trendingScoreA = a.viralityScore * 0.6 + a.velocityScore * 0.4;
          const trendingScoreB = b.viralityScore * 0.6 + b.velocityScore * 0.4;
          return trendingScoreB - trendingScoreA;
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "popular":
          return b.finalScore - a.finalScore;
        default:
          return 0;
      }
    });
  }, [posts, searchTerm, sortBy]);

  async function handleToggleLike(post: ScoredPost) {
    if (!viewer) {
      window.location.href = "/login?mode=member";
      return;
    }
    setBusyPostId(post.public_id);
    try {
      if (post.liked_by_me) {
        await unlikeCommunityPost(post.public_id);
        setPosts((current) =>
          current.map((item) =>
            item.public_id === post.public_id
              ? (() => {
                  const updated = {
                    ...item,
                    liked_by_me: false,
                    like_count: Math.max(0, item.like_count - 1),
                  };
                  return {
                    ...updated,
                    score: calculateFinalScore(updated),
                    engagement: calculateEngagementScore(updated),
                    viralityScore: calculateViralityScore(updated),
                    velocityScore: calculateVelocityScore(updated),
                    qualityScore: calculateQualityScore(updated),
                    freshnessScore: calculateFreshnessScore(updated),
                    finalScore: calculateFinalScore(updated),
                  };
                })()
              : item
          )
        );
      } else {
        await likeCommunityPost(post.public_id);
        setPosts((current) =>
          current.map((item) =>
            item.public_id === post.public_id
              ? (() => {
                  const updated = {
                    ...item,
                    liked_by_me: true,
                    like_count: item.like_count + 1,
                  };
                  return {
                    ...updated,
                    score: calculateFinalScore(updated),
                    engagement: calculateEngagementScore(updated),
                    viralityScore: calculateViralityScore(updated),
                    velocityScore: calculateVelocityScore(updated),
                    qualityScore: calculateQualityScore(updated),
                    freshnessScore: calculateFreshnessScore(updated),
                    finalScore: calculateFinalScore(updated),
                  };
                })()
              : item
          )
        );
      }
    } catch (err: any) {
      setError(err?.message || copy.error);
    } finally {
      setBusyPostId(null);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">{copy.title}</h1>
        <p className="text-sm text-gray-500">{copy.subtitle}</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-sm"
          />
        </div>

        {/* Sort Buttons */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200/60 shrink-0">
          {(["trending", "recent", "popular"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                sortBy === option
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
              }`}
            >
              {copy[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="mb-3 h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">{copy.loading}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAndSortedPosts.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center text-sm text-gray-500">
          {searchTerm ? copy.noResults : copy.empty}
        </div>
      )}

      {/* Posts Masonry/Grid */}
      {!loading && filteredAndSortedPosts.length > 0 && (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredAndSortedPosts.map((post) => (
            <div
              key={post.public_id}
              className="break-inside-avoid bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
            >
              <div className="p-5">
                {/* Header: Author & Score */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {post.author_public_id && post.author_type === "member" ? (
                          <Link
                            href={`/member/${post.author_public_id}`}
                            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition truncate"
                          >
                            {post.author_name}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {post.author_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="truncate">{post.organization_name || "Üye"}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(post.created_at, lang)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Score Display */}
                  <div className="shrink-0 text-right bg-gray-50 rounded-lg px-2 py-1 border border-gray-100">
                    <div className="text-sm font-bold text-gray-900 leading-none">
                      {formatNumber(post.score)}
                    </div>
                    <div className="text-[9px] font-semibold text-gray-500 uppercase mt-0.5 tracking-wider">
                      Skor
                    </div>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                  {post.body}
                </p>

                {/* Engagement & Analytics Container */}
                <div className="pt-3 border-t border-gray-100 flex flex-col gap-3">
                  
                  {/* Primary Actions (Like / Comment) */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => viewer ? handleToggleLike(post) : (window.location.href = "/login?mode=member")}
                      disabled={busyPostId === post.public_id}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                        post.liked_by_me
                          ? "text-rose-600"
                          : "text-gray-500 hover:text-gray-900"
                      } disabled:opacity-50`}
                    >
                      <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                      <span>{formatNumber(post.like_count)}</span>
                    </button>
                    
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                      <MessageCircle className="h-4 w-4" />
                      <span>{formatNumber(post.comment_count)}</span>
                    </div>

                    {post.score >= 80 && (
                      <div className="ml-auto inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600 border border-rose-100">
                        <TrendingUp className="h-3 w-3" />
                        {lang === "tr" ? "Trend" : "Trending"}
                      </div>
                    )}
                  </div>

                  {/* Analytics "Nerd Stats" (Subtle) */}
                  <div className="flex items-center justify-between bg-slate-50/50 rounded-md p-2 border border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500" title="Virality">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {Math.round(post.viralityScore)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500" title="Velocity">
                      <Zap className="h-3 w-3 text-blue-500" />
                      {Math.round(post.velocityScore)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500" title="Quality">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      {Math.round(post.qualityScore)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500" title="Freshness">
                      <Clock className="h-3 w-3 text-emerald-500" />
                      {Math.round(post.freshnessScore)}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}