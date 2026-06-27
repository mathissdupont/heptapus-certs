# Advanced Discovery Algorithm Documentation

## Overview

The Discovery page now uses a sophisticated, multi-factor ranking algorithm inspired by Instagram and Reddit. Instead of simple upvote/downvote metrics, posts are ranked based on **virality, quality, velocity, and freshness**.

## Algorithm Architecture

### 1. Virality Score (40% Weight)

**Purpose:** Detect posts that are rapidly gaining engagement

**Formula:**
```
viralityScore = sigmoid(engagementPerDay / 10) × 50
```

Where:
- `totalEngagement = likeCount + (commentCount × 2)`
- `engagementPerDay = totalEngagement / (ageInDays + 0.1)`
- `sigmoid(x) = tanh(x) + 1` (maps to 0-100 range)

**Behavior:**
- Posts gaining 10+ engagements per day = maxed out score
- Sigmoid function prevents late bloomers from overshadowing trending posts
- Comments weighted 2× likes (discussions > passive likes)

**Examples:**
- 100 likes in 1 day → ~95 score 🔥
- 50 likes in 7 days → ~40 score
- 10 likes in 30 days → ~5 score

---

### 2. Quality Score (30% Weight)

**Purpose:** Reward posts that spark meaningful conversation

**Formula:**
```
commentBonus = min(50, commentCount × 2)
likeCommentRatio = likeCount / commentCount (or likeCount if no comments)
ratioPenalty = abs(likeCommentRatio - 2) > 5 ? -10 : 0
qualityScore = commentBonus + ratioPenalty
```

**Behavior:**
- Ideal ratio: ~2 likes per comment (healthy discussion)
- Heavy penalty if ratio is extreme (spam-like or bot-driven)
- Comment count directly contributes (more discussion = higher quality)

**Examples:**
- 50 comments, 90 likes (1.8 ratio) → ~100 score ✨
- 50 comments, 10 likes (0.2 ratio) → ~80 score
- 1 comment, 1000 likes (bot-like) → -10 penalty

---

### 3. Velocity Score (20% Weight)

**Purpose:** Give momentum to posts in their "golden hour" or "golden day"

**Formula:**
```javascript
if (ageHours < 1) return 30;      // Super fresh
if (ageHours < 6) return 20;      // Quick mover
if (ageHours < 24) return 10;     // Still trending
return 0;                          // Old posts reset to baseline
```

**Behavior:**
- Posts < 1 hour old get +30 boost (ensure discovery of new content)
- Posts < 6 hours old get +20 boost
- Posts < 24 hours old get +10 if still receiving engagement
- Older posts lose momentum bonus

**Effect:** Prevents old posts from permanently dominating rankings

---

### 4. Freshness Score (10% Weight)

**Purpose:** Ensure older content remains discoverable but doesn't dominate

**Formula:**
```javascript
if (ageHours < 2) return 40;   // Brand new
if (ageHours < 6) return 35;
if (ageHours < 24) return 25;
if (ageHours < 72) return 15;  // 3 days old
return 5;                       // Ancient content still visible
```

**Behavior:**
- Decreasing returns for older posts
- Ensures content rarely disappears completely
- Weights newest content higher than old content

---

## Final Score Calculation

**Weighted Aggregate:**
```javascript
finalScore = (virality × 0.40) + (quality × 0.30) + (velocity × 0.20) + (freshness × 0.10)
```

**Range:** 0-100 points

---

## Sorting Modes

### Mode 1: "Trending" (Default)

**Algorithm:**
```javascript
trendingScore = (viralityScore × 0.6) + (velocityScore × 0.4)
```

**Use Case:** What's **hot RIGHT NOW**

**Example Ranking:**
1. Post from 2 hours ago with 80 likes + 30 comments → ~85 trending score
2. Post from 1 day ago with 100 likes + 20 comments → ~60 trending score
3. Old post with 500 likes + 50 comments → ~30 trending score

---

### Mode 2: "Recent"

**Algorithm:**
```javascript
sort by creation_time DESC (newest first)
```

**Use Case:** Chronological discovery

**Behavior:** Pure time-based ordering, no engagement weighting

---

### Mode 3: "Popular"

**Algorithm:**
```javascript
sort by finalScore DESC (highest all-time quality first)
```

**Use Case:** Best all-time posts (balanced across all metrics)

**Behavior:** Shows consistently high-quality, well-discussed content

---

## Real-World Examples

### Example 1: Viral Post
- Created: 30 minutes ago
- Likes: 120
- Comments: 45
- Scores:
  - Virality: 92 (rapid rise)
  - Quality: 85 (good discussion)
  - Velocity: 30 (super fresh)
  - Freshness: 40 (brand new)
  - **Final: 88.5** (top of trending)
  - **Trending Mode: 88** 🚀

### Example 2: Quality Discussion
- Created: 5 days ago
- Likes: 200
- Comments: 80 (ratio 2.5:1)
- Scores:
  - Virality: 12 (old engagement plateau)
  - Quality: 90 (deep discussion)
  - Velocity: 0 (outside boost window)
  - Freshness: 5 (old)
  - **Final: 30.5** (not trending but visible in "popular")
  - **Trending Mode: 7** (drops from trending)

### Example 3: Bot-Like Spam
- Created: 2 hours ago
- Likes: 500
- Comments: 2 (ratio 250:1)
- Scores:
  - Virality: 98 (technically high engagement velocity)
  - Quality: -10 (unhealthy ratio penalty)
  - Velocity: 20 (recent)
  - Freshness: 40 (fresh)
  - **Final: 47** (caught by quality filter)
  - **Trending Mode: 59** (still boosted but quality suspicious)

---

## Why This Matters

### Problem with Simple Upvote/Downvote
- Old high-voted posts bury new discoveries
- Bot farms can artificially inflate rankings
- No measurement of discussion quality
- Engagement velocity information lost

### Solution
- **Virality Detection**: Momentum matters → what's relevant NOW
- **Quality Assurance**: Healthy discussion ratios prevent artificial inflation
- **Temporal Decay**: Fresh content gets fair chance to be discovered
- **Balanced Weighting**: 40% virality prevents old content dominance

---

## Technical Implementation

### Frontend Code Location
```
src/app/discover/page.tsx
- calculateViralityScore()
- calculateVelocityScore()
- calculateQualityScore()
- calculateFreshnessScore()
- calculateFinalScore()
```

### Display
Each post card shows 4 algorithm metrics for transparency:
- **Viral Score**: 0-100 (how fast engagement is growing)
- **Quality Score**: 0-100 (discussion depth indicator)
- **Velocity Score**: 0-30 (momentum in trending window)
- **Freshness Score**: 0-40 (time-based discovery boost)

Visual indicators with emojis:
- Viral 🔥
- Quality ✨
- Velocity ⚡
- Fresh 🌟

### Localization
Turkish and English labels for all metrics in `tr.ts` and `en.ts`

---

## Future Enhancements

### Planned Additions
1. **User Preference Scoring**: Boosting posts from followed users/organizations
2. **Topic Clustering**: Similar post detection and grouping
3. **Personalization**: Adapting discovery based on user engagement history
4. **Comment Quality Weighting**: Ignoring spam comments in quality calculation
5. **Temporal Decay Curve**: Smoothing freshness bonus over time
6. **Engagement Decay**: Accounting for seasonal topic popularity

### Backend Integration Needed
- Store algorithm scores in cache (Redis) for performance
- Batch recalculation every 5 minutes
- Database indexes on (virality_score, created_at, quality_score)

---

## Performance Notes

### Current Implementation
- **Client-side calculation**: All scores calculated in browser on page load
- **Recalculation**: When user likes/unlikes posts
- **Limitations**: No historical engagement tracking (wouldn't persist across sessions)

### Optimized Implementation (Future)
- **Backend pre-calculation**: Store scores in database
- **Real-time updates**: WebSocket updates when posts gain engagement
- **Caching**: Redis cache for frequently accessed discovery feeds
- **Analytics**: Track which posts rank highest over time

---

## Success Metrics

### How to Measure Algorithm Quality
1. **User Engagement**: Click-through rate on discovered posts
2. **Time on Feed**: Average session duration on discovery page
3. **Comment Participation**: % of users commenting on discovered posts
4. **Share Rate**: How often discovered posts are shared
5. **Feedback Loop**: User satisfaction with ranking quality

### Target KPIs
- 40%+ of feed interactions come from discovered posts (vs. followed content)
- 3+ minute average session on discovery page
- 2x higher engagement rate on trending vs. recent sort

---

## Transparency & Trust

All algorithm scores are **publicly visible** on each post card. Users can understand:
- Why certain posts rank higher
- What the metrics mean
- How the algorithm weighs quality vs. virality

This transparency builds user trust and prevents perception of unfair content suppression.

---

## References

### Inspired By
- **Reddit**: Virality & recency weighting, community-driven ranking
- **Instagram**: Quality scoring via discussion depth, algorithmic feed
- **HackerNews**: Quality-first approach, time-decay function
- **TikTok**: Velocity-based discovery (trending sound detection)

### Academic Foundations
- Sigmoid function for engagement normalization (prevents outlier dominance)
- Engagement velocity concept from information diffusion studies
- Time-decay function from recommendation system literature

