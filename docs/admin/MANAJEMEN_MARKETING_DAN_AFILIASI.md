# Panduan Arsitektur & Operasional: Tab Marketing & Afiliasi (Admin Control Panel)

Dokumen ini adalah referensi resmi untuk operasional dan arsitektur teknis dari **Tab Marketing & Afiliasi** pada Control Panel Administrator (`/admin?tab=marketing`).

---

## 1. Filosofi & Gambaran Umum Modul

Sistem Pemasaran & Afiliasi dirancang sebagai instrumen pertumbuhan bisnis (*growth engine*) terintegrasi yang menghubungkan tiga pilar:
1. **Kupon Promo & Diskon Mandiri:** Memberikan insentif potongan harga kepada calon pengantin di halaman kasir (`/checkout`).
2. **Mitra Afiliasi (Referral Partners):** Mengakomodasi kerja sama B2B dengan Wedding Organizer (WO), venue pernikahan, MUA, dan fotografer rekanan melalui skema bagi hasil komisi.
3. **Integrasi Kas Keuangan Otomatis:** Setiap pencairan komisi mitra seketika tercatat sebagai beban operasional (*OPEX Marketing*) di modul Keuangan (`/admin?tab=finance`), menjamin pembukuan kas selalu seimbang dan akurat.

---

## 2. Manajemen Kupon Promo (`PromoCoupon`)

Admin memiliki kendali penuh untuk membuat dan memonitor kupon promosi:

```
[ Admin: Buat Kupon Baru ]
          │
          ├─ Kode Kupon (e.g. 'WOPROMO50')
          ├─ Tipe Diskon: PERSENTASE (%) vs NOMINAL (Rp)
          ├─ Batasan: Min. Pembelian, Maks. Potongan, Batas Kuota & Limit/User
          ├─ Target Paket: Traditional / Modern / Premium
          └─ Tautkan ke Mitra Afiliasi (Opsional)
```

### Parameter Konfigurasi Kupon:
| Bidang Input | Tipe | Keterangan |
|---|---|---|
| **Kode Kupon** | Teks | Kode unik huruf besar/angka tanpa spasi (contoh: `BERKAH50`, `WO-SEJAHTERA`). |
| **Tipe Diskon** | Pilihan | `PERCENT` (diskon persentase) atau `NOMINAL` (potongan harga tetap rupiah). |
| **Nilai Diskon** | Angka | Angka persen (1–100) atau nominal Rupiah (contoh: Rp 50.000). |
| **Maks. Diskon** | Angka | Plafon diskon maksimal untuk tipe persentase agar melindungi batas keuntungan platform. |
| **Min. Transaksi** | Angka | Syarat nominal pesanan minimum sebelum kupon dapat diaplikasikan. |
| **Batas Kuota** | Angka | Total jatah pemakaian kupon secara global di platform. |
| **Paket Target** | Multi-Pilihan | Membatasi kupon hanya berlaku untuk paket tertentu (`TIER_1`, `TIER_2`, `TIER_3`). |
| **Masa Berlaku** | Tanggal | Tanggal awal dan akhir berlakunya kupon diskon. |

### Mekanisme Proteksi Kasir 15 Menit (`PromoHold`):
Untuk mencegah klaim ganda (*double-claim*) atau *race condition* saat banyak pembeli checkout bersamaan:
- Saat pembeli mengklik *"Konfirmasi Pesanan"* di kasir, sistem membuat reservasi `PromoHold` selama **15 menit**.
- Kuota kupon dipotong sementara selama masa reservasi ini.
- Jika pesanan dibayar dalam 15 menit $\rightarrow$ status hold menjadi `CONSUMED` dan pemakaian kupon tercatat sah.
- Jika pesanan batal atau kedaluwarsa $\rightarrow$ status hold menjadi `RELEASED` dan kuota kupon dikembalikan otomatis ke platform.

---

## 3. Ekosistem Kemitraan & Afiliasi (`PartnerAffiliate`)

Admin dapat mendaftarkan mitra bisnis dan menetapkan hak bagi hasil secara adil:

1. **Pendaftaran Mitra:**
   - Menyimpan nama agensi/mitra, nomor WhatsApp/telepon, email resmi, dan informasi rekening bank pencairan komisi.
2. **Skema Perhitungan Komisi:**
   - **Persentase (`PERCENT`):** Mendapatkan persentase tertentu dari nominal pesanan bersih klien (contoh: 15% dari transaksi paket Premium).
   - **Nominal Tetap (`FLAT`):** Mendapatkan nominal komisi flat per transaksi (contoh: Rp 50.000 per pesanan lunas).
3. **Pencatatan Komisi Otomatis (`AffiliateCommission`):**
   - Setiap kali invoice pesanan klien berubah status menjadi `PAID` (baik via Webhook Midtrans/Xendit maupun approval manual Admin), sistem otomatis menghitung komisi mitra.
   - Record komisi dibuat dengan status `PENDING`, dan nilai `pendingBalance` mitra bertambah secara real-time.

---

## 4. Alur Pencairan Komisi Mitra (Payout) & Integrasi Kas

Admin dapat mengeksekusi transfer bagi hasil mitra secara transparan dari panel Admin:

```
[ Mitra Mengajukan / Jadwal Payout ]
                 │
                 ▼
[ Admin: Klik "Cairkan Komisi" di Tab Marketing ]
                 │
                 ▼
[ Transaksi Database Atomik (Prisma Transaction) ]
  ├─ 1. Tandai seluruh komisi PENDING mitra menjadi PAID
  ├─ 2. Kurangi pendingBalance ke 0, tambah totalPaidOut
  ├─ 3. Buat entri pengeluaran kas di tabel expenses:
  │      - Kategori: MARKETING
  │      - Judul: "Payout Komisi Mitra: {Nama Mitra}"
  │      - Nominal: {Total Saldo Dicairkan}
  │      - Catatan: Nomor Rekening & Bank Tujuan
  │
  ▼
[ Beban Otomatis Muncul di Tab Finance & Laporan Laba Rugi ]
```

### Keamanan & Integritas:
- Seluruh proses pencairan dibungkus dalam **Prisma Database Transaction**. Jika terjadi kegagalan jaringan atau server crash, seluruh status komisi dan buku kas di-rollback secara aman tanpa selisih angka.
- Admin dapat mengunggah bukti transfer bank langsung ke transaksi pengeluaran terkait di Tab Keuangan.
