import type { SeriesManifest } from "../core/EpisodeLoader";

/** Landing page of the web version: the series title and one card per episode. */
export class EpisodeIndex {
  render(host: HTMLElement, series: SeriesManifest): void {
    const ordered = [...series.episodes].sort((a, b) => a.order - b.order);
    const page = document.createElement("div");
    page.className = "index-page";
    const cards = ordered.map((e) => `
      <a class="index-card" href="?episode=${encodeURIComponent(e.id)}">
        <div class="index-num">Episode ${e.order}</div>
        <div class="index-title">${e.title}</div>
      </a>`).join("");
    page.innerHTML = `
      <h1 class="index-series">${series.title}</h1>
      <p class="index-sub">Narrated explainers built from the EECE7223 course notes · English narration, English / 中文 captions · rendered live in your browser with Three.js</p>
      <div class="index-grid">${cards}</div>
      <p class="index-help">Keys: space play/pause · ← → ±5 s · n / p next / previous chapter</p>`;
    host.appendChild(page);
  }
}
