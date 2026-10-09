import * as THREE from "three";
import type { StageLayer } from "../layers/StageLayer";

/** A filled point. In 2D a disc of radius `radius` world units; in 3D a small sphere. */
export class Dot {
  readonly object: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;

  constructor(stage: StageLayer, position: THREE.Vector3, color: string, radius = 0.08, mode: "2d" | "3d" = "2d", hollow = false) {
    this.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 1 });
    const geometry = mode === "2d"
      ? (hollow ? new THREE.RingGeometry(radius * 0.6, radius, 40) : new THREE.CircleGeometry(radius, 40))
      : new THREE.SphereGeometry(radius, 24, 16);
    this.object = new THREE.Mesh(geometry, this.material);
    this.object.position.copy(position);
    this.object.renderOrder = 10;
    stage.root.add(this.object);
  }

  setPosition(p: THREE.Vector3): void {
    this.object.position.copy(p);
  }

  setOpacity(o: number): void {
    this.material.opacity = Math.max(0, Math.min(1, o));
    this.object.visible = this.material.opacity > 0.001;
  }

  setScale(s: number): void {
    this.object.scale.setScalar(s);
  }

  setColor(color: string): void {
    this.material.color.set(color);
  }
}
