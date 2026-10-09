/**
 * Renders an episode to a silent H.264 video by stepping window.renderAt(t) frame by frame
 * in several headless browsers. Frames are split into chunks taken from a shared queue; a chunk whose
 * browser crashes is re-rendered in a fresh browser (deterministic rendering makes this safe).
 *
 *   npx tsx render/capture.ts --episode <id> --out <video.mp4> [--workers 3] [--from s] [--to s]
 *                             [--series /data/build/.../series.json] [--allow-placeholders]
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { PlayerSession, startServer } from "./PlayerSession";

const FPS = 30;

/** Frames per chunk. A chunk is the unit of retry: a crashed browser re-renders only its current chunk. */
const CHUNK_FRAMES = 1800;
const MAX_ATTEMPTS = 3;

interface Chunk {
  index: number;
  first: number;
  last: number;
  segment: string;
}

interface ChunkResult {
  chunk: Chunk;
  seconds: number;
  attempts: number;
}

function encoder(segment: string): ReturnType<typeof spawn> {
  return spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS),
    "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-r", String(FPS), segment], { stdio: ["pipe", "inherit", "inherit"] });
}

async function renderChunk(session: PlayerSession, chunk: Chunk): Promise<void> {
  const ff = encoder(chunk.segment);
  const stdin = ff.stdin!;
  const done = new Promise<void>((res, rej) => ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exit ${code}`)))));
  try {
    for (let f = chunk.first; f < chunk.last; f++) {
      await session.renderAt(f / FPS);
      const buf = await session.jpeg(93);
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
                         queue: Chunk[], results: ChunkResult[]): Promise<void> {
  let session: PlayerSession | null = null;
  for (let chunk = queue.shift(); chunk; chunk = queue.shift()) {
    const t0 = Date.now();
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        if (!session) session = await PlayerSession.open(port, episode, series);
        await renderChunk(session, chunk);
        break;
      } catch (err) {
        console.log(`[worker ${index}] chunk ${chunk.index} attempt ${attempt} failed: ${String(err).slice(0, 200)}`);
        if (session) await session.close().catch(() => undefined);
        session = null;
        if (attempt >= MAX_ATTEMPTS) throw new Error(`chunk ${chunk.index} failed ${attempt} times`);
      }
    }
    results.push({ chunk, seconds: (Date.now() - t0) / 1000, attempts: attempt });
    console.log(`[worker ${index}] chunk ${chunk.index} done (${chunk.last - chunk.first} frames, attempts ${attempt})`);
  }
  if (session) await session.close();
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    episode: { type: "string" }, out: { type: "string" }, workers: { type: "string", default: "3" },
    from: { type: "string" }, to: { type: "string" }, series: { type: "string" },
    port: { type: "string", default: "5199" }, "allow-placeholders": { type: "boolean", default: false },
  } });
  if (!values.episode || !values.out) throw new Error("--episode and --out are required");
  const port = Number(values.port);
  const server = await startServer(port);
  try {
    const probe = await PlayerSession.open(port, values.episode, values.series);
    const { duration, missingScenes } = probe.info;
    await probe.close();
    if (missingScenes.length && !values["allow-placeholders"]) {
      throw new Error(`scenes not implemented: ${missingScenes.join(", ")}`);
    }
    const startFrame = Math.round(Number(values.from ?? 0) * FPS);
    const endFrame = Math.round(Number(values.to ?? duration) * FPS);
    const workers = Math.max(1, Number(values.workers));
    const segDir = join(dirname(values.out), "segments");
    rmSync(segDir, { recursive: true, force: true });
    mkdirSync(segDir, { recursive: true });
    const queue: Chunk[] = [];
    for (let a = startFrame, i = 0; a < endFrame; a += CHUNK_FRAMES, i++) {
      queue.push({ index: i, first: a, last: Math.min(endFrame, a + CHUNK_FRAMES),
        segment: join(segDir, `chunk-${String(i).padStart(4, "0")}.mp4`) });
    }
    const chunkCount = queue.length;
    const t0 = Date.now();
    const results: ChunkResult[] = [];
    await Promise.all(Array.from({ length: Math.min(workers, chunkCount) }, (_, w) =>
      runWorker(w, port, values.episode!, values.series, queue, results)));
    results.sort((x, y) => x.chunk.index - y.chunk.index);
    const list = join(segDir, "list.txt");
    writeFileSync(list, results.map((r) => `file '${resolve(r.chunk.segment)}'`).join("\n"));
    await new Promise<void>((res, rej) => {
      const p = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
        "-c", "copy", "-movflags", "+faststart", values.out!], { stdio: "inherit" });
      p.on("close", (c) => (c === 0 ? res() : rej(new Error(`concat exit ${c}`))));
    });
    const wall = (Date.now() - t0) / 1000;
    const frames = results.reduce((n, r) => n + (r.chunk.last - r.chunk.first), 0);
    console.log(JSON.stringify({ episode: values.episode, out: values.out, frames, fps: FPS, wall_seconds: wall,
      throughput_fps: frames / wall, chunks: chunkCount, retried_chunks: results.filter((r) => r.attempts > 1).map((r) => r.chunk.index) }));
  } finally {
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
