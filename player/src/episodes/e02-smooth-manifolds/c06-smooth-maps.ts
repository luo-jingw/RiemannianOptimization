import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { flash } from "./lib/Flash";
import { LabelPlacer } from "./lib/LabelPlacer";
import { PixelFrame } from "./lib/PixelFrame";
import { Shapes } from "./lib/Shapes";
import { Tex } from "./lib/Tex";

/**
 * E02 c06 — smooth maps between manifolds: the coordinate representation F̂ = ψ∘F∘φ⁻¹, the proof that
 * smoothness does not depend on the chosen charts (ledger), where compatibility and continuity are used,
 * and the height function on S¹ in two charts.
 * Default view (0, 0, 9); positions in pixels through PixelFrame.
 * Sentence indices refer to content/episodes/e02-smooth-manifolds/story.en.json, scene c06-smooth-maps.
 */

const W = PixelFrame.world;
const PLANE_Y = 640;
const PLANE_X = { phiP: 200, phi: 480, psi: 920, psiP: 1200 };
const CIRC = PixelFrame.frame(380, 400, 170);
const GA = PixelFrame.frame(930, 610, 140);      // F̂(x) = √(1 − x²) in the chart φ₊
const GB = PixelFrame.frame(1250, 610, 140);     // F̂(y) = y in the chart φ_r

interface Area {
  region: Region;
  line: Polyline;
}

export class SmoothMapsScene implements Scene {
  readonly id = "c06-smooth-maps";
  private placer!: LabelPlacer;

  private mBlob!: Area;
  private nBlob!: Area;
  private uSet!: Area;
  private vSet!: Area;
  private uPrime!: Area;
  private vPrime!: Area;
  private wSet!: Area;
  private wImage!: Area;
  private pDot!: Dot;
  private fpDot!: Dot;
  private planes: Record<string, Area> = {};
  private setLabels: { h: FormulaHandle; at: THREE.Vector3; from: number }[] = [];
  private arrowF!: CurvedArrow;
  private arrowPhi!: CurvedArrow;
  private arrowPsi!: CurvedArrow;
  private arrowPhiP!: CurvedArrow;
  private arrowPsiP!: CurvedArrow;
  private arrowLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private fHat!: Arrow;
  private fHatLabel!: FormulaHandle;
  private trans1!: Arrow;
  private trans2!: Arrow;
  private transLabels: FormulaHandle[] = [];
  private longArrow!: CurvedArrow;
  private longLabel!: FormulaHandle;
  private checks: FormulaHandle[] = [];
  private top!: FormulaHandle;
  private split!: FormulaHandle;
  private conclusion!: FormulaHandle;
  private brokenLabel!: FormulaHandle;
  private notOpen!: FormulaHandle;
  private ledger!: ProofLedger;

  private circle!: Polyline;
  private overlapArc!: Polyline;
  private heightAxis!: Arrow;
  private heightLabel!: FormulaHandle;
  private hp!: Dot;
  private hLine!: Polyline;
  private hDot!: Dot;
  private gaAxes: Arrow[] = [];
  private gbAxes: Arrow[] = [];
  private gaCurve!: Polyline;
  private gbCurve!: Polyline;
  private gaDot!: Dot;
  private gbDot!: Dot;
  private gLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private finalNote!: FormulaHandle;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.placer = new LabelPlacer(stage);
    stage.setView2D(0, 0, 9);

    const area = (pts: THREE.Vector3[], color: string, op = 0.14, dashed = false): Area => ({
      region: new Region(stage, pts, color, op),
      line: new Polyline(stage, pts, { color, width: 2.5, dashed, dashSize: 0.1, gapSize: 0.07 }),
    });
    const blobPx = (px: number, py: number, rx: number, ry: number, ph: number): THREE.Vector3[] => {
      const c = W(px, py);
      return Shapes.blob(c.x, c.y, rx / 120, ry / 120, ph);
    };
    this.mBlob = area(blobPx(340, 300, 230, 140, 0.5), Palette.blue, 0.08);
    this.nBlob = area(blobPx(1060, 300, 230, 140, 2.0), Palette.blue, 0.08);
    this.uSet = area(blobPx(380, 300, 100, 70, 1.1), Palette.teal, 0.16, true);
    this.vSet = area(blobPx(1020, 300, 100, 70, 3.0), Palette.pink, 0.16, true);
    this.uPrime = area(blobPx(300, 320, 95, 70, 4.0), Palette.purple, 0.16, true);
    this.vPrime = area(blobPx(1100, 320, 95, 70, 5.0), Palette.orange, 0.16, true);
    this.wSet = area(blobPx(340, 312, 38, 28, 0.2), Palette.yellow, 0.35);
    this.pDot = new Dot(stage, W(340, 312), Palette.orange, 0.06);
    this.fpDot = new Dot(stage, W(1060, 312), Palette.orange, 0.06);
    const sq = (px: number): THREE.Vector3[] => [W(px - 90, PLANE_Y - 65), W(px + 90, PLANE_Y - 65), W(px + 90, PLANE_Y + 65), W(px - 90, PLANE_Y + 65), W(px - 90, PLANE_Y - 65)];
    this.planes = {
      phiP: area(sq(PLANE_X.phiP), Palette.purple, 0.1),
      phi: area(sq(PLANE_X.phi), Palette.teal, 0.1),
      psi: area(sq(PLANE_X.psi), Palette.pink, 0.1),
      psiP: area(sq(PLANE_X.psiP), Palette.orange, 0.1),
    };
    this.wImage = area(blobPx(PLANE_X.phiP, PLANE_Y, 40, 30, 1.7), Palette.yellow, 0.35);
    const sl = (tex: string, px: number, py: number, color: string, from: number): { h: FormulaHandle; at: THREE.Vector3; from: number } =>
      ({ h: fl.add({ tex, x: 0, y: 0, size: 30, color }), at: W(px, py), from });
    this.setLabels = [
      sl("M", 140, 190, Palette.blue, 0), sl("N", 1260, 190, Palette.blue, 0),
      sl("U", 470, 255, Palette.teal, 0), sl("V", 930, 255, Palette.pink, 0),
      sl("U'", 205, 270, Palette.purple, 1), sl("V'", 1195, 270, Palette.orange, 1),
      sl("\\varphi(U)", PLANE_X.phi, PLANE_Y + 90, Palette.teal, 0), sl("\\psi(V)", PLANE_X.psi, PLANE_Y + 90, Palette.pink, 0),
      sl("\\varphi'(U')", PLANE_X.phiP, PLANE_Y + 90, Palette.purple, 1), sl("\\psi'(V')", PLANE_X.psiP, PLANE_Y + 90, Palette.orange, 1),
      sl("W", 340, 360, Palette.yellow, 2), sl("\\varphi'(W)", PLANE_X.phiP, PLANE_Y - 40, Palette.yellow, 2),
    ];
    this.arrowF = new CurvedArrow(stage, W(560, 250), W(840, 250), 0.45, Palette.text, 3);
    this.arrowPhi = new CurvedArrow(stage, W(420, 380), W(470, 565), -0.15, Palette.teal, 2.5);
    this.arrowPsi = new CurvedArrow(stage, W(980, 380), W(930, 565), 0.15, Palette.pink, 2.5);
    this.arrowPhiP = new CurvedArrow(stage, W(280, 385), W(215, 565), 0.15, Palette.purple, 2.5);
    this.arrowPsiP = new CurvedArrow(stage, W(1120, 385), W(1185, 565), -0.15, Palette.orange, 2.5);
    this.arrowLabels = [
      { h: fl.add({ tex: "F", x: 0, y: 0, size: 34 }), at: W(700, 175) },
      { h: fl.add({ tex: "\\varphi", x: 0, y: 0, size: 30, color: Palette.teal }), at: W(475, 470) },
      { h: fl.add({ tex: "\\psi", x: 0, y: 0, size: 30, color: Palette.pink }), at: W(925, 470) },
      { h: fl.add({ tex: "\\varphi'", x: 0, y: 0, size: 30, color: Palette.purple }), at: W(215, 470) },
      { h: fl.add({ tex: "\\psi'", x: 0, y: 0, size: 30, color: Palette.orange }), at: W(1185, 470) },
    ];
    this.fHat = new Arrow(stage, W(580, PLANE_Y), W(820, PLANE_Y), Palette.green, { width: 3.5, headLength: 0.16 });
    this.fHatLabel = fl.add({ tex: "\\hat F=\\psi\\circ F\\circ\\varphi^{-1}", x: 700, y: PLANE_Y - 28, size: 28, color: Palette.green });
    this.trans1 = new Arrow(stage, W(300, PLANE_Y + 20), W(380, PLANE_Y + 20), Palette.blue, { width: 3.5, headLength: 0.14 });
    this.trans2 = new Arrow(stage, W(1020, PLANE_Y + 20), W(1100, PLANE_Y + 20), Palette.blue, { width: 3.5, headLength: 0.14 });
    this.transLabels = [
      fl.add({ tex: "\\varphi\\circ\\varphi'^{-1}", x: 340, y: PLANE_Y + 52, size: 24, color: Palette.blue }),
      fl.add({ tex: "\\psi'\\circ\\psi^{-1}", x: 1060, y: PLANE_Y + 52, size: 24, color: Palette.blue }),
    ];
    this.longArrow = new CurvedArrow(stage, W(PLANE_X.phiP, PLANE_Y + 108), W(PLANE_X.psiP, PLANE_Y + 108), -0.35, Palette.yellow, 2.5);
    this.longLabel = fl.add({ tex: "\\psi'\\circ F\\circ\\varphi'^{-1}", x: 700, y: 828, size: 28, color: Palette.yellow });
    this.checks = [
      fl.add({ tex: `${Tex.c(Palette.green, "\\checkmark")}\\ \\text{compatibility}`, x: 340, y: PLANE_Y - 100, size: 24 }),
      fl.add({ tex: `${Tex.c(Palette.green, "\\checkmark")}\\ \\text{assumption}`, x: 700, y: PLANE_Y - 70, size: 24 }),
      fl.add({ tex: `${Tex.c(Palette.green, "\\checkmark")}\\ \\text{compatibility}`, x: 1060, y: PLANE_Y - 100, size: 24 }),
    ];
    this.top = fl.add({ tex: "\\,", x: 700, y: 95, size: 32 });
    this.split = fl.add({ tex: "\\,", x: 700, y: 95, size: 30 });
    this.conclusion = fl.add({ tex: "\\text{smoothness is chart-independent}", x: 700, y: 95, size: 34, color: Palette.green, boxed: true });
    this.brokenLabel = fl.add({ tex: "\\mathrm{id}\\circ\\kappa^{-1}(u)=\\sqrt[3]{u}\\ \\ \\text{not } C^\\infty", x: 340, y: 790, size: 26, color: Palette.red });
    this.notOpen = fl.add({ tex: "F\\ \\text{discontinuous}:\\ F^{-1}(V\\cap V')\\ \\text{may not be open}", x: 700, y: 95, size: 32, color: Palette.red });
    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "W\\ \\text{open},\\ \\ p\\in W", at: cue.in(12, 0.8) },
      { label: "2", tex: "\\psi' F\\varphi'^{-1}=(\\psi'\\psi^{-1})\\,\\hat F\\,(\\varphi\\varphi'^{-1})", at: cue.in(17, 0.8) },
      { label: "3", tex: "\\text{each factor } C^\\infty", at: cue.in(21, 0.8) },
      { label: "4", tex: "C^\\infty\\circ C^\\infty=C^\\infty\\ \\ \\blacksquare", at: cue.in(22, 0.8) },
      { label: "Cor", tex: "G\\circ F\\ \\text{smooth}", at: cue.in(25, 0.8) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }, "Chart independence");

    // ---- Height function on S¹
    this.circle = new Polyline(stage, Shapes.arc(0, 0, 1, 0, 2 * Math.PI, 160).map((v) => CIRC(v.x, v.y)), { color: Palette.blue, width: 3 });
    this.overlapArc = new Polyline(stage, Shapes.arc(0, 0, 1.06, 0.03, Math.PI / 2 - 0.03, 50).map((v) => CIRC(v.x, v.y)), { color: Palette.yellow, width: 6 });
    this.heightAxis = new Arrow(stage, CIRC(1.6, -1.25), CIRC(1.6, 1.3), Palette.axis, { width: 2.5, headLength: 0.16 });
    this.heightLabel = fl.add({ tex: "\\mathbb{R}\\ (\\mathrm{id})", x: 0, y: 0, size: 28, color: Palette.muted });
    this.hp = new Dot(stage, CIRC(0.6, 0.8), Palette.orange, 0.08);
    this.hLine = new Polyline(stage, [CIRC(0.6, 0.8), CIRC(1.6, 0.8)], { color: Palette.orange, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.hDot = new Dot(stage, CIRC(1.6, 0.8), Palette.orange, 0.07);
    const ax = (g: (x: number, y: number) => THREE.Vector3): Arrow[] => [
      new Arrow(stage, g(-1.15, 0), g(1.2, 0), Palette.axis, { width: 2.5, headLength: 0.14 }),
      new Arrow(stage, g(0, -1.1), g(0, 1.25), Palette.axis, { width: 2.5, headLength: 0.14 }),
    ];
    this.gaAxes = ax(GA);
    this.gbAxes = ax(GB);
    this.gaCurve = new Polyline(stage, sampleCurve((x) => GA(x, Math.sqrt(1 - x * x)), -0.995, 0.995, 160), { color: Palette.teal, width: 4 });
    this.gbCurve = new Polyline(stage, [GB(-0.98, -0.98), GB(0.98, 0.98)], { color: Palette.pink, width: 4 });
    this.gaDot = new Dot(stage, GA(0.6, 0.8), Palette.orange, 0.07);
    this.gbDot = new Dot(stage, GB(0.8, 0.8), Palette.orange, 0.07);
    this.gLabels = [
      { h: fl.add({ tex: "\\varphi_+:\\ \\hat F(x)=\\sqrt{1-x^2}", x: 0, y: 0, size: 28, color: Palette.teal }), at: GA(0, 1.5) },
      { h: fl.add({ tex: "\\varphi_r:\\ \\hat F(y)=y", x: 0, y: 0, size: 28, color: Palette.pink }), at: GB(0, 1.5) },
      { h: fl.add({ text: "smooth", x: 0, y: 0, size: 28, color: Palette.green }), at: GA(0, -1.4) },
      { h: fl.add({ text: "smooth", x: 0, y: 0, size: 28, color: Palette.green }), at: GB(0, -1.4) },
    ];
    this.finalNote = fl.add({ tex: "\\text{objective } f:M\\to\\mathbb{R}\\ \\text{smooth}\\ \\iff\\ \\text{every coordinate representation is } C^\\infty", x: 960, y: 100, size: 34, boxed: true });
  }

  private areaOpacity(a: Area, o: number, fill = 0.14): void {
    a.region.setOpacity(fill * o);
    a.line.setOpacity(o);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---------- Diagram (s1–s32)
    const dOn = c.p(1, 0.8) * (1 - c.p(33, 0.7));
    this.areaOpacity(this.mBlob, dOn * c.p(2, 0.6), 0.08);
    this.areaOpacity(this.nBlob, dOn * c.p(2, 0.6), 0.08);
    const uvOn = dOn * c.p(3, 0.6);
    this.areaOpacity(this.uSet, uvOn, 0.16);
    this.areaOpacity(this.vSet, uvOn, 0.16);
    this.pDot.setOpacity(uvOn);
    this.fpDot.setOpacity(uvOn);
    const primeOn = dOn * c.p(10, 0.7);
    this.areaOpacity(this.uPrime, primeOn, 0.16);
    this.areaOpacity(this.vPrime, primeOn, 0.16);
    const wBad = t >= c.s(31) && t < c.s(33);
    const wOn = dOn * c.p(11, 0.6);
    this.areaOpacity(this.wSet, wOn * (wBad ? flash(t, c.s(31), 0.8, 0.3) : 1), 0.35);
    this.wSet.line.setColor(wBad ? Palette.red : Palette.yellow);
    this.wSet.region.setColor(wBad ? Palette.red : Palette.yellow);
    this.areaOpacity(this.wImage, dOn * c.p(13, 0.6), 0.35);
    this.areaOpacity(this.planes.phi, dOn * c.p(4, 0.6), 0.1);
    this.areaOpacity(this.planes.psi, dOn * c.p(4, 0.6), 0.1);
    this.areaOpacity(this.planes.phiP, primeOn, 0.1);
    this.areaOpacity(this.planes.psiP, primeOn, 0.1);
    const labelFrom = [c.p(2, 0.6), primeOn > 0 ? c.p(10, 0.7) : 0, c.p(11, 0.6)];
    this.setLabels.forEach((l, i) => {
      const base = l.from === 0 ? (i < 2 ? c.p(2, 0.6) : i < 6 ? c.p(3, 0.6) : c.p(4, 0.6)) : labelFrom[l.from];
      const extra = i === 11 ? c.p(13, 0.6) : 1;
      this.placer.place(l.h, l.at, 0, 0, dOn * base * extra);
    });
    this.arrowF.setProgress(c.p(2, 1.0, 1.5), dOn);
    this.arrowPhi.setProgress(c.p(3, 0.8, 1.0), dOn);
    this.arrowPsi.setProgress(c.p(3, 0.8, 2.0), dOn);
    this.arrowPhiP.setProgress(c.p(10, 0.8, 0.5), dOn);
    this.arrowPsiP.setProgress(c.p(10, 0.8, 2.0), dOn);
    const alOps = [c.p(2, 0.6, 1.5), c.p(3, 0.6, 1.0), c.p(3, 0.6, 2.0), c.p(10, 0.6, 0.5), c.p(10, 0.6, 2.0)];
    this.arrowLabels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, dOn * alOps[i]));
    const fHatOn = dOn * c.p(4, 0.8, 2.0);
    this.fHat.setOpacity(fHatOn);
    this.fHatLabel.set({ opacity: fHatOn });
    const transOn = dOn * c.p(17, 0.7, 1.0);
    const broken = t >= c.s(28) && t < c.s(31);
    this.trans1.setOpacity(transOn * (broken ? flash(t, c.s(28), 0.8, 0.35) : 1));
    this.trans1.setColor(broken ? Palette.red : Palette.blue);
    this.trans2.setOpacity(transOn);
    this.transLabels.forEach((h, i) => h.set({ opacity: transOn * (i === 0 && broken ? 0 : 1) }));
    const longOn = dOn * c.p(14, 0.6) * (1 - 0.6 * c.p(18, 0.6)) * (t >= c.s(28) && t < c.s(31) ? 0 : 1);
    this.longArrow.setProgress(c.p(14, 1.0, 0.3), longOn);
    this.longLabel.set({ opacity: longOn });
    const checkAt = [19, 20, 21];
    this.checks.forEach((h, i) => h.set({ opacity: dOn * c.p(checkAt[i], 0.5, 0.6) * (i === 0 && broken ? 0 : 1) }));
    this.brokenLabel.set({ opacity: broken ? dOn * c.p(28, 0.5) : 0 });

    // Top band
    let topTex = "\\,";
    let topOn = 0;
    if (t >= c.s(2) && t < c.s(5)) {
      topTex = Tex.reveal(["F:M\\to N\\ \\text{continuous};\\ \\ ", "F(U)\\subseteq V,\\ \\ \\hat F=\\psi\\circ F\\circ\\varphi^{-1}:\\varphi(U)\\to\\psi(V)\\ \\ C^\\infty"], t >= c.s(3) ? 2 : 1);
      topOn = c.p(2, 0.6) * (1 - c.p(5, 0.4, -0.4));
    } else if (t >= c.s(5) && t < c.s(7)) {
      topTex = "U\\ \\leadsto\\ U\\cap F^{-1}(V)\\quad\\text{open, since } F\\ \\text{is continuous}";
      topOn = c.p(5, 0.6) * (1 - c.p(7, 0.4, -0.4));
    } else if (t >= c.s(7) && t < c.s(11)) {
      topTex = "\\text{another pair } (U',\\varphi'),\\ (V',\\psi')\\ :\\ \\ \\text{is } \\psi'\\circ F\\circ\\varphi'^{-1}\\ \\text{smooth too?}";
      topOn = c.p(7, 0.6) * (1 - c.p(11, 0.4, -0.4));
    } else if (t >= c.s(24) && t < c.s(26)) {
      topTex = "\\widehat{G\\circ F}=(\\chi\\circ G\\circ\\psi^{-1})\\circ(\\psi\\circ F\\circ\\varphi^{-1})";
      topOn = c.p(24, 0.6) * (1 - c.p(26, 0.4, -0.4));
    }
    this.top.setContent(topTex);
    this.top.set({ opacity: topOn });
    const splitParts = [
      "\\psi'\\circ F\\circ\\varphi'^{-1}",
      "=\\psi'\\circ\\psi^{-1}\\circ\\psi\\circ F\\circ\\varphi^{-1}\\circ\\varphi\\circ\\varphi'^{-1}",
      `=${Tex.c(Palette.blue, "(\\psi'\\circ\\psi^{-1})")}\\circ${Tex.c(Palette.green, "\\hat F")}\\circ${Tex.c(Palette.blue, "(\\varphi\\circ\\varphi'^{-1})")}`,
    ];
    const splitN = t >= c.s(17) ? 3 : t >= c.s(15) ? 2 : 1;
    this.split.setContent(`\\begin{aligned}&${Tex.reveal(splitParts.slice(0, 2), splitN)}\\\\ &\\phantom{\\psi'\\circ F\\circ\\varphi'^{-1}}${splitN >= 3 ? splitParts[2] : `\\phantom{${splitParts[2]}}`}\\end{aligned}`);
    this.split.set({ opacity: c.p(14, 0.6) * (1 - c.p(23, 0.5)) });
    this.conclusion.set({ opacity: c.p(23, 0.6) * (1 - c.p(24, 0.4)) });
    this.notOpen.set({ opacity: c.p(31, 0.6) * (1 - c.p(33, 0.5)) });
    const ledgerOn = 1 - c.p(33, 0.6);
    this.ledger.update(t, ledgerOn * (t >= c.s(27) && t < c.s(33) ? 0.45 : 1), t < c.s(26));

    // ---------- Height function (s33–s37)
    const hOn = c.p(33, 0.8, 0.4);
    this.circle.setOpacity(hOn);
    this.overlapArc.setOpacity(hOn * c.p(34, 0.6));
    this.heightAxis.setOpacity(hOn);
    this.placer.place(this.heightLabel, CIRC(1.6, 1.42), 0, 0, hOn);
    const th = lerp(0.35, 1.25, 0.5 + 0.5 * Math.sin(Math.max(0, t - c.s(34)) * 2 * Math.PI / 9 - Math.PI / 2));
    const x = Math.cos(th);
    const y = Math.sin(th);
    this.hp.setPosition(CIRC(x, y));
    this.hp.setOpacity(hOn);
    this.hLine.setPoints([CIRC(x, y), CIRC(1.6, y)]);
    this.hLine.setOpacity(hOn);
    this.hDot.setPosition(CIRC(1.6, y));
    this.hDot.setOpacity(hOn);
    const aOn = c.p(34, 0.6);
    const bOn = c.p(35, 0.6);
    this.gaAxes.forEach((a) => a.setOpacity(aOn));
    this.gbAxes.forEach((a) => a.setOpacity(bOn));
    this.gaCurve.setOpacity(aOn);
    this.gbCurve.setOpacity(bOn);
    this.gaDot.setPosition(GA(x, y));
    this.gbDot.setPosition(GB(y, y));
    this.gaDot.setOpacity(aOn);
    this.gbDot.setOpacity(bOn);
    const gOps = [aOn, bOn, aOn * c.p(34, 0.5, 3.0), bOn * c.p(35, 0.5, 3.0)];
    this.gLabels.forEach((l, i) => this.placer.place(l.h, l.at, 0, 0, gOps[i] * (i >= 2 && t >= c.s(36) ? flash(t, c.s(36), 1.0, 0.5) : 1)));
    this.finalNote.set({ opacity: c.p(37, 0.6) });
  }

  teardown(_layers: SceneLayers): void {}
}
