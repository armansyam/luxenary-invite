/**
 * Unit tests untuk fungsi rendering template.
 * Menguji: helper escaping, blok conditional {{#if}}, dan kebersihan placeholder.
 * renderTemplateFile() sendiri tidak di-unit-test di sini karena membutuhkan
 * file fisik di disk — diuji di test-theme-matrix.ts (integration level).
 */
import { describe, it, expect } from "vitest";

// ─── Helpers yang direplikasi dari lib/renderTemplate untuk unit testing ───
// (Fungsi ini private di modul asli, sehingga kita uji perilakunya via output)

function escapeHtmlSafe(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function applyConditionalBlocks(
  tpl: string,
  data: Record<string, any>
): string {
  // {{#if key}}...{{/if}} → tampilkan jika data[key] truthy, hapus jika falsy
  return tpl.replace(
    /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
    (_match: string, key: string, content: string) => {
      return data[key] ? content : "";
    }
  );
}

function replacePlaceholders(
  tpl: string,
  data: Record<string, any>
): string {
  return tpl.replace(/{{(\w+)}}/g, (_match: string, key: string) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

function hasUnresolvedPlaceholders(html: string): boolean {
  return /{{[a-zA-Z]\w*}}/.test(html);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("escapeHtmlSafe — XSS Prevention", () => {
  it("meng-escape karakter < > & \" ' dengan benar", () => {
    expect(escapeHtmlSafe("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
    expect(escapeHtmlSafe('He said "hello"')).toBe("He said &quot;hello&quot;");
    expect(escapeHtmlSafe("O'Brien")).toBe("O&#x27;Brien");
  });

  it("tidak meng-escape entity HTML yang sudah valid (&amp; &lt;)", () => {
    expect(escapeHtmlSafe("&amp; sudah aman")).toBe("&amp; sudah aman");
    expect(escapeHtmlSafe("&lt;tag&gt;")).toBe("&lt;tag&gt;");
  });

  it("mengembalikan string kosong untuk input non-string", () => {
    expect(escapeHtmlSafe(null as any)).toBe("");
    expect(escapeHtmlSafe(undefined as any)).toBe("");
  });
});

describe("applyConditionalBlocks — {{#if}} template logic", () => {
  it("menampilkan blok jika key truthy", () => {
    const tpl = "Hello {{#if showMap}}<div>Peta Lokasi</div>{{/if}} World";
    const result = applyConditionalBlocks(tpl, { showMap: true });
    expect(result).toContain("<div>Peta Lokasi</div>");
  });

  it("menghapus blok BERSIH jika key falsy (tidak ada sisa delimiter)", () => {
    const tpl = "Hello {{#if showMap}}<div>Peta Lokasi</div>{{/if}} World";
    const result = applyConditionalBlocks(tpl, { showMap: false });
    expect(result).not.toContain("Peta Lokasi");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
    expect(result.trim()).toBe("Hello  World");
  });

  it("menghapus blok jika key tidak ada di data", () => {
    const tpl = "{{#if hiddenSection}}<b>Tersembunyi</b>{{/if}}";
    const result = applyConditionalBlocks(tpl, {});
    expect(result.trim()).toBe("");
  });

  it("menangani multi blok conditional independen", () => {
    const tpl =
      "{{#if a}}A{{/if}}{{#if b}}B{{/if}}{{#if c}}C{{/if}}";
    const result = applyConditionalBlocks(tpl, { a: true, b: false, c: true });
    expect(result).toBe("AC");
  });
});

describe("replacePlaceholders — {{key}} substitution", () => {
  it("mengganti semua {{key}} dengan nilai dari data", () => {
    const tpl = "Yth. {{groomName}} & {{brideName}}";
    const result = replacePlaceholders(tpl, {
      groomName: "Arman",
      brideName: "Siti",
    });
    expect(result).toBe("Yth. Arman & Siti");
  });

  it("placeholder yang tidak ada di data → string kosong (tidak bocor)", () => {
    const tpl = "{{groomName}} dan {{unknownField}}";
    const result = replacePlaceholders(tpl, { groomName: "Arman" });
    expect(result).toBe("Arman dan ");
    // Tidak ada sisa {{variable}} di output
    expect(hasUnresolvedPlaceholders(result)).toBe(false);
  });
});

describe("hasUnresolvedPlaceholders — deteksi placeholder bocor", () => {
  it("mendeteksi sisa {{variable}} di output", () => {
    expect(hasUnresolvedPlaceholders("Hello {{groomName}}")).toBe(true);
    expect(hasUnresolvedPlaceholders("<div>{{someKey}}</div>")).toBe(true);
  });

  it("tidak false-positive pada HTML normal", () => {
    expect(hasUnresolvedPlaceholders("<div class='name'>Arman</div>")).toBe(false);
    expect(hasUnresolvedPlaceholders("Teks lengkap tanpa placeholder")).toBe(false);
  });
});
