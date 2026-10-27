/**
 * Katalog tema klien: tema aktif tampil dengan thumbnail mobile/desktop bila berkasnya ada; bila tidak ada, API
 * mengembalikan null (UI menampilkan kartu nama), bukan URL /demo/... yang rusak. Bagian DB hanya di `luxenary_test`.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { firstExistingPublicAsset } from "@/lib/publicAsset";
import { prisma, pool } from "@/lib/prisma";
import { GET as publicThemes } from "@/app/api/public/themes/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest-thumb-${Date.now()}`;

describe("firstExistingPublicAsset", () => {
  it("memilih kandidat pertama yang berkasnya ada dan menolak path berbahaya", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lux-public-"));
    try {
      fs.mkdirSync(path.join(dir, "demo", "x"), { recursive: true });
      fs.writeFileSync(path.join(dir, "demo", "x", "thumb.webp"), "x");
      fs.writeFileSync(path.join(dir, "secret.txt"), "x");
      expect(firstExistingPublicAsset(["/demo/x/missing.webp", "/demo/x/thumb.webp?v=2"], dir)).toBe("/demo/x/thumb.webp?v=2");
      expect(firstExistingPublicAsset([null, "", "/demo/x/missing.webp"], dir)).toBeNull();
      expect(firstExistingPublicAsset(["/demo/../secret.txt", "//evil.example/a.webp", "demo/x/thumb.webp"], dir)).toBeNull();
      expect(firstExistingPublicAsset(["/demo/x"], dir)).toBeNull();
      expect(firstExistingPublicAsset(["https://cdn.example.com/t.webp"], dir)).toBe("https://cdn.example.com/t.webp");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!IS_TEST_DB)("GET /api/public/themes", () => {
  afterAll(async () => {
    await prisma.theme.deleteMany({ where: { id: { startsWith: TAG } } });
    fs.rmSync(path.join(process.cwd(), "public", "demo", `${TAG}-foto`), { recursive: true, force: true });
    await pool.end();
  });

  it("tema aktif tanpa berkas demo tampil dengan thumbnail null; tema nonaktif tidak tampil", async () => {
    await prisma.theme.createMany({
      data: [
        { id: `${TAG}-aktif`, name: "Tema Tanpa Thumbnail", category: "modern", eventType: "WEDDING", isActive: true },
        { id: `${TAG}-mati`, name: "Tema Nonaktif", category: "modern", eventType: "WEDDING", isActive: false },
      ],
    });
    const res = await publicThemes(new Request("http://localhost/api/public/themes?eventType=WEDDING"));
    const list = (await res.json()) as Array<{ id: string; name: string; thumbnailMobile: string | null; thumbnailDesktop: string | null }>;
    const active = list.find((t) => t.id === `${TAG}-aktif`);
    expect(active).toMatchObject({ name: "Tema Tanpa Thumbnail", thumbnailMobile: null, thumbnailDesktop: null });
    expect(list.some((t) => t.id === `${TAG}-mati`)).toBe(false);
  });

  it("thumbnail yang berkasnya ada dikembalikan per sisi; sisi yang tidak ada null", async () => {
    const id = `${TAG}-foto`;
    const dir = path.join(process.cwd(), "public", "demo", id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "thumbnail_mobile.webp"), "x");
    await prisma.theme.create({ data: { id, name: "Tema Dengan Thumbnail Ponsel", category: "modern", eventType: "WEDDING", isActive: true } });
    const res = await publicThemes(new Request("http://localhost/api/public/themes?eventType=WEDDING"));
    const list = (await res.json()) as Array<{ id: string; thumbnailMobile: string | null; thumbnailDesktop: string | null }>;
    expect(list.find((t) => t.id === id)).toMatchObject({ thumbnailMobile: `/demo/${id}/thumbnail_mobile.webp`, thumbnailDesktop: null });
  });
});
