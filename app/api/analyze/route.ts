import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { readData, writeData } from "@/lib/data";
import { estimate_competitor_revenue, rank_competitors } from "@/lib/revenue";
import {
  AccountBaseline,
  computeOutlierScore,
  getIntraBatchBaseline,
  updateBaseline,
} from "@/lib/outlier";
import {
  HOOK_TYPES,
  PSYCHOLOGICAL_TRIGGERS,
  HOOK_SCORING_RUBRIC,
  PLATFORM_BEHAVIOR,
} from "@/lib/viral_knowledge";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BRANDS_PATH = path.join(process.cwd(), "data", "brands.json");

interface VideoInput {
  url: string;
  handle?: string;
  caption?: string;
  hook?: string;
  cta_used?: string;
  hashtags?: string[];
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  posting_time?: string;
  follower_count?: number;
  product_price?: number;
}

interface AnalysisRequest {
  brand_id: string;
  hashtags: string[];
  videos: VideoInput[];
}

function buildSystemPrompt(brand: Record<string, unknown>): string {
  const hookTypesText = Object.entries(HOOK_TYPES)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  const triggersText = Object.entries(PSYCHOLOGICAL_TRIGGERS)
    .map(
      ([k, v]) =>
        `  ${k}: ${v.description}\n    Signals: ${v.detection_signals.join("; ")}`
    )
    .join("\n");

  const hookRubricText = Object.entries(HOOK_SCORING_RUBRIC)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  const igAlgo = PLATFORM_BEHAVIOR.instagram;

  return `You are SIGINT — an Instagram growth intelligence analyst. You analyze trending Reels from a creator's niche and extract conversion-driving patterns.

BRAND CONTEXT:
- Brand: ${brand.name}
- Niche: ${brand.niche}
- Voice: ${brand.voice}
- Audience: ${brand.audience}
- Content format: ${brand.content_format}
- CTA keyword: ${brand.cta_keyword} (via ${brand.cta_platform})
- Hashtag stack: ${(brand.hashtag_stack as string[]).join(", ")}

INSTAGRAM ALGORITHM CONTEXT:
- Rewards: ${igAlgo.algo_rewards.join(", ")}
- Effective CTA style: ${igAlgo.cta_style}

HOOK TYPES — identify which type(s) each video uses:
${hookTypesText}

HOOK SCORING (1–10 scale — score every video's hook):
${hookRubricText}

PSYCHOLOGICAL TRIGGERS — identify which trigger(s) each video activates:
${triggersText}

YOUR TASK:
Analyze the provided video data and return a JSON object with zero prose — only the JSON structure below. No markdown fences. No explanation text.

SCORING RUBRIC (conversion_score 0–100):
- 80–100: Strong hook in first 2s, clear problem/solution arc, explicit CTA, matches brand niche tightly
- 60–79: Good hook, decent arc, weak or soft CTA, partially relevant niche
- 40–59: Average hook, no clear arc, no CTA, loosely relevant
- 0–39: No hook, no arc, no CTA, irrelevant niche

OUTPUT SCHEMA (strict JSON, no prose):
{
  "patterns": {
    "top_hooks": ["string — common hook patterns that drove engagement"],
    "top_caption_structures": ["string — caption formulas that appear repeatedly"],
    "top_ctas": ["string — call to action phrases and formats that work"],
    "best_posting_times": ["string — times/days when high-performing content was posted"],
    "cross_hashtag_winners": ["string — hashtags appearing on multiple high-conversion videos"]
  },
  "videos_scored": [
    {
      "url": "string",
      "conversion_score": 0,
      "hook_score": 0,
      "hook_types_used": ["verbal | visual | text"],
      "psychological_triggers": ["trigger names detected"],
      "why": "string — 1–2 sentences explaining the score"
    }
  ],
  "recommended_brief": {
    "hook": "string — exact hook text to open the Reel",
    "visual_style": "string — describe the visual approach (faceless, avatar, text overlay, etc.)",
    "format": "string — e.g. talking points, montage, single-message, tutorial",
    "duration_seconds": 0,
    "caption_structure": "string — template for the caption",
    "cta": "string — exact CTA text tied to ${brand.cta_keyword}",
    "posting_time": "string — recommended day and time",
    "why_this_works": "string — 2–3 sentences explaining the synthesis",
    "optio_params": {
      "style": "cinematic | realistic | animated | cartoon | abstract | avatar | documentary | neon",
      "format": "short-form | tutorial | explainer | vlog | story | promotional | documentary | music-video",
      "duration": 15,
      "voiceover": false,
      "lipsync": false,
      "motion": "subtle | dynamic | heavy",
      "aspect_ratio": "9:16 | 16:9 | 1:1"
    }
  }
}`;
}

export async function POST(req: NextRequest) {
  let body: AnalysisRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { brand_id, hashtags, videos } = body;

  if (!brand_id || !videos || videos.length === 0) {
    return NextResponse.json(
      { error: "brand_id and at least one video are required" },
      { status: 400 }
    );
  }

  const brandsFile = JSON.parse(fs.readFileSync(BRANDS_PATH, "utf-8"));
  const brand = brandsFile.brands.find(
    (b: Record<string, unknown>) => b.id === brand_id
  );
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const userMessage = `Analyze these ${videos.length} Instagram videos for the ${brand.name} brand.

Active hashtag stack for this session: ${hashtags.length > 0 ? hashtags.join(", ") : (brand.hashtag_stack as string[]).join(", ")}

VIDEOS TO ANALYZE:
${videos
  .map(
    (v, i) => `
Video ${i + 1}:
  URL: ${v.url || "not provided"}
  Hook: ${v.hook || "not provided"}
  Caption: ${v.caption || "not provided"}
  CTA used: ${v.cta_used || "not provided"}
  Hashtags: ${v.hashtags?.join(", ") || "not provided"}
  Views: ${v.views ?? "unknown"}
  Likes: ${v.likes ?? "unknown"}
  Comments: ${v.comments ?? "unknown"}
  Posting time: ${v.posting_time || "unknown"}`
  )
  .join("\n")}

Return only the JSON object. No prose. No markdown fences.`;

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt(brand),
      messages: [{ role: "user", content: userMessage }],
    });

    const message = await stream.finalMessage();
    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let analysisResult: Record<string, unknown>;
    try {
      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      analysisResult = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Claude returned invalid JSON", raw: rawText },
        { status: 502 }
      );
    }

    // Revenue enrichment — runs after Claude's analysis, not inside it
    const videoMap = new Map(videos.map((v) => [v.url, v]));
    if (Array.isArray(analysisResult.videos_scored)) {
      analysisResult.videos_scored = (
        analysisResult.videos_scored as Array<Record<string, unknown>>
      ).map((scored) => {
        const input = videoMap.get(scored.url as string);
        if (input?.follower_count && input?.product_price) {
          scored.revenue_estimate = estimate_competitor_revenue(
            input.follower_count,
            input.product_price
          );
        }
        return scored;
      });
    }

    const competitorsWithRevenue = videos.filter(
      (v) => v.follower_count && v.product_price
    );
    if (competitorsWithRevenue.length > 1) {
      analysisResult.revenue_intelligence = rank_competitors(
        competitorsWithRevenue.map((v) => ({
          handle: v.handle ?? v.url,
          follower_count: v.follower_count!,
          product_price: v.product_price!,
        }))
      );
    }

    // Outlier detection — per-account baseline comparison
    const storedBaselines = Object.fromEntries(
      (readData("account_baselines.json") as AccountBaseline[]).map((b) => [b.handle, b])
    );

    if (Array.isArray(analysisResult.videos_scored)) {
      analysisResult.videos_scored = (
        analysisResult.videos_scored as Array<Record<string, unknown>>
      ).map((scored) => {
        const input = videoMap.get(scored.url as string);
        if (!input?.handle) return scored;

        // Option C: prefer stored baseline, fall back to intra-batch leave-one-out
        const stored = storedBaselines[input.handle] ?? null;
        const intraBatch = getIntraBatchBaseline(input, videos);
        const baseline = stored ?? intraBatch;
        const source: "stored" | "intra_batch" = stored ? "stored" : "intra_batch";

        if (!baseline) return scored;

        const outlier = computeOutlierScore(input, baseline, source);
        return { ...scored, ...outlier };
      });

      // Surface outliers first
      (analysisResult.videos_scored as Array<Record<string, unknown>>).sort(
        (a, b) => ((b.outlier_score as number) ?? 0) - ((a.outlier_score as number) ?? 0)
      );
    }

    // Persist updated baselines for all videos that have a handle
    for (const v of videos) {
      if (!v.handle) continue;
      storedBaselines[v.handle] = updateBaseline(
        storedBaselines[v.handle] ?? null,
        v,
        v.handle
      );
    }
    writeData("account_baselines.json", Object.values(storedBaselines));

    const record = {
      id: `analysis_${Date.now()}`,
      brand_id,
      timestamp: new Date().toISOString(),
      hashtags_used: hashtags,
      video_count: videos.length,
      result: analysisResult,
    };

    const existing = readData("analyses.json") as typeof record[];
    existing.push(record);
    writeData("analyses.json", existing);

    return NextResponse.json({ success: true, analysis: record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
