import type { Timeline } from "../core/Timeline";
import { SegmentedSeekBar } from "./SegmentedSeekBar";

export interface ControlActions {
  toggle(): void;
  seek(t: number): void;
}

function clock(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Control bar of the web player: home link, play/pause, chapter-segmented seek bar, time, chapter menu. */
export class PlayerControls {
  private readonly playButton: HTMLButtonElement;
  private readonly seekBar: SegmentedSeekBar;
  private readonly timeLabel: HTMLSpanElement;
  private readonly chapterSelect: HTMLSelectElement;
  private readonly startOverlay: HTMLButtonElement;

  constructor(host: HTMLElement, overlayHost: HTMLElement, private readonly timeline: Timeline,
              title: string, private readonly actions: ControlActions) {
    host.replaceChildren();
    host.classList.add("web-controls");
    const home = document.createElement("a");
    home.href = "./";
    home.className = "ctl-home";
    home.textContent = "← Episodes";
    this.playButton = document.createElement("button");
    this.playButton.className = "ctl-play";
    this.playButton.textContent = "▶";
    this.playButton.onclick = () => this.actions.toggle();
    this.seekBar = new SegmentedSeekBar(timeline, (t) => this.actions.seek(t));
    this.timeLabel = document.createElement("span");
    this.timeLabel.className = "ctl-time";
    this.chapterSelect = document.createElement("select");
    this.chapterSelect.className = "ctl-chapters";
    for (const ch of timeline.chapters) {
      const opt = document.createElement("option");
      opt.value = String(ch.start);
      opt.textContent = `${ch.index + 1}. ${ch.title}`;
      this.chapterSelect.appendChild(opt);
    }
    this.chapterSelect.onchange = () => this.actions.seek(Number(this.chapterSelect.value) + 0.01);
    host.append(home, this.playButton, this.seekBar.el, this.timeLabel, this.chapterSelect);
    this.startOverlay = document.createElement("button");
    this.startOverlay.className = "start-overlay";
    this.startOverlay.innerHTML = `<span class="start-icon">▶</span><span class="start-title">${title}</span>`;
    this.startOverlay.onclick = () => this.actions.toggle();
    overlayHost.appendChild(this.startOverlay);
  }

  update(t: number, playing: boolean): void {
    this.playButton.textContent = playing ? "❚❚" : "▶";
    this.seekBar.update(t);
    this.timeLabel.textContent = `${clock(t)} / ${clock(this.timeline.duration)}`;
    let current = 0;
    for (const ch of this.timeline.chapters) if (t >= ch.start) current = ch.index;
    if (document.activeElement !== this.chapterSelect) this.chapterSelect.selectedIndex = current;
    this.startOverlay.style.display = playing || t > 0.05 ? "none" : "flex";
  }
}
