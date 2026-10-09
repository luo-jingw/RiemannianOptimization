import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";
import { Polyline } from "../../../primitives/Polyline";
import { Region } from "../../../primitives/Region";
import type { PxGroup } from "./PxGroup";

/** Flat arrow inside a PxGroup; endpoints are pixel offsets of that group. */
export class PxArrow {
  private readonly shaft: Polyline;
  private readonly head: Region;
  private opacity = 1;
  private length = 1;

  constructor(stage: StageLayer, private readonly grp: PxGroup, color: string,
              private readonly headLength = 18, width = 4) {
    this.shaft = new Polyline(stage, [grp.v(0, 0), grp.v(1, 0)], { color, width });
    grp.adopt(this.shaft.object);
    this.head = new Region(stage, [
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1, 0.42, 0), new THREE.Vector3(-1, -0.42, 0)], color, 1, 0.02);
    grp.adopt(this.head.object);
  }

  set(fx: number, fy: number, tx: number, ty: number): void {
    const dx = tx - fx;
    const dy = ty - fy;
    this.length = Math.hypot(dx, dy);
    const hl = Math.min(this.headLength, this.length * 0.45);
    const ux = this.length > 1e-9 ? dx / this.length : 1;
    const uy = this.length > 1e-9 ? dy / this.length : 0;
    this.shaft.setPoints([this.grp.v(fx, fy), this.grp.v(tx - ux * hl * 0.8, ty - uy * hl * 0.8)]);
    this.head.object.position.copy(this.grp.v(tx, ty, 0.02));
    this.head.object.rotation.z = Math.atan2(-dy, dx);
    this.head.object.scale.setScalar(Math.max(hl, 1e-6));
    this.applyOpacity();
  }

  setOpacity(o: number): void {
    this.opacity = Math.max(0, Math.min(1, o));
    this.applyOpacity();
  }

  setColor(color: string): void {
    this.shaft.setColor(color);
    this.head.setColor(color);
  }

  private applyOpacity(): void {
    const o = this.length > 0.5 ? this.opacity : 0;
    this.shaft.setOpacity(o);
    this.head.setOpacity(o);
  }
}
