# PUSAT DOKUMENTASI RESMI (DOCS INDEX)
**Luxenary Invite Platform — Multi-Event Invitation SaaS & Online Receptionist**

> **Panduan Cepat AI Agent:** Baca dokumen ini terlebih dahulu sebelum menelusuri berkas lain. Seluruh poin di bawah mencerminkan **fakta kode produksi aktual per 22 November 2026**.  
> **Peringatan Arsip:** Folder `docs/archive/` berisi laporan audit dan changelog historis lama. **JANGAN** jadikan isi `docs/archive/` sebagai rujukan arsitektur saat ini.

---

## KONTRAK BISNIS & ARSITEKTUR MUTLAK SISTEM (GROUND TRUTH)

1. **Autentikasi Murni Email + Kata Sandi + OTP 6-Digit SMTP (Tanpa Google OAuth):**
   - **Portal Klien (`/login`):** Daftar Akun (`/api/auth/register` via OTP 6 digit SMTP), Masuk (`Credentials` `portal: "CLIENT_PASSWORD"` di `auth.ts`), dan Lupa Kata Sandi (`/api/auth/reset-password` via OTP 6 digit). Google OAuth (`GoogleProvider`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `lib/auth.ts`) **sudah dihapus total** — deployment baru tidak memerlukan konfigurasi Google Cloud Console.
   - **Portal Admin (`/admin/login`):** Kredensial `Admin` (`SUPER_ADMIN`, `ADMIN`, `FINANCE`, `SUPPORT`) dengan RBAC granular dan `sessionVersion`.
   - **Portal Mitra (`/partner`):** Kurasi admin terlebih dulu, aktivasi akun & reset sandi via OTP 6 digit (`/api/partner/auth/set-password`), masuk via Email + Kata Sandi.
2. **Draf Gratis 14 Hari & Gerbang Pembayaran untuk Publikasi:**
   - Klien baru dapat mencoba **Draf Gratis** (`POST /api/client/invitations/free-draft`, maks. 1 per akun, ber-watermark, maks. 3 foto, otomatis dihapus cron setelah 14 hari jika tidak diaktifkan) atau langsung memilih paket berbayar di `/packages`.
   - Publikasi undangan nyata (`PUBLISHED`), fitur paket (`guest_memories`, `qr_checkin`, `custom_domain`), dan pembuatan undangan berbayar (`POST /api/client/invitations/create`) tetap dijaga ketat oleh order `PAID` (HTTP 403 tanpa order lunas). Pelunasan order otomatis mengaktifkan Draf Gratis via `activateFreeDraftForOrder`.
   - Dispatcher status pasca-login berada di [`app/api/client/onboarding-state/route.ts`](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/onboarding-state/route.ts).
3. **Saluran Pembayaran 100% Dikendalikan Admin (*Zero Client Decision*):**
   - Ditentukan tunggal oleh `AdminSetting` key `payment_mode`:
     - `"GATEWAY"`: Midtrans 2-arah (Core API QRIS + fallback Snap, SSE realtime via PostgreSQL `LISTEN/NOTIFY`, pembatalan dua arah).
     - `"MANUAL"`: Transfer bank manual (rekening murni dari DB tanpa hardcode) + unggah bukti transfer WebP ke bucket privat R2 + persetujuan admin.
4. **3 Mode Struktural Abadi, `subEvent` Dinamis, & 81 Tema Master Fisik:**
   - Enum `EventType` memiliki tepat **3 nilai abadi**: `WEDDING` (Pernikahan), `PERSONAL` (Personal & Keluarga: Ulang Tahun, Khitanan, Aqiqah, Wisuda, Syukuran, Tamatan Ngaji, dll.), dan `EVENT` (Acara & Event Umum: Corporate, Seminar, Reuni, Grand Opening, Gathering, dll.) dilengkapi kolom bebas `subEvent`.
   - Inventaris disk & DB: **81 tema master fisik** di `themes/<mode>/<gaya>/<id>.html` (`34` `wedding`, `37` `personal`, `10` `event`) + 3 starter blueprint di `themes/_blueprints/{wedding,personal,event}/`. Pemetaan folder terpusat di [`lib/themePaths.ts`](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/lib/themePaths.ts).
   - Isolasi tema ketat per mode (`isThemeInMode`); pergantian mode selama `DRAFT` hanya via `CHANGE_INVITATION_MODE`; terkunci permanen setelah `PUBLISHED`.
   - Master tulisan tangan (*handcrafted*) dilindungi dari overwrite (HTTP 409 di Theme Builder), dapat disunting lewat **Editor Master**, dibuat variannya (**Varian Tema**), atau disalin ke **Theme Builder Unlimited 3.0** (`?from=<id>`).
5. **Routing, Skema DB, & Penyimpanan Hybrid:**
   - Edge/Request proxy Next.js 16 berada di [`proxy.ts`](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/proxy.ts) (BUKAN `middleware.ts`), menangani custom domain, subdomain `*.luxvite.id`, Strict Subdomain Isolation Guard, dan CSP berbasis nonce.
   - Database PostgreSQL via Prisma 7 (`prisma/schema.prisma`): **28 model**, **17 enum** (termasuk `MediaSlot` 11 nilai dengan `PROFILE_PHOTO` & `EVENT_PHOTO`), serta **129 API route handlers** di `app/api/`.
   - Piring draf undangan disimpan di tabel DB `invitation_drafts`; HTML terbit statis disimpan di disk & Cloudflare R2; Portofolio adalah *full static clone* independen.
6. **Infrastruktur Produksi VPS:**
   - Live di `https://luxvite.id` (Next.js 16.4.6, Node.js 22, PostgreSQL, PM2 cluster 2 worker port `3001`, Caddy On-Demand TLS, Cloudflare reverse proxy, crontab otomatis cleanup `02:00`, backup `03:00`, health-watch tiap menit).

---

## 1. Dokumentasi Sisi Klien / Penyelenggara (`docs/client/`)

| Tahap | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **00** | [ALUR_REGISTRASI_KE_DASHBOARD.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/ALUR_REGISTRASI_KE_DASHBOARD.md) | **Arsitektur End-to-End**: Alur global dari `/login` (Email + Kata Sandi + OTP SMTP), dispatcher onboarding hub, Free Draft / kasir pembayaran, hingga studio editor. |
| **01** | [TAHAP_REGISTRASI_DAN_PEMBAYARAN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_REGISTRASI_DAN_PEMBAYARAN.md) | **Registrasi, Kasir & Kontrol Payment Mode**: Alur daftar OTP & login, kasir `/checkout` dan `/payment`, Midtrans QRIS/Snap, transfer manual, webhook, dan auto-aktivasi. |
| **02** | [TAHAP_DASHBOARD_SETUP_AWAL.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_DASHBOARD_SETUP_AWAL.md) | **Wizard Setup Perdana (4 Langkah)**: Langkah 0 (3 Mode Abadi + Sub-Acara Dinamis), Langkah 1 (Persona Adaptif / `participantsJson`), Langkah 2 (Jadwal & Lokasi), Langkah 3 (Tema Terisolasi). |
| **03** | [TAHAP_STUDIO_EDITOR_UNDANGAN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_STUDIO_EDITOR_UNDANGAN.md) | **Studio Editor 16 Seksi**: `/dashboard/invitation/[id]` Dual-Native Master-Detail, form adaptif 3 mode, slot foto terisolasi (`GROOM`/`BRIDE`/`PROFILE`/`EVENT`), dan kunci pasca publikasi. |
| **04** | [TAHAP_GUEST_MOMENTS_DAN_MEMORIES.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_GUEST_MOMENTS_DAN_MEMORIES.md) | **Pusat Komando Moments & Kuota Pintar**: `/dashboard/moments`, 3 layout kartu pembuka, jadwal multi-sesi dengan Smart Quota Boundary Guard, cetak QR meja 300 DPI, unduh ZIP. |
| **05** | [TAHAP_MANAJEMEN_TAMU_DAN_QR.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_MANAJEMEN_TAMU_DAN_QR.md) | **Buku Tamu & Tiket QR**: `/dashboard/guests`, impor CSV/Excel `.xlsx`, tautan personal `?to=...`, QR check-in, dan broadcast WhatsApp. |
| **06** | [TAHAP_RSVP_DAN_MODERASI_UCAPAN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_RSVP_DAN_MODERASI_UCAPAN.md) | **RSVP & Feed Doa**: `/dashboard/rsvp`, kalkulasi pax katering, balasan tuan rumah, moderasi ucapan, dan ekspor CSV. |
| **07** | [TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md) | **Domain, Sandi & Publikasi**: `/dashboard/settings`, cek subdomain real-time, DNS CNAME/A custom domain, 4-digit PIN panitia, ganti kata sandi, dan WOW Publish pipeline. |

---

## 2. Dokumentasi Sisi Administrator (`docs/admin/`)

| Modul | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **01** | [DASHBOARD_OVERVIEW_DAN_STATISTIK.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DASHBOARD_OVERVIEW_DAN_STATISTIK.md) | **Overview & Analytics**: 4 metrik bisnis utama, distribusi paket, ranking tema populer, dan transaksi terkini. |
| **02** | [REMOTE_DAN_MANAJEMEN_KLIEN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md) | **Remote Session & Klien**: *Cookie-Based Workspace Override* (`lux_remote_client_id`), impersonasi via Server Action + `proxy.ts`, banner remote, dan siklus hidup akun. |
| **03** | [MANAJEMEN_UNDANGAN_DAN_DOMAIN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_UNDANGAN_DAN_DOMAIN.md) | **Undangan & Custom Domain**: Monitoring 5 status undangan, kontrol masa aktif galeri, buka kunci darurat, dan Caddy On-Demand TLS. |
| **04** | [MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md) | **Invoice & Payment Mode**: Pengaturan `payment_mode` (`GATEWAY` vs `MANUAL`), verifikasi transfer manual, dan gateway tunggal Midtrans. |
| **05** | [MANAJEMEN_TEMA_ADMIN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TEMA_ADMIN.md) | **81 Tema Fisik, Sync & Theme Builder**: Arsitektur 3 mode (`wedding`, `personal`, `event`), Theme Builder Unlimited 3.0, Editor Master, Varian Tema, `npm run themes:sync`, dan thumbnail ganda. |
| **06** | [PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md) | **Branding, R2, SMTP & Database**: White-label, `serviceStatus`, SMTP & uji kirim, CORS Cloudflare R2, purge cache, dan backup/restore PostgreSQL. |
| **07** | [CRON_DAN_MAINTENANCE_OTOMATIS.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/CRON_DAN_MAINTENANCE_OTOMATIS.md) | **Tugas Terjadwal & Snapshot**: `/api/cron/cleanup` (retensi, daur ulang subdomain, purge Free Draft >14 hari) dan `/api/cron/backup`. |
| **08** | [DEPLOYMENT_VPS_CADDY.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DEPLOYMENT_VPS_CADDY.md) | **Infrastruktur Produksi**: Setup VPS Ubuntu dari nol, PostgreSQL, Caddy auto-SSL, PM2 cluster, `.env` tanpa Google OAuth, dan `./deploy.sh`. |
| **09** | [MANAJEMEN_FINANCE_DAN_PEMBUKUAN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_FINANCE_DAN_PEMBUKUAN.md) | **Finance & Kas Terpusat**: Grafik arus kas SVG, buku kas keluar OPEX, Tutup Buku bulanan, dan rekapitulasi PPh Final 0,5%. |
| **10** | [MANAJEMEN_MARKETING_DAN_AFILIASI.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_MARKETING_DAN_AFILIASI.md) | **Marketing, Kupon & Portal Mitra**: Kupon diskon, `PromoHold` 15 menit, kemitraan referral + Portal Mitra (`/partner`), komisi otomatis, dan payout ke kas keuangan. |
| **11** | [AGENT_HERMES_VPS_MONITORING.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/AGENT_HERMES_VPS_MONITORING.md) | **Sentinel Monitoring & Watchdog**: 5 pos pengawasan PM2, PostgreSQL, Caddy/Cloudflare, disk/RAM, dan verifikasi backup harian. |

---

## 3. Dokumentasi Sisi Publik & Tamu Undangan (`docs/public/`)

| Fitur | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **01** | [01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md) | **Engine Rendering & URL Router**: Resolusi multi-domain (`proxy.ts`), compiler token 3 mode, Strict Subdomain Isolation Guard, dan Open Graph meta. |
| **02** | [02_PENGALAMAN_TAMU_UNDANGAN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/02_PENGALAMAN_TAMU_UNDANGAN.md) | **Guest Journey**: Cover gate, Web Audio autoplay policy, countdown, kalender Google/`.ics`, dan peta navigasi. |
| **03** | [03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md) | **RSVP & Buku Doa**: `/api/public/rsvp`, auto-fill `?to=...`, rate limit, cookie anti-timpa `lux_rsvp_*`, dan balasan tuan rumah. |
| **04** | [04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md) | **Tanda Kasih & Gift Registry**: Kartu rekening/e-wallet salin 1-klik, QRIS statis, dan klaim kado fisik anti-duplikasi. |
| **05** | [05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md) | **Portal Meja Resepsionis & Layar Sapa TV**: `/receptionist`, `/welcome` (SSE `LISTEN/NOTIFY`), PIN panitia, scanner QR, dan souvenir. |
| **06** | [06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/public/06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md) | **Live Moments & Disposable Camera**: Kamera retro `/sharemoment` (5 filter, date stamp lintas zona waktu), galeri real-time `/memories` (SSE), dan standing banner 300 DPI. |

---

## 4. Dokumentasi Engineering, Database & Keamanan (`docs/`)

| Modul | Dokumen Spesifikasi | Ruang Lingkup & Deskripsi |
|:---:|---|---|
| **DB** | [DATABASE_SCHEMA_DAN_RELASI.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/DATABASE_SCHEMA_DAN_RELASI.md) | **Kamus Data & Skema PostgreSQL**: ERD, 28 model Prisma, 17 enum (`EventType` 3 nilai, `MediaSlot` 11 nilai), relasi & state machine. |
| **API** | [API_REFERENCE.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/API_REFERENCE.md) | **Katalog API Lengkap**: Referensi 129 rute REST/SSE/Webhook (Auth OTP, Publik, Resepsionis, Klien, Mitra, Pembayaran, Admin, Cron). |
| **Theme** | [PANDUAN_PEMBUATAN_TEMA_BARU.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/PANDUAN_PEMBUATAN_TEMA_BARU.md) | **Theme Developer Guide**: Struktur 3 mode (`wedding`, `personal`, `event`), kamus token `{{token}}`, `:root` tokenisasi CSS, dan registrasi tema. |
| **Engine Test** | [PENGUJIAN_THEME_ENGINE.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/PENGUJIAN_THEME_ENGINE.md) | **Matriks Pengujian Mesin Tema**: Cakupan pengujian 81 master tema, 3 mode, live edit, dan kontrak audit engine. |
| **Go-Live** | [GO_LIVE_TEST_MATRIX.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/GO_LIVE_TEST_MATRIX.md) | **Matriks Uji Produksi**: Status verifikasi alur E2E produksi (termasuk SMTP, Midtrans Sandbox, WebRTC, R2, subdomain, & auth tanpa OAuth). |
| **R2 & CDN** | [CLOUDFLARE_R2_DAN_CDN_SETUP.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/CLOUDFLARE_R2_DAN_CDN_SETUP.md) | **Object Storage, CDN & Purge**: Bucket publik & privat R2, domain CDN, auto-CORS, dan Purge Edge Cache API. |
| **Sec** | [SECURITY_DAN_PROTEKSI_DATA.md](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/SECURITY_DAN_PROTEKSI_DATA.md) | **Arsitektur Keamanan**: CSP nonce, AES-256-GCM PIN panitia, validasi magic bytes, rate limiting, dan audit log. |

---

## 5. 3 Dokumen Master (Wajib Sinkron Sebelum Push)

1. [`docs/SYSTEM_ARCHITECTURE.md`](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/SYSTEM_ARCHITECTURE.md) — Arsitektur sistem menyeluruh, routing `proxy.ts`, autentikasi, skema, dan riwayat rilis terbaru (v7.1.0).
2. [`README.md`](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/README.md) — Panduan repositori, alur B2C, instalasi, deployment, dan `.env`.
3. [`docs/S-Invitation.md`](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/S-Invitation.md) — Filosofi bisnis, spesifikasi fitur, dan aturan integritas platform.
4. *(Arsip historis)* [`docs/archive/`](file:///Users/macbookprom1/Documents/Project%20AmsDev/Luxenary-Invite/docs/archive) — Laporan audit lama, handover Theme Builder 9 Nov, dan arsip changelog historis (hanya untuk referensi sejarah).

