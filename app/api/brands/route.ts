import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const brandsPath = path.join(process.cwd(), "data", "brands.json");
  const data = JSON.parse(fs.readFileSync(brandsPath, "utf-8"));
  return NextResponse.json(data);
}
