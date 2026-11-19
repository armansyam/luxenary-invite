import { isThemeOwnedPath } from "@/lib/safeUrl";
import type { ThemeMediaSlots } from "@/lib/themeMediaSlots";
import {
  builderFamilyOf,
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
  const single = builderFamilyOf(spec.eventType) === "single";
  const places = new Map<string, string[]>();
  const previews = new Map<string, string>();
  const add = (slot: string, place: string) => places.set(slot, [...(places.get(slot) ?? []), place]);
  const setPreview = (slot: string, src: string | undefined) => {
    if (src && !previews.has(slot) && isThemeOwnedPath(src)) previews.set(slot, src);
  };
  // Pada tema satu nama "BRIDE_PHOTO" memakai foto tokoh yang sama dengan "GROOM_PHOTO" (lib/themeBuilder/compile.ts).
  const slotOf = (slot: OrnamentMediaSlot) => (single && slot === "BRIDE_PHOTO" ? "GROOM_PHOTO" : slot);
  const autoHiddenOpening = autoHiddenOpeningPhoto(spec);
  const hidden = (block: BuilderBlockId) => isBlockHidden(spec, block, autoHiddenOpening);

  add("LANDING_COVER", "Sampul");
  add("LANDING_COVER_DESKTOP", "Sampul desktop");
  if (spec.desktopLayout !== "centered") add("DESKTOP_SIDEBAR", "Panel foto desktop");
  add("GLOBAL_FIXED_BG", "Latar halaman");
  if (!hidden("opening-photo")) add("HOME_PHOTO", "Foto pembuka");
  if (single) {
    if (!hidden("couple-photo-1")) add("GROOM_PHOTO", "Foto profil");
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
 * Slot foto klien yang dipakai tema builder (Theme.mediaSlots), dihitung dari spesifikasi saat disimpan: slot bawaan
 * blueprint (sampul, latar, panel foto desktop, penutup), blok foto yang tidak disembunyikan, dan setiap ornamen atau
 * foto seksi bebas yang memakai slot klien. Hanya membaca spesifikasi; tidak menyentuh berkas atau database.
 */
export function builderMediaSlots(spec: BuilderSpec): ThemeMediaSlots {
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
  const out: Array<{ slot: string; places: string[] }> = [];
  for (const [slot, list] of places) {
    if (list.length <= 1) continue;
    const counts = new Map<string, number>();
    for (const p of list) counts.set(p, (counts.get(p) ?? 0) + 1);
    const formatted = [...counts.entries()].map(([p, n]) => (n > 1 ? `${p} (${n}×)` : p));
    out.push({ slot, places: formatted });
  }
  return out;
}
