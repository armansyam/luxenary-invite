/**
 * `prisma db seed` dijalankan pada setiap deploy. Seed tidak boleh menghapus tema atau menimpa
 * suntingan admin (tema, preset musik, nilai pengaturan); tema dikelola oleh scripts/sync-themes.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import { prisma, pool } from "@/lib/prisma";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const CUSTOM_THEME_ID = `vitest_seed_theme_${Date.now()}`;
const EDITED_NAME = "Kalandra Disunting Admin";

function runSeed() {
  // NODE_V8_COVERAGE (diset oleh vitest --coverage) membuat proses tsx anak macet; seed tidak perlu diukur.
  const { NODE_V8_COVERAGE: _coverageDir, ...childEnv } = process.env;
  execFileSync("npx", ["tsx", "prisma/seed.ts"], {
    cwd: process.cwd(),
    env: { ...childEnv, SEED_ADMIN_EMAIL: "" },
    stdio: "pipe",
    timeout: 120_000,
  });
}

describe.skipIf(!IS_TEST_DB)("Seed tidak menimpa atau menghapus data yang dikelola admin", () => {
  let original: { name: string; isActive: boolean } | null = null;
  let themeCount = 0;
  let music: { id: string; title: string; isActive: boolean; sortOrder: number } | null = null;
  let settingKey = "";
  let settingOriginal = "";

  beforeAll(async () => {
    const base = await prisma.theme.findUniqueOrThrow({ where: { id: "kalandra" } });
    original = { name: base.name, isActive: base.isActive };
    await prisma.theme.update({ where: { id: "kalandra" }, data: { name: EDITED_NAME, isActive: false } });
    await prisma.theme.create({
      data: { id: CUSTOM_THEME_ID, name: "Tema Kustom Admin", category: base.category, series: base.series, eventType: base.eventType, description: "dibuat admin", isActive: true, sortOrder: 999 },
    });
    themeCount = await prisma.theme.count();

    const preset = await prisma.musicPreset.findFirstOrThrow();
    music = { id: preset.id, title: preset.title, isActive: preset.isActive, sortOrder: preset.sortOrder };
    await prisma.musicPreset.update({ where: { id: preset.id }, data: { title: "Judul Disunting Admin", isActive: !preset.isActive, sortOrder: 777 } });

    const setting = await prisma.adminSetting.findFirstOrThrow({ where: { key: "platform_name" } });
    settingKey = setting.key;
    settingOriginal = setting.value;
    await prisma.adminSetting.update({ where: { key: settingKey }, data: { value: "Nama Platform Disunting Admin" } });

    runSeed();
  }, 180_000);

  afterAll(async () => {
    await prisma.theme.deleteMany({ where: { id: CUSTOM_THEME_ID } });
    if (original) await prisma.theme.update({ where: { id: "kalandra" }, data: original });
    if (music) await prisma.musicPreset.update({ where: { id: music.id }, data: { title: music.title, isActive: music.isActive, sortOrder: music.sortOrder } });
    if (settingKey) await prisma.adminSetting.update({ where: { key: settingKey }, data: { value: settingOriginal } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("tema kustom buatan admin tidak dihapus dan jumlah tema tidak berkurang", async () => {
    expect(await prisma.theme.findUnique({ where: { id: CUSTOM_THEME_ID } })).not.toBeNull();
    expect(await prisma.theme.count()).toBe(themeCount);
  });

  it("nama dan isActive tema yang disunting admin tidak dikembalikan", async () => {
    const t = await prisma.theme.findUniqueOrThrow({ where: { id: "kalandra" } });
    expect(t.name).toBe(EDITED_NAME);
    expect(t.isActive).toBe(false);
  });

  it("preset musik yang disunting admin tidak ditimpa", async () => {
    const p = await prisma.musicPreset.findUniqueOrThrow({ where: { id: music!.id } });
    expect(p.title).toBe("Judul Disunting Admin");
    expect(p.isActive).toBe(!music!.isActive);
    expect(p.sortOrder).toBe(777);
  });

  it("nilai pengaturan yang diubah admin tidak ditimpa", async () => {
    const s = await prisma.adminSetting.findUniqueOrThrow({ where: { key: settingKey } });
    expect(s.value).toBe("Nama Platform Disunting Admin");
  });
});
