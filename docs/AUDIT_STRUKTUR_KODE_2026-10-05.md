# Audit Struktur Kode — 5 Oktober 2026

Penilaian struktur (keterpeliharaan, konsistensi, keamanan perubahan ke depan), bukan kesiapan fungsional. Semua angka di bawah diukur dari repositori pada tanggal ini dengan `grep`/`find`/`wc`, bukan perkiraan. Kesiapan produksi (keamanan, data, operasi) dinilai terpisah di `docs/AUDIT_KESIAPAN_PRODUKSI_2026-09-30.md` dan catatan perbaikan di `docs/SYSTEM_ARCHITECTURE.md` bagian 25.11.

## Pembaruan 6 Oktober 2026 (setelah perbaikan)

| Dimensi | 5 Okt | 6 Okt | Perubahan terukur |
|---|---|---|---|
| Otorisasi | 7 | 8.5 | Seluruh 47 route admin memakai `requireAdminModule`/`requireSuperAdmin`/`requireAnyAdmin` (0 guard inline). Path traversal ditutup di 6 route (`isSafePathSegment`). Route `/demo/preview` tanpa auth dihapus. |
| Penanganan galat & observabilitas | 6 | 8.5 | `console.*` server: 0 (route) dan 0 (lib, kecuali `participantUtils` yang ikut ke browser). 77 route memakai `routeError`. `catch` route yang membalas 500 tanpa log: 0 (dari 22). Galat tak terduga diteruskan ke Sentry bila `SENTRY_DSN` diisi; `onRequestError` menangkap galat render. |
| Keamanan tipe | 5.5 | 6 | `any` 796 → 683; `catch (x: any)` di route 125 → 7. |
| Konfigurasi & env | 5.5 | 7 | `lib/env.ts` diperiksa saat start (`instrumentation.ts`); pembacaan `process.env` masih tersebar. |
| Pengujian | 7.5 | 8 | 53 berkas, 534 tes (tambahan: `routeError`, path traversal, env, seksi hadiah). |
| Struktur frontend | 4.5 | 4.5 | Tidak berubah; lihat "Belum dikerjakan". |

**Nilai struktur keseluruhan: 7.4/10** (dari 6.7).

**Temuan nyata saat perbaikan** (rinci di `docs/SYSTEM_ARCHITECTURE.md` 25.11 butir 19):
1. Undangan pernikahan tanpa rekening, QRIS, dan alamat menampilkan rekening tetap **BCA 7330497518** atas nama mempelai di HTML terbit. Diperbaiki; HTML yang sudah terbit dibangun ulang dengan `scripts/rebake-fallback-bank.ts --apply`. Halaman bayar menampilkan "BCA" bila nama bank kosong; kini "-".
2. Path traversal di hapus portofolio (`fs.rm` rekursif), unggah/hapus aset demo, simpan data demo, serta baca portofolio dan aset demo publik.
3. `/demo/preview?id=` merender undangan apa pun tanpa pemeriksaan akses dan mengirim stack trace.
4. Berkas unggahan momen yang ditolak kuota tidak pernah dihapus (`deleteFile` menerima path relatif).
5. Melepas promo di checkout menghapus promo dari tampilan meski server menolak.

**Koreksi atas laporan 5 Oktober:**
- Status `FAILED` **pernah ditulis** (route tolak order sampai commit `ea9595d`), jadi produksi dapat menyimpan baris `FAILED` dan cabang pembacanya bukan kode mati murni. Menghapus nilai enum butuh migrasi data dengan keputusan pemetaan di mesin status pembayaran; ditunda bersama pemisahan `snapToken` sampai uji sandbox Midtrans.
- Rekomendasi 7 (memindahkan `lib/demoRegistry.ts` ke berkas data) dicabut: data demo bertipe di TypeScript justru diperiksa compiler; memindahkannya ke JSON menghilangkan pemeriksaan itu tanpa manfaat nyata.
- Rekomendasi 1 dilaksanakan tanpa pembungkus HOF: guard yang sudah ada (`requireAdminModule`) ditambah `routeError`. Signature ekspor route tidak berubah, sehingga risiko terhadap tipe route Next lebih kecil.

**Belum dikerjakan, dengan alasan:**
- **Pemecahan dasbor admin (6.190 baris) dan editor undangan (6.485 baris), serta klien API bertipe untuk 170 `fetch`.** Ini perubahan UI besar yang wajib diverifikasi di browser; aturan proyek melarang alat browser tanpa perintah eksplisit ("uji di browser"). Mengerjakannya tanpa verifikasi tampilan bertentangan dengan protokol verifikasi.
- **109 `catch` kosong sisi klien.** Sudah diklasifikasikan berdasarkan isi blok `try`: 6 jaringan (2 berdampak nyata dan diperbaiki, 4 upaya-terbaik diberi alasan), sisanya API browser yang memang boleh gagal (Fullscreen, `postMessage` ke iframe, `play()`/`pause()` media, `localStorage`, `JSON.parse` dengan nilai bawaan, `clear()` scanner) dan pemuatan kosmetik (nama platform, favicon). 28 di antaranya berada di skrip browser terbangkit (`themeEngine.ts`, `renderTemplate.ts`) yang berjalan di halaman undangan publik.
- **`jsonb` untuk `eventData`/`featureSettings`.** CHECK JSON yang sudah ada menjamin validitas; konversi ke `jsonb` menyentuh lebih dari 300 baris di 50+ berkas tanpa kebutuhan kueri yang memerlukannya. Tidak sepadan saat ini.

## 1. Ringkasan (5 Oktober 2026)

| Dimensi | Nilai | Alasan singkat |
|---|---|---|
| Lapisan & arah dependensi | 8/10 | `lib/` tidak pernah mengimpor `app/`; komponen klien tidak menyentuh Prisma/storage/auth. Logika bisnis masih banyak di dalam route. |
| Skema & integritas data | 8/10 | 21 model, 12 migrasi, enum + 29 CHECK. Sisa: JSON-di-teks (`eventData`, `featureSettings`), `orders.snapToken` dua makna, status `FAILED` yang tidak pernah ditulis. |
| Otorisasi | 7/10 | Satu sumber izin (`hasAdminPermission`), tetapi tiga gaya guard hidup berdampingan; tiga celah nyata ditemukan lagi di audit ini. |
| Penanganan galat & observabilitas | 6/10 | `logger` terstruktur ada, tetapi 142 `console.warn/error` di `app/api` dan 46 tempat mengembalikan `error.message` mentah. |
| Keamanan tipe | 5.5/10 | 796 `any` (app 507, lib 241, components 69). Jalur uang kini hampir bersih. |
| Struktur frontend | 4.5/10 | 17 berkas di atas 1.000 baris; dasbor admin 6.190 baris dengan 109 `useState`; editor undangan 6.485 baris; 170 `fetch("/api…")` tanpa klien bersama. |
| Pengujian | 7.5/10 | 49 berkas, 513 tes, integrasi ke PostgreSQL nyata, kuat di keamanan dan pembayaran. Tanpa tes UI/E2E. |
| Konfigurasi & env | 5.5/10 | `process.env` tersebar di 83 berkas, tanpa skema env yang divalidasi saat boot. |
| Operasi | 8/10 | Deploy bergantian `.next-a`/`.next-b`, backup pra-migrasi, heartbeat, smoke test. Belum terbukti penuh di VPS. |

**Nilai struktur keseluruhan: 6.7/10.** Backend dan data rapi dan teruji; utang terbesar ada di frontend (berkas raksasa) dan di konsistensi route (guard, galat, tipe). Angka ini berbeda dari skor kesiapan produksi (sekitar 90/100) karena mengukur hal lain: sistem bisa benar dan aman hari ini, sementara biaya mengubahnya besok tetap tinggi.

## 2. Ukuran terukur

| Metrik | Nilai |
|---|---|
| Route handler (`route.ts`) | 106 (47 di `app/api/admin`) |
| Halaman (`page.tsx`) | 41 |
| Modul `lib/` | 60 |
| Komponen `components/` | 19 |
| Baris kode: `app` / `lib` / `components` | 58.172 / 20.452 / 14.314 |
| Baris tema (HTML/CSS/JS, konten) | 64.410 |
| Tes | 49 berkas, 513 tes |
| `any` (app+lib+components) | 796 |
| `catch (x: any)` di route | 125 |
| `console.warn/error` di `app/api` / `lib` | 142 / 26 |
| `console.log` server | 0 (sisa hanya di skrip browser yang dibangkitkan) |
| Route mengembalikan `error.message` tanpa penjaga `NODE_ENV` | 46 tempat (sebagian besar admin) |
| Berkas `process.env` | 83 |
| Berkas TSX > 1.000 baris | 17 |

Berkas terbesar: `app/(client)/dashboard/invitation/[id]/page.tsx` 6.485, `app/(admin)/admin/page.tsx` 6.190, `lib/demoRegistry.ts` 4.916, `lib/themeEngine.ts` 3.060, `components/admin/AdminSettingsTab.tsx` 3.019.

## 3. Yang sudah baik

- **Arah dependensi bersih.** Nol impor `lib/ → app/`; nol berkas `"use client"` yang mengimpor Prisma, storage, atau `@/auth`. Batas server/klien dijaga.
- **Data dijaga database, bukan hanya kode.** Enum, CHECK rentang/JSON, transaksi untuk pelunasan, promo hold, audit. Bug konkurensi pembayaran sudah tertutup dan teruji.
- **Satu sumber izin.** `lib/adminPermissions.ts` dipakai server dan klien; modul super-admin dikunci di satu tempat.
- **Tes integrasi ke database nyata.** Tes tidak memalsukan Prisma; constraint, transaksi, dan otorisasi diuji ujung ke ujung pada `luxenary_test`.
- **Operasi.** Backup pra-migrasi, deploy tanpa jendela error, heartbeat, rotasi password DB terskrip.

## 4. Temuan nyata di audit ini (sudah diperbaiki)

1. **Hapus permanen klien tanpa izin modul.** `DELETE /api/admin/users` hanya memeriksa `isAdmin`; staf SUPPORT/FINANCE tanpa modul `users` dan sesi remote dapat menghapus klien beserta seluruh undangan dan media, tanpa catatan audit. Kini modul `users` wajib, sesi remote ditolak, dan baris DB dihapus bersama catatan `DELETE_CLIENT` dalam satu transaksi sebelum berkas fisik dibersihkan.
2. **Audit hilang saat sesi remote.** Setujui/tolak order manual dan aktivasi custom domain mencari admin lewat email session; di sesi remote itu email klien, sehingga audit dilewati diam-diam. Kini `adminActorId(session)`.
3. **Super Admin dapat menghapus akunnya sendiri dari sesi remote.** Cek diri sendiri membandingkan dengan `session.user.id` (ID klien saat remote). Kini memakai pelaku asli; buat/ubah/hapus admin satu transaksi dengan auditnya.
4. **500 senyap di route klien.** Lima route mengembalikan `err.message` mentah ke klien tanpa jejak di log server. Kini `logger.error` + pesan umum.

Dijaga `__tests__/integration/auditActor.test.ts` (9 tes, termasuk tes yang gagal pada kode lama: staf FINANCE menghapus klien mendapat 200).

**Pola akar dari keempatnya sama:** setiap route menulis ulang guard dan pencatatan sendiri. Selama pola itu ada, celah sejenis akan muncul lagi. Rekomendasi 1 di bawah menutupnya secara struktural.

## 5. Temuan terbuka (butuh keputusan atau pekerjaan terpisah)

1. **Status order `FAILED` tidak pernah ditulis.** Gateway gagal ditulis `EXPIRED` (webhook Midtrans), tolak manual ditulis `PENDING` + `rejectReason`. Cabang `FAILED → REJECTED` di `payments/status-stream` dan filter `FAILED` di beberapa route adalah kode mati. Pilihan: hapus nilai enum (migrasi) atau benar-benar memakainya untuk penolakan final. Keputusan pemilik; sama sifatnya dengan `TAKEN_DOWN` yang dulu tidak punya penetap.
2. **`promo/validate` memetakan semua galat ke 400 dengan pesannya.** Pesan bisnis memang dilempar sebagai `Error`, tetapi galat database juga akan keluar sebagai 400 berisi pesan Prisma. Perlu kelas galat bisnis tersendiri (lihat rekomendasi 1).
3. **JSON-di-teks dan `snapToken` dua makna.** Ditunda sampai uji sandbox Midtrans (lihat catatan skema).
4. **87 `catch` kosong tersisa** di skrip browser terbangkit dan komponen React; butuh uji tampilan.

## 6. Rekomendasi, urut menurut hasil per usaha

1. **Pembungkus route tunggal** (`withAdmin(modul, handler)`, `withClient(handler)`, `withPublic(handler)`): autentikasi, izin modul, penolakan sesi remote bila perlu, `adminActorId` siap pakai, pemetaan `HttpError(status, pesan)` ke respons, `logger.error` untuk galat tak terduga, dan pesan umum di produksi. Menghapus tiga gaya guard, sebagian besar dari 142 `console.*` dan 46 kebocoran `error.message`, dan kelas bug di bagian 4. Kerjakan per kelompok route dengan tes kontrak keamanan yang sudah ada sebagai jaring.
2. **Modul env tervalidasi** (`lib/env.ts`, diperiksa saat boot, gagal cepat). 83 berkas membaca `process.env` langsung; nama yang salah ketik tidak ketahuan sampai fiturnya dipakai (contoh nyata di sesi ini: variabel S3 bernama `S3_BUCKET_NAME`/`S3_ACCESS_KEY`, mudah tertukar dengan `S3_BUCKET`).
3. **Pecah dasbor admin menjadi route per tab** (`app/(admin)/admin/[tab]/page.tsx`). Tab sudah berupa komponen; yang membengkak adalah state bersama di `page.tsx` (109 `useState`). Hasilnya: kode per tab dimuat terpisah dan perubahan satu tab tidak menyentuh yang lain.
4. **Pecah editor undangan** (6.485 baris) per bagian formulir dengan reducer bersama.
5. **Klien API bertipe** (`lib/apiClient.ts`) untuk 170 panggilan `fetch` dari UI: satu tempat untuk penanganan 401/403, pesan galat, dan tipe respons.
6. **Ratchet `any`**: aktifkan `@typescript-eslint/no-explicit-any` sebagai peringatan dengan batas jumlah di CI yang hanya boleh turun.
7. **`lib/demoRegistry.ts`** (4.916 baris data di TypeScript) dipindah ke berkas data atau database.

## 7. Perubahan pendukung di sesi ini

- `adminActorId(session)` di `lib/adminAuth.ts` dipakai semua penulis audit (unlock, lifecycle, expenses, approve, reject, activate, admins, users, profile, remote session, payout pemasaran).
- 43 cast `session.user as any` di `app/api` dihapus (tipe `Session` sudah diaugmentasi di `types/next-auth.d.ts`); sisa 20 ada di halaman/komponen dan `auth.ts`.
- Cast `any` di jalur uang diganti tipe Prisma: checkout, upgrade, status-stream, webhook Midtrans/Xendit, `upgradeHelper` (`BundleItem`).
- `console.log` server di `lib/` (mailer, driveHelper, storage, videoOptimizer, databaseBackup, nasArchive, staticPublisher) diganti `logger`.

Gerbang: `tsc --noEmit` exit 0, `eslint .` exit 0, `vitest run` 513/513 (49 berkas) pada `luxenary_test`, `next build` exit 0.
