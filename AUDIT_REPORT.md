# LAPORAN HASIL AUDIT TEKNIS PRA-DEPLOYMENT (PRE-DEPLOYMENT AUDIT REPORT)
**Proyek:** Luxenary Invite — Platform Undangan Pernikahan Digital Multi-Tenant  
**Tanggal Audit:** 3 September 2026  
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
> Aplikasi siap pakai secara fungsionalitas kode, namun **BELUM AMAN** untuk langsung dieksekusi via `deploy.sh` di server produksi baru sebelum **Temuan Kritis #1** (Migrasi DB) dan **Temuan Kritis #2** (Secret Key di deploy.sh) diselesaikan.

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
  Model Prisma mendefinisikan:
  - Enum `OrderType`: `NEW | UPGRADE | GALLERY_EXTENSION`
  - Enum `InvitationStatus`: `DRAFT | PUBLISHED | EVENT_FINISHED | TAKEN_DOWN | ARCHIVED`
  - Kolom pada model `Invitation`:
    - `isLockedPermanently Boolean @default(false)`
    - `adminUnlockedUntil DateTime?`
    - `memoriesUploadLocked Boolean @default(false)`
    - `galleryExpiresAt DateTime?`
  Namun di dalam folder `prisma/migrations/`, hanya ada 2 file migrasi:
  1. `20260902090716_init` (belum ada kolom di atas dan enum masih versi lama)
  2. `20260902215712_add_gateway_tracking_to_order` (hanya menambah `gatewayId` dan `gatewayTxId` pada `orders`)
- **Dampak Fatal di Server Produksi:**
  Jika VPS baru menjalankan `deploy.sh` (yang menjalankan `npx prisma migrate deploy`), tabel `invitations` di PostgreSQL tidak akan memiliki kolom `galleryExpiresAt` dan `memoriesUploadLocked`. Begitu klien checkout perpanjangan galeri atau cron Fase 1 berjalan, query PostgreSQL akan langsung gagal dengan error:
  `column "galleryExpiresAt" does not exist` atau `invalid input value for enum OrderType: "GALLERY_EXTENSION"`.
- **Solusi yang Harus Diambil:**
  Buat file migrasi Prisma baru atau ubah baris 69 di `deploy.sh` menjadi `npx prisma db push` sesuai petunjuk di README.

---

### 🔴 Temuan Kritis #2: `deploy.sh` Tidak Men-generate `PIN_ENCRYPTION_KEY`
- **File Terdampak:**
  - [deploy.sh:20-60](./deploy.sh#L20-L60)
  - [lib/pinEncryption.ts:17-29](./lib/pinEncryption.ts#L17-L29)
  - [.env.example:43](./.env.example#L43)
- **Kondisi Faktual:**
  Di [lib/pinEncryption.ts:20-22](./lib/pinEncryption.ts#L20-L22):
  ```typescript
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[CRITICAL] PIN_ENCRYPTION_KEY tidak diset di environment production!");
    }
  }
  ```
  Di `deploy.sh`, script otomatis men-generate:
  - `AUTH_SECRET`
  - `NEXTAUTH_SECRET`
  - `CRON_SECRET`
  Namun penanganan untuk `PIN_ENCRYPTION_KEY` **terlewatkan** dan dibiarkan kosong `""`.
- **Dampak Fatal di Server Produksi:**
  Saat aplikasi berjalan di server dengan `NODE_ENV="production"`, setiap kali ada request yang membaca atau menyimpan `staffPin` resepsionis, server akan melempar unhandled exception dan mengembalikan HTTP 500.
- **Solusi yang Harus Diambil:**
  Tambahkan blok generator `PIN_ENCRYPTION_KEY` di `deploy.sh` menggunakan `openssl rand -hex 32`.

---

### 🔴 Temuan Kritis #3: Middleware Rewrite Menghalangi Fallback Route Dinamis
- **File Terdampak:**
  - [middleware.ts:113, 217](./middleware.ts#L113)
  - [app/(public)/[slug]/route.ts](./app/(public)/[slug]/route.ts)
  - [app/(public)/s/[subdomain]/route.ts](./app/(public)/s/[subdomain]/route.ts)
- **Kondisi Faktual:**
  Di `middleware.ts`:
  ```typescript
  // Baris 113:
  const rewriteUrl = new URL(`/published/subdomains/${subdomain}.html`, req.url);
  return NextResponse.rewrite(rewriteUrl);

  // Baris 217:
  const rewriteUrl = new URL(`/published/slugs/${slug}.html`, req.url);
  return NextResponse.rewrite(rewriteUrl);
  ```
  Dalam Next.js App Router, pemanggilan `NextResponse.rewrite` ke path berkas statis (`/published/...`) jika berkas fisiknya **tidak ada di disk**, Next.js **tidak** akan melakukan fallback ke handler `app/(public)/s/[subdomain]/route.ts` atau `app/(public)/[slug]/route.ts`. Next.js langsung menyajikan `404 Not Found`.
- **Dampak di Server Produksi:**
  Ketika Cron Fase 1 (H+7) menghapus file `subdomains/${subdomain}.html` melalui `deleteSubdomainHtmlOnly`, tamu yang membuka URL subdomain akan mendapati halaman 404 mentah, bukannya diarahkan secara otomatis ke `/memories` oleh route handler `s/[subdomain]/route.ts`.
- **Solusi yang Harus Diambil:**
  Di `middleware.ts`, lakukan rewrite ke route handler internal Next.js (misalnya `/s/${subdomain}` atau biarkan `NextResponse.next()` menangani kanonikal slug), di mana route handler yang bersangkutan sudah memiliki logika fallback statis dan redirect status `EVENT_FINISHED` / `ARCHIVED`.

---

## 5. TEMUAN MENENGAH: LOGIKA, EDGE CASES & ROBUSTNESS (P1 / MEDIUM SEVERITY)

### 🟡 Temuan #4: Webhook iPaymu Rentan SyntaxError pada Form-UrlEncoded
- **File Terdampak:** [app/api/webhook/ipaymu/route.ts:52-53](./app/api/webhook/ipaymu/route.ts#L52-L53)
- **Kondisi Faktual:**
  ```typescript
  const rawBody = await req.text();
  const body = JSON.parse(rawBody);
  ```
  Jika IPN/callback iPaymu dikirimkan dalam format `application/x-www-form-urlencoded` (format umum iPaymu pada beberapa integrasi), `JSON.parse` akan gagal melempar exception dan berakhir dengan respons HTTP 500.
- **Rekomendasi:** Terapkan parsing adaptif berbasis `content-type` seperti pada [app/api/webhook/duitku/route.ts:39-45](./app/api/webhook/duitku/route.ts#L39-L45).

---

### 🟡 Temuan #5: Endpoint Public RSVP Tidak Memvalidasi Status Undangan
- **File Terdampak:** [app/api/public/rsvp/route.ts:60-67](./app/api/public/rsvp/route.ts#L60-L67)
- **Kondisi Faktual:**
  Endpoint POST `/api/public/rsvp` hanya memverifikasi keberadaan record `invitation` tanpa memeriksa `invitation.status`.
- **Rekomendasi:** Tambahkan validasi:
  ```typescript
  if (invitation.status === "EVENT_FINISHED" || invitation.status === "ARCHIVED" || invitation.status === "TAKEN_DOWN") {
    return NextResponse.json({ error: "Masa pengisian RSVP untuk acara ini telah ditutup." }, { status: 410 });
  }
  ```

---

### 🟡 Temuan #6: Nomor WhatsApp Admin di Halaman Undangan Belum Disanitasi
- **File Terdampak:** [app/(client)/dashboard/invitation/[id]/page.tsx:946, 989](./app/(client)/dashboard/invitation/[id]/page.tsx#L946)
- **Kondisi Faktual:**
  Tombol hubungi admin darurat menggunakan `href={`https://wa.me/${adminWhatsapp}?text=...`}`. Jika admin menyimpan nomor berawalan `08...` atau memuat tanda hubung `-`, tautan WhatsApp menjadi invalid.
- **Rekomendasi:** Sanitasi nomor dengan `.replace(/\D/g, '').replace(/^0/, '62')` seperti yang sudah diterapkan pada halaman checkout dan guest.

---

### 🟡 Temuan #7: Stale Closure pada Hook SSE Checkout
- **File Terdampak:** [app/checkout/page.tsx:297, 320](./app/checkout/page.tsx#L297)
- **Kondisi Faktual:**
  `currentOrderType` digunakan di dalam listener `eventSource.onmessage`, tetapi tidak terdaftar di dependency array `useEffect` (peringatan ESLint `react-hooks/exhaustive-deps`).
- **Rekomendasi:** Tambahkan `currentOrderType` ke dalam array dependensi `useEffect`.

---

### 🟡 Temuan #8: Scope Singleton `paymentEmitter` di Lingkungan Produksi
- **File Terdampak:** [lib/paymentEvents.ts:15-17](./lib/paymentEvents.ts#L15-L17)
- **Kondisi Faktual:**
  ```typescript
  if (process.env.NODE_ENV !== "production") {
    global.paymentEmitter = paymentEmitter;
  }
  ```
  Di mode produksi Next.js standalone, bundler dapat membagi rute webhook dan status-stream ke dalam chunk berbeda sehingga instance lokal terisolasi.
- **Rekomendasi:** Ikat `global.paymentEmitter` tanpa memandang nilai `NODE_ENV`.

---

## 6. TEMUAN MINOR, LINTING & HYGIENE (P2 / LOW SEVERITY)

1. **Peringatan Navigasi Internal Next.js:**  
   [components/client/MemoriesDownloadSection.tsx:40](./components/client/MemoriesDownloadSection.tsx#L40) menggunakan `window.location.href = '/checkout?order=...'`. Disarankan menggunakan `useRouter().push()` untuk menjaga Single Page Application state.
2. **Missing Dependency Hook:**  
   [components/admin/AdminPortfolioTab.tsx:44](./components/admin/AdminPortfolioTab.tsx#L44) memanggil `fetchPortfolios` di dalam `useEffect` tanpa array dependensi lengkap.
3. **Missing Dependency Hook Scanner:**  
   [app/components/features/ReceptionistScannerClient.tsx:241](./app/components/features/ReceptionistScannerClient.tsx#L241) belum menyertakan `processScanToken`.
4. **Data Awal Seed Belum Menyesuaikan Model Admin Baru:**  
   [prisma/seed.ts](./prisma/seed.ts) masih menyertakan 5 tema lama dan seeding admin pada model `User`, padahal sistem admin otentikasi produksi menggunakan model `Admin` pada tabel `admins`.

---

## 7. PANDUAN LANGKAH AKSI PRA-DEPLOYMENT (ACTIONABLE CHECKLIST)

Sebelum melakukan deployment ke server produksi, jalankan tahapan verifikasi berikut:

```bash
# 1. Sinkronisasi Skema Database ke PostgreSQL
npx prisma migrate dev --name sync_lifecycle_and_gallery_fields
# ATAU jika menggunakan db push:
npx prisma db push

# 2. Update deploy.sh agar meng-generate PIN_ENCRYPTION_KEY otomatis
# Tambahkan baris generator: openssl rand -hex 32 untuk PIN_ENCRYPTION_KEY

# 3. Verifikasi Ulang Typecheck & Build Lokal
npx tsc --noEmit
npm run build
```

---
*Dokumen ini disusun sebagai panduan objektif dan komprehensif bagi Administrator dan Tim Pengembang Luxenary Invite sebelum mengeksekusi rilis publik.*
