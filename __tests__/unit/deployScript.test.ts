/**
 * deploy.sh menarik kode lalu menjalankan npm ci, prisma generate, dan build sebelum menyentuh database, sementara PM2
 * masih melayani build lama. Setiap kegagalan di tahap itu harus mengembalikan kode dan dependensi ke rilis yang berjalan.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const script = path.join(__dirname, "../../deploy.sh");
const source = readFileSync(script, "utf8");

describe("deploy.sh", () => {
  it("lolos pemeriksaan sintaks bash", () => {
    expect(() => execFileSync("bash", ["-n", script])).not.toThrow();
  });

  it.each(["npm ci gagal!", "prisma generate gagal!", "Build Next.js gagal!"])(
    "memulihkan rilis sebelumnya sebelum keluar saat '%s'",
    (marker) => {
      const start = source.indexOf(marker);
      expect(start, `pesan '${marker}' ada di deploy.sh`).toBeGreaterThan(-1);
      const afterMessage = source.slice(start, source.indexOf("exit 1", start));
      expect(afterMessage).toContain("restore_previous_release");
    }
  );

  it("pemulihan memakai git reset --keep agar perubahan lokal tidak hilang", () => {
    const fn = source.slice(source.indexOf("restore_previous_release() {"));
    expect(fn.slice(0, fn.indexOf("\n}\n"))).toContain('git reset --keep "$PREVIOUS_COMMIT"');
    expect(source).not.toMatch(/git reset --hard/);
  });
});
