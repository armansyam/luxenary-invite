import vm from "vm";

export interface MasterIssue {
  code: "color" | "token" | "label" | "section" | "block" | "script";
  message: string;
}

const tokensOf = (html: string) => new Set([...html.matchAll(/\{\{\s*(?:#if\s+|#unless\s+)?([\w.]+)\s*\}\}/g)].map((m) => m[1]));
const fieldsOf = (html: string) => new Set([...html.matchAll(/data-lux-field="([^"]+)"/g)].map((m) => m[1]));
const blocksOf = (html: string) => new Set([...html.matchAll(/data-lux-block="([a-z0-9-]+)"/g)].map((m) => m[1]));
const sectionsOf = (html: string) => new Set([...html.matchAll(/data-lux-section="([a-z]+)"/g)].map((m) => m[1]));

/** Isi di luar blok :root, tanpa entitas HTML (&#039;) yang bentuknya mirip warna hex. */
function outsideRoot(html: string): string {
  return html.replace(/:root\s*\{[^}]*\}/g, "").replace(/&#x?[0-9a-f]+;/gi, "");
}

/**
 * Pemeriksaan master hasil builder terhadap blueprint dasarnya. Builder hanya boleh menambah gaya dan ornamen, jadi setiap
 * token engine, data-lux-field, dan seksi blueprint wajib tetap ada; warna hanya boleh hidup di :root; seluruh skrip
 * inline harus lolos parse karena satu galat sintaks mematikan pembuka sampul, RSVP, dan musik.
 */
export function auditBuilderMaster(html: string, blueprint: string): MasterIssue[] {
  const issues: MasterIssue[] = [];

  const outside = outsideRoot(html);
  const hex = outside.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  const rgb = outside.match(/\brgba?\(/g) ?? [];
  if (hex.length || rgb.length) {
    issues.push({ code: "color", message: `Ada ${hex.length + rgb.length} warna mati di luar :root (${[...new Set(hex)].slice(0, 5).join(", ")}).` });
  }

  const tokens = tokensOf(html);
  const missingTokens = [...tokensOf(blueprint)].filter((t) => !tokens.has(t));
  if (missingTokens.length) issues.push({ code: "token", message: `Token engine hilang: ${missingTokens.join(", ")}.` });

  const fields = fieldsOf(html);
  const missingFields = [...fieldsOf(blueprint)].filter((f) => !fields.has(f));
  if (missingFields.length) issues.push({ code: "label", message: `Label yang bisa diedit klien hilang: ${missingFields.join(", ")}.` });

  const sections = sectionsOf(html);
  const missingSections = [...sectionsOf(blueprint)].filter((s) => !sections.has(s));
  if (missingSections.length) issues.push({ code: "section", message: `Seksi hilang: ${missingSections.join(", ")}.` });

  const blocks = blocksOf(html);
  const missingBlocks = [...blocksOf(blueprint)].filter((b) => !blocks.has(b));
  if (missingBlocks.length) issues.push({ code: "block", message: `Penanda blok hilang: ${missingBlocks.join(", ")}.` });

  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  scripts.forEach((code, i) => {
    try {
      new vm.Script(code);
    } catch (err) {
      issues.push({ code: "script", message: `Skrip inline #${i + 1} gagal diparse: ${err instanceof Error ? err.message : String(err)}` });
    }
  });

  return issues;
}
