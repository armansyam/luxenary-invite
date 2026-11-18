import { safeCssColor } from "@/lib/safeCss";
import { readInvitationDraft } from "@/lib/invitationDraft";

/**
 * Warna utama tema (`--primary` di blok :root) dari piring draf undangan, yaitu salinan master yang benar-benar dirender
 * untuk undangan itu. Slot milik tema yang kosong dan tanpa gambar bawaan jatuh ke palet tema; Studio menampilkan warna
 * ini agar klien tahu apa yang dipakai. Kosong bila draf tidak ada atau tidak mendefinisikan warna yang sah.
 */
export async function themeMainColor(invitationId: string): Promise<string> {
  const draft = await readInvitationDraft(invitationId);
  return draft ? primaryColorOf(draft.html) : "";
}

export function primaryColorOf(html: string): string {
  const root = html.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const value = root.match(/--primary\s*:\s*([^;]+);/)?.[1] ?? "";
  return safeCssColor(value, "");
}
