import * as THREE from "three";
import type { StageLayer } from "../layers/StageLayer";

/** Translucent square patch through `point` with unit normal `normal`, half-size `size`. */
export class TangentPlane {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly edge: THREE.LineSegments;
  private readonly edgeMaterial: THREE.LineBasicMaterial;

  constructor(stage: StageLayer, color: string, size = 0.8) {
    const geometry = new THREE.PlaneGeometry(2 * size, 2 * size);
    this.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.28,
      side: THREE.DoubleSide, depthWrite: false });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.edgeMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.8 });
    this.edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), this.edgeMaterial);
    this.mesh.add(this.edge);
    stage.root.add(this.mesh);
  }

  place(point: THREE.Vector3, normal: THREE.Vector3): void {
    this.mesh.position.copy(point);
    this.mesh.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize()));
  }

  setOpacity(o: number): void {
    this.material.opacity = 0.28 * o;
    this.edgeMaterial.opacity = 0.8 * o;
    this.mesh.visible = o > 0.001;
  }
}
