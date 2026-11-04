# 🚫 STRICT ANTI-AI-SLOP PROTOCOL (ZERO-TOLERANCE)

Aturan ini bersifat **MUTLAK DAN MENGIKAT** bagi seluruh Agen AI yang bekerja pada repositori ini. Pelanggaran terhadap klausul di bawah dikategorikan sebagai defek kualitas kerja level kritis.

---

## 1. Zero Code Slop (Polusi Kode & Boilerplate Sampah)

1. **Dilarang Komentar Remeh / Obvious Narration:**
   - DILARANG menulis komentar yang sekadar membaca ulang baris kode di bawahnya (contoh: `// import express`, `// return result`, `// handle error`, `// render button`).
   - Komentar HANYA diizinkan jika mendokumentasikan alasan arsitektural non-obvious (*the WHY, never the WHAT*).
2. **Dilarang Wrapper & Abstraksi Spekulatif (Over-Engineering):**
   - JANGAN membuat helper class, adapter, atau utility function baru jika solusinya cukup dengan 1–3 baris kode bawaan TypeScript/JavaScript standar.
   - JANGAN membungkus kode dengan 5 lapis nullish coalescing atau fallback tiruan (`?? fallback ?? ""`) yang menyembunyikan akar inkonsistensi tipe data di database/API.
3. **Dilarang Komentar Zombi & Ekspektasi Fiksi:**
   - DILARANG meninggalkan `// TODO: Will implement later`, `// Optional future feature`, atau kode usang yang di-comment out. Jika tidak dipakai, hapus bersih.
4. **Dilarang Dummy Fallback Penutup Bug:**
   - DILARANG mengembalikan mock data palsu (`{ success: true, dummy: true }`) saat query DB atau panggilan API gagal. Biarkan error naik secara jujur.

---

## 2. Zero UI/UX & Design Slop (Estetika Generik Klise AI)

1. **Dilarang Skema Warna Generik AI:**
   - DILARANG menggunakan gradien ungu/indigo/violet klise ala template generik AI (`from-purple-600 to-indigo-600`).
   - Seluruh warna WAJIB bersumber dari CSS Design Tokens proyek (`var(--bg-dark)`, `var(--primary)`, `var(--accent)`, `color-mix(...)`).
2. **Dilarang Teks Salinan Klise AI (Corporate Filler Copy):**
   - DILARANG menggunakan teks klise seperti: *"Discover the magic"*, *"Seamlessly manage your..."*, *"Unlock your potential"*, *"Experience the next level of..."*.
   - Gunakan salinan teknis yang fungsional, langsung pada fungsi bisnis, dan berbahasa manusia lugas.
3. **Dilarang Perusakan CSS Cascade:**
   - DILARANG menerapkan class utility massal yang menimpa hierarki CSS spesifik (seperti transparansi watermark, canvas 100vh, atau padding scrollbar kustom).
4. **Dilarang OS Emojis di Professional SaaS UI:**
   - Pertahankan panduan SVG vector icon atau tipografi minimalis alih-alih OS emoji murahan.

---

## 3. Zero Conversational Slop (Basa-Basi, Sycophancy & Dongeng Hampa)

1. **Zero Platitudes & Pemanis Kata:**
   - DILARANG membuka atau menutup tanggapan dengan sanjungan atau basa-basi kosong (*"Pertanyaan luar biasa!"*, *"Dengan senang hati saya bantu!"*, *"Semoga harimu menyenangkan!"*).
   - Langsung ke substansi teknis dan fakta dingin.
2. **Zero Apology Loops:**
   - Jika ditegur atau terjadi kesalahan, DILARANG meminta maaf berlebihan (*"Saya memohon maaf yang sebesar-besarnya..."*).
   - Sajikan langsung: (1) letak kekeliruan faktual, (2) langkah perbaikan bedah, (3) bukti log pengujian setelah diperbaiki.
3. **Zero Dongeng Tanpa Bukti (Anti-Hallucinated Success):**
   - DILARANG menyatakan *"Sudah normal kembali"* tanpa mencantumkan output eksekusi terminal (exit code, durasi, status test) pada giliran yang sama.

---

## 4. Zero Execution Slop (Ketidakdisiplinan Tool)

1. **Surgical Edits Only:**
   - Wajib gunakan `replace_file_content` untuk perubahan spesifik.
   - DILARANG menimpa ulang seluruh berkas (`write_to_file`) pada berkas yang sudah ada hanya untuk modifikasi sebagian.
2. **Zero Scope Creep:**
   - DILARANG mengubah gaya format, merapikan indentation berkas lain, atau merefaktor modul di luar permintaan.
3. **Asumsi Uncommitted Work:**
   - Selalu asumsikan kode lokal user memiliki modifikasi penting yang belum di-commit.
   - DILARANG KERAS menjalankan perintah terminal destruktif seperti `git checkout <file>`, `git restore <file>`, atau `sed`.
