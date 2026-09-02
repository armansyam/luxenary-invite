# Catatan Perbaikan & Audit Arsitektur (Untuk Claude)

Berikut adalah daftar temuan logika yang perlu dibersihkan pada sistem Portofolio agar sejalan dengan *Master Flow* aplikasi dan tidak mengandung *dead-code* atau asumsi *defensive* yang menyesatkan:

### 1. Pembersihan Dead-Code Pengecekan HTML (Portofolio API)
**Lokasi:** `app/api/admin/portfolio/route.ts`
**Masalah:** Terdapat blok kode yang melakukan pengecekan ketersediaan file `canonicalHtmlPath` dan mengembalikan error 404 jika tidak ditemukan.
**Tindakan:** Baris pengecekan ini murni *dead-code* dan asumsi *backend* yang berlebihan. Secara arsitektur UI, tombol "Jadikan Portofolio" **hanya** muncul pada tab *Client Published*. Artinya, *endpoint* ini mustahil dipanggil oleh klien yang belum *publish*.
**Instruksi untuk Claude:** Hapus atau sederhanakan logika validasi 404 tersebut karena UI State sudah menjamin keamanan pemanggilan *endpoint* ini.

### 2. Penghapusan Sisa Mentalitas "Database Relasional" di Portofolio
**Lokasi:** Keseluruhan fitur Portofolio
**Masalah:** Sebelumnya terdapat upaya mencari kelengkapan data (seperti `category` dari tabel `Theme`) ke dalam *database* saat proses pembentukan Portofolio.
**Tindakan:** Ingat prinsip dasar aplikasi ini: **Portofolio adalah Arsip/Time-Capsule**. Identitas portofolio diambil murni dari data `Invitation` yang terkunci saat proses *Publish*. Jika suatu tema kelak dihapus dari sistem, portofolio yang lama tidak boleh terpengaruh.
**Instruksi untuk Claude:** Pastikan tidak ada lagi penambahan kode `prisma.theme.findUnique` atau pencarian referensi silang ke *database* pada proses `POST /api/admin/portfolio`. Cukup rekam identitas yang ada saat itu ke `metadata.json`.

### 3. Sterilisasi Fallback
**Masalah:** Jangan gunakan fallback string statis seperti `|| "kalandra"`, `|| "custom"`, atau `|| "premium"` di dalam fitur produksi yang sudah dikunci oleh *flow* pendaftaran -> setup -> publish.
**Instruksi untuk Claude:** Jika data tersebut wajib ada (misal `themeId`), gunakan datanya langsung. *Flow* utama sudah menjamin datanya ada. Jangan menutupi *error* aplikasi dengan *fallback* palsu.
