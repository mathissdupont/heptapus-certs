"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Search, Heart, MessageCircle } from "lucide-react";
import {
  listPublicFeed,
  getPublicMemberMe,
  getPublicMemberToken,
  likeCommunityPost,
  unlikeCommunityPost,
  type CommunityPost,
  type PublicMemberMe,
} from "@/lib/api";

interface ScoredPost extends CommunityPost {
  score: number;
  engagement: number;
  viralityScore: number;
  velocityScore: number;
  qualityScore: number;
  freshnessScore: number;
  finalScore: number;
}

// ── Scoring algorithms (untouched) ───────────────────────────────────
function calculateViralityScore(post: CommunityPost): number {
  const totalEngagement = post.like_count + post.comment_count * 2;
  const ageInHours = (new Date().getTime() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  const ageInDays = Math.max(0.1, ageInHours / 24);
  const engagementPerDay = totalEngagement / ageInDays;
  return Math.min(100, (Math.tanh(engagementPerDay / 10) + 1) * 50);
}

function calculateVelocityScore(post: CommunityPost): number {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  if (ageHours < 1) return 30;
  if (ageHours < 6) return 20;
  if (ageHours < 24) return post.like_count + post.comment_count > 5 ? 10 : 0;
  return 0;
}

function calculateQualityScore(post: CommunityPost): number {
  const commentBonus = Math.min(50, post.comment_count * 2);
  const ratio = post.comment_count > 0 ? post.like_count / post.comment_count : post.like_count;
  const penalty = Math.abs(ratio - 2) > 5 ? -10 : 0;
  return Math.max(0, commentBonus + penalty);
}

function calculateFreshnessScore(post: CommunityPost): number {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  if (ageHours < 2) return 40;
  if (ageHours < 6) return 35;
  if (ageHours < 24) return 25;
  if (ageHours < 72) return 15;
  return 5;
}

function calculateFinalScore(post: CommunityPost): number {
  return Math.min(100, Math.max(0,
    calculateViralityScore(post) * 0.40 +
    calculateQualityScore(post)  * 0.30 +
    calculateVelocityScore(post) * 0.20 +
    calculateFreshnessScore(post)* 0.10,
  ));
}

function calculateEngagementScore(post: CommunityPost): number {
  return post.like_count + post.comment_count * 1.5;
}

function scorePost(post: CommunityPost): ScoredPost {
  return {
    ...post,
    score:           calculateFinalScore(post),
    engagement:      calculateEngagementScore(post),
    viralityScore:   calculateViralityScore(post),
    velocityScore:   calculateVelocityScore(post),
    qualityScore:    calculateQualityScore(post),
    freshnessScore:  calculateFreshnessScore(post),
    finalScore:      calculateFinalScore(post),
  };
}

function formatNumber(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
}

function formatTimeAgo(dateString: string, copy: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string }) {
  const secs = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (secs < 60) return copy.justNow;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return copy.minutesAgo.replace("{count}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return copy.hoursAgo.replace("{count}", String(hours));
  return copy.daysAgo.replace("{count}", String(Math.floor(hours / 24)));
}

// ── Component ─────────────────────────────────────────────────────────
export default function DiscoveryPage() {
  const t = useTranslations();
  const [posts, setPosts] = useState<ScoredPost[]>([]);
  const [viewer, setViewer] = useState<PublicMemberMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"trending" | "recent" | "popular">("trending");

  const copy = {
    title: t("public_hub_title"),
    subtitle: t("public_hub_subtitle"),
    loading: t("public_hub_loading"),
    error: t("public_hub_error"),
    empty: t("public_hub_empty"),
    searchPlaceholder: t("public_hub_search"),
    trending: t("public_hub_trending"),
    recent: t("public_hub_recent"),
    popular: t("public_hub_popular"),
    noResults: t("public_hub_no_results"),
    member: t("public_hub_member"),
    signIn: t("public_hub_sign_in"),
    forbidden: t("public_hub_forbidden"),
    justNow: t("public_hub_just_now"),
    minutesAgo: t("public_hub_minutes_ago", { count: "{count}" }),
    hoursAgo: t("public_hub_hours_ago", { count: "{count}" }),
    daysAgo: t("public_hub_days_ago", { count: "{count}" }),
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      listPublicFeed({ limit: 50 }),
      getPublicMemberToken() ? getPublicMemberMe().catch(() => null) : Promise.resolve(null),
    ])
      .then(([items, viewerData]) => {
        setPosts((Array.isArray(items) ? items : []).map(scorePost));
        setViewer(viewerData);
      })
      .catch((err: unknown) => {
        const e = err as { message?: string; status?: number };
        let msg = copy.error;
        if (e?.status === 401) msg = copy.signIn;
        else if (e?.status === 403) msg = copy.forbidden;
        else if (e?.message) msg = e.message;
        setError(msg);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [copy.error, copy.signIn, copy.forbidden]);

  const displayPosts = useMemo(() => {
    let result = posts;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = posts.filter(
        (p) =>
          p.body.toLowerCase().includes(term) ||
          p.author_name.toLowerCase().includes(term) ||
          (p.organization_name?.toLowerCase().includes(term) ?? false),
      );
    }
    return result.sort((a, b) => {
      if (sortBy === "trending") return (b.viralityScore * 0.6 + b.velocityScore * 0.4) - (a.viralityScore * 0.6 + a.velocityScore * 0.4);
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return b.finalScore - a.finalScore;
    });
  }, [posts, searchTerm, sortBy]);

  async function handleToggleLike(post: ScoredPost) {
    if (!viewer) { window.location.href = "/login?mode=member"; return; }
    setBusyPostId(post.public_id);
    try {
      if (post.liked_by_me) {
        await unlikeCommunityPost(post.public_id);
        setPosts((cur) => cur.map((p) => p.public_id === post.public_id ? scorePost({ ...p, liked_by_me: false, like_count: Math.max(0, p.like_count - 1) }) : p));
      } else {
        await likeCommunityPost(post.public_id);
        setPosts((cur) => cur.map((p) => p.public_id === post.public_id ? scorePost({ ...p, liked_by_me: true, like_count: p.like_count + 1 }) : p));
      }
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || copy.error);
    } finally {
      setBusyPostId(null);
    }
  }

  const sortOptions = (["trending", "recent", "popular"] as const);

  return (
    <div className="flex min-h-screen flex-col bg-canvas pb-20">
      {/* Header */}
      <section className="border-b border-outline-subtle bg-raised px-4 pb-8 pt-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-content-primary sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-1.5 text-base text-content-muted">{copy.subtitle}</p>

          {/* Toolbar */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-faint" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                placeholder={copy.searchPlaceholder}
                className="input-field pl-9"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-outline-subtle bg-raised p-1 shadow-soft">
              {sortOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    sortBy === opt
                      ? "bg-content-primary text-content-inverted"
                      : "text-content-muted hover:text-content-primary"
                  }`}
                >
                  {copy[opt]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        {/* Error */}
        {error && <div className="error-banner mb-6">{error}</div>}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-content-faint">
            <Loader2 className="mb-3 h-6 w-6 animate-spin" />
            <span className="text-sm">{copy.loading}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && displayPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-outline-subtle bg-sunken">
              <Search className="h-5 w-5 text-content-faint" />
            </div>
            <p className="text-sm font-medium text-content-secondary">
              {searchTerm ? copy.noResults : copy.empty}
            </p>
          </div>
        )}

        {/* Posts */}
        {!loading && displayPosts.length > 0 && (
          <div className="space-y-4">
            {displayPosts.map((post) => (
              <Link
                key={post.public_id}
                href={`/post/${post.public_id}`}
                className="block"
              >
                <article className="overflow-hidden rounded-xl border border-outline-subtle bg-raised shadow-card transition-shadow hover:shadow-raised">
                  <div className="p-5">
                    {/* Author row */}
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-subtle bg-sunken">
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
                      <div className="min-w-0">
                        {post.author_public_id && post.author_type === "member" ? (
                          <Link
                            href={`/member/${post.author_public_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate text-sm font-medium text-content-primary hover:text-accent transition-colors"
                          >
                            {post.author_name}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium text-content-primary">
                            {post.author_name}
                          </p>
                        )}
                        <p className="truncate text-xs text-content-faint">
                          {post.organization_name || copy.member}
                          {" · "}
                          {formatTimeAgo(post.created_at, copy)}
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <p className="text-sm leading-relaxed text-content-secondary whitespace-pre-wrap">
                      {post.body}
                    </p>

                    {/* Engagement */}
                    <div className="mt-4 flex items-center gap-4 border-t border-outline-subtle pt-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleToggleLike(post);
                        }}
                        disabled={busyPostId === post.public_id}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                          post.liked_by_me
                            ? "text-status-danger-content"
                            : "text-content-faint hover:text-content-secondary"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                        <span>{formatNumber(post.like_count)}</span>
                      </button>

                      <div className="flex items-center gap-1.5 text-sm text-content-faint">
                        <MessageCircle className="h-4 w-4" />
                        <span>{formatNumber(post.comment_count)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
