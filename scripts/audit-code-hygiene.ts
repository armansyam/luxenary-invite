/**
 * =============================================================================
 * LUXENARY-INVITE: INDUSTRIAL CODE HYGIENE & CONTRACT AUDIT LINTER
 * =============================================================================
 * Skrip audit statis otomatis untuk memverifikasi kontrak kebersihan kode:
 * 1. Zero-Hardcode Hex & Dynamic Token Compliance (Anti-Hardcode Policy)
 * 2. Cross-File Asset Reference Graph & Broken Link Scanner
 * 3. AST CSS Dead Selectors & Duplicate Rule Detector
 * 4. Zombie Comments & Structural Mismatch Guard
 * 5. Template Placeholder Compiler Sync
 * =============================================================================
 */

import fs from "fs";
import path from "path";

export interface HygieneIssue {
  domain: string;
  severity: "ERROR" | "WARNING";
  file: string;
  line?: number;
  message: string;
  codeSnippet?: string;
}

export class CodeHygieneAuditor {
  private issues: HygieneIssue[] = [];
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  private getAllFiles(dir: string, extensions: string[]): string[] {
    let results: string[] = [];
    const fullPath = path.resolve(this.rootDir, dir);
    if (!fs.existsSync(fullPath)) return results;

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(this.getAllFiles(path.relative(this.rootDir, entryPath), extensions));
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(entryPath);
      }
    }
    return results;
  }

  /**
   * DOMAIN 1: Memverifikasi Zero-Hardcode Policy pada komponen dinamis:
   * 1. Inline styles & script innerHTML: dilarang menggunakan hex mati tanpa var().
   * 2. Kanvas, overlay gradient, kartu, tombol, dan border: wajib menggunakan CSS token
   *    (var(--primary), var(--accent), var(--bg-dark), color-mix) bukan hex mati.
   */
  public auditHexColors(): void {
    const themeFiles = this.getAllFiles("themes", [".html"]);
    const rawHexRegex = /#([0-9a-fA-F]{3,8})\b/g;

    const DYNAMIC_CSS_PROPERTIES = [
      "background", "background-color", "border", "border-color",
      "box-shadow", "background-image"
    ];

    for (const file of themeFiles) {
      const relFile = path.relative(this.rootDir, file);
      if (relFile.includes("starter-blueprint")) continue;

      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      let inStyle = false;
      let inRoot = false;

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.includes("<style")) inStyle = true;
        if (trimmed.includes("</style>")) inStyle = false;

        const lineWithoutHandlebars = line.replace(/\{\{[\s\S]*?\}\}/g, "");
        if (inStyle && lineWithoutHandlebars.includes(":root")) inRoot = true;

        if (inRoot) {
          if (lineWithoutHandlebars.includes("}")) inRoot = false;
          return;
        }

        // 1. Audit Inline Styles & Runtime JS innerHTML
        if (line.includes("style=") || line.includes("innerHTML")) {
          const lineWithoutVar = line.replace(/var\(--[a-zA-Z0-9_\-]+,\s*#[0-9a-fA-F]{3,8}\)/g, "");
          let m: RegExpExecArray | null;
          while ((m = rawHexRegex.exec(lineWithoutVar)) !== null) {
            if (lineWithoutVar.substring(Math.max(0, m.index - 2), m.index) === "&#") continue;
            if (lineWithoutVar.includes(".replace(")) continue;

            this.issues.push({
              domain: "ZERO-HARDCODE-INLINE",
              severity: "ERROR",
              file: relFile,
              line: idx + 1,
              message: `Ditemukan nilai heksadesimal mentah (#${m[1]}) pada inline style atau JS. Gunakan token dinamis var(--token, #${m[1]}).`,
              codeSnippet: trimmed,
            });
          }
          return;
        }

        // 2. Audit CSS Properties (Kanvas, Overlay, Kartu, Tombol, Border)
        if (inStyle) {
          const isDynamicProp = DYNAMIC_CSS_PROPERTIES.some((prop) => {
            const regex = new RegExp(`^${prop}\\s*:`, "i");
            return regex.test(trimmed);
          });

          if (isDynamicProp) {
            const lineWithoutTokens = line
              .replace(/var\(--[a-zA-Z0-9_\-]+(?:,\s*#[0-9a-fA-F]{3,8})?\)/g, "")
              .replace(/color-mix\([^\)]*\)/g, "");

            let m: RegExpExecArray | null;
            while ((m = rawHexRegex.exec(lineWithoutTokens)) !== null) {
              this.issues.push({
                domain: "ZERO-HARDCODE-CSS",
                severity: "ERROR",
                file: relFile,
                line: idx + 1,
                message: `Ditemukan warna statis (#${m[1]}) pada komponen kanvas/border/background. Wajib menggunakan token dinamis: var(--bg-dark), var(--primary), var(--accent), atau color-mix().`,
                codeSnippet: trimmed,
              });
            }
          }
        }
      });
    }
  }

  /**
   * DOMAIN 2: Memverifikasi Integritas Aset & Deteksi Broken Link (404).
   * Memastikan setiap url('/assets/...') atau src='/assets/...' yang dipanggil benar-benar ada di disk.
   */
  public auditAssetLinks(): void {
    const themeFiles = this.getAllFiles("themes", [".html"]);
    const assetRegex = /(?:src|href|url)\([\"'\']?(\/assets\/[^\"\'\)\s]+)[\"'\']?\)|(?:src|href)=[\"'](\/assets\/[^\"'\s>]+)[\"']/g;

    for (const file of themeFiles) {
      const relFile = path.relative(this.rootDir, file);
      const content = fs.readFileSync(file, "utf8");

      let match: RegExpExecArray | null;
      while ((match = assetRegex.exec(content)) !== null) {
        const assetPath = (match[1] || match[2] || "").split("?")[0].split("#")[0];
        if (!assetPath) continue;

        const diskPath = path.join(this.rootDir, "public", assetPath);
        if (!fs.existsSync(diskPath)) {
          this.issues.push({
            domain: "ASSET-INTEGRITY",
            severity: "ERROR",
            file: relFile,
            message: `Aset fisik tidak ditemukan di disk (404 Dead Link): ${assetPath}`,
            codeSnippet: match[0],
          });
        }
      }
    }
  }

  /**
   * DOMAIN 3: Deteksi Selektor CSS Mati (Dead Selectors) pada tema aktif.
   */
  public auditDeadCssSelectors(): void {
    const themeFiles = this.getAllFiles("themes", [".html"]);

    // Dynamic classes that are inserted at runtime or via dynamic server tags
    const dynamicallyProvidedClasses = new Set([
      "is-visible", "lux-at-home-zone", "active", "dock-hidden", "fab-hidden",
      "open", "playing", "wish-item", "site-footer", "event-card", "ev-badge",
      "ev-title", "ev-date", "ev-time", "ev-venue", "ev-address", "btn-maps",
      "story-chapter-block", "sc-label", "sc-title", "sc-desc", "gallery-masonry-grid",
      "gallery-masonry-item", "gift-card", "bank-card", "bank-label", "bank-owner",
      "bank-row", "bank-number", "gift-tabs", "gift-tab-btn", "btn-copy", "btn-map-outline",
      "no-closing-photo", "has-closing-photo", "qr-btn", "dock-btn", "nav-item", "opened",
      "fade-in", "zoom-in", "rotate-disc", "revealed"
    ]);

    for (const file of themeFiles) {
      const relFile = path.relative(this.rootDir, file);
      if (relFile.includes("starter-blueprint")) continue;

      const content = fs.readFileSync(file, "utf8");
      const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      if (!styleMatch) continue;

      const css = styleMatch[1];
      const classMatches = css.match(/(?:^|[\s,>+~{;}])\.([a-zA-Z_][a-zA-Z0-9_\-]*)/g) || [];
      const uniqueClasses = [...new Set(classMatches.map((c) => c.trim().replace(/^[,>+~{;}\s]*\./, "")))];

      for (const cls of uniqueClasses) {
        if (dynamicallyProvidedClasses.has(cls)) continue;

        // Pastikan class tersebut muncul di HTML atau tag skrip
        const classUsageRegex = new RegExp(`["\\s\\.\`]${cls}["\\s\\.\`\(\\{\\:]`, "i");
        if (!classUsageRegex.test(content)) {
          this.issues.push({
            domain: "AST-CSS",
            severity: "ERROR",
            file: relFile,
            message: `Selektor CSS .${cls} didefinisikan di <style> tetapi tidak pernah digunakan di HTML maupun runtime JS.`,
          });
        }
      }
    }
  }

  /**
   * DOMAIN 4: Deteksi Komentar Zombi & Ketidakcocokan Semantik
   */
  public auditZombieComments(): void {
    const themeFiles = this.getAllFiles("themes", [".html"]);

    for (const file of themeFiles) {
      const relFile = path.relative(this.rootDir, file);
      const content = fs.readFileSync(file, "utf8");

      // Check for common zombie artifacts
      if (content.includes("/* 4-CORNER FLORAL ORNAMENTS */")) {
        this.issues.push({
          domain: "ZOMBIE-COMMENTS",
          severity: "ERROR",
          file: relFile,
          message: "Ditemukan komentar zombi '4-CORNER FLORAL ORNAMENTS' padahal elemen sudut bawah telah dimusnahkan.",
        });
      }

      if (content.includes("DELIBERATELY DO NOT CLEAN UP") || content.includes("TODO: REMOVE") || content.includes("FIXME: HACK")) {
        this.issues.push({
          domain: "ZOMBIE-COMMENTS",
          severity: "WARNING",
          file: relFile,
          message: "Ditemukan sisa komentar debug/hack usang yang melanggar arsitektur produksi.",
        });
      }
    }
  }

  /**
   * Menjalankan seluruh rangkaian audit kebersihan kode dan mencetak laporan eksekutif.
   */
  public run(): { passed: boolean; errorCount: number; warningCount: number } {
    console.log("================================================================================");
    console.log("🛡️ LUXENARY-INVITE: AUTOMATED CODE HYGIENE & CONTRACT AUDIT LINTER 🛡️");
    console.log("================================================================================");

    this.auditHexColors();
    this.auditAssetLinks();
    this.auditDeadCssSelectors();
    this.auditZombieComments();

    const errors = this.issues.filter((i) => i.severity === "ERROR");
    const warnings = this.issues.filter((i) => i.severity === "WARNING");

    console.log(`\nDomain yang Diuji: 4 Domain (Token Hex, Integritas Aset, AST CSS, Komentar Zombi)`);
    console.log(`Total Masalah: ${this.issues.length} (Error: ${errors.length}, Warning: ${warnings.length})\n`);

    if (this.issues.length > 0) {
      console.log("--------------------------------------------------------------------------------");
      console.log("📋 RINCIAN TEMUAN HYGIENE LINTER:");
      console.log("--------------------------------------------------------------------------------");
      for (const item of this.issues) {
        const icon = item.severity === "ERROR" ? "❌ [ERROR]" : "⚠️ [WARN]";
        const loc = item.line ? `:${item.line}` : "";
        console.log(`${icon} [${item.domain}] ${item.file}${loc}`);
        console.log(`   ↳ ${item.message}`);
        if (item.codeSnippet) {
          console.log(`   ↳ Snippet: ${item.codeSnippet.substring(0, 100)}`);
        }
      }
      console.log("--------------------------------------------------------------------------------");
    }

    if (errors.length > 0) {
      console.error(`\n❌ GAGAL AUDIT HYGIENE: Ditemukan ${errors.length} pelanggaran kontrak kritis!`);
      return { passed: false, errorCount: errors.length, warningCount: warnings.length };
    }

    console.log("✅ 100% LOLOS AUDIT HYGIENE: Seluruh kontrak kebersihan kode, token CSS, dan aset terpenuhi!");
    return { passed: true, errorCount: 0, warningCount: warnings.length };
  }
}

// CLI Execution
if (require.main === module) {
  const auditor = new CodeHygieneAuditor();
  const res = auditor.run();
  process.exit(res.passed ? 0 : 1);
}
