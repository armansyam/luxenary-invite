# Panduan Lengkap Deployment Produksi VPS (Ubuntu 22.04/24.04 LTS)
## Arsitektur: Next.js 16 + PostgreSQL + Cloudflare + Caddy Server (On-Demand TLS)

> **Spesifikasi Server Target:** 2 Core CPU, 2 GB RAM (+ 2 GB Swap), 58 GB SSD  
> **Status:** Siap Produksi (*Production Ready*) | Diperbarui: September 2026

Dokumen ini adalah buku panduan operasional (*runbook*) langkah demi langkah untuk membangun dan menyalakan platform **Luxenary Invite** di server VPS baru dari nol hingga berjalan otomatis (*autopilot*).

---

## DAFTAR TAHAPAN DEPLOYMENT

1. [Tahap 1: Setup Awal VPS & Swap Memori](#tahap-1-setup-awal-vps--swap-memori)
2. [Tahap 2: Instalasi Node.js 20 LTS, PM2 & PostgreSQL](#tahap-2-instalasi-nodejs-20-lts-pm2--postgresql)
3. [Tahap 3: Konfigurasi DNS & SSL Cloudflare (Tameng Luar)](#tahap-3-konfigurasi-dns--ssl-cloudflare-tameng-luar)
4. [Tahap 4: Setup Caddy Web Server (Reverse Proxy & Auto SSL)](#tahap-4-setup-caddy-web-server-reverse-proxy--auto-ssl)
5. [Tahap 5: Pemasangan Kode Program & Environment (.env)](#tahap-5-pemasangan-kode-program--environment-env)
6. [Tahap 6: Migrasi Database & Seeding Data Awal](#tahap-6-migrasi-database--seeding-data-awal)
7. [Tahap 7: Eksekusi Deploy Otomatis (`./deploy.sh`)](#tahap-7-eksekusi-deploy-otomatis-deploysh)
8. [Tahap 8: Setup Cron Job Pemeliharaan Otomatis](#tahap-8-setup-cron-job-pemeliharaan-otomatis)
9. [Tahap 9: Checklist Verifikasi Pasca-Deploy](#tahap-9-checklist-verifikasi-pasca-deploy)
10. [Panduan Pembaruan Kode Selanjutnya (Update/Maintenance)](#panduan-pembaruan-kode-selanjutnya-updatemaintenance)
11. [Tahap 10: Panduan Skalabilitas Multi-Server (Shared Storage NFS & Symlink Blueprint)](#tahap-10-panduan-skalabilitas-multi-server-shared-storage-nfs--symlink-blueprint)

---

## Tahap 1: Setup Awal VPS & Swap Memori

Login ke server VPS via SSH:
```bash
ssh root@IP_VPS_ANDA
```

### 1.1 Update Paket Sistem
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential ffmpeg
```

### 1.2 Pastikan Swap File 2 GB Aktif (Krusial untuk Server RAM 2 GB)
Periksa apakah server sudah memiliki Swap:
```bash
swapon --show
```
*Jika belum ada Swap atau kurang dari 2 GB, jalankan:*
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Tahap 2: Instalasi Node.js 20 LTS, PM2 & PostgreSQL

### 2.1 Install Node.js v20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Pastikan v20.x.x
npm -v
```

### 2.2 Install PM2 Global
```bash
sudo npm install -g pm2
```

### 2.3 Install & Konfigurasi PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Buat database dan user khusus aplikasi:
```bash
sudo -u postgres psql
```
*Di dalam prompt PostgreSQL (`postgres=#`), jalankan perintah berikut (ganti `PasswordKuat123!` dengan password rahasia Anda):*
```sql
CREATE DATABASE luxenary_db;
CREATE USER lux_user WITH ENCRYPTED PASSWORD 'PasswordKuat123!';
GRANT ALL PRIVILEGES ON DATABASE luxenary_db TO lux_user;
ALTER DATABASE luxenary_db OWNER TO lux_user;
\q
```

---

## Tahap 3: Konfigurasi DNS & SSL Cloudflare (Tameng Luar)

Buka dashboard [Cloudflare](https://dash.cloudflare.com) untuk domain Anda:

### 3.1 Setup DNS Records (Hanya 2 Baris A Record)
Masuk ke menu **DNS** > **Records**, tambahkan:
1. **Domain Utama:**
   - **Type:** `A`
   - **Name:** `@`
   - **IPv4 address:** `IP_VPS_ANDA`
   - **Proxy status:** **Proxied (Awan Oranye)**
2. **Wildcard Subdomain (Untuk Semua Undangan Klien):**
   - **Type:** `A`
   - **Name:** `*`
   - **IPv4 address:** `IP_VPS_ANDA`
   - **Proxy status:** **Proxied (Awan Oranye)**

### 3.2 Setup Enkripsi SSL Cloudflare
Masuk ke menu **SSL/TLS** > **Overview**:
- Pilih mode enkripsi: **Full** (atau **Full (Strict)**).

---

## Tahap 4: Setup Caddy Web Server (Reverse Proxy & Auto SSL)

Caddy menggantikan Nginx karena Caddy **100% otomatis** mengelola SSL, On-Demand TLS untuk custom domain, dan sangat hemat memori (~30 MB RAM).

### 4.1 Matikan Nginx (Jika Terpasang Bawaan)
```bash
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl disable nginx 2>/dev/null || true
```

### 4.2 Install Caddy Resmi
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### 4.3 Konfigurasi Caddyfile Master
Buka file Caddyfile:
```bash
sudo nano /etc/caddy/Caddyfile
```
Hapus seluruh isi default, lalu isi dengan konfigurasi berikut *(ganti `domainanda.id` dengan nama domain asli Anda)*:

```caddyfile
# ------------------------------------------------------------------------------
# 1. Konfigurasi On-Demand TLS (Untuk Custom Domain Klien di Masa Depan)
# ------------------------------------------------------------------------------
{
    on_demand_tls {
        ask http://localhost:3001/api/public/resolve-custom-domain
    }
}

# ------------------------------------------------------------------------------
# 2. Domain Utama & Seluruh Wildcard Subdomain Platform
# ------------------------------------------------------------------------------
domainanda.id, *.domainanda.id {
    encode zstd gzip
    reverse_proxy localhost:3001
}

# ------------------------------------------------------------------------------
# 3. Router Penangkap Otomatis untuk Seluruh Custom Domain Klien
# ------------------------------------------------------------------------------
https:// {
    tls {
        on_demand
    }
    encode zstd gzip
    reverse_proxy localhost:3001
}
```

Simpan file (`CTRL + O`, lalu `Enter`, lalu `CTRL + X`), kemudian jalankan ulang Caddy:
```bash
sudo systemctl restart caddy
sudo systemctl enable caddy
```

---

## Tahap 5: Pemasangan Kode Program & Environment (.env)

### 5.1 Clone Repository ke Server
```bash
cd ~
git clone URL_REPOSITORY_ANDA luxenary-invite
cd ~/luxenary-invite
```

### 5.2 Siapkan Konfigurasi `.env`
Salin template konfigurasi:
```bash
cp .env.example .env
nano .env
```

Sesuaikan nilai variabel-variabel kunci berikut:
```env
# URL & Host
NEXT_PUBLIC_APP_URL="https://domainanda.id"
NEXT_PUBLIC_ROOT_DOMAIN="domainanda.id"
NEXTAUTH_URL="https://domainanda.id"

# Database PostgreSQL (Gunakan password yang dibuat di Tahap 2.3)
DATABASE_URL="postgresql://lux_user:PasswordKuat123!@localhost:5432/luxenary_db?schema=public&connection_limit=15&pool_timeout=20"

# Kunci Enkripsi (Otomatis dibuat jika dibiarkan kosong, atau buat manual via openssl rand -base64 32)
AUTH_SECRET=""
NEXTAUTH_SECRET=""
CRON_SECRET=""
PIN_ENCRYPTION_KEY=""

# Google OAuth Login Klien (Dari Google Cloud Console)
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"

# Penyimpanan Cloudflare R2 (Sangat Direkomendasikan)
STORAGE_PROVIDER="r2"
S3_ENDPOINT="https://ACCOUNT_ID_ANDA.r2.cloudflarestorage.com"
S3_BUCKET_NAME="nama-bucket-r2-anda"
S3_ACCESS_KEY="access-key-r2"
S3_SECRET_KEY="secret-key-r2"
S3_CUSTOM_DOMAIN="https://cdn.domainanda.id"
```
Simpan file (`CTRL + O`, `Enter`, `CTRL + X`).

---

## Tahap 6: Migrasi Database & Seeding Data Awal

Jalankan sinkronisasi skema database dan pengisian katalog tema & akun admin:
```bash
# 1. Install dependensi awal
npm install

# 2. Sinkronkan skema database
npx prisma generate
npx prisma migrate deploy

# 3. Jalankan seed awal (Membuat akun Super Admin & 15 Katalog Tema Resmi)
npx prisma db seed
```
> **Catatan Akun Default Hasil Seed:**  
> - **URL Admin:** `https://domainanda.id/admin/login`  
> - **Email:** `admin@luxenary.com`  
> - **Password:** `admin123` *(Harap segera ganti password di dashboard admin).*

---

## Tahap 7: Eksekusi Deploy Otomatis (`./deploy.sh`)

Jalankan skrip deploy yang telah dioptimasi untuk server 2GB:
```bash
chmod +x deploy.sh
./deploy.sh
```

Skrip ini akan otomatis:
1. Memeriksa & membuat kunci rahasia acak (`AUTH_SECRET`, `CRON_SECRET`, dll) jika masih kosong.
2. Menjalankan `npm install`.
3. Membangun Next.js produksi dengan proteksi memori aman: `NODE_OPTIONS="--max-old-space-size=1536" npm run build`.
4. Menyalakan aplikasi via PM2 (`ecosystem.config.js`).

### Setup PM2 Auto-Start Saat VPS Reboot:
Agar aplikasi otomatis menyala kembali jika server VPS mengalami restart/reboot:
```bash
pm2 startup
# Jalankan baris perintah 'sudo env PATH=...' yang muncul di layar terminal Anda
pm2 save
```

---

## Tahap 8: Setup Cron Job Pemeliharaan Otomatis

Buka crontab server:
```bash
crontab -e
```
Tambahkan baris berikut di bagian paling bawah *(ganti `CRON_SECRET_ANDA` sesuai yang ada di `.env`)*:

```cron
# 1. Pembersihan harian data kadaluarsa & cache usang (Pukul 02.00 pagi)
0 2 * * * curl -X POST -H "Authorization: Bearer CRON_SECRET_ANDA" http://localhost:3001/api/cron/cleanup > /dev/null 2>&1

# 2. Pencadangan database otomatis harian (Pukul 03.00 pagi)
0 3 * * * curl -X POST -H "Authorization: Bearer CRON_SECRET_ANDA" http://localhost:3001/api/cron/backup > /dev/null 2>&1
```

---

## Tahap 9: Checklist Verifikasi Pasca-Deploy

Buka peramban (browser) Anda dan uji beberapa hal berikut:
1. **Akses Web Utama:** Buka `https://domainanda.id` (Pastikan berlogo gembok HTTPS aman).
2. **Login Portal Admin:** Buka `https://domainanda.id/admin/login` dengan akun default:
   - Email: `admin@luxenary.com`
   - Password: `admin123`
3. **Pengaturan Identitas Platform:** Di dasbor Admin > Tab **Platform**, ubah nama platform, kontak WhatsApp, dan email dukungan resmi Anda.
4. **Uji Demo Tema:** Buka `https://domainanda.id/demo` dan buka salah satu tema (misal `kalandra`).
5. **Uji Subdomain:** Buat 1 pesanan undangan uji coba dan terbitkan ke subdomain (misal `tes-link.domainanda.id`). Pastikan link terbuka tanpa kendala SSL.

---

## Panduan Pembaruan Kode Selanjutnya (Update/Maintenance)

Jika di kemudian hari Anda melakukan update kode dari komputer lokal dan melakukan `git push` ke GitHub, cara memperbarui server produksi sangat praktis karena skrip `./deploy.sh` sudah otomatis menjalankan `git pull origin main`:

```bash
cd ~/luxenary-invite
./deploy.sh
```
*Skrip akan otomatis menarik kode terbaru dari GitHub (`git pull origin main`), memperbarui dependensi, migrasi database, me-rebuild Next.js, dan me-reload PM2 secara zero-downtime!*

---

## Tahap 10: Panduan Skalabilitas Multi-Server (Shared Storage NFS & Symlink Blueprint)

Ketika lalu lintas platform melonjak tinggi dan Anda memutuskan menambah node komputasi menjadi **2 Server VPS atau lebih (Multi-Server Cluster)** di belakang Load Balancer (misal Cloudflare Load Balancing, HAProxy, atau Caddy Load Balancer), ada aturan fundamental terkait persistensi berkas (*stateful assets*):

```
                       [ Pengunjung / Calon Pengantin / Tamu ]
                                        │
                                        ▼
                   [ Cloudflare DNS / Load Balancer (HTTPS) ]
                                   ┌────┴────┐
                                   ▼         ▼
                            [ Node VPS 1 ] [ Node VPS 2 ]
                                   │         │
                   ┌───────────────┼─────────┴───────────────┐
                   ▼               ▼                         ▼
         [ Central PostgreSQL ]  [ Cloudflare R2 ]   [ Shared Storage (NFS) ]
         (Tabel, Order, Relasi)  (Foto, Musik, WebP) (Mounted ke /mnt/shared_luxenary)
                                                             │
                                         ┌───────────────────┴───────────────────┐
                                         ▼                                       ▼
                                [ themes/ & demo/ ]                    [ drafts/ & published/ ]
                                (Master HTML & Showroom)               (Preview & Undangan Live)
```

### 10.1 Prinsip Desain: Portabilitas Kode vs Abstraksi OS
> [!IMPORTANT]
> **DILARANG MENGUBAH KODE APLIKASI NEXT.JS MENJADI PATH `/mnt/...`!**  
> Di dalam kode TypeScript/Node.js, semua pembacaan file tetap wajib menggunakan standar portabel:
> `path.join(process.cwd(), "themes")`, `path.join(process.cwd(), "public/demo")`, `path.join(process.cwd(), "data/drafts")`, dan `path.join(process.cwd(), "public/published")`.  
> Tujuannya: Kode tetap 100% konsisten dan dapat dijalankan di laptop developer (macOS/Windows) tanpa butuh konfigurasi path aneh, sedangkan di server produksi Linux kita menggunakan abstraksi filesystem kernel via **Symbolic Links (`ln -s`)**.

### 10.2 Identifikasi Folder Stateful yang Wajib Disinkronkan
Di arsitektur Luxenary Invite, aset terbagi 3 jenis:
1. **Stateless / Build-time:** Kode Next.js (`app/`, `lib/`, `components/`, `.next/`). Cukup disinkronkan via `git pull` & `npm run build` di tiap server.
2. **Centralized Object Storage:** Foto mempelai, cover, galeri kenangan, audio musik latar (`public/uploads/` saat di cloud dialihkan ke Cloudflare R2 via `STORAGE_PROVIDER=r2`). Ini otomatis tersimpan di cloud R2, jadi tidak membutuhkan harddisk lokal bersama.
3. **Stateful Filesystem yang Wajib Disinkronkan (Shared Directory):**
   - `themes/`: Tempat Admin mengunggah template master `.html` baru via UI (`themes/minimalist/`, `themes/modern/`, dll.).
   - `public/demo/`: Berkas demo statis hasil kompilasi master tema.
   - `data/drafts/`: Piring draft mandiri HTML klien yang sedang diedit di Studio Editor.
   - `public/published/`: Berkas HTML undangan final yang telah diterbitkan (*baked standalone HTML*).

### 10.3 Langkah Pemasangan Shared Storage (NFS) & Symlink di Server

Misalkan Anda menyiapkan 1 dedicated Shared Volume / NFS Server dengan alamat IP internal: `10.0.0.100` (atau private IP antar-VPS Anda).

#### A. Di Server Penyimpan Data (NFS Host / Storage Server):
1. Install NFS Server:
   ```bash
   sudo apt install -y nfs-kernel-server
   sudo mkdir -p /mnt/shared_luxenary/{themes,demo,drafts,published}
   sudo chown -R www-data:www-data /mnt/shared_luxenary
   sudo chmod -R 775 /mnt/shared_luxenary
   ```
2. Ekspor direktori ke subnet private VPS Anda di `/etc/exports`:
   ```bash
   echo '/mnt/shared_luxenary 10.0.0.0/24(rw,sync,no_subtree_check,no_root_squash)' | sudo tee -a /etc/exports
   sudo exportfs -a
   sudo systemctl restart nfs-kernel-server
   ```

#### B. Di Setiap Node Aplikasi (VPS 1, VPS 2, dst):
1. Install NFS Client:
   ```bash
   sudo apt install -y nfs-common
   sudo mkdir -p /mnt/shared_luxenary
   ```
2. Pasang mounting otomatis di `/etc/fstab`:
   ```bash
   echo '10.0.0.100:/mnt/shared_luxenary /mnt/shared_luxenary nfs auto,nofail,noatime,nolock,intr,tcp,actimeo=1800 0 0' | sudo tee -a /etc/fstab
   sudo mount -a
   ```
3. Hubungkan ke folder project menggunakan **Symlink Linux**:
   ```bash
   cd ~/luxenary-invite

   # 1. Pastikan folder data dan public sudah ada
   mkdir -p data public

   # 2. Pindahkan aset awal (jika belum ada di storage bersama)
   cp -rn themes/* /mnt/shared_luxenary/themes/ 2>/dev/null || true
   cp -rn public/demo/* /mnt/shared_luxenary/demo/ 2>/dev/null || true

   # 3. Hapus folder lokal lama dan gantikan dengan Symlink transparan
   rm -rf themes public/demo data/drafts public/published
   ln -s /mnt/shared_luxenary/themes ~/luxenary-invite/themes
   ln -s /mnt/shared_luxenary/demo ~/luxenary-invite/public/demo
   ln -s /mnt/shared_luxenary/drafts ~/luxenary-invite/data/drafts
   ln -s /mnt/shared_luxenary/published ~/luxenary-invite/public/published
   ```
4. Verifikasi symlink:
   ```bash
   ls -la ~/luxenary-invite/themes
   ls -la ~/luxenary-invite/public/demo
   # Hasilnya harus menampilkan pointer panah: themes -> /mnt/shared_luxenary/themes
   ```

### 10.4 Mengapa Pola Symlink Ini Jauh Lebih Aman?
1. **Zero Code Changes:** Anda tidak perlu menambahkan variabel lingkungan `THEMES_DIR=/mnt/...` atau mengubah puluhan file TypeScript.
2. **Kinerja Maksimal:** Node.js dan kernel Linux membaca symlink secara native di level filesystem tanpa latensi overhead library pihak ketiga.
3. **Konsistensi Dua Arah:** Saat Admin mengunggah tema baru di VPS 1, file langsung tersimpan di `/mnt/shared_luxenary/themes/`. Detik itu juga, VPS 2 langsung dapat membaca dan menyajikan tema tersebut ke pengunjung tanpa proses replikasi manual!
4. **Sentralisasi Database & R2:** Seluruh order, user, dan token login tersimpan di database PostgreSQL terpusat, dan semua gambar tersimpan di Cloudflare R2. Sistem menjadi murni *stateless compute with shared asset volume*.


