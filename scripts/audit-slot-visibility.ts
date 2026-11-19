/**
 * Audit slot media klien per master: setiap master dirender dengan foto uji di slot seperti unggahan klien, dibuka di
 * Chrome headless, lalu diperiksa dengan `checkSlots` (components/admin/slotVisibility.ts, pemeriksa yang sama dengan
 * panel Foto uji di Editor Master). Default slot: Latar Belakang Global dan foto Home.
 *
 *   npx tsx scripts/audit-slot-visibility.ts [--theme=a,b] [--view=mobile|desktop] [--out=laporan.json]
 *   --strict   exit 1 bila ada slot yang dipakai master tetapi tertutup atau tersembunyi.
 *
 * Butuh DATABASE_URL luxenary_test dan Chrome (CHROME_PATH).
 */
import fs from "fs";
import path from "path";
import { buildSync } from "esbuild";
import { arg, listMasters, requireTestDatabase, startChrome, startRenderServer } from "./masterHarness";
import { buildDemoInvitation } from "../lib/demoInvitation";
import { pool } from "../lib/prisma";
import type { SlotCheck } from "../components/admin/slotVisibility";

// Foto yang dilacak git agar audit sama di mesin mana pun; berkas berbeda per slot supaya pemeriksa bisa membedakannya.
const SLOTS: Record<string, string> = {
  GLOBAL_FIXED_BG: "/uploads/dummy/AMS06328.webp",
  HOME_PHOTO: "/uploads/dummy/AMS06353.webp",
};

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
  const view = arg("view") === "desktop" ? "desktop" : "mobile";
  const only = arg("theme")?.split(",");
  const masters = listMasters().filter((m) => !only || only.includes(m.id));
  const server = await startRenderServer();
  const { cdp, close } = await startChrome();
  await cdp.send("Emulation.setDeviceMetricsOverride", view === "desktop" ? { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false } : { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: "Element.prototype.requestFullscreen = function () { return Promise.resolve(); };" });

  const report: Record<string, SlotCheck[]> = {};
  let bad = 0;
  try {
    for (const m of masters) {
      const demo = buildDemoInvitation(m.id, { galleryPhotos: [] }, m.eventType);
      const inv = { ...demo, media: Object.entries(SLOTS).map(([mediaSlot, localPath]) => ({ mediaSlot, localPath })), themeDefaultMedia: {} };
      const source = fs.readFileSync(path.resolve(process.cwd(), m.rel), "utf-8");
      const url = await server.render(m, source, `slots-${view}`, "", inv as never);
      await cdp.goto(url, 900);
      // Tamu membuka sampul sebelum melihat isi; master mengunci gulir selama sampul tampil.
      await cdp.eval(`(() => { document.querySelector(".lux-universal-preloader")?.remove(); document.querySelector(".cover-btn-open, .btn-buka, #openBtn, .btn-open, [onclick*='open']")?.click(); return new Promise((r) => setTimeout(() => r(true), 1500)); })()`);
      // Preloader hilang setelah halaman dimuat di peramban tamu; di sini dibuang agar tidak dihitung sebagai penutup.
      const checks = await cdp.eval<SlotCheck[]>(`(() => {
        ${CHECKER};
        document.querySelectorAll(".lux-universal-preloader, #preloader, .preloader").forEach((e) => e.remove());
        return LuxSlots.checkSlots(document, ${JSON.stringify(SLOTS)}, ${JSON.stringify(view)});
      })()`);
      report[m.id] = checks;
      // Slot yang terlihat di satu tempat (mis. sampul) tetap bermasalah bila tertutup di tempat lain (latar halaman).
      // Setelah sampul dibuka, foto slot di sampul memang tersembunyi; elemen khusus desktop tersembunyi di tampilan HP.
      const lost = (c: SlotCheck) => (c.places ?? [{ where: "", status: c.status }]).filter((p) => p.status === "covered" || p.status === "dim" || (p.status === "hidden" && p.where !== "sampul" && p.where !== "halaman"));
      const problems = checks.filter((c) => lost(c).length || c.status === "dim");
      if (problems.length) bad++;
      console.log(`${problems.length ? "MASALAH" : "BAIK   "} ${m.id.padEnd(24)} ${checks.map((c) => `${c.slot}=${c.status}${lost(c).length ? ` (${lost(c).map((p) => `${p.where}: ${p.status}`).join(", ")})` : ""}`).join("  ")}`);
    }
  } finally {
    await close();
    await server.close();
    await pool.end();
  }
  const out = arg("out");
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`${masters.length} master, ${bad} dengan slot tertutup atau tersembunyi (${view}).`);
  if (process.argv.includes("--strict") && bad) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
