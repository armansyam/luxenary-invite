# PLATFORM UNDANGAN (WHITE-LABEL) — DOKUMENTASI ARSITEKTUR SISTEM
## Versi: 5.0.0 | Diperbarui: 02 September 2026

> **SUMBER KEBENARAN TUNGGAL** untuk semua developer dan AI Agent yang bekerja di repositori ini.  
> Dokumen ini WAJIB dibaca sebelum melakukan perubahan apapun pada kode.  
> Ditulis berdasarkan audit empiris langsung terhadap kode sumber aktual, bukan asumsi.  
> Quick start: lihat [`README.md`](./README.md) untuk setup lokal dan panduan singkat.

---

## DAFTAR ISI
1. [Fondasi Infrastruktur](#1-fondasi-infrastruktur)
2. [Struktur Folder Aktual](#2-struktur-folder-aktual)
3. [Arsitektur URL & Routing](#3-arsitektur-url--routing)
4. [Mesin Publikasi Statis](#4-mesin-publikasi-statis)
5. [Sistem Penyimpanan Media](#5-sistem-penyimpanan-media)
6. [Siklus Hidup Undangan](#6-siklus-hidup-undangan)
7. [Sistem Subdomain](#7-sistem-subdomain)
8. [Tema & Template Engine](#8-tema--template-engine)
9. [Autentikasi & Otorisasi](#9-autentikasi--otorisasi)
10. [API Route Map](#10-api-route-map)
11. [Skema Database](#11-skema-database)
12. [File yang Tidak Terpakai / Warisan Google Drive](#12-file-yang-tidak-terpakai--warisan-google-drive)
13. [Panduan Kerja Agent AI (Mandatory Reading)](#13-panduan-kerja-agent-ai-mandatory-reading)
14. [Sistem Portofolio Mandiri](#14-sistem-portofolio-mandiri)

---

## 1. FONDASI INFRASTRUKTUR

| Komponen | Detail |
|---|---|
| **Framework** | Next.js 16.3.2 (App Router, TypeScript strict) |
| **Runtime** | Node.js di VPS (bukan Vercel/Edge Function) |
| **Database** | PostgreSQL via Prisma ORM + `@prisma/adapter-pg` |
| **ORM** | Prisma v7.9.1 |
| **Autentikasi** | NextAuth v5 (Auth.js) |
| **Penyimpanan Media** | Cloudflare R2 (produksi) + Local fallback (development) |
| **Image Processing** | `sharp` v0.35.3 (WebP compression, resize) |
| **Manajemen Proses** | PM2 |
| **Middleware** | `middleware.ts` di root (Edge-compatible, async) |

---

## 2. STRUKTUR FOLDER AKTUAL

```
/ (Root Project)
├── app/
│   ├── (admin)/              # Panel Admin (dilindungi role ADMIN/SUPER_ADMIN)
│   │   └── admin/page.tsx    # Single-page admin dashboard (~5889 baris)
│   │
│   ├── (client)/             # Area Client yang sudah login
│   │   └── dashboard/
│   │       ├── page.tsx      # Dashboard utama client
│   │       ├── layout.tsx    # Layout dengan sidebar navigasi
│   │       ├── guests/       # Manajemen daftar tamu
│   │       ├── invitation/   # Setup undangan (new, edit)
│   │       ├── rsvp/         # Manajemen RSVP & ucapan
│   │       ├── settings/     # Pengaturan subdomain, PIN, publish
│   │       └── setup/        # Onboarding flow baru (redirect jika belum ada inv)
│   │
│   ├── (public)/             # Halaman publik (tanpa autentikasi)
│   │   ├── [slug]/           # ← CANONICAL ROUTE UTAMA (flat slug baru)
│   │   │   ├── page.tsx      # Serve undangan HTML (arman-siti-030326)
│   │   │   ├── memories/     # Galeri momen tamu
│   │   │   ├── sharemoment/  # Upload foto tamu (real-time)
│   │   │   └── galery/       # Alias untuk memories
│   │   └── s/[subdomain]/    # Sub-routes untuk fitur interaktif via subdomain
│   │       ├── page.tsx      # Serve undangan via subdomain (DB query fallback)
│   │       ├── memories/     # Galeri via subdomain
│   │       ├── sharemoment/  # Upload via subdomain
│   │       └── receptionist/ # Scanner QR tamu (dilindungi PIN)
│   │
│   ├── api/                  # Semua REST API endpoint
│   ├── components/           # React components reusable
│   │   └── features/
│   │       ├── GuestMomentClient.tsx     # UI upload momen tamu
│   │       ├── ReceptionistScannerClient.tsx # Scanner QR
│   │       └── StaffLockScreen.tsx       # Lock screen PIN panitia
│   │
│   ├── checkout/             # Halaman checkout & pembayaran
│   ├── demo/                 # Demo tema publik
│   ├── login/                # Login client
│   ├── onboarding/           # Flow onboarding baru setelah bayar
│   ├── packages/             # Halaman paket harga
│   ├── portfolio/            # Portofolio undangan selesai
│   ├── 403/                  # Halaman forbidden
│   ├── privacy/terms/refund/ # Legal pages
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page utama (luxenary.id)
│   └── globals.css           # Global CSS
│
├── lib/                      # Business logic & service layer
│   ├── themeEngine.ts        # ⭐ Mesin render tema HTML (~81KB, CORE)
│   ├── staticPublisher.ts    # ⭐ Bake HTML statis saat publish (CORE)
│   ├── renderTemplate.ts     # Render file .html tema + injeksi data
│   ├── storage.ts            # Upload/delete file (R2 atau Local, switch env)
│   ├── settings.ts           # Baca admin_settings dari DB
│   ├── domainUtils.ts        # URL builder (subdomain, canonical, dll)
│   ├── prisma.ts             # Prisma client singleton
│   ├── metadataHelper.ts     # Generate Open Graph metadata
│   ├── colorPalettes.ts      # Palet warna tema undangan
│   ├── videoOptimizer.ts     # FFmpeg video compression (R2 upload)
│   ├── fontEmbedder.ts       # Embed font ke dalam HTML tema
│   ├── escapeHtml.ts         # HTML escape utility
│   ├── rateLimit.ts          # Rate limiter untuk API publik
│   ├── sseEmitter.ts         # Server-Sent Events emitter (momen real-time)
│   ├── gatewayRegistry.ts    # Registry payment gateway
│   ├── gateways/             # Implementasi gateway: iPaymu, Midtrans, dll
│   ├── ipaymu.ts             # iPaymu payment client
│   ├── paymentEvents.ts      # Event bus pembayaran
│   ├── payments.ts           # Abstraksi pembayaran
│   ├── upgradeHelper.ts      # Cek eligibilitas upgrade paket
│   ├── demoPublisher.ts      # Publish demo tema ke /public/demo/
│   ├── demoRegistry.ts       # Registry konten demo tema (~78KB)
│   ├── databaseBackup.ts     # Hot-backup PostgreSQL (pg_dump)
│   ├── auth.ts               # Utility auth session
│   ├── session.tsx           # Session provider wrapper
│   │
│   ├── driveHelper.ts        # ⭐ Ekstraktor foto Google Drive (API v3)
│   └── settings.ts           # Platform settings reader
│
├── prisma/
│   ├── schema.prisma         # Skema database (PostgreSQL)
│   └── seed.ts               # Script seed data awal
│
├── themes/                   # Template HTML tema undangan
│   ├── premium/              # kalandra, valente, aurelia, artisan, kila, ivanna, danila
│   ├── modern/               # wave, papercut, ameera, chronicle, lumina, solaria, moody-papercut
│   └── traditional/          # prameswari, dillalucky, badrika, mayang, candani, aruna
│
├── public/
│   ├── published/            # ⭐ Output HTML statis (subdomain.html + invitationSlug.html)
│   │   ├── premium/          # Fallback by invitationId
│   │   ├── modern/           # Fallback by invitationId
│   │   └── traditional/      # Fallback by invitationId
│   ├── uploads/              # Media upload lokal (R2 switch)
│   │   ├── invitations/      # Media undangan per invitationId
│   │   ├── guest-memories/   # Foto tamu hari H
│   │   ├── proofs/           # Bukti transfer pembayaran
│   │   └── themes-builder/   # Aset demo tema
│   ├── assets/               # Aset statis sistem (brand, homepage)
│   ├── demo/                 # Preview tema HTML (auto-generated)
│   ├── downloads/            # Starter blueprint template
│   ├── music/                # Musik background tema (.ogg)
│   ├── fonts/                # Font lokal
│   └── css/                  # Stylesheet global
│
├── scripts/
│   └── cron-cleanup.ts       # Garbage collector undangan kedaluwarsa
│
├── middleware.ts             # ⭐ Edge routing utama (CRITICAL FILE)
├── auth.ts                   # NextAuth config entry
├── auth.config.ts            # NextAuth strategy config
├── AGENTS.md                 # Aturan perilaku Agent AI (WAJIB DIBACA)
├── SYSTEM_ARCHITECTURE.md    # Dokumen ini
├── S-Invitation.md           # Catatan bisnis & fitur
├── deploy.sh                 # Script deployment VPS
└── tsconfig.json / package.json / next.config.ts
```

---

## 3. ARSITEKTUR URL & ROUTING

### 3.1 — Tiga Format URL Aktif

```
FORMAT 1 — Subdomain (Utama, Sementara H+retention_days)
  URL  : arman-siti.luxenary.id
  Flow : Middleware deteksi host = subdomain → Rewrite ke /published/arman-siti.html
  Notes: Setelah acara + retention_days, subdomain dilepas, file dihapus.

FORMAT 2 — Canonical Flat Slug (Permanen)
  URL  : luxenary.id/arman-siti-030326
  Flow : Middleware intercept path → Rewrite ke /published/arman-siti-030326.html
  Notes: Selalu aktif selama file HTML ada. Nama file = invitationSlug.

FORMAT 3 — Custom Domain Klien (Infrastruktur Siap, Fitur Belum Aktif)
  URL  : arman-siti.com (domain milik klien)
  Flow : Middleware deteksi isCustomDomain → Fetch /api/public/resolve-custom-domain
         → Dapat subdomain internal → Rewrite ke HTML
  Notes: API endpoint sudah ada. Klien perlu atur CNAME ke server kita.
         Belum ada UI form untuk daftarkan customDomain.
```

### 3.2 — Format invitationSlug (Sistem Baru Sept 2026)

```
Format   : {groomSlug}-{brideSlug}-{DDMMYY}
Contoh   : arman-siti-030326
Collision: + kota → arman-siti-030326-jakarta
Extreme  : + random 4char → arman-siti-030326-jakarta-x7k
```

> **PENTING:** `invitationSlug` adalah `@unique` di Prisma schema.  
> Tidak ada lagi constraint compound `@@unique([groomSlug, brideSlug, invitationSlug])`.

### 3.3 — Sub-routes Publik

```
/{slug}/memories      → Galeri foto tamu (SSR, realtime SSE)
/{slug}/sharemoment   → Upload foto tamu hari H
/{slug}/galery        → Alias untuk memories
/{subdomain}.domain/memories     → Sama tapi via subdomain
/{subdomain}.domain/receptionist → Scanner QR (PIN-protected)
/{subdomain}.domain/sharemoment  → Upload via subdomain
```

### 3.4 — Middleware Logic Flowchart

```
Request masuk
    │
    ├─ /admin/login          → Redirect jika sudah login sebagai Admin
    ├─ /login                → Redirect ke dashboard jika client login
    ├─ /admin/**             → Guard: hanya ADMIN/SUPER_ADMIN
    ├─ /dashboard/**         → Guard: hanya Client (non-Admin)
    │
    ├─ Host = subdomain milik kita (e.g. arman.luxenary.id)
    │   ├─ /                 → Rewrite → /published/{subdomain}.html
    │   ├─ /memories         → Rewrite → /s/{subdomain}/memories
    │   ├─ /receptionist     → Rewrite → /s/{subdomain}/receptionist
    │   ├─ /sharemoment      → Rewrite → /s/{subdomain}/sharemoment
    │   └─ /{guest}          → Rewrite → /published/{subdomain}.html?to={guest}
    │
    ├─ Host = custom domain klien (e.g. arman.com) — INFRASTRUKTUR SIAP
    │   └─ Fetch resolve-custom-domain API → dapat subdomain → rewrite
    │
    └─ Root domain path (e.g. luxenary.id/arman-siti-030326)
        ├─ /{slug}                    → Rewrite → /published/{slug}.html
        └─ /{slug}/memories|sharemoment → NextResponse.next() (ke Next.js page)
```

---

## 4. MESIN PUBLIKASI STATIS

**File:** `lib/staticPublisher.ts`

Saat client menekan tombol "Publish", sistem memanggil `buildAndSavePublishedHtml(invitationId)`:

```
1. Query semua data undangan dari DB (themeId, nama, foto, acara, dll)
2. Compose data via themeEngine.composeTemplateData()
3. Render HTML via renderTemplateFile() → HTML lengkap + inline CSS/JS
4. Inject Open Graph meta tags
5. Simpan ke TIGA lokasi:
   a. public/published/{subdomain}.html     → Untuk subdomain URL
   b. public/published/{invitationSlug}.html → Untuk canonical URL
   c. public/published/{category}/{id}.html  → Fallback by ID
6. Return HTML string
```

**Saat Unpublish/Hapus**, `deletePublishedHtml(invitationId)` menghapus ketiganya.

**KRITIS:** File HTML ini adalah satu-satunya yang disajikan ke tamu. Tidak ada SSR/API aktif untuk tamu saat undangan sudah published.

---

## 5. SISTEM PENYIMPANAN MEDIA

**File:** `lib/storage.ts`

```
Storage mode ditentukan oleh environment variable:
  STORAGE_MODE=r2    → Upload ke Cloudflare R2
  STORAGE_MODE=local → Upload ke public/uploads/ (default development)

Fungsi utama:
  uploadFile(buffer, key, mimeType) → URL publik
  deleteFile(url)                   → Hapus file

URL Format:
  R2    : https://{R2_PUBLIC_URL}/{key}
  Local : /uploads/{key}  (served via Next.js static)
```

> ⚠️ **Google Drive TIDAK DIGUNAKAN UNTUK UPLOAD.**  
> `driveViewUrl` di schema sudah dihapus.  
> Untuk Galeri Pre-Wedding, klien dapat meletakkan link folder Drive publik,
> dan sistem akan menggunakan `GOOGLE_API_KEY` untuk fetch URL gambarnya.

---

## 6. SIKLUS HIDUP UNDANGAN

```
[DRAFT] ──→ [PUBLISHED] ──→ [Expired setelah acara + retention_days]
                │
                └──→ Cron cleanup: hapus file HTML, kosongkan subdomain
                     File canonical (invitationSlug) tetap ada sampai
                     retention_invitation_days (default: 30 hari)
```

**Status undangan:**
- `DRAFT` — Masih dalam pengaturan, URL tidak aktif
- `PUBLISHED` — URL aktif, HTML sudah di-bake
- Tidak ada status "EXPIRED" di DB; cleanup by cron

**Syarat Publish (isPublishable check di Settings page):**
1. `staffPin` sudah diisi ✓
2. `subdomain` sudah dipilih ✓
3. `groomName` + `brideName` sudah diisi ✓
4. Minimal 1 event di `eventData` ✓

---

## 7. SISTEM SUBDOMAIN

**Dual-check ketersediaan subdomain:**

1. **Setup Awal (Onboarding):** `POST /api/client/invitations/create` → cek `prisma.invitation.findUnique({ where: { subdomain } })`
2. **Settings Page:** `GET /api/client/subdomain/check?subdomain=xxx` → cek ketersediaan real-time

**Recycle Subdomain:** Jika subdomain sudah kedaluwarsa (acara lewat 7 hari), sistem otomatis mengosongkan kolom `subdomain` dari pemilik lama dan mengizinkan klien baru mengambilnya.

**PENTING:** Kolom `subdomain` di DB ber-constraint `@unique`. Race condition ditangani via constraint DB + try/catch `P2002`.

---

## 8. TEMA & TEMPLATE ENGINE

**Files:** `lib/themeEngine.ts` (~81KB), `lib/renderTemplate.ts`, `themes/`

```
Tema tersedia (17 tema total):
  Premium    : kalandra, valente, aurelia, artisan, kila, ivanna, danila
  Modern     : wave, papercut, ameera, chronicle, lumina, solaria, moody-papercut
  Traditional: prameswari, dillalucky, badrika, mayang, candani, aruna, heritage-aruna
```

**Alur render:**
```
themes/{category}/{themeId}.html   ← File template mentah
        ↓
renderTemplateFile(themeId, data, options)
        ↓
themeEngine.composeTemplateData(invitationId) ← Ambil semua data dari DB
        ↓
Injeksi: nama pasangan, foto, acara, RSVP form, countdown, musik
        ↓
HTML standalone lengkap (self-contained, inline CSS/JS)
```

---

## 9. AUTENTIKASI & OTORISASI

**File:** `auth.ts`, `auth.config.ts`, `middleware.ts`

```
Peran (role):
  SUPER_ADMIN → Akses penuh semua area
  ADMIN       → Akses /admin/**
  USER        → Akses /dashboard/** (client biasa)

Guard di middleware:
  /admin/**    → Hanya ADMIN atau SUPER_ADMIN
  /dashboard/** → Hanya USER (non-Admin)
  /api/admin/** → Server-side check via auth()
  /api/client/** → Server-side check via auth() + userId match
```

---

## 10. API ROUTE MAP

```
PUBLIC (tanpa auth):
  GET  /api/public/settings           → Platform settings global
  GET  /api/public/themes             → List tema aktif
  POST /api/public/rsvp               → Submit RSVP tamu
  GET  /api/public/memories/{id}      → List foto momen
  POST /api/public/memories/upload    → Upload foto tamu (rate-limited)
  GET  /api/public/resolve-custom-domain → Resolve custom domain ke subdomain
  GET  /api/public/version            → Versi sistem
  GET  /api/sse/memories              → SSE stream momen real-time

CLIENT (auth required, role=USER):
  GET/PATCH /api/client/invitations/{id}    → Detail & update undangan
  GET       /api/client/invitations         → List undangan client
  POST      /api/client/invitations/create  → Buat undangan baru
  GET/POST  /api/client/guests              → Manajemen tamu
  GET       /api/client/subdomain/check     → Cek ketersediaan subdomain
  POST      /api/client/upload             → Upload media undangan
  GET       /api/client/rsvps             → Statistik RSVP
  GET       /api/client/orders            → List order client

ADMIN (auth required, role=ADMIN/SUPER_ADMIN):
  GET  /api/admin/overview            → Statistik platform
  GET  /api/admin/users               → List semua user
  GET  /api/admin/orders/{id}/approve → Approve pesanan manual
  GET  /api/admin/themes              → Manajemen tema
  POST /api/admin/settings            → Update platform settings
  POST /api/admin/database/backup     → Backup database
  POST /api/admin/subdomains/recycle  → Daur ulang subdomain kedaluwarsa

RECEPTIONIST (public + PIN-protected di client side):
  POST /api/receptionist/verify-pin   → Verifikasi PIN panitia
  GET  /api/receptionist/guests       → List tamu untuk scanner
  POST /api/receptionist/scan         → Tandai tamu hadir

PAYMENT:
  POST /api/orders/create             → Buat pesanan baru
  POST /api/payments/checkout         → Proses pembayaran
  GET  /api/payments/status-stream/{id} → SSE status pembayaran
  POST /api/webhook/ipaymu            → Webhook iPaymu
  POST /api/webhook/midtrans          → Webhook Midtrans

⚠️ WARISAN (masih ada, perlu evaluasi):
  GET  /api/cdn/drive                 → Google Drive CDN proxy (warisan)
  POST /api/admin/test-google         → Test koneksi Google OAuth (warisan)
  POST /api/client/invitations/{id}/retention-sync → Sinkronisasi Drive warisan
```

---

## 11. SKEMA DATABASE

**File:** `prisma/schema.prisma`

```
Model Utama:
  User           → Akun user (client)
  Admin          → Akun admin terpisah dari User
  Order          → Pesanan paket undangan
  Invitation     → Inti undangan (DRAFT/PUBLISHED)
  Guest          → Daftar tamu per undangan
  Rsvp           → Konfirmasi kehadiran tamu
  Wish           → Ucapan tamu
  GuestMemory    → Foto/video tamu (hari H)
  InvitationMedia → File media undangan (foto prewedding, dll)
  AdminSettings  → Konfigurasi platform global
  PlatformVersion → Versi rilis sistem

Field Kritis di Invitation:
  invitationSlug  @unique   ← Flat slug canonical: arman-siti-030326
  subdomain       @unique   ← Subdomain: arman-siti (nullable)
  customDomain    @unique   ← Custom domain klien (nullable, infrastruktur siap)
  staffPin        String?   ← PIN panitia terenkripsi AES-256 (wajib diisi)
  eventData       String?   ← JSON array multi-event
  featureSettings String?   ← JSON settings fitur & color palette
  status          DRAFT|PUBLISHED

Field Warisan di InvitationMedia:
  driveFileId     String?   ← ID file Google Drive (warisan)
  driveViewUrl    String?   ← URL view Google Drive (warisan)
  localPath       String?   ← Path lokal / R2 URL (AKTIF digunakan)
```

---

## 12. FILE YANG TIDAK TERPAKAI / WARISAN GOOGLE DRIVE

### 12.1 — Warisan yang Masih Ada di Kode (JANGAN hapus sembarangan)

| File/Modul | Status | Penjelasan |
|---|---|---|
| `lib/driveHelper.ts` | ✅ Diperbarui | Dirombak total menggunakan Google Drive API v3 resmi. Bukan scraper lagi, lebih stabil dan bersih menggunakan `GOOGLE_API_KEY`. |
| `app/api/cdn/drive/route.ts` | 🗑️ Terhapus | Proxy CDN Google Drive sudah dihapus. |
| `app/api/client/invitations/[id]/retention-sync/route.ts` | 🗑️ Terhapus | API sinkronisasi Drive ke DB lokal sudah dihapus. |
| `app/api/admin/test-google/route.ts` | 🗑️ Terhapus | Test koneksi Google OAuth sudah dihapus dari codebase. |
| `InvitationMedia.driveViewUrl & driveFileId` | 🗑️ Terhapus | Kolom warisan sudah dihapus dari Prisma schema secara penuh. |
| `GuestMemory.driveFileId` | 🗑️ Terhapus | Sudah dihapus dari schema. |

### 12.2 — File Sampah yang Sudah Dihapus (Sept 2026)

- `extract.js`, `parse.js`, `get_themes.js` — Script analisis satu kali
- `test-heic.js`, `test_put.js`, `test-prisma.js` — Script tes manual
- `reconstruct.txt`, `text_audit.txt`, `extracted_views.txt` — Hasil audit lama
- `all_texts.txt`, `all_hardcoded_texts.txt` — Hasil ekstraksi teks
- `ref.md` — Catatan sementara
- `app/(public)/[groom]-[bride]/[invitationSlug]/` — Route lama (diganti `[slug]`)

---

## 13. PANDUAN KERJA AGENT AI (MANDATORY READING)

> Bagian ini adalah **instruksi perilaku untuk AI Agent (Antigravity/Claude/Gemini)** yang bekerja di repositori ini.  
> Tidak mengikuti panduan ini = kemungkinan besar menghasilkan bug atau merusak arsitektur.

---

### 13.1 — SIKLUS KERJA WAJIB (Claude-style Agentic Loop)

Setiap tugas, sekecil apapun, HARUS mengikuti urutan ini:

```
FASE 1: INVESTIGASI (TANPA MENGUBAH KODE)
  a. Baca file yang relevan terlebih dahulu (view_file / grep_search)
  b. Pahami konteks lengkap: siapa yang memanggil? Apa yang diharapkan?
  c. Identifikasi ROOT CAUSE, bukan gejala
  d. Periksa apakah ada pola serupa di kodebase yang sudah ada

FASE 2: PERENCANAAN (BUAT RENCANA JELAS)
  a. Tulis daftar file yang AKAN diubah
  b. Jelaskan MENGAPA perubahan itu diperlukan (bukan hanya apa)
  c. Identifikasi risiko: apakah ada yang bisa rusak?
  d. Untuk perubahan besar: buat implementation_plan.md dan minta approval

FASE 3: IMPLEMENTASI (SURGICAL PRECISION)
  a. Edit hanya baris yang diperlukan (replace_file_content / multi_replace)
  b. TIDAK mengoverwrite file besar tanpa alasan (write_to_file hanya untuk file BARU)
  c. Satu perubahan per file secara serial jika ada ketergantungan
  d. Jalankan `npx tsc --noEmit` setelah setiap batch perubahan

FASE 4: VERIFIKASI EMPIRIS
  a. TypeCheck HARUS exit code 0 sebelum menyatakan selesai
  b. Baca output error secara menyeluruh sebelum klaim "berhasil"
  c. Jangan declare "sudah fixed" tanpa bukti dari tool execution
  d. Jika ada side effect tak terduga, lapor jujur ke user

FASE 5: DOKUMENTASI
  a. Update SYSTEM_ARCHITECTURE.md jika mengubah arsitektur
  b. Update AGENTS.md jika ada pola kerja baru yang perlu diingat
```

---

### 13.2 — ANTI-PATTERN YANG DILARANG KERAS

```
❌ DILARANG: Swallow error dengan try-catch kosong tanpa logging
❌ DILARANG: Return { success: true } padahal operasi gagal
❌ DILARANG: Tambah fallback "OR id = ?" untuk bypass auth
❌ DILARANG: Menghapus file tanpa grep terlebih dahulu apakah masih diimport
❌ DILARANG: Mengedit file berdasarkan asumsi tanpa membaca isinya dulu
❌ DILARANG: Menyatakan "sudah fix" tanpa menjalankan typecheck
❌ DILARANG: Overwrite file panjang hanya untuk perubahan kecil
❌ DILARANG: Menggunakan emoji di elemen UI profesional (navbar, card, badge)
❌ DILARANG: Modifikasi file di luar scope yang diminta tanpa izin
❌ DILARANG: Membuat solusi baru tanpa mengecek apakah pola serupa sudah ada
```

---

### 13.3 — CHECKLIST SEBELUM EDIT DATABASE/SCHEMA

```
[ ] Apakah ini development atau production?
[ ] Apakah ada data yang akan hilang (--accept-data-loss)?
[ ] Apakah semua unique constraint konsisten dengan kode?
[ ] Sudah jalankan `prisma generate` setelah `db push`?
[ ] Semua caller Prisma sudah diupdate ke field/relasi baru?
```

---

### 13.4 — POLA LOOKUP DATABASE YANG BENAR

```typescript
// ✅ BENAR — gunakan @unique field langsung
prisma.invitation.findUnique({ where: { invitationSlug: slug } })
prisma.invitation.findUnique({ where: { subdomain: subdomain } })
prisma.invitation.findUnique({ where: { id: id } })

// ❌ SALAH (schema lama, sudah dihapus)
prisma.invitation.findUnique({
  where: {
    groomSlug_brideSlug_invitationSlug: { groomSlug, brideSlug, invitationSlug }
  }
})
```

---

### 13.5 — URL BUILDER YANG BENAR

```typescript
import { getInvitationPublicUrl, getPermanentPathUrl } from "@/lib/domainUtils";

// Subdomain URL (sementara):
getInvitationPublicUrl("arman-siti")
// → http://arman-siti.localhost:3000 (dev)
// → https://arman-siti.luxenary.id (prod)

// Canonical URL (permanen, FLAT SLUG):
getPermanentPathUrl("arman-siti-030326")
// → http://localhost:3000/arman-siti-030326 (dev)
// → https://luxenary.id/arman-siti-030326 (prod)

// ❌ SALAH (format lama, 3 argumen, sudah diubah):
getPermanentPathUrl(groomSlug, brideSlug, invitationSlug) // TIDAK ADA LAGI
```

---

### 13.6 — STORAGE MEDIA YANG BENAR

```typescript
import { uploadFile, deleteFile } from "@/lib/storage";

// Upload (otomatis pilih R2 atau Local berdasarkan STORAGE_MODE env)
const url = await uploadFile(buffer, "invitations/{id}/cover.webp", "image/webp");
// Simpan url ke DB sebagai localPath (bukan driveViewUrl)

// Resolusi URL media dari DB:
const url = media.localPath || media.driveViewUrl || "/default.jpg";
//          ^^^ prioritas ke localPath (R2/Local), fallback ke Drive (warisan)
```

---

### 13.7 — CARA MEMBACA KODE INI PERTAMA KALI

Jika Anda agent baru yang masuk ke proyek ini, baca file-file ini secara berurutan:

```
1. SYSTEM_ARCHITECTURE.md (dokumen ini)   → Paham big picture
2. AGENTS.md                              → Aturan perilaku
3. prisma/schema.prisma                   → Paham struktur data
4. middleware.ts                          → Paham routing
5. lib/staticPublisher.ts                 → Paham alur publish
6. lib/themeEngine.ts (header saja)       → Paham theme engine
7. app/(client)/dashboard/settings/       → Paham self-service client
```

---

*Dokumen ini diperbarui pada: 02 September 2026*  
*Oleh: Antigravity AI Assistant (Google DeepMind)*  
*Audit basis: Empiris — langsung dari kode sumber aktual, bukan asumsi.*

---

## 14. SISTEM PORTOFOLIO MANDIRI

**Files:** `app/api/admin/portfolio/route.ts`, `app/portfolio/page.tsx`, `app/portfolio/PortfolioGallery.tsx`

Sistem portofolio memungkinkan Admin (SUPER_ADMIN) mengkurasi undangan klien pilihan menjadi **salinan HTML statis yang 100% mandiri** — semua aset media sudah disalin lokal, tidak ada URL eksternal tersisa.

### Alur Kloning
```
Admin klik "Jadikan Portofolio" → POST /api/admin/portfolio
  Step 1: Baca HTML dari public/published/slugs/{slug}.html
  Step 2: Bersihkan & buat public/portfolio/assets/{slug}/
  Step 3: InvitationMedia semua slot (R2/Local → salin nama asli)
  Step 4: GuestMemory thumbnails — max 10, sharp 120x120 WebP 65%
  Step 5: Drive CDN URLs — max 15, sharp 1200px WebP 75%
  Step 6: Tulis HTML final ke public/portfolio/{slug}.html
```

### Routing Portofolio (di middleware.ts)
```
/portfolio              → Next.js page handler (galeri indeks)
/portfolio/{slug}       → rewrite ke /portfolio/{slug}.html (statis)
/portfolio/assets/*     → serve file statis langsung (bypass rewrite)
```

### Halaman Indeks `/portfolio`
- Hanya tampilkan undangan yang ada file `.html`-nya di `public/portfolio/`
- Cover dari `/portfolio/assets/{slug}/cover.webp` (fallback ke `localPath`)
- `publicUrl` mengarah ke `/portfolio/{slug}` bukan URL undangan aktif

### Kompresi Aset
| Kategori | Dimensi | Format | Quality |
|---|---|---|---|
| InvitationMedia | original | original | tanpa kompres |
| GuestMemory thumbnail | 120×120px | WebP | 65% |
| Drive gallery | max 1200px | WebP | 75% |

### API Endpoints
| Method | Fungsi |
|---|---|
| `GET /api/admin/portfolio` | List slug portofolio aktif (dari filesystem) |
| `POST /api/admin/portfolio` | Kloning undangan ke portofolio statis |
| `DELETE /api/admin/portfolio?clientName={slug}` | Hapus portofolio + aset |

### Folder Output
```
public/portfolio/
  {slug}.html              ← HTML terisolasi
  assets/{slug}/
    cover.webp             ← LANDING_COVER
    home_photo.webp        ← HOME_PHOTO
    groom.webp/bride.webp  ← GROOM/BRIDE_PHOTO
    background.webp        ← GLOBAL_FIXED_BG
    sidebar.webp           ← DESKTOP_SIDEBAR
    closing.webp           ← CLOSING_COVER
    music.mp3              ← musicUrl
    memory_01-10.webp      ← GuestMemory thumbnails (max 10)
    gallery_01-15.webp     ← Drive Our Moments (max 15)
```

---

## 11.2 - Dynamic Manifest & PWA

Platform menggunakan `app/manifest.ts` dinamis secara server-side yang mengambil nama PWA dari `admin_settings` (`platform_name`). Hal ini menghilangkan ketergantungan pada file `.env` untuk pengaturan _app name_.

## 11.3 - Keamanan Custom Domain (CORS / Cross-Origin POST)

Permintaan (POST/GET) yang dilakukan melalui domain kustom yang terhubung via CNAME dijamin keamanannya dan **tidak terkena pemblokiran CORS**. Hal ini karena fitur **Next.js Middleware Rewrite** meneruskan _request_ secara transparan dalam server, sehingga bagi _browser_, _client_, dan _API endpoint_, transaksi tersebut tetap berada pada **Same-Origin**.

## 11.4 - Prefix Invoice Otomatis

Seluruh modul pembayaran (_Payment Gateways_ seperti Duitku, Xendit, Tripay, IPaymu) secara otomatis membaca _prefix_ tagihan dari _dashboard_ Admin (`payment_invoice_prefix`). Jika kosong, sistem otomatis mundur (*fallback*) menjadi teks generik "Tagihan Pembayaran". Ini menjamin tidak adanya jejak _brand_ awal pada tagihan QRIS / _Virtual Account_ pelanggan.
