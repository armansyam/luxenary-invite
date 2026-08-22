import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
      <header className="p-6 text-center">
        <h1 className="text-4xl font-bold text-amber-800">Luxenary Invite</h1>
        <p className="text-lg text-gray-600 mt-2">Platform Undangan Pernikahan Digital Self-Service</p>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Buat Undangan Impianmu</h2>
            <p className="text-gray-600 mb-8">
              Self-service, pilih tema premium, kirim via WhatsApp, dan pantau RSVP real-time.
              Subdomain custom: <strong className="text-amber-700">nama-pengantin.domain.com</strong>
            </p>

            <div className="space-y-4">
              <Link
                href="/login"
                className="block w-full py-4 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition"
              >
                Mulai Buat Undangan (Login Google)
              </Link>

              <Link
                href="/demo"
                className="block w-full py-4 border-2 border-amber-600 text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition"
              >
                Lihat Demo Template Kila
              </Link>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
            <div className="p-4 bg-white rounded-xl shadow">
              <h3 className="font-semibold text-gray-700 mb-1">Unlimited Undangan</h3>
              <p>Satu pasangan, banyak undangan (resepsi, akad, dll)</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow">
              <h3 className="font-semibold text-gray-700 mb-1">Tema Premium</h3>
              <p>Heritage, Premium Series, Moody - scroll-snap & video bg</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow">
              <h3 className="font-semibold text-gray-700 mb-1">PWA Ready</h3>
              <p>Dashboard client installable, offline-capable</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-gray-500 text-sm">
        © 2024 Luxenary Invite — Dibangun dengan Next.js + Prisma + SQLite
      </footer>
    </div>
  );
}