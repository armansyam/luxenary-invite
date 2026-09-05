# DOKUMENTASI RESMI: PANDUAN REFERENSI API (API REFERENCE)
**Luxenary Invite Platform — Katalog Lengkap REST Endpoints, SSE Stream, & Webhooks**

Dokumen ini memuat daftar lengkap seluruh Application Programming Interface (API) yang tersedia di platform Luxenary Invite, dikelompokkan berdasarkan domain otorisasi dan fungsionalitas.

---

## 1. Standar Format & Respons Global

### A. Headers Permintaan Standar
- `Content-Type: application/json` (Kecuali endpoint upload file yang menggunakan `multipart/form-data`).
- `Authorization: Bearer <TOKEN>` (Untuk endpoint cron job dan server-to-server).
- Cookie Sesi NextAuth (Otomatis disertakan pada peramban web klien dan admin).

### B. Format Respons Sukses
```json
{
  "success": true,
  "data": { ... },
  "message": "Operasi berhasil diselesaikan."
}
```

### C. Format Respons Error
```json
{
  "error": "Pesan deskripsi kegagalan validasi atau error sistem."
}
```

---

## 2. API Publik (Tanpa Autentikasi Klien)

Endpoint berikut dapat diakses oleh publik (tamu undangan, browser pengunjung, dan Caddy server):

| Metode | Endpoint | Deskripsi & Kegunaan |
|:---:|---|---|
| `GET` | `/api/public/settings` | Mengambil data pengaturan publik platform (nama platform, logo, WhatsApp CS, limit upload). |
| `GET` | `/api/public/themes` | Mengambil katalog tema aktif untuk galeri landing page & filter series. |
| `GET` | `/api/public/music` | Mengambil daftar pustaka musik latar (*audio presets*) resmi. |
| `POST` | `/api/public/rsvp` | Mengirim konfirmasi kehadiran tamu (dukungan rate limiting 15 req/menit per IP). |
| `GET` | `/api/public/resolve-custom-domain` | Verifikasi kepemilikan domain untuk Caddy On-Demand TLS & Next.js middleware rewrite. |
| `POST` | `/api/public/memories/upload` | Mengunggah foto kenangan candid dari tamu hari-H (murni foto: JPEG/PNG/WebP/GIF). |
| `GET` | `/api/public/memories/{invitationId}` | Mengambil feed foto kenangan tamu untuk galeri publik. |
| `GET` | `/api/sse/memories` | *Server-Sent Events* stream untuk slideshow proyektor live real-time di venue. |
| `GET` | `/api/public/version` | Mengambil versi sistem rilis aktif platform. |

---

## 3. API Portal Meja Resepsionis (`/api/receptionist/*`)

Khusus untuk operasional panitia penerima tamu di meja pintu masuk venue:

| Metode | Endpoint | Deskripsi & Kegunaan |
|:---:|---|---|
| `POST` | `/api/receptionist/verify-pin` | Verifikasi 4-digit Staff PIN panitia untuk membuka akses scanner check-in. |
| `GET` | `/api/receptionist/guests` | Mengambil daftar seluruh tamu, status kehadiran fisik, dan status souvenir. |
| `POST` | `/api/receptionist/scan` | Check-in tamu via pemindaian token barcode QR (mencatat jam hadir & kuota pax katering). |

---

## 4. API Sisi Klien / Pengantin (`/api/client/*`)

Memerlukan sesi aktif klien (`role: CLIENT` atau Admin Remote Session):

| Modul | Metode | Endpoint | Deskripsi |
|---|:---:|---|---|
| **Undangan** | `GET` | `/api/client/invitations` | Mengambil seluruh undangan milik user aktif. |
| | `POST` | `/api/client/invitations/create` | Membuat draf undangan baru setelah aktivasi invoice. |
| | `GET` | `/api/client/invitations/{id}` | Mengambil detail konfigurasi lengkap satu undangan. |
| | `PUT` | `/api/client/invitations/{id}` | Memperbarui konten 14 seksi formulir Studio Editor. |
| | `POST` | `/api/client/invitations/{id}/preview` | Preview real-time live perubahan draf undangan. |
| **Media** | `POST` | `/api/client/upload` | Mengunggah aset foto prewedding atau lagu mempelai ke Cloudflare R2. |
| | `DELETE` | `/api/client/media/{id}` | Menghapus aset media dari galeri undangan. |
| **Buku Tamu** | `GET` | `/api/client/guests` | Mengambil daftar tamu undangan pengantin. |
| | `POST` | `/api/client/guests` | Menambahkan satu tamu baru secara manual. |
| | `POST` | `/api/client/guests/bulk` | Mengimpor puluhan/ratusan tamu sekaligus via berkas CSV. |
| | `DELETE` | `/api/client/guests/{id}` | Menghapus tamu dari daftar buku tamu. |
| **RSVP** | `GET` | `/api/client/rsvps` | Mengambil data kehadiran dan ucapan dari tamu untuk dimoderasi. |
| **Domain** | `GET` | `/api/client/subdomain/check` | Memeriksa ketersediaan nama subdomain secara instan. |
| | `POST` | `/api/client/custom-domain/buy` | Membuat pesanan lisensi custom domain pribadi. |
| **Memories** | `GET` | `/api/client/memories/download` | Mengunduh seluruh foto kenangan tamu dalam satu berkas `.zip`. |
| | `POST` | `/api/client/memories/lock` | Mengunci unggahan momen tamu setelah acara selesai. |
| | `POST` | `/api/client/memories/extend` | Membuat invoice perpanjangan masa aktif galeri (+30 hari). |

---

## 5. API Kasir Pembayaran & Webhook Gateway

| Metode | Endpoint | Deskripsi |
|:---:|---|---|
| `POST` | `/api/payments/checkout` | Membuat tagihan baru (Snap Token Midtrans, QRIS iPaymu, Duitku, TriPay, Xendit, atau transfer manual). |
| `POST` | `/api/payments/upgrade` | Menghitung selisih harga dan membuat invoice kenaikan paket langganan. |
| `GET` | `/api/payments/status-stream/{orderId}` | Long-polling / stream status lunas invoice di kasir. |
| `POST` | `/api/client/orders/{id}/upload-proof` | Klien mengunggah gambar slip bukti transfer bank manual. |
| `POST` | `/api/webhook/midtrans` | Webhook HTTP callback notifikasi pembayaran resmi Midtrans. |
| `POST` | `/api/webhook/duitku` | Webhook callback IPN resmi Duitku. |
| `POST` | `/api/webhook/ipaymu` | Webhook callback IPN resmi iPaymu. |
| `POST` | `/api/webhook/tripay` | Webhook callback IPN resmi TriPay. |
| `POST` | `/api/webhook/xendit` | Webhook callback IPN resmi Xendit. |

---

## 6. API Sisi Administrator (`/api/admin/*`)

Memerlukan autentikasi admin (`role: ADMIN` atau `SUPER_ADMIN`):

| Kategori | Metode | Endpoint | Fungsi |
|---|:---:|---|---|
| **Overview** | `GET` | `/api/admin/overview` | Statistik total klien, undangan aktif, GMV omset, dan grafik 30 hari. |
| **Klien** | `GET` | `/api/admin/users` | Daftar seluruh akun pengguna terdaftar. |
| | `POST` | `/api/admin/remote-session` | Membuka sesi kendali jarak jauh (*Remote Session*) ke dashboard klien. |
| **Orders** | `POST` | `/api/admin/orders/{id}/approve` | Persetujuan 1-klik pembayaran transfer bank manual. |
| | `POST` | `/api/admin/orders/{id}/reject` | Menolak transfer bank manual dengan alasan verifikasi. |
| **Tema** | `GET` | `/api/admin/themes` | Daftar seluruh master tema di sistem. |
| | `POST` | `/api/admin/themes/sync` | Sinkronisasi master tema fisik di disk ke database. |
| | `POST` | `/api/admin/themes/{id}/demo-asset` | Mengunggah banner atau video demo tema resmi. |
| **Database** | `POST` | `/api/admin/database/backup` | Memicu pembuatan snapshot basis data manual. |
| | `GET` | `/api/admin/database/download` | Mengunduh file `.sql` snapshot database ke komputer lokal. |
| | `POST` | `/api/admin/database/restore` | Mengembalikan (*restore*) database dari berkas snapshot. |
| **Storage** | `POST` | `/api/admin/r2-cors` | Menerapkan konfigurasi CORS JSON otomatis ke bucket Cloudflare R2. |
| **Settings** | `GET` / `PUT` | `/api/admin/settings` | Membaca dan memperbarui pengaturan konfigurasi platform. |

---

## 7. API Pemeliharaan Berkala (`/api/cron/*`)

Endpoint otomatis yang dipanggil oleh Crontab Linux dengan proteksi `CRON_SECRET`:
- `POST /api/cron/cleanup`: Pembersihan data kadaluarsa, foto tamu expired, dan daur ulang subdomain.
- `GET /api/cron/backup`: Pencadangan database PostgreSQL harian otomatis.
