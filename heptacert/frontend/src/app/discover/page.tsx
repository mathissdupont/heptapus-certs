"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, Users, Search } from "lucide-react";
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
import PostCard from "@/components/CommunityFeed/PostCard";

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
  // Virality = Combined engagement metrics weighted by importance
  const totalEngagement = post.like_count + (post.comment_count * 2);
  
  // Engagement ratio = total engagement per day
  const ageInHours = (new Date().getTime() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  const ageInDays = Math.max(0.1, ageInHours / 24); // Min 0.1 days to avoid division issues
  
  // Posts that get engagement quickly are viral
  const engagementPerDay = totalEngagement / ageInDays;
  
  // Sigmoid function to normalize viral score (0-100)
  const viralScore = (Math.tanh(engagementPerDay / 10) + 1) * 50;
  
  return Math.min(100, viralScore);
}

// Engagement Velocity Score (how fast engagement is growing)
function calculateVelocityScore(post: CommunityPost): number {
  const now = new Date();
  const postDate = new Date(post.created_at);
  const ageMs = now.getTime() - postDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  // Recent posts (< 1 hour) get +30 bonus
  if (ageHours < 1) return 30;
  // Quick movers (< 6 hours) get +20 bonus
  if (ageHours < 6) return 20;
  // Day-old posts get +10 bonus if still getting engagement
  if (ageHours < 24) return (post.like_count + post.comment_count > 5) ? 10 : 0;
  
  return 0;
}

// Quality Score based on comment depth and discussion
function calculateQualityScore(post: CommunityPost): number {
  // More comments = deeper discussion = higher quality
  const commentBonus = Math.min(50, post.comment_count * 2);
  
  // Like to comment ratio (healthy discussion = ~1:3 ratio)
  const likeCommentRatio = post.comment_count > 0
    ? post.like_count / post.comment_count
    : post.like_count; // If no comments, use likes as base
  
  // Ideal ratio is 2:1 (2 likes per comment). Pages reward discussions.
  const ratioPenaline = Math.abs(likeCommentRatio - 2) > 5 ? -10 : 0;
  
  return Math.max(0, commentBonus + ratioPenaline);
}

// Freshness Score: newer = better (but not too new = suspicious)
function calculateFreshnessScore(post: CommunityPost): number {
  const now = new Date();
  const postDate = new Date(post.created_at);
  const ageMs = now.getTime() - postDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  if (ageHours < 2) return 40; // Super fresh
  if (ageHours < 6) return 35;
  if (ageHours < 24) return 25;
  if (ageHours < 72) return 15;
  
  return 5; // Old posts still get minor boost
}

// Main Algorithm: Combines all signals into one score
function calculateFinalScore(post: CommunityPost): number {
  const virality = calculateViralityScore(post);
  const velocity = calculateVelocityScore(post);
  const quality = calculateQualityScore(post);
  const freshness = calculateFreshnessScore(post);
  
  // Weighted average:
  // - Virality: 40% (most important - shows what's trending)
  // - Quality: 30% (discussions matter)
  // - Velocity: 20% (momentum matters)
  // - Freshness: 10% (keep some old content visible)
  
  const finalScore = (
    (virality * 0.40) +
    (quality * 0.30) +
    (velocity * 0.20) +
    (freshness * 0.10)
  );
  
  return Math.min(100, Math.max(0, finalScore));
}

function calculateEngagementScore(post: CommunityPost): number {
  // Simple metric for display
  return post.like_count + (post.comment_count * 1.5);
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
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
    searchPlaceholder: "Gönderi veya üye ara...",
    trending: "Trend",
    recent: "Yeni",
    popular: "Popüler",
    engagement: "Etkileşim",
    views: "Görüntüleme",
    noResults: "Aramanızla eşleşen gönderi bulunamadı",
  } : {
    title: "Discover",
    subtitle: "Find the most interesting posts and active members in the community",
    loading: "Loading posts...",
    error: "Failed to load posts",
    empty: "No posts yet",
    searchPlaceholder: "Search posts or members...",
    trending: "Trending",
    recent: "Recent",
    popular: "Popular",
    engagement: "Engagement",
    views: "Views",
    noResults: "No posts found matching your search",
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listPublicFeed({ limit: 100 }),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([items, viewerData]) => {
        // Score posts with advanced algorithm
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
      })
      .catch((err: any) => {
        let msg = copy.error;
        if (typeof err === 'string') {
          msg = err;
        } else if (err?.message && typeof err.message === 'string') {
          msg = err.message;
        }
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [copy.error]);

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = posts.filter(
        (post) =>
          post.body.toLowerCase().includes(term) ||
          post.author_name.toLowerCase().includes(term) ||
          (post.organization_name?.toLowerCase().includes(term) ?? false)
      );
    }

    // Sort by selected criteria
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "trending":
          // Trending = What's hot RIGHT NOW (Virality + Velocity)
          const trendingScoreA = a.viralityScore * 0.6 + a.velocityScore * 0.4;
          const trendingScoreB = b.viralityScore * 0.6 + b.velocityScore * 0.4;
          return trendingScoreB - trendingScoreA;
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Newest first
        case "popular":
          // Popular = All-time engagement quality (final score)
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
        // Unlike handler
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
        // Like handler
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
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 inline-flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          {copy.title}
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{copy.subtitle}</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Sort Buttons */}
        <div className="flex flex-wrap gap-2">
          {(["trending", "recent", "popular"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                sortBy === option
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {copy[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Oops! Gönderiler yüklenemedi</p>
          <p className="text-red-600 text-xs">{copy.error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {copy.loading}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAndSortedPosts.length === 0 && (
        <div className="mt-10 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
          {searchTerm ? copy.noResults : copy.empty}
        </div>
      )}

      {/* Posts Grid */}
      {!loading && filteredAndSortedPosts.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedPosts.map((post) => (
            <div
              key={post.public_id}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition duration-300 hover:shadow-2xl hover:-translate-y-1 border border-slate-100"
            >
              {/* Gradient Background Border */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 via-transparent to-purple-400/0 group-hover:from-blue-400/10 group-hover:to-purple-400/10 transition-colors duration-300 pointer-events-none" />

              {/* Content */}
              <div className="relative z-10 p-5">
                {/* Header with Author */}
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 ring-2 ring-slate-100">
                    {post.author_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.author_avatar_url}
                        alt={post.author_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-white">
                        {post.author_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {post.author_public_id && post.author_type === "member" ? (
                        <Link
                          href={`/member/${post.author_public_id}`}
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 transition truncate"
                        >
                          {post.author_name}
                        </Link>
                      ) : (
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {post.author_name}
                        </p>
                      )}
                      {post.score >= 100 && (
                        <span className="inline-flex h-5 px-2 rounded-full bg-gradient-to-r from-yellow-200 to-orange-200 text-[10px] font-bold text-orange-900 whitespace-nowrap">
                          🔥 Trending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {post.organization_name || "Topluluk Üyesi"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 px-3 py-2 border border-blue-200">
                      <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        {formatNumber(post.score)}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">Skor</p>
                  </div>
                </div>

                {/* Content */}
                <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-700 group-hover:text-slate-900 transition">
                  {post.body}
                </p>

                {/* Engagement Stats - Visual Bars */}
                <div className="mb-4 space-y-3 border-t border-slate-100 pt-4">
                  {/* Likes and Comments */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 px-3 py-2 border border-blue-200/50">
                      <div className="text-sm font-bold text-blue-600">{formatNumber(post.like_count)}</div>
                      <div className="text-xs text-blue-600/70">👍 Beğeni</div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-3 py-2 border border-emerald-200/50">
                      <div className="text-sm font-bold text-emerald-600">{formatNumber(post.comment_count)}</div>
                      <div className="text-xs text-emerald-600/70">💬 Yorum</div>
                    </div>
                  </div>

                  {/* Algorithm Scores Grid */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 px-2 py-2 text-center border border-orange-200/50">
                      <div className="font-bold text-orange-700">{Math.round(post.viralityScore)}</div>
                      <div className="text-[10px] text-orange-600">🔥</div>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 px-2 py-2 text-center border border-pink-200/50">
                      <div className="font-bold text-purple-700">{Math.round(post.qualityScore)}</div>
                      <div className="text-[10px] text-purple-600">✨</div>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 px-2 py-2 text-center border border-blue-200/50">
                      <div className="font-bold text-cyan-700">{Math.round(post.velocityScore)}</div>
                      <div className="text-[10px] text-cyan-600">⚡</div>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 px-2 py-2 text-center border border-emerald-200/50">
                      <div className="font-bold text-green-700">{Math.round(post.freshnessScore)}</div>
                      <div className="text-[10px] text-green-600">🌟</div>
                    </div>
                  </div>
                </div>

              {/* CTA Button */}
              {viewer && (
                <button
                  onClick={() => void handleToggleLike(post)}
                  disabled={busyPostId === post.public_id}
                  className={`w-full rounded-lg py-2 text-sm font-semibold transition ${
                    post.liked_by_me
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  } disabled:opacity-50`}
                >
                  {post.liked_by_me ? "👍 Beğeni Aldı" : "👍 Beğen"}
                </button>
              )}
              {!viewer && (
                <Link
                  href="/login?mode=member"
                  className="block rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
