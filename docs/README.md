# PUSAT DOKUMENTASI RESMI (DOCS INDEX)
**Luxenary Invite Platform — Multi-Tenant Wedding SaaS & Online Receptionist**

Direktori ini memuat seluruh dokumen spesifikasi teknis, kamus basis data, panduan arsitektur, standar keamanan, dan manual operasional platform Luxenary Invite yang terbagi secara modular ke dalam 4 domain utama: **Client (Sisi Pengantin)**, **Admin (Sisi Administrator & Sistem)**, **Public (Sisi Tamu & Meja Resepsionis)**, dan **Engineering & Infrastruktur**.

---

## 1. Dokumentasi Sisi Klien / Pengantin (`docs/client/`)

Dokumentasi ini membedah seluruh tahapan siklus hidup calon pengantin mulai dari registrasi, transaksi, perancangan undangan di studio editor, manajemen tamu, hingga monitoring RSVP.

| Tahap | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **00** | [ALUR_REGISTRASI_KE_DASHBOARD.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/ALUR_REGISTRASI_KE_DASHBOARD.md) | **Arsitektur End-to-End**: Alur global sejak landing page, Google OAuth, dispatcher onboarding hub, kasir pembayaran, hingga studio editor. |
| **01** | [TAHAP_REGISTRASI_DAN_PEMBAYARAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_REGISTRASI_DAN_PEMBAYARAN.md) | **Kasir & Multi-Gateway**: Alur kasir checkout `/checkout`, integrasi QRIS otomatis, transfer manual, webhook, dan auto-aktivasi akun. |
| **02** | [TAHAP_DASHBOARD_SETUP_AWAL.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_DASHBOARD_SETUP_AWAL.md) | **Wizard Setup Perdana**: Formulir 3 langkah `/dashboard/setup` (Profil Pasangan, Tanggal/Lokasi, Tema Perdana) dengan auto-save draft `localStorage`. |
| **03** | [TAHAP_STUDIO_EDITOR_UNDANGAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_STUDIO_EDITOR_UNDANGAN.md) | **Studio Editor 16 Seksi**: Panel kustomisasi `/dashboard/invitation/[id]` Dual-Native Master-Detail (Form selalu terbuka tanpa auto-collapse vs Live Canvas Preview), palet warna CSS, audio controller, smart dynamic gift section & upload QRIS statis, serta Seksi 16 Mitra & Vendor Pernikahan (Wedding Credits). |
| **04** | [TAHAP_GUEST_MOMENTS_DAN_MEMORIES.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_GUEST_MOMENTS_DAN_MEMORIES.md) | **Pusat Komando Moments & Kuota Pintar**: Manajemen kamera virtual `/dashboard/moments`, 3 layout kartu pembuka (`POLAROID_MINIMAL`, `VINTAGE_FILM`, `MODERN_ELEGANT`), teks instruksi kustom, jadwal multi-sesi dengan Smart Quota Boundary Guard (`Math.min` real-time clamping & tombol bagi rata), studio cetak QR meja 300 DPI, dan unduh master ZIP. |
| **05** | [TAHAP_MANAJEMEN_TAMU_DAN_QR.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_MANAJEMEN_TAMU_DAN_QR.md) | **Buku Tamu & Tiket QR**: Manajemen daftar tamu `/dashboard/guests`, import CSV, generator link personal `?to=...`, enkripsi token QR check-in, dan broadcast WhatsApp dinamis. |
| **06** | [TAHAP_RSVP_DAN_MODERASI_UCAPAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_RSVP_DAN_MODERASI_UCAPAN.md) | **RSVP & Feed Doa**: Pemantauan kehadiran `/dashboard/rsvp`, kalkulasi porsi katering (*pax count*), moderasi komentar tamu (*hide/show*), dan ekspor CSV. |
| **07** | [TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md) | **Domain & Publikasi**: Pengaturan `/dashboard/settings`, ketersediaan subdomain real-time, panduan DNS CNAME/A custom domain inklusif Tier 3, 4-digit PIN panitia, Strict Subdomain Isolation Guard, dan WOW Publish pipeline. |

---

## 2. Dokumentasi Sisi Administrator (`docs/admin/`)

Dokumentasi ini mencakup seluruh instrumen pengelolaan bisnis, keuangan, tema, kontrol akses pengguna, dan infrastruktur server VPS.

| Modul | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **01** | [DASHBOARD_OVERVIEW_DAN_STATISTIK.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DASHBOARD_OVERVIEW_DAN_STATISTIK.md) | **Overview & Analytics**: Pemantauan 4 metrik bisnis utama (Omset Lunas, Pending, Undangan Online/Draf, Tamu & RSVP), distribusi paket, ranking tema populer, dan aktivitas transaksi terkini. |
| **02** | [REMOTE_DAN_MANAJEMEN_KLIEN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md) | **Remote Session & Klien**: Arsitektur *Cookie-Based Workspace Override*, Server Action impersonasi klien tanpa password, banner peringatan merah, dan manajemen siklus hidup akun. |
| **03** | [MANAJEMEN_UNDANGAN_DAN_DOMAIN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_UNDANGAN_DAN_DOMAIN.md) | **Undangan & Custom Domain**: Monitoring seluruh proyek undangan dengan 5 filter status, kontrol masa aktif galeri, kunci darurat 24 jam, dan integrasi Caddy On-Demand TLS. |
| **04** | [MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md) | **Invoice & Gateway**: Tata kelola penagihan pesanan (PENDING, PAID, FAILED), modal inspeksi struk & verifikasi transfer manual 1-klik, penolakan berperingatan persisten, dan konfigurasi gateway aktif (Midtrans & Xendit). |
| **05** | [MANAJEMEN_TEMA_ADMIN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TEMA_ADMIN.md) | **Tema Fisik**: Arsitektur *Single Source of Truth* tema HTML fisik, upload master `.html`, auto-compile demo statis `/public/demo/`, dan sinkronisasi disk-to-database. |
| **06** | [PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md) | **Branding, R2 & Database**: Kustomisasi identitas platform, sinkronisasi CORS Cloudflare R2 otomatis, batas upload media dinamis, connection pooling database, dan snapshot PostgreSQL. |
| **07** | [CRON_DAN_MAINTENANCE_OTOMATIS.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/CRON_DAN_MAINTENANCE_OTOMATIS.md) | **Tugas Terjadwal & Snapshot**: Siklus pembersihan harian `/api/cron/cleanup`, daur ulang subdomain, retensi foto tamu, dan auto-backup database `/api/cron/backup`. |
| **08** | [DEPLOYMENT_VPS_CADDY.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DEPLOYMENT_VPS_CADDY.md) | **Infrastruktur Produksi**: Panduan komprehensif setup VPS Ubuntu dari nol, Swap 2 GB, Node.js 20, PostgreSQL, Caddy auto-SSL, PM2 cluster, dan skalabilitas multi-server shared storage NFS. |
| **09** | [MANAJEMEN_FINANCE_DAN_PEMBUKUAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_FINANCE_DAN_PEMBUKUAN.md) | **Finance & Kas Terpusat**: Continuous Editorial Canvas (bebas card AI), 3 model grafik SVG 60 FPS (Dual Bar, Smooth Area, Net Flow Baseline Rp 0), buku kas keluar OPEX, pelacak tagihan rutin 1-klik, audit-safe Tutup Buku bulanan, dan rekapitulasi PPh Final 0,5% (PP 55/2022) siap lapor SPT. |
| **10** | [MANAJEMEN_MARKETING_DAN_AFILIASI.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_MARKETING_DAN_AFILIASI.md) | **Marketing & Afiliasi**: Manajemen kupon diskon (persen/nominal), proteksi kasir 15 menit PromoHold, kemitraan referral B2B (WO/Vendor), komisi otomatis, dan integrasi pencairan komisi ke buku kas keuangan. |

---

## 3. Dokumentasi Sisi Publik & Tamu Undangan (`docs/public/`)

Dokumentasi ini menjelaskan pengalaman pengunjung, arsitektur penyajian tema, interaksi tamu, serta portal resepsionis di venue acara.

| Fitur | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **01** | [01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md) | **Engine Rendering & URL Router**: Resolusi URL multi-domain (Custom Domain, Subdomain `/s/[subdomain]`, Slug `/[slug]`), compiler token template fisik, dynamic CSS palette, 5 Pilar Strict Subdomain Isolation Guard di `middleware.ts`, dan Open Graph meta. |
| **02** | [02_PENGALAMAN_TAMU_UNDANGAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/02_PENGALAMAN_TAMU_UNDANGAN.md) | **Guest Journey**: Alur pembukaan sampul *cover gate*, kepatuhan kebijakan Web Audio autoplay, live countdown timer, agenda acara, dan navigasi Google Maps/Waze. |
| **03** | [03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md) | **RSVP & Buku Doa**: Formulir kehadiran publik `/api/public/rsvp`, auto-fill nama dari `?to=...`, rate limit anti-spam IP, feed ucapan real-time, dan lencana balasan pengantin. |
| **04** | [04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md) | **Tanda Kasih Cashless & Dynamic Tabs**: Kartu rekening bank & e-wallet dengan tombol salin 1-klik, display & unduh QRIS statis (`public/uploads/invitations/[id]/qris.webp`), dan aturan penayangan tab cerdas (otomatis sembunyikan kado jika alamat kosong tanpa dummy Makassar). |
| **05** | [05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md) | **Portal Meja Resepsionis**: Portal `/s/[subdomain]/receptionist`, kunci 4-digit Staff PIN, scanner kamera QR Code HTML5, verifikasi meja & kuota, serta pencatatan souvenir. |
| **06** | [06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md) | **Live Moments & Disposable Camera**: Layar pembuka ramah tamu 3 tata letak, kamera saku retro dengan lampu kilat & 5 filter analog, pembatas kuota multi-sesi, standing banner 300 DPI, dan galeri kenangan real-time via SSE. |

---

## 4. Dokumentasi Engineering, Database & Keamanan (`docs/`)

Dokumentasi tingkat dalam untuk developer, arsitek sistem, dan tim teknis:

| Modul | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **DB** | [DATABASE_SCHEMA_DAN_RELASI.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/DATABASE_SCHEMA_DAN_RELASI.md) | **Kamus Data & Skema PostgreSQL**: Diagram ERD lengkap, 15 model Prisma, cascading keys, indeks, dan mesin siklus hidup status (`InvitationStatus`, `OrderStatus`). |
| **API** | [API_REFERENCE.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/API_REFERENCE.md) | **Katalog API Lengkap**: Referensi seluruh 40+ rute REST API, SSE real-time stream, kasir payment gateway, dan webhook handlers. |
| **Theme** | [PANDUAN_PEMBUATAN_TEMA_BARU.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/PANDUAN_PEMBUATAN_TEMA_BARU.md) | **Theme Developer Guide**: Standar arsitektur HTML 14 seksi, kamus token `{{token}}`, CSS variables, standar audio autoplay, dan registrasi tema ke sistem. |
| **R2 & CDN** | [CLOUDFLARE_R2_DAN_CDN_SETUP.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/CLOUDFLARE_R2_DAN_CDN_SETUP.md) | **Object Storage, CDN & Purge**: Setup bucket Cloudflare R2, domain CDN, sinkronisasi CORS otomatis, lifecycle rules, serta konfigurasi 1-klik Purge Edge Cache API via token. |
| **Sec** | [SECURITY_DAN_PROTEKSI_DATA.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/SECURITY_DAN_PROTEKSI_DATA.md) | **Arsitektur Keamanan**: Defense-in-depth, enkripsi AES-256-GCM PIN panitia, validasi magic bytes file biner, in-memory rate limiting anti-DDoS, dan audit logging. |

---

## 5. Dokumen Master Proyek

Seluruh dokumen master arsitektur dan spesifikasi teknis kini terpusat di dalam folder `docs/`:
1. [`SYSTEM_ARCHITECTURE.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/SYSTEM_ARCHITECTURE.md) — Arsitektur sistem menyeluruh, diagram alur, skema database, dan API Route Map lengkap.
2. [`README.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/README.md) — Panduan repositori, pohon direktori, instalasi, deployment, dan lingkungan env (Root).
3. [`S-Invitation.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/S-Invitation.md) — Filosofi bisnis, spesifikasi tema fisik, dan aturan integritas platform.
