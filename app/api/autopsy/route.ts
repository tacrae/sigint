import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readData, writeData } from "@/lib/data";
import {
  CONTENT_CHECKLIST,
  HOOK_SCORING_RUBRIC,
  HOOK_TYPES,
  PLATFORM_BEHAVIOR,
  PSYCHOLOGICAL_TRIGGERS,
  VIRALITY_FACTORS,
} from "@/lib/viral_knowledge";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const hookTypesText = Object.entries(HOOK_TYPES)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n");

const hookRubricText = Object.entries(HOOK_SCORING_RUBRIC)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n");

const triggersText = Object.entries(PSYCHOLOGICAL_TRIGGERS)
  .map(
    ([k, v]) =>
      `  ${k}: ${v.description}\n    Signals: ${v.detection_signals.join("; ")}`
  )
  .join("\n");

const viralityText = Object.entries(VIRALITY_FACTORS)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n");

const checklistText = Object.entries(CONTENT_CHECKLIST)
  .map(
    ([cat, qs]) =>
      `  ${cat}:\n${qs.map((q) => `    - ${q}`).join("\n")}`
  )
  .join("\n");

const platformText = Object.entries(PLATFORM_BEHAVIOR)
  .map(
    ([p, v]) =>
      `  ${p}:\n    algo_rewards: ${v.algo_rewards.join(", ")}\n    cta_style: ${v.cta_style}`
  )
  .join("\n");

const SYSTEM_PROMPT = `You are SIGINT AUTOPSY — a surgical content diagnostics engine. You do not give encouragement. You give precise scores, exact failure points, and specific fixes. Run all five diagnostic sections in order.

---

METRICS BENCHMARKS:

Save rate (saves / views):
  < 1% = content not worth saving | 1–3% = average | > 3% = strong conversion signal

Profile visit rate (profile_visits / views):
  < 1% = no curiosity created | > 3% = strong brand pull

Follow conversion (follows / profile_visits):
  < 10% = profile not compelling post-click | > 20% = strong conversion

Engagement rate ((likes + comments + saves) / views):
  < 3% = passive consumption | > 5% = content resonating

Hook rate (views / reach):
  < 30% = hook failed | 30–60% = average | > 60% = strong

---

SECTION 1 — HOOK DIAGNOSIS

Hook types:
${hookTypesText}

Scoring rubric (1–10):
${hookRubricText}

Instructions:
- Identify which of the three hook types (verbal, visual, text) are present vs missing. Elite content layers all three.
- Score the hook 1–10 using the rubric. Base the score on how many types are layered and strength of emotional trigger.
- If score < 7, provide an exact rewritten hook that would score 8+. If score >= 7, set rewrite to null.

---

SECTION 2 — PSYCHOLOGICAL TRIGGER SCAN

Triggers and detection signals:
${triggersText}

Instructions:
- For each of the 7 triggers, mark detected true or false. Cite brief evidence (what in the content triggered it), or null if absent.
- Identify the single most effective trigger that was present and explain specifically why it worked for this content and audience.
- For each missing trigger, suggest one specific way to add it to this type of content.

---

SECTION 3 — VIRALITY FACTOR ASSESSMENT

Virality pillars:
${viralityText}

Instructions:
- Score each pillar (hook, retention, shareability) 1–10 independently. Do NOT compute the composite — that is calculated server-side.
- Identify the weakest pillar and give one specific, actionable fix.

---

SECTION 4 — PRE-FLIGHT CHECKLIST

Checklist questions:
${checklistText}

Instructions:
- Evaluate every question in every category. Mark each exactly "PASS", "FAIL", or "UNCLEAR" (use UNCLEAR only when data is genuinely insufficient to judge).
- Output the full question text alongside each result. Do NOT compute percentages or totals — those are calculated server-side.

---

SECTION 5 — PLATFORM FIT CHECK

Platform behavior:
${platformText}

Instructions:
- Identify the platform from the video data (default instagram if not specified).
- List each mismatch as a specific, concrete failure — not vague. One mismatch = "FAIL" verdict.
- List each optimization as a specific, actionable change.
- Verdict is "PASS" only if there are zero mismatches.

---

OUTPUT SCHEMA (strict JSON, no prose, no markdown fences):

{
  "hook_diagnosis": {
    "hook_score": 0,
    "hook_types_present": ["verbal", "visual", "text"],
    "hook_types_missing": ["verbal", "visual", "text"],
    "rubric_label": "string — exact label from the rubric for the score given",
    "rewrite": "string — exact rewritten hook if score < 7, otherwise null"
  },
  "trigger_scan": {
    "triggers": {
      "curiosity_gap": { "detected": false, "evidence": "string or null" },
      "mirror_neurons": { "detected": false, "evidence": "string or null" },
      "emotional_triggers": { "detected": false, "evidence": "string or null" },
      "status_signaling": { "detected": false, "evidence": "string or null" },
      "cognitive_ease": { "detected": false, "evidence": "string or null" },
      "pattern_interrupt": { "detected": false, "evidence": "string or null" },
      "social_proof": { "detected": false, "evidence": "string or null" }
    },
    "most_effective_trigger": "trigger_name or null",
    "most_effective_reason": "string or null",
    "missing_trigger_suggestions": ["trigger_name: one sentence on how to add it"]
  },
  "virality_assessment": {
    "hook_pillar_score": 0,
    "retention_pillar_score": 0,
    "shareability_pillar_score": 0,
    "weakest_pillar": "hook | retention | shareability",
    "weakest_pillar_fix": "string — specific actionable fix"
  },
  "preflight_checklist": {
    "hook_power": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR" }
    ],
    "value_quality": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR" }
    ],
    "visual_audio": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR" }
    ],
    "structure_pacing": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR" }
    ],
    "marketing_conversion": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR" }
    ]
  },
  "platform_fit": {
    "verdict": "PASS | FAIL",
    "platform_analyzed": "instagram | tiktok",
    "mismatches": ["string — specific concrete mismatch"],
    "optimizations": ["string — specific actionable change"]
  },
  "diagnosis": {
    "overall_verdict": "string — 2–3 sentences summarizing the core failure",
    "save_rate_analysis": "string",
    "profile_visit_analysis": "string",
    "follow_conversion_analysis": "string",
    "engagement_analysis": "string",
    "hook_analysis": "string",
    "caption_analysis": "string",
    "cta_analysis": "string"
  },
  "what_broke": ["string"],
  "specific_fixes": [
    { "element": "string", "problem": "string", "fix": "string" }
  ],
  "next_video_brief": {
    "hook": "string",
    "caption_structure": "string",
    "cta": "string",
    "what_to_keep": "string",
    "what_to_cut": "string"
  }
}`;

interface VideoData {
  url?: string;
  handle?: string;
  post_id?: string;
  platform?: string;
  title?: string;
  posted_date?: string;
  reach?: number;
  impressions?: number;
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  profile_visits?: number;
  follows?: number;
  hook?: string;
  caption?: string;
  cta?: string;
  what_i_was_trying_to_do?: string;
}

interface AutopsyRequest {
  brand: Record<string, unknown>;
  video: VideoData;
  scout_context: Record<string, unknown> | null;
}

function computeMetrics(v: VideoData) {
  const views = v.views ?? 0;
  const saves = v.saves ?? 0;
  const likes = v.likes ?? 0;
  const comments = v.comments ?? 0;
  const profile_visits = v.profile_visits ?? 0;
  const follows = v.follows ?? 0;
  const reach = v.reach ?? 0;

  const saveRate = views > 0 ? ((saves / views) * 100).toFixed(2) : "N/A";
  const profileVisitRate = views > 0 ? ((profile_visits / views) * 100).toFixed(2) : "N/A";
  const followConversion = profile_visits > 0 ? ((follows / profile_visits) * 100).toFixed(2) : "N/A";
  const engagementRate =
    views > 0 ? (((likes + comments + saves) / views) * 100).toFixed(2) : "N/A";
  const hookRate = reach > 0 ? ((views / reach) * 100).toFixed(2) : "N/A";

  return { saveRate, profileVisitRate, followConversion, engagementRate, hookRate };
}

function computeDashboard(
  result: Record<string, unknown>,
  handle: string,
  postId: string
): Record<string, unknown> {
  const hd = (result.hook_diagnosis ?? {}) as Record<string, unknown>;
  const ts = (result.trigger_scan ?? {}) as Record<string, unknown>;
  const va = (result.virality_assessment ?? {}) as Record<string, unknown>;
  const cl = (result.preflight_checklist ?? {}) as Record<
    string,
    Array<{ question: string; result: string }>
  >;
  const pf = (result.platform_fit ?? {}) as Record<string, unknown>;

  const hookScore = (hd.hook_score as number) ?? 0;
  const present = ((hd.hook_types_present as string[]) ?? []).join(" + ") || "none";
  const missing = (hd.hook_types_missing as string[]) ?? [];
  const hookSummary =
    missing.length > 0
      ? `${hookScore}/10 (${present}, missing ${missing.join(", ")})`
      : `${hookScore}/10 (${present})`;

  const triggers = (ts.triggers ?? {}) as Record<string, { detected: boolean }>;
  const triggerDensity = Object.values(triggers).filter((t) => t.detected).length;

  const hookP = (va.hook_pillar_score as number) ?? 0;
  const retP = (va.retention_pillar_score as number) ?? 0;
  const shareP = (va.shareability_pillar_score as number) ?? 0;
  const viralPotential = parseFloat(((hookP + retP + shareP) / 3).toFixed(1));

  let passed = 0;
  let total = 0;
  for (const items of Object.values(cl)) {
    for (const item of items) {
      total++;
      if (item.result === "PASS") passed++;
    }
  }
  const preflightPct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const platformVerdict = (pf.verdict as string) ?? "UNKNOWN";

  const line = "━".repeat(22);
  const dashboardText = [
    `AUTOPSY REPORT — ${handle} / ${postId}`,
    line,
    `Hook Score:        ${hookSummary}`,
    `Trigger Density:   ${triggerDensity}/7`,
    `Viral Potential:   ${viralPotential}/10 (hook: ${hookP}, retention: ${retP}, shareability: ${shareP})`,
    `Pre-Flight Score:  ${preflightPct}% (${passed}/${total} checks passed)`,
    `Platform Fit:      ${platformVerdict}`,
    line,
  ].join("\n");

  return {
    handle,
    post_id: postId,
    hook_score: hookScore,
    hook_summary: hookSummary,
    trigger_density: triggerDensity,
    viral_potential: viralPotential,
    hook_pillar_score: hookP,
    retention_pillar_score: retP,
    shareability_pillar_score: shareP,
    preflight_pct: preflightPct,
    preflight_passed: passed,
    preflight_total: total,
    platform_fit: platformVerdict,
    text: dashboardText,
  };
}

export async function POST(req: NextRequest) {
  let body: AutopsyRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { brand, video, scout_context } = body;

  if (!video || !brand) {
    return NextResponse.json({ error: "brand and video are required" }, { status: 400 });
  }

  const metrics = computeMetrics(video);

  const scoutSection = scout_context
    ? `\nSCOUT CONTEXT (what's working in the niche right now):
${JSON.stringify(scout_context, null, 2)}\n
Compare this video's performance and approach against what's working in the niche.`
    : "";

  const userMessage = `Diagnose this Reel for ${brand.name ?? "this brand"}.

BRAND:
- Niche: ${brand.niche ?? "unknown"}
- Voice: ${brand.voice ?? "unknown"}
- Audience: ${brand.audience ?? "unknown"}
- CTA keyword: ${brand.cta_keyword ?? "unknown"}
- Platform: ${brand.cta_platform ?? "unknown"}

VIDEO: ${video.title ?? "Untitled"}
URL: ${video.url ?? "not provided"}
Handle: ${video.handle ?? "unknown"}
Post ID: ${video.post_id ?? "unknown"}
Platform: ${video.platform ?? "instagram"}
Posted: ${video.posted_date ?? "unknown"}

RAW METRICS:
  Views: ${video.views ?? 0}
  Reach: ${video.reach ?? 0}
  Impressions: ${video.impressions ?? 0}
  Likes: ${video.likes ?? 0}
  Comments: ${video.comments ?? 0}
  Saves: ${video.saves ?? 0}
  Shares: ${video.shares ?? 0}
  Profile visits: ${video.profile_visits ?? 0}
  Follows: ${video.follows ?? 0}

COMPUTED RATES:
  Save rate: ${metrics.saveRate}% (saves/views)
  Profile visit rate: ${metrics.profileVisitRate}% (profile_visits/views)
  Follow conversion: ${metrics.followConversion}% (follows/profile_visits)
  Engagement rate: ${metrics.engagementRate}% ((likes+comments+saves)/views)
  Hook rate: ${metrics.hookRate}% (views/reach — how many who saw it watched)

CONTENT:
  Hook: ${video.hook ?? "not provided"}
  Caption: ${video.caption ?? "not provided"}
  CTA: ${video.cta ?? "not provided"}

INTENT:
  What they were trying to do: ${video.what_i_was_trying_to_do ?? "not specified"}
${scoutSection}
Return only the JSON object. No prose. No markdown fences.`;

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const message = await stream.finalMessage();
    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let result: Record<string, unknown>;
    try {
      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Claude returned invalid JSON", raw: rawText },
        { status: 502 }
      );
    }

    result.dashboard = computeDashboard(
      result,
      video.handle ?? "unknown",
      video.post_id ?? video.title ?? "untitled"
    );

    const record = {
      id: `autopsy_${Date.now()}`,
      brand_id: brand.id ?? "unknown",
      timestamp: new Date().toISOString(),
      video_title: video.title ?? "Untitled",
      handle: video.handle,
      post_id: video.post_id,
      metrics,
      result,
    };

    const existing = readData("autopsies.json") as typeof record[];
    existing.push(record);
    writeData("autopsies.json", existing);

    return NextResponse.json({ success: true, autopsy: record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
