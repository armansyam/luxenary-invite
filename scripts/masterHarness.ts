/**
 * Perkakas bersama skrip pemeriksa master tulisan tangan (`verify-master-visual.ts`, `audit-master-contrast.ts`):
 * daftar master, render dengan data demo yang disajikan server statis lokal, dan Chrome headless lewat DevTools Protocol.
 */
import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import http from "http";
import type { AddressInfo } from "net";
import os from "os";
import path from "path";
import { composeInvitationData } from "../lib/themeEngine";
import { renderTemplateFile } from "../lib/renderTemplate";
import { buildDemoInvitation } from "../lib/demoInvitation";

export const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const FREEZE = "<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>";

const EVENT_OF_DIR: Record<string, string> = { wedding: "WEDDING", birthday: "BIRTHDAY", khitan: "KHITAN", aqiqah: "AQIQAH", wisuda: "WISUDA", general: "GATHERING" };

export interface MasterFile { id: string; rel: string; eventType: string }

export function listMasters(): MasterFile[] {
  const out: MasterFile[] = [];
  for (const [dir, eventType] of Object.entries(EVENT_OF_DIR)) {
    const evDir = path.join("themes", dir);
    if (!fs.existsSync(evDir)) continue;
    for (const style of fs.readdirSync(evDir)) {
      const styleDir = path.join(evDir, style);
      if (!fs.statSync(styleDir).isDirectory()) continue;
      for (const f of fs.readdirSync(styleDir).filter((x) => x.endsWith(".html"))) out.push({ id: f.replace(/\.html$/, ""), rel: path.join(styleDir, f), eventType });
    }
  }
  return out;
}

export function requireTestDatabase() {
  if (!/\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "")) throw new Error("Jalankan dengan DATABASE_URL ke database luxenary_test.");
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".mp3": "audio/mpeg",
};

/**
 * Server statis lokal: hasil render disajikan di `/__render/<berkas>` dan path lain dari `public/`, sehingga stylesheet
 * bersama master (`/css/modules.css`, `/fonts/fonts.css`) dan asetnya termuat seperti di server sungguhan. Render ke
 * `file://` kehilangan semua path berawalan `/`.
 */
export async function startRenderServer(): Promise<{ render: (m: MasterFile, source: string, tag: string, extraHead?: string) => Promise<string>; close: () => Promise<void> }> {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "lux-render-"));
  const publicDir = path.join(process.cwd(), "public");
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url || "/", "http://x").pathname);
    const [base, rel] = pathname.startsWith("/__render/") ? [work, pathname.slice("/__render/".length)] : [publicDir, pathname.slice(1)];
    const file = path.resolve(base, rel);
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    async render(m, source, tag, extraHead = "") {
      const data = await composeInvitationData(buildDemoInvitation(m.id, undefined, m.eventType));
      const html = (await renderTemplateFile(m.id, data as Record<string, any>, { eventType: m.eventType, templateSource: source })).replace(/<\/head>/i, `${extraHead}</head>`);
      const name = `${m.id}-${tag}.html`;
      fs.writeFileSync(path.join(work, name), html);
      return `${origin}/__render/${name}`;
    },
    async close() {
      await new Promise<void>((r) => server.close(() => r()));
      fs.rmSync(work, { recursive: true, force: true });
    },
  };
}

function chromePath(): string {
  const candidates = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"];
  const found = candidates.find((c): c is string => Boolean(c && fs.existsSync(c)));
  if (!found) throw new Error("Chrome tidak ditemukan; set CHROME_PATH.");
  return found;
}

export class Cdp {
  private id = 0;
  private pending = new Map<number, (msg: any) => void>();
  private loadWaiters: Array<() => void> = [];
  private eventWaiters = new Map<string, Array<() => void>>();
  sessionId = "";
  constructor(private ws: WebSocket) {
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)!(msg);
        this.pending.delete(msg.id);
      } else if (msg.method === "Page.loadEventFired") this.loadWaiters.splice(0).forEach((w) => w());
      else if (msg.method && this.eventWaiters.has(msg.method)) this.eventWaiters.get(msg.method)!.splice(0).forEach((w) => w());
    };
  }
  /** Menunggu satu kejadian DevTools berikutnya dengan nama itu; daftarkan sebelum mengirim perintah pemicunya. */
  nextEvent(method: string): Promise<void> {
    return new Promise((resolve) => {
      const list = this.eventWaiters.get(method) ?? [];
      list.push(resolve);
      this.eventWaiters.set(method, list);
    });
  }
  send(method: string, params: Record<string, unknown> = {}, session = true): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(session && this.sessionId ? { sessionId: this.sessionId } : {}) }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
      setTimeout(() => this.pending.has(id) && (this.pending.delete(id), reject(new Error(`${method} melewati batas waktu`))), 30000);
    });
  }
  async goto(url: string, settleMs = 400) {
    const loaded = new Promise<void>((r) => this.loadWaiters.push(r));
    await this.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(15000)]);
    await sleep(settleMs);
  }
  async eval<T>(expression: string): Promise<T> {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value as T;
  }
}

/** Chrome headless dengan satu tab terpasang; `close()` menunggu proses keluar sebelum profil sementara dihapus. */
export async function startChrome(): Promise<{ cdp: Cdp; close: () => Promise<void> }> {
  const port = 9800 + Math.floor(Math.random() * 150);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lux-chrome-"));
  const chrome: ChildProcess = spawn(chromePath(), ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--autoplay-policy=user-gesture-required", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`]);
  const close = async () => {
    const exited = new Promise((r) => chrome.once("exit", r));
    chrome.kill();
    await Promise.race([exited, sleep(5000)]);
    // Proses anak Chrome bisa masih menulis ke profil sesaat setelah proses utama keluar.
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  };
  try {
    let version: any = null;
    for (let i = 0; i < 40 && !version; i++) {
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => null);
      if (!version) await sleep(250);
    }
    if (!version) throw new Error("Chrome DevTools tidak siap.");
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    const cdp = new Cdp(ws);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" }, false);
    cdp.sessionId = (await cdp.send("Target.attachToTarget", { targetId, flatten: true }, false)).sessionId;
    await cdp.send("Page.enable");
    return { cdp, close };
  } catch (e) {
    await close();
    throw e;
  }
}
