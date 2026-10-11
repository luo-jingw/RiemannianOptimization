import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, disc, orthoCamera, saw, tileScene } from "./montage-kit";

/** Contraction mapping: the cobweb of x ← φ(x) = ½ cos x closes in on the unique fixed point. */
export class CobwebViz implements MiniViz {
  readonly label = "Contraction mapping";
  readonly scene = tileScene();
  readonly camera = orthoCamera(3.6, 0.35, 0.25);
  private readonly web = new MiniLine(this.scene, Palette.orange, 3);
  private readonly webPts: THREE.Vector3[] = [];
  private readonly head: THREE.Mesh;

  constructor() {
    const phi = (x: number): number => 0.5 * Math.cos(x) + 0.05;
    const axes = new MiniLine(this.scene, "#6a7698", 2);
    axes.setPoints([new THREE.Vector3(-1.6, 0, 0), new THREE.Vector3(2.4, 0, 0)]);
    const yAxis = new MiniLine(this.scene, "#6a7698", 2);
    yAxis.setPoints([new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(0, 1.7, 0)]);
    const diag = new MiniLine(this.scene, "#8a94b0", 2, 0.7, true);
    diag.setPoints([new THREE.Vector3(-1.2, -1.2, 0), new THREE.Vector3(1.7, 1.7, 0)]);
    const curve = new MiniLine(this.scene, Palette.blue, 4);
    const cp: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = -1.6 + (4.0 * i) / 120;
      cp.push(new THREE.Vector3(x, phi(x), 0.01));
    }
    curve.setPoints(cp);
    let x = 2.1;
    this.webPts.push(new THREE.Vector3(x, 0, 0.05));
    for (let k = 0; k < 9; k++) {
      const y = phi(x);
      this.webPts.push(new THREE.Vector3(x, y, 0.05), new THREE.Vector3(y, y, 0.05));
      x = y;
    }
    this.web.setPoints(this.webPts);
    this.head = disc(this.scene, Palette.yellow, 0.06);
  }

  update(t: number): void {
    const u = Math.min(1, saw(t, 4.5) * 1.25);
    this.web.setPoints(this.webPts);
    this.web.setProgress(u);
    const idx = Math.min(this.webPts.length - 1, Math.round(u * (this.webPts.length - 1)));
    this.head.position.copy(this.webPts[idx]).setZ(0.1);
  }
}
