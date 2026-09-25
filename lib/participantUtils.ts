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
    fatherName?: string;
    motherName?: string;
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
    fatherName?: string;
    motherName?: string;
  };
}

export interface WisudaParticipants {
  graduate?: {
    name?: string;
    nickname?: string;
    degree?: string;
    major?: string;
    faculty?: string;
    university?: string;
    honors?: string;
    thesisTitle?: string;
  };
  parents?: {
    fatherName?: string;
    motherName?: string;
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

/**
 * Returns the primary human-readable display title/subject for an invitation based on eventType.
 */
export function getEventSubject(eventType: string | undefined | null, rawJson: string | null | undefined, fallbackCouple?: string): string {
  const p = safeParseParticipants(rawJson);
  const type = (eventType || "WEDDING").toUpperCase();

  switch (type) {
    case "BIRTHDAY":
      return p.person?.name || p.person?.nickname || "Ulang Tahun";
    case "KHITAN":
      return p.child?.name || p.child?.nickname || "Walimatul Khitan";
    case "AQIQAH":
      return p.baby?.name || p.baby?.nickname || "Tasyakuran Aqiqah";
    case "WISUDA":
      return p.graduate?.name || p.graduate?.nickname || "Wisuda";
    case "GATHERING":
      return p.event?.title || "Gathering";
    case "WEDDING":
    default:
      return fallbackCouple || "Mempelai";
  }
}
