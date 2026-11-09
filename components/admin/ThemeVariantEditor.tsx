"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/ui/Feedback";
import { GoogleFontPicker } from "@/components/admin/themeBuilder/GoogleFontPicker";
import { FONT_OPTIONS, PALETTE_PRESETS, fontLabel, isGoogleFontId } from "@/lib/themeBuilder/spec";
import { overrideCssFromTokens, recolorWithPalette, type ColorUsage, type ColorUsageKind, type MasterFontToken, type MasterOverrides } from "@/lib/themeVariantCss";
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

/**
 * Editor Varian Tema: warna (per kelompok nilai asli) dan huruf (per keluarga) master tulisan tangan. Pratinjau memakai
 * render server sekali, lalu override ditulis langsung ke `<style id="lux-master-overrides">` di iframe.
 */
export default function ThemeVariantEditor({ parentId, variantId }: { parentId: string | null; variantId: string | null }) {
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);

  const snapshot = useCallback((n: string, d: string, o: MasterOverrides) => JSON.stringify({ n: n.trim(), d: d.trim(), o }), []);
  const dirty = snapshot(name, description, overrides) !== savedSnapshot;

  useEffect(() => {
    const url = variantId ? `/api/admin/theme-variants?id=${encodeURIComponent(variantId)}` : parentId ? `/api/admin/theme-variants?parent=${encodeURIComponent(parentId)}` : null;
    if (!url) { setLoadError("Pilih tema master dari katalog admin untuk membuat varian."); return; }
    let cancelled = false;
    (async () => {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) { setLoadError(data.error || "Data varian gagal dimuat."); return; }
      setParent(data.parent);
      setGroups(data.colorGroups);
      setFontTokens(data.fonts);
      setUsage(data.usage ?? {});
      const loaded: LoadedVariant | null = data.variant ?? null;
      setVariant(loaded);
      const n = loaded?.name ?? `${data.parent.name} Varian`;
      const d = loaded?.description ?? "";
      const o = { colors: { ...(loaded?.overrides?.colors ?? {}) }, fonts: { ...(loaded?.overrides?.fonts ?? {}) } };
      setName(n);
      setDescription(d);
      setOverrides(o);
      setSavedSnapshot(loaded ? snapshot(n, d, o) : "");
      const preview = await fetch("/api/admin/theme-variants?preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parentId: data.parent.id, overrides: o }) });
      const pdata = await preview.json().catch(() => ({}));
      if (!cancelled) {
        if (preview.ok) setPreviewHtml(pdata.html);
        else setLoadError(pdata.error || "Pratinjau gagal dibuat.");
      }
    })().catch(() => !cancelled && setLoadError("Data varian gagal dimuat. Periksa koneksi."));
    return () => { cancelled = true; };
  }, [parentId, variantId, snapshot]);

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
    style.textContent = css;
  }, [overrides, fontTokens]);

  useEffect(() => { applyToPreview(); }, [applyToPreview]);

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

  const changedCount = Object.keys(overrides.colors).length + Object.keys(overrides.fonts).length;

  const save = async (): Promise<string | null> => {
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
          <p className="text-sm font-semibold text-stone-800">Varian tidak dapat dibuka</p>
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
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-500">Varian dari {parent?.name ?? "…"}</p>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nama varian" aria-label="Nama varian" className="w-44 sm:w-64 rounded-md border border-transparent px-1 text-sm font-semibold text-stone-900 outline-none hover:border-stone-200 focus:border-amber-500" />
        </div>
        <span className={`ml-1 inline-flex items-center gap-1.5 text-[11px] font-medium ${variant?.isActive ? "text-emerald-700" : "text-stone-500"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${variant?.isActive ? "bg-emerald-500" : "bg-stone-400"}`} />
          {variant ? (variant.isActive ? "Terbit" : "Draf") : "Belum disimpan"}{dirty && variant ? " · ada perubahan" : ""}
        </span>
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
          <button type="button" onClick={() => void save()} disabled={busy || (!dirty && Boolean(variant))} className="rounded-xl bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-40 cursor-pointer">
            {variant ? "Simpan" : "Simpan draf"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="max-h-[45vh] w-full shrink-0 overflow-y-auto border-b border-stone-200 bg-white md:max-h-none md:w-[340px] md:border-b-0 md:border-r lg:w-[380px]">
          <section className="border-b border-stone-200/80 px-5 py-4">
            <p className="text-[11.5px] leading-relaxed text-stone-600">
              Varian memakai tata letak, ornamen, dan teks master <b>{parent?.name}</b>; hanya warna dan huruf yang diganti. Master aslinya tidak diubah. Ornamen berupa gambar dan warna di dalam skrip tidak ikut berganti warna.
            </p>
            <label className="mt-3 block text-[11.5px] font-semibold text-stone-600">
              Deskripsi singkat
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12.5px] text-stone-800 outline-none focus:border-amber-500" />
            </label>
            <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500">
              <span>{changedCount} perubahan dari master</span>
              {changedCount > 0 && <button type="button" onClick={() => setOverrides(emptyOverrides())} className="font-semibold text-amber-700 hover:underline cursor-pointer">Kembalikan semua</button>}
            </div>
          </section>

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
        </aside>

        <div ref={stageRef} className="relative flex min-w-0 flex-1 justify-center overflow-auto p-4">
          {previewHtml ? (
            <div style={{ width: deviceWidth * scale, height: 820 * scale }} className="shrink-0">
              <iframe
                ref={iframeRef}
                title="Pratinjau varian"
                srcDoc={previewHtml}
                onLoad={applyToPreview}
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
