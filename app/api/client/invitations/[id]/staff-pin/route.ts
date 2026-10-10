import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { encryptPin } from "@/lib/pinEncryption";
import { STAFF_PIN_PATTERN } from "@/lib/invitationUtils";
import { getInvitationLockStatus } from "../route";

export const dynamic = "force-dynamic";

/**
 * PUT /api/client/invitations/[id]/staff-pin
 *
 * PIN panitia tetap dapat diganti setelah undangan terbit (studio terkunci) karena hanya membuka portal resepsionis,
 * tidak mengubah isi undangan yang sudah disebar. Sesi resepsionis lama otomatis tidak berlaku: tokennya terikat ke
 * sidik PIN (lib/receptionistAuth.ts). Ditolak setelah hari terima tamu lewat dan untuk undangan yang diturunkan/diarsipkan.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const pin = typeof body.staffPin === "string" ? body.staffPin.trim() : "";
    if (!STAFF_PIN_PATTERN.test(pin)) {
      return NextResponse.json({ error: "PIN harus 4–10 karakter berupa huruf atau angka." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }
    if (invitation.userId !== session.user.id && !hasAdminPermission(session.user, "invitations")) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    if (invitation.status === "TAKEN_DOWN" || invitation.status === "ARCHIVED") {
      return NextResponse.json({ error: "Undangan ini sudah tidak aktif sehingga PIN panitia tidak dapat diubah." }, { status: 409 });
    }
    const lock = getInvitationLockStatus(invitation);
    if (lock.isLocked && lock.lockReason !== "PUBLISHED") {
      return NextResponse.json({ error: "Hari acara sudah lewat sehingga PIN panitia tidak dapat diubah lagi." }, { status: 409 });
    }

    await prisma.invitation.update({ where: { id }, data: { staffPin: encryptPin(pin) } });
    return NextResponse.json({ staffPin: pin });
  } catch (err) {
    return routeError("ClientStaffPin", err, "Gagal menyimpan PIN panitia.");
  }
}
