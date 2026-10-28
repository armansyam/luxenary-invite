"use client";

import {
  ATTACHABLE_BLOCKS,
  BUILDER_BLOCKS,
  DEFAULT_ORNAMENT_GAP,
  DEFAULT_ORNAMENT_TEXT,
  FLOW_EXCLUDED_BLOCKS,
  ORNAMENT_GAP_LIMITS,
  ORNAMENT_SECTIONS,
  ORNAMENT_TEXT_COLORS,
  ORNAMENT_TEXT_FONTS,
  ORNAMENT_TEXT_LIMITS,
  SECTION_LABELS,
  ornamentLimits,
  type AttachableBlockId,
  type BuilderBlockId,
  type BuilderOrnament,
  type BuilderPalette,
  type CanvasMode,
  type OrnamentSection,
  type OrnamentText,
  type StackMove,
} from "@/lib/themeBuilder/spec";

/** Cara ornamen ditempatkan: bebas di seksi, menempel ke blok (anak blok), atau sebaris sebelum blok. */
export type OrnamentPlacement = { mode: "free" } | { mode: "attach"; block: AttachableBlockId } | { mode: "flow"; block: BuilderBlockId };

interface Props {
  ornament: BuilderOrnament;
  palette: BuilderPalette;
  canvasMode: CanvasMode;
  onPlace: (placement: OrnamentPlacement) => void;
  /** Urutan tumpukan di antara ornamen sejenis (seksi dan lapisan sama); 0 adalah paling belakang. */
  stack: { index: number; count: number };
  onReorder: (move: StackMove) => void;
  onChange: (patch: Partial<BuilderOrnament>, final: boolean) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function Slider({ label, value, min, max, step = 0.5, suffix = "", numeric = false, resetTo, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; numeric?: boolean; resetTo?: number; onChange: (v: number, final: boolean) => void }) {
  const changed = resetTo !== undefined && value !== resetTo;
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11.5px] font-semibold text-stone-600">
        <span className="flex items-center gap-1.5">
          {label}
          {changed && (
            <button
              type="button"
              title={`Kembalikan ke ${resetTo}${suffix}`}
              aria-label={`Kembalikan ${label} ke semula`}
              onClick={(e) => { e.preventDefault(); onChange(resetTo, true); }}
              className="flex h-5 w-5 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-800 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M4.6 14a8 8 0 101.9-8.3L4 10" /></svg>
            </button>
          )}
        </span>
        {numeric ? (
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={Math.round(value * 10) / 10}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (e.target.value !== "" && Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)), true);
              }}
              className="w-[72px] rounded-md border border-stone-200 px-1.5 py-0.5 text-right font-mono text-[11px] font-medium text-stone-700 outline-none focus:border-amber-500"
            />
            <span className="font-mono text-[11px] font-medium text-stone-500">{suffix}</span>
          </span>
        ) : (
          <span className="font-mono text-[11px] font-medium text-stone-500">{Math.round(value * 10) / 10}{suffix}</span>
        )}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value), false)}
        onPointerUp={(e) => onChange(Number((e.target as HTMLInputElement).value), true)}
        onKeyUp={(e) => onChange(Number((e.target as HTMLInputElement).value), true)}
        className="mt-1 w-full accent-amber-600 cursor-pointer"
      />
    </label>
  );
}

function Toggle<T extends string>({ label, hint, value, options, onChange }: { label: string; hint?: string; value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div>
      <span className="text-[11.5px] font-semibold text-stone-600">{label}</span>
      <div className="mt-1 grid grid-cols-2 rounded-xl bg-stone-100 p-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition cursor-pointer ${value === o.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1 text-[10.5px] leading-snug text-stone-500">{hint}</p>}
    </div>
  );
}

const DEFAULT_TEXT_SIZE = DEFAULT_ORNAMENT_TEXT.size;

export default function OrnamentInspector({ ornament: o, palette, canvasMode, onPlace, stack, onReorder, onChange, onDuplicate, onRemove, onClose }: Props) {
  const set = (patch: Partial<BuilderOrnament>) => onChange(patch, true);
  const setText = (patch: Partial<OrnamentText>, final: boolean) => o.text && onChange({ text: { ...o.text, ...patch } }, final);
  const mode: OrnamentPlacement["mode"] = o.before ? "flow" : o.attach ? "attach" : "free";
  const container = o.attach ? "blok" : "seksi";
  const limits = ornamentLimits(o);
  const attachOptions = ATTACHABLE_BLOCKS.filter((id) => BUILDER_BLOCKS.find((b) => b.id === id)?.section === o.section);
  const flowOptions = BUILDER_BLOCKS.filter((b) => b.section === o.section && !FLOW_EXCLUDED_BLOCKS.includes(b.id)).map((b) => b.id);
  const swatch: Record<(typeof ORNAMENT_TEXT_COLORS)[number]["id"], string> = {
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    text: canvasMode === "dark" ? palette.textLight : palette.textDark,
    "on-dark": palette.textLight,
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 p-1">
            {o.text ? <span className="text-[15px] font-bold text-stone-500">Aa</span> : <img src={o.src} alt="" className="max-h-full max-w-full object-contain" />}
          </span>
          <div>
            <p className="text-[12.5px] font-bold text-stone-800">{o.text ? "Teks hias" : "Ornamen"}</p>
            <p className="text-[11px] text-stone-500">{SECTION_LABELS[o.section]}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer" aria-label="Tutup inspektor">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {o.text && (
          <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <label className="block">
              <span className="text-[11.5px] font-semibold text-stone-600">Tulisan</span>
              <input
                type="text"
                value={o.text.value}
                maxLength={ORNAMENT_TEXT_LIMITS.length}
                onChange={(e) => setText({ value: e.target.value }, false)}
                onBlur={(e) => { if (!e.target.value.trim()) setText({ value: "Teks" }, true); else setText({ value: e.target.value }, true); }}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-amber-500"
              />
            </label>
            <div>
              <span className="text-[11.5px] font-semibold text-stone-600">Huruf</span>
              <div className="mt-1 grid grid-cols-3 rounded-xl bg-stone-100 p-1">
                {ORNAMENT_TEXT_FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setText({ font: f.id }, true)}
                    className={`rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${o.text!.font === f.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Ukuran huruf" value={o.text.size} min={ORNAMENT_TEXT_LIMITS.size[0]} max={ORNAMENT_TEXT_LIMITS.size[1]} step={1} suffix=" px" resetTo={DEFAULT_TEXT_SIZE} onChange={(size, f) => setText({ size }, f)} />
            <Slider label="Jarak antarhuruf" value={o.text.spacing} min={ORNAMENT_TEXT_LIMITS.spacing[0]} max={ORNAMENT_TEXT_LIMITS.spacing[1]} step={0.01} suffix=" em" resetTo={0} onChange={(spacing, f) => setText({ spacing }, f)} />
            <div>
              <span className="text-[11.5px] font-semibold text-stone-600">Warna</span>
              <div className="mt-1 grid grid-cols-5 gap-1.5">
                {ORNAMENT_TEXT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    aria-label={`Warna ${c.label}`}
                    aria-pressed={o.text!.color === c.id}
                    onClick={() => setText({ color: c.id }, true)}
                    className={`flex aspect-square items-center justify-center rounded-lg border bg-white transition cursor-pointer ${o.text!.color === c.id ? "border-amber-500 ring-2 ring-amber-500/25" : "border-stone-200 hover:border-stone-300"}`}
                  >
                    <span className="h-5 w-5 rounded-full ring-1 ring-stone-300" style={{ background: swatch[c.id] }} />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10.5px] leading-snug text-stone-500">Warna mengikuti palet tema. &quot;Teks di atas foto&quot; dipakai di sampul dan penutup berlatar foto.</p>
            </div>
          </div>
        )}

        <div>
          <span className="text-[11.5px] font-semibold text-stone-600">Penempatan</span>
          <div className="mt-1 grid grid-cols-3 rounded-xl bg-stone-100 p-1">
            {([
              { mode: "free", label: "Bebas" },
              { mode: "attach", label: "Menempel" },
              { mode: "flow", label: "Sebaris" },
            ] as const).map((m) => (
              <button
                key={m.mode}
                type="button"
                aria-pressed={mode === m.mode}
                onClick={() => {
                  if (m.mode === mode) return;
                  if (m.mode === "free") onPlace({ mode: "free" });
                  else if (m.mode === "attach") onPlace({ mode: "attach", block: attachOptions[0] });
                  else onPlace({ mode: "flow", block: flowOptions[0] });
                }}
                disabled={(m.mode === "attach" && !attachOptions.length) || (m.mode === "flow" && !flowOptions.length)}
                className={`rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${mode === m.mode ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode !== "free" && (
            <select
              value={o.attach ?? o.before ?? ""}
              onChange={(e) => onPlace(mode === "attach" ? { mode: "attach", block: e.target.value as AttachableBlockId } : { mode: "flow", block: e.target.value as BuilderBlockId })}
              aria-label={mode === "attach" ? "Blok tempat menempel" : "Blok yang didahului ornamen"}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-amber-500 cursor-pointer"
            >
              {(mode === "attach" ? attachOptions : flowOptions).map((id) => <option key={id} value={id}>{BUILDER_BLOCKS.find((b) => b.id === id)!.label}</option>)}
            </select>
          )}
          <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
            {mode === "attach"
              ? "Posisi dan lebar dihitung dari kotak blok, jadi ornamen ikut bergeser bersama blok dan mengikuti panjang isi klien. Judul dan nama berlabel tidak bisa ditempeli: teksnya akan terbaca sebagai label klien."
              : mode === "flow"
                ? "Ornamen menjadi bagian alur halaman tepat di atas blok yang dipilih (pemisah, hiasan antar judul) dan menambah tinggi halaman. Berlaku juga untuk judul dan nama. Tidak ikut tersembunyi bila blok disembunyikan."
                : "Bebas di seksi: posisi dalam persen seksi. Pilih Menempel agar ikut bergeser bersama blok, atau Sebaris agar menjadi bagian alur halaman."}
          </p>
        </div>

        <label className="block">
          <span className="text-[11.5px] font-semibold text-stone-600">Seksi</span>
          <select
            value={o.section}
            disabled={mode !== "free"}
            onChange={(e) => set({ section: e.target.value as OrnamentSection })}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
          >
            {ORNAMENT_SECTIONS.map((s) => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
          </select>
        </label>

        {mode !== "flow" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => set({ x: 50 })} className="rounded-xl border border-stone-200 px-2 py-2 text-[11.5px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer">Tengahkan mendatar</button>
              <button type="button" onClick={() => set({ y: 50 })} className="rounded-xl border border-stone-200 px-2 py-2 text-[11.5px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer">Tengahkan tegak</button>
            </div>
            <Slider label="Posisi mendatar" value={o.x} min={limits.x[0]} max={limits.x[1]} suffix="%" onChange={(x, f) => onChange({ x }, f)} />
            <Slider label={o.anchor === "bottom" ? "Jarak dari bawah" : "Jarak dari atas"} value={o.y} min={limits.y[0]} max={limits.y[1]} suffix="%" onChange={(y, f) => onChange({ y }, f)} />
          </>
        )}
        <Slider label={o.text ? "Lebar kotak teks" : "Lebar"} value={o.width} min={3} max={mode === "flow" ? 100 : 140} suffix={mode === "flow" ? "% kolom" : `% ${container}`} onChange={(width, f) => onChange({ width }, f)} />
        {mode === "flow" && <Slider label="Jarak atas dan bawah" value={o.gap ?? DEFAULT_ORNAMENT_GAP} min={ORNAMENT_GAP_LIMITS[0]} max={ORNAMENT_GAP_LIMITS[1]} step={1} suffix=" px" resetTo={DEFAULT_ORNAMENT_GAP} onChange={(gap, f) => onChange({ gap }, f)} />}
        <Slider label="Putaran" value={o.rotate} min={-180} max={180} step={1} suffix="°" resetTo={0} onChange={(rotate, f) => onChange({ rotate }, f)} />
        <Slider label="Kepekatan" value={Math.round(o.opacity * 100)} min={5} max={100} step={1} suffix="%" resetTo={100} onChange={(v, f) => onChange({ opacity: v / 100 }, f)} />

        {mode !== "flow" && (
          <>
            <Toggle
              label="Jarak diukur dari"
              value={o.anchor}
              options={[{ id: "top", label: `Atas ${container}` }, { id: "bottom", label: `Bawah ${container}` }]}
              hint={o.attach ? undefined : "Pilih 'Bawah seksi' untuk ornamen di dasar sampul atau penutup agar tetap menempel di bawah pada HP yang lebih tinggi atau pendek."}
              onChange={(anchor) => {
                if (anchor === o.anchor) return;
                set({ anchor, y: Math.round((100 - o.y) * 10) / 10 });
              }}
            />
            <Toggle
              label="Lapisan"
              value={o.layer}
              options={[{ id: "back", label: "Di belakang teks" }, { id: "front", label: "Di depan teks" }]}
              onChange={(layer) => set({ layer })}
            />
          </>
        )}
        <div>
          <span className="flex items-center justify-between text-[11.5px] font-semibold text-stone-600">
            Urutan tumpukan
            <span className="font-mono text-[11px] font-medium text-stone-500">{stack.index + 1} / {stack.count}</span>
          </span>
          <div className="mt-1 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1">
            {([
              { move: "back", label: "Paling belakang", disabled: stack.index === 0 },
              { move: "backward", label: "Turunkan", disabled: stack.index === 0 },
              { move: "forward", label: "Naikkan", disabled: stack.index >= stack.count - 1 },
              { move: "front", label: "Paling depan", disabled: stack.index >= stack.count - 1 },
            ] as const).map((b) => (
              <button
                key={b.move}
                type="button"
                disabled={b.disabled}
                onClick={() => onReorder(b.move)}
                title={b.label}
                className="rounded-lg px-1 py-1.5 text-[10.5px] font-semibold leading-tight text-stone-600 transition hover:bg-white hover:text-stone-900 disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer"
              >
                {b.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10.5px] leading-snug text-stone-500">Berlaku di antara ornamen pada {container} dan lapisan yang sama. Pintasan: ] naik, [ turun, Shift+] atau Shift+[ ke ujung.</p>
        </div>

        {!o.text && (
          <button type="button" onClick={() => set({ flipX: !o.flipX })} className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2 text-[12px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer">
            Cerminkan kiri-kanan
            <span className={`h-1.5 w-1.5 rounded-full ${o.flipX ? "bg-amber-500" : "bg-stone-300"}`} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-stone-200 p-4">
        <button type="button" onClick={onDuplicate} className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer">Duplikat</button>
        <button type="button" onClick={onRemove} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer">Hapus</button>
        <p className="col-span-2 text-center text-[10.5px] text-stone-400">Panah: geser · Shift+panah: geser jauh · Del: hapus</p>
      </div>
    </div>
  );
}
