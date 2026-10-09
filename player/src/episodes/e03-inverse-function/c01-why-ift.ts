import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { addStandardLights } from "../../primitives/Lights";
import { Palette } from "../../primitives/Palette";
import { Polyline, sampleCurve } from "../../primitives/Polyline";
import { Region } from "../../primitives/Region";
import { seeded } from "../../primitives/Seeded";
import { Surface, sphereFn } from "../../primitives/Surface";
import { RoadSign } from "./lib/RoadSign";

/**
 * E03 c01 — why the course needs the inverse function theorem.
 * 3D camera fixed for the whole chapter; the sphere group and the point cloud group are moved in
 * camera-aligned coordinates (right, up). Sentence indices refer to story.en.json, scene c01-why-ift.
 */

const CAM_POS = new THREE.Vector3(5.5, -7.5, 3.2);
const CAM_TARGET = new THREE.Vector3(0, 0, 0);
const CLOUD_COUNT = 220;

export class WhyIftScene implements Scene {
  readonly id = "c01-why-ift";
  private stage!: StageLayer;
  private right = new THREE.Vector3();
  private up = new THREE.Vector3();

  private sphereGroup = new THREE.Group();
  private sphere!: Surface;
  private sphereLines: Polyline[] = [];
  private capTop!: Surface;
  private capFront!: Surface;
  private capOverlap!: Surface;
  private diskTop!: Region;
  private diskFront!: Region;
  private diskTopEdge!: Polyline;
  private diskFrontEdge!: Polyline;
  private projTop: Polyline[] = [];
  private projFront: Polyline[] = [];

  private cloudGroup = new THREE.Group();
  private cloudDots: Dot[] = [];
  private cloudBase: THREE.Vector3[] = [];

  private chartDef!: FormulaHandle;
  private matrixR!: FormulaHandle;
  private dimLine!: FormulaHandle;
  private n3Line!: FormulaHandle;
  private question!: FormulaHandle;
  private cloudNote!: FormulaHandle;

  private flowIn!: FormulaHandle;
  private flowBox!: FormulaHandle;
  private flowOut!: FormulaHandle;
  private flowArrows: FormulaHandle[] = [];
  private statement!: FormulaHandle;
  private coordNote!: FormulaHandle;
  private polar!: FormulaHandle;
  private scopeLine!: FormulaHandle;
  private nextLine!: FormulaHandle;

  private chainNodes: FormulaHandle[] = [];
  private chainArrows: FormulaHandle[] = [];
  private hypRows: FormulaHandle[] = [];
  private hypNotes: FormulaHandle[] = [];
  private closing!: FormulaHandle;
  private road!: RoadSign;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    const d = CAM_TARGET.clone().sub(CAM_POS).normalize();
    this.right = d.clone().cross(new THREE.Vector3(0, 0, 1)).normalize();
    this.up = this.right.clone().cross(d).normalize();

    // ---- Sphere with two hemisphere charts
    stage.root.add(this.sphereGroup);
    const g = this.sphereGroup;
    this.sphere = new Surface(stage, sphereFn(1), Palette.blue, { opacity: 0.35, segments: 64 });
    g.add(this.sphere.mesh);
    for (let k = 1; k < 6; k++) {
      const phi = (k * Math.PI) / 6;
      const line = new Polyline(stage, sampleCurve((s) => new THREE.Vector3(Math.sin(phi) * Math.cos(s), Math.sin(phi) * Math.sin(s), Math.cos(phi)), 0, 2 * Math.PI, 72),
        { color: "#8fbfff", width: 1.2 });
      this.sphereLines.push(line);
      g.add(line.object);
    }
    for (let k = 0; k < 6; k++) {
      const th = (k * Math.PI) / 6;
      const line = new Polyline(stage, sampleCurve((s) => new THREE.Vector3(Math.sin(s) * Math.cos(th), Math.sin(s) * Math.sin(th), Math.cos(s)), 0, 2 * Math.PI, 72),
        { color: "#8fbfff", width: 1.2 });
      this.sphereLines.push(line);
      g.add(line.object);
    }
    const R1 = 1.012;
    this.capTop = new Surface(stage, (u, v, t) => {
      const th = u * 2 * Math.PI;
      const ph = v * Math.PI / 2;
      t.set(R1 * Math.sin(ph) * Math.cos(th), R1 * Math.sin(ph) * Math.sin(th), R1 * Math.cos(ph));
    }, Palette.green, { opacity: 0.6, segments: 48 });
    this.capFront = new Surface(stage, (u, v, t) => {
      const th = -Math.PI / 2 + u * Math.PI;
      const ph = v * Math.PI;
      t.set(R1 * Math.sin(ph) * Math.cos(th), R1 * Math.sin(ph) * Math.sin(th), R1 * Math.cos(ph));
    }, Palette.purple, { opacity: 0.6, segments: 48 });
    const R2 = 1.02;
    this.capOverlap = new Surface(stage, (u, v, t) => {
      const th = -Math.PI / 2 + u * Math.PI;
      const ph = v * Math.PI / 2;
      t.set(R2 * Math.sin(ph) * Math.cos(th), R2 * Math.sin(ph) * Math.sin(th), R2 * Math.cos(ph));
    }, Palette.yellow, { opacity: 0.7, segments: 48 });
    g.add(this.capTop.mesh, this.capFront.mesh, this.capOverlap.mesh);
    const diskPts = sampleCurve((s) => new THREE.Vector3(Math.cos(s), Math.sin(s), 0), 0, 2 * Math.PI, 72);
    this.diskTop = new Region(stage, diskPts, Palette.green, 0.3, 0);
    this.diskTop.object.position.set(0, 0, -1.65);
    this.diskTopEdge = new Polyline(stage, diskPts.map((p) => new THREE.Vector3(p.x, p.y, -1.65)), { color: Palette.green, width: 2.5 });
    this.diskFront = new Region(stage, diskPts, Palette.purple, 0.3, 0);
    this.diskFront.object.rotation.y = Math.PI / 2;
    this.diskFront.object.position.set(1.75, 0, 0);
    this.diskFrontEdge = new Polyline(stage, diskPts.map((p) => new THREE.Vector3(1.75, p.y, p.x)), { color: Palette.purple, width: 2.5 });
    g.add(this.diskTop.object, this.diskFront.object, this.diskTopEdge.object, this.diskFrontEdge.object);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + 0.3;
      const top = new THREE.Vector3(0.7 * Math.cos(a), 0.7 * Math.sin(a), Math.sqrt(1 - 0.49));
      const lt = new Polyline(stage, [top, new THREE.Vector3(top.x, top.y, -1.65)], { color: Palette.green, width: 1.6, dashed: true, dashSize: 0.06, gapSize: 0.05 });
      this.projTop.push(lt);
      const fr = new THREE.Vector3(Math.sqrt(1 - 0.49), 0.7 * Math.cos(a), 0.7 * Math.sin(a));
      const lf = new Polyline(stage, [fr, new THREE.Vector3(1.75, fr.y, fr.z)], { color: Palette.purple, width: 1.6, dashed: true, dashSize: 0.06, gapSize: 0.05 });
      this.projFront.push(lf);
      g.add(lt.object, lf.object);
    }

    // ---- Point cloud standing in for O(3)
    stage.root.add(this.cloudGroup);
    const rnd = seeded(7);
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const al = rnd() * 2 * Math.PI;
      const be = rnd() * 2 * Math.PI;
      const rr = 1 + 0.42 * Math.cos(be);
      const p = new THREE.Vector3(rr * Math.cos(al), rr * Math.sin(al), 0.42 * Math.sin(be) + 0.35 * Math.sin(3 * al));
      p.multiplyScalar(0.85);
      this.cloudBase.push(p);
      const dot = new Dot(stage, p, i % 3 === 0 ? Palette.pink : Palette.purple, 0.028, "3d");
      this.cloudDots.push(dot);
      this.cloudGroup.add(dot.object);
    }

    // ---- Formulas
    this.chartDef = fl.add({ tex: "\\text{chart: }\\ \\varphi:U\\to\\varphi(U)\\subseteq\\mathbb{R}^d\\ \\text{homeomorphism},\\qquad \\psi\\circ\\varphi^{-1}\\ \\text{smooth}", x: 960, y: 100, size: 36 });
    this.matrixR = fl.add({ tex: "R=\\begin{pmatrix} r_{11}&r_{12}&r_{13}\\\\ r_{21}&r_{22}&r_{23}\\\\ r_{31}&r_{32}&r_{33}\\end{pmatrix},\\qquad R^{\\top}R=I", x: 1560, y: 330, size: 34, display: true });
    this.dimLine = fl.add({ tex: "\\dim O(n)=\\tfrac{n(n-1)}{2}\\quad\\text{inside}\\quad \\mathbb{R}^{n\\times n}\\cong\\mathbb{R}^{n^2}", x: 1560, y: 520, size: 34 });
    this.n3Line = fl.add({ tex: "n=3:\\quad \\text{a 3-dim set inside } \\mathbb{R}^{9}", x: 1560, y: 600, size: 34, color: Palette.orange });
    this.question = fl.add({ tex: "?", x: 900, y: 250, size: 110, color: Palette.red });
    this.cloudNote = fl.add({ text: "illustration: a high-dimensional set cannot be drawn", x: 900, y: 790, size: 26, color: Palette.muted });

    this.flowIn = fl.add({ tex: "\\begin{gathered}h(x)=c\\\\ +\\ \\text{one derivative}\\end{gathered}", x: 330, y: 420, size: 40, boxed: true, display: true });
    this.flowBox = fl.add({ tex: "\\text{machine}", x: 960, y: 420, size: 44, boxed: true });
    this.flowOut = fl.add({ tex: "\\text{charts exist}", x: 1600, y: 420, size: 40, boxed: true });
    this.flowArrows = [
      fl.add({ tex: "\\Longrightarrow", x: 590, y: 420, size: 50, color: Palette.muted }),
      fl.add({ tex: "\\Longrightarrow", x: 1335, y: 420, size: 50, color: Palette.muted }),
    ];
    this.statement = fl.add({ tex: "DF(x_0)\\ \\text{invertible}\\ \\Longrightarrow\\ F\\ \\text{is a diffeomorphism near } x_0", x: 960, y: 600, size: 40 });
    this.coordNote = fl.add({ text: "local diffeomorphism = a change of coordinates", x: 960, y: 670, size: 30, color: Palette.green });
    this.polar = fl.add({ tex: "(r,\\theta)\\mapsto(r\\cos\\theta,\\ r\\sin\\theta):\\quad DF\\ \\text{invertible for } r>0\\ \\Rightarrow\\ (r,\\theta)\\ \\text{local coordinates}", x: 960, y: 750, size: 34 });
    this.scopeLine = fl.add({ tex: "\\text{this episode: } F:\\mathbb{R}^n\\to\\mathbb{R}^n\\quad (n\\ \\text{equations},\\ n\\ \\text{unknowns})", x: 960, y: 620, size: 38 });
    this.nextLine = fl.add({ tex: "\\text{constraint sets: } h:\\mathbb{R}^n\\to\\mathbb{R}^k,\\ k<n\\quad\\longrightarrow\\quad \\text{next episode}", x: 960, y: 710, size: 34, color: Palette.muted });

    const chainLeft = 960 - RoadSign.WIDTH / 2;
    this.chainNodes = RoadSign.NODES.map((tex, i) => fl.add({ tex, x: chainLeft + RoadSign.NODE_X[i], y: 460, size: 28, color: Palette.muted }));
    this.chainArrows = RoadSign.ARROW_X.map((ax) => fl.add({ tex: "\\rightarrow", x: chainLeft + ax, y: 460, size: 28, color: Palette.muted }));
    const hyps = [
      "F\\in C^1",
      "DF(x_0)\\ \\text{invertible}",
      "\\text{conclusion only local}",
    ];
    this.hypRows = hyps.map((tex, i) => fl.add({ tex: `${i + 1}.\\ \\ ${tex}`, x: 560, y: 360 + i * 110, size: 44, align: "left" }));
    this.hypNotes = hyps.map((_, i) => fl.add({ tex: "\\longrightarrow\\ \\text{counterexample}", x: 1120, y: 360 + i * 110, size: 36, color: Palette.red, align: "left" }));
    this.closing = fl.add({ tex: "\\text{next: the derivative as a linear map } DF(x)", x: 960, y: 760, size: 36, color: Palette.yellow });
    this.road = new RoadSign(fl, 960);
  }

  private placeGroup(group: THREE.Group, sx: number, sy: number, scale: number): void {
    group.position.copy(this.right.clone().multiplyScalar(sx).add(this.up.clone().multiplyScalar(sy)));
    group.scale.setScalar(scale);
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    this.stage.setView3D(CAM_POS, CAM_TARGET, 30);

    // ---- Sphere: visible s0–s9, shrinks to the upper left at s5
    const sph = keyframes(t, [
      { t: 0, v: { x: -0.8, y: 0.62, s: 0.95 } },
      { t: c.s(5), v: { x: -3.1, y: 1.45, s: 0.42 } },
    ], 1.2);
    this.placeGroup(this.sphereGroup, sph.x, sph.y, sph.s);
    this.sphereGroup.rotation.z = 0;
    const sphereVis = c.p(0, 1.0, -1.5) * (1 - c.p(9, 0.8));
    this.sphere.setOpacity(sphereVis);
    this.sphereLines.forEach((l) => l.setOpacity(0.45 * sphereVis));
    const top = c.p(3, 0.7) * sphereVis;
    const front = c.p(3, 0.7, (c.e(3) - c.s(3)) * 0.5) * sphereVis;
    const projDraw = c.over(3, 0.05, 0.45);
    const projDrawF = c.over(3, 0.5, 0.95);
    this.capTop.setOpacity(top * (1 - 0.5 * c.p(4, 0.6)));
    this.diskTop.setOpacity(0.3 * top);
    this.diskTopEdge.setOpacity(top);
    this.projTop.forEach((l) => { l.setProgress(projDraw); l.setOpacity(top * (1 - c.p(4, 0.6))); });
    this.capFront.setOpacity(front * (1 - 0.5 * c.p(4, 0.6)));
    this.diskFront.setOpacity(0.3 * front);
    this.diskFrontEdge.setOpacity(front);
    this.projFront.forEach((l) => { l.setProgress(projDrawF); l.setOpacity(front * (1 - c.p(4, 0.6))); });
    this.capOverlap.setOpacity(c.p(4, 0.8) * sphereVis);
    this.chartDef.set({ opacity: c.p(1, 0.8) * (1 - c.p(5, 0.6)) });

    // ---- Point cloud: s5–s9
    const cloud = c.p(5, 1.0) * (1 - c.p(9, 0.8));
    this.placeGroup(this.cloudGroup, -0.35, -0.05, 1.0);
    const ang = 0.35 * t;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    this.cloudDots.forEach((dot, i) => {
      const p = this.cloudBase[i];
      dot.setPosition(new THREE.Vector3(ca * p.x - sa * p.y, sa * p.x + ca * p.y, p.z));
      dot.setOpacity(cloud);
    });
    this.matrixR.set({ opacity: c.p(5, 0.8) * (1 - c.p(9, 0.6)) });
    this.dimLine.set({ opacity: c.p(6, 0.8) * (1 - c.p(9, 0.6)) });
    this.n3Line.set({ opacity: c.p(7, 0.8) * (1 - c.p(9, 0.6)) });
    const qPulse = 0.85 + 0.15 * Math.sin((t - c.s(8)) * 4);
    this.question.set({ opacity: c.p(8, 0.6) * (1 - c.p(9, 0.6)), scale: t >= c.s(8) ? qPulse : 1 });
    this.cloudNote.set({ opacity: c.p(8, 0.6) * (1 - c.p(9, 0.6)) });

    // ---- Machine flow: s9–s19
    const flowOut = 1 - c.p(19, 0.6);
    this.flowBox.setContent(t >= c.s(12) ? "\\text{Inverse Function Theorem}" : "\\text{machine}");
    this.flowBox.set({ opacity: c.p(9, 0.6) * flowOut, color: t >= c.s(12) ? Palette.yellow : Palette.text });
    this.flowIn.set({ opacity: c.p(10, 0.6) * flowOut });
    this.flowArrows[0].set({ opacity: c.p(10, 0.6, 0.6) * flowOut });
    this.flowArrows[1].set({ opacity: c.p(11, 0.6) * flowOut });
    this.flowOut.set({ opacity: c.p(11, 0.6, 0.4) * flowOut, color: Palette.green });
    const firstBlock = 1 - c.p(17, 0.6);
    this.statement.set({ opacity: c.p(13, 0.6) * firstBlock });
    this.coordNote.set({ opacity: c.p(14, 0.6) * firstBlock });
    this.polar.set({ opacity: c.p(15, 0.6) * firstBlock });
    this.scopeLine.set({ opacity: c.p(17, 0.6, 0.4) * flowOut });
    this.nextLine.set({ opacity: c.p(18, 0.6) * flowOut });

    // ---- Dependency chain: s19–s22, then it becomes the road sign at the top
    const chainVis = c.p(19, 0.6) * (1 - c.p(22, 0.6));
    const revealCount = t >= c.in(21, 0.3) ? 5 : t >= c.in(20, 0.5) ? 3 : t >= c.s(20) ? 2 : 1;
    this.chainNodes.forEach((h, i) => {
      h.set({ opacity: chainVis * (i < revealCount ? 1 : 0), color: i === 0 ? Palette.yellow : Palette.text });
    });
    this.chainArrows.forEach((h, i) => h.set({ opacity: chainVis * (i + 1 < revealCount ? 1 : 0) }));
    this.road.update(c.p(22, 0.8), 0);

    // ---- Hypotheses and their counterexamples: s22–s25
    const hypVis = 1 - c.p(25, 0.6);
    this.hypRows.forEach((h, i) => h.set({ opacity: c.p(23, 0.5, i * 1.0) * hypVis, color: Palette.text }));
    this.hypNotes.forEach((h, i) => h.set({ opacity: c.p(24, 0.5, i * 0.5) * hypVis }));
    this.closing.set({ opacity: c.p(25, 0.8), y: lerp(780, 760, c.p(25, 0.8)) });
  }

  teardown(_layers: SceneLayers): void {}
}
