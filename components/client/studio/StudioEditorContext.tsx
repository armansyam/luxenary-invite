"use client";

import { createContext, useContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from "react";
import type { useFeedback } from "@/components/ui/Feedback";
import type { getThemeBlueprint } from "@/lib/themeDefaults";

export interface StudioEditorContextValue {
  feedback: ReturnType<typeof useFeedback>;
  invitationId: string;
  invitation: any;
  setInvitation: Dispatch<SetStateAction<any>>;
  media: Record<string, string>;
  events: any[];
  stories: any[];
  bankList: any[];
  loading: boolean;
  saving: boolean;
  savingSec: string | null;
  isUploading: boolean;
  savedSnapshot: any;
  playingAudioUrl: string | null;
  uploadingAudio: boolean;
  audioUploadError: string | null;
  setAudioUploadError: Dispatch<SetStateAction<string | null>>;
  platformSettings: any;
  themesList: any[];
  themesLoading: boolean;
  musicPresets: any[];
  musicLoading: boolean;
  upgradeModal: boolean;
  setUpgradeModal: Dispatch<SetStateAction<boolean>>;
  upgradeTarget: "TIER_2" | "TIER_3" | null;
  setUpgradeTarget: Dispatch<SetStateAction<"TIER_2" | "TIER_3" | null>>;
  upgrading: boolean;
  upgradeError: string | null;
  eventTypeModalOpen: boolean;
  setEventTypeModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedEventType: string;
  setSelectedEventType: Dispatch<SetStateAction<string>>;
  selectedFreeSubEvent: string;
  setSelectedFreeSubEvent: Dispatch<SetStateAction<string>>;
  freeSubCustomMode: boolean;
  setFreeSubCustomMode: Dispatch<SetStateAction<boolean>>;
  changingEventType: boolean;
  eventTypeError: string | null;
  PLAN_HIERARCHY: Record<string, number>;
  packageOf: (id: string) => any;
  upgradeDiff: (target: string, current: string) => number;
  handleChangeInvitationMode: () => Promise<void>;
  changingSubEvent: boolean;
  customSubEventDraft: string;
  setCustomSubEventDraft: Dispatch<SetStateAction<string>>;
  subEventCustomOpen: boolean;
  setSubEventCustomOpen: Dispatch<SetStateAction<boolean>>;
  handleSwitchSubEvent: (rawNextSubEvent: string) => Promise<void>;
  handleUpgrade: () => Promise<void>;
  activeStudioTab: "form" | "live";
  previewDevice: "mobile" | "desktop" | "dual";
  selectedThemeCategory: string;
  setSelectedThemeCategory: Dispatch<SetStateAction<string>>;
  selectedPersonalThemeSub: string;
  setSelectedPersonalThemeSub: Dispatch<SetStateAction<string>>;
  liveMobileIframeRef: RefObject<HTMLIFrameElement | null>;
  liveDesktopIframeRef: RefObject<HTMLIFrameElement | null>;
  liveFallbackIframeRef: RefObject<HTMLIFrameElement | null>;
  liveSingleIframeRef: RefObject<HTMLIFrameElement | null>;
  liveIframeKey: number;
  setLiveIframeKey: Dispatch<SetStateAction<number>>;
  isCanvasFullscreen: boolean;
  liveCanvasRef: RefObject<HTMLDivElement | null>;
  toggleCanvasFullscreen: () => void;
  broadcastToAllLiveIframes: (msg: any) => void;
  activeSectionTab: string;
  showManualHex: boolean;
  setShowManualHex: Dispatch<SetStateAction<boolean>>;
  themeSyncSuccess: boolean;
  setThemeSyncSuccess: Dispatch<SetStateAction<boolean>>;
  togglePlayPreview: (url: string) => void;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleUploadStart: () => void;
  handleUploadEnd: () => void;
  collapsed: Record<string, boolean>;
  toggleSection: (secKey: string) => void;
  saveSection: (secKey?: string, overrideInvitation?: any) => Promise<{ ok: boolean; error?: string }>;
  updateField: (field: string, value: any) => void;
  updateWeddingField: (field: string, value: string) => void;
  weddingValue: (field: string) => string;
  updateMedia: (slot: string, url: string) => void;
  slotUsed: (slot: string) => boolean;
  updateFeatureSetting: (key: string, value: any) => void;
  getFeatureSetting: (key: string, fallback?: any) => any;
  updateCustomLabel: (key: string, value: string) => void;
  getCustomLabel: (key: string, fallback?: string) => string;
  isDirty: Record<string, boolean>;
  revertAllChanges: () => Promise<void>;
  addEvent: (presetTitle?: string) => void;
  removeEvent: (index: number) => void;
  setAsPrimaryEvent: (index: number) => void;
  updateEventItem: (index: number, field: string, value: any) => void;
  handleTimeFieldChange: (index: number, field: "startTime" | "endTime" | "timezone" | "isUntilDone", value: any) => void;
  addStory: () => void;
  removeStory: (index: number) => void;
  updateStoryItem: (index: number, field: string, value: any) => void;
  addBank: () => void;
  removeBank: (index: number) => void;
  updateBankItem: (index: number, field: string, value: any) => void;
  updateParticipantData: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  selectedThemeObj: any;
  activeBlueprint: ReturnType<typeof getThemeBlueprint>;
  themeFallbackMusicUrl: string;
  displayOrder: string;
  planType: string;
  hasCap: (cap: string) => boolean;
  showMusic: boolean;
  showStory: boolean;
  showGallery: boolean;
  showGift: boolean;
  showDresscode: boolean;
  showQrCheckin: boolean;
  showLiveStream: boolean;
  showFilter: boolean;
  bgPhotoTone: number;
  bgScrim: number | null;
  showTurutMengundang: boolean;
  isWeddingEvent: boolean;
  eventNounLabel: string;
  unusedSlotPhotos: string[];
  unfilledSlots: string[];
  sectionHeading: (id: string) => string;
  renderSectionNavFooter: (currentSecId: string) => ReactNode;
}

const StudioEditorContext = createContext<StudioEditorContextValue | null>(null);

export function StudioEditorProvider({
  value,
  children,
}: {
  value: StudioEditorContextValue;
  children: ReactNode;
}) {
  return <StudioEditorContext.Provider value={value}>{children}</StudioEditorContext.Provider>;
}

export function useStudioEditor(): StudioEditorContextValue {
  const ctx = useContext(StudioEditorContext);
  if (!ctx) throw new Error("useStudioEditor harus dipanggil di dalam StudioEditorProvider");
  return ctx;
}
