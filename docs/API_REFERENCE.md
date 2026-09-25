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
| `GET` | `/api/public/themes` | Mengambil katalog tema aktif untuk galeri landing page & `/demo`. Mendukung query parameter `?eventType=WEDDING\|BIRTHDAY\|KHITAN\|AQIQAH\|WISUDA\|GATHERING` (cached via Cloudflare `s-maxage=86400`, `max-age=60`). |
| `GET` | `/api/public/music` | Mengambil daftar pustaka musik latar (*audio presets*) resmi. |
| `POST` | `/api/public/rsvp` | Mengirim konfirmasi kehadiran tamu (dukungan rate limiting 15 req/menit per IP). |
| `GET` | `/api/public/resolve-custom-domain` | Verifikasi kepemilikan domain untuk Caddy On-Demand TLS & Next.js middleware rewrite. |
| `POST` | `/api/public/memories/upload` | Mengunggah foto kenangan candid dari tamu hari-H (murni foto: JPEG/PNG/WebP/GIF). |
| `GET` | `/api/public/memories/{invitationId}` | Mengambil feed foto kenangan tamu untuk galeri publik. |
| `GET` | `/api/sse/memories` | *Server-Sent Events* stream untuk notifikasi real-time momen baru di galeri kenangan tamu. |
| `GET` | `/api/public/version` | Mengambil versi sistem rilis aktif platform. |
| `POST` | `/api/public/promo/validate` | Validasi kode promo secara real-time di kasir, pengecekan kuota, masa berlaku, dan kalkulasi diskon. |

---

## 3. API Portal Meja Resepsionis (`/api/receptionist/*`)

Khusus untuk operasional panitia penerima tamu di meja pintu masuk venue:

| Metode | Endpoint | Deskripsi & Kegunaan |
|:---:|---|---|
| `POST` | `/api/receptionist/verify-pin` | Verifikasi 4-digit Staff PIN panitia untuk membuka akses scanner check-in. |
| `GET` | `/api/receptionist/guests` | Mengambil daftar seluruh tamu, status kehadiran fisik, dan status souvenir. |
| `POST` | `/api/receptionist/scan` | Check-in tamu via pemindaian token barcode QR (mencatat jam hadir & kuota pax katering). |

---

## 4. API Sisi Klien / Pengguna (`/api/client/*`)

Memerlukan sesi aktif klien (`role: CLIENT` atau Admin Remote Session):

| Modul | Metode | Endpoint | Deskripsi |
|---|:---:|---|---|
| **Onboarding** | `GET` | `/api/client/onboarding-state` | Decision tree penentu navigasi klien pasca-login (ke `/dashboard`, `/setup`, `/checkout`, atau `/packages`). |
| **Undangan** | `GET` | `/api/client/invitations` | Mengambil seluruh undangan milik user aktif. |
| | `POST` | `/api/client/invitations/create` | Membuat draf undangan baru setelah aktivasi invoice. Mendukung parameter `eventType` (`WEDDING`, `BIRTHDAY`, `KHITAN`, `AQIQAH`, `WISUDA`, `GATHERING`), `themeId`, `title`, `slug`, `participantsJson`, `eventDetailsJson`. Memvalidasi kecocokan `theme.eventType` dengan fallback otomatis ke `DEFAULT_THEME_BY_EVENT`. |
| | `GET` | `/api/client/invitations/{id}` | Mengambil detail konfigurasi lengkap satu undangan beserta relasi media, audio, dan event. |
| | `PUT` | `/api/client/invitations/{id}` | Memperbarui konten 16 seksi formulir Studio Editor secara menyeluruh. |
| | `PATCH` | `/api/client/invitations/{id}` | Memperbarui atribut parsial undangan, termasuk perubahan `themeId` dengan pengawalan ketat *cross-event guard* (`theme.eventType === invitation.eventType`). |
| | `POST` | `/api/client/invitations/{id}/preview` | Preview real-time live perubahan draf undangan ke canvas iframe. |
| | `GET` | `/api/client/invitations/{id}/export` | Mengunduh berkas rekap data undangan dan respons kehadiran tamu. |
| **Media** | `POST` | `/api/client/upload` | Mengunggah aset foto, video, lagu, atau QRIS (`slot: QRIS` WebP 800×800) ke Storage lokal / Cloudflare R2. |
| | `DELETE` | `/api/client/media/{id}` | Menghapus aset media dari galeri undangan. |
| **Buku Tamu** | `GET` | `/api/client/guests` | Mengambil daftar tamu undangan penyelenggara. |
| | `POST` | `/api/client/guests` | Menambahkan satu tamu baru secara manual. |
| | `POST` | `/api/client/guests/bulk` | Mengimpor puluhan/ratusan tamu sekaligus via berkas CSV (dengan parser koma/titik-koma cerdas). |
| | `DELETE` | `/api/client/guests/{id}` | Menghapus tamu dari daftar buku tamu. |
| **RSVP** | `GET` | `/api/client/rsvps` | Mengambil data kehadiran dan ucapan dari tamu untuk dimoderasi. |
| **Domain** | `GET` | `/api/client/subdomain/check` | Memeriksa ketersediaan nama subdomain secara instan. |
| | `POST` | `/api/client/custom-domain` | Menyimpan, memperbarui, atau melepaskan tautan custom domain pribadi. |
| **Moments** | `GET` | `/api/client/invitations/{id}/memories` | Mengambil feed kenangan tamu, status order perpanjangan pending, dan kalkulasi kuota foto (`baseTotalPhotos`, `extraMemoriesQuota`, `usedPhotos`, `remainingPhotos`). |
| | `PATCH` | `/api/client/invitations/{id}/memories` | Mengonfigurasi kamera tamu (`memoriesOpeningLayout`, `memoriesCardInstruction`, `memoriesFilter`, `memoriesDateStamp`, jatah roll, dan jadwal `memoriesSessions` dengan pembatas kuota server-side). |
| | `GET` | `/api/client/memories/download` | Mengunduh seluruh foto kenangan tamu dalam satu berkas `.zip`. |
| | `GET` | `/api/client/memories/download-urls` | Mengambil daftar URL unduh langsung untuk batch downloader resolusi tinggi. |
| | `POST` | `/api/client/memories/lock` | Mengunci unggahan momen tamu setelah acara selesai. |
| | `POST` | `/api/client/memories/extend` | Membuat invoice perpanjangan masa aktif galeri (+30 hari). |
| **Pesanan** | `GET` | `/api/client/orders` | Mengambil riwayat transaksi pesanan paket atau add-on. |
| | `GET` | `/api/client/orders/{id}/status` | Mengecek status pelunasan transaksi pesanan secara spesifik. |
| | `POST` | `/api/client/orders/{id}/cancel` | Membatalkan tagihan pesanan berstatus pending. |
| | `POST` | `/api/client/orders/{id}/upload-proof` | Klien mengunggah gambar slip bukti transfer bank manual. |
| | `POST` | `/api/client/orders/checkout-bundle` | Checkout pesanan bundle add-on atau kuota tambahan. |

---

## 5. API Kasir Pembayaran & Webhook Gateway

| Metode | Endpoint | Deskripsi |
|:---:|---|---|
| `POST` | `/api/payments/checkout` | Membuat tagihan baru (Snap Token Midtrans, QRIS iPaymu, Duitku, TriPay, Xendit, atau transfer manual). |
| `POST` | `/api/payments/checkout/confirm` | Mengonfirmasi pesanan dan mengunci diskon kupon promo (reservasi PromoHold 15 menit). |
| `POST` | `/api/payments/qris/regenerate` | Me-regenerasi sesi invoice QRIS baru jika 15 menit kedaluwarsa tanpa mereset pesanan atau diskon. |
| `POST` | `/api/payments/upgrade` | Menghitung selisih harga dan membuat invoice kenaikan paket langganan. |
| `GET` | `/api/payments/status-stream/{orderId}` | Long-polling / SSE stream status lunas invoice di kasir ditenagai PostgreSQL LISTEN/NOTIFY. |
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
| **Klien** | `GET` | `/api/admin/users` | Daftar seluruh akun pengguna terdaftar beserta filter status dan role. |
| | `POST` | `/api/admin/remote-session` | Membuka sesi kendali jarak jauh (*Remote Session*) ke dashboard klien. |
| **Admin Team** | `GET` / `POST` | `/api/admin/admins` | Mengambil dan mendaftarkan akun administrator baru. |
| | `PUT` / `DELETE` | `/api/admin/admins/{id}` | Mengubah hak akses atau menonaktifkan akun admin. |
| **Audit Logs** | `GET` | `/api/admin/audit-logs` | Mengambil log jejak audit aktivitas sensitif admin dan sistem. |
| **Undangan** | `GET` | `/api/admin/invitations` | Mengambil katalog seluruh undangan digital platform. |
| | `POST` | `/api/admin/invitations/{id}/lifecycle` | Mengubah status siklus hidup undangan (`DRAFT`, `PUBLISHED`, `ARCHIVED`, `EXPIRED`). |
| | `POST` | `/api/admin/invitations/{id}/unlock` | Membuka kunci edit undangan klien yang terkunci pasca-publikasi. |
| | `DELETE` | `/api/admin/invitations/{id}/purge` | Pembersihan total permanen: baris DB + HTML statis + folder aset `public/uploads/invitations/{id}/`. |
| **Subdomain** | `GET` | `/api/admin/subdomains` | Daftar seluruh subdomain aktif dan yang terdaftar. |
| | `POST` | `/api/admin/subdomains/recycle` | Memicu daur ulang paksa subdomain yang telah kedaluwarsa atau dilepas. |
| **Custom Domain**| `POST` | `/api/admin/custom-domains/check-dns` | Verifikasi propagasi DNS A/CNAME record custom domain klien. |
| | `POST` | `/api/admin/custom-domains/activate` | Mengaktifkan penerbitan On-Demand TLS Caddy untuk custom domain yang lolos verifikasi. |
| **Orders** | `GET` | `/api/admin/orders` | Riwayat pesanan dan status invoice lintas klien. |
| | `POST` | `/api/admin/orders/{id}/approve` | Persetujuan 1-klik pembayaran transfer bank manual. |
| | `POST` | `/api/admin/orders/{id}/reject` | Menolak transfer bank manual dengan alasan verifikasi. |
| **Marketing** | `GET` | `/api/admin/marketing` | Mengambil data performa kupon diskon, daftar mitra afiliasi, dan log komisi. |
| | `POST` | `/api/admin/marketing` | Membuat kupon baru, mendaftarkan mitra referral, dan mencairkan (*payout*) komisi ke buku kas. |
| **Finance** | `GET` | `/api/admin/finance/overview` | Ringkasan laba/rugi, pendapatan kotor, beban operasional, dan grafik arus kas SVG. |
| | `POST` | `/api/admin/finance/expenses` | Mencatat beban pengeluaran operasional baru (server, gaji, marketing, dll). |
| | `DELETE` | `/api/admin/finance/expenses/{id}` | Menghapus entri beban pengeluaran operasional. |
| | `POST` | `/api/admin/finance/closing` | Mengunci pembukuan bulanan (*financial closing snapshot*) yang tidak dapat diubah lagi. |
| | `GET` / `POST` | `/api/admin/finance/recurring` | Kelola daftar tagihan rutin berulang (server, domain, lisensi). |
| | `POST` | `/api/admin/finance/recurring/{id}/pay` | Melakukan pelunasan tagihan server/software berkala dalam 1-klik. |
| | `GET` | `/api/admin/finance/tax` | Menghitung dan merekapitulasi setoran PPh Final 0,5% UMKM (PP 55/2022). |
| | `POST` | `/api/admin/finance/upload-receipt` | Mengunggah bukti kuitansi fisik pengeluaran operasional. |
| **Tema** | `GET` | `/api/admin/themes` | Daftar seluruh master tema di sistem lintas jenis acara (*Wedding, Birthday, Khitan, Aqiqah, Wisuda, Gathering*). |
| | `POST` | `/api/admin/themes` | Unggah tema fisik mandiri baru (`themes/{eventType}/{style}/{id}.html`). |
| | `POST` | `/api/admin/themes/sync` | Sinkronisasi master tema fisik di disk ke database, auto-compile static demo, dan auto-purge Cloudflare edge cache. |
| | `POST` | `/api/admin/themes/{id}/demo-asset` | Mengunggah thumbnail cover atau video demo tema resmi. |
| | `POST` | `/api/admin/themes/{id}/demo-data` | Menyimpan custom mock dataset untuk rendering preview demo statis tema tertentu. |
| **Pustaka Musik**| `GET` / `POST` | `/api/admin/music` | Mengambil katalog musik latar dan mengunggah berkas audio MP3/OGG resmi. |
| | `PUT` / `DELETE` | `/api/admin/music/{id}` | Memperbarui metadata lagu atau menghapus berkas musik dari disk dan database. |
| **Portfolio** | `GET` / `POST` | `/api/admin/portfolio` | Mengelola katalog showcase etalase publik (kloning mandiri aset & HTML undangan terpilih). |
| **Diagnostik** | `GET` | `/api/admin/monitoring/health` | Health check real-time: status koneksi PostgreSQL, latensi disk, konsumsi memori, dan uptime Node.js. |
| | `GET` | `/api/admin/server-ip` | Mendeteksi alamat IP publik server VPS untuk panduan DNS klien. |
| | `POST` | `/api/admin/test-smtp` | Menguji pengiriman email transaksional via gateway SMTP. |
| | `POST` | `/api/admin/test-storage` | Menguji kapabilitas read/write file ke Cloudflare R2 / local storage. |
| | `GET` | `/api/admin/webhooks` | Melihat log incoming webhook transaksi dari gateway pembayaran. |
| **Cache** | `POST` | `/api/admin/cache/purge` | Membersihkan server cache Next.js ISR dan edge CDN Cloudflare secara serentak. |
| **Database** | `POST` | `/api/admin/database/backup` | Memicu pembuatan snapshot basis data manual. |
| | `GET` | `/api/admin/database/download` | Mengunduh file `.sql` snapshot database ke komputer lokal. |
| | `POST` | `/api/admin/database/restore` | Mengembalikan (*restore*) database dari berkas snapshot. |
| **Storage** | `POST` | `/api/admin/r2-cors` | Menerapkan konfigurasi CORS JSON otomatis ke bucket Cloudflare R2. |
| **Settings** | `GET` / `PUT` | `/api/admin/settings` | Membaca dan memperbarui pengaturan konfigurasi platform (paket, gateway, limits). |
| | `POST` | `/api/admin/upload-brand` | Mengunggah logo platform, favicon, atau aset branding resmi. |
| | `GET` / `PUT` | `/api/admin/profile` | Memperbarui profil akun administrator yang sedang login. |

---

## 7. API Pemeliharaan Berkala (`/api/cron/*`)

Endpoint otomatis yang dipanggil oleh Crontab Linux dengan proteksi `CRON_SECRET`:
- `POST /api/cron/cleanup`: Pembersihan data kadaluarsa, foto tamu expired, dan daur ulang subdomain.
- `GET /api/cron/backup`: Pencadangan database PostgreSQL harian otomatis.


