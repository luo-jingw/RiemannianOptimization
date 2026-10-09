import type { EpisodeData } from "../core/EpisodeLoader";
import { clamp01, smoothstep } from "../primitives/Easing";

const KEY_NAMES = ["C", "G", "D", "A", "E", "B", "F♯", "C♯", "A♭", "E♭", "B♭", "F"];

/**
 * Episode intro card, chapter title cards and the outro card.
 * The intro shows the circle of fifths: each episode sits on the next key, matching the score.
 */
export class TitleLayer {
  private readonly intro: HTMLDivElement;
  private readonly chapterCard: HTMLDivElement;
  private readonly chapterEyebrow: HTMLDivElement;
  private readonly chapterTitle: HTMLDivElement;
  private readonly outro: HTMLDivElement;
  private readonly dim: HTMLDivElement;
  private readonly orbitDot: SVGCircleElement;
  private readonly orbitCenter = { x: 1500, y: 470, r: 190 };
  private shownChapter = -1;

  constructor(parent: HTMLElement, private readonly data: EpisodeData, private readonly chapterHead: number) {
    this.dim = this.div(parent, "title-dim");
    this.intro = this.div(parent, "title-intro");
    const order = data.episode.order;
    const { x, y, r } = this.orbitCenter;
    const ticks = KEY_NAMES.map((name, k) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 12;
      const lit = k === (order - 1) % 12;
      const past = k < (order - 1) % 12;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      const lx = x + (r + 42) * Math.cos(a);
      const ly = y + (r + 42) * Math.sin(a);
      return `<circle cx="${px}" cy="${py}" r="${lit ? 13 : 7}" class="${lit ? "orbit-lit" : past ? "orbit-past" : "orbit-tick"}"/>` +
        `<text x="${lx}" y="${ly}" class="orbit-label${lit ? " orbit-label-lit" : ""}">${name}</text>`;
    }).join("");
    this.intro.innerHTML = `
      <svg class="title-orbit" width="1920" height="1080" viewBox="0 0 1920 1080">
        <circle cx="${x}" cy="${y}" r="${r}" class="orbit-ring"/>${ticks}
        <circle id="orbit-dot" cx="${x}" cy="${y - r}" r="6" class="orbit-dot"/>
        <text x="${x}" y="${y + 8}" class="orbit-center">S¹</text>
      </svg>
      <div class="title-series">${data.series.title}</div>
      <div class="title-episode">Episode ${order}</div>
      <div class="title-main">${data.episode.title}</div>
      <div class="title-key">key of ${KEY_NAMES[(order - 1) % 12]} · the series walks the circle of fifths</div>`;
    this.orbitDot = this.intro.querySelector("#orbit-dot") as SVGCircleElement;
    this.chapterCard = this.div(parent, "title-chapter");
    this.chapterEyebrow = this.div(this.chapterCard, "title-chapter-eyebrow");
    this.chapterTitle = this.div(this.chapterCard, "title-chapter-main");
    this.outro = this.div(parent, "title-outro");
    const nextLine = data.next
      ? `<div class="outro-next-label">Next</div><div class="outro-next">Episode ${data.next.order} · ${data.next.title}</div>`
      : `<div class="outro-next-label">Next</div><div class="outro-next">More episodes follow as the course continues</div>`;
    this.outro.innerHTML = `<div class="outro-done">End of Episode ${order}</div>${nextLine}`;
  }

  private div(parent: HTMLElement, cls: string): HTMLDivElement {
    const el = document.createElement("div");
    el.className = cls;
    parent.appendChild(el);
    return el;
  }

  update(t: number): void {
    const tl = this.data.timeline;
    const firstStart = tl.chapters.length ? tl.chapters[0].start : tl.duration;
    const lastEnd = tl.chapters.length ? tl.chapters[tl.chapters.length - 1].end : 0;

    const introOpacity = t < firstStart ? smoothstep(0, 0.8, t) * (1 - smoothstep(firstStart - 0.8, firstStart, t)) : 0;
    this.intro.style.opacity = String(introOpacity);
    this.intro.style.visibility = introOpacity > 0 ? "visible" : "hidden";
    if (introOpacity > 0) {
      // The dot travels from C around to this episode's key during the intro.
      const target = ((this.data.episode.order - 1) % 12) / 12;
      const p = target * smoothstep(0.6, Math.max(1.2, firstStart - 1.2), t);
      const a = -Math.PI / 2 + p * 2 * Math.PI;
      const { x, y, r } = this.orbitCenter;
      this.orbitDot.setAttribute("cx", String(x + r * Math.cos(a)));
      this.orbitDot.setAttribute("cy", String(y + r * Math.sin(a)));
    }

    const outroOpacity = t >= lastEnd ? smoothstep(lastEnd, lastEnd + 0.8, t) : 0;
    this.outro.style.opacity = String(outroOpacity);
    this.outro.style.visibility = outroOpacity > 0 ? "visible" : "hidden";

    let cardOpacity = 0;
    let chapterIndex = -1;
    for (const ch of tl.chapters) {
      if (t >= ch.start && t < ch.start + this.chapterHead) {
        const local = t - ch.start;
        cardOpacity = smoothstep(0, 0.35, local) * (1 - smoothstep(this.chapterHead - 0.5, this.chapterHead, local));
        chapterIndex = ch.index;
        break;
      }
    }
    if (chapterIndex >= 0 && chapterIndex !== this.shownChapter) {
      const ch = tl.chapters[chapterIndex];
      this.chapterEyebrow.textContent = `Chapter ${ch.index + 1} / ${tl.chapters.length}`;
      this.chapterTitle.textContent = ch.title;
      this.shownChapter = chapterIndex;
    }
    this.chapterCard.style.opacity = String(cardOpacity);
    this.chapterCard.style.visibility = cardOpacity > 0 ? "visible" : "hidden";
    const dim = Math.max(introOpacity, outroOpacity, cardOpacity * 0.75);
    this.dim.style.opacity = String(clamp01(dim));
  }
}
