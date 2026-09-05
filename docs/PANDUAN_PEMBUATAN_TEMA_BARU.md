# PANDUAN RESMI: PENGEMBANGAN TEMA BARU (THEME DEVELOPER GUIDE)
**Luxenary Invite Platform — Arsitektur Template Fisik HTML, Token Parser, & Standar Emas Desain**

Dokumen ini adalah panduan teknis bagi perancang tema (*Theme Designer / Developer*) untuk membangun tema undangan pernikahan digital baru yang 100% kompatibel dengan mesin render Luxenary Invite (`lib/renderTemplate.ts` & `lib/themeEngine.ts`).

---

## 1. Filosofi Arsitektur Tema: *Single File Component (HTML + CSS + JS)*

Platform Luxenary Invite menggunakan arsitektur **Tema Fisik Mandiri**:
- Setiap tema disimpan dalam 1 file `.html` utuh di direktori `themes/<series>/<nama-tema>.html` (contoh: `themes/premium/kalandra.html`, `themes/traditional/badrika.html`).
- Tidak memerlukan kompilasi JavaScript rumit di browser tamu; tema disajikan secara instan dengan performa *Core Web Vitals* maksimal.
- Seluruh aset font menggunakan font lokal mandiri (`/fonts/fonts.css`) berlatensi 0 ms.

---

## 2. Struktur Wajib & Susunan Seksi Undangan (Golden Standard)

Setiap tema wajib mengikuti struktur responsif dua panel (*Split-Screen Desktop Architecture*):
- **Layar Ponsel (< 900px):** Lebar 100% *Mobile-First View*.
- **Layar Desktop (≥ 900px):** Panel kiri berupa foto/video cover sinematik (`width: calc(100% - 460px)`), panel kanan berupa undangan kartu pernikahan (`width: 460px`).

### Urutan Standar 14 Seksi Undangan:
1. **Cover Gate (Pintu Pembuka):** Sampul awal berisi nama mempelai, nama tamu (`?to=...`), tombol audio unlock *"Buka Undangan"*, dan countdown.
2. **Hero Section:** Banner pembuka setelah sampul dibuka.
3. **Kutipan Doa / Ayat Suci (`{{openingQuote}}`):** Ar-Rum / Matius / Sansekerta dengan sumber referensi.
4. **Profil Kedua Mempelai (`{{groomName}}` & `{{brideName}}`):** Foto, nama lengkap, nama orang tua, dan tautan Instagram.
5. **Jadwal & Lokasi Acara:** Akad / Pemberkatan dan Resepsi, tombol *"Simpan ke Kalender"* dan *"Buka Peta Navigasi"*.
6. **Hitung Mundur Waktu Nyata (*Live Countdown*):** Hari, jam, menit, detik menuju hari-H.
7. **Kisah Perjalanan Cinta (*Love Story Timeline*):** Momen pertama jumpa, jadian, lamaran, hingga pelaminan.
8. **Galeri Foto Pre-Wedding & Video Teaser:** Album foto interaktif dengan efek lightbox.
9. **Siaran Langsung Acara (*Live Streaming*):** Tautan YouTube Live / Zoom untuk tamu jarak jauh.
10. **Tanda Kasih Digital (*Digital Envelope & Gift*):** Salin nomor rekening bank/e-wallet 1-klik dan konfirmasi kado fisik.
11. **Buku Tamu & RSVP Interaktif:** Formulir kehadiran publik langsung ke database.
12. **Buku Doa & Ucapan Tamu (*Wishes Feed*):** Daftar ucapan selamat dari tamu dengan lencana respon pengantin.
13. **Live Memories (Foto Kenangan Tamu):** Momen candid hari-H yang dapat diunggah oleh tamu di venue.
14. **Penutup & Watermark Platform:** Doa penutup dan floating credit `LUXENARY`.

---

## 3. Kamus Token Placeholder Template

Mesin render [lib/renderTemplate.ts](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/renderTemplate.ts) secara otomatis menggantikan placeholder `{{token}}` dengan data riil dari database:

### A. Token Mempelai & Profil
- `{{groomName}}`: Nama lengkap mempelai pria.
- `{{groomNickname}}`: Nama panggilan mempelai pria.
- `{{groomParents}}`: Nama ayah & ibu mempelai pria.
- `{{groomInstagram}}`: Username / URL Instagram pria.
- `{{brideName}}`: Nama lengkap mempelai wanita.
- `{{brideNickname}}`: Nama panggilan mempelai wanita.
- `{{brideParents}}`: Nama ayah & ibu mempelai wanita.
- `{{brideInstagram}}`: Username / URL Instagram wanita.

### B. Token Acara & Teks
- `{{eventDateFormatted}}`: Tanggal acara utama (contoh: "Sabtu, 28 November 2026").
- `{{eventTimeFormatted}}`: Jam acara (contoh: "08:00 - Selesai WIB").
- `{{eventLocation}}`: Nama gedung / venue pernikahan.
- `{{eventAddress}}`: Alamat lengkap lokasi acara.
- `{{mapsUrl}}`: Tautan ke Google Maps.
- `{{openingQuote}}`: Teks kutipan doa atau ayat suci.
- `{{openingQuoteRef}}`: Sumber rujukan ayat (contoh: "QS. Ar-Rum: 21").

### C. Token Media & Warna Dinamis
- `{{landingCoverUrl}}`: URL foto/video pembuka sampul depan.
- `{{homePhotoUrl}}`: URL foto pembuka hero setelah sampul dibuka.
- `{{groomPhotoUrl}}`: URL foto mempelai pria.
- `{{bridePhotoUrl}}`: URL foto mempelai wanita.
- `{{sidebarPhotoUrl}}`: URL foto wallpaper desktop panel kiri.
- `{{musicUrl}}`: URL file audio musik latar pengantin.
- `{{colorPrimary}}`: Kode warna dominan (contoh: `#D4AF37` atau `#8A624A`).
- `{{colorSecondary}}`: Kode warna sekunder tema.
- `{{colorAccent}}`: Kode warna aksen ornamen.

### D. Token Interaksi & Tamu
- `{{guestName}}`: Nama tamu yang sedang membuka undangan (dari `?to=...`).
- `{{invitationId}}`: UUID unik undangan untuk pengiriman form RSVP & Upload foto.
- `{{subdomain}}`: Nama subdomain aktif undangan.

---

## 4. Panduan Audio Controller (Kepatuhan Kebijakan Browser)

Seluruh browser modern (Chrome, Safari, iOS) memblokir audio yang berputar otomatis (*Autoplay Policy*). Setiap tema wajib mengimplementasikan mekanisme:
1. Audio dalam keadaan `paused` saat undangan baru pertama kali dimuat.
2. Ketika tamu menekan tombol **"Buka Undangan"** (*User Gesture*), jalankan pemutaran audio dengan fungsi resmi:
```javascript
function openInvitation() {
  // Buka sampul cover
  document.getElementById('coverGate').classList.add('opened');
  
  // Putar musik latar
  const audio = document.getElementById('bgAudio');
  if (audio) {
    audio.play().catch(e => console.log('Audio autoplay prevented:', e));
  }
}
```
3. Sediakan tombol melayang (*floating music disc*) untuk mematikan/menyalakan musik sewaktu-waktu.

---

## 5. Cara Registrasi Tema Baru ke Sistem

1. Buat file HTML baru di dalam folder tema yang sesuai:
   - `themes/premium/<nama-tema>.html`
   - `themes/traditional/<nama-tema>.html`
   - `themes/modern/<nama-tema>.html`
2. Daftarkan mapping tema di [lib/renderTemplate.ts](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/renderTemplate.ts) pada objek `THEME_MAP`:
   ```typescript
   "nama-tema": { file: "nama-tema.html", folder: "premium" },
   ```
3. Buka browser dan login ke **Admin Dashboard** (`/admin`).
4. Masuk ke menu **Themes**, lalu klik tombol **"Sinkronisasi Tema (Scan Disk)"**.
5. Tema baru Anda akan langsung muncul di katalog resmi, siap diuji coba di demo publik (`/demo/nama-tema`), dan dapat dipilih oleh seluruh calon pengantin.
