# 🎂 Panduan Pembuatan Tema Ulang Tahun (Birthday Blueprint Guide)

> **Luxenary Digital Invitation Platform**  
> Standar Arsitektur Tema Single Person / Birthday Celebration

---

## 1. Perbedaan Utama dengan Tema Pernikahan (Wedding)

| Aspek | Wedding Blueprint | Birthday Blueprint |
|---|---|---|
| **Subjek Acara** | 2 Orang (Mempelai Pria & Wanita) | 1 Orang (Yang Berulang Tahun) |
| **Sesi Acara** | Akad / Pemberkatan & Resepsi | 1 Sesi Acara Utama (Party / Celebration) |
| **Section Khusus** | Love Story (Kisah Cinta) | Milestone & Galeri Momen |
| **Data Orang Tua** | Ortu Pria & Ortu Wanita | Ortu (Opsional, untuk anak/remaja) |
| **Struktur Folder** | `themes/wedding/<style>/<id>.html` | `themes/birthday/<style>/<id>.html` |

---

## 2. Daftar Placeholder Resmi Birthday

### Identitas Subjek Acara
- `{{personName}}` : Nama lengkap yang berulang tahun (contoh: *Zara Amelia Putri*).
- `{{personNickname}}` : Nama panggilan yang berulang tahun (contoh: *Zara*).
- `{{personAge}}` : Angka usia ulang tahun (contoh: *7*, *17*, *25*).
- `{{personPhotoUrl}}` : URL foto portrait yang berulang tahun (terhubung ke slot media).
- `{{fatherName}}` : Nama ayah (opsional, dibungkus `{{#if fatherName}}`).
- `{{motherName}}` : Nama ibu (opsional, dibungkus `{{#if motherName}}`).

### Waktu & Lokasi Acara
- `{{eventDateFormatted}}` : Tanggal acara yang diformat ramah lokal (contoh: *Sabtu, 15 Desember 2026*).
- `{{eventTime}}` : Jam pelaksanaan (contoh: *15:00 - 18:00 WITA*).
- `{{venueName}}` : Nama gedung / restoran / tempat acara (contoh: *The Sky Garden Cafe*).
- `{{venueAddress}}` : Alamat lengkap lokasi acara.
- `{{mapsUrl}}` : URL tautan Google Maps untuk navigasi tamu.

### Modul Dinamis Engine
- `{{countdownHtml}}` : Komponen hitung mundur interaktif.
- `{{gallerySectionHtml}}` : Grid galeri foto / video momen kenangan.
- `{{rsvpSectionHtml}}` : Form konfirmasi kehadiran tamu undangan.
- `{{wishesSectionHtml}}` : Papan doa & ucapan selamat interaktif.
- `{{giftSectionHtml}}` : Modul tanda kasih / amplop digital / rekening bank.
- `{{memoriesSectionHtml}}` : Modul Guest Memories (unggah foto live tamu).
- `{{musicPlayerHtml}}` : Pemutar musik latar mengambang otomatis.

---

## 3. Standar Kualitas Desain (Design Invariants)

1. **Zero Default OS Emojis:**
   - Dilarang keras menggunakan emoji OS (🎉, 🎂, 🎈, 🎁, 📍, dll).
   - Gunakan selalu SVG vector icons modern atau tipografi bersih.
2. **Dynamic CSS Tokens:**
   - Seluruh warna kanvas, aksen, kartu, dan gradien wajib bersumber dari token `:root`:
     - `--primary`, `--secondary`, `--accent`, `--bg-dark`, `--bg-light`, `--card-bg`, `--text-main`, `--text-muted`.
3. **Responsive Mobile-First (Max 480px Container):**
   - Tampilan mobile berada di tengah layar desktop dengan lebar maksimal 480px, memastikan estetika harmonis di layar ponsel maupun monitor lebar.
