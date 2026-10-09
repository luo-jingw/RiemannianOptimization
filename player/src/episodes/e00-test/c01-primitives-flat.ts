import * as THREE from "three";
import type { Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Axes2D } from "../../primitives/Axes2D";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { Region } from "../../primitives/Region";

export class PrimitivesFlatScene implements Scene {
  readonly id = "c01-a";
  private axes!: Axes2D;
  private circle!: Polyline;
  private ball!: Region;
  private dot!: Dot;
  private arrow!: Arrow;
  private formula!: FormulaHandle;

  setup(layers: SceneLayers): void {
    layers.stage.setView2D(-2.2, 0.3, 6);
    this.axes = new Axes2D(layers.stage, layers.formulas, { xMin: -2, xMax: 2, yMin: -1.6, yMax: 1.8, xLabel: "x", yLabel: "y", grid: true });
    this.circle = new Polyline(layers.stage, circlePoints(0, 0, 1), { color: Palette.blue, width: 5 });
    this.ball = new Region(layers.stage, circlePoints(0.6, 0.8, 0.35, 64), Palette.orange, 0.25);
    this.dot = new Dot(layers.stage, new THREE.Vector3(1, 0, 0), Palette.orange, 0.06);
    this.arrow = new Arrow(layers.stage, new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0.8, 0), Palette.green);
    this.formula = layers.formulas.add({ tex: "S^1=\\{(x,y)\\in\\mathbb{R}^2 : x^2+y^2=1\\}", x: 1300, y: 300, size: 48 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    this.axes.setOpacity(c.p(0, 0.6, -2));
    this.circle.setProgress(c.over(0));
    this.circle.setOpacity(1);
    const a = c.over(1) * Math.PI;
    const p = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    this.dot.setPosition(p);
    this.dot.setOpacity(c.p(1, 0.4));
    this.arrow.set(p, p.clone().add(new THREE.Vector3(-Math.sin(a), Math.cos(a), 0).multiplyScalar(0.8)));
    this.arrow.setOpacity(c.p(1, 0.4));
    this.ball.setOpacity(0.25 * c.p(0, 0.5, 1));
    this.formula.set({ opacity: c.p(0, 0.6), scale: 1 });
  }

  teardown(_layers: SceneLayers): void {}
}
