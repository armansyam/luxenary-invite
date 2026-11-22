---
trigger: always_on
---

# Luxenary-Invite: Kontrak Teknikal Proyek

## Stack Teknologi
- **Framework:** Next.js 16.4.6 (App Router, request proxy di `proxy.ts` — BUKAN `middleware.ts`) — baca `node_modules/next/dist/docs/` sebelum menulis kode baru
- **Database:** PostgreSQL via Prisma ORM 7 (`prisma/schema.prisma`, 28 model, 17 enum, adapter `@prisma/adapter-pg`)
- **Auth:** NextAuth.js v5 (`auth.ts`) — Klien: Email + Kata Sandi (`bcrypt`) + OTP 6-digit SMTP (`/api/auth/register`, `/api/auth/reset-password`); Admin: Credentials (`/admin/login`); Mitra: Email + Kata Sandi + OTP (`/partner`). Google OAuth & `lib/auth.ts` sudah dihapus total.
- **Storage:** Hybrid — Local (`public/uploads/`) untuk DRAFT, Cloudflare R2/S3 untuk PUBLISHED
- **CSS:** Vanilla CSS di `app/landing.css` (landing) & Tailwind CSS v4 (dashboard/admin)

## Arsitektur Kritis yang Wajib Dipahami

### 3 Mode Acara Abadi & Katalog Tema (81 Master Fisik)
- Enum `EventType` memiliki tepat **3 nilai abadi**: `WEDDING`, `PERSONAL`, `EVENT` (dilengkapi `subEvent` dinamis bebas/preset).
- Direktori master: `themes/<mode>/<gaya>/<id>.html` (`34` `wedding`, `37` `personal`, `10` `event` = 81 master; 3 blueprint di `themes/_blueprints/{wedding,personal,event}/`). Pemetaan folder hanya lewat `lib/themePaths.ts`.
- Isolasi tema ketat per mode (`isThemeInMode`); pergantian mode saat `DRAFT` hanya via aksi `CHANGE_INVITATION_MODE`.

### Sistem Undangan (Invitation Lifecycle)
```
DRAFT (atau Free Draft 14 hari) → PUBLISHED → EVENT_FINISHED → ARCHIVED → (delete user)
```
- File fisik media disimpan di `public/uploads/invitations/<invId>/` (draft) atau R2 (published)
- Published HTML di `public/published/ids/<invId>.html` (serta salinan R2 bila aktif)
- Piring draf undangan disimpan di tabel DB `invitation_drafts` (menggantikan berkas legacy `data/drafts/<invId>.html`)
- Portfolio adalah **full static clone** ke `public/portfolio/assets/<slug>/` — BUKAN pointer ke uploads asli

### Prisma & Enum
- Enum `EventType`: 3 nilai (`WEDDING`, `PERSONAL`, `EVENT`)
- Enum `MediaSlot`: 11 nilai (`LANDING_COVER`, `LANDING_COVER_DESKTOP`, `HOME_PHOTO`, `DESKTOP_SIDEBAR`, `GLOBAL_FIXED_BG`, `GROOM_PHOTO`, `BRIDE_PHOTO`, `PROFILE_PHOTO`, `EVENT_PHOTO`, `GALLERY`, `CLOSING_COVER`)
- Setiap tambah enum baru: update schema → buat migration SQL expand-only → update semua VALID_ENUM_SLOTS di route

### File Cleanup Invariant (WAJIB)
Saat menghapus Invitation (apapun pemicunya: admin delete user, cron, lifecycle), WAJIB jalankan urutan pembersihan berikut:
1. `deletePublishedHtml(inv.id)` → hapus `public/published/ids/<id>.html` (+ objek R2)
2. Hapus piring draf (`invitation_drafts` di DB via CASCADE & sisa legacy `data/drafts/<id>.html` jika ada)
3. Hapus `public/uploads/invitations/<id>/` secara rekursif (`fs.rm(..., { recursive: true })`) & objek media R2 terkait

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
