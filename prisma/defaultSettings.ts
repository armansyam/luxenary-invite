/**
 * Master Dataset Pengaturan Platform (admin_settings)
 * Di-generate otomatis dari snapshot database murni.
 * Digunakan oleh prisma/seed.ts untuk inisialisasi environment baru.
 */

export interface DefaultSettingItem {
  id?: string;
  key: string;
  value: string;
  label: string | null;
  group?: string;
  updatedAt?: string;
}

export const defaultSettings: DefaultSettingItem[] = [
  {
    "id": "517942ee-99d6-4fd9-a0a1-bc3161234a20",
    "key": "active_payment_gateway",
    "value": "midtrans",
    "label": "Gateway Pembayaran Aktif (midtrans/xendit)",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.010Z"
  },
  {
    "id": "357a5478-6597-49f7-a84a-1b75aefe3f6b",
    "key": "custom_domain_enabled",
    "value": "false",
    "label": "Aktifkan Fitur Custom Domain Klien",
    "group": "setup",
    "updatedAt": "2026-09-16T06:28:33.039Z"
  },
  {
    "id": "53249c2c-8d5e-452d-b7b3-b7f0210f212c",
    "key": "addon_memories_topup_enabled",
    "value": "true",
    "label": null,
    "group": "general",
    "updatedAt": "2026-09-16T06:28:33.032Z"
  },
  {
    "id": "e6e0aa27-2150-47b2-8dfd-a6e073dd4581",
    "key": "addon_memories_topup_photos",
    "value": "100",
    "label": null,
    "group": "general",
    "updatedAt": "2026-09-16T06:28:33.032Z"
  },
  {
    "id": "fb3a797c-7718-488e-8034-4af09ec51401",
    "key": "addon_memories_topup_price",
    "value": "35000",
    "label": null,
    "group": "general",
    "updatedAt": "2026-09-16T06:28:33.033Z"
  },
  {
    "id": "9bed12c6-fb73-4400-a298-1b26710fe15a",
    "key": "backup_auto_enabled",
    "value": "true",
    "label": "Auto-Backup Harian Aktif",
    "group": "backup",
    "updatedAt": "2026-09-16T06:28:33.005Z"
  },
  {
    "id": "490f3793-8ebf-4dab-91ec-2813a9c5b9c8",
    "key": "backup_auto_time",
    "value": "02:00",
    "label": "Waktu Eksekusi Auto-Backup (HH:mm)",
    "group": "backup",
    "updatedAt": "2026-09-16T06:28:33.005Z"
  },
  {
    "id": "2b10b0ca-0951-49e6-9c60-d63f28620a81",
    "key": "backup_path",
    "value": "./data/backups",
    "label": "Path Direktori Backup",
    "group": "backup",
    "updatedAt": "2026-09-16T06:28:33.006Z"
  },
  {
    "id": "1a2438b0-9669-4159-98ef-aa3443662744",
    "key": "backup_retention_count",
    "value": "10",
    "label": "Batas Jumlah Snapshot Disimpan",
    "group": "backup",
    "updatedAt": "2026-09-16T06:28:33.007Z"
  },
  {
    "id": "cdac08d5-8351-449d-9c4f-1638e000133c",
    "key": "bank_account_holder",
    "value": "",
    "label": "Nama Pemilik Rekening",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.026Z"
  },
  {
    "id": "ab6e23cf-ac98-4830-9537-dab9da0165df",
    "key": "bank_account_number",
    "value": "",
    "label": "Nomor Rekening Bank",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.025Z"
  },
  {
    "id": "ff4c24e2-3852-4d6e-9e82-c6805844e374",
    "key": "bank_instructions",
    "value": "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.",
    "label": "Instruksi Transfer Manual",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.034Z"
  },
  {
    "id": "f9017a15-4a9f-4dce-b792-f4d3e9609f1e",
    "key": "bank_name",
    "value": "",
    "label": "Nama Bank Transfer Manual",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.029Z"
  },
  {
    "id": "e124543a-56dd-4572-9e91-f768e334aec7",
    "key": "capabilities_tier1",
    "value": "",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.033Z"
  },
  {
    "id": "2b28e315-8433-46fa-bc28-83d43ea9b6ab",
    "key": "capabilities_tier2",
    "value": "[\"guest_memories\",\"qr_checkin\"]",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.041Z"
  },
  {
    "id": "15b43804-15b4-4191-91f4-ed215a737389",
    "key": "capabilities_tier3",
    "value": "[\"guest_memories\",\"custom_domain\",\"qr_checkin\"]",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.042Z"
  },
  {
    "id": "49784fdc-3a68-4e1d-8812-e6ac80389c53",
    "key": "cname_target",
    "value": "",
    "label": "Host Target CNAME (Custom Domain)",
    "group": "setup",
    "updatedAt": "2026-09-16T06:28:32.993Z"
  },
  {
    "id": "16e9fd99-c7cf-42e1-b6de-36e6ac361ee7",
    "key": "desc_tier1",
    "value": "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online",
    "label": "Deskripsi Paket Traditional",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.040Z"
  },
  {
    "id": "ac42089b-6a2d-4bbe-a03c-8b0516bdabf3",
    "key": "desc_tier2",
    "value": "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu",
    "label": "Deskripsi Paket Modern",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.041Z"
  },
  {
    "id": "e453747f-8bdb-4af2-80a7-adf3011a3fa0",
    "key": "desc_tier3",
    "value": "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal",
    "label": "Deskripsi Paket Premium",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.044Z"
  },
  {
    "id": "dc53c2e4-1a88-4299-9bb7-28688cef01c1",
    "key": "features_tier1",
    "value": "Akses bebas ke seluruh koleksi desain tema (19 Tema)\nPengiriman link undangan personal WhatsApp tanpa batas\nFormulir konfirmasi kehadiran (RSVP) & ucapan doa\nGaleri foto, cerita cinta & pemutar musik latar\nAlamat tautan khusus (namakamu.domain.id)\nMasa aktif undangan 1 bulan (30 hari) setelah acara",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.044Z"
  },
  {
    "id": "c2305658-3033-45d9-8816-2bf17905bd59",
    "key": "features_tier2",
    "value": "Mencakup seluruh fitur pada Paket Serenade\nSistem Resepsionis & Check-In Tamu dengan QR Code\nGuest Camera — Kamera Saku Tamu (Kapasitas 200 Foto)\nGaleri foto momen tamu tayang live real-time di venue\nMasa aktif undangan & galeri 1 bulan (30 hari) setelah acara",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.045Z"
  },
  {
    "id": "ac0f3512-1ff6-4fdc-8b9b-e915467b4d74",
    "key": "features_tier3",
    "value": "Mencakup seluruh fitur pada Paket Symphony\nDukungan integrasi domain website pribadi (.com / .id)\nGuest Camera — Kuota Maksimal (500 Foto)\nAkses unduh seluruh arsip foto momen tamu (Format ZIP)\nMasa aktif undangan & galeri 1 bulan (30 hari) setelah acara\nLayanan bantuan & pendampingan teknis prioritas",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.045Z"
  },
  {
    "id": "31d17d39-e263-4c39-9417-99accf147f10",
    "key": "gallery_extension_price_per_month",
    "value": "50000",
    "label": null,
    "group": "general",
    "updatedAt": "2026-09-16T06:28:33.031Z"
  },
  {
    "id": "43866a96-20b4-4255-ae6e-7e250027e160",
    "key": "google_auth_enabled",
    "value": "true",
    "label": "Aktifkan Login Google",
    "group": "google",
    "updatedAt": "2026-09-16T06:28:32.997Z"
  },
  {
    "id": "7e65d2ea-84ee-429c-aa0f-eeb15c187913",
    "key": "google_client_id",
    "value": "",
    "label": "Google Client ID",
    "group": "google",
    "updatedAt": "2026-09-16T06:28:32.998Z"
  },
  {
    "id": "f5fdef5d-0f43-4bf0-a5c6-a259d930042d",
    "key": "google_client_secret",
    "value": "",
    "label": "Google Client Secret",
    "group": "google",
    "updatedAt": "2026-09-16T06:28:32.999Z"
  },
  {
    "id": "e2af3a04-f910-4339-ac12-67882682e893",
    "key": "hero_subtitle",
    "value": "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.",
    "label": "Deskripsi Hero",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:32.994Z"
  },
  {
    "id": "c28b65cc-6e51-404b-81e8-edf081442671",
    "key": "hero_tagline",
    "value": "Undangan Pernikahan Digital Elegan, Hangat & Berkelas",
    "label": "Tagline Hero",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:32.993Z"
  },
  {
    "id": "e005afa6-c20e-41db-8a0c-2cd14eb59878",
    "key": "memories_max_contributors_tier1",
    "value": "",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.043Z"
  },
  {
    "id": "aef2736c-3611-4a52-a4a2-b9fbd0bc2dbd",
    "key": "memories_max_contributors_tier2",
    "value": "50",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.046Z"
  },
  {
    "id": "9118e7c7-ccf7-4c69-9c78-eabf8211167d",
    "key": "memories_max_contributors_tier3",
    "value": "200",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.049Z"
  },
  {
    "id": "6726939d-4414-4e19-b3f1-97120983fbc7",
    "key": "memories_shots_quota_tier1",
    "value": "",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.043Z"
  },
  {
    "id": "677e2fe9-1b30-4ffd-a95d-03cff0fa851a",
    "key": "memories_shots_quota_tier2",
    "value": "5",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.047Z"
  },
  {
    "id": "8030a358-f276-4c84-8fea-362e80c6a012",
    "key": "memories_shots_quota_tier3",
    "value": "15",
    "label": null,
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.049Z"
  },
  {
    "id": "c4a168d3-2c2f-4f1e-a1ce-866009612cdc",
    "key": "memories_total_quota_tier1",
    "value": "0",
    "label": null,
    "group": "general",
    "updatedAt": "2026-09-16T06:28:33.042Z"
  },
  {
    "id": "3535e58e-845f-40bc-81f8-487bf1501e5b",
    "key": "memories_total_quota_tier2",
    "value": "200",
    "label": null,
    "group": "general",
    "updatedAt": "2026-09-16T06:28:33.046Z"
  },
  {
    "id": "306dfbca-c86d-465b-aeab-851885280d8c",
    "key": "memories_total_quota_tier3",
    "value": "500",
    "label": null,
    "group": "general",
    "updatedAt": "2026-09-16T06:28:33.048Z"
  },
  {
    "id": "78b4e12c-90fc-47e3-982a-a537f818b291",
    "key": "memories_notify_milestones",
    "value": "50,80,100",
    "label": "Ambang Batas Notifikasi Kuota Roll Foto (%)",
    "group": "general",
    "updatedAt": "2026-09-21T15:00:00.000Z"
  },
  {
    "id": "c052bc1f-f7c0-4084-9440-da66efff8cd2",
    "key": "midtrans_client_key",
    "value": "",
    "label": "Client Key Midtrans",
    "group": "midtrans",
    "updatedAt": "2026-09-16T06:28:32.995Z"
  },
  {
    "id": "8e07ef72-7a65-4703-ba4a-63468c687d67",
    "key": "midtrans_server_key",
    "value": "",
    "label": "Server Key Midtrans",
    "group": "midtrans",
    "updatedAt": "2026-09-16T06:28:32.994Z"
  },
  {
    "id": "52565b18-6110-41c9-a384-1111056ca233",
    "key": "name_tier1",
    "value": "Serenade",
    "label": "Nama Paket Traditional",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.027Z"
  },
  {
    "id": "f5f5c8fa-9d7b-4583-b1b0-70774dddbc41",
    "key": "name_tier2",
    "value": "Symphony",
    "label": "Nama Paket Modern",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.028Z"
  },
  {
    "id": "e477d397-b316-448a-9df0-5e0392def759",
    "key": "name_tier3",
    "value": "Eternity",
    "label": "Nama Paket Premium",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.027Z"
  },
  {
    "id": "e46500c7-9c1a-43b0-b266-d43a0dfcf0e6",
    "key": "payment_expiry_minutes",
    "value": "15",
    "label": "Masa Berlaku Tagihan (menit)",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.013Z"
  },
  {
    "id": "bf220e1c-211e-49e1-8877-aae7772cf073",
    "key": "payment_fee_payer",
    "value": "MERCHANT",
    "label": "Penanggung Fee Gateway (MERCHANT/BUYER)",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.014Z"
  },
  {
    "id": "113eb885-7753-42f7-b77e-4c74158a2769",
    "key": "payment_fee_rate",
    "value": "0.007",
    "label": "Tarif Fee Gateway (desimal, contoh: 0.007 = 0.7%)",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.015Z"
  },
  {
    "id": "b00bcaef-55aa-4be5-befe-9602f87a0deb",
    "key": "payment_gateway_fee_percent",
    "value": "0.7",
    "label": "Tarif Fee Gateway (%)",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.014Z"
  },
  {
    "id": "e0241d83-8407-4c62-91ca-e0e952838404",
    "key": "payment_gateway_mode",
    "value": "",
    "label": null,
    "group": "active_gateway",
    "updatedAt": "2026-09-16T06:28:33.012Z"
  },
  {
    "id": "15a2cab4-e11c-4625-9ba4-e38e99967060",
    "key": "payment_invoice_prefix",
    "value": "Tagihan Pembayaran",
    "label": "Prefix Invoice Gateway",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.016Z"
  },
  {
    "id": "cccc3334-df2d-4660-9a76-5ef1a0530ca5",
    "key": "payment_mode",
    "value": "GATEWAY",
    "label": "Mode Pembayaran (GATEWAY/MANUAL)",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.028Z"
  },
  {
    "id": "9e56a55e-356c-40a4-baba-222924ed20aa",
    "key": "platform_name",
    "value": "Sistem Undangan",
    "label": "Nama Platform",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:32.990Z"
  },
  {
    "id": "b57bcb76-9233-4b72-bef3-a8a4553b2328",
    "key": "platform_url",
    "value": "",
    "label": "URL Platform (APP_URL)",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:32.991Z"
  },
  {
    "id": "a508d51a-4e54-437c-8e33-8e95c4fc2671",
    "key": "price_tier1",
    "value": "99000",
    "label": "Harga Paket Traditional (IDR)",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.027Z"
  },
  {
    "id": "d23dc3e1-e32e-4a37-8a1d-c265f1d7bc26",
    "key": "price_tier2",
    "value": "150000",
    "label": "Harga Paket Modern (IDR)",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.030Z"
  },
  {
    "id": "8fe155f8-b6be-4d83-9bf9-938e1f4ce7c4",
    "key": "price_tier3",
    "value": "200000",
    "label": "Harga Paket Premium (IDR)",
    "group": "pricing",
    "updatedAt": "2026-09-16T06:28:33.030Z"
  },
  {
    "id": "09b68494-b00f-4e1a-9ba8-27c6e8d2f52e",
    "key": "promo_enabled",
    "value": "true",
    "label": "Master Switch Fitur Promo & Referral",
    "group": "payment",
    "updatedAt": "2026-09-16T06:28:33.038Z"
  },
  {
    "id": "retention_cleanup_days",
    "key": "retention_cleanup_days",
    "value": "30",
    "label": "Masa Simpan & Daur Ulang Subdomain (Hari)",
    "group": "setup",
    "updatedAt": "2026-09-16T06:28:33.031Z"
  },
  {
    "id": "retention_custom_domain_days",
    "key": "retention_custom_domain_days",
    "value": "30",
    "label": "Masa Aktif Custom Domain (Hari)",
    "group": "setup",
    "updatedAt": "2026-09-16T06:28:33.048Z"
  },
  {
    "id": "854e5478-1300-408e-a8fc-f29b46d7a220",
    "key": "retention_order_days",
    "value": "90",
    "label": "Pembersihan Order Lama EXPIRED/FAILED/PENDING (Hari)",
    "group": "subdomain",
    "updatedAt": "2026-09-16T06:28:33.009Z"
  },
  {
    "id": "84234822-375a-400e-9b45-5e8975d30a97",
    "key": "server_public_ip",
    "value": "",
    "label": "IP Public Server (Record A)",
    "group": "setup",
    "updatedAt": "2026-09-16T06:28:32.992Z"
  },
  {
    "id": "12bd4821-aca4-47b1-ae78-077c178d800c",
    "key": "service_status_contact_wa",
    "value": "",
    "label": "Nomor WhatsApp Kontak / Waiting List",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.038Z"
  },
  {
    "id": "df5733e7-9cce-4258-b8a7-b4e1ad440f19",
    "key": "service_status_message",
    "value": "",
    "label": "Pesan Penjelasan Status Layanan",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.036Z"
  },
  {
    "id": "d576b444-3d6a-423c-9cc9-9754fd3fd770",
    "key": "service_status_mode",
    "value": "OPEN",
    "label": "Status Layanan & Pendaftaran (OPEN/CLOSED_ORDER/MAINTENANCE/COMING_SOON)",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.035Z"
  },
  {
    "id": "ff3f9baa-8af4-4aaf-84fa-dcbd3fc59d9f",
    "key": "service_status_reopen_date",
    "value": "20 Oktober 2026",
    "label": "Estimasi Dibuka Kembali",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.037Z"
  },
  {
    "id": "4ea1cc54-7ff1-466a-9d7d-3895297e501c",
    "key": "service_status_title",
    "value": "Segera Hadir",
    "label": "Judul Pengumuman Status Layanan",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.036Z"
  },
  {
    "id": "ce79ccc4-8aff-443d-ba67-88ae56f3b6b8",
    "key": "smtp_from_email",
    "value": "",
    "label": "Email Pengirim",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.003Z"
  },
  {
    "id": "e2850efe-66bc-4c06-b243-99f07c9946e3",
    "key": "smtp_from_name",
    "value": "Billing & Finance",
    "label": "Nama Pengirim",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.004Z"
  },
  {
    "id": "a2439c1b-63b4-4699-ba66-85940aa8c40c",
    "key": "smtp_host",
    "value": "",
    "label": "Host SMTP",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.000Z"
  },
  {
    "id": "2fbf15fa-2671-4b9c-ae73-3b0b10ed12c0",
    "key": "smtp_password",
    "value": "",
    "label": "Password SMTP",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.002Z"
  },
  {
    "id": "6aae681a-98a6-473f-be73-3aa7f17f1b82",
    "key": "smtp_port",
    "value": "587",
    "label": "Port SMTP",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.001Z"
  },
  {
    "id": "d67ca605-4d25-4168-9bc5-53605e324a61",
    "key": "smtp_user",
    "value": "",
    "label": "Username / Email SMTP",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:33.002Z"
  },
  {
    "id": "8248cea9-a919-4586-91c3-d2d1805f3e19",
    "key": "subdomain_auto_recycle",
    "value": "true",
    "label": "Otomatis Lepas Subdomain ke Pool",
    "group": "subdomain",
    "updatedAt": "2026-09-16T06:28:33.029Z"
  },
  {
    "id": "e32446ee-4170-490d-ad32-ea16ea885da9",
    "key": "subdomain_grace_days",
    "value": "7",
    "label": "Masa Tenggang Subdomain (Hari Pasca Acara)",
    "group": "subdomain",
    "updatedAt": "2026-09-16T06:28:33.007Z"
  },
  {
    "id": "56468fa8-ac6f-4ef4-a721-a8c8f6adc29d",
    "key": "support_email",
    "value": "",
    "label": "Email Support",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:32.991Z"
  },
  {
    "id": "d258f64d-2ae4-4cfc-b622-8245606fcb7d",
    "key": "support_whatsapp",
    "value": "",
    "label": "Nomor WhatsApp Support / Admin",
    "group": "platform",
    "updatedAt": "2026-09-16T06:28:32.992Z"
  },
  {
    "id": "a82687c1-c360-4204-b6ef-e8a15810d2bf",
    "key": "theme_demo_artisan",
    "value": "{\"themeId\":\"artisan\",\"themeName\":\"Artisan\",\"series\":\"Premium\",\"category\":\"premium\",\"tagline\":\"HANDCRAFTED IN LOVE\",\"groomName\":\"Dimas\",\"brideName\":\"Kiara\",\"groomDisplayName\":\"Dimas Anggara, S.Ars.\",\"brideDisplayName\":\"Kiara Anindita, S.I.Kom.\",\"groomRole\":\"Mempelai Pria\",\"brideRole\":\"Mempelai Wanita\",\"groomParents\":\"Putra dari Bambang Sutrisno & Endang Lestari\",\"groomFather\":\"Bambang Sutrisno\",\"groomMother\":\"Endang Lestari\",\"brideParents\":\"Putri dari Agus Wicaksono & Rini Handayani\",\"brideFather\":\"Agus Wicaksono\",\"brideMother\":\"Rini Handayani\",\"groomInstagram\":\"dimas.anggara\",\"brideInstagram\":\"kiaraanindita\",\"monogramInitial\":\"D & K\",\"targetDate\":\"2026-11-28T09:00:00\",\"weddingDateFormatted\":\"Sabtu, 28 November 2026\",\"weddingDateDay\":\"28\",\"weddingDateMonth\":\"11\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Cinta sederhana yang tulus adalah karya seni paling indah yang pernah diciptakan.\",\"openingQuoteRef\":\"ARTISAN WEDDING CHRONICLE\",\"city\":\"Bandung\",\"globalBgUrl\":\"/demo/artisan/background.webp\",\"groomPhotoUrl\":\"/demo/artisan/groom.webp\",\"bridePhotoUrl\":\"/demo/artisan/bride.webp\",\"sidebarPhotoUrl\":\"/demo/artisan/hero.webp\",\"landingCoverUrl\":\"/demo/artisan/cover.webp\",\"galleryPhotos\":[\"/demo/artisan/gallery_01.webp\",\"/demo/artisan/gallery_02.webp\",\"/demo/artisan/gallery_03.webp\",\"/demo/artisan/gallery_04.webp\",\"/demo/artisan/gallery_05.webp\",\"/demo/artisan/gallery_06.webp\",\"/demo/artisan/gallery_07.webp\",\"/demo/artisan/gallery_08.webp\"],\"events\":[{\"badge\":\"CEREMONY\",\"title\":\"Intimate Ceremony\",\"time\":\"09.00 – 11.00 WIB\",\"location\":\"Pine Hill Forest\",\"address\":\"Jl. Maribaya Timur, Cibodas, Lembang, Bandung\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"RESEPSI RUSTIC\",\"title\":\"Rustic Garden Reception\",\"time\":\"14.00 – 17.00 WIB\",\"location\":\"Glass Pavilion Pine Hill\",\"address\":\"Lembang, Bandung Barat\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Awal Cerita\",\"title\":\"Secangkir Kopi Pagi\",\"content\":\"Bertemu di sebuah kedai kopi vintage di Braga, berbicara tentang desain dan buku.\"}],\"banks\":[{\"bank\":\"Bank Mandiri\",\"number\":\"1300019284712\",\"name\":\"Dimas Anggara\"}],\"dressCodeColors\":\"#736b5e, #c2b69d, #faf8f5\",\"dressCodeNote\":\"Earthy Botanical & Warm Linen Tones\",\"turutMengundang\":[\"Keluarga Besar Bambang Sutrisno\",\"Keluarga Besar Agus Wicaksono\"],\"customLabels\":{\"openBtn\":\"Enter Celebration\",\"coverSubtitle\":\"Together with our esteemed families, we request the honor of your gracious presence.\",\"rsvpTitle\":\"RSVP & Attendance\",\"rsvpBtnText\":\"Kirim Konfirmasi & Doa\",\"quoteTitle\":\"The Heritage\",\"quoteEyebrow\":\"MASTERPIECE OF HEARTS\",\"coupleTitle\":\"The Couple\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Handcrafted love, timeless elegance.\",\"eventsTitle\":\"The Solemnity\",\"eventsSub\":\"Ceremony & Reception Program\",\"storyTitle\":\"The Tapestry\",\"storyEyebrow\":\"Our Journey\",\"galleryTitle\":\"The Exhibition\",\"galleryEyebrow\":\"CURATED FRAMES\",\"galleryQuote\":\"A masterwork composed of love, trust, and perpetual devotion.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Wedding Registry\",\"giftEyebrow\":\"TOKEN OF RESPECT\",\"giftDesc\":\"Your prayers are the finest tribute to our new beginning. For digital wedding gifts:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Expressions of Grace\",\"wishesSub\":\"Convey Your Heartfelt Prayers & Best Wishes\"},\"closingQuote\":\"We extend our deepest gratitude for your blessings and distinguished presence.\",\"closingSub\":\"Respectfully, the bride, the groom & families.\",\"landingCoverDesktopUrl\":\"/demo/artisan/cover_desktop.webp\"}",
    "label": "Demo Data Konfigurasi - ARTISAN",
    "group": "themes",
    "updatedAt": "2026-09-16T06:28:33.022Z"
  },
  {
    "id": "659fce8a-5875-4cc4-94e5-9ef02294852e",
    "key": "theme_demo_badrika",
    "value": "{\"themeId\":\"badrika\",\"themeName\":\"Badrika\",\"series\":\"Traditional\",\"category\":\"traditional\",\"defaultPalette\":\"terracotta\",\"tagline\":\"WALIMATUL 'URS & SAORAJA ROYAL\",\"groomName\":\"Syahril\",\"brideName\":\"Elyana\",\"groomDisplayName\":\"Andi Syahril Ramadhan, S.T.\",\"brideDisplayName\":\"Andi Elyana Tenri, S.Ked.\",\"groomRole\":\"Mempelai Pria\",\"brideRole\":\"Mempelai Wanita\",\"groomParents\":\"Putra dari Andi Ramadhan & Andi Rosmini\",\"groomFather\":\"Andi Ramadhan\",\"groomMother\":\"Andi Rosmini\",\"brideParents\":\"Putri dari Andi Tenri Tatta & Andi Sitti Nur\",\"brideFather\":\"Andi Tenri Tatta\",\"brideMother\":\"Andi Sitti Nur\",\"groomInstagram\":\"syahril.tenri\",\"brideInstagram\":\"elyana.andi\",\"monogramInitial\":\"S & E\",\"targetDate\":\"2026-12-31T09:00:00\",\"weddingDateFormatted\":\"Kamis, 31 Desember 2026\",\"weddingDateDay\":\"31\",\"weddingDateMonth\":\"12\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya.\",\"openingQuoteRef\":\"QS. AR-RUM: 21\",\"city\":\"Makassar\",\"globalBgUrl\":\"/demo/badrika/background.webp\",\"groomPhotoUrl\":\"/demo/badrika/groom.webp\",\"bridePhotoUrl\":\"/demo/badrika/bride.webp\",\"sidebarPhotoUrl\":\"/demo/badrika/hero.webp\",\"landingCoverUrl\":\"/demo/badrika/cover.webp\",\"galleryPhotos\":[\"/demo/badrika/gallery_01.webp\",\"/demo/badrika/gallery_02.webp\",\"/demo/badrika/gallery_03.webp\",\"/demo/badrika/gallery_04.webp\",\"/demo/badrika/gallery_05.webp\",\"/demo/badrika/gallery_06.webp\",\"/demo/badrika/gallery_07.webp\",\"/demo/badrika/gallery_08.webp\"],\"events\":[{\"badge\":\"MAPACCI\",\"title\":\"Mappacci / Korontigi Sakral\",\"time\":\"19.00 WITA – Selesai\",\"location\":\"Kediaman Mempelai Wanita\",\"address\":\"Jl. Boulevard No. 88, Panakkukang, Makassar\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"AKAD & RESEPSI\",\"title\":\"Akad & Resepsi Bugis Royal\",\"time\":\"10.00 – 14.00 WITA\",\"location\":\"Claro Hotel Makassar (Phinisi Ballroom)\",\"address\":\"Jl. A. P. Pettarani No. 3, Mannuruki, Makassar\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Mappatabe\",\"title\":\"Restu Orang Tua & Sesepuh\",\"content\":\"Melangkah bersama dengan doa restu keluarga besar menuju mahligai rumah tangga yang sakinah.\"}],\"banks\":[{\"bank\":\"BCA\",\"number\":\"7901238491\",\"name\":\"Andi Syahril\"},{\"bank\":\"Bank Mandiri\",\"number\":\"1520098765432\",\"name\":\"Andi Elyana\"}],\"dressCodeColors\":\"#0f2b23, #c5a059, #fbfaf7\",\"dressCodeNote\":\"Busana Adat Bugis / Nuansa Emerald Hijau & Emas Saoraja\",\"turutMengundang\":[\"Keluarga Besar Andi Ramadhan\",\"Keluarga Besar Andi Tenri Tatta\"],\"customLabels\":{\"openBtn\":\"Buka Undangan\",\"coverSubtitle\":\"Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk merayakan cinta kami.\",\"rsvpTitle\":\"Konfirmasi Kehadiran & Doa\",\"rsvpBtnText\":\"Kirim Konfirmasi & Doa\",\"quoteTitle\":\"Ayat & Doa Suci\",\"quoteEyebrow\":\"THE SACRED UNION\",\"coupleTitle\":\"Mempelai Berbahagia\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Langkah Pertama Menuju Keabadian\",\"eventsTitle\":\"Rangkaian Acara\",\"eventsSub\":\"Waktu & Tempat Pelaksanaan Akad Serta Resepsi\",\"storyTitle\":\"Kisah Kasih Kami\",\"storyEyebrow\":\"Our Journey\",\"galleryTitle\":\"Galeri Foto\",\"galleryEyebrow\":\"POTRET KENANGAN\",\"galleryQuote\":\"Di setiap langkah kami saling menemukan, di setiap doa kami saling menguatkan.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Tanda Kasih\",\"giftEyebrow\":\"WEDDING GIFT\",\"giftDesc\":\"Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Jika berkenan memberi kado digital:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Ucapan & Doa\",\"wishesSub\":\"Kirimkan Pesan Manis Untuk Mempelai\"},\"closingQuote\":\"Kehadiran dan doa restu Anda adalah pelita yang menerangi langkah awal perjalanan hidup kami.\",\"closingSub\":\"Keluarga Besar Mempelai\",\"colorPalette\":\"terracotta\",\"landingCoverDesktopUrl\":\"/demo/badrika/cover_desktop.webp\"}",
    "label": "Demo Data Konfigurasi - BADRIKA",
    "group": "themes",
    "updatedAt": "2026-09-16T06:28:33.023Z"
  },
  {
    "id": "f25833c8-3dee-4b8f-9ac0-6a6938864309",
    "key": "theme_demo_candani",
    "value": "{\"themeId\":\"candani\",\"themeName\":\"Candani\",\"series\":\"Traditional\",\"category\":\"traditional\",\"defaultPalette\":\"terracotta\",\"tagline\":\"PESONA NUSANTARA FLORAL\",\"groomName\":\"Rijal\",\"brideName\":\"Mega\",\"groomDisplayName\":\"Rijal Fauzi, S.Pd.\",\"brideDisplayName\":\"Mega Puspita, S.I.Kom.\",\"groomRole\":\"Mempelai Pria\",\"brideRole\":\"Mempelai Wanita\",\"groomParents\":\"Putra dari Ir. Irawan Sadjojo & Dra. Indriwati Parayana.ME\",\"groomFather\":\"Ir. Irawan Sadjojo\",\"groomMother\":\"Dra. Indriwati Parayana.ME\",\"brideParents\":\"Putri dari Ir. Radja Rejaja & Dra. Riska Maryam.SE\",\"brideFather\":\"Ir. Radja Rejaja\",\"brideMother\":\"Dra. Riska Maryam.SE\",\"groomInstagram\":\"rijal.fauzi\",\"brideInstagram\":\"mega.puspita\",\"monogramInitial\":\"R & M\",\"targetDate\":\"2026-10-25T08:30:00\",\"weddingDateFormatted\":\"Minggu, 25 Oktober 2026\",\"weddingDateDay\":\"25\",\"weddingDateMonth\":\"10\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Dan di antara tanda-tanda kekuasaan-Nya diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram di sampingnya.\",\"openingQuoteRef\":\"QS. AR-RUM: 21\",\"city\":\"Bandung\",\"globalBgUrl\":\"/demo/candani/background.mp4\",\"groomPhotoUrl\":\"/demo/candani/groom.webp\",\"bridePhotoUrl\":\"/demo/candani/bride.webp\",\"sidebarPhotoUrl\":\"/demo/candani/hero.webp\",\"landingCoverUrl\":\"/demo/candani/cover.webp\",\"galleryPhotos\":[\"/demo/candani/gallery_01.webp\",\"/demo/candani/gallery_02.webp\",\"/demo/candani/gallery_03.webp\",\"/demo/candani/gallery_04.webp\",\"/demo/candani/gallery_05.webp\",\"/demo/candani/gallery_06.webp\",\"/demo/candani/gallery_07.webp\",\"/demo/candani/gallery_08.webp\"],\"events\":[{\"badge\":\"AKAD NIKAH\",\"title\":\"Akad Nikah & Sungkeman\",\"time\":\"08.30 – 10.30 WIB\",\"location\":\"Gedong Putih Bandung\",\"address\":\"Jl. Villa Triniti KM 4.7, Parongpong, Bandung Barat\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"RESEPSI\",\"title\":\"Resepsi Pernikahan\",\"time\":\"11.00 – 14.30 WIB\",\"location\":\"Grand Ballroom Gedong Putih\",\"address\":\"Jl. Villa Triniti KM 4.7, Parongpong, Bandung Barat\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Pertemuan\",\"title\":\"Langkah Awal\",\"content\":\"Dua hati yang dipersatukan dalam keindahan takdir dan restu semesta.\"}],\"banks\":[{\"bank\":\"BCA\",\"number\":\"2389102837\",\"name\":\"Rijal Fauzi\"},{\"bank\":\"BSI\",\"number\":\"7192837465\",\"name\":\"Mega Puspita\"}],\"dressCodeColors\":\"#a85d42, #dfc9b8, #fbf7f4\",\"dressCodeNote\":\"Busana Nuansa Terracotta, Sand & Earthy Tone\",\"turutMengundang\":[\"Keluarga Besar Ir. Irawan Sadjojo\",\"Keluarga Besar Ir. Radja Rejaja\"],\"customLabels\":{\"openBtn\":\"Buka Undangan\",\"coverSubtitle\":\"Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri hari bahagia kami.\",\"rsvpTitle\":\"Konfirmasi Kehadiran & Doa\",\"rsvpBtnText\":\"Kirim Konfirmasi & Doa\",\"quoteTitle\":\"Pappaseng & Doa\",\"quoteEyebrow\":\"WALIMATUL 'URS\",\"coupleTitle\":\"Dua Insan\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Dua Hati Bersatu Menjalin Mappakaraja\",\"eventsTitle\":\"Rangkaian Acara\",\"eventsSub\":\"Waktu & Tempat Pelaksanaan Akad & Resepsi\",\"storyTitle\":\"Love Story\",\"storyEyebrow\":\"Our Journey\",\"galleryTitle\":\"Our Moments\",\"galleryEyebrow\":\"Gallery\",\"galleryQuote\":\"Cinta sejati adalah ketika dua insan saling memuliakan dalam ketaatan dan keikhlasan.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Tanda Kasih\",\"giftEyebrow\":\"Tanda Penghormatan\",\"giftDesc\":\"Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Dan jika memberi adalah ungkapan tanda kasih, Anda dapat mengirimkannya secara digital:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Pappaseng & Doa Restu\",\"wishesSub\":\"Untaian Harapan & Doa Suci Dari Sahabat Serta Kerabat\"},\"closingQuote\":\"Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\",\"closingSub\":\"Salam hangat penuh hormat dari keluarga besar kedua mempelai.\",\"colorPalette\":\"terracotta\"}",
    "label": "Demo Data Konfigurasi - CANDANI",
    "group": "themes",
    "updatedAt": "2026-09-16T06:28:33.024Z"
  },
  {
    "id": "a12582f8-4b97-411c-a8d5-d310f2429f59",
    "key": "theme_demo_kalandra",
    "value": "{\"themeId\":\"kalandra\",\"themeName\":\"Kalandra\",\"series\":\"Premium\",\"category\":\"premium\",\"tagline\":\"THE WEDDING OF\",\"groomName\":\"Raditya\",\"brideName\":\"Alana\",\"groomDisplayName\":\"Raditya Pratama, S.T.\",\"brideDisplayName\":\"Alana Khairunnisa, B.Des.\",\"groomRole\":\"The Groom\",\"brideRole\":\"The Bride\",\"groomParents\":\"Putra dari Ir. Hendra Pratama & Ratna Dewi\",\"groomFather\":\"Ir. Hendra Pratama\",\"groomMother\":\"Ratna Dewi\",\"brideParents\":\"Putri dari Dr. Faisal Basri & Soraya Latief\",\"brideFather\":\"Dr. Faisal Basri\",\"brideMother\":\"Soraya Latief\",\"groomInstagram\":\"raditya.pratama\",\"brideInstagram\":\"alana.khairunnisa\",\"monogramInitial\":\"R & A\",\"targetDate\":\"2026-11-14T08:00:00\",\"weddingDateFormatted\":\"Sabtu, 14 November 2026\",\"weddingDateDay\":\"14\",\"weddingDateMonth\":\"11\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Two lives, two hearts, joined together in friendship, united forever in love.\",\"openingQuoteRef\":\"THE WEDDING CELEBRATION\",\"city\":\"Jakarta\",\"globalBgUrl\":\"/demo/kalandra/background.webp\",\"groomPhotoUrl\":\"/demo/kalandra/groom.webp\",\"bridePhotoUrl\":\"/demo/kalandra/bride.webp\",\"sidebarPhotoUrl\":\"/demo/kalandra/hero.webp\",\"landingCoverUrl\":\"/demo/kalandra/cover.webp\",\"galleryPhotos\":[\"/demo/kalandra/gallery_01.webp\",\"/demo/kalandra/gallery_02.webp\",\"/demo/kalandra/gallery_03.webp\",\"/demo/kalandra/gallery_04.webp\",\"/demo/kalandra/gallery_05.webp\",\"/demo/kalandra/gallery_06.webp\",\"/demo/kalandra/gallery_07.webp\",\"/demo/kalandra/gallery_08.webp\"],\"events\":[{\"badge\":\"SAKRAMEN / AKAD\",\"title\":\"Akad Nikah\",\"time\":\"08.00 – 10.00 WIB\",\"location\":\"The Glass House, Plataran Dharmawangsa\",\"address\":\"Jl. Dharmawangsa Raya No. 6, Kebayoran Baru, Jakarta Selatan\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"RESEPSI GLAMOUR\",\"title\":\"Resepsi Pernikahan\",\"time\":\"11.30 – 14.30 WIB\",\"location\":\"Grand Pavilion Plataran Dharmawangsa\",\"address\":\"Jl. Dharmawangsa Raya No. 6, Kebayoran Baru, Jakarta Selatan\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Chapter 01\",\"title\":\"Pertemuan Tak Terduga\",\"content\":\"Bertemu pertama kali di sebuah studio arsitektur di bilangan Senopati tahun 2021.\"},{\"chapter\":\"Chapter 02\",\"title\":\"Bertumbuh Bersama\",\"content\":\"Melewati ratusan cangkir kopi dan diskusi panjang, kami menyadari arah hati yang sama.\"},{\"chapter\":\"Chapter 03\",\"title\":\"Janji Setia\",\"content\":\"Di bawah langit senja Jakarta, kami berjanji untuk melangkah bersama selamanya.\"}],\"banks\":[{\"bank\":\"BCA\",\"number\":\"8801294812\",\"name\":\"Alana Khairunnisa\"},{\"bank\":\"Bank Mandiri\",\"number\":\"1370019284710\",\"name\":\"Raditya Pratama\"}],\"dressCodeColors\":\"#1a1a1a, #8c7355, #f5f0ea\",\"dressCodeNote\":\"Formal Monochrome / Editorial Chic (Hitam, Nuansa Earth Tone & Champagne)\",\"turutMengundang\":[\"Keluarga Besar Ir. Hendra Pratama (Jakarta)\",\"Keluarga Besar Dr. Faisal Basri (Bandung)\"],\"customLabels\":{\"openBtn\":\"Buka Undangan\",\"coverSubtitle\":\"Kehadiran Bapak/Ibu/Saudara/i merupakan kehormatan tak terhingga bagi keluarga besar kami.\",\"rsvpTitle\":\"Konfirmasi Kehadiran & Doa\",\"rsvpBtnText\":\"Kirim Konfirmasi & Doa\",\"quoteTitle\":\"Janji Luhur\",\"quoteEyebrow\":\"ROYAL SOLEMNIZATION\",\"coupleTitle\":\"Kedua Mempelai\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Bersatu dalam janji suci dan cinta abadi\",\"eventsTitle\":\"Rangkaian Acara\",\"eventsSub\":\"Waktu & Tempat Akad Serta Resepsi\",\"storyTitle\":\"Lembah Cinta\",\"storyEyebrow\":\"Our Journey\",\"galleryTitle\":\"Potret Keabadian\",\"galleryEyebrow\":\"GALLERY OF LOVE\",\"galleryQuote\":\"Kala dua takdir dipersatukan, keindahan cinta menjadi nyata selamanya.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Tanda Kasih\",\"giftEyebrow\":\"WEDDING GIFT\",\"giftDesc\":\"Doa restu Anda adalah karunia yang sangat berarti. Bagi yang ingin memberikan tanda kasih secara cashless:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Ucapan & Doa Restu\",\"wishesSub\":\"Sampaikan Doa Terbaik Anda Untuk Kedua Mempelai\"},\"closingQuote\":\"Doa tulus Anda adalah anugerah terindah yang senantiasa menguatkan bahtera rumah tangga kami.\",\"closingSub\":\"Salam hormat dan terima kasih dari kami sekeluarga.\",\"thumbnailMobileUrl\":\"/demo/kalandra/thumbnail_mobile.webp\",\"thumbnailDesktopUrl\":\"/demo/kalandra/thumbnail_desktop.webp\"}",
    "label": "Demo Data Konfigurasi - KALANDRA",
    "group": "themes",
    "updatedAt": "2026-09-16T06:28:33.017Z"
  },
  {
    "id": "4c1c1874-3e47-463b-9f46-4fdbbf990789",
    "key": "theme_demo_lagaligo",
    "value": "{\"themeId\":\"lagaligo\",\"themeName\":\"La Galigo\",\"series\":\"Traditional\",\"category\":\"traditional\",\"tagline\":\"KEMEGAHAN ADAT SUTERA BUGIS\",\"groomName\":\"Faisal\",\"brideName\":\"Tenri\",\"groomDisplayName\":\"Andi Faisal Wardhana, S.T.\",\"brideDisplayName\":\"Andi Tenri Bau Sumpala, S.H.\",\"groomRole\":\"Mempelai Pria\",\"brideRole\":\"Mempelai Wanita\",\"groomParents\":\"Putra dari Drs. H. Andi Wardhana & Hj. Andi Nurul Qalbi\",\"groomFather\":\"Drs. H. Andi Wardhana\",\"groomMother\":\"Hj. Andi Nurul Qalbi\",\"brideParents\":\"Putri dari Ir. H. Andi Sumpala & Hj. Andi Besse Tenri\",\"brideFather\":\"Ir. H. Andi Sumpala\",\"brideMother\":\"Hj. Andi Besse Tenri\",\"groomInstagram\":\"faisal.wardhana\",\"brideInstagram\":\"tenri.sumpala\",\"monogramInitial\":\"F & T\",\"targetDate\":\"2026-12-12T09:00:00\",\"weddingDateFormatted\":\"Sabtu, 12 Desember 2026\",\"weddingDateDay\":\"12\",\"weddingDateMonth\":\"12\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Perkenankanlah kami merangkai kasih sayang yang Kau ciptakan di antara putra-putri kami dalam ikatan suci pernikahan.\",\"openingQuoteRef\":\"QS. AR-RUM: 21\",\"city\":\"Makassar\",\"globalBgUrl\":\"/uploads/dummy/AMS06365.webp\",\"groomPhotoUrl\":\"/demo/lagaligo/groom.webp\",\"bridePhotoUrl\":\"/uploads/dummy/AMS06381.webp\",\"sidebarPhotoUrl\":\"/uploads/dummy/AMS06364.webp\",\"landingCoverUrl\":\"/demo/lagaligo/cover.webp\",\"galleryPhotos\":[\"/uploads/dummy/AMS06328.webp\",\"/uploads/dummy/AMS06353.webp\",\"/uploads/dummy/AMS06364.webp\",\"/uploads/dummy/AMS06365.webp\",\"/uploads/dummy/AMS06372.webp\",\"/uploads/dummy/AMS06388.webp\",\"/uploads/dummy/AMS06410.webp\",\"/uploads/dummy/AMS06430.webp\"],\"events\":[{\"badge\":\"AKAD NIKAH\",\"title\":\"Akad Nikah & Mappasikarawa\",\"time\":\"09.00 – 11.30 WITA\",\"location\":\"Sandeq Ballroom Hotel Claro Makassar\",\"address\":\"Jl. A. P. Pettarani No. 03, Makassar\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"RESEPSI ADAT\",\"title\":\"Resepsi Pernikahan Adat Bugis\",\"time\":\"19.00 – 22.00 WITA\",\"location\":\"Grand Sandeq Ballroom Hotel Claro Makassar\",\"address\":\"Jl. A. P. Pettarani No. 03, Makassar\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Pertemuan\",\"title\":\"Mappatabe\",\"content\":\"Dua keluarga bangsawan yang dipersatukan dalam ikatan suci penuh berkah dan kehormatan.\"}],\"banks\":[{\"bank\":\"BCA\",\"number\":\"1982347610\",\"name\":\"Andi Faisal Wardhana\"},{\"bank\":\"BSI\",\"number\":\"7109283745\",\"name\":\"Andi Tenri Bau Sumpala\"}],\"dressCodeColors\":\"#003f30, #f9e7bc, #059669\",\"dressCodeNote\":\"Baju Bodo / Busana Adat Nusantara / Formal Evening Attire\",\"turutMengundang\":[\"Keluarga Besar Drs. H. Andi Wardhana\",\"Keluarga Besar Ir. H. Andi Sumpala\"],\"customLabels\":{\"openBtn\":\"Buka Undangan\",\"coverSubtitle\":\"Dengan penuh rasa syukur dan hormat, kami mengundang kehadiran Bapak/Ibu/Sahabat tercinta.\",\"rsvpTitle\":\"Konfirmasi Kehadiran\",\"rsvpBtnText\":\"Kirim Ucapan & Konfirmasi\",\"quoteTitle\":\"Untaian Doa\",\"quoteEyebrow\":\"HOLY MATRIMONY\",\"coupleTitle\":\"Mempelai Bahagia\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan.\",\"eventsTitle\":\"Rangkaian Acara\",\"eventsSub\":\"Waktu & Tempat Pelaksanaan Akad Serta Resepsi\",\"storyTitle\":\"Kisah Kasih Kami\",\"storyEyebrow\":\"OUR JOURNEY\",\"galleryTitle\":\"Potret Kenangan\",\"galleryEyebrow\":\"MOMEN BAHAGIA\",\"galleryQuote\":\"Dua hati yang tertaut dalam ikatan suci pernikahan berpayung ridho Ilahi.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Tanda Kasih\",\"giftEyebrow\":\"WEDDING GIFT\",\"giftDesc\":\"Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Jika berkenan memberi kado digital:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Buku Tamu & Kehadiran\",\"wishesSub\":\"Untaian doa dan konfirmasi kehadiran Anda merupakan kado terindah bagi kami.\"},\"closingQuote\":\"Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Sahabat berkenan hadir dan memberikan doa restu bagi kami.\",\"closingSub\":\"Keluarga Besar Kedua Mempelai\",\"audioUrl\":\"/music/bermuara.mp3\",\"landingCoverDesktopUrl\":\"/demo/lagaligo/cover_desktop.webp\"}",
    "label": "Demo Data Konfigurasi - LAGALIGO",
    "group": "themes",
    "updatedAt": "2026-09-16T06:28:33.034Z"
  },
  {
    "id": "fdc8d080-6821-4b74-91fe-9e1d8805746d",
    "key": "xendit_api_key",
    "value": "",
    "label": "Secret API Key Xendit",
    "group": "xendit",
    "updatedAt": "2026-09-16T06:28:32.996Z"
  },
  {
    "id": "344ab6a6-a38d-4a54-b245-9ba719368d7e",
    "key": "xendit_webhook_token",
    "value": "",
    "label": "Webhook Token Xendit",
    "group": "xendit",
    "updatedAt": "2026-09-16T06:28:32.996Z"
  }
];

export const defaultAdminSettings = defaultSettings;

export const defaultMusicPresets = [
  {
    id: "preset-bermuara",
    title: "Bermuara",
    composer: "Rizky Febian & Mahalini",
    genre: "Pop / Romantic",
    url: "/music/bermuara.mp3",
    durationSec: 220,
    isActive: true,
    sortOrder: 1,
  },
];
