"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Brand {
  id: string;
  name: string;
  niche: string;
}

export default function HomePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        const list: Brand[] = data.brands ?? [];
        setBrands(list);
        const saved =
          typeof window !== "undefined" ? localStorage.getItem("sigint_brand") : null;
        const initial = list.find((b) => b.id === saved)
          ? saved!
          : list[0]?.id ?? "";
        setSelectedBrandId(initial);
        if (initial) localStorage.setItem("sigint_brand", initial);
      })
      .catch(() => {});
  }, []);

  function handleBrandChange(id: string) {
    setSelectedBrandId(id);
    localStorage.setItem("sigint_brand", id);
  }

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <span className="text-xs font-mono tracking-[0.25em] text-zinc-500 uppercase">
          SIGINT
        </span>
        <Link
          href="/history"
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          History →
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-10">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Instagram Growth Intelligence
          </h1>
          <p className="text-sm text-zinc-500">
            Pick your mode. Pick your brand. Get signal.
          </p>
        </div>

        {/* Brand selector */}
        <div className="w-full max-w-xs space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">
            Brand
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-600"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {selectedBrand && (
            <p className="text-xs text-zinc-600 truncate">{selectedBrand.niche}</p>
          )}
        </div>

        {/* Mode cards */}
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/scout"
            className="group border border-zinc-800 hover:border-indigo-800 bg-zinc-950 hover:bg-indigo-950/20 rounded-2xl p-8 flex flex-col gap-5 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-xs font-mono tracking-[0.2em] text-indigo-400 uppercase">
                SCOUT
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-100">
                Find what&apos;s working
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Analyze trending content in your niche. Discover the patterns.
                Get a video brief.
              </p>
            </div>
            <span className="text-xs text-indigo-600 group-hover:text-indigo-400 transition-colors mt-auto">
              Enter SCOUT →
            </span>
          </Link>

          <Link
            href="/autopsy"
            className="group border border-zinc-800 hover:border-red-900 bg-zinc-950 hover:bg-red-950/20 rounded-2xl p-8 flex flex-col gap-5 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-xs font-mono tracking-[0.2em] text-red-400 uppercase">
                AUTOPSY
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-100">
                Find what&apos;s broken
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Drop in your Insights data. Get an honest diagnosis and specific
                fixes.
              </p>
            </div>
            <span className="text-xs text-red-700 group-hover:text-red-400 transition-colors mt-auto">
              Enter AUTOPSY →
            </span>
          </Link>

          <Link
            href="/script"
            className="group border border-zinc-800 hover:border-violet-800 bg-zinc-950 hover:bg-violet-950/20 rounded-2xl p-8 flex flex-col gap-5 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
              <span className="text-xs font-mono tracking-[0.2em] text-violet-400 uppercase">
                SCRIPT
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-100">
                Write your script
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Generate virality-optimized short-form video scripts with hook
                layering, psychological triggers, and platform-specific CTAs.
              </p>
            </div>
            <span className="text-xs text-violet-700 group-hover:text-violet-400 transition-colors mt-auto">
              Enter SCRIPT →
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
