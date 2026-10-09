import * as THREE from "three";
import type { StageLayer } from "../layers/StageLayer";
import { Polyline } from "./Polyline";

/** Arrow from `from` to `to`. 2D uses a flat triangle head; 3D uses a cone head. */
export class Arrow {
  private readonly shaft: Polyline;
  private readonly head: THREE.Mesh;
  private readonly headMaterial: THREE.MeshBasicMaterial;
  private readonly headLength: number;
  private readonly mode: "2d" | "3d";
  private opacity = 1;

  constructor(stage: StageLayer, from: THREE.Vector3, to: THREE.Vector3, color: string,
              opts: { width?: number; headLength?: number; mode?: "2d" | "3d"; depthTest?: boolean } = {}) {
    this.mode = opts.mode ?? "2d";
    this.headLength = opts.headLength ?? 0.22;
    this.shaft = new Polyline(stage, [from, to], { color, width: opts.width ?? 4, depthTest: opts.depthTest });
    this.headMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true,
      depthTest: opts.depthTest ?? true });
    const geometry = this.mode === "2d"
      ? new THREE.ShapeGeometry(new THREE.Shape([
        new THREE.Vector2(0, 0), new THREE.Vector2(-1, 0.42), new THREE.Vector2(-1, -0.42)]))
      : new THREE.ConeGeometry(0.4, 1, 20).translate(0, -0.5, 0).rotateZ(-Math.PI / 2);
    this.head = new THREE.Mesh(geometry, this.headMaterial);
    this.head.renderOrder = 9;
    stage.root.add(this.head);
    this.set(from, to);
  }

  set(from: THREE.Vector3, to: THREE.Vector3): void {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const hl = Math.min(this.headLength, len * 0.45);
    const shaftEnd = len > 1e-9 ? to.clone().sub(dir.clone().multiplyScalar(hl / len * 0.8)) : to.clone();
    this.shaft.setPoints([from, shaftEnd]);
    this.head.position.copy(to);
    this.head.scale.setScalar(Math.max(hl, 1e-6));
    if (len > 1e-9) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
      this.head.quaternion.copy(q);
    }
    const visible = len > 1e-6 && this.opacity > 0.001;
    this.head.visible = visible;
    this.shaft.object.visible = visible;
  }

  setOpacity(o: number): void {
    this.opacity = Math.max(0, Math.min(1, o));
    this.shaft.setOpacity(this.opacity);
    this.headMaterial.opacity = this.opacity;
    this.head.visible = this.opacity > 0.001;
  }

  setColor(color: string): void {
    this.shaft.setColor(color);
    this.headMaterial.color.set(color);
  }
}
