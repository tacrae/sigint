# SIGINT Brand Brief — NoFaceOs

This file is read by SIGINT at runtime and injected into every prompt sent to Claude (SCRIPT) and Perplexity (research + fact-check). It is also used by the Kling wrapper to build every video generation call.

Update this file to change behavior across the entire pipeline — no code changes needed.

---

## Identity

- **Brand:** NoFaceOs
- **Niche:** [YOUR NICHE — e.g., "faceless content creation + digital income"]
- **Voice:** Direct, confident, no fluff. Speaks like someone who figured it out and is showing you exactly how. Not hype, not guru — just real.
- **Target audience:** [YOUR AUDIENCE — e.g., "people who want to earn online without showing their face"]
- **Platform:** Instagram Reels (primary), TikTok (secondary)

---

## Avatar

- **Type:** Masked figure — static mask, no lip sync, no facial movement
- **Mask description:** [DESCRIBE YOUR MASK — e.g., "matte black sculptural mask, slightly reflective, no eye holes visible, minimal design"]
- **Build/silhouette:** [e.g., "medium build, always in dark clothing — hoodie or fitted jacket"]
- **Hands:** Visible in most shots — used for gestures, pointing, holding items
- **Voice:** No voiceover attached to the avatar. Text overlays or separate VO track only.

### Reference Images
Stored in `/public/assets/avatar/`. Add as many angles as possible.

| File | Description |
|------|-------------|
| `avatar-ref-01.png` | Front facing, medium shot |
| `avatar-ref-02.png` | Slight left angle |
| `avatar-ref-03.png` | Slight right angle |
| `avatar-ref-04.png` | Full body / wide |
| `avatar-ref-05.png` | Close-up, chest-up |

**Primary reference** (used when only one is passed to Kling): `avatar-ref-01.png`

---

## Environments

Stored in `/public/assets/environments/`. Each environment anchors the visual vibe for a scene.

| File | Description | Use when |
|------|-------------|----------|
| `dark-room.png` | Dark interior, moody, neon or blue accents | Educational, mystery, "secret" content |
| `office-night.png` | Desk setup, screens glowing, night | Tech, income, productivity content |
| `outdoor-urban.png` | City street at night, cinematic | Mindset, movement, aspirational content |
| `minimal-white.png` | Clean white/grey studio | Clean explainer, product, list-style content |

---

## Camera Angles

SCRIPT assigns one of these per scene. Kling uses the label to build the shot description.

| Label | Description |
|-------|-------------|
| `wide` | Full body visible, environment fills frame |
| `medium` | Waist up, mask centered |
| `close` | Chest and mask only, tight crop |
| `over-shoulder` | Camera behind/beside avatar, looking at screen or object |
| `hands-focus` | Hands in frame, avatar slightly out of focus in background |
| `environmental` | Avatar small in frame, environment dominant |
| `pov` | First-person perspective — viewer is looking through avatar's eyes |

---

## Negative Prompts (Injected into Every Kling Call)

```
lip sync, open mouth, talking, facial animation, mouth movement,
mask warping, mask morphing, face deformation, skin texture,
eyes blinking, eyebrows moving, teeth, tongue,
static camera only, zoom only, no camera movement,
blurry avatar, multiple people, crowd, duplicate figure,
watermark, text overlay, subtitles, logo, HUD
```

---

## Content Hard Rules (Injected into Every Claude + Perplexity Prompt)

- Never make specific income claims with exact dollar amounts unless citing a verified external source
- Never name specific competitors or other creators
- Never use countdown urgency language ("limited time", "only X spots left", "ending soon")
- Never recommend illegal or grey-area methods
- All trend claims must reference content or data published within the last 90 days
- Scripts must end with exactly one CTA — not two
- The avatar does not speak. Scripts are for text overlay or separate VO, not dialogue synced to avatar mouth

---

## Script Defaults (Used When Not Overridden per Request)

```
platform:         instagram
style:            faceless_avatar
target_duration:  15
tone:             direct, confident, no fluff
cta_type:         dm_automation
hook_score_min:   7
```

---

## Perplexity Fact-Check Standard

When Perplexity reviews a generated script, it must flag:
1. Any trend claim that cannot be verified from a source published in the last 90 days
2. Any statistic without a traceable origin
3. Any platform behavior claim that contradicts current Instagram/TikTok algorithm documentation
4. Any strategy described as "new" that has been widely circulated for more than 6 months

Flagged items are returned with a `[NEEDS UPDATE]` tag inline so the script can be revised before video generation.

---

## Kling Generation Defaults

```
model:             kling-v2-0        # or kling-v1-6 for credit conservation
duration:          5                 # seconds — use 10 only for scene that needs it
aspect_ratio:      9:16              # vertical / Reels format
cfg_scale:         0.5               # how closely to follow prompt (0–1)
```

### Credit Cost Reference

| Model | 5s clip | 10s clip |
|-------|---------|---------|
| Kling 1.6 | ~10 credits | ~20 credits |
| Kling 2.0 | ~35 credits | ~70 credits |
| Kling Omni | DO NOT USE | DO NOT USE |
