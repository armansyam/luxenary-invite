/**
 * Sampul HP mengikuti slot (18 Nov 2026): foto slot Landing Cover Mobile harus digambar di atas tekstur bawaan master,
 * tekstur hanya tampil saat slot kosong dan terlihat sebagai "Bawaan tema" di form slot. Sebelumnya tujuh master
 * Sulawesi (dan versi -acara) menulis tekstur padat sebelum `{{landingCoverUrl}}`, sehingga foto unggahan tertutup.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import { THEME_MAP } from "@/lib/renderTemplate";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { masterPathOf } from "@/lib/themePaths";
import { masterBuiltinCover, themeArtPreviews } from "@/lib/themeArtPreview";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { composeInvitationData } from "@/lib/themeEngine";
import { pool } from "@/lib/prisma";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");

function coverDeclarations(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/\.cover-screen\s*\{((?:[^{}]|\{\{[^{}]*\}\})*)\}/g)) {
    for (const d of m[1].matchAll(/background(?:-image)?\s*:([^;]*);/g)) out.push(d[1]);
  }
  return out;
}

describe("sampul HP mengikuti slot", () => {
  it("tidak ada master yang menulis gambar statis sebelum foto slot sampul", () => {
    const offenders: string[] = [];
    for (const [id, entry] of Object.entries(THEME_MAP)) {
      const html = fs.readFileSync(masterPathOf(entry.eventType, entry.style, id), "utf8");
      for (const decl of coverDeclarations(html)) {
        const urls = [...decl.matchAll(/url\(\s*['"]?([^'")]*)['"]?\s*\)/g)].map((u) => u[1]);
        const slot = urls.findIndex((u) => u.includes("{{landingCoverUrl}}"));
        if (slot > 0 && urls.slice(0, slot).some((u) => !u.includes("{{"))) offenders.push(id);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("membaca tekstur sampul bawaan dari aturan .cover-screen yang memuat placeholder", () => {
    const css = ".cover-screen.opened { opacity: 0; } .cover-screen { background-image: linear-gradient(red, blue), url('{{landingCoverUrl}}'), url('/assets/ornaments/background/bg-maroon.webp'); }";
    expect(masterBuiltinCover(css)).toBe("/assets/ornaments/background/bg-maroon.webp");
    expect(masterBuiltinCover(".cover-screen { background: var(--bg-dark); }")).toBe(null);
  });

  it("Wajo menampilkan tekstur sebagai Bawaan tema; pratinjau ilustrasi Jamuan tetap diutamakan", () => {
    expect(themeArtPreviews("wajo").LANDING_COVER).toBe("/assets/ornaments/background/bg-maroon.webp");
    expect(themeArtPreviews("gowa").LANDING_COVER).toBe("/assets/ornaments/background/bg-makassar.webp");
    expect(themeArtPreviews("jamuan").LANDING_COVER).toBe("/assets/theme-previews/jamuan/landing_cover.webp");
  });

  it("Wajo tanpa motif garis tenun di latar", () => {
    for (const id of ["wajo", "wajo-acara"]) {
      const entry = THEME_MAP[id];
      const html = fs.readFileSync(masterPathOf(entry.eventType, entry.style, id), "utf8");
      expect(html.includes("repeating-linear-gradient"), id).toBe(false);
    }
  });
});

describe.skipIf(!IS_TEST_DB)("render demo Wajo", () => {
  afterAll(async () => {
    await pool.end();
  });

  async function render(custom: Record<string, unknown>) {
    const data = (await composeInvitationData(buildDemoInvitation("wajo", custom, "WEDDING"))) as Record<string, any>;
    return renderTemplateFile("wajo", data, { editMode: false, invitationId: "demo-wajo" });
  }

  // Slot demo hanya terbaca bila berkasnya ada di public/ (publicFileExists), jadi uji memakai berkas demo bawaan repo.
  it("slot terisi: foto di atas tekstur dan rumah adat disembunyikan", async () => {
    const html = await render({ landingCoverUrl: "/demo/wajo/cover.webp" });
    expect(html).toContain(`<div id="coverScreen" class="cover-screen has-cover-photo">`);
    expect(html).toMatch(/url\('\/demo\/wajo\/cover\.webp'\), url\('\/assets\/ornaments\/background\/bg-maroon\.webp'\)/);
    expect(html).toContain(".cover-screen.has-cover-photo .cover-emblem-wrap { display: none; }");
  });

  it("slot sampul dan latar global kosong: tanpa penanda foto, tekstur bawaan tetap tampil", async () => {
    const html = await render({ landingCoverUrl: "", globalBgUrl: "" });
    expect(html).toContain(`<div id="coverScreen" class="cover-screen">`);
    expect(html).toContain("), none, url('/assets/ornaments/background/bg-maroon.webp');");
  });

  it("kecerahan foto latar dari Studio Demo ikut dirender", async () => {
    const html = await render({ globalBgUrl: "/demo/wajo/background.webp", featureSettings: { bgPhotoTone: -40 } });
    expect(html).toContain(`<style id="luxBgPhotoTone">.fixed-bg-layer.has-custom-bg, video.lux-fixed-bg-video { filter: brightness(0.60) !important; }</style>`);
  });
});
