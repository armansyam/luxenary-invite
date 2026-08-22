"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Invitation {
  id: string;
  invitationSlug: string;
  groomName: string;
  brideName: string;
  themeId: string;
  status: string;
  createdAt: string;
  subdomain?: string;
}

export default function DashboardHome() {
  const { data: session } = useSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/invitations")
      .then((res) => res.json())
      .then((data) => {
        setInvitations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Selamat datang, {session?.user?.name}</h1>
          <p className="text-gray-600">Kelola undangan pernikahanmu di satu tempat</p>
        </div>
        <Link
          href="/dashboard/invitation/new"
          className="px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition"
        >
          + Buat Undangan Baru
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">Belum ada undangan</h2>
          <p className="mt-2 text-gray-500">Mulai buat undangan pernikahan pertamamu</p>
          <Link
            href="/dashboard/invitation/new"
            className="mt-6 inline-block px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition"
          >
            Buat Undangan Pertama
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {invitations.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition">
              <div className="h-32 bg-gradient-to-r from-amber-400 to-amber-600 relative">
                <span className="absolute bottom-3 right-3 px-2 py-1 text-xs font-medium rounded-full bg-white/90 text-amber-700">
                  {inv.status === "PUBLISHED" ? "Dipublikasikan" : "Draft"}
                </span>
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  {inv.groomName} & {inv.brideName}
                </h3>
                <p className="text-sm text-gray-500">
                  Tema: <span className="font-medium capitalize">{inv.themeId.replace(/-/g, " ")}</span>
                </p>
                <p className="text-sm text-gray-500">
                  URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                    {inv.subdomain ? `${inv.subdomain}.invited.id` : `${inv.groomName.toLowerCase()}-${inv.brideName.toLowerCase()}.invited.id/${inv.invitationSlug}`}
                  </code>
                </p>
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/dashboard/invitation/${inv.id}`}
                    className="flex-1 text-center py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Edit
                  </Link>
                  <a
                    href={inv.subdomain ? `https://${inv.subdomain}.invited.id` : `/${inv.groomName.toLowerCase()}-${inv.brideName.toLowerCase()}/${inv.invitationSlug}`}
                    target="_blank"
                    className="flex-1 text-center py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
                  >
                    Lihat
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}