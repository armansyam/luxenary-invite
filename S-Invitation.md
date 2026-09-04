# S-Invitation: Luxenary Invite System Architecture & Master Specification

## 1. Executive Summary & Core Philosophy
**Luxenary Invite** adalah platform ekosistem undangan pernikahan digital modern berbasis Next.js 16 (App Router + Turbopack) yang menghadirkan pengalaman visual mewah (*haute couture*), kecepatan muat instan (<0.8 detik), self-service dashboard mandiri bagi klien, dan integrasi cloud edge caching.

---

## 2. Katalog & Arsitektur DOM Tema Aktual (15 Tema Fisik + 1 Blueprint)

Sistem template undangan menggunakan arsitektur HTML multi-layer mandiri dengan placeholder `{{variabel}}` yang diinjeksi oleh `lib/themeEngine.ts` dan dipetakan oleh `lib/renderTemplate.ts`:

### A. Premium Series (`themes/premium/`)
1. **Kalandra (`themes/premium/kalandra.html`)** *(Legacy Alias: `kila`)*
   - Desktop 50% split-screen hero photo dengan subtle bottom scrim (25%).
   - Full-bleed vertical photo slides 100vh untuk Pengantin Pria & Wanita.
   - Live Countdown, Google Calendar sync, dan floating glass dock.
2. **Valente (`themes/premium/valente.html`)**
   - Strict 100vh CSS Scroll Snap per seksi halaman penuh (`scroll-snap-type: y mandatory`).
   - Watermark monogram inisial tipografi *Bodoni Moda* raksasa.
   - Tata letak editorial majalah mode kelas atas (*haute couture*).
3. **Aurelia (`themes/premium/aurelia.html`)**
   - Kanvas video sutra bergerak (*Video Canvas Backdrop*) dengan fallback poster.
   - Partikel kelopak bunga melayang lembut (*ambient petals*).
   - Kartu kapsul kaca frosted glass asimetris (32px radius).
4. **Artisan (`themes/premium/artisan.html`)**
   - Estetika tipografi atelier kontemporer dengan palet monokromatik hangat.
   - Transisi foto asimetris dan galeri grid editorial dinamis.

### B. Traditional Series (`themes/traditional/`)
1. **Prameswari (`themes/traditional/prameswari.html`)**
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
4. **Pemisahan Desain & Operasional Galeri Kenangan Tamu**:
   - **Formulir Studio Editor (`/dashboard/invitation/[id]` Seksi 14):** Khusus styling & konfigurasi teks seksi (Toggle aktif, judul seksi, eyebrow, subjudul/deskripsi ajakan berbagi momen).
   - **Dashboard Klien (`/dashboard` Seksi 5 & Card 4):** Pusat operasional & monitoring momen tamu yang menyajikan tautan publik album kenangan, widget unduh arsip ZIP client-side, info retensi/perpanjangan masa simpan +30 hari via QRIS, dan monitoring/moderasi foto masuk secara real-time.
5. **Manajemen Domain Undangan & Proteksi Status Draft (Buku Tamu / WhatsApp Broadcast)**:
   - **Resolusi Hierarkis Domain (`resolveEffectiveInvitationUrl`):** Sistem otomatis mendeteksi dan memprioritaskan domain tautan undangan dengan urutan jujur: (1) Custom Domain Klien (`customDomain`), (2) Subdomain Platform (`subdomain`). Menghilangkan total tebakan slug palsu/halusinasi saat domain belum disetel.
   - **Proteksi Pengiriman Draft:** Jika undangan masih berstatus `DRAFT`, tombol Salin tautan dan tombol Kirim WhatsApp dikunci secara disabled dengan cursor `not-allowed` serta dilengkapi *floating hover tooltip* gelap elegan. Aksi baru terbuka setelah undangan dipublikasikan di Pengaturan.
6. **Studio Editor — Seksi 15 (Pengaturan Teks UI & Label) & Netralisasi Live Editor:**
   - **Seksi 15 (`SEC15`):** Menyediakan kontrol formulir untuk kustomisasi teks tombol RSVP (`customLabels.rsvpBtnText`), form RSVP, tombol buka undangan, dan label hitung mundur.
   - **Live Editor Engine:** Saat mode edit aktif (`isEditMode`), seluruh form submission dinonaktifkan (`form.noValidate = true`, `preventDefault`) dan tombol submit dinetralkan ke `type="button"` sehingga pengguna dapat mengklik dan mengetik langsung teks tombol RSVP tanpa memicu balon validasi *"Please fill out this field"*.

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
5. **Kebijakan Tagihan Tunggal & Proteksi Tagihan Usang (*Superseded Guard*)**:
   - Pola *Single Active Order*: Klien yang mengganti paket atau mengulang transaksi sebelum lunas otomatis me-reuse/meng-update order yang ada (`PENDING` atau `FAILED`) sehingga zero order duplikat di database.
   - *Superseded Redirection*: Akses ke link order lama (`?order=OLD_ID`) otomatis di-redirect oleh kasir ke order aktif terbaru (`?order=NEW_ID`). Upload ke order usang diblokir keras oleh API backend.
6. **Transfer Bank Manual & Cloudflare R2 Edge CDN Delivery**:
   - Struk bukti transfer manual diunggah ke storage Cloudflare R2 dan disajikan instan via Custom Domain Edge CDN (`https://cdn.luxvite.id`) dengan HTTP/2 (<200ms latency).
   - *Persistent Rejection Warning Card*: Jika admin menolak transfer di `/admin`, kasir klien menampilkan kartu peringatan permanen dengan alasan penolakan spesifik dari admin yang tidak hilang saat di-refresh.
7. **Visibilitas Riwayat Transaksi Ditolak di Portal Admin**:
   - Subtab **"Gagal / Dibatalkan"** di portal `/admin` menampilkan seluruh order berstatus `FAILED` dan `EXPIRED` lengkap dengan badge merah *"Ditolak"* dan rincian alasan penolakan pada kolom Aksi.
   - Endpoint overview admin (`/api/admin/overview`) mengembalikan daftar transaksi mutakhir tanpa mengecualikan order yang gagal.
8. **Pembersihan Otomatis Bukti & Order Usang (*Auto-Purge Storage & Obsolete Orders*)**:
   - Sistem menerapkan arsitektur *Single State* di mana order non-PAID usang otomatis dibersihkan saat klien mengunggah bukti baru, mengganti paket, atau saat transaksi dinyatakan lunas (`PAID`).
   - File foto bukti transfer lama dimusnahkan permanen dari Cloudflare R2 bucket (`deleteFile`) untuk menghemat storage, dan record order lama dihapus dari database PostgreSQL.
   - Klien yang sudah berstatus `PAID` dicegat dari halaman checkout dan dialihkan langsung ke dashboard undangan.
9. **Inline Action Confirmation (Zero Mouse Travel)**:
   - Tombol verifikasi konfirmasi lunas di portal `/admin` menerapkan *in-place micro-interaction* bebas dari popup browser `confirm()` dan `alert()`.
   - Tombol bertransisi halus di tempat menjadi `[Ya, Lunas]` dan `[Batal]` dengan auto-revert 5 detik.

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

## 9. Sistem Portofolio Mandiri & Custom Domain (SaaS Workflow)

1. **Portofolio Kloning Mandiri (`/portfolio`)**:
   - Fitur khusus Super Admin untuk mengkloning undangan pilihan menjadi file statis 100% mandiri di `public/portfolio/[slug].html`.
   - Semua aset gambar dikompresi WebP tajam dan disimpan terisolasi di `public/portfolio/assets/[slug]/`.
2. **Custom Domain Klien (`dimas-clarissa.com`)**:
   - **SaaS Add-on Workflow**: Custom domain merupakan layanan jasa berbayar terpisah dari paket undangan (orderType: `CUSTOM_DOMAIN_ADDON`).
   - Klien memesan & menginput domain pilihan mereka via Dashboard (Settings) lalu membayar melalui Payment Gateway.
   - Setelah lunas (PAID), sistem memperpanjang otomatis masa aktif galeri selama 1 Tahun.
   - Admin memantau order melalui **Tab Custom Domain** di Dashboard Admin dan menghubungkannya (konfigurasi SSL & proxy) di Nginx.
   - Middleware melakukan rewrite transparan berbasis `resolve-custom-domain` untuk merender undangan.
   - Keamanan terjamin tanpa kendala CORS karena semua request diteruskan secara *Same-Origin*.

---

## 10. Modul Manajemen Tema Admin & Auto-Compile Demo (`docs/admin/MANAJEMEN_TEMA_ADMIN.md`)

1. **Tambah Tema Baru via UI Admin**:
   - Admin mengisi metadata dan mengunggah master file `.html` template langsung melalui modal.
   - Backend meletakkan file ke `themes/{kategori}/{id}.html`, mendaftarkannya ke database, dan langsung mengeksekusi `compileAndSaveStaticDemo(id)`.
   - File HTML demo statis langsung tercipta di `public/demo/{id}/index.html` dan siap diuji di katalog `/demo`.
2. **Sinkronisasi Otomatis & Anti-Zombie**:
   - Tombol *Sinkronisasi Tema & Cache* (`POST /api/admin/themes/sync`) memindai direktori fisik `themes/` dan otomatis menghapus record tema usang (*auto-purge*) yang tidak lagi memiliki file fisik master.
   - Menjamin prinsip *Single Source of Truth* terjaga 100%.
## 11. Filosofi Integritas UI Admin & Perlindungan Hak Klien
Dalam pengelolaan Klien dan Undangan di Dashboard Admin (`app/(admin)/admin/page.tsx`), prinsip **Anti-Overreach** (anti-intervensi berlebih) ditegakkan secara ketat untuk mencegah manipulasi data yang membingungkan klien dan merusak metrik sistem:
1. **Pencegahan URL Halusinasi:** Jika klien belum mengatur subdomain di dashboard mereka (status DRAFT), Admin akan jujur menampilkan indikator `[Belum Setup]`. Tidak ada rakitan URL tebakan dari `groomSlug` dan `brideSlug`.
2. **Kunci Hak Desain Klien:** Dropdown "Ganti Tema" tidak tersedia bagi Admin. Pilihan tema adalah hak absolut klien selama status belum dipublish, mencegah Admin merusak layout secara tidak sengaja.
3. **Pemberantasan Tombol *Backdoor* Gratisan:** Seluruh perpanjangan (*Gallery Extension*) wajib melalui jalur *Payment Gateway* yang sah. Tombol `+30H Galeri` ditiadakan dari UI Admin untuk melindungi integritas laporan keuangan (*Revenue Report*).
4. **Logika Fitur Kunci Darurat:** Opsi `Buka Kunci Darurat` hanya muncul jika sistem secara objektif mendeteksi undangan telah terkunci permanen. Jika status masih `DRAFT` atau "Bisa Diedit", tombol tersebut secara otomatis disembunyikan.
5. **Kalkulasi Kedaluwarsa Dinamis (On-The-Fly):** Nilai `expiresAt` akan tetap `null` di database sampai benar-benar di-hardcode. Untuk tampilan UI Admin, masa aktif dihitung dinamis menggunakan rumus `Tanggal Acara Utama + retention_invitation_days`.
6. **Mekanisme Remote Klien (Restore 1-Klik) (`docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md`):** Admin dapat meremote Dasbor Klien secara utuh tanpa meminta password melalui arsitektur *httpOnly Cookie Session Override (`lux_remote_client_id`)*. Server Action `startRemoteSession(clientId)` menetapkan cookie dan mengarahkan ke `/dashboard`. Callback `session` di `auth.ts` secara dinamis memetakan workspace ke profil klien target (`id`, `name`, `email`, `role`) sembari mempertahankan penanda hak akses Admin. Hal ini membuat seluruh ratusan API klien (`/api/client/**`) otomatis membaca dan mengelola data klien yang di-remote tanpa mengubah atau merusak JWT Admin asli. Saat klien di-remote, banner peringatan menyala merah di Dasbor Klien, dan Admin dapat melakukan *Restore 1-Klik* via `DELETE /api/admin/remote-session` untuk kembali ke singgasananya tanpa perlu login ulang. Referensi teknis dan diagram alir lengkap terdokumentasi di `docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md`.

---

## 12. Pusat Dokumentasi Modular Platform (`docs/`)
Seluruh spesifikasi teknis dan alur data terperinci dipartisi ke dalam 3 domain modular di direktori `docs/`:
1. **Sisi Klien (`docs/client/`):**
   - Registrasi, kasir multi-gateway & checkout (`TAHAP_REGISTRASI_DAN_PEMBAYARAN.md`)
   - Setup wizard awal 3 langkah (`TAHAP_DASHBOARD_SETUP_AWAL.md`)
   - Studio Editor 14 seksi & dual-native visual canvas (`TAHAP_STUDIO_EDITOR_UNDANGAN.md`)
   - Manajemen buku tamu, link personal & tiket QR (`TAHAP_MANAJEMEN_TAMU_DAN_QR.md`)
   - Monitoring RSVP, kalkulasi pax katering & feed doa (`TAHAP_RSVP_DAN_MODERASI_UCAPAN.md`)
   - Subdomain checker real-time, CNAME & publish pipeline (`TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md`)
2. **Sisi Administrator (`docs/admin/`):**
   - Analitik metrik bisnis & grafik pendapatan (`DASHBOARD_OVERVIEW_DAN_STATISTIK.md`)
   - Remote session impersonasi & user lifecycle (`REMOTE_DAN_MANAJEMEN_KLIEN.md`)
   - Tata kelola undangan, suspend & custom domain (`MANAJEMEN_UNDANGAN_DAN_DOMAIN.md`)
   - Transaksi invoice, approval transfer manual & gateway switcher (`MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md`)
   - Manajemen tema fisik & auto-compile demo (`MANAJEMEN_TEMA_ADMIN.md`)
   - Branding white-label, Cloudflare R2 CORS & maintenance database (`PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md`)
   - Deployment VPS Ubuntu 22.04 & reverse proxy Caddy (`DEPLOYMENT_VPS_CADDY.md`)
3. **Sisi Publik & Resepsionis (`docs/public/`):**
   - Resolusi multi-domain & compiler token tema (`01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md`)
   - Pengalaman tamu, cover gate & audio autoplay policy (`02_PENGALAMAN_TAMU_UNDANGAN.md`)
   - Formulir RSVP publik, rate limiting & nested wish reply (`03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md`)
   - Tanda kasih cashless, rekening copy button & QRIS (`04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md`)
   - Portal meja resepsionis, HTML5 QR scanner & souvenir (`05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md`)
   - Portal upload momen tamu & slideshow proyektor venue (`06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md`)

