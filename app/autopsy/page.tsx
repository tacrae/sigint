"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ChatBuddy from "@/components/ChatBuddy";

const BRAND_PROFILE =
  "Brand: NoFaceOs (@nofaceos). Target audience: adults 35+ starting over or starting late. Voice: mysterious, resolute, quietly rebellious, earned. No hustle or grind language. 20-second video cap. Every script needs a caption. Content pillars: late-starter reframe, tool breakdowns, income transparency, credit optimization, persistence philosophy.";

import AutopsyForm, {
  AutopsyVideoData,
  ScoutAnalysis,
  emptyVideoData,
} from "@/components/AutopsyForm";
import AutopsyResults from "@/components/AutopsyResults";

interface Brand {
  id: string;
  name: string;
  niche: string;
  voice: string;
  audience: string;
  content_format: string;
  cta_keyword: string;
  cta_platform: string;
  hashtag_stack: string[];
  optio_url: string;
}

interface AutopsyRecord {
  id: string;
  brand_id: string;
  timestamp: string;
  video_title: string;
  metrics: {
    saveRate: string;
    profileVisitRate: string;
    followConversion: string;
    engagementRate: string;
    hookRate: string;
  };
  result: {
    diagnosis: {
      overall_verdict: string;
      save_rate_analysis: string;
      profile_visit_analysis: string;
      follow_conversion_analysis: string;
      engagement_analysis: string;
      hook_analysis: string;
      caption_analysis: string;
      cta_analysis: string;
    };
    what_broke: string[];
    specific_fixes: { element: string; problem: string; fix: string }[];
    next_video_brief: {
      hook: string;
      caption_structure: string;
      cta: string;
      what_to_keep: string;
      what_to_cut: string;
    };
    virality_assessment?: {
      hook_strength?: { score: number; reasoning: string };
      retention_design?: { score: number; reasoning: string };
      shareability?: { score: number; reasoning: string; confidence_note?: string };
      save_worthiness?: { score: number; reasoning: string; confidence_note?: string };
      format_fit?: { score: number; reasoning: string };
      weakest_axis?: string;
      weakest_axis_fix?: string;
      weighted_total?: number;
      verdict?: "strong" | "workable" | "weak";
      hook_cap_triggered?: boolean;
    };
    structure_classification?: {
      hook_type?: "contrarian_claim" | "info_gap" | "direct_address" | "cold_open" | "generic_weak";
      inferred_duration?: string;
      beat_structure?: "short_form" | "mid_form" | "long_form" | "unclear";
      structural_weak_point?: string | null;
    };
  };
}

export default function AutopsyPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [videoData, setVideoData] = useState<AutopsyVideoData>(emptyVideoData());
  const [recentAnalyses, setRecentAnalyses] = useState<ScoutAnalysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autopsy, setAutopsy] = useState<AutopsyRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        const list: Brand[] = data.brands ?? [];
        setBrands(list);
        if (list.length > 0) {
          const saved =
            typeof window !== "undefined"
              ? localStorage.getItem("sigint_brand")
              : null;
          const initial = list.find((b) => b.id === saved)
            ? saved!
            : list[0].id;
          setSelectedBrandId(initial);
        }
      })
      .catch(() => {});

    fetch("/api/analyses")
      .then((r) => r.json())
      .then((data: ScoutAnalysis[]) => {
        setRecentAnalyses(data.slice(-5).reverse());
      })
      .catch(() => {});
  }, []);

  function handleBrandChange(id: string) {
    setSelectedBrandId(id);
    localStorage.setItem("sigint_brand", id);
    setAutopsy(null);
    setError(null);
  }

  async function handleRunAutopsy() {
    const brand = brands.find((b) => b.id === selectedBrandId);
    if (!brand) return;

    setLoading(true);
    setError(null);
    setAutopsy(null);

    const selectedAnalysis = selectedAnalysisId
      ? recentAnalyses.find((a) => a.id === selectedAnalysisId)?.result ?? null
      : null;

    const payload = {
      brand,
      video: {
        url: videoData.url || undefined,
        title: videoData.title,
        posted_date: videoData.posted_date,
        reach: videoData.reach ? parseInt(videoData.reach) : undefined,
        impressions: videoData.impressions ? parseInt(videoData.impressions) : undefined,
        views: videoData.views ? parseInt(videoData.views) : undefined,
        likes: videoData.likes ? parseInt(videoData.likes) : undefined,
        comments: videoData.comments ? parseInt(videoData.comments) : undefined,
        saves: videoData.saves ? parseInt(videoData.saves) : undefined,
        shares: videoData.shares ? parseInt(videoData.shares) : undefined,
        profile_visits: videoData.profile_visits ? parseInt(videoData.profile_visits) : undefined,
        follows: videoData.follows ? parseInt(videoData.follows) : undefined,
        hook: videoData.hook,
        caption: videoData.caption,
        cta: videoData.cta,
        what_i_was_trying_to_do: videoData.what_i_was_trying_to_do,
      },
      scout_context: selectedAnalysis,
    };

    try {
      const res = await fetch("/api/autopsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Autopsy failed");
      setAutopsy(data.autopsy as AutopsyRecord);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const hasEnoughData = !!(videoData.url.trim() || (videoData.views && parseInt(videoData.views) > 0));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Home
          </Link>
          <span className="text-zinc-800">|</span>
          <span className="text-xs font-mono text-red-400 tracking-widest uppercase">AUTOPSY</span>
        </div>
        <Link href="/history" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          History →
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Brand selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Brand
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm rounded px-3 py-2 focus:outline-none focus:border-red-500"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {selectedBrand && (
            <p className="text-xs text-zinc-500">{selectedBrand.niche}</p>
          )}
        </div>

        {/* Form */}
        <AutopsyForm
          data={videoData}
          onChange={setVideoData}
          recentAnalyses={recentAnalyses}
          selectedAnalysisId={selectedAnalysisId}
          onAnalysisToggle={setSelectedAnalysisId}
        />

        {/* Run button */}
        <button
          onClick={handleRunAutopsy}
          disabled={loading || !hasEnoughData}
          className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "Running autopsy…" : "Run Autopsy"}
        </button>

        {!hasEnoughData && (
          <p className="text-xs text-zinc-600 text-center -mt-4">
            Paste a Reel URL or enter at least views to enable the autopsy.
          </p>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Results */}
        {autopsy && (
          <div className="space-y-8 pt-2">
            <div className="border-t border-zinc-800" />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-100">
                {autopsy.video_title || "Autopsy Report"}
              </h2>
              <span className="text-xs text-zinc-500">
                {new Date(autopsy.timestamp).toLocaleDateString()}
              </span>
            </div>
            <AutopsyResults result={autopsy.result} metrics={autopsy.metrics} />

            {/* Analyst chat */}
            <ChatBuddy
              analysisContext={JSON.stringify(autopsy.result, null, 2)}
              mode="autopsy"
              brandProfile={BRAND_PROFILE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
