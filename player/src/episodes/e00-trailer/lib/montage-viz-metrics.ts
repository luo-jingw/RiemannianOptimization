import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, TILE_PX_H, TILE_PX_W, softLights, tileScene } from "./montage-kit";

const N = 7;                                      // ellipse grid is N × N over [-1.5, 1.5]²
const SPAN = 1.5;
const RING = 48;

/**
 * Riemannian metric as a tensor field: a breathing surface z = h(x, y) above its coordinate plane. Each point of the
 * plane carries the unit ball of the pulled-back metric g = I + ∇h ∇hᵀ, an ellipse squeezed along ∇h; the same
 * vectors drawn on the surface are unit circles.
 */
export class MetricsViz implements MiniViz {
  readonly label = "Riemannian metrics";
  readonly scene = tileScene();
  readonly camera = new THREE.PerspectiveCamera(30, TILE_PX_W / TILE_PX_H, 0.1, 50);
  private readonly surface: THREE.Mesh;
  private readonly ellipses: MiniLine[] = [];
  private readonly rings: MiniLine[] = [];

  constructor() {
    softLights(this.scene);
    this.surface = new THREE.Mesh(new THREE.PlaneGeometry(2 * SPAN + 0.4, 2 * SPAN + 0.4, 48, 48),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#2c5fae"), roughness: 0.6, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, depthWrite: false }));
    this.scene.add(this.surface);
    const grid = new MiniLine(this.scene, Palette.grid, 1.5);
    const g: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const v = -SPAN - 0.2 + ((2 * SPAN + 0.4) * i) / 6;
      g.push(new THREE.Vector3(v, -SPAN - 0.2, -1), new THREE.Vector3(v, SPAN + 0.2, -1), new THREE.Vector3(v, -SPAN - 0.2, -1));
    }
    grid.setPoints(g);
    for (let k = 0; k < N * N; k++) {
      this.ellipses.push(new MiniLine(this.scene, Palette.purple, 2.5));
      this.rings.push(new MiniLine(this.scene, Palette.orange, 2.5));
    }
    this.camera.position.set(3.6, -4.6, 3.4);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0, 0, -0.35);
    this.camera.updateMatrixWorld(true);
  }

  private height(x: number, y: number, a: number): number {
    return a * (Math.exp(-((x - 0.5) ** 2 + (y - 0.3) ** 2) / 0.5) - 0.8 * Math.exp(-((x + 0.7) ** 2 + (y + 0.6) ** 2) / 0.6));
  }

  update(t: number): void {
    const a = 0.55 + 0.35 * Math.sin(0.9 * t);
    const pos = this.surface.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, this.height(pos.getX(i), pos.getY(i), a));
    pos.needsUpdate = true;
    this.surface.geometry.computeVertexNormals();
    const r = 0.17;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = -SPAN + (2 * SPAN * i) / (N - 1);
        const y = -SPAN + (2 * SPAN * j) / (N - 1);
        const e = 1e-3;
        const gx = (this.height(x + e, y, a) - this.height(x - e, y, a)) / (2 * e);
        const gy = (this.height(x, y + e, a) - this.height(x, y - e, a)) / (2 * e);
        const gl = Math.hypot(gx, gy);
        const ux = gl > 1e-6 ? gx / gl : 1;
        const uy = gl > 1e-6 ? gy / gl : 0;
        const squeeze = 1 / Math.sqrt(1 + gl * gl);             // unit length along ∇h shrinks in coordinates
        const flat: THREE.Vector3[] = [];
        const lifted: THREE.Vector3[] = [];
        for (let s = 0; s <= RING; s++) {
          const th = (2 * Math.PI * s) / RING;
          const p = r * squeeze * Math.cos(th);
          const q = r * Math.sin(th);
          const dx = p * ux - q * uy;
          const dy = p * uy + q * ux;
          flat.push(new THREE.Vector3(x + dx, y + dy, -0.99));
          lifted.push(new THREE.Vector3(x + dx, y + dy, this.height(x, y, a) + gx * dx + gy * dy + 0.01));
        }
        this.ellipses[i * N + j].setPoints(flat);
        this.rings[i * N + j].setPoints(lifted);
      }
    }
  }
}
