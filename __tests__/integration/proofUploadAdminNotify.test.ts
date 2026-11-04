/**
 * Unggah bukti transfer oleh klien memicu email ke admin yang punya akses Order (hanya di database `luxenary_test`).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import sharp from "sharp";

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

const { sendAlert } = vi.hoisted(() => ({ sendAlert: vi.fn(async (_input: Record<string, unknown>) => ({ success: true })) }));
vi.mock("@/lib/mailer", async (importOriginal) => ({ ...(await importOriginal<object>()), sendProofUploadedAdminAlertEmail: sendAlert }));

import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { POST as uploadProof } from "@/app/api/client/orders/[id]/upload-proof/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_proofnotify_${Date.now()}`;
const FINANCE = `${TAG}_finance@t.local`;
const SUPPORT = `${TAG}_support@t.local`;
let userId = "";

async function upload(orderId: string, as: "client" | "admin") {
  sessionUser =
    as === "client"
      ? { id: userId, email: `${TAG}@t.local`, name: "Klien Notif", role: "CLIENT", isAdmin: false }
      : { id: `${TAG}_admin`, email: FINANCE, name: "Admin", role: "SUPER_ADMIN", isAdmin: true, permissions: [] };
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#888" } }).png().toBuffer();
  const fd = new FormData();
  fd.set("file", new File([new Uint8Array(png)], "bukti.png", { type: "image/png" }));
  return uploadProof(new Request("http://localhost/upload", { method: "POST", body: fd }), { params: Promise.resolve({ id: orderId }) });
}

describe.skipIf(!IS_TEST_DB)("notifikasi email bukti transfer ke admin", () => {
  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { email: `${TAG}@t.local`, name: "Klien Notif" } })).id;
    await prisma.admin.createMany({
      data: [
        { username: `${TAG}_fin`, email: FINANCE, name: "Finance Uji", role: "FINANCE" },
        { username: `${TAG}_sup`, email: SUPPORT, name: "Support Uji", role: "SUPPORT" },
      ],
    });
  });

  beforeEach(() => sendAlert.mockClear());

  afterAll(async () => {
    sessionUser = null;
    for (const order of await prisma.order.findMany({ where: { userId }, select: { proofImageUrl: true } })) {
      await deleteFile(order.proofImageUrl);
    }
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.admin.deleteMany({ where: { email: { in: [FINANCE, SUPPORT] } } });
  });

  it("unggahan klien mengirim email ke admin berakses Order, unggah ulang ditandai", async () => {
    const order = await prisma.order.create({
      data: { userId, invoiceNumber: `${TAG}-INV-1`, planType: "TIER_2", amount: 249000, paymentMethod: "MANUAL_TRANSFER" },
    });

    expect((await upload(order.id, "client")).status).toBe(200);
    await vi.waitFor(() => expect(sendAlert).toHaveBeenCalledTimes(1));
    const first = sendAlert.mock.calls[0][0];
    expect(first).toMatchObject({ invoiceNumber: `${TAG}-INV-1`, orderType: "NEW", planType: "TIER_2", amount: 249000, clientEmail: `${TAG}@t.local`, clientName: "Klien Notif", isReupload: false });
    expect(first.recipientEmails).toContain(FINANCE);
    expect(first.recipientEmails).not.toContain(SUPPORT);
    expect(first.uploadedAt).toBeInstanceOf(Date);

    expect((await upload(order.id, "client")).status).toBe(200);
    await vi.waitFor(() => expect(sendAlert).toHaveBeenCalledTimes(2));
    expect(sendAlert.mock.calls[1][0].isReupload).toBe(true);
  });

  it("unggahan oleh admin sendiri tidak mengirim email", async () => {
    const order = await prisma.order.create({
      data: { userId, invoiceNumber: `${TAG}-INV-2`, planType: "TIER_1", amount: 150000, paymentMethod: "MANUAL_TRANSFER" },
    });
    expect((await upload(order.id, "admin")).status).toBe(200);
    await new Promise((r) => setTimeout(r, 300));
    expect(sendAlert).not.toHaveBeenCalled();
  });
});
