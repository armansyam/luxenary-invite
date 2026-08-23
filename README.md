# 💍 Luxenary Invite (S-Invite)

> **Platform Undangan Pernikahan Digital Eksklusif & Self-Service**  
> Dibangun dengan Next.js 16 (App Router + Turbopack), Tailwind CSS v4, Prisma 7 (SQLite Engine), NextAuth v5 (Auth.js), serta integrasi Payment Gateway otomatis (Midtrans Snap & iPaymu).

---

## 🌟 Fitur Utama

- **🎨 Multi-Theme Engine**:
  - **Heritage Series**: Ornamen tradisional dengan sentuhan etnik modern.
  - **Moody Papercut Series**: Minimalis bertema tekstur kertas yang elegan dan ringan.
  - **Premium Series (Kila, Ivanna, Danila)**: Split desktop layout, fixed background, video backdrop, dan efek *slide smooth scroll*.
- **💌 Unlimited Undangan Per User**: Satu akun dapat membuat berbagai variasi undangan (Akad, Resepsi, Undangan Khusus, dll).
- **🔗 Personalisasi Tamu & WhatsApp Link Generator**:
  - Generator URL instan untuk setiap tamu (`domain.com/[groom]-[bride]/[slug]?to=[Nama+Tamu]`).
  - Template broadcast pesan WhatsApp otomatis dengan satu klik.
  - QR Code Check-in untuk validasi kehadiran fisik.
- **📝 RSVP & Buku Tamu Real-time**:
  - Formulir konfirmasi kehadiran interaktif (Hadir / Berhalangan, Jumlah Tamu).
  - Kolom doa restu & ucapan yang langsung muncul di aliran *wishes stream*.
- **🎁 Amplop Digital & Rekening Bank**:
  - Dukungan multi-rekening bank dengan tombol salin nomor rekening 1-klik (*copy-to-clipboard*).
  - Alamat pengiriman kado fisik.
- **💳 Payment Gateway Terintegrasi**:
  - Integrasi Midtrans Snap & iPaymu (QRIS, BCA/Mandiri/BNI Virtual Account, GoPay, OVO).
  - Webhook listener untuk aktivasi instan status paket (Basic / Premium).
- **🛡️ Admin & Client Dashboard**:
  - **Client Portal**: Manajemen profil pengantin, jadwal acara, galeri foto, kisah cinta, media background, dan daftar tamu.
  - **Admin Control Center**: Monitoring omset transaksi, metrik undangan, manajemen klien, katalog tema, dan audit log webhook.

---

## 🏗️ Tech Stack

| Komponen | Teknologi / Library |
| :--- | :--- |
| **Framework** | Next.js 16.3.2 (App Router & Turbopack) |
| **Styling** | Tailwind CSS v4 |
| **Database & ORM** | SQLite & Prisma 7.9.1 (`@prisma/adapter-better-sqlite3`) |
| **Authentication** | NextAuth.js v5 (Auth.js) dengan Google OAuth |
| **Payments** | Midtrans Client & Server SDK, iPaymu API |
| **Icons & Media** | Google Fonts (Cormorant Garamond, Montserrat, Playfair Display) |

---

## 📁 Struktur Direktori

```text
Luxenary-Invite/
├── app/
│   ├── (admin)/admin/         # Portal Administrator & Monitoring
│   ├── (client)/dashboard/     # Portal Pengantin / Klien
│   │   ├── guests/            # Manajemen Tamu & Link WhatsApp
│   │   └── invitation/        # Edit Informasi, Media, & Toggles
│   ├── (public)/              # Dynamic Route Undangan /[groom]-[bride]/[invitationSlug]
│   ├── api/                   # REST API Endpoints
│   │   ├── admin/overview/    # Metrik & Statistik Admin
│   │   ├── client/            # API Undangan, Tamu, & Media
│   │   ├── public/rsvp/       # Endpoint RSVP & Ucapan Tamu
│   │   ├── public/version/    # Endpoint Watermark & Release Version
│   │   └── webhook/           # Listener Midtrans & iPaymu
│   ├── demo/                  # Halaman Demo Pratinjau Tema Kila
│   ├── login/                 # Halaman Login OAuth Google
│   └── page.tsx               # Landing Page Mewah
├── lib/
│   ├── auth.ts                # Konfigurasi NextAuth / Auth.js
│   ├── payments.ts            # Handler Midtrans & iPaymu
│   ├── prisma.ts              # Inisialisasi Prisma Client + BetterSQLite3
│   ├── renderTemplate.ts      # Template Placeholder Replacer
│   └── themeEngine.ts         # Composer Data Tema Undangan
├── prisma/
│   ├── schema.prisma          # Skema Database Prisma (SQLite)
│   └── seed.ts                # Seeder Akun Admin & Tema Default
├── themes/
│   └── kila.html              # Template Master Kila Series
├── middleware.ts              # Route Guard Role-Based Auth
└── prisma.config.ts           # Konfigurasi Prisma 7
```

---

## 🚀 Memulai (Getting Started)

### 1. Prasyarat
- Node.js versi 20+
- npm / yarn / pnpm

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Buat file `.env` di direktori *root* proyek:
```env
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
AUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Midtrans Payment Gateway
MIDTRANS_SERVER_KEY="SB-Mid-server-xxxx"
MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxx"
MIDTRANS_IS_PRODUCTION="false"

# iPaymu Payment Gateway (Opsional)
IPAYMU_API_KEY="your-ipaymu-api-key"
IPAYMU_VA="your-ipaymu-va"
```

### 4. Setup Database & Seeding
```bash
# Push skema ke database SQLite dev.db
npx prisma db push

# Jalankan seeder tema & admin default
npx prisma db seed
```

### 5. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🧪 Validasi & Build Produksi

Untuk memastikan tidak ada kesalahan tipe TypeScript atau *bundling*:
```bash
npm run build
```

---

## 👨‍💻 Developer & Signature

- **Author / Lead Developer**: [Arman Syam (AMS Dev)](https://github.com/armansyam)
- **Website**: [ammang.my.id](https://ammang.my.id)
- **License**: Proprietary & Non-Commercial
