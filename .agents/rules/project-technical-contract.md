---
trigger: always_on
---

# Luxenary-Invite: Kontrak Teknikal Proyek

## Stack Teknologi
- **Framework:** Next.js (App Router) — baca `node_modules/next/dist/docs/` sebelum menulis kode baru
- **Database:** PostgreSQL via Prisma ORM (`prisma/schema.prisma`)
- **Auth:** NextAuth.js (`auth.ts`)
- **Storage:** Hybrid — Local (`public/uploads/`) untuk DRAFT, R2/S3 untuk PUBLISHED
- **CSS:** Vanilla CSS di `app/landing.css` — jangan pakai Tailwind kecuali diminta eksplisit

## Arsitektur Kritis yang Wajib Dipahami

### Sistem Undangan (Invitation Lifecycle)
```
DRAFT → PUBLISHED → EVENT_FINISHED → ARCHIVED → (delete user)
```
- File fisik media disimpan di `public/uploads/invitations/<invId>/`
- Published HTML di `public/published/ids/<invId>.html`
- Draft HTML di `data/drafts/<invId>.html`
- Portfolio adalah **full static clone** ke `public/portfolio/assets/<slug>/` — BUKAN pointer ke uploads asli

### Prisma & Enum
- Enum `MediaSlot` sekarang punya 9 nilai termasuk `LANDING_COVER_DESKTOP`
- Setiap tambah enum baru: update schema → buat migration SQL → update semua VALID_ENUM_SLOTS di route

### File Cleanup Invariant (WAJIB)
Saat menghapus Invitation (apapun pemicunya: admin delete user, cron, lifecycle), WAJIB jalankan ketiga ini secara berurutan:
1. `deletePublishedHtml(inv.id)` → hapus `public/published/ids/<id>.html`
2. Hapus `data/drafts/<id>.html` jika ada
3. Hapus `public/uploads/invitations/<id>/` secara rekursif (`fs.rm(..., { recursive: true })`)

**Portfolio tidak terpengaruh** — ia sudah menyalin aset ke folder sendiri.

### Fallback Background Invariant Tema Master (WAJIB)
1. **Pustaka Terpusat:** Seluruh aset fallback background tema master bertempat di `public/assets/ornaments/background/` tanpa terkecuali.
2. **Zero-Copy Invariant:** DILARANG KERAS menyalin/meng-copy file fisik fallback ke folder demo (`/public/demo/...`) atau folder upload klien (`/public/uploads/...`).
3. **URL Direct Pathing:** Template tema master WAJIB memanggil langsung path URL publik `/assets/ornaments/background/<nama-file>` di deklarasi CSS.
4. **Fleksibilitas Desain & Ornamen Berlapis:** Setiap tema memiliki identitas dan rancangan visualnya sendiri. Tema bebas memadukan slot media unggahan (seperti `landingCoverUrl` atau `sidebarPhotoUrl`) dengan aset ornamen/motif latar bawaan sistem (seperti perpaduan layer di `.cover-screen` atau `.sidebar-desktop`) sesuai ciri khas estetika tema tersebut.
5. **Dynamic Override:** Jika klien/admin mengunggah background global, selector `.has-custom-bg` dan inline CSS `--custom-bg: url('...')` aktif menimpa fallback `.fixed-bg-layer` secara bersih.

## Dokumen Master (Wajib Sinkron Setelah Edit)
Sebelum push ke Git, WAJIB perbarui ketiga dokumen ini agar mencerminkan perubahan faktual:
1. `docs/SYSTEM_ARCHITECTURE.md`
2. `README.md`
3. `docs/S-Invitation.md`

## Dilarang Keras
- `git checkout <file>` atau `git restore <file>` — bisa menghapus uncommitted work user
- `sed` atau mass-replace via terminal — terlalu greedy
- Overwrite seluruh file dengan `write_to_file` jika file sudah ada — gunakan `replace_file_content`
