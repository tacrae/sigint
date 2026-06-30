/**
 * Viral content creation knowledge base. Constants only — no logic. Imported by scout, autopsy, and script modules.
 */

export const HOOK_TYPES: Record<string, string> = {
  verbal:
    "Spoken opening line that stops the scroll before the viewer consciously decides to watch. Uses power words (secrets, exposed, shocking, hidden, revealed), cliffhangers that open a loop before it can be closed, bold claims stated as fact, and direct second-person language that makes the viewer feel personally addressed.",
  visual:
    "First-frame visual that creates an involuntary pause. Includes dynamic movement or sudden motion in the opening frame, pattern interrupts (something unexpected in an expected context), strong facial expressions or eye contact directly into lens, deliberate hand gestures or pointing at text/results, and showing undeniable proof — screenshots, results, before/after — before saying a word.",
  text:
    "On-screen text that communicates the hook independent of audio, readable in under two seconds. Meme-style overlays with high-contrast typography, Twitter/X-style confessional text framing, bold captions that front-load the most provocative claim, and minimal word count so the viewer absorbs it before they can scroll.",
};

export const PSYCHOLOGICAL_TRIGGERS: Record<
  string,
  { description: string; detection_signals: string[] }
> = {
  curiosity_gap: {
    description:
      "Zeigarnik Effect — the brain cannot rest with an open loop. Content that withholds the resolution forces continued watching. Creates a felt need to know the answer before moving on.",
    detection_signals: [
      "Open questions never answered in the hook",
      'Phrases like "nobody talks about this" or "they don\'t want you to know"',
      "Setup without immediate payoff",
      "Numbered lists started but not finished in the opening",
    ],
  },
  mirror_neurons: {
    description:
      "Content that activates the viewer's own emotional memory through relatable specificity. When they see themselves in the story, they stop being a viewer and become a participant.",
    detection_signals: [
      '"I was just like you" framing',
      "Specific before-state that names the exact situation the audience is in",
      "Confessional tone without performance",
      "Emotional vulnerability that does not collapse into weakness",
    ],
  },
  emotional_triggers: {
    description:
      "Content engineered to produce a measurable felt response — not generic inspiration but a specific emotion the viewer then needs to share or act on to discharge.",
    detection_signals: [
      "Shock or surprise at a counterintuitive claim",
      "Fear of missing a window or being left behind",
      "Anger at a system, norm, or assumption",
      "Joy or awe at an unexpected result or reveal",
    ],
  },
  status_signaling: {
    description:
      "Content people share not for the content's sake but because sharing it signals something about the sharer — that they are smart, informed, contrarian, or funny. The share is the status move.",
    detection_signals: [
      "Counterintuitive truths that make the sharer look plugged-in",
      "Information that is valuable enough to send to a specific person",
      "Humor that only a certain tribe will fully understand",
      "Data or insight the audience wants credit for surfacing",
    ],
  },
  cognitive_ease: {
    description:
      "The brain defaults to content it can process without friction. Simplicity, clarity, and structure reduce resistance and increase completion rate.",
    detection_signals: [
      "Plain language with no jargon",
      "1-2-3 step breakdowns with visual anchors",
      "One idea per scene, not layered complexity",
      "Short sentences that parse instantly",
    ],
  },
  pattern_interrupt: {
    description:
      "The brain is a prediction machine. Content that violates a visual or audio expectation forces attention back to the screen at the moment of interruption.",
    detection_signals: [
      "Sudden cut to a completely different scene or framing",
      "Unexpected sound effect or music change at a key moment",
      "Visual element appearing where none was expected",
      "Tone shift mid-video from calm to urgent or vice versa",
    ],
  },
  social_proof: {
    description:
      "Signals that others have already validated this content, this creator, or this claim. Reduces the viewer's risk of engagement.",
    detection_signals: [
      "High view counts visible in the video or caption",
      "Comment volume suggesting community response",
      "Authority signals — credentials, track record, or third-party validation",
      "Stacked testimonials or results shown as screenshots",
    ],
  },
};

export const VIRALITY_FACTORS: Record<string, string> = {
  hook:
    "The first 1-3 seconds determine whether the viewer stays. The hook must trigger an involuntary emotional reaction before the conscious mind decides to scroll. Scroll-stopping is not about being loud — it is about being specific enough to feel personal.",
  retention:
    "Average view duration is the metric that determines algorithmic distribution. Retention is built through pacing (no dead seconds), continuous value delivery that keeps the promise made in the hook, narrative tension maintained through storytelling, and editing rhythm that anticipates boredom and cuts before it arrives.",
  shareability:
    "Content gets shared when it serves the sharer's social goal — to look smart, to help a specific person, to signal identity, or to express something the sharer could not articulate alone. Shareable content is relatable enough to recognize, valuable enough to send, novel enough to be worth surfacing, and identity-affirming enough that sharing it says something the sharer wants said about them.",
};

export const REVENUE_FORMULAS: Record<string, number> = {
  followers_to_views_multiplier: 100,
  views_to_bio_clicks: 0.001,
  views_to_comments: 0.01,
  comments_to_dm_clicks: 0.5,
  story_view_rate: 0.05,
  story_click_rate: 0.2,
  purchase_conversion_rate: 0.03,
  stories_per_month_default: 15,
};

export const CONTENT_CHECKLIST: Record<string, string[]> = {
  hook_power: [
    "Does hook grab attention and stop scroll?",
    "Does hook convince viewer to watch the rest?",
    "Does opening line trigger emotional reaction?",
    "Is hook specific, clear, and impossible to ignore?",
  ],
  value_quality: [
    "Would someone pay $5+ for this info?",
    "Is there at least one clear actionable takeaway?",
  ],
  visual_audio: [
    "Are visuals high-quality and style-appropriate?",
    "Is audio professional with no distracting noise?",
    "Is sound used strategically to emphasize key moments?",
  ],
  structure_pacing: [
    "Does video maintain engagement throughout?",
    "Is there logical flow from hook to value to CTA?",
    "Is it concise while delivering complete value?",
  ],
  marketing_conversion: [
    "Does CTA match the value provided?",
    "Is branding consistent and professional?",
    "Is content optimized for the specific platform?",
  ],
};

export const HOOK_SCORING_RUBRIC: Record<string, string> = {
  "1-3": "Weak — generic, no emotional trigger, easily scrollable",
  "4-5": "Average — has a claim but lacks specificity or emotional charge",
  "6-7": "Strong — clear curiosity gap, one hook type layered well",
  "8-9": "Viral-ready — two or three hook types layered, strong emotional trigger",
  "10":
    "Elite — all three hook types layered, impossible to scroll past, triggers immediate identity resonance",
};

export const PLATFORM_BEHAVIOR: Record<
  string,
  { algo_rewards: string[]; cta_style: string }
> = {
  instagram: {
    algo_rewards: [
      "high average view duration",
      "engagement (comments, shares, saves)",
    ],
    cta_style: "link in bio + DM automation",
  },
  tiktok: {
    algo_rewards: [
      "always pushes to new audiences",
      "completion rate",
      "shares",
    ],
    cta_style: "comment trigger + bio link",
  },
};
