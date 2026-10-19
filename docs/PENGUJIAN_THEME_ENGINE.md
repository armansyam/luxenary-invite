# Daftar Pengujian Theme Engine (20 Okt 2026)

Cakupan: master tema (`themes/`), pemilihan tema oleh klien, tab Edit Undangan (Studio), live edit di pratinjau, dan HTML terbit.
Status: **[ADA]** sudah dijaga tes otomatis · **[BELUM]** belum ada tes · **[BUG]** temuan terbukti dari kode, belum diperbaiki.

## A. Master tema dan registry
1. [ADA] Setiap tema di `THEME_MAP` punya berkas master dan placeholder yang dikenal (`themePlaceholders.test.ts`, `renderTemplate.test.ts`).
2. [ADA] Skrip inline semua tema lolos parse sintaks (`inlineScriptSyntax.test.ts`).
3. [ADA] Isian klien di-escape di semua tema (`xssRender.test.ts`, `themeWishEscape.test.ts`).
4. [BELUM] Baris `themes` di DB (id, eventType, kategori, isActive) cocok 1:1 dengan `THEME_MAP` dan berkas di disk; tema `isActive=false` tidak muncul di pilihan klien dan tidak dapat dipilih lewat PUT undangan.
5. [BUG] Admin mengubah master (PUT `/api/admin/themes`, sync tema) hanya membersihkan cache memori. Undangan yang pernah dirender membaca salinan `data/drafts/<id>.html`, jadi perbaikan master tidak pernah sampai ke undangan itu sampai kliennya berganti tema. Salinan ini tidak berisi kustomisasi apa pun, karena kustomisasi ada di DB (`lib/renderTemplate.ts:1348-1428`). Uji: render undangan, ubah master, render ulang, lalu harapkan isi master baru.

## B. Pemilihan dan pergantian tema
6. [ADA] Gaya kartu pilihan tema (`themeSelectionStyle.test.ts`).
7. [BELUM] Ganti tema dari Studio menghapus draft lama dan HTML terbit dibangun dengan master tema baru, sementara label, acara, media, dan rekening tetap terbawa.
8. [BELUM] Tema untuk jenis acara lain ditolak (undangan WISUDA tidak dapat memakai tema pernikahan) di API, bukan hanya disembunyikan di UI.
9. [BELUM] Musik bawaan tema (`defaultMusicUrl`) dipakai hanya bila klien belum memilih musik.

## C. Label kustom (tab Edit Undangan)
10. [ADA] Fitur per paket muncul di tema (`themeFeatureCoverage.test.ts`).
11. [BELUM] Untuk setiap tema dan setiap dari 34 kunci `updateCustomLabel` di Studio: isi nilai unik, render, lalu harapkan nilai muncul di HTML terbit. Pemindaian atribut `data-lux-field` (indikasi, belum uji render) menunjukkan kunci yang tidak ditemukan di master: `wishesEyebrow` 29/33 tema pernikahan; `cdDays/cdHours/cdMins/cdSecs` dan `eventsEyebrow` 17/33; `rsvpCountLabel/rsvpMessageLabel` 10/33; `rsvpNameLabel/rsvpStatusLabel` 5/33. Sebagian mungkin terkirim lewat placeholder, jadi uji render yang memutuskan.
12. [BUG] 6 tema non-pernikahan (al-khalid, kalandra-birthday, festivo, sinergi, al-fariz, cendekia) tidak punya satu pun `data-lux-field="customLabels.*"`. Renderer hanya memakai `galleryTitle` dan `giftTitle` untuk acara non-pernikahan, sedangkan `buildUniversalRsvpSection` dan `buildUniversalWishesSection` tidak menerima label. Label RSVP, ucapan, acara, dan cover yang diisi klien tidak berpengaruh. Perlu dicek juga apakah Studio menyembunyikan isian itu untuk acara non-pernikahan.
13. [BELUM] Label dikosongkan (`""`) menyembunyikan teks; label `undefined` memakai teks bawaan master; ikon SVG di dalam elemen label tetap ada.
14. [BELUM] Label dengan HTML (`<b>`, `"`, `</span>`) tampil sebagai teks, tidak memecah markup.

## D. Live edit di pratinjau
15. [BUG] Tagline yang diedit langsung di pratinjau (`weddingTagline`, dari `fallbackMappings`) jatuh ke cabang `else` di `page.tsx:837` dan tersimpan sebagai `invitation.weddingTagline` di level atas. Studio dan renderer membaca `featureSettings.weddingTagline`, jadi editannya hilang setelah disimpan.
16. [BUG] Tombol Simpan di dock pratinjau langsung menampilkan "Semua perubahan tersimpan" setelah `postMessage`, tanpa menunggu hasil `saveSection()` (`renderTemplate.ts:742-773`). `saveSection` juga keluar diam-diam bila sedang menyimpan (`page.tsx:614`). Bila PUT gagal atau terlewat, klien tetap melihat "tersimpan".
17. [BELUM] Edit di pratinjau mobile tercermin di pratinjau desktop dan di isian Studio (relay `LUX_REMOTE_EDIT_CHANGE`), dan sebaliknya.
18. [BELUM] Kunci yang dipetakan `fallbackMappings` (mis. `customLabels.coupleTitle` lewat selector `#couple .sec-main-title`) benar-benar dirender ulang dari nilai tersimpan. Penyisipan server hanya menyentuh elemen yang punya atribut `data-lux-field` di master, jadi elemen yang atributnya ditambahkan JavaScript saat edit bisa kembali ke teks bawaan setelah terbit.
19. [ADA] Pesan dari jendela lain ditolak (cek `origin` dan sumber iframe di `page.tsx:774-775`).

## E. Terbit dan salinan
20. [ADA] HTML terbit dibangun ulang saat deploy (`settingsPublish.test.ts`), dan subdomain dilepas akan membangun ulang tautan (`auditFixes20261014.test.ts`).
21. [ADA] Salinan portofolio tanpa RSVP asli dan tanpa ID undangan asli (`auditFixes20261020.test.ts`, `portfolioHtml.test.ts`).
22. [BELUM] Perubahan label setelah terbit langsung tampil di URL publik (cache `publishedHtmlCache` dan Cloudflare dibersihkan).
