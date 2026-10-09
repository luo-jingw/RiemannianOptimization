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
import { Polyline } from "../../primitives/Polyline";
import { ProofLedger } from "../../primitives/ProofLedger";
import { Region } from "../../primitives/Region";
import { TangentPlane } from "../../primitives/TangentPlane";
import { Hud } from "./lib/Hud";
import { Orbit } from "./lib/Orbit";
import { PxArrow } from "./lib/PxArrow";
import { PxGroup } from "./lib/PxGroup";
import { Tex } from "./lib/Tex";

/**
 * E05 c03 — the rank–nullity theorem.
 * Left: R³ with a 3×3×3 lattice, the kernel line of L = [1 1 0; 0 0 1] and the basis v₁, v₂, v₃.
 * Right (overlay panel): R², where the lattice points land. Then L' = [1 1 0; 2 2 0]: the image collapses
 * onto a line and the kernel becomes a plane.
 * Sentence indices refer to content/episodes/e05-tangent-orthogonal/story.en.json, scene c03-rank-nullity.
 */

const FOV = 32;
const PANEL_X = 1050;
const PANEL_Y = 440;
const PANEL_W = 540;
const PANEL_H = 500;
const UNIT = 100;                       // panel pixels per unit
const KER = new THREE.Vector3(1, -1, 0);
const V2 = new THREE.Vector3(1, 0, 0);
const V3 = new THREE.Vector3(0, 0, 1);

interface LatticePoint {
  v: THREE.Vector3;
  dot3: Dot;
  flyer: Dot;
  delay: number;
}

export class RankNullityScene implements Scene {
  readonly id = "c03-rank-nullity";
  private stage!: StageLayer;
  private hud!: Hud;
  private screen!: PxGroup;
  private panel!: PxGroup;
  private axes3: Arrow[] = [];
  private axisLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private lattice: LatticePoint[] = [];
  private kernelLine!: Polyline;
  private kernelPlane!: TangentPlane;
  private basis: Arrow[] = [];
  private basisLabels: FormulaHandle[] = [];
  private panelBg!: Region;
  private panelAxes: PxArrow[] = [];
  private panelFill!: Region;
  private imageLine!: Polyline;
  private imgArrows: PxArrow[] = [];
  private imgLabels: FormulaHandle[] = [];
  private panelTitle!: FormulaHandle;
  private fillLabel!: FormulaHandle;
  private lineLabel!: FormulaHandle;
  private kerLabel!: FormulaHandle;
  private defs!: FormulaHandle;
  private matrix!: FormulaHandle;
  private count!: FormulaHandle;
  private theorem!: FormulaHandle;
  private basisText!: FormulaHandle;
  private claim!: FormulaHandle;
  private span!: FormulaHandle;
  private indep!: FormulaHandle;
  private dropCount!: FormulaHandle;
  private cardRank!: FormulaHandle;
  private cardDim!: FormulaHandle;
  private ledger!: ProofLedger;

  setup(layers: SceneLayers, timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    addStandardLights(stage);
    this.hud = new Hud(stage);
    this.screen = new PxGroup(this.hud);
    this.panel = new PxGroup(this.hud);
    this.panel.place(PANEL_X, PANEL_Y, 1);

    // ---- 3D: axes, lattice, kernel line, kernel plane, basis
    const axisEnds = [new THREE.Vector3(1.7, 0, 0), new THREE.Vector3(0, 1.7, 0), new THREE.Vector3(0, 0, 1.6)];
    axisEnds.forEach((e) => this.axes3.push(new Arrow(stage, e.clone().multiplyScalar(-1), e, Palette.axis, { mode: "3d", headLength: 0.12, width: 2 })));
    ["x", "y", "z"].forEach((n, i) => this.axisLabels.push({ h: fl.add({ tex: n, x: 0, y: 0, size: 30, color: Palette.muted }), at: axisEnds[i].clone().multiplyScalar(1.12) }));
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const v = new THREE.Vector3(x, y, z);
          const flyer = new Dot(stage, new THREE.Vector3(), Palette.text, 6, "2d");
          this.screen.adopt(flyer.object);
          const idx = this.lattice.length;
          this.lattice.push({ v, dot3: new Dot(stage, v, Palette.text, 0.045, "3d"), flyer, delay: ((idx * 7) % 27) / 27 });
        }
      }
    }
    this.kernelLine = new Polyline(stage, [KER.clone().multiplyScalar(-1.2), KER.clone().multiplyScalar(1.2)], { color: Palette.purple, width: 6 });
    this.kernelPlane = new TangentPlane(stage, Palette.purple, 1.2);
    this.kernelPlane.place(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 0));
    const basisVecs = [KER, V2, V3];
    const basisColors = [Palette.purple, Palette.text, Palette.text];
    basisVecs.forEach((b, i) => {
      this.basis.push(new Arrow(stage, new THREE.Vector3(), b, basisColors[i], { mode: "3d", headLength: 0.14, width: 5 }));
      this.basisLabels.push(fl.add({ tex: `v_${i + 1}`, x: 0, y: 0, size: 34, color: basisColors[i] }));
    });

    // ---- Panel: R²
    const w = PANEL_W / 2;
    const h = PANEL_H / 2;
    this.panelBg = new Region(stage, [this.panel.v(-w, -h), this.panel.v(w, -h), this.panel.v(w, h), this.panel.v(-w, h)], Palette.panel, 0.92, -0.05);
    this.panel.adopt(this.panelBg.object);
    this.panelBg.object.position.z = -0.05;
    const iw = 2.45 * UNIT;
    const ih = 2.3 * UNIT;
    this.panelFill = new Region(stage, [this.panel.v(-iw, -ih), this.panel.v(iw, -ih), this.panel.v(iw, ih), this.panel.v(-iw, ih)], Palette.green, 0.12, -0.03);
    this.panel.adopt(this.panelFill.object);
    this.panelFill.object.position.z = -0.03;
    const ax = new PxArrow(stage, this.panel, Palette.axis, 14, 2.5);
    ax.set(-2.5 * UNIT, 0, 2.55 * UNIT, 0);
    const ay = new PxArrow(stage, this.panel, Palette.axis, 14, 2.5);
    ay.set(0, 2.35 * UNIT, 0, -2.4 * UNIT);
    this.panelAxes = [ax, ay];
    this.imageLine = new Polyline(stage, [this.panel.v(-2.4 * UNIT, 2.4 * 0.9 * UNIT), this.panel.v(2.4 * UNIT, -2.4 * 0.9 * UNIT)], { color: Palette.green, width: 5 });
    this.panel.adopt(this.imageLine.object);
    const imgColors = [Palette.purple, Palette.green, Palette.green];
    for (let i = 0; i < 3; i++) {
      this.imgArrows.push(new PxArrow(stage, this.panel, imgColors[i], 18, 5));
      this.imgLabels.push(fl.add({ tex: ["Lv_1=0", "Lv_2", "Lv_3"][i], x: 0, y: 0, size: 30, color: imgColors[i] }));
    }
    this.panelTitle = fl.add({ tex: "\\mathbb{R}^2", x: PANEL_X - w + 40, y: PANEL_Y - h + 34, size: 34, color: Palette.muted });
    this.fillLabel = fl.add({ tex: "\\operatorname{im}L=\\mathbb{R}^2", x: PANEL_X + 150, y: PANEL_Y - h + 36, size: 32, color: Palette.green });
    this.lineLabel = fl.add({ tex: "\\operatorname{im}L'", x: PANEL_X + 160, y: PANEL_Y - h + 36, size: 32, color: Palette.green });
    this.kerLabel = fl.add({ tex: "\\ker L", x: 0, y: 0, size: 32, color: Palette.purple });

    // ---- Formulas
    this.defs = fl.add({ tex: "\\ker L=\\{v:\\,Lv=0\\},\\qquad \\operatorname{im}L=\\{Lv:\\,v\\in\\mathbb{R}^n\\},\\qquad \\operatorname{rank}L=\\dim\\operatorname{im}L", x: 750, y: 96, size: 34 });
    this.matrix = fl.add({ tex: "L=\\begin{pmatrix}1&1&0\\\\0&0&1\\end{pmatrix},\\qquad L(x,y,z)=(x+y,\\ z)", x: 750, y: 100, size: 38 });
    this.count = fl.add({ tex: "\\dim\\ker L+\\operatorname{rank}L=1+2=3", x: 750, y: 800, size: 38 });
    this.theorem = fl.add({ tex: "\\dim\\ker L+\\operatorname{rank}L=n", x: 750, y: 800, size: 44, boxed: true, color: Palette.yellow });
    this.basisText = fl.add({ tex: `${Tex.c(Palette.purple, "v_1=(1,-1,0)\\in\\ker L")},\\qquad v_2=(1,0,0),\\qquad v_3=(0,0,1)`, x: 750, y: 800, size: 34 });
    this.claim = fl.add({ tex: "\\text{Claim: } Lv_{r+1},\\dots,Lv_n\\ \\text{is a basis of } \\operatorname{im}L", x: 750, y: 100, size: 38, color: Palette.yellow });
    this.span = fl.add({ tex: this.spanTex(0), x: 750, y: 800, size: 38 });
    this.indep = fl.add({ tex: this.indepTex(0), x: 880, y: 450, size: 34, display: true });
    this.dropCount = fl.add({ tex: "\\dim\\ker L'+\\operatorname{rank}L'=2+1=3", x: 750, y: 800, size: 38 });
    this.cardRank = fl.add({ tex: "L\\in\\mathbb{R}^{k\\times n},\\ \\operatorname{rank}L=k\\ \\Rightarrow\\ \\dim\\ker L=n-k", x: 750, y: 360, size: 40, boxed: true });
    this.cardDim = fl.add({ tex: "W\\subseteq V\\ \\text{subspaces},\\ \\dim W=\\dim V<\\infty\\ \\Rightarrow\\ W=V", x: 750, y: 540, size: 40, boxed: true });

    const cue = new Cues(timing, 0);
    this.ledger = new ProofLedger(fl, [
      { label: "R–N", tex: "\\dim\\ker L+\\operatorname{rank}L=n", at: cue.s(24) + 2.0 },
      { label: "1", tex: "\\operatorname{rank}L=k\\Rightarrow\\dim\\ker=n-k", at: cue.s(31) + 2.0 },
      { label: "2", tex: "W\\subseteq V,\\ \\text{same dim}\\Rightarrow W{=}V", at: cue.s(32) + 2.0 },
    ], { x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 });
  }

  private spanTex(n: number): string {
    return Tex.reveal(["w=Lv", "=L\\Big(\\sum_{i=1}^n c_iv_i\\Big)", "=\\sum_{i=1}^n c_i\\,Lv_i", `=\\sum_{i>r} c_i\\,Lv_i\\quad ${Tex.c(Palette.purple, "(Lv_i=0,\\ i\\le r)")}`], n);
  }

  private indepTex(n: number): string {
    const lines = [
      "&\\textstyle\\sum_{i>r} c_i\\,Lv_i=0",
      "\\Rightarrow\\ &\\textstyle L\\big(\\sum_{i>r} c_iv_i\\big)=0\\ \\Rightarrow\\ \\sum_{i>r} c_iv_i\\in\\ker L",
      "\\Rightarrow\\ &\\textstyle\\sum_{i>r} c_iv_i=\\sum_{j\\le r} d_jv_j",
      "\\Rightarrow\\ &\\textstyle\\sum_{i>r} c_iv_i-\\sum_{j\\le r} d_jv_j=0",
      "\\Rightarrow\\ &\\text{all } c_i=0\\quad(v_1,\\dots,v_n\\ \\text{independent})",
      `\\Rightarrow\\ &${Tex.c(Palette.yellow, "\\operatorname{rank}L=n-r")}`,
    ];
    return Tex.revealLines(lines, n);
  }

  private image(v: THREE.Vector3, m: number): { x: number; y: number } {
    const X = v.x + v.y;
    const Y = lerp(v.z, 2 * (v.x + v.y), m);
    const vs = lerp(1, 0.45, m);
    return { x: X * UNIT, y: -Y * UNIT * vs };
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;

    const lay = keyframes(t, [
      { t: 0, v: { sx: 430, sy: 480, d: 11.5 } },
      { t: c.s(18), v: { sx: 300, sy: 480, d: 15 } },
      { t: c.s(25), v: { sx: 430, sy: 480, d: 11.5 } },
      { t: c.s(30), v: { sx: 430, sy: 480, d: 11.5 } },
    ], 1.0);
    const az = lerp(0.5, 0.75, smoothstep(0, ctx.duration, t));
    Orbit.frame(this.stage, az, 0.38, lay.d, FOV, new THREE.Vector3(0, 0, 0), lay.sx, lay.sy);
    this.hud.sync(this.stage, FOV);
    this.screen.place(0, 0, 1);

    const cardsPhase = c.p(30, 0.8);
    const scene3 = c.p(0, 1.0, -1.4) * (1 - 0.85 * cardsPhase);
    this.axes3.forEach((a) => a.setOpacity(scene3 * 0.9));
    this.axisLabels.forEach((l) => {
      const f = this.stage.project(l.at);
      l.h.set({ x: f.x, y: f.y, opacity: scene3 });
    });

    // ---- Panel visibility: mapping (s5–s17) and rank drop (s25–s29); hidden during the derivation.
    const panelVis = c.p(5, 0.8) * (1 - c.p(18, 0.6)) + c.p(25, 0.8) * (1 - cardsPhase);
    this.panelBg.setOpacity(0.92 * panelVis);
    this.panelAxes.forEach((a) => a.setOpacity(panelVis));
    this.panelTitle.set({ opacity: panelVis });
    const collapse = c.over(27, 0.05, 0.6);
    const latticeDim = 1 - 0.7 * c.p(10, 0.8) * (1 - c.p(25, 0.8));
    const fly = c.over(5, 0.05, 0.95);
    for (const lp of this.lattice) {
      const onKer = Math.abs(lp.v.x + lp.v.y) < 1e-9 && Math.abs(lp.v.z) < 1e-9;
      const onPlane = Math.abs(lp.v.x + lp.v.y) < 1e-9;
      const purple = onKer || (onPlane && collapse > 0.5);
      lp.dot3.setColor(purple && t >= c.s(6) ? Palette.purple : Palette.text);
      lp.dot3.setOpacity(scene3 * latticeDim);
      const s = smoothstep(lp.delay * 0.6, lp.delay * 0.6 + 0.4, fly);
      const from = this.stage.project(lp.v);
      const img = this.image(lp.v, collapse);
      const to = this.panel.toFrame(img.x, img.y);
      const x = lerp(from.x, to.x, s);
      const y = lerp(from.y, to.y, s);
      lp.flyer.setPosition(this.screen.v(x, y, 0.05));
      lp.flyer.setColor(purple && t >= c.s(6) ? Palette.purple : Palette.text);
      lp.flyer.setOpacity((s > 0.001 ? 1 : 0) * panelVis);
    }
    const kerFocus = c.p(6, 0.6);
    this.kernelLine.setOpacity(scene3 * kerFocus);
    this.kernelLine.setWidth(t >= c.s(6) && t < c.e(6) ? 8 : 6);
    const kerLabelAt = KER.clone().multiplyScalar(1.3);
    const kf = this.stage.project(kerLabelAt);
    this.kerLabel.setContent(collapse > 0.5 ? "\\ker L'" : "\\ker L");
    this.kerLabel.set({ x: kf.x + 10, y: kf.y + 24, opacity: scene3 * kerFocus * (1 - c.p(10, 0.5)) + scene3 * c.p(27, 0.6) * (1 - cardsPhase) });
    this.panelFill.setOpacity(0.14 * c.p(7, 0.8) * (1 - c.p(18, 0.6)));
    this.fillLabel.set({ opacity: c.p(7, 0.8) * (1 - c.p(18, 0.6)) });
    this.kernelPlane.setOpacity(c.p(27, 1.0) * (1 - cardsPhase) * 0.9);
    this.imageLine.setOpacity(c.p(27, 0.8, 0.8) * (1 - cardsPhase));
    this.lineLabel.set({ opacity: c.p(27, 0.8, 0.8) * (1 - cardsPhase) });

    // ---- Basis vectors (s10–s24), flashing with the derivation lines.
    const basisVis = c.p(10, 0.6) * (1 - c.p(25, 0.6));
    const flashKer = t >= c.s(21) && t < c.e(21) ? 0.5 + 0.5 * Math.cos((t - c.s(21)) * 2 * Math.PI / 0.9) : 1;
    const flashExt = t >= c.s(19) && t < c.e(20) ? 0.5 + 0.5 * Math.cos((t - c.s(19)) * 2 * Math.PI / 0.9) : 1;
    const shows = [basisVis, c.p(11, 0.6, 0.3) * (1 - c.p(25, 0.6)), c.p(11, 0.6, 1.2) * (1 - c.p(25, 0.6))];
    const flashes = [flashKer, flashExt, flashExt];
    const ends = [KER, V2, V3];
    this.basis.forEach((b, i) => {
      b.set(new THREE.Vector3(), ends[i]);
      b.setOpacity(shows[i] * (0.35 + 0.65 * flashes[i]));
      const f = this.stage.project(ends[i].clone().multiplyScalar(1.18));
      this.basisLabels[i].set({ x: f.x, y: f.y, opacity: shows[i] });
    });

    // ---- Images of the basis in the panel (s16–s17).
    const imgVis = c.p(16, 0.6) * (1 - c.p(18, 0.6));
    const shrink = c.over(16, 0.15, 0.6);
    const v1len = lerp(1.0, 0, shrink);
    this.imgArrows[0].set(0, 0, v1len * 0.7 * UNIT, -v1len * 0.7 * UNIT);
    this.imgArrows[0].setOpacity(imgVis);
    this.imgArrows[1].set(0, 0, UNIT, 0);
    this.imgArrows[1].setOpacity(c.p(16, 0.6, 2.0) * (1 - c.p(18, 0.6)));
    this.imgArrows[2].set(0, 0, 0, -UNIT);
    this.imgArrows[2].setOpacity(c.p(16, 0.6, 2.0) * (1 - c.p(18, 0.6)));
    const lab = [this.panel.toFrame(-58, 30), this.panel.toFrame(UNIT + 34, 26), this.panel.toFrame(42, -UNIT - 14)];
    this.imgLabels.forEach((l, i) => l.set({ x: lab[i].x, y: lab[i].y, opacity: i === 0 ? imgVis * smoothstep(0.5, 1, shrink) : c.p(16, 0.6, 2.0) * (1 - c.p(18, 0.6)) }));

    // ---- Formulas
    this.defs.set({ opacity: c.p(1, 0.6) * (1 - c.p(3, 0.5)) });
    this.matrix.set({ opacity: c.p(3, 0.6) * (1 - c.p(13, 0.5)) });
    this.count.set({ opacity: c.p(8, 0.6) * (1 - c.p(9, 0.5)) });
    this.theorem.set({ opacity: c.p(9, 0.6) * (1 - c.p(10, 0.5)) });
    this.basisText.set({ opacity: c.p(12, 0.6) * (1 - c.p(14, 0.5)) });
    this.claim.set({ opacity: c.p(13, 0.6) * (1 - c.p(25, 0.5)) });
    const spanN = t >= c.s(17) ? 4 : t >= c.in(16, 0.45) ? 4 : t >= c.s(16) ? 3 : t >= c.in(15, 0.5) ? 2 : t >= c.s(15) ? 1 : 0;
    this.span.setContent(this.spanTex(spanN));
    this.span.set({ opacity: (spanN > 0 ? 1 : 0) * (1 - c.p(18, 0.5)), color: t >= c.s(17) ? Palette.green : Palette.text });
    const indN = t >= c.s(24) ? 6 : t >= c.s(23) ? 5 : t >= c.s(22) ? 4 : t >= c.s(21) ? 3 : t >= c.s(20) ? 2 : t >= c.s(19) ? 1 : 0;
    this.indep.setContent(this.indepTex(indN));
    this.indep.set({ opacity: (indN > 0 ? 1 : 0) * (1 - c.p(25, 0.6)) });
    this.dropCount.set({ opacity: c.p(28, 0.6) * (1 - cardsPhase) });
    this.matrix.setContent(t >= c.s(25)
      ? "L'=\\begin{pmatrix}1&1&0\\\\2&2&0\\end{pmatrix},\\qquad L'(x,y,z)=(x+y,\\ 2(x+y))"
      : "L=\\begin{pmatrix}1&1&0\\\\0&0&1\\end{pmatrix},\\qquad L(x,y,z)=(x+y,\\ z)");
    if (t >= c.s(25)) this.matrix.set({ opacity: c.p(26, 0.6) * (1 - cardsPhase) });
    this.cardRank.set({ opacity: c.p(31, 0.7) });
    this.cardDim.set({ opacity: c.p(32, 0.7) });

    this.ledger.update(t, clamp01(c.p(24, 0.5, 2.0)));
  }

  teardown(_layers: SceneLayers): void {}
}
