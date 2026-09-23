/**
 * Integration tests — app/api/client/invitations/[id]/route.ts
 * Menguji: auth guard, cross-tenant boundary (403), dan ownership check.
 * 
 * STRATEGI: Mock auth() dari NextAuth dan prisma, lalu panggil handler langsung
 * sebagai fungsi — tidak perlu server HTTP berjalan.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Mock dependencies sebelum import handler ──────────────────────────────
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
  pool: { end: vi.fn() },
}));

vi.mock("@/lib/settings", () => ({
  hasPlanCapability: vi.fn().mockResolvedValue(true),
  getPlanMemoriesQuota: vi.fn().mockResolvedValue({ totalQuota: 100, maxContributors: 50, shotsQuota: 10, hasAccess: true }),
  invalidateSettingsCache: vi.fn(),
}));

vi.mock("@/lib/pinEncryption", () => ({
  decryptPin: vi.fn().mockReturnValue("123456"),
  encryptPin: vi.fn().mockReturnValue("iv:tag:cipher"),
  isPinEncrypted: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/domainUtils", () => ({
  isReservedSubdomain: vi.fn().mockReturnValue(false),
  isSubdomainExpired: vi.fn().mockReturnValue(false),
  getLatestEventDate: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/mediaSlots", () => ({
  VALID_MEDIA_SLOTS: ["LANDING_COVER", "HOME_PHOTO"],
}));

import { GET } from "@/app/api/client/invitations/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.invitation.findUnique as ReturnType<typeof vi.fn>;

// Helper: buat Request dengan params
function makeRequest(id: string): [Request, { params: Promise<{ id: string }> }] {
  const req = new Request(`http://localhost:3000/api/client/invitations/${id}`);
  const params = Promise.resolve({ id });
  return [req, { params }];
}

// Contoh undangan milik User A
const OWNER_USER_ID = "user-owner-aaa";
const OTHER_USER_ID = "user-other-bbb";
const INV_ID = "inv-test-001";

const mockInvitation = {
  id: INV_ID,
  userId: OWNER_USER_ID,
  groomName: "Budi",
  brideName: "Sari",
  status: "DRAFT",
  media: [],
  order: { planType: "TIER_1" },
  staffPin: null,
  isLockedPermanently: false,
  eventData: null,
  adminUnlockedUntil: null,
};

describe("GET /api/client/invitations/[id] — Auth Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(mockInvitation);
  });

  it("tanpa session → 401 Unauthorized", async () => {
    mockAuth.mockResolvedValue(null);
    const [req, ctx] = makeRequest(INV_ID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/[Uu]nauthorized|[Ll]ogin/);
  });

  it("session tanpa user object → 401", async () => {
    mockAuth.mockResolvedValue({ user: null });
    const [req, ctx] = makeRequest(INV_ID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it("pemilik undangan → 200 dengan data undangan", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, email: "owner@test.com", role: "CLIENT" },
    });
    const [req, ctx] = makeRequest(INV_ID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation?.id ?? body.id).toBe(INV_ID);
  });
});

describe("GET /api/client/invitations/[id] — Cross-Tenant Boundary (403 Guard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(mockInvitation);
  });

  it("user lain (bukan pemilik, bukan admin) → 403 Forbidden", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OTHER_USER_ID, email: "other@test.com", role: "CLIENT" },
    });
    const [req, ctx] = makeRequest(INV_ID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/[Ff]orbidden|[Aa]kses/);
  });

  it("admin (role ADMIN) bisa mengakses undangan milik orang lain → 200", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-user", email: "admin@test.com", role: "ADMIN" },
    });
    const [req, ctx] = makeRequest(INV_ID);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
  });

  it("undangan tidak ditemukan → 404", async () => {
    mockAuth.mockResolvedValue({
      user: { id: OWNER_USER_ID, email: "owner@test.com", role: "CLIENT" },
    });
    mockFindUnique.mockResolvedValue(null);
    const [req, ctx] = makeRequest("id-tidak-ada");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });
});
