/**
 * Writes PNG stills at given times for review, and checks determinism by rendering the
 * requested times forward, then in reverse order, then again during a forward sweep from t=0
 * in --history-step increments, comparing SHA-256 of the pixels.
 *
 *   npx tsx render/stills.ts --episode <id> --outdir <dir> --times 1.0,12.5,30 [--series ...]
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { PlayerSession, startServer } from "./PlayerSession";

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    episode: { type: "string" }, outdir: { type: "string" }, times: { type: "string" }, series: { type: "string" },
    port: { type: "string", default: "5198" }, "history-step": { type: "string", default: "0.5" },
  } });
  if (!values.episode || !values.outdir || !values.times) throw new Error("--episode --outdir --times required");
  const times = values.times.split(",").map(Number);
  mkdirSync(values.outdir, { recursive: true });
  const server = await startServer(Number(values.port));
  try {
    const session = await PlayerSession.open(Number(values.port), values.episode, values.series);
    const first = new Map<number, string>();
    for (const t of times) {
      await session.renderAt(t);
      const png = await session.png();
      first.set(t, createHash("sha256").update(png).digest("hex"));
      writeFileSync(join(values.outdir, `t${t.toFixed(2).padStart(8, "0")}.png`), png);
    }
    const mismatches: number[] = [];
    for (const t of [...times].reverse()) {
      await session.renderAt(t);
      const h = createHash("sha256").update(await session.png()).digest("hex");
      if (h !== first.get(t)) mismatches.push(t);
    }
    // History check: sweep forward from t=0 in small steps (the access pattern of a capture worker)
    // and compare each still against its jump-rendered hash.
    const step = Number(values["history-step"]);
    const historyMismatches: number[] = [];
    if (step > 0) {
      const sorted = [...times].sort((a, b) => a - b);
      let next = 0;
      for (let t = 0; next < sorted.length; t += step) {
        while (next < sorted.length && sorted[next] <= t + 1e-9) {
          await session.renderAt(sorted[next]);
          const h = createHash("sha256").update(await session.png()).digest("hex");
          if (h !== first.get(sorted[next])) historyMismatches.push(sorted[next]);
          next++;
        }
        await session.renderAt(t);
      }
    }
    await session.close();
    console.log(JSON.stringify({ episode: values.episode, stills: times.length, outdir: values.outdir,
      missing_scenes: session.info.missingScenes, determinism_mismatches: mismatches,
      history_step: step, history_mismatches: historyMismatches }));
  } finally {
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
