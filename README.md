# SIGINT — Instagram Growth Intelligence

SIGINT is a Next.js 14 web app that gives Instagram creators intelligence-level insight into competitor content, their own post performance, and viral script generation. Three core analysis modes, each powered by Claude.

---

## Modes

### SCOUT
Analyze 1–5 competitor Instagram Reels by URL. Returns per-video hook scores, psychological triggers detected, virality pillar assessments, and estimated monthly revenue. Input follower count and product price per competitor to unlock the revenue ranking table.

**API:** `POST /api/analyze`

```json
{
  "videos": [
    {
      "url": "https://instagram.com/reel/...",
      "transcript": "...",
      "handle": "@competitor",
      "follower_count": 80000,
      "product_price": 97
    }
  ]
}
```

---

### AUTOPSY
Deep post-mortem for a single Reel that underperformed. Returns five diagnostic sections:
1. **Hook Diagnosis** — hook score (1–10), types present/missing, rewrite if score < 7
2. **Trigger Scan** — all 7 psychological triggers with evidence
3. **Virality Assessment** — hook / retention / shareability pillar scores
4. **Pre-Flight Checklist** — 15 pass/fail questions across 5 content categories
5. **Platform Fit** — mismatches and optimizations for Instagram vs TikTok

Server-side `computeDashboard()` adds trigger density, viral potential score, and preflight % — no math is delegated to Claude.

**API:** `POST /api/autopsy`

```json
{
  "url": "https://instagram.com/reel/...",
  "transcript": "...",
  "handle": "@yourhandle",
  "platform": "instagram"
}
```

---

### SCRIPT
Generate virality-optimized short-form video scripts. Four tabs:

| Tab | Endpoint | What it does |
|-----|----------|--------------|
| Write | `POST /api/script` | NoFaceOs-style scene-by-scene script from URL/topic |
| Hook Lab | `POST /api/script/hooks` | 10 hook variants for any topic/niche |
| Rewrite | `POST /api/script/rewrite` | Diagnose and rewrite an existing script |
| Preflight | `POST /api/script/preflight` | GO / CONDITIONAL GO / NO-GO verdict on any script |

**Generate endpoint:**

```json
{
  "topic": "why most people never build wealth",
  "niche": "money mindset",
  "style": "faceless_avatar",
  "product_cta": "My $97 course",
  "target_duration": 15,
  "platform": "instagram"
}
```

Valid `style` values: `faceless_avatar`, `talking_head`, `faceless_pointing`, `clips_with_voiceover`

---

## Viral Knowledge Base

`lib/viral_knowledge.ts` is the single source of truth for all scoring frameworks. It exports 7 typed constant groups:

| Export | Purpose |
|--------|---------|
| `HOOK_TYPES` | Named hook patterns with descriptions |
| `PSYCHOLOGICAL_TRIGGERS` | 7 triggers with detection signals |
| `VIRALITY_FACTORS` | Hook / retention / shareability pillar definitions |
| `REVENUE_FORMULAS` | Multipliers for the revenue estimation model |
| `CONTENT_CHECKLIST` | 5 categories × 15 questions |
| `HOOK_SCORING_RUBRIC` | 1–10 scale with labels (Weak → Elite) |
| `PLATFORM_BEHAVIOR` | Instagram and TikTok algo rules + CTA style |

All API routes and the Script page import from this file. It has no external dependencies and is safe to import in both server routes and `"use client"` components.

---

## Revenue Model

`lib/revenue.ts` exposes:
- `estimate_competitor_revenue(follower_count, product_price, platform?, stories_per_month?, has_dm_automation?)`
- `rank_competitors(competitors[])` — sorts by estimated revenue descending

**Formula (default: 100k followers, $19 product, DM automation on):**
```
views         = 100k × 100            = 10,000,000
bio clicks    = 10M × 0.001           = 10,000
DM clicks     = 10M × 0.01 × 0.5     = 50,000
story clicks  = 100k × 0.05 × 0.2 × 15 = 15,000
total clicks  = 75,000
revenue       = 75k × 0.03 × $19     = $42,750/mo
```

---

## Local Development

```bash
# Install dependencies
npm install

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Start dev server on port 3001
npm run dev

# Run unit tests (requires npm install first)
npm test
```

---

## Tests

Unit tests live in `__tests__/lib.test.ts` and cover:
- Revenue estimation math (8 assertions against the formula)
- `rank_competitors` sort order
- `HOOK_SCORING_RUBRIC` coverage and labels
- `CONTENT_CHECKLIST` structure (5 categories, 15 questions)
- `PSYCHOLOGICAL_TRIGGERS` shape (7 triggers with detection signals)
- `PLATFORM_BEHAVIOR` shape
- `buildGenerateScriptUserMessage` / `buildHookVariantsUserMessage` / `buildRewriteUserMessage` output

```bash
npm test
```

---

## Project Structure

```
app/
  page.tsx                  # Home with mode cards
  api/
    analyze/route.ts        # SCOUT
    autopsy/route.ts        # AUTOPSY
    script/
      route.ts              # SCRIPT (NoFaceOs scene format)
      generate/route.ts     # SCRIPT → Write tab
      hooks/route.ts        # SCRIPT → Hook Lab tab
      rewrite/route.ts      # SCRIPT → Rewrite tab
      preflight/route.ts    # SCRIPT → Preflight tab
  scout/page.tsx
  autopsy/page.tsx
  script/page.tsx           # Four-tab UI

lib/
  viral_knowledge.ts        # All scoring constants
  revenue.ts                # Revenue estimation functions
  script-generator.ts       # Script prompt builders
  data.ts                   # Brands / saved records

__tests__/
  lib.test.ts               # Vitest unit tests

vitest.config.ts
```
