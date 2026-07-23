#!/usr/bin/env node
// Bake the "old vs new" 287(g) surge graphic (feat/surge-map-graphic) to an
// animated GIF + a static PNG for email/social. Loads the dedicated route
// /<lang>/video/surge (a fixed 1200×1500 dark canvas, chrome-suppressed in
// +layout.svelte), frame-steps window.__bake.seek(progress 0..1) to reveal the
// new (orange) dots over the old (slate) baseline, screenshots the
// [data-surge-canvas] element per frame, then encodes:
//   surge-<lang>.gif  — the reveal sweep, palette-quantized, ~600px wide, 2s tail-hold
//   surge-<lang>.png   — the final full-opacity frame (all dots in), full 1200px res
// plus three review stills (surge-frame-old/mid/final.png) at progress 0 / 0.5 / 1.
//
// Usage:
//   pnpm bake:surge
//   pnpm bake:surge --url=http://localhost:5173/en/video/surge
//   pnpm bake:surge --lang=es
//   pnpm bake:surge --fps=15 --duration=2.6 --gif-width=600

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, rm, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { launchOptions, FRAME_EXT, frameShotOpts, assertRenderer } from "./bake-common.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", ".assets", "video");

const args = process.argv.slice(2);
const argValue = (flag) => {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const LANG = argValue("--lang") ?? "en";
const URL = argValue("--url") ?? `http://localhost:5173/${LANG}/video/surge`;
const FPS = Number(argValue("--fps") ?? 15);
const DURATION = Number(argValue("--duration") ?? 2.6); // reveal sweep, seconds
const GIF_WIDTH = Number(argValue("--gif-width") ?? 600);
const GIF_HOLD = Number(argValue("--gif-hold") ?? 2); // tail-hold before loop, seconds
const KEEP_FRAMES = args.includes("--keep-frames");
const TOTAL_FRAMES = Math.max(2, Math.round(FPS * DURATION));

// Big enough to contain the 1200×1500 canvas so the element screenshot (incl.
// the WebGL map) captures fully.
const VIEWPORT_W = 1280;
const VIEWPORT_H = 1600;

const FRAMES_DIR = path.join(OUT_DIR, `frames-surge-${LANG}`);
await mkdir(OUT_DIR, { recursive: true });

// ffmpeg presence
await new Promise((resolve, reject) => {
  const p = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
  p.on("error", () => reject(new Error("ffmpeg not found on PATH — install ffmpeg first")));
  p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg -version exited ${code}`))));
});

const run = (cmd, argv) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "inherit", "inherit"] });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });

await rm(FRAMES_DIR, { recursive: true, force: true });
await mkdir(FRAMES_DIR, { recursive: true });

console.log(`[snap] launching chromium…`);
const browser = await chromium.launch(launchOptions());
const context = await browser.newContext({
  viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

console.log(`[snap] loading ${URL}…`);
await page.goto(URL, { waitUntil: "networkidle", timeout: 60_000 });

console.log(`[snap] waiting for map (window.__bake.ready)…`);
try {
  await page.waitForFunction(() => window.__mapReady === true, { timeout: 30_000 });
} catch {
  console.log(`[snap] no __mapReady in 30s; pressing on`);
}
await page.waitForFunction(
  () => typeof window.__bake?.seek === "function" && typeof window.__bake?.ready === "function",
  { timeout: 15_000 },
);
try {
  await page.waitForFunction(() => window.__bake.ready() === true, { timeout: 15_000 });
} catch {
  console.log(`[snap] __bake.ready() never went true in 15s; pressing on`);
}
await page.waitForTimeout(700);

await assertRenderer(page);

const canvas = page.locator("[data-surge-canvas]").first();
await canvas.waitFor({ state: "visible" });

const seek = async (p) => {
  await page.evaluate((v) => window.__bake.seek(v), p);
  await page.waitForTimeout(90); // let Svelte commit + MapLibre repaint
};

// ── review stills (progress 0 / 0.5 / 1) ──────────────────────────────────────
console.log(`[snap] review stills…`);
for (const [p, name] of [
  [0, "surge-frame-old.png"],
  [0.5, "surge-frame-mid.png"],
  [1, "surge-frame-final.png"],
]) {
  await seek(p);
  await page.waitForTimeout(120);
  await canvas.screenshot({ path: path.join(OUT_DIR, name) });
}

// The static PNG deliverable = the final full-opacity frame at full resolution.
await seek(1);
await page.waitForTimeout(120);
await canvas.screenshot({ path: path.join(OUT_DIR, `surge-${LANG}.png`) });

// ── frame sweep for the GIF ───────────────────────────────────────────────────
console.log(`[snap] ${TOTAL_FRAMES} frames @ ${FPS}fps (${DURATION}s reveal)…`);
const t0 = Date.now();
for (let i = 0; i < TOTAL_FRAMES; i++) {
  const p = i / (TOTAL_FRAMES - 1);
  await seek(p);
  const frameName = `frame_${String(i).padStart(5, "0")}.${FRAME_EXT}`;
  await canvas.screenshot({ path: path.join(FRAMES_DIR, frameName), ...frameShotOpts() });
}
console.log(`[snap] frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close();

// ── encode GIF ────────────────────────────────────────────────────────────────
const FRAME_GLOB = path.join(FRAMES_DIR, `frame_%05d.${FRAME_EXT}`);
const GIF_PATH = path.join(OUT_DIR, `surge-${LANG}.gif`);
const PALETTE_PATH = path.join(OUT_DIR, `_palette-surge-${LANG}.png`);
const TAIL_HOLD = `tpad=stop_duration=${GIF_HOLD}:stop_mode=clone`;

console.log(`[gif] palettegen…`);
await run("ffmpeg", [
  "-y",
  "-framerate", String(FPS),
  "-i", FRAME_GLOB,
  "-vf", `${TAIL_HOLD},scale=${GIF_WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff`,
  PALETTE_PATH,
]);

console.log(`[gif] paletteuse → ${GIF_PATH}…`);
await run("ffmpeg", [
  "-y",
  "-framerate", String(FPS),
  "-i", FRAME_GLOB,
  "-i", PALETTE_PATH,
  "-lavfi",
  `${TAIL_HOLD},scale=${GIF_WIDTH}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5`,
  GIF_PATH,
]);

await rm(PALETTE_PATH, { force: true });
if (!KEEP_FRAMES) await rm(FRAMES_DIR, { recursive: true, force: true });

// ── copy deliverables to the shared scratchpad (if provided) ──────────────────
const SCRATCH = argValue("--scratch");
if (SCRATCH) {
  await mkdir(SCRATCH, { recursive: true });
  for (const f of [
    `surge-${LANG}.gif`,
    `surge-${LANG}.png`,
    "surge-frame-old.png",
    "surge-frame-mid.png",
    "surge-frame-final.png",
  ]) {
    await copyFile(path.join(OUT_DIR, f), path.join(SCRATCH, f));
  }
  console.log(`[copy] deliverables → ${SCRATCH}`);
}

console.log(`\n✓ ${GIF_PATH}`);
console.log(`✓ ${path.join(OUT_DIR, `surge-${LANG}.png`)}`);
console.log(`✓ review: surge-frame-old/mid/final.png in ${OUT_DIR}`);
process.exit(0);
