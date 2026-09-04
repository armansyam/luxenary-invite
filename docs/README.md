# PUSAT DOKUMENTASI RESMI (DOCS INDEX)
**Luxenary Invite Platform — Multi-Tenant Wedding SaaS & Online Receptionist**

Direktori ini memuat seluruh dokumen spesifikasi teknis, alur data, panduan arsitektur, dan panduan operasional platform Luxenary Invite.

---

## 1. Dokumentasi Administrator (`docs/admin/`)

| Dokumen | Ruang Lingkup | Deskripsi |
|---|---|---|
| [REMOTE_DAN_MANAJEMEN_KLIEN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md) | Fitur Remote & Klien | Panduan lengkap arsitektur *Cookie-Based Workspace Override*, Server Action remote, banner peringatan, pemulihan 1-klik, serta manajemen akun klien dan siklus hidup undangan. |
| [MANAJEMEN_TEMA_ADMIN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/MANAJEMEN_TEMA_ADMIN.md) | Desain & Tema | Panduan *Single Source of Truth* tema HTML fisik, upload master `.html`, kompilasi otomatis demo statis, dan sinkronisasi disk-to-database. |
| [DEPLOYMENT_VPS_CADDY.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/admin/DEPLOYMENT_VPS_CADDY.md) | Infrastruktur & Server | Panduan arsitektur deployment VPS Ubuntu, konfigurasi PM2 cluster, database PostgreSQL, dan reverse proxy Caddy dengan SSL otomatis. |

---

## 2. Dokumentasi Alur Klien & Onboarding (`docs/client/` & `docs/`)

| Dokumen | Ruang Lingkup | Deskripsi |
|---|---|---|
| [ALUR_REGISTRASI_KE_DASHBOARD.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/ALUR_REGISTRASI_KE_DASHBOARD.md) | Alur Lengkap End-to-End | Membedah siklus hidup pengguna sejak landing page, Google OAuth, dispatcher onboarding hub, kasir pembayaran, hingga masuk studio editor undangan. |
| [TAHAP_REGISTRASI_DAN_PEMBAYARAN.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_REGISTRASI_DAN_PEMBAYARAN.md) | Kasir & Transaksi | Penjelasan checkout multi-gateway (QRIS otomatis, Transfer Bank manual, Duitku, Xendit, Midtrans) dan verifikasi bukti bayar. |
| [TAHAP_DASHBOARD_SETUP_AWAL.md](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/client/TAHAP_DASHBOARD_SETUP_AWAL.md) | Setup Wizard Perdana | Penyiapan undangan 3 langkah (Profil Mempelai, Tanggal/Lokasi, Pemilihan Tema) dengan state dinamis dan persistensi draft `localStorage`. |

---

## 3. Dokumen Master Root Proyek

Di samping folder `docs/`, repositori ini memiliki 3 dokumen master arsitektur level atas yang wajib sinkron setiap saat:
1. [`SYSTEM_ARCHITECTURE.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/SYSTEM_ARCHITECTURE.md) — Arsitektur sistem menyeluruh, diagram alur, skema database, dan API Route Map lengkap.
2. [`README.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/README.md) — Panduan repositori, pohon direktori, instalasi, deployment, dan lingkungan env.
3. [`S-Invitation.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/S-Invitation.md) — Filosofi bisnis, spesifikasi tema fisik, dan aturan integritas platform.
