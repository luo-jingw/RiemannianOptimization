import type { ChapterTiming } from "../core/Scene";
import { smoothstep, window01 } from "./Easing";

/**
 * Sentence-anchored timing for one chapter. Visual events refer to narration sentences
 * by index, so visuals follow the measured audio rather than an equal split of the chapter.
 */
export class Cues {
  constructor(private readonly ctx: ChapterTiming, readonly t: number) {}

  /** Start time of sentence i (local seconds). Indices past the end clamp to the last sentence end. */
  s(i: number): number {
    const st = this.ctx.sentenceStarts;
    if (i < st.length) return st[Math.max(0, i)];
    return this.ctx.sentenceEnds[this.ctx.sentenceEnds.length - 1] ?? this.ctx.duration;
  }

  /** End time of sentence i. */
  e(i: number): number {
    const en = this.ctx.sentenceEnds;
    return en[Math.min(Math.max(0, i), en.length - 1)] ?? this.ctx.duration;
  }

  /** Time `frac` of the way through sentence i (0 = start, 1 = end). */
  in(i: number, frac: number): number {
    return this.s(i) + (this.e(i) - this.s(i)) * frac;
  }

  /** Smooth 0..1 that starts at sentence i (+offset) and lasts `dur` seconds. */
  p(i: number, dur = 0.8, offset = 0): number {
    const a = this.s(i) + offset;
    return smoothstep(a, a + dur, this.t);
  }

  /** Smooth 0..1 progress over the whole spoken length of sentence i. */
  over(i: number, startFrac = 0, endFrac = 1): number {
    return smoothstep(this.in(i, startFrac), this.in(i, endFrac), this.t);
  }

  /** Visible (1) from sentence i until sentence j starts, with fades. */
  during(i: number, j: number, fade = 0.4): number {
    return window01(this.s(i), j >= 0 ? this.s(j) : this.ctx.duration, this.t, fade);
  }

  /** Time of bar `i` (fractional allowed) from the chapter start; trailers only. */
  bar(i: number): number {
    if (this.ctx.barSeconds === undefined) throw new Error("Cues.bar: this chapter has no bar grid");
    return i * this.ctx.barSeconds;
  }

  /** Smooth 0..1 that starts at bar `i` (+offset bars) and lasts `durBars` bars; trailers only. */
  pb(i: number, durBars = 1, offsetBars = 0): number {
    const a = this.bar(i + offsetBars);
    return smoothstep(a, a + this.bar(durBars), this.t);
  }

  /** Smooth 0..1 that starts `dur` seconds before the chapter ends. */
  outro(dur = 1.0): number {
    return smoothstep(this.ctx.duration - dur, this.ctx.duration, this.t);
  }
}
