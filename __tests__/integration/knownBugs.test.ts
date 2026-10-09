/**
 * Regresi bug yang terbukti pada audit kode 6 Okt 2026 dan diperbaiki 8 Okt 2026. Tes berawalan "kontrol:"
 * membuktikan sisa jalurnya sehat, sehingga kegagalan di tes lain memang milik bug yang dijaga.
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: { id: string; email: string; role: string; isAdmin: boolean; permissions: string[] } | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import { prisma, pool } from "@/lib/prisma";
import { DELETE as memoriesDelete, PATCH as memoriesPatch } from "@/app/api/client/invitations/[id]/memories/route";
import { POST as customDomainPost } from "@/app/api/client/custom-domain/route";
import { POST as createPost } from "@/app/api/client/invitations/create/route";
import { PUT as invitationPut } from "@/app/api/client/invitations/[id]/route";
import { POST as guestsPost } from "@/app/api/client/guests/route";
import { POST as guestsBulkPost } from "@/app/api/client/guests/bulk/route";
import { PUT as guestPut, DELETE as guestDelete } from "@/app/api/client/guests/[id]/route";
import { composeTemplateData } from "@/lib/themeEngine";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest_kb_${Date.now()}`;

const users: string[] = [];
const invitations: string[] = [];
const orders: string[] = [];

async function makeClient(suffix: string, planType: "TIER_2" | "TIER_3", withInvitation: boolean) {
  const user = await prisma.user.create({ data: { email: `${TAG}-${suffix}@t.local`, name: `${TAG} ${suffix}` } });
  users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${TAG}-${suffix}`, planType, amount: 100000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  orders.push(order.id);
  let invitationId = "";
  if (withInvitation) {
    const inv = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: order.id,
        invitationSlug: `${TAG}-${suffix}`,
        groomSlug: `${TAG}-g${suffix}`,
        brideSlug: `${TAG}-b${suffix}`,
        groomName: "Raka",
        brideName: "Dewi",
        status: "PUBLISHED",
        featureSettings: JSON.stringify({ showGuestMemories: true }),
      },
    });
    invitations.push(inv.id);
    invitationId = inv.id;
  }
  sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, permissions: [] };
  return { userId: user.id, invitationId, orderId: order.id };
}

const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const storedFs = async (id: string) => JSON.parse((await prisma.invitation.findUniqueOrThrow({ where: { id } })).featureSettings || "{}");

describe.skipIf(!IS_TEST_DB)("bug terbukti: pengaturan dan penghapusan momen tamu", () => {
  let invId = "";

  beforeAll(async () => {
    invId = (await makeClient("mem", "TIER_3", true)).invitationId;
  });

  const addMemory = (suffix: string) =>
    prisma.guestMemory.create({ data: { invitationId: invId, senderName: "Tamu", senderEmail: `tok-${suffix}`, mediaUrl: "/uploads/guest-memories/x.png" } });

  it("kontrol: DELETE dengan memoryId di query string berfungsi", async () => {
    const memory = await addMemory("query");
    const res = await memoriesDelete(json(`/api/client/invitations/${invId}/memories?memoryId=${memory.id}`, "DELETE"), ctx(invId));
    expect(res.status).toBe(200);
    expect(await prisma.guestMemory.findUnique({ where: { id: memory.id } })).toBeNull();
  });

  // Dashboard Momen memanggil DELETE dengan { memoryId } di BODY (moments/page.tsx), sedangkan rute hanya membaca query string.
  it("DELETE dengan memoryId di body JSON (cara dashboard memanggil) menghapus foto", async () => {
    const memory = await addMemory("body");
    const res = await memoriesDelete(json(`/api/client/invitations/${invId}/memories`, "DELETE", { memoryId: memory.id }), ctx(invId));
    expect(res.status).toBe(200);
    expect(await prisma.guestMemory.findUnique({ where: { id: memory.id } })).toBeNull();
  });

  it("kontrol: filter yang sah diterima dan jatah roll dalam rentang tersimpan", async () => {
    const res = await memoriesPatch(json(`/api/client/invitations/${invId}/memories`, "PATCH", { memoriesFilter: "cinema_noir", memoriesShotsQuota: 7 }), ctx(invId));
    expect(res.status).toBe(200);
    expect(await storedFs(invId)).toMatchObject({ memoriesFilter: "cinema_noir", memoriesShotsQuota: 7 });
  });

  // Validasi hanya memeriksa nilai yang sah; kunci yang sama ada di `allowedFields`, sehingga nilai tidak sah tetap tersalin.
  it("filter kamera yang tidak dikenal tidak boleh tersimpan", async () => {
    await memoriesPatch(json(`/api/client/invitations/${invId}/memories`, "PATCH", { memoriesFilter: "filter_palsu" }), ctx(invId));
    expect((await storedFs(invId)).memoriesFilter).not.toBe("filter_palsu");
  });

  it("jatah roll per tamu di luar 1-30 tidak boleh tersimpan lewat kunci memoriesShotsQuota", async () => {
    await memoriesPatch(json(`/api/client/invitations/${invId}/memories`, "PATCH", { memoriesShotsQuota: 9999 }), ctx(invId));
    const stored = (await storedFs(invId)).memoriesShotsQuota;
    expect(stored).toBeLessThanOrEqual(30);
  });

  it("jatah roll di luar rentang tidak dijawab sukses seolah-olah tersimpan", async () => {
    const res = await memoriesPatch(json(`/api/client/invitations/${invId}/memories`, "PATCH", { shotsQuota: 31 }), ctx(invId));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.success).not.toBe(true);
  });

  afterAll(async () => {
    await prisma.guestMemory.deleteMany({ where: { invitationId: invId } });
  });
});

describe.skipIf(!IS_TEST_DB)("bug terbukti: custom domain tanpa verifikasi kepemilikan", () => {
  let invId = "";
  let previousSetting: string | null = null;

  beforeAll(async () => {
    // Fitur custom domain dimatikan di DB uji; dinyalakan sementara agar yang diuji adalah rute, bukan sakelarnya.
    previousSetting = (await prisma.adminSetting.findUnique({ where: { key: "custom_domain_enabled" } }))?.value ?? null;
    await prisma.adminSetting.upsert({ where: { key: "custom_domain_enabled" }, update: { value: "true" }, create: { key: "custom_domain_enabled", value: "true" } });
    invId = (await makeClient("dom", "TIER_3", true)).invitationId;
  });

  afterAll(async () => {
    if (previousSetting === null) await prisma.adminSetting.deleteMany({ where: { key: "custom_domain_enabled" } });
    else await prisma.adminSetting.update({ where: { key: "custom_domain_enabled" }, data: { value: previousSetting } });
  });

  it("kontrol: domain dengan format tidak valid ditolak (400)", async () => {
    const res = await customDomainPost(json("/api/client/custom-domain", "POST", { invitationId: invId, customDomain: "tanpatitik" }));
    expect(res.status).toBe(400);
  });

  it("kontrol: domain platform sendiri ditolak (400)", async () => {
    const res = await customDomainPost(json("/api/client/custom-domain", "POST", { invitationId: invId, customDomain: "foo.localhost" }));
    expect(res.status).toBe(400);
  });

  // Rute menyimpan domain apa pun yang unik; tidak ada pemeriksaan DNS/TXT. Rute `ask` Caddy (resolve-custom-domain)
  // lalu menyetujui penerbitan sertifikat untuk domain itu.
  it("domain milik pihak lain tidak dapat ditautkan tanpa bukti kepemilikan", async () => {
    const res = await customDomainPost(json("/api/client/custom-domain", "POST", { invitationId: invId, customDomain: "bank-milik-orang-lain.co.id" }));
    expect(res.status).not.toBe(200);
  });
});

describe.skipIf(!IS_TEST_DB)("bug terbukti: tanggal acara lampau mengunci draf tanpa jalan keluar", () => {
  let invitationId = "";

  beforeAll(async () => {
    await makeClient("past", "TIER_2", false);
    const created = await createPost(
      json("/api/client/invitations/create", "POST", {
        eventType: "WEDDING",
        groomNickname: "Raka",
        brideNickname: "Dewi",
        weddingDate: "2020-01-01",
        city: "Makassar",
        timeZone: "WITA",
        themeId: "kalandra",
      })
    );
    if (created.status === 200) {
      invitationId = (await created.json()).invitationId;
      invitations.push(invitationId);
    }
  });

  const correctDate = () =>
    invitationPut(
      json(`/api/client/invitations/${invitationId}`, "PUT", {
        eventData: [{ title: "Akad Nikah", date: "2099-01-01", time: "08:00 WITA", location: "Gedung", address: "Jl. Contoh", isPrimary: true }],
      }),
      ctx(invitationId)
    );

  it("kontrol: draf dengan tanggal lampau dapat dibuat (tidak ada validasi tanggal)", async () => {
    expect(invitationId).not.toBe("");
    const row = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } });
    expect(row.status).toBe("DRAFT");
    expect(JSON.parse(row.eventData || "[]")[0].date).toBe("2020-01-01");
  });

  it("kontrol: keadaan terkunci memang karena tanggal lampau (bukan karena sebab lain)", async () => {
    const row = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } });
    expect(row.isLockedPermanently).toBe(false);
    expect(row.adminUnlockedUntil).toBeNull();
    expect(row.status).toBe("DRAFT");
  });

  it("draf bertanggal lampau tidak dapat diterbitkan sebelum tanggalnya diperbaiki", async () => {
    const res = await invitationPut(json(`/api/client/invitations/${invitationId}`, "PUT", { status: "PUBLISHED" }), ctx(invitationId));
    expect(res.status).toBe(400);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } })).status).toBe("DRAFT");
  });

  it("setelah salah ketik tahun, klien dapat memperbaiki tanggal acara draf", async () => {
    const res = await correctDate();
    expect(res.status).toBe(200);
  });
});

describe.skipIf(!IS_TEST_DB)("jadwal terima tamu (sesi isPrimary) sebagai patokan undangan", () => {
  it("draf tanpa tanggal jadwal terima tamu tidak dapat diterbitkan", async () => {
    const { userId } = await makeClient("noday", "TIER_2", false);
    const draft = await prisma.invitation.create({
      data: {
        userId,
        invitationSlug: `${TAG}-noday`,
        groomSlug: `${TAG}-gnoday`,
        brideSlug: `${TAG}-bnoday`,
        status: "DRAFT",
        eventData: JSON.stringify([{ title: "Akad Nikah", date: "2099-03-01" }, { title: "Resepsi", date: "", isPrimary: true }]),
      },
    });
    invitations.push(draft.id);
    const res = await invitationPut(json(`/api/client/invitations/${draft.id}`, "PUT", { status: "PUBLISHED" }), ctx(draft.id));
    expect(res.status).toBe(400);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("DRAFT");
  });

  it("setelah terbit, jadwal tidak dapat dikosongkan walau kunci darurat dibuka; sesi lain tetap bisa ditambah", async () => {
    const { invitationId } = await makeClient("locked", "TIER_2", true);
    const schedule = [
      { title: "Mappacci", date: "2099-03-01", time: "19:00 WITA", location: "Rumah", address: "Jl. A" },
      { title: "Resepsi", date: "2099-03-02", time: "11:00 WITA", location: "Gedung", address: "Jl. B", isPrimary: true },
    ];
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { eventData: JSON.stringify(schedule), adminUnlockedUntil: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const emptied = await invitationPut(json(`/api/client/invitations/${invitationId}`, "PUT", { eventData: [] }), ctx(invitationId));
    expect(emptied.status).toBe(403);

    const added = await invitationPut(
      json(`/api/client/invitations/${invitationId}`, "PUT", {
        eventData: [...schedule, { title: "Mappenre Botting", date: "2099-03-02", time: "08:00 WITA", location: "Gedung", address: "Jl. B" }],
      }),
      ctx(invitationId)
    );
    expect(added.status).toBe(200);
    const saved: Array<{ title: string; isPrimary: boolean }> = JSON.parse(
      (await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } })).eventData || "[]"
    );
    expect(saved.filter((e) => e.isPrimary).map((e) => e.title)).toEqual(["Resepsi"]);
  });

  it("ulang tahun dan khitan menampilkan tanggal dari jadwal terima tamu, bukan sesi pertama", async () => {
    const { userId } = await makeClient("compose", "TIER_2", false);
    for (const eventType of ["BIRTHDAY", "KHITAN"] as const) {
      const inv = await prisma.invitation.create({
        data: {
          userId,
          eventType,
          invitationSlug: `${TAG}-c${eventType.toLowerCase()}`,
          groomSlug: `${TAG}-gc${eventType.toLowerCase()}`,
          brideSlug: `${TAG}-bc${eventType.toLowerCase()}`,
          status: "DRAFT",
          eventData: JSON.stringify([
            { title: "Pengajian", date: "2099-01-05", startTime: "08:00" },
            { title: "Syukuran", date: "2099-02-10", startTime: "10:00", isPrimary: true },
          ]),
        },
      });
      invitations.push(inv.id);
      const data: any = await composeTemplateData(inv.id);
      expect(data.eventDateFormatted, eventType).toMatch(/10 Februari 2099/);
      if (eventType === "BIRTHDAY") expect(data.targetDate).toMatch(/^2099-02-10T10:00/);
    }
  });
});

describe.skipIf(!IS_TEST_DB)("bug terbukti: jenis acara draf dapat diganti lewat API setelah dibuat", () => {
  let invitationId = "";
  let resubmitStatus = 0;

  beforeAll(async () => {
    await makeClient("evt", "TIER_2", false);
    const first = await createPost(
      json("/api/client/invitations/create", "POST", { eventType: "WEDDING", groomNickname: "Raka", brideNickname: "Dewi", weddingDate: "2099-01-01", city: "Makassar", themeId: "kalandra" })
    );
    if (first.status === 200) {
      invitationId = (await first.json()).invitationId;
      invitations.push(invitationId);
    }
    const second = await createPost(
      json("/api/client/invitations/create", "POST", {
        eventType: "BIRTHDAY",
        participantsJson: JSON.stringify({ person: { name: "Rani", nickname: "Rani", age: 7 } }),
        weddingDate: "2099-01-01",
        city: "Makassar",
      })
    );
    resubmitStatus = second.status;
  });

  it("draf pernikahan berhasil dibuat dan pengiriman ulang dengan jenis acara lain ditolak 409", async () => {
    expect(invitationId).not.toBe("");
    expect(resubmitStatus).toBe(409);
  });

  it("jenis acara draf tetap WEDDING setelah pengiriman ulang dengan BIRTHDAY", async () => {
    const row = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } });
    expect(row.eventType).toBe("WEDDING");
  });
});

describe.skipIf(!IS_TEST_DB)("bug terbukti: buku tamu klien", () => {
  let invId = "";
  let birthdayInvId = "";

  beforeAll(async () => {
    invId = (await makeClient("guest", "TIER_2", true)).invitationId;
    const birthday = await prisma.invitation.create({
      data: {
        userId: sessionUser!.id,
        invitationSlug: `${TAG}-bday`,
        groomSlug: `${TAG}-gbday`,
        brideSlug: `${TAG}-bbday`,
        eventType: "BIRTHDAY",
        status: "DRAFT",
      },
    });
    birthdayInvId = birthday.id;
    invitations.push(birthday.id);
  });

  const addGuest = (name: string) =>
    guestsPost(json("/api/client/guests", "POST", { invitationId: invId, name }));
  const bulk = (guests: Array<Record<string, unknown>>, invitationId = invId) =>
    guestsBulkPost(json("/api/client/guests/bulk", "POST", { invitationId, guests }));
  const guestCount = (name: string, invitationId = invId) => prisma.guest.count({ where: { invitationId, name } });

  it("kontrol: nama yang persis sama ditolak saat menambah tamu", async () => {
    expect((await addGuest("Budi Kontrol")).status).toBe(200);
    expect((await addGuest("Budi Kontrol")).status).toBe(400);
  });

  // QR, RSVP, dan resepsionis mencocokkan nama TANPA membedakan huruf besar/kecil, sedangkan POST membandingkan persis.
  it("nama yang hanya beda huruf besar/kecil ditolak sebagai duplikat", async () => {
    expect((await addGuest("Siti Huruf")).status).toBe(200);
    expect((await addGuest("siti huruf")).status).toBe(400);
  });

  it("mengganti nama tamu menjadi nama tamu lain ditolak", async () => {
    const a = await (await addGuest("Tamu Satu")).json();
    const b = await (await addGuest("Tamu Dua")).json();
    expect(a.id).toBeTruthy();
    const res = await guestPut(json(`/api/client/guests/${b.id}`, "PUT", { name: "Tamu Satu" }), ctx(b.id));
    expect(res.status).toBe(400);
  });

  it("impor massal menolak atau melewati nama kembar (di dalam berkas maupun yang sudah ada)", async () => {
    await bulk([{ name: "Kembar Impor" }, { name: "Kembar Impor" }]);
    expect(await guestCount("Kembar Impor")).toBe(1);
  });

  it("tamu yang sudah check-in tidak dapat dihapus (catatan kehadiran terhapus)", async () => {
    const created = await (await addGuest("Sudah Hadir")).json();
    await prisma.guest.update({ where: { id: created.id }, data: { isTokenRedeemed: true } });
    const res = await guestDelete(json(`/api/client/guests/${created.id}`, "DELETE"), ctx(created.id));
    expect(res.status).not.toBe(200);
  });

  it("kontrol: impor massal untuk undangan pernikahan memakai sesi 'Akad & Resepsi'", async () => {
    await bulk([{ name: "Tamu Nikah Impor" }]);
    const row = await prisma.guest.findFirstOrThrow({ where: { invitationId: invId, name: "Tamu Nikah Impor" } });
    expect(row.sessionInfo).toBe("Akad & Resepsi");
  });

  it("impor massal untuk acara ulang tahun tidak memberi sesi 'Akad & Resepsi'", async () => {
    await bulk([{ name: "Tamu Ulang Tahun" }], birthdayInvId);
    const row = await prisma.guest.findFirstOrThrow({ where: { invitationId: birthdayInvId, name: "Tamu Ulang Tahun" } });
    expect(row.sessionInfo).not.toBe("Akad & Resepsi");
  });

  afterAll(async () => {
    await prisma.guest.deleteMany({ where: { invitationId: { in: [invId, birthdayInvId] } } });
  });
});

// Ditemukan saat simulasi klien 9 Okt 2026: PIN "12" tersimpan dan ditampilkan sebagai PIN aktif.
describe.skipIf(!IS_TEST_DB)("bug terbukti: PIN resepsionis tanpa batas panjang", () => {
  let invId = "";

  beforeAll(async () => {
    invId = (await makeClient("pin", "TIER_2", true)).invitationId;
    // PIN diatur sebelum terbit; undangan terbit menolak semua PUT klien (studio terkunci).
    await prisma.invitation.update({ where: { id: invId }, data: { status: "DRAFT" } });
  });

  const putPin = (staffPin: string) => invitationPut(json(`/api/client/invitations/${invId}`, "PUT", { staffPin }), ctx(invId));

  it("PIN 2 karakter ditolak dan tidak tersimpan", async () => {
    const res = await putPin("12");
    expect(res.status).toBe(400);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invId } })).staffPin).toBeNull();
  });

  it("nilai berformat ciphertext tidak disimpan mentah", async () => {
    const res = await putPin(`${"a".repeat(32)}:${"b".repeat(32)}:cc`);
    expect(res.status).toBe(400);
  });

  it("kontrol: PIN 6 karakter tersimpan terenkripsi dan dikembalikan sebagai teks biasa", async () => {
    const res = await putPin("ab12cd");
    expect(res.status).toBe(200);
    expect((await res.json()).staffPin).toBe("ab12cd");
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invId } })).staffPin).not.toBe("ab12cd");
  });
});

describe.skipIf(!IS_TEST_DB)("nama tokoh utama acara non-pernikahan", () => {
  it("menyimpan participantsJson dari studio ikut memperbarui kolom groom* yang dibaca audit terbit", async () => {
    const { userId } = await makeClient("khitan", "TIER_2", false);
    const draft = await prisma.invitation.create({
      data: { userId, eventType: "KHITAN", invitationSlug: `${TAG}-khitan`, groomSlug: `${TAG}-gkhitan`, brideSlug: "khitan", status: "DRAFT" },
    });
    invitations.push(draft.id);
    const participantsJson = JSON.stringify({ child: { name: "Muhammad Fatih", nickname: "Fatih" }, parents: { father: "Hasan", mother: "Aminah" } });
    const res = await invitationPut(json(`/api/client/invitations/${draft.id}`, "PUT", { participantsJson }), ctx(draft.id));
    expect(res.status).toBe(200);
    const row = await prisma.invitation.findUniqueOrThrow({ where: { id: draft.id } });
    expect([row.groomName, row.groomNickname, row.groomFather, row.groomMother]).toEqual(["Muhammad Fatih", "Fatih", "Hasan", "Aminah"]);
  });
});

afterAll(async () => {
  await prisma.guestMemory.deleteMany({ where: { invitationId: { in: invitations } } });
  await prisma.invitation.deleteMany({ where: { id: { in: invitations } } });
  await prisma.order.deleteMany({ where: { id: { in: orders } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
  await pool.end();
});
