"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MasterEditor from "@/components/admin/MasterEditor";

function MasterEditorRoute() {
  const searchParams = useSearchParams();
  const masterId = searchParams.get("id") || searchParams.get("master");
  return <MasterEditor masterId={masterId} />;
}

export default function AdminMasterEditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-stone-500">Memuat editor master…</div>}>
      <MasterEditorRoute />
    </Suspense>
  );
}
