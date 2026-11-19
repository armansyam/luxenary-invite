export type InvitationLocale = "id" | "en";

export function normalizeInvitationLocale(raw: unknown): InvitationLocale {
  return String(raw ?? "").trim().toLowerCase() === "en" ? "en" : "id";
}

export interface LocaleDictionary {
  locale: InvitationLocale;
  intlLocale: string;
  dateNotSet: string;
  sonOf: string;
  daughterOf: string;
  sonOfColon: string;
  childOfColon: string;
  attending: string;
  declined: string;
  declinedFull: string;
  uncertain: string;
  paxUnit: string;
  guestFallback: string;
  honorableGuest: string;
  venueLabel: string;
  openMaps: string;
  openDirections: string;
  googleMapsDirections: string;
  saveGoogleCal: string;
  saveIcsCal: string;
  wishesTitle: string;
  wishesEmpty: string;
  wishesEmptyWedding: string;
  replyBadge: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  rsvpEyebrow: string;
  rsvpHeading: string;
  rsvpNameLabel: string;
  rsvpNamePlaceholder: string;
  rsvpStatusLabel: string;
  rsvpCountLabel: string;
  rsvpMessageLabel: string;
  rsvpMessagePlaceholder: string;
  rsvpBtn: string;
  rsvpBtnSending: string;
  rsvpWeddingBtn: string;
  rsvpSentSuccess: string;
  rsvpSendError: string;
  rsvpNetworkError: string;
  giftTitle: string;
  giftEyebrow: string;
  giftCopyBtn: string;
  giftCopiedAlert: string;
  giftRegistryTitle: string;
  giftRegistryEyebrow: string;
  giftRegistrySubtitle: string;
  claimGift: string;
  giftClaimed: string;
  giftClaiming: string;
  giftClaimPromptName: string;
  giftClaimSuccess: string;
  giftRemaining: string;
  giftOf: string;
  dressCodeTitle: string;
  dressCodeSubtitleDefault: string;
  liveStreamEyebrow: string;
  liveStreamTitle: string;
  memoriesEyebrow: string;
  memoriesTitle: string;
  memoriesSubtitle: string;
  memoriesOpenCam: string;
  memoriesViewGallery: string;
  qrEyebrow: string;
  qrTitle: string;
  qrDesc: string;
  qrToLabel: string;
  openInvitation: string;
  coverGuestLabel: string;
  eventsEyebrow: string;
  wishesEyebrow: string;
  rsvpTitleDefault: string;
  rsvpBtnDefault: string;
  metaWeddingSuffix: string;
  metaWeddingDescPrefix: string;
  metaWeddingDescSuffix: string;
  metaDigitalSuffix: string;
  metaBirthdayPrefix: string;
  referenceLink: string;
  giftNotePlaceholder: string;
  giftSubmitBtn: string;
  giftCancelBtn: string;
  giftErrorFallback: string;
}

export const LOCALE_DICTIONARIES: Record<InvitationLocale, LocaleDictionary> = {
  id: {
    locale: "id",
    intlLocale: "id-ID",
    dateNotSet: "Tanggal belum ditentukan",
    sonOf: "Putra Dari",
    daughterOf: "Putri Dari",
    sonOfColon: "Putra tercinta dari:",
    childOfColon: "Putra/Putri tercinta dari:",
    attending: "Hadir",
    declined: "Berhalangan",
    declinedFull: "Berhalangan Hadir",
    uncertain: "Masih Ragu",
    paxUnit: "Orang",
    guestFallback: "Tamu",
    honorableGuest: "Tamu Undangan",
    venueLabel: "LOKASI ACARA",
    openMaps: "BUKA MAPS",
    openDirections: "BUKA PETUNJUK ARAH (MAPS)",
    googleMapsDirections: "Petunjuk Lokasi Google Maps",
    saveGoogleCal: "Google Calendar",
    saveIcsCal: "Apple / Outlook (.ics)",
    wishesTitle: "Ucapan & Doa Restu",
    wishesEmpty: "Belum ada ucapan. Jadilah yang pertama memberikan doa restu!",
    wishesEmptyWedding: "Jadilah yang pertama mengirimkan ucapan & doa restu.",
    replyBadge: "Balasan Tuan Rumah",
    days: "Hari",
    hours: "Jam",
    minutes: "Menit",
    seconds: "Detik",
    rsvpEyebrow: "Konfirmasi",
    rsvpHeading: "RSVP & Kehadiran",
    rsvpNameLabel: "Nama Lengkap",
    rsvpNamePlaceholder: "Nama Anda",
    rsvpStatusLabel: "Konfirmasi Kehadiran",
    rsvpCountLabel: "Jumlah Tamu",
    rsvpMessageLabel: "Ucapan & Doa",
    rsvpMessagePlaceholder: "Tuliskan ucapan dan doa terbaik Anda...",
    rsvpBtn: "Kirim Konfirmasi",
    rsvpBtnSending: "Mengirim...",
    rsvpWeddingBtn: "KIRIM KONFIRMASI & DOA",
    rsvpSentSuccess: "Konfirmasi dan ucapan Anda telah kami terima!",
    rsvpSendError: "Gagal mengirim RSVP",
    rsvpNetworkError: "Koneksi terganggu. Silakan coba lagi.",
    giftTitle: "Kado Digital",
    giftEyebrow: "Tanda Kasih",
    giftCopyBtn: "Salin No. Rekening",
    giftCopiedAlert: "Nomor rekening berhasil disalin!",
    giftRegistryTitle: "Daftar Kado",
    giftRegistryEyebrow: "Pilihan Kado Fisik",
    giftRegistrySubtitle: "Bila berkenan mengirimkan tanda kasih berupa kado fisik, Anda dapat menandai pilihan di bawah agar tidak terbeli ganda:",
    claimGift: "Pilih Kado Ini",
    giftClaimed: "Sudah Terpenuhi",
    giftClaiming: "Menyimpan...",
    giftClaimPromptName: "Masukkan nama Anda sebagai pengirim kado:",
    giftClaimSuccess: "Terima kasih! Pilihan kado telah dicatat.",
    giftRemaining: "Tersisa",
    giftOf: "dari",
    dressCodeTitle: "Panduan Busana",
    dressCodeSubtitleDefault: "Kami mengundang tamu undangan untuk mengenakan palet warna berikut:",
    liveStreamEyebrow: "Siaran Langsung",
    liveStreamTitle: "Saksikan Secara Daring",
    memoriesEyebrow: "Momen Tamu",
    memoriesTitle: "Abadikan Momen Bersama",
    memoriesSubtitle: "Buka kamera dan bagikan momen Anda selama acara ke album kenangan bersama.",
    memoriesOpenCam: "Buka Kamera Momen",
    memoriesViewGallery: "Lihat galeri foto tamu",
    qrEyebrow: "Kartu Akses",
    qrTitle: "QR Check-In Tamu",
    qrDesc: "Tunjukkan kode QR ini kepada penerima tamu di lokasi acara.",
    qrToLabel: "Kepada Yth.",
    openInvitation: "Buka Undangan",
    coverGuestLabel: "Kepada Yth. Bapak/Ibu/Saudara/i",
    eventsEyebrow: "AGENDA ACARA",
    wishesEyebrow: "UCAPAN & RSVP",
    rsvpTitleDefault: "Konfirmasi Kehadiran",
    rsvpBtnDefault: "Kirim Konfirmasi & Doa",
    metaWeddingSuffix: "Undangan Pernikahan",
    metaWeddingDescPrefix: "Undangan pernikahan",
    metaWeddingDescSuffix: "Simak informasi rangkaian acara, lokasi, dan konfirmasi kehadiran.",
    metaDigitalSuffix: "Undangan Digital",
    metaBirthdayPrefix: "Ulang Tahun",
    referenceLink: "Link Referensi",
    giftNotePlaceholder: "Catatan singkat (opsional)...",
    giftSubmitBtn: "Konfirmasi Pilihan",
    giftCancelBtn: "Batal",
    giftErrorFallback: "Gagal memilih kado",
  },
  en: {
    locale: "en",
    intlLocale: "en-US",
    dateNotSet: "Date to be announced",
    sonOf: "Son of",
    daughterOf: "Daughter of",
    sonOfColon: "Beloved son of:",
    childOfColon: "Beloved child of:",
    attending: "Attending",
    declined: "Unable to Attend",
    declinedFull: "Unable to Attend",
    uncertain: "Unsure",
    paxUnit: "Guests",
    guestFallback: "Guest",
    honorableGuest: "Honorable Guest",
    venueLabel: "EVENT VENUE",
    openMaps: "OPEN MAPS",
    openDirections: "OPEN DIRECTIONS (MAPS)",
    googleMapsDirections: "Open Google Maps",
    saveGoogleCal: "Google Calendar",
    saveIcsCal: "Apple / Outlook (.ics)",
    wishesTitle: "Wishes & Prayers",
    wishesEmpty: "No wishes yet. Be the first to send your warm wishes!",
    wishesEmptyWedding: "Be the first to send your warm wishes & prayers.",
    replyBadge: "Host Reply",
    days: "Days",
    hours: "Hours",
    minutes: "Mins",
    seconds: "Secs",
    rsvpEyebrow: "Confirmation",
    rsvpHeading: "RSVP & Attendance",
    rsvpNameLabel: "Full Name",
    rsvpNamePlaceholder: "Your Name",
    rsvpStatusLabel: "Attendance",
    rsvpCountLabel: "Number of Guests",
    rsvpMessageLabel: "Wishes & Prayers",
    rsvpMessagePlaceholder: "Write your warm wishes and prayers...",
    rsvpBtn: "Send RSVP",
    rsvpBtnSending: "Sending...",
    rsvpWeddingBtn: "SEND RSVP & WISHES",
    rsvpSentSuccess: "Thank you, your RSVP and wishes have been received!",
    rsvpSendError: "Failed to submit RSVP",
    rsvpNetworkError: "Network error. Please try again.",
    giftTitle: "Digital Gift",
    giftEyebrow: "Wedding Gift",
    giftCopyBtn: "Copy Account Number",
    giftCopiedAlert: "Account number copied to clipboard!",
    giftRegistryTitle: "Gift Registry",
    giftRegistryEyebrow: "Curated Wishlist",
    giftRegistrySubtitle: "Should you wish to send a physical gift, please reserve an item below to prevent duplicate gifts:",
    claimGift: "Reserve This Gift",
    giftClaimed: "Fulfilled",
    giftClaiming: "Reserving...",
    giftClaimPromptName: "Enter your name for this gift reservation:",
    giftClaimSuccess: "Thank you! Your gift reservation has been recorded.",
    giftRemaining: "Remaining",
    giftOf: "of",
    dressCodeTitle: "Dress Code Guide",
    dressCodeSubtitleDefault: "We kindly invite our guests to wear outfits matching these color tones:",
    liveStreamEyebrow: "Live Streaming",
    liveStreamTitle: "Join Us Virtually",
    memoriesEyebrow: "Guest Moments",
    memoriesTitle: "Capture Moments Together",
    memoriesSubtitle: "Open the disposable camera and share your candid shots to our shared album.",
    memoriesOpenCam: "Open Moments Camera",
    memoriesViewGallery: "View guest photo gallery",
    qrEyebrow: "Access Pass",
    qrTitle: "Guest Check-In QR",
    qrDesc: "Please present this QR code to our receptionist upon arrival.",
    qrToLabel: "Dear",
    openInvitation: "Open Invitation",
    coverGuestLabel: "Dear Honorable Guest",
    eventsEyebrow: "EVENT SCHEDULE",
    wishesEyebrow: "WISHES & RSVP",
    rsvpTitleDefault: "RSVP & Attendance",
    rsvpBtnDefault: "Send RSVP & Wishes",
    metaWeddingSuffix: "Wedding Invitation",
    metaWeddingDescPrefix: "Wedding invitation of",
    metaWeddingDescSuffix: "View event schedule, venue directions, and RSVP.",
    metaDigitalSuffix: "Digital Invitation",
    metaBirthdayPrefix: "Birthday Celebration",
    referenceLink: "Reference Link",
    giftNotePlaceholder: "Short note (optional)...",
    giftSubmitBtn: "Confirm Reservation",
    giftCancelBtn: "Cancel",
    giftErrorFallback: "Failed to reserve gift",
  },
};

export function getLocaleDict(rawLocale: unknown): LocaleDictionary {
  return LOCALE_DICTIONARIES[normalizeInvitationLocale(rawLocale)];
}
