import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { clamp01, lerp, smoothstep } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { Surface, sphereFn } from "../../primitives/Surface";
import { TangentPlane } from "../../primitives/TangentPlane";
import { Hud } from "./lib/Hud";
import { Orbit } from "./lib/Orbit";
import { PxArrow } from "./lib/PxArrow";
import { PxGroup } from "./lib/PxGroup";
import { TangentBasis } from "./lib/TangentBasis";
import { Tex } from "./lib/Tex";

/**
 * E05 c06 — why regularity matters, and T_xS^{n−1} = x^⊥.
 * (1) S² as the zero set of h̃ = (xᵀx − 1)²: Dh̃ vanishes on S², the kernel is all of R³.
 * (2) The crossing x² − y² = 0 (overlay panel): velocities of curves in the set form two lines, not a vector space.
 * (3) The sphere with the regular equation: the tangent plane x^⊥ follows the moving point.
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c06-regularity-and-sphere.
 */

const FOV = 32;
const P = new THREE.Vector3(0.78, -0.3, 0.45).normalize();
const BASIS = new TangentBasis(P);
const GRAD_SCALE = 0.11;
const CROSS_X = 560;
const CROSS_Y = 450;
const U = 105;                                  // panel pixels per unit in the crossing example

export class RegularitySphereScene implements Scene {
  readonly id = "c06-regularity-and-sphere";
  private stage!: StageLayer;
  private hud!: Hud;
  private sphere!: Surface;
  private pDot!: Dot;
  private pLabel!: FormulaHandle;
  private cardGood!: FormulaHandle;
  private cardBad!: FormulaHandle;
  private goodNormal!: Arrow;
  private goodNormalLabel!: FormulaHandle;
  private kerPlane!: TangentPlane;
  private tanPlane!: TangentPlane;
  private goodKerLabel!: FormulaHandle;
  private badDeriv!: FormulaHandle;
  private testDot!: Dot;
  private badGrad!: Arrow;
  private badGradLabel!: FormulaHandle;
  private radial!: Polyline;
  private cube!: THREE.Mesh;
  private cubeMaterial!: THREE.MeshBasicMaterial;
  private cubeEdges!: THREE.LineSegments;
  private cubeEdgeMaterial!: THREE.LineBasicMaterial;
  private cubeLabel!: FormulaHandle;
  private tooBig!: FormulaHandle;
  private failTex!: FormulaHandle;
  private lessonTex!: FormulaHandle;
  // crossing example
  private panel!: PxGroup;
  private panelBg!: Region;
  private kerFill!: Region;
  private axes: PxArrow[] = [];
  private lineA!: Polyline;
  private lineB!: Polyline;
  private orangeA!: Polyline;
  private orangeB!: Polyline;
  private crossLabels: FormulaHandle[] = [];
  private crossTex!: FormulaHandle;
  private kerFillLabel!: FormulaHandle;
  private genNote!: FormulaHandle;
  private limitTex!: FormulaHandle;
  private ball!: Dot;
  private ballVel!: PxArrow;
  private straightVels: PxArrow[] = [];
  private sumArrow!: PxArrow;
  private sumGhosts: Polyline[] = [];
  private crossMark!: FormulaHandle;
  private notVS!: FormulaHandle;
  // positive side
  private movingPlane!: TangentPlane;
  private movingDot!: Dot;
  private planeVecs: Arrow[] = [];
  private sphereTex!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.hud = new Hud(stage);
    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.5 });
    this.pDot = new Dot(stage, P, Palette.orange, 0.04, "3d");
    this.pLabel = fl.add({ tex: "p", x: 0, y: 0, size: 36, color: Palette.orange });
    this.cardGood = fl.add({ tex: "h(x)=x^{\\top}x,\\quad c=1", x: 330, y: 100, size: 36, boxed: true, color: Palette.green });
    this.cardBad = fl.add({ tex: "\\tilde h(x)=(x^{\\top}x-1)^2,\\quad c=0", x: 980, y: 100, size: 36, boxed: true, color: Palette.red });

    this.goodNormal = new Arrow(stage, P, P.clone().multiplyScalar(1.7), Palette.red, { mode: "3d", headLength: 0.1, width: 5 });
    this.goodNormalLabel = fl.add({ tex: "\\nabla h(p)=2p", x: 0, y: 0, size: 30, color: Palette.red });
    this.kerPlane = new TangentPlane(stage, Palette.purple, 0.72);
    this.kerPlane.place(P, P);
    this.tanPlane = new TangentPlane(stage, Palette.orange, 0.58);
    this.tanPlane.place(P.clone().multiplyScalar(1.003), P);
    this.goodKerLabel = fl.add({ tex: "\\ker Dh(p)=p^{\\perp}=T_pS^2", x: 330, y: 170, size: 30, color: Palette.purple });

    this.badDeriv = fl.add({ tex: this.badTex(0), x: 1010, y: 330, size: 30, display: true });
    this.testDot = new Dot(stage, P, Palette.text, 0.035, "3d");
    this.badGrad = new Arrow(stage, P, P.clone().multiplyScalar(2), Palette.red, { mode: "3d", headLength: 0.1, width: 5 });
    this.badGradLabel = fl.add({ tex: "\\nabla\\tilde h(x)=4(\\|x\\|^2-1)\\,x", x: 0, y: 0, size: 28, color: Palette.red });
    this.radial = new Polyline(stage, [P, P.clone().multiplyScalar(1.8)], { color: Palette.muted, width: 1.5, dashed: true, dashSize: 0.04, gapSize: 0.03 });

    const box = new THREE.BoxGeometry(1.75, 1.75, 1.75);
    this.cubeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(Palette.purple), transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
    this.cube = new THREE.Mesh(box, this.cubeMaterial);
    stage.root.add(this.cube);
    this.cubeEdgeMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(Palette.purple), transparent: true, opacity: 0.8 });
    this.cubeEdges = new THREE.LineSegments(new THREE.EdgesGeometry(box), this.cubeEdgeMaterial);
    stage.root.add(this.cubeEdges);
    this.cubeLabel = fl.add({ tex: "\\ker D\\tilde h(p)=\\mathbb{R}^3", x: 0, y: 0, size: 34, color: Palette.purple });
    this.tooBig = fl.add({ tex: "\\text{kernel too big: } \\dim 3\\neq 2", x: 1010, y: 560, size: 34, color: Palette.red, boxed: true });
    this.failTex = fl.add({ tex: this.failFormula(0), x: 1010, y: 360, size: 30, display: true });
    this.lessonTex = fl.add({ tex: "\\text{the conclusion depends on the equation, not only on the set}", x: 750, y: 790, size: 32, color: Palette.yellow });

    // ---- Crossing example (overlay panel)
    this.panel = new PxGroup(this.hud);
    this.panel.place(CROSS_X, CROSS_Y, 1);
    const w = 2.6 * U;
    const h = 2.6 * U;
    const rect = (hw: number, hh: number): THREE.Vector3[] => [this.panel.v(-hw, -hh), this.panel.v(hw, -hh), this.panel.v(hw, hh), this.panel.v(-hw, hh)];
    this.panelBg = new Region(stage, rect(w, h), Palette.panel, 0.95, -0.05);
    this.panel.adopt(this.panelBg.object);
    this.panelBg.object.position.z = -0.05;
    this.kerFill = new Region(stage, rect(2.4 * U, 2.4 * U), Palette.purple, 0.18, -0.03);
    this.panel.adopt(this.kerFill.object);
    this.kerFill.object.position.z = -0.03;
    const ax = new PxArrow(stage, this.panel, Palette.axis, 14, 2.5);
    ax.set(-2.4 * U, 0, 2.45 * U, 0);
    const ay = new PxArrow(stage, this.panel, Palette.axis, 14, 2.5);
    ay.set(0, 2.4 * U, 0, -2.45 * U);
    this.axes = [ax, ay];
    const L = 2.2 * U;
    this.lineA = new Polyline(stage, [this.panel.v(-L, L), this.panel.v(L, -L)], { color: Palette.blue, width: 6 });
    this.lineB = new Polyline(stage, [this.panel.v(-L, -L), this.panel.v(L, L)], { color: Palette.blue, width: 6 });
    this.orangeA = new Polyline(stage, [this.panel.v(-L, L, 0.01), this.panel.v(L, -L, 0.01)], { color: Palette.orange, width: 9 });
    this.orangeB = new Polyline(stage, [this.panel.v(-L, -L, 0.01), this.panel.v(L, L, 0.01)], { color: Palette.orange, width: 9 });
    [this.lineA, this.lineB, this.orangeA, this.orangeB].forEach((l) => this.panel.adopt(l.object));
    this.crossLabels = [
      fl.add({ tex: "y=x", x: 0, y: 0, size: 30, color: Palette.blue }),
      fl.add({ tex: "y=-x", x: 0, y: 0, size: 30, color: Palette.blue }),
    ];
    this.crossTex = fl.add({ tex: "h(x,y)=x^2-y^2,\\ \\ c=0,\\qquad Dh(0,0)=(2x,\\,-2y)\\big|_{0}=(0\\ \\ 0)", x: 750, y: 100, size: 34 });
    this.kerFillLabel = fl.add({ tex: "\\ker Dh(0)=\\mathbb{R}^2", x: CROSS_X - 2.35 * U + 8, y: CROSS_Y - 0.4 * U, size: 28, color: Palette.purple, align: "left" });
    this.genNote = fl.add({ text: "generalization: velocities of curves inside any subset", x: 640, y: 146, size: 24, color: Palette.muted });
    this.limitTex = fl.add({ tex: this.limitFormula(0), x: 1130, y: 420, size: 32, display: true });
    this.ball = new Dot(stage, new THREE.Vector3(), Palette.text, 9, "2d");
    this.panel.adopt(this.ball.object);
    this.ballVel = new PxArrow(stage, this.panel, Palette.orange, 18, 5);
    for (let i = 0; i < 2; i++) this.straightVels.push(new PxArrow(stage, this.panel, Palette.orange, 18, 5));
    this.sumArrow = new PxArrow(stage, this.panel, Palette.red, 18, 5);
    this.sumGhosts = [
      new Polyline(stage, [this.panel.v(U, -U), this.panel.v(2 * U, 0)], { color: Palette.muted, width: 2, dashed: true, dashSize: 10, gapSize: 7 }),
      new Polyline(stage, [this.panel.v(U, U), this.panel.v(2 * U, 0)], { color: Palette.muted, width: 2, dashed: true, dashSize: 10, gapSize: 7 }),
    ];
    this.sumGhosts.forEach((l) => this.panel.adopt(l.object));
    this.crossMark = fl.add({ tex: "\\boldsymbol{\\times}\\ (2,0)", x: 0, y: 0, size: 40, color: Palette.red });
    this.notVS = fl.add({ tex: "\\{(s,s)\\}\\cup\\{(s,-s)\\}\\ \\neq\\ \\mathbb{R}^2", x: 1130, y: 640, size: 34, color: Palette.orange, boxed: true });

    // ---- Positive side
    this.movingPlane = new TangentPlane(stage, Palette.orange, 0.55);
    this.movingDot = new Dot(stage, P, Palette.orange, 0.04, "3d");
    for (let i = 0; i < 3; i++) this.planeVecs.push(new Arrow(stage, P, P.clone().add(BASIS.e1), Palette.orange, { mode: "3d", headLength: 0.08, width: 4 }));
    this.sphereTex = fl.add({ tex: this.sphereFormula(0), x: 1040, y: 420, size: 32, display: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\text{regular}\\Rightarrow\\ker\\ \\text{right size}", at: cue.s(16) + 2.0 },
      { label: "2", tex: "\\text{crossing: velocities}=\\text{two lines}", at: cue.s(31) + 1.5 },
      { label: "3", tex: "T_xS^{n-1}=x^{\\perp}", at: cue.s(38) + 1.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private badTex(n: number): string {
    return Tex.revealLines([
      "&D\\tilde h(x)[v]=2(x^{\\top}x-1)\\cdot 2x^{\\top}v",
      "&\\phantom{D\\tilde h(x)[v]}=4(x^{\\top}x-1)\\,x^{\\top}v",
      `&x\\in S^2:\\ \\ ${Tex.c(Palette.red, "x^{\\top}x-1=0\\ \\Rightarrow\\ D\\tilde h(x)=0")}`,
    ], n);
  }

  private failFormula(n: number): string {
    return Tex.revealLines([
      `&\\text{step 1: } T_pS^2\\subseteq\\ker=\\mathbb{R}^3\\ \\ ${Tex.c(Palette.green, "\\checkmark")}`,
      `&\\text{step 2: } D_y\\tilde h(p)=0\\ \\ ${Tex.c(Palette.red, "\\text{not invertible}")}`,
      `&\\Rightarrow\\ \\text{no } g,\\ \\text{no }\\psi,\\ ${Tex.c(Palette.red, "\\text{no squeeze}")}`,
    ], n);
  }

  private limitFormula(n: number): string {
    return Tex.revealLines([
      "&\\gamma(t)=(x(t),y(t)),\\ \\ \\gamma'(0)=(u,w)",
      "&|x(t)|=|y(t)|\\ \\ \\forall t",
      "&x(t)=ut+o(t),\\ \\ y(t)=wt+o(t)",
      `&\\Big|\\tfrac{x(t)}{t}\\Big|=\\Big|\\tfrac{y(t)}{t}\\Big|\\ \\xrightarrow{t\\to0}\\ ${Tex.c(Palette.orange, "|u|=|w|")}`,
    ], n);
  }

  private sphereFormula(n: number): string {
    return Tex.revealLines([
      "&h(x)=x^{\\top}x,\\quad Dh(x)[v]=2x^{\\top}v",
      "&x\\in S^{n-1}\\Rightarrow x\\neq0\\Rightarrow \\operatorname{rank}Dh(x)=1",
      `&T_xS^{n-1}=\\ker Dh(x)=\\{v:\\,x^{\\top}v=0\\}`,
      `&${Tex.c(Palette.yellow, "T_xS^{n-1}=x^{\\perp},\\quad \\dim=n-1")}`,
    ], n);
  }

  private label(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const f = this.stage.project(world);
    h.set({ x: f.x + dx, y: f.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const az = lerp(-1.0, -0.85, smoothstep(0, ctx.duration, t));
    Orbit.frame(this.stage, az, 0.4, 7.6, FOV, new THREE.Vector3(0, 0, 0), 470, 480);
    this.hud.sync(this.stage, FOV);

    const crossPhase = c.p(18, 0.8) * (1 - c.p(34, 0.8));
    const sphereVis = c.p(0, 1.0, -1.6) * (1 - crossPhase);
    this.sphere.setOpacity(sphereVis);
    const firstPart = 1 - c.p(18, 0.8);
    this.pDot.setOpacity(sphereVis * firstPart);
    this.label(this.pLabel, P, -24, -22, sphereVis * firstPart);
    this.cardGood.set({ opacity: c.p(1, 0.6) * firstPart });
    this.cardBad.set({ opacity: c.p(1, 0.6, 0.4) * firstPart });

    // Good equation (s4–s5)
    const good = c.p(4, 0.6) * (1 - c.p(6, 0.6));
    this.goodNormal.setOpacity(good);
    this.label(this.goodNormalLabel, P.clone().multiplyScalar(1.8), 0, -18, good);
    const kerGood = c.p(4, 0.8, 1.0) * (1 - c.p(6, 0.6));
    this.kerPlane.setOpacity(kerGood);
    this.goodKerLabel.set({ opacity: c.p(4, 0.6, 1.0) * firstPart });
    const tanShow = c.p(5, 0.6) * firstPart;
    this.tanPlane.setOpacity(tanShow);

    // Bad equation (s6–s12)
    const bn = t >= c.s(8) ? 3 : t >= c.s(7) ? 2 : t >= c.s(6) ? 1 : 0;
    this.badDeriv.setContent(this.badTex(bn));
    this.badDeriv.set({ opacity: (bn > 0 ? 1 : 0) * (1 - c.p(13, 0.6)) });
    const testVis = c.p(9, 0.5) * (1 - c.p(11, 0.6));
    const r = lerp(1.75, 1.0, c.over(9, 0.1, 0.85));
    const x = P.clone().multiplyScalar(r);
    const gradLen = 4 * (r * r - 1) * r * GRAD_SCALE;
    this.testDot.setPosition(x);
    this.testDot.setOpacity(testVis);
    this.badGrad.set(x, x.clone().addScaledVector(P, gradLen));
    this.badGrad.setOpacity(testVis * (gradLen > 0.01 ? 1 : 0));
    this.label(this.badGradLabel, x.clone().addScaledVector(P, gradLen + 0.1), -150, -30, testVis);
    this.radial.setOpacity(testVis);
    const cube = c.p(10, 1.0) * (1 - c.p(13, 0.8));
    const swell = smoothstep(0, 1, c.over(10, 0.1, 0.8));
    this.cube.scale.setScalar(lerp(0.15, 1, swell));
    this.cubeEdges.scale.setScalar(lerp(0.15, 1, swell));
    this.cube.position.copy(P.clone().multiplyScalar(1 - swell));
    this.cubeEdges.position.copy(this.cube.position);
    this.cubeMaterial.opacity = 0.1 * cube;
    this.cube.visible = cube > 0.001;
    this.cubeEdgeMaterial.opacity = 0.8 * cube;
    this.cubeEdges.visible = cube > 0.001;
    this.cubeLabel.set({ x: 470, y: 828, opacity: cube * swell });
    this.tooBig.set({ opacity: c.p(12, 0.6) * (1 - c.p(13, 0.6)) });
    const fn = t >= c.s(16) ? 3 : t >= c.s(15) ? 2 : t >= c.s(14) ? 1 : 0;
    this.failTex.setContent(this.failFormula(fn));
    this.failTex.set({ opacity: (fn > 0 ? 1 : 0) * firstPart });
    this.lessonTex.set({ opacity: c.p(17, 0.6) * firstPart });

    // ---- Crossing example (s18–s33)
    this.panelBg.setOpacity(0.95 * crossPhase);
    this.axes.forEach((a) => a.setOpacity(crossPhase));
    const linesIn = c.p(20, 0.8);
    this.lineA.setOpacity(crossPhase * linesIn);
    this.lineB.setOpacity(crossPhase * linesIn);
    const labA = this.panel.toFrame(1.95 * U, -1.2 * U);
    const labB = this.panel.toFrame(1.95 * U, 1.2 * U);
    this.crossLabels[0].set({ x: labA.x, y: labA.y, opacity: crossPhase * linesIn });
    this.crossLabels[1].set({ x: labB.x, y: labB.y, opacity: crossPhase * linesIn });
    this.crossTex.set({ opacity: c.p(19, 0.6) * (1 - c.p(34, 0.6)) });
    this.crossTex.setContent(t >= c.s(21)
      ? "h(x,y)=x^2-y^2,\\ \\ c=0,\\qquad Dh(0,0)=(2x,\\,-2y)\\big|_{0}=(0\\ \\ 0)"
      : "h(x,y)=x^2-y^2,\\ \\ c=0,\\qquad \\phantom{Dh(0,0)=(2x,\\,-2y)\\big|_{0}=(0\\ \\ 0)}");
    const fill = c.p(21, 0.8) * crossPhase;
    this.kerFill.setOpacity(0.18 * fill);
    this.kerFillLabel.set({ opacity: fill });
    this.genNote.set({ opacity: c.p(22, 0.6) * (1 - c.p(24, 0.6)) });
    const ln = t >= c.s(27) ? 4 : t >= c.s(26) ? 3 : t >= c.s(25) ? 2 : t >= c.s(24) ? 1 : 0;
    this.limitTex.setContent(this.limitFormula(ln));
    this.limitTex.set({ opacity: (ln > 0 ? 1 : 0) * (1 - c.p(30, 0.6)) * crossPhase });
    // Straight curves (s28–s29), then the switching curve (s30).
    const orange = c.p(28, 0.6) * crossPhase;
    this.orangeA.setOpacity(orange * 0.8);
    this.orangeB.setOpacity(orange * 0.8);
    const sv = c.p(29, 0.6) * (1 - c.p(30, 0.4)) * crossPhase;
    this.straightVels[0].set(0, 0, U, -U);
    this.straightVels[1].set(0, 0, U, U);
    this.straightVels.forEach((a) => a.setOpacity(sv));
    const sw = c.p(30, 0.4) * (1 - c.p(32, 0.4)) * crossPhase;
    const tt = lerp(-1.25, 1.25, c.over(30, 0.05, 0.95));
    const bx = tt * tt * tt;
    const by = Math.abs(tt) * tt * tt;
    this.ball.setPosition(this.panel.v(bx * U, -by * U, 0.03));
    this.ball.setOpacity(sw);
    const vx = 3 * tt * tt * 0.25;
    const vy = (tt >= 0 ? 3 * tt * tt : -3 * tt * tt) * 0.25;
    this.ballVel.set(bx * U, -by * U, (bx + vx) * U, -(by + vy) * U);
    this.ballVel.setOpacity(sw);
    // Sum (s32–s33)
    const sum = c.p(32, 0.6) * crossPhase;
    this.straightVels.forEach((a) => a.setOpacity(Math.max(sv, sum)));
    this.sumGhosts.forEach((g) => g.setOpacity(sum * 0.8));
    this.sumArrow.set(0, 0, 2 * U, 0);
    this.sumArrow.setOpacity(c.p(32, 0.6, 1.2) * crossPhase);
    const cm = this.panel.toFrame(2 * U + 20, -34);
    this.crossMark.set({ x: cm.x, y: cm.y, opacity: c.p(32, 0.6, 2.0) * crossPhase });
    this.notVS.set({ opacity: c.p(31, 0.6) * crossPhase });

    // ---- Positive side (s34–s41)
    const pos = c.p(34, 0.8);
    const wander = c.over(40, 0.05, 0.95);
    const q = BASIS.geodesic(0.4 + 1.2 * wander, 0.9 * Math.sin(Math.PI * wander));
    this.movingDot.setPosition(q);
    this.movingDot.setOpacity(pos);
    this.movingPlane.place(q.clone().multiplyScalar(1.003), q);
    this.movingPlane.setOpacity(pos * c.p(37, 0.8));
    const qb = new TangentBasis(q);
    const dirs = [0.3, 2.3, 4.2];
    this.planeVecs.forEach((a, i) => {
      const d = qb.e1.clone().multiplyScalar(Math.cos(dirs[i])).addScaledVector(qb.e2, Math.sin(dirs[i]));
      a.set(q, q.clone().addScaledVector(d, 0.5));
      a.setOpacity(pos * c.p(38, 0.6, 0.3 * i));
    });
    const sn = t >= c.s(38) ? 4 : t >= c.s(37) ? 3 : t >= c.s(36) ? 2 : t >= c.s(35) ? 1 : 0;
    this.sphereTex.setContent(this.sphereFormula(sn));
    this.sphereTex.set({ opacity: (sn > 0 ? 1 : 0) });

    this.ledger.update(t, clamp01(c.p(16, 0.5, 2.0)));
  }

  teardown(_layers: SceneLayers): void {}
}
