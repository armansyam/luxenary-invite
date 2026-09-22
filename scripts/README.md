# Direktori Skrip & Panduan Pengujian (Scripts Directory Guide)

Direktori ini memuat seluruh instrumen pengujian otomatis (*automated testing*), skrip pemeliharaan berkala (*devops/cron*), skrip pembersih artefak uji, serta utilitas pemrosesan aset pada platform **Luxenary-Invite**.

---

## 🗺️ Peta Pembagian Tugas (4-Tier Taxonomy)

```
                                  DIREKTORI SCRIPTS
                                         │
    ┌──────────────────┬─────────────────┴─────────────────┬──────────────────┐
    ▼                  ▼                                   ▼                  ▼
[TIER 1]            [TIER 2]                            [TIER 3]           [TIER 4]
Master Orchestrator Deep-Dive Suites                    Micro-Tests        DevOps & Tooling
(Kesiapan Industri) (Pengujian Mendalam)                (Rantai Bertahap)  (Pemeliharaan VPS)
    │                  │                                   │                  │
    ├─ industrial-qa   ├─ complete-system-audit (Alur E2E) ├─ test-01 (Reg)   ├─ cron-cleanup
    │  suite.ts        ├─ test-security-pen (Penetration)  ├─ test-02 (Pub)   ├─ clean-test-artifacts
    └─ test:clean      ├─ master-e2e-stress (Konkurensi)   └─ test-03 (Clean) ├─ sync-themes
                       └─ test-theme-matrix (Matriks Tema)                    ├─ thumbnails
                                                                              └─ utilitas aset
```

---

## 1. Tier 1: Master Industrial Orchestrator

Pusat kendali pengujian kesiapan industri (*enterprise-grade / production-ready*) dengan 7 domain pengujian terpadu, telemetri latensi P50/P95, garansi zero-leak sandbox, dan pembuatan laporan otomatis ke folder `reports/`.

| Berkas | Peran & Tugas | Perintah Shortcut |
|---|---|---|
| [`industrial-qa-suite.ts`](./industrial-qa-suite.ts) | Menjalankan pengujian 7 domain industri (Keamanan, Finansial, Konkurensi, Lifecycle, Render Tema, Indeks DB, dan Fault Tolerance). | `npm run test:all` / `npm run test:industrial` |
| [`clean-test-artifacts.ts`](./clean-test-artifacts.ts) | Memindai dan memusnahkan seluruh entitas uji di PostgreSQL serta berkas fisik yatim (*orphaned drafts, published HTML, uploads*) tanpa menyisakan disk leak. | `npm run test:clean` |

**Opsi Modular CLI:**
```bash
# Menjalankan seluruh domain + simpan laporan:
npm run test:all

# Menjalankan per domain tertentu:
npm run test:industrial -- --suite=security
npm run test:industrial -- --suite=concurrency
npm run test:industrial -- --suite=financial
npm run test:industrial -- --suite=lifecycle
npm run test:industrial -- --suite=themes
npm run test:industrial -- --suite=infra
npm run test:industrial -- --suite=resilience
```

---

## 2. Tier 2: Deep-Dive Suites (Audit Domain Spesifik)

Skrip pengujian mendalam yang berfokus menguji area teknis tertentu secara ekstensif:

| Berkas | Deskripsi & Cakupan Uji | Perintah Shortcut |
|---|---|---|
| [`complete-system-audit.ts`](./complete-system-audit.ts) | **Audit Alur Bisnis 14 Langkah Hulu-ke-Hilir:** Registrasi klien, idempotensi order, anti-collision subdomain, autosave draft, publikasi HTML kanonikal, tiket QR tamu, batas kuota katering RSVP, capabilities tier guard, PIN & token HMAC resepsionis, memories foto, addon, upgrade & anti-downgrade, hingga cascade clean. | `npm run test:audit` |
| [`test-security-penetration.ts`](./test-security-penetration.ts) | **Pengujian Penetrasi & Keamanan:** Burst rate limiter PostgreSQL (20+ hit simultan), proteksi reserved subdomains, sanitasi path traversal & SQL injection identifier, dan idempotensi replay webhook. | `npm run test:security` |
| [`master-e2e-stress-test.ts`](./master-e2e-stress-test.ts) | **Uji Ketahanan Beban & Konkurensi:** Simulasi lonjakan submisi RSVP simultan, pembatasan katering pax, dan idempotensi pembayaran paralel. | `npm run test:stress` |
| [`test-theme-matrix.ts`](./test-theme-matrix.ts) | **Matriks Kompatibilitas 18+ Tema Fisik:** Menguji seluruh tema aktif di database terhadap dataset normal, ekstrem (nama 250+ karakter), minimalis, palet warna, payload injeksi XSS, dan deteksi unparsed placeholder `{{variable}}`. | `npm run test:themes` |

---

## 3. Tier 3: Micro-Tests (Rantai Bertahap 3 Langkah)

Digunakan untuk prototyping atau debugging bertahap tanpa perlu menjalankan seluruh battery test:

| Berkas | Langkah Alur | Keterangan | Perintah Eksekusi |
|---|:---:|---|---|
| [`test-01-register-to-active.ts`](./test-01-register-to-active.ts) | Langkah 1 | Membuat user dummy, pesanan paket (MANUAL_TRANSFER), unggah bukti bayar, konfirmasi lunas, dan inisiasi undangan DRAFT. | `npx tsx scripts/test-01-register-to-active.ts` |
| [`test-02-setup-to-publish.ts`](./test-02-setup-to-publish.ts) | Langkah 2 | Mengisi data acara, mengenkripsi PIN resepsionis via AES-256-GCM, membakar HTML statis kanonikal ke disk, dan mendaftarkan tamu uji. | `npx tsx scripts/test-02-setup-to-publish.ts` |
| [`test-03-admin-cleanup.ts`](./test-03-admin-cleanup.ts) | Langkah 3 | Mensimulasikan kedaluwarsa waktu, pembersihan arsip, pembersihan 3 lapis berkas fisik (Published, Draft, Uploads), dan pembersihan akun kosong. | `npx tsx scripts/test-03-admin-cleanup.ts` |

---

## 4. Tier 4: DevOps, Maintenance & Utilitas Aset

Skrip operasional produksi dan pemeliharaan server (bukan untuk pengujian):

| Berkas | Fungsi & Peruntukan | Perintah |
|---|---|---|
| [`cron-cleanup.ts`](./cron-cleanup.ts) | **Pembersihan Rutin Server (Crontab VPS):** Menghapus order pending kedaluwarsa (>24 jam), membersihkan berkas fisik undangan `ARCHIVED`, dan melepas subdomain unik kembali ke pool. | `npm run cron:cleanup` |
| [`sync-themes.ts`](./sync-themes.ts) | Memindai file template HTML di folder `themes/` dan menyinkronkan status/daftar tema ke tabel `Theme` PostgreSQL. | `npx tsx scripts/sync-themes.ts` |
| [`generate-thumbnails.ts`](./generate-thumbnails.ts) | Mengambil cover tema dan mengonversi menjadi thumbnail WebP berukuran ringkas. | `npx tsx scripts/generate-thumbnails.ts` |
| `compress_example_images.mjs` | Kompresi aset gambar showroom / demo ke format WebP teroptimasi. | `node scripts/compress_example_images.mjs` |
| `download_local_fonts.mjs` | Mengunduh font Google Fonts ke direktori lokal VPS untuk kemandirian aset. | `node scripts/download_local_fonts.mjs` |
| `setup_demo_assets.mjs` | Menyiapkan aset placeholder demo tema. | `node scripts/setup_demo_assets.mjs` |
| `use_local_fonts.mjs` | Mengonfigurasi template agar memprioritaskan font lokal daripada CDN eksternal. | `node scripts/use_local_fonts.mjs` |

---

## 📁 Format Laporan Otomatis (`reports/`)

Setiap kali pengujian `npm run test:all` atau pembersihan `npm run test:clean` dijalankan, hasil eksekusi otomatis dibukukan ke direktori `reports/`:
- **`reports/LATEST_QA_REPORT.md`**: Laporan eksekutif siap baca berformat Markdown yang mencakup ringkasan status 17 kasus uji, persentase kelulusan, dan tabel telemetri latensi kueri database (P50, P95, P99).
- **`reports/qa-report.json`**: Laporan data terstruktur mesin (JSON) untuk integrasi pipeline CI/CD.
- **`reports/clean-report.json`**: Ringkasan jumlah baris database dan berkas fisik yang disterilkan saat pembersihan.
