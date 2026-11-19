import { notFound } from "next/navigation";
import StaffLockScreen from "@/app/components/features/StaffLockScreen";
import WelcomeScreenClient from "@/app/components/features/WelcomeScreenClient";
import { loadReceptionistInvitation } from "@/lib/receptionistPageData";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlugWelcomePage({ params }: PageProps) {
  const { slug } = await params;
  const loaded = await loadReceptionistInvitation({ slug });

  if (loaded.kind === "not_found") notFound();

  if (loaded.kind === "forbidden") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 text-stone-100">
        <div className="max-w-sm w-full bg-stone-900 rounded-2xl border border-stone-800 shadow-lg p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-stone-800 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
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
          <div className="w-14 h-14 bg-rose-950 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
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
