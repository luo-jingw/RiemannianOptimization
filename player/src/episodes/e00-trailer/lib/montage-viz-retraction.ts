import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniArrow, MiniLine, type MiniViz, TILE_PX_H, TILE_PX_W, disc, softLights, tileScene } from "./montage-kit";

/**
 * Riemannian gradient and retraction on the sphere for f(x) = aᵀx: step along −grad f in the tangent plane,
 * then retract by normalizing back onto the sphere; the iterates descend to the minimizer −a.
 */
const ARC_SAMPLES = 12;

export class RetractionViz implements MiniViz {
  readonly label = "Riemannian gradient · retraction";
  readonly scene = tileScene();
  readonly camera = new THREE.PerspectiveCamera(30, TILE_PX_W / TILE_PX_H, 0.1, 50);
  private readonly a = new THREE.Vector3(0.2, 0.9, -0.4).normalize();
  private readonly iterates: THREE.Vector3[] = [];
  private readonly steps: { from: THREE.Vector3; tip: THREE.Vector3; to: THREE.Vector3 }[] = [];
  private readonly arrow: MiniArrow;
  private readonly back: MiniLine;
  private readonly trail: MiniLine;
  private readonly dot: THREE.Mesh;

  constructor() {
    softLights(this.scene);
    const geo = new THREE.SphereGeometry(1, 72, 54);
    const colors: number[] = [];
    const pos = geo.getAttribute("position");
    const lo = new THREE.Color("#0d2b5a");
    const hi = new THREE.Color("#ffb066");
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const c = lo.clone().lerp(hi, ((v.dot(this.a) + 1) / 2) ** 1.6);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
    let x = new THREE.Vector3(0.6, 0.3, 0.75).normalize();
    this.iterates.push(x.clone());
    for (let k = 0; k < 6; k++) {
      const grad = this.a.clone().addScaledVector(x, -this.a.dot(x));          // tangent projection of ∇f = a
      const tip = x.clone().addScaledVector(grad, -0.75);
      const next = tip.clone().normalize();
      this.steps.push({ from: x.clone(), tip, to: next });
      x = next;
      this.iterates.push(x.clone());
    }
    this.arrow = new MiniArrow(this.scene, Palette.yellow, 0.02);
    this.back = new MiniLine(this.scene, Palette.green, 3, 1, true);
    this.trail = new MiniLine(this.scene, Palette.orange, 4);
    this.dot = disc(this.scene, Palette.orange, 0.045, true);
    this.camera.position.set(1.35, -2.04, 3.9);            // between the start point and the minimizer −a
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld(true);
  }

  update(t: number): void {
    const period = 0.75;
    const n = this.steps.length;
    const cycle = (t % (n * period + 1.0)) / period;
    const k = Math.min(n - 1, Math.floor(cycle));
    const u = Math.min(1, cycle - k);
    const s = this.steps[k];
    const stepPhase = Math.min(1, u / 0.5);
    const retractPhase = Math.max(0, (u - 0.5) / 0.5);
    this.arrow.set(s.from.clone().multiplyScalar(1.01), s.from.clone().lerp(s.tip, stepPhase).multiplyScalar(1.01), retractPhase < 1 ? 1 : 0.3);
    this.back.setPoints([s.tip.clone(), s.to.clone().multiplyScalar(1.01)]);
    this.back.setOpacity(retractPhase > 0 ? 1 : 0);
    // the path of the iterates drawn as great-circle arcs on the sphere (chords would dip inside it)
    const corners = this.iterates.slice(0, k + 1);
    corners.push(s.from.clone().lerp(s.to, retractPhase).normalize());
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j + 1 < corners.length; j++) {
      for (let m = 0; m < ARC_SAMPLES; m++) pts.push(corners[j].clone().lerp(corners[j + 1], m / ARC_SAMPLES).normalize().multiplyScalar(1.012));
    }
    pts.push(corners[corners.length - 1].clone().multiplyScalar(1.012));
    this.trail.setPoints(pts);
    this.dot.position.copy(pts[pts.length - 1]);
  }
}
