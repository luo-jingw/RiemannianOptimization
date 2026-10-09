import type { Timeline } from "../core/Timeline";

interface Segment {
  label: string;
  start: number;
  end: number;
  el: HTMLDivElement;
  fill: HTMLDivElement;
}

function clock(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Seek bar split into one segment per chapter (plus intro and outro), with a hover tooltip naming the
 * chapter under the pointer. Click or drag to seek; pointer capture keeps the drag alive outside the bar.
 */
export class SegmentedSeekBar {
  readonly el: HTMLDivElement;
  private readonly segments: Segment[] = [];
  private readonly thumb: HTMLDivElement;
  private readonly tooltip: HTMLDivElement;
  private dragging = false;

  constructor(private readonly timeline: Timeline, private readonly onSeek: (t: number) => void) {
    this.el = document.createElement("div");
    this.el.className = "seg-bar";
    this.el.setAttribute("role", "slider");
    this.el.setAttribute("aria-valuemin", "0");
    this.el.setAttribute("aria-valuemax", String(Math.round(timeline.duration)));
    const chapters = timeline.chapters;
    const parts: { label: string; start: number; end: number }[] = [];
    if (chapters.length && chapters[0].start > 0) parts.push({ label: "Intro", start: 0, end: chapters[0].start });
    for (const ch of chapters) parts.push({ label: `${ch.index + 1}. ${ch.title}`, start: ch.start, end: ch.end });
    const last = chapters.length ? chapters[chapters.length - 1].end : 0;
    if (last < timeline.duration) parts.push({ label: "Outro", start: last, end: timeline.duration });
    for (const p of parts) {
      const el = document.createElement("div");
      el.className = "seg";
      el.style.left = `${(p.start / timeline.duration) * 100}%`;
      el.style.width = `calc(${((p.end - p.start) / timeline.duration) * 100}% - 3px)`;
      const fill = document.createElement("div");
      fill.className = "seg-fill";
      el.appendChild(fill);
      this.el.appendChild(el);
      this.segments.push({ ...p, el, fill });
    }
    this.thumb = document.createElement("div");
    this.thumb.className = "seg-thumb";
    this.tooltip = document.createElement("div");
    this.tooltip.className = "seg-tooltip";
    this.el.append(this.thumb, this.tooltip);

    this.el.addEventListener("pointerdown", (ev) => {
      this.dragging = true;
      this.el.setPointerCapture(ev.pointerId);
      this.onSeek(this.timeAt(ev.clientX));
    });
    this.el.addEventListener("pointermove", (ev) => {
      this.showTooltip(ev.clientX);
      if (this.dragging) this.onSeek(this.timeAt(ev.clientX));
    });
    const release = (ev: PointerEvent): void => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.el.hasPointerCapture(ev.pointerId)) this.el.releasePointerCapture(ev.pointerId);
      const r = this.el.getBoundingClientRect();
      const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      if (!inside) this.clearHover();
    };
    this.el.addEventListener("pointerup", release);
    this.el.addEventListener("pointercancel", release);
    this.el.addEventListener("pointerleave", () => {
      if (!this.dragging) this.clearHover();
    });
  }

  private clearHover(): void {
    this.tooltip.style.opacity = "0";
    for (const s of this.segments) s.el.classList.remove("seg-hover");
  }

  private timeAt(clientX: number): number {
    const r = this.el.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return f * this.timeline.duration;
  }

  private showTooltip(clientX: number): void {
    const t = this.timeAt(clientX);
    const seg = this.segments.find((s) => t >= s.start && t < s.end) ?? this.segments[this.segments.length - 1];
    this.tooltip.textContent = `${seg ? seg.label : ""} · ${clock(t)}`;
    const r = this.el.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.opacity = "1";
    for (const s of this.segments) s.el.classList.toggle("seg-hover", s === seg);
  }

  update(t: number): void {
    for (const s of this.segments) {
      const f = Math.max(0, Math.min(1, (t - s.start) / (s.end - s.start)));
      s.fill.style.width = `${f * 100}%`;
      s.el.classList.toggle("seg-current", t >= s.start && t < s.end);
    }
    this.thumb.style.left = `${(t / this.timeline.duration) * 100}%`;
    this.el.setAttribute("aria-valuenow", String(Math.round(t)));
  }
}
