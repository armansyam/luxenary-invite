import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";
import { prisma } from "./prisma";

// Determine Storage Provider
export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";

// Configure S3 Client if needed
export const s3Client = STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3"
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
 * Unified Delete Handler (VPS vs R2)
 * @param publicUrl - The full public URL stored in DB (e.g. https://pub-xxx.r2.dev/folder/file.png)
 * @returns boolean indicating success
 */
export async function deleteFile(publicUrl: string | null): Promise<boolean> {
  if (!publicUrl) return false;

  try {
    if (publicUrl.startsWith("http") && (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3")) {
      const bucketName = process.env.S3_BUCKET_NAME;
      if (!bucketName || !s3Client) return false;

      // Safely extract S3 object key from URL pathname (e.g. "proofs/xxx.webp")
      let relativePath = "";
      try {
        const parsed = new URL(publicUrl);
        relativePath = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
      } catch {
        const customDomain = process.env.S3_CUSTOM_DOMAIN || process.env.S3_PUBLIC_URL || "";
        const domainPrefix = customDomain.replace(/\/$/, "");
        if (publicUrl.startsWith(domainPrefix)) {
          relativePath = publicUrl.substring(domainPrefix.length + 1);
        }
      }

      if (!relativePath) return false;

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: relativePath,
      });

      await s3Client.send(command);
      return true;
    } 
    
    // Local File Deletion
    if (publicUrl.startsWith("/uploads/")) {
      const cleanPath = publicUrl.split("?")[0];
      const absolutePath = path.join(process.cwd(), "public", cleanPath);
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
        return true;
      }
    }
  } catch (error) {
    console.error("[Storage Delete Error]:", error);
  }
  
  return false;
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
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
    };

    // Helper to sync single file
    const syncSingleUrl = async (url: string | null): Promise<string | null> => {
      if (!url || !url.startsWith("/uploads/")) return url;
      
      const cleanUrl = url.split("?")[0];
      const localFilePath = path.join(process.cwd(), "public", cleanUrl);
      try {
        const buffer = await fs.promises.readFile(localFilePath);
        const ext = path.extname(cleanUrl).toLowerCase();
        const mime = mimeTypes[ext] || "application/octet-stream";
        // Remove leading "/uploads/" to get relative path for R2
        const relativePath = cleanUrl.substring(9); 
        
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

/**
 * Sync Database Retention Settings to Cloudflare R2 Lifecycle Rules
 * @param days - Number of days to retain objects
 */
export async function syncR2LifecycleRule(days: number): Promise<boolean> {
  if (STORAGE_PROVIDER !== "r2" && STORAGE_PROVIDER !== "s3") return false;
  if (!s3Client || !process.env.S3_BUCKET_NAME) return false;

  try {
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "Auto-Cleanup-Rule",
            Status: "Enabled",
            Filter: {
              Prefix: "", // Apply to all objects
            },
            Expiration: {
              Days: days,
            },
          },
        ],
      },
    });

    await s3Client.send(command);
    console.log(`[R2 Sync] Lifecycle rule updated: Auto-delete after ${days} days.`);
    return true;
  } catch (err) {
    console.error("[R2 Sync Error] Failed to update lifecycle:", err);
    return false;
  }
}

/**
 * Upload Portfolio File (HTML or Asset) with Hybrid Storage Support
 */
export async function uploadPortfolioFile(buffer: Buffer, relativePath: string, mimeType: string): Promise<string> {
  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) throw new Error("S3 Credentials not configured");

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `portfolio/${relativePath}`,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable"
    });

    await s3Client.send(command);
    const publicUrl = (process.env.S3_CUSTOM_DOMAIN || process.env.S3_PUBLIC_URL)?.replace(/\/$/, "");
    return `${publicUrl}/portfolio/${relativePath}`;
  } else {
    // Local
    const absolutePath = path.join(process.cwd(), "public", "portfolio", relativePath);
    const directory = path.dirname(absolutePath);
    try {
      await fs.promises.access(directory);
    } catch {
      await fs.promises.mkdir(directory, { recursive: true });
    }
    await fs.promises.writeFile(absolutePath, buffer);
    return `/portfolio/${relativePath}`;
  }
}

/**
 * List all Portfolio Slugs
 */
export async function listPortfolioSlugs(): Promise<string[]> {
  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) return [];
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "portfolio/",
        Delimiter: "/",
      });
      const data = await s3Client.send(command);
      if (!data.Contents) return [];
      return data.Contents
        .filter(obj => obj.Key && obj.Key.endsWith(".html"))
        .map(obj => path.basename(obj.Key!).replace(".html", ""));
    } catch {
      return [];
    }
  } else {
    const portfolioDir = path.join(process.cwd(), "public", "portfolio");
    try {
      const files = await fs.promises.readdir(portfolioDir);
      return files.filter(f => f.endsWith(".html")).map(f => f.replace(".html", ""));
    } catch {
      return [];
    }
  }
}

/**
 * Delete Portfolio and its Assets
 */
export async function deletePortfolio(slug: string): Promise<void> {
  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) return;

    // Delete HTML
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: `portfolio/${slug}.html`,
      }));
    } catch (e) { console.error(e); }

    // Delete Assets
    try {
      const prefix = `portfolio/assets/${slug}/`;
      const listCmd = new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix });
      const listed = await s3Client.send(listCmd);
      if (listed.Contents && listed.Contents.length > 0) {
        for (const obj of listed.Contents) {
          if (obj.Key) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key }));
          }
        }
      }
    } catch (e) { console.error(e); }
  } else {
    const htmlPath = path.join(process.cwd(), "public", "portfolio", `${slug}.html`);
    const assetDir = path.join(process.cwd(), "public", "portfolio", "assets", slug);
    try {
      if (fs.existsSync(htmlPath)) await fs.promises.unlink(htmlPath);
      if (fs.existsSync(assetDir)) await fs.promises.rm(assetDir, { recursive: true, force: true });
    } catch (e) { console.error(e); }
  }
}

/**
 * Get Portfolio Metadata (Decoupled from DB)
 */
export async function getPortfolioMetadata(slug: string): Promise<any | null> {
  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) return null;

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: `portfolio/assets/${slug}/metadata.json`,
      });
      const data = await s3Client.send(command);
      if (!data.Body) return null;
      const bodyString = await data.Body.transformToString();
      return JSON.parse(bodyString);
    } catch {
      return null;
    }
  } else {
    const metadataPath = path.join(process.cwd(), "public", "portfolio", "assets", slug, "metadata.json");
    try {
      const content = await fs.promises.readFile(metadataPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
