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

## 2. Portal Kamera Momen Tamu (`/[slug]/sharemoment`)

### A. Layar Pembuka Ramah Tamu (*Guest Moment Opening Screen*)
Tamu yang mengakses tautan atau memindai QR Code tidak langsung disodori permintaan izin kamera (`getUserMedia`) yang mengejutkan, melainkan disambut oleh kartu sambutan digital (*Welcome Card*) dengan 3 pilihan tata letak yang dapat dipilih pengantin:
1. **`POLAROID_MINIMAL` (Vintage Polaroid):**
   Kartu bergaya kertas foto instan polaroid vintage lengkap dengan pin peniti klasik, pratinjau foto mempelai, badge tanggal acara, dan tombol kapsul elegan.
2. **`VINTAGE_FILM` (35mm Negative Strip):**
   Estetika rol film analog Kodak/Fujifilm klasik lengkap dengan lubang sprocket film, penomoran frame analog, dan stempel tanggal warna oranye retro.
3. **`MODERN_ELEGANT` (Dark Luxury Gold):**
   Kanvas *glassmorphism* bertema malam mewah dengan aksen emas hangat, tipografi serif minimalis, dan efek pendar halus.

> **Teks Instruksi Kustom (`memoriesCardInstruction`):**
> Pengantin dapat menyesuaikan pesan sambutan dan petunjuk penggunaan kamera tamu langsung dari dasbor (contoh: *"Abadikan momen candid terbaik Anda di pernikahan kami! Jepretan Anda akan langsung tersimpan di galeri kenangan digital kami."*).

---

### B. Pengalaman Kamera Analog Sekali Pakai (*Retro Disposable Camera Viewfinder*)
Setelah menekan tombol **"Buka Kamera"**, antarmuka bertransformasi menjadi kamera saku analog (*disposable camera*) yang interaktif (`DisposableCameraViewfinder.tsx`):
- **Bodi Kamera Fisik Klasik:** Bingkai saku bertekstur grip analog dengan kombinasi aksen emas/perak, tombol rana melingkar bertekstur, dan roda pemutar film virtual.
- **Simulasi Lampu Kilat (*Realistic Flash Burst*):** Efek layar kilat putih instan disertai suara petikan shutter mekanik via Web Audio API dan haptic vibration pada smartphone.
- **5 Preset Filter Film Analog:**
  - *Aura '90s:* Nada hangat bernuansa golden hour dan saturasi lembut.
  - *Heritage Romance:* Efek sepia klasik bertema romansa masa lalu.
  - *Botanical Mist:* Nada hijau pastel teduh cocok untuk pernikahan outdoor / garden.
  - *Cinema Noir:* Monokrom kontras tinggi yang mewah dan dramatis.
  - *Pure Daylight:* Warna asli alami tanpa distorsi, jernih dan tajam.
- **Penghitung Sisa Roll Film (*Analog Frame Counter*):**
  Layar bidik menampilkan indikator sisa jepretan tamu (misal: `10 / 10`) yang berkurang otomatis setiap kali tombol shutter ditekan.
- **Kompresi Klien Ringan (HTML5 Canvas to WebP):**
  Foto beresolusi tinggi dikompresi di peramban menjadi format WebP berbobot 300–500 KB sebelum dikirim ke endpoint `/api/public/memories/upload`, memastikan pengunggahan instan tanpa lag bahkan pada jaringan venue padat.
- **Antrean Offline & Resiliensi Jaringan:**
  Jika koneksi internet tamu terputus saat memotret, foto disimpan sementara di antrean memori lokal dan diunggah ulang secara otomatis begitu sinyal kembali stabil.

---

### C. Jadwal Multi-Sesi & Pembatas Kuota Cerdas (*Smart Quota Boundary Guard*)
Untuk menjaga ketersediaan kuota foto agar tidak terkuras habis di awal acara:
1. **Multi-Sesi Acara (Akad Nikah, Resepsi, After Party):**
   Kamera hanya dapat mengambil foto selama jendela waktu sesi yang telah dikonfigurasi aktif. Di luar jendela waktu sesi, kamera menampilkan kartu hitung mundur menuju jam pembukaan sesi berikutnya.
2. **Pembatasan Kuota Real-Time di Dasbor Pengantin:**
   Input kuota per sesi di dasbor klien dibatasi otomatis (`Math.min(input, maxAllowed)`) terhadap sisa kuota yang belum terpakai oleh sesi lain. Total seluruh alokasi sesi tidak pernah dapat melampaui `maxTotalPhotos` acara.
3. **Penyelarasan Cepat 1-Klik:**
   - Tombol *"Bagi Rata Kuota"* untuk membagi total kuota acara ke seluruh sesi secara proporsional.
   - Tombol *"Pakai Sisa (X)"* di tiap baris sesi untuk langsung mengalokasikan sisa kuota yang tersedia.
4. **Validasi Sisi Server (Backend Guard):**
   Endpoint `/api/client/invitations/[id]/memories` memvalidasi dan memotong alokasi sesi berlebih di level basis data, mencegah anomali kuota ganda.

---

### D. Kartu Cetak QR Meja & Standing Banner Resepsionis
Pengantin dapat mengunduh kartu panduan barcode siap cetak (`PrintableQRCardModal.tsx`):
- **4 Format Standar Percetakan:** A3 (Standing Easel Banner), A4 (Table Standee), A5 (Tent Card Meja Lipat), dan 4R (Mini Akrilik Meja).
- **Format 300 DPI Siap Cetak:** File PNG beresolusi ultra-tinggi yang dapat langsung dikirimkan ke percetakan atau vendor dekorasi pernikahan.

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
