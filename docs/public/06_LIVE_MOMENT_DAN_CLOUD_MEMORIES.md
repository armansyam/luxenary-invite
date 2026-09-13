# DOKUMENTASI RESMI: LIVE MOMENT & CLOUD MEMORIES GALERI
**Luxenary Invite Platform — Portal Unggah Foto Tamu & Cloud Memories**

Dokumen ini membedah arsitektur teknis modul **Live Moments & Cloud Memories** (`/[slug]/memories` & `/[slug]/sharemoment`), fitur interaktif yang memungkinkan para tamu mengabadikan dan mengunggah foto candid selama acara pernikahan secara langsung ke Cloudflare R2, lalu menikmatinya bersama di galeri kenangan digital yang hidup secara *real-time*.

---

## 1. Arsitektur Unggah Momen & Galeri Real-Time

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
    
    subgraph GaleriWeb [Galeri Kenangan Web]
        F --> G[Portal Galeri: /[slug]/memories]
        G --> H[Story Highlights: 10 Lingkaran Momen Pilihan]
        G --> I[Grid Galeri Momen Seluruh Tamu]
        F --> K[SSE Broadcast: Notifikasi Momen Baru ke Galeri]
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
3. **Pemberian Catatan, Ucapan & Cerita Momen (`story`):**
   - Tamu dapat menyertakan nama pengirim dan nomor telepon (opsional).
   - Dilengkapi bidang input *textarea* cerita/ucapan doa di balik foto momen (contoh: *"Momen haru saat sungkeman, bahagia selalu sahabatku!"*). Cerita ini disimpan ke database dan ditampilkan di bawah foto pada tampilan lightbox galeri.

---

## 3. Galeri Kenangan Publik (`/[slug]/memories`)

Seluruh foto yang diunggah dikurasi dalam halaman galeri yang estetis:
- **Top Story Circles (Gaya Instagram Story):**
  Menampilkan 10 foto acak paling menarik dalam lingkaran interaktif di bagian atas halaman.
- **Fluid Masonry Grid (`max-w-[1920px]`):**
  Foto-foto ditampilkan dalam susunan kisi bertingkat (*masonry*) modern yang mengisi layar secara proporsional.
- **Clean Touch-Swipe & Keyboard Lightbox Navigation:**
  Saat foto diklik, modal lightbox layar penuh terbuka tanpa dialog native browser:
  - Di perangkat layar sentuh (smartphone): Mendukung navigasi geser jari (*touch-swipe left/right*) 60 FPS.
  - Di komputer/laptop: Mendukung tombol panah keyboard (`ArrowLeft`, `ArrowRight`, dan `Escape` untuk menutup).
- **Informasi Pengirim & Cerita:**
  Setiap kartu foto menampilkan nama tamu yang mengunggah, tanggal/jam pengambilan, serta cerita/pesan doa yang dituliskan.

---

## 4. Notifikasi Real-Time via SSE (Server-Sent Events)

Halaman galeri `/[slug]/memories` berlangganan ke endpoint `/api/sse/memories` secara otomatis:
- **Toast Notifikasi:** Ketika ada foto baru yang diunggah tamu, sebuah notifikasi muncul di bagian bawah galeri: *"Ada X Momen Baru! Klik untuk memuat"*.
- **Tanpa Refresh Manual:** Pengunjung galeri langsung mengetahui ada momen baru tanpa perlu me-refresh halaman.
- **Satu SSE Stream per Undangan:** Setiap `invitationId` memiliki channel SSE-nya sendiri agar tidak ada silang data antar undangan.

---

## 5. Siklus Transisi Otomatis (`EVENT_FINISHED`)

- Ketika hari bahagia telah berlalu dan pengantin memperbarui status undangan menjadi `EVENT_FINISHED` (atau masa aktif galeri berlangsung), siapa pun yang membuka URL utama undangan `/[slug]` akan secara otomatis dialihkan (*auto-redirect*) ke halaman `/[slug]/memories`.
- Hal ini mengubah undangan digital menjadi album kenangan abadi yang dapat dinikmati kembali oleh keluarga dan sahabat hingga bertahun-tahun kemudian.
