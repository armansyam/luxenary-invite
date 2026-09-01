# LUXENARY INVITE — DOKUMENTASI ARSITEKTUR & SISTEM (V3.1.0 - Faktual Empiris)

**Tanggal Pembaruan:** 30 Agustus 2026
**Tujuan Dokumen:** Buku putih (*Whitepaper*) teknis berbasis analisis empiris kode sumber. Dokumen ini menjadi referensi definitif bagi arsitek perangkat lunak, tim *developer*, dan operasional server.

---

## 1. FONDASI INFRASTRUKTUR & DATABASE

Aplikasi Luxenary Invite menghindari latensi koneksi jarak jauh (TCP/IP) yang sering terjadi pada database konvensional, dengan menanamkan database tepat di titik komputasi Edge/VPS.

### Spesifikasi Inti:
- **Framework:** Next.js 15 (App Router)
- **Runtime:** Node.js (Berjalan di atas VPS)
- **Database Utama:** **SQLite** terintegrasi via Prisma ORM menggunakan *adapter* khusus `@prisma/adapter-better-sqlite3` dan `better-sqlite3`. Memberikan kecepatan baca ultra-rendah latensi.
- **Sistem Pencadangan Otomatis (Hot-Backup):** Modul `lib/databaseBackup.ts` memungkinkan pengambilan *snapshot* instan dari database SQLite (tanpa menghentikan server).
- **Manajemen Proses:** PM2 (Proses latar belakang berkesinambungan).

---

## 2. MESIN PUBLIKASI STATIS (0-DATABASE BYPASS)

Kecepatan luar biasa dari aplikasi ini dihasilkan oleh modul **`lib/staticPublisher.ts`**. Saat undangan dikunci (*Published*), sistem tidak lagi merender data secara dinamis dari database (SSR/API):
- Sistem "memanggang" (*Baking*) keseluruhan data (Tema, Acara, Cerita Cinta) menjadi **1 (satu) berkas HTML statis tunggal**.
- Hasil HTML disimpan di dalam folder publik: `public/published/{namaclient}.html`.
- **Hasil Akhir:** Ratusan ribu tamu yang mengakses halaman publik akan dilayani murni dari berkas statis (*Flat File*). Ini membebaskan 100% beban CPU dan Database VPS. Tidak ada lagi rute dinamis (seperti `app/(public)`) untuk undangan yang sudah terbit.

---

## 3. PENGALIHAN CERDAS (1 FILE, 2 JALUR AKSES)

Sistem merutekan (*routing*) pengunjung tamu menggunakan **`middleware.ts`** di lapisan depan (Edge). Middleware ini bertugas mencocokkan URL yang diketik tamu ke file statis tunggal yang dibuat di tahap Publikasi.

Terdapat 2 jalur utama yang sama-sama menuju 1 file HTML yang sama (`/published/{namaclient}.html`):
1. **Jalur Subdomain:** `namaclient.domain.id` (Biasa digunakan untuk undangan VIP/Utama).
2. **Jalur Portofolio (Canonical):** `domain.id/namaclient` (Digunakan sebagai portofolio atau jalur akses alternatif jika sistem *wildcard DNS* bermasalah).

*(Catatan: Rute sensitif seperti `/admin`, `/login`, `/dashboard`, dan `/api` dilindungi dari *rewrite* statis ini).*

---

## 4. SIKLUS HIDUP UNDANGAN (DYNAMIC EXPIRATION CRON)

File HTML undangan **TIDAK hidup selamanya**. Pembersihan penyimpanan dikelola oleh *Cron Job* harian otomatis (`scripts/cron-cleanup.ts`):
- Sistem tidak menggunakan hardcode waktu. *Cron Job* membaca parameter `retention_invitation_days` langsung dari database (`admin_settings`, default 30 hari).
- Setiap malam, *Cron Job* menghitung: `Jika Waktu Sekarang > (Tanggal Acara Pernikahan + Retention Days)`.
- Jika masa tenggang terlewati, sistem akan **menghapus secara fisik** file `public/published/{namaclient}.html` dan mengosongkan status *subdomain* dari klien tersebut agar namanya bisa dipakai oleh klien baru.

---

## 5. ARSITEKTUR PENGIRIMAN MEDIA (THREE-WAY STREAMING)

Aplikasi sama sekali **TIDAK** menggunakan kapasitas penuh Harddisk VPS untuk menyajikan media. Media didistribusikan melalui tiga jalur terpisah:
1. **Cloudflare R2 (Aset Inti & Tamu):** Modul `lib/storage.ts` melakukan *stream* objek `Buffer` langsung ke R2. Folder `guest-memories/` diatur dengan *Object Lifecycle* agar otomatis terhapus dalam 60 hari.
2. **Google Drive (Galeri Pre-Wedding):** Aset terberat (foto resolusi tinggi) di-*streaming* langsung dari G-Drive via `lib/driveHelper.ts` dan di-cache oleh Cloudflare Edge selama 30 hari.
3. **YouTube / Vimeo (Video):** Ditangani murni melalui *Embed Parser*, mengorbankan *bandwidth* YouTube, bukan server lokal.

*(Catatan: `lib/videoOptimizer.ts` dan FFmpeg internal memastikan video format lokal dikompres menggunakan codec `libx264` + `faststart` dan audio dikompres ke MP3 128kbps sebelum masuk ke Cloudflare R2).*

---

## 6. SISTEM TEMA & BLUEPRINT MASTERING (THEME ENGINE)

Modul **`lib/themeEngine.ts`** adalah motor utama perenderan presentasi HTML ke bentuk dinamis tanpa mengganggu desainer eksternal:
- **Master Blueprint Identik (1:1 Ratio):** File `public/downloads/starter-blueprint.html` bertindak sebagai *Master Template* murni (tanpa script *backend*).
- **Injeksi JavaScript Dinamis:** *Engine* otomatis menyuntikkan *Player* Audio, Hitung Mundur, dan Form RSVP saat proses "Panggang" ke dalam *placeholder*.
- **Zero-Conflict:** Tema yang mengikuti desain *blueprint* akan *plug-and-play* dan antarmukanya terlindungi oleh proteksi anti-scraping AMSDEV.

---

## 7. STRUKTUR FOLDER & FUNGSINYA (DIRECTORY TREE)

Struktur repositori dirancang berbasis *Domain-Driven* dengan pemisahan tegas antara presentasi, logika *backend*, dan manajemen statis.

```text
/ (Root Project)
├── app/                  # (Layer Presentasi & API Next.js)
│   ├── api/              # Semua endpoint REST (termasuk SSE, Resepsionis Scanner)
│   ├── admin/            # [Usang] (Akan dihapus, diganti sistem CMS baru)
│   ├── dashboard/        # [Usang] (Akan dihapus, dashboard dirombak ke struktur baru)
│   ├── login/            # Halaman autentikasi klien
│   └── (public)/         # Halaman mendarat utama (Landing Page luxenary.id)
│
├── components/           # (Layer UI Reusable)
│   ├── ui/               # Komponen dasar Shadcn UI (Tombol, Card, Input)
│   └── ...               # Komponen spesifik domain (Pemutar Musik, dsb)
│
├── lib/                  # (Layer Logika Bisnis & Servis Inti - SANGAT KRUSIAL)
│   ├── staticPublisher.ts# Memanggang undangan menjadi 1 File HTML Statis
│   ├── themeEngine.ts    # Mesin parser tema dan injeksi skrip blueprint
│   ├── settings.ts       # Mengambil konfigurasi global dari tabel admin_settings
│   ├── prisma.ts         # Inisialisasi koneksi SQLite (Better-SQLite3)
│   ├── storage.ts        # Klien S3/R2 untuk unggahan Cloudflare
│   ├── driveHelper.ts    # Ekstraktor dan proxy *stream* Google Drive
│   └── videoOptimizer.ts # Mesin kompresor FFmpeg internal (H264 / MP3)
│
├── prisma/               # (Layer Database)
│   ├── schema.prisma     # Skema relasional SQLite (Tabel Undangan, Admin, User)
│   └── dev.db            # File fisik database produksi SQLite
│
├── public/               # (Layer Aset Publik & Penyimpanan Berkas Statis)
│   ├── assets/           # Aset Statis Inti Sistem
│   │   ├── brand/        # Logo platform (logo.webp, favicon.png)
│   │   └── homepage/     # Gambar pendukung landing page
│   ├── published/        # [Output Engine] Hasil kompilasi undangan statis (.html)
│   ├── uploads/          # Aset dinamis hasil unggahan & klien
│   │   ├── guest-memories/ # Foto unggahan tamu (Live Photo Drop)
│   │   ├── invitations/  # Aset media yang diunggah klien untuk undangan
│   │   ├── proofs/       # Bukti transfer pembayaran (Ipaymu/Manual)
│   │   └── themes-builder/ # Aset pendukung demo studio tema
│   ├── demo/             # Template preview tema (solaria, ameera, badrika)
│   ├── downloads/        # File unduhan eksternal (starter-blueprint.html)
│   ├── music/            # Musik background default tema (.ogg format)
│   ├── portfolio/        # HTML statis canonical dari portofolio VIP
│   ├── fonts/            # Webfonts yang di-host secara lokal
│   └── css/              # Stylesheet global (modules.css)
│
├── scripts/              # (Layer Automasi Latar Belakang)
│   └── cron-cleanup.ts   # Skrip "Tukang Sapu" (Garbage Collector) untuk menghapus HTML kedaluwarsa
│
├── themes/               # (Layer Template Desain Dasar)
│   └── starter-blueprint.html # Referensi murni untuk Injeksi Engine
│
└── middleware.ts         # (Layer Edge Network) 
                          # Penjaga gerbang utama: Merutekan Subdomain & Portofolio ke HTML statis, serta memblokir akses ke rute rahasia.
```

---
*Dokumen ini merupakan sumber kebenaran (Source of Truth) yang ditulis langsung dengan membaca kode sumber aktual dan riwayat arsitektur di produksi.*
