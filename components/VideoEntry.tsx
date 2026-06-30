"use client";

import { useState } from "react";

export interface VideoData {
  id: string;
  url: string;
  caption: string;
  hook: string;
  cta_used: string;
  hashtags: string;
  views: string;
  likes: string;
  comments: string;
  posting_time: string;
}

interface VideoEntryProps {
  videos: VideoData[];
  onChange: (videos: VideoData[]) => void;
}

function emptyVideo(): VideoData {
  return {
    id: crypto.randomUUID(),
    url: "",
    caption: "",
    hook: "",
    cta_used: "",
    hashtags: "",
    views: "",
    likes: "",
    comments: "",
    posting_time: "",
  };
}

export default function VideoEntry({ videos, onChange }: VideoEntryProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function add() {
    const v = emptyVideo();
    onChange([...videos, v]);
    setExpanded(v.id);
  }

  function remove(id: string) {
    onChange(videos.filter((v) => v.id !== id));
    if (expanded === id) setExpanded(null);
  }

  function update(id: string, field: keyof VideoData, value: string) {
    onChange(videos.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  }

  const fieldClass =
    "w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm rounded px-3 py-1.5 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500";

  return (
    <div className="space-y-3">
      {videos.map((v, idx) => (
        <div key={v.id} className="border border-zinc-700 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-750 text-left"
            onClick={() => setExpanded(expanded === v.id ? null : v.id)}
          >
            <span className="text-sm text-zinc-300 font-medium">
              Video {idx + 1}
              {v.url && (
                <span className="text-zinc-500 ml-2 text-xs font-normal truncate max-w-xs inline-block align-middle">
                  {v.url}
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(v.id);
                }}
                className="text-zinc-500 hover:text-red-400 text-xs transition-colors"
              >
                Remove
              </button>
              <span className="text-zinc-500 text-xs">{expanded === v.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {expanded === v.id && (
            <div className="px-4 py-4 bg-zinc-900 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">URL</label>
                <input
                  className={fieldClass}
                  placeholder="https://www.instagram.com/reel/..."
                  value={v.url}
                  onChange={(e) => update(v.id, "url", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Hook (opening line / text)</label>
                <input
                  className={fieldClass}
                  placeholder="What's the first thing said or shown?"
                  value={v.hook}
                  onChange={(e) => update(v.id, "hook", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Caption</label>
                <textarea
                  className={`${fieldClass} resize-none`}
                  rows={2}
                  placeholder="Paste the full caption..."
                  value={v.caption}
                  onChange={(e) => update(v.id, "caption", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">CTA used</label>
                <input
                  className={fieldClass}
                  placeholder="e.g. Comment FREE, Link in bio"
                  value={v.cta_used}
                  onChange={(e) => update(v.id, "cta_used", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Hashtags</label>
                <input
                  className={fieldClass}
                  placeholder="#tag1 #tag2 #tag3"
                  value={v.hashtags}
                  onChange={(e) => update(v.id, "hashtags", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Views</label>
                <input
                  className={fieldClass}
                  type="number"
                  placeholder="0"
                  value={v.views}
                  onChange={(e) => update(v.id, "views", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Likes</label>
                <input
                  className={fieldClass}
                  type="number"
                  placeholder="0"
                  value={v.likes}
                  onChange={(e) => update(v.id, "likes", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Comments</label>
                <input
                  className={fieldClass}
                  type="number"
                  placeholder="0"
                  value={v.comments}
                  onChange={(e) => update(v.id, "comments", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Posting time</label>
                <input
                  className={fieldClass}
                  placeholder="e.g. Tuesday 7pm EST"
                  value={v.posting_time}
                  onChange={(e) => update(v.id, "posting_time", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={add}
        className="w-full border border-dashed border-zinc-600 hover:border-indigo-500 text-zinc-500 hover:text-indigo-400 text-sm py-3 rounded-lg transition-colors"
      >
        + Add video
      </button>
    </div>
  );
}
