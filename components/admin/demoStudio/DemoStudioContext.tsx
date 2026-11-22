"use client";

import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { getThemeBlueprint } from "@/lib/themeDefaults";
import type { useFeedback } from "@/components/ui/Feedback";

export const DEMO_EXTRA_LABEL_FIELDS: Array<{ key: string; label: string }> = [
  { key: "openingGreeting", label: "Salam Pembuka" },
  { key: "quoteEyebrow", label: "Eyebrow Kutipan" },
  { key: "quoteTitle", label: "Judul Kutipan" },
  { key: "coupleEyebrow", label: "Eyebrow Profil" },
  { key: "eventsEyebrow", label: "Eyebrow Acara" },
  { key: "cdDays", label: "Hitung Mundur: Hari" },
  { key: "cdHours", label: "Hitung Mundur: Jam" },
  { key: "cdMins", label: "Hitung Mundur: Menit" },
  { key: "cdSecs", label: "Hitung Mundur: Detik" },
  { key: "rsvpNameLabel", label: "RSVP: Label Nama" },
  { key: "rsvpStatusLabel", label: "RSVP: Label Kehadiran" },
  { key: "rsvpCountLabel", label: "RSVP: Label Jumlah Tamu" },
  { key: "rsvpMessageLabel", label: "RSVP: Label Ucapan" },
  { key: "wishesEyebrow", label: "Eyebrow Ucapan" },
  { key: "memoriesEyebrow", label: "Eyebrow Kamera Momen" },
  { key: "memoriesTitle", label: "Judul Kamera Momen" },
  { key: "memoriesSubtitle", label: "Subjudul Kamera Momen" },
];

export type DemoStudioTabId = "visual" | "profile" | "stories" | "narratives" | "vendors";

export interface DemoStudioContextValue {
  demoStudioTheme: any;
  systemMusics: any[];
  feedback: ReturnType<typeof useFeedback>;
  demoStudioTab: DemoStudioTabId;
  demoStudioData: any;
  setDemoStudioData: Dispatch<SetStateAction<any>>;
  demoBuiltinMedia: Record<string, string>;
  missingDemoSlots: Record<string, boolean>;
  setMissingDemoSlots: Dispatch<SetStateAction<Record<string, boolean>>>;
  stagedDemoFiles: Record<string, File>;
  stagedDeletedSlots: Record<string, boolean>;
  demoStudioSaving: boolean;
  uploadingSlot: string | null;
  setUploadingSlot: Dispatch<SetStateAction<string | null>>;
  updatedDemoSlots: Record<string, number>;
  setUpdatedDemoSlots: Dispatch<SetStateAction<Record<string, number>>>;
  demoStudioSessionTime: number;
  localPreviews: Record<string, string>;
  currentDemoBlueprint: ReturnType<typeof getThemeBlueprint> | null;
  handleStageDemoAsset: (slot: string, file: File) => Promise<void>;
  handleDiscardStagedAsset: (slot: string) => void;
  handleStageDeleteAsset: (slot: string) => void;
  handleRestoreDeletedAsset: (slot: string) => void;
}

const DemoStudioContext = createContext<DemoStudioContextValue | null>(null);

export function DemoStudioProvider({
  value,
  children,
}: {
  value: DemoStudioContextValue;
  children: ReactNode;
}) {
  return <DemoStudioContext.Provider value={value}>{children}</DemoStudioContext.Provider>;
}

export function useDemoStudio(): DemoStudioContextValue {
  const ctx = useContext(DemoStudioContext);
  if (!ctx) throw new Error("useDemoStudio harus dipanggil di dalam DemoStudioProvider");
  return ctx;
}
