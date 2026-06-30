import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CONTENT_CHECKLIST } from "@/lib/viral_knowledge";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const checklistText = Object.entries(CONTENT_CHECKLIST)
  .map(
    ([cat, qs]) =>
      `${cat}:\n${qs.map((q) => `  - ${q}`).join("\n")}`
  )
  .join("\n\n");

const SYSTEM_PROMPT = `You are a pre-post content auditor. Given a short-form video script (text only), evaluate it against the content checklist below and return a structured pass/fail report.

IMPORTANT RULES:
- "PASS" = the script clearly satisfies the question
- "FAIL" = the script clearly fails the question
- "UNCLEAR" = cannot determine from text alone (common for visual_audio questions since we only have script text)
- Be strict. A weak hook is a FAIL, not a PASS.
- "critical_failures" = any FAIL that must be fixed before posting (hook, value, or CTA failures especially)
- verdict: "GO" = 80%+ pass rate and zero critical failures | "CONDITIONAL GO" = 60–79% or minor fixes needed | "NO-GO" = below 60% or critical hook/value failure

CONTENT CHECKLIST:
${checklistText}

Output as strict JSON, no prose, no markdown fences:
{
  "checklist": {
    "hook_power": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR", "note": "brief reason" }
    ],
    "value_quality": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR", "note": "brief reason" }
    ],
    "visual_audio": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR", "note": "brief reason" }
    ],
    "structure_pacing": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR", "note": "brief reason" }
    ],
    "marketing_conversion": [
      { "question": "exact question text", "result": "PASS | FAIL | UNCLEAR", "note": "brief reason" }
    ]
  },
  "critical_failures": ["specific issue to fix before posting"],
  "verdict": "GO | CONDITIONAL GO | NO-GO",
  "verdict_reason": "one sentence"
}`;

interface ChecklistItem {
  question: string;
  result: "PASS" | "FAIL" | "UNCLEAR";
  note: string;
}

function computeScores(checklist: Record<string, ChecklistItem[]>) {
  const scores: Record<string, { passed: number; total: number; pct: number }> = {};
  let totalPassed = 0;
  let totalItems = 0;

  for (const [cat, items] of Object.entries(checklist)) {
    const passed = items.filter((i) => i.result === "PASS").length;
    const total = items.length;
    scores[cat] = { passed, total, pct: total > 0 ? Math.round((passed / total) * 100) : 0 };
    totalPassed += passed;
    totalItems += total;
  }

  return {
    scores,
    overall: {
      passed: totalPassed,
      total: totalItems,
      pct: totalItems > 0 ? Math.round((totalPassed / totalItems) * 100) : 0,
    },
  };
}

export async function POST(req: NextRequest) {
  let body: { script_text: string; niche?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.script_text?.trim()) {
    return NextResponse.json({ error: "script_text is required" }, { status: 400 });
  }

  const userMessage = `Run the pre-flight checklist on this script${body.niche ? ` (niche: ${body.niche})` : ""}.

SCRIPT:
${body.script_text.trim()}

Return only the JSON object. No prose. No markdown fences.`;

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const message = await stream.finalMessage();
    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    let raw: {
      checklist: Record<string, ChecklistItem[]>;
      critical_failures: string[];
      verdict: "GO" | "CONDITIONAL GO" | "NO-GO";
      verdict_reason: string;
    };
    try {
      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      raw = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Claude returned invalid JSON", raw: rawText }, { status: 502 });
    }

    const { scores, overall } = computeScores(raw.checklist);

    return NextResponse.json({
      success: true,
      checklist: raw.checklist,
      scores,
      overall,
      critical_failures: raw.critical_failures ?? [],
      verdict: raw.verdict,
      verdict_reason: raw.verdict_reason,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
