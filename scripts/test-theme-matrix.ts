import "dotenv/config";
import { renderTemplateFile } from "../lib/renderTemplate";
import { prisma } from "../lib/prisma";
import { COLOR_PALETTES } from "../lib/colorPalettes";

interface ThemeTestResult {
  themeId: string;
  category: string;
  scenarios: {
    normal: boolean;
    extreme: boolean;
    minimal: boolean;
    palettes: boolean;
  };
  unparsedPlaceholders: string[];
  xssVulnerable: boolean;
  errors: string[];
}

async function runThemeMatrixTest() {
  console.log("================================================================================");
  console.log("🎨 [THEME MATRIX STRESS TEST] PENGUJIAN MENYELURUH 18 TEMA FISIK & DATA EKSTREM 🎨");
  console.log("================================================================================\n");

  const themes = await prisma.theme.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { id: "asc" }],
  });

  console.log(`Ditemukan ${themes.length} tema aktif di database.\n`);

  const results: ThemeTestResult[] = [];
  let totalFailures = 0;

  for (const theme of themes) {
    const result: ThemeTestResult = {
      themeId: theme.id,
      category: theme.category,
      scenarios: { normal: false, extreme: false, minimal: false, palettes: false },
      unparsedPlaceholders: [],
      xssVulnerable: false,
      errors: [],
    };

    console.log(`▶ Menguji Tema: [${theme.category.toUpperCase()}] ${theme.name} (${theme.id})...`);

    // 1. DATASET NORMAL
    const normalData: Record<string, any> = {
      title: "Pernikahan Dimas & Clarissa",
      firstNickname: "Dimas",
      secondNickname: "Clarissa",
      firstFullName: "Dimas Suryonegoro, S.T.",
      secondFullName: "Clarissa Maharani, B.A.",
      firstName: "Dimas",
      secondName: "Clarissa",
      firstDisplayName: "Dimas Suryonegoro, S.T.",
      secondDisplayName: "Clarissa Maharani, B.A.",
      firstRole: "Pria",
      secondRole: "Wanita",
      firstParentPrefix: "Putra dari",
      secondParentPrefix: "Putri dari",
      firstFather: "Bpk. Bambang Suryonegoro",
      firstMother: "Ibu Sri Wahyuni",
      secondFather: "Bpk. Hendra Maharani",
      secondMother: "Ibu Ratna Dewi",
      firstParents: "Bpk. Bambang Suryonegoro & Ibu Sri Wahyuni",
      secondParents: "Bpk. Hendra Maharani & Ibu Ratna Dewi",
      firstInstagram: "dimas.surya",
      secondInstagram: "clarissa.maha",
      coupleMonogram: "DC",
      openingGreeting: "Assalamu'alaikum Wr. Wb.",
      eventDateFormatted: "Minggu, 18 Oktober 2026",
      eventCountdownTarget: "2026-10-18T09:00:00+07:00",
      quoteText: "Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu...",
      quoteSource: "QS. Ar-Rum: 21",
      landingCoverUrl: "https://r2.luxenary.id/demo/cover.webp",
      homePhotoCssUrl: "https://r2.luxenary.id/demo/home.webp",
      sidebarPhotoUrl: "https://r2.luxenary.id/demo/sidebar.webp",
      groomPhotoUrl: "https://r2.luxenary.id/demo/groom.webp",
      bridePhotoUrl: "https://r2.luxenary.id/demo/bride.webp",
      closingPhotoUrl: "https://r2.luxenary.id/demo/closing.webp",
      globalBgUrl: "https://r2.luxenary.id/demo/bg.webp",
      eventsHtml: `<div class="event-card"><h3>Akad Nikah</h3><p>08:00 WIB</p></div>`,
      storyItemsHtml: `<div class="story-card"><p>Pertemuan Pertama</p></div>`,
      bankAccountsHtml: `<div class="bank-card"><p>BCA 1234567890</p></div>`,
      galleryHtml: `<div class="gallery-item"><img src="https://r2.luxenary.id/demo/1.webp" /></div>`,
      colorPrimary: "#b5833c",
      colorSecondary: "#785725",
      colorAccent: "#d9b47e",
      colorBgDark: "#1a1816",
    };

    try {
      const htmlNormal = await renderTemplateFile(theme.id, normalData);
      if (htmlNormal.length > 500 && htmlNormal.includes("<html")) {
        result.scenarios.normal = true;
      } else {
        result.errors.push("Normal render: Output HTML terlalu pendek atau tidak memiliki tag <html>");
      }
    } catch (e: any) {
      result.errors.push(`Normal render error: ${e.message}`);
    }

    // 2. DATASET EKSTREM (XSS, String Panjang, Karakter Khusus)
    const extremeData: Record<string, any> = {
      ...normalData,
      firstNickname: "<script>alert('xss_nick1')</script>",
      secondNickname: "\"><svg/onload=alert('xss_nick2')>",
      firstName: "<script>alert('xss_name1')</script>",
      secondName: "\"><svg/onload=alert('xss_name2')>",
      groomName: "<script>alert('xss_groom')</script>",
      brideName: "\"><svg/onload=alert('xss_bride')>",
      firstFullName: "Raden Mas Arya Suryonegoro Hadiningrat Kusuma Diningrat, S.T., M.Sc., Ph.D. (Alm.) & Assoc.",
      secondFullName: "Dra. Hj. Raden Roro Siti Clarissa Dewi Maharani Ningrat, B.A., M.B.A., PMP.",
      quoteText: "Teks kutipan dengan karakter khusus: & < > \" ' / \\ dan simbol adat ᨔᨒᨆ serta emoji 💍✨🥂💐",
      quoteSource: "Kutipan \"Sakral\" & 'Abadi' <bold>",
      firstInstagram: "<img src=x onerror=alert('xss_ig')>",
    };

    try {
      const htmlExtreme = await renderTemplateFile(theme.id, extremeData);
      if (htmlExtreme.length > 500) {
        result.scenarios.extreme = true;
      }
      // Check for unescaped XSS
      if (
        htmlExtreme.includes("<script>alert(") ||
        htmlExtreme.includes("<svg/onload=") ||
        htmlExtreme.includes("<img src=x onerror=")
      ) {
        result.xssVulnerable = true;
        result.errors.push("XSS vulnerability: Unescaped raw script/svg/img tag found in rendered HTML");
      }
    } catch (e: any) {
      result.errors.push(`Extreme render error: ${e.message}`);
    }

    // 3. DATASET MINIMAL (Tanpa Foto Penutup, Tanpa Background, Slot Null)
    const minimalData: Record<string, any> = {
      ...normalData,
      landingCoverUrl: null,
      homePhotoCssUrl: null,
      sidebarPhotoUrl: null,
      groomPhotoUrl: null,
      bridePhotoUrl: null,
      closingPhotoUrl: null,
      globalBgUrl: null,
      eventsHtml: "",
      storyItemsHtml: "",
      bankAccountsHtml: "",
      galleryHtml: "",
    };

    try {
      const htmlMinimal = await renderTemplateFile(theme.id, minimalData);
      if (htmlMinimal.length > 500) {
        result.scenarios.minimal = true;
      }
      // Deteksi placeholder yang tidak ter-replace: misal {{...}}
      // Tapi kecualikan syntax JS seperti {{/if}} jika ada di template engine klien atau Vue/Alpine
      const rawMatches = htmlMinimal.match(/\{\{([a-zA-Z0-9_.]+)\}\}/g);
      if (rawMatches && rawMatches.length > 0) {
        // Filter placeholders yang bukan inline JS
        const uniquePlaceholders = Array.from(new Set(rawMatches));
        result.unparsedPlaceholders = uniquePlaceholders;
      }
    } catch (e: any) {
      result.errors.push(`Minimal render error: ${e.message}`);
    }

    // 4. PALETTE ROTATION (Uji 3 Palet Berbeda: Emerald, Terracotta, Midnight)
    try {
      const testPalettes = ["emerald", "terracotta", "midnight"];
      let allPalettesOk = true;
      for (const pKey of testPalettes) {
        const pal = COLOR_PALETTES[pKey];
        if (!pal) continue;
        const palData = {
          ...normalData,
          colorPrimary: pal.primary,
          colorSecondary: pal.secondary,
          colorAccent: pal.accent,
          colorBgDark: pal.bgDark,
        };
        const htmlPal = await renderTemplateFile(theme.id, palData);
        if (!htmlPal.includes(pal.primary) && !htmlPal.includes(pal.bgDark)) {
          // Warning jika variabel warna sama sekali tidak terinjeksi
          allPalettesOk = false;
        }
      }
      result.scenarios.palettes = allPalettesOk;
    } catch (e: any) {
      result.errors.push(`Palette render error: ${e.message}`);
    }

    // Evaluasi status tema
    const passed =
      result.scenarios.normal &&
      result.scenarios.extreme &&
      result.scenarios.minimal &&
      result.scenarios.palettes &&
      !result.xssVulnerable &&
      result.errors.length === 0;

    if (passed) {
      console.log(`  ✅ [PASS] ${theme.name}: Semua 4 skenario render lolos, XSS tertangani, palet dinamis aktif.`);
      if (result.unparsedPlaceholders.length > 0) {
        console.log(`     ⚠️ Note placeholder tersisa: ${result.unparsedPlaceholders.slice(0, 5).join(", ")}`);
      }
    } else {
      totalFailures++;
      console.log(`  ❌ [FAIL] ${theme.name}:`);
      for (const err of result.errors) {
        console.log(`     - ${err}`);
      }
    }

    results.push(result);
  }

  console.log("\n================================================================================");
  console.log(`📊 RINGKASAN THEME MATRIX STRESS TEST (${themes.length} TEMA):`);
  console.log("================================================================================");
  const successCount = themes.length - totalFailures;
  console.log(`✅ Lolos: ${successCount} / ${themes.length}`);
  console.log(`❌ Gagal: ${totalFailures} / ${themes.length}`);

  if (totalFailures > 0) {
    console.error(`\n⚠️ TERDAPAT ${totalFailures} TEMA DENGAN TEMUAN GAGAL!`);
    process.exit(1);
  } else {
    console.log("\n🎉 SELURUH 18 TEMA MASTER 100% LOLOS PENGUJIAN STRESS TEST!");
    process.exit(0);
  }
}

runThemeMatrixTest().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
