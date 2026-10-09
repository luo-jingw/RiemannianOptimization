import katex from "katex";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../core/Frame";

export type HAlign = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";

export interface FormulaSpec {
  /** KaTeX source. Exactly one of tex / text is set. */
  tex?: string;
  /** Plain text (rendered with the UI font). */
  text?: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
  align?: HAlign;
  valign?: VAlign;
  display?: boolean;
  maxWidth?: number;
  weight?: number;
  opacity?: number;
  /** Optional panel styling: background box behind the content. */
  boxed?: boolean;
}

export interface FormulaState {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  color: string;
}

const texCache = new Map<string, string>();

function renderTex(tex: string, display: boolean): string {
  const key = `${display ? "D" : "I"}${tex}`;
  const cached = texCache.get(key);
  if (cached !== undefined) return cached;
  const html = katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: "ignore", output: "html" });
  texCache.set(key, html);
  return html;
}

/** One positioned formula or text block. Scenes mutate it every frame through set(). */
export class FormulaHandle {
  readonly el: HTMLDivElement;
  private state: FormulaState;
  private readonly align: HAlign;
  private readonly valign: VAlign;
  private content: string;
  private readonly isTex: boolean;
  private readonly display: boolean;

  constructor(parent: HTMLElement, spec: FormulaSpec) {
    this.el = document.createElement("div");
    this.el.className = "formula" + (spec.boxed ? " formula-boxed" : "");
    this.align = spec.align ?? "center";
    this.valign = spec.valign ?? "middle";
    this.isTex = spec.tex !== undefined;
    this.display = spec.display ?? false;
    this.content = spec.tex ?? spec.text ?? "";
    this.el.style.fontSize = `${spec.size ?? 40}px`;
    this.el.style.textAlign = this.align;
    if (spec.maxWidth !== undefined) this.el.style.maxWidth = `${spec.maxWidth}px`;
    if (spec.weight !== undefined) this.el.style.fontWeight = String(spec.weight);
    this.writeContent();
    this.state = { x: spec.x, y: spec.y, opacity: spec.opacity ?? 0, scale: 1, color: spec.color ?? "#e8ecf4" };
    parent.appendChild(this.el);
    this.apply();
  }

  private writeContent(): void {
    if (this.isTex) this.el.innerHTML = renderTex(this.content, this.display);
    else this.el.textContent = this.content;
  }

  /** Replace the content; skipped when unchanged so DOM work stays proportional to real changes. */
  setContent(content: string): void {
    if (content === this.content) return;
    this.content = content;
    this.writeContent();
  }

  set(partial: Partial<FormulaState>): void {
    this.state = { ...this.state, ...partial };
    this.apply();
  }

  get current(): FormulaState {
    return this.state;
  }

  private apply(): void {
    const s = this.state;
    const tx = this.align === "left" ? "0%" : this.align === "center" ? "-50%" : "-100%";
    const ty = this.valign === "top" ? "0%" : this.valign === "middle" ? "-50%" : "-100%";
    this.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(${tx}, ${ty}) scale(${s.scale})`;
    this.el.style.transformOrigin = `${this.align === "left" ? "0%" : this.align === "center" ? "50%" : "100%"} 50%`;
    this.el.style.opacity = String(Math.max(0, Math.min(1, s.opacity)));
    this.el.style.visibility = s.opacity <= 0.001 ? "hidden" : "visible";
    this.el.style.color = s.color;
  }
}

/** HTML overlay for KaTeX formulas, labels and panels, in output-frame pixels. */
export class FormulaLayer {
  readonly host: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.host = document.createElement("div");
    this.host.className = "formula-layer";
    this.host.style.width = `${FRAME_WIDTH}px`;
    this.host.style.height = `${FRAME_HEIGHT}px`;
    parent.appendChild(this.host);
  }

  add(spec: FormulaSpec): FormulaHandle {
    return new FormulaHandle(this.host, spec);
  }

  clear(): void {
    this.host.replaceChildren();
  }
}
