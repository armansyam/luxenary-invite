import fs from "fs";
import path from "path";
import https from "https";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Google Fonts CSS URLs to download font binary files from
const GOOGLE_FONT_URLS = [
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap",
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cinzel+Decorative:wght@400;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap",
  "https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap",
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap",
  "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=Great+Vibes&display=swap",
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        headers: {
          // Send modern User-Agent to get .woff2 format
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      }
    );
  });
}

function downloadBinary(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return downloadBinary(res.headers.location, destPath).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
      file.on("error", reject);
    });
  });
}

async function main() {
  console.log("🚀 Starting Self-Hosted Font Downloader...");
  let combinedCss = "/* S-Invite — Self-Hosted Local Google Fonts (Zero External Latency) */\n\n";

  for (const url of GOOGLE_FONT_URLS) {
    try {
      console.log(`📥 Fetching CSS: ${url}`);
      let css = await fetchText(url);

      // Find all font URLs in CSS
      const fontUrlMatches = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^\)]+)\)/g)];

      for (const match of fontUrlMatches) {
        const remoteUrl = match[1];
        const fileName = path.basename(new URL(remoteUrl).pathname);
        const localPath = path.join(FONTS_DIR, fileName);

        if (!fs.existsSync(localPath)) {
          process.stdout.write(`  ⬇️ Downloading ${fileName}... `);
          await downloadBinary(remoteUrl, localPath);
          console.log("done.");
        }

        // Replace remote gstatic URL with local /fonts/ URL
        css = css.replaceAll(remoteUrl, `/fonts/${fileName}`);
      }

      combinedCss += css + "\n\n";
    } catch (err) {
      console.error("Error processing font:", err);
    }
  }

  const outputCssPath = path.join(FONTS_DIR, "fonts.css");
  fs.writeFileSync(outputCssPath, combinedCss);
  console.log(`\n🎉 Success! All fonts downloaded and saved locally in public/fonts/`);
  console.log(`📄 Generated local CSS: public/fonts/fonts.css (${(combinedCss.length / 1024).toFixed(1)} KB)`);
}

main();
