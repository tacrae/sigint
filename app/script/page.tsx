"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  HOOK_TYPES,
  HOOK_SCORING_RUBRIC,
  PSYCHOLOGICAL_TRIGGERS,
} from "@/lib/viral_knowledge";
import type { ScriptStyle } from "@/lib/script-generator";

// ─── Shared types ─────────────────────────────────────────────────────────────

interface Scene {
  second_range: string;
  text_on_screen: string;
  voiceover: string | null;
  visual_note: string;
}

interface LegacyScriptResult {
  title: string;
  specific_truth?: string;
  hook_type?: string;
  psychological_trigger?: string;
  predicted_hook_score?: number;
  predicted_hook_score_rationale?: string;
  estimated_duration_seconds: number;
  total_word_count: number;
  scenes: Scene[];
  full_script: string;
  caption: string;
  hashtags: string[];
  cta_moment: string;
  director_notes: string;
}

interface StructuredHook {
  verbal_hook: string;
  visual_hook: string;
  text_hook: string;
  audio_note: string;
}

interface StructuredBody {
  script_lines: string[];
  visual_directions: string[];
  pacing_notes: string;
}

interface StructuredCta {
  verbal_cta: string;
  visual_cta: string;
  trigger_word: string | null;
}

interface ChecklistItem {
  question: string;
  result: "PASS" | "FAIL" | "UNCLEAR";
}

interface StructuredMetadata {
  estimated_duration_seconds: number;
  hook_score: number;
  hook_score_label: string;
  triggers_used: string[];
  hook_types_layered: string[];
  checklist_results: Record<string, ChecklistItem[]>;
  five_dollar_test: boolean;
  full_script: string;
}

interface StructuredScriptResult {
  original_diagnosis?: {
    what_it_was_trying_to_do: string;
    hook_score_before: number;
    what_was_wrong: string[];
  };
  hook: StructuredHook;
  body: StructuredBody;
  cta: StructuredCta;
  metadata: StructuredMetadata;
}

interface PreflightItem {
  question: string;
  result: "PASS" | "FAIL" | "UNCLEAR";
  note: string;
}

interface PreflightResult {
  checklist: Record<string, PreflightItem[]>;
  scores: Record<string, { passed: number; total: number; pct: number }>;
  overall: { passed: number; total: number; pct: number };
  verdict: "GO" | "CONDITIONAL GO" | "NO-GO";
  verdict_reason: string;
  critical_failures: string[];
}

interface HookVariant {
  id: number;
  verbal_hook: string;
  visual_hook: string;
  text_hook: string;
  audio_note: string;
  hook_types_used: string[];
  triggers_used: string[];
  hook_score: number;
  rationale: string;
}

interface ScoutBrief {
  hook: string;
  cta: string;
  format: string;
  visual_style: string;
  duration_seconds: number;
  caption_structure: string;
  why_this_works: string;
}

interface ScoutSource {
  date: string;
  videoCount: number;
  analysisId: string;
}

// ─── Shared small components ──────────────────────────────────────────────────

function hookRubricLabel(score: number): string {
  if (score <= 3) return HOOK_SCORING_RUBRIC["1-3"];
  if (score <= 5) return HOOK_SCORING_RUBRIC["4-5"];
  if (score <= 7) return HOOK_SCORING_RUBRIC["6-7"];
  if (score <= 9) return HOOK_SCORING_RUBRIC["8-9"];
  return HOOK_SCORING_RUBRIC["10"];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={copy}
      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "text-green-400" : score >= 6 ? "text-yellow-400" : "text-red-400";
  return (
    <span className={`text-2xl font-bold ${color}`}>
      {score}
      <span className="text-sm font-normal text-zinc-600">/10</span>
    </span>
  );
}

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="bg-violet-900/40 text-violet-300 border border-violet-800 text-xs px-2 py-0.5 rounded-full capitalize">
      {label.replace(/_/g, " ")}
    </span>
  );
}

function TriggerBadge({ label }: { label: string }) {
  return (
    <span className="bg-indigo-900/40 text-indigo-300 border border-indigo-800 text-xs px-2 py-0.5 rounded-full capitalize">
      {label.replace(/_/g, " ")}
    </span>
  );
}

// ─── Scene card (legacy Write tab) ───────────────────────────────────────────

function SceneCard({ scene, index }: { scene: Scene; index: number }) {
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="bg-zinc-800/60 px-4 py-2 flex items-center gap-3">
        <span className="text-xs font-mono text-zinc-500">{scene.second_range}s</span>
        <span className="text-xs text-zinc-600">Scene {index + 1}</span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <div>
          <p className="text-xs text-zinc-600 mb-1 uppercase tracking-widest">Text on screen</p>
          <p className="text-zinc-100 font-semibold leading-snug whitespace-pre-wrap">
            {scene.text_on_screen}
          </p>
        </div>
        {scene.voiceover && (
          <div>
            <p className="text-xs text-zinc-600 mb-1 uppercase tracking-widest">Voiceover</p>
            <p className="text-sm text-zinc-300 italic">&ldquo;{scene.voiceover}&rdquo;</p>
          </div>
        )}
        <div>
          <p className="text-xs text-zinc-600 mb-1 uppercase tracking-widest">Visual</p>
          <p className="text-xs text-zinc-500">{scene.visual_note}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Structured script display (Generate + Rewrite tabs) ─────────────────────

function StructuredScriptDisplay({
  result,
  onUseHook,
}: {
  result: StructuredScriptResult;
  onUseHook?: (hook: string) => void;
}) {
  const { hook, body, cta, metadata } = result;
  const diag = result.original_diagnosis;

  return (
    <div className="space-y-8">
      {/* Original diagnosis (Rewrite only) */}
      {diag && (
        <div className="bg-red-950/30 border border-red-900/60 rounded-xl px-5 py-4 space-y-3">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-widest">
            Original Diagnosis
          </h3>
          <p className="text-sm text-zinc-400">
            <span className="text-zinc-300 font-medium">Intent: </span>
            {diag.what_it_was_trying_to_do}
          </p>
          <p className="text-sm text-zinc-400">
            <span className="text-zinc-300 font-medium">Hook score before: </span>
            {diag.hook_score_before}/10
          </p>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">What was wrong:</p>
            <ul className="space-y-1">
              {diag.what_was_wrong.map((w, i) => (
                <li key={i} className="text-xs text-red-300 flex gap-2">
                  <span className="text-red-700 shrink-0">✗</span> {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Score dashboard */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Hook Score</p>
          <ScoreBadge score={metadata.hook_score} />
          <p className="text-xs text-zinc-500 leading-snug">{metadata.hook_score_label}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1.5">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Hook Types</p>
          <div className="flex flex-wrap gap-1">
            {metadata.hook_types_layered.map((t) => (
              <TypeBadge key={t} label={t} />
            ))}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Duration</p>
          <p className="text-2xl font-bold text-violet-300">
            {metadata.estimated_duration_seconds}
            <span className="text-sm font-normal text-zinc-600">s</span>
          </p>
          <p className="text-xs text-zinc-500">
            {metadata.five_dollar_test ? "✓ $5 test passed" : "✗ $5 test failed"}
          </p>
        </div>
      </div>

      {/* Triggers */}
      {metadata.triggers_used.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Triggers activated</p>
          <div className="flex flex-wrap gap-1.5">
            {metadata.triggers_used.map((t) => (
              <TriggerBadge key={t} label={t} />
            ))}
          </div>
        </div>
      )}

      {/* Hook */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Hook</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-violet-900/60 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-violet-600 uppercase tracking-widest">Verbal</p>
            <p className="text-sm text-zinc-100 font-semibold leading-snug">{hook.verbal_hook}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Visual</p>
            <p className="text-sm text-zinc-300 leading-snug">{hook.visual_hook}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Text on screen</p>
            <p className="text-sm text-zinc-100 font-bold">{hook.text_hook}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Audio</p>
            <p className="text-sm text-zinc-400 italic">{hook.audio_note}</p>
          </div>
        </div>
        {onUseHook && (
          <button
            onClick={() => onUseHook(hook.verbal_hook)}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Use this hook in Write tab →
          </button>
        )}
      </div>

      {/* Body */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Body</h3>
        <div className="space-y-2">
          {body.script_lines.map((line, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
                <p className="text-sm text-zinc-200 leading-snug">{line}</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-2.5">
                <p className="text-xs text-zinc-500 leading-snug">
                  {body.visual_directions[i] ?? ""}
                </p>
              </div>
            </div>
          ))}
        </div>
        {body.pacing_notes && (
          <p className="text-xs text-zinc-500 italic px-1">{body.pacing_notes}</p>
        )}
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">CTA</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Say</p>
            <p className="text-sm text-zinc-100">{cta.verbal_cta}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">Show</p>
            <p className="text-sm text-zinc-300">{cta.visual_cta}</p>
          </div>
          {cta.trigger_word && (
            <div className="bg-zinc-900 border border-violet-900/60 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs text-violet-600 uppercase tracking-widest">DM Trigger</p>
              <p className="text-sm text-violet-300 font-bold">{cta.trigger_word}</p>
            </div>
          )}
        </div>
      </div>

      {/* Full script */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Full Script
          </h3>
          <CopyButton text={metadata.full_script} />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-mono">
            {metadata.full_script}
          </p>
        </div>
      </div>

      {/* Checklist */}
      {metadata.checklist_results && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Content Checklist
          </h3>
          <div className="space-y-2">
            {Object.entries(metadata.checklist_results).map(([cat, items]) => {
              const passed = items.filter((i) => i.result === "PASS").length;
              return (
                <div key={cat} className="border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800/60 px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-400 capitalize">
                      {cat.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {passed}/{items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-800/60">
                    {items.map((item, i) => (
                      <div key={i} className="px-4 py-2 flex items-start gap-3">
                        <span
                          className={`text-xs shrink-0 font-mono ${
                            item.result === "PASS"
                              ? "text-green-400"
                              : item.result === "FAIL"
                              ? "text-red-400"
                              : "text-zinc-600"
                          }`}
                        >
                          {item.result === "PASS" ? "✓" : item.result === "FAIL" ? "✗" : "?"}
                        </span>
                        <p className="text-xs text-zinc-400">{item.question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hook variant card ────────────────────────────────────────────────────────

function HookVariantCard({
  variant,
  onUse,
}: {
  variant: HookVariant;
  onUse: (v: HookVariant) => void;
}) {
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="bg-zinc-800/60 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-600">#{variant.id}</span>
          <ScoreBadge score={variant.hook_score} />
        </div>
        <button
          onClick={() => onUse(variant)}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          Use hook →
        </button>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-base font-bold text-zinc-100 leading-snug">
          &ldquo;{variant.verbal_hook}&rdquo;
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-zinc-600 mb-1 uppercase tracking-widest">Visual</p>
            <p className="text-xs text-zinc-400">{variant.visual_hook}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-600 mb-1 uppercase tracking-widest">Text overlay</p>
            <p className="text-xs text-zinc-300 font-semibold">{variant.text_hook}</p>
          </div>
        </div>
        {variant.audio_note && (
          <p className="text-xs text-zinc-500 italic">{variant.audio_note}</p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-800/60">
          {variant.hook_types_used.map((t) => (
            <TypeBadge key={t} label={t} />
          ))}
          {variant.triggers_used.map((t) => (
            <TriggerBadge key={t} label={t} />
          ))}
        </div>
        <p className="text-xs text-zinc-500 italic">{variant.rationale}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabMode = "write" | "hooks" | "rewrite" | "preflight";

const STYLES: { value: ScriptStyle; label: string }[] = [
  { value: "faceless_avatar", label: "Faceless Avatar" },
  { value: "talking_head", label: "Talking Head" },
  { value: "faceless_pointing", label: "Faceless Pointing" },
  { value: "clips_with_voiceover", label: "Clips + Voiceover" },
];

export default function ScriptPage() {
  const [mode, setMode] = useState<TabMode>("write");
  const [optioUrl, setOptioUrl] = useState("http://localhost:3003");

  // ── Write tab state ──
  const [hook, setHook] = useState("");
  const [cta, setCta] = useState("");
  const [format, setFormat] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [duration, setDuration] = useState("17");
  const [captionStructure, setCaptionStructure] = useState("");
  const [targetEmotion, setTargetEmotion] = useState("");
  const [sourceContext, setSourceContext] = useState("");
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeScript, setWriteScript] = useState<LegacyScriptResult | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [scoutSource, setScoutSource] = useState<ScoutSource | null>(null);
  const [scoutDismissed, setScoutDismissed] = useState(false);
  const writeResultsRef = useRef<HTMLDivElement>(null);

  // ── Hook Lab state ──
  const [hlTopic, setHlTopic] = useState("");
  const [hlNiche, setHlNiche] = useState("");
  const [hlLoading, setHlLoading] = useState(false);
  const [hlVariants, setHlVariants] = useState<HookVariant[]>([]);
  const [hlError, setHlError] = useState<string | null>(null);
  const hlResultsRef = useRef<HTMLDivElement>(null);

  // ── Preflight tab state ──
  const [pfScript, setPfScript] = useState("");
  const [pfNiche, setPfNiche] = useState("");
  const [pfLoading, setPfLoading] = useState(false);
  const [pfResult, setPfResult] = useState<PreflightResult | null>(null);
  const [pfError, setPfError] = useState<string | null>(null);
  const pfResultsRef = useRef<HTMLDivElement>(null);

  // ── Rewrite tab state ──
  const [rwScript, setRwScript] = useState("");
  const [rwNiche, setRwNiche] = useState("");
  const [rwStyle, setRwStyle] = useState<ScriptStyle>("faceless_avatar");
  const [rwLoading, setRwLoading] = useState(false);
  const [rwResult, setRwResult] = useState<StructuredScriptResult | null>(null);
  const [rwError, setRwError] = useState<string | null>(null);
  const rwResultsRef = useRef<HTMLDivElement>(null);

  // ── Scout pre-fill (Write tab) ──
  function applyBrief(brief: ScoutBrief) {
    if (brief.hook) setHook(brief.hook);
    if (brief.cta) setCta(brief.cta);
    if (brief.format) setFormat(brief.format);
    if (brief.visual_style) setVisualStyle(brief.visual_style);
    if (brief.duration_seconds) setDuration(String(brief.duration_seconds));
    if (brief.caption_structure) setCaptionStructure(brief.caption_structure);
    if (brief.why_this_works) setSourceContext(brief.why_this_works);
  }

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const hasParams = p.get("hook") || p.get("cta");
    if (hasParams) {
      if (p.get("hook")) setHook(decodeURIComponent(p.get("hook")!));
      if (p.get("cta")) setCta(decodeURIComponent(p.get("cta")!));
      if (p.get("format")) setFormat(decodeURIComponent(p.get("format")!));
      if (p.get("visual_style")) setVisualStyle(decodeURIComponent(p.get("visual_style")!));
      if (p.get("duration")) setDuration(p.get("duration")!);
      if (p.get("caption_structure"))
        setCaptionStructure(decodeURIComponent(p.get("caption_structure")!));
      if (p.get("context")) setSourceContext(decodeURIComponent(p.get("context")!));
    } else {
      fetch("/api/analyses")
        .then((r) => r.json())
        .then((data: unknown[]) => {
          if (!Array.isArray(data) || data.length === 0) return;
          const latest = data[data.length - 1] as {
            id: string;
            timestamp: string;
            video_count: number;
            result?: { recommended_brief?: ScoutBrief };
          };
          const brief = latest?.result?.recommended_brief;
          if (!brief?.hook) return;
          applyBrief(brief);
          setScoutSource({ date: latest.timestamp, videoCount: latest.video_count ?? 0, analysisId: latest.id });
        })
        .catch(() => {});
    }
  }, []);

  // Fetch optio_url from active brand
  useEffect(() => {
    const savedBrand = localStorage.getItem("sigint_brand");
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data: { brands?: Array<{ id: string; optio_url?: string }> }) => {
        const brands = data.brands ?? [];
        const brand = brands.find((b) => b.id === savedBrand) ?? brands[0];
        if (brand?.optio_url) setOptioUrl(brand.optio_url);
      })
      .catch(() => {});
  }, []);

  // ── Optio handoff ──
  function handleOptioHandoff(style: string, durationSeconds: number) {
    const STYLE_MAP: Record<string, string> = {
      faceless_avatar: "avatar",
      faceless_pointing: "avatar",
      talking_head: "realistic",
      clips_with_voiceover: "cinematic",
    };
    const LIP_SYNC_MAP: Record<string, boolean> = {
      talking_head: true,
    };
    const s = style?.toLowerCase().replace(/\s+/g, "_") ?? "";
    const optioStyle = STYLE_MAP[s] ?? (s.includes("avatar") || s.includes("faceless") ? "avatar" : "cinematic");
    const lipSync = LIP_SYNC_MAP[s] ?? false;
    const snapped = [15, 30, 60, 90, 120].reduce((prev, curr) =>
      Math.abs(curr - durationSeconds) < Math.abs(prev - durationSeconds) ? curr : prev
    );
    const params = new URLSearchParams({
      style: optioStyle,
      format: "short-form",
      duration: String(snapped),
      voiceover: "true",
      lipsync: String(lipSync),
      motion: lipSync ? "dynamic" : "subtle",
      aspect_ratio: "9:16",
    });
    window.open(`${optioUrl}?${params.toString()}`, "_blank");
  }

  // ── Write handler ──
  async function handleWrite() {
    if (!hook.trim() || !cta.trim()) return;
    setWriteLoading(true);
    setWriteError(null);
    setWriteScript(null);
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook, cta, format, visual_style: visualStyle,
          duration_seconds: parseInt(duration) || 17,
          caption_structure: captionStructure, target_emotion: targetEmotion,
          source_context: sourceContext, brand_id: "nofaceos",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Script generation failed");
      setWriteScript(data.script.result as LegacyScriptResult);
      setTimeout(() => writeResultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setWriteLoading(false);
    }
  }

  // ── Hook Lab handler ──
  async function handleHookLab() {
    if (!hlTopic.trim() || !hlNiche.trim()) return;
    setHlLoading(true);
    setHlError(null);
    setHlVariants([]);
    try {
      const res = await fetch("/api/script/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: hlTopic.trim(), niche: hlNiche.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hook generation failed");
      setHlVariants(data.variants ?? []);
      setTimeout(() => hlResultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: unknown) {
      setHlError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setHlLoading(false);
    }
  }

  function useHookInWrite(variant: HookVariant) {
    setHook(variant.verbal_hook);
    setMode("write");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Preflight handler ──
  async function handlePreflight() {
    if (!pfScript.trim()) return;
    setPfLoading(true);
    setPfError(null);
    setPfResult(null);
    try {
      const res = await fetch("/api/script/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script_text: pfScript.trim(), niche: pfNiche.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preflight check failed");
      setPfResult(data as PreflightResult);
      setTimeout(() => pfResultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: unknown) {
      setPfError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPfLoading(false);
    }
  }

  // ── Rewrite handler ──
  async function handleRewrite() {
    if (!rwScript.trim() || !rwNiche.trim()) return;
    setRwLoading(true);
    setRwError(null);
    setRwResult(null);
    try {
      const res = await fetch("/api/script/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_script: rwScript.trim(), niche: rwNiche.trim(), style: rwStyle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rewrite failed");
      setRwResult(data.script.result as StructuredScriptResult);
      setTimeout(() => rwResultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: unknown) {
      setRwError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRwLoading(false);
    }
  }

  const inputClass =
    "w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500";
  const labelClass = "block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest";

  const tabs: { id: TabMode; label: string }[] = [
    { id: "write", label: "Write" },
    { id: "hooks", label: "Hook Lab" },
    { id: "rewrite", label: "Rewrite" },
    { id: "preflight", label: "Preflight" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Home
          </Link>
          <span className="text-zinc-800">|</span>
          <span className="text-xs font-mono text-violet-400 tracking-widest uppercase">SCRIPT</span>
        </div>
        <Link href="/history" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          History →
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-lg font-bold">Script</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Generate virality-optimized short-form video scripts with hook layering, psychological triggers, and platform-specific CTAs.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`text-xs px-4 py-1.5 rounded-md transition-colors font-medium ${
                mode === t.id
                  ? "bg-violet-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── WRITE TAB ── */}
        {mode === "write" && (
          <>
            {scoutSource && !scoutDismissed && (
              <div className="flex items-center justify-between gap-3 bg-indigo-950/50 border border-indigo-800/60 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <p className="text-xs text-indigo-300 truncate">
                    Pre-filled from Scout ·{" "}
                    {new Date(scoutSource.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                    · {scoutSource.videoCount} posts
                  </p>
                </div>
                <button
                  onClick={() => setScoutDismissed(true)}
                  className="text-xs text-indigo-700 hover:text-indigo-400 transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Hook *</label>
                <input className={inputClass} placeholder="The exact opening line or text" value={hook} onChange={(e) => setHook(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>CTA keyword *</label>
                <input className={inputClass} placeholder="e.g. Comment NOFACE for the guide" value={cta} onChange={(e) => setCta(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Format</label>
                  <input className={inputClass} placeholder="single-message, list, tutorial…" value={format} onChange={(e) => setFormat(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Duration (seconds)</label>
                  <input className={inputClass} type="number" min={5} max={20} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Visual style</label>
                <input className={inputClass} placeholder="dark bg, white text overlay, slow drift…" value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Caption structure</label>
                <input className={inputClass} placeholder="hook → insight → CTA" value={captionStructure} onChange={(e) => setCaptionStructure(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Target emotion</label>
                <input className={inputClass} placeholder="e.g. quiet resolve — audience feels seen, not sold to" value={targetEmotion} onChange={(e) => setTargetEmotion(e.target.value)} />
              </div>
            </div>

            <button
              onClick={handleWrite}
              disabled={writeLoading || !hook.trim() || !cta.trim()}
              className="w-full bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {writeLoading ? "Writing script…" : "Generate Script"}
            </button>

            {writeError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{writeError}</div>
            )}

            {writeScript && (
              <div ref={writeResultsRef} className="space-y-8 pt-2">
                <div className="border-t border-zinc-800" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold">{writeScript.title}</h2>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-zinc-500">{writeScript.estimated_duration_seconds}s</span>
                      <span className="text-xs text-zinc-500">{writeScript.total_word_count} words</span>
                    </div>
                  </div>
                </div>

                {(writeScript.hook_type || writeScript.predicted_hook_score != null || writeScript.psychological_trigger) && (
                  <div className="grid grid-cols-3 gap-3">
                    {writeScript.hook_type && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
                        <p className="text-xs text-zinc-600 uppercase tracking-widest">Hook type</p>
                        <p className="text-sm font-semibold text-violet-300 capitalize">{writeScript.hook_type}</p>
                        <p className="text-xs text-zinc-500 leading-snug">{HOOK_TYPES[writeScript.hook_type] ?? ""}</p>
                      </div>
                    )}
                    {writeScript.predicted_hook_score != null && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
                        <p className="text-xs text-zinc-600 uppercase tracking-widest">Hook score</p>
                        <ScoreBadge score={writeScript.predicted_hook_score} />
                        <p className="text-xs text-zinc-500 leading-snug">{hookRubricLabel(writeScript.predicted_hook_score)}</p>
                        {writeScript.predicted_hook_score_rationale && (
                          <p className="text-xs text-zinc-600 italic pt-1 leading-snug">{writeScript.predicted_hook_score_rationale}</p>
                        )}
                      </div>
                    )}
                    {writeScript.psychological_trigger && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
                        <p className="text-xs text-zinc-600 uppercase tracking-widest">Trigger</p>
                        <p className="text-sm font-semibold text-violet-300 capitalize">{writeScript.psychological_trigger.replace(/_/g, " ")}</p>
                        <p className="text-xs text-zinc-500 leading-snug">{PSYCHOLOGICAL_TRIGGERS[writeScript.psychological_trigger]?.description ?? ""}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Scene Breakdown</h3>
                  {writeScript.scenes.map((scene, i) => <SceneCard key={i} scene={scene} index={i} />)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Full Script</h3>
                    <CopyButton text={writeScript.full_script} />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
                    <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-mono">{writeScript.full_script}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">CTA Moment</h3>
                  <p className="text-sm text-zinc-300">{writeScript.cta_moment}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Caption</h3>
                    <CopyButton text={`${writeScript.caption}\n\n${writeScript.hashtags.join(" ")}`} />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 space-y-3">
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{writeScript.caption}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-800">
                      {writeScript.hashtags.map((tag, i) => (
                        <span key={i} className="bg-indigo-900/40 text-indigo-300 border border-indigo-800 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Director Notes</h3>
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-5 py-4">
                    <p className="text-sm text-zinc-400 leading-relaxed">{writeScript.director_notes}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleOptioHandoff(visualStyle || "faceless_avatar", writeScript.estimated_duration_seconds)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
                >
                  Optimize production in Optio →
                </button>
              </div>
            )}
          </>
        )}

        {/* ── HOOK LAB TAB ── */}
        {mode === "hooks" && (
          <>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Topic *</label>
                <input className={inputClass} placeholder="e.g. Why you're still broke despite working hard" value={hlTopic} onChange={(e) => setHlTopic(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Niche *</label>
                <input className={inputClass} placeholder="e.g. money mindset, AI tools, self-improvement" value={hlNiche} onChange={(e) => setHlNiche(e.target.value)} />
              </div>
            </div>

            <button
              onClick={handleHookLab}
              disabled={hlLoading || !hlTopic.trim() || !hlNiche.trim()}
              className="w-full bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {hlLoading ? "Generating 10 hooks…" : "Generate Hook Variants"}
            </button>

            {hlError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{hlError}</div>
            )}

            {hlVariants.length > 0 && (
              <div ref={hlResultsRef} className="space-y-4 pt-2">
                <div className="border-t border-zinc-800" />
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">{hlVariants.length} Hook Variants</h2>
                  <p className="text-xs text-zinc-500">Click &ldquo;Use hook →&rdquo; to pre-fill Write tab</p>
                </div>
                {hlVariants.map((v) => (
                  <HookVariantCard key={v.id} variant={v} onUse={useHookInWrite} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── REWRITE TAB ── */}
        {mode === "rewrite" && (
          <>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Original Script *</label>
                <textarea
                  className={`${inputClass} min-h-[140px] resize-y`}
                  placeholder="Paste your existing script here…"
                  value={rwScript}
                  onChange={(e) => setRwScript(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Niche *</label>
                  <input className={inputClass} placeholder="e.g. AI tools, money mindset" value={rwNiche} onChange={(e) => setRwNiche(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Style</label>
                  <select
                    className={inputClass}
                    value={rwStyle}
                    onChange={(e) => setRwStyle(e.target.value as ScriptStyle)}
                  >
                    {STYLES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleRewrite}
              disabled={rwLoading || !rwScript.trim() || !rwNiche.trim()}
              className="w-full bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {rwLoading ? "Rewriting…" : "Rewrite Script"}
            </button>

            {rwError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{rwError}</div>
            )}

            {rwResult && (
              <div ref={rwResultsRef} className="pt-2 space-y-4">
                <div className="border-t border-zinc-800" />
                <StructuredScriptDisplay
                  result={rwResult}
                  onUseHook={(h) => { setHook(h); setMode("write"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                />
                <button
                  onClick={() => handleOptioHandoff(rwStyle, rwResult.metadata?.estimated_duration_seconds ?? 15)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
                >
                  Optimize production in Optio →
                </button>
              </div>
            )}
          </>
        )}

        {/* ── PREFLIGHT TAB ── */}
        {mode === "preflight" && (
          <>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Script *</label>
                <textarea
                  className={`${inputClass} min-h-[160px] resize-y`}
                  placeholder="Paste your script here — the exact words you plan to post…"
                  value={pfScript}
                  onChange={(e) => setPfScript(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Niche (optional)</label>
                <input
                  className={inputClass}
                  placeholder="e.g. AI tools, money mindset"
                  value={pfNiche}
                  onChange={(e) => setPfNiche(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handlePreflight}
              disabled={pfLoading || !pfScript.trim()}
              className="w-full bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {pfLoading ? "Running preflight…" : "Run Preflight Check"}
            </button>

            {pfError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
                {pfError}
              </div>
            )}

            {pfResult && (
              <div ref={pfResultsRef} className="space-y-6 pt-2">
                <div className="border-t border-zinc-800" />

                {/* Verdict banner */}
                <div
                  className={`rounded-xl px-5 py-4 border ${
                    pfResult.verdict === "GO"
                      ? "bg-green-950/40 border-green-800/60"
                      : pfResult.verdict === "NO-GO"
                      ? "bg-red-950/40 border-red-800/60"
                      : "bg-yellow-950/40 border-yellow-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-black tracking-widest ${
                        pfResult.verdict === "GO"
                          ? "text-green-400"
                          : pfResult.verdict === "NO-GO"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {pfResult.verdict}
                    </span>
                    <span className="text-sm text-zinc-400">{pfResult.verdict_reason}</span>
                  </div>
                </div>

                {/* Score dashboard */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 col-span-2">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">
                      Pre-Flight Score
                    </p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-violet-300">
                        {pfResult.overall.pct}
                        <span className="text-sm font-normal text-zinc-600">%</span>
                      </span>
                      <span className="text-sm text-zinc-500 mb-0.5">
                        {pfResult.overall.passed}/{pfResult.overall.total} checks passed
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pfResult.overall.pct >= 80
                            ? "bg-green-500"
                            : pfResult.overall.pct >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${pfResult.overall.pct}%` }}
                      />
                    </div>
                  </div>
                  {Object.entries(pfResult.scores).map(([cat, s]) => (
                    <div key={cat} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                      <p className="text-xs text-zinc-600 capitalize mb-1">
                        {cat.replace(/_/g, " ")}
                      </p>
                      <p className="text-lg font-bold text-zinc-300">
                        {s.pct}<span className="text-xs font-normal text-zinc-600">%</span>
                      </p>
                      <p className="text-xs text-zinc-600">{s.passed}/{s.total}</p>
                    </div>
                  ))}
                </div>

                {/* Critical failures */}
                {pfResult.critical_failures.length > 0 && (
                  <div className="bg-red-950/30 border border-red-900/60 rounded-xl px-5 py-4 space-y-2">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-widest">
                      Fix Before Posting
                    </p>
                    <ul className="space-y-1.5">
                      {pfResult.critical_failures.map((f, i) => (
                        <li key={i} className="flex gap-2 text-sm text-red-300">
                          <span className="text-red-700 shrink-0 mt-0.5">✗</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Per-category checklist */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                    Full Checklist
                  </h3>
                  {Object.entries(pfResult.checklist).map(([cat, items]) => (
                    <div key={cat} className="border border-zinc-800 rounded-xl overflow-hidden">
                      <div className="bg-zinc-800/60 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs text-zinc-400 capitalize">
                          {cat.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {pfResult.scores[cat]?.passed}/{pfResult.scores[cat]?.total}
                        </span>
                      </div>
                      <div className="divide-y divide-zinc-800/60">
                        {items.map((item, i) => (
                          <div key={i} className="px-4 py-2.5">
                            <div className="flex items-start gap-3">
                              <span
                                className={`text-xs shrink-0 font-mono mt-0.5 ${
                                  item.result === "PASS"
                                    ? "text-green-400"
                                    : item.result === "FAIL"
                                    ? "text-red-400"
                                    : "text-zinc-600"
                                }`}
                              >
                                {item.result === "PASS" ? "✓" : item.result === "FAIL" ? "✗" : "?"}
                              </span>
                              <div>
                                <p className="text-xs text-zinc-300">{item.question}</p>
                                {item.note && (
                                  <p className="text-xs text-zinc-600 italic mt-0.5">{item.note}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
