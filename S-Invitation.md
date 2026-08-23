# S-Invitation: Luxenary Invite System Architecture & Master Specification

## 1. Executive Summary & Core Philosophy
**Luxenary Invite** adalah platform ekosistem undangan pernikahan digital modern berbasis Next.js 16 (App Router + Turbopack) yang menghadirkan pengalaman visual mewah (*haute couture*), kecepatan muat instan (<0.8 detik), self-service dashboard mandiri bagi klien, dan integrasi cloud edge caching.

---

## 2. The 5 Distinct Theme DOM Architectures (`/themes`)

Setiap tema dibangun dengan struktur multi-layer mandiri dan placeholder `{{variabel}}` yang diisi secara dinamis oleh `lib/themeEngine.ts`:

1. **Kila (`themes/kila.html`) — *Modern Parallax & Split-Screen***
   - Desktop 50% split-screen hero photo dengan subtle bottom scrim (25%).
   - Full-bleed vertical photo slides 100vh untuk Pria & Wanita.
   - Live Countdown, Google Calendar sync, dan floating glass dock.

2. **Aruna (`themes/aruna.html`) — *Heritage Royal Keraton***
   - 3D Wax Seal Envelope opening modal dengan tombol stempel lilin emas (`BUKA ✦`).
   - Portal kubah lengkung keraton (*Traditional Arch Portals*) berbingkai emas.
   - Tekstur kertas perkamen antik & ornamen klasik Nusantara.

3. **Ivanna (`themes/ivanna.html`) — *High-Fashion Editorial Snap***
   - Strict 100vh CSS Scroll Snap per seksi halaman penuh (`scroll-snap-type: y mandatory`).
   - Watermark monogram inisial tipografi *Bodoni Moda* raksasa.
   - Tata letak editorial majalah mode kelas atas.

4. **Danila (`themes/danila.html`) — *Cinematic Silk & Rose Gold***
   - Kanvas video sutra bergerak (*Video Canvas Backdrop*) dengan fallback poster.
   - Partikel kelopak bunga mawar melayang lembut (*ambient petals*).
   - Kartu kapsul kaca frosted glass asimetris (32px radius).

5. **Papercut (`themes/papercut.html`) — *Handcrafted Scrapbook & Polaroid***
   - Kertas karton kraft daur ulang fisik dengan jahitan garis putus-putus (*2px dashed stitch*).
   - Foto cetak polaroid miring ($-2^\circ$ dan $+2^\circ$) dengan aksen selotip washi tape.
   - Batasan responsif aman mobile (`max-width: 280px`) tanpa goyang horizontal.

---

## 3. Studio Editor & Dynamic Multi-Event Architecture

Sistem Studio Editor Klien (`/dashboard/invitation/[id]`) menyediakan kendali kreatif tanpa batas (*100% Dynamic & Modular*):

1. **Multi-Event Dynamic Builder**:
   - Bebas menambah/menghapus sesi acara adat tanpa batasan (*Akad Nikah, Resepsi, Mappacci / Korontigi, Mapparola, Mappasili, Pemberkatan, Pengajian/Syukuran*).
   - Setiap sesi memiliki tanggal, waktu (WITA/WIB/WIT), gedung/lokasi, alamat, tautan Google Maps mandiri, label badge, dan catatan sesi.
2. **Dynamic Love Story & Bank Accounts**:
   - Menambah babak perjalanan cinta bertahap.
   - Menambah multiple rekening bank transfer dan upload barcode QRIS Digital Angpao.
3. **Seksi Opsional Elegan**:
   - **Turut Mengundang**: Daftar nama tetua keluarga besar / tokoh adat (1 baris per nama).
   - **Himbauan Acara**: Catatan kenyamanan tamu, parkir, dan ketepatan waktu.
   - **Pesan Khusus**: Puisi dan ucapan terima kasih mendalam.
   - **Wedding Filter & Live Streaming**: Tautan Instagram Filter AR dan siaran YouTube/IG/Zoom Live.
4. **Saklar Tampil/Sembunyikan (*Section Toggles*)**:
   - Klien dapat mengaktifkan/menonaktifkan seksi (*Love Story, Galeri Foto, Amplop Digital, Dresscode, Mode Tanpa Foto*) secara instan.
5. **Video Teaser Player Pre-Wedding**:
   - Mendukung tautan YouTube (Unlisted/Public), Vimeo, atau direct MP4 yang otomatis dirender sebagai pemutar video responsif 16:9 di bagian atas galeri.

---

## 4. Showroom Catalog with Browser Mockups (`/demo`)

- Grid e-commerce 4 kolom responsif.
- Setiap kartu memiliki **Jendela Mockup Browser** dengan *traffic light dots* (🔴 🟡 🟢) dan live scaled iframe.
- Label promo `NEW`, `50%`, dan tombol aksi kembar (`PREVIEW` & `PILIH TEMA`).
- Filter kategori: Semua Tema, Premium Series, Heritage Series, Moody Series.

---

## 5. Media Pipeline & Cloudflare Edge Caching

1. **Auto-Compressed Video:**
   - Format H.264 Web / WebM ukuran 1 MB – 3 MB.
   - `qt-faststart` moov atom relocation untuk instant playback.
   - Auto-ekstraksi thumbnail poster fallback.
2. **Cloudflare Edge Caching & Wildcard Subdomain:**
   - Subdomain otomatis `*.luxenary.id` (contoh: `didan-nasha.luxenary.id`).
   - Cache statis dengan `Cache-Control: public, max-age=31536000, immutable`.
   - Beban server 0% dan loading instan di HP tamu.