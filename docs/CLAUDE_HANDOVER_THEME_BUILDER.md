# 📋 DOKUMEN SERAH TERIMA & LAPORAN EKSEKUSI TEKNIS (HANDOVER REPORT)
**Topik:** Audit Komprehensif Sistem, Investigasi Akar Masalah Theme Builder vs Master Handcrafted, & Eksekusi Perbaikan Selesai  
**Tanggal:** 9 November 2026 (diperbarui 10 November 2026: bagian 2F–2H, alat desain bebas builder dan Varian Tema)  
**Status Eksekusi:** SELESAI & TERVERIFIKASI EMPIRIS (`npx tsc --noEmit` Exit 0, Vitest 50 Files / 622 Tests Passed)  
**Dokumen Master Terkait:** `docs/SYSTEM_ARCHITECTURE.md`, `README.md`, `docs/S-Invitation.md`  

---

## 📌 1. Ringkasan Masalah & Fakta Investigasi (Root Cause Analysis)

### Fenomena yang Terjadi
Saat membuka tema master bawaan fisik (*handcrafted*, seperti **Valente** di `themes/wedding/minimalist/valente.html`) di Theme Builder (`/admin/theme-builder?id=valente`), tampilan aslinya seketika berubah total, tata letak majalahnya lenyap, dan muncul lingkaran **Monogram "R & A"** di cover.

### Fakta Kode & Akar Masalah
1. **Hakikat `starter-blueprint.html`:**
   Sesuai namanya, `starter-blueprint.html` adalah blank canvas untuk merakit **tema baru**. File ini bukan parser AST/HTML yang mampu membongkar ulang kode khusus tema buatan tangan.
2. **Celah Commit `aaa5ebd6` (*In-Place Legacy Editing*):**
   Pada commit `aaa5ebd6`, pengaman pada `app/api/admin/theme-builder/route.ts` yang menolak tema handcrafted dicopot. Akibatnya: begitu tema lama dibuka, backend membuang seluruh HTML aslinya, lalu merender `themes/_blueprints/wedding/starter-blueprint.html` dengan warna hasil tebakan. Jika tombol "Simpan" ditekan, file asli di disk langsung ditimpa (*overwritten*) oleh hasil kompilasi blueprint!
3. **Asal Usul Lingkaran Monogram "R & A":**
   Dari 54 berkas tema fisik di `themes/`, tema master tulisan tangan seperti Valente **sama sekali tidak memiliki monogram di cover**. Lingkaran monogram "R & A" muncul murni karena di dalam `themes/_blueprints/wedding/starter-blueprint.html#L1399` terdapat elemen default:
   `<div class="cover-monogram serif" data-lux-block="cover-monogram">{{coupleMonogram}}</div>`.
   Ketika fungsi `seedSpecFromMaster` membaca tema lama, fungsi tersebut tidak mengecek keberadaan monogram, sehingga monogram blueprint selalu aktif secara paksa.

---

## 🛠️ 2. Rincian Solusi & Pekerjaan yang Telah Dikerjakan (Executed Actions)

### A. Proteksi Mutlak Tema Master Bawaan (Anti-Overwrite Protection)
1. **`app/api/admin/theme-builder/route.ts`:**
   - **`GET ?id=<id>`**: Ditambahkan proteksi ketat. Jika tema yang diminta memiliki `theme.builderSpec === null` (tema handcrafted), request langsung ditolak dengan status **HTTP 409 Conflict**:
     ```json
     {
       "error": "Tema \"...\" adalah tema master bawaan (handcrafted) dan tidak menggunakan sistem builder. Gunakan opsi Clone to Builder untuk membuat tema builder baru dari tema ini.",
       "code": "HANDCRAFTED"
     }
     ```
   - **`PUT`**: Pengaman dipertahankan agar tidak ada permintaan API yang dapat menimpa berkas tema fisik yang bukan bertipe builder.
2. **`app/(admin)/admin/page.tsx`:**
   - Tombol aksi pada kartu tema tabel admin kini dinamis:
     - Jika `theme.builderSpec != null`: Menampilkan tombol **Edit** (`href="/admin/theme-builder?id=${theme.id}"`; bernama "Builder" sebelum 10 Nov 2026).
     - Jika `theme.builderSpec == null`: Menampilkan tombol **Buat Varian** dan **Salin ke Builder** (`href="/admin/theme-builder?from=${theme.id}"`; bernama "Clone to Builder" sebelum 10 Nov 2026).
3. **`app/(admin)/admin/theme-builder/page.tsx` & `components/admin/themeBuilder/ThemeBuilder.tsx`:**
   - `page.tsx` kini membaca parameter query `from = useSearchParams().get("from")` dan menyalurkannya ke `<ThemeBuilder themeId={id} fromId={from} />`.
   - `ThemeBuilder.tsx` menangani `fromId`: jika dibuka tanpa `themeId` tapi memiliki `fromId`, sistem memanggil endpoint `GET /api/admin/theme-builder?from=<id>` untuk menyalin palet, font, dan tekstur tema lama sebagai draf tema builder baru tanpa menyentuh file master aslinya.
4. **`__tests__/integration/themeBuilder.test.ts`:**
   - Test disesuaikan: memverifikasi bahwa `GET ?id=kalandra` menolak dengan HTTP 409, dan `GET ?from=kalandra` berhasil mengembalikan HTTP 200.

### B. Deteksi Monogram Otomatis (`lib/themeBuilder/legacySeed.ts`)
- Fungsi `seedSpecFromMaster` kini memindai isi HTML sumber:
  ```ts
  const hasMonogram =
    html.includes('data-lux-block="cover-monogram"') ||
    html.includes("cover-monogram-circle") ||
    /\bcover-monogram\b/.test(html) ||
    /\{\{coupleMonogram\}\}/.test(html) ||
    /\{\{monogramInitial\}\}/.test(html);
  if (!hasMonogram) {
    blocks["cover-monogram"] = { x: 0, y: 0, scale: 1, rotate: 0, hidden: true };
  }
  ```
- Jika tema tidak menggunakan monogram, blok `cover-monogram` otomatis diset `hidden: true`, sehingga saat dikompilasi akan menghasilkan rule CSS `display: none;` dan tidak memunculkan monogram dummy.

### C. 5 Properti Editorial Blok & Panel Inspektor
Untuk meningkatkan fleksibilitas tata letak mendekati kualitas tema editorial/majalah:
1. **`lib/themeBuilder/spec.ts`:**
   - Ditambahkan tipe `EDITORIAL_PHOTO_FILTERS` (`none`, `grayscale`, `sepia`, `warm`, `dramatic`) dan map CSS `PHOTO_FILTER_CSS`.
   - Diperluas interface `BlockProps`:
     - `opacity?: number;` (0.1–1.0)
     - `align?: "left" | "center" | "right";`
     - `tracking?: number;` (0–12px)
     - `filter?: EditorialPhotoFilter;`
     - `maxWidth?: number;` (180–600px)
   - Diperbarui `isDefaultBlock(p)`, `blockStyle(p)`, dan fungsi validasi `parseBuilderSpec` (clamping ketat).
2. **`lib/themeBuilder/compile.ts`:**
   - Filter visual foto diterapkan secara terisolasi pada selektor `[data-lux-block="..."] img`, sehingga elemen ornamen bingkai di `::after` (seperti bingkai adat emas) tidak ikut terfilter atau pudar.
3. **`components/admin/themeBuilder/BuilderPreview.tsx`:**
   - Sinkronisasi DOM langsung di iframe pratinjau diperbarui untuk menerapkan `opacity`, `align`, `tracking`, `maxWidth`, dan `filter` secara instan (*live*) saat admin menggeser slider tanpa harus memicu full server re-render.
4. **`components/admin/themeBuilder/BlockInspector.tsx`:**
   - Menambahkan slider Opasitas (10%–100%).
   - Menambahkan tombol pilihan Perataan Teks (Kiri, Tengah, Kanan).
   - Menambahkan slider Letter-Spacing / Tracking (0–12px).
   - Menambahkan slider Lebar Maksimal (180–600px).
   - Menambahkan selector Filter Foto Editorial (untuk blok di `FRAMED_PHOTOS`).
   - Menambahkan selector varian Model Kisah Cinta (`timeline` | `cards` | `minimal`) saat `blockId === "story-list"`.

### D. Theme Builder Unlimited 3.0 (10 Alat Kustomisasi Baru — 9 Nov 2026)
1. **Sistem Navigasi (`spec.variants.nav`):**
   - `dock` (Bilah bawah melayang), `drawer` (Tombol kapsul melayang `button.lux-drawer-toggle` "Menu" di kanan atas yang membuka/menutup panel laci bernomor `.drawer-open` saat diklik dan otomatis menutup saat item menu dipilih), `none` (Tanpa menu navigasi).
2. **Gaya Wadah Tamu Sampul (`spec.variants.guestCard`):**
   - `box` (Kotak kaca), `pill` (Kapsul membulat kompak), `underline` (Garis bawah editorial tanpa kotak), `hidden` (Sembunyikan kartu tamu di sampul).
   - Juga tersedia langsung di `BlockInspector` dan menu klik-kanan (`BuilderPreview`) saat memilih blok `cover-guest`.
3. **Format Tanggal Sampul (`spec.variants.coverDate`):**
   - `inline` (Satu baris standar) dan `split` (Blok editorial berbingkai garis atas-bawah dengan pemecahan segmen `{{weddingDateDay}} / {{weddingDateMonth}} • {{weddingDateYear}}` otomatis pada tema pernikahan dan fallback `{{weddingDate}}` yang lolos audit).
   - Juga tersedia langsung di `BlockInspector` dan menu klik-kanan (`BuilderPreview`) saat memilih blok `cover-date`.
4. **Mikro-Tipografi Per-Blok (`BlockProps`):**
   - `font`: Mendukung peran huruf (`"heading" | "body" | "script"` -> `var(--font-...)`) **maupun font spesifik katalog/Google Font** (`FONT_OPTIONS` lokal atau `"g:<Family>"` Google Fonts) melalui `blockFontFamilyCss(font)`. Font Google yang dipakai di blok individual juga ikut diunduh dan di-link otomatis oleh `googleFontIds(spec.fonts, spec.blocks)`.
   - `transform`: `"none" | "uppercase" | "capitalize" | "lowercase"` (`text-transform: ... !important`).
   - `italic`: `boolean` (`font-style: italic !important`).
   - `weight`: `300 | 400 | 600 | 700` (`font-weight: ... !important`).
   - `color`: `"primary" | "secondary" | "accent" | "textMain" | "textMuted" | "textLight" | "onPrimary"` (murni token CSS dinamis `var(--...)` tanpa hex statis).
   - Seluruh 5 properti mikro-tipografi langsung tersinkronisasi secara *live* di DOM iframe `BuilderPreview.tsx` tanpa menunggu server re-render.
5. **Varian Mempelai Editorial (`spec.variants.couple = "editorial"`):**
   - Tata letak majalah zig-zag di mana kartu mempelai pertama dan kedua bersilang kiri-kanan antara foto dan teks.
6. **Gaya Garis Pemisah (`spec.variants.dividers`):**
   - `line` (Garis tipis & berlian), `none` (Tanpa garis), `ornate` (Ornamen berlian ganda), `gradient` (Pudar cahaya halus).
7. **Opasitas Tekstur Latar (`spec.textureOpacity`):**
   - Slider 10%–100% di panel Warna & Latar (`ColorsPanel`), dikompilasi ke `.fixed-bg-layer:not(.has-custom-bg) { opacity: ... }` agar tidak meredupkan foto latar unggahan klien.
8. **Deteksi Varian Warisan Otomatis (`legacyVariants` di `lib/themeBuilder/legacySeed.ts`):**
   - Saat mengkloning tema master bawaan (`?from=<id>`), `legacyVariants` kini juga mendeteksi `coverDate: "split"`, `guestCard: "pill" | "underline"` (dengan boundary regex `(?<![-\w])(?:cover-guest-box|cover-guest-card|guest-box|guest-card)(?![-\w])` agar tidak tertipu `.pass-guest-box`), `dividers: "none" | "ornate" | "gradient"`, `buttons: "outline" | "glass" | "minimal"`, serta `cards: "glass" | "outlined"`.
9. **5 Peralatan Studio Tambahan (Next-Level Studio Tools — 9 Nov 2026):**
   - **Cermin Vertikal Ornamen (`BuilderOrnament.flipY`):** Ornamen gambar kini dapat dicerminkan atas-bawah (`scaleY(-1)`) selain kiri-kanan (`scaleX(-1)`) melalui `OrnamentInspector.tsx` dan menu klik-kanan `BuilderPreview.tsx`, sehingga 1 aset ornamen sudut dapat dipakai untuk ke-4 sudut seksi.
   - **Tinggi Baris Per-Blok (`BlockProps.lineHeight`, `0.85`–`2.2`):** Slider `lineHeight` di `BlockInspector.tsx` dengan sinkronisasi live DOM di `BuilderPreview.tsx` dan kompilasi `line-height: ... !important;`.
   - **Varian Gaya Tombol Global (`spec.variants.buttons`: `"solid" | "outline" | "glass" | "minimal"`):** Mengatur gaya seluruh tombol utama undangan (`.cover-btn-open`, `.btn-cal`, `.btn-submit-rsvp`, `.btn-map-outline`, `.btn-outline-box`, `.btn-copy`) menggunakan token CSS dinamis; tersedia di `LayoutPanel` (`VariantThumb`), `BlockInspector` (`cover-open-btn`, `countdown-btn`), dan menu klik-kanan.
   - **Varian Permukaan Kartu Global (`spec.variants.cards`: `"solid" | "glass" | "outlined" | "flat"`):** Mengatur permukaan seluruh kartu undangan (`.opening-quote-card`, `.rsvp-form-box`, `.wish-item`, `.event-block-item`, `.event-unified-venue-card`, `.bank-card`, `.story-chapter-block`) menggunakan token CSS dinamis; tersedia di `LayoutPanel` (`VariantThumb`), `BlockInspector` (`opening-quote`, `rsvp-form`), dan menu klik-kanan.
   - **Salin / Tempel Gaya Blok & Samakan ke Semua Serupa (`peerBlocksForRole`):** Toolbar di `BlockInspector.tsx` dan `ThemeBuilder.tsx` untuk menyalin gaya visual/tipografi dari satu blok ke blok lain atau menerapkannya sekaligus dalam 1 klik ke seluruh blok sejenis (`Semua Judul Seksi`, `Semua Teks Kecil (Eyebrow)`, `Semua Kalimat Pengantar (Sub)`, `Semua Nama Utama`, `Kedua Nama Mempelai`, `Kedua Label Mempelai`, `Kedua Orang Tua Mempelai`).
10. **4 Peralatan Kelengkapan Studio Akhir (Final Studio Completeness Tools — 9 Nov 2026):**
   - **Otomasi Ornamen Sudut & Lintas-Seksi (`fillFourCornersOrnament`, `copyOrnamentToSections`, `copySectionOrnamentsToAllFlow`):**
     - Tombol **"Pasang ke 4 Sudut Seksi"** di `OrnamentInspector.tsx` dan menu klik-kanan `BuilderPreview.tsx` untuk menggandakan ornamen sudut secara simetris ke 4 sudut seksi (`Kiri-Atas`, `Kanan-Atas`, `Kiri-Bawah`, `Kanan-Bawah`) dengan `flipX` / `flipY` dan `anchor: "top" | "bottom"` otomatis dalam 1 klik.
     - Dropdown **"Salin ke seksi lain…"** di `OrnamentInspector.tsx` (ke seksi tertentu atau ke seluruh seksi isi Home s/d RSVP) dan tombol **"Salin Ornamen Seksi Ini ke Semua Seksi Isi"** di `OrnamentsPanel`.
   - **Kepekatan Lapisan Gelap Foto / Scrim (`spec.scrimOpacity`, `10`–`90`%, bawaan `55`%):** Slider di `ColorsPanel` (`BuilderPanels.tsx`) yang mengatur kegelapan lapisan gradasi di atas foto Sampul (`.cover-overlay`), Panel Kiri Desktop (`.sidebar-desktop::after`), dan Penutup (`.closing-sec.has-closing-photo::before`) menggunakan `color-mix(in srgb, var(--overlay) ...%, transparent)`, sekaligus menghapus duplikasi slider `Opasitas tekstur` di bawah `Media bawaan`.
   - **Varian Kerapatan Vertikal Antar-Seksi (`spec.variants.spacing`: `"normal" | "compact" | "airy"`):** Mengatur ruang napas vertikal (`padding-top`/`padding-bottom` pada `.sec-flow` serta margin `.sec-sub` dan `.sec-divider`) antara mode Standar, Rapat (`compact`), dan Lega Editorial (`airy`).
   - **Kontrol Sudut Kartu & Tombol (`spec.radius`: `"sharp" | "soft" | "round"`) di Panel Tata Letak:** Ditampilkan juga di `LayoutPanel` tepat di atas varian tombol dan kartu agar admin tidak perlu berpindah tab saat merancang bentuk kartu dan tombol.

### E. Temuan Audit Menyeluruh atas Perubahan AI Sebelumnya & Perbaikannya (9 Nov 2026)
1. **Bug 1 — Dropdown `"Edit tema yang ada…"` di `ThemeBuilder.tsx` Menabrak Guard HTTP 409:**
   - **Akar Masalah:** Setelah `GET /api/admin/theme-builder?id=<handcrafted>` dikunci dengan HTTP 409, dropdown `<select>` di bilah atas `ThemeBuilder.tsx` masih menggunakan `legacyThemes` (daftar tema master handcrafted) dan mengarahkan ke `/admin/theme-builder?id=${e.target.value}` yang langsung gagal 409.
   - **Perbaikan:** Mengubah navigasi dropdown menjadi `/admin/theme-builder?from=${encodeURIComponent(e.target.value)}` ("Salin dari tema bawaan…") dan menambahkan tombol langsung **"Clone to Builder"** pada layar error `loadError` bila admin mengakses URL `?id=<handcrafted>` secara manual.
2. **Bug 2 — Polusi `blocks["cover-monogram"]` pada Tema Satu Nama di `legacySeed.ts`:**
   - **Akar Masalah:** `seedSpecFromMaster` menyetel `blocks["cover-monogram"] = { ..., hidden: true }` tanpa memeriksa keluarga acara, padahal pada acara satu nama (`BIRTHDAY`, `KHITAN`, `AQIQAH`, `WISUDA`, `GATHERING`) `cover-monogram` termasuk `SINGLE_ABSENT_BLOCKS`.
   - **Perbaikan:** Membatasi injeksi `blocks["cover-monogram"]` hanya ketika `builderFamilyOf(eventType) === "wedding"`.
3. **Bug 3 — Varian `gallery`, `events`, dan `gift` Tidak Terhubung pada Tema Satu Nama di `lib/themeEngine.ts`:**
   - **Akar Masalah:** Kelima composer satu nama (`composeBirthdayData`, `composeKhitanData`, `composeAqiqahData`, `composeWisudaData`, `composeGatheringData`) tidak mengambil kolom `builderSpec` dari `prisma.theme.findUnique` dan fungsi `buildUniversalEventCards` / `buildUniversalGallerySection` / `buildUniversalGiftSection` belum memiliki class hook (`.event-block-item`, `.moments-carousel-wrap`, `.bank-card`) yang ditargetkan `VARIANT_CSS`.
   - **Perbaikan:** Menyertakan `builderSpec` pada query `prisma.theme.findUnique` di kelima composer satu nama serta menyelaraskan class struktur HTML di `buildUniversalEventCards`, `buildUniversalGallerySection`, dan `buildUniversalGiftSection`.
4. **Bug 4 — Label Bawaan `groomRole` & `brideRole` Tidak Tampil di Pratinjau Builder (`lib/themeEngine.ts`):**
   - **Akar Masalah:** Commit sebelumnya menambahkan `groomRole` dan `brideRole` ke `BUILDER_TEXTS` (`kind: "engine"`), tetapi di `composeWeddingData` (`lib/themeEngine.ts`) nilai `firstRoleLabel`, `secondRoleLabel`, `groomRole`, dan `brideRole` masih di-hardcode `"Mempelai Pria"` / `"Mempelai Wanita"` tanpa membaca `customLabels.groomRole` dan `customLabels.brideRole`. Akibatnya test integrasi `builderTextsLayers.test.ts` gagal saat dijalankan terhadap database `luxenary_test`.
   - **Perbaikan:** Menyalurkan `(customLabels as any).groomRole` dan `(customLabels as any).brideRole` ke `groomRoleLabel`, `brideRoleLabel`, `firstRoleLabel`, dan `secondRoleLabel` di `composeWeddingData`.
5. **Bug 5 — ID Varian Tidak Sah (`"cinematic"` & `"side-by-side"`) di `BlockInspector.tsx` & `BuilderPreview.tsx`:**
   - **Akar Masalah:** Sesi AI sebelumnya menulis `{ opening: "cinematic" }` untuk tombol `"Bingkai Normal"` pada `opening-photo` dan `{ couple: "side-by-side" }` untuk tombol `"2 Kolom"` pada `couple-photo-1`/`2`, padahal ID sah di `VARIANT_GROUPS` (`lib/themeBuilder/spec.ts`) adalah `"classic"` dan `"side"`. Mengklik tombol tersebut menyebabkan `parseBuilderSpec` menolak request.
   - **Perbaikan:** Menyelaraskan seluruh opsi di `BlockInspector.tsx` dan menu klik-kanan `BuilderPreview.tsx` ke ID kanonis `VARIANT_GROUPS` (`opening`: `classic` / `arch` / `circle` / `backdrop`; `couple`: `stacked` / `side` / `arch` / `portrait` / `polaroid` / `editorial` / `backdrop`).

---

### F. Alat Desain Bebas Theme Builder (10 Nov 2026 — commit `fed3f165`, `373b0e23`, `b686401f`)
Rincian lengkap: `docs/SYSTEM_ARCHITECTURE.md` bagian 8.1 butir 14–16.
1. **Latar per seksi (`spec.sectionStyles`)**: warna token, gradasi, gambar, dan nada terang/gelap per seksi; nada mengatur ulang variabel `--lux-*` agar eyebrow dan judul tetap terbaca.
2. **Warna tambahan (`spec.paletteExtra`)** dan **permukaan kartu/tombol bebas (`spec.surfaces`)** dengan nilai dari token palet.
3. **Seksi bebas (`spec.freeSections`)**: teks, foto, kartu, kutipan, galeri mini (`luxGalleryPhotoN`), tombol peta (`luxPrimaryMapUrl`), dan animasi sendiri. Teksnya dapat diisi klien di Studio ("Teks Seksi Tambahan Tema", `freeSectionTextsOf`, `GET /api/public/themes` mengirim `freeTexts`).
4. **Struktur**: `countdownPlacement` (hitung mundur di dalam seksi Acara), `sectionNesting` (seksi menumpang di seksi lain, `NESTABLE_GUESTS`/`NESTING_HOSTS`), `desktopLayout`, `sectionAnimations`/`animationSpeed`, dan preset animasi tambahan (`drop`, `grow`, `flip`, `swing`, `slide-right`).
5. **CSS kustom (`spec.customCss`)** divalidasi `customCssError` (maks. 8000 karakter; ditolak bila memuat `<`, `{{`, `@import`, `url(`, sintaks skrip lama, warna hex/rgb/hsl, atau kurung kurawal tidak seimbang).
6. **Pratinjau desain langsung**: `lib/themeBuilder/designCss.ts` (murni) menghasilkan `<style id="lux-builder-design">` yang ditulis langsung ke iframe; `structuralKey` di `ThemeBuilder.tsx` mengecualikan kolom yang hanya CSS sehingga perubahan tersebut tidak memicu render ulang server.
7. **5 template awal (`lib/themeBuilder/templates.ts`, `applyBuilderTemplate`)**.
8. **Clone to Builder lebih dekat ke master**: `legacyStructure` membaca hitung mundur di seksi Acara, judul kapital, kanvas gelap dari luminans latar `body`, dan `paletteExtra` dengan cek kontras.
9. `compile.ts` mencari batas `<section>` dengan `sectionRange` (seimbang, aman untuk seksi bersarang).

### G. Varian Tema atas Master Tulisan Tangan (10 Nov 2026 — commit `709a4c5e`, `88b73a78`, dan alat bantu editor)
Jawaban atas "master lama tidak bisa diedit di builder": master tulisan tangan tetap tidak dibuka di builder (lihat bagian 1), tetapi warna dan hurufnya kini bisa diganti lewat **Varian Tema**. Rincian: `docs/SYSTEM_ARCHITECTURE.md` bagian 8.1 butir 17–19.
1. **Fase 0 — tokenisasi**: seluruh 54 master memakai variabel `:root` (`--lux-c-<hex>`, `--lux-font-*`) lewat `lib/themeTokenize.ts` dan `scripts/tokenize-masters.ts` (idempoten). Master baru wajib mengikuti `docs/PANDUAN_PEMBUATAN_TEMA_BARU.md` bagian 4A.
2. **Fase 1–3**: varian = baris `Theme` dengan `parentTheme` + `masterOverrides` (JSON), tanpa berkas master sendiri. `renderTemplateFile` memakai master induk dan menyisipkan `<style id="lux-master-overrides">` sebelum piring undangan dibekukan; data demo, teks, dan musik dari induk. Editor `/admin/theme-variants`, rute `/api/admin/theme-variants`, tombol **Buat Varian** (master) / **Edit** (varian) di katalog.
3. **Alat bantu editor**: label pemakaian warna (`masterColorUsage`), warna tak terpakai disembunyikan, **Warnai ulang dengan palet** (`recolorWithPalette`, terang-gelap dipertahankan), cek keterbacaan dari pratinjau (`components/admin/variantReadability.ts`, hanya teks yang menjadi di bawah WCAG AA akibat varian).
4. **Pembanding tampilan**: `scripts/verify-master-visual.ts` (`npm run test:master-visual`), wajib dijalankan setiap mengubah CSS master yang seharusnya tidak mengubah tampilan.
5. **Batas yang diketahui**: ornamen berupa gambar, warna di dalam `<script>`, dan atribut SVG `fill`/`stroke` tidak ikut berganti warna. Klien belum bisa memilih varian warna sendiri di Studio; varian dipilih sebagai tema terpisah di katalog.

### H. Layar Kecil (10 Nov 2026)
- Theme Builder bisa dibuka mulai lebar 1024 px (sebelumnya 1100): panel kiri/kanan 300/260 px dan header dua baris di bawah 1280 px; di atas 1280 px tetap 340/290 px dan satu baris.
- Editor varian tersusun bertumpuk di bawah 768 px.

## 📊 3. Bukti Verifikasi Empiris (Empirical Verification Proof)

1. **TypeScript Static Typecheck (`npx tsc --noEmit`):**
   - **Status:** Exit Code 0 (Clean, 0 errors).
2. **Suite Pengujian Unit & Integrasi dengan Database Uji Aktif (`luxenary_test`):**
   - **`__tests__/unit/builderAttach.test.ts`:** 30 passed (100%).
   - **`__tests__/unit/builderLayout.test.ts`:** 18 passed (100%).
   - **`__tests__/unit/googleFonts.test.ts`:** 12 passed (100%).
   - **`__tests__/integration/themeBuilder.test.ts`:** 42 passed (100% — termasuk seluruh tes DB rute admin, drawer toggle, split date, dan font spesifik per blok).
   - **`__tests__/integration/builderTextsLayers.test.ts`:** 9 passed (100%).
   - **`__tests__/integration/builderHardening.test.ts`:** 6 passed (100%).
   - **`__tests__/integration/builderSingleName.test.ts`:** 10 passed (100%).
   - **`__tests__/integration/builderSingleNameFlow.test.ts`:** 4 passed (100%).
   - **`__tests__/integration/builderThemeClientFlow.test.ts`:** 4 passed (100%).
   - **Total Suite Builder (9 Test Files):** **135 tests passed, 0 failed, 0 skipped**.

---

## 📚 4. Sinkronisasi Dokumen Master
Ketiga dokumen master arsitektur telah diperbarui secara sinkron (9 Nov 2026):
1. `docs/SYSTEM_ARCHITECTURE.md` (Bagian 8.1 Butir 10, 11, 12, 13).
2. `README.md` (Catatan Perubahan Theme Builder Unlimited 3.0 & Audit 9 Nov 2026).
3. `docs/S-Invitation.md` (Spesifikasi Theme Builder Butir 58 & 59).

Pembaruan 10 Nov 2026: `docs/SYSTEM_ARCHITECTURE.md` bagian 8.1 butir 14–19, `docs/S-Invitation.md` butir 60–65, `README.md` (catatan Tokenisasi, Varian Tema, dan alat bantu editor), `docs/PANDUAN_PEMBUATAN_TEMA_BARU.md` bagian 4A, `docs/admin/MANAJEMEN_TEMA_ADMIN.md`.

