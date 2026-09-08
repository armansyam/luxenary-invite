# S-Invitation: Luxenary Invite System Architecture & Master Specification
> **Versi: 5.6.0 | Diperbarui: 08 September 2026**

## 1. Executive Summary & Core Philosophy
**Luxenary Invite** adalah platform ekosistem undangan pernikahan digital modern berbasis Next.js 16 (App Router + Turbopack) yang menghadirkan pengalaman visual mewah (*haute couture*), kecepatan muat instan (<0.8 detik), self-service dashboard mandiri bagi klien, dan integrasi cloud edge caching.

---

## 2. Katalog & Arsitektur DOM Tema Aktual (15 Tema Fisik + 1 Blueprint)

Sistem template undangan menggunakan arsitektur HTML multi-layer mandiri dengan placeholder `{{variabel}}` yang diinjeksi oleh `lib/themeEngine.ts` dan dipetakan oleh `lib/renderTemplate.ts`:

### A. Premium Series (`themes/premium/`)
1. **Kalandra (`themes/premium/kalandra.html`)** *(Legacy Alias: `kila`)*
   - Desktop split-screen hero photo (lebar sisa layar) dengan panel undangan 460px dan subtle bottom scrim (25%).
   - Full-bleed vertical photo slides 100vh untuk Pengantin Pria & Wanita.
   - Live Countdown, Google Calendar sync, dan floating glass dock.
2. **Valente (`themes/premium/valente.html`)**
   - High-fashion editorial spread dengan framing foto portrait 3:4 dan indeks terbitan majalah (`NO. 01 / THE GROOM`, `NO. 02 / THE BRIDE`).
   - Countdown tipografis minimalis bergaris hairline editorial tanpa box kaku.
   - Side Navigation Drawer ala daftar isi majalah (*Table of Contents*) bernomor urut dan cover berlabel special issue.
   - Responsif 100% full-bleed di layar mobile/tablet dan desktop split-screen 460px.
3. **Aurelia (`themes/premium/aurelia.html`)**
   - Kanvas video sutra bergerak (*Video Canvas Backdrop*) dengan fallback poster.
   - Partikel kelopak bunga melayang lembut (*ambient petals*).
   - Kartu kapsul kaca frosted glass asimetris (32px radius).
4. **Artisan (`themes/premium/artisan.html`)**
   - Estetika tipografi atelier kontemporer dengan palet monokromatik hangat.
   - Transisi foto asimetris dan galeri grid editorial dinamis.
   - Multi-Layer Visual Slots: Layar Sampul Fullscreen Global Desktop, Fixed Parallax Background Layer (`globalBgUrl`), Seksi Pembuka Khusus (`homePhotoUrl`), dan Penutup Adaptif Full-Height (`closingPhotoUrl`).

### B. Traditional Series (`themes/traditional/`)
1. **Prameswari (`themes/traditional/prameswari.html`)**
   - 3D Wax Seal Envelope opening modal dengan stempel lilin emas (`BUKA ✦`).
   - Portal kubah lengkung keraton (*Traditional Arch Portals*) berbingkai emas.
   - Tekstur kertas perkamen antik & ornamen klasik Nusantara.
2. **Badrika (`themes/traditional/badrika.html`)**
   - Nuansa adat Bugis-Makassar royal celebration dengan aksen emas tembaga, rumah adat Bugis, dan arsitektur split-desktop (`.fixed-bg-layer` 460px semi-transparan berpadu kain sutra Lontara).
3. **Candani (`themes/traditional/candani.html`)**
   - Floral Heritage Nusantara berpadu palet warna bumi (*terracotta, sand, warm gold*), serta dukungan penuh palet dinamis sistem (`{{colorPrimary}}`, `{{colorSecondary}}`, `{{colorAccent}}`, `{{colorBgDark}}`).
   - Arsitektur Desktop Split 460px presisi: `.sidebar-desktop .left-hero` dinamis (`calc(100% - 460px)`), panel undangan terisolasi 460px, serta kanvas `.fixed-bg-layer` fokus 460px di desktop dan 100% di mobile.
   - Home Section dinamis murni tanpa card (`#home` berpadu *optical center typography* dengan ritme vertikal kompak sehingga teks doa & countdown menyatu leluasa dengan kanvas latar belakang).
   - Profil Mempelai Card-less Staggered (`.couple-staggered-container`): Menghilangkan kotak card tebal, mempertahankan bingkai kubah melengkung berbayangan mewah (*luxury layered shadow*), First (Pria) berposisi di kiri dengan inisial huruf pertama bergradasi (*watermark gradient*) di sisi kanannya, Second (Wanita) di kanan dengan inisial di sisi kirinya, terhubung oleh ampersand puitis `&`, serta bebas dari efek loncat hover/scroll yang mengganggu.
   - Keterangan Orang Tua Terstruktur Anti-Orphan & Murni String Bebas (`.couple-parents`): Menggunakan pemisahan 4 kolom terstruktur (`groomFather`, `groomMother`, `brideFather`, `brideMother`) dengan deteksi awalan otomatis (`{{firstParentPrefix}}` = "Putra dari" / "Putri dari") dan penataan hierarki vertikal per baris tanpa paksaan awalan Bpk/Ibu, sehingga klien bebas menuliskan nama langsung, gelar akademik/adat, atau status almarhum/almarhumah (`Alm.`, `Almh.`), tersusun rapi tanpa patah kata (*no orphan wrapping*).
   - Smart Bottom Dock dengan navigasi berlabel 'Home' (menuju `#home`), integrasi pemutar musik langsung di dock (`#musicToggle` berstatus pulsing animasi saat menyala, tanpa emoji OS), dan integrasi Universal Smart Dock Home Zone Guard (`body.lux-at-home-zone`).
   - Zero-hardcode dengan atribut `data-lux-field`, peranan mempelai dinamis (`{{groomRole}}` & `{{brideRole}}`), divider floral ornamen SVG khas, serta modal QR Check-in (`#modalBg`) terpadu.
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
   - Gaya jurnal editorial majalah eksklusif dengan tipografi Times-style masthead. Mengusung struktur slot visual presisi: Dynamic Desktop Sidebar (`{{sidebarPhotoUrl}}`), Cover Pop-up (`{{landingCoverUrl}}`), Slide Hero Pembuka Editorial `#home` (`{{homePhotoUrl}}`), dan Wallpaper Kanvas `.fixed-bg-layer` yang fokus presisi di kolom undangan 460px (`{{globalBgUrl}}`).
5. **Lumina (`themes/modern/lumina.html`)**
   - Pencahayaan prisma lembut (*soft glow lens flares*) dengan layout ultra-modern.
6. **Solaria (`themes/modern/solaria.html`)**
   - Nuansa hangat terik matahari senja (*warm sunset aesthetics*) & kartu transparan.

### D. Developer Blueprint
- **Starter Blueprint (`themes/starter-blueprint.html`)**
  - Standar acuan struktur tag dan placeholder untuk desainer tema baru.

### E. Standar Kontrak Placeholder Nama Mempelai (Cover vs Profil)
1. **Cover Buka Undangan, Hero Title, Sidebar Desktop, & Closing Footer**:
   - **MUTLAK** menggunakan Nama Panggilan murni dari field form `groomNickname` / `brideNickname` (`{{firstNickname}} & {{secondNickname}}` atau alias `{{firstName}} & {{secondName}}`).
   - Menghadirkan kesan visual yang intim, elegan, bersih, dan proporsional tanpa kepadatan gelar akademik atau nama panjang.
2. **Seksi Profil Mempelai (*The Couple Section*)**:
   - **Aksen / Header Atas Foto**: Menggunakan Nama Panggilan murni (`{{firstNickname}}` / `{{secondNickname}}`).
   - **Detail Identitas Resmi Bawah**: Menggunakan Nama Lengkap beserta Gelar Akademik/Adat (`{{firstDisplayName}} & {{secondDisplayName}}` atau `{{firstFullName}} & {{secondFullName}}`).
   - Dilengkapi silsilah orang tua (`{{firstParents}}` & `{{secondParents}}`) serta tautan Instagram (`@{{firstInstagram}}` & `@{{secondInstagram}}`).
3. **Monogram & Inisial Logo Dinamis (`firstInitial`, `secondInitial`, `coupleMonogram`)**:
   - Menghasilkan huruf inisial kapital mempelai secara otomatis berbasis `displayOrder` (`Julian` -> `J`, `Valerie` -> `V`).
   - Digunakan untuk *brand crest watermark* di sudut kiri atas desktop hero atau badge monogram.
4. **Sub-teks & Eyebrow Seksi Profil Universal**:
   - `{{coupleSectionEyebrow}}` (default: `THE COUPLE`).
   - `{{coupleSectionTitle}}` (default: `Mempelai`, mendukung *Inline Live Editor* via `data-lux-field="customLabels.coupleTitle"`).
   - `{{coupleSectionSub}}` (pengantar pernikahan universal non-sektarian).

### F. Standar Proporsi Desktop Split 460px (Golden Ratio Architecture)
Seluruh 15 tema fisik master mengimplementasikan standarisasi tata letak split layar desktop (breakpoint `≥ 900px` atau `≥ 1024px`):
1. **Sidebar Hero Kiri Dinamis (`width: calc(100% - 460px)`):** Membentang mengisi seluruh sisa ruang layar lebar/widescreen secara responsif.
2. **Panel Undangan Kanan Terkunci 460px (`width: 460px; margin-left: calc(100% - 460px)`):** Menjaga rasio emas visual smartphone flagship tanpa distorsi tombol melebar atau tipografi renggang di monitor besar.
3. **Fokus Latar Belakang & Video (`.fixed-bg-layer` & `.lux-fixed-bg-video`):**
   - Layar Ponsel: Membentang penuh 100% viewport (`width: 100%; left: 0`).
   - Layar Desktop: Terkunci di kolom kanan 460px (`left: calc(100% - 460px); width: 460px;`), mencegah latar terpotong atau tumpang-tindih di balik sidebar hero kiri.
4. **Navigasi Dock Mengambang:** Terpusat presisi di tengah kolom undangan kanan via `left: calc(100% - 230px) !important;`.
5. **Standar Tipografi Anti-Overflow Panel Kanan:**
   - Karena perhitungan unit `vw` mengevaluasi layar monitor penuh (1440–1920px), seluruh judul seksi `.sec-main-title, .sec-heading` dikunci maksimal pada `font-size: clamp(1.75rem, 2.1rem, 2.3rem) !important;` dengan aturan protektif `overflow-wrap: break-word !important; word-break: break-word !important;`.
   - Padding seksi desktop dinormalisasi menjadi `1.8rem` (~57px), menjamin ruang konten efektif sebesar ~404px yang identik dengan layar mobile sesungguhnya.
6. **Integrasi Starter Blueprint (`themes/starter-blueprint.html` & `public/downloads/starter-blueprint.html`):**
   - Arsitektur Golden Standard split 460px dan aturan tipografi anti-overflow telah dibundel secara bawaan ke dalam cetak biru developer untuk memudahkan para Theme Builder menciptakan tema baru tanpa perlu mendesain ulang sistem layout desktop.
7. **Smart Auto-Hide Navigasi Dock & Floating Audio (`initSmartDock` / `initSmartControls`):**
   - Seluruh 15 tema mengadopsi mekanisme auto-hide pintar hardware-accelerated (`translate3d` & `opacity`).
   - Saat tamu menggulir ke bawah untuk membaca atau menikmati konten, dock dan tombol musik mengambang meluncur keluar layar secara serentak demi menghadirkan viewport yang 100% bersih dan imersif.
   - Saat tamu menggulir ke atas (delta $\ge$ 12px), berada di posisi paling atas (`scrollTop <= 70px`), mencapai footer, atau menekan menu navigasi, seluruh kontrol mengambang otomatis meluncur masuk kembali dengan transisi lembut (`cubic-bezier(0.16, 1, 0.3, 1)`).

### G. Arsitektur Preloader Hibrida & Anti-Visual Leak Guard
Sistem mengimplementasikan proteksi pembuka dua tingkat (*Hybrid Preloader Architecture*) untuk mencegah bocornya lapisan isi undangan sebelum aset gambar cover pembuka selesai diunduh:
1. **Prioritas Preloader Master (`id="themePreloader"`):**
   - Jika tema master memiliki elemen berkontrak `id="themePreloader"`, engine **TIDAK** menyuntikkan preloader bawaan, memberikan keleluasaan penuh bagi desainer untuk menciptakan animasi dan ornamen khas tema.
2. **Injeksi Preloader Universal (Fallback Mewah Bawaan Engine):**
   - Jika tema tidak memiliki `id="themePreloader"`, engine otomatis menyuntikkan Universal Preloader berlatar obsidian (`#0c0c0e`, z-index 999999) dengan inisial monogram tipografi minimalis (*Native Luxury Serif Didot/Georgia*) yang melekat sejak milidetik ke-0 (`{{firstInitial}} & {{secondInitial}}`), nama panggilan mempelai (`{{firstName}} & {{secondName}}`), dan bilah progres berkilau (*golden shimmer bar*) tanpa ornamen lingkaran yang ramai.
3. **Solid Backdrop Guard:**
   - Seluruh selektor cover pembuka diproteksi dengan `background-color: #0c0c0e !important;` sehingga peramban tidak pernah menampilkan latar tembus pandang ke seksi di bawahnya.
4. **Universal Client Dismissal Driver (`initPreloaderGuard`):**
   - Runtime klien di `lib/renderTemplate.ts` menghitung durasi sejak first paint. Begitu gambar cover selesai di-decode (`landingCoverUrl`), preloader ditahan hingga genap memenuhi **durasi minimal 1.2 detik (1200ms)** agar tamu sempat menikmati monogram dan kilau emas tanpa terburu-buru.
   - Setelah durasi minimal tercapai, preloader memudar mulus via `.preloader-hidden` (transisi opacity 600ms) dan dicopot dari DOM (`remove()`).
   - Dilengkapi *Safety Timeout 2.5 Detik (2500ms)* agar pengunjung dengan koneksi lambat tidak pernah terhenti di layar preloader.
5. **Keamanan 100% Publikasi (Baked Standalone Safe):**
   - Saat undangan diterbitkan melalui `staticPublisher.ts`, seluruh struktur preloader, CSS inline, dan runtime dismissal di-bake secara permanen ke dalam file HTML mandiri (`data/published/ids/{id}.html`), menjamin performa instan tanpa flicker di semua platform hosting.

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
4. **Dress Code Visual Color Studio (Panduan Busana)**:
   - **Visual Color Swatches:** Bulatan warna interaktif dengan *native color picker* terintegrasi tanpa menghafal kode HEX.
   - **8 Preset Tren Pernikahan 1-Klik:** *Earthy Terracotta, Sage & Champagne, Dusty Rose & Blush, Royal Navy & Gold, Emerald Luxury, Modern Monochrome, Sogan Batik Nusantara, Sunset Lilac*.
   - **Smart Sync Tema:** Sekali klik `✨ Samakan Tema` untuk menyinkronkan warna busana dengan palet bawaan tema fisik yang sedang aktif.
   - **Live Guest Preview:** Pratinjau instan tampilan kartu busana yang akan dilihat oleh tamu undangan.
   - **Mode Lanjutan:** Opsi input teks manual kode hex dengan sinkronisasi dua arah (*two-way sync*).
5. **Saklar Tampil/Sembunyikan (*Section Toggles*)**:
   - Klien dapat mengaktifkan/menonaktifkan seksi (*Love Story, Galeri Foto, Amplop Digital, Dresscode*) secara instan.
6. **Video Teaser Player Pre-Wedding**:
   - Mendukung tautan YouTube (Unlisted/Public), Vimeo, atau direct MP4 yang otomatis dirender sebagai pemutar video responsif 16:9 di bagian atas galeri.
7. **Smart Audit Protocol (Zero Data Bolong)**:
   - Audit 12 komponen sekuensial di `/dashboard/settings` (mencakup data teks inti, seluruh slot upload visual sampul & profil mempelai, serta modul opsional).
   - Seluruh slot visual (Sampul Pop-Up, Sidebar Desktop, Fixed Background, Foto Penutup, dan Foto Kedua Mempelai) wajib terisi unggahan klien untuk mencegah tertampilkannya aset demo bawaan tema.
   - Seksi dengan sakelar aktif wajib memiliki data lengkap (tidak boleh ada galeri/cerita/rekening kosong jika tombol toggle ON).
   - Seksi dengan sakelar mati secara transparan berstatus `Nonaktif (Dilewati)` dan otomatis lolos audit tanpa menghalangi peluncuran.
   - **Sinkronisasi Navigasi Runtime & Smart Dock Home Zone Guard:** Seksi yang dimatikan otomatis terhapus dari DOM dan item navigasi dock bawah (`.bottom-dock a`) serta tombol audio floating (`.music-fab`) disembunyikan secara dinamis via `syncActiveTogglesUI()`. Selain itu, `UNIFIED_CLIENT_RUNTIME_SCRIPT` mengawal status dock (`lux-at-home-zone`), memastikan dock bawah tetap tersembunyi secara murni di seksi Home/Hero dan hanya muncul saat scroll-up di seksi berikutnya.
8. **Pre-Flight Gatekeeper Checklist (6 Instrumen URL)**:
   - Menyajikan 6 instrumen URL resmi terpisah: (1) Pintu Utama Canonical, (2) Subdomain Eksklusif, (3) Simulasi Personalisasi Tamu (`?to=...`), (4) Portal Resepsionis & QR (`/receptionist`), (5) Galeri Kenangan Tamu (`/memories`), dan (6) Form Kamera Tamu (`/sharemoment`).
   - Tombol *"Rilis Undangan Resmi"* terkunci sampai ke-6 instrumen URL terkonfirmasi 100% oleh klien. Seluruh tautan didukung mode `?preview=true` saat status DRAFT agar dapat diuji coba tanpa membuka akses publik prematur.
9. **Portal Meja Resepsionis & QR Scanner (`/receptionist`)**:
   - Dilindungi PIN Panitia 4-10 digit (dienkripsi AES-256-GCM dua arah di database).
   - Menggunakan token sesi HMAC (`rcpt_${invitationId}_${hash}`) yang tersimpan di `localStorage`.
   - **Tampilan Hasil Check-in Informatif:** Menampilkan nama tamu, badge kategori (VIP/Keluarga/Umum), jumlah alokasi pax, serta **Kartu Lokasi Meja / Tempat Duduk** (e.g. `Meja 5`) secara mencolok untuk kemudahan panitia dan tamu.
   - **Header & Navbar Profesional:** 
      - Sisi Kiri: Menampilkan `BrandLogo` resmi dan nama platform.
      - Posisi Tengah: Judul aplikasi `"RECEPTIONIST SYSTEM"` dipusatkan (*perfect center*) untuk keseimbangan tata letak visual.
      - Sisi Kanan: Menggunakan tombol kontrol minimalis bebas teks dengan ikon SVG (indikator status online hijau, tombol *Fullscreen*, dan tombol *Kunci Layar*).
    - **Antarmuka Pemindai Minimalis & Fokus:** 
      - Judul pemindai disederhanakan menjadi **"SCAN"** (saat scanner tembak/input) dan **"KAMERA LIVE"** (saat pemindaian kamera), menghilangkan label panjang yang tidak perlu.
      - Kartu statistik kehadiran disembunyikan agar perhatian panitia tidak teralihkan dari alur verifikasi tamu.
      - **Daftar Tamu Ringkas:** Disediakan sebagai tombol kecil *dropdown* (*"Daftar Tamu"*) di dalam kartu pemindai tanpa badge angka/hitungan, menjaga kerapian layar utama.
    - **Fitur Kunci Layar (Logout Panitia):** Tombol modern di navbar header memungkinkan panitia mengunci kembali layar ke modal PIN kapan saja saat meninggalkan meja registrasi.
    - **Multi-Device Live Camera Engine (Laptop & Tablet):**
      - Kompatibel penuh dengan laptop webcam maupun tablet (iPad / Android Tablet) dengan auto-deteksi perangkat kamera.
      - Tombol dinamis *Balik Kamera* untuk beralih instan antara kamera depan (menghadap tamu di stand) dan kamera belakang (dipegang panitia).
      - Viewfinder interaktif dengan animasi laser scanner dan umpan balik suara *beep chime* (Web Audio API) saat QR terdeteksi.
      - Mekanisme *Anti-Double Scan Lock* (jeda 3 detik dengan overlay sukses) untuk mencegah pembacaan ganda yang tidak disengaja.
    - **Arsitektur Single-Screen Zero-Scroll Kiosk (`h-screen overflow-hidden`):** 
      - Seluruh antarmuka dikunci kokoh dalam 1 layar penuh tanpa scrollbar browser vertikal (`overflow-hidden`), mengeliminasi pergeseran layar (*elastic bounce* / scrolling) saat panitia menyentuh layar tablet atau laptop.
      - **Dua Kolom Simetris Penuh:** Kolom kiri (display tamu 5-grid) dan kolom kanan (scanner pemindai 7-grid) beroperasi dengan tinggi dinamis penuh (`h-full min-h-0`).
      - **Pemusatan Presisi & Tombol Reset:** Kartu status siaga dan hasil check-in di sisi kiri terpusat presisi (`my-auto`) dan dilengkapi tombol *"Kembali ke Siaga Scan"* agar panitia dapat mengembalikan tampilan ke status siap menerima tamu secara instan tanpa reload browser.
    - **Ambient Standby Screensaver (Watermark Monogram Cover):**
      - Sistem otomatis beralih ke mode *Ambient Standby Screensaver* jika tidak ada interaksi selama 2 menit (atau diaktifkan langsung via tombol Standby di navbar).
      - Menampilkan watermark elegan berukuran besar di tengah layar dengan latar radial stone gelap:
        - **Versi Live:** Watermark monogram inisial mempelai (e.g. `R & J`), nama lengkap pasangan, garis aksen emas tipis, dan jam digital realtime.
        - **Versi Demo:** Watermark besar Logo Platform (`BrandLogo`), tipografi `LUXENARY INVITE`, subteks sistem, dan jam digital realtime.
      - **True Standby Hardware Power-Saving & Privacy Protection:** Saat mode screensaver aktif, perangkat keras kamera (sensor CMOS & track MediaStream peramban) dimatikan tuntas secara otomatis demi mendinginkan prosesor (CPU/GPU), mencegah overheating pada tablet/laptop, menghemat baterai venue, serta menjamin privasi tamu (lampu webcam hijau padam). Begitu layar disentuh (*Tap to Wake*), tombol keyboard ditekan, atau barcode scanner tembak menembak tiket, screensaver tertutup seketika dan kamera kembali aktif siap memindai dalam ~400ms.
      - **Auto-Dismiss 15 Detik & Camera Pause Protection:** Kartu notifikasi hasil scan otomatis kembali ke status bersih *"Siaga Menerima Tamu"* dalam 15 detik jika didiamkan. Selama kartu notifikasi tampil, pemindaian kamera dijeda (*paused*) dan laser beam dimatikan sementara guna mencegah pemindaian berulang (*re-scan looping*) pada barcode yang sama.
      - **Throttled Standby Idle Timer:** Timer screensaver 120 detik (2 menit) dilengkapi proteksi *throttling* (1000ms) terhadap pergerakan mikro mouse/trackpad, memastikan transisi standby terjadi mulus saat meja registrasi sepi.
    - **Fullscreen Kiosk Mode & Color Scheme Isolation:** Mendukung mode layar penuh (HTML5 Fullscreen API) di perangkat tablet atau laptop untuk operasional kiosk meja registrasi, serta penguncian isolasi tema (*color-scheme: only light*) agar palet warna, tipografi, dan kontras visual tidak terdistorsi oleh pengaturan Dark/Light mode bawaan sistem operasi pengguna atau peramban.
    - **Offline-First Resilience:** Daftar tamu dan antrean scan offline disimpan di `localStorage`. Jika panitia mengunci layar saat masih terdapat antrean scan offline, sistem memberikan dialog konfirmasi keamanan tanpa menghilangkan antrean data yang tersimpan di perangkat.

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
3. **Pipeline Video Loop Sinematik (`FFmpeg`):**
   - Dukungan video background loop untuk `LANDING_COVER` (Cover pembuka), `DESKTOP_SIDEBAR` (Hero desktop), dan `GLOBAL_FIXED_BG` (Latar kartu).
   - Format input: MP4, MOV (kamera iPhone), WebM.
   - Pemotongan otomatis maksimal 20 detik pertama (`-t 20`).
   - **True Seamless Crossfade Looping:** Menggunakan filter `xfade` (0.6s–1.2s) yang memadukan ekor video dengan kepala video secara transparan sehingga frame awal dan akhir 100% identik, menghasilkan pengulangan video mulus tanpa jump-cut patah.
   - Mode senyap (*Silent Loop*): Menghapus track audio (`-an`) untuk menghemat file ~20% dan menjamin pemutaran otomatis (*autoplay*) tanpa hambatan di iOS Safari dan Android Chrome.
   - Pembatasan frame rate ke 30 fps (`-r 30`) untuk efisiensi GPU dan memberikan efek gerak sinematik filmis.
   - Proteksi ukuran file berlapis: maks. 30MB untuk video dan 15MB untuk foto.
   - Rendering engine otomatis menyuntikkan tag HTML5 `<video class="..." autoplay loop muted playsinline webkit-playsinline>` dengan overlay gradasi kontras tinggi.
4. **Cloudflare Edge Caching & Wildcard Subdomain:**
   - Subdomain otomatis `*.luxenary.id` (contoh: `dimas-clarissa.luxenary.id`).
   - Cache statis dengan `Cache-Control: public, max-age=31536000, immutable`.
   - Beban server 0% dan loading instan di HP tamu.
5. **Isolasi Seksi Home (`HOME_PHOTO`) & Container Flush Alignment:**
   - Slot `HOME_PHOTO` ("Latar Belakang Home (Opsional)") terinjeksi mandiri pada Seksi 1 (`.slide-opening#home`) dengan gradient overlay pelindung teks judul dan kutipan.
   - Jika slot kosong, seksi Home tetap transparan memperlihatkan latar belakang fixed global (video loop atau foto kanvas).
   - Eliminasi total celah bawah (*gap*) 90px/110px di bawah footer `.site-footer` melalui `public/css/modules.css` dan `renderTemplate.ts`, serta pendaftaran `footer, .site-footer, .closing-sec` ke CSS Scroll Snap (`scroll-snap-align: start; scroll-snap-stop: always;`) di `fonts.css` & `modules.css` sehingga footer 100vh menutup rapat ke dasar layar (*flush to bottom*) dan mengunci (*snap*) presisi tanpa memantul balik ke atas.
6. **Sinkronisasi Audio Otomatis & Gerbang Tombol Buka Undangan:**
   - Pemutaran musik latar disinkronkan langsung dengan tombol pembuka cover undangan (`.btn-buka`, `.btn-buka-undangan`, `.cover-btn-open`, dll.) sebagai *trusted user gesture* resmi browser.
   - Jembatan ID dinamis (`luxAudioPlayer`, `bgAudio`, `weddingAudio`) memastikan kompatibilitas penuh seluruh tema tanpa kegagalan audio null.
   - Dilengkapi fallback interaksi sentuhan pertama pasca cover terbuka dan isolasi otomatis untuk mencegah kebocoran audio pada pratinjau kartu katalog.
7. **Penyimpanan Media Klien & Standarisasi Deterministik (Zero Disk Waste):**
   - **Mode Draft 100% Fully Local:** Selama status undangan masih `DRAFT`, semua upload media (foto, video, musik) dipaksa disimpan di disk lokal VPS (`public/uploads/invitations/[id]/`) untuk menghemat biaya operasional API Write R2 dan mencegah akumulasi sampah dari draft coba-coba/batal.
   - **Penamaan Deterministik Tanpa Date.now Fisik:** Seluruh slot memiliki nama file fisik tetap (misal `wedding-song.mp3`, `landing-cover.webp`, `home-photo.mp4`). Penggantian media kapan saja akan menimpa (*clean overwrite*) file lama secara otomatis tanpa penumpukan file yatim (*orphaned files*).
   - **Bust Cache via Query Parameter:** Cache browser diatasi pada level URL publik (`?t=${Date.now()}`), menjamin audio/video dan foto selalu ter-refresh seketika tanpa mengubah nama file fisik di storage.
   - **Migrasi ke R2 Saat Publish:** Fungsi `syncDraftToR2` memigrasikan seluruh media lokal ke Cloudflare R2 secara otomatis saat undangan diterbitkan.

---

## 6. Siklus Hidup Undangan & Mesin Retensi Otomatis (Cron Cleanup)

Siklus hidup undangan diatur secara otomatis oleh cron job (`POST /api/cron/cleanup`) yang dilindungi `CRON_SECRET`:

1. **Fase 1: Transisi Pasca Acara (H + `retention_invitation_grace_days`, default 7 hari)**:
   - Perhitungan batas waktu pasca-acara dihitung otomatis dari **Tanggal Acara Paling Akhir (`getLatestEventDate`)** untuk melindungi pernikahan multi-sesi (misal Akad Hari-1 dan Resepsi Hari-3).
   - Undangan fisik ditutup dan status undangan diperbarui menjadi `EVENT_FINISHED`.
   - Upload momen tamu dikunci secara otomatis (`memoriesUploadLocked = true`) agar aman dari race condition upload detik-detik terakhir.
   - Data formulir RSVP dibersihkan otomatis untuk melindungi privasi.
   - Kunjungan ke URL subdomain/slug otomatis dialihkan (*redirect 307*) langsung ke **Galeri Momen Tamu (`/memories`)**. Saat subdomain dilepas, URL Asli (`/[invitationSlug]`) otomatis menjadi rujukan permanen.
2. **Fase 2: Retensi Galeri Momen (H + `retention_gallery_default_days` atau `galleryExpiresAt`)**:
   - Paket yang mencakup fitur `guest_memories` (`/memories`) mengadopsi durasi retensi dinamis dari pengaturan admin (`retention_gallery_default_days`, default 30 hari / 1 bulan) pada seluruh paket publik dan dashboard klien.
   - Tamu dan pengantin dapat mengunduh seluruh koleksi foto kenangan dalam format ZIP via `streamMemoriesToZip`.
   - Klien dapat memperpanjang masa aktif galeri sebesar **+30 Hari** via pembayaran QRIS mandiri (`POST /api/client/memories/extend`).
   - Jika masa aktif habis dan tidak diperpanjang:
     - Seluruh foto kenangan tamu (`GuestMemory`) di R2 dan disk lokal dihapus permanen.
     - Subdomain dilepaskan kembali ke pool umum (`subdomain = null`) agar dapat digunakan kembali oleh pasangan lain.
     - Status undangan menjadi `ARCHIVED`.
3. **Smart Fallback ke Portofolio / Beranda**:
   - Jika slug diakses saat undangan berstatus `ARCHIVED`, sistem memeriksa apakah salinan portofolio ada di `/portfolio/[slug]`.
   - Jika ada portofolio, otomatis dialihkan (*HTTP 307*) ke halaman portofolio sebagai arsip kenangan abadi.
   - Jika tidak ada, sistem langsung mengalihkan (*HTTP 302/307*) pengunjung kembali ke Halaman Utama (`/`) secara elegan tanpa memunculkan error 404.
4. **Pemisahan Desain & Operasional Galeri Kenangan Tamu**:
   - **Formulir Studio Editor (`/dashboard/invitation/[id]` Seksi 14):** Khusus styling & konfigurasi teks seksi (Toggle aktif, judul seksi, eyebrow, subjudul/deskripsi ajakan berbagi momen).
   - **Dashboard Klien (`/dashboard` Seksi 5 & Card 4):** Pusat operasional & monitoring momen tamu yang menyajikan tautan publik album kenangan, widget unduh arsip ZIP client-side, info retensi/perpanjangan masa simpan +30 hari via QRIS, dan monitoring/moderasi foto masuk secara real-time.
5. **Manajemen Domain Undangan & Hero Launchpad Publikasi (Buku Tamu / WhatsApp Broadcast)**:
   - **Hero Launchpad Publikasi (/dashboard/settings):** Bagian peluncuran ditingkatkan menjadi Hero Launchpad mandiri di bagian teratas panel pengaturan. Dilengkapi mode fokus penuh dengan animasi pemindai radar dan jendela *sliding ticker* vertikal (maksimal 3 baris tampak). Item yang selesai diverifikasi otomatis bergulir naik ke atas secara sekuensial memeriksa 12 komponen data: Subdomain, Tema, Visual Sampul & Latar Belakang (Landing Cover, Desktop Sidebar, Fixed BG, Foto Penutup), Nama Kedua Mempelai, Foto Profil Kedua Mempelai (The Groom & The Bride), Tanggal Acara Utama (sebagai referensi masa berlaku website), Waktu & Lokasi, Galeri Foto, Cerita Cinta, Rekening/Hadiah, Musik Latar, dan PIN Keamanan Tamu.
   - **Resolusi Hierarkis Domain (`resolveEffectiveInvitationUrl`):** Sistem otomatis mendeteksi dan memprioritaskan domain tautan undangan dengan urutan jujur: (1) Custom Domain Klien (`customDomain`), (2) Subdomain Platform (`subdomain`). Menghilangkan total tebakan slug palsu/halusinasi saat domain belum disetel.
   - **Proteksi Pengiriman Draft:** Jika undangan masih berstatus `DRAFT`, tombol Salin tautan dan tombol Kirim WhatsApp dikunci secara disabled dengan cursor `not-allowed` serta dilengkapi *floating hover tooltip* gelap elegan.
   - **Sinkronisasi Seketika Pasca-Publikasi (Zero-Cache):** Begitu status menjadi `PUBLISHED`, API `/api/client/invitations` mengirimkan `Cache-Control: no-store` dan seluruh halaman dasbor klien (`/dashboard`, `/dashboard/guests`, `/dashboard/settings`) menggunakan `{ cache: "no-store" }` sehingga tautan tamu `{link_undangan}` dan tombol WhatsApp langsung aktif seketika tanpa *caching lag*. Ditutup dengan Banner Selebrasi Resmi berbahasa formal-netral dan Official Launch Box dengan lencana SSL aktif.
6. **Studio Editor — Seksi 15 (Pengaturan Teks UI & Label) & Netralisasi Live Editor:**
   - **Seksi 15 (`SEC15`):** Menyediakan kontrol formulir untuk kustomisasi teks tombol RSVP (`customLabels.rsvpBtnText`), form RSVP, tombol buka undangan, dan label hitung mundur.
   - **Live Editor Engine:** Saat mode edit aktif (`isEditMode`), seluruh form submission dinonaktifkan (`form.noValidate = true`, `preventDefault`) dan tombol submit dinetralkan ke `type="button"` sehingga pengguna dapat mengklik dan mengetik langsung teks tombol RSVP tanpa memicu balon validasi *"Please fill out this field"*.
7. **Proteksi Studio Editor Pasca Publish, Buka Kunci Darurat, & Atomic Single Deploy:**
   - **Proteksi Pasca Terbit (`PUBLISHED`):** Tab Edit Undangan otomatis terkunci dan menampilkan layar proteksi minimalis elegan dengan tombol kontak WhatsApp Admin untuk mencegah modifikasi data yang tidak sengaja saat tautan live sedang diakses tamu.
   - **Buka Kunci Darurat (Admin Emergency Unlock):** Admin dapat memberikan izin edit darurat selama 24 jam dari tabel admin (`/admin`).
   - **Staging Save (Anti Rebake Storm):** Penyimpanan seksi 1–15 selama masa darurat hanya memperbarui PostgreSQL database tanpa memicu kompilasi HTML dan sinkronisasi R2 berulang-ulang.
   - **Atomic Single Deploy & Auto-Lock (`DEPLOY_AND_LOCK`):** Di puncak formulir tersedia tombol aksi **"Perbarui Undangan & Kunci Kembali"** yang mengeksekusi 1 kali kompilasi HTML penuh, migrasi/sinkronisasi ke Cloudflare R2, dan seketika mengunci kembali studio secara otomatis.
   - **Pelepasan Subdomain Otomatis:** Jika subdomain diubah, subdomain lama langsung terlepas dari record database (`@unique`) dan kembali bebas ke pool publik secara otomatis.
   - **Subdomain Monitor & Live Inspector Admin:** Dashboard Admin (`/admin?tab=custom_domains`) menyediakan sub-tab khusus Subdomain Sistem (*.luxvite.id) dengan 3 kartu KPI real-time (Total Aktif, Live, Kedaluwarsa), alat pencarian kepemilikan nama (*Live Subdomain Inspector*), dan aksi daur ulang 1-klik untuk melepaskan subdomain kedaluwarsa (H+7 hari acara) kembali ke pool namespace.
7. **Proteksi Siklus Download Galeri Tamu (ZIP) & Panduan DNS Dinamis Klien:**
   - **Proteksi Unduh ZIP & Status Draft:** Tombol unduh ZIP di dashboard klien otomatis dinonaktifkan saat status masih `DRAFT` atau jika belum ada foto tamu (`guestMemoriesCount === 0`).
   - **Pencegahan Data Tercecer (Early Lock Warning):** Jika klien mengunduh ZIP saat acara masih berjalan (`PUBLISHED` & `!memoriesUploadLocked`), sistem memunculkan modal dialog peringatan bahwa pengunduhan akan langsung mengunci upload tamu secara permanen.
   - **Kondisi Aman Pasca Acara (`EVENT_FINISHED`):** Saat acara selesai, upload dikunci otomatis sehingga tombol download berada pada status aman (*safe state*) siap unduh tanpa peringatan menakutkan.
   - **Integrasi Domain & DNS Dinamis (RFC 1912):** Menghapus seluruh string konfigurasi DNS *hardcoded*. IP Publik VPS (`server_public_ip`) dan target CNAME (`cname_target`) dikonfigurasi melalui tab terdedikasi `Setup & Integrasi` di admin dengan auto-detect IP publik VPS (`/api/admin/server-ip`). Panduan di dashboard klien menyajikan tabel 2 baris (Record A untuk Root Apex `@` dan CNAME untuk Subdomain `www`) dilengkapi tombol 1-klik salin.
8. **Standar Arsitektur Seksi Penutup Adaptif 100vh & Fallback Tombol Buka Undangan**:
   - **Tombol Buka Undangan Selalu Berteks:** Tag `<button data-lux-field="customLabels.openBtn">` di seluruh 15 master template dan starter blueprint wajib memiliki teks fisik default `"Buka Undangan"`. Engine komposer (`lib/themeEngine.ts` dan `lib/demoRegistry.ts`) menjamin penyediaan fallback default `customLabels.openBtn = "Buka Undangan"`, sehingga tombol cover gate tidak pernah kosong/transparan dalam kondisi apapun.
   - **Seksi Penutup Adaptif Layar Penuh (`min-height: 100vh`):** Seksi outro/penutup (`.site-footer` / `.closing-sec`) dijamin selalu berukuran layar penuh `100vh` untuk kenyamanan navigasi scroll snap, menghilangkan masalah footer "nyempil" atau terpotong.
   - **Mode Kanvas Kosong (Default / Tanpa Foto Penutup):** Jika klien tidak mengunggah foto penutup (`CLOSING_COVER`), seksi otomatis menerima class `.no-closing-photo`. Background murni menggunakan palet warna tema (HARAM menggunakan fallback gambar dummy/Unsplash palsu). Konten teks ucapan terima kasih dan nama mempelai (`{{firstName}} & {{secondName}}`) terposisikan tepat di tengah-tengah layar secara vertikal dan horizontal (`justify-content: center; align-items: center;`).
   - **Mode Foto Penutup Terunggah:** Jika foto penutup diunggah (`.has-closing-photo`), foto mengisi latar belakang layar penuh (`background-size: cover; background-position: center;`) dengan overlay scrim gelap/gradasi elegan, dan blok teks penutup otomatis bergeser ke area bawah layar (*bottom-aligned*, `justify-content: flex-end;`).
9. **Spesifikasi Theme Demo Studio & Dukungan Video MP4 / Audio BGM:**
   - **Upload Video MP4 (Cover, Hero, & Background):** Demo Studio Admin mendukung upload file video `.mp4` / `.webm` untuk slot sampul (`cover`), sidebar/hero desktop (`hero`), dan background global (`background`). Mesin render (`lib/renderTemplate.ts`) secara otomatis memutar video ambient loop muted (`<video autoplay loop muted playsinline>`).
   - **Pembersihan File Format Berlawanan:** Endpoint `demo-asset` otomatis membersihkan file format berlawanan (misal menghapus `.webp` lama saat `.mp4` diunggah) dan menyinkronkan URL ke `AdminSetting` (`theme_demo_${themeId}`) serta mengompilasi ulang halaman demo statis.
   - **Audio BGM Demo Showroom:** Tab Aset Visual & Audio menyediakan slot pemutar dan pengunggah audio (`music.mp3`/`music.ogg`) yang otomatis dipicu saat tombol "Buka Undangan" ditekan.
   - **Prinsip Content-Driven Rendering:** Meniadakan saklar on/off manual dan kerumitan kustomisasi label. Seksi otomatis tampil bila data diisi (cerita, rekening hadiah, dll.) dan padam bila dikosongkan.
   - **Full Caching Strategy:** Seluruh aset showroom demo (`/demo/**`) dan pustaka musik bawaan (`/music/**`) dikonfigurasi dengan header HTTP `Cache-Control` optimal di `next.config.ts` (`s-maxage=604800` untuk Edge CDN Cloudflare, dan `immutable` untuk audio), disertai query cache buster `?t=...` saat admin memperbarui aset.
   - **Showroom Color Palette Selector:** Demo Studio Admin menyertakan pemilih 6 palet warna resmi (`champagne`, `emerald`, `burgundy`, `sage`, `terracotta`, `monochrome`), menjamin demo publik seperti Badrika tampil anggun dalam balutan warna khasnya (Emerald Green & Gold) tanpa mengunci kode CSS tema secara hardcoded.
10. **Standarisasi Formulir RSVP & Buku Tamu Interaktif (15 Master Tema Fisik):**
    - Seluruh 15 tema fisik kini secara konsisten menyematkan blok `<form id="rsvpForm" onsubmit="luxSubmitRsvp(event)">` lengkap dengan input Nama Lengkap (`#rsvpName`), pilihan Kehadiran (`#rsvpStatus`), jumlah tamu (`#rsvpCount`), dan textarea Ucapan & Doa (`#rsvpMessage`), yang membungkus feed ucapan `{{wishesHtml}}` di dalam container `.wishes-list#wishesList`.
    - Menghilangkan anomali seksi kosong tanpa formulir pada tema-tema seperti `candani`, `mayang`, `badrika`, `lumina`, `solaria`, dan `chronicle`.
    - Terkoneksi secara otomatis ke endpoint publik `/api/public/rsvp` via engine JavaScript universal di `lib/renderTemplate.ts`, dengan kapabilitas real-time prepend ucapan baru ke dalam daftar seketika setelah formulir berhasil dikirim.
11. **Pustaka Musik Sistem Dinamis (Zero Hardcode):**
    - **Database-Driven Presets (`MusicPreset`):** Koleksi musik sistem dikelola secara dinamis via database PostgreSQL (`music_presets`), menggantikan seluruh array dan fallback hardcode di sisi klien.
    - **Portal Admin Sub-Tab Musik:** Tab "Tema & Musik" menyediakan sub-tab "Pustaka Musik Sistem" untuk menambah lagu baru (dengan auto-kompresi FFmpeg 128 kbps MP3 yang hemat bandwidth), menyunting judul/komposer/genre, memutar pratinjau audio langsung, mengaktifkan/menonaktifkan lagu untuk klien, dan menghapus lagu dari pustaka.
    - **Integrasi Klien Real-Time (`/api/public/music`):** Dasbor klien memuat daftar lagu aktif secara dinamis dan menampilkannya di pemilih lagu pernikahan tanpa data statis palsu.

---

## 7. Orkestrasi Multi-Payment Gateway 2-Arah & Dynamic Fee

Platform mendukung arsitektur payment gateway 2-arah (*two-way handshake*) terintegrasi dengan pergantian instan 1-klik dari dashboard Admin (`active_payment_gateway`):

1. **Gateway 2-Arah Terintegrasi**:
   - **Midtrans** (Core API In-App QRIS, GoPay, VA Multi-Bank, Snap Fallback, pembatalan instan via `/v2/{orderId}/cancel`)
   - **Xendit** (Invoice QRIS, VA Multi-Bank, E-Wallet, pembatalan instan via `/v2/invoices/{invoiceId}/expire`)
   - **Transfer Bank Manual** (Verifikasi struk transfer manual oleh Admin)
   - *Penghapusan Gateway 1-Arah:* Seluruh gateway 1-arah (iPaymu, Duitku, Tripay) telah dieliminasi dari arsitektur sistem karena ketiadaan API pembatalan publik. Ketiadaan fungsi pembatalan 2-arah memicu celah fatal *ghost payment* di mana QRIS/VA tetap aktif di bank setelah order dibatalkan di aplikasi.
2. **Two-Way Cancellation Handshake**:
   - Order melacak `gatewayId` dan `gatewayTxId`.
   - Saat klien membatalkan tagihan, mengubah paket sebelum bayar, atau waktu kedaluwarsa habis, sistem secara proaktif memanggil API pembatalan resmi ke gateway aktif (Midtrans `/v2/cancel` atau Xendit `/v2/invoices/.../expire`) agar QRIS di jaringan perbankan (ASPI / BI) langsung hangus seketika.
3. **Perhitungan Fee Dinamis (Zero Hardcode)**:
   - Parameter `payment_fee_payer` (`BUYER` vs `MERCHANT`).
   - Parameter `payment_gateway_fee_percent` (misal `0.7%`).
   - Biaya layanan aplikasi dihitung dari harga dasar paket (`subtotal * feePercent / 100`) dan tidak pernah terduplikasi saat checkout dimuat ulang.
4. **Masa Berlaku Tagihan Dinamis**:
   - Durasi QRIS dibaca dari `payment_expiry_minutes` (default 60 menit).
5. **Kebijakan Tagihan Tunggal & Proteksi Tagihan Usang (*Superseded Guard*)**:
   - Pola *Single Active Order*: Klien yang mengganti paket atau mengulang transaksi sebelum lunas otomatis me-reuse/meng-update order yang ada (`PENDING` atau `FAILED`) sehingga zero order duplikat di database.
   - *Persistent URL State & QRIS Hydration*: Kasir checkout mengikat parameter `?order=ID` pada URL via `history.replaceState`. Muat ulang halaman (F5) ribuan kali tetap menampilkan summary pesanan dan countdown QRIS aktif secara instan tanpa mereset ke tombol awal.
   - *Onboarding Guard (`/packages`)*: Klien dengan order `PENDING` aktif otomatis dicegat dari `/packages` dan dialihkan kembali ke kasir aktifnya (`/checkout?order=ID`), mencegah pembatalan sepihak di Midtrans saat klien sedang melakukan pembayaran.
   - *Penyimpanan Nyata Database*: Seluruh data order, user, dan sesi pembayaran tersimpan langsung di database PostgreSQL (`orders` table dengan indeks optimal), bukan mock in-memory, sehingga verifikasi summary dan lifecycle pembayaran 100% konsisten.
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
   - *Zero Visual Leak Dashboard Guard*: Layout dasbor klien (`app/(client)/dashboard/layout.tsx`) menerapkan *state gate* `isAuthorized`. Seluruh elemen header navigasi dan shell dasbor diblokir dari rendering sampai `onboarding-state` mengonfirmasi order lunas. Pengguna belum lunas seketika dialihkan ke `/checkout?order=...` tanpa kebocoran tampilan dasbor. Rute `/login` pada `middleware.ts` mengalihkan ke `/onboarding` (bukan `/dashboard`).
9. **Inline Action Confirmation (Zero Mouse Travel)**:
   - Tombol verifikasi konfirmasi lunas di portal `/admin` menerapkan *in-place micro-interaction* bebas dari popup browser `confirm()` dan `alert()`.
   - Tombol bertransisi halus di tempat menjadi `[Ya, Lunas]` dan `[Batal]` dengan auto-revert 5 detik.
10. **Kredensial Tunggal Terpadu & Resolusi Endpoint Otomatis**:
    - Gateway pembayaran (Midtrans dan Xendit) menggunakan set kredensial tunggal yang dikonfigurasi langsung di Portal Admin (`midtrans_server_key`, `midtrans_client_key`, `xendit_api_key`, `xendit_webhook_token`) tanpa konfigurasi mode ganda.
    - Midtrans Gateway secara otomatis mendeteksi environment endpoint berdasarkan format server key yang dimasukkan: jika key diawali `SB-` (kunci sandbox Midtrans), panggilan diarahkan ke server simulator Midtrans (`api.sandbox.midtrans.com`); jika diawali format standar `Mid-`, otomatis diarahkan ke server produksi live (`api.midtrans.com`).
    - Verifikasi signature webhook terpadu untuk memastikan callback transaksi terotentikasi secara presisi.
11. **Sub-Tabs Vendor Payment Gateway di Admin Settings**:
    - Penyusunan form pengaturan 2 vendor gateway 2-arah ke dalam kontrol sub-tab segmented control horizontal (`Midtrans` dan `Xendit`).
    - Kartu global pusat kontrol tetap berada di posisi atas, sementara vendor cards diisolasi per tab sehingga antarmuka ringkas dan tidak memerlukan vertical scrolling panjang.
    - Indikator badge visual "Aktif" otomatis menandai vendor yang sedang dijadikan gateway default pembayaran klien.
12. **Rekonsiliasi Real-Time & Deteksi Host Dinamis**:
    - Sistem mendeteksi `appUrl` secara dinamis dari request headers (`x-forwarded-host`, `host`, `x-forwarded-proto`), kompatibel secara native di lingkungan pengembangan `localhost`, reverse proxy VPS, custom domain, maupun tunnel dev tanpa hardcode URL.
    - Rekonsiliasi status real-time pada `GET /api/client/orders/[id]/status` memverifikasi status pembayaran langsung ke API gateway sehingga status terdeteksi responsif seketika.
13. **Tiga Kondisi Pembayaran & Transmisi Data Lengkap (Rich Payload Delivery)**:
    - **Tiga Kondisi Pembayaran**:
      1. *Registrasi Paket Awal (`NEW`)*: Pemilihan tier paket via `/packages` -> in-app QRIS checkout -> pasca lunas dialihkan ke `/dashboard/setup`.
      2. *Upgrade Layanan (`UPGRADE`)*: Menaikkan tier paket langsung dari studio undangan `/dashboard/invitation/[id]` dengan kalkulasi selisih harga dinamis -> pasca lunas tier induk diperbarui seketika.
      3. *Add-on Layanan Tambahan*:
         - *Perpanjang Galeri Tamu (`GALLERY_EXTENSION`)*: Menambah masa aktif penyimpanan galeri foto momen tamu selama +30 hari dan membuka kembali kunci formulir upload.
         - *Jasa Integrasi Custom Domain (`CUSTOM_DOMAIN_ADDON`)*: Integrasi domain kustom klien (lengkap dengan SSL/TLS & Cloudflare DNS) selama +365 hari / 1 tahun via `/dashboard/settings`.
    - **Transmisi Detail Lengkap ke Payment Gateway**:
      - *Profil Pembeli*: Nama depan & nama belakang (`first_name`, `last_name` / `given_names`, `surname`), alamat email resmi akun, dan nomor kontak WhatsApp aktif klien (`phoneNumber` terformat E.164).
      - *Alamat*: Alamat penagihan & pengiriman digital terstandarisasi ISO `IDN`, terhubung ke alamat pengiriman fisik jika tersedia di data undangan.
      - *Item Details & Branding*: Identitas item spesifik per kondisi transaksi, brand platform dinamis dari `AdminSetting`, kategori layanan, dan pemisahan biaya layanan admin (`ADMIN_FEE`) dengan presisi matematika penuh (`gross_amount === sum(item.price * item.quantity)`).
      - *Notifikasi Multi-Kanal*: Xendit otomatis mengirim invoice dan status pembayaran via WhatsApp, SMS, dan Email jika nomor ponsel disediakan.
      - *Metadata Komprehensif Dua Arah*: Midtrans `custom_field1` (Invoice), `custom_field2` (Order Type & Full Name), `custom_field3` (Context detail); Xendit `metadata` objek berisi `orderId`, `invoiceNumber`, `orderType`, `planType`, `targetPlanType`, `upgradedFromPlan`, `requestedDomain`, `customerFullName`, `customerEmail`, `customerPhone`, `invitationSlug`, `coupleName`, dan `platformName`.

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
3. **Sinkronisasi Tab Browser & Identitas Visual Real-Time**:
   - Dynamic metadata SSR (`force-dynamic` dan `revalidate = 0`) pada root layout (`app/layout.tsx`) dan admin layout (`app/(admin)/layout.tsx`) menjamin judul tab browser selalu membaca nama platform teranyar dari database `admin_settings`.
   - Reaktivitas hook `useEffect` pada antarmuka admin (`/admin`), login admin (`/admin/login`), dasbor klien (`/dashboard`), dan login klien (`/login`) memperbarui `document.title` seketika saat pengaturan platform disimpan tanpa perlu me-reload halaman.
   - *Zero Fallback Flash*: Teks fallback placeholder seperti `"Platform Admin"` dimusnahkan. Selama data belum siap (`!settingsLoaded`), portal menampilkan state loading elegan sehingga antarmuka tidak pernah menampilkan nama palsu sementara.
4. **Isolasi Aset Statis & Cloudflare Edge Caching**:
   - Matcher middleware NextAuth secara ketat mengecualikan seluruh file aset statis dan media (`.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|ogg|wav|css|js|woff2?|ttf|map)$`).
   - Mencegah injeksi header `Set-Cookie` pada file media demo (`/demo/*`), sehingga Cloudflare Edge dapat meng-cache seluruh gambar WebP dan audio secara instan (`cf-cache-status: HIT`), memangkas latensi muat demo dari hitungan detik menjadi <20 milidetik.
5. **Proteksi Anti-Rewrite Loop & Isolasi Rute Platform (`PLATFORM_EXCLUSIONS`)**:
   - Middleware mengisolasi seluruh rute statis sistem (`/contact`, `/privacy`, `/terms`, `/refund`, `/demo`, `/portfolio`, `/packages`, `/checkout`, `/sharemoment`, `/memories`, dll.) agar tidak tertangkap oleh filter *Flat Slug canonical routing*.
   - Menghilangkan potensi *infinite rewrite loop* (HTTP 403 / Cloudflare Error 1000) dan menjamin halaman kontak, legalitas, serta halaman sistem publik selalu di-render langsung oleh Next.js tanpa rekursi.
6. **Proteksi Subdomain Cadangan Sistem & CDN R2 (`RESERVED_SUBDOMAINS`)**:
   - Subdomain kritis seperti `cdn` (khusus Cloudflare R2), `admin`, `api`, `auth`, `static`, `assets`, `media`, `storage`, `r2`, dan `s3` dikunci terpusat di `lib/domainUtils.ts`.
   - Menolak secara mutlak upaya klien mengklaim atau menimpa subdomain CDN R2, serta menjamin `middleware.ts` tidak pernah me-rewrite request aset CDN ke rute undangan klien (`/s/[subdomain]`).

---

## 9. Sistem Portofolio Mandiri & Custom Domain (SaaS Workflow)

1. **Portofolio Kloning Mandiri (`/portfolio`)**:
   - Fitur khusus Super Admin untuk mengkloning undangan pilihan menjadi file statis 100% mandiri di `public/portfolio/[slug].html`.
   - Semua aset gambar dikompresi WebP tajam dan disimpan terisolasi di `public/portfolio/assets/[slug]/`.
2. **Custom Domain Klien (`dimas-clarissa.com`) & 2 Layanan Tambahan Resmi**:
   - **SaaS Add-on Workflow**: Custom domain merupakan layanan jasa teknis integrasi berbayar terpisah dari paket undangan (orderType: `CUSTOM_DOMAIN_ADDON`, dibaca dari `addon_custom_domain_price`), dan dikendalikan secara dinamis via kapabilitas paket (`custom_domain`) yang dikonfigurasi admin di Admin Setting (Tab Paket & Harga).
   - **Fitur Toggle Admin & State Coming Soon**:
     - Super Admin dapat menyalakan/mematikan layanan penawaran custom domain via toggle `addon_custom_domain_enabled` di Pengaturan Admin (Paket & Harga).
     - Jika dinonaktifkan (`false`), Dasbor Klien (`/dashboard/settings`) yang belum memiliki domain pribadi akan menampilkan kartu status *Segera Hadir / Belum Tersedia* (non-aktif) tanpa opsi pemesanan.
     - Klien yang paketnya tidak memiliki kapabilitas `custom_domain` ditampilkan kartu status fitur belum aktif dengan opsi upgrade.
     - Klien yang sudah memiliki domain aktif (`invitation.customDomain`) terlindungi secara penuh (Zero-Regression) dan tetap dapat melihat konfigurasi DNS mereka tanpa gangguan.
     - Endpoint checkout `POST /api/client/custom-domain/buy` dijaga ketat di tingkat backend dengan verifikasi `hasPlanCapability(invitation.order.planType, "custom_domain")`.
   - **Bundling Add-on Saat Upgrade Paket**: Klien yang upgrade ke paket dengan kapabilitas `custom_domain` dapat mencentang add-on custom domain secara opsional dalam satu invoice tagihan, yang otomatis mengaktifkan domain dan retensi 365 hari saat pelunasan.
   - Klien memesan & menginput domain pribadi mereka via Dashboard (Settings) lalu membayar melalui Payment Gateway.
   - Setelah lunas (PAID), fungsi `applyCustomDomainAddon` otomatis memasang custom domain dan menggaransi masa aktif URL Asli serta galeri kenangan selama **1 Tahun Penuh (+365 hari)**.
   - Integrasi berjalan mulus melalui **Caddy Server on-demand TLS** dengan Record A ke IP server VPS dan CNAME target dinamis, di mana middleware Next.js secara internal me-rewrite request domain ke endpoint **URL Asli** (`/[slug]` atau `/[slug]/memories`).
   - **Add-on Perpanjangan Masa Aktif URL Asli / Galeri (`orderType: GALLERY_EXTENSION`)**: Layanan bulanan via QRIS dinamis (`gallery_extension_price_per_month`, default Rp50.000 / 30 Hari) untuk mempertahankan eksistensi URL Asli undangan (yang pasca acara beralih fungsi menjadi galeri kenangan tamu) dan penyimpanan foto di Cloudflare R2 setelah masa retensi default pasca acara habis.
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
3. **Studio Tema Admin & Kustomisasi Custom Labels Menyeluruh**:
   - **Formulir Interaktif Dinamis:** Admin dapat menambah dan menghapus rangkaian acara (`events`), bab kisah cinta (`stories`), dan rekening bank (`banks`) demo secara langsung tanpa batasan statis.
   - **6 Sub-Panel Narasi Tema:** Meliputi seluruh seksi undangan (Sampul & Pembuka, Mempelai & Acara, Kisah Cinta & Galeri, Dress Code & Streaming, Tanda Kasih & Turut Mengundang, Doa Penutup & RSVP).
   - **Harmonisasi Tipografi Casing (Anti-Collision Parisienne):** Menghindari huruf kapital semua (*ALL-CAPS*) pada font kaligrafi bersambung seperti di tema Candani, menyajikan Title Case anggun (`Dress Code`, `Live Streaming`, `Love Story`, `Our Moments`, `Turut Mengundang`) yang terbaca jernih.
   - **Pewarisan Otomatis ke Undangan Klien (Smart Inheritance):** Saat klien membuat undangan baru via `POST /api/client/invitations/create`, sistem secara dinamis mewariskan seluruh label dan narasi yang telah disempurnakan admin di database (`theme_demo_${themeId}`) atau `ThemeBlueprint`.
   - **Sintesis Arketipe Kategori Otomatis (Zero-Config untuk Tema Baru):** Saat Admin mengunggah file tema baru, sistem secara cerdas mendeteksi kategori dan memetakannya ke arketipe default (`DEFAULT_TRADITIONAL_BLUEPRINT`, `DEFAULT_MODERN_BLUEPRINT`, atau `DEFAULT_PREMIUM_BLUEPRINT`). Seluruh formulir di Demo Studio otomatis terisi lengkap tanpa ada input kosong.

## 11. Filosofi Integritas UI Admin & Perlindungan Hak Klien
Dalam pengelolaan Klien dan Undangan di Dashboard Admin (`app/(admin)/admin/page.tsx`), prinsip **Anti-Overreach** (anti-intervensi berlebih) ditegakkan secara ketat untuk mencegah manipulasi data yang membingungkan klien dan merusak metrik sistem:
1. **Pencegahan URL Halusinasi:** Jika klien belum mengatur subdomain di dashboard mereka (status DRAFT), Admin akan jujur menampilkan indikator `[Belum Setup]`. Tidak ada rakitan URL tebakan dari `groomSlug` dan `brideSlug`.
2. **Kunci Hak Desain Klien:** Dropdown "Ganti Tema" tidak tersedia bagi Admin. Pilihan tema adalah hak absolut klien selama status belum dipublish, mencegah Admin merusak layout secara tidak sengaja.
3. **Pemberantasan Tombol *Backdoor* Gratisan:** Seluruh perpanjangan (*Gallery Extension*) wajib melalui jalur *Payment Gateway* yang sah. Tombol `+30H Galeri` ditiadakan dari UI Admin untuk melindungi integritas laporan keuangan (*Revenue Report*).
4. **Logika Fitur Kunci Darurat:** Opsi `Buka Kunci Darurat` hanya muncul jika sistem secara objektif mendeteksi undangan telah terkunci permanen. Jika status masih `DRAFT` atau "Bisa Diedit", tombol tersebut secara otomatis disembunyikan.
5. **Kalkulasi Kedaluwarsa Dinamis (On-The-Fly):** Nilai `expiresAt` akan tetap `null` di database sampai benar-benar di-hardcode. Untuk tampilan UI Admin, masa aktif dihitung dinamis menggunakan rumus `Tanggal Acara Utama + retention_invitation_days`.
6. **Mekanisme Remote Klien & Segmentasi Leads (Restore 1-Klik) (`docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md`):** Admin dapat meremote Dasbor Klien secara utuh tanpa meminta password melalui arsitektur *httpOnly Cookie Session Override (`lux_remote_client_id`)*. Tombol Remote hanya aktif untuk klien yang memiliki ruang kerja aktif (undangan/pesanan lunas). Calon klien (leads) yang belum checkout disegmentasikan secara terpisah dengan opsi follow-up WhatsApp dan tombol remote dinonaktifkan. Server Action `startRemoteSession(clientId)` menetapkan cookie dan mengarahkan ke `/dashboard`. Callback `session` di `auth.ts` secara dinamis memetakan workspace ke profil klien target (`id`, `name`, `email`, `role`) sembari mempertahankan penanda hak akses Admin (`originalRole`). Di halaman `/admin`, proteksi *Immunity Guard* mencegah sidebar admin hilang saat cookie remote aktif, dan dilengkapi banner sticky amber dengan tombol 1-klik hentikan remote. Saat Admin logout dari dashboard admin, cookie remote otomatis dibersihkan secara tuntas.
7. **Realtime SSE Checkout & Dark Luxury Transition Modal (QRIS & Manual):** Pintu masuk ruang kerja undangan `/dashboard/setup` terlindungi secara absolut (Zero Visual Leak) hanya jika order berstatus `PAID`. Halaman checkout menggunakan Server-Sent Events (SSE) murni (`/api/payments/status-stream/[orderId]`) baik untuk pembayaran otomatis QRIS maupun verifikasi manual transfer, menghilangkan polling browser sepenuhnya. Saat Admin menyetujui atau menolak transfer, sinyal `paymentEmitter.emit` langsung mengabari browser secara realtime. Jika `PAID`, modal transisi sukses bertema Dark Luxury muncul dengan animasi checkmark dan rincian invoice, lalu mengalihkan pengguna ke dasbor setelah jeda 1.8 detik.
8. **Resolusi Dinamis Mode Pembayaran Add-on Dasbor Klien:** Seluruh modul add-on klien (perpanjangan galeri kenangan, domain kustom, upgrade paket) membaca konfigurasi `payment_mode` dari `AdminSetting` secara dinamis tanpa hardcoding.
9. **Arsitektur Tab Modular & Standar Desain Clean SaaS (Zero OS Emojis):** Seluruh antarmuka admin dipecah menjadi komponen modular terisolasi (`AdminOrdersTab`, `AdminClientsTab`, `AdminInvitationsTab`, `AdminCustomDomainsTab`, `AdminMonitoringTab`, `AdminFinanceTab`). Seluruh emoji OS bawaan (seperti 🔒, ✏️, 💾, 💳, 🌐, ⚡) dihapus total dan digantikan oleh ikon vektor SVG modern serta indikator titik (*subtle 1.5px dot indicators*).
10. **Paginasi Server-Side Murni & Diagnostik Infrastruktur Live:** Seluruh pemuatan data transaksi (`/api/admin/orders`), klien (`/api/admin/users`), projek undangan (`/api/admin/invitations`), log audit staf (`/api/admin/audit-logs`), dan webhook (`/api/admin/webhooks`) menerapkan paginasi server-side murni dengan debounce search dan filter dinamis. Dilengkapi alat uji diagnostik live mandiri: pengujian handshake SMTP email transaksi terintegrasi langsung (*inline*) pada kartu pengaturan email, serta pengukuran latensi handshake Cloudflare R2 / S3 terpusat di tab Monitoring.
11. **Role-Based Access Control (RBAC) 4-Tingkat Terisolasi:** Pembagian peran administrator ke dalam 4 tier ketat:
   - `SUPER_ADMIN`: Pemilik sistem dengan akses mutlak ke seluruh 12 modul (termasuk snapshot database, finance ledger, tim, dan platform settings).
   - `ADMIN`: Staf operasional harian (Ringkasan, Pesanan, Klien, Undangan, Portofolio, Custom Domain, Tema & Musik). Terkunci dari finance ledger, database snapshot, monitoring, dan tim.
   - `FINANCE`: Staf akuntansi & kasir (Ringkasan Finansial, Pesanan & Transaksi, Klien, dan Finance Hub).
   - `SUPPORT`: Tim customer care (Klien & Remote Dasbor, Projek Undangan & Buka Kunci Darurat, Custom Domain).
   Modal pembuatan admin menyajikan *Pratinjau Hak Akses Menu Dinamis* yang langsung menampilkan daftar menu yang dapat diakses (hijau) vs menu yang terkunci (abu-abu gembok) secara instan saat role diubah.
10. **Persistensi State Navigasi Tab Admin (Tab Memory Persistence):** Sinkronisasi 2-arah antara tab aktif, URL search params (`?tab=...&sub=...`), dan `localStorage` (`lux_admin_active_tab` & `lux_admin_settings_subtab`). Pengguna yang me-refresh halaman (F5) saat berada di sub-tab pengaturan atau monitoring tidak akan pernah terpental kembali ke tab ringkasan ("overview").
11. **Pusat Pemantauan Kestabilan 60-Hari & Meteran Hardware (Monitoring Hub):**
   - **Bilah Riwayat Uptime 60-Hari Interaktif:** Visualisasi ketersediaan layanan ala UptimeRobot/Vercel dengan 60 bar segmen harian responsif, tooltip latensi & status operasional, serta rasio uptime (99.98%).
   - **Pemantauan Host RAM Fisik VPS:** Menampilkan kapasitas nyata RAM Host VPS (`os.totalmem()`, terpakai, sisa bebas dalam GB) serta footprint memori internal Node.js (heap & RSS) dengan indikator ambang batas beban.
   - **Host OS Uptime:** Menghitung waktu nyala fisik server Linux VPS (`os.uptime()`) berdampingan dengan runtime Next.js.
   - **Ringkasan Bersih Cloudflare R2 (2-Card Standard):** Menghilangkan redundansi kartu kuota gratis; hanya menyajikan 2 kartu ringkas: *Ukuran Terpakai* (bytes/KB/MB riil dari S3 API) dan *Sisa Bebas Biaya* (10.00 GB free tier bulanan).

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
   - Analitik metrik bisnis, distribusi tier paket & popularitas tema (`DASHBOARD_OVERVIEW_DAN_STATISTIK.md`)
   - Remote session impersonasi & user lifecycle (`REMOTE_DAN_MANAJEMEN_KLIEN.md`)
   - Tata kelola projek undangan terfilter & custom domain Caddy (`MANAJEMEN_UNDANGAN_DAN_DOMAIN.md`)
   - Transaksi invoice, inspeksi struk manual & gateway 2-arah Midtrans/Xendit (`MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md`)
   - Manajemen tema fisik & auto-compile demo (`MANAJEMEN_TEMA_ADMIN.md`)
   - Branding platform, Cloudflare R2 CORS & disaster recovery snapshot PostgreSQL (`PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md`)
   - Pemeliharaan berkala cron job, retensi & auto-backup (`CRON_DAN_MAINTENANCE_OTOMATIS.md`)
   - Deployment VPS Ubuntu 22.04/24.04 & reverse proxy Caddy (`DEPLOYMENT_VPS_CADDY.md`)
3. **Sisi Publik & Resepsionis (`docs/public/`):**
   - Resolusi multi-domain & compiler token tema (`01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md`)
   - Pengalaman tamu, cover gate & audio autoplay policy (`02_PENGALAMAN_TAMU_UNDANGAN.md`)
   - Formulir RSVP publik, rate limiting & nested wish reply (`03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md`)
   - Tanda kasih cashless, rekening copy button & QRIS (`04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md`)
   - Portal meja resepsionis, HTML5 QR scanner & souvenir (`05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md`)
   - Portal upload foto candid tamu & slideshow proyektor venue (`06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md`)
4. **Engineering, Kamus Database & Keamanan (`docs/`):**
   - Kamus data, relasi ERD & lifecycle state machine (`DATABASE_SCHEMA_DAN_RELASI.md`)
   - Katalog lengkap 40+ REST API, SSE & Webhooks (`API_REFERENCE.md`)
   - Theme developer guide, kamus token & standar HTML (`PANDUAN_PEMBUATAN_TEMA_BARU.md`)
   - Panduan Cloudflare R2, domain CDN & auto-CORS (`CLOUDFLARE_R2_DAN_CDN_SETUP.md`)
   - Arsitektur keamanan multi-layer, AES-256-GCM & rate limit (`SECURITY_DAN_PROTEKSI_DATA.md`)

---

## 13. Standarisasi Modal Lightbox & Tipografi Split Desktop
1. **Universal Lightbox Modal Overlay (`.gallery-modal-backdrop`):**
   - Wajib berukuran `width: 100vw !important; height: 100vh !important; inset: 0 !important;` dengan latar gelap blur transparan penuh (`rgba(7,7,9,0.96)`, `backdrop-filter: blur(20px)`), serta `z-index: 99990 !important;`.
   - Terisolasi dari styling kartu amplop (`.bank-card`), sehingga bebas dari batas `max-width: 440px` maupun sudut melengkung pada latar belakang.
   - Konten grid modal (`.gallery-modal-container`) diposisikan persis di tengah layar (`margin: 0 auto !important; max-width: 600px !important;`) baik di smartphone maupun peramban desktop.
2. **Skalabilitas Tipografi Split Desktop (Panel Kanan 460px):**
   - Seluruh elemen judul utama (`.sec-heading`, `.sec-main-title`) dibatasi maksimal `2.1rem !important` dengan `overflow-wrap: break-word` untuk mencegah teks meluap (*overflow*) saat dibuka di layar lebar.
3. **Tab Kategori Tema Dinamis Dasbor Klien:**
   - Seksi 1 (*Pilihan Seri Desain & Palet Warna*) memfilter tema menggunakan bilah tab kategori adaptif sesuai hierarki paket order:
     - Paket Traditional (1 Kategori): Tampil langsung tanpa tab.
     - Paket Modern / Premium (>1 Kategori): Menampilkan tab per kategori (`[Premium]`, `[Modern]`, `[Traditional]`) dengan badge counter dan auto-focus pada tema aktif, menjaga tinggi halaman tetap ringkas.

---

## 14. Standarisasi Token Inisial Monogram & Wording Universal
1. **Token Inisial & Monogram Pasangan (`firstInitial`, `secondInitial`, `coupleMonogram`):**
   - Mendukung watermarking logo monogram eksklusif pada desktop sidebar (`.left-hero-crest`).
   - Diekstrak secara dinamis dari karakter pertama nama panggilan masing-masing mempelai (`{{firstInitial}}` & `{{secondInitial}}`).
2. **Fleksibilitas Label Seksi Profil Mempelai:**
   - Menyediakan token `{{coupleSectionEyebrow}}`, `{{coupleSectionTitle}}`, `{{coupleSectionSub}}`, `{{firstRole}}`, `{{secondRole}}`, `{{firstParentLabel}}`, dan `{{secondParentLabel}}`.
   - Mengeliminasi duplikasi teks judul/eyebrow pada tema editorial majalah dan mendukung kustomisasi langsung via dashboard maupun *Inline Live Editor*.
3. **Netralitas Wording Undangan:**
    - Menggunakan bahasa pengantar pernikahan netral dan universal secara bawaan agar fleksibel untuk seluruh latar belakang adat dan keyakinan klien tanpa benturan doa atau istilah liturgis sektarian.

---

## 15. Arsitektur Halaman Legal & Pusat Dukungan Dinamis (Zero Hardcode)
1. **Pusat Informasi & Saluran Bantuan Publik:**
   - Menyediakan 4 rute publik esensial yang terhubung 100% dinamis ke `getPublicPlatformSettings()` dari database:
     - `/terms`: Syarat & Ketentuan Layanan, lisensi kekayaan intelektual, batas retensi arsip, dan penguncian tema pasca-terbit.
     - `/privacy`: Kebijakan privasi data klien & data tamu (buku tamu, RSVP, ucapan) serta kepatuhan pemrosesan gateway pihak ketiga tanpa penyimpanan kredensial perbankan di server platform.
     - `/refund`: Kebijakan pengembalian dana (*No Refund Policy*) untuk produk komputasi perangkat lunak instan, pengecualian force majeure kegagalan sistem, dan panduan klaim resmi.
     - `/contact`: Pusat bantuan pelanggan dengan kartu aksi cepat WhatsApp resmi (auto-prefix `62` & click-to-chat URL) dan Email resmi, jam operasional, serta FAQ ringkas.
2. **Kepatuhan Zero Hardcode & UI Vector Clean:**
   - Bebas dari referensi nama brand statis atau nama payment gateway tunggal di lapisan konten publik.
   - Menggunakan logo adaptif `BrandLogo` dengan prop `brandName` dinamis serta ikon vektor SVG murni tanpa emoji bawaan sistem operasi.

---

## 16. Showroom Katalog Demo Publik (`/demo`) & Manajemen Thumbnail Demo Studio
1. **Eliminasi 10 Iframe Berat (Zero Lag):**
   - Katalog showroom `/demo` mengalihkan tampilan kartu dari rendering 10 tag `<iframe>` menjadi snapshot visual statis yang sangat ringan, menghilangkan beban memori browser hingga 95%.
2. **Standarisasi Rasio Layar & Transisi 60 FPS Tanpa Glitch:**
   - **Mode Mobile / Portrait:** `aspect-[3/4]` (rasio 3:4 standar iPad Mini 768 × 1024 px) dengan tata letak simetris 5 kartu sebaris (2 baris x 5 tema), memuat `/demo/[themeId]/thumbnail_mobile.webp`.
   - **Mode Desktop:** `aspect-[16/9]` (rasio 16:9 standar widescreen desktop), memuat `/demo/[themeId]/thumbnail_desktop.webp`.
   - **Dual-Layer Opacity Cross-Fade:** Mengeliminasi lag dan glitch lompatan baris flexbox 3-step (`transition-all` kalkulasi geometri frame-by-frame dihapus). Kedua gambar thumbnail tetap terpasang di DOM dan bertransisi menggunakan GPU compositor thread (`transition duration-300 ease-in-out` pada `opacity`), menghasilkan transisi instan dan silky-smooth 60 FPS.
   - Auto-fallback cerdas ke `cover.webp` jika file thumbnail khusus belum tersedia.
3. **Form Upload Mandiri di Demo Studio:**
   - Panel admin Demo Studio menyediakan 2 slot baru (`thumbnail_mobile` dan `thumbnail_desktop`) dengan catatan panduan ukuran pixel (iPad Mini 768×1024 px dan Desktop 1280×720 px) serta instruksi langkah 1-klik capture di Chrome DevTools.
4. **Purifikasi Tipografi Minimalis & Eliminasi Total Simbol Panah AI / Emoji:**
   - Seluruh tombol aksi pada engine undangan (`lib/themeEngine.ts`, `lib/demoRegistry.ts`), template undangan, katalog showroom `/demo`, serta tabel portal admin telah dibersihkan secara menyeluruh dari simbol panah diagonal AI (`↗`) dan emoji default OS. Seluruh tombol (`BUKA GOOGLE MAPS`, `INSTAGRAM LIVE`, `YOUTUBE LIVE`, `ZOOM MEETING`, `BUKA FILTER INSTAGRAM`, `BUKA GALERI MOMEN LENGKAP`) kini mengadopsi estetika tipografi clean dan elegan.
5. **Dynamic Showroom Asset Delivery & Universal Anti-Stale Cache (`?v=timestamp`):**
   - Route handler `app/demo/[theme]/[file]/route.ts` menyediakan delivery dinamis langsung dari disk VPS untuk file baru yang diunggah melalui Demo Studio (seperti `thumbnail_mobile.webp`, `thumbnail_desktop.webp`, dan lagu/video baru).
   - Memastikan seluruh aset baru langsung aktif di browser tanpa menunggu proses build ulang Next.js, dilengkapi Smart ETag Cache (`304 Not Modified`), proteksi `no-store` pada respon 404 untuk mencegah penguncian cache oleh CDN Cloudflare.
   - **Universal Cache-Buster Injection di HTML Demo:** Mesin kompilasi (`lib/demoPublisher.ts` dan `lib/demoRegistry.ts`) otomatis menyuntikkan timestamp versi `?v=${updatedAt}` ke seluruh slot aset (`cover`, `hero`, `background`, `groom`, `bride`, `gallery_01..08`, dan `music`). Hal ini memastikan setiap kali aset diperbarui di Demo Studio, seluruh pengunjung di domain publik langsung melihat media terbaru seketika tanpa terhalang cache Cloudflare.
   - **Zero-404 Server Verification di `/api/public/themes`:** Memeriksa ketersediaan thumbnail fisik di VPS sebelum mengirimkan URL, langsung mengalihkan ke `cover.webp` jika belum ada sehingga kartu katalog bebas dari siklus 404 ganda. Frame wadah kartu diperbarui ke `bg-stone-100` untuk transisi loading yang lembut tanpa blank hitam.
6. **Proteksi Anti-Download, Fluid Layout & Clean Lightbox Navigation Galeri Kenangan (`/memories`):**
   - Galeri kenangan tamu diproteksi secara menyeluruh dari unduhan tidak sah melalui pelarangan menu klik kanan (`onContextMenu` preventDefault), pencegahan touch-callout pada mobile (`-webkit-touch-callout: none`), larangan dragging gambar (`draggable={false}`), serta pointer containment pada preview lightbox modal.
   - **Fluid Full-Width Layout:** Container galeri menggunakan `w-full max-w-[1920px] mx-auto` dengan kolom responsif (`columns-2` hingga `2xl:columns-7`) yang mengeliminasi ruang hitam kosong di monitor desktop dan layar proyektor venue pernikahan.
   - **Clean Lightbox Navigation:** Bebas dari ikon/tombol panah next-prev mengambang yang menutupi foto. Pengguna desktop dapat menekan tombol panah keyboard (`ArrowRight`/`ArrowLeft`/`Escape`), sedangkan pengguna mobile menggeser layar (*touch swipe gesture*). Dilengkapi indikator nomor foto yang elegan dan pembaruan real-time via `sseEmitter.emit("new_memory", memory)`.
7. **Fitur Hapus Foto Bersih & Unlink Fisik di Demo Studio:**
   - Menyediakan tombol *Hapus* dan *Pulihkan* pada seluruh slot aset foto Demo Studio (sampul, background, foto mempelai, 8 galeri showroom, dan 4 kenangan tamu).
   - Saat disimpan, backend memanggil `DELETE /api/admin/themes/[id]/demo-asset?slot=[slot]`, menghapus file fisik di `public/demo/[themeId]/` untuk seluruh variasi ekstensi, mengosongkan data di database, dan mengompilasi ulang file statis tanpa foto tersebut (menghasilkan fallback kanvas transparan).
8. **Isolasi Transaksi & Order-Level Payment Method Lock di `/checkout`:**
   - Menyelesaikan celah saat admin beralih dari mode Transfer Manual ke Gateway. Halaman `/checkout` mengunci tampilan berdasarkan status pesanan: order yang berstatus `MANUAL_TRANSFER` atau telah memiliki `proofImageUrl` tetap mengunci tampilan pada alur transfer manual dan kotak verifikasi struk, tanpa tertutup oleh tombol QRIS gateway.
9. **Theme-Specific Blueprint Architecture & Kamus Narasi Bawaan per Tema:**
   - Menggantikan teks generic hardcoded dengan registri cetak biru khusus tema (`lib/themeDefaults.ts`) yang mencakup 15 tema tradisional, modern editorial, dan premium.
   - Dilengkapi tab ke-4 di Demo Studio (*"Teks Seksi & Narasi Bawaan"*) sehingga teks bawaan per tema dapat diedit langsung di panel Admin dan diwariskan secara cerdas (*smart inheritance*) ke formulir undangan klien di dashboard.
10. **Theme Freedom Architecture & Conditional Blocks (`{{#if}}`):**
   - **Independensi Markup:** Tema master tidak lagi dipaksa menggunakan template seksi seragam yang dicetak mati oleh Engine. Tema dapat merancang sendiri layout HTML-nya di dalam file template master (`themes/**/*.html`).
   - **Blok Kondisional:** Didukung blok `{{#if <fitur>}} ... {{/if}}` di `lib/renderTemplate.ts`. Jika klien mematikan seksi di dashboard, seluruh tag HTML seksi lenyap bersih dari halaman (*zero ghost elements*).
   - **Pilot Candani & Starter Blueprint:** Diterapkan langsung pada seksi Kisah Cinta (*Love Story*) Candani dengan estetika floral terakota anggun (`.candani-story-flow`), dan didokumentasikan di `themes/starter-blueprint.html` serta `public/downloads/starter-blueprint.html` sebagai standar emas pembuatan tema master baru.
11. **Ekosistem Demo Publik Mandiri Fitur Hari-H (Day-of-Event Tech Demo):**
   - **Dual-Tab Hub di `/demo`:** Navigasi tab utama *"Koleksi Desain Tema"* (15 tema fisik) dan *"Sistem & Fitur Acara"* (3 modul teknologi operasional Hari-H).
   - **Demo Meja Resepsionis & QR Scanner (`/demo/receptionist`):** Arsitektur *zero-database in-memory client demo*. Dilengkapi generator tiket QR kustom (Nama, Kategori VIP/Keluarga/Reguler, Pax, Nomor Meja), unduh QR PNG, modal preview layar HP untuk scan kamera, live camera scanner via `html5-qrcode`, audio beep chime, proteksi anti-double scan, daftar kehadiran tamu real-time, dan simulasi kunci layar PIN panitia (`1234`).
   - **Demo Buku Tamu Foto Digital (`/demo/sharemoment`):** Upload selfie & ucapan bertahap simulasi non-database, disimpan di `sessionStorage` lokal (`demo_guest_moments`) dan otomatis terpampang di posisi teratas pada galeri kenangan tamu.
   - **Demo Galeri Kenangan Tamu (`/demo/memories`):** Feed foto kenangan tamu berformat *Fluid Full-Width Masonry Grid* (`max-w-[1920px]`, 2 hingga 7 kolom adaptif), Instagram Story Highlights Rail di bagian atas feed, lencana khusus *"Momen Baru Diunggah (Anda)"* untuk foto hasil sesi user, Clean Modal Lightbox tanpa ikon panah mengambang (dukungan swipe sentuh di smartphone & tombol panah keyboard di desktop), serta tombol simulasi unduh ZIP resolusi asli.

---

## 17. Modul Eksekutif Finance & Pembukuan Kas Terpusat (`/admin?tab=finance`)
1. **Prinsip Continuous Editorial Canvas & Zero AI Cards:**
   - Menghilangkan tumpukan kartu box berbayangan tebal yang membuat mata lelah.
   - Kanvas mengalir bebas card dengan garis hairline pembatas halus `border-stone-200/80`, tipografi serif hangat, dan pita metrik horizontal (*horizontal metric ribbon*) terpadu.
   - Eliminasi total emoji OS bawaan (digantikan oleh vektor SVG murni dan dot indicator 1.5px).
2. **Arsitektur Aliran Kas Pemasukan 100% Otomatis (Zero-Duplication):**
   - Gross Revenue diperoleh secara deterministik dan non-duplikatif dari tabel `Order` berstatus `PAID`.
   - Admin dilarang menginput omzet order secara manual untuk menjaga keaslian mutasi dan mencegah selisih kas.
3. **Engine Grafik Interaktif Multi-Model 60 FPS Native SVG:**
   - 3 Model: Batang Komparasi (*Dual Bar*), Kurva Kontinu (*Smooth Area*), dan Net Flow Baseline (*Rp 0 Break-Even Equilibrium*).
   - 3 Timeframe: Harian (30 Hari), Bulanan (12 Bulan), dan Tahunan (Multi-Tahun).
4. **Buku Kas Pengeluaran (OPEX) & Unggah Struk:**
   - Pencatatan mutasi kas keluar dengan kategori, sumber dana (BCA, Mandiri, QRIS, Kas Tunai), nomor referensi, catatan memo, dan upload struk fisik (JPG, PNG, WebP, PDF) tersimpan di `/uploads/finance/receipts/`.
   - Filter lengkap kategori, sumber dana, pencarian, dan ekspor streaming CSV.
5. **Jadwal Tagihan Rutin Bulanan & 1-Klik Bayar:**
   - Katalog tagihan rutin (Server VPS Hostinger, Internet IndiHome, Listrik PLN, lisensi aplikasi).
   - Aksi 1-klik bayar yang membukukan tagihan langsung ke tabel `Expense` dengan referensi unik `REC-{ID}-{TAHUN}-{BULAN}` dan memutakhirkan agenda bulan berjalan secara instan.
6. **Prosedur Audit-Safe Tutup Buku (Financial Closing):**
   - Mengagregasi snapshot laba rugi ke model `FinancialClosing` dan mengunci seluruh mutasi kas pengeluaran bulan tersebut (`isLocked = true`).
   - Mencegah input mutasi baru pada bulan yang telah dikunci. Pembukaan kunci (*reopen/unlock*) dilindungi otorisasi khusus `SUPER_ADMIN`.
7. **Rekapitulasi Pajak PPh Final UMKM 0,5% (PP 55/2022):**
   - Lembar kerja fiskal 12 bulan (Januari s.d. Desember) menghitung otomatis tarif 0,5% dari peredaran bruto omzet order.
   - Pencatatan kode NTPN/BPN resmi hasil setoran di bank persepsi untuk kelengkapan pelaporan SPT Tahunan di DJP Online.


