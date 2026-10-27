import { DAY_MS, getPrimaryEventDate } from "@/lib/lifecycleDates";

export interface RepublishCandidate {
  id: string;
  status: string;
  eventData: unknown;
  isLockedPermanently: boolean;
}

export interface RepublishPlan {
  eligible: string[];
  skipped: Array<{ id: string; reason: string }>;
}

/**
 * Undangan terbit disajikan dari snapshot HTML statis, sehingga perbaikan mesin render baru sampai ke klien setelah
 * diterbitkan ulang. Menerbitkan ulang undangan yang acaranya sudah dekat berisiko (tamu sedang membuka undangan), jadi
 * hanya undangan berstatus PUBLISHED, tidak terkunci permanen, dengan hari tamu datang sekurang-kurangnya `minDays`
 * hari lagi yang dipilih. Undangan tanpa tanggal acara dilewati, bukan ditebak.
 */
export function planRepublish(candidates: RepublishCandidate[], now: Date, minDays: number): RepublishPlan {
  const plan: RepublishPlan = { eligible: [], skipped: [] };
  for (const inv of candidates) {
    if (inv.status !== "PUBLISHED") {
      plan.skipped.push({ id: inv.id, reason: `status ${inv.status}` });
    } else if (inv.isLockedPermanently) {
      plan.skipped.push({ id: inv.id, reason: "terkunci permanen" });
    } else {
      const eventDay = getPrimaryEventDate(inv.eventData);
      if (!eventDay) plan.skipped.push({ id: inv.id, reason: "tanpa tanggal acara" });
      else if (eventDay.getTime() - now.getTime() < minDays * DAY_MS) plan.skipped.push({ id: inv.id, reason: `acara kurang dari ${minDays} hari lagi atau sudah lewat` });
      else plan.eligible.push(inv.id);
    }
  }
  return plan;
}
