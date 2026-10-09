import type { FormulaHandle, FormulaLayer } from "../layers/FormulaLayer";
import { clamp01, easeInOutCubic } from "./Easing";
import { Palette } from "./Palette";

export interface LedgerEntry {
  /** Step label, e.g. "1" or "IFT". */
  label: string;
  tex: string;
  /** Local time at which the entry appears. */
  at: number;
}

/**
 * Right-hand panel of established facts. Keeps at most `capacity` entries; when a new entry
 * arrives, older ones slide up and the oldest fades out. Position is a pure function of time.
 */
export class ProofLedger {
  private readonly handles: FormulaHandle[];
  private readonly labels: FormulaHandle[];
  private readonly title: FormulaHandle;
  private readonly slide = 0.6;

  constructor(formulas: FormulaLayer, private readonly entries: LedgerEntry[],
              private readonly box: { x: number; y: number; width: number; rowHeight: number; capacity: number },
              heading = "Established") {
    this.title = formulas.add({ text: heading, x: box.x, y: box.y - 46, size: 26, color: Palette.muted, align: "left", weight: 600 });
    this.labels = entries.map((e) => formulas.add({ text: e.label, x: box.x, y: box.y, size: 26, color: Palette.orange, align: "left", weight: 700 }));
    this.handles = entries.map((e) => formulas.add({ tex: e.tex, x: box.x + 56, y: box.y, size: 32, align: "left", maxWidth: box.width - 56 }));
  }

  update(t: number, opacity: number, highlightLatest = true): void {
    const visible = this.entries.map((e) => t >= e.at);
    const anyVisible = visible.some((v) => v);
    this.title.set({ opacity: anyVisible ? opacity : 0 });
    this.entries.forEach((entry, i) => {
      if (!visible[i]) {
        this.handles[i].set({ opacity: 0 });
        this.labels[i].set({ opacity: 0 });
        return;
      }
      // Fractional number of later entries that have arrived (each arrival animates over `slide` s).
      let slot = 0;
      for (let j = i + 1; j < this.entries.length; j++) slot += easeInOutCubic(clamp01((t - this.entries[j].at) / this.slide));
      const appear = easeInOutCubic(clamp01((t - entry.at) / this.slide));
      const cap = this.box.capacity;
      const fadeOld = 1 - clamp01(slot - (cap - 1));
      const isLatest = slot < 0.5;
      // Rows fill top-down; once `cap` rows are used, each arrival pushes older rows up.
      let arrived = 0;
      for (let j = 0; j < this.entries.length; j++) arrived += easeInOutCubic(clamp01((t - this.entries[j].at) / this.slide));
      const row = Math.min(arrived, cap) - 1 - slot;
      const y = this.box.y + row * this.box.rowHeight + (1 - appear) * 20;
      const o = opacity * appear * fadeOld;
      const color = highlightLatest && isLatest ? Palette.yellow : Palette.text;
      this.handles[i].set({ y, opacity: o, color });
      this.labels[i].set({ y, opacity: o });
    });
  }
}
