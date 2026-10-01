# Panduan Arsitektur & Operasional: Tab Manajemen Tema (Admin Control Panel)

Dokumen ini adalah referensi resmi untuk operasional dan arsitektur teknis dari **Tab Manajemen Tema** pada Control Panel Administrator (`/admin`).

---

## 1. Filosofi & Arsitektur Tema (*Single Source of Truth*)

Sistem undangan platform **Luxenary Invite** menggunakan arsitektur **100% Native Standalone HTML Template** dengan pengelompokan hierarki dua tingkat (*Two-Tier Event & Style Hierarchy*):
1. **Tidak Ada Dependensi Server Runtime Luar:** Setiap tema adalah file `.html` mandiri lengkap dengan CSS dan JavaScript interaktif di dalamnya.
2. **Koleksi Fisik Mandiri:** Semua master file tema tersimpan di direktori fisik berjenjang:
   * `themes/wedding/` (Subfolder: `minimalist/`, `modern/`, `traditional/`)
   * `themes/birthday/` (Subfolder: `modern/`, `minimalist/`)
   * `themes/khitan/` (Subfolder: `traditional/`, `modern/`)
   * `themes/aqiqah/` (Subfolder: `minimalist/`, `traditional/`)
   * `themes/wisuda/` (Subfolder: `modern/`, `minimalist/`)
   * `themes/general/` (Subfolder: `modern/`, `minimalist/`)
   * `themes/_blueprints/` (Starter blueprints resmi untuk 6 jenis acara)
3. **Single Source of Truth:** File fisik di folder `themes/` adalah acuan tunggal yang sah. Tidak boleh ada tema yang terdaftar di database tanpa memiliki file fisik `.html` di folder tersebut.

---

## 1.1. Inventaris Faktual 39 Tema Platform (Multi-Event)

Saat ini platform memiliki **39 tema fisik mandiri** yang terdaftar di database dan disk, mencakup 6 jenis acara:

| Jenis Acara (`eventType`) | Total Tema | Daftar Tema Aktif di Disk & Database |
|:---|:---:|:---|
| **WEDDING** | **33 Tema** | • **Minimalist (6):** `aeterna`, `artisan`, `aurelia`, `kalandra`, `valente`, `verona`<br>• **Modern (12):** `ameera`, `badrika`, `burgundy-royale`, `candani`, `chronicle`, `lumina`, `mayang`, `papercut`, `solaria`, `starlit-dreams`, `vintage-forest`, `wave`<br>• **Traditional (15):** `bone`, `bugis`, `bulukumba`, `dillalucky`, `gowa`, `lagaligo`, `makale`, `makassar`, `maros`, `prameswari`, `rantepao`, `soppeng`, `takalar`, `toraja`, `wajo` |
| **BIRTHDAY** | **2 Tema** | • `kalandra-birthday` (Minimalist)<br>• `festivo` (Modern) |
| **KHITAN** | **1 Tema** | • `al-fariz` (Traditional) |
| **AQIQAH** | **1 Tema** | • `al-khalid` (Minimalist) |
| **WISUDA** | **1 Tema** | • `cendekia` (Modern) |
| **GATHERING** | **1 Tema** | • `sinergi` (Modern) |
| **TOTAL** | **39 Tema** | **Tersinkronisasi 100% via `npm run themes:sync`** |

### Sistem Thumbnail Ganda Beresolusi Tinggi (Retina DevTools)
Setiap tema di direktori `public/demo/{themeId}/` wajib dilengkapi oleh dua berkas thumbnail WebP kompresi tajam:
1. `thumbnail_mobile.webp`: Resolusi **400 × 800 px** (emulasi viewport smartphone, rasio 1:2).
2. `thumbnail_desktop.webp`: Resolusi **1280 × 800 px** (emulasi viewport layar desktop/laptop, rasio 16:10).
- Skrip generator otomatis: `npm run generate:thumbnails` ([`scripts/generate-all-thumbnails.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/scripts/generate-all-thumbnails.ts)) memanfaatkan Chrome DevTools Protocol (CDP) headless native screenshot.

---

## 2. Alur Penambahan Tema Baru (*Upload & Auto-Compile*)

Mulai versi ini, Admin dapat menambahkan tema baru secara langsung dari Dashboard Admin tanpa perlu menyalin file secara manual melalui server console/VS Code.

```
[ Admin Dashboard: Modal Tambah Tema ]
        │
        ├─ 1. Isi Metadata: ID Tema (e.g. 'aurora'), Nama, Jenis Acara (EventType), Kategori/Style, Deskripsi, Urutan
        ├─ 2. Unggah File Master: 'aurora.html' (Wajib format .html)
        │
        ▼
[ API: POST /api/admin/themes ] (Multipart FormData)
        │
        ├─ Step A: Validasi Ekstensi & Duplikasi ID
        ├─ Step B: Simpan Fisik File ke `themes/{eventType}/{style}/{id}.html`
        ├─ Step C: Simpan Metadata ke Tabel PostgreSQL `themes`
        ├─ Step D: Jalankan `compileAndSaveStaticDemo(id)`
        │          (Menggabungkan template master dengan mock data pengantin/persona)
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
| **Jenis Acara (Event Type)** | Pilihan | `Wedding`, `Birthday`, `Khitan`, `Aqiqah`, `Wisuda`, atau `Gathering`. Menentukan direktori utama acara. |
| **Kategori / Style** | Pilihan | `Minimalist`, `Modern`, atau `Traditional`. Menentukan subfolder gaya di dalam jenis acara. |
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

**Penjagaan keterpakaian:** `invitations.themeId` memiliki foreign key ke `themes.id` dengan `ON DELETE RESTRICT` (migrasi `20261001150000_db_integrity_theme_fk_amount_precision`). `DELETE /api/admin/themes` menghitung undangan yang memakai tema lebih dulu; bila ada, API membalas HTTP 409 (`Tema masih dipakai N undangan...`) dan tidak ada yang dihapus, termasuk berkas master di disk. Tema yang tidak dipakai dihapus dengan empat lapisan di bawah. Untuk menyembunyikan tema yang masih dipakai dari katalog, nonaktifkan tema (`isActive = false`).

### 4.1. Tahapan Pembersihan 4 Lapisan (*Full Sterilization*)
1. **Pembersihan Database:** Baris record tema dihapus secara permanen dari tabel PostgreSQL `themes` (`await prisma.theme.delete`).
2. **Pembersihan Master Fisik:** File template master `.html` di `themes/{kategori}/{id}.html` dihapus secara fisik dari disk (`await fs.unlink`).
3. **Pembersihan Cache Demo:** Seluruh folder statis demo di `public/demo/{id}/` beserta seluruh file HTML dan asetnya dihapus tuntas (`await fs.rm(demoDir, { recursive: true, force: true })`).
4. **Invalidasi Cache Katalog:** Cache Next.js untuk `/demo`, `/admin`, dan katalog publik langsung di-revalidate sehingga tema seketika lenyap dari pandangan publik dan opsi pilihan klien baru.

---

### 4.2. Mekanisme Perlindungan Undangan Klien (*Arsitektur Piring Mandiri*)

Tema yang dipakai undangan tidak dapat dihapus lewat panel (lihat penjagaan di atas). Perlindungan ini tetap berlaku untuk kasus berkas master hilang dari disk (misalnya terhapus lewat Git atau filesystem) sementara baris tema dan undangan klien masih ada. Sistem menerapkan **Arsitektur Piring Mandiri (*Standalone Draft Plate Architecture*)**:

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

1. **Auto-Discovery Multi-Event:** Memindai seluruh folder acara dan gayanya (`themes/wedding/`, `themes/birthday/`, `themes/khitan/`, `themes/aqiqah/`, `themes/wisuda/`, `themes/general/`). Setiap file `.html` baru yang diletakkan langsung via Git/filesystem akan otomatis didaftarkan ke tabel `themes` dengan `eventType` dan `style` yang tepat.
2. **Safety Guard Anti-Wipeout:** Memastikan jika 0 file terdeteksi di disk (misal saat proses deploy belum selesai), operasi langsung dibatalkan secara aman tanpa merusak database.
3. **Auto-Purge Tema Zombie:** Memeriksa seluruh baris tema di tabel database. Jika ada record di database yang file fisiknya **tidak ditemukan** di disk, record tersebut otomatis dihapus dari database demi menjaga integritas data. Record yang masih dipakai undangan tidak dihapus: tetap tersimpan dan namanya dikembalikan di `retainedWithoutFile` pada respons sync, sedangkan jumlah yang terhapus ada di `purgedCount`.
4. **Preservasi Pengaturan Kustom:** Mempertahankan kustomisasi admin (`sortOrder`, thumbnail kustom, deskripsi, dan status aktif/nonaktif tema yang pernah diatur di dashboard).
5. **Mass Re-Compile:** Mengompilasi ulang seluruh file HTML demo statis di `public/demo/` untuk semua tema aktif.
6. **Multi-Layer Cache Invalidation:** Me-revalidate seluruh halaman Next.js (`/demo`, `/demo/[theme]`, `/demo/preview`, `/api/public/themes`, dan `/`), serta secara otomatis mengeksekusi purge cache ke **Cloudflare Edge CDN** (jika `CF_ZONE_ID` dan `CF_API_TOKEN` terkonfigurasi di `.env`).

---

## 6. Standar Blueprint Template Tema Multi-Event (`themes/_blueprints/`)

Admin atau desainer dapat mengunduh dan meniru starter blueprint resmi untuk 6 jenis acara yang tersimpan di `themes/_blueprints/{eventType}/`.

### Daftar Placeholder Universal Multi-Event:
| Variabel Placeholder | Fungsi Injeksi | Relevansi Event |
|---|---|---|
| `{{groomName}}`, `{{brideName}}` | Nama panggilan mempelai pria & wanita | Wedding |
| `{{groomDisplayName}}`, `{{brideDisplayName}}` | Nama lengkap mempelai pria dan wanita | Wedding |
| `{{groomParents}}`, `{{brideParents}}` | Nama orang tua / keluarga mempelai | Wedding |
| `{{personName}}`, `{{personNickname}}` | Nama lengkap & panggilan persona utama | Birthday, Khitan, Aqiqah, Wisuda |
| `{{fatherName}}`, `{{motherName}}` | Nama ayah & ibu kandung | Khitan, Aqiqah, Birthday |
| `{{degree}}`, `{{major}}`, `{{institution}}` | Gelar akademik, prodi, dan perguruan tinggi | Wisuda |
| `{{eventTitle}}`, `{{eventSubtitle}}`, `{{organizer}}` | Judul kegiatan, tema, dan institusi | Gathering / Umum |
| `{{openingQuote}}`, `{{openingQuoteRef}}` | Ayat suci / kutipan mutiara pembuka | Seluruh Acara |
| `{{globalBgUrl}}` | URL foto latar belakang utama | Seluruh Acara |
| `{{groomPhotoUrl}}`, `{{bridePhotoUrl}}` / `{{personPhotoUrl}}` | URL foto profil | Seluruh Acara |
| `{{sidebarPhotoUrl}}`, `{{landingCoverUrl}}` | URL foto cover kartu & cover pembuka | Seluruh Acara |
| `{{eventDataHtml}}` | Kontainer acara (Sesi 1, Sesi 2, Waktu, Lokasi & Maps) | Seluruh Acara |
| `{{storySectionHtml}}` | Seksi perjalanan cinta / kilas balik cerita | Seluruh Acara |
| `{{gallerySectionHtml}}` | Seksi galeri foto (*Grid / Carousel Moments*) | Seluruh Acara |
| `{{giftSectionHtml}}` | Seksi amplop digital (*Direct Bank Transfer & Kado Fisik*) | Seluruh Acara |
| `{{qrAccessSectionHtml}}` | Seksi & tombol QR Pass Buku Tamu Digital | Seluruh Acara |
| `{{musicAudioUrl}}` | URL file lagu latar belakang | Seluruh Acara |

---

## 7. Studio Demo Tema (*Visual Customizer*)

Setiap kartu tema memiliki tombol **Studio**. Fitur ini memungkinkan Admin untuk mengkustomisasi aset khusus tema tersebut untuk keperluan pameran katalog `/demo`:
* Mengganti foto hero, background, dan galeri pameran tema.
* Mengubah nama pengantin contoh (mock data) dan kutipan khusus tema.
* Menyimpan kustomisasi visual tanpa memengaruhi tema lainnya.
