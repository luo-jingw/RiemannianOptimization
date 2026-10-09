import { defineConfig, type Plugin } from "vite";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const projectRoot = resolve(__dirname, "..");
const MIME: Record<string, string> = {
  ".json": "application/json",
  ".wav": "audio/wav",
  ".srt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

/** Serves read-only project data: /data/build/** -> ../build/**, /data/content/** -> ../content/**. */
function projectData(): Plugin {
  return {
    name: "project-data",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        const match = /^\/data\/(build|content)\/(.+)$/.exec(url);
        if (!match) return next();
        const base = join(projectRoot, match[1]);
        const file = normalize(join(base, decodeURIComponent(match[2])));
        if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "no-store");
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: __dirname,
  plugins: [projectData()],
  server: { host: "127.0.0.1" },
});
