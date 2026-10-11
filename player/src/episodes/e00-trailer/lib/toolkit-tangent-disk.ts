import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Polyline } from "../../../primitives/Polyline";

/** Orthonormal frame of a tangent plane: e1, e2 span the plane, n is the unit normal. */
export interface TangentFrame {
  origin: THREE.Vector3;
  e1: THREE.Vector3;
  e2: THREE.Vector3;
  n: THREE.Vector3;
}

/** The point origin + a e1 + b e2 of the tangent plane, raised by `lift` along n. */
export function framePoint(f: TangentFrame, a: number, b: number, lift = 0): THREE.Vector3 {
  return f.origin.clone().addScaledVector(f.e1, a).addScaledVector(f.e2, b).addScaledVector(f.n, lift);
}

/** A translucent round piece of a tangent plane with a bright rim. */
export class TangentDisk {
  private readonly disk: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly rim: Polyline;
  private readonly unitRim: THREE.Vector2[] = [];

  constructor(stage: StageLayer, color: string) {
    this.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false });
    this.disk = new THREE.Mesh(new THREE.CircleGeometry(1, 96), this.material);
    this.disk.renderOrder = 5;
    stage.root.add(this.disk);
    for (let i = 0; i <= 120; i++) {
      const s = (2 * Math.PI * i) / 120;
      this.unitRim.push(new THREE.Vector2(Math.cos(s), Math.sin(s)));
    }
    this.rim = new Polyline(stage, this.unitRim.map(() => new THREE.Vector3()), { color, width: 2.5 });
    this.rim.object.renderOrder = 6;
  }

  /** Places the disk of the given radius in the frame's plane. Call every frame. */
  set(frame: TangentFrame, radius: number, opacity: number): void {
    const basis = new THREE.Matrix4().makeBasis(frame.e1, frame.e2, frame.n);
    this.disk.quaternion.setFromRotationMatrix(basis);
    this.disk.position.copy(frame.origin).addScaledVector(frame.n, 0.004);
    this.disk.scale.setScalar(Math.max(radius, 1e-4));
    this.material.opacity = 0.2 * Math.max(0, Math.min(1, opacity));
    this.disk.visible = opacity > 0.001;
    this.rim.setPoints(this.unitRim.map((u) => framePoint(frame, radius * u.x, radius * u.y, 0.006)));
    this.rim.setOpacity(opacity);
    this.rim.setProgress(1);
  }
}
