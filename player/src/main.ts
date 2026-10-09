import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/700.css";
import "katex/dist/katex.min.css";
import "./styles.css";
import { EpisodeLoader } from "./core/EpisodeLoader";
import { EpisodeRenderer } from "./core/EpisodeRenderer";
import { FRAME_HEIGHT, FRAME_WIDTH } from "./core/Frame";
import { PreviewClock } from "./core/PreviewClock";
import { SceneRegistry } from "./core/SceneRegistry";
import { FormulaLayer } from "./layers/FormulaLayer";
import { StageLayer } from "./layers/StageLayer";
import { EPISODE_SCENES } from "./episodes/registry";
import { Palette } from "./primitives/Palette";

declare global {
  interface Window {
    /** Draws time t and resolves once fonts used by the frame are loaded. */
    renderAt: (t: number) => Promise<void>;
    playerInfo: { ready: boolean; duration: number; missingScenes: string[]; error: string | null };
  }
}

async function waitFonts(host: HTMLElement): Promise<void> {
  host.getBoundingClientRect();          // force layout so pending glyph loads are requested
  await document.fonts.ready;
}

async function boot(): Promise<void> {
  window.playerInfo = { ready: false, duration: 0, missingScenes: [], error: null };
  const params = new URLSearchParams(location.search);
  const episodeId = params.get("episode") ?? "";
  const capture = params.get("capture") === "1";
  if (capture) document.body.classList.add("capture");

  const frame = document.getElementById("frame") as HTMLDivElement;
  const stage = new StageLayer(frame, Palette.background);
  const formulas = new FormulaLayer(frame);
  const overlay = document.createElement("div");
  overlay.className = "overlay-layer";
  frame.appendChild(overlay);

  const data = await new EpisodeLoader().load(episodeId, params.get("series") ?? undefined);
  const registry = new SceneRegistry(EPISODE_SCENES[episodeId] ?? {});
  const renderer = new EpisodeRenderer(data, { stage, formulas }, registry, overlay);

  window.renderAt = async (t: number): Promise<void> => {
    renderer.renderAt(t);
    await waitFonts(frame);
  };
  await document.fonts.load('500 36px "Inter"');
  await document.fonts.load('500 33px "Noto Sans SC"', "中文字幕");
  await document.fonts.load('40px "KaTeX_Main"');
  await document.fonts.load('italic 40px "KaTeX_Math"');
  window.playerInfo = { ready: true, duration: data.timeline.duration, missingScenes: renderer.missingScenes(), error: null };

  if (capture) return;

  const fit = (): void => {
    const s = Math.min(window.innerWidth / FRAME_WIDTH, (window.innerHeight - 40) / FRAME_HEIGHT);
    frame.style.transform = `scale(${s})`;
  };
  fit();
  window.addEventListener("resize", fit);
  const audio = new Audio(data.audioUrl);
  const controls = document.getElementById("controls") as HTMLDivElement;
  const clock = new PreviewClock(audio, (t) => {
    renderer.renderAt(t);
    const ch = data.timeline.chapters.find((c) => t >= c.start && t < c.end);
    controls.textContent = `${episodeId}  t=${t.toFixed(2)}s / ${data.timeline.duration.toFixed(1)}s  ${ch ? ch.id : ""}  [space] play/pause  [←/→] ±5s  [,/.] ±1 frame  [n/p] chapter`;
  }, data.timeline.duration);
  clock.start(Number(params.get("t") ?? "0"));
  window.addEventListener("keydown", (ev) => {
    const t = clock.time;
    if (ev.key === " ") clock.toggle();
    else if (ev.key === "ArrowRight") clock.seek(t + 5);
    else if (ev.key === "ArrowLeft") clock.seek(t - 5);
    else if (ev.key === ".") clock.seek(t + 1 / 30);
    else if (ev.key === ",") clock.seek(t - 1 / 30);
    else if (ev.key === "n") clock.seek(data.timeline.chapters.find((c) => c.start > t + 0.01)?.start ?? t);
    else if (ev.key === "p") clock.seek([...data.timeline.chapters].reverse().find((c) => c.start < t - 0.5)?.start ?? 0);
  });
}

boot().catch((err: unknown) => {
  window.playerInfo = { ready: false, duration: 0, missingScenes: [], error: String(err) };
  console.error(err);
});
