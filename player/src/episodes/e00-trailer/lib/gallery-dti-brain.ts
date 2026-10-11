import * as THREE from "three";
import dti from "../../../../public/trailer/dti-slice.json";
import { smoothstep } from "../../../primitives/Easing";
import { Palette } from "../../../primitives/Palette";
import { applyOrbitView, createGalleryCamera } from "./gallery-camera";
import { addGalleryLights } from "./gallery-lights";
import { poseFromAxes } from "./gallery-linalg";
import { GalleryPath } from "./gallery-polyline-path";
import type { GalleryHud, GalleryVignette } from "./gallery-vignette";

/** Grid centre (voxel index units); one world unit = one 4 mm voxel. */
const CX = 20;
const CY = 26;
/** Semi-axis of a glyph along its principal eigenvector, in voxels. */
const GLYPH_RADIUS = 0.48;
/** Smallest drawn semi-axis ratio, so flat tensors stay visible as discs. */
const MIN_RATIO = 0.1;
/** Push-in target: the splenium of the corpus callosum. */
const FOCUS = new THREE.Vector3(18 - CX, 20 - CY, 0);

interface Glyph {
  pos: THREE.Vector3;
  /** Pose (rotation = eigenvectors, translation = voxel centre) times eigenvalue scaling. */
  matrix: THREE.Matrix4;
  /** Distance from the slice centre, for the reveal wave. */
  r: number;
}

/**
 * Vignette 5 — one axial slice of a real diffusion-tensor scan (Stanford HARDI) drawn as one ellipsoid per voxel:
 * axes along the tensor's eigenvectors with semi-axes proportional to its eigenvalues (normalised by the voxel's own
 * largest eigenvalue), coloured by principal direction (red left-right, green anterior-posterior, blue
 * inferior-superior) and brightened by fractional anisotropy. The camera pushes in towards the corpus callosum.
 */
export class DtiBrainVignette implements GalleryVignette {
  readonly scene = new THREE.Scene();
  readonly camera = createGalleryCamera();
  readonly hud: GalleryHud | null = null;
  private readonly glyphs: Glyph[] = [];
  private readonly mesh: THREE.InstancedMesh;
  private readonly m = new THREE.Matrix4();
  private readonly s = new THREE.Matrix4();

  constructor() {
    this.scene.background = new THREE.Color(Palette.background);
    this.scene.fog = new THREE.Fog(Palette.background, 90, 170);
    this.camera.far = 400;   // the camera stands about 100 voxels away
    addGalleryLights(this.scene, 1.35);

    // Slice backing plate with the ventricle hole, and the outline loops.
    const toVec = (p: number[]): THREE.Vector2 => new THREE.Vector2(p[0] - CX, p[1] - CY);
    const shape = new THREE.Shape(dti.outline.outer.map(toVec));
    for (const hole of dti.outline.holes) shape.holes.push(new THREE.Path(hole.map(toVec)));
    const plate = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4),
      new THREE.MeshStandardMaterial({ color: new THREE.Color("#141c30"), roughness: 0.9 }));
    plate.position.z = -0.7;
    this.scene.add(plate);
    const loops = [dti.outline.outer, ...dti.outline.holes];
    for (const loop of loops) {
      const pts = loop.map((p) => new THREE.Vector3(p[0] - CX, p[1] - CY, -0.65));
      pts.push(pts[0].clone());
      const path = new GalleryPath(pts.length, { width: 2, additive: true });
      const c = new THREE.Color(Palette.blue).multiplyScalar(0.7);
      path.setPoints(pts, (_u, out) => out.copy(c));
      this.scene.add(path.object);
    }

    // Glyphs.
    const geo = new THREE.SphereGeometry(1, 20, 14);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.05 });
    this.mesh = new THREE.InstancedMesh(geo, mat, dti.voxels.length);
    this.mesh.frustumCulled = false;
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);   // fixed sort key (see GalleryTriadSet)
    const color = new THREE.Color();
    dti.voxels.forEach((v, idx) => {
      const e = v.evecs.map((a) => new THREE.Vector3(a[0], a[1], a[2]));
      const l1 = v.evals[0];
      const radii = v.evals.map((l) => GLYPH_RADIUS * Math.max(MIN_RATIO, l / l1));
      const pos = new THREE.Vector3(v.i - CX, v.j - CY, 0);
      const pose = poseFromAxes(e[0], e[1], e[2], pos, new THREE.Matrix4());
      const matrix = pose.multiply(new THREE.Matrix4().makeScale(radii[0], radii[1], radii[2]));
      this.glyphs.push({ pos, matrix, r: pos.length() });
      const bright = 0.5 + 0.5 * Math.min(1, v.fa * 1.8);
      color.setRGB(Math.abs(e[0].x) * bright, Math.abs(e[0].y) * bright, Math.abs(e[0].z) * bright, THREE.SRGBColorSpace);
      // Keep near-isotropic voxels faintly visible: lift towards a cool grey.
      color.lerp(new THREE.Color("#55658a"), 0.2 * (1 - Math.min(1, v.fa * 2)));
      this.mesh.setColorAt(idx, color);
    });
    this.scene.add(this.mesh);
  }

  async preload(): Promise<void> {
    return;
  }

  draw(t: number): void {
    const push = smoothstep(-0.5, 8.2, t);
    applyOrbitView(this.camera, {
      center: new THREE.Vector3(0, 0, 0).lerp(FOCUS, push * 0.5),
      azimuth: -98 + 16 * (t / 8),
      elevation: 66 - 12 * push,
      distance: 97 - 22 * push,
      fov: 32,
      shiftX: 170,
      shiftY: 80 + 40 * push,
    });
    // Reveal: glyphs grow in a wave from the centre outwards during the first bar.
    const maxR = 30;
    this.glyphs.forEach((g, i) => {
      const k = smoothstep(-0.35 + (g.r / maxR) * 1.3, 0.25 + (g.r / maxR) * 1.3, t);
      this.s.makeScale(k, k, k);
      this.m.copy(g.matrix).multiply(this.s);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
