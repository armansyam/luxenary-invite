# Audit Final Kesiapan Produksi — Luxenary Invite

- Tanggal audit : 2026-09-30
- Commit dasar  : `14a0045` (HEAD) + working tree dengan 122 file termodifikasi dan 19 entri untracked (lihat F-02)
- Metode        : eksekusi nyata (typecheck, lint, build, unit + integrasi, QA industrial, server produksi lokal + curl) dan pembacaan kode. Tanpa browser (sesuai AGENTS.md bagian 7).
- Lingkungan uji: macOS, Node lokal, Postgres lokal. Semua tes yang menulis data memakai DB `luxenary_test`, bukan `luxenary_dev`.

## 1. Skor terbaru: 82 / 100 untuk produksi yang berjalan dan untuk kode di `main` (bagian 11.6)

Riwayat: 63 (audit awal) → 59 (setelah uji browser dan HTTP, bagian 8) → 77 (kode setelah perbaikan, bagian 9.5) → 75 kode di `main` dan 50 produksi (audit ulang berbasis VPS, bagian 10.3) → **78 setelah produksi diperbarui, dipindah ke Node 22, dan restore backup terbukti (bagian 11.4)**. Teks di bawah sampai bagian 10 adalah catatan historis pada masing-masing tahapnya; bagian 10.4 dan 10.5 sudah usang, yang berlaku ada di bagian 11.5.

Tahap sebelum audit ulang:

Vonis: **belum siap produksi publik.** Fondasi kodenya kuat (build bersih, 188 tes lulus, alur pembayaran idempoten, otorisasi konsisten, restore backup terbukti). Skor ditahan oleh: hasil kerja yang belum ter-commit sementara deploy memakai `git pull`, versi Next.js dengan advisori critical, proses deploy tanpa jaring pengaman untuk migrasi, dan dua cacat sisi-klien yang terbukti di browser: skrip inline rusak pada 36 dari 39 tema (F-18) serta form RSVP mati pada tema `starlit-dreams` (F-19).

| Dimensi | Bobot | Nilai | Dasar |
|---|---|---|---|
| Build dan analisis statis | 10 | 10 | tsc, eslint, next build semuanya exit 0 |
| Pengujian otomatis | 15 | 8 | 188 tes lulus, tetapi cakupan aktual 20,28% (ambang 40% tidak ditegakkan) dan tidak ada tes yang mem-parse JS hasil render (F-18 lolos) |
| Keamanan aplikasi | 25 | 14 | Auth dan webhook baik. Advisori Next critical, limiter bisa dibypass, tanpa CSP |
| Deploy dan operasi | 20 | 9 | Perubahan belum ter-commit, fallback `db push`, tanpa backup pra-migrasi dan rollback |
| Integritas data dan logika bisnis | 15 | 11 | Idempotensi, race, cascade lulus. Seed menimpa data admin (F-09), skrip klien rusak (F-18, F-19) |
| Maintainability dan dokumentasi | 15 | 7 | 940 `any`, 156 catch kosong, halaman 6 ribu baris, dokumen master tidak sinkron |
| **Total** | **100** | **59** | |

Perkiraan skor setelah blocker P0 selesai (termasuk F-18 dan F-19): sekitar 78. Setelah P1: sekitar 85.

## 2. Bukti Pengujian

| Pengujian | Perintah | Hasil |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0, output kosong |
| Lint | `npx eslint` | exit 0, output kosong |
| Build produksi | `npx next build` | exit 0, 10 detik, 22 halaman statis |
| Unit dan integrasi (default) | `npx vitest run` | 136 lulus, **34 skip**, exit 0 |
| Unit dan integrasi (DB test) | `DATABASE_URL=.../luxenary_test npx vitest run` | **170/170 lulus**, 19 file, exit 0 |
| QA industrial | `npx tsx scripts/industrial-qa-suite.ts --suite=all` (DB test) | 18/18 kasus, exit 0, teardown bersih |
| Server produksi | `next start -p 3999` (DB test) | `/api/health` 200, DB connected, latensi 1 ms |
| Otorisasi tanpa sesi | curl ke 12 endpoint admin/client | seluruhnya 401 atau 405 |
| Cron tanpa secret | curl ke `/api/cron/*` | 401 |
| Path traversal `/uploads/...` | 5 varian encoding | seluruhnya 404 |
| Brute-force login, IP tetap | 8 POST, `X-Forwarded-For` sama | 302 x5, lalu 429 x3 (limiter bekerja) |
| Brute-force login, header diputar | 8 POST, XFF/X-Real-IP berbeda | **302 x8, tidak ada 429 (bypass)** |
| Limiter RSVP, header diputar | 14 POST, XFF berbeda | **14/14 lolos, tidak ada 429 (bypass)** |
| `npm audit --omit=dev` | | **11 kerentanan: 1 critical, 10 high** |

Catatan tentang 34 tes yang di-skip: keempat file di `__tests__/integration/` memakai `describe.skipIf(!IS_TEST_DB)`, aktif hanya bila `DATABASE_URL` berakhir `/luxenary_test`. Menjalankan `npm run test:unit` di mesin dengan `.env` bawaan menghasilkan hijau palsu untuk seluruh tes keamanan, pembayaran, dan lifecycle. CI sudah menyetel DB itu, jadi CI menjalankannya.

## 3. Temuan

Tingkat: P0 = blocker rilis, P1 = perbaiki sebelum trafik nyata, P2 = utang teknis.

### P0

**F-01 — Next.js 16.3.2 memiliki advisori critical.**
`npm audit`: dua advisori critical (RCE tanpa autentikasi di Image Optimization API "when AVIF files are used", dan RCE pada server Windows), rentang terdampak `>=16.0.0 <16.3.3`. `package.json` mengunci versi persis `16.3.2`. Fix tersedia di `16.3.7` (patch, bukan major).
Catatan kejujuran: server target Linux (PM2, crontab), jadi varian Windows tidak berlaku. Varian AVIF tidak saya verifikasi eksploitabilitasnya; `next.config.ts` tidak mengaktifkan format AVIF secara eksplisit, tetapi optimizer aktif lewat `images.remotePatterns`. Karena perbaikannya sekadar naik patch, tidak ada alasan menunda.
Aksi: naikkan `next` dan `eslint-config-next` ke `16.3.7`, jalankan ulang seluruh gerbang.

**F-02 — Hasil kerja yang diuji belum ada di git.**
`git status`: 122 file modified, `types/auth.d.ts` terhapus, dan untracked antara lain `lib/adminAuth.ts`, `lib/lifecycleCleanup.ts`, `lib/lifecycleDates.ts`, `lib/lifecycleSettings.ts`, `lib/paymentSettlement.ts`, `lib/receptionistGuard.ts`, `lib/safeCss.ts`, `lib/safeJson.ts`, `lib/safeUrl.ts`, `components/ui/`, `__tests__/integration/`, serta dua migrasi Prisma (`20260930045346_add_order_charged_amount`, `20260930120000_lifecycle_cleanup`).
`deploy.sh` memulai dengan `git pull origin main`. Yang sampai ke server adalah HEAD `14a0045`, bukan kode yang lulus audit ini. Modul keamanan dan migrasi skema tidak ikut. Seluruh hasil "hijau" di atas hanya berlaku untuk working tree lokal.
Aksi: commit dalam beberapa commit tematik (keamanan, pembayaran, lifecycle, migrasi, tes), pastikan `git status` bersih, dan jalankan ulang gerbang dari checkout bersih (`git clone` lalu `npm ci`).

**F-03 — Proses deploy tidak aman untuk migrasi.** `deploy.sh`
- Baris 89: `npx prisma migrate deploy || npx prisma db push`. Bila migrasi gagal, skrip diam-diam beralih ke `db push`, yang melewati riwayat migrasi dan dapat menyimpang dari skema. Kegagalan migrasi harus menghentikan deploy.
- Migrasi dijalankan sebelum build (baris 89 vs build di langkah 6). Jika build gagal, DB sudah termigrasi sementara kode lama masih berjalan.
- Tidak ada backup database sebelum migrasi. Backup baru terjadi lewat cron 03:00.
- Health check pasca-reload hanya mencetak peringatan; tidak ada rollback otomatis.
- `npm install` (bukan `npm ci`) membuat versi terpasang bisa berbeda dari lockfile, dan `git checkout -- package-lock.json` membuang perubahan lockfile di server.
Aksi: hapus fallback `db push`; urutan menjadi build, backup, migrate, reload, health check dengan exit non-zero dan rollback ke rilis sebelumnya; ganti ke `npm ci`.

### P1

**F-04 — Limiter brute-force login dapat dilewati dan tidak terdistribusi.** `proxy.ts:73`
Kunci limiter diambil dari `cf-connecting-ip`, lalu `x-real-ip`, lalu `x-forwarded-for`. Bila origin dapat dijangkau tanpa melewati Cloudflare, klien memalsukan header itu. Terbukti: 8 percobaan dengan header berbeda semuanya lolos (lihat bagian 2). Selain itu `rateLimit()` bersifat in-memory per proses, sementara `ecosystem.config.js` memakai `instances: 'max'` (mode cluster): batas efektif menjadi 5 kali jumlah worker, dan hitungan hilang setiap reload.
Aksi: gunakan `rateLimitDb` (sudah ada, atomik, terbukti di CONC-03) untuk login; kunci origin hanya menerima trafik dari rentang IP Cloudflare; percayai `cf-connecting-ip` saja pada jalur itu.

**F-05 — `getClientIp` mempercayai header yang dapat dipalsukan.** `lib/rateLimit.ts:165-185`
Dipakai oleh RSVP, upload memori, scan, verify-pin, dan guests receptionist. Terbukti bypass pada `/api/public/rsvp`: 14/14 request lolos dengan XFF berbeda, sehingga pembatasan per-IP tidak efektif dan RSVP palsu dapat dibanjirkan. `verify-pin` tidak terbuka sepenuhnya: selain batas per-IP (`verify-pin:ip:<ip>:<invitationId>`, 5 per window) ia punya batas per-undangan (`verify-pin:inv:<invitationId>`, 30 per window, `app/api/receptionist/verify-pin/route.ts:20-21`) yang tidak bergantung pada IP. Batas kedua itulah yang menahan tebakan PIN bila XFF dipalsukan; tidak diuji end-to-end.
Aksi: sama dengan F-04. Pasang pola batas per-entitas (seperti `verify-pin:inv`) pada RSVP publik.

**F-06 — Limiter upload in-memory.** `app/api/client/upload/route.ts:31`
Masalah cluster yang sama dengan F-04. Tambahan: seluruh file dimuat ke `Buffer` (hingga 50-100 MB untuk video) dan `max_memory_restart` PM2 hanya `450M` per worker. Beberapa upload video paralel berisiko memicu restart di tengah request. Ini inferensi dari kode, belum diuji beban.

**F-07 — Tidak ada Content-Security-Policy.** `next.config.ts`
Header keamanan lain ada dan benar (HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy), tetapi tanpa CSP. Aplikasi menyajikan HTML undangan hasil render template dengan input pengguna; tes XSS lulus, tetapi CSP adalah lapisan kedua bila ada satu vektor yang lolos.

**F-08 — Kerentanan dependensi lain.**
- `sharp` < 0.35.4 (high, libheif): `npm audit fix` sudah cukup, patch. Aplikasi memproses unggahan pengguna dengan sharp, jadi prioritaskan.
- `fast-uri`, `brace-expansion`: dapat diperbaiki tanpa breaking change.
- `nodemailer` (raw option, SSRF/file read): fix hanya lewat major 10. Eksploitasi membutuhkan kontrol atas opsi `raw` pesan; pemakaian di kode ini tidak menyerahkannya ke pengguna, jadi risiko praktis rendah. Jadwalkan upgrade.
- `prisma`, `@prisma/config`, `deepmerge-ts`, `mysql2`: saran `npm audit` adalah **downgrade** ke `prisma@6.19.3`. Jangan diikuti. Paket rentan ada di rantai transitif untuk adapter yang tidak dipakai (MySQL).
- `next-auth` `^5.0.0-beta.32` masih beta.

**F-09 — Seed menimpa data admin pada setiap deploy.** `prisma/seed.ts:335-355`, `deploy.sh` (`npx prisma db seed`)
Seed berjalan tiap deploy. Ia (a) menjalankan `theme.deleteMany({ id: { notIn: validIds } })`, sehingga tema buatan admin lewat `POST /api/admin/themes` terhapus, dan (b) meng-upsert `name`, `isPremium`, `isActive`, `sortOrder` dari daftar statis, sehingga perubahan admin lewat `PUT /api/admin/themes` dikembalikan. Admin setting aman (bagian `update` tidak menyentuh `value`). Sumber kebenaran tema juga terduplikasi: seed, `scripts/sync-themes.ts`, `app/api/admin/themes/route.ts` (daftar hardcode), dan `app/api/admin/themes/sync/route.ts`.
Aksi: seed tidak boleh `deleteMany` dan tidak boleh menimpa flag yang dapat diedit admin; jalankan seed hanya pada instalasi awal atau ubah `update` menjadi `{}` untuk kolom yang dikelola admin. Tentukan satu sumber kebenaran tema.

### P2

**F-10 — Endpoint kesehatan dan header membocorkan info.** `GET /api/health` tanpa autentikasi mengembalikan `environment`, memori RSS/heap, statistik cache, dan latensi DB. `X-Powered-By: Next.js` aktif (`poweredByHeader` tidak dimatikan). Sisakan `{status}` untuk publik, detail hanya untuk admin atau token.

**F-11 — JSON tidak valid menghasilkan 500.** `app/api/webhook/midtrans/route.ts:14`, `app/api/webhook/xendit/route.ts:36` (`JSON.parse(rawBody)` di dalam try umum), dan `/api/public/rsvp` (body 3 MB non-JSON menghasilkan 500). Semestinya 400. Berdampak pada noise alert, bukan keamanan.

**F-12 — Verifikasi signature Midtrans memakai `===`.** `lib/gateways/midtrans.ts:497`. Xendit sudah memakai `crypto.timingSafeEqual`. Samakan.

**F-13 — Utang kualitas kode (terukur, 233 file `.ts/.tsx` di `app`, `lib`, `components`).**
- `any`: 940 kemunculan. Contoh: `(session.user as any).isAdmin` di `app/api/client/upload/route.ts` dan `proxy.ts`, padahal `types/next-auth.d.ts` sudah memperluas tipe sesi.
- Catch kosong satu baris: 156, bertentangan dengan aturan AGENTS.md "NEVER swallow errors".
- `console.log`: 26; `console.error/warn`: 262 (sebagian melewati `lib/logger.ts` yang sudah ada).
- Warna hardcode (`#hex`/`rgba(`) di `.tsx`: 373. Sebagian mungkin data tema yang sah; belum diaudit per baris.
- File raksasa: `app/(client)/dashboard/invitation/[id]/page.tsx` 6.485 baris, `app/(admin)/admin/page.tsx` 6.306 baris (commit terakhir bertajuk "decompose monolith" tetapi halaman ini masih sebesar itu), `lib/demoRegistry.ts` 4.916 baris.
- `eslint-disable`: 5. `@ts-ignore`: 0. `TODO/FIXME`: 0.

**F-14 — Dokumen master tidak sinkron dengan kode.** Modul `adminAuth`, `receptionistGuard`, `safeUrl`, dan migrasi `add_order_charged_amount` tidak disebut di `README.md`, `docs/SYSTEM_ARCHITECTURE.md`, maupun `docs/S-Invitation.md`. `paymentSettlement` tidak ada di `README.md` dan `S-Invitation.md`. AGENTS.md melarang push sebelum ketiganya sinkron.

**F-15 — Cakupan dan gerbang CI.**
- 19 file tes untuk 233 file sumber dan 96 route API. Cakupan tidak diukur pada audit ini (folder `coverage/` berumur 28 Sep); ambang di `vitest.config.ts` hanya 40% baris.
- CI menjalankan tsc, migrate, vitest, dan lint. CI **tidak** menjalankan `next build`, `npm audit`, maupun `test:all`. Kerentanan F-01 lolos CI karena itu.
- Tidak ada tes tingkat HTTP terhadap server yang berjalan. Probe curl di audit ini belum menjadi tes permanen.

**F-16 — Klaim "PRODUCTION CERTIFIED" pada `industrial-qa-suite.ts` menyesatkan.** Suite ini 18 kasus, berjalan 0,37 detik, memanggil pustaka langsung tanpa lapisan HTTP, dan mencetak sertifikasi sendiri. Nilai sebagai regresi lokal baik; nilai sebagai sertifikasi produksi rendah. Tiap run juga menulis ulang `reports/LATEST_QA_REPORT.md` dan `reports/qa-report.json` yang dilacak git (run audit ini mengubah keduanya).

**F-17 — Backup dan pemulihan.** Replikasi off-site ke R2 hanya `console.warn` saat gagal (`lib/databaseBackup.ts:250`), tanpa alarm. Tidak ada bukti uji pemulihan (restore drill) di repo. `CRON_SECRET` tertulis polos di crontab server (terlihat lewat `crontab -l` dan daftar proses).

## 4. Yang Sudah Baik (terverifikasi, bukan asumsi)

- Otorisasi: seluruh route admin/client/upload/cron yang diuji menolak akses tanpa sesi. Kontrak lintas-tenant (SEC-01) dan 15 tes `securityContract` lulus.
- Pembayaran: signature Midtrans wajib bila key terkonfigurasi, token Xendit memakai `timingSafeEqual`, nominal divalidasi (`isGatewayAmountValid`), webhook paralel idempoten (FIN-01), kuota promo aman dari race (FIN-02), production menolak webhook bila gateway tidak terkonfigurasi (503).
- Konkurensi: check-in QR multi-gerbang, batas kuota katering, dan UPSERT limiter atomik lulus.
- Integritas data: cascade delete tanpa yatim (INF-02), 22 indeks pada tabel utama (INF-01), siklus hidup penyimpanan tiga lapis tanpa kebocoran disk (LIFE-03).
- Unggahan: gambar selalu ditranskode sharp ke WebP dan audio/video di-reencode ffmpeg. Validasi magic-bytes di `upload/route.ts` hanya berjalan `if (detectedType)`, tetapi transkode membuat file tak terdeteksi tidak menjadi eksploit langsung. Lapisan ini defense-in-depth, bukan penghalang utama.
- XSS: tes render seluruh tema dengan payload berbahaya lulus.
- Rahasia: `.env` tidak dilacak git; `AUTH_SECRET` 53 karakter, `CRON_SECRET` dan `PIN_ENCRYPTION_KEY` 64 karakter; seed admin tanpa kredensial bawaan.

## 5. Yang Tidak Diuji (batas audit ini)

- UI dan alur di browser, responsivitas, dan kursor/seleksi (tidak dijalankan: AGENTS.md bagian 7 melarang tanpa perintah eksplisit).
- Beban dan stres nyata; perilaku memori PM2 cluster dengan unggahan besar (F-06 adalah inferensi).
- Gateway pembayaran sandbox sungguhan, SMTP, R2/S3 nyata, dan Google OAuth. Lulus di tes hanya lewat mock atau fungsi murni.
- `.env` produksi, konfigurasi Cloudflare, firewall origin, dan apakah origin dapat dijangkau langsung (menentukan seberapa parah F-04 dan F-05).
- Pemulihan backup, dan eksploitabilitas advisori Next.js varian AVIF.
- Cakupan kode terukur.

## 6. Rencana Perbaikan Berurutan

**P0, sebelum rilis:**
1. Commit seluruh working tree (F-02), lalu verifikasi dari checkout bersih.
2. `next` dan `eslint-config-next` ke `16.3.7`; `npm audit fix` (sharp, fast-uri, brace-expansion) (F-01, F-08).
3. Perbaiki `deploy.sh`: tanpa `db push`, backup sebelum migrasi, build sebelum migrate, health check dengan rollback, `npm ci` (F-03).

**P1, sebelum trafik nyata:**
4. Limiter login dan upload ke `rateLimitDb`; kunci origin ke IP Cloudflare; hentikan kepercayaan pada XFF (F-04, F-05, F-06).
5. Seed tidak boleh menghapus atau menimpa data yang dikelola admin; satu sumber kebenaran tema (F-09).
6. Tambahkan CSP (mulai `Report-Only`) (F-07).
7. Tambahkan `next build` dan `npm audit --omit=dev --audit-level=critical` ke CI (F-15).

**P2, dua minggu pertama:**
8. `/api/health` publik minimal; matikan `X-Powered-By`; 400 untuk JSON rusak; `timingSafeEqual` untuk Midtrans (F-10, F-11, F-12).
9. Sinkronkan tiga dokumen master (F-14).
10. Kurangi `any` dan catch kosong mulai dari route pembayaran dan auth; pecah dua halaman 6 ribu baris (F-13).
11. Restore drill terjadwal dan alarm bila off-site backup gagal (F-17).
12. Ubah ambang cakupan menjadi terukur dan naik bertahap; tambahkan tes HTTP permanen dari probe di bagian 2 (F-15).

## 8. Pengujian Lanjutan Tanpa Batasan (revisi ke-2, browser dan HTTP nyata)

Dijalankan setelah batasan browser/subagent dari `.agent` dilepas untuk audit ini. Server produksi (`next start -p 3999`) terhadap DB `luxenary_test`, browser panel bawaan, curl, `ab`, `pg_restore`.

### 8.1 Hasil yang lulus

| Area | Bukti |
|---|---|
| 9 skrip QA tambahan | `test-01/02/03`, `test-security-penetration`, `master-e2e-stress-test`, `end-to-end-stress-audit`, `complete-system-audit`, `test-theme-matrix` (39/39), `test-nas-archive-lifecycle`: seluruhnya exit 0 |
| Linter hygiene bawaan | `audit-code-hygiene.ts`: 0 masalah |
| Halaman publik | 26 URL diprobe; hanya `/{slug}/memories`, `/galery`, `/sharemoment` yang 500 pada data fixture NULL (F-20); sisanya 200/307/404 sesuai harapan |
| Landing di browser | tanpa error konsol, tanpa gambar rusak, tanpa scroll horizontal |
| Portal admin di browser | login berhasil; 13 tab (Ringkasan sampai Finance) dimuat tanpa request 4xx/5xx dan tanpa error JS |
| Resepsionis via HTTP | PIN salah 401; PIN benar mengeluarkan token; daftar tamu tanpa token 401; check-in pertama sukses, kedua `alreadyRedeemed:true` (idempoten); token undangan A untuk undangan B 401; token diubah 1 karakter 401 |
| RSVP via HTTP | 5 kiriman paralel nama sama menghasilkan 1 record; `guestCount:999` tersimpan 2 (dibatasi kuota); pesan XSS dirender sebagai teks di DOM (0 elemen tersuntik) |
| Path traversal `/uploads/...` | 5 varian: 404 |
| Backup dan restore | snapshot dibuat lewat API admin (100 KB), dipulihkan dengan `pg_restore` ke DB sementara: 9 tabel kunci identik (themes 39, admin_settings 126, users 3, invitations 2, orders 2, guests 2, migrasi 5) |
| Beban (`ab -n 3000 -c 50`, 1 proses) | undangan terbit 905 rps, p95 61 ms; `/demo/kalandra` 686 rps, p95 90 ms; `/api/public/themes` 535 rps, p99 425 ms; landing dinamis 159 rps, p95 359 ms; tanpa respons non-2xx |

### 8.2 Temuan baru

**F-18 — Skrip inline rusak pada 36 dari 39 tema (P0).**
`lib/themeEngine.ts:1701` menulis `catch (err: any)`, sintaks TypeScript di dalam string JavaScript yang dikirim ke browser. Browser menolak seluruh blok skrip (`Uncaught SyntaxError: Unexpected token ':'`), sehingga `window.luxOpenMemoryPreview`, `luxOpenMemoryModal`, `luxSubmitMemory`, `luxHandleFileSelect`, `ensureMemoryModalOnBody` bernilai `undefined`. Terbukti di browser (`typeof` semuanya `undefined`) dan lewat `new Function()` pada HTML terbit untuk seluruh tema: 36 tema rusak (yang lolos: `aeterna`, `verona`, `burgundy-royale`). Dampak pengguna: lingkaran "story" momen tamu memakai `onclick="luxOpenMemoryPreview(...)"` (`themeEngine.ts:1344`), sehingga klik tidak melakukan apa-apa. Tombol "Buka Kamera Kenangan" tetap berfungsi karena berupa tautan ke `/sharemoment`. Kode ini sudah ada sejak commit `9a91db5`, jadi ada di HEAD produksi. Tes yang ada (`xssRender`, `test-theme-matrix`, QA industrial) tidak mem-parse skrip hasil render, itu sebabnya lolos.
Catatan: `new Function` hanya melaporkan kesalahan sintaks pertama per skrip; setelah perbaikan, uji ulang sampai nol.

**F-19 — Form RSVP mati pada tema `starlit-dreams` (P0).**
`themes/wedding/modern/starlit-dreams.html:1917`: `form.querySelector("button[type="submit"]")` memakai kutip ganda bersarang. Baris ini berada di `luxSubmitRsvp`, sehingga seluruh skrip gagal di-parse (`missing ) after argument list`). Tema lain memakai kutip tunggal yang valid. Akibat: pengiriman RSVP pada tema ini tidak terhubung. Dampak runtime pengiriman form tidak saya klik di browser; kesimpulan berasal dari parse gagal dan isi fungsi.

**F-20 — `featureSettings` NULL membuat halaman memori dan unggahan tamu 500 (P2, laten).**
`app/(public)/[slug]/memories/page.tsx:66`, `.../sharemoment/page.tsx:70` (dan varian `/s/[subdomain]`), `app/api/public/memories/upload/route.ts:126`: ekspresi `typeof x === "object" ? x : JSON.parse(...)` mengembalikan `null` untuk NULL (`typeof null === "object"`), lalu `fs.showGuestMemories` melempar `TypeError`. Terbukti: halaman 500 dan `POST /api/public/memories/upload` 500 pada undangan dengan `featureSettings` NULL, keduanya normal setelah kolom diisi. Keparahan diturunkan ke P2: satu-satunya jalur pembuatan produksi (`app/api/client/invitations/create/route.ts:467,488`) selalu mengisinya, dan satu-satunya undangan di DB dev berisi nilai. NULL berasal dari fixture skrip tes (`prisma.invitation.create` langsung), artinya fixture tidak mewakili produksi. Pola rapuh yang sama muncul di sekitar 20 tempat; `lib/upgradeHelper.ts:76` dan `checkout-bundle/route.ts:185` sudah aman karena memakai `|| {}`.

**F-21 — Seed menghapus tema, bukan hanya menimpa (memperberat F-09).**
Bukti empiris: tema `kalandra` diubah lewat `PUT /api/admin/themes` (nama, `isActive:false`, `isPremium:false`), tema `tema-buatan-admin` ditambahkan, lalu `npx prisma db seed`. Hasil: `kalandra` kembali ke nilai awal dan `tema-buatan-admin` terhapus. Selain itu seed hanya memuat 28 tema sedangkan DB berisi 39, sehingga `deleteMany({ notIn })` menghapus 11 tema pada setiap deploy dan baru dibuat ulang oleh `npm run themes:sync` (39 kembali). Di antara kedua langkah itu, `/api/public/themes` mengembalikan 28 tema.

**F-22 — Coverage aktual 20,28%, ambang 40% tidak ditegakkan (memperbarui F-15).**
`npx vitest run --coverage`: lines 20,28%, branches 44,89%, functions 40,89%; keluar dengan exit 1 karena ambang lines 40%. CI menjalankan `npm run test:unit` tanpa `--coverage`, jadi ambang itu tidak pernah diterapkan.

**F-23 — Efek samping audit pada layanan eksternal (dilaporkan, perlu tindakan Anda).**
Server uji dijalankan dengan `.env` yang berisi kredensial R2 asli (`STORAGE_PROVIDER=r2`). Saat saya memicu backup lewat API admin, snapshot ikut terunggah (`offsiteSynced:true`) ke `backups/database/snapshot_2026-09-30_22-35-16_audit-drill.sql` (100 KB) di bucket R2 Anda. Berkas itu adalah dump DB `luxenary_test` dan memuat 3 baris admin beserta hash bcrypt-nya. Tidak ada backup lama yang terhapus (hanya 1 snapshot lokal, retensi 10). Saya tidak menghapus objek itu karena penghapusan permanen di layanan eksternal memerlukan izin Anda. Pelajaran metodologi: uji berikutnya harus memakai `.env` terpisah tanpa kunci S3.

**F-24 — Berkas backup berekstensi `.sql` tetapi berformat custom `pg_dump`.**
Header berkas `PGDMP`; `psql -f` gagal ("relation does not exist"), `pg_restore` berhasil. Operator yang mencoba `psql` saat darurat akan mengira backup rusak. Ganti ekstensi menjadi `.dump`, atau dokumentasikan perintah pemulihan.

**F-25 — Berkas asing 10 MB di folder publik.**
`public/assets/ornaments/Roblox.dmg` (10.376.753 byte, untracked, dibuat 20:25 hari ini) berada di `public/`, sehingga akan disajikan ke internet setelah commit atau deploy. Bukan berasal dari audit ini.

**F-26 — 463 dari 465 file di `data/drafts/` tidak punya undangan pemilik (~54 MB).**
Enam skrip uji diukur jumlah filenya sebelum dan sesudah dijalankan: tetap 465, jadi bukan mereka sumbernya. Sumber kebocoran belum teridentifikasi; kandidat: autosave studio atau pra-kompilasi demo. Cron cleanup perlu diperiksa apakah menyapu draft yatim.

### 8.3 Yang tetap tidak teruji

Dashboard klien (login hanya via Google OAuth, tidak saya palsukan sesi), gateway pembayaran sandbox, SMTP, unggahan video/audio via ffmpeg, PM2 mode cluster, dan `Secure` flag cookie di HTTPS (uji berjalan di `http://localhost`). Screenshot emulasi mobile 375x812 menampilkan konten hanya di separuh lebar, tetapi pengukuran DOM menunjukkan tata letak penuh 375 px tanpa scroll horizontal; saya perlakukan sebagai artefak tangkapan, bukan cacat.

## 9. Verifikasi Perbaikan (1 Oktober 2026)

Perbaikan dari `docs/RENCANA_PERBAIKAN_2026-09-30.md` dieksekusi atas perintah pemilik. Setiap perbaikan perilaku didahului tes yang gagal, lalu lulus sesudah perbaikan.

### 9.1 Bukti gerbang akhir (DB `luxenary_test`, tanpa kunci S3)

| Gerbang | Hasil |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` | exit 0 |
| `npm audit --omit=dev --audit-level=critical` | exit 0; 0 critical, 4 high (rantai `prisma`, lihat 9.3) |
| `npx next build` | exit 0 dalam **9 detik** (sebelumnya 253–330 detik, lihat F-27) |
| `npx vitest run --coverage --reporter=json` (perintah CI) | **201/201 lulus, 0 di-skip**, 28 file, 21 detik; coverage lines 23,9 / branches 50,7 / functions 45,0 (lantai lines 21, branches 49, functions 43 lulus) |
| `scripts/audit-code-hygiene.ts` | 0 masalah |
| Probe HTTP `next start` | login 8 POST dengan `X-Forwarded-For` diputar: 302 x5 lalu 429 x3 (dulu 302 x8); 3 klien `cf-connecting-ip` berbeda: 302 x3; `X-Powered-By` hilang; `Content-Security-Policy-Report-Only` ada; `/api/health` publik `{status,timestamp}`; `/api/security/csp-report`: 204 valid, 400 JSON rusak, 413 terlalu besar |
| Browser | `starlit-dreams`: 10/10 skrip inline valid, `luxSubmitRsvp` berupa fungsi, ucapan `<b>`/`<img onerror>` dirender sebagai teks (0 elemen tersuntik, tanpa efek `onerror`); undangan terbit: `luxOpenMemoryPreview`, `luxOpenMemoryModal`, `luxSubmitMemory`, `ensureMemoryModalOnBody` kini `function` (sebelumnya `undefined`), 0 dari 8 skrip rusak |

### 9.2 Status per temuan

| Temuan | Status | Catatan |
|---|---|---|
| F-01 Next critical | Selesai | `next`/`eslint-config-next` 16.3.7; audit: 0 critical |
| F-02 Belum ter-commit | **Belum** (keputusan pemilik) | Tidak ada commit atau push yang saya lakukan. Verifikasi dari salinan bersih: lihat 9.4 |
| F-03 `deploy.sh` | Selesai pada skrip; belum dijalankan utuh di server | `bash -n` OK; `pg_dump -Fc` dengan URL yang dikupas OK dan terbaca `pg_restore -l`; `curl -H @berkas` mengirim header. Belum ada uji deploy penuh di staging/VPS |
| F-04, F-05, F-06 Limiter | Selesai | `getClientIp` berbasis `TRUSTED_PROXY`, login/upload ke `rateLimitDb`, batas RSVP per undangan; tes unit + integrasi + probe HTTP. Risiko operasional: bila produksi tidak di belakang Cloudflare (DNS-only), semua pengunjung berbagi satu kunci; ada peringatan log sekali per proses. Risiko memori 450M pada unggahan video besar tidak diuji |
| F-07 CSP | Sebagian | Report-Only aktif dengan penerima laporan; mode enforce belum |
| F-08 Dependensi | Sebagian | `sharp` 0.35.4, `fast-uri`, `brace-expansion`, `nodemailer` 10.0.13 (transport JSON teruji); tersisa 4 high di rantai `prisma` (`prisma`, `@prisma/config`, `deepmerge-ts`, `mysql2`; satu-satunya "perbaikan" adalah downgrade dan adapter MySQL tidak dipakai) |
| F-09, F-21 Seed | Selesai | Seed tidak menyentuh `themes`, `update: {}` untuk preset musik; tes `seedPreservesAdminEdits` |
| F-10 Health, header | Selesai | Tes `healthEndpoint`; `poweredByHeader: false` |
| F-11 JSON rusak | Selesai | Tes `malformedJson` (RSVP, Midtrans, Xendit) |
| F-12 `===` Midtrans | Selesai | `timingSafeEqual`; tes pembayaran lulus |
| F-13 Utang kode | **Sebagian kecil** | Hanya 3 catch kosong pada jalur auth/pembayaran (satu diperbaiki: kegagalan DB saat login Google tidak lagi ditelan). 940 `any`, halaman 6 ribu baris, `console.*`, dan 33 catch kosong di UI **belum** disentuh |
| F-14 Docs | Selesai | README, SYSTEM_ARCHITECTURE (bagian 25), S-Invitation (bagian 33), API_REFERENCE, monitoring VPS, `.env.example` |
| F-15, F-22 CI dan coverage | Selesai pada konfigurasi; belum dijalankan di GitHub | CI kini: audit critical, seed + `themes:sync`, `next build`, `vitest --coverage`, gagal bila ada tes di-skip. Sebelumnya CI tidak mengisi tabel `themes`, sehingga tes tema akan gagal di CI. Ambang coverage jujur |
| F-16 Klaim sertifikasi | Selesai | Banner dan laporan QA dinetralkan |
| F-17 Backup | Sebagian | Kegagalan off-site `logger.error` + `warning` di respons cron; secret cron keluar dari crontab. Restore drill terjadwal belum dibuat |
| F-18, F-19 Skrip klien | Selesai | Tes `inlineScriptSyntax` (39 tema x terbit/pratinjau/demo) + verifikasi browser |
| F-20 `featureSettings` NULL | Selesai pada situs server | Situs di `app/(client)/dashboard/**` masih memakai pola lama (laten; jalur pembuatan produksi selalu mengisinya) |
| F-23 Objek R2 audit | **Belum** | Penghapusan massal di cloud storage diblokir pengaman otomatis; isi bucket `luxenary-invitation` saat dilihat: 32 objek, 2,2 MB (10 snapshot harian otomatis, 13 bukti bayar, foto undangan, momen tamu). Tidak ada yang terhapus. Tindakan ada pada pemilik |
| F-24 Ekstensi backup | Selesai | Snapshot baru `.dump`; tes `backupSnapshot` (menolak berjalan bila storage bukan `local`) |
| F-25 `Roblox.dmg` | Selesai (oleh pemilik) | |
| F-26 Draft yatim | Sebagian | Tiga tes yang membocorkan draft diperbaiki (`xssRender`, `lifecycleCleanup`, dan tes baru); jumlah draft tidak lagi naik. 917 draft yatim lama di mesin lokal belum disapu: dry-run `runStaleDataCleanup` terhadap DB dev melaporkan `orphanedDrafts: 917`; cron 02:00 di server menyapunya |

### 9.3 Temuan baru saat eksekusi

**F-28 — Backup pra-migrasi di `deploy.sh` akan gagal pada password produksi (diperbaiki sebelum push).** Saat membaca VPS secara read-only, `psql` dengan `DATABASE_URL` produksi gagal ("could not translate host name") karena password di `.env` memuat `@` mentah; parser URL libpq membelah pada `@` pertama. Itu berarti `pg_dump "$URL"` di `deploy.sh` saya akan menghentikan setiap deploy di server. Aplikasi sendiri tidak terdampak karena `lib/databaseBackup.ts` memakai `new URL(...).toString()`, yang meng-encode password. Perbaikan: `scripts/pg-env.cjs` membelah pada `@` terakhir (aman untuk `@`, `#`, `/`, `?`, kutip tunggal, `%` literal, IPv6) dan mengirim kredensial lewat `PG*`, bukan argumen; diuji (`__tests__/unit/pgEnv.test.ts`, 10 tes) dan blok backup `deploy.sh` dijalankan terisolasi dengan password berisi `@` dan `#` (dump 103 KB terbaca `pg_restore -l`, password 0 kali muncul di log). Percobaan pertama dengan parser URL standar sempat gagal pada password berisi `#`, itulah sebabnya parser manual dipakai.

**F-27 — Build melambat 25x karena file tracing (diperbaiki).** Satu rute webhook memuat 2.236 entri trace, di antaranya 1.014 entri (276 MB) dari `public/` dan 921 entri (49 MB) dari `data/`, karena kode membaca data runtime lewat `process.cwd()`. Build menjadi 253–330 detik; ditemukan bukan regresi Next (16.3.2 juga 295 detik pada pohon yang sama). `outputFileTracingExcludes` untuk `data/`, `public/`, dan direktori non-runtime menurunkan build menjadi 9 detik dan trace menjadi 301 entri; `next start` tetap menyajikan undangan terbit, demo, thumbnail, dan aset (diverifikasi). Tanpa perbaikan ini, waktu build di VPS akan terus tumbuh bersama jumlah draft dan demo.

**Tes-tes integrasi harus berurutan.** Tes yang mengubah tabel `themes` (seed) bocor ke tes yang mengiterasi tema saat dijalankan paralel. `fileParallelism: false` ditambahkan di `vitest.config.ts`. Tes yang menjalankan proses anak harus membuang `NODE_V8_COVERAGE`, bila tidak proses `tsx` macet di bawah `--coverage` (13 detik menjadi 310 detik sampai timeout, terukur).

**Cookie sesi bersama lintas port.** Panel browser membawa cookie `localhost` milik sesi dev pengguna di `localhost:3000`, sehingga uji di port lain dapat tampak "sudah login". Uji HTTP pakai `curl` tanpa cookie untuk perilaku anonim.

### 9.4 Verifikasi dari salinan bersih

Metode: hanya berkas yang akan ikut commit (`git ls-files -co --exclude-standard`, 1.359 berkas yang ada di disk) disalin ke direktori kosong, tanpa `node_modules`, `.env`, dan cache ter-ignore; lalu database PostgreSQL kosong.

| Langkah di salinan bersih | Hasil |
|---|---|
| `npm ci` | exit 0 (8 detik) |
| `prisma generate` | exit 0 |
| `prisma migrate deploy` pada DB kosong | exit 0, 7 migrasi terapan |
| `prisma db seed` lalu `npm run themes:sync` | exit 0; 39 tema, 126 pengaturan |
| `tsc --noEmit` | exit 0 |
| `next build` | exit 0 (22 detik, cache dingin) |
| `vitest run --coverage` (DB `luxenary_test`) | exit 0, **201/201 lulus, 0 di-skip** |

Dua catatan jujur: (a) percobaan pertama gagal karena skrip salinan saya, bukan repo (berkas tracked yang sudah dihapus, `types/auth.d.ts`, membuat `rsync` tidak menyalin `types/`, sehingga augmentasi tipe NextAuth hilang); skrip diperbaiki dan diulang. (b) Ini pohon yang *akan* di-commit, bukan commit sungguhan; nilainya baru final setelah `git clone` dari remote pasca-push.

### 9.5 Skor setelah perbaikan: 77 / 100 (estimasi, rubrik sama)

| Dimensi | Bobot | Sebelum | Sesudah | Dasar |
|---|---|---|---|---|
| Build dan analisis statis | 10 | 10 | 10 | tsc, eslint, build 9 detik |
| Pengujian otomatis | 15 | 8 | 12 | 201 tes, 0 skip, coverage terukur dan ditegakkan di CI, tes regresi skrip klien; tanpa uji beban/E2E permanen |
| Keamanan aplikasi | 25 | 14 | 20 | 0 critical, limiter tahan pemalsuan, CSP-RO, health minimal; sisa 4 high transitif, CSP belum enforce, firewall origin belum diverifikasi |
| Deploy dan operasi | 20 | 9 | 13 | `deploy.sh` aman untuk migrasi dan build cepat; belum di-commit, belum diuji di server, objek R2 audit masih ada |
| Integritas data dan logika bisnis | 15 | 11 | 14 | seed aman, skrip klien valid, `featureSettings` NULL tertangani di server |
| Maintainability dan dokumentasi | 15 | 7 | 8 | docs sinkron; utang `any`, halaman 6 ribu baris, `console.*` tetap |
| **Total** | **100** | **59** | **77** | |

Skor ini **bersyarat**: dicapai pada working tree lokal. Nilainya baru berlaku di produksi setelah (1) commit dan push, (2) `deploy.sh` terbukti jalan di staging/VPS, (3) CI GitHub hijau, dan (4) `TRUSTED_PROXY` dipastikan sesuai topologi produksi.

## 10. Audit Ulang Berbasis Produksi Nyata (1 Oktober 2026)

Audit sebelumnya menilai kode di repo. Bagian ini menilai **sistem yang benar-benar berjalan** di VPS `luxvite.id`, berdasarkan pembacaan read-only (SSH dengan izin pemilik, tanpa mengubah server) dan probe publik GET. Produksi sungguhan, belum ada klien.

### 10.1 Fakta produksi (terbukti)

| Area | Temuan |
|---|---|
| Server | Ubuntu 22.04, 2 core, RAM 1,9 GB (±94 MB bebas, swap terpakai), disk 22%, Node 20.20, PM2 7, PostgreSQL 14 lokal, Caddy 2.11; berbagi dengan aplikasi Wisuda dan pick-your-photo |
| Edge | Di belakang Cloudflare (`cf-ray`, `server: cloudflare`); Caddy memakai sertifikat origin Cloudflare untuk `luxvite.id, *.luxvite.id`; sertifikat edge berlaku sampai 2 Des 2026 (diperbarui Cloudflare) |
| Kode berjalan | `fd01473`, Next 16.3.2 (memiliki advisori critical); tertinggal 1 commit dari `14a0045` dan 7 commit dari `62a21fa` (kepala `main` saat ini) |
| Data | 0 user, 0 undangan, 0 order, 2 admin, 39 tema, 3 preset musik, DB 10 MB; `service_status_mode = COMING_SOON` (pendaftaran ditutup); 0 draf, 0 undangan terbit |
| Pembayaran/email | Midtrans terisi (sandbox dan produksi), Xendit kosong, SMTP terisi, rekening manual terisi; `payment_gateway_mode` kosong; tarif 99.000 / 150.000 / 250.000 |
| Backup | Snapshot otomatis 03:00 berjalan: 10 snapshot harian di R2 (21-30 Sep), retensi 10; restore belum pernah diuji |
| Restart PM2 (225/226) | **Bukan crash dan bukan batas memori.** Itu `pm2 reload` dari deploy (142 pasang "Stopping … _old_", ±106 reload pada 30 Sep); 0 restart karena `max_memory_restart`; 0 jejak OOM di syslog |
| Log aplikasi | `logs/` di direktori proyek, dirotasi harian. Hari ini: 95 baris "Could not find a production build in the '.next' directory" (proses start saat `.next` tidak lengkap, konsisten dengan build yang berjalan di server 1,9 GB atau reload di tengah build) dan 6 "Server Action ID tidak cocok" (klien membawa halaman lama setelah deploy). Peringatan AWS SDK: akan mensyaratkan Node ≥ 22 (server Node 20) |
| Probe publik | Beranda, login, demo, sitemap, API publik semuanya 200 dalam 0,15-1,3 detik; `/packages` 307 (benar, khusus klien) |
| Kode lama di produksi | `/api/health` **terbuka ke publik** dengan `environment`, memori RSS, statistik cache, dan driver limiter; `X-Powered-By: Next.js` aktif; tanpa CSP; limiter login/RSVP dapat dilewati; skrip klien rusak di 36 dari 39 tema dan form RSVP `starlit-dreams` mati (F-18, F-19) |

### 10.2 Temuan baru dari pembacaan produksi

**F-29 — Migrasi produksi dalam keadaan gagal; `migrate deploy` akan berhenti (P3009).** `20260925000000_baseline_clean` tercatat `finished_at = NULL` sejak 27 Sep (kode 42710: objek sudah ada). Skrip deploy lama menutupinya dengan `migrate deploy || prisma db push`; `deploy.sh` baru sengaja tidak punya fallback itu, sehingga deploy pertama akan berhenti di langkah migrasi (aman: build dan backup sudah lewat, PM2 belum di-reload). Latihan pada replika skema produksi (dialirkan baca-saja, dimuat lokal, lalu dibuang):
- Skema produksi hanya berbeda 2 pernyataan dari `schema.prisma` terbaru: `DROP COLUMN "expiresAt"` (0 baris terisi) dan `ADD COLUMN "chargedAmount"`. Tiga migrasi sebelumnya (`baseline_clean`, `add_event_type`, `add_admin_permissions`) sudah tercermin di skema (dulu lewat `db push`) tetapi tidak tercatat.
- Prosedur terbukti pada replika: `prisma migrate resolve --applied` untuk ketiganya, lalu `prisma migrate deploy` menerapkan `add_order_charged_amount` dan `lifecycle_cleanup`; hasil: "Database schema is up to date", diff ke `schema.prisma` kosong.
- Kontrol: dari database kosong, kelima migrasi menghasilkan skema identik dengan `schema.prisma`.

**F-30 — `TRUSTED_PROXY=cloudflare` hanya benar untuk domain utama.** Caddy juga melayani domain kustom klien (Tier 3) lewat blok `on_demand_tls`, yang tidak lewat Cloudflare kita. Pengunjung domain kustom tidak membawa `cf-connecting-ip`, sehingga semua berbagi satu kunci limiter (RSVP 10 per menit untuk seluruh domain kustom). Perlu keputusan infrastruktur: Caddy menetapkan `X-Real-IP` dari `client_ip` (dengan `trusted_proxies` rentang Cloudflare) untuk semua blok, lalu `TRUSTED_PROXY=nginx`.

**F-31 — Build di tempat (`next build` menimpa `.next` yang sedang dilayani) dan RAM sempit.** Log produksi menunjukkan jendela error saat deploy (95 baris). `deploy.sh` baru tetap membangun di tempat. Belum ada staging, dan build berebut 1,9 GB dengan dua aplikasi lain.

**F-32 — Password database produksi memuat `@` mentah** (psql/libpq salah baca; aplikasi aman). Sepotong akhirnya sempat terekspos di log sesi audit; sebaiknya dirotasi dan di-encode (`%40`).

### 10.3 Skor ulang (rubrik sama, estimasi berbasis bukti)

| Dimensi | Bobot | Kode di `main` (GitHub) | Produksi yang berjalan sekarang |
|---|---|---|---|
| Build dan analisis statis | 10 | 10 | 7 (Node 20 vs CI Node 24 belum diuji; Next dengan advisori critical) |
| Pengujian otomatis | 15 | 12 | 6 (kode lama; tanpa smoke test pasca-deploy; tes integrasi lama tidak menangkap bug runtime) |
| Keamanan aplikasi | 25 | 19 (limiter domain kustom F-30 belum tuntas) | 12 (Cloudflare + sertifikat origin, HSTS, gerbang COMING_SOON, secret kuat, PG hanya localhost; tetapi Next critical, health terbuka, limiter dapat dilewati, tanpa CSP) |
| Deploy dan operasi | 20 | 12 (pipeline aman tetapi build di tempat, belum diuji di server, migrasi butuh resolve dulu) | 9 (backup harian terbukti; tetapi migrasi gagal/terblokir, jendela error saat deploy, RAM sempit, Node 20, tanpa restore drill, tanpa staging) |
| Integritas data dan logika bisnis | 15 | 14 | 8 (0 data berisiko; tetapi skrip klien rusak di produksi) |
| Maintainability dan dokumentasi | 15 | 8 | 8 |
| **Total** | **100** | **75** | **50** |

Jarak 75 ke 50 adalah pekerjaan yang sudah selesai di repo tetapi belum sampai ke server. Kode di `main` dinilai 75 (bukan 77) karena F-30 dan F-31 ditemukan setelah penilaian sebelumnya.

### 10.4 Yang kurang, berurutan

1. **Perbarui VPS** dengan prosedur di 10.5; ini menaikkan produksi dari ±50 ke ±72-75.
2. **Rotasi password database produksi** (encode `@` sebagai `%40`).
3. **Keputusan IP klien untuk domain kustom** (F-30): Caddy `X-Real-IP` + `TRUSTED_PROXY=nginx`, atau tutup celah dengan cara lain, lalu uji.
4. **Deploy tanpa jendela error** (F-31): bangun ke direktori terpisah atau di CI lalu tukar, serta cek RAM/swap sebelum build; naikkan Node ke 22 sebelum 2027.
5. **Uji pembayaran dan email nyata** dengan Midtrans sandbox dan SMTP (kunci sudah terisi, belum ada transaksi uji); uji login Google (redirect URI `luxvite.id`) dan dashboard klien di browser oleh pemilik.
6. **Observabilitas:** Sentry atau setara, serta peringatan uptime/kegagalan backup.
7. **Restore drill** dari snapshot R2 ke database sementara, terjadwal.
8. **Bersihkan objek R2 audit** (`backups/database/snapshot_2026-09-30_22-35-16_audit-drill.sql`, hanya itu; bucket adalah milik produksi).
9. **CSP mode enforce** setelah laporan bersih; utang kode (`any`, halaman 6 ribu baris, pola `featureSettings` di dashboard klien).

### 10.5 Prosedur update VPS (belum dijalankan; menunggu izin pemilik)

1. Baca-saja dulu: `git -C /home/amsdev/luxenary-invite status`, `pm2 list`, `free -m`, dan pastikan backup 03:00 terakhir ada di R2.
2. Backup manual pra-update: `pg_dump -Fc` ke luar direktori proyek (memakai `scripts/pg-env.cjs` agar password berisi `@` terbaca).
3. `git pull --ff-only` (repo server bersih; menarik 7 commit).
4. Sebelum `deploy.sh`: dengan `DATABASE_URL` produksi, jalankan `prisma migrate resolve --applied` untuk `20260925000000_baseline_clean`, `20260925065754_add_event_type`, `20260927235800_add_admin_permissions` (tepat urutan dan nama itu; sudah dilatih pada replika).
5. `./deploy.sh` pada jam sepi: `npm ci` (menghapus `node_modules` sementara), build, backup otomatis, `migrate deploy` (hanya dua migrasi baru), seed, `themes:sync`, `pm2 reload`, health check.
6. Sesudahnya: `/api/health` publik hanya `{status,timestamp}`, `X-Powered-By` hilang, header CSP-Report-Only ada, crontab memakai `data/.cron-auth`, `TRUSTED_PROXY` dibiarkan default (`cloudflare`, benar untuk domain utama), log error tidak ada baris baru.
7. Rollback **tidak cukup dengan mengembalikan kode**: model `Invitation` pada kode lama (`fd01473`) masih memuat kolom `expiresAt`, sehingga setiap query `invitations` akan gagal setelah kolom itu di-DROP. Bila perlu kembali ke kode lama: tambahkan lagi kolomnya (`ALTER TABLE "invitations" ADD COLUMN "expiresAt" TIMESTAMP(3);`, aman karena 0 baris terisi, dan kolom `orders.chargedAmount` yang nullable boleh dibiarkan) atau pulihkan dari backup pra-migrasi; baru lalu `git switch --detach fd01473`, `npm ci`, `npm run build`, `pm2 reload`. Ini belum dilatih; lakukan di replika sebelum produksi.

## 11. Status Setelah Update Produksi, Node 22, dan Uji Restore (1 Oktober 2026)

### 11.1 Keadaan produksi yang terbukti

| Area | Fakta |
|---|---|
| Kode | `main` dan server sama di `b5ca0fe`; Next 16.3.7, Prisma 7; 17 migrasi terapan. `_prisma_migrations` berisi 18 baris: satu di antaranya catatan lama `20260925000000_baseline_clean` yang gagal (42710) dan kini berstatus `rolled_back` akibat `migrate resolve`; ia tidak menghalangi `migrate deploy` |
| Runtime | `luxenary-invite` berjalan di Node 22.23.3 + npm 10.9.9 (`/home/amsdev/node22`, dipilih lewat `NODE_BIN_DIR` di `.env` server); PM2 fork mode, 1 instance. Node sistem tetap 20.20.2. Bukti: `/proc/<pid>/exe` proses yang mendengarkan port 3001 dan `pm2 jlist` (`node22.23.3`) |
| Aplikasi lain | Wisuda, wisuda-cron, pick-your-photo, pm2-logrotate: Node 20.20.2, online, tidak disentuh |
| Posisi luar | `/`, `/login`, `/api/health`: HTTP 200; halaman tidak ada: 404; `X-Powered-By` tidak ada; `Content-Security-Policy-Report-Only` ada; `/api/health` publik minimal |
| Log | Baris error baru setelah proses Node 22 aktif: 0 (22 baris sebelum dan sesudah probe). Dua baris `InvariantError /_not-found` pada 02:16 berasal dari `next build` yang menimpa `.next` saat proses lama masih melayani (F-31) |
| Paritas | Klon bersih pada Node 22.23.3 + npm 10.9.9: `npm ci`, `prisma generate`, `tsc`, `next build` exit 0; vitest 211 dari 211 lulus |
| RAM | Bebas naik dari 434 MB ke 745 MB karena instance berkurang dari 2 ke 1 |

### 11.2 Temuan baru saat eksekusi (semua ditutup, kecuali F-39 yang berupa keputusan)

- **F-33 — `deploy.sh` mengganti dirinya sendiri lewat `git pull` saat berjalan.** Bash membaca skrip bertahap, sehingga deploy pertama menjalankan sisa skrip dari versi lama (log: `current: node v20.20.2`, langkah Node 22 terlewat). Perbaikan: re-exec sekali bila `HEAD` berubah (`DEPLOY_REEXEC`), `PREVIOUS_COMMIT` diwariskan untuk pesan rollback. Diuji pada repo sementara dan di server.
- **F-34 — `PATH` Node 22 bocor ke daemon PM2 bersama.** `pm2 set` merestart modul `pm2-logrotate` dengan `PATH` pemanggil, sehingga modul itu ikut pindah ke Node 22. Perbaikan: `PATH` dikembalikan ke Node sistem sebelum blok PM2. Bukti: modul kembali ke `node20.20.2`.
- **F-35 — Deteksi interpreter selalu jatuh ke `reload`.** `pm2 jlist` mencetak teks sebelum JSON sehingga `JSON.parse` gagal. Perbaikan: potong dari `[` pertama. Bukti: deploy berikutnya memilih `delete` + `start`, dan deploy sesudahnya memilih `reload`.
- **F-36 — `dotenv.config()` di `ecosystem.config.js` menaruh rahasia di env PM2 dan `dump.pm2`.** PM2 menyimpan env pemanggil (96 kunci, dibanding 82 di aplikasi lain); `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `S3_SECRET_KEY` ikut tersimpan, dan nilainya mengalahkan `.env` Next sehingga rotasi kredensial tidak akan berlaku setelah restart. Regresi ini dibuat oleh perubahan Node 22 di sesi ini. Perbaikan: hanya `dotenv.parse` untuk `NODE_BIN_DIR`. Bukti setelah aplikasi dibuat ulang: 66 kunci, kelima kunci rahasia tidak ada, `dump.pm2` memuat 0 `DATABASE_URL`, health 200.
- **F-37 — `dotenv` dipakai tetapi tidak terdaftar** (hanya transitif via Prisma). Sekarang `devDependency`.
- **F-38 — PM2 cluster mengabaikan `interpreter`.** Diuji lokal: dua worker cluster tetap melayani dengan Node 24 padahal `interpreter` menunjuk Node 22; fork mode patuh. Akibatnya Node khusus aplikasi hanya bisa lewat fork mode (1 instance).
- **F-39 — Menaikkan Node sistem ke 22 akan merusak Wisuda dan pick-your-photo.** Keduanya memakai `better-sqlite3` yang dikompilasi untuk Node 20 (NODE_MODULE_VERSION 115); di Node 22 gagal dimuat (dibuktikan dengan memuat modulnya di kedua versi). Kerusakan baru muncul pada restart PM2 atau reboot berikutnya. Pemilik memilih fork 1 instance dengan Node khusus. Jalan kembali ke 2 instance: rebuild `better-sqlite3` di dua aplikasi itu, lalu naikkan Node sistem.

### 11.3 Uji restore backup

Dump harian hasil cron (`snapshot_2026-10-01_03-00-01_auto_daily.dump`, format custom) dipulihkan ke database sementara di VPS, lalu dibandingkan dengan `luxenary_db`:

| Pemeriksaan | Restore | Produksi |
|---|---|---|
| `pg_restore --exit-on-error` | exit 0, 2 detik | - |
| Tabel | 22 | 22 |
| Jumlah baris per tabel | tidak ada selisih | - |
| Migrasi selesai | 17 | 17 |
| Indeks | 65 | 65 |
| Foreign key | 16 | 16 |

Batas uji: produksi belum punya undangan, pengguna, atau pesanan, jadi yang terbukti adalah skema dan data konfigurasi (`admin_settings` 129, `themes` 39, `admins` 2), bukan volume. Format `.sql` lama (snapshot 26-30 September) tidak diuji. Aplikasi belum dijalankan terhadap database hasil restore. Database sementara sudah dihapus; yang tersisa hanya `luxenary_db` dan `postgres`. Empat percobaan awal gagal karena kesalahan skrip uji (user `postgres` tidak bisa membaca `/home/amsdev`, dan tanda kutip query), bukan karena backup.

### 11.4 Skor (rubrik sama; estimasi berbasis bukti)

| Dimensi | Bobot | Nilai | Dasar |
|---|---|---|---|
| Build dan analisis statis | 10 | 10 | tsc, build, vitest lolos di Node 22 dan 24 |
| Pengujian otomatis | 15 | 12 | 211 tes, rantai E2E di CI; tanpa smoke test pasca-deploy otomatis |
| Keamanan aplikasi | 25 | 19 | Health minimal, CSP-RO, limiter diperbaiki, rahasia keluar dari env PM2; F-30 (limiter domain kustom) dan password DB belum dirotasi |
| Deploy dan operasi | 20 | 14 | Update terbukti, migrasi sehat, Node 22, restore terbukti, deploy idempoten (re-entry diuji); masih build di tempat (F-31), 1 instance, tanpa monitoring/alert, tanpa staging |
| Integritas data dan logika bisnis | 15 | 14 | 0 data berisiko; alur pembayaran nyata belum diuji |
| Maintainability dan dokumentasi | 15 | 9 | Dokumen master sinkron dengan fakta; utang kode (`any`, halaman 6 ribu baris) tetap |
| **Total** | **100** | **78** | |

Angka ±79 yang sempat disebut di percakapan adalah perkiraan kasar, bukan hasil tabel. Tabel di atas yang berlaku.

### 11.5 Yang kurang, berurutan

1. **Rotasi password database** (`lux_user` pada `luxenary_db`, hanya dipakai aplikasi ini). Skrip sudah siap tetapi penulisan kredensial produksi ditolak pengaman; pemilik yang memutuskan dan menjalankan. Password baru acak tanpa `@` atau `#`.
2. **Hapus objek R2 audit** `backups/database/snapshot_2026-09-30_22-35-16_audit-drill.sql` (oleh pemilik; penghapusan permanen bukan wewenang agen).
3. **Monitoring dan alert.** Dengan 1 instance, proses mati tidak ada yang memberi tahu. Minimal cek `/api/health` dari luar dan peringatan kegagalan backup.
4. **Uji manusia end-to-end:** login Google, dashboard klien, pembayaran Midtrans sandbox, email SMTP, lalu publish dan arsip.
5. **F-30:** IP klien untuk domain kustom (Caddy `X-Real-IP` + `TRUSTED_PROXY=nginx`); Caddy dipakai bersama aplikasi lain, butuh kehati-hatian.
6. **F-31:** build di CI atau ke direktori terpisah lalu tukar, agar tidak ada jendela error saat deploy.
7. Ulangi uji restore setelah klien pertama masuk (volume data nyata), dan jadwalkan.
8. CSP mode enforce setelah laporan bersih; utang kode.

### 11.6 Pembaruan lanjutan (1 Oktober 2026, `main` dan produksi = `9134ae5`)

Yang bertambah sejak 11.4: pemulihan otomatis proses macet (`scripts/health-watch.sh`, diuji dengan `pm2` palsu, terpasang di crontab), verifikasi seluruh dokumen terhadap kode dan server lokal, dan perbaikan RSVP (status dinormalkan, batas panjang, dasbor menghitung `TIDAK_HADIR`; 235 dari 235 tes lulus, diuji lewat HTTP lokal dan di produksi dengan undangan demo).

| Dimensi | Bobot | Nilai | Perubahan dari 11.4 |
|---|---|---|---|
| Build dan analisis statis | 10 | 10 | tetap |
| Pengujian otomatis | 15 | 13 | +1: 24 tes baru (RSVP), total 235 |
| Keamanan aplikasi | 25 | 20 | +1: input RSVP divalidasi; F-30 dan password DB masih terbuka |
| Deploy dan operasi | 20 | 15 | +1: pemulihan otomatis proses macet; masih tanpa notifikasi ke pemilik |
| Integritas data dan logika bisnis | 15 | 14 | tetap (bug `TIDAK_HADIR` ditutup, alur pembayaran nyata belum diuji) |
| Maintainability dan dokumentasi | 15 | 10 | +1: dokumen diverifikasi terhadap kode; utang kode tetap |
| **Total** | **100** | **82** | |

Angka 82 adalah hasil penjumlahan tabel. Tiga penilaian (keamanan, operasi, integritas) masih estimasi karena belum terbukti oleh uji manusia dan alur nyata; batas realistis rubrik ini sekitar 90 sampai 92. Bug yang masih terbuka dari verifikasi dokumen: `innerHTML` tanpa escape di 9 tema, QR lewat `api.qrserver.com`, `::selection` kustom hanya di 12 dari 39 tema, `TAKEN_DOWN` tidak pernah diisi.

**Koreksi 5 Okt 2026 (diperiksa terhadap kode):** daftar bug di atas sebagian sudah basi. QR lewat `api.qrserver.com` sudah tidak ada (dijaga `qrEndpoint.test.ts`). Dari tema yang menyisipkan ucapan ke `innerHTML`, hanya `vintage-forest` yang masih mentah (tesnya hanya memeriksa pola `newWishItem.innerHTML`, tema ini memakai `card.innerHTML` sehingga lolos); sudah diperbaiki bersama `::selection` di 27 tema yang tertinggal, penetap `TAKEN_DOWN` (aksi admin `TAKE_DOWN`/`REOPEN`), izin modul pada bypass admin di `/api/client/**`, dan kepemilikan RSVP. Rincian di bagian 25.11 butir 15 `docs/SYSTEM_ARCHITECTURE.md`. Skor di atas belum dihitung ulang.

## 7. Cara Mengulang Audit Ini

```bash
npx tsc --noEmit
npx eslint
npx next build
export DATABASE_URL="postgresql://<user>@localhost:5432/luxenary_test?schema=public"
npx prisma migrate status
npx vitest run
npx tsx scripts/industrial-qa-suite.ts --suite=all
npm audit --omit=dev
```

Untuk probe runtime: `next start -p 3999` dengan `DATABASE_URL` yang sama, lalu curl endpoint pada tabel bagian 2, dan hentikan servernya setelah selesai.
