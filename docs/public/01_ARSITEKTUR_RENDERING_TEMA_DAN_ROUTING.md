# DOKUMENTASI RESMI: ARSITEKTUR RENDERING TEMA & ROUTING PUBLIK
**Luxenary Invite Platform — Multi-Domain Resolution, Token Parsing, & Asset Optimization**

Dokumen ini membedah arsitektur teknis bagaimana platform Luxenary Invite menangani jutaan kunjungan tamu publik, membedakan rute multi-domain (Custom Domain, Subdomain, & Path Slug), serta mengompilasi tema HTML fisik menjadi tampilan visual yang dipersonalisasi.

---

## 1. Arsitektur Resolusi Multi-Domain & Routing

Sistem melayani undangan publik melalui 3 skema alamat URL yang berbeda namun diarahkan ke engine data terpadu:

```mermaid
flowchart TD
    subgraph RequestMasuk [Request Pengunjung / Tamu]
        A[Request Masuk via HTTP / HTTPS] --> B{middleware.ts: Analisis Host}
    end
    
    subgraph RouteResolution [Engine Resolusi URL]
        B -->|Host: wedding-andi-siti.com| C[Custom Domain: Cek DNS & Query DB by customDomain]
        B -->|Host: andi-siti.luxenary.com| D[Subdomain: Rewrite Internal ke /s/andi-siti]
        B -->|Host: luxenary.com/andi-siti| E[Path Slug: Direct Route ke /[slug]]
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

## 2. Resolusi Jalur URL

1. **Custom Domain (`https://wedding-andi-siti.com`):**
   - Host dievaluasi oleh `middleware.ts`. Jika bukan domain utama platform (`luxenary.com`), sistem memanggil resolver internal untuk mencocokkan field `customDomain` pada tabel `Invitation`.
   - Domain dilindungi sertifikat HTTPS otomatis via Caddy *On-Demand TLS*.
2. **Subdomain Sistem (`https://andi-siti.luxenary.com`):**
   - Middleware mengekstrak subdomain dari host header dan melakukan internal rewrite ke rute `/s/[subdomain]`.
3. **Path Slug Standar (`https://luxenary.com/andi-siti`):**
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
| `{{music_url}}` | `invitation.musicUrl` | `https://pub-r2.luxenary.com/audio/...` |
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
