/**
 * Antrean enkode ffmpeg (18 Nov 2026): satu enkode per proses, sisanya menunggu berurutan, dan tunggu yang melewati
 * ENCODE_QUEUE_WAIT_MS ditolak 503 tanpa memblokir antrean di belakangnya.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { withEncodeSlot, ENCODE_QUEUE_WAIT_MS } from "@/lib/videoOptimizer";
import { HttpError } from "@/lib/routeError";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("withEncodeSlot", () => {
  it("menjalankan satu enkode sekaligus dan sisanya berurutan", async () => {
    const order: string[] = [];
    let running = 0;
    let peak = 0;
    const job = (name: string, gate: Promise<void>) => () =>
      (async () => {
        running++;
        peak = Math.max(peak, running);
        order.push(`start:${name}`);
        await gate;
        order.push(`end:${name}`);
        running--;
        return name;
      })();

    const a = deferred();
    const b = deferred();
    const c = deferred();
    const pa = withEncodeSlot(job("a", a.promise));
    const pb = withEncodeSlot(job("b", b.promise));
    const pc = withEncodeSlot(job("c", c.promise));

    await Promise.resolve();
    expect(order).toEqual(["start:a"]);
    a.resolve();
    await pa;
    await vi.waitFor(() => expect(order).toContain("start:b"));
    b.resolve();
    c.resolve();
    expect(await Promise.all([pa, pb, pc])).toEqual(["a", "b", "c"]);
    expect(peak).toBe(1);
    expect(order).toEqual(["start:a", "end:a", "start:b", "end:b", "start:c", "end:c"]);
  });

  it("slot dilepas walau enkode gagal", async () => {
    await expect(withEncodeSlot(() => Promise.reject(new Error("ffmpeg gagal")))).rejects.toThrow("ffmpeg gagal");
    expect(await withEncodeSlot(async () => "berikutnya")).toBe("berikutnya");
  });

  it("tunggu terlalu lama ditolak 503 dan antrean berikutnya tetap jalan", async () => {
    vi.useFakeTimers();
    const hold = deferred();
    const first = withEncodeSlot(() => hold.promise);
    const waiting = withEncodeSlot(async () => "tidak pernah");
    const rejection = expect(waiting).rejects.toSatisfy((e: unknown) => e instanceof HttpError && e.status === 503);

    await vi.advanceTimersByTimeAsync(ENCODE_QUEUE_WAIT_MS + 1);
    await rejection;

    const after = withEncodeSlot(async () => "sesudah");
    hold.resolve();
    await first;
    expect(await after).toBe("sesudah");
  });
});
