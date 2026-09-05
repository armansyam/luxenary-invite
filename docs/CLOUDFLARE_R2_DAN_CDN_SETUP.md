# DOKUMENTASI RESMI: PANDUAN SETUP CLOUDFLARE R2 & CDN
**Luxenary Invite Platform — Cloud Object Storage, Custom Domain CDN, & Aturan CORS Otomatis**

Dokumen ini membedah arsitektur penyimpanan cloud (*Object Storage*) pada platform Luxenary Invite menggunakan **Cloudflare R2** untuk melayani seluruh foto galeri pengantin, lagu musik, dan foto candid tamu tanpa membebani memori maupun disk VPS.

---

## 1. Keuntungan Penggunaan Cloudflare R2

1. **Bebas Biaya Egress (Zero Egress Fees):**
   Berbeda dengan AWS S3 atau Google Cloud Storage yang mengenakan biaya per Gigabyte data yang didownload pengunjung, Cloudflare R2 membebaskan biaya transfer keluar (bandwidth download $0).
2. **Performa CDN Global:**
   Aset foto di-cache pada jaringan edge Cloudflare di ratusan kota di seluruh dunia, sehingga foto galeri terbuka dalam hitungan milidetik.
3. **Pemisahan Beban Server (Offload):**
   Server VPS hanya memproses logika aplikasi dan database. File berukuran besar tidak pernah memakan ruang SSD 58 GB VPS.

---

## 2. Langkah-Langkah Pembuatan Bucket R2

### A. Buat Bucket di Dashboard Cloudflare
1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com) > Pilih menu **R2 Object Storage**.
2. Klik tombol **"Create bucket"**.
3. Beri nama bucket, contoh: `luxenary-storage`.
4. Pilih lokasi: **Automatic** (atau Western/Eastern Asia).
5. Klik **Create Bucket**.

### B. Hubungkan Custom Domain CDN ke Bucket
Agar URL gambar terlihat profesional dan menggunakan domain Anda sendiri (contoh: `https://cdn.domainanda.id/invitations/...`):
1. Masuk ke bucket yang baru dibuat > Buka tab **Settings**.
2. Gulir ke bagian **Public Development API & Custom Domains**.
3. Klik tombol **"Connect Domain"**.
4. Masukkan nama domain CDN Anda: `cdn.domainanda.id`.
5. Klik **Continue** dan konfirmasi. Cloudflare akan otomatis mengonfigurasi DNS dan SSL untuk subdomain CDN tersebut.

### C. Buat API Token (Access Key & Secret Key)
1. Di halaman utama menu R2 (luar bucket), klik **"Manage R2 API Tokens"** di panel kanan.
2. Klik **"Create API token"**.
3. Berikan izin: **Object Read & Write**.
4. Tetapkan masa berlaku (*TTL*): **Forever** (atau sesuai kebijakan Anda).
5. Klik **Create API Token**.
6. Simpan informasi penting berikut ke catatan aman:
   - **Account ID**
   - **Access Key ID**
   - **Secret Access Key**
   - **S3 Endpoint:** `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## 3. Konfigurasi Variabel di `.env` Server VPS

Buka file `~/luxenary-invite/.env` di VPS Anda:
```env
# Aktifkan Provider R2
STORAGE_PROVIDER="r2"

# Kredensial R2 dari Tahap 2.C
S3_ENDPOINT="https://ACCOUNT_ID_ANDA.r2.cloudflarestorage.com"
S3_BUCKET_NAME="luxenary-storage"
S3_ACCESS_KEY="ACCESS_KEY_ANDA"
S3_SECRET_KEY="SECRET_KEY_ANDA"

# Custom Domain CDN dari Tahap 2.B
S3_CUSTOM_DOMAIN="https://cdn.domainanda.id"
```

---

## 4. Sinkronisasi Kebijakan CORS Otomatis (1-Klik)

Agar foto dan audio di R2 dapat diputar dan ditampilkan di canvas tanpa terblokir oleh kebijakan lintas asal (*Cross-Origin Resource Sharing*), platform menyediakan sinkronisasi otomatis (`lib/r2cors.ts`):

1. Buka **Dashboard Admin** di `https://domainanda.id/admin`.
2. Masuk ke menu **Settings > Tab Cloudflare R2**.
3. Klik tombol **"Terapkan Kebijakan CORS R2"**.
4. Sistem akan otomatis berkomunikasi dengan API Cloudflare R2 dan menerapkan aturan:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedOrigins": [
         "https://domainanda.id",
         "https://*.domainanda.id"
       ],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

---

## 5. Konfigurasi Aturan Daur Ulang Otomatis (Lifecycle Rules)

Untuk menghemat biaya penyimpanan, Anda dapat mengaktifkan pembersihan otomatis khusus foto tamu hari-H:
1. Buka bucket R2 di Cloudflare Dashboard > Masuk ke tab **Settings**.
2. Gulir ke bagian **Lifecycle Rules** > Klik **"Add rule"**.
3. Berikan konfigurasi:
   - **Rule name:** `Auto-Delete Guest Memories 60 Days`
   - **Prefix filter:** `guest-memories/`
   - **Action:** Delete object after **60 days**.
4. Klik **Save rule**.
5. Dengan aturan ini, seluruh foto tamu yang telah selesai dan diunduh oleh pengantin akan otomatis terhapus dari bucket setelah 60 hari secara cuma-cuma.
