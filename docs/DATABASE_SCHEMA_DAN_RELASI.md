# DOKUMENTASI RESMI: SKEMA DATABASE & KAMUS DATA
**Luxenary Invite Platform — PostgreSQL Schema, Entity Relations, & Lifecycle State Machines**

Dokumen ini membedah arsitektur basis data relasional PostgreSQL pada platform Luxenary Invite yang dikelola melalui ORM Prisma (`prisma/schema.prisma`).

---

## 1. Diagram Relasi Antar-Entitas (Entity Relationship Diagram)

```mermaid
erDiagram
    User ||--o{ Order : "places"
    User ||--o{ Invitation : "owns"
    Order ||--o| Invitation : "unlocks / activates"
    Invitation ||--o{ Guest : "contains"
    Invitation ||--o{ InvitationMedia : "has_media"
    Invitation ||--o{ Rsvp : "receives"
    Invitation ||--o{ Wish : "receives"
    Invitation ||--o{ GuestMemory : "collects"
    Guest ||--o| Rsvp : "submits"
    Admin ||--o{ AdminAuditLog : "logs"

    User {
        string id PK
        string googleId UK
        string email UK
        string name
        enum role
        string phoneNumber
    }

    Order {
        string id PK
        string invoiceNumber UK
        enum planType
        decimal amount
        enum status
        enum orderType
        string paymentMethod
        datetime paidAt
    }

    Invitation {
        string id PK
        string subdomain UK
        string customDomain UK
        string invitationSlug UK
        enum status
        string themeId
        string staffPin
        datetime publishedAt
        datetime expiresAt
        datetime galleryExpiresAt
    }

    Guest {
        string id PK
        string name
        string slug
        string qrToken UK
        boolean isAttending
        boolean isCheckedIn
        int paxActual
    }

    Rsvp {
        string id PK
        string name
        string status
        int guestCount
        string message
    }

    Wish {
        string id PK
        string senderName
        string message
    }

    GuestMemory {
        string id PK
        string senderName
        string senderEmail
        string mediaType
        string mediaUrl
        string message
    }

    Admin {
        string id PK
        string username UK
        string email UK
        enum role
    }
```

---

## 2. Kamus Data Lengkap (Data Dictionary)

### A. Entitas Pengguna & Akses (`users`, `admins`, `admin_audit_logs`)

#### 1. Tabel `users`
Menyimpan akun klien / calon pengantin:
- `id` (UUID, Primary Key): Identitas unik user.
- `googleId` (String, Unique, Nullable): ID pengguna dari Google OAuth.
- `email` (String, Unique): Alamat email resmi untuk login dan notifikasi invoice.
- `name` (String): Nama lengkap pemilik akun.
- `role` (Enum `UserRole`): `CLIENT` (default) atau `ADMIN`.
- `phoneNumber` (String, Nullable): Nomor kontak WhatsApp klien.
- `avatarUrl` (String, Nullable): URL foto profil klien dari Google.

#### 2. Tabel `admins`
Menyimpan kredensial tim pengelola platform:
- `id` (UUID, Primary Key): Identitas unik admin.
- `username` (String, Unique): Username login dashboard admin.
- `email` (String, Unique): Email pemulihan dan verifikasi.
- `passwordHash` (String, Nullable): Hash password terenkripsi (Argon2 / BCrypt).
- `role` (Enum `AdminRole`):
  - `SUPER_ADMIN`: Hak akses mutlak (konfigurasi sistem, database, tim).
  - `FINANCE`: Khusus rekonsiliasi invoice, refund, dan laporan omset.
  - `SUPPORT`: Khusus bantuan pelanggan dan pengelolaan tema.

#### 3. Tabel `admin_audit_logs`
Mencatat seluruh aksi operasional administrator untuk kepatuhan audit keamanan (*Security & Compliance*):
- `action` (String): Nama aksi (contoh: `APPROVE_ORDER`, `SUSPEND_INVITATION`, `RESTORE_DB`).
- `details` (String, Nullable): Rincian perubahan data (JSON).
- `ipAddress` (String, Nullable): Alamat IP asal request.

---

### B. Entitas Transaksi & Billing (`orders`, `webhook_logs`)

#### 1. Tabel `orders`
Menyimpan lembar penagihan dan riwayat transaksi:
- `invoiceNumber` (String, Unique): Nomor tagihan format `INV-YYYYMMDD-XXXX`.
- `planType` (Enum `PlanType`): Paket langganan (`TRADITIONAL`, `MODERN`, `PREMIUM`).
- `amount` (Decimal): Total nominal yang harus dibayar.
- `status` (Enum `OrderStatus`):
  - `PENDING`: Menunggu pembayaran.
  - `PAID`: Lunas, fitur otomatis aktif seketika.
  - `EXPIRED`: Kadaluarsa (lewat batas waktu 24 jam).
  - `FAILED`: Gagal bayar.
- `orderType` (Enum `OrderType`):
  - `NEW`: Pembuatan undangan pertama kali.
  - `UPGRADE`: Upgrade ke paket lebih tinggi.
  - `GALLERY_EXTENSION`: Add-on perpanjangan galeri foto tamu (+30 hari).
  - `CUSTOM_DOMAIN_ADDON`: Pembelian lisensi custom domain.
- `paymentMethod` (String): Kanal pembayaran (`GATEWAY` atau `MANUAL_TRANSFER`).
- `proofImageUrl` (String, Nullable): URL slip transfer jika menggunakan transfer manual.

#### 2. Tabel `webhook_logs`
Menyimpan riwayat callback / IPN dari payment gateway untuk idempotency dan debugging:
- `source` (String): Nama provider (`duitku`, `midtrans`, `ipaymu`, `tripay`, `xendit`).
- `event` (String): Tipe event (contoh: `payment.success`).
- `payload` (JSON): Payload biner lengkap dari gateway.
- `status` (String): `received` atau `processed`.

---

### C. Entitas Undangan & Media (`invitations`, `media`)

#### 1. Tabel `invitations`
Entitas pusat platform yang menyimpan konfigurasi undangan:
- `id` (UUID, Primary Key): Identitas unik undangan.
- `userId` (UUID, Foreign Key): Pemilik undangan (`onDelete: Cascade`).
- `themeId` (String): ID template tema (contoh: `kalandra`, `badrika`, `wave`).
- `subdomain` (String, Unique, Nullable): Subdomain unik platform (contoh: `yoga-nisa`).
- `customDomain` (String, Unique, Nullable): Domain pribadi klien (contoh: `yoganisa.com`).
- `invitationSlug` (String, Unique): Slug publik cadangan (contoh: `yoga-dan-nisa`).
- `status` (Enum `InvitationStatus`):
  - `DRAFT`: Dalam tahap perancangan di Studio Editor.
  - `PUBLISHED`: Undangan aktif dan dapat diakses tamu publik.
  - `EVENT_FINISHED`: Acara selesai, dialihkan menjadi galeri kenangan.
  - `TAKEN_DOWN`: Di-takedown manual oleh admin karena pelanggaran.
  - `ARCHIVED`: Diarsipkan permanen.
- `staffPin` (String, Nullable): 4-digit PIN terenkripsi untuk panitia buku tamu.
- `memoriesUploadLocked` (Boolean): Flag penutup fitur upload foto tamu.
- `eventData` (JSON String): Detail tanggal, jam, zona waktu, nama venue akad/resepsi.
- `bankAccounts` (JSON String): Daftar nomor rekening dan e-wallet tanda kasih.
- `featureSettings` (JSON String): Pengaturan aktif/nonaktif seksi undangan.

#### 2. Tabel `media` (Model `InvitationMedia`)
Menyimpan daftar aset visual mempelai:
- `mediaSlot` (Enum `MediaSlot`):
  - `LANDING_COVER`: Banner sampul depan undangan.
  - `HOME_PHOTO`: Foto hero pembuka.
  - `DESKTOP_SIDEBAR`: Foto/video panel kiri layar desktop.
  - `GROOM_PHOTO` & `BRIDE_PHOTO`: Foto mempelai pria dan wanita.
  - `GALLERY`: Foto-foto album pre-wedding.
- `localPath` (String): URL file di Cloudflare R2 CDN.

---

### D. Entitas Tamu, Interaksi & Galeri (`guests`, `rsvps`, `wishes`, `guest_memories`)

#### 1. Tabel `guests`
Buku tamu undangan klien:
- `name` (String): Nama tamu undangan (contoh: "Bapak H. Syamsuddin & Keluarga").
- `slug` (String): Slug nama untuk parameter `?to=...`.
- `qrToken` (String, Unique): Token acak terenkripsi untuk verifikasi check-in QR di resepsionis.
- `paxAllocated` (Int): Kuota porsi katering yang dialokasikan.
- `isCheckedIn` (Boolean): Status kehadiran fisik di venue.
- `checkInTime` (DateTime, Nullable): Waktu pemindaian barcode check-in.
- `souvenirTaken` (Boolean): Pencatatan pengambilan souvenir fisik di meja penerima tamu.

#### 2. Tabel `rsvps`
Konfirmasi kehadiran tamu:
- `status` (String): Konfirmasi hadir (`HADIR`, `TIDAK_HADIR`, `RAGU`).
- `guestCount` (Int): Jumlah orang yang akan hadir.

#### 3. Tabel `wishes`
Buku tamu doa dan ucapan selamat dari tamu undangan.

#### 4. Tabel `guest_memories`
Album foto momen candid yang diunggah oleh tamu di hari pernikahan:
- `senderName` (String): Nama tamu pengunggah.
- `mediaType` (String): Nilai tetap `PHOTO` / `IMAGE`.
- `mediaUrl` (String): Tautan file foto terkompresi di Cloudflare R2.
- `message` (String, Nullable): Caption ucapan momen.

---

## 3. Mesin Siklus Hidup Status (*Lifecycle State Machines*)

### A. State Machine: Status Undangan (`InvitationStatus`)
```mermaid
stateDiagram-v2
    [*] --> DRAFT : Klien Membuat Undangan
    DRAFT --> PUBLISHED : Klien Klik Publish (WOW Pipeline)
    PUBLISHED --> EVENT_FINISHED : H+7 Hari Acara (Cron Cleanup)
    EVENT_FINISHED --> ARCHIVED : Masa Retensi Habis
    PUBLISHED --> TAKEN_DOWN : Admin Suspend (Pelanggaran Konten)
    TAKEN_DOWN --> PUBLISHED : Admin Membuka Kembali
```

### B. State Machine: Status Pembayaran (`OrderStatus`)
```mermaid
stateDiagram-v2
    [*] --> PENDING : Invoice Terbit di Kasir
    PENDING --> PAID : Webhook Gateway Sukses / Admin Approve
    PENDING --> EXPIRED : Batas Waktu 24 Jam Terlewati
    PENDING --> FAILED : Transaksi Ditolak oleh Bank / Gateway
```
