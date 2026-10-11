import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniArrow, MiniLine, type MiniViz, TILE_PX_H, TILE_PX_W, disc, softLights, tileScene } from "./montage-kit";

const A = [1, 2.2, 4];                            // f(x) = xᵀ diag(A) x on the unit sphere
const LEVELS = [0.5, 1, 1.5];
const RING = 64;

/**
 * Connections and the Riemannian Hessian: as p moves on the sphere, the tangent plane at p carries the level sets of
 * the second-order model ½⟨Hess f(p)[v], v⟩ (ellipses) and its eigen-directions.
 */
export class HessianViz implements MiniViz {
  readonly label = "Connections · Riemannian Hessian";
  readonly scene = tileScene();
  readonly camera = new THREE.PerspectiveCamera(30, TILE_PX_W / TILE_PX_H, 0.1, 50);
  private readonly disk: THREE.Mesh;
  private readonly levels: MiniLine[] = [];
  private readonly axes: MiniArrow[] = [];
  private readonly dot: THREE.Mesh;

  constructor() {
    softLights(this.scene);
    const geo = new THREE.SphereGeometry(1, 72, 54);
    const pos = geo.getAttribute("position");
    const lo = new THREE.Color("#0d2b5a");
    const hi = new THREE.Color("#4f8fe0");
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const f = A[0] * v.x * v.x + A[1] * v.y * v.y + A[2] * v.z * v.z;
      const c = lo.clone().lerp(hi, (f - A[0]) / (A[2] - A[0]));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
    this.disk = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.green), transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    this.scene.add(this.disk);
    for (let k = 0; k < LEVELS.length; k++) this.levels.push(new MiniLine(this.scene, Palette.yellow, 2.5, 0.9 - 0.2 * k));
    this.axes.push(new MiniArrow(this.scene, Palette.orange, 0.014), new MiniArrow(this.scene, Palette.pink, 0.014));
    this.dot = disc(this.scene, Palette.orange, 0.035, true);
    this.camera.position.set(4.2, -1.4, 1.8);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0.3, 0, 0);
    this.camera.updateMatrixWorld(true);
  }

  update(t: number): void {
    // p circles the minimizer e₁ at a fixed distance
    const ang = 0.6 * t;
    const p = new THREE.Vector3(Math.cos(0.5), Math.sin(0.5) * Math.cos(ang), Math.sin(0.5) * Math.sin(ang)).normalize();
    const e1 = new THREE.Vector3(0, -Math.sin(ang), Math.cos(ang)).addScaledVector(p, 0).normalize();
    e1.addScaledVector(p, -e1.dot(p)).normalize();
    const e2 = p.clone().cross(e1).normalize();
    // Riemannian Hessian of xᵀAx on the sphere: Hess f(p)[v] = 2 P_p(Av) − 2 f(p) v, in the basis (e1, e2)
    const fp = A[0] * p.x * p.x + A[1] * p.y * p.y + A[2] * p.z * p.z;
    const av = (v: THREE.Vector3): THREE.Vector3 => new THREE.Vector3(A[0] * v.x, A[1] * v.y, A[2] * v.z);
    const h11 = 2 * (av(e1).dot(e1) - fp);
    const h12 = 2 * av(e1).dot(e2);
    const h22 = 2 * (av(e2).dot(e2) - fp);
    const tr = (h11 + h22) / 2;
    const det = Math.sqrt(((h11 - h22) / 2) ** 2 + h12 * h12);
    const l1 = Math.max(0.05, tr + det);
    const l2 = Math.max(0.05, tr - det);
    const th = 0.5 * Math.atan2(2 * h12, h11 - h22);
    const u1 = e1.clone().multiplyScalar(Math.cos(th)).addScaledVector(e2, Math.sin(th));
    const u2 = e1.clone().multiplyScalar(-Math.sin(th)).addScaledVector(e2, Math.cos(th));
    const base = p.clone().multiplyScalar(1.004);
    this.disk.position.copy(base);
    this.disk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p);
    this.dot.position.copy(p).multiplyScalar(1.01);
    const scale = 0.16;
    LEVELS.forEach((c, k) => {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= RING; s++) {
        const a = (2 * Math.PI * s) / RING;
        pts.push(base.clone().addScaledVector(u1, scale * Math.sqrt((2 * c) / l1) * Math.cos(a))
          .addScaledVector(u2, scale * Math.sqrt((2 * c) / l2) * Math.sin(a)).addScaledVector(p, 0.006));
      }
      this.levels[k].setPoints(pts);
    });
    this.axes[0].set(base, base.clone().addScaledVector(u1, 0.5));
    this.axes[1].set(base, base.clone().addScaledVector(u2, 0.5 * Math.sqrt(l2 / l1) + 0.15));
  }
}
