# Luxenary Invite — S-Invite Platform

> **Platform Undangan Pernikahan Digital B2C Self-Service**  
> Dibangun di atas Next.js 16 (App Router + Turbopack) · Prisma 7 (SQLite) · NextAuth v5 · iPaymu Payment Gateway

---

## Tentang Platform

Luxenary Invite adalah platform SaaS undangan pernikahan digital berbasis model **B2C (Business-to-Consumer)** di mana calon pengantin mendaftar mandiri, memilih paket, membayar via gateway atau transfer manual, lalu mengakses studio editor penuh untuk membangun undangan digital mereka sendiri.

Undangan yang dibuat dapat diakses publik melalui URL personal:

```
https://[domain]/[namagroom]-[namabride]/[slug]
```

---

## Alur Kerja B2C (Lengkap)

```
[Calon Klien]
     │
     ▼
1. LANDING PAGE (/)
   Katalog paket + demo tema
     │
     ▼
2. REGISTRASI (/register)
   Login via Google OAuth → Pilih paket
   (Traditional / Modern / Premium)
     │
     ▼
3. CHECKOUT (/checkout)
   Invoice otomatis dibuat (PENDING)
   Pilih metode pembayaran:
   ┌──────────────────┬──────────────────────────┐
   │  QRIS / Gateway  │  Transfer Bank Manual     │
   │  (iPaymu)        │                           │
   │                  │                           │
   │  Redirect ke     │  Klien transfer ke        │
   │  portal iPaymu   │  rekening resmi           │
   │       ↓          │       ↓                   │
   │  Bayar QRIS      │  Upload foto struk        │
   │       ↓          │       ↓                   │
   │  Webhook otomatis│  Admin verifikasi struk   │
   │  → PAID / EXPIRED│  → Konfirmasi / Tolak     │
   └──────────────────┴──────────────────────────┘
     │
     ▼
4. STUDIO UNDANGAN (/dashboard/setup → /dashboard/invitation/[id])
   Klien setup undangan:
   - Pilih & ganti tema (Traditional / Modern / Premium)
   - Isi data pengantin, keluarga, jadwal acara
   - Upload foto (cover, hero, couple, gallery)
   - Aktifkan seksi opsional (Love Story, Gift, QR, dll)
   - Kelola daftar tamu + WhatsApp link generator
     │
     ▼
5. UNDANGAN LIVE (/[groom]-[bride]/[slug])
   Akses publik oleh tamu undangan
   - Personalisasi nama tamu via ?to=NamaTamu
   - RSVP & ucapan real-time
   - QR check-in di lokasi acara
   - Video wishes booth

[Admin]
   │
   ▼
ADMIN PORTAL (/admin)
   - Tab Ringkasan: Metrik transaksi, klien aktif, omset
   - Tab Transaksi: Kelola order, konfirmasi/tolak struk
   - Tab Klien: Daftar klien & status akun
   - Tab Tema: Sinkronisasi & manajemen katalog tema
   - Tab Pengaturan: Konfigurasi harga, bank, gateway
   - Tab Cron: Cleanup otomatis order stale
```

---

## Status Order

| Status | Keterangan |
|:--|:--|
| `PENDING` | Invoice dibuat, menunggu pembayaran |
| `PAID` | Lunas — akses studio terbuka |
| `EXPIRED` | QRIS habis masa berlaku (via webhook gateway) |
| `FAILED` | Transfer ditolak admin / dibatalkan |

> ⚠️ **Catatan**: Hanya order QRIS yang bisa EXPIRED (dari gateway). Transfer Manual tidak punya timer — hanya admin yang dapat mengonfirmasi atau menolak.

---

## Paket & Tema

| Paket | Harga Default | Tema Tersedia |
|:--|:--|:--|
| **Traditional** | Rp 50.000 | Badrika, Candani, Dillalucky, Mayang, Prameswari |
| **Modern** | Rp 100.000 | Ameera, Chronicle, Lumina, Papercut, Solaria, Wave |
| **Premium** | Rp 120.000 | Artisan, Aurelia, Kalandra, Valente |

> Harga dapat diubah di Admin → tab Pengaturan tanpa perlu deploy ulang.

---

## Tech Stack

| Komponen | Teknologi |
|:--|:--|
| **Framework** | Next.js 16.3 (App Router + Turbopack) |
| **Bahasa** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + Vanilla CSS |
| **Database** | SQLite via Prisma 7 (`better-sqlite3`) |
| **Auth** | NextAuth.js v5 (Auth.js) — Google OAuth + Credential Admin |
| **Payment Gateway** | iPaymu (QRIS · VA · E-Wallet) + Transfer Bank Manual |
| **Image Compression** | `sharp` (WebP, 1400px, quality 82%) |
| **Cron / Cleanup** | `POST /api/cron/cleanup` (trigger manual / scheduler) |

---

## Struktur Direktori

```
Luxenary-Invite/
├── app/
│   ├── (admin)/admin/              # Portal Administrator (6 tab)
│   ├── (client)/
│   │   ├── dashboard/              # Studio klien (setup, invitation, guests, rsvp)
│   │   └── booth/                  # Video Wishes Booth (QR check-in)
│   ├── (public)/[groom]-[bride]/   # Halaman undangan publik
│   ├── api/
│   │   ├── admin/                  # overview, orders, themes, settings, subdomains
│   │   ├── client/                 # orders, invitations, guests, media, upload-proof
│   │   ├── orders/create/          # Buat/update invoice (One-Pending-Per-User)
│   │   ├── payments/checkout/      # Trigger QRIS ke iPaymu (auth-gated)
│   │   ├── public/                 # settings, themes, rsvp, version
│   │   ├── cron/cleanup/           # Hapus order PENDING stale > 7 hari
│   │   └── webhook/ipaymu/         # Listener webhook iPaymu (HMAC verified)
│   ├── checkout/                   # Halaman checkout (QRIS + Transfer)
│   ├── register/                   # Pilih paket awal
│   └── login/                      # Login Google OAuth
├── lib/
│   ├── ipaymu.ts                   # iPaymu gateway (HMAC sig, expiry sync, buyer data)
│   ├── settings.ts                 # Single source of truth pricing & platform config
│   ├── renderTemplate.ts           # Placeholder replacer untuk theme HTML
│   ├── demoRegistry.ts             # Data demo per tema (1676 baris)
│   └── demoPublisher.ts            # Pre-compile tema ke static HTML
├── themes/
│   ├── modern/                     # 6 tema modern
│   ├── premium/                    # 4 tema premium
│   └── traditional/                # 5 tema traditional
├── prisma/
│   ├── schema.prisma               # Model: User, Order, Invitation, Guest, dll
│   └── seed.ts                     # Seeder admin + tema default
└── middleware.ts                   # Route guard role-based (ADMIN / client / public)
```

---

## Database Models

```
User          → Akun klien (Google OAuth)
Order         → Invoice pembayaran (PENDING → PAID / EXPIRED / FAILED)
Invitation    → Undangan digital milik klien
InvitationMedia → 4 slot media per undangan
Guest         → Daftar tamu + WhatsApp link
Rsvp          → Konfirmasi kehadiran tamu
Wish          → Ucapan & doa dari tamu
Theme         → Katalog tema (sync dari /themes/)
AdminSetting  → Konfigurasi platform (harga, bank, gateway, dll)
WebhookLog    → Audit log semua webhook masuk
BoothSession  → Sesi video wishes booth
GuestMemory   → Foto/video dari booth
```

---

## Keamanan

- **Webhook iPaymu**: Diverifikasi HMAC-SHA256 (timing-safe) sebelum diproses
- **Checkout QRIS**: Hanya dapat diakses oleh pemilik order (session-authenticated)
- **Admin Approve**: Hanya order `PENDING` + wajib ada `proofImageUrl` untuk transfer manual
- **Upload Proof**: Validasi kepemilikan via `userId` atau `email` (toleran OAuth mismatch)
- **Route Guard**: Middleware Next.js memisahkan akses admin, klien, dan publik

---

## Instalasi & Setup

### 1. Prasyarat
- Node.js 20+
- npm / pnpm

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
AUTH_SECRET="your-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# iPaymu (Payment Gateway)
IPAYMU_VA="0000000000000000"
IPAYMU_API_KEY="your-ipaymu-api-key"
IPAYMU_SANDBOX="true"   # false untuk produksi

# App URL (untuk webhook & redirect)
APP_URL="http://localhost:3000"
```

### 4. Setup Database
```bash
# Sinkronkan skema
npx prisma db push

# Seed: buat akun admin + tema default
npx prisma db seed
```

### 5. Jalankan Dev Server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### 6. Sinkronisasi Tema (Setelah Tambah File HTML)
```
Admin Portal → Tab Tema → Klik "Sinkronisasi Tema"
```

---

## Konfigurasi Admin (Runtime)

Semua pengaturan berikut bisa diubah langsung dari **Admin Portal → Pengaturan** tanpa deploy ulang:

| Setting | Keterangan |
|:--|:--|
| Harga Traditional / Modern / Premium | Harga paket per kategori |
| Nama & nomor rekening bank | Info transfer manual |
| Mode pembayaran | `BOTH` · `GATEWAY` · `MANUAL` |
| iPaymu VA & API Key | Kredensial gateway |
| iPaymu Mode | `sandbox` / `production` |
| QRIS Expiry (menit) | Dikirim langsung ke iPaymu saat generate QRIS |
| Platform name, tagline, support WA | Info branding |

---

## Build Produksi

```bash
npm run build
npm run start
```

---

## Developer

- **Author**: [Arman Syam (AMS Dev)](https://github.com/armansyam)
- **Website**: [ammang.my.id](https://ammang.my.id)
- **License**: Proprietary & Non-Commercial — All Rights Reserved
