/** Deterministic attention pulse: 1 before `start`; afterwards oscillates between `low` and 1 with the given period. */
export function flash(t: number, start: number, period: number, low = 0.25): number {
  if (t < start) return 1;
  const phase = 0.5 + 0.5 * Math.cos(((t - start) * 2 * Math.PI) / period);
  return low + (1 - low) * phase;
}
