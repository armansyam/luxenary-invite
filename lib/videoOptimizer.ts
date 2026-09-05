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
  if (await fileExists("/usr/bin/ffmpeg")) return "/usr/bin/ffmpeg";
  return "ffmpeg";
}

// Resolve ffprobe binary path (works on macOS Homebrew & Linux)
async function getFfprobePath(): Promise<string> {
  if (await fileExists("/opt/homebrew/bin/ffprobe")) return "/opt/homebrew/bin/ffprobe";
  if (await fileExists("/usr/local/bin/ffprobe")) return "/usr/local/bin/ffprobe";
  if (await fileExists("/usr/bin/ffprobe")) return "/usr/bin/ffprobe";
  return "ffprobe";
}

// Helper to determine input video duration
async function getVideoDuration(filePath: string, ffprobePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ], { timeout: 10000 });
    const duration = parseFloat(stdout.trim());
    return !isNaN(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
}

/**
 * Optimizes video files for fast web streaming playback & infinite seamless looping:
 * - Codec: H.264 (Universal iOS, Android, Safari, Chrome support)
 * - Seamless Looping: Crossfade blend (1.0s - 1.2s) between video tail and head so loop restart is 100% imperceptible
 * - Flag: +faststart (moov atom at start for instant streaming without full download)
 * - Resolution: Max 1080p (preserves aspect ratio)
 * - Quality: CRF 26 with web bitrate cap & 30 FPS
 * - Audio: Muted/Stripped (-an) for seamless background live wallpaper autoplay
 */
export async function optimizeWebVideo(inputBuffer: Buffer, baseName: string): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const inputTempPath = path.join(tempDir, `raw_${Date.now()}_${baseName}`);
  const outputTempPath = path.join(tempDir, `opt_${Date.now()}_${baseName}.mp4`);

  try {
    await fs.promises.writeFile(inputTempPath, inputBuffer);

    const ffmpegPath = await getFfmpegPath();
    const ffprobePath = await getFfprobePath();

    const rawDuration = await getVideoDuration(inputTempPath, ffprobePath);

    let args: string[];

    // Seamless Crossfade Looping logic:
    // Jika durasi video >= 3.0 detik, lakukan crossfade blending antara ekor video dan kepala video
    // sehingga frame akhir video dan frame awal video 100% identik dan mengalir mulus tanpa jump cut.
    if (rawDuration && rawDuration >= 3.0) {
      const targetDuration = Math.min(rawDuration, 20.0);
      const crossfadeDuration = targetDuration >= 6.0 ? 1.2 : targetDuration >= 4.5 ? 1.0 : 0.6;
      const offset = (targetDuration - crossfadeDuration) - crossfadeDuration; // offset = targetDuration - 2 * crossfadeDuration

      if (offset > 0.2) {
        const filterComplex = `[0:v]scale='min(1080,iw)':-2,split=2[v1_raw][v2_raw];[v1_raw]trim=start=${crossfadeDuration}:end=${targetDuration},setpts=PTS-STARTPTS[v1];[v2_raw]trim=start=0:end=${crossfadeDuration},setpts=PTS-STARTPTS[v2];[v1][v2]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset.toFixed(2)}[outv]`;

        args = [
          "-y",
          "-i", inputTempPath,
          "-filter_complex", filterComplex,
          "-map", "[outv]",
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "26",
          "-r", "30",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          "-an",
          "-max_muxing_queue_size", "1024",
          outputTempPath,
        ];
      } else {
        // Durasi mepet, gunakan potongan linear standar
        args = [
          "-y",
          "-i", inputTempPath,
          "-t", "20",
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "26",
          "-r", "30",
          "-pix_fmt", "yuv420p",
          "-vf", "scale='min(1080,iw)':-2",
          "-movflags", "+faststart",
          "-an",
          "-max_muxing_queue_size", "1024",
          outputTempPath,
        ];
      }
    } else {
      // Fallback jika durasi < 3 detik atau ffprobe gagal
      args = [
        "-y",
        "-i", inputTempPath,
        "-t", "20",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "26",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-vf", "scale='min(1080,iw)':-2",
        "-movflags", "+faststart",
        "-an",
        "-max_muxing_queue_size", "1024",
        outputTempPath,
      ];
    }

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
