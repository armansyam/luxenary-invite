import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Helper to check file existence asynchronously
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Resolve ffmpeg binary path (works on macOS Homebrew & Linux)
async function getFfmpegPath(): Promise<string> {
  if (await fileExists("/opt/homebrew/bin/ffmpeg")) return "/opt/homebrew/bin/ffmpeg";
  if (await fileExists("/usr/local/bin/ffmpeg")) return "/usr/local/bin/ffmpeg";
  return "ffmpeg";
}

/**
 * Optimizes video files for fast web streaming playback:
 * - Codec: H.264 (Universal iOS, Android, Safari, Chrome support)
 * - Flag: +faststart (moov atom at start for instant streaming without full download)
 * - Resolution: Max 1080p (preserves aspect ratio)
 * - Quality: CRF 24-26 with web bitrate cap
 */
export async function optimizeWebVideo(inputBuffer: Buffer, baseName: string): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const inputTempPath = path.join(tempDir, `raw_${Date.now()}_${baseName}`);
  const outputTempPath = path.join(tempDir, `opt_${Date.now()}_${baseName}.mp4`);

  try {
    await fs.promises.writeFile(inputTempPath, inputBuffer);

    const ffmpegPath = await getFfmpegPath();

    const args = [
      "-y",
      "-i", inputTempPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "25",
      "-pix_fmt", "yuv420p",
      "-vf", "scale='min(1080,iw)':-2",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "128k",
      "-max_muxing_queue_size", "1024",
      outputTempPath,
    ];

    await execFileAsync(ffmpegPath, args, { timeout: 45000 });

    if (await fileExists(outputTempPath)) {
      const optimizedBuffer = await fs.promises.readFile(outputTempPath);
      return optimizedBuffer;
    }

    return inputBuffer;
  } catch (err) {
    console.warn("FFmpeg optimization skipped or failed, using original video buffer:", err);
    return inputBuffer;
  } finally {
    // Cleanup temporary scratch files
    try {
      if (await fileExists(inputTempPath)) await fs.promises.unlink(inputTempPath);
      if (await fileExists(outputTempPath)) await fs.promises.unlink(outputTempPath);
    } catch {}
  }
}

/**
 * Compresses any uploaded audio file to web-optimized MP3:
 * - Input: MP3, WAV, M4A, OGG, FLAC, AAC — semua format diterima
 * - Output: MP3 128kbps stereo (cukup jernih, jauh lebih ringan)
 * - Rata-rata pengurangan: 5MB WAV → ~1MB MP3, 10MB FLAC → ~1.5MB MP3
 * - Timeout: 30 detik (aman untuk file musik hingga ~50MB)
 */
export async function optimizeWebAudio(inputBuffer: Buffer, baseName: string): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const inputTempPath = path.join(tempDir, `rawaudio_${Date.now()}_${baseName}`);
  const outputTempPath = path.join(tempDir, `optaudio_${Date.now()}_${baseName}.mp3`);

  try {
    await fs.promises.writeFile(inputTempPath, inputBuffer);

    const ffmpegPath = await getFfmpegPath();

    const args = [
      "-y",
      "-i", inputTempPath,
      // Audio codec: MP3 (libmp3lame) — universal browser support
      "-c:a", "libmp3lame",
      // Bitrate: 128kbps — jernih untuk musik, file ringan ~1MB/menit
      "-b:a", "128k",
      // Stereo output
      "-ac", "2",
      // Sample rate: 44100Hz (CD quality)
      "-ar", "44100",
      // Strip metadata yang tidak perlu
      "-map_metadata", "-1",
      outputTempPath,
    ];

    await execFileAsync(ffmpegPath, args, { timeout: 30000 });

    if (await fileExists(outputTempPath)) {
      const compressedBuffer = await fs.promises.readFile(outputTempPath);
      const originalMB = (inputBuffer.length / 1024 / 1024).toFixed(1);
      const compressedMB = (compressedBuffer.length / 1024 / 1024).toFixed(1);
      console.log(`[AudioOptimizer] ${baseName}: ${originalMB}MB → ${compressedMB}MB (MP3 128kbps)`);
      return compressedBuffer;
    }

    // Fallback: return original if ffmpeg failed
    return inputBuffer;
  } catch (err) {
    console.warn("[AudioOptimizer] Compression skipped, using original audio:", err);
    return inputBuffer;
  } finally {
    try {
      if (await fileExists(inputTempPath)) await fs.promises.unlink(inputTempPath);
      if (await fileExists(outputTempPath)) await fs.promises.unlink(outputTempPath);
    } catch {}
  }
}
