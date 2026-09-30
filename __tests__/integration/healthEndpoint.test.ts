import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { GET } from "@/app/api/health/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const SECRET = "vitest-health-secret-0123456789";
const saved = process.env.CRON_SECRET;

const call = (headers: Record<string, string> = {}) => GET(new Request("http://localhost/api/health", { headers }));

describe.skipIf(!IS_TEST_DB)("GET /api/health", () => {
  beforeAll(() => {
    process.env.CRON_SECRET = SECRET;
  });
  afterAll(async () => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
    await prisma.$disconnect();
    await pool.end();
  });

  it("publik: hanya status dan timestamp, tanpa lingkungan, memori, cache, atau latensi DB", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp"]);
  });

  it("Bearer salah diperlakukan sebagai publik", async () => {
    const body = await (await call({ authorization: "Bearer salah" })).json();
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp"]);
  });

  it("Bearer CRON_SECRET: detail lengkap untuk pemantauan", async () => {
    const res = await call({ authorization: `Bearer ${SECRET}` });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.database.status).toBe("connected");
    expect(typeof body.memory.rssMb).toBe("number");
    expect(body.environment).toBeDefined();
  });
});
