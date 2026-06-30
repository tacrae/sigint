"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatBuddyProps {
  analysisContext: string;
  mode: "scout" | "autopsy";
  brandProfile: string;
}

const SILENT_OPENING =
  "Give me one specific, immediately actionable tip from this analysis. No greeting. Lead with the tip.";

const MAX_DISPLAY = 40; // 20 exchanges

export default function ChatBuddy({
  analysisContext,
  mode,
  brandProfile,
}: ChatBuddyProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the messages array to send to the API.
  // Always prepend the silent opening prompt so the array starts with a user turn.
  function buildApiMessages(displayMsgs: Message[]): Message[] {
    let msgs = [...displayMsgs];
    if (msgs.length > MAX_DISPLAY) msgs = msgs.slice(2);
    return [{ role: "user", content: SILENT_OPENING }, ...msgs];
  }

  async function callChat(displayMsgs: Message[]): Promise<string> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: buildApiMessages(displayMsgs),
        analysisContext,
        mode,
        brandProfile,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Chat failed");
    return data.text as string;
  }

  // Fetch opening tip on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callChat([])
      .then((text) => {
        if (!cancelled) setMessages([{ role: "assistant", content: text }]);
      })
      .catch(() => {
        if (!cancelled)
          setMessages([
            {
              role: "assistant",
              content: "Failed to load opening tip. Ask me anything about the analysis.",
            },
          ]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const reply = await callChat(next);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 flex flex-col" style={{ background: "#111111" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <span className="text-xs font-mono tracking-[0.2em] text-zinc-500 uppercase">
          Analyst
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        <span className="text-xs text-zinc-600 capitalize">{mode}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-96">
        {messages.length === 0 && loading && (
          <div className="flex items-center gap-2">
            <ThinkingDots />
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap rounded-xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-zinc-800 text-zinc-100 rounded-br-sm"
                  : "text-zinc-300 bg-zinc-900 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {messages.length > 0 && loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 rounded-xl rounded-bl-sm px-4 py-2.5">
              <ThinkingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask about the analysis…"
          className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
