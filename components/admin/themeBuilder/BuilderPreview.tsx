"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  BLOCK_COLOR_TOKENS,
  BLOCK_LIMITS,
  BUILDER_BLOCKS,
  DEFAULT_BLOCK_PROPS,
  FRAMED_PHOTOS,
  OPTIONAL_BLOCKS,
  ORNAMENT_SECTIONS,
  PHOTO_FILTER_CSS,
  blockFontFamilyCss,
  blockZIndex,
  ornamentLimits,
  ornamentStyle,
  frameCss,
  loopCss,
  photoBlockMediaInfo,
  type BlockProps,
  type BuilderBlockId,
  type BuilderBlocks,
  type BuilderEventType,
  type BuilderFrames,
  type BuilderOrnament,
  type BuilderVariants,
  type OrnamentSection,
} from "@/lib/themeBuilder/spec";

export type PreviewDevice = "mobile" | "small" | "desktop";
export type OrnamentAlign = "left" | "center-x" | "right" | "top" | "center-y" | "bottom" | "full-width";

export const DEVICE_SIZES: Record<PreviewDevice, { width: number; height: number; label: string }> = {
  mobile: { width: 375, height: 760, label: "HP 375" },
  small: { width: 320, height: 640, label: "HP kecil 320" },
  desktop: { width: 1440, height: 900, label: "Desktop" },
};

/** Titik di layar admin dipetakan ke seksi pratinjau; dipakai saat ornamen diseret dari pustaka. */
export interface PreviewDropTarget {
  locate: (clientX: number, clientY: number) => { section: OrnamentSection; x: number; y: number } | null;
  setHover: (on: boolean) => void;
}

/** Pengukuran di dalam iframe yang dibutuhkan inspektor; hanya bisa dihitung dari tata letak yang sedang tampil. */
export interface PreviewActions {
  /** Nilai geser mendatar (persen lebar blok) yang menaruh tengah blok tepat di tengah seksinya. */
  centerBlockX: (id: BuilderBlockId) => number | null;
  /** Menjajarkan ornamen rapat ke tepi kiri/kanan/atas/bawah atau tengah seksinya berdasarkan ukuran nyata di layar. */
  alignOrnament: (id: string, align: OrnamentAlign) => Partial<BuilderOrnament> | null;
}

interface Props {
  dropTargetRef: RefObject<PreviewDropTarget | null>;
  actionsRef: RefObject<PreviewActions | null>;
  eventType: BuilderEventType;
  variants: BuilderVariants;
  onVariantChange: (patch: Partial<BuilderVariants>) => void;
  desktopCoverFull?: boolean;
  frames: BuilderFrames;
  /** Gaya desain dan CSS kustom yang ditulis langsung ke pratinjau, tanpa menunggu render ulang server. */
  design: { css: string; custom: string; preset: string };
  html: string | null;
  loading: boolean;
  device: PreviewDevice;
  editOrnaments: boolean;
  playAnimations: boolean;
  replayNonce: number;
  jump: { section: OrnamentSection; nonce: number };
  ornaments: BuilderOrnament[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOrnamentChange: (id: string, patch: Partial<BuilderOrnament>, final: boolean) => void;
  onDuplicateOrnament?: (id: string) => void;
  onFillFourCornersOrnament?: (id: string) => void;
  onDeleteOrnament?: (id: string) => void;
  blocks: BuilderBlocks;
  selectedBlock: BuilderBlockId | null;
  onSelectBlock: (id: BuilderBlockId | null) => void;
  onBlockChange: (id: BuilderBlockId, patch: Partial<BlockProps>, final: boolean) => void;
  onResetBlock?: (id: BuilderBlockId) => void;
  onViewSection: (section: OrnamentSection) => void;
  onKey: (e: KeyboardEvent) => boolean;
}

// Gaya alat bantu builder di dalam pratinjau; tidak ikut tersimpan ke master tema.
const BUILDER_CHROME_CSS = `
  #themePreloader, .lux-universal-preloader { display: none !important; }
  html { scroll-behavior: auto !important; }
  html.lux-b-edit, html.lux-b-edit * { user-select: none !important; -webkit-user-select: none !important; }
  html.lux-b-edit .lux-orn { pointer-events: auto !important; cursor: grab; }
  html.lux-b-edit .lux-orn:hover { outline: 1px dashed #d97706; outline-offset: 2px; }
  html.lux-b-edit .lux-orn.lux-b-sel { outline: 2px solid #d97706; outline-offset: 2px; }
  html.lux-b-edit .lux-flow { cursor: pointer; outline: 1px dashed #d97706; outline-offset: 2px; }
  html.lux-b-edit .lux-flow.lux-b-sel { outline: 2px solid #d97706; }
  html.lux-b-edit [data-lux-block] { cursor: grab; outline: 1px dashed rgba(37, 99, 235, 0.35); outline-offset: 3px; }
  html.lux-b-edit [data-lux-block]:hover { outline: 1px dashed #2563eb; }
  html.lux-b-edit [data-lux-block].lux-b-bsel { outline: 2px solid #2563eb; outline-offset: 3px; }
  html.lux-b-dragging, html.lux-b-dragging * { cursor: grabbing !important; user-select: none !important; }
  .lux-b-handle, .lux-b-rot { position: absolute; z-index: 2; pointer-events: auto; box-sizing: border-box; }
  .lux-b-handle { right: -8px; bottom: -8px; width: 16px; height: 16px; border-radius: 50%; background: #ffffff; border: 2px solid #d97706; cursor: nwse-resize; }
  .lux-b-rot { left: -8px; top: -8px; width: 16px; height: 16px; border-radius: 50%; background: #d97706; border: 2px solid #ffffff; cursor: alias; }
  [data-lux-section] > .lux-b-guide { position: absolute !important; top: 0; bottom: 0; left: 50%; width: 0; border-left: 1.5px dashed #d97706; z-index: 70 !important; pointer-events: none; }
  [data-lux-section] > .lux-b-guide-h { position: absolute !important; left: 0; right: 0; top: 50%; height: 0; border-top: 1.5px dashed #d97706; z-index: 70 !important; pointer-events: none; }
  html.lux-b-dropping [data-lux-section] { outline: 2px dashed #f59e0b; outline-offset: -6px; }
`;

const SNAP_THRESHOLD = 1.4;

type DragState =
  | { kind: "block"; id: BuilderBlockId; startX: number; startY: number; baseX: number; baseY: number; w: number; h: number; section: HTMLElement | null; naturalCenter: number; naturalCenterY: number; rw: number; rh: number }
  | { kind: "move"; id: string; section: HTMLElement; frame: BlockFrame | null; el: HTMLElement; offsetX: number; offsetY: number; moved: boolean }
  | { kind: "resize"; id: string; section: HTMLElement; frame: BlockFrame | null; el: HTMLElement }
  | { kind: "rotate"; id: string; el: HTMLElement; startAngle: number; startRotate: number };

interface Point {
  x: number;
  y: number;
}

/**
 * Kotak sebuah blok sebagaimana tampil di layar: titik pojok kiri-atas, ujung sumbu mendatar (kanan-atas), dan ujung
 * sumbu tegak (kiri-bawah), sudah termasuk geser, putar, dan skala blok serta leluhurnya. Ornamen yang menempel ke blok
 * diukur di kerangka ini, bukan di kotak pembatas yang melebar saat blok diputar.
 */
interface BlockFrame {
  origin: Point;
  ux: Point;
  uy: Point;
}

/** Mengukur kerangka blok dengan tiga penanda tanpa ukuran di pojoknya; browser sendiri yang menerapkan semua transform. */
function measureBlockFrame(doc: Document, block: HTMLElement): BlockFrame {
  const probe = (left: string, top: string): Point => {
    const p = doc.createElement("span");
    p.style.cssText = `position:absolute;left:${left};top:${top};width:0;height:0;visibility:hidden;pointer-events:none;`;
    block.appendChild(p);
    const r = p.getBoundingClientRect();
    p.remove();
    return { x: r.left, y: r.top };
  };
  const origin = probe("0", "0");
  const right = probe("100%", "0");
  const down = probe("0", "100%");
  return { origin, ux: { x: right.x - origin.x, y: right.y - origin.y }, uy: { x: down.x - origin.x, y: down.y - origin.y } };
}

/** Titik layar menjadi persen kotak blok (kiri-atas 0,0). Null bila blok tidak punya luas terukur. */
function pointInBlock(frame: BlockFrame, clientX: number, clientY: number): { x: number; y: number } | null {
  const { origin, ux, uy } = frame;
  const det = ux.x * uy.y - ux.y * uy.x;
  if (Math.abs(det) < 1e-6) return null;
  const dx = clientX - origin.x;
  const dy = clientY - origin.y;
  return { x: ((dx * uy.y - dy * uy.x) / det) * 100, y: ((ux.x * dy - ux.y * dx) / det) * 100 };
}

const pointerAngle = (el: HTMLElement, clientX: number, clientY: number) => {
  const r = el.getBoundingClientRect();
  return (Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2)) * 180) / Math.PI;
};

type GuideAxis = "x" | "y";

/** Garis pemandu magnet di dalam seksi: `x` = garis tegak pada persen lebar, `y` = garis mendatar pada persen tinggi. */
function setGuides(doc: Document, section: HTMLElement | null, guides: Array<{ axis: GuideAxis; at: number }>) {
  doc.querySelectorAll(".lux-b-guide, .lux-b-guide-h").forEach((g) => g.remove());
  if (!section) return;
  for (const { axis, at } of guides) {
    const g = doc.createElement("div");
    g.className = axis === "x" ? "lux-b-guide" : "lux-b-guide-h";
    // Garis di tepi 100% digeser setebal garis agar tidak terpotong `overflow:hidden` seksi.
    const pos = at >= 100 ? "calc(100% - 2px)" : `${at}%`;
    if (axis === "x") g.style.left = pos;
    else g.style.top = pos;
    section.appendChild(g);
  }
}

/** Menu klik kanan (atau klik dua jari di Mac) pada pratinjau, diposisikan di koordinat layar admin. */
type ContextTarget =
  | { kind: "ornament"; id: string; x: number; y: number }
  | { kind: "block"; id: BuilderBlockId; x: number; y: number };

export default function BuilderPreview(props: Props) {
  const { html, loading, device, editOrnaments, playAnimations, replayNonce, jump, ornaments, selectedId, blocks, selectedBlock, desktopCoverFull = false } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [docVersion, setDocVersion] = useState(0);
  const [menu, setMenu] = useState<ContextTarget | null>(null);

  // Nilai terbaru untuk pendengar di dalam iframe yang dipasang sekali per muat.
  const latest = useRef({ props, ornaments });
  useLayoutEffect(() => {
    latest.current = { props, ornaments };
  });
  const restore = useRef<{ scrollY: number; coverOpen: boolean }>({ scrollY: 0, coverOpen: false });
  const drag = useRef<DragState | null>(null);

  const size = DEVICE_SIZES[device];

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const pad = 48;
      const s = Math.min(1, (stage.clientWidth - pad) / size.width, (stage.clientHeight - pad) / size.height);
      setScale(Math.max(0.2, Math.round(s * 1000) / 1000));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [size.width, size.height]);

  const getDoc = () => iframeRef.current?.contentDocument ?? null;

  const navigate = useCallback((section: OrnamentSection) => {
    const doc = getDoc();
    if (!doc) return;
    const cover = doc.getElementById("coverScreen");
    const scroller = doc.scrollingElement || doc.documentElement;
    if (section === "cover") {
      if (cover) {
        cover.classList.remove("opened");
        cover.style.display = "";
      }
      scroller.scrollTop = 0;
      restore.current = { scrollY: 0, coverOpen: false };
      return;
    }
    if (cover) {
      cover.classList.add("opened");
      cover.style.display = "none";
    }
    if (section !== "sidebar") {
      const target = doc.querySelector(`[data-lux-section="${section}"]`) as HTMLElement | null;
      if (target) scroller.scrollTop = target.getBoundingClientRect().top + scroller.scrollTop;
    }
    restore.current = { scrollY: scroller.scrollTop, coverOpen: true };
  }, []);

  const syncSelection = useCallback(() => {
    const doc = getDoc();
    if (!doc) return;
    doc.querySelectorAll(".lux-b-handle, .lux-b-rot").forEach((n) => n.remove());
    doc.querySelectorAll(".lux-b-sel").forEach((n) => n.classList.remove("lux-b-sel"));
    const { selectedId: sel, editOrnaments: editing } = latest.current.props;
    if (!sel || !editing) return;
    const el = doc.querySelector(`[data-orn-id="${sel}"]`);
    if (!el) return;
    el.classList.add("lux-b-sel");
    // Ornamen sebaris berada di alur: hanya disorot, tanpa pegangan ukuran dan putar.
    if (el.classList.contains("lux-flow")) return;
    const handle = doc.createElement("div");
    handle.className = "lux-b-handle";
    handle.title = "Seret untuk mengubah ukuran";
    const rot = doc.createElement("div");
    rot.className = "lux-b-rot";
    rot.title = "Seret untuk memutar";
    el.append(handle, rot);
  }, []);

  const handleLoad = useCallback(() => {
    const doc = getDoc();
    const win = iframeRef.current?.contentWindow;
    if (!doc || !win) return;

    const style = doc.createElement("style");
    style.id = "lux-builder-chrome";
    style.textContent = BUILDER_CHROME_CSS;
    doc.head.appendChild(style);
    doc.documentElement.classList.toggle("lux-b-edit", latest.current.props.editOrnaments);
    if (!latest.current.props.playAnimations) doc.querySelectorAll("[data-lux-anim]").forEach((n) => n.classList.add("lux-in"));

    const cover = doc.getElementById("coverScreen");
    if (restore.current.coverOpen && cover) {
      cover.classList.add("opened");
      cover.style.display = "none";
    }
    (doc.scrollingElement || doc.documentElement).scrollTop = restore.current.scrollY;

    const sectionOf = (el: Element | null) => (el?.closest("[data-lux-section]") as HTMLElement | null) ?? null;
    const percent = (section: HTMLElement, clientX: number, clientY: number, anchor: "top" | "bottom") => {
      const r = section.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * 100;
      const y = anchor === "bottom" ? ((r.bottom - clientY) / r.height) * 100 : ((clientY - r.top) / r.height) * 100;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    };

    // Tengah tampilan blok tanpa pergeseran miliknya sendiri: rect sekarang dikurangi translate yang sedang berlaku.
    const naturalCenterOf = (blockEl: HTMLElement, x: number) => {
      const r = blockEl.getBoundingClientRect();
      return r.left + r.width / 2 - (x / 100) * (blockEl.offsetWidth || 1);
    };
    const sectionCenter = (section: HTMLElement) => {
      const r = section.getBoundingClientRect();
      return r.left + r.width / 2;
    };

    // Semua elemen yang bisa diedit di titik itu, dari yang paling atas. Ornamen lapisan belakang yang tertutup teks
    // tetap terjangkau: Alt+klik memilih yang berikutnya di bawahnya.
    const editableAt = (clientX: number, clientY: number): HTMLElement[] => {
      const found: HTMLElement[] = [];
      // Sampul menutup layar; elemen seksi di baliknya ikut dilaporkan elementsFromPoint tetapi tidak terlihat, jadi
      // selama sampul tampil hanya isi sampul yang bisa dipilih.
      const cover = doc.getElementById("coverScreen");
      const coverShown = Boolean(cover && cover.style.display !== "none" && !cover.classList.contains("opened"));
      for (const el of doc.elementsFromPoint(clientX, clientY) as HTMLElement[]) {
        if (coverShown && !cover!.contains(el)) continue;
        const hit = (el.closest(".lux-orn, .lux-flow") ?? el.closest("[data-lux-block]")) as HTMLElement | null;
        if (hit && !found.includes(hit)) found.push(hit);
      }
      return found;
    };

    doc.addEventListener("pointerdown", (e) => {
      if (!latest.current.props.editOrnaments) return;
      // Klik kanan / klik dua jari (Mac) hanya membuka menu konteks: tidak menyeret dan tidak membatalkan pilihan.
      if (e.button !== 0) return;
      setMenu(null);
      const target = e.target as HTMLElement;
      const onHandle = target.classList.contains("lux-b-handle") || target.classList.contains("lux-b-rot");
      const stack = onHandle ? [] : editableAt(e.clientX, e.clientY);
      const picked = onHandle ? (target.closest(".lux-orn") as HTMLElement | null) : (e.altKey && stack.length > 1 ? stack[1] : stack[0]) ?? null;
      if (picked?.classList.contains("lux-flow")) {
        e.preventDefault();
        latest.current.props.onSelect(picked.dataset.ornId ?? null);
        return;
      }
      const orn = picked?.classList.contains("lux-orn") ? picked : null;
      if (!orn) {
        const blockEl = picked;
        if (blockEl) {
          // Klik pada blok memilihnya; seret menggeser dalam persen ukuran blok itu sendiri.
          e.preventDefault();
          const id = blockEl.dataset.luxBlock as BuilderBlockId;
          const current = latest.current.props.blocks[id] ?? DEFAULT_BLOCK_PROPS;
          latest.current.props.onSelectBlock(id);
          doc.documentElement.classList.add("lux-b-dragging");
          const br = blockEl.getBoundingClientRect();
          const bh = blockEl.offsetHeight || 1;
          drag.current = {
            kind: "block", id, startX: e.clientX, startY: e.clientY, baseX: current.x, baseY: current.y,
            w: blockEl.offsetWidth || 1, h: bh, section: sectionOf(blockEl), naturalCenter: naturalCenterOf(blockEl, current.x),
            naturalCenterY: br.top + br.height / 2 - (current.y / 100) * bh, rw: br.width, rh: br.height,
          };
          return;
        }
        latest.current.props.onSelect(null);
        latest.current.props.onSelectBlock(null);
        return;
      }
      e.preventDefault();
      const id = orn.dataset.ornId!;
      const o = latest.current.ornaments.find((item) => item.id === id);
      const section = sectionOf(orn);
      if (!o || !section) return;
      latest.current.props.onSelect(id);
      doc.documentElement.classList.add("lux-b-dragging");
      // Ornamen yang menempel diukur terhadap kotak blok; kerangkanya diukur sekali karena blok tidak berubah saat ornamen diseret.
      const host = o.attach ? (orn.closest("[data-lux-block]") as HTMLElement | null) : null;
      const frame = host ? measureBlockFrame(doc, host) : null;
      if (target.classList.contains("lux-b-handle")) {
        drag.current = { kind: "resize", id, section, frame, el: orn };
      } else if (target.classList.contains("lux-b-rot")) {
        // Putaran relatif terhadap titik awal seret, sehingga ornamen tidak melompat ke arah kursor.
        drag.current = { kind: "rotate", id, el: orn, startAngle: pointerAngle(orn, e.clientX, e.clientY), startRotate: o.rotate };
      } else {
        const r = orn.getBoundingClientRect();
        drag.current = { kind: "move", id, section, frame, el: orn, offsetX: e.clientX - (r.left + r.width / 2), offsetY: e.clientY - (r.top + r.height / 2), moved: false };
      }
    }, true);

    doc.addEventListener("contextmenu", (e) => {
      if (!latest.current.props.editOrnaments) return;
      const stack = editableAt(e.clientX, e.clientY);
      const picked = stack[0];
      if (!picked) return;
      e.preventDefault();
      // Koordinat iframe dipetakan ke koordinat panggung admin (pratinjau diskalakan).
      const frameEl = iframeRef.current;
      const stage = stageRef.current;
      if (!frameEl || !stage) return;
      const fr = frameEl.getBoundingClientRect();
      const st = stage.getBoundingClientRect();
      const k = fr.width / (frameEl.offsetWidth || 1);
      // Dijepit di sini agar menu tidak keluar panggung; render tidak boleh membaca ukuran panggung lewat ref.
      const x = Math.max(10, Math.min(fr.left - st.left + e.clientX * k, stage.clientWidth - 200));
      const y = Math.max(10, Math.min(fr.top - st.top + e.clientY * k, stage.clientHeight - 260));
      if (picked.classList.contains("lux-orn") || picked.classList.contains("lux-flow")) {
        const id = picked.dataset.ornId;
        if (!id) return;
        latest.current.props.onSelect(id);
        setMenu({ kind: "ornament", id, x, y });
      } else if (picked.dataset.luxBlock) {
        const id = picked.dataset.luxBlock as BuilderBlockId;
        latest.current.props.onSelectBlock(id);
        setMenu({ kind: "block", id, x, y });
      }
    });

    doc.addEventListener("pointermove", (e) => {
      const d = drag.current;
      if (!d) return;
      if (d.kind === "block") {
        const clampTo = (v: number, [min, max]: readonly [number, number]) => Math.max(min, Math.min(max, v));
        // Menempel ke posisi bawaan (0) saat dekat, supaya blok mudah dikembalikan ke tengah alurnya.
        const snap = (v: number) => (Math.abs(v) < 1 ? 0 : v);
        let x = snap(clampTo(Math.round((d.baseX + ((e.clientX - d.startX) / d.w) * 100) * 10) / 10, BLOCK_LIMITS.x));
        let y = snap(clampTo(Math.round((d.baseY + ((e.clientY - d.startY) / d.h) * 100) * 10) / 10, BLOCK_LIMITS.y));
        // Magnet ke tepi kiri, tengah, dan kanan seksi (serta atas, tengah, bawah) bila jaraknya kurang dari 6 px.
        if (d.section) {
          const s = d.section.getBoundingClientRect();
          const guides: Array<{ axis: GuideAxis; at: number }> = [];
          const toX = (centerPx: number) => clampTo(Math.round((((centerPx - d.naturalCenter) / d.w) * 100) * 10) / 10, BLOCK_LIMITS.x);
          const toY = (centerPx: number) => clampTo(Math.round((((centerPx - d.naturalCenterY) / d.h) * 100) * 10) / 10, BLOCK_LIMITS.y);
          const xTargets: Array<[number, number]> = [[toX(s.left + d.rw / 2), 0], [toX(sectionCenter(d.section)), 50], [toX(s.right - d.rw / 2), 100]];
          const yTargets: Array<[number, number]> = [[toY(s.top + d.rh / 2), 0], [toY(s.top + s.height / 2), 50], [toY(s.bottom - d.rh / 2), 100]];
          const hitX = xTargets.find(([v]) => (Math.abs(x - v) / 100) * d.w < 6);
          if (hitX) { x = hitX[0]; guides.push({ axis: "x", at: hitX[1] }); }
          const hitY = yTargets.find(([v]) => (Math.abs(y - v) / 100) * d.h < 6);
          if (hitY) { y = hitY[0]; guides.push({ axis: "y", at: hitY[1] }); }
          setGuides(doc, d.section, guides);
        }
        latest.current.props.onBlockChange(d.id, { x, y }, false);
        return;
      }
      const o = latest.current.ornaments.find((item) => item.id === d.id);
      if (!o) return;
      if (d.kind === "move") {
        const inBlock = d.frame ? pointInBlock(d.frame, e.clientX - d.offsetX, e.clientY - d.offsetY) : null;
        if (d.frame && !inBlock) return;
        let { x, y } = inBlock ? { x: inBlock.x, y: o.anchor === "bottom" ? 100 - inBlock.y : inBlock.y } : percent(d.section, e.clientX - d.offsetX, e.clientY - d.offsetY, o.anchor);
        const limits = ornamentLimits(o);
        const guides: Array<{ axis: GuideAxis; at: number }> = [];
        if (!d.frame) {
          // Magnet tepi: ornamen rapat kiri/kanan/atas/bawah seksi, atau tepat di tengah mendatar/tegak.
          const s = d.section.getBoundingClientRect();
          const r = d.el.getBoundingClientRect();
          const halfW = ((r.width / 2) / (s.width || 1)) * 100;
          const halfH = ((r.height / 2) / (s.height || 1)) * 100;
          const tolX = (6 / (s.width || 1)) * 100;
          const tolY = (6 / (s.height || 1)) * 100;
          const xTargets: Array<[number, number]> = [[halfW, 0], [50, 50], [100 - halfW, 100]];
          // y diukur dari anchor; garis pemandu selalu dalam persen dari atas seksi.
          const yTargets: Array<[number, number]> = o.anchor === "bottom"
            ? [[100 - halfH, 0], [50, 50], [halfH, 100]]
            : [[halfH, 0], [50, 50], [100 - halfH, 100]];
          const hitX = xTargets.find(([v]) => Math.abs(x - v) < Math.max(tolX, SNAP_THRESHOLD));
          if (hitX) { x = hitX[0]; guides.push({ axis: "x", at: hitX[1] }); }
          const hitY = yTargets.find(([v]) => Math.abs(y - v) < tolY);
          if (hitY) { y = hitY[0]; guides.push({ axis: "y", at: hitY[1] }); }
        }
        x = Math.round(Math.max(limits.x[0], Math.min(limits.x[1], x)) * 10) / 10;
        y = Math.round(Math.max(limits.y[0], Math.min(limits.y[1], y)) * 10) / 10;
        if (!d.frame) setGuides(doc, d.section, guides);
        d.moved = true;
        latest.current.props.onOrnamentChange(d.id, { x, y }, false);
      } else if (d.kind === "resize") {
        let width: number;
        if (d.frame) {
          // Jarak mendatar (sepanjang sumbu blok) dari tengah ornamen ke kursor, dibandingkan lebar blok di layar.
          const blockWidth = Math.hypot(d.frame.ux.x, d.frame.ux.y);
          if (blockWidth < 1e-6) return;
          const r = d.el.getBoundingClientRect();
          const along = ((e.clientX - (r.left + r.width / 2)) * d.frame.ux.x + (e.clientY - (r.top + r.height / 2)) * d.frame.ux.y) / blockWidth;
          width = (Math.abs(along) * 2 * 100) / blockWidth;
        } else {
          const r = d.section.getBoundingClientRect();
          const centerX = r.left + (o.x / 100) * r.width;
          width = (Math.abs(e.clientX - centerX) * 2 * 100) / r.width;
        }
        latest.current.props.onOrnamentChange(d.id, { width: Math.round(Math.max(3, Math.min(140, width)) * 10) / 10 }, false);
      } else {
        const angle = d.startRotate + pointerAngle(d.el, e.clientX, e.clientY) - d.startAngle;
        let rotate = Math.round((((angle % 360) + 540) % 360) - 180);
        if (e.shiftKey) rotate = Math.round(rotate / 15) * 15;
        latest.current.props.onOrnamentChange(d.id, { rotate }, false);
      }
    });

    const endDrag = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      doc.documentElement.classList.remove("lux-b-dragging");
      if (d.kind === "block") {
        setGuides(doc, null, []);
        latest.current.props.onBlockChange(d.id, {}, true);
        return;
      }
      setGuides(doc, null, []);
      latest.current.props.onOrnamentChange(d.id, {}, true);
    };
    doc.addEventListener("pointerup", endDrag);
    doc.addEventListener("pointercancel", endDrag);

    doc.addEventListener("keydown", (e) => {
      if (latest.current.props.onKey(e)) e.preventDefault();
    });

    // Pratinjau tidak boleh berpindah halaman: tautan luar (Maps, Instagram) membawa tab keluar dari builder dan
    // menghilangkan rancangan yang belum disimpan. Tautan "#bagian" tetap berjalan agar navigasi dock bisa dicoba.
    doc.addEventListener("click", (e) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (link && !(link.getAttribute("href") ?? "").startsWith("#")) e.preventDefault();
    }, true);

    const scroller = doc.scrollingElement || doc.documentElement;
    // Pengamat dibuat dari jendela iframe agar area pandangnya adalah layar pratinjau, bukan layar admin.
    const FrameObserver = (win as unknown as typeof globalThis).IntersectionObserver;
    const observer = new FrameObserver((entries) => {
      const coverEl = doc.getElementById("coverScreen");
      const coverVisible = coverEl && coverEl.style.display !== "none" && !coverEl.classList.contains("opened");
      restore.current = { scrollY: scroller.scrollTop, coverOpen: !coverVisible };
      if (coverVisible) return;
      const visible = entries.filter((en) => en.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const id = (visible?.target as HTMLElement | undefined)?.dataset.luxSection as OrnamentSection | undefined;
      if (id) latest.current.props.onViewSection(id);
    }, { threshold: [0.25, 0.5] });
    doc.querySelectorAll("[data-lux-section]").forEach((s) => {
      const id = (s as HTMLElement).dataset.luxSection;
      if (id !== "cover" && id !== "sidebar") observer.observe(s);
    });
    win.addEventListener("scroll", () => {
      restore.current = { ...restore.current, scrollY: scroller.scrollTop };
    }, { passive: true });

    setDocVersion((v) => v + 1);
  }, []);

  const { dropTargetRef } = props;
  useEffect(() => {
    // Seret dari pustaka memakai pointer capture di panel admin, jadi titik layar admin diterjemahkan ke koordinat
    // di dalam iframe (yang diskalakan untuk pratinjau desktop) lalu ke seksi di bawahnya.
    dropTargetRef.current = {
      locate: (clientX, clientY) => {
        const frame = iframeRef.current;
        const doc = getDoc();
        if (!frame || !doc) return null;
        const r = frame.getBoundingClientRect();
        if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
        const k = r.width / frame.offsetWidth;
        const x = (clientX - r.left) / k;
        const y = (clientY - r.top) / k;
        const section = doc.elementFromPoint(x, y)?.closest("[data-lux-section]") as HTMLElement | null;
        const id = section?.dataset.luxSection as OrnamentSection | undefined;
        if (!section || !id || !(ORNAMENT_SECTIONS as readonly string[]).includes(id)) return null;
        const s = section.getBoundingClientRect();
        return { section: id, x: Math.round(((x - s.left) / s.width) * 1000) / 10, y: Math.round(((y - s.top) / s.height) * 1000) / 10 };
      },
      setHover: (on) => getDoc()?.documentElement.classList.toggle("lux-b-dropping", on),
    };
    return () => {
      dropTargetRef.current = null;
    };
  }, [dropTargetRef]);

  const { actionsRef, frames } = props;
  useEffect(() => {
    actionsRef.current = {
      centerBlockX: (id) => {
        const doc = getDoc();
        const el = doc?.querySelector(`[data-lux-block="${id}"]`) as HTMLElement | null;
        const section = el?.closest("[data-lux-section]") as HTMLElement | null;
        if (!el || !section) return null;
        const current = latest.current.props.blocks[id] ?? DEFAULT_BLOCK_PROPS;
        const w = el.offsetWidth || 1;
        const r = el.getBoundingClientRect();
        const s = section.getBoundingClientRect();
        const natural = r.left + r.width / 2 - (current.x / 100) * w;
        const x = ((s.left + s.width / 2 - natural) / w) * 100;
        return Math.max(BLOCK_LIMITS.x[0], Math.min(BLOCK_LIMITS.x[1], Math.round(x * 10) / 10));
      },
      alignOrnament: (id, align) => {
        const doc = getDoc();
        const o = latest.current.ornaments.find((item) => item.id === id);
        const el = doc?.querySelector(`[data-orn-id="${id}"]`) as HTMLElement | null;
        if (!o || !el || o.before) return null;
        // Acuan: kotak blok bagi ornamen menempel, seksi bagi ornamen bebas.
        const host = (o.attach ? el.closest("[data-lux-block]") : el.closest("[data-lux-section]")) as HTMLElement | null;
        if (!host) return null;
        const s = host.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const halfW = ((r.width / 2) / (s.width || 1)) * 100;
        const halfH = ((r.height / 2) / (s.height || 1)) * 100;
        const round = (v: number) => Math.round(v * 10) / 10;
        const bottom = o.anchor === "bottom";
        let patch: Partial<BuilderOrnament>;
        switch (align) {
          case "left": patch = { x: round(halfW) }; break;
          case "center-x": patch = { x: 50 }; break;
          case "right": patch = { x: round(100 - halfW) }; break;
          case "top": patch = { y: round(bottom ? 100 - halfH : halfH) }; break;
          case "center-y": patch = { y: 50 }; break;
          case "bottom": patch = { y: round(bottom ? halfH : 100 - halfH) }; break;
          case "full-width": patch = { x: 50, width: 100 }; break;
        }
        const limits = ornamentLimits({ ...o, ...patch });
        if (patch.x !== undefined) patch.x = Math.max(limits.x[0], Math.min(limits.x[1], patch.x));
        if (patch.y !== undefined) patch.y = Math.max(limits.y[0], Math.min(limits.y[1], patch.y));
        return patch;
      },
    };
    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef]);

  // Dipakai tombol menu klik-kanan: ref hanya dibaca saat tombol diklik, bukan selama render menu.
  const snapOrnament = (id: string, align: OrnamentAlign) => {
    const patch = actionsRef.current?.alignOrnament(id, align);
    if (patch) props.onOrnamentChange(id, patch, true);
    setMenu(null);
  };
  const centerBlock = (id: BuilderBlockId) => {
    props.onBlockChange(id, { x: actionsRef.current?.centerBlockX(id) ?? 0 }, true);
    setMenu(null);
  };

  // Tampilan sampul desktop yang sedang ditata (layar penuh atau split), terlepas dari keputusan mesin untuk data
  // pratinjau ini. Posisi blok sampul diterapkan langsung oleh efek blok, jadi di sini hanya lebar sampulnya.
  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;
    let style = doc.getElementById("lux-b-desktop-cover-live") as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = "lux-b-desktop-cover-live";
      doc.head.appendChild(style);
    }
    style.textContent = device !== "desktop"
      ? ""
      : desktopCoverFull
        ? "@media (min-width: 900px) { .cover-overlay, .cover-screen { left: 0 !important; right: 0 !important; width: 100% !important; z-index: 30 !important; } }"
        : "@media (min-width: 900px) { .cover-overlay, .cover-screen { left: auto !important; right: 0 !important; width: 460px !important; } }";
  }, [device, desktopCoverFull, docVersion]);

  // Animasi loop blok dan ornamen diterapkan langsung agar terlihat tanpa memuat ulang pratinjau.
  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;
    doc.getElementById("lux-builder-loops")?.remove();
    let style = doc.getElementById("lux-b-loops-live") as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = "lux-b-loops-live";
      doc.head.appendChild(style);
    }
    style.textContent = loopCss(blocks, ornaments);
  }, [blocks, ornaments, docVersion]);

  // Bingkai foto ditulis ulang langsung ke dokumen pratinjau agar perubahan bentuk dan bingkai terlihat saat itu juga.
  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;
    let style = doc.getElementById("lux-b-frames-live") as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = "lux-b-frames-live";
      doc.head.appendChild(style);
    }
    style.textContent = frameCss(frames);
  }, [frames, docVersion]);

  // Latar seksi, kartu/tombol, tata letak desktop, animasi, dan CSS kustom ditulis ulang langsung ke master yang sedang
  // tampil; urutannya dijaga (CSS kustom setelah gaya desain) agar sama dengan master tersimpan.
  const { design } = props;
  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;
    let designStyle = doc.getElementById("lux-builder-design") as HTMLStyleElement | null;
    if (!designStyle) {
      designStyle = doc.createElement("style");
      designStyle.id = "lux-builder-design";
      doc.head.appendChild(designStyle);
    }
    designStyle.textContent = design.css;
    let customStyle = doc.getElementById("lux-builder-custom") as HTMLStyleElement | null;
    if (!customStyle && design.custom) {
      customStyle = doc.createElement("style");
      customStyle.id = "lux-builder-custom";
      designStyle.after(customStyle);
    }
    if (customStyle) customStyle.textContent = design.custom;
    doc.documentElement.setAttribute("data-lux-anim-preset", design.preset);
  }, [design, docVersion]);

  useEffect(() => {
    if (docVersion) navigate(jump.section);
    // Lompat hanya saat admin memilih seksi; muat ulang pratinjau memulihkan posisi gulir sendiri.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump.nonce, navigate]);

  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;
    for (const o of ornaments) {
      const el = doc.querySelector(`[data-orn-id="${o.id}"]`) as HTMLElement | null;
      if (!el) continue;
      el.setAttribute("style", ornamentStyle(o));
      el.classList.toggle("is-front", o.layer === "front");
      if (o.text) {
        // Hanya simpul teksnya yang diganti: pegangan ukuran dan putar anak elemen yang sama harus tetap ada saat mengetik.
        const first = el.firstChild;
        if (first && first.nodeType === 3) {
          if (first.nodeValue !== o.text.value) first.nodeValue = o.text.value;
        } else {
          el.insertBefore(doc.createTextNode(o.text.value), first);
        }
      }
    }
    // Urutan tumpukan antar ornamen mengikuti urutan DOM, jadi simpul wadah (seksi, atau blok bagi ornamen menempel) disusun ulang sesuai urutan spesifikasi.
    doc.querySelectorAll("[data-lux-section], [data-lux-block]").forEach((section) => {
      const nodes = [...section.children].filter((n) => n.classList.contains("lux-orn")) as HTMLElement[];
      const wanted = [...nodes].sort((a, b) => ornaments.findIndex((o) => o.id === a.dataset.ornId) - ornaments.findIndex((o) => o.id === b.dataset.ornId));
      if (nodes.every((n, i) => n === wanted[i])) return;
      const marker = doc.createComment("");
      section.insertBefore(marker, nodes[0]);
      wanted.forEach((n) => section.insertBefore(n, marker));
      marker.remove();
    });
  }, [ornaments, docVersion]);

  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;
    // Selalu menulis nilai eksplisit (termasuk bawaan) agar blok yang dikembalikan ke bawaan tidak tertinggal pada
    // aturan CSS dari muat terakhir.
    for (const { id } of BUILDER_BLOCKS) {
      const el = doc.querySelector(`[data-lux-block="${id}"]`) as HTMLElement | null;
      if (!el) continue;
      const p = blocks[id] ?? DEFAULT_BLOCK_PROPS;
      el.style.setProperty("translate", `${p.x}% ${p.y}%`);
      el.style.setProperty("rotate", `${p.rotate}deg`);
      el.style.setProperty("scale", String(p.scale));
      el.style.display = p.hidden ? "none" : "";
      // Ornamen sebaris berada di luar elemen blok, jadi disembunyikan lewat kelasnya bersama blok.
      doc.querySelectorAll(`[data-orn-before="${id}"]`).forEach((n) => n.classList.toggle("lux-flow-off", p.hidden));
      const z = blockZIndex(p);
      el.style.position = z === null ? "" : "relative";
      el.style.zIndex = z === null ? "" : String(z);
      el.style.opacity = p.opacity !== undefined && p.opacity < 1 ? String(p.opacity) : "";
      el.style.textAlign = p.align ?? "";
      el.style.letterSpacing = p.tracking ? `${p.tracking}px` : "";
      if (p.lineHeight) {
        el.style.setProperty("line-height", String(p.lineHeight), "important");
      } else {
        el.style.removeProperty("line-height");
      }
      el.style.maxWidth = p.maxWidth ? `${p.maxWidth}px` : "";
      if (p.maxWidth) {
        el.style.marginLeft = "auto";
        el.style.marginRight = "auto";
      } else {
        el.style.marginLeft = "";
        el.style.marginRight = "";
      }
      if (p.font) {
        el.style.setProperty("font-family", blockFontFamilyCss(p.font), "important");
      } else {
        el.style.removeProperty("font-family");
      }
      if (p.transform && p.transform !== "none") {
        el.style.setProperty("text-transform", p.transform, "important");
      } else {
        el.style.removeProperty("text-transform");
      }
      if (p.italic) {
        el.style.setProperty("font-style", "italic", "important");
      } else {
        el.style.removeProperty("font-style");
      }
      if (p.weight) {
        el.style.setProperty("font-weight", String(p.weight), "important");
      } else {
        el.style.removeProperty("font-weight");
      }
      const colorToken = p.color ? BLOCK_COLOR_TOKENS.find((c) => c.id === p.color) : null;
      if (colorToken) {
        el.style.setProperty("color", colorToken.css, "important");
      } else {
        el.style.removeProperty("color");
      }
      const filterCss = p.filter && p.filter !== "none" ? PHOTO_FILTER_CSS[p.filter] : "";
      if ((FRAMED_PHOTOS as readonly string[]).includes(id)) {
        const img = el.querySelector("img") as HTMLElement | null;
        if (img) img.style.filter = filterCss || "";
        el.style.filter = "";
      } else {
        el.style.filter = filterCss || "";
      }
    }
  }, [blocks, docVersion]);

  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;
    doc.querySelectorAll("[data-lux-block].lux-b-bsel").forEach((n) => n.classList.remove("lux-b-bsel"));
    if (selectedBlock) doc.querySelector(`[data-lux-block="${selectedBlock}"]`)?.classList.add("lux-b-bsel");
  }, [selectedBlock, docVersion]);

  useEffect(() => {
    getDoc()?.documentElement.classList.toggle("lux-b-edit", editOrnaments);
    syncSelection();
  }, [editOrnaments, selectedId, docVersion, syncSelection]);

  useEffect(() => {
    const doc = getDoc();
    if (!doc || !docVersion) return;
    const nodes = doc.querySelectorAll("[data-lux-anim]");
    if (!playAnimations) {
      nodes.forEach((n) => n.classList.add("lux-in"));
      return;
    }
    // Putar ulang: lepas tanda tampil lalu biarkan pengamat di master memunculkannya lagi saat terlihat.
    nodes.forEach((n) => n.classList.remove("lux-in"));
    const timer = window.setTimeout(() => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      const io = new (win as unknown as typeof globalThis).IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("lux-in");
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.05 });
      nodes.forEach((n) => io.observe(n));
    }, 80);
    return () => window.clearTimeout(timer);
  }, [playAnimations, replayNonce, docVersion]);

  return (
    <div
      ref={stageRef}
      onPointerDown={() => setMenu(null)}
      className="relative flex-1 min-w-0 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,#d6d3d1_1px,transparent_0)] [background-size:18px_18px] bg-stone-100"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative shrink-0 origin-center"
          style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}
        >
          <div className={`absolute inset-0 overflow-hidden bg-white shadow-[0_24px_60px_-20px_rgba(28,25,23,0.45)] ${device === "desktop" ? "rounded-xl ring-1 ring-stone-900/10" : "rounded-[2.2rem] ring-[10px] ring-stone-900"}`}>
            {html ? (
              <iframe
                ref={iframeRef}
                title="Pratinjau tema"
                srcDoc={html}
                onLoad={handleLoad}
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-400">Menyiapkan pratinjau…</div>
            )}
          </div>
        </div>
      </div>
      {menu && (
        <div
          className="absolute z-50 min-w-[190px] rounded-lg border border-stone-800 bg-stone-900/95 p-1 text-xs text-stone-200 shadow-2xl backdrop-blur-sm"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {menu.kind === "ornament" && (() => {
            const orn = ornaments.find((o) => o.id === menu.id);
            if (!orn) return null;
            return (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800 mb-0.5 truncate">
                  {orn.text ? `Teks: ${orn.text.value}` : `Ornamen (${orn.id})`}
                </div>
                <div className="px-2 pt-0.5 text-[10px] font-semibold text-stone-400">Rapatkan (Snap)</div>
                <div className="grid grid-cols-3 gap-0.5 px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => snapOrnament(menu.id, "left")}
                    className="rounded px-1.5 py-1 text-center hover:bg-stone-800 hover:text-white"
                  >
                    Kiri
                  </button>
                  <button
                    type="button"
                    onClick={() => snapOrnament(menu.id, "center-x")}
                    className="rounded px-1.5 py-1 text-center hover:bg-stone-800 hover:text-white"
                  >
                    Tengah
                  </button>
                  <button
                    type="button"
                    onClick={() => snapOrnament(menu.id, "right")}
                    className="rounded px-1.5 py-1 text-center hover:bg-stone-800 hover:text-white"
                  >
                    Kanan
                  </button>
                  <button
                    type="button"
                    onClick={() => snapOrnament(menu.id, "top")}
                    className="rounded px-1.5 py-1 text-center hover:bg-stone-800 hover:text-white"
                  >
                    Atas
                  </button>
                  <button
                    type="button"
                    onClick={() => snapOrnament(menu.id, "center-y")}
                    className="rounded px-1.5 py-1 text-center hover:bg-stone-800 hover:text-white"
                  >
                    Tengah Y
                  </button>
                  <button
                    type="button"
                    onClick={() => snapOrnament(menu.id, "bottom")}
                    className="rounded px-1.5 py-1 text-center hover:bg-stone-800 hover:text-white"
                  >
                    Bawah
                  </button>
                </div>
                <div className="border-t border-stone-800 my-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    props.onOrnamentChange(menu.id, { layer: "front" }, true);
                    setMenu(null);
                  }}
                  className="flex items-center justify-between rounded px-2 py-1 text-left hover:bg-stone-800 hover:text-white"
                >
                  <span>Di Depan Teks</span>
                  {orn.layer === "front" && <span className="text-[10px] text-amber-400">Aktif</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    props.onOrnamentChange(menu.id, { layer: "back" }, true);
                    setMenu(null);
                  }}
                  className="flex items-center justify-between rounded px-2 py-1 text-left hover:bg-stone-800 hover:text-white"
                >
                  <span>Di Belakang Teks</span>
                  {orn.layer === "back" && <span className="text-[10px] text-amber-400">Aktif</span>}
                </button>
                {!orn.text && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        props.onOrnamentChange(menu.id, { flipX: !orn.flipX }, true);
                        setMenu(null);
                      }}
                      className="flex items-center justify-between rounded px-2 py-1 text-left hover:bg-stone-800 hover:text-white"
                    >
                      <span>Cermin Kiri-Kanan</span>
                      {orn.flipX && <span className="text-[10px] text-amber-400">Aktif</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        props.onOrnamentChange(menu.id, { flipY: !orn.flipY ? true : undefined }, true);
                        setMenu(null);
                      }}
                      className="flex items-center justify-between rounded px-2 py-1 text-left hover:bg-stone-800 hover:text-white"
                    >
                      <span>Cermin Atas-Bawah</span>
                      {orn.flipY && <span className="text-[10px] text-amber-400">Aktif</span>}
                    </button>
                    {!orn.attach && !orn.before && props.onFillFourCornersOrnament && (
                      <button
                        type="button"
                        onClick={() => {
                          props.onFillFourCornersOrnament?.(menu.id);
                          setMenu(null);
                        }}
                        className="flex items-center justify-between rounded px-2 py-1 text-left text-amber-300 hover:bg-stone-800 hover:text-amber-200"
                      >
                        <span>Pasang ke 4 Sudut Seksi</span>
                      </button>
                    )}
                  </>
                )}
                {props.onDuplicateOrnament && (
                  <button
                    type="button"
                    onClick={() => {
                      props.onDuplicateOrnament?.(menu.id);
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-stone-800 hover:text-white"
                  >
                    Duplikat Ornamen
                  </button>
                )}
                {props.onDeleteOrnament && (
                  <button
                    type="button"
                    onClick={() => {
                      props.onDeleteOrnament?.(menu.id);
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-red-400 hover:bg-red-950/60 hover:text-red-300"
                  >
                    Hapus Ornamen
                  </button>
                )}
              </div>
            );
          })()}
          {menu.kind === "block" && (() => {
            const blk = BUILDER_BLOCKS.find((b) => b.id === menu.id);
            const isOpeningPhoto = menu.id === "opening-photo";
            const isCouplePhoto = menu.id === "couple-photo-1" || menu.id === "couple-photo-2";
            const isCoverGuest = menu.id === "cover-guest";
            const isCoverDate = menu.id === "cover-date";
            const isButtonBlock = menu.id === "cover-open-btn" || menu.id === "countdown-btn";
            const isCardBlock = menu.id === "opening-quote" || menu.id === "rsvp-form";
            return (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800 mb-0.5 truncate">
                  {blk?.label ?? menu.id}
                </div>
                <button
                  type="button"
                  onClick={() => centerBlock(menu.id)}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-stone-800 hover:text-white"
                >
                  Tengahkan Blok
                </button>
                {props.onResetBlock && (
                  <button
                    type="button"
                    onClick={() => {
                      props.onResetBlock?.(menu.id);
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-stone-800 hover:text-white"
                  >
                    Reset Posisi & Skala
                  </button>
                )}
                {isOpeningPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = props.variants.opening ?? "classic";
                      props.onVariantChange({
                        opening: cur === "backdrop" ? "classic" : "backdrop",
                      });
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-amber-400 hover:bg-stone-800 hover:text-amber-300"
                  >
                    Ganti Mode Tampilan Foto
                  </button>
                )}
                {isCouplePhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      const opts = props.eventType === "WEDDING"
                        ? ["stacked", "side", "arch", "portrait", "polaroid", "editorial", "backdrop"]
                        : ["stacked", "arch", "portrait", "polaroid", "editorial", "backdrop"];
                      const cur = props.variants.couple ?? "stacked";
                      const next = opts[(opts.indexOf(cur) + 1) % opts.length];
                      props.onVariantChange({ couple: next });
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-amber-400 hover:bg-stone-800 hover:text-amber-300"
                  >
                    Ganti Tata Letak Foto
                  </button>
                )}
                {isCoverGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      const opts = ["box", "pill", "underline", "hidden"];
                      const cur = props.variants.guestCard ?? "box";
                      const next = opts[(opts.indexOf(cur) + 1) % opts.length];
                      props.onVariantChange({ guestCard: next });
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-amber-400 hover:bg-stone-800 hover:text-amber-300"
                  >
                    Ganti Bentuk Kartu Tamu
                  </button>
                )}
                {isCoverDate && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = props.variants.coverDate ?? "inline";
                      props.onVariantChange({ coverDate: cur === "split" ? "inline" : "split" });
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-amber-400 hover:bg-stone-800 hover:text-amber-300"
                  >
                    Ganti Format Tanggal
                  </button>
                )}
                {isButtonBlock && (
                  <button
                    type="button"
                    onClick={() => {
                      const opts = ["solid", "outline", "glass", "minimal"];
                      const cur = props.variants.buttons ?? "solid";
                      const next = opts[(opts.indexOf(cur) + 1) % opts.length];
                      props.onVariantChange({ buttons: next });
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-amber-400 hover:bg-stone-800 hover:text-amber-300"
                  >
                    Ganti Gaya Tombol
                  </button>
                )}
                {isCardBlock && (
                  <button
                    type="button"
                    onClick={() => {
                      const opts = ["solid", "glass", "outlined", "flat"];
                      const cur = props.variants.cards ?? "solid";
                      const next = opts[(opts.indexOf(cur) + 1) % opts.length];
                      props.onVariantChange({ cards: next });
                      setMenu(null);
                    }}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-amber-400 hover:bg-stone-800 hover:text-amber-300"
                  >
                    Ganti Gaya Kartu
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}
      {loading && (
        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-stone-600 shadow-sm ring-1 ring-stone-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Memperbarui pratinjau
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 whitespace-nowrap">
        {editOrnaments && (
          <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-stone-700 shadow-sm ring-1 ring-stone-200">
            Seret elemen bertepi putus-putus · Klik kanan: menu cepat · Alt+klik: lapis bawah
          </span>
        )}
        <span className="rounded-full bg-stone-900/80 px-3 py-1 text-[10px] font-medium text-white">
          {size.label} · {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}
