/**
 * Undangan dengan featureSettings NULL (mis. baris lama atau dibuat di luar alur create) tidak boleh
 * membuat unggahan momen tamu berujung 500 (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { POST } from "@/app/api/public/memories/upload/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_fsnull_${Date.now()}`;
const ids = { user: "", order: "", invitation: "" };

// PNG 1x1 valid
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

function upload(invitationId: string) {
  const form = new FormData();
  form.set("invitationId", invitationId);
  form.set("senderName", "Tamu Uji");
  form.set("file", new File([PNG], "x.png", { type: "image/png" }));
  return new NextRequest("http://localhost/api/public/memories/upload", { method: "POST", body: form, headers: { "x-real-ip": "1.1.1.1" } });
}

describe.skipIf(!IS_TEST_DB)("featureSettings NULL pada unggahan momen tamu", () => {
  beforeAll(async () => {
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'memories_upload:%'");
    const user = await prisma.user.create({ data: { email: `${RUN}@t.local`, name: "Owner" } });
    ids.user = user.id;
    const order = await prisma.order.create({ data: { userId: user.id, invoiceNumber: RUN, planType: "TIER_2", amount: 500000, status: "PAID" } });
    ids.order = order.id;
    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        themeId: "kalandra",
        status: "PUBLISHED",
        invitationSlug: RUN,
        groomSlug: `${RUN}-g`,
        brideSlug: `${RUN}-b`,
        featureSettings: null,
      },
    });
    ids.invitation = inv.id;
  });

  afterAll(async () => {
    await prisma.guestMemory.deleteMany({ where: { invitationId: ids.invitation } });
    await prisma.invitation.deleteMany({ where: { id: ids.invitation } });
    await prisma.order.deleteMany({ where: { id: ids.order } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'memories_upload:%'");
    await prisma.$disconnect();
    await pool.end();
  });

  it("baris benar-benar bernilai NULL di database", async () => {
    const rows = await pool.query("SELECT \"featureSettings\" FROM invitations WHERE id = $1", [ids.invitation]);
    expect(rows.rows[0].featureSettings).toBeNull();
  });

  it("unggahan tidak menghasilkan 500 (dijawab aturan bisnis: jadwal atau kuota, bukan TypeError)", async () => {
    const res = await POST(upload(ids.invitation));
    expect(res.status).not.toBe(500);
    expect([200, 403]).toContain(res.status);
  });
});
