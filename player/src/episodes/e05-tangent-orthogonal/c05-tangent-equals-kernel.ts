import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { Surface } from "../../primitives/Surface";
import { TangentPlane } from "../../primitives/TangentPlane";
import { Hud } from "./lib/Hud";
import { Orbit } from "./lib/Orbit";
import { PxGroup } from "./lib/PxGroup";
import { Tex } from "./lib/Tex";

/**
 * E05 c05 — step two: im Dψ(a) ⊆ T_pM ⊆ ker Dh(p), both ends of dimension n − k, hence equality.
 * Parameter disk in the plane z = 0 lifted by ψ(x) = (x, g(x)) onto the upper hemisphere; lines a + tξ become
 * curves with velocities Dψ(a)ξ standing above ξ; a nested-sets diagram for the squeeze.
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c05-tangent-equals-kernel.
 */

const FOV = 32;
const A = new THREE.Vector2(0.35, 0.25);
const g = (x: number, y: number): number => Math.sqrt(Math.max(0, 1 - x * x - y * y));
const GA = g(A.x, A.y);
const P = new THREE.Vector3(A.x, A.y, GA);
const XI_ANGLES = [0, 0.63, 1.26, 1.88, 2.51];
const XI_COLORS = [Palette.teal, Palette.pink, Palette.green, Palette.yellow, Palette.purple];
const XI_LEN = 0.38;
const LINE_T = 0.5;
const GRID = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];

/** Point ψ(x) lifted a fraction s of the way: (x₁, x₂, s·g(x)). */
function lift(x: number, y: number, s: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, s * g(x, y));
}

/** Dψ(a)ξ = (ξ, Dg(a)ξ) with Dg(a) = −aᵀ/g(a). */
function dpsi(xi: THREE.Vector2): THREE.Vector3 {
  return new THREE.Vector3(xi.x, xi.y, -(A.x * xi.x + A.y * xi.y) / GA);
}

function ellipse(rx: number, ry: number, n = 96): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (2 * Math.PI * i) / n;
    pts.push({ x: rx * Math.cos(s), y: ry * Math.sin(s) });
  }
  return pts;
}

interface GridLine {
  samples: THREE.Vector2[];
  line: Polyline;
}

export class TangentEqualsKernelScene implements Scene {
  readonly id = "c05-tangent-equals-kernel";
  private stage!: StageLayer;
  private hud!: Hud;
  private diskRim!: Polyline;
  private grid: GridLine[] = [];
  private hemisphere!: Surface;
  private aDot!: Dot;
  private pDot!: Dot;
  private aLabel!: FormulaHandle;
  private pLabel!: FormulaHandle;
  private psiLabel!: FormulaHandle;
  private liftLink!: Polyline;
  private lines: Polyline[] = [];
  private curves: Polyline[] = [];
  private xiArrows: Arrow[] = [];
  private velArrows: Arrow[] = [];
  private shadows: Polyline[] = [];
  private xiLabel!: FormulaHandle;
  private tanPlane!: TangentPlane;
  private kerPlane!: TangentPlane;
  private planeLabel!: FormulaHandle;
  private blockTex!: FormulaHandle;
  private reorderNote!: FormulaHandle;
  private splitTex!: FormulaHandle;
  private graphTex!: FormulaHandle;
  private hemiTex!: FormulaHandle;
  private curveTex!: FormulaHandle;
  private injTex!: FormulaHandle;
  private kerTex!: FormulaHandle;
  private nest!: PxGroup;
  private nestFills: Region[] = [];
  private nestOutlines: Polyline[] = [];
  private nestLabels: FormulaHandle[] = [];
  private chainTex!: FormulaHandle;
  private finalTex!: FormulaHandle;
  private noteRegularity!: FormulaHandle;
  private noteInjective!: FormulaHandle;
  private bonus!: FormulaHandle;
  private linear!: FormulaHandle;
  private ledger!: ProofLedger;
  private ledgerFinal!: FormulaHandle;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.hud = new Hud(stage);

    // ---- Parameter disk and its grid (lifted by ψ)
    this.diskRim = new Polyline(stage, sampleCurve((s) => new THREE.Vector3(Math.cos(s), Math.sin(s), 0), 0, 2 * Math.PI, 120),
      { color: Palette.axis, width: 2.5 });
    for (const c0 of GRID) {
      const w = Math.sqrt(0.97 - c0 * c0);
      const h1: THREE.Vector2[] = [];
      const h2: THREE.Vector2[] = [];
      for (let i = 0; i <= 40; i++) {
        const s = -w + (2 * w * i) / 40;
        h1.push(new THREE.Vector2(s, c0));
        h2.push(new THREE.Vector2(c0, s));
      }
      for (const samples of [h1, h2]) {
        this.grid.push({ samples, line: new Polyline(stage, samples.map((q) => lift(q.x, q.y, 0)), { color: "#5b6a92", width: 1.6 }) });
      }
    }
    this.hemisphere = new Surface(stage, (u, v, target) => {
      const th = 2 * Math.PI * u;
      const ph = (Math.PI / 2) * v * 0.985;
      target.set(Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph));
    }, Palette.blue, { wireframe: false, opacity: 0.3 });
    this.aDot = new Dot(stage, new THREE.Vector3(A.x, A.y, 0), Palette.text, 0.035, "3d");
    this.pDot = new Dot(stage, P, Palette.orange, 0.04, "3d");
    this.aLabel = fl.add({ tex: "a", x: 0, y: 0, size: 34, color: Palette.text });
    this.pLabel = fl.add({ tex: "p=\\psi(a)", x: 0, y: 0, size: 32, color: Palette.orange });
    this.psiLabel = fl.add({ tex: "\\psi", x: 0, y: 0, size: 36, color: Palette.text });
    this.liftLink = new Polyline(stage, [new THREE.Vector3(A.x, A.y, 0), P], { color: Palette.muted, width: 2, dashed: true, dashSize: 0.04, gapSize: 0.03 });

    XI_ANGLES.forEach((ang, k) => {
      const xi = new THREE.Vector2(Math.cos(ang), Math.sin(ang));
      this.lines.push(new Polyline(stage, [new THREE.Vector3(A.x - LINE_T * xi.x, A.y - LINE_T * xi.y, 0.002),
        new THREE.Vector3(A.x + LINE_T * xi.x, A.y + LINE_T * xi.y, 0.002)], { color: XI_COLORS[k], width: 3.5 }));
      this.curves.push(new Polyline(stage, sampleCurve((t) => lift(A.x + t * xi.x, A.y + t * xi.y, 1).multiplyScalar(1.004), -LINE_T, LINE_T, 60),
        { color: XI_COLORS[k], width: 4 }));
      const xiEnd = new THREE.Vector3(A.x + XI_LEN * xi.x, A.y + XI_LEN * xi.y, 0.004);
      this.xiArrows.push(new Arrow(stage, new THREE.Vector3(A.x, A.y, 0.004), xiEnd, XI_COLORS[k], { mode: "3d", headLength: 0.07, width: 4 }));
      const vel = P.clone().addScaledVector(dpsi(xi), XI_LEN);
      this.velArrows.push(new Arrow(stage, P, vel, Palette.orange, { mode: "3d", headLength: 0.07, width: 4.5 }));
      this.shadows.push(new Polyline(stage, [vel, xiEnd], { color: XI_COLORS[k], width: 1.8, dashed: true, dashSize: 0.035, gapSize: 0.03 }));
    });
    this.xiLabel = fl.add({ tex: "\\xi", x: 0, y: 0, size: 34, color: Palette.teal });
    const normal = P.clone().normalize();
    this.tanPlane = new TangentPlane(stage, Palette.orange, 0.5);
    this.tanPlane.place(P.clone().addScaledVector(normal, 0.003), normal);
    this.kerPlane = new TangentPlane(stage, Palette.purple, 0.62);
    this.kerPlane.place(P, normal);
    this.planeLabel = fl.add({ tex: "T_pM=\\ker Dh(p)", x: 0, y: 0, size: 32, color: Palette.text });

    // ---- Formulas (column right of the 3D view, x 900–1360)
    const RX = 1110;
    this.blockTex = fl.add({ tex: "Dh(p)=\\big[\\,D_xh(p)\\ \\big|\\ \\textcolor{#ffd43b}{D_yh(p)}\\,\\big],\\qquad D_yh(p)\\in\\mathbb{R}^{k\\times k}\\ \\text{invertible}", x: 750, y: 96, size: 34 });
    this.reorderNote = fl.add({ text: "reordering coordinates = permutation (linear isomorphism)", x: 750, y: 150, size: 26, color: Palette.muted });
    this.splitTex = fl.add({ tex: "p=(a,b),\\quad a\\in\\mathbb{R}^{n-k},\\ b\\in\\mathbb{R}^k", x: RX, y: 230, size: 32 });
    this.graphTex = fl.add({ tex: "\\begin{gathered}g:A\\to B,\\ \\ g(a)=b\\\\ M\\cap(A\\times B)=\\{(x,g(x)):x\\in A\\}\\\\ \\psi(x)=(x,g(x)),\\ \\ \\psi(a)=p\\end{gathered}", x: RX, y: 360, size: 30, display: true });
    this.hemiTex = fl.add({ tex: "g(x_1,x_2)=\\sqrt{1-x_1^2-x_2^2}", x: RX, y: 500, size: 32, color: Palette.blue });
    this.curveTex = fl.add({ tex: this.curveFormula(0), x: RX, y: 300, size: 32, display: true });
    this.injTex = fl.add({ tex: this.injFormula(0), x: RX, y: 470, size: 30, display: true });
    this.kerTex = fl.add({ tex: "\\begin{gathered}\\operatorname{rank}Dh(p)=k\\\\ \\Downarrow\\\\ \\dim\\ker Dh(p)=n-k\\end{gathered}", x: RX, y: 470, size: 36, display: true });

    // ---- Nested sets diagram (overlay)
    this.nest = new PxGroup(this.hud);
    this.nest.place(720, 470, 1);
    const colors = [Palette.purple, Palette.muted, Palette.orange];
    for (let i = 0; i < 3; i++) {
      const pts = ellipse(100, 60).map((q) => this.nest.v(q.x, q.y));
      const fill = new Region(stage, pts, colors[i], 0.2, -0.01 + 0.005 * i);
      this.nest.adopt(fill.object);
      fill.object.position.z = -0.01 + 0.005 * i;
      this.nestFills.push(fill);
      const outline = new Polyline(stage, pts, { color: colors[i], width: i === 1 ? 3 : 4, dashed: i === 1, dashSize: 14, gapSize: 9 });
      this.nest.adopt(outline.object);
      this.nestOutlines.push(outline);
    }
    this.nestLabels = [
      fl.add({ tex: "\\ker Dh(p)\\ \\ (\\dim n-k)", x: 0, y: 0, size: 30, color: Palette.purple }),
      fl.add({ tex: "T_pM", x: 0, y: 0, size: 32, color: Palette.text }),
      fl.add({ tex: "\\operatorname{im}D\\psi(a)\\ \\ (\\dim n-k)", x: 0, y: 0, size: 30, color: Palette.orange }),
    ];
    this.chainTex = fl.add({ tex: this.chainFormula(0), x: 720, y: 790, size: 40 });
    this.finalTex = fl.add({ tex: "T_pM=\\ker Dh(p)=\\operatorname{im}D\\psi(a)", x: 720, y: 790, size: 42, color: Palette.yellow, boxed: true });
    this.noteRegularity = fl.add({ tex: "\\text{regularity}\\ \\Rightarrow\\ D_yh(p)\\ \\text{invertible}\\ \\Rightarrow\\ g,\\ \\psi", x: 750, y: 96, size: 34, color: Palette.yellow });
    this.noteInjective = fl.add({ tex: "D\\psi(a)\\ \\text{injective}\\ \\Rightarrow\\ \\dim\\operatorname{im}=n-k\\ \\text{(no gap to close)}", x: 750, y: 150, size: 30, color: Palette.text });
    this.bonus = fl.add({ tex: this.bonusTex(true), x: 1110, y: 470, size: 34, display: true });
    this.linear = fl.add({ tex: "\\text{find } T_pM\\ =\\ \\text{solve } Dh(p)\\,v=0", x: 1110, y: 640, size: 34, color: Palette.green, boxed: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "T_pM\\subseteq\\ker Dh(p)", at: 2.0 },
      { label: "2", tex: "\\operatorname{im}D\\psi(a)\\subseteq T_pM", at: cue.s(17) + 1.5 },
      { label: "3", tex: "\\dim\\operatorname{im}D\\psi(a)=n-k", at: cue.s(23) + 1.5 },
      { label: "4", tex: "\\dim\\ker Dh(p)=n-k", at: cue.s(25) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
    this.ledgerFinal = fl.add({ tex: "T_pM=\\ker Dh(p)\\ \\ \\blacksquare", x: 1400, y: 210, size: 34, color: Palette.yellow, align: "left" });
  }

  private bonusTex(sum: boolean): string {
    const second = "v_1+v_2\\in T_pM\\ \\textcolor{#69db7c}{\\checkmark}";
    return `\\begin{gathered}T_pM\\ \\text{is a vector space}\\\\ \\dim T_pM=n-k\\\\ ${sum ? second : `\\phantom{${second}}`}\\end{gathered}`;
  }

  private curveFormula(n: number): string {
    return Tex.revealLines(["&\\gamma(t)=\\psi(a+t\\xi),\\ \\ |t|<\\varepsilon", "&\\gamma(t)\\in M,\\ \\ \\gamma(0)=p", "&\\gamma'(0)=D\\psi(a)\\,\\xi"], n);
  }

  private injFormula(n: number): string {
    return Tex.revealLines([
      `&D\\psi(a)\\xi=\\begin{pmatrix}${Tex.c(Palette.yellow, "I_{n-k}")}\\\\ Dg(a)\\end{pmatrix}\\xi=\\begin{pmatrix}\\xi\\\\ Dg(a)\\xi\\end{pmatrix}`,
      "&D\\psi(a)\\xi=0\\ \\Rightarrow\\ \\xi=0",
      "&\\dim\\operatorname{im}D\\psi(a)=(n-k)-0=n-k",
    ], n);
  }

  private chainFormula(n: number): string {
    return Tex.reveal(["\\operatorname{im}D\\psi(a)", "\\ \\subseteq\\ T_pM", "\\ \\subseteq\\ \\ker Dh(p)"], n);
  }

  private label(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const f = this.stage.project(world);
    h.set({ x: f.x + dx, y: f.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const az = lerp(-0.95, -0.7, smoothstep(0, ctx.duration, t));
    const lay = keyframes(t, [
      { t: 0, v: { sx: 470, sy: 500, d: 5.8 } },
    ], 1.0);
    Orbit.frame(this.stage, az, 0.5, lay.d, FOV, new THREE.Vector3(0, 0, 0.35), lay.sx, lay.sy);
    this.hud.sync(this.stage, FOV);

    const nestPhase = c.p(26, 0.8) * (1 - c.p(33, 0.8));
    const scene3 = c.p(0, 1.0, -1.6) * (1 - 0.88 * nestPhase);
    // ---- Disk, lift, hemisphere
    const liftS = t < c.s(11) ? 0 : c.over(11, 0.05, 0.9);
    this.diskRim.setOpacity(scene3 * c.p(6, 0.8));
    for (const gl of this.grid) {
      gl.line.setPoints(gl.samples.map((q) => lift(q.x, q.y, liftS)));
      gl.line.setOpacity(scene3 * c.p(6, 0.8) * (liftS > 0.001 ? 0.9 : 0.7));
    }
    this.hemisphere.setOpacity(scene3 * (0.35 + 0.65 * smoothstep(0.6, 1, liftS)) * c.p(0, 0.8));
    this.aDot.setOpacity(scene3 * c.p(6, 0.6));
    this.label(this.aLabel, new THREE.Vector3(A.x, A.y, 0), -6, 26, scene3 * c.p(6, 0.6));
    this.pDot.setOpacity(scene3 * c.p(0, 0.6));
    this.label(this.pLabel, P, -60, -30, scene3 * c.p(9, 0.6));
    this.liftLink.setOpacity(scene3 * c.p(9, 0.6) * 0.8);
    this.label(this.psiLabel, new THREE.Vector3(A.x, A.y, GA * 0.5), 22, 0, scene3 * c.p(9, 0.6));

    // ---- Lines, curves, velocities (s12–s22)
    const linesIn = c.over(12, 0.2, 0.9);
    const curvesIn = c.over(14, 0.1, 0.8);
    for (let k = 0; k < XI_ANGLES.length; k++) {
      const stagger = (k / XI_ANGLES.length) * 0.5;
      this.lines[k].setProgress(1);
      this.lines[k].setOpacity(scene3 * smoothstep(stagger, stagger + 0.5, linesIn));
      this.curves[k].setProgress(smoothstep(stagger, stagger + 0.5, curvesIn));
      this.curves[k].setOpacity(scene3 * (curvesIn > 0 ? 1 : 0));
      this.xiArrows[k].setOpacity(scene3 * c.p(16, 0.6, 0.2 * k));
      this.velArrows[k].setOpacity(scene3 * c.p(16, 0.6, 0.6 + 0.2 * k));
      this.shadows[k].setOpacity(scene3 * c.p(21, 0.6) * (1 - c.p(24, 0.6)));
    }
    this.label(this.xiLabel, new THREE.Vector3(A.x + XI_LEN * 1.15, A.y, 0), 6, 18, scene3 * c.p(12, 0.6) * (1 - c.p(26, 0.6)));

    // ---- Formulas
    this.blockTex.set({ opacity: c.p(3, 0.6) * (1 - c.p(10, 0.6)) });
    this.reorderNote.set({ opacity: c.p(5, 0.6) * (1 - c.p(10, 0.6)) });
    this.splitTex.set({ opacity: c.p(6, 0.6) * (1 - c.p(12, 0.6)) });
    this.graphTex.set({ opacity: c.p(7, 0.6) * (1 - c.p(12, 0.6)) });
    this.hemiTex.set({ opacity: c.p(10, 0.6) * (1 - c.p(12, 0.6)) });
    const cn = t >= c.s(16) ? 3 : t >= c.s(15) ? 2 : t >= c.s(14) ? 1 : 0;
    this.curveTex.setContent(this.curveFormula(cn));
    this.curveTex.set({ opacity: (cn > 0 ? 1 : 0) * (1 - c.p(24, 0.6)) });
    const inN = t >= c.s(23) ? 3 : t >= c.s(22) ? 2 : t >= c.s(19) ? 1 : 0;
    this.injTex.setContent(this.injFormula(inN));
    this.injTex.set({ opacity: (inN > 0 ? 1 : 0) * (1 - c.p(24, 0.6)) });
    this.kerTex.set({ opacity: c.p(24, 0.6) * (1 - c.p(26, 0.6)) });

    // ---- Nested sets and the squeeze (s26–s32)
    const merge = c.over(30, 0.1, 0.8);
    const radii = [
      { rx: lerp(390, 300, merge), ry: lerp(240, 190, merge) },
      { rx: lerp(300, 300, merge), ry: lerp(185, 190, merge) },
      { rx: lerp(200, 300, merge), ry: lerp(120, 190, merge) },
    ];
    const layerShow = [c.p(28, 0.6), c.p(27, 0.6, 0.6), c.p(27, 0.6)];
    for (let i = 0; i < 3; i++) {
      const pts = ellipse(radii[i].rx, radii[i].ry).map((q) => this.nest.v(q.x, q.y, 0.001 * i));
      this.nestFills[i].setPoints(pts);
      this.nestFills[i].setOpacity((i === 1 ? 0.0 : 0.2) * nestPhase * layerShow[i]);
      this.nestOutlines[i].setPoints(pts);
      this.nestOutlines[i].setOpacity(nestPhase * layerShow[i]);
    }
    const labelPos = [
      this.nest.toFrame(0, -lerp(240, 190, merge) - 26),
      this.nest.toFrame(0, -lerp(185, 190, merge) + 30),
      this.nest.toFrame(0, 0),
    ];
    this.nestLabels.forEach((h, i) => {
      const hideMid = i === 2 ? 1 : 1 - smoothstep(0.6, 1, merge);
      h.set({ x: labelPos[i].x, y: labelPos[i].y, opacity: nestPhase * layerShow[i] * hideMid });
    });
    this.nestLabels[2].setContent(merge > 0.5 ? "T_pM=\\ker Dh(p)=\\operatorname{im}D\\psi(a)" : "\\operatorname{im}D\\psi(a)\\ \\ (\\dim n-k)");
    this.nestLabels[0].setContent(t >= c.s(29) ? "\\ker Dh(p)\\ \\ (\\dim n-k)" : "\\ker Dh(p)");
    if (t < c.s(29)) this.nestLabels[2].setContent("\\operatorname{im}D\\psi(a)");
    const chN = t >= c.s(28) ? 3 : t >= c.s(27) ? 2 : t >= c.s(26) ? 1 : 0;
    this.chainTex.setContent(this.chainFormula(chN));
    this.chainTex.set({ opacity: (chN > 0 ? 1 : 0) * (1 - c.p(31, 0.6)) });
    this.finalTex.set({ opacity: c.p(31, 0.6) * (1 - c.p(33, 0.6)) });

    // ---- Back to 3D: the same plane (s33), remarks (s34–s38)
    const planes = c.p(33, 0.8) * (1 - c.p(36, 0.8) * 0.5);
    const flash = t >= c.in(33, 0.4) && t < c.in(33, 0.4) + 0.8 ? 1 + 0.8 * Math.sin((t - c.in(33, 0.4)) * Math.PI / 0.8) : 1;
    this.kerPlane.setOpacity(planes * flash);
    this.tanPlane.setOpacity(planes * flash);
    this.label(this.planeLabel, P.clone().add(new THREE.Vector3(0.0, 0.55, 0.25)), 0, 0, c.p(33, 0.8));
    this.noteRegularity.set({ opacity: c.p(34, 0.6) * (1 - c.p(36, 0.6)) });
    this.noteInjective.set({ opacity: c.p(35, 0.6) * (1 - c.p(36, 0.6)) });
    this.bonus.set({ opacity: c.p(36, 0.6) });
    this.bonus.setContent(this.bonusTex(t >= c.s(37)));
    this.linear.set({ opacity: c.p(38, 0.6) });

    const collapse = c.p(32, 0.8);
    this.ledger.update(t, clamp01(c.p(0, 0.5)) * (1 - collapse));
    this.ledgerFinal.set({ opacity: collapse });
  }

  teardown(_layers: SceneLayers): void {}
}
