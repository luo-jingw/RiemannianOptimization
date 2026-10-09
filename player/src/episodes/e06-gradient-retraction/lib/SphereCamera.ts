import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

/** Camera placement for a 3D view of an object near the origin. */
export interface OrbitView {
  /** Azimuth of the camera position, degrees (0 = +x axis). */
  azDeg: number;
  /** Elevation above the xy-plane, degrees. */
  elDeg: number;
  distance: number;
  fovDeg: number;
  /** Point the view is centered on before the screen shift. */
  center: THREE.Vector3;
  /** Horizontal screen shift of the center, in world units along the camera's right vector (positive moves the object left). */
  shift: number;
  /** Vertical shift along the camera's up vector (positive moves the object down). */
  lift: number;
}

/** Sets a perspective view orbiting `center`; call every frame from draw(). */
export function setOrbitView(stage: StageLayer, v: OrbitView): void {
  const az = (v.azDeg * Math.PI) / 180;
  const el = (v.elDeg * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el));
  const right = new THREE.Vector3(-Math.sin(az), Math.cos(az), 0);
  const up = right.clone().cross(dir).multiplyScalar(-1).normalize();
  const target = v.center.clone().add(right.multiplyScalar(v.shift)).add(up.multiplyScalar(v.lift));
  const position = target.clone().add(dir.multiplyScalar(v.distance));
  stage.setView3D(position, target, v.fovDeg);
}

/** Linear blend of two orbit views (angles blended linearly). */
export function blendView(a: OrbitView, b: OrbitView, s: number): OrbitView {
  const l = (p: number, q: number): number => p + (q - p) * s;
  return {
    azDeg: l(a.azDeg, b.azDeg), elDeg: l(a.elDeg, b.elDeg), distance: l(a.distance, b.distance),
    fovDeg: l(a.fovDeg, b.fovDeg), center: a.center.clone().lerp(b.center, s), shift: l(a.shift, b.shift),
    lift: l(a.lift, b.lift),
  };
}
