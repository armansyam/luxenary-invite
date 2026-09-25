# 📋 RINGKASAN PEDOMAN SESI BARU (HANDOVER SINKRONISASI TEMA, MUSIK & AUDIT SISTEM)
> **Tanggal & Waktu:** 25 September 2026 | 02:58 WIB  
> **Tujuan Dokumen:** Menjadi sumber fakta tunggal (*Single Source of Truth*) saat memulai percakapan/sesi baru dengan AI Agent, sehingga agen baru langsung memahami apa yang sudah selesai, apa aturan arsitektur yang berlaku, dan apa langkah berikutnya tanpa asumsi atau pengulangan.

---

## 🏛️ 1. KEPUTUSAN ARSITEKTUR KUNCI (INVARIANTS)

1. **Palet Warna Tema Dikunci di Master File (Theme-Locked Palette):**
   - Warna tema (`:root { --primary, --secondary, --accent, --bg-light, --bg-dark }`) **dikunci secara permanen di file master HTML/CSS masing-masing tema**.
   - Pemilih palet warna dinamis (18 palet) telah **dihapus total** dari Studio Admin dan Dasbor Klien.
   - Theme Engine (`lib/themeEngine.ts`) **tidak lagi menyuntikkan** token warna dinamis ke template HTML.
   - Live synchronization listener `LUX_PALETTE_CHANGED` di `lib/renderTemplate.ts` telah dimatikan.
   - *Catatan Penting:* Palet dress code tamu tetap aktif dan tidak boleh diubah/dihapus.

2. **Arsitektur Musik Bawaan Tema (Theme Default Music Architecture):**
   - Kolom `defaultMusicUrl` (dipetakan ke kolom PostgreSQL `default_music_url`) telah resmi ditambahkan ke model `Theme` di `prisma/schema.prisma`.
   - Admin dapat memilih lagu resmi untuk tema melalui modal **Edit Tema** di Katalog Tema Admin (`app/(admin)/admin/page.tsx`) menggunakan `<select>` dropdown yang membaca daftar lagu dari **Pustaka Musik Sistem** (`systemMusics`).
   - **Pewarisan Cerdas (Smart Inheritance):** 
     - Saat klien membuat undangan baru via `POST /api/client/invitations/create`, lagu resmi tema otomatis terwariskan ke `invitation.musicUrl` dan `featureSettings.musicUrl`.
     - Saat klien mengganti tema pada draft lama (`isThemeChanged`), lagu otomatis diperbarui ke lagu tema yang baru.
     - Klien tetap memiliki hak untuk mengganti atau mematikan musik di Dasbor Klien.

3. **Restrukturisasi UI Katalog Tema Admin ([`app/(admin)/admin/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28admin%29/admin/page.tsx)):**
   - **Tombol Hapus Tema (Merah):** Dipindahkan ke dalam modal **Edit Tema** (dilengkapi konfirmasi `window.confirm`) demi keamanan dari salah klik.
   - **Tombol Toggle Aktif/Nonaktif:** Diposisikan di luar kartu tema (toolbar bawah kartu showroom) dengan indikator visual hijau/abu-abu dan *optimistic state update* (tanpa memicu reload 8-query berat `loadOverviewData()`).
   - **Badge Status Kiri Atas:** Dibuat murni visual (`pointer-events-none`) agar tidak menjadi tombol ganda.

4. **Standarisasi Tri-Kategori Tema:**
   - Standar 3 kategori resmi: `"minimalist"`, `"modern"`, dan `"traditional"`.
   - Istilah lama `"premium"` telah dimigrasikan sepenuhnya ke `"minimalist"`. Kalandra, Valente, Aurelia, dan Artisan berstatus kategori `minimalist`.
   - Flag `isPremium` (boolean) tetap digunakan murni untuk penentuan tier paket/aksesibilitas, bukan nama kategori visual.

5. **Eliminasi Total Blocking I/O (`fs.existsSync`):**
   - Lebih dari 90 pemanggilan `fs.existsSync` sinkron pemblokir server telah dibersihkan dari endpoint:
     - `/api/admin/themes`
     - `/api/admin/overview`
     - `/api/public/themes`
     - `/api/client/invitations/[id]` (penghapusan draft plate lama kini non-blocking via `await fs.unlink().catch()`).

---

## 🛠️ 2. DAFTAR BERKAS TERMODIFIKASI & FAKTA PERUBAHAN

| Berkas | Status & Fakta Perubahan |
|---|---|
| [`prisma/schema.prisma`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/prisma/schema.prisma) | Menambahkan `defaultMusicUrl String? @map("default_music_url")` pada model `Theme` dan default category `"minimalist"`. |
| [`lib/prisma.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/prisma.ts) | Menghapus hack `_runtimeDataModel` dan `isStale`; kembali ke kanonikal Next.js singleton. |
| [`app/(admin)/admin/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28admin%29/admin/page.tsx) | Tombol toggle di luar kartu, tombol hapus di dalam modal edit, dropdown musik dari pustaka, penghapusan 18 palet studio. |
| [`app/api/admin/themes/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/admin/themes/route.ts) | Dukungan `defaultMusicUrl` pada POST/PUT, penghapusan 90+ blocking `fs.existsSync`, cleanup `theme_demo_${id}` pada DELETE. |
| [`app/api/client/invitations/create/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/invitations/create/route.ts) | Pewarisan `defaultMusicUrl` tema ke undangan baru & penanganan ganti tema pada draft lama (`isThemeChanged`). |
| [`app/api/client/invitations/[id]/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/invitations/%5Bid%5D/route.ts) | Non-blocking draft plate unlink: `await fs.unlink(draftPath).catch(() => {})`. |
| [`app/api/public/themes/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/public/themes/route.ts) | Hapus blocking `fs.existsSync`, selaraskan series/isPremium kategori `minimalist`. |
| [`app/api/admin/overview/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/admin/overview/route.ts) | Hapus blocking `fs.existsSync` dan import yang tidak terpakai. |
| [`lib/themeEngine.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/themeEngine.ts) | Nonaktifkan injeksi token warna tema ke HTML, prioritaskan `theme.defaultMusicUrl` pada fallback audio player. |
| [`lib/renderTemplate.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/renderTemplate.ts) | Hapus listener `LUX_PALETTE_CHANGED` dari client scripts. |
| [`lib/demoRegistry.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/demoRegistry.ts) | Kategori & series diselaraskan ke `"minimalist"` untuk 4 tema utama. |
| [`app/portfolio/PortfolioGallery.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/portfolio/PortfolioGallery.tsx) | Union type bersih: `"minimalist" \| "traditional" \| "modern" \| string`. |
| [`lib/colorPalettes.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/colorPalettes.ts) | File palet dinamis usang dihapus permanen (0 caller / zero dead code). |
| [`themes/starter-blueprint.html`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/themes/starter-blueprint.html) & 6 Tema Master | Token `{{colorPrimary}}` dll. diganti dengan nilai hex CSS mandiri. |
| [`docs/SYSTEM_ARCHITECTURE.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/SYSTEM_ARCHITECTURE.md) | Sinkronisasi dokumen arsitektur: *Theme-Locked Palette*, *Minimalist Series*, & *Theme Default Music*. |
| [`docs/S-Invitation.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/docs/S-Invitation.md) | Sinkronisasi spesifikasi modul: eliminasi filter dan terminologi premium ke minimalist. |

---

## 🧪 3. STATUS VERIFIKASI EMPIRIS TERAKHIR

- **Kompilasi TypeScript:** `npx tsc --noEmit` menghasilkan **Exit Code: 0** (Kompilasi bersih 100%, 0 lint error).
- **Theme Matrix Stress Test (`scripts/test-theme-matrix.ts`):** **34 / 34 Tema Lolos 100% (Exit Code: 0)**. Seluruh tema terverifikasi memiliki token desain CSS `:root` mandiri.
- **PostgreSQL Database (`luxenary_dev`):**
  - Tabel `themes` memuat 34 tema: 6 Minimalist (`isPremium: true`), 13 Modern, 15 Traditional.
  - Query kategori asing (`category NOT IN ('minimalist', 'modern', 'traditional')`): **0 baris**.
  - Kolom `default_music_url` aktif dan terisi lagu tema terstandarisasi.
- **Blueprint Zero-Drift:** `diff -u public/downloads/starter-blueprint.html themes/starter-blueprint.html` menghasilkan **0 diff** (identik 1:1, bebas dari token dinamis `{{colorPrimary}}`).
- **Pembersihan Residual Kategori & Palet:**
  - `prisma/seed.ts` & `prisma/defaultSettings.ts`: 100% migrasi ke kategori `minimalist` & series `Minimalist` (anti-rollback).
  - `scripts/sync-themes.ts`: Subfolder `themes/minimalist` terdaftar dan aktif.
  - `lib/themeDefaults.ts` & `lib/renderTemplate.ts`: Union `premium` & dead code `themes/premium` dibersihkan.
  - `app/how-it-works/HowItWorksInteractive.tsx`: Simulasi palet lama digantikan dengan banner ciri khas desain tema dan 3 kategori resmi.
  - `app/landing.css`: Kelas mati `.studio-palette-row`, `.palette-chip`, `.phone-palette-pill` dibasmi.
  - 3 Dokumen Master (`SYSTEM_ARCHITECTURE.md`, `README.md`, `S-Invitation.md`): 100% sinkron.

---

## 🚀 4. REKOMENDASI LANGKAH FINAL

1. **Restart Dev Server:** Restart `next dev` agar instance Node.js memuat schema dan model singleton secara segar.
2. **Git Commit:** Jalankan commit perubahan dengan pesan terstruktur:
   `feat(themes): finalize theme-locked palette, complete minimalist category migration, and full cross-layer purification`
