/**
 * Builds the static web version into ../site:
 *   vite build (relative base) + data/series.json + per delivered episode: timeline.json and audio.m4a.
 * Audio is taken from the published delivery (output/<eid>/v<N>/<eid>.en.mp4, highest N), already loudness-
 * normalized by the muxer (−16 LUFS), and re-encoded to 128 kb/s AAC; intermediate build mixes are not needed.
 *
 *   npx tsx render/build-site.ts
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "vite";

interface SeriesEpisode {
  id: string;
  order: number;
  title: string;
  status: string;
}

const playerRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(playerRoot, "..");
const siteRoot = join(projectRoot, "site");

const DURATION_TOLERANCE_S = 0.5;

function mediaDuration(path: string): number {
  const out = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], { encoding: "utf-8" });
  return Number(out.stdout.trim());
}

/** The delivered MP4 of the highest version in output/<eid>/, or null when the episode has none. */
function publishedVideo(id: string): string | null {
  const dir = join(projectRoot, "output", id);
  if (!existsSync(dir)) return null;
  const versions = readdirSync(dir).map((d) => /^v(\d+)$/.exec(d)).filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1])).sort((x, y) => y - x);
  for (const v of versions) {
    const mp4 = join(dir, `v${v}`, `${id}.en.mp4`);
    if (existsSync(mp4)) return mp4;
  }
  return null;
}

async function main(): Promise<void> {
  // Keep data/ (encoded audio is reused); replace the hashed player bundle.
  rmSync(join(siteRoot, "assets"), { recursive: true, force: true });
  await build({ root: playerRoot, configFile: join(playerRoot, "vite.config.ts"), base: "./", logLevel: "warn",
    // The player is one bundle by design (scenes are imported statically), so the size warning is noise.
    build: { outDir: siteRoot, emptyOutDir: false, chunkSizeWarningLimit: 4096 } });
  console.log("[site] player bundle built");
  const seriesPath = join(projectRoot, "content", "series.json");
  const series = JSON.parse(readFileSync(seriesPath, "utf-8")) as { title: string; episodes: SeriesEpisode[] };
  const delivered = series.episodes.filter((e) => e.status === "delivered");
  mkdirSync(join(siteRoot, "data"), { recursive: true });
  const report: { episode: string; audio_bytes: number; audio_version: string }[] = [];
  const versions = new Map<string, string>();
  for (const ep of delivered) {
    const buildDir = join(projectRoot, "build", ep.id, "en");
    const timeline = join(buildDir, "timeline.json");
    const video = publishedVideo(ep.id);
    if (!existsSync(timeline) || video === null) throw new Error(`${ep.id}: needs build/${ep.id}/en/timeline.json and a delivered output/${ep.id}/v<N>/`);
    const dest = join(siteRoot, "data", ep.id);
    mkdirSync(dest, { recursive: true });
    copyFileSync(timeline, join(dest, "timeline.json"));
    const audio = join(dest, "audio.m4a");
    // Reuse the encoded audio only if it is newer than the delivery AND complete (duration matches the timeline).
    const timelineDuration = (JSON.parse(readFileSync(timeline, "utf-8")) as { duration: number }).duration;
    if (existsSync(audio) && statSync(audio).mtimeMs > statSync(video).mtimeMs
        && Math.abs(mediaDuration(audio) - timelineDuration) < DURATION_TOLERANCE_S) {
      console.log(`[site] ${ep.id}: audio up to date, skipped`);
    } else {
      console.log(`[site] ${ep.id}: encoding audio from ${video.slice(projectRoot.length + 1)}...`);
      const partial = `${audio}.partial.m4a`;   // written first, renamed when complete: an interrupted run leaves no truncated audio
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", video, "-map", "0:a:0",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", partial]);
      const encoded = mediaDuration(partial);
      if (Math.abs(encoded - timelineDuration) >= DURATION_TOLERANCE_S) {
        throw new Error(`${ep.id}: encoded audio is ${encoded.toFixed(2)} s, timeline is ${timelineDuration.toFixed(2)} s`);
      }
      renameSync(partial, audio);
      console.log(`[site] ${ep.id}: done (${encoded.toFixed(1)} s)`);
    }
    const version = createHash("sha256").update(readFileSync(audio)).digest("hex").slice(0, 12);
    versions.set(ep.id, version);
    report.push({ episode: ep.id, audio_bytes: statSync(audio).size, audio_version: version });
  }
  const published = delivered.map((e) => ({ ...e, audioVersion: versions.get(e.id) }));
  writeFileSync(join(siteRoot, "data", "series.json"), JSON.stringify({ ...series, episodes: published }, null, 1));
  writeFileSync(join(siteRoot, ".nojekyll"), "");
  console.log(JSON.stringify({ site: siteRoot, episodes: report }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
