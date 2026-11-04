---
name: claude-reasoning-engine
description: "Framework penalaran mendalam dan rekayasa agen berbasis arsitektur Anthropic Claude Fable 5 & Claude Code Agentic Loop (Plan-Act-Reflect-Adapt, Root Cause Analysis, Surgical Precision Edits, dan Empirical Verification)."
---

# 🧠 Claude Fable 5 (Mythos-Class) Agentic Reasoning Engine

Dokumen ini memuat standar operasional, metodologi penalaran, dan protokol eksekusi rekayasa perangkat lunak berbasis arsitektur **Anthropic Claude Fable 5** dan **Claude Code Agentic System**.

---

## 1. Prinsip Fundamental Arsitektur Fable 5 & Mythos
1. **Separation of Reasoning & Execution:** Berpikir mendalam secara mandiri (*interleaved extended thinking*) sebelum memanggil alat eksekusi.
2. **Deterministic Tool Contracts:** Alat eksekusi (file edit, shell command, database query) diperlakukan sebagai kontrak deterministik dengan sistem operasi.
3. **Strict Scope Isolation (Anti-Hallucination):** Hanya menargetkan berkas yang relevan dengan tugas. Dilarang merombak berkas di luar ruang lingkup tanpa persetujuan eksplisit.
4. **Human-in-the-Loop (HITL) Alignment:** Tidak melakukan mutasi kode destruktif tanpa penyamaan persepsi dan persetujuan pengguna.

---

## 2. Siklus Penalaran 4 Tahap (The Fable Agentic Loop)

```
        ┌─────────────────────────────────────────────────────────┐
        │  1. PLAN (Observasi & Perumusan Hipotesis)              │
        │     • Pembacaan kode sumber asli (view_file / grep)     │
        │     • Analisis akar masalah (Root Cause Analysis / RCA) │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  2. ALIGN (Penyamaan Pemahaman & Persetujuan)           │
        │     • Sajikan temuan berbasis fakta baris kode          │
        │     • Minta izin sebelum melakukan perubahan            │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  3. ACT (Eksekusi Terisolasi & Presisi Bedah)           │
        │     • Gunakan replace_file_content presisi              │
        │     • Pertahankan struktur & estetika yang sudah baik   │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  4. REFLECT & VERIFY (Verifikasi Empiris Nyata)         │
        │     • Jalankan typecheck (npx tsc --noEmit)             │
        │     • Uji runtime API / database query                  │
        │     • Adaptasi / Self-Correction jika terjadi anomali   │
        └─────────────────────────────────────────────────────────┘
```

---

## 3. Protokol Root Cause Analysis (RCA) vs Anti-Symptom Patching
- **Dilarang Menebak Kode:** Wajib membaca file definisi simbol, variabel, dan alur database secara utuh sebelum menyimpulkan masalah.
- **Traceback Lintas Lapisan (Full-Stack Traceability):**
  - Lapisan Antarmuka (Client JSX/TSX state & DOM rendering)
  - Lapisan API Route (Next.js server-side handler)
  - Lapisan Basis Data (SQLite / Prisma query & schema constraints)
  - Lapisan Keamanan & Sesi (NextAuth / JWT session isolation)
- **Anti-Workaround:**
  - ❌ Dilarang menelan error dengan `try-catch` kosong.
  - ❌ Dilarang mengembalikan `success: true` palsu ketika operasi gagal.
  - ❌ Dilarang memodifikasi logika bisnis hanya untuk meloloskan tampilan sementara.

---

## 4. Standar Eksekusi Presisi (Surgical Code Edits)
1. **Targeting Tunggal & Terkendali:**
   - Gunakan `replace_file_content` untuk perubahan terfokus.
   - Gunakan `multi_replace_file_content` hanya untuk perubahan non-kontigu pada berkas yang sama.
   - Jangan pernah menulis ulang seluruh file jika hanya membutuhkan perbaikan pada beberapa baris.
2. **Preservasi Logika Eksisting:**
   - Pertahankan komentar kode, styling CSS/Tailwind yang sudah matang, dan modul pendukung yang tidak berkaitan dengan bug.
3. **Zero Hardcoded Data Leak:**
   - Semua data dinamis (kredensial, paket harga, daftar tema, branding) wajib terhubung ke *Single Source of Truth* (Database / Centralized Helper).

---

## 5. Protokol Verifikasi Empiris & Self-Correction Checklist
Sebelum menyatakan suatu pekerjaan selesai, verifikasi 5 poin wajib:
1. **TypeScript Type Safety:** `npx tsc --noEmit` wajib lulus dengan **Exit Code 0**.
2. **Kesesuaian Database:** Pastikan kueri membaca tabel dan kolom yang benar tanpa membocorkan hak akses.
3. **Isolasi Role 2 Pintu:** Pastikan rute Admin (`/admin`) dan rute Klien (`/dashboard`) terisolasi 100% tanpa bypass.
4. **Zero Flashing / No Stale Fallback:** Tidak ada kedipan (*flash*) nilai fallback lama saat refresh cepat.
5. **Human Alignment Check:** Hasil kerja sesuai persis dengan apa yang disepakati bersama pengguna.
