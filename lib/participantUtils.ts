export interface BirthdayParticipants {
  person?: {
    name?: string;
    nickname?: string;
    age?: number | string;
    birthDate?: string;
    fatherName?: string;
    motherName?: string;
    instagram?: string;
  };
}

export interface KhitanParticipants {
  child?: {
    name?: string;
    nickname?: string;
    age?: number | string;
    birthOrder?: string;
  };
  parents?: {
    father?: string;
    mother?: string;
  };
}

export interface AqiqahParticipants {
  baby?: {
    name?: string;
    nickname?: string;
    gender?: "male" | "female" | string;
    birthDate?: string;
    dayAge?: number | string;
    birthWeight?: string;
    birthLength?: string;
  };
  parents?: {
    father?: string;
    mother?: string;
  };
}

export interface WisudaParticipants {
  person?: {
    name?: string;
    nickname?: string;
    degree?: string;
    major?: string;
    faculty?: string;
    institution?: string;
    honors?: string;
  };
  parents?: {
    father?: string;
    mother?: string;
  };
}

export interface GatheringParticipants {
  event?: {
    title?: string;
    subtitle?: string;
    organizer?: string;
    hostName?: string;
    dresscode?: string;
  };
}

type NameMirrorField = "groomName" | "groomNickname" | "groomFather" | "groomMother" | "groomInstagram";

/**
 * Acara non-pernikahan menyimpan nama tokoh utama di participantsJson, tetapi resepsionis, QR check-in,
 * notifikasi, dan audit terbit membaca kolom groom*. Semua jalur simpan memakai pemetaan ini agar keduanya selalu sama.
 */
export function mirrorParticipantNames(eventType: string | null | undefined, p: Record<string, any>): Partial<Record<NameMirrorField, string>> {
  let entries: [NameMirrorField, unknown][] = [];
  if (eventType === "BIRTHDAY") {
    entries = [["groomName", p.person?.name], ["groomNickname", p.person?.nickname], ["groomFather", p.person?.fatherName], ["groomMother", p.person?.motherName], ["groomInstagram", p.person?.instagram]];
  } else if (eventType === "KHITAN") {
    entries = [["groomName", p.child?.name], ["groomNickname", p.child?.nickname], ["groomFather", p.parents?.father], ["groomMother", p.parents?.mother]];
  } else if (eventType === "AQIQAH") {
    entries = [["groomName", p.baby?.name], ["groomNickname", p.baby?.nickname], ["groomFather", p.parents?.father], ["groomMother", p.parents?.mother]];
  } else if (eventType === "WISUDA") {
    entries = [["groomName", p.person?.name], ["groomNickname", p.person?.nickname]];
  } else if (eventType === "GATHERING") {
    entries = [["groomName", p.event?.title]];
  }
  const mirrored: Partial<Record<NameMirrorField, string>> = {};
  for (const [field, value] of entries) {
    if (typeof value === "string") mirrored[field] = value.trim();
  }
  return mirrored;
}

export function safeParseParticipants(raw: string | null | undefined): Record<string, any> {
  if (!raw || raw.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    console.error("[safeParseParticipants] JSON malformed:", raw?.slice(0, 100));
    return {};
  }
}
