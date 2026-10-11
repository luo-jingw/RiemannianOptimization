import * as THREE from "three";
import { easeInOutCubic, lerp, ramp, smoothstep } from "../../../primitives/Easing";
import type { OrbitPose } from "./flat-orbit";

/** Azimuth drift of the slow orbit in degrees per second, shared by s01 and s02 so the cut is seamless. */
export const ORBIT_DRIFT = 1.1;
/** Length of s01 in seconds (4 bars at 80 BPM); flatCameraPose(FLAT_DURATION) is the first pose of s02. */
export const FLAT_DURATION = 12;

/**
 * Camera of s01: almost straight down over the contour map with a slow dolly-in (b0–b3),
 * then a tilt to 45° elevation (b3–b4).
 */
export function flatCameraPose(t: number): OrbitPose {
  const tilt = easeInOutCubic(ramp(8.6, 12, t));
  const azimuth = -104 + ORBIT_DRIFT * t;
  const elevation = lerp(lerp(86, 80, smoothstep(0, 9, t)), 44, tilt);
  const distance = lerp(lerp(15.0, 12.6, smoothstep(0, 9, t)), 10.2, tilt);
  // Shift the target toward the camera so the sheet sits above the caption band.
  const shift = lerp(0.95, 0.75, tilt);
  const az = (azimuth * Math.PI) / 180;
  const target = new THREE.Vector3(Math.cos(az) * shift, Math.sin(az) * shift, 0);
  return { target, azimuth, elevation, distance, fov: 38 };
}
