# Panduan Arsitektur & Operasional: Tab Pemasaran & Mitra Reseller (Admin Control Panel)

Dokumen ini adalah referensi resmi untuk operasional dan arsitektur teknis dari **Tab Pemasaran & Mitra Reseller** pada Control Panel Administrator (`/admin?tab=marketing`) serta **Portal Mitra Mandiri** (`/partner`).

---

## 1. Filosofi & Kebijakan Bisnis (Zero-Debt / No Payout)

Sistem Pemasaran & Mitra Reseller berdiri di atas **2 pilar yang terpisah tegas** agar pembukuan kas selalu bersih tanpa utang komisi:

1. **Kupon Promo Publik Mandiri (`PromoCoupon`):**
   - Berdiri **100% sendiri** khusus untuk kampanye pemasaran publik Luxvite (Instagram, TikTok, Flash Sale, dll.).
   - Tidak terikat ke mitra dan **diblokir otomatis (anti-stacking)** pada akun klien yang didaftarkan oleh Mitra WO agar tidak terjadi diskon ganda.
2. **Mitra Reseller / WO — Potongan Harga Langsung (`PartnerAffiliate`):**
   - Mitra WO mendaftarkan akun klien pengantin langsung melalui **Portal Mitra (`/partner`)**.
   - Akun klien yang didaftarkan (`User.provisionedByPartnerId`) otomatis memperoleh **Potongan Harga Khusus Mitra (%) atau Nominal** langsung di halaman kasir (`/checkout`) untuk pembelian paket baru (`NEW`).
   - **Zero Utang & Zero Payout:** Karena potongan harga langsung dinikmati di awal saat checkout, sistem **tidak lagi mencatat utang komisi (`AffiliateCommission`) baru** dan **tidak lagi memerlukan transfer payout / data rekening bank mitra**.

---

## 2. Manajemen Kupon Promo Publik (`PromoCoupon`)

Admin memiliki kendali penuh untuk membuat dan memonitor kupon promo publik:

```
[ Admin: Buat Kupon Promo Publik ]
          │
          ├─ Kode Kupon (e.g. 'PROMO50', 'FLASH20')
          ├─ Tipe Diskon: PERSENTASE (%) vs NOMINAL (Rp)
          ├─ Batasan: Min. Pembelian, Maks. Potongan, Batas Kuota & Limit/User
          ├─ Target Paket: Serenade / Symphony / Eternity
          └─ Anti-Stacking Otomatis: Ditolak pada akun klien Mitra WO
```

### Parameter Konfigurasi Kupon:
| Bidang Input | Tipe | Keterangan |
|---|---|---|
| **Kode Kupon** | Teks | Kode unik huruf besar/angka tanpa spasi (contoh: `LUXVITE20`, `HEMAT25K`). |
| **Tipe Diskon** | Pilihan | `PERCENT` (diskon persentase, maks. 99%) atau `NOMINAL` (potongan rupiah tetap). |
| **Nilai Diskon** | Angka | Angka persen atau nominal Rupiah. |
| **Maks. Diskon** | Angka | Plafon diskon maksimal untuk tipe persentase guna melindungi margin platform. |
| **Min. Transaksi** | Angka | Syarat nominal pesanan minimum sebelum kupon dapat diaplikasikan. |
| **Batas Kuota** | Angka | Total jatah pemakaian kupon secara global di platform. |
| **Paket Target** | Multi-Pilihan | Membatasi kupon hanya berlaku untuk paket tertentu (`TIER_1`, `TIER_2`, `TIER_3`). |
| **Masa Berlaku** | Tanggal | Tanggal awal dan akhir berlakunya kupon diskon. |

### Mekanisme Proteksi Kasir (`PromoHold`):
Untuk mencegah klaim ganda (*double-claim*) atau *race condition* saat banyak pembeli checkout bersamaan:
- Saat kode promo divalidasi di kasir (`POST /api/public/promo/validate`), sistem melakukan *row lock* (`SELECT ... FOR UPDATE`) dan membuat reservasi `PromoHold` yang mengikuti batas waktu order (`order.expiredAt`, bawaan 24 jam).
- Jika akun pembeli didaftarkan oleh Mitra WO aktif (`provisionedByPartnerId`), validasi kupon publik langsung ditolak (`400 PARTNER_DISCOUNT_NO_STACK`).
- Jika pesanan dibayar sebelum hold kedaluwarsa → status hold menjadi `CONSUMED` dan `usageCount` bertambah `+1`.
- Jika pesanan batal atau kedaluwarsa → status hold menjadi `RELEASED` dan kuota dikembalikan otomatis.

---

## 3. Ekosistem Mitra Reseller / WO (`PartnerAffiliate`)

Admin mengelola mitra dari tab **Mitra Reseller / WO** (`/admin?tab=marketing`):

1. **Pendaftaran Mitra (Tanpa Data Rekening Payout):**
   - Menyimpan nama WO/mitra, nomor WhatsApp, **email login Portal Mitra** (wajib unik *case-insensitive*), dan catatan internal.
   - Tidak memerlukan pengisian rekening bank karena tidak ada pencairan komisi.
2. **Skema Potongan Harga Langsung:**
   - **Persentase (`PERCENT`, maks. 95%):** Memotong langsung harga dasar paket baru (contoh: 20% dari Rp 149.000 = hemat Rp 29.800).
   - **Nominal Tetap (`NOMINAL`):** Memotong langsung nominal tetap rupiah (menjamin tagihan akhir minimal Rp 1.000 agar valid di payment gateway).
3. **Alur Aktivasi Akun Klien oleh Mitra (`/partner` → `/auth/set-password`):**
   - Mitra login di `/partner` (Email + Kata Sandi + OTP 6-digit SMTP saat aktivasi pertama / reset sandi).
   - Mitra mendaftarkan klien (`Nama`, `Email`, `No. WA opsional`) melalui `POST /api/partner/clients`.
   - Sistem membuat `User` (`passwordHash: null`, `provisionedByPartnerId: partner.id`), menerbitkan **token aktivasi sekali pakai berlaku 48 jam** (`ClientActivationToken`, hash HMAC-SHA256), dan mengirim **email co-branded `{Nama WO} × Luxvite`** via SMTP (`lib/mailer.ts`) lengkap dengan tombol salin & buka WhatsApp cadangan.
   - Klien mengklik tautan `/auth/set-password?token=...`, membuat kata sandi (8–72 karakter, hash `bcrypt` cost 12, konsumsi atomik `pg_advisory_xact_lock`), lalu otomatis login menuju `/onboarding`.
   - Mitra dapat memantau seluruh **Data Klien Ditangani**, mengirim ulang tautan aktivasi 48 jam (`POST /api/partner/clients/[id]/resend-activation`), memantau **Laporan Transaksi Klien** (Harga Normal → Potongan Mitra → Total Dibayar), serta **Mengunduh CSV Laporan Transaksi**.

---

## 4. Arsip Historis Komisi & Pencairan Lama

- Tabel `affiliate_commissions` dan kolom historis (`pendingBalance`, `totalPaidOut`, `bankName`, `accountNumber`, `accountName`) dipertahankan di skema PostgreSQL (*expand-only*) semata-mata demi integritas data keuangan masa lalu.
- `processOrderPaidMarketing()` di `lib/marketing.ts` **tidak pernah membuat baris komisi baru atau menambah `pendingBalance`**.
- Tab **Arsip Komisi Lama / Arsip Pencairan Lama** di panel Admin dan blok arsip di `/partner` otomatis disembunyikan apabila tidak ada catatan historis.
