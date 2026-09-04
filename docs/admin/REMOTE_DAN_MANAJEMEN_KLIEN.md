# PANDUAN ARSITEKTUR & OPERASIONAL: REMOTE DASBOR KLIEN & MANAJEMEN KLIEN
**Luxenary Invite Platform — Dokumentasi Resmi Admin Control Panel**

Dokumen ini adalah referensi resmi untuk arsitektur teknis, protokol keamanan, dan tata cara operasional dari **Fitur Remote Dasbor Klien (Impersonate)** serta **Manajemen Akun Klien & Siklus Hidup Undangan** pada Control Panel Administrator (`/admin`).

---

## DAFTAR ISI
1. [Filosofi & Latar Belakang Desain](#1-filosofi--latar-belakang-desain)
2. [Diagram Alur End-to-End Remote Klien](#2-diagram-alur-end-to-end-remote-klien)
3. [Spesifikasi Teknis: Cookie-Based Workspace Override](#3-spesifikasi-teknis-cookie-based-workspace-override)
4. [Alur Eksekusi Hulu-ke-Hilir (Code Tracing)](#4-alur-eksekusi-hulu-ke-hilir-code-tracing)
5. [Manajemen Klien & Siklus Hidup Undangan](#5-manajemen-klien--siklus-hidup-undangan)
6. [Analisis Keamanan & Mitigasi Risiko](#6-analisis-keamanan--mitigasi-risiko)
7. [Panduan Langkah Demi Langkah bagi Tim Admin / CS](#7-panduan-langkah-demi-langkah-bagi-tim-admin--cs)

---

## 1. Filosofi & Latar Belakang Desain

### A. Kebutuhan Bantuan Klien (Zero-Password Support)
Dalam operasional SaaS undangan digital pernikahan, klien sering kali mengalami kesulitan teknis—seperti bingung mengatur denah acara, keliru mengisi data bank/rekening amplop, atau membutuhkan verifikasi tampilan sebelum dicetak pada undangan fisik. 
* **Prinsip Privasi:** Tim Support/Admin **DILARANG KERAS** meminta password atau akses akun Google calon pengantin.
* **Solusi Elegan:** Fitur *Remote Dasbor Klien* memungkinkan Admin langsung mengenakan "kacamata" klien untuk melihat dan mengoperasikan dasbor persis sebagaimana klien melihatnya.

### B. Mengapa Bukan Token URL / Re-login NextAuth?
Percobaan lama yang memaksakan pergantian JWT token via `signIn("credentials", { portal: "IMPERSONATE" })` atau `update()` di sisi browser selalu rentan terhadap:
1. *Race Condition*: Browser melakukan redirect sebelum JWT di server selesai diperbarui.
2. *Session Destruction*: Sesi login Admin asli terhapus, memaksa Admin login ulang dengan password setiap kali selesai membantu klien.
3. *NextAuth Dual-Gate Collision*: Middleware dan callback `authorized()` mendeteksi akun Admin mencoba membuka `/dashboard` dan otomatis menendang Admin ke `/login`.

### C. Solusi Faktual: Cookie-Based Workspace Override
Sistem menggunakan **Cookie Sesi Dinamis** (`lux_remote_client_id`) yang beroperasi di layer HTTP server:
* Token JWT Admin asli **100% utuh dan tidak dimutasi**.
* Middleware dan AuthConfig memberikan bypass gerbang `/dashboard` jika Admin memegang cookie remote.
* Callback `session` di server memetakan identitas target klien ke `session.user` secara dinamis, sehingga seluruh kueri database pada ratusan API klien (`/api/client/**`) menyajikan data klien target secara transparan.

---

## 2. Diagram Alur End-to-End Remote Klien

```mermaid
flowchart TD
    A[Admin di /admin: Klik Tombol Remote] -->|Kirim clientId| B[Server Action: startRemoteSession]
    
    subgraph Server Action & Gateway
        B --> C{Verifikasi auth()}
        C -->|Bukan Admin| D[Tolak: Unauthorized Error]
        C -->|Admin Sah| E[Cek Klien di DB: prisma.user.findUnique]
        E --> F[Tulis Cookie: lux_remote_client_id]
        F --> G[redirect /dashboard dari Server]
    end
    
    subgraph Layer Gerbang
        G --> H[middleware.ts: Periksa Path & Cookie]
        H -->|isAdmin + lux_remote_client_id| I[Loloskan ke /dashboard]
        G --> J[auth.config.ts: authorized callback]
        J -->|isAdmin + lux_remote_client_id| I
    end
    
    subgraph Layer Dasbor & API Klien
        I --> K[Render: app/client/dashboard/layout.tsx]
        K --> L[Fetch: GET /api/admin/remote-session]
        L --> M[Nyalakan Banner Merah: MODE REMOTE AKTIF]
        
        K --> N[Client Components Memanggil /api/client/**]
        N --> O[auth.ts: session callback mendeteksi cookie]
        O --> P[Petakan session.user.id = clientId, email = clientEmail]
        P --> Q[API Klien Memuat Data Undangan/Tamu Milik Klien Target]
    end
    
    subgraph Pemulihan Sesi 1-Klik
        M --> R[Admin Klik: Kembali ke Admin]
        R --> S[Fetch: DELETE /api/admin/remote-session]
        S --> T[Hapus Cookie: lux_remote_client_id]
        T --> U[Redirect: window.location.href = /admin]
        U --> V[Sesi Admin Otomatis Pulih 100%]
    end
```

---

## 3. Spesifikasi Teknis: Cookie-Based Workspace Override

### A. Rincian Cookie
| Properti | Nilai Faktual | Keterangan |
|---|---|---|
| **Nama Cookie** | `lux_remote_client_id` | Penanda ID Klien yang sedang di-remote oleh Admin |
| **HttpOnly** | `true` | Tidak dapat dibaca atau dimanipulasi oleh skrip JavaScript di browser |
| **Secure** | `true` pada production (`process.env.NODE_ENV === "production"`) | Hanya dikirim melalui protokol HTTPS |
| **SameSite** | `lax` | Mencegah eksploitasi CSRF lintas situs |
| **Path** | `/` | Berlaku di seluruh rute aplikasi (middleware, API, dan dasbor) |
| **Masa Berlaku (MaxAge)**| `3600` (1 Jam) | Otomatis hangus jika Admin meninggalkan sesi tanpa logout manual |

### B. Struktur Objek Sesi Saat Mode Remote
Saat mode remote aktif, callback `session` di [`auth.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/auth.ts) menghasilkan struktur data berikut pada sisi server:
```typescript
session.user = {
  id: clientUser.id,              // ID Klien target (kunci kueri Prisma di API klien)
  email: clientUser.email,        // Email Klien target
  name: clientUser.name,          // Nama Klien target
  role: clientUser.role,          // Role Klien ("CLIENT")
  isAdmin: true,                  // Tetap true agar izin bypass/operasi Admin tetap valid
  isRemote: true,                 // Flag penanda bahwa sesi sedang di-remote
  originalAdminId: token.id,      // Jejak ID Admin asli untuk audit log
}
```

---

## 4. Alur Eksekusi Hulu-ke-Hilir (Code Tracing)

### Langkah 1: Inisiasi Sesi dari UI Admin
Admin dapat memulai sesi remote melalui 3 pintu masuk di [`app/(admin)/admin/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/(admin)/admin/page.tsx):
1. **Tabel Undangan:** Ikon monitor pada kolom *Aksi*.
2. **Tabel Daftar Klien:** Ikon monitor di samping tombol *Kelola Klien*.
3. **Modal Kelola Klien:** Tombol utama *"Remote Dasbor Klien Ini"*.

Semua pintu masuk mengeksekusi handler:
```typescript
const handleImpersonateClient = async (clientId: string, clientEmail: string, clientName: string) => {
  setImpersonatingClient(true);
  await startRemoteSession(clientId); // Server Action
};
```

### Langkah 2: Server Action (`app/(admin)/admin/actions/remote.ts`)
* Berjalan murni di server (Node.js runtime).
* Mengambil sesi pemanggil via `await auth()`.
* Memastikan `isAdmin === true`.
* Memastikan ID Klien valid di database.
* Menulis cookie `lux_remote_client_id` ke header respons HTTP.
* Memanggil `redirect("/dashboard")` dari server.

### Langkah 3: Gerbang Edge Middleware & AuthConfig
* **`auth.config.ts`**:
  ```typescript
  if (pathname.startsWith("/dashboard")) {
    if (isAdmin) {
      const remoteClientId = request.cookies.get("lux_remote_client_id")?.value;
      if (remoteClientId) return true; // Loloskan
      return false;
    }
    ...
  }
  ```
* **`middleware.ts`**:
  ```typescript
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/packages") || pathname.startsWith("/checkout")) {
    const remoteClientId = req.cookies.get("lux_remote_client_id")?.value;
    if (isAdmin && remoteClientId) {
      return NextResponse.next(); // Loloskan
    }
    ...
  }
  ```

### Langkah 4: Resolusi Transparan pada API Klien
Setiap kali dasbor memanggil API internal (misalnya `fetch("/api/client/invitations")`), endpoint membaca sesi via `await auth()`:
* Callback `session` di `auth.ts` membaca `cookies()` dari `next/headers`.
* Karena cookie `lux_remote_client_id` ditemukan, identitas `session.user` diarahkan ke data Klien.
* Database kueri `prisma.invitation.findMany({ where: { userId: user.id } })` langsung mengambil undangan sah milik Klien tersebut.

### Langkah 5: Tampilan Banner & Proteksi Onboarding Layout
Di [`app/(client)/dashboard/layout.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/(client)/dashboard/layout.tsx):
1. **Banner Merah Berdenyut:**
   Mengambil data via `GET /api/admin/remote-session` dan menampilkan:
   *"MODE REMOTE AKTIF: Anda sedang mengendalikan dashboard milik [Nama Klien]"* lengkap dengan tombol *"Kembali ke Admin"*.
2. **Bypass Tendangan Onboarding:**
   Proteksi cek transaksi (`/api/client/onboarding-state`) otomatis di-bypass jika `session.user.isAdmin` atau `remoteInfo.isRemote` bernilai `true`, sehingga Admin tidak pernah terlempar ke `/onboarding` meskipun klien belum lunas atau masih berstatus draft.

### Langkah 6: Pemulihan Bersih (Restore 1-Klik)
Saat Admin mengklik *"Kembali ke Admin"*:
1. Browser mengirim `DELETE /api/admin/remote-session`.
2. Endpoint menghapus cookie `lux_remote_client_id`.
3. Browser diarahkan kembali ke `/admin` via `window.location.href = "/admin"`.
4. Karena cookie remote telah terhapus, callback `session` kembali menyajikan data Admin asli. Tidak ada sesi yang rusak, tidak ada login ulang.

---

## 5. Manajemen Klien & Siklus Hidup Undangan

Di samping fitur Remote, Admin Control Panel mengelola siklus hidup akun klien dan undangan pernikahan:

### A. Status Siklus Hidup Undangan
| Status | Penjelasan & Hak Akses |
|---|---|
| `DRAFT` | Undangan baru dibuat atau belum dipublikasikan. Hanya dapat dilihat oleh pemilik di dasbor atau Admin. Belum dapat diakses publik. |
| `PUBLISHED` | Undangan telah aktif dan dapat diakses tamu via subdomain (`namapasangan.luxenary.id`) atau custom domain. |
| `EXPIRED` | Masa aktif retensi undangan telah habis (`Tanggal Acara + retention_invitation_days`). Subdomain dapat didaur ulang. |
| `CLOSED_TO_GALLERY` | Undangan ditutup dan dikonversi menjadi galeri kenangan tamu mandiri (`/memories`). Tampilan resepsi dinonaktifkan. |

### B. Fitur Kunci Darurat (Emergency Unlock)
* **Aturan Kunci D-Day:** Saat hari H pernikahan tiba (`today >= eventDate`), daftar tamu otomatis terkunci di sisi klien untuk mencegah penambahan data ganda di luar pantauan panitia resepsionis.
* **Logika UI Admin:** Tombol *Buka Kunci Darurat* hanya muncul jika sistem mendeteksi undangan telah terkunci permanen. Jika undangan masih `DRAFT` atau "Bisa Diedit", tombol ini disembunyikan untuk menjaga tampilan bersih.

### C. Penghapusan Akun Klien (Zona Berbahaya)
* **Lokasi:** Modal *Kelola Klien* di tab Klien (`/admin`).
* **Sifat Aksi:** Permanen dan destruktif.
* **Relasi Cascading:** Menghapus akun klien akan otomatis menghapus seluruh data relasi di basis data:
  - Undangan (`Invitation`)
  - Order dan histori invoice (`Order`)
  - Daftar tamu dan QR Code (`Guest`)
  - Ucapan dan konfirmasi kehadiran (`RSVP` & `Wish`)
  - Berkas media fisik di penyimpanan lokal/S3 (`MediaItem`)

---

## 6. Analisis Keamanan & Mitigasi Risiko

### 1. Perlindungan Terhadap Eskalasi Hak Akses (Anti-Privilege Escalation)
* **Pertanyaan:** Apakah user klien biasa dapat memalsukan cookie `lux_remote_client_id` di browser devtools untuk meremote akun klien lain?
* **Mitigasi Faktual:** **TIDAK BISA.**
  Di [`auth.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/auth.ts), pembacaan cookie `lux_remote_client_id` secara ketat dibungkus oleh pengaman:
  ```typescript
  if ((session?.user as any)?.isAdmin) { ... }
  ```
  Jika akun yang sedang login adalah klien biasa (`isAdmin: false`), blok kode ini **sama sekali tidak dijalankan**. Klien biasa akan tetap terkunci pada datanya sendiri.

### 2. Perlindungan Terhadap Kebocoran Kredensial
* Password klien tidak pernah diminta, di-bypass, atau dimodifikasi.
* Sesi Admin tidak disimpan dalam cookie pihak ketiga atau query parameter URL yang rentan bocor ke *browser history* atau *server access logs*.

### 3. Batas Waktu Otomatis (Auto-Timeout)
* Cookie `lux_remote_client_id` dibatasi `maxAge: 3600` (1 jam). Jika koneksi terputus atau browser ditinggalkan, sesi remote otomatis berakhir dengan aman.

---

## 7. Panduan Langkah Demi Langkah bagi Tim Admin / CS

### Skenario: Membantu Klien yang Mengalami Kendala Desain / Setup

1. **Buka Portal Admin:** Masuk ke `https://luxenary.id/admin` menggunakan akun Admin Anda.
2. **Cari Klien / Undangan:**
   - Masuk ke tab **Klien** untuk mencari berdasarkan nama atau email pengantin.
   - Atau masuk ke tab **Undangan** untuk mencari berdasarkan nama mempelai atau subdomain.
3. **Mulai Sesi Remote:**
   - Klik tombol ikon monitor (Remote) pada baris klien/undangan yang bersangkutan.
   - Sistem akan mengarahkan Anda ke `/dashboard`.
4. **Periksa Indikator:**
   - Pastikan banner merah bertuliskan *"MODE REMOTE AKTIF"* muncul di bagian atas halaman dengan nama pengantin yang sesuai.
5. **Lakukan Pendampingan / Perbaikan:**
   - Anda kini dapat membuka menu *Edit Undangan*, *Buku Tamu*, *RSVP & Doa*, atau *Pengaturan* persis seperti yang dilihat oleh klien.
   - Seluruh perubahan yang Anda simpan akan langsung tersinkronkan ke akun klien.
6. **Selesai & Kembali ke Admin:**
   - Klik tombol putih *"Kembali ke Admin"* pada banner merah di bagian atas.
   - Anda langsung dikembalikan ke `/admin` dan sesi Anda kembali utuh sebagai Admin.

---
*Dokumen ini dirawat secara berkala oleh Tim Engineering Luxenary Invite sesuai standar protokol AGENTS.md.*
