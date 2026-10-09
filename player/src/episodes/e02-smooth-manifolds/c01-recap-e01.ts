import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { Region } from "../../primitives/Region";
import { flash } from "./lib/Flash";
import { LabelPlacer } from "./lib/LabelPlacer";
import { Shapes } from "./lib/Shapes";

/**
 * E02 c01 — recap of open sets, continuity and homeomorphisms; the wrapped interval [0, 2π) → S¹.
 * Full-width layout (no ledger). View: center (0, 0), height 9 world units.
 * Sentence indices refer to content/episodes/e02-smooth-manifolds/story.en.json, scene c01-recap-e01.
 */

const XC = new THREE.Vector2(-3.7, 0.35);   // center of space X
const YC = new THREE.Vector2(3.7, 0.35);    // center of space Y
const CC = new THREE.Vector2(0, 0.6);       // center of the circle S¹
const R = 1.2;                              // circle radius on screen
const L = 2 * Math.PI * R;                  // length of the unwrapped interval
const LINE_Y = -1.75;                       // height of the unwrapped interval
const GHOST_Y = -2.15;                      // height of the preimage copy of the interval
const ARC = 0.42;                           // half-angle of the small arc around (1, 0)

/** Point of the interval [0, 2π) at parameter t, wrapped by amount w ∈ [0, 1]. */
function wrapped(t: number, w: number): THREE.Vector3 {
  const s = R * t;                                        // arclength from the end t = 0
  const k = w / R;                                        // curvature grows from 0 to 1/R
  const local = k < 1e-5
    ? new THREE.Vector2(s, 0)
    : new THREE.Vector2(Math.sin(k * s) / k, (1 - Math.cos(k * s)) / k);
  const theta = w * Math.PI / 2;                          // initial tangent turns from +x to +y
  const anchor = new THREE.Vector2(lerp(-L / 2, CC.x + R, w), lerp(LINE_Y, CC.y, w));
  const c = Math.cos(theta);
  const sn = Math.sin(theta);
  return new THREE.Vector3(anchor.x + c * local.x - sn * local.y, anchor.y + sn * local.x + c * local.y, 0);
}

const ghost = (t: number): THREE.Vector3 => new THREE.Vector3(-L / 2 + R * t, GHOST_Y, 0);

export class RecapE01Scene implements Scene {
  readonly id = "c01-recap-e01";
  private placer!: LabelPlacer;

  private xRegion!: Region;
  private xOutline!: Polyline;
  private nested: Polyline[] = [];
  private yRegion!: Region;
  private yOutline!: Polyline;
  private vRegion!: Region;
  private vOutline!: Polyline;
  private preRegion!: Region;
  private preOutline!: Polyline;
  private arrowF!: CurvedArrow;
  private arrowFinv!: CurvedArrow;
  private labels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private top!: FormulaHandle;
  private homeoBox!: FormulaHandle;

  private interval!: Polyline;
  private dotStart!: Dot;
  private dotEnd!: Dot;
  private label0!: FormulaHandle;
  private label2pi!: FormulaHandle;
  private mapFormula!: FormulaHandle;
  private arcUpper!: Polyline;
  private arcLower!: Polyline;
  private pointLabel!: FormulaHandle;
  private ghostLine!: Polyline;
  private ghostLeft!: Polyline;
  private ghostRight!: Polyline;
  private ghostLabel0!: FormulaHandle;
  private ghostLabel2pi!: FormulaHandle;
  private preLabel!: FormulaHandle;
  private tearLabel!: FormulaHandle;
  private chartLine!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.placer = new LabelPlacer(stage);
    stage.setView2D(0, 0, 9);

    // ---- Open sets, continuity, homeomorphism
    const xPts = Shapes.blob(XC.x, XC.y, 2.3, 1.75, 0.4);
    this.xRegion = new Region(stage, xPts, Palette.blue, 0.12);
    this.xOutline = new Polyline(stage, xPts, { color: Palette.blue, width: 3 });
    this.nested = [0.72, 0.48, 0.26].map((k, i) => new Polyline(stage,
      Shapes.blob(XC.x + 0.35, XC.y + 0.2, 2.3 * k, 1.75 * k, 1.3 + i),
      { color: Palette.text, width: 2, dashed: true, dashSize: 0.12, gapSize: 0.09 }));
    const yPts = Shapes.blob(YC.x, YC.y, 2.3, 1.75, 2.1);
    this.yRegion = new Region(stage, yPts, Palette.purple, 0.1);
    this.yOutline = new Polyline(stage, yPts, { color: Palette.purple, width: 3 });
    const vPts = Shapes.blob(YC.x + 0.4, YC.y + 0.35, 0.8, 0.62, 0.9);
    this.vRegion = new Region(stage, vPts, Palette.orange, 0.35, -0.005);
    this.vOutline = new Polyline(stage, vPts, { color: Palette.orange, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.08 });
    const prePts = Shapes.blob(XC.x - 0.55, XC.y - 0.35, 0.72, 0.58, 2.7);
    this.preRegion = new Region(stage, prePts, Palette.orange, 0.35, -0.005);
    this.preOutline = new Polyline(stage, prePts, { color: Palette.orange, width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.08 });
    this.arrowF = new CurvedArrow(stage, new THREE.Vector3(-1.3, 1.75, 0), new THREE.Vector3(1.3, 1.75, 0), 0.45, Palette.text);
    this.arrowFinv = new CurvedArrow(stage, new THREE.Vector3(1.3, -1.2, 0), new THREE.Vector3(-1.3, -1.2, 0), 0.45, Palette.text);
    const lab = (tex: string, at: THREE.Vector3, color: string, size = 40): { h: FormulaHandle; at: THREE.Vector3 } =>
      ({ h: fl.add({ tex, x: 0, y: 0, size, color }), at });
    this.labels = [
      lab("X", new THREE.Vector3(XC.x - 2.2, XC.y + 1.75, 0), Palette.blue),
      lab("Y", new THREE.Vector3(YC.x + 2.2, YC.y + 1.75, 0), Palette.purple),
      lab("V", new THREE.Vector3(YC.x + 0.4, YC.y + 0.35, 0), Palette.text, 36),
      lab("f^{-1}(V)", new THREE.Vector3(XC.x - 0.55, XC.y - 0.35, 0), Palette.text, 32),
      lab("f", new THREE.Vector3(0, 2.38, 0), Palette.text),
      lab("f^{-1}", new THREE.Vector3(0, -1.88, 0), Palette.text),
    ];
    this.top = fl.add({ tex: "", x: 960, y: 105, size: 42 });
    this.homeoBox = fl.add({
      tex: "\\begin{aligned}&\\text{homeomorphism}\\\\ &=\\ \\text{bijective}\\\\ &+\\ \\text{continuous}\\\\ &+\\ \\text{continuous inverse}\\end{aligned}",
      x: 960, y: 105, size: 34, display: true,
    });

    // ---- Wrapped interval
    const n = 160;
    const ts = sampleCurve((s) => new THREE.Vector3(s, 0, 0), 0, 2 * Math.PI * 0.997, n).map((v) => v.x);
    this.wrapTs = ts;
    this.interval = new Polyline(stage, ts.map((t) => wrapped(t, 0)), { color: Palette.blue, width: 5 });
    this.dotStart = new Dot(stage, wrapped(0, 0), Palette.blue, 0.075);
    this.dotEnd = new Dot(stage, wrapped(2 * Math.PI, 0), Palette.blue, 0.085, "2d", true);
    this.label0 = fl.add({ tex: "0", x: 0, y: 0, size: 34, color: Palette.muted });
    this.label2pi = fl.add({ tex: "2\\pi", x: 0, y: 0, size: 34, color: Palette.muted });
    this.mapFormula = fl.add({ tex: "f:[0,2\\pi)\\to S^1,\\qquad t\\mapsto(\\cos t,\\ \\sin t)", x: 960, y: 105, size: 42 });
    this.arcUpper = new Polyline(stage, Shapes.arc(CC.x, CC.y, R, 0, ARC, 30), { color: Palette.orange, width: 10 });
    this.arcLower = new Polyline(stage, Shapes.arc(CC.x, CC.y, R, -ARC, 0, 30), { color: Palette.purple, width: 10 });
    this.pointLabel = fl.add({ tex: "(1,0)", x: 0, y: 0, size: 32, color: Palette.text, align: "left" });
    this.ghostLine = new Polyline(stage, [ghost(0), ghost(2 * Math.PI)], { color: Palette.muted, width: 3 });
    this.ghostLeft = new Polyline(stage, [ghost(0), ghost(ARC)], { color: Palette.orange, width: 10 });
    this.ghostRight = new Polyline(stage, [ghost(2 * Math.PI - ARC), ghost(2 * Math.PI * 0.997)], { color: Palette.purple, width: 10 });
    this.ghostLabel0 = fl.add({ tex: "0", x: 0, y: 0, size: 32, color: Palette.muted });
    this.ghostLabel2pi = fl.add({ tex: "2\\pi", x: 0, y: 0, size: 32, color: Palette.muted });
    this.preLabel = fl.add({ tex: "f^{-1}(\\text{arc})=[0,\\varepsilon)\\ \\cup\\ (2\\pi-\\varepsilon,\\,2\\pi)", x: 0, y: 0, size: 34, color: Palette.text });
    this.tearLabel = fl.add({ tex: "f^{-1}\\ \\text{not continuous at } (1,0)", x: 0, y: 0, size: 36, color: Palette.red, align: "left" });
    this.chartLine = fl.add({
      tex: "\\text{chart} = \\text{homeomorphism}\\ \\ \\varphi: U\\to\\varphi(U)\\subseteq\\mathbb{R}^d,\\quad \\varphi(U)\\ \\text{open}",
      x: 960, y: 105, size: 40, boxed: true,
    });
  }

  private wrapTs: number[] = [];

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- Phase A: open sets (s1–s5)
    const phaseA = c.p(1, 0.9) * (1 - c.p(6, 0.8));
    this.xRegion.setOpacity(0.12 * phaseA);
    this.xOutline.setOpacity(phaseA);
    const nestDim = 1 - 0.7 * c.p(4, 0.8);
    this.nested.forEach((line, i) => line.setOpacity(phaseA * nestDim * c.p(1, 0.7, 0.8 + 0.7 * i)));
    const phaseY = c.p(4, 0.8) * (1 - c.p(6, 0.8));
    this.yRegion.setOpacity(0.1 * phaseY);
    this.yOutline.setOpacity(phaseY);
    const vOn = c.p(4, 0.6, 1.0) * (1 - c.p(6, 0.8));
    const preOn = c.p(4, 0.6, 2.6) * (1 - c.p(6, 0.8));
    this.vRegion.setOpacity(0.35 * vOn);
    this.vOutline.setOpacity(vOn);
    this.preRegion.setOpacity(0.35 * preOn);
    this.preOutline.setOpacity(preOn);
    this.arrowF.setProgress(c.p(4, 1.0, 0.2), phaseY);
    const inv = c.p(5, 1.0);
    this.arrowFinv.setProgress(inv, phaseY);
    const labelOps = [phaseA, phaseY, vOn, preOn, phaseY * c.p(4, 0.5, 1.0), phaseY * inv];
    this.labels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, labelOps[i]));

    const topTex = t >= c.s(4)
      ? "f\\ \\text{continuous}\\iff f^{-1}(V)\\ \\text{is open for every open } V"
      : "\\tau\\ni\\varnothing,\\ X;\\qquad \\textstyle\\bigcup_{i\\in I} U_i\\in\\tau;\\qquad U_1\\cap\\cdots\\cap U_n\\in\\tau";
    this.top.setContent(topTex);
    const topOn = c.p(2, 0.6) * (1 - c.p(5, 0.6));
    const swap = t >= c.s(4) ? c.p(4, 0.5) : 1;
    this.top.set({ opacity: topOn * swap });
    this.homeoBox.set({ opacity: c.p(5, 0.6, 0.3) * (1 - c.p(6, 0.6)), y: 118 });

    // ---- Phase B: wrapping the interval (s6–s10)
    const phaseB = c.p(6, 0.8) * (1 - 0.8 * c.p(12, 0.8));
    const w = c.over(6, 0.35, 0.98);
    this.interval.setPoints(this.wrapTs.map((s) => wrapped(s, w)));
    this.interval.setOpacity(phaseB);
    this.dotStart.setPosition(wrapped(0, w));
    this.dotStart.setOpacity(phaseB);
    this.dotEnd.setPosition(wrapped(2 * Math.PI, w));
    this.dotEnd.setOpacity(phaseB * (1 - c.p(7, 0.6)));
    this.placer.place(this.label0, wrapped(0, w), 0, 34, phaseB * (1 - w));
    this.placer.place(this.label2pi, wrapped(2 * Math.PI, w), 0, 34, phaseB * (1 - w));
    this.mapFormula.set({ opacity: c.p(6, 0.6) * (1 - c.p(12, 0.6)) });

    const arcOn = c.p(8, 0.6) * (1 - c.p(12, 0.8));
    this.arcUpper.setOpacity(arcOn);
    this.arcLower.setOpacity(arcOn);
    this.placer.place(this.pointLabel, new THREE.Vector3(CC.x + R, CC.y, 0), 22, 0, arcOn);
    const ghostOn = c.p(9, 0.6) * (1 - c.p(12, 0.8));
    this.ghostLine.setOpacity(0.7 * ghostOn);
    this.placer.place(this.ghostLabel0, ghost(0), 0, 36, ghostOn);
    this.placer.place(this.ghostLabel2pi, ghost(2 * Math.PI), 0, 36, ghostOn);
    const tear = flash(t, c.s(10), 0.9, 0.35);
    const piecesOn = ghostOn * tear;
    this.ghostLeft.setOpacity(piecesOn);
    this.ghostRight.setOpacity(piecesOn);
    const redden = c.p(10, 0.4);
    this.ghostLeft.setColor(redden > 0.5 ? Palette.red : Palette.orange);
    this.ghostRight.setColor(redden > 0.5 ? Palette.red : Palette.purple);
    this.placer.place(this.preLabel, ghost(Math.PI), 0, -34, ghostOn * c.p(9, 0.6, 0.8));
    this.preLabel.set({ color: redden > 0.5 ? Palette.red : Palette.text });
    this.placer.place(this.tearLabel, new THREE.Vector3(CC.x + R + 0.9, CC.y + 0.9, 0), 0, 0, c.p(10, 0.6, 0.6) * (1 - c.p(12, 0.6)));

    this.chartLine.set({ opacity: c.p(12, 0.7) });
  }

  teardown(_layers: SceneLayers): void {}
}
