# DOKUMENTASI RESMI: TAHAP STUDIO EDITOR UNDANGAN
**Luxenary Invite Platform — Dual-Native Studio & Kustomisasi 14 Seksi Undangan**

Dokumen ini membedah arsitektur teknis, alur data, komponen UI, serta mekanisme penyimpanan pada tahap **Studio Editor Undangan** (`/dashboard/invitation/[id]`), ruang kerja utama tempat klien merancang, mengunggah media, mengonfigurasi palet warna, dan mempublikasikan undangan digital.

---

## 1. Arsitektur Dual-Native Studio

Halaman Studio Editor menerapkan pola **Dual-Native Mode**:
1. **Form Mode (Panel Kustomisasi Terstruktur):** Akordion 14 seksi modular dengan validasi ketat, input dinamis, upload direct-to-cloud (Cloudflare R2), dan pemilih palet warna interaktif.
2. **Live Visual Editor (Interactive Canvas Mode):** Tampilan kanvas WYSIWYG berbasis `iframe` yang merender pratinjau langsung secara real-time dengan tombol toggle *Viewport Switcher* (Mobile 390px vs Desktop Responsive).

```mermaid
flowchart TD
    subgraph ClientWorkspace [Studio Editor: /dashboard/invitation/:id]
        A[Inisialisasi Data Undangan] --> B{Pilih Mode Studio}
        B -->|Form Mode| C[Akordion 14 Seksi Kustomisasi]
        B -->|Live Mode| D[Live Canvas Iframe & Viewport Switcher]
        
        C --> E[Upload Media: Cloudflare R2 Direct]
        C --> F[Pilihan Tema & Custom Color Palette]
        C --> G[Auto-Save Snapshot & Dirty State Tracker]
        
        G --> H[Tombol: Simpan Perubahan]
        H --> I[PUT /api/client/invitations/:id]
        I --> J[(Database PostgreSQL - Prisma)]
        
        J --> K{Status Publishable?}
        K -->|Tema Valid| L[Aktifkan Tombol Publikasi]
        K -->|Tema Kosong| M[Blokir Publikasi & Tampilkan Peringatan]
    end
```

---

## 2. Rincian 14 Seksi Modular Form Editor

Studio Editor membagi form input menjadi 14 seksi terorganisir untuk kenyamanan pengantin:

### Seksi 1: Tema Desain & Palet Warna (`SEC1`)
- **Filter Tema Berdasarkan Tier Paket:**
  - `TRADITIONAL`: Akses tema tradisional (Badrika, Candani, Dilla Lucky, dll).
  - `MODERN`: Akses tema Modern + Traditional.
  - `PREMIUM`: Akses seluruh tema eksklusif editorial & cinematic (Kalandra, Valente, Aurelia, Artisan).
  - Jika klien mencoba memilih tema di atas tier paketnya, muncul **Modal Upgrade Paket** interaktif dengan kalkulasi selisih harga dinamis dari `AdminSetting`.
- **Dynamic Color Palettes:**
  - Pemilihan preset palet warna (Default, Romantic Blush, Royal Gold, Emerald Forest, Midnight Navy, Vintage Sepia).
  - Menghasilkan token CSS Variables `--primary`, `--accent`, `--surface`, `--text-main` yang langsung disuntikkan ke rendering engine tema.
- **Validasi Anti-Kosong:**
  - Jika klien belum memilih tema (`themeId = ""`), seksi ini otomatis terbuka (*auto-expanded*) dan menampilkan badge peringatan merah di header editor.

### Seksi 2: Sampul & Visual Utama (`SEC2`)
- **Foto Sampul Pembuka (Cover Gate):** Gambar vertikal yang menjadi wajah pertama undangan sebelum amplop dibuka.
- **Foto Hero / Header Utama:** Foto orientasi horizontal/vertikal pengantin pada awal halaman undangan.
- **Badge / Penanda Tanggal Acara:** Tanggal pendek yang tercantum di badge sampul.

### Seksi 3: Profil Pasangan Mempelai (`SEC3`)
- **Mempelai Pria:**
  - Foto profil pria (Upload R2 dengan crop ratio 1:1 / 3:4).
  - Nama panggilan & nama lengkap beserta gelar akademik/adat.
  - Urutan anak dalam keluarga (misal: "Putra pertama dari...").
  - Nama lengkap kedua orang tua / wali.
  - Tautan akun Instagram (opsional).
- **Mempelai Wanita:**
  - Struktur data identik dengan mempelai pria.
- **Penentuan Urutan Nama Tampil:**
  - Saklar penentu siapa yang namanya tampil di awal (Pria dahulu atau Wanita dahulu), sesuai adat istiadat keluarga.

### Seksi 4: Kutipan Pembuka (`SEC4`)
- **Preset Kutipan Lengkap (Lintas Agama & Sastra Populer):**
  - Islam: Q.S. Ar-Rum ayat 21.
  - Kristen / Katolik: 1 Korintus 13:4-7, Kejadian 2:24.
  - Hindu: Rgveda X.85.42.
  - Buddha: Mangala Sutta.
  - Sastra / Puisi Romantis: Sapardi Djoko Damono ("Aku ingin mencintaimu dengan sederhana..."), Kahlil Gibran ("Sang Nabi").
  - Universal: Janji Suci & Harapan.
- **Custom Quote & Attribution:** Field kustomisasi teks kutipan bebas, judul seksi (Kutipan Cinta / Kata Mutiara / Pappaseng / Ayat Suci), beserta sumber/referensi kutipan.

### Seksi 5: Rangkaian Acara (`SEC5`)
- **Daftar Event Dinamis (Multi-Event Support):**
  - Akad Nikah / Pemberkatan / Ijab Qobul.
  - Resepsi Pernikahan / Walimatul 'Urs.
  - Acara Adat (Mappacci, Siraman, Midodareni, Tea Pai, dll).
- **Atribut per Acara:**
  - Nama acara, tanggal, jam mulai s/d selesai (atau "Selesai").
  - Nama gedung / tempat, alamat lengkap.
  - Zona waktu (WIB, WITA, WIT).
  - Link navigasi Google Maps & kode embed iframe maps.
  - Tombol aksi *"Simpan ke Google Calendar"*.

### Seksi 6: Kartu Akses QR & Check-In Meja Tamu (`SEC6`)
- Pengaturan penayangan QR Code tiket masuk di bagian bawah undangan tamu.
- Opsi untuk mengaktifkan teks instruksi: *"Tunjukkan QR Code ini kepada petugas resepsionis saat tiba di lokasi acara."*

### Seksi 7: Kisah Cinta / Love Story Timeline (`SEC7`)
- Saklar aktifkan/nonaktifkan seksi.
- Daftar babak perjalanan cinta:
  - Tahun / Tanggal momen (Contoh: "Pertama Bertemu - 2021", "Lamaran - 2024").
  - Judul momen & paragraf cerita.
  - Foto kenangan momen tersebut.

### Seksi 8: Galeri Foto & Video Prewedding (`SEC8`)
- Galeri foto grid interaktif dengan lightbox full-screen.
- Integrasi video prewedding dari YouTube / Vimeo atau video storage R2.

### Seksi 9: Rekening Bank & Hadiah Digital (`SEC9`)
- Nomor rekening bank dan e-wallet mempelai untuk amplop digital.
- Fitur salin nomor rekening instan 1-klik.

### Seksi 10: Panduan Busana / Dress Code (`SEC10`)
- **Dress Code Visual Color Studio**:
  - Bulatan warna interaktif (*Visual Swatches*) dengan *isolated local state* (pembaruan visual instan 0ms tanpa me-render ulang seluruh halaman saat drag warna) & *color picker* langsung di layar tanpa perlu menghafal kode HEX.
  - 8 Preset tren warna pernikahan 1-klik (*Earthy Terracotta, Sage & Champagne, Dusty Rose, dll.*).
  - Tombol pintar `✨ Samakan Tema` untuk menyelaraskan busana dengan tema fisik aktif.
  - Pratinjau instan (*Live Guest Preview*) kartu busana tamu.
  - Mode lanjutan input manual kode hex untuk desainer/WO.
- Catatan tambahan himbauan busana dan etika kehadiran tamu.

### Seksi 11: Live Streaming Pernikahan (`SEC11`)
- Penayangan siaran langsung bagi tamu yang berhalangan hadir.
- URL streaming (YouTube Live, Instagram Live, Zoom Meeting).

### Seksi 12: Filter Instagram Pengantin (`SEC12`)
- Tautan filter AR Instagram kustom milik pengantin agar tamu dapat merekam momen dengan filter bertuliskan nama mempelai.

### Seksi 13: Turut Mengundang (`SEC13`)
- Daftar nama keluarga besar, tokoh adat, kerabat, atau kolega terhormat yang turut mengundang.

### Seksi 14: Galeri Kenangan Tamu / Live Moments (`SEC14`)
- Konfigurasi portal upload foto bagi tamu undangan di venue acara.
- Pengaturan hak moderasi (apakah foto tamu langsung tampil atau butuh persetujuan pengantin).

### Seksi 15: Pengaturan Teks UI & Label (`SEC15`)
- **Kustomisasi Formulir RSVP:**
  - Teks tombol kirim RSVP (`customLabels.rsvpBtnText`) — Contoh: *"Kirim Konfirmasi & Doa"*, *"Kirim RSVP"*.
  - Judul seksi RSVP (`rsvpTitle`), label nama tamu (`rsvpNameLabel`), status kehadiran (`rsvpStatusLabel`), kuota pax (`rsvpCountLabel`), dan pesan ucapan (`rsvpMessageLabel`).
- **Kustomisasi Sampul & Tombol Buka:**
  - Teks tombol buka undangan (`openBtn`) — Contoh: *"Buka Undangan"*, *"Open Invitation"*.
  - Subtitle sampul pembuka (`coverSubtitle`) — Contoh: *"UNDANGAN PERNIKAHAN"*.
- **Kustomisasi Label Hitung Mundur (Countdown Timer):**
  - Penamaan unit waktu: Hari (`cdDays`), Jam (`cdHours`), Menit (`cdMins`), Detik (`cdSecs`).
- **Galeri Foto:**
  - Multi-upload gambar (maksimum sesuai kuota paket) langsung ke Cloudflare R2 Storage.
  - Pengurutan foto (drag & drop urutan tampilan).
- **Video Prewedding / Teaser:**
  - Dukungan URL video YouTube, Vimeo, atau direct MP4 Cloudflare Stream / R2.

### Seksi 9: Tanda Kasih & Amplop Digital (`SEC9`)
- Saklar aktifkan/nonaktifkan fitur amplop.
- **Multi-Rekening Bank & E-Wallet:**
  - Bank tujuan (BCA, Mandiri, BNI, BRI, BSI, Bank Jago, CIMB, dll).
  - E-Wallet (GoPay, OVO, Dana, ShopeePay).
  - Nomor rekening & nama pemilik rekening.
- **QRIS Statis:** Upload gambar QRIS pengantin untuk memudahkan transfer instan tanpa input nomor rekening.
- **Alamat Kirim Hadiah Fisik:**
  - Nama penerima, nomor WhatsApp kurir, dan alamat pengiriman kado lengkap.

### Seksi 10: Dress Code & Protokol (`SEC10`)
- Penjelasan anjuran busana (Pakaian adat, warna busana yang dianjurkan / dihindari).
- Palet warna dress code visual (lingkaran warna swatch).
- Poin-poin himbauan kenyamanan acara.

### Seksi 11: Live Streaming Pernikahan (`SEC11`)
- Penayangan siaran langsung bagi tamu yang berhalangan hadir.
- URL streaming (YouTube Live, Instagram Live, Zoom Meeting).

### Seksi 12: Filter Instagram Pengantin (`SEC12`)
- Tautan filter AR Instagram kustom milik pengantin agar tamu dapat merekam momen dengan filter bertuliskan nama mempelai.

### Seksi 13: Turut Mengundang (`SEC13`)
- Daftar nama keluarga besar, tokoh adat, kerabat, atau kolega terhormat yang turut mengundang.

### Seksi 14: Galeri Kenangan Tamu / Live Moments (`SEC14`)
- Konfigurasi portal upload foto bagi tamu undangan di venue acara.
- Pengaturan hak moderasi (apakah foto tamu langsung tampil atau butuh persetujuan pengantin).

---

## 3. Sistem Audio Player & Kebijakan Autoplay

1. **Pustaka Musik Sistem & Custom Upload:**
   - Klien dapat memilih lagu instrumen romantis berlisensi dari katalog sistem.
   - Opsi upload file MP3 sendiri ke Cloudflare R2 dengan batas ukuran aman (maks 10MB).
2. **Web Audio API Policy Enforcement:**
   - Browser modern memblokir audio autoplay sebelum ada interaksi pengguna (*user gesture*).
   - Audio diinisialisasi dalam keadaan `muted/paused` dan baru dipicu saat tamu menekan tombol **"Buka Undangan"** pada sampul pembuka.
   - Di dalam undangan, tersedia tombol melayang (*floating music disk*) untuk memutar / menjeda lagu kapan saja.

---

## 4. Siklus Penyimpanan & Kontrak API

- **Endpoint Simpan Data:**
  - `PUT /api/client/invitations/[id]`
- **Format Payload:**
  ```json
  {
    "themeId": "kalandra",
    "colorPalette": "midnight-navy",
    "groomName": "Andi Pratama",
    "groomNickname": "Andi",
    "brideName": "Siti Nurhaliza",
    "brideNickname": "Siti",
    "musicUrl": "https://pub-r2.luxenary.com/audio/wedding-song.mp3",
    "events": [
      {
        "title": "Akad Nikah",
        "date": "2026-10-15",
        "startTime": "09:00",
        "endTime": "11:00",
        "location": "Masjid Raya Saoraja",
        "mapsUrl": "https://maps.google.com/..."
      }
    ],
    "stories": [],
    "bankList": []
  }
  ```
- **Prinsip Zero-Loss & Visual Header Dirty Tracking:** Setiap seksi form memiliki pemantau perubahan mandiri (`isDirty.secX`). Ketika seksi memiliki perubahan yang belum disimpan (termasuk saat seksi ditutup/dilipat), header seksi langsung menampilkan notifikasi tipografi bersih tanpa card: **"Perubahan belum tersimpan • Simpan"**. Pengantin dapat langsung menyimpan seksi tersebut dengan 1 klik tanpa harus membuka akordion kembali. Begitu data tersimpan, teks otomatis lenyap dan header kembali bersih total.

---

## 5. Proteksi Pasca Publikasi, Mode Darurat, & Atomic Single Deploy

1. **Penguncian Studio Pasca Publikasi (`PUBLISHED`):**
   - Begitu undangan resmi terbit, seluruh formulir di tab Edit Undangan (`/dashboard/invitation/[id]`) otomatis terkunci rapat (`isLocked = true`, `lockReason = "PUBLISHED"`).
   - Menampilkan kartu proteksi minimalis elegan dengan ikon gembok vektor SVG modern, penjelasan pemeliharaan data, dan tombol langsung ke WhatsApp Admin CS.
2. **Mekanisme Buka Kunci Darurat (Admin Emergency Unlock):**
   - Klien yang memerlukan revisi mendesak (ralat jam acara, link Maps gedung, typo nama orang tua) dapat mengajukan pembukaan Kunci Darurat.
   - Administrator membuka akses edit darurat melalui panel `/admin` (`adminUnlockedUntil`, default 24 jam).
3. **Staging Save (Bebas dari Beban Perulangan Bake):**
   - Selama masa darurat terbuka, tombol "Simpan" di masing-masing seksi hanya memperbarui data ke PostgreSQL database.
   - Kompilasi file HTML statis dan upload ke Cloudflare R2 sengaja ditangguhkan (*deferred*) agar server tidak mengalami *rebake storm* berkali-kali.
4. **Atomic Single Deploy & Auto-Lock (`DEPLOY_AND_LOCK`):**
   - Banner darurat di puncak form menyediakan tombol aksi: **"Perbarui Undangan & Kunci Kembali"**.
   - Saat ditekan, sistem menjalankan **1 kali kompilasi tunggal** (`buildAndSavePublishedHtml` dan `syncDraftToR2`) langsung ke live CDN, lalu otomatis menghapus izin darurat (`adminUnlockedUntil = null`).
   - Studio seketika terkunci kembali secara otomatis tanpa perlu menunggu masa 24 jam habis.
5. **Daur Ulang Subdomain:**
   - Jika klien mengganti subdomain saat revisi, nilai lama otomatis terlepas dari basis data Prisma (`@unique`) dan kembali tersedia di pool publik secara instan. Kunjungan ke link lama dialihkan secara aman ke beranda dengan notice `subdomain-available`.
