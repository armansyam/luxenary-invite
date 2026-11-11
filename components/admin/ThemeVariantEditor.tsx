"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/ui/Feedback";
import { GoogleFontPicker } from "@/components/admin/themeBuilder/GoogleFontPicker";
import { FONT_OPTIONS, PALETTE_PRESETS, customCssError, fontLabel, isGoogleFontId } from "@/lib/themeBuilder/spec";
import { ELEMENT_LIMITS, isElementSelector, masterExtraCss, overrideCount, overrideCssFromTokens, recolorWithPalette, type ColorUsage, type ColorUsageKind, type ElementEdit, type ElementView, type MasterFontToken, type MasterOverrides } from "@/lib/themeVariantCss";
import { measureText, newlyUnreadable, type TextSample } from "@/components/admin/variantReadability";

interface ColorGroup {
  value: string;
  names: string[];
}

interface LoadedVariant {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  overrides: MasterOverrides;
}

const DEVICES = [
  { id: "mobile", label: "HP", width: 390 },
  { id: "desktop", label: "Desktop", width: 1280 },
] as const;

/** Nama kelompok warna yang mudah dibaca: variabel semantik master lebih dulu, lalu jumlah variabel lain bernilai sama. */
function groupLabel(names: string[]): string {
  const semantic = names.filter((n) => !n.startsWith("--lux-c-")).map((n) => n.replace(/^--/, ""));
  if (semantic.length) return semantic.slice(0, 3).join(", ") + (semantic.length > 3 ? ` +${semantic.length - 3}` : "");
  return "Warna tertulis langsung di master";
}

const emptyOverrides = (): MasterOverrides => ({ colors: {}, fonts: {} });

const USAGE_LABELS: Array<[ColorUsageKind, string]> = [["bg", "Latar"], ["text", "Teks"], ["line", "Garis"], ["shadow", "Bayangan"], ["icon", "Ikon"]];

function groupUsage(names: string[], usage: Record<string, ColorUsage>): { total: number; parts: Array<[string, number]> } {
  const sum: ColorUsage = { bg: 0, text: 0, line: 0, shadow: 0, icon: 0 };
  for (const n of names) for (const [k] of USAGE_LABELS) sum[k] += usage[n]?.[k] ?? 0;
  const parts = USAGE_LABELS.filter(([k]) => sum[k] > 0).sort((a, b) => sum[b[0]] - sum[a[0]]).map(([k, label]) => [label, sum[k]] as [string, number]);
  return { total: parts.reduce((a, [, n]) => a + n, 0), parts };
}

interface LoadedMaster {
  id: string;
  name: string;
  isActive: boolean;
  variantCount: number;
}

/** Salinan override yang aman diubah (objek dan larik baru di setiap tingkat). */
function cloneOverrides(o: Partial<MasterOverrides> | null | undefined): MasterOverrides {
  return {
    colors: { ...(o?.colors ?? {}) },
    fonts: { ...(o?.fonts ?? {}) },
    ...(o?.images && Object.keys(o.images).length ? { images: { ...o.images } } : {}),
    ...(o?.hiddenSections?.length ? { hiddenSections: [...o.hiddenSections] } : {}),
    ...(o?.css?.trim() ? { css: o.css } : {}),
    ...(o?.elements && Object.keys(o.elements).length ? { elements: JSON.parse(JSON.stringify(o.elements)) } : {}),
    ...(o?.coverDesktop === "full" ? { coverDesktop: "full" as const } : {}),
  };
}

const DEFAULT_ELEMENT_EDIT: ElementEdit = { x: 0, y: 0, scale: 1, rotate: 0 };
// Kelas keadaan yang dipasang skrip atau animasi saat halaman berjalan; tidak dipakai di alamat elemen karena berubah.
const STATE_CLASS_RE = /^(?:is-|has-|lux-|active$|opened$|open$|show$|visible$|reveal$|in-view|animate|aos)/;

/**
 * Alamat CSS elemen yang dipilih di pratinjau: dari elemen ber-id terdekat (atau akar dokumen) turun ke elemen itu,
 * dengan kelas tetap dan `:nth-of-type` bila ada saudara bertag sama. Null bila alamat tidak unik atau tidak sah.
 */
function selectorFor(el: Element, doc: Document): string | null {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.tagName !== "BODY" && node.tagName !== "HTML") {
    if (node.id && /^[A-Za-z][\w-]{0,60}$/.test(node.id)) { parts.unshift(`#${node.id}`); break; }
    const tag = node.tagName.toLowerCase();
    if (!/^[a-z][a-z0-9]{0,15}$/.test(tag)) return null;
    const classes = [...node.classList].filter((c) => /^[A-Za-z_][\w-]{0,60}$/.test(c) && !STATE_CLASS_RE.test(c)).slice(0, 3);
    let seg = tag + classes.map((c) => `.${c}`).join("");
    const parent: Element | null = node.parentElement;
    if (parent) {
      const same = [...parent.children].filter((c) => c.tagName === node!.tagName);
      if (same.length > 1) seg += `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    parts.unshift(seg);
    node = parent;
  }
  const selector = parts.join(" > ");
  if (!selector || !isElementSelector(selector)) return null;
  return doc.querySelectorAll(selector).length === 1 ? selector : null;
}

const isCoverSelector = (s: string) => s === "#coverScreen" || s.startsWith("#coverScreen > ");

/**
 * Editor Varian Tema dan Editor Master. Varian: warna (per kelompok nilai asli) dan huruf (per keluarga) sebagai tema
 * baru. Master (`masterId`): master tulisan tangan itu sendiri, ditambah gambar pengganti, seksi tersembunyi, dan CSS
 * tambahan; berkas master tidak pernah ditulis. Pratinjau memakai render server, lalu warna, huruf, seksi, dan CSS
 * ditulis langsung ke `<style id="lux-master-overrides">` di iframe; penggantian gambar merender ulang pratinjau.
 */
export default function ThemeVariantEditor({ parentId, variantId, masterId = null }: { parentId: string | null; variantId: string | null; masterId?: string | null }) {
  const masterMode = Boolean(masterId);
  const router = useRouter();
  const { notify, confirm } = useFeedback();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parent, setParent] = useState<{ id: string; name: string } | null>(null);
  const [groups, setGroups] = useState<ColorGroup[]>([]);
  const [fontTokens, setFontTokens] = useState<MasterFontToken[]>([]);
  const [variant, setVariant] = useState<LoadedVariant | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [overrides, setOverrides] = useState<MasterOverrides>(emptyOverrides);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("mobile");
  const [busy, setBusy] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, ColorUsage>>({});
  const [showUnused, setShowUnused] = useState(false);
  const [unreadable, setUnreadable] = useState<TextSample[]>([]);
  const [master, setMaster] = useState<LoadedMaster | null>(null);
  const [imageRefs, setImageRefs] = useState<Array<{ path: string; count: number }>>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const previewImagesRef = useRef<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);
  // Tata letak elemen (Mode Master): pilih dan seret elemen apa pun di pratinjau, posisi HP dan desktop terpisah.
  const [layoutMode, setLayoutMode] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showCover, setShowCover] = useState(true);
  const [coverView, setCoverView] = useState<"full" | "split">("split");
  const [docVersion, setDocVersion] = useState(0);
  const splitStyleRef = useRef<string>("");
  const interaction = useRef({ layoutMode: true, selected: null as string | null, view: "mobile" as ElementView });
  const overridesRef = useRef(overrides);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);

  const snapshot = useCallback((n: string, d: string, o: MasterOverrides) => JSON.stringify({ n: n.trim(), d: d.trim(), o }), []);
  const dirty = snapshot(name, description, overrides) !== savedSnapshot;

  /** Render server (master mentah + override pada mode master; suntingan master induk + override pada mode varian). */
  const fetchPreview = useCallback(async (themeParentId: string, o: MasterOverrides): Promise<{ html?: string; error?: string }> => {
    const res = await fetch("/api/admin/theme-variants?preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: themeParentId, overrides: o, ...(masterMode ? { mode: "master" } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { html: data.html } : { error: [data.error, ...(data.details ?? [])].filter(Boolean).join(" ") || "Pratinjau gagal dibuat." };
  }, [masterMode]);

  useEffect(() => {
    const url = masterId
      ? `/api/admin/theme-variants?master=${encodeURIComponent(masterId)}`
      : variantId ? `/api/admin/theme-variants?id=${encodeURIComponent(variantId)}` : parentId ? `/api/admin/theme-variants?parent=${encodeURIComponent(parentId)}` : null;
    if (!url) { setLoadError("Pilih tema master dari katalog admin untuk membuat varian."); return; }
    let cancelled = false;
    (async () => {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) { setLoadError(data.error || "Data tema gagal dimuat."); return; }
      setParent(data.parent);
      setGroups(data.colorGroups);
      setFontTokens(data.fonts);
      setUsage(data.usage ?? {});
      setImageRefs(data.images ?? []);
      setSections(data.sections ?? []);
      const loaded: LoadedVariant | null = data.variant ?? null;
      setVariant(loaded);
      if (data.master) setMaster({ id: data.master.id, name: data.master.name, isActive: data.master.isActive, variantCount: data.variantCount ?? 0 });
      const n = data.master?.name ?? loaded?.name ?? `${data.parent.name} Varian`;
      const d = loaded?.description ?? "";
      const o = cloneOverrides(data.master?.overrides ?? loaded?.overrides);
      setName(n);
      setDescription(d);
      setOverrides(o);
      setSavedSnapshot(loaded || data.master ? snapshot(n, d, o) : "");
      previewImagesRef.current = JSON.stringify(o.images ?? {});
      const preview = await fetchPreview(data.parent.id, o);
      if (!cancelled) {
        if (preview.html) setPreviewHtml(preview.html);
        else setLoadError(preview.error ?? "Pratinjau gagal dibuat.");
      }
    })().catch(() => !cancelled && setLoadError("Data tema gagal dimuat. Periksa koneksi."));
    return () => { cancelled = true; };
  }, [parentId, variantId, masterId, snapshot, fetchPreview]);

  // Gambar pengganti tertulis di HTML dan CSS master (atribut src, url()), jadi pratinjau dirender ulang di server.
  useEffect(() => {
    if (!parent || !previewHtml) return;
    const key = JSON.stringify(overrides.images ?? {});
    if (key === previewImagesRef.current) return;
    const t = setTimeout(async () => {
      previewImagesRef.current = key;
      const preview = await fetchPreview(parent.id, overrides);
      if (preview.html) setPreviewHtml(preview.html);
      else notify(preview.error ?? "Pratinjau gagal dibuat.", "error");
    }, 400);
    return () => clearTimeout(t);
  }, [overrides, parent, previewHtml, fetchPreview, notify]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Override ditulis ulang langsung ke dokumen pratinjau; master induk tidak dirender ulang di server.
  const applyToPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.head) return;
    const { css, fontLinks } = overrideCssFromTokens(overrides, fontTokens);
    for (const href of fontLinks) {
      if (!doc.querySelector(`link[data-variant-font="${href}"]`)) {
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.setAttribute("data-variant-font", href);
        doc.head.appendChild(link);
      }
    }
    let style = doc.getElementById("lux-master-overrides") as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = "lux-master-overrides";
      doc.head.appendChild(style);
    }
    style.textContent = [css, masterExtraCss(overrides)].filter(Boolean).join("\n");
  }, [overrides, fontTokens]);

  useEffect(() => { applyToPreview(); }, [applyToPreview]);

  const viewFor = useCallback((selector: string | null): ElementView => {
    if (device === "mobile") return "mobile";
    return selector && isCoverSelector(selector) && coverView === "split" ? "desktopSplit" : "desktop";
  }, [device, coverView]);

  const editOf = useCallback((selector: string, view: ElementView): ElementEdit => overrides.elements?.[selector]?.[view] ?? DEFAULT_ELEMENT_EDIT, [overrides.elements]);

  const setElementEdit = useCallback((selector: string, view: ElementView, patch: Partial<ElementEdit> | null) => {
    setOverrides((prev) => {
      const elements = { ...(prev.elements ?? {}) };
      const edits = { ...(elements[selector] ?? {}) };
      const merged: ElementEdit = patch ? { ...(edits[view] ?? DEFAULT_ELEMENT_EDIT), ...patch } : DEFAULT_ELEMENT_EDIT;
      if (!merged.x && !merged.y && merged.scale === 1 && !merged.rotate && !merged.hidden) delete edits[view];
      else edits[view] = merged;
      if (Object.keys(edits).length) elements[selector] = edits;
      else delete elements[selector];
      const next: MasterOverrides = { ...prev, elements };
      if (!Object.keys(elements).length) delete next.elements;
      return next;
    });
  }, []);

  useEffect(() => {
    interaction.current = { layoutMode: masterMode && layoutMode, selected, view: viewFor(selected) };
  }, [masterMode, layoutMode, selected, viewFor]);

  // Penanda pilihan, sampul tersembunyi, dan tampilan sampul desktop yang sedang ditata, ditulis ke dokumen pratinjau.
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.head || !masterMode) return;
    let style = doc.getElementById("lux-me-editor") as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = "lux-me-editor";
      doc.head.appendChild(style);
    }
    const rules: string[] = [];
    // Ilustrasi SVG master umumnya `pointer-events: none` agar tidak menghalangi tamu; di mode pilih elemen bagian yang
    // tergambar dibuat bisa diklik supaya potongan ilustrasi (lentera, gedung, ornamen) dapat dipilih tersendiri.
    if (layoutMode) rules.push("* { user-select: none !important; -webkit-user-select: none !important; } svg * { pointer-events: visiblePainted !important; } [data-lux-me-sel] { outline: 2px dashed var(--accent, currentColor) !important; outline-offset: 3px !important; cursor: move !important; }");
    if (!showCover) {
      rules.push("#coverScreen, .cover-screen, .cover-overlay, #coverOverlay { display: none !important; } html, body { overflow: auto !important; }");
      doc.body?.classList.remove("is-locked");
    }
    style.textContent = rules.join("\n");
    doc.querySelectorAll("[data-lux-me-sel]").forEach((n) => n.removeAttribute("data-lux-me-sel"));
    if (selected && layoutMode && isElementSelector(selected)) doc.querySelector(selected)?.setAttribute("data-lux-me-sel", "");
    // Keberadaan gaya split dari mesin menentukan set posisi sampul desktop (elementEditsCss); di sini dibuat sesuai
    // tampilan yang sedang ditata, dan sampul layar penuh berada di atas hero kiri seperti di undangan.
    let split = doc.getElementById("lux-cover-desktop-split") as HTMLStyleElement | null;
    if (split && !splitStyleRef.current) splitStyleRef.current = split.textContent ?? "";
    let fullStyle = doc.getElementById("lux-me-cover-full") as HTMLStyleElement | null;
    if (device === "desktop" && coverView === "full") {
      split?.remove();
      if (!fullStyle) {
        fullStyle = doc.createElement("style");
        fullStyle.id = "lux-me-cover-full";
        doc.head.appendChild(fullStyle);
      }
      fullStyle.textContent = "@media (min-width: 900px) { :root body #coverScreen, :root body .cover-screen, :root body .cover-overlay { left: 0 !important; right: 0 !important; width: 100% !important; z-index: 9999 !important; } }";
    } else {
      fullStyle?.remove();
      if (device === "desktop" && !split) {
        split = doc.createElement("style");
        split.id = "lux-cover-desktop-split";
        split.textContent = splitStyleRef.current || "@media (min-width: 900px) { :root body .cover-screen, :root body #coverScreen, :root body .cover-overlay, :root body #coverOverlay { left: auto; right: 0; width: 460px; } }";
        doc.head.appendChild(split);
      }
    }
  }, [masterMode, layoutMode, showCover, selected, device, coverView, docVersion, overrides.elements]);

  // Alamat tersimpan yang tidak lagi cocok dengan master (mis. struktur master berubah) ditandai di daftar elemen.
  const [missingSelectors, setMissingSelectors] = useState<string[]>([]);
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !masterMode) return;
    setMissingSelectors(Object.keys(overrides.elements ?? {}).filter((s) => !isElementSelector(s) || !doc.querySelector(s)));
  }, [masterMode, overrides.elements, docVersion]);

  const selectParent = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const current = interaction.current.selected;
    if (!doc || !current || !isElementSelector(current)) return;
    const parentEl = doc.querySelector(current)?.parentElement;
    const up = parentEl ? selectorFor(parentEl, doc) : null;
    if (up) setSelected(up);
    else notify("Elemen induknya tidak bisa dipilih.", "info");
  }, [notify]);

  /** Klik memilih elemen (tautan dan tombol master tidak dijalankan); seret elemen terpilih menggesernya. */
  const attachLayoutHandlers = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !masterMode) return;
    splitStyleRef.current = doc.getElementById("lux-cover-desktop-split")?.textContent ?? "";
    setCoverView(doc.querySelector('[data-lux-desktop-cover="full"]') || !doc.getElementById("lux-cover-desktop-split") ? "full" : "split");
    let drag: { selector: string; view: ElementView; startX: number; startY: number; baseX: number; baseY: number; w: number; h: number; moved: boolean } | null = null;
    let justDragged = false;
    doc.addEventListener("click", (e) => {
      if (!interaction.current.layoutMode) return;
      e.preventDefault();
      e.stopPropagation();
      if (justDragged) { justDragged = false; return; }
      const target = e.target as Element | null;
      if (!target || target === doc.body || target === doc.documentElement) return;
      const sel = selectorFor(target, doc);
      if (sel) setSelected(sel);
      else notify("Elemen ini tidak bisa dipilih tersendiri. Pilih elemen di sekitarnya.", "info");
    }, true);
    doc.addEventListener("pointerdown", (e) => {
      const { layoutMode: on, selected: sel, view } = interaction.current;
      if (!on || !sel || !isElementSelector(sel)) return;
      const el = doc.querySelector(sel);
      if (!el || !el.contains(e.target as Node)) return;
      e.preventDefault();
      const current = overridesRef.current.elements?.[sel]?.[view] ?? DEFAULT_ELEMENT_EDIT;
      // Persen translate mengacu ke ukuran elemen sebelum diperbesar. Potongan SVG memakai kotak aslinya (getBBox) kali
      // skala kanvas, karena kotak di layar ikut melebar saat potongan berayun atau berputar.
      let w: number;
      let h: number;
      const svgEl = el as unknown as SVGGraphicsElement;
      const ctm = typeof svgEl.getBBox === "function" && el.namespaceURI === "http://www.w3.org/2000/svg" && el.tagName.toLowerCase() !== "svg" ? svgEl.getScreenCTM() : null;
      if (ctm) {
        const box = svgEl.getBBox();
        const k = Math.hypot(ctm.a, ctm.b) / current.scale;
        w = box.width * k;
        h = box.height * k;
      } else {
        const rect = el.getBoundingClientRect();
        w = rect.width / current.scale;
        h = rect.height / current.scale;
      }
      drag = { selector: sel, view, startX: e.clientX, startY: e.clientY, baseX: current.x, baseY: current.y, w: w || 1, h: h || 1, moved: false };
    }, true);
    doc.addEventListener("pointermove", (e) => {
      if (!drag) return;
      if (!drag.moved && Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) < 3) return;
      drag.moved = true;
      const clamp = (v: number, [min, max]: readonly [number, number]) => Math.max(min, Math.min(max, Math.round(v * 10) / 10));
      setElementEdit(drag.selector, drag.view, {
        x: clamp(drag.baseX + ((e.clientX - drag.startX) / drag.w) * 100, ELEMENT_LIMITS.x),
        y: clamp(drag.baseY + ((e.clientY - drag.startY) / drag.h) * 100, ELEMENT_LIMITS.y),
      });
    }, true);
    const end = () => { if (drag?.moved) justDragged = true; drag = null; };
    doc.addEventListener("pointerup", end, true);
    doc.addEventListener("pointercancel", end, true);
    setDocVersion((v) => v + 1);
  }, [masterMode, notify, setElementEdit]);

  // Keterbacaan diukur dari pratinjau pada saat yang sama: tanpa override (master asli) lalu dengan override, sehingga
  // animasi atau skrip master yang mengubah tampilan di antara dua pengukuran tidak menghasilkan laporan palsu. Hanya
  // teks yang menjadi sulit dibaca karena varian yang dilaporkan.
  const checkReadability = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const style = doc?.getElementById("lux-master-overrides");
    if (!doc || !style) return;
    // Transisi warna master membuat getComputedStyle mengembalikan nilai awal transisi, bukan nilai akhirnya.
    const freeze = doc.createElement("style");
    freeze.textContent = "*,*::before,*::after{transition:none!important}";
    doc.head.appendChild(freeze);
    const css = style.textContent;
    style.textContent = "";
    const before = measureText(doc);
    style.textContent = css;
    const after = measureText(doc);
    freeze.remove();
    setUnreadable(newlyUnreadable(before, after));
  }, []);

  useEffect(() => {
    if (!previewHtml) return;
    const t = setTimeout(checkReadability, 500);
    return () => clearTimeout(t);
  }, [overrides, previewHtml, device, checkReadability]);

  const showInPreview = (el: Element) => {
    const highlight = () => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const target = el as HTMLElement;
      const prev = target.style.outline;
      target.style.outline = "2px dashed currentColor";
      setTimeout(() => { target.style.outline = prev; }, 1600);
    };
    // Teks di luar sampul tertutup layar sampul sampai undangan dibuka; tombol buka master dipakai agar kunci gulir dan
    // animasi buka master berjalan seperti pada undangan asli. Semua master menandai sampul terbuka dengan kelas `opened`.
    const doc = el.ownerDocument;
    const cover = doc.getElementById("coverScreen");
    const open = cover?.querySelector<HTMLElement>('[onclick*="penInvitation("]');
    if (cover && open && !cover.contains(el) && !cover.classList.contains("opened")) {
      open.click();
      setTimeout(highlight, 1200);
    } else highlight();
  };

  const sortedGroups = useMemo(() => groups.map((g) => ({ g, use: groupUsage(g.names, usage) })).sort((a, b) => b.use.total - a.use.total), [groups, usage]);
  const unusedCount = sortedGroups.filter((x) => x.use.total === 0).length;

  const applyPalette = (palette: (typeof PALETTE_PRESETS)[number]["palette"]) => {
    setOverrides((prev) => ({ ...prev, colors: recolorWithPalette(groups, palette) }));
  };

  const fontFamilies = useMemo(() => {
    const byFamily = new Map<string, MasterFontToken[]>();
    for (const t of fontTokens) byFamily.set(t.family, [...(byFamily.get(t.family) ?? []), t]);
    return [...byFamily].map(([family, tokens]) => ({ family, names: tokens.map((t) => t.name) }));
  }, [fontTokens]);

  const setGroupColor = (group: ColorGroup, hex: string) => {
    setOverrides((prev) => {
      const colors = { ...prev.colors };
      for (const n of group.names) {
        if (hex === group.value) delete colors[n];
        else colors[n] = hex;
      }
      return { ...prev, colors };
    });
  };

  const setFamilyFont = (names: string[], fontId: string) => {
    setOverrides((prev) => {
      const fonts = { ...prev.fonts };
      for (const n of names) {
        if (fontId) fonts[n] = fontId;
        else delete fonts[n];
      }
      return { ...prev, fonts };
    });
  };

  const changedCount = overrideCount(overrides);
  const cssError = overrides.css?.trim() ? customCssError(overrides.css.trim()) : null;

  const setImage = (original: string, url: string | null) => {
    setOverrides((prev) => {
      const images = { ...(prev.images ?? {}) };
      if (url) images[original] = url;
      else delete images[original];
      const next: MasterOverrides = { ...prev, images };
      if (!Object.keys(images).length) delete next.images;
      return next;
    });
  };

  const uploadImage = async (original: string, file: File) => {
    setUploadingFor(original);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/theme-builder/assets", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify(data.error || "Gambar gagal diunggah.", "error"); return; }
      setImage(original, data.url);
    } finally {
      setUploadingFor(null);
    }
  };

  const toggleSection = (id: string, visible: boolean) => {
    setOverrides((prev) => {
      const hidden = new Set(prev.hiddenSections ?? []);
      if (visible) hidden.delete(id);
      else hidden.add(id);
      const next: MasterOverrides = { ...prev, hiddenSections: sections.filter((s) => hidden.has(s)) };
      if (!next.hiddenSections?.length) delete next.hiddenSections;
      return next;
    });
  };

  const setCss = (css: string) => {
    setOverrides((prev) => {
      const next: MasterOverrides = { ...prev, css };
      if (!css.trim()) delete next.css;
      return next;
    });
  };

  const saveMaster = async (): Promise<boolean> => {
    if (!master) return false;
    if (cssError) { notify(cssError, "error"); return false; }
    const ok = await confirm({
      title: "Simpan suntingan master?",
      message: `Perubahan berlaku untuk demo dan undangan baru yang memakai ${master.name}${master.variantCount ? ` serta ${master.variantCount} variannya` : ""}. Undangan yang sudah dibuat tetap memakai tampilan bekunya. Berkas master asli tidak diubah; "Kembalikan semua" lalu Simpan mengembalikan tampilan aslinya.`,
      confirmLabel: "Simpan",
    });
    if (!ok) return false;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/theme-variants", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterId: master.id, overrides }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify([data.error, ...(data.details ?? [])].filter(Boolean).join(" ") || "Suntingan gagal disimpan.", "error");
        return false;
      }
      setSavedSnapshot(snapshot(name, description, overrides));
      notify(data.count ? "Suntingan master disimpan. Demo dan thumbnail sedang dibuat ulang." : "Master kembali ke tampilan aslinya.", "success");
      return true;
    } finally {
      setBusy(false);
    }
  };

  const save = async (): Promise<string | null> => {
    if (masterMode) return (await saveMaster()) ? master?.id ?? null : null;
    if (!parent) return null;
    if (!name.trim()) { notify("Nama varian wajib diisi.", "error"); return null; }
    setBusy(true);
    try {
      const res = variant
        ? await fetch("/api/admin/theme-variants", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: variant.id, name, description, overrides }) })
        : await fetch("/api/admin/theme-variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parentId: parent.id, name, description, overrides }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify([data.error, ...(data.details ?? [])].filter(Boolean).join(" ") || "Varian gagal disimpan.", "error");
        return null;
      }
      setSavedSnapshot(snapshot(name, description, overrides));
      if (!variant) {
        notify("Varian disimpan sebagai draf (belum tampil di katalog).", "success");
        router.replace(`/admin/theme-variants?id=${encodeURIComponent(data.id)}`);
        return data.id as string;
      }
      notify("Varian disimpan.", "success");
      return variant.id;
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async () => {
    if (!variant) return;
    if (dirty && !(await save())) return;
    const next = !variant.isActive;
    if (next && !(await confirm({ title: "Terbitkan varian?", message: "Varian tampil di katalog klien. Undangan yang memakai varian ini membekukan tampilannya saat dibuat; perubahan varian sesudahnya hanya berlaku untuk undangan baru.", confirmLabel: "Terbitkan" }))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/theme-variants", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: variant.id, isActive: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify(data.error || "Status varian gagal diubah.", "error"); return; }
      setVariant({ ...variant, isActive: data.isActive });
      notify(data.isActive ? "Varian terbit di katalog. Demo dan thumbnail sedang dibuat." : "Varian ditarik dari katalog.", "success");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!variant) return;
    if (!(await confirm({ title: "Hapus varian?", message: "Varian dihapus permanen. Master induknya tidak terpengaruh. Varian yang sudah dipakai undangan tidak bisa dihapus.", confirmLabel: "Hapus" }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/theme-variants?id=${encodeURIComponent(variant.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify(data.error || "Varian gagal dihapus.", "error"); return; }
      notify("Varian dihapus.", "success");
      router.push("/admin?tab=themes");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-800">{masterMode ? "Master tidak dapat dibuka" : "Varian tidak dapat dibuka"}</p>
          <p className="mt-1 text-[13px] text-stone-600">{loadError}</p>
          <a href="/admin?tab=themes" className="mt-4 inline-block rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white">Kembali ke katalog tema</a>
        </div>
      </div>
    );
  }

  const deviceWidth = DEVICES.find((d) => d.id === device)!.width;
  const scale = Math.min(1, (stageWidth - 32) / deviceWidth);

  return (
    <div className="flex h-screen flex-col bg-stone-100">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-stone-200 bg-white px-4 py-2.5">
        <a href="/admin?tab=themes" className="rounded-lg px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100">← Katalog</a>
        {masterMode ? (
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-500">Theme Builder · Mode Master</p>
            <p className="px-1 text-sm font-semibold text-stone-900">{master?.name ?? "…"}</p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-500">Varian dari {parent?.name ?? "…"}</p>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nama varian" aria-label="Nama varian" className="w-44 sm:w-64 rounded-md border border-transparent px-1 text-sm font-semibold text-stone-900 outline-none hover:border-stone-200 focus:border-amber-500" />
          </div>
        )}
        {(() => {
          const active = masterMode ? master?.isActive : variant?.isActive;
          const label = masterMode ? (master ? (master.isActive ? "Tayang" : "Nonaktif") : "") : variant ? (variant.isActive ? "Terbit" : "Draf") : "Belum disimpan";
          return (
            <span className={`ml-1 inline-flex items-center gap-1.5 text-[11px] font-medium ${active ? "text-emerald-700" : "text-stone-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-stone-400"}`} />
              {label}{dirty && (variant || masterMode) ? " · ada perubahan" : ""}
            </span>
          );
        })()}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg bg-stone-100 p-0.5">
            {DEVICES.map((d) => (
              <button key={d.id} type="button" onClick={() => setDevice(d.id)} aria-pressed={device === d.id} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${device === d.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>{d.label}</button>
            ))}
          </div>
          {variant && <button type="button" onClick={remove} disabled={busy} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer">Hapus</button>}
          {variant && (
            <button type="button" onClick={togglePublish} disabled={busy} className="rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50 cursor-pointer">
              {variant.isActive ? "Tarik dari katalog" : "Terbitkan"}
            </button>
          )}
          <button type="button" onClick={() => void save()} disabled={busy || (!dirty && (Boolean(variant) || masterMode))} className="rounded-xl bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-40 cursor-pointer">
            {variant || masterMode ? "Simpan" : "Simpan draf"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="max-h-[45vh] w-full shrink-0 overflow-y-auto border-b border-stone-200 bg-white md:max-h-none md:w-[340px] md:border-b-0 md:border-r lg:w-[380px]">
          <section className="border-b border-stone-200/80 px-5 py-4">
            {masterMode ? (
              <p className="text-[11.5px] leading-relaxed text-stone-600">
                Mode Master: menyunting <b>{master?.name}</b> tanpa blueprint, di atas desain aslinya. Yang bisa diubah: posisi, ukuran, putaran, dan tampil-sembunyi setiap elemen (HP dan desktop terpisah), sampul desktop layar penuh, warna, huruf, gambar bawaan, seksi yang tampil, dan CSS tambahan. Berkas master tidak ditimpa; undangan yang sudah dibuat tidak berubah.
              </p>
            ) : (
              <>
                <p className="text-[11.5px] leading-relaxed text-stone-600">
                  Varian memakai tata letak, ornamen, dan teks master <b>{parent?.name}</b>; hanya warna dan huruf yang diganti. Master aslinya tidak diubah. Ornamen berupa gambar dan warna di dalam skrip tidak ikut berganti warna.
                </p>
                <label className="mt-3 block text-[11.5px] font-semibold text-stone-600">
                  Deskripsi singkat
                  <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12.5px] text-stone-800 outline-none focus:border-amber-500" />
                </label>
              </>
            )}
            <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500">
              <span>{changedCount} perubahan dari {masterMode ? "desain asli" : "master"}</span>
              {changedCount > 0 && <button type="button" onClick={() => setOverrides(emptyOverrides())} className="font-semibold text-amber-700 hover:underline cursor-pointer">Kembalikan semua</button>}
            </div>
          </section>

          {masterMode && (() => {
            const view = viewFor(selected);
            const edit = selected ? editOf(selected, view) : DEFAULT_ELEMENT_EDIT;
            const viewLabel = view === "mobile" ? "HP" : view === "desktopSplit" ? "desktop, sampul split" : selected && isCoverSelector(selected) ? "desktop, sampul layar penuh" : "desktop";
            const editedList = Object.keys(overrides.elements ?? {});
            const slider = (label: string, key: "x" | "y" | "scale" | "rotate", [min, max]: readonly [number, number], step: number, unit: string) => (
              <label className="block text-[11px] font-semibold text-stone-600">
                <span className="flex justify-between"><span>{label}</span><span className="font-mono font-normal text-stone-500">{edit[key]}{unit}</span></span>
                <input type="range" min={min} max={max} step={step} value={edit[key]} onChange={(e) => selected && setElementEdit(selected, view, { [key]: Number(e.target.value) })} className="mt-1 w-full accent-stone-900" />
              </label>
            );
            return (
              <section className="border-b border-stone-200/80 px-5 py-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Tata letak elemen</h3>
                <p className="mt-1 text-[11px] text-stone-500">Klik elemen apa pun di pratinjau (teks, foto, potongan ilustrasi), lalu seret atau atur di bawah. Posisi HP dan Desktop disimpan terpisah.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setLayoutMode((v) => !v)} aria-pressed={layoutMode} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${layoutMode ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 text-stone-700"}`}>{layoutMode ? "Mode pilih elemen: aktif" : "Mode pilih elemen: mati"}</button>
                  <button type="button" onClick={() => setShowCover((v) => !v)} aria-pressed={!showCover} className="rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 cursor-pointer">{showCover ? "Sembunyikan sampul" : "Tampilkan sampul"}</button>
                </div>
                {device === "desktop" && (
                  <div className="mt-3 rounded-xl border border-stone-200 p-2.5">
                    <p className="text-[11px] font-semibold text-stone-700">Sampul desktop yang ditata</p>
                    <div className="mt-1.5 flex gap-1.5">
                      {(["full", "split"] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setCoverView(v)} aria-pressed={coverView === v} className={`flex-1 rounded-lg border px-2 py-1 text-[11px] font-semibold cursor-pointer ${coverView === v ? "border-amber-500 bg-amber-50 text-amber-900" : "border-stone-200 text-stone-600"}`}>{v === "full" ? "Layar penuh" : "Split"}</button>
                      ))}
                    </div>
                    <label className="mt-2 flex items-start gap-2 text-[11px] text-stone-600 cursor-pointer">
                      <input type="checkbox" checked={overrides.coverDesktop === "full"} onChange={(e) => setOverrides((prev) => { const next = { ...prev }; if (e.target.checked) next.coverDesktop = "full"; else delete next.coverDesktop; return next; })} className="mt-0.5 accent-stone-900" />
                      <span>Tampilkan sampul desktop layar penuh selama klien belum mengunggah foto sampul. Foto sampul portrait klien tetap membuat sampul split.</span>
                    </label>
                  </div>
                )}
                {selected ? (
                  <div className="mt-3 space-y-2.5 rounded-xl bg-stone-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[11px] font-semibold text-stone-800" title={selected}>{selected.split(" > ").pop()}</span>
                        <span className="block text-[10.5px] text-amber-800">Posisi khusus tampilan {viewLabel}</span>
                      </span>
                      <button type="button" onClick={() => setSelected(null)} className="text-[10.5px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer">Batal pilih</button>
                    </div>
                    {slider("Geser mendatar", "x", ELEMENT_LIMITS.x.map((n) => n / 3) as unknown as readonly [number, number], 0.5, "%")}
                    {slider("Geser tegak", "y", ELEMENT_LIMITS.y.map((n) => n / 3) as unknown as readonly [number, number], 0.5, "%")}
                    {slider("Ukuran", "scale", ELEMENT_LIMITS.scale, 0.05, "×")}
                    {slider("Putar", "rotate", ELEMENT_LIMITS.rotate, 1, "°")}
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-stone-600 cursor-pointer">
                      <input type="checkbox" checked={Boolean(edit.hidden)} onChange={(e) => setElementEdit(selected, view, { hidden: e.target.checked || undefined })} className="accent-stone-900" />
                      Sembunyikan di tampilan ini
                    </label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={selectParent} className="rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-700 hover:border-stone-400 cursor-pointer">Pilih elemen induk</button>
                      <button type="button" onClick={() => setElementEdit(selected, view, null)} className="rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-700 hover:border-stone-400 cursor-pointer">Kembalikan posisi asli</button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-stone-500">{layoutMode ? "Belum ada elemen terpilih." : "Aktifkan mode pilih elemen untuk memilih dari pratinjau. Saat mati, pratinjau bisa diklik seperti undangan (misalnya tombol Buka Undangan)."}</p>
                )}
                {editedList.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-stone-600">{editedList.length} elemen ditata</p>
                    <ul className="mt-1 space-y-1">
                      {editedList.map((s) => {
                        const found = !missingSelectors.includes(s);
                        return (
                          <li key={s} className="flex items-center gap-2 text-[11px]">
                            <button type="button" onClick={() => setSelected(s)} className={`min-w-0 flex-1 truncate text-left font-mono hover:underline cursor-pointer ${found ? "text-stone-700" : "text-red-700"}`} title={s}>{s.split(" > ").pop()}{found ? "" : " (tidak ditemukan di master)"}</button>
                            <span className="shrink-0 text-[10px] text-stone-400">{Object.keys(overrides.elements?.[s] ?? {}).map((v) => (v === "mobile" ? "HP" : v === "desktop" ? "Desktop" : "Split")).join(", ")}</span>
                            <button type="button" onClick={() => setOverrides((prev) => { const elements = { ...(prev.elements ?? {}) }; delete elements[s]; const next: MasterOverrides = { ...prev, elements }; if (!Object.keys(elements).length) delete next.elements; return next; })} className="shrink-0 text-[10.5px] font-semibold text-stone-500 hover:text-red-700 cursor-pointer">Hapus</button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            );
          })()}

          <section className="border-b border-stone-200/80 px-5 py-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Warna</h3>
            <p className="mt-1 text-[11px] text-stone-500">Setiap baris adalah satu warna asli master; mengubahnya mengganti semua tempat yang memakai warna itu. Urutan dari yang paling banyak dipakai.</p>

            <div className="mt-3 rounded-xl border border-stone-200 p-3">
              <p className="text-[11.5px] font-semibold text-stone-700">Warnai ulang dengan palet</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-stone-500">Rona diambil dari palet, terang-gelap tiap warna asli dipertahankan agar kontras teks dan latar master tetap. Hasilnya bisa disetel ulang per baris.</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {PALETTE_PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => applyPalette(p.palette)} className="flex items-center gap-2 rounded-lg border border-stone-200 px-2 py-1.5 text-left text-[11px] font-medium text-stone-700 hover:border-stone-400 cursor-pointer">
                    <span className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-stone-900/10">
                      {[p.palette.bgDark, p.palette.primary, p.palette.accent, p.palette.bgLight].map((c, i) => <span key={i} className="h-5 w-2.5" style={{ background: c }} />)}
                    </span>
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {unreadable.length > 0 && (
              <div role="status" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[11.5px] font-semibold text-red-800">{unreadable.length} teks menjadi sulit dibaca</p>
                <p className="mt-0.5 text-[10.5px] leading-snug text-red-700">Kontrasnya di bawah batas WCAG AA setelah warna diganti, padahal di master asli terbaca. Klik untuk menunjukkan di pratinjau.</p>
                <ul className="mt-2 space-y-1">
                  {unreadable.slice(0, 8).map((s) => (
                    <li key={s.key}>
                      <button type="button" onClick={() => showInPreview(s.el)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px] text-red-900 hover:bg-red-100 cursor-pointer">
                        <span className="min-w-0 flex-1 truncate">&ldquo;{s.text}&rdquo;</span>
                        <span className="shrink-0 font-mono text-[10.5px]">{s.ratio.toFixed(1)} / {s.min}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {unreadable.length > 8 && <p className="mt-1 text-[10.5px] text-red-700">+{unreadable.length - 8} teks lain</p>}
              </div>
            )}
            <button type="button" onClick={checkReadability} className="mt-2 text-[10.5px] font-semibold text-stone-500 hover:text-stone-800 hover:underline cursor-pointer">Periksa ulang keterbacaan bagian yang tampil</button>

            <div className="mt-3 space-y-1.5">
              {sortedGroups.filter((x) => showUnused || x.use.total > 0).map(({ g, use }) => {
                const current = overrides.colors[g.names[0]] ?? g.value;
                const changed = current !== g.value;
                return (
                  <div key={g.value} className="flex items-center gap-2.5 rounded-xl px-1 py-1 hover:bg-stone-50">
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-stone-900/10" style={{ background: current }}>
                      <input type="color" value={current} onChange={(e) => setGroupColor(g, e.target.value.toLowerCase())} aria-label={`Warna ${g.value}`} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-stone-800" title={g.names.join(", ")}>{groupLabel(g.names)}</span>
                      <span className="block truncate text-[10.5px] text-stone-500">
                        {use.total > 0 ? use.parts.map(([label, n]) => `${label} ${n}`).join(" · ") : "Tidak dipakai di CSS master"} · asli <span className="font-mono">{g.value}</span>
                      </span>
                    </span>
                    <input
                      value={current}
                      onChange={(e) => { const v = e.target.value.trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(v)) setGroupColor(g, v); }}
                      aria-label={`Hex ${g.value}`}
                      spellCheck={false}
                      className="w-[76px] rounded-lg border border-stone-200 px-2 py-1 font-mono text-[11px] text-stone-700 outline-none focus:border-amber-500"
                    />
                    {changed && <button type="button" onClick={() => setGroupColor(g, g.value)} className="text-[10.5px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer" title="Kembalikan warna asli">Asli</button>}
                  </div>
                );
              })}
            </div>
            {unusedCount > 0 && (
              <button type="button" onClick={() => setShowUnused((v) => !v)} className="mt-2 text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer">
                {showUnused ? "Sembunyikan" : "Tampilkan"} {unusedCount} warna yang tidak dipakai CSS master
              </button>
            )}
          </section>

          <section className="px-5 py-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Huruf</h3>
            <div className="mt-3 space-y-3">
              {fontFamilies.map((f) => {
                const current = overrides.fonts[f.names[0]] ?? "";
                return (
                  <div key={f.family}>
                    <label className="block text-[11.5px] font-semibold text-stone-700">
                      {f.family} <span className="font-normal text-stone-500">({f.names.length} tempat)</span>
                      <select
                        value={current}
                        onChange={(e) => setFamilyFont(f.names, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[12px] text-stone-800 outline-none focus:border-amber-500"
                      >
                        <option value="">Asli ({f.family})</option>
                        {FONT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        {current && isGoogleFontId(current) && <option value={current}>{fontLabel(current)} (Google)</option>}
                      </select>
                    </label>
                    {pickerFor === f.family ? (
                      <div className="mt-2 rounded-lg border border-stone-200 p-2">
                        <GoogleFontPicker onPick={(id) => { setFamilyFont(f.names, id); setPickerFor(null); }} />
                        <button type="button" onClick={() => setPickerFor(null)} className="mt-1 text-[11px] font-semibold text-stone-500 hover:underline cursor-pointer">Tutup</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setPickerFor(f.family)} className="mt-1 text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer">Cari di Google Fonts…</button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {masterMode && (
            <>
              <section className="border-t border-stone-200/80 px-5 py-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Gambar bawaan</h3>
                <p className="mt-1 text-[11px] text-stone-500">Latar, ornamen, dan bingkai yang dipakai master. Gambar pengganti diunggah ke pustaka builder (PNG, WebP, atau JPEG) dan mengganti setiap tempat gambar asli dipakai.</p>
                {imageRefs.length === 0 ? (
                  <p className="mt-3 text-[11px] text-stone-500">Master ini tidak memakai gambar bawaan; ornamennya digambar langsung di kode.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {imageRefs.map((ref) => {
                      const current = overrides.images?.[ref.path];
                      return (
                        <li key={ref.path} className="flex items-center gap-2.5 rounded-xl px-1 py-1 hover:bg-stone-50">
                          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-900/10">
                            <img src={current ?? ref.path} alt="" className="h-full w-full object-contain" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-semibold text-stone-800" title={ref.path}>{ref.path.split("/").pop()}</span>
                            <span className="block text-[10.5px] text-stone-500">{ref.count} tempat{current ? " · diganti" : ""}</span>
                          </span>
                          <label className={`shrink-0 rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-700 hover:border-stone-400 ${uploadingFor ? "opacity-50" : "cursor-pointer"}`}>
                            {uploadingFor === ref.path ? "Mengunggah…" : "Ganti"}
                            <input type="file" accept="image/png,image/webp,image/jpeg" className="hidden" disabled={Boolean(uploadingFor)} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadImage(ref.path, f); }} />
                          </label>
                          {current && <button type="button" onClick={() => setImage(ref.path, null)} className="text-[10.5px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer">Asli</button>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="border-t border-stone-200/80 px-5 py-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Seksi yang tampil</h3>
                <p className="mt-1 text-[11px] text-stone-500">Seksi yang dimatikan disembunyikan beserta tautan menunya.</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {sections.map((id) => {
                    const visible = !overrides.hiddenSections?.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2 rounded-lg border border-stone-200 px-2 py-1.5 text-[11.5px] text-stone-700 cursor-pointer">
                        <input type="checkbox" checked={visible} onChange={(e) => toggleSection(id, e.target.checked)} className="accent-stone-900" />
                        <span className={`truncate font-mono ${visible ? "" : "text-stone-400 line-through"}`}>{id}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="border-t border-stone-200/80 px-5 py-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">CSS tambahan</h3>
                <p className="mt-1 text-[11px] text-stone-500">Penyesuaian halus, aturan yang sama dengan CSS kustom Theme Builder: warna lewat <span className="font-mono">var(--…)</span> atau <span className="font-mono">color-mix()</span>, tanpa hex, url(), atau @import.</p>
                <textarea
                  value={overrides.css ?? ""}
                  onChange={(e) => setCss(e.target.value)}
                  rows={6}
                  spellCheck={false}
                  aria-label="CSS tambahan"
                  placeholder=".sec-title { letter-spacing: 0.08em; }"
                  className={`mt-2 w-full rounded-lg border px-2.5 py-2 font-mono text-[11.5px] text-stone-800 outline-none ${cssError ? "border-red-300 focus:border-red-500" : "border-stone-200 focus:border-amber-500"}`}
                />
                {cssError && <p className="mt-1 text-[11px] text-red-700">{cssError}</p>}
              </section>
            </>
          )}
        </aside>

        <div ref={stageRef} className="relative flex min-w-0 flex-1 justify-center overflow-auto p-4">
          {previewHtml ? (
            <div style={{ width: deviceWidth * scale, height: 820 * scale }} className="shrink-0">
              <iframe
                ref={iframeRef}
                title="Pratinjau varian"
                srcDoc={previewHtml}
                onLoad={() => { applyToPreview(); attachLayoutHandlers(); }}
                style={{ width: deviceWidth, height: 820, transform: `scale(${scale})`, transformOrigin: "top left" }}
                className="rounded-xl border border-stone-300 bg-white shadow-lg"
              />
            </div>
          ) : (
            <p className="self-center text-sm text-stone-500">Memuat pratinjau…</p>
          )}
        </div>
      </div>
    </div>
  );
}
