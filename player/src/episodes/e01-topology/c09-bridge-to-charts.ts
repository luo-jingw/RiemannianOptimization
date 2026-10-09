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
import { keyframes } from "../../primitives/Keyframes";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ColoredSphere } from "./lib/ColoredSphere";
import { PixelSpace } from "./lib/PixelSpace";
import { placeAt } from "./lib/place";
import { tc } from "./lib/tex";

/**
 * E01 c09 — recap of the chain distance → open set → topology → convergence/continuity → homeomorphism;
 * the definition of a chart; the upper-half chart of S¹, φ(x, y) = x; why several charts are needed.
 * s5–s10 use a 3D view (sphere and a peeled-off patch); s11 onward use a 2D pixel view.
 * Sentence indices refer to story.en.json, scene c09-bridge-to-charts.
 */

const DEG = Math.PI / 180;
const CAP_C = new THREE.Vector3(Math.cos(25 * DEG) * Math.cos(30 * DEG), Math.cos(25 * DEG) * Math.sin(30 * DEG), Math.sin(25 * DEG));
const CAP_E = new THREE.Vector3(0, 0, 1).cross(CAP_C).normalize();
const CAP_N = CAP_C.clone().cross(CAP_E).normalize();
const CAP_R = 0.55;
const PLANE_Z = -1.5;
const PLANE_C = new THREE.Vector3(0.55, 0.45, PLANE_Z);
const capPoint = (rho: number, th: number): THREE.Vector3 =>
  CAP_C.clone().multiplyScalar(Math.cos(rho)).add(CAP_E.clone().multiplyScalar(Math.sin(rho) * Math.cos(th))).add(CAP_N.clone().multiplyScalar(Math.sin(rho) * Math.sin(th))).multiplyScalar(1.01);
const flatPoint = (rho: number, th: number): THREE.Vector3 =>
  PLANE_C.clone().add(new THREE.Vector3(1.05 * rho * Math.cos(th + 0.6), 1.05 * rho * Math.sin(th + 0.6), 0));

const CC = { x: 560, y: 470, r: 220 };     // the circle of the S¹ example (pixels)
const cpt = (x: number, y: number): THREE.Vector3 => PixelSpace.p(CC.x + CC.r * x, CC.y - CC.r * y);

const NODES = [
  { tex: "\\text{distance}", ch: "c02" },
  { tex: "\\text{open ball}", ch: "c02" },
  { tex: "\\text{open set}", ch: "c02" },
  { tex: "\\text{topology}", ch: "c03" },
  { tex: "\\text{convergence / continuity}", ch: "c04, c05" },
  { tex: "\\text{homeomorphism}", ch: "c07" },
];

export class BridgeToChartsScene implements Scene {
  readonly id = "c09-bridge-to-charts";
  private stage!: StageLayer;

  private nodes: FormulaHandle[] = [];
  private nodeArrows: FormulaHandle[] = [];

  private sphere!: ColoredSphere;
  private patchCurves: { pts: { rho: number; th: number }[]; line: Polyline }[] = [];
  private plane!: Polyline;
  private capRing!: Polyline;
  private phiArrow!: Arrow;
  private phiInvArrow!: Arrow;
  private labels3d: { h: FormulaHandle; at: () => THREE.Vector3 }[] = [];
  private chartDef!: FormulaHandle;
  private wordNote!: FormulaHandle;
  private manifoldDef!: FormulaHandle;

  private circle!: Polyline;
  private upper!: Polyline;
  private upperEnds: Dot[] = [];
  private axis!: Polyline;
  private interval!: Polyline;
  private intervalEnds: Dot[] = [];
  private sweepLine!: Polyline;
  private sweepTop!: Dot;
  private sweepBottom!: Dot;
  private circleLabels: FormulaHandle[] = [];
  private chartSteps!: FormulaHandle;
  private compare!: FormulaHandle;
  private halves: Polyline[] = [];
  private halfLabels: FormulaHandle[] = [];
  private overlapQ!: FormulaHandle;
  private closing!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);

    NODES.forEach((n, i) => {
      this.nodes.push(fl.add({ tex: `${n.tex}\\ \\ ${tc(Palette.muted, `\\scriptsize ${n.ch}`)}`, x: 960, y: 0, size: 38, boxed: true }));
      if (i > 0) this.nodeArrows.push(fl.add({ tex: "\\downarrow", x: 960, y: 0, size: 34, color: Palette.muted }));
    });

    // ---- 3D: sphere and the patch
    this.sphere = new ColoredSphere(stage, () => new THREE.Color("#2c5d99"), 0.9);
    const curves: { rho: number; th: number }[][] = [];
    for (const rho of [CAP_R / 3, (2 * CAP_R) / 3, CAP_R]) curves.push(Array.from({ length: 65 }, (_, i) => ({ rho, th: (i / 64) * 2 * Math.PI })));
    for (let k = 0; k < 6; k++) curves.push(Array.from({ length: 13 }, (_, i) => ({ rho: (CAP_R * i) / 12, th: (k * Math.PI) / 3 })));
    this.patchCurves = curves.map((pts, i) => ({
      pts,
      line: new Polyline(stage, pts.map((q) => capPoint(q.rho, q.th)), i === 2
        ? { color: Palette.green, width: 3.5, dashed: true, dashSize: 0.06, gapSize: 0.04 }
        : { color: Palette.green, width: 1.8 }),
    }));
    this.capRing = new Polyline(stage, Array.from({ length: 65 }, (_, i) => capPoint(CAP_R, (i / 64) * 2 * Math.PI)), { color: Palette.green, width: 2.5, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    const pc = PLANE_C;
    this.plane = new Polyline(stage, [
      new THREE.Vector3(pc.x - 0.9, pc.y - 0.9, PLANE_Z), new THREE.Vector3(pc.x + 0.9, pc.y - 0.9, PLANE_Z),
      new THREE.Vector3(pc.x + 0.9, pc.y + 0.9, PLANE_Z), new THREE.Vector3(pc.x - 0.9, pc.y + 0.9, PLANE_Z),
      new THREE.Vector3(pc.x - 0.9, pc.y - 0.9, PLANE_Z),
    ], { color: Palette.purple, width: 2 });
    const top = capPoint(0, 0);
    this.phiArrow = new Arrow(stage, top.clone().add(CAP_E.clone().multiplyScalar(0.12)), PLANE_C.clone().add(new THREE.Vector3(0.12, 0, 0.05)), Palette.text, { width: 3, headLength: 0.12, mode: "3d" });
    this.phiInvArrow = new Arrow(stage, PLANE_C.clone().add(new THREE.Vector3(-0.12, 0, 0.05)), top.clone().sub(CAP_E.clone().multiplyScalar(0.12)), Palette.yellow, { width: 3, headLength: 0.12, mode: "3d" });
    this.labels3d = [
      { h: fl.add({ tex: "U", x: 0, y: 0, size: 36, color: Palette.green }), at: () => capPoint(CAP_R * 1.25, 1.9) },
      { h: fl.add({ tex: "\\varphi(U)\\subseteq\\mathbb{R}^2", x: 0, y: 0, size: 32, color: Palette.purple }), at: () => new THREE.Vector3(pc.x - 1.7, pc.y + 0.7, PLANE_Z) },
      { h: fl.add({ tex: "\\varphi", x: 0, y: 0, size: 34 }), at: () => top.clone().lerp(PLANE_C, 0.5).add(CAP_E.clone().multiplyScalar(0.35)) },
      { h: fl.add({ tex: "\\varphi^{-1}", x: 0, y: 0, size: 34, color: Palette.yellow }), at: () => top.clone().lerp(PLANE_C, 0.5).sub(CAP_E.clone().multiplyScalar(0.35)) },
      { h: fl.add({ tex: "M", x: 0, y: 0, size: 38, color: Palette.blue }), at: () => new THREE.Vector3(0.3, -1.25, -0.2) },
    ];
    this.chartDef = fl.add({
      tex: `\\text{chart } (U,\\varphi):\\ \\ ${tc(Palette.green, "U\\subseteq M\\ \\text{open}")},\\ \\ \\varphi:U\\to\\varphi(U)\\ ${tc(Palette.yellow, "\\text{homeomorphism}")},\\ \\ ${tc(Palette.purple, "\\varphi(U)\\subseteq\\mathbb{R}^n\\ \\text{open}")}`,
      x: 1120, y: 100, size: 32, boxed: true,
    });
    this.wordNote = fl.add({ tex: `${tc(Palette.green, "\\text{open: c03}")}\\qquad ${tc(Palette.yellow, "\\text{homeomorphism: c07}")}\\qquad ${tc(Palette.purple, "\\text{open subset of }\\mathbb{R}^n:\\ (-1,1)\\cong\\mathbb{R}")}`, x: 1120, y: 170, size: 28 });
    this.manifoldDef = fl.add({
      tex: "\\text{topological manifold } M:\\ \\text{every point lies in a chart domain}\\ +\\ \\text{Hausdorff}\\ +\\ \\text{second countable}",
      x: 1120, y: 800, size: 28, boxed: true,
    });

    // ---- 2D: the upper-half chart of S¹
    const circ: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) circ.push(cpt(Math.cos((i / 160) * 2 * Math.PI), Math.sin((i / 160) * 2 * Math.PI)));
    this.circle = new Polyline(stage, circ, { color: Palette.blue, width: 3 });
    const up: THREE.Vector3[] = [];
    for (let i = 1; i < 80; i++) up.push(cpt(Math.cos((i / 80) * Math.PI), Math.sin((i / 80) * Math.PI)));
    this.upper = new Polyline(stage, up, { color: Palette.green, width: 8 });
    this.upperEnds = [new Dot(stage, cpt(1, 0), Palette.green, 0.1, "2d", true), new Dot(stage, cpt(-1, 0), Palette.green, 0.1, "2d", true)];
    this.axis = new Polyline(stage, [cpt(-1.5, 0), cpt(1.5, 0)], { color: Palette.axis, width: 2 });
    this.interval = new Polyline(stage, [cpt(-1, 0), cpt(1, 0)], { color: Palette.purple, width: 8 });
    this.intervalEnds = [new Dot(stage, cpt(1, 0), Palette.purple, 0.07, "2d", true), new Dot(stage, cpt(-1, 0), Palette.purple, 0.07, "2d", true)];
    this.sweepLine = new Polyline(stage, [cpt(0, 0), cpt(0, 1)], { color: Palette.yellow, width: 2, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.sweepTop = new Dot(stage, cpt(0, 1), Palette.yellow, 0.07);
    this.sweepBottom = new Dot(stage, cpt(0, 0), Palette.yellow, 0.07);
    this.circleLabels = [
      fl.add({ tex: "U=\\{(x,y)\\in S^1:\\ y>0\\}", x: CC.x, y: CC.y - CC.r - 40, size: 32, color: Palette.green }),
      fl.add({ tex: "(-1,1)", x: CC.x, y: CC.y + 40, size: 30, color: Palette.purple }),
      fl.add({ tex: "-1", x: CC.x - CC.r - 10, y: CC.y + 36, size: 26, color: Palette.muted }),
      fl.add({ tex: "1", x: CC.x + CC.r + 10, y: CC.y + 36, size: 26, color: Palette.muted }),
    ];
    this.chartSteps = fl.add({ tex: this.stepsTex(0), x: 1380, y: 420, size: 32, display: true });
    this.compare = fl.add({ tex: `\\text{c08: one angle for all of } S^1\\ ${tc(Palette.red, "\\times")}\\qquad \\text{chart: one open piece}\\ ${tc(Palette.green, "\\checkmark")}`, x: 1380, y: 760, size: 30 });
    const halfArc = (a0: number, a1: number, r: number): THREE.Vector3[] => Array.from({ length: 61 }, (_, i) => {
      const a = lerp(a0, a1, i / 60);
      return PixelSpace.p(CC.x + r * Math.cos(a), CC.y - r * Math.sin(a));
    });
    const hc = [Palette.green, Palette.orange, Palette.teal, Palette.pink];
    const hr = [CC.r + 18, CC.r - 18, CC.r + 34, CC.r - 34];
    const ha: [number, number][] = [[0.04, Math.PI - 0.04], [Math.PI + 0.04, 2 * Math.PI - 0.04], [-Math.PI / 2 + 0.04, Math.PI / 2 - 0.04], [Math.PI / 2 + 0.04, 1.5 * Math.PI - 0.04]];
    this.halves = ha.map((a, i) => new Polyline(stage, halfArc(a[0], a[1], hr[i]), { color: hc[i], width: 6 }));
    this.halfLabels = [
      fl.add({ tex: "y>0", x: CC.x, y: CC.y - CC.r - 60, size: 28, color: hc[0] }),
      fl.add({ tex: "y<0", x: CC.x, y: CC.y + CC.r + 50, size: 28, color: hc[1] }),
      fl.add({ tex: "x>0", x: CC.x + CC.r + 80, y: CC.y, size: 28, color: hc[2] }),
      fl.add({ tex: "x<0", x: CC.x - CC.r - 80, y: CC.y, size: 28, color: hc[3] }),
    ];
    this.overlapQ = fl.add({ text: "how do overlapping charts agree?  →  E02", x: 1380, y: 470, size: 34, color: Palette.yellow });
    this.closing = fl.add({ tex: "\\text{topological manifold: continuity only}\\ \\Rightarrow\\ \\text{gradients need a smooth structure (E02)}", x: 960, y: 800, size: 32 });
  }

  private stepsTex(n: number): string {
    const rows = [
      "\\varphi(x,y)=x\\ \\ \\text{(restricted projection): continuous}",
      "\\varphi(U)=(-1,1):\\ \\ y>0\\Rightarrow x^2<1",
      "\\psi(x)=\\big(x,\\sqrt{1-x^2}\\big)\\in U\\ \\ \\text{continuous}",
      "\\varphi\\circ\\psi=\\mathrm{id}_{(-1,1)}",
      "\\psi\\circ\\varphi=\\mathrm{id}_U\\quad(y>0\\Rightarrow y=\\sqrt{1-x^2})",
      "\\Rightarrow\\ \\varphi\\ \\text{bijective},\\ \\varphi^{-1}=\\psi\\ \\text{continuous}",
      "U\\ \\text{open in } S^1,\\ (-1,1)\\ \\text{open in } \\mathbb{R}\\ \\Rightarrow\\ (U,\\varphi)\\ \\text{chart}",
    ];
    return `\\begin{aligned}&${rows.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\[6pt]&")}\\end{aligned}`;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;

    // ---- flowchart (s0–s10): centered, then parked at the left during the chart definition
    const lit = [c.p(1, 0.4), c.p(1, 0.4, 1.2), c.p(1, 0.4, 2.4), c.p(2, 0.4), c.p(3, 0.4), c.p(4, 0.4)];
    const park = keyframes(t, [
      { t: 0, v: { x: 960, y0: 200, dy: 100, s: 1, o: 1 } },
      { t: c.s(5), v: { x: 230, y0: 250, dy: 90, s: 0.72, o: 1 } },
      { t: c.s(11), v: { x: 230, y0: 250, dy: 90, s: 0.72, o: 0 } },
    ], 0.9);
    const flowOn = c.p(0, 0.6) * park.o;
    const hl = t >= c.s(8) && t < c.s(9);
    this.nodes.forEach((h, i) => {
      const y = park.y0 + i * park.dy;
      const match = hl && (i === 2 || i === 5);
      const col = match ? (i === 2 ? Palette.green : Palette.yellow) : lit[i] > 0.5 ? Palette.text : Palette.muted;
      h.set({ x: park.x, y, scale: park.s, opacity: flowOn * lerp(0.35, 1, lit[i]), color: col });
    });
    this.nodeArrows.forEach((h, i) => h.set({ x: park.x, y: park.y0 + (i + 0.5) * park.dy, scale: park.s, opacity: flowOn * lerp(0.3, 1, lit[i + 1]) }));

    // ---- 3D section (s5–s10)
    const threeD = t < c.s(11) + 0.6;
    const sphOn = c.p(5, 0.8) * (1 - c.p(11, 0.6));
    if (threeD) {
      const az = 35 * DEG;
      const el = 28 * DEG;
      const dist = 9.5;
      const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
      const right = dir.clone().negate().cross(new THREE.Vector3(0, 0, 1)).normalize();
      const target = new THREE.Vector3(0.2, 0.2, -0.83).sub(right.multiplyScalar(1.15));
      stage.setView3D(target.clone().add(dir.multiplyScalar(dist)), target, 34);
    } else {
      PixelSpace.apply(stage);
    }
    this.sphere.set(threeD ? sphOn : 0, true);
    const peel = c.over(6, 0.2, 0.9);
    const patchOn = threeD ? sphOn * c.p(5, 0.6, 1.0) : 0;
    this.patchCurves.forEach((pc) => {
      pc.line.setPoints(pc.pts.map((q) => capPoint(q.rho, q.th).lerp(flatPoint(q.rho, q.th), peel)));
      pc.line.setOpacity(patchOn);
    });
    this.capRing.setOpacity(threeD ? sphOn * c.p(6, 0.6, 1.0) * 0.8 : 0);
    const planeOn = threeD ? sphOn * c.p(6, 0.6) : 0;
    this.plane.setOpacity(planeOn * 0.8);
    const arrowsOn = threeD ? sphOn * c.p(7, 0.6) : 0;
    this.phiArrow.setOpacity(arrowsOn);
    this.phiInvArrow.setOpacity(arrowsOn * c.p(7, 0.6, 0.8));
    const l3 = [patchOn, planeOn * (peel > 0.9 ? 1 : 0), arrowsOn, arrowsOn * c.p(7, 0.6, 0.8), sphOn];
    this.labels3d.forEach((l, i) => {
      if (threeD) placeAt(stage, l.h, l.at(), 0, 0, l3[i]);
      else l.h.set({ opacity: 0 });
    });
    this.chartDef.set({ opacity: c.p(6, 0.6) * (1 - c.p(11, 0.6)) });
    this.wordNote.set({ opacity: c.p(8, 0.6) * (1 - c.p(11, 0.6)) });
    this.manifoldDef.set({ opacity: c.p(9, 0.6) * (1 - c.p(11, 0.6)) });

    // ---- 2D: upper-half chart (s11–s18)
    const two = threeD ? 0 : 1;
    const circOn = two * c.p(11, 0.6, 0.6);
    this.circle.setOpacity(circOn);
    const upOn = circOn * (1 - c.p(21, 0.5));
    this.upper.setOpacity(upOn);
    this.upperEnds.forEach((d) => d.setOpacity(upOn));
    this.axis.setOpacity(circOn * (1 - c.p(21, 0.5)));
    const intOn = circOn * c.p(13, 0.5) * (1 - c.p(21, 0.5));
    this.interval.setOpacity(intOn);
    this.intervalEnds.forEach((d) => d.setOpacity(intOn));
    const sweep = c.over(14, 0.05, 0.95);
    const xs = lerp(-0.97, 0.97, sweep);
    const ys = Math.sqrt(1 - xs * xs);
    const swOn = circOn * c.during(12, 15, 0.3);
    const xNow = t < c.s(14) ? lerp(-0.97, 0.97, c.over(12, 0.05, 0.95)) : xs;
    const yNow = Math.sqrt(1 - xNow * xNow);
    this.sweepLine.setPoints([cpt(xNow, 0), cpt(xNow, yNow)]);
    this.sweepLine.setOpacity(swOn);
    this.sweepTop.setPosition(cpt(xNow, yNow));
    this.sweepBottom.setPosition(cpt(xNow, 0));
    this.sweepTop.setOpacity(swOn);
    this.sweepBottom.setOpacity(swOn);
    void ys;
    this.circleLabels[0].set({ opacity: circOn * (1 - c.p(21, 0.5)) });
    this.circleLabels.slice(1).forEach((h) => h.set({ opacity: intOn }));
    const sn = t >= c.s(18) ? 7 : t >= c.s(17) ? 6 : t >= c.s(16) ? 5 : t >= c.s(15) ? 4 : t >= c.s(14) ? 3 : t >= c.s(13) ? 2 : t >= c.s(12) ? 1 : 0;
    this.chartSteps.setContent(this.stepsTex(sn));
    this.chartSteps.set({ opacity: two * (sn > 0 ? 1 : 0) * (1 - c.p(19, 0.5)) });
    this.compare.set({ opacity: two * c.p(19, 0.5) * (1 - c.p(21, 0.5)) });

    // ---- several charts (s21–s22)
    const hv = two * c.p(21, 0.5) * (1 - c.p(23, 0.6));
    const flash = t >= c.s(22) ? 0.65 + 0.35 * Math.cos((t - c.s(22)) * 5) : 1;
    this.halves.forEach((h, i) => h.setOpacity(hv * c.p(21, 0.4, 0.6 * i) * flash));
    this.halfLabels.forEach((h, i) => h.set({ opacity: hv * c.p(21, 0.4, 0.6 * i) }));
    this.overlapQ.set({ opacity: hv * c.p(22, 0.5) });
    this.circle.setOpacity(circOn * (1 - 0.7 * c.p(23, 0.6)));
    this.closing.set({ opacity: c.p(23, 0.6) });
  }

  teardown(_layers: SceneLayers): void {}
}
