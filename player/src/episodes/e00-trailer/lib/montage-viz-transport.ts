import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniArrow, MiniLine, type MiniViz, TILE_PX_H, TILE_PX_W, disc, saw, softLights, tileScene } from "./montage-kit";

const STEPS_PER_LEG = 90;
const GHOSTS = 9;
const PERIOD = 5;

/** Great-circle arc from a to b (unit vectors), n + 1 points. */
function arc(a: THREE.Vector3, b: THREE.Vector3, n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(a.clone().lerp(b, i / n).normalize());
  return pts;
}

/**
 * Parallel transport around a geodesic triangle (pole → equator → equator → pole): the vector never turns along the
 * way, yet it comes back rotated by the enclosed area, 90° here (holonomy, a sign of curvature).
 */
export class TransportViz implements MiniViz {
  readonly label = "Parallel transport";
  readonly scene = tileScene();
  readonly camera = new THREE.PerspectiveCamera(30, TILE_PX_W / TILE_PX_H, 0.1, 50);
  private readonly path: THREE.Vector3[] = [];
  private readonly vectors: THREE.Vector3[] = [];
  private readonly arrow: MiniArrow;
  private readonly start: MiniArrow;
  private readonly ghosts: MiniArrow[] = [];
  private readonly dot: THREE.Mesh;
  private readonly trail = new MiniLine(this.scene, Palette.orange, 3.5);

  constructor() {
    softLights(this.scene);
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#2c5fae"), roughness: 0.55 })));
    const n = new THREE.Vector3(0, 0, 1);
    const a = new THREE.Vector3(1, 0, 0);
    const b = new THREE.Vector3(0, 1, 0);
    const legs = [arc(n, a, STEPS_PER_LEG), arc(a, b, STEPS_PER_LEG), arc(b, n, STEPS_PER_LEG)];
    for (const leg of legs) for (const q of this.path.length ? leg.slice(1) : leg) this.path.push(q);
    // discrete Levi-Civita transport on the embedded sphere: project onto the next tangent plane, keep the length
    let v = new THREE.Vector3(0.7, -0.7, 0).normalize().multiplyScalar(0.42);
    this.vectors.push(v.clone());
    for (let i = 1; i < this.path.length; i++) {
      const q = this.path[i];
      const len = v.length();
      v = v.clone().addScaledVector(q, -v.dot(q)).setLength(len);
      this.vectors.push(v.clone());
    }
    const outline = new MiniLine(this.scene, "#8a94b0", 2, 0.6, true);
    outline.setPoints(this.path.map((q) => q.clone().multiplyScalar(1.004)));
    this.trail.setPoints(this.path.map((q) => q.clone().multiplyScalar(1.006)));
    this.arrow = new MiniArrow(this.scene, Palette.yellow, 0.018);
    this.start = new MiniArrow(this.scene, Palette.green, 0.014);
    for (let k = 0; k < GHOSTS; k++) this.ghosts.push(new MiniArrow(this.scene, Palette.yellow, 0.011));
    this.dot = disc(this.scene, Palette.orange, 0.035, true);
    this.camera.position.set(3.3, 2.4, 2.6);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0.2, 0.2, 0.25);
    this.camera.updateMatrixWorld(true);
  }

  update(t: number): void {
    const u = Math.min(1, saw(t, PERIOD) * 1.2);
    const last = this.path.length - 1;
    const i = Math.round(u * last);
    const at = (k: number): THREE.Vector3 => this.path[k].clone().multiplyScalar(1.01);
    this.dot.position.copy(at(i));
    this.arrow.set(at(i), at(i).add(this.vectors[i]));
    this.start.set(at(0), at(0).add(this.vectors[0]), 0.9);
    this.ghosts.forEach((g, k) => {
      const j = Math.round(((k + 1) / (GHOSTS + 1)) * last);
      g.set(at(j), at(j).add(this.vectors[j]), j <= i ? 0.45 : 0);
    });
    this.trail.setProgress(i / last);
  }
}
