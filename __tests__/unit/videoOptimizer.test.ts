/**
 * Video/audio yang gagal dikonversi ditolak (HttpError 422), tidak disimpan mentah dengan nama .mp4/.mp3 (4 Nov 2026).
 * Berlaku baik ffmpeg tersedia (berkas rusak) maupun tidak (ENOENT).
 */
import { describe, it, expect } from "vitest";
import { optimizeWebAudio, optimizeWebVideo } from "@/lib/videoOptimizer";
import { HttpError } from "@/lib/routeError";

const garbage = Buffer.from("bukan berkas media sama sekali".repeat(64));

describe("videoOptimizer menolak berkas yang tidak bisa dikonversi", () => {
  it("video rusak menghasilkan HttpError 422", async () => {
    await expect(optimizeWebVideo(garbage, "vitest-video")).rejects.toMatchObject({ status: 422 });
    await expect(optimizeWebVideo(garbage, "vitest-video")).rejects.toBeInstanceOf(HttpError);
  }, 60_000);

  it("audio rusak menghasilkan HttpError 422", async () => {
    await expect(optimizeWebAudio(garbage, "vitest-audio")).rejects.toMatchObject({ status: 422 });
  }, 60_000);
});
