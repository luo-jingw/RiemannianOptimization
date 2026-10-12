import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Dot } from "../../../primitives/Dot";
import { Palette } from "../../../primitives/Palette";
import { Polyline } from "../../../primitives/Polyline";
import { E1, E2, E3, F_MAX, F_MIN, levelLoops, rayleigh } from "./rayleigh";

/** Color of the cost value f ∈ [½, 2]: cool (low) to warm (high). */
export function costColor(f: number): THREE.Color {
  const stops: { at: number; c: THREE.Color }[] = [
    { at: 0, c: new THREE.Color("#173a80") },
    { at: 0.35, c: new THREE.Color("#5d5aa6") },
    { at: 1, c: new THREE.Color("#e8843c") },
  ];
  const s = Math.max(0, Math.min(1, (f - F_MIN) / (F_MAX - F_MIN)));
  for (let i = 1; i < stops.length; i++) {
    if (s <= stops[i].at) {
      const a = stops[i - 1];
      const b = stops[i];
      return a.c.clone().lerp(b.c, (s - a.at) / (b.at - a.at));
    }
  }
  return stops[stops.length - 1].c.clone();
}

/** Level values drawn on the sphere. */
const LEVELS = [0.6, 0.75, 0.9, 1.15, 1.35, 1.6, 1.85];

/**
 * Unit sphere colored by the Rayleigh quotient f(x) = ½xᵀAx, with level loops and the six critical points
 * (±e₃ green minima, ±e₂ purple saddles, ±e₁ warm maxima). Opaque, so far-side lines are depth-hidden.
 */
export class RayleighSphere {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly levels: Polyline[] = [];
  private readonly critical: Dot[] = [];

  constructor(stage: StageLayer) {
    const geometry = new THREE.SphereGeometry(1, 128, 96);
    geometry.rotateX(Math.PI / 2);
    const pos = geometry.getAttribute("position");
    const colors: number[] = [];
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      const c = costColor(rayleigh(p));
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0,
      transparent: true, opacity: 1, depthWrite: true });
    this.mesh = new THREE.Mesh(geometry, this.material);
    stage.root.add(this.mesh);
    for (const c of LEVELS) {
      for (const loop of levelLoops(c)) {
        this.levels.push(new Polyline(stage, loop.map((q) => q.clone().multiplyScalar(1.004)), { color: "#f1f3f8", width: 1.3, opacity: 0.4 }));
      }
    }
    const spots: [THREE.Vector3, string][] = [[E3, Palette.green], [E3.clone().negate(), Palette.green], [E2, Palette.purple],
      [E2.clone().negate(), Palette.purple], [E1, Palette.orange], [E1.clone().negate(), Palette.orange]];
    for (const [q, color] of spots) this.critical.push(new Dot(stage, q.clone().multiplyScalar(1.01), color, 0.03, "3d"));
  }

  /** Overall opacity; `levelOpacity` scales the level loops, `criticalOpacity` the critical-point dots. */
  setOpacity(o: number, levelOpacity = 1, criticalOpacity = 0): void {
    this.material.opacity = o;
    this.material.depthWrite = o > 0.95;
    this.mesh.visible = o > 0.001;
    this.levels.forEach((l) => l.setOpacity(0.4 * o * levelOpacity));
    this.critical.forEach((d) => d.setOpacity(o * criticalOpacity));
  }
}
