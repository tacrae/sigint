export interface AccountBaseline {
  handle: string;
  sample_count: number;
  last_updated: string;
  avg_views: number;
  avg_views_per_follower: number | null;
  avg_comment_to_like: number | null;
  avg_saves_per_view: number | null;
  avg_shares_per_view: number | null;
}

export interface OutlierSignal {
  signal: string;
  video_value: number;
  baseline_value: number;
  deviation_ratio: number;
  weight: number;
}

export interface OutlierResult {
  is_outlier: boolean;
  outlier_score: number; // 0-10; ≥5 = outlier (~3x baseline)
  signals: OutlierSignal[];
  baseline_source: "stored" | "intra_batch";
  baseline_sample_count: number;
  proxy_note: string | null;
}

interface VideoMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  follower_count?: number;
}

// Maps deviation ratio [1, 5+] → score [0, 10].
// 1x baseline → 0, 3x → 5, 5x → 10.
function deviationToScore(ratio: number): number {
  return Math.min(10, Math.max(0, ((ratio - 1) / 4) * 10));
}

function rollingMean(old: number | null, n: number, next: number | null): number | null {
  if (next === null || next === undefined) return old ?? null;
  if (old === null || old === undefined || n === 0) return next;
  return (old * n + next) / (n + 1);
}

export function updateBaseline(
  existing: AccountBaseline | null,
  video: VideoMetrics,
  handle: string
): AccountBaseline {
  const n = existing?.sample_count ?? 0;

  const vpf =
    video.views && video.follower_count && video.follower_count > 0
      ? video.views / video.follower_count
      : null;
  const ctl =
    video.comments && video.likes && video.likes > 0
      ? video.comments / video.likes
      : null;
  const spv =
    video.saves && video.views && video.views > 0
      ? video.saves / video.views
      : null;
  const shpv =
    video.shares && video.views && video.views > 0
      ? video.shares / video.views
      : null;

  return {
    handle,
    // Cap at 50 so very old data doesn't permanently anchor the baseline.
    sample_count: Math.min(n + 1, 50),
    last_updated: new Date().toISOString(),
    avg_views: rollingMean(existing?.avg_views ?? null, n, video.views ?? null) ?? 0,
    avg_views_per_follower: rollingMean(existing?.avg_views_per_follower ?? null, n, vpf),
    avg_comment_to_like: rollingMean(existing?.avg_comment_to_like ?? null, n, ctl),
    avg_saves_per_view: rollingMean(existing?.avg_saves_per_view ?? null, n, spv),
    avg_shares_per_view: rollingMean(existing?.avg_shares_per_view ?? null, n, shpv),
  };
}

// Computes a leave-one-out intra-batch baseline for targetVideo using the
// other posts from the same handle in the batch. Returns null if fewer than
// 2 peers exist (not enough to form a reliable baseline).
export function getIntraBatchBaseline(
  targetVideo: VideoMetrics & { handle?: string },
  allVideos: Array<VideoMetrics & { handle?: string }>
): AccountBaseline | null {
  if (!targetVideo.handle) return null;

  const peers = allVideos.filter(
    (v) => v.handle === targetVideo.handle && v !== targetVideo
  );
  if (peers.length < 2) return null;

  let baseline: AccountBaseline | null = null;
  for (const peer of peers) {
    baseline = updateBaseline(baseline, peer, targetVideo.handle);
  }
  return baseline;
}

export function computeOutlierScore(
  video: VideoMetrics,
  baseline: AccountBaseline,
  source: "stored" | "intra_batch"
): OutlierResult {
  const signals: OutlierSignal[] = [];
  let proxyNote: string | null = null;

  // Primary signal — views-per-follower (weight 0.6)
  if (
    video.views &&
    video.follower_count &&
    video.follower_count > 0 &&
    baseline.avg_views_per_follower !== null
  ) {
    const vpf = video.views / video.follower_count;
    const ratio = vpf / baseline.avg_views_per_follower;
    signals.push({
      signal: "views_per_follower",
      video_value: parseFloat(vpf.toFixed(4)),
      baseline_value: parseFloat(baseline.avg_views_per_follower.toFixed(4)),
      deviation_ratio: parseFloat(ratio.toFixed(2)),
      weight: 0.6,
    });
  }

  // Secondary signal — prefer saves, then shares, then comment-to-like proxy (weight 0.4)
  if (video.saves && video.views && video.views > 0 && baseline.avg_saves_per_view !== null) {
    const spv = video.saves / video.views;
    const ratio = spv / baseline.avg_saves_per_view;
    signals.push({
      signal: "saves_per_view",
      video_value: parseFloat(spv.toFixed(4)),
      baseline_value: parseFloat(baseline.avg_saves_per_view.toFixed(4)),
      deviation_ratio: parseFloat(ratio.toFixed(2)),
      weight: 0.4,
    });
  } else if (
    video.shares &&
    video.views &&
    video.views > 0 &&
    baseline.avg_shares_per_view !== null
  ) {
    const shpv = video.shares / video.views;
    const ratio = shpv / baseline.avg_shares_per_view;
    signals.push({
      signal: "shares_per_view",
      video_value: parseFloat(shpv.toFixed(4)),
      baseline_value: parseFloat(baseline.avg_shares_per_view.toFixed(4)),
      deviation_ratio: parseFloat(ratio.toFixed(2)),
      weight: 0.4,
    });
  } else if (
    video.comments &&
    video.likes &&
    video.likes > 0 &&
    baseline.avg_comment_to_like !== null
  ) {
    const ctl = video.comments / video.likes;
    const ratio = ctl / baseline.avg_comment_to_like;
    signals.push({
      signal: "comment_to_like",
      video_value: parseFloat(ctl.toFixed(4)),
      baseline_value: parseFloat(baseline.avg_comment_to_like.toFixed(4)),
      deviation_ratio: parseFloat(ratio.toFixed(2)),
      weight: 0.4,
    });
    proxyNote =
      "Saves and shares not provided — comment-to-like ratio used as engagement proxy. This signal is weaker: high ratios can reflect controversy rather than save-worthy content.";
  }

  if (signals.length === 0) {
    return {
      is_outlier: false,
      outlier_score: 0,
      signals: [],
      baseline_source: source,
      baseline_sample_count: baseline.sample_count,
      proxy_note: null,
    };
  }

  // Normalise weights to sum to 1 across available signals, then score.
  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  const weightedScore = signals.reduce((s, sig) => {
    return s + deviationToScore(sig.deviation_ratio) * (sig.weight / totalWeight);
  }, 0);

  const outlier_score = parseFloat(weightedScore.toFixed(1));

  return {
    is_outlier: outlier_score >= 5.0,
    outlier_score,
    signals,
    baseline_source: source,
    baseline_sample_count: baseline.sample_count,
    proxy_note: proxyNote,
  };
}
