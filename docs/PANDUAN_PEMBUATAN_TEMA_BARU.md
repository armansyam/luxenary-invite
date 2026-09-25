# PANDUAN RESMI: PENGEMBANGAN TEMA BARU (THEME DEVELOPER GUIDE)
**Luxenary Invite Platform — Arsitektur Template Fisik HTML, Token Parser, & Standar Emas Desain Multi-Event**

Dokumen ini adalah panduan teknis bagi perancang tema (*Theme Designer / Developer*) untuk membangun tema undangan digital baru lintas jenis acara (*Wedding, Birthday, Khitan, Aqiqah, Wisuda, Gathering*) yang 100% kompatibel dengan mesin render Luxenary Invite (`lib/renderTemplate.ts` & `lib/themeEngine.ts`).

---

## 1. Filosofi Arsitektur Tema: *Single File Component (HTML + CSS + JS)*

Platform Luxenary Invite menggunakan arsitektur **Tema Fisik Mandiri Berjenjang (Two-Tier Event Hierarchy)**:
- Setiap tema disimpan dalam 1 file `.html` utuh di direktori `themes/{eventType}/{style}/{nama-tema}.html`.
  * Contoh Wedding: `themes/wedding/minimalist/kalandra.html`, `themes/wedding/traditional/bugis.html`, `themes/wedding/modern/monochrome.html`
  * Contoh Birthday: `themes/birthday/modern/aurora-birthday.html`, `themes/birthday/minimalist/sweet-sixteen.html`
  * Contoh Khitan: `themes/khitan/traditional/al-fatih-khitan.html`
  * Contoh Aqiqah: `themes/aqiqah/minimalist/barakah-aqiqah.html`
  * Contoh Wisuda: `themes/wisuda/modern/adarma-wisuda.html`
  * Contoh Gathering: `themes/general/modern/harmony-gathering.html`
- Tidak memerlukan kompilasi JavaScript rumit di browser tamu; tema disajikan secara instan dengan performa *Core Web Vitals* maksimal.
- Seluruh aset font menggunakan font lokal mandiri (`/fonts/fonts.css`) berlatensi 0 ms.
- **Starter Blueprints Resmi:** Pengembang tema baru disarankan mengkloning kerangka resmi dari direktori `themes/_blueprints/{eventType}/` yang telah memiliki sanitasi XSS, responsive split-screen, dan audio handler standar.

---

## 2. Struktur Wajib & Susunan Seksi Undangan (Golden Standard)

Setiap tema wajib mengikuti struktur responsif dua panel (*Split-Screen Desktop Architecture*):
- **Layar Ponsel (< 900px):** Lebar 100% *Mobile-First View*.
- **Layar Desktop (≥ 900px):** Panel kiri berupa foto/video cover sinematik (`width: calc(100% - 460px)`), panel kanan berupa kartu undangan interaktif (`width: 460px`).

### Urutan Standar 14 Seksi Undangan:
1. **Cover Gate (Pintu Pembuka):** Sampul awal berisi nama penyelenggara/mempelai, nama tamu (`?to=...`), tombol audio unlock *"Buka Undangan"*, dan countdown.
2. **Hero Section:** Banner pembuka setelah sampul dibuka.
3. **Kutipan Doa / Ayat Suci (`{{openingQuote}}`):** Ar-Rum / Al-Hujurat / Matius / Sansekerta / Quotes inspiratif dengan sumber referensi.
4. **Profil Tokoh / Penyelenggara:**
   - Pernikahan: `{{groomName}}` & `{{brideName}}`, nama orang tua, dan Instagram.
   - Non-Pernikahan: `{{personName}}` / `{{personNickname}}`, `{{fatherName}}`, `{{motherName}}`, `{{degree}}`, atau `{{organizer}}`.
5. **Jadwal & Lokasi Acara:** Sesi Utama & Resepsi/Syukuran, tombol *"Simpan ke Kalender"* dan *"Buka Peta Navigasi"*.
6. **Hitung Mundur Waktu Nyata (*Live Countdown*):** Hari, jam, menit, detik menuju hari-H.
7. **Perjalanan / Kilas Balik (*Story / Milestone Timeline*):** Kisah cinta, perjalanan masa kecil, jejak studi, atau riwayat komunitas.
8. **Galeri Foto & Video Teaser:** Album foto interaktif dengan efek lightbox.
9. **Siaran Langsung Acara (*Live Streaming*):** Tautan YouTube Live / Zoom untuk kerabat jarak jauh.
10. **Tanda Kasih Digital (*Digital Envelope & Gift*):** Salin nomor rekening bank/e-wallet 1-klik dan konfirmasi kado fisik.
11. **Buku Tamu & RSVP Interaktif:** Formulir kehadiran publik langsung ke database.
12. **Buku Doa & Ucapan Tamu (*Wishes Feed*):** Daftar ucapan selamat dari tamu dengan lencana respon tuan rumah.
13. **Live Memories (Foto Kenangan Tamu):** Momen candid hari-H yang dapat diunggah oleh tamu di venue.
14. **Penutup & Watermark Platform:** Doa penutup dan floating credit `LUXENARY`.

---

## 3. Kamus Token Placeholder Template

Mesin render [lib/renderTemplate.ts](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/renderTemplate.ts) secara otomatis menggantikan placeholder `{{token}}` dengan data riil dari database:

### A. Token Profil Pernikahan (Wedding)
- `{{groomName}}`: Nama lengkap mempelai pria.
- `{{groomNickname}}`: Nama panggilan mempelai pria.
- `{{groomParents}}`: Nama ayah & ibu mempelai pria.
- `{{groomInstagram}}`: Username / URL Instagram pria.
- `{{brideName}}`: Nama lengkap mempelai wanita.
- `{{brideNickname}}`: Nama panggilan mempelai wanita.
- `{{brideParents}}`: Nama ayah & ibu mempelai wanita.
- `{{brideInstagram}}`: Username / URL Instagram wanita.

### B. Token Profil Non-Pernikahan (Birthday, Khitan, Aqiqah, Wisuda, Gathering)
- `{{personName}}`: Nama lengkap yang berulang tahun / anak yang dikhitan / bayi aqiqah / wisudawan.
- `{{personNickname}}`: Nama panggilan persona utama.
- `{{personAge}}`: Usia / tahun kelahiran (khusus Birthday / Milad).
- `{{fatherName}}` & `{{motherName}}`: Nama orang tua (khusus Khitan, Aqiqah, & Birthday).
- `{{degree}}`, `{{major}}`, `{{institution}}`: Gelar akademik, program studi, dan kampus/universitas (khusus Wisuda).
- `{{eventTitle}}`, `{{eventSubtitle}}`, `{{organizer}}`: Judul acara, tema tema turunan, dan nama institusi/komunitas penyelenggara (khusus Gathering/Umum).

### C. Token Acara & Teks
- `{{eventDateFormatted}}`: Tanggal acara utama (contoh: "Sabtu, 28 November 2026").
- `{{eventTimeFormatted}}`: Jam acara (contoh: "08:00 - Selesai WIB").
- `{{eventLocation}}`: Nama gedung / venue / tempat acara.
- `{{eventAddress}}`: Alamat lengkap lokasi acara.
- `{{mapsUrl}}`: Tautan ke Google Maps.
- `{{openingQuote}}`: Teks kutipan doa atau kata mutiara.
- `{{openingQuoteRef}}`: Sumber rujukan ayat/kutipan.

### D. Token Media
- `{{landingCoverUrl}}`: URL foto/video pembuka sampul depan.
- `{{homePhotoUrl}}`: URL foto pembuka hero setelah sampul dibuka.
- `{{groomPhotoUrl}}` / `{{personPhotoUrl}}`: URL foto profil utama.
- `{{bridePhotoUrl}}`: URL foto mempelai wanita.
- `{{sidebarPhotoUrl}}`: URL foto wallpaper desktop panel kiri.
- `{{musicUrl}}`: URL file audio musik latar pengantin/penyelenggara.

> ⚠️ **CATATAN ARSITEKTUR WARNA:** Token `{{colorPrimary}}`, `{{colorSecondary}}`, dan `{{colorAccent}}` **sudah dihapus permanen** dari engine. Engine TIDAK LAGI menginjeksi warna secara ad-hoc ke tema. Setiap tema WAJIB mendefinisikan palet identitasnya sendiri di dalam blok `:root { }` HTML master tema dengan CSS custom properties (`--primary`, `--accent`, `--bg-dark`, dll).

### E. Token Interaksi & Tamu
- `{{guestName}}`: Nama tamu yang sedang membuka undangan (dari parameter `?to=...`).
- `{{invitationId}}`: UUID unik undangan untuk form RSVP & live memories.
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

1. Buat file HTML baru di dalam folder tema yang sesuai dengan jenis acara dan gayanya:
   - `themes/wedding/minimalist/<nama-tema>.html`
   - `themes/wedding/traditional/<nama-tema>.html`
   - `themes/wedding/modern/<nama-tema>.html`
   - `themes/birthday/modern/<nama-tema>.html`
   - `themes/khitan/traditional/<nama-tema>.html`
   - `themes/aqiqah/minimalist/<nama-tema>.html`
   - `themes/wisuda/modern/<nama-tema>.html`
   - `themes/general/modern/<nama-tema>.html`
2. Daftarkan mapping tema di [lib/renderTemplate.ts](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/renderTemplate.ts) pada objek `THEME_MAP`:
   ```typescript
   "nama-tema": { file: "nama-tema.html", eventType: "wedding", style: "minimalist" },
   ```
3. Buka browser dan login ke **Admin Dashboard** (`/admin`) -> **Themes**, lalu klik tombol **"Sinkronisasi Tema (Scan Disk)"** (atau jalankan `npm run themes:sync` dari terminal).
4. Tema baru Anda akan langsung terdaftar di PostgreSQL tabel `themes`, terkompilasi ke demo statis (`/demo/nama-tema`), dan siap digunakan oleh klien sesuai jenis acara mereka.

