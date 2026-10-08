/**
 * Check-in resepsionis: tamu terdaftar dicocokkan lewat nama, tamu di luar daftar (mis. tautan dibuat manual lewat
 * ?to=Nama) otomatis menjadi tamu umum, dan satu-satunya penolakan adalah QR acara lain atau QR yang sudah dipakai.
 * Juga memverifikasi bahwa undangan pernikahan benar-benar membuat QR berformat LUX|<id undangan>|<nama> dengan
 * inisial mempelai (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, pool } from "@/lib/prisma";
import { generateReceptionistToken } from "@/lib/receptionistAuth";
import { buildCheckinPayload } from "@/lib/checkinQr";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { POST as scanPost } from "@/app/api/receptionist/scan/route";
import { GET as guestsGet } from "@/app/api/receptionist/guests/route";
import { GET as qrGet } from "@/app/api/public/qr/route";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_walkin_${Date.now()}`;
const STORED_PIN = "enc:pin-walkin-test";

let ownerId = "";
let invA = "";
let invB = "";
let registeredQr = "";
const created: string[] = [];

function scan(body: Record<string, unknown>) {
  return scanPost(
    new NextRequest("http://localhost/api/receptionist/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

const asStaff = (invitationId: string, qrToken: string, isCheckIn = true) => ({
  qrToken,
  invitationId,
  isCheckIn,
  token: generateReceptionistToken(invitationId, STORED_PIN),
});

const guestRows = (invitationId: string) => prisma.guest.findMany({ where: { invitationId }, orderBy: { createdAt: "asc" } });

async function resetScanRateLimit() {
  await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'scan:%'");
}

describe.skipIf(!IS_TEST_DB)("check-in resepsionis: tamu terdaftar dan tamu umum", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET ||= "vitest-walkin-signing-secret";
    await resetScanRateLimit();
    const owner = await prisma.user.create({ data: { email: `${TAG}@t.local`, name: TAG } });
    ownerId = owner.id;
    const mk = async (suffix: string) => {
      const inv = await prisma.invitation.create({
        data: {
          userId: ownerId,
          invitationSlug: `${TAG}-${suffix}`,
          groomSlug: `${TAG}-g${suffix}`,
          brideSlug: `${TAG}-b${suffix}`,
          groomName: "Raka Putra",
          groomNickname: "Raka",
          brideName: "Dewi Ayu",
          brideNickname: "Dewi",
          status: "PUBLISHED",
          staffPin: STORED_PIN,
        },
      });
      created.push(inv.id);
      return inv.id;
    };
    invA = await mk("a");
    invB = await mk("b");
    registeredQr = `${TAG}-token-ani`;
    await prisma.guest.create({
      data: { invitationId: invA, name: "Ani Terdaftar", slug: "ani-terdaftar", category: "VIP", qrToken: registeredQr, guestQuota: 3, tableNumber: "5" },
    });
  });

  afterAll(async () => {
    await resetScanRateLimit();
    await prisma.guest.deleteMany({ where: { invitationId: { in: created } } });
    await prisma.invitation.deleteMany({ where: { id: { in: created } } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
  });

  it("tamu terdaftar dicocokkan lewat nama (tanpa membedakan huruf besar/kecil) dan ditandai hadir, tanpa baris baru", async () => {
    const res = await scan(asStaff(invA, buildCheckinPayload(invA, "ani TERDAFTAR")));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.guest.name).toBe("Ani Terdaftar");
    expect(body.guest.category).toBe("VIP");
    const rows = await guestRows(invA);
    expect(rows).toHaveLength(1);
    expect(rows[0].isTokenRedeemed).toBe(true);
  });

  it("memindai ulang tamu yang sudah hadir bersifat idempoten", async () => {
    const res = await scan(asStaff(invA, buildCheckinPayload(invA, "Ani Terdaftar")));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.alreadyRedeemed).toBe(true);
    expect(await guestRows(invA)).toHaveLength(1);
  });

  it("nama di luar daftar menjadi tamu umum (kategori UMUM), langsung hadir, bukan penolakan", async () => {
    const res = await scan(asStaff(invA, buildCheckinPayload(invA, "Tamu Dari Link Manual")));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.guest.name).toBe("Tamu Dari Link Manual");
    expect(body.guest.category).toBe("UMUM");

    const row = (await guestRows(invA)).find((g) => g.name === "Tamu Dari Link Manual")!;
    expect(row.category).toBe("UMUM");
    expect(row.isTokenRedeemed).toBe(true);
    expect(row.qrToken).toMatch(new RegExp(`^OTS-${invA}-`));
  });

  it("daftar tamu resepsionis tetap membawa nomor meja dan kuota tamu terdaftar; tamu umum tanpa meja", async () => {
    const res = await guestsGet(
      new NextRequest(`http://localhost/api/receptionist/guests?invitationId=${invA}`, {
        headers: { authorization: `Bearer ${generateReceptionistToken(invA, STORED_PIN)}` },
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    const ani = body.guests.find((g: { name: string }) => g.name === "Ani Terdaftar");
    expect(ani).toMatchObject({ category: "VIP", tableNumber: "5", guestQuota: 3, isTokenRedeemed: true });
    const walkIn = body.guests.find((g: { name: string }) => g.name === "Tamu Dari Link Manual");
    expect(walkIn).toMatchObject({ category: "UMUM", tableNumber: null, guestQuota: 1 });
  });

  it("memindai tamu umum yang sama lagi tidak membuat baris ganda", async () => {
    const res = await scan(asStaff(invA, buildCheckinPayload(invA, "tamu dari LINK manual")));
    expect((await res.json()).alreadyRedeemed).toBe(true);
    expect((await guestRows(invA)).filter((g) => g.name === "Tamu Dari Link Manual")).toHaveLength(1);
  });

  it("kategori VIP yang dipalsukan di dalam QR diabaikan: tamu umum selalu UMUM", async () => {
    const res = await scan(asStaff(invA, `LUX|${invA}|Penyusup Berpura VIP|VIP`));
    expect(res.status).toBe(200);
    expect((await prisma.guest.findFirst({ where: { invitationId: invA, name: "Penyusup Berpura VIP" } }))?.category).toBe("UMUM");
  });

  it("QR acara lain ditolak dan tidak membuat tamu", async () => {
    const before = (await guestRows(invA)).length;
    const res = await scan(asStaff(invA, buildCheckinPayload(invB, "Orang Acara Lain")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/bukan milik acara ini/i);
    expect(await guestRows(invA)).toHaveLength(before);
    expect((await guestRows(invB)).find((g) => g.name === "Orang Acara Lain")).toBeUndefined();
  });

  it("QR tanpa nama ditolak", async () => {
    const res = await scan(asStaff(invA, `LUX|${invA}|`));
    expect(res.status).toBe(400);
  });

  it("dua perangkat memindai nama baru yang sama bersamaan: hanya satu baris dibuat", async () => {
    const payload = buildCheckinPayload(invA, "Balapan Dua Perangkat");
    const [r1, r2] = await Promise.all([scan(asStaff(invA, payload)), scan(asStaff(invA, payload))]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect((await guestRows(invA)).filter((g) => g.name === "Balapan Dua Perangkat")).toHaveLength(1);
  });

  it("nama yang menghasilkan slug sama tetap menjadi dua tamu terpisah", async () => {
    const r1 = await scan(asStaff(invA, buildCheckinPayload(invA, "Siti!")));
    const r2 = await scan(asStaff(invA, buildCheckinPayload(invA, "Siti?")));
    expect([r1.status, r2.status]).toEqual([200, 200]);
    const rows = (await guestRows(invA)).filter((g) => g.name === "Siti!" || g.name === "Siti?");
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.slug)).size).toBe(2);
  });

  it("nama non-Latin (slug kosong) tetap dapat dicatat", async () => {
    const r1 = await scan(asStaff(invA, buildCheckinPayload(invA, "田中")));
    const r2 = await scan(asStaff(invA, buildCheckinPayload(invA, "山田")));
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect((await guestRows(invA)).filter((g) => g.name === "田中" || g.name === "山田")).toHaveLength(2);
  });

  it("jalur token lama (qrToken tamu terdaftar): validasi, check-in, lalu ditolak karena sudah dipakai; terbatas pada undangannya", async () => {
    const token = `${TAG}-token-budi`;
    await prisma.guest.create({ data: { invitationId: invA, name: "Budi Token", slug: "budi-token", category: "KELUARGA", qrToken: token } });

    const validate = await scan(asStaff(invA, token, false));
    expect(validate.status).toBe(200);
    expect((await validate.json()).guest.name).toBe("Budi Token");

    const checkIn = await scan(asStaff(invA, token, true));
    expect(checkIn.status).toBe(200);
    expect((await prisma.guest.findFirst({ where: { invitationId: invA, name: "Budi Token" } }))?.isTokenRedeemed).toBe(true);

    const reuse = await scan(asStaff(invA, token, false));
    expect(reuse.status).toBe(400);
    expect((await reuse.json()).error).toMatch(/sudah pernah digunakan/i);

    const wrongEvent = await scan(asStaff(invB, registeredQr));
    expect(wrongEvent.status).toBe(400);
    expect((await wrongEvent.json()).error).toMatch(/bukan milik acara ini/i);
  });

  it("tanpa sesi resepsionis yang sah: 401", async () => {
    const res = await scan({ qrToken: buildCheckinPayload(invA, "Siapa Saja"), invitationId: invA, isCheckIn: true, token: "rcpt_palsu" });
    expect(res.status).toBe(401);
    expect((await guestRows(invA)).find((g) => g.name === "Siapa Saja")).toBeUndefined();
  });
});

describe.skipIf(!IS_TEST_DB)("gambar QR publik dengan inisial", () => {
  it("menyisipkan inisial 1-2 karakter dan membersihkan masukan", async () => {
    await pool.query("DELETE FROM rate_limit_counters WHERE key LIKE 'qr:%'");
    const ok = await qrGet(new NextRequest("http://localhost/api/public/qr?size=160&mark=rd&data=halo"));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toContain("image/svg+xml");
    const svg = await ok.text();
    expect(svg).toContain(">RD</text>");

    const dirty = await (await qrGet(new NextRequest("http://localhost/api/public/qr?mark=%3Cscript%3E&data=halo"))).text();
    expect(dirty).not.toContain("<script");

    const noData = await qrGet(new NextRequest("http://localhost/api/public/qr?mark=RD"));
    expect(noData.status).toBe(400);
  });
});

describe.skipIf(!IS_TEST_DB)("undangan pernikahan membuat QR check-in berformat LUX", () => {
  let ownerId2 = "";
  let invId = "";

  beforeAll(async () => {
    const owner = await prisma.user.create({ data: { email: `${TAG}-render@t.local`, name: TAG } });
    ownerId2 = owner.id;
    const inv = await prisma.invitation.create({
      data: {
        userId: owner.id,
        invitationSlug: `${TAG}-render`,
        groomSlug: `${TAG}-gr`,
        brideSlug: `${TAG}-br`,
        groomName: "Raka Putra",
        groomNickname: "Raka",
        brideName: "Dewi Ayu",
        brideNickname: "Dewi",
        status: "PUBLISHED",
        themeId: "kalandra",
      },
    });
    invId = inv.id;
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { id: invId } });
    await prisma.user.deleteMany({ where: { id: ownerId2 } });
  });

  it("awalan QR memuat id undangan dan inisial kedua mempelai; gambar bawaan sudah berformat LUX", async () => {
    const data = (await composeTemplateData(invId))!;
    const prefix = `/api/public/qr?size=160&mark=RD&data=${encodeURIComponent(`LUX|${invId}|`)}`;
    expect(data.qrCheckinBaseUrl).toBe(prefix);

    const html = await renderTemplateFile("kalandra", data, { editMode: false });
    expect(html).toContain(`CHECKIN_QR_BASE = '${prefix}'`);
    expect(html).toContain(`src="${prefix.replace(/&/g, "&amp;")}Tamu%20Undangan"`);
    expect(html).not.toContain("data=Tamu%20Undangan");
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});
