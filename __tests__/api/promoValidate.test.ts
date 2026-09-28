/**
 * Integration tests — app/api/public/promo/validate/route.ts
 * 
 * Menguji:
 * 1. Auth Guard (401 bila user belum login)
 * 2. Input Validation (400 bila kode promo atau orderId kosong)
 * 3. Master Switch Guard (400 bila promo_enabled !== 'true')
 * 4. Order Existence (404 bila order tidak ditemukan)
 * 5. Order Tenant Isolation Guard (403 bila bukan milik user)
 * 6. Order Status Guard (400 bila status order bukan PENDING)
 * 7. Coupon Not Found (400 bila kode promo tidak terdaftar di database)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminSetting: {
      findUnique: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
  pool: { end: vi.fn() },
}));

import { POST } from "@/app/api/public/promo/validate/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockAdminSetting = prisma.adminSetting.findUnique as ReturnType<typeof vi.fn>;
const mockOrderFindUnique = prisma.order.findUnique as ReturnType<typeof vi.fn>;

function makeRequest(body: any): NextRequest {
  return new NextRequest("http://localhost:3000/api/public/promo/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const USER_ID = "user-client-123";
const OTHER_USER_ID = "user-other-456";
const ORDER_ID = "ord-test-001";

describe("POST /api/public/promo/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Tanpa session -> 401 Unauthorized", async () => {
    mockAuth.mockResolvedValue(null);
    const req = makeRequest({ code: "HEMAT50", orderId: ORDER_ID });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Silakan login terlebih dahulu");
  });

  it("2. Kode promo kosong -> 400 Bad Request", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const req = makeRequest({ code: "   ", orderId: ORDER_ID });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Kode promo tidak boleh kosong");
  });

  it("3. orderId kosong -> 400 Bad Request", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    const req = makeRequest({ code: "HEMAT50" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("orderId wajib disertakan");
  });

  it("4. Master switch promo_enabled bernilai false -> 400 Bad Request", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockAdminSetting.mockResolvedValue({ key: "promo_enabled", value: "false" });

    const req = makeRequest({ code: "HEMAT50", orderId: ORDER_ID });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Fitur kode promo sedang tidak diaktifkan");
  });

  it("5. Order tidak ditemukan di database -> 404 Not Found", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockAdminSetting.mockResolvedValue({ key: "promo_enabled", value: "true" });
    mockOrderFindUnique.mockResolvedValue(null);

    const req = makeRequest({ code: "HEMAT50", orderId: ORDER_ID });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("Order tidak ditemukan");
  });

  it("6. Order milik user lain (Bukan pemilik) -> 403 Forbidden", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID, role: "CLIENT" } });
    mockAdminSetting.mockResolvedValue({ key: "promo_enabled", value: "true" });
    mockOrderFindUnique.mockResolvedValue({
      id: ORDER_ID,
      userId: OTHER_USER_ID,
      status: "PENDING",
      planType: "TIER_2",
    });

    const req = makeRequest({ code: "HEMAT50", orderId: ORDER_ID });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Bukan order Anda");
  });

  it("7. Status order bukan PENDING (misal: PAID) -> 400 Bad Request", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID, role: "CLIENT" } });
    mockAdminSetting.mockResolvedValue({ key: "promo_enabled", value: "true" });
    mockOrderFindUnique.mockResolvedValue({
      id: ORDER_ID,
      userId: USER_ID,
      status: "PAID",
      planType: "TIER_2",
    });

    const req = makeRequest({ code: "HEMAT50", orderId: ORDER_ID });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Order tidak dapat diproses (Status: PAID)");
  });

  it("8. Transaksi kupon tidak ditemukan -> 400 Bad Request", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID, role: "CLIENT" } });
    mockAdminSetting.mockResolvedValue({ key: "promo_enabled", value: "true" });
    mockOrderFindUnique.mockResolvedValue({
      id: ORDER_ID,
      userId: USER_ID,
      status: "PENDING",
      planType: "TIER_2",
      user: { email: "user@test.com", phoneNumber: "08123456789" },
    });

    // Simulasi tx.$queryRaw menghasilkan 0 kupon
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
      };
      return callback(mockTx);
    });

    const req = makeRequest({ code: "KODE_PALSU", orderId: ORDER_ID });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Kode promo tidak ditemukan");
  });
});
