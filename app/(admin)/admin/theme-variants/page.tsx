"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ThemeVariantEditor from "@/components/admin/ThemeVariantEditor";

function ThemeVariantRoute() {
  const searchParams = useSearchParams();
  return <ThemeVariantEditor parentId={searchParams.get("parent")} variantId={searchParams.get("id")} masterId={searchParams.get("master")} />;
}

export default function ThemeVariantPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-500">Memuat editor varian…</div>}>
      <ThemeVariantRoute />
    </Suspense>
  );
}
