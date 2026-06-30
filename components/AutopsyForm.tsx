"use client";

import { useState } from "react";

export interface AutopsyVideoData {
  url: string;
  title: string;
  posted_date: string;
  reach: string;
  impressions: string;
  views: string;
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  profile_visits: string;
  follows: string;
  hook: string;
  caption: string;
  cta: string;
  what_i_was_trying_to_do: string;
}

export interface ScoutAnalysis {
  id: string;
  brand_id: string;
  timestamp: string;
  video_count: number;
  result: {
    patterns?: {
      top_hooks?: string[];
      top_ctas?: string[];
      cross_hashtag_winners?: string[];
    };
    recommended_brief?: {
      hook?: string;
    };
  };
}

interface AutopsyFormProps {
  data: AutopsyVideoData;
  onChange: (data: AutopsyVideoData) => void;
  recentAnalyses: ScoutAnalysis[];
  selectedAnalysisId: string | null;
  onAnalysisToggle: (id: string | null) => void;
}

export function emptyVideoData(): AutopsyVideoData {
  return {
    url: "",
    title: "",
    posted_date: "",
    reach: "",
    impressions: "",
    views: "",
    likes: "",
    comments: "",
    saves: "",
    shares: "",
    profile_visits: "",
    follows: "",
    hook: "",
    caption: "",
    cta: "",
    what_i_was_trying_to_do: "",
  };
}

const inputClass =
  "w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm rounded px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500";

const labelClass = "block text-xs text-zinc-400 mb-1";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function AutopsyForm({
  data,
  onChange,
  recentAnalyses,
  selectedAnalysisId,
  onAnalysisToggle,
}: AutopsyFormProps) {
  const [scoutOpen, setScoutOpen] = useState(false);

  function set(field: keyof AutopsyVideoData, value: string) {
    onChange({ ...data, [field]: value });
  }

  function handleScoutToggle(id: string) {
    if (selectedAnalysisId === id) {
      onAnalysisToggle(null);
    } else {
      onAnalysisToggle(id);
    }
  }

  return (
    <div className="space-y-8">
      {/* URL — run with just this if you want */}
      <Field label="Instagram Reel URL">
        <input
          className={inputClass}
          placeholder="https://instagram.com/reel/..."
          value={data.url}
          onChange={(e) => set("url", e.target.value)}
        />
        <p className="text-xs text-zinc-600 mt-1">Paste the link. Everything below is optional — add what you have.</p>
      </Field>

      {/* Video identity */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Video
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title / internal name" className="col-span-2">
            <input
              className={inputClass}
              placeholder="e.g. Late starter hook test #3"
              value={data.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field label="Posted date">
            <input
              className={inputClass}
              type="date"
              value={data.posted_date}
              onChange={(e) => set("posted_date", e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Instagram Insights */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Instagram Insights
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["views", "Views"],
              ["reach", "Reach"],
              ["impressions", "Impressions"],
              ["likes", "Likes"],
              ["comments", "Comments"],
              ["saves", "Saves"],
              ["shares", "Shares"],
              ["profile_visits", "Profile visits"],
              ["follows", "Follows"],
            ] as [keyof AutopsyVideoData, string][]
          ).map(([field, label]) => (
            <Field key={field} label={label}>
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="0"
                value={data[field]}
                onChange={(e) => set(field, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Content
        </h3>
        <Field label="Hook (opening line / first frame text)">
          <input
            className={inputClass}
            placeholder="What's the first thing said or shown in the video?"
            value={data.hook}
            onChange={(e) => set("hook", e.target.value)}
          />
        </Field>
        <Field label="Caption">
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Paste the full caption..."
            value={data.caption}
            onChange={(e) => set("caption", e.target.value)}
          />
        </Field>
        <Field label="CTA">
          <input
            className={inputClass}
            placeholder="e.g. Comment NOFACE for the free guide"
            value={data.cta}
            onChange={(e) => set("cta", e.target.value)}
          />
        </Field>
        <Field label="What were you trying to do with this video?">
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Describe your intent — what emotion, action, or awareness were you going for?"
            value={data.what_i_was_trying_to_do}
            onChange={(e) => set("what_i_was_trying_to_do", e.target.value)}
          />
        </Field>
      </div>

      {/* Scout context */}
      <div className="space-y-3">
        <button
          onClick={() => setScoutOpen((o) => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest hover:text-indigo-400 transition-colors"
        >
          <span
            className={`inline-block w-3.5 h-3.5 border rounded-sm text-center leading-none transition-colors ${
              scoutOpen ? "border-indigo-500 bg-indigo-500 text-white" : "border-zinc-600"
            }`}
          >
            {scoutOpen ? "✓" : ""}
          </span>
          Load Scout Context
        </button>

        {scoutOpen && (
          <div className="space-y-2 pl-5">
            {recentAnalyses.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">
                No SCOUT analyses found. Run a SCOUT session first.
              </p>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  Select a recent SCOUT analysis to compare this video against what&apos;s working in the niche.
                </p>
                {recentAnalyses.map((a) => {
                  const selected = selectedAnalysisId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleScoutToggle(a.id)}
                      className={`w-full text-left border rounded-lg px-4 py-3 text-sm transition-colors ${
                        selected
                          ? "border-indigo-500 bg-indigo-900/30 text-indigo-200"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium">
                            {a.video_count} video{a.video_count !== 1 ? "s" : ""} analyzed
                          </span>
                          <span className="text-zinc-500 ml-2 text-xs">
                            {new Date(a.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        {selected && (
                          <span className="text-xs text-indigo-400 font-semibold shrink-0">Selected</span>
                        )}
                      </div>
                      {a.result?.patterns?.top_hooks?.[0] && (
                        <p className="text-xs text-zinc-500 mt-1 truncate">
                          Top hook: &ldquo;{a.result.patterns.top_hooks[0]}&rdquo;
                        </p>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
