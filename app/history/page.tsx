"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AnalysisRecord {
  id: string;
  brand_id: string;
  timestamp: string;
  video_count: number;
  hashtags_used: string[];
  result: {
    patterns?: {
      top_hooks?: string[];
      cross_hashtag_winners?: string[];
    };
    recommended_brief?: {
      hook?: string;
      why_this_works?: string;
    };
  };
}

interface AutopsyRecord {
  id: string;
  brand_id: string;
  timestamp: string;
  video_title: string;
  metrics: Record<string, string>;
  result: {
    diagnosis?: {
      overall_verdict?: string;
    };
    what_broke?: string[];
  };
}

const METRIC_DEFS = [
  { key: "hookRate", label: "Hook Rate", higherBetter: true },
  { key: "engagementRate", label: "Engagement", higherBetter: true },
  { key: "saveRate", label: "Save Rate", higherBetter: true },
  { key: "profileVisitRate", label: "Profile Visit", higherBetter: true },
  { key: "followConversion", label: "Follow Conv.", higherBetter: true },
] as const;

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-zinc-600 text-sm">
      No {label} yet.
    </div>
  );
}

function ExpandToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
    >
      {open ? "Collapse ▲" : "Expand ▼"}
    </button>
  );
}

function deltaColor(delta: number, higherBetter: boolean) {
  if (Math.abs(delta) < 0.05) return "text-zinc-500";
  return (higherBetter ? delta > 0 : delta < 0) ? "text-emerald-400" : "text-red-400";
}

function ComparisonPanel({
  a,
  b,
  onClear,
}: {
  a: AutopsyRecord;
  b: AutopsyRecord;
  onClear: () => void;
}) {
  return (
    <div className="border border-amber-800 rounded-xl overflow-hidden bg-zinc-950">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
          Comparison
        </span>
        <button
          onClick={onClear}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Clear ✕
        </button>
      </div>

      {/* Video titles */}
      <div className="grid grid-cols-[1fr_28px_1fr] items-center gap-2 px-5 py-4 border-b border-zinc-800">
        <div>
          <p className="text-xs text-zinc-600 mb-0.5">
            {new Date(a.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-sm text-zinc-200 font-medium leading-snug">
            {a.video_title || "Untitled"}
          </p>
        </div>
        <span className="text-zinc-700 text-xs text-center">vs</span>
        <div className="text-right">
          <p className="text-xs text-zinc-600 mb-0.5">
            {new Date(b.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-sm text-zinc-200 font-medium leading-snug">
            {b.video_title || "Untitled"}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-5 py-4 space-y-2.5">
        {METRIC_DEFS.map(({ key, label, higherBetter }) => {
          const rawA = a.metrics[key];
          const rawB = b.metrics[key];
          const numA = parseFloat(rawA);
          const numB = parseFloat(rawB);
          const hasValues = !isNaN(numA) && !isNaN(numB);
          const delta = hasValues ? numB - numA : null;
          const dColor = delta !== null ? deltaColor(delta, higherBetter) : "text-zinc-600";

          return (
            <div
              key={key}
              className="grid grid-cols-[1fr_84px_1fr] items-center gap-2"
            >
              <span className="text-sm font-mono text-zinc-200">
                {isNaN(numA) ? "—" : `${numA}%`}
              </span>
              <div className="text-center">
                <p className="text-xs text-zinc-600 leading-none mb-0.5">{label}</p>
                {delta !== null ? (
                  <p className={`text-xs font-mono font-semibold ${dColor}`}>
                    {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                    {Math.abs(delta).toFixed(2)}%
                  </p>
                ) : (
                  <p className="text-xs text-zinc-700">N/A</p>
                )}
              </div>
              <span className="text-sm font-mono text-zinc-200 text-right">
                {isNaN(numB) ? "—" : `${numB}%`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Verdicts */}
      {(a.result?.diagnosis?.overall_verdict ||
        b.result?.diagnosis?.overall_verdict) && (
        <div className="border-t border-zinc-800 grid grid-cols-2 divide-x divide-zinc-800">
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              Verdict A
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {a.result?.diagnosis?.overall_verdict ?? "—"}
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              Verdict B
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {b.result?.diagnosis?.overall_verdict ?? "—"}
            </p>
          </div>
        </div>
      )}

      {/* What broke */}
      {((a.result?.what_broke?.length ?? 0) > 0 ||
        (b.result?.what_broke?.length ?? 0) > 0) && (
        <div className="border-t border-zinc-800 grid grid-cols-2 divide-x divide-zinc-800">
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              What broke A
            </p>
            <ul className="space-y-1">
              {(a.result?.what_broke ?? []).map((item, i) => (
                <li key={i} className="text-xs text-red-400 flex gap-1.5">
                  <span className="text-red-700 shrink-0">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              What broke B
            </p>
            <ul className="space-y-1">
              {(b.result?.what_broke ?? []).map((item, i) => (
                <li key={i} className="text-xs text-red-400 flex gap-1.5">
                  <span className="text-red-700 shrink-0">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({
  record,
  onDelete,
}: {
  record: AnalysisRecord;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">
              {record.brand_id}
            </span>
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-xs text-zinc-500">
              {new Date(record.timestamp).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-xs text-zinc-500">
              {record.video_count} video{record.video_count !== 1 ? "s" : ""}
            </span>
          </div>
          {record.result?.recommended_brief?.hook && (
            <p className="text-sm text-zinc-300 truncate">
              &ldquo;{record.result.recommended_brief.hook}&rdquo;
            </p>
          )}
          {record.result?.recommended_brief?.why_this_works && (
            <p className="text-xs text-zinc-500 line-clamp-2">
              {record.result.recommended_brief.why_this_works}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ExpandToggle open={open} onClick={() => setOpen((o) => !o)} />
          <button
            onClick={onDelete}
            className="text-xs text-zinc-700 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-4 space-y-4">
          {record.result?.patterns?.top_hooks &&
            record.result.patterns.top_hooks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                  Top hooks
                </p>
                <ul className="space-y-1">
                  {record.result.patterns.top_hooks.map((h, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2">
                      <span className="text-zinc-600">—</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {record.result?.patterns?.cross_hashtag_winners &&
            record.result.patterns.cross_hashtag_winners.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                  Hashtag winners
                </p>
                <div className="flex flex-wrap gap-2">
                  {record.result.patterns.cross_hashtag_winners.map((tag, i) => (
                    <span
                      key={i}
                      className="bg-indigo-900/40 text-indigo-300 border border-indigo-800 text-xs px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          {record.hashtags_used?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                Stack used
              </p>
              <p className="text-xs text-zinc-500">{record.hashtags_used.join(" ")}</p>
            </div>
          )}
          {record.result?.recommended_brief?.why_this_works && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                Why it works
              </p>
              <p className="text-sm text-zinc-400">
                {record.result.recommended_brief.why_this_works}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AutopsyCard({
  record,
  onDelete,
  selected,
  onToggleSelect,
  compareDisabled,
}: {
  record: AutopsyRecord;
  onDelete: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  compareDisabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-colors ${
        selected ? "border-amber-700" : "border-zinc-800"
      }`}
    >
      <div className="px-5 py-4 flex items-start gap-3">
        {/* Compare toggle */}
        <button
          onClick={onToggleSelect}
          disabled={compareDisabled && !selected}
          title={selected ? "Remove from comparison" : "Compare"}
          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
            selected
              ? "border-amber-500 bg-amber-500/30 text-amber-300"
              : compareDisabled
              ? "border-zinc-700 opacity-30 cursor-not-allowed"
              : "border-zinc-700 hover:border-amber-600"
          }`}
        >
          {selected && <span className="text-[9px] font-bold">✓</span>}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-red-400 uppercase tracking-wider">
              {record.brand_id}
            </span>
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-xs text-zinc-500">
              {new Date(record.timestamp).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <p className="text-sm text-zinc-300 font-medium">
            {record.video_title || "Untitled"}
          </p>
          {record.result?.diagnosis?.overall_verdict && (
            <p className="text-xs text-zinc-500 line-clamp-2">
              {record.result.diagnosis.overall_verdict}
            </p>
          )}
          <div className="flex gap-3 pt-0.5">
            {record.metrics.hookRate && (
              <span className="text-xs text-zinc-600">Hook {record.metrics.hookRate}%</span>
            )}
            {record.metrics.engagementRate && (
              <span className="text-xs text-zinc-600">Eng {record.metrics.engagementRate}%</span>
            )}
            {record.metrics.saveRate && (
              <span className="text-xs text-zinc-600">Save {record.metrics.saveRate}%</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ExpandToggle open={open} onClick={() => setOpen((o) => !o)} />
          <button
            onClick={onDelete}
            className="text-xs text-zinc-700 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-4 space-y-4">
          {record.result?.diagnosis?.overall_verdict && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                Verdict
              </p>
              <p className="text-sm text-zinc-300">
                {record.result.diagnosis.overall_verdict}
              </p>
            </div>
          )}
          {record.result?.what_broke && record.result.what_broke.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                What broke
              </p>
              <ul className="space-y-1">
                {record.result.what_broke.map((item, i) => (
                  <li key={i} className="text-sm text-red-300 flex gap-2">
                    <span className="text-red-600 shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AggregateHookType {
  key: string;
  label: string;
  count: number;
  top_performer_count: number;
  top_performer_pct: number;
  avg_virality: number;
  posts: string[];
}

interface AggregateBeatStructure {
  key: string;
  label: string;
  duration_range: string;
  count: number;
  top_performer_count: number;
  top_performer_pct: number;
  avg_virality: number;
}

interface AggregateTopPost {
  id: string;
  title: string;
  handle: string | null;
  virality_score: number | null;
  verdict: string | null;
  hook_type: string | null;
  beat_structure: string | null;
  structural_weak_point: string | null;
  timestamp: string;
}

interface AggregateData {
  total_posts: number;
  top_performer_count: number;
  top_performer_threshold: number | null;
  hook_types: AggregateHookType[];
  beat_structures: AggregateBeatStructure[];
  top_posts: AggregateTopPost[];
  message?: string;
}

type Tab = "scout" | "autopsy" | "aggregate";

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("scout");
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [autopsies, setAutopsies] = useState<AutopsyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [aggregateData, setAggregateData] = useState<AggregateData | null>(null);
  const [aggregateLoading, setAggregateLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/analyses").then((r) => r.json()),
      fetch("/api/autopsies").then((r) => r.json()),
    ])
      .then(([a, b]) => {
        setAnalyses([...a].reverse());
        setAutopsies([...b].reverse());
      })
      .finally(() => setLoading(false));
  }, []);

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    setSelectedForCompare([]);
    if (newTab === "aggregate" && !aggregateData && !aggregateLoading) {
      setAggregateLoading(true);
      fetch("/api/autopsy/aggregate")
        .then((r) => r.json())
        .then((d: AggregateData) => setAggregateData(d))
        .catch(() => {})
        .finally(() => setAggregateLoading(false));
    }
  }

  function toggleCompare(id: string) {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  async function deleteAnalysis(id: string) {
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/analyses?id=${id}`, { method: "DELETE" });
  }

  async function deleteAutopsy(id: string) {
    setAutopsies((prev) => prev.filter((a) => a.id !== id));
    setSelectedForCompare((prev) => prev.filter((x) => x !== id));
    await fetch(`/api/autopsies?id=${id}`, { method: "DELETE" });
  }

  function handleExport() {
    const payload = {
      exported_at: new Date().toISOString(),
      analyses: [...analyses].reverse(),
      autopsies: [...autopsies].reverse(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigint-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("loading");

    try {
      const text = await file.text();
      const data = JSON.parse(text) as {
        analyses?: AnalysisRecord[];
        autopsies?: AutopsyRecord[];
      };

      await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyses: data.analyses ?? [],
          autopsies: data.autopsies ?? [],
        }),
      });

      setAnalyses([...(data.analyses ?? [])].reverse());
      setAutopsies([...(data.autopsies ?? [])].reverse());
      setImportStatus("done");
      setTimeout(() => setImportStatus("idle"), 2500);
    } catch {
      setImportStatus("error");
      setTimeout(() => setImportStatus("idle"), 2500);
    }

    e.target.value = "";
  }

  const compareA = autopsies.find((a) => a.id === selectedForCompare[0]);
  const compareB = autopsies.find((a) => a.id === selectedForCompare[1]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          ← Home
        </Link>
        <span className="text-zinc-800">|</span>
        <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
          History
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Export / Import bar */}
        <div className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-zinc-300">Local backup</p>
            <p className="text-xs text-zinc-600">
              Export saves a JSON file to your machine. Import restores a previous export.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label
              className={`cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                importStatus === "done"
                  ? "bg-emerald-900/40 border-emerald-700 text-emerald-300"
                  : importStatus === "error"
                  ? "bg-red-900/40 border-red-700 text-red-300"
                  : importStatus === "loading"
                  ? "opacity-50 border-zinc-700 text-zinc-500"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {importStatus === "done"
                ? "Imported ✓"
                : importStatus === "error"
                ? "Error"
                : importStatus === "loading"
                ? "Importing…"
                : "Import"}
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
                disabled={importStatus === "loading"}
              />
            </label>
            <button
              onClick={handleExport}
              disabled={analyses.length === 0 && autopsies.length === 0}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          {(["scout", "autopsy", "aggregate"] as Tab[]).map((t) => {
            const active = tab === t;
            const activeColor =
              t === "scout" ? "border-indigo-500 text-indigo-300"
              : t === "autopsy" ? "border-red-500 text-red-300"
              : "border-violet-500 text-violet-300";
            const label =
              t === "scout" ? "Scout" : t === "autopsy" ? "Autopsies" : "Aggregate";
            const count =
              t === "scout" ? analyses.length
              : t === "autopsy" ? autopsies.length
              : null;
            return (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  active ? activeColor : "border-transparent text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {label}
                {count !== null && (
                  <span className="ml-2 text-xs opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16 text-zinc-600 text-sm">Loading…</div>
        ) : tab === "scout" ? (
          <div className="space-y-3">
            {analyses.length === 0 ? (
              <EmptyState label="Scout analyses" />
            ) : (
              analyses.map((a) => (
                <AnalysisCard
                  key={a.id}
                  record={a}
                  onDelete={() => deleteAnalysis(a.id)}
                />
              ))
            )}
          </div>
        ) : tab === "autopsy" ? (
          <div className="space-y-3">
            {autopsies.length === 0 ? (
              <EmptyState label="Autopsies" />
            ) : (
              <>
                {autopsies.length >= 2 && selectedForCompare.length < 2 && (
                  <p className="text-xs text-zinc-600">
                    {selectedForCompare.length === 1
                      ? "Select 1 more autopsy to compare."
                      : "Select 2 autopsies to compare side by side."}
                  </p>
                )}
                {compareA && compareB && (
                  <ComparisonPanel
                    a={compareA}
                    b={compareB}
                    onClear={() => setSelectedForCompare([])}
                  />
                )}
                {autopsies.map((a) => (
                  <AutopsyCard
                    key={a.id}
                    record={a}
                    onDelete={() => deleteAutopsy(a.id)}
                    selected={selectedForCompare.includes(a.id)}
                    onToggleSelect={() => toggleCompare(a.id)}
                    compareDisabled={
                      selectedForCompare.length >= 2 &&
                      !selectedForCompare.includes(a.id)
                    }
                  />
                ))}
              </>
            )}
          </div>
        ) : (
          /* Aggregate tab */
          aggregateLoading ? (
            <div className="text-center py-16 text-zinc-600 text-sm">Computing…</div>
          ) : !aggregateData || aggregateData.total_posts === 0 ? (
            <EmptyState label="autopsy data to aggregate (run at least one autopsy first)" />
          ) : (
            <div className="space-y-8">
              {/* Summary line */}
              <p className="text-xs text-zinc-500">
                {aggregateData.total_posts} posts · top {aggregateData.top_performer_count} by virality score
                {aggregateData.top_performer_threshold !== null && (
                  <span className="text-zinc-700"> (threshold {aggregateData.top_performer_threshold}/10)</span>
                )}
              </p>

              {/* Hook types */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Hook types</h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                  {aggregateData.hook_types.map((h) => {
                    const hitPct = h.count > 0 ? h.top_performer_count / h.count : 0;
                    const barColor =
                      hitPct === 1 ? "bg-emerald-500"
                      : hitPct >= 0.5 ? "bg-yellow-500"
                      : hitPct > 0 ? "bg-orange-500"
                      : "bg-zinc-700";
                    return (
                      <div key={h.key} className="px-5 py-4 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-zinc-200">{h.label}</span>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-500">
                            <span>{h.top_performer_count}/{h.count} top</span>
                            <span className="text-zinc-700">·</span>
                            <span>avg {h.avg_virality}/10</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${hitPct * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-600">
                          {Math.round(hitPct * 100)}% of posts using this hook type reached top performers
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Beat structures */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Beat structures</h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                  {aggregateData.beat_structures.map((b) => {
                    const hitPct = b.count > 0 ? b.top_performer_count / b.count : 0;
                    const barColor =
                      hitPct === 1 ? "bg-emerald-500"
                      : hitPct >= 0.5 ? "bg-yellow-500"
                      : hitPct > 0 ? "bg-orange-500"
                      : "bg-zinc-700";
                    return (
                      <div key={b.key} className="px-5 py-4 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <span className="text-sm text-zinc-200">{b.label}</span>
                            <span className="ml-2 text-xs text-zinc-600">[{b.duration_range}]</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-500">
                            <span>{b.top_performer_count}/{b.count} top</span>
                            <span className="text-zinc-700">·</span>
                            <span>avg {b.avg_virality}/10</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${hitPct * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top posts */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Top posts</h3>
                <div className="space-y-2">
                  {aggregateData.top_posts.map((p, i) => (
                    <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-zinc-600 font-mono shrink-0">#{i + 1}</span>
                          <p className="text-sm text-zinc-200 font-medium truncate">{p.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.virality_score !== null && (
                            <span className={`text-xs font-mono font-bold ${
                              p.virality_score >= 8 ? "text-emerald-400"
                              : p.virality_score >= 6 ? "text-yellow-400"
                              : "text-red-400"
                            }`}>
                              {p.virality_score}/10
                            </span>
                          )}
                          {p.verdict && (
                            <span className={`text-xs uppercase tracking-wide font-semibold ${
                              p.verdict === "strong" ? "text-emerald-500"
                              : p.verdict === "workable" ? "text-yellow-500"
                              : "text-red-500"
                            }`}>
                              {p.verdict}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.hook_type && (
                          <span className="text-xs text-violet-400 border border-violet-800 bg-violet-900/20 rounded px-2 py-0.5">
                            {p.hook_type.replace(/_/g, " ")}
                          </span>
                        )}
                        {p.beat_structure && (
                          <span className="text-xs text-zinc-500 border border-zinc-800 rounded px-2 py-0.5">
                            {p.beat_structure.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      {p.structural_weak_point && (
                        <p className="text-xs text-orange-500 border-l-2 border-orange-800 pl-2 leading-relaxed">
                          {p.structural_weak_point}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
