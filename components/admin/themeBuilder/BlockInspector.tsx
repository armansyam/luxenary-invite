"use client";

import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/admin/themeBuilder/OrnamentInspector";
import type { AssetLibrary } from "@/components/admin/themeBuilder/BuilderPanels";
import {
  BLOCK_COLOR_TOKENS,
  BLOCK_FONT_ROLES,
  BLOCK_FONT_WEIGHTS,
  BLOCK_LIMITS,
  BLOCK_TEXT_TRANSFORMS,
  BUILDER_BLOCKS,
  DEFAULT_PHOTO_FRAME,
  EDITORIAL_PHOTO_FILTERS,
  FONT_OPTIONS,
  FRAMED_PHOTOS,
  FRAME_SHAPES,
  FRAME_SPREAD_LIMITS,
  LOOP_ANIMATIONS,
  OPTIONAL_BLOCKS,
  blockLabelFor,
  fontLabel,
  googleFontIds,
  isDefaultBlock,
  peerBlocksForRole,
  photoBlockMediaInfo,
  sectionLabelFor,
  type BlockColorToken,
  type BlockFontRole,
  type BlockFontValue,
  type BlockFontWeight,
  type BlockProps,
  type BlockTextTransform,
  type BuilderBlockId,
  type BuilderEventType,
  type BuilderFonts,
  type BuilderVariants,
  type EditorialPhotoFilter,
  type FrameFit,
  type FramedPhotoId,
  type LoopAnimation,
  type PhotoFrame,
} from "@/lib/themeBuilder/spec";

interface Props {
  blockId: BuilderBlockId;
  eventType: BuilderEventType;
  props: BlockProps;
  onChange: (patch: Partial<BlockProps>, final: boolean) => void;
  onReset: () => void;
  onClose: () => void;
  onCenter: () => void;
  /** Ada hanya untuk blok foto: bentuk dan ornamen bingkai yang menempel pada foto. */
  frame: PhotoFrame | null;
  onFrameChange: (patch: Partial<PhotoFrame>, final: boolean) => void;
  library: AssetLibrary | null;
  onUpload: (files: FileList) => void;
  fonts?: BuilderFonts;
  variants?: BuilderVariants;
  onVariantChange?: (patch: Partial<BuilderVariants>) => void;
  copiedStyle?: Partial<BlockProps> | null;
  onCopyStyle?: () => void;
  onPasteStyle?: () => void;
  onApplyToRoleGroup?: (peers: BuilderBlockId[], label: string) => void;
  /** Ada saat menata blok sampul di pratinjau desktop: posisinya tersimpan khusus tampilan sampul ini. */
  desktopCoverView?: "full" | "split";
}

interface LibraryFrame {
  src: string;
  group: string;
  fit: FrameFit;
}

/** Hanya gambar berjendela transparan yang masuk daftar; server memindai seluruh pustaka (bawaan dan unggahan). */
function FramePicker({ value, library, onPick }: { value: string; library: AssetLibrary | null; onPick: (src: string, fit: FrameFit) => void }) {
  const [frames, setFrames] = useState<LibraryFrame[] | null>(null);
  const [error, setError] = useState("");
  const [group, setGroup] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/theme-builder/frame-window")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Daftar bingkai tidak dapat dimuat.");
        if (!cancelled) { setFrames(data.frames); setError(""); }
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Daftar bingkai tidak dapat dimuat."); });
    return () => { cancelled = true; };
  }, [library]);

  if (error) return <p className="text-[11px] text-red-600">{error}</p>;
  if (!frames) return <p className="text-[11px] text-stone-500">Memindai pustaka untuk bingkai berjendela…</p>;

  const groups = [...new Set(frames.map((f) => f.group))];
  const shown = group ? frames.filter((f) => f.group === group) : frames;
  return (
    <div className="space-y-2">
      {groups.length > 1 && (
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-amber-500 cursor-pointer">
          <option value="">Semua bingkai ({frames.length})</option>
          {groups.map((g) => <option key={g} value={g}>{g} ({frames.filter((f) => f.group === g).length})</option>)}
        </select>
      )}
      {shown.length ? (
        <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto rounded-xl border border-stone-100 p-1.5">
          {shown.map((f) => (
            <button
              key={f.src}
              type="button"
              onClick={() => onPick(f.src, f.fit)}
              aria-label="Pakai sebagai bingkai"
              title="Foto dipasang pas di jendela bingkai ini"
              className={`flex aspect-square items-center justify-center rounded-lg border bg-stone-50 p-1 transition cursor-pointer ${value === f.src ? "border-amber-500 ring-1 ring-amber-500" : "border-stone-200 hover:border-amber-400"}`}
            >
              <img src={f.src} alt="" loading="lazy" className="max-h-full max-w-full object-contain" draggable={false} />
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-300 p-3 text-center text-[11px] text-stone-500">Belum ada bingkai. Unggah PNG/WebP dengan bagian tengah dibolongkan (transparan).</p>
      )}
      <p className="text-[10.5px] leading-snug text-stone-500">Hanya gambar dengan jendela transparan di tengah yang tampil di sini; ornamen lain ada di tab Ornamen.</p>
    </div>
  );
}

export default function BlockInspector({
  desktopCoverView,
  blockId,
  eventType,
  props,
  onChange,
  onReset,
  onClose,
  onCenter,
  frame,
  onFrameChange,
  library,
  onUpload,
  fonts,
  variants,
  onVariantChange,
  copiedStyle,
  onCopyStyle,
  onPasteStyle,
  onApplyToRoleGroup,
}: Props) {
  const block = BUILDER_BLOCKS.find((b) => b.id === blockId)!;
  const uploadRef = useRef<HTMLInputElement>(null);
  const z = props.z ?? 0;
  const mediaInfo = (FRAMED_PHOTOS as readonly string[]).includes(blockId)
    ? photoBlockMediaInfo(blockId as FramedPhotoId, eventType)
    : null;
  const roleGroup = peerBlocksForRole(blockId, eventType);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-stone-200 px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Elemen terpilih</p>
          <p className="mt-0.5 text-[13px] font-semibold text-stone-900">{blockLabelFor(blockId, eventType)}</p>
          <p className="text-[11px] text-stone-500">Seksi {sectionLabelFor(block.section, eventType)}</p>
          {desktopCoverView && (
            <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-800">
              Posisi, ukuran, putaran, perataan, dan lebar khusus desktop sampul {desktopCoverView === "full" ? "layar penuh" : "split"}. Tampilan mobile tidak berubah.
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} title="Batal pilih (Esc)" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 cursor-pointer">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {mediaInfo && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-[11px] text-blue-900">
            <p className="font-bold uppercase tracking-wider text-[10px] text-blue-700">Slot Foto Klien</p>
            <p className="mt-0.5 font-semibold text-[12px]">{mediaInfo.slotLabel}</p>
            <p className="mt-1 font-mono text-[10px] text-blue-800">Token: {mediaInfo.token}</p>
          </div>
        )}

        {blockId === "opening-photo" && variants && onVariantChange && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <span className="text-[11.5px] font-semibold text-stone-700">Tampilan Foto Pembuka (Home)</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { id: "classic", label: "Bingkai Normal" },
                { id: "arch", label: "Lengkung" },
                { id: "circle", label: "Bulat" },
                { id: "backdrop", label: "Latar 100vh" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVariantChange({ opening: opt.id })}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                    (variants.opening ?? "classic") === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
              Latar 100vh menjadikan foto pembuka memenuhi layar penuh seksi pembuka.
            </p>
          </div>
        )}

        {(blockId === "couple-photo-1" || blockId === "couple-photo-2") && variants && onVariantChange && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <span className="text-[11.5px] font-semibold text-stone-700">
              {eventType === "WEDDING" ? "Tata Letak Foto Mempelai" : "Tata Letak Foto Profil"}
            </span>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { id: "stacked", label: "Bertumpuk" },
                ...(eventType === "WEDDING" ? [{ id: "side", label: "2 Kolom" }] : []),
                { id: "arch", label: "Lengkung" },
                { id: "portrait", label: "Potret" },
                { id: "polaroid", label: "Polaroid" },
                { id: "editorial", label: "Editorial" },
                { id: "backdrop", label: "Latar 100vh" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVariantChange({ couple: opt.id })}
                  className={`rounded-lg px-1.5 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    (variants.couple ?? "stacked") === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {blockId === "events-list" && variants && onVariantChange && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <span className="text-[11.5px] font-semibold text-stone-700">Model Jadwal Acara</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { id: "cards", label: "Kartu" },
                { id: "timeline", label: "Timeline" },
                { id: "minimal", label: "Minimal" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVariantChange({ events: opt.id })}
                  className={`rounded-lg px-1.5 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    (variants.events ?? "cards") === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
              Menampilkan jadwal acara sebagai kartu mandiri, alur garis waktu vertikal, atau baris tipografi minimalis.
            </p>
          </div>
        )}

        {blockId === "story-list" && variants && onVariantChange && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <span className="text-[11.5px] font-semibold text-stone-700">Model Kisah Cinta</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { id: "timeline", label: "Timeline" },
                { id: "cards", label: "Kartu" },
                { id: "minimal", label: "Minimal" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVariantChange({ story: opt.id })}
                  className={`rounded-lg px-1.5 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    (variants.story ?? "timeline") === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
              Menampilkan alur kisah cinta sebagai garis waktu vertikal, kartu bertumpuk, atau baris minimal.
            </p>
          </div>
        )}

        {blockId === "cover-guest" && variants && onVariantChange && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <span className="text-[11.5px] font-semibold text-stone-700">Wadah Nama Tamu</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { id: "box", label: "Kotak" },
                { id: "pill", label: "Kapsul" },
                { id: "underline", label: "Garis" },
                { id: "hidden", label: "Sembunyi" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVariantChange({ guestCard: opt.id })}
                  className={`rounded-lg px-1 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    (variants.guestCard ?? "box") === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
              Bentuk kartu sapaan tamu di layar sampul pembuka.
            </p>
          </div>
        )}

        {blockId === "cover-date" && variants && onVariantChange && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <span className="text-[11.5px] font-semibold text-stone-700">Format Tanggal Sampul</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { id: "inline", label: "Sebaris" },
                { id: "split", label: "Editorial" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVariantChange({ coverDate: opt.id })}
                  className={`rounded-lg px-1.5 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    (variants.coverDate ?? "inline") === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(blockId === "cover-open-btn" || blockId === "countdown-btn") && variants && onVariantChange && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <span className="text-[11.5px] font-semibold text-stone-700">Gaya Tombol Undangan</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { id: "solid", label: "Penuh" },
                { id: "outline", label: "Garis" },
                { id: "glass", label: "Kaca" },
                { id: "minimal", label: "Teks" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVariantChange({ buttons: opt.id })}
                  className={`rounded-lg px-1 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    (variants.buttons ?? "solid") === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
              Mengatur tampilan seluruh tombol aksi utama di tema (sampul, kalender, RSVP, peta, dan salin rekening).
            </p>
          </div>
        )}

        {(blockId === "opening-quote" || blockId === "rsvp-form") && variants && onVariantChange && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <span className="text-[11.5px] font-semibold text-stone-700">Permukaan Kartu &amp; Kotak</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { id: "solid", label: "Kertas" },
                { id: "glass", label: "Kaca" },
                { id: "outlined", label: "Bingkai" },
                { id: "flat", label: "Tanpa Kotak" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVariantChange({ cards: opt.id })}
                  className={`rounded-lg px-1 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    (variants.cards ?? "solid") === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
              Mengatur permukaan kartu kutipan, formulir RSVP, kartu ucapan, lokasi, dan rekening hadiah.
            </p>
          </div>
        )}

        {(onCopyStyle || onPasteStyle || (roleGroup && onApplyToRoleGroup)) && (
          <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50/70 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-stone-500">Salin &amp; Samakan Gaya</span>
              {copiedStyle && <span className="text-[10px] font-medium text-amber-700">Siap ditempel</span>}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {onCopyStyle && (
                <button
                  type="button"
                  onClick={onCopyStyle}
                  className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition hover:bg-stone-100 cursor-pointer"
                >
                  Salin Gaya Blok
                </button>
              )}
              {onPasteStyle && (
                <button
                  type="button"
                  disabled={!copiedStyle}
                  onClick={onPasteStyle}
                  className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                >
                  Tempel Gaya
                </button>
              )}
            </div>
            {roleGroup && onApplyToRoleGroup && (
              <button
                type="button"
                onClick={() => onApplyToRoleGroup(roleGroup.peers, roleGroup.label)}
                className="w-full rounded-lg border border-amber-300 bg-amber-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 cursor-pointer"
              >
                Samakan ke {roleGroup.label} ({roleGroup.peers.length} blok)
              </button>
            )}
          </div>
        )}

        {!OPTIONAL_BLOCKS.includes(blockId) && (
          <p className="rounded-xl bg-stone-50 p-2.5 text-[11px] leading-snug text-stone-500">Elemen ini wajib tampil di undangan, jadi tidak bisa disembunyikan. Posisi dan ukurannya tetap bisa diatur.</p>
        )}
        {OPTIONAL_BLOCKS.includes(blockId) && (
          <button
            type="button"
            onClick={() => onChange({ hidden: !props.hidden }, true)}
            aria-pressed={!props.hidden}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2 text-[12px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Tampilkan di undangan
            <span className={`h-1.5 w-1.5 rounded-full ${props.hidden ? "bg-stone-300" : "bg-amber-500"}`} />
          </button>
        )}
        <button
          type="button"
          onClick={onCenter}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 py-2 text-[12px] font-semibold text-stone-700 transition hover:bg-stone-50 cursor-pointer"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" d="M12 3v18M7 8l-3 4 3 4M17 8l3 4-3 4" /></svg>
          Tengahkan di seksi
        </button>
        <Slider label="Geser mendatar" value={props.x} min={BLOCK_LIMITS.x[0]} max={BLOCK_LIMITS.x[1]} step={0.5} suffix="%" numeric resetTo={0} onChange={(x, final) => onChange({ x }, final)} />
        <Slider label="Geser tegak" value={props.y} min={BLOCK_LIMITS.y[0]} max={BLOCK_LIMITS.y[1]} step={0.5} suffix="%" numeric resetTo={0} onChange={(y, final) => onChange({ y }, final)} />
        <Slider label="Ukuran" value={props.scale} min={BLOCK_LIMITS.scale[0]} max={BLOCK_LIMITS.scale[1]} step={0.05} suffix="x" resetTo={1} onChange={(scale, final) => onChange({ scale }, final)} />
        <Slider label="Putar" value={props.rotate} min={-45} max={45} step={1} suffix="°" resetTo={0} onChange={(rotate, final) => onChange({ rotate }, final)} />

        <Slider
          label="Opasitas"
          value={props.opacity !== undefined ? Math.round(props.opacity * 100) : 100}
          min={10}
          max={100}
          step={5}
          suffix="%"
          resetTo={100}
          onChange={(val, final) => onChange({ opacity: val >= 100 ? undefined : Math.round(val) / 100 }, final)}
        />

        <div>
          <span className="text-[11.5px] font-semibold text-stone-600">Perataan Teks</span>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
            {([
              { id: "left", label: "Kiri" },
              { id: "center", label: "Tengah" },
              { id: "right", label: "Kanan" },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ align: props.align === opt.id ? undefined : opt.id }, true)}
                className={`rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                  props.align === opt.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Jarak huruf (Tracking)"
          value={props.tracking ?? 0}
          min={0}
          max={12}
          step={0.5}
          suffix="px"
          resetTo={0}
          onChange={(val, final) => onChange({ tracking: val <= 0 ? undefined : val }, final)}
        />

        <Slider
          label="Tinggi baris (Line-Height)"
          value={props.lineHeight ?? 0}
          min={0.85}
          max={2.2}
          step={0.05}
          suffix="x"
          resetTo={0}
          onChange={(val, final) => onChange({ lineHeight: val < 0.85 ? undefined : val }, final)}
        />

        <Slider
          label="Lebar maksimal"
          value={props.maxWidth ?? 0}
          min={180}
          max={600}
          step={10}
          suffix="px"
          numeric
          resetTo={0}
          onChange={(val, final) => onChange({ maxWidth: val < 180 ? undefined : val }, final)}
        />

        {!(FRAMED_PHOTOS as readonly string[]).includes(blockId) && (
          <div className="space-y-2.5 rounded-xl border border-stone-200 bg-stone-50/50 p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-stone-500">Tipografi Blok</p>

            <div>
              <span className="text-[11.5px] font-semibold text-stone-600">Peran / Keluarga Huruf</span>
              <div className="mt-1 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1">
                <button
                  type="button"
                  onClick={() => onChange({ font: undefined }, true)}
                  className={`rounded-lg px-1 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    !props.font ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  Bawaan
                </button>
                {BLOCK_FONT_ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onChange({ font: props.font === r.id ? undefined : (r.id as BlockFontRole) }, true)}
                    className={`rounded-lg px-1 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                      props.font === r.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {r.id === "script" ? "Script" : r.label}
                  </button>
                ))}
              </div>
              <select
                value={props.font && !BLOCK_FONT_ROLES.some((r) => r.id === props.font) ? props.font : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ font: val === "" ? undefined : (val as BlockFontValue) }, true);
                }}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-stone-700 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Font katalog khusus blok (opsional)…</option>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.kind})
                  </option>
                ))}
                {googleFontIds(
                  fonts ?? { heading: "playfair", body: "plus-jakarta", script: "great-vibes" },
                  props.font ? { [blockId]: props } : undefined
                ).map((gid) => (
                  <option key={gid} value={gid}>
                    {fontLabel(gid)} (Google)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[11.5px] font-semibold text-stone-600">Gaya Kapital (Transform)</span>
              <div className="mt-1 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1">
                {BLOCK_TEXT_TRANSFORMS.map((t) => {
                  const active = (props.transform ?? "none") === t.id;
                  const shortLabel = t.id === "uppercase" ? "AA" : t.id === "capitalize" ? "Aa" : t.id === "lowercase" ? "aa" : "Normal";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={t.label}
                      onClick={() => onChange({ transform: t.id === "none" ? undefined : (t.id as BlockTextTransform) }, true)}
                      className={`rounded-lg px-1 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                        active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[11.5px] font-semibold text-stone-600">Ketebalan &amp; Miring</span>
              <div className="mt-1 grid grid-cols-5 gap-1 rounded-xl bg-stone-100 p-1">
                {BLOCK_FONT_WEIGHTS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onChange({ weight: props.weight === w ? undefined : (w as BlockFontWeight) }, true)}
                    className={`rounded-lg px-1 py-1.5 text-[10.5px] font-semibold transition cursor-pointer ${
                      props.weight === w ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {w}
                  </button>
                ))}
                <button
                  type="button"
                  title="Cetak miring (Italic)"
                  onClick={() => onChange({ italic: props.italic ? undefined : true }, true)}
                  className={`rounded-lg px-1 py-1.5 text-[11px] italic font-serif font-semibold transition cursor-pointer ${
                    props.italic ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  I
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11.5px] font-semibold text-stone-600">Warna Teks (Token Palet)</span>
              <select
                value={props.color ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ color: val === "" ? undefined : (val as BlockColorToken) }, true);
                }}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Bawaan seksi</option>
                {BLOCK_COLOR_TOKENS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {(FRAMED_PHOTOS as readonly string[]).includes(blockId) && (
          <div>
            <span className="text-[11.5px] font-semibold text-stone-600">Filter Foto Editorial</span>
            <select
              value={props.filter ?? "none"}
              onChange={(e) => {
                const val = e.target.value as EditorialPhotoFilter;
                onChange({ filter: val === "none" ? undefined : val }, true);
              }}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 outline-none focus:border-amber-500 cursor-pointer"
            >
              {EDITORIAL_PHOTO_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
              Gaya filter visual khusus foto (warna bingkai dan teks tetap terjaga).
            </p>
          </div>
        )}

        <div>
          <span className="text-[11.5px] font-semibold text-stone-600">Animasi Putar (Loop)</span>
          <select
            value={props.loop ?? "none"}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ loop: val === "none" ? undefined : (val as LoopAnimation) }, true);
            }}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 outline-none focus:border-amber-500 cursor-pointer"
          >
            {LOOP_ANIMATIONS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
            Animasi halus yang berjalan terus-menerus pada blok ini.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-stone-600">Lapisan</span>
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-stone-500">{z === 0 ? "bawaan" : z > 0 ? `+${z}` : z}</span>
              {z !== 0 && (
                <button
                  type="button"
                  title="Kembalikan lapisan ke bawaan"
                  aria-label="Kembalikan lapisan ke bawaan"
                  onClick={() => onChange({ z: 0 }, true)}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-800 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M4.6 14a8 8 0 101.9-8.3L4 10" /></svg>
                </button>
              )}
            </span>
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1">
            {([
              { label: "Paling belakang", short: "Belakang", next: BLOCK_LIMITS.z[0] },
              { label: "Mundur satu lapis", short: "Mundur", next: Math.max(z - 1, BLOCK_LIMITS.z[0]) },
              { label: "Maju satu lapis", short: "Maju", next: Math.min(z + 1, BLOCK_LIMITS.z[1]) },
              { label: "Paling depan", short: "Depan", next: BLOCK_LIMITS.z[1] },
            ] as const).map((b) => (
              <button
                key={b.short}
                type="button"
                title={b.label}
                aria-label={b.label}
                disabled={b.next === z}
                onClick={() => onChange({ z: b.next }, true)}
                className="rounded-lg px-1 py-1.5 text-[11px] font-semibold text-stone-600 transition hover:bg-white hover:text-stone-900 disabled:opacity-40 cursor-pointer"
              >
                {b.short}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10.5px] leading-snug text-stone-500">
            Urutan tumpuk terhadap elemen lain di seksi ini, mis. agar nama tidak tertutup foto saat digeser saling menimpa.
            Untuk di atas atau di bawah gambar ornamen, atur lapisan pada ornamennya (tab Ornamen).
          </p>
        </div>

        {frame && (
          <div className="space-y-3 border-t border-stone-200 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Bingkai foto</p>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold text-stone-600">Ornamen bingkai</span>
                {frame.ornament && (
                  <button type="button" onClick={() => onFrameChange({ ornament: "", fit: null }, true)} className="text-[11px] font-semibold text-red-700 hover:underline cursor-pointer">Lepas bingkai</button>
                )}
              </div>
              <div className="mt-1">
                <FramePicker value={frame.ornament} library={library} onPick={(ornament, fit) => onFrameChange({ ornament, fit }, true)} />
              </div>
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="mt-2 w-full rounded-xl border border-dashed border-stone-300 py-2 text-[11.5px] font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 cursor-pointer"
              >
                Unggah bingkai sendiri (PNG / WebP berjendela transparan)
              </button>
              <input ref={uploadRef} type="file" accept="image/png,image/webp" multiple hidden onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }} />
            </div>
            {frame.ornament && frame.fit && (
              <p className="rounded-xl bg-emerald-50 p-2.5 text-[11px] leading-snug text-emerald-800">
                Foto dipasang pas di jendela bingkai ini. Bentuk, proporsi, dan potongan foto mengikuti bingkai, jadi tidak ada pilihan bentuk lagi.
              </p>
            )}
            {frame.ornament && !frame.fit && (
              <p className="rounded-xl bg-amber-50 p-2.5 text-[11px] leading-snug text-amber-800">
                Gambar ini tidak punya jendela transparan di tengahnya, jadi ia menutupi foto. Pilih bingkai bertitik hijau, atau pakai PNG/WebP dengan bagian tengah dibolongkan (transparan).
              </p>
            )}
            {!frame.fit && (
              <div>
                <span className="text-[11.5px] font-semibold text-stone-600">Potongan foto (tanpa bingkai berjendela)</span>
                <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
                  {FRAME_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onFrameChange({ shape: s.id }, true)}
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-semibold transition cursor-pointer ${frame.shape === s.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10.5px] leading-snug text-stone-500">Hanya memotong foto menjadi bentuk sederhana. Untuk bentuk kustom, pakai bingkai berjendela di atas.</p>
              </div>
            )}
            {!frame.fit && (
              <button
                type="button"
                onClick={() => onFrameChange({ hideRing: !frame.hideRing }, true)}
                aria-pressed={frame.hideRing}
                className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2 text-[12px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Sembunyikan cincin bawaan tema
                <span className={`h-1.5 w-1.5 rounded-full ${frame.hideRing ? "bg-amber-500" : "bg-stone-300"}`} />
              </button>
            )}
            {frame.ornament && !frame.fit && (
              <Slider label="Jarak bingkai dari foto" value={frame.spread} min={FRAME_SPREAD_LIMITS[0]} max={FRAME_SPREAD_LIMITS[1]} step={1} suffix="%" resetTo={DEFAULT_PHOTO_FRAME.spread} onChange={(spread, final) => onFrameChange({ spread }, final)} />
            )}
            <p className="text-[10.5px] leading-snug text-stone-500">Bingkai menempel pada foto: ikut bergeser, membesar, dan berputar bersamanya.</p>
          </div>
        )}

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
