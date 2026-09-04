# PLATFORM UNDANGAN (WHITE-LABEL) — DOKUMENTASI ARSITEKTUR SISTEM
## Versi: 5.2.0 | Diperbarui: 03 September 2026

> **SUMBER KEBENARAN TUNGGAL** untuk semua developer dan AI Agent yang bekerja di repositori ini.  
> Dokumen ini WAJIB dibaca sebelum melakukan perubahan apapun pada kode.  
> Ditulis berdasarkan audit empiris langsung terhadap kode sumber aktual, bukan asumsi.  
> Quick start: lihat [`README.md`](./README.md) untuk setup lokal dan panduan singkat.

---

## DAFTAR ISI
1. [Fondasi Infrastruktur](#1-fondasi-infrastruktur)
2. [Struktur Folder Aktual](#2-struktur-folder-aktual)
3. [Arsitektur URL & Routing](#3-arsitektur-url--routing)
4. [Mesin Publikasi Statis](#4-mesin-publikasi-statis)
5. [Sistem Penyimpanan Media](#5-sistem-penyimpanan-media)
6. [Siklus Hidup Undangan](#6-siklus-hidup-undangan)
7. [Sistem Subdomain](#7-sistem-subdomain)
8. [Tema & Template Engine](#8-tema--template-engine)
9. [Autentikasi & Otorisasi](#9-autentikasi--otorisasi)
10. [API Route Map](#10-api-route-map)
11. [Skema Database](#11-skema-database)
12. [File yang Tidak Terpakai / Warisan Google Drive](#12-file-yang-tidak-terpakai--warisan-google-drive)
13. [Panduan Kerja Agent AI (Mandatory Reading)](#13-panduan-kerja-agent-ai-mandatory-reading)
14. [Sistem Portofolio Mandiri](#14-sistem-portofolio-mandiri)
15. [Orkestrasi Multi-Payment Gateway & Dynamic Fee](#15-orkestrasi-multi-payment-gateway--dynamic-fee)
16. [Sistem Notifikasi Email & Faktur Transaksi](#16-sistem-notifikasi-email--faktur-transaksi)

---

## 1. FONDASI INFRASTRUKTUR

| Komponen | Detail |
|---|---|
| **Framework** | Next.js 16.3.2 (App Router, TypeScript strict) |
| **Runtime** | Node.js di VPS (bukan Vercel/Edge Function) |
| **Database** | PostgreSQL via Prisma ORM + `@prisma/adapter-pg` |
| **ORM** | Prisma v7.9.1 (Konfigurasi URL via `prisma.config.ts`, bukan schema) |
| **Autentikasi** | NextAuth v5 (Auth.js Beta 32) |
| **Penyimpanan Media** | Dual Mode: Cloudflare R2 (produksi) + Local `/uploads/` (development) via `lib/storage.ts` |
| **Image Processing** | `sharp` v0.35.3 (WebP compression, resize, auto-rotate, sharpening) |
| **Manajemen Proses** | PM2 |
| **Middleware** | `middleware.ts` di root (Edge-compatible, async) |

---

## 2. STRUKTUR FOLDER AKTUAL

```
/ (Root Project)
├── app/
│   ├── (admin)/              # Panel Admin (dilindungi role ADMIN/SUPER_ADMIN)
│   │   └── admin/page.tsx    # Single-page admin dashboard (10 Tab terintegrasi)
│   │
│   ├── (client)/             # Area Client yang sudah login
│   │   └── dashboard/
│   │       ├── page.tsx      # Dashboard utama client
│   │       ├── layout.tsx    # Layout dengan sidebar navigasi
│   │       ├── guests/       # Manajemen daftar tamu (+62 auto-format)
│   │       ├── invitation/   # Setup undangan (new, edit)
│   │       ├── rsvp/         # Manajemen RSVP & ucapan
│   │       ├── settings/     # Pengaturan subdomain, custom domain, PIN, publish
│   │       └── setup/        # Onboarding flow baru (redirect jika belum ada inv)
│   │
│   ├── (public)/             # Halaman publik (tanpa autentikasi)
│   │   ├── [slug]/           # ← CANONICAL ROUTE UTAMA (flat slug baru)
│   │   │   ├── page.tsx      # Serve undangan HTML (dimas-clarissa-030326)
│   │   │   ├── route.ts      # Redirect pintar (EVENT_FINISHED → memories, ARCHIVED → portfolio/graceful)
│   │   │   ├── memories/     # Galeri momen tamu (real-time SSE)
│   │   │   ├── sharemoment/  # Upload foto tamu (real-time)
│   │   │   └── galery/       # Alias untuk memories
│   │   └── s/[subdomain]/    # Sub-routes untuk fitur interaktif via subdomain
│   │       ├── page.tsx      # Serve undangan via subdomain (DB query fallback)
│   │       ├── memories/     # Galeri via subdomain
│   │       ├── sharemoment/  # Upload via subdomain
│   │       └── receptionist/ # Scanner QR tamu (dilindungi PIN)
│   │
│   ├── api/                  # Semua REST API endpoint
│   │   ├── admin/            # overview, orders, themes, settings, portfolio, invitations/[id]/lifecycle
│   │   ├── client/           # invitations, guests, media, rsvps, upload, memories/extend
│   │   ├── public/           # settings, themes, rsvp, memories, resolve-custom-domain, version
│   │   ├── payments/         # checkout, status-stream
│   │   ├── orders/           # create invoice
│   │   ├── webhook/          # ipaymu, duitku, midtrans, tripay, xendit
│   │   ├── cron/             # cleanup (retensi otomatis H+7 & H+30)
│   │   └── sse/              # Server-Sent Events (memories real-time)
│   │
│   ├── components/           # React components reusable
│   │   ├── BrandLogo.tsx
│   │   ├── client/
│   │   │   └── MemoriesDownloadSection.tsx # Download ZIP & perpanjangan galeri (+30 hari)
│   │   ├── features/
│   │   │   ├── GuestMomentClient.tsx     # UI upload momen tamu
│   │   │   ├── ReceptionistScannerClient.tsx # Scanner QR
│   │   │   └── StaffLockScreen.tsx       # Lock screen PIN panitia
│   │   └── admin/
│   │       ├── AdminPortfolioTab.tsx
│   │       ├── AdminProfileSettings.tsx
│   │       └── AdminTeamManagement.tsx
│   │
│   ├── checkout/             # Halaman checkout & pembayaran (multi-gateway + manual transfer)
│   ├── demo/                 # Demo tema publik
│   ├── login/                # Login client
│   ├── onboarding/           # Flow onboarding baru setelah bayar
│   ├── packages/             # Halaman paket harga
│   ├── portfolio/            # Portofolio undangan selesai terisolasi
│   ├── 403/                  # Halaman forbidden
│   ├── privacy/terms/refund/ # Legal pages
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page utama (luxenary.id)
│   └── globals.css           # Global CSS
│
├── lib/                      # Business logic & service layer
│   ├── themeEngine.ts        # ⭐ Mesin render tema HTML (~81KB, CORE)
│   ├── staticPublisher.ts    # ⭐ Bake HTML statis saat publish (CORE)
│   ├── renderTemplate.ts     # Injeksi data ke template .html & mapping alias tema
│   ├── storage.ts            # Upload/delete file (R2, S3, atau Local switch env)
│   ├── mailer.ts             # ⭐ Nodemailer invoice & transactional email generator
│   ├── settings.ts           # Single source of truth admin_settings dari DB
│   ├── domainUtils.ts        # URL builder (subdomain, canonical, dll)
│   ├── prisma.ts             # Prisma client singleton
│   ├── metadataHelper.ts     # Generate Open Graph metadata
│   ├── colorPalettes.ts      # Palet warna tema undangan
│   ├── videoOptimizer.ts     # FFmpeg video compression (R2 upload)
│   ├── fontEmbedder.ts       # Embed font ke dalam HTML tema
│   ├── escapeHtml.ts         # HTML escape utility
│   ├── rateLimit.ts          # Rate limiter untuk API publik
│   ├── sseEmitter.ts         # Server-Sent Events emitter (momen real-time)
│   ├── gatewayRegistry.ts    # Registry 5 payment gateway
│   ├── gateways/             # Implementasi gateway: iPaymu, Duitku, Midtrans, TriPay, Xendit
│   ├── ipaymu.ts             # iPaymu payment client
│   ├── paymentEvents.ts      # Event bus pembayaran
│   ├── payments.ts           # Abstraksi pembayaran
│   ├── upgradeHelper.ts      # Eksekutor upgrade paket & perpanjangan galeri (+30 hari)
│   ├── demoPublisher.ts      # Publish demo tema ke /public/demo/
│   ├── demoRegistry.ts       # Registry konten demo tema (~78KB)
│   ├── databaseBackup.ts     # Hot-backup PostgreSQL (pg_dump)
│   ├── auth.ts               # Utility auth session
│   ├── session.tsx           # Session provider wrapper
│   │
│   ├── driveHelper.ts        # ⭐ Ekstraktor foto Google Drive (API v3)
│   └── settings.ts           # Platform settings reader
│
├── prisma/
│   ├── schema.prisma         # Skema database (PostgreSQL)
│   └── seed.ts               # Script seed data awal
│
├── prisma.config.ts           # Konfigurasi Prisma 7 DB URL
│
├── themes/                   # Template HTML tema undangan (15 Tema + 1 Blueprint)
│   ├── premium/              # kalandra, valente, aurelia, artisan
│   ├── modern/               # wave, papercut, ameera, chronicle, lumina, solaria
│   ├── traditional/          # prameswari, dillalucky, badrika, mayang, candani
│   └── starter-blueprint.html# Standard acuan template baru
│
├── public/
│   ├── published/            # ⭐ Output HTML statis (subdomain.html + invitationSlug.html)
│   │   ├── premium/          # Fallback by invitationId
│   │   ├── modern/           # Fallback by invitationId
│   │   └── traditional/      # Fallback by invitationId
│   ├── uploads/              # Media upload lokal (R2 switch)
│   │   ├── invitations/      # Media undangan per invitationId
│   │   ├── guest-memories/   # Foto tamu hari H
│   │   ├── proofs/           # Bukti transfer pembayaran
│   │   └── themes-builder/   # Aset demo tema
│   ├── assets/               # Aset statis sistem (brand, homepage)
│   ├── demo/                 # Preview tema HTML (auto-generated)
│   ├── downloads/            # Starter blueprint template
│   ├── music/                # Musik background tema (.ogg)
│   ├── fonts/                # Font lokal
│   └── css/                  # Stylesheet global
│
├── scripts/
│   └── cron-cleanup.ts       # Garbage collector undangan kedaluwarsa
│
├── docs/
│   ├── README.md                              # Pusat indeks dokumentasi platform
│   ├── ALUR_REGISTRASI_KE_DASHBOARD.md        # Alur lengkap registrasi Google hingga masuk studio
│   ├── admin/
│   │   ├── REMOTE_DAN_MANAJEMEN_KLIEN.md      # Panduan arsitektur remote klien & siklus hidup undangan
│   │   ├── MANAJEMEN_TEMA_ADMIN.md            # Panduan manajemen tema, upload master & auto-compile demo
│   │   └── DEPLOYMENT_VPS_CADDY.md            # Panduan deployment VPS Ubuntu & reverse proxy Caddy
│   └── client/
│       ├── TAHAP_REGISTRASI_DAN_PEMBAYARAN.md  # Panduan alur registrasi, kasir & pasca-bayar
│       └── TAHAP_DASHBOARD_SETUP_AWAL.md       # Panduan setup wizard undangan 3 langkah
│
├── middleware.ts             # ⭐ Edge routing utama (CRITICAL FILE)
├── auth.ts                   # NextAuth config entry
├── auth.config.ts            # NextAuth strategy config
├── AGENTS.md                 # Aturan perilaku Agent AI (WAJIB DIBACA)
├── SYSTEM_ARCHITECTURE.md    # Dokumen ini
├── S-Invitation.md           # Catatan bisnis & fitur
├── deploy.sh                 # Script deployment VPS
└── tsconfig.json / package.json / next.config.ts
```

---

## 3. ARSITEKTUR URL & ROUTING

### 3.1 — Tiga Format URL Aktif

```
FORMAT 1 — Subdomain (Utama, Sementara H+retention_days)
  URL  : dimas-clarissa.luxenary.id
  Flow : Middleware deteksi host = subdomain → Rewrite ke /published/dimas-clarissa.html
  Notes: Setelah acara + retention_days, subdomain dilepas, file dihapus.

FORMAT 2 — Canonical Flat Slug (Permanen)
  URL  : luxenary.id/dimas-clarissa-030326
  Flow : Middleware intercept path → Rewrite ke /published/dimas-clarissa-030326.html
  Notes: Selalu aktif selama file HTML ada. Nama file = invitationSlug.

FORMAT 3 — Custom Domain Klien (Infrastruktur & Fitur Aktif)
  URL  : dimas-clarissa.com (domain milik klien)
  Flow : Middleware deteksi isCustomDomain → Fetch /api/public/resolve-custom-domain
         → Dapat subdomain internal → Rewrite ke HTML
  Notes: API endpoint & UI Form sudah aktif di /dashboard/settings (baris 712-767).
         Klien memasukkan domain, sanitasi regex otomatis, dan atur CNAME ke server kita.
```

### 3.2 — Format invitationSlug (Sistem Baru Sept 2026)

```
Format   : {groomSlug}-{brideSlug}-{DDMMYY}
Contoh   : dimas-clarissa-030326
Collision: + kota → dimas-clarissa-030326-jakarta
Extreme  : + random 4char → dimas-clarissa-030326-jakarta-x7k
```

> **PENTING:** `invitationSlug` adalah `@unique` di Prisma schema.  
> Tidak ada lagi constraint compound `@@unique([groomSlug, brideSlug, invitationSlug])`.

### 3.3 — Sub-routes Publik

```
/{slug}/memories      → Galeri foto tamu (SSR, realtime SSE)
/{slug}/sharemoment   → Upload foto tamu hari H
/{slug}/galery        → Alias untuk memories
/{subdomain}.domain/memories     → Sama tapi via subdomain
/{subdomain}.domain/receptionist → Scanner QR (PIN-protected)
/{subdomain}.domain/sharemoment  → Upload via subdomain
```

### 3.4 — Middleware Logic Flowchart

```
Request masuk
    │
    ├─ /admin/login          → Redirect jika sudah login sebagai Admin
    ├─ /login                → Redirect ke dashboard jika client login
    ├─ /admin/**             → Guard: hanya ADMIN/SUPER_ADMIN
    ├─ /dashboard/**         → Guard: hanya Client (non-Admin)
    │
    ├─ Host = subdomain milik kita (e.g. dimas-clarissa.luxenary.id)
    │   ├─ /                 → Rewrite → /published/{subdomain}.html
    │   ├─ /memories         → Rewrite → /s/{subdomain}/memories
    │   ├─ /receptionist     → Rewrite → /s/{subdomain}/receptionist
    │   ├─ /sharemoment      → Rewrite → /s/{subdomain}/sharemoment
    │   └─ /{guest}          → Rewrite → /published/{subdomain}.html?to={guest}
    │
    ├─ Host = custom domain klien (e.g. dimas-clarissa.com) — INFRASTRUKTUR SIAP
    │   └─ Fetch resolve-custom-domain API → dapat subdomain → rewrite
    │
    └─ Root domain path (e.g. luxenary.id/dimas-clarissa-030326)
        ├─ /{slug}                    → Rewrite → /published/{slug}.html
        └─ /{slug}/memories|sharemoment → NextResponse.next() (ke Next.js page)
```

---

## 4. MESIN PUBLIKASI STATIS

**File:** `lib/staticPublisher.ts`

Saat client menekan tombol "Publish", sistem memanggil `buildAndSavePublishedHtml(invitationId)`:

```
1. Query semua data undangan dari DB (themeId, nama, foto, acara, dll)
2. Compose data via themeEngine.composeTemplateData()
3. Render HTML via renderTemplateFile() → HTML lengkap + inline CSS/JS
4. Inject Open Graph meta tags
5. Simpan ke TIGA lokasi:
   a. public/published/{subdomain}.html     → Untuk subdomain URL
   b. public/published/{invitationSlug}.html → Untuk canonical URL
   c. public/published/{category}/{id}.html  → Fallback by ID
6. Return HTML string
```

**Saat Unpublish/Hapus**, `deletePublishedHtml(invitationId)` menghapus ketiganya.

**KRITIS:** File HTML ini adalah satu-satunya yang disajikan ke tamu. Tidak ada SSR/API aktif untuk tamu saat undangan sudah published.

---

## 5. SISTEM PENYIMPANAN MEDIA

**File:** `lib/storage.ts`

```
Storage provider ditentukan oleh environment variable:
  STORAGE_PROVIDER=r2    → Upload ke Cloudflare R2 (S3-compatible SDK v3)
  STORAGE_PROVIDER=local → Upload ke public/uploads/ (default development)
  (Mendukung juga STORAGE_PROVIDER=s3 untuk AWS S3 standar)

Fungsi utama di lib/storage.ts:
  uploadFile(buffer, relativePath, mimeType, forceLocal?) → URL publik (R2 URL atau /uploads/...)
  deleteFile(publicUrl)                                   → Hapus file cerdas (auto-detect R2 Key vs FS unlink)
  streamMemoriesToZip(archive, invitationId)              → Stream ZIP foto tamu langsung dari R2 (zero disk RAM)
  syncDraftToR2(invitationId)                             → Migrasi otomatis aset lokal ke R2 saat publish

Pola Polimorfik Database (InvitationMedia.localPath):
  - Mode R2    : Menyimpan URL absolut (misal: https://cdn.luxenary.id/invitations/xxx/cover.webp)
  - Mode Local : Menyimpan path relatif (misal: /uploads/invitations/xxx/cover.webp)
  Keduanya dirender transparan oleh tag <img> browser dan renderTemplate.ts tanpa penyesuaian kode.
```

> ⚠️ **Google Drive TIDAK DIGUNAKAN UNTUK UPLOAD.**  
> `driveViewUrl` dan `driveFileId` di schema sudah dihapus penuh.  
> Untuk Galeri Pre-Wedding, klien dapat meletakkan link folder Drive publik,
> dan sistem akan menggunakan `GOOGLE_API_KEY` via `lib/driveHelper.ts` untuk fetch URL gambarnya.

---

## 6. SIKLUS HIDUP UNDANGAN

```
[DRAFT] ──→ [PUBLISHED] ──→ [EVENT_FINISHED] (H + retention_invitation_grace_days / default: 7 hari)
                                 │
                                 ├── Subdomain HTML dihapus, URL dialihkan ke /memories
                                 ├── Formulir RSVP dibersihkan otomatis
                                 ├── Tamu unduh koleksi foto via ZIP stream
                                 └── Klien perpanjang galeri (+30 Hari via QRIS)
                                 │
                                 ▼ (Masa galeri habis / H + retention_gallery_default_days atau galleryExpiresAt)
                            [ARCHIVED]
                                 ├── Foto momen tamu di R2 & lokal dihapus permanen
                                 ├── Upload foto dikunci (memoriesUploadLocked = true)
                                 ├── Subdomain dilepaskan kembali ke pool (subdomain = null)
                                 └── URL dialihkan ke Portofolio (jika ada) atau Graceful Expired Page
```

### 6.1 — Status Undangan (Enum `InvitationStatus` di DB)
- `DRAFT` — Masih dalam pengaturan, URL publik tidak aktif.
- `PUBLISHED` — URL publik aktif, file HTML statis sudah di-bake ke disk (`/published/`).
- `EVENT_FINISHED` — Acara utama selesai; undangan fisik ditutup dan beralih fungsi menjadi **Galeri Kenangan Tamu (`/memories`)**.
- `TAKEN_DOWN` — Dinonaktifkan sementara oleh Admin atau Klien.
- `ARCHIVED` — Diarsipkan setelah masa galeri berakhir; foto dihapus dari cloud storage R2, subdomain didaur ulang kembali ke pool.

### 6.2 — Dua Fase Otomatisasi Cron Cleanup (`POST /api/cron/cleanup`)
Cron job dilindungi oleh header `Authorization: Bearer <CRON_SECRET>` atau sesi Admin:
1. **Fase 1 (Transisi Pasca Acara — H+7 Hari):**
   - Memastikan file canonical slug sudah ter-bake (`buildAndSavePublishedHtml`).
   - Menghapus fisik file subdomain HTML saja (`deleteSubdomainHtmlOnly`) sehingga akses subdomain otomatis fallback rewrite ke `/s/[subdomain]/memories`.
   - Mengubah status ke `EVENT_FINISHED`.
   - Menghapus record `rsvp` kedaluwarsa demi privasi data tamu.
2. **Fase 2 (Pembersihan Galeri & Daur Ulang Subdomain — H+30 Hari / `galleryExpiresAt`):**
   - Jika `now > effectiveExpiry` (tidak diperpanjang klien):
     - Menghapus seluruh file fisik foto kenangan tamu (`GuestMemory`) dari Cloudflare R2 (`deleteFile`) dan disk lokal.
     - Menghapus record `guest_memories` dari database.
     - Mengunci upload foto (`memoriesUploadLocked = true`).
     - Mengubah status menjadi `ARCHIVED`.
     - **Melepaskan Subdomain kembali ke pool umum (`subdomain = null`)** agar dapat didaftarkan kembali oleh pasangan baru.
3. **Fase 3 (Pembersihan Total Akun Klien Lama — H+365 Hari):**
   - Menghapus akun klien yang semua undangannya sudah `ARCHIVED` lebih dari `retention_account_days`.

### 6.3 — API Kontrol Siklus Hidup Manual Admin (`POST /api/admin/invitations/[id]/lifecycle`)
Khusus SUPER_ADMIN / ADMIN untuk intervensi operasional langsung dari dashboard:
- `action = "CLOSE_TO_GALLERY"`: Menutup undangan seketika, menghapus subdomain HTML, dan mengubah status ke `EVENT_FINISHED`.
- `action = "EXTEND_GALLERY"`: Menambah durasi `galleryExpiresAt` sebesar `days` (default +30 hari) dan membuka kembali kunci upload.
- `action = "UPDATE_EVENT_DATE"`: Mengedit tanggal acara utama darurat jika jadwal pernikahan dimajukan/diundur.

### 6.4 — Alur Perpanjangan Galeri Mandiri Klien (`POST /api/client/memories/extend`)
- Klien menekan tombol "Perpanjang Galeri (+30 Hari)" di dashboard galeri momen.
- Sistem membaca tarif perpanjangan dinamis dari `AdminSetting` (`gallery_extension_price_per_month`, default Rp50.000).
- Membuat order baru berjenis `GALLERY_EXTENSION` dengan nomor invoice berawalan `EXT-`.
- Klien menyelesaikan pembayaran via QRIS / Payment Gateway.
- Webhook memanggil `applyUpgradePlan` ➔ `applyGalleryExtension` untuk menambahkan +30 hari ke `galleryExpiresAt` dan mengirimkan email kuitansi resmi berpalet mewah via `lib/mailer.ts`.

### 6.5 — Graceful Expired Page (`app/(public)/[slug]/route.ts`)
Jika undangan telah berstatus `ARCHIVED`:
1. Sistem memeriksa apakah file salinan portofolio ada di `/portfolio/[slug]`.
2. Jika ada, otomatis dialihkan (*HTTP 307*) ke `/portfolio/[slug]`.
3. Jika tidak ada portofolio, disajikan **Halaman Penutupan Elegan** bernuansa gelap mewah yang menampilkan pesan hangat bahwa momen bahagia telah usai, nama brand platform dinamis `{platformName}`, dan tombol navigasi kembali ke beranda utama (`/`).

### 6.6 — Syarat Publish (`isPublishable` check di Settings page)
1. `staffPin` sudah diisi (panitia scanner) ✓
2. `subdomain` sudah dipilih ✓
3. `groomName` + `brideName` sudah diisi ✓
4. Minimal 1 event di `eventData` ✓

### 6.7 — Pemisahan UX Galeri Kenangan Tamu & Standarisasi Musik Latar
1. **Pemisahan Pengaturan vs Operasional Galeri Kenangan Tamu:**
   - **Formulir Studio Editor (`/dashboard/invitation/[id]` Seksi 14):** Khusus menangani pengaturan tampilan dan teks seksi di web undangan (Toggle Aktif/Nonaktif `showGuestMemories`, Judul Seksi `memoriesTitle`, Eyebrow Subjudul `memoriesEyebrow`, dan Deskripsi Ajakan `memoriesSubtitle`).
   - **Dashboard Utama (`/dashboard` Seksi 5 & Card 4):** Menjadi pusat operasional & monitoring penuh:
     - Tautan publik album kenangan tamu (`/{slug}/memories` atau `/{subdomain}/memories`) dengan fitur Salin Link & Buka Galeri.
     - Komponen unduh ZIP client-side (`MemoriesDownloadSection`) dan info retensi/perpanjangan masa simpan +30 hari via QRIS.
     - Monitoring stream foto candid tamu secara langsung lengkap dengan tombol moderasi/hapus dan counter real-time.
2. **Standarisasi Fitur Musik Latar Pernikahan (Audio Background):**
   - Musik latar merupakan fitur esensial dari setiap paket undangan (Bebas dari pembungkus capability semu).
   - Klien dapat mengatur lagu otomatis berputar saat tamu klik "Buka Undangan", memilih dari preset kurasi klasik sakral, mengunggah berkas MP3/M4A sendiri (hingga 15 MB), atau memasukkan URL audio kustom/YouTube.
3. **Keamanan Enkripsi Dua Arah & Dekripsi Otomatis `staffPin`:**
   - PIN panitia dienkripsi dengan AES-256-GCM (`lib/pinEncryption.ts`).
   - Endpoint backend (`GET/PUT /api/client/invitations/{id}` dan `GET /api/client/invitations`) secara konsisten mendekripsi `staffPin` sebelum dikirimkan ke frontend klien, sehingga browser selalu menerima teks PIN asli yang bersih.
   - Proteksi *Anti Double-Encryption* (`isPinEncrypted`) dan mekanisme *Self-Healing* pada `decryptPin` mencegah PIN terenkripsi berulang kali saat form disimpan secara terpisah.

---

## 7. SISTEM SUBDOMAIN

**Dual-check ketersediaan subdomain:**

1. **Setup Awal (Onboarding):** `POST /api/client/invitations/create` → cek `prisma.invitation.findUnique({ where: { subdomain } })`
2. **Settings Page:** `GET /api/client/subdomain/check?subdomain=xxx` → cek ketersediaan real-time

**Recycle Subdomain:** Jika subdomain sudah kedaluwarsa (acara lewat 7 hari), sistem otomatis mengosongkan kolom `subdomain` dari pemilik lama dan mengizinkan klien baru mengambilnya.

**PENTING:** Kolom `subdomain` di DB ber-constraint `@unique`. Race condition ditangani via constraint DB + try/catch `P2002`.

---

## 8. TEMA & TEMPLATE ENGINE

**Files:** `lib/themeEngine.ts` (~81KB), `lib/renderTemplate.ts`, `themes/`

```
Katalog Tema Aktual (15 File Template Fisik + 1 Blueprint):
  Premium (4)    : kalandra.html, valente.html, aurelia.html, artisan.html
  Modern (6)     : wave.html, papercut.html, ameera.html, chronicle.html, lumina.html, solaria.html
  Traditional (5): prameswari.html, dillalucky.html, badrika.html, mayang.html, candani.html
  Blueprint      : starter-blueprint.html

Backward Compatibility Alias Mapping (di lib/renderTemplate.ts):
  - "kila"                   → mapped ke kalandra.html (fallback backward compatibility)
  - Seluruh tema zombie / artefak pengujian lama telah dibersihkan secara tuntas (sistem beroperasi murni 1:1 dengan 15 file master).
```

**Alur render:**
```
themes/{category}/{themeId}.html   ← File template mentah
        ↓
renderTemplateFile(themeId, data, options)
        ↓
themeEngine.composeTemplateData(invitationId) ← Ambil semua data dari DB
        ↓
Injeksi: nama pasangan, foto, acara, RSVP form, countdown, musik
        ↓
HTML standalone lengkap (self-contained, inline CSS/JS)
```

**Arsitektur Piring Mandiri & Mekanisme Penghapusan Tema:**
* **Forking ke Piring Mandiri:** Saat klien membuka studio undangan, sistem menyalin template master ke piring draft lokal di `data/drafts/{invitationId}.html`.
* **Prioritas Piring:** `renderTemplateFile` selalu memprioritaskan piring draft fisik klien sebelum mencari file master.
* **Resiliensi Penghapusan Tema oleh Admin:**
  1. Penghapusan tema di Admin menghapus row database, master `themes/`, dan folder `public/demo/` (*Hard Delete Steril*).
  2. Undangan klien yang sudah memiliki piring draft (`data/drafts/`) tetap **100% aman dan utuh** tanpa terpengaruh penghapusan master.
  3. Klien yang belum memiliki piring draft akan melihat layar panduan transparan *"Tema Tidak Tersedia"* (bebas dari fallback siluman/hardcode) untuk memilih tema aktif lain.
  4. Penggantian tema oleh klien di Dashboard otomatis me-unlink piring draft lama dan menyalin template master baru.

---

## 9. AUTENTIKASI & OTORISASI

**File:** `auth.ts`, `auth.config.ts`, `middleware.ts`

```
Peran (role):
  SUPER_ADMIN → Akses penuh semua area
  ADMIN       → Akses /admin/**
  USER        → Akses /dashboard/** (client biasa)

Guard di middleware:
  /admin/**    → Hanya ADMIN atau SUPER_ADMIN
  /dashboard/** → Hanya USER (non-Admin)
  /api/admin/** → Server-side check via auth()
  /api/client/** → Server-side check via auth() + userId match
```

### 9.1 Mekanisme Remote Klien (Cookie-Based Workspace Override)
Fitur *Remote* memungkinkan Admin untuk masuk ke dasbor Klien dan mengendalikannya secara penuh tanpa mengetahui *password* klien. Sistem ini dirancang menggunakan arsitektur **httpOnly Cookie (`lux_remote_client_id`)** dan resolusi sesi dinamis tanpa perlu memanipulasi atau merusak JWT Admin:

1. **Inisiasi (Admin Dashboard):** Admin mengklik tombol Remote (ikon monitor) pada baris undangan atau detail klien. Server Action `startRemoteSession(clientId)` di `app/(admin)/admin/actions/remote.ts` memverifikasi hak akses Admin via `auth()`, memastikan klien ada di database, menetapkan cookie `lux_remote_client_id` (httpOnly, Secure, SameSite: Lax, path: "/", maxAge: 1 jam), dan memanggil `redirect("/dashboard")` dari server.
2. **Perizinan Gerbang (Middleware & AuthConfig):**
   - Di `auth.config.ts`, callback `authorized()` memeriksa apakah user adalah Admin yang memiliki cookie `lux_remote_client_id`. Jika ya, gerbang `/dashboard` dibuka.
   - Di `middleware.ts`, proteksi rute `/dashboard` memberikan bypass bagi Admin yang memiliki cookie `lux_remote_client_id`.
3. **Resolusi Workspace Dinamis (`auth.ts`):** Pada setiap pemanggilan `auth()` di sisi server (Route Handlers & Server Components), callback `session` mendeteksi cookie `lux_remote_client_id`. Sistem memuat data klien target dari Prisma (`id`, `name`, `email`, `role`) dan menyematkannya ke `session.user` dengan atribut `isRemote: true` dan `originalAdminId`. Hal ini membuat seluruh ratusan API klien (`/api/client/**`) otomatis membaca dan mengelola data klien yang di-remote secara transparan tanpa mengubah JWT session token.
4. **Indikator UI & Proteksi Dasbor (`layout.tsx`):**
   - Komponen `app/(client)/dashboard/layout.tsx` mengambil status sesi via `GET /api/admin/remote-session` dan menampilkan banner merah bertuliskan *"MODE REMOTE AKTIF: Anda sedang mengendalikan dashboard milik [Nama Klien]"*.
   - Pengecekan status pembayaran onboarding di-bypass saat mode remote aktif agar Admin dapat leluasa menginspeksi atau membantu setup undangan klien.
5. **Pemulihan Bersih (Restore 1-Klik):** Saat Admin mengklik tombol *"Kembali ke Admin"*, sistem mengirim request `DELETE /api/admin/remote-session` yang menghapus cookie `lux_remote_client_id` dan mengarahkan Admin kembali ke `/admin`. Karena token JWT Admin asli tidak pernah dimodifikasi, hak akses Admin langsung pulih seketika tanpa perlu login ulang.

---

## 10. API ROUTE MAP

```
PUBLIC (tanpa auth):
  GET  /api/public/settings           → Platform settings global
  GET  /api/public/themes             → List tema aktif
  POST /api/public/rsvp               → Submit RSVP tamu
  GET  /api/public/memories/{id}      → List foto momen
  POST /api/public/memories/upload    → Upload foto tamu (rate-limited)
  GET  /api/public/resolve-custom-domain → Resolve custom domain ke subdomain
  GET  /api/public/version            → Versi sistem
  GET  /api/sse/memories              → SSE stream momen real-time

CLIENT (auth required, role=USER):
  GET/PUT   /api/client/invitations/{id}    → Detail & update undangan (staffPin terdekripsi otomatis di respons)
  GET       /api/client/invitations         → List undangan client (termasuk status retensi, lock memori & staffPin terdekripsi)
  POST      /api/client/invitations/create  → Buat undangan baru
  GET/POST  /api/client/guests              → Manajemen tamu (kolom `phone`, tanpa `phoneNumber`)
  POST      /api/client/guests/bulk         → Import tamu massal (CSV/JSON)
  GET       /api/client/subdomain/check     → Cek ketersediaan subdomain
  POST      /api/client/upload             → Upload media undangan (WebP Sharp via storage.ts)
  GET       /api/client/rsvps             → Statistik RSVP
  GET       /api/client/orders            → List order client
  POST      /api/client/memories/extend   → Buat order perpanjangan galeri (+30 hari via QRIS)
  POST      /api/client/custom-domain/buy → Beli add-on Jasa Integrasi Custom Domain
  (Catatan WA: Route wa-link dihapus; digantikan client-side wa.me direct linking + auto-format +62)

ADMIN (auth required, role=ADMIN/SUPER_ADMIN):
  GET  /api/admin/overview            → Statistik platform
  GET  /api/admin/users               → List semua user
  GET/POST/PUT/DELETE /api/admin/themes → Manajemen tema (Upload master .html, update metadata, auto-compile demo, hard-delete steril)
  POST /api/admin/themes/sync         → Sinkronisasi tema disk-to-DB, auto-discovery & auto-purge tema zombie
  POST /api/admin/settings            → Update platform settings
  POST /api/admin/database/backup     → Backup database
  POST /api/admin/subdomains/recycle  → Daur ulang subdomain kedaluwarsa
  GET/POST/DELETE /api/admin/portfolio → Manajemen kloning portofolio statis mandiri
  POST /api/admin/invitations/{id}/lifecycle → Kontrol siklus hidup (CLOSE_TO_GALLERY, EXTEND_GALLERY, UPDATE_EVENT_DATE)
  GET/DELETE /api/admin/remote-session → Manajemen sesi Remote Klien (Baca status & hapus cookie remote)

RECEPTIONIST (public + PIN-protected di client side):
  POST /api/receptionist/verify-pin   → Verifikasi PIN panitia (AES-256-GCM 32-byte key)
  GET  /api/receptionist/guests       → List tamu untuk scanner
  POST /api/receptionist/scan         → Tandai tamu hadir

PAYMENT & WEBHOOKS (5 Gateway Terintegrasi):
  POST /api/orders/create             → Buat pesanan baru
  POST /api/payments/checkout         → Proses pembayaran
  GET  /api/payments/status-stream/{id} → SSE status pembayaran
  POST /api/webhook/duitku            → Webhook Duitku (HMAC-SHA256 case-insensitive)
  POST /api/webhook/ipaymu            → Webhook iPaymu
  POST /api/webhook/midtrans          → Webhook Midtrans
  POST /api/webhook/tripay            → Webhook TriPay
  POST /api/webhook/xendit            → Webhook Xendit

STATUS WARISAN / DEPRECATED:
  - /api/cdn/drive                 → 🗑️ Sudah Terhapus
  - /api/admin/test-google         → 🗑️ Sudah Terhapus
  - /api/client/.../retention-sync → 🗑️ Sudah Terhapus
  - /api/client/guests/.../wa-link → 🗑️ Sudah Terhapus
```

---

## 11. SKEMA DATABASE

**File:** `prisma/schema.prisma`

```
Model Utama:
  User           → Akun user (client, role: CLIENT | ADMIN)
  Admin          → Akun admin terpisah dari User (role: SUPER_ADMIN | FINANCE | SUPPORT)
  Order          → Pesanan paket undangan & perpanjangan galeri
  Invitation     → Inti undangan (DRAFT | PUBLISHED | EVENT_FINISHED | TAKEN_DOWN | ARCHIVED)
  Guest          → Daftar tamu per undangan (phone, waStatus: PENDING | SENT, qrToken)
  Rsvp           → Konfirmasi kehadiran tamu
  Wish           → Ucapan tamu
  GuestMemory    → Foto candid tamu (hari H & pasca-acara)
  InvitationMedia → File media undangan (8 slot media)
  AdminSetting   → Konfigurasi platform global (key-value dinamis)
  WebhookLog     → Log audit webhook payment (iPaymu, Duitku, Midtrans, TriPay, Xendit)
  AdminAuditLog  → Log audit aktivitas admin

Field Kritis di Order:
  orderType       NEW | UPGRADE | GALLERY_EXTENSION | CUSTOM_DOMAIN_ADDON
  gatewayId       String?   ← "midtrans" | "ipaymu" | "xendit" | "tripay" | "duitku"
  gatewayTxId     String?   ← ID transaksi di sisi gateway (untuk cancel API saat switch gateway)
  linkedOrderId   String?   ← Referensi ID order lama (saat UPGRADE) atau ID invitation (saat GALLERY_EXTENSION / CUSTOM_DOMAIN)
  requestedDomain String?   ← Nama domain yang direquest oleh klien saat memesan add-on Custom Domain

Field Kritis di Invitation:
  invitationSlug  @unique   ← Flat slug canonical: dimas-clarissa-030326
  subdomain       @unique   ← Subdomain: dimas-clarissa (nullable saat di-recycle)
  customDomain    @unique   ← Custom domain klien (nullable, fitur & UI aktif)
  staffPin        String?   ← PIN panitia terenkripsi AES-256-GCM (wajib diisi)
  eventData       String?   ← JSON array multi-event
  featureSettings String?   ← JSON settings fitur & color palette
  status          DRAFT | PUBLISHED | EVENT_FINISHED | TAKEN_DOWN | ARCHIVED
  galleryExpiresAt DateTime? ← Batas masa aktif galeri foto tamu (diperpanjang via QRIS)
  memoriesUploadLocked Boolean ← Dikunci otomatis saat masa galeri habis / ZIP diunduh

Field Kritis di Guest:
  phone           String?   ← Nomor kontak tunggal (kolom `phoneNumber` sudah dibersihkan)
  waStatus        PENDING | SENT (Status `READ` sudah dihapus dari Enum WaStatus)
  qrToken         String? @unique ← Token QR check-in resepsi hari H

Media di InvitationMedia:
  localPath       String?   ← URL R2 (produksi) atau path lokal /uploads/ (development)
  (Catatan: Field warisan driveFileId & driveViewUrl sudah dihapus penuh dari schema)
```

---

## 12. FILE YANG TIDAK TERPAKAI / WARISAN GOOGLE DRIVE

### 12.1 — Warisan yang Masih Ada di Kode (JANGAN hapus sembarangan)

| File/Modul | Status | Penjelasan |
|---|---|---|
| `lib/driveHelper.ts` | ✅ Diperbarui | Dirombak total menggunakan Google Drive API v3 resmi. Bukan scraper lagi, lebih stabil dan bersih menggunakan `GOOGLE_API_KEY`. |
| `app/api/cdn/drive/route.ts` | 🗑️ Terhapus | Proxy CDN Google Drive sudah dihapus. |
| `app/api/client/invitations/[id]/retention-sync/route.ts` | 🗑️ Terhapus | API sinkronisasi Drive ke DB lokal sudah dihapus. |
| `app/api/admin/test-google/route.ts` | 🗑️ Terhapus | Test koneksi Google OAuth sudah dihapus dari codebase. |
| `InvitationMedia.driveViewUrl & driveFileId` | 🗑️ Terhapus | Kolom warisan sudah dihapus dari Prisma schema secara penuh. |
| `GuestMemory.driveFileId` | 🗑️ Terhapus | Sudah dihapus dari schema. |

### 12.2 — File Sampah yang Sudah Dihapus (Sept 2026)

- `extract.js`, `parse.js`, `get_themes.js` — Script analisis satu kali
- `test-heic.js`, `test_put.js`, `test-prisma.js` — Script tes manual
- `reconstruct.txt`, `text_audit.txt`, `extracted_views.txt` — Hasil audit lama
- `all_texts.txt`, `all_hardcoded_texts.txt` — Hasil ekstraksi teks
- `ref.md` — Catatan sementara
- `app/(public)/[groom]-[bride]/[invitationSlug]/` — Route lama (diganti `[slug]`)

---

## 13. PANDUAN KERJA AGENT AI (MANDATORY READING)

> Bagian ini adalah **instruksi perilaku untuk AI Agent (Antigravity/Claude/Gemini)** yang bekerja di repositori ini.  
> Tidak mengikuti panduan ini = kemungkinan besar menghasilkan bug atau merusak arsitektur.

---

### 13.1 — SIKLUS KERJA WAJIB (Claude-style Agentic Loop)

Setiap tugas, sekecil apapun, HARUS mengikuti urutan ini:

```
FASE 1: INVESTIGASI (TANPA MENGUBAH KODE)
  a. Baca file yang relevan terlebih dahulu (view_file / grep_search)
  b. Pahami konteks lengkap: siapa yang memanggil? Apa yang diharapkan?
  c. Identifikasi ROOT CAUSE, bukan gejala
  d. Periksa apakah ada pola serupa di kodebase yang sudah ada

FASE 2: PERENCANAAN (BUAT RENCANA JELAS)
  a. Tulis daftar file yang AKAN diubah
  b. Jelaskan MENGAPA perubahan itu diperlukan (bukan hanya apa)
  c. Identifikasi risiko: apakah ada yang bisa rusak?
  d. Untuk perubahan besar: buat implementation_plan.md dan minta approval

FASE 3: IMPLEMENTASI (SURGICAL PRECISION)
  a. Edit hanya baris yang diperlukan (replace_file_content / multi_replace)
  b. TIDAK mengoverwrite file besar tanpa alasan (write_to_file hanya untuk file BARU)
  c. Satu perubahan per file secara serial jika ada ketergantungan
  d. Jalankan `npx tsc --noEmit` setelah setiap batch perubahan

FASE 4: VERIFIKASI EMPIRIS
  a. TypeCheck HARUS exit code 0 sebelum menyatakan selesai
  b. Baca output error secara menyeluruh sebelum klaim "berhasil"
  c. Jangan declare "sudah fixed" tanpa bukti dari tool execution
  d. Jika ada side effect tak terduga, lapor jujur ke user

FASE 5: DOKUMENTASI
  a. Update SYSTEM_ARCHITECTURE.md jika mengubah arsitektur
  b. Update AGENTS.md jika ada pola kerja baru yang perlu diingat
```

---

### 13.2 — ANTI-PATTERN YANG DILARANG KERAS

```
❌ DILARANG: Swallow error dengan try-catch kosong tanpa logging
❌ DILARANG: Return { success: true } padahal operasi gagal
❌ DILARANG: Tambah fallback "OR id = ?" untuk bypass auth
❌ DILARANG: Menghapus file tanpa grep terlebih dahulu apakah masih diimport
❌ DILARANG: Mengedit file berdasarkan asumsi tanpa membaca isinya dulu
❌ DILARANG: Menyatakan "sudah fix" tanpa menjalankan typecheck
❌ DILARANG: Overwrite file panjang hanya untuk perubahan kecil
❌ DILARANG: Menggunakan emoji di elemen UI profesional (navbar, card, badge)
❌ DILARANG: Modifikasi file di luar scope yang diminta tanpa izin
❌ DILARANG: Membuat solusi baru tanpa mengecek apakah pola serupa sudah ada
❌ DILARANG: Menggunakan secret key selain tepat 32-byte pada AES-256-GCM (memicu fatal crash ERR_CRYPTO_INVALID_KEYLEN)
❌ DILARANG: Menaruh datasource.url di prisma/schema.prisma (Prisma 7 mewajibkan URL ditaruh di prisma.config.ts)
```

---

### 13.3 — CHECKLIST SEBELUM EDIT DATABASE/SCHEMA

```
[ ] Apakah ini development atau production?
[ ] Apakah ada data yang akan hilang (--accept-data-loss)?
[ ] Apakah semua unique constraint konsisten dengan kode?
[ ] Menggunakan Prisma 7: URL database berada di prisma.config.ts, bukan di schema.prisma
[ ] Sudah jalankan `npx prisma generate` setelah schema diubah?
[ ] Semua caller Prisma sudah diupdate ke field/relasi baru?
```

---

### 13.4 — POLA LOOKUP DATABASE YANG BENAR

```typescript
// ✅ BENAR — gunakan @unique field langsung
prisma.invitation.findUnique({ where: { invitationSlug: slug } })
prisma.invitation.findUnique({ where: { subdomain: subdomain } })
prisma.invitation.findUnique({ where: { id: id } })

// ❌ SALAH (schema lama, sudah dihapus)
prisma.invitation.findUnique({
  where: {
    groomSlug_brideSlug_invitationSlug: { groomSlug, brideSlug, invitationSlug }
  }
})
```

---

### 13.5 — URL BUILDER YANG BENAR

```typescript
import { getInvitationPublicUrl, getPermanentPathUrl, resolveEffectiveInvitationUrl } from "@/lib/domainUtils";

// Resolusi URL Undangan Terpadu (Prioritas: Custom Domain > Subdomain > Fallback Draft):
const { url, domainType, domainIdentifier, isConfigured } = resolveEffectiveInvitationUrl({
  customDomain: inv.customDomain,
  subdomain: inv.subdomain,
  groomSlug: inv.groomSlug,
  brideSlug: inv.brideSlug,
  invitationSlug: inv.invitationSlug,
  guestSlug: "Bpk. Abiyoga",
});
// 1. Jika ada customDomain: https://yoga-nisa.com/Bpk.%20Abiyoga
// 2. Jika ada subdomain: https://abiyoga-nisa.luxenary.id/Bpk.%20Abiyoga
// 3. Jika belum diatur (Draft): http://abiyoga-nisa.localhost:3000/Bpk.%20Abiyoga (simulasi)

// Subdomain URL (sementara):
getInvitationPublicUrl("dimas-clarissa")
// → http://dimas-clarissa.localhost:3000 (dev)
// → https://dimas-clarissa.luxenary.id (prod)

// Canonical URL (permanen, FLAT SLUG):
getPermanentPathUrl("dimas-clarissa-030326")
// → http://localhost:3000/dimas-clarissa-030326 (dev)
// → https://luxenary.id/dimas-clarissa-030326 (prod)
```

---

### 13.6 — STORAGE MEDIA YANG BENAR

```typescript
import { uploadFile, deleteFile } from "@/lib/storage";

// Upload (otomatis pilih R2 atau Local berdasarkan STORAGE_PROVIDER env)
const url = await uploadFile(buffer, "invitations/{id}/cover.webp", "image/webp");
// Simpan url ke DB sebagai localPath (bukan driveViewUrl)

// Resolusi URL media dari DB:
const url = media.localPath || "/default.jpg";
//          ^^^ localPath menampung URL R2 atau path lokal secara polimorfik
```

---

### 13.7 — CARA MEMBACA KODE INI PERTAMA KALI

Jika Anda agent baru yang masuk ke proyek ini, baca file-file ini secara berurutan:

```
1. SYSTEM_ARCHITECTURE.md (dokumen ini)   → Paham big picture
2. AGENTS.md                              → Aturan perilaku
3. prisma/schema.prisma                   → Paham struktur data
4. middleware.ts                          → Paham routing
5. lib/staticPublisher.ts                 → Paham alur publish
6. lib/themeEngine.ts (header saja)       → Paham theme engine
7. app/(client)/dashboard/settings/       → Paham self-service client
```

---

*Dokumen ini diperbarui pada: 03 September 2026*  
*Oleh: Antigravity AI Assistant (Google DeepMind)*  
*Audit basis: Empiris — langsung dari kode sumber aktual, bukan asumsi.*

---

## 14. SISTEM PORTOFOLIO MANDIRI

**Files:** `app/api/admin/portfolio/route.ts`, `app/portfolio/page.tsx`, `app/portfolio/PortfolioGallery.tsx`

Sistem portofolio memungkinkan Admin (SUPER_ADMIN) mengkurasi undangan klien pilihan menjadi **salinan HTML statis yang 100% mandiri** — semua aset media sudah disalin lokal, tidak ada URL eksternal tersisa.

### Alur Kloning
```
Admin klik "Jadikan Portofolio" → POST /api/admin/portfolio
  Step 1: Baca HTML dari public/published/slugs/{slug}.html
  Step 2: Bersihkan & buat public/portfolio/assets/{slug}/
  Step 3: InvitationMedia semua slot (R2/Local → salin nama asli)
  Step 4: GuestMemory thumbnails — max 10, sharp 120x120 WebP 65%
  Step 5: Drive CDN URLs — max 15, sharp 1200px WebP 75%
  Step 6: Tulis HTML final ke public/portfolio/{slug}.html
```

### Routing Portofolio (di middleware.ts)
```
/portfolio              → Next.js page handler (galeri indeks)
/portfolio/{slug}       → rewrite ke /portfolio/{slug}.html (statis)
/portfolio/assets/*     → serve file statis langsung (bypass rewrite)
```

### Halaman Indeks `/portfolio`
- Hanya tampilkan undangan yang ada file `.html`-nya di `public/portfolio/`
- Cover dari `/portfolio/assets/{slug}/cover.webp` (fallback ke `localPath`)
- `publicUrl` mengarah ke `/portfolio/{slug}` bukan URL undangan aktif

### Kompresi Aset
| Kategori | Dimensi | Format | Quality |
|---|---|---|---|
| InvitationMedia | original | original | tanpa kompres |
| GuestMemory thumbnail | 120×120px | WebP | 65% |
| Drive gallery | max 1200px | WebP | 75% |

### API Endpoints
| Method | Fungsi |
|---|---|
| `GET /api/admin/portfolio` | List slug portofolio aktif (dari filesystem) |
| `POST /api/admin/portfolio` | Kloning undangan ke portofolio statis |
| `DELETE /api/admin/portfolio?clientName={slug}` | Hapus portofolio + aset |

### Folder Output
```
public/portfolio/
  {slug}.html              ← HTML terisolasi
  assets/{slug}/
    cover.webp             ← LANDING_COVER
    home_photo.webp        ← HOME_PHOTO
    groom.webp/bride.webp  ← GROOM/BRIDE_PHOTO
    background.webp        ← GLOBAL_FIXED_BG
    sidebar.webp           ← DESKTOP_SIDEBAR
    closing.webp           ← CLOSING_COVER
    music.mp3              ← musicUrl
    memory_01-10.webp      ← GuestMemory thumbnails (max 10)
    gallery_01-15.webp     ← Drive Our Moments (max 15)
```

---

## 11.2 - Dynamic Manifest & PWA

Platform menggunakan `app/manifest.ts` dinamis secara server-side yang mengambil nama PWA dari `admin_settings` (`platform_name`). Hal ini menghilangkan ketergantungan pada file `.env` untuk pengaturan _app name_.

## 11.3 - Keamanan Custom Domain (CORS / Cross-Origin POST)

Permintaan (POST/GET) yang dilakukan melalui domain kustom yang terhubung via CNAME dijamin keamanannya dan **tidak terkena pemblokiran CORS**. Hal ini karena fitur **Next.js Middleware Rewrite** meneruskan _request_ secara transparan dalam server, sehingga bagi _browser_, _client_, dan _API endpoint_, transaksi tersebut tetap berada pada **Same-Origin**.

Seluruh modul pembayaran (_Payment Gateways_ seperti Duitku, Xendit, Tripay, IPaymu) secara otomatis membaca _prefix_ tagihan dari _dashboard_ Admin (`payment_invoice_prefix`). Jika kosong, sistem otomatis mundur (*fallback*) menjadi teks generik "Tagihan Pembayaran". Ini menjamin tidak adanya jejak _brand_ awal pada tagihan QRIS / _Virtual Account_ pelanggan.

---

## 15. ORKESTRASI MULTI-PAYMENT GATEWAY & DYNAMIC FEE

**Files:** `lib/gateways/`, `lib/gatewayRegistry.ts`, `app/api/payments/checkout/route.ts`, `app/checkout/page.tsx`

Sistem pembayaran platform mendukung multi-gateway terintegrasi dengan pergantian instan 1-klik dari dashboard Admin tanpa memerlukan restart aplikasi atau edit kode.

### 15.1 — Arsitektur Registry Gateway
```
Admin Setting: active_payment_gateway
           │
           ├── "ipaymu"   → lib/gateways/ipaymu.ts
           ├── "duitku"   → lib/gateways/duitku.ts
           ├── "midtrans" → lib/gateways/midtrans.ts
           ├── "tripay"   → lib/gateways/tripay.ts
           └── "xendit"   → lib/gateways/xendit.ts
```

### 15.2 — Pergantian Gateway Bersih (*Cancel Before Re-Initialize*)
- Saat order dibuat, sistem menyimpan `gatewayId` dan `gatewayTxId` pada record `Order`.
- Jika klien mengganti metode/gateway atau terjadi regenerasi transaksi, API checkout memanggil handler `cancelTransaction` pada gateway lama sebelum menginisialisasi transaksi baru pada gateway yang dipilih.
- Hal ini mencegah tagihan ganda atau race condition webhook antara dua gateway berbeda.

### 15.3 — Perhitungan Biaya Layanan Dinamis (Zero Hardcode)
- **Penanggung Biaya (`payment_fee_payer` / `payment_gateway_fee_payer`):**
  - `"BUYER"`: Biaya layanan ditambahkan ke total yang harus dibayar klien.
  - `"MERCHANT"`: Biaya layanan ditanggung oleh platform (klien hanya membayar harga paket).
- **Tarif Persentase (`payment_gateway_fee_percent`):**
  - Nilai desimal persentase (misal `0.7%`).
  - `appFee = feePayer === "BUYER" ? Math.round(subtotal * (feePercent / 100)) : 0`.
  - `totalAmount = subtotal + appFee`.
  - Perhitungan dilakukan pada tingkat checkout dengan idempotensi penuh agar reload halaman tidak melipatgandakan biaya.

### 15.4 — Batas Waktu Pembayaran Dinamis
- Durasi aktif sesi QRIS dibaca langsung dari `payment_expiry_minutes` (default: 60 menit) dan dikirimkan ke payload gateway.

### 15.5 — Kebijakan Tagihan Tunggal & Proteksi Tagihan Usang (Single Active Order & Superseded Guard)
- **Satu Klien = Satu Tagihan Aktif (Single Active Order):**
  - Klien yang bolak-balik mengubah paket (`/packages`) atau mengubah pilihan sebelum pembayaran lunas tidak akan melipatgandakan baris transaksi di database.
  - Endpoint `POST /api/orders/create` secara otomatis mencari order dengan status `PENDING` atau `FAILED` (yang ditolak), lalu melakukan *reuse/update* pada baris yang sama.
  - Mencegah akumulasi tagihan terbengkalai (*zero orphaned invoices*).
- **Proteksi Tagihan Usang (*Superseded Order Guard*):**
  - Jika klien membuka tautan riwayat/bookmark invoice lama (`?order=OLD_ID`) padahal sudah memiliki tagihan baru yang berstatus `PENDING` atau `PAID`:
    - API `GET /api/client/orders/[id]/status` mendeteksi `isSuperseded: true` dan menyertakan `activeOrderId`.
    - Kasir [`app/checkout/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/checkout/page.tsx) otomatis melakukan *instant redirection* ke tagihan aktif terbaru (`/checkout?order=NEW_ID`).
  - Endpoint `POST /api/client/orders/[id]/upload-proof` memblokir keras upaya pengunggahan bukti bayar pada order usang yang telah digantikan oleh order baru.

### 15.6 — Alur Transfer Bank Manual & Pengiriman Cloudflare R2
- **Zero Hardcoded Fallback:** Data rekening bank (`bank_name`, `bank_account_number`, `bank_account_holder`) 100% dinamis dari tabel `admin_settings`. Tidak ada nilai dummy/fallback palsu di input formulir.
- **Penyimpanan Gambar Berkecepatan Tinggi (Cloudflare R2 + Edge CDN):**
  - Struk bukti transfer dikompresi menjadi WebP tajam (1400px, 82%) dan diunggah ke Cloudflare R2 bucket.
  - Gambar disajikan melalui **Custom Domain Edge CDN** (`https://cdn.luxvite.id`) menggunakan HTTP/2 dan Anycast PoP terdekat (Jakarta/Singapura), memangkas waktu muat gambar dari ~24 detik menjadi <200 milidetik.
- **Kartu Notifikasi Penolakan Menetap (*Persistent Rejection Card*):**
  - Jika admin menolak bukti pembayaran di portal `/admin`, order diperbarui menjadi `status: "FAILED"` dengan catatan `rejectReason`.
  - Kasir klien menampilkan kartu peringatan merah permanen tepat di atas formulir unggah ulang yang menampilkan alasan penolakan dari admin secara dinamis dan tidak hilang saat halaman di-refresh.
- **Visibilitas Status FAILED & Dibatalkan di Portal Admin:**
  - Transaksi berstatus `FAILED` (ditolak oleh admin) dan `EXPIRED` (kedaluwarsa gateway) tampil secara transparan pada subtab **"Gagal / Dibatalkan"** dan **"Semua Transaksi"** di `/admin`.
  - Endpoint `GET /api/admin/overview` mengembalikan seluruh transaksi mutakhir (`recentOrders`) tanpa mengecualikan order `FAILED`, sehingga admin dapat melacak riwayat penolakan, nominal, bukti lama, dan alasan penolakan kapan saja.
- **Auto-Purge Obsolete Records & Storage Assets (Single State Architecture):**
  - Saat klien mengunggah bukti pembayaran baru (`upload-proof`), mengganti paket (`orders/create`), atau saat transaksi disetujui lunas (`PAID` via webhook gateway / approval admin), sistem otomatis memindai dan membersihkan seluruh order non-PAID usang milik klien tersebut (`PENDING`, `FAILED`, `EXPIRED`).
  - Seluruh file foto struk lama langsung dihapus permanen dari Cloudflare R2 bucket (`deleteFile`), menghemat biaya storage dan mencegah penumpukan file sampah.
  - Record order usang dimusnahkan dari database PostgreSQL sehingga portal admin selalu rapi dan setiap klien hanya memiliki tepat 1 transaksi tunggal.
  - **Single State Checkout Guard (`isUserPaid`):** Klien yang sudah lunas dicegat dari membuka kasir checkout dan seketika dialihkan ke Dashboard/Setup Undangan. Order lama yang telah dihapus akan menghasilkan respon 404 tanpa memicu pembuatan order baru secara diam-diam.
- **Inline Action Confirmation (Zero Mouse Travel & Anti-Native Alert):**
  - Tombol verifikasi persetujuan di portal `/admin` (baik di modal bukti transfer maupun tabel transaksi) menerapkan pola *In-Place Confirmation*.
  - Mengeliminasi popup kaku browser `window.confirm()` dan `alert()`. Tombol bertransisi halus di tempat menjadi `[Ya, Lunas]` dan `[Batal]` dengan proteksi auto-revert 5 detik jika tidak diklik, memangkas jarak gerak mouse dari ~800px menjadi 0px.

---

## 16. SISTEM NOTIFIKASI EMAIL & FAKTUR TRANSAKSI

**File:** `lib/mailer.ts`

Sistem menggunakan library **Nodemailer** yang dikonfigurasi secara dinamis melalui nilai di tabel `admin_settings`.

### 16.1 — Kredensial SMTP Dinamis
Sistem membaca konfigurasi server email secara real-time:
- `smtp_host`, `smtp_port` (default 587 / SSL 465), `smtp_user`, `smtp_password`
- `smtp_from_email`, `smtp_from_name`
- **Graceful Non-Blocking Fallback:** Jika SMTP belum diisi oleh Admin, sistem mencatat pesan log aman dan proses aktivasi order/webhook tetap berjalan sukses 100% tanpa error fatal.

### 16.2 — Generator Faktur Mewah (Dark-Luxury Responsive)
- Desain template email HTML berpalet gelap eksklusif (*rich dark mode* `#0c0a09` dan `#1c1917`) dengan aksen emas tembaga (`#d97706`).
- Bebas dari emoji default OS untuk menjaga citra SaaS profesional.
- **Kategori Dinamis:**
  - **Aktivasi Paket (`NEW` / `UPGRADE`):** Tombol CTA mengarah ke Studio Undangan Klien.
  - **Perpanjangan Galeri (`GALLERY_EXTENSION`):** Rincian penambahan +30 hari masa aktif penyimpanan foto dengan tombol CTA ke Galeri Momen.
- Pengiriman email dijalankan secara asynchronous non-blocking di dalam `applyUpgradePlan` setelah status order berubah menjadi `PAID`.

---

## 17. ARSITEKTUR INFRASTRUKTUR & DEPLOYMENT (VPS)

**File:** `deploy.sh`, `ecosystem.config.js`

Sistem Luxenary Invite dirancang sebagai aplikasi *self-hosted* yang berjalan pada mesin Virtual Private Server (VPS) Ubuntu/Linux mandiri.

### 17.1 — PM2 Daemon & Deployment Engine
- **Skrip Deployment Otomatis:** `deploy.sh` menangani pembaruan repositori, instalasi dependensi, inisialisasi kunci rahasia (*secret generator*), sinkronisasi Prisma, *build* Next.js, hingga proses *restart* peladen tanpa *downtime*.
- **Manajemen Proses:** Node.js (Next.js) dijalankan menggunakan PM2 di belakang layar pada port internal (biasanya `localhost:3000`).

### 17.2 — Caddy Server & Otomatisasi SSL SaaS (On-Demand TLS)
Untuk menangani arsitektur Multi-Tenant Custom Domain, sistem NGINX tradisional digantikan secara total oleh **Caddy Server**.

- **Keamanan Cloudflare Strict:** Caddy bertindak sebagai pintu gerbang (*reverse proxy*) yang mewajibkan lalu lintas melalui port 443 (HTTPS). Cloudflare utama aplikasi menggunakan mode **Full (Strict)**.
- **On-Demand TLS (Autopilot SSL):** Caddy menghilangkan kebutuhan menerbitkan sertifikat Let's Encrypt secara manual untuk domain klien.
  Saat pengunjung mengakses domain baru (misal `arman.com`), Caddy akan memvalidasinya dengan menembak API internal `GET /api/public/resolve-custom-domain`. Jika API merespon bahwa domain tersebut sah, Caddy dalam hitungan detik akan meng- *generate* SSL Let's Encrypt secara mandiri.
- **Konfigurasi Fundamental (Caddyfile):**
  ```caddyfile
  # 1. Mencegah akses langsung ke CNAME Target (Anti-Kloning Web)
  cname.domain-utama.id {
      redir https://domain-utama.id 301
  }
  
  # 2. Otomatisasi SSL untuk Ribuan Custom Domain
  {
      on_demand_tls {
          ask http://localhost:3000/api/public/resolve-custom-domain
          interval 2m
          burst 5
      }
  }
  
  https:// {
      tls {
          on_demand
      }
      reverse_proxy localhost:3000
  }
  ```
- **Kelebihan Caddy vs NGINX dalam SaaS:** Meringankan beban operasional Admin (Zero-Touch Provisioning), kode *proxy* jauh lebih pendek (5 baris vs 100 baris NGINX), serta menghapuskan risiko sertifikat SSL kadaluarsa.
