import { eventNoun } from "@/lib/invitationUtils";

// Preset pesan mengikuti jenis acara; teks pernikahan tetap sama persis agar template tersimpan lama tetap dikenali.
export function waPresets(eventType?: string | null) {
  const noun = eventNoun(eventType);
  const isWedding = !eventType || eventType === "WEDDING";
  const ourEvent = noun === "acara" ? "acara kami" : `${noun} kami`;
  const attendEvent = noun === "acara" ? "acara kami" : `acara ${noun} kami`;
  return [
    {
      id: "formal",
      name: "Formal & Sakral",
      badge: "Populer",
      desc: `Bahasa sopan standar undangan ${noun}`,
      text: `Kepada Yth.\nBapak/Ibu/Saudara/i {nama_tamu}\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri ${attendEvent}:\n\n{link_undangan}\n\nMerupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\n\nTerima kasih.\n\nSalam hangat,\n{nama_mempelai}`,
    },
    {
      id: "islami",
      name: "Islami Penuh Berkah",
      badge: "Islami",
      desc: "Dengan salam pembuka & penutup bernuansa Islami",
      text: `Assalamu'alaikum Warahmatullahi Wabarakatuh\n\nKepada Yth.\nBapak/Ibu/Saudara/i {nama_tamu}\n\nDengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan ${isWedding ? "perayaan pernikahan kami" : attendEvent}:\n\n{link_undangan}\n\nKehadiran dan doa restu Bapak/Ibu/Saudara/i merupakan kehormatan serta kebahagiaan bagi kami.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.\n\nSalam hormat,\n{nama_mempelai}`,
    },
    {
      id: "modern",
      name: "Modern & Santai",
      badge: "Teman / Sahabat",
      desc: "Cocok untuk teman sebaya, sahabat, atau rekan kerja",
      text: `Halo {nama_tamu}!\n\nKami mengundang kamu untuk hadir dan merayakan momen bahagia ${ourEvent}:\n\n{link_undangan}\n\nInfo Kehadiran: {kuota_tamu} ({sesi_acara})\n\nBuka tautan di atas untuk melihat detail acara, lokasi maps, dan konfirmasi kehadiran (RSVP).\n\nCan't wait to celebrate with you!\n\nSalam hangat,\n{nama_mempelai}`,
    },
    {
      id: "singkat",
      name: "Singkat & Elegan",
      badge: "Ringkas",
      desc: "Format ringkas langsung ke inti tautan undangan",
      text: `Kepada Yth. {nama_tamu},\n\nKami mengundang Anda untuk hadir di hari bahagia ${ourEvent}:\n\n{link_undangan}\n\n${isWedding ? "Mohon doa restu untuk perjalanan baru kami." : "Terima kasih atas doa dan kehadirannya."}\n\nSalam bahagia,\n{nama_mempelai}`,
    },
  ];
}
