# DOKUMENTASI LENGKAP: ALUR REGISTRASI HINGGA MASUK DASHBOARD

Dokumen ini membedah arsitektur faktual dari seluruh perjalanan pengguna (User Journey) sejak pertama kali menginjakkan kaki di sistem, login via Google OAuth, pemilihan paket, checkout multi-gateway, wizard setup awal, hingga mendarat di Dashboard Klien dan Studio Editor Undangan.

---

## DAFTAR ISI
1. [Diagram Alur End-to-End](#1-diagram-alur-end-to-end)
2. [Fase 1: Autentikasi & Registrasi Otomatis (Google OAuth)](#fase-1-autentikasi--registrasi-otomatis-google-oauth)
3. [Fase 2: Dispatcher Status Klien (Onboarding Hub)](#fase-2-dispatcher-status-klien-onboarding-hub)
4. [Fase 3: Katalog & Pemilihan Paket Layanan](#fase-3-katalog--pemilihan-paket-layanan)
5. [Fase 4: Checkout & Kasir Pembayaran Multi-Gateway](#fase-4-checkout--kasir-pembayaran-multi-gateway)
6. [Fase 5: Wizard Penyiapan Undangan Awal (Setup Wizard)](#fase-5-wizard-penyiapan-undangan-awal-setup-wizard)
7. [Fase 6: Masuk ke Dashboard Utama & Studio Editor](#fase-6-masuk-ke-dashboard-utama--studio-editor)
8. [Matriks Path Kode & File Terkait](#matriks-path-kode--file-terkait)
9. [Skema Basis Data (Prisma Models)](#skema-basis-data-prisma-models)

---

## 1. Diagram Alur End-to-End

```mermaid
flowchart TD
    A[Pengunjung Baru / Login] --> B[app/login/page.tsx]
    B -->|NextAuth Google OAuth| C[auth.ts & auth.config.ts]
    C -->|Simpan User di DB| D[prisma.user.upsert]
    D -->|Redirect| E[app/onboarding/page.tsx]
    
    E -->|GET /api/client/onboarding-state| F{Periksa Kondisi Akun}
    
    F -->|Sudah Punya Undangan| G[app/client/dashboard/page.tsx]
    F -->|Belum Punya Order| H[app/packages/page.tsx]
    F -->|Order PENDING| I[app/checkout/page.tsx?order=ID]
    F -->|Order PAID tapi Belum Setup| J[app/client/dashboard/setup/page.tsx]
    
    H -->|Pilih Paket| K[app/checkout/page.tsx?plan=PLAN]
    K -->|POST /api/orders/create| L[Invoice Dibuat: INV-...]
    L -->|Bayar QRIS / Transfer Bank| M[Webhook Gateway / Verifikasi Admin]
    M -->|Status Berubah Menjadi PAID| J
    
    J -->|Wizard 4 Langkah Multi-Event + Local Draft| N[POST /api/client/invitations/create]
    N -->|Generate Canonical Slug + Event Context| O[Database: Record Invitation DRAFT]
    O -->|Redirect Langsung| P[app/client/dashboard/invitation/ID/page.tsx]
    P -->|Split Editor & Live Preview| Q[Selesai: Siap Desain & Sebar]
```

---

## Fase 1: Autentikasi & Registrasi Otomatis (Google OAuth)

### 1. Titik Masuk UI
*   **File:** [`app/login/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/login/page.tsx)
*   **Mekanisme:** Tidak ada form manual username/password untuk klien. Akses menggunakan tombol tunggal Google Sign-In yang memanggil fungsi bawaan NextAuth:
    ```typescript
    await signIn("google", { callbackUrl: "/onboarding" });
    ```

### 2. Penanganan Sisi Server (NextAuth v5)
*   **File:** [`auth.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/auth.ts) & [`auth.config.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/auth.config.ts)
*   **Logika Faktual:**
    1. Menggunakan adapter Prisma (`PrismaAdapter(prisma)`).
    2. Jika email baru pertama kali masuk, record dibuat otomatis di tabel `User` dengan default role:
       - `role: "CLIENT"`
       - `name: profile.name`
       - `email: profile.email`
       - `image: profile.picture`
    3. Token sesi di-encode sebagai JWT yang disematkan ke cookie aman peramban (`__Secure-authjs.session-token`).
    4. Setelah Google menyetujui, klien dialihkan ke URL tujuan awal: `/onboarding`.

---

## Fase 2: Dispatcher Status Klien (Onboarding Hub)

### 1. Halaman Hub
*   **File:** [`app/onboarding/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/onboarding/page.tsx)
*   Halaman ini adalah layar transisi (*loading spinner minimalis*) yang secara otomatis memicu pemanggilan API: `GET /api/client/onboarding-state`.

### 2. Logika Penentu Rute
*   **File:** [`app/api/client/onboarding-state/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/onboarding-state/route.ts)
*   **Hirarki Keputusan (Decision Tree Faktual):**
    ```typescript
    // 1. Cek apakah user sudah memiliki undangan di database
    const existingInvitation = await prisma.invitation.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
    });
    if (existingInvitation) {
      return NextResponse.json({
        step: "COMPLETED",
        invitation: existingInvitation,
        redirectUrl: "/dashboard",
        hasPaidOrder: true,
      });
    }

    // 2. Cek apakah user sudah bayar lunas (PAID) tapi belum setup undangan
    // Sesuai aturan: Yang sudah bayar langsung masuk ke dashboard setup studio
    const paidOrder = await prisma.order.findFirst({
      where: { userId: targetUserId, status: "PAID" },
      orderBy: { createdAt: "desc" },
    });
    if (paidOrder) {
      return NextResponse.json({
        step: "PAID_NEED_SETUP",
        orderId: paidOrder.id,
        planType: paidOrder.planType,
        redirectUrl: `/dashboard/setup?order=${paidOrder.id}&plan=${paidOrder.planType}`,
        hasPaidOrder: true,
      });
    }

    // 3. Ambil transaksi order terakhir pengguna
    const latestOrder = await prisma.order.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
    });

    // 4. Jika belum pernah order sama sekali -> kirim ke katalog paket
    if (!latestOrder) {
      return NextResponse.json({
        step: "NO_ORDER",
        redirectUrl: "/packages",
        hasPaidOrder: false,
      });
    }

    // 5. Kasus Order masih PENDING (Menunggu Pembayaran)
    if (latestOrder.status === "PENDING") {
      const redirectUrl = latestOrder.checkoutConfirmedAt
        ? `/payment?order=${latestOrder.id}`
        : `/checkout?order=${latestOrder.id}`;

      return NextResponse.json({
        step: "ORDER_PENDING",
        orderId: latestOrder.id,
        invoiceNumber: latestOrder.invoiceNumber,
        planType: latestOrder.planType,
        amount: Number(latestOrder.amount),
        redirectUrl,
        hasPaidOrder: false,
      });
    }

    // 6. Jika order FAILED karena ditolak admin -> kembali ke kasir dengan catatan penolakan
    if (latestOrder.status === "FAILED") {
      return NextResponse.json({
        step: "ORDER_FAILED",
        orderId: latestOrder.id,
        invoiceNumber: latestOrder.invoiceNumber,
        rejectReason: (latestOrder as any).rejectReason || null,
        redirectUrl: `/checkout?order=${latestOrder.id}`,
        hasPaidOrder: false,
      });
    }

    // 7. Jika order EXPIRED -> buat order baru di katalog
    return NextResponse.json({
      step: "ORDER_EXPIRED",
      redirectUrl: `/checkout?plan=${latestOrder.planType}&msg=order_expired`,
      hasPaidOrder: false,
    });
    ```

### 3. Proteksi Mutlak: Klien Belum Bayar Dilarang Buka Dashboard
- **Di Sisi UI Dashboard ([`app/(client)/dashboard/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28client%29/dashboard/page.tsx#L98-L110)):**
  Jika pengguna yang belum memiliki undangan berstatus bayar mencoba mengakses `/dashboard`, komponen `useEffect` otomatis memanggil `/api/client/onboarding-state`. Ketika `redirectUrl` diterima (`/packages` atau `/payment`), router seketika mengeksekusi `router.replace(redirectUrl)`. Tidak ada celah bagi pengguna belum bayar untuk melihat isi antarmuka dashboard.
- **Di Sisi Backend API ([`app/api/client/invitations/create/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/invitations/create/route.ts#L106-L130)):**
  Sebelum mengeksekusi pembuatan draf, API memeriksa tabel `Order` milik user:
  ```typescript
  const paidOrder = await prisma.order.findFirst({
    where: {
      userId: userId,
      status: "PAID",
      OR: [{ invitation: null }, { invitation: { status: "DRAFT" } }],
    },
    orderBy: { paidAt: "desc" },
  });
  if (!paidOrder && !existingDraft) {
    return NextResponse.json(
      { error: "Anda belum memiliki paket yang aktif. Silakan selesaikan pembayaran terlebih dahulu." },
      { status: 403 }
    );
  }
  ```
  Permintaan pembuatan draf tanpa order berstatus `PAID` dipastikan **gagal mutlak dengan HTTP 403 Forbidden**.

---

## Fase 3: Katalog & Pemilihan Paket Layanan

### 1. Tampilan Katalog
*   **File:** [`app/packages/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/packages/page.tsx)
*   **Logika Dinamis:** Paket tidak di-hardcode. Halaman melakukan fetch ke `GET /api/public/settings` untuk mengambil konfigurasi paket dari database (`AdminSetting: platform_packages`).
*   **Tingkatan Tier Paket:**
    *   **TIER_1 (Serenade):** Paket esensial intim, undangan online berkelas, pemutar musik, galeri foto, RSVP & seluruh tema terbuka.
    *   **TIER_2 (Symphony):** Seluruh fitur Tier 1 + Resepsionis QR Check-In Scanner + Kamera Momen Tamu.
    *   **TIER_3 (Eternity):** Seluruh fitur Tier 2 + Custom Domain Pribadi (.com/.id) inklusif + Kuota Momen Tamu Maksimal.
*   **Aksi:** Tombol "Pilih Paket" mengarahkan pengguna ke:
    `/checkout?plan=${packageId}`

---

## Fase 4: Checkout & Kasir Pembayaran (Kontrol Penuh Admin)

### 1. Antarmuka Kasir & Logika Saluran Pembayaran
*   **File:** [`app/checkout/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/checkout/page.tsx) & [`app/payment/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/payment/page.tsx)
*   **Aturan Saluran Pembayaran (*Zero Client Decision*):**
    Klien **tidak memiliki pilihan** untuk memilih metode pembayaran sendiri. Saluran ditentukan 100% oleh Admin melalui `AdminSetting` key `payment_mode`:
    - **Mode `GATEWAY`:** Kasir hanya memunculkan saluran QRIS otomatis (Midtrans/Xendit). Form transfer manual disembunyikan secara total.
    - **Mode `MANUAL`:** Kasir hanya menampilkan nomor rekening bank admin dan form unggah foto bukti transfer. Gateway dinonaktifkan.
*   **Alur Tagihan Terbit:**
    1. Klien memilih paket $\rightarrow$ API `POST /api/orders/create` menerbitkan order `PENDING` dengan format invoice `INV-YYMMDD-XXXX`.
    2. Jika checkout dikonfirmasi $\rightarrow$ status `checkoutConfirmedAt` dicatat, dan klien diarahkan ke halaman pembayaran aktif: `/payment?order=${order.id}`.

### 2. Penanganan Pembayaran Real-Time
*   **File Stream SSE:** [`app/api/payments/status-stream/[orderId]/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/payments/status-stream/%5BorderId%5D/route.ts)
*   **Alur:**
    1. Klien membuka koneksi Server-Sent Events (SSE) saat kode QRIS ditampilkan di layar.
    2. Saat pembeli memindai QRIS dan membayar via m-Banking/e-Wallet, gateway mengirim Webhook HTTP POST ke:
       `app/api/webhook/midtrans/route.ts` atau `app/api/webhook/xendit/route.ts`, sesuai gateway yang dipakai order.
    3. Handler webhook memvalidasi checksum/signature, lalu mengupdate database:
       ```typescript
       await prisma.order.update({
         where: { id: orderId },
         data: { status: "PAID", paidAt: new Date() },
       });
       ```
    4. Server memancarkan sinyal ke SSE emitter (`sseEmitter.emit("payment_received", ...)`).
    5. Halaman kasir di browser pembeli langsung mendeteksi status `PAID` seketika (tanpa reload manual) dan mengarahkan klien ke:
       `/dashboard/setup?order=${order.id}&plan=${order.planType}`.

---

## Fase 5: Wizard Penyiapan Undangan Awal (Setup Wizard Multi-Event)

### 1. Form Penyiapan 4 Langkah Adaptif
*   **File:** [`app/(client)/dashboard/setup/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28client%29/dashboard/setup/page.tsx)
*   **Fitur Keamanan Draft Lokal:**
    Menggunakan `localStorage ("luxenary_setup_draft")`. Jika koneksi terputus atau halaman ter-refresh di tengah jalan, seluruh data input pulih otomatis.
*   **Tahapan Form Wizard:**
    1. **Langkah 0: Pilihan Jenis Acara (`eventType`):**
       - Pilihan: `WEDDING`, `BIRTHDAY`, `KHITAN`, `AQIQAH`, `WISUDA`, `GATHERING`.
       - Menentukan skema formulir langkah berikutnya serta memfilter katalog tema secara eksklusif.
    2. **Langkah 1: Profil Penyelenggara / Persona (Adaptif):**
       - **Wedding:** Nama lengkap & panggilan kedua mempelai (Pria & Wanita).
       - **Birthday:** Nama lengkap, nama panggilan, dan usia/milad persona utama.
       - **Khitan & Aqiqah:** Nama anak/bayi dan nama kedua orang tua (Ayah & Ibu).
       - **Wisuda:** Nama wisudawan, gelar akademik, program studi, dan institusi.
       - **Gathering:** Nama acara utama, sub-tema, dan organisasi penyelenggara.
    3. **Langkah 2: Hari Bahagia, Wilayah & Waktu Sesi Terstruktur:**
       - Tanggal acara utama dan wilayah/kota dengan pendeteksian zona waktu otomatis (`WIB`, `WITA`, `WIT`).
       - Penentuan waktu sesi terstruktur (Akad/Sesi 1 dan Resepsi/Sesi 2).
    4. **Langkah 3: Pemilihan Desain Tema (Terisolasi per Jenis Acara):**
       - Menampilkan tema yang **hanya relevan** dengan `eventType` yang dipilih.
       - Navigasi tab kategori gaya dinamis (`all`, `minimalist`, `modern`, `traditional`) menyesuaikan tema yang tersedia pada jenis acara tersebut.

### 2. Backend Pembuat Undangan
*   **File:** [`app/api/client/invitations/create/route.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/api/client/invitations/create/route.ts)
*   **Operasi Kritis yang Dilakukan:**
    1. **Guard Validasi Order & Event Type:** Memverifikasi bahwa order ID benar-benar berstatus `PAID`, milik user yang bersangkutan, dan jika `themeId` diisi, temanya wajib memiliki `eventType` yang sesuai (jika tidak cocok, sistem fallback aman ke `DEFAULT_THEME_BY_EVENT`).
    2. **Pembuatan Canonical Flat Slug Permanen:**
       - **Wedding:** `{groomSlug}-{brideSlug}-{DDMMYY}` (Contoh: `dimas-clarissa-121226`).
       - **Non-Wedding:** `{personaSlug}-{DDMMYY}` (Contoh: `kenzo-150826`).
       - *Collision Resolver:* Jika ada benturan slug yang sama persis, sistem otomatis menyematkan nama kota di belakangnya (`dimas-clarissa-121226-makassar`).
    3. **Inisialisasi Rangkaian Acara Default Berbasis Event Type:**
       - Wedding: Akad & Resepsi.
       - Non-Wedding: Sesi Utama & Syukuran / Ramah Tamah.
    4. **Inisialisasi Fitur & Label Standar:**
       - Menyimpan konfigurasi default ke `featureSettings` (`colorPalette: "champagne"`, `displayOrder`, `showMusic: true`, `showRsvp: true`, `showQrCheckin: true`, `showGift: true`).
    5. **Penerbitan ID & Pengalihan Otomatis:** Record dibuat dengan status `DRAFT`, draft lokal dibersihkan (`localStorage.removeItem("luxenary_setup_draft")`), dan klien langsung diantar masuk ke Studio Editor: `/dashboard/invitation/${invitation.id}`.

---

## Fase 6: Masuk ke Dashboard Utama & Studio Editor

### 1. Middleware Edge Guard
*   **File:** [`middleware.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/middleware.ts)
*   **Aturan Akses:**
    *   Jika user mencoba mengakses rute `/dashboard/*` tanpa cookie sesi login ➔ dialihkan paksa ke `/login`.
    *   Jika user dengan role `ADMIN` login ➔ otomatis dialihkan ke `/admin`.
    *   Jika user dengan role `CLIENT` login ➔ memiliki akses penuh ke seluruh workspace `/dashboard`.

### 2. Workspace Client Dashboard
Klien kini memiliki akses ke 4 modul utama:
1.  **Ringkasan Undangan (`/dashboard`):** Menampilkan status undangan (`DRAFT` / `PUBLISHED`), total kuota tamu, daftar konfirmasi RSVP masuk, dan pintasan cepat.
2.  **Studio Editor Undangan ([`app/(client)/dashboard/invitation/[id]/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28client%29/dashboard/invitation/%5Bid%5D/page.tsx)):**
    *   Split-screen visual: Form kontrol di sebelah kiri dan Live Preview iframe di sebelah kanan.
    *   Arsitektur Piring (*Draft Plate*): File draft fisik berada di `data/drafts/${id}.html`.
    *   Sinkronisasi realtime menggunakan event bus `BroadcastChannel("lux_preview_sync")`.
3.  **Buku Tamu & Pengiriman Undangan WhatsApp ([`app/(client)/dashboard/guests/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28client%29/dashboard/guests/page.tsx)):**
    *   Kelola daftar tamu, kategori undangan, dan sesi acara.
    *   Tombol **"Kirim WA"** (Tautan langsung `https://wa.me/628...?text=...`) yang otomatis mengisi pesan undangan personal beserta tautan nama tamu tanpa perlu mengetik manual.
    *   Tiket QR Check-in per tamu untuk penerimaan di meja resepsionis pada hari H.
4.  **Pengaturan, Domain & Terbit ([`app/(client)/dashboard/settings/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28client%29/dashboard/settings/page.tsx)):**
    *   Live checker ketersediaan subdomain (misal: `dimas-clarissa.luxvite.id`).
    *   Konfigurasi PIN 4-digit panitia resepsionis (dienkripsi AES-256).
    *   Validasi kelayakan penerbitan (`isPublishable`).
    *   Tombol Publikasikan yang memicu baking file HTML statis mandiri via [`lib/staticPublisher.ts`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/lib/staticPublisher.ts).

---

## Matriks Path Kode & File Terkait

| Tahapan | Tipe File | Path File Lengkap | Fungsi Utama |
| :--- | :--- | :--- | :--- |
| **Login** | UI | `app/login/page.tsx` | Tombol Sign-In Google dengan callback `/onboarding` |
| **Auth** | Config | `auth.ts` & `auth.config.ts` | Konfigurasi NextAuth v5 & PrismaAdapter |
| **Onboarding** | UI Hub | `app/onboarding/page.tsx` | Layar transisi dan traffic dispatcher |
| **Onboarding** | API Engine | `app/api/client/onboarding-state/route.ts` | Decision tree penentu rute berdasarkan status order |
| **Katalog** | UI | `app/packages/page.tsx` | Grid pemilihan paket (Serenade, Symphony, Eternity) |
| **Checkout** | UI | `app/checkout/page.tsx` | Kasir pembayaran, countdown QRIS, & upload bukti transfer |
| **Order** | API | `app/api/orders/create/route.ts` | Penerbitan nomor invoice unik transaksi |
| **Payment** | API SSE | `app/api/payments/status-stream/[orderId]/route.ts` | Realtime listener status pembayaran lunas |
| **Webhook** | API | `app/api/webhook/midtrans/route.ts`, `app/api/webhook/xendit/route.ts` | Penerima notifikasi pembayaran dari payment gateway |
| **Setup** | UI | `app/(client)/dashboard/setup/page.tsx` | Wizard 3 langkah profil pasangan & pilihan tema |
| **Setup** | API | `app/api/client/invitations/create/route.ts` | Inisialisasi record invitation, slug, dan default events |
| **Dashboard** | UI | `app/(client)/dashboard/page.tsx` | Dashboard utama ringkasan performa undangan |
| **Editor** | UI | `app/(client)/dashboard/invitation/[id]/page.tsx` | Studio Live Editor dengan split iframe preview |
| **Tamu** | UI | `app/(client)/dashboard/guests/page.tsx` | Manajemen tamu, direct WA link, & token QR |
| **Settings** | UI | `app/(client)/dashboard/settings/page.tsx` | Validasi publish, pemilihan subdomain, & PIN panitia |
| **Publisher** | Core Lib | `lib/staticPublisher.ts` | Kompilasi standalone HTML ke `public/published/` |
| **Routing** | Middleware | `middleware.ts` | Rewrite subdomain, canonical flat slug, & proteksi rute |

---

## Skema Basis Data (Prisma Models)

Berikut adalah entitas inti yang saling berelasi dalam siklus hidup pendaftaran hingga dashboard:

```prisma
// 1. Entitas Pengguna
model User {
  id            String       @id @default(uuid())
  name          String?
  email         String?      @unique
  image         String?
  role          UserRole     @default(CLIENT)
  orders        Order[]
  invitations   Invitation[]
  createdAt     DateTime     @default(now())
}

// 2. Entitas Transaksi Kasir
model Order {
  id            String       @id @default(uuid())
  userId        String
  planType      PlanType     // TIER_1 | TIER_2 | TIER_3
  amount        Int
  status        OrderStatus  @default(PENDING) // PENDING | PAID | FAILED | EXPIRED
  paymentMethod String?      // QRIS | MANUAL_TRANSFER
  proofImage    String?      // Untuk transfer manual
  paidAt        DateTime?
  user          User         @relation(fields: [userId], references: [id])
  invitation    Invitation?
  createdAt     DateTime     @default(now())
}

// 3. Entitas Undangan Pernikahan
model Invitation {
  id                  String       @id @default(uuid())
  userId              String
  orderId             String?      @unique
  themeId             String?      // kalandra, wave, prameswari, dll.
  invitationSlug      String       @unique // canonical flat slug: dimas-clarissa-121226
  subdomain           String?      @unique // dimas-clarissa
  status              InvitationStatus @default(DRAFT) // DRAFT | PUBLISHED | EVENT_FINISHED | ARCHIVED
  groomName           String?
  brideName           String?
  groomNickname       String?
  brideNickname       String?
  eventData           String?      // JSON string array rangkaian acara
  featureSettings     String?      // JSON string konfigurasi fitur
  staffPin            String?      // Terenkripsi AES-256
  user                User         @relation(fields: [userId], references: [id])
  order               Order?       @relation(fields: [orderId], references: [id])
  guests              Guest[]
  media               InvitationMedia[]
  createdAt           DateTime     @default(now())
}
```

---

## 10. Daftar Template Sistem

### A. Template Pesan Undangan WhatsApp Klien
Diatur pada halaman [`app/(client)/dashboard/guests/page.tsx`](file:///Users/armansyam/Documents/Project%20AmsDev/Luxenary-Invite/app/%28client%29/dashboard/guests/page.tsx). Calon pengantin dapat memilih preset atau mengedit teks sendiri:

#### 1. Preset Formal & Sakral (Default)
```text
Kepada Yth.
Bapak/Ibu/Saudara/i {nama_tamu}

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:

{link_undangan}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Terima kasih.

Salam hangat,
{nama_mempelai}
```

#### 2. Preset Islami Penuh Berkah
```text
Assalamu'alaikum Warahmatullahi Wabarakatuh

Kepada Yth.
Bapak/Ibu/Saudara/i {nama_tamu}

Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan perayaan pernikahan kami:

{link_undangan}

Kehadiran dan doa restu Bapak/Ibu/Saudara/i merupakan kehormatan serta kebahagiaan bagi kami.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

Salam hormat,
{nama_mempelai}
```

#### 3. Preset Modern & Santai (Teman / Sahabat)
```text
Halo {nama_tamu}!

Kami mengundang kamu untuk hadir dan merayakan momen bahagia pernikahan kami:

{link_undangan}

Info Kehadiran: {kuota_tamu} ({sesi_acara})

Buka tautan di atas untuk melihat detail acara, lokasi maps, dan konfirmasi kehadiran (RSVP).

Can't wait to celebrate with you!

Salam hangat,
{nama_mempelai}
```

#### 4. Preset Singkat & Elegan
```text
Kepada Yth. {nama_tamu},

Kami mengundang Anda untuk hadir di hari bahagia pernikahan kami:

{link_undangan}

Mohon doa restu untuk perjalanan baru kami.

Salam bahagia,
{nama_mempelai}
```

#### Variabel Placeholder Otomatis:
*   `{nama_tamu}`: Otomatis digantikan dengan nama tamu dari database.
*   `{link_undangan}`: Otomatis digantikan dengan URL lengkap undangan tamu (contoh: `https://dimas-clarissa.luxvite.id?to=Budi+Santoso`).
*   `{nama_mempelai}`: Otomatis diisi nama kedua pengantin.
*   `{kuota_tamu}`: Jumlah alokasi pax kehadiran tamu (contoh: "2 Pax").
*   `{sesi_acara}`: Sesi acara yang ditentukan untuk tamu tersebut (contoh: "Sesi 1 (Akad & Resepsi)").

---

### B. Katalog Tema Undangan Website (`themes/`)
Master file HTML fisik yang menjadi basis kompilasi undangan tersimpan secara modular dalam hierarki `themes/{eventType}/{style}/{nama-tema}.html`:

| ID Tema | Nama Tema | Event Type | Gaya / Kategori | Path File Template Fisik | Karakter Visual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `kalandra` | Kalandra | Wedding | Minimalist | `themes/wedding/minimalist/kalandra.html` | Modern, Elegan & Minimalis Editorial |
| `valente` | Valente | Wedding | Minimalist | `themes/wedding/minimalist/valente.html` | High-Fashion, Editorial & Mewah |
| `aurelia` | Aurelia | Wedding | Minimalist | `themes/wedding/minimalist/aurelia.html` | Romantis, Sinematik & Anggun |
| `artisan` | Artisan | Wedding | Minimalist | `themes/wedding/minimalist/artisan.html` | Artistik, Hangat & Vintage |
| `badrika` | Badrika | Wedding | Modern | `themes/wedding/modern/badrika.html` | Walimatul 'Urs & Saoraja Royal |
| `candani` | Candani | Wedding | Modern | `themes/wedding/modern/candani.html` | Pesona Nusantara Floral |
| `dillalucky` | Dilla Lucky | Wedding | Traditional | `themes/wedding/traditional/dillalucky.html` | Islami Sakral — Batik Ornament |
| `mayang` | Mayang | Wedding | Modern | `themes/wedding/modern/mayang.html` | Nuansa Adat Bugis/Makassar Anggun |
| `prameswari` | Prameswari | Wedding | Traditional | `themes/wedding/traditional/prameswari.html` | Sakral, Megah & Royal Keraton Jawa |
| `ameera` | Ameera | Wedding | Modern | `themes/wedding/modern/ameera.html` | Heritage Modern — Elegan Dark |
| `chronicle` | Chronicle | Wedding | Modern | `themes/wedding/modern/chronicle.html` | High-Fashion Vogue Editorial |
| `lumina` | Lumina | Wedding | Modern | `themes/wedding/modern/lumina.html` | Minimalist Glass & Cinema |
| `papercut` | Papercut | Wedding | Modern | `themes/wedding/modern/papercut.html` | Moody Papercut — Kraft Paper Aesthetic |
| `solaria` | Solaria | Wedding | Modern | `themes/wedding/modern/solaria.html` | Romantic Sunset Glow |
| `wave` | Wave | Wedding | Modern | `themes/wedding/modern/wave.html` | Dark, Moody & Dramatic Gelombang |
| `blueprints` | Starter Blueprints | Multi-Event | Core | `themes/_blueprints/{eventType}/` | Cetak biru acuan baku untuk 6 jenis acara |

---
*Dokumentasi ini disusun secara faktual berdasarkan kode sumber yang aktif di dalam repositori Luxenary-Invite.*
