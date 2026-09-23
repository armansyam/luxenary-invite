/**
 * Integration tests — app/api/orders/create/route.ts
 * Menguji: auth guard, admin isolation, service availability block, dan validasi planType.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    invitation: {
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
  pool: { end: vi.fn() },
}));

vi.mock("@/lib/storage", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/planUtils", () => ({
  normalizePlanType: vi.fn((p: string) => p?.toUpperCase()),
}));

// Settings mock — default: service OPEN
const mockGetServiceAvailability = vi.fn().mockResolvedValue({
  isOpen: true,
  mode: "OPEN",
  message: "",
});

vi.mock("@/lib/settings", () => ({
  getServiceAvailability: () => mockGetServiceAvailability(),
  invalidateSettingsCache: vi.fn(),
}));

import { POST } from "@/app/api/orders/create/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockUserFindFirst = prisma.user.findFirst as ReturnType<typeof vi.fn>;

function makePostRequest(body: Record<string, any>): NextRequest {
  return new NextRequest("http://localhost:3000/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CLIENT_SESSION = {
  user: { id: "client-user-001", email: "client@test.com", name: "Klien Test", role: "CLIENT" },
};

const ADMIN_SESSION = {
  user: { id: "admin-001", email: "admin@test.com", role: "SUPER_ADMIN", isAdmin: true },
};

describe("POST /api/orders/create — Auth Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServiceAvailability.mockResolvedValue({ isOpen: true, mode: "OPEN", message: "" });
  });

  it("tanpa session → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePostRequest({ planType: "TIER_1" }));
    expect(res.status).toBe(401);
  });

  it("session tanpa user.id → 401", async () => {
    mockAuth.mockResolvedValue({ user: null });
    const res = await POST(makePostRequest({ planType: "TIER_1" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/orders/create — Admin Isolation Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServiceAvailability.mockResolvedValue({ isOpen: true, mode: "OPEN", message: "" });
  });

  it("akun ADMIN tidak boleh membuat order → 403", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    const res = await POST(makePostRequest({ planType: "TIER_1" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/[Aa]dministrator|[Aa]dmin/);
  });

  it("akun SUPER_ADMIN tidak boleh membuat order → 403", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "sa-001", role: "SUPER_ADMIN", isAdmin: true },
    });
    const res = await POST(makePostRequest({ planType: "TIER_1" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/orders/create — Service Availability Guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("service CLOSED_ORDER → 403 dengan kode CLOSED_ORDER", async () => {
    mockAuth.mockResolvedValue(CLIENT_SESSION);
    mockGetServiceAvailability.mockResolvedValue({
      isOpen: false,
      mode: "CLOSED_ORDER",
      message: "Pemesanan sedang ditutup.",
    });
    const res = await POST(makePostRequest({ planType: "TIER_1" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("CLOSED_ORDER");
  });

  it("service MAINTENANCE → 403", async () => {
    mockAuth.mockResolvedValue(CLIENT_SESSION);
    mockGetServiceAvailability.mockResolvedValue({
      isOpen: false,
      mode: "MAINTENANCE",
      message: "Dalam pemeliharaan.",
    });
    const res = await POST(makePostRequest({ planType: "TIER_1" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/orders/create — Input Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServiceAvailability.mockResolvedValue({ isOpen: true, mode: "OPEN", message: "" });
    mockAuth.mockResolvedValue(CLIENT_SESSION);
  });

  it("tanpa planType → 400", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/planType/i);
  });
});
