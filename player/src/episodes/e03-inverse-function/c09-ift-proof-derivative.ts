import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { PlotAxes } from "./lib/PlotAxes";
import { PlotFrame } from "./lib/PlotFrame";
import { RoadSign } from "./lib/RoadSign";
import { RudinExample } from "./lib/RudinExample";
import { Tex } from "./lib/Tex";

/**
 * E03 c09 — proof part (b): g is differentiable with g'(y) = [f'(g(y))]⁻¹, then C¹ (and C^k as a supplementary remark).
 * Example: RudinExample (A = I, λ = ½), y = (0.3, 0.2), increments k = σ·(0.35, 0.25).
 * Sentence indices refer to story.en.json, scene c09-ift-proof-derivative.
 */

const L = { x: 360, y: 470, s: 230 };
const R = { x: 980, y: 470, s: 230 };
const Y: [number, number] = [0.3, 0.2];
const K0: [number, number] = [0.35, 0.25];
const DIR: [number, number] = [0.8, 0.6];
const ROOT = new PlotFrame(520, 640, 300);
const CHART = { ox: 130, oy: 640, sx: 1000, h: 300 };

type V2 = [number, number];

function circlePts(cx: number, cy: number, r: number, n = 96): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(pxv(cx + r * Math.cos((2 * Math.PI * i) / n), cy - r * Math.sin((2 * Math.PI * i) / n)));
  return pts;
}

export class IftDerivativeScene implements Scene {
  readonly id = "c09-ift-proof-derivative";
  private readonly X: V2 = RudinExample.inverse(Y);
  private readonly T: [number, number, number, number];

  private flag!: FormulaHandle;
  private uEdge!: Polyline;
  private vEdge!: Polyline;
  private vFill!: Region;
  private xDot!: Dot;
  private yDot!: Dot;
  private xhDot!: Dot;
  private ykDot!: Dot;
  private hArrow!: Arrow;
  private kArrow!: Arrow;
  private boundCircle!: Polyline;
  private panelLabels: FormulaHandle[] = [];
  private movLabels: FormulaHandle[] = [];
  private top!: FormulaHandle;
  private chain: FormulaHandle[] = [];

  private rootAxes!: PlotAxes;
  private rootCurve!: Polyline;
  private rootMarks: Polyline[] = [];
  private rootTable!: FormulaHandle;
  private rootNote!: FormulaHandle;

  private list: FormulaHandle[] = [];
  private estimate: FormulaHandle[] = [];
  private chartAxes!: PlotAxes;
  private chartCurve!: Polyline;
  private derivBox!: FormulaHandle;

  private compChain!: FormulaHandle;
  private compLabels: FormulaHandle[] = [];
  private c1Line!: FormulaHandle;
  private supp: FormulaHandle[] = [];
  private remarks: FormulaHandle[] = [];
  private theorem!: FormulaHandle;

  private ledger!: ProofLedger;
  private road!: RoadSign;

  constructor() {
    const J = RudinExample.jacobian(this.X[0], this.X[1]);
    const det = J[0] * J[3] - J[1] * J[2];
    this.T = [J[3] / det, -J[1] / det, -J[2] / det, J[0] / det];
  }

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);

    this.flag = fl.add({ tex: this.flagTex(false), x: 660, y: 110, size: 30, boxed: true });

    // ---- panels
    this.uEdge = new Polyline(stage, circlePts(L.x, L.y, L.s), { color: Palette.blue, width: 3 });
    const vPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (2 * Math.PI * i) / 128;
      vPts.push(this.rp(RudinExample.f(Math.cos(a), Math.sin(a))));
    }
    this.vEdge = new Polyline(stage, vPts, { color: Palette.purple, width: 3 });
    this.vFill = new Region(stage, vPts, Palette.purple, 0.1);
    this.xDot = new Dot(stage, this.lp(this.X, 0.03), Palette.orange, 0.06);
    this.yDot = new Dot(stage, this.rp(Y, 0.03), Palette.orange, 0.06);
    this.xhDot = new Dot(stage, this.lp(this.X, 0.03), Palette.yellow, 0.055);
    this.ykDot = new Dot(stage, this.rp(Y, 0.03), Palette.yellow, 0.055);
    this.hArrow = new Arrow(stage, this.lp(this.X, 0.02), this.lp(this.X, 0.02), Palette.yellow, { width: 3.5, headLength: 0.12 });
    this.kArrow = new Arrow(stage, this.rp(Y, 0.02), this.rp(Y, 0.02), Palette.yellow, { width: 3.5, headLength: 0.12 });
    this.boundCircle = new Polyline(stage, circlePts(0, 0, 1), { color: Palette.green, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.panelLabels = [
      fl.add({ tex: "U", x: L.x - 170, y: L.y - 170, size: 34, color: Palette.blue }),
      fl.add({ tex: "V", x: R.x - 200, y: R.y - 170, size: 34, color: Palette.purple }),
      fl.add({ tex: "x=g(y)", x: this.lpx(this.X).x - 20, y: this.lpx(this.X).y + 30, size: 26, color: Palette.orange }),
      fl.add({ tex: "y", x: this.rpx(Y).x - 20, y: this.rpx(Y).y + 28, size: 26, color: Palette.orange }),
    ];
    this.movLabels = [
      fl.add({ tex: "h", x: 0, y: 0, size: 28, color: Palette.yellow }),
      fl.add({ tex: "k", x: 0, y: 0, size: 28, color: Palette.yellow }),
      fl.add({ tex: "\\|k\\|/\\lambda", x: 0, y: 0, size: 24, color: Palette.green }),
    ];
    this.top = fl.add({ tex: "\\varphi(x+h)-\\varphi(x)=h+A^{-1}\\big(f(x)-f(x+h)\\big)=h-A^{-1}k", x: 660, y: 110, size: 32 });
    const ch = [
      "\\text{Step 3: } \\|h-A^{-1}k\\|\\le\\tfrac12\\|h\\|",
      "\\|A^{-1}k\\|\\ge\\|h\\|-\\|h-A^{-1}k\\|\\ge\\tfrac12\\|h\\|",
      "\\|h\\|\\le 2\\|A^{-1}k\\|\\le 2\\|A^{-1}\\|\\,\\|k\\|",
      `=${Tex.color(Palette.green, "\\|k\\|/\\lambda")}`,
    ];
    this.chain = ch.map((tex, i) => fl.add({ tex, x: i === 3 ? 860 : 640, y: [750, 805, 805, 805][i], size: 30, align: i === 3 ? "left" : "center" }));

    // ---- cube root inset
    this.rootAxes = new PlotAxes(stage, fl, ROOT, { uMin: -0.05, uMax: 0.8, vMin: -0.05, vMax: 1.0, uLabel: "k", vLabel: "h" });
    const rc: THREE.Vector3[] = [];
    for (let i = 0; i <= 200; i++) {
      const k = 0.75 * Math.pow(i / 200, 3);
      rc.push(ROOT.v3(k, Math.cbrt(k)));
    }
    this.rootCurve = new Polyline(stage, rc, { color: Palette.purple, width: 3.5 });
    for (const k of [0.1, 0.01, 0.001]) {
      this.rootMarks.push(new Polyline(stage, [ROOT.v3(k, 0), ROOT.v3(k, Math.cbrt(k)), ROOT.v3(0, Math.cbrt(k))], { color: Palette.yellow, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 }));
    }
    this.rootTable = fl.add({ tex: "\\begin{gathered}h=k^{1/3}\\\\ k=0.1:\\ h/k\\approx 4.6\\\\ k=0.01:\\ h/k\\approx 21.5\\\\ k=0.001:\\ h/k=100\\end{gathered}", x: 1000, y: 420, size: 28, display: true, color: Palette.yellow });
    this.rootNote = fl.add({ tex: "\\text{no bound } \\|h\\|\\le C\\|k\\|\\ \\Rightarrow\\ \\text{not differentiable}", x: 1000, y: 600, size: 28, color: Palette.red });

    // ---- algebra list (steps 4–5)
    const li = [
      "\\text{Step 4: } \\|f'(x)-A\\|\\,\\|A^{-1}\\|<\\lambda\\,\\|A^{-1}\\|=\\tfrac12\\quad(x\\in U)",
      "\\text{Lemma: } A\\ \\text{invertible},\\ \\|B-A\\|\\,\\|A^{-1}\\|<1\\ \\Rightarrow\\ B\\ \\text{invertible}",
      "B=A\\big(I-A^{-1}(A-B)\\big)",
      "M=A^{-1}(A-B),\\ \\|M\\|<1:\\quad (I-M)^{-1}=\\textstyle\\sum_{j\\ge0}M^j",
      `${Tex.color(Palette.yellow, "f'(x)\\ \\text{invertible},\\quad T:=f'(x)^{-1}")}`,
      `\\text{Step 5: } g(y+k)-g(y)-Tk=${Tex.color(Palette.orange, "h-Tk")}`,
      `${Tex.color(Palette.orange, "h-Tk")}=-T\\big[${Tex.color(Palette.blue, "f(x+h)-f(x)-f'(x)h")}\\big]`,
      "\\text{check: } T\\,f'(x)h=h,\\quad f(x+h)-f(x)=k",
    ];
    this.list = li.map((tex, i) => fl.add({ tex, x: 660, y: [140, 210, 270, 330, 400, 490, 555, 620][i], size: i === 1 ? 26 : 28, boxed: i === 1 }));

    // ---- estimate (steps 6–7) and numerical error ratio
    const es = [
      `\\text{Step 6: } \\frac{\\|g(y+k)-g(y)-Tk\\|}{\\|k\\|}\\le\\|T\\|\\,\\frac{\\|${Tex.color(Palette.blue, "f(x+h)-f(x)-f'(x)h")}\\|}{\\|k\\|}`,
      "\\tfrac{1}{\\|k\\|}\\le\\tfrac{1}{\\lambda\\|h\\|}\\quad(\\text{step 3})",
      `\\le\\frac{\\|T\\|}{\\lambda}\\cdot\\frac{\\|${Tex.color(Palette.blue, "f(x+h)-f(x)-f'(x)h")}\\|}{\\|h\\|}`,
      "\\text{Step 7: } k\\to0\\Rightarrow h\\to0\\Rightarrow\\ \\text{right side}\\to0",
    ];
    this.estimate = es.map((tex, i) => fl.add({ tex, x: 1010, y: [180, 260, 335, 415][i], size: i === 0 ? 28 : 30 }));
    this.derivBox = fl.add({ tex: `${Tex.color(Palette.yellow, "g'(y)=T=\\big[f'(g(y))\\big]^{-1}")}`, x: 1010, y: 500, size: 36, boxed: true });
    const ratio = (s: number): number => {
      const k: V2 = [s * DIR[0], s * DIR[1]];
      const gk = RudinExample.inverse([Y[0] + k[0], Y[1] + k[1]]);
      const tk: V2 = [this.T[0] * k[0] + this.T[1] * k[1], this.T[2] * k[0] + this.T[3] * k[1]];
      return Math.hypot(gk[0] - this.X[0] - tk[0], gk[1] - this.X[1] - tk[1]) / s;
    };
    const samples: [number, number][] = [];
    for (let i = 0; i < 30; i++) {
      const s = 0.4 - (0.39 * i) / 29;
      samples.push([s, ratio(s)]);
    }
    const rmax = Math.max(...samples.map((q) => q[1]));
    const sy = CHART.h / (rmax * 1.15);
    const chart = new PlotFrame(CHART.ox, CHART.oy, CHART.sx, sy);
    this.chartAxes = new PlotAxes(stage, fl, chart, { uMin: 0, uMax: 0.43, vMin: 0, vMax: rmax * 1.25, uLabel: "\\|k\\|", vLabel: "\\tfrac{\\|g(y+k)-g(y)-Tk\\|}{\\|k\\|}" });
    this.chartCurve = new Polyline(stage, samples.map((q) => chart.v3(q[0], q[1])), { color: Palette.green, width: 3.5 });

    // ---- C¹ and C^k
    this.compChain = fl.add({ tex: "y\\ \\xrightarrow{\\ \\ g\\ \\ }\\ x\\ \\xrightarrow{\\ \\ f'\\ \\ }\\ f'(x)\\in\\Omega\\ \\xrightarrow{\\ \\ \\mathrm{inv}\\ \\ }\\ T=g'(y)", x: 660, y: 200, size: 40 });
    const cl = [
      "\\text{continuous: differentiable}",
      "\\text{continuous: } f\\in C^1",
      "\\text{continuous: Cramer's rule}",
    ];
    this.compLabels = cl.map((tex, i) => fl.add({ tex, x: [330, 640, 960][i], y: 270, size: 24, color: Palette.green }));
    this.c1Line = fl.add({ tex: `g'=\\mathrm{inv}\\circ f'\\circ g\\ \\text{continuous}\\ \\Rightarrow\\ ${Tex.color(Palette.yellow, "g\\in C^1")}`, x: 660, y: 360, size: 34 });
    const sp = [
      "\\textit{Supplementary remark (higher regularity)}",
      "\\mathrm{inv}\\ \\text{is smooth on } \\Omega",
      "f\\in C^k,\\ g\\in C^j\\ (j<k)\\ \\Rightarrow\\ g'=\\mathrm{inv}\\circ f'\\circ g\\in C^{\\min(j,k-1)}=C^j\\ \\Rightarrow\\ g\\in C^{j+1}",
      "j=1\\to k:\\ \\ g\\in C^k;\\qquad f\\ \\text{smooth}\\Rightarrow g\\ \\text{smooth}",
    ];
    this.supp = sp.map((tex, i) => fl.add({ tex, x: 660, y: [460, 510, 565, 620][i], size: i === 2 ? 24 : 26, color: Palette.muted }));
    const rm = [
      "\\text{step 3 } (\\|h\\|\\le\\|k\\|/\\lambda)\\text{: exactly what the cube root lacks}",
      "\\text{step 4: } f'\\ \\text{invertible on all of } U\\ (\\text{continuity of } f')",
    ];
    this.remarks = rm.map((tex, i) => fl.add({ tex, x: 660, y: [700, 750][i], size: 26, color: Palette.text }));
    this.theorem = fl.add({ tex: `\\begin{gathered}\\text{Inverse function theorem}\\\\ (1)\\ F|_{U_0}\\ \\text{one-to-one}\\ ${Tex.color(Palette.green, "\\checkmark")}\\qquad (2)\\ V_0\\ \\text{open}\\ ${Tex.color(Palette.green, "\\checkmark")}\\qquad (3)\\ g\\in C^1,\\ g'=(F')^{-1}\\ ${Tex.color(Palette.green, "\\checkmark")}\\end{gathered}`, x: 660, y: 440, size: 30, boxed: true, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "a", tex: "f:U\\to V\\ \\text{bijective},\\ V\\ \\text{open}", at: 0.2 },
      { label: "b", tex: "\\varphi_y:\\ \\tfrac12\\text{-contraction on } U", at: 0.2 },
      { label: "1", tex: "\\|h\\|\\le\\|k\\|/\\lambda", at: cue.s(10) + 0.5 },
      { label: "2", tex: "f'(x)\\ \\text{invertible},\\ T=f'(x)^{-1}", at: cue.s(17) + 0.8 },
      { label: "3", tex: "g'(y)=[f'(g(y))]^{-1}", at: cue.s(25) + 1.0 },
      { label: "4", tex: "g\\in C^1", at: cue.s(31) + 1.0 },
      { label: "5", tex: "f\\in C^k\\Rightarrow g\\in C^k\\ (\\text{suppl.})", at: cue.s(34) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
    this.road = new RoadSign(fl, 700);
  }

  private flagTex(done: boolean): string {
    return done
      ? `Dg(F(x_0))=DF(x_0)^{-1}:\\ \\ ${Tex.color(Palette.green, "g\\ \\text{differentiable, proved}\\ \\checkmark")}`
      : `Dg(F(x_0))=DF(x_0)^{-1}:\\ \\ ${Tex.color(Palette.orange, "\\text{needs } g\\ \\text{differentiable}")}`;
  }

  private lpx(q: V2): { x: number; y: number } {
    return { x: L.x + L.s * q[0], y: L.y - L.s * q[1] };
  }

  private lp(q: V2, z = 0): THREE.Vector3 {
    const p = this.lpx(q);
    return pxv(p.x, p.y, z);
  }

  private rpx(q: V2): { x: number; y: number } {
    return { x: R.x + R.s * q[0], y: R.y - R.s * q[1] };
  }

  private rp(q: V2, z = 0): THREE.Vector3 {
    const p = this.rpx(q);
    return pxv(p.x, p.y, z);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- flagged assumption: s0, again at s27
    const flagVis = c.p(0, 0.6) * (1 - c.p(1, 0.6)) + c.p(27, 0.6) * (1 - c.p(28, 0.6));
    this.flag.setContent(this.flagTex(t >= c.s(27)));
    const pulse = t < c.s(1) ? 0.75 + 0.25 * Math.cos((t - c.s(0)) * 5) : 1;
    this.flag.set({ opacity: flagVis * pulse });

    // ---- panels: s1–s10 (dimmed during the cube root inset)
    const panel = c.p(1, 0.6) * (1 - c.p(11, 0.6));
    this.uEdge.setOpacity(panel);
    this.vEdge.setOpacity(panel);
    this.vFill.setOpacity(0.1 * panel);
    this.xDot.setOpacity(panel);
    this.yDot.setOpacity(panel);
    this.panelLabels.forEach((h) => h.set({ opacity: panel }));
    const shrink = t < c.s(10) ? 1 : Math.pow(0.5, 3 * c.over(10, 0.1, 0.9));
    const k: V2 = [K0[0] * shrink, K0[1] * shrink];
    const xh = RudinExample.inverse([Y[0] + k[0], Y[1] + k[1]]);
    const incVis = panel * c.p(1, 0.6, 1.5);
    this.kArrow.set(this.rp(Y, 0.02), this.rp([Y[0] + k[0], Y[1] + k[1]], 0.02));
    this.kArrow.setOpacity(incVis);
    this.ykDot.setPosition(this.rp([Y[0] + k[0], Y[1] + k[1]], 0.03));
    this.ykDot.setOpacity(incVis);
    const hVis = panel * c.p(2, 0.6);
    this.hArrow.set(this.lp(this.X, 0.02), this.lp(xh, 0.02));
    this.hArrow.setOpacity(hVis);
    this.xhDot.setPosition(this.lp(xh, 0.03));
    this.xhDot.setOpacity(hVis);
    const kp = this.rpx([Y[0] + k[0] / 2, Y[1] + k[1] / 2]);
    const hp = this.lpx([(this.X[0] + xh[0]) / 2, (this.X[1] + xh[1]) / 2]);
    this.movLabels[0].set({ x: hp.x - 16, y: hp.y - 20, opacity: hVis });
    this.movLabels[1].set({ x: kp.x - 16, y: kp.y - 20, opacity: incVis });
    const kn = Math.hypot(k[0], k[1]);
    const xp = this.lpx(this.X);
    const circVis = panel * c.p(9, 0.6);
    this.boundCircle.setPoints(circlePts(xp.x, xp.y, (kn / RudinExample.LAMBDA) * L.s));
    this.boundCircle.setOpacity(circVis);
    this.movLabels[2].set({ x: xp.x + (kn / RudinExample.LAMBDA) * L.s * 0.75 + 30, y: xp.y + (kn / RudinExample.LAMBDA) * L.s * 0.7, opacity: circVis * (shrink > 0.3 ? 1 : 0) });
    this.top.set({ opacity: c.p(5, 0.6) * (1 - c.p(11, 0.6)) });
    const chAt = [6, 7, 8, 9];
    this.chain.forEach((h, i) => {
      const replaced = i === 1 ? 1 - c.p(8, 0.4) : 1;
      h.set({ opacity: c.p(chAt[i], 0.5) * (1 - c.p(11, 0.6)) * replaced });
    });

    // ---- cube root inset: s11–s12
    const root = c.p(11, 0.6) * (1 - c.p(13, 0.6));
    this.rootAxes.setOpacity(root);
    this.rootCurve.setOpacity(root);
    this.rootMarks.forEach((m, i) => m.setOpacity(root * c.p(11, 0.5, 1.0 + 1.0 * i)));
    this.rootTable.set({ opacity: root * c.p(11, 0.6, 1.0) });
    this.rootNote.set({ opacity: c.p(12, 0.6) * (1 - c.p(13, 0.6)) });

    // ---- algebra list: s13–s20
    const listAt = [13, 14, 15, 16, 17, 18, 19, 20];
    this.list.forEach((h, i) => h.set({ opacity: c.p(listAt[i], 0.6) * (1 - c.p(21, 0.6)) }));

    // ---- estimate and chart: s21–s26
    const estOut = 1 - c.p(28, 0.6);
    const esAt = [21, 22, 23, 24];
    this.estimate.forEach((h, i) => h.set({ opacity: c.p(esAt[i], 0.6) * estOut }));
    this.derivBox.set({ opacity: c.p(25, 0.6) * estOut });
    const chartVis = c.p(26, 0.6) * estOut;
    this.chartAxes.setOpacity(chartVis);
    this.chartCurve.setOpacity(chartVis);
    this.chartCurve.setProgress(c.over(26, 0.1, 0.9));

    // ---- C¹ and C^k: s28–s34
    const compVis = c.p(28, 0.6) * (1 - c.p(37, 0.6));
    this.compChain.set({ opacity: compVis });
    const clAt = [29, 29, 30];
    this.compLabels.forEach((h, i) => h.set({ opacity: c.p(clAt[i], 0.5, i === 1 ? 1.5 : 0) * (1 - c.p(37, 0.6)) }));
    this.c1Line.set({ opacity: c.p(31, 0.6) * (1 - c.p(37, 0.6)) });
    const spAt = [32, 32, 33, 34];
    this.supp.forEach((h, i) => h.set({ opacity: c.p(spAt[i], 0.6, i === 1 ? 1.0 : 0) * (1 - c.p(37, 0.6)) }));
    this.remarks.forEach((h, i) => h.set({ opacity: c.p(35 + i, 0.6) * (1 - c.p(37, 0.6)) }));
    this.theorem.set({ opacity: c.p(37, 0.8, 0.4) });

    this.ledger.update(t, 1, true);
    this.road.update(c.p(0, 0.8, -0.8), 0);
  }

  teardown(_layers: SceneLayers): void {}
}
