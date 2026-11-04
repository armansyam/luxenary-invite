---
trigger: always_on
---

# Protokol Audit & Investigasi Sebelum Edit

## Urutan Wajib Sebelum Menyentuh Kode

### Langkah 1 — Trace Root Cause, Bukan Asumsi
Sebelum mengubah satu baris pun, WAJIB:
1. `view_file` pada file yang berkaitan untuk memahami konteks aktual
2. `grep_search` untuk menemukan semua caller / referensi simbol yang akan diubah
3. Verifikasi apakah logic lama masih ada di tempat lain (audit cross-file)

Contoh: saat memperbaiki "admin delete user tidak hapus file" →
- Baca handler DELETE dulu (`view_file`)
- Cari semua pemanggil `deletePublishedHtml` (`grep_search`)
- Cek apakah komentar lama (`DELIBERATELY DO NOT CLEAN UP`) masih ada di file lain
- Baru kemudian lakukan fix

### Langkah 2 — Verifikasi DB Faktual Bila Relevan
Jika menyangkut database:
- Gunakan `psql` langsung dengan connection string dari `.env` untuk verifikasi tabel/enum
- Jangan percaya hanya pada `prisma migrate status` — verifikasi dengan query langsung
- Contoh: `SELECT typname, string_agg(enumlabel...) FROM pg_type t JOIN pg_enum...`

### Langkah 3 — Bersihkan Artefak Sebelum Dinyatakan Selesai
Setiap sesi kerja, cek:
- File orphaned: `data/drafts/` → cocokkan dengan DB
- File backup: `*.bak`, `*.old`, `*.tmp`
- `.DS_Store` tersebar di `public/`
- Debug code: `console.log`, `TODO`, `@ts-ignore` yang tidak disengaja

### Langkah 4 — TypeScript Gate
`npx tsc --noEmit` WAJIB Exit Code 0 sebelum menyatakan selesai.
Ini syarat minimum — bukan bukti sistem berjalan benar.

## Pola Investigasi yang Terbukti Efektif di Proyek Ini

```bash
# Cek semua DELETE handlers di API
grep -r "async function DELETE" app/api --include="*.ts" -l

# Cek semua tempat yang memanggil fungsi tertentu
grep -r "deletePublishedHtml" --include="*.ts" -n

# Verifikasi enum di DB langsung
psql "postgresql://armansyam@localhost:5432/luxenary_dev" \
  -c "SELECT typname, string_agg(enumlabel, ', ' ORDER BY enumsortorder) FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY typname;"

# Cek tabel yang ada
psql "postgresql://armansyam@localhost:5432/luxenary_dev" -c "\dt"
```

## Larangan Browser Tool untuk Konfirmasi (Code-First & Fast Verification)
1. **DILARANG MENGGUNAKAN BROWSER SUBAGENT / SCREENSHOT UNTUK KONFIRMASI:**
   - Membuka browser subagent sangat lambat (2-5 menit), rentan macet, dan membuang waktu.
   - Pengecekan visual browser tidak boleh dipakai untuk pembuktian kode rutin.
2. **WAJIB CODE-FIRST VERIFICATION (FAKTUAL & CEPAT):**
   - Buktikan kebenaran langsung pada sumbernya: kode logika (`view_file`, `grep_search`), skrip CLI/runtime (`npx tsx`, `curl`), query database (`psql`), dan typecheck (`npx tsc --noEmit`).
   - Eksekusi cepat, 100% akurat, dan tidak ada jeda tunggu yang sia-sia.
3. **PENGECUALIAN:** Browser subagent HANYA BOLEH dibuka jika pengguna secara eksplisit meminta pengujian visual browser.
