"use client";

import { useState } from "react";

interface HashtagStackProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
}

export default function HashtagStack({ hashtags, onChange }: HashtagStackProps) {
  const [inputValue, setInputValue] = useState("");

  function add() {
    const tag = inputValue.trim().startsWith("#")
      ? inputValue.trim()
      : `#${inputValue.trim()}`;
    if (!tag || tag === "#" || hashtags.includes(tag)) return;
    onChange([...hashtags, tag]);
    setInputValue("");
  }

  function remove(tag: string) {
    onChange(hashtags.filter((h) => h !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {hashtags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-indigo-900/60 text-indigo-200 border border-indigo-700 text-sm px-3 py-1 rounded-full"
          >
            {tag}
            <button
              onClick={() => remove(tag)}
              className="text-indigo-400 hover:text-red-400 transition-colors ml-1 leading-none"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {hashtags.length === 0 && (
          <span className="text-zinc-500 text-sm italic">No hashtags added</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="#yourhashtag"
          className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm rounded px-3 py-1.5 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={add}
          className="bg-indigo-700 hover:bg-indigo-600 text-white text-sm px-4 py-1.5 rounded transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
