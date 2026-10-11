import * as THREE from "three";
import rig from "../../../../public/trailer/models/ur5e-rig.json";
import { smoothstep } from "../../../primitives/Easing";
import { keyframes, type Keyframe } from "../../../primitives/Keyframes";
import { Palette } from "../../../primitives/Palette";
import { beatPulse } from "./gallery-beats";
import { applyOrbitView, createGalleryCamera } from "./gallery-camera";
import { loadTrailerModel } from "./gallery-glb";
import { createGlowSprite, createGlowTexture } from "./gallery-glow";
import { createGalleryGround } from "./gallery-ground";
import { addGalleryLights } from "./gallery-lights";
import { GalleryPath } from "./gallery-polyline-path";
import { GalleryTriadSet, createTriad } from "./gallery-triad";
import type { GalleryHud, GalleryVignette } from "./gallery-vignette";
import { projectToUv } from "./gallery-match";

type JointKey = "q0" | "q1" | "q2" | "q3" | "q4" | "q5";
const JOINT_KEYS: readonly JointKey[] = ["q0", "q1", "q2", "q3", "q4", "q5"];

function pose(q: [number, number, number, number, number, number]): Record<JointKey, number> {
  return { q0: q[0], q1: q[1], q2: q[2], q3: q[3], q4: q[4], q5: q[5] };
}

/** Joint-space keyframes (rad); each move starts on a bar line and eases for 1.8 s. The reach lands on bar 2. */
const MOTION: Keyframe<JointKey>[] = [
  { t: -1.0, v: pose([-0.6, -1.9, 2.3, -1.9, -1.57, 0.0]) },
  { t: 0.0, v: pose([-1.1, -1.5, 1.7, -1.7, -1.57, 0.5]) },
  { t: 2.0, v: pose([-2.35, -0.85, 0.5, -1.2, -1.57, 1.2]) },
  { t: 4.0, v: pose([-2.3, -0.9, 0.62, -0.35, -2.4, 2.6]) },
  { t: 6.0, v: pose([-1.7, -1.3, 1.1, -0.9, -0.9, 3.6]) },
];
const MOVE_EASE = 1.8;
const REACH_TIME = 4.0;
const TRAIL_SECONDS = 3.2;
const TRAIL_SAMPLES = 96;
const GHOST_EVERY = 6;
/** Joints that carry a frame: base, shoulder, elbow, first wrist (the last two wrist frames would crowd the flange). */
const FRAMED_JOINTS = 4;
const GHOSTS = TRAIL_SAMPLES / GHOST_EVERY + 1;

/**
 * Vignette 1 — a UR5e arm reaches for a target in the air. Every joint carries a small frame attached to its joint
 * node, so the frames turn with the links through the model's own forward kinematics. The end-effector frame leaves
 * a trail of positions and fading orientation frames: a curve in SO(3).
 */
export class RobotArmVignette implements GalleryVignette {
  readonly scene = new THREE.Scene();
  readonly camera = createGalleryCamera();
  readonly hud: GalleryHud | null = null;
  private readonly robot = new THREE.Group();
  private joints: THREE.Object3D[] = [];
  private readonly flange = new THREE.Object3D();
  private readonly axes: THREE.Vector3[] = rig.joints.map((j) => new THREE.Vector3(j.axis[0], j.axis[1], j.axis[2]));
  private readonly trail = new GalleryPath(TRAIL_SAMPLES + 1, { width: 3.5, additive: true });
  private readonly ghosts = new GalleryTriadSet(GHOSTS, 0.03, Palette.background);
  private readonly target = new THREE.Group();
  private readonly targetGlow: THREE.Sprite;
  private readonly targetRing: THREE.Mesh;
  private readonly glowTexture = createGlowTexture();
  private readonly trailColor = new THREE.Color(Palette.orange);
  private readonly tmpM = new THREE.Matrix4();
  private readonly tmpQ = new THREE.Quaternion();

  constructor() {
    this.scene.background = new THREE.Color(Palette.background);
    this.scene.fog = new THREE.Fog(Palette.background, 3.2, 7.5);
    addGalleryLights(this.scene);
    const ground = createGalleryGround(2.4, 0.2, Palette.grid, Palette.blue);
    ground.position.z = -0.001;
    this.scene.add(ground);
    this.scene.add(this.robot);
    this.scene.add(this.trail.object);
    this.scene.add(this.ghosts.group);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.026, 24, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.orange) }));
    this.targetGlow = createGlowSprite(this.glowTexture, Palette.orange, 0.2);
    this.targetRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.yellow), transparent: true, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending }));
    this.target.add(core, this.targetGlow, this.targetRing);
    this.scene.add(this.target);
  }

  async preload(): Promise<void> {
    const model = await loadTrailerModel("ur5e.glb");
    const root = model.getObjectByName(rig.root_node);
    if (root === undefined) throw new Error("ur5e.glb: root node missing");
    root.position.set(0, 0, 0);
    root.quaternion.identity();   // undo the z-up -> y-up rotation: the gallery world is z-up
    root.scale.setScalar(1);
    this.joints = rig.joints.map((j) => {
      const node = model.getObjectByName(j.node);
      if (node === undefined) throw new Error(`ur5e.glb: joint node ${j.node} missing`);
      return node;
    });
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.envMapIntensity = 0;
      }
    });
    for (let k = 0; k < FRAMED_JOINTS; k++) this.joints[k].add(createTriad(0.12, 0.045, true));
    const ee = rig.end_effector_offset_local;
    this.flange.position.set(ee[0], ee[1], ee[2]);
    this.flange.add(createTriad(0.17, 0.05, true));
    const eeNode = model.getObjectByName(rig.end_effector_node);
    if (eeNode === undefined) throw new Error("ur5e.glb: end-effector node missing");
    eeNode.add(this.flange);
    this.robot.add(model);
    this.applyJoints(REACH_TIME);
    this.target.position.copy(this.flangePosition());
  }

  /** Sets every joint to its angle at vignette time t and updates world matrices (forward kinematics). */
  private applyJoints(t: number): void {
    const q = keyframes(t, MOTION, MOVE_EASE);
    for (let k = 0; k < this.joints.length; k++) {
      this.joints[k].quaternion.setFromAxisAngle(this.axes[k], q[JOINT_KEYS[k]]);
    }
    this.robot.updateMatrixWorld(true);
  }

  private flangePosition(): THREE.Vector3 {
    return new THREE.Vector3().setFromMatrixPosition(this.flange.matrixWorld);
  }

  matchPoint(): THREE.Vector2 {
    return projectToUv(this.camera, this.flangePosition());
  }

  draw(t: number): void {
    const s = t / 8;
    applyOrbitView(this.camera, {
      center: new THREE.Vector3(0.2, 0.3, 0.45),
      azimuth: -38 + 24 * s,
      elevation: 21 - 5 * s,
      distance: 2.6 - 0.3 * smoothstep(0, 8, t),
      fov: 30,
      shiftX: 150,
      shiftY: 150,
    });
    if (this.joints.length === 0) return;

    // Trail: end-effector poses over the last TRAIL_SECONDS, from the same forward kinematics.
    const points: THREE.Vector3[] = [];
    let ghostCount = 0;
    const t0 = t - TRAIL_SECONDS;
    for (let i = 0; i <= TRAIL_SAMPLES; i++) {
      const ts = Math.max(-1, t0 + (TRAIL_SECONDS * i) / TRAIL_SAMPLES);
      this.applyJoints(ts);
      points.push(this.flangePosition());
      if (i % GHOST_EVERY === 0 && i < TRAIL_SAMPLES) {
        const age = i / TRAIL_SAMPLES;
        this.tmpQ.setFromRotationMatrix(this.flange.matrixWorld);
        this.tmpM.makeRotationFromQuaternion(this.tmpQ).setPosition(points[i]);
        this.ghosts.set(ghostCount++, this.tmpM, 0.07 + 0.03 * age, 0.15 + 0.75 * age * age);
      }
    }
    this.ghosts.commit(ghostCount);
    this.trail.setPoints(points, (u, out) => out.copy(this.trailColor).multiplyScalar(u * u));
    this.applyJoints(t);

    // Target: pulses on the beat until reached, then flashes a ring on the downbeat of bar 2.
    const reached = smoothstep(REACH_TIME - 0.2, REACH_TIME + 0.1, t);
    const pulse = beatPulse(t);
    this.targetGlow.scale.setScalar(0.13 + 0.09 * pulse * (1 - reached) + 0.2 * reached * Math.exp(-(t - REACH_TIME) * 2.5));
    const ringAge = Math.max(0, t - REACH_TIME);
    const ringOn = t >= REACH_TIME ? Math.exp(-ringAge * 2.2) : 0;
    this.targetRing.scale.setScalar(0.03 + 0.12 * (1 - Math.exp(-ringAge * 4)));
    this.targetRing.quaternion.copy(this.camera.quaternion);
    (this.targetRing.material as THREE.MeshBasicMaterial).opacity = ringOn;
    this.targetRing.visible = ringOn > 0.01;
  }
}
