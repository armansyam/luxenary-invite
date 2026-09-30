# PUSAT DOKUMENTASI RESMI (DOCS INDEX)
**Luxenary Invite Platform — Multi-Tenant Invitation SaaS & Online Receptionist**

Direktori ini adalah **Pusat Dokumentasi Resmi & Sumber Kebenaran Tunggal (Single Source of Truth)** untuk seluruh developer dan AI Agent. Seluruh konten di sini mencerminkan **100% fakta kode aktual**, kamus basis data, panduan arsitektur, standar keamanan, dan manual operasional yang terbagi secara modular ke dalam 4 domain utama: **Client (Sisi Pengantin & Penyelenggara)**, **Admin (Sisi Administrator & Sistem)**, **Public (Sisi Tamu & Meja Resepsionis)**, dan **Engineering & Infrastruktur**.

---

## 🏛️ KONTRAK BISNIS & ARSITEKTUR MUTLAK SISTEM (GROUND TRUTH)

Sebelum membaca dokumen spesifik per modul, seluruh pihak WAJIB memahami 5 pilar kontrak mutlak berikut:

1. **Pembayaran adalah Gerbang Mutlak (*Hard Payment Barrier*):**
   - Klien yang belum menyelesaikan pembayaran (`PAID`) **DILARANG MUTLAK** membuka Dashboard Klien (`/dashboard`) atau Studio Editor.
   - Pengecekan otomatis via [`app/api/client/onboarding-state`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/onboarding-state/route.ts):
     - Belum ada pesanan $\rightarrow$ dialihkan paksa ke `/packages`.
     - Pesanan berstatus `PENDING` $\rightarrow$ dialihkan paksa ke kasir `/payment` (jika checkout confirmed) atau `/checkout`.
     - Hanya pesanan berstatus `PAID` yang diizinkan masuk ke `/dashboard/setup` lalu ke `/dashboard`.
   - Di level backend API ([`app/api/client/invitations/create`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/invitations/create/route.ts)), jika tidak ditemukan order dengan status `PAID`, sistem menolak pembuatan draf dengan **HTTP 403 Forbidden**.
2. **Saluran Pembayaran 100% Dikendalikan Admin (*Zero Client Decision*):**
   - Klien **TIDAK BISA** memilih sendiri metode pembayaran (Transfer Manual vs Gateway).
   - Saluran ditentukan secara tunggal oleh Admin via database `AdminSetting` key `payment_mode`:
     - Mode `"GATEWAY"`: Klien hanya disajikan QRIS otomatis (Midtrans/Xendit). Form transfer manual disembunyikan.
     - Mode `"MANUAL"`: Klien hanya disajikan nomor rekening bank admin & form unggah bukti transfer. Gateway dinonaktifkan.
3. **Arsitektur Multi-Event (6 Tipe Acara Terdaftar):**
   - Enum `EventType` di PostgreSQL: `WEDDING`, `BIRTHDAY`, `KHITAN`, `AQIQAH`, `WISUDA`, `GATHERING`.
   - Data persona non-wedding disimpan terstruktur di kolom `participantsJson` pada tabel `Invitation`.
   - Setup Wizard 4 Langkah & Studio Editor beradaptasi otomatis sesuai jenis acara. Fitur pernikahan (Seksi 7: Kisah Cinta) otomatis disembunyikan untuk non-wedding.
4. **Isolasi Tema Ketat (Total 39 Tema di DB & Disk):**
   - Distribusi tema faktual: 33 Wedding, 2 Birthday, 1 Khitan, 1 Aqiqah, 1 Wisuda, 1 Gathering.
   - Klien hanya diizinkan memilih tema yang cocok dengan `eventType` acaranya. Backend menolak submit jika jenis tema tidak cocok.
   - Pilihan tema dikunci permanen pasca publikasi (`status: PUBLISHED`).
5. **Infrastruktur Produksi VPS & Gembok Layanan:**
   - Server VPS Ubuntu live di `https://luxvite.id` (PM2 cluster 2 node port 3001, Caddy On-Demand TLS, Cloudflare reverse proxy).
   - Pengaturan `serviceStatus` saat ini berstatus `COMING_SOON` (`isOpen: false`), mengunci registrasi publik secara aman hingga Admin memutuskan membuka layanan (`OPEN`).
   - Crontab OS Linux berjalan otomatis: Pembersihan harian pukul 02:00 dan Pencadangan database PostgreSQL pukul 03:00.

---

## 1. Dokumentasi Sisi Klien / Penyelenggara (`docs/client/`)

Dokumentasi ini membedah seluruh tahapan siklus hidup klien mulai dari registrasi Google OAuth, kasir pembayaran, perancangan undangan di studio editor, manajemen tamu, hingga monitoring RSVP.

| Tahap | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **00** | [ALUR_REGISTRASI_KE_DASHBOARD.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/ALUR_REGISTRASI_KE_DASHBOARD.md) | **Arsitektur End-to-End**: Alur global sejak landing page, Google OAuth, dispatcher onboarding hub, gerbang pembayaran mutlak, hingga studio editor. |
| **01** | [TAHAP_REGISTRASI_DAN_PEMBAYARAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_REGISTRASI_DAN_PEMBAYARAN.md) | **Kasir & Kontrol Payment Mode**: Alur kasir checkout `/checkout` dan `/payment`, integrasi QRIS otomatis gateway, transfer manual darurat, webhook, dan auto-aktivasi akun. |
| **02** | [TAHAP_DASHBOARD_SETUP_AWAL.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_DASHBOARD_SETUP_AWAL.md) | **Wizard Setup Perdana (4 Langkah)**: Langkah 0 (Pilih 6 Event Types), Langkah 1 (Persona Adaptif / `participantsJson`), Langkah 2 (Jadwal & Lokasi), Langkah 3 (Pilih Tema Terisolasi). |
| **03** | [TAHAP_STUDIO_EDITOR_UNDANGAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_STUDIO_EDITOR_UNDANGAN.md) | **Studio Editor 16 Seksi**: Panel kustomisasi `/dashboard/invitation/[id]` Dual-Native Master-Detail, form adaptif per eventType, sembunyikan Love Story untuk non-wedding, palet warna dinamis, dan kunci tema pasca publikasi. |
| **04** | [TAHAP_GUEST_MOMENTS_DAN_MEMORIES.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_GUEST_MOMENTS_DAN_MEMORIES.md) | **Pusat Komando Moments & Kuota Pintar**: Manajemen kamera virtual `/dashboard/moments`, 3 layout kartu pembuka (`POLAROID_MINIMAL`, `VINTAGE_FILM`, `MODERN_ELEGANT`), jadwal multi-sesi dengan Smart Quota Boundary Guard, cetak QR meja 300 DPI, dan unduh master ZIP. |
| **05** | [TAHAP_MANAJEMEN_TAMU_DAN_QR.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_MANAJEMEN_TAMU_DAN_QR.md) | **Buku Tamu & Tiket QR**: Manajemen daftar tamu `/dashboard/guests`, import CSV, generator link personal `?to=...`, enkripsi token QR check-in, dan broadcast WhatsApp dinamis. |
| **06** | [TAHAP_RSVP_DAN_MODERASI_UCAPAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_RSVP_DAN_MODERASI_UCAPAN.md) | **RSVP & Feed Doa**: Pemantauan kehadiran `/dashboard/rsvp`, kalkulasi porsi katering (*pax count*), moderasi komentar tamu (*hide/show*), dan ekspor CSV. |
| **07** | [TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md) | **Domain & Publikasi**: Pengaturan `/dashboard/settings`, ketersediaan subdomain real-time, panduan DNS CNAME/A custom domain, 4-digit PIN panitia, Strict Subdomain Isolation Guard, dan WOW Publish pipeline. |

---

## 2. Dokumentasi Sisi Administrator (`docs/admin/`)

Dokumentasi ini mencakup seluruh instrumen pengelolaan bisnis, keuangan, 39 tema, kontrol akses pengguna, dan infrastruktur server VPS.

| Modul | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **01** | [DASHBOARD_OVERVIEW_DAN_STATISTIK.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DASHBOARD_OVERVIEW_DAN_STATISTIK.md) | **Overview & Analytics**: Pemantauan 4 metrik bisnis utama (Omset Lunas, Pending, Undangan Online/Draf, Tamu & RSVP), distribusi paket, ranking tema populer, dan aktivitas transaksi terkini. |
| **02** | [REMOTE_DAN_MANAJEMEN_KLIEN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md) | **Remote Session & Klien**: Arsitektur *Cookie-Based Workspace Override*, Server Action impersonasi klien tanpa password, banner peringatan merah, dan manajemen siklus hidup akun. |
| **03** | [MANAJEMEN_UNDANGAN_DAN_DOMAIN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_UNDANGAN_DAN_DOMAIN.md) | **Undangan & Custom Domain**: Monitoring seluruh proyek undangan dengan 5 filter status, kontrol masa aktif galeri, kunci darurat 24 jam, dan integrasi Caddy On-Demand TLS. |
| **04** | [MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md) | **Invoice & Payment Mode**: Pengaturan terpusat `payment_mode` (`GATEWAY` vs `MANUAL`), tata kelola penagihan pesanan (PENDING, PAID, FAILED), modal inspeksi struk manual, dan konfigurasi gateway aktif (Midtrans & Xendit). |
| **05** | [MANAJEMEN_TEMA_ADMIN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TEMA_ADMIN.md) | **39 Tema Fisik & Sinkronisasi**: Arsitektur *Single Source of Truth* tema HTML fisik (33 Wedding + 6 Non-Wedding), skrip `npm run themes:sync`, auto-compile demo `/public/demo/`, dan thumbnail ganda Mobile (400×800) & Desktop (1280×800). |
| **06** | [PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md) | **Branding, R2 & Database**: Kustomisasi identitas platform, switch `serviceStatus` (Coming Soon / Open), sinkronisasi CORS Cloudflare R2 otomatis, batas upload media dinamis, dan connection pooling PostgreSQL. |
| **07** | [CRON_DAN_MAINTENANCE_OTOMATIS.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/CRON_DAN_MAINTENANCE_OTOMATIS.md) | **Tugas Terjadwal & Snapshot**: Siklus pembersihan harian `/api/cron/cleanup`, daur ulang subdomain, retensi foto tamu, dan auto-backup database `/api/cron/backup`. |
| **08** | [DEPLOYMENT_VPS_CADDY.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DEPLOYMENT_VPS_CADDY.md) | **Infrastruktur Produksi**: Panduan komprehensif setup VPS Ubuntu dari nol, Swap 2 GB, Node.js 20, PostgreSQL, Caddy auto-SSL, PM2 cluster, dan skalabilitas multi-server shared storage NFS. |
| **09** | [MANAJEMEN_FINANCE_DAN_PEMBUKUAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_FINANCE_DAN_PEMBUKUAN.md) | **Finance & Kas Terpusat**: Continuous Editorial Canvas, 3 model grafik SVG 60 FPS (Dual Bar, Smooth Area, Net Flow Baseline Rp 0), buku kas keluar OPEX, audit-safe Tutup Buku bulanan, dan rekapitulasi PPh Final 0,5% siap SPT. |
| **10** | [MANAJEMEN_MARKETING_DAN_AFILIASI.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_MARKETING_DAN_AFILIASI.md) | **Marketing & Afiliasi**: Manajemen kupon diskon (persen/nominal), proteksi kasir 15 menit PromoHold, kemitraan referral B2B (WO/Vendor), komisi otomatis, dan integrasi pencairan komisi ke buku kas keuangan. |
| **11** | [AGENT_HERMES_VPS_MONITORING.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/AGENT_HERMES_VPS_MONITORING.md) | **Sentinel Monitoring & Watchdog**: Mandat otonom Agent Hermes, 5 pos pengawasan kritis (PM2 liveness, PostgreSQL latency, Caddy/Cloudflare, resource disk/RAM, dan verifikasi backup harian 03:00). |

---

## 3. Dokumentasi Sisi Publik & Tamu Undangan (`docs/public/`)

Dokumentasi ini menjelaskan pengalaman pengunjung, arsitektur penyajian tema, interaksi tamu, serta portal resepsionis di venue acara.

| Fitur | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **01** | [01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md) | **Engine Rendering & URL Router**: Resolusi URL multi-domain (Custom Domain, Subdomain `/s/[subdomain]`, Slug `/[slug]`), compiler token template fisik, dynamic CSS palette, 5 Pilar Strict Subdomain Isolation Guard di `middleware.ts`, dan Open Graph meta. |
| **02** | [02_PENGALAMAN_TAMU_UNDANGAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/02_PENGALAMAN_TAMU_UNDANGAN.md) | **Guest Journey**: Alur pembukaan sampul *cover gate*, kepatuhan kebijakan Web Audio autoplay, live countdown timer, agenda acara, dan navigasi Google Maps/Waze. |
| **03** | [03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md) | **RSVP & Buku Doa**: Formulir kehadiran publik `/api/public/rsvp`, auto-fill nama dari `?to=...`, rate limit anti-spam IP, feed ucapan real-time, dan lencana balasan pengantin. |
| **04** | [04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md) | **Tanda Kasih Cashless & Dynamic Tabs**: Kartu rekening bank & e-wallet dengan tombol salin 1-klik, display & unduh QRIS statis (`public/uploads/invitations/[id]/qris.webp`), dan aturan penayangan tab cerdas. |
| **05** | [05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md) | **Portal Meja Resepsionis**: Portal `/s/[subdomain]/receptionist`, kunci 4-digit Staff PIN, scanner kamera QR Code HTML5, verifikasi meja & kuota, serta pencatatan souvenir. |
| **06** | [06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md) | **Live Moments & Disposable Camera**: Layar pembuka ramah tamu 3 tata letak, kamera saku retro dengan lampu kilat & 5 filter analog, pembatas kuota multi-sesi, standing banner 300 DPI, dan galeri kenangan real-time via SSE. |

---

## 4. Dokumentasi Engineering, Database & Keamanan (`docs/`)

Dokumentasi tingkat dalam untuk developer, arsitek sistem, dan tim teknis:

| Modul | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **DB** | [DATABASE_SCHEMA_DAN_RELASI.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/DATABASE_SCHEMA_DAN_RELASI.md) | **Kamus Data & Skema PostgreSQL**: Diagram ERD lengkap, 15 model Prisma, enum `EventType` (6 nilai), enum `MediaSlot` (9 nilai), kolom `participantsJson`, cascading keys, indeks, dan state machine status. |
| **API** | [API_REFERENCE.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/API_REFERENCE.md) | **Katalog API Lengkap**: Referensi seluruh 40+ rute REST API, SSE real-time stream, kasir payment gateway, dan webhook handlers. |
| **Theme** | [PANDUAN_PEMBUATAN_TEMA_BARU.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/PANDUAN_PEMBUATAN_TEMA_BARU.md) | **Theme Developer Guide**: Standar arsitektur HTML 14 seksi, kamus token `{{token}}`, CSS variables, standar audio autoplay, registrasi tema, dan validasi eventType. |
| **R2 & CDN** | [CLOUDFLARE_R2_DAN_CDN_SETUP.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/CLOUDFLARE_R2_DAN_CDN_SETUP.md) | **Object Storage, CDN & Purge**: Setup bucket Cloudflare R2, domain CDN, sinkronisasi CORS otomatis, lifecycle rules, serta konfigurasi 1-klik Purge Edge Cache API via token. |
| **Sec** | [SECURITY_DAN_PROTEKSI_DATA.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/SECURITY_DAN_PROTEKSI_DATA.md) | **Arsitektur Keamanan**: Defense-in-depth, enkripsi AES-256-GCM PIN panitia, validasi magic bytes file biner, in-memory rate limiting anti-DDoS, dan audit logging. |

---

## 5. Dokumen Master Proyek

Seluruh dokumen master arsitektur dan spesifikasi teknis kini terpusat di dalam folder `docs/`:
1. [`SYSTEM_ARCHITECTURE.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/SYSTEM_ARCHITECTURE.md) — Arsitektur sistem menyeluruh, diagram alur, skema database, dan API Route Map lengkap (v6.3.3).
2. [`README.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/README.md) — Panduan repositori, pohon direktori, instalasi, deployment, dan lingkungan env (Root).
3. [`S-Invitation.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/S-Invitation.md) — Filosofi bisnis, spesifikasi tema fisik, dan aturan integritas platform.

