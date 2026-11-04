---
trigger: always_on
---

# 🛡️ PROTOKOL INTEGRITAS AUDIT MUTLAK: ANTI-CURANG & ANTI-SKIP (ZERO-CHEATING POLICY)

Aturan ini bersifat **MUTLAK, TIDAK DAPAT DITAWAR, DAN HARGA MATI** bagi seluruh Agen AI dan LLM yang bekerja pada repositori ini. Pelanggaran terhadap protokol ini adalah kegagalan fatal dalam standar rekayasa perangkat lunak.

---

## 1. Definisi Tindakan "Kecurangan Audit" yang DILARANG KERAS (Zero Tolerance)

Agen dinyatakan **BERBUAT CURANG (CHEATING)** jika melakukan salah satu dari tindakan berikut:

1. **Laporan Selesai Palsu (Fake Completion):**
   - Menyatakan *"sudah bersih"*, *"sudah diperbaiki"*, atau *"sudah sinkron"* tanpa melakukan pengecekan fakta di file aslinya.
   - Mengklaim sesuatu bekerja hanya berdasarkan asumsi atau `tsc --noEmit` tanpa pengujian empiris.

2. **Jalan Pintas & Pembersihan Setengah Hati (Skipping / Surface-Level Edit):**
   - Hanya mengedit 1 file lokal tempat bug muncul, tetapi **melewatkan (*skip*)** file lain yang terikat (misal: mengubah alur Cron, tetapi membiarkan API Settings, UI Admin, Seeder Prisma, dan tabel database tetap memuat sisa kode lama).

3. **Rasionalisasi Sampah (Hallucinated Justification / Defending Dead Code):**
   - Menemukan kode janggal, setting mati, atau komentar aneh di codebase, lalu **MENGARANG CERITA atau membuat narasi bisnis palsu** untuk membenarkan keberadaan sampah tersebut, bukannya melacak riwayat Git dan membasminya.

4. **Meninggalkan Komentar Zombi (Zombie Comments & Ghost Code):**
   - Menghapus logika eksekusi kode tetapi **membiarkan komentar penjelasnya tertinggal**.
   - Komentar usang yang kontradiktif dengan sistem aktif adalah racun arsitektur yang WAJIB dihapus bersih.

5. **Mengabaikan Verifikasi Faktual Database:**
   - Menganggap database sudah bersih tanpa menjalankan query verifikasi riil melalui `psql`.

6. **Pembersihan Massal Berbasis String Pencarian (Blind String-Match Destruction):**
   - **DILARANG KERAS** menghapus kode secara massal hanya berdasarkan kecocokan string pencarian atau regex global.
   - String pencarian (`grep_search`) **HANYA** berfungsi sebagai alat investigasi dan pemetaan, **BUKAN** alat eksekusi penghapusan.
   - **Akar Risiko:** Pembersihan berbasis string rentan menghancurkan simbol, fungsi, atau variabel lain yang memiliki kemiripan nama atau prefix yang sama (contoh: menghapus `retention_account_days` berisiko merusak `retention_cleanup_days` atau `retention_order_days` jika dieksekusi secara string-match serakah).
   - Setiap baris yang akan dihapus **WAJIB DIINSPEKSI KONTEKSNYA SECARA MANUAL (`view_file`)** dan hanya diubah melalui pemotongan bedah spesifik (`replace_file_content`).

---

## 2. Rantai Wajib 5 Langkah Audit Total Tanpa Skip (Exhaustive Trace Loop)

Setiap kali melakukan pembersihan, refactoring, atau audit fitur, Agen **WAJIB MENJALANKAN 5 LANGKAH LENGKAP** ini tanpa melompati satu langkah pun:

### Langkah 1 — Pelacakan Simbol Total (`grep_search` Lintas Repositori)
- Sebelum dan sesudah mengedit, cari seluruh kemunculan simbol, nama setting, atau komentar terkait di seluruh folder proyek.
- Dilarang berasumsi sebuah setting hanya ada di satu tempat.

### Langkah 2 — Inspeksi Baris Nyata Sebelum Menyentuh Kode (`view_file`)
- Periksa baris sebelum dan sesudah area target untuk memahami konteks sebenarnya.
- Dilarang melakukan *blind-replacement* tanpa membaca file aktual.

### Langkah 3 — Eksekusi Bedah Bersih (Surgical Clean + Hapus Komentar Usang)
- Hapus kode yang tidak terpakai BESERTA seluruh komentar-komentar usang peninggalannya.
- Dilarang meninggalkan komentar spekulatif, catatan AI, atau narasi palsu di dalam file produksi.

### Langkah 4 — Sinkronisasi 4 Layer Arsitektur Wajib Seimbang
Setiap perubahan logika data wajib disinkronkan secara konsisten di seluruh 4 layer:
1. **Layer Database:** Tabel riil PostgreSQL (verifikasi dengan query langsung).
2. **Layer Skema & Seeder:** `prisma/schema.prisma` dan `prisma/defaultSettings.ts`.
3. **Layer Backend API:** Route handlers (`app/api/...`).
4. **Layer Frontend UI:** Form dan tampilan antarmuka (`app/...`).

### Langkah 5 — Gerbang Bukti Empiris (Empirical Verification Gate)
Sebelum menyatakan pekerjaan selesai kepada pengguna, Agen **WAJIB** menyajikan 3 bukti konkret dari log terminal:
1. **Bukti Grep Bersih:** Output `grep_search` membuktikan simbol mati = 0 match.
2. **Bukti Query Database:** Output `psql` membuktikan tabel DB bersih dari row mati.
3. **Bukti TypeScript Gate:** Output `npx tsc --noEmit` dengan Exit Code 0.

---

## 3. Protokol Saat Menemukan Kode/Komentar Janggal

Jika Agen menemukan kode, komentar, atau alur yang kontradiktif atau meragukan:
1. **DILARANG MENGARANG:** Jangan sekali-kali berasumsi atau membuat cerita rekaan bisnis.
2. **TRACE FAKTA VIA GIT LOG:** Jalankan perintah `git log -S "<kata_kunci>" -p` untuk memeriksa kapan dan mengapa baris itu tercipta.
3. **SAMPAIKAN FAKTA LUGAS:** Laporkan temuan riil (nama file, nomor baris, commit ID, dan pesan commit) kepada pengguna secara dingin, jujur, dan objektif tanpa rasa sungkan.
