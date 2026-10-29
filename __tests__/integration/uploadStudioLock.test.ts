/**
 * Unggahan media mengikuti kunci Studio: setelah undangan terbit klien tidak dapat menimpa media yang sedang tampil
 * (nama berkas per slot tetap) tanpa Buka Kunci Darurat. Sampul Momen (disimpan lewat PATCH) dan admin tetap boleh.
 * Ditemukan 29 Okt 2026 lewat scripts/e2e-golive.ts (hanya berjalan di database `luxenary_test`).
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { NextRequest } from "next/server";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma } from "@/lib/prisma";
import { POST as uploadPost } from "@/app/api/client/upload/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_uplock_${Date.now()}`;
const users: string[] = [];
const invitations: string[] = [];
let ipSeq = 0;

async function makeInvitation(status: "DRAFT" | "PUBLISHED", extra: Record<string, unknown> = {}) {
  const user = await prisma.user.create({ data: { email: `${TAG}_${users.length}@t.local`, name: "Klien" } });
  users.push(user.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      invitationSlug: `${TAG}-${users.length}`,
      participantsJson: { groom: { name: "Raka" }, bride: { name: "Dewi" } },
      status,
      eventData: [{ title: "Resepsi", date: "2099-01-10", startTime: "10:00", timezone: "WITA", isPrimary: true }],
      ...extra,
    },
  });
  invitations.push(inv.id);
  return { user, inv };
}

async function upload(invitationId: string, slot: string) {
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 10, g: 20, b: 30 } } }).png().toBuffer();
  const form = new FormData();
  form.set("file", new File([new Uint8Array(png)], "x.png", { type: "image/png" }));
  form.set("invitationId", invitationId);
  form.set("slot", slot);
  return uploadPost(new NextRequest("http://localhost/api/client/upload", { method: "POST", body: form, headers: { "cf-connecting-ip": `10.9.0.${++ipSeq}` } }));
}

const asClient = (id: string) => (sessionUser = { id, role: "CLIENT", isAdmin: false, permissions: [] });

describe.skipIf(!IS_TEST_DB)("unggahan media mengikuti kunci Studio", () => {
  afterAll(async () => {
    sessionUser = null;
    for (const id of invitations) fs.rmSync(path.join(process.cwd(), "public", "uploads", "invitations", id), { recursive: true, force: true });
    await prisma.invitation.deleteMany({ where: { id: { in: invitations } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("undangan terbit: media Studio ditolak 403 untuk klien, sampul Momen dan admin tetap boleh", async () => {
    const { user, inv } = await makeInvitation("PUBLISHED");
    asClient(user.id);
    for (const slot of ["QRIS", "LANDING_COVER", "GALLERY"]) {
      const res = await upload(inv.id, slot);
      expect(res.status, slot).toBe(403);
    }
    expect(fs.existsSync(path.join(process.cwd(), "public", "uploads", "invitations", inv.id, "qris.webp"))).toBe(false);
    expect((await upload(inv.id, "MEMORIES_COVER")).status).toBe(200);

    sessionUser = { id: "admin-vitest", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
    expect((await upload(inv.id, "QRIS")).status).toBe(200);
  });

  it("draf dan undangan dengan Buka Kunci Darurat aktif boleh mengunggah", async () => {
    const draft = await makeInvitation("DRAFT");
    asClient(draft.user.id);
    expect((await upload(draft.inv.id, "QRIS")).status).toBe(200);

    const unlocked = await makeInvitation("PUBLISHED", { adminUnlockedUntil: new Date(Date.now() + 3_600_000) });
    asClient(unlocked.user.id);
    expect((await upload(unlocked.inv.id, "LANDING_COVER")).status).toBe(200);
  });
});
