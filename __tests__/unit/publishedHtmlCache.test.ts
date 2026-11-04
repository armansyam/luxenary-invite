/**
 * Cache memori HTML terbit per worker PM2 (4 Nov 2026). Worker lain membangun ulang berkas di disk sesudah sinkronisasi
 * R2; worker ini tidak boleh terus menyajikan HTML lama (URL /uploads/ yang berkasnya sudah dihapus) sampai TTL habis.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { getPublishedHtml } from "@/lib/staticPublisher";

const ID = `vitest-published-cache-${Date.now()}`;
const FILE = path.join(process.cwd(), "public", "published", "ids", `${ID}.html`);

describe("getPublishedHtml mengikuti berkas di disk", () => {
  afterAll(() => fs.rmSync(FILE, { force: true }));

  it("berkas yang ditulis ulang worker lain langsung tersaji, berkas yang dihapus tidak", async () => {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, "<html>lama /uploads/qris.webp</html>");
    fs.utimesSync(FILE, new Date(Date.now() - 60_000), new Date(Date.now() - 60_000));
    expect(await getPublishedHtml(ID)).toContain("/uploads/qris.webp");

    // Worker lain: tulis langsung ke disk tanpa menyentuh cache memori proses ini.
    fs.writeFileSync(FILE, "<html>baru https://cdn.contoh/qris.webp</html>");
    expect(await getPublishedHtml(ID)).toContain("https://cdn.contoh/qris.webp");

    fs.rmSync(FILE);
    expect(await getPublishedHtml(ID)).toBeNull();
  });
});
