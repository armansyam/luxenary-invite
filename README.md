# Luxenary Invite — S-Invite Platform

> **Platform Undangan Pernikahan Digital B2C Self-Service**  
> Next.js 16.3.2 · Prisma 7.9 (PostgreSQL) · NextAuth v5 · Multi-Gateway (5 Gateway) · Nodemailer SMTP · Cloudflare R2  
> **Versi Dokumen: 5.9.6 | Diperbarui: 22 September 2026**

> [!IMPORTANT]
> **PROTOKOL SINKRONISASI DOKUMENTASI OTOMATIS (MANDATORY POST-EDIT & PRE-PUSH PROTOCOL):**  
> Setiap kali selesai melakukan pengeditan kode (fitur baru, bugfix, refactor, perubahan skema database, atau penambahan endpoint) dan **sebelum/saat melakukan push ke Git remote (GitHub)**:
> 1. **Periksa Seluruh Kode Faktual:** Jangan membuat asumsi. Baca kode implementasi riil untuk memverifikasi perubahan.
> 2. **Perbarui Semua File Dokumentasi Master:**
>    - [`README.md`](./README.md) — Selaraskan alur, versi, tabel tema, dan instruksi deployment.
>    - [`docs/SYSTEM_ARCHITECTURE.md`](./docs/SYSTEM_ARCHITECTURE.md) — Perbarui diagram arsitektur, peta routing, skema database Prisma, dan lifecycle.
>    - [`docs/S-Invitation.md`](./docs/S-Invitation.md) — Perbarui spesifikasi fungsional dan kapabilitas modul.
> 3. **Verifikasi Empiris:** Wajib jalankan `npx tsc --noEmit` (Exit Code 0) sebelum menyatakan pekerjaan selesai.
> 4. **Commit & Push Bersamaan:** Seluruh dokumen yang diperbarui **WAJIB di-commit dan di-push bersamaan** dengan kode agar GitHub selalu sinkron dengan kondisi codebase lokal!

---

## Tentang Platform

Luxenary Invite adalah platform SaaS undangan pernikahan digital berbasis model **B2C (Business-to-Consumer)** di mana calon pengantin mendaftar mandiri, memilih paket, membayar, lalu mengakses studio editor untuk membangun undangan digital mereka. Setelah publish, undangan tampil sebagai **file HTML statis mandiri** yang disajikan langsung dari disk — tanpa SSR, tanpa DB query per request. Seluruh estetika platform dan tema dikunci ketat ke **Light Luxury Palette** (`color-scheme: only light !important`) dengan proteksi W3C `only` untuk mencegah browser ponsel (Safari, Chrome, Brave) melakukan auto-inversi mode gelap yang merusak kontras visual. Seluruh antarmuka (Admin, Klien, Scanner, Landing Page, dan Tema Publik) menerapkan **Clean SaaS UI Standard** dengan eliminasi total dialog native browser (`window.alert` / `window.confirm`), eliminasi total ornamen panah generik bawaan AI (`→` / `<svg>`) demi menghadirkan standar *Editorial Luxury Typography* murni, proteksi tombol anti-wrap (`white-space: nowrap`) di mode mobile, modal dialog terintegrasi berlatar *backdrop blur*, floating toast alerts, dan respons status inline.

---

## Alur Kerja B2C (Lengkap)

```
[Calon Klien]
     │
     ▼
1. LANDING PAGE (/) & SHOWROOM KATALOG (/demo)
   - Katalog paket + demo tema interaktif (28 tema fisik master & 18 palet warna)
   - **Studio Mandiri Showcase (Dual-Device Live Sync):** Simulasi visual panggung Laptop Editor bersanding dengan Mobile Phone Preview 1:1, live typing, gallery & audio player, serta sebar link WhatsApp instan.
   - **Alternating Zig-Zag Showcase (Koleksi, Studio, Pengalaman):** Ritme visual editorial berimbang selang-seling (Koleksi: Mockup Kanan, Studio: Mockup Kiri, Pengalaman: Mockup 3D iPad Kanan dengan *3D perspective mirroring* dan teks narasi bebas tabrakan foto latar).
   - **Panduan Terdedikasi (`/how-it-works`):** Edukasi alur mandiri dengan bahasa santun & intuitif, anti-jargon, simulasi interaktif dasbor klien 5 tab (Live Canvas, Tema Nusantara, Buku Tamu VIP, RSVP, serta Pre-Publish Audit Launchpad & Sliding Ticker sekuensial), dan FAQ lengkap.
   - Tab "Sistem & Fitur Acara" (Zero-Setup Unified Demo Sandbox):
      - `/demo/receptionist` (Sistem Resepsionis Digital, Generator Tiket QR & Pemindai Live)
      - `/demo/sharemoment` (Guest Moment Camera: Kamera Analog Retro, 5 Preset Filter Film, Date Stamp & Opening Showcase)
      - `/demo/memories` (Galeri Kenangan Tamu Roll Stack 1 Card / Tamu, Touch-Swipe Multi-Foto Lightbox & Simulasi Unduh ZIP)
      - *Otomasi Demo:* Seluruh tema showroom (`/demo/[theme]`) otomatis mengarahkan tombol fitur ke rute demo terpadu tanpa perlu setup manual.
   - Halaman Pendukung Dinamis:
     - `/terms` (Syarat & Ketentuan Layanan)
     - `/privacy` (Kebijakan Privasi Data)
     - `/refund` (Kebijakan Pengembalian Dana)
     - `/contact` (Pusat Bantuan & Kontak WhatsApp/Email Resmi)
   *(Seluruh informasi nama platform, kontak, meta title & tab browser terhubung dinamis ke DB Admin Settings)*
     │
     ▼
2. LOGIN + PILIH PAKET (/login → /packages)
   Google OAuth → Pilih paket (TIER_1 Serenade / TIER_2 Symphony / TIER_3 Eternity).
   *Onboarding Guard:* Jika klien memiliki tagihan aktif berstatus PENDING, akses ke /packages otomatis dicegat dan dilempar kembali ke kasir aktif (/checkout?order=...).
     │
     ▼
3. KASIR & CHECKOUT (/checkout)
   - *Review & Nomor Kontak:* Tinjauan rincian paket, nomor WhatsApp pembeli, dan breakdown biaya transparan.
   - *Sistem Kupon Promo & Mitra Referral:* Validasi diskon instan dengan reservasi kuota 15 menit (`PromoHold`). Mencegah double-claim dan race condition.
   - *Konfirmasi Pesanan:* Mengunci diskon dan melanjutkan ke halaman pembayaran mandiri.
     │
     ▼
3b. PEMBAYARAN MANDIRI (/payment?order=ID)
   - *URL State & QRIS Hydration:* URL mengikat `?order=ID`. Refresh halaman (F5) tetap menampilkan summary dan countdown QRIS tanpa reset ke tombol awal.
   - *Penyimpanan Nyata Database:* Seluruh transaksi tersimpan permanen di PostgreSQL (`orders` table), menjamin verifikasi status dan summary 100% konsisten.
   - *Realtime SSE Stream & Zero Polling:* Menggunakan Server-Sent Events murni (`/api/payments/status-stream/[orderId]`) dengan jembatan cross-process PostgreSQL `LISTEN/NOTIFY` untuk PM2 Cluster Mode. Event pembayaran instan (<5ms) tersiar ke seluruh instance PM2 tanpa polling browser.
   - *Graceful QRIS Session Renewal:* Regenerasi QRIS baru jika 15 menit kedaluwarsa tanpa mereset pesanan, nomor invoice, atau diskon promo yang terkunci pada masa aktif pesanan 24 jam.
   ┌─────────────────────────────────────┬──────────────────────────┐
   │  Gateway 2-Arah (Midtrans & Xendit) │  Transfer Bank Manual    │
   │  Core API QRIS / Snap / Invoice     │  (Bebas Hardcode)        │
   │  Two-Way Cancel & Zero Ghost Payment│  Upload WebP ke R2 via   │
   │  → Webhook Auto-PAID + Invoice Email│  Custom Domain Edge CDN  │
   │  → Realtime SSE Push to Client      │  → Admin Approve/Reject  │
   │  → Idempotent Marketing & Komisi    │  → Graceful Re-upload    │
   └─────────────────────────────────────┴──────────────────────────┘
     │
     ▼
4. ONBOARDING & SETUP IDEMPOTEN (/dashboard/setup)
   - Setup awal: nama mempelai, tanggal acara, dan tema perdana
   - Idempotent Setup & Auto-Bypass: Jika klien sudah memiliki draft terdaftar, sistem langsung mengarahkan ke Studio Undangan tanpa form ganda atau error bentrokan orderId.
   - Lewati Setup (Atur Nanti): Membuat draft netral seketika untuk langsung melompat ke Studio.
     │
     ▼
5. STUDIO UNDANGAN (/dashboard/invitation/[id])
   - Pilih & ganti tema: Bebas memilih dari seluruh **28 tema fisik aktif** (Traditional, Modern, Premium) & **18 palet warna** tanpa batasan tingkatan paket.
   - Sesi Acara Utama (`isPrimary: true`) sebagai patokan mutlak (*single source of truth*) masa aktif sistem (`expiresAt`), batas retensi galeri foto tamu (`galleryExpiresAt`), Countdown Timer, dan header tanggal tema.
   - Isi data pengantin & keluarga (4 kolom terpisah: Ayah & Ibu dengan deteksi otomatis awalan "Putra dari" / "Putri dari" tanpa dropdown anak ke-n), jadwal acara multi-event (auto-sort kronologis: Tanggal -> Jam).
   - Pengaturan Musik Latar Pernikahan (Audio background, preset sakral, unggah MP3/M4A, sinkronisasi otomatis tombol Buka Undangan & fallback interaksi)
   - Upload foto (cover, groom, bride, gallery, dll)
   - Kustomisasi seksi (Universal Vertical Glowing Luxury Timeline untuk Kisah Cinta / Love Story di seluruh 19 tema master, Smart Puzzle Grid Galeri Momen 4-kolom, Gift, QR Check-in, Teks Galeri Kenangan Tamu)
   - Kelola tamu + generate WhatsApp link personal (Deteksi cerdas Custom Domain / Subdomain & proteksi draft) dengan filter toolbar **Borderless Glowing Beam Tabs** (`Semua Tamu`, `Sudah Terkirim`, `Belum Dikirim`) dan badge kategori minimalis.
   - RSVP & ucapan real-time dengan tab navigasi **Borderless Glowing Beam** beranimasi sliding light beam 60 FPS (`Semua`, `Hadir`, `Tidak Hadir`, `Ragu-ragu`).
   - **Studio Editor & Triple Native Tabs (Form Data vs Live Visual vs Build Custom):** Switcher mode ditenagai animasi **Sliding Magnetic Pill** (rel inset lembut dengan thumb fisik bergeser deterministik `Form Data`, `Live Editor`, dan `Build Custom`) yang mengintegrasikan **Direct Action Chips** (`⚠️ Perlu: [ + Sampul ] [ + Foto Mempelai ]`) di sisi kanan untuk menghemat ruang vertikal tanpa kartu bertumpuk.
      - **Mode Form Data (Master-Detail Navigator):** 16 seksi terstruktur dengan navigasi sidebar kiri (desktop) & horizontal pills (mobile). Seksi yang dipilih selalu terbuka penuh (*always expanded, zero auto-collapse on save*), eliminasi tombol toggle akordion buka/tutup yang redundan, dirty tracking per-seksi, isolasi warna swatch busana, smart dynamic gift section, dan **Seksi 16: Mitra & Vendor Pernikahan (Wedding Credits)** berantarmuka **Compact Single-Row Strip** (bebas cardception, slot logo mini 64×40 terintegrasi, input nama, akun Instagram, dan tombol hapus) dengan estetika melayang bersih tanpa card wrap (*borderless floating presentation*) tepat di atas footer (hanya tampilkan kartu rekening/QRIS tanpa tab jika alamat kado kosong, serta simpan berkas QRIS di `public/uploads/invitations/[id]/qris.webp`).
      - **Pengalaman Mobile Presisi (Anti-Matryoshka Card & Sticky Quick-Save Bar):** Menghilangkan tumpukan padding/margin berlapis di layar smartphone (< 768px). Seluruh 16 seksi formulir beradaptasi menjadi tata letak *edge-to-edge* datar (`rounded-none sm:rounded-3xl border-y sm:border p-3.5 sm:p-7`) yang membebaskan ~128px ruang horizontal berharga. Dilengkapi **Sticky Floating Quick-Save Bar** di zona jangkauan jempol bawah layar (`fixed bottom-3`) dengan indikator status dirty reaktif per-seksi dan tombol simpan instan, otomatis menyembunyikan floating dock 6-menu agar tidak bersaing sentuh dengan keyboard virtual ponsel, serta merestrukturisasi daftar tamu (`/dashboard/guests`) ke format High-Density 2-Tier. Pratinjau live di mobile menampilkan kanvas 100% native tanpa pembungkus frame mockup tiruan.
      - **Mode Live Visual:** Kanvas pengeditan langsung dengan Real-Time Palette Synchronizer dan kontrol pratinjau responsif.
      - **Mode Build Custom Studio:** Kebebasan penuh meracik sendiri desain per-seksi secara modular (8 seksi: Cover, Home, Pasangan + 5 Bingkai Foto Card-less tanpa kotak kartu ekstra di belakang foto, Acara, Kisah, Galeri, Hadiah, Penutup) dengan arsitektur split 2-kolom (kontrol kiri + sticky live preview kanan berpenghubung postMessage & endpoint instan), dual-mode segmented switcher (`[Fokus Seksi]` untuk inspeksi instan tanpa cover vs `[Undangan Utuh]`), isolasi CSS ketat BEM namespaces (`lux-{section}-{model}--{elem}`), serta dialog konfirmasi transisi anti-kehilangan draft.
   - **Live View Real-Time Palette Synchronizer, Clean Preview & Magnetic Device Switcher:** Panel palet 6 warna utama terpasang langsung di atas kanvas Live View dengan *two-way sync* instan ke Seksi 1 formulir data. Tombol *"Buka di Tab Baru"* dan tombol navigasi layar proteksi terhubung ke `mode=preview` murni untuk evaluasi visual bersih tanpa gangguan widget editor, serta kontrol pratinjau (`Mobile` vs `Layar Penuh`) mengusung animasi *Sliding Magnetic Pill*.
   - **Proteksi Pasca Publish & Buka Kunci Darurat:** Begitu terbit, form editor terkunci otomatis demi melindungi integritas QR Code fisik dan data live. Admin dapat membuka izin edit darurat via panel `/admin` (24 jam). Pengeditan menerapkan *Staging Save* (tanpa beban rebake storm) dan diakhiri dengan tombol **"Perbarui Undangan & Kunci Kembali"** untuk 1x atomic bake ke Cloudflare R2 dan auto-lock instan.
     │
     ▼
6. HERO LAUNCHPAD PUBLIKASI (/dashboard/settings)
   - Verifikasi Sekuensial 10 Bagian dengan radar audit & jendela sliding ticker 3-baris bergulir otomatis
   - Validasi ketat tanggal acara sebagai referensi masa berlaku website & penanganan 2 opsi santun data opsional
   - HTML mandiri di-bake (Zero-Flicker) → disimpan ke lokasi statis & R2 sync (dilengkapi Arsitektur Preloader Hibrida & Anti-Visual Leak: deteksi otomatis preloader kustom master tema atau injeksi Universal Obsidian Gold Shimmer)
   - Banner sambutan formal & netral pasca-publikasi dengan Official Launch Box (SSL badge, Salin Tautan, Buka Web, WhatsApp)
   - Sinkronisasi instan seketika ke Buku Tamu (/dashboard/guests) dan Dasbor (/dashboard) tanpa caching lag
     │
     ▼
7. HARI H & PASCA ACARA (DASHBOARD OPERASIONAL BERDASARKAN TIER)
   - Tamu scan QR → Receptionist check-in (PIN-protected, khusus Modern & Premium)
   - Virtual Disposable Camera Retro (/sharemoment) → Didahului **Layar Pembuka Ramah Tamu (Guest Moment Opening Screen)** dengan 3 pilihan model layout (`POLAROID_MINIMAL`, `VINTAGE_FILM`, `MODERN_ELEGANT`), kustomisasi teks instruksi kartu (`memoriesCardInstruction`), cap tanggal analog, live countdown jadwal pra-acara, dan tombol pembuka sensor kamera non-agresif (*"Buka Kamera"*). Dilengkapi 5 filter film analog branded (Aura '90s, Heritage Romance, Botanical Mist, Cinema Noir, Pure Daylight), stempel tanggal oranye retro LED (#e8875a), jadwal multi-sesi dengan **Smart Quota Boundary Guard** (`Math.min` real-time clamping, tombol bagi rata kuota, dan validasi sisi server), antrean offline, **notifikasi otomatis multi-milestone (50%, 80%, 100%) terkonfigurasi dinamis di Admin Settings via email terarah ke Dasbor privat**, banner peringatan amber & rose di Dasbor Pengantin, re-arming milestone otomatis pasca top-up kuota, serta **wording analog sopan** (*"Roll kamera kenangan telah terisi penuh dengan cinta..."*) saat kuota habis demi menjaga martabat pengantin di depan tamu.
   - **Studio Desain Kartu Cetak QR & Standing Banner (A3, A4, A5, 4R):** Generator kartu cetak interaktif siap pakai di Dasbor Klien dengan 4 model format standar percetakan, kustomisasi judul dan petunjuk tamu mandiri, serta ekspor resolusi tinggi 300 DPI (PNG) siap cetak.
   - Monitoring & moderasi kiriman foto tamu di Pusat Komando Moments (`/dashboard/moments`) & dasbor utama dengan grid navigasi cepat 3-kolom bersih (Studio Editor, Buku Tamu, RSVP) tanpa kartu duplikat.
   - Custom Domain Pribadi: Tersedia gratis dan opsional khusus Paket Premium (diatur langsung lewat Dasbor Pengaturan Klien tanpa biaya tambahan).
   - Arsitektur URL Bersih & Mandiri: Halaman web undangan (`/[slug]` atau `/s/[subdomain]`) selalu dapat diakses penuh secara konsisten sepanjang masa aktif layanan; Galeri Momen (`/memories`) dan Kamera Disposable (`/sharemoment`) memiliki rute terdedikasi dengan navigasi kembali ke undangan yang jelas.
   - Siklus Hidup Terpadu (H+14 Pasca-Acara): Subdomain, custom domain, foto candid tamu R2/lokal, dan RSVP dibersihkan secara bersamaan dalam 1 fase cron cleanup tunggal.
   - Dasbor Memorial 1 Halaman (Saat ARCHIVED): Klien disajikan surat apresiasi penutup, 4 metrik ringkasan eksekutif, dan Pusat Unduhan Arsip Digital (.CSV Doa Restu & .CSV Kehadiran Tamu). Akun klien disimpan abadi tanpa penghapusan.
   - Layanan Perpanjangan Masa Simpan: Add-on perpanjangan masa aktif sebelum kedaluwarsa (+30 Hari Rp50.000 / +1 Tahun Rp150.000 via QRIS).
   - Subdomain otomatis didaur ulang ke pool namespace pasca `subdomain_grace_days` jika `subdomain_auto_recycle = "true"`, sementara URL Asli (`/[slug]`) tetap aktif sebagai arsip kenangan abadi.
   - Download koleksi foto ZIP (Client-side JSZip dengan proteksi status DRAFT & peringatan unduh dini) + Perpanjang Masa Aktif URL Asli / Galeri (+30 Hari via QRIS)

[Admin]
   ▼
ADMIN PORTAL (/admin)
   - Ringkasan (Overview): Metrik transaksi, klien aktif, omset
   - Pesanan (Orders): Kelola order, konfirmasi/tolak struk manual, cancel gateway
   - Klien (Users): Manajemen akun terbagi ke dalam 3 segmen filter (*Semua*, *Klien Aktif*, dan *Calon Klien / Leads*). Tombol **Remote Dasbor Klien** hanya aktif untuk klien yang memiliki ruang kerja/undangan, sedangkan calon klien dilengkapi pintasan follow-up WhatsApp dan opsi penghapusan akun lead yang batal.
   - Undangan (Invitations): Manajemen siklus hidup (Close to Gallery, Extend), dan fitur **Remote Klien** untuk mengendalikan Dasbor Klien secara utuh tanpa password (berbasis *httpOnly Cookie Session Override* dengan *Immunity Guard* di Admin, Emergency Amber Warning Banner, dan auto-cleanup cookie saat logout).
   - Domain Kustom (Custom Domains): Monitoring domain klien, panduan konfigurasi Caddy, dan shortcut ke tab Setup DNS.
   - Tema & Musik (Themes & Music): Manajemen katalog tema dengan showcase visual interaktif Device Pair Mockup (Tablet 16:10 + Ponsel 1:2 bersanding dengan resolusi aset thumbnailDesktop & thumbnailMobile otomatis), Demo Studio (kustomisasi 6 seksi narasi & label tema, dynamic timeline acara, dynamic bab cerita, dynamic rekening bank, harmonisasi casing font skrip vs uppercase, dan pewarisan otomatis ke undangan klien), serta Pustaka Musik Sistem dinamis (auto-sync file fisik audio di disk `public/music/` ke database, tambah audio dengan auto-kompresi FFmpeg MP3 128kbps, preview, edit, dan toggle aktif/nonaktif untuk klien)
   - Portofolio (Portfolio): Kurasi & kloning undangan pilihan → /portfolio
   - Pengaturan (Settings): 
     - **Tab Setup & Integrasi:** Konfigurasi DNS & IP Server (auto-detect IP publik VPS, CNAME target dinamis), SMTP Email Server, Batas Upload Media & Galeri (Video Studio hingga 100 MB, Foto Studio, dan Foto Galeri Tamu Memories), dan Siklus Hidup & Retensi Sistem (parameter tunggal 14 hari pasca acara).
     - **Tab Platform:** Branding & Identitas Platform, CS Support, Hero Tagline, Fitur Landing Page, Template WhatsApp.
     - **Tab Paket & Harga:** Konfigurasi harga paket undangan (TIER_1 Serenade, TIER_2 Symphony, TIER_3 Eternity) serta Layanan Tambahan (Add-Ons) resmi: Perpanjang Masa Aktif Bulanan (30 Hari - Rp50.000) dan Tahunan (1 Tahun - Rp150.000). Fitur custom domain sudah melekat gratis dan opsional pada Paket TIER_3 Eternity.
     - **Tab Gateway QRIS:** Pusat kontrol global dan sub-tabs terisolasi per vendor gateway 2-arah (Midtrans dan Xendit) dengan kredensial terpadu dan resolusi endpoint otomatis.
   - Database (Database): Snapshot backup & restore PostgreSQL
   - Monitoring (Monitoring & Status Server): Pemantauan kestabilan sistem 60-hari interaktif (Interactive Uptime Status Bar), pemantauan memori fisik Host RAM VPS (`os.totalmem()`), Host OS Uptime, beban partisi root Linux (/), latensi & metrik ukuran terpakai Cloudflare R2 Media Storage (kapasitas terpakai, sisa kuota bebas biaya 10 GB), serta audit aktivitas staf & webhook gateway.
   - Tim & Akses (Team): Manajemen akun staf admin dengan isolasi 4-tier Role Access Matrix (`SUPER_ADMIN`, `ADMIN`, `FINANCE`, `SUPPORT`) dilengkapi pratinjau hak akses menu dinamis (*Reactive Allowed vs Restricted Tab Badges*).
   - Pemasaran & Afiliasi (Marketing): Manajemen kupon promo & diskon (potongan persen/nominal, kuota, masa berlaku, alokasi sementara promo hold saat checkout), kemitraan mitra afiliasi (Wedding Organizer, KOL, vendor) dengan perhitungan komisi otomatis, pelacakan konversi, dan pencairan saldo komisi.
   - **Kas & Hasil Bisnis (Finance):** Dashboard kas terpadu single-page (`AdminCashflowTab`) yang berfokus murni pada hasil bisnis riil: omzet masuk otomatis dari pesanan paket lunas (PAID), buku kas pengeluaran operasional (OPEX), visualisasi grafik batang bulanan (Jan - Des), dan kalkulasi sisa kas bersih riil tanpa birokrasi penutupan buku atau lembar pajak formalitas yang membebani.
   *(Dilengkapi Tab Memory Persistence via URL Query & LocalStorage sehingga reload halaman tidak pernah terpental kembali ke tab ringkasan)*
```

---

## URL Format Undangan & Relasi Arsitektur

```
Format Subdomain (Sementara menjelang & saat acara, H+subdomain_grace_days):
  https://dimas-clarissa.luxenary.id

Format URL Asli / Kanonikal (SATU-SATUNYA PINTU UTAMA / Single Source of Truth):
  https://luxenary.id/dimas-clarissa-030326
  (Pasca acara otomatis bertransformasi menjadi Galeri Kenangan Tamu)

Format Portofolio (HTML statis terisolasi):
  https://luxenary.id/portfolio/dimas-clarissa-030326

Format Custom Domain (Inklusif Paket Eternity):
  https://dimas-clarissa.com (Auto-SSL Caddy & internal rewrite ke endpoint URL Asli)

Sub-routes publik:
  /dimas-clarissa-030326/memories     → Galeri foto tamu (real-time SSE)
  /dimas-clarissa-030326/sharemoment  → Upload foto tamu
  /[slug]/receptionist               → Scanner QR tamu (PIN-protected, Custom Domain & Canonical)
  /s/[subdomain]/receptionist         → Scanner QR tamu via subdomain (PIN-protected)

Pre-Flight Checklist & Smart Audit (/dashboard/settings):
  - Evaluasi sekuensial 12 komponen data sebelum rilis resmi (termasuk verifikasi seluruh slot unggahan visual & foto kedua mempelai).
  - Zero Data Bolong: Seksi bersakelar aktif wajib memiliki data lengkap; seksi yang dinonaktifkan berstatus "Nonaktif (Dilewati)" dan otomatis lolos.
  - Verifikasi Slot Upload: Menjamin tidak ada foto model atau latar demo bawaan tema yang tertinggal karena kelupaan unggah.
  - Runtime Auto-Pruning: Seksi yang dimatikan otomatis dihilangkan dari DOM dan navigasi dock bawah / tombol floating audio disembunyikan tanpa meninggalkan tombol statis kosong.
  - Gatekeeper 6 URL: Tombol "Rilis Undangan Resmi" terkunci hingga ke-6 instrumen URL (Pintu Utama, Subdomain, Tamu, Resepsionis, Galeri Kenangan /memories, dan Form Kamera /sharemoment) terkonfirmasi dengan dukungan DRAFT preview (?preview=true).
```

---

## Paket & Tema (All-Access 28 Tema Fisik + 18 Palet Warna + Diferensiasi Kapabilitas)

> **All-Access Themes Model:** Seluruh 28 tema fisik aktif (kategori Traditional, Modern, maupun Premium) serta 18 palet warna **bebas dipilih oleh calon pengantin di semua paket**. Diferensiasi paket difokuskan murni pada kapasitas tamu, fitur sistem (QR check-in / custom domain), plafon kuota kamera disposable kenangan tamu, dan masa retensi.

| Paket | Kapasitas & Fitur Utama | Plafon Kamera Disposable (Admin Setting) | Pilihan Tema |
|:--|:--|:--|:--|
| **Serenade** *(TIER_1)* | Hingga 300 Tamu, Subdomain Platform, RSVP & Ucapan Realtime, Musik Latar Bebas, Retensi 1 Bulan (30 Hari) | Kamera Tamu: **Nonaktif** *(Dapat diaktifkan via Admin)* | **Bebas Semua 28 Tema & 18 Palet** *(Traditional, Modern, Premium)* |
| **Symphony** *(TIER_2)* | Hingga 1.000 Tamu, Seluruh Fitur Serenade + **Sistem Resepsionis QR Check-In & PIN Staf Panitia**, Retensi 1 Bulan (30 Hari) | Total Kuota: **250 Foto Acara** *(Pengantin bebas atur roll per tamu)* | **Bebas Semua 28 Tema & 18 Palet** *(Traditional, Modern, Premium)* |
| **Eternity** *(TIER_3)* | **Tamu Tanpa Batas (Unlimited)**, Seluruh Fitur Symphony + **Hak Integrasi Custom Domain**, Dashboard Monitoring Momen Tamu, Retensi 1 Bulan (30 Hari) | Total Kuota: **1.000 Foto Acara** *(Pengantin bebas atur roll per tamu)* | **Bebas Semua 28 Tema & 18 Palet** *(Traditional, Modern, Premium)* |

> Harga dan kuota plafon kamera per paket serta add-on top-up foto (+100 Foto - Rp35.000) dan perpanjangan (+30 Hari - Rp50.000) dapat diatur mandiri oleh Administrator di Admin Portal → tab Paket & Harga tanpa perlu deploy ulang.

### Standar Arsitektur Template Undangan
- **Cover Gate & Smart Mobile Fullscreen:** Tombol buka undangan (`data-lux-field="customLabels.openBtn"`) wajib memiliki teks fisik default `"Buka Undangan"` dan didukung fallback engine agar tidak pernah kosong/transparan. Saat tombol diklik, sistem mengeksekusi `requestSmartFullscreen()` di seluruh 19 tema master dan `starter-blueprint.html` untuk memicu Fullscreen API atau auto-hide address bar mobile via `window.scrollTo(0, 1)`.
- **Tema Tradisional Toraja (`toraja`):** Tema etnik ke-7 (tema master ke-17) yang mengangkat warisan budaya Toraja dengan ornamen asli (*Pa'barre Allo*, border bergerak *Pa'kadang Pao Seamless*, siluet ganda *Rumah Tongkonan Perspektif*, *Mandala Toraja*), bingkai foto *Arch Frame* adaptif di seksi Home dengan conditional fallback, kanvas scrim 70% seragam untuk keterbacaan teks maksimal, aset demo resmi 9 slot media penuh (`public/demo/toraja/`), tipografi berketerbacaan tinggi (*Cinzel*, *Great Vibes*, *Plus Jakarta Sans*), narasi adat puitis (*Misa' kada dipotuo, pantan kada dipomate* dan *Kurresumanga'*), serta palet dinamis Merah Tua Toraja & Emas (`#750b0a` / `#f1d17e`).
- **Tema Tradisional Bugis (`bugis`):** Tema etnik ke-8 (tema master ke-18) yang mengangkat kemegahan tradisi bangsawan Bugis Saoraja dengan Gerbang Walasuji Bambu Megah 85% (`vapillion-bamboo2.webp`), framing foto mempelai dinamis, selempang sutra Bugis (`sabbe.webp`) penutup batas bawah foto di balik tiang bambu, mahkota rumbai Bugis Atas (`bugis-atas.webp`), 4 sudut bunga emas presisi flush (`flower-tl/tr/bl/br.webp`), border horizontal emas bawah (`frame-bottom.webp`), tekstur marun sakral (`bg-maroon.webp`), narasi luhur *"Sipakatau, sipakalebbi, sipakainge"*, serta palet Bugis Royal Maroon & Gold (`#5a0b10` / `#dfb76c`).
- **Tema Tradisional Makassar (`makassar`):** Tema etnik ke-9 (tema master ke-19) yang mengangkat filosofi kehormatan dan kemaritiman agung Makassar dengan lambang Kapal Phinisi (`kapal-phinisi.webp`), bingkai border Makassar (`frame-makassar-top.webp`, `frame-makassar-bottom.webp`), tekstur navy agung (`bg-makassar.webp`), narasi *"Siri' na Pacce"* dan *"Bajiki passiriki, sombere' na malabbiri"*, serta palet Makassar Phinisi Navy & Gold (`#0a192f` / `#dfb76c`).
- **Tema Tradisional Toraja Rantepao (`rantepao`):** Tema etnik ke-10 (tema master ke-20) yang mengangkat kemegahan kultural adat Toraja Rantepao berbalut Crimson Marun & Kilau Emas Bambu, integrasi 9 slot media lengkap (`LANDING_COVER`, `LANDING_COVER_DESKTOP`, `HOME_PHOTO`, `DESKTOP_SIDEBAR`, `GLOBAL_FIXED_BG`, `GROOM_PHOTO`, `BRIDE_PHOTO`, `GALLERY`, `CLOSING_COVER`), ornamen ukiran Passura' & Rumah Tongkonan, narasi agung *"Misa' kada dipotuo, pantan kada dipomate"*, serta palet Toraja Crimson Marun & Gold (`#6b1414` / `#d4af37`).
- **Tema Tradisional Toraja Makale (`makale`):** Tema etnik ke-11 (tema master ke-21) yang mengangkat keagungan adat Tana Toraja Makale berbalut Royal Earth Crimson & Kilau Emas Tongkonan, integrasi 9 slot media lengkap (`LANDING_COVER`, `LANDING_COVER_DESKTOP`, `HOME_PHOTO`, `DESKTOP_SIDEBAR`, `GLOBAL_FIXED_BG`, `GROOM_PHOTO`, `BRIDE_PHOTO`, `GALLERY`, `CLOSING_COVER`), ornamen ukiran Passura' & Buntu Burake, petuah leluhur *"Misa' kada dipotuo, pantan kada dipomate"*, serta palet Toraja Crimson Marun & Gold (`#750b0a` / `#f1d17e`).
- **Dukungan Video Loop Sinematik (Seamless Crossfade):** Mendukung video background loop pada `LANDING_COVER` (Cover HP portrait 9:16), `LANDING_COVER_DESKTOP` (Cover desktop landscape 16:9 fullscreen), `DESKTOP_SIDEBAR` (Hero layar lebar), dan `GLOBAL_FIXED_BG` (Latar kartu). Sistem otomatis memotong klip maksimal 20 detik, menerapkan filter *seamless crossfade loop* (0.6s–1.2s) agar sambungan loop tak kasat mata tanpa jump cut, membuang audio track (`-an`) untuk kepatuhan autoplay instan di mobile, mengunci frame rate ke 30 fps, serta menyuntikkan tag HTML `<video class="..." autoplay loop muted playsinline webkit-playsinline>` dengan overlay gradasi kontras.
- **Arsitektur Dual Cover Responsif (Mobile 9:16 vs Desktop 16:9 Fullscreen Override):** Mendukung pemisahan cover pembuka independen antara layar ponsel (`LANDING_COVER`, Portrait 9:16) dan layar komputer (`LANDING_COVER_DESKTOP`, Landscape 16:9). Jika slot desktop tidak diisi, sistem otomatis menerapkan *graceful fallback* ke cover mobile. Pada tema dengan layout panel-terbatas (seperti Badrika, Candani, Mayang, Solaria, Lumina, Chronicle) yang membatasi kartu ke 460px, injeksi `@media (min-width: 900px)` secara cerdas mengubah cover menjadi fullscreen fixed 100vw/100vh di seluruh layar desktop tanpa mengganggu kartu undangan 460px di dalamnya.
- **Latar Belakang Seksi Home Mandiri (`HOME_PHOTO` & `homePhotoCssUrl`):** Slot foto halaman utama terinjeksi mandiri ke Seksi 1 (`.slide-opening#home` / `.fixed-bg-layer`) dengan scrim gradient pelindung teks. Jika kosong, seksi Home mempertahankan kanvas transparan murni (`homePhotoCssUrl = ""`) tanpa dipaksa melakukan fallback ke tekstur/gambar demo latar belakang (`background.webp`). Saat klien mengunggah foto home, foto mereka langsung tampil sebagai latar belakang seksi pembuka secara presisi.
- **Zero-Fake Fallback & Infinite Seamless Flow (Anti-Garis Potong):** Jika klien tidak mengunggah foto background global (`GLOBAL_FIXED_BG`), engine meneruskan string kosong (`""`) alih-alih memaksa aset demo. Kanvas latar belakang murni mengekspos warna dasar palet tema (`body { background: var(--bg-dark); }` / `--bg-light`) dan gradasi perlindungan kontras bawaan. Seluruh seksi aliran konten (`.slide-opening`, `.sec-flow`) terbebas dari garis pembatas pemotong layar (`border-bottom: none;`) dan panel gulir (`.main-scroll-panel`) 100% transparan, menciptakan transisi visual antar-seksi yang menyambung mulus sebagai satu kanvas utuh tanpa jahitan.
- **Tipografi Budaya Otentik Aksara Lontara (Tema La Galigo):** Terintegrasi langsung dengan berkas font fisik `public/fonts/Lontara.ttf` via `@font-face` lokal, menyematkan aksen tipografi aksara Bugis geometris (*Sulapa Eppa'*) pada frasa sakral adat (*Salama'* di Cover/Hero/Footer, *Botti'* di Seksi Mempelai, serta petuah luhur pernikahan Bugis *Sipakatau, Sipakalebbi, Sipakainge* di kartu doa pembuka). Teks Lontara berpadu harmonis dengan teks Latin sehingga nilai estetika budaya terangkat tanpa mengurangi kemudahan baca bagi para tamu.
- **Arsitektur Desktop Split 460px (Golden Ratio Standard):** Pada layar desktop/layar lebar (≥ 1024px atau ≥ 900px), seluruh 19 tema fisik master dan starter blueprint menerapkan pembagian rasio presisi: sidebar kiri dinamis mengisi ruang panggung sisa (`width: calc(100% - 460px)`), sedangkan panel undangan utama dikunci tepat pada lebar mobile flagship ideal **460px** (`width: 460px; margin-left: calc(100% - 460px)`). Lapisan latar belakang (`.fixed-bg-layer`) dan video background berposisi fokus pada kolom undangan 460px di desktop (tidak tumpah 100vw ke belakang sidebar), dan otomatis 100% fullscreen di perangkat mobile. Navigasi floating dock bawah secara matematis dipusatkan di `left: calc(100% - 230px)`.
- **Tipografi Anti-Overflow Split Desktop (Mobile-Emulation Scale):** Karena unit CSS `vw` mengevaluasi layar monitor utuh (1440–1920px), seluruh judul seksi `.sec-main-title, .sec-heading` pada mode split kanan dibatasi ketat dengan `clamp(1.75rem, 2.1rem, 2.3rem) !important;` serta proteksi `overflow-wrap: break-word !important; word-break: break-word !important;`. Padding seksi desktop dinormalisasi ke `1.8rem` (memberikan lebar efektif konten ~404px). Standar arsitektur ini terpasang secara permanen di seluruh 19 tema master serta template developer `starter-blueprint.html` (tersedia untuk diunduh di `/downloads/starter-blueprint.html`) yang kini dilengkapi Seksi Pembuka Opening Hero 100vh `#home` dan `<nav class="bottom-dock">`.
- **Home-Safe Audio FAB Auto-Hide & Triple Blueprint 1:1 Synchronization:** Tombol audio mengambang (`#musicToggle` / `.audio-fab`) disembunyikan secara mutlak (`fab-hidden`) saat berada di seksi pembuka `#home` agar tidak mengotori keindahan tampilan pembuka, dan otomatis muncul menyelaraskan diri dengan `.bottom-dock` saat tamu scroll melintasi batas seksi pembuka. Seluruh 3 berkas cetak biru sistem ([`themes/starter-blueprint.html`](themes/starter-blueprint.html), [`public/downloads/starter-blueprint.html`](public/downloads/starter-blueprint.html), dan [`theme-builder/starter/master.html`](theme-builder/starter/master.html)) dijaga 100% sinkron secara identik (*zero-drift*), lengkap dengan kustomisasi seleksi kursor `::selection` berbasis token palet aktif.
- **Standarisasi Universal Token Dinamis & Panduan Master Blueprint (`themes/BLUEPRINT_GUIDE.md`):** Seluruh 19 berkas master tema dan starter blueprint distandarisasi 100% bebas dari teks statis/hardcode kultural (`﷽`, `WALIMATUL 'URS`, dll.). Dilengkapi token dinamis universal `{{openingGreeting}}`, `{{coverBadge}}`, `{{quoteSectionEyebrow}}`, `{{quoteSectionTitle}}`, serta dukungan penghapusan bersih string kosong (`""`). Panduan teknis lengkap bagi Theme Builder tersedia di [`themes/BLUEPRINT_GUIDE.md`](themes/BLUEPRINT_GUIDE.md).
- **Standarisasi 5-Layer Master Stacking Hierarchy (Pemisahan Kanvas & Anti-Blackout Scrim):** Menerapkan pembagian layer absolut pada seluruh master template: Lapisan 1 (`body` palet warna), Lapisan 2 (`.fixed-bg-layer` gambar/video murni), Lapisan 3 (`.scrim-canvas` gradien transparan pelindung teks 15%–45%), Lapisan 4 (`.layout-wrapper` konten undangan), dan Lapisan 5 (`#coverScreen` pembuka). Menghilangkan tabrakan opacity dan menjamin ilustrasi arsitektur tema tetap terlihat anggun.
- **Arsitektur Musik Latar Bawaan Tema (Theme Default Music & Smart Inheritance):** Setiap tema memiliki musik latar default resmi berdasarkan budayanya (`/music/bermuara.mp3` untuk traditional, `/music/canon-in-d.ogg` untuk modern & premium). Admin dapat mengelola lagu bawaan tema di Tab Themes -> Studio (`audioUrl`). Saat klien membuat undangan baru via `/api/client/invitations/create`, lagu ini otomatis terwariskan ke data undangan klien tanpa perlu pengaturan manual.
- **Adaptive Full-Height Closing Section (`100vh`) & Flush Alignment:** Seksi outro (`.site-footer` / `.closing-sec`) berukuran layar penuh `100vh` dengan penataan *flush* ke dasar layar (bebas celah/gap 90px–110px) dan adaptif terhadap unggahan foto penutup (`CLOSING_COVER`):
  - *Mode Kanvas Kosong (Default):* Latar murni transparan (`background: transparent;`) tanpa balok warna solid/hex mati, sehingga kanvas global (`body` dan `.fixed-bg-layer`) dan token palet tema (`--bg-dark`) tembus alami tanpa gambar dummy; teks ucapan terima kasih dan nama mempelai berposisi vertikal & horizontal tepat di tengah layar (`justify-content: center;`).
  - *Mode Foto Penutup:* Foto latar disuntikkan via `style="{{closingBgStyle}}"` berlayar penuh dengan overlay scrim gradasi (`.has-closing-photo::before`); teks ucapan bergeser elegan ke bagian bawah layar (`justify-content: flex-end;`).
- **Clean Embedded Live Visual Editor & Sinkronisasi Dua Arah Dual-View:** Kanvas pratinjau di dalam dasbor studio 100% steril bebas dari floating dock yang menutupi ornamen/logo sampul. Kontrol aksi *"Buka Amplop"* dan tombol *"Muat Ulang"* diposisikan secara elegan di toolbar atas dasbor. Mode Dual-View (Ponsel & Komputer Layar Lebar) dilengkapi sinkronisasi dua arah real-time:
  - *Two-Way Scroll Sync:* Menggulir pratinjau ponsel secara proporsional menggerakkan pratinjau desktop (dan sebaliknya) dengan anti-echo guard dan normalisasi container multi-tema.
  - *Form Input -> Dual Preview Keystroke Relay:* Pengetikan data di form dasbor (nama mempelai, kutipan, acara, cerita, rekening, label UI) langsung terproyeksi instan ke kedua iframe pratinjau tanpa perlu menyimpan atau memuat ulang browser.
  - *Universal Envelope Open Sync:* Menekan tombol buka amplop di salah satu iframe atau toolbar membuka sampul kedua layar secara serentak di semua tema fisik (termasuk split-desktop themes).
  - *Persistent DOM Mounting:* Berpindah antara tab *Form Data* dan *Live Editor* berlangsung seketika tanpa reload, mempertahankan posisi scroll, status amplop, dan state editan sementara.
- **Palet Warna Showroom Demo & Studio Editor Dinamis:** Admin Demo Studio dan Client Dashboard menyediakan selektor palet warna resmi (`champagne`, `emerald`, `burgundy`, `sage`, `terracotta`, `monochrome`, serta palet adat `toraja`, `bugis`, `makassar`). Di Live View Studio, palet warna dapat di-toggle rapi (*collapsible*) tanpa mendominasi kanvas editor. Seluruh tema terikat dinamis pada CSS custom properties (`--primary`, `--accent`, `--bg-light`, `--bg-dark`, `color-mix(...)`), memungkinkan tema berganti nuansa warna seketika secara live tanpa hardcoding di CSS. Seluruh 28 tema juga dilengkapi Smart Outro Auto-Hide pada floating dock dan kontrol musik saat mencapai dasar halaman untuk estetika 100vh yang bersih.
- **Showroom Katalog Demo Ringan (`/demo`) & Unified Dual-Device Showcase:** Mengusung konsep *editorial magazine*, katalog tema menyajikan representasi simultan dual-device (tablet landscape dan smartphone portrait realistis) yang harmonis tanpa lag dan tanpa tag `<iframe>` berat. Dilengkapi URL bar dinamis yang mendeteksi hostname klien secara otomatis (`window.location.hostname`), *precision-scoped hover overlay* yang terkungkung rapi di layar tablet, serta eliminasi card border kaku untuk estetika SaaS luxury.
- **Dynamic Asset Route Handler & RFC 9111 ETag Revalidation (`/demo/[theme]/[file]`):** Mengatasi limitasi Next.js Standalone yang hanya melayani aset statis `public/` saat build-time. Route handler menyajikan file thumbnail, gambar, dan audio baru secara instan dengan proteksi path traversal, ETag berbasis mtime/size, dan header `Cache-Control: public, max-age=0, s-maxage=604800, must-revalidate`. Mengeliminasi kebutuhan query string `?v=` dengan memaksa revalidasi kondisional di sisi browser (`304 Not Modified`) sambil mempertahankan cache 7 hari di Edge CDN Cloudflare. Berkas HTML kompilasi demo (`public/demo/*/index.html`) diperlakukan sebagai runtime cache murni yang diabaikan dari Git (`.gitignore`) dan dipra-kompilasi secara mandiri saat deployment (`./deploy.sh`) atau *on-the-fly* pada kunjungan pertama.
- **Proteksi Anti-Download, Fluid Layout & Clean Lightbox Navigation Galeri Kenangan (`/memories`):** Halaman kenangan tamu dirancang *View-Only* dengan proteksi browser bawaan (blokir klik kanan `contextmenu`, pencegahan menu pop-up tahan layar `touch-callout: none`, serta blokir drag-and-drop). Tampilan menggunakan format fluid edge-to-edge `max-w-[1920px]` (2-7 kolom) yang responsif di seluruh ukuran layar dari mobile hingga desktop, dilengkapi modal preview bersih tanpa ikon panah mengambang yang mendukung tombol keyboard panah (desktop) dan touch swipe (mobile), serta real-time SSE stream terintegrasi.
- **Kamera Disposable Tamu Fleksibel, Anti-Hangus & Boundary Clamping:**
  - *Jatah Roll Bebas & Estimasi Kapasitas:* Pengantin bebas menentukan jatah roll per tamu (1 - 30 Roll/Tamu) dari Studio Editor maupun langsung dari kartu dasbor Galeri Kenangan via modal *Atur Roll Tamu*, lengkap dengan estimasi partisipasi aktif `~Floor(Sisa_Pool / Jatah_Roll) Tamu`.
  - *Invarian Anti-Hangus (Non-Pre-Reservation):* Setiap foto diunggah seketika per jepretan (*real-time snapshot upload*) tanpa mengunci kuota pool di muka. Tamu yang menyelesaikan sesi tanpa menghabiskan seluruh jatah roll tidak akan menghanguskan kuota pool; sisa roll otomatis kembali utuh ke pool acara.
  - *Boundary Clamping Tamu Terakhir:* Ketika sisa kuota di pool lebih sedikit daripada jatah roll (misal sisa 8 foto dengan setting 15 roll), sistem secara otomatis menyesuaikan batas roll tamu tersebut (`effectiveShotsQuota = Math.min(configuredShotsQuota, remainingPool)`) sehingga sisa pool terisi bersih hingga 100% tanpa error HTTP 403.
  - *Unified Addon Modal Konsisten:* Seluruh pembelian add-on kuota foto, perpanjangan masa galeri, dan upgrade paket mengadopsi palet elegan **Warm Editorial Ivory & Royal Amber Gold** (`bg-white`, `border-stone-200`, `bg-amber-800`), selaras dengan identitas visual Luxenary.
- **Pemisahan Terstruktur 4 Kolom Orang Tua (Discrete Parents Architecture) & Murni String Bebas:** Formulir profil klien dan demo studio memisahkan input nama Ayah dan Ibu secara diskret (`groomFather`, `groomMother`, `brideFather`, `brideMother`). Theme Engine secara otomatis mendeteksi awalan `{{firstParentPrefix}}` / `{{secondParentPrefix}}` ("Putra dari" untuk Groom, "Putri dari" untuk Bride) serta menyuplai token discrete `{{firstFather}}` dan `{{firstMother}}` secara bersih murni sebagai *raw string* tanpa paksaan sapaan Bpk/Ibu, sehingga klien bebas mencantumkan gelar akademik/adat, sapaan penghormatan, atau status almarhum/almarhumah (`Alm.`, `Almh.`), sekaligus mengeliminasi duplikasi label, membuang simbol `&` yang tidak diinginkan pada tata letak vertikal, dan mencegah kata menggantung (*orphan words*) pada tipografi kartu profil di seluruh 19 tema fisik master.
- **Homepage Hero Mockup, Rasio Presisi Showcase (1:2 & 16:10) & Standarisasi Aset Visual (< 200 KB WebP):** Menyelaraskan 3 mockup ponsel iPhone 16 Pro pada landing page menjadi full-bleed screenshot murni berlayar penuh (`object-fit: cover; object-position: center top;`), terbebas dari bingkai kubah kaku (`.hero-inv-arch-box`), lapisan kartu overlay (`.hero-comp-card`), scrim gelap, maupun duplikasi teks dengan penamaan independen `hero_mockup_1.webp`, `hero_mockup_2.webp`, dan `hero_mockup_3.webp`. Standarisasi rasio presisi mockup showroom ditetapkan menjadi **1 : 2** untuk Mobile (HP: 390×780 px / 800×1600 px) dan **16 : 10** untuk Desktop (Laptop: 1280×800 px / 2560×1600 px). Seluruh aset visual dikompresi ke format WebP dengan batas Retina 2048px dan penajaman unsharp mask (`sharp.sharpen()`) dengan bobot 100% di bawah 200 KB untuk menjamin skor LCP Google Core Web Vitals < 2.5s.
- **Invarian Pembersihan Total Hapus Klien (File Cleanup Invariant):** Saat admin menghapus akun klien (`DELETE /api/admin/users`), sistem secara otomatis menjalankan pembersihan komprehensif yang menjamin zero-disk-waste dan zero-orphaned-files: menghapus file canonical publikasi (`public/published/ids/[id].html`), menghapus file draft (`data/drafts/[id].html`), menghapus seluruh objek media dan foto kenangan tamu dari Cloudflare R2 (`deleteFile`), serta menghapus direktori media fisik klien (`public/uploads/invitations/[id]/` dan `public/uploads/guest-memories/[id]/`) secara rekursif. Portofolio statis yang sudah dipublish tetap aman karena menggunakan klon aset mandiri.
- **Sinkronisasi Isolasi Storage & Unduh ZIP Memori Tamu (`guest-memories/`):** Direktori penyimpanan foto candid tamu diisolasi khusus ke `guest-memories/{invitationId}/` (Cloudflare R2 & lokal), terpisah dari foto resmi mempelai guna mendukung siklus auto-delete 60 hari. Fungsi pembuatan arsip ZIP (`lib/storage.ts: streamMemoriesToZip`) dan pembersihan berkala (`/api/cron/cleanup`) disinkronkan menunjuk ke prefix tersebut dengan fallback otomatis ke folder legacy.
- **Anti-Banding Smooth Gradient Hero Landing Page (`app/landing.css`):** Mengeliminasi gradasi bergaris (*color banding*) pada background landing page desktop dengan menerapkan transisi multi-stop bertingkat tinggi (*high-precision stops*) dan radial vignette halus sehingga gradasi hitam-ke-transparan terlihat mulus dan sinematik pada layar monitor sRGB/DCI-P3.
- **Standarisasi Ergonomi & Dimensi Mobile UI-UX (Golden Mobile Standard):** Mengadopsi `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` di seluruh tema master untuk menjamin kepatuhan aksesibilitas WCAG 1.4.4 (pinch-to-zoom aktif) dan transmisi variabel `env(safe-area-inset-*)`. Menstandarisasi `font-size: 16px` pada formulir input RSVP/ucapan guna mencegah auto-zoom liar pada Safari iOS, menerapkan safe-area insets pada floating dock (`bottom: calc(18px + env(safe-area-inset-bottom))`) dan tombol audio (`top: calc(18px + env(safe-area-inset-top))`), memastikan target sentuhan menu $\ge 44\times 44\text{px}$ (Apple HIG), serta mengoptimalkan masonry galeri modal mobile menjadi 2 kolom responsif.
- **Pengerasan Keamanan Konkurensi & Anti-Race Condition Multi-Proses:** Menutup celah konkurensi pada lingkungan PM2 cluster multi-proses melalui integrasi *PostgreSQL Advisory Transaction Locks* (`pg_advisory_xact_lock`) pada mutasi buku tamu RSVP dan upload foto kenangan tamu (menjamin kuota foto dan batas pax katering tidak bocor saat ribuan tamu mengakses serentak), *Atomic Compare-and-Swap* (`updateMany`) pada sistem pemindaian QR resepsionis (mencegah souvenir ganda saat dipindai bersamaan oleh 2 tablet), serta fungsi ekstraksi IP terpercaya (`getClientIp`) untuk mencegah manipulasi rate limiter via `X-Forwarded-For`.

---

## Tech Stack

| Komponen | Teknologi |
|:--|:--|
| **Framework** | Next.js 16.3.2 (App Router) |
| **Bahasa** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + Vanilla CSS |
| **Database** | PostgreSQL via Prisma 7.9.1 (`pg`) |
| **Auth** | NextAuth.js v5 — Google OAuth + Credential Admin |
| **Media Storage** | Cloudflare R2 (prod) + Local disk VPS (draft/dev) via `lib/storage.ts` (penamaan slot deterministik & clean overwrite) |
| **Image Processing** | `sharp` — WebP, resize, compress |
| **Video Processing** | `FFmpeg` — H.264, auto-trim 20s, no audio loop, 30fps cap, +faststart streaming |
| **Payment** | Gateway 2-Arah (Midtrans Core API QRIS & Xendit Invoice) + Transfer Bank Manual dengan transmisi profil pembeli lengkap (Nama, Email, WhatsApp/HP, Alamat, Item Branding, & Metadata) |
| **Mailer** | Nodemailer dengan kredensial SMTP dinamis via `admin_settings` |
| **Cron** | `POST /api/cron/cleanup` — retensi & cleanup otomatis |
| **Manajemen Proses** | PM2 (VPS) |

---

## 4 Kondisi Pembayaran & Transmisi Data Lengkap Gateway (Rich Payload)

Sistem mendukung 4 kondisi transaksi dengan integrasi 2-arah eksklusif (Midtrans & Xendit) yang dilengkapi pembatalan seketika (*two-way cancel/expire*) dan payload lengkap:
1. **Registrasi Paket Awal (`NEW`):** Aktivasi paket baru (`TIER_1` / `TIER_2` / `TIER_3`). Setelah lunas, klien langsung diarahkan ke `/dashboard/setup`.
2. **Upgrade Layanan (`UPGRADE`):** Klien menaikkan tier paket (misal `TIER_1` ke `TIER_2` / `TIER_3`) dengan selisih harga dinamis yang bersumber dari konfigurasi database (`AdminSetting`), disajikan via modal Obsidian Gold Luxury. Tier induk diperbarui seketika.
3. **2 Add-On Layanan Tambahan Murni:**
   - **Perpanjangan Masa Aktif (`GALLERY_EXTENSION`):** Menambah masa aktif website undangan, tautan subdomain, dan penyimpanan galeri foto momen tamu (+30 hari perpanjangan) serta membuka kunci upload.
   - **Top-Up Kuota Foto Momen (`MEMORIES_TOPUP`):** Menambah plafon kapasitas foto candid tamu di album kenangan (kelipatan 100 foto).
   *(Catatan: Custom domain merupakan fitur inklusif bawaan paket Eternity tanpa biaya jasa add-on).*
4. **Checkout Terpadu Multi-Layanan (`Unified Add-on & Upgrade Hub`):** Klien dapat menggabungkan upgrade tier paket, perpanjangan galeri multi-bulan, dan top-up kuota foto tamu ke dalam **1 checkout / 1 invoice tunggal** (`itemsJson`), dengan pemenuhan atomik berurutan (`applyBundleFulfillment`).

**Data Lengkap yang Ditransmisikan ke Payment Gateway:**
- **Profil Klien:** Nama depan & belakang (`first_name`, `last_name` / `given_names`, `surname`), email resmi, dan nomor kontak WhatsApp aktif (`phoneNumber` E.164).
- **Alamat:** Alamat penagihan & pengiriman digital terstandarisasi ISO `IDN`.
- **Notifikasi Multi-Kanal:** Xendit otomatis mengirim kuitansi dan status tagihan via WhatsApp, SMS, dan Email jika nomor ponsel disediakan.
- **Rincian Item & Branding:** Nama item spesifik, brand platform (`AdminSetting`), kategori layanan, dan biaya layanan admin (`ADMIN_FEE`) terpisah transparan.
- **Metadata Dua Arah:** Nomor invoice, UUID order, tipe pesanan, nama domain kustom, nama kedua mempelai, slug undangan, dan rincian transaksi platform.

---

## Database Models

| Model | Fungsi |
|:--|:--|
| `User` | Akun klien (Google OAuth, role: CLIENT / ADMIN, nomor WhatsApp `phoneNumber`) |
| `Admin` | Akun tim admin (SUPER_ADMIN, FINANCE, SUPPORT) |
| `Order` | Invoice pembelian paket & add-on (`NEW`, `UPGRADE`, `GALLERY_EXTENSION`, `MEMORIES_TOPUP`) |
| `Invitation` | Inti undangan (`DRAFT`, `PUBLISHED`, `EVENT_FINISHED`, `TAKEN_DOWN`, `ARCHIVED`) |
| `InvitationMedia` | Media per slot (9 slot: LANDING_COVER, LANDING_COVER_DESKTOP, HOME_PHOTO, GROOM_PHOTO, dll) |
| `Guest` | Daftar tamu + nomor kontak `phone` + QR token |
| `Rsvp` | Konfirmasi kehadiran tamu |
| `Wish` | Ucapan & doa tamu |
| `GuestMemory` | Foto candid kenangan tamu pasca-acara |
| `Theme` | Katalog tema undangan |
| `AdminSetting` | Konfigurasi platform dinamis (key-value) |
| `WebhookLog` | Log audit webhook payment (Midtrans & Xendit) |
| `AdminAuditLog` | Log aktivitas staf admin |
| `MusicPreset` | Pustaka musik sistem dinamis untuk latar undangan |

---

## Struktur Direktori

```
Luxenary-Invite/
├── app/
│   ├── (admin)/admin/         # Portal Admin (11 tab navigasi lengkap, termasuk Projek Undangan terfilter)
│   ├── (client)/dashboard/    # Studio klien (setup, invitation, guests, rsvp)
│   ├── (public)/
│   │   ├── [slug]/            # Canonical invitation route (memories redirect & fallback pintar ke portofolio / beranda)
│   │   └── s/[subdomain]/     # Sub-routes via subdomain
│   ├── api/
│   │   ├── admin/             # overview, orders, themes, settings, portfolio, invitations/[id]/lifecycle
│   │   ├── client/            # invitations, guests, media, rsvps, upload, memories/extend
│   │   ├── public/            # settings, themes, rsvp, memories, resolve-custom-domain, version
│   │   ├── payments/          # checkout, status-stream
│   │   ├── orders/            # create invoice
│   │   ├── webhook/           # midtrans, xendit (gateway 2-arah)
│   │   ├── cron/              # cleanup (retensi otomatis H+7 & H+30)
│   │   └── sse/               # Server-Sent Events (memories real-time)
│   ├── checkout/              # Flow pembayaran (multi-gateway 2-arah + manual transfer)
│   ├── demo/                  # Preview tema publik
│   ├── login/                 # Login klien
│   ├── onboarding/            # Flow setup awal pasca bayar
│   ├── packages/              # Halaman paket harga
│   ├── portfolio/             # Galeri portofolio publik terisolasi
│   ├── robots.ts              # SEO Googlebot crawler rules
│   ├── sitemap.ts             # Dynamic XML sitemap generator
│   ├── page.tsx               # Landing page utama
│   └── globals.css
├── lib/
│   ├── themeEngine.ts         # ⭐ Mesin render HTML undangan (CORE)
│   ├── themeDefaults.ts       # ⭐ Theme Blueprint Registry (kamus narasi budaya & editorial per tema)
│   ├── staticPublisher.ts     # ⭐ Bake HTML statis saat Publish (CORE)
│   ├── renderTemplate.ts      # Injeksi data, mapping tema, runtime script, Smart Dock Home Zone Guard & Hybrid Preloader Engine
│   ├── storage.ts             # Upload/delete media (R2 / S3 / Local switch)
│   ├── mailer.ts              # ⭐ Nodemailer transactional & invoice email generator
│   ├── driveHelper.ts         # Fetch foto Google Drive API v3
│   ├── settings.ts            # Single source of truth admin_settings dari DB
│   ├── planUtils.ts           # ⭐ Single source of truth nama komersial paket (Serenade, Symphony, Eternity)
│   ├── domainUtils.ts         # URL builder (subdomain, canonical di browser & client)
│   ├── serverDomainUtils.ts   # ⭐ Deteksi otomatis host dinamis & appUrl via request headers (Zero Hardcode)
│   ├── gatewayRegistry.ts     # Registry payment gateway 2-arah (Midtrans & Xendit)
│   ├── gateways/              # Implementasi gateway 2-arah: Midtrans, Xendit
│   ├── upgradeHelper.ts       # Upgrade paket & perpanjangan galeri (+30 hari)
│   ├── rateLimit.ts           # Rate limiter API publik
│   ├── sseEmitter.ts          # SSE emitter (momen real-time)
│   └── videoOptimizer.ts      # Kompres video sebelum upload
├── themes/
│   ├── premium/               # 4 tema: kalandra, valente, aurelia, artisan
│   ├── modern/                # 9 tema: wave, papercut, ameera, chronicle, lumina, solaria, badrika, candani, mayang
│   ├── traditional/           # prameswari, dillalucky, lagaligo, toraja, bugis, dsb.
│   └── starter-blueprint.html # Standar acuan struktur template tema
├── theme-builder/             # Lingkungan terisolasi perancangan tema baru & compiler lokal
│   ├── dummy-media/           # ⭐ Sumber terpusat foto slot dummy standar (single source of truth)
│   ├── starter/               # Template cetak biru acuan tema baru
│   └── workspaces/            # Workspace perancangan tema mandiri (zero-bloat)
├── components/
│   ├── BrandLogo.tsx
│   ├── client/
│   │   ├── UnifiedAddonModal.tsx       # Tambah kuota & perpanjangan masa aktif galeri
│   │   ├── PrintableQRCardModal.tsx    # Cetak standing banner & kartu QR
│   │   └── GuestOpeningSetupModal.tsx  # Kustomisasi layar pembuka tamu smartphone
│   └── admin/
│       ├── AdminPortfolioTab.tsx
│       ├── AdminProfileSettings.tsx
│       ├── AdminTeamManagement.tsx
│       ├── AdminOrdersTab.tsx        # Transaksi terpaginasi & ekspor CSV
│       ├── AdminClientsTab.tsx       # Klien, WhatsApp link & impersonate
│       ├── AdminInvitationsTab.tsx   # Siklus hidup projek & emergency unlock
│       ├── AdminCustomDomainsTab.tsx # Live DNS check & aktivasi 1-klik
│       ├── AdminMonitoringTab.tsx    # Detak kesehatan server, kuota & ukuran riil R2 (MB/GB), disk VPS, audit staf & webhook
│       ├── AdminCashflowTab.tsx      # Dashboard kas & hasil bisnis terpadu (uang masuk, keluar & sisa kas)
│       └── AdminThemeFactory         # ⭐ Generator tema modular Build Custom & kompilasi demo statis otomatis
├── public/
│   ├── published/             # HTML baked (subdomains/, slugs/, ids/)
│   ├── uploads/               # Media lokal draft (disajikan dinamis via app/uploads/[...path]/route.ts)
│   ├── portfolio/             # HTML portofolio terisolasi + aset lokal WebP
│   ├── demo/                  # Preview tema
│   └── music/fonts/assets/    # Aset statis sistem
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── prisma.config.ts           # Prisma 7 DB URL configuration
├── docs/
│   ├── README.md                              # Pusat indeks dokumentasi platform
│   ├── ALUR_REGISTRASI_KE_DASHBOARD.md        # Alur lengkap registrasi Google hingga masuk studio
│   ├── DATABASE_SCHEMA_DAN_RELASI.md          # Kamus data, ERD & lifecycle state machine
│   ├── API_REFERENCE.md                       # Katalog lengkap seluruh 40+ REST API, SSE & Webhook
│   ├── PANDUAN_PEMBUATAN_TEMA_BARU.md         # Theme developer guide, kamus token & standar HTML
│   ├── CLOUDFLARE_R2_DAN_CDN_SETUP.md         # Setup Cloudflare R2, domain CDN & auto-CORS
│   ├── SECURITY_DAN_PROTEKSI_DATA.md          # Arsitektur keamanan, AES-256-GCM & rate limit
│   ├── client/
│   │   ├── TAHAP_REGISTRASI_DAN_PEMBAYARAN.md  # Kasir checkout & pembayaran multi-gateway
│   │   ├── TAHAP_DASHBOARD_SETUP_AWAL.md       # Wizard setup awal 3 langkah
│   │   ├── TAHAP_STUDIO_EDITOR_UNDANGAN.md     # Studio editor 14 seksi & dual-native preview
│   │   ├── TAHAP_MANAJEMEN_TAMU_DAN_QR.md      # Buku tamu, import CSV, personalisasi link & tiket QR
│   │   ├── TAHAP_RSVP_DAN_MODERASI_UCAPAN.md   # Monitoring RSVP, hitung pax katering & feed doa
│   │   └── TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md # Subdomain checker, CNAME, & WOW publish
│   ├── SYSTEM_ARCHITECTURE.md  # ⭐ Arsitektur sistem menyeluruh, database & routing
│   ├── S-Invitation.md         # Catatan filosofi bisnis & spesifikasi fitur
│   ├── admin/
│   │   ├── DASHBOARD_OVERVIEW_DAN_STATISTIK.md # Analitik metrik bisnis, pendapatan & server health
│   │   ├── REMOTE_DAN_MANAJEMEN_KLIEN.md      # Cookie-based remote session & user lifecycle
│   │   ├── MANAJEMEN_UNDANGAN_DAN_DOMAIN.md   # Pengelolaan undangan, force publish/suspend, CNAME
│   │   ├── MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md # Invoice, manual approval pembayaran & multi-gateway
│   │   ├── MANAJEMEN_TEMA_ADMIN.md            # Upload master HTML fisik & auto-compile demo
│   │   ├── PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md # White-label, Cloudflare R2 CORS & maintenance DB
│   │   ├── CRON_DAN_MAINTENANCE_OTOMATIS.md   # Tugas terjadwal cleanup, retensi & backup DB
│   │   └── DEPLOYMENT_VPS_CADDY.md            # Panduan deployment VPS Ubuntu & Caddy TLS
│   └── public/
│       ├── 01_ARSITEKTUR_RENDERING_TEMA_DAN_ROUTING.md # Multi-domain resolution, compiler & dynamic CSS
│       ├── 02_PENGALAMAN_TAMU_UNDANGAN.md     # Cover gate, audio autoplay policy, kalender & maps
│       ├── 03_SISTEM_RSVP_DAN_BUKU_UCAPAN.md   # Form RSVP publik, rate limiting & nested wish reply
│       ├── 04_AMPLOP_DIGITAL_DAN_HADIAH_PERNIKAHAN.md # Rekening bank copy button, QRIS & kado fisik
│       ├── 05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md # Portal resepsionis, HTML5 QR scanner & souvenir
│       └── 06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md # Upload foto candid tamu, galeri kenangan live real-time & cloud memories
├── middleware.ts               # ⭐ Edge routing utama (CRITICAL)
├── README.md                   # Dokumentasi induk repositori (Root)
├── AGENTS.md                   # Aturan perilaku AI Agent (Next.js & Engine)
├── CLAUDE.md                   # Pointer kontrak Anthropic Claude Code CLI
└── deploy.sh                   # Script deploy VPS
```

---

## Instalasi & Setup

### 1. Install Dependensi
```bash
npm install
```

### 2. Environment Variables (`.env`)
```env
# Database (Prisma 7 via adapter-pg)
DATABASE_URL="postgresql://luxenary_user:password_rahasia@localhost:5432/luxenary?schema=public"

# NextAuth v5
AUTH_SECRET="min-32-chars-random"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (Klien & Admin)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Google API (untuk galeri Drive pre-wedding)
GOOGLE_API_KEY="..."

# Media Storage Provider ("local" | "r2" | "s3")
STORAGE_PROVIDER="local"
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_PUBLIC_URL="https://..."

# Keamanan Cron Cleanup
CRON_SECRET="your-secure-cron-token-here"

# Cloudflare Cache Purge (Opsional - untuk 1-klik purge edge cache via Admin)
CF_ZONE_ID="..."
CF_API_TOKEN="..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ROOT_DOMAIN="localhost:3000"
```

> **Catatan Pengaturan Dinamis & Integrasi Gateway Terpadu:**  
> Kredensial Payment Gateway 2-Arah (Midtrans & Xendit) dikelola langsung melalui tab Gateway QRIS di Portal Admin. Midtrans secara otomatis mengarahkan panggilan ke endpoint Sandbox jika Server Key diawali `SB-`, atau ke Live Produksi jika diawali format standar `Mid-`. Konfigurasi SMTP Email, tarif fee, durasi QRIS, dan harga paket dikelola **secara langsung dari Admin Portal (Tab Pengaturan)** tanpa perlu restart server atau edit `.env`.

### 3. Setup Database
```bash
# Untuk Development Lokal
npx prisma db push
npx prisma db seed

# Untuk Deployment Produksi (VPS) — 12 migrasi terverifikasi
npx prisma migrate deploy
npx prisma db seed
```

### 4. Jalankan Dev Server
```bash
npm run dev
```

### 5. Sinkronisasi Tema & Purge Cache
```
Admin Portal → Tab Tema → Klik "Sinkronisasi Tema & Cache"
(Atau via Tab Settings > Setup & Integrasi → Klik "Purge Cache")
```

---

## Build Produksi & Otomatisasi Deployment (VPS)

```bash
# Opsi 1: Deployment Otomatis Lengkap (Direkomendasikan di VPS)
chmod +x deploy.sh
./deploy.sh

# Opsi 2: Manual Build & Start
npm run build
npm run start
# atau via PM2 cluster:
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
```

### Skalabilitas Multi-Server (Shared Storage NFS & Symlink)
Untuk deployment kluster 2+ server VPS di balik Load Balancer (Cloudflare / Caddy):
- **Central Database & Object Storage:** PostgreSQL & Cloudflare R2 otomatis terpusat untuk seluruh node aplikasi.
- **Shared Storage via Symlink Linux:** Folder dinamis lokal (`themes/`, `public/demo/`, `data/drafts/`, `public/published/`) di-mount ke `/mnt/shared_luxenary/` dan dihubungkan ke project melalui symlink (`ln -s`). Kode Next.js 100% portabel dan konsisten tanpa modifikasi path.
- *Panduan lengkap:* Baca [Tahap 10: DEPLOYMENT_VPS_CADDY.md](docs/admin/DEPLOYMENT_VPS_CADDY.md#tahap-10-panduan-skalabilitas-multi-server-shared-storage-nfs--symlink-blueprint) dan [SYSTEM_ARCHITECTURE.md (17.13)](docs/SYSTEM_ARCHITECTURE.md#1713--arsitektur-skalabilitas-multi-server-shared-storage--symlink-mounting-pattern).

---

## Keamanan

- **Webhook Payment 2-Arah (Midtrans & Xendit)**: Diverifikasi signature SHA512 (Midtrans) & x-callback-token timing-safe (Xendit) dengan garansi pembatalan instan untuk mencegah ghost payment
- **Auth Guard**: Middleware memisahkan Admin, Client, dan Publik
- **Routing Loop Protection**: Middleware mengisolasi seluruh rute statis sistem (`PLATFORM_EXCLUSIONS` seperti `/contact`, `/privacy`, `/terms`, `/refund`, dll.) dari Flat Slug interceptor untuk mencegah *infinite rewrite loop*.
- **Reserved Subdomains Protection**: Subdomain `cdn` (Cloudflare R2), `admin`, `api`, `auth`, `static`, `assets`, dll. diproteksi terpusat via `lib/domainUtils.ts` dan dilarang diklaim oleh klien baik saat pemeriksaan ketersediaan maupun saat pembuatan/pembaruan undangan.
- **Upload**: Validasi kepemilikan via `userId` session
- **RSVP/Memories**: Rate-limited untuk cegah spam
- **Service Availability (Tutup Order / Maintenance / Coming Soon)**: Kontrol ketersediaan sistem terpusat dari Admin Portal (Tab Platform & Tampilan). Mendukung 4 status (`OPEN`, `CLOSED_ORDER`, `MAINTENANCE`, `COMING_SOON`) dengan notifikasi dinamis di Landing Page, Login, Paket, dan Checkout. Registrasi akun baru diblokir di NextAuth `signIn` callback dan endpoint `/api/orders/create` (HTTP 403), sementara klien lama yang telah terdaftar tetap bebas login & mengelola undangannya. Tamu undangan publik (`/[slug]`), RSVP, dan resepsionis 100% tetap aktif tanpa gangguan.
- **Receptionist**: Scanner QR dilindungi PIN panitia (AES-256-GCM), token sesi HMAC di localStorage, header profesional dengan BrandLogo dan judul terpusat, aksi navbar minimalis icon-only dengan indikator hijau online, arsitektur *Single-Screen Zero-Scroll Kiosk* (`h-screen overflow-hidden`) bebas scroll vertikal di seluruh jenis monitor/tablet, kolom kiri-kanan simetris dinamis (`h-full min-h-0`), tombol manual *"Kembali ke Siaga Scan"*, tombol Standby Screensaver di navbar, *Ambient Standby Screensaver* otomatis saat idle (Watermark inisial monogram mempelai di live dan Watermark BrandLogo platform di demo) dengan mode *True Standby* (hardware kamera mati total demi hemat daya, anti-overheating, dan perlindungan privasi; langsung aktif kembali saat layar disentuh atau barcode ditembak), auto-dismiss kartu check-in 15 detik, jeda kamera otomatis saat notifikasi aktif (anti-loop scan), judul pemindai "SCAN" & "KAMERA LIVE", daftar tamu ringkas tanpa badge count, mode Layar Penuh (Fullscreen Kiosk), isolasi warna tema (anti distorsi Dark/Light OS), serta dukungan kamera multi-device (Laptop webcam & Tablet dual-camera) dengan audio beep dan visual laser.
- **Portfolio**: Hanya SUPER_ADMIN yang bisa kloning undangan
- **SEO & Favicon Google Search Central**: Mematuhi spesifikasi Google Search dengan URL favicon stabil bebas parameter acak, aset multi-resolusi kelipatan 48px (`48x48`, `96x96`, `192x192`, `512x512`), Web App Manifest terintegrasi, perizinan bot di `robots.txt`, serta otomatisasi generate seluruh varian resolusi instan saat Admin mengunggah logo di tab Pengaturan.

---

## Protokol Otomatis Pembaruan Dokumentasi (Auto-Update on Edit/Push)

Platform ini menerapkan prinsip ketat: **Dokumentasi adalah cermin faktual dari kode riil**.
Setiap developer atau AI Agent yang melakukan modifikasi pada codebase **WAJIB** menjalankan siklus berikut:

```
[Edit / Modifikasi Kode]
         │
         ▼
[1. Baca Seluruh Kode Faktual] ──► Telusuri baris per baris tanpa asumsi
         │
         ▼
[2. Periksa & Perbarui 3 Docs] ──► docs/SYSTEM_ARCHITECTURE.md + README.md + docs/S-Invitation.md
         │
         ▼
[3. Verifikasi Empiris]        ──► Jalankan `npx tsc --noEmit` (Exit Code 0)
         │
         ▼
[4. Git Stage & Push]          ──► Commit & push kode bersamaan dengan docs ke `main`
```

### Aturan Baku Dokumentasi:
1. **Dilarang keras push tanpa menyelaraskan docs:** Jika ada penambahan endpoint, migrasi kolom database, gateway baru, atau perubahan alur UI, ketiga file dokumen (`README.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/S-Invitation.md`) wajib langsung disinkronkan di commit yang sama.
2. **Katalog Tema Fisik:** Pastikan jumlah tema fisik yang aktif di database dan template selalu sinkron (19 tema fisik aktif).
3. **No Phantom Docs:** Dokumentasi harus mencantumkan path dan nama variabel lingkungan aktual (misal format AWS SDK `S3_*` untuk R2, bukan format lama).
4. **Standar Kontrak Placeholder Nama Mempelai:** Cover buka undangan, hero title, sidebar desktop, dan closing footer **MUTLAK** menggunakan Nama Panggilan (`{{firstName}} & {{secondName}}`). Nama lengkap beserta gelar (`{{firstDisplayName}} & {{secondDisplayName}}`) hanya digunakan pada Seksi Profil Pasangan (*The Couple*).
5. **Standar Navigasi Imersif (Smart Auto-Hide):** Seluruh 19 tema fisik master dan starter blueprint menerapkan interaksi smart auto-hide untuk dock navigasi dan floating audio player saat pengguna menggulir ke bawah, dan otomatis kembali meluncur masuk saat menggulir ke atas atau mencapai footer.
6. **Standar Watermark Monogram & Wording Universal:** Tema desktop sidebar mendukung watermark monogram inisial (`{{coupleMonogram}}`, `{{firstInitial}}`, `{{secondInitial}}`) dan salam pembuka universal non-sektarian (`{{coupleSectionSub}}`) untuk fleksibilitas multikultural.
7. **Standar UI Bersih & Purifikasi Tipografi Tombol:** Dilarang keras menyisipkan emoji default sistem operasi maupun simbol panah AI (`↗`) ke dalam label tombol atau badge (seperti Google Maps, Live Streaming, Instagram Filter, atau Galeri Momen). Seluruh tombol aksi wajib menggunakan tipografi bersih, elegan, atau ikon vektor SVG murni.
8. **Standar Theme Freedom & Conditional Blocks (`{{#if}}`):** Tema master memiliki kebebasan penuh merancang struktur DOM, ornamen, dan seninya sendiri tanpa dipaksa memakai kartu seragam dari Engine. Template renderer (`lib/renderTemplate.ts`) mendukung blok `{{#if <key>}} ... {{/if}}` sehingga sakelar tampil/sembunyi klien di dashboard tetap 100% dinamis dan bersih dari elemen hantu saat dinonaktifkan.
9. **Standar Dynamic Palette Tokens & Pembersihan Dead Assets:** Seluruh template tema menyuntikkan `--bg-dark: {{colorBgDark}}` pada tag `<body>` agar kanvas adaptif 100% terhadap palet warna pilihan pengguna (Burgundy, Emerald, Midnight). Seluruh file CSS usang/mati (`app/landing.scoped.css`, `public/css/landing.css`), query relasi mati (`prisma.wish`), dan navigasi FOUC (`window.location.href`) telah dibersihkan secara bedah.
10. **Standar Ergonomi Mobile Halaman Publik:** Dilarang keras membiarkan tombol aksi utama terpotong multi-baris di viewport ponsel (`whitespace-nowrap` wajib pada tombol CTA). Filter kategori publik (`/demo`, `/portfolio`) menggunakan kontainer geser horizontal satu baris (*Horizontal Touch Rail*), bukan `flex-wrap` yang menghasilkan susunan tombol terlempar asimetris. Padding kartu mobile dinormalkan menjadi `p-4 sm:p-6` untuk menjaga keterbacaan pada layar 360px – 390px.

---

## Developer

- **Author**: [Arman Syam (AMS Dev)](https://github.com/armansyam)
- **Website**: [ammang.my.id](https://ammang.my.id)
- **License**: Proprietary & Non-Commercial — All Rights Reserved

---

> Untuk detail teknis lengkap, baca [`docs/SYSTEM_ARCHITECTURE.md`](./docs/SYSTEM_ARCHITECTURE.md)


### Kebijakan Akses Tema & Sesi Acara Utama (Update September 2026)
- **All-Access Themes**: Bebas pilih seluruh koleksi 19 tema desain untuk semua paket (`TIER_1`, `TIER_2`, `TIER_3`). Perbedaan paket murni pada hak kapabilitas fitur (Kamera Moments, QR Pass, Buku Tamu VIP, dsb).
- **Sesi Acara Utama (Primary Anchor)**: Tepat 1 sesi acara inti (Akad/Resepsi) sebagai basis hitungan kedaluwarsa layanan. Tanggal sesi utama terkunci permanen pasca publikasi (hanya admin yang dapat mengubah). Sesi lain bebas diatur kapan saja.
- **Deduplikasi Modul Moments & Dasbor Bersih**: Dasbor utama (`/dashboard`) terfokus sebagai pusat informasi & metrik eksekutif cepat tanpa instrumen operasional tumpang tindih. Portal Resepsionis Check-In tamu dipusatkan di dalam tab Buku Tamu (`/dashboard/guests`), sementara operasional disposable camera (Dual Mockup iPhone 16 Pro + Standing Banner Kartu QR, filter grading analog, multi-sesi, dan feed foto candid) terpusat penuh di Dedicated Command Center (`/dashboard/moments`), dan Studio Editor (`/dashboard/invitation/[id]` Seksi 14) khusus menangani styling web undangan.
- **Penguatan Konkurensi Hari-H & Anti-Kebocoran VPS (v5.7.5)**:
  * **In-Memory Mutex Key-Lock RSVP (`withRsvpLock`) & Transaksi Atomik**: Mengisolasi submit RSVP paralel tamu di koneksi lambat, mencegah record ganda, dan menghitung pax katering secara deterministik.
  * **Resepsionis Offline-First Idempoten**: Sinkronisasi antrean check-in offline panitia (`/api/receptionist/scan`) merespons `success: true` (`alreadyRedeemed: true`) saat data sudah terverifikasi di server, mencegah antrean macet (*deadlock*).
  * **Pembersihan Berkas VPS Otomatis**: Siklus cron cleanup saat status berubah ke `ARCHIVED` otomatis membuang HTML terbitan canonical (`deletePublishedHtml`) dan berkas draft lokal (`data/drafts/<id>.html`).
  * **Top-Up Kuota Momen Tamu Terpadu**: Integrasi checkout add-on `MEMORIES_TOPUP`, aktivasi otomatis melalui helper `applyMemoriesTopup`, dan akumulasi langsung ke `totalEventQuota` di upload endpoint.
  * **Purifikasi Skema & Master Seed Mandiri (Non-Destructive Invariant)**: Menghapus model mati `Wish`, menormalisasi enum & kolom sisa ke 0-drift, membukukan seluruh 84 parameter platform ke dalam `prisma/seed.ts`, serta mengunci operasi `upsert` pada `AdminSetting` agar hanya memperbarui label metadata dan tidak pernah menimpa nilai (`value`) produksi yang sudah diatur admin.
- **Penguatan Stabilitas DevOps & Server Infrastructure (v5.8.0)**:
  * **PostgreSQL Pool Boundaries (`lib/prisma.ts`)**: Konfigurasi batas koneksi pool eksplisit (`max: 10`, `idleTimeoutMillis: 30000`) mencegah kehabisan koneksi pada PM2 Cluster mode.
  * **Off-Site Disaster Recovery ke Cloudflare R2 (`lib/databaseBackup.ts`)**: Replikasi otomatis snapshot `.sql` terkompresi ke R2 bucket setiap kali backup dijalankan.
  * **Sinkronisasi Otomatis Crontab Linux & Logrotate (`deploy.sh`)**: Setup otomatis `pm2-logrotate` (maks 10MB x 7 rotasi) dan pendaftaran crontab pemeliharaan dengan `CRON_SECRET` aktif.
  * **Koreksi Retensi & Pengalihan Subdomain Kanonikal (`app/(public)/s/[subdomain]/route.ts` & `[slug]`):** Evaluasi tanggal acara multi-sesi terpadu via `getLatestEventDate`, sinkronisasi retensi admin, dan pengalihan kanonikal absolut ke `NEXT_PUBLIC_APP_URL` (`https://luxvite.id`) untuk mencegah kebocoran port lokal internal reverse proxy (`localhost:3001`).
- **Sinkronisasi Kalender & Hitung Mundur Sesi Acara Utama (v5.8.5)**:
  * **Tautan Kalender & Countdown Seragam**: Google Calendar (`googleCalendarUrl`) dan Countdown Timer (`targetDate`) lintas seluruh 19 tema master kini 100% tersinkronisasi mengacu ke Sesi Acara Utama (`isPrimary: true`).
  * **Dukungan Multi-Sesi Multi-Hari**: Deduplikasi cerdas menyatukan venue kartu jika tanggal & lokasi sama; menampilkan tanggal eksplisit sesi (`.ev-session-date`) pada acara beda hari atau beda gedung.
  * **Global Opening Cover Desktop (100vw)**: Layar pembuka desktop membentang penuh 100% viewport pada tema `ameera` dan `chronicle` sebelum undangan dibuka.
  * **Evolusi Desain Tema**: Bahasa desain Modern Arch pada tema `ameera` dan Cardless Pure Editorial Timeline pada tema `chronicle`.
- **Ekspansi Tema Tradisional Toraja & Smart Mobile Fullscreen (v5.9.0)**:
  * **Master Tema Toraja (`themes/traditional/toraja.html`)**: Tema tradisional ke-7 berbasis ornamen etnik Toraja asli (*Pa'barre Allo, Pa'kadang Pao, Rumah Tongkonan 3D, Mahkota Atap Tongkonan, 4 Sudut Passura' Couple, Spiral Tedong Home Frame, Watermark Sudut Acanthus Emas 12% pada kartu*), tipografi Cinzel & Great Vibes & Plus Jakarta Sans, narasi adat puitis (*Misa' kada dipotuo, pantan kada dipomate*), serta palet dinamis Merah Tua Toraja & Emas.
  * **Smart Mobile Fullscreen Standard**: Seluruh 19 tema master dan `starter-blueprint.html` dilengkapi `requestSmartFullscreen()` untuk memicu Fullscreen API atau auto-hide address bar browser mobile secara otomatis saat tamu mengklik tombol *"Buka Undangan"*.
- **Ekspansi Master Tema Bugis & Makassar (v5.9.1)**:
  * **Master Tema Bugis (`themes/traditional/bugis.html`)**: Tema tradisional ke-8 (tema master ke-18) mengangkat keagungan adat bangsawan Bugis Saoraja berbalut Royal Maroon & Gold, ornamen Rumah Adat Bugis (`rumah-adat-bugis.webp`), 4 sudut bunga emas, border horizontal emas Bugis, dan petuah luhur *"Sipakatau, sipakalebbi, sipakainge"*.
  * **Master Tema Makassar (`themes/traditional/makassar.html`)**: Tema tradisional ke-9 (tema master ke-19) mengangkat kebanggaan maritim dan kehormatan luhur Makassar berbalut Royal Navy & Gold, lambang kemegahan Kapal Phinisi (`kapal-phinisi.webp`), bingkai border Makassar, dan filosofi sakral *"Siri' na Pacce"* serta *"Bajiki passiriki, sombere' na malabbiri"*.
- **Ekspansi Master Tema Toraja Rantepao (v5.9.2)**:
  * **Master Tema Toraja Rantepao (`themes/traditional/rantepao.html`)**: Tema tradisional ke-10 (tema master ke-20) yang mengangkat kemegahan kultural adat Toraja Rantepao berbalut Crimson Marun & Kilau Emas Bambu, integrasi 9 slot media lengkap (`LANDING_COVER`, `LANDING_COVER_DESKTOP`, `HOME_PHOTO`, `DESKTOP_SIDEBAR`, `GLOBAL_FIXED_BG`, `GROOM_PHOTO`, `BRIDE_PHOTO`, `GALLERY`, `CLOSING_COVER`), ornamen ukiran Passura' & siluet Rumah Tongkonan, serta petuah sakral *"Misa' kada dipotuo, pantan kada dipomate"* dan *"Kurresumanga'"*.
- **Ekspansi Master Tema Toraja Makale (v5.9.3)**:
  * **Master Tema Toraja Makale (`themes/traditional/makale.html`)**: Tema tradisional ke-11 (tema master ke-21) yang mengangkat keagungan adat Tana Toraja Makale berbalut Royal Earth Crimson & Kilau Emas Tongkonan, integrasi 9 slot media lengkap (`LANDING_COVER`, `LANDING_COVER_DESKTOP`, `HOME_PHOTO`, `DESKTOP_SIDEBAR`, `GLOBAL_FIXED_BG`, `GROOM_PHOTO`, `BRIDE_PHOTO`, `GALLERY`, `CLOSING_COVER`), ornamen ukiran Passura' & siluet Buntu Burake, serta petuah leluhur *"Misa' kada dipotuo, pantan kada dipomate"* dan *"Kurresumanga'"*.
- **Ekspansi Master Tema Daerah Sulawesi Selatan (v5.9.4)**:
  * **Penyempurnaan Master Base Bugis & Makassar**: Menyelaraskan `bugis.html` dan `makassar.html` dengan Home Arch Photo Frame mempelai (`{{homePhotoUrl}}`), folder aset demo mandiri (`/demo/bugis/` dan `/demo/makassar/`), serta eliminasi `lux-at-home-zone`.
  * **7 Tema Baru Daerah Sulawesi Selatan (Tema Master ke-22 s.d. 28)**:
    - **Bugis Bone (`themes/traditional/bone.html`)**: Kebesaran Kerajaan Bone & Saoraja Lamurukung berbalut Royal Maroon & Gold.
    - **Bugis Wajo (`themes/traditional/wajo.html`)**: Keindahan sutera Sengkang & Saoraja Bettempola berbalut Sutera Maroon & Gold.
    - **Bugis Soppeng (`themes/traditional/soppeng.html`)**: Keanggunan Bumi Latemmamala & Villa Yuliana berbalut Royal Maroon & Gold.
    - **Makassar Gowa (`themes/traditional/gowa.html`)**: Keagungan Kesultanan Gowa & Istana Balla Lompoa berbalut Royal Navy & Gold.
    - **Makassar Maros (`themes/traditional/maros.html`)**: Pesona Butta Salewangang & bukit karst Rammang-Rammang berbalut Royal Navy & Gold.
    - **Makassar Takalar (`themes/traditional/takalar.html`)**: Kemegahan Butta Panrannuangku & Sanrobone berbalut Royal Navy & Gold.
    - **Makassar Bulukumba (`themes/traditional/bulukumba.html`)**: Keperkasaan Butta Panrita Lopi & Bahtera Phinisi Tanah Beru berbalut Royal Navy & Gold.
  * **Standarisasi Invarian 9 Slot Media & Aset Terisolasi**: Seluruh 7 tema baru dilengkapi 9 slot media lengkap, folder demo mandiri (`public/demo/{daerah}/`), folder ornamen terdedikasi (`public/assets/ornaments/{daerah}/`), dan kepatuhan penuh split desktop 460px.
- **Penyempurnaan Standar Global Closing Section, Kontras Timeline, & Ornamen Etnik Autentik (v5.9.5)**:
  * **Standarisasi Global Closing Section (`themes/BLUEPRINT_GUIDE.md` & Seluruh Tema Tradisional)**: Standarisasi penataan footer dinamis: saat media slot `CLOSING_COVER` di-upload (`.has-closing-photo`), layout bertransformasi ke `justify-content: space-between;` dengan ornamen kultural statis di atas (`.closing-top-ornament`) dan teks doa/mempelai (`.closing-content`) merapat elegan ke bawah; saat tidak ada foto (`.no-closing-photo`), seluruh elemen terpusat (`justify-content: center;`).
  * **Penyempurnaan Ornamen Bugis**: Mengganti ikon `rumah-adat-bugis.webp` dan artificial neon glow dengan ornamen etnik fotorealistik `pavillion-bamboo.webp` berbayang hitam tipis natural (`drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45))`).
  * **Perbaikan Kontras Rel Love Story Timeline (`public/css/modules.css`)**: Mengubah deklarasi `--timeline-gold` agar memprioritaskan `--accent` dan `--gold` sebelum `--primary`, sehingga pada tema-tema maroon gelap (Bugis/Makassar/Toraja) rel garis vertikal, node berkilau, dan label chapter (seperti *MAPPESE-PESE*) tampil menyala dalam emas terang kontras tinggi yang mudah dibaca.
  * **Autentisitas Kutipan Adat Luhur (`lib/demoRegistry.ts` & `lib/themeDefaults.ts`)**: Menghilangkan atribusi palsu `" & QS. AR-RUM: 21"` dari petuah leluhur nusantara (*Pappaseng To Riolo*, *Pasang Ri Bura'ne*, *Serat Wedhatama*) serta membungkus referensi kutipan dengan `{{#if openingQuoteRef}}` agar render bersih tanpa sisa delimiter kosong.
- **Standarisasi Cloudflare Edge Caching, Decoupled Dynamic Wishes & URL-Specific Purge (v5.9.6)**:
  * **Edge Caching Publikasi 7 Hari (`s-maxage=604800`)**: Rute publik `s/[subdomain]` dan `[slug]` menyematkan header `Cache-Control: public, max-age=60, s-maxage=604800, stale-while-revalidate=86400` untuk undangan `PUBLISHED`, mengeliminasi beban CPU VPS hingga 0% saat hari-H.
  * **Decoupled Dynamic Wishes Feed**: Pemuatan ucapan & konfirmasi doa dipisahkan dari HTML statis via pemanggilan asinkron `GET /api/public/rsvp?invitationId=...` di browser, menjamin data doa selalu mutakhir tanpa membatalkan cache HTML Cloudflare.
  * **Atomic Re-publish & URL-Specific Purge (`DEPLOY_AND_LOCK`)**: Aksi "Update Publikasi & Kunci Kembali" di studio secara atomik membakar ulang HTML, mengunci kembali studio, dan memicu purge terisolasi khusus URL undangan terkait (`subdomain`, `slug`, `customDomain`) tanpa mengganggu cache undangan klien lain.
  * **Tombol Mandiri "Bakar Ulang & Purge" di Dasbor Admin**: Endpoint `POST /api/admin/invitations/[id]/purge` dan tombol aksi instan di tabel undangan Dasbor Admin untuk fleksibilitas maintenance administrator.
