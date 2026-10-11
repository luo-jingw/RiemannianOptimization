import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Palette } from "../../../primitives/Palette";

/** Axis colours of every coordinate frame in the gallery: x red, y green, z blue. */
export const TRIAD_COLORS: readonly [string, string, string] = [Palette.red, Palette.green, Palette.blue];

/** Arrow of unit length along +Y: shaft radius `r`, head length 0.26, head radius 2.4 r. */
function arrowAlongY(r: number): THREE.BufferGeometry {
  const head = 0.26;
  const shaft = new THREE.CylinderGeometry(r, r, 1 - head, 12, 1);
  shaft.translate(0, (1 - head) / 2, 0);
  const cone = new THREE.ConeGeometry(r * 2.4, head, 16, 1);
  cone.translate(0, 1 - head / 2, 0);
  const merged = mergeGeometries([shaft, cone]);
  shaft.dispose();
  cone.dispose();
  return merged;
}

/** Unit arrow geometries along +X, +Y and +Z. */
export function axisArrowGeometries(radius: number): [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry] {
  const y = arrowAlongY(radius);
  const x = y.clone().rotateZ(-Math.PI / 2);
  const z = y.clone().rotateX(Math.PI / 2);
  return [x, y, z];
}

function axisMaterial(color: string, overlay: boolean): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({
    color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.0,
    depthTest: !overlay, transparent: overlay,
  });
}

/**
 * A coordinate frame (three arrows) of length `length`; attach it to any node to make it move with that node.
 * An overlay frame is drawn on top of solid geometry (visible through the link it is attached to).
 */
export function createTriad(length: number, radius: number, overlay: boolean): THREE.Group {
  const group = new THREE.Group();
  const geoms = axisArrowGeometries(radius);
  for (let k = 0; k < 3; k++) {
    const mesh = new THREE.Mesh(geoms[k], axisMaterial(TRIAD_COLORS[k], overlay));
    if (overlay) mesh.renderOrder = 10;
    group.add(mesh);
  }
  group.scale.setScalar(length);
  return group;
}

/**
 * Many coordinate frames drawn with three instanced meshes. Each frame has a pose matrix (rotation + translation),
 * a length, and a brightness in [0, 1] that blends its colour towards `fadeColor`.
 */
export class GalleryTriadSet {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly base: THREE.Color[];
  private readonly fade: THREE.Color;
  private readonly m = new THREE.Matrix4();
  private readonly s = new THREE.Matrix4();
  private readonly c = new THREE.Color();

  constructor(readonly capacity: number, radius: number, fadeColor: string) {
    const geoms = axisArrowGeometries(radius);
    this.base = TRIAD_COLORS.map((h) => new THREE.Color(h));
    this.fade = new THREE.Color(fadeColor);
    for (let k = 0; k < 3; k++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000, roughness: 0.4, metalness: 0 });
      const mesh = new THREE.InstancedMesh(geoms[k], mat, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      mesh.frustumCulled = false;
      // three.js computes an instanced mesh's bounding sphere once, from whatever matrices it has at its first render,
      // and sorts by its centre; a fixed sphere keeps the draw order independent of render history.
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
      mesh.count = 0;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  /** Sets frame i. `pose` maps the frame's axes to world (no scale). */
  set(i: number, pose: THREE.Matrix4, length: number, brightness: number): void {
    this.s.makeScale(length, length, length);
    this.m.multiplyMatrices(pose, this.s);
    for (let k = 0; k < 3; k++) {
      this.meshes[k].setMatrixAt(i, this.m);
      this.c.copy(this.fade).lerp(this.base[k], Math.max(0, Math.min(1, brightness)));
      this.meshes[k].setColorAt(i, this.c);
    }
  }

  commit(count: number): void {
    const n = Math.max(0, Math.min(this.capacity, count));
    for (const mesh of this.meshes) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.visible = n > 0;
    }
  }
}
