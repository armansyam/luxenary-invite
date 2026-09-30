/**
 * Limiter tidak boleh dilewati dengan memutar header X-Forwarded-For / X-Real-IP (DB luxenary_test).
 * Handler RSVP asli dipanggil; kunci limiter tersimpan di tabel rate_limit_counters.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { POST } from "@/app/api/public/rsvp/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const UNKNOWN_INVITATION = "00000000-0000-4000-8000-00000000abcd";

function rsvp(headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/public/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ invitationId: UNKNOWN_INVITATION, guestName: "Uji", status: "hadir", guestCount: 1 }),
  });
}

async function clearRsvpCounters() {
  await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'rsvp_post:%'");
}

describe.skipIf(!IS_TEST_DB)("Limiter RSVP tahan terhadap pemalsuan header IP", () => {
  beforeAll(clearRsvpCounters);
  afterAll(async () => {
    await clearRsvpCounters();
    await prisma.$disconnect();
    await pool.end();
  });

  it("14 request dengan X-Forwarded-For berbeda-beda: sebagian besar ditolak 429", async () => {
    const statuses: number[] = [];
    for (let i = 1; i <= 14; i++) {
      const res = await POST(rsvp({ "x-forwarded-for": `8.8.8.${i}` }));
      statuses.push(res.status);
    }
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(4);
  });

  it("14 request dengan X-Real-IP berbeda-beda: sebagian besar ditolak 429", async () => {
    await clearRsvpCounters();
    const statuses: number[] = [];
    for (let i = 1; i <= 14; i++) {
      const res = await POST(rsvp({ "x-real-ip": `7.7.7.${i}` }));
      statuses.push(res.status);
    }
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(4);
  });

  it("klien sah dari Cloudflare dengan IP berbeda tidak saling menghambat", async () => {
    await clearRsvpCounters();
    const statuses: number[] = [];
    for (let i = 1; i <= 14; i++) {
      const res = await POST(rsvp({ "cf-connecting-ip": `203.0.113.${i}` }));
      statuses.push(res.status);
    }
    expect(statuses.filter((s) => s === 429)).toHaveLength(0);
  });
});
