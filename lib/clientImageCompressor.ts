/**
 * Client-Side Image Compression & WebP Conversion Utility
 * =======================================================
 * Memproses, memperkecil resolusi, dan mengonversi gambar secara instan
 * di sisi browser (Client-Side) menggunakan HTML5 Canvas sebelum diunggah ke server.
 * 
 * Keuntungan:
 * 1. Mengurangi ukuran file dari 15-30MB (kamera HP/DSLR) menjadi ~300KB-800KB.
 * 2. Upload instan (0.1 - 0.3 detik) dan hemat kuota.
 * 3. Tidak membebani CPU server dan bebas dari batas buffer 10MB Next.js middleware.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0 (default: 0.82)
  outputType?: "image/webp" | "image/jpeg";
}

/**
 * Mengompres file gambar menjadi format WebP langsung di browser pengguna.
 * Jika file bukan gambar (misal video/audio) atau file GIF beranimasi,
 * file asli akan dikembalikan tanpa diubah.
 */
export async function compressImageToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Hanya proses file gambar (abaikan video, audio, atau tipe non-gambar)
  if (!file || !file.type.startsWith("image/")) {
    return file;
  }

  // Lindungi animasi GIF agar tidak menjadi gambar statis
  if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
    return file;
  }

  // Jika browser tidak mendukung window/HTMLCanvasElement (SSR environment)
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    outputType = "image/webp",
  } = options;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Hitung skala rasio jika melebihi batas resolusi maksimal
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Buat canvas untuk rendering gambar
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback jika context canvas gagal dibuat
        resolve(file);
        return;
      }

      // Render gambar ke canvas dengan image smoothing berkualitas tinggi
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Ekspor canvas ke Blob WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Buat nama file baru dengan ekstensi .webp
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const extension = outputType === "image/jpeg" ? "jpg" : "webp";
          const newFileName = `${baseName}.${extension}`;

          const compressedFile = new File([blob], newFileName, {
            type: outputType,
            lastModified: Date.now(),
          });

          // Jika ukuran hasil kompresi ternyata lebih besar dari file asli (sangat jarang terjadi),
          // gunakan file asli demi efisiensi optimal
          if (compressedFile.size > file.size && file.type === outputType) {
            resolve(file);
          } else {
            resolve(compressedFile);
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback: Jika gambar tidak dapat dibaca oleh Image object, kembalikan file asli
      resolve(file);
    };

    img.src = objectUrl;
  });
}
