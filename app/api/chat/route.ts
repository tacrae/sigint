import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  analysisContext: string;
  mode: "scout" | "autopsy";
  brandProfile: string;
}

function buildSystemPrompt(brandProfile: string, analysisContext: string): string {
  return `You are a blunt, experienced Instagram content strategist embedded inside SIGINT, a personal content intelligence tool. You have already read the analysis that was just generated. Your job is to go deeper — give specific, actionable tips, help iterate on ideas, and push back when something won't work.

You know the brand you're working with:
${brandProfile}

Rules:
- Never use: hustle, grind, crush it, passive income, easy, secret, fake urgency
- Target audience is adults 35+ starting over or starting late
- All videos are 20 seconds max
- Every script suggestion needs an accompanying caption
- Be direct. No encouragement for its own sake. No filler.
- When suggesting hooks, write the actual hook — not a description of one
- When suggesting captions, write the actual caption — not a description of one
- Reference specific details from the analysis when giving tips — not generic advice

The analysis context for this session:
${analysisContext}`;
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, analysisContext, brandProfile } = body;

  if (!messages || !analysisContext || !brandProfile) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: buildSystemPrompt(brandProfile, analysisContext),
      messages,
    });

    const message = await stream.finalMessage();
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
