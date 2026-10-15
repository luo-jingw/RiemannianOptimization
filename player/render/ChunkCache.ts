import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Encoded video chunks addressed by their cache key, one file per key in `dir`. A chunk is written to a temporary
 * name and renamed when complete, so an interrupted capture never leaves a truncated entry behind.
 */
export class ChunkCache {
  constructor(readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  path(key: string): string {
    return join(this.dir, `${key}.mp4`);
  }

  /** Where a chunk is encoded before commit(). */
  pendingPath(key: string): string {
    return join(this.dir, `${key}.partial.mp4`);
  }

  has(key: string): boolean {
    const p = this.path(key);
    return existsSync(p) && statSync(p).size > 0;
  }

  commit(key: string): void {
    renameSync(this.pendingPath(key), this.path(key));
  }

  /** Deletes every entry not in `keep`, and all leftover partial files. Returns the number of files removed. */
  prune(keep: Set<string>): number {
    let removed = 0;
    for (const name of readdirSync(this.dir)) {
      const key = name.replace(/\.partial\.mp4$|\.mp4$/, "");
      if (name.endsWith(".partial.mp4") || !keep.has(key)) {
        rmSync(join(this.dir, name), { force: true });
        removed++;
      }
    }
    return removed;
  }
}
