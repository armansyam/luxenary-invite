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
        A2[Setiap Pukul 03:00 Pagi] -->|POST /api/cron/backup| B2[Endpoint Auto-Backup Database]
    end

    subgraph AuthGuard [Lapisan Keamanan Otorisasi]
        B1 & B2 --> C{Cek Header Authorization}
        C -->|Bearer CRON_SECRET Valid| D[Izinkan Eksekusi Proses]
        C -->|Admin Session Valid| D
        C -->|Token Salah / Kosong| E[Tolak: 401 Unauthorized]
    end

    subgraph TaskCleanup [Eksekusi Pembersihan (/api/cron/cleanup)]
        D --> F[1. Transisi Status EVENT_FINISHED & Peringatan H-3]
        D --> G[2. Daur Ulang Subdomain & Purge Free Draft > retention_free_draft_days]
        D --> H[3. Verifikasi Arsip NAS Sebelum purgeGuestMemories + $transaction ARCHIVED]
        D --> I[4. Hapus Order PENDING/EXPIRED/FAILED > retention_order_days]
        D --> J[5. Kegagalan Total/Parsial -> sendCronFailureAlertEmail ke SUPER_ADMIN]
    end

    subgraph TaskBackup [Eksekusi Pencadangan (/api/cron/backup)]
        D --> K[Cek Setting: backup_auto_enabled == true]
        K --> L[Eksekusi pg_dump Format Custom .dump]
        L --> M[Rotasi Retensi: Pertahankan backup_retention_count Terbaru]
        M --> N[Kegagalan -> sendCronFailureAlertEmail ke SUPER_ADMIN]
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
1. **Pembersihan Siklus Hidup Terpadu & Urutan Aman Arsip (Single Unified Lifecycle Cleanup):**
   - Mencari undangan yang telah melewati masa simpan pasca acara berdasarkan empat jam retensi terpisah dari acara utama pada zona waktu acara (`subdomain_grace_days`, `retention_cleanup_days` atau `galleryExpiresAt`, `nas_archive_retention_days`; custom domain ditegakkan resolver). Rute dan `npm run cron:cleanup` memanggil `lib/lifecycleCleanup.ts` yang sama; hasil `archiveFailures` berisi undangan yang gagal diarsipkan dan akan dicoba lagi.
   - **Urutan Aman Arsip (v1.1.0):** Sistem **memverifikasi sinkronisasi arsip NAS terlebih dahulu** sebelum mengeksekusi `purgeGuestMemories` dan membungkus transisi status ke `ARCHIVED` di dalam `prisma.$transaction` (mencegah kehilangan foto tamu bila salinan NAS belum tersimpan).
   - Mengunci izin upload foto tamu (`memoriesUploadLocked = true`), melepaskan subdomain kembali ke pool (`subdomain = null`) bila auto-recycle aktif, melepaskan custom domain, membersihkan data RSVP kedaluwarsa, serta memicu invalidasi cache lintas worker (`cache_invalidate`).
2. **Pembersihan Draf Gratis Kedaluwarsa (`retention_free_draft_days`):**
   - Draf Gratis (`isFreeDraft = true`) yang melewati batas hari dinamis dari `admin_settings` (`retention_free_draft_days`, bawaan `14` hari, rentang `1–365`) otomatis dibersihkan beserta piring draf dan media lokal/R2-nya.
3. **Kebijakan Nol Penghapusan Akun Klien (Zero Account Deletion):**
   - Akun pengguna (`User`) di basis data disimpan abadi (<1 KB) agar klien dapat login kembali untuk melihat dasbor memorial dan mengunduh rekapan doa (.CSV).
4. **Pembersihan Invoice Kedaluwarsa:**
   - Pesanan berstatus `EXPIRED`, `FAILED`, atau `PENDING` yang berusia lebih dari `retention_order_days` (bawaan 90 hari) dihapus permanen beserta foto bukti transfernya (`lib/lifecycleCleanup.ts`). Enum `OrderStatus` hanya berisi `PENDING`, `PAID`, `EXPIRED`, `FAILED`; tidak ada status `CANCELLED`.
5. **Email Peringatan Kegagalan Otomatis (`sendCronFailureAlertEmail`):**
   - Bila terjadi kegagalan total maupun parsial (`archiveFailures` tidak kosong atau error saat backup/cleanup), sistem mengirim email peringatan non-blocking ke seluruh akun `SUPER_ADMIN` yang memiliki email melalui `lib/mailer.ts`.

---

## 3. Spesifikasi Endpoint `/api/cron/backup`

Endpoint ini menjamin keselamatan data pengguna (*Disaster Recovery*) dengan membuat salinan basis data PostgreSQL secara terjadwal.

### A. Autentikasi
- **Metode:** `POST` (hanya menerima `POST`)
- **Header:** `Authorization: Bearer <CRON_SECRET>` atau Sesi Aktif Admin.

### B. Logika & Mekanisme Backup (`lib/databaseBackup.ts`):
1. **Pengecekan Status Fitur:**
   Membaca nilai `backup_auto_enabled` dari tabel `AdminSetting`. Jika bernilai `false`, pencadangan otomatis dilewati secara aman.
2. **Pembuatan Snapshot:**
   - Memanggil utilitas bawaan PostgreSQL `pg_dump` dengan koneksi langsung ke `DATABASE_URL`.
   - Format penamaan file: `backup_auto_daily_YYYY-MM-DD_HH-mm-ss.sql` (atau `.backup`).
   - Berkas disimpan di direktori aman yang ditentukan oleh setting `backup_path` (bawaan: `data/backups` di folder proyek).
3. **Pembersihan Snapshot Lama (Rotasi Otomatis):**
   - Sistem membaca tanggal pembuatan berkas snapshot.
   - Retensi dihitung per jumlah berkas, bukan umur: snapshot terlama dihapus bila jumlahnya melebihi `backup_retention_count` (bawaan 10), demi mencegah kepenuhan ruang disk VPS. Dump baru berekstensi `.dump` (format custom); `.sql` lama tetap dikenali.

---

## 4. Konfigurasi Crontab Server Produksi

`deploy.sh` memasang dan menyelaraskan crontab ini otomatis pada setiap deploy; tidak perlu `crontab -e`. Bentuk yang dipasang (aplikasi di port 3001, secret dibaca dari `data/.cron-auth` ber-izin 600):

```cron
0 2 * * * curl -s -X POST -H @/home/USER/luxenary-invite/data/.cron-auth http://localhost:3001/api/cron/cleanup > /dev/null 2>&1
0 3 * * * PATH=/usr/local/bin:/usr/bin:/bin bash /home/USER/luxenary-invite/scripts/cron-backup.sh > /dev/null 2>&1
* * * * * PATH=/usr/local/bin:/usr/bin:/bin bash /home/USER/luxenary-invite/scripts/health-watch.sh
```

> **Catatan:** `/api/cron/backup` hanya menerima `POST`. Versi lama dokumen ini memakai `GET` dan port 3000, yang di produksi gagal diam-diam (keluaran curl dibuang), sehingga backup harian tidak pernah berjalan. Periksa dengan `crontab -l` dan `bash scripts/cron-backup.sh`.

---

## 5. Pemeliharaan & Eksekusi Manual via Dashboard Admin

Selain berjalan otomatis via crontab di atas, Super Admin juga dapat memicu kedua proses ini secara langsung dari antarmuka visual:
1. **Pembersihan Manual:** Masuk ke menu **Admin > Settings > Tab System Maintenance** lalu klik tombol **"Jalankan Cleanup Sekarang"**.
2. **Pencadangan Manual:** Masuk ke menu **Admin > Settings > Tab Database Backup** lalu klik tombol **"Buat Snapshot Database Sekarang"**. Admin juga dapat langsung mengunduh file `.sql` snapshot ke komputer lokal atau melakukan *Restore 1-Klik*.
