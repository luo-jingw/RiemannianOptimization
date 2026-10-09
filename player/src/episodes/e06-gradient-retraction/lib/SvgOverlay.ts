import type { FormulaLayer } from "../../../layers/FormulaLayer";

const NS = "http://www.w3.org/2000/svg";

/** Style of one SVG stroke, in output-frame pixels. */
export interface SvgStroke {
  color: string;
  width: number;
  dash?: string;
  fill?: string;
}

/** One SVG path in frame pixels. All mutable attributes are set explicitly by the owner every frame. */
export class SvgPath {
  constructor(private readonly el: SVGPathElement) {}

  /** Polyline through the points; `closed` closes the path. Fewer than 2 points hides it. */
  setPoints(points: { x: number; y: number }[], closed = false): void {
    if (points.length < 2) {
      this.el.setAttribute("d", "");
      return;
    }
    let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) d += `L${points[i].x.toFixed(2)},${points[i].y.toFixed(2)}`;
    if (closed) d += "Z";
    this.el.setAttribute("d", d);
    // Round caps on long open paths rasterize with stray chords in headless Chrome (ANGLE);
    // only a two-point path of near-zero length (a dot) gets round caps.
    const dot = points.length === 2 && Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) < 0.5;
    this.el.setAttribute("stroke-linecap", dot ? "round" : "butt");
  }

  setOpacity(o: number): void {
    const v = Math.max(0, Math.min(1, o));
    this.el.setAttribute("opacity", v.toFixed(3));
    this.el.setAttribute("visibility", v > 0.001 ? "visible" : "hidden");
  }

  setColor(color: string): void {
    this.el.setAttribute("stroke", color);
  }

  setFill(color: string): void {
    this.el.setAttribute("fill", color);
  }
}

/** One SVG circle in frame pixels. */
export class SvgDot {
  constructor(private readonly el: SVGCircleElement) {}

  set(x: number, y: number, opacity: number): void {
    this.el.setAttribute("cx", x.toFixed(2));
    this.el.setAttribute("cy", y.toFixed(2));
    const v = Math.max(0, Math.min(1, opacity));
    this.el.setAttribute("opacity", v.toFixed(3));
    this.el.setAttribute("visibility", v > 0.001 ? "visible" : "hidden");
  }

  setColor(color: string): void {
    this.el.setAttribute("fill", color);
  }
}

/**
 * Full-frame SVG layer inside the formula overlay, for flat plots drawn over a 3D stage.
 * Elements are created once in setup; the formula layer's clear() removes the layer between chapters.
 * Insertion order is paint order, so create the overlay before formulas that must appear above it.
 */
export class SvgOverlay {
  private readonly svg: SVGSVGElement;

  constructor(formulas: FormulaLayer) {
    this.svg = document.createElementNS(NS, "svg");
    this.svg.setAttribute("width", "1920");
    this.svg.setAttribute("height", "1080");
    this.svg.setAttribute("viewBox", "0 0 1920 1080");
    this.svg.style.position = "absolute";
    this.svg.style.left = "0";
    this.svg.style.top = "0";
    this.svg.style.overflow = "visible";
    formulas.host.appendChild(this.svg);
  }

  path(stroke: SvgStroke): SvgPath {
    const el = document.createElementNS(NS, "path");
    el.setAttribute("stroke", stroke.color);
    el.setAttribute("stroke-width", String(stroke.width));
    el.setAttribute("fill", stroke.fill ?? "none");
    el.style.fill = stroke.fill ?? "none";
    el.setAttribute("stroke-linecap", "butt");
    el.setAttribute("stroke-linejoin", "bevel");   // round joins rasterize with artifacts in headless Chrome (ANGLE)
    if (stroke.dash) el.setAttribute("stroke-dasharray", stroke.dash);
    el.setAttribute("visibility", "hidden");
    this.svg.appendChild(el);
    return new SvgPath(el);
  }

  dot(color: string, radius: number): SvgDot {
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", String(radius));
    el.setAttribute("fill", color);
    el.setAttribute("visibility", "hidden");
    this.svg.appendChild(el);
    return new SvgDot(el);
  }
}
