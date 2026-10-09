import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

/** Unit sphere with per-vertex colors given by `colorAt(point)`; front faces only. */
export class ColoredSphere {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly baseOpacity: number;

  constructor(stage: StageLayer, colorAt: (p: THREE.Vector3) => THREE.Color, opacity: number) {
    const geometry = new THREE.SphereGeometry(1, 96, 64);
    const pos = geometry.getAttribute("position");
    const colors: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      const c = colorAt(v);
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.baseOpacity = opacity;
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.0,
      transparent: true, opacity, side: THREE.FrontSide, depthWrite: false });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = -1;
    stage.root.add(this.mesh);
  }

  /** o scales the base opacity; depthWrite hides lines behind the sphere when true. */
  set(o: number, depthWrite: boolean): void {
    this.material.opacity = this.baseOpacity * o;
    this.material.depthWrite = depthWrite;
    this.mesh.visible = o > 0.001;
  }
}
