import fs from "fs";
import path from "path";

function updateHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      updateHtmlFiles(fullPath);
    } else if (entry.name.endsWith(".html")) {
      let content = fs.readFileSync(fullPath, "utf-8");

      // Replace preconnect & fonts.googleapis.com link tags with local fonts.css
      const googleFontRegex = /\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">[\s\S]*?<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+" rel="stylesheet">/g;

      if (googleFontRegex.test(content)) {
        content = content.replace(
          googleFontRegex,
          `\n  <!-- 100% Self-Hosted Local Google Fonts (Zero External Latency) -->\n  <link rel="stylesheet" href="/fonts/fonts.css">`
        );
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Converted to local font: ${fullPath}`);
      }
    }
  }
}

updateHtmlFiles(path.join(process.cwd(), "themes"));
