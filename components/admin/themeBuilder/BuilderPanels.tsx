"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  ANIMATION_OPTIONS,
  FONT_OPTIONS,
  PALETTE_PRESETS,
  RADIUS_OPTIONS,
  SECTION_LABELS,
  TEXTURE_OPTIONS,
  VARIANT_GROUPS,
  fontFamily,
  paletteChecks,
  type BuilderPalette,
  type BuilderSpec,
  type BuilderVariants,
  type OrnamentSection,
} from "@/lib/themeBuilder/spec";

export type PanelId = "colors" | "type" | "layout" | "ornaments" | "motion" | "publish";

export interface AssetLibrary {
  uploads: Array<{ url: string; size: number; uploadedAt: number }>;
  builtin: Array<{ id: string; label: string; items: string[] }>;
}

export interface ThemeMeta {
  id: string;
  name: string;
  category: "minimalist" | "modern" | "traditional";
  description: string;
}

export interface PublishState {
  isNew: boolean;
  isActive: boolean;
  dirty: boolean;
  saving: boolean;
  issues: Array<{ code: string; message: string }>;
}

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

export const PANEL_TABS: Array<{ id: PanelId; label: string; icon: string }> = [
  { id: "colors", label: "Warna", icon: "M12 3a9 9 0 100 18c1.1 0 1.5-.9 1.5-1.6 0-.9-.8-1.3-.8-2.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 004-4c0-4.7-4-8.5-9-8.5zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01" },
  { id: "type", label: "Huruf", icon: "M4 7V5h16v2M9 19h6M12 5v14" },
  { id: "layout", label: "Tata letak", icon: "M4 5h16v5H4zM4 14h7v5H4zM15 14h5v5h-5z" },
  { id: "ornaments", label: "Ornamen", icon: "M12 3c1.5 3 4 4.5 7 5-3 1-5.5 3-7 7-1.5-4-4-6-7-7 3-.5 5.5-2 7-5zM5 18l1.5 3M19 18l-1.5 3" },
  { id: "motion", label: "Animasi", icon: "M4 12h4l3-7 4 14 3-7h2" },
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

export function ColorsPanel({ spec, onChange }: { spec: BuilderSpec; onChange: (patch: Partial<BuilderSpec>) => void }) {
  const checks = paletteChecks(spec);
  return (
    <>
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
        <div className="grid grid-cols-4 gap-2">
          {TEXTURE_OPTIONS.map((t) => (
            <button
              key={t.id || "none"}
              type="button"
              title={t.label}
              onClick={() => onChange({ texture: t.id })}
              className={`aspect-[3/4] overflow-hidden rounded-lg border bg-cover bg-center transition cursor-pointer ${spec.texture === t.id ? "border-amber-500 ring-2 ring-amber-500/25" : "border-stone-200 hover:border-stone-300"}`}
              style={{ backgroundColor: spec.canvasMode === "dark" ? spec.palette.bgDark : spec.palette.bgLight, backgroundImage: t.id ? `url('${t.id}')` : undefined }}
            >
              {!t.id && <span className="text-[10px] font-semibold text-stone-500">Polos</span>}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Sudut kartu & tombol">
        <Segmented value={spec.radius} options={RADIUS_OPTIONS.map((r) => ({ id: r.id, label: r.label }))} onChange={(radius) => onChange({ radius })} />
      </Section>
    </>
  );
}

export function TypePanel({ spec, onChange }: { spec: BuilderSpec; onChange: (patch: Partial<BuilderSpec>) => void }) {
  const roles: Array<{ key: keyof BuilderSpec["fonts"]; label: string; sample: string; size: string }> = [
    { key: "heading", label: "Judul", sample: "Andi & Besse", size: "text-[22px]" },
    { key: "body", label: "Isi", sample: "Dengan memohon rahmat Allah SWT, kami mengundang Bapak/Ibu/Saudara/i.", size: "text-[13px]" },
    { key: "script", label: "Tulisan tangan", sample: "Save the Date", size: "text-[26px]" },
  ];
  return (
    <>
      {roles.map((role) => (
        <Section key={role.key} title={role.label}>
          <p className={`mb-3 rounded-xl bg-stone-50 px-3 py-3 leading-snug text-stone-800 ${role.size}`} style={{ fontFamily: fontFamily(spec.fonts[role.key]) }}>
            {role.sample}
          </p>
          <div className="grid grid-cols-1 gap-1">
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
        </Section>
      ))}
    </>
  );
}

/** Sketsa mini setiap varian, diwarnai palet aktif agar admin melihat hasilnya sebelum memilih. */
function VariantThumb({ group, id, palette, dark }: { group: keyof BuilderVariants; id: string; palette: BuilderPalette; dark: boolean }) {
  const canvas = dark ? palette.bgDark : palette.bgLight;
  const ink = dark ? palette.textLight : palette.textDark;
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
    const shape: CSSProperties = id === "circle" ? { width: 26, height: 26, borderRadius: "50%" } : id === "arch" ? { width: 22, height: 30, borderRadius: "999px 999px 4px 4px" } : { width: 0, height: 0 };
    return (
      <span className={box} style={{ background: canvas }}>
        <span className={`flex flex-col items-center gap-1 ${id === "card" ? "rounded-md px-3 py-2 shadow-sm" : ""}`} style={id === "card" ? { background: dark ? palette.secondary : "#ffffff" } : undefined}>
          {(id === "arch" || id === "circle") && photo(shape)}
          {bar("30px", ink, 4)}{bar("16px", palette.primary, 2)}
        </span>
      </span>
    );
  }
  if (group === "couple") {
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
          style={id === "card" ? { background: dark ? palette.secondary : "#ffffff", borderRadius: 6 } : id === "framed" ? { border: `1px solid ${palette.primary}`, outline: `1px solid ${palette.primary}`, outlineOffset: 2, borderRadius: 4 } : undefined}
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

export function LayoutPanel({ spec, onChange, onFocusSection }: { spec: BuilderSpec; onChange: (patch: Partial<BuilderSpec>) => void; onFocusSection: (s: OrnamentSection) => void }) {
  return (
    <>
      {VARIANT_GROUPS.map((group) => (
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
    </>
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
  onStartDrag,
  onSelect,
  onDeleteAsset,
}: {
  spec: BuilderSpec;
  library: AssetLibrary | null;
  viewSection: OrnamentSection;
  uploading: boolean;
  selectedId: string | null;
  onUpload: (files: FileList) => void;
  onAdd: (src: string) => void;
  onStartDrag: (src: string, e: ReactPointerEvent<HTMLElement>) => void;
  onSelect: (id: string) => void;
  onDeleteAsset: (url: string) => void;
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
      <Section title="Cara pakai" hint={`Seret gambar ke pratinjau, atau klik untuk menaruhnya di seksi "${SECTION_LABELS[viewSection]}" yang sedang tampil. Di pratinjau: geser untuk memindah, bulatan pojok untuk mengubah ukuran, bulatan atas untuk memutar.`}>
        <div
          onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-4 text-center transition ${over ? "border-amber-500 bg-amber-50" : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"}`}
        >
          <Icon d="M12 16V4m0 0l-4 4m4-4l4 4M5 20h14" className="h-5 w-5 text-stone-500" />
          <span className="text-[12.5px] font-semibold text-stone-800">{uploading ? "Mengunggah…" : "Unggah ornamen PNG / WebP"}</span>
          <span className="text-[11px] text-stone-500">Latar transparan, maks. 6 MB</span>
          <input ref={fileRef} type="file" accept="image/png,image/webp" multiple hidden onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }} />
        </div>
      </Section>

      <Section title={`Di seksi ${SECTION_LABELS[viewSection]} (${inSection.length})`}>
        {inSection.length === 0 ? (
          <p className="text-[11.5px] text-stone-500">Belum ada ornamen di seksi ini.</p>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {inSection.map((o, i) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onSelect(o.id)}
                aria-label={`Pilih ornamen ${i + 1} di seksi ${SECTION_LABELS[viewSection]}`}
                className={`flex aspect-square items-center justify-center rounded-lg border bg-stone-50 p-1 cursor-pointer ${selectedId === o.id ? "border-amber-500 ring-2 ring-amber-500/25" : "border-stone-200"}`}
              >
                        <img src={o.src} alt="" className="max-h-full max-w-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Pustaka">
        {!library ? (
          <p className="text-[11.5px] text-stone-500">Memuat pustaka…</p>
        ) : (
          <div className="space-y-2">
            {[{ id: "uploads", label: `Unggahan admin (${library.uploads.length})`, items: library.uploads.map((u) => u.url) }, ...library.builtin.map((g) => ({ ...g, label: `${g.label} (${g.items.length})` }))].map((group) => (
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

export function MotionPanel({ spec, onChange, onReplay }: { spec: BuilderSpec; onChange: (patch: Partial<BuilderSpec>) => void; onReplay: () => void }) {
  return (
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
  );
}

export function PublishPanel({
  spec,
  meta,
  state,
  onMeta,
  onSave,
  onPublish,
}: {
  spec: BuilderSpec;
  meta: ThemeMeta;
  state: PublishState;
  onMeta: (patch: Partial<ThemeMeta>) => void;
  onSave: () => void;
  onPublish: (active: boolean) => void;
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
          Setelah terbit, unggah foto demo dan thumbnail katalog lewat <a href="/admin?tab=themes" className="font-semibold text-amber-700 hover:underline">Katalog Tema → Demo Studio</a>. Mengubah tema yang sudah dipakai klien tidak mengubah undangan mereka.
        </p>
      </Section>
    </>
  );
}
