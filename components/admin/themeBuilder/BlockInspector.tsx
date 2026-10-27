"use client";

import { Slider } from "@/components/admin/themeBuilder/OrnamentInspector";
import { BLOCK_LIMITS, BUILDER_BLOCKS, SECTION_LABELS, isDefaultBlock, type BlockProps, type BuilderBlockId } from "@/lib/themeBuilder/spec";

interface Props {
  blockId: BuilderBlockId;
  props: BlockProps;
  onChange: (patch: Partial<BlockProps>, final: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function BlockInspector({ blockId, props, onChange, onReset, onClose }: Props) {
  const block = BUILDER_BLOCKS.find((b) => b.id === blockId)!;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-stone-200 px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Elemen terpilih</p>
          <p className="mt-0.5 text-[13px] font-semibold text-stone-900">{block.label}</p>
          <p className="text-[11px] text-stone-500">Seksi {SECTION_LABELS[block.section]}</p>
        </div>
        <button type="button" onClick={onClose} title="Batal pilih (Esc)" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 cursor-pointer">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Slider label="Geser mendatar" value={props.x} min={BLOCK_LIMITS.x[0]} max={BLOCK_LIMITS.x[1]} step={0.5} suffix="%" onChange={(x, final) => onChange({ x }, final)} />
        <Slider label="Geser tegak" value={props.y} min={BLOCK_LIMITS.y[0]} max={BLOCK_LIMITS.y[1]} step={0.5} suffix="%" onChange={(y, final) => onChange({ y }, final)} />
        <Slider label="Ukuran" value={props.scale} min={BLOCK_LIMITS.scale[0]} max={BLOCK_LIMITS.scale[1]} step={0.05} suffix="x" onChange={(scale, final) => onChange({ scale }, final)} />
        <Slider label="Putar" value={props.rotate} min={-45} max={45} step={1} suffix="°" onChange={(rotate, final) => onChange({ rotate }, final)} />

        <p className="rounded-xl bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-500">
          Geser dihitung dari persen ukuran elemen itu sendiri, bukan koordinat layar. Elemen tetap mengalir bersama isi klien
          dan mengikuti lebar layar, jadi nama yang lebih panjang tidak membuatnya keluar dari posisi relatifnya.
        </p>

        <button
          type="button"
          onClick={onReset}
          disabled={isDefaultBlock(props)}
          className="w-full rounded-xl border border-stone-200 py-2 text-[12px] font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
        >
          Atur ulang ke bawaan
        </button>
      </div>
    </div>
  );
}
