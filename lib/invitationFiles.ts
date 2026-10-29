import path from "path";
import { removeIfExists } from "./fsSafe";
import { deletePublishedHtml } from "./staticPublisher";
import { deleteFile, deleteInvitationBucketObjects, isInvitationOwnedUpload } from "./storage";
import { logger } from "./logger";

export interface InvitationFileOwner {
  id: string;
  media: { localPath: string | null }[];
  guestMemories: { mediaUrl: string | null }[];
}

/**
 * Berkas fisik milik satu undangan: HTML terbit, piring draft, media (R2/lokal), foto tamu, dan folder unggahan lokal.
 * Dipanggil setelah baris DB terhapus; kegagalan hapus berkas tidak membatalkan penghapusan data, hanya dicatat.
 * Portofolio memakai salinan aset sendiri, jadi tidak ikut terhapus.
 */
export async function removeInvitationFiles(inv: InvitationFileOwner, context: string): Promise<void> {
  await deletePublishedHtml(inv.id);
  await removeIfExists(path.join(process.cwd(), "data", "drafts", `${inv.id}.html`));

  if (inv.media.length > 0) {
    await Promise.all(inv.media.map((m) => (isInvitationOwnedUpload(m.localPath, inv.id) ? deleteFile(m.localPath) : Promise.resolve())))
      .catch((e) => logger.warn(context, "Sebagian berkas media gagal dihapus", { invitationId: inv.id, error: e instanceof Error ? e.message : String(e) }));
  }
  // Unggahan yang URL-nya di featureSettings (QRIS, logo vendor) dan musik tidak tercatat di tabel media.
  await deleteInvitationBucketObjects(inv.id)
    .catch((e) => logger.warn(context, "Sebagian objek R2 undangan gagal dihapus", { invitationId: inv.id, error: e instanceof Error ? e.message : String(e) }));
  if (inv.guestMemories.length > 0) {
    await Promise.all(inv.guestMemories.map((mem) => (mem.mediaUrl ? deleteFile(mem.mediaUrl) : Promise.resolve())))
      .catch((e) => logger.warn(context, "Sebagian berkas kenangan tamu gagal dihapus", { invitationId: inv.id, error: e instanceof Error ? e.message : String(e) }));
  }

  await removeIfExists(path.join(process.cwd(), "public", "uploads", "invitations", inv.id), { recursive: true });
  await removeIfExists(path.join(process.cwd(), "public", "uploads", "guest-memories", inv.id), { recursive: true });
}
