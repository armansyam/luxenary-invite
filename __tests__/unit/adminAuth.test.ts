import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

let currentSession: any = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => currentSession) }));

import { requireAdminModule, requireAnyAdmin, requireSuperAdmin } from "@/lib/adminAuth";
import { ADMIN_MODULES } from "@/lib/adminPermissions";

const sessionFor = (role: string, permissions: string[] = []) => ({
  user: { id: `id-${role}`, email: `${role}@t.local`, role, isAdmin: role !== "CLIENT", permissions },
});

async function statusFor(role: string, moduleId: string, permissions: string[] = []) {
  currentSession = sessionFor(role, permissions);
  const guard = await requireAdminModule(moduleId);
  return guard.ok ? 200 : guard.response.status;
}

describe("requireAdminModule — matriks peran x modul", () => {
  beforeEach(() => {
    currentSession = null;
  });

  it("tanpa sesi -> 401", async () => {
    const guard = await requireAdminModule("orders");
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(401);
  });

  it("klien biasa -> 401 untuk semua modul", async () => {
    for (const m of ADMIN_MODULES) {
      expect(await statusFor("CLIENT", m.id)).toBe(401);
    }
  });

  it("SUPER_ADMIN -> 200 untuk semua modul", async () => {
    for (const m of ADMIN_MODULES) {
      expect(await statusFor("SUPER_ADMIN", m.id)).toBe(200);
    }
  });

  it.each(["settings", "database", "team"])("modul khusus super admin '%s' -> 403 untuk ADMIN, FINANCE, SUPPORT", async (moduleId) => {
    for (const role of ["ADMIN", "FINANCE", "SUPPORT"]) {
      expect(await statusFor(role, moduleId)).toBe(403);
    }
  });

  it("SUPPORT (izin bawaan) hanya users, invitations, custom_domains", async () => {
    const allowed = ["users", "invitations", "custom_domains"];
    for (const m of ADMIN_MODULES) {
      expect(await statusFor("SUPPORT", m.id)).toBe(allowed.includes(m.id) ? 200 : 403);
    }
  });

  it("FINANCE (izin bawaan) hanya overview, orders, users, finance", async () => {
    const allowed = ["overview", "orders", "users", "finance"];
    for (const m of ADMIN_MODULES) {
      expect(await statusFor("FINANCE", m.id)).toBe(allowed.includes(m.id) ? 200 : 403);
    }
  });

  it("izin kustom staf diperluas tetapi tidak dapat menyusupkan modul super admin", async () => {
    expect(await statusFor("SUPPORT", "finance", ["finance"])).toBe(200);
    expect(await statusFor("SUPPORT", "settings", ["settings"])).toBe(403);
    expect(await statusFor("ADMIN", "database", ["database"])).toBe(403);
  });

  it("requireSuperAdmin: hanya SUPER_ADMIN, peran lain 403", async () => {
    for (const [role, expected] of [["SUPER_ADMIN", true], ["ADMIN", false], ["FINANCE", false], ["SUPPORT", false]] as const) {
      currentSession = sessionFor(role);
      const guard = await requireSuperAdmin();
      expect(guard.ok).toBe(expected);
      if (!guard.ok) expect(guard.response.status).toBe(403);
    }
  });

  it("requireAnyAdmin: semua peran admin lolos, klien ditolak", async () => {
    for (const role of ["SUPER_ADMIN", "ADMIN", "FINANCE", "SUPPORT"]) {
      currentSession = sessionFor(role);
      expect((await requireAnyAdmin()).ok).toBe(true);
    }
    currentSession = sessionFor("CLIENT");
    expect((await requireAnyAdmin()).ok).toBe(false);
  });
});

function collectRoutes(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return collectRoutes(p);
    return e.name === "route.ts" ? [p] : [];
  });
}

const ROOT = path.resolve(__dirname, "../..");

describe("pemindai statis — rute tidak boleh terlupa guard", () => {
  it("setiap rute /api/admin memanggil guard otorisasi", () => {
    const missing = collectRoutes(path.join(ROOT, "app/api/admin")).filter((f) => {
      const src = fs.readFileSync(f, "utf8");
      return !/requireAdminModule|requireAnyAdmin|requireSuperAdmin|hasAdminPermission/.test(src);
    });
    expect(missing.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it("rute /api tanpa autentikasi hanya yang tercatat sebagai publik", () => {
    // Daftar ini sengaja eksplisit: menambah rute publik baru harus menjadi keputusan sadar.
    const PUBLIC_ALLOWLIST = new Set([
      "auth/[...nextauth]",
      "client/subdomain/check",
      "health",
      "public/memories/[invitationId]",
      "public/memories/upload",
      "public/music",
      "public/promo/validate",
      "public/qr",
      "public/resolve-custom-domain",
      "public/rsvp",
      "public/settings",
      "public/themes",
      "public/version",
      "receptionist/guests",
      "receptionist/scan",
      "receptionist/verify-pin",
      // Penerima laporan CSP Report-Only: browser mengirim tanpa kredensial; dibatasi ukuran (8 KB) dan laju, hanya menulis log.
      "security/csp-report",
      "sse/memories",
      "webhook/midtrans",
      "webhook/xendit",
      "cron/backup",
      "cron/cleanup",
    ]);
    const apiRoot = path.join(ROOT, "app/api");
    const unauthenticated = collectRoutes(apiRoot)
      .filter((f) => {
        const src = fs.readFileSync(f, "utf8");
        return !/\bauth\(\)|requireAdminModule|requireAnyAdmin|requireSuperAdmin|isReceptionistAuthorized|CRON_SECRET|verifyWebhookSignature|x-callback-token/.test(src);
      })
      .map((f) => path.relative(apiRoot, path.dirname(f)));
    const unexpected = unauthenticated.filter((r) => !PUBLIC_ALLOWLIST.has(r));
    expect(unexpected).toEqual([]);
  });
});
