# LUXENARY INVITE — DOKUMENTASI ARSITEKTUR & SISTEM (V3.0.0 - Faktual Empiris)

**Tanggal Pembaruan:** 28 Agustus 2026
**Tujuan Dokumen:** Buku putih (*Whitepaper*) teknis berbasis analisis empiris kode sumber. Dokumen ini menjadi referensi definitif bagi arsitek perangkat lunak dan insinyur infrastruktur.

---

## 1. FONDASI INFRASTRUKTUR & DATABASE

Aplikasi Luxenary Invite menghindari latensi koneksi jarak jauh (TCP/IP) yang sering terjadi pada database konvensional, dengan menanamkan database tepat di titik komputasi Edge/VPS.

### Spesifikasi Inti:
- **Framework:** Next.js 15 (App Router)
- **Runtime:** Node.js (Berjalan di atas VPS)
- **Database Utama:** **SQLite** terintegrasi via Prisma ORM menggunakan *adapter* khusus `@prisma/adapter-better-sqlite3` dan `better-sqlite3`. Memberikan kecepatan baca ultra-rendah latensi.
- **Sistem Pencadangan Otomatis (Hot-Backup):** Modul `lib/databaseBackup.ts` memungkinkan pengambilan *snapshot* instan dari database SQLite (tanpa menghentikan server) dengan logika retensi pembersihan (*auto-prune*) secara berkala.
- **Manajemen Proses:** PM2 (Proses latar belakang berkesinambungan).

---

## 2. MESIN PUBLIKASI STATIS (DATABASE BYPASS)

Kecepatan luar biasa dari aplikasi ini dihasilkan oleh modul **`lib/staticPublisher.ts`**.
Saat undangan dikunci (*Published*), Klien tidak lagi bergantung pada *server rendering* atau *query database*:
- Sistem "memanggang" (*Baking*) keseluruhan data dari Prisma (Tema, Acara, Cerita Cinta, Tamu) menjadi berkas HTML statis tunggal.
- Hasil HTML disimpan di dalam `public/published/[category]/[invitationId].html`.
- **Hasil Akhir:** Ratusan ribu tamu undangan yang mengakses halaman publik akan dilayani murni dari berkas statis (*Flat File*), membebaskan 100% beban CPU dan Database VPS.

---

## 3. PENGALIHAN SUBDOMAIN CERDAS (WILDCARD ROUTING)

Modul **`middleware.ts`** di lapisan depan memutus kebutuhan manipulasi server Nginx manual untuk setiap klien baru.
- Menangkap setiap lalu lintas (*traffic*) dari *Subdomain* atau *Custom Domain* (misal: `didan-nasha.luxenary.id`).
- Melakukan *URL Rewrite* secara *on-the-fly* dari URL akar `/` menuju `/s/didan-nasha`.
- Melindungi rute sensitif: Akses `/admin` dan `/dashboard` diblokir mutlak dari publik dan tervalidasi menggunakan token `next-auth`.

---

## 4. ARSITEKTUR PENGIRIMAN MEDIA (THREE-WAY STREAMING)

Aplikasi sama sekali **TIDAK** menggunakan kapasitas 60GB Harddisk VPS untuk menyajikan media kepada tamu. Pengiriman media didistribusikan melalui tiga jalur *streaming* terpisah:

1. **Cloudflare R2 (Aset Inti & Tamu):** Modul `lib/storage.ts` melakukan *stream* objek `Buffer` langsung dari RAM VPS menuju *bucket* R2.
   - Folder `invitations/` menyimpan foto pengantin (permanen selama kontrak 1 tahun).
   - Folder `guest-memories/` menyimpan unggahan tamu. Folder ini diatur oleh sistem *Cloudflare Object Lifecycle* untuk dihapus otomatis (Auto-Delete) setiap 60 hari.
2. **Google Drive (Galeri Pre-Wedding):** Aset terberat (foto resolusi tinggi) di-*streaming* langsung dari Google Drive klien via modul `lib/driveHelper.ts`, yang kemudian di-*cache* (disimpan sementara) oleh peladen *Cloudflare Edge* selama 30 hari. Sistem ini membebaskan kuota R2 dari beban berat.
3. **YouTube / Vimeo (Video):** *Live streaming* akad dan tayangan sinematik *Pre-Wedding* murni ditangani melalui fitur *Embed Parser* dari `lib/themeEngine.ts`, mengorbankan *bandwidth* YouTube, bukan server lokal.

---

## 5. OPTIMASI MEDIA OTOMATIS BERBASIS FFMPEG

VPS berfungsi sebagai mesin *Encoding* ringan di balik layar melalui modul **`lib/videoOptimizer.ts`**.
Sebelum aset disimpan, sistem menggunakan FFmpeg internal:
- **Video:** Dioptimasi ke codec `libx264` (H.264) dengan resolusi aman 1080p. Menyematkan bendera `+faststart` (moov atom) agar video di peramban web tamu dapat diputar instan tanpa harus mengunduh file secara penuh.
- **Audio:** Semua format (WAV, FLAC, M4A) dikompresi paksa menjadi **MP3 128kbps** (`libmp3lame`) yang berukuran super ringan (~1MB/menit) tanpa kehilangan kejernihan suara.

---

## 6. KEAMANAN & PENGALAMAN REAL-TIME (EVENT-DRIVEN)

1. **In-Memory Rate Limiter:** Modul `lib/rateLimit.ts` bekerja secara diam-diam tanpa bergantung pada Redis.
   - API Unggahan Foto: Batas maksimal 15 kiriman per menit per IP (Menolak spam yang dapat mencekik prosesor FFmpeg).
   - API Kehadiran (RSVP): Batas maksimal 10 kiriman per menit per IP (Mencegah kotornya basis data SQLite).
   - Serangan *Bruteforce* akan dihentikan prematur dengan kode HTTP `429 Too Many Requests`.

2. **Server-Sent Events (SSE):** Berbagi memori secara seketika (*Real-Time Gallery*).
   - Saat tamu mengunggah foto, tidak diperlukan *refresh* halaman.
   - Modul `app/api/sse/memories/route.ts` memancarkan (*broadcast*) foto baru secara instan ke seluruh layar ponsel tamu yang sedang membuka undangan Klien.

---
*Dokumen ini merupakan sumber kebenaran (Source of Truth) yang ditulis langsung dengan membaca kode sumber aktual di produksi.*
