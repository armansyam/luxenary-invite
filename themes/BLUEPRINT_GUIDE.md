# 🏛️ Panduan Master Desain Tema: Luxenary Theme Blueprint Guide

Dokumen ini adalah **standar teknis resmi (Golden Standard)** bagi para desainer, pengembang, dan AI Agent dalam merancang serta memodifikasi tema undangan digital di platform Luxenary.

Template cetak biru utama berada di: [`themes/starter-blueprint.html`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/themes/starter-blueprint.html).

---

## 🎯 1. Prinsip Utama Desain Tema (Core Tenets)

### A. Larangan Keras Teks Statis (Zero Hardcode Text Policy)
- **TIDAK BOLEH** mengetik teks bernuansa kultural atau keagamaan tertentu secara statis di template HTML (seperti `﷽`, `WALIMATUL 'URS`, atau `Maha Suci Allah...`).
- Semua teks wajib menggunakan **Token Dinamis** (`{{tokenName}}`) dan **Atribut Binding Dua Arah** (`data-lux-field="..."`).
- **Tujuannya:** Agar setiap tema dapat digunakan lintas agama, suku, dan budaya secara instan melalui Form Editor dan Live Editor.

### B. Larangan Warna Hardcode (Dynamic Palette Token Policy)
- Semua warna background, teks, border, dan gradient wajib memanfaatkan CSS Custom Properties yang telah disediakan engine:
  - `var(--primary)`: Warna aksen utama tema
  - `var(--secondary)`: Warna aksen sekunder
  - `var(--accent)`: Warna sorotan/ornamen
  - `var(--bg-light)`: Warna dasar kanvas terang
  - `var(--bg-dark)`: Warna dasar kanvas gelap
  - `color-mix(in srgb, var(--bg-dark) 75%, transparent)`: Untuk overlay dinamis
- Hindari kode `#hex` mati di dalam inline style atau aturan class CSS.

### C. Arsitektur Desktop Split & Emulasi Mobile (Golden Layout Standard)
Setiap tema wajib menerapkan tata letak responsif 2-pilar:
1. **Layar Lebar Desktop ($\ge 900\text{px}$):**
   - Panel Kiri: Hero/Sidebar fixed berukuran `calc(100% - 460px)` dengan foto latar `{{sidebarPhotoUrl}}`.
   - Panel Kanan: Konten undangan utama berlebar tetap `460px` dengan scroll independen.
2. **Layar Ponsel Mobile ($< 900\text{px}$):**
   - 100% Full Width Mobile-First dengan scroll lancar.

---

## 🔑 2. Kamus Lengkap Token Dinamis (Universal Token Dictionary)

Semua token diapit kurung kurawal ganda `{{...}}`. Saat dirender oleh engine, token ini akan digantikan dengan data faktual undangan client.

### A. Cover & Amplop Pembuka (Entry Gateway)

| Token | Kegunaan | Atribut Binding Live Editor |
| :--- | :--- | :--- |
| `{{coverBadge}}` | Label pembuka / badge sampul (cth: *THE WEDDING OF*, *WALIMATUL 'URS*) | `data-lux-field="customLabels.coverBadge"` |
| `{{coupleMonogram}}` | Inisial gabungan mempelai (cth: *A & S*) | — |
| `{{weddingTagline}}` | Tagline pernikahan dari setting acara | `data-lux-field="weddingTagline"` |
| `{{firstName}}` | Nama panggilan mempelai pria | `data-lux-field="groomNickname"` |
| `{{secondName}}` | Nama panggilan mempelai wanita | `data-lux-field="brideNickname"` |
| `{{weddingDate}}` | Tanggal pernikahan terformat (cth: *Sabtu, 24 Oktober 2026*) | — |
| `{{weddingDateDay}}` | Hari tanggal (cth: *24*) | — |
| `{{weddingDateMonth}}` | Bulan angka (cth: *10*) | — |
| `{{weddingDateYear}}` | Tahun angka (cth: *2026*) | — |
| `{{openBtn}}` | Label tombol buka (cth: *Buka Undangan*) | `data-lux-field="customLabels.openBtn"` |
| `{{qrCoverButtonHtml}}`| Tombol akses kartu QR Pass (otomatis dirender jika QR aktif) | — |

### B. Seksi 1: Salam Pembuka & Kutipan Suci (Quote & Opening)

| Token | Kegunaan | Atribut Binding Live Editor |
| :--- | :--- | :--- |
| `{{openingGreeting}}` | Salam pembuka (Arab `﷽`, Latin, Salam Sejahtera, Om Swastiastu, atau kosong) | `data-lux-field="customLabels.openingGreeting"` |
| `{{quoteSectionEyebrow}}` | Subjudul / Eyebrow kutipan (cth: *UNTUK MEMULAI KELUARGA*) | `data-lux-field="customLabels.quoteEyebrow"` |
| `{{quoteSectionTitle}}` | Judul seksi doa (cth: *Doa & Harapan*, *Pappaseng & Doa*) | `data-lux-field="customLabels.quoteTitle"` |
| `{{openingQuote}}` | Teks ayat suci / mutiara kata cinta | `data-lux-field="openingQuote"` |
| `{{openingQuoteRef}}` | Sumber rujukan kutipan (cth: *QS. AR-RUM: 21*) | `data-lux-field="openingQuoteRef"` |
| `{{googleCalendarUrl}}` | URL generator tambah ke Google Calendar | — |

### C. Seksi 2: Profil Kedua Mempelai (The Couple)

| Token | Kegunaan | Atribut Binding Live Editor |
| :--- | :--- | :--- |
| `{{coupleSectionEyebrow}}` | Eyebrow profil (cth: *THE BRIDE & GROOM*) | `data-lux-field="customLabels.coupleEyebrow"` |
| `{{coupleSectionTitle}}` | Judul seksi mempelai (cth: *Mempelai Bahagia*) | `data-lux-field="customLabels.coupleTitle"` |
| `{{coupleSectionSub}}` | Pengantar profil mempelai | `data-lux-field="customLabels.coupleSub"` |
| `{{firstPhotoUrl}}` | Foto mempelai pria | — |
| `{{firstDisplayName}}` | Nama lengkap mempelai pria | `data-lux-field="groomName"` |
| `{{groomRole}}` | Peran mempelai pria (cth: *Mempelai Pria*) | — |
| `{{firstParents}}` | Keterangan putra dari bapak & ibu | `data-lux-field="groomParents"` |
| `{{firstInstagram}}` | Username Instagram pria (tanpa tanda @) | — |
| `{{secondPhotoUrl}}` | Foto mempelai wanita | — |
| `{{secondDisplayName}}`| Nama lengkap mempelai wanita | `data-lux-field="brideName"` |
| `{{brideRole}}` | Peran mempelai wanita (cth: *Mempelai Wanita*) | — |
| `{{secondParents}}` | Keterangan putri dari bapak & ibu | `data-lux-field="brideParents"` |
| `{{secondInstagram}}` | Username Instagram wanita (tanpa tanda @) | — |

### D. Seksi 3: Rangkaian Acara (Schedule & Venue)

| Token | Kegunaan | Atribut Binding Live Editor |
| :--- | :--- | :--- |
| `{{eventsSectionTitle}}` | Judul seksi acara (cth: *Rangkaian Acara*) | `data-lux-field="customLabels.eventsTitle"` |
| `{{eventsSectionSub}}` | Subjudul seksi acara | `data-lux-field="customLabels.eventsSub"` |
| `{{eventDataHtml}}` | **WAJIB:** Container kartu acara dinamis (Akad, Resepsi, dll.) | — |

### E. Modul Ekosistem Dinamis (Dynamic Feature Modules)

Gunakan token mandiri berikut agar tema otomatis terhubung dengan seluruh modul fitur Luxenary:

```html
<!-- 1. KISAH CINTA (Pilih Opsi A atau Opsi B) -->
{{#if showStory}}
<section class="sec-flow" id="story">
  <span class="sec-eyebrow" data-lux-field="customLabels.storyEyebrow">{{storySectionEyebrow}}</span>
  <h2 class="sec-main-title serif" data-lux-field="customLabels.storyTitle">{{storySectionTitle}}</h2>
  <div class="custom-story-container">
    {{storyItemsHtml}}
  </div>
</section>
{{/if}}

<!-- 2. GALERI FOTO & VIDEO (Wajib untuk Health Validator) -->
{{gallerySectionHtml}}

<!-- 3. PANDUAN BUSANA / DRESS CODE -->
{{dressCodeHtml}}

<!-- 4. SIARAN LANGSUNG / LIVE STREAMING -->
{{liveStreamingHtml}}

<!-- 5. FILTER INSTAGRAM STORY -->
{{weddingFilterHtml}}

<!-- 6. TANDA KASIH / AMPLOP DIGITAL (Wajib untuk Health Validator) -->
{{giftSectionHtml}}

<!-- 7. TURUT MENGUNDANG -->
{{turutMengundangHtml}}

<!-- 8. KENANGAN TAMU (GUEST PHOTO BOOTH) -->
{{memoriesSectionHtml}}

<!-- 9. KARTU AKSES QR CODE CHECK-IN -->
{{qrAccessSectionHtml}}
```

### F. Seksi Buku Tamu & RSVP (Guest Book)

```html
<section class="sec-flow" id="rsvp">
  <span class="sec-eyebrow" data-lux-field="customLabels.wishesEyebrow">WISHES & RSVP</span>
  <h2 class="sec-main-title serif" data-lux-field="customLabels.wishesTitle">{{wishesSectionTitle}}</h2>
  <p class="sec-sub" data-lux-field="customLabels.wishesSub">{{wishesSectionSub}}</p>

  <div class="rsvp-form-box">
    <form onsubmit="luxSubmitRsvp(event)">
      <div class="form-group">
        <label class="form-label" data-lux-field="customLabels.rsvpNameLabel">Nama Lengkap</label>
        <input type="text" id="rsvpName" class="form-input" placeholder="Masukkan nama Anda" required />
      </div>
      <div class="form-group">
        <label class="form-label" data-lux-field="customLabels.rsvpStatusLabel">Konfirmasi Kehadiran</label>
        <select id="rsvpStatus" class="form-select">
          <option value="HADIR">Hadir dengan Senang Hati</option>
          <option value="TIDAK_HADIR">Mohon Maaf, Berhalangan Hadir</option>
          <option value="RAGU">Masih Ragu</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" data-lux-field="customLabels.rsvpCountLabel">Jumlah Tamu</label>
        <select id="rsvpGuests" class="form-select">
          <option value="1">1 Orang</option>
          <option value="2">2 Orang</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" data-lux-field="customLabels.rsvpMessageLabel">Ucapan & Doa Restu</label>
        <textarea id="rsvpMessage" class="form-textarea" rows="3" placeholder="Tuliskan ucapan..." required></textarea>
      </div>
      <button type="submit" id="btnSubmit" class="btn-submit-rsvp" data-lux-field="customLabels.rsvpBtnText">
        Kirim Konfirmasi & Doa
      </button>
    </form>
  </div>

  <!-- Feed Komentar / Ucapan Real-Time -->
  <div class="wishes-stream-container">
    {{wishesListHtml}}
  </div>
</section>
```

### G. Seksi Footer & Salam Penutup (Closing Section)

Area footer penutup (`closing-sec` / `site-footer`) wajib menggunakan kanvas **transparan** dan menyematkan token foto dinamis `{{closingBgStyle}}`:

```html
<!-- HTML Wajib: Selalu sematkan {{closingPhotoClass}} dan style="{{closingBgStyle}}" -->
<footer class="site-footer {{closingPhotoClass}}" style="{{closingBgStyle}}">
  <div class="closing-content">
    <p style="font-size:0.85rem; color:rgba(255,255,255,0.8); line-height:1.7; margin-bottom:1.5rem;">
      Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu bagi kami.
    </p>
    <p style="font-size:0.75rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--accent); font-weight:600; margin-bottom:0.5rem;">
      Kami Yang Berbahagia,
    </p>
    <h2 class="footer-names serif" style="font-size:2.6rem; color:var(--primary); margin-bottom:0.4rem;">
      {{firstName}} &amp; {{secondName}}
    </h2>
    <p style="font-size:0.75rem; color:rgba(255,255,255,0.7); letter-spacing:0.2em; text-transform:uppercase; margin-top:0.5rem;">
      TERIMA KASIH ATAS DOA DAN KEHADIRAN ANDA
    </p>
  </div>
</footer>
```

```css
/* CSS Wajib: Transparan murni agar menyatu dengan latar kanvas global */
.site-footer, .closing-sec {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  text-align: center;
  padding: 4rem 1.5rem 6.5rem;
  background: transparent; /* ⚠️ DILARANG KERAS MENGGUNAKAN WARNA HEX SOLID/HARDCODE */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Tanpa Foto: Transparan penuh, kanvas wallpaper & palet tema tembus alami */
.site-footer.no-closing-photo, .closing-sec.no-closing-photo {
  justify-content: center;
  align-items: center;
  background: transparent;
}

/* Ada Foto: Konten merapat ke bawah dengan Scrim Overlay pelindung kontras teks */
.site-footer.has-closing-photo, .closing-sec.has-closing-photo {
  justify-content: flex-end;
  align-items: center;
}

.site-footer.has-closing-photo::before, .closing-sec.has-closing-photo::before {
  content: '';
  position: absolute;
  inset: 0;
  /* Scrim gradasi gelap dinamis di atas foto penutup */
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.2) 0%,
    color-mix(in srgb, var(--bg-dark, #050507) 60%, transparent) 50%,
    color-mix(in srgb, var(--bg-dark, #050507) 95%, transparent) 100%
  );
  pointer-events: none;
  z-index: 1;
}

.site-footer .closing-content, .closing-sec .closing-content {
  position: relative;
  z-index: 2;
  max-width: 520px;
  margin: 0 auto;
}
```

---

## ⚡ 3. Cara Kerja Live Editor & Click-to-Edit

Ketika template dibuka di Live Editor:
1. Engine memindai semua elemen yang memiliki atribut `data-lux-field="..."`.
2. Jika atribut belum disetel oleh pembuat tema, **Heuristic Fallback Engine** di `lib/renderTemplate.ts` secara otomatis menyuntikkan binding berdasarkan class atau ID selektor (seperti `.opening-greeting`, `.cover-badge`, `#section-couple .sec-heading`, dll.).
3. Elemen otomatis diberi atribut `contenteditable="true"`.
4. Setiap ketukan keyboard pengguna langsung disinkronkan ke state draft `customLabels` dan disimpan ke database secara reaktif.
5. Jika pengguna menghapus teks hingga kosong, sistem menyimpan *string kosong* (`""`) dan tidak akan mengembalikan teks default secara paksa.

---

## 🛠️ 4. Panduan Langkah Demi Langkah: Membuat Tema Baru

Ikuti 5 langkah mudah berikut setiap kali ingin merilis tema baru ke ekosistem Luxenary:

1. **Duplikasi Cetak Biru:**
   Salin berkas [`themes/starter-blueprint.html`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/themes/starter-blueprint.html) ke subfolder kategori tema Anda:
   - Modern: `themes/modern/<nama_tema>.html`
   - Traditional: `themes/traditional/<nama_tema>.html`
   - Premium: `themes/premium/<nama_tema>.html`

2. **Kustomisasi Gaya & Estetika (CSS):**
   - Atur Google Font lokal tanpa latensi di `<link rel="stylesheet" href="/fonts/fonts.css" />`.
   - Modifikasi palet warna CSS variables pada blok `:root`.
   - Tambahkan ornamen SVG unik tema Anda.

3. **Verifikasi Token Wajib:**
   Pastikan berkas HTML memuat:
   - `{{gallerySectionHtml}}` (atau `{{galleryPhotosHtml}}`)
   - `{{storySectionHtml}}` (atau `{{storyItemsHtml}}`)
   - `{{giftSectionHtml}}` (atau `{{giftCardsHtml}}`)
   - `{{eventDataHtml}}`

4. **Sinkronisasi Otomatis ke Database:**
   - Buka **Admin Dashboard** $\rightarrow$ Tab **Tema Undangan** (`/admin?tab=themes`).
   - Klik tombol **"Sync Themes"**.
   - Sistem secara otomatis memindai tema baru, mendaftarkannya ke tabel `Theme` PostgreSQL, dan mengompilasi halaman showcase demo statis tanpa perlu restart server!

5. **Pengujian Faktual:**
   - Buka halaman preview live editor tema baru di browser.
   - Klik langsung pada badge cover, salam pembuka, dan judul seksi untuk memastikan fitur *Click-to-Edit* berfungsi sempurna.

---

## 💎 5. Standar Emas Navigasi, Desktop Split, & Estetika Visual (Visual Excellence & Isolation Standards)

### A. Clean Hero Canvas (Panel Kiri Bersih Murni)
- **Panel Kiri Desktop Split ($\ge 900\text{px}$):**
  - Elemen `<aside class="sidebar-desktop"></aside>` harus berupa **kanvas foto murni** (`{{sidebarPhotoUrl}}`).
  - **DILARANG KERAS** menaruh elemen teks duplikat, quote, emblem, atau nama mempelai di atas panel kiri desktop.
  - Elemen pembuka undangan HANYA boleh tampil di dalam gerbang cover pembuka (`#coverScreen` / `.cover-overlay`). Setelah dibuka, panel kiri berfungsi murni sebagai latar foto sinematik yang bersih dan elegan.

### B. Isolasi Dock Navigasi (Strict 460px Desktop Boundary & Mobile Anti-Overflow)
- **Mode Desktop ($\ge 900\text{px}$):**
  Dock navigasi (`.bottom-dock`) WAJIB terisolasi secara mutlak di dalam kolom undangan 460px:
  ```css
  @media (min-width: 900px) {
    .bottom-dock {
      left: calc(100% - 230px) !important;
      transform: translate3d(-50%, 0, 0) !important;
      width: calc(460px - 28px) !important;
      max-width: calc(460px - 28px) !important;
      box-sizing: border-box !important;
      padding: 0.35rem 0.45rem !important;
      gap: 0.15rem !important;
      justify-content: space-around !important;
    }
  }
  ```
  *Dilarang keras dock meluber atau menyeberang ke area foto sebelah kiri maupun keluar dari tepi layar kanan.*
- **Mode Mobile ($< 900\text{px}$):**
  Untuk mencegah scroll horizontal (scroll kanan-kiri), dock wajib memiliki batas lebar adaptif dan setiap tombol dock harus lentur:
  ```css
  .bottom-dock {
    width: calc(100% - 24px);
    max-width: 436px;
    box-sizing: border-box;
    left: 50%;
    transform: translate3d(-50%, 0, 0);
  }
  .bottom-dock .dock-btn, .bottom-dock .dock-a, .bottom-dock .nav-item {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.25rem 0.15rem;
  }
  .bottom-dock .dock-btn span, .bottom-dock .dock-a span, .bottom-dock .nav-item span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.55rem;
    max-width: 100%;
  }
  ```
- **Harmonisasi Tombol QR TAMU:**
  Tombol QR pass (`.bottom-dock .qr-btn, .bottom-dock button.nav-item`) wajib diatur transparan (`background: transparent !important; border: none !important;`) agar menyatu harmonis dengan estetika tema dan tidak memunculkan kotak putih bawaan peramban.

### C. Smart Controls: Autohide on Scroll & Home Zone Guard
- Dock navigasi dan FAB audio wajib mengimplementasikan kontrol cerdas:
  1. Tersembunyi otomatis saat pengguna menggulir ke bawah (`delta > 0`).
  2. Muncul kembali seketika saat pengguna menggulir ke atas (`delta < 0`).
  3. Tersembunyi saat berada di zona hero cover (`lux-at-home-zone`).

### D. Standar Seksi Penutup (Outro / Closing Section)
- **Mode Ada Foto (`has-closing-photo`):**
  - Ornamen ilustrasi (seperti rumah adat atau lambang budaya) wajib berada di **ATAS** secara statis (tanpa animasi floating berlebih dan tanpa glow berlebihan).
  - Teks ucapan terima kasih dan nama mempelai berada di **BAWAH** dengan scrim pelindung kontras.
  - Hal ini menjamin wajah kedua mempelai pada foto penutup di bagian tengah **TIDAK TERHALANG** oleh ornamen apapun.
- **Mode Tanpa Foto (`no-closing-photo`):**
  - Seluruh elemen terpusat rapi di tengah (`justify-content: center;`).

### E. Integrasi Ornamen Budaya & Pembatas (Non-Obtrusive Aesthetics)
- **Pembatas (Divider):** Dilarang memasang gambar pembatas kotak dengan tepi tajam terpotong. Gunakan masker gradasi halus:
  ```css
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%);
  ```
- **Ornamen Kartu:** Ornamen motif kultural harus diletakkan rapi di dalam padding kartu tanpa terpotong kasar oleh `overflow: hidden` pada sudut kartu yang melengkung.

