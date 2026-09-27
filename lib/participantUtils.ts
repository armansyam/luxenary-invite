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
