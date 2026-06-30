# ig-research — Build Prompt
*Give this entire document to Claude Code to build the tool from scratch.*

---

Build me an Instagram competitor research tool called ig-research.

It is a CLI pipeline that collects reels from competitor Instagram accounts, transcribes the audio, runs AI analysis to extract patterns and flag manipulation, and generates a dark-themed HTML report with a recommended content brief. It is built generically so any creator can use it by filling out one file.

---

## Project Structure

```
ig-research/
  scripts/
    import-db.js
    transcribe-top.py
    analyze.js
    report-html.js
  projects/
    <project-name>/
      config.json
      brand-profile.json
      raw-posts.json
      report-analysis.json
      report.html
      transcripts/
  package.json
```

`package.json` uses `"type": "module"`. No dependencies beyond what Node.js ships with. Python scripts use only stdlib plus `yt_dlp` and `whisper` (both pip-installable).

---

## File: `projects/<name>/config.json`

Project settings and competitor accounts.

```json
{
  "name": "My Research Project",
  "niche": "Your niche in one sentence",
  "competitors": [
    "https://www.instagram.com/competitorhandle/"
  ],
  "searchTerms": ["hashtag1", "hashtag2"]
}
```

---

## File: `projects/<name>/brand-profile.json`

The creator fills this out once. Everything downstream reads from it. Generate this as a template with the structure below — include the `_instructions` and `_note` fields so the creator knows what to write.

```json
{
  "_instructions": "Fill out every field honestly. The more specific you are, the better your content recommendations will be. Vague answers produce generic recommendations.",

  "creator": {
    "name": "YOUR BRAND NAME",
    "handle": "@yourhandle",
    "audience_age": "35-50",
    "audience_description": "Who they are. What they have been through. What they need that gurus have not given them.",
    "emotional_core": "The one feeling every reel should leave the viewer with."
  },

  "avatar": {
    "description": "Describe your character or on-screen persona in 2-3 sentences.",
    "aesthetic": "Describe the visual world — colors, set, lighting, mood, what is never in the frame.",
    "voice_tone": "How does the avatar speak? Calm? Urgent? Philosophical? Conversational?",
    "inspiration": "Any real person, character, or archetype this persona draws from."
  },

  "two_layers": {
    "_note": "Optional but powerful. Define the gap between your public persona and your private reality. Content that lives in that gap is the most human.",
    "the_persona": "What the avatar represents — the aspiration, the destination.",
    "the_builder": "Who you actually are behind it — what your real life looks like while you build this."
  },

  "creator_skills": [
    "List only things you can genuinely teach or demonstrate.",
    "Be specific. 'I use Claude daily for X' beats 'I know AI.'",
    "Add as many as apply."
  ],

  "honest_struggles": [
    "Things you are still figuring out.",
    "Do not recommend content that requires mastery of these.",
    "Being honest here makes your recommendations more accurate."
  ],

  "content_triggers": [
    "Real personal situations from your life that become content.",
    "Example: The late night iteration truth — prompts fail, credits get wasted, show it.",
    "The more specific to your actual experience, the better."
  ],

  "voice_rules": [
    "Rules for how you write and speak.",
    "Example: One thought per line. Short declarative sentences.",
    "Example: Second person. Speak to 'you.'"
  ],

  "forbidden_words": ["words", "you", "never", "use"],

  "forbidden_tactics": [
    "Tactics you refuse to use even if competitors use them.",
    "Example: Unverified income claims.",
    "Example: Trending audio with no real content underneath."
  ],

  "protected_phrases": [
    "Lines that are yours. Use exactly as written when they fit.",
    "Example: The engine is not broken. The fuel is missing."
  ],

  "approved_tools": {
    "_note": "Only reference these tools in scripts and briefs. Claude defaults to tools from its training data (old models, things you don't use). List what you actually use so recommendations stay accurate.",
    "video_generation": ["Tool you use to generate video"],
    "image_generation": ["Tool you use to generate images"],
    "ai_assistant": ["Tool you use for chat, ideation, scripting"],
    "voice": ["Tool you use for voiceover"],
    "editing": ["Tool you use to edit reels"],
    "avatar_design": ["Tool you use to design your avatar"],
    "publishing": ["Your link-in-bio or storefront tool"]
  },

  "cta_keyword": "YOURWORD",
  "cta_platform": "ManyChat or wherever your DM automation lives"
}
```

---

## Script: `import-db.js <path-to-sqlite.db> <project-name>`

Reads a SQLite database with a `reels` table (columns: platform, post_id, url, handle, source, caption, transcript, views, likes, comments, taken_at, audio, hashtags, collected_at). Uses a Python subprocess to query SQLite — no extra npm dependencies needed.

Converts rows to `raw-posts.json`:
```json
{
  "project": "string",
  "niche": "string",
  "scrapedAt": "ISO string",
  "posts": [
    {
      "postId": "numeric string from post_id column",
      "url": "string",
      "href": "path extracted from url",
      "type": "reel or image",
      "author": "handle",
      "likes": "formatted string e.g. 2M likes",
      "views": "formatted string e.g. 466.3K views",
      "comments": "string",
      "caption": "string",
      "transcript": "string or null",
      "date": "ISO string from taken_at"
    }
  ]
}
```

Format engagement numbers: 1000 → 1K, 1000000 → 1M, one decimal place, drop trailing .0.

`postId` must come from the `post_id` column directly — never parsed from the URL. This is critical: the transcript files are named by this ID and must match.

---

## Script: `transcribe-top.py <project-name> [top-n=15]`

Reads raw-posts.json. Sorts reels by engagement (parse K/M suffixes). For the top N posts without transcripts:

1. Download audio with yt-dlp:
```
python3 -m yt_dlp --format worstaudio --cookies-from-browser chrome --no-warnings --quiet -o <transcripts-dir>/<postId>.m4a <url>
```

2. Transcribe with Whisper:
```
python3 -m whisper <audio-file> --model tiny --language en --output_format txt --output_dir <transcripts-dir> --fp16 False --verbose False
```

3. Write transcript text back into raw-posts.json and save `.txt` alongside the audio.

**Whisper model download fix:** The tiny.pt model may fail to download in environments with proxy SSL interception. Download it manually using Python urllib with SSL verification disabled:
```python
import ssl, urllib.request, os
url = next(v for k,v in __import__('whisper')._MODELS.items() if k == 'tiny')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
path = os.path.expanduser('~/.cache/whisper/tiny.pt')
os.makedirs(os.path.dirname(path), exist_ok=True)
with urllib.request.urlopen(url, context=ctx) as r, open(path, 'wb') as f:
    while chunk := r.read(65536):
        f.write(chunk)
```
Get the correct URL at runtime from `whisper._MODELS['tiny']` — do not hardcode it.

---

## Script: `analyze.js <project-name> [top-n=15]`

Reads `raw-posts.json` and `brand-profile.json`. Calls the Anthropic API directly via Node.js `https` module (no SDK needed). Model: `claude-sonnet-4-6`, max_tokens: 8192. Requires `ANTHROPIC_API_KEY` env var.

**System prompt is built dynamically from brand-profile.json.** It must include:

**1. Who is speaking** — from `avatar`, `two_layers`, `creator.emotional_core`. If `two_layers` is filled out, describe both the persona layer and the builder layer and the content as the bridge between them.

**2. Manipulation filter — always present regardless of brand profile:**
Automatically penalize any post using these tactics. Never extract them as patterns to replicate:
- Fake social proof ("40M people asked for this", "everyone is doing this")
- Unverified income claims used as the primary hook
- Trending audio clips used as a hook with zero instructional content underneath
- Comment bait that promises a deliverable but provides no real substance
- "Secret" positioning with no actual secret — just recycled generic advice

**3. Creator skills** — from `creator_skills`. Recommended brief must be grounded in these only.

**4. Honest struggles** — from `honest_struggles`. Never recommend content requiring mastery of these.

**5. Content triggers** — from `content_triggers`. When a competitor pattern aligns with one, prioritize it in the recommended brief.

**6. Voice rules** — from `voice_rules`, `forbidden_words`, `forbidden_tactics`, `protected_phrases`.

**7. Approved tools** — from `approved_tools`. When scripts or briefs reference specific AI tools, only use tools listed here. Never default to tools from training data (DALL-E, Midjourney, Gemini, older model names). Add a hard rule to the system prompt: "Never reference a tool not on the approved list."

**7. The one-line brief check — always present:**
Before generating the recommended brief, identify: what specific true thing does this reel name that the viewer has been carrying alone? If the answer is vague, the brief is not ready. Specificity is the mechanism of connection. Vague inspiration creates passive viewers. Specific truth creates followers.

If `brand-profile.json` is missing or a field is empty, print a warning listing unfilled fields and use safe generic fallbacks so the tool still runs.

**User message** sends the top N posts: postId, author, engagement, first spoken line of transcript, caption (first 300 chars), transcript (first 600 chars).

**Output saved as `report-analysis.json`:**
```json
{
  "winningPatterns": [
    {
      "title": "short pattern name",
      "desc": "2-3 sentences on how it works and how to replicate it",
      "isManipulation": false,
      "manipulationNote": "string or null"
    }
  ],
  "hookPatterns": ["hook formula from genuine instructional content only"],
  "captionStructures": ["caption template"],
  "topCTAs": ["CTA phrase or format"],
  "posts": [
    {
      "postId": "must match raw-posts.json exactly",
      "conversionScore": 0,
      "scoreWhy": "1 sentence",
      "manipulationFlags": ["list any manipulation tactics detected"],
      "visualHook": "describe the likely visual in first 2 seconds",
      "spokenHook": "exact or paraphrased spoken hook",
      "whyItWorked": "2-3 sentences on specific reasons this post performed"
    }
  ],
  "recommendedBrief": {
    "specificTruth": "the one specific thing this reel names that the viewer has been carrying alone — must be concrete not a category of feeling",
    "contentTrigger": "which content trigger this aligns with or null",
    "hook": "exact hook text the creator can say truthfully from their real experience",
    "skillsUsed": ["which creator skills this draws on"],
    "visualStyle": "visual direction using the brand aesthetic",
    "format": "e.g. single message, talking points, problem/solution",
    "captionTemplate": "fill-in-the-blank caption formula",
    "cta": "exact CTA text using the brand cta_keyword",
    "postingTime": "recommended day and time",
    "whyThisWorks": "why this performs AND why this creator can execute it without fabricating anything"
  },
  "generatedAt": "ISO string",
  "model": "claude-sonnet-4-6"
}
```

**Scoring rubric for conversionScore:**
- Deduct 20-40 points for any manipulation tactic detected
- 80-100: Genuine instructional hook in first 2s, clear arc, explicit CTA, tight niche fit, no manipulation
- 60-79: Good hook, decent arc, soft CTA, partial niche fit
- 40-59: Average hook, no clear arc, or manipulation present
- 0-39: No hook, no arc, or heavily reliant on fake social proof

---

## Script: `report-html.js <project-name>`

Reads `raw-posts.json`, `report-analysis.json`, and `config.json`. Generates a single self-contained HTML file.

**Design:** Dark theme. Background `#0A0A0F`. Primary accent `#D4A843` (gold). Body text `#F5F0E8`. Font: Inter from Google Fonts.

**Sections:**

1. **Hero** — project name, niche, date, search terms used.

2. **Stats bar** — total posts, % reels, transcribed count, top engagement number.

3. **Top 6 posts by engagement** — for each post:
   - Author, rank, type badge
   - Engagement numbers
   - Conversion score bar (green ≥80, yellow ≥60, orange ≥40, red below) with score/100 and one-line explanation
   - Red warning chips for each manipulation flag (if any)
   - Spoken hook in large italic with gold left border
   - Full transcript in scrollable box
   - "Why it worked" in gold-tinted callout box
   - Caption preview

4. **Winning patterns grid** — 2-3 columns. Manipulation patterns rendered struck-through with red border, red "✕" number, and red warning note below. Clean patterns in normal gold styling.

5. **Hook formulas, Caption structures, Top CTAs** — three-column list below the patterns grid. Only shown if AI analysis is present.

6. **Recommended brief card** — gold-tinted border. Sections:
   - "Specific truth this reel names" — italic callout in gold-left-border box
   - Hook in large italic
   - "Your skills used" chips in gold
   - Format, Visual style, Caption template, CTA, Post time — label/value rows
   - "Why this works" explanation at bottom

7. **Footer.**

**postId resolution:** Use `post.postId` or `post.post_id` field directly. Fall back to URL regex only if both are absent. This must match the transcript `.txt` filenames.

Transcript files are loaded from `projects/<name>/transcripts/<postId>.txt`. If the file exists it overrides the transcript in raw-posts.json.

---

## Run Order

```bash
# 1. Collect data into SQLite using your own collector
#    (ScrapeCreators API or equivalent — not included in this tool)

# 2. Import
node scripts/import-db.js ~/path/to/data.db <project-name>

# 3. Transcribe top reels
python3 scripts/transcribe-top.py <project-name> 15

# 4. AI analysis
ANTHROPIC_API_KEY=your-key-here node scripts/analyze.js <project-name> 15

# 5. Generate report
node scripts/report-html.js <project-name>
open projects/<project-name>/report.html
```

To refresh after new data is collected: repeat steps 2-5. Transcription skips files that already exist.

---

## Notes

- The data collector (step 1) is not included. This tool expects a SQLite database with a `reels` table. Any collector that writes to that schema will work.
- `ANTHROPIC_API_KEY` must be set as an environment variable before running analyze.js.
- yt-dlp requires Chrome to be closed before running so it can read the cookie database.
- Whisper tiny model is ~72MB and downloads on first run. If it fails due to SSL, use the manual download script in the transcribe-top.py notes above.
- The tool works without a brand-profile.json but recommendations will be generic. Fill it out for accurate results.
