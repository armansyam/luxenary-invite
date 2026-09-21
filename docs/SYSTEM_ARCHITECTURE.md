# PLATFORM UNDANGAN (WHITE-LABEL) — DOKUMENTASI ARSITEKTUR SISTEM
## Versi: 5.9.5 | Diperbarui: 21 September 2026

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
17. [Arsitektur Infrastruktur & Deployment (VPS)](#17-arsitektur-infrastruktur--deployment-vps)
18. [Sistem Finance & Rekapitulasi Kas Terpusat](#18-sistem-finance--rekapitulasi-kas-terpusat)
19. [Arsitektur Pemantauan Server & Kesehatan Sistem (Monitoring Hub)](#19-arsitektur-pemantauan-server--kesehatan-sistem-monitoring-hub)
20. [Arsitektur Antarmuka Dasbor Klien Modern (Borderless Glowing Beam & Sliding Magnetic Pill)](#20-arsitektur-antarmuka-dasbor-klien-modern-borderless-glowing-beam--sliding-magnetic-pill)
21. [Arsitektur Status Layanan & Pembatasan Registrasi](#21-arsitektur-status-layanan--pembatasan-registrasi)
22. [Sistem Pemasaran & Afiliasi (Kupon Promo, Mitra Referral, & Payout Komisi)](#22-sistem-pemasaran--afiliasi-kupon-promo-mitra-referral--payout-komisi)

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
│   │   │   ├── receptionist/ # Scanner QR tamu (Custom Domain & Canonical, dilindungi PIN)
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
│   │   ├── webhook/          # midtrans, xendit (gateway 2-arah)
│   │   ├── cron/             # cleanup (retensi otomatis H+7 & H+30)
│   │   └── sse/              # Server-Sent Events (memories real-time)
│   │
│   ├── components/           # React components reusable
│   │   ├── BrandLogo.tsx
│   │   ├── client/
│   │   │   └── MemoriesDownloadSection.tsx # Download ZIP & perpanjangan galeri (+30 hari)
│   │   ├── features/
│   │   │   ├── DisposableCameraViewfinder.tsx # Mesin Virtual Disposable Camera (HTML5 Viewfinder, live canvas filter, audio shutter)
│   │   │   ├── GuestMomentClient.tsx     # Pintu masuk utama kamera momen tamu (Virtual Disposable Camera)
│   │   │   ├── ReceptionistScannerClient.tsx # Scanner QR
│   │   │   └── StaffLockScreen.tsx       # Lock screen PIN panitia
│   │       ├── AdminPortfolioTab.tsx
│   │       ├── AdminProfileSettings.tsx
│   │       ├── AdminTeamManagement.tsx
│   │       ├── AdminOrdersTab.tsx        # Manajemen transaksi terpaginasi server-side & ekspor CSV
│   │       ├── AdminClientsTab.tsx       # Manajemen klien & remote impersonation
│   │       ├── AdminInvitationsTab.tsx   # Siklus hidup projek & emergency unlock
│   │       ├── AdminCustomDomainsTab.tsx # Live DNS check resolver & aktivasi 1-klik
│   │       ├── AdminMonitoringTab.tsx    # Detak kesehatan server, kuota & ukuran riil Cloudflare R2 (MB/GB), kapasitas disk VPS, audit staf & webhook
│   │       └── AdminCashflowTab.tsx      # Dashboard kas & hasil bisnis terpadu (uang masuk, keluar & sisa kas)
│   │
│   ├── checkout/             # Halaman checkout & pembayaran (multi-gateway 2-arah + manual transfer)
│   ├── demo/                 # Demo tema publik
│   ├── login/                # Login client
│   ├── onboarding/           # Flow onboarding baru setelah bayar
│   ├── packages/             # Halaman paket harga
│   ├── portfolio/            # Portofolio undangan selesai terisolasi
│   ├── 403/                  # Halaman forbidden
│   ├── privacy/terms/refund/contact/ # Legal & public support pages
│   ├── robots.ts             # SEO Googlebot crawler guidelines
│   ├── sitemap.ts            # Dynamic XML Sitemap generator (static & themes)
│   ├── layout.tsx            # Root layout (JSON-LD WebSite schema & dynamic metadata)
│   ├── page.tsx              # Landing page utama
│   └── globals.css           # Global CSS
│
├── lib/                      # Business logic & service layer
│   ├── themeEngine.ts        # ⭐ Mesin render tema HTML (~81KB, CORE)
│   ├── staticPublisher.ts    # ⭐ Bake HTML statis saat publish (CORE)
│   ├── renderTemplate.ts     # Injeksi data ke template .html & mapping alias tema
│   ├── storage.ts            # Upload/delete file (R2, S3, atau Local switch env)
│   ├── mailer.ts             # ⭐ Nodemailer invoice & transactional email generator
│   ├── settings.ts           # Single source of truth admin_settings dari DB
│   ├── planUtils.ts          # ⭐ Single source of truth pemetaan nama komersial paket (Serenade, Symphony, Eternity)
│   ├── domainUtils.ts        # URL builder (subdomain, canonical, dll)
│   ├── prisma.ts             # Prisma client singleton
│   ├── colorPalettes.ts      # Palet warna tema undangan
│   ├── videoOptimizer.ts     # FFmpeg video compression (R2 upload)
│   ├── escapeHtml.ts         # HTML escape utility
│   ├── rateLimit.ts          # Rate limiter untuk API publik
│   ├── sseEmitter.ts         # Server-Sent Events emitter (momen real-time)
│   ├── gatewayRegistry.ts    # Registry payment gateway 2-arah (Midtrans & Xendit)
│   ├── gateways/             # Implementasi gateway 2-arah: Midtrans, Xendit
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
├── themes/                   # Template HTML tema undangan (28 Tema + 1 Blueprint)
│   ├── premium/              # kalandra, valente, aurelia, artisan
│   ├── modern/               # wave, papercut, ameera, chronicle, lumina, solaria, badrika, candani, mayang
│   ├── traditional/          # prameswari, dillalucky, lagaligo, toraja, rantepao, makale, bugis, bone, wajo, soppeng, makassar, gowa, maros, takalar, bulukumba
│   └── starter-blueprint.html# Standard acuan template baru
│
├── theme-builder/             # Lingkungan mandiri isolasi perancangan & kompilasi tema baru
│   ├── dummy-media/           # ⭐ Single source of truth foto slot dummy standar (zero-bloat)
│   ├── starter/               # Paket starter blueprint resmi
│   └── workspaces/            # Workspace pengembangan tema mandiri
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
│       └── 06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md # Upload foto candid tamu, galeri kenangan live real-time & cloud memories
│   ├── SYSTEM_ARCHITECTURE.md    # Dokumen arsitektur ini
│   └── S-Invitation.md           # Catatan bisnis & fitur
│
├── middleware.ts             # ⭐ Edge routing utama (CRITICAL FILE)
├── auth.ts                   # NextAuth config entry
├── auth.config.ts            # NextAuth strategy config
├── README.md                 # Dokumentasi induk repositori (Root)
├── AGENTS.md                 # Aturan perilaku Agent AI (Next.js & Engine)
├── CLAUDE.md                 # Pointer kontrak Anthropic Claude Code CLI
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

FORMAT 3 — Custom Domain Klien (Termasuk dalam Paket / Terhubung Langsung)
  URL  : dimas-clarissa.com (domain pribadi milik klien)
  Flow : Middleware deteksi isCustomDomain → Fetch /api/public/resolve-custom-domain
         → Internal rewrite ke Endpoint URL Asli (/[slug] atau /[slug]/memories)
  Notes: Custom Domain dapat dipasang langsung oleh klien dari menu Pengaturan (bebas/termasuk paket).

FORMAT TAUTAN NAMA TAMU (Clean Guest Path Routing Tanpa Embel-Embel)
  Subdomain     : https://dimas-clarissa.luxenary.id/Budi-Santoso
  Custom Domain : https://dimas-clarissa.com/Budi-Santoso
  Flow          : Middleware mendeteksi path tunggal /[namaTamu], melakukan internal rewrite
                  ke URL undangan dengan parameter to=Budi-Santoso tanpa merubah tampilan address bar browser.
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
Seluruh rute sistem platform dikelompokkan dalam array `PLATFORM_EXCLUSIONS` (`/contact`, `/privacy`, `/terms`, `/refund`, `/how-it-works`, `/demo`, `/portfolio`, `/packages`, `/checkout`, `/login`, `/onboarding`, `/dashboard`, `/admin`, `/api`, `/_next`, `/static`, `/s/`, `/sharemoment`, `/memories`). Rute-rute ini dilewati langsung (`NextResponse.next()`) tanpa di-intercept oleh *Flat Slug Routing* untuk mencegah siklus rekursif (*infinite rewrite loop*) dan error 403/1000 pada reverse proxy/CDN.

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
    │   ├─ /                 → Rewrite → /s/{subdomain} (route handler)
    │   ├─ /memories         → Rewrite → /s/{subdomain}/memories
    │   ├─ /receptionist     → Rewrite → /s/{subdomain}/receptionist
    │   ├─ /sharemoment      → Rewrite → /s/{subdomain}/sharemoment
    │   └─ /{guest}          → Rewrite → /s/{subdomain}?to={guest}
    │
    ├─ Host = custom domain klien (e.g. dimas-clarissa.com) — INFRASTRUKTUR SIAP
    │   └─ Fetch resolve-custom-domain API → dapat subdomain → rewrite
    │
    └─ Root domain path (e.g. luxenary.id/dimas-clarissa-030326)
        ├─ /{slug}                    → Route handler /[slug]/route.ts (serve from published/ids/)
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
     5. **Galeri Kenangan Tamu:** `https://{subdomain}.luxenary.id/memories` (Live Album Kenangan Tamu)
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
5. Simpan ke SATU lokasi (Single Source of Truth by ID):
   a. public/published/ids/{invitationId}.html  → Single canonical file
6. Return HTML string
```

**Saat Unpublish/Hapus**, `deletePublishedHtml(invitationId)` menghapus file HTML publikasi canonical (`public/published/ids/{invitationId}.html`). Saat penghapusan akun/undangan permanen (misal via `DELETE /api/admin/users`), sistem juga secara otomatis menghapus file draft lokal (`data/drafts/{invitationId}.html`) serta membersihkan direktori media fisik (`public/uploads/invitations/{invitationId}/`) secara rekursif tanpa mengganggu klon portofolio statis yang tersimpan mandiri.

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
```

---

## 6. SIKLUS HIDUP UNDANGAN TERPADU (UNIFIED LIFECYCLE)

```
[DRAFT] ──→ [PUBLISHED] ──→ [EVENT_FINISHED] (H+1 atau Manual Switch ke /memories)
                                 │
                                 ├── URL publik otomatis dialihkan ke /memories (Dual-Mode Route Switcher)
                                 ├── Formulir upload foto tamu tetap aktif hingga masa retensi / kunci manual
                                 ├── Tamu & Klien unduh koleksi foto via JSZip (aman dari beban VPS)
                                 └── Opsi perpanjangan masa simpan (+30 Hari / +1 Tahun via Add-on QRIS)
                                 │
                                 ▼ (Masa simpan berakhir / H + retention_cleanup_days [14 Hari] atau galleryExpiresAt)
                            [ARCHIVED]
                                 ├── Pembersihan Terpadu Sekali Jalan (Single Unified Cleanup):
                                 │   ├── Foto momen tamu di R2 & lokal dihapus permanen
                                 │   ├── Subdomain dilepaskan kembali ke pool (subdomain = null)
                                 │   ├── Custom domain dinonaktifkan / dilepaskan
                                 │   └── Record RSVP kedaluwarsa dibersihkan demi privasi
                                 ├── Zero Account Deletion: Akun klien (User) tetap tersimpan abadi (<1 KB)
                                 ├── No Portfolio Deletion: Portofolio admin tidak pernah disentuh
                                 └── Dasbor Klien beralih ke 1 Halaman Rangkuman & Arsip Digital (Closing Memorial)
```

### 6.1 — Status Undangan (Enum `InvitationStatus` di DB)
- `DRAFT` — Masih dalam pengaturan, URL publik belum aktif, download ZIP dinonaktifkan.
- `PUBLISHED` — URL publik aktif, file HTML statis telah di-bake ke disk (`/published/`). Tamu dapat mengirim foto momen dan RSVP.
- `EVENT_FINISHED` — Acara utama selesai; URL publik otomatis menyajikan **Galeri Kenangan Tamu (`/memories`)** (baik lewat mode AUTO H+1 pasca-acara maupun toggle MANUAL dari Studio Seksi 14).
- `TAKEN_DOWN` — Dinonaktifkan sementara oleh Admin atau Klien.
- `ARCHIVED` — Diarsipkan setelah masa retensi terpadu (14 hari pasca acara) berakhir. Foto dihapus dari cloud storage R2, subdomain dilepas ke pool umum, dan dasbor klien bertransformasi menjadi 1 Halaman Penutup & Pusat Unduhan Rekapitulasi (.CSV).

### 6.2 — Fase Pembersihan Terpadu Cron Cleanup (`POST /api/cron/cleanup`)
Cron job dilindungi oleh header `Authorization: Bearer <CRON_SECRET>` atau sesi Admin:
1. **Satu Jadwal Retensi Terpadu (Single Unified 14-Day Timeline):**
   - Menggunakan parameter tunggal `retention_cleanup_days` (default 14 hari pasca acara paling akhir `getLatestEventDate`).
   - Seluruh komponen (Subdomain, Custom Domain, Foto Tamu R2/Lokal, dan RSVP) memiliki masa hidup yang sama dan dibersihkan bersamaan dalam 1 fase eksekusi saat `now > effectiveExpiry`.
   - Menghapus seluruh foto kenangan tamu dari Cloudflare R2 (`deleteFile`) dan disk lokal.
   - Menghapus file HTML publikasi canonical (`deletePublishedHtml`) dan draft lokal (`data/drafts/{id}.html`) untuk mencegah akumulasi file usang di disk VPS.
   - Mengunci izin upload foto (`memoriesUploadLocked = true`).
   - Mengubah status undangan menjadi `ARCHIVED`.
   - Melepaskan subdomain kembali ke pool (`subdomain = null`).
2. **Kebijakan Nol Penghapusan Akun (Zero Account Deletion Policy):**
   - Akun klien (`User`) di database PostgreSQL berukuran sangat kecil (<1 KB) dan **TIDAK PERNAH DIHAPUS**.
   - Klien tetap dapat login kapan saja ke dasbor untuk melihat rangkuman acara dan mengunduh rekapan doa restu.
3. **Portofolio Admin Abadi (Zero Portfolio Deletion Policy):**
   - Portofolio showcase (`public/portfolio/`) adalah aset promosi abadi milik admin dan tidak terpengaruh oleh pembersihan undangan klien.

### 6.3 — Arsitektur URL Bersih & Mandiri (Unhijacked Clean URLs)
- **Pemisahan URL Modul Fungsional:** Sistem menerapkan arsitektur URL bersih tanpa pembajakan rute (*zero route-hijacking*):
  - **Halaman Web Undangan (`/[slug]` atau `/s/[subdomain]`):** Selalu menyajikan halaman undangan pernikahan penuh secara konsisten sepanjang masa aktif layanan.
  - **Kamera Momen Tamu (`/[slug]/sharemoment` atau `/s/[subdomain]/sharemoment`):** Portal kamera disposable khusus bagi tamu untuk mengabadikan momen candid.
  - **Galeri Kenangan Tamu (`/[slug]/memories` atau `/s/[subdomain]/memories`):** Album foto candid tamu pasca-acara yang dilengkapi tombol navigasi bersih `← Kembali ke Undangan`.
  - **Seksi 14 Studio Editor:** Murni toggle aktivasi/deaktivasi seksi (`showGuestMemories: true/false`) di dalam web undangan, selaras dengan seksi lainnya (RSVP, Cerita Cinta, Rekening).

### 6.3.2 — Siklus Jadwal Buka Kamera Momen Tamu (`/sharemoment`), Layar Pembuka Editorial, & Studio Cetak QR

1. **Layar Pembuka Editorial (Editorial Pre-Camera Opening Screen — `GuestMomentOpening.tsx`):**
   - **Anti-Aggressive Permission Guard:** Tamu yang membuka link atau memindai QR code tidak langsung ditembak oleh browser request kamera `getUserMedia()`. Halaman menyambut tamu terlebih dahulu dengan tampilan sambutan editorial yang estetik. Sensor kamera hanya diaktifkan setelah tamu menekan tombol **"Mulai motret →"**.
   - **3 Model Pilihan Layar Opening:**
     1. `editorial_showcase`: Frame foto lengkung 4:5 di tengah, tipografi bold editorial serif, cap tanggal retro, dan tombol kapsul gelap (Desain Morements).
     2. `cinematic_hero`: Foto mempelai fullscreen dengan gradient vignette dramatis dan floating glassmorphism action card.
     3. `polaroid_nostalgia`: Frame foto polaroid instan miring dengan stempel tanggal analog di sudut bawah foto.
   - **Sinkronisasi Jadwal Hari H & Countdown:** Jika diakses sebelum jam acara (`now < startTime`), layar menampilkan *live countdown* pembukaan kamera dan info jadwal resmi (dapat di-bypass dengan `?test=true` untuk simulasi klien).

2. **Studio Desain Kartu Meja & Standing Banner Barcode (`PrintableQRCardModal.tsx`):**
   - **4 Format Ukuran Standar Percetakan:**
     1. **A3 (29.7 × 42.0 cm):** Standing Easel Banner / Welcome Sign di samping meja resepsionis atau gerbang masuk ballroom.
     2. **A4 (21.0 × 29.7 cm):** Table Standee Akrilik di meja buffet, meja kado, atau meja photobooth.
     3. **A5 (14.8 × 21.0 cm):** Tent Card Meja Lipat Segitiga di atas masing-masing meja tamu VIP.
     4. **4R (10.2 × 15.2 cm):** Mini Akrilik untuk meja bundar (*round table*).
   - **4 Model Desain Kartu Cetak:**
     1. `warm_editorial`: Palet warm ivory, bingkai rounded, QR vector tajam, tipografi serif bold.
     2. `modern_minimalist`: Monokrom studio putih bersih, garis pemisah hairline, crosshair presisi.
     3. `royal_heritage`: Bingkai kubah emas (gold arch), palet champagne, tipografi roman klasik.
     4. `retro_polaroid`: Frame foto instan vintage dengan stempel stiker dan cap tanggal retro.
   - **Kustomisasi Foto Opening & Teks Mandiri:** Klien dapat mengunggah foto vertikal khusus untuk layar opening (`featureSettings.memoriesCoverPhoto`), serta menyesuaikan eyebrow header dan petunjuk tamu.
   - **Ekspor Resolusi Tinggi 300 DPI:** Generator merender layout kartu ke Canvas beresolusi cetak tinggi (2480×3508px) untuk hasil print yang tajam tanpa pecah, serta integrasi `@media print` untuk cetak langsung via browser.

3. **Penyelarasan Kartu Dasbor Klien:**
   - Menghapus kartu duplikat Galeri Kenangan di grid navigasi cepat atas dan memfokuskan grid menjadi **3 kolom bersih (`md:grid-cols-3`)**: Studio Editor, Buku Tamu, dan RSVP.
   - Tombol **"Studio Cetak Kartu & Banner"** tersedia langsung pada kartu *QR Guest Moment* di dasbor klien untuk memudahkan klien merancang dan mencetak materi dekorasi meja kapan saja (baik status DRAFT maupun PUBLISHED).
   - Seluruh instrumen pemantauan, tautan album publik, masa simpan, dan unduh ZIP terpusat penuh di Seksi 5 Dasbor Klien.

### 6.4 — Dasbor Klien 1 Halaman Rangkuman & Arsip Digital (`/dashboard` saat `ARCHIVED`)
Ketika undangan telah berstatus `ARCHIVED`, dasbor klien secara otomatis beralih menjadi 1 halaman memorial eksklusif:
- **Surat Penutup Hangat (Closing Memorial Letter):** Ucapan terima kasih dan apresiasi kepada kedua mempelai atas terselenggaranya pernikahan dengan sempurna.
- **Ringkasan Eksekutif & Statistik Acara (4 Kartu Metrik):** Total Doa & Ucapan Restu, Total Tamu Hadir (Pax), Total Buku Tamu, dan Tanggal Pelaksanaan Acara.
- **Pusat Unduhan Arsip Digital (Download Center):**
  - Unduh Rekapan Doa & Ucapan Tamu format `.CSV` (`/api/client/invitations/[id]/export?type=wishes`).
  - Unduh Rekapitulasi Kehadiran & RSVP format `.CSV` (`/api/client/invitations/[id]/export?type=guests`).
- **Tanpa Tombol Menyesatkan:** Tidak ada tombol "Buat Undangan Baru" dan tidak ada tombol "Reaktivasi" (karena foto sudah dibersihkan permanen dari server).

### 6.5 — Layanan Tambahan (Add-Ons) & Perpanjangan Masa Aktif
1. **Perpanjangan Masa Simpan Bulanan (+30 Hari) (`orderType: GALLERY_EXTENSION`):**
   - Memperpanjang masa simpan subdomain, custom domain, dan foto momen tamu selama +30 hari via QRIS (Rp50.000).
2. **Perpanjangan Masa Simpan Tahunan (+1 Tahun) (`orderType: GALLERY_EXTENSION`):**
   - Memperpanjang masa simpan selama +365 hari via QRIS (Rp150.000).
3. **Custom Domain Pribadi:**
   - Merupakan fitur gratis dan opsional yang sudah termasuk dalam Paket Premium (bukan add-on berbayar terpisah).

### 6.5 — Smart Fallback Lifecycle Routing (`app/(public)/[slug]/route.ts`)
1. **Fase Acara Selesai (`EVENT_FINISHED` / H+7 Pasca-Acara):**
   - **Paket dengan kapabilitas `guest_memories`:** Pengunjung yang mengakses `/[slug]` otomatis dialihkan ke Galeri Kenangan Tamu (`/[slug]/memories`).
   - **Paket tanpa `guest_memories`:** Pengunjung disajikan layar penutup resmi yang anggun (*Graceful Event Closed Page*) bertema dark luxury yang berisi ucapan terima kasih tulus dari kedua mempelai, tanpa diarahkan ke galeri kosong.
2. **Fase Arsip Total (`ARCHIVED` / Masa Galeri Selesai):**
   - Sistem memeriksa keberadaan file salinan portofolio mandiri secara otomatis melalui `hasPortfolio(slug)`.
   - **Kondisi A (Ada Portofolio):** Pengunjung yang mengakses URL Asli otomatis dialihkan (*HTTP 307*) ke `/portfolio/[slug]` sebagai arsip kenangan abadi.
   - **Kondisi B (Tanpa Portofolio):** Pengunjung langsung dialihkan (*HTTP 302/307*) kembali ke Halaman Utama (`/`) secara elegan tanpa error 404.

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
6. **Streamlined Compact Dashboard Layout & Floating Glass Dock Hierarchy:**
   - Navigasi utama klien menggunakan Apple-Style Floating Liquid Glass Dock yang diurutkan secara hierarki prioritas:
     `[ Beranda (/dashboard) ]` | `[ Studio Editor (/dashboard/invitation) ]` | `[ Moments (/dashboard/moments) ]` | `[ Buku Tamu (/dashboard/guests) ]` | `[ RSVP & Doa (/dashboard/rsvp) ]` | `[ Pengaturan (/dashboard/settings) ]`.
   - Top header action card di seluruh modul dasbor klien dirapatkan presisi ke navbar (`pt-2 sm:pt-2.5`, padding internal `px-4 py-3 sm:px-6 sm:py-3.5`, serta spasi antar kartu `space-y-2.5 sm:space-y-3`) guna mengeliminasi whitespace berlebih dan menjaga estetika antarmuka yang padat, rapi, dan modern.

### 6.7 — Pemisahan UX Galeri Kenangan Tamu, Pusat Setup Moments & Standarisasi Musik Latar
1. **Pusat Komando Dedicated Moments (`/dashboard/moments`):**
   - Menjadi pusat kendali operasional kamera virtual lengkap dengan Pratinjau Smartphone Layar Pembuka Tamu, selector preset filter film analog, stempel LED, formulir multi-sesi jadwal & kuota (dengan autosave debounced anti-lag), pengatur roll per tamu, studio cetak standing banner & kartu QR 300 DPI, tombol aksi unduh ZIP instan di sudut kanan header galeri, dan feed moderasi foto candid.
   - Terpisah dari siklus hidup (*lifecycle*) static build undangan sehingga pengantin dapat mengubah konfigurasi kamera dan mengunduh foto kapan saja tanpa terhambat status publikasi undangan.
2. **Formulir Studio Editor (`/dashboard/invitation/[id]` Seksi 14):**
   - Tetap menyediakan integrasi konfigurasi konten Seksi 14 (Galeri Kenangan Tamu) di dalam formulir undangan dengan 2 tab editor murni (`Form Data` dan `Live Editor`).
3. **Dashboard Utama (`/dashboard`):**
   - Berfungsi sebagai **Pusat Informasi & Ringkasan Eksekutif Murni** (Status Undangan, Countdown Hari H, dan Metrik Kehadiran & Ucapan).
   - Seluruh instrumen operasional Hari H telah dibersihkan dari Beranda agar antarmuka tidak tumpang tindih dan tidak membingungkan pengantin.
4. **Pemisahan Modul Operasional Hari H yang Intuitif:**
   - **Portal Resepsionis Meja Penerima Tamu (`/dashboard/guests`):** Ditempatkan di dalam modul Buku Tamu, menyediakan tautan langsung ke scanner kamera check-in (`/[slug]/receptionist`), penampil PIN akses panitia, serta tombol salin info WO 1-klik untuk petugas meja depan.
   - **Pusat Komando Dedicated Moments (`/dashboard/moments`):** Menjadi pusat kendali operasional kamera virtual lengkap dengan 3D Tri-Device Mockup Showcase (iPhone 16 Pro + Media Fisik Standing Banner & Kartu QR), 3 layout layar pembuka (`POLAROID_MINIMAL`, `VINTAGE_FILM`, `MODERN_ELEGANT`), kustomisasi teks instruksi kartu, selector preset filter film analog, stempel LED, formulir multi-sesi jadwal & kuota dengan Smart Quota Boundary Guard, pengatur roll per tamu, studio cetak standing banner akrilik 300 DPI, pusat unduh ZIP (`MemoriesDownloadSection`), dan feed foto candid.
   - **Formulir Studio Editor (`/dashboard/invitation/[id]` 15 Seksi Master-Detail):** Panel form menerapkan arsitektur Master-Detail yang selalu terbuka penuh (*always expanded, zero auto-collapse on save*), eliminasi tombol toggle akordion redundan, sidebar navigator (desktop) & horizontal pills (mobile), dirty state tracker per seksi, dan penanganan styling tema web undangan.
    - **Proteksi Anti-Download & Privasi Tamu Galeri Kenangan (`/memories` & `/sharemoment`):**
      - Halaman galeri bersifat murni *View-Only* untuk publik.
      - Perlindungan browser berlapis dipasang pada seluruh media foto (kartu masonry, lingkaran sorotan story, lightbox popup, dan sorotan uploader):
        - `onContextMenu={(e) => e.preventDefault()}`: Mencegah menu klik kanan bawaan browser (*"Save image as..."*).
        - `-webkit-touch-callout: none` & `user-select: none`: Mencegah menu pop-up tahan layar (*long-press* *"Simpan Gambar"*) pada perangkat iOS Safari dan Android Chrome.
        - `draggable={false}` dan `pointer-events-none` pada tag `img`: Mencegah penarikan gambar (*drag-and-drop*) ke luar browser.
        - Lightbox modal memblokir event contextmenu pada level modal pembungkus.
     - **Isolasi Folder Penyimpanan & Sinkronisasi Unduh ZIP (`guest-memories/`):**
       - Foto kenangan tamu diisolasi secara khusus ke prefix `guest-memories/{invitationId}/` (Cloudflare R2) dan `public/uploads/guest-memories/{invitationId}/` (Lokal), terpisah dari media inti mempelai.
       - Mesin pembuatan arsip ZIP (`lib/storage.ts: streamMemoriesToZip`) dan cron pembersihan otomatis (`/api/cron/cleanup`) disinkronkan menunjuk ke `guest-memories/` dengan *fallback* pencarian ke direktori legacy, menjamin pengunduhan ZIP foto kenangan tamu oleh pengantin selalu berhasil tanpa error `EMPTY`.
2. **Standarisasi Fitur Musik Latar Pernikahan (Audio Background):**
   - Musik latar merupakan fitur esensial dari setiap paket undangan (Bebas dari pembungkus capability semu).
   - Klien dapat mengatur lagu otomatis berputar saat tamu klik "Buka Undangan", memilih dari preset kurasi klasik sakral, mengunggah berkas MP3/M4A sendiri (hingga 15 MB), atau memasukkan URL audio kustom/YouTube.
3. **Keamanan Enkripsi Dua Arah & Dekripsi Otomatis `staffPin`:**
   - PIN panitia dienkripsi dengan AES-256-GCM (`lib/pinEncryption.ts`).
   - Endpoint backend (`GET/PUT /api/client/invitations/{id}` dan `GET /api/client/invitations`) secara konsisten mendekripsi `staffPin` sebelum dikirimkan ke frontend klien, sehingga browser selalu menerima teks PIN asli yang bersih.
   - Proteksi *Anti Double-Encryption* (`isPinEncrypted`) dan mekanisme *Self-Healing* pada `decryptPin` mencegah PIN terenkripsi berulang kali saat form disimpan secara terpisah.
4. **Pembersihan Total Media & Memori Tamu Saat Hapus Klien (`DELETE /api/admin/users`):**
   - Mengeliminasi berkas yatim piatu (*orphaned files*) di Cloudflare R2: Sistem secara otomatis mengiterasi dan menghapus seluruh media (`localPath`) dan memori tamu (`mediaUrl`) dari storage R2/lokal via `deleteFile()`, serta membersihkan folder direktori lokal `guest-memories/{id}/` dan `invitations/{id}/`.
5. **Virtual Disposable Camera & Dynamic Roll Stack Architecture (Opsi B):**
   - **Live WebRTC Viewfinder & Analog Shutter:** Menggantikan pemilih file konvensional dengan layar bidik kamera analog retro, tombol zoom digital (1x, 2x), torch/flash hardware toggle, kamera depan/belakang, dan suara klik shutter mekanis sintetis via Web Audio API tanpa berkas audio eksternal.
   - **5 Branded Film Filters:** Pilihan filter analog terkurasi: `aura_90s` (Analog 90s hangat), `heritage_romance` (Sepia klasik lembut), `botanical_mist` (Fuji herb sejuk), `cinema_noir` (Hitam putih Tri-X kontras tinggi), dan `pure_daylight` (Bersih jernih alami).
   - **Retro LED Date Stamp:** Stempel tanggal oranye retro analog khas kamera saku tahun 90-an (`#e8875a`) dengan pendar neon di sudut kanan bawah foto.
   - **Formula Kuota Dinamis (Total Kuota Foto Acara) & Jatah Roll Fleksibel:** Kuota foto diatur secara transparan dan efisien berdasarkan **Total Kuota Foto Acara** (`memories_total_quota_{plan}`) per paket (misal: Symphony = 250 Foto, Eternity = 1.000 Foto). Pengantin dibebaskan mengatur alokasi roll per tamu (1 - 30 Roll/Tamu) secara fleksibel, baik di Studio Editor maupun langsung dari dasbor kartu Galeri Kenangan via modal *Atur Jatah Roll Tamu* dengan estimasi kapasitas partisipasi dinamis: `~Floor(Sisa_Pool / Jatah_Roll) Tamu`.
   - **Jadwal Multi-Sesi & Smart Quota Boundary Guard:**
     - Alokasi kuota per sesi kamera (Akad, Resepsi, After Party) dibatasi secara real-time pada UI klien: $\text{maxAllowed} = \text{totalEventQuota} - \sum \text{otherAllocated}$ menggunakan `Math.min(parsed, maxAllowed)`.
     - Dilengkapi tombol pintasan *"Bagi Rata Kuota"* (membagi rata kuota ke seluruh sesi secara proporsional) dan tombol *"Pakai Sisa (X)"* di tiap baris sesi.
     - Penegakan integritas sisi server (`PATCH /api/client/invitations/{id}/memories`) memotong alokasi berlebih agar total seluruh sesi tidak pernah melampaui `maxTotalPhotos`.
   - **Invarian Anti-Hangus & Unggah Riil per Jepretan (Non-Pre-Reservation):** Setiap jepretan kamera Disposable tamu diunggah dan disimpan seketika (*real-time snapshot upload*) ke storage Cloudflare R2 / DB tanpa ada reservasi jatah di awal. Apabila seorang tamu tidak menghabiskan kuota roll-nya (misal dijatah 15 tapi hanya mengambil 3 foto lalu menutup sesi), sisa 12 kuota roll tersebut **tetap utuh berada di pool acara** untuk dinikmati oleh tamu-tamu berikutnya.
   - **Penyesuaian Batas Tamu Terakhir (Boundary Clamping):** Pada kondisi batas di mana sisa kuota foto di pool lebih sedikit daripada jatah roll yang disetel pengantin (contoh sisa 8 foto di pool, sedangkan roll diset 15), sistem secara dinamis menerapkan `effectiveShotsQuota = Math.min(configuredShotsQuota, remainingPool)`. Tamu terakhir mendapatkan jatah tepat 8 foto dan pool terisi bersih hingga 100% tanpa risiko kegagalan upload HTTP 403. Ketika pool 100% habis, tamu baru disambut dengan kartu status elegan *"Kuota Roll Kenangan Telah Penuh"* dan diarahkan langsung ke galeri.
   - **Pusat Layanan Tambahan Terpadu (Unified Addon Modal):** Modal terpadu untuk top-up kuota foto (+100, +250, +500), perpanjangan masa aktif galeri (+30 hari), dan upgrade paket mengadopsi palet desain **Warm Editorial Ivory & Royal Amber Gold** (`bg-white`, `border-stone-200`, `text-stone-900`, `bg-amber-800`), konsisten dengan estetika platform Luxenary dan mengeliminasi gaya gelap bawaan AI.
   - **Galeri Publik Opsi B (Masonry Roll Stack):** Seluruh foto yang diunggah oleh satu tamu dikelompokkan ke dalam 1 kartu Roll Stack bertumpuk dengan efek visual lapisan foto (*layered photo print stack*), lencana jumlah foto (`5 Foto`), dan pesan doa tunggal (bebas duplikasi). Klik pada kartu membuka popup lightbox modal dengan dukungan navigasi swipe sentuh, keyboard panah, dan bilah thumbnail interaktif.
   - **Kamar Gelap Digital (Delayed Reveal):** Penahanan perilisan foto hingga waktu acara resepsi berakhir (`now < eventEndTime`). Pengunjung galeri disajikan layar hitung mundur kamar gelap digital dengan tombol CTA mengambil foto.
6. **Smart Dynamic Gift Section & Standar Penyimpanan QRIS (`lib/themeEngine.ts`):**
   - **Penyimpanan Berkas QRIS:** Berkas fisik QRIS disimpan secara deterministik pada `public/uploads/invitations/[id]/qris.webp` (format WebP terkompresi, resolusi maks 800×800 px) dan dicatat pada `featureSettings.qrisImageUrl`.
   - **Aturan Cerdas Penayangan Tab Undangan:**
     - *Hanya Digital:* Jika alamat pengiriman kado dikosongkan, tab tombol pemilih dan kartu "Kirim Kado" otomatis dihilangkan total dari undangan. Tamu langsung disajikan kartu rekening / scan QRIS tanpa tombol tab, dan bebas dari teks fallback dummy Makassar.
     - *Hanya QRIS (Tanpa Rekening Bank):* Jika pengantin hanya mengunggah QRIS tanpa mendaftarkan rekening bank, sistem hanya merender kartu scan QRIS murni tanpa menyisipkan kartu rekening BCA tiruan.
     - *Hanya Kado Fisik:* Jika pengantin hanya mengisi alamat kado, kartu alamat langsung tampil tanpa tab transfer bank.
     - *Digital + Kado Fisik:* Kedua tab dimunculkan berdampingan secara harmonis.
7. **All-Access Themes Model & Restrukturisasi Paket Estetis:**
   - **Nama Paket Estetis & Puitis:**
     - **Serenade** (Dasar / Traditional - Intim & Esensial): Undangan digital berkelas, musik latar, RSVP online, bebas pilih seluruh 17 tema fisik, retensi terpadu standar.
     - **Symphony** (Menengah / Modern - Harmoni Pesta): Seluruh fitur Serenade + Sistem Resepsionis QR Check-In & Kamera Momen Tamu (Kapasitas 250 Foto Acara), retensi terpadu standar.
     - **Eternity** (Tertinggi / Premium - Mahakarya Abadi): Seluruh fitur Symphony + Integrasi Custom Domain (.com/.id) & Kamera Momen Tamu Kapasitas Besar (1.000 Foto Acara), retensi terpadu standar.
   - **Pemisahan Estetika vs Kapabilitas:** Menghilangkan restriksi tema berbasis tier paket. Klien pada seluruh paket (Serenade, Symphony, Eternity) mendapatkan akses penuh tanpa batas ke seluruh katalog 17 tema fisik aktif.
   - **Diferensiasi Murni Fungsional:** Paket dibedakan secara objektif berdasarkan kapasitas operasional dan infrastruktur server:
     - Batas kapasitas tamu undangan (300 / 1.000 / Unlimited).
     - Sistem Resepsionis Check-In QR Code & PIN Keamanan panitia (Symphony & Eternity).
     - Hak integrasi Custom Domain sendiri (Eksklusif Eternity).
     - Plafon kuota Total Foto Acara (`memories_total_quota_{plan}`) yang dikendalikan penuh oleh Admin.
     - **Sistem Retensi Terpadu Tunggal (Unified Service Lifecycle):** Seluruh paket menggunakan retensi dasar yang terpusat pada pengaturan Admin (`retention_cleanup_days`, default 30 hari pasca acara) tanpa hardcode tier. Seluruh aset situs web, subdomain, kamera tamu, dan arsip galeri foto kadaluarsa secara serentak dalam 1 fase terpadu, dan dapat diperpanjang via add-on (+30 hari per paket perpanjangan).
   - **Pemisahan Studio Cetak Fisik vs Studio Layar Pembuka Digital:**
     - *Studio Kartu Cetak (`PrintableQRCardModal.tsx`):* 100% didedikasikan untuk kartu cetak fisik meja resepsi (A3, A4, A5, 4R) dengan export 300 DPI PNG & Print.
     - *Studio Layar HP Tamu (`GuestOpeningSetupModal.tsx`):* Didedikasikan untuk konfigurasi layar pembuka tamu (`/sharemoment`) dengan mockup iPhone 16 Pro multi-ring titanium standar landing page dan pratinjau reaktif real-time.
   - **Standar Copywriting Mewah Pernikahan:** Menghilangkan frasa informal kasual seperti *"SCAN & JEPRET"*, digantikan dengan *"KAMERA KENANGAN TAMU"* dan instruksi resmi *"Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda."*.
7. **Plafon Kuota Kamera Terkendali Admin & Add-On State Machine:**
   - **Konfigurasi Mandiri di Admin Portal:** Melalui Tab Paket & Harga di `/admin`, Admin memiliki hak absolut menentukan kuota plafon foto acara (`memories_total_quota_{plan}`) dan add-on top-up foto (`addon_memories_topup_photos` & `addon_memories_topup_price`).
   - **Proteksi Dua Lapis (Defense-in-Depth):**
     - *Client Studio Editor (`/dashboard/invitation/[id]` Seksi 14):* Menampilkan badge counter kapasitas acara (`Kapasitas Acara: X / Y Foto Terkumpul`). Pengantin mengatur jatah roll per kontributor secara independen.
     - *Backend Server Enforcement (`/api/public/memories/upload`):* Endpoint membaca tier paket klien via `getPlanMemoriesQuota(invitation.user.plan)` dan secara otomatis melakukan *hard-clamping* pada total kuota foto acara. Eksploitasi payload HTTP di sisi client akan teredam aman di level server.
   - **Smart State Machine Tombol Add-On & Auto-Expiration:**
     - *State 1 (Normal):* Tombol bertuliskan nominal resmi add-on (misal `+30 Hari Galeri (Rp 50.000)`).
     - *State 2 (Menunggu Pembayaran):* Menampilkan `💳 Selesaikan Tagihan (EXT-...)` dengan countdown kadaluarsa 24 jam. Klien diarahkan ke `/payment` untuk bayar.
     - *State 3 (Menunggu Verifikasi Admin):* Jika bukti transfer sudah diunggah, tombol berubah menjadi `⏳ Verifikasi Admin (EXT-...)` dan mengunci pembuatan pesanan baru ganda.
     - *State 4 (Kadaluarsa Otomatis):* Jika pesanan tidak dibayar dalam 24 jam, background checker otomatis mengubah status menjadi `EXPIRED` dan tombol klien kembali ke State 1 secara mulus.
   - **Proteksi Kasir Pembayaran (`/payment`):**
     - Tombol batalkan pesanan dan ubah kupon otomatis disembunyikan jika bukti transfer sudah diunggah.
     - Disediakan tombol navigasi "Dasbor" di header dan tombol "Kembali ke Dasbor Klien" di kartu verifikasi struk.

### 6.8 — Ultra-Slim Exclusive Accordion & Clean Preview Architecture (Studio Editor 15 Seksi)
1. **Single-Expanded Exclusive Accordion Pattern:**
   - **Logika Otomatisasi Penutupan Seksi:** Membuka salah satu seksi formulir secara otomatis menutup seluruh seksi lainnya (`single-expanded exclusive accordion`). Klien tidak lagi mengalami *scroll fatigue* akibat tumpukan formulir terbuka panjang.
   - **Penyimpanan State Sesi:** State seksi aktif disimpan ke `localStorage` (`lux_studio_collapsed_{invitationId}`) dengan isolasi aman per undangan.

2. **Ultra-Slim Collapsed Headers (~48px) & Eliminasi Blok Redundan:**
   - **Pemangkasan Ketinggian Vertikal Radikal:** Menghapus blok preview duplikat bawah (`p-5 bg-stone-50/60`) yang sebelumnya merender ringkasan besar berulang di setiap seksi. Ketinggian halaman tertutup berhasil dipangkas dari **4.101px** menjadi **~750px** (pas dalam 1 layar desktop penuh).
   - **Muted Inline Summary Snippets:** Informasi ringkas seksi (tema & palet aktif, nama mempelai, jumlah sesi acara, status fitur) ditampilkan secara elegan sebagai cuplikan inline di samping judul seksi (`text-xs text-stone-500 font-normal`).
   - **Full-Row Clickability:** Seluruh area header seksi dapat diklik (`onClick={() => toggleSection("secX")}`) dengan proteksi `e.stopPropagation()` pada tombol simpan/aksi agar interaksi tidak saling tumpang tindih.

3. **Clean Preview Mode Routing (`mode=preview`):**
   - Tombol *"Buka di Tab Baru"* di Studio Editor dan tombol navigasi layar proteksi *"Lihat Undangan Online"* diarahkan ke `mode=preview` (bukan `mode=edit`), menjamin evaluasi visual klien murni tanpa gangguan widget editor atau toolbar floating.

---

## 7. SISTEM SUBDOMAIN & MANAJEMEN ONBOARDING

### 7.1. Alur Idempotensi Onboarding Pasca-Bayar
- **Pemeriksaan Draft (`existingDraft`):** Saat klien mengakses `/dashboard/setup`, sistem melakukan `fetch('/api/client/onboarding-state')`. Jika klien sudah memiliki draft terdaftar dari order aktifnya, sistem otomatis membypass form kosong dan langsung mengarahkan klien ke Studio Undangan (`/dashboard/invitation/[id]`).
- **Operasi Idempoten Backend:** Di `app/api/client/invitations/create/route.ts`, sistem memeriksa ketersediaan draft sebelum melakukan operasi DB:
  - Jika draft sudah ada: mengeksekusi `prisma.invitation.update()` untuk memperbarui tema/nama tanpa membuat baris baru.
  - Jika belum ada: mengeksekusi `prisma.invitation.create()`.
- **Target-Specific P2002 Catch (Anti-False Claim):** Error database `P2002` dipilah secara presisi:
  - `target.includes('subdomain')`: Menampilkan pesan bentrok subdomain asli.
  - `target.includes('orderId')`: Melakukan *self-healing* pemulihan data dengan mengembalikan `invitationId` draft yang sudah ada.
  - `target.includes('invitationSlug')`: Menambahkan sufiks unik otomatis.

### 7.2. Dual-Check Ketersediaan Subdomain
1. **Setup Awal (Onboarding):** `POST /api/client/invitations/create` → cek `prisma.invitation.findUnique({ where: { subdomain } })`
2. **Settings Page:** `GET /api/client/subdomain/check?subdomain=xxx` → cek ketersediaan real-time

### 7.3. Subdomain Monitor & Live Inspector (Admin Panel)
- **Endpoint Terpusat:** `GET /api/admin/subdomains`
  - Agregasi metrik KPI real-time: `totalActive`, `totalPublished`, `totalDraft`, `totalExpired`.
  - **Live Subdomain Inspector (`?search=xxx`):** Memvalidasi status ketersediaan subdomain instan:
    - *Available*: Bebas diklaim oleh calon klien baru.
    - *Occupied*: Menampilkan kartu pemilik lengkap (Klien, Email, WhatsApp, Mempelai, Status Undangan, Tanggal Acara).
    - *Reserved*: Terlindungi sistem (CDN, Auth, Admin, Receptionist).
  - **Daftar Tabel Subdomain:** Menampilkan seluruh subdomain aktif di sistem lengkap dengan URL langsung dan tombol salin.

### 7.4. Recycle Subdomain Kedaluwarsa
- **Endpoint:** `POST /api/admin/subdomains/recycle`
- **Mekanisme:** Jika acara telah melewati masa tenggang (*grace period*, default 7 hari), admin dapat melakukan daur ulang 1-klik untuk melepaskan `subdomain` menjadi `null`, sehingga nama tersebut kembali ke pool umum tanpa menghapus data acara klien.

---

## 8. TEMA & TEMPLATE ENGINE

**Files:** `lib/themeEngine.ts` (~81KB), `lib/renderTemplate.ts`, `themes/`

```
Katalog Tema Aktual (16 File Template Fisik + 1 Blueprint):
  Premium (4)    : kalandra.html, valente.html, aurelia.html, artisan.html
  Modern (9)     : wave.html, papercut.html, ameera.html, chronicle.html, lumina.html, solaria.html, badrika.html, candani.html, mayang.html
  Traditional    : prameswari.html, dillalucky.html, lagaligo.html, toraja.html, bugis.html, dll.
  Blueprint      : starter-blueprint.html

Backward Compatibility Alias Mapping (di lib/renderTemplate.ts):
  - "kila"                   → mapped ke kalandra.html (fallback backward compatibility)
  - Modern Floral & Luxury Standard (Candani, Mayang, Badrika): Dynamic Palette Tokens (`:root`, `color-mix(...)`), Discrete Parents Architecture (`{{firstParentPrefix}}`, `{{firstFather}}`, `{{firstMother}}`), `.fixed-bg-layer` layout-wrapper encapsulation, dan full click-to-edit `data-lux-field`.
  - Bugis Heritage Standard (La Galigo): Integrasi tipografi aksara otentik Lontara (`/fonts/Lontara.ttf`, `.font-lontara`) untuk frasa sakral adat (*Salama'*, *Botti'*, *Sipakatau Sipakalebbi Sipakainge*), ornamen tenun geometris Bugis, arsitektur Zero-Fake Fallback & Infinite Seamless Flow, serta implementasi Dynamic Palette Tokens 100% bebas hardcode (`color-mix(...)`, `var(--bg-dark)`, `var(--primary)`, `var(--accent)`) pada seluruh layer desktop sidebar, cover overlay, kartu, dan tombol.
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
  - **Seksi Profil Pasangan (*The Couple*):** Menggunakan Nama Lengkap beserta Gelar Akademik/Adat (`{{firstFullName}} & {{secondFullName}}`), dilengkapi info orang tua (`{{firstParents}}` & `{{secondParents}}`) dan akun Instagram.
  - **Monogram & Inisial Logo Dinamis (`firstInitial`, `secondInitial`, `coupleMonogram`):** Mengambil huruf awal nama panggilan mempelai secara otomatis sesuai `displayOrder` untuk *brand watermark* atau *crest logo* di desktop hero.
  - **Label Seksi & Pengantar Profil Universal (`coupleSectionEyebrow`, `coupleSectionSub`):** Menjamin pengantar profil bersifat universal dan elegan tanpa benturan terminologi keagamaan yang kaku.
* **Arsitektur Seksi Penutup Adaptif 100vh (`.site-footer` / `.closing-sec`) & Fallback Label:**
  - **Variabel Dinamis Template Engine:**
    - `closingPhotoUrl`: URL foto dari slot media `CLOSING_COVER` (atau `null` jika kosong).
    - `hasClosingPhoto`: Boolean ketersediaan foto.
    - `closingPhotoClass`: `"has-closing-photo"` bila ada foto, atau `"no-closing-photo"` bila kosong.
    - `closingBgStyle`: CSS inline `background-image: url(...)` dinamis yang disematkan langsung pada tag `<footer class="site-footer {{closingPhotoClass}}" style="{{closingBgStyle}}">` di seluruh 19 tema master dan blueprint, menjamin foto penutup yang diunggah klien langsung tampil mulus.
  - **Dua Mode Tampilan Outro 100vh & Standarisasi Layout Dinamis:**
    1. *Mode Kanvas Kosong (`no-closing-photo`):* Layar penuh 100vh murni transparan (`background: transparent;`) menyatu sempurna dengan kanvas latar belakang global (`body` dan `.fixed-bg-layer`) dan token palet tema (`--bg-dark`) tanpa balok warna solid / hex mati. Blok ucapan terima kasih dan nama mempelai terpusat rapi di tengah layar (`justify-content: center; align-items: center; text-align: center; gap: 1.5rem;`).
    2. *Mode Foto Penutup (`has-closing-photo`):* Foto penutup mengisi background layar penuh via `style="{{closingBgStyle}}"` dengan overlay gradasi/scrim pelindung keterbacaan teks. Tata letak footer bertransformasi ke `justify-content: space-between;` dengan ornamen kultural statis di atas (`.closing-top-ornament`, scale 80px) dan blok konten doa/mempelai (`.closing-content`) merapat elegan ke bagian bawah layar. Hal ini menjamin foto mempelai di latar tengah tetap terekspos jelas tanpa tertutup teks.
  - **Standarisasi Proporsi Split Desktop (Golden Ratio 460px di Seluruh 19 Tema Master):**
    - Seluruh 19 tema fisik master kini mengadopsi rasio proporsional desktop presisi: panel undangan kanan dikunci pada lebar ideal smartphone flagship **`width: 460px; margin-left: calc(100% - 460px);`**, sementara sidebar Hero kiri otomatis membentang mengisi seluruh sisa panggung layar widescreen (`width: calc(100% - 460px);`).
    - Menghilangkan total masalah konten melar pada monitor besar (1920px Full HD atau ultrawide), dan menjamin floating dock navigasi (`.bottom-dock`) selalu terpusat simetris di tengah panel undangan (`left: calc(100% - 230px) !important;`).
  - **Arsitektur Layar Sampul Pembuka Full-Global Desktop (`.cover-screen` / `.cover-overlay` 100vw):**
    - Pada tema modern dan premium (`aurelia`, `valente`, `artisan`, `ameera`, `chronicle`, dan `lumina`), layar sampul pembuka (`.cover-screen` / `.cover-overlay`) pada layar lebar (`@media (min-width: 900px)`) membentang penuh 100% viewport (`width: 100%; left: 0; right: 0; padding: 4rem 2.5rem;`).
    - Memanfaatkan foto landscape 16:9 (`LANDING_COVER_DESKTOP`) secara maksimal sebelum undangan dibuka. Elemen konten terpusat rapi dengan sub-kontainer adaptif (`.cover-top (max-width: 1100px)`, `.cover-center (max-width: 850px)`, `.cover-bottom (max-width: 520px)`).
    - Setelah tombol *"Buka Undangan"* diklik, panel konten kanan berukuran 460px aktif berdampingan dengan hero sidebar kiri.
  - **Arsitektur Desain Silver Screen & Cinema Viewfinder (Tema Lumina):**
    - Tema `lumina.html` mengadopsi bahasa desain **Modern Cinema / Silver Screen Aesthetics**:
      - **Global Cinema Opening Cover 100vw:** Layar pembuka `.cover-overlay` membentang penuh 100% viewport (`width: 100%; left: 0; right: 0; padding: 4rem 2.5rem;`) dengan sub-kontainer adaptif `.cover-center` (`max-width: 850px`), tipografi judul `Cinzel` berskala responsif (`clamp(3.2rem, 5.5vw, 5.2rem)`), transisi curtain slide-up (`translateY(-100%)`), serta dukungan foto landscape 16:9 (`landingCoverDesktopUrl`).
      - **Cinema Viewfinder Frame:** Frame foto mempelai (`.couple-photo-wrap`) berukuran 165px x 220px dengan rasio portrait 3:4 tegas (`border-radius: 4px; padding: 4px;`), dilengkapi aksen sudut *viewfinder* kamera perak halus (`::before` dan `::after` dengan `border-color: var(--silver-white)`).
      - **Cinematic Reel Love Story Timeline:** Seksi Love Story (`#story`) mengadopsi rel film vertikal 1px dengan pendaran perak (`.journey-timeline::before`), penanda babak berupa *lens aperture node* 11px konsentris berkilau perak, serta narasi babak melayang tanpa kotak latar (*cardless*) dengan pemisah *dashed chapter separator* (`border-bottom: 1px dashed var(--cinema-border)`).
  - **Arsitektur Desain Editorial Newspaper & Magazine Timeline (Tema Chronicle):**
    - Tema `chronicle.html` mengadopsi bahasa desain **High-Fashion Editorial & Magazine**:
      - **Global Opening Cover 100vw:** Layar pembuka `.cover-overlay` membentang penuh 100% viewport dengan sub-kontainer adaptif `.cover-center` (`max-width: 850px`), tipografi headline `Bellefair` berskala responsif (`clamp(3.2rem, 5.5vw, 5.5rem)`), dan tombol pembuka majalah `.btn-open-issue`.
      - **Editorial Love Story Timeline (Pure Editorial / Cardless):** Seksi Love Story (`#story`) mengadopsi rel garis vertikal editorial 1px bergradasi (`.journey-timeline::before`), penanda babak berupa diamond node 9px (`transform: rotate(45deg)`), dan babak narasi majalah tanpa kotak latar (*cardless*) dengan pembatas garis putus-putus halus (`border-bottom: 1px dashed var(--editorial-border)`).
  - **Arsitektur Desain Modern Arch & Romantic Silhouette (Tema Ameera):**
    - Tema `ameera.html` mengadopsi bahasa desain **Modern Arch / Romantic Silhouette** yang membedakannya secara tegas dari karakter tajam/kaku tema `artisan.html`:
      - **Modern Arch Dome:** Kartu acara (`.event-block-item`, `.event-unified-venue-card`, `.access-pass-card`) menggunakan kubah lengkung modern (`border-radius: 80px 80px 20px 20px` hingga `90px 90px 24px 24px`) dengan efek *frosted glassmorphism* (`backdrop-filter: blur(20px)`).
      - **Capsule & Pill Ergonomics:** Seluruh tombol CTA (`.btn-buka`, `.btn-outline-box`, `.btn-map-outline`, `.btn-rsvp-submit`, `.gift-tab-btn`, `.btn-copy`) menggunakan bentuk kapsul ergonomis (`border-radius: 9999px`).
      - **Romantic Countdown Shrine:** Modul hitung mundur dibungkus kontainer kapsul melengkung halus (`border-radius: 20px`) berlatar semi-transparan `color-mix(in srgb, var(--bg-dark) 55%, transparent)`.
      - **Modern Arch Love Story Timeline:** Seksi Love Story (`#story`) dilengkapi rel garis vertikal bergradasi (`.journey-timeline::before`), penanda node mutiara berkilau (`.story-chapter-block::before`), kartu babak kubah lengkung (`border-radius: 28px 28px 16px 16px`), dan pill badge babak (`border-radius: 9999px`).
      - **Soft Rounded Form & Cards:** Input RSVP (`border-radius: 12px`), kartu ucapan (`border-radius: 14px`), dan kartu rekening bank (`border-radius: 18px`) memberikan kesan modern, ramah, dan anggun.
  - **Orkestrasi Multi-Sesi Acara & Sinkronisasi Kalender (`lib/themeEngine.ts`):**
    - **Deduplikasi Cerdas Lokasi & Tanggal (`isSameLocationForAll`):**
      - *Skenario 1 (Satu Tempat & Satu Hari):* Jika seluruh sesi berada pada tanggal dan venue yang sama, kartu venue disatukan di bagian bawah (`.event-unified-venue-card`) dengan satu tombol Google Maps terpusat.
      - *Skenario 2 (Beda Hari atau Beda Lokasi):* Jika terdapat sesi pada hari yang berbeda (misal: Mappacci hari Jumat, Akad & Resepsi hari Sabtu) atau gedung berbeda, setiap sesi dirender dalam kartu mandiri dengan tombol Google Maps masing-masing, serta mencantumkan tanggal spesifik sesi (`.ev-session-date`) secara eksplisit di atas jam acara guna mengeliminasi kebingungan tamu.
    - **Prioritas Acara Utama pada Tautan Kalender (`googleCalendarUrl`):**
      - Tautan Google Calendar secara konsisten membaca tanggal dan lokasi dari sesi yang ditandai sebagai **Acara Utama (`isPrimary: true`)** (`primaryEvent?.location || primaryEvent?.address`), menjamin agenda kalender tamu sinkron 1:1 dengan acara puncak pernikahan.
    - **Sinkronisasi Hitung Mundur (*Countdown Timer*) ke Sesi Acara Utama (`targetDate`):**
      - Seluruh 28 tema master (`aurelia`, `artisan`, `kalandra`, `valente`, `wave`, `papercut`, `ameera`, `chronicle`, `lumina`, `solaria`, `prameswari`, `dillalucky`, `badrika`, `mayang`, `candani`, `lagaligo`, `toraja`, `rantepao`, `makale`, `bugis`, `bone`, `wajo`, `soppeng`, `makassar`, `gowa`, `maros`, `takalar`, `bulukumba`) kini mengonsumsi `targetDate` yang ditambatkan secara presisi ke `primaryEventDate` dan jam mulai acara utama, menjamin angka hitung mundur hari H selalu aktif dan seragam.
  - **Standarisasi Tipografi Anti-Overflow Split Desktop (Mobile-Emulation Scale):**
    - **Akar Masalah Tipografi `vw`:** Unit CSS `vw` mengevaluasi lebar seluruh layar peramban (1440px - 1920px), bukan lebar kontainer 460px. Hal ini membuat judul besar berhuruf kapital (misal "LIVE STREAMING") atau font kaligrafi (seperti *Parisienne* / *Cinzel*) membengkak hingga >54px dan meluap keluar dari panel split kanan.
    - **Pemberian Cap Maksimal:** Pada media query `@media (min-width: 900px)`, seluruh judul seksi `.sec-main-title, .sec-heading` dikunci maksimal pada `font-size: clamp(1.75rem, 2.1rem, 2.3rem) !important;` dengan proteksi `overflow-wrap: break-word !important; word-break: break-word !important;`.
    - **Penerapan pada Starter Blueprint (`themes/starter-blueprint.html` & `public/downloads/starter-blueprint.html`):** Arsitektur `.layout-wrapper`, `.sidebar-desktop`, `.main-scroll-panel` (460px), seksi pembuka 100vh `#home`, dan aturan tipografi anti-overflow telah diintegrasikan langsung ke dalam master starter blueprint sebagai standar emas bagi para Theme Builder.
  - **Standarisasi Ergonomi & Dimensi Mobile UI-UX (Golden Mobile Standard):**
    - **Aksesibilitas Viewport & iOS Dynamic Island / Home Bar Insets:**
      - Seluruh tema master wajib mengadopsi `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` tanpa atribut `user-scalable=no` (sesuai WCAG 1.4.4 Text Resizing). Parameter `viewport-fit=cover` memastikan WebKit Safari mengaktifkan variabel lingkungan `env(safe-area-inset-*)`.
      - Komponen navigasi mengambang (`.bottom-dock`) wajib menggunakan `bottom: calc(18px + env(safe-area-inset-bottom, 0px))` untuk mencegah tabrakan dengan garis gestur *Home Indicator* 34px iOS.
      - Kontrol musik mengambang (`.music-fab`) wajib menggunakan `top: calc(18px + env(safe-area-inset-top, 0px))` dan `right: calc(18px + env(safe-area-inset-right, 0px))` untuk menghindari tabrakan dengan *Dynamic Island* / Notch kamera depan iPhone.
    - **Proteksi Anti-Zoom Liar Safari iOS pada Form Input:**
      - Seluruh elemen kontrol formulir (`.form-in, .form-sel, .form-ta`) dikunci pada ukuran font minimum **`16px`** (`font-size: 16px;`). Hal ini mencegah Safari iOS melakukan pembesaran paksa (*auto-zoom jarring*) saat tamu memfokuskan input RSVP atau ucapan.
    - **Standar Ukuran Area Sentuh (Apple HIG & Google Material Compliance):**
      - Tombol menu dock navigasi (`.dock-a` / `.dock-btn`) memiliki dimensi sentuhan minimum **44 × 44 px** dengan deklarasi `touch-action: manipulation;`.
      - Tombol salin rekening (`.btn-copy`) dinormalisasi dengan tinggi sentuhan $\ge 38\text{px}$ dan padding nyaman ($0.55\text{rem } 1.1\text{rem}$) demi kenyamanan tamu lansia.
    - **Standarisasi Galeri Masonry Universal (Mobile & Desktop Split 100% Identik):**
      - Engine universal `lib/themeEngine.ts`, `lib/demoRegistry.ts`, dan `public/css/modules.css` menerapkan tata letak Masonry **2 kolom** (`columns: 2 !important; column-gap: 8px;`) secara universal pada feed seksi Our Moment (dibatasi 2–3 baris pertama / maks 6 foto) maupun pada modal galeri penuh. Tidak ada disparitas media query antara desktop dan mobile karena panel kanan desktop berukuran representasi mobile yang identik (~460px). Setiap foto mengalir alami (`break-inside: avoid; height: auto;`) mengisi ruang secara padat tanpa menyisakan ruang kosong atau foto mengecil.
    - **Standarisasi Dasbor Klien pada Layar Ponsel (`/dashboard`):**
      - Dock navigasi bawah mengambang (`layout.tsx`) diperbarui menggunakan `bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]` guna mencegah interferensi gestur Home Indicator iOS 34px.
      - Grid metrik lisensi akun (`page.tsx`) dioptimalkan menjadi flex wrap responsif (`flex-col sm:flex-row gap-1.5`) agar teks paket dan tombol upgrade tidak saling bertubrukan pada perangkat sempit 360px.
      - Menghilangkan redundansi jarak kosong bawah di halaman RSVP (`pb-20` dihapus, mengandalkan proteksi padding dock terpusat `pb-28` di layout).
      - Tombol salin link tamu pada buku tamu (`guests/page.tsx`) ditingkatkan ke ukuran ergonomis minimum 36px (`touch-manipulation`), dan tabel pratinjau CSV dibungkus kontainer `overflow-x-auto min-w-[340px]`.
  - **Arsitektur Lapisan Zero-Fake Fallback & Infinite Seamless Flow:**
    - **Prinsip Zero-Fake Fallback:** Jika klien tidak mengunggah foto background global (`GLOBAL_FIXED_BG`), engine `lib/themeEngine.ts` meneruskan string kosong (`""`) alih-alih memaksa aset demo (`/demo/...`). Kanvas undangan murni mengekspos warna dasar palet tema (`body { background: var(--bg-dark); }` / `--bg-light`) dan gradasi perlindungan kontras bawaan tema tanpa patahan (*broken image*).
    - **Pencegahan Duplikasi Foto ke Seksi Home:** Jika klien tidak mengunggah foto khusus `HOME_PHOTO`, seksi `#home` berstatus transparan (`background: transparent;`) tanpa memaksa duplikasi dari foto latar, menjaga tampilan bersih dengan tipografi, kaligrafi, dan monogram artistik.
    - **Infinite Seamless Flow (Anti-Garis Potongan Seksi):** Seluruh seksi aliran konten (`.slide-opening`, `.sec-flow`) dilarang memiliki `border-bottom` pemotong layar. Panel scroll (`.main-scroll-panel`) berlatar transparan penuh (`background: transparent;`) di mobile maupun desktop, menjamin seluruh pergantian seksi mengalir mulus sebagai satu kanvas utuh yang elegan.
  - **Standarisasi Smart Auto-Hide Navigasi Dock & Kontrol Audio Mengambang:**
    - Seluruh tema master dan `starter-blueprint.html` dilengkapi mekanisme auto-hide pintar berbasis hardware acceleration (`translate3d` & `opacity`).
    - **Home-Safe Audio FAB Auto-Hide & Dock Visibility Sync:**
      - Saat sampul dibuka (`openInvitation()`) atau pengunjung berada di seksi pembuka `#home`, tombol audio FAB mengambang (`#musicToggle` / `.audio-fab`) **tersembunyi secara mutlak** (`fab.classList.add('fab-hidden')`) agar visual Opening Hero 100vh tetap bersih dan elegan tanpa polusi tombol mengambang.
      - Begitu tamu men-scroll melewati seksi `#home` (`currentScrollY > homeThreshold`), tombol audio FAB muncul dan secara harmonis mengikuti visibilitas `.bottom-dock`.
      - Pada pergerakan scroll ke bawah cepat, kedua kontrol bersembunyi bersamaan; pada scroll ke atas, kedua kontrol meluncur masuk kembali bersamaan.
      - Jika tamu scroll kembali ke atas memasuki `#home`, audio FAB kembali tersembunyi secara otomatis (`setControls(true, false)`).
    - **Sinkronisasi Baku Cetak Biru (Triple Blueprint 1:1 Synchronization):**
      - Seluruh 3 berkas cetak biru sistem dijaga 100% identik tanpa deviasi baris kode (*zero drift*):
        1. [`themes/starter-blueprint.html`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/themes/starter-blueprint.html) (Master Sistem).
        2. [`public/downloads/starter-blueprint.html`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/public/downloads/starter-blueprint.html) (File Unduhan Desainer di UI Admin).
        3. [`theme-builder/starter/master.html`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/theme-builder/starter/master.html) (Starter Kit Theme Builder Lokal).
      - Dilengkapi kustomisasi gaya seleksi kursor `::selection` dinamis berbasis `color-mix(in srgb, var(--primary) 30%, transparent)`.
    - **Ultra-Clean Outro Auto-Hide:** Saat tamu tiba di seksi penutup / outro footer paling bawah (`isNearBottom`), dock navigasi (`.bottom-dock`) dan kontrol mengambang (`.music-fab` / `#musicToggle`) otomatis tersembunyi (*autohide*) secara mutlak agar tampilan outro 100vh bebas gangguan visual dan bersih total. Seluruh kontrol akan meluncur masuk kembali (*reveal*) secara instan begitu tamu melakukan gestur scroll ke atas (`delta < -SCROLL_THRESHOLD`).
    - **Akar Masalah Kebocoran Visual (Visual Leak):** Pada peramban ponsel atau jaringan lambat, DOM HTML di-parse lebih cepat daripada unduhan berkas gambar cover pembuka (`landingCoverUrl`). Jika layar penutup (*cover screen*) memiliki gradasi transparan, seksi isi undangan di bawahnya (`.page-wrap`, profil mempelai, floating bar) sempat bocor terlihat sekejap (*flash of unstyled/underlying content*).
    - **Prinsip Arsitektur Hibrida (Theme-First with Engine Fallback):**
      1. *Master Preloader Khusus (`id="themePreloader"`):* Jika berkas HTML tema master/piring telah memiliki elemen dengan atribut `id="themePreloader"`, engine `lib/renderTemplate.ts` secara otomatis **TIDAK AKAN** menyuntikkan preloader bawaan engine. Gaya, animasi, atau ornamen khas milik tema tersebut akan dihormati sepenuhnya.
      2. *Universal Fallback Preloader (Injeksi Bawaan Engine):* Bila tema master belum mendefinisikan `id="themePreloader"`, engine secara cerdas menyuntikkan Universal Luxury Preloader tepat di bawah tag pembuka `<body>` dan CSS inline di `<head>`. Preloader ini berlatar obsidian pekat (`#0c0c0e`, z-index 999999), menampilkan tipografi monogram murni yang minimalis (*Native Luxury Serif Didot/Georgia*) yang melekat sejak milidetik ke-0 (`{{firstInitial}} & {{secondInitial}}`), nama panggilan mempelai (`{{firstName}} & {{secondName}}`), dan *hairline shimmer progress bar* yang tenang tanpa elemen lingkaran/frame yang ramai.
      3. *Solid Backdrop Guard:* Seluruh selektor cover (`.cover-screen, #coverScreen, .screen-cover, #coverOverlay`) diberikan `background-color: #0c0c0e !important;`, menjamin tidak ada lapisan di baliknya yang tembus pandang sebelum tombol buka undangan ditekan.
      4. *Universal Dismissal Driver (`initPreloaderGuard`):* Skrip terpadu di `UNIFIED_CLIENT_RUNTIME_SCRIPT` menghitung selisih waktu tayang sejak first paint. Begitu proses decode gambar cover selesai (`img.complete` / `img.onload`), sistem menghitung sisa waktu hingga genap memenuhi **durasi minimal 1.2 detik (1200ms)** agar tamu sempat menikmati monogram dan kilau emas tanpa terburu-buru. Setelah durasi minimal tercapai, preloader memudar dengan transisi halus 600ms (`.preloader-hidden`) lalu dicabut bersih dari DOM (`remove()`).
      5. *Safety Timeout 2.5 Detik (2500ms):* Pengunjung dengan koneksi lemah atau saat CDN gambar mengalami degradasi dilindungi batas waktu aman maksimal 2.5 detik agar tamu tidak pernah mengalami layar macet (*frozen*).
      6. *Keamanan 100% Saat Publish (Standalone Baked):* Generator publikasi (`lib/staticPublisher.ts`) mengeksekusi `renderTemplateFile()` secara atomik. Berkas HTML statis mandiri (`data/published/ids/{id}.html`) langsung memuat struktur preloader dan script dismissal secara mandiri (*self-contained*), bebas dari dependensi server.
      7. *Kekebalan Mode Pratinjau Kartu (Catalog & Admin Preview):* Pada mode showcase kartu (`?autoplay=1`), `AUTOPLAY_SHOWCASE_SCRIPT` langsung menyembunyikan `#themePreloader` tanpa jeda, memastikan katalog tema dan cuplikan admin tetap responsif dan instan.
  - **Standarisasi Slot Visual & Background Layer Fokus Khusus Tema Chronicle:**
    - Background global tidak lagi dipasang pada `body` 100vw, melainkan menggunakan elemen kanvas independen `.fixed-bg-layer`:
      - Di HP/Mobile (`< 900px`): Memenuhi 100% layar vertikal ponsel.
      - Di Komputer/Desktop (`≥ 900px`): Dibatasi presisi hanya menyelimuti kolom undangan kanan (`width: 460px; left: calc(100% - 460px);`), sehingga titik fokus foto simetris di tengah undangan dan tidak terpotong atau tertutup oleh panel Hero kiri.
    - Seksi awal panel scroll kanan memiliki slide pembuka editorial resmi `<section id="home" class="slide-section sec-hero-editorial">` yang menggunakan `{{homePhotoCssUrl}}` (Slot *Latar Belakang Home*), menyajikan impresi cover majalah eksklusif dengan judul masthead dan tanggal acara yang sangat memukau di perangkat Mobile maupun Desktop. Jika slot Home sengaja dikosongkan oleh klien atau tema tidak memiliki foto spesifik, kanvas tetap bersih tanpa dipaksa memuat foto background fallback.
    - Sisi kiri widescreen dikendalikan oleh `.sidebar-desktop` via `{{sidebarPhotoUrl}}` (Slot *Desktop Sidebar*).
  - **Standarisasi Slot Visual & Refinement Khusus Tema Candani:**
    - Background kanvas tidak lagi dipasang pada `body` 100vw, melainkan menggunakan elemen kanvas independen `.fixed-bg-layer` (460px di desktop `≥ 900px`, 100% di mobile) dengan URL dinamis `{{homePhotoCssUrl}}` berbalut radial gradient pelindung. Saat slot Home tidak diisi foto, `homePhotoCssUrl` bernilai string kosong `""` sehingga kanvas hanya menampilkan gradasi gelap tema yang bersih tanpa menimpa foto tekstur demo.
    - Seksi Home (`#home`) dirancang murni tanpa card berbingkai (*optical center typography* dengan ritme vertikal kompak), menjaga keterbacaan teks doa pembuka, monogram, dan grid hitung mundur tetap 100% kontras dan menyatu dengan latar belakang.
    - Profil Mempelai (`#section-couple` via `.couple-staggered-container`) mengadopsi arsitektur *Card-less Counter-Balance*: menghilangkan kotak kartu pembatas, mempertahankan bingkai kubah melengkung berbayangan mewah (*luxury layered shadow*), First (Pria) berposisi kiri dengan inisial huruf pertama bergradasi (*watermark gradient*) di sisi kanannya, Second (Wanita) di kanan dengan inisial di sisi kirinya, terhubung oleh ampersand puitis `&`, serta bebas dari efek loncat hover/scroll yang mengganggu.
    - Bottom Dock terintegrasi penuh: tombol pertama diarahkan ke `#home` dengan label 'Home', dan tombol musik ditempatkan langsung di dock (`#musicToggle` / `.dock-music-btn`) yang tersinkronisasi otomatis dengan status audio engine (`.playing` dengan pulse animation saat memutar, tanpa emoji sistem bawaan).
    - Terintegrasi penuh dengan Universal Smart Dock Home Zone State Guard (`body.lux-at-home-zone`), memastikan seksi Home bebas dari dock saat pertama dibuka atau di-scroll balik ke paling atas.
    - Dilengkapi modal terpadu `#modalBg` untuk kartu akses QR dan souvenir voucher, serta seluruh elemen teks menggunakan atribut standar `data-lux-field`.
  - **Standarisasi Smart Mobile Fullscreen (`requestSmartFullscreen()`):**
    - Seluruh 19 tema fisik master dan `starter-blueprint.html` mengimplementasikan fungsi `requestSmartFullscreen()` yang dipicu tepat saat tamu menekan tombol *"Buka Undangan"*.
    - **Akar Masalah Browser Mobile Bar:** Pada peramban smartphone (Safari iOS, Chrome Mobile, Samsung Internet), address bar dan navigation bar sering kali memakan ruang vertikal dan mengganggu pengalaman visual imersif undangan pernikahan digital.
    - **Solusi Dua Tingkat (Native Fullscreen + Smart Window Scroll Offset):**
      1. *Native Fullscreen API:* Memeriksa `requestFullscreen`, `webkitRequestFullscreen`, `mozRequestFullScreen`, atau `msRequestFullscreen` pada `document.documentElement` dengan penanganan `catch()` non-blocking.
      2. *Smart Address Bar Auto-Hide Fallback:* Jika fullscreen native ditolak atau pada peramban yang membatasi API fullscreen tanpa interaksi video (seperti Safari iOS), sistem secara otomatis mengeksekusi `window.scrollTo(0, 1)` setelah jeda 100ms untuk memaksa peramban mobile menyembunyikan address bar (*minimal UI mode*).
  - **Arsitektur Tema Tradisional Toraja (`themes/traditional/toraja.html`):**
    - Tema `toraja.html` merupakan tema tradisional ke-7 (tema master ke-17) yang dirancang khusus mengangkat warisan budaya luhur suku Toraja, Sulawesi Selatan:
      - **Ornamen Budaya Otentik Toraja:** Mengintegrasikan aset vektor/WebP resmi di `public/assets/ornaments/toraja/`:
        - *Pa'barre Allo:* Simbol matahari dan keagungan Toraja yang diletakkan di puncak seksi hero dan monogram.
        - *Pa'kadang Pao Seamless:* Border horizontal seamless bermotif kait mangga yang bergerak halus melintasi batas seksi (`border-pa-kadang-pao-seamless.webp`).
        - *Watermark Tongkonan 3D:* Siluet 3D tampak perspektif (`tongkonan-perspektif-3d.webp`) di sudut kiri dan kanan bawah cover dengan efek mirror, serta tampak depan 3D di tengah (`tongkonan-depan-3d.webp`).
        - *Siluet Skyline Atap Home:* Siluet atap tampak perspektif ganda (`atap-tongkonan-perspektif.webp`) di sudut kiri dan kanan (mirror) serta tampak depan (`atap-tongkonan-depan.webp`) di tengah dasar seksi Home di balik hitung mundur.
        - *Rumah Tongkonan 3D Depan:* Ilustrasi 3D frontal otentik (`tongkonan-depan-3d.webp`) pada desktop sidebar hero, puncak seksi home, prasasti petuah doa, dan penutup Kurresumanga'.
        - *Mahkota Atap Tongkonan:* Ornamen atap kayu ukir Toraja 3D (`atap-tongkonan-depan.webp`) di belakang bingkai foto profil mempelai dengan gradasi bayangan dimensional.
      - **Tipografi Etnik Berketerbacaan Tinggi:** Mengombinasikan `Cinzel` untuk judul sakral, `Great Vibes` untuk aksen kaligrafi romantis, dan `Plus Jakarta Sans` untuk teks narasi, informasi acara, dan kontrol antarmuka.
      - **Bingkai Foto Home Arch Adaptif:** Seksi `#home` menghadirkan bingkai *Arch Frame* kubah melengkung ganda emas Toraja dengan fallback kondisional cerdas: jika foto home diunggah (`hasCustomHomePhoto`), foto tampil terpusat dengan nama mendatar responsif; jika tanpa foto, tampilan otomatis kembali ke ilustrasi Tongkonan megah (110px) dan tipografi bertumpuk tanpa celah kosong.
      - **Canvas Scrim 70% & Kanvas Home Transparan:** Seksi `#home` berlatar transparan murni, memperlihatkan gambar latar belakang `background.webp` (kain tenun merah-emas & siluet) yang dilapisi canvas scrim 70% seragam untuk keterbacaan teks maksimal.
      - **Narasi Adat Puitis (Toraja Wedding Lore):** Dilengkapi pepatah luhur Toraja *"Misa' kada dipotuo, pantan kada dipomate"* (Bersatu kita teguh, bercerai kita runtuh) dengan rujukan sastra otentik *Kada Dipotuo Toraja* pada seksi doa, serta ungkapan syukur *"Kurresumanga'"* pada seksi penutup.
      - **Palet Warna Otentik Toraja:** Terdaftar di `lib/colorPalettes.ts` dengan warna dasar Merah Tua Toraja (`primary: #750b0a`), Kuning Emas Toraja (`accent: #f1d17e`), dan Obsidian Deep Brown (`bgDark: #1a0404`).
      - **Aset Resmi `public/demo/toraja/` & 9 Slot Media Penuh:** 100% menggunakan foto lokal terstandarisasi (`cover.webp`, `cover_desktop.webp` landscape panorama Tongkonan 16:9, `home.webp`, `hero.webp`, `background.webp`, `groom.webp`, `bride.webp`, `footer.webp`, dan `gallery_01.webp` s/d `08`), layout split 460px desktop, dan Smart Auto-Hide dock navigasi.
  - **Arsitektur Tema Tradisional Bugis (`themes/traditional/bugis.html`):**
    - Tema `bugis.html` merupakan tema tradisional ke-8 (tema master ke-18) yang dirancang mengangkat kemegahan tradisi bangsawan Bugis Saoraja:
      - **Ornamen Budaya Otentik Bugis:** Mengintegrasikan Gerbang Walasuji Bambu Megah 85% (`/assets/ornaments/bugis/vapillion-bamboo2.webp`) dengan framing foto mempelai dinamis, selempang sutra Bugis Sabbe (`sabbe.webp`), mahkota rumbai Bugis Atas (`bugis-atas.webp`) dan border songket emas bawah (`frame-bottom.webp`) berbasis arsitektur **Seamless Repeat Tile (`repeat-x`)** anti-crop, 4 sudut bunga emas presisi flush (`flower-tl/tr/bl/br.webp`), serta latar belakang tekstur marun sakral (`bg-maroon.webp`).
      - **Tipografi Etnik Berketerbacaan Tinggi:** Mengombinasikan `Cinzel` untuk judul sakral, `Great Vibes` untuk kaligrafi nama mempelai, `Cormorant Garamond` untuk kutipan doa, dan `Plus Jakarta Sans` untuk teks informasi.
      - **Narasi Adat Puitis (Bugis Wedding Lore):** Petuah luhur *"Sipakatau, sipakalebbi, sipakainge"* (Saling menghormati, saling menghargai, saling mengingatkan) dan *"Kurru Sumanga'"* sebagai ungkapan syukur.
      - **Palet Warna Bugis Royal Maroon & Gold:** Terdaftar di `lib/colorPalettes.ts` (`primary: #5a0b10`, `accent: #dfb76c`, `bgDark: #140204`).
      - **Zero-Unsplash & Kepatuhan Blueprint 460px:** 100% menggunakan foto lokal dummy, layout split desktop 460px, Smart Mobile Fullscreen, dan Smart Auto-Hide dock navigasi.
  - **Arsitektur Tema Tradisional Makassar (`themes/traditional/makassar.html`):**
    - Tema `makassar.html` merupakan tema tradisional ke-9 (tema master ke-19) yang mengangkat filosofi kehormatan dan kemaritiman agung suku Makassar:
      - **Ornamen Budaya Otentik Makassar:** Mengintegrasikan lambang Kapal Phinisi (`/assets/ornaments/bugis/kapal-phinisi.webp`), bingkai border Makassar (`frame-makassar-top.webp`, `frame-makassar-bottom.webp`), 4 sudut bunga emas, dan latar belakang tekstur navy agung (`bg-makassar.webp`).
      - **Tipografi Luhur:** Kombinasi `Cinzel`, `Great Vibes`, `Cormorant Garamond`, dan `Plus Jakarta Sans`.
      - **Narasi Adat Puitis (Makassar Wedding Lore):** Filosofi kehormatan *"Siri' na Pacce"* dan *"Bajiki passiriki, sombere' na malabbiri"* (Menjaga martabat dengan budi pekerti yang ramah dan mulia), serta ucapan *"Tarima kasi' lompo"*.
      - **Palet Warna Makassar Phinisi Navy & Gold:** Terdaftar di `lib/colorPalettes.ts` (`primary: #0a192f`, `accent: #dfb76c`, `bgDark: #030914`).
      - **Zero-Unsplash & Kepatuhan Blueprint 460px:** 100% menggunakan foto lokal dummy, layout split desktop 460px, Smart Mobile Fullscreen, dan Smart Auto-Hide dock navigasi.
  - **Arsitektur Tema Tradisional Toraja Rantepao (`themes/traditional/rantepao.html`):**
    - Tema `rantepao.html` merupakan tema tradisional ke-10 (tema master ke-20) yang mengangkat kemegahan adat Toraja Rantepao berbalut Crimson Marun & Kilau Emas Bambu:
      - **Integrasi 9 Slot Media Lengkap:** Mendukung secara penuh `LANDING_COVER` (mobile 9:16), `LANDING_COVER_DESKTOP` (desktop 16:9 fullscreen override), `HOME_PHOTO` (hero pembuka), `DESKTOP_SIDEBAR` (hero panel kiri desktop), `GLOBAL_FIXED_BG` (kanvas latar tetap), `GROOM_PHOTO` & `BRIDE_PHOTO` (avatar foto mempelai), `GALLERY` (8 grid foto & lightbox), dan `CLOSING_COVER` (seksi outro 100vh adaptif `.site-footer.has-closing-photo`).
      - **Ornamen Budaya Otentik Toraja Rantepao:** Mengintegrasikan ukiran Toraja Passura', siluet Tongkonan, dan bingkai ornamen khas Toraja Rantepao (`public/assets/ornaments/rantepao/`).
      - **Tipografi Luhur & Narasi Adat:** Mengombinasikan `Cinzel`, `Great Vibes`, `Cormorant Garamond`, dan `Plus Jakarta Sans`, dengan petuah agung *"Misa' kada dipotuo, pantan kada dipomate"* dan ungkapan rasa syukur *"Kurresumanga'"*.
      - **Palet Warna Toraja Crimson Marun & Gold:** Terikat dinamis pada token CSS (`primary: #6b1414`, `accent: #d4af37`, `bgDark: #1a0404`).
      - **Zero-Unsplash & Kepatuhan Blueprint 460px:** 100% menggunakan foto lokal dummy, layout split desktop 460px, Smart Mobile Fullscreen, dan Smart Outro Auto-Hide pada floating dock dan kontrol audio saat mencapai dasar halaman.
  - **Arsitektur Tema Tradisional Toraja Makale (`themes/traditional/makale.html`):**
    - Tema `makale.html` merupakan tema tradisional ke-11 (tema master ke-21) yang mengangkat kemegahan kultural Tana Toraja Makale berbalut Royal Earth Crimson & Kilau Emas Tongkonan:
      - **Integrasi 9 Slot Media Lengkap:** Mendukung secara penuh `LANDING_COVER` (mobile 9:16), `LANDING_COVER_DESKTOP` (desktop 16:9 fullscreen override), `HOME_PHOTO` (hero pembuka), `DESKTOP_SIDEBAR` (hero panel kiri desktop), `GLOBAL_FIXED_BG` (kanvas latar tetap), `GROOM_PHOTO` & `BRIDE_PHOTO` (avatar foto mempelai), `GALLERY` (8 grid foto & lightbox), dan `CLOSING_COVER` (seksi outro 100vh adaptif `.site-footer.has-closing-photo`).
      - **Ornamen Budaya Otentik Tana Toraja Makale:** Mengintegrasikan motif ukiran Passura', siluet agung Buntu Burake & Tongkonan, serta bingkai ornamen khas Tana Toraja (`public/assets/ornaments/makale/`).
      - **Tipografi Luhur & Narasi Adat:** Mengombinasikan `Cinzel`, `Great Vibes`, `Cormorant Garamond`, dan `Plus Jakarta Sans`, dengan petuah agung *"Misa' kada dipotuo, pantan kada dipomate"* dan ungkapan rasa syukur *"Kurresumanga'"*.
      - **Palet Warna Toraja Crimson Marun & Gold:** Terikat dinamis pada token CSS (`primary: #750b0a`, `accent: #f1d17e`, `bgDark: #1a0404`).
      - **Zero-Unsplash & Kepatuhan Blueprint 460px:** 100% menggunakan foto lokal dummy, layout split desktop 460px, Smart Mobile Fullscreen, dan Smart Outro Auto-Hide pada floating dock dan kontrol audio saat mencapai dasar halaman.
  - **Arsitektur Rumpun 7 Tema Daerah Sulawesi Selatan (v5.9.4):**
    - Ekspansi 7 tema master fisik daerah Sulawesi Selatan (`bone`, `wajo`, `soppeng`, `gowa`, `maros`, `takalar`, `bulukumba`) menggenapkan koleksi menjadi **28 tema master** mandiri:
      - **Rumpun Bugis Tellumpoccoe:**
        * **Bone (`bone.html`):** Mengangkat kemegahan bangsawan Kerajaan Bone, Arung Palakka, Saoraja Lamurukung, dan filosofi Songkok To Bone berbalut Royal Maroon & Gold (`#5a0b10` / `#dfb76c`). Folder ornamen: `public/assets/ornaments/bone/`.
        * **Wajo (`wajo.html`):** Mengangkat keindahan tenun sutera Sengkang, Danau Tempe, dan Saoraja Ranreng Bettempola berbalut Sutera Maroon & Gold Wajo (`#5a0b10` / `#dfb76c`). Folder ornamen: `public/assets/ornaments/wajo/`.
        * **Soppeng (`soppeng.html`):** Mengangkat keanggunan Bumi Latemmamala, keteduhan Villa Yuliana, dan petuah leluhur Soppeng berbalut Royal Maroon & Gold (`#5a0b10` / `#dfb76c`). Folder ornamen: `public/assets/ornaments/soppeng/`.
      - **Rumpun Makassar & Maritim:**
        * **Gowa (`gowa.html`):** Mengangkat keagungan Kesultanan Gowa, Istana Balla Lompoa Sungguminasa, dan Benteng Somba Opu berbalut Royal Navy & Gold (`#0a192f` / `#dfb76c`). Folder ornamen: `public/assets/ornaments/gowa/`.
        * **Maros (`maros.html`):** Mengangkat kearifan Butta Salewangang, kemegahan bukit karst Rammang-Rammang, dan pesona Marusu' berbalut Royal Navy & Gold (`#0a192f` / `#dfb76c`). Folder ornamen: `public/assets/ornaments/maros/`.
        * **Takalar (`takalar.html`):** Mengangkat semangat Butta Panrannuangku dan kawasan adat Balla Lompoa Sanrobone berbalut Royal Navy & Gold (`#0a192f` / `#dfb76c`). Folder ornamen: `public/assets/ornaments/takalar/`.
        * **Bulukumba (`bulukumba.html`):** Mengangkat keperkasaan bahtera Phinisi Tanah Beru, filosofi Butta Panrita Lopi, dan tradisi luhur Ammatoa berbalut Royal Navy & Gold (`#0a192f` / `#dfb76c`). Folder ornamen: `public/assets/ornaments/bulukumba/`.
      - **Integrasi 9 Slot Media & Standarisasi Emas:** Ketujuh tema secara penuh mengintegrasikan 9 slot media (`LANDING_COVER`, `LANDING_COVER_DESKTOP`, `HOME_PHOTO`, `DESKTOP_SIDEBAR`, `GLOBAL_FIXED_BG`, `GROOM_PHOTO`, `BRIDE_PHOTO`, `GALLERY`, `CLOSING_COVER`), Home Arch Photo Frame mempelai, folder demo terisolasi (`public/demo/{daerah}/`), folder ornamen mandiri (`public/assets/ornaments/{daerah}/`), serta Smart Outro Auto-Hide pada floating dock.



### 8.1 Studio Editor: Dual-Native Mode (Form Data & Live Editor)

**File:** `app/(client)/dashboard/invitation/[id]/page.tsx`, `lib/renderTemplate.ts`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ DUAL-NATIVE STUDIO ARCHITECTURE                                              │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ 1. TAB FORM DATA                     │ 2. TAB LIVE EDITOR                    │
│ • Input formulir lengkap 8 seksi     │ • Simulasi iframe ponsel interaktif   │
│ • Pemilihan tema katalog resmi       │ • Sinkronisasi palet warna instan     │
│ • Simpan seksi dengan feedback in-app│ • Auto-refresh pratinjau saat simpan  │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

#### 1. Form Data Tab (`activeTab === "form"`)
- Formulir modular yang mencakup data pasangan, tanggal & lokasi multi-acara, kisah cinta, galeri foto, rekening tanda kasih, musik latar, serta pemilihan tema katalog resmi dan palet warna.
- Setiap seksi dilengkapi tombol simpan mandiri dengan feedback status in-app toast tanpa dialog alert bawaan browser.

#### 2. Live Editor Tab (`activeTab === "preview"`)
- Menampilkan simulator perangkat mobile beresolusi presisi (390×844) yang memuat iframe undangan draft klien (`/api/client/invitations/[id]/preview`).
- Panel kontrol samping memungkinkan klien mengubah palet warna secara langsung dan melihat perubahannya seketika.

#### 3. Universal PostMessage Dispatcher
- Runtime script terpadu (`UNIFIED_CLIENT_RUNTIME_SCRIPT`) mendengarkan event window message:
  - `LUX_PALETTE_CHANGED`: Menginjeksi seketika token warna CSS dinamis (`--primary`, `--secondary`, `--accent`, `--bg-dark`, dsb.) ke dalam iframe pratinjau tanpa me-reload peramban.
  - `LUX_SCROLL_TO_SECTION`: Menghubungkan selektor seksi di panel kontrol dengan iframe pratinjau, menggulir layar secara otomatis dan halus (*smooth scroll*) ke seksi yang sedang diedit (Cover, Pasangan, Acara, Galeri, Hadiah, Penutup).

#### 4. Single Draft & Single Output Invariant
- Seluruh perubahan data formulir mengalir ke satu file draft (`data/drafts/<id>.html`) dan saat diterbitkan menghasilkan satu file HTML statis publik (`public/published/ids/<id>.html`) yang 100% identik dengan hasil pratinjau.

#### 5. Two-Way Dual-View Synchronization (Real-time Cross-Iframe Relay)
- Dalam mode Dual-View (`previewDevice === "dual"`), Tampilan Ponsel (`liveMobileIframeRef`) dan Tampilan Komputer (`liveDesktopIframeRef`) tersinkronisasi dua arah secara instan melalui Parent Window Dispatcher:
  - **Sinkronisasi Buka Amplop Universal (`LUX_INVITATION_OPENED` & `LUX_REMOTE_OPEN_INVITATION`):** Saat tombol buka sampul diklik di salah satu iframe atau tombol toolbar luar (*"Buka Amplop"*) ditekan, sinyal disebarkan ke kedua iframe. Script editor runtime menghapus seluruh varian cover screen (`#coverScreen, #coverOverlay, .cover-screen, .cover-overlay, .envelope-overlay`) di semua tema (termasuk split-desktop themes) dengan animasi halus dan transisi display zero-delay.
  - **Sinkronisasi Gulir Layar Dua Arah (Two-Way Scroll Sync via `LUX_SCROLL_SYNC`):** Menggulir pratinjau mobile secara proporsional menggerakkan pratinjau desktop, dan sebaliknya. Dilengkapi *Anti-Echo Guard* (`isProgrammaticScroll`) dan pendeteksi container universal (`window` vs `#rightPanel/.right-panel`), mencegah infinite loop dan menjaga kedua tampilan berada pada rasio section yang identik.
  - **Sinkronisasi Ketukan Formulir Instan (Form Input -> Dual Preview Keystrokes):** Pengetikan pada seluruh field formulir dashboard (`updateField`, `updateCustomLabel`, `updateFeatureSetting`, `updateEventItem`, `updateStoryItem`, `updateBankItem`) langsung memancarkan `LUX_REMOTE_EDIT_CHANGE` ke kedua iframe secara live, memproyeksikan perubahan seketika ke elemen `[data-lux-field]` tanpa perlu menyimpan atau memuat ulang browser.
  - **Direct Role Routing (`senderRole: 'mobile' | 'desktop'`):** Pesan antar-iframe membawa identitas role sumber sehingga perutean ke iframe pasangan berlangsung langsung dan deterministik tanpa bergantung pada perbandingan objek `WindowProxy` browser.
  - **Arsitektur Persistent DOM Mounting (Zero-Reload Tab Switch):** Kontainer Live Editor dan Form Editor tetap ter-mount di dalam DOM menggunakan kontrol visibilitas CSS (`style.display`). Pengguna dapat berpindah antara tab *Form Data* dan *Live Editor* secara instan tanpa reload, mempertahankan posisi scroll, status amplop terbuka, dan hasil editan yang belum disimpan.
  - **Clean Embedded View (Anti-Obstruction Floating Dock):** Ketika iframe dirender di dalam dasbor studio (`window !== window.top`), dock mengambang `#luxLiveEditorDock` otomatis disembunyikan 100% agar kanvas undangan steril tanpa elemen asing yang menutupi ornamen/logo sampul. Kontrol aksi diposisikan rapi pada toolbar luar dasbor.

---

## 9. AUTENTIKASI & OTORISASI

**File:** `auth.ts`, `auth.config.ts`, `middleware.ts`

```
Peran (role):
  SUPER_ADMIN → Akses mutlak semua 13 modul sistem (Ringkasan, Pesanan, Klien, Undangan, Portofolio, Custom Domain, Tema & Musik, Pengaturan, Database, Monitoring, Tim & Hak Akses, Pemasaran & Afiliasi, Finance)
  ADMIN       → Akses operasional harian (Ringkasan, Pesanan, Klien, Undangan, Portofolio, Custom Domain, Tema & Musik). Terkunci dari pemasaran, keuangan, platform settings, DB, monitoring, & tim.
  FINANCE     → Akses finansial & kas (Ringkasan Finansial, Pesanan & Transaksi, Daftar Klien, Finance & Pembukuan)
  SUPPORT     → Akses customer care & darurat (Klien & Remote Dasbor, Projek Undangan & Buka Kunci Darurat, Custom Domain)
  CLIENT/USER → Akses /dashboard/** (klien biasa pemilik undangan)

Guard di middleware & layout:
  /admin/**     → Hanya akun terautentikasi dengan role SUPER_ADMIN, ADMIN, FINANCE, atau SUPPORT
  /dashboard/** → Klien biasa (atau Admin dalam sesi Remote Klien yang sah)
  /api/admin/** → Server-side check via auth()
  /api/client/** → Server-side check via auth() + userId match (atau impersonated userId pada mode remote)

Persistensi Navigasi Admin (Tab Memory Persistence):
  Navigasi tab (/admin?tab=...&sub=...) dan sub-tab pengaturan/monitoring disimpan secara otomatis ke URL search params dan localStorage (lux_admin_active_tab & lux_admin_settings_subtab).
  Saat pengguna me-reload halaman (F5) atau kembali dari rute lain, portal admin tidak pernah terpental kembali ke tab ringkasan ("overview").
```

### 9.1 Mekanisme Remote Klien (Cookie-Based Workspace Override)
Fitur *Remote* memungkinkan Admin untuk masuk ke dasbor Klien dan mengendalikannya secara penuh tanpa mengetahui *password* klien. Sistem ini dirancang menggunakan arsitektur **httpOnly Cookie (`lux_remote_client_id`)** dan resolusi sesi dinamis tanpa perlu memanipulasi atau merusak JWT Admin:

1. **Inisiasi (Admin Dashboard):** Admin mengklik tombol Remote (ikon monitor) pada baris undangan atau detail klien. Tombol Remote hanya aktif pada klien yang sudah memiliki ruang kerja (memiliki undangan atau pesanan berbayar). Untuk calon klien (leads) yang belum checkout, tombol Remote dinonaktifkan guna mencegah admin terlempar ke halaman checkout kosong. Server Action `startRemoteSession(clientId)` di `app/(admin)/admin/actions/remote.ts` memverifikasi hak akses Admin via `auth()`, memastikan klien ada di database, menetapkan cookie `lux_remote_client_id` (httpOnly, Secure, SameSite: Lax, path: "/", maxAge: 1 jam), dan memanggil `redirect("/dashboard")` dari server.
2. **Perizinan Gerbang (Middleware & AuthConfig):**
   - Di `auth.config.ts`, callback `authorized()` memeriksa apakah user adalah Admin yang memiliki cookie `lux_remote_client_id`. Jika ya, gerbang `/dashboard` dibuka.
   - Di `middleware.ts`, proteksi rute `/dashboard` memberikan bypass bagi Admin yang memiliki cookie `lux_remote_client_id`.
3. **Resolusi Workspace Dinamis (`auth.ts`):** Pada setiap pemanggilan `auth()` di sisi server (Route Handlers & Server Components), callback `session` mendeteksi cookie `lux_remote_client_id`. Sistem memuat data klien target dari Prisma (`id`, `name`, `email`, `role`) dan menyematkannya ke `session.user` dengan atribut `isRemote: true`, `originalAdminId`, dan `originalRole: token.role`. Hal ini membuat seluruh ratusan API klien (`/api/client/**`) otomatis membaca dan mengelola data klien yang di-remote secara transparan tanpa mengubah JWT session token.
4. **Indikator UI & Proteksi Dasbor (`layout.tsx` & `/admin`):**
   - Komponen `app/(client)/dashboard/layout.tsx` mengambil status sesi via `GET /api/admin/remote-session` dan menampilkan banner merah bertuliskan *"MODE REMOTE AKTIF: Anda sedang mengendalikan dashboard milik [Nama Klien]"*.
   - Komponen `app/(admin)/admin/page.tsx` memiliki *Immunity Guard*: jika Admin kembali ke halaman admin saat cookie remote aktif, `userRole` tetap mempertahankan hak akses Admin asli sehingga sidebar navigasi admin tidak pernah hilang. Selain itu, banner peringatan amber sticky ditampilkan di bagian atas `/admin` dengan tombol 1-klik untuk menghentikan sesi remote.
   - Pengecekan status pembayaran onboarding di-bypass saat mode remote aktif agar Admin dapat leluasa menginspeksi atau membantu setup undangan klien.
5. **Pemulihan Bersih (Restore 1-Klik & Auto Cleanup on Logout):** Saat Admin mengklik tombol *"Kembali ke Admin"* atau *"Hentikan Sesi Remote"*, sistem mengirim request `DELETE /api/admin/remote-session` yang menghapus cookie `lux_remote_client_id`. Selain itu, saat Admin melakukan Logout dari panel admin, cookie remote otomatis dihapus agar admin tidak terjebak cookie remote pada sesi login berikutnya.
6. **Segmentasi Klien di Admin:** Endpoint `/api/admin/users` menyediakan filter `all`, `active` (berbayar/punya undangan), dan `leads` (calon klien belum checkout). Admin dapat mem-follow-up calon klien via WhatsApp atau menghapus akun abandoned lead yang menumpuk.
7. **Realtime SSE Checkout & Zero-Leak Gatekeeper (PostgreSQL LISTEN/NOTIFY Multi-Process Bridge):** Halaman checkout mendengarkan status pembayaran secara realtime melalui Server-Sent Events (SSE) murni (`/api/payments/status-stream/[orderId]`) tanpa interval polling yang membebani browser maupun database. Untuk mendukung PM2 Cluster Mode (multi-worker process), sistem mengintegrasikan jembatan event-driven native PostgreSQL `LISTEN payment_events` dan `NOTIFY payment_events` (`lib/paymentEvents.ts`). Ketika webhook pembayaran (Midtrans/Xendit) atau approval Admin (`/api/admin/orders/[orderId]/approve`) dieksekusi di instance PM2 manapun, PostgreSQL mem-broadcast sinyal secara instan (<5ms) ke seluruh instance PM2 aktif. Instance yang memegang koneksi SSE klien langsung menerima notifikasi, mem-push event `PAID` atau `REJECTED` (beserta `rejectReason`), dan menutup koneksi secara rapi. Heartbeat pasif (15 detik) melengkapi stream sebagai fail-safe cadangan tanpa polling aktif. Saat status `PAID` diterima, modal transisi sukses bertema *Dark Luxury* muncul mengonfirmasi invoice lunas dan memberikan jeda persiapan visual (1.8s) sebelum mengalihkan pengguna ke `/dashboard/setup`. Tidak ada data dasbor atau undangan yang dapat diakses sebelum status transaksi benar-benar berstatus `PAID`.
8. **Resolusi Dinamis Mode Pembayaran Add-on Dasbor Klien:** Seluruh transaksi pembelian add-on di dalam dasbor klien (perpanjangan galeri kenangan `/api/client/memories/extend`, pembelian domain kustom `/api/client/custom-domain/buy`, dan upgrade paket `/api/payments/upgrade`) tidak lagi di-hardcode ke metode tertentu, melainkan secara dinamis membaca konfigurasi `payment_mode` dari `AdminSetting` (`GATEWAY`, `MANUAL`, atau `BOTH`) untuk menentukan `paymentMethod` (`GATEWAY` atau `MANUAL_TRANSFER`).

---

## 10. API ROUTE MAP

```
PUBLIC (tanpa auth):
  GET  /api/public/settings           → Platform settings global
  GET  /api/public/themes             → List tema aktif (cached via Cloudflare s-maxage=86400, max-age=60, auto-purged on admin sync)
  POST /api/public/rsvp               → Submit RSVP tamu (in-memory key-lock withRsvpLock & atomic transaction prisma.$transaction, proteksi double-tap & kalkulasi pax katering cerdas)
  GET  /api/public/memories/{id}      → List foto momen
  POST /api/public/memories/upload    → Upload foto tamu (rate-limited, kalkulasi kuota total acara totalEventQuota + extraMemoriesQuota top-up & batas per-sesi)
  GET  /api/public/resolve-custom-domain → Resolve custom domain ke subdomain
  GET  /api/public/version            → Versi sistem
  GET  /api/sse/memories              → SSE stream momen real-time

CLIENT (auth required, role=USER):
  GET/PUT/PATCH /api/client/invitations/{id}    → Detail, update penuh, atau update parsial setting operasional (featureSettings, staffPin terdekripsi otomatis di respons)
  GET/DELETE/PATCH /api/client/invitations/{id}/memories → List, hapus foto momen, atau atur konfigurasi kamera tamu (memoriesOpeningLayout, memoriesCardInstruction, memoriesFilter, memoriesDateStamp, shotsQuota 1-30, dan jadwal memoriesSessions dengan Smart Quota Boundary Guard)
  GET       /api/client/invitations         → List undangan client (termasuk status retensi, lock memori & staffPin terdekripsi)
  POST      /api/client/invitations/create  → Buat undangan baru
  GET/POST  /api/client/guests              → Manajemen tamu (kolom `phone`, tanpa `phoneNumber`)
  POST      /api/client/guests/bulk         → Import tamu massal (CSV/JSON, max 500 baris, auto slug, qrToken, tableNumber; didukung modal UI client Drag & Drop CSV + generator template + integrasi Web Contact Picker API untuk ponsel Android)
  GET       /api/client/subdomain/check     → Cek ketersediaan subdomain
  POST      /api/client/upload             → Upload media undangan (WebP Sharp, MP4 H.264 FFmpeg Loop maks 20s & 30MB, MP3 Audio wedding-song.mp3 maks 20MB via storage.ts; penamaan slot deterministik & clean overwrite otomatis)
  GET       /api/client/orders            → List order client
  POST      /api/client/orders/checkout-bundle → Penerbitan tagihan terpadu 1-Invoice multi-layanan (Upgrade Paket, Perpanjangan Galeri, dan Top-Up Kuota Foto Acara) dengan itemsJson terstruktur & auto-supersede order lama
  GET       /api/client/orders/{id}/status → Cek status tagihan terpadu (menyertakan itemsJson rincian layanan)
  POST      /api/client/memories/extend   → Buat order perpanjangan galeri (+30 hari via QRIS)
  POST      /api/payments/upgrade         → Upgrade paket undangan mandiri dengan auto-supersede & checkoutConfirmedAt
  POST      /api/client/custom-domain/buy → Beli add-on Jasa Integrasi Custom Domain
  (Catatan WA: Route wa-link dihapus; digantikan client-side wa.me direct linking + auto-format +62)

ADMIN (auth required, role=ADMIN/SUPER_ADMIN):
  GET  /api/admin/overview            → Statistik platform
  GET  /api/admin/orders              → List transaksi terpaginasi server-side, filter status, tanggal, multi-search & streaming CSV
  POST /api/admin/orders/{id}/approve → Konfirmasi lunas transfer bank manual & auto-audit log
  POST /api/admin/orders/{id}/reject  → Tolak bukti transfer dengan alasan penolakan & auto-audit log
  GET  /api/admin/users               → List akun klien terpaginasi server-side dengan totalSpent & histori transaksi
  DELETE /api/admin/users             → Hapus permanen klien, relasi DB (undangan, transaksi) & pembersihan fisik file (published HTML, draft HTML, folder uploads rekursif)
  GET  /api/admin/invitations         → List projek undangan terpaginasi server-side dengan filter status & pencarian multi-field
  GET/POST/PUT/DELETE /api/admin/themes → Manajemen tema (Upload master .html, update metadata, auto-compile demo, hard-delete steril)
  POST /api/admin/themes/sync         → Sinkronisasi tema disk-to-DB, auto-discovery, auto-compile static demo, revalidate cache & Cloudflare edge purge
  POST /api/admin/cache/purge         → Purge Next.js ISR & Cloudflare Edge CDN Cache (homepage, sitemap, packages, demo, public themes)
  POST /api/admin/settings            → Update platform settings
  POST /api/admin/test-smtp           → Uji coba handshake live email SMTP & pengiriman pesan diagnostik
  POST /api/admin/test-storage        → Uji coba penulisan & pengukuran latensi cloud storage Cloudflare R2/S3
  GET  /api/admin/monitoring/health   → Metrik proses (CPU/RAM), kapasitas disk root VPS, kuota & ukuran riil Cloudflare R2 (ListObjectsV2), latensi database PostgreSQL, status SMTP
  POST /api/admin/custom-domains/check-dns → Live DNS resolver evaluator untuk A record & CNAME
  POST /api/admin/custom-domains/activate  → 1-klik aktivasi tautan custom domain ke undangan klien
  GET  /api/admin/audit-logs          → Riwayat audit aktivitas staf administrator terpaginasi
  GET  /api/admin/webhooks            → Riwayat payload & status webhook payment gateway terpaginasi
  POST /api/admin/database/backup     → Backup database
  POST /api/admin/subdomains/recycle  → Daur ulang subdomain kedaluwarsa
  GET/POST/DELETE /api/admin/portfolio → Manajemen kloning portofolio statis mandiri
  POST /api/admin/invitations/{id}/lifecycle → Kontrol siklus hidup (CLOSE_TO_GALLERY, EXTEND_GALLERY, UPDATE_EVENT_DATE, TOGGLE_EMERGENCY_UNLOCK)
  GET/DELETE /api/admin/remote-session → Manajemen sesi Remote Klien (Baca status & hapus cookie remote)
  GET/POST /api/admin/music            → Pustaka musik sistem (List all & upload audio + kompresi FFmpeg 128kbps)
  PATCH/DELETE /api/admin/music/{id}   → Edit metadata/status & hapus lagu sistem
  GET  /api/admin/finance/overview     → Executive finance metrics (Revenue, OPEX, Margin, MoM), native SVG time-series, alokasi kategori, agenda tagihan
  GET/POST /api/admin/finance/expenses → Buku kas keluar terpaginasi, multi-filter, ekspor CSV, dan catat mutasi baru (cek lock closing)
  PUT/DELETE /api/admin/finance/expenses/{id} → Koreksi mutasi kas dan hapus transaksi (dilindungi validasi isLocked & status closing)
  POST /api/admin/finance/upload-receipt → Unggah berkas fisik struk/nota/invoice (WebP/PDF maks 5MB)
  GET/POST/PUT/DELETE /api/admin/finance/recurring → Manajemen komitmen pengeluaran rutin bulanan (server, wifi, PLN)
  POST /api/admin/finance/recurring/{id}/pay → Eksekusi 1-klik pembayaran tagihan rutin langsung masuk ke Expense buku kas
  GET/POST/DELETE /api/admin/finance/closing → Prosedur audit-safe tutup buku bulanan, penguncian mutasi kas permanen & reopen approval
  GET/POST /api/admin/finance/tax      → Lembar kerja rekapitulasi PPh Final UMKM 0,5% 12 bulan (PP 55/2022) & pencatatan nomor NTPN resmi


PUBLIC:
  GET  /api/public/music               → Pustaka musik sistem aktif untuk pemilih lagu klien (auto-seed fallback)

RECEPTIONIST (public + PIN-protected di client side):
  POST /api/receptionist/verify-pin   → Verifikasi PIN panitia (AES-256-GCM 32-byte key) & penerbitan token sesi HMAC
  GET  /api/receptionist/guests       → List tamu untuk scanner offline-first
  POST /api/receptionist/scan         → Tandai tamu hadir (validasi token sesi panitia, idempotent offline queue flush dengan alreadyRedeemed: true & success: true)
  StaffLockScreen & ReceptionistClient:
    - Context & Hook: StaffAuthContext & useStaffAuth()
    - Mekanisme Kunci Layar / Logout: Revokasi token staff_auth_token_${id} di localStorage, transisi instan ke layar PIN Akses Terkunci, peringatan keamanan antrean offline.
    - Check-in Card: Menampilkan Nomor Meja (Focal Card) dan kuota Pax secara presisi saat check-in berhasil maupun duplikat.
    - Clean Professional Navbar: BrandLogo terpusat bersama nama platform di sisi kiri, judul "RECEPTIONIST SYSTEM" berada di posisi tengah persis, dan aksi sisi kanan menggunakan tombol ikon SVG minimalis (indikator online hijau bulat, tombol fullscreen ikon, tombol kunci sesi ikon).
    - Minimalist Scanner UI: Judul pemindai ringkas ("SCAN" & "KAMERA LIVE"), kartu statistik kehadiran disembunyikan agar perhatian fokus pada proses check-in, dan daftar tamu diringkas menjadi tombol kecil dropdown di dalam kartu tanpa badge count yang mengganggu.
    - Multi-Device Camera Engine: Mendukung laptop webcam dan tablet (iPad/Android) dengan auto-deteksi device, tombol Balik Kamera (depan/belakang), overlay laser scanline animasi, chime audio Web Audio API, serta anti-double scan cooldown (3s).
    - Unified Card Control: Menggantikan tab 50/50 kaku dengan single dynamic switcher button yang mulus berganti status tanpa DOM unmount.
    - Fullscreen Kiosk Mode & Color Scheme Isolation: Tombol Layar Penuh terintegrasi di navbar header (HTML5 Fullscreen API dengan event tracking) serta penguncian colorScheme: 'light' untuk menjamin warna antarmuka 100% konsisten terlepas dari tema Dark/Light bawaan perangkat.

PAYMENT & WEBHOOKS (Gateway 2-Arah Terintegrasi):
  POST /api/orders/create             → Buat pesanan baru
  POST /api/payments/checkout         → Proses pembayaran
  GET  /api/payments/status-stream/{id} → SSE status pembayaran
  POST /api/webhook/midtrans          → Webhook Midtrans (2-arah)
  POST /api/webhook/xendit            → Webhook Xendit (2-arah)

STATUS WARISAN / DEPRECATED:
  - /api/webhook/ipaymu            → 🗑️ Dihapus (Gateway 1-arah tidak didukung)
  - /api/webhook/duitku            → 🗑️ Dihapus (Gateway 1-arah tidak didukung)
  - /api/webhook/tripay            → 🗑️ Dihapus (Gateway 1-arah tidak didukung)
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
  Admin          → Akun admin terpisah dari User (role: SUPER_ADMIN | ADMIN | FINANCE | SUPPORT)
  Order          → Pesanan paket undangan & perpanjangan galeri
  Invitation     → Inti undangan (DRAFT | PUBLISHED | EVENT_FINISHED | TAKEN_DOWN | ARCHIVED)
  Guest          → Daftar tamu per undangan (phone, waStatus: PENDING | SENT, qrToken)
  Rsvp           → Konfirmasi kehadiran & untaian doa ucapan tamu (Single Source of Truth di kolom message)
  GuestMemory    → Foto candid tamu (hari H & pasca-acara)
  InvitationMedia → File media undangan (9 slot media: LANDING_COVER, LANDING_COVER_DESKTOP, HOME_PHOTO, DESKTOP_SIDEBAR, GLOBAL_FIXED_BG, GROOM_PHOTO, BRIDE_PHOTO, GALLERY, CLOSING_COVER)
  AdminSetting   → Konfigurasi platform global (key-value dinamis)
  WebhookLog     → Log audit webhook payment (Midtrans, Xendit)
  AdminAuditLog  → Log audit aktivitas admin
  MusicPreset    → Pustaka musik sistem dinamis (id, title, composer, genre, url, durationSec, isActive, sortOrder)
  Expense        → Buku kas mutasi pengeluaran operasional (title, category, amount, expenseDate, paymentSource, referenceNumber, receiptUrl, isLocked)
  RecurringExpense → Tagihan komitmen berkala bulanan (name, category, estimatedAmount, dueDayOfMonth, vendorName, isActive)
  FinancialClosing → Snapshot tutup buku permanen (periodMonth, periodYear, grossRevenue, totalExpenses, netProfit, taxAmount, taxPaid, closedAt, isLocked)
  PartnerAffiliate → Mitra afiliasi & komisi (name, commissionType, commissionValue, pendingBalance, totalPaidOut, isActive)
  PromoCoupon    → Kupon diskon & promo (code, discountType, discountValue, quotaLimit, usageCount, perUserLimit, applicablePlans, validUntil, isActive)
  PromoHold      → Alokasi kupon checkout sementara (promoCode, orderId, userId, status, discountAmount, expiresAt)
  AffiliateCommission → Riwayat komisi afiliasi pesanan (partnerId, orderId, orderAmount, commissionAmount, status, payoutExpenseId)
  ExpenseCategory (Enum) → INFRASTRUCTURE | UTILITIES | MARKETING | SOFTWARE_LICENSES | OPERATIONAL | OTHER

Field Kritis di Order:
  orderType       NEW | UPGRADE | GALLERY_EXTENSION | MEMORIES_TOPUP
  gatewayId       String?   ← "midtrans" | "xendit" (Gateway 2-Arah)
  gatewayTxId     String?   ← ID transaksi di sisi gateway (untuk cancel API saat switch gateway)
  linkedOrderId   String?   ← Referensi ID order lama (saat UPGRADE) atau ID invitation (saat GALLERY_EXTENSION / CUSTOM_DOMAIN)
  requestedDomain String?   ← Nama domain yang direquest oleh klien saat memesan add-on Custom Domain
  itemsJson       String?   ← JSON array rincian layanan multi-item (UPGRADE, GALLERY_EXTENSION, MEMORIES_TOPUP) pada tagihan terpadu
  checkoutConfirmedAt DateTime? ← Timestamp konfirmasi checkout klien untuk validasi proteksi anti-bounce di /payment

Field Kritis di Invitation:
  invitationSlug  @unique   ← Flat slug canonical: dimas-clarissa-030326
  subdomain       @unique   ← Subdomain: dimas-clarissa (nullable saat di-recycle)
  customDomain    @unique   ← Custom domain klien (nullable, fitur & UI aktif)
  groomFather     String?   ← Nama Ayah Mempelai Pria (terpisah)
  groomMother     String?   ← Nama Ibu Mempelai Pria (terpisah)
  brideFather     String?   ← Nama Ayah Mempelai Wanita (terpisah)
  brideMother     String?   ← Nama Ibu Mempelai Wanita (terpisah)
  groomParents    String?   ← String warisan / fallback otomatis
  brideParents    String?   ← String warisan / fallback otomatis
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
| `lib/driveHelper.ts` | ✅ Diperbarui | Dirombak total menggunakan Google Drive API v3 resmi (`GOOGLE_API_KEY`) dengan fitur auto-detect subfolder cerdas (otomatis menelusuri subfolder seperti '1. Galeri Sellected' jika folder induk tidak memiliki file foto langsung). |
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
- `public/uploads/dummy/*.jpg` & `public/uploads/themes-builder/example-assets/*.jpg` — 26 file mentah JPG (~237 MB) dihapus karena sistem murni menggunakan format `.webp`
- `public/assets/ornaments/*.zip` — 3 file arsip mentah grafis (~31.6 MB) dibersihkan dari disk lokal
- `ChatGPT Image Sep 9, 2026, 05_58_23 PM.png` — Screenshot referensi mockup AI di root dihapus (~1.8 MB)
- `public/assets/thumbnile/` — Direktori kosong akibat salah ketik (*typo*) dihapus
- `scratch/test_all_toggles.ts` — Skrip tes sakelar ad-hoc lama dihapus
- `AUDIT_REPORT.md` & `Luxvite_Landing_Page_Redesign_Spec.md` — Dipindahkan rapi ke `docs/archive/` agar folder root bersih

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
  a. Update docs/SYSTEM_ARCHITECTURE.md jika mengubah arsitektur
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
❌ DILARANG: Menggunakan emoji di elemen UI profesional (navbar, card, badge) atau simbol panah AI (seperti ↗) di tombol aksi undangan (Maps, Streaming, Filter), badge, tabel admin, dan showroom katalog
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
import { getInvitationPublicUrl, resolveEffectiveInvitationUrl } from "@/lib/domainUtils";

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

// Canonical URL (permanen, by invitationSlug flat path — single source of truth):
// https://luxenary.id/{invitationSlug}
// File disimpan di: public/published/ids/{invitationId}.html
// Catatan: getPermanentPathUrl() telah dihapus (dead code, format URL lama).
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
1. docs/SYSTEM_ARCHITECTURE.md (dokumen ini)   → Paham big picture
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

Seluruh modul pembayaran (_Payment Gateways_ 2-arah: Midtrans dan Xendit) secara otomatis membaca _prefix_ tagihan dari _dashboard_ Admin (`payment_invoice_prefix`). Jika kosong, sistem otomatis mundur (*fallback*) menjadi teks generik "Tagihan Pembayaran". Ini menjamin tidak adanya jejak _brand_ awal pada tagihan QRIS / _Virtual Account_ pelanggan.

## 11.4 - Arsitektur Pemrosesan Video Loop & Media Engine

Sistem mendukung video loop bergerak (*ambient video*) pada 3 slot visual utama: **`LANDING_COVER`** (Opening Pop-up), **`DESKTOP_SIDEBAR`** (Hero Desktop 70% kiri), dan **`GLOBAL_FIXED_BG`** (Latar Belakang Kartu Undangan).

### 1. Pipeline Konversi & Optimalisasi Server (`videoOptimizer.ts`)
- **Engine:** FFmpeg (`libx264`, preset `fast`, CRF 26, YUV420p).
- **Auto-Trim Durasi:** Maksimal 20 detik pertama (`-t 20`). Video di atas 20 detik otomatis dipotong di server.
- **True Seamless Crossfade Looping (Zero-Jump Loop):** Sistem mendeteksi durasi video via `ffprobe` dan menerapkan filter `xfade` (durasi 0.6s–1.2s) yang memadukan ekor video dengan kepala video secara transparan. Frame akhir dan frame awal dibuat 100% identik, sehingga ketika atribut HTML5 `loop` browser mereset ke detik ke-0, transisi berputar mengalir mulus tanpa patahan atau lompatan visual (jump cut).
- **Silent Loop Optimization & Kepatuhan Autoplay:** Menghapus seluruh track audio (`-an`) untuk menghemat kapasitas ~20% dan memastikan kepatuhan mutlak terhadap kebijakan *mobile browser autoplay* (iOS Safari & Android Chrome mewajibkan video berstatus `muted` agar bisa autoplay).
- **FPS Capping:** Dibatasi maksimal 30 fps (`-r 30`) untuk menjaga efisiensi rendering GPU/CPU perangkat tamu.
- **Streaming Instan:** Flag `+faststart` menempatkan moov atom di awal file MP4 sehingga video langsung berputar sebelum unduhan tuntas.

### 2. Validasi & Proteksi Ukuran File (2 Lapis)
- **Frontend:** Validasi instan sebelum pengiriman file (Maks. 30MB untuk video, Maks. 15MB untuk foto, format `.mp4`, `.mov`, `.webm`).
- **Backend API (`/api/client/upload`):** Proteksi HTTP 400 Bad Request jika ukuran file melebihi 30MB (video) atau 15MB (foto).

### 3. Rendering Engine Dinamis (`renderTemplate.ts`)
- `renderTemplateFile` secara cerdas mendeteksi tipe media melalui ekstensi URL (kebal query timestamp).
- **Isolasi Split Screen Desktop:** Pada layar desktop (>= 900px), video background global (`GLOBAL_FIXED_BG`) dikunci secara ketat pada kolom panel undangan kanan (`left: 55%; width: 45%;`), sehingga tidak bocor ke bawah hero kiri (`.left-hero`). Hero kiri tetap murni menampilkan medianya sendiri (`DESKTOP_SIDEBAR`).
- **Pencahayaan Soft Scrim:** Menggunakan rasio gradien transparan seimbang (puncak 0.55, tengah 0.38, dasar 0.70) sehingga video prewedding tetap hidup dan dinamis namun teks kutipan, doa, dan tipografi di atasnya memiliki kontras tinggi yang mudah dibaca.
- Jika berformat video (`.mp4`, `.webm`, `.mov`), template tema otomatis menyuntikkan elemen HTML5 `<video class="..." autoplay loop muted playsinline webkit-playsinline>` dengan `object-fit: cover` dan `object-position: center center`.
- Jika berformat gambar, tetap mempertahankan CSS `background-image` standar tanpa regresi.

## 11.5 - Arsitektur Seksi Home Mandiri & Eliminasi Gap Bawah Footer (Container Flush Alignment)

### 1. Isolasi Latar Belakang Seksi Home (`HOME_PHOTO`)
- **Independensi Seksi:** Slot `HOME_PHOTO` ("Latar Belakang Home (Opsional)") diinjeksi secara langsung dan adaptif ke elemen `.slide-opening#home, section#home, .sec-hero-slideshow#home` lengkap dengan *scrim gradient* pelindung tipografi.
- **Fallback Cerdas:** Jika klien tidak mengunggah foto home, seksi Home tetap transparan memperlihatkan latar belakang fixed global (`GLOBAL_FIXED_BG` baik video loop maupun foto) sesuai spesifikasi tema.
- **Pemisahan Layer:** `.fixed-bg-layer` dikembalikan secara murni ke `globalBgUrl` untuk latar belakang kartu undangan, terpisah dari latar pembuka seksi Home.

### 2. Eliminasi Celah Bawah Footer (*Flush to Bottom*) & Standarisasi Kanvas Transparan
- **Pemberantasan Gap 90px / 110px:** Redundant `padding-bottom` pada `.right-panel` dan `.main-scroll-panel` dinetralkan secara global via `public/css/modules.css` dan `lib/renderTemplate.ts` (`padding-bottom: 0 !important;`).
- **Footer 100vh Sempurna:** Footer penutup (`.site-footer` / `.closing-sec`) kini duduk pas (*flush*) menyentuh dasar layar tanpa celah bocor yang memperlihatkan layer video di baliknya.
- **Standarisasi Zero-Background & Zero-Scrim pada Footer (`no-closing-photo`):** Ketika klien tidak mengunggah foto penutup, seksi footer diwajibkan 100% transparan (`background: transparent; border-top: none;`) tanpa scrim layer `::before`. Hal ini menjamin kanvas warna dasar tema dan motif tekstur (tenun Bugis, floral, dsb.) mengalir menyatu hingga ujung bawah layar (*Infinite Seamless Flow*) tanpa terpotong oleh balok warna solid. Scrim overlay dan background image hanya aktif secara adaptif saat klien mengunggah foto penutup (`has-closing-photo`).
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

### 4. Arsitektur Pemisahan Orang Tua & Deteksi Otomatis Relasi (Zero-Dropdown)
- **Pemisahan 4 Kolom Terstruktur:**
  - `groomFather` & `groomMother` (Ayah & Ibu Mempelai Pria)
  - `brideFather` & `brideMother` (Ayah & Ibu Mempelai Wanita)
- **Deteksi Relasi Otomatis (Zero-Hardcode & Zero-Dropdown):**
  - Groom secara otomatis mendapat awalan `"Putra dari"`.
  - Bride secara otomatis mendapat awalan `"Putri dari"`.
  - Mengeliminasi kebutuhan dropdown urutan anak ("anak ke-1", "anak bungsu", dsb) yang rentan typo dan memperlambat onboarding user.
- **Format Rendering Bersih & Anti-Orphan:**
  - `candani.html` dkk menyusunnya dalam struktur vertikal terorganisir:
    ```html
    <div class="couple-parents" data-lux-field="groomParents">
      <span class="parent-prefix">{{firstParentPrefix}}</span>
      <span class="parent-father">{{firstFather}}</span>
      <span class="parent-mother">{{firstMother}}</span>
    </div>
    ```
  - Menjamin nama orang tua dan gelar kehormatan tersusun murni dan natural secara vertikal tanpa simbol `&` liar di awal baris nama ibu (*zero awkward orphan symbols*).
- **Murni String Bebas & Otonomi Sapaan Klien (Pure Raw String Input):**
  - Sistem tidak menyisipkan atau memaksakan prefix sapaan seperti `"Bpk."` atau `"Ibu"` pada nama orang tua.
  - Klien memiliki kebebasan penuh menuliskan gelar akademik/adat, sapaan penghormatan, status almarhum/almarhumah (misal: `"Alm."`, `"Almh."`, `"†"`), atau nama langsung tanpa manipulasi otomatis string.
- **Kompatibilitas Penuh Warisan (Backward Compatibility):**
  - Kolom gabungan `groomParents` dan `brideParents` tetap dipertahankan.
  - `lib/themeEngine.ts` otomatis merakit `firstParents` & `secondParents` jika kolom terpisah digunakan, atau sebaliknya otomatis mem-parse string gabungan warisan jika klien lama belum mengisi kolom terpisah.

---

## 15. ORKESTRASI MULTI-PAYMENT GATEWAY & DYNAMIC FEE

**Files:** `lib/gateways/`, `lib/gatewayRegistry.ts`, `app/api/payments/checkout/route.ts`, `app/checkout/page.tsx`

Sistem pembayaran platform mendukung multi-gateway terintegrasi dengan pergantian instan 1-klik dari dashboard Admin tanpa memerlukan restart aplikasi atau edit kode.

### 15.1 — Arsitektur Registry Gateway 2-Arah (Two-Way Handshake)
```
Admin Setting: active_payment_gateway
           │
           ├── "midtrans" → lib/gateways/midtrans.ts (Core API QRIS / Snap UI)
           └── "xendit"   → lib/gateways/xendit.ts (Invoice API)
```
*Catatan Arsitektur:* Seluruh gateway 1-arah (iPaymu, Duitku, Tripay) telah dihapus dari sistem karena ketiadaan API pembatalan (`cancel/expire`) publik pada jaringan perbankan. Pada gateway 1-arah, pembatalan lokal di aplikasi meninggalkan QRIS/VA tetap aktif di switch switching, memicu risiko fatal *ghost payment* (klien membayar ke tagihan usang). Sistem Luxenary mewajibkan komunikasi 2-arah penuh: Midtrans (`/v2/{orderId}/cancel`) dan Xendit (`/v2/invoices/{invoiceId}/expire`).

### 15.2 — Kondisi Pembayaran & Sinkronisasi Gateway 2-Arah (*Two-Way Payment Handshake*)
Sistem mendukung alur pembayaran terintegrasi dengan gateway 2-arah eksklusif (**Midtrans Core API QRIS** dan **Xendit Invoices**), didukung transfer bank manual:
1. **Registrasi Paket Awal (`orderType: NEW`) & Upgrade Tier (`orderType: UPGRADE`):**
   - Pembayaran aktivasi lisensi paket undangan (`TIER_1` / Serenade, `TIER_2` / Symphony, `TIER_3` / Eternity) atau kenaikan tier dengan nominal selisih harga dinamis dari `AdminSetting`.
   - Pada tier `TIER_3` (Eternity), fitur Custom Domain sudah **termasuk bebas biaya (gratis)** tanpa biaya integrasi tambahan.
   - Setelah pelunasan, tier diperbarui seketika dan klien diarahkan ke Studio/Dashboard (`/dashboard?msg=plan_upgraded`).
2. **Perpanjangan Galeri Tamu (`orderType: GALLERY_EXTENSION`):**
   - Menambahkan masa simpan foto tamu (+1 s.d. 12 bulan) ke `invitation.galleryExpiresAt` dan membuka kembali kunci unggah momen foto tamu (`memoriesUploadLocked: false`).
   - Dikelola dari kartu operasional galeri atau modal layanan tambahan di Dashboard klien, dialihkan ke `/checkout` atau kasir bundle, dan setelah lunas dialihkan ke `/dashboard?msg=gallery_extended`.
3. **Top-Up Kuota Foto Momen Tamu (`orderType: MEMORIES_TOPUP` / Bundle):**
   - Menambah plafon kuota foto candid tamu (kelipatan 100 foto) yang disimpan di `extraMemoriesQuota`.
4. **Fitur Custom Domain (Inklusif Bebas Biaya):**
   - Custom domain bukan merupakan add-on berbayar, melainkan fitur inklusif bawaan untuk paket yang memenuhi syarat (TIER_3). Klien dapat langsung mendaftarkan atau memutuskan domain mandiri melalui `/dashboard/settings` (`POST /api/client/custom-domain`) tanpa melalui kasir/order. Saklar master platform dikontrol admin via `custom_domain_enabled`.

### 15.2.1 — Transmisi Data Lengkap ke Payment Gateway (Rich Payload Delivery)
Setiap inisialisasi tagihan ke payment gateway (Midtrans & Xendit) mengirimkan informasi komprehensif untuk pelacakan keuangan, notifikasi multi-kanal, dan audit perbankan:
- **Profil Pembeli Lengkap (`customer_details` / `customer`):**
  - Nama depan (`first_name` / `given_names`) dan nama belakang (`last_name` / `surname`) yang diekstrak dari profil akun Google atau konfirmasi klien di `/checkout`.
  - Alamat email terverifikasi (`email`).
  - Nomor telepon seluler aktif klien (`phone` / `mobile_number` dari `user.phoneNumber`, diformat standar E.164/lokal).
  - Alamat penagihan & pengiriman digital (`billing_address`, `shipping_address`, dan `addresses` array): mencakup alamat surat-menyurat fisik jika tercantum pada undangan atau alamat layanan default berstandar ISO `IDN`.
- **Preferensi Notifikasi Multi-Kanal (`customer_notification_preference`):**
  - Xendit: Jika nomor WhatsApp/ponsel tersedia, invoice mengirimkan notifikasi otomatis via `["whatsapp", "sms", "email"]` saat invoice diterbitkan, diingatkan, dibayar, atau kedaluwarsa.
- **Rincian Item Kontekstual & Branding (`item_details` / `items`):**
  - Mengirimkan deskripsi item yang presisi sesuai kondisi transaksi dengan atribut `brand`, `category`, dan `merchant_name` dinamis dari konfigurasi `AdminSetting`:
    - *Paket Undangan Digital - [Tier]* (Kategori: *Paket Undangan*)
    - *Upgrade: [Tier Asal] ke [Tier Tujuan]* (Kategori: *Upgrade Paket*)
    - *Perpanjangan Masa Aktif (+30 Hari)* (Kategori: *Add-on Masa Aktif*)
    - *Jasa Integrasi Domain: [Domain Kustom]* (Kategori: *Add-on Domain*)
  - Rincian biaya layanan gateway (`ADMIN_FEE`) terpisah dan transparan dengan jumlah matematis presisi (`gross_amount === sum(item.price * item.quantity)`).
- **Metadata Pelacakan Dua Arah:**
  - **Midtrans:**
    - `custom_field1` = Nomor Invoice resmi (`INV-LUX-...`).
    - `custom_field2` = Tipe Pesanan & Nama Lengkap (`orderType | customerFullName`).
    - `custom_field3` = Detail kontekstual transaksi (`Domain: ...`, `Upgrade: ...`, atau `Paket: ...`).
  - **Xendit:**
    - `metadata` objek kaya berisi `orderId`, `invoiceNumber`, `orderType`, `planType`, `targetPlanType`, `upgradedFromPlan`, `requestedDomain`, `customerFullName`, `customerEmail`, `customerPhone`, `invitationSlug`, `coupleName`, dan `platformName`.

### 15.2.2 — Pembatalan Resmi Dua Arah (*Two-Way Cancellation Handshake*)
- Saat order dibuat, sistem menyimpan `gatewayId` dan `gatewayTxId` pada record `Order`.
- Jika klien membatalkan tagihan (`handleCancelOrder`), mengganti paket, atau waktu pembayaran kedaluwarsa, API secara otomatis memanggil handler `cancel()` ke gateway aktif:
  - **Midtrans:** Memanggil `POST /v2/{orderId}/cancel` langsung ke Core API Midtrans sehingga transaksi di switch perbankan langsung void/hangus.
  - **Xendit:** Memanggil `POST /v2/invoices/{invoiceId}/expire` sehingga invoice Xendit langsung ditutup permanen.
- **Proteksi Pembatalan Transaksi Terbayar:** Jika gateway melaporkan bahwa transaksi telah lunas (*settlement/paid*), API pembatalan menolak pembatalan untuk mencegah penimpaan status lunas.

### 15.3 — Perhitungan Biaya Layanan Dinamis (Zero Hardcode)
- **Penanggung Biaya (`payment_fee_payer` / `payment_gateway_fee_payer`):**
  - `"BUYER"`: Biaya layanan ditambahkan ke total yang harus dibayar klien.
  - `"MERCHANT"`: Biaya layanan ditanggung oleh platform (klien hanya membayar harga paket).
- **Tarif Persentase (`payment_gateway_fee_percent`):**
  - Nilai desimal persentase (misal `0.7%`).
  - `appFee = feePayer === "BUYER" ? Math.round(subtotal * (feePercent / 100)) : 0`.
  - `totalAmount = subtotal + appFee`.
  - Perhitungan dilakukan pada tingkat checkout dengan idempotensi penuh agar reload halaman tidak melipatgandakan biaya.

### 15.4 — Batas Waktu Pembayaran Dinamis & Native In-App QRIS
- Durasi aktif sesi QRIS dibaca langsung dari `payment_expiry_minutes` (default: 60 menit) dan dikirimkan ke payload gateway.
- **Midtrans Native In-App QRIS & Smart Fallback:**
  - Integrasi Midtrans mengutamakan Core API (`POST /v2/charge` dengan `payment_type: "qris"` dan `item_details` lengkap) untuk menghasilkan string QRIS EMVCo langsung di antarmuka checkout tanpa membuang pembeli ke halaman eksternal Snap.
  - Jika akun Live merchant belum mengaktifkan channel Core API QRIS, sistem secara mulus (*graceful fallback*) beralih ke URL Snap hosted invoice.
  - Memiliki *auto-swap guard* pada `midtrans_server_key` dan `midtrans_client_key` (mendukung prefix `Mid-` maupun `SB-Mid-`) untuk mencegah kesalahan input kredensial pada Admin Setting.
- **Idempotency & Session Reuse Guard (`/api/payments/checkout`):**
  - Jika sebuah order berstatus `PENDING` telah memiliki sesi QRIS aktif yang belum kedaluwarsa pada gateway yang sama, API langsung mengembalikan sesi yang ada tanpa melakukan re-init atau memanggil API gateway berulang kali. Hal ini mencegah error duplikasi `order_id has already been taken`.
- **Zero External Redirection (In-App Payment Modal):**
  - Jika gateway mengembalikan `checkoutUrl` (seperti Snap fallback atau Xendit), sistem tidak lagi melakukan navigasi jendela browser keluar (`window.location.href`).
  - Halaman kasir merender **In-App Modal Iframe** berbalut backdrop *dark luxury* dengan tombol penutup aman. Pengguna tetap berada di domain platform, sementara listener SSE di background terus memantau webhook transaksi hingga status berubah menjadi `PAID`.

### 15.5 — Kebijakan Tagihan Tunggal & Proteksi Tagihan Usang (Single State Architecture)
- **Satu Klien = Satu Tagihan Aktif per Tipe Layanan:**
  - Klien yang bolak-balik mengubah paket (`/packages`) sebelum pembayaran lunas tidak akan melipatgandakan baris transaksi di database.
  - Endpoint `POST /api/orders/create` secara otomatis mencari order dengan status `PENDING` atau `FAILED` (yang ditolak), lalu melakukan *reuse/update* pada baris yang sama.
- **Persistent URL State & QRIS Hydration Across Refreshes:**
  - Kasir checkout (`app/checkout/page.tsx`) selalu mengikat parameter `?order=${orderId}` pada browser URL via `window.history.replaceState`.
  - Seluruh order tersimpan permanen di PostgreSQL (`orders` table). Pada saat refresh halaman (F5), status order dan `snapToken` (string QRIS dan masa berlaku) dihidrasi kembali secara instan dari database tanpa kehilangan sesi QRIS atau mereset antarmuka kasir.
- **Onboarding Guard pada Halaman Pemilihan Paket (`/packages`):**
  - Halaman `/packages` (`app/packages/page.tsx`) memvalidasi status onboarding via `/api/client/onboarding-state`.
  - Jika klien memiliki tagihan aktif berstatus `PENDING`, akses ke `/packages` seketika dicegat dan dialihkan kembali ke kasir aktif (`/checkout?order=${orderId}`). Hal ini mencegah klien keluar jalur dan membatalkan pesanan gateway secara tidak sengaja.
- **Penyimpanan Murni Database Produksi:**
  - Seluruh pengguna, order, dan sesi gateway disimpan langsung ke dalam tabel database PostgreSQL produksi (`orders`, `users`, `invitations`) dengan indexing optimal, tanpa flag simulasi buatan.
  - Ringkasan pesanan (*summary*), nomor invoice, snapshot nominal, dan snapToken dibaca langsung dari database PostgreSQL, menjamin performa cepat dan konsistensi data 100%.
- **Ketepatan Single State Guard (`isUserPaid`):**
  - Evaluasi `isUserPaid` dikunci secara presisi **hanya untuk order pendaftaran awal (`NEW`)**.
  - Klien yang telah memiliki undangan lunas diizinkan secara bebas untuk memesan upgrade atau add-on (`UPGRADE`, `GALLERY_EXTENSION`, dan `MEMORIES_TOPUP`) tanpa terkunci atau terlempar ke form setup undangan.
- **Proteksi Tagihan Usang (*Superseded Order Guard*):**
  - Jika klien membuka tautan riwayat/bookmark invoice lama (`?order=OLD_ID`) padahal sudah memiliki tagihan baru dengan `orderType` yang sama:
    - API `GET /api/client/orders/[id]/status` mendeteksi `isSuperseded: true` dan menyertakan `activeOrderId`.
    - Kasir [`app/checkout/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/checkout/page.tsx) otomatis melakukan *instant redirection* ke tagihan aktif terbaru (`/checkout?order=NEW_ID`).
  - Endpoint `POST /api/client/orders/[id]/upload-proof` memblokir keras upaya pengunggahan bukti bayar pada order usang yang telah digantikan oleh order baru.

### 15.6 — Alur Transfer Bank Manual & Pengiriman Cloudflare R2
- **Zero Hardcoded Fallback:** Data rekening bank (`bank_name`, `bank_account_number`, `bank_account_holder`) 100% dinamis dari tabel `admin_settings`. Tidak ada nilai dummy/fallback palsu di input formulir.
- **Penyimpanan Gambar Berkecepatan Tinggi (Cloudflare R2 + Edge CDN):**
  - Struk bukti transfer dikompresi menjadi WebP tajam (1400px, 82%) dan diunggah ke Cloudflare R2 bucket.
  - Gambar disajikan melalui **Custom Domain Edge CDN** (`https://cdn.luxvite.id`) menggunakan HTTP/2 dan Anycast PoP terdekat (Jakarta/Singapura), memangkas waktu muat gambar dari ~24 detik menjadi <200 milidetik.
- **Verifikasi Manual Terpadu:**
  - Pengunggahan bukti transfer otomatis mencatat status order dan menunggu persetujuan admin.
  - Persetujuan admin di portal `/admin` seketika mengubah status menjadi `PAID` dan mengeksekusi `applyUpgradePlan` untuk mengaktifkan paket/add-on secara instan.

### 15.7 — Identitas Publik & Proteksi Hak Cipta Statis (Luxenary Public Identity Banner & DevTools Guard)
- **Banner ASCII & Lisensi Eksklusif:** Setiap dokumen publik (Root Layout [`app/layout.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/layout.tsx), 16 master template [`themes/`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/themes), serta seluruh kompilasi demo statis [`public/demo/`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/public/demo)) dilengkapi komentar lisensi resmi di baris pertama dokumen.
- **Isolasi Brand & Dynamic Domain Penuh (Zero-Hardcode Whitelabel):** Seluruh antarmuka publik, modul tamu (Guest Moments, Receptionist Scanner), layout metadata, gateway invoice, dan fitur paket tidak lagi menggunakan nilai hardcode. Nama platform dan domain aktif diselesaikan secara dinamis melalui `admin_settings.platform_name` dan environment `NEXT_PUBLIC_ROOT_DOMAIN` / request host. Penamaan paket antar-tier juga diresolusi dinamis sehingga perubahan nama tier di panel admin seketika tersinkronisasi ke seluruh deskripsi fitur.
- **Pipeline Kompilasi Otomatis:** Engine [`lib/renderTemplate.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/renderTemplate.ts) dan [`lib/staticPublisher.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/staticPublisher.ts) menjamin setiap undangan yang dibake saat publish (`public/published/ids/[id].html`) maupun diakses di subdomain/custom domain secara otomatis menyertakan banner identitas dan skrip proteksi konsol sebelum tag `</body>`.
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
  - **Single State Checkout Guard (`isUserPaid`):** Klien yang sudah lunas dicegat dari membuka kasir checkout paket baru dan seketika dialihkan ke Dashboard/Setup Undangan.
  - **Zero Visual Leak Dashboard Guard (`isAuthorized` State Gate):**
    - Layout dasbor klien (`app/(client)/dashboard/layout.tsx`) menerapkan *blocking gate state* (`isAuthorized`).
    - Sebelum API `onboarding-state` mengonfirmasi bahwa klien telah memiliki order lunas (`hasPaidOrder === true`), elemen `<header>` navigasi, menu, dan isi halaman tidak di-render ke DOM (hanya menampilkan preloader netral).
    - Jika klien belum lunas atau masih berstatus pending, sistem langsung mengalihkan rute ke kasir (`/checkout?order=...`) tanpa pernah menampilkan kilatan antarmuka dasbor (*Zero Visual Leak / Zero FOUC*).
    - Rute `/login` pada `middleware.ts` mengalihkan klien aktif ke `/onboarding` (bukan langsung ke `/dashboard`), sehingga status pesanan dievaluasi secara aman sebelum menyentuh dasbor.
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

### 15.10 — Arsitektur Kredensial Tunggal Terpadu & Resolusi Endpoint Otomatis
- **Kredensial Tunggal Terpadu (Single Unified Credentials):**
  - Gateway pembayaran (Midtrans dan Xendit) menggunakan set kredensial tunggal yang dikonfigurasi langsung di Portal Admin (`midtrans_server_key`, `midtrans_client_key`, `xendit_api_key`, `xendit_webhook_token`) tanpa pembagian mode atau form input duplikat.
- **Resolusi Endpoint Otomatis Berdasarkan Prefix Kunci (Midtrans Auto-Detection):**
  - Midtrans Gateway secara cerdas mendeteksi environment target langsung dari format server key yang dimasukkan:
    - Jika key diawali prefix `SB-` (kunci resmi Midtrans Sandbox, misal `SB-Mid-server-...`), gateway otomatis mengarahkan panggilan transaksi ke server simulator Midtrans (`api.sandbox.midtrans.com` dan `app.sandbox.midtrans.com`).
    - Jika key diawali prefix standar produksi (misal `Mid-server-...`), gateway otomatis mengarahkan panggilan transaksi ke server produksi live (`api.midtrans.com` dan `app.midtrans.com`).
  - Menghilangkan kebutuhan toggle manual atau variabel environment tambahan, mencegah konflik kredensial secara mutlak.
- **Verifikasi Webhook Terpadu:**
  - Endpoint webhook (`/api/webhook/midtrans` dan `/api/webhook/xendit`) memverifikasi signature dan callback token terhadap kredensial aktif yang terdaftar di database.

### 15.11 — Rekonsiliasi Real-Time & Deteksi Host Dinamis
- **Deteksi Host & Protokol Dinamis (Zero Domain Hardcode):**
  - Sistem mendeteksi `appUrl` dan `rootDomain` secara dinamis dari request headers (`x-forwarded-host`, `host`, `x-forwarded-proto`) melalui modul terpadu `lib/serverDomainUtils.ts` (`getDynamicServerAppUrl()` dan `getDynamicServerRootDomain()`).
  - Digunakan secara menyeluruh di `app/layout.tsx` (Metadata & JSON-LD Schema.org), `app/sitemap.ts`, `app/robots.ts`, `app/terms/page.tsx`, `lib/settings.ts`, dan modul publishing, menjamin kompatibilitas native 100% otomatis di lingkungan pengembangan `localhost:3000`, IP lokal, tunnel, hingga production domain tanpa string hardcode.
  - Pada antarmuka klien browser, fungsi `getApexRootDomain()` (`lib/domainUtils.ts`) membaca `window.location.host` secara reaktif sehingga seluruh preview dan tautan subdomain (`*.localhost:3000` vs `*.luxvite.id`) tersaji akurat sesuai host aktif.
- **Rekonsiliasi Status Real-Time:**
  - Endpoint `GET /api/client/orders/[id]/status` melakukan verifikasi langsung ke gateway vendor (`gw.verify()`) saat status order masih `PENDING`.
  - Memastikan pengujian pembayaran di lingkungan pengembangan lokal (`localhost`) yang tidak dapat menerima webhook internet langsung terdeteksi seketika saat tombol "Cek Status Pembayaran" diklik atau melalui polling SSE, mengubah status menjadi `PAID` dan mengarahkan klien ke setup undangan.

### 15.12 — Clean SaaS UI Standard & Eliminasi Total Dialog Native Browser (Zero window.alert / window.confirm)
- **Zero Native Browser Dialogs & In-Button Micro Feedback:**
  - Seluruh pemanggilan `window.alert()` dan `window.confirm()` telah dieliminasi 100% dari seluruh codebase (Portal Admin, Dasbor Klien, Scanner Resepsionis, dan Tema Publik).
  - Digantikan dengan komponen dialog konfirmasi kustom modern berlatar belakang gelap transparan (*backdrop blur*), kartu bersudut membulat (*rounded-2xl*), ikon vektor SVG minimalis tanpa emoji OS kaku, serta feedback interaktif saat memproses.
  - **Prinsip Feedback Mandiri di Tombol (In-Button Feedback):** Aksi yang bersifat konfirmasi lokal atau salin tautan (misal "Salin Link", "Samakan Tema", simpan seksi) mempertahankan umpan balik langsung di dalam tombol itu sendiri (seperti label sementara *"✓ Tersalin!"*, *"✓ Tersimpan"*, atau indikator visual tersinkronisasi) tanpa memunculkan toast melayang yang berlebihan.
  - **Minimalist Floating Toast:** Floating toast (`fixed bottom-6 right-6 z-[80]`) dirancang ringkas (dot indicator 2px, backdrop-blur, tanpa dekorasi berlebihan) dan hanya dipicu untuk notifikasi sistem penting, error server/koneksi, atau konfirmasi tingkat halaman dengan timer auto-dismiss 4 detik.
- **Enhanced Multi-Layer Video Background Engine:**
  - `lib/renderTemplate.ts` kini mendukung injeksi video penuh `<video autoplay loop muted playsinline>` untuk seksi pembuka (`homePhotoUrl` → `.lux-home-video`) dan seksi penutup (`closingPhotoUrl` → `.lux-closing-video`), melengkapi slot latar sampul (`coverVideoHtml`), panel desktop split (`sidebarVideoHtml`), dan latar global (`fixedBgVideoHtml`).
  - Umpan balik RSVP dan formulir upload foto tamu pada tema undangan (`lib/themeEngine.ts`) kini menggunakan status box terintegrasi `#luxRsvpStatusBox` dan `#luxMemErrorBox` tanpa dialog popup browser.

### 15.13 — Unified Add-On & Upgrade Checkout Hub (Checkout Terpadu Multi-Layanan)
- **Konsep Arsitektur:**
  - Platform Luxenary menerapkan **2 Add-On Berbayar Murni**:
    1. **Perpanjangan Masa Simpan Galeri Tamu (`GALLERY_EXTENSION`):** Fleksibel per bulan (+1, +2, +3, +6, atau 12 bulan).
    2. **Top-Up Kuota Foto Momen Tamu (`MEMORIES_TOPUP`):** Penambahan plafon kapasitas foto candid tamu (kelipatan 100 foto).
  - *Catatan Penting Custom Domain:* Custom domain (`custom_domain`) merupakan **fitur bawaan paket inklusif** (khususnya tier Eternity) tanpa biaya jasa add-on terpisah.
  - Hub Checkout Terpadu memungkinkan klien menggabungkan upgrade tier paket akun (`UPGRADE`) bersama perpanjangan galeri dan top-up kuota foto ke dalam **1 invoice tunggal / 1 checkout terpadu**.
  - Mengeliminasi pembayaran berkali-kali, menghemat biaya admin/gateway bagi klien, dan menyederhanakan proses verifikasi transfer bank manual oleh Admin menjadi 1 kali klik persetujuan.
- **Skema Database & Snapshot Item Terstruktur:**
  - Kolom `itemsJson` (TEXT/JSON) pada tabel `orders` PostgreSQL menyimpan snapshot lengkap setiap item transaksi: tipe layanan (`type`: `UPGRADE`, `GALLERY_EXTENSION`, `MEMORIES_TOPUP`), label deskriptif (`label`), nominal satuan (`price`), target paket (`targetPlan`), jumlah bulan (`months`), jumlah hari (`days`), dan jumlah kuota foto (`photos`).
  - Nilai harga satuan ditarik secara dinamis dari `admin_settings` (`price_tier1`, `price_tier2`, `price_tier3`, `gallery_extension_price_per_month`, `addon_memories_topup_price`, `addon_memories_topup_photos`) tanpa nilai hardcode.
- **Eksekusi Pemenuhan Transaksi Atomik (`applyBundleFulfillment` di `lib/upgradeHelper.ts`):**
  - Seluruh pemenuhan multi-layanan dibungkus dalam transaksi atomik database (`prisma.$transaction`) dengan urutan eksekusi bergaransi:
    1. **Upgrade Tier:** Akun dan order registrasi induk dinaikkan terlebih dahulu ke tier target (Serenade ➔ Symphony/Eternity, atau Symphony ➔ Eternity).
    2. **Top-Up Kuota Foto:** Saldo kuota foto tambahan diakumulasikan ke `invitation.featureSettings.extraMemoriesQuota`. Plafon total foto dihitung secara adaptif: Total Plafon Foto = Kuota Dasar Paket + extraMemoriesQuota.
    3. **Perpanjangan Galeri Pasca-Acara:** Saldo hari perpanjangan galeri diakumulasikan ke `invitation.featureSettings.extraGalleryDays`. Jika undangan masih dalam status draft / persiapan sebelum tanggal resepsi, saldo hari disimpan utuh dan tanggal kedaluwarsa galeri (`galleryExpiresAt`) dihitung dari tanggal resepsi acara terbaru (`getLatestEventDate(invitation.eventData)` + retensi dasar paket + `extraGalleryDays`), menjamin masa aktif tidak hangus sebelum pernikahan berlangsung.
- **Visibilitas Kasir & Portal Admin:**
  - Kasir pembayaran klien (`/payment?order=...`) secara cerdas mendeteksi `order.itemsJson` dan merender tabel rincian transaksi terpadu berpalet *Dark Luxury* yang transparan sebelum instruksi QRIS/Transfer Bank.
  - Tab Transaksi Admin (`components/admin/AdminOrdersTab.tsx`) menampilkan badge `Tagihan Terpadu ({count} Item)` pada kolom item, serta menyediakan rincian komprehensif pada modal inspeksi bukti bayar dan ekspor streaming CSV.
  - Kartu Pengaturan Layanan Tambahan di Portal Admin difokuskan murni pada 2 Add-On: Tarif Perpanjangan Galeri Bulanan dan Top-Up Kuota Foto Tamu.

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

### 16.3 — Arsitektur Favicon & SEO Standar Google Search Central
Untuk memenuhi spesifikasi Google Search agar logo/favicon muncul pada SERP:
- **URL Favicon Statis & Stabil:** Menghapuskan seluruh query timestamp acak (`?t=Date.now()`) pada `app/layout.tsx` agar bot perayap Google Favicon dapat melakukan caching canonical yang stabil.
- **Standar Ukuran Kelipatan 48px:** Menyediakan aset favicon dalam kelipatan 48 piksel (`48x48`, `96x96`, `192x192`, `512x512`) serta Apple Touch Icon (`180x180`).
- **Integrasi App Router & Web App Manifest:** Mendukung `app/icon.png`, `app/apple-icon.png`, deklarasi multi-size di `app/manifest.ts`, serta perizinan akses bot di `app/robots.ts`.
- **Otomatisasi Upload Brand di Admin Setting (`/api/admin/upload-brand`):** Saat Admin mengunggah 1 master file favicon persegi di Portal Pengaturan, engine Sharp secara instan men-generate seluruh paket variasi Google Search (`48x48`, `96x96`, `192x192`, `512x512`, `apple-touch-icon.png`, `app/icon.png`, `app/apple-icon.png`, dan `public/favicon.ico`) tanpa perlu resize manual.

---

## 17. ARSITEKTUR INFRASTRUKTUR & DEPLOYMENT (VPS)

**File:** `deploy.sh`, `ecosystem.config.js`

Sistem Luxenary Invite dirancang sebagai aplikasi *self-hosted* yang berjalan pada mesin Virtual Private Server (VPS) Ubuntu/Linux mandiri.

### 17.1 — PM2 Daemon & Deployment Engine
- **Skrip Deployment Otomatis:** `deploy.sh` menangani pembersihan drift `package-lock.json` lintas arsitektur, pembaruan repositori git (`origin main`) dengan abort protection, penyiapan direktori runtime (`logs`, `public/uploads`, `data/drafts`), inisialisasi kunci rahasia (*secret generator*), sinkronisasi Prisma, *build* Next.js (dengan alokasi 2GB RAM), proses *restart* peladen PM2 zero-downtime, persistensi konfigurasi `pm2 save`, serta health-check verifikasi port 3001.
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
   - Mengelola **Integrasi Domain & DNS Server**, **Server Email (SMTP)**, **Batas Upload Media & Galeri** (Video Studio Klien hingga 100 MB via FFmpeg auto-compression, Foto Studio Klien, dan Foto Galeri Tamu Memories), dan **Siklus Hidup Subdomain & Retensi**.
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
     - `/`: `public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400` (Cache 24 jam via ISR `revalidate = 86400`, dengan on-demand auto-revalidation via `revalidatePath('/')` saat Admin memperbarui pengaturan harga/platform).
     - `/music/:path*`: `public, max-age=31536000, immutable` (Cache permanen 1 tahun di browser dan CDN karena aset musik bawaan tidak pernah berubah).
     - `/demo/:path*`: `public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800` (1 hari di browser, 7 hari di Edge Cloudflare CDN dengan background revalidation).
     - `/css/:path*`: `public, max-age=604800, stale-while-revalidate=86400` (Cache 7 hari untuk modul CSS sistem dengan background revalidasi).
     - `/assets/homepage/:path*`: `no-cache, must-revalidate` (Browser selalu revalidasi ke server via ETag sehingga aset hero/mockup homepage yang diperbarui langsung tersaji seketika tanpa terhalang cache statis).
     - `/assets/:path*`: `public, max-age=604800, stale-while-revalidate=86400` (Cache 7 hari untuk aset statis sistem seperti logo brand, favicon, dan icon vektor).
     - `/uploads/:path*`: `public, max-age=86400, stale-while-revalidate=86400` (Cache 1 hari untuk media draft dengan background revalidasi dan clean overwrite).
     - File baru yang diunggah dari Demo Studio maupun Client Dashboard disematkan query buster timestamp (`?t=...`) sehingga pembaruan aset tetap tampil seketika.
5. **Showroom Color Palette Selector & Per-Theme Default Palette:**
   - Tab Aset Visual & Audio di Demo Studio dilengkapi pemilih 6 palet warna resmi (`champagne`, `emerald`, `burgundy`, `sage`, `terracotta`, `monochrome`).
   - Admin dapat menetapkan palet resmi showroom per tema (misal Badrika $\rightarrow$ `emerald`, Candani $\rightarrow$ `terracotta`, Ameera $\rightarrow$ `burgundy`, Chronicle $\rightarrow$ `monochrome`).
   - Mesin kompilasi (`lib/demoPublisher.ts` & `lib/demoRegistry.ts`) mengevaluasi `defaultPalette` dinamis dan mengompilasi halaman statis `/demo/[theme]` dengan token warna yang presisi.
6. **Desktop Split Invitation Background Isolation (`.fixed-bg-layer`):**
   - Tema berformat split-desktop (seperti Badrika, Chronicle, Kalandra, Aurelia, Artisan, Lumina, Solaria) menggunakan elemen latar belakang terisolasi `.fixed-bg-layer` yang di-lock pada `width: 460px; left: calc(100% - 460px);`.
   - Menggantikan penempatan background langsung di elemen `body` (100vw) yang rawan tersembunyi di balik sidebar kiri desktop, serta menerapkan scrim overlay bertingkat semi-transparan (`color-mix` transparan 60%–80%) sehingga tekstur foto/kain adat terlihat hidup dengan kontras teks yang tetap maksimal.
7. **Snapshot Visual Katalog `/demo` — Unified Dual-Device Showcase (Tablet & Mobile):**
   - Halaman katalog showroom publik (`/demo`) menggunakan mockup simultan dual-device (tablet landscape 16:9 / 4:3 di belakang dan smartphone portrait 9:19.5 di depan dengan dynamic island) yang elegan tanpa lag dan tanpa beban multi-iframe.
   - **Zero Hardcode Domain (`siteHost`):** Address bar pada mockup tablet mendeteksi nama host secara dinamis di sisi klien melalui `window.location.hostname` (bebas dari hardcode domain statis).
   - **Precision Scoped Overlay:** Efek *hover overlay* aksi ("Lihat Demo") terkungkung secara presisi di dalam batas fisik layar tablet (`overflow: hidden`), mengeliminasi artefak kotak gelap yang meluap ke luar frame scene.
   - **Pure Editorial Grid:** Menghilangkan border kartu kaku yang redundan dan teks status dekoratif yang tidak perlu, menyajikan katalog dengan nuansa editorial majalah kelas atas.
8. **Dynamic Asset Route Handler & RFC 9111 ETag Revalidation (`/demo/[theme]/[file]`):**
   - Mengatasi limitasi bawaan Next.js Standalone / Production yang hanya melayani file statis di `public/` saat proses build-time.
   - Route handler `app/demo/[theme]/[file]/route.ts` membaca langsung file runtime (`thumbnail_mobile.webp`, `thumbnail_desktop.webp`, lagu, dan aset visual lainnya) dari disk `public/demo/[theme]/[file]`.
   - Dilengkapi proteksi anti-cache 404 (`Cache-Control: no-store, no-cache, must-revalidate, max-age=0`) agar CDN Cloudflare dan browser tidak mengunci status 404 saat file baru belum diunggah.
   - **Modern ETag Revalidation & Edge CDN Acceleration:** Menggunakan header `Cache-Control: public, max-age=0, s-maxage=604800, must-revalidate` disertai ETag berbasis ukuran dan waktu modifikasi file (`stat.mtimeMs`). Browser klien selalu melakukan revalidasi kondisional (`If-None-Match: ETag`), sementara Cloudflare Edge CDN meng-cache aset selama 7 hari (`s-maxage`). Setiap kali admin memperbarui media atau melakukan Purge Cache Cloudflare, seluruh browser pengunjung langsung menyajikan aset terbaru seketika tanpa tertahan di disk cache lokal dan tanpa memerlukan query string cache-buster redundan (`?v=`).
   - **Unified ISR & Edge Invalidation:** Endpoint Demo Studio (`/api/admin/themes/[id]/demo-asset` dan `demo-data`) merevalidasi cache halaman utama (`/`), katalog (`/demo`), rute demo (`/demo/[id]`), dan API tema secara atomik sekaligus memicu Cloudflare Cache Purge.
9. **Universal Preloader Monogram-Only Splash & Landing Footer 2-Tier:**
   - **Monogram-Only Preloader:** Preloader universal (`lib/renderTemplate.ts` dan 15 tema demo statis) mengeliminasi elemen nama lengkap panjang (`.lux-preloader-names`) yang rawan *line-wrapping* canggung, beralih murni ke inisial monogram serif elegan dengan margin vertikal proporsional (24px) di atas garis shimmer emas.
   - **2-Tier Landing Footer:** Struktur footer landing page ditata ulang secara semantik menjadi dua baris terpisah: baris atas untuk identitas brand dan navigasi utama, baris bawah untuk tautan legalitas (Syarat, Kebijakan, Pengembalian) dan hak cipta.
10. **Arsitektur Cache Demo Statis Bebas Konflik Git (Untracked Runtime Cache):**
    - Berkas kompilasi demo `public/demo/*/index.html` diklasifikasikan secara tegas sebagai *generated runtime artifact* dan dikecualikan dari pelacakan Git (`.gitignore`). Git hanya melacak aset mentah gambar/audio (`.webp`, `.mp4`) dan master template (`themes/**/*.html`).
    - Skrip deployment otomatis (`deploy.sh`) menyertakan langkah pra-kompilasi mandiri via `compileAllStaticDemos()` pasca sinkronisasi skema database Prisma, membaca konfigurasi aktual dari database PostgreSQL server target.
    - Pada rute publik `/demo/[theme]`, sistem didukung logika *on-the-fly compilation* otomatis jika berkas cache fisik belum ada di disk, menjamin zero-downtime dan mengeliminasi 100% potensi konflik merge Git di server VPS.

### 17.5 — Penghapusan Aset Bersih & Fallback Kanvas Transparan di Demo Studio
1. **Pembersihan Fisik & Basis Data Terpadu:**
   - Endpoint `DELETE /api/admin/themes/[id]/demo-asset?slot=[slot]` memverifikasi sesi admin, menghapus file fisik di `public/demo/[themeId]/` untuk seluruh variasi format (`.webp`, `.jpg`, `.png`, `.mp4`, `.mp3`, dll.), dan memperbarui data JSON di `adminSetting.theme_demo_[themeId]` dengan string kosong `""`.
   - Mengompilasi ulang file statis `index.html` dan merevalidasi cache Next.js (`/demo`, `/demo/[themeId]`, `/api/public/themes`).
2. **Staged Deletion & Restorasi di UI Admin:**
   - Menyediakan tombol *Hapus* dan *Pulihkan* (undo) pada setiap slot foto sampul, 8 galeri showroom, dan 4 kenangan tamu.
   - Status draft penghapusan ditandai dengan badge tegas *"✕ Dikosongkan"* dan placeholder netral.
3. **Graceful Zero-Asset Handling:**
   - Resolusi template di `lib/demoRegistry.ts` membedakan antara field yang sengaja dikosongkan (`""`) versus field yang belum didefinisikan (`undefined`), sehingga foto default tidak dipaksakan muncul kembali saat admin sengaja mengosongkannya.
   - Dilengkapi aturan CSS global di `public/css/modules.css`: `img[src=""], img:not([src]) { display: none !important; }`.

### 17.7 — Ekosistem Demo Publik Mandiri Fitur Hari-H (Day-of-Event Tech Demo)

Untuk memberikan pengalaman interaktif penuh bagi calon klien sebelum memesan paket, platform menghadirkan rute demo mandiri non-rute tema (*zero-database client demo*):
1. **Dual-Tab Hub di `/demo`:**
   - Menyediakan dua tab utama di bagian atas katalog showroom: *"Koleksi Desain Tema"* (menampilkan 15 desain undangan visual) dan *"Sistem & Fitur Acara"* (menampilkan kartu modul teknologi operasional Hari-H).
2. **Demo Sistem Resepsionis & QR Scanner (`/demo/receptionist`):**
   - Beroperasi 100% di memori browser tanpa mutasi basis data.
   - Dilengkapi **Generator Tiket QR Kustom** (input nama tamu, kategori VIP/Keluarga/Reguler, alokasi pax, dan nomor meja) dengan fitur unduh gambar QR PNG dan preview fullscreen untuk pengujian kamera.
   - Mode Scanner Kamera Live berbasis `html5-qrcode` dengan deteksi multi-kamera (laptop & tablet), laser viewfinder, feedback audio *beep chime* via Web Audio API, serta tombol *Simulasi Scan Cepat 1-Klik*.
   - Dilengkapi proteksi anti-double scan, daftar kehadiran tamu real-time, dan simulasi kunci layar PIN panitia (PIN Demo: `1234`).
3. **Demo Guest Moment Camera (`/demo/sharemoment`):**
   - Portal kamera mandiri bagi tamu untuk mengambil foto selfie/candid dan mengirimkan doa restu dari smartphone tanpa instalasi aplikasi.
   - Menampilkan tahapan simulasi upload realistis (kompresi gambar, enkripsi stempel waktu, dan konfirmasi sukses) tanpa menyimpan file ke storage cloud/disk.
   - Hasil simulasi disimpan pada `sessionStorage` peramban (`demo_guest_moments`) dan otomatis terpampang di posisi teratas pada galeri kenangan tamu.
4. **Demo Galeri Kenangan Tamu Live Feed (`/demo/memories`):**
   - Menampilkan feed kumpulan foto kenangan tamu berformat **Fluid Full-Width Masonry Grid** (`max-w-[1920px]` dengan rentang responsif 2 kolom di mobile hingga 7 kolom di layar monitor lebar), mengeliminasi margin kosong raksasa dan menyajikan rasio kartu yang proporsional dan elegan.
   - Dilengkapi **Instagram Story Highlights Rail** (`Sorotan Cerita Tamu`) di bagian atas feed dengan avatar lingkaran beraksen gradasi emas yang dapat digulir horizontal, identik dengan fitur pada sistem live (`/s/[subdomain]/memories`).
   - Dilengkapi modal perbesar foto resolusi penuh berfitur **Clean Lightbox Navigation** tanpa ikon panah mengambang:
     - *Desktop:* Navigasi tombol keyboard (Panah Kanan `ArrowRight` untuk next, Panah Kiri `ArrowLeft` untuk prev, `Escape` untuk tutup).
     - *Mobile:* Gesture sentuh jari (*touch swipe left* untuk next, *touch swipe right* untuk prev).
     - Menjaga estetika foto tetap 100% bersih, rapi, dan elegan dengan counter halus (`1 / 16`).
   - Berlaku seragam pada **Demo Memories** (`/demo/memories`) dan **Live Memories** (`/[slug]/memories` & `/s/[subdomain]/memories`) dengan layout fluid edge-to-edge `max-w-[1920px]` (2 hingga 7 kolom), klik instan reload pada toast momen baru, serta pemancaran event real-time `sseEmitter.emit("new_memory", memory)` pada endpoint upload publik.
   - Dilengkapi tombol *Simulasi Unduh Arsip ZIP* untuk mendemonstrasikan kemudahan pengantin menyimpan seluruh kenangan acara.

### 17.8 — Isolasi Transaksi & Order-Level Payment Method Lock
1. **Pemisahan Daur Hidup Transaksi:**
   - Transaksi di tabel `orders` menyimpan data metode (`GATEWAY` vs `MANUAL_TRANSFER`), `snapToken`, dan `proofImageUrl` secara mandiri.
   - Perubahan toggle global `payment_mode` oleh admin di menu Pengaturan hanya mengubah baris setting platform, tidak mengubah status maupun riwayat order yang sedang berjalan.
2. **Order-Level Lock di Halaman Checkout (`/checkout`):**
   - Halaman checkout mengunci mode tampilan secara presisi: jika pesanan memiliki `paymentMethod === "MANUAL_TRANSFER"` atau sudah ada `proofImageUrl`, tampilan klien dikunci ke mode `MANUAL` (menampilkan status *"Menunggu Verifikasi Admin"* dan struk pembayaran).
   - Menjamin bahwa klien yang sudah transfer manual tidak akan pernah terganggu atau tertutup oleh tampilan QRIS gateway meskipun Admin mengubah toggle global di tengah jalan.

### 17.9 — Arsitektur Theme-Specific Blueprint, 18 Color Palettes & Dynamic Custom Labels
1. **Registri Kamus Budaya & Narasi Bawaan (`lib/themeDefaults.ts`):**
   - Mendefinisikan cetak biru teks narasi spesifik untuk seluruh 28 tema fisik master lintas 3 kategori:
     - **Tradisional (15 Tema):** Sentuhan bahasa adat & doa kedaerahan (Jawa Keraton Dillalucky, Keraton Prameswari, La Galigo, Toraja, Rantepao, Makale, Bugis, Makassar, Bone, Wajo, Soppeng, Gowa, Maros, Takalar, Bulukumba).
     - **Modern Editorial & Floral (9 Tema):** Narasi puitis editorial majalah & estetika modern floral kontemporer (Ameera, Chronicle, Lumina, Papercut, Solaria, Wave, Badrika, Candani, Mayang).
     - **Premium Exclusive (4 Tema):** Diksi mewah monokrom dan formal terhormat (Artisan, Aurelia, Kalandra, Valente).
   - **Tipografi Harmonis (Title Case vs Uppercase):** Menyesuaikan karakteristik font khas tema; tema berskrip kaligrafi (*Parisienne* di Candani) dikonfigurasi dengan Title Case (`Dress Code`, `Live Streaming`, `Love Story`, `Our Moments`, `Turut Mengundang`) guna mengeliminasi tabrakan glif huruf bersambung yang rusak saat dijadikan all-caps.
2. **Tab Khusus di Admin Demo Studio (`app/(admin)/admin/page.tsx`):**
   - **Tab 1 (Aset Visual & Palet Warna Default):** Mengontrol aset foto/video per slot serta pemilih palet warna bawaan tema (18 palet: 8 Universal + 10 Warisan Adat Bugis, Makassar, Toraja).
   - **Tab 2 (Mempelai & Rangkaian Acara):** Formulir Timeline Acara demo yang dapat ditambah (`+ Tambah Acara`) atau dihapus per item secara dinamis.
   - **Tab 3 (Kisah Cinta & Tanda Kasih):** Formulir Bab Cerita demo yang dapat ditambah (`+ Tambah Bab Cerita`) atau dihapus per item secara dinamis, serta rekening bank demo dengan `+ Tambah Rekening` & `Hapus Rekening`.
   - **Tab 4 (Teks Seksi & Narasi Bawaan):** 6 Sub-Panel lengkap yang mengontrol seluruh narasi dan label kustom tema.
3. **Pewarisan Dinamis Klien (Inheritance Architecture):**
   - Saat klien membuat undangan via `POST /api/client/invitations/create`, sistem mengambil konfigurasi `theme_demo_${themeId}` dari `prisma.adminSetting` dan menggabungkannya dengan `getThemeBlueprint(themeId)`.
   - Hal ini menjamin bahwa seluruh perbaikan label, narasi, dan palet warna default yang disetel Admin di Demo Studio terwariskan secara otomatis ke setiap undangan baru yang dibuat klien tanpa memerlukan hardcode.
4. **Sintesis Arketipe Otomatis untuk Tema Baru (Zero-Configuration Fallback):**
   - Bila Administrator mengunggah tema baru yang belum tercatat di daftar `THEME_BLUEPRINTS`, fungsi `getThemeBlueprint` secara otomatis mendeteksi kategori tema (`traditional`, `modern`, atau `premium`) dan menyintesiskan blueprint arketipe default yang selaras:
     - `DEFAULT_TRADITIONAL_BLUEPRINT`: Nuansa adat nusantara, doa Ar-Rum 21, Mempelai, Rangkaian Acara, Tanda Kasih, Turut Mengundang.
     - `DEFAULT_MODERN_BLUEPRINT`: Estetika modern bilingual, Celebration of Love, Love Story, Our Moments, Dress Code, Live Streaming.
     - `DEFAULT_PREMIUM_BLUEPRINT`: Diksi luxury monokrom, Sacred Vows, The Solemnity, The Tapestry, Curated Frames, Wedding Registry, Expressions of Grace.
   - Nama tema diturunkan otomatis dari database (`theme.name`) atau kapitalisasi `themeId`. Saat Admin membuka Demo Studio pertama kali (`GET /api/admin/themes/[id]/demo-data`), seluruh formulir 4 Tab sudah 100% terisi data awal yang rapi tanpa ada input kosong.
5. **Garansi Kompatibilitas Mundur 100% (Zero-Breaking Policy):**
   - Seluruh 28 tema master tetap berfungsi normal tanpa regresi karena Engine tetap mengekspor fallback token lama (`storySectionHtml`, dll.).
6. **Sistem 18 Palet Warna (Universal & Warisan Adat) & Konfigurasi Palet Default di Admin:**
   - **Katalog 18 Palet Resmi (`lib/colorPalettes.ts`):**
     - *8 Palet Universal & Modern:* Champagne Gold, Royal Emerald, Burgundy Wine, Botanical Sage, Warm Terracotta, Monochrome Dark, Dusty Rose, Midnight Navy.
     - *10 Palet Warisan Adat Bugis, Makassar & Toraja:* Toraja Crimson & Bamboo Gold, Bugis Royal Maroon & Gold, Makassar Phinisi Navy & Gold, Bugis Bone Royal Saoraja, Bugis Wajo Sutera Sengkang, Bugis Soppeng Latemmamala, Makassar Gowa Balla Lompoa, Makassar Maros Salewangang, Makassar Takalar Sanrobone, Makassar Bulukumba Panrita Lopi.
   - **Konfigurasi Palet Default di Admin Theme Studio (`app/(admin)/admin/page.tsx`):**
     - Administrator dapat menentukan palet default untuk setiap tema di tab Themes -> Edit Tema.
     - Pilihan ini disimpan ke database pada tabel `AdminSetting` dengan kunci `theme_demo_${themeId}`.
     - Palet ini diterapkan otomatis sebagai palet resmi pratinjau showroom publik (`/demo/${themeId}`) dan menjadi standar bawaan otomatis (*initial default palette*) saat klien membuat undangan baru dengan tema tersebut (`/api/client/invitations/create`).
   - **Fleksibilitas Penuh Klien di Dasbor:**
     - Klien tetap memiliki akses memilih dari seluruh 18 palet warna di Studio Undangan Klien (`app/(client)/dashboard/invitation/[id]/page.tsx`) untuk menyesuaikan selera pribadi tanpa merusak struktur tema.
7. **Arsitektur Musik Latar Bawaan Tema (Theme Default Music Architecture) & Pewarisan Cerdas:**
   - **Sumber Musik Bawaan Berbasis Seri & Budaya:** Setiap tema memiliki trek musik bawaan mandiri yang ditentukan di `lib/themeDefaults.ts` (`DEFAULT_TRADITIONAL_BLUEPRINT`: `/music/bermuara.mp3`, `DEFAULT_MODERN_BLUEPRINT` & `DEFAULT_PREMIUM_BLUEPRINT`: `/music/canon-in-d.ogg`) atau secara spesifik per tema dalam `THEME_BLUEPRINTS`.
   - **Konfigurasi Admin di Tab Themes (Demo Studio):** Melalui Tab *Themes* -> *Studio* (`app/(admin)/admin/page.tsx`), Administrator dapat memilih lagu dari Pustaka Musik Sistem (`music_presets`) atau mengunggah berkas audio baru. Pengaturan ini disimpan ke tabel `AdminSetting` (`theme_demo_${themeId}`) pada kolom JSON `audioUrl`.
   - **Pewarisan Otomatis ke Undangan Klien:** Saat undangan baru dibuat via `POST /api/client/invitations/create`, sistem otomatis mewariskan musik default tema (`customDemoData?.audioUrl || blueprint.defaultMusicUrl`) ke `invitation.musicUrl` dan `featureSettings.musicUrl`. Klien tetap bebas mengubah atau menonaktifkan musik di Dasbor Klien.
   - **Fallback Resolusi Universal Theme Engine & Demo Publisher:** Baik `compileInvitationHtml` (`lib/themeEngine.ts`) maupun `composeDemoTemplateData` (`lib/demoRegistry.ts`) mengevaluasi `blueprint.defaultMusicUrl` sebelum jatuh ke preset acak, menjamin audio showroom dan preview klien selalu memutar lagu resmi tema secara konsisten.
8. **Standarisasi 5-Layer Master Stacking Hierarchy (Pemisahan Kanvas Latar & Scrim):**
   - Mengeliminasi tumpang tindih styling gelap (scrim blackout) dengan memisahkan kanvas menjadi 5 lapisan mandiri:
     - *Lapisan 1 (Paling Bawah):* Warna Palet Tema (`body { background-color: var(--bg-dark); }`).
     - *Lapisan 2:* Media Slot Background (`.fixed-bg-layer`, murni `url(...)` gambar/video tanpa gradien inline).
     - *Lapisan 3:* Kanvas Scrim (`.scrim-canvas`, kanvas gradasi transparan mandiri dengan opacity terukur 15%–45% maks).
     - *Lapisan 4:* Konten Undangan (`.layout-wrapper`, teks, profil, event, formulir, rsvp, frame, dock).
     - *Lapisan 5 (Paling Atas):* Cover Pembuka (`#coverScreen`, gerbang portal sebelum dibuka).
   - Pemisahan ini telah distandarisasikan di `themes/BLUEPRINT_GUIDE.md`, `themes/traditional/bugis.html`, dan `themes/starter-blueprint.html`.
9. **Optimasi Total Aset Ornamen (Zero Bulky PNG):**
   - Seluruh 39 berkas mentah `.png` di `public/assets/ornaments/` telah dibersihkan setelah diverifikasi memiliki padanan `.webp` terkompresi berkualitas tinggi (`cwebp -q 82`), menghemat ~32 MB kapasitas disk dan mempercepat waktu muat LCP mobile.

### 17.6 — Arsitektur Seksi Mitra Vendor (Wedding Credits): Preservasi Warna Brand & Tab Demo Studio
1. **Preservasi Warna Asli Brand & Isolasi Link Peramban:**
   - Menghapus filter monokrom `filter: brightness(0) invert(1)` dari `.lux-vendor-logo-img`, memastikan seluruh logo mitra (seperti oranye Sore Hari atau biru AMS) tampil dalam warna brand otentik tanpa distorsi.
   - Mengisolasi warna link `<a class="lux-vendor-link">` dan status peramban `:visited` dengan `color: var(--accent) !important; text-decoration: none !important;` untuk mencegah warna ungu bawaan peramban (`#551a8b`).
2. **Centered Flexbox Layout:**
   - Mengganti grid 2-kolom dengan flexbox terpusat (`display: flex; flex-wrap: wrap; justify-content: center; gap: 2.2rem 2.8rem;`) agar baik 1 vendor tunggal maupun beberapa vendor selalu tampil simetris di tengah kanvas.
3. **Tab ke-5 di Theme Demo Studio Admin (`app/(admin)/admin/page.tsx`):**
   - Menyediakan Tab *"Mitra Vendor"* dengan antarmuka **Compact Single-Row Strip**: baris horizontal ramping (~48-52px) dengan slot logo mini terintegrasi (unggah berkas atau prompt URL), input nama, tautan akun, dan tombol hapus.
   - Fitur lengkap: toggle switch `showVendors`, edit judul/eyebrow/subtitle, upload logo langsung ke `/api/admin/themes/[id]/demo-asset` (slot `vendor_[n]`), dan tombol cepat *"Muat 4 Logo Dummy Default"* (`/uploads/logo_dummy/logo_1.png` s.d. `logo_4.png`).

### 17.10 — Arsitektur Theme Freedom: Pemisahan Desain Tema Master & Conditional Blocks (`{{#if}}`)
1. **Prinsip Independensi Desain Tema Master:**
   - Menghapus monopoli tampilan Engine atas seksi-seksi dinamis. Engine (`lib/themeEngine.ts` & `lib/demoRegistry.ts`) bertindak sebagai **penyedia data murni** (data provider), sedangkan Tema Master (`themes/**/*.html`) memiliki kebebasan penuh merancang struktur DOM, ornamen, tipografi, dan tata letak visualnya sendiri.
2. **Conditional Template Block Parser (`lib/renderTemplate.ts`):**
   - Menambahkan evaluator blok kondisional deterministik:
     ```html
     {{#if showStory}}
     <section id="story" class="slide-section">
       <!-- Struktur HTML bebas khas tema master -->
       {{storyItemsHtml}}
     </section>
     {{/if}}
     ```
   - **Evaluasi Truthiness:** Blok dipertahankan jika nilai variabel truthy (bukan `undefined`, `null`, `false`, `"false"`, `0`, atau `"0"`). Jika klien menonaktifkan sakelar fitur di dashboard, seluruh blok dihapus bersih dari dokumen (*zero ghost elements* / tanpa menyisakan tag kosong).
   - Mendukung blok invers `{{#unless condition}} ... {{/unless}}`.
3. **Penerapan Pilot pada Tema Candani (`themes/traditional/candani.html`):**
   - Menggantikan injeksi kartu hitam generik `.journey-card-container` dengan tata letak native `.candani-story-flow` yang terintegrasi dengan ornamen floral, pembatas SVG melengkung, tipografi *Italiana* / *Playfair Display*, dan tanda tangan *Parisienne*.
4. **Pembaruan Starter Blueprint (`themes/starter-blueprint.html` & `public/downloads/starter-blueprint.html`):**
   - Mendokumentasikan dua opsi implementasi seksi dinamis bagi para pengembang tema (Theme Builders):
     - **Opsi A (Bawaan Engine):** Menggunakan token seksi terkomposisi instan (`{{storySectionHtml}}`).
     - **Opsi B (Native Master Theme):** Menggunakan blok kondisional `{{#if showStory}}` dengan kelas CSS kustom dan token item granular (`{{storyItemsHtml}}`).
### 17.11 — Standardisasi Universal Seksi Kisah Cinta (Love Story / Journey Timeline): Vertical Glowing Luxury Standard
1. **Latar Belakang & Eliminasi Card Box Statis:**
   - Seksi Kisah Cinta (Love Story / Journey) sebelumnya menampilkan wadah kartu kaku (`.journey-card` / `.journey-previews`) dengan 2 foto preview bujur sangkar yang memakan ruang vertikal dan memberikan kesan generik/standar.
   - Desain timeline editorial mewah yang sebelumnya hanya aktif di Kalandra (`themes/premium/kalandra.html`) kini distandarisasi ke seluruh 19 tema master (Modern, Traditional, dan Premium) serta Engine default (`lib/themeEngine.ts` dan `lib/demoRegistry.ts`).
2. **Arsitektur Sumbu Rel & Node Simpul Berpendar (Vertical Glowing Rail):**
   - **Garis Rel Vertikal:** Diterapkan via pseudo-elemen `::before` pada kontainer timeline (`.journey-timeline, .journey-chapters, .kalandra-timeline, .mayang-story-flow, .candani-story-flow, .lagaligo-story-flow`) dengan gradien pendar linier:
     ```css
     background: linear-gradient(to bottom, var(--timeline-gold), color-mix(in srgb, var(--timeline-gold) 40%, transparent) 70%, transparent);
     ```
   - **Titik Node Emas Bercahaya (*Luminous Gold Dots*):** Setiap bab kisah cinta (`.story-chapter-block::before`) memiliki titik simpul bulat emas 9px dengan efek halo berpendar berlapis:
     ```css
     box-shadow: 0 0 10px 2px color-mix(in srgb, var(--timeline-gold) 65%, transparent),
                 0 0 20px color-mix(in srgb, var(--timeline-gold) 35%, transparent);
     ```
3. **Resolusi Token Warna Dinamis Adaptif (Anti-Hardcode Chain):**
   - Mendukung harmonisasi palet dinamis di semua tema tanpa hardcode warna mati:
     ```css
     --timeline-gold: var(--primary, var(--gold, var(--accent, var(--jawa-gold, var(--floral-gold, var(--sunset-amber, #d4af37))))));
     ```
   - Pada tema modern & premium (Valente, Aurelia, Artisan, Papercut), node mengalir mengikuti `--accent` atau `--gold`.
   - Pada tema kultural dan floral (Mayang, Candani, Lagaligo), node mengalir dinamis mengikuti `--accent` atau token palet aktif.
4. **Pembersihan Bersih & Kompatibilitas Engine:**
   - Wadah lama `.journey-card` dinetralkan (`background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important;`) dan `.journey-previews` disembunyikan (`display: none !important;`) di `public/css/modules.css`.
   - Engine universal `lib/themeEngine.ts` dan `lib/demoRegistry.ts` memancarkan DOM ramping `sec-flow sec-journey` dengan pembungkus `.journey-timeline.journey-chapters` dan tanda tangan penutup `.journey-footer`.

### 17.12 — Standarisasi Universal Token Dinamis & Panduan Master Blueprint (Zero Hardcode Policy)
1. **Pemberantasan Teks Statis & Hardcode Budaya/Agama:**
   - Seluruh 17 berkas template fisik (`themes/**/*.html`) dan master blueprint (`themes/starter-blueprint.html` & `public/downloads/starter-blueprint.html`) distandarisasi 100% bebas dari teks statis hardcode keagamaan (`﷽`, `بِسْمِ اللَّهِ...`, `WALIMATUL 'URS`, dll.).
   - Diperkenalkan token universal baru:
     - `{{openingGreeting}}`: Salam pembuka dinamis yang dapat disetel ke teks Arab, teks Latin, salam umum, salam adat, maupun dikosongkan total (`""`) tanpa revert.
     - `{{coverBadge}}`: Label lencana pembuka cover gate (fallback otomatis ke `{{weddingTagline}}`).
     - `{{quoteSectionEyebrow}}` & `{{quoteSectionTitle}}`: Subjudul dan judul seksi doa kutipan.
     - `{{coupleSectionTitle}}`, `{{eventsSectionTitle}}`, `{{wishesSectionTitle}}`: Judul seksi terhubung ke form dan live editor.
2. **Panduan Master Desain Tema (`themes/BLUEPRINT_GUIDE.md`):**
   - Dibuat dokumen standar teknis resmi untuk para Theme Builder / desainer tema yang merangkum kamus token lengkap, aturan atribut binding dua arah (`data-lux-field`), arsitektur split 460px desktop, CSS custom properties, dan SOP 5-langkah registrasi tema baru ke engine database tanpa sentuhan manual backend.

### 17.13 — Profil Pasangan Tema Aurelia: Zero-Radius High-Fashion Editorial Spread
1. **Pelepasan Defisit Ruang Horizontal & Solusi Tipografi Nama Panjang:**
   - Mentransformasi susunan profil mempelai Aurelia dari model horizontal kaku (*side-by-side flex*) menjadi **Centered Stacked Editorial Layout** (100% lebar kontainer ~360px–420px).
   - Mengalibrasi tipografi nama pasangan (`.couple-duo-name`) dengan `font-size: clamp(1.18rem, 3.6vw, 1.45rem);` dan `line-height: 1.35;` sehingga nama panjang (3–4 kata + gelar akademis/adat seperti *"Arjuna Wibowo, S.E., M.B.A."*) muat dalam satu baris secara proporsional dan elegan tanpa patah baris canggung (*awkward line-break*).
2. **Ciri Khas Orisinal Bebas Klise AI (Zero-Radius Editorial Sharp Frame):**
   - Mengeliminasi bingkai lengkung/kubah generik AI (*arch frame*) dan menggantinya dengan potongan tajam bersudut 0px (`border-radius: 0;`), rasio potret editorial murni **3:4** (`140px × 186px`), dibingkai garis hairline presisi 1px (`border: 1px solid color-mix(in srgb, var(--gold) 40%, rgba(255, 255, 255, 0.2))`).
   - Tautan Instagram (`.btn-ig-pill`) dikonfigurasi bersih tanpa box/border wrap (`border: none; background: transparent;`), menampilkan username Instagram minimalis dengan transisi hover ke palet emas (`var(--gold)`).
3. **Penyajian Elegan Bersih Berbasis `first` dan `second`:**
   - Mengeliminasi lencana angka kaku (*01/02 curatorial badge*) untuk memberikan kesan mewah yang bersih, lapang, dan bersahaja.
   - Mengalirkan profil secara hierarkis dinamis berdasarkan pihak pengundang utama (`first`) dan pihak pasangan (`second`), dipisahkan oleh konektor monogram inisial di bagian tengah (`.couple-duo-connector`).
4. **Pemberantasan Jebakan Viewport Kaku:**
   - Wadah `.slide-couple-duo` diubah dari `min-height: 100vh; justify-content: space-between;` menjadi flow alami vertikal (`min-height: auto; padding: 5rem 1.8rem 4.5rem; gap: 2.2rem;`), melenyapkan risiko benturan elemen pada layar ponsel pendek.

### 17.13.1 — Penyelarasan Latar Gradasi & Navigasi Tema Artisan (Premium)
1. **Gradasi Latar Foto Profil Dinamis (*Zero Hardcode Overlay*):**
   - Mengganti overlay `rgba(7, 7, 9)` statis pada `.slide-couple::before` dengan token dinamis `linear-gradient(to top, var(--bg-dark, #070709) 0%, color-mix(in srgb, var(--bg-dark, #070709) 45%, transparent) 45%, transparent 100%)`. Latar bawah foto profil 100vh kini menyatu mulus secara otomatis dengan palet tema apapun yang dipilih klien di Studio Editor.
2. **Standarisasi Anchor Navigasi `#couple` & RSVP Handler:**
   - Menyematkan `<span id="couple" class="couple-anchor"></span>` pada Slide 2 (`#host1`) untuk standardisasi navigasi lintas tema.
   - Mengaitkan `window.luxSubmitRsvp = submitRsvp;` pada script lokal untuk memastikan formulir RSVP dapat dieksekusi baik pada mode preview statis maupun produksi engine.
3. **Resolusi Dinamis Audio Autoplay (`playAudio`):**
   - Memperbaiki `playAudio()` agar mencari elemen audio secara dinamis (`luxAudioPlayer`, `bgAudio`, atau `window.bgAudio`) saat tombol "Buka Undangan" diklik, menuntaskan kegagalan pemutaran otomatis musik latar akibat inisialisasi ID statis.
4. **Gradasi Dinamis Foto Penutup Footer:**
   - Mengganti overlay hitam mati `rgba(0,0,0,0.92)` pada `.site-footer.has-closing-photo::before` dengan `linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--bg-dark, #070709) 55%, transparent) 50%, var(--bg-dark, #070709) 100%)`.

### 17.13.2 — Dekoupling & Jaminan Eksekusi RSVP Universal (Produksi & Showroom Demo)
1. **Pemisahan dari Ketergantungan Audio (`lib/themeEngine.ts`):**
   - Sebelumnya, blok skrip runtime (`luxSubmitRsvp`, countdown timer, audio helper) dibungkus bersyarat di dalam `finalAudioUrl ? ... : ""`. Jika klien menonaktifkan musik latar (`showMusic: false`) atau tidak memiliki URL audio, formulir RSVP menjadi mati karena fungsinya tidak terinjeksi ke DOM.
   - Dilakukan perbaikan arsitektural: skrip `luxSubmitRsvp` kini diinjeksi secara **mutlak tanpa syarat** ke setiap undangan yang dirender engine, menjamin 100% formulir RSVP klien selalu berfungsi tanpa terpengaruh status audio.
2. **Universal Demo RSVP Handler (`lib/demoRegistry.ts`):**
   - Menyuntikkan handler mandiri `luxSubmitRsvp` pada showroom demo statis (`/demo/[themeId]/index.html`), memungkinkan pengunjung menguji formulir RSVP dan melihat pesan doa secara instan tanpa error console `ReferenceError: luxSubmitRsvp is not defined`.
3. **Harmonisasi Skrip Lokal Master Template:**
   - Seluruh 8 tema yang memiliki fungsi `submitRsvp` internal (`artisan`, `valente`, `aurelia`, `papercut`, `wave`, `ameera`, `dillalucky`, `prameswari`) kini secara konsisten menyematkan `window.luxSubmitRsvp = submitRsvp;`.

### 17.14 — Arsitektur Single-Screen Zero-Scroll Kiosk pada Sistem Resepsionis Live & Demo
1. **Pemberantasan Window Scrolling (`h-screen overflow-hidden`):**
   - Baik pada sistem resepsionis live (`app/components/features/ReceptionistScannerClient.tsx`) maupun showroom demo (`app/demo/receptionist/page.tsx`), viewport dikunci kokoh pada `h-screen overflow-hidden`.
   - Mengeliminasi distorsi *elastic bounce*, pergeseran layout, dan scrollbar vertikal browser saat panitia menyentuh layar tablet (iPad) atau mengarahkan barcode scanner tembak.
2. **Layout Kolom Dinamis Simetris (`h-full min-h-0`):**
   - Main container menggunakan `min-h-0 overflow-hidden` dengan grid 12 kolom:
     - Kolom Kiri (`md:col-span-5`): Kartu display status siaga dan konfirmasi check-in tamu yang berpusat vertikal presisi (`my-auto`) dan dilengkapi tombol manual *"Kembali ke Siaga Scan"*.
     - Kolom Kanan (`md:col-span-7`): Kartu scanner pemindai (Kamera Live vs Mode Scan tembak) dengan tinggi penuh (`h-full flex flex-col overflow-hidden`) dan internal scrollbar tipis (`custom-scrollbar`) yang terisolasi di dalam kartu tanpa memengaruhi window utama.
3. **Efisiensi Viewfinder Kamera:**
   - Tinggi maksimum video scanner dibatasi pada `max-height: 380px` (`object-fit: cover`) agar pas dan nyaman di seluruh resolusi layar laptop 13-inch maupun tablet dalam mode horizontal tanpa memicu scroll kartu.
4. **Fitur Ambient Standby Screensaver (Watermark Cover):**
   - Otomatis aktif saat layar tidak ada interaksi selama 2 menit (atau melalui tombol Standby di navbar).
   - Menampilkan watermark tipografi besar dan glow ambient di tengah layar:
     - **Mode Live:** Inisial monogram pasangan mempelai (e.g. `R & J`), nama lengkap pasangan, garis ornamen emas, dan jam digital.
     - **Mode Demo:** Logo platform (`BrandLogo`), tipografi `LUXENARY INVITE`, subteks sistem, dan jam digital.
   - **True Standby Hardware Shutdown & Privacy:** Saat screensaver aktif, perangkat keras kamera (sensor CMOS & track MediaStream peramban) dimatikan tuntas secara otomatis demi efisiensi daya/baterai, mencegah panas berlebih pada tablet/laptop, serta menjaga privasi tamu (lampu webcam hijau padam total). Begitu layar disentuh (*Tap to Wake*) atau tombol/barcode scanner ditekan, screensaver tertutup dan kamera langsung diinisialisasi ulang dalam ~400ms.
   - **Throttled Standby Idle Timer:** Deteksi interaksi mouse/touchscreen menggunakan ambang batas peredam getaran 1000ms (*throttling*) agar pergerakan mikro mouse/trackpad tidak menahan pergantian layar ke standby.
5. **Auto-Dismiss 15 Detik & Proteksi Jeda Kamera (Scan Pause):**
   - Notifikasi / kartu check-in tamu otomatis ditutup kembali ke status *"Siaga Menerima Tamu"* setelah 15 detik jika tidak ada aktivitas baru.
   - Selama kartu notifikasi sedang aktif di sisi kiri, decoding kamera di sisi kanan dijeda (*paused*) dan animasi visual laser beam dimatikan sementara. Ini secara efektif mencegah pemindaian berulang (*re-scan looping*) pada barcode yang masih berada di depan lensa kamera.

### 17.13 — Arsitektur Skalabilitas Multi-Server: Shared Storage & Symlink Mounting Pattern
1. **Model Horisontal Multi-Node Stateless Compute:**
   - Platform mendukung deployment kluster horizontal di mana 2 atau lebih server VPS Next.js berada di belakang satu Layer-7 Load Balancer (Cloudflare Load Balancing atau Reverse Proxy Caddy).
   - Seluruh state data relasional terpusat pada PostgreSQL (RDS atau Dedicated Managed Database), dan seluruh aset gambar, avatar, serta audio tersimpan pada Object Storage Cloudflare R2 (`STORAGE_PROVIDER=r2`).
2. **Penanganan Berkas Stateful Filesystem (Master Tema & Piring Draft):**
   - Berkas dinamis lokal terbagi ke dalam 4 direktori kritis:
     - `themes/`: Master template fisik `.html` yang dapat diunggah/diperbarui Admin via UI.
     - `public/demo/`: HTML demo statis katalog yang di-compile otomatis dari master tema.
     - `data/drafts/`: Piring draft mandiri HTML klien yang sedang diedit di Studio Editor.
     - `public/published/`: Berkas HTML final undangan pernikahan hasil kompilasi publikasi.
3. **Prinsip Portabilitas Kode vs Abstraksi OS Linux (Zero Hardcode `/mnt/...`):**
   - **Kode Next.js Tetap Portabel:** Di dalam kode aplikasi, semua modul pemanggil filesystem tetap menggunakan `path.join(process.cwd(), "...")`. Dilarang keras menanam path absolut Linux seperti `/mnt/...` ke dalam kode TypeScript agar proyek tetap dapat berjalan di lingkungan lokal developer (macOS/Windows).
   - **Abstraksi OS via Symlink Kernel:** Di lingkungan produksi VPS Linux, direktori bersama (NFS / Shared Block Storage) di-mount ke `/mnt/shared_luxenary/`, lalu dihubungkan ke dalam root project menggunakan Symbolic Link (`ln -s`):
     - `luxenary-invite/themes` $\rightarrow$ `/mnt/shared_luxenary/themes`
     - `luxenary-invite/public/demo` $\rightarrow$ `/mnt/shared_luxenary/demo`
     - `luxenary-invite/data/drafts` $\rightarrow$ `/mnt/shared_luxenary/drafts`
     - `luxenary-invite/public/published` $\rightarrow$ `/mnt/shared_luxenary/published`
   - Pola ini menjamin konsistensi instan antar-node: unggahan tema atau kompilasi undangan di Node 1 seketika terbaca oleh Node 2 tanpa perlu proses rsync berkala atau webhook replikasi yang rawan *race condition*.

---

## 18. SISTEM KAS & HASIL BISNIS TERPADU (CASHFLOW HUB)

### 18.1 — Filosofi Single-Page Unified Cashflow
1. **Prinsip Efisiensi Maksimal (Anti-Birokrasi & Anti-Bloat):**
   - Menghapus tab bertingkat yang membingungkan. Seluruh data kas terintegrasi langsung dalam 1 halaman kas terpadu (`AdminCashflowTab`).
   - Berfokus murni pada esensi hasil bisnis: **Uang Masuk, Uang Keluar, dan Sisa Kas Riil (Laba Bersih)**.
   - Menggunakan kanvas mengalir dengan batas garis hairline tipis `border-stone-200/80` dan palet warna tenang yang ramah mata (*warm stone, charcoal, emerald, rose*).
2. **Pemberantasan Emoji Sistem Operasi (Zero OS Emojis):**
   - Seluruh status diwakili oleh vektor SVG murni, tipografi angka monospaced, dan indikator titik halus (*1.5px dot indicators*).

### 18.2 — Alur Arus Kas & Anti-Redundansi Pendapatan
1. **Otomatisasi 100% Pemasukan (Zero-Duplication):**
   - Data arus kas masuk (*Gross Revenue*) mengalir murni secara dinamis dari tabel `Order` berstatus `PAID` (baik auto-PAID via Midtrans/Xendit maupun approval transfer bank manual).
   - Admin dilarang menginput pendapatan order klien secara manual untuk mencegah redundansi, selisih kas (*discrepancy*), dan *ghost revenue*.
2. **Pencatatan Beban Kas Operasional (OPEX):**
   - Mutasi pengeluaran kas dicatat dalam tabel `Expense` dengan parameter kategori (`ExpenseCategory`), tanggal mutasi, sumber bayar (`paymentSource`), nomor referensi, catatan audit, dan berkas fisik bukti struk.

### 18.3 — Visualisasi Tren Arus Kas Bulanan (Native SVG)
- **Grafik Batang Bulanan (Januari s.d. Desember):** Grafik komparasi langsung bersanding antara Uang Masuk (Emerald) dan Uang Keluar (Rose) per bulan.
- **Interaksi Tooltip Cepat:** Menampilkan rincian nominal masuk, keluar, dan sisa kas per bulan tanpa beban komputasi Bezier yang berat.

### 18.4 — Buku Kas Pengeluaran Terpadu (Expense Ledger)
- Pencatatan, pencarian, dan filter cepat per kategori dan sumber dana.
- Aksi hapus pengeluaran dilindungi pola konfirmasi inline 2-step aman tanpa dialog popup browser.
- Ekspor streaming CSV untuk kebutuhan arsip pembukuan eksternal.

---

## 19. ARSITEKTUR PEMANTAUAN SERVER & KESEHATAN SISTEM (MONITORING HUB)

**File:** `components/admin/AdminMonitoringTab.tsx`, `app/api/admin/monitoring/health/route.ts`

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   PUSAT PEMANTAUAN SISTEM & STATUS SERVER                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. KESTABILAN SISTEM & RIWAYAT UPTIME (60 HARI ALA UPTIMEROBOT / VERCEL STATUS)  │
│    - Status ketersediaan 60-hari interaktif dengan hover tooltip latensi & status│
│    - Pemantauan Uptime Host OS Linux fisik (os.uptime()) vs Runtime Node.js      │
│    - Metrik insiden/downtime tercatat (0 crash, 99.98% operasional)              │
│                                                                                  │
│ 2. TIGA METERAN HARDWARE & PENYIMPANAN                                           │
│    a. RAM Memori Server VPS (Host RAM):                                          │
│       - Total kapasitas fisik (os.totalmem()), terpakai, dan sisa bebas (GB)     │
│       - Heap Node.js (heapUsed / heapTotal) & RSS resident memory footprint      │
│       - Sistem peringatan ambang batas beban memori (>70% amber, >85% rose)      │
│    b. Disk Penyimpanan VPS Server (Partisi /):                                   │
│       - Pengukuran kapasitas partisi root Linux (/), terpakai & sisa bebas       │
│       - Audit ukuran folder lokal /public/uploads dan /data/drafts               │
│    c. Cloudflare R2 Media Storage:                                               │
│       - Metrik ukuran terpakai faktual (bytes, KB, MB) via S3 ListObjectsV2 API  │
│       - Sisa kuota bebas biaya (Free Tier 10 GB / bulan)                         │
│       - Rata-rata ukuran file per objek media & status bucket Cloudflare         │
│       - Penegasan siklus retensi: foto tamu dibersihkan pasca 30 hari via cron   │
│                                                                                  │
│ 3. AUDIT STAF & LOG WEBHOOK GATEWAY                                              │
│    - Paginasi server-side log aktivitas perubahan admin                          │
│    - Log webhook notifikasi transaksi Midtrans & Xendit dengan modal JSON viewer │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 20. ARSITEKTUR ANTARMUKA DASBOR KLIEN MODERN (BORDERLESS GLOWING BEAM & SLIDING MAGNETIC PILL)

**File Terkait:** `app/(client)/dashboard/rsvp/page.tsx`, `app/(client)/dashboard/guests/page.tsx`, `app/(client)/dashboard/invitation/[id]/page.tsx`

### 20.1 — Filosofi Anti-Card Fatigue & Ruang Napas Vertikal
1. **Masalah Desain Boxy (Card Overload):**
   - Menumpuk filter tab di dalam bungkusan kartu putih (`bg-white rounded-2xl border shadow-xs`) di atas tabel/konten memakan 60–80px ruang vertikal yang tidak perlu dan memicu keletihan visual (*card fatigue*).
2. **Solusi Desain Borderless Hairline:**
   - Menghilangkan kontainer card penutup dan membiarkan tab beristirahat langsung di atas garis hairline halus (`border-b border-stone-200/80`). Memberikan kanvas dasbor ruang napas yang bersih, minimalis, dan elegan setara standar SaaS modern (Linear / Vercel).

### 20.2 — Borderless Glowing Beam Tabs (`/dashboard/rsvp` & `/dashboard/guests`)
1. **Dynamic Beam Measurement:**
   - Menggunakan referensi DOM reaktif (`useRef<(HTMLButtonElement | null)[]>`) dan state `beamStyle = { left, width }` yang mengukur secara tepat `offsetLeft` dan `offsetWidth` tombol tab yang sedang aktif.
2. **Glow & Gradient Signature (60 FPS Native CSS):**
   - Batang penanda aktif berupa balok 2.5px dengan gradasi emas hangat (`bg-gradient-to-r from-amber-700 via-amber-500 to-amber-600 rounded-full`) berpadu pendaran halus `shadow-[0_1px_8px_rgba(217,119,6,0.6)]` dan ambient blur `bg-amber-500/20 blur-xs`.
   - Transisi pergeseran sehalus sutra menggunakan timing function hardware-accelerated: `transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`.
3. **Pill Badges Bersih:**
   - Status counter tamu dan RSVP disematkan dalam pil monospace minimalis (`font-mono text-[10px]`) yang bertransisi warna lembut saat dipilih (`bg-amber-100 text-amber-900` vs `bg-stone-200/70 text-stone-600`), tanpa emoji OS ataupun badge status berlebihan.

### 20.3 — Sliding Magnetic Pill Dual Switcher (`/dashboard/invitation/[id]`)
1. **Track Inset Container:**
   - Rel switcher berada di dalam kontainer `relative flex items-center bg-stone-100/90 p-1 rounded-xl border border-stone-200/80`.
2. **Sliding Magnetic Thumb:**
   - Latar tombol aktif bergeser secara fisik (magnetic thumb) di bawah teks tombol dengan rumus offset deterministik:
     - **Mode Mobile:** `w-[calc(50%-4px)]` dengan titik pergeseran `left-1` (Tab Form Data) dan `left-1/2` (Tab Live Editor).
     - **Mode Desktop:** Lebar tombol ramping `sm:w-[125px]` dengan posisi `left-1` (4px) vs `sm:left-[129px]` (4px + 125px).
   - Indikator thumb bertransisi warna kontekstual: `bg-stone-900` saat di mode Form Data dan berubah hangat ke `bg-amber-800` saat di mode Live Editor Visual.
3. **Penerapan Serupa pada Device Preview Switcher:**
   - Toggle preview perangkat (`Mobile` vs `Layar Penuh`) mengadopsi mekanisme sliding magnetic pill serupa berlatar putih halus `bg-white shadow-2xs` di atas rel `bg-stone-100`.
4. **Direct Action Chips Terpadu (Anti-Card Clutter):**
   - Notifikasi kelengkapan foto personal yang sebelumnya menjadi kartu amber mandiri bertumpuk telah dipindahkan ke dalam kartu switcher ini sebagai *Direct Action Chips* ringkas di sisi kanan.
   - Mengeliminasi kata pengantar panjang ("Foto belum lengkap: ...") menjadi format langsung aksi: `⚠️ Perlu: [ + Sampul ] [ + Foto Mempelai ]`.
   - Di desktop sejajar 1 baris di kanan switcher (`sm:justify-end`). Di mobile menjadi baris kedua ringkas di dalam kartu yang sama (`border-t border-stone-100 pt-2`), memangkas tinggi vertikal layar dan mengeliminasi tumpukan kartu yang berlebihan.

### 20.5 — Navigasi Hybrid Dasbor Klien: Top Center Navbar Desktop & Bottom Floating Dock Mobile (`app/(client)/dashboard/layout.tsx`)
1. **Pola Desktop ($\ge 768\text{px}$):**
   - **Full Layer Edge-to-Edge & Zero Layout Shift:** Kontainer header menggunakan `w-full px-4 sm:px-6 py-2.5 relative flex items-center justify-between` tanpa batasan buatan (`max-w-6xl` / `max-w-[1600px]`) dan tanpa `transition-all`. Logo merek Dasbor Klien terkunci presisi di ujung kiri layar, tombol CS & Keluar terkunci di ujung kanan layar, menghasilkan **0px pergeseran layout** saat berpindah antar tab manapun.
   - **Kunci Titik Geometris Pusat:** Kapsul navigasi 6 menu utama (*Beranda, Studio, Moments, Tamu, RSVP, Setelan*) diposisikan tepat di tengah monitor (`absolute left-1/2 -translate-x-1/2`) menggunakan kapsul *segmented pill nav* modern (`bg-stone-100/90 border border-stone-200/80 p-1 rounded-full`), kebal terhadap asimetri panjang nama user atau tombol di ujung kanan.
   - Tombol aktif mendapatkan latar putih solid `bg-white shadow-xs text-stone-900` dengan aksen ikon amber hangat (`text-amber-800`).
   - Floating dock di bagian bawah layar **dihapus total di desktop (`md:hidden`)**, membebaskan seluruh kanvas bawah dari obstruksi tombol/footer dan mereduksi padding bawah main content menjadi `md:pb-12`.
2. **Pola Mobile ($< 768\text{px}$):**
   - Di layar sempit ponsel, navigasi atas disembunyikan agar logo dan tombol CS/Keluar tidak berdesakan.
   - Menggunakan dock melayang *liquid glass* di bagian bawah layar (`md:hidden`) yang responsif terhadap arah scroll (*auto-hide on scroll down, reveal on scroll up*) dan tepat di jangkauan jempol (*thumb zone*).
3. **Studio Audio Lifecycle Controller (`pauseAllLiveIframesAudio`):**
   - Mencegah musik tema live preview bocor berputar di latar belakang saat beralih kembali ke tab **Form Data**.
   - Menghubungkan event `handleStudioTabClick("form")` dan `useEffect` unmount dengan pengiriman pesan `postMessage({ type: "LUX_PAUSE_AUDIO" })` serta *direct DOM `.pause()`* ke seluruh dokumen iframe aktif.
4. **Sinkronisasi Rute Demo Tamu (`/demo/sharemoment` & `/demo/memories`):**
   - `/demo/sharemoment` disinkronkan ke mesin kamera disposable modern ([`GuestMomentClient`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/components/features/GuestMomentClient.tsx)) lengkap dengan Web Audio shutter sound, 5 preset filter analog, date stamp retro, dan *opening showcase*.
   - `/demo/memories` ditransformasikan dari model flat 1-foto menjadi arsitektur **Roll Stack (1 Card / Tamu)** berlapis fisik dengan badge jumlah foto dan modal lightbox swipe multi-foto yang terhubung dengan `sessionStorage` jepretan kamera demo.
5. **Arsitektur Zero-Setup Unified Demo Sandbox (Otomasi Jalur Demo):**
   - Seluruh tema showroom (`/demo/[theme]`) mengarahkan tombol *"BUKA KAMERA KENANGAN"* ke `/demo/sharemoment?theme=[theme]`, tombol *"BUKA GALERI MOMEN LENGKAP"* ke `/demo/memories?theme=[theme]`, dan kartu tiket QR pass ke `/demo/receptionist`.
   - Sub-rute tema lama (`/demo/[theme]/memories`) otomatis dialihkan (307 redirect) ke `/demo/memories?theme=[theme]` demi mengeliminasi fragmentasi dan layout usang.
   - Pintu publik tak berautentikasi (`/memories` & `/sharemoment`) otomatis dialihkan ke sandbox demo interaktif (`/demo/memories` & `/demo/sharemoment`), mencegah hambatan auth wall bagi calon klien.
   - Endpoint publik RSVP (`/api/public/rsvp`) diperkaya simulasi instan untuk ID `demo-*`, memungkinkan pengujian pengiriman ucapan doa & konfirmasi kehadiran secara interaktif tanpa kendala database 404.
6. **Standarisasi Menyeluruh Ekosistem 17 Master Tema Fisik:**
   - Seluruh 19 tema fisik (`themes/premium/`, `themes/modern/`, `themes/traditional/`) 100% konsisten menyematkan modul Salam Pembuka Universal `{{openingGreeting}}`, Mitra Vendor `{{vendorsSectionHtml}}`, Galeri Kenangan Tamu Kamera Virtual `{{memoriesSectionHtml}}` (Photo Only), serta formulir RSVP interaktif dengan container scroll aman (`max-height: 290px-320px`, `overscroll-behavior: contain`, dan custom thin luxury scrollbar) dan proteksi hak cipta Luxenary.

### 20.6 — Mobile UI/UX Overhaul: Edge-to-Edge Canvas, Anti-Matryoshka Card & Sticky Quick-Save Bar
1. **Eliminasi "Matryoshka Card Syndrome" (Pelepasan Padding Berlapis Mobile):**
   - **Dasbor Layout Container (`app/(client)/dashboard/layout.tsx`):** Container konten utama disesuaikan secara bersyarat: `px-0 sm:px-6 pt-0 sm:pt-4 pb-20 md:pb-12` khusus untuk rute editor studio (`/dashboard/invitation/*`). Perubahan ini melepaskan ~32px ruang horizontal yang sebelumnya terbuang sia-sia di viewport ponsel (< 768px).
   - **Restrukturisasi 16 Seksi Studio Editor (`/dashboard/invitation/[id]`):** Seluruh seksi formulir dirombak dari kotak kartu tebal mengambang (`rounded-3xl shadow-xs border p-5 sm:p-7`) menjadi tata letak *flat edge-to-edge* di mobile (`rounded-none sm:rounded-3xl shadow-none sm:shadow-xs border-y sm:border border-stone-200 p-3.5 sm:p-7`). Menghemat total ~128px ruang horizontal (33% dari layar 390px) yang sebelumnya terbuang untuk batas dan padding berlapis.
2. **Sticky Quick-Save Floating Thumb Bar (`lg:hidden fixed bottom-3 left-3 right-3 z-30`):**
   - Menghadirkan bar aksi simpan mengambang di zona jangkauan jempol bawah layar saat membuka tab formulir di perangkat mobile/tablet.
   - Dilengkapi *Dirty State Tracker* reaktif per seksi (indikator titik oranye/amber bertuliskan "Belum Disimpan" saat form berubah, dan "Tersimpan" saat bersih) serta tombol simpan instan `[ Simpan Seksi ]` dengan status loading spinner tanpa mengharuskan pengguna scroll jauh ke bawah seksi.
3. **Conditional Mobile Bottom Dock Suppression:**
   - Navigasi melayang 6-menu liquid glass bawah layar di dasbor klien secara cerdas disembunyikan khusus pada rute `/dashboard/invitation/*` (`!pathname.startsWith("/dashboard/invitation")`).
   - Mencegah persaingan sentuhan (*touch competition*) dengan Quick-Save Bar serta mencegah tertutupnya field input saat virtual keyboard ponsel aktif.
4. **Eliminasi "Mockup Inception" pada Live Canvas Preview:**
   - Di layar ponsel fisik pengguna, kanvas pratinjau live editor (`LiveViewTab`) tidak lagi memaksakan bingkai mockup ponsel 390px tiruan (`w-full sm:w-[390px] rounded-none sm:rounded-2xl border-0 sm:border`).
   - Iframe pratinjau merespons 100% lebar layar mobile native, sementara toggle simulasi perangkat (`Mobile` vs `Layar Penuh`) disembunyikan di mobile (`hidden sm:flex`) untuk mengeliminasi pemotongan horizontal pada toolbar.
5. **High-Density 2-Tier Guest Card (`/dashboard/guests`):**
   - Daftar tamu di layar mobile ditransformasikan dari tumpukan vertikal 5 blok menjadi kartu 2-tier berkepadatan tinggi:
     - *Baris 1:* Checkbox seleksi, Nama Tamu, Badge Kategori, dan Nomor Urut.
     - *Baris 2:* Nomor Telepon, Kuota Tamu, Tombol Salin Tautan Cepat, Tombol Kirim WhatsApp, dan Tombol Hapus (seluruh target sentuh berukuran $\ge 40\text{px}$).
6. **Refinement Responsif Dasbor Utama (`/dashboard`) & Filter RSVP (`/dashboard/rsvp`):**
   - Hero card dan retention card dasbor menerapkan wrapping fleksibel dan ukuran tipografi adaptif (`text-[10px] sm:text-[11px]`, padding `p-3.5 sm:p-5`) untuk mencegah pemotongan badge pada viewport ultra-sempit (< 375px).
   - 4 kartu metrik filter RSVP disesuaikan menjadi `p-3 sm:p-4 rounded-xl sm:rounded-2xl` untuk grid 2-kolom mobile yang seimbang.

---

### 21.0 — Homepage Hero Device Mockup Architecture & WebP Asset Standardization (< 200 KB)

1. **Full-Bleed Realistic Phone Mockups & Eliminasi Total CSS Overlay (Mockup 1, 2, 3):**
   - Ketiga mockup ponsel hero diselaraskan menjadi *full-bleed screenshot* murni (`object-fit: cover; object-position: center top;`).
   - Menghapus total kontainer kubah kaku (`.hero-inv-arch-box`), lapisan kartu overlay (`.hero-comp-card`), scrim gelap, dan teks/tombol duplikat.
   - Penamaan aset gambar hero mockup didekopel menjadi netral dan mandiri: `hero_mockup_1.webp` (Ponsel Kiri), `hero_mockup_2.webp` (Ponsel Tengah), dan `hero_mockup_3.webp` (Ponsel Kanan).
   - Tetap mempertahankan arsitektur frame iPhone 16 Pro CSS: bodi Titanium, Dynamic Island (`z-index: 8`), dan lapisan kilau kaca Specular Glare (`z-index: 3`).
2. **Standarisasi Bobot Aset Visual WebP (< 200 KB) & Rasio Presisi Showcase:**
   - **Mockup Showcase Mobile (HP):** Standar rasio **1 : 2** (ukuran pas: **390 × 780 px** / **800 × 1600 px**).
   - **Mockup Showcase Desktop (Laptop):** Standar rasio **16 : 10** (ukuran pas: **1280 × 800 px** / **2560 × 1600 px**).
   - Seluruh aset dikompresi dengan WebP effort 6 serta unsharp mask filter (`sharp.sharpen({ sigma: 1.0, m1: 0.75, m2: 2.0 })`) dengan bobot 100% di bawah 200 KB untuk menjamin metrik LCP < 2.5s.
3. **Penyelarasan Teks Panduan Demo Studio:**
   - Menghapus referensi rancu "iPad Mini" pada form Demo Studio, menyajikan label dan ukuran presisi yang langsung pada intinya bagi administrator.
4. **Device Pair Mockup Showcase & Resolusi Ganda Thumbnail (Mobile & Desktop):**
   - Mengintegrasikan sistem panggung ganda presisi (*Device Pair Mockup*: `stp-tablet-screen` 16:10 di belakang dan `stp-phone` 1:2 di depan) pada kartu tema di panel admin (`/admin?tab=themes`), Setup Wizard (`/dashboard/setup`), dan Studio Visual Editor (`/dashboard/invitation/[id]`).
   - Menerapkan arsitektur pembagian aset yang presisi: Frame ponsel menampilkan `thumbnailMobile` (`thumbnail_mobile.webp` rasio 1:2), sedangkan frame tablet menampilkan `thumbnailDesktop` (`thumbnail_desktop.webp` rasio 16:10 dengan fallback cerdas ke `cover_desktop.webp`, `hero.webp`, dan `cover.webp`).
   - Area layar tablet (`*-screen`) mengunci `aspect-ratio: 16 / 10` secara langsung sehingga terbebas dari pemotongan topbar (*Zero-Crop Architecture*).
   - Endpoint `/api/admin/themes`, `/api/admin/overview`, dan `/api/public/themes` secara serentak mengembalikan kedua properti `thumbnailMobile` dan `thumbnailDesktop` dari konfigurasi Demo Studio atau disk fisik VPS guna menjamin konsistensi visual instan tanpa refresh halaman.
5. **Clean Editorial Button Architecture & Eliminasi Total Ornamen Panah AI (`app/page.tsx` & `app/landing.css`):**
   - Menghapus total seluruh SVG panah generik bawaan AI (`M2 7h10M7 2l5 5-5 5`) dan simbol panah literal (`→`) dari seluruh tombol primer dan teks CTA (`btn-primary`, `btn-secondary`, `btn-cta`, `koleksi-link`, `harga-detail-link`, navbar, banner status, dan mockup kartu).
   - Memastikan standar *Editorial Luxury Typography*: tombol pil (`btn-primary`, `btn-secondary`, `btn-cta`) menerapkan `white-space: nowrap;` dan `justify-content: center;` untuk mencegah pembengkakan canggung dan pemotongan teks (*multiline wrap*) di mode mobile.
   - Merampingkan microcopy kaku AI dari *"Pelajari Cara Kerja Lengkap"* menjadi lugas: **"Pelajari Cara Kerja"**.
   - Melepaskan batasan kaku mobile `max-width: 280px` dan `max-width: 260px` menjadi ukuran dinamis proporsional (`width: auto; min-width: 210px; max-width: 300px; padding: 0.85rem 1.8rem;`) yang ergonomis terhadap *thumb zone* smartphone.
6. **Alternating Zig-Zag Section Rhythm & 3D Isometric Mirroring (Seksi Pengalaman):**
   - Mengembalikan ritme visual editorial selang-seling (Zig-Zag Rhythm A - B - A) di Landing Page: Koleksi (Mockup Kanan) $\rightarrow$ Studio Mandiri (Mockup Kiri) $\rightarrow$ Pengalaman (Mockup Kanan).
   - Membebaskan teks narasi *"Lebih dari Sekadar Undangan"* dan 4 dock tombol fitur dari tabrakan visual dengan tubuh kedua mempelai pada latar foto `pengalaman_bg.webp` dengan memindahkan teks ke sisi kiri (area negative space langit/lautan tenang).
   - Menerapkan *3D Perspective Mirroring* pada frame iPad (`rotateY(-14deg) rotateX(8deg) rotateZ(-1deg)`) dan bayangan `-25px 35px 80px rgba(0,0,0,0.85)` agar layar menatap anggun ke arah teks narasi di kiri, serta menyelaraskan kalkulasi parallax mousemove di `components/landing/LandingInteractive.tsx`.
   - Pada viewport mobile/tablet ($< 1024\text{px}$), urutan bertransisi natural: teks narasi dan tab fitur di baris atas (`grid-row: 1`), diikuti langsung oleh panggung display iPad interaktif di baris bawah (`grid-row: 2`).

---

### 22.0 — Arsitektur Status Layanan & Pembatasan Registrasi / Order (Service Availability)

Fitur kontrol ketersediaan sistem terpusat yang dikelola secara dinamis oleh Administrator melalui panel pengaturan Platform (`/admin?tab=settings&sub=platform`):

1. **Empat Mode Ketersediaan Sistem (`ServiceStatusMode`):**
   - **`OPEN` (Buka Normal — Default):** Seluruh pendaftaran akun baru klien via Google OAuth dan pembuatan pesanan paket berjalan tanpa batasan.
   - **`CLOSED_ORDER` (Tutup Order / Kuota Penuh):** Pendaftaran calon klien baru ditolak sementara waktu demi menjaga kualitas dan kapasitas pengerjaan. Klien terdaftar tetap bebas login & mengelola undangannya.
   - **`MAINTENANCE` (Pemeliharaan Sistem):** Sistem dalam proses peningkatan atau pemeliharaan berkala. Transaksi dan registrasi baru ditangguhkan.
   - **`COMING_SOON` (Segera Hadir):** Mode pra-peluncuran platform atau pembaruan besar versi berikutnya.
2. **Kunci Konfigurasi Global (`prisma.adminSetting`):**
   - `service_status_mode`: Nilai enum mode aktif (`OPEN`, `CLOSED_ORDER`, `MAINTENANCE`, `COMING_SOON`).
   - `service_status_title`: Judul pengumuman notifikasi kustom.
   - `service_status_message`: Pesan detail penjelasan yang ditampilkan kepada pengunjung.
   - `service_status_reopen_date`: Teks estimasi tanggal dibuka kembali (misal: "15 Oktober 2026").
   - `service_status_contact_wa`: Nomor WhatsApp kontak bantuan atau pendaftaran antrean (waiting list).
3. **Prinsip Isolasi & Invarian Ketat (Zero Side-Effects):**
   - **Tamu Undangan & Resepsionis:** Halaman undangan publik (`/[slug]`), buku tamu, upload kenangan (`/memories`), dan meja check-in resepsionis (`/receptionist`) **100% tetap aktif** dan tidak terpengaruh oleh penutupan pendaftaran.
   - **Portal Administrator:** Admin login (`/admin/login`) dan seluruh manajemen panel admin **100% tetap aktif**.
   - **Klien Lama (Existing Clients):** Pengguna yang sudah memiliki akun di database `User` (`googleId` atau `email`) **tetap diizinkan masuk** via Google OAuth untuk mengelola undangan mereka di `/dashboard`.
4. **Pertahanan Multi-Lapisan (Defense-in-Depth):**
   - **Lapisan UI/UX:**
     - Landing Page (`/`): Top announcement notice bar luxury di atas navbar berlatar `#18130e` dengan aksen Lux Gold `#C9A227`.
     - Halaman Login (`/login`): Dynamic notice card di atas form login dan alert penolakan spesifik jika calon klien baru mencoba masuk.
     - Halaman Paket (`/packages`): Notice card penjelasan kuota dan tombol pemilihan paket dialihkan ke status nonaktif (disabled) atau konsultasi WhatsApp.
     - Halaman Checkout (`/checkout`): Peringatan order ditutup dan pencegahan submit order baru.
   - **Lapisan Autentikasi (`auth.ts` -> `signIn` Callback):**
     - Memeriksa `getServiceAvailability()`. Jika `!isOpen`, query `prisma.user` untuk memeriksa keberadaan akun. Jika pengguna baru, NextAuth membatalkan registrasi dan meredirect ke `/login?error=RegistrationClosed&mode={mode}` tanpa membuat record di database.
   - **Lapisan Backend API Guard (`/api/orders/create`):**
     - Memvalidasi `getServiceAvailability()`. Jika status bukan `OPEN`, request langsung ditolak dengan HTTP `403 Forbidden` dan pesan JSON kustom, mencegah celah bypass via automated tools atau direct HTTP POST.

---

### 23.0 — Arsitektur Sistem Pemasaran & Afiliasi (Kupon Promo, Mitra Referral, & Payout Komisi)

Sistem pemasaran terpusat yang dirancang untuk mengelola kupon diskon publik, kode promo influencer/event, dan kemitraan afiliasi (referral) dengan arsitektur anti-race condition dan integrasi modul keuangan:

1. **Model Data Relasional (`prisma/schema.prisma`):**
   - **`PartnerAffiliate` (`partner_affiliates`):** Entitas mitra yang dikelola secara eksklusif oleh Administrator (tanpa portal publik). Menyimpan profil mitra, rekening bank pencairan, tipe komisi (`PERCENT` atau `NOMINAL`), nilai komisi, `pendingBalance` (saldo belum dicairkan), dan `totalPaidOut` (total komisi yang sudah ditransfer).
   - **`PromoCoupon` (`promo_coupons`):** Kupon promo/diskon (bisa mandiri atau terikat ke `partnerId`). Memiliki tipe diskon (`PERCENT` atau `NOMINAL`), `discountValue`, `minOrderAmount`, `maxDiscountAmount`, batas kuota pemakaian global (`quotaLimit`), batas pemakaian per pengguna (`perUserLimit`), masa berlaku (`validFrom` dan `validUntil`), serta target paket spesifik (`applicablePlans`).
   - **`PromoHold` (`promo_holds`):** Alokasi sementara saat pengguna memasukkan kode promo di `/checkout`. Mencegah *race condition* penembusan kuota saat sisa kuota tinggal 1 dengan reservasi kuota berstatus `HELD` selama 15 menit. Berubah menjadi `CONSUMED` saat order PAID atau `RELEASED` saat order EXPIRED/CANCELLED.
   - **`AffiliateCommission` (`affiliate_commissions`):** Catatan riwayat komisi per transaksi pesanan klien yang berhasil lunas (`PAID`). Berstatus `PENDING` hingga dicairkan oleh Administrator menjadi `PAID`.
   - **Relasi ke `Order`:** `Order` menyimpan `promoCouponId`, `promoCodeApplied`, `discountAmount`, dan relasi 1:1 dengan `PromoHold` serta `AffiliateCommission`.

2. **Split Responsibility: Pemisahan Kasir (`/checkout`) dan Pembayaran (`/payment`):**
   - **Halaman Kasir (`/checkout`):** Fokus pada validasi pesanan, nomor WhatsApp aktif pembeli, dan input kode promo.
     - Validasi promo atomik via database transaction dan row lock (`SELECT ... FOR UPDATE`).
     - Perhitungan kuota efektif: `effectiveUsage = usageCount + activeHolds`. Jika `>= quotaLimit`, kupon ditolak sebelum hold dibuat.
     - Penguncian tagihan (`/api/payments/checkout/confirm`): Menghitung diskon pasti, mencatat `checkoutConfirmedAt`, dan mengarahkan pembeli ke `/payment?order={id}`.
   - **Halaman Pembayaran Mandiri (`/payment`):** Fokus pada penyelesaian transaksi.
     - QRIS Mode: Render SVG/PNG QRIS dengan Server-Sent Events (SSE) realtime push listener.
     - Sinkronisasi waktu server (`serverTimeOffset`): Menjamin countdown timer QRIS akurat terhadap waktu server, bukan jam lokal perangkat pengguna.
     - Graceful Session Renewal (`/api/payments/qris/regenerate`): Jika sesi QRIS 15 menit kedaluwarsa sebelum pembeli scan, pembeli dapat menekan tombol regenerasi QRIS baru tanpa membatalkan order atau kehilangan diskon promo yang terkunci pada masa aktif order 24 jam.
     - Manual Transfer Mode: Menampilkan data rekening bank resmi dan form upload bukti transfer WebP. Jika admin menolak bukti transfer, status order tetap `PENDING` sehingga pembeli dapat mengunggah ulang bukti baru tanpa kehilangan kupon promonya.

3. **Orkestrasi Pembayaran & Webhook Idempoten (`lib/marketing.ts`):**
   - `processOrderPaidMarketing(orderId)`: Dipanggil saat pembayaran terkonfirmasi (Midtrans webhook `settlement`, Xendit webhook `PAID`, atau Admin manual approve).
     - Mengubah status `PromoHold` menjadi `CONSUMED`.
     - Menginkremen `PromoCoupon.usageCount` sebesar +1.
     - Jika kupon terikat ke Mitra Afiliasi aktif, menghitung komisi, membuat record `AffiliateCommission` status `PENDING`, dan menambah `PartnerAffiliate.pendingBalance`.
     - Bersifat idempoten murni (tidak menduplikasi komisi atau hitungan kupon jika webhook terpanggil berulang).
   - `releaseOrderPromoHold(orderId)`: Melepaskan hold (`RELEASED`) saat pesanan dibatalkan atau kedaluwarsa 24 jam.

4. **Integrasi Pencairan Komisi Mitra ke Modul Keuangan (`expenses`):**
   - Pencairan komisi dilakukan di panel Admin (`/admin?tab=marketing`).
   - Dalam satu transaksi database atomik:
     - Seluruh komisi `PENDING` milik mitra ditandai sebagai `PAID`.
     - `PartnerAffiliate.pendingBalance` dikurangi dan `totalPaidOut` ditambah sebesar total nominal pencairan.
     - Secara otomatis dibuatkan entri pengeluaran kas di tabel `expenses` dengan kategori `MARKETING`, judul `"Payout Komisi Mitra: {name}"`, dan catatan detail nomor rekening tujuan. Pengeluaran ini langsung tersinkronisasi ke laporan laba rugi dan pembukuan eksekutif di `/admin?tab=finance`.

---

## 24. Audit Kode Menyeluruh, Eliminasi Stale Logic & Standar Dynamic Token (September 2026)

Sistem telah melalui audit mendalam berbasis bukti empiris (*Empirical Verification Loop*) dengan pembersihan menyeluruh pada 4 pilar utama:

1. **Pembersihan Dead Code & Dead Assets (~195 KB Dieliminasi):**
   - Menghapus file CSS duplikat/mati: `app/landing.scoped.css` (98 KB) dan `public/css/landing.css` (96 KB) yang tidak pernah diimpor oleh sistem (sistem murni mengimpor `app/landing.css`).
   - Menghapus direktori kosong `components/ui/`.
   - Standardisasi default skema Prisma: Mengubah default `themeId` pada model `Invitation` dari alias warisan `"kila"` menjadi `"kalandra"`.
   - Eliminasi query model mati: Mengeliminasi pemanggilan `prisma.wish` yang redundan pada endpoint `/api/client/rsvps` dan `/api/admin/overview`. Seluruh doa dan ucapan tamu dikelola tunggal (*Single Source of Truth*) melalui kolom `rsvps.message`, sedangkan `videoWishCount` dihitung faktual dari `prisma.guest.count({ where: { videoWishUrl: { not: null } } })`.

2. **Sinkronisasi Daur Ulang Subdomain (Subdomain Recycling):**
   - Menyelaraskan logika pada `app/api/client/invitations/[id]/route.ts` dengan `invitations/create` dan `/api/client/subdomain/check`.
   - Jika klien memperbarui subdomain di Studio Editor dan subdomain tujuan pernah digunakan oleh undangan lama yang telah kedaluwarsa (> 7 hari pasca acara), sistem secara otomatis mengosongkan subdomain pemilik lama (`subdomain: null`) dan menetapkannya ke klien baru tanpa melempar error penolakan 400.

3. **Eliminasi Race Condition & Penelanan Error (Storage & Concurrency):**
   - Pada `app/api/cron/cleanup/route.ts`: Mengganti pola fire-and-forget `import().then()` dengan `await Promise.all(...)` yang terjamin selesai sebelum mengeksekusi `prisma.user.delete`, mencegah file media tertinggal sebagai *orphaned objects* di Cloudflare R2.
   - Pada `app/api/payments/checkout/route.ts`: Pengiriman invoice tagihan via `sendInvoiceEmail` kini di-`await` dengan pembungkus `try-catch` terisolasi dan logging jelas, mencegah pemutusan proses di runtime serverless.
   - Pada handler webhook Xendit & Midtrans: Memperbaiki penanganan error query database agar tidak ditelan diam-diam (`catch {}` kosong).

4. **Harmonisasi Palet Warna Dinamis & UX Zero FOUC:**
   - Master template tema (`dillalucky.html`, `kalandra.html`, `ameera.html`, `wave.html`, `prameswari.html`, `papercut.html`, `artisan.html`, `aurelia.html`) kini secara eksplisit menyuntikkan `--bg-dark: {{colorBgDark}};` pada inline style tag `<body>`. Latar kanvas gelap undangan kini otomatis beradaptasi secara harmonis dengan palet warna pilihan klien (seperti Burgundy, Emerald, Midnight).
   - Mengganti seluruh navigasi internal `window.location.href` pada formulir penyiapan (`setup/page.tsx`) dan dasbor admin menjadi `router.push()`, meniadakan kedipan layar putih (*Flash of Unstyled Content*) dan melenyapkan seluruh ESLint route warnings.
   - Memperbarui `app/globals.css` agar memprioritaskan font modern `Geist` (`var(--font-geist-sans)`).

5. **Standarisasi Ergonomi Mobile Mode Halaman Publik (/demo, /portfolio, /checkout, /payment, /packages):**
   - **Eliminasi Anjlok 3+1 Kategori:** Mengganti layout `flex-wrap` desktop-first pada pill kategori di `/demo` dan `/portfolio` menjadi **Horizontal Touch Rail** (`overflow-x-auto scrollbar-none flex-nowrap`). Kategori berjejer rapi pada satu baris swipeable tanpa tombol terisolasi sendirian di baris baru.
   - **Responsive Header Triage & Anti-3-Line Wrap:** Menyembunyikan subtitle panjang pada `< 640px`, menyembunyikan tautan sekunder "Portofolio" di header sempit, dan mengunci tombol CTA menjadi `"Pilih Paket"` dengan `whitespace-nowrap px-3.5 py-2 text-xs font-bold`. Menghilangkan distorsi tombol gepeng/lonjong di mobile.
   - **Normalisasi Padding Mobile:** Mengurangi padding boros dari `p-6 / p-8` menjadi `p-4 sm:p-6 rounded-2xl sm:rounded-3xl` pada kartu ringkasan `/checkout`, `/payment`, dan `p-5 sm:p-8` pada `/packages` untuk memperluas ruang baca di layar 360px – 390px.
   - **Adaptive QRIS Sizing:** Menormalkan ukuran QR Code di mobile menjadi `w-44 h-44 sm:w-56 sm:h-56` agar countdown timer dan tombol verifikasi tetap berada di area atas layar (*above the fold*).
   - **Media Query Mobile Mockup:** Menambahkan breakpoint `@media (max-width: 639px)` pada `app/demo/demo.css` untuk proporsi tablet dan ponsel yang seimbang tanpa menutup fokus visual.

6. **Studio Mandiri Dual-Device Showcase & Dedicated Guide (/how-it-works):**
   - **Simulator Interaktif Studio Mandiri (`HowItWorksInteractive.tsx`):** Menghadirkan simulasi faktual dasbor klien 5 tab terintegrasi dengan kursor animasi otomatis (*autonomous showcase loop* tanpa gangguan interaksi manual):
     - Tab 0 (Live Canvas): Mode click-to-edit nama mempelai langsung di viewport mobile.
     - Tab 1 (Tema & Nuansa): Pemilihan seri tema Nusantara (Dillalucky, Candani, Badrika) dan palet warna Royal Gold/Emerald Green.
     - Tab 2 (Buku Tamu VIP): Manajemen kuota tamu dan tautan WhatsApp personal.
     - Tab 3 (RSVP & Doa): Statistik konfirmasi kehadiran real-time dan aliran ucapan selamat.
     - Tab 4 (Audit & Publikasi): Simulasi faktual **Hero Launchpad & Jendela Sliding Ticker 3 Baris** (sinkron 1:1 dengan `app/(client)/dashboard/settings/page.tsx`) yang memverifikasi 10 komponen kesiapan data secara sekuensial sebelum status publikasi resmi mengudara (`PUBLISHED`).
   - **Rute Panduan Berdedikasi (`/how-it-works`):** Menyajikan edukasi mandiri dengan bahasa santun & intuitif, anti-jargon, bebas perbandingan vendor konvensional, serta dilengkapi FAQ praktis dan navigasi bersih ke `/demo`. Rute didaftarkan di `PLATFORM_EXCLUSIONS` pada `middleware.ts`.

---

## 25. Standarisasi Akses Tema (All-Access Themes), Arsitektur Feature-Gated, Sesi Acara Utama, & Kuncian Pasca Publikasi

1. **Kebijakan Akses Tema Tanpa Batas (All-Access Themes):**
   - Seluruh 16 koleksi tema desain (Traditional Series, Modern Series, Premium Series) dapat dipilih secara bebas oleh semua tingkatan paket klien (`TIER_1`, `TIER_2`, `TIER_3`) tanpa ada diskriminasi atau tier-locking visual.
   - Seluruh logika lama pembatasan tema berdasarkan tier paket (*legacy theme tier gating*) pada `app/api/client/invitations/[id]/route.ts` telah dieliminasi secara tuntas.
   - Proteksi integritas template: Pasca publikasi (`PUBLISHED`), pergantian tema oleh klien dikunci di Studio Editor untuk menjaga konsistensi piringan template statis aktif di live CDN (hanya Admin yang dapat mengubah tema).

2. **Pembeda Paket Murni Berbasis Kapabilitas Fitur (Feature Gating):**
   - Pembeda paket tidak lagi menggunakan tema, melainkan murni berbasis kapabilitas fitur (*capabilities*):
     - **TIER_1 (Serenade):** Esensial undangan online, musik latar autoplay, galeri foto standar prewedding, RSVP online, WhatsApp personal generator (Kuota tamu: 200).
     - **TIER_2 (Symphony):** Seluruh fitur Tier 1 + Resepsionis QR Check-In Scanner (`qr_checkin`) + Kamera Momen Tamu / Disposable Photo Drop (`guest_memories`) (Kuota tamu: 500).
     - **TIER_3 (Eternity):** Seluruh fitur Tier 2 + Custom Domain Pribadi (`custom_domain`) + Kuota Tamu & Foto Tamu Maksimal.
   - Fallback kapabilitas di `lib/settings.ts` (`hasPlanCapability`) dan `app/(client)/dashboard/invitation/[id]/page.tsx` (`allowedCaps`) diselaraskan 100% sehingga paket Tier 2 (Symphony) secara konsisten mendapatkan akses ke modul `qr_checkin` dan `guest_memories`.

3. **Sesi Acara Utama (Single Primary Event Anchor) sebagai Patokan Mutlak Masa Berlaku:**
   - Klien menandai tepat 1 sesi acara sebagai **Sesi Acara Utama** (`isPrimary: true`, misal: Akad Nikah atau Resepsi Utama) yang menjadi jangkar tunggal (*single source of truth*) untuk:
     a. **Masa Aktif Undangan (`expiresAt`):** Tanggal Sesi Utama + `retention_invitation_days` (default 30 hari).
     b. **Batas Masa Simpan Galeri Tamu (`galleryExpiresAt`):** Tanggal Sesi Utama + `retention_cleanup_days` (default 14 hari) + `extraGalleryDays`.
     c. **Countdown Timer (`targetDate`):** Engine tema (`lib/themeEngine.ts`) memprioritaskan Sesi Acara Utama (`isPrimary: true`) untuk jam dan tanggal hitung mundur di cover undangan live.
     d. **Header Tanggal Tema (`weddingDate`):** Ditampilkan dari Sesi Acara Utama, bukan sesi pengajian yang di indeks 0.
     e. **Jadwal Google Calendar:** Tautan otomatis mencatat tanggal, jam, dan lokasi Sesi Acara Utama.

4. **Mekanisme Penguncian Studio Pasca Publikasi (Published Lock):**
   - Saat undangan dipublikasikan (`status === "PUBLISHED"`), formulir Studio Editor otomatis dikunci (`isLocked = true`, `isCoreLocked = true`) untuk menjaga integritas file statis live CDN, identitas mempelai, dan keabsahan QR Code fisik tamu.
   - Tanggal Sesi Acara Utama **dikunci total (disabled)** dan tombol *"Jadikan Sesi Utama"* disembunyikan agar klien tidak dapat memindahkan jangkar tanggal pasca terbit.
   - Sesi-sesi non-utama (seperti Mappacci, Resepsi ke-2, Pengajian) tetap bebas disesuaikan tanggal, jam, dan lokasinya jika ada pergeseran rundown teknis.
   - Modul operasional tamu (`/dashboard/guests`, buku tamu/RSVP, seat VIP) dan kamera momen (`/dashboard/moments`) **tetap terbuka penuh** dan berjalan real-time.

5. **Alur Buka Kunci Darurat (Emergency Unlock 24 Jam) & Atomic Deploy-and-Lock:**
   - Klien yang memerlukan perbaikan data mendesak (salah ketik nama orang tua, ralat link Google Maps, dsb.) dapat mengajukan Buka Kunci Darurat via WhatsApp Admin.
   - Admin membuka akses melalui panel Admin (`POST /api/admin/invitations/[id]/unlock`) dengan durasi (default 24 jam) yang mencatat `adminUnlockedUntil`.
   - Studio Editor klien terbuka kembali dengan banner emas Mode Perbaikan Data.
   - Klien menekan tombol **"Perbarui Undangan & Kunci Kembali"** (`handleDeployAndLock`), yang memanggil API dengan `action: "DEPLOY_AND_LOCK"`. Sistem membake ulang file HTML live CDN dalam 1 kali kompilasi tunggal dan otomatis mereset `adminUnlockedUntil = null`, mengunci kembali studio secara instan.
   - Perubahan tanggal Sesi Acara Utama pasca terbit hanya dapat dilakukan oleh Super Admin melalui panel lifecycle (`UPDATE_EVENT_DATE`).

6. **Auto-Sort Kronologis Otomatis:**
   - Rangkaian acara diurutkan secara otomatis dan dinamis berdasarkan urutan kronologis faktual:
     `Tanggal (Ascending) -> Jam Mulai (Ascending)`.
   - Sesi tambahan yang ditambahkan dengan tanggal mendahului acara utama (misal H-1) secara otomatis naik ke posisi pertama (#1) di atas acara utama.

7. **Transparansi Error Surfacing di Studio Editor:**
   - Fungsi `saveSection` mem-parse pesan error asli dari respons HTTP JSON (`errData.error`) backend dan menampilkannya secara transparan pada toast notifikasi, meniadakan penyamaran kegagalan menjadi pesan palsu "masalah jaringan / koneksi internet".

## 26. Penguatan Hari-H: Proteksi Konkurensi RSVP, Resepsionis Offline-First Idempoten, & Pencegahan Kebocoran Disk VPS

1. **Proteksi Konkurensi & Double-Tap RSVP (`/api/public/rsvp`):**
   - **In-Memory Mutex Key-Lock (`withRsvpLock`):** Mengisolasi pemrosesan submit RSVP berdasarkan kunci deterministik `lockKey = ${invitationId}:${cleanName}`. Menjamin dua atau lebih request paralel dari tamu yang sama (misalnya akibat tombol submit ditekan berulang kali di jaringan lambat) diproses secara serial.
   - **Transaksi Atomik Database (`prisma.$transaction`):** Mengecek entri RSVP eksisting dan melakukan `create` dalam 1 transaksi terisolasi PostgreSQL. Jika sudah ada entri, data di-update tanpa menciptakan duplikasi row.
   - **Kalkulasi Pax Katering Cerdas:**
     * Tamu personal terdaftar dalam Buku Tamu: kuota kehadiran maksimum dibatasi sesuai jatah `guestQuota` pengantin.
     * Tamu umum (tanpa undangan personal): dibatasi maksimum 2 orang (tamu + 1 pendamping).
     * Tamu tidak hadir (`ATTENDING = false`): jatah pax otomatis dinormalkan ke 0 pax agar estimasi katering akurat.

2. **Idempotensi Antrean Sinkronisasi Offline Resepsionis (`/api/receptionist/scan`):**
   - **Tantangan Meja Resepsionis Hari-H:** Laptop panitia resepsionis sering mengalami fluktuasi sinyal atau bekerja dalam mode offline (`navigator.onLine === false`), menampung antrean tamu di `localStorage.offlineQueue`.
   - **Idempotent Queue Flushing:** Saat koneksi pulih dan antrean offline disinkronkan massal ke backend dengan bendera `isCheckIn: true`:
     * Jika tamu ternyata sudah berstatus `isRedeemed = true` di database server (misalnya telah dipindai dari laptop penerima tamu lain di pintu berbeda), endpoint merespons `success: true` dengan penanda `alreadyRedeemed: true`.
     * Hal ini memungkinkan browser panitia melepaskan dan membersihkan item tersebut dari antrean offline tanpa error 400/kemacetan antrean (deadlock), sementara status di layar tetap menginformasikan panitia dengan tepat bahwa tamu sudah masuk sebelumnya.

3. **Pencegahan Kebocoran Disk VPS pada Siklus Cron Cleanup (`/api/cron/cleanup`):**
   - Saat masa retensi undangan klien berakhir (H+14 pasca acara) dan status beralih menjadi `ARCHIVED`:
     * Server mengeksekusi `deletePublishedHtml(inv.id)` untuk membuang berkas publikasi statis `public/published/ids/<id>.html`.
     * Server memverifikasi dan menghapus berkas draft lokal jika tersisa di `data/drafts/<id>.html`.
     * Mencegah penumpukan file HTML lama di filesystem VPS pada penggunaan jangka panjang.

4. **Kalkulasi Kuota Momen Foto Tamu & Add-On Top-Up Terintegrasi:**
   - Plafon foto momen acara (`totalEventQuota`) di endpoint `/api/public/memories/upload` mengagregasikan jatah paket (`memories_total_quota_{plan}`) dengan saldo top-up (`extraMemoriesQuota`).
   - Penambahan paket top-up foto diproses secara mandiri via `/checkout` (`MEMORIES_TOPUP`) dan dieksekusi otomatis oleh webhook / helper `applyMemoriesTopup` di `lib/upgradeHelper.ts`.

5. **Purifikasi Skema Murni & Master Seed Terpadu (`prisma/seed.ts`):**
   - **Eliminasi Model Mati:** Model `Wish` dan tabel `wishes` resmi dihapus dari skema (migrasi `20260916143000`). Seluruh ucapan doa dikelola tunggal pada `rsvps.message`.
   - **Skema Bersih 0-Drift:** Kolom lama `phoneNumber` pada tabel `guests` dibersihkan, menyisakan `phone` murni. Nilai enum `WaStatus` distandarisasi murni ke `PENDING` dan `SENT`.
   - **Master Seed Terpadu (Non-Destructive Invariant):** Seluruh 84 parameter platform (nama paket dinamis `Serenade`, `Symphony`, `Eternity`, kuota foto roll, aturan retensi), 19 tema master, 2 preset musik, dan 2 akun admin default ditanamkan di `prisma/defaultSettings.ts` dan `prisma/seed.ts`. Operasi `upsert` pada `AdminSetting` diproteksi secara non-destruktif: hanya memperbarui `label` dan tidak pernah menimpa nilai `value` yang sudah dikonfigurasi oleh admin di database produksi.
6. **Resolusi Domain Kanonikal Redirect Subdomain & Slug (`app/(public)/s/` & `[slug]`):**
   - Mengeliminasi ketergantungan pada `req.url` internal reverse proxy (`localhost:3001`).
   - Seluruh pengalihan (subdomain kosong `subdomain-available`, kedaluwarsa `subdomain-expired`, maupun arsip portofolio) dialihkan secara kanonikal ke `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_ROOT_DOMAIN` resmi (`https://luxvite.id`).

7. **Isolasi Subdomain Ketat (Strict Subdomain Isolation Guard di `middleware.ts`):**
   - **Pemisahan Domain Platform vs Subdomain Klien:** Subdomain sistem (`demo`, `app`, `www`, `admin`, `login`, `checkout`, dll.) otomatis dialihkan 307 ke domain kanonikal `https://luxvite.id` (`demo.luxvite.id` dialihkan ke `https://luxvite.id/demo`).
   - **Proteksi Halaman Platform:** Akses ke rute platform resmi (`/packages`, `/login`, `/dashboard`, `/admin`, `/contact`, `/terms`, dll.) dari subdomain klien manapun dialihkan secara absolut ke domain utama, melepaskan subdomain dari URL bar.
   - **Eksklusivitas Undangan Klien:** Subdomain klien aktif secara eksklusif hanya melayani 5 fungsi acara: Undangan Utama (`/`), Tamu Personal (`/{guest}`), Momen Tamu (`/memories`), Check-In QR (`/receptionist`), dan Kamera Tamu (`/sharemoment`), mencegah salah interpretasi nama rute platform sebagai nama tamu undangan (*Collision Prevention*).
   - **Penyelarasan Kategori Pengaturan Database & Anti-Fragile Gateway (`admin_settings`):**
     - **Sinkronisasi Kolom `group`:** Seluruh 82 pengaturan platform di database PostgreSQL kini tersinkronisasi 100% ke 12 grup kategori resmi (`payment`, `pricing`, `platform`, `setup`, `backup`, `midtrans`, `xendit`, `google`, `subdomain`, `themes`, `active_gateway`, `general`), melenyapkan anomali default fallback `group = 'general'`.
     - **Anti-Fragile Gateway Query:** `lib/gateways/midtrans.ts`, `lib/gateways/xendit.ts`, dan `app/api/webhook/midtrans/route.ts` kini memfilter kredensial API secara langsung dan definitif berdasarkan nama kunci (`where: { key: { in: [...] } }`). Sistem pembayaran dan webhook menjadi kebal terhadap inkonsistensi grup database selamanya.
     - **Pembersihan Kunci Zombi:** Mengeliminasi 3 kunci mati dan usang dari database produksi (`addon_custom_domain_enabled`, `retention_account_days`, dan `retention_invitation_days`), dan menyatukan seluruh logika retensi pada kunci resmi `retention_cleanup_days` dan `retention_order_days`.
     - **Sterilisasi Preset Musik Awal:** Menghapus entri preset musik yang berkas audio fisiknya belum diunggah (`preset-sempurna`), menyisakan berkas audio terverifikasi (`Canon In D` dan `Bermuara`) guna menjamin nihilnya error audio 404 pada pemutar live undangan klien.

---

## 27. Seksi Mitra & Vendor Pernikahan (Wedding Credits): Arsitektur No-Card-Wrap & Injeksi Universal

1. **Prinsip Estetika Bersih Tanpa Card Wrap (Floating Minimalist):**
   - **Zero Card Wrap Policy:** Elemen vendor (logo PNG transparan & nama teks) dipasang melayang langsung di atas latar tema tanpa kotak kartu, tanpa border, dan tanpa latar belakang buatan (`background: transparent !important; border: none !important; box-shadow: none !important;`).
   - Mencegah timbulnya kesan kaku "stempel kotak" dari logo PNG vendor yang berlatar transparan.
   - Menggunakan token tema dinamis `color: var(--accent)` untuk tipografi nama vendor dan judul seksi.

2. **Injeksi Universal di Atas Footer (`lib/renderTemplate.ts`):**
   - Engine secara otomatis menyuntikkan section vendor tepat sebelum elemen `<footer` pada seluruh 15 master template HTML.
   - Jika `showVendors` dinonaktifkan atau daftarnya kosong, section menghasilkan string kosong (`""`) tanpa menyisakan margin/padding (Zero-Gap Policy).

3. **Studio Editor Dashboard Klien (Seksi 16):**
   - Rute: `app/(client)/dashboard/invitation/[id]/page.tsx`
   - Antarmuka **Compact Single-Row Strip**: form input horizontal ramping (~48-52px) yang menyatukan slot logo mini (64×40px dengan preview langsung, file picker terintegrasi, dan tombol clear), input nama vendor, input tautan/Instagram, serta tombol hapus tanpa card wrap bertingkat (bebas cardception).
   - Mendukung penambahan vendor tak terbatas dengan upload logo (terintegrasi kompresi WebP berslot `vendor` pada `/api/client/upload`), input nama, dan deteksi otomatis format `@username` Instagram atau tautan web portofolio vendor.
   - Tersimpan utuh pada field JSON `featureSettings.vendors` dan `featureSettings.customLabels` tanpa memerlukan migrasi skema database baru (Zero DB Migration).

---

## 28. Penguatan Stabilitas DevOps & Server Infrastructure (September 2026)

1. **PostgreSQL Connection Pool Sizing & Idle Timeout (`lib/prisma.ts`):**
   - Mengatur batas eksplisit `max` (default 10 koneksi per worker atau configurable via `DB_POOL_MAX`), `idleTimeoutMillis: 30000`, dan `connectionTimeoutMillis: 5000`.
   - Mencegah kehabisan slot koneksi database (`too many clients already`) saat aplikasi dijalankan pada PM2 Cluster Mode multi-worker.

2. **Disaster Recovery: Replikasi Off-Site Snapshot ke Cloudflare R2 (`lib/databaseBackup.ts`):**
   - Setiap snapshot `.sql` yang di-generate via `pg_dump` otomatis diunggah ke Cloudflare R2 bucket (`backups/database/snapshot_xxx.sql`).
   - Menghilangkan *Single Point of Failure (SPOF)*: jika server VPS mengalami kerusakan perangkat keras, database dapat direstorasi dari cloud R2 independen.
   - Penghapusan snapshot dan rotasi `pruneOldSnapshots` disinkronkan menghapus file di disk lokal dan R2 secara bersamaan.

3. **Sinkronisasi Retensi Subdomain Terpadu (`app/(public)/s/[subdomain]/route.ts`):**
   - Menghapus logika stale hardcoded 7 hari dan evaluasi satu tanggal. Rute kini mengevaluasi `isSubdomainExpired` menggunakan `getLatestEventDate(eventData)` (mendukung acara multi-sesi) dan membaca setting faktual `retention_cleanup_days` serta `subdomain_auto_recycle`.

4. **Otomatisasi Pendaftaran Crontab OS & Rotasi Log PM2 (`deploy.sh`):**
   - Skrip deployment otomatis mengonfigurasi `pm2-logrotate` (maks 10MB x 7 arsip) untuk mencegah kebocoran disk VPS dari `logs/out.log`.
   - Skrip deployment otomatis mendaftarkan jadwal cron job pemeliharaan (`/api/cron/cleanup` pukul 02:00 dan `/api/cron/backup` pukul 03:00) ke crontab Linux host menggunakan `CRON_SECRET` aktif, mengeliminasi kebutuhan konfigurasi manual oleh engineer IT.

---

## 29. Standarisasi Cloudflare Edge Caching, Decoupled Dynamic Wishes & URL-Specific Purge (September 2026)

1. **Header Edge Caching Terpadu (`app/(public)/s/[subdomain]/route.ts` & `[slug]/route.ts`):**
   - Rute publik undangan yang telah berstatus `PUBLISHED` secara eksplisit mengirimkan header:
     `Cache-Control: public, max-age=60, s-maxage=604800, stale-while-revalidate=86400`
   - Memungkinkan 300+ data center Cloudflare Edge di seluruh dunia menyimpan salinan dokumen HTML statis selama 7 hari, mengeliminasi beban CPU VPS dan query PostgreSQL hingga 0% saat ribuan tamu mengakses secara serentak di hari-H.
   - Mode `DRAFT` atau `preview` tetap memancarkan `no-store, no-cache, must-revalidate` untuk menjamin interaktivitas kanvas studio secara real-time.

2. **Pemisahan Data Dinamis Doa & Ucapan (Decoupled Dynamic Wishes Feed):**
   - Seluruh 18 tema produksi dan sistem *Triple Blueprint* (`themes/starter-blueprint.html`, `public/downloads/starter-blueprint.html`, `theme-builder/starter/master.html`, dan `lib/themeEngine.ts`) dilengkapi pemanggil otomatis asinkron `fetch('/api/public/rsvp?invitationId=...')` saat halaman dimuat.
   - Kotak doa dan ucapan tamu selalu terisi real-time dari database tanpa perlu membakar ulang file HTML atau membatalkan cache edge Cloudflare.

3. **URL-Specific Purge Otomatis pada Aksi "Update Publikasi" (`DEPLOY_AND_LOCK`):**
   - Di [app/api/client/invitations/[id]/route.ts](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/invitations/%5Bid%5D/route.ts), saat pengantin menyelesaikan revisi di studio melalui masa Emergency Unlock dan mengklik **"Update Publikasi & Kunci Kembali"**, sistem secara atomik:
     1. Mengompilasi ulang berkas HTML fisik `public/published/ids/<id>.html`.
     2. Menembak API `purgeCloudflareCache` terisolasi hanya untuk URL spesifik undangan terkait (`https://subdomain.luxvite.id/`, `https://luxvite.id/slug`, dan custom domain jika ada).
     3. Mengosongkan `adminUnlockedUntil = null` untuk mengunci kembali studio editor secara otomatis.
   - Menjamin nol risiko *cache stampede* pada undangan klien lain.

4. **Tombol Mandiri "Bakar Ulang & Purge Cache" di Dasbor Admin (`components/admin/AdminInvitationsTab.tsx`):**
   - Disediakan endpoint terproteksi `POST /api/admin/invitations/[id]/purge` beserta tombol aksi di tabel undangan Dasbor Admin.
   - Memungkinkan administrator memicu kompilasi ulang HTML dan pembersihan cache Cloudflare secara instan untuk undangan tertentu saat ada permintaan troubleshooting dari klien.

---

## 30. Sistem Peringatan Kuota Roll Kamera Tamu & Wording Analog Sopan (September 2026)

1. **Ambang Batas Notifikasi Dinamis & Multi-Milestone (`lib/settings.ts`, `prisma/defaultSettings.ts`):**
   - Batas notifikasi kuota roll tidak di-hardcode. Dikelola dinamis melalui pengaturan admin `memories_notify_milestones` (default `"50,80,100"`), diparsing menjadi array bilangan bulat terurut `[50, 80, 100]`.
   - Administrator dapat mengonfigurasi milestone secara bebas dari Tab Setup di Dasbor Admin:
     - Preset 50%: Peringatan roll terpakai separuh (Separuh Roll).
     - Preset 80%: Peringatan roll hampir penuh (Antusiasme Tinggi).
     - Preset 100%: Pemberitahuan roll terkunci penuh (Roll 100% Penuh).
     - Nilai Kustom CSV: Mendukung input persentase kustom arbitrer (misal `25, 50, 75, 90, 100`).

2. **Pemicu Otomatis Non-Blocking & Idempotensi Milestone (`upload/route.ts` & `lib/mailer.ts`):**
   - Saat tamu mengunggah foto ke `/api/public/memories/upload`, sistem menghitung `newTotalPhotos` terhadap setiap milestone dalam `settings.memoriesNotifyMilestones`.
   - Idempotensi terjamin dengan menyimpan array `memoriesNotifiedMilestones: number[]` di dalam `invitation.featureSettings` (disertai kompatibilitas balik `memoriesNotified80: boolean`). Setiap milestone hanya memicu email 1 kali.
   - Template email adaptif via `sendMemoriesQuotaAlertEmail`:
     - $\ge 100\%$: Badge merah `ROLL 100% PENUH`, subjek `[Pemberitahuan] Roll Kamera Tamu Telah Terisi Penuh (100%) 📸`.
     - $\ge 80\%$: Badge amber `ANTUSIASME TINGGI (80%)`, subjek `[Pemberitahuan] Roll Kamera Tamu Sudah 80% Terisi 📸`.
     - $< 80\%$: Badge biru/amber `SEPARUH ROLL (50%)`, subjek `[Pemberitahuan] Roll Kamera Tamu Sudah 50% Terisi 📸`.
   - Tautan CTA di dalam email mengarahkan pengantin langsung menuju Dasbor Momen Tamu privat (`/dashboard/moments`) untuk menjaga keamanan sesi autentikasi dan mencegah kebocoran link pembayaran publik.

3. **Mekanisme Re-Arming Milestone Pasca Top-Up Kuota (`lib/upgradeHelper.ts`):**
   - Saat pengantin melakukan pembelian top-up roll foto (`applyPaidUpgrades` atau `applyMemoriesTopup`), saldo kuota bertambah sehingga persentase pemakaian roll menurun.
   - Sistem secara otomatis me-rearm milestone yang berada di atas persentase pemakaian baru (`curFs.memoriesNotifiedMilestones = curFs.memoriesNotifiedMilestones.filter(m => m <= newUsagePercent)`).
   - Menjamin pengantin akan tetap mendapatkan notifikasi peringatan kembali saat kuota yang baru diperluas mendekati batas di masa mendatang.

4. **Banner Peringatan Visual Adaptif di Dasbor Klien (`/dashboard/moments`):**
   - Jika kuota $\ge 100\%$: Banner merah *Rose* menampilkan status roll terkunci, penjelasan bahwa tamu belum bisa mengunggah foto baru, dan tombol cepat *Buka Kunci Roll (+100 Foto)*.
   - Jika kuota $\ge 80\%$: Banner emas *Amber* menampilkan status antusiasme tamu, sisa jepretan, dan tombol cepat *Top-Up +100 Foto*.

5. **Wording Analog Sopan di Sisi Tamu (*Zero-Embarrassment Guarantee*):**
   - Saat kuota foto acara telah terisi penuh ($100\%$), sistem menolak unggahan baru dengan status HTTP 403 namun memancarkan pesan metafora analog yang hangat dan bersahabat:
     *"Terima kasih banyak atas momen indahnya! Roll kamera kenangan untuk acara ini telah terisi penuh dengan cinta. Semua foto sedang kami proses dan simpan dengan aman ke dalam album kenangan pengantin ✨"*
   - Menghilangkan total eksposur angka kuota atau kesan batasan paket di depan para tamu undangan, menjaga martabat dan wibawa pengantin tetap terlindungi 100%.
