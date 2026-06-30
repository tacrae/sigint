import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  HOOK_VARIANTS_SYSTEM_PROMPT,
  buildHookVariantsUserMessage,
} from "@/lib/script-generator";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  let body: { topic: string; niche: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { topic, niche } = body;
  if (!topic?.trim() || !niche?.trim()) {
    return NextResponse.json({ error: "topic and niche are required" }, { status: 400 });
  }

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: HOOK_VARIANTS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildHookVariantsUserMessage(topic.trim(), niche.trim()) }],
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

    return NextResponse.json({ success: true, topic, niche, variants: result.variants ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
