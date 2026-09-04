# PUSAT DOKUMENTASI RESMI (DOCS INDEX)
**Luxenary Invite Platform — Multi-Tenant Wedding SaaS & Online Receptionist**

Direktori ini memuat seluruh dokumen spesifikasi teknis, alur data, panduan arsitektur, dan panduan operasional platform Luxenary Invite yang terbagi secara modular ke dalam 3 domain utama: **Client (Sisi Klien/Pengantin)**, **Admin (Sisi Administrator)**, dan **Public (Sisi Tamu Undangan & Meja Resepsionis)**.

---

## 1. Dokumentasi Sisi Klien / Pengantin (`docs/client/`)

Dokumentasi ini membedah seluruh tahapan siklus hidup calon pengantin mulai dari registrasi, transaksi, perancangan undangan di studio editor, manajemen tamu, hingga monitoring RSVP.

| Tahap | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **00** | [ALUR_REGISTRASI_KE_DASHBOARD.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/ALUR_REGISTRASI_KE_DASHBOARD.md) | **Arsitektur End-to-End**: Alur global sejak landing page, Google OAuth, dispatcher onboarding hub, kasir pembayaran, hingga studio editor. |
| **01** | [TAHAP_REGISTRASI_DAN_PEMBAYARAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_REGISTRASI_DAN_PEMBAYARAN.md) | **Kasir & Multi-Gateway**: Alur kasir checkout `/checkout`, integrasi QRIS otomatis, transfer manual, webhook, dan auto-aktivasi akun. |
| **02** | [TAHAP_DASHBOARD_SETUP_AWAL.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_DASHBOARD_SETUP_AWAL.md) | **Wizard Setup Perdana**: Formulir 3 langkah `/dashboard/setup` (Profil Pasangan, Tanggal/Lokasi, Tema Perdana) dengan auto-save draft `localStorage`. |
| **03** | [TAHAP_STUDIO_EDITOR_UNDANGAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_STUDIO_EDITOR_UNDANGAN.md) | **Studio Editor 14 Seksi**: Panel kustomisasi `/dashboard/invitation/[id]` Dual-Native (Form vs Live Preview), palet warna CSS, audio controller, upload Cloudflare R2, dan amplop digital. |
| **04** | [TAHAP_MANAJEMEN_TAMU_DAN_QR.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_MANAJEMEN_TAMU_DAN_QR.md) | **Buku Tamu & Tiket QR**: Manajemen daftar tamu `/dashboard/guests`, import CSV, generator link personal `?to=...`, enkripsi token QR check-in, dan broadcast WhatsApp dinamis. |
| **05** | [TAHAP_RSVP_DAN_MODERASI_UCAPAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_RSVP_DAN_MODERASI_UCAPAN.md) | **RSVP & Feed Doa**: Pemantauan kehadiran `/dashboard/rsvp`, kalkulasi porsi katering (*pax count*), moderasi komentar tamu (*hide/show*), dan ekspor CSV. |
| **06** | [TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md) | **Domain & Publikasi**: Pengaturan `/dashboard/settings`, ketersediaan subdomain real-time, panduan DNS CNAME/A custom domain, 4-digit PIN panitia, dan WOW Publish pipeline. |

---

## 2. Dokumentasi Sisi Administrator (`docs/admin/`)

Dokumentasi ini mencakup seluruh instrumen pengelolaan bisnis, keuangan, tema, kontrol akses pengguna, dan infrastruktur server VPS.

| Modul | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **01** | [DASHBOARD_OVERVIEW_DAN_STATISTIK.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DASHBOARD_OVERVIEW_DAN_STATISTIK.md) | **Overview & Analytics**: Pemantauan metrik bisnis (Total Klien, Undangan Aktif, GMV Omset, RSVP), grafik transaksi 30 hari, dan server health check. |
| **02** | [REMOTE_DAN_MANAJEMEN_KLIEN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md) | **Remote Session & Klien**: Arsitektur *Cookie-Based Workspace Override*, Server Action impersonasi klien tanpa password, banner peringatan merah, dan manajemen siklus hidup akun. |
| **03** | [MANAJEMEN_UNDANGAN_DAN_DOMAIN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_UNDANGAN_DAN_DOMAIN.md) | **Undangan & Custom Domain**: Monitoring seluruh undangan pengguna, force publish/suspend, verifikasi resolver DNS CNAME, dan integrasi otomatis Caddy On-Demand TLS. |
| **04** | [MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md) | **Invoice & Gateway**: Tata kelola penagihan pesanan, verifikasi bukti bayar transfer manual 1-klik, refund, dan konfigurasi multi-gateway (iPaymu, Midtrans, Duitku, TriPay, Xendit). |
| **05** | [MANAJEMEN_TEMA_ADMIN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TEMA_ADMIN.md) | **Tema Fisik**: Arsitektur *Single Source of Truth* tema HTML fisik, upload master `.html`, auto-compile demo statis `/public/demo/`, dan sinkronisasi disk-to-database. |
| **06** | [PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md) | **Branding, R2 & Database**: Kustomisasi logo/brand platform, sinkronisasi CORS Cloudflare R2 otomatis, manajemen tim administrator, dan pemeliharaan PostgreSQL. |
| **07** | [DEPLOYMENT_VPS_CADDY.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DEPLOYMENT_VPS_CADDY.md) | **Infrastruktur Produksi**: Panduan deployment VPS Ubuntu 22.04 LTS, cluster PM2, konfigurasi Caddy reverse proxy, firewall UFW, dan certbot auto SSL. |

---

## 3. Dokumentasi Sisi Publik & Tamu Undangan (`docs/public/`)

Dokumentasi ini menjelaskan pengalaman pengunjung, arsitektur penyajian tema, interaksi tamu, serta portal resepsionis di venue acara.

| Fitur | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **01** | [01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md) | **Engine Rendering & URL Router**: Resolusi URL multi-domain (Custom Domain, Subdomain `/s/[subdomain]`, Slug `/[slug]`), compiler token template fisik, dynamic CSS palette, dan Open Graph meta. |
| **02** | [02_PENGALAMAN_TAMU_UNDANGAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/02_PENGALAMAN_TAMU_UNDANGAN.md) | **Guest Journey**: Alur pembukaan sampul *cover gate*, kepatuhan kebijakan Web Audio autoplay, live countdown timer, agenda acara, dan navigasi Google Maps/Waze. |
| **03** | [03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md) | **RSVP & Buku Doa**: Formulir kehadiran publik `/api/public/rsvp`, auto-fill nama dari `?to=...`, rate limit anti-spam IP, feed ucapan real-time, dan lencana balasan pengantin. |
| **04** | [04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md) | **Tanda Kasih Cashless**: Kartu rekening bank & e-wallet dengan tombol salin 1-klik, display & unduh QRIS statis, dan alamat kirim kado fisik. |
| **05** | [05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md) | **Portal Meja Resepsionis**: Portal `/s/[subdomain]/receptionist`, kunci 4-digit Staff PIN, scanner kamera QR Code HTML5, verifikasi meja & kuota, serta pencatatan souvenir. |
| **06** | [06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md) | **Live Moments & Galeri**: Portal upload foto candid tamu `/[slug]/sharemoment`, kompresi klien, R2 direct upload, slideshow proyektor fullscreen venue, dan auto-redirect `EVENT_FINISHED`. |

---

## 4. Dokumen Master Root Proyek

Di samping folder `docs/`, repositori ini memiliki 3 dokumen master arsitektur level atas yang wajib sinkron setiap saat:
1. [`SYSTEM_ARCHITECTURE.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/SYSTEM_ARCHITECTURE.md) — Arsitektur sistem menyeluruh, diagram alur, skema database, dan API Route Map lengkap.
2. [`README.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/README.md) — Panduan repositori, pohon direktori, instalasi, deployment, dan lingkungan env.
3. [`S-Invitation.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/S-Invitation.md) — Filosofi bisnis, spesifikasi tema fisik, dan aturan integritas platform.
