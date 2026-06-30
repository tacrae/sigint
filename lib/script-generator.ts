/**
 * Prompt builders for the SCRIPT module. Pure functions — no Claude calls, no side effects.
 * Imported by generate, hooks, and rewrite API routes.
 */

import {
  HOOK_TYPES,
  HOOK_SCORING_RUBRIC,
  PSYCHOLOGICAL_TRIGGERS,
  VIRALITY_FACTORS,
  CONTENT_CHECKLIST,
  PLATFORM_BEHAVIOR,
} from "@/lib/viral_knowledge";

export type ScriptStyle =
  | "faceless_avatar"
  | "talking_head"
  | "faceless_pointing"
  | "clips_with_voiceover";

export interface GenerateScriptParams {
  topic: string;
  niche: string;
  style: ScriptStyle;
  product_cta?: string;
  target_duration?: number;
  tone?: string;
  platform?: string;
}

// ─── Serialized knowledge blocks (built once at module load) ─────────────────

const hookTypesText = Object.entries(HOOK_TYPES)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n");

const hookRubricText = Object.entries(HOOK_SCORING_RUBRIC)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n");

const triggersText = Object.entries(PSYCHOLOGICAL_TRIGGERS)
  .map(([k, v]) => `  ${k}: ${v.description}`)
  .join("\n");

const viralityText = Object.entries(VIRALITY_FACTORS)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n");

const checklistText = Object.entries(CONTENT_CHECKLIST)
  .map(([cat, qs]) => `  ${cat}:\n${qs.map((q) => `    - ${q}`).join("\n")}`)
  .join("\n");

// ─── Style descriptions ───────────────────────────────────────────────────────

const STYLE_DESCRIPTIONS: Record<ScriptStyle, string> = {
  faceless_avatar:
    "Digital avatar character — no real face. Visual hook is the avatar's movement or expression in the opening frame. Text overlays must carry the verbal message independently of any face.",
  talking_head:
    "Creator speaks directly to camera. Visual hook is facial expression, eye contact, or a physical gesture in the first frame. The face IS the hook.",
  faceless_pointing:
    "Hands or body pointing at text, graphics, or results on screen. Visual hook is the dramatic reveal of what is being pointed at. The point must happen in the first 1 second.",
  clips_with_voiceover:
    "B-roll or screen recording clips with voice narration. Visual hook is the most striking clip played first. Voiceover must add context the clips cannot convey alone.",
};

// ─── generate_script ─────────────────────────────────────────────────────────

export const GENERATE_SCRIPT_SYSTEM_PROMPT = `You are a viral short-form video scriptwriter. You write word-for-word scripts optimized for maximum retention and conversion. The hook is the entire game — if the first 2 seconds do not stop the scroll, the rest is irrelevant.

HOOK TYPES (layer all three for elite scripts):
${hookTypesText}

HOOK SCORING RUBRIC (target 8 or higher):
${hookRubricText}

PSYCHOLOGICAL TRIGGERS (activate at least 2):
${triggersText}

VIRALITY PILLARS:
${viralityText}

CONTENT CHECKLIST:
${checklistText}

DELIVERY RATE:
- Standard/intense delivery: 2.5 words per second
- Fast/energetic delivery: 3 words per second
- [PAUSE] markers = 0.5 second beat. Use 2–3 maximum per script.

STYLE NOTES:
- faceless_avatar: Text overlays carry the message. 3 words max per frame.
- talking_head: Eye contact and facial expression ARE the hook. Use them.
- faceless_pointing: The reveal must happen in the first 1 second.
- clips_with_voiceover: Lead with the most visually striking clip.

Output as strict JSON, no prose, no markdown fences:

{
  "hook": {
    "verbal_hook": "exact spoken words for the opening 1–3 seconds",
    "visual_hook": "direction for what the viewer sees in the opening frame",
    "text_hook": "on-screen text overlay — 3–5 words max, punchy",
    "audio_note": "sound/music direction (e.g. 'bass hit on first word', 'eerie ambient start', 'dead silence then cut')"
  },
  "body": {
    "script_lines": ["line one", "line two [PAUSE]", "line three"],
    "visual_directions": ["matching visual note — same array length as script_lines"],
    "pacing_notes": "string — where to speed up, slow down, and why"
  },
  "cta": {
    "verbal_cta": "exact words to say",
    "visual_cta": "what to show — logo, text overlay, link preview, etc.",
    "trigger_word": "the comment keyword for DM automation, or null if not applicable"
  },
  "metadata": {
    "estimated_duration_seconds": 0,
    "hook_score": 0,
    "hook_score_label": "string — exact label from the rubric",
    "triggers_used": ["trigger_name"],
    "hook_types_layered": ["verbal", "visual", "text"],
    "checklist_results": {
      "hook_power": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }],
      "value_quality": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }],
      "visual_audio": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }],
      "structure_pacing": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }],
      "marketing_conversion": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }]
    },
    "five_dollar_test": false,
    "full_script": "complete script text in order, ready to read aloud"
  }
}`;

export function buildGenerateScriptUserMessage(params: GenerateScriptParams): string {
  const styleDesc = STYLE_DESCRIPTIONS[params.style];
  const platform = params.platform ?? "instagram";
  const platformBehavior = PLATFORM_BEHAVIOR[platform];
  const duration = params.target_duration ?? 20;
  const ctaLine = params.product_cta
    ? `Product / CTA: ${params.product_cta}`
    : `No product — use a 'comment X' or 'follow for more' CTA`;

  return `Write a viral short-form video script for this brief.

Topic: ${params.topic}
Niche: ${params.niche}
Style: ${params.style} — ${styleDesc}
Tone: ${params.tone ?? "intense"}
Target duration: ${duration} seconds (hard cap — do not exceed)
Platform: ${platform}
  Algorithm rewards: ${platformBehavior?.algo_rewards.join(", ") ?? "engagement, saves, shares"}
  CTA style: ${platformBehavior?.cta_style ?? "link in bio"}
${ctaLine}

Requirements:
- Layer all three hook types in the opening 1–3 seconds
- Activate at least 2 psychological triggers
- Hook score must be 8 or higher
- Five-dollar test must pass (would someone pay $5 for this info?)
- Total script must fit within ${duration} seconds

Return only the JSON object. No prose. No markdown fences.`;
}

// ─── generate_hook_variants ───────────────────────────────────────────────────

export const HOOK_VARIANTS_SYSTEM_PROMPT = `You are a hook specialist. You generate multiple distinct hook variations for the same topic so a creator can A/B test different psychological approaches. Each variation must use a unique combination of hook types and psychological triggers.

Hook types:
${hookTypesText}

Psychological triggers:
${triggersText}

Scoring rubric (every hook must score 8 or higher):
${hookRubricText}

Rules:
- Generate exactly 10 variations
- Each must use a distinct combination of hook types and triggers — no two hooks can share the same combination
- No two hooks can open with the same word
- Every verbal hook must be a complete opening line (1–3 seconds at 2.5 words/sec)
- Cover all 7 psychological triggers across the 10 variants (some triggers may appear more than once)

Output as strict JSON, no prose, no markdown fences:

{
  "variants": [
    {
      "id": 1,
      "verbal_hook": "exact opening line",
      "visual_hook": "direction for opening frame",
      "text_hook": "on-screen text — 3–5 words",
      "audio_note": "sound direction",
      "hook_types_used": ["verbal", "text"],
      "triggers_used": ["curiosity_gap", "emotional_triggers"],
      "hook_score": 0,
      "rationale": "one sentence on why this combination works for this topic and niche"
    }
  ]
}`;

export function buildHookVariantsUserMessage(topic: string, niche: string): string {
  return `Generate 10 hook variations for this brief.

Topic: ${topic}
Niche: ${niche}

Every hook must score 8 or higher. Mix single-type (two types layered) with three-type layered hooks. Cover every psychological trigger at least once across all 10 variants.

Return only the JSON object. No prose. No markdown fences.`;
}

// ─── rewrite_script ───────────────────────────────────────────────────────────

export const REWRITE_SCRIPT_SYSTEM_PROMPT = `You are a viral script rewriter. You take existing scripts that are underperforming or unoptimized and rebuild them using the viral framework — preserving the core idea while engineering the hook, retention mechanics, and CTA for maximum performance.

Hook types to layer:
${hookTypesText}

Hook scoring rubric (target 8 or higher):
${hookRubricText}

Psychological triggers (activate at least 2):
${triggersText}

Virality pillars:
${viralityText}

Content checklist:
${checklistText}

Rewrite rules:
- Preserve the core insight — do not change what the script is teaching
- Rebuild the hook from scratch using all three hook types
- Add missing psychological triggers
- Cut any line that does not serve hook, value delivery, or CTA
- Improve the CTA to match platform behavior

Output as strict JSON, no prose, no markdown fences:

{
  "original_diagnosis": {
    "what_it_was_trying_to_do": "string",
    "hook_score_before": 0,
    "what_was_wrong": ["string"]
  },
  "hook": {
    "verbal_hook": "string",
    "visual_hook": "string",
    "text_hook": "string",
    "audio_note": "string"
  },
  "body": {
    "script_lines": ["string"],
    "visual_directions": ["string"],
    "pacing_notes": "string"
  },
  "cta": {
    "verbal_cta": "string",
    "visual_cta": "string",
    "trigger_word": "string or null"
  },
  "metadata": {
    "estimated_duration_seconds": 0,
    "hook_score": 0,
    "hook_score_label": "string",
    "triggers_used": ["string"],
    "hook_types_layered": ["string"],
    "checklist_results": {
      "hook_power": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }],
      "value_quality": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }],
      "visual_audio": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }],
      "structure_pacing": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }],
      "marketing_conversion": [{ "question": "string", "result": "PASS | FAIL | UNCLEAR" }]
    },
    "five_dollar_test": false,
    "full_script": "string"
  }
}`;

export function buildRewriteUserMessage(
  originalScript: string,
  niche: string,
  style: ScriptStyle,
  platform: string = "instagram"
): string {
  const platformBehavior = PLATFORM_BEHAVIOR[platform];
  const styleDesc = STYLE_DESCRIPTIONS[style];
  return `Rewrite this script using the viral framework.

Niche: ${niche}
Style: ${style} — ${styleDesc}
Platform: ${platform}
  Algorithm rewards: ${platformBehavior?.algo_rewards.join(", ") ?? "engagement, saves, shares"}
  CTA style: ${platformBehavior?.cta_style ?? "link in bio"}

ORIGINAL SCRIPT:
${originalScript}

Diagnose what was wrong, then rebuild completely. Return only the JSON object. No prose. No markdown fences.`;
}
