const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const id = "0200543a-bc4a-4b2c-8a7e-d7254aa5805b";
  try {
    const existing = await prisma.invitationMedia.findFirst({
      where: { invitationId: id, slot: "HOME_PHOTO" }
    });
    console.log("existing:", existing);
    if (!existing) {
       await prisma.invitationMedia.create({
          data: { invitationId: id, slot: "HOME_PHOTO", mediaType: "PHOTO", localPath: "http://test.com/photo.jpg" }
       });
       console.log("Created successfully");
    }
  } catch (err) {
    console.error("Prisma error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
