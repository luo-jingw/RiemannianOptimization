import type { FormulaHandle, FormulaLayer } from "../../../layers/FormulaLayer";
import { easeOutCubic, ramp, smoothstep } from "../../../primitives/Easing";
import { Palette } from "../../../primitives/Palette";

/** Sentence 1 of s04-toolkit in content/episodes/e00-trailer/story.en.json (the TTS input). */
export const TOOLKIT_LINE = "To optimize there, every familiar idea must be rebuilt: direction, distance, gradient, step.";
/** The four words, in spoken order, with the color of their visual. */
export const TOOLKIT_WORDS: { word: string; color: string }[] = [
  { word: "direction", color: Palette.green },
  { word: "distance", color: Palette.purple },
  { word: "gradient", color: Palette.yellow },
  { word: "step", color: Palette.orange },
];
/** Measured sentence ends include about this much trailing silence after the last word (seconds). */
const TRAILING_SILENCE = 0.45;
/** Visuals lead the spoken word slightly so they register as the word is heard (seconds). */
const VISUAL_LEAD = 0.15;

/**
 * Onset estimate of each word: its character offset as a fraction of the sentence, mapped onto
 * the spoken part of the measured sentence interval [start, end − TRAILING_SILENCE].
 */
export function wordOnsets(sentenceStart: number, sentenceEnd: number): number[] {
  const spoken = sentenceEnd - TRAILING_SILENCE - sentenceStart;
  return TOOLKIT_WORDS.map(({ word }) => {
    const offset = TOOLKIT_LINE.indexOf(word);
    if (offset < 0) throw new Error(`toolkit-words: "${word}" not in the line`);
    return sentenceStart + (spoken * offset) / TOOLKIT_LINE.length - VISUAL_LEAD;
  });
}

/** The row of four words above the terrain. Each rises in at its onset and stays. */
export class ToolkitWordRow {
  private readonly handles: FormulaHandle[] = [];
  private readonly xs: number[] = [];
  private static readonly Y = 104;

  constructor(formulas: FormulaLayer) {
    const spacing = 300;
    TOOLKIT_WORDS.forEach(({ word, color }, i) => {
      const x = 960 + (i - 1.5) * spacing;
      const h = formulas.add({ text: word, x, y: ToolkitWordRow.Y, size: 50, weight: 600, color, opacity: 0 });
      h.el.style.letterSpacing = "0.04em";
      h.el.style.textShadow = `0 0 18px ${color}66, 0 2px 8px #000a`;
      this.handles.push(h);
      this.xs.push(x);
    });
  }

  /** onsets: from wordOnsets; fade: overall opacity multiplier. Call every frame. */
  update(t: number, onsets: number[], fade: number): void {
    this.handles.forEach((h, i) => {
      const a = easeOutCubic(ramp(onsets[i], onsets[i] + 0.45, t));
      const next = i + 1 < onsets.length ? onsets[i + 1] : onsets[i] + 1.6;
      const settle = smoothstep(next, next + 0.5, t);
      h.set({ x: this.xs[i], y: ToolkitWordRow.Y + 18 * (1 - a), opacity: a * (1 - 0.3 * settle) * fade,
        scale: 1.06 - 0.06 * a });
    });
  }
}
