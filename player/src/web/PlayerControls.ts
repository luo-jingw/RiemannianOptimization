import type { Timeline } from "../core/Timeline";

export interface ControlActions {
  toggle(): void;
  seek(t: number): void;
}

function clock(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Control bar of the web player: home link, play/pause, seek bar, time, chapter menu. */
export class PlayerControls {
  private readonly playButton: HTMLButtonElement;
  private readonly seekBar: HTMLInputElement;
  private readonly timeLabel: HTMLSpanElement;
  private readonly chapterSelect: HTMLSelectElement;
  private readonly startOverlay: HTMLButtonElement;
  private dragging = false;

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
    this.seekBar = document.createElement("input");
    this.seekBar.type = "range";
    this.seekBar.min = "0";
    this.seekBar.max = String(timeline.duration);
    this.seekBar.step = "0.1";
    this.seekBar.className = "ctl-seek";
    // While the thumb is held, playback updates never overwrite the bar.
    this.seekBar.addEventListener("pointerdown", () => {
      this.dragging = true;
    });
    const release = (): void => {
      this.dragging = false;
    };
    this.seekBar.addEventListener("pointerup", release);
    this.seekBar.addEventListener("pointercancel", release);
    this.seekBar.addEventListener("input", () => this.actions.seek(Number(this.seekBar.value)));
    this.seekBar.addEventListener("change", release);
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
    host.append(home, this.playButton, this.seekBar, this.timeLabel, this.chapterSelect);
    this.startOverlay = document.createElement("button");
    this.startOverlay.className = "start-overlay";
    this.startOverlay.innerHTML = `<span class="start-icon">▶</span><span class="start-title">${title}</span>`;
    this.startOverlay.onclick = () => this.actions.toggle();
    overlayHost.appendChild(this.startOverlay);
  }

  update(t: number, playing: boolean): void {
    this.playButton.textContent = playing ? "❚❚" : "▶";
    if (!this.dragging) this.seekBar.value = String(t);
    this.timeLabel.textContent = `${clock(t)} / ${clock(this.timeline.duration)}`;
    let current = 0;
    for (const ch of this.timeline.chapters) if (t >= ch.start) current = ch.index;
    if (document.activeElement !== this.chapterSelect) this.chapterSelect.selectedIndex = current;
    this.startOverlay.style.display = playing || t > 0.05 ? "none" : "flex";
  }
}
