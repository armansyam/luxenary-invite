/**
 * Menyalin nama tokoh utama acara non-pernikahan dari participantsJson ke kolom groom*.
 *
 * Sebelum perbaikan 9 Okt 2026 wizard tidak melakukan salinan ini; hanya editor studio yang melakukannya. Undangan yang
 * namanya belum pernah disunting di studio memiliki groomName kosong, sehingga audit terbit menolaknya dan resepsionis,
 * QR check-in, serta notifikasi tidak menampilkan nama. Aman dijalankan berulang.
 *
 *   npx tsx scripts/backfill-participant-names.ts           # dry run
 *   npx tsx scripts/backfill-participant-names.ts --apply   # tulis perubahan
 */
import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import { mirrorParticipantNames, safeParseParticipants } from "../lib/participantUtils";

const apply = process.argv.includes("--apply");

async function main() {
  const invitations = await prisma.invitation.findMany({
    where: { eventType: { not: "WEDDING" }, participantsJson: { not: null } },
    select: {
      id: true, eventType: true, invitationSlug: true, participantsJson: true,
      groomName: true, groomNickname: true, groomFather: true, groomMother: true, groomInstagram: true,
    },
  });

  const changes = invitations
    .map((inv) => {
      const mirrored = mirrorParticipantNames(inv.eventType, safeParseParticipants(inv.participantsJson));
      const diff = Object.fromEntries(
        Object.entries(mirrored).filter(([field, value]) => (inv[field as keyof typeof inv] ?? "") !== value)
      );
      return { inv, diff };
    })
    .filter(({ diff }) => Object.keys(diff).length > 0);

  console.log(`Undangan non-pernikahan: ${invitations.length}; perlu disinkronkan: ${changes.length}`);
  for (const { inv, diff } of changes) console.log(`- ${inv.eventType} ${inv.invitationSlug} (${inv.id}): ${JSON.stringify(diff)}`);

  if (!apply) {
    console.log("\nDry run. Jalankan ulang dengan --apply.");
    return;
  }
  for (const { inv, diff } of changes) {
    await prisma.invitation.update({ where: { id: inv.id }, data: diff });
  }
  console.log(`Selesai: ${changes.length} undangan diperbarui.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
