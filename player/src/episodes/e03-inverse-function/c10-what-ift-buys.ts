import type * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import { Cues } from "../../primitives/Cues";
import { CurvedArrow } from "../../primitives/CurvedArrow";
import { Dot } from "../../primitives/Dot";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { Region } from "../../primitives/Region";
import { pxv, usePixelView } from "./lib/PixelSpace";
import { RoadSign } from "./lib/RoadSign";
import { Tex } from "./lib/Tex";
import { WiggleMap } from "./lib/WiggleMap";

/**
 * E03 c10 — recap: the proof map with its counterexamples, polar coordinates as a chart in embryo,
 * and why a non-square constraint map needs the implicit function theorem (E04).
 * Sentence indices refer to story.en.json, scene c10-what-ift-buys.
 */

const COLS = [360, 960, 1560];
const STRIP = { x0: 150, y: 470, sTheta: 95, sR: 110 };
const ANN = { x: 1380, y: 470, s: 150 };
const CIRC = { x: 700, y: 480, r: 220 };
const P_ANGLE = (50 * Math.PI) / 180;

export class WhatIftBuysScene implements Scene {
  readonly id = "c10-what-ift-buys";

  private headers: FormulaHandle[] = [];
  private nodes: FormulaHandle[][] = [];
  private downs: FormulaHandle[][] = [];
  private thumbs: Polyline[][] = [];
  private thumbDots: Dot[] = [];
  private captions: FormulaHandle[] = [];
  private allUsed!: FormulaHandle;

  private buy!: FormulaHandle;
  private stripLines: Polyline[] = [];
  private annLines: Polyline[] = [];
  private patch!: Region;
  private patchImg!: Region;
  private there!: CurvedArrow;
  private back!: CurvedArrow;
  private polarLabels: FormulaHandle[] = [];

  private circle!: Polyline;
  private pDot!: Dot;
  private missF: FormulaHandle[] = [];
  private arc!: Polyline;
  private drops: Polyline[] = [];
  private axisSeg!: Polyline;
  private nextF: FormulaHandle[] = [];
  private road!: RoadSign;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    usePixelView(stage);

    // ---- proof map
    const heads = ["\\text{(a) one-to-one}", "\\text{(a) image open}", "\\text{(b) inverse differentiable}"];
    const cols = [
      ["F\\in C^1", "\\|f'(x)-A\\|<\\lambda\\ \\text{on a ball } U", "\\varphi_y:\\ \\tfrac12\\text{-contraction}", "f\\ \\text{one-to-one on } U"],
      ["\\text{closed ball } \\bar B\\subseteq U", "\\bar B\\ \\text{complete}", "\\text{fixed point: } f(x)=y", "V=f(U)\\ \\text{open}"],
      ["\\|h\\|\\le\\|k\\|/\\lambda\\ \\ (A\\ \\text{invertible})", "h-Tk=-T[\\text{remainder}]", "g'=(f')^{-1}", "g\\in C^1\\ (C^k)"],
    ];
    this.headers = heads.map((tex, i) => fl.add({ tex, x: COLS[i], y: 110, size: 32, color: Palette.yellow }));
    this.nodes = cols.map((col, i) => col.map((tex, j) => fl.add({ tex, x: COLS[i], y: 180 + j * 85, size: 28, boxed: true })));
    this.downs = cols.map((col, i) => col.slice(1).map((_, j) => fl.add({ tex: "\\downarrow", x: COLS[i], y: 222 + j * 85, size: 24, color: Palette.muted })));
    // thumbnails: wiggle, punctured interval, cube root
    const ty = 610;
    const wig: THREE.Vector3[] = [];
    for (let i = 0; i <= 400; i++) {
      const x = -0.4 + (0.8 * i) / 400;
      wig.push(pxv(COLS[0] + 220 * x, ty - 120 * WiggleMap.value(x)));
    }
    const root: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const s = -1 + (2 * i) / 120;
      root.push(pxv(COLS[2] + 90 * s * s * s, ty - 60 * s));
    }
    const axes = (cx: number): Polyline[] => [
      new Polyline(stage, [pxv(cx - 110, ty), pxv(cx + 110, ty)], { color: Palette.axis, width: 1.5 }),
      new Polyline(stage, [pxv(cx, ty - 75), pxv(cx, ty + 75)], { color: Palette.axis, width: 1.5 }),
    ];
    this.thumbs = [
      [...axes(COLS[0]), new Polyline(stage, wig, { color: Palette.red, width: 2.5 })],
      [new Polyline(stage, [pxv(COLS[1] - 120, ty), pxv(COLS[1] + 120, ty)], { color: Palette.red, width: 3 })],
      [...axes(COLS[2]), new Polyline(stage, root, { color: Palette.red, width: 2.5 })],
    ];
    this.thumbDots = [new Dot(stage, pxv(COLS[1] - 120, ty, 0.02), Palette.red, 0.09, "2d", true)];
    for (let n = 0; n < 6; n++) this.thumbDots.push(new Dot(stage, pxv(COLS[1] - 120 + 240 * Math.pow(0.5, n), ty, 0.02), Palette.orange, 0.045));
    const caps = [
      "\\text{without } C^1:\\ x+2x^2\\sin\\tfrac1x",
      "\\text{without completeness: } \\tfrac{x}{2}\\ \\text{on } (0,1]",
      "\\text{without invertible } DF:\\ x^3\\ (\\text{inverse } x^{1/3})",
    ];
    this.captions = caps.map((tex, i) => fl.add({ tex, x: COLS[i], y: 720, size: 26, color: Palette.red }));
    this.allUsed = fl.add({ tex: "\\text{every hypothesis is used, and each has a counterexample}", x: 960, y: 800, size: 32, color: Palette.green });

    // ---- polar coordinates as a chart in embryo
    this.buy = fl.add({ tex: "\\det DF(x_0)\\neq 0\\ \\ \\Longrightarrow\\ \\ \\text{smooth local coordinates near } x_0", x: 960, y: 120, size: 36, color: Palette.yellow });
    const sp = (r: number, th: number): THREE.Vector3 => pxv(STRIP.x0 + STRIP.sTheta * th, STRIP.y - STRIP.sR * (r - 1));
    const ap = (r: number, th: number): THREE.Vector3 => pxv(ANN.x + ANN.s * r * Math.cos(th), ANN.y - ANN.s * r * Math.sin(th));
    for (let k = 0; k <= 8; k++) {
      const th = (k * Math.PI) / 4;
      this.stripLines.push(new Polyline(stage, [sp(0.5, th), sp(1.5, th)], { color: Palette.blue, width: 1.8 }));
      this.annLines.push(new Polyline(stage, [ap(0.5, th), ap(1.5, th)], { color: Palette.blue, width: 1.8 }));
    }
    for (const r of [0.5, 1.0, 1.5]) {
      const s: THREE.Vector3[] = [];
      const a: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const th = (2 * Math.PI * i) / 64;
        s.push(sp(r, th));
        a.push(ap(r, th));
      }
      this.stripLines.push(new Polyline(stage, s, { color: Palette.blue, width: 1.8 }));
      this.annLines.push(new Polyline(stage, a, { color: Palette.blue, width: 1.8 }));
    }
    const patch: [number, number][] = [];
    for (let i = 0; i <= 8; i++) patch.push([0.85, 1.0 + 0.6 * i / 8]);
    for (let i = 0; i <= 8; i++) patch.push([0.85 + 0.4 * i / 8, 1.6]);
    for (let i = 0; i <= 8; i++) patch.push([1.25, 1.6 - 0.6 * i / 8]);
    for (let i = 0; i <= 8; i++) patch.push([1.25 - 0.4 * i / 8, 1.0]);
    this.patch = new Region(stage, patch.map((q) => sp(q[0], q[1])), Palette.green, 0.6, 0.01);
    this.patchImg = new Region(stage, patch.map((q) => ap(q[0], q[1])), Palette.green, 0.6, 0.01);
    this.there = new CurvedArrow(stage, pxv(520, 380), pxv(1140, 380), 0.6, Palette.text, 3);
    this.back = new CurvedArrow(stage, pxv(1140, 570), pxv(520, 570), 0.6, Palette.green, 3);
    this.polarLabels = [
      fl.add({ tex: "(r,\\theta)\\mapsto(r\\cos\\theta,\\ r\\sin\\theta)", x: 860, y: 260, size: 30 }),
      fl.add({ tex: "\\text{local coordinates } (r,\\theta)", x: 860, y: 700, size: 30, color: Palette.green }),
      fl.add({ tex: "\\text{a chart in embryo}", x: 860, y: 770, size: 34, color: Palette.yellow }),
    ];

    // ---- what is missing: non-square constraint maps
    const cpts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) cpts.push(pxv(CIRC.x + CIRC.r * Math.cos((2 * Math.PI * i) / 128), CIRC.y - CIRC.r * Math.sin((2 * Math.PI * i) / 128)));
    this.circle = new Polyline(stage, cpts, { color: Palette.blue, width: 3.5 });
    this.pDot = new Dot(stage, pxv(CIRC.x + CIRC.r * Math.cos(P_ANGLE), CIRC.y - CIRC.r * Math.sin(P_ANGLE), 0.03), Palette.orange, 0.08);
    const mf = [
      "\\text{the theorem needs } F:\\mathbb{R}^n\\to\\mathbb{R}^n",
      "h(x)=c,\\quad h:\\mathbb{R}^n\\to\\mathbb{R}^k,\\ \\ k<n",
      "x^2+y^2=1:\\ \\ 1\\ \\text{equation},\\ 2\\ \\text{unknowns}",
      "Dh=\\begin{pmatrix}2x & 2y\\end{pmatrix}\\quad(1\\times 2)",
      `${Tex.color(Palette.red, "\\text{not square: no inverse}")}`,
    ];
    this.missF = mf.map((tex, i) => fl.add({ tex, x: 1370, y: [250, 330, 410, 490, 560][i], size: 30 }));
    const arcPts: THREE.Vector3[] = [];
    const lo = P_ANGLE - 0.35;
    const hi = P_ANGLE + 0.35;
    for (let i = 0; i <= 40; i++) {
      const a = lo + ((hi - lo) * i) / 40;
      arcPts.push(pxv(CIRC.x + CIRC.r * Math.cos(a), CIRC.y - CIRC.r * Math.sin(a), 0.01));
    }
    this.arc = new Polyline(stage, arcPts, { color: Palette.green, width: 7 });
    for (let i = 0; i <= 4; i++) {
      const a = lo + ((hi - lo) * i) / 4;
      const x = CIRC.x + CIRC.r * Math.cos(a);
      this.drops.push(new Polyline(stage, [pxv(x, CIRC.y - CIRC.r * Math.sin(a)), pxv(x, CIRC.y)], { color: Palette.green, width: 1.5, dashed: true, dashSize: 0.05, gapSize: 0.04 }));
    }
    this.axisSeg = new Polyline(stage, [pxv(CIRC.x + CIRC.r * Math.cos(hi), CIRC.y, 0.01), pxv(CIRC.x + CIRC.r * Math.cos(lo), CIRC.y, 0.01)], { color: Palette.yellow, width: 6 });
    const nf = [
      "\\text{next episode: } F(x,y)=\\big(x,\\ f(x,y)\\big)\\ \\text{is square}",
      `\\text{near } p:\\ \\ x^2+y^2=1\\iff ${Tex.color(Palette.green, "y=g(x)=\\sqrt{1-x^2}")}`,
    ];
    this.nextF = nf.map((tex, i) => fl.add({ tex, x: 1300, y: [650, 720][i], size: 30, color: i === 0 ? Palette.yellow : Palette.text }));
    this.road = new RoadSign(fl, 960, 34, 24);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    // ---- proof map: s0–s7
    const mapVis = c.p(0, 0.8, -0.8) * (1 - c.p(8, 0.6));
    const colAt = [1, 3, 5];
    this.headers.forEach((h, i) => h.set({ opacity: mapVis * (0.45 + 0.55 * c.p(colAt[i], 0.5)) }));
    this.nodes.forEach((col, i) => col.forEach((h, j) => {
      const lit = c.p(colAt[i], 0.4, j * 0.9);
      h.set({ opacity: mapVis * (0.35 + 0.65 * lit), color: lit > 0.5 ? (t >= c.s(7) ? Palette.green : Palette.text) : Palette.muted });
    }));
    this.downs.forEach((col, i) => col.forEach((h, j) => h.set({ opacity: mapVis * c.p(colAt[i], 0.4, j * 0.9 + 0.5) })));
    const thumbAt = [2, 4, 6];
    this.thumbs.forEach((ls, i) => ls.forEach((l) => l.setOpacity(mapVis * c.p(thumbAt[i], 0.6))));
    this.thumbDots.forEach((d) => d.setOpacity(mapVis * c.p(4, 0.6)));
    this.captions.forEach((h, i) => h.set({ opacity: mapVis * c.p(thumbAt[i], 0.6) }));
    this.allUsed.set({ opacity: c.p(7, 0.6) * (1 - c.p(8, 0.6)) });

    // ---- polar: s8–s10
    const polVis = c.p(8, 0.6, 0.4) * (1 - c.p(11, 0.6));
    this.buy.set({ opacity: c.p(8, 0.6, 0.4) * (1 - c.p(11, 0.6)) });
    this.stripLines.forEach((l) => l.setOpacity(polVis));
    this.annLines.forEach((l) => l.setOpacity(polVis));
    const swing = t >= c.s(9) ? 0.5 + 0.5 * Math.sin((t - c.s(9)) * 2.2) : 0.5;
    this.patch.setOpacity(polVis * c.p(9, 0.5) * (0.35 + 0.5 * swing));
    this.patchImg.setOpacity(polVis * c.p(9, 0.5) * (0.35 + 0.5 * (1 - swing)));
    this.there.setProgress(c.p(9, 1.0), polVis);
    this.back.setProgress(c.p(9, 1.0, 1.0), polVis);
    this.polarLabels[0].set({ opacity: polVis });
    this.polarLabels[1].set({ opacity: polVis * c.p(9, 0.6, 1.0) });
    this.polarLabels[2].set({ opacity: polVis * c.p(10, 0.6) });

    // ---- circle: s11–s17
    const cVis = c.p(11, 0.6, 0.4);
    this.circle.setOpacity(cVis);
    const pulse = t >= c.s(13) ? 0.85 + 0.25 * Math.sin((t - c.s(13)) * 6) : 1;
    this.pDot.setOpacity(cVis * c.p(13, 0.5));
    this.pDot.setScale(pulse);
    const mfAt = [11, 12, 13, 14, 14.5];
    this.missF.forEach((h, i) => {
      const k = mfAt[i];
      const start = Number.isInteger(k) ? c.s(k) : c.in(Math.floor(k), 0.6);
      h.set({ opacity: (t >= start ? Math.min(1, (t - start) / 0.5) : 0) * (1 - c.p(15, 0.6) * (i < 3 ? 1 : 0)) });
    });
    const graphVis = c.p(16, 0.6);
    this.arc.setOpacity(graphVis);
    this.arc.setProgress(c.over(16, 0.0, 0.5));
    this.drops.forEach((d) => d.setOpacity(graphVis * c.p(16, 0.6, 1.0)));
    this.axisSeg.setOpacity(graphVis * c.p(16, 0.6, 1.0));
    this.nextF[0].set({ opacity: c.p(15, 0.6) });
    this.nextF[1].set({ opacity: c.p(16, 0.6, 1.0) });
    const focusColor = t >= c.s(17) && Math.sin((t - c.s(17)) * 5) > 0 ? Palette.orange : Palette.yellow;
    this.road.update(c.p(0, 0.8, -0.8), t >= c.s(15) ? 1 : 0, t >= c.s(15) ? 1 : 0, focusColor);
  }

  teardown(_layers: SceneLayers): void {}
}
