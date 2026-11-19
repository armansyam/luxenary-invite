import JSZip from "jszip";

const MAX_XLSX_BYTES = 5 * 1024 * 1024;
const MAX_XML_UNCOMPRESSED_BYTES = 15 * 1024 * 1024;

function decodeXmlEntities(raw: string): string {
  return raw.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (_match, entity: string) => {
    switch (entity) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default: {
        if (entity.startsWith("#x") || entity.startsWith("#X")) {
          const code = Number.parseInt(entity.slice(2), 16);
          return Number.isFinite(code) ? String.fromCodePoint(code) : "";
        }
        if (entity.startsWith("#")) {
          const code = Number.parseInt(entity.slice(1), 10);
          return Number.isFinite(code) ? String.fromCodePoint(code) : "";
        }
        return "";
      }
    }
  });
}

function colRefToIndex(ref: string): number {
  const letters = /^([A-Za-z]+)/.exec(ref)?.[1]?.toUpperCase();
  if (!letters) return -1;
  let index = 0;
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
}

function extractTextRuns(xmlFragment: string): string {
  // Hapus <rPh> (furigana/phonetic guide) bila ada agar tidak menggandakan teks sel.
  const withoutPhonetic = xmlFragment.replace(/<rPh[\s\S]*?<\/rPh>/g, "");
  const parts: string[] = [];
  const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let match: RegExpExecArray | null;
  while ((match = tRe.exec(withoutPhonetic)) !== null) {
    parts.push(decodeXmlEntities(match[1]));
  }
  return parts.join("");
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = siRe.exec(xml)) !== null) {
    strings.push(extractTextRuns(match[1]));
  }
  return strings;
}

async function readZipTextSafe(
  zip: JSZip,
  entryPath: string,
  budget: { remaining: number },
): Promise<string | null> {
  const file = zip.file(entryPath);
  if (!file) return null;
  const bytes = await file.async("uint8array");
  budget.remaining -= bytes.byteLength;
  if (budget.remaining < 0) {
    throw new Error("Isi berkas XLSX melebihi batas ukuran aman dekompresi (15 MB).");
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function resolveFirstSheetPath(workbookXml: string | null, relsXml: string | null): string {
  const fallback = "xl/worksheets/sheet1.xml";
  if (!workbookXml || !relsXml) return fallback;

  const sheetMatch = /<sheet\b[^>]*\b(?:r:id|id)="([^"]+)"/i.exec(workbookXml);
  const relId = sheetMatch?.[1];
  if (!relId) return fallback;

  const relRe = /<Relationship\b([^>]*)>/gi;
  let relMatch: RegExpExecArray | null;
  while ((relMatch = relRe.exec(relsXml)) !== null) {
    const attrs = relMatch[1];
    const id = /\bId="([^"]+)"/i.exec(attrs)?.[1];
    const target = /\bTarget="([^"]+)"/i.exec(attrs)?.[1];
    if (id === relId && target) {
      const normalized = target.replace(/^\/+/, "");
      return normalized.startsWith("xl/") ? normalized : `xl/${normalized.replace(/^\.\//, "")}`;
    }
  }
  return fallback;
}

/**
 * Mengurai lembar kerja pertama berkas Excel (.xlsx) menjadi array baris/kolom string.
 * Memakai JSZip tanpa ketergantungan parser eksternal serta membatasi ukuran ZIP/XML untuk anti-zip-bomb.
 */
export async function parseXlsxRows(input: ArrayBuffer | Uint8Array): Promise<string[][]> {
  const byteLength = input instanceof Uint8Array ? input.byteLength : input.byteLength;
  if (byteLength === 0) {
    throw new Error("Berkas XLSX kosong.");
  }
  if (byteLength > MAX_XLSX_BYTES) {
    throw new Error("Ukuran berkas XLSX melebihi batas maksimal 5 MB.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(input);
  } catch {
    throw new Error("Berkas bukan arsip XLSX yang valid.");
  }

  const budget = { remaining: MAX_XML_UNCOMPRESSED_BYTES };
  const workbookXml = await readZipTextSafe(zip, "xl/workbook.xml", budget);
  const relsXml = await readZipTextSafe(zip, "xl/_rels/workbook.xml.rels", budget);
  const sheetPath = resolveFirstSheetPath(workbookXml, relsXml);
  const sheetXml = (await readZipTextSafe(zip, sheetPath, budget))
    ?? (await readZipTextSafe(zip, "xl/worksheets/sheet1.xml", budget));

  if (!sheetXml) {
    throw new Error("Lembar kerja Excel tidak ditemukan di dalam berkas XLSX.");
  }

  const sharedStringsXml = await readZipTextSafe(zip, "xl/sharedStrings.xml", budget);
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];

  const rows: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(sheetXml)) !== null) {
    const rowBody = rowMatch[1];
    const rowCells: string[] = [];
    const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;
    let sequentialCol = 0;

    while ((cellMatch = cellRe.exec(rowBody)) !== null) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2] || "";
      const refAttr = /\br="([^"]+)"/.exec(attrs)?.[1] || "";
      const typeAttr = /\bt="([^"]+)"/.exec(attrs)?.[1] || "";

      const parsedCol = refAttr ? colRefToIndex(refAttr) : -1;
      const colIdx = parsedCol >= 0 ? parsedCol : sequentialCol;
      sequentialCol = colIdx + 1;

      while (rowCells.length <= colIdx) rowCells.push("");

      let value = "";
      if (typeAttr === "inlineStr") {
        value = extractTextRuns(inner);
      } else {
        const vMatch = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(inner);
        const rawV = vMatch ? decodeXmlEntities(vMatch[1]) : "";
        if (typeAttr === "s") {
          const idx = Number.parseInt(rawV, 10);
          value = Number.isInteger(idx) && idx >= 0 && idx < sharedStrings.length ? sharedStrings[idx] : "";
        } else if (typeAttr === "b") {
          value = rawV === "1" ? "TRUE" : rawV === "0" ? "FALSE" : rawV;
        } else {
          value = rawV;
        }
      }

      rowCells[colIdx] = value.trim();
    }

    if (rowCells.some((c) => c !== "")) {
      rows.push(rowCells);
    }
  }

  return rows;
}
