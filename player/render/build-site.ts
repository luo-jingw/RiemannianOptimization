/**
 * Builds the static web version into ../site:
 *   vite build (relative base) + data/series.json + per delivered episode: timeline.json and audio.m4a.
 * Audio is encoded from the episode's build mix (build/<eid>/en/audio/mix.wav) with the same two-pass
 * loudness normalization as delivery (−16 LUFS, −1.5 dBTP), so the site needs no rendered video.
 *
 *   npx tsx render/build-site.ts
 */
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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

interface Loudness {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

function measureLoudness(wav: string): Loudness {
  const out = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", wav, "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf-8" });
  const blocks = out.stderr.match(/\{[^{}]*\}/g);
  if (!blocks) throw new Error(`loudness measurement failed for ${wav}`);
  return JSON.parse(blocks[blocks.length - 1]) as Loudness;
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
  writeFileSync(join(siteRoot, "data", "series.json"), JSON.stringify({ ...series, episodes: delivered }, null, 1));
  const report: { episode: string; audio_bytes: number }[] = [];
  for (const ep of delivered) {
    const buildDir = join(projectRoot, "build", ep.id, "en");
    const timeline = join(buildDir, "timeline.json");
    const mix = join(buildDir, "audio", "mix.wav");
    if (!existsSync(timeline) || !existsSync(mix)) throw new Error(`${ep.id}: run rvideo audio first`);
    const dest = join(siteRoot, "data", ep.id);
    mkdirSync(dest, { recursive: true });
    copyFileSync(timeline, join(dest, "timeline.json"));
    const audio = join(dest, "audio.m4a");
    // Re-encode only when the mix is newer than the encoded audio.
    if (existsSync(audio) && statSync(audio).mtimeMs > statSync(mix).mtimeMs) {
      console.log(`[site] ${ep.id}: audio up to date, skipped`);
    } else {
      console.log(`[site] ${ep.id}: measuring loudness and encoding audio (about a minute)...`);
      const m = measureLoudness(mix);
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", mix, "-af",
        `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:` +
        `measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aformat=sample_rates=48000:channel_layouts=stereo`,
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", audio]);
      console.log(`[site] ${ep.id}: done`);
    }
    report.push({ episode: ep.id, audio_bytes: statSync(audio).size });
  }
  writeFileSync(join(siteRoot, ".nojekyll"), "");
  console.log(JSON.stringify({ site: siteRoot, episodes: report }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
