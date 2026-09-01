import fs from "fs";
import path from "path";

let cachedFonts: { family: string; url: string; block: string }[] | null = null;
let cachedBase64: Record<string, string> = {};

function parseFontsCss() {
  if (cachedFonts) return;
  const fontsCssPath = path.join(process.cwd(), "public", "fonts", "fonts.css");
  if (!fs.existsSync(fontsCssPath)) {
    cachedFonts = [];
    return;
  }

  const content = fs.readFileSync(fontsCssPath, "utf-8");
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  cachedFonts = [];

  let match;
  while ((match = fontFaceRegex.exec(content)) !== null) {
    const blockContent = match[1];
    
    const familyMatch = blockContent.match(/font-family:\s*['"]([^'"]+)['"]/);
    if (!familyMatch) continue;
    const family = familyMatch[1];

    const urlMatch = blockContent.match(/url\((['"]?)([^'")]+)\1\)/);
    if (!urlMatch) continue;
    const url = urlMatch[2];

    cachedFonts.push({
      family,
      url,
      block: blockContent
    });
  }
}

function getBase64Font(fontUrl: string): string | null {
  if (cachedBase64[fontUrl]) return cachedBase64[fontUrl];

  const filename = fontUrl.split("/").pop();
  if (!filename) return null;

  const filePath = path.join(process.cwd(), "public", "fonts", filename);
  if (!fs.existsSync(filePath)) return null;

  const buffer = fs.readFileSync(filePath);
  const base64 = `data:font/woff2;charset=utf-8;base64,${buffer.toString("base64")}`;
  cachedBase64[fontUrl] = base64;
  return base64;
}

export async function embedFontsIntoHtml(html: string): Promise<string> {
  parseFontsCss();
  if (!cachedFonts || cachedFonts.length === 0) return html;

  const usedFamilies = new Set<string>();
  const familyUsageRegex = /font-family:\s*['"]([^'"]+)['"]/g;
  let familyMatch;
  while ((familyMatch = familyUsageRegex.exec(html)) !== null) {
    usedFamilies.add(familyMatch[1]);
  }

  if (usedFamilies.size === 0) return html;

  const requiredFonts = cachedFonts.filter(f => usedFamilies.has(f.family));
  if (requiredFonts.length === 0) return html;

  let injectedStyle = '<style id="lux-fonts">\n';
  
  requiredFonts.forEach(font => {
    const base64Url = getBase64Font(font.url);
    if (base64Url) {
      let newBlock = font.block
        .replace(font.url, base64Url)
        .replace(/font-display:\s*swap\s*;?/g, 'font-display: block;');
      injectedStyle += `  @font-face {${newBlock}}\n`;
    }
  });
  
  injectedStyle += '</style>\n';

  // Bersihkan link CSS font lama (baik lokal maupun google fonts yang terlewat)
  let processedHtml = html.replace(/<link[^>]+href="\/fonts\/fonts\.css"[^>]*>/g, "");
  // Hapus Google Fonts jika ada (untuk tema yang belum dibersihkan)
  processedHtml = processedHtml.replace(/<link[^>]+href="https:\/\/fonts\.googleapis\.com[^>]*>/g, "");
  processedHtml = processedHtml.replace(/<link[^>]+href="https:\/\/fonts\.gstatic\.com[^>]*>/g, "");

  if (processedHtml.includes("</head>")) {
    processedHtml = processedHtml.replace("</head>", `${injectedStyle}</head>`);
  }

  return processedHtml;
}
