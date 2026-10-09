import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, smoothstep } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints, sampleCurve } from "../../primitives/Polyline";
import { Surface } from "../../primitives/Surface";
import { TangentPlane } from "../../primitives/TangentPlane";
import { Tex } from "./lib/Tex";

/**
 * E04 c08 — what happens without regularity.
 * A (s1–s2, 3D): saddle z = x² − y² sliced at z = c. B (s3–s6, 2D): level sets x² − y² = c.
 * C (s7–s8): zooming a circle point versus the crossing. D (s9–s14): component-count proof.
 * E (s15–s28): the cusp y² = x³ — topological manifold, not an embedded submanifold (uses a stated fact).
 * F (s29–s31): γ(t) = (t², t³) has γ'(0) = 0. G (s32–s39, 3D): h = (xᵀx − 1)², the flat trough.
 * H (s40–s46): one-way theorem, disconnected and empty regular level sets, summary.
 * The 2D stage uses a pixel-aligned view: world (X, Y) = (px / 100, −py / 100). Full width (no ledger).
 * Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c08-when-regularity-fails.
 */

const px = (x: number, y: number, z = 0): THREE.Vector3 => new THREE.Vector3(x / 100, -y / 100, z);
const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const N_BRANCH = 80;
const PLOT_B = { x: 960, y: 470, s: 200 };          // level-set plot: center pixel, pixels per unit
const LIM = 1.55;
const ZOOM_L = { x: 560, y: 470 };
const ZOOM_R = { x: 1360, y: 470 };
const PANEL = 210;                                  // half size of the zoom panels (px)
const CUSP = { x: 470, y: 470, s: 270 };
const TEXT_X = 1330;
const ARM_COLORS = [Palette.orange, Palette.green, Palette.purple, Palette.teal];

/** The two branches of x² − y² = c within |x|, |y| ≤ lim, mapped by `map` (constant point counts). */
function branches(c: number, lim: number, map: (x: number, y: number) => THREE.Vector3): THREE.Vector3[][] {
  if (c >= 0) {
    const m = Math.sqrt(Math.max(0, lim * lim - c));
    const pts = (sign: number): THREE.Vector3[] => sampleCurve((y) => map(sign * Math.sqrt(c + y * y), y), -m, m, N_BRANCH);
    return [pts(1), pts(-1)];
  }
  const m = Math.sqrt(Math.max(0, lim * lim + c));
  const pts = (sign: number): THREE.Vector3[] => sampleCurve((x) => map(x, sign * Math.sqrt(x * x - c)), -m, m, N_BRANCH);
  return [pts(1), pts(-1)];
}

export class RegularityFailsScene implements Scene {
  readonly id = "c08-when-regularity-fails";
  private stage!: StageLayer;

  private intro!: FormulaHandle;
  // A
  private saddle!: Surface;
  private slice!: Surface;
  private cut3d: Polyline[] = [];
  private saddleLabel!: FormulaHandle;
  // B
  private axesB: Arrow[] = [];
  private branchesB: Polyline[] = [];
  private originB!: Dot;
  private readoutC!: FormulaHandle;
  private derivNote!: FormulaHandle;
  // C
  private frames: Polyline[] = [];
  private zoomArc!: Polyline;
  private zoomDot!: Dot;
  private zoomCross: Polyline[] = [];
  private zoomCrossDot!: Dot;
  private zoomTitles: FormulaHandle[] = [];
  private zoomReadout!: FormulaHandle;
  // D
  private nDisk!: Polyline;
  private arms: Polyline[] = [];
  private nOrigin!: Dot;
  private nHole!: Dot;
  private interval: Polyline[] = [];
  private tDot!: Dot;
  private tHole!: Dot;
  private proofLabels: FormulaHandle[] = [];
  // E
  private cuspAxes: Arrow[] = [];
  private cuspCurve!: Polyline;
  private cuspTop!: FormulaHandle;
  private projLines: Polyline[] = [];
  private yAxisGlow!: Polyline;
  private cuspGraphLabel!: FormulaHandle;
  private probe!: Polyline;
  private probeLabel!: FormulaHandle;
  private steps: FormulaHandle[] = [];
  // F
  private gammaDot!: Dot;
  private gammaArrow!: Arrow;
  private gammaReadout!: FormulaHandle;
  // G
  private trough!: Surface;
  private troughCircle!: Polyline;
  private flatPlane!: TangentPlane;
  private troughTexts: FormulaHandle[] = [];
  // H
  private logic!: FormulaHandle;
  private warnings: FormulaHandle[] = [];
  private miniAxes: Arrow[] = [];
  private miniBranches: Polyline[] = [];
  private summary!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    const ax = (a: THREE.Vector3, b: THREE.Vector3, head = 0.12): Arrow => new Arrow(stage, a, b, Palette.axis, { width: 2, headLength: head });

    this.intro = fl.add({ tex: `\\text{regular value}\\ \\Rightarrow\\ \\text{manifold}.\\qquad \\text{Without regularity: }${Tex.color(Palette.red, "?")}`, x: 960, y: 420, size: 46 });

    // ---- A: saddle and slicing plane
    this.saddle = new Surface(stage, (u, v, target) => {
      const x = -1.4 + 2.8 * u;
      const y = -1.4 + 2.8 * v;
      target.set(x, y, x * x - y * y);
    }, Palette.blue, { opacity: 0.55, wireframe: true, isoU: 14, isoV: 14, segments: 64 });
    this.slice = new Surface(stage, (u, v, target) => target.set(-1.6 + 3.2 * u, -1.6 + 3.2 * v, 0), Palette.muted, { opacity: 0.3, segments: 2 });
    this.cut3d = [0, 1].map(() => new Polyline(stage, sampleCurve(() => v3(0, 0, 0), 0, 1, N_BRANCH), { color: Palette.yellow, width: 5 }));
    this.saddleLabel = fl.add({ tex: "z=h(x,y)=x^2-y^2,\\qquad \\text{slice } z=c", x: 960, y: 100, size: 42 });

    // ---- B: level sets in the plane
    const B = (x: number, y: number): THREE.Vector3 => px(PLOT_B.x + x * PLOT_B.s, PLOT_B.y - y * PLOT_B.s, 0.01);
    this.axesB = [ax(B(-1.7, 0), B(1.75, 0)), ax(B(0, -1.65), B(0, 1.7))];
    this.branchesB = [0, 1].map(() => new Polyline(stage, sampleCurve(() => v3(0, 0, 0), 0, 1, N_BRANCH), { color: Palette.green, width: 5 }));
    this.originB = new Dot(stage, B(0, 0), Palette.red, 0.07);
    this.readoutC = fl.add({ tex: "", x: 1250, y: 200, size: 40, align: "left" });
    this.derivNote = fl.add({ tex: "Dh=(2x,\\,-2y)=0\\iff (x,y)=(0,0)", x: 1250, y: 300, size: 32, align: "left" });

    // ---- C: zoom comparison
    for (const P of [ZOOM_L, ZOOM_R]) {
      this.frames.push(new Polyline(stage, [px(P.x - PANEL, P.y - PANEL), px(P.x + PANEL, P.y - PANEL), px(P.x + PANEL, P.y + PANEL), px(P.x - PANEL, P.y + PANEL), px(P.x - PANEL, P.y - PANEL)], { color: Palette.grid, width: 2 }));
    }
    this.zoomArc = new Polyline(stage, sampleCurve(() => v3(0, 0, 0), 0, 1, 120), { color: Palette.blue, width: 5 });
    this.zoomDot = new Dot(stage, px(ZOOM_L.x, ZOOM_L.y, 0.02), Palette.orange, 0.07);
    this.zoomCross = [
      new Polyline(stage, [px(ZOOM_R.x - PANEL, ZOOM_R.y + PANEL), px(ZOOM_R.x + PANEL, ZOOM_R.y - PANEL)], { color: Palette.red, width: 5 }),
      new Polyline(stage, [px(ZOOM_R.x - PANEL, ZOOM_R.y - PANEL), px(ZOOM_R.x + PANEL, ZOOM_R.y + PANEL)], { color: Palette.red, width: 5 }),
    ];
    this.zoomCrossDot = new Dot(stage, px(ZOOM_R.x, ZOOM_R.y, 0.02), Palette.orange, 0.07);
    this.zoomTitles = [
      fl.add({ text: "a point of a circle: straighter and straighter", x: ZOOM_L.x, y: ZOOM_L.y - PANEL - 34, size: 30, color: Palette.blue }),
      fl.add({ text: "the crossing: the same at every scale", x: ZOOM_R.x, y: ZOOM_R.y - PANEL - 34, size: 30, color: Palette.red }),
    ];
    this.zoomReadout = fl.add({ tex: "", x: 960, y: 760, size: 38 });

    // ---- D: component counting
    const Nc = { x: 560, y: 470, r: 200 };
    this.nDisk = new Polyline(stage, circlePoints(Nc.x / 100, -Nc.y / 100, Nc.r / 100, 96), { color: Palette.muted, width: 2, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    this.arms = [45, 135, 225, 315].map((deg, i) => {
      const a = (deg * Math.PI) / 180;
      return new Polyline(stage, [px(Nc.x + 12 * Math.cos(a), Nc.y - 12 * Math.sin(a), 0.01), px(Nc.x + Nc.r * Math.cos(a), Nc.y - Nc.r * Math.sin(a), 0.01)], { color: ARM_COLORS[i], width: 6 });
    });
    this.nOrigin = new Dot(stage, px(Nc.x, Nc.y, 0.02), Palette.blue, 0.07);
    this.nHole = new Dot(stage, px(Nc.x, Nc.y, 0.03), Palette.red, 0.09, "2d", true);
    this.interval = [
      new Polyline(stage, [px(1160, 470, 0.01), px(1348, 470, 0.01)], { color: Palette.orange, width: 6 }),
      new Polyline(stage, [px(1372, 470, 0.01), px(1560, 470, 0.01)], { color: Palette.green, width: 6 }),
    ];
    this.tDot = new Dot(stage, px(1360, 470, 0.02), Palette.blue, 0.07);
    this.tHole = new Dot(stage, px(1360, 470, 0.03), Palette.red, 0.09, "2d", true);
    this.proofLabels = [
      fl.add({ tex: "N\\subseteq\\text{cross},\\ 0\\in N", x: Nc.x, y: 220, size: 34 }),
      fl.add({ tex: "\\text{open interval},\\ t", x: 1360, y: 220, size: 34 }),
      fl.add({ tex: "\\overset{?}{\\cong}", x: 960, y: 470, size: 56, color: Palette.yellow }),
      fl.add({ tex: `N\\setminus\\{0\\}:\\ ${Tex.color(Palette.red, "\\geq 4")}\\ \\text{pieces}`, x: Nc.x, y: 730, size: 36 }),
      fl.add({ tex: `(\\text{interval})\\setminus\\{t\\}:\\ ${Tex.color(Palette.red, "2")}\\ \\text{pieces}`, x: 1360, y: 730, size: 36 }),
      fl.add({ tex: `4\\neq 2\\ \\Rightarrow\\ ${Tex.color(Palette.red, "\\text{not a topological manifold at } 0")}`, x: 960, y: 820, size: 38 }),
    ];

    // ---- E: the cusp
    const Cq = (x: number, y: number, z = 0.01): THREE.Vector3 => px(CUSP.x + x * CUSP.s, CUSP.y - y * CUSP.s, z);
    this.cuspAxes = [ax(Cq(-0.6, 0), Cq(1.45, 0)), ax(Cq(0, -1.35), Cq(0, 1.4))];
    this.cuspCurve = new Polyline(stage, sampleCurve((y) => Cq(Math.pow(Math.abs(y), 2 / 3), y), -1.2, 1.2, 240), { color: Palette.orange, width: 5 });
    this.cuspTop = fl.add({ tex: `h=y^2-x^3,\\quad Dh=(-3x^2,\\ 2y),\\quad ${Tex.color(Palette.red, "Dh(0,0)=(0,0)")}`, x: 960, y: 90, size: 38 });
    this.projLines = [-1.0, -0.7, -0.4, -0.15, 0.15, 0.4, 0.7, 1.0].map((y) =>
      new Polyline(stage, [Cq(Math.pow(Math.abs(y), 2 / 3), y), Cq(0, y)], { color: Palette.muted, width: 1.8, dashed: true, dashSize: 0.05, gapSize: 0.04 }));
    this.yAxisGlow = new Polyline(stage, [Cq(0, -1.2, 0.005), Cq(0, 1.2, 0.005)], { color: Palette.green, width: 7 });
    this.cuspGraphLabel = fl.add({ tex: `x=|y|^{2/3}:\\ \\ (x,y)\\mapsto y\\ \\text{is a homeomorphism onto } \\mathbb{R}`, x: TEXT_X, y: 300, size: 32, color: Palette.green });
    this.probe = new Polyline(stage, [Cq(-0.5, 0), Cq(0.5, 0)], { color: "#ffffff", width: 2.5 });
    this.probeLabel = fl.add({ text: "no tangent line at the origin", x: TEXT_X, y: 380, size: 32, color: Palette.text });
    const stepTex = [
      "\\begin{gathered}\\textbf{Fact} \\text{ (stated, not proved here): a 1-dim embedded submanifold}\\\\ \\text{has, near each point, a smooth } \\gamma \\text{ with } \\gamma'\\neq 0\\end{gathered}",
      "\\text{suppose } \\gamma(0)=(0,0),\\ \\gamma'(0)\\neq 0",
      "x\\geq 0\\ \\text{on the curve}\\ \\Rightarrow\\ x(t)\\ \\text{minimal at } 0\\ \\Rightarrow\\ x'(0)=0",
      "\\Rightarrow\\ y'(0)\\neq 0",
      "\\text{1-D inverse function thm: } t=t(y)\\ \\text{smooth}\\ \\Rightarrow\\ x=x(t(y))\\ \\text{smooth in } y",
      `\\text{but } x=|y|^{2/3}\\ \\text{is not differentiable at } 0\\ ${Tex.color(Palette.red, "(\\text{slope}\\to\\infty)")}`,
      `${Tex.color(Palette.red, "\\text{contradiction}")}\\ \\Rightarrow\\ \\text{not an embedded submanifold}`,
    ];
    this.steps = stepTex.map((tex, i) => fl.add({ tex, x: TEXT_X, y: i === 0 ? 220 : 270 + i * 70, size: i === 0 ? 28 : 30, boxed: i === 0, display: i === 0 }));

    // ---- F: γ(t) = (t², t³)
    this.gammaDot = new Dot(stage, Cq(0, 0, 0.03), Palette.yellow, 0.06);
    this.gammaArrow = new Arrow(stage, Cq(0, 0, 0.02), Cq(0.1, 0, 0.02), Palette.yellow, { width: 3.5, headLength: 0.14 });
    this.gammaReadout = fl.add({ tex: "", x: TEXT_X, y: 400, size: 34 });

    // ---- G: the squared sphere equation (3D trough)
    this.trough = new Surface(stage, (u, v, target) => {
      const r = 1.45 * u;
      const th = 2 * Math.PI * v;
      target.set(r * Math.cos(th), r * Math.sin(th), 0.6 * (r * r - 1) * (r * r - 1));
    }, Palette.blue, { opacity: 0.6, wireframe: true, isoU: 16, isoV: 32, segments: 80 });
    this.troughCircle = new Polyline(stage, sampleCurve((s) => v3(Math.cos(s), Math.sin(s), 0.01), 0, 2 * Math.PI, 128), { color: Palette.green, width: 6 });
    this.flatPlane = new TangentPlane(stage, Palette.yellow, 0.3);
    this.flatPlane.mesh.renderOrder = 5;                       // drawn after the translucent trough
    this.flatPlane.mesh.children.forEach((child) => { child.renderOrder = 5; });
    this.troughTexts = [
      fl.add({ tex: "h(x)=(x^\\top x-1)^2,\\qquad h^{-1}(0)=S^{n-1}\\ \\ (\\text{a manifold})", x: 960, y: 90, size: 38 }),
      fl.add({ tex: "Dh(x)[v]=2(x^\\top x-1)\\cdot 2x^\\top v", x: 960, y: 700, size: 38 }),
      fl.add({ tex: `x^\\top x=1\\ \\Rightarrow\\ Dh(x)=0:\\ ${Tex.color(Palette.red, "0 \\text{ is not a regular value}")}\\ \\text{— yet } h^{-1}(0) \\text{ is a manifold}`, x: 960, y: 780, size: 34 }),
      fl.add({ tex: `\\text{same sphere:}\\ \\ x^\\top x=1\\ ${Tex.color(Palette.green, "\\text{regular}")},\\qquad (x^\\top x-1)^2=0\\ ${Tex.color(Palette.red, "\\text{not regular}")}`, x: 960, y: 170, size: 34 }),
    ];
    this.trough.setOpacity(0);

    // ---- H: one direction only, warnings, summary
    this.logic = fl.add({ tex: this.logicTex(false), x: 960, y: 200, size: 46, display: true });
    this.warnings = [
      fl.add({ tex: `x^2-y^2=1:\\ \\text{regular, but }${Tex.color(Palette.orange, "\\text{two separate branches}")}`, x: 1020, y: 430, size: 34, align: "left" }),
      fl.add({ tex: `x^\\top x=-1:\\ ${Tex.color(Palette.orange, "\\varnothing")}\\ \\ (\\text{vacuously regular})`, x: 1020, y: 500, size: 34, align: "left" }),
      fl.add({ tex: "\\text{no promise of connectedness or nonemptiness}", x: 1020, y: 570, size: 32, align: "left", color: Palette.muted }),
      fl.add({ tex: `\\text{every failure: a point where } ${Tex.color(Palette.red, "\\operatorname{rank}Dh<k")}`, x: 960, y: 680, size: 36 }),
    ];
    const M = (x: number, y: number): THREE.Vector3 => px(640 + x * 110, 500 - y * 110, 0.01);
    this.miniAxes = [ax(M(-1.6, 0), M(1.7, 0), 0.1), ax(M(0, -1.5), M(0, 1.6), 0.1)];
    this.miniBranches = branches(1, LIM, M).map((pts) => new Polyline(stage, pts, { color: Palette.green, width: 4 }));
    this.summary = fl.add({
      tex: `\\begin{array}{lll}\\text{cross } x^2=y^2 & ${Tex.color(Palette.red, "\\text{not a manifold}")} & \\\\ \\text{cusp } y^2=x^3 & ${Tex.color(Palette.orange, "\\text{topological, not smooth}")} & \\\\ (x^\\top x-1)^2=0 & ${Tex.color(Palette.green, "\\text{a manifold anyway}")} & \\end{array}`,
      x: 960, y: 520, size: 40, boxed: true, display: true,
    });
  }

  private logicTex(cross: boolean): string {
    const back = cross ? Tex.color(Palette.red, "\\not\\Longleftarrow") : "\\phantom{\\not\\Longleftarrow}";
    return `\\begin{gathered}\\text{regular value}\\ \\ ${Tex.color(Palette.green, "\\Longrightarrow")}\\ \\ \\text{manifold}\\\\ \\text{regular value}\\ \\ ${back}\\ \\ \\text{manifold}\\end{gathered}`;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;
    const inA = t < c.s(3);
    const inG = t >= c.s(32) - 0.1 && t < c.s(40);
    if (inA) {
      const az = -1.0 + 0.15 * clamp01((t - c.s(1)) / 12);
      stage.setView3D(v3(10.2 * Math.cos(az), 10.2 * Math.sin(az), 5.4), v3(0, 0, -0.3), 34);
    } else if (inG) {
      const az = -0.9 + 0.2 * clamp01((t - c.s(33)) / 30);
      stage.setView3D(v3(6.6 * Math.cos(az), 6.6 * Math.sin(az), 3.6), v3(0, 0, -0.2), 34);
    } else {
      stage.setView2D(9.6, -5.4, 10.8);
    }

    // c schedule: 1 → −1 during s2; −1 → −0.45 at s4; → 0 at s5
    const cVal = keyframes(t, [
      { t: 0, v: { c: 1 } },
      { t: c.in(2, 0.1), v: { c: -1 } },
      { t: c.s(4), v: { c: -0.45 } },
      { t: c.s(5), v: { c: 0 } },
    ], 3.0).c;
    const cRounded = Math.abs(cVal) < 0.004 ? 0 : cVal;

    this.intro.set({ opacity: c.p(0, 0.6) * (1 - c.p(1, 0.6)) });

    // ---- A
    const aOn = inA ? c.p(1, 0.8) : 0;
    this.saddle.setOpacity(aOn);
    this.slice.mesh.position.z = cRounded;
    this.slice.setOpacity(aOn);
    const cut = branches(cRounded, 1.4, (x, y) => v3(x, y, cRounded + 0.01));
    this.cut3d.forEach((l, i) => { l.setPoints(cut[i]); l.setOpacity(aOn); });
    this.saddleLabel.set({ opacity: c.p(1, 0.6) * (1 - c.p(3, 0.6)) });

    // ---- B
    const bOn = (inA || inG ? 0 : 1) * c.p(3, 0.6) * (1 - c.p(7, 0.6));
    const B = (x: number, y: number): THREE.Vector3 => px(PLOT_B.x + x * PLOT_B.s, PLOT_B.y - y * PLOT_B.s, 0.01);
    this.axesB.forEach((a) => a.setOpacity(bOn));
    const br = branches(cRounded, LIM, B);
    this.branchesB.forEach((l, i) => {
      l.setPoints(br[i]);
      l.setOpacity(bOn);
      l.setColor(cRounded === 0 ? Palette.red : Palette.green);
    });
    this.originB.setOpacity(bOn * (cRounded === 0 ? 1 : 0));
    this.readoutC.setContent(cRounded === 0
      ? `c=0:\\ ${Tex.color(Palette.red, "\\text{crossing lines}")}`
      : `c=${cRounded.toFixed(2)}:\\ ${Tex.color(Palette.green, "\\text{regular}\\ \\checkmark")}`);
    this.readoutC.set({ opacity: bOn });
    this.derivNote.setContent(t >= c.s(6) ? `Dh(0,0)=(0,0):\\ ${Tex.color(Palette.red, "\\operatorname{rank}\\ 1\\to 0")}` : "Dh=(2x,\\,-2y)=0\\iff (x,y)=(0,0)");
    this.derivNote.set({ opacity: bOn * c.p(3, 0.6, 1.0) });

    // ---- C: zoom
    const cOn = (inA || inG ? 0 : 1) * c.p(7, 0.6) * (1 - c.p(9, 0.6));
    const zoom = Math.pow(100, smoothstep(c.in(7, 0.2), c.in(8, 0.6), t));
    this.frames.forEach((f) => f.setOpacity(cOn));
    const R = 0.9 * zoom;                     // circle radius in panel half-widths
    this.zoomArc.setPoints(sampleCurve((s) => px(ZOOM_L.x + s * PANEL, ZOOM_L.y + (R - Math.sqrt(R * R - s * s)) * PANEL, 0.01), -Math.min(1, R * 0.999), Math.min(1, R * 0.999), 120));
    this.zoomArc.setOpacity(cOn);
    this.zoomDot.setOpacity(cOn);
    this.zoomCross.forEach((l) => l.setOpacity(cOn));
    this.zoomCrossDot.setOpacity(cOn);
    this.zoomTitles.forEach((h) => h.set({ opacity: cOn }));
    this.zoomReadout.setContent(`\\text{zoom}\\ \\times${zoom < 9.95 ? zoom.toFixed(1) : Math.round(zoom).toString()}`);
    this.zoomReadout.set({ opacity: cOn });

    // ---- D: component counting
    const dOn = (inA || inG ? 0 : 1) * c.p(9, 0.6) * (1 - c.p(15, 0.6));
    const removed = t >= c.s(12);
    const removedT = t >= c.s(13);
    this.nDisk.setOpacity(dOn * c.p(10, 0.6));
    this.arms.forEach((a, i) => { a.setOpacity(dOn); a.setColor(removed ? ARM_COLORS[i] : Palette.blue); });
    this.nOrigin.setOpacity(dOn * (removed ? 0 : 1));
    this.nHole.setOpacity(dOn * (removed ? 1 : 0));
    this.interval.forEach((l, i) => { l.setOpacity(dOn * c.p(10, 0.6)); l.setColor(removedT ? (i === 0 ? Palette.orange : Palette.green) : Palette.blue); });
    this.tDot.setOpacity(dOn * c.p(10, 0.6) * (removedT ? 0 : 1));
    this.tHole.setOpacity(dOn * (removedT ? 1 : 0));
    this.proofLabels[0].set({ opacity: dOn * c.p(10, 0.6) });
    this.proofLabels[1].set({ opacity: dOn * c.p(10, 0.6, 0.8) });
    this.proofLabels[2].set({ opacity: dOn * c.p(10, 0.6, 1.2) * (1 - c.p(14, 0.6)) });
    this.proofLabels[3].set({ opacity: dOn * c.p(12, 0.6, 0.8) });
    this.proofLabels[4].set({ opacity: dOn * c.p(13, 0.6, 0.5) });
    this.proofLabels[5].set({ opacity: dOn * c.p(14, 0.6) });

    // ---- E: the cusp (s15–s28) and F: γ (s29–s31)
    const eOn = (inA || inG ? 0 : 1) * c.p(15, 0.6) * (1 - c.p(32, 0.6));
    this.cuspAxes.forEach((a) => a.setOpacity(eOn));
    this.cuspCurve.setOpacity(eOn);
    this.cuspCurve.setProgress(clamp01(c.over(15, 0.0, 0.8) * 1.0001));
    this.cuspTop.set({ opacity: eOn * c.p(16, 0.6) });
    const proj = eOn * c.p(18, 0.6) * (1 - c.p(20, 0.6));
    this.projLines.forEach((l) => l.setOpacity(proj));
    this.yAxisGlow.setOpacity(eOn * c.p(19, 0.6) * (1 - c.p(20, 0.6)));
    this.cuspGraphLabel.set({ opacity: eOn * c.p(18, 0.6) * (1 - c.p(21, 0.6)) });
    const probeOn = eOn * c.p(20, 0.6) * (1 - c.p(21, 0.6));
    const ang = (t - c.s(20)) * 1.1;
    const pd = new THREE.Vector2(Math.cos(ang), Math.sin(ang)).multiplyScalar(0.55);
    this.probe.setPoints([px(CUSP.x - pd.x * CUSP.s, CUSP.y + pd.y * CUSP.s, 0.02), px(CUSP.x + pd.x * CUSP.s, CUSP.y - pd.y * CUSP.s, 0.02)]);
    this.probe.setOpacity(probeOn);
    this.probeLabel.set({ opacity: probeOn });
    const stepStart = [21, 23, 24, 25, 26, 27, 28];
    this.steps.forEach((h, i) => h.set({ opacity: eOn * c.p(stepStart[i], 0.6) * (1 - c.p(29, 0.6)) }));

    const fOn = eOn * c.p(29, 0.6);
    const tau = Math.max(0, t - c.s(29));
    const settle = smoothstep(c.in(30, 0.2), c.in(30, 0.6), t);
    const tg = (1 - settle) * 1.05 * Math.cos(0.9 * tau);
    const gp = new THREE.Vector2(tg * tg, tg * tg * tg);
    const vel = new THREE.Vector2(2 * tg, 3 * tg * tg);
    this.gammaDot.setPosition(px(CUSP.x + gp.x * CUSP.s, CUSP.y - gp.y * CUSP.s, 0.03));
    this.gammaDot.setOpacity(fOn);
    this.gammaArrow.set(px(CUSP.x + gp.x * CUSP.s, CUSP.y - gp.y * CUSP.s, 0.02),
      px(CUSP.x + (gp.x + 0.3 * vel.x) * CUSP.s, CUSP.y - (gp.y + 0.3 * vel.y) * CUSP.s, 0.02));
    this.gammaArrow.setOpacity(fOn * (vel.length() > 0.01 ? 1 : 0));
    const speed = vel.length();
    this.gammaReadout.setContent(speed > 0.005
      ? `\\begin{gathered}\\gamma(t)=(t^2,t^3),\\quad \\gamma'(t)=(2t,\\,3t^2)\\\\ |\\gamma'(t)|=${speed.toFixed(2)}\\end{gathered}`
      : `\\begin{gathered}\\gamma(t)=(t^2,t^3),\\quad \\gamma'(t)=(2t,\\,3t^2)\\\\ ${Tex.color(Palette.red, "\\gamma'(0)=0:\\ \\text{smooth, not regular}")}\\end{gathered}`);
    this.gammaReadout.set({ opacity: fOn });

    // ---- G: trough
    const gOn = inG ? c.p(32, 0.6) : 0;
    this.trough.setOpacity(gOn * c.p(34, 0.6));
    this.troughCircle.setOpacity(gOn * c.p(33, 0.6));
    const flat = gOn * c.p(36, 0.6);
    this.flatPlane.place(v3(0.78, 0.62, 0.012), v3(0, 0, 1));
    this.flatPlane.setOpacity(flat);
    this.troughTexts[0].set({ opacity: gOn * c.p(32, 0.6, 0.6) * (1 - c.p(38, 0.5)) });
    this.troughTexts[1].set({ opacity: gOn * c.p(35, 0.6) });
    this.troughTexts[2].set({ opacity: gOn * c.p(37, 0.6) });
    this.troughTexts[3].set({ opacity: gOn * c.p(38, 0.6) });

    // ---- H
    const hOn = (inA || inG ? 0 : 1) * c.p(40, 0.6) * (1 - c.p(45, 0.6));
    this.logic.setContent(this.logicTex(t >= c.in(40, 0.45)));
    this.logic.set({ opacity: hOn });
    const mini = hOn * c.p(41, 0.6) * (1 - c.p(44, 0.6));
    this.miniAxes.forEach((a) => a.setOpacity(mini));
    this.miniBranches.forEach((l) => l.setOpacity(mini));
    this.warnings[0].set({ opacity: mini });
    this.warnings[1].set({ opacity: hOn * c.p(42, 0.6) * (1 - c.p(44, 0.6)) });
    this.warnings[2].set({ opacity: hOn * c.p(43, 0.6) * (1 - c.p(44, 0.6)) });
    this.warnings[3].set({ opacity: hOn * c.p(44, 0.6) });
    this.summary.set({ opacity: c.p(45, 0.6, 0.6) });
  }

  teardown(_layers: SceneLayers): void {}
}
