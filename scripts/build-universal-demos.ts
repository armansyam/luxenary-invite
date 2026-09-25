import fs from "fs";
import path from "path";
import sharp from "sharp";
import { compileAndSaveStaticDemo } from "../lib/demoPublisher";

interface ThemeMeta {
  id: string;
  title: string;
  subtitle: string;
  themeType: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
}

const THEMES: ThemeMeta[] = [
  {
    id: "kalandra-birthday",
    title: "Zara Kimberly",
    subtitle: "Sweet 17th Birthday Celebration",
    themeType: "BIRTHDAY",
    primaryColor: "#c084fc",
    accentColor: "#f43f5e",
    bgColor: "#1e1b4b",
  },
  {
    id: "festivo",
    title: "Zara Kimberly",
    subtitle: "Glam & Chic Birthday Bash",
    themeType: "BIRTHDAY",
    primaryColor: "#ec4899",
    accentColor: "#8b5cf6",
    bgColor: "#0f172a",
  },
  {
    id: "al-fariz",
    title: "Muhammad Fariz",
    subtitle: "Walimatul Khitan",
    themeType: "KHITAN",
    primaryColor: "#10b981",
    accentColor: "#d97706",
    bgColor: "#064e3b",
  },
  {
    id: "al-khalid",
    title: "Muhammad Khalid",
    subtitle: "Tasyakuran Aqiqah",
    themeType: "AQIQAH",
    primaryColor: "#0284c7",
    accentColor: "#38bdf8",
    bgColor: "#082f49",
  },
  {
    id: "cendekia",
    title: "Rina Oktaviani, S.Kom.",
    subtitle: "Graduation Celebration",
    themeType: "WISUDA",
    primaryColor: "#4f46e5",
    accentColor: "#f59e0b",
    bgColor: "#1e1b4b",
  },
  {
    id: "sinergi",
    title: "PT Sinergi Prima",
    subtitle: "Grand Inauguration & Syukuran",
    themeType: "GATHERING",
    primaryColor: "#0d9488",
    accentColor: "#f59e0b",
    bgColor: "#134e4a",
  },
];

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "\'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function generateCoverSvg(meta: ThemeMeta, width = 1200, height = 800): Buffer {
  const safeTitle = escapeXml(meta.title);
  const safeSubtitle = escapeXml(meta.subtitle);
  const safeThemeType = escapeXml(meta.themeType);

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${meta.bgColor}" />
          <stop offset="50%" stop-color="${meta.primaryColor}" stop-opacity="0.6" />
          <stop offset="100%" stop-color="${meta.bgColor}" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${meta.primaryColor}" />
          <stop offset="100%" stop-color="${meta.accentColor}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
      <circle cx="${width * 0.85}" cy="${height * 0.2}" r="260" fill="${meta.primaryColor}" opacity="0.15" />
      <circle cx="${width * 0.15}" cy="${height * 0.8}" r="220" fill="${meta.accentColor}" opacity="0.12" />
      
      <!-- Content Box -->
      <g transform="translate(${width / 2}, ${height / 2})" text-anchor="middle">
        <rect x="-140" y="-180" width="280" height="38" rx="19" fill="${meta.primaryColor}" fill-opacity="0.25" stroke="${meta.primaryColor}" stroke-width="1.5" />
        <text y="-156" fill="${meta.accentColor}" font-family="sans-serif" font-size="14" font-weight="bold" letter-spacing="3">${safeThemeType}</text>
        
        <text y="-60" fill="#ffffff" font-family="serif" font-size="52" font-weight="bold">${safeTitle}</text>
        <text y="-10" fill="#e2e8f0" font-family="sans-serif" font-size="22" opacity="0.85">${safeSubtitle}</text>
        
        <line x1="-120" y1="30" x2="120" y2="30" stroke="url(#accentGrad)" stroke-width="3" stroke-linecap="round" />
        <text y="70" fill="#cbd5e1" font-family="sans-serif" font-size="15" letter-spacing="1.5">LUXENARY EXCLUSIVE INVITATION</text>
      </g>
    </svg>
  `;
  return Buffer.from(svg);
}

function generateHeroSvg(meta: ThemeMeta, width = 600, height = 600): Buffer {
  const initial = meta.title.charAt(0).toUpperCase();
  const safeTitle = escapeXml(meta.title);
  const safeSubtitle = escapeXml(meta.subtitle);

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${meta.bgColor}" />
          <stop offset="100%" stop-color="${meta.primaryColor}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="${meta.bgColor}" />
      <circle cx="300" cy="270" r="160" fill="url(#avatarGrad)" stroke="${meta.accentColor}" stroke-width="4" />
      <text x="300" y="325" fill="#ffffff" font-family="serif" font-size="140" font-weight="bold" text-anchor="middle">${initial}</text>
      
      <text x="300" y="480" fill="#ffffff" font-family="sans-serif" font-size="28" font-weight="bold" text-anchor="middle">${safeTitle}</text>
      <text x="300" y="520" fill="${meta.accentColor}" font-family="sans-serif" font-size="18" text-anchor="middle">${safeSubtitle}</text>
    </svg>
  `;
  return Buffer.from(svg);
}

async function main() {
  console.log("=== BUILDING UNIVERSAL THEME DEMOS & CLEAN ASSETS ===");

  for (const t of THEMES) {
    const dir = path.join(process.cwd(), "public", "demo", t.id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const coverSvg = generateCoverSvg(t, 1200, 800);
    const heroSvg = generateHeroSvg(t, 600, 600);

    const coverWebp = await sharp(coverSvg).webp({ quality: 85 }).toBuffer();
    const heroWebp = await sharp(heroSvg).webp({ quality: 85 }).toBuffer();
    const thumbDesktopWebp = await sharp(coverSvg).resize(800, 500).webp({ quality: 85 }).toBuffer();
    const thumbMobileWebp = await sharp(heroSvg).resize(400, 600).webp({ quality: 85 }).toBuffer();

    fs.writeFileSync(path.join(dir, "cover.webp"), coverWebp);
    fs.writeFileSync(path.join(dir, "hero.webp"), heroWebp);
    fs.writeFileSync(path.join(dir, "thumbnail_desktop.webp"), thumbDesktopWebp);
    fs.writeFileSync(path.join(dir, "thumbnail_mobile.webp"), thumbMobileWebp);
    fs.writeFileSync(path.join(dir, "background.webp"), coverWebp);

    console.log(`- Created clean assets for ${t.id}`);

    // Compile static index.html
    try {
      await compileAndSaveStaticDemo(t.id);
      console.log(`- Successfully compiled demo index.html for ${t.id}`);
    } catch (err: any) {
      console.error(`- Error compiling ${t.id}:`, err.message);
    }
  }

  console.log("\n=== ALL UNIVERSAL THEMES COMPILED SUCCESSFULLY ===");
}

main().catch(console.error);
