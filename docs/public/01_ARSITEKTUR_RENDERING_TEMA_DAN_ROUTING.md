# DOKUMENTASI RESMI: ARSITEKTUR RENDERING TEMA & ROUTING PUBLIK
**Luxenary Invite Platform — Multi-Domain Resolution, Token Parsing, & Asset Optimization**

Dokumen ini membedah arsitektur teknis bagaimana platform Luxenary Invite menangani jutaan kunjungan tamu publik, membedakan rute multi-domain (Custom Domain, Subdomain, & Path Slug), serta mengompilasi tema HTML fisik menjadi tampilan visual yang dipersonalisasi.

---

## 1. Arsitektur Resolusi Multi-Domain & Routing

Sistem melayani undangan publik melalui 3 skema alamat URL yang berbeda namun diarahkan ke engine data terpadu:

```mermaid
flowchart TD
    subgraph RequestMasuk [Request Pengunjung / Tamu]
        A[Request Masuk via HTTP / HTTPS] --> B{middleware.ts: Analisis Host & Subdomain}
    end
    
    subgraph StrictSubdomainGuard [Pilar Isolasi Subdomain]
        B -->|Subdomain demo| B1[307 Redirect: luxvite.id/demo]
        B -->|Subdomain Reserved: app, login, dll| B2[307 Redirect: luxvite.id/pathname]
        B -->|Platform Path di Subdomain Klien: /packages, /login, dll| B3[307 Redirect: Lepas Subdomain ke luxvite.id/pathname]
        B -->|Subdomain Kosong / Tak Terdaftar| B4[307 Redirect: luxvite.id/?notice=subdomain-available]
    end
    
    subgraph RouteResolution [Engine Resolusi URL Undangan]
        B -->|Host: wedding-andi-siti.com| C[Custom Domain: Cek DNS & Query DB by customDomain]
        B -->|Host: andi-siti.luxvite.id| D[Subdomain Klien: Eksklusif 5 Rute Acara Rewrite ke /s/andi-siti]
        B -->|Host: luxvite.id/andi-siti| E[Path Slug Kanonikal: Direct Route ke /[slug]]
    end
    
    subgraph TemplateCompiler [Engine Kompilasi Tema Fisik]
        C & D & E --> F[Fetch Record: prisma.invitation.findUnique]
        F --> G{Status Undangan}
        G -->|PUBLISHED| H[Load File Master: themes/:category/:themeId/index.html]
        G -->|EVENT_FINISHED| I[Redirect ke /slug/memories]
        G -->|ARCHIVED| J[Redirect ke /portfolio/slug atau Halaman Graceful Expired]
        
        H --> K[Token Replacement: {{groom_name}}, {{event_date}}, dll]
        K --> L[Injeksi Dynamic Color Palette CSS Variables]
        K --> M[Injeksi Google Fonts & Open Graph Meta]
        K --> N[Penyuntikan Personalisasi Tamu: ?to=Nama+Tamu]
        
        N --> O[Kirim Response HTML ke Browser Tamu]
    end
```

---

## 2. Resolusi Jalur URL & Strict Subdomain Isolation Guard

1. **Custom Domain (`https://wedding-andi-siti.com`):**
   - Host dievaluasi oleh `middleware.ts`. Jika bukan domain utama platform (`luxvite.id`), sistem memanggil resolver internal untuk mencocokkan field `customDomain` pada tabel `Invitation`.
   - Menggunakan cache in-memory TTL 5 menit untuk mencegah amplifikasi self-fetch request.
   - Domain dilindungi sertifikat HTTPS otomatis via Caddy *On-Demand TLS*.
2. **Subdomain Klien (`https://andi-siti.luxvite.id`):**
   - Dilindungi oleh **Strict Subdomain Isolation Guard**:
     - **Pelepasan Jalur Platform:** Jika tamu/klien membuka rute platform resmi (`/packages`, `/checkout`, `/login`, `/dashboard`, `/admin`, `/contact`, `/terms`, `/privacy`, `/refund`, `/how-it-works`, `/demo`, `/portfolio`), middleware otomatis melepaskan subdomain dan me-redirect (HTTP 307) ke `https://luxvite.id/{path}`.
     - **Eksklusif 5 Rute Acara:** Subdomain klien hanya melayani 5 endpoint undangan: Beranda Utama (`/`), Tamu Personal (`/{guest}` atau `/?to=`), Galeri Kenangan (`/memories`), Meja Resepsionis (`/receptionist`), dan Kamera Momen Tamu (`/sharemoment`).
     - **Pencegahan URL Collision:** Mencegah rute seperti `/packages` disalahartikan sebagai nama tamu undangan (`?to=packages`).
3. **Subdomain Sistem Terproteksi:**
   - `demo.luxvite.id` otomatis dialihkan (HTTP 307) ke katalog resmi `https://luxvite.id/demo`.
   - Subdomain cadangan sistem (`www`, `app`, `login`, `dashboard`, dll.) otomatis dialihkan (HTTP 307) ke apex domain `https://luxvite.id${pathname}`.
   - Subdomain kosong/kedaluwarsa otomatis dialihkan ke `https://luxvite.id/?notice=subdomain-available`.
4. **Path Slug Standar (`https://luxvite.id/andi-siti`):**
   - Ditangani langsung oleh Route Handler `app/(public)/[slug]/route.ts`.

---

## 3. Kompilator Tema & Token Replacement

Platform mematuhi prinsip **Single Source of Truth** di mana master tema tersimpan dalam bentuk berkas fisik `.html` di direktori `themes/`. Saat tamu memuat undangan, template dikompilasi secara dinamis:

### Placeholder Token yang Dikenali:
| Token Template | Sumber Data Faktual | Contoh Nilai Hasil |
|---|---|---|
| `{{groom_nickname}}` | `invitation.groomNickname` | Andi |
| `{{bride_nickname}}` | `invitation.brideNickname` | Siti |
| `{{groom_fullname}}` | `invitation.groomName` | Andi Pratama, S.T. |
| `{{bride_fullname}}` | `invitation.brideName` | Siti Nurhaliza, S.E. |
| `{{event_date_formatted}}`| `invitation.events[0].date` | Minggu, 15 Oktober 2026 |
| `{{music_url}}` | `invitation.musicUrl` | `https://pub-r2.luxvite.id/audio/...` |
| `{{recipient_name}}` | Query Parameter `?to=` | Bpk. Dr. H. Bambang |

---

## 4. Injeksi Dinamis Palet Warna & Font

Untuk mempertahankan identitas desain tanpa perlu membangun file CSS terpisah untuk setiap klien:
1. **Dynamic CSS Variables Injection:**
   Compiler menyuntikkan blok variabel warna tepat sebelum tag `</head>`:
   ```html
   <style id="lux-dynamic-palette">
     :root {
       --primary: #1e3a8a;
       --accent: #f59e0b;
       --surface: #f8fafc;
       --text-main: #0f172a;
     }
   </style>
   ```
2. **Dynamic Google Fonts Injection:**
   Tag `<link rel="stylesheet">` dari Google Fonts dimuat secara asinkron (`preload`) agar teks tampil mewah dengan performa kecepatan halaman (Google PageSpeed) 95+.

---

## 5. Metadata Open Graph & Rich Preview Sosial Media

Saat tautan undangan dibagikan ke WhatsApp, Telegram, atau Facebook:
- Sistem menyuntikkan tag meta `og:image`, `og:title`, dan `og:description`.
- WhatsApp menampilkan kartu pratinjau mewah bergambar foto kedua mempelai dan judul:
  *"Pernikahan Andi & Siti — Undangan Spesial untuk Anda"*.
