"use client";

import { useState } from "react";
import { VideoData } from "@/components/VideoEntry";

interface URLImportProps {
  onImport: (video: VideoData) => void;
}

export default function URLImport({ onImport }: URLImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "partial" | "error">("idle");

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setStatus("idle");

    try {
      const res = await fetch("/api/fetch-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Fetch failed");

      const video: VideoData = {
        id: crypto.randomUUID(),
        url: data.url,
        caption: data.caption ?? "",
        hook: "",
        cta_used: data.cta_used ?? "",
        hashtags: data.hashtags ?? "",
        views: "",
        likes: "",
        comments: "",
        posting_time: "",
      };

      onImport(video);
      setUrl("");
      if (data.source === "url_only") setStatus("partial");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleFetch();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setStatus("idle"); }}
          onKeyDown={handleKeyDown}
          placeholder="https://www.instagram.com/reel/..."
          className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm rounded-lg px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          {loading ? "Fetching…" : "Fetch"}
        </button>
      </div>
      {status === "partial" && (
        <p className="text-xs text-yellow-500">
          Could not scrape metadata — URL added, fill details manually.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400">
          Fetch failed. Paste the URL and fill manually.
        </p>
      )}
    </div>
  );
}
