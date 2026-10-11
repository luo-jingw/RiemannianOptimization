import * as THREE from "three";
import { Palette } from "../../../primitives/Palette";
import { MiniLine, type MiniViz, TILE_PX_H, TILE_PX_W, disc, saw, softLights, tileScene } from "./montage-kit";

const RAYS = 16;
const SAMPLES = 60;
const PERIOD = 4.5;

/**
 * Geodesics and the exponential map: geodesics leave p in every direction at unit speed; the wavefront
 * exp_p(r · S¹) is a geodesic circle that grows to the equator and closes again at the antipode (a conjugate point).
 */
export class GeodesicsViz implements MiniViz {
  readonly label = "Geodesics · exponential map";
  readonly scene = tileScene();
  readonly camera = new THREE.PerspectiveCamera(30, TILE_PX_W / TILE_PX_H, 0.1, 50);
  private readonly p = new THREE.Vector3(-0.35, -0.2, 0.92).normalize();
  private readonly e1: THREE.Vector3;
  private readonly e2: THREE.Vector3;
  private readonly rays: MiniLine[] = [];
  private readonly front = new MiniLine(this.scene, Palette.orange, 4);
  private readonly tips: THREE.Mesh[] = [];

  constructor() {
    softLights(this.scene);
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#2c5fae"), roughness: 0.55, transparent: true, opacity: 0.55,
        depthWrite: false })));
    this.e1 = new THREE.Vector3(0, 0, 1).cross(this.p).normalize();
    this.e2 = this.p.clone().cross(this.e1).normalize();
    for (let k = 0; k < RAYS; k++) {
      this.rays.push(new MiniLine(this.scene, Palette.green, 2.5, 0.85));
      this.tips.push(disc(this.scene, Palette.yellow, 0.022, true));
    }
    disc(this.scene, Palette.orange, 0.045, true).position.copy(this.p).multiplyScalar(1.01);
    this.camera.position.set(2.6, -3.6, 1.6);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld(true);
  }

  private exp(dir: THREE.Vector3, r: number): THREE.Vector3 {
    return this.p.clone().multiplyScalar(Math.cos(r)).addScaledVector(dir, Math.sin(r)).multiplyScalar(1.006);
  }

  update(t: number): void {
    const u = Math.min(1, saw(t, PERIOD) * 1.15);
    const r = Math.PI * (u * u * (3 - 2 * u)) * 0.995;
    const front: THREE.Vector3[] = [];
    for (let k = 0; k < RAYS; k++) {
      const a = (2 * Math.PI * k) / RAYS + 0.1 * t;
      const dir = this.e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(this.e2, Math.sin(a));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= SAMPLES; i++) pts.push(this.exp(dir, (r * i) / SAMPLES));
      this.rays[k].setPoints(pts);
      this.tips[k].position.copy(pts[SAMPLES]);
    }
    for (let i = 0; i <= 96; i++) {
      const a = (2 * Math.PI * i) / 96;
      front.push(this.exp(this.e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(this.e2, Math.sin(a)), r).multiplyScalar(1.002));
    }
    this.front.setPoints(front);
  }
}
