import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readData, writeData } from "@/lib/data";
import {
  GENERATE_SCRIPT_SYSTEM_PROMPT,
  buildGenerateScriptUserMessage,
  type GenerateScriptParams,
  type ScriptStyle,
} from "@/lib/script-generator";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_STYLES: ScriptStyle[] = [
  "faceless_avatar",
  "talking_head",
  "faceless_pointing",
  "clips_with_voiceover",
];

export async function POST(req: NextRequest) {
  let body: Partial<GenerateScriptParams> & { brand_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { topic, niche, style, product_cta, target_duration, tone, platform } = body;

  if (!topic?.trim() || !niche?.trim()) {
    return NextResponse.json({ error: "topic and niche are required" }, { status: 400 });
  }
  if (style && !VALID_STYLES.includes(style)) {
    return NextResponse.json(
      { error: `style must be one of: ${VALID_STYLES.join(", ")}` },
      { status: 400 }
    );
  }

  const params: GenerateScriptParams = {
    topic: topic.trim(),
    niche: niche.trim(),
    style: (style as ScriptStyle) ?? "faceless_avatar",
    product_cta: product_cta?.trim(),
    target_duration: Math.min(target_duration ?? 20, 20),
    tone: tone?.trim() ?? "intense",
    platform: platform ?? "instagram",
  };

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: GENERATE_SCRIPT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildGenerateScriptUserMessage(params) }],
    });

    const message = await stream.finalMessage();
    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    let result: Record<string, unknown>;
    try {
      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Claude returned invalid JSON", raw: rawText }, { status: 502 });
    }

    const record = {
      id: `script_${Date.now()}`,
      brand_id: body.brand_id ?? "unknown",
      mode: "generate",
      timestamp: new Date().toISOString(),
      params,
      result,
    };

    const existing = readData("scripts.json") as typeof record[];
    existing.push(record);
    writeData("scripts.json", existing);

    return NextResponse.json({ success: true, script: record });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
