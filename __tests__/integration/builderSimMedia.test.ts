/**
 * Foto uji pratinjau Theme Builder: unggah ke public/uploads/builder-sim, mode pratinjau "sim" menaruh foto di slot
 * media seperti unggahan klien (sampul desktop mendatar, galeri), masukan asing dibuang, dan cron menghapus foto lama.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })) }));

import { prisma, pool } from "@/lib/prisma";
import { POST as uploadSim } from "@/app/api/admin/theme-builder/sim-media/route";
import { renderBuilderPreview } from "@/lib/themeBuilder/server";
import { defaultBuilderSpec } from "@/lib/themeBuilder/spec";
import { parseSimMedia, simSlotsFor } from "@/lib/themeBuilder/simSlots";
import { runStaleDataCleanup } from "@/lib/lifecycleCleanup";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const SIM_DIR = path.join(process.cwd(), "public", "uploads", "builder-sim");
const written: string[] = [];

describe("parseSimMedia & simSlotsFor", () => {
  it("hanya slot dikenal dan URL foto simulasi yang diterima; galeri dibatasi", () => {
    const ok = "/uploads/builder-sim/0123456789abcdef01234567.webp";
    const parsed = parseSimMedia({
      slots: { LANDING_COVER: ok, GROOM_PHOTO: "/uploads/theme-assets/0123456789abcdef01234567.webp", BUKAN_SLOT: ok, HOME_PHOTO: "https://contoh.com/a.webp" },
      gallery: [ok, ok.replace("0123", "aaaa"), "javascript:alert(1)", ...Array(10).fill(ok)],
    });
    expect(parsed.slots).toEqual({ LANDING_COVER: ok });
    expect(parsed.gallery.length).toBe(8);
    expect(parsed.gallery).not.toContain("javascript:alert(1)");
    expect(parseSimMedia(null)).toEqual({ slots: {}, gallery: [] });
  });

  it("slot mempelai hanya untuk pernikahan", () => {
    expect(simSlotsFor("WEDDING").some((s) => s.slot === "GROOM_PHOTO")).toBe(true);
    expect(simSlotsFor("BIRTHDAY").some((s) => s.slot === "GROOM_PHOTO")).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("foto uji builder", () => {
  afterAll(async () => {
    for (const f of written) fs.rmSync(path.join(SIM_DIR, f), { force: true });
    await prisma.$disconnect();
    await pool.end();
  });

  async function upload(width: number, height: number): Promise<string> {
    const png = await sharp({ create: { width, height, channels: 3, background: { r: 120, g: 40, b: 60 } } }).png().toBuffer();
    const form = new FormData();
    form.append("file", new File([new Uint8Array(png)], "uji.png", { type: "image/png" }));
    const res = await uploadSim(new NextRequest("http://localhost/api/admin/theme-builder/sim-media", { method: "POST", body: form }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/^\/uploads\/builder-sim\/[a-f0-9]{24}\.webp$/);
    written.push(path.basename(data.url));
    expect(fs.existsSync(path.join(SIM_DIR, path.basename(data.url)))).toBe(true);
    return data.url;
  }

  it("unggah menolak berkas bukan gambar", async () => {
    const form = new FormData();
    form.append("file", new File([new TextEncoder().encode("<svg onload=alert(1)>")], "x.svg", { type: "image/svg+xml" }));
    const res = await uploadSim(new NextRequest("http://localhost/api/admin/theme-builder/sim-media", { method: "POST", body: form }));
    expect(res.status).toBe(415);
  });

  it("mode sim menaruh foto uji di slot (sampul desktop, galeri); mode klien tidak", async () => {
    const cover = await upload(1600, 900);
    const galleryPhoto = await upload(800, 1200);
    const spec = defaultBuilderSpec("WEDDING");
    const sim = await renderBuilderPreview(spec, undefined, "sim", { slots: { LANDING_COVER_DESKTOP: cover }, gallery: [galleryPhoto] });
    expect(sim.html).toContain(cover);
    expect(sim.html).toContain(galleryPhoto);
    const client = await renderBuilderPreview(spec, undefined, "client");
    expect(client.html).not.toContain(cover);
    expect(client.html).not.toContain("/uploads/builder-sim/");
  });

  it("cron menghapus foto uji yang lebih tua dari batas umur (dry run menghitung tanpa menghapus)", async () => {
    const url = await upload(300, 300);
    const file = path.join(SIM_DIR, path.basename(url));
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const result = await runStaleDataCleanup({ dryRun: true, now: future });
    expect(result.purgedSimMedia).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(file)).toBe(true);
  });
});
