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

### D. Pemisahan Mutlak: Master Theme Assets vs Client Media Slots
Sistem memisahkan secara tegas antara aset bawaan tema dan wadah unggahan personal klien:
1. **Master Theme Assets (DNA Bawaan Tema Master):**
   - **Lokasi Fisik:** `/assets/ornaments/<slug>/...` (statis di disk dan CDN).
   - **Kepemilikan:** Milik template tema master (sistem/desainer).
   - **Akses Klien:** **NOL (Zero-Access)**. Klien tidak bisa mengubah, menimpa, atau menghapus aset ini.
   - **Cakupan:** Latar belakang kanvas master (`background.webp`), frame adat (Walasuji, Patra, Pa'tedong), corak kain (Sabbe, Tenun), aksara/watermark, pembatas (divider), dan ornamen sudut.
   - **Implementasi:** Di-embed langsung di CSS/HTML tema via URL statis `/assets/ornaments/<slug>/...`.
2. **Client Media Slots (Slot Unggahan Personal Klien):**
   - **Lokasi Fisik:** `public/uploads/invitations/<id>/...` atau Cloud Storage (R2/S3).
   - **Kepemilikan:** Milik klien/pemesan undangan per ID acara. Dikelola via tabel `InvitationMedia` (Prisma enum `MediaSlot`).
   - **Akses Klien:** Penuh (Upload, ganti foto, crop, hapus melalui Studio/Dashboard).
   - **Cakupan:** `COVER_PHOTO` (`{{homePhotoUrl}}`), `LANDING_COVER_DESKTOP` (`{{sidebarPhotoUrl}}`), `GLOBAL_FIXED_BG` (`{{globalBgUrl}}`), `GROOM_PHOTO` (`{{firstPhotoUrl}}`), `BRIDE_PHOTO` (`{{secondPhotoUrl}}`), `CLOSING_COVER` (`{{closingBgStyle}}`), dan `BACKGROUND_MUSIC`.
   - **Implementasi:** Disuntikkan runtime secara dinamis melalui kurung kurawal ganda `{{token}}`.

### E. Pewarisan Palet Dinamis & Larangan Mutlak Fallback Hex (Zero Hex Fallback in CSS)
Setiap tema master memiliki **identitas warna bawaan (default palette)** yang tercatat di `lib/themeDefaults.ts` dan tabel `Theme` di database (`Theme.defaultPalette`):
- Saat klien memilih tema, sistem secara otomatis menginjeksi palet ke dalam `:root` via token template:
  ```css
  :root {
    --primary: {{colorPrimary}};
    --secondary: {{colorSecondary}};
    --accent: {{colorAccent}};
    --bg-light: {{colorBgLight}};
    --bg-dark: {{colorBgDark}};
    --text-main: {{colorTextDark}};
    --text-muted: color-mix(in srgb, {{colorTextDark}} 70%, transparent);
  }
  ```
- **DILARANG KERAS MENYISIPKAN FALLBACK HEX DI DALAM `var()`:**
  Di seluruh file CSS tema, gunakan token murni: `var(--primary)`, `var(--bg-dark)`, `var(--text-main)`. Jangan pernah menulis `var(--primary, #hex)` atau `var(--bg-dark, #hex)`. Nilai hex statis di dalam CSS membatalkan fleksibilitas palet dinamis.

### F. Kontrak Mutlak 100% Kustomisasi via CustomLabels (Zero-Edit HTML Contract)
Tema master yang telah selesai dibangun **TIDAK BOLEH MEMERLUKAN PERUBAHAN KODE HTML LAGI** oleh klien ataupun admin:
- Seluruh teks antarmuka (badge cover, salam, judul seksi, subjudul, label form RSVP, countdown, hingga salam keluarga di footer) **WAJIB TERIKAT** ke atribut dua arah `data-lux-field="customLabels.<key>"`.
- Klien dapat mengubah setiap kata di undangan secara instan dari Dashboard/Studio Form Editor tanpa menyentuh satu baris kode pun.

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
| `{{coverGuestLabel}}`| Keterangan penerima tamu (*Kepada Yth. Bapak/Ibu/Saudara/i*) | `data-lux-field="customLabels.coverGuestLabel"` |
| — | Nama tamu undangan di cover (dinamis via `?to=`) | `data-lux-field="guestName"` |
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
| `{{firstRoleLabel}}` | Peran mempelai pria (cth: *Mempelai Pria*) | `data-lux-field="customLabels.groomRole"` |
| `{{firstParents}}` | Keterangan putra dari bapak & ibu | `data-lux-field="groomParents"` |
| `{{firstInstagram}}` | Username Instagram pria (tanpa tanda @) | — |
| `{{secondPhotoUrl}}` | Foto mempelai wanita | — |
| `{{secondDisplayName}}`| Nama lengkap mempelai wanita | `data-lux-field="brideName"` |
| `{{secondRoleLabel}}` | Peran mempelai wanita (cth: *Mempelai Wanita*) | `data-lux-field="customLabels.brideRole"` |
| `{{secondParents}}` | Keterangan putri dari bapak & ibu | `data-lux-field="brideParents"` |
| `{{secondInstagram}}` | Username Instagram wanita (tanpa tanda @) | — |

### D. Seksi 3: Rangkaian Acara (Schedule & Venue)

| Token | Kegunaan | Atribut Binding Live Editor |
| :--- | :--- | :--- |
| `{{eventsSectionEyebrow}}` | Subjudul / Eyebrow seksi acara (cth: *SCHEDULE & VENUE*) | `data-lux-field="customLabels.eventsEyebrow"` |
| `{{eventsSectionTitle}}` | Judul seksi acara (cth: *Rangkaian Acara*) | `data-lux-field="customLabels.eventsTitle"` |
| `{{eventsSectionSub}}` | Subjudul seksi acara | `data-lux-field="customLabels.eventsSub"` |
| `{{eventDataHtml}}` | **WAJIB:** Container kartu acara dinamis (Akad, Resepsi, dll.) | — |

### E. Seksi 4: Hitung Mundur (Countdown Timer & Kalender)

| Token | Kegunaan | Atribut Binding Live Editor |
| :--- | :--- | :--- |
| — | Eyebrow countdown (cth: *SAVE THE DATE*) | `data-lux-field="customLabels.countdownEyebrow"` |
| — | Judul countdown (cth: *Menghitung Hari Bahagia*) | `data-lux-field="customLabels.countdownTitle"` |
| — | Subjudul countdown pengantar kehadiran tamu | `data-lux-field="customLabels.countdownSub"` |
| — | Label satuan hari (*Hari*) | `data-lux-field="customLabels.cdDays"` |
| — | Label satuan jam (*Jam*) | `data-lux-field="customLabels.cdHours"` |
| — | Label satuan menit (*Menit*) | `data-lux-field="customLabels.cdMins"` |
| — | Label satuan detik (*Detik*) | `data-lux-field="customLabels.cdSecs"` |
| `{{googleCalendarUrl}}` | Tombol simpan kalender (*Simpan ke Google Calendar*) | `data-lux-field="customLabels.saveDateBtn"` |

### F. Modul Ekosistem Dinamis (Dynamic Feature Modules)

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

### G. Seksi Buku Tamu & RSVP (Guest Book)

```html
<section class="sec-flow" id="rsvp">
  <span class="sec-eyebrow" data-lux-field="customLabels.wishesEyebrow">WISHES &amp; RSVP</span>
  <h2 class="sec-main-title serif" data-lux-field="customLabels.wishesTitle">{{wishesSectionTitle}}</h2>
  <p class="sec-sub" data-lux-field="customLabels.wishesSub">{{wishesSectionSub}}</p>

  <div class="rsvp-form-box">
    <form onsubmit="luxSubmitRsvp(event)">
      <div class="form-group">
        <label class="form-label" data-lux-field="customLabels.rsvpNameLabel">Nama Lengkap</label>
        <input type="text" id="rsvpName" name="guestName" class="form-input" placeholder="Masukkan nama Anda" required />
      </div>
      <div class="form-group">
        <label class="form-label" data-lux-field="customLabels.rsvpStatusLabel">Konfirmasi Kehadiran</label>
        <select id="rsvpStatus" name="status" class="form-select" required>
          <option value="HADIR">Hadir dengan Senang Hati</option>
          <option value="TIDAK_HADIR">Mohon Maaf, Berhalangan Hadir</option>
          <option value="RAGU">Masih Ragu</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" data-lux-field="customLabels.rsvpCountLabel">Jumlah Tamu</label>
        <select id="rsvpGuests" name="guestCount" class="form-select">
          <option value="1">1 Orang</option>
          <option value="2">2 Orang</option>
          <option value="3">3 Orang</option>
          <option value="4">4 Orang</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" data-lux-field="customLabels.rsvpMessageLabel">Ucapan &amp; Doa Restu</label>
        <textarea id="rsvpMessage" name="message" class="form-textarea" rows="3" placeholder="Tuliskan ucapan..." required></textarea>
      </div>
      <button type="submit" id="btnSubmit" class="btn-submit-rsvp" data-lux-field="customLabels.rsvpBtnText">
        Kirim Konfirmasi &amp; Doa
      </button>
    </form>
  </div>

  <!-- Feed Komentar / Ucapan Real-Time (WAJIB: Gunakan token {{wishesHtml}}) -->
  <div class="wishes-stream-container" id="wishesList">
    {{wishesHtml}}
  </div>
</section>
```

#### Kontrak API Backend (`/api/public/rsvp`) & Handler JavaScript:
Setiap tema **WAJIB** mengirim payload JSON yang cocok dengan kontrak backend:
```javascript
// Payload JSON yang diterima backend:
{
  invitationId: '{{invitationId}}',
  guestName: name,     // WAJIB: guestName (BUKAN name)
  status: status,       // WAJIB: HADIR / TIDAK_HADIR / RAGU
  guestCount: pax,      // WAJIB: guestCount integer (BUKAN pax)
  message: msg          // WAJIB: message string
}
```
**Aturan Anti-Fake Success:** Dilarang menampilkan status `"TERKIRIM!"` jika `res.ok` bernilai `false`. Selalu tangkap error JSON dari backend dan tampilkan pesan kesalahan nyata kepada pengguna. Prepend ucapan baru ke container feed `#wishesList` secara reaktif.

### H. Seksi Footer & Salam Penutup (Closing Section)

Area footer penutup (`closing-sec` / `site-footer`) wajib menggunakan kanvas **transparan** dan menyematkan token foto dinamis `{{closingBgStyle}}`:

```html
<!-- HTML Wajib: Selalu sematkan {{closingPhotoClass}} dan style="{{closingBgStyle}}" -->
<footer class="site-footer {{closingPhotoClass}}" style="{{closingBgStyle}}">
  <!-- (Opsional untuk Tema Adat/Kultural) Ornamen/Lambang Budaya di Bagian Atas -->
  <div class="closing-top-ornament">
    <img src="/assets/ornaments/.../icon.webp" alt="Lambang Budaya">
  </div>

  <!-- Kontainer Konten Penutup Wajib: Berada di Bagian Bawah saat Ada Foto -->
  <div class="closing-content">
    <p style="font-size:0.85rem; color:rgba(255,255,255,0.85); line-height:1.7; margin-bottom:1.5rem;" data-lux-field="customLabels.closingQuote">
      {{closingQuote}}
    </p>
    <p style="font-size:0.75rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--accent); font-weight:600; margin-bottom:0.5rem;" data-lux-field="customLabels.closingSub">
      {{closingSub}}
    </p>
    <h2 class="footer-names serif" style="font-size:2.4rem; color:var(--primary); margin-bottom:0.4rem;">
      {{firstName}} &amp; {{secondName}}
    </h2>
    <p style="font-size:0.75rem; color:rgba(255,255,255,0.7); letter-spacing:0.15em; text-transform:uppercase; margin-top:0.5rem;" data-lux-field="customLabels.closingFamily">
      Beserta Keluarga Besar Kedua Mempelai
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
  padding: clamp(2.5rem, 6vh, 4rem) 1.5rem calc(90px + env(safe-area-inset-bottom, 0px));
  background: transparent; /* ⚠️ DILARANG KERAS MENGGUNAKAN WARNA HEX SOLID/HARDCODE */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Tanpa Foto: Transparan penuh, semua elemen terpusat rapi di tengah kanvas */
.site-footer.no-closing-photo, .closing-sec.no-closing-photo {
  justify-content: center;
  align-items: center;
  background: transparent;
}

/* Ada Foto: Memisahkan ornamen atas dan teks bawah (Wajah mempelai di tengah bebas halangan) */
.site-footer.has-closing-photo, .closing-sec.has-closing-photo {
  justify-content: space-between; /* Gunakan flex-end jika tema tidak memiliki ornamen atas */
  align-items: center;
}

/* Scrim Gradient Gelap Dinamis Melindungi Keterbacaan Teks di Bawah Foto */
.site-footer.has-closing-photo::before, .closing-sec.has-closing-photo::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.15) 0%,
    color-mix(in srgb, var(--bg-dark) 45%, transparent) 45%,
    color-mix(in srgb, var(--bg-dark) 92%, transparent) 100%
  );
  pointer-events: none;
  z-index: 1;
}

/* Ornamen Atas (Jika Ada): Tetap di atas secara elegan */
.site-footer .closing-top-ornament, .closing-sec .closing-top-ornament {
  position: relative;
  z-index: 2;
  margin: 0 auto 1.5rem;
}
.site-footer.has-closing-photo .closing-top-ornament, .closing-sec.has-closing-photo .closing-top-ornament {
  margin: 0 auto 0.8rem;
}

/* Kontainer Konten Penutup Wajib: Berada di atas scrim dan merapat ke bawah */
.site-footer .closing-content, .closing-sec .closing-content {
  position: relative;
  z-index: 2;
  max-width: 520px;
  width: 100%;
  margin: 0 auto;
}
.site-footer.has-closing-photo .closing-content, .closing-sec.has-closing-photo .closing-content {
  margin-top: auto;
}
```

### I. Standar Modal QR Check-In & Voucher Souvenir (Ticket Gateway)

Engine menyediakan token `{{qrCoverButtonHtml}}` (pada sampul) dan `{{qrDockButtonHtml}}` (pada dock navigasi bawah). Kedua tombol ini memicu pemanggilan JavaScript `onclick="openModal()"`.

Setiap tema **WAJIB** menyertakan markup modal, styling CSS tokenized (tanpa hex fallback), dan pengendali fungsi berikut:

```html
<!-- HTML Wajib: Letakkan tepat sebelum </body> atau setelah </nav> -->
<div class="modal-bg" id="modalBg" onclick="closeModal(event)">
  <div class="modal-card" onclick="event.stopPropagation()">
    <button class="modal-close" onclick="closeModal()" aria-label="Tutup Modal">✕</button>
    {{qrAccessCardHtml}}
    <div style="margin-top: 1.2rem; padding: 0.9rem; background: color-mix(in srgb, var(--primary) 5%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent); text-align: center; border-radius: 10px;">
      <span style="font-size: 0.65rem; letter-spacing: 0.2em; color: var(--text-muted); text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 0.4rem;" data-lux-field="customLabels.souvenirTitle">Voucher Souvenir</span>
      <div style="font-family: monospace; font-weight: 700; font-size: 0.85rem; color: var(--primary); letter-spacing: 0.12em; padding: 0.45rem; background: color-mix(in srgb, var(--primary) 8%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); border-radius: 6px;">SOUVENIR-{{invitationId}}</div>
    </div>
  </div>
</div>
```

```javascript
// JS Wajib: Pengendali Modal Global
function openModal() {
  const modal = document.getElementById('modalBg');
  if (modal) modal.classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modalBg') || (e.target && e.target.classList && e.target.classList.contains('modal-close'))) {
    const modal = document.getElementById('modalBg');
    if (modal) modal.classList.remove('open');
  }
}
```

### J. Standar Dock Navigasi Bawah (Bottom Navigation Dock)

Untuk menjamin seluruh label navigasi dock dapat diterjemahkan atau dikustomisasi oleh klien tanpa mengubah berkas template HTML:

| Label Menu | Teks Default | Atribut Binding Dua Arah |
| :--- | :--- | :--- |
| Home | `Home` | `data-lux-field="customLabels.navHome"` |
| Couple | `Couple` | `data-lux-field="customLabels.navCouple"` |
| Acara | `Acara` | `data-lux-field="customLabels.navEvents"` |
| Kisah | `Kisah` | `data-lux-field="customLabels.navStory"` |
| Ucapan | `Ucapan` | `data-lux-field="customLabels.navWishes"` |

```html
<nav class="bottom-dock dock-hidden">
  <a href="#home" class="dock-btn">
    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
    <span data-lux-field="customLabels.navHome">Home</span>
  </a>
  <a href="#couple" class="dock-btn">
    <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
    <span data-lux-field="customLabels.navCouple">Couple</span>
  </a>
  <a href="#events" class="dock-btn">
    <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
    <span data-lux-field="customLabels.navEvents">Acara</span>
  </a>
  <a href="#story" class="dock-btn">
    <svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
    <span data-lux-field="customLabels.navStory">Kisah</span>
  </a>
  <a href="#rsvp" class="dock-btn">
    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
    <span data-lux-field="customLabels.navWishes">Ucapan</span>
  </a>
  {{qrDockButtonHtml}}
</nav>
```

### K. Standar Floating Audio FAB & Visibilitas Dock (Home-Safe Audio & Outro Autohide)

Tombol audio mengambang (`#musicToggle` / `.audio-fab`) dan dock navigasi bawah (`.bottom-dock`) wajib mengimplementasikan sinkronisasi visibilitas terpadu:
1. **Tersembunyi di Seksi Pembuka `#home` (`fab-hidden`):**
   - Saat sampul dibuka (`openInvitation()`), audio mulai diputar di latar, namun tombol fisik FAB **wajib tetap tersembunyi** (`fab.classList.add('fab-hidden')`) agar tidak merusak keanggunan visual Opening Hero 100vh.
2. **Mengikuti Dock saat Scroll:**
   - Begitu tamu scroll melewati seksi `#home` (`currentScrollY > homeThreshold`), tombol audio muncul bersama dock navigasi.
   - Saat scroll ke bawah cepat (*scroll down*), kedua kontrol bersembunyi bersamaan.
   - Saat scroll ke atas (*scroll up*), kedua kontrol muncul kembali bersamaan.
3. **Ultra-Clean Outro (Ujung Bawah Halaman):**
   - Di ujung bawah halaman (seksi penutup/outro), dock dan audio FAB otomatis bersembunyi untuk memberikan tampilan akhir yang bersih dan elegan.
4. **Navigasi Balik ke `#home`:**
   - Jika tamu men-scroll kembali ke `#home` atau mengklik tab `#home` di dock navigasi, audio FAB kembali tersembunyi secara otomatis (`setControls(true, false)`).

---

## ⚡ 3. Cara Kerja Live Editor &amp; Click-to-Edit

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
   - Minimalis: `themes/minimalist/<nama_tema>.html`

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

### E. Integrasi Ornamen Budaya &amp; Pembatas (Non-Obtrusive Aesthetics)
- **Pembatas (Divider):** Dilarang memasang gambar pembatas kotak dengan tepi tajam terpotong. Gunakan masker gradasi halus:
  ```css
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%);
  ```
- **Ornamen Kartu:** Ornamen motif kultural harus diletakkan rapi di dalam padding kartu tanpa terpotong kasar oleh `overflow: hidden` pada sudut kartu yang melengkung.

### F. Standarisasi Ornamen Kultural Tradisional &amp; Framing Mobile (Traditional Theme Rules)
Bagi tema tradisional/kultural yang menyematkan bingkai ornamen adat (Bugis, Makassar, Toraja, Jawa, Bali, dll.):
1. **Arsitektur Frame & Ornamen Tepi Responsif (Seamless Repeat Policy):**
   - **DILARANG KERAS** menggunakan `object-fit: cover` dengan batas `max-height` kaku pada container berlebar `width: 100%`, karena akan memotong (*crop*) vertikal rumbai/detail ornamen ketika dibuka di resolusi tablet atau desktop layar lebar.
   - **Wajib Menggunakan Seamless Repeat Tile (`repeat-x`):**
     Gunakan elemen container `div` berlatar belakang `background-repeat: repeat-x` dengan ukuran tinggi tetap (`background-size: auto <tinggi>px`). Dengan arsitektur ini, motif ornamen akan otomatis memanjang ke samping mengisi layar tanpa pernah membesar berlebihan atau terpotong:
     ```css
     .bugis-frame-top, .cultural-frame-top {
       position: absolute;
       top: 0;
       left: 0;
       width: 100%;
       height: 110px;
       background-image: url('/assets/ornaments/bugis/bugis-atas.webp');
       background-repeat: repeat-x;
       background-position: top center;
       background-size: auto 110px;
       pointer-events: none;
       z-index: 14;
     }
     .bugis-frame-bottom, .cultural-frame-bottom {
       position: absolute;
       bottom: 0;
       left: 0;
       width: 100%;
       height: 88px;
       background-image: url('/assets/ornaments/bugis/frame-bottom.webp');
       background-repeat: repeat-x;
       background-position: bottom center;
       background-size: auto 88px;
       pointer-events: none;
       z-index: 14;
       filter: drop-shadow(0 -4px 18px rgba(0,0,0,0.65));
     }
     ```
2. **Isolasi Bunga Sudut (`.corner-floral`) vs Frame Geometris:**
   - Ukuran bunga sudut wajib adaptif: `width: clamp(75px, 20vw, 95px); height: clamp(75px, 20vw, 95px);`.
   - Bunga di dua sudut bawah cover **WAJIB DINONAKTIFKAN** pada layar cover pembuka:
     ```css
     .cover-screen .corner-bl,
     .cover-screen .corner-br {
       display: none !important;
     }
     ```
     Hal ini untuk mencegah bunga menimpa atau bertabrakan kusut dengan ornamen rumah adat di pojok kiri dan kanan bawah.
3. **Safe Padding Bawah Cover:**
   - Cover wajib memiliki padding bawah minimal setara tinggi frame:
     ```css
     .cover-screen {
       padding: 2.2rem 1.5rem clamp(95px, 26vw, 125px);
     }
     ```
     Ini menjamin tombol aksi *Buka Undangan* dan box nama tamu tidak menabrak atap ornamen rumah adat.

### G. Kebersihan Visual Tanpa Scrollbar Native (Scrollbar Suppression Standard)
Untuk menghadirkan pengalaman visual yang bersih (*luxury clean aesthetic*) tanpa bilah scrollbar native abu-abu yang merusak estetika tepi layar desktop maupun mobile, seluruh tema **WAJIB** menyembunyikan scrollbar visual di tingkat root (`html, body`) serta kontainer scroll internal (`.wishes-list`, `.cover-screen`, dll.) tanpa mematikan kemampuan scroll roda mouse, trackpad, maupun gestur sentuh:
```css
/* Root Document Suppression */
html {
  scroll-behavior: smooth;
  -ms-overflow-style: none; /* IE & Edge */
  scrollbar-width: none;    /* Firefox */
}
body {
  overflow-x: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

/* Scrollable Container Suppression (e.g. Wishes Feed / Drawers) */
.wishes-list,
.wishes-stream-wrap,
.wishes-feed-list {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.wishes-list::-webkit-scrollbar,
.wishes-stream-wrap::-webkit-scrollbar,
.wishes-feed-list::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
```

---

## 🏛️ 6. Standar Master Hirarki 5 Lapisan Tema (Official 5-Layer Stacking Hierarchy)

Seluruh tema master di ekosistem Luxenary **WAJIB** menerapkan urutan 5 lapisan baku ini dari lapisan paling bawah hingga paling atas. Tidak boleh ada lapisan yang tertukar atau dicampuradukkan:

```
▲ [LAPISAN 5: COVER PEMBUKA] (z-index: 9999) ── Paling atas: Gerbang sampul pembuka sebelum undangan dibuka
│
▲ [LAPISAN 4: KONTEN UNDANGAN] (z-index: 10)  ── Isi acara, mempelai, ornamen frame, countdown, dock navigasi
│
▲ [LAPISAN 3: KANVAS SCRIM] (z-index: 1)     ── Kanvas gradasi transparan pelindung kontras teks (Mandiri)
│
▲ [LAPISAN 2: MEDIA SLOT BACKGROUND] (z-index: 0) ── Gambar background murni (Unggahan Klien / Fallback Master)
│
▲ [LAPISAN 1: WARNA PALET] (Dasar Kanvas)    ── background-color: var(--bg-dark); (Warna palet solid terbawah)
```

### Rincian Implementasi 5 Lapisan:

| Lapisan | Nama Lapisan | Selektor / Tag HTML | Perilaku & Karakteristik |
| :--- | :--- | :--- | :--- |
| **Lapisan 1** | **Warna Palet (Dasar Terbawah)** | `body` / `:root` | `background-color: var(--bg-dark);`. Warna palet solid dasar tema. |
| **Lapisan 2** | **Media Slot Background** | `<div class="fixed-bg-layer"></div>` | Murni gambar tanpa gradien: `background-image: url('{{globalBgUrl}}'), url('/assets/ornaments/<slug>/<bg-master>.webp');`. `position: fixed; inset: 0; z-index: 0; pointer-events: none;`. |
| **Lapisan 3** | **Kanvas Scrim** | `<div class="scrim-canvas"></div>` | Kanvas overlay gradasi transparan mandiri di atas gambar: `position: fixed; inset: 0; z-index: 1; pointer-events: none;`. |
| **Lapisan 4** | **Konten Undangan** | `<div class="layout-wrapper">...</div>` | Area konten interaktif (profil, kartu acara, galeri, form rsvp, ornamen frame, dock navigasi). `position: relative; z-index: 10;`. |
| **Lapisan 5** | **Cover Pembuka (Paling Atas)** | `<div id="coverScreen">...</div>` | Gerbang pembuka saat tamu pertama kali tiba: `position: fixed; inset: 0; z-index: 9999;`. Meluncur ke atas saat tombol *Buka Undangan* diklik. |

---

## 🌌 7. Standar Kanvas Latar Belakang & Formula Scrim Dinamis (Anti-Blackout Policy)

### PRINSIP MUTLAK: TIDAK BOLEH ADA SCRIM YANG MEMBUNUH LATAR
Jika scrim terlalu pekat, maka **fitur Media Slot background (`GLOBAL_FIXED_BG`) menjadi sia-sia** karena gambar apapun yang diunggah klien atau disediakan oleh master tema akan tertelan menjadi gelap gulita.

Latar belakang (baik foto unggahan klien maupun lukisan/corak master tema) adalah **panggung visual utama tema**. Scrim **HANYA** berfungsi sebagai lapisan tipis penyeimbang kontras teks, **BUKAN** penutup latar.

### A. Rantai CSS Fallback Media Slot `GLOBAL_FIXED_BG`
Latar belakang kanvas tema diatur pada elemen `.fixed-bg-layer`. Template wajib menghubungkan slot media dinamis klien dengan gambar master bawaan tema sebagai fallback:

```css
.fixed-bg-layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  /* Rantai Fallback: Scrim Halus -> Upload Klien -> Background Bawaan Master */
  background-image: 
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.15) 0%,
      color-mix(in srgb, var(--primary) 20%, transparent) 35%,
      color-mix(in srgb, var(--bg-dark) 35%, transparent) 70%,
      color-mix(in srgb, var(--bg-dark) 50%, transparent) 100%
    ),
    url('{{globalBgUrl}}'),
    url('/assets/ornaments/<theme-slug>/<master-background>.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 1;
  pointer-events: none;
}
```

- **Rentang Emas Scrim (Golden Range):** **15% – 45%**. Gambar latar belakang (tekstur cat air, siluet arsitektur, partikel emas, atau foto prewedding klien) wajib tampil hidup, tajam, dan memikat di layar.

### C. Isolasi Slot Media & Larangan Fallback Silang (Zero Cross-Fallback Policy)
- **DILARANG KERAS MEM-FALLBACK FOTO MEMPELAI KE BACKGROUND GLOBAL:**
  Slot foto seksi pembuka (`HOME_PHOTO` / `{{homePhotoCssUrl}}` / `{{homePhotoUrl}}`) adalah slot khusus subjek mempelai (manusia). Jangan pernah memasang fallback ke motif wallpaper background global (`url('{{globalBgUrl}}')`) di seksi `#home` atau di dalam bingkai foto adat.
- **Setiap Slot Memiliki Domain Mandiri:**
  - `HOME_PHOTO`: Murni foto pasangan kedua mempelai di seksi pembuka.
  - `GLOBAL_FIXED_BG`: Murni motif kain tenun, tekstur kertas, atau wallpaper kanvas yang diam di `.fixed-bg-layer`.
  Keduanya tidak boleh saling dioplos secara serampangan.

---

## ✨ 8. Filosofi Surface Elevation & Anti-Border Fatigue (Haute-Couture Standard)

Kesan mewah (*luxury*) lahir dari **kedalaman permukaan (surface elevation), pencahayaan halus, dan tipografi**, BUKAN dari garis kotak (*border*) yang dibungkuskan ke setiap elemen.

### A. Aturan Garis Tepi (Border Policy)
1. **Elemen Mikro & Widget Data (Countdown, Badge Tanggal, Pill):**
   - **HARAM** menggunakan `border: 1px solid var(--border-gold)` di sekeliling kotak.
   - Wajib menggunakan **Tonal Glassmorphism**:
     ```css
     background: color-mix(in srgb, var(--bg-dark) 55%, transparent);
     backdrop-filter: blur(10px);
     -webkit-backdrop-filter: blur(10px);
     border: 1px solid color-mix(in srgb, var(--accent) 15%, transparent); /* Micro-border translusen */
     border-radius: 12px;
     box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
     ```
2. **Kartu Konten Utama (Event, Rekening Gift, Form RSVP, Wishes):**
   - Gunakan permukaan tonal yang menyatu dengan latar belakang kanvas.
   - Jika membutuhkan pembeda visual, gunakan **garis aksen tunggal** (misal: garis emas halus di sisi atas kartu `border-top: 1px solid color-mix(in srgb, var(--accent) 40%, transparent)`), jangan membungkus keempat sisi dengan garis tebal.
3. **Bingkai Fisik Penuh (Border Eksklusif):**
   - HANYA diperuntukkan bagi ornamen arsitektur budaya autentik (seperti gerbang Walasuji) dan bingkai foto kedua mempelai.

---

## 🔤 9. Tipografi Fluid & Proteksi Teks Klien (Anti-Overflow Defense)

Untuk mencegah tampilan rusak saat klien memasukkan nama panjang, gelar akademik, atau data pendek:

1. **Fluid Typography pada Nama Pasangan (`.home-names`, `.cover-names`):**
   - Selalu gunakan `clamp()` agar ukuran font otomatis menyusut di layar kecil tanpa terpotong:
     ```css
     font-size: clamp(1.5rem, 5vw, 2.3rem);
     line-height: 1.25;
     word-break: normal;
     overflow-wrap: break-word;
     ```
2. **Flexbox Responsif untuk Nama & Ampersand:**
   - Gunakan `display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.5rem 0.8rem;`.
   - Simbol `&` (`.home-ampersand`) wajib berpadu harmonis dengan nama mempelai, bukan terisolasi di baris tersendiri.
3. **Proteksi Kontainer Kosong:**
   - Gunakan pseudo-class CSS `:empty { display: none !important; }` pada container deskripsi atau keterangan opsional agar tidak menyisakan ruang hampa jika klien mengosongkan form.

---

## 🏷️ 10. Kamus Standar Tunggal Penamaan Komponen (Canonical Ubiquitous Language)

Untuk menjaga konsistensi mutlak lintas tema, seluruh pengembang dan agen dilarang keras membuat variasi nama baru. Wajib mengikuti kamus resmi berikut:

| Komponen Fungsional | Enum Database (Prisma) | Tag Template HTML | ID / Class Selektor Standar | Trigger JavaScript |
| :--- | :--- | :--- | :--- | :--- |
| **Latar Belakang Global** | `GLOBAL_FIXED_BG` | `{{globalBgUrl}}` | `.fixed-bg-layer` | Injeksi otomatis backend |
| **Foto Pembuka (Home)** | `HOME_PHOTO` | `{{homePhotoUrl}}` / `{{homePhotoCssUrl}}` | `.home-arch-inner img` / `.slide-opening#home` | Murni foto mempelai (Anti-Cross Fallback) |
| **Nama Tamu di Cover** | *(Dinamis via `?to=`)* | *(Fallback "Tamu Undangan")* | `#coverGuestName` / `.cover-guest-val` | `resolveGuestName()` |
| **Tombol Musik Floating** | `BACKGROUND_MUSIC` | `{{musicPlayerHtml}}` | `#musicToggle` / `.audio-fab` (alias: `#musicFab`, `.music-fab`) | `luxToggleAudio()` |
| **Panggung Kiri Desktop** | `LANDING_COVER_DESKTOP` | `{{sidebarPhotoUrl}}` | `.sidebar-desktop` (alias: `.left-hero`) | Media Query Split ≥ 900px |
| **Panel Konten Undangan** | *(Container Utama)* | *(Struktur Layout)* | `.main-scroll-panel` (alias: `.right-panel`, `.page-wrap`) | Kunci lebar mobile 460px Desktop |
| **Sampul Pembuka (Cover)** | `COVER_PHOTO` | `{{landingCoverUrl}}` | `#coverOverlay` / `.cover-overlay` (alias: `#coverScreen`) | `openInvitation()` |



