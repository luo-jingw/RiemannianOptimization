import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { clamp01 } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { RoadSign } from "./lib/RoadSign";
import { RudinExample } from "./lib/RudinExample";
import { Tex } from "./lib/Tex";

/**
 * E03 c08 — proof part (a), second half: V = f(U) is open.
 * Example: RudinExample (A = I, λ = ½, U = unit ball), p = (0.35, −0.2), r = 0.45, y = y₀ + (0.14, 0.10).
 * Sentence indices refer to story.en.json, scene c08-ift-proof-open.
 */

const L = { x: 360, y: 480, s: 230 };
const R = { x: 980, y: 480, s: 230 };
const P: [number, number] = [0.35, -0.2];
const RAD = 0.45;
const LAMBDA = RudinExample.LAMBDA;
const Y0 = RudinExample.f(P[0], P[1]);
const Y: [number, number] = [Y0[0] + 0.14, Y0[1] + 0.1];
const N_BOUNDARY = 16;
const N_ITER = 7;
const EXTRA_P: [number, number][] = [[-0.4, 0.3], [0.1, 0.6], [-0.25, -0.55], [0.62, 0.3], [-0.65, -0.1], [0.0, 0.0]];

type V2 = [number, number];

function circlePts(cx: number, cy: number, r: number, n = 96): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(pxv(cx + r * Math.cos((2 * Math.PI * i) / n), cy - r * Math.sin((2 * Math.PI * i) / n)));
  return pts;
}

export class IftOpenScene implements Scene {
  readonly id = "c08-ift-proof-open";

  private uEdge!: Polyline;
  private vEdge!: Polyline;
  private vFill!: Region;
  private pDot!: Dot;
  private y0Dot!: Dot;
  private mapArc!: CurvedArrow;
  private labels: FormulaHandle[] = [];

  private ballFill!: Region;
  private ballEdge!: Polyline;
  private radius!: Polyline;
  private radiusLabel!: FormulaHandle;
  private smallDisk!: Polyline;
  private smallFill!: Region;
  private yDot!: Dot;
  private yLabel!: FormulaHandle;
  private lamLabel!: FormulaHandle;

  private halfCircle!: Polyline;
  private moveArrow!: Arrow;
  private phiPDot!: Dot;
  private halfLabel!: FormulaHandle;

  private bArrows: Arrow[] = [];
  private imgFill!: Region;
  private imgEdge!: Polyline;
  private termA!: Polyline;
  private termB!: Polyline;

  private iterDots: Dot[] = [];
  private imgDots: Dot[] = [];
  private fixLabel!: FormulaHandle;

  private covered!: Region;
  private extraDisks: Region[] = [];
  private extraDots: Dot[] = [];
  private openLabel!: FormulaHandle;

  private top!: FormulaHandle;
  private bottom1!: FormulaHandle;
  private bottom2!: FormulaHandle;
  private notes: FormulaHandle[] = [];

  private ledger!: ProofLedger;
  private road!: RoadSign;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);

    this.uEdge = new Polyline(stage, circlePts(L.x, L.y, L.s), { color: Palette.blue, width: 3 });
    const vPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (2 * Math.PI * i) / 128;
      vPts.push(this.rp(RudinExample.f(Math.cos(a), Math.sin(a))));
    }
    this.vEdge = new Polyline(stage, vPts, { color: Palette.purple, width: 3 });
    this.vFill = new Region(stage, vPts, Palette.purple, 0.1);
    this.pDot = new Dot(stage, this.lp(P, 0.03), Palette.orange, 0.065);
    this.y0Dot = new Dot(stage, this.rp(Y0, 0.03), Palette.orange, 0.065);
    this.mapArc = new CurvedArrow(stage, this.lp([P[0] + 0.12, P[1] + 0.12]), this.rp([Y0[0] - 0.12, Y0[1] + 0.12]), 0.6, Palette.text, 2.5);
    this.labels = [
      fl.add({ tex: "U", x: L.x - 170, y: L.y - 170, size: 34, color: Palette.blue }),
      fl.add({ tex: "V=f(U)", x: R.x - 235, y: R.y - 185, size: 32, color: Palette.purple }),
      fl.add({ tex: "p", x: this.lpx(P).x - 18, y: this.lpx(P).y + 24, size: 28, color: Palette.orange }),
      fl.add({ tex: "y_0=f(p)", x: this.rpx(Y0).x - 30, y: this.rpx(Y0).y + 34, size: 26, color: Palette.orange }),
      fl.add({ tex: "f", x: (this.lpx(P).x + this.rpx(Y0).x) / 2, y: this.lpx(P).y - 150, size: 30 }),
    ];

    const pp = this.lpx(P);
    this.ballFill = new Region(stage, circlePts(pp.x, pp.y, RAD * L.s), Palette.green, 0.18);
    this.ballEdge = new Polyline(stage, circlePts(pp.x, pp.y, RAD * L.s), { color: Palette.green, width: 3.5 });
    this.radius = new Polyline(stage, [pxv(pp.x, pp.y), pxv(pp.x - RAD * L.s * 0.8, pp.y + RAD * L.s * 0.6)], { color: Palette.green, width: 2 });
    this.radiusLabel = fl.add({ tex: "r", x: pp.x - RAD * L.s * 0.45 - 14, y: pp.y + RAD * L.s * 0.32 - 12, size: 26, color: Palette.green });
    this.labels.push(fl.add({ tex: "\\bar B", x: pp.x + RAD * L.s * 0.75, y: pp.y + RAD * L.s * 0.85, size: 30, color: Palette.green }));
    const yp = this.rpx(Y0);
    this.smallDisk = new Polyline(stage, circlePts(yp.x, yp.y, LAMBDA * RAD * R.s), { color: Palette.yellow, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.smallFill = new Region(stage, circlePts(yp.x, yp.y, LAMBDA * RAD * R.s), Palette.yellow, 0.15);
    this.yDot = new Dot(stage, this.rp(Y, 0.04), Palette.yellow, 0.06);
    this.yLabel = fl.add({ tex: "y", x: 0, y: 0, size: 28, color: Palette.yellow });
    this.lamLabel = fl.add({ tex: "\\lambda r", x: yp.x + LAMBDA * RAD * R.s + 40, y: yp.y - 20, size: 26, color: Palette.yellow });

    this.halfCircle = new Polyline(stage, circlePts(pp.x, pp.y, RAD * L.s / 2), { color: Palette.orange, width: 2, dashed: true, dashSize: 0.05, gapSize: 0.04 });
    const phiP = RudinExample.phi(Y, P[0], P[1]);
    this.moveArrow = new Arrow(stage, this.lp(P, 0.02), this.lp(phiP, 0.02), Palette.orange, { width: 3.5, headLength: 0.12 });
    this.phiPDot = new Dot(stage, this.lp(phiP, 0.03), Palette.pink, 0.05);
    this.halfLabel = fl.add({ tex: "r/2", x: pp.x + RAD * L.s / 2 * 0.72 + 26, y: pp.y + RAD * L.s / 2 * 0.72 + 14, size: 24, color: Palette.orange });

    const img: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (2 * Math.PI * i) / 96;
      const x: V2 = [P[0] + RAD * Math.cos(a), P[1] + RAD * Math.sin(a)];
      img.push(this.lp(RudinExample.phi(Y, x[0], x[1]), 0.01));
    }
    this.imgFill = new Region(stage, img, Palette.pink, 0.3, 0.005);
    this.imgEdge = new Polyline(stage, img, { color: Palette.pink, width: 2.5 });
    for (let k = 0; k < N_BOUNDARY; k++) {
      const a = (2 * Math.PI * k) / N_BOUNDARY;
      const x: V2 = [P[0] + RAD * Math.cos(a), P[1] + RAD * Math.sin(a)];
      this.bArrows.push(new Arrow(stage, this.lp(x, 0.02), this.lp(RudinExample.phi(Y, x[0], x[1]), 0.02), Palette.pink, { width: 2, headLength: 0.08 }));
    }
    const xs: V2 = [P[0] + RAD * Math.cos(2.4), P[1] + RAD * Math.sin(2.4)];
    const phiXs = RudinExample.phi(Y, xs[0], xs[1]);
    this.termA = new Polyline(stage, [this.lp(phiXs, 0.02), this.lp(phiP, 0.02)], { color: Palette.blue, width: 4 });
    this.termB = new Polyline(stage, [this.lp(phiP, 0.02), this.lp(P, 0.02)], { color: Palette.orange, width: 4 });

    const it = RudinExample.iterates(Y, P, N_ITER);
    this.iterDots = it.map((q, i) => new Dot(stage, this.lp(q, 0.04), i === 0 ? Palette.orange : Palette.yellow, 0.05));
    this.imgDots = it.map((q, i) => new Dot(stage, this.rp(RudinExample.f(q[0], q[1]), 0.04), i === 0 ? Palette.orange : Palette.yellow, 0.05));
    const xStar = it[it.length - 1];
    this.fixLabel = fl.add({ tex: "x\\in\\bar B:\\ f(x)=y", x: this.lpx(xStar).x + 30, y: this.lpx(xStar).y - 60, size: 26, color: Palette.yellow, align: "left" });

    this.covered = new Region(stage, circlePts(yp.x, yp.y, LAMBDA * RAD * R.s), Palette.green, 0.45, 0.004);
    EXTRA_P.forEach((q) => {
      const r = 0.92 - Math.hypot(q[0], q[1]);
      const c = this.rpx(RudinExample.f(q[0], q[1]));
      this.extraDisks.push(new Region(stage, circlePts(c.x, c.y, LAMBDA * r * R.s), Palette.green, 0.45, 0.004));
      this.extraDots.push(new Dot(stage, pxv(c.x, c.y, 0.03), Palette.green, 0.04));
    });
    this.openLabel = fl.add({ tex: `V\\ \\text{open}\\ ${Tex.color(Palette.green, "\\checkmark")}`, x: R.x + 190, y: R.y + 220, size: 32, color: Palette.green });

    this.top = fl.add({ tex: "", x: 660, y: 110, size: 32 });
    this.bottom1 = fl.add({ tex: "", x: 660, y: 750, size: 30 });
    this.bottom2 = fl.add({ tex: "", x: 660, y: 805, size: 30 });
    const notes = [
      "\\bar B:\\ \\text{inside } U\\ (\\text{estimate holds})\\ \\ +\\ \\ \\text{complete}\\ (\\text{limit stays in } \\bar B)",
      "f|_U:U\\to V\\ \\text{bijective},\\ V\\ \\text{open},\\ \\ g=(f|_U)^{-1}:V\\to U",
      "g\\ \\text{differentiable?}\\qquad g'=(f')^{-1}\\,?",
    ];
    this.notes = notes.map((tex, i) => fl.add({ tex, x: 660, y: [750, 805, 110][i], size: 30, color: i === 2 ? Palette.yellow : Palette.text }));

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "a", tex: "\\varphi_y:\\ \\tfrac12\\text{-contraction on } U", at: 0.2 },
      { label: "b", tex: "f\\ \\text{one-to-one on } U", at: 0.2 },
      { label: "1", tex: "\\bar B\\subseteq U\\ \\text{closed}\\Rightarrow\\text{complete}", at: cue.s(2) + 1.5 },
      { label: "2", tex: "\\|\\varphi(p)-p\\|<r/2", at: cue.s(9) + 0.5 },
      { label: "3", tex: "\\varphi(\\bar B)\\subseteq B\\subseteq\\bar B", at: cue.s(16) + 1.0 },
      { label: "4", tex: "\\|y-y_0\\|<\\lambda r\\Rightarrow y\\in V", at: cue.s(19) + 1.5 },
      { label: "5", tex: "V\\ \\text{open},\\ g=f^{-1}\\ \\text{exists}", at: cue.s(23) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
    this.road = new RoadSign(fl, 700);
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

  private topTex(t: number, c: Cues): string {
    if (t >= c.s(25)) return "";
    if (t >= c.s(17)) return `\\bar B\\ \\text{complete},\\ \\varphi\\ \\text{a }\\tfrac12\\text{-contraction on }\\bar B\\ \\Rightarrow\\ \\exists\\,x\\in\\bar B:\\ \\varphi(x)=x\\iff ${Tex.color(Palette.yellow, "f(x)=y")}`;
    if (t >= c.s(5)) return `\\text{Claim: } \\|y-y_0\\|<\\lambda r\\ \\Rightarrow\\ y\\in V.\\qquad \\text{Use } \\varphi=\\varphi_y`;
    if (t >= c.s(3)) return "\\text{Claim: } \\|y-y_0\\|<\\lambda r\\ \\Rightarrow\\ y\\in V";
    return "";
  }

  private bottomTex(t: number, c: Cues): [string, string] {
    const blue = (s: string): string => Tex.color(Palette.blue, s);
    const orange = (s: string): string => Tex.color(Palette.orange, s);
    if (t >= c.s(17)) return ["", ""];
    if (t >= c.s(10)) {
      const l1 = `\\|\\varphi(x)-p\\|\\le ${blue("\\|\\varphi(x)-\\varphi(p)\\|")}+${orange("\\|\\varphi(p)-p\\|")}`;
      const l2parts = [
        `<${blue("\\tfrac12\\|x-p\\|")}`,
        `+${orange("\\tfrac r2")}`,
        `\\le ${blue("\\tfrac r2")}+${orange("\\tfrac r2")}=r\\qquad(\\text{both } \\tfrac12\\text{ from } 2\\lambda\\|A^{-1}\\|=1)`,
      ];
      const n = t >= c.s(15) ? 3 : t >= c.s(14) ? 2 : t >= c.s(13) ? 1 : 0;
      return [t >= c.s(11) ? l1 : "\\text{Step 5: } \\varphi(\\bar B)\\subseteq\\bar B", Tex.reveal(l2parts, n)];
    }
    if (t >= c.s(6)) {
      const a = "\\text{Step 4: } \\varphi(p)-p=A^{-1}(y-f(p))=A^{-1}(y-y_0)";
      const b = "\\|\\varphi(p)-p\\|\\le\\|A^{-1}\\|\\,\\|y-y_0\\|<\\|A^{-1}\\|\\,\\lambda r=\\tfrac r2";
      return [t >= c.s(7) ? a : "\\text{Step 4: how far does } \\varphi \\text{ move } p\\,?", t >= c.s(8) ? b : ""];
    }
    return ["", ""];
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const base = c.p(0, 0.8, -0.8);

    this.uEdge.setOpacity(base);
    this.vEdge.setOpacity(base);
    this.vFill.setOpacity(0.1 * base);
    const pVis = c.p(1, 0.6);
    this.pDot.setOpacity(pVis);
    this.y0Dot.setOpacity(pVis);
    this.mapArc.setProgress(c.p(1, 1.0, 0.5), pVis * (1 - c.p(5, 0.5)));
    this.labels.forEach((h, i) => {
      const o = i < 2 ? base : i < 4 ? pVis : i === 4 ? pVis * (1 - c.p(5, 0.5)) : c.p(2, 0.6);
      h.set({ opacity: o });
    });

    // closed ball and the target disk
    const ballVis = c.p(2, 0.6);
    const grow = c.over(2, 0.2, 0.8);
    const pp = this.lpx(P);
    this.ballFill.setPoints(circlePts(pp.x, pp.y, Math.max(1, RAD * L.s * grow)));
    this.ballFill.setOpacity(0.18 * ballVis);
    this.ballEdge.setPoints(circlePts(pp.x, pp.y, Math.max(1, RAD * L.s * grow)));
    this.ballEdge.setOpacity(ballVis);
    this.radius.setOpacity(ballVis * (grow > 0.98 ? 1 : 0) * (1 - c.p(10, 0.5)));
    this.radiusLabel.set({ opacity: ballVis * (grow > 0.98 ? 1 : 0) * (1 - c.p(10, 0.5)) });
    const diskVis = c.p(3, 0.6) * (1 - c.p(20, 0.6));
    this.smallDisk.setOpacity(diskVis);
    this.smallFill.setOpacity(0.15 * diskVis);
    this.lamLabel.set({ opacity: diskVis });
    // y wanders inside the disk during s3–s4, then rests at Y.
    const wander = c.over(4, 0.0, 0.9);
    const ang = 6 * wander;
    const wr = 0.6 * Math.sin(Math.PI * wander);
    const yNow: V2 = [Y[0] + wr * LAMBDA * RAD * Math.cos(ang), Y[1] + wr * LAMBDA * RAD * Math.sin(ang)];
    const yVis = c.p(3, 0.6, 1.0);
    this.yDot.setPosition(this.rp(yNow, 0.04));
    this.yDot.setOpacity(yVis);
    const yp = this.rpx(yNow);
    this.yLabel.set({ x: yp.x + 22, y: yp.y - 18, opacity: yVis });

    // step 4
    const s4 = c.p(6, 0.6) * (1 - c.p(17, 0.6));
    this.halfCircle.setOpacity(s4 * c.p(8, 0.6));
    this.halfLabel.set({ opacity: s4 * c.p(8, 0.6) });
    this.moveArrow.setOpacity(s4 * c.p(7, 0.6));
    this.phiPDot.setOpacity(s4 * c.p(7, 0.6));

    // step 5
    const s5 = c.p(10, 0.6) * (1 - c.p(17, 0.6));
    const grow5 = c.over(10, 0.1, 0.9);
    this.bArrows.forEach((a) => a.setOpacity(s5 * grow5));
    this.imgFill.setOpacity(0.3 * s5 * c.p(16, 0.6));
    this.imgEdge.setOpacity(s5 * c.p(16, 0.6));
    this.termA.setOpacity(s5 * c.p(12, 0.5) * (1 - c.p(16, 0.4)));
    this.termB.setOpacity(s5 * c.p(12, 0.5, 1.2) * (1 - c.p(16, 0.4)));

    // steps 6–7: iteration in B̄
    const s6 = c.p(17, 0.6) * (1 - c.p(20, 0.6));
    const shown = (N_ITER + 1) * clamp01((t - c.s(18)) / ((c.e(18) - c.s(18)) * 0.8));
    this.iterDots.forEach((d, i) => d.setOpacity(s6 * (shown > i ? 1 : 0)));
    this.imgDots.forEach((d, i) => d.setOpacity(s6 * (shown > i ? 1 : 0)));
    this.fixLabel.set({ opacity: s6 * (shown > N_ITER ? 1 : 0) });

    // openness
    this.covered.setOpacity(0.45 * c.p(20, 0.6));
    this.extraDisks.forEach((d, i) => {
      const o = c.p(21, 0.4, 0.5 * i);
      d.setOpacity(0.45 * o);
      this.extraDots[i].setOpacity(o);
    });
    this.openLabel.set({ opacity: c.p(21, 0.6, 3.0) });

    // formulas
    this.top.setContent(this.topTex(t, c));
    this.top.set({ opacity: t >= c.s(3) && t < c.s(20) ? 1 : 0 });
    const [b1, b2] = this.bottomTex(t, c);
    this.bottom1.setContent(b1);
    this.bottom1.set({ opacity: b1 === "" ? 0 : 1 });
    this.bottom2.setContent(b2);
    this.bottom2.set({ opacity: b2 === "" ? 0 : 1 });
    this.notes[0].set({ opacity: c.p(22, 0.6) * (1 - c.p(23, 0.5)) });
    this.notes[1].set({ opacity: c.p(23, 0.6) });
    this.notes[2].set({ opacity: c.p(25, 0.6) });

    this.ledger.update(t, 1, true);
    this.road.update(base, 0);
  }

  teardown(_layers: SceneLayers): void {}
}
