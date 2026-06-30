"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HashtagStack from "@/components/HashtagStack";
import VideoEntry, { VideoData } from "@/components/VideoEntry";
import ChatBuddy from "@/components/ChatBuddy";
import URLImport from "@/components/URLImport";

const BRAND_PROFILE =
  "Brand: NoFaceOs (@nofaceos). Target audience: adults 35+ starting over or starting late. Voice: mysterious, resolute, quietly rebellious, earned. No hustle or grind language. 20-second video cap. Every script needs a caption. Content pillars: late-starter reframe, tool breakdowns, income transparency, credit optimization, persistence philosophy.";

interface Brand {
  id: string;
  name: string;
  niche: string;
  hashtag_stack: string[];
  cta_keyword: string;
  optio_url: string;
}

interface AnalysisResult {
  patterns: {
    top_hooks: string[];
    top_caption_structures: string[];
    top_ctas: string[];
    best_posting_times: string[];
    cross_hashtag_winners: string[];
  };
  videos_scored: {
    url: string;
    conversion_score: number;
    why: string;
  }[];
  recommended_brief: {
    hook: string;
    visual_style: string;
    format: string;
    duration_seconds: number;
    caption_structure: string;
    cta: string;
    posting_time: string;
    why_this_works: string;
    optio_params: {
      style: string;
      format: string;
      duration: number;
      voiceover: boolean;
      lipsync: boolean;
      motion: string;
      aspect_ratio: string;
    };
  };
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
      ? "bg-yellow-500"
      : score >= 40
      ? "bg-orange-500"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-mono font-bold text-zinc-200 w-8 text-right">{score}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <p className="text-zinc-500 text-sm italic">None detected</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-zinc-300 flex gap-2">
          <span className="text-zinc-600">—</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function ScoutPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
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
          const initial = list.find((b) => b.id === saved) ? saved! : list[0].id;
          setSelectedBrandId(initial);
          const brand = list.find((b) => b.id === initial) ?? list[0];
          setHashtags([...brand.hashtag_stack]);
        }
      })
      .catch(() => {});
  }, []);

  function handleBrandChange(id: string) {
    setSelectedBrandId(id);
    localStorage.setItem("sigint_brand", id);
    const brand = brands.find((b) => b.id === id);
    if (brand) setHashtags([...brand.hashtag_stack]);
    setAnalysis(null);
    setError(null);
  }

  function handleOptioHandoff() {
    if (!selectedBrand || !analysis) return;
    const p = analysis.recommended_brief.optio_params;
    const params = new URLSearchParams({
      style: p.style,
      format: p.format,
      duration: String(p.duration),
      voiceover: String(p.voiceover),
      lipsync: String(p.lipsync),
      motion: p.motion,
      aspect_ratio: p.aspect_ratio,
    });
    window.open(`${selectedBrand.optio_url}?${params.toString()}`, "_blank");
  }

  async function handleAnalyze() {
    if (!selectedBrandId || videos.length === 0) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const payload = {
      brand_id: selectedBrandId,
      hashtags,
      videos: videos.map((v) => ({
        url: v.url,
        caption: v.caption,
        hook: v.hook,
        cta_used: v.cta_used,
        hashtags: v.hashtags
          .split(/\s+/)
          .map((h) => h.trim())
          .filter(Boolean),
        views: v.views ? parseInt(v.views) : undefined,
        likes: v.likes ? parseInt(v.likes) : undefined,
        comments: v.comments ? parseInt(v.comments) : undefined,
        posting_time: v.posting_time,
      })),
    };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis.result as AnalysisResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Home
          </Link>
          <span className="text-zinc-800">|</span>
          <span className="text-xs font-mono text-indigo-400 tracking-widest uppercase">SCOUT</span>
        </div>
        <Link href="/history" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          History →
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Brand selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Brand</label>
          <select
            value={selectedBrandId}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500"
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

        {/* Hashtag stack */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Hashtag Stack
          </label>
          <HashtagStack hashtags={hashtags} onChange={setHashtags} />
        </div>

        {/* Video entries */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Videos to analyze
          </label>
          <URLImport onImport={(v) => setVideos((prev) => [...prev, v])} />
          <VideoEntry videos={videos} onChange={setVideos} />
        </div>

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || videos.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "Analyzing…" : `Analyze ${videos.length > 0 ? `${videos.length} video${videos.length > 1 ? "s" : ""}` : "videos"}`}
        </button>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Results */}
        {analysis && (
          <div className="space-y-8 pt-2">
            <div className="border-t border-zinc-800" />

            {/* Patterns */}
            <div className="space-y-6">
              <h2 className="text-base font-bold text-zinc-100">Pattern Intelligence</h2>
              <div className="grid grid-cols-1 gap-6">
                <Section title="Top hooks">
                  <TagList items={analysis.patterns.top_hooks} />
                </Section>
                <Section title="Caption structures">
                  <TagList items={analysis.patterns.top_caption_structures} />
                </Section>
                <Section title="Winning CTAs">
                  <TagList items={analysis.patterns.top_ctas} />
                </Section>
                <Section title="Best posting times">
                  <TagList items={analysis.patterns.best_posting_times} />
                </Section>
                <Section title="Cross-hashtag winners">
                  <div className="flex flex-wrap gap-2">
                    {analysis.patterns.cross_hashtag_winners.length > 0 ? (
                      analysis.patterns.cross_hashtag_winners.map((tag, i) => (
                        <span key={i} className="bg-indigo-900/50 text-indigo-300 border border-indigo-700 text-xs px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-500 text-sm italic">None detected</span>
                    )}
                  </div>
                </Section>
              </div>
            </div>

            {/* Scored videos */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-100">Conversion Scores</h2>
              <div className="space-y-3">
                {analysis.videos_scored.map((v, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 truncate max-w-xs"
                      >
                        {v.url || `Video ${i + 1}`}
                      </a>
                    </div>
                    <ScoreBar score={v.conversion_score} />
                    <p className="text-xs text-zinc-400">{v.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended brief */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-bold text-zinc-100">Recommended Reel Brief</h2>
                <div className="flex gap-2">
                  <Link
                    href={`/script?hook=${encodeURIComponent(analysis.recommended_brief.hook)}&cta=${encodeURIComponent(analysis.recommended_brief.cta)}&format=${encodeURIComponent(analysis.recommended_brief.format)}&visual_style=${encodeURIComponent(analysis.recommended_brief.visual_style)}&duration=${analysis.recommended_brief.duration_seconds}&caption_structure=${encodeURIComponent(analysis.recommended_brief.caption_structure)}`}
                    className="inline-flex items-center gap-1.5 bg-violet-900/60 hover:bg-violet-800/60 border border-violet-700 text-violet-300 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Generate Script →
                  </Link>
                  <button
                    onClick={handleOptioHandoff}
                    className="inline-flex items-center gap-2 bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Optimize in Optio →
                  </button>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Hook</p>
                  <p className="text-zinc-100 font-medium">&ldquo;{analysis.recommended_brief.hook}&rdquo;</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Visual style</p>
                    <p className="text-sm text-zinc-300">{analysis.recommended_brief.visual_style}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Format</p>
                    <p className="text-sm text-zinc-300">{analysis.recommended_brief.format}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Duration</p>
                    <p className="text-sm text-zinc-300">{analysis.recommended_brief.duration_seconds}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Post at</p>
                    <p className="text-sm text-zinc-300">{analysis.recommended_brief.posting_time}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Caption structure</p>
                  <p className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                    {analysis.recommended_brief.caption_structure}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">CTA</p>
                  <p className="text-sm text-zinc-100 font-semibold">{analysis.recommended_brief.cta}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Why this works</p>
                  <p className="text-sm text-zinc-300">{analysis.recommended_brief.why_this_works}</p>
                </div>

                {/* Optio params */}
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-500 mb-3">Optio params</p>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(analysis.recommended_brief.optio_params).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-zinc-600 mb-0.5">{k}</p>
                        <p className="text-xs text-zinc-300 font-mono">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analyst chat */}
            <ChatBuddy
              analysisContext={JSON.stringify(analysis, null, 2)}
              mode="scout"
              brandProfile={BRAND_PROFILE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
