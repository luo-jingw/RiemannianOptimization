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
 * E05 c10 — SO(n): det R = ±1, O(2) as two circles, det cannot jump, SO(n) open and closed in O(n),
 * same tangent space; SO(3): generators L_x, L_y, L_z, Ωv = ω × v, velocity RΩ; recap; bridge to E06.
 * Sentences 0–18 use a pixel-space overlay (2D schematic of O(2)); sentences 19–40 use the 3D frame and sphere.
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c10-so3-and-bridge.
 */

const FOV = 32;
const C1 = { x: 330, y: 470 };          // det = +1 circle (rotations)
const C2 = { x: 900, y: 470 };          // det = −1 circle (reflections)
const RAD = 140;
const FRAME_C = { x: 615, y: 470 };
const W_RADIUS = 62;
const R0_ANGLE = 0.9;
const OMEGA = new THREE.Vector3(0.45, 0.35, 0.82).normalize();
const AXIS_LEN = 1.15;
const POSE = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, -0.35, 0.6));
const SPHERE_C = new THREE.Vector3(0, -1.6, 0);
const FRAME_SIDE = new THREE.Vector3(0, 1.9, 0);

export class So3BridgeScene implements Scene {
  readonly id = "c10-so3-and-bridge";
  private stage!: StageLayer;
  private hud!: Hud;
  private ov!: PxGroup;
  // 2D part
  private circles: Polyline[] = [];
  private circleLabels: FormulaHandle[] = [];
  private mover1!: Dot;
  private mover2!: Dot;
  private frameAxes: PxArrow[] = [];
  private frameCircle!: Polyline;
  private frameLabel!: FormulaHandle;
  private path!: Polyline;
  private pathBreak!: Polyline;
  private breakLabel!: FormulaHandle;
  private detAxis: PxArrow[] = [];
  private detCurve!: Polyline;
  private detZero!: Dot;
  private detLabels: FormulaHandle[] = [];
  private wDisc!: Region;
  private wOutline!: Polyline;
  private wLabel!: FormulaHandle;
  private r0Dot!: Dot;
  private r0Label!: FormulaHandle;
  private localArc!: Polyline;
  private localVel!: PxArrow;
  private detTex!: FormulaHandle;
  private soDef!: FormulaHandle;
  private wTex!: FormulaHandle;
  private tangentTex!: FormulaHandle;
  private connectNote!: FormulaHandle;
  private ledger!: ProofLedger;
  // 3D part
  private refAxes: Polyline[] = [];
  private refLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private axes3: Arrow[] = [];
  private vel3: Arrow[] = [];
  private omegaArrow!: Arrow;
  private omegaLabel!: FormulaHandle;
  private dimTex!: FormulaHandle;
  private gens: FormulaHandle[] = [];
  private combo!: FormulaHandle;
  private cross!: FormulaHandle;
  private dofNote!: FormulaHandle;
  private poseTex!: FormulaHandle;
  private nodes: FormulaHandle[] = [];
  private reviewTitle!: FormulaHandle;
  private sphere!: Surface;
  private plane!: TangentPlane;
  private pDot!: Dot;
  private candidates: Arrow[] = [];
  private stepLine!: Polyline;
  private stepArrow!: Arrow;
  private q1!: FormulaHandle;
  private q2!: FormulaHandle;
  private nextNote!: FormulaHandle;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.hud = new Hud(stage);
    this.ov = new PxGroup(this.hud);

    // ---- 2D schematic of O(2)
    [C1, C2].forEach((cc, i) => {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 120; k++) pts.push(this.ov.v(cc.x + RAD * Math.cos((2 * Math.PI * k) / 120), cc.y + RAD * Math.sin((2 * Math.PI * k) / 120)));
      const line = new Polyline(stage, pts, { color: i === 0 ? Palette.blue : Palette.purple, width: 5 });
      this.ov.adopt(line.object);
      this.circles.push(line);
    });
    this.circleLabels = [
      fl.add({ tex: "\\det=+1:\\ R(\\theta)", x: C1.x, y: C1.y + RAD + 42, size: 32, color: Palette.blue }),
      fl.add({ tex: "\\det=-1:\\ R(\\theta)\\,\\mathrm{diag}(1,-1)", x: C2.x, y: C2.y + RAD + 42, size: 32, color: Palette.purple }),
    ];
    this.mover1 = this.ovDot(Palette.orange, 10);
    this.mover2 = this.ovDot(Palette.orange, 10);
    this.frameAxes = [new PxArrow(stage, this.ov, Palette.red, 16, 5), new PxArrow(stage, this.ov, Palette.green, 16, 5)];
    const fpts: THREE.Vector3[] = [];
    for (let k = 0; k <= 80; k++) fpts.push(this.ov.v(FRAME_C.x + 85 * Math.cos((2 * Math.PI * k) / 80), FRAME_C.y + 85 * Math.sin((2 * Math.PI * k) / 80)));
    this.frameCircle = new Polyline(stage, fpts, { color: Palette.grid, width: 2 });
    this.ov.adopt(this.frameCircle.object);
    this.frameLabel = fl.add({ tex: "\\text{columns of the matrix}", x: FRAME_C.x, y: FRAME_C.y - 120, size: 26, color: Palette.muted });

    const bez = (s: number): { x: number; y: number } => {
      const a = { x: C1.x + RAD, y: C1.y };
      const b = { x: FRAME_C.x, y: 250 };
      const d = { x: C2.x - RAD, y: C2.y };
      return { x: (1 - s) * (1 - s) * a.x + 2 * s * (1 - s) * b.x + s * s * d.x, y: (1 - s) * (1 - s) * a.y + 2 * s * (1 - s) * b.y + s * s * d.y };
    };
    const seg = (s0: number, s1: number): THREE.Vector3[] => {
      const out: THREE.Vector3[] = [];
      for (let k = 0; k <= 40; k++) {
        const q = bez(s0 + ((s1 - s0) * k) / 40);
        out.push(this.ov.v(q.x, q.y, 0.01));
      }
      return out;
    };
    this.path = new Polyline(stage, seg(0, 1), { color: Palette.text, width: 3, dashed: true, dashSize: 10, gapSize: 8 });
    this.ov.adopt(this.path.object);
    this.pathBreak = new Polyline(stage, seg(0.4, 0.6), { color: Palette.red, width: 7 });
    this.ov.adopt(this.pathBreak.object);
    const mid = bez(0.5);
    this.breakLabel = fl.add({ tex: "\\det=0\\ \\Rightarrow\\ \\notin O(n)", x: mid.x, y: mid.y - 34, size: 30, color: Palette.red });
    const dx0 = 430;
    const dx1 = 800;
    const dy = 760;
    const ax = new PxArrow(stage, this.ov, Palette.axis, 12, 2.5);
    ax.set(dx0, dy, dx1 + 20, dy);
    const ay = new PxArrow(stage, this.ov, Palette.axis, 12, 2.5);
    ay.set(dx0, dy + 62, dx0, dy - 70);
    this.detAxis = [ax, ay];
    const dpts: THREE.Vector3[] = [];
    for (let k = 0; k <= 60; k++) {
      const s = k / 60;
      dpts.push(this.ov.v(lerp(dx0, dx1, s), dy - 52 * Math.cos(Math.PI * s), 0.01));
    }
    this.detCurve = new Polyline(stage, dpts, { color: Palette.yellow, width: 4 });
    this.ov.adopt(this.detCurve.object);
    this.detZero = this.ovDot(Palette.red, 8);
    this.detZero.setPosition(this.ov.v((dx0 + dx1) / 2, dy, 0.02));
    this.detLabels = [
      fl.add({ tex: "+1", x: dx0 - 26, y: dy - 52, size: 26, color: Palette.muted }),
      fl.add({ tex: "-1", x: dx0 - 26, y: dy + 52, size: 26, color: Palette.muted }),
      fl.add({ tex: "\\det\\ \\text{along the path}", x: dx1 + 20, y: dy - 50, size: 26, color: Palette.yellow, align: "left" }),
    ];

    const r0 = { x: C1.x + RAD * Math.cos(R0_ANGLE), y: C1.y - RAD * Math.sin(R0_ANGLE) };
    const wp: THREE.Vector3[] = [];
    for (let k = 0; k <= 80; k++) wp.push(this.ov.v(r0.x + W_RADIUS * Math.cos((2 * Math.PI * k) / 80), r0.y + W_RADIUS * Math.sin((2 * Math.PI * k) / 80)));
    this.wDisc = new Region(stage, wp, Palette.green, 0.2, -0.02);
    this.ov.adopt(this.wDisc.object);
    this.wDisc.object.position.z = -0.02;
    this.wOutline = new Polyline(stage, wp, { color: Palette.green, width: 2.5 });
    this.ov.adopt(this.wOutline.object);
    this.wLabel = fl.add({ tex: "W:\\ \\det>0", x: r0.x + 70, y: r0.y - 72, size: 30, color: Palette.green, align: "left" });
    this.r0Dot = this.ovDot(Palette.orange, 9);
    this.r0Dot.setPosition(this.ov.v(r0.x, r0.y, 0.03));
    this.r0Label = fl.add({ tex: "R_0", x: r0.x - 30, y: r0.y + 26, size: 30, color: Palette.orange });
    const arc: THREE.Vector3[] = [];
    for (let k = 0; k <= 30; k++) {
      const a = R0_ANGLE - 0.32 + (0.64 * k) / 30;
      arc.push(this.ov.v(C1.x + RAD * Math.cos(a), C1.y - RAD * Math.sin(a), 0.02));
    }
    this.localArc = new Polyline(stage, arc, { color: Palette.orange, width: 7 });
    this.ov.adopt(this.localArc.object);
    this.localVel = new PxArrow(stage, this.ov, Palette.orange, 16, 5);
    this.localVel.set(r0.x, r0.y, r0.x - 70 * Math.sin(R0_ANGLE), r0.y - 70 * Math.cos(R0_ANGLE));

    this.detTex = fl.add({ tex: this.detFormula(0), x: 750, y: 96, size: 38 });
    this.soDef = fl.add({ tex: "SO(n)=\\{R\\in O(n):\\ \\det R=+1\\}", x: 750, y: 170, size: 38, color: Palette.yellow });
    this.wTex = fl.add({ tex: this.wFormula(0), x: 750, y: 760, size: 32 });
    this.tangentTex = fl.add({ tex: "T_R\\,SO(n)=T_R\\,O(n)=R\\cdot\\mathrm{Skew}(n),\\qquad \\dim SO(n)=\\tfrac{n(n-1)}{2}", x: 750, y: 760, size: 36, boxed: true, color: Palette.yellow });
    this.connectNote = fl.add({ tex: "\\text{Connectedness of } SO(n)\\text{: not proved, not needed}", x: 750, y: 170, size: 32, color: Palette.muted });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "1", tex: "\\det R=\\pm 1", at: cue.s(2) + 2.5 },
      { label: "2", tex: "W\\cap O(n)\\subseteq SO(n)", at: cue.s(13) + 3.0 },
      { label: "3", tex: "SO(n)\\ \\text{open \\& closed in } O(n)", at: cue.s(14) + 3.0 },
      { label: "4", tex: "T_R\\,SO(n)=R\\cdot\\mathrm{Skew}(n)", at: cue.s(17) + 2.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });

    // ---- 3D: reference axes, rotating frame, generators
    const ref = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    ref.forEach((e, i) => {
      const line = new Polyline(stage, [e.clone().multiplyScalar(-1.5), e.clone().multiplyScalar(1.5)], { color: Palette.grid, width: 2 });
      this.refAxes.push(line);
      this.refLabels.push({ h: fl.add({ tex: ["x", "y", "z"][i], x: 0, y: 0, size: 28, color: Palette.muted }), at: e.clone().multiplyScalar(1.65) });
    });
    const cols = [Palette.red, Palette.green, Palette.blue];
    for (let i = 0; i < 3; i++) {
      this.axes3.push(new Arrow(stage, new THREE.Vector3(), ref[i], cols[i], { mode: "3d", headLength: 0.14, width: 6 }));
      this.vel3.push(new Arrow(stage, ref[i], ref[i].clone().multiplyScalar(1.3), Palette.orange, { mode: "3d", headLength: 0.11, width: 4 }));
    }
    this.omegaArrow = new Arrow(stage, OMEGA.clone().multiplyScalar(-1.5), OMEGA.clone().multiplyScalar(1.6), "#ffffff", { mode: "3d", headLength: 0.14, width: 3 });
    this.omegaLabel = fl.add({ tex: "\\omega", x: 0, y: 0, size: 36 });
    this.dimTex = fl.add({ tex: "\\dim SO(3)=\\tfrac{3\\cdot 2}{2}=3", x: 1400, y: 330, size: 40, color: Palette.yellow });
    const gx = "L_x=\\begin{pmatrix}0&0&0\\\\0&0&-1\\\\0&1&0\\end{pmatrix}";
    const gy = "L_y=\\begin{pmatrix}0&0&1\\\\0&0&0\\\\-1&0&0\\end{pmatrix}";
    const gz = "L_z=\\begin{pmatrix}0&-1&0\\\\1&0&0\\\\0&0&0\\end{pmatrix}";
    [gx, gy, gz].forEach((g, i) => this.gens.push(fl.add({ tex: g, x: 420 + 540 * i, y: 120, size: 32, display: true })));
    this.combo = fl.add({ tex: "\\Omega=\\omega_1L_x+\\omega_2L_y+\\omega_3L_z=\\begin{pmatrix}0&-\\omega_3&\\omega_2\\\\ \\omega_3&0&-\\omega_1\\\\ -\\omega_2&\\omega_1&0\\end{pmatrix}", x: 1480, y: 330, size: 30, display: true });
    this.cross = fl.add({ tex: this.crossFormula(0), x: 760, y: 800, size: 32 });
    this.dofNote = fl.add({ tex: "3=\\text{three rotational degrees of freedom}", x: 1480, y: 520, size: 32, color: Palette.yellow });
    this.poseTex = fl.add({ tex: "\\dot R=R\\,\\Omega:\\ \\text{velocity of the frame at pose } R", x: 760, y: 800, size: 36, color: Palette.orange });

    this.reviewTitle = fl.add({ text: "Episode review", x: 960, y: 120, size: 40, weight: 700 });
    const nodeTex = [
      "\\text{tangent vector}=\\gamma'(0),\\ \\gamma\\subset M",
      "\\operatorname{im}D\\psi(a)\\subseteq T_pM\\subseteq\\ker Dh(p),\\ \\text{equal dims}\\ \\Rightarrow\\ T_pM=\\ker Dh(p)",
      "\\text{regularity necessary: otherwise } \\ker\\ \\text{too big}",
      "F:\\mathbb{R}^{n\\times n}\\to\\mathrm{Sym}(n),\\quad DF(R)\\ \\text{onto}",
      "\\dim O(n)=\\tfrac{n(n-1)}{2}",
      "T_RO(n)=R\\cdot\\mathrm{Skew}(n)",
    ];
    nodeTex.forEach((n, i) => this.nodes.push(fl.add({ tex: n, x: 960, y: 220 + 100 * i, size: 34, boxed: true })));

    this.sphere = new Surface(stage, (u, v, target) => { sphereFn(1)(u, v, target); target.add(SPHERE_C); }, Palette.blue, { wireframe: true, opacity: 0.5 });
    const p = new THREE.Vector3(0.55, -0.35, 0.76).normalize();
    const basis = new TangentBasis(p);
    this.plane = new TangentPlane(stage, Palette.orange, 0.6);
    this.plane.place(p.clone().add(SPHERE_C), p);
    this.pDot = new Dot(stage, p.clone().add(SPHERE_C), Palette.orange, 0.045, "3d");
    for (let k = 0; k < 4; k++) {
      const d = basis.direction(0.4 + (k * Math.PI) / 2.1, 0);
      this.candidates.push(new Arrow(stage, p.clone().add(SPHERE_C), p.clone().add(SPHERE_C).addScaledVector(d, 0.5), Palette.orange, { mode: "3d", headLength: 0.08, width: 3.5 }));
    }
    const dirStep = basis.direction(0.4, 0);
    const start = p.clone().add(SPHERE_C);
    const end = start.clone().addScaledVector(dirStep, 0.85);
    this.stepLine = new Polyline(stage, [end, end.clone().sub(SPHERE_C).normalize().add(SPHERE_C)], { color: Palette.red, width: 3, dashed: true, dashSize: 0.04, gapSize: 0.03 });
    this.stepArrow = new Arrow(stage, start, end, Palette.red, { mode: "3d", headLength: 0.09, width: 4 });
    this.q1 = fl.add({ text: "① Which direction?", x: 960, y: 110, size: 40, color: Palette.orange, weight: 600 });
    this.q2 = fl.add({ text: "② How to move and stay on M?", x: 960, y: 175, size: 40, color: Palette.red, weight: 600 });
    this.nextNote = fl.add({ text: "Next: Riemannian gradient and retraction", x: 960, y: 800, size: 38, color: Palette.text });
  }

  private ovDot(color: string, r: number): Dot {
    const d = new Dot(this.stage, new THREE.Vector3(), color, r, "2d");
    this.ov.adopt(d.object);
    return d;
  }

  private detFormula(n: number): string {
    return Tex.reveal([
      "(\\det R)^2=\\det R^{\\top}\\det R",
      "=\\det(R^{\\top}R)=\\det I=1",
      `\\ \\Rightarrow\\ ${Tex.c(Palette.yellow, "\\det R=\\pm1")}`,
    ], n);
  }

  private wFormula(n: number): string {
    return Tex.reveal([
      "\\det\\ \\text{continuous}\\Rightarrow\\exists\\,W\\ni R_0\\ \\text{open},\\ \\det>0\\ \\text{on } W",
      "\\quad\\Rightarrow\\quad W\\cap O(n)\\subseteq SO(n)",
    ], n);
  }

  private crossFormula(n: number): string {
    return Tex.reveal([
      "\\Omega v=(\\omega_2v_3-\\omega_3v_2,",
      "\\ \\omega_3v_1-\\omega_1v_3,\\ \\omega_1v_2-\\omega_2v_1)",
      `=${Tex.c(Palette.yellow, "\\omega\\times v")}`,
    ], n);
  }

  private label(h: FormulaHandle, world: THREE.Vector3, dx: number, dy: number, opacity: number): void {
    const f = this.stage.project(world);
    h.set({ x: f.x + dx, y: f.y + dy, opacity });
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    const review = c.p(32, 0.8) * (1 - c.p(37, 0.8));
    const bridge = c.p(37, 0.8);
    const center = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.15, 0), bridge);
    const az = lerp(0.55, 0.75, smoothstep(c.s(19), ctx.duration, t));
    const sx = lerp(760, 960, bridge);
    const sy = lerp(470, 600, bridge);
    Orbit.frame(this.stage, az, 0.35, lerp(8.4, 6.6, bridge), FOV, center, sx, sy);
    this.hud.sync(this.stage, FOV);
    this.ov.place(0, 0, 1);

    // ================= 2D part (s0–s18)
    const part2 = c.p(0, 0.6, -1.0) * (1 - c.p(19, 0.6));
    this.detTex.setContent(this.detFormula(t >= c.in(2, 0.75) ? 3 : t >= c.s(2) ? 2 : t >= c.s(1) ? 1 : 0));
    this.detTex.set({ opacity: c.p(1, 0.5) * (1 - c.p(19, 0.6)) });
    this.soDef.set({ opacity: c.p(3, 0.6) * (1 - c.p(18, 0.5)) });
    this.connectNote.set({ opacity: c.p(18, 0.6) * (1 - c.p(19, 0.5)) });

    const o2 = c.p(4, 0.7) * part2;
    this.circles[0].setOpacity(o2);
    this.circles[1].setOpacity(c.p(5, 0.7) * part2);
    this.circleLabels[0].set({ opacity: o2 });
    this.circleLabels[1].set({ opacity: c.p(5, 0.7) * part2 });
    // A point moves on the det = +1 circle (s4–s6), then jumps to the det = −1 circle (second half of s6).
    const theta = lerp(0, 2.2, smoothstep(c.s(4), c.in(6, 0.45), t));
    const jumped = t >= c.in(6, 0.55);
    const moverPhase = c.p(4, 0.6) * (1 - c.p(7, 0.6)) * part2;
    this.mover1.setPosition(this.ov.v(C1.x + RAD * Math.cos(theta), C1.y - RAD * Math.sin(theta), 0.03));
    this.mover1.setOpacity(jumped ? 0 : moverPhase);
    this.mover2.setPosition(this.ov.v(C2.x + RAD * Math.cos(theta), C2.y - RAD * Math.sin(theta), 0.03));
    this.mover2.setOpacity(jumped ? moverPhase : 0);
    const col1 = { x: Math.cos(theta), y: Math.sin(theta) };
    const col2 = jumped ? { x: Math.sin(theta), y: -Math.cos(theta) } : { x: -Math.sin(theta), y: Math.cos(theta) };
    this.frameAxes[0].set(FRAME_C.x, FRAME_C.y, FRAME_C.x + 80 * col1.x, FRAME_C.y - 80 * col1.y);
    this.frameAxes[1].set(FRAME_C.x, FRAME_C.y, FRAME_C.x + 80 * col2.x, FRAME_C.y - 80 * col2.y);
    this.frameAxes.forEach((a) => a.setOpacity(moverPhase));
    this.frameCircle.setOpacity(moverPhase);
    this.frameLabel.set({ opacity: moverPhase });

    const pathPhase = c.p(7, 0.6) * (1 - c.p(11, 0.6)) * part2;
    this.path.setProgress(c.over(7, 0.1, 0.8));
    this.path.setOpacity(pathPhase);
    this.pathBreak.setOpacity(c.p(10, 0.6) * pathPhase);
    this.breakLabel.set({ opacity: c.p(10, 0.6) * pathPhase });
    const detPhase = c.p(9, 0.6) * (1 - c.p(11, 0.6)) * part2;
    this.detAxis.forEach((a) => a.setOpacity(detPhase));
    this.detCurve.setProgress(c.over(9, 0.1, 0.9));
    this.detCurve.setOpacity(detPhase);
    this.detZero.setOpacity(detPhase * smoothstep(0.5, 0.6, c.over(9, 0.1, 0.9)));
    this.detLabels.forEach((l) => l.set({ opacity: detPhase }));

    const wPhase = c.p(12, 0.7) * part2;
    this.r0Dot.setOpacity(c.p(11, 0.6) * part2);
    this.r0Label.set({ opacity: c.p(11, 0.6) * part2 });
    this.wDisc.setOpacity(0.22 * wPhase);
    this.wOutline.setOpacity(wPhase);
    this.wLabel.set({ opacity: wPhase });
    this.wTex.setContent(this.wFormula(t >= c.s(13) ? 2 : 1));
    this.wTex.set({ opacity: wPhase * (1 - c.p(17, 0.5)) });
    const local = c.p(16, 0.6) * part2;
    this.localArc.setOpacity(local);
    this.localVel.setOpacity(local);
    this.tangentTex.set({ opacity: c.p(17, 0.6) * part2 });
    this.ledger.update(t, clamp01(c.p(2, 0.5, 2.5)) * (1 - c.p(19, 0.6)));

    // ================= 3D part (s19–s31)
    const part3 = c.p(19, 0.8) * (1 - 0.85 * review) * (1 - bridge);
    this.refAxes.forEach((l) => l.setOpacity(0.8 * part3));
    this.refLabels.forEach((l) => this.label(l.h, l.at, 0, 0, part3));
    // Orientation of the frame: generator demos (s22–s24), rotation about ω (s28–s30), pose R (s31 on).
    let q = new THREE.Quaternion();
    const gen = [22, 23, 24];
    const axesRef = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    let activeGen = -1;
    gen.forEach((si, i) => {
      if (t >= c.s(si) && t < c.e(si) + 0.3) {
        const u = clamp01((t - c.s(si)) / Math.max(0.1, c.e(si) - c.s(si)));
        const ang = (Math.PI / 2) * Math.sin(Math.PI * smoothstep(0.1, 0.9, u));
        q = new THREE.Quaternion().setFromAxisAngle(axesRef[i], ang);
        activeGen = i;
      }
    });
    const spin = t >= c.s(28) && t < c.s(31) ? (t - c.s(28)) * 0.9 : 0;
    const showOmega = c.p(28, 0.6) * (1 - c.p(31, 0.6));
    if (t >= c.s(28) && t < c.s(31)) q = new THREE.Quaternion().setFromAxisAngle(OMEGA, spin);
    const poseW = c.p(31, 1.0);
    if (t >= c.s(31)) {
      const drift = new THREE.Quaternion().setFromAxisAngle(OMEGA, (t - c.s(31)) * 0.5);
      q = new THREE.Quaternion().slerp(POSE, poseW).multiply(drift);
    }
    const origin = new THREE.Vector3().lerp(FRAME_SIDE, bridge);
    const frameO = c.p(19, 0.8) * (1 - 0.85 * review);
    for (let i = 0; i < 3; i++) {
      const tip = axesRef[i].clone().multiplyScalar(AXIS_LEN).applyQuaternion(q);
      this.axes3[i].set(origin, origin.clone().add(tip));
      this.axes3[i].setOpacity(frameO * (activeGen >= 0 && activeGen !== i ? 0.45 : 1));
      // Velocity of the tip R e_i under R(t) = R·exp(tΩ) with Ω = [ω]_×: R(Ω e_i) = R(ω × e_i).
      const vel = OMEGA.clone().cross(axesRef[i].clone().multiplyScalar(AXIS_LEN)).applyQuaternion(q).multiplyScalar(0.7);
      this.vel3[i].set(origin.clone().add(tip), origin.clone().add(tip).add(vel));
      this.vel3[i].setOpacity((showOmega + c.p(31, 0.6) * (1 - c.p(32, 0.6))) * frameO);
    }
    this.omegaArrow.set(origin.clone().addScaledVector(OMEGA, -1.5), origin.clone().addScaledVector(OMEGA, 1.6));
    this.omegaArrow.setOpacity(showOmega * frameO);
    this.label(this.omegaLabel, origin.clone().addScaledVector(OMEGA, 1.75), 0, 0, showOmega * frameO);
    this.dimTex.set({ opacity: c.p(20, 0.6) * (1 - c.p(21, 0.5)) });
    const gensPhase = c.p(21, 0.6) * (1 - c.p(25, 0.6));
    this.gens.forEach((g, i) => {
      const lit = activeGen === i || (i === 0 && t >= c.s(21) && t < c.s(22));
      g.set({ opacity: gensPhase * c.p(21, 0.5, 0.8 * i) * (activeGen >= 0 && !lit ? 0.45 : 1), color: activeGen === i ? Palette.yellow : Palette.text });
    });
    this.combo.set({ opacity: c.p(25, 0.6) * (1 - c.p(31, 0.6)) });
    const crossN = t >= c.s(28) ? 3 : t >= c.s(27) ? 2 : t >= c.s(26) ? 1 : 0;
    this.cross.setContent(this.crossFormula(crossN));
    this.cross.set({ opacity: (crossN > 0 ? 1 : 0) * (1 - c.p(31, 0.6)) });
    this.dofNote.set({ opacity: c.p(30, 0.6) * (1 - c.p(31, 0.6)) });
    this.poseTex.set({ opacity: c.p(31, 0.6) * (1 - c.p(32, 0.6)) });

    // ================= Review (s32–s36)
    this.reviewTitle.set({ opacity: review });
    const lights = [33, 34, 35, 36, 36, 36];
    this.nodes.forEach((n, i) => {
      const on = c.p(lights[i], 0.6, i >= 4 ? 1.2 * (i - 3) : 0);
      n.set({ opacity: review * (0.25 + 0.75 * on), color: on > 0.5 ? Palette.yellow : Palette.muted });
    });

    // ================= Bridge to E06 (s37–s40)
    this.sphere.setOpacity(bridge);
    this.plane.setOpacity(bridge);
    this.pDot.setOpacity(bridge);
    const cand = c.p(38, 0.6);
    this.candidates.forEach((a, k) => a.setOpacity(bridge * smoothstep(0, 1, cand * 4 - k)));
    const step = c.over(39, 0.1, 0.6);
    this.stepArrow.setOpacity(bridge * (step > 0.01 ? 1 : 0));
    this.stepLine.setOpacity(bridge * smoothstep(0.7, 1, step));
    this.q1.set({ opacity: bridge * c.p(38, 0.6) });
    this.q2.set({ opacity: bridge * c.p(39, 0.6) });
    this.nextNote.set({ opacity: c.p(40, 0.8) });
  }

  teardown(_layers: SceneLayers): void {}
}
