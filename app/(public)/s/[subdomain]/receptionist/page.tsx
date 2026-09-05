import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReceptionistScannerClient from "@/app/components/features/ReceptionistScannerClient";
import StaffLockScreen from "@/app/components/features/StaffLockScreen";
import { getAdminSetting } from "@/lib/settings";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function ReceptionistPage({ params }: PageProps) {
  const { subdomain } = await params;
  if (!subdomain) notFound();

  const [invitation, platformName] = await Promise.all([
    prisma.invitation.findUnique({
      where: { subdomain },
      select: { id: true, staffPin: true, status: true }
    }),
    getAdminSetting("platform_name", "Luxenary Invite")
  ]);

  if (!invitation) notFound();

  // Jika PIN Panitia belum diatur oleh klien, tampilkan halaman error — jangan izinkan akses tanpa PIN.
  if (!invitation.staffPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-rose-200 shadow-lg p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-base font-bold text-stone-900">Akses Dikunci</h1>
          <p className="text-sm text-stone-500 leading-relaxed">
            PIN Keamanan Panitia belum diatur oleh penyelenggara. Silakan hubungi pemilik undangan untuk mengatur PIN terlebih dahulu melalui menu <strong>Pengaturan</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <StaffLockScreen invitationId={invitation.id}>
      <ReceptionistScannerClient invitationId={invitation.id} platformName={platformName} />
    </StaffLockScreen>
  );
}
