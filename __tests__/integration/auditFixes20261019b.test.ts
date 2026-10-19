/**
 * Perbaikan audit 19 Okt 2026 (hanya berjalan di database `luxenary_test`):
 * 1. Order transfer manual yang sudah berbukti tidak kedaluwarsa otomatis dan tetap dapat disetujui admin.
 * 2. Memulihkan snapshot tertua saat jumlah snapshot di batas retensi tidak menghapus snapshot itu.
 * 3. Username dan email admin disimpan dalam huruf kecil.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma } from "@/lib/prisma";
import { invalidateSettingsCache } from "@/lib/settings";
import { createDatabaseSnapshot, restoreDatabaseSnapshot } from "@/lib/databaseBackup";
import { GET as adminOverview } from "@/app/api/admin/overview/route";
import { POST as approveOrder } from "@/app/api/admin/orders/[orderId]/approve/route";
import { POST as rejectOrder } from "@/app/api/admin/orders/[orderId]/reject/route";
import { GET as orderStatus } from "@/app/api/client/orders/[id]/status/route";
import { POST as checkout } from "@/app/api/payments/checkout/route";
import { POST as regenerateQris } from "@/app/api/payments/qris/regenerate/route";
import { POST as createAdmin } from "@/app/api/admin/admins/route";
import { PUT as updateAdmin } from "@/app/api/admin/admins/[id]/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_fix1019_${Date.now()}`;
const HOUR = 60 * 60 * 1000;

let userId = "";
let actingAdminId = "";
let seq = 0;

const asAdmin = () => {
  sessionUser = { id: actingAdminId, email: `${TAG}_actor@t.local`, role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
};
const asClient = () => {
  sessionUser = { id: userId, email: `${TAG}@t.local`, role: "CLIENT", isAdmin: false };
};
const post = (body: unknown = {}) =>
  new NextRequest("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** Order transfer manual yang dibuat lebih dari 24 jam lalu; berbukti bila `withProof`. */
const staleManualOrder = (withProof: boolean) =>
  prisma.order.create({
    data: {
      userId,
      invoiceNumber: `${TAG}-${++seq}`,
      planType: "TIER_1",
      amount: 150000,
      paymentMethod: "MANUAL_TRANSFER",
      status: "PENDING",
      expiredAt: new Date(Date.now() - HOUR),
      ...(withProof ? { proofImageUrl: `private-disk:proofs/${TAG}-${seq}.webp`, proofUploadedAt: new Date(Date.now() - 2 * HOUR) } : {}),
    },
  });

describe.skipIf(!IS_TEST_DB)("perbaikan audit 19 Okt 2026", () => {
  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { email: `${TAG}@t.local`, name: "Klien Uji" } })).id;
    actingAdminId = (await prisma.admin.create({ data: { username: `${TAG}_actor`, email: `${TAG}_actor@t.local`, name: "Pelaku", role: "SUPER_ADMIN" } })).id;
  });

  afterAll(async () => {
    sessionUser = null;
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.adminAuditLog.deleteMany({ where: { OR: [{ adminId: actingAdminId }, { details: { contains: TAG } }] } });
    await prisma.webhookLog.deleteMany({ where: { source: "admin", payload: { path: ["approvedBy"], equals: actingAdminId } } });
    await prisma.admin.deleteMany({ where: { OR: [{ id: actingAdminId }, { username: { startsWith: TAG.toLowerCase() } }] } });
  });

  describe("1. order transfer manual berbukti", () => {
    it("sapuan dasbor admin tidak mengedaluwarsakannya, order tanpa bukti tetap kedaluwarsa, dan admin dapat menyetujuinya", async () => {
      const withProof = await staleManualOrder(true);
      const withoutProof = await staleManualOrder(false);

      asAdmin();
      expect((await adminOverview()).status).toBe(200);

      expect((await prisma.order.findUniqueOrThrow({ where: { id: withProof.id } })).status).toBe("PENDING");
      expect((await prisma.order.findUniqueOrThrow({ where: { id: withoutProof.id } })).status).toBe("EXPIRED");

      const approved = await approveOrder(post(), { params: Promise.resolve({ orderId: withProof.id }) });
      expect(approved.status).toBe(200);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: withProof.id } })).status).toBe("PAID");
    });

    it("halaman status klien tidak mengedaluwarsakannya", async () => {
      await prisma.order.deleteMany({ where: { userId, status: "PAID" } });
      const order = await staleManualOrder(true);
      asClient();
      const res = await orderStatus(new NextRequest(`http://localhost/api/client/orders/${order.id}/status`), { params: Promise.resolve({ id: order.id }) });
      expect(res.status).toBe(200);
      expect((await res.json()).status).toBe("PENDING");
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
    });

    it("checkout gateway dan penerbitan ulang QRIS menolaknya tanpa mengubah status", async () => {
      const order = await staleManualOrder(true);
      asClient();
      expect((await checkout(post({ orderId: order.id }))).status).toBe(409);
      expect((await regenerateQris(post({ orderId: order.id }))).status).toBe(409);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
    });

    it("bukti yang ditolak memberi klien paling sedikit 24 jam untuk mengunggah ulang", async () => {
      const order = await staleManualOrder(true);
      asAdmin();
      const res = await rejectOrder(post({ reason: "Nominal tidak sesuai" }), { params: Promise.resolve({ orderId: order.id }) });
      expect(res.status).toBe(200);
      const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(after.proofImageUrl).toBeNull();
      expect(after.expiredAt!.getTime()).toBeGreaterThan(Date.now() + 23 * HOUR);

      asClient();
      const status = await orderStatus(new NextRequest(`http://localhost/api/client/orders/${order.id}/status`), { params: Promise.resolve({ id: order.id }) });
      expect((await status.json()).status).toBe("PENDING");
    });
  });

  describe("2. restore snapshot", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vitest_fix1019_backup_"));
    let saved: { key: string; value: string; label: string | null; group: string }[] = [];

    beforeAll(async () => {
      saved = await prisma.adminSetting.findMany({ where: { key: { in: ["backup_path", "backup_retention_count"] } } });
      await prisma.adminSetting.upsert({ where: { key: "backup_path" }, update: { value: dir }, create: { key: "backup_path", value: dir, group: "database" } });
      await prisma.adminSetting.upsert({ where: { key: "backup_retention_count" }, update: { value: "2" }, create: { key: "backup_retention_count", value: "2", group: "database" } });
    });

    afterAll(async () => {
      await prisma.adminSetting.deleteMany({ where: { key: { in: ["backup_path", "backup_retention_count"] } } });
      for (const s of saved) await prisma.adminSetting.create({ data: { key: s.key, value: s.value, label: s.label, group: s.group } });
      invalidateSettingsCache();
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("snapshot tertua di batas retensi tetap ada dan berhasil dipulihkan", async () => {
      const oldest = await createDatabaseSnapshot("vitest_a");
      await new Promise((r) => setTimeout(r, 1100));
      await createDatabaseSnapshot("vitest_b");

      const result = await restoreDatabaseSnapshot(oldest.filename);
      expect(result.success).toBe(true);
      expect(result.restoredFrom).toBe(oldest.filename);
      expect(fs.existsSync(path.join(dir, oldest.filename))).toBe(true);
      expect(fs.existsSync(path.join(dir, result.safetySnapshot))).toBe(true);
    });
  });

  describe("3. username dan email admin", () => {
    it("dibuat dan diubah lewat tab Tim tersimpan dalam huruf kecil tanpa spasi", async () => {
      asAdmin();
      const created = await createAdmin(
        new Request("http://localhost/x", {
          method: "POST",
          body: JSON.stringify({ username: ` ${TAG}_Budi `, email: ` ${TAG}_Budi@Example.COM `, name: "Budi", role: "ADMIN", password: "kata-sandi-uji-1", permissions: [] }),
        })
      );
      expect(created.status).toBe(200);
      const { admin } = await created.json();
      expect(admin.username).toBe(`${TAG}_budi`.toLowerCase());
      expect(admin.email).toBe(`${TAG}_budi@example.com`.toLowerCase());

      const duplicate = await createAdmin(
        new Request("http://localhost/x", {
          method: "POST",
          body: JSON.stringify({ username: `${TAG}_BUDI`, email: `${TAG}_other@t.local`, name: "Budi 2", role: "ADMIN", password: "kata-sandi-uji-1" }),
        })
      );
      expect(duplicate.status).toBe(400);

      const updated = await updateAdmin(
        new Request("http://localhost/x", { method: "PUT", body: JSON.stringify({ username: `${TAG}_Budi_Baru`, email: `${TAG}_Baru@T.LOCAL` }) }),
        { params: Promise.resolve({ id: admin.id }) }
      );
      expect(updated.status).toBe(200);
      const row = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
      expect(row.username).toBe(`${TAG}_budi_baru`.toLowerCase());
      expect(row.email).toBe(`${TAG}_baru@t.local`.toLowerCase());
    });
  });
});
