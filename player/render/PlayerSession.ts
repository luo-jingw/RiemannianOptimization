import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { createServer, type ViteDevServer } from "vite";
import { resolve } from "node:path";

export const CHROME_PATH = "/usr/bin/google-chrome";
/** ANGLE on the host GPU; measured to provide WebGL2 in headless Chrome on this machine. */
export const CHROME_ARGS = ["--no-sandbox", "--use-angle=default", "--hide-scrollbars", "--mute-audio",
  "--force-device-scale-factor=1"];

export interface PlayerInfo {
  ready: boolean;
  duration: number;
  missingScenes: string[];
  error: string | null;
}

/** Starts the Vite dev server for the player. */
export async function startServer(port: number): Promise<ViteDevServer> {
  const server = await createServer({ configFile: resolve(import.meta.dirname, "..", "vite.config.ts"),
    server: { port, strictPort: true, host: "127.0.0.1", hmr: false, watch: null }, logLevel: "warn" });
  // No file watching or hot reload: edits made elsewhere during a long capture must not reload the page.
  await server.listen();
  return server;
}

/** One headless browser with one page showing the episode in capture mode. */
export class PlayerSession {
  private constructor(readonly browser: Browser, readonly page: Page, readonly info: PlayerInfo) {}

  static async open(port: number, episode: string, series: string | undefined): Promise<PlayerSession> {
    const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: CHROME_ARGS,
      defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const q = new URLSearchParams({ episode, capture: "1" });
    if (series) q.set("series", series);
    await page.goto(`http://127.0.0.1:${port}/?${q.toString()}`, { waitUntil: "load" });
    await page.waitForFunction("window.playerInfo && (window.playerInfo.ready || window.playerInfo.error)", { timeout: 120000 });
    const info = (await page.evaluate("window.playerInfo")) as PlayerInfo;
    if (info.error || errors.length) throw new Error(`player failed: ${info.error ?? ""} ${errors.join(" | ")}`);
    return new PlayerSession(browser, page, info);
  }

  async renderAt(t: number): Promise<void> {
    await this.page.evaluate((time: number) => window.renderAt(time), t);
  }

  async jpeg(quality: number): Promise<Uint8Array> {
    return this.page.screenshot({ type: "jpeg", quality, optimizeForSpeed: true,
      clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }

  async png(): Promise<Uint8Array> {
    return this.page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}

declare global {
  interface Window {
    renderAt: (t: number) => Promise<void>;
  }
}
