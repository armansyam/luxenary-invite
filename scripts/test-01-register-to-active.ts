import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest01() {
  console.log("🚀 [TEST-01] Memulai simulasi: Registrasi -> Klien Aktif...");

  try {
    // 1. Register dummy user
    const userEmail = `client_${Date.now()}@test.luxenary.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        name: "Test Client QA",
        googleId: `google_dummy_${Date.now()}`, // Wajib untuk sistem ini
        role: "CLIENT"
      }
    });
    console.log(`✅ User berhasil dibuat: ${user.email} (ID: ${user.id})`);

    // 2. Buat Order (MANUAL_TRANSFER)
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        invoiceNumber: `INV-TEST-${Date.now()}`,
        planType: "MODERN",
        amount: 499000,
        status: "PENDING",
        orderType: "NEW",
        paymentMethod: "MANUAL_TRANSFER"
      }
    });
    console.log(`✅ Order PENDING berhasil dibuat (Invoice: ${order.invoiceNumber})`);

    // 3. Simulasi Klien Upload Bukti Transfer
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        proofImageUrl: "https://example.com/dummy-proof.jpg",
        proofUploadedAt: new Date()
      }
    });
    console.log(`✅ Klien mengunggah bukti transfer manual.`);

    // 4. Simulasi Admin verifikasi Order (Approve)
    const paidOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentGatewayRef: "MANUAL_ADMIN_APPROVAL"
      }
    });
    console.log(`✅ Admin menyetujui order. Status berubah menjadi PAID.`);

    // 5. Buat entitas Invitation berdasarkan order yang sudah PAID
    const invitation = await prisma.invitation.create({
      data: {
        userId: user.id,
        orderId: paidOrder.id,
        themeId: "aruna",
        invitationSlug: `test-wedding-${Date.now()}`,
        groomSlug: "test-groom",
        brideSlug: "test-bride",
        status: "DRAFT", // Masih DRAFT setelah dibeli
        groomName: "Test Groom",
        brideName: "Test Bride",
        isLockedPermanently: false,
        memoriesUploadLocked: false
      }
    });
    console.log(`✅ Undangan DRAFT berhasil diinisiasi (ID: ${invitation.id})`);
    
    console.log("\n🎉 [TEST-01] SKENARIO BERHASIL SELESAI!");
    console.log("====================================================");
    console.log(`USER_ID: ${user.id}`);
    console.log(`ORDER_ID: ${paidOrder.id}`);
    console.log(`INVITATION_ID: ${invitation.id}`);
    console.log("Gunakan INVITATION_ID di atas untuk menjalankan TEST-02 (jika diubah manual).");
    
  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest01();
