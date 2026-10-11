import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, disc, orthoCamera, pingPong, tileScene } from "./montage-kit";

/** Inverse function theorem: a smooth map warps the grid; near x0 it stays one-to-one, a small disk maps to a blob. */
export class InverseViz implements MiniViz {
  readonly label = "Inverse function theorem";
  readonly scene = tileScene();
  readonly camera = orthoCamera(4.2);
  private readonly lines: { pts: THREE.Vector2[]; line: MiniLine }[] = [];
  private readonly disk: MiniLine;
  private readonly x0 = new THREE.Vector2(0.45, 0.3);
  private readonly dot: THREE.Mesh;

  constructor() {
    for (let k = -6; k <= 6; k++) {
      const c = k * 0.27;
      const h: THREE.Vector2[] = [];
      const v: THREE.Vector2[] = [];
      for (let i = 0; i <= 60; i++) {
        const s = -1.62 + (3.24 * i) / 60;
        h.push(new THREE.Vector2(s * 1.5, c));
        v.push(new THREE.Vector2(c * 1.5, s));
      }
      this.lines.push({ pts: h, line: new MiniLine(this.scene, "#4f6496", 1.8, 0.9) });
      this.lines.push({ pts: v, line: new MiniLine(this.scene, "#4f6496", 1.8, 0.9) });
    }
    this.disk = new MiniLine(this.scene, Palette.green, 3.5);
    this.dot = disc(this.scene, Palette.orange, 0.06);
  }

  private F(p: THREE.Vector2, s: number): THREE.Vector3 {
    const x = p.x + s * 0.38 * Math.sin(1.7 * p.y) + s * 0.12 * p.x * p.y;
    const y = p.y + s * 0.38 * Math.sin(1.4 * p.x);
    return new THREE.Vector3(x, y, 0);
  }

  update(t: number): void {
    const s = pingPong(t, 4.0);
    for (const l of this.lines) l.line.setPoints(l.pts.map((q) => this.F(q, s)));
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * 2 * Math.PI;
      pts.push(this.F(new THREE.Vector2(this.x0.x + 0.32 * Math.cos(a), this.x0.y + 0.32 * Math.sin(a)), s).setZ(0.05));
    }
    this.disk.setPoints(pts);
    this.dot.position.copy(this.F(this.x0, s).setZ(0.1));
  }
}
