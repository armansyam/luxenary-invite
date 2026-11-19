/**
 * Audit slot media klien per master: setiap master dirender dengan foto uji di slot seperti unggahan klien, dibuka di
 * Chrome headless, lalu diperiksa dengan `checkSlots` (components/admin/slotVisibility.ts, pemeriksa yang sama dengan
 * panel Foto uji di Editor Master) untuk 8 slot yang bisa dideklarasikan (lib/themeMediaSlots.ts).
 *
 *   npx tsx scripts/audit-slot-visibility.ts [--theme=a,b] [--view=mobile|desktop|both] [--out=laporan.json]
 *   --proposal=<berkas.json>  usulan Theme.mediaSlots per master (slot terlihat di salah satu tampilan, aturan sama
 *                             dengan tombol "Isi dari pemeriksa slot"); hanya usulan, ditinjau di Editor Master.
 *   --strict   exit 1 bila ada slot yang dipakai master tetapi tertutup atau tersembunyi.
 *
 * Butuh DATABASE_URL luxenary_test dan Chrome (CHROME_PATH).
 */
import fs from "fs";
import path from "path";
import { buildSync } from "esbuild";
import { arg, listMasters, requireTestDatabase, sleep, startChrome, startRenderServer } from "./masterHarness";
import { buildDemoInvitation } from "../lib/demoInvitation";
import { pool } from "../lib/prisma";
import { seenPlaceLabels, SLOT_SEEN, type SlotCheck } from "../components/admin/slotVisibility";

// Foto yang dilacak git agar audit sama di mesin mana pun; berkas berbeda per slot supaya pemeriksa bisa membedakannya.
const SLOTS: Record<string, string> = {
  GLOBAL_FIXED_BG: "/uploads/dummy/AMS06328.webp",
  HOME_PHOTO: "/uploads/dummy/AMS06353.webp",
  LANDING_COVER: "/uploads/dummy/AMS06364.webp",
  LANDING_COVER_DESKTOP: "/uploads/dummy/AMS06365.webp",
  DESKTOP_SIDEBAR: "/uploads/dummy/AMS06372.webp",
  GROOM_PHOTO: "/uploads/dummy/AMS06381.webp",
  BRIDE_PHOTO: "/uploads/dummy/AMS06388.webp",
  CLOSING_COVER: "/uploads/dummy/AMS06410.webp",
};
const COVER_SLOTS = new Set(["LANDING_COVER", "LANDING_COVER_DESKTOP"]);

const CHECKER = buildSync({
  entryPoints: [path.join(process.cwd(), "components", "admin", "slotVisibility.ts")],
  bundle: true,
  format: "iife",
  globalName: "LuxSlots",
  write: false,
  platform: "browser",
}).outputFiles[0].text;

async function main() {
  requireTestDatabase();
  const viewArg = arg("view");
  const views: Array<"mobile" | "desktop"> = viewArg === "both" ? ["mobile", "desktop"] : [viewArg === "desktop" ? "desktop" : "mobile"];
  const only = arg("theme")?.split(",");
  const masters = listMasters().filter((m) => !only || only.includes(m.id));
  const server = await startRenderServer();
  let browser = await startChrome();
  let currentTargetId: string | null = null;
  const configureBrowser = async (view: "mobile" | "desktop") => {
    await browser.cdp.send("Page.enable");
    await browser.cdp.send("Network.enable");
    await browser.cdp.send("Network.setBlockedURLs", { urls: ["https://*/*"] });
    await browser.cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: "Element.prototype.requestFullscreen = function () { return Promise.resolve(); };" });
    await browser.cdp.send("Emulation.setDeviceMetricsOverride", view === "desktop" ? { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false } : { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  };
  const openFreshTab = async (view: "mobile" | "desktop") => {
    const prevTarget = currentTargetId;
    const { targetId } = await browser.cdp.send("Target.createTarget", { url: "about:blank" }, false);
    const { sessionId } = await browser.cdp.send("Target.attachToTarget", { targetId, flatten: true }, false);
    currentTargetId = targetId;
    browser.cdp.sessionId = sessionId;
    if (prevTarget) {
      await browser.cdp.send("Target.closeTarget", { targetId: prevTarget }, false).catch(() => { });
    }
    await configureBrowser(view);
  };
  const recycleBrowser = async (view: "mobile" | "desktop") => {
    await browser.close().catch(() => { });
    currentTargetId = null;
    browser = await startChrome();
    await openFreshTab(view);
  };

  const report: Record<string, Record<string, SlotCheck[]>> = {};
  const proposal: Record<string, Record<string, { places: string[] }>> = {};
  let bad = 0;
  // Preloader hilang setelah halaman dimuat di peramban tamu; di sini dibuang agar tidak dihitung sebagai penutup.
  const runChecker = (view: string) => browser.cdp.eval<SlotCheck[]>(`(() => {
    ${CHECKER};
    document.querySelectorAll(".lux-universal-preloader, #preloader, .preloader").forEach((e) => e.remove());
    return LuxSlots.checkSlots(document, ${JSON.stringify(SLOTS)}, ${JSON.stringify(view)});
  })()`);
  const auditOne = async (url: string, view: "mobile" | "desktop"): Promise<SlotCheck[]> => {
    await openFreshTab(view);
    await browser.cdp.goto(url, 900);
    // Foto sampul hanya terlihat sebelum sampul dibuka, jadi slot sampul diperiksa sebelum tombol Buka ditekan.
    const beforeOpen = (await runChecker(view)).filter((c) => COVER_SLOTS.has(c.slot));
    // Tamu membuka sampul sebelum melihat isi; master mengunci gulir selama sampul tampil.
    await browser.cdp.eval(`(() => { document.querySelector(".lux-universal-preloader")?.remove(); document.querySelector(".cover-btn-open, .btn-buka, #openBtn, .btn-open, [onclick*='open']")?.click(); return true; })()`);
    await sleep(1500);
    return [...beforeOpen, ...(await runChecker(view)).filter((c) => !COVER_SLOTS.has(c.slot))];
  };
  try {
    for (const view of views) {
      for (let idx = 0; idx < masters.length; idx++) {
        const m = masters[idx];
        const demo = buildDemoInvitation(m.id, { galleryPhotos: [] }, m.eventType);
        const inv = { ...demo, media: Object.entries(SLOTS).map(([mediaSlot, localPath]) => ({ mediaSlot, localPath })), themeDefaultMedia: {} };
        const source = fs.readFileSync(path.resolve(process.cwd(), m.rel), "utf-8");
        const url = await server.render(m, source, `slots-${view}`, "", inv as never);
        let checks: SlotCheck[];
        try {
          checks = await auditOne(url, view);
        } catch {
          await recycleBrowser(view);
          checks = await auditOne(url, view);
        }
        (report[m.id] ??= {})[view] = checks;
        const declared = (proposal[m.id] ??= {});
        for (const c of checks) {
          if (!SLOT_SEEN.has(c.status)) continue;
          declared[c.slot] = { places: [...new Set([...(declared[c.slot]?.places ?? []), ...seenPlaceLabels(c)])] };
        }
        // Slot yang terlihat di satu tempat (mis. sampul) tetap bermasalah bila tertutup di tempat lain (latar halaman).
        // Setelah sampul dibuka, foto slot di sampul memang tersembunyi; elemen khusus desktop tersembunyi di tampilan HP.
        const lost = (c: SlotCheck) => (c.places ?? [{ where: "", status: c.status }]).filter((p) => p.status === "covered" || p.status === "dim" || (p.status === "hidden" && p.where !== "sampul" && p.where !== "halaman"));
        const problems = checks.filter((c) => lost(c).length || c.status === "dim");
        if (problems.length) bad++;
        console.log(`${problems.length ? "MASALAH" : "BAIK   "} ${view.padEnd(7)} ${m.id.padEnd(24)} ${checks.map((c) => `${c.slot}=${c.status}${lost(c).length ? ` (${lost(c).map((p) => `${p.where}: ${p.status}`).join(", ")})` : ""}`).join("  ")}`);
      }
    }
    // Ditulis sebelum Chrome ditutup: penghapusan profil sementara bisa gagal (ENOTEMPTY) setelah audit panjang.
    const out = arg("out");
    if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
    const proposalOut = arg("proposal");
    if (proposalOut) fs.writeFileSync(proposalOut, JSON.stringify(proposal, null, 2));
  } finally {
    await browser.close().catch(() => { });
    await server.close();
    await pool.end();
  }
  console.log(`${masters.length} master x ${views.length} tampilan, ${bad} hasil dengan slot tertutup atau tersembunyi (${views.join(" + ")}).`);
  if (process.argv.includes("--strict") && bad) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
