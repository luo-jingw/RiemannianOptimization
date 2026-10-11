import * as THREE from "three";
import { smoothstep } from "../../../primitives/Easing";
import { Palette } from "../../../primitives/Palette";
import { seeded } from "../../../primitives/Seeded";
import { applyOrbitView, createGalleryCamera } from "./gallery-camera";
import { createGlowMaterial, createGlowTexture } from "./gallery-glow";
import { type DiskPoint, conformalScale, diskRadiusOfDistance, geodesicPoints, mobiusToOrigin } from "./gallery-hyperbolic";
import { GallerySegments } from "./gallery-segments";
import type { GalleryHud, GalleryVignette } from "./gallery-vignette";

/** World radius of the unit disk. */
const R = 2.55;
const DEPTH = 6;
/** Children per node at each depth (root has 3). */
const BRANCHING = [3, 3, 2, 2, 2, 2];
/** Hyperbolic edge length (curvature -1). */
const EDGE_LENGTH = 0.95;
const ARC_SAMPLES = 24;
const FAREY_LEVELS = 6;
const FAREY_SAMPLES = 40;
const LEVEL_TIME = (d: number): number => 0.15 + 0.8 * (d - 1);
const GROW = 0.75;
const SHIFT_START = 5.2;
const SHIFT_END = 7.9;
const DEPTH_COLORS = [Palette.yellow, Palette.orange, Palette.pink, Palette.purple, Palette.blue, Palette.teal, Palette.green];

interface TreeNode {
  depth: number;
  z: DiskPoint;
  parent: number;
}

/**
 * Vignette 4 — a hierarchy unfolds level by level in the Poincaré disk. Each level sits one fixed hyperbolic distance
 * further out, so the levels crowd towards the boundary; every edge is a hyperbolic geodesic (an arc orthogonal to
 * the boundary circle, or a diameter). Behind it, a Farey tessellation of ideal triangles. Finally a disk isometry
 * (Möbius map) brings a deep branch to the centre: geodesics stay geodesics, and the hierarchy looks the same from there.
 */
export class HyperbolicTreeVignette implements GalleryVignette {
  readonly scene = new THREE.Scene();
  readonly camera = createGalleryCamera();
  readonly hud: GalleryHud | null = null;
  private readonly glowTexture = createGlowTexture();
  private readonly nodes: TreeNode[] = [];
  private readonly levelLines: GallerySegments[] = [];
  private readonly farey: GallerySegments;
  private readonly fareyArcs: [number, number][] = [];
  private readonly nodeMesh: THREE.InstancedMesh;
  private readonly glowMesh: THREE.InstancedMesh;
  private readonly focus: DiskPoint;
  private readonly colA = new THREE.Color();
  private readonly colB = new THREE.Color();
  private readonly m = new THREE.Matrix4();

  constructor() {
    this.scene.background = new THREE.Color(Palette.background);

    // Disk: soft fill brightening towards the boundary, glowing boundary ring.
    const fill = new THREE.Mesh(new THREE.CircleGeometry(R, 128), new THREE.ShaderMaterial({
      uniforms: { inner: { value: new THREE.Color("#121a2c") }, outer: { value: new THREE.Color("#22305a") } },
      vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `uniform vec3 inner; uniform vec3 outer; varying vec2 vP;
        void main(){ float r = length(vP) / ${R.toFixed(3)}; gl_FragColor = vec4(mix(inner, outer, pow(r, 3.0)), 1.0);
        #include <colorspace_fragment>
        }`,
    }));
    fill.position.z = -0.02;
    this.scene.add(fill);
    const rim = new GallerySegments(256, { width: 3, additive: true });
    const rimColor = new THREE.Color(Palette.blue);
    for (let i = 0; i < 256; i++) {
      const a0 = (2 * Math.PI * i) / 256;
      const a1 = (2 * Math.PI * (i + 1)) / 256;
      rim.set(i, new THREE.Vector3(R * Math.cos(a0), R * Math.sin(a0), 0), new THREE.Vector3(R * Math.cos(a1), R * Math.sin(a1), 0), rimColor, rimColor);
    }
    rim.commit(256);
    this.scene.add(rim.object);
    const halo = new THREE.Mesh(new THREE.RingGeometry(R * 0.97, R * 1.12, 128), new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(Palette.blue) } },
      vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `uniform vec3 c; varying vec2 vP;
        void main(){ float r = length(vP) / ${R.toFixed(3)}; float a = exp(-pow((r - 1.0) / 0.035, 2.0)) * 0.55;
        gl_FragColor = vec4(c * a, 1.0);
        #include <colorspace_fragment>
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.scene.add(halo);

    // Farey tessellation: geodesics between ideal points, refined by midpoint insertion.
    let ideal: number[] = [0, 1 / 3, 2 / 3];
    const arcs: [number, number][] = [[0, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 1]];
    for (let level = 1; level < FAREY_LEVELS; level++) {
      const next: number[] = [];
      for (let i = 0; i < ideal.length; i++) {
        const a = ideal[i];
        const b = i + 1 < ideal.length ? ideal[i + 1] : 1;
        const mid = (a + b) / 2;
        next.push(a, mid);
        arcs.push([a, mid], [mid, b]);
      }
      ideal = next;
    }
    this.fareyArcs.push(...arcs);
    this.farey = new GallerySegments(arcs.length * FAREY_SAMPLES, { width: 1.1, additive: true });
    this.scene.add(this.farey.object);

    // Tree: polar layout, depth d at hyperbolic distance d * EDGE_LENGTH, children spread inside the parent's wedge.
    const rnd = seeded(4413);
    this.nodes.push({ depth: 0, z: { x: 0, y: 0 }, parent: -1 });
    const wedges: [number, number][] = [[0.3, 0.3 + 2 * Math.PI]];
    let frontier = [0];
    for (let d = 1; d <= DEPTH; d++) {
      const nextFrontier: number[] = [];
      const radius = diskRadiusOfDistance(d * EDGE_LENGTH);
      for (const p of frontier) {
        const [w0, w1] = wedges[p];
        const k = BRANCHING[d - 1];
        for (let c = 0; c < k; c++) {
          const c0 = w0 + ((w1 - w0) * c) / k;
          const c1 = w0 + ((w1 - w0) * (c + 1)) / k;
          const jitter = (rnd() - 0.5) * 0.12 * (c1 - c0);
          const ang = (c0 + c1) / 2 + jitter;
          this.nodes.push({ depth: d, z: { x: radius * Math.cos(ang), y: radius * Math.sin(ang) }, parent: p });
          wedges.push([c0, c1]);
          nextFrontier.push(this.nodes.length - 1);
        }
      }
      frontier = nextFrontier;
    }
    for (let d = 1; d <= DEPTH; d++) {
      const count = this.nodes.filter((n) => n.depth === d).length;
      const lines = new GallerySegments(count * ARC_SAMPLES, { width: Math.max(1.3, 4.4 - 0.55 * d), additive: false, depthTest: false });
      this.levelLines.push(lines);
      this.scene.add(lines.object);
    }
    this.focus = this.nodes.find((n) => n.depth === 2)!.z;

    this.glowMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), createGlowMaterial(this.glowTexture, "#ffffff"), this.nodes.length);
    this.nodeMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }), this.nodes.length);
    for (const mesh of [this.glowMesh, this.nodeMesh]) {
      mesh.frustumCulled = false;
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);   // fixed sort key (see GalleryTriadSet)
      mesh.renderOrder = 5;
      this.nodes.forEach((n, i) => mesh.setColorAt(i, new THREE.Color(DEPTH_COLORS[n.depth])));
      this.scene.add(mesh);
    }
    this.nodeMesh.renderOrder = 6;
  }

  async preload(): Promise<void> {
    return;
  }

  draw(t: number): void {
    const s = t / 8;
    applyOrbitView(this.camera, {
      center: new THREE.Vector3(0, 0, 0),
      azimuth: -90 + 14 * s,
      elevation: 63 + 7 * s,
      distance: 11.4 - 0.6 * smoothstep(0, 8, t),
      fov: 34,
      shiftX: 170,
      shiftY: 110,
    });

    const shift = smoothstep(SHIFT_START, SHIFT_END, t);
    const a: DiskPoint = { x: this.focus.x * 0.97 * shift, y: this.focus.y * 0.97 * shift };
    const iso = (z: DiskPoint): DiskPoint => mobiusToOrigin(z, a);
    const world = (z: DiskPoint): THREE.Vector3 => new THREE.Vector3(z.x * R, z.y * R, 0);

    // Background tessellation, moved by the same isometry (ideal points stay on the boundary circle).
    let k = 0;
    const fareyColor = this.colA.set(Palette.blue).multiplyScalar(0.32);
    for (const [u0, u1] of this.fareyArcs) {
      const p = iso({ x: 0.9999 * Math.cos(2 * Math.PI * u0), y: 0.9999 * Math.sin(2 * Math.PI * u0) });
      const q = iso({ x: 0.9999 * Math.cos(2 * Math.PI * u1), y: 0.9999 * Math.sin(2 * Math.PI * u1) });
      const pts = geodesicPoints(p, q, FAREY_SAMPLES);
      for (let i = 0; i < FAREY_SAMPLES; i++) this.farey.set(k++, world(pts[i]), world(pts[i + 1]), fareyColor, fareyColor);
    }
    this.farey.commit(k);
    this.farey.setOpacity(0.35 + 0.65 * smoothstep(-0.3, 0.6, t));

    // Tree edges grow level by level along their geodesics.
    const counts = new Array<number>(DEPTH).fill(0);
    for (let i = 1; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const grow = smoothstep(LEVEL_TIME(n.depth), LEVEL_TIME(n.depth) + GROW, t);
      if (grow <= 0) continue;
      const pts = geodesicPoints(iso(this.nodes[n.parent].z), iso(n.z), ARC_SAMPLES, grow);
      const lines = this.levelLines[n.depth - 1];
      this.colA.set(DEPTH_COLORS[n.depth - 1]);
      this.colB.set(DEPTH_COLORS[n.depth]);
      const c0 = this.colA.clone();
      for (let j = 0; j < ARC_SAMPLES; j++) {
        const cj = c0.clone().lerp(this.colB, j / ARC_SAMPLES);
        const cj1 = c0.clone().lerp(this.colB, (j + 1) / ARC_SAMPLES);
        lines.set(counts[n.depth - 1]++, world(pts[j]), world(pts[j + 1]), cj, cj1);
      }
    }
    this.levelLines.forEach((lines, d) => lines.commit(counts[d]));

    // Nodes: Euclidean size follows the conformal factor, so equal hyperbolic size shrinks towards the boundary.
    this.nodes.forEach((n, i) => {
      const appear = n.depth === 0 ? smoothstep(-0.4, 0.1, t) : smoothstep(LEVEL_TIME(n.depth) + GROW * 0.7, LEVEL_TIME(n.depth) + GROW + 0.15, t);
      const z = iso(n.z);
      const size = R * 0.24 * conformalScale(z) * appear;
      this.m.makeScale(size, size, size).setPosition(world(z));
      this.nodeMesh.setMatrixAt(i, this.m);
      const g = size * 3.2;
      this.m.makeScale(g, g, g).setPosition(world(z));
      this.glowMesh.setMatrixAt(i, this.m);
    });
    this.nodeMesh.instanceMatrix.needsUpdate = true;
    this.glowMesh.instanceMatrix.needsUpdate = true;
  }
}
