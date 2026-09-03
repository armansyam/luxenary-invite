# Luxenary Invite — S-Invite Platform

> **Platform Undangan Pernikahan Digital B2C Self-Service**  
> Next.js 16.3.2 · Prisma 7.9 (PostgreSQL) · NextAuth v5 · Multi-Gateway (5 Gateway) · Nodemailer SMTP · Cloudflare R2  
> **Versi Dokumen: 5.2.0 | Diperbarui: 03 September 2026**

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
   Invoice dibuat (PENDING)
   ┌─────────────────────────────────────┬──────────────────────────┐
   │  Multi-Gateway (5 Gateway Aktif)    │  Transfer Bank Manual    │
   │  iPaymu / Duitku / Midtrans /       │                          │
   │  TriPay / Xendit (QRIS/VA/E-Wallet) │  Upload struk → Admin    │
   │  → Webhook Auto-PAID + Invoice Email│  verifikasi manual       │
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
   - Upload foto (cover, groom, bride, gallery, dll)
   - Aktifkan seksi opsional (Love Story, Gift, QR Check-in, dll)
   - Kelola tamu + generate WhatsApp link personal (+62 auto-format)
   - RSVP & ucapan real-time
     │
     ▼
6. PUBLISH
   HTML di-bake → disimpan ke 3 lokasi statis (subdomain, slug, ID)
   Subdomain aktif, undangan bisa diakses publik
     │
     ▼
7. HARI H & PASCA ACARA
   - Tamu scan QR → Receptionist check-in (PIN-protected)
   - Tamu bagikan foto → /sharemoment (upload ke R2/Local)
   - Klien beli Add-on Custom Domain via Settings → /api/client/custom-domain/buy
   - Pasca Acara (H+7): Dialihkan ke Galeri Momen (/memories)
   - Download koleksi foto ZIP + Perpanjang Galeri (+30 Hari via QRIS)

[Admin]
   ▼
ADMIN PORTAL (/admin)
   - Ringkasan (Overview): Metrik transaksi, klien aktif, omset
   - Pesanan (Orders): Kelola order, konfirmasi/tolak struk manual, cancel gateway
   - Klien (Users): Daftar akun klien & status undangan
   - Undangan (Invitations): Manajemen siklus hidup (Close to Gallery, Extend)
   - Tema (Themes): Manajemen katalog & sinkronisasi tema
   - Portofolio (Portfolio): Kurasi & kloning undangan pilihan → /portfolio
   - Tim (Team): Manajemen akun staff admin (SUPER_ADMIN, FINANCE, SUPPORT)
   - Pengaturan (Settings): Konfigurasi harga, bank, 5 gateway, SMTP, retensi
   - Database (Database): Snapshot backup & restore PostgreSQL
   - Log (Logs): Audit aktivitas admin & webhook gateway logs
```

---

## URL Format Undangan

```
Format Subdomain (aktif selama masa acara):
  https://dimas-clarissa.luxenary.id

Format Canonical Flat Slug (permanen):
  https://luxenary.id/dimas-clarissa-030326

Format Portofolio (HTML statis terisolasi):
  https://luxenary.id/portfolio/dimas-clarissa-030326

Format Custom Domain (SaaS Add-on):
  https://dimas-clarissa.com (Membutuhkan resolve-custom-domain dan konfigurasi Nginx Admin)

Sub-routes publik:
  /dimas-clarissa-030326/memories     → Galeri foto tamu (real-time SSE)
  /dimas-clarissa-030326/sharemoment  → Upload foto tamu
  /s/[subdomain]/receptionist         → Scanner QR tamu (PIN-protected)
```

---

## Paket & Tema (15 Tema Fisik + 1 Blueprint)

| Paket | Tema Tersedia |
|:--|:--|
| **Traditional** | Prameswari, Badrika, Candani, Dillalucky, Mayang *(Legacy Alias: Aruna, Heritage-Aruna)* |
| **Modern** | Wave, Papercut, Ameera, Chronicle, Lumina, Solaria |
| **Premium** | Kalandra, Valente, Aurelia, Artisan *(Legacy Alias: Kila, Ivanna, Danila)* |

> Harga dapat diubah di Admin → tab Pengaturan tanpa deploy ulang.

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
| `GuestMemory` | Foto/video kenangan tamu pasca-acara |
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

---

## Developer

- **Author**: [Arman Syam (AMS Dev)](https://github.com/armansyam)
- **Website**: [ammang.my.id](https://ammang.my.id)
- **License**: Proprietary & Non-Commercial — All Rights Reserved

---

> Untuk detail teknis lengkap, baca [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md)
