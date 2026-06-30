import { describe, it, expect } from "vitest";
import {
  estimate_competitor_revenue,
  rank_competitors,
} from "@/lib/revenue";
import {
  HOOK_SCORING_RUBRIC,
  CONTENT_CHECKLIST,
  PSYCHOLOGICAL_TRIGGERS,
  PLATFORM_BEHAVIOR,
  REVENUE_FORMULAS,
} from "@/lib/viral_knowledge";
import {
  buildGenerateScriptUserMessage,
  buildHookVariantsUserMessage,
  buildRewriteUserMessage,
  GENERATE_SCRIPT_SYSTEM_PROMPT,
  HOOK_VARIANTS_SYSTEM_PROMPT,
  REWRITE_SCRIPT_SYSTEM_PROMPT,
} from "@/lib/script-generator";

// ─── Helper matching the page's hookRubricLabel logic ────────────────────────

function rubricLabel(score: number): string {
  if (score <= 3) return HOOK_SCORING_RUBRIC["1-3"];
  if (score <= 5) return HOOK_SCORING_RUBRIC["4-5"];
  if (score <= 7) return HOOK_SCORING_RUBRIC["6-7"];
  if (score <= 9) return HOOK_SCORING_RUBRIC["8-9"];
  return HOOK_SCORING_RUBRIC["10"];
}

// ─── Revenue estimation ───────────────────────────────────────────────────────

describe("estimate_competitor_revenue", () => {
  it("returns correct values for 100k followers, $19 product with DM automation", () => {
    const r = estimate_competitor_revenue(100_000, 19);

    // Views: 100k × 100 = 10M
    expect(r.estimated_monthly_views).toBe(10_000_000);

    // Bio clicks: 10M × 0.001 = 10,000
    expect(r.bio_link_clicks).toBe(10_000);

    // DM clicks: 10M × 0.01 × 0.5 = 50,000
    expect(r.comment_dm_clicks).toBe(50_000);

    // Story clicks: 100k × 0.05 × 0.20 × 15 = 15,000
    expect(r.story_link_clicks).toBe(15_000);

    // Total: 10k + 50k + 15k = 75,000
    expect(r.total_link_clicks).toBe(75_000);

    // Revenue: 75k × 0.03 × $19 = $42,750
    expect(r.estimated_revenue).toBeCloseTo(42_750, 0);

    // Range: ±50%
    expect(r.revenue_range.low).toBeCloseTo(21_375, 0);
    expect(r.revenue_range.high).toBeCloseTo(64_125, 0);
  });

  it("sets comment_dm_clicks to 0 when has_dm_automation is false", () => {
    const r = estimate_competitor_revenue(100_000, 19, "instagram", 15, false);
    expect(r.comment_dm_clicks).toBe(0);
    expect(r.total_link_clicks).toBe(25_000);
    expect(r.estimated_revenue).toBeCloseTo(14_250, 0);
  });

  it("breakdown string contains all steps", () => {
    const r = estimate_competitor_revenue(50_000, 47);
    expect(r.breakdown).toContain("Views:");
    expect(r.breakdown).toContain("Bio clicks:");
    expect(r.breakdown).toContain("DM clicks:");
    expect(r.breakdown).toContain("Story clicks:");
    expect(r.breakdown).toContain("Revenue:");
    expect(r.breakdown).toContain("Range:");
  });

  it("revenue_range low is half and high is 1.5x estimated_revenue", () => {
    const r = estimate_competitor_revenue(200_000, 99);
    expect(r.revenue_range.low).toBeCloseTo(r.estimated_revenue * 0.5, 1);
    expect(r.revenue_range.high).toBeCloseTo(r.estimated_revenue * 1.5, 1);
  });

  it("uses REVENUE_FORMULAS constants — no hardcoded values", () => {
    const follower_count = 1_000;
    const product_price = 10;
    const r = estimate_competitor_revenue(follower_count, product_price);
    const views = follower_count * REVENUE_FORMULAS.followers_to_views_multiplier;
    const expected = (
      views * REVENUE_FORMULAS.views_to_bio_clicks +
      views * REVENUE_FORMULAS.views_to_comments * REVENUE_FORMULAS.comments_to_dm_clicks +
      follower_count *
        REVENUE_FORMULAS.story_view_rate *
        REVENUE_FORMULAS.story_click_rate *
        REVENUE_FORMULAS.stories_per_month_default
    ) * REVENUE_FORMULAS.purchase_conversion_rate * product_price;
    expect(r.estimated_revenue).toBeCloseTo(expected, 4);
  });
});

// ─── rank_competitors ─────────────────────────────────────────────────────────

describe("rank_competitors", () => {
  it("sorts by estimated_revenue descending", () => {
    const ranked = rank_competitors([
      { handle: "small", follower_count: 10_000, product_price: 19 },
      { handle: "big", follower_count: 500_000, product_price: 97 },
      { handle: "mid", follower_count: 50_000, product_price: 47 },
    ]);
    expect(ranked[0].handle).toBe("big");
    expect(ranked[ranked.length - 1].handle).toBe("small");
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].revenue_estimate.estimated_revenue).toBeLessThanOrEqual(
        ranked[i - 1].revenue_estimate.estimated_revenue
      );
    }
  });

  it("attaches a revenue_estimate to every entry", () => {
    const ranked = rank_competitors([
      { handle: "a", follower_count: 5_000, product_price: 29 },
      { handle: "b", follower_count: 20_000, product_price: 49 },
    ]);
    for (const entry of ranked) {
      expect(entry.revenue_estimate).toBeDefined();
      expect(typeof entry.revenue_estimate.estimated_revenue).toBe("number");
      expect(entry.revenue_estimate.estimated_revenue).toBeGreaterThan(0);
    }
  });

  it("handles a single competitor without throwing", () => {
    const ranked = rank_competitors([
      { handle: "solo", follower_count: 10_000, product_price: 19 },
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].handle).toBe("solo");
  });
});

// ─── Hook scoring rubric ──────────────────────────────────────────────────────

describe("HOOK_SCORING_RUBRIC", () => {
  it("covers every integer score from 1 to 10", () => {
    for (let score = 1; score <= 10; score++) {
      const label = rubricLabel(score);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("scores 1–3 map to the Weak label", () => {
    expect(rubricLabel(1)).toContain("Weak");
    expect(rubricLabel(2)).toContain("Weak");
    expect(rubricLabel(3)).toContain("Weak");
  });

  it("scores 8–9 map to the Viral-ready label", () => {
    expect(rubricLabel(8)).toContain("Viral-ready");
    expect(rubricLabel(9)).toContain("Viral-ready");
  });

  it("score 10 maps to the Elite label", () => {
    expect(rubricLabel(10)).toContain("Elite");
  });

  it("has exactly 5 rubric entries", () => {
    expect(Object.keys(HOOK_SCORING_RUBRIC)).toHaveLength(5);
  });
});

// ─── Content checklist structure ──────────────────────────────────────────────

describe("CONTENT_CHECKLIST", () => {
  it("has all five required categories", () => {
    expect(CONTENT_CHECKLIST).toHaveProperty("hook_power");
    expect(CONTENT_CHECKLIST).toHaveProperty("value_quality");
    expect(CONTENT_CHECKLIST).toHaveProperty("visual_audio");
    expect(CONTENT_CHECKLIST).toHaveProperty("structure_pacing");
    expect(CONTENT_CHECKLIST).toHaveProperty("marketing_conversion");
  });

  it("has the correct question count per category", () => {
    expect(CONTENT_CHECKLIST.hook_power).toHaveLength(4);
    expect(CONTENT_CHECKLIST.value_quality).toHaveLength(2);
    expect(CONTENT_CHECKLIST.visual_audio).toHaveLength(3);
    expect(CONTENT_CHECKLIST.structure_pacing).toHaveLength(3);
    expect(CONTENT_CHECKLIST.marketing_conversion).toHaveLength(3);
  });

  it("totals exactly 15 questions across all categories", () => {
    const total = Object.values(CONTENT_CHECKLIST).reduce(
      (sum, qs) => sum + qs.length,
      0
    );
    expect(total).toBe(15);
  });

  it("all questions are non-empty strings ending with a question mark", () => {
    for (const questions of Object.values(CONTENT_CHECKLIST)) {
      for (const q of questions) {
        expect(typeof q).toBe("string");
        expect(q.length).toBeGreaterThan(0);
        expect(q.endsWith("?")).toBe(true);
      }
    }
  });
});

// ─── Psychological triggers ───────────────────────────────────────────────────

describe("PSYCHOLOGICAL_TRIGGERS", () => {
  it("has exactly 7 triggers", () => {
    expect(Object.keys(PSYCHOLOGICAL_TRIGGERS)).toHaveLength(7);
  });

  it("every trigger has a description and detection_signals array", () => {
    for (const [, trigger] of Object.entries(PSYCHOLOGICAL_TRIGGERS)) {
      expect(typeof trigger.description).toBe("string");
      expect(trigger.description.length).toBeGreaterThan(0);
      expect(Array.isArray(trigger.detection_signals)).toBe(true);
      expect(trigger.detection_signals.length).toBeGreaterThan(0);
    }
  });

  it("includes the expected trigger names", () => {
    const keys = Object.keys(PSYCHOLOGICAL_TRIGGERS);
    expect(keys).toContain("curiosity_gap");
    expect(keys).toContain("mirror_neurons");
    expect(keys).toContain("social_proof");
  });
});

// ─── Platform behavior ────────────────────────────────────────────────────────

describe("PLATFORM_BEHAVIOR", () => {
  it("defines instagram and tiktok", () => {
    expect(PLATFORM_BEHAVIOR).toHaveProperty("instagram");
    expect(PLATFORM_BEHAVIOR).toHaveProperty("tiktok");
  });

  it("each platform has algo_rewards array and cta_style string", () => {
    for (const [, p] of Object.entries(PLATFORM_BEHAVIOR)) {
      expect(Array.isArray(p.algo_rewards)).toBe(true);
      expect(p.algo_rewards.length).toBeGreaterThan(0);
      expect(typeof p.cta_style).toBe("string");
    }
  });
});

// ─── Script generator prompt builders ────────────────────────────────────────

describe("script-generator prompt builders", () => {
  it("GENERATE_SCRIPT_SYSTEM_PROMPT contains all four output sections", () => {
    expect(GENERATE_SCRIPT_SYSTEM_PROMPT).toContain('"hook"');
    expect(GENERATE_SCRIPT_SYSTEM_PROMPT).toContain('"body"');
    expect(GENERATE_SCRIPT_SYSTEM_PROMPT).toContain('"cta"');
    expect(GENERATE_SCRIPT_SYSTEM_PROMPT).toContain('"metadata"');
  });

  it("buildGenerateScriptUserMessage includes topic and niche", () => {
    const msg = buildGenerateScriptUserMessage({
      topic: "why you're still broke",
      niche: "money mindset",
      style: "faceless_avatar",
    });
    expect(msg).toContain("why you're still broke");
    expect(msg).toContain("money mindset");
    expect(msg).toContain("faceless_avatar");
  });

  it("buildGenerateScriptUserMessage hard-caps duration at 20", () => {
    const msg = buildGenerateScriptUserMessage({
      topic: "test",
      niche: "test",
      style: "talking_head",
      target_duration: 60,
    });
    expect(msg).toContain("20 seconds");
  });

  it("buildGenerateScriptUserMessage includes product CTA when provided", () => {
    const msg = buildGenerateScriptUserMessage({
      topic: "test",
      niche: "test",
      style: "faceless_avatar",
      product_cta: "My $97 course",
    });
    expect(msg).toContain("My $97 course");
  });

  it("HOOK_VARIANTS_SYSTEM_PROMPT asks for exactly 10 variants", () => {
    expect(HOOK_VARIANTS_SYSTEM_PROMPT).toContain("exactly 10");
  });

  it("buildHookVariantsUserMessage includes topic and niche", () => {
    const msg = buildHookVariantsUserMessage("AI productivity", "tech tools");
    expect(msg).toContain("AI productivity");
    expect(msg).toContain("tech tools");
  });

  it("REWRITE_SCRIPT_SYSTEM_PROMPT contains original_diagnosis in schema", () => {
    expect(REWRITE_SCRIPT_SYSTEM_PROMPT).toContain("original_diagnosis");
  });

  it("buildRewriteUserMessage includes the original script text", () => {
    const original = "This is my existing script that needs work.";
    const msg = buildRewriteUserMessage(original, "self-improvement", "talking_head");
    expect(msg).toContain(original);
    expect(msg).toContain("self-improvement");
    expect(msg).toContain("talking_head");
  });
});
