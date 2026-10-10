/**
 * Renders platform covers from content/publish/covers.json: a series cover and one thumbnail per episode.
 * Art is a frame of the delivered video, cropped to its picture area (no captions); text is HTML/KaTeX.
 * Output: output/publish/covers/<id>-youtube.{png,jpg} (16:9, 1280×720) and <id>-bilibili.{png,jpg} (1146×717).
 *
 *   npx tsx render/covers.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import katex from "katex";
import puppeteer from "puppeteer-core";
import { CHROME_ARGS, CHROME_PATH } from "./PlayerSession";

interface Art {
  episode: string;
  time: number;
  crop: [number, number, number, number];
  /** Rectangles (frame pixels) painted with the background colour, e.g. to remove a stray label. */
  masks?: [number, number, number, number][];
}

interface CoverSpec {
  id: string;
  ep?: number;
  art: Art;
  kicker?: string;
  zh: string;
  /** Smaller second Chinese line under the main title. */
  zhSub?: string;
  en: string;
  chain?: string;
  tex: string;
  chips?: string[];
}

const playerRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(playerRoot, "..");
const outDir = join(projectRoot, "output", "publish", "covers");
const artDir = join(projectRoot, "build", "publish", "art");
const nm = (p: string): string => pathToFileURL(join(playerRoot, "node_modules", p)).href;

function extractArt(spec: CoverSpec): string {
  const [x0, y0, x1, y1] = spec.art.crop;
  const mp4 = join(projectRoot, "output", spec.art.episode, "v1", `${spec.art.episode}.en.mp4`);
  const png = join(artDir, `${spec.id}.png`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", spec.art.time.toFixed(2), "-i", mp4,
    "-frames:v", "1", "-vf", [
      ...(spec.art.masks ?? []).map(([a, b, c, d]) => `drawbox=x=${a}:y=${b}:w=${c - a}:h=${d - b}:color=0x0e1320:t=fill`),
      `crop=${x1 - x0}:${y1 - y0}:${x0}:${y0}`].join(","), png]);
  return pathToFileURL(png).href;
}

function page(spec: CoverSpec, artUrl: string): string {
  const tex = katex.renderToString(spec.tex, { throwOnError: true, output: "html" });
  const series = spec.ep === undefined;
  const chips = (spec.chips ?? ["完整证明", "反例动画", "中英字幕"]).map((c) => `<span class="chip">${c}</span>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${nm("@fontsource/noto-sans-sc/900.css")}">
<link rel="stylesheet" href="${nm("@fontsource/noto-sans-sc/700.css")}">
<link rel="stylesheet" href="${nm("@fontsource/inter/800.css")}">
<link rel="stylesheet" href="${nm("@fontsource/inter/600.css")}">
<link rel="stylesheet" href="${nm("katex/dist/katex.min.css")}">
<style>
  html, body { margin: 0; width: 1920px; height: 100vh; overflow: hidden; }
  body { background: radial-gradient(1400px 900px at 78% 50%, #18233f 0%, #0b1020 60%, #070a14 100%); font-family: Inter, "Noto Sans SC", sans-serif; color: #e8ecf4; }
  .art { position: absolute; right: 30px; top: 50%; transform: translateY(-50%); max-width: 1060px; max-height: 960px;
         -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 88%, transparent 100%),
                             linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%);
         -webkit-mask-composite: source-in; mask-composite: intersect; }
  .left { position: absolute; left: 110px; top: 0; bottom: 0; width: ${series ? 1020 : 960}px; display: flex; flex-direction: column; justify-content: center; }
  .kicker { font: 600 34px Inter; letter-spacing: 0.06em; color: #9aa4bf; margin-bottom: 26px; }
  .badge { display: inline-block; align-self: flex-start; font: 800 64px Inter; color: #0b1020; background: #ffa94d; border-radius: 18px; padding: 6px 28px; margin-bottom: 30px; }
  .series-mini { font: 700 40px "Noto Sans SC"; color: #ffa94d; margin-bottom: 18px; }
  .zh-sub { font: 900 76px/1.2 "Noto Sans SC"; color: #ffffff; margin-top: 10px; }
  .zh { font: 900 ${series ? 150 : 160}px/1.12 "Noto Sans SC"; color: #ffffff; text-shadow: 0 6px 30px rgba(0,0,0,0.6); }
  .en { font: 600 ${series ? 46 : 44}px/1.25 Inter; color: #c7cee0; margin-top: 26px; }
  .chain { font: 700 34px "Noto Sans SC"; color: #ffd43b; margin-top: 36px; }
  .tex { font-size: ${series ? 46 : 52}px; color: #ffd43b; margin-top: 40px; }
  .chips { margin-top: 44px; display: flex; gap: 16px; flex-wrap: wrap; }
  .chip { font: 700 32px "Noto Sans SC"; color: #e8ecf4; background: #18294a; border: 2px solid #3f6fae; border-radius: 999px; padding: 8px 26px; }
</style></head><body>
<img class="art" src="${artUrl}">
<div class="left">
  ${series ? `<div class="kicker">${spec.kicker ?? ""}</div>` : `<div class="series-mini">从零开始的黎曼优化</div><div class="badge">EP ${String(spec.ep).padStart(2, "0")}</div>`}
  <div class="zh">${spec.zh}</div>
  ${spec.zhSub ? `<div class="zh-sub">${spec.zhSub}</div>` : ""}
  <div class="en">${spec.en}</div>
  ${spec.chain ? `<div class="chain">${spec.chain}</div>` : ""}
  <div class="tex">${tex}</div>
  <div class="chips">${chips}</div>
</div></body></html>`;
}

async function main(): Promise<void> {
  const specs = JSON.parse(readFileSync(join(projectRoot, "content", "publish", "covers.json"), "utf-8")) as
    { series: CoverSpec; episodes: CoverSpec[] };
  mkdirSync(outDir, { recursive: true });
  mkdirSync(artDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: [...CHROME_ARGS, "--allow-file-access-from-files"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
  const pageHandle = await browser.newPage();
  const written: string[] = [];
  for (const spec of [specs.series, ...specs.episodes]) {
    const html = join(artDir, `${spec.id}.html`);
    writeFileSync(html, page(spec, extractArt(spec)));
    // Each platform is rendered natively at its aspect ratio (no cropping of the layout).
    for (const [suffix, w, h, height] of [["youtube", 1280, 720, 1080], ["bilibili", 1146, 717, 1201]] as const) {
      await pageHandle.setViewport({ width: 1920, height, deviceScaleFactor: 1 });
      await pageHandle.goto(pathToFileURL(html).href, { waitUntil: "networkidle0" });
      await pageHandle.evaluate(() => document.fonts.ready);
      const png = join(outDir, `${spec.id}-${suffix}.png`);
      await pageHandle.screenshot({ path: png, type: "png" });
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", png, "-vf", `scale=${w}:${h}:flags=lanczos`,
        "-q:v", "2", join(outDir, `${spec.id}-${suffix}.jpg`)]);
    }
    written.push(spec.id);
  }
  await browser.close();
  console.log(JSON.stringify({ outDir, covers: written }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
