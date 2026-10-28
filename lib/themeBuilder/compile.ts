import fs from "fs";
import path from "path";
import {
  BUILDER_TEXTS,
  RADIUS_OPTIONS,
  blockStyle,
  fontFamily,
  frameCss,
  googleFontCssUrl,
  googleFontIds,
  ornamentStyle,
  type BlockProps,
  type BuilderBlockId,
  type BuilderEventType,
  type BuilderOrnament,
  type BuilderSpec,
  type BuilderTexts,
  type BuilderVariants,
} from "@/lib/themeBuilder/spec";

const BLUEPRINT_FILES: Record<BuilderEventType, string> = {
  WEDDING: path.join("themes", "_blueprints", "wedding", "starter-blueprint.html"),
};

export function readBuilderBlueprint(eventType: BuilderEventType): string {
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), BLUEPRINT_FILES[eventType]), "utf-8");
}

function rootBlock(spec: BuilderSpec): string {
  const p = spec.palette;
  const dark = spec.canvasMode === "dark";
  const [sm, md, lg] = (RADIUS_OPTIONS.find((r) => r.id === spec.radius) ?? RADIUS_OPTIONS[1]).values;
  const texture = spec.texture ? `url('${spec.texture}')` : "none";
  return `:root {
      --primary: ${p.primary};
      --secondary: ${p.secondary};
      --accent: ${p.accent};
      --bg-light: ${p.bgLight};
      --bg-dark: ${p.bgDark};
      --text-main: ${dark ? p.textLight : p.textDark};
      --text-muted: color-mix(in srgb, var(--text-main) 68%, transparent);
      --on-dark: ${p.textLight};
      --on-primary: ${p.onPrimary};
      --success: ${dark ? "#68d391" : "#2f855a"};
      --danger: ${dark ? "#fc8181" : "#c53030"};
      --bg-canvas: var(${dark ? "--bg-dark" : "--bg-light"});
      --card-bg: color-mix(in srgb, var(--bg-canvas) ${dark ? 86 : 78}%, var(--on-dark));
      --overlay: var(--bg-dark);
      --shadow-color: color-mix(in srgb, var(--bg-dark) ${dark ? 40 : 16}%, transparent);
      --canvas-texture: ${texture};
      --font-heading: ${fontFamily(spec.fonts.heading, "heading")};
      --font-body: ${fontFamily(spec.fonts.body, "body")};
      --font-script: ${fontFamily(spec.fonts.script, "script")};
      --radius-sm: ${sm}px;
      --radius-md: ${md}px;
      --radius-lg: ${lg}px;
      --radius-full: 9999px;
      --shadow-subtle: 0 4px 20px var(--shadow-color);
      --shadow-elevated: 0 12px 36px color-mix(in srgb, var(--bg-dark) ${dark ? 50 : 24}%, transparent);
    }`;
}

// CSS varian hanya menata ulang markup blueprint yang sudah ada; elemen, token, dan data-lux-field tidak berubah.
const VARIANT_CSS: Record<keyof BuilderVariants, Record<string, string>> = {
  cover: {
    framed: `
    .cover-overlay::before, .cover-overlay::after { content: ''; position: absolute; pointer-events: none; z-index: 1; }
    .cover-overlay::before { inset: 16px; border: 1px solid color-mix(in srgb, var(--on-dark) 45%, transparent); border-radius: var(--radius-lg); }
    .cover-overlay::after { inset: 22px; border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); border-radius: calc(var(--radius-lg) - 4px); }`,
    arch: `
    .cover-center { padding: 56px 26px 36px; max-width: 300px; margin: 0 auto; border: 1px solid color-mix(in srgb, var(--on-dark) 40%, transparent); border-radius: 999px 999px var(--radius-md) var(--radius-md); background: color-mix(in srgb, var(--overlay) 28%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }`,
    editorial: `
    .cover-overlay { align-items: flex-start; text-align: left; }
    .cover-top, .cover-center, .cover-bottom { align-self: stretch; }
    .cover-bottom { align-items: flex-start !important; }
    .cover-monogram { margin-left: 0; }
    .cover-names { font-size: 44px; line-height: 1.05; }
    .cover-subtitle { margin-left: 0; }`,
  },
  opening: {
    card: `
    .opening-center { width: 100%; max-width: 380px; padding: 28px 22px; background: color-mix(in srgb, var(--card-bg) 92%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent); border-radius: var(--radius-lg); box-shadow: var(--shadow-elevated); }`,
    arch: `
    .opening-photo { aspect-ratio: 3 / 4.2; border-radius: 999px 999px var(--radius-md) var(--radius-md); }`,
    circle: `
    .opening-photo { width: min(58%, 220px); aspect-ratio: 1; border-radius: 50%; }`,
  },
  couple: {
    side: `
    .couple-grid { flex-direction: row; align-items: flex-start; justify-content: center; gap: 10px; }
    .couple-card { flex: 1 1 0; min-width: 0; }
    .couple-photo-wrap { width: min(120px, 100%); height: auto; aspect-ratio: 1; }
    .couple-amp { align-self: center; font-size: 28px; }
    .couple-name { font-size: 18px; overflow-wrap: anywhere; }
    .couple-parents { font-size: 11px; }`,
    arch: `
    .couple-photo-wrap { width: 150px; height: 200px; border-radius: 999px 999px var(--radius-md) var(--radius-md); }
    .couple-photo-wrap img { border-radius: 999px 999px calc(var(--radius-md) - 4px) calc(var(--radius-md) - 4px); }`,
    polaroid: `
    .couple-photo-wrap { width: 160px; height: 196px; padding: 8px 8px 30px; border: none; border-radius: var(--radius-sm); background: var(--card-bg); box-shadow: 10px 10px 0 color-mix(in srgb, var(--accent) 45%, transparent), var(--shadow-elevated); }
    .couple-photo-wrap img { border-radius: 2px; }
    .couple-card:first-child .couple-photo-wrap { transform: rotate(-3deg); }
    .couple-card:last-child .couple-photo-wrap { transform: rotate(3deg); }`,
  },
  countdown: {
    circles: `
    .countdown-box { aspect-ratio: 1; padding: 0; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }`,
    minimal: `
    .countdown-box { background: transparent; border: none; border-radius: 0; }
    .countdown-box + .countdown-box { border-left: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); }
    .countdown-num { font-size: 32px; font-weight: 500; font-family: var(--font-heading); }`,
    solid: `
    .countdown-box { background: var(--primary); border-color: transparent; box-shadow: var(--shadow-subtle); }
    .countdown-num, .countdown-lbl { color: var(--on-primary); }`,
  },
  closing: {
    card: `
    .closing-content { max-width: 380px; padding: 32px 22px; background: color-mix(in srgb, var(--card-bg) 90%, transparent); border-radius: var(--radius-lg); box-shadow: var(--shadow-elevated); }
    .closing-sec.has-closing-photo .closing-content { background: color-mix(in srgb, var(--overlay) 45%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }`,
    framed: `
    .closing-content { max-width: 360px; padding: 34px 22px; border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent); outline: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); outline-offset: 6px; border-radius: var(--radius-md); }`,
  },
  headings: {
    script: `
    .sec-main-title { font-family: var(--font-script); font-size: 40px; font-weight: 400; letter-spacing: 0; line-height: 1.1; }`,
    lined: `
    .sec-eyebrow::before, .sec-eyebrow::after { content: ''; display: inline-block; width: 26px; height: 1px; margin: 0 10px; vertical-align: middle; background: currentColor; opacity: 0.6; }`,
    ornate: `
    .sec-main-title { margin-bottom: 20px; }
    .sec-main-title::after { content: ''; display: block; width: 72px; height: 1px; margin: 14px auto 0; background: linear-gradient(90deg, transparent, var(--accent), transparent); }`,
  },
  sidebar: {
    "bottom-center": `
    @media (min-width: 900px) {
      .sidebar-desktop-content { text-align: center; }
      .sidebar-desktop-quote { margin: 0 auto; }
    }`,
    center: `
    @media (min-width: 900px) {
      .sidebar-desktop-content { top: 50%; bottom: auto; transform: translateY(-50%); text-align: center; }
      .sidebar-desktop-quote { margin: 0 auto; }
      .sidebar-desktop::after { background: color-mix(in srgb, var(--overlay) 55%, transparent); }
    }`,
    "top-left": `
    @media (min-width: 900px) {
      .sidebar-desktop-content { top: 4rem; bottom: auto; }
      .sidebar-desktop::after { background: linear-gradient(to bottom, color-mix(in srgb, var(--overlay) 85%, transparent) 0%, color-mix(in srgb, var(--overlay) 30%, transparent) 50%, transparent 100%); }
    }`,
  },
};

const EAGER_SECTIONS = new Set(["cover", "sidebar", "opening"]);

/**
 * Ornamen yang menempel ke blok berupa `span` (bukan `div`): `<p>` menutup dirinya sendiri begitu bertemu `div`, sedangkan
 * `span` absolut tetap sah di dalam `p`, judul, dan tautan. Teks hias di-escape di sini; `{{ }}` dan kurung sudut sudah
 * ditolak oleh `parseBuilderSpec`.
 */
function ornamentHtml(o: BuilderOrnament, blockHidden = false): string {
  const tag = o.attach ? "span" : "div";
  // Ornamen sebaris adalah elemen alur: kelas `lux-orn` (absolut, tembus klik) tidak dipakai, dan gambarnya diberi gaya sendiri.
  // Ia disembunyikan bersama bloknya (`lux-flow-off`), karena berada di luar elemen blok dan tidak ikut `display:none` blok.
  const classes = (o.before ? ["lux-flow", blockHidden && "lux-flow-off"] : ["lux-orn", o.layer === "front" && "is-front", o.attach && "is-attached"]).concat(o.text ? ["lux-orn-text"] : []).filter(Boolean).join(" ");
  const beforeAttr = o.before ? ` data-orn-before="${o.before}"` : "";
  const loading = EAGER_SECTIONS.has(o.section) ? "eager" : "lazy";
  const imgStyle = o.before ? ` style="display:block;width:100%;height:auto;"` : "";
  const inner = o.text ? escapeText(o.text.value) : `<img src="${o.src}" alt="" loading="${loading}" decoding="async" draggable="false"${imgStyle} />`;
  // Teks hias yang boleh diubah klien menjadi label biasa: kunci sudah dibatasi ke EDITABLE_TEXT_KEYS oleh parseBuilderSpec.
  // `aria-hidden` dibuang karena label klien adalah isi undangan yang harus terbaca pembaca layar.
  const editable = o.text?.labelKey ? ` data-lux-field="customLabels.${o.text.labelKey}"` : "";
  return `<${tag} class="${classes}" data-orn-id="${o.id}"${beforeAttr}${editable} style="${ornamentStyle(o)}"${editable ? "" : ' aria-hidden="true"'}>${inner}</${tag}>`;
}

const ATTACH_OVERFLOW_BLOCKS: readonly BuilderBlockId[] = ["opening-photo", "couple-photo-1", "couple-photo-2"];

/**
 * Blok yang punya ornamen menempel menjadi acuan posisi (`relative`) dan lapisan sendiri (`isolation`), sehingga ornamen
 * belakang (z-index -1) berada di bawah isi blok tetapi di atas latarnya, dan ornamen depan di atas isi. Foto memotong
 * isinya lewat `overflow:hidden` di pembungkus; ornamen yang keluar dari tepi foto butuh pembungkus terbuka, jadi
 * pemotongan sudut dipindah ke gambar.
 */
function attachCss(ornaments: BuilderOrnament[]): string {
  const blocks = [...new Set(ornaments.flatMap((o) => (o.attach ? [o.attach] : [])))];
  if (!blocks.length) return "";
  const sel = (ids: readonly string[], suffix = "") => ids.map((id) => `[data-lux-block="${id}"]${suffix}`).join(",");
  const photos = blocks.filter((id) => ATTACH_OVERFLOW_BLOCKS.includes(id));
  return [
    ".lux-orn.is-attached{z-index:-1;}",
    ".lux-orn.is-attached.is-front{z-index:3;}",
    `${sel(blocks)}{position:relative;isolation:isolate;}`,
    photos.length ? `${sel(photos)}{overflow:visible;}\n    ${sel(photos, " > img")}{border-radius:inherit;}` : "",
  ].filter(Boolean).join("\n    ");
}

const openingTagOf = (block: string) => new RegExp(`<[a-zA-Z0-9]+\\b[^>]*\\bdata-lux-block="${block}"[^>]*>`);

/** Memasang ornamen sebaris sebagai saudara tepat sebelum elemen blok, sehingga berlaku juga untuk blok berlabel. */
function insertBeforeBlocks(html: string, ornaments: BuilderOrnament[], blocks: BuilderSpec["blocks"]): string {
  const byBlock = new Map<string, BuilderOrnament[]>();
  for (const o of ornaments) if (o.before) byBlock.set(o.before, [...(byBlock.get(o.before) ?? []), o]);
  let out = html;
  for (const [block, items] of byBlock) {
    const opening = openingTagOf(block);
    if (!opening.test(out)) throw new Error(`Penanda blok ${block} tidak ada di blueprint.`);
    const hidden = Boolean(blocks[block as BuilderBlockId]?.hidden);
    const markup = items.map((o) => ornamentHtml(o, hidden)).join("");
    out = out.replace(opening, (tag) => `${markup}${tag}`);
  }
  return out;
}

/** Memasang ornamen sebagai anak pertama elemen blok. Blok yang hilang dari blueprint adalah galat, bukan ornamen yang diam-diam hilang. */
function attachToBlocks(html: string, ornaments: BuilderOrnament[]): string {
  const byBlock = new Map<string, BuilderOrnament[]>();
  for (const o of ornaments) if (o.attach) byBlock.set(o.attach, [...(byBlock.get(o.attach) ?? []), o]);
  let out = html;
  for (const [block, items] of byBlock) {
    const opening = openingTagOf(block);
    if (!opening.test(out)) throw new Error(`Penanda blok ${block} tidak ada di blueprint.`);
    const markup = items.map((o) => ornamentHtml(o)).join("");
    out = out.replace(opening, (tag) => `${tag}${markup}`);
  }
  return out;
}

/**
 * Master tema dari spesifikasi builder. Spesifikasi wajib lolos `parseBuilderSpec` terlebih dahulu: nilai warna, huruf,
 * dan URL ornamen disisipkan tanpa escape karena sudah dibatasi ke hex, katalog, dan pola path yang aman.
 */
export function compileBuilderMaster(spec: BuilderSpec, blueprint = readBuilderBlueprint(spec.eventType)): string {
  if (!/:root\s*\{[^}]*\}/.test(blueprint)) throw new Error("Blueprint tidak memiliki blok :root.");
  let html = blueprint.replace(/:root\s*\{[^}]*\}/, rootBlock(spec));

  html = html.replace(/<html lang="id"[^>]*>/, `<html lang="id" data-lux-anim-preset="${spec.animation}">`);

  // Id font Google sudah dibatasi pola "g:<huruf, angka, spasi>" oleh parseBuilderSpec, jadi URL berkasnya aman disisipkan.
  const googleLinks = googleFontIds(spec.fonts)
    .map((id) => `  <link rel="stylesheet" href="${googleFontCssUrl(id)}" />`)
    .join("\n");
  if (googleLinks) html = html.replace(/(<link rel="stylesheet" href="\/fonts\/fonts\.css" \/>)/, `$1\n${googleLinks}`);

  const variantCss = (Object.keys(VARIANT_CSS) as Array<keyof BuilderVariants>)
    .map((key) => VARIANT_CSS[key][spec.variants[key]])
    .filter(Boolean)
    .join("\n");
  if (variantCss) {
    html = html.replace("</head>", `  <style id="lux-builder-variants">${variantCss}\n  </style>\n</head>`);
  }

  // Id blok berasal dari daftar tetap dan nilainya angka terjepit, jadi aman disisipkan tanpa escape.
  const blockRules = (Object.entries(spec.blocks) as Array<[BuilderBlockId, BlockProps]>)
    .map(([id, props]) => `[data-lux-block="${id}"]{${blockStyle(props)}}`)
    .join("\n    ");
  if (blockRules) {
    html = html.replace("</head>", `  <style id="lux-builder-blocks">\n    ${blockRules}\n  </style>\n</head>`);
  }

  // Jadwal acara dipindahkan (bukan digandakan) ke Home: token hanya boleh muncul sekali karena HTML-nya membawa
  // target sunting Studio. Seksi Acara tetap ada di DOM (penanda seksi dan ornamennya) tetapi disembunyikan.
  if (spec.eventsPlacement === "home") {
    html = html.replace("{{eventDataHtml}}", "").replace("<!-- lux-home-schedule -->", "{{eventDataHtml}}");
    html = html.replace("</head>", `  <style id="lux-builder-events">\n    .home-schedule { display: block; }\n    #events { display: none; }\n    a[href="#events"] { display: none !important; }\n  </style>\n</head>`);
  }

  // Mode sunting Studio memberi semua `[data-lux-field]` `position: relative`, yang menimpa `.lux-orn` (absolut) dan
  // menggeser teks hias hanya di Studio. Selektor ini lebih spesifik, dan teks hias hanya menerima klik saat disunting.
  if (spec.ornaments.some((o) => o.text?.labelKey)) {
    html = html.replace("</head>", `  <style id="lux-builder-editable">\n    .lux-orn.lux-orn-text[data-lux-field] { position: absolute; }\n    .lux-orn.lux-orn-text[data-lux-field][contenteditable="true"] { pointer-events: auto; min-height: 1.25em; }\n  </style>\n</head>`);
  }

  const attachRules = attachCss(spec.ornaments);
  if (attachRules) {
    html = html.replace("</head>", `  <style id="lux-builder-attach">\n    ${attachRules}\n  </style>\n</head>`);
  }

  // Bentuk dan nilai bingkai sudah dijepit ke daftar tetap oleh parseBuilderSpec.
  const frameRules = frameCss(spec.frames);
  if (frameRules) {
    html = html.replace("</head>", `  <style id="lux-builder-frames">\n    ${frameRules}\n  </style>\n</head>`);
  }

  html = html.replace(/<!-- lux-ornaments:([a-z]+) -->/g, (marker, section: string) => {
    const items = spec.ornaments.filter((o) => o.section === section && !o.attach && !o.before);
    return items.length ? items.map((o) => ornamentHtml(o)).join("\n    ") : marker;
  });

  if (spec.ornaments.some((o) => o.before)) {
    html = html.replace("</head>", `  <style id="lux-builder-flow">\n    .lux-flow-off { display: none !important; }\n  </style>\n</head>`);
  }

  return applyStaticTexts(insertBeforeBlocks(attachToBlocks(html, spec.ornaments), spec.ornaments, spec.blocks), spec.texts);
}

const escapeText = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Mengganti teks label yang tertulis langsung di master (bukan token mesin). Teks yang lebih dulu diawali ikon SVG
 * (tombol dengan ikon) hanya diganti bagian setelah ikonnya. Label bertoken ("engine") tidak disentuh di sini; nilainya
 * dipasang lewat bawaan blueprint saat undangan dirender, sehingga token mesin tetap utuh dan lolos audit.
 */
function applyStaticTexts(html: string, texts: BuilderTexts): string {
  let out = html;
  for (const { key, kind } of BUILDER_TEXTS) {
    const value = texts[key];
    if (value === undefined || kind !== "static") continue;
    const element = new RegExp(`(<([a-zA-Z0-9]+)\\b[^>]*data-lux-field="customLabels\\.${key}"[^>]*>)([\\s\\S]*?)(</\\2>)`);
    out = out.replace(element, (_m, open: string, _tag: string, inner: string, close: string) => {
      const svgEnd = inner.search(/<\/svg>/i);
      const keep = svgEnd === -1 ? "" : `${inner.slice(0, svgEnd + 6)}\n        `;
      return `${open}${keep}${escapeText(value)}${close}`;
    });
  }
  return out;
}
