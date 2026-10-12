import * as THREE from "three";

/**
 * Geometry of the running example: the Rayleigh quotient f(x) = ½ xᵀAx on S² ⊂ ℝ³, A = diag(4, 2, 1), with the
 * embedded metric and the normalization retraction R_x(s) = (x + s)/‖x + s‖ (Boumal Ex. 4.11).
 * Critical points ±e₁ (max, f = 2), ±e₂ (saddle, f = 1), ±e₃ (min, f = ½). A4.3 holds on TS² with L = λmax − λmin = 3.
 */

export const EIG: readonly [number, number, number] = [4, 2, 1];
export const F_MIN = 0.5;
export const F_MAX = 2;
export const L_RAYLEIGH = 3;

const DEG = Math.PI / 180;

export const E1 = new THREE.Vector3(1, 0, 0);
export const E2 = new THREE.Vector3(0, 1, 0);
export const E3 = new THREE.Vector3(0, 0, 1);

/** Point on S² with polar angle `polarDeg` from e₃ and azimuth `azDeg`. */
export function spherePoint(polarDeg: number, azDeg: number): THREE.Vector3 {
  const p = polarDeg * DEG;
  const a = azDeg * DEG;
  return new THREE.Vector3(Math.sin(p) * Math.cos(a), Math.sin(p) * Math.sin(a), Math.cos(p));
}

/** A x. */
export function applyA(x: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(EIG[0] * x.x, EIG[1] * x.y, EIG[2] * x.z);
}

/** f(x) = ½ xᵀAx (also used off the sphere, for retraction targets before normalization). */
export function rayleigh(x: THREE.Vector3): number {
  return 0.5 * x.dot(applyA(x));
}

/** Riemannian gradient (I − xxᵀ)Ax for unit x. */
export function rayleighGrad(x: THREE.Vector3): THREE.Vector3 {
  const ax = applyA(x);
  return ax.sub(x.clone().multiplyScalar(x.dot(applyA(x))));
}

/** Normalization retraction R_x(s) = (x + s)/‖x + s‖. */
export function retract(x: THREE.Vector3, s: THREE.Vector3): THREE.Vector3 {
  return x.clone().add(s).normalize();
}

/** Line-search function g(α) = f(R_x(−α grad f(x))). */
export function lineSearch(x: THREE.Vector3, alpha: number): number {
  return rayleigh(retract(x, rayleighGrad(x).multiplyScalar(-alpha)));
}

/** Orthonormal tangent frame at x: east = e₃ × x normalized, north = x × east. */
export function tangentFrame(x: THREE.Vector3): { east: THREE.Vector3; north: THREE.Vector3 } {
  const east = new THREE.Vector3(-x.y, x.x, 0);
  if (east.lengthSq() < 1e-12) east.set(0, 1, 0);
  east.normalize();
  const north = x.clone().cross(east).normalize();
  return { east, north };
}

/** Lift a point slightly off the unit sphere so lines drawn on it are not hidden by the surface. */
export function lift(p: THREE.Vector3, r = 1.006): THREE.Vector3 {
  return p.clone().multiplyScalar(r / p.length());
}

/** One backtracking line search (Boumal Alg. 4.2): every trial step and whether it passed the Armijo test. */
export interface BacktrackResult {
  trials: { alpha: number; value: number; accepted: boolean }[];
  alpha: number;
}

/** Backtracking from `alphaBar` with factor `tau` and Armijo constant `r` at x, for the cost scale·f + shift. */
export function backtrack(x: THREE.Vector3, alphaBar: number, tau: number, r: number, scale = 1): BacktrackResult {
  const g = rayleighGrad(x).multiplyScalar(scale);
  const g2 = g.lengthSq();
  const fx = scale * rayleigh(x);
  const trials: BacktrackResult["trials"] = [];
  let alpha = alphaBar;
  for (let n = 0; n < 60; n++) {
    const value = scale * rayleigh(retract(x, g.clone().multiplyScalar(-alpha)));
    const accepted = fx - value >= r * alpha * g2;
    trials.push({ alpha, value, accepted });
    if (accepted) return { trials, alpha };
    alpha *= tau;
  }
  return { trials, alpha };
}

/** One iterate of RGD with backtracking and the number of trials it took. */
export interface RgdStep {
  x: THREE.Vector3;
  trials: number;
}

/**
 * RGD with backtracking for the cost scale·f + shift. Initial steps: ᾱ₀ = ℓ₀/‖grad‖, then
 * ᾱ_k = (1/τ)·2(f(x_{k−1}) − f(x_k))/‖grad f(x_k)‖² (Boumal (4.13)), floored at 1e-3.
 */
export function rgdBacktracking(x0: THREE.Vector3, steps: number, opts: { tau: number; r: number; l0: number; scale?: number }): RgdStep[] {
  const scale = opts.scale ?? 1;
  const out: RgdStep[] = [{ x: x0.clone(), trials: 0 }];
  let x = x0.clone();
  let prevF = Number.NaN;
  for (let k = 0; k < steps; k++) {
    const g = rayleighGrad(x).multiplyScalar(scale);
    const g2 = g.lengthSq();
    if (g2 < 1e-24) break;
    const fx = scale * rayleigh(x);
    const alphaBar = k === 0 ? opts.l0 / Math.sqrt(g2) : Math.max(1e-3, (2 * (prevF - fx)) / g2 / opts.tau);
    const res = backtrack(x, alphaBar, opts.tau, opts.r, scale);
    prevF = fx;
    x = retract(x, g.clone().multiplyScalar(-res.alpha));
    out.push({ x: x.clone(), trials: res.trials.length });
  }
  return out;
}

/** RGD with a constant step: x_{k+1} = R_{x_k}(−α grad f(x_k)). */
export function rgdFixed(x0: THREE.Vector3, steps: number, alpha: number): THREE.Vector3[] {
  const out = [x0.clone()];
  let x = x0.clone();
  for (let k = 0; k < steps; k++) {
    x = retract(x, rayleighGrad(x).multiplyScalar(-alpha));
    out.push(x.clone());
  }
  return out;
}

/** Points on the level set {f = c} of the sphere, as closed loops (two antipodal loops for c ≠ 1). */
export function levelLoops(c: number, n = 160): THREE.Vector3[][] {
  const loops: THREE.Vector3[][] = [];
  if (c > F_MIN && c < 1) {
    // around ±e₃: sin²θ = (2c − 1)/(1 + 2cos²φ)
    for (const sign of [1, -1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= n; i++) {
        const phi = (2 * Math.PI * i) / n;
        const s2 = (2 * c - 1) / (1 + 2 * Math.cos(phi) ** 2);
        const st = Math.sqrt(s2);
        pts.push(new THREE.Vector3(st * Math.cos(phi), st * Math.sin(phi), sign * Math.sqrt(1 - s2)));
      }
      loops.push(pts);
    }
  } else if (c > 1 && c < F_MAX) {
    // around ±e₁: sin²θ' = (4 − 2c)/(3 − cos²ψ), x = (±cos θ', sin θ' cos ψ, sin θ' sin ψ)
    for (const sign of [1, -1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= n; i++) {
        const psi = (2 * Math.PI * i) / n;
        const s2 = (4 - 2 * c) / (3 - Math.cos(psi) ** 2);
        const st = Math.sqrt(s2);
        pts.push(new THREE.Vector3(sign * Math.sqrt(1 - s2), st * Math.cos(psi), st * Math.sin(psi)));
      }
      loops.push(pts);
    }
  }
  return loops;
}
