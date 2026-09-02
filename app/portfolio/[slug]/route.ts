import { NextRequest, NextResponse } from "next/server";
import { STORAGE_PROVIDER, s3Client } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug;

  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) {
      return new NextResponse("Storage Configuration Error", { status: 500 });
    }

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: `portfolio/${slug}.html`,
      });

      const data = await s3Client.send(command);

      if (!data.Body) {
        return new NextResponse("Portfolio HTML Not Found in R2", { status: 404 });
      }

      // Ensure Body is streamed or converted to text
      const bodyString = await data.Body.transformToString();

      return new NextResponse(bodyString, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          // Set aggressive cache headers since portfolio HTML doesn't change
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.name === "NotFound") {
        return new NextResponse("Portfolio Not Found", { status: 404 });
      }
      console.error("[Portfolio Route] Error fetching from R2:", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  } 
  
  else {
    // Local fallback
    const localHtmlPath = path.join(process.cwd(), "public", "portfolio", `${slug}.html`);
    try {
      await fs.promises.access(localHtmlPath);
      const htmlContent = await fs.promises.readFile(localHtmlPath, "utf-8");
      
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return new NextResponse("Portfolio Not Found", { status: 404 });
    }
  }
}
