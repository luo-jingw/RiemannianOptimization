import * as THREE from "three";
import { clamp01, smoothstep } from "../../../primitives/Easing";
import { Palette } from "../../../primitives/Palette";
import { seeded } from "../../../primitives/Seeded";
import { BEAT, beatPulse } from "./gallery-beats";
import { applyOrbitView, createGalleryCamera } from "./gallery-camera";
import { createGlowSprite, createGlowTexture } from "./gallery-glow";
import { createGalleryHud, hudPoint } from "./gallery-hud";
import { addGalleryLights } from "./gallery-lights";
import { GalleryPath } from "./gallery-polyline-path";
import { GallerySegments } from "./gallery-segments";
import { axisArrowGeometries } from "./gallery-triad";
import type { GalleryHud, GalleryVignette } from "./gallery-vignette";

const LAYERS = [4, 6, 6, 3];
const LAYER_X = [-3.9, -2.45, -1.0, 0.45];
const NODE_GAP = 0.62;
/** One forward sweep of activity per bar. */
const SWEEP = 4 * BEAT;
/** Origin of the weight-matrix frame. */
const FRAME_ORIGIN = new THREE.Vector3(2.75, 0, 0.0);
const COLUMN_LENGTH = 1.25;
const COLUMN_COLORS = [Palette.orange, Palette.yellow, Palette.pink];
const STEPS = 15;
const TRAIL_SECONDS = 1.6;
const TRAIL_SAMPLES = 40;
/** Loss panel in output pixels (y down). */
const PANEL = { x0: 1480, x1: 1830, y0: 92, y1: 262 };
const EPOCHS = 120;

interface Edge {
  a: THREE.Vector3;
  b: THREE.Vector3;
  layer: number;
  weight: number;
}

/**
 * Vignette 3 — a layered network whose connections pulse with each training sweep, beside one weight matrix drawn as
 * three column vectors. Training moves the columns by orthogonal matrices, so they stay unit length and pairwise
 * perpendicular (right-angle marks); a loss curve falls in the corner.
 */
export class NeuralNetVignette implements GalleryVignette {
  readonly scene = new THREE.Scene();
  readonly camera = createGalleryCamera();
  readonly hud: GalleryHud = createGalleryHud();
  private readonly glowTexture = createGlowTexture();
  private readonly nodes: THREE.Vector3[][] = [];
  private readonly nodeGlows: THREE.Sprite[][] = [];
  private readonly edges: Edge[] = [];
  private readonly edgeLines: GallerySegments;
  private readonly sparks: THREE.InstancedMesh;
  private readonly columns: THREE.Mesh[] = [];
  private readonly columnTrails: GalleryPath[] = [];
  private readonly corners = new GallerySegments(6, { width: 3 });
  private readonly frame0: THREE.Vector3[] = [];
  private readonly stepAxes: THREE.Vector3[] = [];
  private readonly stepAngles: number[] = [];
  private readonly lossValues: number[] = [];
  private readonly lossPath = new GalleryPath(EPOCHS + 1, { width: 3, depthTest: false });
  private readonly lossHead: THREE.Mesh;
  private readonly lossGlow: THREE.Sprite;
  private readonly tmpA = new THREE.Color();
  private readonly tmpB = new THREE.Color();
  private readonly edgeBase = new THREE.Color(Palette.blue);
  private readonly edgeHot = new THREE.Color("#cfe6ff");

  constructor() {
    this.scene.background = new THREE.Color(Palette.background);
    this.scene.fog = new THREE.Fog(Palette.background, 10, 18);
    addGalleryLights(this.scene);
    const rnd = seeded(9101);

    // Network nodes (x = layer, z = position in layer, small depth stagger in y).
    const nodeGeo = new THREE.SphereGeometry(0.11, 24, 16);
    const nodeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(Palette.blue), emissive: new THREE.Color(Palette.blue),
      emissiveIntensity: 0.35, roughness: 0.35 });
    LAYERS.forEach((count, l) => {
      const col: THREE.Vector3[] = [];
      const glows: THREE.Sprite[] = [];
      for (let i = 0; i < count; i++) {
        const p = new THREE.Vector3(LAYER_X[l], (rnd() - 0.5) * 0.5, (i - (count - 1) / 2) * NODE_GAP + 0.35);
        col.push(p);
        const m = new THREE.Mesh(nodeGeo, nodeMat);
        m.position.copy(p);
        this.scene.add(m);
        const g = createGlowSprite(this.glowTexture, Palette.blue, 0.6);
        g.position.copy(p);
        this.scene.add(g);
        glows.push(g);
      }
      this.nodes.push(col);
      this.nodeGlows.push(glows);
    });
    for (let l = 0; l + 1 < LAYERS.length; l++) {
      for (const a of this.nodes[l]) for (const b of this.nodes[l + 1]) this.edges.push({ a, b, layer: l, weight: 0.3 + 0.7 * rnd() });
    }
    this.edgeLines = new GallerySegments(this.edges.length, { width: 2.2, additive: true });
    this.scene.add(this.edgeLines.object);
    this.sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 12, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#e6f2ff"), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
      this.edges.length);
    this.sparks.frustumCulled = false;
    this.sparks.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);   // fixed sort key (see GalleryTriadSet)
    this.scene.add(this.sparks);

    // Weight matrix: three orthonormal columns from an initial orthonormal frame.
    // Start from an isometric view of the frame: the camera looks along -(c0 + c1 + c2), so all three columns show.
    const iso = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, -1, 0));
    const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.5);
    iso.premultiply(roll);
    this.frame0.push(new THREE.Vector3(1, 0, 0).applyQuaternion(iso), new THREE.Vector3(0, 1, 0).applyQuaternion(iso),
      new THREE.Vector3(0, 0, 1).applyQuaternion(iso));
    const arrowGeo = axisArrowGeometries(0.028)[1];
    COLUMN_COLORS.forEach((color) => {
      const c = new THREE.Color(color);
      const mesh = new THREE.Mesh(arrowGeo, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, roughness: 0.3 }));
      mesh.position.copy(FRAME_ORIGIN);
      mesh.scale.setScalar(COLUMN_LENGTH);
      this.scene.add(mesh);
      this.columns.push(mesh);
      const trail = new GalleryPath(TRAIL_SAMPLES + 1, { width: 3, additive: true });
      this.scene.add(trail.object);
      this.columnTrails.push(trail);
    });
    this.scene.add(this.corners.object);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(COLUMN_LENGTH, 48, 32),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(Palette.purple), transparent: true, opacity: 0.07, roughness: 0.6, depthWrite: false }));
    sphere.position.copy(FRAME_ORIGIN);
    this.scene.add(sphere);
    const rings = new GallerySegments(3 * 96, { width: 1.2, additive: true });
    const ringColor = new THREE.Color(Palette.purple).multiplyScalar(0.45);
    let ri = 0;
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 96; i++) {
        const point = (k: number): THREE.Vector3 => {
          const a = (2 * Math.PI * k) / 96;
          const u = Math.cos(a) * COLUMN_LENGTH;
          const v = Math.sin(a) * COLUMN_LENGTH;
          const p = r === 0 ? new THREE.Vector3(u, v, 0) : r === 1 ? new THREE.Vector3(u, 0, v) : new THREE.Vector3(0, u, v);
          return p.add(FRAME_ORIGIN);
        };
        rings.set(ri++, point(i), point(i + 1), ringColor, ringColor);
      }
    }
    rings.commit(ri);
    this.scene.add(rings.object);
    rings.object.renderOrder = -1;

    // Training steps: one orthogonal update per beat, with shrinking angles as training converges.
    for (let k = 0; k < STEPS; k++) {
      // Update directions precess slowly around one axis, so the steps accumulate into a visible turn.
      const a = 0.5 * k;
      this.stepAxes.push(new THREE.Vector3(0.35 * Math.cos(a), -0.45 + 0.2 * (rnd() - 0.5), 0.85 + 0.35 * Math.sin(a)).normalize());
      this.stepAngles.push(0.42 * Math.pow(0.9, k));
    }

    // Loss curve (HUD).
    for (let e = 0; e <= EPOCHS; e++) {
      const x = e / EPOCHS;
      this.lossValues.push(0.1 + 0.82 * Math.exp(-x * 4.2) + 0.05 * (rnd() - 0.5) * (1 - 0.6 * x));
    }
    const axis = new GallerySegments(2, { width: 1.5, depthTest: false });
    const axisColor = new THREE.Color(Palette.axis);
    axis.set(0, hudPoint(PANEL.x0, PANEL.y0 - 6), hudPoint(PANEL.x0, PANEL.y1), axisColor, axisColor);
    axis.set(1, hudPoint(PANEL.x0, PANEL.y1), hudPoint(PANEL.x1 + 6, PANEL.y1), axisColor, axisColor);
    axis.commit(2);
    this.hud.scene.add(axis.object, this.lossPath.object);
    this.lossHead = new THREE.Mesh(new THREE.CircleGeometry(5, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.green) }));
    this.lossGlow = createGlowSprite(this.glowTexture, Palette.green, 34);
    this.hud.scene.add(this.lossGlow, this.lossHead);
  }

  async preload(): Promise<void> {
    return;
  }

  /** Product of the per-beat orthogonal updates applied up to time t (each eased over 60 % of a beat). */
  private weightRotation(t: number): THREE.Matrix4 {
    const q = new THREE.Matrix4();
    for (let k = 0; k < STEPS; k++) {
      const start = 0.25 + k * BEAT;
      const f = smoothstep(start, start + 0.6 * BEAT, t);
      if (f <= 0) break;
      q.premultiply(new THREE.Matrix4().makeRotationAxis(this.stepAxes[k], this.stepAngles[k] * f));
    }
    return q;
  }

  private columnsAt(t: number): THREE.Vector3[] {
    const q = this.weightRotation(t);
    return this.frame0.map((c) => c.clone().applyMatrix4(q));
  }

  draw(t: number): void {
    const s = t / 8;
    applyOrbitView(this.camera, {
      center: new THREE.Vector3(-0.35, 0, 0.25),
      azimuth: -104 + 16 * s,
      elevation: 10 + 3 * s,
      distance: 12.2 - 0.9 * smoothstep(0, 8, t),
      fov: 30,
      shiftX: 70,
      shiftY: 25,
    });

    // Activity sweep: a wavefront crosses the layers once per bar; edges brighten as it passes.
    const phase = ((t % SWEEP) + SWEEP) % SWEEP / SWEEP * (LAYERS.length - 0.2);
    const kick = beatPulse(t, SWEEP, 0.5);
    const m = new THREE.Matrix4();
    this.edges.forEach((e, i) => {
      const local = clamp01(phase - e.layer);
      const near = Math.exp(-((phase - e.layer - 0.5) ** 2) / 0.12);
      const base = 0.18 + 0.22 * e.weight;
      this.tmpA.copy(this.edgeBase).multiplyScalar(base).lerp(this.edgeHot, 0.55 * near * e.weight);
      this.edgeLines.set(i, e.a, e.b, this.tmpA, this.tmpA);
      const on = local > 0 && local < 1 ? 1 : 0;
      const p = e.a.clone().lerp(e.b, local);
      m.makeScale(on * e.weight, on * e.weight, on * e.weight).setPosition(p);
      this.sparks.setMatrixAt(i, m);
    });
    this.edgeLines.commit(this.edges.length);
    this.sparks.instanceMatrix.needsUpdate = true;
    this.nodeGlows.forEach((layer, l) => {
      const hit = Math.exp(-((phase - l) ** 2) / 0.05);
      for (const g of layer) {
        g.scale.setScalar(0.42 + 0.5 * hit + 0.1 * kick);
        (g.material as THREE.SpriteMaterial).opacity = 0.35 + 0.65 * hit;
      }
    });

    // Weight columns: Q(t) W0 with Q orthogonal, so W(t)^T W(t) = I at every frame.
    const cols = this.columnsAt(t);
    const yAxis = new THREE.Vector3(0, 1, 0);
    cols.forEach((c, i) => this.columns[i].quaternion.setFromUnitVectors(yAxis, c));
    const mark = 0.27;
    let k = 0;
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as const) {
      const a = FRAME_ORIGIN.clone().addScaledVector(cols[i], mark);
      const b = a.clone().addScaledVector(cols[j], mark);
      const c = FRAME_ORIGIN.clone().addScaledVector(cols[j], mark);
      this.tmpA.set(Palette.text);
      this.corners.set(k++, a, b, this.tmpA, this.tmpA);
      this.corners.set(k++, b, c, this.tmpA, this.tmpA);
    }
    this.corners.commit(k);
    for (let i = 0; i < 3; i++) {
      const pts: THREE.Vector3[] = [];
      for (let n = 0; n <= TRAIL_SAMPLES; n++) {
        const ts = t - TRAIL_SECONDS + (TRAIL_SECONDS * n) / TRAIL_SAMPLES;
        pts.push(FRAME_ORIGIN.clone().addScaledVector(this.columnsAt(ts)[i], COLUMN_LENGTH));
      }
      this.tmpB.set(COLUMN_COLORS[i]);
      this.columnTrails[i].setPoints(pts, (u, out) => out.copy(this.tmpB).multiplyScalar(u * u * 0.9));
    }

    // Loss curve: one epoch revealed per frame-time slice; the head glows.
    const reveal = clamp01((t + 0.2) / 7.2);
    const shown = Math.max(1, Math.round(reveal * EPOCHS));
    const lossPts: THREE.Vector3[] = [];
    for (let e = 0; e <= shown; e++) {
      const x = PANEL.x0 + 6 + ((PANEL.x1 - PANEL.x0 - 6) * e) / EPOCHS;
      const y = PANEL.y1 - 6 - (PANEL.y1 - PANEL.y0 - 12) * this.lossValues[e];
      lossPts.push(hudPoint(x, y, 1));
    }
    this.tmpB.set(Palette.green);
    this.lossPath.setPoints(lossPts, (_u, out) => out.copy(this.tmpB));
    const head = lossPts[lossPts.length - 1];
    this.lossHead.position.copy(head);
    this.lossGlow.position.copy(head);
  }
}
