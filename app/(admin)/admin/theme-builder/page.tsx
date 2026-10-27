"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ThemeBuilder from "@/components/admin/themeBuilder/ThemeBuilder";

function ThemeBuilderRoute() {
  const id = useSearchParams().get("id");
  return <ThemeBuilder themeId={id} />;
}

export default function ThemeBuilderPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-500">Memuat Theme Builder…</div>}>
      <ThemeBuilderRoute />
    </Suspense>
  );
}
