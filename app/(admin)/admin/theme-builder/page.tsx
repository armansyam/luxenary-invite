"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ThemeBuilder from "@/components/admin/themeBuilder/ThemeBuilder";

function ThemeBuilderRoute() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const from = searchParams.get("from");
  return <ThemeBuilder themeId={id} fromId={from} />;
}

export default function ThemeBuilderPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-500">Memuat Theme Builder…</div>}>
      <ThemeBuilderRoute />
    </Suspense>
  );
}
