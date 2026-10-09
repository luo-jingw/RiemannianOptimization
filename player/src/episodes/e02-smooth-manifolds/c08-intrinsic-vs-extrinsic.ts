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
import { Region } from "../../primitives/Region";
import { Surface, sphereFn } from "../../primitives/Surface";
import { flash } from "./lib/Flash";
import { LabelPlacer } from "./lib/LabelPlacer";
import { PixelFrame } from "./lib/PixelFrame";
import { Tex } from "./lib/Tex";

/**
 * E02 c08 — intrinsic versus extrinsic description.
 * A (s0–s4): two views of a sphere. B (s5–s9): the half-circle chart as solving x²+y²=1 for y.
 * C (s10–s13): S² and its six open hemispheres. D (s14–s26): counting equations for O(n); the open
 * questions for O(3). E (s27–s31): ZXZ Euler angles at β = 0 (supplementary). F (s32–s36): the chart machine.
 * 3D phases and 2D phases alternate; the camera mode is chosen from the sentence times and every object
 * of a phase is faded out before the next phase starts.
 * Sentence indices refer to content/episodes/e02-smooth-manifolds/story.en.json, scene c08-intrinsic-vs-extrinsic.
 */

const W = PixelFrame.world;
const CB = PixelFrame.frame(400, 490, 220);          // circle frame (phase B)
const CELL = 100;
const RG = { x: 250, y: 440 };                       // R grid center (pixels)
const QG = { x: 700, y: 440 };                       // RᵀR grid center (pixels)
const OFF_L = new THREE.Vector3(-2, 0, 0);
const OFF_R = new THREE.Vector3(2, 0, 0);
const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const HEMI_COLORS = [Palette.green, Palette.teal, Palette.orange, Palette.yellow, Palette.purple, Palette.pink];
const HEMI_NAMES = ["+z", "-z", "+x", "-x", "+y", "-y"];
const HEMI_DIRS = [v3(0, 0, 1), v3(0, 0, -1), v3(1, 0, 0), v3(-1, 0, 0), v3(0, 1, 0), v3(0, -1, 0)];
const DISC_Z = -1.6;
const FLICKER = [2, 3, 8, 0, 5, 7];

type Fn3 = (u: number, v: number, target: THREE.Vector3) => void;

/** Open hemisphere where sign · x[axis] > 0, parametrized by the polar angle about that axis. */
function hemisphere(axis: 0 | 1 | 2, sign: 1 | -1): Fn3 {
  return (u, v, target) => {
    const th = u * 2 * Math.PI;
    const ph = v * 0.5 * Math.PI;
    const a = Math.sin(ph) * Math.cos(th);
    const b = Math.sin(ph) * Math.sin(th);
    const h = sign * Math.cos(ph);
    const p = axis === 2 ? v3(a, b, h) : axis === 0 ? v3(h, a, b) : v3(b, h, a);
    target.copy(p.multiplyScalar(1.012));
  };
}

function offsetSphere(off: THREE.Vector3): Fn3 {
  const base = sphereFn(1);
  return (u, v, target) => {
    base(u, v, target);
    target.add(off);
  };
}

function gridLines(stage: StageLayer, g: { x: number; y: number }, color: string): Polyline[] {
  const h = 1.5 * CELL;
  const pts = (a: [number, number][]): THREE.Vector3[] => a.map(([dx, dy]) => W(g.x + dx, g.y + dy));
  return [
    new Polyline(stage, pts([[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]]), { color, width: 3 }),
    new Polyline(stage, pts([[-h / 3, -h], [-h / 3, h]]), { color, width: 2 }),
    new Polyline(stage, pts([[h / 3, -h], [h / 3, h]]), { color, width: 2 }),
    new Polyline(stage, pts([[-h, -h / 3], [h, -h / 3]]), { color, width: 2 }),
    new Polyline(stage, pts([[-h, h / 3], [h, h / 3]]), { color, width: 2 }),
  ];
}

function cellRegion(stage: StageLayer, g: { x: number; y: number }, i: number, j: number): Region {
  const cx = g.x + (j - 1) * CELL;
  const cy = g.y + (i - 1) * CELL;
  const m = 46;
  return new Region(stage, [W(cx - m, cy - m), W(cx + m, cy - m), W(cx + m, cy + m), W(cx - m, cy + m)], Palette.orange, 0.3);
}

interface CellStyle {
  color: string;
  opacity: number;
}

export class IntrinsicExtrinsicScene implements Scene {
  readonly id = "c08-intrinsic-vs-extrinsic";
  private stage!: StageLayer;
  private placer!: LabelPlacer;

  // Phase A
  private sphereL!: Surface;
  private sphereR!: Surface;
  private axes3: Arrow[] = [];
  private axisLabels: FormulaHandle[] = [];
  private titleL!: FormulaHandle;
  private titleR!: FormulaHandle;
  private cards: FormulaHandle[] = [];
  private subL!: FormulaHandle;
  private subR!: FormulaHandle;

  // Phase B
  private circle!: Polyline;
  private upperArc!: Polyline;
  private rightArc!: Polyline;
  private bDot!: Dot;
  private tangent!: Polyline;
  private verticals: Polyline[] = [];
  private bTop!: FormulaHandle;
  private bLines: FormulaHandle[] = [];
  private pointLabels: FormulaHandle[] = [];

  // Phase C
  private sphereC!: Surface;
  private hemis: Surface[] = [];
  private hemiLabels: FormulaHandle[] = [];
  private discRing!: Polyline;
  private drops: Polyline[] = [];
  private dropDots: Dot[] = [];
  private cLines: FormulaHandle[] = [];
  private cKey!: FormulaHandle;

  // Phase D
  private rLines: Polyline[] = [];
  private qLines: Polyline[] = [];
  private rRegions: Region[] = [];
  private qRegions: Region[] = [];
  private rLabels: FormulaHandle[] = [];
  private qLabels: FormulaHandle[] = [];
  private rTitle!: FormulaHandle;
  private qTitle!: FormulaHandle;
  private n3Note!: FormulaHandle;
  private connectors: Polyline[] = [];
  private triNote!: FormulaHandle;
  private dTop!: FormulaHandle;
  private countLines: FormulaHandle[] = [];
  private expectNote!: FormulaHandle;
  private compact!: FormulaHandle;
  private questions: FormulaHandle[] = [];
  private qMark!: FormulaHandle;
  private noHand!: FormulaHandle;
  private ledger!: ProofLedger;

  // Phase E
  private worldRing!: Polyline;
  private worldX!: Polyline;
  private worldY!: Polyline;
  private bodyAxes: Arrow[] = [];
  private axis1!: Arrow;
  private eLabel1!: FormulaHandle;
  private eLabel3!: FormulaHandle;
  private eTop!: FormulaHandle;
  private eLines: FormulaHandle[] = [];

  // Phase F
  private boxes: { region: Region; line: Polyline }[] = [];
  private fArrows: Arrow[] = [];
  private fTexts: FormulaHandle[] = [];
  private fHint!: FormulaHandle;
  private fTitle!: FormulaHandle;
  private progress: { region: Region; line: Polyline; label: FormulaHandle; color: string }[] = [];

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    this.placer = new LabelPlacer(stage);
    addStandardLights(stage);
    stage.setView2D(0, 0, 9);

    // ---- Phase A
    this.sphereL = new Surface(stage, offsetSphere(OFF_L), Palette.blue, { wireframe: true, opacity: 0.45, isoU: 24, isoV: 12 });
    this.sphereR = new Surface(stage, offsetSphere(OFF_R), Palette.blue, { wireframe: true, opacity: 0.45, isoU: 24, isoV: 12 });
    const axDirs = [v3(1.55, 0, 0), v3(0, 1.45, 0), v3(0, 0, 1.2)];
    this.axes3 = axDirs.map((d) => new Arrow(stage, OFF_R.clone(), OFF_R.clone().add(d), Palette.axis, { mode: "3d", width: 3, headLength: 0.14, depthTest: false }));
    this.axisLabels = ["x_1", "x_2", "x_3"].map((s) => fl.add({ tex: s, x: 0, y: 0, size: 28, color: Palette.muted }));
    this.titleL = fl.add({ text: "intrinsic view", x: 512, y: 100, size: 40, color: Palette.blue });
    this.titleR = fl.add({ text: "extrinsic view", x: 1408, y: 100, size: 40, color: Palette.orange });
    this.cards = ["\\varphi_+", "\\varphi_r", "\\varphi_r\\circ\\varphi_+^{-1}"].map((tex, i) =>
      fl.add({ tex, x: [350, 490, 700][i], y: 790, size: 36, boxed: true, color: Palette.teal }));
    this.subL = fl.add({ tex: "M=\\big(\\text{topological space},\\ \\text{maximal smooth atlas}\\big)", x: 512, y: 175, size: 30, maxWidth: 760 });
    this.subR = fl.add({ tex: "\\|x\\|^2=1", x: 1408, y: 175, size: 32 });

    // ---- Phase B
    const circlePts = (a0: number, a1: number): THREE.Vector3[] => sampleCurve((s) => CB(Math.cos(s), Math.sin(s)), a0, a1, 96);
    this.circle = new Polyline(stage, circlePts(0, 2 * Math.PI), { color: Palette.blue, width: 3 });
    this.upperArc = new Polyline(stage, circlePts(0.12, Math.PI - 0.12), { color: Palette.orange, width: 7 });
    this.rightArc = new Polyline(stage, circlePts(-1.2, 1.2), { color: Palette.green, width: 7 });
    this.bDot = new Dot(stage, CB(1, 0), Palette.orange, 0.08);
    this.tangent = new Polyline(stage, [CB(0, 0), CB(1, 0)], { color: Palette.yellow, width: 3 });
    this.verticals = [1, -1].map((sx) => new Polyline(stage, [CB(sx, -1.1), CB(sx, 1.1)], { color: Palette.red, width: 3, dashed: true, dashSize: 0.1, gapSize: 0.07 }));
    this.pointLabels = ["(1,0)", "(-1,0)"].map((s) => fl.add({ tex: s, x: 0, y: 0, size: 28, color: Palette.red }));
    this.bTop = fl.add({ text: "the half-circle chart is solving an equation", x: 750, y: 100, size: 38 });
    const bTex = [
      "x^2+y^2=1",
      `${Tex.c(Palette.orange, "y=\\sqrt{1-x^2}")}\\quad\\text{on the upper arc}`,
      "\\dfrac{\\partial}{\\partial y}\\,(x^2+y^2-1)=2y\\neq 0",
      `${Tex.c(Palette.red, "2y\\to 0")}\\quad\\text{at } (1,0):\\ \\text{vertical tangent}`,
      `${Tex.c(Palette.red, "\\text{cannot solve for } y \\text{ here}")}`,
      `${Tex.c(Palette.green, "x=\\sqrt{1-y^2}")}\\quad\\text{on the right arc}`,
    ];
    const bY = [230, 330, 430, 530, 620, 710];
    this.bLines = bTex.map((tex, i) => fl.add({ tex, x: 1030, y: bY[i], size: 34, maxWidth: 640 }));

    // ---- Phase C
    this.sphereC = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.3, isoU: 24, isoV: 12 });
    const axes: (0 | 1 | 2)[] = [2, 2, 0, 0, 1, 1];
    const signs: (1 | -1)[] = [1, -1, 1, -1, 1, -1];
    for (let i = 0; i < 6; i++) this.hemis.push(new Surface(stage, hemisphere(axes[i], signs[i]), HEMI_COLORS[i], { segments: 32, opacity: 0.7 }));
    this.hemiLabels = HEMI_NAMES.map((s, i) => fl.add({ tex: s, x: 0, y: 0, size: 32, color: HEMI_COLORS[i] }));
    this.discRing = new Polyline(stage, sampleCurve((s) => v3(Math.cos(s), Math.sin(s), DISC_Z), 0, 2 * Math.PI, 96), { color: Palette.green, width: 4 });
    const sample: [number, number][] = [[0.3, 0.55], [1.5, 0.9], [2.7, 0.5], [3.9, 1.0], [5.0, 0.7], [0.9, 0.25]];
    for (const [th, ph] of sample) {
      const p = v3(Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)).multiplyScalar(1.012);
      const q = v3(p.x, p.y, DISC_Z);
      this.drops.push(new Polyline(stage, [p, q], { color: Palette.green, width: 1.5, dashed: true, dashSize: 0.06, gapSize: 0.05 }));
      this.dropDots.push(new Dot(stage, q, Palette.green, 0.04, "3d"));
    }
    const cTex = [
      "S^2=\\{x\\in\\mathbb{R}^3:\\ \\|x\\|^2=1\\}",
      "\\begin{gathered}\\text{six open hemispheres}\\\\ \\pm x_1>0,\\ \\pm x_2>0,\\ \\pm x_3>0\\end{gathered}",
      `x_3=\\sqrt{1-x_1^2-x_2^2}\\quad\\text{on } ${Tex.c(Palette.green, "x_3>0")}`,
      `\\varphi(x_1,x_2,x_3)=(x_1,x_2)`,
    ];
    const cY = [230, 330, 430, 520];
    this.cLines = cTex.map((tex, i) => fl.add({ tex, x: 1100, y: cY[i], size: 32, maxWidth: 540, display: i === 1 }));
    this.cKey = fl.add({ tex: "\\text{the six hemispheres cover all of } S^2", x: 1100, y: 640, size: 32, color: Palette.yellow, maxWidth: 520 });

    // ---- Phase D
    this.rLines = gridLines(stage, RG, Palette.axis);
    this.qLines = gridLines(stage, QG, Palette.axis);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.rRegions.push(cellRegion(stage, RG, i, j));
        this.qRegions.push(cellRegion(stage, QG, i, j));
        this.rLabels.push(fl.add({ tex: `r_{${i + 1}${j + 1}}`, x: RG.x + (j - 1) * CELL, y: RG.y + (i - 1) * CELL, size: 30 }));
        this.qLabels.push(fl.add({ tex: `r_${i + 1}^\\top r_${j + 1}`, x: QG.x + (j - 1) * CELL, y: QG.y + (i - 1) * CELL, size: 28 }));
      }
    }
    this.rTitle = fl.add({ tex: "R", x: RG.x, y: 245, size: 38 });
    this.qTitle = fl.add({ tex: "R^\\top R=I", x: QG.x, y: 245, size: 38 });
    this.n3Note = fl.add({ text: "n = 3 shown", x: RG.x, y: 640, size: 26, color: Palette.muted });
    const conn: [number, number, number, number][] = [[1, 0, 0, 1], [2, 0, 0, 2], [2, 1, 1, 2]];
    this.connectors = conn.map(([i0, j0, i1, j1]) => new Polyline(stage,
      [W(QG.x + (j0 - 1) * CELL, QG.y + (i0 - 1) * CELL), W(QG.x + (j1 - 1) * CELL, QG.y + (i1 - 1) * CELL)],
      { color: Palette.muted, width: 2, dashed: true, dashSize: 0.08, gapSize: 0.06 }));
    this.triNote = fl.add({ tex: `${Tex.c(Palette.orange, "n")}+${Tex.c(Palette.green, "\\dfrac{n(n-1)}{2}")}`, x: QG.x, y: 640, size: 34 });
    this.dTop = fl.add({ tex: "O(n)", x: 750, y: 100, size: 44 });
    const cntTex = [
      "n^2\\ \\text{variables}",
      "\\dfrac{n(n+1)}{2}\\ \\text{independent equations}",
      "n^2-\\dfrac{n(n+1)}{2}=\\dfrac{n(n-1)}{2}",
      "n=2:\\ \\ 4-3=1",
      "n=3:\\ \\ 9-6=3",
    ];
    const cntY = [300, 385, 480, 565, 635];
    this.countLines = cntTex.map((tex, i) => fl.add({ tex, x: 1130, y: cntY[i], size: 30, maxWidth: 460 }));
    this.expectNote = fl.add({ tex: "\\text{an expectation, not a theorem: when does the count give the dimension?}", x: 750, y: 770, size: 30, color: Palette.yellow, maxWidth: 1200 });
    this.compact = fl.add({ tex: "9\\ \\text{variables}-6\\ \\text{equations}=3", x: 750, y: 770, size: 32 });
    const qTex = [
      "\\text{charts for } O(3) \\text{ by hand?}",
      "\\text{which 6 of the 9 entries do we solve for?}",
      "\\text{what are the explicit formulas?}",
      "\\text{how do we cover } O(3) \\text{ with smooth transitions?}",
    ];
    this.questions = qTex.map((tex, i) => fl.add({ tex, x: 580, y: [270, 370, 450, 530][i], size: 32, align: "left", maxWidth: 780, color: i === 0 ? Palette.yellow : Palette.text }));
    this.qMark = fl.add({ tex: "?", x: 0, y: 0, size: 44, color: Palette.red });
    this.noHand = fl.add({ tex: "\\text{by hand, this does not work}", x: 750, y: 650, size: 36, color: Palette.red });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "n^2\\ \\text{variables}", at: cue.s(16) + 0.6 },
      { label: "2", tex: "\\dfrac{n(n+1)}{2}\\ \\text{independent equations}", at: cue.in(20, 0.7) },
      { label: "3", tex: "\\text{expected dimension } \\dfrac{n(n-1)}{2}", at: cue.in(21, 0.8) },
      { label: "4", tex: "\\text{only an expectation; a theorem decides}", at: cue.in(23, 0.5) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }, "Counting O(n)");

    // ---- Phase E
    this.worldRing = new Polyline(stage, sampleCurve((s) => v3(1.2 * Math.cos(s), 1.2 * Math.sin(s), 0), 0, 2 * Math.PI, 96), { color: Palette.grid, width: 2 });
    this.worldX = new Polyline(stage, [v3(-1.35, 0, 0), v3(1.35, 0, 0)], { color: Palette.grid, width: 2 });
    this.worldY = new Polyline(stage, [v3(0, -1.35, 0), v3(0, 1.35, 0)], { color: Palette.grid, width: 2 });
    this.bodyAxes = [Palette.pink, Palette.green, Palette.purple].map((col) =>
      new Arrow(stage, v3(0, 0, 0), v3(1, 0, 0), col, { mode: "3d", width: 5, headLength: 0.18, depthTest: false }));
    this.axis1 = new Arrow(stage, v3(0, 0, 0), v3(0, 0, 1.5), Palette.orange, { mode: "3d", width: 9, headLength: 0.2, depthTest: false });
    this.eLabel1 = fl.add({ text: "axis 1", x: 0, y: 0, size: 30, color: Palette.orange });
    this.eLabel3 = fl.add({ text: "axis 3", x: 0, y: 0, size: 30, color: Palette.purple });
    this.eTop = fl.add({ text: "Euler angles (supplementary illustration)", x: 750, y: 100, size: 38, color: Palette.muted });
    const eTex = [
      "R=R_z(\\alpha)\\,R_x(\\beta)\\,R_z(\\gamma)",
      `${Tex.c(Palette.red, "\\beta=0")}:\\ \\ R=R_z(\\alpha+\\gamma)`,
      `${Tex.c(Palette.yellow, "\\text{two angles control one motion}")}`,
      "\\begin{gathered}\\text{near } \\beta=0:\\\\ \\text{not a local homeomorphism}\\end{gathered}",
    ];
    const eY = [250, 350, 450, 560];
    this.eLines = eTex.map((tex, i) => fl.add({ tex, x: 1100, y: eY[i], size: 32, maxWidth: 520, display: i === 3 }));

    // ---- Phase F
    const rects: [number, number][] = [[80, 440], [560, 960], [1080, 1340]];
    const colors = [Palette.orange, Palette.yellow, Palette.green];
    for (let i = 0; i < 3; i++) {
      const [x0, x1] = rects[i];
      const pts = [W(x0, 300), W(x1, 300), W(x1, 520), W(x0, 520), W(x0, 300)];
      this.boxes.push({ region: new Region(stage, pts, colors[i], 0.12), line: new Polyline(stage, pts, { color: colors[i], width: 4 }) });
    }
    this.fArrows = [[445, 555], [965, 1075]].map(([a, b]) => new Arrow(stage, W(a, 410), W(b, 410), Palette.text, { width: 4, headLength: 0.2 }));
    const fText: [string, number, number, number][] = [
      ["h(x)=c", 260, 360, 36],
      ["\\text{condition on } \\operatorname{rank} Dh(x)", 260, 440, 24],
      ["E03\\ \\text{inverse function theorem}", 760, 360, 28],
      ["\\downarrow", 760, 410, 30],
      ["E04\\ \\text{regular level sets}", 760, 460, 28],
      ["\\text{charts}", 1210, 360, 34],
      ["\\text{smooth transition maps}", 1210, 440, 21],
    ];
    this.fTexts = fText.map(([tex, x, y, size]) => fl.add({ tex, x, y, size, maxWidth: x === 260 ? 340 : x === 1210 ? 240 : 380 }));
    this.fTitle = fl.add({ text: "a machine that turns equations into charts", x: 750, y: 130, size: 40 });
    this.fHint = fl.add({ tex: `\\partial_y(x^2+y^2-1)=2y\\neq 0\\ \\Rightarrow\\ \\text{solve for } y`, x: 750, y: 640, size: 34, color: Palette.yellow, maxWidth: 1200 });
    const labels = ["E01", "E02", "E03", "E04"];
    const pColors = [Palette.green, Palette.green, Palette.yellow, Palette.muted];
    for (let i = 0; i < 4; i++) {
      const cx = 420 + i * 230;
      const pts = [W(cx - 90, 740), W(cx + 90, 740), W(cx + 90, 800), W(cx - 90, 800), W(cx - 90, 740)];
      this.progress.push({
        region: new Region(stage, pts, pColors[i], 0.2),
        line: new Polyline(stage, pts, { color: pColors[i], width: 3 }),
        label: fl.add({ text: labels[i], x: cx, y: 770, size: 30 }),
        color: pColors[i],
      });
    }
  }

  private bodyRotation(alpha: number, beta: number, gamma: number): THREE.Matrix4 {
    const m = new THREE.Matrix4().makeRotationZ(alpha);
    m.multiply(new THREE.Matrix4().makeRotationX(beta));
    m.multiply(new THREE.Matrix4().makeRotationZ(gamma));
    return m;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;
    const out = (j: number): number => 1 - c.p(j, 0.5, -0.5);

    // ---------- Camera
    if (t < c.s(5)) stage.setView3D(v3(0, -9, 2.4), v3(0, 0, -0.1), 30);
    else if (t < c.s(10)) stage.setView2D(0, 0, 9);
    else if (t < c.s(14)) {
      const az = -0.72 + 0.07 * Math.sin(0.05 * t);
      const pos = v3(7.4 * Math.cos(az), 7.4 * Math.sin(az), 3.0);
      const target = v3(0, 0, -0.9);
      const right = target.clone().sub(pos).cross(v3(0, 0, 1)).normalize().multiplyScalar(1.5);
      stage.setView3D(pos.add(right), target.add(right), 34);
    } else if (t < c.s(27)) stage.setView2D(0, 0, 9);
    else if (t < c.s(32)) {
      const pos = v3(6.2 * Math.cos(-1.05), 6.2 * Math.sin(-1.05), 2.9);
      const target = v3(0, 0, 0.5);
      const right = target.clone().sub(pos).cross(v3(0, 0, 1)).normalize().multiplyScalar(1.5);
      stage.setView3D(pos.add(right), target.add(right), 34);
    } else stage.setView2D(0, 0, 9);

    // ---------- Phase A: two views (s0–s4)
    const aOut = out(5);
    this.sphereL.setOpacity(c.p(0, 0.8) * aOut);
    this.sphereR.setOpacity(c.p(0, 0.8, 0.3) * aOut);
    this.titleL.set({ opacity: c.p(0, 0.6, 0.4) * aOut });
    this.titleR.set({ opacity: c.p(0, 0.6, 0.7) * aOut });
    this.cards.forEach((h, i) => h.set({ opacity: c.p(1, 0.5, 0.6 + 1.0 * i) * aOut }));
    this.subL.set({ opacity: c.p(2, 0.6) * aOut });
    const axGrow = c.over(3, 0.1, 0.6);
    const axOpacity = c.p(3, 0.3, 0.2) * aOut;
    this.axes3.forEach((a, i) => {
      const dir = [v3(1.55, 0, 0), v3(0, 1.45, 0), v3(0, 0, 1.2)][i];
      a.set(OFF_R.clone(), OFF_R.clone().add(dir.clone().multiplyScalar(Math.max(axGrow, 0.001))));
      a.setOpacity(axOpacity);
      this.placer.place(this.axisLabels[i], OFF_R.clone().add(dir.clone().multiplyScalar(1.12)), 0, 0, axOpacity * c.p(3, 0.4, 1.2));
    });
    const showDef = t >= c.s(4);
    this.subR.setContent(showDef ? "M=\\{x\\in\\mathbb{R}^n:\\ h(x)=c\\}" : "\\|x\\|^2=1");
    this.subR.set({ opacity: c.p(3, 0.6, 0.5) * aOut });

    // ---------- Phase B: half-circle chart (s5–s9)
    const bOn = c.p(5, 0.6) * out(10);
    this.circle.setOpacity(bOn);
    this.bTop.set({ opacity: bOn });
    const upperOn = c.p(6, 0.6) * (1 - c.p(9, 0.6));
    this.upperArc.setOpacity(bOn * upperOn);
    const rightOn = c.p(9, 0.6, 1.0);
    this.rightArc.setOpacity(bOn * rightOn);
    const theta = lerp(1.15, 0.07, c.over(8, 0.05, 0.95));
    const thetaNow = t < c.s(8) ? 1.15 : theta;
    const px = Math.cos(thetaNow);
    const py = Math.sin(thetaNow);
    this.bDot.setPosition(CB(px, py));
    this.bDot.setOpacity(bOn * c.p(6, 0.4, 0.3));
    this.bDot.setColor(t >= c.in(9, 0.5) ? Palette.green : Palette.orange);
    this.tangent.setPoints([CB(px + 0.7 * Math.sin(thetaNow), py - 0.7 * Math.cos(thetaNow)), CB(px - 0.7 * Math.sin(thetaNow), py + 0.7 * Math.cos(thetaNow))]);
    this.tangent.setOpacity(bOn * c.p(7, 0.6) * (1 - c.p(9, 0.6)));
    this.verticals.forEach((v) => v.setOpacity(bOn * c.p(8, 0.6, 2.0)));
    this.placer.place(this.pointLabels[0], CB(1.0, -0.12), 72, 26, bOn * c.p(8, 0.6, 2.0));
    this.placer.place(this.pointLabels[1], CB(-1.0, -0.12), -78, 26, bOn * c.p(8, 0.6, 2.0));
    const bShown = [c.p(5, 0.6, 0.3), c.p(6, 0.6, 1.5), c.p(7, 0.6, 0.5), c.p(8, 0.6, 0.5), c.p(9, 0.6), c.p(9, 0.6, 2.0)];
    this.bLines.forEach((h, i) => h.set({ opacity: bShown[i] * out(10) }));
    this.bLines[0].set({ opacity: c.p(5, 0.6, 0.2) * out(10) });

    // ---------- Phase C: sphere and six hemispheres (s10–s13)
    const cOn = c.p(10, 0.7, 0.1) * out(14);
    this.sphereC.setOpacity(cOn);
    const hemiK = c.over(11, 0.1, 0.9);
    const zOnly = c.p(12, 0.6);
    const allBack = c.p(13, 0.6);
    this.hemis.forEach((_h, i) => {
      const appear = smooth01(hemiK * 6 - i);
      let level = appear * (0.7 - 0.35 * allBack);
      if (i > 0) level = level * (1 - 0.8 * zOnly * (1 - allBack));
      this.hemis[i].setOpacity(Math.min(1, level / 0.85 * 1) * cOn * (t >= c.s(11) ? 1 : 0));
    });
    this.hemiLabels.forEach((h, i) => {
      const dir = HEMI_DIRS[i];
      this.placer.place(h, dir.clone().multiplyScalar(1.3), 0, 0, c.p(13, 0.6, 0.3) * cOn);
    });
    const discOn = c.p(12, 0.6, 0.4) * (1 - allBack) * cOn;
    this.discRing.setOpacity(discOn);
    this.drops.forEach((d, i) => {
      d.setOpacity(discOn * 0.9);
      this.dropDots[i].setOpacity(discOn);
    });
    const cShown = [c.p(10, 0.6, 0.3), c.p(11, 0.6, 0.3), c.p(12, 0.6, 0.3), c.p(12, 0.6, 2.0)];
    this.cLines.forEach((h, i) => h.set({ opacity: cShown[i] * out(14) }));
    this.cKey.set({ opacity: c.p(13, 0.6, 0.5) * out(14) });

    // ---------- Phase D: counting equations for O(n) (s14–s26)
    const dOut = out(27);
    const rOn = c.p(15, 0.6) * dOut;
    const qOn = c.p(16, 0.6, 0.8) * out(24) * dOut;
    this.dTop.setContent(t >= c.s(15) ? "O(n)=\\{R\\in\\mathbb{R}^{n\\times n}:\\ R^\\top R=I\\}" : "O(n)");
    this.dTop.set({ opacity: c.p(14, 0.6) * dOut });
    this.rLines.forEach((l) => l.setOpacity(rOn));
    this.qLines.forEach((l) => l.setOpacity(qOn));
    this.rLabels.forEach((h) => h.set({ opacity: rOn }));
    this.qLabels.forEach((h) => h.set({ opacity: qOn }));
    this.rTitle.set({ opacity: rOn });
    this.qTitle.set({ opacity: qOn });
    this.n3Note.set({ opacity: rOn });
    const rStyle = (i: number, j: number): CellStyle => {
      if (t >= c.s(16) && t < c.s(17)) return { color: Palette.orange, opacity: 0.2 + 0.1 * flash(t, c.s(16) + 0.4, 1.2, 0) };
      if (t >= c.s(17) && t < c.s(18)) {
        if (j === 0) return { color: Palette.teal, opacity: 0.35 };
        if (j === 1) return { color: Palette.purple, opacity: 0.35 };
      }
      if (t >= c.s(25) && t < c.s(26)) {
        const k = Math.min(5, Math.floor(c.over(25, 0, 0.98) * 6));
        const hit = FLICKER[k] === i * 3 + j;
        const past = FLICKER.slice(0, k).includes(i * 3 + j);
        if (hit) return { color: Palette.red, opacity: 0.45 };
        if (past) return { color: Palette.red, opacity: 0.12 };
      }
      return { color: Palette.orange, opacity: 0 };
    };
    const qStyle = (i: number, j: number): CellStyle => {
      const diag = i === j;
      const up = j > i;
      if (t >= c.s(17) && t < c.s(18)) return i === 0 && j === 1 ? { color: Palette.orange, opacity: 0.5 } : { color: Palette.orange, opacity: 0 };
      if (t >= c.s(18) && t < c.s(19)) {
        if ((i === 0 && j === 1) || (i === 1 && j === 0)) return { color: Palette.orange, opacity: 0.5 };
        return { color: Palette.orange, opacity: 0 };
      }
      if (t >= c.s(19)) {
        if (diag) return { color: Palette.orange, opacity: 0.4 };
        if (up) return { color: Palette.green, opacity: 0.35 };
        return { color: Palette.muted, opacity: 0.06 };
      }
      return { color: Palette.orange, opacity: 0 };
    };
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const rs = rStyle(i, j);
        this.rRegions[i * 3 + j].setColor(rs.color);
        this.rRegions[i * 3 + j].setOpacity(rs.opacity * rOn);
        const qs = qStyle(i, j);
        this.qRegions[i * 3 + j].setColor(qs.color);
        this.qRegions[i * 3 + j].setOpacity(qs.opacity * qOn);
      }
    }
    this.connectors.forEach((l, k) => l.setOpacity(qOn * c.p(18, 0.5, 0.5 + 1.3 * k) * (1 - c.p(20, 0.5))));
    this.triNote.set({ opacity: qOn * c.p(19, 0.6, 1.0) });
    const cntShown = [c.p(16, 0.6, 0.2), c.p(20, 0.6), c.p(21, 0.6), c.p(22, 0.6), c.p(22, 0.6, 2.5)];
    const cntOut = out(24);
    this.countLines.forEach((h, i) => h.set({ opacity: cntShown[i] * cntOut * dOut }));
    this.expectNote.set({ opacity: c.p(23, 0.6, 0.6) * cntOut * dOut });
    this.compact.set({ opacity: c.p(24, 0.6) * dOut });
    const qShown = [c.p(24, 0.6, 1.2), c.p(25, 0.6), c.p(25, 0.6, 2.0), c.p(26, 0.6)];
    this.questions.forEach((h, i) => h.set({ opacity: qShown[i] * dOut }));
    const k = Math.min(5, Math.floor(c.over(25, 0, 0.98) * 6));
    const flick = FLICKER[k];
    const mark = t >= c.s(25) && t < c.s(26) ? 1 : 0;
    this.qMark.set({ x: RG.x + ((flick % 3) - 1) * CELL, y: RG.y + (Math.floor(flick / 3) - 1) * CELL - 48, opacity: mark * rOn });
    this.noHand.set({ opacity: c.p(26, 0.6, 2.5) * dOut });
    this.ledger.update(t, c.p(16, 0.5) * out(24), t < c.s(24));

    // ---------- Phase E: Euler angles (s27–s31)
    const eOut = out(32);
    const eOn = c.p(27, 0.7) * eOut;
    const a1 = c.over(28, 0.0, 0.3);
    const b1 = c.over(28, 0.3, 0.65);
    const g1 = c.over(28, 0.65, 1.0);
    const toZero = c.over(29, 0.1, 0.9);
    const spread = c.over(30, 0.15, 0.85);
    const alpha = 0.9 * a1 + 0.7 * spread;
    const beta = 1.0 * b1 * (1 - toZero);
    const gamma = 0.8 * g1 - 0.7 * spread;
    const rot = this.bodyRotation(alpha, beta, gamma);
    const ex = [v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)];
    this.worldRing.setOpacity(eOn * 0.8);
    this.worldX.setOpacity(eOn * 0.8);
    this.worldY.setOpacity(eOn * 0.8);
    const lens = [1.15, 1.15, 1.25];
    this.bodyAxes.forEach((a, i) => {
      a.set(v3(0, 0, 0), ex[i].clone().applyMatrix4(rot).multiplyScalar(lens[i]));
      a.setOpacity(eOn * (i === 2 ? flash(t, c.in(29, 0.95), 0.8, 0.35) : 1));
    });
    this.axis1.setOpacity(eOn * c.p(28, 0.5));
    const tip3 = ex[2].clone().applyMatrix4(rot).multiplyScalar(1.45);
    this.placer.place(this.eLabel1, v3(0, 0, 1.7), -70, 0, eOn * c.p(28, 0.5));
    this.placer.place(this.eLabel3, tip3, 70, -16, eOn * c.p(28, 0.5, 0.4));
    this.eTop.set({ opacity: eOn });
    const eShown = [c.p(28, 0.6), c.p(30, 0.6), c.p(30, 0.6, 1.8), c.p(31, 0.6)];
    this.eLines.forEach((h, i) => h.set({ opacity: eShown[i] * eOut }));

    // ---------- Phase F: the chart machine (s32–s36)
    const fOn = c.p(32, 0.6);
    this.fTitle.set({ opacity: fOn });
    const boxShown = [c.p(33, 0.6), c.p(32, 0.6, 0.4), c.p(34, 0.6)];
    this.boxes.forEach((b, i) => {
      b.region.setOpacity(0.12 * boxShown[i] * (i === 0 ? 1 : 1));
      b.line.setOpacity(boxShown[i]);
    });
    this.fArrows[0].setOpacity(c.p(33, 0.5, 0.5));
    this.fArrows[1].setOpacity(c.p(34, 0.5));
    const textOn = [c.p(33, 0.6, 0.2), c.p(33, 0.6, 0.8), c.p(32, 0.6, 0.8), c.p(32, 0.6, 0.8), c.p(32, 0.6, 0.8), c.p(34, 0.6, 0.3), c.p(34, 0.6, 0.8)];
    this.fTexts.forEach((h, i) => h.set({ opacity: textOn[i] }));
    this.fHint.set({ opacity: c.p(35, 0.6) });
    this.progress.forEach((p, i) => {
      const on = c.p(36, 0.6, 0.15 * i);
      const hot = i === 2 ? 0.7 + 0.3 * flash(t, c.s(36) + 1.0, 1.2, 0) : 1;
      p.region.setOpacity(0.2 * on * hot);
      p.line.setOpacity(on * hot);
      p.label.set({ opacity: on });
    });
  }

  teardown(_layers: SceneLayers): void {}
}

function smooth01(x: number): number {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
}
