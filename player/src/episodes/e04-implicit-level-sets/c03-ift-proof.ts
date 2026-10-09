import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";

/**
 * E04 c03 — deriving the implicit function theorem from the inverse function theorem.
 * Running example: f(x, y) = x² + y² − 1 at p = (0.6, 0.8), d = k = 1.
 * Left plot: the (x, y) plane (domain of F). Right plot: the (u, v) plane (codomain of F).
 * Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c03-ift-proof.
 */

const D = new THREE.Vector2(-3.65, 0);      // origin of the (x, y) plot
const C = new THREE.Vector2(-0.45, 0);     // origin of the (u, v) plot
const P = new THREE.Vector2(0.6, 0.8);     // base point p = (a, b)
const U0_RADIUS = 0.3;
const GRAY = Palette.muted;
const GOLD = Palette.yellow;
const LEFT_CENTER_X = 750;                 // horizontal center of the area left of the ledger

const f = (x: number, y: number): number => x * x + y * y - 1;
const dom = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(D.x + x, D.y + y, 0);
const cod = (u: number, v: number): THREE.Vector3 => new THREE.Vector3(C.x + u, C.y + v, 0);
/** Point (x, y) of the domain plot carried a fraction s of the way to its image F(x, y) = (x, f(x, y)). */
const carry = (x: number, y: number, s: number): THREE.Vector3 => dom(x, y).lerp(cod(x, f(x, y)), s);

interface GridLine {
  samples: THREE.Vector2[];
  still: Polyline;
  moving: Polyline;
}

function tc(color: string, body: string): string {
  return `\\textcolor{${color}}{${body}}`;
}

export class IftProofScene implements Scene {
  readonly id = "c03-ift-proof";
  private stage!: StageLayer;

  // Phase A: recap and construction
  private blobU!: Region;
  private blobV!: Region;
  private blobArrow!: CurvedArrow;
  private blobLabels: FormulaHandle[] = [];
  private squareNote!: FormulaHandle;
  private fEq!: FormulaHandle;
  private countLine!: FormulaHandle;
  private fDef!: FormulaHandle;
  private fSquare!: FormulaHandle;

  // Plots
  private axes: Arrow[] = [];
  private axisLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private grid: GridLine[] = [];
  private circleStill!: Polyline;
  private circleMoving!: Polyline;
  private pDot!: Dot;
  private pImage!: Dot;
  private arcGreen!: Polyline;
  private arcImage!: Polyline;
  private straightNote!: FormulaHandle;

  // Phase C: derivative
  private matrix!: FormulaHandle;
  private rowNoteX!: FormulaHandle;
  private rowNoteF!: FormulaHandle;
  private triNote!: FormulaHandle;
  private det!: FormulaHandle;

  // Phase D: inverse and g
  private u0Region!: Region;
  private u0Outline!: Polyline;
  private v0Region!: Region;
  private v0Outline!: Polyline;
  private arrowF!: CurvedArrow;
  private arrowFinv!: CurvedArrow;
  private labelU0!: FormulaHandle;
  private labelV0!: FormulaHandle;
  private labelF!: FormulaHandle;
  private labelFinv!: FormulaHandle;
  private invF!: FormulaHandle;
  private chain!: FormulaHandle;
  private axisSeg!: Polyline;
  private labelA0!: FormulaHandle;
  private gDef!: FormulaHandle;
  private graphArc!: Polyline;
  private pullAxisDot!: Dot;
  private pullGraphDot!: Dot;
  private pullLink!: Polyline;
  private labelGraph!: FormulaHandle;

  // Phase E: both directions and the box
  private dir1Dot!: Dot;
  private dir1Arrow!: CurvedArrow;
  private dir2Dot!: Dot;
  private dir2Out!: CurvedArrow;
  private dir2Back!: CurvedArrow;
  private labelInjective!: FormulaHandle;
  private mirrorDot!: Dot;
  private mirrorArrow!: CurvedArrow;
  private labelMirror!: FormulaHandle;
  private boxOutline!: Polyline;
  private labelBox!: FormulaHandle;

  // Phase F: failure at (1, 0)
  private failDot!: Dot;
  private failSquare!: Polyline;
  private failFill!: Region;
  private failLine!: Polyline;
  private failMatrix!: FormulaHandle;
  private failNote!: FormulaHandle;

  // Phase G: theorem
  private theorem!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    stage.setView2D(-0.9, -0.35, 5.4);

    // ---- Phase A
    const blob = (center: THREE.Vector2, phase: number): THREE.Vector3[] =>
      sampleCurve((s) => {
        const r = 0.72 + 0.08 * Math.sin(3 * s + phase) + 0.05 * Math.cos(5 * s - phase);
        return new THREE.Vector3(center.x + r * Math.cos(s), center.y + 0.15 + r * 0.85 * Math.sin(s), 0);
      }, 0, 2 * Math.PI, 96);
    this.blobU = new Region(stage, blob(D, 0.3), Palette.green, 0.25);
    this.blobV = new Region(stage, blob(C, 1.7), Palette.purple, 0.25);
    this.blobArrow = new CurvedArrow(stage, new THREE.Vector3(D.x + 0.85, 0.55, 0), new THREE.Vector3(C.x - 0.85, 0.55, 0), 0.35, Palette.text);
    this.blobLabels = [
      fl.add({ tex: "U_0", x: 0, y: 0, size: 40, color: Palette.green }),
      fl.add({ tex: "V_0", x: 0, y: 0, size: 40, color: Palette.purple }),
      fl.add({ tex: "F", x: 0, y: 0, size: 40 }),
    ];
    this.squareNote = fl.add({ tex: "\\text{IFT: } F:\\mathbb{R}^n\\to\\mathbb{R}^n,\\ \\ DF(x_0)\\ \\text{invertible}\\ \\Rightarrow\\ \\text{local diffeomorphism}", x: LEFT_CENTER_X, y: 790, size: 36, color: Palette.text });
    this.fEq = fl.add({ tex: `f(\\underbrace{${tc(GRAY, "x")}}_{\\in\\,\\mathbb{R}^d},\\ \\underbrace{${tc(GOLD, "y")}}_{\\in\\,\\mathbb{R}^k})=0`, x: LEFT_CENTER_X, y: 360, size: 66 });
    this.countLine = fl.add({ tex: "k\\ \\text{equations},\\qquad d+k\\ \\text{unknowns}", x: LEFT_CENTER_X, y: 500, size: 40, color: Palette.muted });
    this.fDef = fl.add({ tex: `F(x,y)=(${tc(GRAY, "x")},\\ ${tc(GOLD, "f(x,y)")})`, x: LEFT_CENTER_X, y: 600, size: 60, boxed: true });
    this.fSquare = fl.add({ tex: "F:\\mathbb{R}^{d+k}\\to\\mathbb{R}^{d+k},\\qquad F(a,b)=(a,0)", x: LEFT_CENTER_X, y: 740, size: 40 });

    // ---- Plots
    const axis = (from: THREE.Vector3, to: THREE.Vector3): Arrow => new Arrow(stage, from, to, Palette.axis, { width: 2.5, headLength: 0.14 });
    this.axes = [
      axis(dom(-1.4, 0), dom(1.45, 0)), axis(dom(0, -1.35), dom(0, 1.5)),
      axis(cod(-1.4, 0), cod(1.45, 0)), axis(cod(0, -1.35), cod(0, 1.5)),
    ];
    const axisLabel = (tex: string, at: THREE.Vector3): { h: FormulaHandle; at: THREE.Vector3 } =>
      ({ h: fl.add({ tex, x: 0, y: 0, size: 34, color: Palette.muted }), at });
    this.axisLabels = [
      axisLabel("x", dom(1.6, 0)), axisLabel("y", dom(0, 1.62)),
      axisLabel("u", cod(1.56, 0)), axisLabel("v", cod(0, 1.62)),
    ];
    const lines: THREE.Vector2[][] = [];
    for (let c = 0.2; c <= 1.21; c += 0.2) {
      const w = Math.min(1.3, Math.sqrt(2.3 - c * c));
      lines.push(sampleCurve((s) => new THREE.Vector3(s, c, 0), -w, w, 60).map((v) => new THREE.Vector2(v.x, v.y)));
    }
    for (let c = -1.2; c <= 1.21; c += 0.2) {
      const top = Math.min(1.3, Math.sqrt(2.3 - c * c));
      lines.push(sampleCurve((s) => new THREE.Vector3(c, s, 0), 0.1, top, 40).map((v) => new THREE.Vector2(v.x, v.y)));
    }
    this.grid = lines.map((samples) => ({
      samples,
      still: new Polyline(stage, samples.map((q) => dom(q.x, q.y)), { color: Palette.grid, width: 1.6 }),
      moving: new Polyline(stage, samples.map((q) => dom(q.x, q.y)), { color: "#46557c", width: 1.8 }),
    }));
    this.circleStill = new Polyline(stage, circlePoints(D.x, D.y, 1), { color: Palette.blue, width: 5 });
    this.circleMoving = new Polyline(stage, circlePoints(D.x, D.y, 1), { color: Palette.blue, width: 5 });
    this.pDot = new Dot(stage, dom(P.x, P.y), Palette.orange, 0.055);
    this.pImage = new Dot(stage, cod(P.x, 0), Palette.orange, 0.055);
    const thetaP = Math.atan2(P.y, P.x);
    const arcPts = sampleCurve((s) => dom(Math.cos(s), Math.sin(s)), thetaP - 0.35, thetaP + 0.35, 40);
    this.arcGreen = new Polyline(stage, arcPts, { color: Palette.green, width: 8 });
    this.arcImage = new Polyline(stage, [cod(Math.cos(thetaP + 0.35), 0), cod(Math.cos(thetaP - 0.35), 0)], { color: Palette.green, width: 8 });
    this.straightNote = fl.add({ tex: "f(x,y)=0\\iff v=0", x: 0, y: 0, size: 38, color: Palette.green });

    // ---- Phase C
    this.matrix = fl.add({ tex: this.matrixTex(-1), x: 560, y: 400, size: 52, display: true });
    this.rowNoteX = fl.add({ tex: "\\leftarrow\\ \\text{from } x", x: 1010, y: 372, size: 32, color: Palette.orange, align: "left" });
    this.rowNoteF = fl.add({ tex: "\\leftarrow\\ \\text{from } f", x: 1010, y: 432, size: 32, color: Palette.orange, align: "left" });
    this.triNote = fl.add({ text: "block lower triangular", x: 560, y: 520, size: 30, color: Palette.muted });
    this.det = fl.add({ tex: this.detTex(0), x: 680, y: 640, size: 44 });

    // ---- Phase D
    const discPts = circlePoints(D.x + P.x, D.y + P.y, U0_RADIUS, 96);
    this.u0Region = new Region(stage, discPts, Palette.green, 0.2, -0.005);
    this.u0Outline = new Polyline(stage, discPts, { color: Palette.green, width: 2.5 });
    const v0Pts = sampleCurve((s) => {
      const x = P.x + U0_RADIUS * Math.cos(s);
      const y = P.y + U0_RADIUS * Math.sin(s);
      return cod(x, f(x, y));
    }, 0, 2 * Math.PI, 96);
    this.v0Region = new Region(stage, v0Pts, Palette.purple, 0.2, -0.005);
    this.v0Outline = new Polyline(stage, v0Pts, { color: Palette.purple, width: 2.5 });
    this.arrowF = new CurvedArrow(stage, new THREE.Vector3(-2.77, 1.18, 0), new THREE.Vector3(-0.1, 0.42, 0), 0.45, Palette.text);
    this.arrowFinv = new CurvedArrow(stage, new THREE.Vector3(-0.1, -0.38, 0), new THREE.Vector3(-2.67, 0.42, 0), 0.45, Palette.text);
    this.labelU0 = fl.add({ tex: "U_0", x: 0, y: 0, size: 34, color: Palette.green });
    this.labelV0 = fl.add({ tex: "V_0", x: 0, y: 0, size: 34, color: Palette.purple });
    this.labelF = fl.add({ tex: "F", x: 0, y: 0, size: 38 });
    this.labelFinv = fl.add({ tex: "F^{-1}", x: 0, y: 0, size: 38 });
    this.invF = fl.add({ tex: this.invTex(0), x: LEFT_CENTER_X, y: 100, size: 46 });
    this.chain = fl.add({ tex: this.chainTex(0), x: LEFT_CENTER_X, y: 800, size: 42 });
    const uLo = Math.cos(thetaP + 2 * Math.asin(U0_RADIUS / 2));
    const uHi = Math.cos(thetaP - 2 * Math.asin(U0_RADIUS / 2));
    this.axisSeg = new Polyline(stage, [cod(uLo, 0), cod(uHi, 0)], { color: GOLD, width: 9 });
    this.labelA0 = fl.add({ tex: "A_0", x: 0, y: 0, size: 34, color: GOLD });
    this.gDef = fl.add({ tex: this.gTex(0), x: LEFT_CENTER_X, y: 800, size: 42 });
    this.graphArc = new Polyline(stage, sampleCurve((u) => dom(u, Math.sqrt(1 - u * u)), uLo, uHi, 60), { color: Palette.green, width: 8 });
    this.pullAxisDot = new Dot(stage, cod(uLo, 0), GOLD, 0.05);
    this.pullGraphDot = new Dot(stage, dom(uLo, Math.sqrt(1 - uLo * uLo)), Palette.green, 0.05);
    this.pullLink = new Polyline(stage, [cod(uLo, 0), dom(uLo, 0)], { color: Palette.green, width: 2, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    this.labelGraph = fl.add({ text: "graph of g", x: 0, y: 0, size: 30, color: Palette.green });
    this.pullRange = { lo: uLo, hi: uHi };

    // ---- Phase E
    const u1 = 0.48;
    this.dir1Dot = new Dot(stage, dom(u1, Math.sqrt(1 - u1 * u1)), Palette.green, 0.05);
    this.dir1Arrow = new CurvedArrow(stage, dom(u1, Math.sqrt(1 - u1 * u1)), cod(u1, 0), 0.5, Palette.green, 2.5);
    const x2 = 0.72;
    const y2 = Math.sqrt(1 - x2 * x2);
    this.dir2Dot = new Dot(stage, dom(x2, y2), "#ffffff", 0.055);
    this.dir2Out = new CurvedArrow(stage, dom(x2, y2), cod(x2, 0), 0.35, "#ffffff", 2.5);
    this.dir2Back = new CurvedArrow(stage, cod(x2, 0), dom(x2, y2), 0.35, Palette.green, 2.5);
    this.labelInjective = fl.add({ tex: "F\\ \\text{one-to-one on } U_0", x: 0, y: 0, size: 32, color: Palette.text });
    this.mirrorDot = new Dot(stage, dom(x2, -y2), Palette.red, 0.055);
    this.mirrorArrow = new CurvedArrow(stage, dom(x2, -y2), cod(x2, 0), -0.25, Palette.red, 2.5);
    this.labelMirror = fl.add({ tex: "(x,-g(x))\\notin U_0", x: 0, y: 0, size: 32, color: Palette.red });
    this.boxOutline = new Polyline(stage, discPts, { color: Palette.green, width: 3 });
    this.labelBox = fl.add({ tex: "A\\times B", x: 0, y: 0, size: 32, color: Palette.green });
    this.discPts = discPts;

    // ---- Phase F
    this.failDot = new Dot(stage, dom(1, 0), Palette.red, 0.055);
    this.failSquare = new Polyline(stage, this.squarePoints(0), { color: Palette.red, width: 3 });
    this.failFill = new Region(stage, this.squarePoints(0), Palette.red, 0.3);
    this.failLine = new Polyline(stage, [cod(0.55, 2 * (0.55 - 1)), cod(1.3, 2 * (1.3 - 1))], { color: Palette.red, width: 2, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    this.failMatrix = fl.add({ tex: "DF(1,0)=\\begin{pmatrix}1 & \\textcolor{#ff6b6b}{0}\\\\ 2 & \\textcolor{#ff6b6b}{0}\\end{pmatrix},\\qquad \\det DF(1,0)=0", x: LEFT_CENTER_X, y: 800, size: 40 });
    this.failNote = fl.add({ text: "near (1, 0): two y-values for x < 1, none for x > 1", x: LEFT_CENTER_X, y: 96, size: 30, color: Palette.red });

    // ---- Phase G
    this.theorem = fl.add({
      tex: "\\begin{gathered}f(a,b)=0,\\quad D_yf(a,b)\\ \\text{invertible}\\\\ \\Downarrow\\\\ \\exists\\ A\\ni a,\\ B\\ni b,\\ g:A\\to B\\ \\text{smooth, unique}:\\\\ f(x,y)=0\\iff y=g(x)\\quad\\text{on } A\\times B\\end{gathered}",
      x: LEFT_CENTER_X, y: 590, size: 40, boxed: true, display: true,
    });
    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "F(x,y)=(x,f(x,y))", at: cue.s(5) + 1.5 },
      { label: "2", tex: "\\det DF(a,b)\\neq 0", at: cue.s(16) + 0.8 },
      { label: "3", tex: "F:U_0\\to V_0\\ \\text{diffeo}", at: cue.s(18) + 2.0 },
      { label: "4", tex: "F^{-1}(u,v)=(u,Y(u,v))", at: cue.s(24) + 2.0 },
      { label: "5", tex: "f=0\\iff y=g(x)\\ \\ (A\\times B)", at: cue.s(38) + 2.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
    this.chainDir = fl.add({ tex: this.dirTex(0), x: LEFT_CENTER_X, y: 800, size: 40 });
  }

  private pullRange = { lo: 0, hi: 1 };
  private discPts: THREE.Vector3[] = [];
  private chainDir!: FormulaHandle;

  private matrixTex(highlight: number): string {
    const c = (base: string, on: boolean): string => (on ? Palette.orange : base);
    const row1 = highlight === 1;
    const row2 = highlight === 2;
    const zero = highlight === 3 ? Palette.red : c(GRAY, row1);
    return `DF(a,b)=\\begin{pmatrix} ${tc(c(GRAY, row1), "I_d")} & ${tc(zero, "0")} \\\\ ${tc(c("#f5d78e", row2), "D_xf(a,b)")} & ${tc(c(GOLD, row2), "D_yf(a,b)")} \\end{pmatrix}`;
  }

  private detTex(parts: number): string {
    const seg = [
      "\\det DF(a,b)",
      "=\\det I_d\\cdot\\det D_yf(a,b)",
      "=\\det D_yf(a,b)",
      `\\neq 0\\ \\ ${tc(Palette.green, "\\checkmark")}`,
    ];
    return seg.map((s, i) => (i < parts ? s : `\\phantom{${s}}`)).join("");
  }

  private invTex(state: number): string {
    if (state === 0) return "F^{-1}(u,v)=(X(u,v),\\ Y(u,v))";
    if (state === 1) return `F^{-1}(u,v)=(${tc(Palette.red, "X(u,v)\\,?")},\\ Y(u,v))`;
    return `F^{-1}(u,v)=(${tc(GRAY, "u")},\\ Y(u,v))`;
  }

  private chainTex(state: number): string {
    const s1 = "(x,y)=F^{-1}(u,v)";
    const s2 = `(${tc(Palette.orange, "u")},v)=F(x,y)=(${tc(Palette.orange, "x")},\\ f(x,y))`;
    const s3 = `\\ \\Rightarrow\\ ${tc(Palette.orange, "u=x")}`;
    if (state <= 0) return `${s1}\\phantom{${s3}}`;
    if (state === 1) return `${s2}\\phantom{${s3}}`;
    return `${s2}${s3}`;
  }

  private gTex(state: number): string {
    const a = "g(u):=Y(u,0),\\quad u\\in A_0=\\{u:(u,0)\\in V_0\\}";
    const b = "\\qquad g\\ \\text{smooth},\\ \\ g(a)=b";
    return state <= 0 ? `${a}\\phantom{${b}}` : `${a}${b}`;
  }

  private dirTex(step: number): string {
    const parts1 = [
      "F(u,g(u))=(u,0)",
      "=(u,\\ f(u,g(u)))",
      `\\ \\Rightarrow\\ f(u,g(u))=0\\ \\ ${tc(Palette.green, "(\\Leftarrow)\\,\\checkmark")}`,
    ];
    const parts2 = [
      "f(x,y)=0\\ \\Rightarrow\\ F(x,y)=(x,0)",
      "=F(x,g(x))",
      `\\ \\Rightarrow\\ y=g(x)\\ \\ ${tc(Palette.green, "(\\Rightarrow)\\,\\checkmark")}`,
    ];
    const parts = step < 10 ? parts1 : parts2;
    const n = step < 10 ? step : step - 10;
    return parts.map((s, i) => (i < n ? s : `\\phantom{${s}}`)).join("");
  }

  private squarePoints(s: number): THREE.Vector3[] {
    const h = 0.15;
    const pts: THREE.Vector2[] = [];
    const side = (ax: number, ay: number, bx: number, by: number): void => {
      for (let i = 0; i < 20; i++) pts.push(new THREE.Vector2(lerp(ax, bx, i / 20), lerp(ay, by, i / 20)));
    };
    side(1 - h, -h, 1 + h, -h);
    side(1 + h, -h, 1 + h, h);
    side(1 + h, h, 1 - h, h);
    side(1 - h, h, 1 - h, -h);
    pts.push(pts[0].clone());
    return pts.map((q) => carry(q.x, q.y, s));
  }

  private boxPoints(s: number): THREE.Vector3[] {
    // Rectangle A × B around p, sampled with the same count as the U₀ outline so the two can be blended.
    const n = this.discPts.length;
    const hw = 0.18;
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / (n - 1)) * 2 * Math.PI;
      const cx = Math.cos(ang);
      const cy = Math.sin(ang);
      const k = hw / Math.max(Math.abs(cx), Math.abs(cy));
      const rect = dom(P.x + k * cx, P.y + k * cy);
      out.push(this.discPts[i].clone().lerp(rect, s));
    }
    return out;
  }

  private place(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const p = this.stage.project(world);
    h.set({ x: p.x + dx, y: p.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    const endFade = 1 - c.p(42, 1.0);                       // stage content fades for the closing theorem
    // ---- Phase A
    const blobs = c.p(0, 0.8, -0.6) * (1 - c.p(1, 0.8, 0.6));
    this.blobU.setOpacity(0.25 * blobs);
    this.blobV.setOpacity(0.25 * blobs);
    this.blobArrow.setProgress(c.p(0, 1.2, 0.2), blobs);
    this.place(this.blobLabels[0], new THREE.Vector3(D.x, 0.15, 0), 0, 0, blobs);
    this.place(this.blobLabels[1], new THREE.Vector3(C.x, 0.15, 0), 0, 0, blobs);
    this.place(this.blobLabels[2], new THREE.Vector3((D.x + C.x) / 2, 0.98, 0), 0, 0, blobs);
    this.squareNote.set({ opacity: blobs });
    const phaseA = 1 - c.p(6, 0.8);
    this.fEq.set({ opacity: c.p(1, 0.8) * phaseA, y: lerp(360, 300, c.p(4, 0.8)) });
    this.countLine.set({ opacity: c.p(1, 0.8, 1.2) * (1 - c.p(3, 0.6)), y: lerp(500, 440, c.p(4, 0.8)) });
    const fd = keyframes(t, [
      { t: 0, v: { x: LEFT_CENTER_X, y: 600, scale: 1, o: 0 } },
      { t: c.s(4), v: { x: LEFT_CENTER_X, y: 560, scale: 1, o: 1 } },
      { t: c.s(6), v: { x: LEFT_CENTER_X, y: 100, scale: 0.72, o: 1 } },
      { t: c.s(19), v: { x: LEFT_CENTER_X, y: 100, scale: 0.72, o: 0 } },
      { t: c.s(42), v: { x: LEFT_CENTER_X, y: 300, scale: 1.05, o: 1 } },
    ]);
    const pulse = c.s(43) <= t ? 0.5 + 0.5 * Math.cos((t - c.s(43)) * 2 * Math.PI / 1.2) : 1;
    this.fDef.setContent(t >= c.s(42) && pulse < 0.5
      ? `F(x,y)=(${tc(Palette.orange, "x")},\\ ${tc(GOLD, "f(x,y)")})`
      : `F(x,y)=(${tc(GRAY, "x")},\\ ${tc(GOLD, "f(x,y)")})`);
    this.fDef.set({ x: fd.x, y: fd.y, scale: fd.scale, opacity: fd.o });
    this.fSquare.set({ opacity: c.p(5, 0.8) * phaseA });

    // ---- Plots: visible from sentence 6; dimmed during the derivative computation and the closing theorem
    const plotsIn = c.p(6, 0.9);
    const dimC = c.p(10, 0.8) * (1 - c.p(17, 0.8));
    const plots = plotsIn * (1 - 0.92 * dimC) * endFade;
    const deform = c.over(7, 0.05, 0.95);
    this.axes.forEach((a, i) => a.setOpacity(plots * (i < 2 ? 1 : smoothstep(0.1, 0.6, deform))));
    this.axisLabels.forEach((l, i) => this.place(l.h, l.at, 0, 0, plots * (i < 2 ? 1 : smoothstep(0.1, 0.6, deform))));
    for (const g of this.grid) {
      g.still.setOpacity(plots * lerp(0.9, 0.45, deform));
      g.moving.setPoints(g.samples.map((q) => carry(q.x, q.y, deform)));
      g.moving.setOpacity(plots * smoothstep(0.0, 0.15, deform));
    }
    this.circleStill.setOpacity(plots);
    this.circleMoving.setPoints(circlePoints(0, 0, 1).map((q) => carry(q.x, q.y, deform)));
    this.circleMoving.setOpacity(plots * smoothstep(0.0, 0.1, deform));
    const onAxis = c.p(8, 0.6) * (1 - c.p(10, 0.6));
    this.circleMoving.setColor(onAxis > 0.5 ? GOLD : Palette.blue);
    this.circleMoving.setWidth(onAxis > 0.5 ? 7 : 5);
    this.pDot.setOpacity(plots);
    this.pImage.setPosition(carry(P.x, P.y, deform));
    this.pImage.setOpacity(plots * smoothstep(0.0, 0.1, deform));
    const arc = c.p(9, 0.7) * (1 - c.p(10, 0.6));
    this.arcGreen.setOpacity(plots * arc);
    this.arcImage.setOpacity(plots * arc);
    this.place(this.straightNote, cod(0.55, 1.15), 0, 0, arc * plots);

    // ---- Phase C: derivative
    const phaseC = c.p(10, 0.8) * (1 - c.p(17, 0.8));
    const hl = t >= c.s(13) && t < c.s(14) ? 3 : t >= c.s(12) && t < c.s(13) ? 2 : t >= c.s(11) && t < c.s(12) ? 1 : 0;
    this.matrix.setContent(this.matrixTex(hl));
    this.matrix.set({ opacity: phaseC * c.p(10, 0.8, 0.6) });
    this.rowNoteX.set({ opacity: phaseC * c.p(11, 0.5) });
    this.rowNoteF.set({ opacity: phaseC * c.p(12, 0.5) });
    this.triNote.set({ opacity: phaseC * c.p(13, 0.6) });
    const detParts = t >= c.in(15, 0.75) ? 4 : t >= c.s(15) ? 3 : t >= c.in(14, 0.5) ? 2 : t >= c.s(14) ? 1 : 0;
    this.det.setContent(this.detTex(detParts));
    this.det.set({ opacity: phaseC * (detParts > 0 ? 1 : 0), color: t >= c.s(16) ? Palette.green : Palette.text });

    // ---- Phase D: inverse function theorem, F⁻¹ and g
    const phaseD = c.p(18, 0.8) * endFade;
    const failDim = 1 - 0.75 * c.p(39, 0.8);
    this.u0Region.setOpacity(0.2 * phaseD * failDim);
    this.u0Outline.setOpacity(phaseD * (1 - c.p(37, 0.6)) * failDim);
    this.v0Region.setOpacity(0.2 * phaseD * (1 - 0.6 * c.p(25, 0.6)) * failDim);
    this.v0Outline.setOpacity(phaseD * failDim);
    const arrowsIn = c.p(18, 1.4, 0.4);
    const arrowsOut = 1 - c.p(25, 0.6);
    this.arrowF.setProgress(arrowsIn, phaseD * arrowsOut);
    this.arrowFinv.setProgress(c.p(18, 1.4, 1.2), phaseD * arrowsOut);
    this.place(this.labelU0, dom(P.x + 0.42, P.y + 0.3), 0, 0, phaseD * failDim);
    this.place(this.labelV0, cod(P.x + 0.42, 0.5), 0, 0, phaseD * failDim);
    this.place(this.labelF, new THREE.Vector3(-1.35, 1.35, 0), 0, 0, phaseD * arrowsOut * arrowsIn);
    this.place(this.labelFinv, new THREE.Vector3(-1.25, -0.62, 0), 0, 0, phaseD * arrowsOut * c.p(18, 1.4, 1.2));
    const invState = t >= c.s(24) ? 2 : t >= c.s(20) ? 1 : 0;
    this.invF.setContent(this.invTex(invState));
    this.invF.set({ opacity: c.p(19, 0.7) * (1 - c.p(29, 0.6)) });
    const chainState = t >= c.s(23) ? 2 : t >= c.s(22) ? 1 : 0;
    this.chain.setContent(this.chainTex(chainState));
    this.chain.set({ opacity: c.p(21, 0.6) * (1 - c.p(25, 0.5)) });
    const axisFocus = c.p(25, 0.7) * (1 - c.p(29, 0.6)) * endFade;
    this.axisSeg.setOpacity(axisFocus);
    this.place(this.labelA0, cod((this.pullRange.lo + this.pullRange.hi) / 2, -0.22), 0, 0, axisFocus * c.p(26, 0.6));
    this.gDef.setContent(this.gTex(t >= c.s(27) ? 1 : 0));
    this.gDef.set({ opacity: c.p(26, 0.6) * (1 - c.p(29, 0.5)) });
    const pull = c.over(28, 0.05, 0.9);
    const uNow = lerp(this.pullRange.lo, this.pullRange.hi, pull);
    const graphVisible = c.p(28, 0.4) * endFade * failDim;
    this.graphArc.setProgress(pull);
    this.graphArc.setOpacity(graphVisible * (1 - 0.5 * c.p(37, 0.6)));
    const pulling = c.p(28, 0.4) * (1 - c.p(29, 0.5));
    this.pullAxisDot.setPosition(cod(uNow, 0));
    this.pullAxisDot.setOpacity(pulling);
    this.pullGraphDot.setPosition(dom(uNow, Math.sqrt(1 - uNow * uNow)));
    this.pullGraphDot.setOpacity(pulling);
    this.pullLink.setPoints([cod(uNow, 0), dom(uNow, Math.sqrt(1 - uNow * uNow))]);
    this.pullLink.setOpacity(0.8 * pulling);
    this.place(this.labelGraph, dom(-0.15, 1.12), 0, 0, graphVisible * c.p(28, 0.6, 1.5) * (1 - c.p(37, 0.6)));

    // ---- Phase E: the two directions, the mirror point and the box
    const dir1 = c.p(29, 0.6) * (1 - c.p(32, 0.6));
    this.dir1Dot.setOpacity(dir1);
    this.dir1Arrow.setProgress(c.p(30, 1.0), dir1);
    const dirStep = t >= c.s(35) ? 13 : t >= c.s(34) ? 12 : t >= c.s(33) ? 11 : t >= c.s(32) ? 10
      : t >= c.s(31) ? 3 : t >= c.in(30, 0.45) ? 2 : t >= c.s(30) ? 1 : 0;
    this.chainDir.setContent(this.dirTex(dirStep));
    this.chainDir.set({ opacity: (dirStep > 0 && dirStep !== 10 ? 1 : 0) * (1 - c.p(37, 0.6)) });
    const dir2 = c.p(32, 0.6) * (1 - c.p(37, 0.6));
    this.dir2Dot.setOpacity(dir2);
    this.dir2Out.setProgress(c.p(33, 1.0), dir2);
    this.dir2Back.setProgress(c.p(34, 1.0), dir2);
    this.place(this.labelInjective, dom(1.05, 1.42), 0, 0, dir2 * c.p(34, 0.6, 1.2));
    const mirror = c.p(36, 0.6) * (1 - c.p(37, 0.6));
    this.mirrorDot.setOpacity(mirror);
    this.mirrorArrow.setProgress(c.p(36, 1.0, 0.3), mirror);
    this.place(this.labelMirror, dom(0.72, -0.98), 0, 0, mirror);
    const boxMorph = c.p(37, 1.2, 0.3);
    this.boxOutline.setPoints(this.boxPoints(boxMorph));
    this.boxOutline.setOpacity(c.p(37, 0.5) * endFade * failDim);
    this.place(this.labelBox, dom(P.x + 0.36, P.y - 0.28), 0, 0, c.p(37, 0.6, 1.0) * endFade * failDim);

    // ---- Phase F: what fails when D_y f is singular
    const phaseF = c.p(39, 0.8) * (1 - c.p(42, 0.8));
    this.failDot.setOpacity(phaseF);
    this.failMatrix.set({ opacity: phaseF });
    const squash = c.over(40, 0.2, 0.9);
    const sq = this.squarePoints(squash);
    this.failSquare.setPoints(sq);
    this.failSquare.setOpacity(phaseF * c.p(40, 0.5));
    this.failFill.setPoints(sq);
    this.failFill.setOpacity(0.3 * phaseF * c.p(40, 0.5));
    this.failLine.setOpacity(phaseF * smoothstep(0.6, 1.0, squash));
    this.failNote.set({ opacity: phaseF * c.p(41, 0.6) });

    // ---- Phase G: the theorem
    this.theorem.set({ opacity: c.p(42, 0.8, 1.0) });
    this.ledger.update(t, clamp01(c.p(5, 0.5, 1.0)), t < c.s(42));
  }

  teardown(_layers: SceneLayers): void {}
}
