import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Arrow } from "../../primitives/Arrow";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { Region } from "../../primitives/Region";
import { Surface, sphereFn } from "../../primitives/Surface";
import { Anchor } from "./lib/Anchor";
import { FlatPatch } from "./lib/FlatPatch";
import { SphereCharts } from "./lib/SphereCharts";
import { Tex } from "./lib/Tex";

/**
 * E04 c01 — why we want equations to produce charts.
 * Phase 1 (s0–s2): the question. Phase 2 (s3–s12, 3D): the six hemisphere charts of S², then O(3) as nine
 * variables with six equations. Phase 3 (s13–s18, 2D): the machine "equations → ? → charts" and the crossing
 * lines x² − y² = 0. Phase 4 (s19–s23): the route IFT → implicit FT → regular level-set theorem.
 * Sentence indices refer to content/episodes/e04-implicit-level-sets/story.en.json, scene c01-why-equations.
 */

const CAP_COLORS = [Palette.green, Palette.green, Palette.orange, Palette.orange, Palette.purple, Palette.purple];
const CAP_AXES: (0 | 1 | 2)[] = [2, 2, 0, 0, 1, 1];
const CAP_SIGNS: (1 | -1)[] = [1, -1, 1, -1, 1, -1];
const DISK_Z = -1.55;

export class WhyEquationsScene implements Scene {
  readonly id = "c01-why-equations";
  private stage!: StageLayer;
  private anchor!: Anchor;

  // Phase 1
  private cardCharts!: FormulaHandle;
  private cardIft!: FormulaHandle;
  private plus!: FormulaHandle;
  private question!: FormulaHandle;

  // Phase 2
  private sphere!: Surface;
  private caps: FlatPatch[] = [];
  private disk!: Region;
  private diskEdge!: Polyline;
  private dropLines: Polyline[] = [];
  private diskLabel!: FormulaHandle;
  private o3Def!: FormulaHandle;
  private matrix!: FormulaHandle;
  private symMatrix!: FormulaHandle;
  private countNote!: FormulaHandle;
  private noPicture!: FormulaHandle;
  private demands!: FormulaHandle;
  private byHand!: FormulaHandle;

  // Phase 3
  private flowBoxes: FormulaHandle[] = [];
  private flowArrows: FormulaHandle[] = [];
  private axes: Arrow[] = [];
  private axisLabels: FormulaHandle[] = [];
  private lineA!: Polyline;
  private lineB!: Polyline;
  private origin!: Dot;
  private crossEq!: FormulaHandle;
  private qMark!: FormulaHandle;
  private plusNote!: FormulaHandle;

  // Phase 4
  private nodes: FormulaHandle[] = [];
  private nodeArrows: FormulaHandle[] = [];
  private rankNote!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    this.anchor = new Anchor(stage);
    addStandardLights(stage);

    // ---- Phase 1
    this.cardCharts = fl.add({ tex: "\\begin{gathered}\\text{Episode 2}\\\\ \\text{smooth manifolds, charts}\\end{gathered}", x: 560, y: 360, size: 38, boxed: true, display: true });
    this.cardIft = fl.add({ tex: "\\begin{gathered}\\text{Episode 3}\\\\ \\text{inverse function theorem}\\end{gathered}", x: 1360, y: 360, size: 38, boxed: true, display: true });
    this.plus = fl.add({ tex: "+", x: 960, y: 360, size: 60, color: Palette.muted });
    this.question = fl.add({ tex: `\\{x:\\ ${Tex.color(Palette.yellow, "h(x)=c")}\\}\\ \\overset{?}{\\leadsto}\\ ${Tex.color(Palette.blue, "\\text{smooth manifold}")}`, x: 960, y: 600, size: 54 });

    // ---- Phase 2
    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { wireframe: true, opacity: 0.45, isoU: 24, isoV: 12 });
    for (let i = 0; i < 6; i++) {
      this.caps.push(new FlatPatch(stage, SphereCharts.cap(CAP_AXES[i], CAP_SIGNS[i], 1.012), CAP_COLORS[i]));
    }
    const diskPts = circlePoints(0, 0, 1, 96);
    this.disk = new Region(stage, diskPts, Palette.green, 0.3);
    this.disk.object.position.z = DISK_Z;
    this.diskEdge = new Polyline(stage, diskPts.map((p) => new THREE.Vector3(p.x, p.y, DISK_Z)), { color: Palette.green, width: 2.5 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 2 * Math.PI + 0.2;
      const r = i % 2 === 0 ? 0.95 : 0.55;
      const top = new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - r * r) + 0.012);
      const bottom = new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), DISK_Z);
      this.dropLines.push(new Polyline(stage, [top, bottom], { color: Palette.green, width: 1.6, dashed: true, dashSize: 0.06, gapSize: 0.05 }));
    }
    this.diskLabel = fl.add({ tex: "(x_1,x_2,x_3)\\mapsto(x_1,x_2)", x: 0, y: 0, size: 32, color: Palette.green, align: "left" });
    this.o3Def = fl.add({ tex: `O(3)=\\{R\\in\\mathbb{R}^{3\\times 3}:\\ ${Tex.color(Palette.yellow, "R^\\top R=I")}\\}`, x: 1330, y: 170, size: 46 });
    this.matrix = fl.add({ tex: this.matrixTex(-1), x: 1330, y: 360, size: 46, display: true });
    this.symMatrix = fl.add({ tex: this.symTex(), x: 1330, y: 360, size: 40, display: true });
    this.countNote = fl.add({ tex: `${Tex.color(Palette.text, "9\\ \\text{variables}")},\\quad ${Tex.color(Palette.yellow, "6\\ \\text{equations}")}`, x: 1330, y: 540, size: 44 });
    this.noPicture = fl.add({ text: "no hemisphere to draw", x: 1330, y: 610, size: 32, color: Palette.red });
    this.demands = fl.add({ tex: "\\text{smooth manifold:}\\ \\ \\text{a chart around every point}\\ +\\ \\text{smooth transition maps}", x: 960, y: 760, size: 36, boxed: true });
    this.byHand = fl.add({ text: "chart by chart, by hand: does not scale", x: 960, y: 830, size: 30, color: Palette.red });

    // ---- Phase 3
    const boxTex = ["\\text{equations } h(x)=c", "\\textbf{?}", "\\text{charts}"];
    this.flowBoxes = boxTex.map((tex, i) => fl.add({ tex, x: 0, y: 0, size: 44, boxed: true, color: i === 1 ? Palette.orange : Palette.text }));
    this.flowArrows = [0, 1].map(() => fl.add({ tex: "\\longrightarrow", x: 0, y: 0, size: 54, color: Palette.muted }));
    const axis = (a: THREE.Vector3, b: THREE.Vector3): Arrow => new Arrow(stage, a, b, Palette.axis, { width: 2.5, headLength: 0.12 });
    this.axes = [axis(new THREE.Vector3(-1.6, 0, 0), new THREE.Vector3(1.7, 0, 0)), axis(new THREE.Vector3(0, -1.5, 0), new THREE.Vector3(0, 1.5, 0))];
    this.axisLabels = [fl.add({ tex: "x", x: 0, y: 0, size: 34, color: Palette.muted }), fl.add({ tex: "y", x: 0, y: 0, size: 34, color: Palette.muted })];
    this.lineA = new Polyline(stage, [new THREE.Vector3(-1.4, -1.4, 0), new THREE.Vector3(1.4, 1.4, 0)], { color: Palette.blue, width: 5 });
    this.lineB = new Polyline(stage, [new THREE.Vector3(-1.4, 1.4, 0), new THREE.Vector3(1.4, -1.4, 0)], { color: Palette.blue, width: 5 });
    this.origin = new Dot(stage, new THREE.Vector3(0, 0, 0.01), Palette.red, 0.06);
    this.crossEq = fl.add({ tex: "x^2-y^2=0", x: 0, y: 0, size: 44, color: Palette.blue });
    this.qMark = fl.add({ tex: "\\textbf{?}", x: 0, y: 0, size: 64, color: Palette.red });
    this.plusNote = fl.add({ text: "looks like +, not like a line", x: 0, y: 0, size: 32, color: Palette.red, align: "left" });

    // ---- Phase 4
    const nodeTex = ["\\begin{gathered}\\text{Inverse Function}\\\\ \\text{Theorem}\\end{gathered}",
      "\\begin{gathered}\\text{Implicit Function}\\\\ \\text{Theorem}\\end{gathered}",
      "\\begin{gathered}\\text{Regular Level-Set}\\\\ \\text{Theorem}\\end{gathered}"];
    this.nodes = nodeTex.map((tex, i) => fl.add({ tex, x: 420 + i * 540, y: 420, size: 40, boxed: true, display: true }));
    this.nodeArrows = [0, 1].map((i) => fl.add({ tex: "\\Longrightarrow", x: 690 + i * 540, y: 420, size: 56, color: Palette.muted }));
    this.rankNote = fl.add({ tex: `\\text{differentiate, check rank}\\ \\Rightarrow\\ ${Tex.color(Palette.green, "\\text{manifold}")}`, x: 1500, y: 600, size: 36, color: Palette.yellow });
  }

  private matrixTex(flash: number): string {
    const cells: string[] = [];
    for (let i = 0; i < 9; i++) {
      const body = `r_{${Math.floor(i / 3) + 1}${(i % 3) + 1}}`;
      cells.push(i === flash ? Tex.color(Palette.orange, body) : i < flash || flash >= 9 ? Tex.color(Palette.text, body) : Tex.color(Palette.muted, body));
    }
    return `R=\\begin{pmatrix}${cells[0]}&${cells[1]}&${cells[2]}\\\\${cells[3]}&${cells[4]}&${cells[5]}\\\\${cells[6]}&${cells[7]}&${cells[8]}\\end{pmatrix}`;
  }

  private symTex(): string {
    const e = (i: number, j: number): string => (i <= j ? Tex.color(Palette.yellow, `s_{${i}${j}}`) : Tex.color(Palette.muted, `s_{${j}${i}}`));
    const rows = [1, 2, 3].map((i) => [1, 2, 3].map((j) => e(i, j)).join("&")).join("\\\\");
    return `R^\\top R=\\begin{pmatrix}${rows}\\end{pmatrix}=I`;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;

    // ---- Phase 1: the question
    const p1Out = 1 - c.p(3, 0.8);
    const merge = c.p(1, 1.0);
    this.cardCharts.set({ x: lerp(500, 640, merge), opacity: c.p(0, 0.8, 0.2) * p1Out });
    this.cardIft.set({ x: lerp(1420, 1280, merge), opacity: c.p(0, 0.8, 1.2) * p1Out });
    this.plus.set({ opacity: merge * p1Out });
    this.question.set({ opacity: c.p(2, 0.8) * p1Out });

    // ---- Phase 2: 3D sphere, then O(3)
    const phase2 = c.p(3, 0.8) * (1 - c.p(13, 0.8, -0.6));
    const shift = c.p(7, 1.0);
    const in3D = t < c.s(13) + 0.3;
    if (in3D) {
      const az = -0.95 + 0.12 * Math.sin(0.15 * t);
      const pos = new THREE.Vector3(8.2 * Math.cos(az), 8.2 * Math.sin(az), 3.3);
      const target = new THREE.Vector3(0, 0, -0.62);
      const right = target.clone().sub(pos).cross(new THREE.Vector3(0, 0, 1)).normalize();
      const off = right.multiplyScalar(lerp(0, 2.4, shift));
      stage.setView3D(pos.add(off), target.add(off), 32);
    }
    this.sphere.setOpacity(phase2);
    // s4: hemispheres light up one at a time; s5: only the upper one with its projection; s6: all six cover the sphere.
    const s4 = c.s(4);
    const s4len = c.e(4) - s4;
    for (let i = 0; i < 6; i++) {
      const a = s4 + (i / 6) * s4len;
      const turn = t >= a - 0.15 && t < a + s4len / 6 + 0.15 ? 1 : 0;
      const one = t >= c.s(5) && t < c.s(6) ? (i === 0 ? 1 : 0) : 0;
      const all = c.p(6, 0.8) * (1 - c.p(7, 0.8));
      const later = c.p(7, 0.8) * 0.35;
      const lit = t < c.s(5) ? turn * c.p(4, 0.4) * 0.6 : t < c.s(6) ? one * 0.5 : Math.max(all * 0.3, later * 0.6);
      this.caps[i].setOpacity(lit * phase2);
    }
    const proj = c.p(5, 0.8) * (1 - c.p(6, 0.6)) * phase2;
    this.disk.setOpacity(0.3 * proj);
    this.diskEdge.setOpacity(proj);
    this.dropLines.forEach((l) => l.setOpacity(proj * c.p(5, 0.8, 0.5)));
    if (in3D) this.anchor.place(this.diskLabel, new THREE.Vector3(1.0, 0.0, DISK_Z), proj * c.p(5, 0.8, 1.0), 40, 0);
    else this.diskLabel.set({ opacity: 0 });

    this.o3Def.set({ opacity: c.p(7, 0.8, 0.8) * phase2 });
    const flash = t < c.s(8) ? -1 : t >= c.in(8, 0.85) ? 9 : Math.floor(((t - c.s(8)) / ((c.e(8) - c.s(8)) * 0.85)) * 9);
    this.matrix.setContent(this.matrixTex(flash));
    this.matrix.set({ opacity: c.p(8, 0.5) * (1 - c.p(9, 0.6)) * phase2 });
    this.symMatrix.set({ opacity: c.p(9, 0.6, 0.4) * phase2 });
    this.countNote.set({ opacity: c.p(10, 0.6) * phase2 });
    this.noPicture.set({ opacity: c.p(10, 0.6, 1.8) * phase2 });
    this.demands.set({ opacity: c.p(11, 0.8) * phase2 });
    this.byHand.set({ opacity: c.p(12, 0.6, 1.0) * phase2 });

    // ---- Phase 3: the machine and the crossing lines
    if (!in3D) stage.setView2D(0, -0.3, 4.6);
    const flow = c.p(13, 0.8) * (1 - c.p(19, 0.8));
    const corner = c.p(14, 1.0);
    const flowX = [470, 960, 1340];
    const cornerX = [175, 380, 520];
    for (let i = 0; i < 3; i++) {
      const x = lerp(flowX[i], cornerX[i], corner);
      const y = lerp(430, 110, corner);
      const lit = i === 0 ? 1 : c.p(13, 0.6, 0.8 + 0.9 * i);
      this.flowBoxes[i].set({ x, y, scale: lerp(1, 0.55, corner), opacity: flow * lit });
    }
    for (let i = 0; i < 2; i++) {
      const x = lerp(i === 0 ? 815 : 1150, i === 0 ? 320 : 440, corner);
      const y = lerp(430, 110, corner);
      this.flowArrows[i].set({ x, y, scale: lerp(1, 0.55, corner), opacity: flow * c.p(13, 0.6, 0.5 + 0.9 * i) });
    }
    const cross = c.p(15, 0.8) * (1 - c.p(19, 0.8));
    this.axes.forEach((a) => a.setOpacity(in3D ? 0 : cross));
    if (!in3D) {
      this.anchor.place(this.axisLabels[0], new THREE.Vector3(1.82, 0, 0), cross);
      this.anchor.place(this.axisLabels[1], new THREE.Vector3(0, 1.64, 0), cross);
    } else this.axisLabels.forEach((l) => l.set({ opacity: 0 }));
    const draw = c.over(16, 0.0, 0.7);
    this.lineA.setOpacity(in3D ? 0 : cross);
    this.lineA.setProgress(draw);
    this.lineB.setOpacity(in3D ? 0 : cross);
    this.lineB.setProgress(draw);
    if (!in3D) this.anchor.place(this.crossEq, new THREE.Vector3(1.05, 1.45, 0), cross, 120, 0);
    else this.crossEq.set({ opacity: 0 });
    const bad = c.p(17, 0.6) * (1 - c.p(19, 0.8));
    const pulse = t >= c.s(17) ? 1 + 0.35 * Math.max(0, Math.sin((t - c.s(17)) * 2 * Math.PI / 1.4)) : 1;
    this.origin.setOpacity(in3D ? 0 : bad);
    this.origin.setScale(pulse);
    if (!in3D) {
      this.anchor.place(this.qMark, new THREE.Vector3(0.32, 0.12, 0), bad);
      this.anchor.place(this.plusNote, new THREE.Vector3(0.95, -0.4, 0), bad * c.p(17, 0.6, 1.2));
    } else {
      this.qMark.set({ opacity: 0 });
      this.plusNote.set({ opacity: 0 });
    }
    this.qMark.set({ scale: pulse });

    // ---- Phase 4: the route
    for (let i = 0; i < 3; i++) {
      this.nodes[i].set({ opacity: c.p(20 + i, 0.8), color: i === 2 && t >= c.s(23) ? Palette.green : Palette.text });
    }
    for (let i = 0; i < 2; i++) this.nodeArrows[i].set({ opacity: c.p(21 + i, 0.6) });
    this.rankNote.set({ opacity: c.p(23, 0.8, 1.2) });
  }

  teardown(_layers: SceneLayers): void {}
}
