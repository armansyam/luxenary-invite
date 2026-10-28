/**
 * e2e-browser-smoke.ts
 * Uji peramban sungguhan (Chrome headless lewat DevTools Protocol, tanpa dependensi tambahan) untuk hal yang tidak
 * terjangkau vitest: halaman klien tanpa luapan horizontal di 320 dan 375 px, sunting teks hias editable di Studio
 * (ketik, Simpan Semua, tersimpan di DB), teks hias terlalu panjang ditolak dengan pesan, dan builder admin termuat
 * tanpa galat skrip di 1440 px.
 *
 * Hanya untuk database luxenary_test dan server lokal. Sesi diterbitkan untuk akun yang sudah terdaftar di DB uji
 * (aplikasi mengakhiri sesi bila akun tidak ada), memakai AUTH_SECRET lokal; login Google tidak dipakai.
 *
 *   APP_URL=http://localhost:3100 DATABASE_URL=...luxenary_test npx tsx scripts/e2e-browser-smoke.ts \
 *     [--client=uji-klien-pesisir@uji.test] [--admin=admin123] [--builder-theme=<id>]
 * Keluar dengan kode 1 bila ada pemeriksaan yang gagal. Label teks hias yang diubah uji dikembalikan ke nilai awal.
 */
import "dotenv/config";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { encode } from "next-auth/jwt";
import { Prisma } from "@prisma/client";
import { prisma, pool } from "../lib/prisma";

const APP_URL = (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");
const arg = (name: string, fallback: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const PORT = 9400 + Math.floor(Math.random() * 400);
const results: Array<{ name: string; ok: boolean; detail: string }> = [];
const record = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "LULUS" : "GAGAL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chromePath(): string {
  const candidates = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"];
  const found = candidates.find((c): c is string => Boolean(c && fs.existsSync(c)));
  if (!found) throw new Error("Chrome tidak ditemukan; set CHROME_PATH.");
  return found;
}

async function sessionToken(token: Record<string, unknown>): Promise<string> {
  return encode({ token, secret: process.env.AUTH_SECRET as string, salt: "authjs.session-token" });
}

class Cdp {
  private id = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private listeners: Array<(msg: any) => void> = [];
  sessionId = "";
  constructor(private ws: WebSocket) {
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else if (msg.method) this.listeners.forEach((l) => l(msg));
    };
  }
  send(method: string, params: Record<string, unknown> = {}, session = true): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(session && this.sessionId ? { sessionId: this.sessionId } : {}) }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => this.pending.has(id) && (this.pending.delete(id), reject(new Error(`${method} melewati batas waktu`))), 20000);
    });
  }
  on(listener: (msg: any) => void) {
    this.listeners.push(listener);
  }
  async eval<T>(expression: string): Promise<T> {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value as T;
  }
  async goto(url: string, settleMs = 3500) {
    const loaded = new Promise<void>((resolve) => this.on((m) => m.method === "Page.loadEventFired" && resolve()));
    await this.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(15000)]);
    await sleep(settleMs);
  }
}

const OVERFLOW = `(() => { const de = document.documentElement; return { vw: de.clientWidth, sw: de.scrollWidth }; })()`;
const clickByText = (text: string) =>
  `(() => { const el = [...document.querySelectorAll('button, [role=tab], a, div, span')].find((n) => n.children.length < 4 && n.textContent.trim() === ${JSON.stringify(text)}); if (!el) return false; (el.closest('button') || el).click(); return true; })()`;

async function main() {
  if (!/\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "")) throw new Error("Hanya untuk database luxenary_test.");
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(APP_URL)) throw new Error("APP_URL harus server lokal.");

  const client = await prisma.user.findUniqueOrThrow({ where: { email: arg("client", "uji-klien-pesisir@uji.test") }, select: { id: true, email: true, name: true, role: true } });
  const invitation = await prisma.invitation.findFirstOrThrow({ where: { userId: client.id }, orderBy: { createdAt: "desc" }, select: { id: true, featureSettings: true } });
  const admin = await prisma.admin.findFirstOrThrow({ where: { username: arg("admin", "admin123") }, select: { id: true, email: true, name: true, role: true, permissions: true, sessionVersion: true } });
  const builderTheme = arg("builder-theme", (await prisma.theme.findFirstOrThrow({ where: { builderSpec: { not: Prisma.DbNull } }, orderBy: { id: "asc" }, select: { id: true } })).id);

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lux-e2e-"));
  const chrome = spawn(chromePath(), ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`]);
  const originalFs = invitation.featureSettings;
  try {
    let version: any = null;
    for (let i = 0; i < 40 && !version; i++) {
      version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).catch(() => null);
      if (!version) await sleep(250);
    }
    if (!version) throw new Error("Chrome DevTools tidak siap.");
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    const cdp = new Cdp(ws);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" }, false);
    cdp.sessionId = (await cdp.send("Target.attachToTarget", { targetId, flatten: true }, false)).sessionId;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    const exceptions: string[] = [];
    cdp.on((m) => m.method === "Runtime.exceptionThrown" && exceptions.push(m.params.exceptionDetails?.exception?.description?.split("\n")[0] || m.params.exceptionDetails?.text));
    const setSession = async (value: string) => {
      await cdp.send("Network.clearBrowserCookies");
      await cdp.send("Network.setCookie", { name: "authjs.session-token", value, url: APP_URL, path: "/" });
    };

    // 1. Halaman klien tanpa luapan horizontal.
    await setSession(await sessionToken({ id: client.id, sub: client.id, email: client.email, name: client.name, role: client.role, isAdmin: false, permissions: [] }));
    const pages = ["/dashboard", "/dashboard/guests", "/dashboard/moments", "/dashboard/rsvp", "/dashboard/settings", `/dashboard/invitation/${invitation.id}`];
    for (const width of [320, 375]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 2, mobile: true });
      for (const p of pages) {
        await cdp.goto(`${APP_URL}${p}`);
        const { vw, sw } = await cdp.eval<{ vw: number; sw: number }>(OVERFLOW);
        const url = await cdp.eval<string>("location.pathname");
        record(`${width}px ${p}`, sw <= vw && url === p, url !== p ? `dialihkan ke ${url}` : `scrollWidth ${sw}, lebar ${vw}`);
      }
      await cdp.eval(clickByText("Live Editor"));
      await sleep(5000);
      const live = await cdp.eval<{ vw: number; sw: number }>(OVERFLOW);
      record(`${width}px Studio Live Editor`, live.sw <= live.vw, `scrollWidth ${live.sw}, lebar ${live.vw}`);
    }

    // 2. Sunting teks hias editable di Studio dan simpan.
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.goto(`${APP_URL}/dashboard/invitation/${invitation.id}`);
    await cdp.eval(clickByText("Live Editor"));
    await sleep(6000);
    const focusHias = `(() => { for (const f of document.querySelectorAll('iframe')) { const d = f.contentDocument; const el = d && d.querySelector('[data-lux-field^="customLabels.hias"][contenteditable="true"]'); if (el && f.getBoundingClientRect().width > 0) { const c = d.getElementById('coverScreen'); if (c) { c.classList.add('opened'); c.style.display = 'none'; } f.contentWindow.focus(); el.focus(); const r = d.createRange(); r.selectNodeContents(el); const s = d.getSelection(); s.removeAllRanges(); s.addRange(r); return el.getAttribute('data-lux-field').split('.')[1]; } } return null; })()`;
    const key = await cdp.eval<string | null>(focusHias);
    if (!key) {
      record("Studio: teks hias editable tersedia", false, "undangan uji tidak punya teks hias editable; tandai dulu di builder dan salin master ke draf");
    } else {
      const text = `Uji Otomatis ${Date.now() % 100000}`;
      await cdp.send("Input.insertText", { text });
      await sleep(400);
      await cdp.eval(clickByText("Simpan Semua"));
      let saved = "";
      for (let i = 0; i < 20 && saved !== text; i++) {
        await sleep(500);
        const row = await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id }, select: { featureSettings: true } });
        saved = ((row.featureSettings as any)?.customLabels ?? {})[key] ?? "";
      }
      record(`Studio: ketik teks hias (${key}) lalu Simpan Semua`, saved === text, `tersimpan "${saved}"`);

      // 3. Teks hias terlalu panjang ditolak dengan pesan, nilai tersimpan tidak berubah.
      await cdp.eval(focusHias);
      await cdp.send("Input.insertText", { text: "x".repeat(130) });
      await sleep(400);
      await cdp.eval(clickByText("Simpan Semua"));
      await sleep(3000);
      const shown = await cdp.eval<boolean>(`document.body.innerText.includes('Teks hias maksimal 120')`);
      const row = await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id }, select: { featureSettings: true } });
      const after = ((row.featureSettings as any)?.customLabels ?? {})[key];
      record("Studio: teks hias 130 karakter ditolak dengan pesan", shown && after === text, `pesan ${shown ? "tampil" : "tidak tampil"}, tersimpan "${String(after).slice(0, 30)}"`);
    }

    // 4. Builder admin termuat tanpa galat skrip.
    exceptions.length = 0;
    await setSession(await sessionToken({ id: admin.id, sub: admin.id, email: admin.email, name: admin.name, role: admin.role, isAdmin: true, permissions: admin.permissions, sv: admin.sessionVersion ?? 0 }));
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.goto(`${APP_URL}/admin/theme-builder?id=${encodeURIComponent(builderTheme)}`, 7000);
    const builder = await cdp.eval<{ path: string; iframe: boolean; ornaments: number }>(`(() => { const f = document.querySelector('iframe'); return { path: location.pathname, iframe: Boolean(f && f.contentDocument && f.contentDocument.querySelector('[data-lux-section]')), ornaments: f && f.contentDocument ? f.contentDocument.querySelectorAll('[data-orn-id]').length : 0 }; })()`);
    record(`1440px builder ${builderTheme} termuat`, builder.path === "/admin/theme-builder" && builder.iframe, `pratinjau ${builder.iframe ? "tampil" : "tidak tampil"}, ornamen ${builder.ornaments}`);
    record("1440px builder tanpa galat skrip", exceptions.length === 0, exceptions.slice(0, 3).join(" | "));

    ws.close();
  } finally {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { featureSettings: originalFs === null ? Prisma.DbNull : (originalFs as Prisma.InputJsonValue) } });
    chrome.kill();
    fs.rmSync(profile, { recursive: true, force: true });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} pemeriksaan lulus.`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
