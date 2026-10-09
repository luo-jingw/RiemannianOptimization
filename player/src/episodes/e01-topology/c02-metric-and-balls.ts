import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { placeAt } from "./lib/place";
import { Shapes } from "./lib/shapes";
import { tc } from "./lib/tex";

/**
 * E01 c02 — metric, open balls, open sets; open balls are open; the closed disk is not open;
 * d₂ and d_∞ have the same open sets.
 * Sentence indices refer to content/episodes/e01-topology/story.en.json, scene c02-metric-and-balls.
 */

const VIEW = { cx: 1.1667, cy: -0.3, h: 6 };   // world origin at pixel (750, 486)
const R = 1.6;
const Y = new THREE.Vector3(0.75, 0.45, 0);
const DXY = Y.length();
const S = R - DXY;
const B_ANGLE = Math.PI / 6;
const B = new THREE.Vector3(R * Math.cos(B_ANGLE), R * Math.sin(B_ANGLE), 0);
const LEFT_X = 750;

/** Small disk around a point of the boundary circle |p| = R: the part outside the big disk. */
function outsidePart(rho: number): THREE.Vector3[] {
  const phi0 = Math.acos(-rho / (2 * R));
  const gamma = 2 * Math.asin(rho / (2 * R));
  const outer = Shapes.arc(B.x, B.y, rho, B_ANGLE - phi0, B_ANGLE + phi0, 64);
  const inner = Shapes.arc(0, 0, R, B_ANGLE + gamma, B_ANGLE - gamma, 32);
  return [...outer, ...inner];
}

export class MetricBallsScene implements Scene {
  readonly id = "c02-metric-and-balls";
  private stage!: StageLayer;

  private ballFill!: Region;
  private ballEdge!: Polyline;
  private center!: Dot;
  private centerLabel!: FormulaHandle;
  private radius!: Polyline;
  private radiusLabel!: FormulaHandle;
  private ballLabel!: FormulaHandle;
  private axioms!: FormulaHandle;
  private ballDef!: FormulaHandle;
  private openDef!: FormulaHandle;
  private roomBlob!: Region;
  private roomEdge!: Polyline;
  private roomDots: Dot[] = [];
  private roomBalls: Polyline[] = [];
  private roomCenters: THREE.Vector3[] = [];
  private roomRadii: number[] = [];

  // proof that balls are open
  private yDot!: Dot;
  private yLabel!: FormulaHandle;
  private segXY!: Polyline;
  private segS!: Polyline;
  private labelD!: FormulaHandle;
  private labelS!: FormulaHandle;
  private smallFill!: Region;
  private smallEdge!: Polyline;
  private zDot!: Dot;
  private zLabel!: FormulaHandle;
  private pathXYZ!: Polyline;
  private pathXZ!: Polyline;
  private ineq!: FormulaHandle;
  private claim!: FormulaHandle;

  // closed disk
  private closedFill!: Region;
  private closedEdge!: Polyline;
  private bDot!: Dot;
  private bLabel!: FormulaHandle;
  private probeEdge!: Polyline;
  private probeOut!: Region;
  private closedNote!: FormulaHandle;
  private closedDef!: FormulaHandle;

  // d₂ versus d_∞
  private sqBig!: Polyline;
  private sqBigFill!: Region;
  private disk2!: Polyline;
  private disk2Fill!: Region;
  private sqSmall!: Polyline;
  private dInfDef!: FormulaHandle;
  private normIneq!: FormulaHandle;
  private nesting!: FormulaHandle;
  private nestLabels: FormulaHandle[] = [];

  // same open sets
  private uFill!: Region;
  private uEdge!: Polyline;
  private uLabel!: FormulaHandle;
  private ux!: Dot;
  private uxLabel!: FormulaHandle;
  private uDisk!: Polyline;
  private uSquare!: Polyline;
  private uBigSquare!: Polyline;
  private uDiskSame!: Polyline;
  private stepNote!: FormulaHandle;
  private sampleDots: Dot[] = [];
  private sampleDisks: Polyline[] = [];
  private sampleSquares: Polyline[] = [];
  private sameNote!: FormulaHandle;
  private matterNote!: FormulaHandle;
  private question!: FormulaHandle;

  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const o = new THREE.Vector3(0, 0, 0);
    const disk = circlePoints(0, 0, R, 128);

    this.ballFill = new Region(stage, disk, Palette.blue, 0.22);
    this.ballEdge = new Polyline(stage, disk, { color: Palette.blue, width: 3, dashed: true, dashSize: 0.12, gapSize: 0.08 });
    this.center = new Dot(stage, o, Palette.orange, 0.055);
    this.centerLabel = fl.add({ tex: "x", x: 0, y: 0, size: 36, color: Palette.orange });
    this.radius = new Polyline(stage, [o, new THREE.Vector3(-R, 0, 0)], { color: Palette.muted, width: 2.5 });
    this.radiusLabel = fl.add({ tex: "r", x: 0, y: 0, size: 34, color: Palette.muted });
    this.ballLabel = fl.add({ tex: "B_r(x)", x: 0, y: 0, size: 38, color: Palette.blue });
    this.axioms = fl.add({
      tex: "\\begin{aligned}&d:X\\times X\\to[0,\\infty)\\\\[4pt]&\\text{(i)}\\ \\ d(x,y)=0\\iff x=y\\\\&\\text{(ii)}\\ \\ d(x,y)=d(y,x)\\\\&\\text{(iii)}\\ \\ d(x,z)\\le d(x,y)+d(y,z)\\end{aligned}",
      x: LEFT_X, y: 430, size: 46, boxed: true, display: true,
    });
    this.ballDef = fl.add({ tex: "B_r(x)=\\{\\,y\\in X:\\ d(x,y)<r\\,\\}", x: LEFT_X, y: 96, size: 44 });
    this.openDef = fl.add({ tex: "U\\ \\text{open}\\iff \\forall x\\in U\\ \\ \\exists r>0:\\ B_r(x)\\subseteq U", x: LEFT_X, y: 96, size: 44 });
    const room = Shapes.blob(0.2, 0, 1.75, 0.12, 0.07, 0.6, 0.85);
    this.roomBlob = new Region(stage, room, Palette.blue, 0.2);
    this.roomEdge = new Polyline(stage, room, { color: Palette.blue, width: 2.5, dashed: true, dashSize: 0.12, gapSize: 0.08 });
    this.roomCenters = [new THREE.Vector3(-0.6, 0.3, 0), new THREE.Vector3(0.9, -0.5, 0), new THREE.Vector3(1.45, 0.55, 0), new THREE.Vector3(-0.5, -0.65, 0)];
    this.roomRadii = this.roomCenters.map((p) => 0.8 * Shapes.distanceToCurve(p, room));
    this.roomCenters.forEach((p, i) => {
      this.roomDots.push(new Dot(stage, p, Palette.orange, 0.045));
      this.roomBalls.push(new Polyline(stage, circlePoints(p.x, p.y, this.roomRadii[i], 64), { color: Palette.orange, width: 2.5 }));
    });

    // proof
    this.yDot = new Dot(stage, Y, Palette.orange, 0.05);
    this.yLabel = fl.add({ tex: "y", x: 0, y: 0, size: 36, color: Palette.orange });
    const yDir = Y.clone().normalize();
    this.segXY = new Polyline(stage, [o, Y], { color: Palette.text, width: 3 });
    this.segS = new Polyline(stage, [Y, yDir.clone().multiplyScalar(R)], { color: Palette.green, width: 4 });
    this.labelD = fl.add({ tex: "d(x,y)", x: 0, y: 0, size: 30, color: Palette.text });
    this.labelS = fl.add({ tex: "s=r-d(x,y)", x: 0, y: 0, size: 30, color: Palette.green, align: "left" });
    const small = circlePoints(Y.x, Y.y, S, 96);
    this.smallFill = new Region(stage, small, Palette.green, 0.25, -0.005);
    this.smallEdge = new Polyline(stage, small, { color: Palette.green, width: 2.5, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.zDot = new Dot(stage, Y, Palette.yellow, 0.045);
    this.zLabel = fl.add({ tex: "z", x: 0, y: 0, size: 34, color: Palette.yellow });
    this.pathXYZ = new Polyline(stage, [o, Y, Y], { color: Palette.yellow, width: 2.5 });
    this.pathXZ = new Polyline(stage, [o, Y], { color: Palette.yellow, width: 2, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    this.ineq = fl.add({ tex: this.ineqTex(1, 0.5, false), x: LEFT_X, y: 812, size: 38 });
    this.claim = fl.add({ tex: "B_s(y)\\subseteq B_r(x)", x: 0, y: 0, size: 34, color: Palette.green });

    // closed disk
    this.closedFill = new Region(stage, disk, Palette.blue, 0.25);
    this.closedEdge = new Polyline(stage, disk, { color: Palette.blue, width: 4 });
    this.bDot = new Dot(stage, B, Palette.orange, 0.05);
    this.bLabel = fl.add({ tex: "b", x: 0, y: 0, size: 34, color: Palette.orange });
    this.probeEdge = new Polyline(stage, circlePoints(B.x, B.y, 0.5, 96), { color: Palette.orange, width: 2.5 });
    this.probeOut = new Region(stage, outsidePart(0.5), Palette.red, 0.55, 0.002);
    this.closedNote = fl.add({ text: "closed disk is not open", x: 1170, y: 812, size: 36, color: Palette.red });
    this.closedDef = fl.add({ tex: "\\overline{D}=\\{\\,y:\\ \\|y\\|\\le 1\\,\\}", x: LEFT_X, y: 96, size: 44 });

    // d₂ versus d_∞
    const r2 = 1.5;
    this.sqBig = new Polyline(stage, Shapes.square(0, 0, r2), { color: Palette.orange, width: 3.5 });
    this.sqBigFill = new Region(stage, Shapes.square(0, 0, r2), Palette.orange, 0.12, -0.012);
    this.disk2 = new Polyline(stage, circlePoints(0, 0, r2, 128), { color: Palette.blue, width: 3.5 });
    this.disk2Fill = new Region(stage, circlePoints(0, 0, r2, 128), Palette.blue, 0.22, -0.011);
    this.sqSmall = new Polyline(stage, Shapes.square(0, 0, r2 / Math.SQRT2), { color: Palette.orange, width: 3, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    this.dInfDef = fl.add({ tex: "d_\\infty(x,y)=\\max_i\\,|x_i-y_i|", x: LEFT_X, y: 96, size: 44, color: Palette.orange });
    this.normIneq = fl.add({ tex: "\\max_i|v_i|\\ \\le\\ \\|v\\|_2\\ \\le\\ \\sqrt{n}\\,\\max_i|v_i|", x: LEFT_X, y: 812, size: 40 });
    this.nesting = fl.add({ tex: `${tc(Palette.orange, "B^\\infty_{r/\\sqrt n}(x)")}\\ \\subseteq\\ ${tc(Palette.blue, "B^2_r(x)")}\\ \\subseteq\\ ${tc(Palette.orange, "B^\\infty_r(x)")}`, x: LEFT_X, y: 812, size: 42 });
    this.nestLabels = [
      fl.add({ tex: "B^\\infty_r", x: 0, y: 0, size: 32, color: Palette.orange }),
      fl.add({ tex: "B^2_r", x: 0, y: 0, size: 32, color: Palette.blue }),
      fl.add({ tex: "B^\\infty_{r/\\sqrt 2}", x: 0, y: 0, size: 30, color: Palette.orange }),
    ];

    // same open sets
    const u = Shapes.blob(0.1, 0, 2.0, 0.13, 0.08, 1.1, 0.8);
    this.uFill = new Region(stage, u, Palette.purple, 0.18);
    this.uEdge = new Polyline(stage, u, { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.12, gapSize: 0.08 });
    this.uLabel = fl.add({ tex: "U", x: 0, y: 0, size: 40, color: Palette.purple });
    const ux = new THREE.Vector3(0.9, 0.25, 0);
    const rU = 0.85 * Shapes.distanceToCurve(ux, u);
    this.ux = new Dot(stage, ux, Palette.orange, 0.05);
    this.uxLabel = fl.add({ tex: "x", x: 0, y: 0, size: 34, color: Palette.orange });
    this.uDisk = new Polyline(stage, circlePoints(ux.x, ux.y, rU, 96), { color: Palette.blue, width: 3 });
    this.uSquare = new Polyline(stage, Shapes.square(ux.x, ux.y, rU / Math.SQRT2), { color: Palette.orange, width: 3 });
    this.uBigSquare = new Polyline(stage, Shapes.square(ux.x, ux.y, rU / Math.SQRT2), { color: Palette.orange, width: 3 });
    this.uDiskSame = new Polyline(stage, circlePoints(ux.x, ux.y, rU / Math.SQRT2, 96), { color: Palette.blue, width: 3 });
    this.stepNote = fl.add({ tex: this.stepTex(0), x: LEFT_X, y: 812, size: 38 });
    const samples = [new THREE.Vector3(-1.3, 0.2, 0), new THREE.Vector3(0.2, -0.75, 0), new THREE.Vector3(1.5, 0.4, 0)];
    for (const p of samples) {
      const rr = 0.85 * Shapes.distanceToCurve(p, u);
      this.sampleDots.push(new Dot(stage, p, Palette.orange, 0.045));
      this.sampleDisks.push(new Polyline(stage, circlePoints(p.x, p.y, rr, 64), { color: Palette.blue, width: 2.5 }));
      this.sampleSquares.push(new Polyline(stage, Shapes.square(p.x, p.y, rr / Math.SQRT2), { color: Palette.orange, width: 2.5 }));
    }
    this.sameNote = fl.add({ text: "same open sets  ⇒  same notion of nearness", x: LEFT_X, y: 812, size: 36, color: Palette.green });
    this.matterNote = fl.add({ text: "what matters: the collection of open sets", x: LEFT_X, y: 96, size: 40, color: Palette.yellow });
    this.question = fl.add({ text: "open sets as the starting point, without distance?", x: LEFT_X, y: 812, size: 38, color: Palette.text });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "B_r(x)\\ \\text{is open}", at: cue.in(16, 0.6) },
      { label: "2", tex: "\\{\\|y\\|\\le 1\\}\\ \\text{is not open}", at: cue.in(20, 0.7) },
      { label: "3", tex: "B^\\infty_{r/\\sqrt n}\\subseteq B^2_r\\subseteq B^\\infty_r", at: cue.in(25, 0.8) },
      { label: "4", tex: "d_2,\\ d_\\infty:\\ \\text{same open sets}", at: cue.in(30, 0.6) },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private ineqTex(dxz: number, dyz: number, full: boolean): string {
    const n = (v: number): string => v.toFixed(2);
    const top = `d(x,z)\\le d(x,y)+d(y,z)<d(x,y)+s=r`;
    if (!full) return top;
    return `\\underbrace{${n(dxz)}}_{d(x,z)}\\ \\le\\ \\underbrace{${n(DXY)}}_{d(x,y)}+\\underbrace{${n(dyz)}}_{d(y,z)}\\ <\\ ${n(DXY)}+\\underbrace{${n(S)}}_{s}=\\underbrace{${n(R)}}_{r}`;
  }

  private stepTex(step: number): string {
    if (step === 1) return `U\\ \\text{open for}\\ d_2:\\quad ${tc(Palette.orange, "B^\\infty_{r/\\sqrt n}(x)")}\\subseteq ${tc(Palette.blue, "B^2_r(x)")}\\subseteq U`;
    if (step === 2) return `U\\ \\text{open for}\\ d_\\infty:\\quad ${tc(Palette.blue, "B^2_r(x)")}\\subseteq ${tc(Palette.orange, "B^\\infty_r(x)")}\\subseteq U`;
    return "\\phantom{U}";
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;

    // ---- view: zooms toward b while the probe ball shrinks (s19–s20)
    const shrink = c.over(20, 0.05, 0.85);
    const rho = 0.5 * Math.pow(0.1, shrink);
    const zoomIn = c.p(19, 1.0, 1.0) * (1 - c.p(21, 1.0));
    const zoomH = lerp(VIEW.h, Math.max(0.55, rho * 10), zoomIn);
    // At full zoom, b sits at pixel (750, 450).
    const zoomCx = lerp(VIEW.cx, B.x + (210 * zoomH) / 1080, zoomIn);
    const zoomCy = lerp(VIEW.cy, B.y - (90 * zoomH) / 1080, zoomIn);
    stage.setView2D(zoomCx, zoomCy, zoomH);

    // ---- ball, axioms, definitions (s0–s9)
    const ballA = c.p(0, 0.8) * (1 - 0.85 * c.p(1, 0.6)) * (1 - c.p(8, 0.6));
    const ballB = c.p(6, 0.6) * (1 - c.p(8, 0.6));
    const proofBall = c.p(10, 0.6) * (1 - c.p(18, 0.6));
    const ballOn = Math.max(ballA, ballB, proofBall);
    const grow = c.p(0, 1.6, 0.3);
    const rNow = R * Math.max(0.001, grow);
    const disk = circlePoints(0, 0, rNow, 128);
    this.ballFill.setPoints(disk);
    this.ballEdge.setPoints(disk);
    this.ballFill.setOpacity(0.22 * ballOn);
    const dashedEmph = t >= c.s(7) && t < c.s(8);
    this.ballEdge.setWidth(dashedEmph ? 5 : 3);
    this.ballEdge.setColor(dashedEmph ? Palette.yellow : Palette.blue);
    this.ballEdge.setOpacity(ballOn);
    this.center.setOpacity(ballOn);
    placeAt(stage, this.centerLabel, new THREE.Vector3(-0.12, -0.16, 0), 0, 0, ballOn);
    const radOn = ballOn * (1 - c.p(11, 0.6));
    this.radius.setPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-rNow, 0, 0)]);
    this.radius.setOpacity(radOn);
    placeAt(stage, this.radiusLabel, new THREE.Vector3(-rNow / 2, 0.16, 0), 0, 0, radOn);
    placeAt(stage, this.ballLabel, new THREE.Vector3(-1.45, 1.35, 0), 0, 0, ballOn * grow);
    this.axioms.set({ opacity: c.p(1, 0.6, 0.6) * (1 - c.p(6, 0.6)) });
    this.ballDef.set({ opacity: c.p(6, 0.6) * (1 - c.p(8, 0.6)) });
    this.openDef.set({ opacity: c.p(8, 0.6) * (1 - c.p(10, 0.6)) });
    const roomOn = c.p(8, 0.6) * (1 - c.p(10, 0.6));
    this.roomBlob.setOpacity(0.2 * roomOn);
    this.roomEdge.setOpacity(roomOn);
    this.roomDots.forEach((d, i) => {
      const a = roomOn * c.p(8, 0.5, 1.2 + 0.6 * i);
      d.setOpacity(a);
      this.roomBalls[i].setOpacity(a);
    });

    // ---- proof: open balls are open (s10–s17)
    const proofOn = proofBall;
    const yOn = proofOn * c.p(11, 0.5);
    this.yDot.setOpacity(yOn);
    placeAt(stage, this.yLabel, Y, -6, -26, yOn);
    const segOn = proofOn * c.p(11, 0.6, 0.8) * (1 - c.p(13, 0.6));
    this.segXY.setOpacity(segOn);
    this.segS.setOpacity(Math.max(segOn, proofOn * c.p(12, 0.4) * (1 - c.p(13, 0.6))));
    placeAt(stage, this.labelD, Y.clone().multiplyScalar(0.5), -34, -26, segOn);
    placeAt(stage, this.labelS, Y.clone().normalize().multiplyScalar(R + 0.12), 6, -6, segOn);
    const smallOn = proofOn * c.p(12, 0.6, 0.4);
    this.smallFill.setOpacity(0.25 * smallOn);
    this.smallEdge.setOpacity(smallOn);
    placeAt(stage, this.claim, new THREE.Vector3(0.15, -0.55, 0), 0, 0, smallOn * (1 - c.p(13, 0.5)) + proofOn * c.p(15, 0.5) * (1 - c.p(18, 0.5)));
    const zOn = proofOn * c.p(13, 0.5);
    const ang = t >= c.s(13) ? (t - c.s(13)) * 1.1 : 0;
    const rad = S * (0.55 + 0.3 * Math.sin((t >= c.s(13) ? t - c.s(13) : 0) * 0.7));
    const Z = new THREE.Vector3(Y.x + rad * Math.cos(ang + 2.4), Y.y + rad * Math.sin(ang + 2.4), 0);
    this.zDot.setPosition(Z);
    this.zDot.setOpacity(zOn);
    const away = Z.clone().sub(Y).normalize();
    placeAt(stage, this.zLabel, Z, 26 * away.x, -26 * away.y, zOn);
    this.pathXYZ.setPoints([new THREE.Vector3(0, 0, 0), Y, Z]);
    this.pathXYZ.setOpacity(zOn * 0.9);
    this.pathXZ.setPoints([new THREE.Vector3(0, 0, 0), Z]);
    this.pathXZ.setOpacity(zOn);
    const live = t >= c.s(14);
    this.ineq.setContent(this.ineqTex(Z.length(), Z.distanceTo(Y), live && t < c.s(17)));
    const tri = t >= c.s(17);
    this.ineq.set({ opacity: zOn * (1 - c.p(18, 0.5)), color: tri ? Palette.yellow : Palette.text });

    // ---- closed disk (s18–s20)
    const closedOn = c.p(18, 0.6) * (1 - c.p(21, 0.6));
    this.closedFill.setOpacity(0.25 * closedOn * (1 - zoomIn));
    this.closedEdge.setOpacity(closedOn);
    this.closedDef.set({ opacity: closedOn });
    const bOn = closedOn * c.p(19, 0.5);
    this.bDot.setOpacity(bOn);
    this.bDot.setScale(zoomH / VIEW.h);
    placeAt(stage, this.bLabel, B, 22, -22, bOn);
    this.probeEdge.setPoints(circlePoints(B.x, B.y, rho, 96));
    this.probeEdge.setOpacity(bOn * c.p(19, 0.5, 0.6));
    this.probeOut.setPoints(outsidePart(rho));
    this.probeOut.setOpacity(0.55 * bOn * c.p(19, 0.5, 1.2));
    this.closedNote.set({ opacity: closedOn * c.p(20, 0.6, 1.5) });

    // ---- d₂ versus d_∞ (s21–s26)
    const nestOn = c.p(21, 0.6, 0.6) * (1 - c.p(27, 0.6));
    const sqOn = nestOn * c.p(23, 0.6);
    this.disk2.setOpacity(nestOn);
    this.disk2Fill.setOpacity(0.22 * nestOn);
    this.center.setOpacity(Math.max(ballOn, nestOn));
    this.sqBig.setOpacity(sqOn);
    this.sqBigFill.setOpacity(0.12 * sqOn);
    const smallSq = nestOn * c.p(25, 0.6, 1.5);
    this.sqSmall.setOpacity(smallSq);
    placeAt(stage, this.nestLabels[0], new THREE.Vector3(1.5, 1.5, 0), 40, -20, sqOn);
    placeAt(stage, this.nestLabels[1], new THREE.Vector3(-1.06, 1.06, 0), -40, -26, nestOn);
    placeAt(stage, this.nestLabels[2], new THREE.Vector3(0, 0.3, 0), 0, 0, smallSq);
    this.dInfDef.set({ opacity: c.p(22, 0.6) * (1 - c.p(27, 0.6)) });
    this.normIneq.set({ opacity: c.p(24, 0.6) * (1 - c.p(25, 0.5)) });
    this.nesting.set({ opacity: c.p(25, 0.6) * (1 - c.p(27, 0.6)) });

    // ---- same open sets (s27–s34)
    const uOn = c.p(27, 0.6) * (1 - c.p(33, 0.8));
    this.uFill.setOpacity(0.18 * uOn);
    this.uEdge.setOpacity(uOn);
    placeAt(stage, this.uLabel, new THREE.Vector3(-1.9, 1.35, 0), 0, 0, uOn);
    const proofU = uOn * (1 - c.p(31, 0.6));
    this.ux.setOpacity(proofU);
    placeAt(stage, this.uxLabel, new THREE.Vector3(0.9, 0.25, 0), -16, 22, proofU);
    const dir1 = proofU * (1 - c.p(29, 0.5));
    this.uDisk.setOpacity(dir1 * c.p(27, 0.5, 0.8));
    this.uSquare.setOpacity(dir1 * c.p(27, 0.5, 2.6));
    const dir2 = proofU * c.p(29, 0.5);
    this.uBigSquare.setOpacity(dir2);
    this.uDiskSame.setOpacity(dir2 * c.p(29, 0.5, 2.0));
    const step = t >= c.s(29) ? 2 : t >= c.s(27) ? 1 : 0;
    this.stepNote.setContent(this.stepTex(step));
    this.stepNote.set({ opacity: proofU });
    const sampleOn = uOn * c.p(31, 0.5);
    this.sampleDots.forEach((d, i) => {
      const a = sampleOn * c.p(31, 0.5, 0.5 + 0.9 * i);
      d.setOpacity(a);
      this.sampleDisks[i].setOpacity(a);
      this.sampleSquares[i].setOpacity(a);
    });
    this.sameNote.set({ opacity: c.p(32, 0.6) * (1 - c.p(34, 0.6)) });
    this.matterNote.set({ opacity: c.p(33, 0.6) });
    this.question.set({ opacity: c.p(34, 0.6) });

    this.ledger.update(t, 1, true);
  }

  teardown(_layers: SceneLayers): void {}
}
