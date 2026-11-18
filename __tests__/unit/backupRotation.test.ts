/**
 * Rotasi snapshot (19 Nov 2026): backup pra-deploy dirotasi terpisah (5 terakhir) dan tidak menggeser snapshot harian
 * dari batas `backup_retention_count`; sebelumnya beberapa deploy sehari menyisakan satu snapshot harian di R2.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { describe, it, expect, afterAll } from "vitest";
import { pruneOldSnapshots } from "@/lib/databaseBackup";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lux-backup-rot-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function make(name: string, minutesAgo: number) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, "PGDMP");
  const t = new Date(Date.now() - minutesAgo * 60_000);
  fs.utimesSync(p, t, t);
}

describe("pruneOldSnapshots", () => {
  it("snapshot harian disimpan sebanyak batas walau ada banyak backup pra-deploy yang lebih baru", async () => {
    for (let i = 0; i < 12; i++) make(`snapshot_harian_${String(i).padStart(2, "0")}.dump`, 1000 + i * 60);
    for (let i = 0; i < 9; i++) make(`pre-deploy_${String(i).padStart(2, "0")}.dump`, i);

    await pruneOldSnapshots(10, dir);

    const left = fs.readdirSync(dir).sort();
    expect(left.filter((f) => f.startsWith("snapshot_"))).toEqual(Array.from({ length: 10 }, (_, i) => `snapshot_harian_${String(i).padStart(2, "0")}.dump`));
    expect(left.filter((f) => f.startsWith("pre-deploy_"))).toEqual(["pre-deploy_00.dump", "pre-deploy_01.dump", "pre-deploy_02.dump", "pre-deploy_03.dump", "pre-deploy_04.dump"]);
  });
});
