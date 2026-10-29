# Matriks Uji Go-Live v1.0.0

Diperbarui 29 Oktober 2026. Status setiap alur sebelum rilis produksi pertama, beserta buktinya. "Lulus lokal" berarti teruji di MacBook pengembang dengan build produksi (`next build` + `next start`), bukan di VPS.

## 1. Sudah teruji

| Alur | Cara uji | Hasil |
|---|---|---|
| Pesan paket sampai undangan terbit, tamu, RSVP, check-in, momen, ekspor | `scripts/e2e-golive.ts` terhadap build produksi lokal, bucket Cloudflare R2 asli | 33/33 lulus; data uji dan objek R2 terhapus bersih |
| Alur yang sama dengan penyimpanan lokal | `scripts/e2e-golive.ts`, `STORAGE_PROVIDER=local` | 27/27 lulus (6 pemeriksaan khusus R2 tidak berlaku) |
| Pembayaran transfer manual + persetujuan admin | `e2e-golive.ts --payment=manual` | Lulus |
| Pembayaran gateway | Checkout gateway, lalu pelunasan lewat fungsi webhook | Lulus sebagai simulasi; transaksi Midtrans/Xendit sungguhan belum (lihat bagian 2) |
| Unggahan media ditolak setelah terbit | `e2e-golive.ts` + `__tests__/integration/uploadStudioLock.test.ts` | Lulus |
| Hapus berkas undangan di R2 (klien dihapus, reset jenis acara, arsip) | `__tests__/unit/deleteInvitationBucketObjects.test.ts`, pembersihan `e2e-golive.ts` pada bucket asli | Lulus |
| Logo vendor dan QRIS tetap ada di portofolio setelah arsip | `__tests__/integration/portfolioMetadata.test.ts` | Lulus |
| Subdomain undangan (`<nama>.<root>`) dalam mode produksi | Build produksi lokal dengan `*.localhost` | Lulus |
| Pemasangan server baru, pembaruan, dan rollback otomatis `deploy.sh` | Sandbox dari clone bersih `main` ke database kosong | Lulus; build gagal memulihkan rilis sebelumnya |
| Cron backup dan pembersihan siklus hidup | Pemanggilan dengan `data/.cron-auth` | Lulus setelah perbaikan secret (`de1f30b`) |
| Email (notifikasi, uji SMTP) | SMTP sink lokal | Lulus; penyedia SMTP sungguhan belum |
| Kompresi video dan musik | ffmpeg 9.0.2 | Lulus |
| Tampilan klien dan admin | Peramban di 320, 375, dan 1440 px | Lulus, tanpa gulir horizontal |
| Unit dan integrasi | `npx vitest run` pada `luxenary_test` | 123 berkas, 1284 tes lulus |
| Tipe dan lint | `npx tsc --noEmit`, `npx eslint` | Exit 0 |
| Skrip audit (`hygiene`, `security`, `stress`, `themes`, `nas`, dan lainnya) | Rangkaian skrip `scripts/` | 13 dari 14 lulus. `integrity` gagal hanya karena tema uji lokal `uji-builder-lengkap` (tidak ikut git, tanpa thumbnail) |

## 2. Belum bisa diuji sebelum VPS siap

| Alur | Alasan | Cara uji setelah deploy |
|---|---|---|
| TLS wildcard Caddy dan DNS subdomain asli | Butuh domain dan server | Buka `https://<subdomain>.<domain>` dari ponsel di jaringan seluler |
| Purge cache Cloudflare | Uji lokal wajib mengosongkan `CF_ZONE_ID`/`CF_API_TOKEN` (pernah memurge zona produksi) | Terbitkan ulang undangan, lalu cek header `cf-cache-status` |
| Transaksi Midtrans/Xendit sungguhan | Kunci gateway belum diisi; checkout tanpa kunci menghasilkan 500 dengan pesan umum untuk klien | Mode sandbox gateway, bayar satu order, pastikan webhook mengubah status menjadi PAID |
| Penyedia SMTP sungguhan | Hanya diuji ke SMTP sink | Tombol uji SMTP di Admin > Pengaturan > Integrasi |
| Login Google di domain produksi | Redirect URI OAuth terikat domain | Login klien baru dari domain produksi |
| Backup ke bucket privat | `S3_BACKUP_BUCKET_NAME` masih kosong | Isi env, jalankan cron backup, cek objek di bucket |
| Arsip NAS | NAS belum tersedia; arsip tidak bergantung padanya | Saat NAS siap, jalankan `npm run test:nas` di server |
| PM2 cluster lebih dari satu worker | Diuji satu proses | Bayar order sementara halaman checkout terbuka; status harus berubah tanpa muat ulang |

## 3. Menjalankan uji go-live di server

Setelah `deploy.sh` selesai, jalankan di mesin server (skrip membaca `.env` yang sama dengan aplikasi):

```bash
E2E_ADMIN=<username-admin> E2E_ADMIN_PASSWORD=<password-admin> APP_URL=http://127.0.0.1:3001 NEXT_PUBLIC_ROOT_DOMAIN=<domain> npx tsx scripts/e2e-golive.ts --allow-production
```

- Skrip membuat satu pengguna, order, dan undangan uji bertanda `e2e-golive-<waktu>`, lalu menghapusnya per id di akhir, juga bila ada langkah yang gagal.
- Pembayaran mengikuti `payment_mode` platform. Pada mode GATEWAY, order uji dilunasi lewat fungsi webhook (simulasi), bukan transaksi sungguhan.
- Email persetujuan dikirim ke alamat `@t.local` milik pengguna uji, sehingga dapat tercatat sebagai bounce di penyedia SMTP.
- Keluar dengan kode 1 bila ada pemeriksaan yang GAGAL. Jangan membuka pendaftaran klien sebelum hasilnya lulus.
