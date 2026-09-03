# LAPORAN HASIL AUDIT TEKNIS PRA-DEPLOYMENT (PRE-DEPLOYMENT AUDIT REPORT)
**Proyek:** Luxenary Invite — Platform Undangan Pernikahan Digital Multi-Tenant  
**Tanggal Audit:** 3 September 2026 (Revisi Analisis Mendalam)
**Status Evaluasi:** Menunggu Perbaikan Pra-Deploy (*Conditional Pass with Actionable Blockers*)  
**Pemeriksa:** Antigravity AI Engine (Verifikasi Empiris Tanpa Asumsi / Zero-Assertion Protocol)  

---

## DAFTAR ISI
1. [Ringkasan Eksekutif & Skor Kesiapan](#1-ringkasan-eksekutif--skor-kesiapan)
2. [Rangkuman Pengetahuan Sistem Faktual (Knowledge Base)](#2-rangkuman-pengetahuan-sistem-faktual-knowledge-base)
3. [Hasil Audit Keselarasan Dokumen Master](#3-hasil-audit-keselarasan-dokumen-master)
4. [Temuan Kritis: Blocker Deployment (P0 / High Severity)](#4-temuan-kritis-blocker-deployment-p0--high-severity)
5. [Temuan Menengah: Logika, Edge Cases & Robustness (P1 / Medium Severity)](#5-temuan-menengah-logika-edge-cases--robustness-p1--medium-severity)
6. [Temuan Minor, Linting & Hygiene (P2 / Low Severity)](#6-temuan-minor-linting--hygiene-p2--low-severity)
7. [Panduan Langkah Aksi Pra-Deployment (Actionable Checklist)](#7-panduan-langkah-aksi-pra-deployment-actionable-checklist)

---

## 1. RINGKASAN EKSEKUTIF & SKOR KESIAPAN

| Kategori Evaluasi | Status | Skor | Keterangan |
|---|---|---|---|
| **TypeScript Typecheck (`tsc`)** | ✅ PASSED | 100/100 | Exit Code 0, tidak ada type error. |
| **ESLint Compliance** | ⚠️ WARNINGS | 90/100 | 0 errors, 5 warnings (hook dependencies & location href). |
| **Kelengkapan Fitur & Arsitektur** | ✅ EXCELLENT | 98/100 | Multi-gateway, auto-cleanup, hybrid storage, email kuitansi. |
| **Sinkronisasi Dokumen Master** | ⚠️ CONDITIONAL | 92/100 | Dokumen master diperbarui, ada 4 diskrepansi faktual minor. |
| **Kesiapan Script Deployment (`deploy.sh`)** | ❌ BLOCKED | 60/100 | Migrasi DB belum mencakup enum/kolom baru; PIN secret terlewat. |

> [!WARNING]
> **PENTING SEBELUM DEPLOYMENT KE PRODUKSI:**  
> Aplikasi siap pakai secara fungsionalitas kode, namun **BELUM AMAN** untuk langsung dieksekusi via `deploy.sh` di server produksi baru sebelum **4 Temuan Kritis (P0)** diselesaikan.

---

## 2. RANGKUMAN PENGETAHUAN SISTEM FAKTUAL (KNOWLEDGE BASE)

### 2.1. Orkestrasi Multi-Payment Gateway & Dynamic Fee
- **5 Gateway Terintegrasi:** iPaymu, Midtrans Snap, Xendit Invoice, Duitku, dan Tripay.
- **Dynamic Gateway Switching:** Admin dapat mengubah gateway aktif kapan saja melalui tabel `admin_settings` (`active_payment_gateway`).
- **Pola Cancel Before Re-Init:** Kolom `gatewayId` dan `gatewayTxId` pada model `Order` mencatat provider dan ID referensi gateway sebelumnya. Ketika klien berganti metode bayar sebelum lunas, handler lama membatalkan tagihan lama sebelum inisialisasi invoice baru guna menghindari penolakan inisialisasi ulang pada gateway tujuan.
- **Dynamic Fee Logic:** Biaya layanan (`payment_gateway_fee_percent`) ditanggung oleh `BUYER` atau `MERCHANT` (`payment_fee_payer`). Nilai dasar paket disimpan pada `Order.amount`, dan penambahan fee dihitung saat inisialisasi transaksi tanpa mengakibatkan akumulasi fee berlipat.

### 2.2. Manajemen Siklus Hidup & Retensi 3 Fase
- **Fase 1 (H+7 Grace Days):** 
  - Status undangan beralih dari `PUBLISHED` ke `EVENT_FINISHED`.
  - File statis subdomain (`public/published/subdomains/{subdomain}.html`) dihapus agar akses otomatis beralih ke rute galeri memori (`/memories`).
  - Data formulir RSVP kadaluarsa dihapus dari database.
- **Fase 2 (H+30 Hari / `galleryExpiresAt`):**
  - File foto memori tamu di Cloudflare R2 dan folder lokal dibersihkan permanen.
  - Upload dikunci (`memoriesUploadLocked = true`).
  - Status beralih ke `ARCHIVED`.
  - Nilai `subdomain` diset menjadi `null` (dilepaskan kembali ke pool subdomain agar dapat digunakan oleh pasangan baru).
- **Fase 3 (H+365 Hari):**
  - Pembersihan menyeluruh akun klien non-aktif beserta media dan portofolio terkait.

### 2.3. Penyimpanan Data Hibrida & Static HTML Baking
- **Dual-Storage Engine:** Mendukung `STORAGE_PROVIDER="local"` (disimpan di `public/uploads/`) dan `STORAGE_PROVIDER="r2"` atau `"s3"` (AWS S3 SDK Client).
- **Deteksi Otomatis Magic Bytes:** Upload file tidak mempercayai `mimeType` dari klien; sistem memvalidasi *header* biner asli menggunakan *magic bytes* (JPEG/PNG/WebP/GIF) di sisi server untuk keamanan ekstra.
- **Baking Standalone HTML:** Mengompilasi tema menjadi berkas statis di `public/published/` untuk performa instan tanpa beban komputasi runtime SSR pada saat dibuka oleh ribuan tamu undangan.

---

## 3. HASIL AUDIT KESELARASAN DOKUMEN MASTER

Dokumen master ([SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md), [README.md](./README.md), [S-Invitation.md](./S-Invitation.md)) telah diperbarui secara besar-besaran. Hasil inspeksi baris-per-baris menemukan **4 diskrepansi faktual**:

### 1. Struktur Path Publikasi HTML
- **Tertulis di Dokumen:** `public/published/{subdomain}.html` dan `public/published/{invitationSlug}.html` ([SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)).
- **Faktual Kode:** Disimpan ke dalam subfolder terpisah:
  - `public/published/subdomains/{subdomain}.html` ([lib/staticPublisher.ts:111](./lib/staticPublisher.ts#L111))
  - `public/published/slugs/{invitationSlug}.html` ([lib/staticPublisher.ts:116](./lib/staticPublisher.ts#L116))
  - `public/published/ids/{id}.html` ([lib/staticPublisher.ts:120](./lib/staticPublisher.ts#L120))

### 2. Signature Fungsi `getPermanentPathUrl`
- **Tertulis di Dokumen:** `getPermanentPathUrl("dimas-clarissa-030326")` (1 argumen flat slug, format lama dinyatakan sudah tidak ada, [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)).
- **Faktual Kode:** Di [lib/domainUtils.ts:107](./lib/domainUtils.ts#L107), fungsi masih mempertahankan signature legacy 4 argumen:
  ```typescript
  export function getPermanentPathUrl(
    groomSlug: string,
    brideSlug: string,
    invitationSlug: string,
    guestSlug?: string
  ): string
  ```
  Fungsi ini belum disederhanakan mengikuti spesifikasi flat canonical slug.

### 3. Ketidaksesuaian Strategi Sinkronisasi Database
- **Tertulis di Dokumen:** `npx prisma db push` ([README.md](./README.md)).
- **Faktual Kode:** Script [deploy.sh:69](./deploy.sh#L69) menggunakan `npx prisma migrate deploy`.

### 4. Nomenklatur Variabel Lingkungan S3 / R2
- **Tertulis di Dokumen:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` ([README.md](./README.md)).
- **Faktual Kode:** [lib/storage.ts:10-18](./lib/storage.ts#L10-L18) dan [.env.example:70-76](./.env.example#L70-L76) membaca standar AWS SDK:
  `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`, `S3_PUBLIC_URL`, `S3_CUSTOM_DOMAIN`.

---

## 4. TEMUAN KRITIS: BLOCKER DEPLOYMENT (P0 / HIGH SEVERITY)

### 🔴 Temuan Kritis #1: Migrasi Database Belum Mencakup Enum & Kolom Baru
- **File Terdampak:**
  - [prisma/schema.prisma:75, 114, 136-139](./prisma/schema.prisma#L75)
  - [prisma/migrations/](./prisma/migrations)
  - [deploy.sh:69](./deploy.sh#L69)
- **Kondisi Faktual:**
  Model Prisma mendefinisikan enum `OrderType`, `InvitationStatus`, dan kolom baru seperti `galleryExpiresAt`. Namun folder `prisma/migrations/` belum memiliki berkas migrasi untuk perubahan ini.
- **Dampak Fatal di Server Produksi:**
  Jika dieksekusi dengan `npx prisma migrate deploy` di server, tabel PostgreSQL tidak akan sinkron dengan schema. Saat fitur perpanjangan galeri atau cron digunakan, sistem akan *crash* dengan *Error: column does not exist*.
- **Solusi yang Harus Diambil:**
  Buat file migrasi Prisma baru atau ubah `deploy.sh` menjadi `npx prisma db push`.

---

### 🔴 Temuan Kritis #2: `deploy.sh` Tidak Men-generate `PIN_ENCRYPTION_KEY`
- **File Terdampak:** [deploy.sh:20-60](./deploy.sh#L20-L60), [lib/pinEncryption.ts:17-29](./lib/pinEncryption.ts#L17-L29)
- **Kondisi Faktual:**
  Sistem perlindungan enkripsi PIN Resepsionis mewajibkan adanya `PIN_ENCRYPTION_KEY` di *environment production*. Namun, *script* `deploy.sh` lupa meng-generate variabel tersebut (kosong).
- **Dampak Fatal di Server Produksi:**
  Setiap *request* PIN oleh staf tamu undangan akan menghasilkan HTTP 500 karena sistem menolak berjalan tanpa kunci enkripsi.
- **Solusi yang Harus Diambil:**
  Tambahkan generator `PIN_ENCRYPTION_KEY=$(openssl rand -hex 32)` di `deploy.sh`.

---

### 🔴 Temuan Kritis #3: Middleware Rewrite Menghalangi Fallback Route Dinamis
- **File Terdampak:** [middleware.ts:113, 217](./middleware.ts#L113)
- **Kondisi Faktual:**
  `NextResponse.rewrite` digunakan untuk mengarahkan rute ke berkas statis `published/subdomains/...html`. Namun Next.js App Router tidak memiliki *fallback* dinamis ke route asal jika file statis hilang.
- **Dampak di Server Produksi:**
  Saat cron H+7 menghapus file HTML untuk melepaskan subdomain, tamu akan mendapati layar 404 mentah, bukannya diarahkan ke galeri `/memories` otomatis oleh route statis.
- **Solusi yang Harus Diambil:**
  Tulis ulang *middleware* agar melakukan *rewrite* ke route handler internal (`/s/[subdomain]`), bukan langsung *hardcode* menunjuk ke ekstensi `.html`.

---

### 🔴 Temuan Kritis #4: Next.js Image Component Crash pada Cloudflare R2 / AWS S3
- **File Terdampak:** [next.config.ts](./next.config.ts), [app/components/features/GuestMomentClient.tsx:154, 213, 332](./app/components/features/GuestMomentClient.tsx#L154)
- **Kondisi Faktual:**
  Komponen `next/image` (`<Image src={...} />`) digunakan untuk me-render foto tamu dan *cover*. Namun, file `next.config.ts` tidak mendaftarkan `images.remotePatterns`.
- **Dampak Fatal di Server Produksi:**
  Jika admin beralih ke penyimpanan Cloudflare R2 (`STORAGE_PROVIDER=r2`), komponen `<Image>` akan menyebabkan aplikasi *crash* dengan *unhandled runtime error*: `Invalid src prop... Hostname is not configured under images`.
- **Solusi yang Harus Diambil:**
  Tambahkan blok `images` di `next.config.ts` untuk mengizinkan domain `https://*`.

---

## 5. TEMUAN MENENGAH: LOGIKA, EDGE CASES & ROBUSTNESS (P1 / MEDIUM SEVERITY)

### 🟡 Temuan #5: Webhook iPaymu Rentan SyntaxError pada Form-UrlEncoded
- **File Terdampak:** [app/api/webhook/ipaymu/route.ts:52-53](./app/api/webhook/ipaymu/route.ts#L52-L53)
- **Kondisi Faktual:** Menggunakan `JSON.parse(await req.text())`. Jika iPaymu mengirim data *application/x-www-form-urlencoded*, server akan merespons 500 karena gagal *parsing*.
- **Rekomendasi:** Gunakan deteksi otomatis tipe konten (*content-type*) seperti di integrasi Duitku.

### 🟡 Temuan #6: Endpoint Public RSVP Tidak Memvalidasi Status Undangan
- **File Terdampak:** [app/api/public/rsvp/route.ts:60-67](./app/api/public/rsvp/route.ts#L60-L67)
- **Kondisi Faktual:** Endpoint ini belum memblokir pengisian tamu untuk undangan dengan status `EVENT_FINISHED` atau `ARCHIVED`.
- **Rekomendasi:** Tolak form RSVP dengan kode status 410 (Gone) jika masa pengisian sudah ditutup.

### 🟡 Temuan #7: Nomor WhatsApp Admin Belum Disanitasi (Format Invalid)
- **File Terdampak:** [app/(client)/dashboard/invitation/[id]/page.tsx:946, 989](./app/(client)/dashboard/invitation/[id]/page.tsx#L946)
- **Kondisi Faktual:** URL kontak menggunakan format mentah `wa.me/${adminWhatsapp}`. Jika nomor admin diawali dengan "08..." atau memuat tanda baca "-", URL tidak akan berfungsi.
- **Rekomendasi:** Lakukan regex sanitasi `.replace(/^0/, '62')`.

### 🟡 Temuan #8: Potensi Exhaustion Koneksi Database (Prisma Pooling)
- **File Terdampak:** [lib/prisma.ts](./lib/prisma.ts), [.env.example](./.env.example)
- **Kondisi Faktual:** Jika di-deploy dengan trafik sangat padat, default 10 *connection pool* mungkin tidak cukup tanpa pengelola eksternal (*connection pgbouncer*).
- **Rekomendasi:** Dokumentasikan instruksi penambahan parameter `?connection_limit=30` atau `&pgbouncer=true` di `DATABASE_URL`.

---

## 6. TEMUAN MINOR, LINTING & HYGIENE (P2 / LOW SEVERITY)

1. **Peringatan Navigasi Internal Next.js:**  
   [components/client/MemoriesDownloadSection.tsx:40](./components/client/MemoriesDownloadSection.tsx#L40) menggunakan `window.location.href = '/checkout?order=...'`. Disarankan menggunakan `useRouter().push()`.
2. **Missing Dependency Hook:**  
   `useEffect` pada [AdminPortfolioTab.tsx](./components/admin/AdminPortfolioTab.tsx#L44) dan [ReceptionistScannerClient.tsx](./app/components/features/ReceptionistScannerClient.tsx#L241) kehilangan array dependensi lengkap yang memicu peringatan ESLint.
3. **Data Awal Seed Kedaluwarsa:**  
   [prisma/seed.ts](./prisma/seed.ts) masih mencoba membuat data admin di model `User`, padahal sistem autentikasi sudah dipisah menggunakan model `Admin`. Ini akan gagal jika `npx prisma db seed` dijalankan di VPS.

---

## 7. PANDUAN LANGKAH AKSI PRA-DEPLOYMENT (ACTIONABLE CHECKLIST)

Sebelum melakukan deployment ke server produksi, jalankan tahapan verifikasi berikut:

```bash
# 1. Update deploy.sh agar meng-generate PIN_ENCRYPTION_KEY otomatis
# (Tambahkan openssl rand -hex 32)

# 2. Sinkronisasi Skema Database ke PostgreSQL
# Pastikan Anda telah memperbaiki file migrasi atau cukup gunakan db push
npx prisma db push

# 3. Perbaiki next.config.ts untuk mendukung Cloudflare R2 images

# 4. Verifikasi Ulang Typecheck & Build Lokal
npx tsc --noEmit
npm run build
```

---
*Dokumen ini disusun sebagai panduan objektif dan komprehensif bagi Administrator dan Tim Pengembang Luxenary Invite sebelum mengeksekusi rilis publik.*
