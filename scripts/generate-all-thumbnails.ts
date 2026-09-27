import http from "http";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const PORT = Number(process.env.CDP_PORT) || 9333;
const BASE_URL = process.env.APP_URL || process.env.TEST_API_BASE || "http://localhost:3000";
const DEMO_DIR = path.join(process.cwd(), "public/demo");

function resolveChromePath(): string {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    "Chrome / Chromium binary not found. Please install Chrome or set the CHROME_PATH environment variable."
  );
}

async function checkServerRunning(baseUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const url = new URL(baseUrl);
      const req = http.get(
        {
          hostname: url.hostname,
          port: url.port ? Number(url.port) : 80,
          path: "/",
          timeout: 3000,
        },
        (res) => {
          resolve(res.statusCode !== undefined && res.statusCode < 500);
        }
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

async function waitPortReady(retries = 30, delayMs = 300): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const data: string = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${PORT}/json/version`, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve(body));
        });
        req.on("error", reject);
      });
      return JSON.parse(data);
    } catch {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Chrome DevTools Protocol port did not become ready in time.");
}

async function main() {
  console.log("==================================================================");
  console.log("📸 GENERATING RETINA THUMBNAILS VIA CHROME DEVTOOLS PROTOCOL");
  console.log("   Mode Mobile  : 400 × 800 px (True DevTools Mobile Emulation)");
  console.log("   Mode Desktop : 1280 × 800 px (True DevTools Desktop Emulation)");
  console.log("   API Engine   : Page.captureScreenshot (DevTools Native Menu)");
  console.log(`   Target Server: ${BASE_URL}`);
  console.log("==================================================================");

  // Pre-flight check: ensure Next.js dev server is reachable
  const isServerUp = await checkServerRunning(BASE_URL);
  if (!isServerUp) {
    console.error(`\n❌ ERROR: Target web server is not reachable at: ${BASE_URL}`);
    console.error("   Capturing screenshots while the server is down will corrupt theme thumbnails with browser error pages.");
    console.error("   👉 Please start your Next.js server in a separate terminal with: npm run dev\n");
    process.exit(1);
  }

  const chromePath = resolveChromePath();

  const args = process.argv.slice(2);
  const isDesktopOnly = args.includes("--desktop-only") || args.includes("--desktop");
  const isMobileOnly = args.includes("--mobile-only") || args.includes("--mobile");
  const specificTheme = args.find((a) => !a.startsWith("--"))?.toLowerCase().trim();

  const allThemes = specificTheme
    ? [specificTheme]
    : fs
        .readdirSync(DEMO_DIR)
        .filter((f) => fs.statSync(path.join(DEMO_DIR, f)).isDirectory())
        .sort();

  console.log(`Execution Mode: ${isDesktopOnly ? "DESKTOP ONLY" : isMobileOnly ? "MOBILE ONLY" : "DUAL (MOBILE & DESKTOP)"}`);
  console.log(`Found ${allThemes.length} theme(s) to process: ${allThemes.join(", ")}`);

  const tempProfile = `/tmp/lux_cdp_profile_${Date.now()}`;
  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempProfile}`,
  ]);

  try {
    const versionJson = await waitPortReady();
    const ws = new (globalThis as any).WebSocket(versionJson.webSocketDebuggerUrl);

    let id = 1;
    const pending = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();
    ws.onmessage = (event: any) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const handler = pending.get(msg.id)!;
        pending.delete(msg.id);
        if (msg.error) {
          handler.reject(new Error(msg.error.message || "CDP Error"));
        } else {
          handler.resolve(msg.result);
        }
      }
    };

    function send(method: string, params: any = {}, timeoutMs = 15000): Promise<any> {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        const timer = setTimeout(() => {
          pending.delete(msgId);
          reject(new Error(`CDP ${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        pending.set(msgId, {
          resolve: (val) => { clearTimeout(timer); resolve(val); },
          reject: (err) => { clearTimeout(timer); reject(err); },
        });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise((resolve) => (ws.onopen = resolve));

    let count = 0;
    let mobileSuccess = 0;
    let desktopSuccess = 0;
    const failedThemes: { id: string; error: string }[] = [];

    for (const themeId of allThemes) {
      count++;
      console.log(`\n[${count}/${allThemes.length}] Processing "${themeId}"...`);
      const themeDemoUrl = `${BASE_URL}/demo/${themeId}`;

      const mobileDest = path.join(DEMO_DIR, themeId, "thumbnail_mobile.webp");
      const desktopDest = path.join(DEMO_DIR, themeId, "thumbnail_desktop.webp");

      let targetId: string | null = null;
      try {
        const target = await send("Target.createTarget", { url: "about:blank" });
        targetId = target.targetId;
        const session = await send("Target.attachToTarget", { targetId, flatten: true });
        const sessionId = session.sessionId;

        const sendSession = (method: string, params: any = {}, timeoutMs = 15000): Promise<any> => {
          return new Promise((resolve, reject) => {
            const msgId = id++;
            const timer = setTimeout(() => {
              pending.delete(msgId);
              reject(new Error(`CDP session ${method} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            pending.set(msgId, {
              resolve: (val) => { clearTimeout(timer); resolve(val); },
              reject: (err) => { clearTimeout(timer); reject(err); },
            });
            ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
          });
        };

        await sendSession("Page.enable");

        // 1. MOBILE DEVTOOLS CAPTURE (400 × 800, Mobile Emulation)
        if (!isDesktopOnly) {
          try {
            await sendSession("Emulation.setDeviceMetricsOverride", {
              width: 400,
              height: 800,
              deviceScaleFactor: 2,
              mobile: true,
            });
            await sendSession("Emulation.setTouchEmulationEnabled", { enabled: true });

            await sendSession("Page.navigate", { url: themeDemoUrl });
            await new Promise((r) => setTimeout(r, 2000));

            const mobileShot = await sendSession("Page.captureScreenshot", {
              format: "png",
              captureBeyondViewport: false,
            });
            const mobileBuf = Buffer.from(mobileShot.data, "base64");

            await sharp(mobileBuf)
              .resize(400, 800, { fit: "cover", position: "center" })
              .webp({ quality: 90, smartSubsample: true, effort: 4 })
              .toFile(mobileDest);

            const mStat = fs.statSync(mobileDest);
            mobileSuccess++;
            console.log(`   📱 Mobile (400x800): Saved (${Math.round(mStat.size / 1024)} KB)`);
          } catch (err: any) {
            console.error(`   ❌ Mobile error: ${err.message}`);
            failedThemes.push({ id: `${themeId} (mobile)`, error: err.message });
          }
        }

        // 2. DESKTOP DEVTOOLS CAPTURE (1280 × 800, Desktop Emulation)
        if (!isMobileOnly) {
          try {
            await sendSession("Emulation.setDeviceMetricsOverride", {
              width: 1280,
              height: 800,
              deviceScaleFactor: 1,
              mobile: false,
            });
            await sendSession("Emulation.setTouchEmulationEnabled", { enabled: false });

            await sendSession("Page.navigate", { url: themeDemoUrl });
            await new Promise((r) => setTimeout(r, 2000));

            const desktopShot = await sendSession("Page.captureScreenshot", {
              format: "png",
              captureBeyondViewport: false,
            });
            const desktopBuf = Buffer.from(desktopShot.data, "base64");

            await sharp(desktopBuf)
              .resize(1280, 800, { fit: "cover", position: "center" })
              .webp({ quality: 90, smartSubsample: true, effort: 4 })
              .toFile(desktopDest);

            const dStat = fs.statSync(desktopDest);
            desktopSuccess++;
            console.log(`   💻 Desktop (1280x800): Saved (${Math.round(dStat.size / 1024)} KB)`);
          } catch (err: any) {
            console.error(`   ❌ Desktop error: ${err.message}`);
            failedThemes.push({ id: `${themeId} (desktop)`, error: err.message });
          }
        }
      } catch (err: any) {
        console.error(`   ❌ Target error for ${themeId}: ${err.message}`);
        failedThemes.push({ id: themeId, error: err.message });
      } finally {
        if (targetId) {
          try {
            await send("Target.closeTarget", { targetId });
          } catch {}
        }
      }
    }

    ws.close();
    console.log("\n==================================================================");
    console.log(`✨ THUMBNAIL GENERATION COMPLETED: ${allThemes.length} THEME(S) PROCESSED`);
    console.log(`   📱 Mobile Thumbnails  : ${mobileSuccess} saved`);
    console.log(`   💻 Desktop Thumbnails : ${desktopSuccess} saved`);
    if (failedThemes.length > 0) {
      console.log(`   ⚠️ Failed Targets     : ${failedThemes.length} errors recorded:`);
      failedThemes.forEach((f) => console.log(`      - ${f.id}: ${f.error}`));
    } else {
      console.log(`   ✅ All ${allThemes.length} theme(s) successfully captured via DevTools Screenshot!`);
    }
    console.log("==================================================================");
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
