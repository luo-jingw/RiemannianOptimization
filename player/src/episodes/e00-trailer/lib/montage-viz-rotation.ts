import * as THREE from "three";
import { MiniArrow, MiniLine, type MiniViz, TILE_PX_H, TILE_PX_W, softLights, tileScene } from "./montage-kit";

/** Rotations: a frame R(t) ∈ SO(3) turns smoothly; its axis tips trace curves on the unit sphere. */
export class RotationViz implements MiniViz {
  readonly label = "Rotations · SO(3)";
  readonly scene = tileScene();
  readonly camera = new THREE.PerspectiveCamera(30, TILE_PX_W / TILE_PX_H, 0.1, 50);
  private readonly axes: MiniArrow[];
  private readonly trails: MiniLine[];
  private static readonly COLORS = ["#ff6b6b", "#69db7c", "#5aa9ff"];

  constructor() {
    softLights(this.scene);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#5aa9ff"), transparent: true, opacity: 0.06, depthWrite: false }));
    this.scene.add(shell);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 16, 10)),
      new THREE.LineBasicMaterial({ color: new THREE.Color("#2b3a60"), transparent: true, opacity: 0.35 }));
    this.scene.add(wire);
    this.axes = RotationViz.COLORS.map((c) => new MiniArrow(this.scene, c, 0.03));
    this.trails = RotationViz.COLORS.map((c) => new MiniLine(this.scene, c, 2.5, 0.75));
    this.camera.position.set(2.8, -3.6, 2.2);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld(true);
  }

  private rotation(t: number): THREE.Quaternion {
    const axis = new THREE.Vector3(Math.sin(0.4 * t), Math.cos(0.3 * t), 0.8).normalize();
    return new THREE.Quaternion().setFromAxisAngle(axis, 0.9 * t);
  }

  update(t: number): void {
    const basis = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const q = this.rotation(t);
    this.axes.forEach((a, i) => a.set(new THREE.Vector3(), basis[i].clone().applyQuaternion(q)));
    this.trails.forEach((trail, i) => {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 40; k++) pts.push(basis[i].clone().applyQuaternion(this.rotation(t - 1.6 + (1.6 * k) / 40)));
      trail.setPoints(pts);
    });
  }
}
