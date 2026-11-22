"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getInvitationPublicUrl, getApexRootDomain, resolveEffectiveInvitationUrl } from "@/lib/domainUtils";
import {
  computeLifecycleDates,
  formatDateInEventTimezone,
  formatPrimaryEventDate,
  getPrimaryEvent,
  getPrimaryEventTimezone,
  lifecycleSettingsFromPublic,
  type LifecycleDaySettings,
} from "@/lib/lifecycleDates";
import { getPlanDisplayName } from "@/lib/planUtils";
import { resolveInvitationDisplayName, STAFF_PIN_PATTERN, eventNoun } from "@/lib/invitationUtils";
import { primaryPhotoSlotForEvent } from "@/lib/mediaSlots";
import { isSlotUsed, parseThemeMediaSlots } from "@/lib/themeMediaSlots";
import { participantNames, safeParseParticipants } from "@/lib/participantUtils";
import { useFeedback } from "@/components/ui/Feedback";
import { useClientInvitation } from "@/components/client/ClientInvitationContext";
import { AccountPasswordCard } from "@/components/client/AccountPasswordCard";
import { PublishLaunchpadSection } from "@/components/client/settings/PublishLaunchpadSection";
import { TechnicalSettingsSection } from "@/components/client/settings/TechnicalSettingsSection";
export default function SettingsPage() {
  const feedback = useFeedback();
  const router = useRouter();
  const { activeInvitation, activeInvitationId, loading: ctxLoading } = useClientInvitation();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingSec, setSavingSec] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subdomain Availability Check State
  const [subdomainStatus, setSubdomainStatus] = useState<{
    state: "idle" | "checking" | "available" | "unavailable" | "error";
    message: string;
  }>({ state: "idle", message: "" });

  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    subdomain: false,
    staffPin: false,
  });

  // Hero Launchpad & Sequential Audit State Machine
  const [launchStage, setLaunchStage] = useState<
    "IDLE" | "SCANNING" | "HALT_MANDATORY" | "REVIEW_OPTIONAL" | "READY_ALL" | "PUBLISHING" | "SUCCESS"
  >("IDLE");
  const [activeScanIndex, setActiveScanIndex] = useState(0);
  const [haltReasons, setHaltReasons] = useState<string[]>([]);
  const [emptyOptionals, setEmptyOptionals] = useState<string[]>([]);
  const [copiedOfficialUrl, setCopiedOfficialUrl] = useState(false);
  const [isInitiatingScan, setIsInitiatingScan] = useState(false);
  const [isReturningToIdle, setIsReturningToIdle] = useState(false);
  const [finalReviewChecks, setFinalReviewChecks] = useState<Record<string, boolean>>({});
  const [copiedReviewKey, setCopiedReviewKey] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    subdomain: "",
    status: "DRAFT",
    staffPin: "",
  });

  // Custom Domain State
  const [customDomain, setCustomDomain] = useState("");
  const [savingCustomDomain, setSavingCustomDomain] = useState(false);
  const [customDomainSuccess, setCustomDomainSuccess] = useState(false);
  const [customDomainError, setCustomDomainError] = useState<string | null>(null);
  const [showDnsGuide, setShowDnsGuide] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const [cnameTarget, setCnameTarget] = useState("");
  const [serverPublicIp, setServerPublicIp] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDomainOwned, setIsDomainOwned] = useState(false);
  const [isCustomDomainEnabled, setIsCustomDomainEnabled] = useState(true);
  const [lifecycleSettings, setLifecycleSettings] = useState<LifecycleDaySettings>(lifecycleSettingsFromPublic(null));
  const [platformPackages, setPlatformPackages] = useState<any[]>([]);

  const handleCopyDns = async (val: string, key: string) => {
    if (!val) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(val);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = val;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Graceful fallback
    }
  };

  // Real-time Subdomain Availability Checker
  useEffect(() => {
    if (!formData.subdomain || !invitation?.id) {
      setSubdomainStatus({ state: "idle", message: "" });
      return;
    }

    const clean = formData.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) {
      setSubdomainStatus({
        state: "unavailable",
        message: "Subdomain minimal terdiri dari 3 karakter.",
      });
      return;
    }

    setSubdomainStatus({ state: "checking", message: "Memeriksa ketersediaan..." });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/client/subdomain/check?subdomain=${encodeURIComponent(clean)}&invitationId=${invitation.id}`
        );
        const data = await res.json();
        if (data.available) {
          setSubdomainStatus({
            state: "available",
            message: data.message || "Subdomain tersedia dan dapat digunakan!",
          });
        } else {
          setSubdomainStatus({
            state: "unavailable",
            message: data.message || "Subdomain sudah digunakan pasangan lain.",
          });
        }
      } catch {
        setSubdomainStatus({
          state: "error",
          message: "Gagal memeriksa ketersediaan subdomain.",
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.subdomain, invitation?.id]);

  const toggleEdit = (key: string) => {
    setEditMode((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getFeatureToggle = (inv: any, key: string, defaultValue: boolean = true): boolean => {
    const value = inv?.featureSettings?.[key];
    return value !== undefined ? Boolean(value) : defaultValue;
  };

  const evaluateRule = (rule: any, inv: any, form: any): "PASSED" | "DISABLED" | "FAILED" => {
    if (rule.hasToggle && !rule.isToggledOn(inv)) {
      return "DISABLED";
    }
    return rule.hasData(inv, form) ? "PASSED" : "FAILED";
  };

  const checkMediaSlot = (inv: any, slot: string): boolean => {
    try {
      if (inv?.mediaMap && inv.mediaMap[slot] && String(inv.mediaMap[slot]).trim()) return true;
      if (Array.isArray(inv?.media) && inv.media.some((m: any) => m.mediaSlot === slot && m.localPath && String(m.localPath).trim())) return true;
      return false;
    } catch {
      return false;
    }
  };

  const checkHasQrCheckin = (inv: any): boolean => {
    const plan = (inv?.order?.planType || inv?.planType || "TIER_1").toUpperCase();
    const pkg = platformPackages.find((p: any) => p.id === plan);
    const caps: string[] = pkg?.capabilities || (plan === "TIER_3" ? ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"] : plan === "TIER_2" ? ["music", "gallery", "qr_checkin", "guest_memories"] : ["music", "gallery"]);
    return caps.includes("qr_checkin");
  };

  const isWeddingEvent = !invitation?.eventType || invitation.eventType === "WEDDING";
  const isEventMode = invitation?.eventType === "EVENT";
  const eventNounLabel = eventNoun(invitation?.eventType);
  const declaredSlotsOf = (inv: any) =>
    parseThemeMediaSlots(inv?.themeMediaSlots ?? inv?.theme?.mediaSlots);

  const AUDIT_RULES = [
    {
      id: "subdomain",
      title: "Alamat Tautan Subdomain",
      desc: "Tautan website unik untuk akses publik",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any, form: any) => Boolean((form.subdomain || inv?.subdomain)?.trim()),
      missingMessage: "Alamat subdomain belum ditentukan. Harap tentukan nama subdomain Anda pada kartu pengaturan di bawah.",
    },
    {
      id: "theme",
      title: "Desain Tema Undangan",
      desc: "Template visual & tata letak presentasi",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) => Boolean(inv?.themeId),
      missingMessage: "Desain tema belum dipilih. Silakan pilih tema undangan terlebih dahulu melalui menu Edit Undangan (Seksi 1).",
    },
    {
      id: "coverVisuals",
      title: "Visual Sampul",
      // Sidebar desktop, latar global, dan foto penutup memakai bawaan tema bila kosong (Studio Seksi 2), jadi tidak wajib.
      desc: "Sampul pop-up undangan (Seksi 2)",
      hasToggle: true,
      isToggledOn: (inv: any) => isSlotUsed(declaredSlotsOf(inv), "LANDING_COVER"),
      hasData: (inv: any) => checkMediaSlot(inv, "LANDING_COVER"),
      missingMessage: "Sampul pop-up / cover belum diunggah. Harap unggah di Edit Undangan (Seksi 2).",
    },
    {
      id: "couples",
      title: "Profil Lengkap Utama",
      desc: isWeddingEvent ? "Nama lengkap kedua mempelai" : "Nama tokoh utama atau judul acara",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) => {
        if (inv?.eventType && inv.eventType !== "WEDDING") {
          return Boolean(participantNames(inv.eventType, inv.participantsJson).full);
        }
        const p = safeParseParticipants(inv?.participantsJson);
        return Boolean(String(p.groom?.name ?? "").trim() && String(p.bride?.name ?? "").trim());
      },
      missingMessage: "Profil utama belum diisi dengan benar. Harap lengkapi nama profil di Edit Undangan (Seksi 3).",
    },
    {
      id: "couplePhotos",
      title: "Foto Profil Utama",
      desc: "Foto portrait profil acara (Seksi 3)",
      hasToggle: true,
      isToggledOn: (inv: any) => {
        const slots = declaredSlotsOf(inv);
        if (inv?.eventType && inv.eventType !== "WEDDING") {
          return isSlotUsed(slots, primaryPhotoSlotForEvent(inv.eventType));
        }
        return isSlotUsed(slots, "GROOM_PHOTO") || isSlotUsed(slots, "BRIDE_PHOTO");
      },
      hasData: (inv: any) => {
        const slots = declaredSlotsOf(inv);
        if (inv?.eventType && inv.eventType !== "WEDDING") {
          const primarySlot = primaryPhotoSlotForEvent(inv.eventType);
          if (!isSlotUsed(slots, primarySlot)) return true;
          return checkMediaSlot(inv, primarySlot);
        }
        const needGroom = isSlotUsed(slots, "GROOM_PHOTO");
        const needBride = isSlotUsed(slots, "BRIDE_PHOTO");
        return (!needGroom || checkMediaSlot(inv, "GROOM_PHOTO")) && (!needBride || checkMediaSlot(inv, "BRIDE_PHOTO"));
      },
      getMissingMessage: (inv: any) => {
        if (inv?.eventType && inv.eventType !== "WEDDING") {
          return inv.eventType === "EVENT"
            ? "Foto / visual utama acara belum diunggah. Harap unggah di Edit Undangan (Seksi 3)."
            : "Foto profil utama belum diunggah. Harap unggah foto di Edit Undangan (Seksi 3).";
        }
        const slots = declaredSlotsOf(inv);
        const groomMissing = isSlotUsed(slots, "GROOM_PHOTO") && !checkMediaSlot(inv, "GROOM_PHOTO");
        const brideMissing = isSlotUsed(slots, "BRIDE_PHOTO") && !checkMediaSlot(inv, "BRIDE_PHOTO");
        if (groomMissing && brideMissing) {
          return "Foto kedua mempelai (Pria & Wanita) belum diunggah. Harap unggah foto mempelai atau gambar pilihan di Edit Undangan (Seksi 3).";
        }
        if (groomMissing) {
          return "Foto Mempelai Pria belum diunggah. Harap unggah foto mempelai pria di Edit Undangan (Seksi 3).";
        }
        return "Foto Mempelai Wanita belum diunggah. Harap unggah foto mempelai wanita di Edit Undangan (Seksi 3).";
      },
      missingMessage: "Foto profil belum lengkap diunggah. Harap unggah foto di Edit Undangan (Seksi 3).",
    },
    {
      id: "eventDate",
      title: "Tanggal Jadwal Terima Tamu",
      desc: "Tanggal tamu datang: patokan masa aktif & hitung mundur",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) => getPrimaryEvent(inv?.eventData) !== null,
      missingMessage: "Tanggal sesi Jadwal Terima Tamu belum diisi. Isi tanggalnya di Edit Undangan (seksi Acara); tanggal ini menjadi patokan masa aktif dan hitung mundur.",
    },
    {
      id: "location",
      title: "Tempat Jadwal Terima Tamu",
      desc: "Nama tempat tamu datang",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) => Boolean((getPrimaryEvent(inv?.eventData) as { location?: string } | null)?.location),
      missingMessage: "Nama tempat pada sesi Jadwal Terima Tamu belum diisi. Harap lengkapi di Edit Undangan (seksi Acara).",
    },
    {
      id: "pin",
      title: "PIN Keamanan Meja Tamu",
      desc: "Sandi petugas resepsionis & check-in QR",
      hasToggle: true,
      isToggledOn: (inv: any) => checkHasQrCheckin(inv),
      hasData: (inv: any, form: any) => STAFF_PIN_PATTERN.test(String(form.staffPin || inv?.staffPin || "")),
      missingMessage: "PIN Keamanan Panitia (4–10 huruf/angka) belum diatur. Harap atur PIN pada kartu pengaturan di bawah.",
    },
    {
      id: "gallery",
      title: "Galeri Foto & Album Media",
      desc: isWeddingEvent ? "Foto pre-wedding dan album kenangan" : "Foto dokumentasi dan album kenangan",
      hasToggle: true,
      isToggledOn: (inv: any) => getFeatureToggle(inv, "showGallery", true),
      hasData: (inv: any) => {
        if (Array.isArray(inv?.media) && inv.media.some((m: any) => m.mediaSlot === "GALLERY")) return true;
        const f = inv?.featureSettings;
        if (Array.isArray(f?.galleryPhotos) && f.galleryPhotos.length > 0) return true;
        if (typeof f?.galleryPhotosList === "string" && f.galleryPhotosList.trim()) return true;
        return typeof f?.galleryDriveFolderUrl === "string" && f.galleryDriveFolderUrl.trim() !== "";
      },
      missingMessage: "Seksi Galeri Foto dalam status aktif, namun belum ada foto yang diunggah. Silakan unggah foto di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan.",
    },
    {
      id: "story",
      title: isWeddingEvent
        ? "Cerita Kisah Kasih (Love Story)"
        : isEventMode
          ? "Riwayat & Tonggak Acara"
          : "Kisah & Perjalanan",
      desc: isWeddingEvent
        ? "Perjalanan cinta kedua mempelai"
        : isEventMode
          ? "Rangkaian perjalanan & pencapaian acara"
          : "Perjalanan hidup & momen berharga",
      hasToggle: true,
      isToggledOn: (inv: any) => getFeatureToggle(inv, "showStory", !inv?.eventType || inv.eventType === "WEDDING"),
      hasData: (inv: any) =>
        Array.isArray(inv?.loveStory) && inv.loveStory.some((s: any) => s?.title?.trim() || s?.content?.trim()),
      missingMessage: isWeddingEvent
        ? "Seksi Cerita Kisah Kasih dalam status aktif, namun belum ada cerita yang diisi. Silakan tulis kisah cinta di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan."
        : "Seksi Cerita & Perjalanan dalam status aktif, namun belum ada babak cerita yang diisi. Silakan tulis di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan.",
    },
    {
      id: "bank",
      title: "Rekening & Hadiah Digital",
      desc: "Nomor rekening atau amplop digital",
      hasToggle: true,
      isToggledOn: (inv: any) => getFeatureToggle(inv, "showGift", true),
      // Kunci rekening sama dengan yang ditulis editor studio: { bank, number, name }.
      hasData: (inv: any) =>
        Boolean(inv?.featureSettings?.qrisImageUrl) ||
        Boolean(inv?.shippingAddress?.trim()) ||
        (Array.isArray(inv?.bankAccounts) && inv.bankAccounts.some((b: any) => b?.number?.trim())),
      missingMessage: "Seksi Rekening & Hadiah Digital dalam status aktif, namun belum ada rekening atau amplop digital yang diisi. Silakan lengkapi di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan.",
    },
    {
      id: "music",
      title: "Musik Latar Pengiring",
      desc: "Lagu pengiring saat undangan dibuka",
      hasToggle: true,
      isToggledOn: (inv: any) => getFeatureToggle(inv, "showMusic", true),
      hasData: (inv: any) => Boolean(inv?.musicUrl && inv.musicUrl.trim()),
      missingMessage: "Seksi Musik Latar Pengiring dalam status aktif, namun lagu belum dipilih. Silakan pasang musik di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan.",
    },
  ];

  useEffect(() => {
    if (ctxLoading) return;
    if (!activeInvitation) {
      setInvitation(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setInvitation(activeInvitation);
    setCustomDomain(activeInvitation.customDomain || "");
    setLaunchStage("IDLE");

    const loadDetail = async () => {
      let currentPin = activeInvitation.staffPin || "";
      let detailLoaded = activeInvitation;
      if (activeInvitation.id) {
        try {
          const detailRes = await fetch(`/api/client/invitations/${activeInvitation.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            currentPin = detail.staffPin || currentPin;
            detailLoaded = detail;
          }
        } catch {
          // Detail gagal dimuat: halaman tetap memakai data dasar dari daftar undangan.
        }
      }
      if (cancelled) return;
      setInvitation(detailLoaded);
      setCustomDomain(detailLoaded.customDomain || "");
      setFormData({
        subdomain: detailLoaded.subdomain || "",
        status: detailLoaded.status || "DRAFT",
        staffPin: currentPin,
      });
      setLoading(false);
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [ctxLoading, activeInvitationId, activeInvitation]);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.platformName) setPlatformName(d.platformName);
        if (d?.cnameTarget || d?.cname_target) setCnameTarget(d.cnameTarget || d.cname_target);
        if (d?.serverPublicIp || d?.server_public_ip) setServerPublicIp(d.serverPublicIp || d.server_public_ip);
        if (d?.custom_domain_enabled !== undefined) {
          setIsCustomDomainEnabled(d.custom_domain_enabled !== false);
        }
        setLifecycleSettings(lifecycleSettingsFromPublic(d));
        if (Array.isArray(d?.packages)) {
          setPlatformPackages(d.packages);
        }
      })
      .catch(() => {});
  }, []);

  // Memulai proses audit sekuensial dengan transisi elegan
  const startSequentialAudit = () => {
    setIsInitiatingScan(true);
    setTimeout(() => {
      setLaunchStage("SCANNING");
      setIsInitiatingScan(false);
      setActiveScanIndex(0);
      setHaltReasons([]);
      setEmptyOptionals([]);
      setFinalReviewChecks({});

      let step = 0;
      const interval = setInterval(() => {
        step++;
        setActiveScanIndex(step);

        if (step >= AUDIT_RULES.length) {
          clearInterval(interval);
          setTimeout(() => {
            const failedRules = AUDIT_RULES.filter(
              (r) => evaluateRule(r, invitation, formData) === "FAILED"
            );

            if (failedRules.length > 0) {
              setHaltReasons(
                failedRules.map((rule) =>
                  typeof (rule as any).getMissingMessage === "function"
                    ? (rule as any).getMissingMessage(invitation)
                    : rule.missingMessage
                )
              );
              setLaunchStage("HALT_MANDATORY");
            } else {
              setLaunchStage("READY_ALL");
            }
          }, 500);
        }
      }, 450);
    }, 240);
  };

  const cancelAudit = () => {
    setIsReturningToIdle(true);
    setTimeout(() => {
      setLaunchStage("IDLE");
      setIsReturningToIdle(false);
      setHaltReasons([]);
      setEmptyOptionals([]);
      setFinalReviewChecks({});
    }, 200);
  };

  const executePublish = async () => {
    if (!invitation?.id || savingSec) return;
    if (invitation.isFreeDraft) {
      setLaunchStage("IDLE");
      setErrorMsg("Draf gratis tidak dapat dipublikasikan sebelum paket diaktifkan. Silakan pilih paket terlebih dahulu.");
      return;
    }
    setLaunchStage("PUBLISHING");
    setSavingSec("status");
    setErrorMsg(null);

    try {
      // Hanya status & subdomain: mengirim ulang snapshot halaman akan menimpa suntingan Studio yang lebih baru.
      const payload = {
        subdomain: formData.subdomain ? formData.subdomain.trim().toLowerCase() : null,
        status: "PUBLISHED",
      };

      const res = await fetch(`/api/client/invitations/${invitation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json();
        setInvitation((prev: any) => ({ ...prev, ...savedData, status: "PUBLISHED" }));
        setFormData((prev) => ({ ...prev, status: "PUBLISHED" }));
        setLaunchStage("SUCCESS");
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mempublikasikan undangan.");
      }
    } catch (err: any) {
      setLaunchStage("IDLE");
      setErrorMsg(err.message || "Terjadi kesalahan saat mempublikasikan undangan.");
    } finally {
      setSavingSec(null);
    }
  };

  const isStaffPinValid = STAFF_PIN_PATTERN.test(formData.staffPin.trim());

  // Penyimpanan Bagian Formulir Mandiri (Subdomain & Staff PIN)
  const handleSaveSection = async (secKey: string) => {
    if (!invitation?.id || savingSec) return;
    setSavingSec(secKey);
    setErrorMsg(null);

    try {
      let payload: any = {};
      if (secKey === "subdomain") {
        payload = { subdomain: formData.subdomain ? formData.subdomain.trim().toLowerCase() : null };
      } else if (secKey === "staffPin") {
        payload = { staffPin: formData.staffPin.trim() };
      }

      // PIN punya endpoint sendiri agar tetap dapat diganti setelah undangan terbit (studio terkunci).
      const endpoint = secKey === "staffPin"
        ? `/api/client/invitations/${invitation.id}/staff-pin`
        : `/api/client/invitations/${invitation.id}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json();
        setInvitation((prev: any) => ({ ...prev, ...savedData }));
        if (savedData.staffPin !== undefined) {
          setFormData((prev) => ({ ...prev, staffPin: savedData.staffPin || "" }));
        }
        if (savedData.subdomain !== undefined) {
          setFormData((prev) => ({ ...prev, subdomain: savedData.subdomain || "" }));
        }
        setEditMode((prev) => ({ ...prev, [secKey]: false }));
        setSaveSuccess((prev) => ({ ...prev, [secKey]: true }));
        setTimeout(() => {
          setSaveSuccess((prev) => ({ ...prev, [secKey]: false }));
        }, 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMsg(errJson.error || "Gagal memperbarui pengaturan");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan pengaturan");
    } finally {
      setSavingSec(null);
    }
  };

  const handleCopyReviewUrl = async (url: string, key: string) => {
    if (!url) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedReviewKey(key);
      setTimeout(() => setCopiedReviewKey(null), 2000);
    } catch {}
  };

  const getCanonicalUrl = (slug?: string) => {
    if (!slug) return "";
    if (typeof window !== "undefined") {
      const { protocol, hostname, port } = window.location;
      if (hostname === "localhost" || hostname.endsWith(".localhost")) {
        return `${protocol}//localhost${port ? `:${port}` : ""}/${slug}`;
      }
      return `${protocol}//${getApexRootDomain()}/${slug}`;
    }
    return `https://${getApexRootDomain()}/${slug}`;
  };

  const resolvedUrlInfo = resolveEffectiveInvitationUrl({
    customDomain: invitation?.customDomain,
    subdomain: formData.subdomain || invitation?.subdomain,
  });
  const officialUrl = resolvedUrlInfo.url || getInvitationPublicUrl(formData.subdomain || invitation?.subdomain || "");

  const currentSub = formData.subdomain || invitation?.subdomain || "";
  const currentSlug = invitation?.invitationSlug || "";
  const hasCustomDomain = Boolean(invitation?.customDomain);
  const normalizedStatus = (formData.status || invitation?.status || "DRAFT").toUpperCase();
  const previewQuery = `preview=${invitation?.previewToken || "true"}`;

  const canonicalUrl = getCanonicalUrl(currentSlug);
  const subdomainUrl = getInvitationPublicUrl(currentSub);
  const guestSampleUrl = getInvitationPublicUrl(currentSub, "Nama Tamu");
  const receptionistUrl = subdomainUrl ? `${subdomainUrl.replace(/\/$/, "")}/receptionist` : "";
  const welcomeUrl = subdomainUrl ? `${subdomainUrl.replace(/\/$/, "")}/welcome` : "";
  const memoriesUrl = subdomainUrl ? `${subdomainUrl.replace(/\/$/, "")}/memories` : "";
  const shareMomentUrl = subdomainUrl ? `${subdomainUrl.replace(/\/$/, "")}/sharemoment` : "";
  const planType = (invitation?.order?.planType || invitation?.planType || "TIER_1").toUpperCase();
  const currentPkg = platformPackages.find((p: any) => p.id === planType);
  const allowedCaps: string[] = currentPkg?.capabilities || (planType === "TIER_3" ? ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"] : planType === "TIER_2" ? ["music", "gallery", "qr_checkin", "guest_memories"] : ["music", "gallery"]);
  const hasQrCheckin = allowedCaps.includes("qr_checkin");
  const hasGuestMemories = allowedCaps.includes("guest_memories");
  const canUseCustomDomain = allowedCaps.includes("custom_domain");
  const tier3Name = getPlanDisplayName("TIER_3", platformPackages);

  const reviewItems: any[] = [
    {
      id: "canonical",
      badge: "Pintu Utama / URL Asli",
      title: "Pintu Utama Website Undangan (Single Source of Truth)",
      desc: "Tautan utama berbasis slug resmi. Tetap aktif setelah masa subdomain berakhir, selama undangan masih tersimpan.",
      url: canonicalUrl,
      checkLabel: "Saya telah memverifikasi URL Asli / Pintu Utama permanen ini dapat diakses dengan sempurna.",
    },
    {
      id: "subdomain",
      badge: "Subdomain Eksklusif",
      title: "Alamat Tautan Publik Resmi",
      desc: "Alamat branding ringkas dan prestisius untuk disebarkan ke publik, kartu fisik, souvenir, dan bio media sosial.",
      url: subdomainUrl,
      checkLabel: "Saya telah memeriksa nama subdomain sudah benar dan siap mengudara.",
    },
    {
      id: "guest",
      badge: "Simulasi Tautan Tamu",
      title: "Pratinjau Undangan Personal Tamu",
      desc: "Tautan khusus yang otomatis merender nama tamu di sampul tema dan menghasilkan QR Code tiket kehadiran.",
      url: guestSampleUrl,
      checkLabel: "Saya telah menguji bahwa nama tamu tampil dengan rapi di sampul tema undangan.",
    },
  ];

  if (hasQrCheckin) {
    reviewItems.push(
      {
        id: "receptionist",
        badge: "Sistem Resepsionis & QR",
        title: "Portal Scanner Petugas Resepsi",
        desc: `Portal check-in kehadiran tamu hari-H dengan autentikasi PIN Panitia (${formData.staffPin || invitation?.staffPin ? "PIN Telah Diatur" : "Memerlukan PIN"}).`,
        url: receptionistUrl,
        checkLabel: "Saya mengonfirmasi portal resepsionis ini siap diserahkan ke panitia hari-H beserta PIN Keamanan.",
      },
      {
        id: "welcome",
        badge: "Layar Sapa TV",
        title: "Tampilan Layar Sapa Tamu Realtime (/welcome)",
        desc: `Tampilan layar proyektor/TV ruang penerima tamu yang menyapa nama tamu dan nomor meja otomatis saat check-in menggunakan PIN Panitia (${formData.staffPin || invitation?.staffPin ? "PIN Telah Diatur" : "Memerlukan PIN"}).`,
        url: welcomeUrl,
        checkLabel: "Saya memahami layar sapa TV ini menggunakan PIN Keamanan Panitia yang sama untuk menampilkan sambutan tamu secara langsung.",
      }
    );
  }

  if (hasGuestMemories) {
    reviewItems.push(
      {
        id: "memories",
        badge: "Galeri Kenangan Tamu",
        title: "Album & Live Streaming Momen Tamu",
        desc: "Portal galeri live untuk menampilkan seluruh foto candid dan ucapan hangat para tamu.",
        url: memoriesUrl,
        checkLabel: "Saya telah memverifikasi portal album kenangan dan galeri momen tamu dapat dibuka.",
      },
      {
        id: "sharemoment",
        badge: "Form Kamera Tamu",
        title: "Portal Kamera & Unggah Momen Tamu",
        desc: "Portal interaktif bagi para tamu di venue untuk mengambil foto selfie dan mengunggah ucapan secara langsung.",
        url: shareMomentUrl,
        checkLabel: "Saya telah memastikan formulir kamera dan unggah momen tamu siap digunakan.",
      }
    );
  }

  if (hasCustomDomain) {
    reviewItems.push({
      id: "customDomain",
      badge: "Domain Pribadi",
      title: "Alamat Custom Domain Klien",
      desc: "Domain kustom independen yang telah terhubung melalui konfigurasi DNS dan SSL Caddy otomatis.",
      url: `https://${invitation.customDomain}`,
      checkLabel: "Domain pribadi telah terhubung dengan status SSL aktif dan siap mengudara.",
    });
  }

  const allUrlsReviewed = reviewItems.length > 0 && reviewItems.every((item) => !!finalReviewChecks[item.id]);

  const handleCopyOfficialUrl = async () => {
    if (!officialUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(officialUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = officialUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedOfficialUrl(true);
      setTimeout(() => setCopiedOfficialUrl(false), 2000);
    } catch {}
  };

  const handleShareWa = () => {
    const isWedding = !invitation?.eventType || invitation.eventType === "WEDDING";
    const displayName = resolveInvitationDisplayName(invitation);
    const shareText = isWedding
      ? `Halo, kami mengundang Anda untuk menghadiri pernikahan ${displayName}.\n\nInformasi lengkap serta susunan acara dapat dilihat melalui tautan resmi kami berikut:\n${officialUrl}\n\nTerima kasih atas doa dan kehadirannya.`
      : `Halo, kami mengundang Anda untuk menghadiri acara ${displayName}.\n\nInformasi lengkap serta susunan acara dapat dilihat melalui tautan resmi kami berikut:\n${officialUrl}\n\nTerima kasih atas doa dan kehadirannya.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const getEventDateFormatted = () => formatPrimaryEventDate(invitation?.eventData);

  const lifecycleDates = computeLifecycleDates(
    { eventData: invitation?.eventData, galleryExpiresAt: invitation?.galleryExpiresAt },
    lifecycleSettings
  );
  const formatLifecycleDate = (date: Date) => formatDateInEventTimezone(date, getPrimaryEventTimezone(invitation?.eventData));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-medium">Memuat Pengaturan...</p>
        </div>
      </div>
    );
  }

  const settingsCtx = {
    AUDIT_RULES, activeScanIndex, allUrlsReviewed, cancelAudit, copiedOfficialUrl, copiedReviewKey, emptyOptionals, evaluateRule, eventNounLabel, executePublish, finalReviewChecks, formData, formatLifecycleDate, getEventDateFormatted, haltReasons, handleCopyOfficialUrl, handleCopyReviewUrl, handleShareWa, invitation, isInitiatingScan, isReturningToIdle, isWeddingEvent, launchStage, lifecycleDates, normalizedStatus, officialUrl, previewQuery, reviewItems, savingSec, setFinalReviewChecks, setLaunchStage, startSequentialAudit, canUseCustomDomain, cnameTarget, copiedKey, customDomain, customDomainError, customDomainSuccess, editMode, feedback, handleCopyDns, handleSaveSection, hasQrCheckin, isCustomDomainEnabled, isDomainOwned, isStaffPinValid, platformName, router, saveSuccess, savingCustomDomain, serverPublicIp, setCustomDomain, setCustomDomainError, setCustomDomainSuccess, setFormData, setInvitation, setIsDomainOwned, setSavingCustomDomain, setShowDnsGuide, showDnsGuide, subdomainStatus, tier3Name, toggleEdit,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-20">
      
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <PublishLaunchpadSection ctx={settingsCtx} />
      <TechnicalSettingsSection ctx={settingsCtx} />

      <AccountPasswordCard />

    </div>
  );
}
