import * as THREE from "three";
import type { StageLayer } from "../layers/StageLayer";

/** Filled polygon in the z=0 plane (open sets, balls, chart domains). */
export class Region {
  readonly object: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;

  constructor(stage: StageLayer, points: THREE.Vector3[], color: string, opacity = 0.25, z = -0.01) {
    this.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity,
      depthWrite: false, side: THREE.DoubleSide });
    this.object = new THREE.Mesh(this.makeGeometry(points), this.material);
    this.object.position.z = z;
    stage.root.add(this.object);
  }

  private makeGeometry(points: THREE.Vector3[]): THREE.ShapeGeometry {
    return new THREE.ShapeGeometry(new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.y))));
  }

  setPoints(points: THREE.Vector3[]): void {
    this.object.geometry.dispose();
    this.object.geometry = this.makeGeometry(points);
  }

  setOpacity(o: number): void {
    this.material.opacity = Math.max(0, o);
    this.object.visible = o > 0.001;
  }

  setColor(color: string): void {
    this.material.color.set(color);
  }
}
