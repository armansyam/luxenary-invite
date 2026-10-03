/**
 * ?preview= pada rute publik hanya sah untuk pemilik/admin (sesi) atau pemegang token pratinjau valid.
 * Tanpa itu, undangan DRAFT tidak boleh terbaca publik (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";

let currentSession: any = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => currentSession) }));

import { prisma, pool } from "@/lib/prisma";
import { GET as slugGet } from "@/app/(public)/[slug]/route";
import { createPreviewToken, verifyPreviewToken } from "@/lib/previewAccess";

process.env.AUTH_SECRET ||= "vitest-preview-secret";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_preview_${Date.now()}`;
const REKENING = "NOREK-RAHASIA-1234567890";
const ids = { owner: "", other: "", draft: "", takenDown: "" };
const slugs = { draft: `${RUN}-draft`, takenDown: `${RUN}-down` };

const call = (slug: string, query = "") =>
  slugGet(new NextRequest(`http://localhost/${slug}${query}`), { params: Promise.resolve({ slug }) });

describe.skipIf(!IS_TEST_DB)("akses pratinjau undangan DRAFT", () => {
  beforeAll(async () => {
    const owner = await prisma.user.create({ data: { email: `${RUN}-owner@t.local`, name: "Owner" } });
    const other = await prisma.user.create({ data: { email: `${RUN}-other@t.local`, name: "Other" } });
    ids.owner = owner.id;
    ids.other = other.id;
    const base = { userId: owner.id, themeId: "kalandra", groomSlug: "g", brideSlug: "b", groomName: "Pria", brideName: "Wanita" };
    const draft = await prisma.invitation.create({
      data: {
        ...base,
        invitationSlug: slugs.draft,
        status: "DRAFT",
        bankAccounts: JSON.stringify([{ bank: "BANK-UJI", number: REKENING, name: "Pria" }]),
        featureSettings: JSON.stringify({ showGift: true }),
      },
    });
    ids.draft = draft.id;
    const down = await prisma.invitation.create({
      data: { ...base, invitationSlug: slugs.takenDown, status: "TAKEN_DOWN", featureSettings: JSON.stringify({}) },
    });
    ids.takenDown = down.id;
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { id: { in: [ids.draft, ids.takenDown] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.owner, ids.other] } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("tanpa parameter: 403 dan tanpa data", async () => {
    currentSession = null;
    const res = await call(slugs.draft);
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain(REKENING);
  });

  it("?preview=true tanpa sesi: 403 dan tanpa data", async () => {
    currentSession = null;
    const res = await call(slugs.draft, "?preview=true");
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain(REKENING);
  });

  it("?preview=true oleh pengguna lain: 403", async () => {
    currentSession = { user: { id: ids.other, isAdmin: false, role: "CLIENT" } };
    const res = await call(slugs.draft, "?preview=true");
    expect(res.status).toBe(403);
  });

  it("?preview=true oleh pemilik: 200 dan tidak di-cache", async () => {
    currentSession = { user: { id: ids.owner, isAdmin: false, role: "CLIENT" } };
    const res = await call(slugs.draft, "?preview=true");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.text()).toContain(REKENING);
  });

  it("?preview=true oleh admin: 200", async () => {
    currentSession = { user: { id: "admin-x", isAdmin: true, role: "SUPER_ADMIN" } };
    const res = await call(slugs.draft, "?preview=true");
    expect(res.status).toBe(200);
  });

  it("token pratinjau valid tanpa sesi (host lain): 200", async () => {
    currentSession = null;
    const res = await call(slugs.draft, `?preview=${createPreviewToken(ids.draft)}`);
    expect(res.status).toBe(200);
  });

  it("token milik undangan lain, kedaluwarsa, atau diubah: 403", async () => {
    currentSession = null;
    expect((await call(slugs.draft, `?preview=${createPreviewToken(ids.takenDown)}`)).status).toBe(403);
    expect((await call(slugs.draft, `?preview=${createPreviewToken(ids.draft, Date.now() - 7 * 3600 * 1000)}`)).status).toBe(403);
    const tampered = createPreviewToken(ids.draft).replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect((await call(slugs.draft, `?preview=${tampered}`)).status).toBe(403);
    expect((await call(slugs.draft, "?preview=asal")).status).toBe(403);
  });

  it("TAKEN_DOWN tidak disajikan ke publik (410)", async () => {
    currentSession = null;
    expect((await call(slugs.takenDown)).status).toBe(410);
  });
});

describe("verifyPreviewToken", () => {
  it("menolak token kosong atau tanpa tanda tangan", () => {
    expect(verifyPreviewToken("abc", "")).toBe(false);
    expect(verifyPreviewToken("abc", "123")).toBe(false);
    expect(verifyPreviewToken("abc", `${Date.now() + 1000}.`)).toBe(false);
  });

  it("menerima token yang baru dibuat untuk id yang sama saja", () => {
    const token = createPreviewToken("abc");
    expect(verifyPreviewToken("abc", token)).toBe(true);
    expect(verifyPreviewToken("abd", token)).toBe(false);
  });
});
