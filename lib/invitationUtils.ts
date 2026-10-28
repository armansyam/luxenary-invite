import { participantNames, safeParseParticipants } from "./participantUtils";

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

/** Tema yang dibuat untuk jenis acara undangan tampil lebih dulu; urutan katalog lainnya tetap (sort stabil). */
export function sortThemesForEvent<T extends { eventType?: string | null }>(themes: T[], invitationEventType?: string | null): T[] {
  const ev = (invitationEventType || "WEDDING").toUpperCase();
  const own = (t: T) => ((t.eventType || "WEDDING").toUpperCase() === ev ? 1 : 0);
  return [...themes].sort((a, b) => own(b) - own(a));
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
  participantsJson?: unknown;
  invitationSlug?: string | null;
}): string {
  if (!inv.eventType || inv.eventType === "WEDDING") {
    return participantNames("WEDDING", inv.participantsJson).short || inv.invitationSlug || "Undangan";
  }
  const p = safeParseParticipants(inv.participantsJson);
  if (inv.eventType === "BIRTHDAY") return `${p.person?.nickname || p.person?.name || "—"} — Ulang Tahun ke-${p.person?.age || "?"}`;
  if (inv.eventType === "KHITAN")   return `${p.child?.nickname || p.child?.name || "—"} — Khitanan`;
  if (inv.eventType === "AQIQAH")   return `${p.baby?.nickname || p.baby?.name || "—"} — Aqiqah`;
  if (inv.eventType === "WISUDA")   return `${p.person?.nickname || p.person?.name || "—"} — Wisuda`;
  if (inv.eventType === "GATHERING")return p.event?.title || "Gathering";
  return inv.invitationSlug || "Undangan";
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

const TIMEZONE_OFFSET_HOURS: Record<string, number> = { WIB: 7, WITA: 8, WIT: 9 };
const CALENDAR_DEFAULT_HOURS = 3;

/**
 * Tautan "Simpan ke Google Calendar" untuk satu sesi acara. Jam lokal sesi (WIB/WITA/WIT, dari `timezone` atau teks
 * `time`) diubah ke UTC; tanpa jam selesai acara dianggap berlangsung 3 jam, tanpa jam mulai menjadi acara sehari
 * penuh. Dulu jam ditulis mati 08.00-21.00 WIB, sehingga resepsi 19.00 WITA tercatat 09.00 di kalender tamu.
 * Kosong bila tanggal tidak sah.
 */
export function buildGoogleCalendarUrl(
  event: { date?: string; startTime?: string; endTime?: string; time?: string; timezone?: string },
  title: string,
  location: string
): string {
  const date = String(event.date || "").split("T")[0];
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return "";
  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];

  const hhmm = (value?: string): [number, number] | null => {
    const m = String(value || "").match(/(\d{1,2})[.:](\d{2})/);
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? [Number(m[1]), Number(m[2])] : null;
  };
  const [timeFrom, timeTo] = String(event.time || "").split(/\s*[-–]\s*/);
  const start = hhmm(event.startTime) ?? hhmm(timeFrom);
  const end = hhmm(event.endTime) ?? hhmm(timeTo);
  const zone = (`${event.timezone || ""} ${event.time || ""}`.toUpperCase().match(/\b(WITA|WIT|WIB)\b/) || [, "WIB"])[1] as string;
  const offset = TIMEZONE_OFFSET_HOURS[zone];

  let dates: string;
  if (start) {
    const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const startMs = Date.UTC(year, month - 1, day, start[0] - offset, start[1]);
    let endMs = end ? Date.UTC(year, month - 1, day, end[0] - offset, end[1]) : startMs + CALENDAR_DEFAULT_HOURS * 3_600_000;
    if (endMs <= startMs) endMs += 24 * 3_600_000;
    dates = `${stamp(startMs)}/${stamp(endMs)}`;
  } else {
    const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
    dates = `${ymd(new Date(Date.UTC(year, month - 1, day)))}/${ymd(new Date(Date.UTC(year, month - 1, day + 1)))}`;
  }
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&location=${encodeURIComponent(location)}`;
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

export function buildZipFileName(inv: { invitationSlug: string }): string {
  return `Guest_Memories_${inv.invitationSlug}.zip`;
}

export const STAFF_PIN_PATTERN = /^[A-Za-z0-9]{4,10}$/;
