import fs from "fs";

// Always write to /tmp — the only writable directory on Vercel serverless.
// /tmp is also writable in local dev; data just resets on server restart,
// which is fine given the Export/Import feature handles persistence.

export function readData(filename: string): unknown[] {
  try {
    return JSON.parse(fs.readFileSync(`/tmp/sigint-${filename}`, "utf-8"));
  } catch {
    return [];
  }
}

export function writeData(filename: string, data: unknown[]): void {
  fs.writeFileSync(`/tmp/sigint-${filename}`, JSON.stringify(data, null, 2));
}
