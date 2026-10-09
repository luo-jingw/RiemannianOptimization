import * as THREE from "three";
import type { Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Surface, sphereFn } from "../../primitives/Surface";
import { TangentPlane } from "../../primitives/TangentPlane";
import { WorldLabel } from "../../primitives/WorldLabel";

export class PrimitivesSpaceScene implements Scene {
  readonly id = "c02-b";
  private sphere!: Surface;
  private plane!: TangentPlane;
  private dot!: Dot;
  private arrow!: Arrow;
  private label!: WorldLabel;

  setup(layers: SceneLayers): void {
    addStandardLights(layers.stage);
    this.sphere = new Surface(layers.stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.9 });
    this.plane = new TangentPlane(layers.stage, Palette.green, 0.7);
    this.dot = new Dot(layers.stage, new THREE.Vector3(), Palette.orange, 0.04, "3d");
    this.arrow = new Arrow(layers.stage, new THREE.Vector3(), new THREE.Vector3(1, 0, 0), Palette.orange, { mode: "3d", headLength: 0.15 });
    this.label = new WorldLabel(layers.stage, layers.formulas, { tex: "T_xS^2 = x^{\\perp}", size: 40, color: Palette.green }, new THREE.Vector3(), { x: 40, y: -40 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const az = 0.6 + 0.25 * ctx.localTime / Math.max(1, ctx.duration);
    ctx.layers.stage.setView3D(new THREE.Vector3(4.2 * Math.cos(az), 4.2 * Math.sin(az), 2.0), new THREE.Vector3(0.5, 0, 0.1), 36);
    const x = new THREE.Vector3(0.5, 0.5, Math.SQRT1_2).normalize();
    this.sphere.setOpacity(1);
    this.dot.setPosition(x);
    this.dot.setOpacity(c.p(0, 0.5));
    this.plane.place(x, x);
    this.plane.setOpacity(c.p(0, 0.8, 0.8));
    const v = new THREE.Vector3(-x.y, x.x, 0).normalize().multiplyScalar(0.6);
    this.arrow.set(x, x.clone().add(v));
    this.arrow.setOpacity(c.p(0, 0.5, 1.5));
    this.label.setAnchor(x);
    this.label.update(c.p(0, 0.6, 1.5));
  }

  teardown(_layers: SceneLayers): void {}
}
