import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, disc, orthoCamera, saw, tileScene } from "./montage-kit";

/** Open sets and convergence: shrinking balls around x, each eventually containing the sequence x_k. */
export class ConvergenceViz implements MiniViz {
  readonly label = "Open sets · convergence";
  readonly scene = tileScene();
  readonly camera = orthoCamera(4.5);
  private readonly balls: MiniLine[] = [];
  private readonly points: THREE.Mesh[] = [];
  private readonly x = new THREE.Vector2(0.4, 0.05);
  private readonly blob: THREE.Mesh;

  constructor() {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const r = 1.55 + 0.22 * Math.sin(3 * a + 0.4) + 0.12 * Math.cos(5 * a);
      const px = r * Math.cos(a) * 1.35;
      const py = r * Math.sin(a) * 0.95;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    this.blob = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.blue), transparent: true, opacity: 0.16 }));
    this.scene.add(this.blob);
    const outline = new MiniLine(this.scene, Palette.blue, 2.5, 0.8);
    outline.setPoints(shape.getPoints(96).map((p) => new THREE.Vector3(p.x, p.y, 0.01)));
    for (let k = 0; k < 4; k++) this.balls.push(new MiniLine(this.scene, Palette.green, 2.5, 1, true));
    for (let k = 0; k < 14; k++) this.points.push(disc(this.scene, Palette.yellow, 0.045));
    const center = disc(this.scene, Palette.orange, 0.075);
    center.position.set(this.x.x, this.x.y, 0.2);
  }

  update(t: number): void {
    const u = saw(t, 4.0);
    // sequence x_k → x along a spiral, revealed over the loop
    const shown = Math.floor(u * 16);
    this.points.forEach((m, k) => {
      const r = 1.9 * Math.pow(0.72, k);
      m.position.set(this.x.x + r * Math.cos(k * 2.3), this.x.y + r * 0.8 * Math.sin(k * 2.3), 0.1);
      (m.material as THREE.MeshBasicMaterial).opacity = k < shown ? 1 : 0;
    });
    // nested balls shrinking around x
    this.balls.forEach((b, k) => {
      const r = 1.2 * Math.pow(0.5, k + 2 * u);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) pts.push(new THREE.Vector3(this.x.x + r * Math.cos((i / 64) * 2 * Math.PI), this.x.y + r * Math.sin((i / 64) * 2 * Math.PI), 0.05));
      b.setPoints(pts);
      b.setOpacity(0.85 - 0.18 * k);
    });
  }
}
