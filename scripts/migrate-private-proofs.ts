/**
 * Memindahkan bukti transfer lama dari penyimpanan publik (bucket media R2/S3 atau public/uploads/proofs) ke penyimpanan
 * privat (lib/storage.ts uploadPrivateFile), memperbarui orders.proofImageUrl, lalu menghapus salinan publiknya.
 *
 *   npx tsx scripts/migrate-private-proofs.ts           # dry run: daftar yang akan dipindah dan dihapus
 *   npx tsx scripts/migrate-private-proofs.ts --apply   # pindahkan
 *
 * Idempoten: order yang sudah memakai referensi privat dilewati. Berkas di prefix publik proofs/ yang tidak dirujuk order
 * mana pun ikut dihapus pada --apply, karena isinya tetap terbuka bagi siapa saja yang memegang URL-nya. Jalankan setelah
 * server memakai kode baru (deploy.sh menjalankannya setelah health check): server lama masih menulis bukti ke publik.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma, pool } from "../lib/prisma";
import {
  STORAGE_PROVIDER,
  s3Client,
  storagePublicBaseUrl,
  resolveLocalUploadPath,
  uploadPrivateFile,
  deleteFile,
  isPrivateFileRef,
} from "../lib/storage";

const apply = process.argv.includes("--apply");

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

const publicProofsDir = path.join(process.cwd(), "public", "uploads", "proofs");
const mediaBucket = process.env.S3_BUCKET_NAME;
const bucketEnabled = (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") && Boolean(s3Client && mediaBucket);

type PublicSource = { kind: "disk"; absolutePath: string; url: string } | { kind: "bucket"; key: string; url: string };

/** Sumber publik sebuah URL bukti, atau null bila bukan berkas di prefix proofs/ penyimpanan platform. */
function publicSourceOf(url: string): PublicSource | null {
  const local = resolveLocalUploadPath(url);
  if (local) return local.startsWith(publicProofsDir + path.sep) ? { kind: "disk", absolutePath: local, url } : null;

  const base = storagePublicBaseUrl();
  const clean = url.split("?")[0];
  if (!base || !clean.startsWith(`${base}/`)) return null;
  const key = decodeURIComponent(clean.slice(base.length + 1));
  if (!key.startsWith("proofs/") || key.split("/").some((seg) => !seg || seg === "..")) return null;
  return { kind: "bucket", key, url };
}

async function readPublicSource(source: PublicSource): Promise<Buffer | null> {
  if (source.kind === "disk") return fs.existsSync(source.absolutePath) ? fs.promises.readFile(source.absolutePath) : null;
  if (!bucketEnabled) throw new Error("Bucket media R2/S3 belum dikonfigurasi di .env; bukti di bucket tidak dapat dibaca");
  try {
    const data = await s3Client!.send(new GetObjectCommand({ Bucket: mediaBucket, Key: source.key }));
    return data.Body ? Buffer.from(await data.Body.transformToByteArray()) : null;
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

async function listPublicProofUrls(): Promise<string[]> {
  const urls: string[] = [];
  if (fs.existsSync(publicProofsDir)) {
    for (const entry of await fs.promises.readdir(publicProofsDir, { withFileTypes: true })) {
      // .gitkeep dilacak git agar direktori ada; bukan bukti transfer.
      if (entry.isFile() && !entry.name.startsWith(".")) urls.push(`/uploads/proofs/${entry.name}`);
    }
  }
  if (bucketEnabled) {
    const base = storagePublicBaseUrl();
    let token: string | undefined;
    do {
      const page = await s3Client!.send(new ListObjectsV2Command({ Bucket: mediaBucket, Prefix: "proofs/", ContinuationToken: token }));
      for (const obj of page.Contents ?? []) if (obj.Key && !obj.Key.endsWith("/")) urls.push(`${base}/${obj.Key}`);
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
  return urls;
}

async function main() {
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"} | STORAGE_PROVIDER=${STORAGE_PROVIDER}`);

  const orders = await prisma.order.findMany({
    where: { proofImageUrl: { not: null } },
    select: { id: true, invoiceNumber: true, status: true, proofImageUrl: true },
  });
  const legacy = orders.filter((o) => !isPrivateFileRef(o.proofImageUrl));
  console.log(`${orders.length} order berbukti, ${legacy.length} masih di penyimpanan publik.`);

  let moved = 0, missing = 0, skipped = 0, failed = 0;
  for (const order of legacy) {
    const url = order.proofImageUrl!;
    const label = `${order.invoiceNumber ?? order.id} (${order.status})`;
    const source = publicSourceOf(url);
    if (!source) {
      skipped++;
      console.log(`LEWATI  ${label}: ${url} bukan berkas di prefix proofs/ penyimpanan platform`);
      continue;
    }
    if (!apply) {
      console.log(`PINDAH  ${label}: ${url}`);
      continue;
    }
    try {
      const buffer = await readPublicSource(source);
      if (!buffer) {
        missing++;
        console.log(`HILANG  ${label}: berkas sumber tidak ada (${url}); proofImageUrl dibiarkan`);
        continue;
      }
      const fileName = path.basename(source.kind === "disk" ? source.absolutePath : source.key);
      const ext = path.extname(fileName).toLowerCase();
      const ref = await uploadPrivateFile(buffer, `proofs/${fileName}`, MIME_TYPES[ext] ?? "application/octet-stream");

      // Bersyarat pada URL lama: bila klien mengunggah bukti baru di tengah migrasi, salinan privat ini dibuang.
      const updated = await prisma.order.updateMany({ where: { id: order.id, proofImageUrl: url }, data: { proofImageUrl: ref } });
      if (updated.count === 0) {
        await deleteFile(ref);
        skipped++;
        console.log(`LEWATI  ${label}: bukti berubah selama migrasi`);
        continue;
      }
      if (!(await deleteFile(url))) console.warn(`PERINGATAN ${label}: salinan publik ${url} gagal dihapus; hapus manual`);
      moved++;
      console.log(`DIPINDAH ${label}`);
    } catch (err) {
      failed++;
      console.error(`GAGAL   ${label}:`, err instanceof Error ? err.message : err);
    }
  }

  // Bukti yang masih dirujuk order (sumber hilang, gagal, dilewati, atau dry run) tidak termasuk yatim. Dicocokkan per nama
  // berkas (berisi 96 bit acak), bukan URL utuh: URL lama dapat memakai domain publik bucket sebelum diganti.
  const fileNameOf = (url: string) => path.basename(decodeURIComponent(url.split("?")[0]));
  const stillReferenced = new Set(
    (await prisma.order.findMany({ where: { proofImageUrl: { not: null } }, select: { proofImageUrl: true } }))
      .map((o) => o.proofImageUrl!)
      .filter((u) => !isPrivateFileRef(u))
      .map(fileNameOf)
  );
  const orphans = (await listPublicProofUrls()).filter((u) => !stillReferenced.has(fileNameOf(u)));
  let orphansDeleted = 0;
  for (const url of orphans) {
    if (!apply) {
      console.log(`HAPUS   berkas yatim ${url}`);
      continue;
    }
    if (await deleteFile(url)) orphansDeleted++;
    else console.warn(`PERINGATAN berkas yatim ${url} gagal dihapus`);
  }

  if (apply) {
    console.log(`Selesai: ${moved} dipindah, ${missing} sumber hilang, ${skipped} dilewati, ${failed} gagal, ${orphansDeleted}/${orphans.length} berkas yatim dihapus.`);
  } else {
    console.log(`Dry run: ${legacy.length - skipped} akan dipindah, ${skipped} dilewati, ${orphans.length} berkas yatim akan dihapus. Jalankan dengan --apply.`);
  }
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
