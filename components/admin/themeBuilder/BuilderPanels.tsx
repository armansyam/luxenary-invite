"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  ANIMATION_OPTIONS,
  EVENTS_PLACEMENTS,
  FONT_OPTIONS,
  PALETTE_PRESETS,
  RADIUS_OPTIONS,
  TEXTURE_OPTIONS,
  BUILDER_DEFAULT_SLOTS,
  MAX_BUILDER_TEXT_LENGTH,
  blockLabelFor,
  familyBlocks,
  familyOrderableSections,
  familyTexts,
  familyVariantGroups,
  isDefaultSectionOrder,
  moveSectionInOrder,
  sectionLabelFor,
  fontFamily,
  fontLabel,
  googleFontCssUrl,
  googleFontIds,
  isGoogleFontId,
  paletteChecks,
  ANIMATION_SPEEDS,
  NESTABLE_GUESTS,
  NESTING_HOSTS,
  type NestingHost,
  COUNTDOWN_PLACEMENTS,
  COVER_DESKTOP_MODES,
  DESKTOP_LAYOUTS,
  FREE_PHOTO_SHAPES,
  familyOrnamentMediaSlots,
  type AnimationPreset,
  type DesktopLayout,
  type FreeSectionPhoto,
  type OrnamentMediaSlot,
  CARD_SHADOWS,
  DEFAULT_SECTION_IMAGE_OPACITY,
  DEFAULT_SECTION_STYLE,
  FREE_SECTION_IDS,
  FREE_SECTION_LIMITS,
  MAX_CUSTOM_CSS_LENGTH,
  PALETTE_EXTRA_FIELDS,
  SECTION_BG_TOKENS,
  SECTION_GRADIENTS,
  SECTION_IMAGE_OPACITY_LIMITS,
  SECTION_TONES,
  SURFACE_LIMITS,
  customCssError,
  isDefaultSectionStyle,
  type BuilderBlockId,
  type BuilderPalette,
  type BuilderSpec,
  type BuilderTextKey,
  type BuilderVariants,
  type CardShadow,
  type FreeSection,
  type FreeSectionId,
  type OrderableSection,
  type OrnamentSection,
  type SectionStyle,
  type SurfaceStyle,
} from "@/lib/themeBuilder/spec";
import type { BuilderEventType } from "@/lib/themeBuilder/spec";
import { SIM_GALLERY_MAX, SIM_MEDIA_MAX_AGE_DAYS, simSlotsFor, type SimMedia, type SimSlot } from "@/lib/themeBuilder/simSlots";
import { GoogleFontPicker } from "@/components/admin/themeBuilder/GoogleFontPicker";
import { BUILDER_TEMPLATES, type BuilderTemplate } from "@/lib/themeBuilder/templates";

export type PanelId = "colors" | "type" | "texts" | "layout" | "ornaments" | "motion" | "simulate" | "publish";

export interface AssetLibrary {
  uploads: Array<{ url: string; size: number; uploadedAt: number; opaque: boolean }>;
  builtin: Array<{ id: string; label: string; items: string[] }>;
}

export interface ThemeMeta {
  id: string;
  name: string;
  category: "minimalist" | "modern" | "traditional";
  description: string;
  /** URL lagu dari pustaka musik sistem; kosong memakai musik bawaan seri. */
  defaultMusicUrl: string;
}

export interface PublishState {
  isNew: boolean;
  isActive: boolean;
  dirty: boolean;
  saving: boolean;
  issues: Array<{ code: string; message: string }>;
}

export interface MusicOption {
  id: string;
  title: string;
  composer: string | null;
  url: string;
}

export interface RevisionRow {
  id: string;
  action: string;
  adminName: string | null;
  createdAt: string;
  name: string;
}

const REVISION_ACTION_LABEL: Record<string, string> = { CREATE: "Versi awal", SAVE: "Disimpan" };

const revisionTime = (iso: string) => new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

export const PANEL_TABS: Array<{ id: PanelId; label: string; icon: string }> = [
  { id: "colors", label: "Warna", icon: "M12 3a9 9 0 100 18c1.1 0 1.5-.9 1.5-1.6 0-.9-.8-1.3-.8-2.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 004-4c0-4.7-4-8.5-9-8.5zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01" },
  { id: "type", label: "Huruf", icon: "M4 7V5h16v2M9 19h6M12 5v14" },
  { id: "texts", label: "Teks", icon: "M4 6h16M4 12h10M4 18h14" },
  { id: "layout", label: "Tata letak", icon: "M4 5h16v5H4zM4 14h7v5H4zM15 14h5v5h-5z" },
  { id: "ornaments", label: "Ornamen", icon: "M12 3c1.5 3 4 4.5 7 5-3 1-5.5 3-7 7-1.5-4-4-6-7-7 3-.5 5.5-2 7-5zM5 18l1.5 3M19 18l-1.5 3" },
  { id: "motion", label: "Animasi", icon: "M4 12h4l3-7 4 14 3-7h2" },
  { id: "simulate", label: "Foto uji", icon: "M4 7h3l2-2h6l2 2h3v12H4zM12 16a3 3 0 100-6 3 3 0 000 6z" },
  { id: "publish", label: "Terbit", icon: "M12 16V4m0 0l-4 4m4-4l4 4M5 20h14" },
];

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-stone-200/80 px-5 py-4 last:border-b-0">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{title}</h3>
      {hint && <p className="mt-1 text-[11.5px] leading-relaxed text-stone-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-xl bg-stone-100 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition cursor-pointer ${value === o.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PALETTE_FIELDS: Array<{ key: keyof BuilderPalette; label: string; hint: string }> = [
  { key: "primary", label: "Warna utama", hint: "Tombol, judul kecil, garis" },
  { key: "secondary", label: "Warna kedua", hint: "Pendamping warna utama" },
  { key: "accent", label: "Aksen", hint: "Sorotan dan detail ornamen" },
  { key: "bgLight", label: "Latar terang", hint: "Kanvas mode terang" },
  { key: "bgDark", label: "Latar gelap", hint: "Sampul, modal, mode gelap" },
  { key: "textDark", label: "Teks gelap", hint: "Tulisan di latar terang" },
  { key: "textLight", label: "Teks terang", hint: "Tulisan di foto dan latar gelap" },
  { key: "onPrimary", label: "Teks tombol", hint: "Tulisan di atas warna utama" },
];

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = focused ? draft : value;
  return (
    <label className="flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-stone-50">
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-stone-900/10" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={label} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold text-stone-800">{label}</span>
        <span className="block truncate text-[11px] text-stone-500">{hint}</span>
      </span>
      <input
        value={shown}
        onFocus={() => { setDraft(value); setFocused(true); }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const v = e.target.value.trim().toLowerCase();
          setDraft(v);
          if (/^#[0-9a-f]{6}$/.test(v)) onChange(v);
        }}
        className="w-[78px] rounded-lg border border-stone-200 bg-white px-2 py-1.5 font-mono text-[11.5px] text-stone-700 outline-none focus:border-amber-500"
        spellCheck={false}
      />
    </label>
  );
}

function BackdropUpload({ uploading, onUpload }: { uploading: boolean; onUpload: (files: FileList) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-[12px] font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 cursor-pointer"
      >
        <Icon d="M12 16V4m0 0l-4 4m4-4l4 4M5 20h14" className="h-4 w-4 text-stone-500" />
        {uploading ? "Mengunggah…" : "Unggah gambar latar (PNG, WebP, JPEG)"}
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" multiple hidden onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }} />
    </>
  );
}

const rangeClass = "mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-600";

function RangeRow({ label, value, unit, min, max, step = 1, onChange, onReset }: { label: string; value: number | undefined; unit: string; min: number; max: number; step?: number; onChange: (v: number) => void; onReset?: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11.5px] font-semibold text-stone-700">
        <span className="flex items-center gap-1.5">
          {label}
          {value !== undefined && onReset && (
            <button type="button" onClick={onReset} className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 cursor-pointer">Ikut varian</button>
          )}
        </span>
        <span className="font-mono text-[11px] text-stone-500">{value === undefined ? "varian" : `${value}${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value ?? min} onChange={(e) => onChange(Number(e.target.value))} className={rangeClass} aria-label={label} />
    </div>
  );
}

/** Warna contoh token latar seksi di panel, dihitung dari palet yang sama dengan :root master. */
function sectionTokenSwatch(token: SectionStyle["bg"], palette: BuilderPalette, dark: boolean): string {
  const canvas = dark ? palette.bgDark : palette.bgLight;
  switch (token) {
    case "light": return palette.bgLight;
    case "dark": return palette.bgDark;
    case "primary": return palette.primary;
    case "secondary": return palette.secondary;
    case "accent": return palette.accent;
    case "card": return `color-mix(in srgb, ${canvas} ${dark ? 86 : 78}%, ${palette.textLight})`;
    default: return canvas;
  }
}

function SectionStyleEditor({
  value,
  palette,
  dark,
  backdrops,
  onChange,
}: {
  value: SectionStyle;
  palette: BuilderPalette;
  dark: boolean;
  backdrops: ReadonlyArray<{ id: string; label: string }>;
  onChange: (next: SectionStyle) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-stone-600">Warna latar</p>
        <div className="grid grid-cols-7 gap-1.5">
          {SECTION_BG_TOKENS.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              aria-pressed={value.bg === t.id}
              onClick={() => onChange({ ...value, bg: t.id })}
              className={`flex aspect-square items-center justify-center rounded-md border text-[9px] font-semibold transition cursor-pointer ${value.bg === t.id ? "border-amber-500 ring-2 ring-amber-300" : "border-stone-200 hover:border-stone-400"}`}
              style={{ background: sectionTokenSwatch(t.id, palette, dark), color: dark ? palette.textLight : palette.textDark }}
            >
              {t.id === "none" ? "Ikut" : ""}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-stone-600">Gradasi</p>
        <div className="grid grid-cols-3 gap-1">
          {SECTION_GRADIENTS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={value.gradient === g.id}
              disabled={value.bg === "none" && !value.image}
              onClick={() => onChange({ ...value, gradient: g.id })}
              className={`rounded-lg border px-1.5 py-1 text-[10.5px] font-semibold transition disabled:opacity-40 cursor-pointer ${value.gradient === g.id ? "border-amber-500 bg-amber-50 text-stone-900" : "border-stone-200 text-stone-600 hover:border-stone-300"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-stone-600">Nada teks</p>
        <Segmented value={value.tone} options={SECTION_TONES.map((t) => ({ id: t.id, label: t.label }))} onChange={(tone) => onChange({ ...value, tone })} />
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-stone-600">Gambar latar seksi</p>
        <div className="grid grid-cols-6 gap-1.5">
          {backdrops.map((t) => {
            const selected = (value.image ?? "") === t.id;
            return (
              <button
                key={t.id || "none"}
                type="button"
                title={t.id ? t.label : "Tanpa gambar"}
                aria-pressed={selected}
                onClick={() => {
                  const next: SectionStyle = { ...value };
                  if (t.id) next.image = t.id;
                  else { delete next.image; delete next.imageOpacity; }
                  onChange(next);
                }}
                className={`flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border bg-cover bg-center transition cursor-pointer ${selected ? "border-amber-500 ring-2 ring-amber-300" : "border-stone-200 hover:border-stone-400"}`}
                style={{ backgroundColor: sectionTokenSwatch("none", palette, dark), backgroundImage: t.id ? `url('${t.id}')` : undefined }}
              >
                {!t.id && <span className="text-[9px] font-semibold text-stone-500">Tanpa</span>}
              </button>
            );
          })}
        </div>
        {value.image && (
          <div className="mt-2">
            <RangeRow
              label="Gambar tembus"
              value={value.imageOpacity ?? DEFAULT_SECTION_IMAGE_OPACITY}
              unit="%"
              min={SECTION_IMAGE_OPACITY_LIMITS[0]}
              max={SECTION_IMAGE_OPACITY_LIMITS[1]}
              step={5}
              onChange={(v) => onChange({ ...value, imageOpacity: v === DEFAULT_SECTION_IMAGE_OPACITY ? undefined : v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionBackgroundsEditor({ spec, backdrops, onChange }: { spec: BuilderSpec; backdrops: ReadonlyArray<{ id: string; label: string }>; onChange: (patch: Partial<BuilderSpec>) => void }) {
  const [open, setOpen] = useState<OrderableSection | null>(null);
  const setStyle = (sec: OrderableSection, style: SectionStyle | null) => {
    const next = { ...(spec.sectionStyles ?? {}) };
    if (!style || isDefaultSectionStyle(style)) delete next[sec];
    else next[sec] = style;
    onChange({ sectionStyles: Object.keys(next).length ? next : undefined });
  };
  return (
    <Section title="Latar per seksi" hint="Beri tiap seksi latar sendiri: warna palet, gradasi, atau gambar, dengan nada teks yang sesuai. Penutup hanya memakai latar ini bila klien tidak memasang foto penutup.">
      <div className="space-y-1.5">
        {familyOrderableSections(spec.eventType, spec.sectionOrder).map((sec) => {
          const style = spec.sectionStyles?.[sec];
          const expanded = open === sec;
          return (
            <div key={sec} className={`rounded-xl border ${expanded ? "border-amber-400" : "border-stone-200"}`}>
              <button type="button" onClick={() => setOpen(expanded ? null : sec)} aria-expanded={expanded} className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-semibold text-stone-700 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded border border-stone-300" style={{ background: style ? sectionTokenSwatch(style.bg, spec.palette, spec.canvasMode === "dark") : "transparent" }} />
                  {sectionLabelFor(sec, spec.eventType)}
                </span>
                <span className="text-[10.5px] font-medium text-stone-500">{style ? "Diatur" : "Ikut kanvas"}</span>
              </button>
              {expanded && (
                <div className="border-t border-stone-100 px-3 py-3">
                  <SectionStyleEditor value={style ?? DEFAULT_SECTION_STYLE} palette={spec.palette} dark={spec.canvasMode === "dark"} backdrops={backdrops} onChange={(next) => setStyle(sec, next)} />
                  {style && (
                    <button type="button" onClick={() => setStyle(sec, null)} className="mt-3 w-full rounded-lg border border-stone-200 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer">
                      Kembalikan ke kanvas
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** Warna tambahan yang boleh kosong: kosong berarti mengikuti palet, dan contoh warnanya memakai nilai palet itu. */
function OptionalColorField({ label, hint, value, fallback, onChange }: { label: string; hint: string; value: string | undefined; fallback: string; onChange: (v: string | undefined) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <ColorField label={label} hint={value ? hint : `${hint} · mengikuti palet`} value={value ?? fallback} onChange={(v) => onChange(v)} />
      </div>
      {value && (
        <button type="button" onClick={() => onChange(undefined)} className="shrink-0 text-[11px] font-semibold text-stone-500 hover:text-stone-800 hover:underline cursor-pointer">
          Palet
        </button>
      )}
    </div>
  );
}

export function ColorsPanel({
  spec,
  library,
  uploading,
  onChange,
  onUpload,
  onDeleteAsset,
  onApplyTemplate,
}: {
  spec: BuilderSpec;
  library: AssetLibrary | null;
  uploading: boolean;
  onChange: (patch: Partial<BuilderSpec>) => void;
  onUpload: (files: FileList) => void;
  onDeleteAsset: (url: string) => void;
  onApplyTemplate: (template: BuilderTemplate) => void;
}) {
  const checks = paletteChecks(spec);
  const uploadedBackdrops = (library?.uploads ?? []).map((u) => ({ id: u.url, label: "Gambar unggahan" }));
  const backdrops: ReadonlyArray<{ id: string; label: string }> = [...TEXTURE_OPTIONS, ...uploadedBackdrops];
  return (
    <>
      <Section title="Template awal" hint="Rancangan lengkap sekali klik (warna, huruf, varian, latar seksi, tata letak, animasi). Teks dan media bawaan tetap; sisanya diganti.">
        <div className="grid grid-cols-1 gap-2">
          {BUILDER_TEMPLATES.map((t) => {
            const p = t.build(spec.eventType);
            return (
              <button key={t.id} type="button" onClick={() => onApplyTemplate(t)} className="flex items-center gap-3 rounded-xl border border-stone-200 p-2 text-left transition hover:border-amber-400 cursor-pointer">
                <span className="flex h-10 w-14 shrink-0 overflow-hidden rounded-lg" style={{ background: p.canvasMode === "dark" ? p.palette.bgDark : p.palette.bgLight }}>
                  <span className="flex flex-1 items-center justify-center text-[13px]" style={{ color: p.canvasMode === "dark" ? p.palette.textLight : p.palette.textDark, fontFamily: fontFamily(p.fonts.heading, "heading") }}>Aa</span>
                  <span className="w-2.5" style={{ background: p.palette.primary }} />
                  <span className="w-2.5" style={{ background: p.palette.accent }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-stone-800">{t.label}</span>
                  <span className="block text-[10.5px] leading-snug text-stone-500">{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Palet siap pakai" hint="Pilih titik awal, lalu sesuaikan warnanya di bawah.">
        <div className="grid grid-cols-2 gap-2">
          {PALETTE_PRESETS.map((preset) => {
            const active = JSON.stringify(preset.palette) === JSON.stringify(spec.palette) && preset.mode === spec.canvasMode;
            const p = preset.palette;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange({ palette: { ...preset.palette }, canvasMode: preset.mode })}
                className={`group rounded-xl border p-2 text-left transition cursor-pointer ${active ? "border-amber-500 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300"}`}
              >
                <span className="flex h-9 overflow-hidden rounded-lg" style={{ background: preset.mode === "dark" ? p.bgDark : p.bgLight }}>
                  <span className="flex flex-1 items-center justify-center text-[13px]" style={{ color: preset.mode === "dark" ? p.textLight : p.textDark, fontFamily: "'Cormorant Garamond', serif" }}>Aa</span>
                  <span className="w-3" style={{ background: p.primary }} />
                  <span className="w-3" style={{ background: p.accent }} />
                  <span className="w-3" style={{ background: p.bgDark }} />
                </span>
                <span className="mt-1.5 flex items-center justify-between text-[11.5px] font-semibold text-stone-700">
                  {preset.label}
                  <span className="text-[10px] font-medium text-stone-400">{preset.mode === "dark" ? "Gelap" : "Terang"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Suasana kanvas" hint="Terang: latar krem dengan teks gelap. Gelap: latar pekat dengan teks terang.">
        <Segmented value={spec.canvasMode} options={[{ id: "light", label: "Terang" }, { id: "dark", label: "Gelap" }]} onChange={(canvasMode) => onChange({ canvasMode })} />
      </Section>

      <Section title="Warna tema">
        <div className="-mx-1 space-y-0.5">
          {PALETTE_FIELDS.map((f) => (
            <ColorField key={f.key} label={f.label} hint={f.hint} value={spec.palette[f.key]} onChange={(v) => onChange({ palette: { ...spec.palette, [f.key]: v } })} />
          ))}
        </div>
      </Section>

      <Section title="Warna tambahan" hint="Opsional. Untuk tema yang butuh warna khusus di luar palet, misalnya teks kecil merah marun di atas judul putih.">
        <div className="-mx-1 space-y-0.5">
          {PALETTE_EXTRA_FIELDS.map((f) => {
            const dark = spec.canvasMode === "dark";
            const fallback = f.key === "heading" ? (dark ? spec.palette.textLight : spec.palette.textDark) : f.key === "card" ? (dark ? spec.palette.bgDark : spec.palette.bgLight) : spec.palette.primary;
            return (
              <OptionalColorField
                key={f.key}
                label={f.label}
                hint={f.hint}
                value={spec.paletteExtra?.[f.key]}
                fallback={fallback}
                onChange={(v) => {
                  const next = { ...(spec.paletteExtra ?? {}) };
                  if (v) next[f.key] = v;
                  else delete next[f.key];
                  onChange({ paletteExtra: Object.keys(next).length ? next : undefined });
                }}
              />
            );
          })}
        </div>
      </Section>

      <Section title="Keterbacaan" hint="Rasio kontras minimal agar tulisan mudah dibaca tamu, termasuk di layar HP yang redup.">
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="flex items-center gap-2 text-stone-700">
                <span className={`h-1.5 w-1.5 rounded-full ${c.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                {c.label}
              </span>
              <span className={`font-mono text-[11px] ${c.ok ? "text-stone-500" : "font-semibold text-amber-700"}`}>
                {c.ratio.toFixed(1)} / {c.min}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tekstur latar" hint="Klien tetap bisa mengganti latar lewat slot foto latar di Studio.">
        <BackdropUpload uploading={uploading} onUpload={onUpload} />
        <div className="grid grid-cols-4 gap-2">
          {backdrops.map((t) => (
            <div key={t.id || "none"} className="group relative">
              <button
                type="button"
                title={t.label}
                aria-pressed={spec.texture === t.id}
                onClick={() => onChange({ texture: t.id })}
                className={`block aspect-[3/4] w-full overflow-hidden rounded-lg border bg-cover bg-center transition cursor-pointer ${spec.texture === t.id ? "border-amber-500 ring-2 ring-amber-500/25" : "border-stone-200 hover:border-stone-300"}`}
                style={{ backgroundColor: spec.canvasMode === "dark" ? spec.palette.bgDark : spec.palette.bgLight, backgroundImage: t.id ? `url('${t.id}')` : undefined }}
              >
                {!t.id && <span className="text-[10px] font-semibold text-stone-500">Polos</span>}
              </button>
              {t.id.startsWith("/uploads/") && (
                <button
                  type="button"
                  onClick={() => onDeleteAsset(t.id)}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white shadow group-hover:flex cursor-pointer"
                  aria-label="Hapus gambar dari pustaka"
                >
                  <Icon d="M6 6l12 12M18 6L6 18" className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        {spec.texture && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <div className="flex items-center justify-between text-[11.5px] font-semibold text-stone-700">
              <span>Opasitas tekstur</span>
              <span className="font-mono text-[11px] text-stone-500">{spec.textureOpacity ?? 100}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={spec.textureOpacity ?? 100}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ textureOpacity: v >= 100 ? undefined : v });
              }}
              className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-600"
            />
          </div>
        )}
      </Section>

      <SectionBackgroundsEditor spec={spec} backdrops={backdrops} onChange={onChange} />

      <Section title="Media bawaan" hint="Dipakai sampai klien mengunggah foto sendiri. Slot yang tidak dipilih memakai warna palet. Foto orang tidak pernah punya bawaan.">
        <BackdropUpload uploading={uploading} onUpload={onUpload} />
        <div className="space-y-3">
          {BUILDER_DEFAULT_SLOTS.filter(({ slot }) => slot !== "LANDING_COVER_DESKTOP" || spec.coverDesktop?.mode === "full").map(({ slot, label }) => (
            <div key={slot}>
              <p className="mb-1.5 text-[11.5px] font-semibold text-stone-700">{label}</p>
              {slot === "LANDING_COVER_DESKTOP" && (
                <p className="mb-1.5 text-[10.5px] leading-snug text-stone-500">Gambar mendatar untuk sampul desktop layar penuh. Klien bisa menggantinya di slot Cover Pembuka Desktop.</p>
              )}
              <div className="grid grid-cols-7 gap-1.5">
                {backdrops.map((t) => {
                  const selected = (spec.defaultMedia[slot] ?? "") === t.id;
                  return (
                    <button
                      key={t.id || "none"}
                      type="button"
                      title={t.id ? t.label : "Tanpa gambar (warna palet)"}
                      aria-pressed={selected}
                      onClick={() => {
                        const next = { ...spec.defaultMedia };
                        if (t.id) next[slot] = t.id;
                        else delete next[slot];
                        onChange({ defaultMedia: next });
                      }}
                      className={`flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border bg-cover bg-center transition cursor-pointer ${selected ? "border-amber-500 ring-2 ring-amber-300" : "border-stone-200 hover:border-stone-400"}`}
                      style={{ backgroundColor: t.id ? undefined : spec.palette.primary, backgroundImage: t.id ? `url('${t.id}')` : undefined }}
                    >
                      {!t.id && <span className="text-[9px] font-semibold" style={{ color: spec.palette.onPrimary }}>Palet</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-stone-100 pt-3">
          <div className="flex items-center justify-between text-[11.5px] font-semibold text-stone-700">
            <span className="flex items-center gap-1.5">
              Gelap Lapisan Foto (Scrim Sampul & Penutup)
              {spec.scrimOpacity !== undefined && spec.scrimOpacity !== 55 && (
                <button
                  type="button"
                  title="Kembalikan ke 55%"
                  onClick={() => onChange({ scrimOpacity: undefined })}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 cursor-pointer"
                >
                  55%
                </button>
              )}
            </span>
            <span className="font-mono text-[11px] text-stone-500">{spec.scrimOpacity ?? 55}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={spec.scrimOpacity ?? 55}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ scrimOpacity: v === 55 ? undefined : v });
            }}
            className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-600"
          />
          <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
            Mengatur kegelapan selimut di atas foto Sampul, Panel Kiri Desktop, dan Penutup agar teks judul tetap terbaca jelas.
          </p>
        </div>
      </Section>

      <Section title="Sudut kartu & tombol">
        <Segmented value={spec.radius} options={RADIUS_OPTIONS.map((r) => ({ id: r.id, label: r.label }))} onChange={(radius) => onChange({ radius })} />
      </Section>
    </>
  );
}

const LONG_TEXT_KEYS: readonly BuilderTextKey[] = ["coverSubtitle", "coupleSub", "countdownSub", "wishesSub", "closingQuote", "closingSub", "closingFamily"];

/**
 * Teks bawaan label. Kolom menampilkan teks yang sedang tampil di pratinjau (bawaan blueprint sampai diubah); yang
 * sudah diubah ditandai dan bisa dikembalikan. Klien tetap dapat mengubah tiap teks di Studio; ini hanya nilai awalnya.
 */
export function TextsPanel({ spec, labels, onChange }: { spec: BuilderSpec; labels: Record<string, string>; onChange: (patch: Partial<BuilderSpec>) => void }) {
  const texts = familyTexts(spec.eventType);
  const groups = [...new Set(texts.map((t) => t.group))];
  const overridden = Object.keys(spec.texts).length;
  const setText = (key: BuilderTextKey, value: string | null) => {
    const texts = { ...spec.texts };
    if (value === null) delete texts[key];
    else texts[key] = value;
    onChange({ texts });
  };
  return (
    <>
      <Section title="Teks bawaan" hint="Teks yang tampil di undangan sebelum klien mengubahnya. Klien tetap bisa mengganti tiap teks di Studio. Nama, tanggal, dan jadwal tidak diatur di sini karena berasal dari isian klien.">
        <button
          type="button"
          disabled={!overridden}
          onClick={() => onChange({ texts: {} })}
          className="w-full rounded-xl border border-stone-200 py-2 text-[12px] font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
        >
          Kembalikan semua ke bawaan{overridden ? ` (${overridden} diubah)` : ""}
        </button>
      </Section>
      {groups.map((group) => (
        <Section key={group} title={group}>
          <div className="space-y-3">
            {texts.filter((t) => t.group === group).map((t) => {
              const changed = spec.texts[t.key] !== undefined;
              const value = spec.texts[t.key] ?? labels[t.key] ?? "";
              const common = {
                id: `builder-text-${t.key}`,
                value,
                maxLength: MAX_BUILDER_TEXT_LENGTH,
                spellCheck: false,
                onChange: (e: { target: { value: string } }) => setText(t.key, e.target.value),
                className: "mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12.5px] text-stone-800 outline-none focus:border-amber-500",
              };
              return (
                <div key={t.key}>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={common.id} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-stone-600">
                      {t.label}
                      {changed && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Sudah diubah" />}
                    </label>
                    {changed && (
                      <button type="button" onClick={() => setText(t.key, null)} className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 hover:underline cursor-pointer">
                        Kembalikan
                      </button>
                    )}
                  </div>
                  {LONG_TEXT_KEYS.includes(t.key) ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
                </div>
              );
            })}
          </div>
        </Section>
      ))}
    </>
  );
}

export function TypePanel({ spec, onChange }: { spec: BuilderSpec; onChange: (patch: Partial<BuilderSpec>) => void }) {
  const roles: Array<{ key: keyof BuilderSpec["fonts"]; label: string; sample: string; size: string }> = [
    { key: "heading", label: "Judul", sample: "Andi & Besse", size: "text-[22px]" },
    { key: "body", label: "Isi", sample: "Dengan memohon rahmat Allah SWT, kami mengundang Bapak/Ibu/Saudara/i.", size: "text-[13px]" },
    { key: "script", label: "Tulisan tangan", sample: "Save the Date", size: "text-[26px]" },
  ];
  // Halaman admin perlu memuat CSS font Google yang terpasang di tema agar contoh teks memakai huruf aslinya.
  const googleIds = googleFontIds(spec.fonts).join("|");
  useEffect(() => {
    const links = googleIds ? googleIds.split("|").map((id) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = googleFontCssUrl(id);
      document.head.appendChild(link);
      return link;
    }) : [];
    return () => links.forEach((link) => link.remove());
  }, [googleIds]);

  return (
    <>
      {roles.map((role) => (
        <Section key={role.key} title={role.label}>
          <p className={`mb-3 rounded-xl bg-stone-50 px-3 py-3 leading-snug text-stone-800 ${role.size}`} style={{ fontFamily: fontFamily(spec.fonts[role.key], role.key) }}>
            {role.sample}
          </p>
          <div className="grid grid-cols-1 gap-1">
            {isGoogleFontId(spec.fonts[role.key]) && (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-500">
                <span className="text-[15px] text-stone-800" style={{ fontFamily: fontFamily(spec.fonts[role.key], role.key) }}>{fontLabel(spec.fonts[role.key])}</span>
                <span className="text-[10.5px] text-stone-500">Font Google</span>
              </div>
            )}
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ fonts: { ...spec.fonts, [role.key]: f.id } })}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left transition cursor-pointer ${spec.fonts[role.key] === f.id ? "bg-amber-50 ring-1 ring-amber-500" : "hover:bg-stone-50"}`}
              >
                <span className="text-[15px] text-stone-800" style={{ fontFamily: f.family }}>{f.label}</span>
                <span className="text-[10.5px] text-stone-400">{f.kind}</span>
              </button>
            ))}
          </div>
          <GoogleFontPicker onPick={(id) => onChange({ fonts: { ...spec.fonts, [role.key]: id } })} />
        </Section>
      ))}
    </>
  );
}

/** Sketsa mini setiap varian, diwarnai palet aktif agar admin melihat hasilnya sebelum memilih. */
function VariantThumb({ group, id, palette, dark }: { group: keyof BuilderVariants; id: string; palette: BuilderPalette; dark: boolean }) {
  const canvas = dark ? palette.bgDark : palette.bgLight;
  const ink = dark ? palette.textLight : palette.textDark;
  // Rumus yang sama dengan --card-bg di compile.ts (kanvas terang 78% + teks terang), agar thumbnail mengikuti palet.
  const card = dark ? palette.secondary : `color-mix(in srgb, ${palette.bgLight} 78%, ${palette.textLight})`;
  const bar = (w: string, color = ink, h = 3, extra: CSSProperties = {}) => <span className="block rounded-full" style={{ width: w, height: h, background: color, opacity: 0.8, ...extra }} />;
  const photo = (style: CSSProperties) => <span className="block" style={{ background: `linear-gradient(135deg, ${palette.accent}, ${palette.secondary})`, ...style }} />;
  const box = "relative flex h-[74px] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-lg";

  if (group === "cover") {
    const bg = `linear-gradient(180deg, ${palette.secondary}, ${palette.bgDark})`;
    return (
      <span className={`${box} ${id === "editorial" ? "items-start px-2" : ""}`} style={{ background: bg }}>
        {id === "framed" && <span className="absolute inset-[5px] rounded-md border" style={{ borderColor: palette.textLight, opacity: 0.6 }} />}
        {id === "arch" ? (
          <span className="flex h-[52px] w-[38px] flex-col items-center justify-center gap-1 border" style={{ borderColor: palette.textLight, borderRadius: "999px 999px 6px 6px", opacity: 0.9 }}>
            {bar("22px", palette.textLight)}{bar("14px", palette.accent, 2)}
          </span>
        ) : (
          <>
            {bar(id === "editorial" ? "34px" : "30px", palette.textLight, id === "editorial" ? 5 : 4)}
            {bar("18px", palette.accent, 2)}
            <span className="mt-1.5 block h-[7px] w-[26px] rounded-full" style={{ background: palette.primary }} />
          </>
        )}
      </span>
    );
  }
  if (group === "opening") {
    if (id === "backdrop") {
      return (
        <span className={box} style={{ background: `linear-gradient(180deg, ${palette.secondary}, ${palette.bgDark})` }}>
          {bar("32px", palette.textLight, 4)}
          {bar("18px", palette.accent, 2)}
          {bar("24px", palette.textLight, 2)}
        </span>
      );
    }
    const shape: CSSProperties = id === "circle" ? { width: 26, height: 26, borderRadius: "50%" } : id === "arch" ? { width: 22, height: 30, borderRadius: "999px 999px 4px 4px" } : { width: 0, height: 0 };
    return (
      <span className={box} style={{ background: canvas }}>
        <span className={`flex flex-col items-center gap-1 ${id === "card" ? "rounded-md px-3 py-2 shadow-sm" : ""}`} style={id === "card" ? { background: card } : undefined}>
          {(id === "arch" || id === "circle") && photo(shape)}
          {bar("30px", ink, 4)}{bar("16px", palette.primary, 2)}
        </span>
      </span>
    );
  }
  if (group === "couple") {
    if (id === "backdrop") {
      return (
        <span className={box} style={{ background: canvas }}>
          <span className="flex items-center gap-2">
            {[0, 1].map((i) => (
              <span key={i} className="flex h-[52px] w-[36px] flex-col items-center justify-end gap-1 rounded-md p-1.5" style={{ background: `linear-gradient(180deg, ${palette.accent}, ${palette.bgDark})` }}>
                {bar("20px", palette.textLight, 3)}
                {bar("12px", palette.accent, 2)}
              </span>
            ))}
          </span>
        </span>
      );
    }
    if (id === "portrait") {
      return (
        <span className={box} style={{ background: canvas }}>
          <span className="flex items-center gap-2">
            {[0, 1].map((i) => (
              <span key={i} className="flex h-[52px] w-[34px] flex-col items-center justify-center gap-1 rounded-sm border" style={{ borderColor: palette.primary, background: `linear-gradient(180deg, transparent, ${palette.primary}20)` }}>
                {photo({ width: 22, height: 28, borderRadius: 2 })}
                {bar("16px", ink, 2)}
              </span>
            ))}
          </span>
        </span>
      );
    }
    if (id === "editorial") {
      return (
        <span className={`${box} flex-col justify-center gap-1.5 px-3`} style={{ background: canvas }}>
          <span className="flex w-full items-center gap-1.5 border-l-2 pl-1.5" style={{ borderColor: palette.accent }}>
            {photo({ width: 16, height: 20, borderRadius: 2 })}
            <span className="flex flex-col gap-0.5">{bar("22px", ink, 2)}{bar("14px", palette.primary, 1.5)}</span>
          </span>
          <span className="flex w-full items-center justify-end gap-1.5 border-r-2 pr-1.5" style={{ borderColor: palette.accent }}>
            <span className="flex flex-col items-end gap-0.5">{bar("22px", ink, 2)}{bar("14px", palette.primary, 1.5)}</span>
            {photo({ width: 16, height: 20, borderRadius: 2 })}
          </span>
        </span>
      );
    }
    const p = id === "arch" ? { width: 16, height: 22, borderRadius: "999px 999px 3px 3px" } : id === "polaroid" ? { width: 18, height: 20, borderRadius: 2, boxShadow: `3px 3px 0 ${palette.accent}` } : { width: 18, height: 18, borderRadius: "50%" };
    return (
      <span className={box} style={{ background: canvas }}>
        <span className={`flex items-center gap-2 ${id === "side" ? "flex-row" : "flex-col gap-1"}`}>
          <span className="flex flex-col items-center gap-0.5">{photo(p)}{bar("16px")}</span>
          {id === "side" && <span className="text-[9px]" style={{ color: palette.primary }}>&amp;</span>}
          <span className="flex flex-col items-center gap-0.5">{photo(p)}{bar("16px")}</span>
        </span>
      </span>
    );
  }
  if (group === "countdown") {
    const cell = (i: number) => {
      const style: CSSProperties =
        id === "circles" ? { borderRadius: "50%", border: `1px solid ${palette.primary}` }
        : id === "solid" ? { borderRadius: 3, background: palette.primary }
        : id === "minimal" ? { borderLeft: i ? `1px solid ${palette.primary}` : undefined }
        : { borderRadius: 3, border: `1px solid ${palette.primary}` };
      return <span key={i} className="flex h-[17px] w-[17px] items-center justify-center" style={style}>{bar("7px", id === "solid" ? palette.onPrimary : ink, 2)}</span>;
    };
    return <span className={`${box} flex-row gap-1`} style={{ background: canvas }}>{[0, 1, 2, 3].map(cell)}</span>;
  }
  if (group === "closing") {
    return (
      <span className={box} style={{ background: canvas }}>
        <span
          className="flex flex-col items-center gap-1 px-3 py-2"
          style={id === "card" ? { background: card, borderRadius: 6 } : id === "framed" ? { border: `1px solid ${palette.primary}`, outline: `1px solid ${palette.primary}`, outlineOffset: 2, borderRadius: 4 } : undefined}
        >
          {bar("26px")}{bar("18px", palette.primary, 2)}{bar("22px", ink, 2)}
        </span>
      </span>
    );
  }
  if (group === "headings") {
    return (
      <span className={box} style={{ background: canvas }}>
        <span className="flex items-center gap-1">
          {id === "lined" && bar("8px", palette.primary, 1)}
          {bar("16px", palette.primary, 2)}
          {id === "lined" && bar("8px", palette.primary, 1)}
        </span>
        <span className="text-[13px] leading-none" style={{ color: ink, fontFamily: id === "script" ? "'Great Vibes', cursive" : "'Cinzel', serif" }}>Judul</span>
        {id === "ornate" && <span className="block h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)` }} />}
      </span>
    );
  }
  if (group === "gallery") {
    if (id === "masonry") {
      return (
        <span className={`${box} !flex-row items-center justify-center gap-1.5 px-3`} style={{ background: canvas }}>
          <span className="flex flex-1 flex-col gap-1">
            {photo({ width: "100%", height: 34, borderRadius: 3 })}
            {photo({ width: "100%", height: 20, borderRadius: 3 })}
          </span>
          <span className="flex flex-1 flex-col gap-1">
            {photo({ width: "100%", height: 18, borderRadius: 3 })}
            {photo({ width: "100%", height: 36, borderRadius: 3 })}
          </span>
        </span>
      );
    }
    if (id === "carousel") {
      return (
        <span className={`${box} !flex-row items-center justify-start gap-1.5 overflow-hidden px-2`} style={{ background: canvas }}>
          {photo({ width: 34, height: 46, flexShrink: 0, borderRadius: 4 })}
          {photo({ width: 34, height: 46, flexShrink: 0, borderRadius: 4 })}
          {photo({ width: 18, height: 46, flexShrink: 0, borderRadius: 4, opacity: 0.5 })}
        </span>
      );
    }
    if (id === "polaroid") {
      return (
        <span className={`${box} !flex-row items-center justify-center gap-1.5`} style={{ background: canvas }}>
          <span className="flex flex-col items-center gap-0.5 rounded-sm p-1 shadow-sm" style={{ background: card, transform: "rotate(-4deg)" }}>
            {photo({ width: 20, height: 22, borderRadius: 1 })}
            <span className="h-1 w-3 rounded-full" style={{ background: palette.accent }} />
          </span>
          <span className="flex flex-col items-center gap-0.5 rounded-sm p-1 shadow-sm" style={{ background: card, transform: "rotate(4deg)" }}>
            {photo({ width: 20, height: 22, borderRadius: 1 })}
            <span className="h-1 w-3 rounded-full" style={{ background: palette.accent }} />
          </span>
        </span>
      );
    }
    return (
      <span className={`${box} !grid grid-cols-2 gap-1 p-2`} style={{ background: canvas }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex h-6 w-full items-center justify-center">
            {photo({ width: "100%", height: "100%", borderRadius: 2 })}
          </span>
        ))}
      </span>
    );
  }
  if (group === "events") {
    if (id === "timeline") {
      return (
        <span className={`${box} items-start justify-center pl-4`} style={{ background: canvas }}>
          <span className="relative flex flex-col gap-2 border-l border-dashed pl-2" style={{ borderColor: palette.primary }}>
            {[0, 1].map((i) => (
              <span key={i} className="relative flex flex-col gap-0.5">
                <span className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full" style={{ background: palette.primary }} />
                {bar("28px", ink, 2)}
                {bar("18px", palette.primary, 1.5)}
              </span>
            ))}
          </span>
        </span>
      );
    }
    if (id === "minimal") {
      return (
        <span className={`${box} flex-col justify-center gap-1.5 px-3`} style={{ background: canvas }}>
          <span className="flex w-full flex-col gap-0.5 border-b pb-1" style={{ borderColor: `${palette.primary}40` }}>
            {bar("32px", ink, 2)}
            {bar("16px", palette.primary, 1.5)}
          </span>
          <span className="flex w-full flex-col gap-0.5">
            {bar("28px", ink, 2)}
            {bar("16px", palette.primary, 1.5)}
          </span>
        </span>
      );
    }
    return (
      <span className={`${box} !flex-row items-center justify-center gap-1.5 px-2`} style={{ background: canvas }}>
        {[0, 1].map((i) => (
          <span key={i} className="flex flex-1 flex-col items-center gap-1 rounded border p-1 shadow-xs" style={{ borderColor: `${palette.primary}35`, background: card }}>
            {bar("22px", ink, 2)}
            {bar("14px", palette.primary, 1.5)}
          </span>
        ))}
      </span>
    );
  }
  if (group === "story") {
    if (id === "cards") {
      return (
        <span className={`${box} flex-col justify-center gap-1.5 px-2`} style={{ background: canvas }}>
          <span className="flex w-full flex-col gap-0.5 rounded border p-1 shadow-xs" style={{ borderColor: `${palette.primary}30`, background: card }}>
            {bar("28px", ink, 2)}
            {bar("16px", palette.primary, 1.5)}
          </span>
          <span className="flex w-full flex-col gap-0.5 rounded border p-1 shadow-xs" style={{ borderColor: `${palette.primary}30`, background: card }}>
            {bar("24px", ink, 2)}
            {bar("14px", palette.primary, 1.5)}
          </span>
        </span>
      );
    }
    if (id === "minimal") {
      return (
        <span className={`${box} flex-col justify-center gap-2 px-3`} style={{ background: canvas }}>
          <span className="flex w-full flex-col gap-0.5 border-b pb-1" style={{ borderColor: `${palette.primary}30` }}>
            {bar("30px", ink, 2)}
            {bar("18px", palette.primary, 1.5)}
          </span>
          <span className="flex w-full flex-col gap-0.5">
            {bar("26px", ink, 2)}
            {bar("14px", palette.primary, 1.5)}
          </span>
        </span>
      );
    }
    return (
      <span className={`${box} items-start justify-center pl-4`} style={{ background: canvas }}>
        <span className="relative flex flex-col gap-2 border-l border-dashed pl-2" style={{ borderColor: palette.primary }}>
          {[0, 1].map((i) => (
            <span key={i} className="relative flex flex-col gap-0.5">
              <span className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full" style={{ background: palette.primary }} />
              {bar("28px", ink, 2)}
              {bar("16px", palette.primary, 1.5)}
            </span>
          ))}
        </span>
      </span>
    );
  }
  if (group === "gift") {
    if (id === "tabs") {
      return (
        <span className={`${box} flex-col justify-center gap-1 px-2`} style={{ background: canvas }}>
          <span className="flex w-full items-center gap-1 rounded bg-stone-200/50 p-0.5">
            <span className="flex-1 rounded py-0.5 text-center text-[8px] font-bold" style={{ background: palette.primary, color: palette.onPrimary }}>Pria</span>
            <span className="flex-1 py-0.5 text-center text-[8px]" style={{ color: ink }}>Wanita</span>
          </span>
          <span className="flex w-full flex-col items-center gap-0.5 rounded border p-1 shadow-xs" style={{ borderColor: `${palette.primary}30`, background: card }}>
            {bar("24px", ink, 2)}
            {bar("14px", palette.primary, 1.5)}
          </span>
        </span>
      );
    }
    if (id === "minimal") {
      return (
        <span className={`${box} flex-col justify-center gap-1.5 px-3`} style={{ background: canvas }}>
          <span className="flex w-full flex-col gap-0.5 border-b pb-1" style={{ borderColor: `${palette.primary}30` }}>
            {bar("26px", ink, 2)}
            {bar("18px", palette.primary, 1.5)}
          </span>
          <span className="flex w-full flex-col gap-0.5">
            {bar("22px", ink, 2)}
            {bar("16px", palette.primary, 1.5)}
          </span>
        </span>
      );
    }
    return (
      <span className={`${box} flex-col justify-center gap-1.5 px-3`} style={{ background: canvas }}>
        {[0, 1].map((i) => (
          <span key={i} className="flex w-full items-center justify-between rounded border px-2 py-1 shadow-xs" style={{ borderColor: `${palette.primary}30`, background: card }}>
            <span className="flex flex-col gap-0.5">{bar("20px", ink, 2)}{bar("12px", palette.primary, 1)}</span>
            <span className="h-3 w-6 rounded-sm" style={{ background: `${palette.primary}25` }} />
          </span>
        ))}
      </span>
    );
  }
  if (group === "nav") {
    if (id === "drawer") {
      return (
        <span className={`${box} relative`} style={{ background: canvas }}>
          <span className="absolute right-2 top-1.5 flex flex-col gap-0.5 rounded border px-1.5 py-1 shadow-xs" style={{ borderColor: `${palette.primary}40`, background: card }}>
            {["01", "02", "03"].map((n) => (
              <span key={n} className="flex items-center gap-1">
                <span className="text-[6px] font-bold" style={{ color: palette.accent }}>{n}</span>
                {bar("14px", ink, 1.5)}
              </span>
            ))}
          </span>
        </span>
      );
    }
    if (id === "none") {
      return (
        <span className={box} style={{ background: canvas }}>
          {bar("28px", `${ink}50`, 2)}
        </span>
      );
    }
    return (
      <span className={`${box} justify-end pb-2`} style={{ background: canvas }}>
        <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-xs" style={{ borderColor: `${palette.primary}40`, background: card }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === 0 ? palette.primary : `${ink}45` }} />
          ))}
        </span>
      </span>
    );
  }
  if (group === "guestCard") {
    return (
      <span className={box} style={{ background: `linear-gradient(160deg, ${palette.secondary}, ${palette.bgDark})` }}>
        {id === "hidden" ? (
          <span className="text-[8px] font-semibold tracking-wider uppercase" style={{ color: `${palette.textLight}70` }}>Tanpa kartu</span>
        ) : id === "pill" ? (
          <span className="flex flex-col items-center gap-0.5 rounded-full border px-3 py-1" style={{ borderColor: `${palette.textLight}60`, background: `${palette.textLight}18` }}>
            {bar("16px", palette.accent, 1.5)}
            {bar("28px", palette.textLight, 2)}
          </span>
        ) : id === "underline" ? (
          <span className="flex flex-col items-center gap-1 border-b px-2 pb-1" style={{ borderColor: palette.accent }}>
            {bar("16px", `${palette.textLight}90`, 1.5)}
            {bar("30px", palette.textLight, 2.5)}
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1 rounded-md border px-2.5 py-1.5" style={{ borderColor: `${palette.textLight}45`, background: `${palette.bgDark}55` }}>
            {bar("18px", palette.accent, 1.5)}
            {bar("28px", palette.textLight, 2.5)}
          </span>
        )}
      </span>
    );
  }
  if (group === "coverDate") {
    return (
      <span className={box} style={{ background: `linear-gradient(160deg, ${palette.secondary}, ${palette.bgDark})` }}>
        {id === "split" ? (
          <span className="flex items-center gap-1.5 border-y px-2 py-1" style={{ borderColor: palette.accent }}>
            <span className="h-1 w-1 rounded-full" style={{ background: palette.accent }} />
            {bar("26px", palette.textLight, 2)}
            <span className="h-1 w-1 rounded-full" style={{ background: palette.accent }} />
          </span>
        ) : (
          bar("32px", palette.accent, 2)
        )}
      </span>
    );
  }
  if (group === "dividers") {
    return (
      <span className={box} style={{ background: canvas }}>
        {bar("24px", ink, 2.5)}
        {id === "none" ? null : id === "ornate" ? (
          <span className="flex items-center gap-1">
            {bar("14px", palette.accent, 1)}
            <span className="h-1.5 w-1.5 rotate-45" style={{ background: palette.accent }} />
            {bar("14px", palette.accent, 1)}
          </span>
        ) : id === "gradient" ? (
          <span className="block h-0.5 w-12 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${palette.primary}, ${palette.accent}, transparent)` }} />
        ) : (
          bar("20px", palette.accent, 1.5)
        )}
      </span>
    );
  }
  if (group === "buttons") {
    return (
      <span className={box} style={{ background: canvas }}>
        {id === "solid" ? (
          <span className="flex h-4 w-11 items-center justify-center rounded-full shadow-xs" style={{ background: palette.primary }}>
            {bar("18px", palette.bgLight, 2)}
          </span>
        ) : id === "outline" ? (
          <span className="flex h-4 w-11 items-center justify-center rounded-full" style={{ border: `1.5px solid ${palette.primary}` }}>
            {bar("18px", palette.primary, 2)}
          </span>
        ) : id === "glass" ? (
          <span className="flex h-4 w-11 items-center justify-center rounded-full" style={{ background: `${palette.primary}22`, border: `1px solid ${palette.accent}` }}>
            {bar("18px", ink, 2)}
          </span>
        ) : (
          <span className="flex flex-col items-center gap-0.5">
            {bar("22px", palette.primary, 2)}
            <span className="block h-[1px] w-7" style={{ background: palette.primary }} />
          </span>
        )}
      </span>
    );
  }
  if (group === "cards") {
    return (
      <span className={box} style={{ background: canvas }}>
        {id === "solid" ? (
          <span className="flex h-7 w-11 flex-col items-center justify-center gap-1 rounded shadow-xs" style={{ background: card, border: `1px solid ${palette.accent}55` }}>
            {bar("20px", ink, 2)}{bar("14px", palette.accent, 1.5)}
          </span>
        ) : id === "glass" ? (
          <span className="flex h-7 w-11 flex-col items-center justify-center gap-1 rounded" style={{ background: `${palette.accent}22`, border: `1px solid ${palette.accent}88` }}>
            {bar("20px", ink, 2)}{bar("14px", palette.accent, 1.5)}
          </span>
        ) : id === "outlined" ? (
          <span className="flex h-7 w-11 flex-col items-center justify-center gap-1 rounded" style={{ border: `1.5px solid ${palette.accent}` }}>
            {bar("20px", ink, 2)}{bar("14px", palette.accent, 1.5)}
          </span>
        ) : (
          <span className="flex h-7 w-11 flex-col items-center justify-center gap-1" style={{ borderBottom: `1px dashed ${palette.accent}` }}>
            {bar("20px", ink, 2)}{bar("14px", palette.accent, 1.5)}
          </span>
        )}
      </span>
    );
  }
  if (group === "spacing") {
    const gapClass = id === "compact" ? "gap-0.5" : id === "airy" ? "gap-2.5" : "gap-1.5";
    return (
      <span className={`${box} ${gapClass}`} style={{ background: canvas }}>
        {bar("24px", ink, 2)}
        <span className="block h-[1px] w-8" style={{ background: `${palette.accent}88` }} />
        {bar("28px", palette.accent, 2)}
        <span className="block h-[1px] w-8" style={{ background: `${palette.accent}88` }} />
        {bar("20px", ink, 2)}
      </span>
    );
  }
  const pos: Record<string, string> = { "bottom-left": "items-start justify-end", "bottom-center": "items-center justify-end", center: "items-center justify-center", "top-left": "items-start justify-start" };
  return (
    <span className={`${box} !flex-row`} style={{ background: palette.bgDark }}>
      <span className={`flex h-full flex-1 flex-col gap-1 p-2 ${pos[id]}`} style={{ background: `linear-gradient(135deg, ${palette.secondary}, ${palette.bgDark})` }}>
        {bar("26px", palette.textLight, 3)}{bar("14px", palette.accent, 2)}
      </span>
      <span className="h-full w-[22%]" style={{ background: canvas }} />
    </span>
  );
}

export function LayoutPanel({
  spec,
  library,
  onChange,
  onFocusSection,
  selectedBlock,
  onSelectBlock,
}: {
  spec: BuilderSpec;
  library: AssetLibrary | null;
  onChange: (patch: Partial<BuilderSpec>) => void;
  onFocusSection: (s: OrnamentSection) => void;
  selectedBlock: BuilderBlockId | null;
  onSelectBlock: (id: BuilderBlockId) => void;
}) {
  const backdrops: ReadonlyArray<{ id: string; label: string }> = [...TEXTURE_OPTIONS, ...(library?.uploads ?? []).map((u) => ({ id: u.url, label: "Gambar unggahan" }))];
  return (
    <>
      <Section title="Posisi elemen" hint="Klik elemen di pratinjau atau pilih di sini, lalu seret atau atur geser, ukuran, dan putar. Posisi relatif terhadap elemen itu sendiri, jadi tetap mengalir bersama isi klien dan mengikuti lebar layar.">
        <div className="grid grid-cols-1 gap-1.5">
          {familyBlocks(spec.eventType).map((block) => {
            const custom = Boolean(spec.blocks[block.id]);
            return (
              <button
                key={block.id}
                type="button"
                aria-pressed={selectedBlock === block.id}
                onClick={() => {
                  onSelectBlock(block.id);
                  onFocusSection(block.section);
                }}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition cursor-pointer ${selectedBlock === block.id ? "border-blue-500 bg-blue-50 text-stone-900" : "border-stone-200 text-stone-700 hover:border-stone-300"}`}
              >
                <span>{block.label}</span>
                <span className="text-[10.5px] font-medium text-stone-500">{spec.blocks[block.id]?.hidden ? "Disembunyikan" : custom ? "Diatur" : sectionLabelFor(block.section, spec.eventType)}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Jadwal acara" hint="Jadwal tidak digandakan: ia pindah dari seksi Acara ke Home, dan tautan Acara di navigasi ikut disembunyikan.">
        <div className="grid grid-cols-2 gap-2">
          {EVENTS_PLACEMENTS.map((p) => {
            const active = spec.eventsPlacement === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  // Seksi Acara disembunyikan saat jadwal di Home; hitung mundur yang menumpang di sana dikembalikan.
                  onChange({ eventsPlacement: p.id, ...(p.id === "home" && spec.countdownPlacement === "events" ? { countdownPlacement: undefined } : {}) });
                  onFocusSection(p.id === "home" ? "opening" : "events");
                }}
                className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${active ? "border-amber-500 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300"}`}
              >
                <span className="block text-[12px] font-semibold text-stone-800">{p.label}</span>
                <span className="mt-0.5 block text-[10.5px] leading-snug text-stone-500">{p.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Letak hitung mundur" hint="Satukan hitung mundur dengan seksi lain seperti tema majalah. Saat menumpang, judul hitung mundur bisa disembunyikan lewat Posisi elemen.">
        <div className="grid grid-cols-3 gap-2">
          {COUNTDOWN_PLACEMENTS.map((p) => {
            const active = (spec.countdownPlacement ?? "section") === p.id;
            const disabled = p.id === "events" && spec.eventsPlacement === "home";
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                title={disabled ? "Seksi Acara disembunyikan saat jadwal dipindah ke Home." : p.hint}
                onClick={() => {
                  const after = (spec.freeSections ?? []).map((f) => (p.id !== "section" && f.after === "countdown" ? { ...f, after: "events" as OrderableSection } : f));
                  onChange({ countdownPlacement: p.id === "section" ? undefined : p.id, ...(spec.freeSections?.length ? { freeSections: after } : {}) });
                  onFocusSection(p.id === "opening" ? "opening" : p.id === "events" ? "events" : "countdown");
                }}
                className={`rounded-xl border p-2 text-left transition disabled:opacity-40 cursor-pointer ${active ? "border-amber-500 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300"}`}
              >
                <span className="block text-[11.5px] font-semibold text-stone-800">{p.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <NestingEditor spec={spec} onChange={onChange} onFocusSection={onFocusSection} />

      <Section title="Tata letak desktop" hint="Hanya berlaku di layar 900px ke atas. HP selalu satu kolom.">
        <div className="grid grid-cols-2 gap-2">
          {DESKTOP_LAYOUTS.map((d) => {
            const active = (spec.desktopLayout ?? "split") === d.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ desktopLayout: d.id === "split" ? undefined : d.id })}
                className={`rounded-xl border p-2 text-left transition cursor-pointer ${active ? "border-amber-500 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300"}`}
              >
                <DesktopLayoutThumb id={d.id} palette={spec.palette} />
                <span className="mt-1.5 block text-[11.5px] font-semibold text-stone-800">{d.label}</span>
                <span className="block text-[10.5px] leading-snug text-stone-500">{d.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Sampul desktop" hint="Cara sampul tampil di layar 900px ke atas. Atur posisi teks tiap tampilan lewat tombol Menata di atas pratinjau desktop.">
        <div className="grid grid-cols-2 gap-2">
          {COVER_DESKTOP_MODES.map((m) => {
            const active = (spec.coverDesktop?.mode ?? "split") === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const { mode: _mode, ...positions } = spec.coverDesktop ?? {};
                  const defaultMedia = { ...spec.defaultMedia };
                  // Gambar landscape hanya sah pada layar penuh; kembali ke split melepasnya agar tema tetap tersimpan.
                  if (m.id === "split") delete defaultMedia.LANDING_COVER_DESKTOP;
                  onChange({ coverDesktop: m.id === "full" ? { ...positions, mode: "full" } : positions, defaultMedia });
                }}
                className={`rounded-xl border p-2 text-left transition cursor-pointer ${active ? "border-amber-500 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300"}`}
              >
                <span className="block text-[11.5px] font-semibold text-stone-800">{m.label}</span>
                <span className="block text-[10.5px] leading-snug text-stone-500">{m.hint}</span>
              </button>
            );
          })}
        </div>
        {spec.coverDesktop?.mode === "full" && spec.defaultMedia.LANDING_COVER && !spec.defaultMedia.LANDING_COVER_DESKTOP && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-800">Pilih gambar Cover desktop (landscape) di tab Warna, bagian Media bawaan, sebelum menyimpan.</p>
        )}
      </Section>

      <Section
        title="Urutan seksi undangan"
        hint="Atur urutan alur membaca tamu. Sampul (Cover), Panel Desktop (Sidebar), dan Penutup (Closing) tetap pada posisinya."
      >
        {(() => {
          const defaultOrder = familyOrderableSections(spec.eventType);
          const sectionsInOrder = spec.sectionOrder && spec.sectionOrder.length ? spec.sectionOrder : defaultOrder;
          return (
            <div className="space-y-1.5">
              {sectionsInOrder.map((sec, idx) => (
                <div
                  key={sec}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-semibold text-stone-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500">
                      {idx + 1}
                    </span>
                    <span>{sectionLabelFor(sec, spec.eventType)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Pindah ke atas"
                      disabled={idx === 0}
                      onClick={() => {
                        const next = moveSectionInOrder(spec.eventType, sectionsInOrder, sec, -1);
                        onChange({ sectionOrder: next });
                        onFocusSection(sec);
                      }}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      type="button"
                      title="Pindah ke bawah"
                      disabled={idx === sectionsInOrder.length - 1}
                      onClick={() => {
                        const next = moveSectionInOrder(spec.eventType, sectionsInOrder, sec, 1);
                        onChange({ sectionOrder: next });
                        onFocusSection(sec);
                      }}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {!isDefaultSectionOrder(spec.sectionOrder, spec.eventType) && (
                <button
                  type="button"
                  onClick={() => onChange({ sectionOrder: undefined })}
                  className="mt-2 w-full rounded-xl border border-stone-200 py-2 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Kembalikan Urutan ke Bawaan
                </button>
              )}
            </div>
          );
        })()}
      </Section>

      <Section title="Sudut kartu & tombol" hint="Kelengkungan sudut kartu acara, bingkai kutipan, formulir RSVP, dan tombol aksi.">
        <Segmented value={spec.radius} options={RADIUS_OPTIONS.map((r) => ({ id: r.id, label: r.label }))} onChange={(radius) => onChange({ radius })} />
      </Section>

      <SurfaceEditor spec={spec} onChange={onChange} />

      <FreeSectionsEditor spec={spec} backdrops={backdrops} onChange={onChange} onFocusSection={onFocusSection} />

      {familyVariantGroups(spec.eventType).map((group) => (
        <Section key={group.key} title={group.label} hint={group.key === "sidebar" ? "Hanya tampil di layar desktop, di sebelah kiri kolom undangan." : group.key === "headings" ? "Berlaku untuk semua judul seksi." : undefined}>
          <div className="grid grid-cols-2 gap-2">
            {group.options.map((option) => {
              const active = spec.variants[group.key] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange({ variants: { ...spec.variants, [group.key]: option.id } });
                    if (group.section) onFocusSection(group.section);
                  }}
                  className={`rounded-xl border p-1.5 text-left transition cursor-pointer ${active ? "border-amber-500 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300"}`}
                >
                  <VariantThumb group={group.key} id={option.id} palette={spec.palette} dark={spec.canvasMode === "dark"} />
                  <span className="mt-1.5 block px-1 text-[12px] font-semibold text-stone-800">{option.label}</span>
                  <span className="block px-1 pb-0.5 text-[10.5px] leading-snug text-stone-500">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </Section>
      ))}

      <CustomCssEditor value={spec.customCss ?? ""} onChange={(customCss) => onChange({ customCss: customCss.trim() ? customCss : undefined })} />
    </>
  );
}

function NestingEditor({ spec, onChange, onFocusSection }: { spec: BuilderSpec; onChange: (patch: Partial<BuilderSpec>) => void; onFocusSection: (s: OrnamentSection) => void }) {
  const family = familyOrderableSections(spec.eventType);
  const nesting = spec.sectionNesting ?? {};
  const guests = NESTABLE_GUESTS.filter((g) => family.includes(g));
  return (
    <Section title="Tumpangkan seksi" hint="Masukkan satu seksi ke dalam seksi lain, misalnya Kisah di dalam Mempelai atau RSVP di dalam Penutup. Seksi yang menumpang tampil di akhir isi seksi tuannya.">
      <div className="space-y-1.5">
        {guests.map((guest) => {
          const current = nesting[guest] ?? "";
          const hosts = NESTING_HOSTS.filter((h) =>
            family.includes(h) && (h as string) !== guest && !(h in nesting) && !(h === "events" && spec.eventsPlacement === "home"),
          );
          return (
            <label key={guest} className="flex items-center justify-between gap-2 text-[12px] font-semibold text-stone-700">
              {sectionLabelFor(guest, spec.eventType)}
              <select
                value={current}
                // Seksi yang sedang ditumpangi tidak bisa ikut menumpang (rantai ditolak validasi).
                disabled={Object.values(nesting).includes(guest as NestingHost)}
                onChange={(e) => {
                  const next = { ...nesting };
                  const host = e.target.value as NestingHost | "";
                  if (host) next[guest] = host;
                  else delete next[guest];
                  // Seksi bebas yang diletakkan sesudah seksi tamu ikut pindah ke sesudah tuannya.
                  const freeSections = spec.freeSections?.map((f) => (host && f.after === guest ? { ...f, after: host as OrderableSection } : f));
                  onChange({ sectionNesting: Object.keys(next).length ? next : undefined, ...(freeSections ? { freeSections } : {}) });
                  onFocusSection(host || guest);
                }}
                className="w-[160px] rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] text-stone-800 outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="">Seksi sendiri</option>
                {hosts.map((h) => <option key={h} value={h}>Di dalam {sectionLabelFor(h, spec.eventType)}</option>)}
                {current && !hosts.includes(current) && <option value={current}>Di dalam {sectionLabelFor(current, spec.eventType)}</option>}
              </select>
            </label>
          );
        })}
      </div>
    </Section>
  );
}

function DesktopLayoutThumb({ id, palette }: { id: DesktopLayout; palette: BuilderPalette }) {
  const photo = <span className="h-full flex-1" style={{ background: `linear-gradient(135deg, ${palette.accent}, ${palette.secondary})` }} />;
  const column = (w: string) => <span className="h-full shrink-0 border-x" style={{ width: w, background: palette.bgLight, borderColor: palette.primary }} />;
  return (
    <span className="flex h-[46px] w-full overflow-hidden rounded-md border border-stone-200" style={{ background: palette.bgLight }}>
      {id === "split" && <>{photo}{column("34%")}</>}
      {id === "split-left" && <>{column("34%")}{photo}</>}
      {id === "wide" && <>{photo}{column("46%")}</>}
      {id === "centered" && <span className="flex h-full w-full justify-center" style={{ background: `color-mix(in srgb, ${palette.bgLight} 75%, ${palette.primary})` }}>{column("38%")}</span>}
    </span>
  );
}

function SurfaceEditor({ spec, onChange }: { spec: BuilderSpec; onChange: (patch: Partial<BuilderSpec>) => void }) {
  const surface = spec.surface ?? {};
  const set = (patch: Partial<SurfaceStyle>) => {
    const next: SurfaceStyle = { ...surface, ...patch };
    for (const key of Object.keys(next) as Array<keyof SurfaceStyle>) if (next[key] === undefined || next[key] === false) delete next[key];
    onChange({ surface: Object.keys(next).length ? next : undefined });
  };
  return (
    <Section title="Kartu & tombol (nilai bebas)" hint="Menimpa varian kartu dan tombol di bawah dengan angka pasti. Kosongkan (Ikut varian) untuk kembali ke varian.">
      <div className="space-y-3">
        <RangeRow label="Tebal garis kartu" value={surface.cardBorder} unit="px" min={SURFACE_LIMITS.cardBorder[0]} max={SURFACE_LIMITS.cardBorder[1]} onChange={(v) => set({ cardBorder: v })} onReset={() => set({ cardBorder: undefined })} />
        <RangeRow label="Sudut kartu" value={surface.cardRadius} unit="px" min={SURFACE_LIMITS.cardRadius[0]} max={SURFACE_LIMITS.cardRadius[1]} onChange={(v) => set({ cardRadius: v })} onReset={() => set({ cardRadius: undefined })} />
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold text-stone-700">Bayangan kartu</p>
          <Segmented
            value={surface.cardShadow ?? "variant"}
            options={[{ id: "variant", label: "Varian" }, ...CARD_SHADOWS.map((s) => ({ id: s.id, label: s.label }))]}
            onChange={(v) => set({ cardShadow: v === "variant" ? undefined : (v as CardShadow) })}
          />
        </div>
        <label className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-stone-700">
          Tombol kapsul penuh
          <input type="checkbox" checked={surface.buttonPill === true} onChange={(e) => set({ buttonPill: e.target.checked })} className="h-4 w-4 accent-amber-600 cursor-pointer" />
        </label>
        {!surface.buttonPill && (
          <RangeRow label="Sudut tombol" value={surface.buttonRadius} unit="px" min={SURFACE_LIMITS.buttonRadius[0]} max={SURFACE_LIMITS.buttonRadius[1]} onChange={(v) => set({ buttonRadius: v })} onReset={() => set({ buttonRadius: undefined })} />
        )}
      </div>
    </Section>
  );
}

/** Karakter yang ditolak parseBuilderSpec dibuang saat diketik, agar pratinjau tidak gagal karena satu huruf. */
const cleanFreeText = (value: string) => value.replace(/[<>]/g, "").replace(/\{\{|\}\}/g, "");

function FreeSectionsEditor({
  spec,
  backdrops,
  onChange,
  onFocusSection,
}: {
  spec: BuilderSpec;
  backdrops: ReadonlyArray<{ id: string; label: string }>;
  onChange: (patch: Partial<BuilderSpec>) => void;
  onFocusSection: (s: OrnamentSection) => void;
}) {
  const list = spec.freeSections ?? [];
  const hosts = familyOrderableSections(spec.eventType, spec.sectionOrder).filter((s) => s !== "closing" && !(s === "countdown" && (spec.countdownPlacement ?? "section") !== "section") && !(s in (spec.sectionNesting ?? {})));
  const [styleOpen, setStyleOpen] = useState<FreeSectionId | null>(null);
  const slots = familyOrnamentMediaSlots(spec.eventType);
  const save = (next: FreeSection[]) => onChange({ freeSections: next.length ? next : undefined });
  const update = (id: FreeSectionId, patch: Partial<FreeSection>) => save(list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const freeId = FREE_SECTION_IDS.find((id) => !list.some((f) => f.id === id));
  const inputClass = "mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12.5px] text-stone-800 outline-none focus:border-amber-500";
  return (
    <Section title="Seksi teks bebas" hint={`Tambah hingga ${FREE_SECTION_IDS.length} seksi sendiri (kutipan, doa, catatan keluarga, protokol) di antara seksi bawaan. Klien bisa mengubah teksnya di Studio.`}>
      <div className="space-y-3">
        {list.map((f, idx) => (
          <div key={f.id} className="rounded-xl border border-stone-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-stone-800">Seksi bebas {idx + 1}</span>
              <button type="button" onClick={() => save(list.filter((x) => x.id !== f.id))} className="text-[11px] font-semibold text-red-700 hover:underline cursor-pointer">Hapus</button>
            </div>
            <label className="mt-2 block text-[11.5px] font-semibold text-stone-600">
              Letak (sesudah seksi)
              <select
                value={f.after}
                onChange={(e) => { update(f.id, { after: e.target.value as OrderableSection }); onFocusSection(e.target.value as OrderableSection); }}
                className={inputClass}
              >
                {hosts.map((h) => <option key={h} value={h}>{sectionLabelFor(h, spec.eventType)}</option>)}
              </select>
            </label>
            <label className="mt-2 block text-[11.5px] font-semibold text-stone-600">
              Teks kecil
              <input type="text" value={f.eyebrow} maxLength={FREE_SECTION_LIMITS.eyebrow} onChange={(e) => update(f.id, { eyebrow: cleanFreeText(e.target.value) })} className={inputClass} spellCheck={false} />
            </label>
            <label className="mt-2 block text-[11.5px] font-semibold text-stone-600">
              Judul
              <input type="text" value={f.title} maxLength={FREE_SECTION_LIMITS.title} onChange={(e) => update(f.id, { title: cleanFreeText(e.target.value) })} className={inputClass} spellCheck={false} />
            </label>
            <label className="mt-2 block text-[11.5px] font-semibold text-stone-600">
              Isi
              <textarea rows={4} value={f.body} maxLength={FREE_SECTION_LIMITS.body} onChange={(e) => update(f.id, { body: cleanFreeText(e.target.value) })} className={inputClass} spellCheck={false} />
            </label>
            <div className="mt-2">
              <Segmented value={f.align} options={[{ id: "left", label: "Kiri" }, { id: "center", label: "Tengah" }, { id: "right", label: "Kanan" }]} onChange={(align) => update(f.id, { align })} />
            </div>

            <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
              <p className="text-[11.5px] font-semibold text-stone-700">Foto</p>
              <select
                value={f.photo ? (f.photo.source === "slot" ? `slot:${f.photo.slot}` : "asset") : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const shape = f.photo?.shape ?? "rect";
                  const position = f.photo?.position ?? "top";
                  if (!v) update(f.id, { photo: undefined });
                  else if (v === "asset") update(f.id, { photo: { source: "asset", src: backdrops.find((b) => b.id)?.id ?? "", shape, position } });
                  else update(f.id, { photo: { source: "slot", slot: v.slice(5) as OrnamentMediaSlot, shape, position } });
                }}
                className={inputClass}
              >
                <option value="">Tanpa foto</option>
                <option value="asset">Gambar dari pustaka</option>
                {slots.map((s) => <option key={s.id} value={`slot:${s.id}`}>Foto klien: {s.label}</option>)}
              </select>
              {f.photo?.source === "slot" && (f.photo.slot === "HOME_PHOTO" || f.photo.slot === "CLOSING_COVER") && (
                <p className="mt-1 text-[10.5px] leading-snug text-stone-500">Foto ini hanya tampil setelah klien mengunggahnya; tanpa unggahan, foto disembunyikan.</p>
              )}
              {f.photo?.source === "asset" && (
                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {backdrops.filter((b) => b.id).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      title={b.label}
                      aria-pressed={f.photo?.source === "asset" && f.photo.src === b.id}
                      onClick={() => f.photo && update(f.id, { photo: { ...f.photo, source: "asset", src: b.id } as FreeSectionPhoto })}
                      className={`aspect-[3/4] rounded-md border bg-cover bg-center cursor-pointer ${f.photo?.source === "asset" && f.photo.src === b.id ? "border-amber-500 ring-2 ring-amber-300" : "border-stone-200"}`}
                      style={{ backgroundImage: `url('${b.id}')` }}
                    />
                  ))}
                </div>
              )}
              {f.photo && (
                <div className="mt-2 space-y-2">
                  <Segmented value={f.photo.shape} options={FREE_PHOTO_SHAPES.map((s) => ({ id: s.id, label: s.label }))} onChange={(shape) => f.photo && update(f.id, { photo: { ...f.photo, shape } })} />
                  <Segmented value={f.photo.position} options={[{ id: "top", label: "Di atas" }, { id: "bottom", label: "Di bawah" }]} onChange={(position) => f.photo && update(f.id, { photo: { ...f.photo, position } })} />
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-semibold text-stone-700">Kartu ({f.cards?.length ?? 0}/{FREE_SECTION_LIMITS.cards})</p>
                {(f.cards?.length ?? 0) < FREE_SECTION_LIMITS.cards && (
                  <button type="button" onClick={() => update(f.id, { cards: [...(f.cards ?? []), { title: "Judul kartu", body: "Isi kartu" }] })} className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer">Tambah kartu</button>
                )}
              </div>
              {(f.cards ?? []).map((c, ci) => (
                <div key={ci} className="mt-2 border-t border-stone-200 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500">
                    Kartu {ci + 1}
                    <button type="button" onClick={() => { const next = (f.cards ?? []).filter((_, j) => j !== ci); update(f.id, { cards: next.length ? next : undefined }); }} className="text-red-700 hover:underline cursor-pointer">Hapus</button>
                  </div>
                  <input type="text" value={c.title} maxLength={FREE_SECTION_LIMITS.cardTitle} aria-label={`Judul kartu ${ci + 1}`} onChange={(e) => update(f.id, { cards: (f.cards ?? []).map((x, j) => (j === ci ? { ...x, title: cleanFreeText(e.target.value) } : x)) })} className={inputClass} spellCheck={false} />
                  <textarea rows={2} value={c.body} maxLength={FREE_SECTION_LIMITS.cardBody} aria-label={`Isi kartu ${ci + 1}`} onChange={(e) => update(f.id, { cards: (f.cards ?? []).map((x, j) => (j === ci ? { ...x, body: cleanFreeText(e.target.value) } : x)) })} className={inputClass} spellCheck={false} />
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
              <label className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-stone-700">
                Kutipan
                <input type="checkbox" checked={Boolean(f.quote)} onChange={(e) => update(f.id, { quote: e.target.checked ? { text: "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup.", source: "QS. Ar-Rum: 21" } : undefined })} className="h-4 w-4 accent-amber-600 cursor-pointer" />
              </label>
              {f.quote && (
                <>
                  <textarea rows={3} value={f.quote.text} maxLength={FREE_SECTION_LIMITS.quote} aria-label="Isi kutipan" onChange={(e) => f.quote && update(f.id, { quote: { ...f.quote, text: cleanFreeText(e.target.value) } })} className={inputClass} spellCheck={false} />
                  <input type="text" value={f.quote.source} maxLength={FREE_SECTION_LIMITS.quoteSource} aria-label="Sumber kutipan" placeholder="Sumber" onChange={(e) => f.quote && update(f.id, { quote: { ...f.quote, source: cleanFreeText(e.target.value) } })} className={inputClass} spellCheck={false} />
                </>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
              <label className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-stone-700">
                Galeri mini dari foto klien
                <input type="checkbox" checked={Boolean(f.gallery)} onChange={(e) => update(f.id, { gallery: e.target.checked ? { count: 3 } : undefined })} className="h-4 w-4 accent-amber-600 cursor-pointer" />
              </label>
              {f.gallery && (
                <div className="mt-2">
                  <RangeRow label="Jumlah foto" value={f.gallery.count} unit="" min={FREE_SECTION_LIMITS.gallery[0]} max={FREE_SECTION_LIMITS.gallery[1]} onChange={(count) => update(f.id, { gallery: { count } })} />
                  <p className="mt-1 text-[10.5px] leading-snug text-stone-500">Memakai foto galeri pertama milik klien; tersembunyi bila klien belum punya foto galeri atau mematikan galeri.</p>
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
              <label className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-stone-700">
                Tombol peta lokasi
                <input type="checkbox" checked={Boolean(f.mapButton)} onChange={(e) => update(f.id, { mapButton: e.target.checked ? { label: "Buka Peta Lokasi" } : undefined })} className="h-4 w-4 accent-amber-600 cursor-pointer" />
              </label>
              {f.mapButton && (
                <>
                  <input type="text" value={f.mapButton.label} maxLength={FREE_SECTION_LIMITS.mapLabel} aria-label="Label tombol peta" onChange={(e) => f.mapButton && update(f.id, { mapButton: { label: cleanFreeText(e.target.value) } })} className={inputClass} spellCheck={false} />
                  <p className="mt-1 text-[10.5px] leading-snug text-stone-500">Menuju tautan peta acara pertama yang diisi klien; tersembunyi bila belum ada.</p>
                </>
              )}
            </div>

            <label className="mt-3 flex items-center justify-between gap-2 text-[11.5px] font-semibold text-stone-600">
              Animasi seksi ini
              <select value={f.animation ?? ""} onChange={(e) => update(f.id, { animation: (e.target.value || undefined) as AnimationPreset | undefined })} className="w-[150px] rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] text-stone-800 outline-none focus:border-amber-500">
                <option value="">Ikut global</option>
                {ANIMATION_OPTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setStyleOpen(styleOpen === f.id ? null : f.id)} aria-expanded={styleOpen === f.id} className="mt-2 w-full rounded-lg border border-stone-200 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer">
              {styleOpen === f.id ? "Tutup latar seksi" : f.style ? "Ubah latar seksi (diatur)" : "Atur latar seksi"}
            </button>
            {styleOpen === f.id && (
              <div className="mt-3">
                <SectionStyleEditor
                  value={f.style ?? DEFAULT_SECTION_STYLE}
                  palette={spec.palette}
                  dark={spec.canvasMode === "dark"}
                  backdrops={backdrops}
                  onChange={(style) => update(f.id, { style: isDefaultSectionStyle(style) ? undefined : style })}
                />
              </div>
            )}
          </div>
        ))}
        {freeId && (
          <button
            type="button"
            onClick={() => {
              const after = hosts.includes("couple") ? "couple" : hosts[0];
              save([...list, { id: freeId, after, eyebrow: "Sepatah Kata", title: "Judul Seksi", body: "Tulis pesan, doa, atau catatan untuk tamu di sini.", align: "center" }]);
              onFocusSection(after);
            }}
            className="w-full rounded-xl border border-dashed border-stone-300 py-2 text-[12px] font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 cursor-pointer"
          >
            Tambah seksi teks bebas
          </button>
        )}
      </div>
    </Section>
  );
}

/** CSS kustom baru dikirim ke rancangan bila lolos aturan yang sama dengan server, supaya pratinjau tidak gagal di tengah mengetik. */
function CustomCssEditor({ value, onChange }: { value: string; onChange: (css: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }
  const error = draft.trim() ? customCssError(draft.trim()) : null;
  return (
    <Section title="CSS kustom (lanjutan)" hint="Untuk detail yang belum punya alat. Pakai token palet seperti var(--primary), var(--accent), var(--text-main), atau color-mix(); warna hex, rgb, url(), dan @import ditolak. Dipasang paling akhir.">
      <textarea
        rows={8}
        value={draft}
        maxLength={MAX_CUSTOM_CSS_LENGTH}
        spellCheck={false}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          // Dikirim tanpa trim: menimpa draf dengan nilai ter-trim akan membuang baris baru yang sedang diketik. Server men-trim saat parse.
          if (!next.trim() || !customCssError(next.trim())) onChange(next);
        }}
        placeholder={".sec-main-title { letter-spacing: 0.08em; }"}
        className={`w-full rounded-lg border bg-white px-2.5 py-2 font-mono text-[11.5px] text-stone-800 outline-none ${error ? "border-amber-500" : "border-stone-200 focus:border-amber-500"}`}
        aria-invalid={Boolean(error)}
      />
      <div className="mt-1 flex items-center justify-between text-[10.5px]">
        <span className={error ? "font-semibold text-amber-700" : "text-stone-500"}>{error ?? (value ? "Terpasang di pratinjau." : "Kosong.")}</span>
        <span className="font-mono text-stone-400">{draft.length}/{MAX_CUSTOM_CSS_LENGTH}</span>
      </div>
    </Section>
  );
}

export function OrnamentsPanel({
  spec,
  library,
  viewSection,
  uploading,
  selectedId,
  onUpload,
  onAdd,
  onAddText,
  onStartDrag,
  onSelect,
  onDeleteAsset,
  onCopySectionToAllFlow,
}: {
  spec: BuilderSpec;
  library: AssetLibrary | null;
  viewSection: OrnamentSection;
  uploading: boolean;
  selectedId: string | null;
  onUpload: (files: FileList) => void;
  onAdd: (src: string) => void;
  onAddText: () => void;
  onStartDrag: (src: string, e: ReactPointerEvent<HTMLElement>) => void;
  onSelect: (id: string) => void;
  onDeleteAsset: (url: string) => void;
  onCopySectionToAllFlow?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [openGroup, setOpenGroup] = useState<string>("uploads");
  const [over, setOver] = useState(false);
  const inSection = spec.ornaments.filter((o) => o.section === viewSection);

  const thumb = (src: string, removable = false) => (
    <div key={src} className="group relative">
      <button
        type="button"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          onStartDrag(src, e);
        }}
        // Klik mouse ditangani onStartDrag; onClick hanya untuk Enter/Spasi dari keyboard (detail = 0).
        onClick={(e) => { if (e.detail === 0) onAdd(src); }}
        title="Klik untuk menaruh di seksi yang sedang tampil, atau seret ke pratinjau"
        className="flex aspect-square w-full touch-none select-none items-center justify-center rounded-lg border border-stone-200 bg-[linear-gradient(45deg,#f5f5f4_25%,transparent_25%,transparent_75%,#f5f5f4_75%),linear-gradient(45deg,#f5f5f4_25%,transparent_25%,transparent_75%,#f5f5f4_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px] p-1.5 transition hover:border-amber-500 cursor-grab"
      >
        <img src={src} alt="" loading="lazy" className="max-h-full max-w-full object-contain" draggable={false} />
      </button>
      {removable && (
        <button
          type="button"
          onClick={() => onDeleteAsset(src)}
          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white shadow group-hover:flex cursor-pointer"
          aria-label="Hapus ornamen dari pustaka"
        >
          <Icon d="M6 6l12 12M18 6L6 18" className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <>
      <Section title="Cara pakai" hint={`Seret gambar ke pratinjau, atau klik untuk menaruhnya di seksi "${sectionLabelFor(viewSection, spec.eventType)}" yang sedang tampil. Di pratinjau: geser untuk memindah, bulatan pojok untuk mengubah ukuran, bulatan atas untuk memutar.`}>
        <div
          onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-4 text-center transition ${over ? "border-amber-500 bg-amber-50" : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"}`}
        >
          <Icon d="M12 16V4m0 0l-4 4m4-4l4 4M5 20h14" className="h-5 w-5 text-stone-500" />
          <span className="text-[12.5px] font-semibold text-stone-800">{uploading ? "Mengunggah…" : "Unggah ornamen / bingkai (PNG, WebP, JPEG)"}</span>
          <span className="text-[11px] text-stone-500">Latar transparan untuk ornamen/bingkai, maks. 6 MB</span>
          <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" multiple hidden onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }} />
        </div>
      </Section>

      <Section title="Teks hias" hint="Tulisan bebas seperti &quot;Save the Date&quot; atau &quot;Bersama keluarga&quot;. Bawaannya sama untuk semua klien dan hanya admin yang mengubah. Aktifkan &quot;Bisa diedit klien&quot; di inspektor (maks. 3 per tema) agar klien dapat mengganti isinya di Studio; isi yang Anda tulis menjadi teks awalnya.">
        <button type="button" onClick={onAddText} className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-[12.5px] font-semibold text-stone-800 hover:bg-stone-50 cursor-pointer">
          <Icon d="M5 6V4h14v2M12 4v16M9 20h6" className="h-4 w-4 text-stone-500" />
          Tambah teks di seksi {sectionLabelFor(viewSection, spec.eventType)}
        </button>
      </Section>

      <Section title={`Di seksi ${sectionLabelFor(viewSection, spec.eventType)} (${inSection.length})`}>
        {inSection.length === 0 ? (
          <p className="text-[11.5px] text-stone-500">Belum ada ornamen di seksi ini.</p>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {inSection.map((o, i) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onSelect(o.id)}
                aria-label={`Pilih ${o.text ? "teks hias" : "ornamen"} ${i + 1} di seksi ${sectionLabelFor(viewSection, spec.eventType)}${o.attach ? `, menempel ke ${blockLabelFor(o.attach, spec.eventType)}` : ""}`}
                title={o.attach ? `Menempel ke ${blockLabelFor(o.attach, spec.eventType)}` : undefined}
                className={`relative flex aspect-square items-center justify-center rounded-lg border bg-stone-50 p-1 cursor-pointer ${selectedId === o.id ? "border-amber-500 ring-2 ring-amber-500/25" : "border-stone-200"}`}
              >
                {o.text ? <span className="line-clamp-2 break-all text-center text-[10px] font-semibold leading-tight text-stone-600">{o.text.value}</span> : <img src={o.src} alt="" className="max-h-full max-w-full object-contain" />}
                {o.attach && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>
        )}
        {inSection.some((o) => o.attach) && <p className="mt-2 text-[10.5px] text-stone-500">Titik biru: menempel ke blok dan ikut bergeser bersamanya.</p>}
        {inSection.some((o) => !o.attach && !o.before) && onCopySectionToAllFlow && (
          <button
            type="button"
            onClick={onCopySectionToAllFlow}
            className="mt-2.5 w-full rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-center text-[11.5px] font-semibold text-amber-900 transition hover:bg-amber-100 cursor-pointer"
          >
            Salin Ornamen Seksi Ini ke Semua Seksi Isi
          </button>
        )}
      </Section>

      <Section title="Pustaka">
        {!library ? (
          <p className="text-[11.5px] text-stone-500">Memuat pustaka…</p>
        ) : (
          <div className="space-y-2">
            {[{ id: "uploads", label: `Unggahan admin (${library.uploads.filter((u) => !u.opaque).length})`, items: library.uploads.filter((u) => !u.opaque).map((u) => u.url) },...library.builtin.map((g) => ({ ...g, label: `${g.label} (${g.items.length})` }))].map((group) => (
              <div key={group.id} className="rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setOpenGroup(openGroup === group.id ? "" : group.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[12px] font-semibold text-stone-700 cursor-pointer"
                >
                  {group.label}
                  <Icon d={openGroup === group.id ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} className="h-3.5 w-3.5 text-stone-400" />
                </button>
                {openGroup === group.id && (
                  <div className="grid grid-cols-4 gap-1.5 border-t border-stone-100 p-2">
                    {group.items.length ? group.items.map((src) => thumb(src, group.id === "uploads")) : <p className="col-span-4 py-2 text-center text-[11px] text-stone-400">Belum ada unggahan.</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

/**
 * Foto uji (simulasi): foto contoh per slot media klien untuk melihat rancangan dengan foto nyata sebelum terbit. Foto
 * tidak masuk ke tema; slot kosong tampil seperti klien yang belum mengunggah (bawaan tema).
 */
export function SimulatePanel({ eventType, sim, active, uploading, onUpload, onRemove, onActivate, onClear }: {
  eventType: BuilderEventType;
  sim: SimMedia;
  active: boolean;
  uploading: string | null;
  onUpload: (target: SimSlot["slot"] | "GALLERY", files: FileList) => void;
  onRemove: (target: SimSlot["slot"] | "GALLERY", url?: string) => void;
  onActivate: () => void;
  onClear: () => void;
}) {
  const filled = Object.keys(sim.slots).length + sim.gallery.length;
  return (
    <div>
      <Section title="Simulasi foto klien" hint={`Foto uji hanya untuk pratinjau: tidak tersimpan di tema dan terhapus otomatis setelah ${SIM_MEDIA_MAX_AGE_DAYS} hari. Slot kosong tampil seperti klien yang belum mengunggah.`}>
        <div className="flex items-center justify-between gap-2">
          {active ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Pratinjau memakai foto uji</span>
          ) : (
            <button type="button" onClick={onActivate} className="rounded-lg bg-stone-900 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-stone-800 cursor-pointer">Tampilkan di pratinjau</button>
          )}
          {filled > 0 && <button type="button" onClick={onClear} className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 hover:underline cursor-pointer">Kosongkan semua</button>}
        </div>
      </Section>
      <Section title="Slot media">
        <ul className="space-y-2">
          {simSlotsFor(eventType).map((s) => {
            const url = sim.slots[s.slot];
            return (
              <li key={s.slot} className="flex items-center gap-2.5">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-900/10">
                  {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-stone-800">{s.label}</span>
                  <span className="block text-[10.5px] leading-snug text-stone-500">{s.hint}</span>
                </span>
                <label className={`shrink-0 rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-700 hover:border-stone-400 ${uploading ? "opacity-50" : "cursor-pointer"}`}>
                  {uploading === s.slot ? "Mengunggah…" : url ? "Ganti" : "Unggah"}
                  <input type="file" accept="image/png,image/webp,image/jpeg" className="hidden" disabled={Boolean(uploading)} onChange={(e) => { if (e.target.files?.length) onUpload(s.slot, e.target.files); e.target.value = ""; }} />
                </label>
                {url && <button type="button" onClick={() => onRemove(s.slot)} aria-label={`Hapus foto ${s.label}`} className="text-[11px] font-semibold text-stone-400 hover:text-stone-800 cursor-pointer">Hapus</button>}
              </li>
            );
          })}
        </ul>
      </Section>
      <Section title={`Galeri (${sim.gallery.length}/${SIM_GALLERY_MAX})`} hint="Campurkan foto potret dan mendatar untuk melihat susunan galeri.">
        <div className="grid grid-cols-4 gap-1.5">
          {sim.gallery.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-900/10">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onRemove("GALLERY", url)} aria-label="Hapus foto galeri" className="absolute right-1 top-1 rounded-md bg-white/90 px-1 text-[10px] font-semibold text-stone-700 opacity-0 transition group-hover:opacity-100 focus:opacity-100 cursor-pointer">Hapus</button>
            </div>
          ))}
          {sim.gallery.length < SIM_GALLERY_MAX && (
            <label className={`flex aspect-square items-center justify-center rounded-lg border border-dashed border-stone-300 text-[10.5px] font-semibold text-stone-500 hover:border-stone-500 ${uploading ? "opacity-50" : "cursor-pointer"}`}>
              {uploading === "GALLERY" ? "…" : "+ Foto"}
              <input type="file" multiple accept="image/png,image/webp,image/jpeg" className="hidden" disabled={Boolean(uploading)} onChange={(e) => { if (e.target.files?.length) onUpload("GALLERY", e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </Section>
    </div>
  );
}

export function MotionPanel({ spec, onChange, onReplay }: { spec: BuilderSpec; onChange: (patch: Partial<BuilderSpec>) => void; onReplay: () => void }) {
  return (
    <>
    <Section title="Animasi masuk" hint="Isi seksi muncul saat tamu menggulir. Tamu yang mengaktifkan pengurangan gerak di HP-nya tetap melihat isi tanpa animasi.">
      <div className="grid grid-cols-2 gap-2">
        {ANIMATION_OPTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => { onChange({ animation: a.id }); onReplay(); }}
            className={`rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${spec.animation === a.id ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300"}`}
          >
            <span className="block text-[12.5px] font-semibold text-stone-800">{a.label}</span>
            <span className="block text-[11px] text-stone-500">{a.hint}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onReplay} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 cursor-pointer">
        <Icon d="M4 4v6h6M20 20v-6h-6M5.6 15a7 7 0 0011.8 2.4M18.4 9A7 7 0 006.6 6.6" className="h-3.5 w-3.5" />
        Putar ulang di pratinjau
      </button>
    </Section>
    <Section title="Kecepatan animasi">
      <Segmented
        value={spec.animationSpeed ?? "normal"}
        options={ANIMATION_SPEEDS.map((s) => ({ id: s.id, label: s.label }))}
        onChange={(v) => { onChange({ animationSpeed: v === "normal" ? undefined : v }); onReplay(); }}
      />
    </Section>
    <Section title="Animasi per seksi" hint="Beri seksi tertentu animasi berbeda dari animasi global, misalnya Mempelai membesar sementara seksi lain naik. Animasi seksi teks bebas diatur di panel Tata letak.">
      <div className="space-y-1.5">
        {familyOrderableSections(spec.eventType, spec.sectionOrder).map((sec) => {
          const value = spec.sectionAnimations?.[sec] ?? "";
          return (
            <label key={sec} className="flex items-center justify-between gap-2 text-[12px] font-semibold text-stone-700">
              {sectionLabelFor(sec, spec.eventType)}
              <select
                value={value}
                onChange={(e) => {
                  const next = { ...(spec.sectionAnimations ?? {}) };
                  if (e.target.value) next[sec] = e.target.value as AnimationPreset;
                  else delete next[sec];
                  onChange({ sectionAnimations: Object.keys(next).length ? next : undefined });
                  onReplay();
                }}
                className="w-[150px] rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] text-stone-800 outline-none focus:border-amber-500"
              >
                <option value="">Ikut global</option>
                {ANIMATION_OPTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </label>
          );
        })}
      </div>
    </Section>
    </>
  );
}

export function PublishPanel({
  spec,
  meta,
  state,
  onMeta,
  onSave,
  onPublish,
  music,
  revisions,
  onDuplicate,
  onExport,
  onRestoreRevision,
}: {
  spec: BuilderSpec;
  meta: ThemeMeta;
  state: PublishState;
  onMeta: (patch: Partial<ThemeMeta>) => void;
  onSave: () => void;
  onPublish: (active: boolean) => void;
  music: MusicOption[] | null;
  revisions: RevisionRow[] | null;
  onDuplicate: () => void;
  onExport: () => void;
  onRestoreRevision: (id: string) => void;
}) {
  const contrastOk = paletteChecks(spec).every((c) => c.ok);
  const checklist: Array<{ label: string; ok: boolean; note?: string }> = [
    { label: "Nama tema diisi", ok: meta.name.trim().length >= 2 },
    { label: "Kontras warna terbaca", ok: contrastOk, note: contrastOk ? undefined : "Peringatan saja; periksa tab Warna." },
    { label: "Master lolos pemeriksaan mesin", ok: state.issues.length === 0 },
    { label: "Perubahan tersimpan", ok: !state.dirty && !state.isNew },
  ];
  const blocking = !checklist[0].ok || !checklist[2].ok;
  return (
    <>
      <Section title="Identitas tema">
        <div className="space-y-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-stone-700">Nama tema</span>
            <input value={meta.name} onChange={(e) => onMeta({ name: e.target.value })} maxLength={60} placeholder="mis. Sekar Arum" className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-500" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-stone-700">ID / alamat demo</span>
            <input
              value={meta.id}
              onChange={(e) => onMeta({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              disabled={!state.isNew}
              maxLength={40}
              placeholder="dibuat otomatis dari nama"
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 font-mono text-[12.5px] outline-none focus:border-amber-500 disabled:bg-stone-50 disabled:text-stone-500"
            />
            <span className="mt-1 block text-[11px] text-stone-500">{state.isNew ? "Tidak dapat diubah setelah disimpan." : `Demo: /demo/${meta.id}`}</span>
          </label>
          <div>
            <span className="text-[12px] font-semibold text-stone-700">Gaya katalog</span>
            <div className="mt-1">
              <Segmented value={meta.category} options={[{ id: "minimalist", label: "Minimalist" }, { id: "modern", label: "Modern" }, { id: "traditional", label: "Traditional" }]} onChange={(category) => onMeta({ category })} />
            </div>
          </div>
          <label className="block">
            <span className="text-[12px] font-semibold text-stone-700">Deskripsi singkat</span>
            <textarea value={meta.description} onChange={(e) => onMeta({ description: e.target.value })} maxLength={300} rows={3} placeholder="Ditampilkan di katalog tema klien" className="mt-1 w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-500" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-stone-700">Musik bawaan</span>
            <select
              value={meta.defaultMusicUrl}
              onChange={(e) => onMeta({ defaultMusicUrl: e.target.value })}
              disabled={!music}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 disabled:bg-stone-50 cursor-pointer"
            >
              <option value="">Ikuti musik bawaan seri</option>
              {meta.defaultMusicUrl && !(music ?? []).some((m) => m.url === meta.defaultMusicUrl) && <option value={meta.defaultMusicUrl}>{meta.defaultMusicUrl}</option>}
              {(music ?? []).map((m) => <option key={m.id} value={m.url}>{m.composer ? `${m.title} – ${m.composer}` : m.title}</option>)}
            </select>
            <span className="mt-1 block text-[11px] text-stone-500">Dimainkan di undangan klien sampai klien memilih lagu sendiri.</span>
          </label>
        </div>
      </Section>

      <Section title="Sebelum terbit">
        <ul className="space-y-2">
          {checklist.map((c) => (
            <li key={c.label} className="text-[12px]">
              <span className="flex items-center gap-2 text-stone-700">
                <span className={`h-1.5 w-1.5 rounded-full ${c.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                {c.label}
              </span>
              {c.note && <span className="ml-3.5 block text-[11px] text-stone-500">{c.note}</span>}
            </li>
          ))}
        </ul>
        {state.issues.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-xl bg-red-50 p-3 text-[11.5px] text-red-800">
            {state.issues.map((i) => <li key={i.message}>{i.message}</li>)}
          </ul>
        )}
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={onSave} disabled={state.saving || blocking} className="rounded-xl bg-stone-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
            {state.saving ? "Menyimpan…" : state.isNew ? "Simpan sebagai draf" : "Simpan perubahan"}
          </button>
          {!state.isNew && (
            <button
              type="button"
              onClick={() => onPublish(!state.isActive)}
              disabled={state.saving || (!state.isActive && (state.dirty || blocking))}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${state.isActive ? "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50" : "bg-amber-600 text-white hover:bg-amber-700"}`}
            >
              {state.isActive ? "Tarik dari katalog" : "Terbitkan ke katalog"}
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
          Setelah terbit, thumbnail katalog dipotret otomatis dari halaman demo. Unggah foto demo lewat <a href="/admin?tab=themes" className="font-semibold text-amber-700 hover:underline">Katalog Tema → Demo Studio</a>, lalu buat ulang thumbnail di sana. Mengubah tema yang sudah dipakai klien tidak mengubah undangan mereka.
        </p>
      </Section>

      {!state.isNew && (
        <>
          <Section title="Salin dan pindahkan" hint="Duplikat dan ekspor memakai versi yang sudah tersimpan, bukan perubahan yang belum disimpan.">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onDuplicate} disabled={state.saving} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer">
                Duplikat tema
              </button>
              <button type="button" onClick={onExport} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer">
                Ekspor berkas
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">Berkas ekspor memuat rancangan beserta gambar unggahannya. Impor di tema baru pada server lain lewat tombol Impor di bagian atas.</p>
          </Section>

          <Section title="Riwayat versi" hint="Setiap penyimpanan yang mengubah rancangan dicatat; 30 terakhir disimpan.">
            {revisions === null ? (
              <p className="text-[12px] text-stone-500">Memuat riwayat…</p>
            ) : revisions.length === 0 ? (
              <p className="text-[12px] text-stone-500">Belum ada versi tercatat. Versi pertama muncul setelah Anda menyimpan.</p>
            ) : (
              <ul className="space-y-1.5">
                {revisions.map((r, i) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2">
                    <span className="min-w-0 text-[11.5px] text-stone-700">
                      <span className="block font-semibold">{revisionTime(r.createdAt)}{i === 0 ? " (terbaru)" : ""}</span>
                      <span className="block truncate text-stone-500">{REVISION_ACTION_LABEL[r.action] ?? r.action}{r.adminName ? ` oleh ${r.adminName}` : ""}</span>
                    </span>
                    {i > 0 && (
                      <button type="button" onClick={() => onRestoreRevision(r.id)} className="shrink-0 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer">
                        Muat ke editor
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </>
  );
}
