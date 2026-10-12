import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { costColor } from "./RayleighSphere";
import { rayleigh, retract, tangentFrame } from "./rayleigh";

/**
 * The tangent plane T_xS² at a fixed x, colored by the pullback s ↦ f(R_x(s)) (the cost "pulled back" from the
 * sphere), as a square of half-width `half` in the tangent frame. Unlit, so its colors match the cost scale.
 */
export class PullbackPlane {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;

  constructor(stage: StageLayer, x: THREE.Vector3, half: number) {
    const n = 48;
    const { east, north } = tangentFrame(x);
    const positions: number[] = [];
    const colors: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const a = -half + (2 * half * i) / n;
        const b = -half + (2 * half * j) / n;
        const s = east.clone().multiplyScalar(a).addScaledVector(north, b);
        const p = x.clone().multiplyScalar(1.004).add(s);
        positions.push(p.x, p.y, p.z);
        const c = costColor(rayleigh(retract(x, s)));
        colors.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const k = i * (n + 1) + j;
        index.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(index);
    geometry.computeBoundingSphere();
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 5;
    stage.root.add(this.mesh);
  }

  setOpacity(o: number): void {
    this.material.opacity = o;
    this.mesh.visible = o > 0.001;
  }
}
