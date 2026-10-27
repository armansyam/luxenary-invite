# Rencana Perbaikan (Belum Dieksekusi) — Luxenary Invite

Status (1 Oktober 2026): **DIEKSEKUSI atas perintah pemilik proyek, dengan pengecualian yang tercantum di bawah.** Bukti dan status per temuan ada di `docs/AUDIT_KESIAPAN_PRODUKSI_2026-09-30.md` bagian 9.

| Bagian rencana | Status |
|---|---|
| Gelombang 0.1 (objek R2 audit) | Belum: penghapusan massal di cloud storage diblokir pengaman otomatis; menunggu tindakan atau izin pemilik |
| Gelombang 0.2 (`Roblox.dmg`) | Selesai oleh pemilik |
| Gelombang 0.3 (commit 122 file) | Belum: keputusan pemilik; tidak ada commit atau push |
| Gelombang 0.4 (origin terjangkau langsung?) | Belum dijawab; menentukan nilai `TRUSTED_PROXY` dan firewall |
| 1.1 Skrip klien rusak | Selesai |
| 1.2 Dependensi | Selesai, 4 high transitif `prisma` tersisa (satu-satunya "perbaikan" adalah downgrade) |
| 1.3 `deploy.sh` | Selesai pada skrip; belum dijalankan utuh di server |
| 1.4 Seed | Selesai |
| 1.5 Verifikasi dari salinan bersih | Selesai pada salinan berkas yang akan di-commit (bagian 9.4 audit: tsc, build, dan 201 tes lulus di salinan bersih dengan DB kosong); bukan dari commit sungguhan |
| 2.1 Limiter | Selesai |
| 2.2 `featureSettings` NULL | Selesai pada situs server; situs `app/(client)/dashboard/**` belum |
| 2.3 CI dan coverage | Selesai pada konfigurasi; belum dijalankan di GitHub |
| 2.4 CSP | Report-Only selesai; enforce belum |
| Gelombang 3 | F-10, F-11, F-12, F-14, F-16, F-24 selesai; F-17 dan F-26 sebagian; F-13 (utang kode besar) belum |
| Tambahan di luar rencana | F-27 build melambat 25x karena file tracing: diperbaiki (253–330 detik menjadi 9 detik); F-28 backup `deploy.sh` gagal pada password berisi `@`: diperbaiki (`scripts/pg-env.cjs`) |
| **Gelombang 4: VPS produksi** | **Belum dijalankan (menunggu izin pemilik).** Prosedur terlatih pada replika skema produksi ada di `docs/AUDIT_KESIAPAN_PRODUKSI_2026-09-30.md` bagian 10.5: `migrate resolve --applied` untuk 3 migrasi lama (baseline_clean gagal di produksi, P3009), lalu `deploy.sh`. Rollback kode lama membutuhkan kolom `invitations.expiresAt` dikembalikan |
| Ditemukan di produksi, belum diputuskan | F-30 IP klien domain kustom (perlu Caddy `X-Real-IP`), F-31 build di tempat dan RAM 1,9 GB, F-32 rotasi password database |

Teks rencana asli di bawah dipertahankan sebagai catatan desain.
Dasar: `docs/AUDIT_KESIAPAN_PRODUKSI_2026-09-30.md` (skor 59/100). Kode temuan (F-xx) merujuk ke laporan itu.
Target: skor sekitar 78 setelah Gelombang 1, sekitar 85 setelah Gelombang 2.

## Prinsip pelaksanaan

- Satu commit per gelombang tematik; `git status` harus bersih dulu (Gelombang 0).
- Setiap perbaikan disertai tes regresi yang **gagal sebelum** dan **lulus sesudah** perbaikan.
- Suntingan bedah dengan `Edit`; tanpa `sed`, tanpa `git checkout`/`restore`.
- Tidak ada warna hardcode baru; perubahan UI (CSP, dsb.) tidak menyentuh CSS.
- Gerbang akhir tiap gelombang: `npx tsc --noEmit`, `npx eslint`, `npx next build`, `npx vitest run` dengan `DATABASE_URL=.../luxenary_test` (harus 0 skip), dan probe HTTP terkait.

## Gelombang 0 — Tindakan pemilik (tidak bisa saya lakukan sendiri)

| # | Tindakan | Alasan |
|---|---|---|
| 0.1 | Hapus objek R2 `backups/database/snapshot_2026-09-30_22-35-16_audit-drill.sql`, atau beri izin eksplisit agar saya menghapusnya lewat `DELETE /api/admin/database/backup` | F-23: dump DB test berisi hash admin |
| 0.2 | Pindahkan atau hapus `public/assets/ornaments/Roblox.dmg` (10 MB) | F-25: akan tersaji publik setelah commit/deploy |
| 0.3 | Putuskan bentuk commit atas 122 file berubah + untracked (F-02). Usul: 5 commit (keamanan, pembayaran, lifecycle+migrasi, tes, docs) | Deploy memakai `git pull`; tanpa ini tidak ada perbaikan yang sampai ke server |
| 0.4 | Jawab: apakah origin server dapat dijangkau langsung tanpa Cloudflare? | Menentukan urgensi F-04/F-05 |

## Gelombang 1 — Blocker rilis (P0)

### 1.1 Perbaiki skrip klien rusak (F-18, F-19)

Berkas dan perubahan persis:

- `lib/themeEngine.ts:1701`: `} catch (err: any) {` menjadi `} catch (err) {` (string ini dikirim ke browser sebagai JavaScript, bukan TypeScript).
- `themes/wedding/modern/starlit-dreams.html:1917`: `form.querySelector("button[type="submit"]")` menjadi `form.querySelector('button[type="submit"]')`.
- Setelah kedua perbaikan, jalankan ulang pemindai (lihat tes di bawah). `new Function` hanya melaporkan kesalahan sintaks pertama per skrip, jadi mungkin masih ada sisa; ulangi sampai 0.

Tes regresi baru: `__tests__/integration/inlineScriptSyntax.test.ts` (DB `luxenary_test`). Untuk setiap tema di tabel `themes`, panggil `buildAndSavePublishedHtml`, ekstrak semua `<script>` tanpa `src` dan bukan JSON/template, lalu `expect(() => new Function(body)).not.toThrow()`. Ini persis yang saya jalankan secara manual pada audit; kini permanen. Tambahkan juga pengecekan pada `/demo/<tema>`.

Verifikasi: skrip pemindai 39 tema harus menghasilkan `TEMA_DENGAN_SKRIP_RUSAK=0`; di browser `typeof window.luxOpenMemoryPreview === "function"` pada undangan terbit; kirim RSVP pada `starlit-dreams` dan cek baris `rsvps`.

### 1.2 Naikkan dependensi rentan (F-01, F-08)

```bash
npm install next@16.3.7 eslint-config-next@16.3.7 --save-exact
npm install sharp@0.35.4
npm audit fix --omit=dev   # fast-uri, brace-expansion (tanpa breaking change)
```

Terverifikasi tersedia di registry: `next@16.3.7`, `eslint-config-next@16.3.7`, `sharp@0.35.4`. **Jangan** menjalankan `npm audit fix --force`: sarannya untuk `prisma` adalah downgrade ke 6.19.3. `nodemailer` (major 10) dijadwalkan terpisah di Gelombang 2.
Verifikasi: `npm audit --omit=dev` menunjukkan 0 critical; seluruh gerbang hijau; `next build` ulang.

### 1.3 Perkeras `deploy.sh` (F-03)

Perubahan yang diusulkan pada urutan langkah:

1. `git pull` dengan `--ff-only`; hentikan bila gagal (sudah begitu).
2. `npm ci` menggantikan `npm install`; hapus `git checkout -- package-lock.json`.
3. **Build dulu**: `npm run build`; gagal berarti berhenti sebelum menyentuh DB.
4. **Backup sebelum migrasi**: `pg_dump -Fc "$DATABASE_URL" -f data/backups/pre-deploy_$(date +%F_%H%M).dump`; gagal berarti berhenti.
5. `npx prisma migrate deploy` **tanpa** `|| npx prisma db push`. Gagal berarti berhenti dan cetak perintah pemulihan.
6. Pindahkan `prisma db seed` ke instalasi awal saja (lihat 1.4).
7. `pm2 reload luxenary-invite --update-env`, lalu health check yang **menghentikan skrip dengan exit 1** dan mencetak `pm2 logs` bila gagal; simpan tag commit rilis sebelumnya agar rollback berupa satu perintah.

Verifikasi: jalankan skrip terhadap salinan staging dengan migrasi yang sengaja gagal; pastikan tidak ada `db push` dan PM2 tidak di-reload.

### 1.4 Perbaiki seed (F-09, F-21)

- Hapus blok `prisma.theme.deleteMany(...)` dan seluruh upsert tema di `prisma/seed.ts` (sekitar baris 335-355). Sumber kebenaran tema menjadi `scripts/sync-themes.ts` (memindai berkas tema) yang sudah menjaga `isPremium`/`isActive` bila tema sudah ada.
- Pertahankan seed `adminSetting` (sudah tidak menimpa `value`) dan `musicPreset` (periksa apakah `update` menimpa `isActive`/`sortOrder` yang diubah admin; bila ya, kosongkan `update`).
- `deploy.sh` tidak lagi menjalankan seed; dokumentasikan `npx prisma db seed` sebagai langkah instalasi awal.

Tes regresi: `__tests__/integration/seedPreservesAdminEdits.test.ts` yang mengubah tema, menjalankan fungsi seed, dan memastikan nilai admin dan tema kustom tetap ada.

### 1.5 Commit dan verifikasi dari checkout bersih (F-02)

Setelah 0.3: `git clone` ke direktori kosong, `npm ci`, `npx prisma migrate deploy` ke DB kosong, lalu seluruh gerbang. Ini menutup risiko "lulus hanya di working tree".

## Gelombang 2 — Sebelum trafik nyata (P1)

### 2.1 Limiter yang tidak bisa dipalsukan (F-04, F-05, F-06)

- `proxy.ts:73`: ganti `rateLimit(...)` (in-memory) dengan `await rateLimitDb("auth_login:" + ip, 5, 15 * 60 * 1000)`. Proxy Next 16 berjalan di runtime Node, jadi `pg` tersedia; beban hanya pada jalur `/api/auth/callback/credentials`.
- `app/api/client/upload/route.ts:31`: sama, ganti ke `rateLimitDb`.
- `lib/rateLimit.ts` `getClientIp` (baris 165-185) dan tiga salinan logika IP di `proxy.ts:66-70`, `upload/route.ts:30`: satukan menjadi satu fungsi yang membaca env `TRUSTED_PROXY` (`cloudflare` | `nginx` | `none`). Mode `cloudflare` hanya mempercayai `cf-connecting-ip`; `nginx` hanya `x-real-ip`; `none` memakai kunci konstan per rute agar tidak bisa dibypass dengan header. Ambil nilai default aman: `none`.
- Di luar kode: firewall origin agar hanya menerima IP Cloudflare (bergantung jawaban 0.4).
- Tambahkan batas per-entitas pada `/api/public/rsvp` (mengikuti pola `verify-pin:inv:<id>` di `receptionist/verify-pin/route.ts:20-21`).

Tes regresi: probe HTTP yang sekarang manual (8 login, 14 RSVP dengan XFF berputar) menjadi tes integrasi yang mengharapkan 429.

### 2.2 Ketahanan `featureSettings` NULL (F-20)

Buat satu helper (menggantikan duplikasi yang rapuh, pengecualian resmi dari aturan anti-wrapper karena ada ±12 salinan berperilaku salah):

```ts
// lib/featureSettings.ts
import { logger } from "@/lib/logger";

export function parseFeatureSettings(raw: unknown): Record<string, any> {
  if (raw && typeof raw === "object") return raw as Record<string, any>;
  if (typeof raw !== "string" || raw.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    logger.warn("FeatureSettings", "JSON featureSettings korup, memakai objek kosong", { err });
    return {};
  }
}
```

Ganti pada situs server (satu per satu dengan `Read` lalu `Edit`): `app/(public)/[slug]/memories/page.tsx:66`, `app/(public)/[slug]/sharemoment/page.tsx:70`, `app/(public)/s/[subdomain]/sharemoment/page.tsx:70`, `app/api/public/memories/upload/route.ts:126`, `app/api/client/invitations/[id]/memories/route.ts:103,247`, `app/api/client/invitations/[id]/route.ts:322,678`, `lib/upgradeHelper.ts:76`, `app/api/client/orders/checkout-bundle/route.ts:185`. Situs klien di `app/(client)/dashboard/**` dikerjakan di Gelombang 3.
Perbaiki juga fixture tes agar meniru produksi (mengisi `featureSettings` seperti `create/route.ts:488`) dan tambah satu tes yang sengaja memakai NULL untuk membuktikan helper.

### 2.3 Seed, CI, dan cakupan (F-15, F-22)

- `.github/workflows/ci.yml`: tambah langkah `npx next build`, `npm audit --omit=dev --audit-level=critical`, dan `npx vitest run --coverage`.
- `vitest.config.ts`: turunkan ambang jujur ke lantai terukur (mis. lines 20, branches 40, functions 40) lalu naikkan 5 poin per gelombang; ambang 40% sekarang fiktif.
- Pastikan CI menjalankan 0 tes skip (`--reporter` menghitung skip; gagalkan bila `skipped > 0`).

### 2.4 Content-Security-Policy (F-07)

Tambah header `Content-Security-Policy-Report-Only` di `next.config.ts` lebih dulu (mode laporan), amati pelanggaran dari halaman undangan (skrip inline, font lokal, gambar R2/CDN, `getUserMedia`), lalu ubah ke enforce. Menyalakan enforce langsung akan memutus skrip inline tema.

## Gelombang 3 — Utang teknis (P2)

| Kode | Perbaikan |
|---|---|
| F-10 | `/api/health` publik hanya `{status}`; detail (memori, cache, latensi) hanya untuk admin atau token. `poweredByHeader: false` di `next.config.ts` |
| F-11 | `JSON.parse(rawBody)` di webhook Midtrans/Xendit dan `req.json()` di RSVP dibungkus penanganan yang mengembalikan 400 |
| F-12 | `lib/gateways/midtrans.ts:497`: bandingkan signature dengan `crypto.timingSafeEqual` (seperti Xendit) |
| F-17, F-24 | Alarm bila unggah off-site gagal; ubah ekstensi backup menjadi `.dump` dan sesuaikan filter di `lib/databaseBackup.ts`; tambahkan restore drill terjadwal ke runbook; `CRON_SECRET` tidak ditulis polos di crontab (baca dari berkas ber-izin 600) |
| F-26 | Identifikasi sumber 463 draft yatim di `data/drafts`; pastikan `cron-cleanup` menyapunya |
| F-13 | Kurangi `any` dan catch kosong mulai dari route pembayaran dan auth; ganti `catch {}` dengan log terstruktur; pecah dua halaman 6 ribu baris; `console.*` ke `lib/logger.ts` |
| F-14 | Sinkronkan `README.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/S-Invitation.md` (modul `adminAuth`, `receptionistGuard`, `safeUrl`, `featureSettings`, migrasi baru, perubahan deploy) |
| F-16 | Ubah pesan "PRODUCTION CERTIFIED" di `industrial-qa-suite.ts` menjadi ringkasan netral; hentikan penimpaan `reports/*` yang dilacak git saat dijalankan lokal |
| nodemailer | Upgrade ke major 10 (uji `lib/mailer` dengan SMTP sandbox) |

## Urutan dan estimasi risiko

| Urutan | Item | Risiko | Alasan |
|---|---|---|---|
| 1 | 1.1 | Rendah | Perubahan 2 baris ditambah tes; dampak besar |
| 2 | 1.2 | Rendah-sedang | Patch version; jalankan penuh gerbang dan `next build` |
| 3 | 1.4, 1.3 | Sedang | Menyentuh alur deploy; uji pada staging dahulu |
| 4 | 0.3 lalu 1.5 | Rendah | Administratif, tetapi wajib sebelum push |
| 5 | 2.1 | Sedang | Mengubah jalur login; uji regresi login admin di browser |
| 6 | 2.2, 2.3 | Rendah | Mekanis, ditopang tes |
| 7 | 2.4 | Sedang | Mode Report-Only dahulu |
| 8 | Gelombang 3 | Rendah | Bertahap |

## Kriteria selesai per gelombang

- Gelombang 1: `TEMA_DENGAN_SKRIP_RUSAK=0`, `npm audit` 0 critical, `deploy.sh` tidak mengandung `db push`, seed tidak mengandung `deleteMany`, `git status` bersih, gerbang hijau dari checkout bersih.
- Gelombang 2: probe limiter mengembalikan 429 pada XFF berputar, halaman memori dan unggahan tamu tidak 500 pada `featureSettings` NULL, CI menjalankan build, audit, dan coverage, CSP Report-Only aktif.
- Gelombang 3: sesuai tabel; docs master sinkron sebelum push.
