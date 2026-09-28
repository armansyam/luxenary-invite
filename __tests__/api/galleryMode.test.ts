/**
 * Integration tests — app/api/client/invitations/[id]/gallery-mode/route.ts
 * 
 * Menguji:
 * 1. Auth Guard (401 Unauthorized bila tidak ada session)
 * 2. Ownership Boundary Guard (403 Forbidden bila bukan pemilik dan bukan admin)
 * 3. Status Guard (400 Bad Request jika undangan masih DRAFT atau ARCHIVED)
 * 4. Plan Capability Guard (403 Forbidden jika beralih ke EVENT_FINISHED tanpa fitur guest_memories)
 * 5. Idempotent Return (200 OK tanpa re-write jika status sudah sama)
 * 6. Sukses Toggle & Re-bake HTML (200 OK beralih PUBLISHED <-> EVENT_FINISHED)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
  pool: { end: vi.fn() },
}));

vi.mock("@/lib/cache", () => ({
  invalidateInvitationLookup: vi.fn(),
}));

vi.mock("@/lib/staticPublisher", () => ({
  buildAndSavePublishedHtml: vi.fn().mockResolvedValue("/path/to/published.html"),
}));

vi.mock("@/lib/settings", () => ({
  hasPlanCapability: vi.fn(),
}));

import { POST } from "@/app/api/client/invitations/[id]/gallery-mode/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPlanCapability } from "@/lib/settings";
import { buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { invalidateInvitationLookup } from "@/lib/cache";
import { NextRequest } from "next/server";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.invitation.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.invitation.update as ReturnType<typeof vi.fn>;
const mockHasPlanCapability = hasPlanCapability as ReturnType<typeof vi.fn>;
const mockBuildPublishedHtml = buildAndSavePublishedHtml as ReturnType<typeof vi.fn>;
const mockInvalidateCache = invalidateInvitationLookup as ReturnType<typeof vi.fn>;

function makePostRequest(id: string, body?: any): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost:3000/api/client/invitations/${id}/gallery-mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const params = Promise.resolve({ id });
  return [req, { params }];
}

const OWNER_ID = "user-owner-123";
const OTHER_USER_ID = "user-intruder-456";
const INV_ID = "inv-gallery-001";

describe("POST /api/client/invitations/[id]/gallery-mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Tanpa session -> 401 Unauthorized", async () => {
    mockAuth.mockResolvedValue(null);
    const [req, ctx] = makePostRequest(INV_ID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("2. User lain (bukan pemilik & bukan admin) -> 403 Forbidden", async () => {
    mockAuth.mockResolvedValue({ user: { id: OTHER_USER_ID, role: "CLIENT" } });
    mockFindUnique.mockResolvedValue({
      id: INV_ID,
      userId: OWNER_ID,
      status: "PUBLISHED",
      subdomain: "didan-nasha",
      invitationSlug: "didan-nasha-wedding",
      order: { planType: "TIER_2" },
    });

    const [req, ctx] = makePostRequest(INV_ID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Bukan undangan milik Anda");
  });

  it("3. Undangan masih berstatus DRAFT -> 400 Bad Request", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID, role: "CLIENT" } });
    mockFindUnique.mockResolvedValue({
      id: INV_ID,
      userId: OWNER_ID,
      status: "DRAFT",
      subdomain: "didan-nasha",
      invitationSlug: "didan-nasha-wedding",
      order: { planType: "TIER_2" },
    });

    const [req, ctx] = makePostRequest(INV_ID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Undangan masih berstatus DRAFT");
  });

  it("4. Paket tidak memiliki fitur guest_memories -> 403 Forbidden saat switch ke EVENT_FINISHED", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID, role: "CLIENT" } });
    mockFindUnique.mockResolvedValue({
      id: INV_ID,
      userId: OWNER_ID,
      status: "PUBLISHED",
      subdomain: "didan-nasha",
      invitationSlug: "didan-nasha-wedding",
      order: { planType: "TIER_1" },
    });
    mockHasPlanCapability.mockResolvedValue(false);

    const [req, ctx] = makePostRequest(INV_ID, { targetMode: "EVENT_FINISHED" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("tidak menyertakan fitur Galeri Kenangan Tamu");
  });

  it("5. Idempotent return jika target mode sama dengan status saat ini", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID, role: "CLIENT" } });
    mockFindUnique.mockResolvedValue({
      id: INV_ID,
      userId: OWNER_ID,
      status: "PUBLISHED",
      subdomain: "didan-nasha",
      invitationSlug: "didan-nasha-wedding",
      order: { planType: "TIER_2" },
    });

    const [req, ctx] = makePostRequest(INV_ID, { targetMode: "PUBLISHED" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("PUBLISHED");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("6. Sukses beralih dari PUBLISHED ke EVENT_FINISHED (Mode Galeri Aktif)", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID, role: "CLIENT" } });
    mockFindUnique.mockResolvedValue({
      id: INV_ID,
      userId: OWNER_ID,
      status: "PUBLISHED",
      subdomain: "didan-nasha",
      invitationSlug: "didan-nasha-wedding",
      order: { planType: "TIER_2" },
    });
    mockHasPlanCapability.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({ id: INV_ID, status: "EVENT_FINISHED" });

    const [req, ctx] = makePostRequest(INV_ID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("EVENT_FINISHED");
    expect(json.isGalleryMode).toBe(true);
    expect(mockBuildPublishedHtml).toHaveBeenCalledWith(INV_ID);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: INV_ID },
      data: { status: "EVENT_FINISHED" },
    });
    expect(mockInvalidateCache).toHaveBeenCalledWith("didan-nasha", "didan-nasha-wedding");
  });

  it("7. Sukses mengembalikan status dari EVENT_FINISHED ke PUBLISHED (Mode Undangan)", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID, role: "CLIENT" } });
    mockFindUnique.mockResolvedValue({
      id: INV_ID,
      userId: OWNER_ID,
      status: "EVENT_FINISHED",
      subdomain: "didan-nasha",
      invitationSlug: "didan-nasha-wedding",
      order: { planType: "TIER_2" },
    });
    mockUpdate.mockResolvedValue({ id: INV_ID, status: "PUBLISHED" });

    const [req, ctx] = makePostRequest(INV_ID);
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("PUBLISHED");
    expect(json.isGalleryMode).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: INV_ID },
      data: { status: "PUBLISHED" },
    });
    expect(mockInvalidateCache).toHaveBeenCalledWith("didan-nasha", "didan-nasha-wedding");
  });
});
