import { NextRequest, NextResponse } from "next/server";
import { writeData } from "@/lib/data";

export async function POST(req: NextRequest) {
  let body: { analyses?: unknown[]; autopsies?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.analyses) writeData("analyses.json", body.analyses);
  if (body.autopsies) writeData("autopsies.json", body.autopsies);

  return NextResponse.json({ success: true });
}
