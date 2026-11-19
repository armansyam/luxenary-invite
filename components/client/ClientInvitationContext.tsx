"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "lux_active_inv_id";

export interface ClientInvitationSummary {
  id: string;
  eventType?: string | null;
  status?: string | null;
  subdomain?: string | null;
  customDomain?: string | null;
  invitationSlug?: string | null;
  participantsJson?: unknown;
  isFreeDraft?: boolean;
  [key: string]: any;
}

interface ClientInvitationContextValue {
  invitations: ClientInvitationSummary[];
  loading: boolean;
  error: string | null;
  activeInvitationId: string;
  activeInvitation: ClientInvitationSummary | null;
  setActiveInvitationId: (id: string) => void;
  refreshInvitations: () => Promise<ClientInvitationSummary[]>;
  updateActiveInvitationLocal: (updater: (prev: ClientInvitationSummary) => ClientInvitationSummary) => void;
}

const ClientInvitationContext = createContext<ClientInvitationContextValue | null>(null);

export function ClientInvitationProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [invitations, setInvitations] = useState<ClientInvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  const refreshInvitations = useCallback(async (): Promise<ClientInvitationSummary[]> => {
    try {
      setError(null);
      const res = await fetch("/api/client/invitations", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat daftar undangan");
      const list = await res.json();
      const normalized = Array.isArray(list) ? list : [];
      setInvitations(normalized);

      const urlMatch = pathname?.match(/^\/dashboard\/invitation\/([^/]+)/);
      const pathInvId = urlMatch?.[1] || "";
      const queryInvId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("inv") || ""
          : "";
      const storedId =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) || "" : "";

      const candidates = [pathInvId, queryInvId, selectedId, storedId];
      const matched = candidates.find((c) => c && normalized.some((inv) => inv.id === c));
      const resolvedId = matched || normalized[0]?.id || "";

      setSelectedId(resolvedId);
      if (resolvedId && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, resolvedId);
      }
      setLoading(false);
      return normalized;
    } catch {
      setError("Gagal memuat daftar undangan");
      setLoading(false);
      return [];
    }
  }, [pathname, selectedId]);

  useEffect(() => {
    if (!enabled) return;
    void refreshInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat saat akses terverifikasi
  }, [enabled]);

  // Sinkronkan bila pengguna menavigasi langsung ke /dashboard/invitation/<id> atau ?inv=<id>
  useEffect(() => {
    if (!enabled || invitations.length === 0) return;
    const urlMatch = pathname?.match(/^\/dashboard\/invitation\/([^/]+)/);
    const pathInvId = urlMatch?.[1] || "";
    const queryInvId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("inv") || ""
        : "";
    const target = pathInvId || queryInvId;
    if (target && invitations.some((inv) => inv.id === target) && target !== selectedId) {
      setSelectedId(target);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, target);
      }
    }
  }, [enabled, pathname, invitations, selectedId]);

  const setActiveInvitationId = useCallback(
    (id: string) => {
      if (!id || !invitations.some((inv) => inv.id === id)) return;
      setSelectedId(id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, id);
      }
      if (pathname?.startsWith("/dashboard/invitation/")) {
        router.push(`/dashboard/invitation/${id}`);
      }
    },
    [invitations, pathname, router],
  );

  const updateActiveInvitationLocal = useCallback(
    (updater: (prev: ClientInvitationSummary) => ClientInvitationSummary) => {
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === selectedId ? updater(inv) : inv)),
      );
    },
    [selectedId],
  );

  const activeInvitation = useMemo(
    () => invitations.find((inv) => inv.id === selectedId) || invitations[0] || null,
    [invitations, selectedId],
  );

  const activeInvitationId = activeInvitation?.id || "";

  const value = useMemo(
    () => ({
      invitations,
      loading,
      error,
      activeInvitationId,
      activeInvitation,
      setActiveInvitationId,
      refreshInvitations,
      updateActiveInvitationLocal,
    }),
    [
      invitations,
      loading,
      error,
      activeInvitationId,
      activeInvitation,
      setActiveInvitationId,
      refreshInvitations,
      updateActiveInvitationLocal,
    ],
  );

  return <ClientInvitationContext.Provider value={value}>{children}</ClientInvitationContext.Provider>;
}

export function useClientInvitation(): ClientInvitationContextValue {
  const ctx = useContext(ClientInvitationContext);
  if (!ctx) {
    throw new Error("useClientInvitation harus dipakai di dalam ClientInvitationProvider");
  }
  return ctx;
}
