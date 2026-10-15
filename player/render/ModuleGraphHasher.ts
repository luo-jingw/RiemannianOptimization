import { build, type Plugin } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Content hash of TypeScript entry modules and every file they import, as resolved by esbuild (the same resolution
 * Vite uses). Imports matching `externals` are left out together with everything below them. Imports with a query
 * (`?url`, `?raw`) point into `public/`, which callers hash separately.
 */
export class ModuleGraphHasher {
  private readonly fileHashes = new Map<string, string>();

  constructor(private readonly root: string) {}

  /** Project-relative paths of the entries and all files they import. */
  async files(entries: string[], externals: RegExp[] = []): Promise<string[]> {
    const skip: Plugin = {
      name: "skip-imports",
      setup(b) {
        b.onResolve({ filter: /\?/ }, (args) => ({ path: args.path, external: true }));
        for (const re of externals) b.onResolve({ filter: re }, (args) => ({ path: args.path, external: true }));
      },
    };
    const result = await build({
      entryPoints: entries.map((e) => resolve(this.root, e)),
      absWorkingDir: this.root,
      bundle: true,
      write: false,
      metafile: true,
      outdir: "unused",
      format: "esm",
      platform: "browser",
      logLevel: "silent",
      loader: { ".css": "empty", ".woff": "empty", ".woff2": "empty", ".glsl": "text" },
      plugins: [skip],
    });
    return Object.keys(result.metafile.inputs).sort();
  }

  /** sha256 over (path, content hash) of the module graph of `entries`. */
  async hash(entries: string[], externals: RegExp[] = []): Promise<string> {
    return this.hashFiles(await this.files(entries, externals));
  }

  /** sha256 over (path, content hash) of the given project-relative files, in the given order. */
  hashFiles(files: string[]): string {
    const h = createHash("sha256");
    for (const f of files) h.update(`${f}\0${this.fileHash(f)}\n`);
    return h.digest("hex");
  }

  private fileHash(file: string): string {
    const cached = this.fileHashes.get(file);
    if (cached !== undefined) return cached;
    const digest = createHash("sha256").update(readFileSync(resolve(this.root, file))).digest("hex");
    this.fileHashes.set(file, digest);
    return digest;
  }
}
