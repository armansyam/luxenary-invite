export interface WeddingPerson {
  name?: string;
  nickname?: string;
  father?: string;
  mother?: string;
  instagram?: string;
}

export interface WeddingParticipants {
  groom?: WeddingPerson;
  bride?: WeddingPerson;
}

/** Nama yang dipakai di luar tema: judul kartu, resepsionis, QR, email, dan deskripsi tagihan. */
export interface ParticipantNames {
  /** Nama lengkap; pernikahan "Pria & Wanita". */
  full: string;
  /** Nama panggilan (jatuh ke nama lengkap); pernikahan "Pria & Wanita". */
  short: string;
  /** Nama orang pertama dan kedua untuk inisial QR (kedua kosong untuk acara satu nama). */
  first: string;
  second: string;
}

const trimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Tokoh utama acara satu nama di dalam objek peserta. */
function singlePerson(eventType: string | null | undefined, p: Record<string, any>): { name: string; nickname: string } {
  if (eventType === "GATHERING") return { name: trimmed(p.event?.title), nickname: trimmed(p.event?.title) };
  const person = eventType === "KHITAN" ? p.child : eventType === "AQIQAH" ? p.baby : p.person;
  return { name: trimmed(person?.name), nickname: trimmed(person?.nickname) };
}

export function participantNames(eventType: string | null | undefined, raw: unknown): ParticipantNames {
  const p = safeParseParticipants(raw);
  if (!eventType || eventType === "WEDDING") {
    const groom = { name: trimmed(p.groom?.name), nickname: trimmed(p.groom?.nickname) };
    const bride = { name: trimmed(p.bride?.name), nickname: trimmed(p.bride?.nickname) };
    return {
      full: [groom.name, bride.name].filter(Boolean).join(" & "),
      short: [groom.nickname || groom.name, bride.nickname || bride.name].filter(Boolean).join(" & "),
      first: groom.nickname || groom.name,
      second: bride.nickname || bride.name,
    };
  }
  const main = singlePerson(eventType, p);
  return { full: main.name, short: main.nickname || main.name, first: main.nickname || main.name, second: "" };
}

/**
 * Field data template pernikahan (dipakai sunting langsung di pratinjau, data-lux-field) dan lokasinya di objek peserta.
 */
export const WEDDING_PARTICIPANT_FIELDS: Record<string, [keyof WeddingParticipants, keyof WeddingPerson]> = {
  groomName: ["groom", "name"],
  groomNickname: ["groom", "nickname"],
  groomFather: ["groom", "father"],
  groomMother: ["groom", "mother"],
  groomInstagram: ["groom", "instagram"],
  brideName: ["bride", "name"],
  brideNickname: ["bride", "nickname"],
  brideFather: ["bride", "father"],
  brideMother: ["bride", "mother"],
  brideInstagram: ["bride", "instagram"],
};

export function isWeddingField(field: string): boolean {
  return Object.prototype.hasOwnProperty.call(WEDDING_PARTICIPANT_FIELDS, field);
}

export function weddingFieldValue(raw: unknown, field: string): string {
  if (!isWeddingField(field)) return "";
  const [role, key] = WEDDING_PARTICIPANT_FIELDS[field];
  const value = safeParseParticipants(raw)[role]?.[key];
  return typeof value === "string" ? value : "";
}

/** Salinan objek peserta dengan satu field template pernikahan (mis. "groomName") diganti nilainya. */
export function withWeddingField(raw: unknown, field: string, value: string): Record<string, any> {
  const participants = safeParseParticipants(raw);
  if (!isWeddingField(field)) return participants;
  const [role, key] = WEDDING_PARTICIPANT_FIELDS[field];
  return { ...participants, [role]: { ...(participants[role] || {}), [key]: value } };
}

/** Objek peserta dari kolom jsonb `participantsJson` (atau string JSON dari body permintaan). */
export function safeParseParticipants(raw: unknown): Record<string, any> {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, any>) : {};
}
