"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function InvitationIndexPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/invitations")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          router.replace(`/dashboard/invitation/${data[0].id}`);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-medium">Membuka Studio Editor Undangan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8 bg-white border border-stone-200 rounded-2xl text-center space-y-4 my-12 shadow-sm">
      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-800 border border-amber-200/60">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-stone-900">Mulai Desain Undangan Pernikahan Anda</h2>
      <p className="text-xs text-stone-500 max-w-md mx-auto">
        Belum ada undangan yang dibuat. Klik tombol di bawah untuk membuat undangan pertama Anda dengan tema eksklusif.
      </p>
      <Link
        href="/packages"
        className="inline-block px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm transition shadow-sm"
      >
        Pilih Paket Undangan
      </Link>
    </div>
  );
}