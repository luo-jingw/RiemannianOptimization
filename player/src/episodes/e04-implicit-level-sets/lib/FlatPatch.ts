import * as THREE from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import type { StageLayer } from "../../../layers/StageLayer";

/**
 * Unlit translucent parametric patch (u, v) ∈ [0, 1]² → R³. Used for colored chart domains on a sphere,
 * where lit shading would make patches facing away from the key light hard to see.
 * Drawn after the default transparent objects (renderOrder 3) so it stays visible on top of a translucent surface.
 */
export class FlatPatch {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;

  constructor(stage: StageLayer, fn: (u: number, v: number, target: THREE.Vector3) => void, color: string, segments = 48) {
    this.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false });
    this.mesh = new THREE.Mesh(new ParametricGeometry(fn, segments, segments), this.material);
    this.mesh.renderOrder = 3;
    stage.root.add(this.mesh);
  }

  setOpacity(o: number): void {
    this.material.opacity = Math.max(0, Math.min(1, o));
    this.mesh.visible = this.material.opacity > 0.001;
  }

  setColor(color: string): void {
    this.material.color.set(color);
  }
}
