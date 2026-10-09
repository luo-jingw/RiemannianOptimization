import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { PixelSpace } from "./lib/PixelSpace";
import { tc } from "./lib/tex";

/**
 * E01 c08 — f: [0, 2π) → S¹, f(t) = (cos t, sin t), is a continuous bijection whose inverse is not continuous.
 * Circle: center (330, 380) px, radius 180. Domain segment: t ↦ x = 130 + 175 t at y = 740.
 * Coordinates are output pixels (PixelSpace). Sentence indices refer to story.en.json, scene c08-continuous-inverse.
 */

const C = { x: 330, y: 380, r: 180 };
const SEG_Y = 740;
const TAU = 2 * Math.PI;
const sx = (t: number): number => 130 + 175 * t;
const circ = (a: number, r = C.r): THREE.Vector3 => PixelSpace.p(C.x + r * Math.cos(a), C.y - r * Math.sin(a));
const segP = (t: number): THREE.Vector3 => PixelSpace.p(sx(t), SEG_Y);
const N_STRIP = 72;
const K_PTS = 12;

function hue(t: number): string {
  const col = new THREE.Color();
  col.setHSL((t / TAU) * 0.85, 0.7, 0.6);
  return `#${col.getHexString()}`;
}

export class ContinuousInverseScene implements Scene {
  readonly id = "c08-continuous-inverse";
  private stage!: StageLayer;

  private segStrip: Polyline[] = [];
  private bendStrip: Polyline[] = [];
  private segStart!: Dot;
  private segEnd!: Dot;
  private segLabels: FormulaHandle[] = [];
  private circStart!: Dot;
  private circEnd!: Dot;
  private circLabels: FormulaHandle[] = [];
  private fFormula!: FormulaHandle;
  private topoNote!: FormulaHandle;
  private proof!: FormulaHandle;

  private pk: Dot[] = [];
  private pkLabel!: FormulaHandle;
  private distFormula!: FormulaHandle;
  private target!: Dot;
  private targetBack!: Dot;
  private gapArrow!: Arrow;
  private gapArrowBack!: Arrow;
  private gapLabel!: FormulaHandle;
  private backNote!: FormulaHandle;
  private contra!: FormulaHandle;

  private openBar!: Polyline;
  private openBarEnds: Dot[] = [];
  private imageArc!: Polyline;
  private probe!: Polyline;
  private probeArcIn!: Polyline;
  private probeArcOut!: Polyline;
  private openFormula!: FormulaHandle;
  private openNote!: FormulaHandle;
  private ch7Note!: FormulaHandle;
  private dropNote!: FormulaHandle;
  private intuition!: FormulaHandle;

  private aDot!: Dot;
  private bDot!: Dot;
  private aSeg!: Dot;
  private bSeg!: Dot;
  private abLabels: FormulaHandle[] = [];
  private stepCircle!: Polyline;
  private stepSeg!: Arrow;
  private nearFar: FormulaHandle[] = [];
  private chartNote!: FormulaHandle;
  private openStatement!: FormulaHandle;
  private arc1!: Polyline;
  private arc2!: Polyline;
  private twoCharts!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const P = PixelSpace.p;

    for (let i = 0; i < N_STRIP; i++) {
      const t0 = (i / N_STRIP) * TAU;
      const t1 = ((i + 1) / N_STRIP) * TAU;
      this.segStrip.push(new Polyline(stage, [segP(t0), segP(t1)], { color: hue(t0), width: 7 }));
      this.bendStrip.push(new Polyline(stage, [segP(t0), segP((t0 + t1) / 2), segP(t1)], { color: hue(t0), width: 7 }));
    }
    this.segStart = new Dot(stage, segP(0), hue(0), 0.09);
    this.segEnd = new Dot(stage, segP(TAU), hue(TAU * 0.999), 0.09, "2d", true);
    this.segLabels = [
      fl.add({ tex: "0", x: sx(0), y: SEG_Y + 38, size: 30, color: Palette.muted }),
      fl.add({ tex: "\\pi", x: sx(Math.PI), y: SEG_Y + 38, size: 30, color: Palette.muted }),
      fl.add({ tex: "2\\pi", x: sx(TAU), y: SEG_Y + 38, size: 30, color: Palette.muted }),
      fl.add({ tex: "[0,2\\pi)", x: sx(TAU) + 90, y: SEG_Y, size: 32, color: Palette.text }),
    ];
    this.circStart = new Dot(stage, circ(0), hue(0), 0.09);
    this.circEnd = new Dot(stage, circ(0), hue(TAU * 0.999), 0.14, "2d", true);
    this.circLabels = [
      fl.add({ tex: "t=0", x: C.x + C.r + 50, y: C.y - 30, size: 30, color: Palette.text }),
      fl.add({ tex: "t\\to 2\\pi", x: C.x + C.r + 62, y: C.y + 30, size: 30, color: Palette.text }),
      fl.add({ tex: "S^1", x: C.x - C.r - 30, y: C.y - C.r + 10, size: 36, color: Palette.text }),
    ];
    this.fFormula = fl.add({ tex: "f(t)=(\\cos t,\\ \\sin t)", x: 1000, y: 140, size: 40 });
    this.topoNote = fl.add({ tex: "[0,2\\pi)\\subseteq\\mathbb{R},\\quad S^1\\subseteq\\mathbb{R}^2:\\ \\text{subspace topologies}", x: 1000, y: 210, size: 30, color: Palette.muted });
    this.proof = fl.add({ tex: this.proofTex(0), x: 1000, y: 410, size: 30, display: true });

    for (let k = 1; k <= K_PTS; k++) this.pk.push(new Dot(stage, circ(TAU - 1 / k), Palette.orange, 0.06));
    this.pkLabel = fl.add({ tex: "p_k=f\\!\\left(2\\pi-\\tfrac1k\\right)", x: C.x + C.r + 120, y: C.y + 120, size: 32, color: Palette.orange, align: "left" });
    this.distFormula = fl.add({ tex: "\\|p_k-(1,0)\\|^2=2-2\\cos\\tfrac1k\\ \\to\\ 0", x: 1000, y: 230, size: 34 });
    this.target = new Dot(stage, circ(0), Palette.yellow, 0.09);
    this.targetBack = new Dot(stage, circ(0), Palette.yellow, 0.09);
    this.gapArrow = new Arrow(stage, segP(0.1), segP(TAU - 1.05), Palette.red, { width: 4, headLength: 0.18 });
    this.gapArrowBack = new Arrow(stage, segP(TAU - 1.05), segP(0.1), Palette.red, { width: 4, headLength: 0.18 });
    this.gapLabel = fl.add({ tex: "|f^{-1}(p_k)-0|>\\pi", x: sx(Math.PI) - 30, y: SEG_Y - 46, size: 32, color: Palette.red });
    this.backNote = fl.add({ tex: `p_k\\to(1,0)\\quad\\text{but}\\quad f^{-1}(p_k)=2\\pi-\\tfrac1k\\ ${tc(Palette.red, "\\not\\to")}\\ 0=f^{-1}(1,0)`, x: 1000, y: 300, size: 30 });
    this.contra = fl.add({ tex: `f^{-1}\\ \\text{continuous}\\Rightarrow f^{-1}(p_k)\\to f^{-1}(1,0)\\ \\ (\\text{ch. 5})\\quad ${tc(Palette.red, "\\text{contradiction}")}`, x: 1000, y: 380, size: 26 });

    this.openBar = new Polyline(stage, [segP(0), segP(1)], { color: Palette.blue, width: 14 });
    this.openBarEnds = [new Dot(stage, segP(0), Palette.blue, 0.1), new Dot(stage, segP(1), Palette.blue, 0.1, "2d", true)];
    const arcPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) arcPts.push(circ((i / 40) * 1, C.r));
    this.imageArc = new Polyline(stage, arcPts, { color: Palette.blue, width: 12 });
    this.probe = new Polyline(stage, PixelSpace.circle(C.x + C.r, C.y, 60), { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.probeArcIn = new Polyline(stage, [circ(0), circ(0.1)], { color: Palette.green, width: 6 });
    this.probeArcOut = new Polyline(stage, [circ(0), circ(-0.1)], { color: Palette.red, width: 8 });
    this.openFormula = fl.add({ tex: "[0,1)=(-1,1)\\cap[0,2\\pi)\\ \\ \\text{open in } [0,2\\pi)", x: 1000, y: 230, size: 32, color: Palette.blue });
    this.openNote = fl.add({ tex: `f\\big([0,1)\\big)\\ \\text{misses points just below } (1,0)\\ \\Rightarrow\\ ${tc(Palette.red, "\\text{not open in } S^1")}`, x: 1000, y: 330, size: 28 });
    this.ch7Note = fl.add({ tex: "\\text{chapter 7, step 1: } f(U)=(f^{-1})^{-1}(U)\\ \\text{needs } f^{-1}\\ \\text{continuous}", x: 1000, y: 420, size: 28, color: Palette.yellow });
    this.dropNote = fl.add({ tex: `\\begin{gathered}${tc(Palette.red, "\\text{(iii) cannot be dropped}")}\\\\ \\text{continuous}+\\text{bijective}\\ \\not\\Rightarrow\\ \\text{homeomorphism}\\end{gathered}`, x: 1000, y: 220, size: 32, display: true });
    this.intuition = fl.add({ tex: "[0,2\\pi)\\setminus\\{\\pi\\}:\\ \\text{two pieces};\\quad S^1\\setminus\\{p\\}:\\ \\text{one piece}\\quad(\\text{not proved})", x: 1000, y: 340, size: 25, color: Palette.muted });

    const a = 0.05;
    this.aDot = new Dot(stage, circ(a), Palette.orange, 0.08);
    this.bDot = new Dot(stage, circ(TAU - a), Palette.orange, 0.08);
    this.aSeg = new Dot(stage, segP(a), Palette.orange, 0.08);
    this.bSeg = new Dot(stage, segP(TAU - a), Palette.orange, 0.08);
    this.abLabels = [
      fl.add({ tex: "A", x: C.x + C.r + 30, y: C.y - 38, size: 32, color: Palette.orange }),
      fl.add({ tex: "B", x: C.x + C.r + 30, y: C.y + 38, size: 32, color: Palette.orange }),
      fl.add({ tex: "0.05", x: sx(a) + 10, y: SEG_Y - 40, size: 28, color: Palette.orange }),
      fl.add({ tex: "6.23", x: sx(TAU - a) - 10, y: SEG_Y - 40, size: 28, color: Palette.orange }),
    ];
    this.stepCircle = new Polyline(stage, [circ(a, C.r + 14), circ(0, C.r + 18), circ(-a, C.r + 14)], { color: Palette.green, width: 4 });
    this.stepSeg = new Arrow(stage, segP(a + 0.1), segP(TAU - a - 0.1), Palette.red, { width: 4, headLength: 0.18 });
    this.nearFar = [
      fl.add({ text: "near on S¹", x: C.x + C.r + 120, y: C.y, size: 30, color: Palette.green, align: "left" }),
      fl.add({ text: "far in t: 6.18 apart", x: sx(Math.PI), y: SEG_Y - 50, size: 30, color: Palette.red }),
    ];
    this.chartNote = fl.add({ text: "coordinates must preserve nearness in both directions", x: 1000, y: 230, size: 30, color: Palette.yellow });
    this.openStatement = fl.add({ tex: "\\begin{gathered}f\\big|_{(0,2\\pi)}:(0,2\\pi)\\to S^1\\setminus\\{(1,0)\\}\\ \\text{is a homeomorphism}\\\\ \\text{(stated here; used in E02)}\\end{gathered}", x: 1000, y: 280, size: 30, display: true });
    const arc = (a0: number, a1: number, r: number): THREE.Vector3[] => Array.from({ length: 97 }, (_, i) => circ(lerp(a0, a1, i / 96), r));
    this.arc1 = new Polyline(stage, arc(0.35, TAU - 0.35, C.r - 16), { color: Palette.blue, width: 6 });
    this.arc2 = new Polyline(stage, arc(Math.PI + 0.35, Math.PI + TAU - 0.35, C.r + 16), { color: Palette.green, width: 6 });
    this.twoCharts = fl.add({ text: "two overlapping open arcs = two charts  →  E02", x: 1000, y: 420, size: 30, color: Palette.text });
    void P;

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "f\\ \\text{continuous bijection}", at: cue.in(8, 0.4) },
      { label: "2", tex: "f^{-1}\\ \\text{not continuous}", at: cue.in(15, 0.8) },
      { label: "3", tex: "f([0,1))\\ \\text{not open in } S^1", at: cue.in(20, 0.7) },
      { label: "4", tex: "\\text{(iii) cannot be dropped}", at: cue.in(22, 0.6) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private proofTex(n: number): string {
    const rows = [
      "\\text{continuous: } \\cos,\\ \\sin\\ \\text{continuous}",
      "\\text{injective: } f(s)=f(t)\\Rightarrow s-t\\in 2\\pi\\mathbb{Z}",
      "\\qquad |s-t|<2\\pi\\ \\Rightarrow\\ s=t",
      "\\text{onto: every point has a polar angle } t\\in[0,2\\pi)",
    ];
    return `\\begin{aligned}&${rows.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\[4pt]&")}\\end{aligned}`;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    PixelSpace.apply(this.stage);

    // ---- the strip and its bent copy (whole chapter)
    const segOn = c.p(0, 0.6);
    const bend = c.over(1, 0.15, 0.9);
    const dimSeg = 1 - 0.6 * (c.p(16, 0.5) * (1 - c.p(22, 0.5)));
    this.segStrip.forEach((l) => l.setOpacity(segOn * dimSeg));
    const circleOn = c.p(1, 0.4);
    const dimCircle = 1 - 0.55 * c.p(16, 0.5);
    this.bendStrip.forEach((l, i) => {
      const t0 = (i / N_STRIP) * TAU;
      const t1 = ((i + 1) / N_STRIP) * TAU;
      const tm = (t0 + t1) / 2;
      const m = (tt: number): THREE.Vector3 => segP(tt).lerp(circ(tt), bend);
      l.setPoints([m(t0), m(tm), m(t1 - (i === N_STRIP - 1 ? 0.03 : 0))]);
      l.setOpacity(circleOn * dimCircle);
    });
    this.segStart.setOpacity(segOn);
    this.segEnd.setOpacity(segOn);
    this.segLabels.forEach((l) => l.set({ opacity: segOn }));
    const ends = circleOn * smoothstep(0.9, 1, bend);
    this.circStart.setOpacity(ends);
    this.circEnd.setOpacity(ends);
    this.circStart.setPosition(segP(0).lerp(circ(0), bend));
    this.circEnd.setPosition(segP(TAU).lerp(circ(TAU), bend));
    this.circLabels[0].set({ opacity: ends * (1 - c.p(9, 0.5)) });
    this.circLabels[1].set({ opacity: ends * (1 - c.p(9, 0.5)) });
    this.circLabels[2].set({ opacity: ends });
    this.fFormula.set({ opacity: c.p(1, 0.6) * (1 - c.p(9, 0.5)) });
    this.topoNote.set({ opacity: c.p(3, 0.6) * (1 - c.p(9, 0.5)) });
    const pn = t >= c.s(7) ? 4 : t >= c.s(6) ? 3 : t >= c.s(5) ? 2 : t >= c.s(4) ? 1 : 0;
    this.proof.setContent(this.proofTex(pn));
    this.proof.set({ opacity: pn > 0 ? 1 - c.p(9, 0.5) : 0 });

    // ---- the sequence p_k (s9–s15)
    const seqOn = c.p(9, 0.5) * (1 - c.p(16, 0.5));
    const shown = 1 + (K_PTS - 1) * c.over(10, 0.0, 0.85);
    const back = c.over(12, 0.15, 0.85);
    this.pk.forEach((d, i) => {
      const k = i + 1;
      const tk = TAU - 1 / k;
      const s = smoothstep(0, 1, Math.min(1, Math.max(0, back * 1.3 - (i / K_PTS) * 0.3)));
      const p = circ(tk).lerp(segP(tk), s);
      p.y += (Math.sin(Math.PI * s) * 120) / 100;
      d.setPosition(p);
      d.setOpacity(seqOn * (k <= shown || t >= c.s(11) ? 1 : 0));
    });
    this.pkLabel.set({ opacity: seqOn * (1 - c.p(12, 0.4)) });
    this.distFormula.set({ opacity: seqOn * c.p(11, 0.5) * (1 - c.p(12, 0.4)) });
    this.target.setOpacity(seqOn * c.p(10, 0.5));
    const tb = c.over(13, 0.1, 0.7);
    const tp = circ(0).lerp(segP(0), tb);
    tp.y += (Math.sin(Math.PI * tb) * 120) / 100;
    this.targetBack.setPosition(tp);
    this.targetBack.setOpacity(seqOn * (t >= c.s(13) ? 1 : 0));
    const gap = seqOn * c.p(14, 0.5);
    this.gapArrow.setOpacity(gap);
    this.gapArrowBack.setOpacity(gap);
    this.gapLabel.set({ opacity: gap });
    this.backNote.set({ opacity: seqOn * c.p(12, 0.5, 1.0) });
    this.contra.set({ opacity: seqOn * c.p(15, 0.5) });

    // ---- open-set view (s16–s21)
    const ov = c.p(16, 0.5) * (1 - c.p(22, 0.5));
    this.openBar.setOpacity(ov * c.p(17, 0.5));
    this.openBarEnds.forEach((d) => d.setOpacity(ov * c.p(17, 0.5)));
    this.openFormula.set({ opacity: ov * c.p(17, 0.5) });
    this.imageArc.setOpacity(ov * c.p(18, 0.5));
    const probeOn = ov * c.p(19, 0.5);
    const rho = 70 * Math.pow(25 / 70, c.over(20, 0.05, 0.85));
    this.probe.setPoints(PixelSpace.circle(C.x + C.r, C.y, rho));
    this.probe.setOpacity(probeOn);
    const half = 2 * Math.asin(rho / (2 * C.r));
    const arcIn: THREE.Vector3[] = [];
    const arcOut: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      arcIn.push(circ((half * i) / 16, C.r));
      arcOut.push(circ((-half * i) / 16, C.r));
    }
    this.probeArcIn.setPoints(arcIn);
    this.probeArcOut.setPoints(arcOut);
    this.probeArcIn.setOpacity(probeOn);
    this.probeArcOut.setOpacity(probeOn);
    this.openNote.set({ opacity: ov * c.p(20, 0.5) });
    this.ch7Note.set({ opacity: ov * c.p(21, 0.5) });
    this.dropNote.set({ opacity: c.p(22, 0.5) * (1 - c.p(24, 0.5)) });
    this.intuition.set({ opacity: c.p(23, 0.5) * (1 - c.p(24, 0.5)) });

    // ---- t as a coordinate (s24–s28)
    const co = c.p(24, 0.5) * (1 - c.p(29, 0.5));
    const pts = co * c.p(25, 0.5);
    this.aDot.setOpacity(pts);
    this.bDot.setOpacity(pts);
    this.abLabels[0].set({ opacity: pts });
    this.abLabels[1].set({ opacity: pts });
    const segPts = co * c.p(26, 0.5);
    this.aSeg.setOpacity(segPts);
    this.bSeg.setOpacity(segPts);
    this.abLabels[2].set({ opacity: segPts });
    this.abLabels[3].set({ opacity: segPts });
    this.stepCircle.setOpacity(pts * c.p(25, 0.5, 1.0));
    this.nearFar[0].set({ opacity: pts * c.p(25, 0.5, 1.0) });
    this.stepSeg.setOpacity(co * c.p(27, 0.5));
    this.nearFar[1].set({ opacity: co * c.p(27, 0.5) });
    this.chartNote.set({ opacity: c.p(28, 0.5) * (1 - c.p(29, 0.5)) });

    // ---- statement and two charts (s29–s30)
    this.openStatement.set({ opacity: c.p(29, 0.5) });
    this.arc1.setOpacity(c.p(30, 0.6));
    this.arc2.setOpacity(c.p(30, 0.6, 1.0));
    this.twoCharts.set({ opacity: c.p(30, 0.6, 1.8) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
