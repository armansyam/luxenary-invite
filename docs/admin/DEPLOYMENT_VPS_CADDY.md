# Panduan Deployment VPS & Konfigurasi Caddy Server (Otomatisasi Custom Domain)

Dokumen ini merupakan panduan praktis (*runbook*) bagi Administrator/DevOps saat mempublikasikan aplikasi Luxenary Invite ke server produksi (VPS).

## 1. Persiapan Awal (Node.js & PM2)
Sistem Luxenary menggunakan PM2 sebagai *process manager*.
1. Pastikan Node.js (minimal v18) terinstal di VPS.
2. Jalankan perintah *deploy*:
   ```bash
   ./deploy.sh
   ```
   *Skrip ini akan menginstal dependensi, membangun aplikasi (build), dan menyalakan PM2.*

## 2. Kenapa Caddy Server, Bukan NGINX?
Untuk melayani fitur **Multi-Tenant Custom Domain**, kita tidak menggunakan NGINX. Kita menggunakan **Caddy Server** karena:
- Caddy secara *native* mendukung **On-Demand TLS**.
- Caddy akan membuatkan sertifikat SSL Let's Encrypt secara otomatis (tanpa campur tangan Admin) saat klien mengarahkan domain mereka ke server kita dan domain tersebut diakses untuk pertama kalinya.
- Mencegah sertifikat kadaluarsa atau kegagalan *renew* manual.

## 3. Instalasi Caddy Server (Ubuntu/Debian)
Matikan atau hapus NGINX terlebih dahulu agar Port 80 dan 443 tidak bentrok:
```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```
Lalu instal Caddy:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

## 4. Konfigurasi Caddyfile (The Magic Config)
Buka file konfigurasi utama Caddy:
```bash
sudo nano /etc/caddy/Caddyfile
```
Isi dengan konfigurasi di bawah ini (ganti `domain-utama.id` dengan domain resmi Luxenary milik Anda):

```caddyfile
# 1. Konfigurasi Khusus untuk Mencegah Kloning Web (Anti-Duplicate Content)
# Jika ada bot/orang mengakses langsung via CNAME Target, redirect ke web utama.
cname.domain-utama.id, host.domain-utama.id, alias.domain-utama.id {
    redir https://domain-utama.id 301
}

# 2. Aturan Rahasia: On-Demand TLS
# Caddy akan bertanya ke API Next.js apakah domain yang datang ini sah dan lunas?
{
    on_demand_tls {
        ask http://localhost:3000/api/public/resolve-custom-domain
        interval 2m
        burst 5
    }
}

# 3. Router Utama: Menangkap Semua Domain Klien
https:// {
    tls {
        on_demand
    }
    reverse_proxy localhost:3000
}
```

## 5. Simpan dan Nyalakan Ulang Caddy
```bash
sudo systemctl restart caddy
```

## Selesai!
Infrastruktur VPS Anda kini telah berjalan sepenuhnya secara *Autopilot*.
- Anda tidak perlu membelikan SSL.
- Anda tidak perlu mendaftarkan domain klien secara manual di panel NGINX/Caddy.
- Semua proses penerbitan sertifikat SSL dijembatani secara gaib oleh Caddy di Port 443 yang selalu mendengarkan instruksi API `/api/public/resolve-custom-domain` dari Next.js Anda.
