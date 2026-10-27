"use client";

import { ORNAMENT_SECTIONS, SECTION_LABELS, type BuilderOrnament, type OrnamentSection } from "@/lib/themeBuilder/spec";

interface Props {
  ornament: BuilderOrnament;
  onChange: (patch: Partial<BuilderOrnament>, final: boolean) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClose: () => void;
}

function Slider({ label, value, min, max, step = 0.5, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number, final: boolean) => void }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11.5px] font-semibold text-stone-600">
        {label}
        <span className="font-mono text-[11px] font-medium text-stone-500">{Math.round(value * 10) / 10}{suffix}</span>
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

export default function OrnamentInspector({ ornament: o, onChange, onDuplicate, onRemove, onClose }: Props) {
  const set = (patch: Partial<BuilderOrnament>) => onChange(patch, true);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 p-1">
            <img src={o.src} alt="" className="max-h-full max-w-full object-contain" />
          </span>
          <div>
            <p className="text-[12.5px] font-bold text-stone-800">Ornamen</p>
            <p className="text-[11px] text-stone-500">{SECTION_LABELS[o.section]}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer" aria-label="Tutup inspektor">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <label className="block">
          <span className="text-[11.5px] font-semibold text-stone-600">Seksi</span>
          <select
            value={o.section}
            onChange={(e) => set({ section: e.target.value as OrnamentSection })}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-amber-500 cursor-pointer"
          >
            {ORNAMENT_SECTIONS.map((s) => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
          </select>
        </label>

        <Slider label="Posisi mendatar" value={o.x} min={-20} max={120} suffix="%" onChange={(x, f) => onChange({ x }, f)} />
        <Slider label={o.anchor === "bottom" ? "Jarak dari bawah" : "Jarak dari atas"} value={o.y} min={-20} max={120} suffix="%" onChange={(y, f) => onChange({ y }, f)} />
        <Slider label="Lebar" value={o.width} min={3} max={140} suffix="% seksi" onChange={(width, f) => onChange({ width }, f)} />
        <Slider label="Putaran" value={o.rotate} min={-180} max={180} step={1} suffix="°" onChange={(rotate, f) => onChange({ rotate }, f)} />
        <Slider label="Kepekatan" value={Math.round(o.opacity * 100)} min={5} max={100} step={1} suffix="%" onChange={(v, f) => onChange({ opacity: v / 100 }, f)} />

        <Toggle
          label="Menempel ke"
          value={o.anchor}
          options={[{ id: "top", label: "Atas seksi" }, { id: "bottom", label: "Bawah seksi" }]}
          hint="Pilih 'Bawah seksi' untuk ornamen di dasar sampul atau penutup agar tetap menempel di bawah pada HP yang lebih tinggi atau pendek."
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

        <button type="button" onClick={() => set({ flipX: !o.flipX })} className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2 text-[12px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer">
          Cerminkan kiri-kanan
          <span className={`h-1.5 w-1.5 rounded-full ${o.flipX ? "bg-amber-500" : "bg-stone-300"}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-stone-200 p-4">
        <button type="button" onClick={onDuplicate} className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer">Duplikat</button>
        <button type="button" onClick={onRemove} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer">Hapus</button>
        <p className="col-span-2 text-center text-[10.5px] text-stone-400">Panah: geser · Shift+panah: geser jauh · Del: hapus</p>
      </div>
    </div>
  );
}
