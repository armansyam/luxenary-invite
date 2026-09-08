# Luxenary Invite — S-Invite Platform

> **Platform Undangan Pernikahan Digital B2C Self-Service**  
> Next.js 16.3.2 · Prisma 7.9 (PostgreSQL) · NextAuth v5 · Multi-Gateway (5 Gateway) · Nodemailer SMTP · Cloudflare R2  
> **Versi Dokumen: 5.7.2 | Diperbarui: 09 September 2026**

> [!IMPORTANT]
> **PROTOKOL SINKRONISASI DOKUMENTASI OTOMATIS (MANDATORY POST-EDIT & PRE-PUSH PROTOCOL):**  
> Setiap kali selesai melakukan pengeditan kode (fitur baru, bugfix, refactor, perubahan skema database, atau penambahan endpoint) dan **sebelum/saat melakukan push ke Git remote (GitHub)**:
> 1. **Periksa Seluruh Kode Faktual:** Jangan membuat asumsi. Baca kode implementasi riil untuk memverifikasi perubahan.
> 2. **Perbarui Semua File Dokumentasi Master:**
>    - [`README.md`](./README.md) — Selaraskan alur, versi, tabel tema, dan instruksi deployment.
>    - [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md) — Perbarui diagram arsitektur, peta routing, skema database Prisma, dan lifecycle.
>    - [`S-Invitation.md`](./S-Invitation.md) — Perbarui spesifikasi fungsional dan kapabilitas modul.
> 3. **Verifikasi Empiris:** Wajib jalankan `npx tsc --noEmit` (Exit Code 0) sebelum menyatakan pekerjaan selesai.
> 4. **Commit & Push Bersamaan:** Seluruh dokumen yang diperbarui **WAJIB di-commit dan di-push bersamaan** dengan kode agar GitHub selalu sinkron dengan kondisi codebase lokal!

---

## Tentang Platform

Luxenary Invite adalah platform SaaS undangan pernikahan digital berbasis model **B2C (Business-to-Consumer)** di mana calon pengantin mendaftar mandiri, memilih paket, membayar, lalu mengakses studio editor untuk membangun undangan digital mereka. Setelah publish, undangan tampil sebagai **file HTML statis mandiri** yang disajikan langsung dari disk — tanpa SSR, tanpa DB query per request. Seluruh estetika platform dan tema dikunci ketat ke **Light Luxury Palette** (`color-scheme: only light !important`) dengan proteksi W3C `only` untuk mencegah browser ponsel (Safari, Chrome, Brave) melakukan auto-inversi mode gelap yang merusak kontras visual. Seluruh antarmuka (Admin, Klien, Scanner, dan Tema Publik) menerapkan **Clean SaaS UI Standard** dengan eliminasi total dialog native browser (`window.alert` / `window.confirm`), digantikan oleh modal dialog terintegrasi berlatar *backdrop blur*, floating toast alerts, dan respons status inline.

---

## Alur Kerja B2C (Lengkap)

```
[Calon Klien]
     │
     ▼
1. LANDING PAGE (/) & SHOWROOM KATALOG (/demo)
   - Katalog paket + demo tema interaktif (15 tema fisik master)
   - Tab "Sistem & Fitur Acara" (Demo Interaktif Hari-H):
      - `/demo/receptionist` (Sistem Meja Resepsionis, Generator Tiket QR & Pemindai Live)
      - `/demo/sharemoment` (Buku Tamu Foto Digital & Simulasi Upload Kamera)
      - `/demo/memories` (Galeri Kenangan Tamu Live Feed Fluid Masonry `max-w-[1920px]`, Clean Touch-Swipe & Keyboard Lightbox Navigation, dan Unduh ZIP)
   - Halaman Pendukung Dinamis:
     - `/terms` (Syarat & Ketentuan Layanan)
     - `/privacy` (Kebijakan Privasi Data)
     - `/refund` (Kebijakan Pengembalian Dana)
     - `/contact` (Pusat Bantuan & Kontak WhatsApp/Email Resmi)
   *(Seluruh informasi nama platform, kontak, meta title & tab browser terhubung dinamis ke DB Admin Settings)*
     │
     ▼
2. LOGIN + PILIH PAKET (/login → /packages)
   Google OAuth → Pilih paket (Traditional / Modern / Premium).
   *Onboarding Guard:* Jika klien memiliki tagihan aktif berstatus PENDING, akses ke /packages otomatis dicegat dan dilempar kembali ke kasir aktif (/checkout?order=...).
     │
     ▼
3. CHECKOUT (/checkout)
   Pola Single State (1 Klien = 1 Transaksi)
   - *URL State & QRIS Hydration:* URL mengikat `?order=ID`. Refresh halaman (F5) tetap menampilkan summary dan countdown QRIS tanpa reset ke tombol awal.
   - *Penyimpanan Nyata Database:* Seluruh transaksi tersimpan permanen di PostgreSQL (`orders` table), menjamin verifikasi status dan summary 100% konsisten.
   - *Realtime SSE Stream & Zero Polling:* Menggunakan Server-Sent Events murni (`/api/payments/status-stream/[orderId]`) dengan jembatan cross-process PostgreSQL `LISTEN/NOTIFY` untuk PM2 Cluster Mode. Event pembayaran instan (<5ms) tersiar ke seluruh instance PM2 tanpa polling browser. Transisi Dark Luxury mulus (1.8s) mencegah visual leak ke dasbor sebelum status benar-benar PAID.
   ┌─────────────────────────────────────┬──────────────────────────┐
   │  Gateway 2-Arah (Midtrans & Xendit) │  Transfer Bank Manual    │
   │  Core API QRIS / Snap / Invoice     │  (Bebas Hardcode)        │
   │  Two-Way Cancel & Zero Ghost Payment│  Upload WebP ke R2 via   │
   │  → Webhook Auto-PAID + Invoice Email│  Custom Domain Edge CDN  │
   │  → Realtime SSE Push to Client      │  → Admin Approve/Reject  │
   │                                     │  → Instant SSE Broadcast │
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
   - Pilih & ganti tema (15 tema fisik aktif)
   - Isi data pengantin & keluarga (4 kolom terpisah: Ayah & Ibu dengan deteksi otomatis awalan "Putra dari" / "Putri dari" tanpa dropdown anak ke-n), jadwal acara multi-event
   - Pengaturan Musik Latar Pernikahan (Audio background, preset sakral, unggah MP3/M4A, sinkronisasi otomatis tombol Buka Undangan & fallback interaksi)
   - Upload foto (cover, groom, bride, gallery, dll)
   - Kustomisasi seksi (Love Story, Gift, QR Check-in, Teks Galeri Kenangan Tamu)
   - Kelola tamu + generate WhatsApp link personal (Deteksi cerdas Custom Domain / Subdomain & proteksi draft)
   - RSVP & ucapan real-time
   - **Studio Editor & Dual View (Form Data vs Live Visual):** 15 seksi terstruktur dengan sistem **Ultra-Slim Exclusive Accordion** (membuka 1 seksi otomatis menutup seksi lainnya, mengeliminasi scroll fatigue, ketinggian tertutup terpangkas dari 4.101px ke ~750px pas dalam 1 layar desktop dengan cuplikan ringkas inline), dirty tracking per-seksi, isolasi warna swatch busana, dan Live Visual Editor Canvas.
   - **Live View Real-Time Palette Synchronizer & Clean Preview:** Panel palet 6 warna utama terpasang langsung di atas kanvas Live View dengan *two-way sync* instan ke Seksi 1 formulir data. Tombol *"Buka di Tab Baru"* dan tombol navigasi layar proteksi terhubung ke `mode=preview` murni untuk evaluasi visual bersih tanpa gangguan widget editor.
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
   - Tamu bagikan foto → /sharemoment (upload ke R2/Local, khusus Premium)
   - Monitoring & moderasi kiriman foto tamu langsung di Dashboard Utama (/dashboard, khusus Premium)
   - Klien beli Add-on Jasa Custom Domain via Settings atau bundling saat Upgrade Paket → /api/client/custom-domain/buy (Eksklusif Premium, otomatis include masa aktif URL Asli & Galeri 1 tahun)
   - Pasca Acara (H+7 / `retention_invitation_grace_days` dari tanggal acara terakhir `getLatestEventDate`): Undangan fisik ditutup. Pada paket Premium diarahkan ke Galeri Momen (/memories) dengan retensi default 30 hari. Pada paket Traditional & Modern, sistem menampilkan Graceful Event Closed Page resmi tanpa diarahkan ke galeri kosong.
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
   - Tema & Musik (Themes & Music): Manajemen katalog tema, Demo Studio (kustomisasi 6 seksi narasi & label tema, dynamic timeline acara, dynamic bab cerita, dynamic rekening bank, harmonisasi casing font skrip vs uppercase, dan pewarisan otomatis ke undangan klien), serta Pustaka Musik Sistem dinamis (auto-sync file fisik audio di disk `public/music/` ke database, tambah audio dengan auto-kompresi FFmpeg MP3 128kbps, preview, edit, dan toggle aktif/nonaktif untuk klien)
   - Portofolio (Portfolio): Kurasi & kloning undangan pilihan → /portfolio
   - Pengaturan (Settings): 
     - **Tab Setup & Integrasi:** Konfigurasi DNS & IP Server (auto-detect IP publik VPS, CNAME target dinamis), SMTP Email Server, Batas Upload Galeri Tamu (MB), dan Siklus Hidup Subdomain & Retensi.
     - **Tab Platform:** Branding & Identitas Platform, CS Support, Hero Tagline, Fitur Landing Page, Template WhatsApp.
     - **Tab Paket & Harga:** Konfigurasi harga paket undangan (Traditional, Modern, Premium) serta 2 Layanan Tambahan (Add-Ons) resmi: Jasa Custom Domain (1 Thn — dilengkapi toggle aktif/nonaktif & mode Coming Soon untuk klien) dan Perpanjang Masa Aktif URL Asli / Galeri (Bulanan).
     - **Tab Gateway QRIS:** Pusat kontrol global dan sub-tabs terisolasi per vendor gateway 2-arah (Midtrans dan Xendit) dengan kredensial terpadu dan resolusi endpoint otomatis.
   - Database (Database): Snapshot backup & restore PostgreSQL
   - Monitoring (Monitoring & Status Server): Pemantauan kestabilan sistem 60-hari interaktif (Interactive Uptime Status Bar), pemantauan memori fisik Host RAM VPS (`os.totalmem()`), Host OS Uptime, beban partisi root Linux (/), latensi & metrik ukuran terpakai Cloudflare R2 Media Storage (kapasitas terpakai, sisa kuota bebas biaya 10 GB), serta audit aktivitas staf & webhook gateway.
   - Tim & Akses (Team): Manajemen akun staf admin dengan isolasi 4-tier Role Access Matrix (`SUPER_ADMIN`, `ADMIN`, `FINANCE`, `SUPPORT`) dilengkapi pratinjau hak akses menu dinamis (*Reactive Allowed vs Restricted Tab Badges*).
   - **Finance & Keuangan (Posisi Paling Bawah):** Pusat pembukuan keuangan terpadu dengan Continuous Editorial Canvas (bebas tumpukan card AI klise), visualisasi grafik interaktif multi-model 60 FPS SVG (Dual Bar, Kurva Kontinu, dan Net Flow Baseline Rp 0), buku kas keluar (OPEX) terstruktur dengan tagging sumber bayar & bukti struk, pelacak tagihan rutin 1-klik (VPS, internet, listrik), prosedur audit-safe Tutup Buku bulanan/tahunan (penguncian mutasi kas permanen), dan lembar kerja Rekapitulasi Pajak PPh Final 0,5% (PP 55/2022) siap lapor SPT di DJP Online.
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

Format Custom Domain (SaaS Add-on 1 Tahun):
  https://dimas-clarissa.com (Auto-SSL Caddy & internal rewrite ke endpoint URL Asli)

Sub-routes publik:
  /dimas-clarissa-030326/memories     → Galeri foto tamu (real-time SSE)
  /dimas-clarissa-030326/sharemoment  → Upload foto tamu
  /s/[subdomain]/receptionist         → Scanner QR tamu (PIN-protected)

Pre-Flight Checklist & Smart Audit (/dashboard/settings):
  - Evaluasi sekuensial 12 komponen data sebelum rilis resmi (termasuk verifikasi seluruh slot unggahan visual & foto kedua mempelai).
  - Zero Data Bolong: Seksi bersakelar aktif wajib memiliki data lengkap; seksi yang dinonaktifkan berstatus "Nonaktif (Dilewati)" dan otomatis lolos.
  - Verifikasi Slot Upload: Menjamin tidak ada foto model atau latar demo bawaan tema yang tertinggal karena kelupaan unggah.
  - Runtime Auto-Pruning: Seksi yang dimatikan otomatis dihilangkan dari DOM dan navigasi dock bawah / tombol floating audio disembunyikan tanpa meninggalkan tombol statis kosong.
  - Gatekeeper 6 URL: Tombol "Rilis Undangan Resmi" terkunci hingga ke-6 instrumen URL (Pintu Utama, Subdomain, Tamu, Resepsionis, Galeri Kenangan /memories, dan Form Kamera /sharemoment) terkonfirmasi dengan dukungan DRAFT preview (?preview=true).
```

---

## Paket & Tema (15 Tema Fisik + 1 Blueprint)

| Paket | Tema Tersedia |
|:--|:--|
| **Traditional** | Prameswari, Badrika, Candani, Dillalucky, Mayang |
| **Modern** | Wave, Papercut, Ameera, Chronicle, Lumina, Solaria |
| **Premium** | Kalandra, Valente, Aurelia, Artisan *(Legacy Alias: Kila)* |

> Harga dapat diubah di Admin → tab Pengaturan tanpa deploy ulang.

### Standar Arsitektur Template Undangan
- **Cover Gate:** Tombol buka undangan (`data-lux-field="customLabels.openBtn"`) wajib memiliki teks fisik default `"Buka Undangan"` dan didukung fallback engine agar tidak pernah kosong/transparan.
- **Dukungan Video Loop Sinematik (Seamless Crossfade):** Mendukung video background loop pada `LANDING_COVER` (Cover pembuka), `DESKTOP_SIDEBAR` (Hero layar lebar), dan `GLOBAL_FIXED_BG` (Latar kartu). Sistem otomatis memotong klip maksimal 20 detik, menerapkan filter *seamless crossfade loop* (0.6s–1.2s) agar sambungan loop tak kasat mata tanpa jump cut, membuang audio track (`-an`) untuk kepatuhan autoplay instan di mobile, mengunci frame rate ke 30 fps, serta menyuntikkan tag HTML `<video class="..." autoplay loop muted playsinline webkit-playsinline>` dengan overlay gradasi kontras.
- **Latar Belakang Seksi Home Mandiri (`HOME_PHOTO`):** Slot foto halaman utama terinjeksi mandiri ke Seksi 1 (`.slide-opening#home`) dengan scrim gradient pelindung teks. Jika kosong, seksi Home tetap transparan memperlihatkan kanvas atau video loop global.
- **Arsitektur Desktop Split 460px (Golden Ratio Standard):** Pada layar desktop/layar lebar (≥ 1024px atau ≥ 900px), seluruh 15 tema fisik master menerapkan pembagian rasio presisi: sidebar kiri dinamis mengisi ruang panggung sisa (`width: calc(100% - 460px)`), sedangkan panel undangan utama dikunci tepat pada lebar mobile flagship ideal **460px** (`width: 460px; margin-left: calc(100% - 460px)`). Lapisan latar belakang (`.fixed-bg-layer`) dan video background berposisi fokus pada kolom undangan 460px di desktop (tidak tumpah 100vw ke belakang sidebar), dan otomatis 100% fullscreen di perangkat mobile. Navigasi floating dock bawah secara matematis dipusatkan di `left: calc(100% - 230px)`.
- **Tipografi Anti-Overflow Split Desktop (Mobile-Emulation Scale):** Karena unit CSS `vw` mengevaluasi layar monitor utuh (1440–1920px), seluruh judul seksi `.sec-main-title, .sec-heading` pada mode split kanan dibatasi ketat dengan `clamp(1.75rem, 2.1rem, 2.3rem) !important;` serta proteksi `overflow-wrap: break-word !important; word-break: break-word !important;`. Padding seksi desktop dinormalisasi ke `1.8rem` (memberikan lebar efektif konten ~404px). Standar arsitektur ini terpasang secara permanen di seluruh 15 tema master serta template developer `starter-blueprint.html` (tersedia untuk diunduh di `/downloads/starter-blueprint.html`).
- **Adaptive Full-Height Closing Section (`100vh`) & Flush Alignment:** Seksi outro (`.site-footer` / `.closing-sec`) berukuran layar penuh `100vh` dengan penataan *flush* ke dasar layar (bebas celah/gap 90px–110px) dan adaptif terhadap unggahan foto penutup (`CLOSING_COVER`):
  - *Mode Kanvas Kosong (Default):* Latar bersih sesuai palet tema tanpa dummy image palsu; teks ucapan terima kasih dan nama mempelai berposisi vertikal & horizontal tepat di tengah layar (`justify-content: center;`).
  - *Mode Foto Penutup:* Foto latar layar penuh dengan overlay gradasi; teks ucapan bergeser elegan ke bagian bawah layar (`justify-content: flex-end;`).
- **Palet Warna Showroom Demo Dinamis:** Admin Demo Studio menyediakan selektor 6 palet warna resmi (`champagne`, `emerald`, `burgundy`, `sage`, `terracotta`, `monochrome`) yang dikompilasi secara on-the-fly ke `/demo/[theme]`, memungkinkan tema tradisional seperti Badrika tampil dalam palet khas Bugis Royal Emerald tanpa hardcoding di CSS.
- **Showroom Katalog Demo Ringan (`/demo`) & Snapshot Thumbnail (60 FPS Cross-Fade):** Kartu katalog `/demo` menggunakan snapshot visual presisi (Mobile/Tablet `768 × 1024 px` rasio 3:4 dan Desktop `1280 × 720 px` rasio 16:9) yang mengeliminasi seluruh 10 tag `<iframe>` berat. Dilengkapi transisi *dual-layer opacity cross-fade* 60 FPS bebas lag reflow saat berganti mode mobile/desktop, auto-fallback cerdas di server tanpa error 404 ganda, frame elegan `bg-stone-100` tanpa blank hitam, dan form upload mandiri di Demo Studio lengkap dengan panduan pixel.
- **Dynamic Asset Route Handler & Universal Cache-Busting (`/demo/[theme]/[file]`):** Mengatasi limitasi Next.js Standalone yang hanya melayani aset statis `public/` saat build-time. Route handler menyajikan file thumbnail, gambar, dan audio baru secara instan dengan proteksi path traversal dan Smart ETag Cache (`304 Not Modified`). Mesin kompilasi demo HTML secara otomatis menyematkan timestamp versi `?v=${updatedAt}` pada seluruh slot aset (cover, hero, bg, mempelai, galeri, musik) sehingga pembaruan media langsung menembus cache Cloudflare Edge CDN seketika.
- **Proteksi Anti-Download, Fluid Layout & Clean Lightbox Navigation Galeri Kenangan (`/memories`):** Halaman kenangan tamu dirancang *View-Only* dengan proteksi browser bawaan (blokir klik kanan `contextmenu`, pencegahan menu pop-up tahan layar `touch-callout: none`, serta blokir drag-and-drop). Tampilan menggunakan format fluid edge-to-edge `max-w-[1920px]` (2-7 kolom) yang optimal di proyektor venue dan desktop, dilengkapi modal preview bersih tanpa ikon panah mengambang yang mendukung tombol keyboard panah (desktop) dan touch swipe (mobile), serta real-time SSE stream terintegrasi.
- **Pemisahan Terstruktur 4 Kolom Orang Tua (Discrete Parents Architecture) & Murni String Bebas:** Formulir profil klien dan demo studio memisahkan input nama Ayah dan Ibu secara diskret (`groomFather`, `groomMother`, `brideFather`, `brideMother`). Theme Engine secara otomatis mendeteksi awalan `{{firstParentPrefix}}` / `{{secondParentPrefix}}` ("Putra dari" untuk Groom, "Putri dari" untuk Bride) serta menyuplai token discrete `{{firstFather}}` dan `{{firstMother}}` secara bersih murni sebagai *raw string* tanpa paksaan sapaan Bpk/Ibu, sehingga klien bebas mencantumkan gelar akademik/adat, sapaan penghormatan, atau status almarhum/almarhumah (`Alm.`, `Almh.`), sekaligus mengeliminasi duplikasi label, membuang simbol `&` yang tidak diinginkan pada tata letak vertikal, dan mencegah kata menggantung (*orphan words*) pada tipografi kartu profil di seluruh 15 tema fisik master.

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

## 3 Kondisi Pembayaran & Transmisi Data Lengkap Gateway (Rich Payload)

Sistem mendukung 3 kondisi transaksi dengan integrasi 2-arah eksklusif (Midtrans & Xendit) yang dilengkapi pembatalan seketika (*two-way cancel/expire*) dan payload lengkap:
1. **Registrasi Paket Awal (`NEW`):** Aktivasi paket baru (Traditional / Modern / Premium). Setelah lunas, klien langsung diarahkan ke `/dashboard/setup`.
2. **Upgrade Layanan (`UPGRADE`):** Klien menaikkan tier paket (misal Traditional ke Modern / Premium) dengan selisih harga dinamis yang bersumber dari konfigurasi database (`AdminSetting`), disajikan via modal Obsidian Gold Luxury. Tier induk diperbarui seketika.
3. **Add-on Layanan Tambahan:**
   - **Perpanjang Galeri Tamu (`GALLERY_EXTENSION`):** Menambah masa simpan foto momen tamu selama +30 hari dan membuka kunci form upload.
   - **Jasa Integrasi Custom Domain (`CUSTOM_DOMAIN_ADDON`):** Integrasi domain kustom klien (lengkap dengan sertifikat SSL/TLS & Cloudflare DNS) selama +365 hari / 1 tahun.

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
| `Order` | Invoice pembelian paket & add-on (`NEW`, `UPGRADE`, `GALLERY_EXTENSION`, `CUSTOM_DOMAIN_ADDON`) |
| `Invitation` | Inti undangan (`DRAFT`, `PUBLISHED`, `EVENT_FINISHED`, `TAKEN_DOWN`, `ARCHIVED`) |
| `InvitationMedia` | Media per slot (8 slot: LANDING_COVER, HOME_PHOTO, GROOM_PHOTO, dll) |
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
│   ├── domainUtils.ts         # URL builder (subdomain, canonical)
│   ├── gatewayRegistry.ts     # Registry payment gateway 2-arah (Midtrans & Xendit)
│   ├── gateways/              # Implementasi gateway 2-arah: Midtrans, Xendit
│   ├── upgradeHelper.ts       # Upgrade paket & perpanjangan galeri (+30 hari)
│   ├── rateLimit.ts           # Rate limiter API publik
│   ├── sseEmitter.ts          # SSE emitter (momen real-time)
│   └── videoOptimizer.ts      # Kompres video sebelum upload
├── themes/
│   ├── premium/               # 4 tema: kalandra, valente, aurelia, artisan
│   ├── modern/                # 6 tema: wave, papercut, ameera, chronicle, lumina, solaria
│   ├── traditional/           # 5 tema: prameswari, badrika, candani, dillalucky, mayang
│   └── starter-blueprint.html # Standar acuan struktur template tema
├── components/
│   ├── BrandLogo.tsx
│   ├── client/
│   │   └── MemoriesDownloadSection.tsx # Download ZIP & perpanjangan galeri
│   └── admin/
│       ├── AdminPortfolioTab.tsx
│       ├── AdminProfileSettings.tsx
│       ├── AdminTeamManagement.tsx
│       ├── AdminOrdersTab.tsx        # Transaksi terpaginasi & ekspor CSV
│       ├── AdminClientsTab.tsx       # Klien, WhatsApp link & impersonate
│       ├── AdminInvitationsTab.tsx   # Siklus hidup projek & emergency unlock
│       ├── AdminCustomDomainsTab.tsx # Live DNS check & aktivasi 1-klik
│       ├── AdminMonitoringTab.tsx    # Detak kesehatan server, kuota & ukuran riil R2 (MB/GB), disk VPS, audit staf & webhook
│       └── AdminFinanceTab.tsx       # Finance center, multi-chart visualisasi & pembukuan kas
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
│       └── 06_LIVE_MOMENT_DAN_CLOUD_MEMORIES.md # Upload foto candid tamu, live slideshow proyektor venue
├── middleware.ts               # ⭐ Edge routing utama (CRITICAL)
├── SYSTEM_ARCHITECTURE.md      # ⭐ Dokumentasi arsitektur lengkap (WAJIB BACA)
├── AGENTS.md                   # Aturan perilaku AI Agent
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

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ROOT_DOMAIN="localhost:3000"
```

> **Catatan Pengaturan Dinamis & Integrasi Gateway Terpadu:**  
> Kredensial Payment Gateway 2-Arah (Midtrans & Xendit) dikelola langsung melalui tab Gateway QRIS di Portal Admin. Midtrans secara otomatis mengarahkan panggilan ke endpoint Sandbox jika Server Key diawali `SB-`, atau ke Live Produksi jika diawali format standar `Mid-`. Konfigurasi SMTP Email, tarif fee, durasi QRIS, dan harga paket dikelola **secara langsung dari Admin Portal (Tab Pengaturan)** tanpa perlu restart server atau edit `.env`.

### 3. Setup Database
```bash
npx prisma db push
npx prisma db seed
```

### 4. Jalankan Dev Server
```bash
npm run dev
```

### 5. Sinkronisasi Tema
```
Admin Portal → Tab Tema → Klik "Sinkronisasi Tema"
```

---

## Build Produksi

```bash
npm run build
npm run start
# atau via PM2:
pm2 start ecosystem.config.js
```

---

## Keamanan

- **Webhook Payment 2-Arah (Midtrans & Xendit)**: Diverifikasi signature SHA512 (Midtrans) & x-callback-token timing-safe (Xendit) dengan garansi pembatalan instan untuk mencegah ghost payment
- **Auth Guard**: Middleware memisahkan Admin, Client, dan Publik
- **Routing Loop Protection**: Middleware mengisolasi seluruh rute statis sistem (`PLATFORM_EXCLUSIONS` seperti `/contact`, `/privacy`, `/terms`, `/refund`, dll.) dari Flat Slug interceptor untuk mencegah *infinite rewrite loop*.
- **Reserved Subdomains Protection**: Subdomain `cdn` (Cloudflare R2), `admin`, `api`, `auth`, `static`, `assets`, dll. diproteksi terpusat via `lib/domainUtils.ts` dan dilarang diklaim oleh klien baik saat pemeriksaan ketersediaan maupun saat pembuatan/pembaruan undangan.
- **Upload**: Validasi kepemilikan via `userId` session
- **RSVP/Memories**: Rate-limited untuk cegah spam
- **Receptionist**: Scanner QR dilindungi PIN panitia (AES-256-GCM), token sesi HMAC di localStorage, header profesional dengan BrandLogo dan judul terpusat, aksi navbar minimalis icon-only dengan indikator hijau online, arsitektur *Single-Screen Zero-Scroll Kiosk* (`h-screen overflow-hidden`) bebas scroll vertikal di seluruh jenis monitor/tablet, kolom kiri-kanan simetris dinamis (`h-full min-h-0`), tombol manual *"Kembali ke Siaga Scan"*, tombol Standby Screensaver di navbar, *Ambient Standby Screensaver* otomatis saat idle (Watermark inisial monogram mempelai di live dan Watermark BrandLogo platform di demo) dengan mode *True Standby* (hardware kamera mati total demi hemat daya, anti-overheating, dan perlindungan privasi; langsung aktif kembali saat layar disentuh atau barcode ditembak), auto-dismiss kartu check-in 15 detik, jeda kamera otomatis saat notifikasi aktif (anti-loop scan), judul pemindai "SCAN" & "KAMERA LIVE", daftar tamu ringkas tanpa badge count, mode Layar Penuh (Fullscreen Kiosk), isolasi warna tema (anti distorsi Dark/Light OS), serta dukungan kamera multi-device (Laptop webcam & Tablet dual-camera) dengan audio beep dan visual laser.
- **Portfolio**: Hanya SUPER_ADMIN yang bisa kloning undangan

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
[2. Periksa & Perbarui 3 Docs] ──► SYSTEM_ARCHITECTURE.md + README.md + S-Invitation.md
         │
         ▼
[3. Verifikasi Empiris]        ──► Jalankan `npx tsc --noEmit` (Exit Code 0)
         │
         ▼
[4. Git Stage & Push]          ──► Commit & push kode bersamaan dengan docs ke `main`
```

### Aturan Baku Dokumentasi:
1. **Dilarang keras push tanpa menyelaraskan docs:** Jika ada penambahan endpoint, migrasi kolom database, gateway baru, atau perubahan alur UI, ketiga file dokumen (`README.md`, `SYSTEM_ARCHITECTURE.md`, `S-Invitation.md`) wajib langsung disinkronkan di commit yang sama.
2. **Katalog Tema Fisik:** Pastikan jumlah tema fisik yang aktif di database dan template selalu sinkron (15 tema fisik aktif).
3. **No Phantom Docs:** Dokumentasi harus mencantumkan path dan nama variabel lingkungan aktual (misal format AWS SDK `S3_*` untuk R2, bukan format lama).
4. **Standar Kontrak Placeholder Nama Mempelai:** Cover buka undangan, hero title, sidebar desktop, dan closing footer **MUTLAK** menggunakan Nama Panggilan (`{{firstName}} & {{secondName}}`). Nama lengkap beserta gelar (`{{firstDisplayName}} & {{secondDisplayName}}`) hanya digunakan pada Seksi Profil Pasangan (*The Couple*).
5. **Standar Navigasi Imersif (Smart Auto-Hide):** Seluruh 15 tema fisik master dan starter blueprint menerapkan interaksi smart auto-hide untuk dock navigasi dan floating audio player saat pengguna menggulir ke bawah, dan otomatis kembali meluncur masuk saat menggulir ke atas atau mencapai footer.
6. **Standar Watermark Monogram & Wording Universal:** Tema desktop sidebar mendukung watermark monogram inisial (`{{coupleMonogram}}`, `{{firstInitial}}`, `{{secondInitial}}`) dan salam pembuka universal non-sektarian (`{{coupleSectionSub}}`) untuk fleksibilitas multikultural.
7. **Standar UI Bersih & Purifikasi Tipografi Tombol:** Dilarang keras menyisipkan emoji default sistem operasi maupun simbol panah AI (`↗`) ke dalam label tombol atau badge (seperti Google Maps, Live Streaming, Instagram Filter, atau Galeri Momen). Seluruh tombol aksi wajib menggunakan tipografi bersih, elegan, atau ikon vektor SVG murni.
8. **Standar Theme Freedom & Conditional Blocks (`{{#if}}`):** Tema master memiliki kebebasan penuh merancang struktur DOM, ornamen, dan seninya sendiri tanpa dipaksa memakai kartu seragam dari Engine. Template renderer (`lib/renderTemplate.ts`) mendukung blok `{{#if <key>}} ... {{/if}}` sehingga sakelar tampil/sembunyi klien di dashboard tetap 100% dinamis dan bersih dari elemen hantu saat dinonaktifkan.

---

## Developer

- **Author**: [Arman Syam (AMS Dev)](https://github.com/armansyam)
- **Website**: [ammang.my.id](https://ammang.my.id)
- **License**: Proprietary & Non-Commercial — All Rights Reserved

---

> Untuk detail teknis lengkap, baca [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md)
