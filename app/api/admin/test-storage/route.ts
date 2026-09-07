import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { STORAGE_PROVIDER, s3Client } from "@/lib/storage";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      (session?.user as any)?.role === "SUPER_ADMIN" ||
      (session?.user as any)?.role === "ADMIN";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const startTime = Date.now();

    if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
      const bucketName = process.env.S3_BUCKET_NAME;
      if (!bucketName || !s3Client) {
        return NextResponse.json(
          { error: "Kredensial Cloudflare R2 / S3 belum dikonfigurasi di file environment (.env)." },
          { status: 400 }
        );
      }

      const testKey = `.healthcheck-${Date.now()}.txt`;
      const testBuffer = Buffer.from("HEALTHCHECK_OK");

      // 1. Uji Upload
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: testKey,
          Body: testBuffer,
          ContentType: "text/plain",
        })
      );

      // 2. Bersihkan file uji coba
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: testKey,
        })
      );

      const latencyMs = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        provider: STORAGE_PROVIDER.toUpperCase(),
        bucket: bucketName,
        latencyMs,
        message: `Koneksi ke bucket ${bucketName} (Cloudflare R2) berhasil tervalidasi dengan waktu respons ${latencyMs}ms.`,
      });
    } else {
      // Local storage test
      const testDir = path.join(process.cwd(), "public", "uploads");
      await fs.promises.mkdir(testDir, { recursive: true });

      const testFile = path.join(testDir, `.healthcheck-${Date.now()}.tmp`);
      await fs.promises.writeFile(testFile, "OK");
      await fs.promises.unlink(testFile);

      const latencyMs = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        provider: "LOCAL_DISK",
        latencyMs,
        message: `Penyimpanan lokal disk VPS aktif dan memiliki izin tulis (write permission) normal (${latencyMs}ms).`,
      });
    }
  } catch (error: any) {
    console.error("POST /api/admin/test-storage error:", error);
    return NextResponse.json(
      {
        error: error.message || "Gagal melakukan uji koneksi storage. Periksa izin akses bucket atau direktori server.",
      },
      { status: 400 }
    );
  }
}
