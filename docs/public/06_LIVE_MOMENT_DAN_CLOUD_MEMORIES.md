# DOKUMENTASI RESMI: LIVE MOMENT & CLOUD MEMORIES GALERI
**Luxenary Invite Platform — Portal Unggah Foto Tamu, Slideshow Proyektor Venue, & Cloud Memories**

Dokumen ini membedah arsitektur teknis modul **Live Moments & Cloud Memories** (`/[slug]/memories` & `/[slug]/sharemoment`), fitur interaktif yang memungkinkan para tamu mengabadikan dan mengunggah foto candid selama acara pernikahan secara langsung ke Cloudflare R2, serta menayangkannya pada layar proyektor venue.

---

## 1. Arsitektur Unggah Momen & Tayangan Proyektor

```mermaid
flowchart TD
    subgraph SmartphoneTamu [Tamu di Venue Acara]
        A[Scan QR Momen / Buka /[slug]/sharemoment] --> B[Ambil Foto dari Kamera Smartphone]
        B --> C[Kompresi Gambar Sisi Klien: Canvas HTML5]
        C --> D[POST /api/public/memories/upload]
    end
    
    subgraph StorageCloud [Cloudflare R2 Object Storage]
        D --> E[Simpan File Gambar: pub-r2.luxenary.com/memories/...]
        D --> F[Simpan Record ke Database: GuestMemory]
    end
    
    subgraph LayarVenue [Layar Proyektor / TV Venue & Galeri Web]
        F --> G[Portal Galeri: /[slug]/memories]
        G --> H[Story Highlights: 10 Lingkaran Momen Pilihan]
        G --> I[Grid Galeri Momen Seluruh Tamu]
        G --> J[Mode Fullscreen Slideshow Proyektor LED]
    end
```

---

## 2. Portal Unggah Momen Tamu (`/[slug]/sharemoment`)

Tamu dapat berkontribusi membagikan foto momen pernikahan dari sudut pandang mereka:
1. **Zero-Friction Access:**
   Tamu tidak perlu login atau membuat akun. Cukup memindai QR Code *"Bagikan Momen"* yang terpasang di meja acara atau tautan di dalam undangan digital.
2. **Kompresi Gambar Sisi Klien (*Client-Side Image Compression*):**
   - Foto dari kamera ponsel beresolusi tinggi (5–20 MB) dikompresi otomatis di browser tamu menjadi format WebP berbobot ringan (~300–500 KB).
   - Menghemat kuota internet tamu dan memastikan proses unggah selesai dalam waktu 1–2 detik di tengah jaringan venue yang padat.
3. **Pemberian Catatan / Pesan Momen:**
   Tamu dapat menyertakan nama pengirim dan caption singkat (contoh: *"Selamat menempuh hidup baru sahabatku!"*).

---

## 3. Galeri Kenangan Publik (`/[slug]/memories`)

Seluruh foto yang diunggah dikurasi dalam halaman galeri yang estetis:
- **Top Story Circles (Gaya Instagram Story):**
  Menampilkan 10 foto acak paling menarik dalam lingkaran interaktif di bagian atas halaman.
- **Masonry Grid Layout:**
  Foto-foto ditampilkan dalam susunan kisi bertingkat (*masonry*) modern dengan efek lightbox saat gambar diklik.
- **Informasi Pengirim:**
  Setiap kartu foto menampilkan nama tamu yang mengunggah dan waktu foto diambil.

---

## 4. Mode Live Slideshow untuk Proyektor / LED Screen

Di venue resepsi, panitia dapat membuka halaman galeri pada laptop yang terhubung ke proyektor atau videotron LED utama:
- **Tombol Fullscreen Proyektor:** Menghilangkan navigasi browser dan menampilkan layar hitam sinematik.
- **Auto-Cycle Animation:** Foto-foto berganti secara otomatis dengan efek transisi lembut (*fade transition*) setiap 5–7 detik.
- **Polling Foto Baru:** Sistem secara berkala memeriksa foto baru yang diunggah para tamu sehingga suasana pernikahan menjadi interaktif dan hidup.

---

## 5. Siklus Transisi Otomatis (`EVENT_FINISHED`)

- Ketika hari bahagia telah berlalu dan pengantin memperbarui status undangan menjadi `EVENT_FINISHED` (atau masa aktif galeri berlangsung), siapa pun yang membuka URL utama undangan `/[slug]` akan secara otomatis dialihkan (*auto-redirect*) ke halaman `/[slug]/memories`.
- Hal ini mengubah undangan digital menjadi album kenangan abadi yang dapat dinikmati kembali oleh keluarga dan sahabat hingga bertahun-tahun kemudian.
