# Luxenary Invite (S-Invite)

> **Platform Undangan Pernikahan Digital Eksklusif & Self-Service**  
> Dibangun dengan Next.js 16 (App Router + Turbopack), Tailwind CSS v4, Prisma 7 (SQLite Engine), NextAuth v5 (Auth.js), serta integrasi Payment Gateway otomatis (Midtrans Snap & iPaymu).

---

## 1. Fitur Utama

- **Multi-Theme Engine (Sesuai Benchmark Attarivitation & ByAttari)**:
  - **Heritage Series (Aruna)**: Ornamen kultural hangat, aksen batik terracotta emas yang ramah di mata dengan audio backsound handler.
  - **Moody Papercut Series**: Minimalis casual bertema tekstur kertas linen/kraft hangat (*earth tone*), hemat kuota data, dan ringan.
  - **Premium Series (Kila, Ivanna, Danila)**: Split desktop layout, fixed background, video backdrop, dan efek *CSS scroll-snap* mulus 60 FPS bernuansa *champagne silk* dan *coastal stone*.
- **Unlimited Undangan Per Klien**: Satu akun dapat membuat berbagai variasi undangan (Akad, Resepsi, Undangan Khusus, dll).
- **Personalisasi Tamu & WhatsApp Link Generator**:
  - Generator URL instan untuk setiap tamu (`domain.com/[groom]-[bride]/[slug]?to=[Nama+Tamu]`).
  - Template broadcast pesan WhatsApp otomatis dengan satu klik.
  - QR Code Check-in untuk validasi kehadiran fisik.
- **RSVP & Buku Tamu Real-time**:
  - Formulir konfirmasi kehadiran interaktif (Hadir / Berhalangan, Jumlah Tamu).
  - Kolom doa restu & ucapan yang langsung muncul di aliran *wishes stream*.
- **Amplop Digital & Rekening Bank**:
  - Dukungan multi-rekening bank dengan tombol salin nomor rekening 1-klik (*copy-to-clipboard*).
  - Alamat pengiriman kado fisik.
- **Interactive Video Wishes Booth (QR Code Check-In)**:
  - Modul perekaman video ucapan langsung di lokasi acara melalui scan QR code tamu dengan pengamanan *single-use token*.
- **Payment Gateway Terintegrasi**:
  - Integrasi Midtrans Snap & iPaymu (QRIS, Virtual Account, GoPay, OVO).
  - Webhook listener untuk aktivasi instan status paket (Basic / Premium).
- **Admin & Client Dashboard**:
  - **Client Portal**: Manajemen profil pengantin, jadwal acara, galeri foto, kisah cinta, media background, dan daftar tamu.
  - **Admin Control Center**: Monitoring omset transaksi, metrik undangan, manajemen klien, katalog tema, dan audit log webhook.

---

## 2. Standar Desain: Casual Luxury & Non-AI Tropes

Sesuai spesifikasi PRD v5.4:
- **No Generic Emojis**: Dilarang menggunakan emoji standar ponsel/browser di seluruh halaman, tombol, form, maupun badge teks.
- **Pure SVG Vector Icons**: Semua indikator visual menggunakan ikon SVG vektor yang tajam, minimalis, dan elegan.
- **Authentic Casual Luxury (Anti-Dark Cyber Tropes)**: Menghindari palet hitam pekat gelap ala tech/crypto. Seluruh antarmuka menggunakan perpaduan warna alami yang hangat (*warm ivory*, *sand beige*, *terracotta*, *champagne gold*, dan *coastal stone*) yang menenangkan, berjiwa muda, dan mencerminkan keanggunan sejati pesta pernikahan.
- **Tipografi Bernafas**: Mengutamakan kombinasi Google Fonts berkelas (*Cormorant Garamond*, *Cinzel*, *Bodoni Moda*, *Italiana*, *Montserrat*, *Plus Jakarta Sans*).

---

## 3. Tech Stack

| Komponen | Teknologi / Library |
| :--- | :--- |
| **Framework** | Next.js 16.3.2 (App Router & Turbopack) |
| **Styling** | Tailwind CSS v4 & Vanilla CSS Modular |
| **Database & ORM** | SQLite & Prisma 7.9.1 (`@prisma/adapter-better-sqlite3`) |
| **Authentication** | NextAuth.js v5 (Auth.js) dengan Google OAuth |
| **Payments** | Midtrans Client & Server SDK, iPaymu API |
| **Media & Assets** | HTML5 MediaRecorder API, Clean SVG Vectors |

---

## 4. Struktur Direktori

```text
Luxenary-Invite/
├── app/
│   ├── (admin)/admin/         # Portal Administrator & Monitoring (6 Tabs)
│   ├── (client)/
│   │   ├── dashboard/         # Portal Pengantin / Klien
│   │   │   ├── guests/        # Manajemen Tamu & Smart WhatsApp Dispatcher
│   │   │   └── invitation/    # Form 4 Slot Media & Fitur Toggles
│   │   └── booth/             # Video Wishes Booth & QR Scanner
│   ├── (public)/              # Dynamic Route Undangan /[groom]-[bride]/[invitationSlug]
│   ├── api/                   # REST API Endpoints
│   │   ├── admin/overview/    # Metrik & Statistik Admin
│   │   ├── booth/             # API Scanner & Upload Video Booth
│   │   ├── client/            # API Undangan, Tamu, & Media
│   │   ├── public/rsvp/       # Endpoint RSVP & Ucapan Tamu
│   │   ├── public/version/    # Endpoint Watermark & Release Version
│   │   └── webhook/           # Listener Midtrans & iPaymu
│   ├── demo/                  # Halaman Demo Pratinjau Multi-Tema
│   ├── login/                 # Halaman Login OAuth Google
│   └── page.tsx               # Landing Page Mewah & Hangat
├── lib/
│   ├── auth.ts                # Konfigurasi NextAuth / Auth.js
│   ├── payments.ts            # Handler Midtrans & iPaymu
│   ├── prisma.ts              # Inisialisasi Prisma Client + BetterSQLite3
│   ├── renderTemplate.ts      # Template Placeholder Replacer & Theme Resolver
│   └── themeEngine.ts         # Composer Data Tema Undangan
├── prisma/
│   ├── schema.prisma          # Skema Database Prisma (SQLite)
│   └── seed.ts                # Seeder Akun Admin & Tema Default
├── themes/
│   ├── kila.html              # Template Master Premium Kila (Section Overlap)
│   ├── aruna.html             # Template Master Heritage Aruna (Warm Ivory & Gold)
│   ├── ivanna.html            # Template Master Premium Ivanna (Editorial Snap)
│   ├── danila.html            # Template Master Premium Danila (Champagne Silk)
│   └── papercut.html          # Template Master Moody Papercut (Craft Paper Texture)
├── middleware.ts              # Route Guard Role-Based Auth
└── prisma.config.ts           # Konfigurasi Prisma 7
```

---

## 5. Memulai (Getting Started)

### 1. Prasyarat
- Node.js versi 20+
- npm / yarn / pnpm

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Buat file `.env` di direktori root proyek:
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
# Sinkronkan skema ke database SQLite dev.db
npx prisma db push

# Jalankan seeder tema & akun admin default
npx prisma db seed
```

### 5. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 6. Validasi & Build Produksi

Untuk memastikan integritas tipe TypeScript dan performa build:
```bash
npm run build
```

---

## 7. Developer & Signature

- **Author / Lead Developer**: [Arman Syam (AMS Dev)](https://github.com/armansyam)
- **Website**: [ammang.my.id](https://ammang.my.id)
- **License**: Proprietary & Non-Commercial
