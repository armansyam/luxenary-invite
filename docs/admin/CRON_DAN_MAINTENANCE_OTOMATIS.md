# DOKUMENTASI RESMI: CRON JOB & PEMELIHARAAN OTOMATIS
**Luxenary Invite Platform — Pembersihan Data Kadaluarsa, Retensi Storage, & Snapshot Database Otomatis**

Dokumen ini membedah arsitektur operasional tugas terjadwal (*Scheduled Tasks / Cron Jobs*) pada platform Luxenary Invite, mencakup siklus pembersihan data usang, retensi media foto tamu, daur ulang subdomain, serta pencadangan database berkala.

---

## 1. Arsitektur Pemeliharaan Otomatis

Platform berjalan secara *autopilot* melalui 2 endpoint cron utama yang dipicu secara terjadwal:

```mermaid
flowchart TD
    subgraph CronTrigger [Pemicu Terjadwal: Crontab VPS / Eksternal]
        A1[Setiap Pukul 02:00 Pagi] -->|POST /api/cron/cleanup| B1[Endpoint Pembersihan Otomatis]
        A2[Setiap Pukul 03:00 Pagi] -->|GET /api/cron/backup| B2[Endpoint Auto-Backup Database]
    end

    subgraph AuthGuard [Lapisan Keamanan Otorisasi]
        B1 & B2 --> C{Cek Header Authorization}
        C -->|Bearer CRON_SECRET Valid| D[Izinkan Eksekusi Proses]
        C -->|Admin Session Valid| D
        C -->|Token Salah / Kosong| E[Tolak: 401 Unauthorized]
    end

    subgraph TaskCleanup [Eksekusi Pembersihan (/api/cron/cleanup)]
        D --> F[1. Transisi Status EVENT_FINISHED: H+7 Hari Acara]
        D --> G[2. Daur Ulang Subdomain Undangan Kadaluarsa]
        D --> H[3. Pembersihan File HTML Statis Subdomain]
        D --> I[4. Hapus Foto Tamu yang Melewati Batas Retensi: H+30 Hari]
        D --> J[5. Batalkan Order PENDING Usang: >30 Hari]
    end

    subgraph TaskBackup [Eksekusi Pencadangan (/api/cron/backup)]
        D --> K[Cek Setting: backup_auto_enabled == true]
        K --> L[Eksekusi pg_dump via Node.js Child Process]
        L --> M[Simpan Snapshot ke Folder Backup: *.sql / *.backup]
        M --> N[Rotasi Retensi: Hapus Snapshot Tua > 7 Hari]
    end
```

---

## 2. Spesifikasi Endpoint `/api/cron/cleanup`

Endpoint ini bertugas menjaga performa database dan kapasitas storage agar tetap ramping, cepat, dan terhindar dari data sampah (*orphaned data*).

### A. Autentikasi & Keamanan
- **Metode:** `POST`
- **Header:** `Authorization: Bearer <CRON_SECRET>`
- Endpoint menolak seluruh akses tanpa token rahasia yang sah (mencegah eksploitasi Denial of Service).

### B. Tahapan Pembersihan yang Dilakukan:
1. **Peralihan Siklus Hidup Undangan (`EVENT_FINISHED`):**
   - Mencari undangan berstatus `PUBLISHED` yang tanggal acaranya sudah lewat lebih dari nilai konfigurasi `retention_invitation_grace_days` (default: 7 hari).
   - Mengubah status undangan menjadi `EVENT_FINISHED`.
   - Mengunci unggahan momen tamu (`memoriesUploadLocked = true`) agar berkas tidak berubah saat diunduh menjadi ZIP.
   - Menghapus file HTML subdomain statis di `public/published/` sehingga akses subdomain otomatis dialihkan (*internal rewrite*) ke galeri kenangan tamu (`/s/[subdomain]/memories`).
2. **Daur Ulang Subdomain (*Subdomain Recycling*):**
   - Jika pengaturan `subdomain_auto_recycle` bernilai `true`, subdomain dari undangan yang sudah kadaluarsa lebih dari `subdomain_grace_days` akan dilepaskan (`subdomain = null`).
   - Subdomain yang terlepas dapat kembali digunakan oleh calon pengantin baru.
3. **Pembersihan Foto Tamu Sesuai Retensi (`Guest Memories Retention`):**
   - Foto tamu memiliki masa simpan default 30 hari pasca-acara (`retention_gallery_default_days`).
   - Jika klien tidak membeli Add-on perpanjangan galeri (+30 hari) dan batas `galleryExpiresAt` telah lewat, sistem akan:
     - Menghapus record `GuestMemory` dari database PostgreSQL.
     - Menghapus objek file foto terkait dari bucket **Cloudflare R2**.
4. **Pembersihan Invoice Kadaluarsa:**
   - Pesanan berstatus `PENDING` yang berusia lebih dari `retention_order_days` (default: 30 hari) otomatis diubah menjadi `CANCELLED`.
5. **Pembersihan Akun Nonaktif:**
   - Akun pengguna yang tidak pernah melakukan transaksi atau tidak memiliki undangan aktif selama lebih dari `retention_account_days` (default: 365 hari) ditandai untuk dihapus.

---

## 3. Spesifikasi Endpoint `/api/cron/backup`

Endpoint ini menjamin keselamatan data pengguna (*Disaster Recovery*) dengan membuat salinan basis data PostgreSQL secara terjadwal.

### A. Autentikasi
- **Metode:** `GET` atau `POST`
- **Header:** `Authorization: Bearer <CRON_SECRET>` atau Sesi Aktif Admin.

### B. Logika & Mekanisme Backup (`lib/databaseBackup.ts`):
1. **Pengecekan Status Fitur:**
   Membaca nilai `backup_auto_enabled` dari tabel `AdminSetting`. Jika bernilai `false`, pencadangan otomatis dilewati secara aman.
2. **Pembuatan Snapshot:**
   - Memanggil utilitas bawaan PostgreSQL `pg_dump` dengan koneksi langsung ke `DATABASE_URL`.
   - Format penamaan file: `backup_auto_daily_YYYY-MM-DD_HH-mm-ss.sql` (atau `.backup`).
   - Berkas disimpan di direktori aman yang ditentukan oleh setting `backup_storage_path` (default: folder server internal).
3. **Pembersihan Snapshot Lama (Rotasi Otomatis):**
   - Sistem membaca tanggal pembuatan berkas snapshot.
   - File backup otomatis yang berusia lebih dari masa retensi (default: 7 hari) akan dihapus secara otomatis demi mencegah kepenuhan ruang disk VPS.

---

## 4. Konfigurasi Crontab Server Produksi

Pada server VPS Ubuntu, pasang penjadwalan crontab berikut melalui perintah `crontab -e`:

```cron
# ==============================================================================
# LUXENARY INVITE - AUTOMATED SYSTEM MAINTENANCE CRONTAB
# ==============================================================================

# 1. Pembersihan data kadaluarsa & siklus hidup undangan (Setiap hari pukul 02:00 Pagi)
0 2 * * * curl -s -X POST -H "Authorization: Bearer CRON_SECRET_ANDA" http://localhost:3000/api/cron/cleanup > /dev/null 2>&1

# 2. Snapshot database otomatis (Setiap hari pukul 03:00 Pagi)
0 3 * * * curl -s -X GET -H "Authorization: Bearer CRON_SECRET_ANDA" http://localhost:3000/api/cron/backup > /dev/null 2>&1
```

> **Catatan Pengaturan:**
> Ganti `CRON_SECRET_ANDA` dengan nilai string rahasia yang tertera pada baris `CRON_SECRET` di dalam file `/var/www/luxenary-invite/.env`.

---

## 5. Pemeliharaan & Eksekusi Manual via Dashboard Admin

Selain berjalan otomatis via crontab di atas, Super Admin juga dapat memicu kedua proses ini secara langsung dari antarmuka visual:
1. **Pembersihan Manual:** Masuk ke menu **Admin > Settings > Tab System Maintenance** lalu klik tombol **"Jalankan Cleanup Sekarang"**.
2. **Pencadangan Manual:** Masuk ke menu **Admin > Settings > Tab Database Backup** lalu klik tombol **"Buat Snapshot Database Sekarang"**. Admin juga dapat langsung mengunduh file `.sql` snapshot ke komputer lokal atau melakukan *Restore 1-Klik*.
