/**
 * The gallery's shot plan: shot lengths in bars, an accelerating arc of 6, 5, 4, 3, 3, 3 bars (24 in total).
 * The same cuts are the narration anchors in content/episodes/e00-trailer/story.en.json and the key splits of the
 * trailer score (pipeline/rvideo/music/trailer_score.py, KEY_SPLITS["trailer-gallery"]).
 */
export const GALLERY_SHOT_BARS: readonly number[] = [6, 5, 4, 3, 3, 3];

/** Every vignette animates over this many seconds of its own time; a shot of any length plays it once. */
export const VIGNETTE_SECONDS = 8;

/** Cuts land an eighth note before their bar line, with the push in the score (seconds at 120 BPM). */
export const PUSH_SECONDS = 0.25;

/** The section ends in a stop of 1.5 beats; the last shot freezes at its start (seconds at 120 BPM). */
export const STOP_SECONDS = 0.75;

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
