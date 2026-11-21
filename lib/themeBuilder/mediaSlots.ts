import { isThemeOwnedPath } from "@/lib/safeUrl";
import { primaryPhotoSlotForEvent } from "@/lib/mediaSlots";
import type { ThemeMediaSlots } from "@/lib/themeMediaSlots";
import {
  normalizeMediaSlotForEvent,
  SECTION_LABELS,
  type BuilderBlockId,
  type BuilderOrnament,
  type BuilderSpec,
  type OrnamentMediaSlot,
} from "@/lib/themeBuilder/spec";

function isBlockHidden(spec: Pick<BuilderSpec, "blocks">, block: BuilderBlockId, autoHiddenOpening: boolean): boolean {
  return Boolean(spec.blocks[block]?.hidden) || (block === "opening-photo" && autoHiddenOpening);
}

function isOrnamentHidden(spec: Pick<BuilderSpec, "blocks" | "eventsPlacement">, o: BuilderOrnament, autoHiddenOpening: boolean): boolean {
  if (o.section === "events" && spec.eventsPlacement === "home") return true;
  if (o.attach && isBlockHidden(spec, o.attach, autoHiddenOpening)) return true;
  if (o.before && isBlockHidden(spec, o.before, autoHiddenOpening)) return true;
  return false;
}

function collectBuilderSlotUsage(spec: BuilderSpec) {
  const isWedding = spec.eventType === "WEDDING";
  const primaryPhotoSlot = primaryPhotoSlotForEvent(spec.eventType);
  const places = new Map<string, string[]>();
  const previews = new Map<string, string>();
  const add = (slot: string, place: string) => places.set(slot, [...(places.get(slot) ?? []), place]);
  const setPreview = (slot: string, src: string | undefined) => {
    if (src && !previews.has(slot) && isThemeOwnedPath(src)) previews.set(slot, src);
  };
  const slotOf = (slot: OrnamentMediaSlot) => normalizeMediaSlotForEvent(slot, spec.eventType) as OrnamentMediaSlot;
  const autoHiddenOpening = autoHiddenOpeningPhoto(spec);
  const hidden = (block: BuilderBlockId) => isBlockHidden(spec, block, autoHiddenOpening);

  add("LANDING_COVER", "Sampul");
  add("LANDING_COVER_DESKTOP", "Sampul desktop");
  if (spec.desktopLayout !== "centered") add("DESKTOP_SIDEBAR", "Panel foto desktop");
  add("GLOBAL_FIXED_BG", "Latar halaman");
  if (!hidden("opening-photo")) add("HOME_PHOTO", "Foto pembuka");
  if (!isWedding) {
    if (!hidden("couple-photo-1")) {
      add(primaryPhotoSlot, spec.eventType === "EVENT" ? "Visual utama acara" : "Foto profil");
    }
  } else {
    if (!hidden("couple-photo-1") || !hidden("couple-photo-2")) {
      add("GROOM_PHOTO", "Profil mempelai");
      add("BRIDE_PHOTO", "Profil mempelai");
    }
  }
  add("CLOSING_COVER", "Penutup");

  for (const o of spec.ornaments) {
    if (isOrnamentHidden(spec, o, autoHiddenOpening)) continue;
    const rawSlot = o.slot ?? o.replaceSlot;
    if (!rawSlot) continue;
    const targetSlot = slotOf(rawSlot);
    add(targetSlot, `${o.slot ? "Bingkai" : "Ilustrasi"} di ${SECTION_LABELS[o.section]}`);
    if (o.replaceSlot) setPreview(targetSlot, o.src);
  }
  for (const f of spec.freeSections ?? []) {
    if (f.photo && f.photo.source !== "asset") {
      const targetSlot = slotOf(f.photo.slot);
      add(targetSlot, `Seksi ${f.title.trim() || "tambahan"}`.slice(0, 40));
      if (f.photo.source === "replaceable") setPreview(targetSlot, f.photo.src);
    }
  }

  return { places, previews };
}

/**
 * Seluruh slot foto klien yang terdeteksi dari spesifikasi builder (sebelum penyaringan `disabledMediaSlots`).
 * Dipakai panel Terbit di Theme Builder agar admin dapat memilih slot mana yang boleh/dikunci untuk klien.
 */
export function builderDetectedMediaSlots(spec: BuilderSpec): ThemeMediaSlots {
  const { places, previews } = collectBuilderSlotUsage(spec);
  const out: ThemeMediaSlots = {};
  for (const [slot, list] of places) {
    const preview = previews.get(slot);
    out[slot as keyof ThemeMediaSlots] = {
      places: [...new Set(list)].slice(0, 6),
      ...(preview ? { preview } : {}),
    };
  }
  return out;
}

/**
 * Slot foto klien yang dipakai tema builder (Theme.mediaSlots), dihitung dari spesifikasi saat disimpan: slot bawaan
 * blueprint (sampul, latar, panel foto desktop, penutup), blok foto yang tidak disembunyikan, dan setiap ornamen atau
 * foto seksi bebas yang memakai slot klien, dikurangi slot yang sengaja dikunci admin (`disabledMediaSlots`).
 */
export function builderMediaSlots(spec: BuilderSpec): ThemeMediaSlots {
  const detected = builderDetectedMediaSlots(spec);
  const disabled = new Set(spec.disabledMediaSlots ?? []);
  if (!disabled.size) return detected;
  const out: ThemeMediaSlots = {};
  for (const [slot, decl] of Object.entries(detected)) {
    if (!disabled.has(slot as keyof ThemeMediaSlots)) {
      out[slot as keyof ThemeMediaSlots] = decl;
    }
  }
  return out;
}

/**
 * Bingkai atau ilustrasi berslot Home di seksi pembuka menggantikan blok foto pembuka bawaan, kecuali admin sudah mengatur
 * blok itu sendiri atau ornamen menempel/sebaris pada blok `opening-photo` maupun blok tersembunyi; dipakai compile.ts dan
 * perhitungan slot di atas.
 */
export function autoHiddenOpeningPhoto(spec: Pick<BuilderSpec, "ornaments" | "blocks">): boolean {
  if (spec.blocks["opening-photo"]) return false;
  return spec.ornaments.some((o) => {
    if (o.section !== "opening" || (o.slot !== "HOME_PHOTO" && o.replaceSlot !== "HOME_PHOTO")) return false;
    if (o.attach === "opening-photo" || o.before === "opening-photo") return false;
    if (o.attach && spec.blocks[o.attach]?.hidden) return false;
    if (o.before && spec.blocks[o.before]?.hidden) return false;
    return true;
  });
}

/** Slot klien yang tampil di lebih dari satu tempat, untuk peringatan di builder (foto klien yang sama tampil berulang). */
export function builderSlotReuse(spec: BuilderSpec): Array<{ slot: string; places: string[] }> {
  const { places } = collectBuilderSlotUsage(spec);
  const disabled = new Set(spec.disabledMediaSlots ?? []);
  const out: Array<{ slot: string; places: string[] }> = [];
  for (const [slot, list] of places) {
    if (disabled.has(slot as keyof ThemeMediaSlots)) continue;
    if (list.length <= 1) continue;
    const counts = new Map<string, number>();
    for (const p of list) counts.set(p, (counts.get(p) ?? 0) + 1);
    const formatted = [...counts.entries()].map(([p, n]) => (n > 1 ? `${p} (${n}×)` : p));
    out.push({ slot, places: formatted });
  }
  return out;
}
