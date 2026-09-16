// Auto-generated default settings from local database
export const defaultAdminSettings: { key: string; value: string; label: string | null }[] = [
  {
    "key": "platform_name",
    "value": "Sistem Undangan",
    "label": "Nama Platform"
  },
  {
    "key": "platform_url",
    "value": "",
    "label": "URL Platform (APP_URL)"
  },
  {
    "key": "support_email",
    "value": "",
    "label": "Email Support"
  },
  {
    "key": "support_whatsapp",
    "value": "",
    "label": "Nomor WhatsApp Support / Admin"
  },
  {
    "key": "server_public_ip",
    "value": "",
    "label": "IP Public Server (Record A)"
  },
  {
    "key": "cname_target",
    "value": "",
    "label": "Host Target CNAME (Custom Domain)"
  },
  {
    "key": "hero_tagline",
    "value": "Undangan Pernikahan Digital Elegan, Hangat & Berkelas",
    "label": "Tagline Hero"
  },
  {
    "key": "hero_subtitle",
    "value": "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.",
    "label": "Deskripsi Hero"
  },
  {
    "key": "midtrans_server_key",
    "value": "",
    "label": "Server Key Midtrans"
  },
  {
    "key": "midtrans_client_key",
    "value": "",
    "label": "Client Key Midtrans"
  },
  {
    "key": "xendit_api_key",
    "value": "",
    "label": "Secret API Key Xendit"
  },
  {
    "key": "xendit_webhook_token",
    "value": "",
    "label": "Webhook Token Xendit"
  },
  {
    "key": "google_auth_enabled",
    "value": "true",
    "label": "Aktifkan Login Google"
  },
  {
    "key": "google_client_id",
    "value": "",
    "label": "Google Client ID"
  },
  {
    "key": "google_client_secret",
    "value": "",
    "label": "Google Client Secret"
  },
  {
    "key": "smtp_host",
    "value": "",
    "label": "Host SMTP"
  },
  {
    "key": "smtp_port",
    "value": "587",
    "label": "Port SMTP"
  },
  {
    "key": "smtp_user",
    "value": "",
    "label": "Username / Email SMTP"
  },
  {
    "key": "smtp_password",
    "value": "",
    "label": "Password SMTP"
  },
  {
    "key": "smtp_from_email",
    "value": "",
    "label": "Email Pengirim"
  },
  {
    "key": "smtp_from_name",
    "value": "Billing & Finance",
    "label": "Nama Pengirim"
  },
  {
    "key": "backup_auto_enabled",
    "value": "true",
    "label": "Auto-Backup Harian Aktif"
  },
  {
    "key": "backup_auto_time",
    "value": "02:00",
    "label": "Waktu Eksekusi Auto-Backup (HH:mm)"
  },
  {
    "key": "backup_path",
    "value": "/data/backups",
    "label": "Path Direktori Backup"
  },
  {
    "key": "backup_retention_count",
    "value": "10",
    "label": "Batas Jumlah Snapshot Disimpan"
  },
  {
    "key": "subdomain_grace_days",
    "value": "7",
    "label": "Masa Tenggang Subdomain (Hari Pasca Acara)"
  },
  {
    "key": "retention_invitation_days",
    "value": "30",
    "label": "Retensi Undangan Aktif & Recycle Subdomain (Hari)"
  },
  {
    "key": "retention_account_days",
    "value": "365",
    "label": "Pembersihan Total Akun & Portofolio (Hari)"
  },
  {
    "key": "retention_order_days",
    "value": "90",
    "label": "Pembersihan Order Lama EXPIRED/FAILED/PENDING (Hari)"
  },
  {
    "key": "active_payment_gateway",
    "value": "midtrans",
    "label": "Gateway Pembayaran Aktif (midtrans/xendit)"
  },
  {
    "key": "payment_gateway_mode",
    "value": "",
    "label": null
  },
  {
    "key": "payment_expiry_minutes",
    "value": "15",
    "label": "Masa Berlaku Tagihan (menit)"
  },
  {
    "key": "payment_fee_payer",
    "value": "MERCHANT",
    "label": "Penanggung Fee Gateway (MERCHANT/BUYER)"
  },
  {
    "key": "payment_gateway_fee_percent",
    "value": "0.7",
    "label": "Tarif Fee Gateway (%)"
  },
  {
    "key": "payment_fee_rate",
    "value": "0.007",
    "label": "Tarif Fee Gateway (desimal, contoh: 0.007 = 0.7%)"
  },
  {
    "key": "payment_invoice_prefix",
    "value": "Tagihan Pembayaran",
    "label": "Prefix Invoice Gateway"
  },
  {
    "key": "theme_demo_kalandra",
    "value": "{\"themeId\":\"kalandra\",\"themeName\":\"Kalandra\",\"series\":\"Premium\",\"category\":\"premium\",\"tagline\":\"THE WEDDING OF\",\"groomName\":\"Raditya\",\"brideName\":\"Alana\",\"groomDisplayName\":\"Raditya Pratama, S.T.\",\"brideDisplayName\":\"Alana Khairunnisa, B.Des.\",\"groomRole\":\"The Groom\",\"brideRole\":\"The Bride\",\"groomParents\":\"Putra dari Ir. Hendra Pratama & Ratna Dewi\",\"groomFather\":\"Ir. Hendra Pratama\",\"groomMother\":\"Ratna Dewi\",\"brideParents\":\"Putri dari Dr. Faisal Basri & Soraya Latief\",\"brideFather\":\"Dr. Faisal Basri\",\"brideMother\":\"Soraya Latief\",\"groomInstagram\":\"raditya.pratama\",\"brideInstagram\":\"alana.khairunnisa\",\"monogramInitial\":\"R & A\",\"targetDate\":\"2026-11-14T08:00:00\",\"weddingDateFormatted\":\"Sabtu, 14 November 2026\",\"weddingDateDay\":\"14\",\"weddingDateMonth\":\"11\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya.\",\"openingQuoteRef\":\"QS. AR-RUM : 21\",\"city\":\"Jakarta\",\"globalBgUrl\":\"/demo/kalandra/background.webp\",\"groomPhotoUrl\":\"/demo/kalandra/groom.webp\",\"bridePhotoUrl\":\"/demo/kalandra/bride.webp\",\"sidebarPhotoUrl\":\"/demo/kalandra/hero.webp\",\"landingCoverUrl\":\"/demo/kalandra/cover.webp\",\"galleryPhotos\":[\"/demo/kalandra/gallery_01.webp\",\"/demo/kalandra/gallery_02.webp\",\"/demo/kalandra/gallery_03.webp\",\"/demo/kalandra/gallery_04.webp\",\"/demo/kalandra/gallery_05.webp\",\"/demo/kalandra/gallery_06.webp\",\"/demo/kalandra/gallery_07.webp\",\"/demo/kalandra/gallery_08.webp\"],\"events\":[{\"badge\":\"SAKRAMEN / AKAD\",\"title\":\"Akad Nikah\",\"time\":\"08.00 – 10.00 WIB\",\"location\":\"The Glass House, Plataran Dharmawangsa\",\"address\":\"Jl. Dharmawangsa Raya No. 6, Kebayoran Baru, Jakarta Selatan\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"RESEPSI GLAMOUR\",\"title\":\"Resepsi Pernikahan\",\"time\":\"11.30 – 14.30 WIB\",\"location\":\"Grand Pavilion Plataran Dharmawangsa\",\"address\":\"Jl. Dharmawangsa Raya No. 6, Kebayoran Baru, Jakarta Selatan\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Chapter 01\",\"title\":\"Pertemuan Tak Terduga\",\"content\":\"Bertemu pertama kali di sebuah studio arsitektur di bilangan Senopati tahun 2021.\"},{\"chapter\":\"Chapter 02\",\"title\":\"Bertumbuh Bersama\",\"content\":\"Melewati ratusan cangkir kopi dan diskusi panjang, kami menyadari arah hati yang sama.\"},{\"chapter\":\"Chapter 03\",\"title\":\"Janji Setia\",\"content\":\"Di bawah langit senja Jakarta, kami berjanji untuk melangkah bersama selamanya.\"}],\"banks\":[{\"bank\":\"BCA\",\"number\":\"8801294812\",\"name\":\"Alana Khairunnisa\"},{\"bank\":\"Bank Mandiri\",\"number\":\"1370019284710\",\"name\":\"Raditya Pratama\"}],\"dressCodeColors\":\"#1a1a1a, #8c7355, #f5f0ea\",\"dressCodeNote\":\"Formal Monochrome / Editorial Chic (Hitam, Nuansa Earth Tone & Champagne)\",\"turutMengundang\":[\"Keluarga Besar Ir. Hendra Pratama (Jakarta)\",\"Keluarga Besar Dr. Faisal Basri (Bandung)\"],\"customLabels\":{\"openBtn\":\"Buka Undangan\",\"coverSubtitle\":\"Kehadiran Bapak/Ibu/Saudara/i merupakan kehormatan tak terhingga bagi keluarga besar kami.\",\"rsvpTitle\":\"Konfirmasi Kehadiran & Doa\",\"rsvpBtnText\":\"Kirim Konfirmasi & Doa\",\"quoteTitle\":\"Janji Luhur\",\"quoteEyebrow\":\"ROYAL SOLEMNIZATION\",\"coupleTitle\":\"Kedua Mempelai\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Menapaki Mahligai Cinta Dalam Ridho Illahi\",\"eventsTitle\":\"Rangkaian Acara\",\"eventsSub\":\"Waktu & Tempat Akad Serta Resepsi\",\"storyTitle\":\"Lembah Cinta\",\"storyEyebrow\":\"Our Journey\",\"galleryTitle\":\"Potret Keabadian\",\"galleryEyebrow\":\"GALLERY OF LOVE\",\"galleryQuote\":\"Kala dua takdir dipersatukan, keindahan cinta menjadi nyata selamanya.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Tanda Kasih\",\"giftEyebrow\":\"WEDDING GIFT\",\"giftDesc\":\"Doa restu Anda adalah karunia yang sangat berarti. Bagi yang ingin memberikan tanda kasih secara cashless:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Ucapan & Doa Restu\",\"wishesSub\":\"Sampaikan Doa Terbaik Anda Untuk Kedua Mempelai\"},\"closingQuote\":\"Doa tulus Anda adalah anugerah terindah yang senantiasa menguatkan bahtera rumah tangga kami.\",\"closingSub\":\"Salam hormat dan terima kasih dari kami sekeluarga.\",\"thumbnailMobileUrl\":\"/demo/kalandra/thumbnail_mobile.webp\",\"thumbnailDesktopUrl\":\"/demo/kalandra/thumbnail_desktop.webp\"}",
    "label": "Demo Data Konfigurasi - KALANDRA"
  },
  {
    "key": "theme_demo_artisan",
    "value": "{\"themeId\":\"artisan\",\"themeName\":\"Artisan\",\"series\":\"Premium\",\"category\":\"premium\",\"tagline\":\"HANDCRAFTED IN LOVE\",\"groomName\":\"Dimas\",\"brideName\":\"Kiara\",\"groomDisplayName\":\"Dimas Anggara, S.Ars.\",\"brideDisplayName\":\"Kiara Anindita, S.I.Kom.\",\"groomRole\":\"Mempelai Pria\",\"brideRole\":\"Mempelai Wanita\",\"groomParents\":\"Putra dari Bambang Sutrisno & Endang Lestari\",\"groomFather\":\"Bambang Sutrisno\",\"groomMother\":\"Endang Lestari\",\"brideParents\":\"Putri dari Agus Wicaksono & Rini Handayani\",\"brideFather\":\"Agus Wicaksono\",\"brideMother\":\"Rini Handayani\",\"groomInstagram\":\"dimas.anggara\",\"brideInstagram\":\"kiaraanindita\",\"monogramInitial\":\"D & K\",\"targetDate\":\"2026-11-28T09:00:00\",\"weddingDateFormatted\":\"Sabtu, 28 November 2026\",\"weddingDateDay\":\"28\",\"weddingDateMonth\":\"11\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Cinta sederhana yang tulus adalah karya seni paling indah yang pernah diciptakan.\",\"openingQuoteRef\":\"ARTISAN WEDDING CHRONICLE\",\"city\":\"Bandung\",\"globalBgUrl\":\"/demo/artisan/background.webp\",\"groomPhotoUrl\":\"/demo/artisan/groom.webp\",\"bridePhotoUrl\":\"/demo/artisan/bride.webp\",\"sidebarPhotoUrl\":\"/demo/artisan/hero.webp\",\"landingCoverUrl\":\"/demo/artisan/cover.webp\",\"galleryPhotos\":[\"/demo/artisan/gallery_01.webp\",\"/demo/artisan/gallery_02.webp\",\"/demo/artisan/gallery_03.webp\",\"/demo/artisan/gallery_04.webp\",\"/demo/artisan/gallery_05.webp\",\"/demo/artisan/gallery_06.webp\",\"/demo/artisan/gallery_07.webp\",\"/demo/artisan/gallery_08.webp\"],\"events\":[{\"badge\":\"CEREMONY\",\"title\":\"Intimate Ceremony\",\"time\":\"09.00 – 11.00 WIB\",\"location\":\"Pine Hill Forest\",\"address\":\"Jl. Maribaya Timur, Cibodas, Lembang, Bandung\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"RESEPSI RUSTIC\",\"title\":\"Rustic Garden Reception\",\"time\":\"14.00 – 17.00 WIB\",\"location\":\"Glass Pavilion Pine Hill\",\"address\":\"Lembang, Bandung Barat\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Awal Cerita\",\"title\":\"Secangkir Kopi Pagi\",\"content\":\"Bertemu di sebuah kedai kopi vintage di Braga, berbicara tentang desain dan buku.\"}],\"banks\":[{\"bank\":\"Bank Mandiri\",\"number\":\"1300019284712\",\"name\":\"Dimas Anggara\"}],\"dressCodeColors\":\"#736b5e, #c2b69d, #faf8f5\",\"dressCodeNote\":\"Earthy Botanical & Warm Linen Tones\",\"turutMengundang\":[\"Keluarga Besar Bambang Sutrisno\",\"Keluarga Besar Agus Wicaksono\"],\"customLabels\":{\"openBtn\":\"Enter Celebration\",\"coverSubtitle\":\"Together with our esteemed families, we request the honor of your gracious presence.\",\"rsvpTitle\":\"RSVP & Attendance\",\"rsvpBtnText\":\"Kirim Konfirmasi & Doa\",\"quoteTitle\":\"The Heritage\",\"quoteEyebrow\":\"MASTERPIECE OF HEARTS\",\"coupleTitle\":\"The Couple\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Handcrafted love, timeless elegance.\",\"eventsTitle\":\"The Solemnity\",\"eventsSub\":\"Ceremony & Reception Program\",\"storyTitle\":\"The Tapestry\",\"storyEyebrow\":\"Our Journey\",\"galleryTitle\":\"The Exhibition\",\"galleryEyebrow\":\"CURATED FRAMES\",\"galleryQuote\":\"A masterwork composed of love, trust, and perpetual devotion.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Wedding Registry\",\"giftEyebrow\":\"TOKEN OF RESPECT\",\"giftDesc\":\"Your prayers are the finest tribute to our new beginning. For digital wedding gifts:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Expressions of Grace\",\"wishesSub\":\"Convey Your Heartfelt Prayers & Best Wishes\"},\"closingQuote\":\"We extend our deepest gratitude for your blessings and distinguished presence.\",\"closingSub\":\"Respectfully, the bride, the groom & families.\",\"landingCoverDesktopUrl\":\"/demo/artisan/cover_desktop.webp\"}",
    "label": "Demo Data Konfigurasi - ARTISAN"
  },
  {
    "key": "theme_demo_badrika",
    "value": "{\"themeId\":\"badrika\",\"themeName\":\"Badrika\",\"series\":\"Traditional\",\"category\":\"traditional\",\"defaultPalette\":\"terracotta\",\"tagline\":\"WALIMATUL 'URS & SAORAJA ROYAL\",\"groomName\":\"Syahril\",\"brideName\":\"Elyana\",\"groomDisplayName\":\"Andi Syahril Ramadhan, S.T.\",\"brideDisplayName\":\"Andi Elyana Tenri, S.Ked.\",\"groomRole\":\"Mempelai Pria\",\"brideRole\":\"Mempelai Wanita\",\"groomParents\":\"Putra dari Andi Ramadhan & Andi Rosmini\",\"groomFather\":\"Andi Ramadhan\",\"groomMother\":\"Andi Rosmini\",\"brideParents\":\"Putri dari Andi Tenri Tatta & Andi Sitti Nur\",\"brideFather\":\"Andi Tenri Tatta\",\"brideMother\":\"Andi Sitti Nur\",\"groomInstagram\":\"syahril.tenri\",\"brideInstagram\":\"elyana.andi\",\"monogramInitial\":\"S & E\",\"targetDate\":\"2026-12-31T09:00:00\",\"weddingDateFormatted\":\"Kamis, 31 Desember 2026\",\"weddingDateDay\":\"31\",\"weddingDateMonth\":\"12\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya.\",\"openingQuoteRef\":\"QS. AR-RUM: 21\",\"city\":\"Makassar\",\"globalBgUrl\":\"/demo/badrika/background.webp\",\"groomPhotoUrl\":\"/demo/badrika/groom.webp\",\"bridePhotoUrl\":\"/demo/badrika/bride.webp\",\"sidebarPhotoUrl\":\"/demo/badrika/hero.webp\",\"landingCoverUrl\":\"/demo/badrika/cover.webp\",\"galleryPhotos\":[\"/demo/badrika/gallery_01.webp\",\"/demo/badrika/gallery_02.webp\",\"/demo/badrika/gallery_03.webp\",\"/demo/badrika/gallery_04.webp\",\"/demo/badrika/gallery_05.webp\",\"/demo/badrika/gallery_06.webp\",\"/demo/badrika/gallery_07.webp\",\"/demo/badrika/gallery_08.webp\"],\"events\":[{\"badge\":\"MAPACCI\",\"title\":\"Mappacci / Korontigi Sakral\",\"time\":\"19.00 WITA – Selesai\",\"location\":\"Kediaman Mempelai Wanita\",\"address\":\"Jl. Boulevard No. 88, Panakkukang, Makassar\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"AKAD & RESEPSI\",\"title\":\"Akad & Resepsi Bugis Royal\",\"time\":\"10.00 – 14.00 WITA\",\"location\":\"Claro Hotel Makassar (Phinisi Ballroom)\",\"address\":\"Jl. A. P. Pettarani No. 3, Mannuruki, Makassar\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Mappatabe\",\"title\":\"Restu Orang Tua & Sesepuh\",\"content\":\"Melangkah bersama dengan doa restu keluarga besar menuju mahligai rumah tangga yang sakinah.\"}],\"banks\":[{\"bank\":\"BCA\",\"number\":\"7901238491\",\"name\":\"Andi Syahril\"},{\"bank\":\"Bank Mandiri\",\"number\":\"1520098765432\",\"name\":\"Andi Elyana\"}],\"dressCodeColors\":\"#0f2b23, #c5a059, #fbfaf7\",\"dressCodeNote\":\"Busana Adat Bugis / Nuansa Emerald Hijau & Emas Saoraja\",\"turutMengundang\":[\"Keluarga Besar Andi Ramadhan\",\"Keluarga Besar Andi Tenri Tatta\"],\"customLabels\":{\"openBtn\":\"Buka Undangan\",\"coverSubtitle\":\"Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk merayakan cinta kami.\",\"rsvpTitle\":\"Konfirmasi Kehadiran & Doa\",\"rsvpBtnText\":\"Kirim Konfirmasi & Doa\",\"quoteTitle\":\"Ayat & Doa Suci\",\"quoteEyebrow\":\"THE SACRED UNION\",\"coupleTitle\":\"Mempelai Berbahagia\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Langkah Pertama Menuju Keabadian\",\"eventsTitle\":\"Rangkaian Acara\",\"eventsSub\":\"Waktu & Tempat Pelaksanaan Akad Serta Resepsi\",\"storyTitle\":\"Kisah Kasih Kami\",\"storyEyebrow\":\"Our Journey\",\"galleryTitle\":\"Galeri Foto\",\"galleryEyebrow\":\"POTRET KENANGAN\",\"galleryQuote\":\"Di setiap langkah kami saling menemukan, di setiap doa kami saling menguatkan.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Tanda Kasih\",\"giftEyebrow\":\"WEDDING GIFT\",\"giftDesc\":\"Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Jika berkenan memberi kado digital:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Ucapan & Doa\",\"wishesSub\":\"Kirimkan Pesan Manis Untuk Mempelai\"},\"closingQuote\":\"Kehadiran dan doa restu Anda adalah pelita yang menerangi langkah awal perjalanan hidup kami.\",\"closingSub\":\"Keluarga Besar Mempelai\",\"colorPalette\":\"terracotta\",\"landingCoverDesktopUrl\":\"/demo/badrika/cover_desktop.webp\"}",
    "label": "Demo Data Konfigurasi - BADRIKA"
  },
  {
    "key": "theme_demo_candani",
    "value": "{\"themeId\":\"candani\",\"themeName\":\"Candani\",\"series\":\"Traditional\",\"category\":\"traditional\",\"defaultPalette\":\"terracotta\",\"tagline\":\"PESONA NUSANTARA FLORAL\",\"groomName\":\"Rijal\",\"brideName\":\"Mega\",\"groomDisplayName\":\"Rijal Fauzi, S.Pd.\",\"brideDisplayName\":\"Mega Puspita, S.I.Kom.\",\"groomRole\":\"Mempelai Pria\",\"brideRole\":\"Mempelai Wanita\",\"groomParents\":\"Putra dari Ir. Irawan Sadjojo & Dra. Indriwati Parayana.ME\",\"groomFather\":\"Ir. Irawan Sadjojo\",\"groomMother\":\"Dra. Indriwati Parayana.ME\",\"brideParents\":\"Putri dari Ir. Radja Rejaja & Dra. Riska Maryam.SE\",\"brideFather\":\"Ir. Radja Rejaja\",\"brideMother\":\"Dra. Riska Maryam.SE\",\"groomInstagram\":\"rijal.fauzi\",\"brideInstagram\":\"mega.puspita\",\"monogramInitial\":\"R & M\",\"targetDate\":\"2026-10-25T08:30:00\",\"weddingDateFormatted\":\"Minggu, 25 Oktober 2026\",\"weddingDateDay\":\"25\",\"weddingDateMonth\":\"10\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Dan di antara tanda-tanda kekuasaan-Nya diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram di sampingnya.\",\"openingQuoteRef\":\"QS. AR-RUM: 21\",\"city\":\"Bandung\",\"globalBgUrl\":\"/demo/candani/background.mp4\",\"groomPhotoUrl\":\"/demo/candani/groom.webp\",\"bridePhotoUrl\":\"/demo/candani/bride.webp\",\"sidebarPhotoUrl\":\"/demo/candani/hero.webp\",\"landingCoverUrl\":\"/demo/candani/cover.webp\",\"galleryPhotos\":[\"/demo/candani/gallery_01.webp\",\"/demo/candani/gallery_02.webp\",\"/demo/candani/gallery_03.webp\",\"/demo/candani/gallery_04.webp\",\"/demo/candani/gallery_05.webp\",\"/demo/candani/gallery_06.webp\",\"/demo/candani/gallery_07.webp\",\"/demo/candani/gallery_08.webp\"],\"events\":[{\"badge\":\"AKAD NIKAH\",\"title\":\"Akad Nikah & Sungkeman\",\"time\":\"08.30 – 10.30 WIB\",\"location\":\"Gedong Putih Bandung\",\"address\":\"Jl. Villa Triniti KM 4.7, Parongpong, Bandung Barat\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"RESEPSI\",\"title\":\"Resepsi Pernikahan\",\"time\":\"11.00 – 14.30 WIB\",\"location\":\"Grand Ballroom Gedong Putih\",\"address\":\"Jl. Villa Triniti KM 4.7, Parongpong, Bandung Barat\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Pertemuan\",\"title\":\"Langkah Awal\",\"content\":\"Dua hati yang dipersatukan dalam keindahan takdir dan restu semesta.\"}],\"banks\":[{\"bank\":\"BCA\",\"number\":\"2389102837\",\"name\":\"Rijal Fauzi\"},{\"bank\":\"BSI\",\"number\":\"7192837465\",\"name\":\"Mega Puspita\"}],\"dressCodeColors\":\"#a85d42, #dfc9b8, #fbf7f4\",\"dressCodeNote\":\"Busana Nuansa Terracotta, Sand & Earthy Tone\",\"turutMengundang\":[\"Keluarga Besar Ir. Irawan Sadjojo\",\"Keluarga Besar Ir. Radja Rejaja\"],\"customLabels\":{\"openBtn\":\"Buka Undangan\",\"coverSubtitle\":\"Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri hari bahagia kami.\",\"rsvpTitle\":\"Konfirmasi Kehadiran & Doa\",\"rsvpBtnText\":\"Kirim Konfirmasi & Doa\",\"quoteTitle\":\"Pappaseng & Doa\",\"quoteEyebrow\":\"WALIMATUL 'URS\",\"coupleTitle\":\"Dua Insan\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Dua Hati Bersatu Menjalin Mappakaraja\",\"eventsTitle\":\"Rangkaian Acara\",\"eventsSub\":\"Waktu & Tempat Pelaksanaan Akad & Resepsi\",\"storyTitle\":\"Love Story\",\"storyEyebrow\":\"Our Journey\",\"galleryTitle\":\"Our Moments\",\"galleryEyebrow\":\"Gallery\",\"galleryQuote\":\"Cinta sejati adalah ketika dua insan saling memuliakan dalam ketaatan dan keikhlasan.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Tanda Kasih\",\"giftEyebrow\":\"Tanda Penghormatan\",\"giftDesc\":\"Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Dan jika memberi adalah ungkapan tanda kasih, Anda dapat mengirimkannya secara digital:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Pappaseng & Doa Restu\",\"wishesSub\":\"Untaian Harapan & Doa Suci Dari Sahabat Serta Kerabat\"},\"closingQuote\":\"Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\",\"closingSub\":\"Salam hangat penuh hormat dari keluarga besar kedua mempelai.\",\"colorPalette\":\"terracotta\"}",
    "label": "Demo Data Konfigurasi - CANDANI"
  },
  {
    "key": "bank_account_number",
    "value": "asd",
    "label": "Nomor Rekening Bank"
  },
  {
    "key": "bank_account_holder",
    "value": "asda",
    "label": "Nama Pemilik Rekening"
  },
  {
    "key": "name_premium",
    "value": "Eternity",
    "label": "Nama Paket Premium"
  },
  {
    "key": "price_traditional",
    "value": "99000",
    "label": "Harga Paket Traditional (IDR)"
  },
  {
    "key": "name_traditional",
    "value": "Serenade",
    "label": "Nama Paket Traditional"
  },
  {
    "key": "name_modern",
    "value": "Symphony",
    "label": "Nama Paket Modern"
  },
  {
    "key": "payment_mode",
    "value": "MANUAL",
    "label": "Mode Pembayaran (GATEWAY/MANUAL)"
  },
  {
    "key": "bank_name",
    "value": "aas",
    "label": "Nama Bank Transfer Manual"
  },
  {
    "key": "subdomain_auto_recycle",
    "value": "true",
    "label": "Otomatis Lepas Subdomain ke Pool"
  },
  {
    "key": "price_modern",
    "value": "150000",
    "label": "Harga Paket Modern (IDR)"
  },
  {
    "key": "price_premium",
    "value": "200000",
    "label": "Harga Paket Premium (IDR)"
  },
  {
    "key": "retention_cleanup_days",
    "value": "30",
    "label": "Masa Simpan & Daur Ulang Subdomain (Hari)"
  },
  {
    "key": "gallery_extension_price_per_month",
    "value": "50000",
    "label": null
  },
  {
    "key": "addon_memories_topup_enabled",
    "value": "true",
    "label": null
  },
  {
    "key": "addon_memories_topup_photos",
    "value": "100",
    "label": null
  },
  {
    "key": "addon_memories_topup_price",
    "value": "35000",
    "label": null
  },
  {
    "key": "capabilities_traditional",
    "value": "",
    "label": null
  },
  {
    "key": "bank_instructions",
    "value": "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.",
    "label": "Instruksi Transfer Manual"
  },
  {
    "key": "theme_demo_lagaligo",
    "value": "{\"themeId\":\"lagaligo\",\"themeName\":\"La Galigo\",\"series\":\"Traditional\",\"category\":\"traditional\",\"tagline\":\"KEMEGAHAN ADAT SUTERA BUGIS\",\"groomName\":\"Faisal\",\"brideName\":\"Tenri\",\"groomDisplayName\":\"Andi Faisal Wardhana, S.T.\",\"brideDisplayName\":\"Andi Tenri Bau Sumpala, S.H.\",\"groomRole\":\"Mempelai Pria\",\"brideRole\":\"Mempelai Wanita\",\"groomParents\":\"Putra dari Drs. H. Andi Wardhana & Hj. Andi Nurul Qalbi\",\"groomFather\":\"Drs. H. Andi Wardhana\",\"groomMother\":\"Hj. Andi Nurul Qalbi\",\"brideParents\":\"Putri dari Ir. H. Andi Sumpala & Hj. Andi Besse Tenri\",\"brideFather\":\"Ir. H. Andi Sumpala\",\"brideMother\":\"Hj. Andi Besse Tenri\",\"groomInstagram\":\"faisal.wardhana\",\"brideInstagram\":\"tenri.sumpala\",\"monogramInitial\":\"F & T\",\"targetDate\":\"2026-12-12T09:00:00\",\"weddingDateFormatted\":\"Sabtu, 12 Desember 2026\",\"weddingDateDay\":\"12\",\"weddingDateMonth\":\"12\",\"weddingDateYear\":\"2026\",\"openingQuote\":\"Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Perkenankanlah kami merangkai kasih sayang yang Kau ciptakan di antara putra-putri kami dalam ikatan suci pernikahan.\",\"openingQuoteRef\":\"QS. AR-RUM: 21\",\"city\":\"Makassar\",\"globalBgUrl\":\"/uploads/dummy/AMS06365.webp\",\"groomPhotoUrl\":\"/demo/lagaligo/groom.webp\",\"bridePhotoUrl\":\"/uploads/dummy/AMS06381.webp\",\"sidebarPhotoUrl\":\"/uploads/dummy/AMS06364.webp\",\"landingCoverUrl\":\"/demo/lagaligo/cover.webp\",\"galleryPhotos\":[\"/uploads/dummy/AMS06328.webp\",\"/uploads/dummy/AMS06353.webp\",\"/uploads/dummy/AMS06364.webp\",\"/uploads/dummy/AMS06365.webp\",\"/uploads/dummy/AMS06372.webp\",\"/uploads/dummy/AMS06388.webp\",\"/uploads/dummy/AMS06410.webp\",\"/uploads/dummy/AMS06430.webp\"],\"events\":[{\"badge\":\"AKAD NIKAH\",\"title\":\"Akad Nikah & Mappasikarawa\",\"time\":\"09.00 – 11.30 WITA\",\"location\":\"Sandeq Ballroom Hotel Claro Makassar\",\"address\":\"Jl. A. P. Pettarani No. 03, Makassar\",\"mapsUrl\":\"https://maps.google.com\"},{\"badge\":\"RESEPSI ADAT\",\"title\":\"Resepsi Pernikahan Adat Bugis\",\"time\":\"19.00 – 22.00 WITA\",\"location\":\"Grand Sandeq Ballroom Hotel Claro Makassar\",\"address\":\"Jl. A. P. Pettarani No. 03, Makassar\",\"mapsUrl\":\"https://maps.google.com\"}],\"stories\":[{\"chapter\":\"Pertemuan\",\"title\":\"Mappatabe\",\"content\":\"Dua keluarga bangsawan yang dipersatukan dalam ikatan suci penuh berkah dan kehormatan.\"}],\"banks\":[{\"bank\":\"BCA\",\"number\":\"1982347610\",\"name\":\"Andi Faisal Wardhana\"},{\"bank\":\"BSI\",\"number\":\"7109283745\",\"name\":\"Andi Tenri Bau Sumpala\"}],\"dressCodeColors\":\"#003f30, #f9e7bc, #059669\",\"dressCodeNote\":\"Baju Bodo / Busana Adat Nusantara / Formal Evening Attire\",\"turutMengundang\":[\"Keluarga Besar Drs. H. Andi Wardhana\",\"Keluarga Besar Ir. H. Andi Sumpala\"],\"customLabels\":{\"openBtn\":\"Buka Undangan\",\"coverSubtitle\":\"Dengan penuh rasa syukur dan hormat, kami mengundang kehadiran Bapak/Ibu/Sahabat tercinta.\",\"rsvpTitle\":\"Konfirmasi Kehadiran\",\"rsvpBtnText\":\"Kirim Ucapan & Konfirmasi\",\"quoteTitle\":\"Untaian Doa\",\"quoteEyebrow\":\"HOLY MATRIMONY\",\"coupleTitle\":\"Mempelai Bahagia\",\"coupleEyebrow\":\"THE COUPLE\",\"coupleSub\":\"Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan.\",\"eventsTitle\":\"Rangkaian Acara\",\"eventsSub\":\"Waktu & Tempat Pelaksanaan Akad Serta Resepsi\",\"storyTitle\":\"Kisah Kasih Kami\",\"storyEyebrow\":\"OUR JOURNEY\",\"galleryTitle\":\"Potret Kenangan\",\"galleryEyebrow\":\"MOMEN BAHAGIA\",\"galleryQuote\":\"Dua hati yang tertaut dalam ikatan suci pernikahan berpayung ridho Ilahi.\",\"dressCodeTitle\":\"Dress Code\",\"dressCodeEyebrow\":\"A Guide To\",\"dressCodeSubtitle\":\"Kami mengundang tamu undangan untuk mengenakan palet warna berikut:\",\"streamingTitle\":\"Live Streaming\",\"streamingEyebrow\":\"Virtual Ceremony\",\"streamingSubtitle\":\"Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:\",\"giftTitle\":\"Tanda Kasih\",\"giftEyebrow\":\"WEDDING GIFT\",\"giftDesc\":\"Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Jika berkenan memberi kado digital:\",\"turutMengundangTitle\":\"Turut Mengundang\",\"turutMengundangEyebrow\":\"Keluarga Besar\",\"turutMengundangSubtitle\":\"Keluarga Besar & Kerabat yang turut berbahagia:\",\"wishesTitle\":\"Buku Tamu & Kehadiran\",\"wishesSub\":\"Untaian doa dan konfirmasi kehadiran Anda merupakan kado terindah bagi kami.\"},\"closingQuote\":\"Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Sahabat berkenan hadir dan memberikan doa restu bagi kami.\",\"closingSub\":\"Keluarga Besar Kedua Mempelai\",\"audioUrl\":\"/music/bermuara.mp3\",\"landingCoverDesktopUrl\":\"/demo/lagaligo/cover_desktop.webp\"}",
    "label": "Demo Data Konfigurasi - LAGALIGO"
  },
  {
    "key": "service_status_mode",
    "value": "OPEN",
    "label": "Status Layanan & Pendaftaran (OPEN/CLOSED_ORDER/MAINTENANCE/COMING_SOON)"
  },
  {
    "key": "service_status_title",
    "value": "Segera Hadir",
    "label": "Judul Pengumuman Status Layanan"
  },
  {
    "key": "service_status_message",
    "value": "",
    "label": "Pesan Penjelasan Status Layanan"
  },
  {
    "key": "service_status_reopen_date",
    "value": "20 Oktober 2026",
    "label": "Estimasi Dibuka Kembali"
  },
  {
    "key": "service_status_contact_wa",
    "value": "",
    "label": "Nomor WhatsApp Kontak / Waiting List"
  },
  {
    "key": "promo_enabled",
    "value": "true",
    "label": "Master Switch Fitur Promo & Referral"
  },
  {
    "key": "addon_custom_domain_enabled",
    "value": "false",
    "label": "Aktifkan Fitur Custom Domain Klien"
  },
  {
    "key": "desc_traditional",
    "value": "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online",
    "label": "Deskripsi Paket Traditional"
  },
  {
    "key": "desc_modern",
    "value": "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu",
    "label": "Deskripsi Paket Modern"
  },
  {
    "key": "capabilities_modern",
    "value": "[\"guest_memories\",\"qr_checkin\"]",
    "label": null
  },
  {
    "key": "capabilities_premium",
    "value": "[\"guest_memories\",\"custom_domain\",\"qr_checkin\"]",
    "label": null
  },
  {
    "key": "memories_total_quota_traditional",
    "value": "0",
    "label": null
  },
  {
    "key": "memories_max_contributors_traditional",
    "value": "",
    "label": null
  },
  {
    "key": "memories_shots_quota_traditional",
    "value": "",
    "label": null
  },
  {
    "key": "desc_premium",
    "value": "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal",
    "label": "Deskripsi Paket Premium"
  },
  {
    "key": "features_traditional",
    "value": "Akses bebas ke seluruh koleksi desain tema (16 Tema)\nPengiriman link undangan personal WhatsApp tanpa batas\nFormulir konfirmasi kehadiran (RSVP) & ucapan doa\nGaleri foto, cerita cinta & pemutar musik latar\nAlamat tautan khusus (namakamu.luxvite.id)\nMasa aktif undangan 1 bulan (30 hari) setelah acara",
    "label": null
  },
  {
    "key": "features_modern",
    "value": "Mencakup seluruh fitur pada Paket Serenade\nSistem Resepsionis & Check-In Tamu dengan QR Code\nGuest Camera — Kamera Saku Tamu (Kapasitas 200 Foto)\nGaleri foto momen tamu tayang live real-time di venue\nMasa aktif undangan & galeri 1 bulan (30 hari) setelah acara",
    "label": null
  },
  {
    "key": "features_premium",
    "value": "Mencakup seluruh fitur pada Paket Symphony\nDukungan integrasi domain website pribadi (.com / .id)\nGuest Camera — Kuota Maksimal (500 Foto)\nAkses unduh seluruh arsip foto momen tamu (Format ZIP)\nMasa aktif undangan & galeri 1 bulan (30 hari) setelah acara\nLayanan bantuan & pendampingan teknis prioritas",
    "label": null
  },
  {
    "key": "memories_total_quota_modern",
    "value": "200",
    "label": null
  },
  {
    "key": "memories_max_contributors_modern",
    "value": "50",
    "label": null
  },
  {
    "key": "memories_shots_quota_modern",
    "value": "5",
    "label": null
  },
  {
    "key": "retention_custom_domain_days",
    "value": "30",
    "label": "Masa Aktif Custom Domain (Hari)"
  },
  {
    "key": "memories_total_quota_premium",
    "value": "500",
    "label": null
  },
  {
    "key": "memories_max_contributors_premium",
    "value": "200",
    "label": null
  },
  {
    "key": "memories_shots_quota_premium",
    "value": "15",
    "label": null
  }
];

export const defaultMusicPresets = [
  {
    "id": "0790f3b8-7a28-4142-a569-837ce07e03fb",
    "title": "Bermuara",
    "composer": null,
    "genre": null,
    "url": "/music/bermuara.mp3",
    "durationSec": 180,
    "isActive": true,
    "sortOrder": 1
  },
  {
    "id": "43088321-508f-4897-9e82-e191a19e8458",
    "title": "Canon In D",
    "composer": null,
    "genre": null,
    "url": "/music/canon-in-d.ogg",
    "durationSec": 180,
    "isActive": true,
    "sortOrder": 2
  }
];
