/**
 * The six worlds' shot plan: shot lengths in bars, an accelerating arc of 4, 3, 3, 2, 2, 2 bars (16 in total).
 * The same cuts are the shot accents and chord changes of the film score (pipeline/rvideo/music/film_score.py
 * WORLD_SHOT_BARS, film_harmony.py "film-worlds").
 */
export const GALLERY_SHOT_BARS: readonly number[] = [4, 3, 3, 2, 2, 2];

/** Every vignette animates over this many seconds of its own time; a shot of any length plays it once. */
export const VIGNETTE_SECONDS = 8;

/** Cuts land an eighth note before their bar line (seconds at 120 BPM). */
export const PUSH_SECONDS = 0.25;

/** First bar of each shot. */
export function shotStartBars(): number[] {
  const starts: number[] = [];
  let bar = 0;
  for (const bars of GALLERY_SHOT_BARS) {
    starts.push(bar);
    bar += bars;
  }
  return starts;
}
