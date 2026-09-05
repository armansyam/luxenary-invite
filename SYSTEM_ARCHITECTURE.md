# PLATFORM UNDANGAN (WHITE-LABEL) — DOKUMENTASI ARSITEKTUR SISTEM
## Versi: 5.5.1 | Diperbarui: 06 September 2026

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
| **Color Scheme** | Strictly Locked to Light Mode (`color-scheme: only light !important`, `<meta name="color-scheme" content="only light">`, warm ivory `#faf8f5`, proteksi total terhadap auto-inversi dark mode device/browser via W3C `only light` keyword) |

---

## 2. STRUKTUR FOLDER AKTUAL

```
/ (Root Project)
├── app/
│   ├── (admin)/              # Panel Admin (dilindungi role ADMIN/SUPER_ADMIN)
│   │   ├── layout.tsx        # Dynamic metadata layout (platform branding title & favicon)
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
│   ├── privacy/terms/refund/contact/ # Legal & public support pages
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
│   ├── colorPalettes.ts      # Palet warna tema undangan
│   ├── videoOptimizer.ts     # FFmpeg video compression (R2 upload)
│   ├── escapeHtml.ts         # HTML escape utility
│   ├── rateLimit.ts          # Rate limiter untuk API publik
│   ├── sseEmitter.ts         # Server-Sent Events emitter (momen real-time)
│   ├── gatewayRegistry.ts    # Registry 5 payment gateway
│   ├── gateways/             # Implementasi gateway: iPaymu, Duitku, Midtrans, TriPay, Xendit
│   ├── ipaymu.ts             # iPaymu payment client
│   ├── paymentEvents.ts      # Event bus pembayaran
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
│   ├── DATABASE_SCHEMA_DAN_RELASI.md          # Kamus data, ERD & lifecycle state machine
│   ├── API_REFERENCE.md                       # Katalog lengkap seluruh 40+ REST API, SSE & Webhook
│   ├── PANDUAN_PEMBUATAN_TEMA_BARU.md         # Theme developer guide, kamus token & standar HTML
│   ├── CLOUDFLARE_R2_DAN_CDN_SETUP.md         # Setup Cloudflare R2, domain CDN & auto-CORS
│   ├── SECURITY_DAN_PROTEKSI_DATA.md          # Arsitektur keamanan, AES-256-GCM & rate limit
│   ├── client/
│   │   ├── TAHAP_REGISTRASI_DAN_PEMBAYARAN.md  # Kasir checkout & pembayaran multi-gateway
│   │   ├── TAHAP_DASHBOARD_SETUP_AWAL.md       # Wizard setup awal 3 langkah
│   │   ├── TAHAP_STUDIO_EDITOR_UNDANGAN.md     # Studio editor 14 seksi & dual-native preview
│   │   ├── TAHAP_MANAJEMEN_TAMU_DAN_QR.md      # Buku tamu, import CSV, personalisasi link & tiket QR
│   │   ├── TAHAP_RSVP_DAN_MODERASI_UCAPAN.md   # Monitoring RSVP, hitung pax katering & feed doa
│   │   └── TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md # Subdomain checker, CNAME, & WOW publish
│   ├── admin/
│   │   ├── DASHBOARD_OVERVIEW_DAN_STATISTIK.md # Analitik metrik bisnis, pendapatan & server health
│   │   ├── REMOTE_DAN_MANAJEMEN_KLIEN.md      # Cookie-based remote session & user lifecycle
│   │   ├── MANAJEMEN_UNDANGAN_DAN_DOMAIN.md   # Pengelolaan undangan, force publish/suspend, CNAME
│   │   ├── MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md # Invoice, manual approval pembayaran & multi-gateway
│   │   ├── MANAJEMEN_TEMA_ADMIN.md            # Upload master HTML fisik & auto-compile demo
│   │   ├── PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md # White-label, Cloudflare R2 CORS & maintenance DB
│   │   ├── CRON_DAN_MAINTENANCE_OTOMATIS.md   # Tugas terjadwal cleanup, retensi & backup DB
│   │   └── DEPLOYMENT_VPS_CADDY.md            # Panduan deployment VPS Ubuntu & Caddy TLS
│   └── public/
│       ├── 01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md # Multi-domain resolution, compiler & dynamic CSS
│       ├── 02_PENGALAMAN_TAMU_UNDANGAN.md     # Cover gate, audio autoplay policy, kalender & maps
│       ├── 03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md   # Form RSVP publik, rate limiting & nested wish reply
│       ├── 04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md # Rekening bank copy button, QRIS & kado fisik
│       ├── 05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md # Portal resepsionis, HTML5 QR scanner & souvenir
│       └── 06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md # Upload foto candid tamu, live slideshow proyektor venue
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

### 3.1 — Tiga Format URL & Relasi ke URL Asli

```
FORMAT 1 — Subdomain (Sementara Menjelang & Saat Acara, H + subdomain_grace_days)
  URL  : dimas-clarissa.luxenary.id
  Flow : Middleware deteksi host = subdomain → Menunjuk ke Endpoint URL Asli
  Notes: Setelah acara + subdomain_grace_days, file HTML dihapus dan subdomain dilepas ke pool (subdomain = null).

FORMAT 2 — URL Asli / Canonical Flat Slug (SATU-SATUNYA PINTU UTAMA / Single Source of Truth)
  URL  : luxenary.id/dimas-clarissa-030326
  Flow : Endpoint inti Next.js (/[slug] dan /[slug]/memories).
  Notes: Selalu aktif selama masa retensi. Setelah acara selesai (EVENT_FINISHED), URL asli inilah
         yang otomatis beralih peran menyajikan Galeri Kenangan Tamu (/memories).

FORMAT 3 — Custom Domain Klien (Jasa Integrasi 1 Tahun Penuh)
  URL  : dimas-clarissa.com (domain pribadi milik klien)
  Flow : Middleware deteksi isCustomDomain → Fetch /api/public/resolve-custom-domain
         → Internal rewrite ke Endpoint URL Asli (/[slug] atau /[slug]/memories)
  Notes: Klien membeli domain sendiri di registrar luar, platform mengenakan tarif jasa
         integrasi DNS + Auto-SSL Caddy yang otomatis menjamin URL Asli & Galeri aktif 1 tahun.
```

> **Proteksi Subdomain Khusus (`RESERVED_SUBDOMAINS`):**  
> Subdomain sistem (`cdn` untuk Cloudflare R2, `admin`, `api`, `auth`, `receptionist`, `dashboard`, `demo`, `login`, `checkout`, `pay`, `app`, `www`, `cname`, `host`, `alias`, `invite`, `static`, `assets`, `media`, `storage`, `r2`, `s3`) dikunci secara terpusat di `lib/domainUtils.ts`, divalidasi ketat pada endpoint pembuatan/pembaruan undangan (`create` & `[id]`), serta dilewati di `middleware.ts` sehingga tidak dapat diklaim oleh klien atau di-rewrite ke portal undangan.


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

### 3.4 — Platform Exclusions & Anti-Rewrite Loop di `middleware.ts`
Seluruh rute sistem platform dikelompokkan dalam array `PLATFORM_EXCLUSIONS` (`/contact`, `/privacy`, `/terms`, `/refund`, `/demo`, `/portfolio`, `/packages`, `/checkout`, `/login`, `/onboarding`, `/dashboard`, `/admin`, `/api`, `/_next`, `/static`, `/s/`, `/sharemoment`, `/memories`). Rute-rute ini dilewati langsung (`NextResponse.next()`) tanpa di-intercept oleh *Flat Slug Routing* untuk mencegah siklus rekursif (*infinite rewrite loop*) dan error 403/1000 pada reverse proxy/CDN.

### 3.5 — Middleware Logic Flowchart

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

### 3.5 — Pre-Flight Final Review Checklist & Smart Audit Protocol (Zero Data Bolong)

Sebelum undangan dapat dirilis (`PUBLISHED`), sistem menerapkan evaluasi sekuensial 10 komponen data pada panel Pengaturan (`/dashboard/settings`):

1. **Prinsip Hubungan Sakelar (*Toggle*) & Kewajiban Data:**
   - **Seksi Wajib Mutlak (Tanpa Sakelar):** Subdomain, Tema, Nama Kedua Mempelai, Tanggal Acara, Lokasi & Waktu, PIN Panitia. Wajib terisi 100%.
   - **Seksi Bersakelar (`showGallery`, `showStory`, `showGift`, `showMusic`):**
     - Jika **AKTIF (Toggle ON)**: Data wajib ada isinya. Jika kosong $\rightarrow$ verifikasi gagal (**HALT**).
     - Jika **NONAKTIF (Toggle OFF)**: Tampil pada radar pemindai dengan status **`Nonaktif (Dilewati)`** $\rightarrow$ verifikasi **LOLOS**.
2. **Data Awal Bersih & Peran `placeholder`:**
   - Database awal murni kosong (`null` atau `[]`) tanpa data contoh/dummy buatan agar mesin audit dapat mendeteksi kekosongan dengan akurasi 100%.
   - Input formulir Studio Editor menggunakan atribut HTML `placeholder="..."` sebagai pemandu visual elegan bagi klien tanpa mencemari nilai data asli.
3. **Pre-Flight Gatekeeper Checklist (6 Instrumen URL):**
   - Begitu audit lolos, sistem menyajikan kartu review 6 instrumen URL terpisah:
     1. **Pintu Utama / URL Asli:** `https://luxenary.id/{invitationSlug}` (Single Source of Truth permanen)
     2. **Subdomain Eksklusif:** `https://{subdomain}.luxenary.id` (atau Custom Domain klien)
     3. **Simulasi Tautan Tamu:** `https://{subdomain}.luxenary.id/?to=Nama+Tamu` (Uji coba personalisasi nama tamu)
     4. **Portal Resepsionis & QR:** `https://{subdomain}.luxenary.id/receptionist` (Validasi PIN Panitia)
     5. **Galeri Kenangan Tamu:** `https://{subdomain}.luxenary.id/memories` (Live Album & Slideshow Kenangan)
     6. **Form Kamera Tamu:** `https://{subdomain}.luxenary.id/sharemoment` (Input foto momen tamu langsung)
   - **Mode Preview DRAFT:** Sebelum status `PUBLISHED`, seluruh tombol "Buka Web" menyertakan parameter `?preview=true` sehingga klien dan panitia dapat menguji coba seluruh tampilan dan fitur tanpa membuka akses publik prematur.
   - Tombol **"Rilis Undangan Resmi"** terkunci (*disabled*) hingga ke-6 checkbox konfirmasi dicentang oleh klien.

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
                                 ├── Upload foto tamu dikunci permanen (memoriesUploadLocked = true)
                                 ├── Formulir RSVP dibersihkan otomatis
                                 ├── Tamu & Klien unduh koleksi foto via ZIP (aman dari data susulan)
                                 └── Klien perpanjang galeri (+30 Hari via QRIS)
                                 │
                                 ▼ (Masa galeri habis / H + retention_gallery_default_days atau galleryExpiresAt)
                            [ARCHIVED]
                                 ├── Foto momen tamu di R2 & lokal dihapus permanen
                                 ├── Subdomain dilepaskan kembali ke pool (subdomain = null)
                                 └── URL dialihkan ke Portofolio (jika ada) atau Graceful Expired Page
```

### 6.1 — Status Undangan (Enum `InvitationStatus` di DB)
- `DRAFT` — Masih dalam pengaturan, URL publik tidak aktif, download ZIP foto tamu dinonaktifkan.
- `PUBLISHED` — URL publik aktif, file HTML statis sudah di-bake ke disk (`/published/`). Tamu dapat upload foto; jika klien unduh ZIP dini, sistem memicu peringatan dan mengunci upload tamu.
- `EVENT_FINISHED` — Acara utama selesai; undangan fisik ditutup dan beralih fungsi menjadi **Galeri Kenangan Tamu (`/memories`)**. Upload foto tamu otomatis dikunci (`memoriesUploadLocked = true`) agar arsip ZIP aman diunduh tanpa risiko foto tercecer.
- `TAKEN_DOWN` — Dinonaktifkan sementara oleh Admin atau Klien.
- `ARCHIVED` — Diarsipkan setelah masa galeri berakhir; foto dihapus dari cloud storage R2, subdomain didaur ulang kembali ke pool.

### 6.2 — Fase Otomatisasi Cron Cleanup (`POST /api/cron/cleanup`)
Cron job dilindungi oleh header `Authorization: Bearer <CRON_SECRET>` atau sesi Admin:
1. **Fase 1 (Transisi Pasca Acara — H + `retention_invitation_grace_days`, default 7 Hari):**
   - Memastikan file canonical slug sudah ter-bake (`buildAndSavePublishedHtml`).
   - Menghapus fisik file subdomain HTML saja (`deleteSubdomainHtmlOnly`) sehingga akses subdomain otomatis fallback rewrite ke `/s/[subdomain]/memories`.
   - Mengubah status ke `EVENT_FINISHED` (URL Asli otomatis beralih fungsi menyajikan Galeri Momen Tamu).
   - Mengunci upload foto tamu (`memoriesUploadLocked = true`) agar arsip ZIP aman diunduh tanpa risiko foto tercecer.
   - Menghapus record `rsvp` kedaluwarsa demi privasi data tamu.

### 6.3 — Proteksi Tab Edit Pasca Publish, Kunci Darurat, & Atomic Deploy
1. **Penguncian Studio Pasca Publikasi (`status === 'PUBLISHED'`):**
   - Begitu undangan terbit, seluruh formulir di tab Edit Undangan (`/dashboard/invitation/[id]`) otomatis dikunci demi melindungi keutuhan data live dan keterhubungan QR Code fisik.
   - Halaman menampilkan layar proteksi elegan *"Studio Editor Terkunci Pasca Publikasi"* dan tombol WhatsApp pre-filled ke CS/Admin untuk meminta izin revisi darurat.
2. **Mekanisme Buka Kunci Darurat (Emergency Unlock):**
   - Administrator dapat membuka akses edit melalui panel Admin (`/admin`) dengan batas waktu default 24 jam (`adminUnlockedUntil`).
   - Seluruh aksi buka/tutup kunci darurat terekam di tabel `adminAuditLog`.
3. **Pencegahan Perulangan Bake (*No Rebake Storm*):**
   - Saat dalam mode darurat, tombol "Simpan" pada tiap seksi hanya menyimpan perubahan ke database PostgreSQL (Prisma), **TIDAK** memicu rebake HTML / upload R2 secara berulang-ulang.
4. **Atomic Single Deploy & Auto-Lock (`DEPLOY_AND_LOCK`):**
   - Di puncak form editor terdapat tombol utama **"Perbarui Undangan & Kunci Kembali"**.
   - Saat ditekan, sistem melakukan **1 kali kompilasi tunggal (Atomic Bake & R2 Sync)** dari data database terbaru, lalu seketika menghapus izin darurat (`adminUnlockedUntil = null`).
   - Studio otomatis terkunci kembali secara instan tanpa perlu menunggu waktu 24 jam habis.
5. **Daur Ulang Subdomain ke Pool:**
   - Jika subdomain diganti, nilai lama seketika terlepas dari record Prisma (`@unique`) dan langsung kembali ke pool publik secara otomatis. Tamu yang membuka link lama dialihkan dengan aman ke `/?notice=subdomain-available`.
2. **Fase 1.5 (Daur Ulang Subdomain Otomatis — H + `subdomain_grace_days`, default 7 Hari):**
   - Jika `subdomain_auto_recycle = "true"`, sistem secara otomatis memeriksa undangan yang telah lewat masa tenggang subdomain dan melepaskan nama subdomain ke *pool* (`subdomain: null`).
   - Nama subdomain kembali bebas digunakan pasangan baru, sementara URL Asli tetap hidup dan menyajikan galeri kenangan.
3. **Fase 2 (Pembersihan Galeri & Arsip Total — H + `retention_gallery_default_days` ATAU `galleryExpiresAt`):**
   - Jika `now > effectiveExpiry` (tidak diperpanjang klien via QRIS):
     - Menghapus seluruh file fisik foto kenangan tamu (`GuestMemory`) dari Cloudflare R2 (`deleteFile`) dan disk lokal.
     - Menghapus record `guest_memories` dari database.
     - Mengunci upload foto (`memoriesUploadLocked = true`).
     - Mengubah status menjadi `ARCHIVED`.
     - Melepaskan Subdomain kembali ke pool umum (`subdomain = null`) jika belum dilepas.
    - **Dinamisasi Publik & Paket:** Paket berfitur `guest_memories` (`/memories`) secara dinamis menampilkan masa aktif `retention_gallery_default_days` (default 30 hari / 1 bulan pasca-acara) pada landing page, paket, terms, privacy, dan kontak.
4. **Fase 3 (Pembersihan Total Akun Klien Lama — H + `retention_account_days`, default 365 Hari):**
   - Menghapus akun klien yang semua undangannya sudah `ARCHIVED` lebih dari `retention_account_days`.

### 6.3 — API Kontrol Siklus Hidup Manual Admin (`POST /api/admin/invitations/[id]/lifecycle`)
Khusus SUPER_ADMIN / ADMIN untuk intervensi operasional langsung dari dashboard:
- `action = "CLOSE_TO_GALLERY"`: Menutup undangan seketika, menghapus subdomain HTML, dan mengubah status ke `EVENT_FINISHED`.
- `action = "EXTEND_GALLERY"`: Menambah durasi `galleryExpiresAt` sebesar `days` (default +30 hari) dan membuka kembali kunci upload.
- `action = "UPDATE_EVENT_DATE"`: Mengedit tanggal acara utama darurat jika jadwal pernikahan dimajukan/diundur.

### 6.4 — Dua Layanan Tambahan (Add-Ons) & Perpanjangan
1. **Jasa Integrasi Custom Domain (1 Tahun Penuh) (`orderType: CUSTOM_DOMAIN_ADDON`):**
   - Mengatur tarif jasa integrasi domain milik klien (DNS CNAME / Record A & Auto-SSL Caddy).
   - Dibaca dari `AdminSetting` (`addon_custom_domain_price`, default Rp150.000).
   - **Feature Toggle & Coming Soon Control (`addon_custom_domain_enabled`):**
     - Admin dapat mengaktifkan atau menonaktifkan penawaran custom domain via toggle switch di Pengaturan Admin (Tab Paket & Harga → Add-ons).
     - **UX Klien:** Jika toggle dinonaktifkan (`false`), klien yang belum memiliki custom domain akan melihat kartu status *Segera Hadir / Belum Tersedia* (disabled state) tanpa formulir pemesanan. Klien yang sudah memiliki custom domain aktif (`invitation.customDomain`) tetap dapat melihat dan mengelola domain aktifnya secara normal (Zero-Regression).
     - **Backend Guard:** Endpoint `POST /api/client/custom-domain/buy` memverifikasi status toggle dari database `AdminSetting` dan mengembalikan HTTP 403 Forbidden jika fitur sedang dinonaktifkan.
     - **Real-time Synchronized:** Endpoint `GET /api/public/settings` menggunakan `export const dynamic = "force-dynamic"` agar perubahan toggle admin langsung terrefleksi instan di browser klien.
   - Di eksekusi pembayaran (`applyCustomDomainAddon`), sistem memasang domain kustom DAN otomatis memperpanjang masa aktif URL Asli serta galeri kenangan selama **+365 hari (1 tahun penuh)**.
2. **Perpanjangan Masa Aktif URL Asli / Galeri (Bulanan) (`orderType: GALLERY_EXTENSION`):**
   - Memperpanjang masa hidup URL Asli undangan (yang pasca acara menyajikan Galeri Kenangan) beserta arsip foto tamu di Cloudflare R2 per 30 hari via QRIS dinamis.
   - Dibaca dari `AdminSetting` (`gallery_extension_price_per_month`, default Rp50.000).
   - Di eksekusi pembayaran (`applyGalleryExtension`), sistem menambahkan **+30 hari** ke `galleryExpiresAt` dan membuka kembali izin unggah foto jika dibutuhkan.

### 6.5 — Smart Fallback Lifecycle Routing (`app/(public)/[slug]/route.ts`)
Jika undangan telah berstatus `ARCHIVED` (masa galeri 30 hari berakhir):
1. Sistem memeriksa keberadaan file salinan portofolio mandiri secara otomatis melalui `hasPortfolio(slug)`.
2. **Kondisi A (Ada Portofolio):** Pengunjung yang mengakses URL Asli otomatis dialihkan (*HTTP 307*) ke `/portfolio/[slug]` sebagai arsip kenangan abadi.
3. **Kondisi B (Tanpa Portofolio):** Pengunjung langsung dialihkan (*HTTP 302/307*) kembali ke Halaman Utama (`/`) secara elegan tanpa error 404.

### 6.5.1 — Manajemen Projek Undangan di Admin Dashboard (`app/(admin)/admin/page.tsx`)
1. **Nama Tab & Elevasi Konseptual:** Tab navigasi diubah dari sekadar "Undangan" menjadi **"Projek Undangan" (Invitation Projects)** untuk mencerminkan satu siklus hidup utuh (persiapan, tayang, pasca-acara, hingga pengarsipan).
2. **Quick Status Filter Tabs:** Bar penyaring cepat dengan counter otomatis:
   - `Semua (Total Projek)`
   - `Draft` (Sedang disusun klien / belum rilis)
   - `Undangan Aktif` (Sedang tayang sebelum & pada hari H)
   - `Galeri Momen` (Acara selesai, masa H+30 galeri aktif)
   - `Selesai / Arsip` (Masa galeri selesai, dialihkan ke Portofolio / Beranda)
3. **Minimalist Dot Indicators & Zero-Badge Clutter:**
   - Menghilangkan badge teks besar/berat, digantikan dengan indikator bulatan warna halus 2px/6px:
     - 🟡 Oranye lembut: *Draft (Belum Rilis)*
     - 🟢 Hijau berpendar (*subtle pulse*): *Undangan Tayang* + Tanggal Acara
     - 🟣 Ungu elegan: *Galeri Momen Tamu* + Tanggal Habis / Penanda `✦ Extended: [Tanggal]`
     - ⚪ Abu-abu netral: *Selesai / Arsip*
4. **Indikator Kolom Arah URL:** Menampilkan secara transparan ke mana URL publik diarahkan secara *real-time* (Undangan Lengkap, Galeri Momen, atau Portofolio / Beranda).

### 6.6 — Hero Launchpad Publikasi Undangan & Verifikasi Sekuensial 3-Baris Bergulir
1. **Pemisahan & Elevasi ke Hero Launchpad:**
   - Tombol publikasi di `/dashboard/settings` dielevasi menjadi Hero Launchpad mandiri di posisi paling atas, terpisah dari form pengaturan teknis biasa.
2. **Mode Fokus Penuh & Sliding Ticker (Maksimal 3 Baris):**
   - Saat proses pemeriksaan dimulai, seluruh kartu form di bawahnya meluncur menutup secara mulus (`hidden`). Layar fokus pada satu kartu audit dengan radar pemindai dan jendela *sliding ticker* vertikal (tinggi 156px) dengan efek *fade mask* atas-bawah.
   - Item yang telah selesai diperiksa akan bergulir naik ke atas secara otomatis (`transform: translateY(...)`), item aktif disorot di baris tengah, dan item antrean berikutnya berada di baris bawah.
3. **10 Poin Pemeriksaan Integritas:**
   - Subdomain / Tautan Resmi (Wajib)
   - Desain Tema Pilihan (Wajib)
   - Profil Lengkap Kedua Mempelai (Wajib)
   - Tanggal Acara Utama — *Sebagai Referensi Masa Berlaku Website* (Wajib Utama)
   - Waktu & Lokasi Acara (Wajib)
   - Galeri Foto & Cover (Opsional)
   - Cerita Kisah Kasih / Love Story (Opsional)
   - Rekening & Hadiah Digital (Opsional)
   - Musik Latar Pengiring (Opsional)
   - PIN Keamanan Meja Tamu (Wajib)
4. **Penanganan Opsi Santun & Catatan Diskret:**
   - Jika data wajib belum lengkap (terutama tanggal acara): Sistem menolak dengan santun tanpa merusak alur, menjelaskan fungsinya sebagai referensi masa berlaku, lalu menyediakan tombol kembali ke pengisian.
   - Jika data opsional kosong: Menyajikan ringkasan elegan dengan 2 tombol (`Kembali & Lengkapi Data` dan `Tetap Lanjutkan Publikasi`) didampingi catatan diskret berukuran kecil di bawah tombol (tanpa popup mengganggu) bahwa tema dan tautan resmi akan dikunci setelah peluncuran.
5. **Banner Selebrasi Resmi & Sinkronisasi Seketika (Zero Cache):**
   - Menggunakan bahasa formal, santun, dan netral layanan SaaS (*"Selamat Berbahagia untuk [Mempelai Pria] & [Mempelai Wanita] — Website Undangan Resmi Anda Telah Aktif Mengudara"*).
   - Menampilkan Official Launch Box dengan lencana enkripsi SSL aktif, tombol salin tautan, tombol buka website, dan tombol bagikan via WhatsApp.
   - Menampilkan kartu keterhubungan Buku Tamu dan tombol pintas `Buka Buku Tamu →`.
   - Endpoint `GET /api/client/invitations` menyertakan header `Cache-Control: no-store, no-cache, must-revalidate` serta pemanggilan `fetch` di `/dashboard/guests` dan `/dashboard` menyematkan `{ cache: "no-store" }` agar tautan personal tamu aktif seketika saat tab berpindah tanpa *caching lag*.

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
* **Standar Kontrak Placeholder Nama Mempelai (Cover vs Profil):**
  - **Cover Buka Undangan, Hero Title, Sidebar Desktop, & Closing Footer:** Wajib menggunakan Nama Panggilan (`{{firstName}} & {{secondName}}`). Menghasilkan impresi visual yang elegan, intim, dan bersih.
  - **Seksi Profil Pasangan (*The Couple*):** Menggunakan Nama Lengkap beserta Gelar Akademik/Adat (`{{firstDisplayName}} & {{secondDisplayName}}` atau `{{firstFullName}} & {{secondFullName}}`), dilengkapi info orang tua (`{{firstParents}}` & `{{secondParents}}`) dan akun Instagram.
  - **Monogram & Inisial Logo Dinamis (`firstInitial`, `secondInitial`, `coupleMonogram`):** Mengambil huruf awal nama panggilan mempelai secara otomatis sesuai `displayOrder` untuk *brand watermark* atau *crest logo* di desktop hero.
  - **Label Seksi & Pengantar Profil Universal (`coupleSectionEyebrow`, `coupleSectionSub`):** Menjamin pengantar profil bersifat universal dan elegan tanpa benturan terminologi keagamaan yang kaku.
* **Arsitektur Seksi Penutup Adaptif 100vh (`.site-footer` / `.closing-sec`) & Fallback Label:**
  - **Variabel Dinamis Template Engine:**
    - `closingPhotoUrl`: URL foto dari slot media `CLOSING_COVER` (atau `null` jika kosong).
    - `hasClosingPhoto`: Boolean ketersediaan foto.
    - `closingPhotoClass`: `"has-closing-photo"` bila ada foto, atau `"no-closing-photo"` bila kosong.
    - `closingBgStyle`: CSS inline `background-image: url(...)` dinamis saat foto ada, atau string kosong `""` saat mode kanvas.
  - **Dua Mode Tampilan Outro 100vh:**
    1. *Mode Kanvas Kosong (`no-closing-photo`):* Layar penuh 100vh bersih dengan warna dasar tema (dilarang ada gambar dummy/Unsplash fallback). Blok ucapan terima kasih dan nama mempelai terpusat sempurna di tengah layar (`justify-content: center; align-items: center; text-align: center;`).
    2. *Mode Foto Penutup (`has-closing-photo`):* Foto penutup mengisi background layar penuh dengan overlay gradasi/scrim, dan blok teks berpindah secara elegan ke bagian bawah layar (`justify-content: flex-end;`).
  - **Standarisasi Proporsi Split Desktop (Golden Ratio 460px di Seluruh 15 Tema Master):**
    - Seluruh 15 tema fisik master kini mengadopsi rasio proporsional desktop presisi: panel undangan kanan dikunci pada lebar ideal smartphone flagship **`width: 460px; margin-left: calc(100% - 460px);`**, sementara sidebar Hero kiri otomatis membentang mengisi seluruh sisa panggung layar widescreen (`width: calc(100% - 460px);`).
    - Menghilangkan total masalah konten melar pada monitor besar (1920px Full HD atau ultrawide), dan menjamin floating dock navigasi (`.bottom-dock`) selalu terpusat simetris di tengah panel undangan (`left: calc(100% - 230px) !important;`).
  - **Standarisasi Tipografi Anti-Overflow Split Desktop (Mobile-Emulation Scale):**
    - **Akar Masalah Tipografi `vw`:** Unit CSS `vw` mengevaluasi lebar seluruh layar peramban (1440px - 1920px), bukan lebar kontainer 460px. Hal ini membuat judul besar berhuruf kapital (misal "LIVE STREAMING") atau font kaligrafi (seperti *Parisienne* / *Cinzel*) membengkak hingga >54px dan meluap keluar dari panel split kanan.
    - **Pemberian Cap Maksimal:** Pada media query `@media (min-width: 900px)`, seluruh judul seksi `.sec-main-title, .sec-heading` dikunci maksimal pada `font-size: clamp(1.75rem, 2.1rem, 2.3rem) !important;` dengan proteksi `overflow-wrap: break-word !important; word-break: break-word !important;`.
    - **Normalisasi Padding Horizontal:** Padding horizontal pada seksi di desktop dinormalisasi dari nilai warisan `3.5rem` (112px) menjadi `1.8rem` (~57px), mempertahankan ruang efektif konten ~404px yang identik dengan viewport mobile asli.
    - **Penerapan pada Starter Blueprint (`themes/starter-blueprint.html` & `public/downloads/starter-blueprint.html`):** Arsitektur `.layout-wrapper`, `.sidebar-desktop`, `.main-scroll-panel` (460px), dan aturan tipografi anti-overflow telah diintegrasikan langsung ke dalam master starter blueprint sebagai standar emas bagi para Theme Builder.
  - **Standarisasi Smart Auto-Hide Navigasi Dock & Kontrol Audio Mengambang:**
    - Seluruh 15 tema fisik master dan `starter-blueprint.html` dilengkapi mekanisme auto-hide pintar berbasis hardware acceleration (`translate3d` & `opacity`).
    - Saat tamu melakukan scroll ke bawah (membaca isi undangan/galeri), dock navigasi dan tombol kontrol musik meluncur keluar layar secara serentak sehingga ruang pandang 100% bersih tanpa gangguan floating button.
    - Saat tamu melakukan scroll ke atas (delta $\ge$ 12px), berada di area paling atas (`scrollTop <= 70px`), tiba di footer, atau mengklik tautan menu, kontrol mengambang otomatis meluncur masuk kembali secara halus (*cubic-bezier(0.16, 1, 0.3, 1)*).
  - **Standarisasi Slot Visual & Background Layer Fokus Khusus Tema Chronicle:**
    - Background global tidak lagi dipasang pada `body` 100vw, melainkan menggunakan elemen kanvas independen `.fixed-bg-layer`:
      - Di HP/Mobile (`< 900px`): Memenuhi 100% layar vertikal ponsel.
      - Di Komputer/Desktop (`≥ 900px`): Dibatasi presisi hanya menyelimuti kolom undangan kanan (`width: 460px; left: calc(100% - 460px);`), sehingga titik fokus foto simetris di tengah undangan dan tidak terpotong atau tertutup oleh panel Hero kiri.
    - Seksi awal panel scroll kanan memiliki slide pembuka editorial resmi `<section id="home" class="slide-section sec-hero-editorial">` yang menggunakan `{{homePhotoUrl}}` (Slot *Latar Belakang Home*), menyajikan impresi cover majalah eksklusif dengan judul masthead dan tanggal acara yang sangat memukau di perangkat Mobile maupun Desktop.
    - Sisi kiri widescreen dikendalikan oleh `.sidebar-desktop` via `{{sidebarPhotoUrl}}` (Slot *Desktop Sidebar*).

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
  GET  /api/public/themes             → List tema aktif (force-dynamic, no-cache, instan tersinkron dengan toggle admin)
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
  POST      /api/client/upload             → Upload media undangan (WebP Sharp, MP4 H.264 FFmpeg Loop maks 20s & 30MB, MP3 Audio wedding-song.mp3 maks 20MB via storage.ts; penamaan slot deterministik & clean overwrite otomatis)
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
  GET/POST /api/admin/music            → Pustaka musik sistem (List all & upload audio + kompresi FFmpeg 128kbps)
  PATCH/DELETE /api/admin/music/{id}   → Edit metadata/status & hapus lagu sistem

PUBLIC:
  GET  /api/public/music               → Pustaka musik sistem aktif untuk pemilih lagu klien (auto-seed fallback)

RECEPTIONIST (public + PIN-protected di client side):
  POST /api/receptionist/verify-pin   → Verifikasi PIN panitia (AES-256-GCM 32-byte key) & penerbitan token sesi HMAC
  GET  /api/receptionist/guests       → List tamu untuk scanner offline-first
  POST /api/receptionist/scan         → Tandai tamu hadir (validasi token sesi panitia)
  StaffLockScreen & ReceptionistClient:
    - Context & Hook: StaffAuthContext & useStaffAuth()
    - Mekanisme Kunci Layar / Logout: Revokasi token staff_auth_token_${id} di localStorage, transisi instan ke layar PIN Akses Terkunci, peringatan keamanan antrean offline.
    - Check-in Card: Menampilkan Nomor Meja (Focal Card) dan kuota Pax secara presisi saat check-in berhasil maupun duplikat.
    - Clean Professional Navbar: BrandLogo terpusat bersama nama platform di sisi kiri, judul "RECEPTIONIST SYSTEM" berada di posisi tengah persis, dan aksi sisi kanan menggunakan tombol ikon SVG minimalis (indikator online hijau bulat, tombol fullscreen ikon, tombol kunci sesi ikon).
    - Minimalist Scanner UI: Judul pemindai ringkas ("SCAN" & "KAMERA LIVE"), kartu statistik kehadiran disembunyikan agar perhatian fokus pada proses check-in, dan daftar tamu diringkas menjadi tombol kecil dropdown di dalam kartu tanpa badge count yang mengganggu.
    - Multi-Device Camera Engine: Mendukung laptop webcam dan tablet (iPad/Android) dengan auto-deteksi device, tombol Balik Kamera (depan/belakang), overlay laser scanline animasi, chime audio Web Audio API, serta anti-double scan cooldown (3s).
    - Unified Card Control: Menggantikan tab 50/50 kaku dengan single dynamic switcher button yang mulus berganti status tanpa DOM unmount.
    - Fullscreen Kiosk Mode & Color Scheme Isolation: Tombol Layar Penuh terintegrasi di navbar header (HTML5 Fullscreen API dengan event tracking) serta penguncian colorScheme: 'light' untuk menjamin warna antarmuka 100% konsisten terlepas dari tema Dark/Light bawaan perangkat.

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
  MusicPreset    → Pustaka musik sistem dinamis (id, title, composer, genre, url, durationSec, isActive, sortOrder)

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
| `GOOGLE_DRIVE_WEBHOOK_URL` | 🗑️ Terhapus | Variabel webhook Google Apps Script lama dihapus dari .env, digantikan Cloudflare R2 / S3 dan Google Drive API v3 resmi. |
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

## 11.4 - Arsitektur Pemrosesan Video Loop & Media Engine

Sistem mendukung video loop bergerak (*ambient video*) pada 3 slot visual utama: **`LANDING_COVER`** (Opening Pop-up), **`DESKTOP_SIDEBAR`** (Hero Desktop 70% kiri), dan **`GLOBAL_FIXED_BG`** (Latar Belakang Kartu Undangan).

### 1. Pipeline Konversi & Optimalisasi Server (`videoOptimizer.ts`)
- **Engine:** FFmpeg (`libx264`, preset `fast`, CRF 26, YUV420p).
- **Auto-Trim Durasi:** Maksimal 20 detik pertama (`-t 20`). Video di atas 20 detik otomatis dipotong di server.
- **Silent Loop Optimization:** Menghapus seluruh track audio (`-an`) untuk menghemat kapasitas ~20% dan memastikan kepatuhan mutlak terhadap kebijakan *mobile browser autoplay* (iOS Safari & Android Chrome).
- **FPS Capping:** Dibatasi maksimal 30 fps (`-r 30`) untuk menjaga efisiensi rendering GPU/CPU perangkat tamu.
- **Streaming Instan:** Flag `+faststart` menempatkan moov atom di awal file MP4 sehingga video langsung berputar sebelum unduhan tuntas.

### 2. Validasi & Proteksi Ukuran File (2 Lapis)
- **Frontend:** Validasi instan sebelum pengiriman file (Maks. 30MB untuk video, Maks. 15MB untuk foto, format `.mp4`, `.mov`, `.webm`).
- **Backend API (`/api/client/upload`):** Proteksi HTTP 400 Bad Request jika ukuran file melebihi 30MB (video) atau 15MB (foto).

### 3. Rendering Engine Dinamis (`renderTemplate.ts`)
- `renderTemplateFile` secara cerdas mendeteksi tipe media melalui ekstensi URL (kebal query timestamp).
- **Isolasi Split Screen Desktop:** Pada layar desktop (>= 900px), video background global (`GLOBAL_FIXED_BG`) dikunci secara ketat pada kolom panel undangan kanan (`left: 55%; width: 45%;`), sehingga tidak bocor ke bawah hero kiri (`.left-hero`). Hero kiri tetap murni menampilkan medianya sendiri (`DESKTOP_SIDEBAR`).
- **Pencahayaan Soft Scrim:** Menggunakan rasio gradien transparan lembut (puncak 0.22, tengah 0.06, dasar 0.38) sehingga video prewedding tampak terang, jernih, dan hidup tanpa terbenam oleh lapisan gelap pekat. Kontras teks dijaga dengan `text-shadow`.
- Jika berformat video (`.mp4`, `.webm`, `.mov`), template tema otomatis menyuntikkan elemen HTML5 `<video class="..." autoplay loop muted playsinline webkit-playsinline>` dengan `object-fit: cover` dan `object-position: center center`.
- Jika berformat gambar, tetap mempertahankan CSS `background-image` standar tanpa regresi.

## 11.5 - Arsitektur Seksi Home Mandiri & Eliminasi Gap Bawah Footer (Container Flush Alignment)

### 1. Isolasi Latar Belakang Seksi Home (`HOME_PHOTO`)
- **Independensi Seksi:** Slot `HOME_PHOTO` ("Latar Belakang Home (Opsional)") diinjeksi secara langsung dan adaptif ke elemen `.slide-opening#home, section#home, .sec-hero-slideshow#home` lengkap dengan *scrim gradient* pelindung tipografi.
- **Fallback Cerdas:** Jika klien tidak mengunggah foto home, seksi Home tetap transparan memperlihatkan latar belakang fixed global (`GLOBAL_FIXED_BG` baik video loop maupun foto) sesuai spesifikasi tema.
- **Pemisahan Layer:** `.fixed-bg-layer` dikembalikan secara murni ke `globalBgUrl` untuk latar belakang kartu undangan, terpisah dari latar pembuka seksi Home.

### 2. Eliminasi Celah Bawah Footer (*Flush to Bottom*)
- **Pemberantasan Gap 90px / 110px:** Redundant `padding-bottom` pada `.right-panel` dan `.main-scroll-panel` dinetralkan secara global via `public/css/modules.css` dan `lib/renderTemplate.ts` (`padding-bottom: 0 !important;`).
- **Footer 100vh Sempurna:** Footer penutup (`.site-footer`) kini duduk pas (*flush*) menyentuh dasar layar tanpa celah bocor yang memperlihatkan layer video di baliknya.
- **Perlindungan Dock Navigasi:** Teks dan konten penutup tetap aman terlindungi dari tumpang-tindih dock navigasi bawah berkat padding bawah internal bawaan footer sebesar `6.5rem` (104px).

## 11.6 - Sinkronisasi Audio Universal & Autoplay Gesture Engine

### 1. Kepatuhan Kebijakan Browser Modern (*Autoplay Policy*)
- Browser modern (Chrome, Safari, iOS WebKit, Firefox) secara ketat memblokir audio tanpa *user gesture* terpercaya.
- Tombol pembuka cover (`.btn-buka`, `.btn-buka-undangan`, `.cover-btn-open`, `#btnOpenInvitation`) difungsikan sebagai gerbang pemicu audio resmi sehingga audio berputar mulus tanpa pemblokiran browser.

### 2. Arsitektur Sinkronisasi Multi-Layer
- **Capture-Phase Delegation Listener:** Menangkap klik pada seluruh variasi tombol buka undangan di fase *capture* dokumen (`{ capture: true }`), menjamin eksekusi audio berada langsung dalam *call stack trusted user gesture*.
- **Pembungkusan `window.openInvitation()`:** Membungkus fungsi pembuka cover master tema untuk mengeksekusi `window.playAudio()` dan sinkronisasi kelas status pemutar (`.music-fab.playing`).
- **Jembatan ID Audio Dinamis (`luxAudioPlayer` / `bgAudio` / `weddingAudio`):** Resolusi dinamis elemen audio pada runtime tanpa ketergantungan urutan parsing DOM atau ID template legacy.
- **Fallback Interaksi Sekunder:** Listener sentuhan/klik satu-kali setelah cover terbuka memastikan audio segera mulai berputar jika tamu membuka undangan melalui tautan langsung tanpa cover.
- **Isolasi Mode Pratinjau:** Kartu katalog `/demo` (`mode=cover`) tetap dibisukan agar tidak bersuara bersamaan, sementara studio visual klien (`mode=edit`) dan tautan tamu publik bebas memutar audio secara penuh.

## 11.7 - Sinkronisasi Sakelar Seksi (Feature Toggles) & Auto-Sync Navigasi Dock

### 1. Sepuluh Sakelar Fitur Mandiri (`featureSettings`)
Seluruh sakelar seksi dikelola dalam JSON field `featureSettings` pada model `Invitation` dan dikompilasi secara on-the-fly oleh `lib/themeEngine.ts`:
1. `showStory`: Mengontrol seksi perjalanan cinta (`#story`).
2. `showGallery`: Mengontrol seksi galeri foto & video (`#moments`).
3. `showGift`: Mengontrol seksi tanda kasih, amplop digital & rekening bank (`#gift`).
4. `showDresscode`: Mengontrol panduan busana tamu (`#dresscode`).
5. `showLiveStream`: Mengontrol seksi siaran virtual / live wedding (`#live`).
6. `showFilter`: Mengontrol bingkai filter Instagram / wedding frame (`#frame`).
7. `showTurutMengundang`: Mengontrol seksi daftar keluarga besar (`#turut-mengundang`).
8. `showQrCheckin`: Mengontrol kartu akses masuk QR & tombol tiket modal (`#checkin`).
9. `showMusic`: Mengontrol pemutar audio pengiring (`#luxAudioPlayer`).
10. `showGuestMemories`: Mengontrol feed foto momen tamu interaktif (`#section-memories`).

### 2. Auto-Sync Navigasi Dock & Tombol Audio FAB (`syncActiveTogglesUI`)
- **Dock Link Auto-Pruning:** Saat seksi dinonaktifkan oleh user, elemen HTML seksi tersebut sepenuhnya ditiadakan dari DOM. Runtime script (`lib/renderTemplate.ts`) secara otomatis memindai tautan dock (`.bottom-dock a, .side-nav a`) dan menyembunyikan item navigasi (`display: none`) apabila elemen target berawalan `#id` tidak ditemukan pada dokumen.

### 3. Verifikasi Mandatori Seluruh Slot Unggahan Visual (Pre-Flight Gatekeeper)
- **Eliminasi Gambar Demo Tak Disengaja:** Hero Launchpad di `/dashboard/settings` mengevaluasi 12 komponen data secara sekuensial. Dua aturan verifikasi media baru (`coverVisuals` dan `couplePhotos`) mewajibkan klien mengunggah seluruh slot visual:
  1. `LANDING_COVER` (Sampul Pop-Up)
  2. `DESKTOP_SIDEBAR` (Hero Kolom Kiri Desktop)
  3. `GLOBAL_FIXED_BG` (Latar Bergerak / Fixed Background)
  4. `CLOSING_COVER` (Foto Penutup)
  5. `GROOM_PHOTO` (Foto Mempelai Pria)
  6. `BRIDE_PHOTO` (Foto Mempelai Wanita)
- **Dynamic Missing Feedback:** Jika terdapat slot yang belum diunggah, pemindai otomatis berhenti sementara (*HALT_MANDATORY*) dan merinci secara spesifik nama slot yang belum lengkap sehingga klien dipandu langsung untuk melengkapinya di Edit Undangan.

## 11.8 - Standardisasi Dynamic Token Pasangan, Watermark Monogram, & Universal Wording

### 1. Token Monogram & Inisial Pasangan (`firstInitial`, `secondInitial`, `coupleMonogram`)
- Disuntikkan secara dinamis oleh `lib/themeEngine.ts` dan `lib/demoRegistry.ts`:
  - `{{firstInitial}}`: Inisial huruf kapital pertama dari mempelai pertama (`{{firstName}}`).
  - `{{secondInitial}}`: Inisial huruf kapital pertama dari mempelai kedua (`{{secondName}}`).
  - `{{coupleMonogram}}`: Kombinasi terformat `J & V`.
- Diaplikasikan pada elemen watermark desktop `.left-hero-crest` di sudut kiri atas layar untuk sentuhan visual editorial mewah layaknya majalah mode haute-couture.

### 2. Token Label Dinamis Seksi Profil (`#couple`)
- Menghilangkan duplikasi teks statis dan memastikan fleksibilitas Live Editor:
  - `{{coupleSectionEyebrow}}`: Label kecil atas (default: `"THE COUPLE"`).
  - `{{coupleSectionTitle}}`: Judul utama (default: `"Mempelai"`, mendukung live editor via `data-lux-field="customLabels.coupleTitle"`).
  - `{{coupleSectionSub}}`: Teks pengantar ramah dan universal (mendukung `data-lux-field="customLabels.coupleSub"`).
  - `{{firstRole}}` & `{{secondRole}}`: Label peran mempelai dinamis ("Groom" / "Bride") yang otomatis berotasi saat urutan mempelai (`displayOrder`) diubah.
  - `{{firstParentLabel}}` & `{{secondParentLabel}}`: Label silsilah keluarga ("Putra Dari" / "Putri Dari" atau kustom).

### 3. Netralitas Budaya & Wording Universal
- Seluruh template master dan data demo mengadopsi standar salam pernikahan universal elegan non-sektarian secara default:
  > *"Dengan penuh rasa syukur dan sukacita, kami mengundang Anda untuk merayakan persatuan cinta kami dalam ikatan suci pernikahan."*
- Penamaan sesi acara default diatur ke standar universal: `WEDDING CEREMONY` dan `DINNER RECEPTION`.

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

### 15.7 — Identitas Publik & Proteksi Hak Cipta Statis (Luxenary Public Identity Banner & DevTools Guard)
- **Banner ASCII & Lisensi Eksklusif:** Setiap dokumen publik (Root Layout [`app/layout.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/layout.tsx), 16 master template [`themes/`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/themes), serta seluruh kompilasi demo statis [`public/demo/`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/public/demo)) dilengkapi komentar banner ASCII resmi **LUXENARY** di baris pertama dokumen.
- **Pipeline Kompilasi Otomatis:** Engine [`lib/renderTemplate.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/renderTemplate.ts) dan [`lib/staticPublisher.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/staticPublisher.ts) menjamin setiap undangan yang dibake saat publish (`public/published/ids/[id].html`) maupun diakses di subdomain/custom domain secara otomatis menyertakan banner identitas dan skrip proteksi konsol Luxenary sebelum tag `</body>`.
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

### 15.8 — Sinkronisasi Dinamis Tab Browser & Favicon (Zero Build-Time Hardcode)
- **Dynamic Metadata & Zero Caching SSR:**
  - Root layout (`app/layout.tsx`) dan Admin layout (`app/(admin)/layout.tsx`) menerapkan `export const dynamic = "force-dynamic"` dan `export const revalidate = 0`.
  - Fungsi `generateMetadata()` membaca nama platform real-time dari tabel database via `getPublicPlatformSettings()`. Mencegah build-time static HTML caching yang dapat membekukan judul tab ke nilai default saat aplikasi di-build.
- **Client-Side Document Title Reactivity & Eliminasi Flash Fallback Teks:**
  - Halaman interaktif (`app/(admin)/admin/page.tsx`, `app/(admin)/admin/login/page.tsx`, `app/(client)/dashboard/layout.tsx`, dan `app/login/page.tsx`) memiliki hook `useEffect` reaktif yang menyinkronkan `document.title` dengan nilai `platform_name` dari state/API settings secara langsung.
  - Saat nama platform diperbarui oleh administrator di menu Pengaturan, nama tab browser langsung terbarukan secara instan tanpa perlu memuat ulang seluruh halaman (*zero reload*).
  - **Zero Fallback Flash (`settingsLoaded` Guard):** Komponen `BrandLogo` dan header dashboard admin dibersihkan dari fallback teks seperti `"Platform Admin"`. Selama proses loading data awal (`!settingsLoaded || status === "loading"`), sistem menampilkan layar tunggu elegan (*loading state*), sehingga saat UI tampil, nama platform yang valid langsung tampil seketika tanpa ada kedipan pergantian nama sementara.

### 15.9 — Isolasi Aset Statis Middleware & Cloudflare Edge Caching
- **Eliminasi Cookie Injeksi pada Aset Media:**
  - Konfigurasi `matcher` pada `middleware.ts` secara eksplisit mengecualikan seluruh file media dan aset statis (`.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|ogg|wav|css|js|woff2?|ttf|map)$`).
  - Mencegah NextAuth menginjeksi header `Set-Cookie` (`__Host-authjs.csrf-token`) pada file gambar WebP/audio di `/demo/*`, `/assets/*`, dan `/public/*`.
  - Tanpa `Set-Cookie`, Cloudflare Edge secara otomatis meng-cache aset secara penuh (`cf-cache-status: HIT`), memangkas waktu muat gambar dari ~7 detik (akibat bottleneck stream auth Node.js) menjadi <20 milidetik via Anycast CDN terdekat.

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
- **Manajemen Proses:** Node.js (Next.js) dijalankan menggunakan PM2 di belakang layar pada port internal (`localhost:3001` dengan mode `cluster` multi-core).

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
          ask http://localhost:3001/api/public/resolve-custom-domain
      }
  }
  
  https:// {
      tls {
          on_demand
      }
      reverse_proxy localhost:3001
  }
  ```
- **Kelebihan Caddy vs NGINX dalam SaaS:** Meringankan beban operasional Admin (Zero-Touch Provisioning), kode *proxy* jauh lebih pendek (5 baris vs 100 baris NGINX), serta menghapuskan risiko sertifikat SSL kadaluarsa.

### 17.3 — Konfigurasi DNS Multi-Tenant Dinamis & Tab Admin "Setup & Integrasi"
Untuk mengeliminasi seluruh string konfigurasi *hardcoded* dan mematuhi spesifikasi DNS registrar global (RFC 1912):

1. **Tab Terdedikasi `Setup & Integrasi` di Admin:**
   - Memisahkan urusan infrastruktur teknis dari tab `Platform` (branding & marketing).
   - Mengelola **Integrasi Domain & DNS Server**, **Server Email (SMTP)**, **Batas Upload Galeri Tamu (MB)**, dan **Siklus Hidup Subdomain & Retensi**.
2. **IP Publik VPS & CNAME Target Dinamis:**
   - `server_public_ip`: Disimpan di database `AdminSetting` dan dapat dideteksi secara otomatis real-time melalui endpoint `GET /api/admin/server-ip` (fallback multi-upstream ipify, icanhazip) dengan validasi IPv4 ketat.
   - `cname_target`: Hostname CNAME target perantara (misal: `cname.domain-anda.id`), dengan tombol *preset auto-fill* cepat dari hostname browser aktif.
3. **Standar Setup DNS Klien (2 Baris Bebas Ambiguitas):**
   - **Record A (Wajib untuk Root Apex `@`):** Mengarah ke `server_public_ip` (IP Publik VPS). Karena standar RFC 1912 dan registrar domain melarang CNAME pada apex root `@`.
   - **Record CNAME (Untuk Subdomain `www`):** Mengarah ke `cname_target`.
   - Dilengkapi tombol 1-klik salin (`handleCopyDns`) dan live preview simulasi di dashboard admin agar admin dapat memverifikasi persis apa yang dilihat oleh klien.

### 17.4 — Arsitektur Theme Demo Studio: Video MP4 Loop, Audio BGM, & Content-Driven Rendering
Untuk memastikan showroom demo tema publik (`/demo/[themeId]`) tampil memukau dan realistis bagi calon klien:

1. **Dukungan Video MP4 Loop (Cover, Hero/Sidebar, & Background):**
   - Slot `cover`, `hero`, dan `background` di Demo Studio mendukung upload file foto (`.webp`, `.jpg`, `.png`) maupun file video ambient (`.mp4`, `.webm`).
   - Endpoint `POST /api/admin/themes/[id]/demo-asset` mendeteksi MIME type `video/*` atau ekstensi file video, menyimpan file dengan ekstensi aslinya, serta secara otomatis membersihkan file format berlawanan (misal menghapus `.webp` lama saat `.mp4` diunggah agar tidak terjadi tumpang tindih aset).
   - Mesin render (`lib/renderTemplate.ts`) secara otomatis membaca ekstensi `.mp4` dan menginjeksi elemen video HTML5 (`<video autoplay loop muted playsinline>`) dengan overlay gradasi elegan.
2. **Audio BGM Demo Showroom & Sinkronisasi Universal:**
   - Tab 1 ("Aset Visual & Audio") dilengkapi kontrol pemutar dan upload lagu latar (`music.mp3` / `music.ogg`).
   - Lagu tersimpan di `/demo/[themeId]/music.mp3` dan tersinkronisasi otomatis dengan tombol *"Buka Undangan"* di seluruh demo tema via `UNIFIED_CLIENT_RUNTIME_SCRIPT`.
3. **Prinsip Content-Driven Rendering (Zero-Toggle Philosophy):**
   - Meniadakan saklar on/off manual dan form kustomisasi label yang membebani Admin.
   - Penampilan seksi diatur sepenuhnya oleh keberadaan data (*content-driven*): jika data (kisah cinta, rekening hadiah, kutipan) terisi maka seksi otomatis tampil; jika kosong maka seksi otomatis off.
   - Label teks tombol dan cover tetap menggunakan standar baku bawaan sistem (`customLabels.openBtn = "Buka Undangan"`).
4. **Full Caching Strategy (Browser & Cloudflare Edge CDN):**
   - Konfigurasi `next.config.ts` menetapkan `Cache-Control` eksplisit:
     - `/music/:path*`: `public, max-age=31536000, immutable` (Cache permanen 1 tahun di browser dan CDN karena aset musik bawaan tidak pernah berubah).
     - `/demo/:path*`: `public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800` (1 hari di browser, 7 hari di Edge Cloudflare CDN dengan background revalidation).
     - `/css/:path*`: `public, max-age=604800, stale-while-revalidate=86400` (Cache 7 hari untuk modul CSS sistem dengan background revalidasi).
     - `/uploads/:path*`: `public, max-age=86400, stale-while-revalidate=86400` (Cache 1 hari untuk media draft dengan background revalidasi dan clean overwrite).
     - File baru yang diunggah dari Demo Studio maupun Client Dashboard disematkan query buster timestamp (`?t=...`) sehingga pembaruan aset tetap tampil seketika.
5. **Showroom Color Palette Selector & Per-Theme Default Palette:**
   - Tab Aset Visual & Audio di Demo Studio dilengkapi pemilih 6 palet warna resmi (`champagne`, `emerald`, `burgundy`, `sage`, `terracotta`, `monochrome`).
   - Admin dapat menetapkan palet resmi showroom per tema (misal Badrika $\rightarrow$ `emerald`, Candani $\rightarrow$ `terracotta`, Ameera $\rightarrow$ `burgundy`, Chronicle $\rightarrow$ `monochrome`).
   - Mesin kompilasi (`lib/demoPublisher.ts` & `lib/demoRegistry.ts`) mengevaluasi `defaultPalette` dinamis dan mengompilasi halaman statis `/demo/[theme]` dengan token warna yang presisi.
6. **Desktop Split Invitation Background Isolation (`.fixed-bg-layer`):**
   - Tema berformat split-desktop (seperti Badrika, Chronicle, Kalandra, Aurelia, Artisan) menggunakan elemen latar belakang terisolasi `.fixed-bg-layer` yang di-lock pada `width: 460px; left: calc(100% - 460px);`.
   - Menggantikan penempatan background langsung di elemen `body` (100vw) yang rawan tersembunyi di balik sidebar kiri desktop, serta menerapkan scrim overlay bertingkat semi-transparan (`color-mix` transparan 60%–80%) sehingga tekstur foto/kain adat terlihat hidup dengan kontras teks yang tetap maksimal.


