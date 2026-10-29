/**
 * Uji go-live ujung ke ujung lewat HTTP terhadap server yang sedang berjalan (build produksi lokal, staging, atau
 * produksi): klien memesan dan mengirim bukti transfer, admin menyetujui, klien membuat undangan, mengunggah media,
 * menerbitkan, menambah tamu; tamu membuka link personal (subdomain), tercatat sebagai kunjungan, mengisi RSVP;
 * resepsionis masuk dengan PIN dan check-in QR; tamu mengunggah foto momen; klien mengekspor tamu.
 *
 * Dijalankan di mesin server (butuh DATABASE_URL dan AUTH_SECRET yang sama dengan aplikasi): login klien hanya lewat
 * Google, jadi skrip membuat satu pengguna uji dan menerbitkan sesinya. Semua data bertanda e2e-golive-<waktu> dan
 * dihapus per id di akhir, juga bila ada langkah yang gagal.
 *
 *   E2E_ADMIN=<username admin> E2E_ADMIN_PASSWORD=<password> APP_URL=http://localhost:3001 \
 *     npx tsx scripts/e2e-golive.ts [--allow-production] [--payment=manual]
 * Tanpa --allow-production skrip hanya mau berjalan pada database luxenary_test. Pembayaran mengikuti payment_mode
 * platform; mode GATEWAY menguji checkout gateway lalu melunasi order uji lewat fungsi webhook (dilaporkan sebagai
 * simulasi). --payment=manual (khusus database uji) menguji jalur bukti transfer + persetujuan admin.
 * Keluar dengan kode 1 bila ada GAGAL.
 */
import "dotenv/config";
import http from "http";
import { encode } from "next-auth/jwt";
import sharp from "sharp";
import { prisma, pool } from "../lib/prisma";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { deleteFile, s3Client } from "../lib/storage";
import { removeInvitationFiles } from "../lib/invitationFiles";
import { settleOrderAsPaid } from "../lib/paymentSettlement";
import { applyUpgradePlan } from "../lib/upgradeHelper";

const APP_URL = (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || new URL(APP_URL).host).replace(/^https?:\/\//, "");
const TAG = `e2e-golive-${Date.now()}`;
const GUEST = "Bapak Uji Golive";
// Skrip membaca .env yang sama dengan server, jadi penyedia penyimpanannya sama.
const USES_BUCKET = process.env.STORAGE_PROVIDER === "r2" || process.env.STORAGE_PROVIDER === "s3";
const results: Array<{ name: string; ok: boolean; detail: string }> = [];
const record = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "LULUS" : "GAGAL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

// Cookie sesi Auth.js berawalan __Secure- di HTTPS, dan nama cookie juga menjadi salt enkripsi JWT.
const SESSION_COOKIE = APP_URL.startsWith("https://") ? "__Secure-authjs.session-token" : "authjs.session-token";

type Res = { status: number; text: string; json: any; headers: Headers };
async function call(path: string, init: RequestInit & { cookie?: string } = {}): Promise<Res> {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  const res = await fetch(`${APP_URL}${path}`, { ...init, headers, redirect: "manual" });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Bukan JSON (HTML atau CSV): pemanggil membaca text.
  }
  return { status: res.status, text, json, headers: res.headers };
}

/** GET ke host subdomain undangan. Lokal: header Host ke server yang sama (*.localhost tidak selalu ter-resolve). */
async function getOnSubdomain(subdomain: string, path: string): Promise<{ status: number; text: string }> {
  const url = new URL(APP_URL);
  const host = `${subdomain}.${ROOT_DOMAIN}`;
  if (url.protocol === "https:") {
    const res = await fetch(`https://${host}${path}`, { redirect: "manual" });
    return { status: res.status, text: await res.text() };
  }
  return new Promise((resolve, reject) => {
    const req = http.request({ host: url.hostname, port: url.port || 80, path, headers: { Host: host } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode || 0, text: body }));
    });
    req.on("error", reject);
    req.end();
  });
}

const jsonBody = (body: unknown, cookie?: string): RequestInit & { cookie?: string } => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
  cookie,
});

async function adminCookie(): Promise<string> {
  const user = process.env.E2E_ADMIN;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!user || !password) throw new Error("E2E_ADMIN dan E2E_ADMIN_PASSWORD wajib diisi.");
  const csrf = await fetch(`${APP_URL}/api/auth/csrf`);
  // Respons CSRF dapat memuat cookie bernama sama dua kali; seperti peramban, nilai terakhir yang berlaku.
  const csrfCookies = [...new Map(csrf.headers.getSetCookie().map((c) => c.split(";")[0]).map((c) => [c.split("=")[0], c] as const)).values()];
  const { csrfToken } = await csrf.json();
  const login = await fetch(`${APP_URL}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: csrfCookies.join("; ") },
    body: new URLSearchParams({ csrfToken, email: user, password, portal: "ADMIN" }),
  });
  const session = login.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!session) throw new Error(`Login admin gagal (HTTP ${login.status}).`);
  return session;
}

async function main() {
  const dbName = new URL(process.env.DATABASE_URL || "postgresql://x/none").pathname.slice(1);
  if (dbName !== "luxenary_test" && !process.argv.includes("--allow-production")) {
    throw new Error(`Database ${dbName} bukan luxenary_test. Tambahkan --allow-production untuk staging/produksi.`);
  }
  // --payment=manual di database uji: mode pembayaran sementara diubah ke MANUAL dan dikembalikan di akhir. Di
  // staging/produksi mode platform tidak pernah diubah skrip.
  const savedMode = (await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } }))?.value ?? "MANUAL";
  const forceManual = process.argv.includes("--payment=manual");
  if (forceManual && dbName !== "luxenary_test") throw new Error("--payment=manual hanya untuk database luxenary_test.");
  if (forceManual) await prisma.adminSetting.update({ where: { key: "payment_mode" }, data: { value: "MANUAL" } });
  const paymentMode = forceManual ? "MANUAL" : savedMode;
  console.log(`Uji go-live: ${APP_URL} | domain akar ${ROOT_DOMAIN} | DB ${dbName} | pembayaran ${paymentMode} | tanda ${TAG}\n`);

  const created = { userId: "", orderId: "", invitationId: "" };
  try {
    const health = await call("/api/health");
    record("Server sehat", health.status === 200, `HTTP ${health.status}`);

    // 1. Klien terdaftar (pengganti login Google) dan sesinya.
    const user = await prisma.user.create({ data: { email: `${TAG}@uji.test`, name: "Klien Uji Golive" } });
    created.userId = user.id;
    const token = await encode({
      token: { id: user.id, sub: user.id, email: user.email, name: user.name, role: "CLIENT", isAdmin: false, permissions: [] },
      secret: process.env.AUTH_SECRET as string,
      salt: SESSION_COOKIE,
    });
    const client = `${SESSION_COOKIE}=${token}`;
    const me = await call("/api/auth/session", { cookie: client });
    record("Sesi klien aktif", me.json?.user?.email === user.email, me.json?.user?.email ?? `HTTP ${me.status}`);

    // 2. Pesan paket dan kirim bukti transfer.
    const order = await call("/api/orders/create", jsonBody({ planType: "TIER_3", buyerName: "Klien Uji Golive", buyerPhone: "081234567890" }, client));
    created.orderId = order.json?.orderId ?? "";
    record("Klien membuat pesanan", order.status === 200 && Boolean(created.orderId), `HTTP ${order.status} ${order.json?.error ?? ""}`);

    // 3. Pembayaran mengikuti mode platform: transfer manual (bukti + persetujuan admin) atau payment gateway.
    const admin = await adminCookie();
    if (paymentMode === "MANUAL") {
      const proofPng = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 30, g: 120, b: 80 } } }).png().toBuffer();
      const proofForm = new FormData();
      proofForm.append("file", new File([new Uint8Array(proofPng)], "bukti.png", { type: "image/png" }));
      const proof = await call(`/api/client/orders/${created.orderId}/upload-proof`, { method: "POST", body: proofForm, cookie: client });
      record("Klien mengunggah bukti transfer", proof.status === 200, `HTTP ${proof.status} ${proof.json?.error ?? ""}`);
      const approve = await call(`/api/admin/orders/${created.orderId}/approve`, { method: "POST", cookie: admin });
      record("Admin menyetujui pembayaran", approve.json?.success === true, approve.json?.message ?? approve.json?.error ?? `HTTP ${approve.status}`);
    } else {
      const checkout = await call("/api/payments/checkout", jsonBody({ orderId: created.orderId, customerName: "Klien Uji Golive", customerPhone: "081234567890" }, client));
      record("Checkout gateway membuat tagihan", checkout.status === 200 && Boolean(checkout.json?.qrString || checkout.json?.checkoutUrl), `HTTP ${checkout.status} ${checkout.json?.error ?? ""}`);
      // Pembayaran gateway sungguhan tidak bisa dilakukan skrip; order uji ini dilunasi lewat fungsi yang sama dengan
      // webhook Midtrans (settleOrderAsPaid + applyUpgradePlan), dan dilaporkan sebagai simulasi.
      const settled = await settleOrderAsPaid(created.orderId, { paymentMethod: "GATEWAY" });
      if (settled) await applyUpgradePlan(created.orderId);
      record("Pelunasan (simulasi webhook gateway)", settled);
    }
    const status = await call(`/api/client/orders/${created.orderId}/status`, { cookie: client });
    record("Status pesanan PAID di sisi klien", status.json?.status === "PAID", String(status.json?.status));

    // 4. Undangan: buat, unggah media, isi jadwal dan vendor, terbitkan.
    const subdomain = TAG.slice(-20).replace(/[^a-z0-9-]/g, "");
    const inv = await call("/api/client/invitations/create", jsonBody({
      eventType: "WEDDING",
      themeId: "kalandra",
      participantsJson: { groom: { name: "Raka Golive" }, bride: { name: "Dewi Golive" } },
      subdomain,
    }, client));
    created.invitationId = inv.json?.invitationId ?? "";
    record("Klien membuat undangan", inv.status === 200 && Boolean(created.invitationId), `HTTP ${inv.status} ${inv.json?.error ?? ""}`);

    const cover = await sharp({ create: { width: 900, height: 1600, channels: 3, background: { r: 200, g: 170, b: 140 } } }).jpeg().toBuffer();
    const coverForm = new FormData();
    coverForm.append("file", new File([new Uint8Array(cover)], "sampul.jpg", { type: "image/jpeg" }));
    coverForm.append("invitationId", created.invitationId);
    coverForm.append("slot", "LANDING_COVER");
    const upload = await call("/api/client/upload", { method: "POST", body: coverForm, cookie: client });
    record("Klien mengunggah foto sampul", upload.json?.success === true, `${upload.json?.sizeBytes ?? "-"} byte, ${upload.json?.error ?? upload.json?.url?.split("?")[0] ?? ""}`);

    // QRIS amplop saat draf: tersimpan di featureSettings, bukan di tabel media.
    const qris = await sharp({ create: { width: 600, height: 600, channels: 3, background: { r: 250, g: 250, b: 250 } } }).png().toBuffer();
    const qrisForm = new FormData();
    qrisForm.append("file", new File([new Uint8Array(qris)], "qris.png", { type: "image/png" }));
    qrisForm.append("invitationId", created.invitationId);
    qrisForm.append("slot", "QRIS");
    const qrisUpload = await call("/api/client/upload", { method: "POST", body: qrisForm, cookie: client });
    record("Klien mengunggah QRIS amplop", qrisUpload.json?.success === true, qrisUpload.json?.url?.split("?")[0] ?? qrisUpload.json?.error ?? "");

    // Acara utama besok: daftar tamu dikunci pada hari acara. Kamera momen dibuka hari ini lewat sesi kamera kustom
    // (memoriesSessions), agar unggahan tamu teruji tanpa menunggu hari acara.
    const wita = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(d);
    const today = wita(new Date());
    const eventDay = wita(new Date(Date.now() + 86_400_000));
    const publish = await call(`/api/client/invitations/${created.invitationId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      cookie: client,
      body: JSON.stringify({
        subdomain,
        media: { LANDING_COVER: upload.json?.url },
        eventData: [{ title: "Resepsi", date: eventDay, startTime: "10:00", endTime: "14:00", timezone: "WITA", location: "Gedung Uji Golive", address: "Jl. Uji No. 1, Makassar", isPrimary: true }],
        featureSettings: {
          qrisImageUrl: qrisUpload.json?.url,
          showGift: true,
          vendors: [{ name: "Studio Foto Golive", category: "Fotografi" }],
          memoriesSessions: [{ id: "golive", name: "Sesi Uji", date: today, startTime: "00:00", endTime: "23:59", timezone: "WITA" }],
        },
        status: "PUBLISHED",
      }),
    });
    record("Klien menerbitkan undangan", publish.status === 200, `HTTP ${publish.status} ${publish.json?.error ?? ""}`);

    // Setelah terbit Studio terkunci: unggahan media tidak boleh menimpa berkas yang sedang tampil.
    const lockedForm = new FormData();
    lockedForm.append("file", new File([new Uint8Array(qris)], "qris.png", { type: "image/png" }));
    lockedForm.append("invitationId", created.invitationId);
    lockedForm.append("slot", "QRIS");
    const lockedUpload = await call("/api/client/upload", { method: "POST", body: lockedForm, cookie: client });
    record("Unggahan media setelah terbit ditolak (Studio terkunci)", lockedUpload.status === 403, `HTTP ${lockedUpload.status}`);

    // 5. Tamu terdaftar, WA dikirim.
    const guest = await call("/api/client/guests", jsonBody({ invitationId: created.invitationId, name: GUEST, phone: "081200000001", category: "VIP", guestLimit: 2 }, client));
    const guestId = guest.json?.guest?.id ?? guest.json?.id ?? "";
    record("Klien menambah tamu", guest.status === 200 && Boolean(guestId), `HTTP ${guest.status} ${guest.json?.error ?? ""}`);
    const sent = await call(`/api/client/guests/${guestId}`, { method: "PUT", headers: { "content-type": "application/json" }, cookie: client, body: JSON.stringify({ waStatus: "SENT" }) });
    record("Tamu ditandai WA terkirim", sent.status === 200, `HTTP ${sent.status} ${sent.json?.error ?? ""}`);

    // 6. Tamu membuka link personal di subdomain undangan.
    const page = await getOnSubdomain(subdomain, `/?to=${encodeURIComponent(GUEST)}`);
    record("Undangan terbuka di subdomain", page.status === 200, `HTTP ${page.status}`);
    record("Halaman memuat pencatat kunjungan", page.text.includes("function recordVisit") && page.text.includes(created.invitationId));
    record("Seksi vendor tampil", page.text.includes('id="section-vendors"') && page.text.includes("Studio Foto Golive"));
    const calendar = (page.text.match(/https:\/\/www\.google\.com\/calendar\/render[^"']*/) || [""])[0].replace(/&amp;/g, "&");
    const dates = calendar ? new URL(calendar).searchParams.get("dates") : null;
    const day = eventDay.replace(/-/g, "");
    record("Tautan kalender 10.00-14.00 WITA", dates === `${day}T020000Z/${day}T060000Z`, String(dates));
    // Dengan R2 aktif, unggahan draf dipindah ke R2 di latar belakang setelah terbit lalu HTML dibangun ulang.
    const coverRel = `invitations/${created.invitationId}/landing-cover.webp`;
    let coverPage = page.text;
    if (USES_BUCKET) {
      const cdnCover = `${process.env.S3_CUSTOM_DOMAIN?.replace(/\/$/, "")}/${coverRel}`;
      for (let i = 0; i < 15 && !coverPage.includes(cdnCover); i++) {
        await new Promise((r) => setTimeout(r, 1000));
        coverPage = (await getOnSubdomain(subdomain, `/?to=${encodeURIComponent(GUEST)}`)).text;
      }
      record("Media draf dipindah ke R2 saat terbit", coverPage.includes(cdnCover), cdnCover);
      const synced = await prisma.invitation.findUnique({ where: { id: created.invitationId }, select: { featureSettings: true } });
      const qrisUrl = String((synced?.featureSettings as Record<string, unknown> | null)?.qrisImageUrl ?? "");
      record("QRIS di featureSettings ikut dipindah ke R2", qrisUrl.startsWith(`${process.env.S3_CUSTOM_DOMAIN?.replace(/\/$/, "")}/invitations/`), qrisUrl);
    }
    const coverUrl = (coverPage.match(new RegExp(`(https?://[^"'()\\s]+)?/(uploads/)?${coverRel.replace(/[.]/g, "\\.")}`)) || [""])[0];
    record("Foto sampul dirujuk halaman", Boolean(coverUrl), coverUrl);
    const coverFetch = coverUrl ? await fetch(coverUrl.startsWith("http") ? coverUrl : `${APP_URL}${coverUrl}`) : null;
    record("Foto sampul dapat diunduh", coverFetch?.status === 200, `HTTP ${coverFetch?.status}`);

    const visit = await call("/api/public/visit", jsonBody({ invitationId: created.invitationId, visitorId: `golive${Date.now()}abcdef`, guestName: GUEST }));
    record("Kunjungan tamu tercatat", visit.json?.counted === true, JSON.stringify(visit.json));
    const summary = await call(`/api/client/guests/${created.invitationId}?summary=1`, { cookie: client });
    record("Dasbor: 1 tamu sudah membuka", summary.json?.openedGuestCount === 1, JSON.stringify(summary.json));

    // 7. RSVP dan ucapan.
    const rsvp = await call("/api/public/rsvp", jsonBody({ invitationId: created.invitationId, guestName: GUEST, status: "hadir", guestCount: 2, message: "Selamat menempuh hidup baru" }));
    record("Tamu mengirim RSVP", rsvp.json?.success === true, rsvp.json?.error ?? "");
    const wishes = await call(`/api/public/rsvp?invitationId=${created.invitationId}`);
    record("Ucapan tampil di daftar publik", (wishes.json?.rsvps ?? []).some((r: any) => r.guestName === GUEST));

    // 8. Resepsionis: PIN dan check-in QR.
    const pin = await call(`/api/client/invitations/${created.invitationId}/staff-pin`, { method: "PUT", headers: { "content-type": "application/json" }, cookie: client, body: JSON.stringify({ staffPin: "Golive2468" }) });
    record("Klien mengatur PIN resepsionis", pin.status === 200, `HTTP ${pin.status} ${pin.json?.error ?? ""}`);
    const verify = await call("/api/receptionist/verify-pin", jsonBody({ invitationId: created.invitationId, pin: "Golive2468" }));
    const rToken = verify.json?.token ?? verify.json?.sessionToken ?? "";
    record("Resepsionis masuk dengan PIN", verify.status === 200 && Boolean(rToken), `HTTP ${verify.status} ${verify.json?.error ?? ""}`);
    const qr = `LUX|${created.invitationId}|${GUEST}`;
    const scan1 = await call("/api/receptionist/scan", jsonBody({ qrToken: qr, invitationId: created.invitationId, isCheckIn: true, token: rToken }));
    record("Check-in QR tamu", scan1.json?.success === true && scan1.json?.alreadyRedeemed === false, scan1.json?.message ?? scan1.json?.error ?? "");
    const scan2 = await call("/api/receptionist/scan", jsonBody({ qrToken: qr, invitationId: created.invitationId, isCheckIn: true, token: rToken }));
    record("Check-in ulang terdeteksi sebagai ganda", scan2.json?.alreadyRedeemed === true, scan2.json?.message ?? scan2.json?.error ?? "");

    // 9. Foto momen dari tamu (kamera aktif pada hari acara).
    const photo = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: { r: 90, g: 60, b: 140 } } }).jpeg().toBuffer();
    const momentForm = new FormData();
    momentForm.append("file", new File([new Uint8Array(photo)], "momen.jpg", { type: "image/jpeg" }));
    momentForm.append("invitationId", created.invitationId);
    momentForm.append("senderName", GUEST);
    momentForm.append("message", "Momen uji go-live");
    const moment = await call("/api/public/memories/upload", { method: "POST", body: momentForm });
    record("Tamu mengunggah foto momen", moment.status === 200, `HTTP ${moment.status} ${moment.json?.error ?? ""}`);

    // 10. Ekspor daftar tamu.
    const exp = await call(`/api/client/invitations/${created.invitationId}/export`, { cookie: client });
    record("Klien mengekspor tamu", exp.status === 200 && exp.text.includes(GUEST), `HTTP ${exp.status}`);
  } catch (err) {
    record("Skrip berjalan sampai selesai", false, err instanceof Error ? err.message : String(err));
  } finally {
    // Pembersihan per id yang dicatat saat membuat data, tidak pernah lewat pola teks. Berkas dihapus dengan fungsi yang
    // sama dengan penghapusan klien oleh admin (removeInvitationFiles), sehingga kebocoran berkas ikut teruji.
    if (created.invitationId) {
      try {
        const admin = await adminCookie();
        const purge = await call(`/api/admin/invitations/${created.invitationId}/purge`, { method: "POST", cookie: admin });
        record("Admin membersihkan cache undangan", purge.json?.success === true, purge.json?.message ?? `HTTP ${purge.status}`);
      } catch (err) {
        record("Admin membersihkan cache undangan", false, err instanceof Error ? err.message : String(err));
      }
      const owner = await prisma.invitation.findUnique({
        where: { id: created.invitationId },
        select: { id: true, media: { select: { localPath: true } }, guestMemories: { select: { mediaUrl: true } } },
      });
      await prisma.invitation.deleteMany({ where: { id: created.invitationId } });
      if (owner) await removeInvitationFiles(owner, "E2EGolive");
      if (USES_BUCKET && s3Client) {
        const left = await s3Client.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME!, Prefix: `invitations/${created.invitationId}/` }));
        record("Penghapusan undangan membersihkan R2", (left.KeyCount ?? 0) === 0, `${left.KeyCount ?? 0} objek tersisa`);
      }
    }
    if (created.userId) {
      const proofs = await prisma.order.findMany({ where: { userId: created.userId }, select: { proofImageUrl: true } });
      await prisma.order.deleteMany({ where: { userId: created.userId } });
      await prisma.user.deleteMany({ where: { id: created.userId } });
      for (const o of proofs) if (o.proofImageUrl) await deleteFile(o.proofImageUrl);
    }
    if (forceManual) await prisma.adminSetting.update({ where: { key: "payment_mode" }, data: { value: savedMode } });
    await prisma.$disconnect();
    await pool.end();
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} pemeriksaan lulus.`);
  process.exitCode = failed ? 1 : 0;
}

main();
