import type { TimelineCaption } from "../core/Timeline";

export type CaptionStyle = "boxed" | "shadow";

/**
 * Burned-in bilingual captions: English line above Chinese line, bottom band of the frame.
 * "boxed" draws dark panels behind the lines (episodes); "shadow" draws bare text with a soft dark outline (trailers).
 */
export class CaptionLayer {
  private readonly box: HTMLDivElement;
  private readonly en: HTMLDivElement;
  private readonly zh: HTMLDivElement;
  private shown = -1;

  constructor(parent: HTMLElement, private readonly captions: TimelineCaption[], style: CaptionStyle = "boxed") {
    this.box = document.createElement("div");
    this.box.className = style === "shadow" ? "caption-box caption-shadow" : "caption-box";
    this.en = document.createElement("div");
    this.en.className = "caption-en";
    this.zh = document.createElement("div");
    this.zh.className = "caption-zh";
    this.box.append(this.en, this.zh);
    parent.appendChild(this.box);
  }

  private indexAt(t: number): number {
    let lo = 0;
    let hi = this.captions.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = this.captions[mid];
      if (t < c.start) hi = mid - 1;
      else if (t >= c.end) lo = mid + 1;
      else return mid;
    }
    return -1;
  }

  update(t: number): void {
    const i = this.indexAt(t);
    if (i === this.shown) return;
    this.shown = i;
    if (i < 0) {
      this.box.style.visibility = "hidden";
      return;
    }
    this.en.textContent = this.captions[i].text;
    this.zh.textContent = this.captions[i].translation;
    this.box.style.visibility = "visible";
  }
}
