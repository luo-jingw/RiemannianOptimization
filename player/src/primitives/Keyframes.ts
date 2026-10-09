import { smoothstep } from "./Easing";

/** A keyframe: time plus a record of numeric channels (e.g. x, y, scale, opacity). */
export interface Keyframe<K extends string> {
  t: number;
  v: Record<K, number>;
}

/**
 * Piecewise interpolation between keyframes with smoothstep easing over `ease` seconds
 * after each keyframe time. Before the first key the first value holds; after the last, the last.
 */
export function keyframes<K extends string>(t: number, keys: Keyframe<K>[], ease = 0.8): Record<K, number> {
  if (keys.length === 0) throw new Error("keyframes: empty");
  let current = { ...keys[0].v };
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const w = smoothstep(k.t, k.t + ease, t);
    if (w <= 0) break;
    const next = { ...current };
    for (const name of Object.keys(k.v) as K[]) next[name] = current[name] + (k.v[name] - current[name]) * w;
    current = next;
  }
  return current;
}
