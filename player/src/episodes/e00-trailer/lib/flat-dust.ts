import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { seeded } from "../../../primitives/Seeded";

/** Fixed field of faint motes in a shell around the scene; parallax under camera motion gives depth. */
export class DustField {
  readonly points: THREE.Points;
  private readonly material: THREE.PointsMaterial;

  constructor(stage: StageLayer, seed: number, count: number, innerRadius: number, outerRadius: number,
              center: THREE.Vector3, color: string) {
    const rand = seeded(seed);
    const pos: number[] = [];
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = innerRadius + (outerRadius - innerRadius) * Math.pow(rand(), 0.7);
      pos.push(center.x + r * s * Math.cos(phi), center.y + r * s * Math.sin(phi), center.z + r * u);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.material = new THREE.PointsMaterial({ color: new THREE.Color(color), size: 2.2, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false });
    this.points = new THREE.Points(geometry, this.material);
    this.points.renderOrder = -10;
    stage.root.add(this.points);
  }

  setOpacity(o: number): void {
    this.material.opacity = Math.max(0, Math.min(1, o));
    this.points.visible = this.material.opacity > 0.001;
  }
}
