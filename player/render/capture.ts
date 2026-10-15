/**
 * Renders an episode to a silent H.264 video by stepping window.renderAt(t) frame by frame in several headless
 * browsers. The episode is split into segments (SegmentPlan) and chunks; a chunk whose key is already in the cache is
 * reused, the others are taken from a shared queue by the workers. A chunk whose browser crashes is re-rendered in a
 * fresh browser (deterministic rendering makes this safe). All chunks are then concatenated in order.
 *
 *   npx tsx render/capture.ts --episode <id> --out <video.mp4> [--workers 3] [--series /data/content/series.json]
 *                             [--port 5199] [--allow-placeholders]
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { SeriesManifest } from "../src/core/EpisodeLoader";
import type { Timeline } from "../src/core/Timeline";
import { ChunkCache } from "./ChunkCache";
import { ModuleGraphHasher } from "./ModuleGraphHasher";
import { CHROME_ARGS, CHROME_PATH, PlayerSession, startServer } from "./PlayerSession";
import { type Chunk, SegmentPlan } from "./SegmentPlan";

const FPS = 30;

/** Frames per chunk. A chunk is the unit of retry and of caching. */
const CHUNK_FRAMES = 1800;
const MAX_ATTEMPTS = 3;
const JPEG_QUALITY = 93;
const X264_ARGS = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p"];

const PLAYER_ROOT = resolve(import.meta.dirname, "..");
const PROJECT_ROOT = resolve(PLAYER_ROOT, "..");

interface ChunkResult {
  chunk: Chunk;
  seconds: number;
  attempts: number;
}

function encoder(file: string): ReturnType<typeof spawn> {
  return spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS),
    "-c:v", "mjpeg", "-i", "-", ...X264_ARGS, "-r", String(FPS), file], { stdio: ["pipe", "inherit", "inherit"] });
}

async function renderChunk(session: PlayerSession, chunk: Chunk, file: string): Promise<void> {
  const ff = encoder(file);
  const stdin = ff.stdin!;
  const done = new Promise<void>((res, rej) => ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exit ${code}`)))));
  try {
    for (let k = 0; k < chunk.frames; k++) {
      await session.renderAt(chunk.start + k / FPS);
      const buf = await session.jpeg(JPEG_QUALITY);
      if (!stdin.write(buf)) await new Promise<void>((r) => stdin.once("drain", () => r()));
    }
  } catch (err) {
    ff.kill("SIGKILL");
    await done.catch(() => undefined);
    throw err;
  }
  stdin.end();
  await done;
}

/** One worker: owns a browser session and takes chunks from the shared queue until it is empty. */
async function runWorker(index: number, port: number, episode: string, series: string | undefined,
                         queue: Chunk[], cache: ChunkCache, results: ChunkResult[]): Promise<void> {
  let session: PlayerSession | null = null;
  for (let chunk = queue.shift(); chunk; chunk = queue.shift()) {
    const t0 = Date.now();
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        if (!session) session = await PlayerSession.open(port, episode, series);
        await renderChunk(session, chunk, cache.pendingPath(chunk.key));
        cache.commit(chunk.key);
        break;
      } catch (err) {
        console.log(`[worker ${index}] ${chunk.segment} chunk ${chunk.key.slice(0, 8)} attempt ${attempt} failed: ${String(err).slice(0, 200)}`);
        if (session) await session.close().catch(() => undefined);
        session = null;
        if (attempt >= MAX_ATTEMPTS) throw new Error(`chunk ${chunk.key} failed ${attempt} times`);
      }
    }
    results.push({ chunk, seconds: (Date.now() - t0) / 1000, attempts: attempt });
    console.log(`[worker ${index}] ${chunk.segment} chunk done (${chunk.frames} frames, attempts ${attempt}, ${queue.length} queued)`);
  }
  if (session) await session.close();
}

/** Project-relative files under `dir` (recursive, sorted), for hashing asset trees. */
function treeFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(PLAYER_ROOT, p));
    }
  };
  walk(dir);
  return out;
}

/** Render settings, browser and player shell: what every frame depends on besides its own segment. */
async function commonKey(hasher: ModuleGraphHasher): Promise<string> {
  const shell = await hasher.hash(["src/main.ts"], [/episodes\/registry$/]);
  const files = hasher.hashFiles(["index.html", "package-lock.json", ...treeFiles(join(PLAYER_ROOT, "public"))]);
  const chrome = execFileSync(CHROME_PATH, ["--version"], { encoding: "utf8" }).trim();
  const settings = { fps: FPS, chunk: CHUNK_FRAMES, jpeg: JPEG_QUALITY, x264: X264_ARGS, chromeArgs: CHROME_ARGS, size: [1920, 1080] };
  return createHash("sha256").update(JSON.stringify({ settings, chrome, shell, files })).digest("hex");
}

/** The dev server maps /data/<path> to the project root; --series uses that URL form. */
function seriesFile(series: string | undefined): string {
  return series ? join(PROJECT_ROOT, series.replace(/^\/data\//, "")) : join(PROJECT_ROOT, "content", "series.json");
}

async function concat(files: string[], list: string, out: string): Promise<void> {
  writeFileSync(list, files.map((f) => `file '${resolve(f)}'`).join("\n"));
  await new Promise<void>((res, rej) => {
    const p = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
      "-c", "copy", "-movflags", "+faststart", out], { stdio: "inherit" });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`concat exit ${c}`))));
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    episode: { type: "string" }, out: { type: "string" }, workers: { type: "string", default: "3" },
    series: { type: "string" }, port: { type: "string", default: "5199" },
    "allow-placeholders": { type: "boolean", default: false },
  } });
  if (!values.episode || !values.out) throw new Error("--episode and --out are required");
  const episode = values.episode;
  const port = Number(values.port);
  const timeline = JSON.parse(readFileSync(join(PROJECT_ROOT, "build", episode, "en", "timeline.json"), "utf8")) as Timeline;
  const series = JSON.parse(readFileSync(seriesFile(values.series), "utf8")) as SeriesManifest;

  const hasher = new ModuleGraphHasher(PLAYER_ROOT);
  const episodeDir = join("src", "episodes", episode);
  const sceneHashes = new Map<string, string>();
  for (const id of ["*", ...timeline.chapters.map((c) => c.id)]) {
    const entry = id === "*" ? join(episodeDir, "index.ts") : join(episodeDir, `${id}.ts`);
    const file = existsSync(join(PLAYER_ROOT, entry)) ? entry : join("src", "core", "PlaceholderScene.ts");
    sceneHashes.set(id, await hasher.hash([file]));
  }
  const segments = SegmentPlan.build(timeline, {
    fps: FPS, commonKey: await commonKey(hasher), series, episodeId: episode,
    sceneHash: (id) => sceneHashes.get(id)!,
  });
  const chunks = segments.flatMap((s) => SegmentPlan.chunks(s, FPS, CHUNK_FRAMES));
  const cache = new ChunkCache(join(dirname(values.out), "cache"));
  const queue = chunks.filter((c) => !cache.has(c.key));
  const renderedSegments = [...new Set(queue.map((c) => c.segment))];
  console.log(`[capture] ${episode}: ${segments.length} segments, ${chunks.length} chunks, ${queue.length} to render` +
    (renderedSegments.length ? ` (${renderedSegments.join(", ")})` : ""));

  const server = await startServer(port);
  const t0 = Date.now();
  const results: ChunkResult[] = [];
  try {
    const probe = await PlayerSession.open(port, episode, values.series);
    const { duration, missingScenes } = probe.info;
    await probe.close();
    if (missingScenes.length && !values["allow-placeholders"]) {
      throw new Error(`scenes not implemented: ${missingScenes.join(", ")}`);
    }
    if (Math.abs(duration - timeline.duration) > 1e-6) throw new Error(`player duration ${duration} != timeline ${timeline.duration}`);
    const workers = Math.max(1, Number(values.workers));
    await Promise.all(Array.from({ length: Math.min(workers, queue.length) }, (_, w) =>
      runWorker(w, port, episode, values.series, queue, cache, results)));
  } finally {
    await server.close();
  }
  await concat(chunks.map((c) => cache.path(c.key)), join(dirname(values.out), "chunks.txt"), values.out);
  const pruned = cache.prune(new Set(chunks.map((c) => c.key)));
  const wall = (Date.now() - t0) / 1000;
  const frames = chunks.reduce((n, c) => n + c.frames, 0);
  const rendered = results.reduce((n, r) => n + r.chunk.frames, 0);
  console.log(JSON.stringify({ episode, out: values.out, frames, fps: FPS, frames_rendered: rendered,
    frames_reused: frames - rendered, segments_rendered: renderedSegments, wall_seconds: wall,
    throughput_fps: rendered / Math.max(wall, 1e-9), chunks: chunks.length, cache_pruned: pruned,
    retried_chunks: results.filter((r) => r.attempts > 1).map((r) => r.chunk.key.slice(0, 8)) }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
