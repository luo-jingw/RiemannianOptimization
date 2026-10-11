import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, disc, orthoCamera, pingPong, tileScene } from "./montage-kit";

/** Charts on the circle: a point in the overlap of two charts has two coordinates, linked by the transition map. */
export class ChartsViz implements MiniViz {
  readonly label = "Charts · transition maps";
  readonly scene = tileScene();
  readonly camera = orthoCamera(4.6, 0.5, 0.15);
  private readonly p: THREE.Mesh;
  private readonly px: THREE.Mesh;
  private readonly py: THREE.Mesh;
  private readonly dropX = new MiniLine(this.scene, Palette.blue, 2, 0.8, true);
  private readonly dropY = new MiniLine(this.scene, Palette.purple, 2, 0.8, true);
  private readonly c = new THREE.Vector2(0, 0.6);
  private readonly R = 1.2;

  constructor() {
    const circle = new MiniLine(this.scene, "#3a4a70", 2.5);
    circle.setPoints(this.arc(0, 2 * Math.PI, 0));
    const upper = new MiniLine(this.scene, Palette.blue, 7, 0.9);
    upper.setPoints(this.arc(0.05, Math.PI - 0.05, 0.01));
    const right = new MiniLine(this.scene, Palette.purple, 7, 0.9);
    right.setPoints(this.arc(-Math.PI / 2 + 0.05, Math.PI / 2 - 0.05, 0.02).map((v) => v.add(new THREE.Vector3(0, 0, 0))));
    const xAxis = new MiniLine(this.scene, Palette.blue, 4, 0.9);
    xAxis.setPoints([new THREE.Vector3(-this.R, -1.35, 0), new THREE.Vector3(this.R, -1.35, 0)]);
    const yAxis = new MiniLine(this.scene, Palette.purple, 4, 0.9);
    yAxis.setPoints([new THREE.Vector3(2.4, this.c.y - this.R, 0), new THREE.Vector3(2.4, this.c.y + this.R, 0)]);
    this.p = disc(this.scene, Palette.orange, 0.08);
    this.px = disc(this.scene, Palette.blue, 0.07);
    this.py = disc(this.scene, Palette.purple, 0.07);
  }

  private arc(a0: number, a1: number, z: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const a = a0 + ((a1 - a0) * i) / 80;
      pts.push(new THREE.Vector3(this.c.x + this.R * Math.cos(a), this.c.y + this.R * Math.sin(a), z));
    }
    return pts;
  }

  update(t: number): void {
    const a = 0.2 + 1.15 * pingPong(t, 4.4);          // stays inside the overlap (first quadrant)
    const P = new THREE.Vector3(this.c.x + this.R * Math.cos(a), this.c.y + this.R * Math.sin(a), 0.2);
    this.p.position.copy(P);
    this.px.position.set(P.x, -1.35, 0.2);
    this.py.position.set(2.4, P.y, 0.2);
    this.dropX.setPoints([P.clone(), new THREE.Vector3(P.x, -1.35, 0.1)]);
    this.dropY.setPoints([P.clone(), new THREE.Vector3(2.4, P.y, 0.1)]);
  }
}
