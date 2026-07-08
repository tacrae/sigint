import { NextRequest, NextResponse } from "next/server";
import { readData } from "@/lib/data";
import { HOOK_TYPE_DEFS, BEAT_STRUCTURE_DEFS } from "@/lib/viral_knowledge";

interface AutopsyRecord {
  id: string;
  brand_id: string;
  timestamp: string;
  video_title: string;
  handle?: string;
  result: {
    virality_assessment?: { weighted_total?: number; verdict?: string };
    structure_classification?: {
      hook_type?: string;
      beat_structure?: string;
      inferred_duration?: string;
      structural_weak_point?: string | null;
    };
  };
}

interface AxisStats {
  count: number;
  top_performer_count: number;
  avg_virality: number;
  posts: string[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const brand_id = searchParams.get("brand_id");
  const min_score = parseFloat(searchParams.get("min_score") ?? "0");
  const top_pct = parseFloat(searchParams.get("top_pct") ?? "0.5");

  const all = readData("autopsies.json") as AutopsyRecord[];

  // Filter
  let posts = brand_id ? all.filter((p) => p.brand_id === brand_id) : all;
  if (min_score > 0) {
    posts = posts.filter(
      (p) => (p.result.virality_assessment?.weighted_total ?? 0) >= min_score
    );
  }

  if (posts.length === 0) {
    return NextResponse.json({ total_posts: 0, message: "No autopsies found for these filters." });
  }

  // Sort by virality score descending
  const sorted = [...posts].sort(
    (a, b) =>
      (b.result.virality_assessment?.weighted_total ?? 0) -
      (a.result.virality_assessment?.weighted_total ?? 0)
  );

  // Top performers = top N% by virality score (minimum 1)
  const topCount = Math.max(1, Math.round(sorted.length * top_pct));
  const topIds = new Set(sorted.slice(0, topCount).map((p) => p.id));

  // Aggregate helper
  function aggregate(key: "hook_type" | "beat_structure") {
    const stats: Record<string, AxisStats> = {};

    for (const p of posts) {
      const val = p.result.structure_classification?.[key];
      if (!val) continue;
      if (!stats[val]) stats[val] = { count: 0, top_performer_count: 0, avg_virality: 0, posts: [] };
      stats[val].count++;
      stats[val].posts.push(p.video_title ?? p.id);
      const score = p.result.virality_assessment?.weighted_total ?? 0;
      stats[val].avg_virality =
        (stats[val].avg_virality * (stats[val].count - 1) + score) / stats[val].count;
      if (topIds.has(p.id)) stats[val].top_performer_count++;
    }

    // Round avg_virality and sort by top_performer_count desc
    return Object.fromEntries(
      Object.entries(stats)
        .sort((a, b) => b[1].top_performer_count - a[1].top_performer_count)
        .map(([k, v]) => [k, { ...v, avg_virality: parseFloat(v.avg_virality.toFixed(1)) }])
    );
  }

  const hookTypeStats = aggregate("hook_type");
  const beatStructureStats = aggregate("beat_structure");

  // Build labeled summaries using the defs
  const hookTypeSummary = Object.entries(hookTypeStats).map(([k, v]) => ({
    key: k,
    label: HOOK_TYPE_DEFS[k]?.label ?? k,
    count: v.count,
    top_performer_count: v.top_performer_count,
    top_performer_pct: posts.length > 0 ? Math.round((v.top_performer_count / topCount) * 100) : 0,
    avg_virality: v.avg_virality,
    posts: v.posts,
  }));

  const beatStructureSummary = Object.entries(beatStructureStats).map(([k, v]) => ({
    key: k,
    label: BEAT_STRUCTURE_DEFS[k]?.label ?? k,
    duration_range: BEAT_STRUCTURE_DEFS[k]?.duration_range ?? "unknown",
    count: v.count,
    top_performer_count: v.top_performer_count,
    top_performer_pct: posts.length > 0 ? Math.round((v.top_performer_count / topCount) * 100) : 0,
    avg_virality: v.avg_virality,
  }));

  const topPosts = sorted.slice(0, topCount).map((p) => ({
    id: p.id,
    title: p.video_title,
    handle: p.handle,
    virality_score: p.result.virality_assessment?.weighted_total ?? null,
    verdict: p.result.virality_assessment?.verdict ?? null,
    hook_type: p.result.structure_classification?.hook_type ?? null,
    beat_structure: p.result.structure_classification?.beat_structure ?? null,
    structural_weak_point: p.result.structure_classification?.structural_weak_point ?? null,
    timestamp: p.timestamp,
  }));

  return NextResponse.json({
    total_posts: posts.length,
    top_performer_count: topCount,
    top_performer_threshold: sorted[topCount - 1]?.result.virality_assessment?.weighted_total ?? null,
    filters_applied: { brand_id: brand_id ?? "all", min_score, top_pct },
    hook_types: hookTypeSummary,
    beat_structures: beatStructureSummary,
    top_posts: topPosts,
  });
}
