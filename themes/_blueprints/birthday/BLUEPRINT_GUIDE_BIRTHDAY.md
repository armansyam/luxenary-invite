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
| **Struktur Folder** | `themes/wedding/<style>/<id>.html` | `themes/<jenis>/<style>/<id>.html` |
| **Dipakai oleh** | Pernikahan saja | Semua jenis acara non-pernikahan |

---

## 2. Kontrak Placeholder Satu Nama

Tema satu nama dipakai oleh semua jenis acara non-pernikahan (ulang tahun, khitan, aqiqah, wisuda, acara umum),
sesuai `isThemeCompatible` di `lib/invitationUtils.ts`. Karena itu template **hanya boleh** memakai kunci di bawah ini
(diisi oleh `applySingleNameContract` di `lib/themeEngine.ts`). Kunci khusus satu jenis acara seperti `personAge`,
`graduateMajor`, atau `eventTitle` dilarang: kunci itu kosong bila tema dipakai jenis acara lain. Tes
`__tests__/integration/themePlaceholders.test.ts` memeriksa setiap tema dan blueprint terhadap kelima jenis acara.

### Tokoh Utama
- `{{eventLabel}}` : Nama jenis acara (contoh: *Perayaan Ulang Tahun*, *Walimatul Khitan*, *Undangan Resmi*).
- `{{eventIntro}}` : Kalimat pembuka pendek sesuai jenis acara.
- `{{mainName}}` : Nama lengkap tokoh utama, atau judul acara untuk acara umum.
- `{{mainNickname}}` : Nama panggilan (acara umum: sama dengan judul).
- `{{mainPhotoUrl}}` : Foto tokoh utama / logo acara.
- `{{mainInfoLine}}` : Baris info utama (contoh: *Ulang Tahun ke-17*, gelar wisuda, subjudul acara). Bisa kosong, bungkus dengan `{{#if mainInfoLine}}`.
- `{{mainDetailLine}}` : Baris rincian (contoh: jurusan dan kampus, penyelenggara acara). Bisa kosong.
- `{{parentsHtml}}` : Nama orang tua dalam HTML siap pakai. Kosong bila orang tua tidak diisi dan selalu kosong untuk acara umum.
- `{{openingQuote}}` / `{{openingQuoteRef}}` : Kutipan pembuka dan sumbernya. Baris baru dari klien dirender sebagai `<br />`.

### Waktu & Lokasi Acara (jadwal utama / hari tamu datang)
- `{{eventDateFormatted}}`, `{{eventTime}}`, `{{venueName}}`, `{{venueAddress}}`, `{{mapsUrl}}`.
- `{{eventSectionHtml}}` : Kartu seluruh rangkaian acara. Utamakan ini daripada menyusun kartu sendiri.

### Modul Dinamis Engine
- `{{countdownHtml}}` : Hitung mundur ke jadwal utama (kosong bila tanggal belum diisi).
- `{{qrPassHtml}}` : Kartu QR check-in tamu (`section#checkin`), hanya untuk paket dengan fitur QR.
- `{{gallerySectionHtml}}` : Galeri (`section#gallery`).
- `{{giftSectionHtml}}` : Amplop digital / kado (`section#gift`).
- `{{rsvpSectionHtml}}` + `{{wishesSectionHtml}}` : Bungkus dengan `<section id="rsvp">` atau `id="wishes"` sesuai tautan dock.
- `{{extraSectionsHtml}}` : Dress code, siaran langsung, bingkai foto, turut mengundang, vendor (sesuai pengaturan studio).
- `{{memoriesSectionHtml}}` : Ajakan Kamera Momen tamu, hanya untuk paket dengan fitur Momen.
- `{{musicPlayerHtml}}` : Pemutar musik (`audio#luxAudioPlayer` + tombol `#musicFab`). Letakkan sebelum `</body>`; musik diputar oleh runtime saat `openInvitation()`, jangan memutar audio sendiri.
- `{{brandWatermarkHtml}}` : Watermark platform di footer.

Tautan dock yang menunjuk ke `#id` yang tidak ada di halaman disembunyikan otomatis oleh runtime.

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
