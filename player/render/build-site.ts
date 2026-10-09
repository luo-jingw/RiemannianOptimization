/**
 * Builds the static web version into ../site:
 *   vite build (relative base) + data/series.json + per delivered episode: timeline.json and audio.m4a.
 * Audio is copied from the latest delivered MP4 (already loudness-normalized); the build refuses an episode
 * whose current timeline differs from the one that version was muxed with.
 *
 *   npx tsx render/build-site.ts
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "vite";

interface SeriesEpisode {
  id: string;
  order: number;
  title: string;
  status: string;
}

interface DeliveryManifest {
  sources: { timeline_sha256: string };
}

const playerRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(playerRoot, "..");
const siteRoot = join(projectRoot, "site");

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function latestVersion(episodeId: string): number {
  const dir = join(projectRoot, "output", episodeId);
  const versions = existsSync(dir)
    ? readdirSync(dir).map((d) => /^v(\d+)$/.exec(d)).filter((m): m is RegExpExecArray => m !== null).map((m) => Number(m[1]))
    : [];
  if (versions.length === 0) throw new Error(`${episodeId}: no delivered version under output/`);
  return Math.max(...versions);
}

async function main(): Promise<void> {
  await build({ root: playerRoot, configFile: join(playerRoot, "vite.config.ts"), base: "./", logLevel: "warn",
    build: { outDir: siteRoot, emptyOutDir: true } });
  const seriesPath = join(projectRoot, "content", "series.json");
  const series = JSON.parse(readFileSync(seriesPath, "utf-8")) as { title: string; episodes: SeriesEpisode[] };
  const delivered = series.episodes.filter((e) => e.status === "delivered");
  mkdirSync(join(siteRoot, "data"), { recursive: true });
  writeFileSync(join(siteRoot, "data", "series.json"), JSON.stringify({ ...series, episodes: delivered }, null, 1));
  const report: { episode: string; version: number; audio_bytes: number }[] = [];
  for (const ep of delivered) {
    const version = latestVersion(ep.id);
    const outDir = join(projectRoot, "output", ep.id, `v${version}`);
    const manifest = JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf-8")) as DeliveryManifest;
    const timeline = join(projectRoot, "build", ep.id, "en", "timeline.json");
    if (sha256(timeline) !== manifest.sources.timeline_sha256) {
      throw new Error(`${ep.id}: build timeline differs from the one muxed into v${version}; re-deliver first`);
    }
    const dest = join(siteRoot, "data", ep.id);
    mkdirSync(dest, { recursive: true });
    copyFileSync(timeline, join(dest, "timeline.json"));
    const audio = join(dest, "audio.m4a");
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", join(outDir, `${ep.id}.en.mp4`),
      "-map", "0:a:0", "-c:a", "copy", "-movflags", "+faststart", audio]);
    report.push({ episode: ep.id, version, audio_bytes: readFileSync(audio).length });
  }
  writeFileSync(join(siteRoot, ".nojekyll"), "");
  console.log(JSON.stringify({ site: siteRoot, episodes: report }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
