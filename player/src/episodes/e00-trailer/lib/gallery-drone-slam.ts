import * as THREE from "three";
import { clamp01, smoothstep } from "../../../primitives/Easing";
import { Palette } from "../../../primitives/Palette";
import { seeded } from "../../../primitives/Seeded";
import { applyOrbitView, createGalleryCamera } from "./gallery-camera";
import { loadTrailerModel } from "./gallery-glb";
import { createGlowSprite, createGlowTexture } from "./gallery-glow";
import { createGalleryGround } from "./gallery-ground";
import { addGalleryLights } from "./gallery-lights";
import { poseFromAxes } from "./gallery-linalg";
import { GalleryPath } from "./gallery-polyline-path";
import { GallerySegments } from "./gallery-segments";
import { GalleryTriadSet } from "./gallery-triad";
import type { GalleryHud, GalleryVignette } from "./gallery-vignette";
import { projectToUv } from "./gallery-match";

const SAMPLES = 240;
const KEYFRAMES = 20;
const FLIGHT_START = -0.4;
const FLIGHT_END = 5.0;
const CLOSURE_TIME = 5.25;
const CORRECT_START = 5.6;
const CORRECT_END = 7.4;
const DRONE_SCALE = 1.7;
const LANDMARKS = 420;

/** The true closed flight loop, u in [0, 1] (z up, metres of the scene). */
function trueLoop(u: number): THREE.Vector3 {
  const a = 2 * Math.PI * u;
  return new THREE.Vector3(
    2.5 * Math.cos(a) + 0.35 * Math.cos(2 * a + 0.6) - 0.35 * Math.cos(0.6),
    1.4 * Math.sin(a) + 0.25 * Math.sin(3 * a),
    1.0 + 0.18 * Math.sin(2 * a),
  );
}

/**
 * Dead-reckoned estimate of the loop: heading error and scale error accumulate with distance travelled, so the
 * estimate starts on the true loop and ends away from its own start.
 */
function driftedLoop(u: number): THREE.Vector3 {
  const start = trueLoop(0);
  const p = trueLoop(u).sub(start);
  const yaw = 0.3 * u * u;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const scale = 1 + 0.07 * u;
  return new THREE.Vector3(
    start.x + scale * (c * p.x - s * p.y) + 0.45 * u * u,
    start.y + scale * (s * p.x + c * p.y) - 0.3 * u * u,
    start.z + p.z + 0.25 * u * u,
  );
}

/**
 * Vignette 2 — a quadrotor flies a loop and drops pose frames (x along the path tangent, z up). Its dead-reckoned
 * estimate drifts; back near the start a loop-closure edge appears and the whole trajectory, frames included,
 * relaxes onto the closed loop (pose-graph / rotation averaging correction).
 */
export class DroneSlamVignette implements GalleryVignette {
  readonly scene = new THREE.Scene();
  readonly camera = createGalleryCamera();
  readonly hud: GalleryHud | null = null;
  private readonly drone = new THREE.Group();
  private rotors: THREE.Object3D[] = [];
  private readonly path = new GalleryPath(SAMPLES + 1, { width: 4, additive: true });
  private readonly ghostPath = new GalleryPath(SAMPLES + 1, { width: 2, additive: true });
  private readonly closure = new GallerySegments(1, { width: 5, dashed: true, dashSize: 0.12, gapSize: 0.08, additive: true });
  private readonly frames = new GalleryTriadSet(KEYFRAMES + 1, 0.035, Palette.background);
  private readonly glowTexture = createGlowTexture();
  private readonly closureGlowA: THREE.Sprite;
  private readonly closureGlowB: THREE.Sprite;
  private readonly startMarker: THREE.Mesh;
  private readonly pathColor = new THREE.Color(Palette.teal);
  private readonly ghostColor = new THREE.Color(Palette.red);
  private readonly yellow = new THREE.Color(Palette.yellow);
  private readonly tmpM = new THREE.Matrix4();

  constructor() {
    this.scene.background = new THREE.Color(Palette.background);
    this.scene.fog = new THREE.Fog(Palette.background, 8, 16);
    addGalleryLights(this.scene);
    const ground = createGalleryGround(5.5, 0.5, Palette.grid, Palette.blue);
    this.scene.add(ground);

    // Landmarks of the map: fixed pseudo-random features scattered around the loop on the ground and on "walls".
    const rnd = seeded(7202);
    const pos = new Float32Array(LANDMARKS * 3);
    for (let i = 0; i < LANDMARKS; i++) {
      const u = rnd();
      const base = trueLoop(u);
      const n = new THREE.Vector3(base.x, base.y * 1.5, 0).normalize();
      const off = (rnd() < 0.5 ? -1 : 1) * (0.5 + 1.1 * rnd());
      pos[3 * i] = base.x + n.x * off + 0.2 * (rnd() - 0.5);
      pos[3 * i + 1] = base.y + n.y * off + 0.2 * (rnd() - 0.5);
      pos[3 * i + 2] = rnd() < 0.6 ? 0.02 : 0.2 + 1.6 * rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.12, map: this.glowTexture, color: new THREE.Color(Palette.purple), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, opacity: 0.85,
    }));
    this.scene.add(pts);

    this.startMarker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.green), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    this.startMarker.position.copy(trueLoop(0));
    this.scene.add(this.startMarker);

    this.closureGlowA = createGlowSprite(this.glowTexture, Palette.yellow, 0.6);
    this.closureGlowB = createGlowSprite(this.glowTexture, Palette.yellow, 0.6);
    this.scene.add(this.path.object, this.ghostPath.object, this.closure.object, this.frames.group,
      this.closureGlowA, this.closureGlowB, this.drone);
  }

  async preload(): Promise<void> {
    const model = await loadTrailerModel("skydio-x2.glb");
    const root = model.getObjectByName("skydio_x2");
    if (root === undefined) throw new Error("skydio-x2.glb: root node missing");
    root.quaternion.identity();   // gallery world is z-up
    root.position.set(0, 0, 0);
    this.rotors = ["rotor1", "rotor2", "rotor3", "rotor4"].map((name) => {
      const node = model.getObjectByName(name);
      if (node === undefined) throw new Error(`skydio-x2.glb: ${name} missing`);
      // Spinning-propeller discs read as blurred blades: translucent, unlit by the key light's glare.
      node.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity = 0.35;
        mat.depthWrite = false;
        mesh.material = mat;
      });
      return node;
    });
    model.scale.setScalar(DRONE_SCALE);
    this.drone.add(model);
  }

  /** The displayed trajectory: the drifted estimate blended towards the corrected loop by `lambda`. */
  private trajectory(u: number, lambda: number): THREE.Vector3 {
    return driftedLoop(u).lerp(trueLoop(u), lambda);
  }

  /** Frame at parameter u on the blended trajectory: x = horizontal tangent, z = up, y = z x x. */
  private frameAt(u: number, lambda: number, out: THREE.Matrix4): THREE.Matrix4 {
    const du = 1e-3;
    const a = this.trajectory(Math.max(0, u - du), lambda);
    const b = this.trajectory(Math.min(1, u + du), lambda);
    const x = b.sub(a).setZ(0).normalize();
    const z = new THREE.Vector3(0, 0, 1);
    const y = new THREE.Vector3().crossVectors(z, x);
    return poseFromAxes(x, y, z, this.trajectory(u, lambda), out);
  }

  matchPoint(): THREE.Vector2 {
    return projectToUv(this.camera, this.drone.position);
  }

  draw(t: number): void {
    const s = t / 8;
    applyOrbitView(this.camera, {
      center: new THREE.Vector3(0.1, 0.0, 0.6),
      azimuth: -112 + 22 * s,
      elevation: 52 - 6 * s,
      distance: 11.2 - 0.8 * smoothstep(0, 8, t),
      fov: 32,
      shiftX: 140,
      shiftY: 75,
    });

    const flight = clamp01((t - FLIGHT_START) / (FLIGHT_END - FLIGHT_START));
    // Constant speed, then a C1 quadratic slow-down over the last 20 % of the flight.
    const tail = Math.max(0, flight - 0.8);
    const uf = (flight - (tail * tail) / 0.4) / 0.9;
    const lambda = smoothstep(CORRECT_START, CORRECT_END, t);

    // Trajectory so far (blended), and the drifted estimate fading out as a red ghost during the correction.
    const pts: THREE.Vector3[] = [];
    const ghost: THREE.Vector3[] = [];
    const n = Math.max(1, Math.round(uf * SAMPLES));
    for (let i = 0; i <= n; i++) {
      const u = (uf * i) / n;
      pts.push(this.trajectory(u, lambda));
      ghost.push(driftedLoop(u));
    }
    this.path.setPoints(pts, (v, out) => out.copy(this.pathColor).multiplyScalar(0.25 + 0.75 * v));
    const ghostOn = lambda > 0 ? 0.6 * Math.sin(Math.PI * Math.min(1, lambda * 1.4)) + 0.25 * (1 - lambda) : 0;
    this.ghostPath.setPoints(ghost, (_v, out) => out.copy(this.ghostColor).multiplyScalar(ghostOn));
    this.ghostPath.object.visible = ghostOn > 0.01;

    // Pose frames dropped at regular parameter steps once the drone has passed them.
    let count = 0;
    for (let k = 0; k <= KEYFRAMES; k++) {
      const u = k / KEYFRAMES;
      if (k === KEYFRAMES && lambda >= 0.98) break;   // after closing, the last frame coincides with the first
      const dropTime = FLIGHT_START + u * (FLIGHT_END - FLIGHT_START);
      const pop = smoothstep(dropTime, dropTime + 0.25, t);
      if (pop <= 0) continue;
      this.frameAt(Math.min(u, 0.9999), lambda, this.tmpM);
      this.frames.set(count++, this.tmpM, 0.36 * pop, 0.95);
    }
    this.frames.commit(count);

    // Loop closure: dashed edge between the current estimate and the start; it shrinks to zero as the loop closes.
    const closureOn = smoothstep(CLOSURE_TIME, CLOSURE_TIME + 0.2, t) * (1 - smoothstep(CORRECT_END - 0.2, CORRECT_END + 0.3, t));
    const end = this.trajectory(1, lambda);
    const start = this.trajectory(0, lambda);
    const flash = t >= CLOSURE_TIME ? Math.exp(-(t - CLOSURE_TIME) * 2.5) : 0;
    const col = this.yellow.clone().multiplyScalar(closureOn);
    this.closure.set(0, end, start, col, col);
    this.closure.commit(closureOn > 0.01 ? 1 : 0);
    this.closureGlowA.position.copy(end);
    this.closureGlowB.position.copy(start);
    for (const g of [this.closureGlowA, this.closureGlowB]) {
      g.visible = closureOn > 0.01;
      g.scale.setScalar(0.35 + 0.9 * flash);
      (g.material as THREE.SpriteMaterial).opacity = closureOn * (0.55 + 0.45 * flash);
    }
    const marker = this.startMarker.material as THREE.MeshBasicMaterial;
    marker.opacity = 0.5 + 0.5 * smoothstep(CORRECT_END - 0.4, CORRECT_END, t);

    // Drone: on the trajectory head, heading along the tangent, banked into the turn, rotors spinning.
    const head = this.trajectory(uf, lambda);
    const ahead = this.trajectory(Math.min(1, uf + 0.01), lambda);
    const behind = this.trajectory(Math.max(0, uf - 0.01), lambda);
    const tangent = ahead.clone().sub(behind).setZ(0);
    const yaw = Math.atan2(tangent.y, tangent.x);
    const turn = new THREE.Vector3().subVectors(ahead, head).setZ(0).normalize()
      .cross(new THREE.Vector3().subVectors(head, behind).setZ(0).normalize()).z;
    const bob = 0.04 * Math.sin(2 * Math.PI * t * 0.9);
    this.drone.position.copy(head).add(new THREE.Vector3(0, 0, 0.18 + bob));
    this.drone.rotation.set(0, 0, 0);
    this.drone.rotateZ(yaw);
    this.drone.rotateX(THREE.MathUtils.clamp(-turn * 18, -0.35, 0.35) * (1 - smoothstep(4.6, 5.2, t)));
    this.drone.rotateY(0.12 * (1 - smoothstep(4.6, 5.2, t)));
    for (let r = 0; r < this.rotors.length; r++) {
      this.rotors[r].rotation.set(0, 0, (r % 2 === 0 ? 1 : -1) * t * 40);
    }
  }
}
