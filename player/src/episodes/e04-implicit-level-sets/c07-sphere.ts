import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Surface, sphereFn } from "../../primitives/Surface";
import { Anchor } from "./lib/Anchor";
import { FlatPatch } from "./lib/FlatPatch";
import { Tex } from "./lib/Tex";

/**
 * E04 c07 — the sphere S^{n−1} = h⁻¹(1), h(x) = xᵀx, shown for n = 3.
 * Phase A (s0–s11): directional derivative Dh(x)[v] = 2xᵀv, surjectivity, conclusion.
 * Phase B (s12–s16): which coordinate to solve for (regions where |x_i| is largest).
 * Phase C (s17–s21): other levels c = 0 (a point) and c = −1 (empty).
 * Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c07-sphere.
 */

const RIGHT_X = 1030;                     // center of the formula column right of the sphere
const ORANGE = Palette.orange;
const XPT = new THREE.Vector3(0.45, -0.55, 0.7).normalize();
const EQPT = new THREE.Vector3(0.75, -0.66, 0).normalize();
const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** The part of the unit sphere where |x[axis]| is the largest coordinate, on the side sign · x[axis] > 0. */
function faceRegion(axis: 0 | 1 | 2, sign: 1 | -1): (u: number, v: number, target: THREE.Vector3) => void {
  return (u, v, target) => {
    const a = -1 + 2 * u;
    const b = -1 + 2 * v;
    const p = axis === 2 ? v3(a, b, sign) : axis === 1 ? v3(a, sign, b) : v3(sign, a, b);
    target.copy(p.normalize().multiplyScalar(1.012));
  };
}

export class SphereScene implements Scene {
  readonly id = "c07-sphere";
  private stage!: StageLayer;
  private anchor!: Anchor;

  private sphere!: Surface;
  private flatSphere!: FlatPatch;
  private title!: FormulaHandle;
  private levelDef!: FormulaHandle;
  private lines: FormulaHandle[] = [];
  private xDot!: Dot;
  private xArrow!: Arrow;
  private xLabel!: FormulaHandle;
  private conclusion!: FormulaHandle;
  private noCharts!: FormulaHandle;
  private faces: FlatPatch[] = [];
  private partials!: FormulaHandle;
  private faceKey!: FormulaHandle;
  private equator!: Polyline;
  private eqDot!: Dot;
  private eqLabel!: FormulaHandle;
  private circleNote!: FormulaHandle;
  private levelLine!: FormulaHandle;
  private originDot!: Dot;
  private zeroNote!: FormulaHandle;
  private emptyNote!: FormulaHandle;
  private recipe!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    this.anchor = new Anchor(stage);
    addStandardLights(stage);

    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.45, isoU: 24, isoV: 12 });
    this.flatSphere = new FlatPatch(stage, sphereFn(1), Palette.blue, 48);
    this.title = fl.add({ tex: "S^{n-1}=\\{x\\in\\mathbb{R}^n:\\ x^\\top x=1\\}", x: 750, y: 100, size: 44 });
    this.levelDef = fl.add({ tex: "S^{n-1}=h^{-1}(1),\\quad h(x)=x^\\top x,\\quad k=1", x: RIGHT_X, y: 230, size: 36 });
    const rows = [
      `h(x+tv)=x^\\top x+${Tex.color(ORANGE, "2t\\,x^\\top v")}+t^2\\,v^\\top v`,
      `Dh(x)[v]=\\tfrac{d}{dt}\\big|_{t=0}h(x+tv)=${Tex.color(ORANGE, "2x^\\top v")}`,
      "Dh(x)[x]=2x^\\top x=2\\neq 0",
      "Dh(x)\\big[\\tfrac{s}{2}x\\big]=s\\ \\ \\text{for every } s\\in\\mathbb{R}\\ \\Rightarrow\\ \\text{onto}",
      `\\operatorname{rank}Dh(x)=1=k\\ \\Rightarrow\\ ${Tex.color(Palette.green, "1\\ \\text{is a regular value}")}`,
    ];
    this.lines = rows.map((tex, i) => fl.add({ tex, x: RIGHT_X, y: 330 + i * 85, size: 34, boxed: i === 1 }));
    this.xDot = new Dot(stage, XPT, ORANGE, 0.045, "3d");
    this.xArrow = new Arrow(stage, v3(0, 0, 0), XPT, ORANGE, { mode: "3d", width: 4, headLength: 0.14, depthTest: false });
    this.xLabel = fl.add({ tex: "x\\neq 0", x: 0, y: 0, size: 34, color: ORANGE, align: "left" });
    this.conclusion = fl.add({ tex: `${Tex.color(Palette.green, "S^{n-1}")}\\ \\text{is a smooth embedded submanifold of } \\mathbb{R}^n,\\ \\dim=n-1`, x: 750, y: 800, size: 36 });
    this.noCharts = fl.add({ text: "one derivative, no chart written by hand", x: 750, y: 800, size: 32, color: Palette.muted });

    const colors = [Palette.green, Palette.green, Palette.teal, Palette.teal, Palette.purple, Palette.purple];
    const axes: (0 | 1 | 2)[] = [2, 2, 0, 0, 1, 1];
    const signs: (1 | -1)[] = [1, -1, 1, -1, 1, -1];
    for (let i = 0; i < 6; i++) this.faces.push(new FlatPatch(stage, faceRegion(axes[i], signs[i]), colors[i], 24));
    this.partials = fl.add({ tex: "\\dfrac{\\partial h}{\\partial x_i}=2x_i:\\quad \\text{solve for the largest } |x_i|", x: RIGHT_X, y: 300, size: 32 });
    this.faceKey = fl.add({ tex: `${Tex.color(Palette.green, "\\text{solve } x_3")}\\qquad ${Tex.color(Palette.teal, "\\text{solve } x_1")}\\qquad ${Tex.color(Palette.purple, "\\text{solve } x_2")}`, x: RIGHT_X, y: 400, size: 34 });
    this.equator = new Polyline(stage, sampleCurve((s) => v3(1.014 * Math.cos(s), 1.014 * Math.sin(s), 0), 0, 2 * Math.PI, 128), { color: Palette.red, width: 3, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.eqDot = new Dot(stage, EQPT.clone().multiplyScalar(1.015), Palette.red, 0.045, "3d");
    this.eqLabel = fl.add({ tex: `\\text{equator: } ${Tex.color(Palette.red, "2x_3=0")}\\ \\Rightarrow\\ \\text{solve } x_1 \\text{ or } x_2`, x: RIGHT_X, y: 500, size: 32 });
    this.circleNote = fl.add({ tex: "\\text{like the circle at } (1,0):\\ \\text{choose the column}", x: RIGHT_X, y: 590, size: 32, color: Palette.muted });

    this.levelLine = fl.add({ tex: "h(x)=x^\\top x=c", x: RIGHT_X, y: 260, size: 40 });
    this.originDot = new Dot(stage, v3(0, 0, 0), Palette.red, 0.06, "3d");
    this.zeroNote = fl.add({ tex: `\\begin{gathered}c=0:\\ h^{-1}(0)=\\{0\\},\\ \\ Dh(0)=0\\ \\Rightarrow\\ ${Tex.color(Palette.red, "\\text{not regular}")}\\\\ \\text{a single point: not of dimension } n-1\\end{gathered}`, x: RIGHT_X, y: 400, size: 32, display: true });
    this.emptyNote = fl.add({ tex: `c=-1:\\ h^{-1}(-1)=\\varnothing\\ \\ (\\text{regular vacuously})`, x: RIGHT_X, y: 540, size: 32 });
    this.recipe = fl.add({ tex: `\\text{expand}\\ \\to\\ \\text{keep the linear term}\\ \\to\\ \\text{check onto}\\qquad ${Tex.color(Palette.muted, "(\\text{next: } O(n))")}`, x: 750, y: 800, size: 34, color: Palette.yellow });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "Dh(x)[v]=2x^\\top v", at: cue.s(5) + 1.5 },
      { label: "2", tex: "1\\ \\text{regular value of } x^\\top x", at: cue.s(9) + 1.5 },
      { label: "3", tex: "S^{n-1}\\ \\text{embedded},\\ \\dim n-1", at: cue.s(10) + 2.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;

    const az = -0.72 + 0.08 * Math.sin(0.05 * t);
    const pos = v3(7.2 * Math.cos(az), 7.2 * Math.sin(az), 3.2);
    const target = v3(0, 0, -0.05);
    const right = target.clone().sub(pos).cross(v3(0, 0, 1)).normalize().multiplyScalar(2.45);
    stage.setView3D(pos.add(right), target.add(right), 34);

    // Sphere; from s17 the lit sphere hands over to an unlit copy that is scaled to radius √c.
    const handover = c.p(17, 0.6);
    this.sphere.setOpacity(c.p(0, 0.8) * (1 - handover));
    const radius = Math.sqrt(Math.max(0, lerp(1, 0, c.over(18, 0.05, 0.5))));
    this.flatSphere.mesh.scale.setScalar(Math.max(radius, 1e-3));
    this.flatSphere.setOpacity(0.35 * handover * (radius > 0.01 ? 1 : 0));
    this.title.set({ opacity: c.p(0, 0.8, 0.5) * (1 - c.p(17, 0.6)) });
    this.levelDef.set({ opacity: c.p(2, 0.6) * (1 - c.p(12, 0.6)) });

    // Directional derivative and surjectivity (s4–s9)
    const shown = [c.p(4, 0.6), c.p(5, 0.6), c.p(7, 0.6), c.p(8, 0.6), c.p(9, 0.6)];
    this.lines.forEach((h, i) => h.set({ opacity: shown[i] * (1 - c.p(12, 0.6)) }));
    const xOn = c.p(6, 0.6) * (1 - c.p(12, 0.6));
    this.xDot.setOpacity(xOn);
    this.xArrow.setOpacity(xOn);
    this.anchor.place(this.xLabel, XPT, xOn, 14, -10);
    this.conclusion.set({ opacity: c.p(10, 0.6) * (1 - c.p(11, 0.5)) });
    this.noCharts.set({ opacity: c.p(11, 0.6) * (1 - c.p(12, 0.5)) });

    // Which coordinate to solve for (s12–s16)
    const facesOn = c.p(13, 0.6) * (1 - c.p(17, 0.6));
    for (let i = 0; i < 6; i++) {
      const own = i < 2 ? c.p(13, 0.6, 0.8) : c.p(14, 0.6, i < 4 ? 0 : 1.2);
      this.faces[i].setOpacity(0.45 * facesOn * own);
    }
    this.partials.set({ opacity: c.p(12, 0.6) * (1 - c.p(17, 0.6)) });
    this.faceKey.set({ opacity: c.p(13, 0.6, 0.8) * (1 - c.p(17, 0.6)) });
    const eqOn = c.p(15, 0.6) * (1 - c.p(17, 0.6));
    this.equator.setOpacity(eqOn);
    this.eqDot.setOpacity(eqOn);
    this.eqDot.setColor(t >= c.in(15, 0.6) ? Palette.teal : Palette.red);
    this.eqLabel.set({ opacity: eqOn });
    this.circleNote.set({ opacity: c.p(16, 0.6) * (1 - c.p(17, 0.6)) });

    // Other levels (s17–s21)
    this.levelLine.set({ opacity: c.p(17, 0.6) });
    this.originDot.setOpacity(c.p(18, 0.4, 0.4) * (1 - c.p(20, 0.6)));
    this.zeroNote.set({ opacity: c.p(18, 0.6, 0.6) });
    this.emptyNote.set({ opacity: c.p(20, 0.6) });
    this.recipe.set({ opacity: c.p(21, 0.6) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
