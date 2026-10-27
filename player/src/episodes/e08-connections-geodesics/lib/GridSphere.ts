import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Polyline } from "../../../primitives/Polyline";

/** Opaque unit sphere with latitude and longitude lines; opaque so lines on the far side are depth-hidden. */
export class GridSphere {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly grid: Polyline[] = [];

  constructor(stage: StageLayer, color = "#2f5f9e") {
    const geometry = new THREE.SphereGeometry(1, 96, 72);
    geometry.rotateX(Math.PI / 2);
    this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.65, metalness: 0,
      transparent: true, opacity: 1, depthWrite: true });
    this.mesh = new THREE.Mesh(geometry, this.material);
    stage.root.add(this.mesh);
    const r = 1.003;
    for (let k = 1; k < 6; k++) {
      const th = (k * Math.PI) / 6;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const ph = (2 * Math.PI * i) / 128;
        pts.push(new THREE.Vector3(r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th)));
      }
      this.grid.push(new Polyline(stage, pts, { color: "#c9d6ee", width: 1.1, opacity: 0.3 }));
    }
    for (let k = 0; k < 12; k++) {
      const ph = (k * Math.PI) / 6;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const th = (Math.PI * i) / 96;
        pts.push(new THREE.Vector3(r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th)));
      }
      this.grid.push(new Polyline(stage, pts, { color: "#c9d6ee", width: 1.1, opacity: 0.3 }));
    }
  }

  setOpacity(o: number, gridOpacity = 1): void {
    this.material.opacity = o;
    this.material.depthWrite = o > 0.95;
    this.mesh.visible = o > 0.001;
    this.grid.forEach((g) => g.setOpacity(0.3 * o * gridOpacity));
  }
}
