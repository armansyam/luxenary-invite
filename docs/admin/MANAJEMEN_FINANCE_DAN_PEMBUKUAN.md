# PANDUAN EKSEKUTIF MANAJEMEN FINANCE & PEMBUKUAN KAS
## Modul Finance Terpusat — Dashboard Administrator
> **Versi:** 1.0.0 | **Tanggal Rilis:** September 2026  
> **Status:** Production Ready | **Kesesuaian Regulasi:** PP 55 Tahun 2022 (PPh Final UMKM 0,5%)

---

## 1. Filosofi & Prinsip Desain Antarmuka

Modul **Finance & Keuangan Terpusat** dirancang khusus untuk administrator eksekutif dan finance officer dengan menerapkan standar industri pembukuan profesional dan prinsip desain modern:

1. **Continuous Editorial Canvas (Bebas Klise Card AI):**
   - Menghilangkan tumpukan kartu kotak (*card boxes*) berlapis-lapis yang membuat mata lelah dan menyulitkan fokus pembacaan data keuangan.
   - Menggunakan kanvas mengalir dengan batas garis rambut (*hairline separator*) tipis (`border-stone-200/80`), tipografi berkarakter editorial, dan ritme vertikal yang seimbang.
2. **Low Eye Strain Palette (Bebas Warna Neon Menyilaukan):**
   - Menggunakan warna-warna tenang berkarakter batu alam (*warm stone #FAFAF9*, *charcoal #1C1917*, *soft slate #78716C*).
   - Aksen keuangan menggunakan *Sage Green (#15803D)* untuk surplus/omzet, *Terracotta/Rose (#B91C1C)* untuk beban/defisit, dan *Sky Blue (#0284C7)* untuk deviasi laba bersih di atas titik impas.
3. **Zero OS Emojis:**
   - Tidak menggunakan emoji bawaan sistem operasi yang kekanak-kanakan (seperti 💰, 💳, 🔒, 📈).
   - Seluruh status diwakili oleh vektor SVG murni, tipografi angka monospaced, dan indikator titik halus (*1.5px dot indicators*).

---

## 2. Arsitektur Aliran Data Keuangan (Anti-Redundansi)

```
[Transaksi Klien (Order)]
       │
       ▼ (Status: PAID)
┌─────────────────────────────────────────────────────────────┐
│  ARUS KAS MASUK (GROSS REVENUE)                             │
│  - Otomatis 100% dari tabel `orders`                        │
│  - Midtrans Snap, Xendit Invoice, & Transfer Bank Disetujui │
│  - Dilarang input manual omzet order untuk cegah selisih    │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  ENGINE FINANCE TERPUSAT (/api/admin/finance/overview)     │
│  - Time Series Generator (Harian, Bulanan, Tahunan)         │
│  - Agregasi Margin Operasional (%) & MoM Growth (%)         │
│  - Laba Bersih = Omzet Bruto - Realisasi Beban OPEX         │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │
┌─────────────────────────────────────────────────────────────┐
│  ARUS KAS KELUAR (BEBAN OPERASIONAL / OPEX)                 │
│  - Buku Kas Mutasi Pengeluaran (`expenses`)                 │
│  - Tagihan Rutin Bulanan 1-Klik (`recurring_expenses`)      │
│  - Tagging Sumber Bayar (BCA, Mandiri, QRIS, Kas Tunai)     │
│  - Unggah Faktur / Bukti Struk Transaksi (/uploads/finance) │
└─────────────────────────────────────────────────────────────┘
```

### Mengapa Pemasukan Tidak Boleh Diinput Manual?
Dalam arsitektur SaaS *white-label*, data pendapatan penjualan terverifikasi secara absolut dari tabel `Order` yang telah berstatus `PAID` (baik terkonfirmasi otomatis via webhook Midtrans/Xendit maupun melalui persetujuan mutasi transfer bank manual oleh admin). Mencatat ulang pemasukan order secara terpisah di tab finance akan menciptakan redundansi data, rawan *human-error*, dan berpotensi menimbulkan *ghost revenue*.

---

## 3. Visualisasi Grafik Interaktif Multi-Model (Native 60 FPS SVG)

Administrator dapat secara fleksibel berganti-ganti model visualisasi dan rentang waktu sesuai kebutuhan analisis:

### 3 Model Grafik SVG Kustom:
1. **Batang Komparasi (Dual Bar):**  
   Menampilkan batang omzet penjualan (hijau sage) bersanding langsung dengan beban operasional (abu-abu netral) pada setiap titik periode untuk komparasi rasio pengeluaran terhadap pendapatan.
2. **Kurva Kontinu (Smooth Area):**  
   Menyajikan tren aliran dana dengan gradasi transparan halus, garis kurva Bezier vektor, dan titik interaksi (*hover nodes*) yang menampilkan tooltip rincian laba bersih.
3. **Net Flow Baseline (Rp 0):**  
   Grafik deviasi khusus pembukuan yang berpusat pada garis ekuilibrium Rp 0 (titik impas / *break-even line*). Batang biru menjulang ke atas menandakan surplus laba bersih, sedangkan batang merah ke bawah menandakan defisit periode.

### 3 Rentang Waktu Analitis:
- **30 Hari:** Tinjauan arus kas harian untuk operasional bulan berjalan.
- **12 Bulan:** Evaluasi performa bisnis tahun fiskal berjalan (Januari - Desember).
- **Tahunan:** Perbandingan multi-tahun untuk melihat tren pertumbuhan bisnis jangka panjang.

---

## 4. Manajemen Dinamis Tagihan Rutin Bulanan (OPEX) & 1-Klik Bayar

Beban operasional server dan kantor yang berulang setiap bulan (seperti Hostinger VPS, IndiHome Fiber, Listrik PLN, Canva Pro, Figma) dikelola secara dinamis 100% tanpa hardcoding dalam katalog `recurring_expenses`:

- **Transparansi Estimasi Beban Bulanan:** Di bagian atas sub-tab Tagihan Rutin, sistem menyajikan pita metrik ringkas: Total Estimasi Beban Bulanan dari seluruh tagihan aktif, Total Nominal Sudah Dibayar Bulan Ini, dan Sisa Tagihan Menunggu Pelunasan.
- **Tambah Tagihan Rutin Baru:** Tombol `+ Tambah Tagihan Rutin` membuka modal formulir untuk mendaftarkan nama beban, vendor/penyedia, kategori OPEX, nominal estimasi biaya bulanan (Rp), tanggal jatuh tempo (1-31), serta rekening/sumber pembayaran (`POST /api/admin/finance/recurring`).
- **Atur Nilai Biaya Bulanan & Edit (Live Update):** Tombol edit pada setiap baris tagihan memungkinkan penyesuaian nominal biaya bulanan, nama vendor, tanggal jatuh tempo, maupun pengalihan status aktif/nonaktif (`PUT /api/admin/finance/recurring`).
- **Hapus Komitmen Tagihan:** Tombol hapus dengan dialog konfirmasi aman untuk menghentikan komitmen tagihan yang tidak lagi digunakan (`DELETE /api/admin/finance/recurring?id=...`). Mutasi kas historis yang sudah pernah dibukukan tetap terlindungi di buku kas.
- **Deteksi Lunas Cerdas & 1-Klik Bayar (Inline 2-Step Confirmation, Bebas Popup):** Sistem secara otomatis mencocokkan mutasi kas bulan berjalan dengan pola referensi `REC-{ID}-{TAHUN}-{BULAN}`. Tombol menerapkan pola **Inline 2-Step Confirmation** tanpa popup browser (`window.confirm` dilarang total): ketika tombol ditekan, tombol berubah langsung di tempat menjadi hijau `[Klik Konfirmasi]` dan `[Batal]`. Sekali klik konfirmasi, sistem langsung membuat baris mutasi `Expense` di buku kas, menetapkan status lunas, dan memperbarui angka keuangan seketika.

---

## 5. Prosedur Audit-Safe Tutup Buku Bulanan (Financial Closing)

Fitur **Tutup Buku** digunakan pada setiap akhir periode akuntansi (bulanan) untuk menjamin integritas pembukuan:

1. **Agregasi Snapshot Permanen:**  
   Menyimpan angka final pendapatan kotor (*gross revenue*), total beban (*total expenses*), laba bersih (*net profit*), dan estimasi PPh final ke dalam tabel `financial_closings`.
2. **Penguncian Mutasi Kas (Mutation Lock):**  
   Seluruh catatan pengeluaran (`Expense`) pada bulan yang ditutup buku akan otomatis diubah statusnya menjadi `isLocked = true`. Mutasi tersebut tidak dapat diedit atau dihapus oleh staf manapun untuk mencegah pemalsuan nota masa lalu.
3. **Validasi Anti-Posting Periode Terkunci:**  
   Jika ada pengguna yang mencoba menambahkan pengeluaran baru dengan tanggal di bulan yang telah ditutup buku, sistem akan menolak transaksi dengan pesan kesalahan:  
   `"Periode bulan X/YYYY telah ditutup buku dan dikunci. Mutasi tidak dapat dibukukan."`
4. **Pembukaan Kunci Darurat (Reopen Approval):**  
   Hanya akun dengan role `SUPER_ADMIN` yang memiliki otoritas untuk membuka kembali (*reopen/unlock*) periode tutup buku jika terjadi revisi audit khusus.

---

## 6. Rekapitulasi Pajak PPh Final UMKM 0,5% (PP 55 Tahun 2022)

Untuk memudahkan pelaporan SPT Tahunan Badan / Orang Pribadi di portal DJP Online, tab finance menyediakan lembar rekapitulasi 12 bulan:

- **Dasar Hukum:** Peraturan Pemerintah No. 55 Tahun 2022 (Perubahan atas PP 23/2018) tentang Pajak Penghasilan atas Penghasilan dari Usaha yang Diterima atau Diperoleh Wajib Pajak yang Memiliki Peredaran Bruto Tertentu.
- **Objek Pajak:** Peredaran Bruto (Omzet Kotor Penjualan Order Berstatus PAID).
- **Tarif:** **0,5% (setengah persen)** dari omzet per bulan.
- **Jatuh Tempo Penyetoran:** Paling lambat tanggal 15 bulan berikutnya setelah masa pajak berakhir.
- **Pencatatan NTPN:** Admin dapat memasukkan 16-digit Nomor Transaksi Penerimaan Negara (NTPN) atau Nomor Bukti Penerimaan Negara (BPN) setelah menyetor pajak di bank persepsi/kantor pos sebagai arsip bukti kepatuhan fiskal resmi.

---

## 7. Peta Endpoint API Finance

| Metode | Endpoint | Hak Akses | Deskripsi Fungsional |
|---|---|---|---|
| `GET` | `/api/admin/finance/overview` | Admin / Finance | Ringkasan metrik (Revenue, OPEX, Margin, MoM), data chart harian/bulanan/tahunan, alokasi biaya per kategori, dan status tagihan rutin bulan ini. |
| `GET` | `/api/admin/finance/expenses` | Admin / Finance | Daftar mutasi kas keluar terpaginasi dengan filter search, kategori, sumber dana, tanggal, serta dukungan unduh CSV (`?export=csv`). |
| `POST` | `/api/admin/finance/expenses` | Admin / Finance | Mencatat pengeluaran operasional baru (validasi periode tutup buku & unggah bukti struk). |
| `PUT` | `/api/admin/finance/expenses/[id]` | Admin / Finance | Memperbarui catatan pengeluaran (hanya jika periode belum dikunci/tutup buku). |
| `DELETE` | `/api/admin/finance/expenses/[id]` | Admin / Finance | Menghapus catatan pengeluaran (hanya jika periode belum dikunci). |
| `POST` | `/api/admin/finance/upload-receipt` | Admin / Finance | Mengunggah bukti struk, invoice, atau nota transfer (JPG, PNG, WebP, PDF) maksimal 5MB ke `/uploads/finance/receipts/`. |
| `GET` | `/api/admin/finance/recurring` | Admin / Finance | Menampilkan jadwal tagihan berkala dan status kelunasannya di bulan target. |
| `POST` | `/api/admin/finance/recurring` | Admin / Finance | Mendaftarkan komitmen tagihan rutin baru (server, wifi, listrik, lisensi). |
| `PUT` | `/api/admin/finance/recurring` | Admin / Finance | Mengupdate parameter tagihan rutin (nominal estimasi, tanggal tempo, status aktif). |
| `DELETE` | `/api/admin/finance/recurring` | Admin / Finance | Menghapus tagihan rutin dari sistem. |
| `POST` | `/api/admin/finance/recurring/[id]/pay` | Admin / Finance | Aksi 1-klik untuk langsung membukukan tagihan rutin ke tabel `Expense` dengan referensi unik. |
| `GET` | `/api/admin/finance/closing` | Admin / Finance | Mengambil daftar riwayat penutupan buku periode lampau beserta nominal laba/rugi. |
| `POST` | `/api/admin/finance/closing` | Super Admin / Admin | Mengeksekusi penutupan buku resmi untuk bulan tertentu dan mengunci seluruh mutasi kas terkait. |
| `DELETE` | `/api/admin/finance/closing` | Super Admin Khusus | Membuka kembali (*reopen/unlock*) periode tutup buku untuk revisi audit akuntansi. |
| `GET` | `/api/admin/finance/tax` | Admin / Finance | Menghitung lembar rekapitulasi PPh Final 0,5% 12 bulan (omzet bruto, pajak terutang, status setor). |
| `POST` | `/api/admin/finance/tax` | Admin / Finance | Menyimpan konfirmasi pembayaran pajak masa beserta nomor NTPN resmi. |

---

## 8. Ringkasan Skema Database

```prisma
enum ExpenseCategory {
  INFRASTRUCTURE     // VPS Hostinger, Domain, Cloudflare
  UTILITIES          // Listrik PLN, IndiHome, Air PDAM
  MARKETING          // Meta Ads, Google Ads, Endorsement
  SOFTWARE_LICENSES  // GitHub Copilot, Canva, Figma
  OPERATIONAL        // ATK Kantor, Transportasi, Makan Siang Tim
  OTHER              // Beban tak terduga lainnya
}

model Expense {
  id              String          @id @default(uuid())
  title           String
  category        ExpenseCategory @default(OTHER)
  amount          Decimal         @db.Decimal(12, 2)
  expenseDate     DateTime        @default(now())
  paymentSource   String?         @default("TRANSFER_BANK")
  referenceNumber String?
  receiptUrl      String?
  notes           String?
  createdById     String?
  isLocked        Boolean         @default(false)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([category])
  @@index([expenseDate])
  @@map("expenses")
}

model RecurringExpense {
  id              String          @id @default(uuid())
  name            String
  category        ExpenseCategory @default(UTILITIES)
  estimatedAmount Decimal         @db.Decimal(12, 2)
  dueDayOfMonth   Int
  vendorName      String?
  paymentSource   String?         @default("TRANSFER_BANK")
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())

  @@map("recurring_expenses")
}

model FinancialClosing {
  id            String    @id @default(uuid())
  periodMonth   Int
  periodYear    Int
  grossRevenue  Decimal   @db.Decimal(12, 2)
  totalExpenses Decimal   @db.Decimal(12, 2)
  netProfit     Decimal   @db.Decimal(12, 2)
  taxAmount     Decimal   @db.Decimal(12, 2)
  taxPaid       Boolean   @default(false)
  taxPaidAt     DateTime?
  closedById    String
  closedAt      DateTime  @default(now())
  notes         String?

  @@unique([periodMonth, periodYear])
  @@map("financial_closings")
}
```
