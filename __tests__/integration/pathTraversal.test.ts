/**
 * Nilai dari URL yang dipakai sebagai segmen path di disk (slug portofolio, ID tema, slot aset demo) tidak boleh
 * keluar dari folder tujuannya. Berkas penanda dibuat di data/drafts/ (folder draf undangan yang tidak publik):
 * sebelum perbaikan, kedua route publik di bawah menyajikannya.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "vitest-admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] } })),
}));

import { isSafePathSegment } from "@/lib/fsSafe";
import { deletePortfolio } from "@/lib/storage";
import { GET as publicPortfolio } from "@/app/portfolio/[slug]/route";
import { GET as demoAsset } from "@/app/demo/[theme]/[file]/route";
import { DELETE as adminPortfolioDelete } from "@/app/api/admin/portfolio/route";
import { DELETE as demoAssetDelete } from "@/app/api/admin/themes/[id]/demo-asset/route";

const draftsDir = path.join(process.cwd(), "data", "drafts");
const probeHtml = path.join(draftsDir, "__vitest_probe.html");
const probeWebp = path.join(draftsDir, "__vitest_probe.webp");

describe("validasi segmen path", () => {
  it("menerima slug dan ID tema yang sah", () => {
    for (const ok of ["budi-ani-120526", "vintage-forest", "kalandra_birthday", "A1"]) {
      expect(isSafePathSegment(ok)).toBe(true);
    }
  });

  it("menolak titik, garis miring, dan nilai kosong", () => {
    for (const bad of ["", "..", "../x", "a/b", "a\\b", ".hidden", "a.html", "x".repeat(201)]) {
      expect(isSafePathSegment(bad)).toBe(false);
    }
  });
});

describe("route yang memakai segmen path dari URL", () => {
  beforeAll(() => {
    fs.mkdirSync(draftsDir, { recursive: true });
    fs.writeFileSync(probeHtml, "<p>draf rahasia</p>");
    fs.writeFileSync(probeWebp, Buffer.from("RIFF"));
  });

  afterAll(() => {
    fs.rmSync(probeHtml, { force: true });
    fs.rmSync(probeWebp, { force: true });
  });

  it("portofolio publik tidak membaca HTML di luar public/portfolio", async () => {
    const res = await publicPortfolio(new NextRequest("http://localhost/portfolio/x"), {
      params: Promise.resolve({ slug: "../../data/drafts/__vitest_probe" }),
    });
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("draf rahasia");
  });

  it("aset demo tidak menyajikan berkas di luar public/demo", async () => {
    const res = await demoAsset(new Request("http://localhost/demo/x/y"), {
      params: Promise.resolve({ theme: "../../data/drafts", file: "__vitest_probe.webp" }),
    });
    expect(res.status).toBe(404);
  });

  it("hapus portofolio menolak clientName yang keluar folder, dan lib ikut menolak", async () => {
    const res = await adminPortfolioDelete(
      new NextRequest("http://localhost/api/admin/portfolio?clientName=..%2F..%2F__vitest_tidak_ada__", { method: "DELETE" })
    );
    expect(res.status).toBe(400);
    await expect(deletePortfolio("../../__vitest_tidak_ada__")).rejects.toThrow();
  });

  it("hapus aset demo menolak ID tema atau slot yang keluar folder", async () => {
    const del = (id: string, slot: string) =>
      demoAssetDelete(new Request(`http://localhost/api/admin/themes/x/demo-asset?slot=${encodeURIComponent(slot)}`, { method: "DELETE" }), {
        params: Promise.resolve({ id }),
      });
    expect((await del("../../data/drafts", "cover")).status).toBe(400);
    expect((await del("kalandra", "../../../data/drafts/__vitest_probe")).status).toBe(400);
    expect(fs.existsSync(probeWebp)).toBe(true);
  });
});
