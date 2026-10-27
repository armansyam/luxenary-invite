/**
 * Slot media kosong tidak boleh menghasilkan rujukan kosong (`url('')`, `<img src="">`) di tema mana pun: yang terlihat
 * klien dan tamu adalah palet tema, bukan ikon gambar rusak atau teks alt. Bagian render hanya berjalan di `luxenary_test`.
 */
import { describe, it, expect, afterAll } from "vitest";
import { stripEmptyMediaRefs } from "@/lib/emptyMediaRefs";
import { pool } from "@/lib/prisma";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { renderTemplateFile, THEME_MAP } from "@/lib/renderTemplate";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");

describe("stripEmptyMediaRefs", () => {
  it("mengganti url kosong dengan none di semua posisi lapisan latar", () => {
    expect(stripEmptyMediaRefs(`background: url('') center/cover no-repeat;`)).toBe("background: none center/cover no-repeat;");
    expect(stripEmptyMediaRefs(`background-image: url("");`)).toBe("background-image: none;");
    expect(stripEmptyMediaRefs(`background: linear-gradient(red, blue), url( );`)).toBe("background: linear-gradient(red, blue), none;");
    expect(stripEmptyMediaRefs(`background: url(''), url('/assets/a.webp');`)).toBe("background: none, url('/assets/a.webp');");
    expect(stripEmptyMediaRefs(`background-image: url('/uploads/x.webp');`)).toBe("background-image: url('/uploads/x.webp');");
  });

  it("membuang img kosong tanpa id, mempertahankan yang berid dan yang berisi", () => {
    expect(stripEmptyMediaRefs(`<div><img src="" alt="A &amp; B" /></div>`)).toBe("<div></div>");
    expect(stripEmptyMediaRefs(`<img class="x" src='' loading="lazy">`)).toBe("");
    expect(stripEmptyMediaRefs(`<img id="luxMemPreviewImg" src="" style="display:none">`)).toBe(`<img id="luxMemPreviewImg" src="" style="display:none">`);
    expect(stripEmptyMediaRefs(`<img src="/uploads/a.webp" alt="">`)).toBe(`<img src="/uploads/a.webp" alt="">`);
    expect(stripEmptyMediaRefs(`<img data-src="" src="/a.webp">`)).toBe(`<img data-src="" src="/a.webp">`);
  });
});

describe.skipIf(!IS_TEST_DB)("render semua tema tanpa media", () => {
  afterAll(async () => {
    await pool.end();
  });

  const themeIds = Object.keys(THEME_MAP);

  it("tidak ada tema yang menghasilkan rujukan media kosong", async () => {
    expect(themeIds.length).toBeGreaterThan(30);
    const offenders: string[] = [];
    for (const id of themeIds) {
      const demo = buildDemoInvitation(id, { galleryPhotos: [] });
      const data = (await composeInvitationData({ ...demo, media: [], themeDefaultMedia: {} } as any)) as Record<string, any>;
      const html = await renderTemplateFile(id, data);
      const emptyUrl = html.match(/url\(\s*(?:''|""|)\s*\)/g);
      const emptyImg = html.match(/<img\b(?![^>]*\sid\s*=)[^>]*\ssrc=(?:""|'')[^>]*>/gi);
      if (emptyUrl || emptyImg) offenders.push(`${id}: ${[...(emptyUrl ?? []), ...(emptyImg ?? [])].slice(0, 2).join(" | ")}`);
    }
    expect(offenders).toEqual([]);
  }, 120_000);
});
