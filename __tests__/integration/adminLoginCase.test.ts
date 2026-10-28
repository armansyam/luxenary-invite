/**
 * Login admin (fungsi `authorize` provider Credentials di auth.ts yang sungguhan) tidak peka huruf besar, sehingga akun
 * lama yang tersimpan dengan huruf besar tetap dapat masuk (hanya berjalan di database `luxenary_test`).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";

type Authorize = (credentials: Record<string, string>, request: Request) => Promise<{ id: string } | null>;
type CapturedConfig = { providers: Array<{ id?: string; type?: string; options?: { authorize?: Authorize }; authorize?: Authorize }> };

// Impor auth.ts diangkat ke atas berkas, jadi wadah konfigurasi harus ada sebelum mock dijalankan.
const captured = vi.hoisted(() => ({ config: null as CapturedConfig | null }));

vi.mock("next-auth", () => ({
  default: (config: CapturedConfig) => {
    captured.config = config;
    return { handlers: {}, auth: async () => null, signIn: vi.fn(), signOut: vi.fn() };
  },
}));

import "@/auth";
import { prisma, pool } from "@/lib/prisma";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_logincase_${Date.now()}`;
const PASSWORD = "kata-sandi-uji-login-1";

function credentialsAuthorize(): Authorize {
  const provider = captured.config?.providers.find((p) => p.type === "credentials" || p.id === "credentials");
  const fn = provider?.options?.authorize ?? provider?.authorize;
  if (!fn) throw new Error("Provider Credentials tidak ditemukan di konfigurasi auth.ts");
  return fn;
}

describe.skipIf(!IS_TEST_DB)("login admin tidak peka huruf besar", () => {
  let adminId = "";

  beforeAll(async () => {
    // Bentuk data lama: username dan email tersimpan dengan huruf besar.
    adminId = (
      await prisma.admin.create({
        data: { username: `${TAG}_Upper`, email: `${TAG}_Upper@T.local`, name: "Uji", role: "ADMIN", permissions: [], passwordHash: await bcrypt.hash(PASSWORD, 4) },
      })
    ).id;
  });

  // Di luar NODE_ENV=development header IP tidak dipercaya, jadi semua permintaan berbagi satu kunci; dibaca sebagai total.
  const loginRequest = () => new Request("http://localhost/api/auth/callback/credentials", { method: "POST" });
  const failureCount = async () =>
    Number((await pool.query<{ total: string }>("SELECT COALESCE(SUM(count), 0) AS total FROM rate_limit_counters WHERE key LIKE 'auth_login:%' AND expires_at > NOW()")).rows[0].total);

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany({ where: { adminId } });
    await prisma.admin.deleteMany({ where: { id: adminId } });
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'auth_login:%'");
  });

  it("username dan email berhuruf besar dapat login, password salah tetap ditolak", async () => {
    const authorize = credentialsAuthorize();
    const before = await failureCount();
    expect((await authorize({ email: `${TAG}_Upper`, password: PASSWORD, portal: "ADMIN" }, loginRequest()))?.id).toBe(adminId);
    expect((await authorize({ email: `${TAG}_UPPER@t.local`, password: PASSWORD, portal: "ADMIN" }, loginRequest()))?.id).toBe(adminId);
    // Login sukses tidak menghabiskan jatah percobaan (proxy hanya menolak setelah 5 kegagalan).
    expect(await failureCount()).toBe(before);
    expect(await authorize({ email: `${TAG}_Upper`, password: "salah", portal: "ADMIN" }, loginRequest())).toBeNull();
    expect(await failureCount()).toBe(before + 1);
  });
});
