import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KlingModel = "kling-v1-6" | "kling-v2-0";
export type KlingDuration = 5 | 10;
export type KlingAspectRatio = "9:16" | "16:9" | "1:1";

export type CameraAngle =
  | "wide"
  | "medium"
  | "close"
  | "over-shoulder"
  | "hands-focus"
  | "environmental"
  | "pov";

export interface KlingSceneParams {
  scene_description: string;
  camera_angle: CameraAngle;
  environment: string;
  avatar_ref?: string;
  model?: KlingModel;
  duration?: KlingDuration;
}

export interface KlingCostEstimate {
  model: KlingModel;
  duration: KlingDuration;
  credits_per_clip: number;
  scenes: number;
  total_credits: number;
  note: string;
}

export interface KlingTaskResult {
  task_id: string;
  status: "submitted" | "processing" | "succeed" | "failed";
  video_url?: string;
  error?: string;
}

// ─── Credit table ─────────────────────────────────────────────────────────────

const CREDIT_COSTS: Record<KlingModel, Record<KlingDuration, number>> = {
  "kling-v1-6": { 5: 10, 10: 20 },
  "kling-v2-0": { 5: 35, 10: 70 },
};

// ─── Camera angle → Kling prompt fragment ────────────────────────────────────

const CAMERA_DESCRIPTIONS: Record<CameraAngle, string> = {
  wide: "wide shot, full body visible, environment fills the frame",
  medium: "medium shot, waist up, subject centered in frame",
  close: "close-up shot, chest and mask only, tight crop",
  "over-shoulder": "over-shoulder shot, camera positioned behind and beside subject",
  "hands-focus": "hands in foreground in focus, subject slightly out of focus in background",
  environmental: "wide environmental shot, subject small in frame, environment dominant",
  pov: "first-person POV shot, camera at eye level looking forward",
};

// ─── Negative prompts (from brand-brief.md) ──────────────────────────────────

const NEGATIVE_PROMPTS =
  "lip sync, open mouth, talking, facial animation, mouth movement, " +
  "mask warping, mask morphing, face deformation, skin texture, " +
  "eyes blinking, eyebrows moving, teeth, tongue, " +
  "blurry avatar, multiple people, crowd, duplicate figure, " +
  "watermark, text overlay, subtitles, logo, HUD";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvatarRefPath(filename = "avatar-ref-01.png"): string {
  return path.join(process.cwd(), "public", "assets", "avatar", filename);
}

function getEnvironmentPath(environment: string): string {
  return path.join(process.cwd(), "public", "assets", "environments", `${environment}.png`);
}

function avatarRefExists(filename = "avatar-ref-01.png"): boolean {
  return fs.existsSync(getAvatarRefPath(filename));
}

function listAvatarRefs(): string[] {
  const dir = path.join(process.cwd(), "public", "assets", "avatar");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
}

function buildScenePrompt(params: KlingSceneParams): string {
  const cameraDesc = CAMERA_DESCRIPTIONS[params.camera_angle];
  return [
    params.scene_description,
    cameraDesc,
    `environment: ${params.environment}`,
    "cinematic lighting, high realism, dramatic mood",
    "masked figure, static mask, no facial movement",
  ]
    .filter(Boolean)
    .join(", ");
}

// ─── Cost estimation (no API call) ───────────────────────────────────────────

export function estimateKlingCost(
  scene_count: number,
  model: KlingModel = "kling-v2-0",
  duration: KlingDuration = 5
): KlingCostEstimate {
  const credits_per_clip = CREDIT_COSTS[model][duration];
  const total_credits = credits_per_clip * scene_count;
  return {
    model,
    duration,
    credits_per_clip,
    scenes: scene_count,
    total_credits,
    note: model === "kling-v2-0"
      ? "Using Kling 2.0 — switch to kling-v1-6 to save ~70% credits"
      : "Using Kling 1.6 — good quality/cost balance",
  };
}

// ─── JWT auth ─────────────────────────────────────────────────────────────────
// Kling requires a signed JWT from your API key + secret.
// Generate it server-side before each request.

async function getKlingJWT(): Promise<string> {
  const apiKey = process.env.KLING_API_KEY;
  const apiSecret = process.env.KLING_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("KLING_API_KEY and KLING_API_SECRET must be set in .env.local");
  }

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iss: apiKey, exp: now + 1800, nbf: now - 5 })
  ).toString("base64url");

  const { createHmac } = await import("crypto");
  const signature = createHmac("sha256", apiSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

// ─── Submit a single scene to Kling img2video ─────────────────────────────────

export async function submitKlingScene(params: KlingSceneParams): Promise<KlingTaskResult> {
  const model = params.model ?? "kling-v2-0";
  const duration = params.duration ?? 5;

  if (!avatarRefExists(params.avatar_ref)) {
    throw new Error(
      `Avatar reference image not found at public/assets/avatar/${params.avatar_ref ?? "avatar-ref-01.png"}. ` +
      `Add your avatar images to that folder first.`
    );
  }

  const prompt = buildScenePrompt(params);
  const jwt = await getKlingJWT();

  // Read avatar ref as base64
  const avatarPath = getAvatarRefPath(params.avatar_ref);
  const avatarBase64 = fs.readFileSync(avatarPath).toString("base64");
  const avatarMime = avatarPath.endsWith(".png") ? "image/png" : "image/jpeg";

  const body: Record<string, unknown> = {
    model_name: model,
    prompt,
    negative_prompt: NEGATIVE_PROMPTS,
    cfg_scale: 0.5,
    mode: "std",
    duration: String(duration),
    image: `data:${avatarMime};base64,${avatarBase64}`,
  };

  // Optionally include environment image if file exists
  const envPath = getEnvironmentPath(params.environment);
  if (fs.existsSync(envPath)) {
    const envBase64 = fs.readFileSync(envPath).toString("base64");
    const envMime = envPath.endsWith(".png") ? "image/png" : "image/jpeg";
    body.image_tail = `data:${envMime};base64,${envBase64}`;
  }

  const res = await fetch("https://api.klingai.com/v1/videos/image2video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kling API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return {
    task_id: json.data?.task_id ?? json.task_id,
    status: "submitted",
  };
}

// ─── Poll a task until done ───────────────────────────────────────────────────

export async function pollKlingTask(
  task_id: string,
  max_attempts = 30,
  interval_ms = 10_000
): Promise<KlingTaskResult> {
  const jwt = await getKlingJWT();

  for (let i = 0; i < max_attempts; i++) {
    await new Promise((r) => setTimeout(r, interval_ms));

    const res = await fetch(`https://api.klingai.com/v1/videos/image2video/${task_id}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) continue;
    const json = await res.json();
    const status = json.data?.task_status ?? json.status;

    if (status === "succeed") {
      return {
        task_id,
        status: "succeed",
        video_url: json.data?.task_result?.videos?.[0]?.url ?? json.video_url,
      };
    }
    if (status === "failed") {
      return { task_id, status: "failed", error: json.data?.task_status_msg ?? "Generation failed" };
    }
  }

  return { task_id, status: "processing", error: "Timed out waiting for Kling" };
}

// ─── Info helpers (used by UI) ────────────────────────────────────────────────

export function getAvatarAssets(): { avatars: string[]; environments: string[] } {
  const avatarDir = path.join(process.cwd(), "public", "assets", "avatar");
  const envDir = path.join(process.cwd(), "public", "assets", "environments");

  const avatars = fs.existsSync(avatarDir)
    ? fs.readdirSync(avatarDir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    : [];

  const environments = fs.existsSync(envDir)
    ? fs.readdirSync(envDir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f)).map((f) => f.replace(/\.(png|jpg|jpeg|webp)$/i, ""))
    : [];

  return { avatars, environments };
}

export { listAvatarRefs, NEGATIVE_PROMPTS, CAMERA_DESCRIPTIONS };
