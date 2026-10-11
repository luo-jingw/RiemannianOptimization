import { smoothstep } from "../../../primitives/Easing";

/** Seconds per beat in the trailer (120 BPM). */
export const BEAT = 0.5;

/**
 * A staircase that rises by one unit per `period`, each step eased over the fraction `easeFrac` of the period:
 * value = number of completed steps + eased fraction of the current step. Step k starts at t0 + k * period.
 */
export function beatSteps(t: number, t0: number, period: number, count: number, easeFrac = 0.6): number {
  let v = 0;
  for (let k = 0; k < count; k++) {
    const a = t0 + k * period;
    v += smoothstep(a, a + period * easeFrac, t);
  }
  return v;
}

/** A pulse that peaks on each beat and decays exponentially: 1 at the beat, about 0.05 after `decay` seconds. */
export function beatPulse(t: number, period = BEAT, decay = 0.35): number {
  if (t < 0) return 0;
  const phase = t - Math.floor(t / period) * period;
  return Math.exp((-3 * phase) / decay);
}
