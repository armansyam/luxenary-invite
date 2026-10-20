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

async function makeInvitation(eventType: string, themeId: string, status: "PUBLISHED" | "EVENT_FINISHED", participants: object, featureSettings: object = {}) {
  const key = `${eventType.toLowerCase()}${ids.users.length}`;
  const user = await prisma.user.create({ data: { email: `${TAG}_${key}@example.test`, name: "Uji" } });
  ids.users.push(user.id);
  const order = await prisma.order.create({ data: { userId: user.id, invoiceNumber: `${TAG}-${key}`, planType: "TIER_3", amount: 1, status: "PAID", paidAt: new Date() } as never });
  const sub = `${TAG.replace(/_/g, "-")}-${key}`.slice(0, 60);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id, orderId: order.id, themeId, eventType: eventType as never, status, subdomain: sub, invitationSlug: sub, publishedAt: new Date(),
      participantsJson: participants, featureSettings, eventData: [{ title: "Acara", date: "2099-12-05", time: "10:00 – 14:00 WITA", location: "Gedung", isPrimary: true }],
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

describe.skipIf(!IS_TEST_DB)("orang tua dan Instagram kosong di semua master pernikahan", () => {
  const parentsText = (html: string) =>
    [...html.matchAll(/<(p|div|strong)\b[^>]*class="[^"]*parents[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

  it.each([true, false])("tanpa '&' atau '@' yatim dan tanpa label 'Putra/Putri Dari' kosong (mempelai pria duluan: %s)", async (groomFirst) => {
    const inv = await makeInvitation("WEDDING", "kalandra", "PUBLISHED", { groom: { name: "Arya", nickname: "Arya" }, bride: { name: "Nadia", nickname: "Nadia" } }, groomFirst ? {} : { displayOrder: "BRIDE_FIRST" });
    const data = (await composeTemplateData(inv.id)) as any;
    const themes = await prisma.theme.findMany({ where: { eventType: "WEDDING" as never, isActive: true }, select: { id: true } });
    expect(themes.length).toBeGreaterThan(20);
    for (const { id } of themes) {
      const html = await renderTemplateFile(id, data, { editMode: false });
      expect(html, `${id}: tombol Instagram kosong`).not.toMatch(/href="https?:\/\/(www\.)?instagram\.com\/?"/);
      for (const t of parentsText(html)) expect(t, `${id}: teks orang tua "${t}"`).not.toMatch(/^&|&$|^(Putra|Putri) dari\s*$/i);
      expect(html, `${id}: label orang tua tanpa nama`).not.toMatch(/>\s*(Putra|Putri) Dari\s*</);
    }
  });

  it("satu orang tua saja: label tampil, tanpa '&'; switch nama pertama dipatuhi", async () => {
    const inv = await makeInvitation("WEDDING", "kalandra", "PUBLISHED", {
      groom: { name: "Arya", nickname: "Arya", mother: "Ibu Siti" }, bride: { name: "Nadia", nickname: "Nadia", father: "Bapak Hendra", mother: "Ibu Ratna", instagram: "nadia.kirana" },
    }, { displayOrder: "BRIDE_FIRST" });
    const html = await renderTemplateFile("kalandra", (await composeTemplateData(inv.id)) as any, { editMode: false });
    const texts = parentsText(html);
    expect(texts[0]).toBe("Bapak Hendra &amp; Ibu Ratna");
    expect(texts[1]).toBe("Ibu Siti");
    expect(html).toMatch(/>\s*Putri Dari\s*</);
    expect(html).toContain('href="https://instagram.com/nadia.kirana"');
    expect(html).not.toMatch(/href="https?:\/\/(www\.)?instagram\.com\/?"/);
  });
});

describe("master tema: RSVP terkirim dan token tidak di dalam komentar", () => {
  const masters = fs.readdirSync(path.join(process.cwd(), "themes"), { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".html") && !d.parentPath.includes("_blueprints"))
    .map((d) => path.join(d.parentPath, d.name));

  it("setiap master dengan form RSVP mengirim guestName ke /api/public/rsvp atau memakai handler mesin", () => {
    expect(masters.length).toBeGreaterThan(30);
    const broken: string[] = [];
    for (const file of masters) {
      const src = fs.readFileSync(file, "utf8");
      if (!/id="rsvpForm"|luxSubmitRsvp/.test(src)) continue;
      const usesEngineHandler = src.includes("{{musicPlayerHtml}}");
      const ownHandlerOk = /fetch\(\s*['"]\/api\/public\/rsvp['"]/.test(src) && /guestName\s*:/.test(src);
      if (!usesEngineHandler && !ownHandlerOk) broken.push(path.basename(file));
      if (src.includes("Ucapan tersimpan di perangkat")) broken.push(`${path.basename(file)} (pesan sukses palsu)`);
      if (/\bname:\s*name,\s*\n\s*status/.test(src) || /\bpax:\s*parseInt/.test(src)) broken.push(`${path.basename(file)} (payload name/pax)`);
    }
    expect(broken).toEqual([]);
  });

  it("tidak ada {{token}} di dalam komentar HTML (token diganti HTML ber-komentar sehingga struktur seksi rusak)", () => {
    const offenders = masters.filter((file) => /<!--[^>]*\{\{\s*[\w.]+\s*\}\}[^>]*-->/.test(fs.readFileSync(file, "utf8"))).map((f) => path.basename(f));
    expect(offenders).toEqual([]);
  });
});

describe.skipIf(!IS_TEST_DB)("runtime dock sempit dan video slot", () => {
  it("menyertakan penyesuai dock dan pengatur video; video Home/penutup tidak autoplay sendiri", async () => {
    const inv = await makeInvitation("WEDDING", "kalandra", "PUBLISHED", { groom: { name: "Arya", nickname: "Arya" }, bride: { name: "Nadia", nickname: "Nadia" } });
    await prisma.invitationMedia.createMany({ data: [
      { invitationId: inv.id, mediaSlot: "HOME_PHOTO" as never, localPath: `/uploads/invitations/${inv.id}/home-photo.mp4`, mimeType: "video/mp4" },
      { invitationId: inv.id, mediaSlot: "CLOSING_COVER" as never, localPath: `/uploads/invitations/${inv.id}/closing-cover.mp4`, mimeType: "video/mp4" },
    ] });
    const html = await renderTemplateFile("kalandra", (await composeTemplateData(inv.id)) as any, { editMode: false, invitationId: inv.id });
    expect(html).toContain("function fitBottomDock()");
    expect(html).toContain(".bottom-dock.lux-dock-compact");
    expect(html).toContain("function initSlotVideoVisibility()");
    expect(html).toMatch(/<video class="lux-home-video" loop muted/);
    expect(html).toMatch(/<video class="lux-closing-video" loop muted playsinline webkit-playsinline preload="metadata"/);
  });
});

describe.skipIf(!IS_TEST_DB)("sampul HP video + sampul desktop foto", () => {
  it("di ≥900px video sampul HP disembunyikan agar foto sampul desktop terlihat", async () => {
    const inv = await makeInvitation("WEDDING", "kalandra", "PUBLISHED", { groom: { name: "Arya", nickname: "Arya" }, bride: { name: "Nadia", nickname: "Nadia" } });
    await prisma.invitationMedia.createMany({ data: [
      { invitationId: inv.id, mediaSlot: "LANDING_COVER" as never, localPath: `/uploads/invitations/${inv.id}/landing-cover.mp4`, mimeType: "video/mp4" },
      { invitationId: inv.id, mediaSlot: "LANDING_COVER_DESKTOP" as never, localPath: `/uploads/invitations/${inv.id}/landing-cover-desktop.webp`, mimeType: "image/webp" },
    ] });
    const html = await renderTemplateFile("kalandra", (await composeTemplateData(inv.id)) as any, { editMode: false, invitationId: inv.id });
    expect(html).toContain('<video class="lux-cover-video"');
    const desktopStyle = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).find((s) => s.includes("landing-cover-desktop.webp"));
    expect(desktopStyle, "blok gaya sampul desktop").toBeTruthy();
    expect(desktopStyle!).toMatch(/@media \(min-width: 900px\)[\s\S]*\.lux-cover-video\s*\{\s*display:\s*none !important;/);
  });
});
