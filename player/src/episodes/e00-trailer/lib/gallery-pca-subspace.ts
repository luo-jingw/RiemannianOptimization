import * as THREE from "three";
import cloud from "../../../../public/trailer/pca-cloud.json";
import { smoothstep } from "../../../primitives/Easing";
import { Palette } from "../../../primitives/Palette";
import { seeded } from "../../../primitives/Seeded";
import { BEAT } from "./gallery-beats";
import { applyOrbitView, createGalleryCamera } from "./gallery-camera";
import { addGalleryLights } from "./gallery-lights";
import { symmetricEigen3 } from "./gallery-linalg";
import { GalleryPath } from "./gallery-polyline-path";
import { GallerySegments } from "./gallery-segments";
import { axisArrowGeometries } from "./gallery-triad";
import type { GalleryHud, GalleryVignette } from "./gallery-vignette";

const CLASS_COLORS = [Palette.blue, Palette.orange, Palette.green, Palette.red, Palette.purple, Palette.yellow, Palette.teal];
const PLANE_HALF = 1.0;
const GRID_LINES = 9;
const RESIDUALS = 240;
/** Fitting iterations: one per beat; each removes a third of the remaining angle to the principal plane. */
const ITER_START = 0.75;
const ITERATIONS = 11;
const AXES_TIME = 6.3;
const POINT_RADIUS = 0.017;

/**
 * Vignette 6 — a real 3-D point cloud (UCI Dry Bean shape features, top three components, coloured by variety). A
 * translucent plane through the centroid turns, one beat per iteration, along a great circle of plane normals
 * (a geodesic of the Grassmann manifold Gr(2, 3)) until it is the top-2 principal plane of the data, computed here
 * from the points' covariance. Residual segments to the plane shrink as it fits; the principal axes appear last.
 */
export class PcaSubspaceVignette implements GalleryVignette {
  readonly scene = new THREE.Scene();
  readonly camera = createGalleryCamera();
  readonly hud: GalleryHud | null = null;
  private readonly points: THREE.Vector3[] = [];
  private readonly mesh: THREE.InstancedMesh;
  private readonly revealDelay: number[] = [];
  private readonly residualIndex: number[] = [];
  private readonly residuals = new GallerySegments(RESIDUALS, { width: 1.3, additive: true });
  private readonly plane = new THREE.Group();
  private readonly gridLines: GallerySegments;
  private readonly border = new GalleryPath(5, { width: 2.5 });
  private readonly axes: THREE.Mesh[] = [];
  /** Principal directions (unit, descending variance) and the best-plane normal. */
  private readonly v1: THREE.Vector3;
  private readonly v2: THREE.Vector3;
  private readonly nStar: THREE.Vector3;
  private readonly n0: THREE.Vector3;
  private readonly u0: THREE.Vector3;
  private readonly axisLengths: [number, number];
  private readonly m = new THREE.Matrix4();
  private readonly c = new THREE.Color();

  constructor() {
    this.scene.background = new THREE.Color(Palette.background);
    this.scene.fog = new THREE.Fog(Palette.background, 5, 9);
    addGalleryLights(this.scene);

    for (const p of cloud.points) this.points.push(new THREE.Vector3(p[0], p[1], p[2]));
    // Principal plane from the covariance of the (centred) points.
    const mean = new THREE.Vector3();
    for (const p of this.points) mean.add(p);
    mean.multiplyScalar(1 / this.points.length);
    const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of this.points) {
      const d = [p.x - mean.x, p.y - mean.y, p.z - mean.z];
      for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) cov[r][q] += d[r] * d[q];
    }
    const eig = symmetricEigen3(cov);
    this.v1 = eig.vectors[0];
    this.v2 = eig.vectors[1];
    this.nStar = eig.vectors[2];
    const sv = eig.values.map((v) => Math.sqrt(Math.max(0, v)));
    this.axisLengths = [0.95, (0.95 * sv[1]) / sv[0]];
    // Start far from the answer: the initial plane nearly contains the normal of the best plane.
    this.n0 = this.nStar.clone().multiplyScalar(0.35).addScaledVector(this.v1, 0.85).addScaledVector(this.v2, 0.3).normalize();
    this.u0 = new THREE.Vector3().crossVectors(this.n0, this.v2).normalize();

    const rnd = seeded(2380);
    const geo = new THREE.IcosahedronGeometry(POINT_RADIUS, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, emissive: 0x000000 });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.points.length);
    this.mesh.frustumCulled = false;
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);   // fixed sort key (see GalleryTriadSet)
    this.points.forEach((_p, i) => {
      this.mesh.setColorAt(i, this.c.set(CLASS_COLORS[cloud.labels[i]]));
      this.revealDelay.push(rnd());
    });
    this.scene.add(this.mesh);
    for (let k = 0; k < RESIDUALS; k++) this.residualIndex.push(Math.floor(rnd() * this.points.length));
    this.scene.add(this.residuals.object);

    // Plane: translucent sheet + grid + border, built in its own frame (x, y in plane, z normal).
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2 * PLANE_HALF, 2 * PLANE_HALF),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#9fc8ff"), transparent: true, opacity: 0.13, side: THREE.DoubleSide,
        depthWrite: false, roughness: 0.6, emissive: new THREE.Color(Palette.blue), emissiveIntensity: 0.25 }));
    sheet.renderOrder = 2;
    this.plane.add(sheet);
    this.gridLines = new GallerySegments(2 * GRID_LINES, { width: 1.2, additive: true });
    const gc = new THREE.Color(Palette.blue).multiplyScalar(0.55);
    for (let g = 0; g < GRID_LINES; g++) {
      const s = -PLANE_HALF + (2 * PLANE_HALF * (g + 1)) / (GRID_LINES + 1);
      this.gridLines.set(2 * g, new THREE.Vector3(s, -PLANE_HALF, 0), new THREE.Vector3(s, PLANE_HALF, 0), gc, gc);
      this.gridLines.set(2 * g + 1, new THREE.Vector3(-PLANE_HALF, s, 0), new THREE.Vector3(PLANE_HALF, s, 0), gc, gc);
    }
    this.gridLines.commit(2 * GRID_LINES);
    this.plane.add(this.gridLines.object);
    const h = PLANE_HALF;
    const bc = new THREE.Color("#cfe3ff");
    this.border.setPoints([new THREE.Vector3(-h, -h, 0), new THREE.Vector3(h, -h, 0), new THREE.Vector3(h, h, 0),
      new THREE.Vector3(-h, h, 0), new THREE.Vector3(-h, -h, 0)], (_u, out) => out.copy(bc));
    this.plane.add(this.border.object);
    this.scene.add(this.plane);

    const arrowGeo = axisArrowGeometries(0.022)[1];
    for (let k = 0; k < 4; k++) {
      const col = new THREE.Color(Palette.green);
      const a = new THREE.Mesh(arrowGeo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55,
        depthTest: false, transparent: true }));
      a.renderOrder = 12;
      this.axes.push(a);
      this.scene.add(a);
    }
  }

  async preload(): Promise<void> {
    return;
  }

  /** Fraction of the geodesic from n0 to n* covered at time t (normalised so the last iteration lands exactly). */
  private progress(t: number): number {
    let remaining = 1;
    for (let k = 0; k < ITERATIONS; k++) {
      const a = ITER_START + k * BEAT;
      remaining *= 1 - 0.34 * smoothstep(a, a + 0.6 * BEAT, t);
    }
    const final = Math.pow(0.66, ITERATIONS);
    return (1 - remaining) / (1 - final);
  }

  draw(t: number): void {
    const s = t / 8;
    applyOrbitView(this.camera, {
      center: new THREE.Vector3(0.05, 0, 0.05),
      azimuth: -30 - 45 * s,
      elevation: 22 - 4 * s,
      distance: 6.6 - 0.7 * smoothstep(0, 8, t),
      fov: 30,
      shiftX: 170,
      shiftY: 70,
    });

    // Plane normal along the great circle n0 -> n*; in-plane axes carried by the same rotation (parallel transport).
    const angle = this.n0.angleTo(this.nStar);
    const axis = new THREE.Vector3().crossVectors(this.n0, this.nStar).normalize();
    const rot = new THREE.Quaternion().setFromAxisAngle(axis, angle * this.progress(t));
    const n = this.n0.clone().applyQuaternion(rot);
    const u = this.u0.clone().applyQuaternion(rot);
    const w = new THREE.Vector3().crossVectors(n, u);
    this.m.makeBasis(u, w, n);
    this.plane.quaternion.setFromRotationMatrix(this.m);
    const planeOn = smoothstep(0.0, 0.6, t);
    this.plane.scale.setScalar(0.6 + 0.4 * planeOn);
    this.plane.visible = planeOn > 0.01;

    // Points pop in with a staggered reveal.
    this.points.forEach((p, i) => {
      const k = smoothstep(-0.45 + 0.7 * this.revealDelay[i], -0.2 + 0.7 * this.revealDelay[i], t);
      this.m.makeScale(k, k, k).setPosition(p);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;

    // Residuals: from a subset of points to their orthogonal projection on the current plane.
    const rc = this.c.set("#dfe9ff").multiplyScalar(0.45 * planeOn);
    this.residualIndex.forEach((idx, k) => {
      const p = this.points[idx];
      const foot = p.clone().addScaledVector(n, -p.dot(n));
      this.residuals.set(k, p, foot, rc, rc);
    });
    this.residuals.commit(RESIDUALS);

    // Principal axes once the plane has settled (lengths proportional to the singular values).
    const axesOn = smoothstep(AXES_TIME, AXES_TIME + 0.5, t);
    const yAxis = new THREE.Vector3(0, 1, 0);
    [this.v1, this.v2, this.v1.clone().negate(), this.v2.clone().negate()].forEach((v, i) => {
      const a = this.axes[i];
      a.quaternion.setFromUnitVectors(yAxis, v);
      a.scale.set(1, this.axisLengths[i % 2] * axesOn, 1);
      a.visible = axesOn > 0.01;
    });
  }
}
