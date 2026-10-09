import type { FormulaHandle, FormulaLayer } from "../../../layers/FormulaLayer";
import type { StageLayer } from "../../../layers/StageLayer";
import { Palette } from "../../../primitives/Palette";
import { Polyline } from "../../../primitives/Polyline";
import { Region } from "../../../primitives/Region";
import type { PixelSpace } from "./PixelSpace";
import { PxGroup } from "./PxGroup";

interface CellState {
  fill: string;
  alpha: number;
  tex: string;
  color: string;
}

/**
 * A rows × cols grid of colored cells with a KaTeX entry in each cell, drawn in a pixel space.
 * Cell fills and entries are stored by setFill / setEntry; `draw` applies them with an overall opacity.
 * A scene sets every cell property that changes in the chapter on every frame before calling draw.
 */
export class MatrixGrid {
  readonly grp: PxGroup;
  private readonly fills: Region[] = [];
  private readonly lines: Polyline[] = [];
  private readonly entries: FormulaHandle[] = [];
  private readonly state: CellState[] = [];

  constructor(stage: StageLayer, formulas: FormulaLayer, space: PixelSpace,
              readonly rows: number, readonly cols: number, readonly cell = 72, fontSize = 30) {
    this.grp = new PxGroup(space);
    const w = cols * cell;
    const h = rows * cell;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const { x, y } = this.cellCenter(i, j);
        const half = cell / 2 - 2;
        const r = new Region(stage, [
          this.grp.v(x - half, y - half), this.grp.v(x + half, y - half),
          this.grp.v(x + half, y + half), this.grp.v(x - half, y + half)], Palette.panel, 0.9, -0.02);
        this.grp.adopt(r.object);
        r.object.position.z = -0.02;
        this.fills.push(r);
        this.entries.push(formulas.add({ tex: "0", x: 0, y: 0, size: fontSize }));
        this.state.push({ fill: Palette.panel, alpha: 0.9, tex: "0", color: Palette.text });
      }
    }
    for (let i = 0; i <= rows; i++) {
      const line = new Polyline(stage, [this.grp.v(-w / 2, -h / 2 + i * cell), this.grp.v(w / 2, -h / 2 + i * cell)],
        { color: Palette.axis, width: 1.5 });
      this.grp.adopt(line.object);
      this.lines.push(line);
    }
    for (let j = 0; j <= cols; j++) {
      const line = new Polyline(stage, [this.grp.v(-w / 2 + j * cell, -h / 2), this.grp.v(-w / 2 + j * cell, h / 2)],
        { color: Palette.axis, width: 1.5 });
      this.grp.adopt(line.object);
      this.lines.push(line);
    }
  }

  /** Pixel offset of the center of cell (i, j) from the grid center. */
  cellCenter(i: number, j: number): { x: number; y: number } {
    return { x: (j - (this.cols - 1) / 2) * this.cell, y: (i - (this.rows - 1) / 2) * this.cell };
  }

  /** Frame pixel of the center of cell (i, j) under the current placement. */
  cellFrame(i: number, j: number): { x: number; y: number } {
    const c = this.cellCenter(i, j);
    return this.grp.toFrame(c.x, c.y);
  }

  place(cx: number, cy: number, k = 1): void {
    this.grp.place(cx, cy, k);
  }

  setFill(i: number, j: number, color: string, alpha: number): void {
    const s = this.state[i * this.cols + j];
    s.fill = color;
    s.alpha = alpha;
  }

  setEntry(i: number, j: number, tex: string, color: string = Palette.text): void {
    const s = this.state[i * this.cols + j];
    s.tex = tex;
    s.color = color;
  }

  draw(opacity: number, textOpacity = opacity): void {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const idx = i * this.cols + j;
        const s = this.state[idx];
        this.fills[idx].setColor(s.fill);
        this.fills[idx].setOpacity(s.alpha * opacity);
        const f = this.cellFrame(i, j);
        this.entries[idx].setContent(s.tex);
        this.entries[idx].set({ x: f.x, y: f.y, scale: this.grp.scale, color: s.color, opacity: textOpacity });
      }
    }
    this.lines.forEach((l) => l.setOpacity(opacity));
  }
}
