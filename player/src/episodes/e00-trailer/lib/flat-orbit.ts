import * as THREE from "three";

/** Camera pose on an orbit around a target. Angles in degrees; z is up. */
export interface OrbitPose {
  target: THREE.Vector3;
  /** Azimuth of the camera around the target, measured from +x toward +y. */
  azimuth: number;
  /** Elevation above the target's horizontal plane (90 = straight down). */
  elevation: number;
  distance: number;
  fov: number;
}

/** World position of the camera for an orbit pose. */
export function orbitPosition(pose: OrbitPose): THREE.Vector3 {
  const az = (pose.azimuth * Math.PI) / 180;
  const el = (pose.elevation * Math.PI) / 180;
  return new THREE.Vector3(
    pose.target.x + pose.distance * Math.cos(el) * Math.cos(az),
    pose.target.y + pose.distance * Math.cos(el) * Math.sin(az),
    pose.target.z + pose.distance * Math.sin(el),
  );
}
