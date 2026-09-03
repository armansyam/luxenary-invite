# S-Invitation: Luxenary Invite System Architecture & Master Specification

## 1. Executive Summary & Core Philosophy
**Luxenary Invite** adalah platform ekosistem undangan pernikahan digital modern berbasis Next.js 16 (App Router + Turbopack) yang menghadirkan pengalaman visual mewah (*haute couture*), kecepatan muat instan (<0.8 detik), self-service dashboard mandiri bagi klien, dan integrasi cloud edge caching.

---

## 2. Katalog & Arsitektur DOM Tema Aktual (15 Tema Fisik + 1 Blueprint)

Sistem template undangan menggunakan arsitektur HTML multi-layer mandiri dengan placeholder `{{variabel}}` yang diinjeksi oleh `lib/themeEngine.ts` dan dipetakan oleh `lib/renderTemplate.ts`:

### A. Premium Series (`themes/premium/`)
1. **Kalandra (`themes/premium/kalandra.html`)** *(Alias: `kila`, `premium-kila`)*
   - Desktop 50% split-screen hero photo dengan subtle bottom scrim (25%).
   - Full-bleed vertical photo slides 100vh untuk Pengantin Pria & Wanita.
   - Live Countdown, Google Calendar sync, dan floating glass dock.
2. **Valente (`themes/premium/valente.html`)** *(Alias: `ivanna`, `premium-ivanna`)*
   - Strict 100vh CSS Scroll Snap per seksi halaman penuh (`scroll-snap-type: y mandatory`).
   - Watermark monogram inisial tipografi *Bodoni Moda* raksasa.
   - Tata letak editorial majalah mode kelas atas (*haute couture*).
3. **Aurelia (`themes/premium/aurelia.html`)** *(Alias: `danila`)*
   - Kanvas video sutra bergerak (*Video Canvas Backdrop*) dengan fallback poster.
   - Partikel kelopak bunga melayang lembut (*ambient petals*).
   - Kartu kapsul kaca frosted glass asimetris (32px radius).
4. **Artisan (`themes/premium/artisan.html`)**
   - Estetika tipografi atelier kontemporer dengan palet monokromatik hangat.
   - Transisi foto asimetris dan galeri grid editorial dinamis.

### B. Traditional Series (`themes/traditional/`)
1. **Prameswari (`themes/traditional/prameswari.html`)** *(Alias: `heritage-aruna`, `aruna`)*
   - 3D Wax Seal Envelope opening modal dengan stempel lilin emas (`BUKA ✦`).
   - Portal kubah lengkung keraton (*Traditional Arch Portals*) berbingkai emas.
   - Tekstur kertas perkamen antik & ornamen klasik Nusantara.
2. **Badrika (`themes/traditional/badrika.html`)**
   - Nuansa wayang & ukiran kayu etnik dengan gradien emas tembaga.
3. **Candani (`themes/traditional/candani.html`)**
   - Ornamen batik klasik dan palet warna bumi (terracotta & sand).
4. **Dillalucky (`themes/traditional/dillalucky.html`)**
   - Motif floral tradisional yang anggun dengan sentuhan pastel sakral.
5. **Mayang (`themes/traditional/mayang.html`)**
   - Sentuhan janur & motif adat Melayu-Jawa dengan tipografi serif elegan.

### C. Modern Series (`themes/modern/`)
1. **Wave (`themes/modern/wave.html`)**
   - Kurva lengkung dinamis (*organic fluid waves*) dengan aksen gradasi halus.
2. **Papercut (`themes/modern/papercut.html`)**
   - Kertas karton kraft daur ulang fisik dengan jahitan garis putus-putus (*2px dashed stitch*).
   - Foto cetak polaroid miring ($-2^\circ$ dan $+2^\circ$) dengan aksen washi tape.
3. **Ameera (`themes/modern/ameera.html`)**
   - Tipografi minimalis modern dengan layout kartu bersih dan palet dusty rose.
4. **Chronicle (`themes/modern/chronicle.html`)**
   - Gaya jurnal editorial berita cinta dengan kolom teks tipografi Times-style.
5. **Lumina (`themes/modern/lumina.html`)**
   - Pencahayaan prisma lembut (*soft glow lens flares*) dengan layout ultra-modern.
6. **Solaria (`themes/modern/solaria.html`)**
   - Nuansa hangat terik matahari senja (*warm sunset aesthetics*) & kartu transparan.

### D. Developer Blueprint
- **Starter Blueprint (`themes/starter-blueprint.html`)**
  - Standar acuan struktur tag dan placeholder untuk desainer tema baru.

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

1. **Dual Storage Mode (Cloudflare R2 & Local):**
   - Ditentukan secara dinamis via environment variable `STORAGE_PROVIDER` (`r2`, `s3`, `local`).
   - Mode R2 menggunakan `@aws-sdk/client-s3` v3 untuk persistensi cloud berkecepatan tinggi.
   - Mode Local menyimpan file di `public/uploads/` untuk kemudahan development lokal.
2. **Optimasi Gambar Otomatis (`sharp`):**
   - Konversi otomatis ke WebP, kompresi cerdas, auto-rotate EXIF, dan sharpening mikro.
3. **Cloudflare Edge Caching & Wildcard Subdomain:**
   - Subdomain otomatis `*.luxenary.id` (contoh: `dimas-clarissa.luxenary.id`).
   - Cache statis dengan `Cache-Control: public, max-age=31536000, immutable`.
   - Beban server 0% dan loading instan di HP tamu.

---

## 6. Siklus Hidup Undangan & Mesin Retensi Otomatis (Cron Cleanup)

Siklus hidup undangan diatur secara otomatis oleh cron job (`POST /api/cron/cleanup`) yang dilindungi `CRON_SECRET`:

1. **Fase 1: Transisi Pasca Acara (H + `retention_invitation_grace_days`, default 7 hari)**:
   - Undangan utama ditutup, file HTML subdomain dihapus via `deleteSubdomainHtmlOnly`.
   - Status undangan diperbarui menjadi `EVENT_FINISHED`.
   - Data formulir RSVP dibersihkan otomatis untuk melindungi privasi.
   - Kunjungan ke URL subdomain/slug otomatis dialihkan (*redirect 307*) langsung ke **Galeri Momen Tamu (`/memories`)**.
2. **Fase 2: Retensi Galeri Momen (H + `retention_gallery_default_days` atau `galleryExpiresAt`)**:
   - Tamu dan pengantin dapat mengunduh seluruh koleksi foto kenangan dalam format ZIP via `streamMemoriesToZip`.
   - Klien dapat memperpanjang masa aktif galeri sebesar **+30 Hari** via pembayaran QRIS mandiri (`POST /api/client/memories/extend`).
   - Jika masa aktif habis dan tidak diperpanjang:
     - Seluruh foto kenangan tamu (`GuestMemory`) di R2 dan disk lokal dihapus permanen.
     - Upload foto dikunci permanen (`memoriesUploadLocked = true`).
     - Subdomain dilepaskan kembali ke pool umum (`subdomain = null`) agar dapat digunakan kembali oleh pasangan lain.
     - Status undangan menjadi `ARCHIVED`.
3. **Graceful Expired Page**:
   - Jika slug diakses saat undangan berstatus `ARCHIVED`, sistem memeriksa apakah salinan portofolio ada di `/portfolio/[slug]`.
   - Jika ada portofolio, otomatis dialihkan ke halaman portofolio.
   - Jika tidak ada, disajikan halaman penutupan elegan bernuansa gelap dengan branding `{platformName}` dinamis dan tombol kembali ke beranda utama (`/`).

---

## 7. Orkestrasi Multi-Payment Gateway & Dynamic Fee

Platform mendukung 5 payment gateway terintegrasi dengan pergantian instan 1-klik dari dashboard Admin (`active_payment_gateway`):

1. **Gateway Terintegrasi**:
   - **iPaymu** (QRIS, VA, E-Wallet)
   - **Duitku** (QRIS, VA, E-Wallet)
   - **Midtrans** (Snap QRIS, VA, GoPay)
   - **TriPay** (Closed Payment QRIS, VA)
   - **Xendit** (Invoice QRIS, VA, E-Wallet)
   - **Transfer Bank Manual** (Verifikasi struk transfer manual oleh Admin)
2. **Peralihan Gateway Bersih (*Cancel Before Re-Init*)**:
   - Order melacak `gatewayId` dan `gatewayTxId`.
   - Jika klien beralih gateway sebelum membayar, transaksi lama di-cancel pada gateway asal sebelum transaksi baru diinisialisasi.
3. **Perhitungan Fee Dinamis (Zero Hardcode)**:
   - Parameter `payment_fee_payer` (`BUYER` vs `MERCHANT`).
   - Parameter `payment_gateway_fee_percent` (misal `0.7%`).
   - Biaya layanan aplikasi dihitung dari harga dasar paket (`subtotal * feePercent / 100`) dan tidak pernah terduplikasi saat checkout dimuat ulang.
4. **Masa Berlaku Tagihan Dinamis**:
   - Durasi QRIS dibaca dari `payment_expiry_minutes` (default 60 menit).

---

## 8. Sistem Email Notifikasi & Kuitansi Pembayaran (`lib/mailer.ts`)

Sistem pengiriman email otomatis menggunakan **Nodemailer** yang membaca kredensial SMTP langsung dari tabel `admin_settings`:

1. **Konfigurasi SMTP Mandiri**:
   - `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`, `smtp_from_email`, `smtp_from_name`.
   - *Graceful non-blocking*: Jika SMTP belum dikonfigurasi, sistem mencatat log aman tanpa mengganggu transaksi pembayaran.
2. **Template Email Responsif & Mewah**:
   - Desain dark-luxury berkelas tinggi tanpa emoji default OS.
   - Branding dinamis mengikuti `{platformName}`.
   - Membedakan jenis invoice secara otomatis:
     - **Aktivasi Paket Undangan** (`NEW_INVITATION` / `UPGRADE`): Tombol CTA langsung menuju Studio Undangan.
     - **Perpanjangan Galeri Tamu** (`GALLERY_EXTENSION`): Penambahan masa aktif +30 hari dengan tombol CTA ke Galeri Momen.

---

## 9. Sistem Portofolio Mandiri & Custom Domain

1. **Portofolio Kloning Mandiri (`/portfolio`)**:
   - Fitur khusus Super Admin untuk mengkloning undangan pilihan menjadi file statis 100% mandiri di `public/portfolio/[slug].html`.
   - Semua aset gambar dikompresi WebP tajam dan disimpan terisolasi di `public/portfolio/assets/[slug]/`.
2. **Custom Domain Klien (`dimas-clarissa.com`)**:
   - Klien menghubungkan domain pribadi menggunakan CNAME ke server.
   - Middleware melakukan rewrite transparan berbasis `resolve-custom-domain`.
   - Keamanan terjamin tanpa kendala CORS karena semua request diteruskan secara *Same-Origin*.