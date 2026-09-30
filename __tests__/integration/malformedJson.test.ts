/**
 * Body JSON rusak dari klien atau pemanggil webhook adalah kesalahan klien: harus 400, bukan 500.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { POST as rsvpPost } from "@/app/api/public/rsvp/route";
import { POST as midtransPost } from "@/app/api/webhook/midtrans/route";
import { POST as xenditPost } from "@/app/api/webhook/xendit/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");

const bad = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: "{bukan json" });

describe.skipIf(!IS_TEST_DB)("JSON rusak menghasilkan 400", () => {
  beforeAll(async () => {
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'rsvp_post:%'");
  });
  afterAll(async () => {
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'rsvp_post:%'");
    await prisma.$disconnect();
    await pool.end();
  });

  it("POST /api/public/rsvp", async () => {
    const res = await rsvpPost(bad("http://localhost/api/public/rsvp", { "cf-connecting-ip": "198.51.100.10" }));
    expect(res.status).toBe(400);
  });

  it("POST /api/webhook/midtrans", async () => {
    const res = await midtransPost(bad("http://localhost/api/webhook/midtrans"));
    expect(res.status).toBe(400);
  });

  it("POST /api/webhook/xendit", async () => {
    const res = await xenditPost(bad("http://localhost/api/webhook/xendit"));
    expect(res.status).toBe(400);
  });
});
