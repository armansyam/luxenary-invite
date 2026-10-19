/**
 * Regresi audit 18 Okt 2026: restore hanya menerima arsip pg_dump format custom, unggahan klien menolak berkas yang
 * tidak terdeteksi (SVG), isian unggahan momen tamu divalidasi, dan batas PIN per
 * undangan hanya menghitung PIN yang salah.
 * (bagian DB hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { spawnSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";

let sessionUser: { id: string; email: string; role: string; isAdmin: boolean; permissions: string[] } | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));
vi.mock("@/lib/mailer", () => ({ sendInvoiceEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/paymentEvents", () => ({ paymentEmitter: { emit: vi.fn() } }));

import { prisma, pool } from "@/lib/prisma";
import { isCustomFormatDump, restoreDatabaseSnapshot, getBackupDirectory, readBackupPathSetting } from "@/lib/databaseBackup";
import { HttpError } from "@/lib/routeError";
import { encryptPin } from "@/lib/pinEncryption";
import { POST as restorePost } from "@/app/api/admin/database/restore/route";
import { POST as clientUploadPost } from "@/app/api/client/upload/route";
import { POST as memoriesUploadPost } from "@/app/api/public/memories/upload/route";
import { POST as verifyPinPost } from "@/app/api/receptionist/verify-pin/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_a1018_${Date.now()}`;
const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[] };

let ipSeq = 0;
const nextIp = () => `198.51.100.${(ipSeq++ % 250) + 1}`;

const asClient = (userId: string, email: string) => {
  sessionUser = { id: userId, email, role: "CLIENT", isAdmin: false, permissions: [] };
};
const asSuperAdmin = () => {
  sessionUser = { id: "admin-vitest", email: "admin@vitest.local", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
};

async function makeOwner(suffix: string, withInvitation = true, planType: "TIER_2" | "TIER_3" = "TIER_2") {
  const user = await prisma.user.create({ data: { email: `${TAG}-${suffix}@t.local`, name: `${TAG} ${suffix}` } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${TAG}-${suffix}`, planType, amount: 100000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  ids.orders.push(order.id);
  let invitationId = "";
  if (withInvitation) {
    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        invitationSlug: `${TAG}-${suffix}`,
        participantsJson: { groom: { name: "Raka" }, bride: { name: "Dewi" } },
        status: "DRAFT",
        staffPin: encryptPin("PinOk123"),
      },
    });
    ids.invitations.push(inv.id);
    invitationId = inv.id;
  }
  return { user, order, invitationId };
}

describe("isCustomFormatDump", () => {
  it("mengenali kepala PGDMP dan menolak teks SQL", () => {
    expect(isCustomFormatDump(Buffer.from("PGDMP\u0001\u000e\u0000"))).toBe(true);
    expect(isCustomFormatDump(Buffer.from("-- PostgreSQL database dump\n"))).toBe(false);
    expect(isCustomFormatDump(Buffer.alloc(0))).toBe(false);
  });

  it.skipIf(!IS_TEST_DB)("pg_dump -F c menghasilkan kepala PGDMP; pg_dump -F p (.sql) tidak", () => {
    const url = process.env.DATABASE_URL!.split("?")[0];
    const custom = spawnSync("pg_dump", [url, "-F", "c", "-t", "rate_limit_counters", "--schema-only"], { maxBuffer: 20 * 1024 * 1024 });
    const plain = spawnSync("pg_dump", [url, "-F", "p", "-t", "rate_limit_counters", "--schema-only"], { maxBuffer: 20 * 1024 * 1024 });
    expect(custom.status, String(custom.stderr)).toBe(0);
    expect(plain.status, String(plain.stderr)).toBe(0);
    expect(isCustomFormatDump(custom.stdout)).toBe(true);
    expect(isCustomFormatDump(plain.stdout)).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("restore database: hanya arsip format custom", () => {
  const legacyName = `${TAG}_legacy.sql`;
  let backupDir = "";
  const listDir = () => fs.readdirSync(backupDir).sort();

  beforeAll(async () => {
    backupDir = await getBackupDirectory(await readBackupPathSetting());
    fs.writeFileSync(path.join(backupDir, legacyName), "-- PostgreSQL database dump\nSELECT 1;\n");
  });

  afterAll(() => {
    fs.rmSync(path.join(backupDir, legacyName), { force: true });
  });

  it("snapshot .sql ditolak 400 sebelum safety snapshot dibuat", async () => {
    const before = listDir();
    const err = await restoreDatabaseSnapshot(legacyName).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(400);
    expect(listDir()).toEqual(before);
  });

  it("unggahan teks ditolak 400 dan tidak ditulis ke disk, apa pun ekstensinya", async () => {
    asSuperAdmin();
    const before = listDir();
    for (const name of [`${TAG}.sql`, `${TAG}.dump`]) {
      const form = new FormData();
      form.set("file", new File(["-- bukan arsip pg_dump\n"], name, { type: "application/octet-stream" }));
      const res = await restorePost(new NextRequest("http://localhost/api/admin/database/restore", { method: "POST", body: form }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/format custom/);
    }
    expect(listDir()).toEqual(before);
  });
});

describe.skipIf(!IS_TEST_DB)("unggahan klien: berkas yang tidak terdeteksi ditolak", () => {
  let owner: Awaited<ReturnType<typeof makeOwner>>;

  beforeAll(async () => {
    owner = await makeOwner("upload");
  });

  afterAll(() => {
    fs.rmSync(path.join(process.cwd(), "public", "uploads", "invitations", owner.invitationId), { recursive: true, force: true });
  });

  const upload = (file: File) => {
    asClient(owner.user.id, owner.user.email);
    const form = new FormData();
    form.set("file", file);
    form.set("invitationId", owner.invitationId);
    form.set("slot", "photo");
    return clientUploadPost(new NextRequest("http://localhost/api/client/upload", { method: "POST", body: form, headers: { "cf-connecting-ip": nextIp() } }));
  };

  it("SVG ditolak 415, tidak diteruskan ke sharp", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>';
    const res = await upload(new File([svg], "x.svg", { type: "image/svg+xml" }));
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/tidak dikenali/);
  });

  it("teks acak bernama .jpg ditolak 415", async () => {
    const res = await upload(new File(["bukan gambar"], "x.jpg", { type: "image/jpeg" }));
    expect(res.status).toBe(415);
  });

  it("PNG sungguhan tetap diterima dan disimpan sebagai webp", async () => {
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#336699" } }).png().toBuffer();
    const res = await upload(new File([new Uint8Array(png)], "foto.png", { type: "image/png" }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body.mediaType).toBe("image");
    expect(body.fileName).toBe("photo.webp");
  });
});

describe.skipIf(!IS_TEST_DB)("unggahan momen tamu: tipe dan panjang isian", () => {
  const jsonUpload = (body: Record<string, unknown>) =>
    memoriesUploadPost(
      new NextRequest("http://localhost/api/public/memories/upload", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": nextIp() },
        body: JSON.stringify(body),
      })
    );
  const base = { invitationId: crypto.randomUUID(), senderName: "Budi", senderEmail: "gst_abc_123", caption: "Selamat", base64File: "AAAA" };

  it("isian bukan teks -> 400 (bukan 500 dari Prisma)", async () => {
    for (const bad of [{ senderName: { x: 1 } }, { senderEmail: ["a"] }, { caption: 42 }, { invitationId: { id: 1 } }]) {
      expect((await jsonUpload({ ...base, ...bad })).status, JSON.stringify(bad)).toBe(400);
    }
  });

  it("nama, identitas, dan pesan melewati batas -> 400", async () => {
    expect((await jsonUpload({ ...base, senderName: "N".repeat(101) })).status).toBe(400);
    expect((await jsonUpload({ ...base, senderEmail: "e".repeat(255) })).status).toBe(400);
    expect((await jsonUpload({ ...base, caption: "c".repeat(1001) })).status).toBe(400);
  });

  it("isian di batas lolos validasi dan baru berhenti di undangan yang tidak ada (404)", async () => {
    const res = await jsonUpload({ ...base, senderName: "N".repeat(100), senderEmail: "e".repeat(254), caption: "c".repeat(1000) });
    expect(res.status).toBe(404);
  });
});

describe.skipIf(!IS_TEST_DB)("verify-pin: batas per undangan hanya menghitung PIN yang salah", () => {
  let invitationId = "";
  const attempt = (pin: string) => {
    return verifyPinPost(
      new NextRequest("http://localhost/api/receptionist/verify-pin", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": nextIp() },
        body: JSON.stringify({ invitationId, pin }),
      })
    ).then((res) => res.status);
  };
  const clearCounters = () => pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'verify-pin:%'");

  beforeAll(async () => {
    process.env.AUTH_SECRET ||= "vitest-a1018-signing-secret";
    const owner = await makeOwner("pin");
    invitationId = owner.invitationId;
    await clearCounters();
  });

  afterAll(clearCounters);

  it("6 login sah lalu 30 PIN salah dari IP berbeda: semuanya diproses; setelah itu undangan terkunci", async () => {
    for (let i = 0; i < 6; i++) expect(await attempt("PinOk123")).toBe(200);

    const failures: number[] = [];
    for (let i = 0; i < 30; i++) failures.push(await attempt("Salah000"));
    expect(failures.every((s) => s === 401)).toBe(true);

    expect(await attempt("Salah000")).toBe(429);
    expect(await attempt("PinOk123")).toBe(429);
  });
});

afterAll(async () => {
  if (IS_TEST_DB) {
    await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
    await pool.end();
  }
});
