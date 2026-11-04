---
name: claude-working-method
description: >-
  Metodologi kerja praktis Claude Code: Investigation-First Loop, Cross-File Audit,
  Stale Logic Detection, DB Verification, dan pola Empirical Verification yang telah
  terbukti efektif di proyek Luxenary-Invite. Aktifkan skill ini sebelum mengerjakan
  bug, audit, atau cleanup task apapun.
---

# Claude Working Method — Metodologi Kerja Praktis

Skill ini mendokumentasikan **cara kerja nyata** yang harus diikuti oleh setiap agen
saat bekerja di codebase ini — bukan prinsip abstrak, melainkan urutan tindakan konkret.

---

## Loop Utama: INVESTIGATE → CONFIRM → ACT → VERIFY

Ini adalah siklus yang **wajib diikuti secara berurutan** pada setiap task. Tidak boleh loncat langsung ke ACT tanpa INVESTIGATE.

```
┌──────────────────────────────────────────────┐
│  INVESTIGATE                                 │
│  • Baca file target (view_file)              │
│  • Lacak semua referensi (grep_search)       │
│  • Baca file terkait (lintas lapisan)        │
│  • Query DB langsung jika menyangkut data    │
└──────────────────────┬───────────────────────┘
                       │ Fakta terkumpul
                       ▼
┌──────────────────────────────────────────────┐
│  CONFIRM (jika perubahan besar)              │
│  • Sampaikan root cause yang ditemukan       │
│  • Tunjukkan baris kode yang bermasalah      │
│  • Tunggu konfirmasi sebelum destructive act │
└──────────────────────┬───────────────────────┘
                       │ User setuju / task kecil langsung
                       ▼
┌──────────────────────────────────────────────┐
│  ACT (Surgical Edit Only)                    │
│  • replace_file_content — edit 1–5 baris     │
│  • multi_replace_file_content — non-kontigu  │
│  • DILARANG write_to_file untuk file lama    │
│  • DILARANG sed / mass-replace di terminal   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  VERIFY                                      │
│  • npx tsc --noEmit → wajib Exit Code 0      │
│  • Konfirmasi di browser / psql jika relevan │
│  • Laporkan hasil faktual, bukan asumsi      │
└──────────────────────────────────────────────┘
```

---

## 1. Pola Investigasi Lintas File (Cross-File Audit)

Saat ada bug atau stale logic, **jangan hanya perbaiki file yang dilaporkan**. Selalu
audit seluruh codebase untuk pola yang sama:

```bash
# Temukan semua DELETE handler
grep -r "async function DELETE" app/api --include="*.ts" -l

# Temukan semua caller fungsi yang akan diubah
grep -r "namaFungsi" --include="*.ts" -n

# Temukan komentar stale / logika lama
grep -r "DELIBERATELY" --include="*.ts" -n
grep -r "DO NOT CLEAN" --include="*.ts" -n
grep -r "TODO\|FIXME\|DEPRECATED" --include="*.ts" -n
```

**Contoh nyata dari session ini:**
Saat memperbaiki "admin delete client tidak hapus file":
1. Baca `app/api/admin/users/route.ts` → temukan komentar `DELIBERATELY DO NOT CLEAN UP`
2. Search `deletePublishedHtml` di seluruh project → temukan 4 caller
3. Cek cron (`api/cron/cleanup/route.ts`) → sudah hapus uploads dengan benar
4. Baru fix `users/route.ts` mengikuti pola yang sama dengan cron

---

## 2. Deteksi Stale Logic (Logika Usang)

Pola stale logic yang sering muncul di proyek ini:

| Pola Berbahaya | Artinya | Tindakan |
|---|---|---|
| `// DELIBERATELY DO NOT...` | Keputusan desain lama yang mungkin sudah tidak valid | Verifikasi apakah alasan lama masih berlaku |
| `// WE DELIBERATELY DO NOT CLEAN UP R2` | Era pre-portfolio-clone — sudah tidak relevan | Hapus dan implementasi cleanup yang benar |
| Comment yang menyebut path lama (`/published/ids/`, `/uploads/`) | Arsitektur mungkin sudah berubah | Verifikasi terhadap kode aktual |
| `try { ... } catch {}` kosong | Error ditelan diam-diam | Tambah log atau biarkan error naik |

**Cara verifikasi stale logic:**
```bash
# Cek apakah comment masih sinkron dengan implementasi aktual
grep -rn "DELIBERATELY\|portfolio\|DO NOT" app/api --include="*.ts"
```

---

## 3. Verifikasi Database Faktual

Jangan percaya hanya pada `prisma migrate status`. Verifikasi langsung:

```bash
# Connection string dari .env
psql "postgresql://armansyam@localhost:5432/luxenary_dev"

# Cek semua tabel
\dt

# Cek enum values yang actual di DB
SELECT typname, string_agg(enumlabel, ', ' ORDER BY enumsortorder)
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
GROUP BY typname;

# Cek record spesifik
SELECT id FROM invitations WHERE id IN ('uuid1', 'uuid2');
```

**Kapan wajib query DB langsung:**
- Saat ada error P1014 / tabel tidak ditemukan dari Prisma CLI
- Saat menambah enum baru — verifikasi enum sudah ada di DB setelah migration
- Saat audit orphaned files — cocokkan ID file dengan record di DB

---

## 4. Audit File Fisik vs DB (Orphan Check)

Checklist yang wajib dijalankan saat cleanup session:

```bash
# 1. Temukan draft HTML orphaned
ls data/drafts/
# → Lalu query DB: SELECT id FROM invitations WHERE id IN (...)

# 2. Temukan .DS_Store
find . -name ".DS_Store" | grep -v node_modules

# 3. Temukan backup files
find . -name "*.bak" -o -name "*.old" -o -name "*.tmp" | grep -v node_modules

# 4. Debug code yang tertinggal
grep -r "console\.log\|TODO\|@ts-ignore" app --include="*.ts" --include="*.tsx" | grep -v node_modules
```

---

## 5. File Cleanup Invariant Saat Delete Entity

**Aturan besi** — setiap kali Invitation dihapus (apapun trigger-nya), WAJIB tiga langkah ini:

```typescript
// 1. Published HTML
await deletePublishedHtml(inv.id);
// → menghapus public/published/ids/<id>.html

// 2. Draft HTML
const draftPath = path.join(process.cwd(), "data", "drafts", `${inv.id}.html`);
try { await fs.promises.unlink(draftPath); } catch {}
// → menghapus data/drafts/<id>.html jika ada

// 3. Uploads folder
const uploadsDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id);
try { await fs.promises.rm(uploadsDir, { recursive: true, force: true }); } catch {}
// → menghapus seluruh public/uploads/invitations/<id>/
```

**Portfolio TIDAK ikut dihapus** — ia ada di `public/portfolio/assets/<slug>/` dan sudah independent.

---

## 6. Standar Pelaporan Hasil

Setelah menyelesaikan task, WAJIB laporkan:

1. **Root cause yang ditemukan** — baris kode persis, bukan asumsi
2. **File yang diubah** — dengan link ke file
3. **Verifikasi yang dijalankan** — exit code tsc, hasil psql query
4. **Yang TIDAK berubah** — konfirmasi scope isolation

**DILARANG:**
- Bilang "sudah selesai" tanpa bukti empiris
- Menyembunyikan error di balik "semuanya berjalan normal"
- Memuji user atau memberikan nada sycophantic

---

## 7. CSS Anti-Banding Pattern

Untuk gradasi di background gelap yang rentan color banding:

```css
/* ✅ BENAR: multi-stop oklab + noise dithering */
.overlay {
  isolation: isolate;
  background:
    linear-gradient(to bottom in oklab,
      transparent 0%,
      rgba(0,0,0,0.02) 30%,   /* banyak stop halus */
      rgba(0,0,0,0.22) 65%,
      rgba(0,0,0,0.80) 90%,
      #000 100%
    );
}

/* Noise grain via SVG — memecah kuantisasi 8-bit */
.overlay::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,...feTurbulence opacity='0.18'...");
  background-size: 300px 300px;
  mix-blend-mode: soft-light; /* BUKAN overlay — soft-light lebih efektif di gelap */
  opacity: 0.9;
  pointer-events: none;
}

/* ❌ SALAH: opacity noise 0.04, mix-blend-mode: overlay di background gelap */
```

**Kunci:**
- `opacity` noise di SVG minimal **0.15–0.20** agar efektif
- `mix-blend-mode: soft-light` untuk area gelap, bukan `overlay`
- `isolation: isolate` agar blend mode tidak bocor ke elemen lain
- `background-size` wajib di-set agar tiling konsisten
