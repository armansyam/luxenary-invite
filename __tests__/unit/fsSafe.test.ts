import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { removeIfExists } from "@/lib/fsSafe";
import { logger } from "@/lib/logger";

describe("removeIfExists", () => {
  let dir = "";
  const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "fssafe-"));
    warn.mockClear();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("menghapus berkas yang ada", async () => {
    const file = path.join(dir, "a.txt");
    fs.writeFileSync(file, "x");
    await removeIfExists(file);
    expect(fs.existsSync(file)).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("berkas yang tidak ada bukan masalah dan tidak dicatat", async () => {
    await expect(removeIfExists(path.join(dir, "tidak-ada.txt"))).resolves.toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it("folder dihapus hanya dengan recursive", async () => {
    const sub = path.join(dir, "sub");
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, "b.txt"), "x");

    await removeIfExists(sub);
    expect(fs.existsSync(sub)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);

    await removeIfExists(sub, { recursive: true });
    expect(fs.existsSync(sub)).toBe(false);
  });

  it("galat selain 'tidak ada' dicatat dan tidak dilempar", async () => {
    const sub = path.join(dir, "terkunci");
    fs.mkdirSync(sub);
    const file = path.join(sub, "c.txt");
    fs.writeFileSync(file, "x");
    fs.chmodSync(sub, 0o500);
    try {
      await expect(removeIfExists(file)).resolves.toBeUndefined();
      if (process.getuid?.() !== 0) {
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][2]).toMatchObject({ target: file, code: "EACCES" });
      }
    } finally {
      fs.chmodSync(sub, 0o700);
    }
  });
});
