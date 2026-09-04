import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

/**
 * Auto-set CORS policy pada R2 bucket berdasarkan APP_URL dari environment.
 * Tidak ada domain yang di-hardcode — semua dibaca dari env.
 *
 * Panggil satu kali saat deploy atau via Admin → Pengaturan → "Terapkan CORS R2".
 */
export async function applyR2CorsPolicy(): Promise<{ success: boolean; origins: string[]; error?: string }> {
  const storageProvider = process.env.STORAGE_PROVIDER || "local";

  if (storageProvider !== "r2" && storageProvider !== "s3") {
    return { success: false, origins: [], error: "Storage provider bukan R2/S3 — CORS tidak diperlukan." };
  }

  const endpoint   = process.env.S3_ENDPOINT;
  const accessKey  = process.env.S3_ACCESS_KEY;
  const secretKey  = process.env.S3_SECRET_KEY;
  const bucketName = process.env.S3_BUCKET_NAME;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";

  if (!endpoint || !accessKey || !secretKey || !bucketName) {
    return { success: false, origins: [], error: "Kredensial R2 belum dikonfigurasi di .env" };
  }

  // Parse semua asal yang diizinkan dari env — auto-detect, tidak hardcode
  const allowedOrigins: string[] = [];

  // 1. APP_URL utama (mis. https://example.com atau http://localhost:3000)
  if (appUrl) {
    const origin = appUrl.replace(/\/$/, "").replace(/\/.*$/, ""); // strip path
    // Ambil hanya scheme + host
    try {
      const parsed = new URL(appUrl);
      allowedOrigins.push(`${parsed.protocol}//${parsed.host}`);
    } catch {
      allowedOrigins.push(appUrl);
    }
  }

  // 2. ROOT_DOMAIN (subdomain wildcard tidak diizinkan S3 CORS, tapi tambah www variant)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (rootDomain) {
    allowedOrigins.push(`https://${rootDomain}`);
    allowedOrigins.push(`https://www.${rootDomain}`);
  }

  // 3. Cloudflare Tunnel dev (opsional, tambah via env)
  const devOrigin = process.env.DEV_ORIGIN; // misal: https://xxx.trycloudflare.com
  if (devOrigin) {
    allowedOrigins.push(devOrigin.replace(/\/$/, ""));
  }

  // Deduplicate
  const uniqueOrigins = [...new Set(allowedOrigins)].filter(Boolean);

  if (uniqueOrigins.length === 0) {
    return { success: false, origins: [], error: "Tidak ada APP_URL atau ROOT_DOMAIN di .env — tidak tahu origin mana yang harus diizinkan." };
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  try {
    await s3.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: uniqueOrigins,
            AllowedMethods: ["GET", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["Content-Length", "Content-Type", "ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }));

    return { success: true, origins: uniqueOrigins };
  } catch (err: any) {
    return { success: false, origins: uniqueOrigins, error: err.message || "Gagal menerapkan CORS ke R2" };
  }
}

/**
 * Baca CORS policy yang saat ini aktif di R2 bucket.
 */
export async function getR2CorsPolicy(): Promise<{ origins: string[]; error?: string }> {
  const endpoint   = process.env.S3_ENDPOINT;
  const accessKey  = process.env.S3_ACCESS_KEY;
  const secretKey  = process.env.S3_SECRET_KEY;
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!endpoint || !accessKey || !secretKey || !bucketName) {
    return { origins: [], error: "Kredensial R2 tidak lengkap" };
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  try {
    const data = await s3.send(new GetBucketCorsCommand({ Bucket: bucketName }));
    const origins = data.CORSRules?.flatMap((r) => r.AllowedOrigins || []) ?? [];
    return { origins };
  } catch {
    return { origins: [], error: "Belum ada CORS policy yang diterapkan" };
  }
}
