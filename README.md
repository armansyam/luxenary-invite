# Luxenary Invite — S-Invite Platform

> **Platform Undangan Pernikahan Digital B2C Self-Service**  
> Next.js 16.3.2 · Prisma 7.9 (PostgreSQL) · NextAuth v5 · Multi-Gateway (5 Gateway) · Nodemailer SMTP · Cloudflare R2  
> **Versi Dokumen: 5.3.0 | Diperbarui: 04 September 2026**

> [!IMPORTANT]
> **PROTOKOL SINKRONISASI DOKUMENTASI OTOMATIS (MANDATORY POST-EDIT & PRE-PUSH PROTOCOL):**  
> Setiap kali selesai melakukan pengeditan kode (fitur baru, bugfix, refactor, perubahan skema database, atau penambahan endpoint) dan **sebelum/saat melakukan push ke Git remote (GitHub)**:
> 1. **Periksa Seluruh Kode Faktual:** Jangan membuat asumsi. Baca kode implementasi riil untuk memverifikasi perubahan.
> 2. **Perbarui Semua File Dokumentasi Master:**
>    - [`README.md`](./README.md) — Selaraskan alur, versi, tabel tema, dan instruksi deployment.
>    - [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md) — Perbarui diagram arsitektur, peta routing, skema database Prisma, dan lifecycle.
>    - [`S-Invitation.md`](./S-Invitation.md) — Perbarui spesifikasi fungsional dan kapabilitas modul.
> 3. **Verifikasi Empiris:** Wajib jalankan `npx tsc --noEmit` (Exit Code 0) sebelum menyatakan pekerjaan selesai.
> 4. **Commit & Push Bersamaan:** Seluruh dokumen yang diperbarui **WAJIB di-commit dan di-push bersamaan** dengan kode agar GitHub selalu sinkron dengan kondisi codebase lokal!

---

## Tentang Platform

Luxenary Invite adalah platform SaaS undangan pernikahan digital berbasis model **B2C (Business-to-Consumer)** di mana calon pengantin mendaftar mandiri, memilih paket, membayar, lalu mengakses studio editor untuk membangun undangan digital mereka. Setelah publish, undangan tampil sebagai **file HTML statis mandiri** yang disajikan langsung dari disk — tanpa SSR, tanpa DB query per request.

---

## Alur Kerja B2C (Lengkap)

```
[Calon Klien]
     │
     ▼
1. LANDING PAGE (/)
   Katalog paket + demo tema interaktif
     │
     ▼
2. LOGIN + PILIH PAKET (/login → /packages)
   Google OAuth → Pilih paket (Traditional / Modern / Premium)
     │
     ▼
3. CHECKOUT (/checkout)
   Pola Single State (1 Klien = 1 Transaksi) + Auto-Purge Obsolete Storage
   ┌─────────────────────────────────────┬──────────────────────────┐
   │  Multi-Gateway (5 Gateway Aktif)    │  Transfer Bank Manual    │
   │  iPaymu / Duitku / Midtrans /       │  (Bebas Hardcode)        │
   │  TriPay / Xendit (QRIS/VA/E-Wallet) │  Upload WebP ke R2 via   │
   │  → Webhook Auto-PAID + Invoice Email│  Custom Domain Edge CDN  │
   │                                     │  → Admin Approve/Reject  │
   │                                     │    (Inline Action Switch)│
   └─────────────────────────────────────┴──────────────────────────┘
     │
     ▼
4. ONBOARDING (/onboarding)
   Setup awal: pilih subdomain, isi nama pengantin
     │
     ▼
5. STUDIO UNDANGAN (/dashboard/invitation/[id])
   - Pilih & ganti tema (15 tema fisik aktif)
   - Isi data pengantin, keluarga, jadwal acara multi-event
   - Pengaturan Musik Latar Pernikahan (Audio background, preset sakral, unggah MP3/M4A)
   - Upload foto (cover, groom, bride, gallery, dll)
   - Kustomisasi seksi (Love Story, Gift, QR Check-in, Teks Galeri Kenangan Tamu)
   - Kelola tamu + generate WhatsApp link personal (Deteksi cerdas Custom Domain / Subdomain & proteksi draft)
   - RSVP & ucapan real-time
     │
     ▼
6. PUBLISH
   HTML di-bake → disimpan ke 3 lokasi statis (subdomain, slug, ID)
   Subdomain aktif, undangan bisa diakses publik
     │
     ▼
7. HARI H & PASCA ACARA (DASHBOARD OPERASIONAL)
   - Tamu scan QR → Receptionist check-in (PIN-protected)
   - Tamu bagikan foto → /sharemoment (upload ke R2/Local)
   - Monitoring & moderasi kiriman foto tamu langsung di Dashboard Utama (/dashboard)
   - Klien beli Add-on Jasa Custom Domain via Settings → /api/client/custom-domain/buy (Otomatis include masa aktif URL Asli & Galeri 1 tahun)
   - Pasca Acara (H+7 / `retention_invitation_grace_days`): Undangan fisik ditutup, URL Asli otomatis beralih menyajikan Galeri Momen (/memories) dengan penguncian upload otomatis (`memoriesUploadLocked = true`)
   - Subdomain otomatis didaur ulang ke pool namespace pasca `subdomain_grace_days` jika `subdomain_auto_recycle = "true"`
   - Download koleksi foto ZIP (Client-side JSZip dengan proteksi status DRAFT & peringatan unduh dini) + Perpanjang Masa Aktif URL Asli / Galeri (+30 Hari via QRIS)

[Admin]
   ▼
ADMIN PORTAL (/admin)
   - Ringkasan (Overview): Metrik transaksi, klien aktif, omset
   - Pesanan (Orders): Kelola order, konfirmasi/tolak struk manual, cancel gateway
   - Klien (Users): Daftar akun klien, detail profil, dan aksi **Remote Dasbor Klien**
   - Undangan (Invitations): Manajemen siklus hidup (Close to Gallery, Extend), dan fitur **Remote Klien** untuk mengendalikan Dasbor Klien secara utuh tanpa password (berbasis *httpOnly Cookie Session Override* dengan mekanisme *Restore 1-Klik*).
   - Domain Kustom (Custom Domains): Monitoring domain klien, panduan konfigurasi Caddy, dan shortcut ke tab Setup DNS.
   - Tema (Themes): Manajemen katalog & sinkronisasi tema
   - Portofolio (Portfolio): Kurasi & kloning undangan pilihan → /portfolio
   - Tim (Team): Manajemen akun staff admin (SUPER_ADMIN, FINANCE, SUPPORT)
   - Pengaturan (Settings): 
     - **Tab Setup & Integrasi:** Konfigurasi DNS & IP Server (auto-detect IP publik VPS, CNAME target dinamis), SMTP Email Server, Batas Upload Galeri Tamu (MB), dan Siklus Hidup Subdomain & Retensi.
     - **Tab Platform:** Branding & Identitas Platform, CS Support, Hero Tagline, Fitur Landing Page, Template WhatsApp.
     - **Tab Paket & Harga:** Konfigurasi harga paket undangan (Traditional, Modern, Premium) serta 2 Layanan Tambahan (Add-Ons) resmi: Jasa Custom Domain (1 Thn) dan Perpanjang Masa Aktif URL Asli / Galeri (Bulanan).
     - **Tab Keuangan:** Rekening bank transfer manual dan 5 Payment Gateway.
   - Database (Database): Snapshot backup & restore PostgreSQL
   - Log (Logs): Audit aktivitas admin & webhook gateway logs
```

---

## URL Format Undangan & Relasi Arsitektur

```
Format Subdomain (Sementara menjelang & saat acara, H+subdomain_grace_days):
  https://dimas-clarissa.luxenary.id

Format URL Asli / Kanonikal (SATU-SATUNYA PINTU UTAMA / Single Source of Truth):
  https://luxenary.id/dimas-clarissa-030326
  (Pasca acara otomatis bertransformasi menjadi Galeri Kenangan Tamu)

Format Portofolio (HTML statis terisolasi):
  https://luxenary.id/portfolio/dimas-clarissa-030326

Format Custom Domain (SaaS Add-on 1 Tahun):
  https://dimas-clarissa.com (Auto-SSL Caddy & internal rewrite ke endpoint URL Asli)

Sub-routes publik:
  /dimas-clarissa-030326/memories     → Galeri foto tamu (real-time SSE)
  /dimas-clarissa-030326/sharemoment  → Upload foto tamu
  /s/[subdomain]/receptionist         → Scanner QR tamu (PIN-protected)
```

---

## Paket & Tema (15 Tema Fisik + 1 Blueprint)

| Paket | Tema Tersedia |
|:--|:--|
| **Traditional** | Prameswari, Badrika, Candani, Dillalucky, Mayang |
| **Modern** | Wave, Papercut, Ameera, Chronicle, Lumina, Solaria |
| **Premium** | Kalandra, Valente, Aurelia, Artisan *(Legacy Alias: Kila)* |

> Harga dapat diubah di Admin → tab Pengaturan tanpa deploy ulang.

### Standar Arsitektur Template Undangan
- **Cover Gate:** Tombol buka undangan (`data-lux-field="customLabels.openBtn"`) wajib memiliki teks fisik default `"Buka Undangan"` dan didukung fallback engine agar tidak pernah kosong/transparan.
- **Dukungan Video Loop Sinematik:** Mendukung video background loop pada `LANDING_COVER` (Cover pembuka), `DESKTOP_SIDEBAR` (Hero layar lebar), dan `GLOBAL_FIXED_BG` (Latar kartu). Sistem otomatis memotong klip menjadi maksimal 20 detik, membuang audio track (`-an`), mengunci frame rate ke 30 fps, serta menyuntikkan tag HTML `<video>` dengan overlay gradasi kontras.
- **Adaptive Full-Height Closing Section (`100vh`):** Seksi outro (`.site-footer` / `.closing-sec`) berukuran layar penuh `100vh` yang adaptif terhadap unggahan foto penutup (`CLOSING_COVER`):
  - *Mode Kanvas Kosong (Default):* Latar bersih sesuai palet tema tanpa dummy image palsu; teks ucapan terima kasih dan nama mempelai berposisi vertikal & horizontal tepat di tengah layar (`justify-content: center;`).
  - *Mode Foto Penutup:* Foto latar layar penuh dengan overlay gradasi; teks ucapan bergeser elegan ke bagian bawah layar (`justify-content: flex-end;`).

---

## Tech Stack

| Komponen | Teknologi |
|:--|:--|
| **Framework** | Next.js 16.3.2 (App Router) |
| **Bahasa** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + Vanilla CSS |
| **Database** | PostgreSQL via Prisma 7.9.1 (`pg`) |
| **Auth** | NextAuth.js v5 — Google OAuth + Credential Admin |
| **Media Storage** | Cloudflare R2 (prod) + Local `public/uploads/` (dev) via `lib/storage.ts` |
| **Image Processing** | `sharp` — WebP, resize, compress |
| **Video Processing** | `FFmpeg` — H.264, auto-trim 20s, no audio loop, 30fps cap, +faststart streaming |
| **Payment** | 5 Gateway (iPaymu, Duitku, Midtrans, TriPay, Xendit) + Transfer Bank Manual |
| **Mailer** | Nodemailer dengan kredensial SMTP dinamis via `admin_settings` |
| **Cron** | `POST /api/cron/cleanup` — retensi & cleanup otomatis |
| **Manajemen Proses** | PM2 (VPS) |

---

## Database Models

| Model | Fungsi |
|:--|:--|
| `User` | Akun klien (Google OAuth, role: CLIENT / ADMIN) |
| `Admin` | Akun tim admin (SUPER_ADMIN, FINANCE, SUPPORT) |
| `Order` | Invoice pembelian paket & perpanjangan galeri (`NEW`, `UPGRADE`, `GALLERY_EXTENSION`) |
| `Invitation` | Inti undangan (`DRAFT`, `PUBLISHED`, `EVENT_FINISHED`, `TAKEN_DOWN`, `ARCHIVED`) |
| `InvitationMedia` | Media per slot (8 slot: LANDING_COVER, HOME_PHOTO, GROOM_PHOTO, dll) |
| `Guest` | Daftar tamu + nomor kontak `phone` + QR token |
| `Rsvp` | Konfirmasi kehadiran tamu |
| `Wish` | Ucapan & doa tamu |
| `GuestMemory` | Foto candid kenangan tamu pasca-acara |
| `Theme` | Katalog tema undangan |
| `AdminSetting` | Konfigurasi platform dinamis (key-value) |
| `WebhookLog` | Log audit webhook payment (iPaymu, Duitku, Midtrans, TriPay, Xendit) |
| `AdminAuditLog` | Log aktivitas staf admin |

---

## Struktur Direktori

```
Luxenary-Invite/
├── app/
│   ├── (admin)/admin/         # Portal Admin (10 tab lengkap)
│   ├── (client)/dashboard/    # Studio klien (setup, invitation, guests, rsvp)
│   ├── (public)/
│   │   ├── [slug]/            # Canonical invitation route (graceful expired & memories redirect)
│   │   └── s/[subdomain]/     # Sub-routes via subdomain
│   ├── api/
│   │   ├── admin/             # overview, orders, themes, settings, portfolio, invitations/[id]/lifecycle
│   │   ├── client/            # invitations, guests, media, rsvps, upload, memories/extend
│   │   ├── public/            # settings, themes, rsvp, memories, resolve-custom-domain, version
│   │   ├── payments/          # checkout, status-stream
│   │   ├── orders/            # create invoice
│   │   ├── webhook/           # ipaymu, duitku, midtrans, tripay, xendit
│   │   ├── cron/              # cleanup (retensi otomatis H+7 & H+30)
│   │   └── sse/               # Server-Sent Events (memories real-time)
│   ├── checkout/              # Flow pembayaran (multi-gateway + manual transfer)
│   ├── demo/                  # Preview tema publik
│   ├── login/                 # Login klien
│   ├── onboarding/            # Flow setup awal pasca bayar
│   ├── packages/              # Halaman paket harga
│   ├── portfolio/             # Galeri portofolio publik terisolasi
│   ├── page.tsx               # Landing page utama
│   └── globals.css
├── lib/
│   ├── themeEngine.ts         # ⭐ Mesin render HTML undangan (CORE)
│   ├── staticPublisher.ts     # ⭐ Bake HTML statis saat Publish (CORE)
│   ├── renderTemplate.ts      # Injeksi data & mapping tema ke template .html
│   ├── storage.ts             # Upload/delete media (R2 / S3 / Local switch)
│   ├── mailer.ts              # ⭐ Nodemailer transactional & invoice email generator
│   ├── driveHelper.ts         # Fetch foto Google Drive API v3
│   ├── settings.ts            # Single source of truth admin_settings dari DB
│   ├── domainUtils.ts         # URL builder (subdomain, canonical)
│   ├── gatewayRegistry.ts     # Registry 5 payment gateway
│   ├── gateways/              # Implementasi gateway: iPaymu, Duitku, Midtrans, TriPay, Xendit
│   ├── upgradeHelper.ts       # Upgrade paket & perpanjangan galeri (+30 hari)
│   ├── rateLimit.ts           # Rate limiter API publik
│   ├── sseEmitter.ts          # SSE emitter (momen real-time)
│   └── videoOptimizer.ts      # Kompres video sebelum upload
├── themes/
│   ├── premium/               # 4 tema: kalandra, valente, aurelia, artisan
│   ├── modern/                # 6 tema: wave, papercut, ameera, chronicle, lumina, solaria
│   ├── traditional/           # 5 tema: prameswari, badrika, candani, dillalucky, mayang
│   └── starter-blueprint.html # Standar acuan struktur template tema
├── components/
│   ├── BrandLogo.tsx
│   ├── client/
│   │   └── MemoriesDownloadSection.tsx # Download ZIP & perpanjangan galeri
│   └── admin/
│       ├── AdminPortfolioTab.tsx
│       ├── AdminProfileSettings.tsx
│       └── AdminTeamManagement.tsx
├── public/
│   ├── published/             # HTML baked (subdomains/, slugs/, ids/)
│   ├── uploads/               # Media lokal (R2 di produksi)
│   ├── portfolio/             # HTML portofolio terisolasi + aset lokal WebP
│   ├── demo/                  # Preview tema
│   └── music/fonts/assets/    # Aset statis sistem
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── prisma.config.ts           # Prisma 7 DB URL configuration
├── docs/
│   ├── README.md                              # Pusat indeks dokumentasi platform
│   ├── ALUR_REGISTRASI_KE_DASHBOARD.md        # Alur lengkap registrasi Google hingga masuk studio
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
│   │   └── DEPLOYMENT_VPS_CADDY.md            # Panduan deployment VPS Ubuntu & Caddy TLS
│   └── public/
│       ├── 01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md # Multi-domain resolution, compiler & dynamic CSS
│       ├── 02_PENGALAMAN_TAMU_UNDANGAN.md     # Cover gate, audio autoplay policy, kalender & maps
│       ├── 03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md   # Form RSVP publik, rate limiting & nested wish reply
│       ├── 04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md # Rekening bank copy button, QRIS & kado fisik
│       ├── 05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md # Portal resepsionis, HTML5 QR scanner & souvenir
│       └── 06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md # Upload momen tamu, live slideshow proyektor venue
├── middleware.ts               # ⭐ Edge routing utama (CRITICAL)
├── SYSTEM_ARCHITECTURE.md      # ⭐ Dokumentasi arsitektur lengkap (WAJIB BACA)
├── AGENTS.md                   # Aturan perilaku AI Agent
└── deploy.sh                   # Script deploy VPS
```

---

## Instalasi & Setup

### 1. Install Dependensi
```bash
npm install
```

### 2. Environment Variables (`.env`)
```env
# Database (Prisma 7 via adapter-pg)
DATABASE_URL="postgresql://luxenary_user:password_rahasia@localhost:5432/luxenary?schema=public"

# NextAuth v5
AUTH_SECRET="min-32-chars-random"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (Klien)
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."

# Google API (untuk galeri Drive pre-wedding)
GOOGLE_API_KEY="..."

# Media Storage Provider ("local" | "r2" | "s3")
STORAGE_PROVIDER="local"
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_PUBLIC_URL="https://..."

# Keamanan Cron Cleanup
CRON_SECRET="your-secure-cron-token-here"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ROOT_DOMAIN="localhost:3000"
```

> **Catatan Pengaturan Dinamis:**  
> Kredensial Payment Gateway (iPaymu, Duitku, Midtrans, TriPay, Xendit), konfigurasi SMTP Email (Host, Port, User, Password), tarif fee, durasi QRIS, dan harga paket dapat diatur **secara langsung dari Admin Portal (Tab Pengaturan)** tanpa perlu restart server atau edit `.env`.

### 3. Setup Database
```bash
npx prisma db push
npx prisma db seed
```

### 4. Jalankan Dev Server
```bash
npm run dev
```

### 5. Sinkronisasi Tema
```
Admin Portal → Tab Tema → Klik "Sinkronisasi Tema"
```

---

## Build Produksi

```bash
npm run build
npm run start
# atau via PM2:
pm2 start ecosystem.config.js
```

---

## Keamanan

- **Webhook iPaymu**: Diverifikasi HMAC-SHA256 sebelum diproses
- **Auth Guard**: Middleware memisahkan Admin, Client, dan Publik
- **Upload**: Validasi kepemilikan via `userId` session
- **RSVP/Memories**: Rate-limited untuk cegah spam
- **Receptionist**: Scanner QR dilindungi `staffPin` (Hashed AES-256)
- **Portfolio**: Hanya SUPER_ADMIN yang bisa kloning undangan

---

## Protokol Otomatis Pembaruan Dokumentasi (Auto-Update on Edit/Push)

Platform ini menerapkan prinsip ketat: **Dokumentasi adalah cermin faktual dari kode riil**.
Setiap developer atau AI Agent yang melakukan modifikasi pada codebase **WAJIB** menjalankan siklus berikut:

```
[Edit / Modifikasi Kode]
         │
         ▼
[1. Baca Seluruh Kode Faktual] ──► Telusuri baris per baris tanpa asumsi
         │
         ▼
[2. Periksa & Perbarui 3 Docs] ──► SYSTEM_ARCHITECTURE.md + README.md + S-Invitation.md
         │
         ▼
[3. Verifikasi Empiris]        ──► Jalankan `npx tsc --noEmit` (Exit Code 0)
         │
         ▼
[4. Git Stage & Push]          ──► Commit & push kode bersamaan dengan docs ke `main`
```

### Aturan Baku Dokumentasi:
1. **Dilarang keras push tanpa menyelaraskan docs:** Jika ada penambahan endpoint, migrasi kolom database, gateway baru, atau perubahan alur UI, ketiga file dokumen (`README.md`, `SYSTEM_ARCHITECTURE.md`, `S-Invitation.md`) wajib langsung disinkronkan di commit yang sama.
2. **Katalog Tema Fisik:** Pastikan jumlah tema fisik yang aktif di database dan template selalu sinkron (15 tema fisik aktif).
3. **No Phantom Docs:** Dokumentasi harus mencantumkan path dan nama variabel lingkungan aktual (misal format AWS SDK `S3_*` untuk R2, bukan format lama).
4. **Standar Kontrak Placeholder Nama Mempelai:** Cover buka undangan, hero title, sidebar desktop, dan closing footer **MUTLAK** menggunakan Nama Panggilan (`{{firstName}} & {{secondName}}`). Nama lengkap beserta gelar (`{{firstDisplayName}} & {{secondDisplayName}}`) hanya digunakan pada Seksi Profil Pasangan (*The Couple*).

---

## Developer

- **Author**: [Arman Syam (AMS Dev)](https://github.com/armansyam)
- **Website**: [ammang.my.id](https://ammang.my.id)
- **License**: Proprietary & Non-Commercial — All Rights Reserved

---

> Untuk detail teknis lengkap, baca [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md)
