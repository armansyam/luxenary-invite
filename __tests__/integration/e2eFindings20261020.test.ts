/**
 * Temuan uji alur menyeluruh 20 Okt 2026 (build produksi lokal, 6 jenis acara):
 * 1. Undangan mode galeri (EVENT_FINISHED) dibuka di subdomain asli dialihkan ke /memories milik apex (halaman demo
 *    platform) karena URL absolut dibangun dari req.url, yang origin-nya apex.
 * 2. Tema satu nama hanya menampilkan ucapan yang ada saat publikasi; ucapan tamu sesudahnya tidak pernah tampil.
 * DB luxenary_test, handler rute dipanggil langsung.
 */
import vm from "vm";
import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { GET as subdomainRoute } from "@/app/(public)/s/[subdomain]/route";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import fs from "fs";
import path from "path";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_find1020_${Date.now()}`;
const ids = { users: [] as string[], invitations: [] as string[] };

async function makeInvitation(eventType: string, themeId: string, status: "PUBLISHED" | "EVENT_FINISHED", participants: object) {
  const user = await prisma.user.create({ data: { email: `${TAG}_${eventType}@example.test`, name: "Uji" } });
  ids.users.push(user.id);
  const order = await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-${eventType}`, planType: "TIER_3", amount: 1, status: "PAID", paidAt: new Date() } as never });
  const sub = `${TAG.replace(/_/g, "-")}-${eventType.toLowerCase()}`.slice(0, 60);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id, orderId: order.id, themeId, eventType: eventType as never, status, subdomain: sub, invitationSlug: sub, publishedAt: new Date(),
      participantsJson: participants, eventData: [{ title: "Acara", date: "2099-12-05", time: "10:00 – 14:00 WITA", location: "Gedung", isPrimary: true }],
    },
  });
  ids.invitations.push(inv.id);
  return inv;
}

afterAll(async () => {
  for (const id of ids.invitations) fs.rmSync(path.join(process.cwd(), "data", "drafts", `${id}.html`), { force: true });
  await prisma.rsvp.deleteMany({ where: { invitationId: { in: ids.invitations } } });
  await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
  await prisma.order.deleteMany({ where: { userId: { in: ids.users } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("mode galeri dialihkan di host yang sama", () => {
  it("host subdomain -> /memories di subdomain itu; bentuk apex /s/<sub> -> /s/<sub>/memories; query dipertahankan", async () => {
    const inv = await makeInvitation("WEDDING", "kalandra", "EVENT_FINISHED", { groom: { name: "Raka", nickname: "Raka" }, bride: { name: "Dewi", nickname: "Dewi" } });
    const sub = inv.subdomain!;
    const params = { params: Promise.resolve({ subdomain: sub }) };

    const onSub = await subdomainRoute(new NextRequest(`http://localhost:3200/s/${sub}?to=Budi`, { headers: { host: `${sub}.localhost:3200` } }), params);
    expect(onSub.status).toBe(307);
    expect(onSub.headers.get("location")).toBe("/memories?to=Budi");

    const onApex = await subdomainRoute(new NextRequest(`http://localhost:3200/s/${sub}`, { headers: { host: "localhost:3200" } }), params);
    expect(onApex.status).toBe(307);
    expect(onApex.headers.get("location")).toBe(`/s/${sub}/memories`);
  });
});

describe.skipIf(!IS_TEST_DB)("ucapan terbaru pada tema satu nama", () => {
  it("halaman terbit memuat ucapan dari API saat dibuka, dengan teks tamu di-escape", async () => {
    const inv = await makeInvitation("WISUDA", "toga", "PUBLISHED", { person: { name: "Bima Prasetya", nickname: "Bima" } });
    const html = await renderTemplateFile("toga", (await composeTemplateData(inv.id)) as any, { editMode: false, invitationId: inv.id });
    const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("universalWishesList") && s.includes("/api/public/rsvp?invitationId="));
    expect(script, "skrip pemuat ucapan").toBeTruthy();

    const list = { innerHTML: "SNAPSHOT_LAMA" };
    let requested = "";
    const rsvps = [{ guestName: "Tamu Baru <img src=x onerror=alert(1)>", status: "hadir", guestCount: 2, message: "<script>alert(1)</script> Selamat!" }];
    const sandbox = {
      document: { getElementById: (id: string) => (id === "universalWishesList" ? list : null) },
      fetch: (url: string) => { requested = url; return Promise.resolve({ json: () => Promise.resolve({ success: true, rsvps }) }); },
      console,
      encodeURIComponent,
    };
    vm.runInNewContext(script!, sandbox);
    await new Promise((r) => setTimeout(r, 20));

    expect(requested).toBe(`/api/public/rsvp?invitationId=${inv.id}`);
    expect(list.innerHTML).not.toContain("SNAPSHOT_LAMA");
    expect(list.innerHTML).toContain("Tamu Baru &lt;img src=x onerror=alert(1)&gt;");
    expect(list.innerHTML).toContain("&lt;script&gt;alert(1)&lt;/script&gt; Selamat!");
    expect(list.innerHTML).not.toContain("<img");
    expect(list.innerHTML).toContain("Hadir (2)");
  });
});
