"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  BLOCK_LIMITS,
  BUILDER_BLOCKS,
  DEFAULT_BLOCK_PROPS,
  ORNAMENT_SECTIONS,
  blockZIndex,
  ornamentStyle,
  frameCss,
  type BlockProps,
  type BuilderBlockId,
  type BuilderBlocks,
  type BuilderFrames,
  type BuilderOrnament,
  type OrnamentSection,
} from "@/lib/themeBuilder/spec";

export type PreviewDevice = "mobile" | "small" | "desktop";

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
}

interface Props {
  dropTargetRef: RefObject<PreviewDropTarget | null>;
  actionsRef: RefObject<PreviewActions | null>;
  frames: BuilderFrames;
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
  blocks: BuilderBlocks;
  selectedBlock: BuilderBlockId | null;
  onSelectBlock: (id: BuilderBlockId | null) => void;
  onBlockChange: (id: BuilderBlockId, patch: Partial<BlockProps>, final: boolean) => void;
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
  html.lux-b-edit [data-lux-block] { cursor: grab; outline: 1px dashed rgba(37, 99, 235, 0.35); outline-offset: 3px; }
  html.lux-b-edit [data-lux-block]:hover { outline: 1px dashed #2563eb; }
  html.lux-b-edit [data-lux-block].lux-b-bsel { outline: 2px solid #2563eb; outline-offset: 3px; }
  html.lux-b-dragging, html.lux-b-dragging * { cursor: grabbing !important; user-select: none !important; }
  .lux-b-handle, .lux-b-rot { position: absolute; z-index: 2; pointer-events: auto; box-sizing: border-box; }
  .lux-b-handle { right: -8px; bottom: -8px; width: 16px; height: 16px; border-radius: 50%; background: #ffffff; border: 2px solid #d97706; cursor: nwse-resize; }
  .lux-b-rot { left: -8px; top: -8px; width: 16px; height: 16px; border-radius: 50%; background: #d97706; border: 2px solid #ffffff; cursor: alias; }
  [data-lux-section] > .lux-b-guide { position: absolute !important; top: 0; bottom: 0; left: 50%; width: 0; border-left: 1px dashed #d97706; z-index: 70 !important; pointer-events: none; }
  html.lux-b-dropping [data-lux-section] { outline: 2px dashed #f59e0b; outline-offset: -6px; }
`;

const SNAP_THRESHOLD = 1.2;

type DragState =
  | { kind: "block"; id: BuilderBlockId; startX: number; startY: number; baseX: number; baseY: number; w: number; h: number; section: HTMLElement | null; naturalCenter: number }
  | { kind: "move"; id: string; section: HTMLElement; offsetX: number; offsetY: number; moved: boolean }
  | { kind: "resize"; id: string; section: HTMLElement }
  | { kind: "rotate"; id: string; el: HTMLElement; startAngle: number; startRotate: number };

const pointerAngle = (el: HTMLElement, clientX: number, clientY: number) => {
  const r = el.getBoundingClientRect();
  return (Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2)) * 180) / Math.PI;
};

export default function BuilderPreview(props: Props) {
  const { html, loading, device, editOrnaments, playAnimations, replayNonce, jump, ornaments, selectedId, blocks, selectedBlock } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [docVersion, setDocVersion] = useState(0);

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
    doc.querySelectorAll(".lux-orn.lux-b-sel").forEach((n) => n.classList.remove("lux-b-sel"));
    const { selectedId: sel, editOrnaments: editing } = latest.current.props;
    if (!sel || !editing) return;
    const el = doc.querySelector(`.lux-orn[data-orn-id="${sel}"]`);
    if (!el) return;
    el.classList.add("lux-b-sel");
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
    const showGuide = (section: HTMLElement, on: boolean) => {
      section.querySelectorAll(":scope > .lux-b-guide").forEach((g) => g.remove());
      if (!on) return;
      const g = doc.createElement("div");
      g.className = "lux-b-guide";
      section.appendChild(g);
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
      for (const el of doc.elementsFromPoint(clientX, clientY) as HTMLElement[]) {
        const hit = (el.closest(".lux-orn") ?? el.closest("[data-lux-block]")) as HTMLElement | null;
        if (hit && !found.includes(hit)) found.push(hit);
      }
      return found;
    };

    doc.addEventListener("pointerdown", (e) => {
      if (!latest.current.props.editOrnaments) return;
      const target = e.target as HTMLElement;
      const onHandle = target.classList.contains("lux-b-handle") || target.classList.contains("lux-b-rot");
      const stack = onHandle ? [] : editableAt(e.clientX, e.clientY);
      const picked = onHandle ? (target.closest(".lux-orn") as HTMLElement | null) : (e.altKey && stack.length > 1 ? stack[1] : stack[0]) ?? null;
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
          drag.current = {
            kind: "block", id, startX: e.clientX, startY: e.clientY, baseX: current.x, baseY: current.y,
            w: blockEl.offsetWidth || 1, h: blockEl.offsetHeight || 1, section: sectionOf(blockEl), naturalCenter: naturalCenterOf(blockEl, current.x),
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
      if (target.classList.contains("lux-b-handle")) {
        drag.current = { kind: "resize", id, section };
      } else if (target.classList.contains("lux-b-rot")) {
        // Putaran relatif terhadap titik awal seret, sehingga ornamen tidak melompat ke arah kursor.
        drag.current = { kind: "rotate", id, el: orn, startAngle: pointerAngle(orn, e.clientX, e.clientY), startRotate: o.rotate };
      } else {
        const r = orn.getBoundingClientRect();
        drag.current = { kind: "move", id, section, offsetX: e.clientX - (r.left + r.width / 2), offsetY: e.clientY - (r.top + r.height / 2), moved: false };
      }
    }, true);

    doc.addEventListener("pointermove", (e) => {
      const d = drag.current;
      if (!d) return;
      if (d.kind === "block") {
        const clampTo = (v: number, [min, max]: readonly [number, number]) => Math.max(min, Math.min(max, v));
        // Menempel ke posisi bawaan (0) saat dekat, supaya blok mudah dikembalikan ke tengah alurnya.
        const snap = (v: number) => (Math.abs(v) < 1 ? 0 : v);
        let x = snap(clampTo(Math.round((d.baseX + ((e.clientX - d.startX) / d.w) * 100) * 10) / 10, BLOCK_LIMITS.x));
        const y = snap(clampTo(Math.round((d.baseY + ((e.clientY - d.startY) / d.h) * 100) * 10) / 10, BLOCK_LIMITS.y));
        // Menempel ke tengah seksi bila tengah blok berjarak kurang dari 6 px; garis pemandu menandainya.
        let centered = false;
        if (d.section) {
          const centerX = clampTo(Math.round((((sectionCenter(d.section) - d.naturalCenter) / d.w) * 100) * 10) / 10, BLOCK_LIMITS.x);
          centered = (Math.abs(x - centerX) / 100) * d.w < 6;
          if (centered) x = centerX;
          showGuide(d.section, centered);
        }
        latest.current.props.onBlockChange(d.id, { x, y }, false);
        return;
      }
      const o = latest.current.ornaments.find((item) => item.id === d.id);
      if (!o) return;
      if (d.kind === "move") {
        let { x, y } = percent(d.section, e.clientX - d.offsetX, e.clientY - d.offsetY, o.anchor);
        const snapped = Math.abs(x - 50) < SNAP_THRESHOLD;
        if (snapped) x = 50;
        showGuide(d.section, snapped);
        d.moved = true;
        latest.current.props.onOrnamentChange(d.id, { x, y }, false);
      } else if (d.kind === "resize") {
        const r = d.section.getBoundingClientRect();
        const centerX = r.left + (o.x / 100) * r.width;
        const width = Math.max(3, Math.min(140, (Math.abs(e.clientX - centerX) * 2 * 100) / r.width));
        latest.current.props.onOrnamentChange(d.id, { width: Math.round(width * 10) / 10 }, false);
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
        if (d.section) showGuide(d.section, false);
        latest.current.props.onBlockChange(d.id, {}, true);
        return;
      }
      if (d.kind !== "rotate") showGuide(d.section, false);
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
    };
    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef]);

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

  useEffect(() => {
    if (docVersion) navigate(jump.section);
    // Lompat hanya saat admin memilih seksi; muat ulang pratinjau memulihkan posisi gulir sendiri.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump.nonce, navigate]);

  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;
    for (const o of ornaments) {
      const el = doc.querySelector(`.lux-orn[data-orn-id="${o.id}"]`) as HTMLElement | null;
      if (!el) continue;
      el.setAttribute("style", ornamentStyle(o));
      el.classList.toggle("is-front", o.layer === "front");
    }
    // Urutan tumpukan antar ornamen mengikuti urutan DOM, jadi simpul seksi disusun ulang sesuai urutan spesifikasi.
    doc.querySelectorAll("[data-lux-section]").forEach((section) => {
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
      const z = blockZIndex(p);
      el.style.position = z === null ? "" : "relative";
      el.style.zIndex = z === null ? "" : String(z);
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
    <div ref={stageRef} className="relative flex-1 min-w-0 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,#d6d3d1_1px,transparent_0)] [background-size:18px_18px] bg-stone-100">
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
      {loading && (
        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-stone-600 shadow-sm ring-1 ring-stone-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Memperbarui pratinjau
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 whitespace-nowrap">
        {editOrnaments && (
          <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-stone-700 shadow-sm ring-1 ring-stone-200">
            Seret elemen bertepi putus-putus · Alt+klik: pilih yang di bawahnya
          </span>
        )}
        <span className="rounded-full bg-stone-900/80 px-3 py-1 text-[10px] font-medium text-white">
          {size.label} · {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}
