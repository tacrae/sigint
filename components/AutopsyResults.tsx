"use client";

import Link from "next/link";

interface Fix {
  element: string;
  problem: string;
  fix: string;
}

interface AutopsyData {
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
  specific_fixes: Fix[];
  next_video_brief: {
    hook: string;
    caption_structure: string;
    cta: string;
    what_to_keep: string;
    what_to_cut: string;
  };
}

interface ComputedMetrics {
  saveRate: string;
  profileVisitRate: string;
  followConversion: string;
  engagementRate: string;
  hookRate: string;
}

interface AutopsyResultsProps {
  result: AutopsyData;
  metrics: ComputedMetrics;
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-zinc-800 pb-4">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-zinc-300">{value}</p>
    </div>
  );
}

function MetricPill({
  label,
  value,
  thresholds,
}: {
  label: string;
  value: string;
  thresholds: { warn: number; ok: number };
}) {
  const num = parseFloat(value);
  const color = isNaN(num)
    ? "text-zinc-400 border-zinc-700"
    : num >= thresholds.ok
    ? "text-emerald-400 border-emerald-700 bg-emerald-900/20"
    : num >= thresholds.warn
    ? "text-yellow-400 border-yellow-700 bg-yellow-900/20"
    : "text-red-400 border-red-700 bg-red-900/20";

  return (
    <div className={`border rounded-lg px-3 py-2 ${color}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className="text-lg font-mono font-bold">{value === "N/A" ? "—" : `${value}%`}</p>
    </div>
  );
}

export default function AutopsyResults({ result, metrics }: AutopsyResultsProps) {
  const { diagnosis, what_broke, specific_fixes, next_video_brief } = result;

  return (
    <div className="space-y-8">
      {/* Overall verdict */}
      <div className="bg-red-950/40 border border-red-800 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2">Verdict</p>
        <p className="text-base text-zinc-100 leading-relaxed">{diagnosis.overall_verdict}</p>
      </div>

      {/* Computed metrics */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Rates</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <MetricPill label="Save rate" value={metrics.saveRate} thresholds={{ warn: 1, ok: 3 }} />
          <MetricPill label="Profile visit" value={metrics.profileVisitRate} thresholds={{ warn: 1, ok: 3 }} />
          <MetricPill label="Follow conv." value={metrics.followConversion} thresholds={{ warn: 10, ok: 20 }} />
          <MetricPill label="Engagement" value={metrics.engagementRate} thresholds={{ warn: 3, ok: 5 }} />
          <MetricPill label="Hook rate" value={metrics.hookRate} thresholds={{ warn: 50, ok: 70 }} />
        </div>
      </div>

      {/* Diagnosis breakdown */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Diagnosis</h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 space-y-4">
          <DiagRow label="Hook" value={diagnosis.hook_analysis} />
          <DiagRow label="Engagement" value={diagnosis.engagement_analysis} />
          <DiagRow label="Save rate" value={diagnosis.save_rate_analysis} />
          <DiagRow label="Profile visits" value={diagnosis.profile_visit_analysis} />
          <DiagRow label="Follow conversion" value={diagnosis.follow_conversion_analysis} />
          <DiagRow label="Caption" value={diagnosis.caption_analysis} />
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">CTA</p>
            <p className="text-sm text-zinc-300">{diagnosis.cta_analysis}</p>
          </div>
        </div>
      </div>

      {/* What broke */}
      {what_broke.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">What broke</h3>
          <div className="space-y-2">
            {what_broke.map((item, i) => (
              <div
                key={i}
                className="flex gap-3 items-start bg-red-950/30 border border-red-900 rounded-lg px-4 py-3"
              >
                <span className="text-red-500 text-sm font-bold mt-0.5 shrink-0">✕</span>
                <p className="text-sm text-red-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specific fixes */}
      {specific_fixes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Specific fixes</h3>
          <div className="space-y-3">
            {specific_fixes.map((fix, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="bg-zinc-800 px-4 py-2">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
                    {fix.element}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex gap-2">
                    <span className="text-red-400 text-xs font-bold uppercase tracking-wide shrink-0 mt-0.5">
                      Problem
                    </span>
                    <p className="text-sm text-zinc-300">{fix.problem}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-wide shrink-0 mt-0.5">
                      Fix
                    </span>
                    <p className="text-sm text-zinc-200">{fix.fix}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next video brief */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Next video brief</h3>
          <Link
            href={`/script?hook=${encodeURIComponent(next_video_brief.hook)}&cta=${encodeURIComponent(next_video_brief.cta)}&caption_structure=${encodeURIComponent(next_video_brief.caption_structure)}`}
            className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
          >
            Write Script →
          </Link>
        </div>
        <div className="bg-zinc-900 border border-indigo-800 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Hook</p>
            <p className="text-zinc-100 font-medium">&ldquo;{next_video_brief.hook}&rdquo;</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Caption structure</p>
            <p className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
              {next_video_brief.caption_structure}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">CTA</p>
            <p className="text-sm text-zinc-100 font-semibold">{next_video_brief.cta}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-3">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">
                Keep
              </p>
              <p className="text-sm text-zinc-300">{next_video_brief.what_to_keep}</p>
            </div>
            <div className="bg-red-950/40 border border-red-900 rounded-lg px-3 py-3">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">
                Cut
              </p>
              <p className="text-sm text-zinc-300">{next_video_brief.what_to_cut}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
