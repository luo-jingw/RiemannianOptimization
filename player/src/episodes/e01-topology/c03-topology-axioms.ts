import * as THREE from "three";
import type { ChapterTiming, Scene, SceneContext } from "../../core/Scene";
import type { SceneLayers } from "../../core/SceneLayers";
import type { FormulaHandle } from "../../layers/FormulaLayer";
import type { StageLayer } from "../../layers/StageLayer";
import { Cues } from "../../primitives/Cues";
import { Dot } from "../../primitives/Dot";
import { lerp, smoothstep } from "../../primitives/Easing";
import { keyframes } from "../../primitives/Keyframes";
import { Palette } from "../../primitives/Palette";
import { Polyline, circlePoints } from "../../primitives/Polyline";
import { Region } from "../../primitives/Region";
import { placeAt } from "./lib/place";
import { Shapes } from "./lib/shapes";
import { tc } from "./lib/tex";

/**
 * E01 c03 — the topology axioms; metric open sets satisfy them; ∩(−1/n, 1/n) = {0} is not open;
 * trivial and discrete topologies on {a, b, c, d}; the subspace topology on S¹ ⊂ ℝ².
 * Sentence indices refer to content/episodes/e01-topology/story.en.json, scene c03-topology-axioms.
 */

const BASE_VIEW = { cx: 0, cy: -0.3, h: 6 };       // 180 px per unit, origin at pixel (960, 486)
const LINE_H = 1.62;                               // number-line view: [−1.2, 1.2] spans 1600 px
const LINE_AXIS_PX = 700;                          // pixel row of the number line
const N_MAX = 40;
const BAR_PX0 = 660;                               // pixel row of the bar n = 1
const BAR_STEP_PX = 10;
const X_OUT = 0.15;                                // the nonzero point excluded from U_n for n > 1/|x|
const PX_PER_UNIT = 1080 / LINE_H;
const CARD_X = [300, 820, 1460];

const barY = (n: number): number => (LINE_AXIS_PX - (BAR_PX0 - (n - 1) * BAR_STEP_PX)) / PX_PER_UNIT;

function hueColor(n: number): string {
  const c = new THREE.Color();
  c.setHSL(0.58 - 0.5 * ((n - 1) / (N_MAX - 1)), 0.75, 0.62);
  return `#${c.getHexString()}`;
}

/** Angular interval of the unit circle inside the open disk |p − c| < ρ, or null if empty. */
function arcInDisk(c: THREE.Vector3, rho: number): { a0: number; a1: number } | null {
  const d = c.length();
  if (d < 1e-9) return null;
  const k = (d * d + 1 - rho * rho) / (2 * d);
  if (k >= 1 || k <= -1) return null;
  const psi = Math.atan2(c.y, c.x);
  const w = Math.acos(k);
  return { a0: psi - w, a1: psi + w };
}

export class TopologyAxiomsScene implements Scene {
  readonly id = "c03-topology-axioms";
  private stage!: StageLayer;

  private intro!: FormulaHandle;
  private tauTitle!: FormulaHandle;
  private cards: FormulaHandle[] = [];
  private spaceNote!: FormulaHandle;
  private emptyNote!: FormulaHandle;

  // unions
  private unionFills: Region[] = [];
  private unionEdges: Polyline[] = [];
  private unionLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private unionOutline: Polyline[] = [];
  private ux!: Dot;
  private uxLabel!: FormulaHandle;
  private uxBall!: Polyline;
  private unionNote!: FormulaHandle;

  // finite intersections
  private interFills: Region[] = [];
  private interEdges: Polyline[] = [];
  private interLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private ix!: Dot;
  private ixLabel!: FormulaHandle;
  private ball1!: Polyline;
  private ball2!: Polyline;
  private ballLabel1!: FormulaHandle;
  private ballLabel2!: FormulaHandle;
  private minNote!: FormulaHandle;

  // infinite intersection
  private axis!: Polyline;
  private ticks: Polyline[] = [];
  private tickLabels: { h: FormulaHandle; v: number }[] = [];
  private bars: Polyline[] = [];
  private counter!: FormulaHandle;
  private radiusReadout!: FormulaHandle;
  private zeroDot!: Dot;
  private zeroLabel!: FormulaHandle;
  private interFormula!: FormulaHandle;
  private xOutDot!: Dot;
  private xOutLine!: Polyline;
  private xOutNote!: FormulaHandle;
  private probe!: Polyline;
  private probeEnds: Dot[] = [];
  private probePoint!: Dot;
  private probeReadout!: FormulaHandle;
  private notOpen!: FormulaHandle;
  private infNote!: FormulaHandle;
  private finiteNote!: FormulaHandle;

  // finite set
  private finTitle!: FormulaHandle;
  private colTitles: FormulaHandle[] = [];
  private finPoints: Dot[] = [];
  private finPointLabels: { h: FormulaHandle; at: THREE.Vector3 }[] = [];
  private trivialLoop!: Polyline;
  private trivialNote!: FormulaHandle;
  private discreteLoops: Polyline[] = [];
  private discreteNote!: FormulaHandle;
  private metricNote!: FormulaHandle;
  private decideNote!: FormulaHandle;

  // subspace topology
  private circle!: Polyline;
  private circleLabel!: FormulaHandle;
  private diskFill!: Region;
  private diskEdge!: Polyline;
  private diskLabel!: FormulaHandle;
  private arc!: Polyline;
  private arcEnds: Dot[] = [];
  private subDef!: FormulaHandle;
  private subAxioms!: FormulaHandle;
  private arcNote!: FormulaHandle;

  setup(layers: SceneLayers, _timing: ChapterTiming): void {
    const stage = layers.stage;
    const fl = layers.formulas;
    this.stage = stage;
    const o = new THREE.Vector3(0, 0, 0);

    this.intro = fl.add({ text: "open sets of a metric space  →  their properties  →  the definition", x: 960, y: 470, size: 38, color: Palette.muted });
    this.tauTitle = fl.add({ tex: "\\text{a topology on } X:\\quad \\tau\\subseteq 2^X", x: 960, y: 250, size: 46 });
    this.cards = [
      fl.add({ tex: this.cardTex(0, false), x: 960, y: 440, size: 40, boxed: true }),
      fl.add({ tex: this.cardTex(1, false), x: 960, y: 440, size: 40, boxed: true }),
      fl.add({ tex: this.cardTex(2, false), x: 960, y: 440, size: 40, boxed: true }),
    ];
    this.spaceNote = fl.add({ tex: "U\\in\\tau:\\ \\text{open set}\\qquad (X,\\tau):\\ \\text{topological space}", x: 960, y: 640, size: 40, color: Palette.text });
    this.emptyNote = fl.add({ tex: "\\varnothing:\\ \\text{no point to check}\\qquad X:\\ B_r(x)\\subseteq X\\ \\text{always}", x: 960, y: 812, size: 38 });

    // ---- unions
    const blobs = [Shapes.blob(-1.45, -0.2, 1.05, 0.1, 0.06, 0.3, 0.9), Shapes.blob(0, 0.35, 1.0, 0.12, 0.05, 1.4, 0.9), Shapes.blob(1.45, -0.25, 1.05, 0.08, 0.07, 2.2, 0.9)];
    const unionColors = [Palette.blue, Palette.purple, Palette.teal];
    blobs.forEach((b, i) => {
      this.unionFills.push(new Region(stage, b, unionColors[i], 0.18, -0.01 - 0.001 * i));
      this.unionEdges.push(new Polyline(stage, b, { color: unionColors[i], width: 2, dashed: true, dashSize: 0.1, gapSize: 0.07 }));
      this.unionLabels.push({ h: fl.add({ tex: `U_${i + 1}`, x: 0, y: 0, size: 36, color: unionColors[i] }), at: [new THREE.Vector3(-2.2, 0.75, 0), new THREE.Vector3(0, 1.45, 0), new THREE.Vector3(2.25, 0.7, 0)][i] });
      for (const run of Shapes.outsideRuns(b, blobs.filter((_, j) => j !== i))) {
        this.unionOutline.push(new Polyline(stage, run, { color: Palette.green, width: 5 }));
      }
    });
    const uxp = new THREE.Vector3(0.05, 0.85, 0);
    this.ux = new Dot(stage, uxp, Palette.orange, 0.05);
    this.uxLabel = fl.add({ tex: "x", x: 0, y: 0, size: 34, color: Palette.orange });
    this.uxBall = new Polyline(stage, circlePoints(uxp.x, uxp.y, 0.85 * Shapes.distanceToCurve(uxp, blobs[1]), 64), { color: Palette.orange, width: 3 });
    this.unionNote = fl.add({ tex: "x\\in U_\\beta\\ \\Rightarrow\\ B_r(x)\\subseteq U_\\beta\\subseteq \\textstyle\\bigcup_\\alpha U_\\alpha", x: 960, y: 812, size: 40 });

    // ---- finite intersections
    const ib = [Shapes.blob(-0.6, 0, 1.35, 0.06, 0.04, 0.8, 0.85), Shapes.blob(0.75, 0, 1.3, 0.07, 0.05, 2.0, 0.85)];
    const interColors = [Palette.blue, Palette.purple];
    ib.forEach((b, i) => {
      this.interFills.push(new Region(stage, b, interColors[i], 0.2, -0.01 - 0.001 * i));
      this.interEdges.push(new Polyline(stage, b, { color: interColors[i], width: 2.5, dashed: true, dashSize: 0.1, gapSize: 0.07 }));
      this.interLabels.push({ h: fl.add({ tex: `U_${i + 1}`, x: 0, y: 0, size: 36, color: interColors[i] }), at: [new THREE.Vector3(-1.9, 1.05, 0), new THREE.Vector3(2.05, 1.0, 0)][i] });
    });
    const ixp = new THREE.Vector3(0.38, 0.05, 0);
    const r1 = 0.95 * Shapes.distanceToCurve(ixp, ib[0]);
    const r2 = 0.95 * Shapes.distanceToCurve(ixp, ib[1]);
    this.ix = new Dot(stage, ixp, Palette.orange, 0.05);
    this.ixLabel = fl.add({ tex: "x", x: 0, y: 0, size: 34, color: Palette.orange });
    this.ball1 = new Polyline(stage, circlePoints(ixp.x, ixp.y, r1, 64), { color: Palette.blue, width: 3 });
    this.ball2 = new Polyline(stage, circlePoints(ixp.x, ixp.y, r2, 64), { color: Palette.purple, width: 3 });
    this.ballLabel1 = fl.add({ tex: "r_1", x: 0, y: 0, size: 30, color: Palette.blue });
    this.ballLabel2 = fl.add({ tex: "r_2", x: 0, y: 0, size: 30, color: Palette.purple });
    this.interRadii = { r1, r2, p: ixp };
    this.minNote = fl.add({ tex: this.minTex(false), x: 960, y: 812, size: 40 });

    // ---- infinite intersection (number-line view)
    this.axis = new Polyline(stage, [new THREE.Vector3(-1.3, 0, 0), new THREE.Vector3(1.3, 0, 0)], { color: Palette.axis, width: 2.5 });
    for (const v of [-1, -0.5, 0, 0.5, 1]) {
      this.ticks.push(new Polyline(stage, [new THREE.Vector3(v, -0.02, 0), new THREE.Vector3(v, 0.02, 0)], { color: Palette.axis, width: 2.5 }));
      this.tickLabels.push({ h: fl.add({ tex: v === 0 ? "0" : v === 0.5 ? "\\tfrac12" : v === -0.5 ? "-\\tfrac12" : String(v), x: 0, y: 0, size: 28, color: Palette.muted }), v });
    }
    for (let n = 1; n <= N_MAX; n++) {
      this.bars.push(new Polyline(stage, [new THREE.Vector3(-1 / n, barY(n), 0), new THREE.Vector3(1 / n, barY(n), 0)], { color: hueColor(n), width: 6 }));
    }
    this.counter = fl.add({ tex: "n=1", x: 120, y: 200, size: 44, align: "left", color: Palette.text });
    this.radiusReadout = fl.add({ tex: "1/n=1.000", x: 1800, y: 200, size: 40, align: "right", color: Palette.muted });
    this.zeroDot = new Dot(stage, o, Palette.yellow, 0.012);
    this.zeroLabel = fl.add({ tex: "\\{0\\}", x: 0, y: 0, size: 36, color: Palette.yellow });
    this.interFormula = fl.add({ tex: "U_n=\\left(-\\tfrac1n,\\tfrac1n\\right),\\qquad \\bigcap_{n\\ge 1}U_n=\\{0\\}", x: 960, y: 100, size: 42 });
    this.xOutDot = new Dot(stage, new THREE.Vector3(X_OUT, 0, 0), Palette.orange, 0.012);
    this.xOutLine = new Polyline(stage, [new THREE.Vector3(X_OUT, 0, 0), new THREE.Vector3(X_OUT, barY(N_MAX) + 0.03, 0)], { color: Palette.orange, width: 2, dashed: true, dashSize: 0.02, gapSize: 0.015 });
    this.xOutNote = fl.add({ tex: "x=0.15:\\ \\ n>\\tfrac{1}{|x|}\\approx 6.7\\ \\Rightarrow\\ x\\notin U_n\\ \\ (n\\ge 7)", x: 960, y: 812, size: 38, color: Palette.orange });
    this.probe = new Polyline(stage, [o, o], { color: Palette.blue, width: 8 });
    this.probeEnds = [new Dot(stage, o, Palette.blue, 0.01, "2d", true), new Dot(stage, o, Palette.blue, 0.01, "2d", true)];
    this.probePoint = new Dot(stage, o, Palette.red, 0.01);
    this.probeReadout = fl.add({ tex: "", x: 960, y: 812, size: 40 });
    this.notOpen = fl.add({ tex: "\\{0\\}\\notin\\tau", x: 960, y: 200, size: 48, color: Palette.red });
    this.infNote = fl.add({ tex: `\\text{finite: } r=\\min\\{r_1,\\dots,r_m\\}>0\\qquad\\text{infinite: } ${tc(Palette.red, "\\inf_n \\tfrac1n=0")}`, x: 960, y: 420, size: 44, boxed: true });
    this.finiteNote = fl.add({ tex: `\\text{(iii)}\\ \\ U_1\\cap\\cdots\\cap U_m\\in\\tau\\quad ${tc(Palette.yellow, "\\text{finite}")}\\ \\text{is essential}`, x: 960, y: 200, size: 42 });

    // ---- finite set {a, b, c, d}
    this.finTitle = fl.add({ text: "coarsest  vs  finest", x: 960, y: 100, size: 40, color: Palette.yellow });
    this.colTitles = [
      fl.add({ tex: "\\text{trivial: } \\tau=\\{\\varnothing,X\\}", x: 520, y: 190, size: 38, color: Palette.text }),
      fl.add({ tex: "\\text{discrete: } \\tau=2^X", x: 1400, y: 190, size: 38, color: Palette.text }),
    ];
    const pts = (cx: number): THREE.Vector3[] => [new THREE.Vector3(cx - 0.55, 0.45, 0), new THREE.Vector3(cx + 0.55, 0.45, 0), new THREE.Vector3(cx - 0.55, -0.55, 0), new THREE.Vector3(cx + 0.55, -0.55, 0)];
    const leftC = (520 - 960) / 180;
    const rightC = (1400 - 960) / 180;
    const names = ["a", "b", "c", "d"];
    for (const cx of [leftC, rightC]) {
      pts(cx).forEach((p, i) => {
        this.finPoints.push(new Dot(stage, p, Palette.orange, 0.06));
        this.finPointLabels.push({ h: fl.add({ tex: names[i], x: 0, y: 0, size: 32, color: Palette.orange }), at: p.clone().add(new THREE.Vector3(0.17, 0.15, 0)) });
      });
    }
    this.trivialLoop = new Polyline(stage, Shapes.capsule(new THREE.Vector3(leftC - 0.55, -0.05, 0), new THREE.Vector3(leftC + 0.55, -0.05, 0), 0.95), { color: Palette.blue, width: 3 });
    this.trivialNote = fl.add({ tex: "\\text{open: } \\varnothing\\ \\text{and}\\ X\\ \\text{only}", x: 520, y: 700, size: 34, color: Palette.blue });
    const P = pts(rightC);
    const loops: { pts: THREE.Vector3[]; color: string }[] = [
      { pts: circlePoints(P[0].x, P[0].y, 0.22, 48), color: Palette.blue },
      { pts: circlePoints(P[3].x, P[3].y, 0.22, 48), color: Palette.purple },
      { pts: Shapes.capsule(P[0], P[1], 0.32), color: Palette.green },
      { pts: Shapes.capsule(P[1], P[3], 0.36), color: Palette.teal },
      { pts: Shapes.capsule(P[2], P[3], 0.3), color: Palette.pink },
      { pts: Shapes.capsule(new THREE.Vector3(rightC - 0.55, -0.05, 0), new THREE.Vector3(rightC + 0.55, -0.05, 0), 0.95), color: Palette.yellow },
    ];
    this.discreteLoops = loops.map((l) => new Polyline(stage, l.pts, { color: l.color, width: 2.5 }));
    this.discreteNote = fl.add({ tex: "\\text{sample of } 2^X:\\ 16\\ \\text{sets in total}", x: 1400, y: 700, size: 34, color: Palette.muted });
    this.metricNote = fl.add({ tex: "d(x,y)=1\\ (x\\neq y)\\ \\Rightarrow\\ B_{1/2}(x)=\\{x\\}\\ \\text{open}", x: 960, y: 812, size: 38 });
    this.decideNote = fl.add({ text: "the open sets decide which points count as near", x: 960, y: 812, size: 36, color: Palette.yellow });

    // ---- subspace topology (circle at the left, formulas at the right)
    this.circle = new Polyline(stage, circlePoints(-1.9, 0, 1.0, 160).map((p) => p), { color: Palette.blue, width: 4 });
    this.circleLabel = fl.add({ tex: "S^1", x: 0, y: 0, size: 38, color: Palette.blue });
    this.diskFill = new Region(stage, circlePoints(0, 0, 0.6, 96), Palette.purple, 0.2);
    this.diskEdge = new Polyline(stage, circlePoints(0, 0, 0.6, 96), { color: Palette.purple, width: 2.5, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    this.diskLabel = fl.add({ tex: "U", x: 0, y: 0, size: 36, color: Palette.purple });
    this.arc = new Polyline(stage, Shapes.arc(0, 0, 1, 0, 1, 64), { color: Palette.green, width: 8 });
    this.arcEnds = [new Dot(stage, o, Palette.green, 0.05, "2d", true), new Dot(stage, o, Palette.green, 0.05, "2d", true)];
    this.subDef = fl.add({ tex: "\\tau_A=\\{\\,U\\cap A:\\ U\\in\\tau\\,\\}", x: 1300, y: 230, size: 46 });
    this.subAxioms = fl.add({ tex: this.subAxiomTex(0), x: 1300, y: 450, size: 38, display: true });
    this.arcNote = fl.add({ tex: `${tc(Palette.green, "\\text{open in } S^1")}\\ =\\ ${tc(Palette.purple, "U")}\\cap S^1`, x: 1300, y: 680, size: 42 });
  }

  private interRadii = { r1: 1, r2: 1, p: new THREE.Vector3() };

  private cardTex(i: number, emph: boolean): string {
    const y = (s: string): string => (emph ? tc(Palette.yellow, s) : s);
    if (i === 0) return "\\text{(i)}\\ \\ \\varnothing,\\ X\\in\\tau";
    if (i === 1) return `\\text{(ii)}\\ \\ \\textstyle\\bigcup_{\\alpha}U_\\alpha\\in\\tau\\ \\ (${y("\\text{any family}")})`;
    return `\\text{(iii)}\\ \\ U_1\\cap\\cdots\\cap U_m\\in\\tau\\ \\ (${y("\\text{finite}")})`;
  }

  private minTex(on: boolean): string {
    const body = "r=\\min\\{r_1,\\dots,r_m\\}>0\\ \\Rightarrow\\ B_r(x)\\subseteq U_i\\ \\ \\forall i";
    return on ? `${body}\\ \\Rightarrow\\ B_r(x)\\subseteq \\textstyle\\bigcap_i U_i` : `${body}\\phantom{\\ \\Rightarrow\\ B_r(x)\\subseteq \\textstyle\\bigcap_i U_i}`;
  }

  private subAxiomTex(n: number): string {
    const rows = [
      "\\varnothing=\\varnothing\\cap A,\\qquad A=X\\cap A",
      "\\textstyle\\bigcup_\\alpha(U_\\alpha\\cap A)=\\big(\\bigcup_\\alpha U_\\alpha\\big)\\cap A",
      "\\textstyle\\bigcap_{i=1}^m(U_i\\cap A)=\\big(\\bigcap_{i} U_i\\big)\\cap A",
    ];
    return `\\begin{aligned}${rows.map((r, i) => (i < n ? r : `\\phantom{${r}}`)).join("\\\\[6pt]")}\\end{aligned}`;
  }

  draw(ctx: SceneContext): void {
    const c = new Cues(ctx, ctx.localTime);
    const t = c.t;
    const stage = this.stage;

    // ---- view: base view except during the number-line section (s16 + 0.6 s … s26 + 0.6 s)
    const lineView = t >= c.s(16) + 0.6 && t < c.s(26) + 0.6;
    const zoom = c.over(21, 0.0, 0.9) * (1 - c.p(22, 0.6));
    const zoomR = 0.3 * Math.pow(0.01 / 0.3, c.over(21, 0.05, 0.85));
    const probeIn = c.p(20, 0.6) * (1 - c.p(22, 0.6));
    const lineH = lerp(LINE_H, LINE_H * (zoomR / 0.3) * 0.75, Math.max(zoom, 0));
    if (lineView) stage.setView2D(0, ((LINE_AXIS_PX - 540) * lineH) / 1080, lineH);
    else stage.setView2D(BASE_VIEW.cx, BASE_VIEW.cy, BASE_VIEW.h);

    // ---- axioms (s0–s15)
    this.intro.set({ opacity: c.p(0, 0.6, 0.3) * (1 - c.p(1, 0.5)) });
    this.tauTitle.set({ opacity: c.p(1, 0.6) * (1 - c.p(7, 0.6)) });
    const cardsTop = c.p(7, 1.0);
    const emph = t >= c.s(6) && t < c.s(7);
    const activeCard = t >= c.s(12) ? 2 : t >= c.s(9) ? 1 : t >= c.s(8) ? 0 : -1;
    for (let i = 0; i < 3; i++) {
      const k = keyframes(t, [
        { t: 0, v: { x: CARD_X[i] + 80, y: 440, s: 1, o: 0 } },
        { t: c.s(2 + i), v: { x: CARD_X[i], y: 440, s: 1, o: 1 } },
        { t: c.s(7), v: { x: CARD_X[i], y: 105, s: 0.78, o: 1 } },
        { t: c.s(16), v: { x: CARD_X[i], y: 105, s: 0.78, o: 0 } },
      ], 0.7);
      this.cards[i].setContent(this.cardTex(i, emph || (activeCard === i && i > 0)));
      this.cards[i].set({ x: k.x, y: k.y, scale: k.s, opacity: k.o * (activeCard >= 0 && activeCard !== i ? 0.45 : 1), color: activeCard === i ? Palette.yellow : Palette.text });
    }
    void cardsTop;
    this.spaceNote.set({ opacity: c.p(5, 0.6) * (1 - c.p(7, 0.6)) });
    this.emptyNote.set({ opacity: c.p(8, 0.5) * (1 - c.p(9, 0.5)) });

    // unions (s9–s11)
    const unionOn = c.p(9, 0.6) * (1 - c.p(12, 0.6));
    this.unionFills.forEach((r) => r.setOpacity(0.18 * unionOn));
    this.unionEdges.forEach((e) => e.setOpacity(unionOn * 0.9));
    this.unionLabels.forEach((l) => placeAt(stage, l.h, l.at, 0, 0, unionOn));
    const xIn = unionOn * c.p(9, 0.5, 1.0);
    this.ux.setOpacity(xIn);
    placeAt(stage, this.uxLabel, new THREE.Vector3(0.05, 0.85, 0), 16, -20, xIn);
    this.uxBall.setOpacity(unionOn * c.p(10, 0.6, 1.0));
    const glow = unionOn * c.p(11, 0.6);
    const pulse = t >= c.s(11) ? 0.75 + 0.25 * Math.cos((t - c.s(11)) * 4) : 1;
    this.unionOutline.forEach((p) => p.setOpacity(glow * pulse));
    this.unionNote.set({ opacity: unionOn * c.p(10, 0.5, 0.5) });

    // finite intersections (s12–s15)
    const interOn = c.p(12, 0.6) * (1 - c.p(16, 0.6));
    this.interFills.forEach((r) => r.setOpacity(0.2 * interOn));
    this.interEdges.forEach((e) => e.setOpacity(interOn));
    this.interLabels.forEach((l) => placeAt(stage, l.h, l.at, 0, 0, interOn));
    this.ix.setOpacity(interOn * c.p(12, 0.5, 1.0));
    placeAt(stage, this.ixLabel, this.interRadii.p, -14, 22, interOn * c.p(12, 0.5, 1.0));
    const balls = interOn * c.p(13, 0.6, 0.5);
    const smallIs1 = this.interRadii.r1 < this.interRadii.r2;
    const bigFade = 1 - c.p(14, 0.8, 1.5);
    this.ball1.setOpacity(balls * (smallIs1 ? 1 : bigFade));
    this.ball2.setOpacity(balls * (smallIs1 ? bigFade : 1));
    this.ball1.setWidth(t >= c.s(14) && smallIs1 ? 4.5 : 3);
    this.ball2.setWidth(t >= c.s(14) && !smallIs1 ? 4.5 : 3);
    const p = this.interRadii.p;
    placeAt(stage, this.ballLabel1, new THREE.Vector3(p.x, p.y + this.interRadii.r1, 0), 0, -18, balls * (smallIs1 ? 1 : bigFade));
    placeAt(stage, this.ballLabel2, new THREE.Vector3(p.x, p.y - this.interRadii.r2, 0), 0, 20, balls * (smallIs1 ? bigFade : 1));
    this.minNote.setContent(this.minTex(t >= c.s(15)));
    this.minNote.set({ opacity: interOn * c.p(14, 0.6) });

    // ---- infinite intersection (s16–s25)
    const lineOn = lineView ? smoothstep(c.s(16) + 0.6, c.s(16) + 1.2, t) * (1 - smoothstep(c.s(26), c.s(26) + 0.6, t)) : 0;
    const tickOn = lineOn * (1 - c.p(20, 0.4));
    this.axis.setPoints([new THREE.Vector3(-1.3 * lineH / LINE_H - 0.01, 0, 0), new THREE.Vector3(1.3 * lineH / LINE_H + 0.01, 0, 0)]);
    this.axis.setOpacity(lineOn);
    this.ticks.forEach((tk, i) => tk.setOpacity(i === 2 ? lineOn * (1 - probeIn) : tickOn));
    this.tickLabels.forEach((l) => placeAt(stage, l.h, new THREE.Vector3(l.v, 0, 0), 0, 34, l.v === 0 ? lineOn * (1 - probeIn) : tickOn));
    const nNow = t < c.s(17) ? 1 + Math.floor(3 * c.over(16, 0.3, 1)) : Math.min(N_MAX, 4 + Math.floor((N_MAX - 3) * c.over(17, 0.0, 0.95)));
    const barsDim = (1 - probeIn) * (1 - 0.7 * c.p(22, 0.6));
    this.bars.forEach((b, i) => b.setOpacity(i < nNow ? lineOn * barsDim : 0));
    const countOn = lineOn * (1 - c.p(20, 0.5));
    this.counter.setContent(`n=${nNow}`);
    this.counter.set({ opacity: countOn });
    this.radiusReadout.setContent(`r_n=\\tfrac1n=${(1 / nNow).toFixed(3)}`);
    this.radiusReadout.set({ opacity: countOn });
    const zeroOn = lineOn * c.p(18, 0.6);
    this.zeroDot.setOpacity(zeroOn);
    this.zeroDot.setScale(lineH / LINE_H);
    placeAt(stage, this.zeroLabel, new THREE.Vector3(0, 0, 0), 0, 70, zeroOn * (1 - probeIn) * (1 - c.p(22, 0.5)));
    this.interFormula.set({ opacity: lineOn * c.p(16, 0.6, 0.6) * (1 - c.p(20, 0.5)) });
    const xOutOn = lineOn * c.during(19, 20, 0.4);
    this.xOutDot.setOpacity(xOutOn);
    this.xOutLine.setOpacity(xOutOn);
    this.xOutNote.set({ opacity: xOutOn });
    if (t >= c.s(19) && t < c.s(20)) this.bars.forEach((b, i) => b.setOpacity(i < nNow ? lineOn * (i + 1 >= 7 ? 0.35 : 1) : 0));

    const r = t < c.s(21) ? 0.3 : zoomR;
    const pr = probeIn * lineOn;
    this.probe.setPoints([new THREE.Vector3(-r, 0, 0), new THREE.Vector3(r, 0, 0)]);
    this.probe.setOpacity(pr * 0.8);
    const sc = lineH / LINE_H;
    this.probeEnds[0].setPosition(new THREE.Vector3(-r, 0, 0));
    this.probeEnds[1].setPosition(new THREE.Vector3(r, 0, 0));
    this.probeEnds.forEach((d) => { d.setOpacity(pr); d.setScale(sc * 1.4); });
    this.probePoint.setPosition(new THREE.Vector3(r / 2, 0, 0));
    this.probePoint.setOpacity(pr * c.p(20, 0.5, 0.8));
    this.probePoint.setScale(sc * 1.2);
    this.probeReadout.setContent(`(-r,r)\\ni ${tc(Palette.red, "\\tfrac r2\\neq 0")},\\qquad r=${r.toFixed(3)}`);
    this.probeReadout.set({ opacity: pr });
    this.notOpen.set({ opacity: pr * c.p(20, 0.5, 1.5) });
    const infOn = lineOn * c.p(22, 0.6) * (1 - c.p(24, 0.6));
    this.infNote.set({ opacity: infOn, y: 420 });
    this.finiteNote.set({ opacity: lineOn * c.p(24, 0.6) + (t >= c.s(26) ? 0 : 0) });
    
    // ---- finite set (s26–s30)
    const finOn = c.p(26, 0.6, 0.6) * (1 - c.p(31, 0.6));
    this.finTitle.set({ opacity: finOn * c.p(27, 0.6) });
    this.colTitles[0].set({ opacity: finOn * c.p(27, 0.6) });
    this.colTitles[1].set({ opacity: finOn * c.p(28, 0.6) });
    this.finPoints.forEach((d, i) => d.setOpacity(finOn * (i < 4 ? 1 : c.p(26, 0.6, 1.2))));
    this.finPointLabels.forEach((l, i) => placeAt(stage, l.h, l.at, 0, 0, finOn * (i < 4 ? 1 : c.p(26, 0.6, 1.2))));
    this.trivialLoop.setOpacity(finOn * c.p(27, 0.6, 0.6));
    this.trivialNote.set({ opacity: finOn * c.p(27, 0.6, 1.0) });
    this.discreteLoops.forEach((l, i) => l.setOpacity(finOn * c.p(28, 0.5, 0.5 + 0.45 * i)));
    this.discreteNote.set({ opacity: finOn * c.p(28, 0.6, 3.0) });
    this.metricNote.set({ opacity: finOn * c.during(29, 30, 0.4) });
    this.decideNote.set({ opacity: finOn * c.p(30, 0.6) });

    // ---- subspace topology (s31–s37)
    const subOn = c.p(31, 0.6, 0.3);
    const cx = -1.9;
    this.circle.setOpacity(subOn * c.p(35, 0.6) + subOn * c.p(32, 0.6) * (1 - c.p(35, 0.6)));
    placeAt(stage, this.circleLabel, new THREE.Vector3(cx - 0.9, -0.9, 0), 0, 0, subOn * c.p(32, 0.6));
    const move = c.over(37, 0.05, 0.95);
    const ang = lerp(0.35, 2.4, move);
    const dc = new THREE.Vector3(cx + 1.05 * Math.cos(ang), 1.05 * Math.sin(ang), 0);
    const rho = 0.6;
    const disk = circlePoints(dc.x, dc.y, rho, 96);
    this.diskFill.setPoints(disk);
    this.diskEdge.setPoints(disk);
    const diskOn = subOn * c.p(32, 0.6, 0.8);
    this.diskFill.setOpacity(0.2 * diskOn);
    this.diskEdge.setOpacity(diskOn);
    placeAt(stage, this.diskLabel, dc.clone().add(new THREE.Vector3(0.3, 0.42, 0)), 0, 0, diskOn);
    const iv = arcInDisk(new THREE.Vector3(dc.x - cx, dc.y, 0), rho);
    const arcOn = subOn * c.p(32, 0.6, 1.6);
    if (iv) {
      this.arc.setPoints(Shapes.arc(cx, 0, 1, iv.a0, iv.a1, 64));
      this.arcEnds[0].setPosition(new THREE.Vector3(cx + Math.cos(iv.a0), Math.sin(iv.a0), 0));
      this.arcEnds[1].setPosition(new THREE.Vector3(cx + Math.cos(iv.a1), Math.sin(iv.a1), 0));
    }
    this.arc.setOpacity(iv ? arcOn : 0);
    this.arcEnds.forEach((d) => d.setOpacity(iv ? arcOn : 0));
    this.subDef.set({ opacity: subOn * c.p(32, 0.6) });
    const ax = t >= c.s(34) ? 3 : t >= c.in(33, 0.5) ? 1 : 0;
    this.subAxioms.setContent(this.subAxiomTex(ax === 3 ? 3 : ax));
    this.subAxioms.set({ opacity: subOn * (ax > 0 ? 1 : 0) * (1 - c.p(35, 0.6)) });
    this.arcNote.set({ opacity: subOn * c.p(36, 0.6) });
  }

  teardown(_layers: SceneLayers): void {}
}
