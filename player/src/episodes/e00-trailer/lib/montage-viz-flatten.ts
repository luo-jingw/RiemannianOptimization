import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, orthoCamera, pingPong, tileScene } from "./montage-kit";

/** Implicit functions: F(x, y) = (x, x² + y² − 1) straightens the circle onto the axis v = 0. */
export class FlattenViz implements MiniViz {
  readonly label = "Inverse & implicit functions";
  readonly scene = tileScene();
  readonly camera = orthoCamera(3.8, 0, 0.35);
  private readonly circle = new MiniLine(this.scene, Palette.blue, 5);
  private readonly grid: { pts: THREE.Vector2[]; line: MiniLine }[] = [];

  constructor() {
    const axis = new MiniLine(this.scene, "#6a7698", 2);
    axis.setPoints([new THREE.Vector3(-2.2, 0, 0), new THREE.Vector3(2.2, 0, 0)]);
    for (let c = 0.25; c <= 1.31; c += 0.35) {
      const pts: THREE.Vector2[] = [];
      const w = Math.min(1.6, Math.sqrt(Math.max(0.01, 2.2 - c * c)));
      for (let i = 0; i <= 50; i++) pts.push(new THREE.Vector2(-w + (2 * w * i) / 50, c));
      this.grid.push({ pts, line: new MiniLine(this.scene, "#4f6496", 2) });
    }
  }

  update(t: number): void {
    const s = pingPong(t, 4.2);
    const map = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, (1 - s) * y + s * (x * x + y * y - 1), 0.02);
    const cp: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * 2 * Math.PI;
      cp.push(map(Math.cos(a), Math.sin(a)));
    }
    this.circle.setPoints(cp);
    this.circle.setColor(s > 0.95 ? Palette.yellow : Palette.blue);
    for (const g of this.grid) g.line.setPoints(g.pts.map((q) => map(q.x, q.y)));
  }
}
