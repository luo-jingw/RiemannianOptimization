/** Pure easing helpers. All functions of time are deterministic. */
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear 0..1 ramp between times a and b. */
export function ramp(a: number, b: number, t: number): number {
  return b === a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a));
}

/** Smooth (cubic Hermite) 0..1 ramp between times a and b. */
export function smoothstep(a: number, b: number, t: number): number {
  const x = ramp(a, b, t);
  return x * x * (3 - 2 * x);
}

export function easeInOutCubic(x: number): number {
  const c = clamp01(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function easeOutCubic(x: number): number {
  const c = clamp01(x);
  return 1 - Math.pow(1 - c, 3);
}

/** 1 inside [a, b] with smooth fades of length `fade` on both sides. */
export function window01(a: number, b: number, t: number, fade = 0.4): number {
  return smoothstep(a - fade, a, t) * (1 - smoothstep(b, b + fade, t));
}
