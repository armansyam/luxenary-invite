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
      <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-700 font-bold text-xl">
        ✦
      </div>
      <h2 className="text-xl font-bold text-stone-900">Mulai Desain Undangan Pernikahan Anda</h2>
      <p className="text-xs text-stone-500 max-w-md mx-auto">
        Belum ada undangan yang dibuat. Klik tombol di bawah untuk membuat undangan pertama Anda dengan tema eksklusif.
      </p>
      <Link
        href="/dashboard/invitation/new"
        className="inline-block px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm transition shadow-sm"
      >
        + Buat Undangan Baru
      </Link>
    </div>
  );
}