# Panduan Arsitektur & Operasional: Tab Manajemen Tema (Admin Control Panel)

Dokumen ini adalah referensi resmi untuk operasional dan arsitektur teknis dari **Tab Manajemen Tema** pada Control Panel Administrator (`/admin`).

---

## 1. Filosofi & Arsitektur Tema (*Single Source of Truth*)

Sistem undangan pernikahan **Luxenary Invite** menggunakan arsitektur **100% Native Standalone HTML Template**:
1. **Tidak Ada Dependensi Server Runtime Luar:** Setiap tema adalah file `.html` mandiri lengkap dengan CSS dan JavaScript interaktif di dalamnya.
2. **Koleksi Fisik Mandiri:** Semua master file tema tersimpan di direktori fisik:
   * `themes/premium/` (Seri Haute Couture / Eksklusif)
   * `themes/modern/` (Seri Kontemporer & Editorial)
   * `themes/traditional/` (Seri Adat & Budaya Keraton)
3. **Single Source of Truth:** File fisik di folder `themes/` adalah acuan tunggal yang sah. Tidak boleh ada tema yang terdaftar di database tanpa memiliki file fisik `.html` di folder tersebut.

---

## 2. Alur Penambahan Tema Baru (*Upload & Auto-Compile*)

Mulai versi ini, Admin dapat menambahkan tema baru secara langsung dari Dashboard Admin tanpa perlu menyalin file secara manual melalui server console/VS Code.

```
[ Admin Dashboard: Modal Tambah Tema ]
        │
        ├─ 1. Isi Metadata: ID Tema (e.g. 'aurora'), Nama, Kategori, Deskripsi, Urutan
        ├─ 2. Unggah File Master: 'aurora.html' (Wajib format .html)
        │
        ▼
[ API: POST /api/admin/themes ] (Multipart FormData)
        │
        ├─ Step A: Validasi Ekstensi & Duplikasi ID
        ├─ Step B: Simpan Fisik File ke `themes/{kategori}/{id}.html`
        ├─ Step C: Simpan Metadata ke Tabel PostgreSQL `themes`
        ├─ Step D: Jalankan `compileAndSaveStaticDemo(id)`
        │          (Menggabungkan template master dengan mock data pengantin)
        ├─ Step E: Simpan HTML Demo ke `public/demo/{id}/index.html`
        ├─ Step F: Invalidate Cache Next.js (`/demo`, `/admin`, `/`)
        │
        ▼
[ Sukses: Tema Aktif di Admin & Siap Ditinjau di /demo ]
```

### Formulir Tambah Tema:
| Bidang Input | Tipe | Keterangan |
|---|---|---|
| **ID Tema** | Teks (Slug) | Wajib unik, huruf kecil, angka, dan strip (contoh: `aurora`). ID ini menjadi nama file `aurora.html`. |
| **Nama Tema** | Teks | Nama display tema (contoh: `Aurora Borealis`). |
| **Kategori** | Pilihan | `Premium`, `Modern`, atau `Traditional`. Menentukan subfolder di dalam `themes/`. |
| **Urutan (Sort)** | Angka | Posisi urutan penampilan di katalog showroom dan daftar setup klien. |
| **Deskripsi Singkat** | Teks | Ringkasan estetika tema yang muncul pada kartu katalog. |
| **File Master Template** | File `.html` | **Wajib diunggah**. File HTML standalone yang memuat markup dan placeholder variabel `{{...}}`. |
| **Status Aktif** | Toggle | Menentukan apakah tema langsung ditampilkan ke klien atau disembunyikan. |

---

## 3. Alur Pengeditan Tema & Pembaruan Master (*Update & Re-compile*)

Admin dapat mengubah metadata maupun memperbarui kode HTML master kapan saja:
1. Klik tombol **Edit** (ikon pensil) pada kartu tema yang ingin diperbarui.
2. Form menampilkan data yang tersimpan.
3. **Ganti File Master (Opsional):** Jika desainer melakukan revisi pada layout HTML, unggah file master `.html` yang baru pada area upload.
4. Klik **Simpan Tema**:
   * Jika ada file baru diunggah, sistem akan menimpa file fisik di `themes/{kategori}/{id}.html` dan otomatis mengompilasi ulang demo statisnya.
   * Metadata di database diperbarui.
   * Cache Next.js otomatis dibersihkan.

---

## 4. Alur Penghapusan Tema (*Hard Delete Steril*)

Ketika Admin menekan tombol Hapus (ikon tempat sampah) pada kartu tema di panel Admin:

### 4.1. Tahapan Pembersihan 4 Lapisan (*Full Sterilization*)
1. **Pembersihan Database:** Baris record tema dihapus secara permanen dari tabel PostgreSQL `themes` (`await prisma.theme.delete`).
2. **Pembersihan Master Fisik:** File template master `.html` di `themes/{kategori}/{id}.html` dihapus secara fisik dari disk (`await fs.unlink`).
3. **Pembersihan Cache Demo:** Seluruh folder statis demo di `public/demo/{id}/` beserta seluruh file HTML dan asetnya dihapus tuntas (`await fs.rm(demoDir, { recursive: true, force: true })`).
4. **Invalidasi Cache Katalog:** Cache Next.js untuk `/demo`, `/admin`, dan katalog publik langsung di-revalidate sehingga tema seketika lenyap dari pandangan publik dan opsi pilihan klien baru.

---

### 4.2. Mekanisme Perlindungan Undangan Klien (*Arsitektur Piring Mandiri*)

Bagaimana jika tema dihapus saat ada klien yang sedang dalam tahap penyusunan draft atau sudah memilih tema tersebut? Sistem menerapkan **Arsitektur Piring Mandiri (*Standalone Draft Plate Architecture*)**:

```
                              [ Penghapusan Tema oleh Admin ]
                                             │
                                             ▼
                     Apakah Klien Sudah Memiliki Piring Draft Mandiri?
                     Lokasi: `data/drafts/{invitationId}.html`
                                    /                 \
                                  YA                   TIDAK
                                 /                       \
                                ▼                         ▼
                   [ Skenario A: Aman 100% ]    [ Skenario B: Transparan & Elegan ]
                   Undangan klien membaca       Sistem menampilkan layar:
                   piring mandirinya sendiri.   "Tema Tidak Tersedia".
                   Desain & data tetap utuh     Klien dipandu untuk memilih
                   tanpa terpengaruh master     tema aktif lain di Dashboard.
                   yang telah terhapus.         (Tanpa fallback hardcode siluman!)
```

#### Skenario A: Klien Sudah Memiliki Piring Draft (`data/drafts/{invitationId}.html` Ada)
* **Status:** **100% Aman & Terlindungi.**
* Saat pertama kali klien membuka studio undangan, sistem menyalin (*forking*) kode dari master template ke dalam file draft mandiri klien di `data/drafts/{invitationId}.html`.
* Ketika Admin menghapus master tema di `themes/`, file piring draft klien **tidak tersentuh**.
* Sistem renderer ([`lib/renderTemplate.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/renderTemplate.ts)) selalu memprioritaskan piring draft fisik milik klien sebelum mencari file master.
* Klien tetap dapat melakukan preview, mengubah teks, mengunggah foto, dan mem-publish undangan mereka tanpa hambatan (*zero breaking change*).

#### Skenario B: Piring Draft Belum Terbentuk / Klien Baru Memilih Tema
* **Status:** **Integritas Terjaga & Bebas Error 500.**
* Jika klien memilih tema tertentu di database tetapi piring draft belum sempat dibuat saat master tema dihapus:
* Sistem **TIDAK** menggunakan fallback siluman (misalnya memaksa pindah ke tema default `kalandra`), melainkan merender layar panduan transparan:
  ```html
  <div style="padding:40px; text-align:center; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #fff;">
    <h2 style="color:#d32f2f;">Tema Tidak Tersedia</h2>
    <p>Tema yang Anda pilih tidak tersedia atau telah dihapus oleh sistem.</p>
    <p><b>Silakan kembali ke Dashboard Anda dan pilih tema lain yang aktif untuk melanjutkan pengeditan.</b></p>
  </div>
  ```
* Klien mendapatkan kepastian informasi yang jelas tanpa kebingungan tampilan yang berubah mendadak.

#### Skenario C: Klien Mengganti Tema di Dashboard
* Jika klien menyadari tema lama tidak lagi diinginkan atau telah dihapus, klien dapat memilih tema baru di Dashboard Setup atau Pengaturan Tema.
* Endpoint API Klien ([`app/api/client/invitations/[id]/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/invitations/[id]/route.ts)) akan secara otomatis:
  1. Menghapus piring draft lama di `data/drafts/{invitationId}.html` (`fs.unlink`).
  2. Mengganti `themeId` di database dengan ID tema baru yang dipilih.
  3. Menyalin master tema baru ke piring draft saat klien kembali membuka halaman studio.

---

## 5. Fitur "Sinkronisasi Tema & Cache" (*Disk-to-DB Sync*)

Tombol hijau **"Sinkronisasi Tema & Cache"** di bagian atas tab Manajemen Tema berfungsi sebagai sistem pemindaian menyeluruh (*full filesystem scan*):

1. **Auto-Discovery:** Memindai subfolder `themes/premium`, `themes/modern`, dan `themes/traditional`. Setiap file `.html` baru yang diletakkan langsung via Git/filesystem akan otomatis didaftarkan ke database.
2. **Auto-Purge Tema Zombie:** Memeriksa seluruh baris tema di tabel database. Jika ada record di database yang file fisiknya **tidak ditemukan** di disk, record tersebut otomatis dihapus dari database demi menjaga integritas data.
3. **Mass Re-Compile:** Mengompilasi ulang seluruh file HTML demo statis di `public/demo/` untuk semua tema aktif.
4. **Cache Invalidation:** Me-revalidate seluruh halaman `/demo` dan showroom publik.

---

## 6. Standar Blueprint Template Tema (`starter-blueprint.html`)

Admin atau desainer dapat mengunduh starter blueprint resmi melalui tombol **Download Blueprint** di toolbar Admin.

### Daftar Placeholder Wajib (*Mandatory Placeholders*):
| Variabel Placeholder | Fungsi Injeksi |
|---|---|
| `{{groomName}}`, `{{brideName}}` | Nama panggilan kedua mempelai |
| `{{groomDisplayName}}`, `{{brideDisplayName}}` | Nama lengkap mempelai pria dan wanita |
| `{{groomParents}}`, `{{brideParents}}` | Nama orang tua / keluarga mempelai |
| `{{openingQuote}}`, `{{openingQuoteRef}}` | Ayat suci / kutipan mutiara pembuka |
| `{{globalBgUrl}}` | URL foto latar belakang utama |
| `{{groomPhotoUrl}}`, `{{bridePhotoUrl}}` | URL foto individual mempelai pria & wanita |
| `{{sidebarPhotoUrl}}`, `{{landingCoverUrl}}` | URL foto cover kartu & cover pembuka |
| `{{eventDataHtml}}` | Kontainer acara (Akad Nikah, Resepsi, Waktu, Lokasi & Maps) |
| `{{storySectionHtml}}` | Seksi perjalanan cinta (*Love Story Timeline*) |
| `{{gallerySectionHtml}}` | Seksi galeri foto (*Grid / Carousel Moments*) |
| `{{giftSectionHtml}}` | Seksi amplop digital (*Direct Bank Transfer & Kado Fisik*) |
| `{{qrAccessSectionHtml}}` | Seksi & tombol QR Pass Buku Tamu Digital |
| `{{musicAudioUrl}}` | URL file lagu latar belakang romantis |

---

## 7. Studio Demo Tema (*Visual Customizer*)

Setiap kartu tema memiliki tombol **Studio**. Fitur ini memungkinkan Admin untuk mengkustomisasi aset khusus tema tersebut untuk keperluan pameran katalog `/demo`:
* Mengganti foto hero, background, dan galeri pameran tema.
* Mengubah nama pengantin contoh (mock data) dan kutipan khusus tema.
* Menyimpan kustomisasi visual tanpa memengaruhi tema lainnya.
