import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniArrow, MiniLine, type MiniViz, TILE_PX_H, TILE_PX_W, disc, softLights, tileScene } from "./montage-kit";

/** Tangent space: velocities of curves through p sweep out the tangent plane T_pS². */
export class TangentViz implements MiniViz {
  readonly label = "Tangent spaces";
  readonly scene = tileScene();
  readonly camera = new THREE.PerspectiveCamera(32, TILE_PX_W / TILE_PX_H, 0.1, 50);
  private readonly p = new THREE.Vector3(0.35, -0.45, 0.82).normalize();
  private readonly curves: MiniLine[] = [];
  private readonly arrows: MiniArrow[] = [];
  private readonly plane: THREE.Mesh;
  private readonly e1: THREE.Vector3;
  private readonly e2: THREE.Vector3;

  constructor() {
    softLights(this.scene);
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#2c5fae"), roughness: 0.55, metalness: 0.05 })));
    this.e1 = new THREE.Vector3(0, 0, 1).cross(this.p).normalize();
    this.e2 = this.p.clone().cross(this.e1).normalize();
    this.plane = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.green), transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    this.plane.position.copy(this.p).multiplyScalar(1.002);
    this.plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.p);
    this.scene.add(this.plane);
    for (let k = 0; k < 6; k++) {
      this.curves.push(new MiniLine(this.scene, k % 2 ? Palette.yellow : Palette.orange, 3));
      this.arrows.push(new MiniArrow(this.scene, Palette.green, 0.018));
    }
    disc(this.scene, Palette.orange, 0.045, true).position.copy(this.p).multiplyScalar(1.01);
    this.camera.position.set(1.2, -3.4, 2.6);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(this.p.clone().multiplyScalar(0.5));
    this.camera.updateMatrixWorld(true);
  }

  update(t: number): void {
    const spin = 0.35 * t;
    this.curves.forEach((curve, k) => {
      const ang = spin + (k * Math.PI) / 6;
      const dir = this.e1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(this.e2, Math.sin(ang));
      // great circle through p with initial velocity `dir`
      const pts: THREE.Vector3[] = [];
      for (let i = -24; i <= 24; i++) {
        const s = (i / 24) * 0.9;
        pts.push(this.p.clone().multiplyScalar(Math.cos(s)).addScaledVector(dir, Math.sin(s)).multiplyScalar(1.004));
      }
      curve.setPoints(pts);
      const grow = 0.55 + 0.12 * Math.sin(1.3 * t + k);
      this.arrows[k].set(this.p.clone().multiplyScalar(1.01), this.p.clone().multiplyScalar(1.01).addScaledVector(dir, grow));
    });
  }
}
