"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { resolveEffectiveInvitationUrl } from "@/lib/domainUtils";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";
import { waPresets } from "@/lib/waPresets";
import { participantNames } from "@/lib/participantUtils";
import { useFeedback } from "@/components/ui/Feedback";
import { normalizeRsvpStatus, type RsvpStatus } from "@/lib/rsvpStatus";
import { getPrimaryEvent } from "@/lib/lifecycleDates";
import { useClientInvitation } from "@/components/client/ClientInvitationContext";

import { GuestPageModals } from "@/components/client/guests/GuestPageModals";
interface Guest {
  id: string;
  name: string;
  phone: string | null;
  category: string | null;
  qrToken: string;
  waStatus: string;
  sessionInfo: string | null;
  guestQuota?: number;
  guestLimit?: number | null;
  tableNumber?: string | null;
  isTokenRedeemed?: boolean;
  /** Pertama kali link personal tamu (?to=nama) dibuka; null bila belum pernah. */
  openedAt?: string | null;
  rsvps?: {
    status: string | null;
    guestCount: number;
    message: string | null;
  }[];
}

const RSVP_DOT: Record<string, string> = {
  hadir: "bg-emerald-600",
  tidak: "bg-rose-500",
  ragu: "bg-amber-500",
  none: "bg-stone-300",
};

function rsvpOf(guest: Guest): { state: RsvpStatus; label: string } | null {
  const latest = guest.rsvps?.[0];
  const state = normalizeRsvpStatus(latest?.status);
  if (!latest || !state) return null;
  const label =
    state === "hadir" ? `Konfirmasi hadir (${latest.guestCount || 1} pax)` : state === "tidak" ? "Konfirmasi tidak hadir" : "Konfirmasi ragu";
  return { state, label };
}

export default function GuestsPage() {
  const feedback = useFeedback();
  const { activeInvitation, activeInvitationId, loading: ctxLoading } = useClientInvitation();
  const [invitationId, setInvitationId] = useState<string>("");
  const [invitationData, setInvitationData] = useState<any>(null);
  const [platformPackages, setPlatformPackages] = useState<any[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "SENT" | "PENDING" | "UNOPENED">("all");
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);

  // Bulk Import CSV States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFileName, setBulkFileName] = useState("");
  const [parsedGuests, setParsedGuests] = useState<{
    name: string;
    phone?: string | null;
    category: string;
    sessionInfo: string;
    guestQuota: number;
    tableNumber?: string | null;
  }[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [hasContactPicker, setHasContactPicker] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "contacts" in navigator && "ContactsManager" in window) {
      setHasContactPicker(true);
    }
  }, []);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [beamStyle, setBeamStyle] = useState({ left: 0, width: 0 });

  // null = klien belum menyimpan template sendiri; pakai template admin, lalu preset formal sesuai jenis acara.
  const [waTemplate, setWaTemplate] = useState<string | null>(null);
  const [adminWaTemplate, setAdminWaTemplate] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);

  const [newGuest, setNewGuest] = useState({
    name: "",
    phone: "",
    category: "UMUM",
    sessionInfo: "",
    guestLimit: 2,
    tableNumber: "",
  });

  const downloadCsvTemplate = () => {
    const csvContent =
      "Nama,Nomor WhatsApp,Kategori,Sesi,Kuota,Nomor Meja\n" +
      "Bapak Budi Santoso,081234567890,VIP,Akad & Resepsi,2,Meja VIP 1\n" +
      "Ibu Siti Rahma,081987654321,KELUARGA,Akad & Resepsi,2,Meja Keluarga\n" +
      "Andi Pratama,085611223344,TEMAN,Resepsi Sesi 2,1,Meja 5\n" +
      "Dewi Anggraini,,UMUM,Resepsi Sesi 1,2,";
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_buku_tamu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const applyParsedRows = (rows: string[][], sourceExt: string) => {
    if (rows.length < 2) {
      setBulkError(`Berkas ${sourceExt} kosong atau hanya berisi baris judul.`);
      setParsedGuests([]);
      return;
    }

    const rawHeaders = rows[0].map((h) => (h || "").toLowerCase());

    let nameIdx = rawHeaders.findIndex((h) => h.includes("nama") || h.includes("name") || h.includes("tamu") || h.includes("guest"));
    const phoneIdx = rawHeaders.findIndex((h) => h.includes("hp") || h.includes("wa") || h.includes("telepon") || h.includes("phone") || h.includes("kontak"));
    const catIdx = rawHeaders.findIndex((h) => h.includes("kategori") || h.includes("category") || h.includes("tipe"));
    const sessionIdx = rawHeaders.findIndex((h) => h.includes("sesi") || h.includes("session") || h.includes("waktu"));
    const quotaIdx = rawHeaders.findIndex((h) => h.includes("kuota") || h.includes("quota") || h.includes("limit") || h.includes("pax") || h.includes("jumlah"));
    const tableIdx = rawHeaders.findIndex((h) => h.includes("meja") || h.includes("table"));

    if (nameIdx === -1) nameIdx = 0;

    const parsed: any[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      const name = cols[nameIdx]?.trim();
      if (!name) continue;

      let phone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].trim() : "";
      if (phone) {
        phone = phone.replace(/\D/g, "");
        if (phone.startsWith("0")) phone = "62" + phone.slice(1);
      }

      let category = catIdx !== -1 && cols[catIdx] ? cols[catIdx].trim().toUpperCase() : "UMUM";
      if (!["VIP", "KELUARGA", "TEMAN", "UMUM"].includes(category)) {
        category = "UMUM";
      }

      const sessionInfo = sessionIdx !== -1 && cols[sessionIdx] ? cols[sessionIdx].trim() : "";
      const guestQuota = quotaIdx !== -1 && cols[quotaIdx] ? parseInt(cols[quotaIdx], 10) || 2 : 2;
      const tableNumber = tableIdx !== -1 && cols[tableIdx] ? cols[tableIdx].trim() : "";

      parsed.push({
        name,
        phone: phone || null,
        category,
        sessionInfo,
        guestQuota,
        tableNumber: tableNumber || null,
      });
    }

    if (parsed.length === 0) {
      setBulkError(`Tidak ditemukan data nama tamu yang valid dalam berkas ${sourceExt} ini.`);
      setParsedGuests([]);
      return;
    }

    if (parsed.length > 500) {
      setBulkError(`Maksimal import adalah 500 tamu sekaligus. Berkas Anda memiliki ${parsed.length} tamu.`);
      setParsedGuests([]);
      return;
    }

    setParsedGuests(parsed);
    setBulkError(null);
  };

  const parseCsvText = (text: string) => {
    const lines = text
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      applyParsedRows([], "CSV");
      return;
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

    const splitRow = (row: string) => {
      const regex = new RegExp(`(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}]*))`, "g");
      const result: string[] = [];
      let match;
      while ((match = regex.exec(row)) !== null) {
        const val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
        result.push((val || "").trim());
        if (regex.lastIndex === row.length && row.endsWith(delimiter)) {
          result.push("");
          break;
        }
      }
      return result;
    };

    applyParsedRows(lines.map(splitRow), "CSV");
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isXlsx =
      lowerName.endsWith(".xlsx") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const isCsv =
      lowerName.endsWith(".csv") ||
      file.type === "text/csv" ||
      file.type === "application/vnd.ms-excel";

    if (!isXlsx && !isCsv) {
      setBulkError("Format berkas harus .xlsx (Excel) atau .csv.");
      return;
    }

    setBulkFileName(file.name);
    setBulkError(null);

    if (isXlsx) {
      try {
        const [{ parseXlsxRows }, buffer] = await Promise.all([
          import("@/lib/xlsxParser"),
          file.arrayBuffer(),
        ]);
        const rows = await parseXlsxRows(buffer);
        applyParsedRows(rows, "XLSX");
      } catch (err) {
        setParsedGuests([]);
        setBulkError(err instanceof Error ? err.message : "Gagal membaca berkas Excel (.xlsx).");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parseCsvText(content);
    };
    reader.onerror = () => {
      setBulkError("Gagal membaca isi berkas CSV.");
    };
    reader.readAsText(file);
  };

  const handleExecuteBulkImport = async () => {
    if (!invitationId || parsedGuests.length === 0) return;
    setIsBulkUploading(true);
    setBulkError(null);

    try {
      const res = await fetch("/api/client/guests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          guests: parsedGuests,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBulkSuccess(data.message || `Berhasil mengimpor ${parsedGuests.length} tamu.`);
        loadGuests(invitationId);
        setTimeout(() => {
          setShowBulkModal(false);
          setBulkSuccess(null);
          setParsedGuests([]);
          setBulkFileName("");
        }, 1500);
      } else {
        setBulkError(data.error || "Gagal mengimpor daftar tamu.");
      }
    } catch {
      setBulkError("Terjadi kesalahan jaringan saat mengimpor.");
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handlePickSingleContact = async () => {
    try {
      const props = ["name", "tel"];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);
      if (contacts && contacts.length > 0) {
        const c = contacts[0];
        const rawName = Array.isArray(c.name) ? c.name[0] : c.name;
        const cleanName = (rawName || "").trim();

        let rawTel = Array.isArray(c.tel) ? c.tel[0] : c.tel;
        let phone = "";
        if (rawTel) {
          phone = String(rawTel).replace(/\D/g, "");
          if (phone.startsWith("0")) phone = "62" + phone.slice(1);
        }

        setNewGuest((prev) => ({
          ...prev,
          name: cleanName || prev.name,
          phone: phone || prev.phone,
        }));
      }
    } catch {
      // User cancelled contact selection
    }
  };

  const handlePickMultipleContacts = async () => {
    try {
      const props = ["name", "tel"];
      const opts = { multiple: true };
      const contacts = await (navigator as any).contacts.select(props, opts);
      if (contacts && contacts.length > 0) {
        const mapped = contacts
          .map((c: any) => {
            const rawName = Array.isArray(c.name) ? c.name[0] : c.name;
            const cleanName = (rawName || "Tamu Undangan").trim();

            let rawTel = Array.isArray(c.tel) ? c.tel[0] : c.tel;
            let phone = "";
            if (rawTel) {
              phone = String(rawTel).replace(/\D/g, "");
              if (phone.startsWith("0")) phone = "62" + phone.slice(1);
            }

            return {
              name: cleanName,
              phone: phone || null,
              category: "UMUM",
              sessionInfo: "",
              guestQuota: 2,
              tableNumber: null,
            };
          })
          .filter((g: any) => Boolean(g.name));

        if (mapped.length > 0) {
          setParsedGuests(mapped);
          setBulkFileName(`Buku Kontak HP (${mapped.length} Kontak Terpilih)`);
          setBulkError(null);
          setBulkSuccess(null);
          setShowBulkModal(true);
        }
      }
    } catch {
      // User cancelled contact selection
    }
  };

  const loadGuests = (invId: string) => {
    setLoading(true);
    fetch(`/api/client/guests/${invId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data)) {
          setError(data?.error || "Gagal memuat daftar tamu");
        } else {
          setGuests(data as Guest[]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat daftar tamu");
        setLoading(false);
      });
  };

  // Load admin WA template dari AdminSetting via /api/public/settings
  useEffect(() => {
    fetch("/api/public/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.waTemplateMessage && data.waTemplateMessage.trim()) {
          setAdminWaTemplate(data.waTemplateMessage.trim());
        }
        if (Array.isArray(data.packages)) {
          setPlatformPackages(data.packages);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (ctxLoading) return;
    if (!activeInvitation) {
      setInvitationId("");
      setInvitationData(null);
      setGuests([]);
      setLoading(false);
      return;
    }

    setError(null);
    setInvitationId(activeInvitation.id);
    setInvitationData(activeInvitation);
    const feat: Record<string, any> = activeInvitation.featureSettings ?? {};
    setWaTemplate(feat.waTemplate || null);
    loadGuests(activeInvitation.id);
  }, [ctxLoading, activeInvitationId, activeInvitation]);

  const presets = waPresets(invitationData?.eventType);
  const defaultTemplate = adminWaTemplate || presets[0].text;
  const currentTemplate = waTemplate ?? defaultTemplate;

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationId || !newGuest.name.trim()) return;
    setAddError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/client/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, ...newGuest }),
      });
      if (res.ok) {
        setShowAddModal(false);
        loadGuests(invitationId);
        setNewGuest({
          name: "",
          phone: "",
          category: "UMUM",
          sessionInfo: "",
          guestLimit: 2,
          tableNumber: "",
        });
      } else {
        const data = await res.json().catch(() => null);
        setAddError(data?.error || "Gagal menambah tamu");
      }
    } catch {
      setAddError("Koneksi terputus. Periksa internet lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteGuest = async () => {
    if (!guestToDelete) return;
    const targetId = guestToDelete.id;
    setLoading(true);
    try {
      const res = await fetch(`/api/client/guests/${targetId}`, { method: "DELETE" });
      setGuestToDelete(null);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Gagal menghapus tamu");
        return;
      }
      loadGuests(invitationId);
    } catch {
      setError("Gagal menghapus tamu");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Checkbox Status (Auto-Save to DB)
  const toggleWaStatus = async (guestId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "SENT" ? "PENDING" : "SENT";

    // Optimistic state update
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, waStatus: nextStatus } : g))
    );

    const rollback = (message: string) => {
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, waStatus: currentStatus } : g))
      );
      setError(message);
    };

    try {
      const res = await fetch(`/api/client/guests/${guestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waStatus: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        rollback(data?.error || "Status kirim tamu gagal disimpan.");
      }
    } catch {
      rollback("Koneksi terputus. Status kirim tamu belum tersimpan.");
    }
  };

  // Save Custom WhatsApp Template Handler
  const handleSaveTemplate = async () => {
    if (!invitationId || savingTemplate) return;
    setSavingTemplate(true);
    setError(null);

    try {
      // PATCH, bukan PUT: PUT ditolak setelah undangan terbit (studio terkunci), padahal template dipakai setelah terbit.
      const res = await fetch(`/api/client/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureSettings: { waTemplate: currentTemplate.trim() } }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        setInvitationData((prev: any) => ({ ...prev, featureSettings: data?.featureSettings ?? prev?.featureSettings }));
        setTemplateSaveSuccess(true);
        setTimeout(() => setTemplateSaveSuccess(false), 3000);
      } else {
        feedback.notify(data?.error || "Gagal menyimpan template pesan WhatsApp", "error");
      }
    } catch {
      feedback.notify("Koneksi terputus. Template belum tersimpan.", "error");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Sesi bawaan teks WA bila tamu tidak diberi sesi: pernikahan "Akad & Resepsi", acara lain memakai nama sesi
  // jadwal terima tamu (mis. "Syukuran Khitanan").
  const defaultSessionInfo =
    !invitationData?.eventType || invitationData.eventType === "WEDDING"
      ? "Akad & Resepsi"
      : (getPrimaryEvent(invitationData.eventData) as { title?: string } | null)?.title || "Acara Utama";

  const renderWaText = (guestName: string, guestLimit: number = 2, sessionInfo: string = defaultSessionInfo) => {
    const isWedding = !invitationData?.eventType || invitationData.eventType === "WEDDING";
    const names = participantNames(invitationData?.eventType, invitationData?.participantsJson);
    const displayName = resolveInvitationDisplayName(invitationData);
    const groom = isWedding ? (names.first || "Mempelai Pria") : (names.first || displayName);
    const bride = isWedding ? (names.second || "Mempelai Wanita") : "";
    
    const feat: Record<string, any> = invitationData?.featureSettings ?? {};
    const displayOrder = feat.displayOrder || "GROOM_FIRST";
    const weddingCouple = displayOrder === "BRIDE_FIRST" ? `${bride} & ${groom}` : `${groom} & ${bride}`;
    const coupleName = isWedding ? weddingCouple : displayName;

    const isPublished = invitationData?.status === "PUBLISHED" || invitationData?.status === "EVENT_FINISHED";
    const resolved = isPublished
      ? resolveEffectiveInvitationUrl({
          customDomain: invitationData?.customDomain,
          subdomain: invitationData?.subdomain,
          guestSlug: guestName,
        })
      : { url: "" };

    // Jika belum dipublikasikan, jangan gunakan URL simulasi palsu
    const fullGuestUrl = isPublished && resolved.url
      ? resolved.url
      : "[Tautan resmi aktif otomatis setelah undangan dipublikasikan]";

    return currentTemplate
      // Format client: {nama_tamu}, {link_undangan}, dll
      .replace(/{nama_tamu}/g, guestName)
      .replace(/{link_undangan}/g, fullGuestUrl)
      .replace(/{nama_mempelai}/g, coupleName)
      .replace(/{kuota_tamu}/g, `${guestLimit} Pax`)
      .replace(/{sesi_acara}/g, sessionInfo)
      // Format admin: {{GUEST_NAME}}, {{INVITATION_URL}}, dll — agar template AdminSetting langsung bisa dirender
      .replace(/\{\{GUEST_NAME\}\}/g, guestName)
      .replace(/\{\{INVITATION_URL\}\}/g, fullGuestUrl)
      .replace(/\{\{COUPLE_NAMES\}\}/g, coupleName)
      .replace(/\{\{GROOM_NAME\}\}/g, groom)
      .replace(/\{\{BRIDE_NAME\}\}/g, bride)
      .replace(/\{\{GUEST_QUOTA\}\}/g, `${guestLimit} Pax`)
      .replace(/\{\{SESSION_INFO\}\}/g, sessionInfo);
  };

  const generateWaLink = (guest: Guest) => {
    const isPublished = invitationData?.status === "PUBLISHED" || invitationData?.status === "EVENT_FINISHED";
    if (!isPublished) return "";

    const renderedText = renderWaText(
      guest.name,
      guest.guestLimit || guest.guestQuota || 2,
      guest.sessionInfo || defaultSessionInfo
    );

    const text = encodeURIComponent(renderedText);
    let targetPhone = (guest.phone || "").replace(/\D/g, "");
    if (targetPhone.startsWith("0")) {
      targetPhone = "62" + targetPhone.slice(1);
    }
    if (targetPhone) {
      return `https://wa.me/${targetPhone}?text=${text}`;
    }
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const handleCopyGuestLink = (guest: Guest) => {
    const isPublished = invitationData?.status === "PUBLISHED" || invitationData?.status === "EVENT_FINISHED";
    if (!isPublished) return;

    const resolved = resolveEffectiveInvitationUrl({
      customDomain: invitationData?.customDomain,
      subdomain: invitationData?.subdomain,
      guestSlug: guest.name,
    });

    if (!resolved.url) return;

    navigator.clipboard.writeText(resolved.url).then(() => {
      setCopiedGuestId(guest.id);
      setTimeout(() => setCopiedGuestId(null), 2000);
    });
  };

  const insertVariableTag = (tag: string) => {
    setWaTemplate((prev) => (prev ?? defaultTemplate) + tag);
  };

  const filteredGuests = guests.filter((g) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "SENT" && g.waStatus === "SENT") ||
      (filterStatus === "PENDING" && g.waStatus !== "SENT") ||
      (filterStatus === "UNOPENED" && g.waStatus === "SENT" && !g.openedAt);

    const matchesCategory =
      filterCategory === "all" ||
      (g.category || "").toLowerCase() === filterCategory.toLowerCase();

    const matchesSearch =
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.phone && g.phone.includes(search));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const totalGuests = guests.length;
  const sentCount = guests.filter((g) => g.waStatus === "SENT").length;
  const pendingCount = totalGuests - sentCount;
  // WA sudah dikirim tetapi link belum dibuka: daftar yang perlu diingatkan ulang.
  const unopenedCount = guests.filter((g) => g.waStatus === "SENT" && !g.openedAt).length;

  const GUEST_STATUS_TABS = useMemo(() => [
    { id: "all", label: "Semua Tamu", count: totalGuests },
    { id: "SENT", label: "Sudah Terkirim", count: sentCount },
    { id: "PENDING", label: "Belum Dikirim", count: pendingCount },
    { id: "UNOPENED", label: "Belum Dibuka", count: unopenedCount },
  ], [totalGuests, sentCount, pendingCount, unopenedCount]);

  useEffect(() => {
    const idx = GUEST_STATUS_TABS.findIndex((t) => t.id === filterStatus);
    const el = tabRefs.current[idx];
    if (el) {
      setBeamStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [filterStatus, GUEST_STATUS_TABS]);

  const guestModalsCtx = {
    addError, adminWaTemplate, bulkError, bulkFileName, bulkSuccess, confirmDeleteGuest, currentTemplate, defaultSessionInfo, defaultTemplate, downloadCsvTemplate, guestToDelete, handleAddGuest, handleExecuteBulkImport, handleFileSelect, handlePickMultipleContacts, handlePickSingleContact, handleSaveTemplate, hasContactPicker, insertVariableTag, invitationData, isBulkUploading, loading, newGuest, parsedGuests, presets, renderWaText, savingTemplate, setAddError, setBulkError, setBulkFileName, setBulkSuccess, setGuestToDelete, setNewGuest, setParsedGuests, setShowAddModal, setShowBulkModal, setShowTemplateModal, setWaTemplate, showAddModal, showBulkModal, showTemplateModal, templateSaveSuccess,
  };

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 font-sans pb-20">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 sm:px-6 sm:py-3.5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <span className="hidden sm:block text-[10px] font-bold tracking-widest text-amber-800 uppercase">Manajemen Undangan</span>
          <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 sm:mt-0.5 leading-snug">
            <span className="sm:hidden">Buku Tamu</span>
            <span className="hidden sm:inline">Buku Tamu &amp; Pengiriman WhatsApp</span>
          </h1>
          <p className="hidden sm:block text-xs text-stone-500 mt-0.5">
            Kelola nama penerima undangan, checklist status pengiriman, dan sesuaikan template pesan WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Edit WhatsApp Template Button */}
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/80 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Template WA</span>
          </button>

          {/* Import CSV Button */}
          <button
            type="button"
            disabled={Boolean(invitationData?.isFreeDraft)}
            onClick={() => {
              if (invitationData?.isFreeDraft) return;
              setBulkError(null);
              setBulkSuccess(null);
              setParsedGuests([]);
              setBulkFileName("");
              setShowBulkModal(true);
            }}
            className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Impor CSV / Excel</span>
          </button>

          {/* Native Android Contact Picker Button (Progressive Enhancement) */}
          {hasContactPicker && (
            <button
              type="button"
              disabled={Boolean(invitationData?.isFreeDraft)}
              onClick={handlePickMultipleContacts}
              className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300/80 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Kontak HP</span>
            </button>
          )}

          {/* Add Guest Button */}
          <button
            type="button"
            disabled={Boolean(invitationData?.isFreeDraft)}
            onClick={() => {
              if (invitationData?.isFreeDraft) return;
              setShowAddModal(true);
            }}
            className="order-first sm:order-none w-full sm:w-auto px-4 py-3 sm:py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Tamu</span>
          </button>
        </div>
      </div>


      {/* Draft Status Notification */}
      {invitationData && invitationData.isFreeDraft ? (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex gap-3 items-start">
            <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="flex-1 min-w-0 text-xs">
              <h4 className="text-xs sm:text-sm font-bold text-amber-950">Buku Tamu Aktif Setelah Paket Dipilih</h4>
              <p className="text-[11px] text-amber-900/80 mt-1 leading-relaxed">
                Penambahan tamu, impor CSV/Excel, dan pengiriman link personal WhatsApp terbuka setelah paket undangan diaktifkan.
              </p>
            </div>
          </div>
          <a
            href="/packages"
            className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition shrink-0 text-center"
          >
            Aktifkan Paket
          </a>
        </div>
      ) : invitationData && invitationData.status === "DRAFT" && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex gap-3 shadow-xs items-start">
          <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 min-w-0 text-xs">
            <h4 className="text-xs sm:text-sm font-bold text-amber-950">Undangan belum terbit</h4>
            <p className="text-[11px] text-amber-900/80 mt-1 leading-relaxed">
              Kirim WhatsApp dan salin tautan tamu aktif setelah undangan diterbitkan di <a href="/dashboard/settings" className="font-bold underline hover:text-amber-950">Pengaturan</a>. Daftar tamu sudah bisa diisi sekarang.
            </p>
          </div>
        </div>
      )}

      {/* Portal Resepsionis & Check-In Meja Tamu (Hari H) */}
      {(() => {
        const plan = (invitationData?.order?.planType || invitationData?.planType || "TIER_1").toUpperCase();
        const pkg = platformPackages.find((p: any) => p.id === plan);
        const hasQrCheckin = pkg ? pkg.capabilities?.includes("qr_checkin") : (plan === "TIER_2" || plan === "TIER_3");
        if (!hasQrCheckin) return null;

        return (
          <div className="order-last sm:order-none bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950">Portal Resepsionis (Scanner Check-In Hari H)</h3>
                  <span className="text-[10px] font-mono font-bold bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-md">
                    PIN: {invitationData?.staffPin || "-"}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">
                  Buka di tablet/laptop petugas penerima tamu di pintu masuk untuk memindai tiket QR kehadiran tamu.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {invitationData?.status === "PUBLISHED" && invitationData?.subdomain ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/s/${invitationData.subdomain}/receptionist`;
                      navigator.clipboard.writeText(`Tautan Portal Resepsionis: ${url}\nPIN Akses: ${invitationData?.staffPin || ""}`);
                      feedback.notify("Tautan Scanner & PIN berhasil disalin untuk Panitia / WO.", "success");
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Salin Info WO</span>
                  </button>
                  <a
                    href={`/s/${invitationData.subdomain}/receptionist`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Buka Scanner</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </>
              ) : (
                <span className="text-[11px] text-stone-400 bg-white/80 border border-stone-200 px-3 py-1.5 rounded-lg font-medium">
                  Tersedia setelah Publish
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Quick Summary Counter Bar (Clickable Filter Cards); di HP angka yang sama sudah tampil di tab status */}
      <div className="hidden sm:grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={`p-4 rounded-2xl border transition text-left cursor-pointer flex items-center gap-3 ${
            filterStatus === "all"
              ? "bg-white border-stone-900 shadow-md ring-2 ring-stone-900/10"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
            filterStatus === "all" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Semua Tamu</span>
            <span className="text-sm sm:text-base font-bold text-stone-900">{totalGuests}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus("SENT")}
          className={`p-4 rounded-2xl border transition text-left cursor-pointer flex items-center gap-3 ${
            filterStatus === "SENT"
              ? "bg-emerald-50/80 border-emerald-700 shadow-md ring-2 ring-emerald-700/20"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
            filterStatus === "SENT" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700"
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Sudah Dikirim</span>
            <span className="text-sm sm:text-base font-bold text-emerald-700">{sentCount}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus("PENDING")}
          className={`p-4 rounded-2xl border transition text-left cursor-pointer flex items-center gap-3 ${
            filterStatus === "PENDING"
              ? "bg-amber-50/80 border-amber-700 shadow-md ring-2 ring-amber-700/20"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
            filterStatus === "PENDING" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-700"
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Belum Dikirim</span>
            <span className="text-sm sm:text-base font-bold text-amber-700">{pendingCount}</span>
          </div>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Borderless Glowing Beam Filter Toolbar (Status Tabs + Category Pills + Search) */}
      <div className="space-y-2 pt-1">
        
        {/* Status Tabs Header with Glowing Light Beam */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-1 relative">
          <div className="relative flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-1 scrollbar-none">
            {GUEST_STATUS_TABS.map((tab, idx) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[idx] = el; }}
                  type="button"
                  onClick={() => setFilterStatus(tab.id as any)}
                  className={`relative px-3 py-3 sm:py-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive ? "text-stone-900" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium transition-colors ${
                    isActive ? "bg-amber-100 text-amber-900" : "bg-stone-200/70 text-stone-600"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}

            {/* Animated Sliding Glowing Light Beam */}
            {beamStyle.width > 0 && (
              <>
                <span
                  className="absolute bottom-0 h-[2.5px] bg-gradient-to-r from-amber-700 via-amber-500 to-amber-600 rounded-full shadow-[0_1px_8px_rgba(217,119,6,0.6)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                  style={{ left: `${beamStyle.left}px`, width: `${beamStyle.width}px` }}
                />
                <span
                  className="absolute bottom-0 h-2 bg-amber-500/20 blur-xs rounded-full pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ left: `${beamStyle.left}px`, width: `${beamStyle.width}px` }}
                />
              </>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs pb-1 sm:pb-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau nomor HP..."
              className="w-full pl-9 pr-3 py-2.5 sm:py-2 bg-white border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30 shadow-2xs"
            />
            <svg className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Pills (Clean Minimalist Badges) */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1 scrollbar-none">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 shrink-0">Kategori:</span>
          {[
            { id: "all", label: "Semua Kategori" },
            { id: "vip", label: "VIP" },
            { id: "keluarga", label: "Keluarga" },
            { id: "teman", label: "Teman" },
            { id: "umum", label: "Umum" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-2.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                filterCategory === tab.id
                  ? "bg-amber-100/80 text-amber-900 border border-amber-300/80 font-bold shadow-2xs"
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* HIGH-DENSITY EFFICIENT LIST TABLE */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">
          Memuat daftar tamu undangan...
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-stone-700">Belum ada tamu yang terdaftar</p>
          <p className="text-xs text-stone-400">Klik tombol &ldquo;Tambah Tamu&rdquo; untuk mulai memasukkan daftar undangan Anda</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Tambah Tamu Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid md:grid-cols-12 gap-3 px-5 py-3 bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider items-center">
            <div className="col-span-1 text-center">Terkirim</div>
            <div className="col-span-4">Nama Tamu &amp; Kontak</div>
            <div className="col-span-2">Kategori</div>
            <div className="col-span-2">Kuota &amp; Sesi</div>
            <div className="col-span-3 text-right">Aksi Pengiriman</div>
          </div>

          {/* Table Body (High Density List Rows) */}
          <div className="divide-y divide-stone-100">
            {filteredGuests.map((guest) => {
              const isPublished = invitationData?.status === "PUBLISHED" || invitationData?.status === "EVENT_FINISHED";
              const waUrl = isPublished ? generateWaLink(guest) : "";
              const isSent = guest.waStatus === "SENT";

              return (
                <div
                  key={guest.id}
                  className={`p-3 sm:px-5 sm:py-3.5 transition flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-3 md:items-center ${
                    isSent ? "bg-emerald-50/20 hover:bg-emerald-50/40" : "hover:bg-stone-50/80"
                  }`}
                >
                  
                  {/* Row 1 di Mobile / Col 1-4 di Desktop: Checkbox, Nama Tamu, Kategori & Index */}
                  <div className="flex items-center justify-between md:col-span-5 gap-2 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSent}
                        onChange={() => toggleWaStatus(guest.id, guest.waStatus)}
                        className="w-4 h-4 text-emerald-700 rounded border-stone-300 focus:ring-emerald-700 cursor-pointer shrink-0"
                        title={isSent ? "Undangan sudah dikirim" : "Centang jika sudah dikirim"}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 line-clamp-2 break-words">{guest.name}</h4>
                        <span className="text-[11px] text-stone-500 font-mono truncate block md:hidden">
                          {guest.phone || "Tanpa No. WhatsApp"} · {guest.guestQuota || guest.guestLimit || 1} Pax
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                        (guest.category || "").toUpperCase() === "VIP"
                          ? "bg-amber-100 text-amber-900 border border-amber-300/60"
                          : (guest.category || "").toUpperCase() === "KELUARGA"
                          ? "bg-purple-100 text-purple-900 border border-purple-300/60"
                          : (guest.category || "").toUpperCase() === "TEMAN"
                          ? "bg-blue-100 text-blue-900 border border-blue-300/60"
                          : "bg-stone-100 text-stone-700 border border-stone-200"
                      }`}>
                        {guest.category || "UMUM"}
                      </span>
                      {guest.tableNumber && (
                        <span className="md:hidden text-[10px] text-stone-600 font-semibold">
                          {/^\d+$/.test(guest.tableNumber.trim()) ? `Meja ${guest.tableNumber.trim()}` : guest.tableNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${RSVP_DOT[rsvpOf(guest)?.state ?? "none"]}`} />
                        {rsvpOf(guest)?.label ?? "Belum menjawab"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${guest.isTokenRedeemed ? "bg-emerald-600" : "bg-stone-300"}`} />
                        {guest.isTokenRedeemed ? "Sudah check-in" : "Belum check-in"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${guest.openedAt ? "bg-sky-600" : "bg-stone-300"}`} />
                        {guest.openedAt
                          ? `Dibuka ${new Date(guest.openedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                          : "Belum membuka"}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Only: Kontak & Kategori */}
                  <div className="hidden md:block md:col-span-2 text-xs text-stone-600 font-mono truncate">
                    {guest.phone || "Tanpa No. WhatsApp"}
                  </div>

                  {/* Desktop Only: Kuota & Sesi */}
                  <div className="hidden md:block md:col-span-2 text-xs text-stone-600">
                    <span className="font-semibold text-stone-900">{guest.guestQuota || guest.guestLimit || 1} Pax</span>
                    <span className="text-stone-400 mx-1">·</span>
                    <span className="text-[11px] text-stone-500">{guest.sessionInfo || "Reguler"}</span>
                    {guest.tableNumber && (
                      <span className="block text-[11px] text-stone-500">{guest.tableNumber}</span>
                    )}
                  </div>

                  {/* Column 5 / Row 2 di Mobile: Action Buttons */}
                  <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-1.5 pt-1.5 md:pt-0 border-t md:border-0 border-stone-100">
                    <span className="md:hidden text-[10px] font-semibold text-stone-500">
                      {isSent ? "✓ Terkirim" : "Belum Kirim"}
                    </span>
                    <div className="flex items-center gap-1.5">
                    
                    {/* Copy Link Button */}
                    <div className={`relative group flex items-center ${!isPublished ? "cursor-not-allowed" : ""}`}>
                      <button
                        type="button"
                        onClick={() => handleCopyGuestLink(guest)}
                        disabled={!isPublished}
                        className={`px-3 py-2 min-h-[36px] sm:min-h-[32px] sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 touch-manipulation ${
                          isPublished
                            ? "bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer active:scale-95"
                            : "bg-stone-100/60 text-stone-400 border border-stone-200/50 select-none pointer-events-none"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>{copiedGuestId === guest.id ? "Tersalin!" : "Salin"}</span>
                      </button>

                      {/* Tooltip Melayang saat Draft (Opsi 2) */}
                      {!isPublished && (
                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-end z-30 transition-all duration-150">
                          <div className="bg-stone-900/95 text-stone-200 text-[10px] font-medium px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-stone-700/60 flex items-center gap-1.5 backdrop-blur-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                            <span>Tautan aktif setelah undangan dipublikasikan</span>
                          </div>
                          <div className="w-2 h-2 bg-stone-900/95 rotate-45 mr-4 -mt-1 border-r border-b border-stone-700/60"></div>
                        </div>
                      )}
                    </div>

                    {/* Send WhatsApp Button */}
                    {isPublished ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (!isSent) toggleWaStatus(guest.id, guest.waStatus);
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Buka WhatsApp untuk Mengirim Undangan"
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Kirim WA</span>
                      </a>
                    ) : (
                      <div className="relative group flex items-center cursor-not-allowed">
                        <button
                          type="button"
                          disabled
                          className="px-3 py-1.5 bg-stone-100 text-stone-400 border border-stone-200/60 rounded-lg text-xs font-medium flex items-center gap-1.5 pointer-events-none select-none"
                        >
                          <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Kirim WA</span>
                        </button>

                        {/* Tooltip Melayang saat Draft (Opsi 2) */}
                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-end z-30 transition-all duration-150">
                          <div className="bg-stone-900/95 text-stone-200 text-[10px] font-medium px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-stone-700/60 flex items-center gap-1.5 backdrop-blur-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                            <span>Publikasikan undangan di Pengaturan untuk mengaktifkan pengiriman</span>
                          </div>
                          <div className="w-2 h-2 bg-stone-900/95 rotate-45 mr-5 -mt-1 border-r border-b border-stone-700/60"></div>
                        </div>
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setGuestToDelete({ id: guest.id, name: guest.name })}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Tamu"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      <GuestPageModals ctx={guestModalsCtx} />
    </div>
  );
}