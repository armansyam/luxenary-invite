# Luxenary Invite — S-Invite Platform

> **Platform Undangan Pernikahan Digital B2C Self-Service**  
> Next.js 16.3.2 · Prisma 7.9 (PostgreSQL) · NextAuth v5 · iPaymu · Cloudflare R2  
> **Versi Dokumen: 5.0.0 | Diperbarui: 02 September 2026**

> [!IMPORTANT]
> Baca [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md) sebelum mulai coding.  
> Dokumen tersebut adalah **sumber kebenaran tunggal** arsitektur, routing, DB schema, dan panduan agent AI.

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
   ┌────────────────────┬──────────────────────────┐
   │  Gateway (iPaymu)  │  Transfer Bank Manual    │
   │  QRIS/VA/E-Wallet  │                          │
   │  → Webhook PAID    │  Upload struk → Admin    │
   │                    │  verifikasi manual       │
   └────────────────────┴──────────────────────────┘
     │
     ▼
4. ONBOARDING (/onboarding)
   Setup awal: pilih subdomain, isi nama pengantin
     │
     ▼
5. STUDIO UNDANGAN (/dashboard/invitation/[id])
   - Pilih & ganti tema (17 tema)
   - Isi data pengantin, keluarga, jadwal acara
   - Upload foto (cover, groom, bride, gallery, dll)
   - Aktifkan seksi opsional (Love Story, Gift, QR Check-in, dll)
   - Kelola tamu + generate WhatsApp link personal
   - RSVP & ucapan real-time
     │
     ▼
6. PUBLISH
   HTML di-bake → disimpan ke 3 lokasi statis
   Subdomain aktif, undangan bisa diakses publik
     │
     ▼
7. HARI H
   Tamu scan QR → Receptionist check-in (PIN-protected)
   Tamu bagikan foto → /sharemoment (upload ke R2/Local)

[Admin]
   ▼
ADMIN PORTAL (/admin)
   - Ringkasan: Metrik transaksi, klien aktif, omset
   - Transaksi: Kelola order, konfirmasi/tolak struk manual
   - Klien: Daftar klien & status undangan
   - Tema: Manajemen katalog tema
   - Pengaturan: Konfigurasi harga, bank, gateway, branding
   - Portofolio: Kurasi & kloning undangan pilihan → /portfolio
   - Cron: Cleanup otomatis undangan kedaluwarsa
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

Sub-routes publik:
  /dimas-clarissa-030326/memories     → Galeri foto tamu
  /dimas-clarissa-030326/sharemoment  → Upload foto tamu
  /s/[subdomain]/receptionist     → Scanner QR (PIN-protected)
```

---

## Paket & Tema (17 Tema Total)

| Paket | Tema Tersedia |
|:--|:--|
| **Traditional** | Badrika, Candani, Dillalucky, Mayang, Prameswari, Aruna, Heritage-Aruna |
| **Modern** | Ameera, Chronicle, Lumina, Papercut, Moody-Papercut, Solaria, Wave |
| **Premium** | Artisan, Aurelia, Kalandra, Kila, Ivanna, Danila, Valente |

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
| **Media Storage** | Cloudflare R2 (prod) + Local `public/uploads/` (dev) |
| **Image Processing** | `sharp` — WebP, resize, compress |
| **Payment** | iPaymu (QRIS, VA, E-Wallet) + Transfer Bank Manual |
| **Cron** | `POST /api/cron/cleanup` — cleanup otomatis |
| **Manajemen Proses** | PM2 (VPS) |

---

## Database Models

| Model | Fungsi |
|:--|:--|
| `User` | Akun klien (Google OAuth) |
| `Admin` | Akun tim admin (SUPER_ADMIN, FINANCE, SUPPORT) |
| `Order` | Invoice pembelian paket |
| `Invitation` | Inti undangan (DRAFT / PUBLISHED) |
| `InvitationMedia` | Media per slot (8 slot: LANDING_COVER, HOME_PHOTO, GROOM_PHOTO, dll) |
| `Guest` | Daftar tamu + QR token |
| `Rsvp` | Konfirmasi kehadiran tamu |
| `Wish` | Ucapan & doa tamu |
| `GuestMemory` | Foto/video kenangan tamu pasca-acara |
| `Theme` | Katalog tema undangan |
| `AdminSetting` | Konfigurasi platform (key-value) |
| `WebhookLog` | Log audit webhook payment |
| `AdminAuditLog` | Log aktivitas admin |

---

## Struktur Direktori

```
Luxenary-Invite/
├── app/
│   ├── (admin)/admin/         # Portal Admin (SUPER_ADMIN)
│   ├── (client)/dashboard/    # Studio klien (setup, invitation, guests, rsvp)
│   ├── (public)/
│   │   ├── [slug]/            # Canonical invitation route
│   │   └── s/[subdomain]/     # Sub-routes via subdomain
│   ├── api/
│   │   ├── admin/             # overview, orders, themes, settings, portfolio
│   │   ├── client/            # invitations, guests, media, rsvps, upload
│   │   ├── public/            # settings, themes, rsvp, memories, version
│   │   ├── payments/          # checkout, status-stream
│   │   ├── orders/            # create invoice
│   │   ├── webhook/           # ipaymu, midtrans
│   │   ├── cron/              # cleanup
│   │   └── sse/               # Server-Sent Events (memories real-time)
│   ├── checkout/              # Flow pembayaran
│   ├── demo/                  # Preview tema publik
│   ├── login/                 # Login klien
│   ├── onboarding/            # Flow setup awal pasca bayar
│   ├── packages/              # Halaman paket harga
│   ├── portfolio/             # Galeri portofolio publik
│   ├── page.tsx               # Landing page utama
│   └── globals.css
├── lib/
│   ├── themeEngine.ts         # ⭐ Mesin render HTML undangan (81KB, CORE)
│   ├── staticPublisher.ts     # ⭐ Bake HTML statis saat Publish (CORE)
│   ├── renderTemplate.ts      # Injeksi data ke template .html
│   ├── storage.ts             # Upload/delete media (R2 atau Local)
│   ├── driveHelper.ts         # Fetch foto Google Drive API v3
│   ├── settings.ts            # Baca admin_settings dari DB
│   ├── domainUtils.ts         # URL builder (subdomain, canonical)
│   ├── gatewayRegistry.ts     # Registry payment gateway
│   ├── ipaymu.ts              # iPaymu client
│   ├── rateLimit.ts           # Rate limiter API publik
│   ├── sseEmitter.ts          # SSE emitter (momen real-time)
│   └── videoOptimizer.ts      # Kompres video sebelum upload
├── themes/
│   ├── premium/               # 7 tema premium
│   ├── modern/                # 7 tema modern
│   └── traditional/           # 7 tema traditional
├── components/
│   ├── BrandLogo.tsx
│   └── admin/
│       ├── AdminPortfolioTab.tsx
│       ├── AdminProfileSettings.tsx
│       └── AdminTeamManagement.tsx
├── public/
│   ├── published/             # HTML baked (subdomains/, slugs/, ids/)
│   ├── uploads/               # Media lokal (R2 di produksi)
│   ├── portfolio/             # HTML portofolio terisolasi + aset
│   ├── demo/                  # Preview tema
│   └── music/fonts/assets/    # Aset statis sistem
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
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
# Database
DATABASE_URL="postgresql://luxenary_user:password_rahasia@localhost:5432/luxenary?schema=public"

# NextAuth
AUTH_SECRET="min-32-chars-random"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."

# Google API (untuk Drive gallery)
GOOGLE_API_KEY="..."

# Media Storage
STORAGE_MODE="local"          # atau "r2" untuk produksi
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_PUBLIC_URL="https://..."

# iPaymu Payment
IPAYMU_VA="0000000000000000"
IPAYMU_API_KEY="..."
IPAYMU_SANDBOX="true"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ROOT_DOMAIN="localhost:3000"
```

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

## Developer

- **Author**: [Arman Syam (AMS Dev)](https://github.com/armansyam)
- **Website**: [ammang.my.id](https://ammang.my.id)
- **License**: Proprietary & Non-Commercial — All Rights Reserved

---

> Untuk detail teknis lengkap, baca [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md)
