import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readData, writeData } from "@/lib/data";
import {
  REWRITE_SCRIPT_SYSTEM_PROMPT,
  buildRewriteUserMessage,
  type ScriptStyle,
} from "@/lib/script-generator";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  let body: {
    original_script: string;
    niche: string;
    style?: ScriptStyle;
    platform?: string;
    brand_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { original_script, niche, style, platform } = body;
  if (!original_script?.trim() || !niche?.trim()) {
    return NextResponse.json(
      { error: "original_script and niche are required" },
      { status: 400 }
    );
  }

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: REWRITE_SCRIPT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildRewriteUserMessage(
            original_script.trim(),
            niche.trim(),
            style ?? "faceless_avatar",
            platform ?? "instagram"
          ),
        },
      ],
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
      mode: "rewrite",
      timestamp: new Date().toISOString(),
      niche,
      style: style ?? "faceless_avatar",
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
