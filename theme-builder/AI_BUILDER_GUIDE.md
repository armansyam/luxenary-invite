# 🏛️ Panduan Master AI & Developer: Luxenary Theme Builder

Dokumen ini adalah **pedoman resmi (SOP Teknis)** bagi AI Agent maupun Pengembang dalam merancang, membangun, dan menguji tema undangan digital baru di lingkungan terisolasi `theme-builder/`.

---

## 🎯 1. Filosofi & Tujuan Folder `theme-builder/`

1. **Terisolasi Penuh dari Produksi (Zero-Pollution):**
   - Folder ini **TIDAK DI-BUILD** oleh Next.js ke produksi.
   - Anda bebas bereksperimen, membuat file HTML, mengubah CSS, atau menguji layout tanpa khawatir merusak tema lain atau memicu kegagalan build Next.js.
2. **Dilarang Mengedit File Monolitik Sistem:**
   - **JANGAN PERNAH** menambahkan data tema baru ke [`lib/demoRegistry.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/demoRegistry.ts) atau [`lib/themeDefaults.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/themeDefaults.ts).
   - Seluruh metadata dan data demo tema baru dikelola mandiri di dalam workspace tema, lalu diimpor melalui **UI Admin Dashboard** (`/admin`).
3. **Satu Template untuk Semua (Single Blueprint):**
   - **TIDAK ADA** pemisahan file antara "Master" dan "Demo".
   - File yang dibuat hanyalah **`master.html`** yang berisi token Blueprint universal. File demo akan dikompilasi secara otomatis oleh sistem dari file master ini.

---

## 🗂️ 2. Struktur Direktori Builder

```text
theme-builder/
├── AI_BUILDER_GUIDE.md        # Dokumen pedoman teknis ini
├── preview.ts                 # Script compiler & local live-reload HTTP server
├── install.ts                 # Script installer 1-klik ke sistem produksi
├── dummy-media/               # ⭐ FOLDER DUMMY MEDIA TERPUSAT (Single Source of Truth)
│   ├── cover.webp             # Satu set lengkap aset foto slot standar
│   ├── hero.webp              # Digunakan bersama oleh seluruh workspace
│   ├── background.webp        # Bebas beban duplikasi berkas di tiap workspace
│   ├── groom.webp
│   ├── bride.webp
│   ├── footer.webp
│   └── gallery_01..08.webp
├── starter/                   # Paket cetak biru acuan resmi (Golden Standard)
│   ├── master.html            # Template master HTML bersih & lengkap
│   ├── config.json            # Konfigurasi ID, nama, kategori, dan palet
│   ├── mock-data.json         # Dataset pengantin dummy untuk preview visual
│   └── demo/
│       └── index.html         # Hasil kompilasi demo HTML otomatis
└── workspaces/                # Tempat pengerjaan tema-tema baru
    └── [id-tema-baru]/        # Salinan dari folder starter/
        ├── master.html
        ├── config.json
        ├── mock-data.json
        ├── demo/
        │   └── index.html     # Hasil kompilasi demo HTML otomatis
        └── assets/            # (Opsional) Ornamen gambar khas tema baru jika ada
```

---

## 🚀 3. Alur 5 Langkah Pembangunan Tema Baru

Setiap kali Anda diminta atau ingin membuat tema baru (misalnya tema `jawa-keraton`):

### Langkah 1 — Gandakan Starter Kit ke Workspaces
Salin folder `theme-builder/starter/` ke `theme-builder/workspaces/jawa-keraton/`:
```bash
cp -r theme-builder/starter theme-builder/workspaces/jawa-keraton
```

### Langkah 2 — Atur Metadata di `config.json`
Buka `theme-builder/workspaces/jawa-keraton/config.json` dan sesuaikan nilainya:
```json
{
  "id": "jawa-keraton",
  "name": "Jawa Keraton Heritage",
  "category": "traditional",
  "series": "Traditional",
  "description": "Pesona keagungan adat Jawa dengan sentuhan motif batik dan aksara sakral.",
  "defaultPalette": "terracotta",
  "isPremium": false
}
```
*Pilihan palet yang tersedia di sistem:* `champagne`, `emerald`, `burgundy`, `sage`, `terracotta`, `sapphire`, `midnight`, `amethyst`, `dustyrose`, `blackgold`.

### Langkah 3 — Desain Template di `master.html`
Buka `theme-builder/workspaces/jawa-keraton/master.html`:
- Kustomisasi CSS, warna aksen, ornamen bingkai, ornamen sudut, tipografi serif, dan background.
- Secara default, builder otomatis menggunakan set foto terpusat dari `theme-builder/dummy-media/`. Jika tema baru membutuhkan foto persona khusus, cukup letakkan file foto di `demo/` untuk menimpa foto default.
- Pastikan seluruh aturan **Golden Blueprint Standard** (Bagian 4) dipatuhi.
- Jika menggunakan ornamen yang sudah ada, gunakan path `/assets/ornaments/...`.

### Langkah 4 — Uji Coba Visual dengan Live Preview Lokal
Jalankan preview runner lokal di terminal:
```bash
npm run theme:preview jawa-keraton
```
- Script langsung mengompilasi `master.html` menjadi `demo/index.html` yang bersanding dengan aset fotonya.
- Buka browser di `http://localhost:3333` (atau klik ganda langsung `demo/index.html` secara offline).
- Setiap kali Anda menyimpan (`Ctrl+S` / `Cmd+S`) di `master.html`, browser otomatis me-reload.

### Langkah 5 — Pasang ke Sistem (2 Opsi Mudah)
Setelah tema tampil sempurna dan lolos validasi:

- **Opsi A (CLI 1-Baris — Paling Cepat):**
  ```bash
  npm run theme:install jawa-keraton
  ```
  *Sistem otomatis menyalin `master.html` ke `themes/`, menyalin seluruh folder `demo/` ke `public/demo/`, serta mendaftarkannya ke database.*

- **Opsi B (UI Admin):**
  Buka `/admin` $\rightarrow$ **Kelola Tema** $\rightarrow$ **Tambah Tema**, lalu unggah file `master.html`.

---

## 📐 4. Standar Emas Blueprint (Golden Rules)

### A. Larangan Keras Teks & Nuansa Statis (Zero Hardcode Text)
- **DILARANG** mengetik teks agama, salam, atau teks kultural secara statis di HTML (misal: tulisan `﷽`, `WALIMATUL 'URS`, atau `Om Swastiastu` yang di-hardcode).
- **Gunakan Token Dinamis:**
  - `{{openingGreeting}}` (diapit atribut `data-lux-field="customLabels.openingGreeting"`)
  - `{{coverBadge}}` (diapit atribut `data-lux-field="customLabels.coverBadge"`)
  - `{{quoteSectionEyebrow}}` & `{{quoteSectionTitle}}`
  - `{{openingQuote}}` & `{{openingQuoteRef}}`
- **Alasan:** Setiap tema harus bisa digunakan lintas agama, suku, dan budaya secara dinamis melalui Live Editor klien.

### B. Larangan Warna Hex Mati di Kanvas (Dynamic Token Colors)
- Seluruh kanvas, background, kartu, tombol, dan border wajib menggunakan token CSS:
  - `var(--primary)`: Warna aksen utama tema
  - `var(--secondary)`: Warna aksen sekunder
  - `var(--accent)`: Warna ornamen/sorotan
  - `var(--bg-light)`: Warna kanvas terang
  - `var(--bg-dark)`: Warna kanvas gelap
  - `color-mix(in srgb, var(--primary) 15%, transparent)`: Untuk overlay dinamis
- **Fallback Hex:** Jika menyertakan fallback hex di CSS, gunakan hex resmi dari palet default tema tersebut (misal: `var(--bg-dark, #181411)`).

### C. Arsitektur Desktop Split 2-Pilar ($\ge 900\text{px}$)
- **Desktop ($\ge 900\text{px}$):**
  - Panel Kiri (Hero Fixed): Lebar `calc(100% - 460px)`, tinggi `100vh`, foto latar `{{sidebarPhotoUrl}}`.
  - Panel Kanan (Konten Undangan): Lebar tepat `460px` dengan scroll independen.
  - Tipografi desktop **wajib menggunakan clamp** (misal `font-size: clamp(2.2rem, 2.8rem, 3.2rem)`) agar teks nama mempelai tidak meluap keluar batas 460px.
- **Mobile ($< 900\text{px}$):** 100% Full-width responsif.

### D. Tiga Lapisan Kanvas Latar (Anti-Tabrakan Gradien)
Struktur kanvas latar wajib 3 lapis berurutan:
1. **Lapisan 1 (Dasar):** `body { background: var(--bg-dark, #181411); }`
2. **Lapisan 2 (Media Slot):** `<div class="fixed-bg-layer" aria-hidden="true"></div>` murni gambar tanpa gradien mati (`background-image: url('{{globalBgUrl}}');`).
3. **Lapisan 3 (Scrim Overlay):** `<div class="scrim-canvas" aria-hidden="true"></div>` overlay warna dinamis berbasis `color-mix`.

### E. Smart Outro Autohide
Navigasi bottom dock dan tombol audio FAB wajib memiliki script autohide saat mendekati footer penutup (70px sebelum dasar halaman) agar salam penutup tampil bersih tanpa terhalang tombol melayang.

---

## 🔑 5. Kamus Lengkap Token Universal (Universal Tokens)

| Token | Deskripsi / Posisi | Atribut Binding Live Editor |
| :--- | :--- | :--- |
| `{{firstName}}` | Nama panggilan pria | `data-lux-field="groomNickname"` |
| `{{secondName}}` | Nama panggilan wanita | `data-lux-field="brideNickname"` |
| `{{firstDisplayName}}` | Nama lengkap pria | `data-lux-field="groomName"` |
| `{{secondDisplayName}}` | Nama lengkap wanita | `data-lux-field="brideName"` |
| `{{coupleMonogram}}` | Inisial gabungan (cth: R & A) | — |
| `{{weddingDate}}` | Tanggal terformat (cth: Sabtu, 24 Oktober 2026) | — |
| `{{weddingDateDay}}` | Hari tanggal (cth: 24) | — |
| `{{weddingDateMonth}}` | Bulan angka (cth: 10) | — |
| `{{weddingDateYear}}` | Tahun angka (cth: 2026) | — |
| `{{openBtn}}` | Label tombol buka sampul | `data-lux-field="customLabels.openBtn"` |
| `{{coverBadge}}` | Eyebrow pembuka sampul | `data-lux-field="customLabels.coverBadge"` |
| `{{openingGreeting}}` | Salam pembuka (Arab / Latin) | `data-lux-field="customLabels.openingGreeting"` |
| `{{openingQuote}}` | Teks kutipan ayat / mutiara | `data-lux-field="openingQuote"` |
| `{{openingQuoteRef}}` | Sumber kutipan (cth: QS. Ar-Rum: 21) | `data-lux-field="openingQuoteRef"` |
| `{{eventDataHtml}}` | Blok daftar acara & lokasi terpadu | — |
| `{{storySectionHtml}}` | Seksi kisah cinta otomatis | — |
| `{{gallerySectionHtml}}` | Seksi galeri foto & video | — |
| `{{giftSectionHtml}}` | Seksi tanda kasih & rekening bank | — |
| `{{dressCodeHtml}}` | Seksi panduan busana tamu | — |
| `{{turutMengundangHtml}}`| Seksi daftar keluarga besar | — |
| `{{wishesSectionTitle}}` | Judul seksi doa & ucapan | `data-lux-field="customLabels.wishesTitle"` |
| `{{wishesHtml}}` | Daftar ucapan tamu real-time | — |
| `{{qrDockButtonHtml}}` | Tombol tiket QR di dock bawah | — |
| `{{qrAccessCardHtml}}` | Tampilan kartu QR pass tamu | — |
| `{{closingQuote}}` | Kutipan penutup keluarga | `data-lux-field="customLabels.closingQuote"` |
| `{{closingSub}}` | Salam penutup | `data-lux-field="customLabels.closingSub"` |

---

## 🎨 6. Manajemen Aset & Ornamen

1. **Shared Library (`/assets/ornaments/flowers/`, `/dividers/`):**
   - Sangat dianjurkan untuk menggunakan aset bersama yang sudah ada.
   - Panggil langsung di CSS/HTML: `url('/assets/ornaments/flowers/flower-tl.webp')`.
   - Menghemat disk dan memaksimalkan *browser cache* pengguna.
2. **Regional/Cultural Ornaments (`/assets/ornaments/bugis/`, `/toraja/`, dsb.):**
   - Gunakan ornamen budaya yang sesuai dengan rumpun tema Anda.
3. **Ornamen Baru:**
   - Simpan file dalam format **WebP** terkompresi (target < 60 KB).
   - Jangan gunakan format PNG mentah berukuran megabyte.

---

## ✅ 7. Daftar Periksa Sebelum Rilis (Pre-Flight Checklist)

Sebelum tema diimpor ke produksi:
- [ ] Menjalankan `npm run theme:preview [id-tema]` dan memastikan terminal menampilkan `100% Lolos Audit Standar Emas!`.
- [ ] Memeriksa tampilan di layar Desktop ($\ge 900\text{px}$) dan Mobile ($< 900\text{px}$).
- [ ] Memastikan musik berputar saat tombol audio diklik.
- [ ] Memastikan tombol audio FAB tersembunyi saat berada di seksi #home (agar tidak mengganggu visual pembuka) dan mengikuti visibilitas dock navigasi saat scroll.
- [ ] Memastikan tombol QR Check-In memunculkan modal tiket tamu.
- [ ] Memastikan navigasi dock dan tombol musik autohide saat scroll mendekati footer.
- [ ] Tidak ada `#hex` warna mati yang menimpa kanvas latar.
- [ ] File HTML bersih tanpa komentar spekulatif atau kode usang.
