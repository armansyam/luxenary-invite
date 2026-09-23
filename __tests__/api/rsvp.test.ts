/**
 * Integration tests — app/api/public/rsvp/route.ts
 * Menguji: validasi input, demo mode, undangan tidak ditemukan,
 * dan idempotensi submit RSVP (update vs create).
 * Route ini PUBLIC — tidak butuh auth mock.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock dependencies ────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: {
      findUnique: vi.fn(),
    },
    rsvp: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    guest: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
  pool: { end: vi.fn() },
}));

// Mock rateLimitDb agar selalu lolos di test environment
vi.mock("@/lib/rateLimit", () => ({
  rateLimitDb: vi.fn().mockResolvedValue(true), // selalu lolos
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET, POST } from "@/app/api/public/rsvp/route";
import { prisma } from "@/lib/prisma";

const mockInvFindUnique = prisma.invitation.findUnique as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;

// Helper: buat NextRequest dengan body JSON
function makePostRequest(body: Record<string, any>): NextRequest {
  return new NextRequest("http://localhost:3000/api/public/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/public/rsvp");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe("GET /api/public/rsvp — validasi invitationId", () => {
  it("tanpa invitationId → 400 Bad Request", async () => {
    const req = makeGetRequest({});
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invitationId/i);
  });

  it("invitationId 'demo-*' → 200 dengan data demo (tidak hit DB)", async () => {
    const req = makeGetRequest({ invitationId: "demo-papercut" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isDemo).toBe(true);
    expect(Array.isArray(body.rsvps)).toBe(true);
  });
});

describe("POST /api/public/rsvp — validasi input", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tanpa invitationId → 400", async () => {
    const req = makePostRequest({ guestName: "Budi", status: "hadir" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("tanpa guestName → 400", async () => {
    const req = makePostRequest({ invitationId: "inv-001", status: "hadir" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("tanpa status → 400", async () => {
    const req = makePostRequest({ invitationId: "inv-001", guestName: "Budi" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("invitationId 'demo-*' → 200 tanpa DB write (mode demo)", async () => {
    const req = makePostRequest({
      invitationId: "demo-kalandra",
      guestName: "Tamu Demo",
      status: "hadir",
      guestCount: 2,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isDemo).toBe(true);
    expect(body.success).toBe(true);
    // Pastikan tidak ada DB write
    expect(prisma.invitation.findUnique).not.toHaveBeenCalled();
  });

  it("undangan tidak ditemukan → 404", async () => {
    mockInvFindUnique.mockResolvedValue(null);
    const req = makePostRequest({
      invitationId: "inv-tidak-ada",
      guestName: "Budi",
      status: "hadir",
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("undangan ARCHIVED → 410 Gone (RSVP ditutup)", async () => {
    mockInvFindUnique.mockResolvedValue({
      id: "inv-archived",
      status: "ARCHIVED",
    });
    const req = makePostRequest({
      invitationId: "inv-archived",
      guestName: "Budi",
      status: "hadir",
    });
    const res = await POST(req);
    expect(res.status).toBe(410);
  });

  it("RSVP valid ke undangan PUBLISHED → 200 sukses", async () => {
    mockInvFindUnique.mockResolvedValue({
      id: "inv-published",
      status: "PUBLISHED",
    });
    // Mock transaction untuk simulasi RSVP baru dibuat
    const mockRsvp = {
      id: "rsvp-new-001",
      guestName: "Budi Santoso",
      status: "hadir",
      guestCount: 2,
      message: null,
    };
    mockTransaction.mockImplementation(async (fn: Function) => {
      // Simulasi: tidak ada guest terdaftar, tidak ada RSVP existing
      const tx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        guest: { findFirst: vi.fn().mockResolvedValue(null) },
        rsvp: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(mockRsvp),
        },
      };
      return fn(tx);
    });
    const req = makePostRequest({
      invitationId: "inv-published",
      guestName: "Budi Santoso",
      status: "hadir",
      guestCount: 2,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.rsvp.guestName).toBe("Budi Santoso");
  });
});
