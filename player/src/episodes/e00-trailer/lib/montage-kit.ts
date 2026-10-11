import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

/** Render-target size of one montage tile (the size it is shown at when large). */
export const TILE_PX_W = 1200;
export const TILE_PX_H = 675;

/** A live mini visualization drawn into its own render target. update(t) is a pure function of t. */
export interface MiniViz {
  readonly label: string;
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  update(t: number): void;
}

/** Fat line with its own resolution (it lives in an offscreen scene, not on the stage). */
export class MiniLine {
  readonly object: Line2;
  private geometry = new LineGeometry();
  private readonly material: LineMaterial;
  private segments = 1;
  private count = -1;

  constructor(parent: THREE.Object3D, color: string, width: number, opacity = 1, dashed = false) {
    this.material = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: width, transparent: true,
      opacity, dashed, dashSize: 0.08, gapSize: 0.06, worldUnits: false });
    this.material.resolution.set(TILE_PX_W, TILE_PX_H);
    this.object = new Line2(this.geometry, this.material);
    parent.add(this.object);
  }

  /** Full line; call setProgress afterwards for partial drawing. A new point count gets a new geometry. */
  setPoints(points: THREE.Vector3[]): void {
    if (points.length !== this.count && this.count !== -1) {
      this.geometry.dispose();
      this.geometry = new LineGeometry();
      this.object.geometry = this.geometry;
    }
    this.count = points.length;
    const flat: number[] = [];
    for (const p of points) flat.push(p.x, p.y, p.z);
    this.geometry.setPositions(flat);
    this.segments = Math.max(1, points.length - 1);
    this.geometry.instanceCount = this.segments;
    if (this.material.dashed) this.object.computeLineDistances();
  }

  setProgress(p: number): void {
    this.geometry.instanceCount = Math.round(Math.max(0, Math.min(1, p)) * this.segments);
  }

  setOpacity(o: number): void {
    this.material.opacity = o;
    this.object.visible = o > 0.001;
  }

  setColor(c: string): void {
    this.material.color.set(c);
  }
}

export function disc(parent: THREE.Object3D, color: string, radius: number, threeD = false): THREE.Mesh {
  const mesh = new THREE.Mesh(threeD ? new THREE.SphereGeometry(radius, 20, 14) : new THREE.CircleGeometry(radius, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true }));
  mesh.renderOrder = 5;
  parent.add(mesh);
  return mesh;
}

/** 3D arrow (cylinder shaft + cone head) from `from` to `to`. */
export class MiniArrow {
  readonly group = new THREE.Group();
  private readonly shaft: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;

  constructor(parent: THREE.Object3D, color: string, radius = 0.025) {
    this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.4, transparent: true,
      emissive: new THREE.Color(color), emissiveIntensity: 0.25 });
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), this.material);
    this.head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.6, 1, 16), this.material);
    this.group.add(this.shaft, this.head);
    parent.add(this.group);
  }

  set(from: THREE.Vector3, to: THREE.Vector3, opacity = 1): void {
    const d = to.clone().sub(from);
    const len = d.length();
    this.group.visible = len > 1e-4 && opacity > 0.001;
    if (!this.group.visible) return;
    const headLen = Math.min(0.14, len * 0.35);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    this.shaft.quaternion.copy(q);
    this.shaft.scale.set(1, len - headLen, 1);
    this.shaft.position.copy(from).addScaledVector(d, (len - headLen) / (2 * len));
    this.head.quaternion.copy(q);
    this.head.scale.set(1, headLen, 1);
    this.head.position.copy(from).addScaledVector(d, (len - headLen / 2) / len);
    this.material.opacity = opacity;
  }
}

export function orthoCamera(viewHeight: number, cx = 0, cy = 0): THREE.OrthographicCamera {
  const h = viewHeight / 2;
  const w = (h * TILE_PX_W) / TILE_PX_H;
  const cam = new THREE.OrthographicCamera(cx - w, cx + w, cy + h, cy - h, -50, 50);
  cam.position.set(0, 0, 10);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return cam;
}

export function tileScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0e1527");
  return scene;
}

export function softLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x101830, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, -2, 5);
  scene.add(key);
}

/** Ping-pong 0→1→0 with smooth ends, period `p` seconds. */
export function pingPong(t: number, p: number): number {
  const u = (t % p) / p;
  const v = u < 0.5 ? u * 2 : 2 - u * 2;
  return v * v * (3 - 2 * v);
}

/** Sawtooth 0→1 over period `p`. */
export function saw(t: number, p: number): number {
  return (t % p) / p;
}
