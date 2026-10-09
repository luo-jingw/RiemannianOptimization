import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Polyline, sampleCurve } from "../../../primitives/Polyline";

/** Color of the height value z ∈ [−1, 1]: cool (low f) to warm (high f). */
export function heightColor(z: number): THREE.Color {
  const stops: { at: number; c: THREE.Color }[] = [
    { at: 0, c: new THREE.Color("#173a80") },
    { at: 0.5, c: new THREE.Color("#5d5aa6") },
    { at: 1, c: new THREE.Color("#e8843c") },
  ];
  const s = Math.max(0, Math.min(1, (z + 1) / 2));
  for (let i = 1; i < stops.length; i++) {
    if (s <= stops[i].at) {
      const a = stops[i - 1];
      const b = stops[i];
      return a.c.clone().lerp(b.c, (s - a.at) / (b.at - a.at));
    }
  }
  return stops[stops.length - 1].c.clone();
}

/**
 * Unit sphere colored by the height function f(x) = x₃, with level circles {x₃ = c}.
 * The surface is opaque so lines on the far side are hidden by the depth test.
 */
export class HeightSphere {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly levels: Polyline[] = [];
  private readonly meridians: Polyline[] = [];

  constructor(stage: StageLayer, opts: { levels?: number[]; meridians?: number } = {}) {
    const geometry = new THREE.SphereGeometry(1, 96, 64);
    geometry.rotateX(Math.PI / 2);               // SphereGeometry's pole axis is y; the series uses z up
    const pos = geometry.getAttribute("position");
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const c = heightColor(pos.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.0,
      transparent: true, opacity: 1, depthWrite: true });
    this.mesh = new THREE.Mesh(geometry, this.material);
    stage.root.add(this.mesh);
    const levelValues = opts.levels ?? [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];
    for (const c of levelValues) {
      const r = Math.sqrt(1 - c * c) * 1.004;
      const pts = sampleCurve((s) => new THREE.Vector3(r * Math.cos(s), r * Math.sin(s), c * 1.004), 0, 2 * Math.PI, 160);
      this.levels.push(new Polyline(stage, pts, { color: "#f1f3f8", width: 1.4, opacity: 0.45 }));
    }
    const nm = opts.meridians ?? 0;
    for (let k = 0; k < nm; k++) {
      const a = (k / nm) * 2 * Math.PI;
      const pts = sampleCurve((s) => new THREE.Vector3(Math.sin(s) * Math.cos(a), Math.sin(s) * Math.sin(a), Math.cos(s)).multiplyScalar(1.004), 0, Math.PI, 80);
      this.meridians.push(new Polyline(stage, pts, { color: "#f1f3f8", width: 1, opacity: 0.2 }));
    }
  }

  /** Overall opacity; `levelOpacity` scales the level circles separately. */
  setOpacity(o: number, levelOpacity = 1): void {
    this.material.opacity = o;
    this.material.depthWrite = o > 0.95;
    this.mesh.visible = o > 0.001;
    this.levels.forEach((l) => l.setOpacity(0.45 * o * levelOpacity));
    this.meridians.forEach((l) => l.setOpacity(0.2 * o * levelOpacity));
  }
}
