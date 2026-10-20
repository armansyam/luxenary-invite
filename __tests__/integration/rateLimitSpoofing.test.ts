/**
 * Limiter RSVP tidak memakai IP (tamu satu operator seluler berbagi IP publik): batasnya per nama tamu dan per undangan,
 * sehingga memutar header X-Forwarded-For / X-Real-IP tidak dapat melewatinya, dan banyak tamu sah dari IP yang sama
 * tidak saling menghambat (DB luxenary_test). Handler RSVP asli dipanggil; kunci tersimpan di rate_limit_counters.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { POST } from "@/app/api/public/rsvp/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const UNKNOWN_INVITATION = "00000000-0000-4000-8000-00000000abcd";

function rsvp(headers: Record<string, string>, guestName = "Uji") {
  return new NextRequest("http://localhost/api/public/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ invitationId: UNKNOWN_INVITATION, guestName, status: "hadir", guestCount: 1 }),
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

  it("nama yang sama dengan X-Forwarded-For berbeda-beda: kiriman ke-4 dan seterusnya ditolak 429", async () => {
    const statuses: number[] = [];
    for (let i = 1; i <= 8; i++) {
      const res = await POST(rsvp({ "x-forwarded-for": `8.8.8.${i}` }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 3).every((s) => s !== 429)).toBe(true);
    expect(statuses.slice(3).every((s) => s === 429)).toBe(true);
  });

  it("nama yang sama dengan X-Real-IP berbeda-beda: kiriman ke-4 dan seterusnya ditolak 429", async () => {
    await clearRsvpCounters();
    const statuses: number[] = [];
    for (let i = 1; i <= 8; i++) {
      const res = await POST(rsvp({ "x-real-ip": `7.7.7.${i}` }));
      statuses.push(res.status);
    }
    expect(statuses.slice(3).every((s) => s === 429)).toBe(true);
  });

  it("50 tamu berbeda dari satu IP (CGNAT operator seluler) tidak saling menghambat", async () => {
    await clearRsvpCounters();
    const statuses: number[] = [];
    for (let i = 1; i <= 50; i++) {
      const res = await POST(rsvp({ "cf-connecting-ip": "203.0.113.7" }, `Tamu ${i}`));
      statuses.push(res.status);
    }
    expect(statuses.filter((s) => s === 429)).toHaveLength(0);
  });

  it("batas per undangan tetap menahan banjir: kiriman ke-301 dalam semenit ditolak 429", async () => {
    await clearRsvpCounters();
    await pool.query("INSERT INTO rate_limit_counters (key, count, expires_at) VALUES ($1, 300, now() + interval '1 minute') ON CONFLICT (key) DO UPDATE SET count = 300, expires_at = now() + interval '1 minute'", [`rsvp_post:inv:${UNKNOWN_INVITATION}`]);
    const res = await POST(rsvp({ "cf-connecting-ip": "203.0.113.8" }, "Tamu Banjir"));
    expect(res.status).toBe(429);
  });
});
