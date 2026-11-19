import { notFound } from "next/navigation";
import StaffLockScreen from "@/app/components/features/StaffLockScreen";
import WelcomeScreenClient from "@/app/components/features/WelcomeScreenClient";
import { loadReceptionistInvitation } from "@/lib/receptionistPageData";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function SubdomainWelcomePage({ params }: PageProps) {
  const { subdomain } = await params;
  const loaded = await loadReceptionistInvitation({ subdomain });

  if (loaded.kind === "not_found") notFound();

  if (loaded.kind === "forbidden") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 text-stone-100">
        <div className="max-w-sm w-full bg-stone-900 rounded-2xl border border-stone-800 shadow-lg p-8 text-center space-y-4">
          <h1 className="text-base font-bold text-white">Fitur Tidak Tersedia</h1>
          <p className="text-sm text-stone-400 leading-relaxed">
            Fitur Sistem Resepsionis &amp; Layar Sapa TV tidak termasuk dalam kapabilitas paket undangan ini.
          </p>
        </div>
      </div>
    );
  }

  if (loaded.kind === "no_pin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 text-stone-100">
        <div className="max-w-sm w-full bg-stone-900 rounded-2xl border border-rose-900/60 shadow-lg p-8 text-center space-y-4">
          <h1 className="text-base font-bold text-white">Akses Dikunci</h1>
          <p className="text-sm text-stone-400 leading-relaxed">
            PIN Keamanan Panitia belum diatur oleh penyelenggara. Silakan atur PIN terlebih dahulu melalui menu <strong>Pengaturan</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <StaffLockScreen invitationId={loaded.invitationId}>
      <WelcomeScreenClient
        invitationId={loaded.invitationId}
        platformName={loaded.platformName}
        clientInitials={loaded.clientInitials}
        clientNames={loaded.clientNames}
      />
    </StaffLockScreen>
  );
}
