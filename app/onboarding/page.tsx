"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export default function OnboardingHub() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/client/onboarding-state", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.redirectUrl) {
          router.replace(data.redirectUrl);
        } else {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        router.replace("/dashboard");
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] font-sans">
      <div className="flex flex-col items-center space-y-4">
        <BrandLogo size="lg" />
        <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin mt-4"></div>
        <p className="text-xs text-stone-500 font-medium tracking-wide">Memeriksa status akun Anda...</p>
      </div>

      <div className="absolute bottom-10 left-0 right-0 text-center">
        <button
          onClick={() => {
            fetch("/api/auth/signout", { method: "POST" }).then(() => {
              router.push("/");
            });
          }}
          className="text-stone-400 hover:text-stone-700 text-[10px] transition cursor-pointer underline"
        >
          Batalkan & Keluar
        </button>
      </div>
    </div>
  );
}
