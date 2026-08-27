import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "./prisma";

// Determine Storage Provider
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";

// Configure S3 Client if needed
const s3Client = STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3"
  ? new S3Client({
      region: "auto",
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    })
  : null;

/**
 * Unified Upload Handler (VPS vs R2)
 * @param buffer - File Buffer
 * @param relativePath - e.g. "invitations/klien/cover.webp"
 * @param mimeType - e.g. "image/webp"
 * @param forceLocal - If true, bypasses R2 and forces save to local disk
 * @returns Public URL string
 */
export async function uploadFile(buffer: Buffer, relativePath: string, mimeType: string, forceLocal: boolean = false): Promise<string> {
  if (!forceLocal && (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3")) {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) {
      throw new Error("S3 Credentials not configured properly in .env");
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: relativePath,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable"
    });

    await s3Client.send(command);

    // Return the public URL
    const publicUrl = (process.env.S3_CUSTOM_DOMAIN || process.env.S3_PUBLIC_URL)?.replace(/\/$/, "");
    return `${publicUrl}/${relativePath}`;
  } 
  
  else {
    // Local Upload (Default)
    const absolutePath = path.join(process.cwd(), "public", "uploads", relativePath);
    const directory = path.dirname(absolutePath);

    try {
      await fs.promises.access(directory);
    } catch {
      await fs.promises.mkdir(directory, { recursive: true });
    }

    await fs.promises.writeFile(absolutePath, buffer);
    return `/uploads/${relativePath}`;
  }
}

/**
 * Streams memories to a zip archiver instance.
 * @param archive - The archiver instance
 * @param invitationId - The invitation ID
 */
export async function streamMemoriesToZip(archive: any, invitationId: string): Promise<void> {
  const relativePrefix = `invitations/${invitationId}/memories/`;

  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) {
      throw new Error("S3 Credentials not configured properly in .env");
    }

    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: relativePrefix,
    });

    const listData = await s3Client.send(listCommand);
    
    if (!listData.Contents || listData.Contents.length === 0) {
      throw new Error("EMPTY");
    }

    // Stream each object into the archiver
    for (const object of listData.Contents) {
      if (!object.Key) continue;
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: object.Key,
      });

      const getData = await s3Client.send(getCommand);
      if (getData.Body) {
        // Extract the filename from the key
        const fileName = path.basename(object.Key);
        // Cast to any to access standard stream functions as Body is a Web Stream / Node Stream mix in SDK v3
        archive.append(getData.Body as any, { name: fileName });
      }
    }
  } else {
    // Local directory streaming
    const memoriesDir = path.join(process.cwd(), "public", "uploads", "invitations", invitationId, "memories");
    try {
      await fs.promises.access(memoriesDir);
    } catch {
      throw new Error("EMPTY");
    }
    
    const files = await fs.promises.readdir(memoriesDir);
    if (files.length === 0) {
      throw new Error("EMPTY");
    }

    archive.directory(memoriesDir, false);
  }
}

/**
 * Background job to sync local drafts to R2 upon publishing.
 * It scans the invitation's media and music URLs. If any URL is local, it uploads to R2 and updates DB.
 */
export async function syncDraftToR2(invitationId: string): Promise<void> {
  if (STORAGE_PROVIDER !== "r2" && STORAGE_PROVIDER !== "s3") return;
  
  const bucketName = process.env.S3_BUCKET_NAME;
  const customDomain = process.env.S3_CUSTOM_DOMAIN;
  if (!bucketName || !customDomain || !s3Client) return;

  try {
    const inv = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { media: true }
    });
    if (!inv) return;

    const mimeTypes: Record<string, string> = {
      ".webp": "image/webp",
      ".jpg": "image/jpeg",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
    };

    // Helper to sync single file
    const syncSingleUrl = async (url: string | null): Promise<string | null> => {
      if (!url || !url.startsWith("/uploads/")) return url;
      
      const localFilePath = path.join(process.cwd(), "public", url);
      try {
        const buffer = await fs.promises.readFile(localFilePath);
        const ext = path.extname(url).toLowerCase();
        const mime = mimeTypes[ext] || "application/octet-stream";
        // Remove leading "/uploads/" to get relative path for R2
        const relativePath = url.substring(9); 
        
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: relativePath,
          Body: buffer,
          ContentType: mime,
          CacheControl: "public, max-age=31536000, immutable"
        });
        await s3Client.send(command);
        
        // Remove local file asynchronously
        fs.promises.unlink(localFilePath).catch(() => {});
        
        return `${customDomain}/${relativePath}`;
      } catch (err) {
        console.error(`Failed to sync ${url} to R2:`, err);
        return url;
      }
    };

    // Sync Music
    if (inv.musicUrl && inv.musicUrl.startsWith("/uploads/")) {
      const newMusicUrl = await syncSingleUrl(inv.musicUrl);
      if (newMusicUrl !== inv.musicUrl) {
        await prisma.invitation.update({
          where: { id: inv.id },
          data: { musicUrl: newMusicUrl }
        });
      }
    }

    // Sync Media (Cover, Gallery, etc)
    for (const m of inv.media) {
      if (m.localPath && m.localPath.startsWith("/uploads/")) {
        const newLocalPath = await syncSingleUrl(m.localPath);
        if (newLocalPath !== m.localPath) {
          await prisma.invitationMedia.update({
            where: { id: m.id },
            data: { localPath: newLocalPath }
          });
        }
      }
    }

    // [CRITICAL FIX] Race Condition Prevention:
    // After R2 sync completes, the local files are deleted.
    // If staticPublisher ran BEFORE this finished, it baked the old local URLs into HTML.
    // We MUST re-bake the HTML here to inject the new R2 URLs!
    try {
      const { buildAndSavePublishedHtml } = await import("./staticPublisher");
      await buildAndSavePublishedHtml(invitationId);
    } catch (publishErr) {
      console.error("[syncDraftToR2] Failed to rebuild static HTML:", publishErr);
    }

  } catch (err) {
    console.error("[syncDraftToR2 Error]", err);
  }
}
