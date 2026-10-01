/**
 * GET /api/public/qr: QR dibuat di server sendiri, dengan validasi dan batas laju.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { spawnSync } from "child_process";
import { pool } from "@/lib/prisma";
import { GET } from "@/app/api/public/qr/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");

let ipSeq = 0;
const get = (query: string, ip = `198.51.100.${(ipSeq++ % 200) + 20}`) =>
  GET(new NextRequest(`http://localhost/api/public/qr?${query}`, { headers: { "cf-connecting-ip": ip } }));

describe("tidak ada layanan QR pihak ketiga", () => {
  it("api.qrserver.com tidak muncul di kode, tema, maupun blueprint", () => {
    const result = spawnSync("grep", ["-rl", "api.qrserver.com", "app", "lib", "components", "themes", "public/downloads"], {
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(1);
    expect(result.stdout.trim()).toBe("");
  });
});

describe.skipIf(!IS_TEST_DB)("endpoint QR publik", () => {
  beforeAll(async () => {
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'qr:%'");
  });
  afterAll(async () => {
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'qr:%'");
    await pool.end();
  });

  it("mengembalikan SVG untuk data yang valid", async () => {
    const res = await get("data=Budi%20Santoso&size=160");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
    const body = await res.text();
    expect(body.startsWith("<svg")).toBe(true);
    expect(body).toContain('width="160"');
  });

  it("ukuran dibatasi 80-400", async () => {
    expect(await (await get("data=x&size=9999")).text()).toContain('width="400"');
    expect(await (await get("data=x&size=1")).text()).toContain('width="80"');
  });

  it("data kosong atau terlalu panjang -> 400", async () => {
    expect((await get("size=160")).status).toBe(400);
    expect((await get(`data=${"A".repeat(601)}`)).status).toBe(400);
    expect((await get(`data=${"A".repeat(600)}`)).status).toBe(200);
  });

  it("batas 120 per menit per IP -> 429", async () => {
    const ip = "203.0.113.99";
    const statuses: number[] = [];
    for (let i = 0; i < 122; i++) statuses.push((await get("data=x", ip)).status);
    expect(statuses.slice(0, 120).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(120)).toEqual([429, 429]);
  });
});
