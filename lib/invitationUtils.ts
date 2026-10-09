import { safeParseParticipants } from "./participantUtils";

export const DEFAULT_THEME_BY_EVENT: Record<string, string> = {
  WEDDING: "kalandra",
  BIRTHDAY: "kalandra-birthday",
  KHITAN: "al-fariz",
  AQIQAH: "al-khalid",
  WISUDA: "cendekia",
  GATHERING: "sinergi",
};

/**
 * Tema dibagi dua keluarga: pernikahan (dua nama, mempelai) dan satu nama (ulang tahun, khitan, aqiqah, wisuda,
 * gathering). Tema satu nama hanya memakai kontrak data bersama (`applySingleNameContract` di lib/themeEngine.ts),
 * sehingga boleh dipakai jenis acara non-pernikahan mana pun.
 */
export function isThemeCompatible(themeEventType?: string | null, invitationEventType?: string | null): boolean {
  const themeIsWedding = (themeEventType || "WEDDING").toUpperCase() === "WEDDING";
  const invitationIsWedding = (invitationEventType || "WEDDING").toUpperCase() === "WEDDING";
  return themeIsWedding === invitationIsWedding;
}

const EVENT_NOUN: Record<string, string> = {
  WEDDING: "pernikahan",
  BIRTHDAY: "ulang tahun",
  KHITAN: "khitanan",
  AQIQAH: "aqiqah",
  WISUDA: "wisuda",
  GATHERING: "acara",
};

/** Kata benda jenis acara untuk teks antarmuka, mis. "undangan wisuda Anda". */
export function eventNoun(eventType?: string | null): string {
  return EVENT_NOUN[eventType || "WEDDING"] || "acara";
}

export function resolveInvitationDisplayName(inv: {
  eventType?: string | null;
  groomNickname?: string | null;
  brideNickname?: string | null;
  participantsJson?: string | null;
  invitationSlug?: string | null;
}): string {
  if (!inv.eventType || inv.eventType === "WEDDING") {
    return `${inv.groomNickname || "Pria"} & ${inv.brideNickname || "Wanita"}`;
  }
  const p = safeParseParticipants(inv.participantsJson);
  if (inv.eventType === "BIRTHDAY") return `${p.person?.nickname || p.person?.name || "—"} — Ulang Tahun ke-${p.person?.age || "?"}`;
  if (inv.eventType === "KHITAN")   return `${p.child?.nickname || p.child?.name || "—"} — Khitanan`;
  if (inv.eventType === "AQIQAH")   return `${p.baby?.nickname || p.baby?.name || "—"} — Aqiqah`;
  if (inv.eventType === "WISUDA")   return `${p.person?.nickname || p.person?.name || "—"} — Wisuda`;
  if (inv.eventType === "GATHERING")return p.event?.title || "Gathering";
  return inv.invitationSlug || "Undangan";
}

export function buildCanonicalPath(inv: {
  eventType?: string | null;
  groomSlug?: string | null;
  brideSlug?: string | null;
  invitationSlug: string;
}): string {
  if (!inv.eventType || inv.eventType === "WEDDING") {
    return `/${inv.groomSlug || "mempelai"}-${inv.brideSlug || "mempelai"}/${inv.invitationSlug}`;
  }
  return `/${inv.invitationSlug}`;
}

export function buildCalendarTitle(eventType: string, participants: any): string {
  switch (eventType) {
    case "WEDDING":  return `The Wedding of ${participants.groomName || "Mempelai Pria"} & ${participants.brideName || "Mempelai Wanita"}`;
    case "BIRTHDAY": return `Ulang Tahun ${participants.personName || "Sahabat"} ke-${participants.personAge || ""}`.trim();
    case "KHITAN":   return `Khitanan ${participants.childName || "Anak Tercinta"}`;
    case "AQIQAH":   return `Aqiqah ${participants.babyName || "Buah Hati"}`;
    case "WISUDA":   return `Wisuda ${participants.personName || "Wisudawan"}`;
    default:         return participants.eventTitle || "Undangan Acara";
  }
}

export function getMediaSlotLabel(slot: string, eventType?: string | null): string {
  if (!eventType || eventType === "WEDDING") {
    return slot === "GROOM_PHOTO" ? "Foto Mempelai Pria"
         : slot === "BRIDE_PHOTO" ? "Foto Mempelai Wanita" : slot;
  }
  if (slot === "GROOM_PHOTO") {
    if (eventType === "BIRTHDAY") return "Foto Yang Berulang Tahun";
    if (eventType === "KHITAN")   return "Foto Anak";
    if (eventType === "WISUDA")   return "Foto Wisudawan";
    if (eventType === "AQIQAH")   return "Foto Bayi";
  }
  return slot;
}

export function buildZipFileName(inv: {
  eventType?: string | null;
  groomSlug?: string | null;
  brideSlug?: string | null;
  invitationSlug: string;
}): string {
  if (!inv.eventType || inv.eventType === "WEDDING") {
    return `Guest_Memories_${inv.groomSlug || "mempelai"}_${inv.brideSlug || "mempelai"}.zip`;
  }
  return `Guest_Memories_${inv.invitationSlug}.zip`;
}

export const STAFF_PIN_PATTERN = /^[A-Za-z0-9]{4,10}$/;
