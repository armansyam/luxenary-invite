# S-Invitation: Luxenary Invite System Architecture & Master Specification
> **Versi: 5.7.5 | Diperbarui: 16 September 2026**

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
   - Side Navigation Floating Frosted Glass Card ala daftar isi majalah (*Table of Contents*) bernomor urut (01 Home s.d. 08 RSVP & Wishes), auto-height dengan backdrop click-outside dismissal, dan cover berlabel special issue.
   - Responsif 100% full-bleed di layar mobile/tablet dan desktop split-screen 460px.
3. **Aurelia (`themes/premium/aurelia.html`)**
   - Kanvas video sutra bergerak (*Video Canvas Backdrop*) dengan fallback poster.
   - Partikel kelopak bunga melayang lembut (*ambient petals*).
   - Kartu kapsul kaca frosted glass asimetris (32px radius).
4. **Artisan (`themes/premium/artisan.html`)**
   - Estetika tipografi atelier kontemporer dengan palet monokromatik hangat.
   - Transisi foto asimetris dan galeri grid editorial dinamis.
   - Multi-Layer Visual Slots: Layar Sampul Fullscreen Global Desktop, Fixed Parallax Background Layer (`globalBgUrl`), Seksi Pembuka Khusus (`homePhotoCssUrl`), dan Penutup Adaptif Full-Height (`closingPhotoUrl`).

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
   - Mengusung keanggunan Pawikahan Ageng Keraton Jawi dengan dukungan penuh Dynamic Kraton Heritage Palette (`--jawa-gold`, `--jawa-gold-light`, `--jawa-dark`, `--jawa-card`, `--jawa-border`) berbasis `:root` tokens dan `color-mix(...)` selaras Candani.
   - Mengadopsi kanvas `.fixed-bg-layer` anti-lag iOS yang terkunci di dalam kolom layout wrapper 460px (tidak bocor ke background desktop).
   - Discrete Parents Architecture (`{{firstParentPrefix}}`, `{{firstFather}}`, `{{firstMother}}`, `{{secondParentPrefix}}`, `{{secondFather}}`, `{{secondMother}}`) lengkap dengan frame lengkung Jawa dan inisial monogram melayang.
   - Identifikasi seksi pembuka menggunakan ID `#home` yang kompatibel penuh dengan injeksi template engine (`homePhotoCssUrl` untuk kanvas bersih tanpa fallback tekstur jika kosong).
   - Integrasi seksi kisah `#story` (`{{storyItemsHtml}}`), ornamen pembatas kraton SVG murni tanpa emoji OS, Smart Bottom Dock dengan audio toggle terintegrasi (`luxToggleAudio()`), serta modal voucher souvenir QR (`#modalBg`).
   - Terpasang atribut `data-lux-field` lengkap untuk mendukung pengalaman Live Visual Studio Click-to-Edit.
6. **La Galigo (`themes/traditional/lagaligo.html`)**
   - Kemegahan Etnik Adat Bugis-Makassar berbalut Deep Emerald (`#003f30`), aksen Emerald Rich (`#059669`), dan kilau benang emas sutera Bugis (`#f9e7bc` / `#e5cb93`).
   - Pola ornamen tenun geometris khas Bugis (*cross-hatch lattice pattern* via CSS murni terisolasi).
   - Bingkai empat sudut emas klasik (*four-corner traditional filigree frames*) pada kartu mempelai dan kutipan ayat.
   - Arsitektur Desktop Split 460px presisi (Fixed Left Hero wallpaper + Right 460px mobile emulation panel).
   - Terintegrasi penuh dengan seluruh section Luxenary: Cover Pop-up reveal berbalut **Amplop 3D Interaktif (Click-to-Open Diamond Envelope Sleeve)** presisi 220px dengan segel lilin emas inisial mempelai, kartu tamu yang menyembul dari dalam kantung saat dibuka, dan tombol teks murni 'BUKA UNDANGAN'; Slide Pembuka Opening Hero `#home` (100vh / 100dvh standalone) berbalut Bismillah & Ayat Suci, Mempelai, Save the Date & Countdown, Rangkaian Acara, Love Story, Galeri Foto & Video, Rekening Digital Gift, Live RSVP & Buku Tamu, QR Receptionist check-in, dan Floating Navigation & Audio Dock.
   - Mengadopsi standar arsitektur **Zero-Fake Fallback & Infinite Seamless Flow**: kanvas scroll transparan tanpa border potongan (`border-bottom: none;`), serta footer penutup adaptif yang murni 100% transparan saat tanpa foto penutup (`no-closing-photo` $\rightarrow$ `background: transparent; border-top: none;` tanpa scrim overlay). Hal ini menjamin kanvas warna dasar Emerald Deep dan motif tenun sutra Bugis mengalir utuh dari atas hingga ujung bawah layar.
   - Terintegrasi dengan tipografi aksara otentik Bugis **Lontara** (`public/fonts/Lontara.ttf`) sebagai aksen budaya luhur: ungkapan *Salama'* di Cover, Hero Sidebar, dan Footer, simbol *Botti'* di Seksi Mempelai, serta petuah sakral perkawinan *Sipakatau, Sipakalebbi, Sipakainge* di kartu kutipan pembuka.
   - Mengadopsi **Dynamic Palette Tokens 100% Bebas Hardcode** (`color-mix(...)`, `var(--bg-dark)`, `var(--primary)`, `var(--accent)`): seluruh layer gradasi cover overlay, sidebar hero desktop, amplop interaktif, form RSVP, dan kartu mengalir reaktif mengikuti palet showroom yang aktif tanpa warna mati.

### C. Modern Series (`themes/modern/`)
1. **Wave (`themes/modern/wave.html`)**
   - Kurva lengkung dinamis (*organic fluid waves*) dengan aksen gradasi halus.
2. **Papercut (`themes/modern/papercut.html`)**
   - Kertas karton kraft daur ulang fisik dengan jahitan garis putus-putus (*2px dashed stitch*).
   - Foto cetak polaroid miring ($-2^\circ$ dan $+2^\circ$) dengan aksen washi tape.
3. **Ameera (`themes/modern/ameera.html`)**
   - Tipografi minimalis modern dengan layout kartu bersih dan palet dusty rose.
4. **Chronicle (`themes/modern/chronicle.html`)**
   - Gaya jurnal editorial majalah eksklusif dengan tipografi Times-style masthead. Mengusung struktur slot visual presisi: Dynamic Desktop Sidebar (`{{sidebarPhotoUrl}}`), Cover Pop-up (`{{landingCoverUrl}}`), Slide Hero Pembuka Editorial `#home` (`{{homePhotoCssUrl}}`), dan Wallpaper Kanvas `.fixed-bg-layer` yang fokus presisi di kolom undangan 460px (`{{globalBgUrl}}`). Kanvas Home bersih tanpa menimpa foto tekstur demo saat slot dikosongkan.
5. **Lumina (`themes/modern/lumina.html`)**
   - Pencahayaan prisma lembut (*soft glow lens flares*) dengan layout ultra-modern.
6. **Solaria (`themes/modern/solaria.html`)**
   - Nuansa hangat terik matahari senja (*warm sunset aesthetics*) & kartu transparan.

### D. Developer Blueprint
- **Starter Blueprint (`themes/starter-blueprint.html` & `public/downloads/starter-blueprint.html`)**
  - Standar acuan struktur tag, layout split 460px, seksi pembuka 100vh (`#home` / `.slide-opening`), floating navigation dock, dan placeholder baku untuk para Theme Builder dan desainer tema baru.
- **Theme Blueprint Guide (`themes/BLUEPRINT_GUIDE.md`)**
  - Panduan master resmi untuk perancangan tema baru: aturan Zero Hardcode Text & Dynamic Palette Token, kamus lengkap token dinamis (`{{openingGreeting}}`, `{{coverBadge}}`, `{{quoteSectionEyebrow}}`, `{{quoteSectionTitle}}`, dll.), aturan atribut binding dua arah (`data-lux-field`), serta SOP 5-langkah registrasi tema baru ke engine database.

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
Seluruh 16 tema fisik master dan starter blueprint mengimplementasikan standarisasi tata letak split layar desktop (breakpoint `≥ 900px` atau `≥ 1024px`):
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
   - Arsitektur Golden Standard split 460px, seksi pembuka 100vh `#home`, dan aturan tipografi anti-overflow telah dibundel secara bawaan ke dalam cetak biru developer untuk memudahkan para Theme Builder menciptakan tema baru tanpa perlu mendesain ulang sistem layout desktop.
7. **Smart Auto-Hide Navigasi Dock & Floating Audio (`initSmartDock` / `initSmartControls`):**
   - Seluruh 16 tema mengadopsi mekanisme auto-hide pintar hardware-accelerated (`translate3d` & `opacity`).
   - Saat tamu menggulir ke bawah untuk membaca atau menikmati konten, dock dan tombol musik mengambang meluncur keluar layar secara serentak demi menghadirkan viewport yang 100% bersih dan imersif.
   - Saat tamu menggulir ke atas (delta $\ge$ 12px), berada di posisi paling atas (`scrollTop <= 70px`), mencapai footer, atau menekan menu navigasi, seluruh kontrol mengambang otomatis meluncur masuk kembali dengan transisi lembut (`cubic-bezier(0.16, 1, 0.3, 1)`).

### G. Arsitektur Preloader Hibrida & Anti-Visual Leak Guard
Sistem mengimplementasikan proteksi pembuka dua tingkat (*Hybrid Preloader Architecture*) untuk mencegah bocornya lapisan isi undangan sebelum aset gambar cover pembuka selesai diunduh:
1. **Prioritas Preloader Master (`id="themePreloader"`):**
   - Jika tema master memiliki elemen berkontrak `id="themePreloader"`, engine **TIDAK** menyuntikkan preloader bawaan, memberikan keleluasaan penuh bagi desainer untuk menciptakan animasi dan ornamen khas tema.
2. **Injeksi Preloader Universal (Fallback Mewah Bawaan Engine):**
   - Jika tema tidak memiliki `id="themePreloader"`, engine otomatis menyuntikkan Universal Preloader berlatar obsidian (`#0c0c0e`, z-index 999999) yang berfokus murni pada inisial monogram tipografi editorial mewah (*Native Luxury Serif Didot/Georgia*) yang melekat sejak milidetik ke-0 (`{{firstInitial}} & {{secondInitial}}`) dengan margin vertikal terkalibrasi (24px) di atas bilah progres berkilau (*golden shimmer bar*). Elemen nama lengkap panjang ditiadakan di fase splash ini guna menjamin zero-line-break pada nama panjang/gelar akademik serta memberikan ruang bernapas visual (*breathing room*) yang tenang.
3. **Solid Backdrop Guard:**
   - Seluruh selektor cover pembuka diproteksi dengan `background-color: #0c0c0e !important;` sehingga peramban tidak pernah menampilkan latar tembus pandang ke seksi di bawahnya.
4. **Universal Client Dismissal Driver (`initPreloaderGuard`):**
   - Runtime klien di `lib/renderTemplate.ts` menghitung durasi sejak first paint. Begitu gambar cover selesai di-decode (`landingCoverUrl`), preloader ditahan hingga genap memenuhi **durasi minimal 1.2 detik (1200ms)** agar tamu sempat menikmati monogram dan kilau emas tanpa terburu-buru.
   - Setelah durasi minimal tercapai, preloader memudar mulus via `.preloader-hidden` (transisi opacity 600ms) dan dicopot dari DOM (`remove()`).
   - Dilengkapi *Safety Timeout 2.5 Detik (2500ms)* agar pengunjung dengan koneksi lambat tidak pernah terhenti di layar preloader.
5. **Keamanan 100% Publikasi (Baked Standalone Safe):**
   - Saat undangan diterbitkan melalui `staticPublisher.ts`, seluruh struktur preloader, CSS inline, dan runtime dismissal di-bake secara permanen ke dalam file HTML mandiri (`data/published/ids/{id}.html`), menjamin performa instan tanpa flicker di semua platform hosting.

### H. Dual-Native Studio & Master Catalog Architecture

**File Kunci:** `themes/*.html`, `lib/renderTemplate.ts`, `lib/themeDefaults.ts`, `app/(client)/dashboard/invitation/[id]/page.tsx`

Sistem Studio Editor Klien dan Admin dirancang dengan arsitektur **Dual-Native Mode** yang menyatukan kenyamanan pengisian data formulir dengan pratinjau real-time pada template master katalog resmi:

1. **Dual-Native Studio Switcher & Real-time Synchronization:**
   - **Tab 1: Form Data (`form`):** Antarmuka input data terstruktur mencakup 15 seksi undangan (Pasangan, Acara, Cerita Cinta, Galeri, Tanda Kasih, Musik, Pengaturan Tampilan, Label UI).
   - **Tab 2: Live Editor (`live`):** Simulator dual-view interaktif (Mobile Phone Mockup 380px & Desktop Widescreen Mockup) yang ter-mount secara persisten di DOM (`style.display`).
   - **Two-Way Scroll Sync:** Pengguliran pada salah satu viewport menggerakkan viewport pasangan secara proporsional dengan proteksi anti-echo guard dan normalisasi container scroll (window vs `.right-panel`).
   - **Form Keystroke Live Projection:** Setiap pengetikan pada input formulir dasbor langsung diproyeksikan seketika ke elemen `[data-lux-field]` di kedua iframe tanpa perlu simpan atau refresh.
   - **Universal Envelope Open Sync:** Tombol *"Buka Undangan"* di dalam iframe manapun maupun tombol *"Buka Amplop"* di toolbar dasbor membuka sampul kedua layar secara serentak di semua tema.
   - **Zero-Reload Tab Switching:** Peralihan antara Form Data dan Live Editor berlangsung instan tanpa reload, menjaga integritas status amplop dan draft sementara.

2. **Master Catalog Template Engine (16 Tema Fisik):**
   - Setiap tema merupakan template HTML/CSS/JS mandiri di direktori `themes/{kategori}/{nama}.html` (Modern, Tradisional, Minimalis, dsb.).
   - `lib/renderTemplate.ts` mengeksekusi injeksi data dinamis klien ke dalam placeholder token template master dengan keamanan XSS escaping, CSS token palet dinamis, serta integrasi Smart Dock & Hybrid Preloader.

3. **Injeksi Blueprint Aman & Zero-Bespoke Isolation:**
   - Tidak ada ketergantungan pada blok puzzle eksperimental atau builder dinamis terpisah.
   - Semua tema katalog teruji secara visual di viewport mobile, tablet, dan desktop widescreen dengan layout split desktop elegan.

### I. Standar Editorial Luxury Typography & Eliminasi Panah AI (Landing Page & CTA)
1. **Clean Editorial Button Standard (`btn-primary`, `btn-secondary`, `btn-cta`):**
   - Menghilangkan total seluruh SVG panah generik bawaan AI (`M2 7h10M7 2l5 5-5 5`) dan karakter literal `→` pada seluruh tombol aksi primer dan tautan CTA halaman utama.
   - Mengunci aturan `white-space: nowrap;` dan `justify-content: center;` pada seluruh tombol kapsul untuk mencegah patahnya teks menjadi dua baris (*unwanted multiline wrap*) di layar smartphone kecil.
   - Merampingkan microcopy dari kalimat terjemahan mesin kaku (*"Pelajari Cara Kerja Lengkap"*) menjadi microcopy tegas editorial (**"Pelajari Cara Kerja"**).
   - Menyesuaikan batas kaku mobile (`max-width: 280px` / `260px`) menjadi lebar fleksibel ergonomis sentuhan jempol (`width: auto; min-width: 210px; max-width: 300px; padding: 0.85rem 1.8rem;`).
2. **Alternating Zig-Zag Showcase & 3D Isometric Mirroring (Seksi Pengalaman):**
   - Menyelaraskan ritme visual panggung halaman utama menjadi selang-seling berimbang (A - B - A): Koleksi (Mockup Kanan), Studio Mandiri (Mockup Kiri), Pengalaman (Mockup Kanan).
   - Memindahkan teks narasi ke sisi kiri untuk membebaskannya dari tabrakan visual dengan tubuh kedua mempelai pada background foto `pengalaman_bg.webp`.
   - Mengalibrasi rotasi 3D iPad ke `rotateY(-14deg) rotateX(8deg) rotateZ(-1deg)` dan bayangan `-25px 35px 80px` agar layar menatap ke arah teks di kiri panggung, serta menyelaraskan mousemove parallax controller di frontend.

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
4.1. **Live View Real-Time Palette Synchronizer (Two-Way Sync):**
   - **Panel 6 Palet Warna di Atas Kanvas Live View:** Klien dapat langsung mengganti nuansa tema utama di tab Live View tanpa harus bolak-balik ke tab form edit data.
   - **Injeksi CSS Seketika & PostMessage:** Perubahan warna diaplikasikan instan ke preview iframe melalui manipulasi token CSS (`--gold`, `--primary`, dll.) dan pesan `LUX_PALETTE_CHANGED`.
   - **Sinkronisasi Otomatis dengan Seksi 1:** Tetap mempertahankan pemilih palet warna di Seksi 1 formulir data dengan status aktif dan penyimpanan yang selalu sinkron.
4.2. **Ultra-Slim Exclusive Accordion & Clean Preview Routing:**
   - **Exclusive Single-Expanded Mode:** Membuka salah satu seksi formulir secara otomatis menutup seluruh seksi lainnya (`single-expanded exclusive accordion`), membebaskan klien dari kelelahan *scrolling* panjang pada 15 seksi formulir.
   - **Header Ultra-Slim (~48px) & Eliminasi Blok Redundan:** Menghilangkan blok preview sekunder yang berulang di bawah kartu seksi, memangkas tinggi halaman formulir tertutup dari **4.101px** menjadi **~750px** (pas dalam 1 layar desktop penuh). Dilengkapi ringkasan *muted inline summary snippet* di samping judul seksi dan *full-row clickability*.
   - **Clean Preview Mode Routing (`mode=preview`):** Tombol *"Buka di Tab Baru"* dan navigasi pratinjau layar proteksi mengarahkan ke `mode=preview` murni tanpa widget floating atau panel editor yang menghalangi pandangan.
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
9. **Portal Resepsionis & QR Scanner (`/receptionist`)**:
   - Mendukung akses melalui Subdomain (`namapasangan.domain/receptionist`), Canonical Slug (`/[slug]/receptionist`), dan Custom Domain (`customdomain.com/receptionist`).
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
   - Dukungan video background loop untuk `LANDING_COVER` (Cover HP portrait 9:16), `LANDING_COVER_DESKTOP` (Cover desktop landscape 16:9 fullscreen), `DESKTOP_SIDEBAR` (Hero desktop), dan `GLOBAL_FIXED_BG` (Latar kartu).
   - Format input: MP4, MOV (kamera iPhone), WebM.
   - Pemotongan otomatis maksimal 20 detik pertama (`-t 20`).
   - **True Seamless Crossfade Looping:** Menggunakan filter `xfade` (0.6s–1.2s) yang memadukan ekor video dengan kepala video secara transparan sehingga frame awal dan akhir 100% identik, menghasilkan pengulangan video mulus tanpa jump-cut patah.
   - Mode senyap (*Silent Loop*): Menghapus track audio (`-an`) untuk menghemat file ~20% dan menjamin pemutaran otomatis (*autoplay*) tanpa hambatan di iOS Safari dan Android Chrome.
   - Pembatasan frame rate ke 30 fps (`-r 30`) untuk efisiensi GPU dan memberikan efek gerak sinematik filmis.
   - Proteksi ukuran file berlapis dinamis: dikontrol melalui Admin Setting (default 50MB hingga 100MB untuk video Studio, dan 15MB untuk foto) dengan proxy body size limit Next.js 100MB.
   - Rendering engine otomatis menyuntikkan tag HTML5 `<video class="..." autoplay loop muted playsinline webkit-playsinline>` dengan overlay gradasi kontras tinggi.
4. **Arsitektur Dual Cover Responsif (Mobile 9:16 vs Desktop 16:9 Fullscreen Override):**
   - **Mobile (< 900px):** Selalu menggunakan `LANDING_COVER` (rasio portrait 9:16) sebagai pop-up sampul pembuka layar HP.
   - **Desktop (≥ 900px):** Menggunakan `LANDING_COVER_DESKTOP` (rasio landscape 16:9). Jika slot desktop tidak diunggah, sistem otomatis beralih (*graceful fallback*) ke `LANDING_COVER` bawaan.
   - **Universal Fullscreen Override:** Pada tema dengan layout panel-terbatas (seperti Badrika, Candani, Mayang, Solaria, Lumina, Chronicle) yang secara bawaan membatasi cover pada kartu fixed 460px, saat `LANDING_COVER_DESKTOP` aktif, sistem otomatis menyuntikkan CSS override `@media (min-width: 900px)` yang memposisikan cover menjadi fullscreen fixed 100vw/100vh di seluruh monitor tanpa mengubah kartu undangan di dalamnya.
5. **Cloudflare Edge Caching & Wildcard Subdomain:**
   - Subdomain otomatis `*.luxenary.id` (contoh: `dimas-clarissa.luxenary.id`).
   - Cache statis dengan `Cache-Control: public, max-age=31536000, immutable`.
   - Beban server 0% dan loading instan di HP tamu.
6. **Isolasi Seksi Home (`HOME_PHOTO`) & Container Flush Alignment:**
   - Slot `HOME_PHOTO` ("Latar Belakang Home (Opsional)") terinjeksi mandiri pada Seksi 1 (`.slide-opening#home`) dengan gradient overlay pelindung teks judul dan kutipan.
   - Jika slot kosong, seksi Home tetap transparan memperlihatkan latar belakang fixed global (video loop atau foto kanvas).
   - Eliminasi total celah bawah (*gap*) 90px/110px di bawah footer `.site-footer` melalui `public/css/modules.css` dan `renderTemplate.ts`, serta pendaftaran `footer, .site-footer, .closing-sec` ke CSS Scroll Snap (`scroll-snap-align: start; scroll-snap-stop: always;`) di `fonts.css` & `modules.css` sehingga footer 100vh menutup rapat ke dasar layar (*flush to bottom*) dan mengunci (*snap*) presisi tanpa memantul balik ke atas.
7. **Sinkronisasi Audio Otomatis & Gerbang Tombol Buka Undangan:**
   - Pemutaran musik latar disinkronkan langsung dengan tombol pembuka cover undangan (`.btn-buka`, `.btn-buka-undangan`, `.cover-btn-open`, dll.) sebagai *trusted user gesture* resmi browser.
   - Jembatan ID dinamis (`luxAudioPlayer`, `bgAudio`, `weddingAudio`) memastikan kompatibilitas penuh seluruh tema tanpa kegagalan audio null.
   - Dilengkapi fallback interaksi sentuhan pertama pasca cover terbuka dan isolasi otomatis untuk mencegah kebocoran audio pada pratinjau kartu katalog.
8. **Penyimpanan Media Klien & Standarisasi Deterministik (Zero Disk Waste):**
   - **Mode Draft 100% Fully Local:** Selama status undangan masih `DRAFT`, semua upload media (foto, video, musik) dipaksa disimpan di disk lokal VPS (`public/uploads/invitations/[id]/`) untuk menghemat biaya operasional API Write R2 dan mencegah akumulasi sampah dari draft coba-coba/batal.
   - **Dynamic Uploads Route Handler:** Seluruh aset `/uploads/*` disajikan secara dinamis via `app/uploads/[...path]/route.ts` dengan dukungan MIME types, cache-control, dan HTTP 206 Partial Content range streaming untuk video/audio sehingga tidak tertahan oleh freeze static manifest Next.js di mode produksi.
   - **Penamaan Deterministik Tanpa Date.now Fisik:** Seluruh slot memiliki nama file fisik tetap (misal `wedding-song.mp3`, `landing-cover.webp`, `home-photo.mp4`). Penggantian media kapan saja akan menimpa (*clean overwrite*) file lama secara otomatis tanpa penumpukan file yatim (*orphaned files*).
   - **Bust Cache via Query Parameter:** Cache browser diatasi pada level URL publik (`?t=${Date.now()}`), menjamin audio/video dan foto selalu ter-refresh seketika tanpa mengubah nama file fisik di storage.
   - **Migrasi ke R2 Saat Publish:** Fungsi `syncDraftToR2` memigrasikan seluruh media lokal ke Cloudflare R2 secara otomatis saat undangan diterbitkan.
   - **Invarian Pembersihan Total (Full Cleanup Invariant):** Saat undangan dihapus (misal via penghapusan klien di `DELETE /api/admin/users`), sistem wajib melakukan pembersihan 3 lapis: (1) `deletePublishedHtml` menghapus file canonical `public/published/ids/[id].html`, (2) menghapus file draft lokal `data/drafts/[id].html` jika ada, dan (3) menghapus direktori fisik `public/uploads/invitations/[id]/` secara rekursif (`rm -rf`). Salinan portofolio tidak terganggu karena telah disalin mandiri (*full static clone*) ke foldernya sendiri.

---

## 6. Siklus Hidup Undangan & Mesin Retensi Terpadu (Cron Cleanup)

Siklus hidup undangan diatur secara otomatis oleh cron job (`POST /api/cron/cleanup`) yang dilindungi `CRON_SECRET`:

1. **Dual-Mode Route Switcher (Peralihan ke Galeri Momen `/memories`)**:
   - Sistem secara cerdas mengalihkan URL publik (baik subdomain maupun custom domain) ke `/memories` berdasarkan dua mode:
     - **Mode AUTO (Default):** Otomatis beralih ke galeri momen pada H+1 pasca tanggal acara pernikahan paling akhir (`getLatestEventDate(eventData)`).
     - **Mode MANUAL:** Klien dapat menyalakan atau mematikan peralihan rute seketika melalui tombol toggle di Studio Editor Seksi 14 (`memoriesForceGallery`).
2. **Satu Jadwal Retensi Terpadu (Single Unified 14-Day Post-Event Lifecycle)**:
   - Seluruh komponen (Subdomain platform, Custom domain, Foto momen tamu di R2/lokal, dan RSVP) memiliki masa aktif yang sama dan dihitung dari tanggal acara paling akhir + `retention_cleanup_days` (default 14 hari).
   - Tamu dan pengantin dapat mengunduh seluruh koleksi foto kenangan dalam format ZIP via JSZip client-side tanpa membebani bandwidth VPS.
   - Klien dapat memperpanjang masa simpan sebelum kedaluwarsa melalui Add-on QRIS: **+30 Hari (Rp50.000)** atau **+1 Tahun (Rp150.000)**.
3. **Pembersihan Terpadu Sekali Jalan (Single Unified Cleanup Phase saat `now > effectiveExpiry`)**:
   - Seluruh foto kenangan tamu (`GuestMemory`) di Cloudflare R2 (`deleteFile`) dan direktori lokal `public/uploads/guest-memories/{id}/` dihapus permanen.
   - Subdomain dilepaskan kembali ke pool umum (`subdomain = null`) agar dapat digunakan kembali oleh pasangan lain.
   - Custom domain dinonaktifkan/dilepas.
   - Data formulir RSVP dibersihkan demi privasi tamu.
   - Status undangan diperbarui menjadi `ARCHIVED`.
4. **Kebijakan Nol Penghapusan Akun & Portofolio Abadi**:
   - **Zero Account Deletion:** Akun klien (`User`) di PostgreSQL tidak pernah dihapus (<1 KB). Klien dapat login kapan saja ke dasbor.
   - **Zero Portfolio Deletion:** Portofolio admin (`public/portfolio/`) adalah aset abadi yang tidak tersentuh oleh siklus retensi klien.
5. **Dasbor Klien 1 Halaman Rangkuman & Arsip Digital (`/dashboard` saat `ARCHIVED`)**:
   - Ketika undangan telah berstatus `ARCHIVED`, tampilan dasbor klien otomatis beralih menjadi 1 halaman memorial eksklusif:
     - Surat Penutup Hangat dan apresiasi kepada kedua mempelai.
     - 4 Kartu Metrik Ringkasan Eksekutif: Doa Restu Masuk, Tamu Hadir (Pax), Total Buku Tamu, dan Tanggal Acara.
     - Pusat Unduhan Arsip Digital: Unduh Rekapan Doa (.CSV) dan Unduh Rekapitulasi Kehadiran & RSVP (.CSV).
     - Bersih tanpa tombol "Buat Undangan Baru" dan tanpa tombol "Reaktivasi".
6. **Smart Fallback ke Portofolio / Beranda**:
   - Jika slug diakses saat undangan berstatus `ARCHIVED`, sistem memeriksa apakah salinan portofolio ada di `/portfolio/[slug]`.
   - Jika ada portofolio, otomatis dialihkan (*HTTP 307*) ke halaman portofolio sebagai arsip kenangan abadi.
   - Jika tidak ada, sistem langsung mengalihkan (*HTTP 302/307*) pengunjung kembali ke Halaman Utama (`/`) secara elegan tanpa memunculkan error 404.
4. **Pemisahan Desain & Operasional Galeri Kenangan Tamu**:
   - **Formulir Studio Editor (`/dashboard/invitation/[id]` Seksi 14):** Styling & konfigurasi seksi: Toggle aktif (`showGuestMemories`), Judul Seksi, Eyebrow, Deskripsi, Mode Pengambilan (Disposable Camera vs Standard Form), Pilihan 5 Filter Analog (`aura_90s`, `heritage_romance`, `botanical_mist`, `cinema_noir`, `pure_daylight`), Toggle & Format LED Date Stamp (`#e8875a`), Kuota Dinamis Tamu Pengunggah (`memoriesMaxContributors`), Jatah Roll per Tamu bebas hingga 30 foto (`memoriesShotsQuota`), Jadwal Kamera Aktif Mandiri, dan Toggle Kamar Gelap Digital (*Delayed Reveal*).
   - **Dashboard Klien (`/dashboard` Seksi 5 & Card 4):** Pusat operasional & monitoring momen tamu: tautan album kenangan, widget unduh arsip ZIP client-side, status kuota real-time, rincian masa simpan transparan (*Masa Aktif: Base Days (Default) + Perpanjangan (XH) : Tanggal Mulai s.d. Tanggal Expired*), tombol & modal *Atur Jatah Roll Tamu* dengan estimasi kapasitas dinamis `~Floor(Sisa_Pool / Jatah_Roll) Tamu`, dan *Unified Addon Modal* bertema Warm Editorial Ivory & Royal Amber Gold untuk top-up kuota foto (+100, +250, +500), perpanjangan masa galeri (+30 hari via QRIS), dan upgrade tier paket.
   - **Fitur Kamera Disposable Retro & Galeri Masonry Roll Stack (Opsi B):**
     - Foto dikompresi client-side Canvas menjadi WebP/JPEG ringan (~300KB) dengan filter analog terpilih dan cap tanggal oranye retro analog.
     - **Formula Kuota Acara, Invarian Anti-Hangus, & Smart Quota Boundary Guard:**
        - Kuota foto berpatokan pada Total Kuota Foto Acara (`memories_total_quota_{plan}`) dari Admin.
        - *Smart Quota Boundary Guard (Pembatas Kuota Multi-Sesi Real-Time):* Alokasi kuota per sesi di dasbor klien dibatasi otomatis (`Math.min(parsed, maxAllowed)`) terhadap sisa kuota yang belum dialokasikan ke sesi lain. Dilengkapi tombol toolbar *"Bagi Rata Kuota"* (membagi rata kuota ke seluruh sesi secara proporsional) dan *"Pakai Sisa (X)"* di tiap baris sesi. Backend API `/api/client/invitations/[id]/memories` menjamin validasi kuota server-side agar total alokasi tidak pernah melampaui `maxTotalPhotos`.
        - *Anti-Hangus (Non-Pre-Reservation):* Unggah foto berlangsung seketika per jepretan (*real-time snapshot*). Jika tamu hanya mengambil sebagian jatah roll (misal 3 dari 15 roll), sisa kuota roll-nya tetap berada di pool acara untuk tamu lain tanpa hangus.
        - *Boundary Clamping Tamu Terakhir:* Ketika sisa pool foto lebih sedikit dari jatah roll (misal tersisa 8 foto dengan setting 15 roll), sistem secara otomatis menerapkan `effectiveShotsQuota = Math.min(configuredShotsQuota, remainingPool)` sehingga tamu terakhir dapat menghabiskan kuota pool secara presisi tanpa error 403. Saat pool penuh 100%, tamu baru disajikan kartu status elegan *"Kuota Roll Kenangan Telah Penuh"*.
      - Galeri publik mengadopsi Masonry Roll Stack (1 card bertumpuk per tamu dengan badge jumlah foto dan ucapan doa tunggal), membuka modal popup lightbox interaktif untuk menelusuri seluruh foto dalam roll tersebut.
5. **Manajemen Domain Undangan & Hero Launchpad Publikasi (Buku Tamu / WhatsApp Broadcast)**:
   - **Hero Launchpad Publikasi (/dashboard/settings):** Bagian peluncuran ditingkatkan menjadi Hero Launchpad mandiri di bagian teratas panel pengaturan. Dilengkapi mode fokus penuh dengan animasi pemindai radar dan jendela *sliding ticker* vertikal (maksimal 3 baris tampak). Item yang selesai diverifikasi otomatis bergulir naik ke atas secara sekuensial memeriksa 12 komponen data: Subdomain, Tema, Visual Sampul & Latar Belakang (Landing Cover, Desktop Sidebar, Fixed BG, Foto Penutup), Nama Kedua Mempelai, Foto Profil Kedua Mempelai (The Groom & The Bride), Tanggal Acara Utama (sebagai referensi masa berlaku website), Waktu & Lokasi, Galeri Foto, Cerita Cinta, Rekening/Hadiah, Musik Latar, dan PIN Keamanan Tamu.
   - **Resolusi Hierarkis Domain (`resolveEffectiveInvitationUrl`):** Sistem otomatis mendeteksi dan memprioritaskan domain tautan undangan dengan urutan jujur: (1) Custom Domain Klien (`customDomain`), (2) Subdomain Platform (`subdomain`). Menghilangkan total tebakan slug palsu/halusinasi saat domain belum disetel.
   - **Proteksi Pengiriman Draft:** Jika undangan masih berstatus `DRAFT`, tombol Salin tautan dan tombol Kirim WhatsApp dikunci secara disabled dengan cursor `not-allowed` serta dilengkapi *floating hover tooltip* gelap elegan.
   - **Sinkronisasi Seketika Pasca-Publikasi (Zero-Cache):** Begitu status menjadi `PUBLISHED`, API `/api/client/invitations` mengirimkan `Cache-Control: no-store` dan seluruh halaman dasbor klien (`/dashboard`, `/dashboard/guests`, `/dashboard/settings`) menggunakan `{ cache: "no-store" }` sehingga tautan tamu `{link_undangan}` dan tombol WhatsApp langsung aktif seketika tanpa *caching lag*. Ditutup dengan Banner Selebrasi Resmi berbahasa formal-netral dan Official Launch Box dengan lencana SSL aktif.
6. **Studio Editor Master-Detail (15 Seksi), Zero Auto-Collapse & Smart Dynamic Gift Section:**
   - **Arsitektur Master-Detail Selalu Terbuka (*Zero Auto-Collapse*):** Panel form kustomisasi `/dashboard/invitation/[id]` menerapkan navigasi Master-Detail (sidebar navigator pada desktop & horizontal pills pada mobile). Seluruh seksi formulir selalu tersaji terbuka lebar (*always expanded*), menghilangkan tombol toggle akordion buka/tutup yang membingungkan. Ketika tombol "Simpan" ditekan, formulir tetap berada dalam kondisi terbuka (*zero auto-collapse*).
   - **Smart Dynamic Gift Section & Standar Penyimpanan QRIS (`lib/themeEngine.ts`):**
     - Berkas fisik QRIS disimpan di server pada `public/uploads/invitations/[id]/qris.webp` (WebP 800×800 px) dan dicatat pada `featureSettings.qrisImageUrl`.
     - *Hanya Digital (Rekening / QRIS):* Jika alamat kado dikosongkan, tab "Kirim Kado" dan kartu alamat otomatis disembunyikan 100% tanpa teks fallback dummy Makassar. Tamu langsung disajikan kartu rekening / scan QRIS tanpa tombol tab.
     - *Hanya QRIS (Tanpa Rekening Bank):* Jika pengantin hanya mengunggah QRIS tanpa rekening bank, sistem hanya menampilkan kartu QRIS murni tanpa menyisipkan kartu rekening BCA palsu.
     - *Hanya Kado Fisik:* Kartu alamat langsung tampil tanpa tombol tab transfer.
     - *Digital + Kado Fisik:* Kedua tab dimunculkan berdampingan.
   - **Seksi 15 (`SEC15`):** Menyediakan kontrol formulir untuk kustomisasi teks tombol RSVP (`customLabels.rsvpBtnText`), form RSVP, tombol buka undangan, dan label hitung mundur.
   - **Mobile Edge-to-Edge Architecture & Sticky Quick-Save Thumb Bar:**
     - *Eliminasi Matryoshka Card:* Di viewport ponsel (< 768px), container layout melepaskan padding (`px-0 sm:px-6`) dan 16 seksi formulir bertransisi ke layout *flat edge-to-edge* (`rounded-none sm:rounded-3xl border-y sm:border p-3.5 sm:p-7`), membebaskan hingga 128px ruang horizontal (33% layar).
     - *Sticky Floating Quick-Save Bar:* Mengambang di bagian bawah viewport mobile (`lg:hidden fixed bottom-3 left-3 right-3 z-30`) menyajikan indikator *dirty state* kontekstual per-seksi aktif ("Belum Disimpan" vs "Tersimpan") serta tombol simpan instan ber-spinner tanpa perlu scroll ke dasar seksi.
     - *Dock Suppression:* Dock melayang 6-menu dinonaktifkan khusus pada `/dashboard/invitation/*` agar tidak bertabrakan dengan keyboard virtual atau Quick-Save Bar.
     - *Un-mockup Mobile Live Preview:* Pratinjau mobile meniadakan mockup frame 390px sekunder di ponsel fisik, menyajikan kanvas 100% native edge-to-edge.
   - **Live Editor Engine:** Saat mode edit aktif (`isEditMode`), seluruh form submission dinonaktifkan (`form.noValidate = true`, `preventDefault`) dan tombol submit dinetralkan ke `type="button"` sehingga pengguna dapat mengklik dan mengetik langsung teks tombol RSVP tanpa memicu balon validasi *"Please fill out this field"*.
7. **Proteksi Studio Editor Pasca Publish, Buka Kunci Darurat, & Atomic Single Deploy:**
   - **Proteksi Pasca Terbit (`PUBLISHED`):** Tab Edit Undangan otomatis terkunci dan menampilkan layar proteksi minimalis elegan dengan tombol kontak WhatsApp Admin untuk mencegah modifikasi data yang tidak sengaja saat tautan live sedang diakses tamu.
   - **Buka Kunci Darurat (Admin Emergency Unlock):** Admin dapat memberikan izin edit darurat selama 24 jam dari tabel admin (`/admin`).
   - **Staging Save (Anti Rebake Storm):** Penyimpanan seksi 1–15 selama masa darurat hanya memperbarui PostgreSQL database tanpa memicu kompilasi HTML dan sinkronisasi R2 berulang-ulang.
   - **Atomic Single Deploy & Auto-Lock (`DEPLOY_AND_LOCK`):** Di puncak formulir tersedia tombol aksi **"Perbarui Undangan & Kunci Kembali"** yang mengeksekusi 1 kali kompilasi HTML penuh, migrasi/sinkronisasi ke Cloudflare R2, dan seketika mengunci kembali studio secara otomatis.
   - **Pelepasan Subdomain Otomatis:** Jika subdomain diubah, subdomain lama langsung terlepas dari record database (`@unique`) dan kembali bebas ke pool publik secara otomatis.
   - **Subdomain Monitor & Live Inspector Admin:** Dashboard Admin (`/admin?tab=custom_domains`) menyediakan sub-tab khusus Subdomain Sistem (sesuai root domain aktif, misal `*.localhost:3000` di lokal atau `*.luxvite.id` di VPS) dengan 3 kartu KPI real-time (Total Aktif, Live, Kedaluwarsa), alat pencarian kepemilikan nama (*Live Subdomain Inspector*), dan aksi daur ulang 1-klik untuk melepaskan subdomain kedaluwarsa (H+7 hari acara) kembali ke pool namespace.
8. **Proteksi Siklus Download Galeri Tamu (ZIP), Layar Opening Editorial (`/sharemoment`), & Pemisahan Studio Fisik vs Digital:**
   - **Layar Pembuka Editorial (Editorial Pre-Camera Opening Screen):** Tamu yang mengakses `/sharemoment` disambut terlebih dahulu oleh layar pembuka editorial non-agresif dengan 3 model pilihan layout (`POLAROID_MINIMAL`, `VINTAGE_FILM`, `MODERN_ELEGANT`), teks instruksi kustom (`memoriesCardInstruction`), foto potret mempelai dinamis/kustom (`memoriesCoverPhoto`), cap tanggal retro analog, dan hitung mundur live jika acara belum dibuka. Izin kamera (`getUserMedia`) baru diminta ketika tamu menekan tombol *"Mulai Abadikan Momen →"*.
   - **Pemisahan Studio Cetak Fisik vs Studio Layar Pembuka Digital:**
     - *Studio Desain Kartu Meja & Standing Banner Barcode (`PrintableQRCardModal.tsx`):* Generator mandiri kartu fisik meja resepsi dengan 4 format ukuran percetakan (*A3 Standing Easel Banner*, *A4 Table Standee*, *A5 Tent Card Meja Lipat*, dan *4R Mini Akrilik*), kustomisasi teks header (*"KAMERA KENANGAN TAMU"*) dan kalimat petunjuk meja (*"Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda."*), serta ekspor 300 DPI high-resolution PNG siap cetak.
     - *Studio Kustomisasi Layar Pembuka HP Tamu (`GuestOpeningSetupModal.tsx`):* Editor visual mandiri untuk mengatur tampilan pembuka digital tamu saat memindai QR (`/sharemoment`) dengan pratinjau interaktif iPhone 16 Pro realistis (multi-ring titanium bezel, dynamic island, dan glass sheen overlay).
   - **Multi-Session Camera Windows & Jadwal Hari H (`getMemoriesActiveSchedule`):** 
      - Kamera momen tamu (`/sharemoment`) mendukung multi-sesi waktu aktif fleksibel (misal: Sesi Akad Nikah, Resepsi Malam, dan After Party) yang tersimpan pada `featureSettings.memoriesSessions`.
      - **Tombol Auto-Sync Acara:** Sekali klik di Studio Editor Seksi 14 langsung menarik dan menyinkronkan data nama sesi, tanggal, jam mulai, dan jam selesai dari susunan acara undangan (`eventData`).
      - **Time-Gate Overrides Roll Quota:** Jika waktu acara belum dimulai, sedang dalam jeda antar-sesi, atau seluruh rangkaian acara telah usai (`isAllFinished` / status `EVENT_FINISHED`), pengiriman foto pada `/api/public/memories/upload` diblokir mutlak (status 403/423) terlepas dari apakah tamu masih memiliki sisa roll kuota kamera.
      - **Alokasi Kuota per Sesi & Formula Smart Rollover Anti-Hangus:** Klien dapat mengalokasikan kuota foto per sesi agar tidak habis di sesi awal. Sisa kuota yang tidak terpakai pada sesi sebelumnya otomatis melimpah (*rollover*) menambah kuota sesi berikutnya secara matematis:
        $$\text{allowedCumulativeQuota} = \min\Big(\text{totalEventQuota}, \text{photosBeforeThisSession} + \text{currentAllocated} + \max(0, \text{pastAllocated} - \text{photosBeforeThisSession})\Big)$$
        Mencegah hangusnya kuota pengantin sekaligus melindungi ketersediaan kuota untuk sesi-sesi penting berikutnya.
      - **Live Antar-Sesi & Countdown Real-Time:** Jika diakses sebelum waktu mulai atau saat jeda antar-sesi, tamu disajikan nama sesi berikutnya dan hitung mundur live menuju jam pembukaan sesi tersebut. Saat sesi aktif, antarmuka menampilkan indikator live dot modern tanpa emoji default OS.
   - **Kebijakan Perpanjangan Bertahap (Single-Step Retention Policy):**
      - Opsi perpanjangan masa aktif galeri tamu dikunci ke sistem bertahap **1 Bulan (+30 Hari)** seharga Rp50.000, meniadakan opsi tahunan untuk mencegah penumpukan data zombie tanpa batas (*anti-zombie storage*).
      - **Jendela Perpanjangan (H-7 Renewal Window):** Pilihan perpanjangan di Dasbor Klien hanya dibuka saat sisa masa aktif $\le$ 7 hari (`daysRemaining <= 7`). Di luar jendela ini, tombol perpanjangan disembunyikan dan dasbor menampilkan status aman ("Masa Aktif Aman").
      - **Maksimal 1 Kali Perpanjangan:** Perpanjangan dibatasi maksimal 1 kali (`extraGalleryDays >= 30`), setelah itu opsi terkunci permanen di dasbor dan API backend, serta CTA utama diarahkan ke unduh ZIP seluruh foto.
   - **Mode Simulasi Pengantin (`?test=true`):** Mempelai dapat menguji coba viewfinder kamera dan layar opening sebelum hari H tanpa diblokir jadwal acara.
   - **Proteksi Unduh ZIP & Status Draft:** Tombol unduh ZIP di dashboard klien otomatis dinonaktifkan saat status masih `DRAFT` atau jika belum ada foto tamu (`guestMemoriesCount === 0`).
   - **Pencegahan Data Tercecer (Early Lock Warning):** Jika klien mengunduh ZIP saat acara masih berjalan (`PUBLISHED` & `!memoriesUploadLocked`), sistem memunculkan modal dialog peringatan bahwa pengunduhan akan langsung mengunci upload tamu secara permanen.
   - **Kondisi Aman Pasca Acara (`EVENT_FINISHED`):** Saat acara selesai, upload dikunci otomatis sehingga tombol download berada pada status aman (*safe state*) siap unduh tanpa peringatan menakutkan.
   - **Penyelarasan Kartu Dasbor:** Menghapus kartu duplikat Galeri Kenangan di baris navigasi cepat atas dasbor klien, menjadikannya 3 kolom bersih (`md:grid-cols-3`): Studio Editor, Buku Tamu, dan RSVP. Kartu QR Guest Moment dilengkapi tombol langsung ke *Studio Cetak Kartu & Banner*.
   - **Integrasi Domain & DNS Dinamis (RFC 1912):** Menghapus seluruh string konfigurasi DNS *hardcoded*. IP Publik VPS (`server_public_ip`) dan target CNAME (`cname_target`) dikonfigurasi melalui tab terdedikasi `Setup & Integrasi` di admin dengan auto-detect IP publik VPS (`/api/admin/server-ip`). Panduan di dashboard klien menyajikan tabel 2 baris (Record A untuk Root Apex `@` dan CNAME untuk Subdomain `www`) dilengkapi tombol 1-klik salin.
8. **Standar Arsitektur Seksi Penutup Adaptif 100vh & Fallback Tombol Buka Undangan**:
   - **Tombol Buka Undangan Selalu Berteks:** Tag `<button data-lux-field="customLabels.openBtn">` di seluruh 15 master template dan starter blueprint wajib memiliki teks fisik default `"Buka Undangan"`. Engine komposer (`lib/themeEngine.ts` dan `lib/demoRegistry.ts`) menjamin penyediaan fallback default `customLabels.openBtn = "Buka Undangan"`, sehingga tombol cover gate tidak pernah kosong/transparan dalam kondisi apapun.
   - **Seksi Penutup Adaptif Layar Penuh (`min-height: 100vh`):** Seksi outro/penutup (`.site-footer` / `.closing-sec`) dijamin selalu berukuran layar penuh `100vh` untuk kenyamanan navigasi scroll snap, menghilangkan masalah footer "nyempil" atau terpotong.
   - **Mode Kanvas Kosong (Default / Tanpa Foto Penutup):** Jika klien tidak mengunggah foto penutup (`CLOSING_COVER`), seksi otomatis menerima class `.no-closing-photo`. Background murni transparan (`background: transparent;`) sehingga menyatu mulus dengan kanvas latar belakang global (`body` dan `.fixed-bg-layer`) serta token palet tema (`--bg-dark`) tanpa balok warna solid/hex mati (`#050507`, `#04120e`). HARAM menggunakan fallback gambar dummy/Unsplash palsu. Konten teks ucapan terima kasih dan nama mempelai (`{{firstName}} & {{secondName}}`) terposisikan tepat di tengah-tengah layar secara vertikal dan horizontal (`justify-content: center; align-items: center;`).
   - **Mode Foto Penutup Terunggah:** Jika foto penutup diunggah (`.has-closing-photo`), foto disuntikkan secara dinamis ke tag footer via `style="{{closingBgStyle}}"` dan mengisi latar belakang layar penuh (`background-size: cover; background-position: center;`) dengan overlay scrim gelap/gradasi elegan (`.has-closing-photo::before`), dan blok teks penutup otomatis bergeser ke area bawah layar (*bottom-aligned*, `justify-content: flex-end;`).
9. **Spesifikasi Theme Demo Studio & Dukungan Video MP4 / Audio BGM (v5.7.0)**:
   - **Upload Video MP4 (Cover, Hero, Background, Home, & Closing):** Mesin render (`lib/renderTemplate.ts`) mendukung pemutaran video ambient loop muted (`<video autoplay loop muted playsinline>`) untuk slot sampul (`cover`), sidebar/hero desktop (`hero`), background global (`background`), serta seksi pembuka (`homePhotoUrl` → `.lux-home-video`) dan seksi penutup (`closingPhotoUrl` → `.lux-closing-video`).
   - **Pembersihan File Format Berlawanan:** Endpoint `demo-asset` otomatis membersihkan file format berlawanan (misal menghapus `.webp` lama saat `.mp4` diunggah) dan menyinkronkan URL ke `AdminSetting` (`theme_demo_${themeId}`) serta mengompilasi ulang halaman demo statis.
   - **Audio BGM Demo Showroom:** Tab Aset Visual & Audio menyediakan slot pemutar dan pengunggah audio (`music.mp3`/`music.ogg`) yang otomatis dipicu saat tombol "Buka Undangan" ditekan.
   - **Prinsip Content-Driven Rendering:** Meniadakan saklar on/off manual dan kerumitan kustomisasi label. Seksi otomatis tampil bila data diisi (cerita, rekening hadiah, dll.) dan padam bila dikosongkan.
   - **Full Caching Strategy:** Seluruh aset showroom demo (`/demo/**`) dan pustaka musik bawaan (`/music/**`) dikonfigurasi dengan header HTTP `Cache-Control` optimal di `next.config.ts` (`s-maxage=604800` untuk Edge CDN Cloudflare, dan `immutable` untuk audio), disertai query cache buster `?t=...` saat admin memperbarui aset.
   - **Showroom Color Palette Selector:** Demo Studio Admin menyertakan pemilih 6 palet warna resmi (`champagne`, `emerald`, `burgundy`, `sage`, `terracotta`, `monochrome`), menjamin demo publik seperti Badrika tampil anggun dalam balutan warna khasnya (Emerald Green & Gold) tanpa mengunci kode CSS tema secara hardcoded.
10. **Standarisasi Menyeluruh Ekosistem 16 Master Tema Fisik:**
    - Seluruh 16 tema fisik (`kalandra`, `aurelia`, `artisan`, `valente`, `ameera`, `chronicle`, `lumina`, `papercut`, `solaria`, `wave`, `badrika`, `candani`, `dillalucky`, `lagaligo`, `mayang`, `prameswari`) kini 100% konsisten menyematkan blok formulir RSVP interaktif `<form id="rsvpForm" onsubmit="luxSubmitRsvp(event)">` yang terhubung ke `/api/public/rsvp` dengan kapabilitas real-time prepend kartu doa seketika, status feedback box tanpa native alert, dan batas kontainer scroll aman (`max-height: 290px-320px`, `overscroll-behavior: contain`, dan custom thin luxury scrollbar anti-scroll trap).
    - Seluruh 16 tema fisik telah distandarisasi menyematkan placeholder ekosistem lengkap: Salam Pembuka Universal `{{openingGreeting}}`, Mitra Vendor `{{vendorsSectionHtml}}`, Galeri Kenangan Tamu Kamera Virtual `{{memoriesSectionHtml}}` (Photo Only), Amplop/Gift `{{giftSectionHtml}}`, dan blok proteksi hak cipta sistem (Zero Missing Tokens / 100% Health Valid).
11. **Pustaka Musik Sistem Dinamis (Zero Hardcode):**
    - **Database-Driven Presets (`MusicPreset`):** Koleksi musik sistem dikelola secara dinamis via database PostgreSQL (`music_presets`), menggantikan seluruh array dan fallback hardcode di sisi klien.
    - **Portal Admin Sub-Tab Musik:** Tab "Tema & Musik" menyediakan sub-tab "Pustaka Musik Sistem" untuk menambah lagu baru (dengan auto-kompresi FFmpeg 128 kbps MP3 yang hemat bandwidth), menyunting judul/komposer/genre, memutar pratinjau audio langsung, mengaktifkan/menonaktifkan lagu untuk klien, dan menghapus lagu dari pustaka.
    - **Integrasi Klien Real-Time (`/api/public/music`):** Dasbor klien memuat daftar lagu aktif secara dinamis dan menampilkannya di pemilih lagu pernikahan tanpa data statis palsu.
12. **Standar Antarmuka Bersih SaaS & Zero Native Dialogs:**
    - Seluruh dialog konfirmasi penghapusan (Klien, Undangan, Portofolio, Domain Kustom, Tamu, RSVP) dan notifikasi status menggunakan dialog modal kustom berlatar *backdrop blur*, kartu bersudut lengkung *rounded-2xl*, tombol aksi berdiferensiasi tegas (batal vs konfirmasi), dan status aksi dinamis.
    - **In-Button Feedback Principle:** Aksi yang bersifat konfirmasi lokal atau salin tautan (seperti tombol Salin Link, Samakan Tema, simpan seksi) mempertahankan respons visual langsung di tombolnya sendiri tanpa memunculkan toast berlebihan. Toast melayang (`fixed bottom-6 right-6 z-[80]`) dirancang ringkas dan minimalis khusus untuk pesan sistem penting dan kendala server/koneksi dengan auto-dismiss 4 detik.
    - Zero `window.alert()` dan zero `window.confirm()` di seluruh modul operasional maupun publik.

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
    - Sistem mendeteksi `appUrl` dan `rootDomain` secara dinamis dari request headers (`x-forwarded-host`, `host`, `x-forwarded-proto`) via `lib/serverDomainUtils.ts`, kompatibel secara native di lingkungan pengembangan `localhost:3000`, IP lokal, reverse proxy VPS, custom domain, maupun tunnel dev tanpa hardcode URL.
    - Rekonsiliasi status real-time pada `GET /api/client/orders/[id]/status` memverifikasi status pembayaran langsung ke API gateway sehingga status terdeteksi responsif seketika.
13. **Empat Kondisi Pembayaran & Transmisi Data Lengkap (Rich Payload Delivery)**:
    - **Empat Kondisi Pembayaran**:
      1. *Registrasi Paket Awal (`NEW`)*: Pemilihan tier paket via `/packages` -> in-app QRIS checkout -> pasca lunas dialihkan ke `/dashboard/setup`.
      2. *Upgrade Layanan (`UPGRADE`)*: Menaikkan tier paket langsung dari studio undangan `/dashboard/invitation/[id]` dengan kalkulasi selisih harga dinamis -> pasca lunas tier induk diperbarui seketika.
      3. *Dua Add-On Layanan Tambahan Murni*:
         - *Perpanjangan Masa Aktif (`GALLERY_EXTENSION`)*: Menambah masa aktif website undangan, tautan subdomain, dan penyimpanan galeri foto momen tamu (+30 hari perpanjangan) serta membuka kembali kunci formulir upload.
         - *Top-Up Kuota Foto Momen Tamu (`MEMORIES_TOPUP`)*: Menambah plafon kapasitas foto candid tamu di album kenangan (kelipatan 100 foto).
         *(Catatan: Custom domain merupakan fitur inklusif bawaan paket Eternity tanpa biaya jasa add-on).*
      4. *Checkout Terpadu Multi-Layanan (`Unified Add-on & Upgrade Hub`)*: Menggabungkan upgrade tier paket, perpanjangan masa aktif undangan & galeri (+30 hari), dan top-up kuota foto tamu ke dalam 1 kasir / 1 invoice (`itemsJson`) dengan pemenuhan atomik berurutan (`applyBundleFulfillment`).
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
   - **Inklusif Dalam Paket (Bebas Biaya Tambahan)**: Custom domain merupakan fitur bawaan yang sudah **termasuk bebas biaya (gratis)** pada paket yang memiliki kapabilitas `custom_domain` (seperti tier Eternity / Premium). Klien tidak perlu membayar biaya add-on tambahan.
   - **Gembok Master Saklar Admin (`custom_domain_enabled`)**:
     - Administrator dapat mengaktifkan atau menonaktifkan fitur Custom Domain platform kapan saja melalui **Admin Dashboard > Pengaturan > Setup & Integrasi > Integrasi Domain Pribadi & DNS Server**.
     - Ketika dinonaktifkan (`false`), kartu "Domain Sendiri" di dashboard pengaturan klien otomatis disembunyikan sepenuhnya dari pandangan klien, dan endpoint backend `POST /api/client/custom-domain` memblokir registrasi domain baru dengan proteksi HTTP 403 Forbidden.
   - **Tautan Langsung Mandiri**:
     - Klien yang paketnya mendukung `custom_domain` dapat langsung memasukkan nama domain pribadi dan menyimpannya secara instan via Dasbor Pengaturan (`/dashboard/settings` -> `POST /api/client/custom-domain`).
     - Klien yang paketnya belum mendukung dapat melakukan upgrade paket melalui Kasir Upgrade, di mana fitur Custom Domain langsung terbuka begitu tier aktif.
     - Klien yang sudah memiliki domain aktif (`invitation.customDomain`) dapat melepaskan (unlink) atau mengganti domain kapan saja tanpa biaya.
   - Integrasi domain berjalan mulus melalui **Caddy Server on-demand TLS** dengan Record A ke IP server VPS dan CNAME target dinamis, di mana middleware Next.js secara internal me-rewrite request domain ke endpoint **URL Asli** (`/[slug]` atau `/[slug]/memories`).
   - **2 Add-On Layanan Tambahan Murni**:
     1. **Perpanjang Masa Aktif Galeri Tamu (`orderType: GALLERY_EXTENSION`)**: Layanan bulanan via QRIS dinamis (`gallery_extension_price_per_month`, default Rp50.000 / 30 Hari) untuk menambah masa simpan foto candid tamu dan membuka kembali form upload pasca-acara.
     2. **Top-Up Kuota Foto Momen Tamu (`orderType: MEMORIES_TOPUP`)**: Penambahan kapasitas foto candid tamu di album kenangan (kelipatan 100 foto via `addon_memories_topup_price`).
   - Keamanan terjamin tanpa kendala CORS karena semua request diteruskan secara *Same-Origin*.

---

## 10. Modul Manajemen Tema Admin & Auto-Compile Demo (`docs/admin/MANAJEMEN_TEMA_ADMIN.md`)

1. **Tambah Tema Baru via UI Admin**:
   - Admin mengisi metadata dan mengunggah master file `.html` template langsung melalui modal.
   - Backend meletakkan file ke `themes/{kategori}/{id}.html`, mendaftarkannya ke database, dan langsung mengeksekusi `compileAndSaveStaticDemo(id)`.
   - File HTML demo statis langsung tercipta di `public/demo/{id}/index.html` dan siap diuji di katalog `/demo`. Berkas `index.html` kompilasi ini diperlakukan sebagai runtime cache murni yang dikecualikan dari Git (`.gitignore`) dan dipra-kompilasi secara mandiri via `deploy.sh` atau *on-the-fly* saat diakses, menjamin zero merge conflict di server VPS.
2. **Sinkronisasi Otomatis & Anti-Zombie (Next.js & Cloudflare Edge Purge)**:
   - Tombol *Sinkronisasi Tema & Cache* (`POST /api/admin/themes/sync`) memindai direktori fisik `themes/`, otomatis menghapus record tema usang (*auto-purge*) yang tidak lagi memiliki file master fisik, merevalidasi cache Next.js (`/demo`, `/demo/[theme]`, `/api/public/themes`), serta secara otomatis mengeksekusi purge cache Cloudflare Edge CDN jika kredensial `CF_ZONE_ID` & `CF_API_TOKEN` terkonfigurasi.
   - Tersedia pula tombol *Purge Cache* dedicated di menu **Settings > Setup & Integrasi** (`POST /api/admin/cache/purge`) untuk membersihkan seluruh lapisan cache server (Next.js ISR) dan Cloudflare Edge CDN sewaktu-waktu.
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
5. **Kalkulasi Kedaluwarsa Dinamis (On-The-Fly):** Nilai `expiresAt` akan tetap `null` di database sampai benar-benar di-hardcode. Untuk tampilan UI Admin, masa aktif dihitung dinamis menggunakan rumus `Tanggal Acara Utama + retention_cleanup_days`.
6. **Mekanisme Remote Klien & Segmentasi Leads (Restore 1-Klik) (`docs/admin/REMOTE_DAN_MANAJEMEN_KLIEN.md`):** Admin dapat meremote Dasbor Klien secara utuh tanpa meminta password melalui arsitektur *httpOnly Cookie Session Override (`lux_remote_client_id`)*. Tombol Remote hanya aktif untuk klien yang memiliki ruang kerja aktif (undangan/pesanan lunas). Calon klien (leads) yang belum checkout disegmentasikan secara terpisah dengan opsi follow-up WhatsApp dan tombol remote dinonaktifkan. Server Action `startRemoteSession(clientId)` menetapkan cookie dan mengarahkan ke `/dashboard`. Callback `session` di `auth.ts` secara dinamis memetakan workspace ke profil klien target (`id`, `name`, `email`, `role`) sembari mempertahankan penanda hak akses Admin (`originalRole`). Di halaman `/admin`, proteksi *Immunity Guard* mencegah sidebar admin hilang saat cookie remote aktif, dan dilengkapi banner sticky amber dengan tombol 1-klik hentikan remote. Saat Admin logout dari dashboard admin, cookie remote otomatis dibersihkan secara tuntas.
7. **Realtime SSE Checkout & Dark Luxury Transition Modal (PostgreSQL LISTEN/NOTIFY Multi-Process Bridge):** Pintu masuk ruang kerja undangan `/dashboard/setup` terlindungi secara absolut (Zero Visual Leak) hanya jika order berstatus `PAID`. Halaman checkout menggunakan Server-Sent Events (SSE) murni (`/api/payments/status-stream/[orderId]`) yang didukung jembatan event cross-process PostgreSQL `LISTEN/NOTIFY` (`lib/paymentEvents.ts`). Baik pembayaran otomatis QRIS maupun verifikasi manual transfer memicu `NOTIFY payment_events` yang tersiar seketika (<5ms) ke seluruh instance PM2 cluster, menghilangkan polling browser dan beban loop database sepenuhnya. Instance yang memegang SSE klien langsung mendorong event `PAID` atau `REJECTED` (lengkap dengan `rejectReason`). Jika `PAID`, modal transisi sukses bertema Dark Luxury muncul dengan animasi checkmark dan rincian invoice, lalu mengalihkan pengguna ke dasbor setelah jeda 1.8 detik. Heartbeat pasif 15 detik menjamin stabilitas proxy Caddy dan fail-safe reconnect.
8. **Resolusi Dinamis Mode Pembayaran Add-on Dasbor Klien:** Seluruh modul add-on klien (perpanjangan galeri kenangan, domain kustom, upgrade paket) membaca konfigurasi `payment_mode` dari `AdminSetting` secara dinamis tanpa hardcoding.
9. **Arsitektur Tab Modular & Standar Desain Clean SaaS (Zero OS Emojis):** Seluruh antarmuka admin dipecah menjadi komponen modular terisolasi (`AdminOrdersTab`, `AdminClientsTab`, `AdminInvitationsTab`, `AdminCustomDomainsTab`, `AdminMonitoringTab`, `AdminMarketingTab`, `AdminFinanceTab`). Seluruh emoji OS bawaan (seperti 🔒, ✏️, 💾, 💳, 🌐, ⚡) dihapus total dan digantikan oleh ikon vektor SVG modern serta indikator titik (*subtle 1.5px dot indicators*).
10. **Paginasi Server-Side Murni & Diagnostik Infrastruktur Live:** Seluruh pemuatan data transaksi (`/api/admin/orders`), klien (`/api/admin/users`), projek undangan (`/api/admin/invitations`), log audit staf (`/api/admin/audit-logs`), dan webhook (`/api/admin/webhooks`) menerapkan paginasi server-side murni dengan debounce search dan filter dinamis. Dilengkapi alat uji diagnostik live mandiri: pengujian handshake SMTP email transaksi terintegrasi langsung (*inline*) pada kartu pengaturan email, serta pengukuran latensi handshake Cloudflare R2 / S3 terpusat di tab Monitoring.
11. **Role-Based Access Control (RBAC) 4-Tingkat Terisolasi:** Pembagian peran administrator ke dalam 4 tier ketat:
   - `SUPER_ADMIN`: Pemilik sistem dengan akses mutlak ke seluruh 13 modul (termasuk snapshot database, pemasaran & afiliasi, finance ledger, tim, dan platform settings).
   - `ADMIN`: Staf operasional harian (Ringkasan, Pesanan, Klien, Undangan, Portofolio, Custom Domain, Tema & Musik). Terkunci dari pemasaran, finance ledger, database snapshot, monitoring, dan tim.
   - `FINANCE`: Staf akuntansi & kasir (Ringkasan Finansial, Pesanan & Transaksi, Klien, dan Finance Hub).
   - `SUPPORT`: Tim customer care (Klien & Remote Dasbor, Projek Undangan & Buka Kunci Darurat, Custom Domain).
   Modal pembuatan admin menyajikan *Pratinjau Hak Akses Menu Dinamis* yang langsung menampilkan daftar menu yang dapat diakses (hijau) vs menu yang terkunci (abu-abu gembok) secara instan saat role diubah.
12. **Persistensi State Navigasi Tab Admin (Tab Memory Persistence):** Sinkronisasi 2-arah antara tab aktif, URL search params (`?tab=...&sub=...`), dan `localStorage` (`lux_admin_active_tab` & `lux_admin_settings_subtab`). Pengguna yang me-refresh halaman (F5) saat berada di sub-tab pengaturan atau monitoring tidak akan pernah terpental kembali ke tab ringkasan ("overview").
13. **Pusat Pemantauan Kestabilan 60-Hari & Meteran Hardware (Monitoring Hub):**
   - **Bilah Riwayat Uptime 60-Hari Interaktif:** Visualisasi ketersediaan layanan ala UptimeRobot/Vercel dengan 60 bar segmen harian responsif, tooltip latensi & status operasional, serta rasio uptime (99.98%).
   - **Pemantauan Host RAM Fisik VPS:** Menampilkan kapasitas nyata RAM Host VPS (`os.totalmem()`, terpakai, sisa bebas dalam GB) serta footprint memori internal Node.js (heap & RSS) dengan indikator ambang batas beban.
   - **Host OS Uptime:** Menghitung waktu nyala fisik server Linux VPS (`os.uptime()`) berdampingan dengan runtime Next.js.
   - **Ringkasan Bersih Cloudflare R2 (2-Card Standard):** Menghilangkan redundansi kartu kuota gratis; hanya menyajikan 2 kartu ringkas: *Ukuran Terpakai* (bytes/KB/MB riil dari S3 API) dan *Sisa Bebas Biaya* (10.00 GB free tier bulanan).
14. **Sistem Pemasaran & Program Afiliasi Terintegrasi (`AdminMarketingTab`):**
   - **Manajemen Kupon Diskon & Promo:** Penerapan diskon persentase maupun nominal potong harga pada pemesanan paket dengan verifikasi validitas tanggal, kuota pemakaian, batas per-user, dan filter paket yang berlaku.
   - **Mekanisme Promo Hold Anti-Double Claim:** Saat klien mengonfirmasi kupon di checkout, sistem mengalokasikan *PromoHold* sementara (15 menit) untuk mencegah perlombaan kupon kuota terbatas (*race condition*). Kupon dikonsumsi permanen saat status menjadi `PAID`, atau dilepas otomatis jika pembayaran kadaluarsa/dibatalkan.
   - **Manajemen Mitra Afiliasi & Komisi Otomatis:** Pendaftaran mitra (Wedding Organizer, KOL, vendor fotografi) dengan nomor rekening pencairan, penetapan tarif komisi (persentase atau nominal tetap), kalkulasi komisi otomatis pada order berbayar, saldo pending, akumulasi pencairan, dan pencatatan riwayat komisi terhubung ke buku kas pengeluaran (*Expense*).

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
   - Deployment VPS Ubuntu 22.04/24.04, reverse proxy Caddy & blueprint skalabilitas multi-server shared storage (`DEPLOYMENT_VPS_CADDY.md`)
3. **Sisi Publik & Resepsionis (`docs/public/`):**
   - Resolusi multi-domain & compiler token tema (`01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md`)
   - Pengalaman tamu, cover gate & audio autoplay policy (`02_PENGALAMAN_TAMU_UNDANGAN.md`)
   - Formulir RSVP publik, rate limiting & nested wish reply (`03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md`)
   - Tanda kasih cashless, rekening copy button & QRIS (`04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md`)
   - Portal resepsionis digital, HTML5 QR scanner & souvenir (`05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md`)
   - Portal upload foto candid tamu & galeri kenangan live real-time (`06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md`)
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
3. **All-Access Themes & Tab Kategori Navigasi Dasbor Klien:**
   - Seksi 1 (*Pilihan Seri Desain & Palet Warna*) mengadopsi arsitektur **All-Access Themes**: seluruh 16 tema fisik aktif bebas dipilih oleh klien di seluruh tier paket (**Serenade**, **Symphony**, maupun **Eternity**).
   - Menampilkan bilah tab kategori estetika (`[Semua]`, `[Modern]`, `[Traditional]`, `[Premium]`) dengan badge counter dan auto-focus pada tema aktif, memudahkan calon pengantin mengeksplorasi nuansa desain tanpa membatasi hak pilih mereka.
   - Seksi 14 (*Galeri Kenangan Tamu & Virtual Disposable Camera*) menerapkan lencana total kuota foto acara dari Admin Setting (`Kapasitas Acara: X / Y Foto Terkumpul`) dan membebaskan pengantin membagi alokasi roll per tamu dengan hard-clamping otomatis di level server.
4. **Standarisasi Viewport & Safe-Area Mobile iOS/Android (`viewport-fit=cover`):**
   - Meta viewport wajib menggunakan `width=device-width, initial-scale=1.0, viewport-fit=cover` tanpa mematikan zoom (`user-scalable=no` dilarang demi kepatuhan WCAG 1.4.4).
   - Seluruh floating bar wajib menghitung safe-area:
     - `.bottom-dock`: `bottom: calc(18px + env(safe-area-inset-bottom, 0px))`
     - `.music-fab`: `top: calc(18px + env(safe-area-inset-top, 0px)); right: calc(18px + env(safe-area-inset-right, 0px))`
   - Target sentuhan menu navigasi minimal $44\times 44\text{px}$ dengan `touch-action: manipulation`.
5. **Proteksi Anti Auto-Zoom Form Safari iOS & Grid Galeri Responsif:**
   - Seluruh elemen form (`.form-in`, `.form-sel`, `.form-ta`) dikunci pada ukuran font minimum **`16px`** untuk menonaktifkan auto-zoom peramban WebKit Safari saat input difokuskan.
   - Galeri foto universal (`themeEngine.ts`, `demoRegistry.ts`, `modules.css`) menerapkan tata letak Masonry **2 kolom** (`columns: 2 !important; column-gap: 8px;`) secara seragam pada mobile maupun desktop split screen (feed seksi dibatasi 2–3 baris / maks 6 foto, dan modal penuh memuat seluruh foto) sehingga foto mengalir padat tanpa ruang kosong dan tidak ada foto yang mengecil.

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
5. **Dynamic Showroom Asset Delivery & RFC 9111 ETag Revalidation:**
   - Route handler `app/demo/[theme]/[file]/route.ts` menyediakan delivery dinamis langsung dari disk VPS untuk file baru yang diunggah melalui Demo Studio (seperti `thumbnail_mobile.webp`, `thumbnail_desktop.webp`, dan lagu/video baru).
   - Memastikan seluruh aset baru langsung aktif di browser tanpa menunggu proses build ulang Next.js, dilengkapi Smart ETag Cache (`304 Not Modified`), proteksi `no-store` pada respon 404 untuk mencegah penguncian status 404 oleh CDN Cloudflare.
   - **Modern ETag Revalidation & Edge CDN Acceleration:** Mengadopsi header `Cache-Control: public, max-age=0, s-maxage=604800, must-revalidate`. Browser klien selalu memvalidasi kesegaran file via ETag ringan (0 KB transfer jika tidak ada perubahan), sedangkan Cloudflare menyimpan aset di 300+ edge server selama 7 hari. Pembaruan file di Demo Studio atau pemanggilan Purge API Cloudflare langsung memperbarui tampilan di seluruh browser pengunjung seketika tanpa memerlukan buntut versi `?v=`.
   - **Zero-404 Server Verification di `/api/public/themes`:** Memeriksa ketersediaan thumbnail fisik di VPS sebelum mengirimkan URL, langsung mengalihkan ke `cover.webp` jika belum ada sehingga kartu katalog bebas dari siklus 404 ganda. Frame wadah kartu diperbarui ke `bg-stone-100` untuk transisi loading yang lembut tanpa blank hitam.
6. **Proteksi Anti-Download, Fluid Layout & Clean Lightbox Navigation Galeri Kenangan (`/memories`):**
   - Galeri kenangan tamu diproteksi secara menyeluruh dari unduhan tidak sah melalui pelarangan menu klik kanan (`onContextMenu` preventDefault), pencegahan touch-callout pada mobile (`-webkit-touch-callout: none`), larangan dragging gambar (`draggable={false}`), serta pointer containment pada preview lightbox modal.
   - **Fluid Full-Width Layout:** Container galeri menggunakan `w-full max-w-[1920px] mx-auto` dengan kolom responsif (`columns-2` hingga `2xl:columns-7`) yang responsif di seluruh ukuran layar dari mobile hingga desktop.
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
   - **Demo Sistem Resepsionis & QR Scanner (`/demo/receptionist`):** Arsitektur *zero-database in-memory client demo*. Dilengkapi generator tiket QR kustom (Nama, Kategori VIP/Keluarga/Reguler, Pax, Nomor Meja), unduh QR PNG, modal preview layar HP untuk scan kamera, live camera scanner via `html5-qrcode`, audio beep chime, proteksi anti-double scan, daftar kehadiran tamu real-time, dan simulasi kunci layar PIN panitia (`1234`).
   - **Demo Guest Moment Camera (`/demo/sharemoment`):** Kamera disposable retro berlayar pembuka editorial (*Editorial Showcase*), 5 filter analog branded (Aura '90s, Heritage Romance, dll.), Web Audio shutter sound, cap tanggal oranye LED, dan penyimpanan lokal `sessionStorage` (`demo_guest_moments`).
   - **Demo Galeri Kenangan Tamu (`/demo/memories`):** Feed foto kenangan tamu berformat **Roll Stack (1 Card / Tamu)** berlapis fisik dengan badge jumlah foto, filter tab (Semua, Siang, Malam, Favorit), Touch-Swipe & Keyboard Multi-Foto Modal Lightbox, tombol mengambang Buka Kamera, dan simulasi unduh ZIP resolusi asli.
   - **Arsitektur Zero-Setup Unified Sandbox:** Seluruh tema demo (`/demo/[theme]`) otomatis mengarahkan tombol "Bagikan Foto Momen" dan "Buka Galeri Momen Lengkap" ke `/demo/sharemoment` dan `/demo/memories`. Form RSVP demo pada seluruh tema didukung respon simulasi instan (`POST /api/public/rsvp`) tanpa error 404.
12. **Universal Vertical Glowing Luxury Timeline Standard (Love Story / Our Journey):**
    - Menstandarisasikan tampilan seksi Kisah Cinta di seluruh 16 tema master (Valente, Kalandra, Aurelia, Artisan, Papercut, Ameera, Mayang, Candani, Lagaligo, dll.) dan Engine bawaan (`lib/themeEngine.ts` & `lib/demoRegistry.ts`).
    - Mengeliminasi total wadah kaku `.journey-card` dan 2 foto bujur sangkar `.journey-previews` yang mempersempit ruang visual.
    - Mengimplementasikan sumbu rel vertikal bergradien pendar emas (`::before` dengan `linear-gradient`) dan titik node simpul emas bercahaya (`.story-chapter-block::before` dengan pendaran halo `box-shadow`) yang mengalir harmonis dengan palet dinamis masing-masing tema via rantai token anti-hardcode `--timeline-gold`.

---

## 17. Modul Eksekutif Kas & Hasil Bisnis Terpadu (`/admin?tab=finance`)
1. **Prinsip Single-Page Unified Cashflow & Anti-Birokrasi:**
   - Menghapus tab bertingkat yang membingungkan. Seluruh data kas terintegrasi langsung dalam 1 halaman kas terpadu (`AdminCashflowTab`).
   - Berfokus murni pada esensi hasil bisnis: **Uang Masuk, Uang Keluar, dan Sisa Kas Riil (Laba Bersih)**.
   - Mengeliminasi total emoji OS bawaan (digantikan oleh vektor SVG murni dan indikator titik 1.5px).
2. **Arsitektur Aliran Kas Pemasukan 100% Otomatis (Zero-Duplication):**
   - Gross Revenue diperoleh secara deterministik dan otomatis dari tabel `Order` berstatus `PAID`.
   - Admin dilarang menginput omzet order secara manual untuk menjaga keaslian mutasi kas dan mencegah selisih/ghost revenue.
3. **Pita 3 Metrik Realitas Kas (The Rule of 3 Metrics):**
   - **Total Uang Masuk:** Akumulasi pendapatan order paket undangan lunas pada tahun terpilih.
   - **Total Uang Keluar:** Akumulasi beban server, iklan, lisensi, dan belanja operasional.
   - **Sisa Kas Usaha (Hasil Bersih):** Surplus kas berjalan beserta margin profitabilitas (%).
4. **Grafik Batang Bulanan Bersih (Januari s.d. Desember):**
   - 1 Grafik batang SVG responsif dan ringan yang menyandingkan Uang Masuk (Emerald) dan Uang Keluar (Rose) per bulan.
   - Tooltip hover interaktif yang menampilkan detail nominal masuk, keluar, dan sisa kas per bulan tanpa beban kalkulasi kurva yang berat.
5. **Buku Kas Pengeluaran (Expense Ledger) & Unggah Struk:**
   - Pencatatan mutasi kas keluar dengan kategori, sumber dana (BCA, Mandiri, Transfer, QRIS, Kas Tunai), nomor referensi, catatan memo, dan upload struk fisik (JPG, PNG, WebP, PDF) tersimpan di `/uploads/finance/receipts/`.
   - Fitur pencarian instan, filter kategori/sumber dana, pagination bersih, dan ekspor streaming CSV.
   - Aksi hapus mutasi terlindungi oleh konfirmasi inline 2-step aman tanpa dialog popup peramban (`window.confirm`).
6. **Eliminasi Sub-Tab Pajak Formalitas & Penguncian Tutup Buku:**
   - Menghapus sub-tab tutup buku kaku (`financial_closings`) dan rekapitulasi NTPN pajak formalitas agar operasional pencatatan nota operasional tim tetap lincah, fleksibel, dan tidak menyulitkan pencatatan di kemudian hari.

---

## 18. Arsitektur Desain Antarmuka Dasbor Klien: Eliminasi Card Fatigue, Borderless Glowing Beam Tabs & Sliding Magnetic Pill Switcher

1. **Eliminasi Card Fatigue (Container-itis):**
   - Menghapus kontainer kartu putih berlapis (`bg-white rounded-2xl border shadow-xs`) yang sebelumnya mengungkung filter tab di halaman RSVP (`/dashboard/rsvp`) dan Buku Tamu (`/dashboard/guests`).
   - Memberikan ritme vertikal yang lebih lega, menghemat 60–80px ruang layar, dan menyatukan elemen kontrol filter langsung dengan garis hairline pembatas tabel.
2. **Tab Navigasi Borderless Glowing Beam:**
   - Diterapkan pada filter status RSVP (`Semua`, `Hadir`, `Tidak Hadir`, `Ragu-ragu`) dan filter pengiriman Buku Tamu (`Semua Tamu`, `Sudah Terkirim`, `Belum Dikirim`).
   - Ditenagai pengukuran DOM reaktif (`useRef` + `offsetLeft` / `offsetWidth`) dan batang pendar emas 2.5px (`bg-gradient-to-r from-amber-700 via-amber-500 to-amber-600`) dengan pendaran amber halus (`shadow-[0_1px_8px_rgba(217,119,6,0.6)]`) serta transisi native hardware-accelerated 60 FPS `cubic-bezier(0.16,1,0.3,1)`.
3. **Sliding Magnetic Pill Dual Switcher:**
   - Diterapkan pada peralihan mode Studio Undangan (`/dashboard/invitation/[id]`): `Form Data` vs `Live Editor` dan kontrol preview perangkat (`Mobile` vs `Layar Penuh`).
   - Track inset abu-abu lembut (`bg-stone-100/90`) dengan sliding thumb fisik di balik tombol yang meluncur dinamis:
     - Lebar 50% di mobile dan 125px ramping di desktop.
     - Perubahan warna kontekstual (`bg-stone-900` pada Form Data vs `bg-amber-800` pada Live Editor).
     - Menghadirkan umpan balik taktil modern setara standar industri tanpa library eksternal berlebih.
4. **Direct Action Chips Terpadu (Anti-Card Clutter):**
   - Notifikasi foto yang belum lengkap diintegrasikan langsung ke dalam kartu switcher ini sebagai action chips ringkas (`⚠️ Perlu: [ + Sampul ] [ + Foto Mempelai ]`), mengeliminasi kartu bertingkat dan menghemat ruang vertikal secara signifikan.

---

## 19. Homepage Hero Showcase & Standarisasi Aset Visual WebP (< 200 KB)
1. **Penyelarasan Tiga Mockup Ponsel & Eliminasi Total CSS Overlay (Zero-CSS-Text Card):**
   - Ketiga mockup ponsel hero (Kiri, Tengah, Kanan) diselaraskan menjadi *full-bleed screenshot* murni berlayar penuh (`object-fit: cover; object-position: center top;`).
   - Menghapus total kontainer kubah kaku (`.hero-inv-arch-box`), lapisan kartu overlay (`.hero-comp-card`), scrim gelap, serta tombol dan teks HTML duplikat ("Danang & Prameswari", "Buka Undangan").
   - **Dekopling Netral Penamaan Mockup:** Aset gambar mockup hero didekopel sepenuhnya dari keterikatan nama tema master menjadi penamaan generik `hero_mockup_1.webp` (Ponsel Kiri), `hero_mockup_2.webp` (Ponsel Tengah), dan `hero_mockup_3.webp` (Ponsel Kanan). Pengguna bebas mengganti screenshot asli tanpa ada intervensi elemen CSS di atasnya.
   - Tetap mempertahankan bezel titanium mewah, Dynamic Island melayang di posisi atas (`z-index: 8`), serta lapisan kaca pantulan specular glare (`z-index: 3`).
2. **Standarisasi Bobot Aset WebP (< 200 KB) & Algoritma Penajaman (*Sharpening*):**
   - Seluruh aset visual beresolusi tinggi dioptimasi ke format WebP dengan batas dimensi Retina 2048px dan unsharp mask sharpening (`sharp.sharpen()`) untuk menjaga kejernihan mikro-kontras foto mempelai dan ornamen tema.
   - Bobot gambar ditekan 100% di bawah 200 KB guna menjamin Largest Contentful Paint (LCP) Google Core Web Vitals < 2.5 detik pada jaringan seluler 4G/5G serta mencegah crash memori pada browser iOS Safari.
3. **Rasio Presisi Showcase & Penyelarasan Demo Studio:**
   - **Mockup Showcase Mobile (HP):** Standar rasio **1 : 2** (ukuran pas: **390 × 780 px** / **800 × 1600 px**).
   - **Mockup Showcase Desktop (Laptop):** Standar rasio **16 : 10** (ukuran pas: **1280 × 800 px** / **2560 × 1600 px**).
   - Seluruh teks panduan formulir Demo Studio disederhanakan secara to-the-point tanpa referensi rancu ke iPad Mini, langsung menyajikan ukuran pas dan rasio yang dibutuhkan administrator.
4. **Device Pair Mockup Showcase & Resolusi Ganda Thumbnail (Mobile & Desktop):**
   - Mengintegrasikan sistem showcase ganda presisi (*Device Pair Mockup*: `stp-tablet-screen` 16:10 di belakang dan `stp-phone` 1:2 di depan) pada kartu tema di `/admin?tab=themes`, `/dashboard/setup`, dan `/dashboard/invitation/[id]`.
   - Mengusung hirarki visual profesional: (1) Pratinjau Visual Ganda Responsive + status aktif toggle + kategori tier, (2) Nama Tema, slug, deskripsi, dan (3) Tombol aksi (`Preview`, `Studio`, `Edit`, `Delete`).
   - Frame ponsel secara eksklusif memuat `thumbnailMobile` (1:2), sedangkan area layar tablet memuat `thumbnailDesktop` (16:10) dengan rantai fallback landscape aman (`cover_desktop.webp` $\rightarrow$ `hero.webp` $\rightarrow$ `cover.webp`). Layar tablet mengunci rasio 16:10 secara mandiri sehingga terbebas dari crop bilah atas.

---

## 20. Sistem Status Layanan & Pembatasan Registrasi / Order Dinamis (Service Availability)

1. **Empat Mode Operasional Platform:**
   - `OPEN` (Layanan Normal): Semua pendaftaran klien baru dan order paket aktif penuh.
   - `CLOSED_ORDER` (Tutup Order / Kuota Penuh): Pendaftaran akun baru ditutup sementara waktu. Klien terdaftar tetap bebas login & mengelola undangannya.
   - `MAINTENANCE` (Pemeliharaan Sistem): Pendaftaran akun baru dan pembuatan transaksi ditangguhkan sementara selama pemeliharaan teknis.
   - `COMING_SOON` (Segera Hadir): Mode pre-launch untuk persiapan peluncuran atau rilis versi berikutnya.
2. **Pengaturan Dinamis di Panel Admin (`/admin?tab=settings&sub=platform`):**
   - Mengontrol kunci `service_status_mode`, `service_status_title`, `service_status_message`, `service_status_reopen_date`, dan `service_status_contact_wa`.
   - Dilengkapi kartu Live Preview instan untuk mensimulasikan tampilan banner bagi pengunjung sebelum disimpan.
3. **Pemisahan Klien Baru vs Klien Lama (Zero Locked-Out Invariant):**
   - Klien yang telah memiliki akun di database tetap dapat masuk via Google OAuth kapan saja dan tidak terblokir.
   - Calon klien baru yang belum terdaftar di database akan ditolak secara ramah di NextAuth `signIn` callback dan dialihkan ke `/login?error=RegistrationClosed&mode={mode}` dengan banner informasi yang jelas.
4. **Proteksi Backend Anti-Bypass (`/api/orders/create`):**
   - Endpoint order memvalidasi `getServiceAvailability()`. Jika ketersediaan bernilai `false`, permintaan dibatalkan dengan HTTP `403 Forbidden` dan respon JSON kustom.
5. **Invarian Isolasi Tamu & Admin:**
   - Undangan pernikahan publik (`/[slug]`), buku tamu, upload kenangan candid (`/memories`), dan meja resepsionis (`/receptionist`) 100% tetap beroperasi normal tanpa terpengaruh oleh penutupan order.
   - Portal login admin (`/admin/login`) dan panel kontrol admin 100% tetap aktif.

---

## 21. Sistem Pemasaran Terpadu: Kupon Promo & Mitra Afiliasi (Referral Engine)

1. **Struktur Master Pemasaran di Panel Admin (`/admin?tab=marketing`):**
   - **Kupon Promo Mandiri & Event:** Pembuatan kode promo dengan persentase (%) atau potongan nominal tetap (Rp), batas kuota pemakaian, minimum transaksi, dan masa berlaku.
   - **Mitra Afiliasi (Referral Partner):** Pendaftaran mitra tanpa portal publik luar. Komisi mitra dapat diset berbasis persentase transaksi atau nominal per transaksi, lengkap dengan rekening bank pencairan.
   - **Log Transaksi & Riwayat Komisi:** Memantau setiap transaksi yang menggunakan kode kupon atau referral mitra secara terperinci.
   - **Pencairan Komisi Atomik ke Buku Kas:** Tombol *Pencairan Komisi* memproses payout langsung dalam transaksi database: menandai komisi menjadi `PAID`, mengkredit saldo mitra, dan secara otomatis mencatat pengeluaran di tabel `expenses` dengan kategori `MARKETING` sehingga pembukuan laba rugi di tab Finance selalu presisi.

2. **Arsitektur Pemisahan Kasir (`/checkout`) vs Pembayaran Mandiri (`/payment`):**
   - Kasir `/checkout` menangani validasi nomor kontak WhatsApp, preview paket, dan validasi kupon promo dengan mekanisme lock kuota `PromoHold` selama 15 menit menggunakan `SELECT ... FOR UPDATE` (mencegah eksploitasi saat kuota tinggal 1).
   - Setelah tagihan dikonfirmasi, pembeli diarahkan ke `/payment?order=ID`.
   - `/payment` menyajikan antarmuka pembayaran murni (QRIS dengan SSE realtime listening dan transfer bank manual). Jika sesi QRIS 15 menit habis, pembeli dapat memperbarui QRIS seketika melalui tombol regenerasi tanpa kehilangan diskon promo yang sudah dikunci pada pesanan 24 jam.

---

## 22. Purifikasi Sistem, Eliminasi Stale Logic & Dynamic Background Token (September 2026)

1. **Dynamic Dark Canvas Injection:**
   - Seluruh 8 template tema fisik (`dillalucky.html`, `kalandra.html`, `ameera.html`, `wave.html`, `prameswari.html`, `papercut.html`, `artisan.html`, `aurelia.html`) telah dikalibrasi untuk menyuntikkan `--bg-dark: {{colorBgDark}};` pada inline style tag `<body>`. Kanvas latar gelap kini 100% responsif terhadap perubahan palet tema di Studio Editor (seperti Burgundy, Emerald, Midnight).

2. **Daur Ulang Subdomain Selaras (Subdomain Recycling Invariant):**
   - Jalur pembaruan subdomain di Studio Editor (`app/api/client/invitations/[id]/route.ts`) kini 100% selaras dengan endpoint validasi `subdomain/check` dan pembuatan awal `invitations/create`. Jika masa aktif acara pemilik subdomain lama telah lewat 7 hari (`isSubdomainExpired(..., 7)`), subdomain lama secara otomatis di-recycle (`subdomain: null`) sehingga klien baru dapat menyimpannya tanpa tabrakan validasi.

3. **Pembersihan Berkas Usang & Query Redundan:**
   - Menghapus 2 file CSS usang/mati (`app/landing.scoped.css` dan `public/css/landing.css`, total ~195 KB).
   - Menghapus folder kosong `components/ui/`.
   - Mengganti pemanggilan `prisma.wish` yang mati pada endpoint `/api/client/rsvps` dan `/api/admin/overview` dengan relasi aktif `rsvps.message` dan `guest.videoWishUrl`.
   - Memutakhirkan default `themeId` Prisma model `Invitation` menjadi `"kalandra"`.

4. **Standarisasi Ergonomi Antarmuka Mobile Halaman Publik:**
   - Katalog Tema (`/demo`): Mengganti sistem pill `flex-wrap` anjlok 3+1 menjadi *Horizontal Touch Rail* satu baris mulus (`overflow-x-auto scrollbar-none flex-nowrap`). Menerapkan *Responsive Header Triage* dengan proteksi `whitespace-nowrap` pada tombol *"Pilih Paket"* dan menyembunyikan subtitle panjang di mobile untuk mengeliminasi tombol gepeng 3 baris.
   - Portofolio (`/portfolio`): Mengonversi filter kategori ke horizontal rail swipeable dan menstandarisasi tombol CTA *"Buat Undangan"*.
   - Kasir & Pembayaran (`/checkout` & `/payment`): Normalisasi padding kartu mobile ke `p-4 sm:p-6 rounded-2xl sm:rounded-3xl`, input WhatsApp minimum 44px, QRIS adaptive sizing `w-44 h-44 sm:w-56 sm:h-56` di atas lipatan layar (*above the fold*), dan navigasi bawah mobile yang ergonomis.
   - Pilihan Paket (`/packages`): Penyesuaian padding kartu menjadi `p-5 sm:p-8` sehingga seluruh rincian fitur dan harga terbaca leluasa di layar 360px – 390px.

5. **Studio Mandiri Dual-Device Showcase & Dedicated Guide (`/how-it-works`):**
   - **Showcase Simulasi Realistis 5 Tab Mandiri (`HowItWorksInteractive.tsx`):** Menampilkan perbandingan sinkron dan simulator dasbor klien 5 tab interaktif berbasis tema Nusantara (Dillalucky, Candani, Badrika) dan palet Royal Gold/Emerald Green, dilengkapi autonomous loop fake cursor.
   - **Audit Data & Pre-Publish Launchpad (Tab 4):** Meniru persis arsitektur `app/(client)/dashboard/settings/page.tsx` dengan Hero Launchpad dan Jendela Sliding Ticker 3 Baris (`mask-image` linier) yang memverifikasi 10 komponen kesiapan data sekuensial sebelum status publikasi resmi mengudara (`PUBLISHED`).
   - **Konsistensi Penamaan File Bahasa Inggris:** Seluruh modul kode dan rute terstandarisasi penuh dalam Bahasa Inggris (`app/how-it-works/page.tsx`, `app/how-it-works/HowItWorksInteractive.tsx`), serta terdaftar dalam `PLATFORM_EXCLUSIONS` pada `middleware.ts`.

---

## 18. Arsitektur Sesi Acara Utama (Primary Event Anchor), Kuncian Pasca Publikasi, & All-Access Themes

1. **Sesi Acara Utama Tunggal (`isPrimary: true`):**
   - Setiap undangan memiliki tepat 1 sesi acara yang ditetapkan sebagai **Sesi Acara Utama** (misalnya: Akad Nikah atau Resepsi Utama).
   - Ditandai dengan badge khusus `★ Sesi Acara Utama (Patokan Masa Aktif)` pada Seksi 5 Studio Editor.
   - Sesi utama ini menjadi jangkar tunggal (*single source of truth*) kalkulasi:
     * Masa aktif undangan (`expiresAt = mainDate + 30 hari`).
     * Batas kedaluwarsa galeri foto kenangan tamu (`galleryExpiresAt = mainDate + 14 hari + extraGalleryDays`).
     * Countdown Timer di cover HTML live (`targetDate = mainDate + startTime`).
     * Header tanggal pernikahan di tema (`weddingDate`).
     * Jadwal Google Calendar pengingat tamu.

2. **Kunci Tanggal & Status Sesi Utama Pasca Publikasi:**
   - Selama berstatus `DRAFT`, pengantin bebas mengatur dan mengubah tanggal acara utama serta memindahkan penanda sesi utama.
   - Setelah undangan diterbitkan (`PUBLISHED`), formulir Studio Editor otomatis dikunci (`isLocked = true`).
   - Input tanggal pada sesi acara utama **dikunci permanen (disabled)** untuk klien non-admin dan tombol *"Jadikan Sesi Utama"* disembunyikan agar patokan tanggal tidak bergeser. Penyesuaian tanggal utama pasca publikasi hanya dapat dilakukan oleh Super Admin melalui Dasbor Admin via endpoint `/api/admin/invitations/[id]/lifecycle` (`UPDATE_EVENT_DATE`).
   - Sesi-sesi acara lainnya (seperti Pengajian, Siraman, Mappacci, Resepsi ke-2) **tetap bebas disesuaikan tanggal dan jamnya kapan saja**.
   - Modul operasional tamu (`/dashboard/guests`, RSVP online, seat VIP) dan kamera momen (`/dashboard/moments`) **tetap terbuka penuh** dan berjalan real-time.

3. **Alur Buka Kunci Darurat (Emergency Unlock 24 Jam):**
   - Admin membuka kunci darurat dari Dasbor Admin (`adminUnlockedUntil` aktif 24 jam).
   - Klien melakukan koreksi data di Studio Editor, lalu menekan **"Perbarui Undangan & Kunci Kembali"** (`DEPLOY_AND_LOCK`).
   - Sistem membake ulang file HTML live CDN dalam 1 kali kompilasi tunggal dan otomatis mereset `adminUnlockedUntil = null`, mengunci kembali studio secara instan.

4. **Pengurutan Kronologis Otomatis:**
   - Rangkaian acara diurutkan secara otomatis berdasarkan kronologi waktu: `Tanggal (Ascending) -> Jam Mulai (Ascending)`.
   - Sesi tambahan yang memiliki tanggal lebih awal (misal H-1) secara otomatis naik ke posisi nomor 1 di atas acara utama tanpa merusak penanda sesi utama.

5. **Penegasan Kebijakan All-Access Themes & Feature-Gating:**
   - Koleksi seluruh 16 tema desain terbuka 100% untuk semua paket (`TIER_1`, `TIER_2`, `TIER_3`).
   - Diferensiasi antar paket murni bertumpu pada **Feature Gating**:
     * TIER_1 (Serenade): Undangan Intim, Musik Autoplay, Galeri Prewedding, RSVP Online, Generator WhatsApp Personal.
     * TIER_2 (Symphony): Fitur Tier 1 + Scanner Resepsionis QR Check-In (`qr_checkin`) + Kamera Momen Tamu / Guest Memories Vault (`guest_memories`).
     * TIER_3 (Eternity): Fitur Tier 2 + Custom Domain Pribadi (`custom_domain`) + Kuota Tamu & Foto Maksimal.

6. **Arsitektur Deduplikasi Dasbor Klien & Pemisahan Modul Hari H:**
   - **Dasbor Utama (`/dashboard`):** Menampilkan metrik eksekutif, status undangan, hitung mundur, dan ringkasan kehadiran (bebas dari kartu operasional teknis tumpang tindih).
   - **Buku Tamu (`/dashboard/guests`):** Menampung Portal Resepsionis Hari H (`/[slug]/receptionist`) untuk scanner tiket QR tamu di meja penerima tamu pintu masuk beserta PIN akses panitia dan tombol salin info WO.
   - **Pusat Komando Dedicated Moments (`/dashboard/moments`):** Pusat operasional kamera virtual lengkap dengan 3D Tri-Device Mockup Showcase (iPhone 16 Pro + Media Fisik Standing Banner & Kartu QR), pemilihan 5 filter film analog kurasi, stempel LED, formulir multi-sesi jadwal & kuota, pengatur roll, studio cetak standing banner akrilik 300 DPI, dan download center ZIP.
   - **Studio Editor (`/dashboard/invitation/[id]` Seksi 14):** Khusus pengaturan estetika tampilan web undangan (*Circle Stories*, *Modern Masonry*, *Clean Minimalist*) dan teks judul tanpa instrumen operasional berat.

---

## 19. Penguatan Hari-H: Proteksi Konkurensi RSVP, Resepsionis Offline-First Idempoten, & Pencegahan Kebocoran Disk VPS

1. **Proteksi Konkurensi & Double-Tap RSVP (`/api/public/rsvp`):**
   - **In-Memory Mutex Key-Lock (`withRsvpLock`):** Mengunci antrean secara deterministik per `invitationId:namaTamu` untuk mencegah eksekusi ganda saat tombol submit ditekan berulang kali di koneksi lambat.
   - **Transaksi Atomik Database (`prisma.$transaction`):** Menjamin pencarian dan pembuatan data RSVP berlangsung dalam 1 siklus atomik terisolasi, mengeliminasi duplikasi data dan race condition.
   - **Kalkulasi Pax Katering Cerdas:** Kuota kehadiran dibatasi sesuai alokasi `guestQuota` pengantin untuk tamu terdaftar, maksimal 2 orang untuk tamu umum, dan dinormalkan ke 0 pax bagi tamu yang berhalangan hadir.

2. **Idempotensi Antrean Sinkronisasi Offline Resepsionis (`/api/receptionist/scan`):**
   - **Offline-First Resilience:** Menangani skenario meja resepsionis tanpa internet yang menampung antrean tamu di `localStorage.offlineQueue`.
   - **Idempotent Queue Flushing:** Ketika koneksi kembali dan antrean disinkronkan ke server dengan `isCheckIn: true`, tamu yang sudah terverifikasi hadir di server langsung direspons `success: true` dengan penanda `alreadyRedeemed: true`. Ini mencegah error 400 atau antrean macet (*queue deadlock*), sekaligus memberikan notifikasi akurat pada layar petugas.

3. **Mitigasi Kebocoran Disk VPS pada Siklus Cron Cleanup (`/api/cron/cleanup`):**
   - Pada masa retensi selesai (H+14 pasca acara utama) saat undangan dialihkan ke status `ARCHIVED`, cron job secara otomatis membuang HTML terbitan canonical (`deletePublishedHtml`) dan membersihkan draft lokal di `data/drafts/<id>.html`.

4. **Integrasi Add-On Top-Up Kuota Momen Tamu (`MEMORIES_TOPUP`):**
   - Mendukung pembelian tambahan kuota roll foto tamu via kasir mandiri (`/checkout`).
   - Akumulasi instan ke plafon acara (`totalEventQuota`) di endpoint `/api/public/memories/upload` yang dieksekusi otomatis pasca pembayaran oleh helper `applyMemoriesTopup`.

5. **Purifikasi Skema Murni & Master Seed Terpadu (`prisma/seed.ts`):**
   - Menghapus model mati `Wish` dan tabel `wishes` dari skema.
   - Menstandarkan tabel `guests` ke kolom `phone` murni dan enum `WaStatus` (`PENDING`, `SENT`).
   - Menanamkan seluruh 84 parameter platform (nama paket dinamis `Serenade`, `Symphony`, `Eternity`), 16 tema master, 2 preset musik, dan akun admin default ke dalam seed otomatis terpadu dengan proteksi non-destruktif (klausul `update` pada `AdminSetting` hanya memperbarui label metadata dan tidak pernah menimpa nilai `value` produksi).
6. **Resolusi Domain Kanonikal Subdomain & Slug (`app/(public)/s/` & `[slug]`):**
   - Menjamin bahwa seluruh pengalihan internal untuk subdomain yang belum terisi (`subdomain-available`), kedaluwarsa (`subdomain-expired`), maupun undangan berstatus `ARCHIVED` diarahkan ke URL kanonikal resmi (`NEXT_PUBLIC_APP_URL` / `https://luxvite.id`) tanpa membocorkan binding reverse proxy internal (`localhost:3001`).
7. **Isolasi Subdomain Total (Strict Subdomain Isolation Guard di `middleware.ts`):**
   - Mengalihkan seluruh subdomain sistem (`demo`, `app`, `www`, dll.) serta seluruh rute halaman platform (`/packages`, `/login`, `/dashboard`, `/admin`, dll.) ke domain kanonikal `https://luxvite.id`.
   - Mengisolasi subdomain klien aktif secara murni untuk 5 fungsi acara (undangan, tamu personal, galeri momen, resepsionis QR, upload foto tamu) sehingga mustahil terjadi tabrakan rute (*URL collision*).

---

## 20. Mitra & Vendor Pernikahan (Wedding Credits): Estetika Bersih Tanpa Card Wrap & Auto-Placement Universal

1. **Arsitektur Tanpa Card Wrap (Clean Floating Presentation):**
   - **Zero Card Wrap:** Logo vendor (berformat PNG transparan/WebP/SVG) dan teks nama vendor melayang bersih langsung di atas kanvas/latar belakang tema undangan tanpa pembungkus kotak, border, atau latar kartu (`background: transparent !important; border: none !important; box-shadow: none !important;`).
   - **Preservasi Warna Asli Brand:** Logo vendor mempertahankan warna asli brand (oranye, emas, biru, dsb) tanpa filter monokrom invert, sehingga identitas visual mitra tampil otentik dan tajam.
   - **Tampilan Fleksibel & Responsif:**
     - Jika ada Logo + Nama: Logo PNG transparan berada di atas dan nama vendor di bawahnya dengan teks halus elegan berpalet tema (`color: var(--accent) !important`).
     - Jika hanya Logo: Logo PNG melayang dengan transisi *hover micro-scale* (1.06x).
     - Jika hanya Nama: Teks nama vendor tampil bersih tanpa kartu pembungkus.
   - **Proteksi Warna Link (:visited Isolation):** Link vendor `<a class="lux-vendor-link">` diproteksi dengan aturan CSS khusus (`color: var(--accent) !important; text-decoration: none !important;`) sehingga tidak terpengaruh warna ungu default peramban (`#551a8b`).
   - **Tautan Cerdas:** Otomatis mengubah input `@username` menjadi `https://instagram.com/username` dan link web dengan `target="_blank"`.
   - **Layout Terpusat Dinamis (Centered Flexbox):** Menggunakan flexbox horizontal terpusat (`display: flex; flex-wrap: wrap; justify-content: center; gap: 2.2rem 2.8rem;`) sehingga baik 1 vendor, 2 vendor, maupun banyak vendor selalu tertata simetris dan rapi di tengah kanvas.

2. **Auto-Placement Universal di Atas Footer (`lib/renderTemplate.ts`):**
   - Engine secara otomatis menyuntikkan section vendor tepat sebelum tag `<footer` di seluruh 15 master tema jika tema tidak mendeklarasikan placeholder manual.
   - Mematuhi **Zero-Gap Policy**: jika `showVendors` nonaktif atau daftarnya kosong, section menghasilkan string kosong `""` tanpa sisa padding atau margin yang merusak tata letak.

3. **Studio Editor Klien (Seksi 16 di `/dashboard/invitation/[id]`):**
   - Ditambahkan sebagai Seksi 16: *"Mitra & Vendor Pernikahan (Wedding Credits)"* di panel editor dashboard.
   - Dilengkapi sakelar toggle `showVendors`, kustomisasi judul section (`customLabels.vendorTitle`, default: "Vendor") dan subtitle ucapan terima kasih (`customLabels.vendorSubtitle`).
   - Manajemen item vendor interaktif dengan format **Compact Single-Row Strip**: baris horizontal ramping (~48-52px) yang menyatukan slot logo mini (64×40px dengan preview langsung, file picker terintegrasi, dan tombol clear), input nama vendor, input tautan/Instagram, serta tombol hapus tanpa card wrap bertingkat (bebas cardception).
   - Terintegrasi penuh dengan sistem *Dirty Tracking* (`isDirty.sec16`) dan auto-save `saveSection("sec16")`.

4. **Theme Demo Studio Admin (Tab ke-5 "Mitra Vendor"):**
   - Integrasi tab ke-5 *"Mitra Vendor"* di modal Demo Studio Admin (`/admin`).
   - Format **Compact Single-Row Strip** konsisten dengan Client Studio: slot logo mini interaktif (unggah berkas via `/api/admin/themes/[id]/demo-asset` atau input URL kustom manual), input nama, tautan akun, dan tombol hapus.
   - Fitur lengkap: toggle visibilitas seksi vendor demo, kustomisasi judul/eyebrow/subtitle seksi, dan tombol cepat *"Muat 4 Logo Dummy Default"* (`/uploads/logo_dummy/logo_1.png` s.d. `logo_4.png`).
   - Kompilasi otomatis file static HTML showroom (`/public/demo/[theme]/index.html`) saat admin menyimpan perubahan.

5. **Harmonisasi Blueprint Master Tema & Eliminasi Wrapper `.reveal` Statis:**
   - Seluruh 16 master template tema dan cetakan draft aktif dibebaskan dari wrapper usang `<div class="reveal">` yang sebelumnya mengunci seksi vendor pada `opacity: 0` di tema bertipe `.reveal-on-scroll` (Candani, Solaria, Lumina, Badrika, Mayang, Chronicle).
   - Inisialisasi IntersectionObserver scroll pada seluruh tema distandarisasi mengamati varian reveal lengkap (`.reveal-on-scroll, .reveal, .reveal-up, .reveal-zoom, .reveal-fade`).
   - `public/css/modules.css` diselaraskan agar mendukung pemicu kelas ganda (`.reveal.active, .reveal.is-visible`).
   - Registry `lib/themeDefaults.ts` diperbarui menyertakan narasi bawaan vendor (`vendorTitle`, `vendorEyebrow`, `vendorSubtitle`) untuk seluruh arketipe tema (Candani, Traditional, Modern, dan Premium).

---

## 21. Penguatan Stabilitas DevOps & Ketahanan Server (v5.8.0)

1. **Batas Koneksi PostgreSQL Terukur (`lib/prisma.ts`):**
   - Mendefinisikan batas eksplisit pool `max: 10` per worker Node.js (dapat dikonfigurasi via `DB_POOL_MAX`), `idleTimeoutMillis: 30000`, dan `connectionTimeoutMillis: 5000`.
   - Menjamin pemakaian koneksi PostgreSQL tetap di bawah ambang batas default `max_connections = 100` saat berjalan di PM2 Cluster multi-instance.

2. **Disaster Recovery Mandiri ke Cloudflare R2 (`lib/databaseBackup.ts`):**
   - Setiap pencadangan harian (`pg_dump -F c`) otomatis mengunggah arsip snapshot biner terkompresi ke Cloudflare R2 (`backups/database/snapshot_xxx.sql`).
   - Melenyapkan risiko Single Point of Failure (SPOF) dari penyimpanan backup di harddisk lokal yang sama.

3. **Sinkronisasi Retensi Subdomain Multi-Sesi (`app/(public)/s/[subdomain]/route.ts`):**
   - Memperbarui rute penanganan subdomain tamu agar mengevaluasi tanggal acara mutakhir (`getLatestEventDate`) dan menghormati setting platform `retention_cleanup_days` serta `subdomain_auto_recycle`.

4. **Otomatisasi Pendaftaran Crontab OS & Rotasi Log PM2 (`deploy.sh`):**
   - Menanamkan instalasi dan konfigurasi otomatis `pm2-logrotate` (maksimal 10MB x 7 rotasi terkompresi).
   - Menanamkan pendaftaran otomatis jadwal pemeliharaan `/api/cron/cleanup` (02:00) dan `/api/cron/backup` (03:00) ke dalam crontab Linux host saat deployment, menghilangkan kebutuhan intervensi manual oleh engineer IT.

---

## 22. Sinkronisasi Sesi Acara Utama, Kalender & Arsitektur Tema (v5.8.5)

1. **Sinkronisasi Kalender Google & Countdown Timer ke Sesi Utama (`isPrimary: true`):**
   - Seluruh 16 tema master (`aurelia`, `artisan`, `kalandra`, `valente`, `wave`, `papercut`, `ameera`, `chronicle`, `lumina`, `solaria`, `prameswari`, `dillalucky`, `badrika`, `mayang`, `candani`, `lagaligo`) kini mengonsumsi `{{googleCalendarUrl}}` dan `{{targetDate}}` yang terpusat ke Sesi Acara Utama.
   - Memastikan agenda tamu di Google Calendar dan waktu hitung mundur hari H selalu selaras dengan tanggal acara puncak.

2. **Deduplikasi Cerdas Multi-Sesi Acara (`lib/themeEngine.ts`):**
   - Jika semua sesi berada di venue dan tanggal yang sama, kartu lokasi disatukan (`.event-unified-venue-card`).
   - Jika terdapat sesi di hari yang berbeda atau lokasi terpisah, tanggal spesifik sesi (`.ev-session-date`) dicantumkan eksplisit di atas jam acara dan setiap sesi memiliki tombol Google Maps mandiri.

3. **Standarisasi Global Opening Cover Desktop (100vw):**
   - Tema `ameera` dan `chronicle` kini mengadopsi layar sampul pembuka 100% viewport di desktop (`@media (min-width: 900px)`), memanfaatkan foto landscape 16:9 (`landingCoverDesktopUrl`) secara optimal sebelum undangan dibuka.

4. **Evolusi Desain Unik Tema Ameera & Chronicle:**
   - **Ameera:** Bahasa desain Modern Arch / Romantic Silhouette dengan kubah lengkung modern, tombol kapsul, dan timeline Love Story mutiara.
   - **Chronicle:** Bahasa desain Cardless Pure Editorial Timeline dengan rel 1px, diamond node 9px (`rotate(45deg)`), dan pemisah garis putus-putus tipis tanpa kotak latar.
