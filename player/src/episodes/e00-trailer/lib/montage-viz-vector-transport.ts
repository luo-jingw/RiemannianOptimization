import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniArrow, MiniLine, type MiniViz, TILE_PX_H, TILE_PX_W, disc, softLights, tileScene } from "./montage-kit";

const A = [1, 2.4, 4.5];                          // f(x) = xᵀ diag(A) x on the unit sphere
const ITERS = 4;
const STEP = 0.11;
const PHASE = 1.4;                                // seconds per iteration

interface CgStep {
  x: THREE.Vector3;
  next: THREE.Vector3;
  d: THREE.Vector3;               // search direction at x
  carried: THREE.Vector3;         // d moved to next unchanged (in R³)
  transported: THREE.Vector3;     // projected onto T_next: the vector transport
  g: THREE.Vector3;               // −grad f at next
  dNext: THREE.Vector3;           // −grad f + β · transported
}

/**
 * Vector transport in Riemannian conjugate gradients: the previous direction lives in the old tangent plane; it is
 * carried to the new point and projected onto the new tangent plane before it is combined with the new gradient.
 */
export class VectorTransportViz implements MiniViz {
  readonly label = "Vector transport";
  readonly scene = tileScene();
  readonly camera = new THREE.PerspectiveCamera(30, TILE_PX_W / TILE_PX_H, 0.1, 50);
  private readonly steps: CgStep[] = [];
  private readonly diskA: THREE.Mesh;
  private readonly diskB: THREE.Mesh;
  private readonly dArrow: MiniArrow;
  private readonly ghost: MiniArrow;
  private readonly gArrow: MiniArrow;
  private readonly newArrow: MiniArrow;
  private readonly drop = new MiniLine(this.scene, "#cfd6e6", 2, 0.8, true);
  private readonly trail = new MiniLine(this.scene, Palette.orange, 3.5);
  private readonly dot: THREE.Mesh;

  constructor() {
    softLights(this.scene);
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#2c5fae"), roughness: 0.55 })));
    const diskMat = (): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.green),
      transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
    this.diskA = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), diskMat());
    this.diskB = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), diskMat());
    this.scene.add(this.diskA, this.diskB);
    const egrad = (x: THREE.Vector3): THREE.Vector3 => new THREE.Vector3(2 * A[0] * x.x, 2 * A[1] * x.y, 2 * A[2] * x.z);
    const rgrad = (x: THREE.Vector3): THREE.Vector3 => { const g = egrad(x); return g.addScaledVector(x, -g.dot(x)); };
    let x = new THREE.Vector3(0.35, 0.55, 0.76).normalize();
    let d = rgrad(x).multiplyScalar(-1);
    const path: THREE.Vector3[] = [x.clone()];
    for (let k = 0; k < ITERS; k++) {
      const next = x.clone().addScaledVector(d, STEP).normalize();          // retraction
      const transported = d.clone().addScaledVector(next, -d.dot(next));   // vector transport by projection
      const gOld = rgrad(x);
      const gNew = rgrad(next);
      const beta = gNew.lengthSq() / gOld.lengthSq();                      // Fletcher–Reeves
      const g = gNew.clone().multiplyScalar(-1);
      const dNext = g.clone().addScaledVector(transported, beta);
      this.steps.push({ x: x.clone(), next, d: d.clone(), carried: d.clone(), transported, g, dNext });
      x = next;
      d = dNext;
      path.push(x.clone());
    }
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < path.length - 1; k++) for (let i = 0; i < 16; i++) pts.push(path[k].clone().lerp(path[k + 1], i / 16).normalize().multiplyScalar(1.006));
    pts.push(path[path.length - 1].clone().multiplyScalar(1.006));
    this.trail.setPoints(pts);
    this.dArrow = new MiniArrow(this.scene, Palette.orange, 0.014);
    this.ghost = new MiniArrow(this.scene, Palette.orange, 0.011);
    this.gArrow = new MiniArrow(this.scene, Palette.yellow, 0.014);
    this.newArrow = new MiniArrow(this.scene, Palette.green, 0.016);
    this.dot = disc(this.scene, Palette.orange, 0.032, true);
    const mid = path[1].clone().add(path[2]).normalize();
    this.camera.position.copy(mid.clone().multiplyScalar(4.4).add(new THREE.Vector3(1.1, -1.4, 0.5)));
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(mid.clone().multiplyScalar(0.7));
    this.camera.updateMatrixWorld(true);
  }

  private static place(disk: THREE.Mesh, p: THREE.Vector3): void {
    disk.position.copy(p).multiplyScalar(1.003);
    disk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p);
  }

  update(t: number): void {
    const cycle = ITERS * PHASE + 0.8;
    const local = t % cycle;
    const k = Math.min(ITERS - 1, Math.floor(local / PHASE));
    const u = Math.min(1, (local - k * PHASE) / PHASE);
    const s = this.steps[k];
    const scale = 0.32 / Math.max(0.3, s.d.length());
    const lift = (p: THREE.Vector3): THREE.Vector3 => p.clone().multiplyScalar(1.01);
    VectorTransportViz.place(this.diskA, s.x);
    VectorTransportViz.place(this.diskB, s.next);
    this.trail.setProgress((k + Math.min(1, u / 0.3)) / ITERS);
    // 0–0.3: step along d; 0.3–0.6: carry d to the new point and drop it into the new plane; 0.6–1: combine
    const move = Math.min(1, u / 0.3);
    const here = s.x.clone().lerp(s.next, move).normalize();
    this.dot.position.copy(lift(here));
    this.dArrow.set(lift(s.x), lift(s.x).addScaledVector(s.d, scale), 1 - 0.5 * move);
    const carry = Math.min(1, Math.max(0, (u - 0.3) / 0.3));
    const vec = s.carried.clone().lerp(s.transported, carry);
    this.ghost.set(lift(s.next), lift(s.next).addScaledVector(vec, scale), u > 0.3 ? 1 : 0);
    this.drop.setPoints([lift(s.next).addScaledVector(s.carried, scale), lift(s.next).addScaledVector(s.transported, scale)]);
    this.drop.setOpacity(u > 0.3 && u < 0.75 ? 0.8 : 0);
    const combine = Math.min(1, Math.max(0, (u - 0.6) / 0.3));
    this.gArrow.set(lift(s.next), lift(s.next).addScaledVector(s.g, scale), combine);
    this.newArrow.set(lift(s.next), lift(s.next).addScaledVector(s.dNext, scale * combine), combine);
  }
}
