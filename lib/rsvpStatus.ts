export type RsvpStatus = "hadir" | "tidak" | "ragu";

export const RSVP_NAME_MAX = 100;
export const RSVP_MESSAGE_MAX = 1000;

// Tema mengirim dua ragam nilai (hadir/tidak dan HADIR/RAGU/TIDAK_HADIR); semuanya dipetakan ke tiga nilai kanonik.
const ALIASES: Record<string, RsvpStatus> = {
  hadir: "hadir",
  tidak: "tidak",
  tidak_hadir: "tidak",
  ragu: "ragu",
  ragu_ragu: "ragu",
};

export function normalizeRsvpStatus(raw: unknown): RsvpStatus | null {
  const key = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIASES[key] ?? null;
}
