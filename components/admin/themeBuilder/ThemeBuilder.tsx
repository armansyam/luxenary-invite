"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/ui/Feedback";
import {
  MAX_ORNAMENTS,
  MAX_ORNAMENTS_PER_SECTION,
  ORNAMENT_SECTIONS,
  SECTION_LABELS,
  VARIANT_GROUPS,
  BLOCK_LIMITS,
  BUILDER_BLOCKS,
  DEFAULT_BLOCK_PROPS,
  DEFAULT_ORNAMENT_GAP,
  DEFAULT_ORNAMENT_TEXT,
  DEFAULT_PHOTO_FRAME,
  FRAMED_PHOTOS,
  defaultBuilderSpec,
  fontLabel,
  isDefaultBlock,
  isDefaultFrame,
  isStackPeer,
  moveOrnament,
  type StackMove,
  type BlockProps,
  type BuilderBlockId,
  type FramedPhotoId,
  type PhotoFrame,
  type BuilderOrnament,
  type BuilderSpec,
  type OrnamentSection,
} from "@/lib/themeBuilder/spec";
import BuilderPreview, { DEVICE_SIZES, type PreviewActions, type PreviewDevice, type PreviewDropTarget } from "@/components/admin/themeBuilder/BuilderPreview";
import OrnamentInspector, { type OrnamentPlacement } from "@/components/admin/themeBuilder/OrnamentInspector";
import BlockInspector from "@/components/admin/themeBuilder/BlockInspector";
import {
  ColorsPanel,
  LayoutPanel,
  MotionPanel,
  OrnamentsPanel,
  PANEL_TABS,
  PublishPanel,
  TextsPanel,
  TypePanel,
  type AssetLibrary,
  type MusicOption,
  type PanelId,
  type RevisionRow,
  type ThemeMeta,
} from "@/components/admin/themeBuilder/BuilderPanels";

type Issue = { code: string; message: string };

const HISTORY_LIMIT = 60;
const PREVIEW_DEBOUNCE_MS = 400;

const newOrnamentId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join("");

/** Bagian spesifikasi yang mengubah HTML master; geser/ukur ornamen cukup diterapkan langsung ke pratinjau. */
function structuralKey(spec: BuilderSpec): string {
  // Posisi ornamen dan properti blok diterapkan langsung ke pratinjau saat menyeret, jadi tidak memicu muat ulang.
  // Bingkai foto juga diterapkan langsung lewat gaya di dokumen pratinjau.
  // Isi, huruf, ukuran, dan warna teks hias juga diterapkan langsung; hanya jenis (teks atau gambar) dan tempat menempel yang mengubah HTML.
  return JSON.stringify({ ...spec, blocks: {}, frames: {}, ornaments: spec.ornaments.map((o) => [o.id, o.src, o.section, o.layer, o.attach ?? "", o.before ?? "", o.text ? 1 : 0]) });
}

/** Posisi ornamen di antara ornamen sejenis (wadah dan lapisan sama); 0 adalah paling belakang. */
function stackOf(ornaments: BuilderOrnament[], o: BuilderOrnament): { index: number; count: number } {
  const peers = ornaments.filter((p) => isStackPeer(p, o));
  return { index: peers.findIndex((p) => p.id === o.id), count: peers.length };
}

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

export default function ThemeBuilder({ themeId }: { themeId: string | null }) {
  const router = useRouter();
  const { notify, confirm } = useFeedback();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spec, setSpec] = useState<BuilderSpec>(defaultBuilderSpec);
  // Salinan terbaru untuk pengendali seret dan pintasan keyboard; setiap setSpec di komponen ini memperbaruinya juga.
  const specRef = useRef<BuilderSpec>(spec);
  const [meta, setMeta] = useState<ThemeMeta>({ id: "", name: "", category: "modern", description: "", defaultMusicUrl: "" });
  const [isNew, setIsNew] = useState(!themeId);
  const [isActive, setIsActive] = useState(false);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);

  // Riwayat di ref: updater setState dijalankan dua kali di StrictMode, sehingga riwayat di state bisa tergandakan.
  const history = useRef<{ past: BuilderSpec[]; future: BuilderSpec[] }>({ past: [], future: [] });
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });
  const syncHistory = useCallback(() => setHistorySize({ past: history.current.past.length, future: history.current.future.length }), []);
  const liveBase = useRef<BuilderSpec | null>(null);
  /** Penanda versi tema saat dibuka atau terakhir disimpan; server menolak simpan bila admin lain sudah mengubahnya. */
  const etag = useRef("");
  const allowLeave = useRef(false);

  const [panel, setPanel] = useState<PanelId>("colors");
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [previewMode, setPreviewMode] = useState<"demo" | "client">("demo");
  const [viewSection, setViewSection] = useState<OrnamentSection>("cover");
  const [jump, setJump] = useState<{ section: OrnamentSection; nonce: number }>({ section: "cover", nonce: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BuilderBlockId | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);

  const [html, setHtml] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [library, setLibrary] = useState<AssetLibrary | null>(null);
  const [uploading, setUploading] = useState(false);
  const [wideEnough, setWideEnough] = useState(true);
  const dropTarget = useRef<PreviewDropTarget | null>(null);
  const actionsRef = useRef<PreviewActions | null>(null);
  const [ghost, setGhost] = useState<{ src: string; x: number; y: number } | null>(null);

  const snapshot = useCallback((s: BuilderSpec, m: ThemeMeta) => JSON.stringify({ s, m: { ...m, name: m.name.trim(), description: m.description.trim() } }), []);
  const dirty = loaded && snapshot(spec, meta) !== saved;

  useEffect(() => {
    // Contoh huruf di panel memakai font lokal yang sama dengan undangan.
    if (document.getElementById("lux-builder-fonts")) return;
    const link = document.createElement("link");
    link.id = "lux-builder-fonts";
    link.rel = "stylesheet";
    link.href = "/fonts/fonts.css";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const check = () => setWideEnough(window.innerWidth >= 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Setelah draf baru tersimpan, URL berganti ke ?id=...; rancangan di layar sudah sama dengan yang tersimpan.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (themeId && loadedFor.current === themeId) return;
    (async () => {
      if (!themeId) {
        const initial = defaultBuilderSpec();
        const initialMeta: ThemeMeta = { id: "", name: "", category: "modern", description: "", defaultMusicUrl: "" };
        setSaved(snapshot(initial, initialMeta));
        setLoaded(true);
        return;
      }
      const res = await fetch(`/api/admin/theme-builder?id=${encodeURIComponent(themeId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(data.error || "Tema gagal dimuat.");
        return;
      }
      const m: ThemeMeta = { id: data.theme.id, name: data.theme.name, category: data.theme.category, description: data.theme.description || "", defaultMusicUrl: data.theme.defaultMusicUrl || "" };
      specRef.current = data.spec;
      setSpec(data.spec);
      setMeta(m);
      etag.current = typeof data.etag === "string" ? data.etag : "";
      setIsActive(Boolean(data.theme.isActive));
      setIsNew(false);
      setSaved(snapshot(data.spec, m));
      loadedFor.current = m.id;
      setLoaded(true);
    })().catch(() => !cancelled && setLoadError("Tema gagal dimuat. Periksa koneksi lalu muat ulang halaman."));
    return () => { cancelled = true; };
  }, [themeId, snapshot]);

  const loadLibrary = useCallback(async () => {
    const res = await fetch("/api/admin/theme-builder/assets", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setLibrary({ uploads: data.uploads, builtin: data.builtin });
    else notify(data.error || "Pustaka ornamen gagal dimuat.", "error");
  }, [notify]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const [music, setMusic] = useState<MusicOption[] | null>(null);
  useEffect(() => {
    fetch("/api/public/music", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setMusic(Array.isArray(data.music) ? data.music : []))
      .catch(() => notify("Daftar musik gagal dimuat.", "error"));
  }, [notify]);

  const [revisions, setRevisions] = useState<RevisionRow[] | null>(null);
  const loadRevisions = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/theme-builder?revisions=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setRevisions(data.revisions);
    else notify(data.error || "Riwayat versi gagal dimuat.", "error");
  }, [notify]);

  useEffect(() => {
    if (loaded && !isNew && meta.id) void loadRevisions(meta.id);
  }, [loaded, isNew, meta.id, loadRevisions]);

  const duplicateTheme = useCallback(async () => {
    if (!meta.id) return;
    const ok = await confirm({ title: "Duplikat tema ini?", message: `Salinan dibuat dari versi ${meta.name} yang sudah tersimpan sebagai draf baru. Perubahan yang belum disimpan tidak ikut.`, confirmLabel: "Duplikat" });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme-builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duplicateFrom: meta.id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.error || "Tema gagal diduplikat.", "error");
      allowLeave.current = true;
      notify(`Salinan "${data.theme.name}" dibuat sebagai draf.`, "success");
      router.push(`/admin/theme-builder?id=${encodeURIComponent(data.theme.id)}`);
    } catch {
      notify("Tema gagal diduplikat. Periksa koneksi.", "error");
    } finally {
      setSaving(false);
    }
  }, [confirm, meta.id, meta.name, notify, router]);

  const exportTheme = useCallback(() => {
    if (!meta.id) return;
    const link = document.createElement("a");
    link.href = `/api/admin/theme-builder?export=${encodeURIComponent(meta.id)}`;
    link.download = `${meta.id}.luxtheme.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [meta.id]);

  const importInput = useRef<HTMLInputElement | null>(null);
  /** Mengisi rancangan baru dari berkas ekspor; gambar dipulihkan server lebih dulu agar URL di spesifikasi tidak patah. */
  const importTheme = useCallback(async (file: File) => {
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      return notify("Berkas bukan JSON yang valid.", "error");
    }
    const res = await fetch("/api/admin/theme-builder/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(raw) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return notify(data.details?.[0] || data.error || "Berkas gagal diimpor.", "error");
    history.current = { past: [], future: [] };
    syncHistory();
    specRef.current = data.spec;
    setSpec(data.spec);
    setMeta((m) => ({ ...m, name: data.theme.name, category: data.theme.category, description: data.theme.description, defaultMusicUrl: data.theme.defaultMusicUrl }));
    void loadLibrary();
    const notes = [
      `${data.assets.written + data.assets.existing} gambar dipulihkan`,
      data.missingAssets.length ? `${data.missingAssets.length} gambar tidak ada di berkas dan tampil kosong` : "",
      data.musicDropped ? "musik bawaan tidak ada di pustaka server ini dan dilepas" : "",
    ].filter(Boolean);
    notify(`Rancangan diimpor: ${notes.join("; ")}. Isi nama lalu simpan sebagai draf.`, data.missingAssets.length ? "error" : "success");
  }, [loadLibrary, notify, syncHistory]);

  const structure = useMemo(() => structuralKey(spec), [spec]);
  useEffect(() => {
    if (!loaded) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/admin/theme-builder/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec: specRef.current, mode: previewMode }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setIssues((data.details || [data.error || "Pratinjau gagal dibuat."]).map((message: string) => ({ code: "spec", message })));
          return;
        }
        setHtml(data.html);
        setLabels(data.labels || {});
        setIssues(data.issues || []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") notify("Pratinjau gagal dimuat. Periksa koneksi.", "error");
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [structure, loaded, notify, previewMode]);

  /** "live" mengubah tampilan tanpa riwayat (saat menyeret); "commit" mencatat satu langkah undo. */
  const apply = useCallback((next: BuilderSpec, mode: "live" | "commit") => {
    if (mode === "live") {
      if (!liveBase.current) liveBase.current = specRef.current;
      specRef.current = next;
      setSpec(next);
      return;
    }
    const base = liveBase.current ?? specRef.current;
    liveBase.current = null;
    if (JSON.stringify(base) !== JSON.stringify(next)) {
      history.current = { past: [...history.current.past.slice(-(HISTORY_LIMIT - 1)), base], future: [] };
      syncHistory();
    }
    specRef.current = next;
    setSpec(next);
  }, [syncHistory]);

  const patchSpec = useCallback((patch: Partial<BuilderSpec>) => apply({ ...specRef.current, ...patch }, "commit"), [apply]);

  /** Memuat versi lama ke editor sebagai perubahan biasa (bisa diurungkan); baru berlaku setelah disimpan. */
  const restoreRevision = useCallback(async (revisionId: string) => {
    const ok = await confirm({ title: "Muat versi ini ke editor?", message: "Rancangan di editor diganti dengan versi tersebut. Nama dan musik tidak berubah. Perubahan baru berlaku setelah Anda menyimpan, dan bisa diurungkan dengan Ctrl+Z.", confirmLabel: "Muat" });
    if (!ok) return;
    const res = await fetch(`/api/admin/theme-builder?revision=${encodeURIComponent(revisionId)}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return notify(data.error || "Versi gagal dimuat.", "error");
    apply(data.spec, "commit");
    notify("Versi lama dimuat ke editor. Simpan untuk memakainya.", "info");
  }, [apply, confirm, notify]);

  const undo = useCallback(() => {
    const { past, future } = history.current;
    if (!past.length) return;
    const prev = past[past.length - 1];
    history.current = { past: past.slice(0, -1), future: [specRef.current, ...future] };
    specRef.current = prev;
    setSpec(prev);
    syncHistory();
  }, [syncHistory]);

  const redo = useCallback(() => {
    const { past, future } = history.current;
    if (!future.length) return;
    const next = future[0];
    history.current = { past: [...past, specRef.current], future: future.slice(1) };
    specRef.current = next;
    setSpec(next);
    syncHistory();
  }, [syncHistory]);

  const updateOrnament = useCallback((id: string, patch: Partial<BuilderOrnament>, final: boolean) => {
    const next = { ...specRef.current, ornaments: specRef.current.ornaments.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
    apply(next, final ? "commit" : "live");
  }, [apply]);

  const [legacyThemes, setLegacyThemes] = useState<Array<{ id: string; name: string }> | null>(null);

  const loadLegacyThemes = useCallback(async () => {
    if (legacyThemes) return;
    const res = await fetch("/api/admin/theme-builder?legacy=1", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setLegacyThemes(data.themes);
    else notify(data.error || "Daftar tema lama gagal dimuat.", "error");
  }, [legacyThemes, notify]);

  useEffect(() => {
    if (isNew && loaded) void loadLegacyThemes();
  }, [isNew, loaded, loadLegacyThemes]);

  /** Isi rancangan baru dari palet dan latar tema tulisan tangan; master lama tidak disentuh. */
  const startFromLegacy = useCallback(async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/admin/theme-builder?from=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return notify(data.error || "Tema lama gagal dibaca.", "error");
    history.current = { past: [], future: [] };
    syncHistory();
    specRef.current = data.spec;
    setSpec(data.spec);
    setMeta((m) => ({ ...m, name: data.theme.name, category: data.theme.category, description: data.theme.description, defaultMusicUrl: data.theme.defaultMusicUrl || "" }));
    const r = data.report as { source: string; found: string[]; missing: string[]; fontsFound: string[]; mediaFound: number; hexOutsideRoot: number };
    notify(`Titik awal dari ${r.source}: ${r.found.length} dari ${r.found.length + r.missing.length} warna palet, ${r.fontsFound.length} dari 3 huruf, dan ${r.mediaFound} media bawaan terbaca${r.hexOutsideRoot ? `; ${r.hexOutsideRoot} warna lain di tema lama ditulis mati dan tidak ikut` : ""}. Tata letak mengikuti blueprint.`, "info");
  }, [notify, syncHistory]);

  const updateBlock = useCallback((id: BuilderBlockId, patch: Partial<BlockProps>, final: boolean) => {
    const current = specRef.current;
    const merged = { ...(current.blocks[id] ?? DEFAULT_BLOCK_PROPS), ...patch };
    const blocks = { ...current.blocks };
    if (isDefaultBlock(merged)) delete blocks[id];
    else blocks[id] = merged;
    apply({ ...current, blocks }, final ? "commit" : "live");
  }, [apply]);

  const resetBlock = useCallback((id: BuilderBlockId) => {
    const blocks = { ...specRef.current.blocks };
    delete blocks[id];
    apply({ ...specRef.current, blocks }, "commit");
  }, [apply]);

  const updateFrame = useCallback((id: FramedPhotoId, patch: Partial<PhotoFrame>, final: boolean) => {
    const current = specRef.current;
    const merged = { ...(current.frames[id] ?? DEFAULT_PHOTO_FRAME), ...patch };
    const frames = { ...current.frames };
    if (isDefaultFrame(merged)) delete frames[id];
    else frames[id] = merged;
    apply({ ...current, frames }, final ? "commit" : "live");
  }, [apply]);

  const centerBlock = useCallback((id: BuilderBlockId) => {
    const x = actionsRef.current?.centerBlockX(id);
    if (x === null || x === undefined) return notify("Blok belum tampil di pratinjau. Pilih seksinya dulu.", "info");
    updateBlock(id, { x }, true);
  }, [notify, updateBlock]);

  /** Memindah ornamen di antara ornamen sejenis (seksi dan lapisan sama); urutan larik adalah urutan tumpukan DOM. */
  const reorderOrnament = useCallback((id: string, move: StackMove) => {
    const moved = moveOrnament(specRef.current.ornaments, id, move);
    if (moved !== specRef.current.ornaments) apply({ ...specRef.current, ornaments: moved }, "commit");
  }, [apply]);

  const selectBlock = useCallback((id: BuilderBlockId | null) => {
    setSelectedBlock(id);
    if (id) {
      setSelectedId(null);
      setPanel("layout");
      if ((FRAMED_PHOTOS as readonly string[]).includes(id) && !library) void loadLibrary();
    }
  }, [library, loadLibrary]);

  const focusSection = useCallback((section: OrnamentSection) => {
    if (section === "sidebar") setDevice("desktop");
    setViewSection(section);
    setJump((j) => ({ section, nonce: j.nonce + 1 }));
  }, []);

  const addOrnament = useCallback((src: string, section: OrnamentSection, x = 50, y = 50) => {
    const current = specRef.current;
    if (current.ornaments.length >= MAX_ORNAMENTS) return notify(`Paling banyak ${MAX_ORNAMENTS} ornamen per tema.`, "error");
    if (current.ornaments.filter((o) => o.section === section).length >= MAX_ORNAMENTS_PER_SECTION) {
      return notify(`Seksi ${SECTION_LABELS[section]} sudah berisi ${MAX_ORNAMENTS_PER_SECTION} ornamen.`, "error");
    }
    const ornament: BuilderOrnament = { id: newOrnamentId(), section, src, x, y, anchor: "top", width: 32, rotate: 0, opacity: 1, flipX: false, layer: "back" };
    apply({ ...current, ornaments: [...current.ornaments, ornament] }, "commit");
    setSelectedId(ornament.id);
    setPanel("ornaments");
    if (section === "sidebar" && device !== "desktop") setDevice("desktop");
  }, [apply, device, notify]);

  const addTextOrnament = useCallback((section: OrnamentSection) => {
    const current = specRef.current;
    if (current.ornaments.length >= MAX_ORNAMENTS) return notify(`Paling banyak ${MAX_ORNAMENTS} ornamen per tema.`, "error");
    if (current.ornaments.filter((o) => o.section === section).length >= MAX_ORNAMENTS_PER_SECTION) {
      return notify(`Seksi ${SECTION_LABELS[section]} sudah berisi ${MAX_ORNAMENTS_PER_SECTION} ornamen.`, "error");
    }
    // Sampul, panel kiri, dan penutup berlatar foto gelap; di sana teks primary hampir tak terbaca.
    const onPhoto = section === "cover" || section === "sidebar" || section === "closing";
    const ornament: BuilderOrnament = { id: newOrnamentId(), section, src: "", x: 50, y: 50, anchor: "top", width: 60, rotate: 0, opacity: 1, flipX: false, layer: "front", text: { ...DEFAULT_ORNAMENT_TEXT, color: onPhoto ? "on-dark" : DEFAULT_ORNAMENT_TEXT.color } };
    apply({ ...current, ornaments: [...current.ornaments, ornament] }, "commit");
    setSelectedId(ornament.id);
    setPanel("ornaments");
    if (section === "sidebar" && device !== "desktop") setDevice("desktop");
  }, [apply, device, notify]);

  /**
   * Mengubah cara ornamen ditempatkan: bebas di seksi, menempel ke blok, atau sebaris sebelum blok. Acuan posisi dan
   * ukuran berganti (seksi, kotak blok, atau kolom), jadi ornamen dikembalikan ke tengah dengan lebar sedang daripada
   * terlempar ke luar acuannya.
   */
  const placeOrnament = useCallback((id: string, placement: OrnamentPlacement) => {
    const current = specRef.current;
    const source = current.ornaments.find((o) => o.id === id);
    if (!source) return;
    const block = placement.mode === "free" ? null : placement.block;
    if (placement.mode === "attach" && source.attach === block) return;
    if (placement.mode === "flow" && source.before === block) return;
    if (placement.mode === "free" && !source.attach && !source.before) return;
    const section = block ? BUILDER_BLOCKS.find((b) => b.id === block)!.section : source.section;
    if (section !== source.section && current.ornaments.filter((o) => o.section === section).length >= MAX_ORNAMENTS_PER_SECTION) {
      return notify(`Seksi ${SECTION_LABELS[section]} sudah berisi ${MAX_ORNAMENTS_PER_SECTION} ornamen.`, "error");
    }
    const moved: BuilderOrnament = { ...source, section, x: 50, y: 50, anchor: "top", width: placement.mode === "free" ? 32 : placement.mode === "attach" ? 50 : 40 };
    delete moved.attach;
    delete moved.before;
    delete moved.gap;
    if (placement.mode === "attach") moved.attach = placement.block;
    if (placement.mode === "flow") {
      moved.before = placement.block;
      moved.gap = DEFAULT_ORNAMENT_GAP;
      moved.layer = "back";
    }
    apply({ ...current, ornaments: current.ornaments.map((o) => (o.id === id ? moved : o)) }, "commit");
  }, [apply, notify]);

  /**
   * Seret ornamen dari pustaka ke pratinjau. Pointer ditangkap tombol pustaka sehingga gerakan di atas iframe tetap
   * sampai ke sini; tanpa gerakan berarti klik, dan ornamen ditaruh di tengah seksi yang sedang tampil.
   */
  const startLibraryDrag = useCallback((src: string, e: ReactPointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY };
    const section = viewSection;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 5) dragging = true;
      if (!dragging) return;
      setGhost({ src, x: ev.clientX, y: ev.clientY });
      dropTarget.current?.setHover(Boolean(dropTarget.current.locate(ev.clientX, ev.clientY)));
    };
    const end = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      setGhost(null);
      dropTarget.current?.setHover(false);
      if (ev.type === "pointercancel") return;
      if (!dragging) return addOrnament(src, section);
      const hit = dropTarget.current?.locate(ev.clientX, ev.clientY);
      if (hit) addOrnament(src, hit.section, hit.x, hit.y);
      else notify("Lepaskan ornamen di atas pratinjau undangan.", "info");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }, [addOrnament, notify, viewSection]);

  const removeOrnament = useCallback((id: string) => {
    apply({ ...specRef.current, ornaments: specRef.current.ornaments.filter((o) => o.id !== id) }, "commit");
    setSelectedId(null);
  }, [apply]);

  const duplicateOrnament = useCallback((id: string) => {
    const source = specRef.current.ornaments.find((o) => o.id === id);
    if (!source) return;
    if (specRef.current.ornaments.length >= MAX_ORNAMENTS) return notify(`Paling banyak ${MAX_ORNAMENTS} ornamen per tema.`, "error");
    // Salinan dicerminkan ke sisi seberang: pola paling umum untuk ornamen sudut dan bunga.
    const copy: BuilderOrnament = { ...source, id: newOrnamentId(), x: Math.round((100 - source.x) * 10) / 10, flipX: !source.flipX, rotate: -source.rotate };
    apply({ ...specRef.current, ornaments: [...specRef.current.ornaments, copy] }, "commit");
    setSelectedId(copy.id);
  }, [apply, notify]);

  const save = useCallback(async () => {
    if (meta.name.trim().length < 2) {
      setPanel("publish");
      return notify("Isi nama tema terlebih dahulu.", "error");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme-builder", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: meta.id || undefined, name: meta.name.trim(), category: meta.category, description: meta.description.trim(), defaultMusicUrl: meta.defaultMusicUrl, spec, baseEtag: etag.current || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.issues) setIssues(data.issues);
        notify(data.details?.[0] || data.error || "Tema gagal disimpan.", "error");
        return;
      }
      etag.current = typeof data.etag === "string" ? data.etag : "";
      const m: ThemeMeta = { id: data.theme.id, name: data.theme.name, category: data.theme.category, description: data.theme.description || "", defaultMusicUrl: data.theme.defaultMusicUrl || "" };
      setMeta(m);
      setIsActive(Boolean(data.theme.isActive));
      setSaved(snapshot(spec, m));
      if (!isNew) void loadRevisions(m.id);
      if (isNew) {
        setIsNew(false);
        loadedFor.current = m.id;
        router.replace(`/admin/theme-builder?id=${encodeURIComponent(m.id)}`, { scroll: false });
        notify("Draf tema tersimpan. Terbitkan saat sudah siap tampil di katalog.", "success");
      } else {
        notify(isActive ? "Perubahan tersimpan dan demo katalog diperbarui." : "Perubahan tersimpan.", "success");
      }
    } catch {
      notify("Tema gagal disimpan. Periksa koneksi.", "error");
    } finally {
      setSaving(false);
    }
  }, [isActive, isNew, loadRevisions, meta, notify, router, snapshot, spec]);

  const publish = useCallback(async (active: boolean) => {
    if (!active) {
      const ok = await confirm({ title: "Tarik tema dari katalog?", message: "Klien baru tidak bisa memilih tema ini. Undangan yang sudah memakainya tetap berjalan.", confirmLabel: "Tarik", danger: true });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme-builder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: meta.id, isActive: active }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.issues) setIssues(data.issues);
        notify(data.error || "Status terbit gagal diubah.", "error");
        return;
      }
      setIsActive(Boolean(data.theme.isActive));
      notify(active ? "Tema tayang di katalog. Lengkapi foto demo dan thumbnail di Demo Studio." : "Tema ditarik dari katalog.", "success");
    } catch {
      notify("Status terbit gagal diubah. Periksa koneksi.", "error");
    } finally {
      setSaving(false);
    }
  }, [confirm, meta.id, notify]);

  const uploadAssets = useCallback(async (files: FileList) => {
    setUploading(true);
    let lastUrl = "";
    let lastOpaque = false;
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/theme-builder/assets", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) notify(`${file.name}: ${data.error || "gagal diunggah."}`, "error");
        else { lastUrl = data.url; lastOpaque = Boolean(data.opaque); }
      }
      await loadLibrary();
      if (lastUrl) {
        notify(
          lastOpaque
            ? "Gambar tanpa transparansi masuk ke pilihan Tekstur latar dan Media bawaan di tab Warna."
            : "Gambar bertransparansi masuk ke pustaka ornamen dan bingkai. Seret ke pratinjau untuk memakainya.",
          "success",
        );
      }
    } finally {
      setUploading(false);
    }
  }, [loadLibrary, notify]);

  const deleteAsset = useCallback(async (url: string) => {
    if (specRef.current.ornaments.some((o) => o.src === url)) return notify("Ornamen ini masih dipakai di rancangan yang sedang dibuka.", "error");
    const ok = await confirm({ title: "Hapus ornamen dari pustaka?", message: "Hanya bisa dihapus bila tidak dipakai tema atau undangan mana pun.", confirmLabel: "Hapus", danger: true });
    if (!ok) return;
    const res = await fetch(`/api/admin/theme-builder/assets?url=${encodeURIComponent(url)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return notify(data.usage?.length ? `${data.error} Dipakai di: ${data.usage.slice(0, 3).join(", ")}.` : data.error || "Ornamen gagal dihapus.", "error");
    await loadLibrary();
  }, [confirm, loadLibrary, notify]);

  const selected = spec.ornaments.find((o) => o.id === selectedId) ?? null;

  const handleKey = useCallback((e: KeyboardEvent): boolean => {
    const mod = e.metaKey || e.ctrlKey;
    const target = e.target as HTMLElement | null;
    const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    if (mod && e.key.toLowerCase() === "s") { save(); return true; }
    if (typing) return false;
    if (mod && e.key.toLowerCase() === "z") { if (e.shiftKey) redo(); else undo(); return true; }
    if (mod && e.key.toLowerCase() === "y") { redo(); return true; }
    if (selectedBlock && !selectedId) {
      if (e.key === "Escape") { setSelectedBlock(null); return true; }
      if (e.key === "Delete" || e.key === "Backspace") { resetBlock(selectedBlock); return true; }
      const cur = specRef.current.blocks[selectedBlock] ?? DEFAULT_BLOCK_PROPS;
      const nudge = e.shiftKey ? 2 : 0.5;
      const clampTo = (v: number, [min, max]: readonly [number, number]) => Math.round(Math.max(min, Math.min(max, v)) * 10) / 10;
      const blockMoves: Record<string, Partial<BlockProps>> = {
        ArrowLeft: { x: clampTo(cur.x - nudge, BLOCK_LIMITS.x) },
        ArrowRight: { x: clampTo(cur.x + nudge, BLOCK_LIMITS.x) },
        ArrowUp: { y: clampTo(cur.y - nudge, BLOCK_LIMITS.y) },
        ArrowDown: { y: clampTo(cur.y + nudge, BLOCK_LIMITS.y) },
      };
      if (blockMoves[e.key]) { updateBlock(selectedBlock, blockMoves[e.key], true); return true; }
      return false;
    }
    const sel = specRef.current.ornaments.find((o) => o.id === selectedId);
    if (!sel) return false;
    if (e.key === "Escape") { setSelectedId(null); return true; }
    if (e.key === "Delete" || e.key === "Backspace") { removeOrnament(sel.id); return true; }
    if (mod && e.key.toLowerCase() === "d") { duplicateOrnament(sel.id); return true; }
    // Shift+] menghasilkan "}" dan Shift+[ menghasilkan "{" di papan ketik US.
    if (e.key === "]" || e.key === "}") { reorderOrnament(sel.id, e.shiftKey ? "front" : "forward"); return true; }
    if (e.key === "[" || e.key === "{") { reorderOrnament(sel.id, e.shiftKey ? "back" : "backward"); return true; }
    const step = e.shiftKey ? 2 : 0.5;
    const moves: Record<string, Partial<BuilderOrnament>> = {
      ArrowLeft: { x: sel.x - step },
      ArrowRight: { x: sel.x + step },
      ArrowUp: { y: sel.anchor === "bottom" ? sel.y + step : sel.y - step },
      ArrowDown: { y: sel.anchor === "bottom" ? sel.y - step : sel.y + step },
    };
    if (moves[e.key]) { updateOrnament(sel.id, moves[e.key], true); return true; }
    return false;
  }, [duplicateOrnament, redo, removeOrnament, reorderOrnament, resetBlock, save, selectedBlock, selectedId, undo, updateBlock, updateOrnament]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (handleKey(e)) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleKey]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (allowLeave.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    // Tombol "Buka Undangan" di pratinjau menutup sampul; ornamen baru sebaiknya jatuh ke seksi pembuka.
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "LUX_INVITATION_OPENED") setViewSection("opening");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const leave = async () => {
    if (dirty && !(await confirm({ title: "Tinggalkan builder?", message: "Perubahan yang belum disimpan akan hilang.", confirmLabel: "Tinggalkan", danger: true }))) return;
    allowLeave.current = true;
    router.push("/admin?tab=themes");
  };

  if (!wideEnough) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6 text-center">
        <div className="max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <p className="text-sm font-bold text-stone-900">Theme Builder butuh layar lebar</p>
          <p className="mt-2 text-[13px] leading-relaxed text-stone-600">Buka dari laptop atau komputer dengan lebar layar minimal 1100 px. Pratinjau HP tetap tersedia di dalam builder.</p>
          <a href="/admin?tab=themes" className="mt-4 inline-block rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white">Kembali ke katalog tema</a>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6 text-center">
        <div className="max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <p className="text-sm font-bold text-stone-900">Builder tidak dapat dibuka</p>
          <p className="mt-2 text-[13px] text-stone-600">{loadError}</p>
          <a href="/admin?tab=themes" className="mt-4 inline-block rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white">Kembali ke katalog tema</a>
        </div>
      </div>
    );
  }

  const chips = ORNAMENT_SECTIONS.filter((s) => s !== "sidebar" || device === "desktop");

  return (
    <div className="fixed inset-0 flex flex-col bg-stone-100 text-stone-900">
      {ghost && (
        <img
          src={ghost.src}
          alt=""
          className="pointer-events-none fixed z-[200] w-20 -translate-x-1/2 -translate-y-1/2 opacity-80 drop-shadow-lg"
          style={{ left: ghost.x, top: ghost.y }}
        />
      )}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-3">
        <button type="button" onClick={leave} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer">
          <Icon d="M15 18l-6-6 6-6" />
          Katalog
        </button>
        <span className="h-6 w-px bg-stone-200" />
        <div className="flex min-w-0 items-center gap-2">
          <input
            value={meta.name}
            onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
            placeholder="Tema tanpa nama"
            maxLength={60}
            className="w-56 truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-stone-900 outline-none hover:border-stone-200 focus:border-amber-500"
          />
          <span className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[10.5px] font-semibold text-stone-600">
            <span className={`h-1.5 w-1.5 rounded-full ${isNew ? "bg-stone-400" : isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
            {isNew ? "Belum disimpan" : isActive ? "Tayang di katalog" : "Draf"}
          </span>
          {isNew && (
            <select
              aria-label="Mulai dari tema lama"
              defaultValue=""
              onChange={(e) => { startFromLegacy(e.target.value); e.target.value = ""; }}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11.5px] font-semibold text-stone-600 outline-none hover:border-stone-300 cursor-pointer"
            >
              <option value="">Mulai dari tema lama…</option>
              {(legacyThemes ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {isNew && (
            <>
              <input
                ref={importInput}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void importTheme(file);
                }}
              />
              <button type="button" onClick={() => importInput.current?.click()} className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11.5px] font-semibold text-stone-600 hover:border-stone-300 cursor-pointer">
                Impor berkas
              </button>
            </>
          )}
          {dirty && !isNew && <span className="text-[11px] text-stone-400">Ada perubahan</span>}
        </div>

        <div className="mx-auto flex items-center rounded-xl bg-stone-100 p-1">
          {(Object.keys(DEVICE_SIZES) as PreviewDevice[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDevice(d); if (d !== "desktop" && viewSection === "sidebar") focusSection("cover"); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition cursor-pointer ${device === d ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
            >
              <Icon d={d === "desktop" ? "M3 5h18v11H3zM8 20h8M12 16v4" : "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2"} className="h-3.5 w-3.5" />
              {DEVICE_SIZES[d].label}
            </button>
          ))}
        </div>

        <div className="flex items-center rounded-xl bg-stone-100 p-1" title="Contoh demo memakai foto dan data contoh; Klien baru meniru undangan yang belum diunggah apa pun">
          {([["demo", "Contoh demo"], ["client", "Klien baru"]] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={previewMode === mode}
              onClick={() => setPreviewMode(mode)}
              className={`rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition cursor-pointer ${previewMode === mode ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} disabled={!historySize.past} title="Urungkan (Ctrl+Z)" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 disabled:opacity-30 cursor-pointer disabled:cursor-default">
            <Icon d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" />
          </button>
          <button type="button" onClick={redo} disabled={!historySize.future} title="Ulangi (Ctrl+Shift+Z)" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 disabled:opacity-30 cursor-pointer disabled:cursor-default">
            <Icon d="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3" />
          </button>
          <span className="mx-1 h-6 w-px bg-stone-200" />
          <button type="button" onClick={save} disabled={saving || !loaded} className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer">
            {saving ? "Menyimpan…" : isNew ? "Simpan draf" : "Simpan"}
          </button>
          {!isNew && !isActive && (
            <button type="button" onClick={() => setPanel("publish")} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer">
              Terbitkan
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-stone-200 bg-white py-3">
          {PANEL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPanel(t.id)}
              className={`flex w-[62px] flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] font-semibold transition cursor-pointer ${panel === t.id ? "bg-amber-50 text-amber-800" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"}`}
            >
              <Icon d={t.icon} className="h-5 w-5" />
              {t.label}
            </button>
          ))}
        </nav>

        <aside className="w-[340px] shrink-0 overflow-y-auto border-r border-stone-200 bg-white">
          <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-5 py-3 backdrop-blur">
            <h2 className="text-sm font-bold text-stone-900">{PANEL_TABS.find((t) => t.id === panel)?.label}</h2>
          </div>
          {!loaded ? (
            <p className="px-5 py-6 text-sm text-stone-500">Memuat rancangan…</p>
          ) : panel === "colors" ? (
            <ColorsPanel spec={spec} library={library} uploading={uploading} onChange={patchSpec} onUpload={uploadAssets} onDeleteAsset={deleteAsset} />
          ) : panel === "type" ? (
            <TypePanel spec={spec} onChange={patchSpec} />
          ) : panel === "texts" ? (
            <TextsPanel spec={spec} labels={labels} onChange={patchSpec} />
          ) : panel === "layout" ? (
            <LayoutPanel spec={spec} onChange={patchSpec} onFocusSection={focusSection} selectedBlock={selectedBlock} onSelectBlock={selectBlock} />
          ) : panel === "ornaments" ? (
            <OrnamentsPanel
              spec={spec}
              library={library}
              viewSection={viewSection}
              uploading={uploading}
              selectedId={selectedId}
              onUpload={uploadAssets}
              onAdd={(src) => addOrnament(src, viewSection)}
              onAddText={() => addTextOrnament(viewSection)}
              onStartDrag={startLibraryDrag}
              onSelect={setSelectedId}
              onDeleteAsset={deleteAsset}
            />
          ) : panel === "motion" ? (
            <MotionPanel spec={spec} onChange={patchSpec} onReplay={() => setReplayNonce((n) => n + 1)} />
          ) : (
            <PublishPanel
              spec={spec}
              meta={meta}
              state={{ isNew, isActive, dirty, saving, issues }}
              onMeta={(patch) => setMeta((m) => ({ ...m, ...patch }))}
              onSave={save}
              onPublish={publish}
              music={music}
              revisions={revisions}
              onDuplicate={duplicateTheme}
              onExport={exportTheme}
              onRestoreRevision={restoreRevision}
            />
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-stone-200 bg-white/70 px-3 py-2">
            <span className="mr-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-stone-400">Lompat ke</span>
            {chips.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => focusSection(s)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold transition cursor-pointer ${viewSection === s ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
              >
                {SECTION_LABELS[s]}
              </button>
            ))}
          </div>
          <BuilderPreview
            dropTargetRef={dropTarget}
            actionsRef={actionsRef}
            frames={spec.frames}
            html={html}
            loading={previewLoading}
            device={device}
            editOrnaments={panel === "ornaments" || panel === "layout" || Boolean(selectedId) || Boolean(selectedBlock)}
            playAnimations={panel === "motion"}
            replayNonce={replayNonce}
            jump={jump}
            ornaments={spec.ornaments}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); if (id) { setSelectedBlock(null); setPanel("ornaments"); } }}
            onOrnamentChange={updateOrnament}
            blocks={spec.blocks}
            selectedBlock={selectedBlock}
            onSelectBlock={selectBlock}
            onBlockChange={updateBlock}
            onViewSection={setViewSection}
            onKey={handleKey}
          />
        </main>

        <aside className="w-[290px] shrink-0 border-l border-stone-200 bg-white">
          {selected ? (
            <OrnamentInspector
              ornament={selected}
              palette={spec.palette}
              canvasMode={spec.canvasMode}
              onPlace={(placement) => placeOrnament(selected.id, placement)}
              stack={stackOf(spec.ornaments, selected)}
              onReorder={(move) => reorderOrnament(selected.id, move)}
              onChange={(patch, final) => updateOrnament(selected.id, patch, final)}
              onDuplicate={() => duplicateOrnament(selected.id)}
              onRemove={() => removeOrnament(selected.id)}
              onClose={() => setSelectedId(null)}
            />
          ) : selectedBlock ? (
            <BlockInspector
              blockId={selectedBlock}
              props={spec.blocks[selectedBlock] ?? DEFAULT_BLOCK_PROPS}
              onChange={(patch, final) => updateBlock(selectedBlock, patch, final)}
              onReset={() => resetBlock(selectedBlock)}
              onClose={() => setSelectedBlock(null)}
              onCenter={() => centerBlock(selectedBlock)}
              frame={(FRAMED_PHOTOS as readonly string[]).includes(selectedBlock) ? spec.frames[selectedBlock as FramedPhotoId] ?? DEFAULT_PHOTO_FRAME : null}
              onFrameChange={(patch, final) => updateFrame(selectedBlock as FramedPhotoId, patch, final)}
              library={library}
              onUpload={uploadAssets}
            />
          ) : (
            <div className="h-full overflow-y-auto px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Ringkasan rancangan</p>
              <div className="mt-3 flex h-10 overflow-hidden rounded-xl ring-1 ring-stone-900/10">
                {(["primary", "secondary", "accent", "bgLight", "bgDark"] as const).map((k) => <span key={k} className="flex-1" style={{ background: spec.palette[k] }} />)}
              </div>
              <dl className="mt-4 space-y-2 text-[12px]">
                <div className="flex justify-between gap-2"><dt className="text-stone-500">Kanvas</dt><dd className="font-semibold text-stone-800">{spec.canvasMode === "dark" ? "Gelap" : "Terang"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-stone-500">Judul</dt><dd className="font-semibold text-stone-800">{fontLabel(spec.fonts.heading)}</dd></div>
                {VARIANT_GROUPS.map((g) => (
                  <div key={g.key} className="flex justify-between gap-2"><dt className="text-stone-500">{g.label}</dt><dd className="font-semibold text-stone-800">{g.options.find((o) => o.id === spec.variants[g.key])?.label}</dd></div>
                ))}
                <div className="flex justify-between gap-2"><dt className="text-stone-500">Ornamen</dt><dd className="font-semibold text-stone-800">{spec.ornaments.length} / {MAX_ORNAMENTS}</dd></div>
              </dl>

              <div className="mt-5 rounded-xl bg-stone-50 p-3">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-stone-800">
                  <span className={`h-1.5 w-1.5 rounded-full ${issues.length ? "bg-red-500" : "bg-emerald-500"}`} />
                  {issues.length ? `${issues.length} masalah pada master` : "Master lolos pemeriksaan mesin"}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500">Label klien, slot foto, RSVP, dan musik dari blueprint tetap utuh. Builder hanya mengatur tampilan.</p>
              </div>

              <div className="mt-5 space-y-2 text-[11.5px] leading-relaxed text-stone-600">
                <p className="font-semibold text-stone-800">Langkah cepat</p>
                <p>1. Pilih palet di Warna, lalu huruf di Huruf.</p>
                <p>2. Atur bentuk tiap seksi di Tata letak.</p>
                <p>3. Seret ornamen ke pratinjau di Ornamen.</p>
                <p>4. Simpan draf, cek di HP 320 dan Desktop, lalu Terbitkan.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
