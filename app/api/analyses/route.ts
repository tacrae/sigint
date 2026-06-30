import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/data";

export async function GET() {
  return NextResponse.json(readData("analyses.json"));
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const filtered = readData("analyses.json").filter(
    (r) => (r as { id: string }).id !== id
  );
  writeData("analyses.json", filtered);

  return NextResponse.json({ success: true });
}
