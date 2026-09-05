"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getInvitationPublicUrl, getApexRootDomain, resolveEffectiveInvitationUrl } from "@/lib/domainUtils";

export default function SettingsPage() {
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
  const [haltReason, setHaltReason] = useState<string | null>(null);
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
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [isDomainOwned, setIsDomainOwned] = useState(false);
  const [customDomainPrice, setCustomDomainPrice] = useState(150000);
  const [isCustomDomainEnabled, setIsCustomDomainEnabled] = useState(true);
  const [retentionGraceDays, setRetentionGraceDays] = useState(7);
  const [retentionGalleryDays, setRetentionGalleryDays] = useState(30);

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
    try {
      if (!inv?.featureSettings) return defaultValue;
      const fs = typeof inv.featureSettings === "string" ? JSON.parse(inv.featureSettings) : inv.featureSettings;
      if (fs[key] !== undefined) return Boolean(fs[key]);
      return defaultValue;
    } catch {
      return defaultValue;
    }
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
      title: "Visual Sampul & Latar Belakang",
      desc: "Sampul pop-up, sidebar desktop, fixed background, dan foto penutup (Seksi 2)",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) => {
        return (
          checkMediaSlot(inv, "LANDING_COVER") &&
          checkMediaSlot(inv, "DESKTOP_SIDEBAR") &&
          checkMediaSlot(inv, "GLOBAL_FIXED_BG") &&
          checkMediaSlot(inv, "CLOSING_COVER")
        );
      },
      getMissingMessage: (inv: any) => {
        const missing: string[] = [];
        if (!checkMediaSlot(inv, "LANDING_COVER")) missing.push("Sampul Pop-Up / Cover");
        if (!checkMediaSlot(inv, "DESKTOP_SIDEBAR")) missing.push("Sidebar Desktop");
        if (!checkMediaSlot(inv, "GLOBAL_FIXED_BG")) missing.push("Fixed Background");
        if (!checkMediaSlot(inv, "CLOSING_COVER")) missing.push("Foto Penutup");
        return `Slot visual berikut belum diunggah: ${missing.join(", ")}. Harap lengkapi seluruh media visual di Edit Undangan (Seksi 2) agar tidak menggunakan aset demo bawaan tema.`;
      },
      missingMessage: "Kelengkapan visual belum terpenuhi. Harap unggah Foto Sampul Pop-Up, Sidebar Desktop, Fixed Background, dan Foto Penutup di Edit Undangan (Seksi 2).",
    },
    {
      id: "couples",
      title: "Profil Lengkap Kedua Mempelai",
      desc: "Nama mempelai pria & wanita",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) =>
        Boolean(
          inv?.groomName &&
            !inv.groomName.startsWith("Mempelai Pria") &&
            inv?.brideName &&
            !inv.brideName.startsWith("Mempelai Wanita")
        ),
      missingMessage: "Nama lengkap kedua mempelai belum diisi dengan benar. Harap lengkapi nama mempelai di Edit Undangan.",
    },
    {
      id: "couplePhotos",
      title: "Foto Profil Kedua Mempelai",
      desc: "Foto portrait mempelai pria & wanita (Seksi 3)",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) => {
        return checkMediaSlot(inv, "GROOM_PHOTO") && checkMediaSlot(inv, "BRIDE_PHOTO");
      },
      getMissingMessage: (inv: any) => {
        const groomMissing = !checkMediaSlot(inv, "GROOM_PHOTO");
        const brideMissing = !checkMediaSlot(inv, "BRIDE_PHOTO");
        if (groomMissing && brideMissing) {
          return "Foto kedua mempelai (Pria & Wanita) belum diunggah. Harap unggah foto mempelai atau gambar pilihan di Edit Undangan (Seksi 3).";
        }
        if (groomMissing) {
          return "Foto Mempelai Pria belum diunggah. Harap unggah foto mempelai pria di Edit Undangan (Seksi 3).";
        }
        return "Foto Mempelai Wanita belum diunggah. Harap unggah foto mempelai wanita di Edit Undangan (Seksi 3).";
      },
      missingMessage: "Foto profil kedua mempelai belum lengkap diunggah. Harap unggah foto mempelai pria dan wanita di Edit Undangan (Seksi 3).",
    },
    {
      id: "eventDate",
      title: "Tanggal Acara Utama",
      desc: "Referensi masa berlaku website & hitung mundur",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) => {
        try {
          const ev = typeof inv?.eventData === "string" ? JSON.parse(inv.eventData) : inv?.eventData;
          return Array.isArray(ev) && ev.length > 0 && Boolean(ev[0]?.date);
        } catch {
          return false;
        }
      },
      missingMessage: "Tanggal acara utama belum ditentukan. Tanggal ini diperlukan sebagai referensi masa berlaku website dan hitung mundur undangan Anda.",
    },
    {
      id: "location",
      title: "Waktu & Lokasi Acara",
      desc: "Alamat venue dan navigasi peta",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any) => {
        try {
          const ev = typeof inv?.eventData === "string" ? JSON.parse(inv.eventData) : inv?.eventData;
          return Array.isArray(ev) && ev.length > 0 && Boolean(ev[0]?.location);
        } catch {
          return false;
        }
      },
      missingMessage: "Lokasi dan waktu acara pernikahan belum diisi. Harap lengkapi detail lokasi pada Edit Undangan.",
    },
    {
      id: "pin",
      title: "PIN Keamanan Meja Tamu",
      desc: "Sandi petugas resepsionis & check-in QR",
      hasToggle: false,
      isToggledOn: () => true,
      hasData: (inv: any, form: any) =>
        Boolean((form.staffPin || inv?.staffPin) && (form.staffPin || inv?.staffPin).length >= 4),
      missingMessage: "PIN Keamanan Panitia minimal 4 digit belum diatur. Harap atur PIN pada kartu pengaturan di bawah.",
    },
    {
      id: "gallery",
      title: "Galeri Foto & Album Media",
      desc: "Foto pre-wedding dan album kenangan",
      hasToggle: true,
      isToggledOn: (inv: any) => getFeatureToggle(inv, "showGallery", true),
      hasData: (inv: any) => {
        try {
          if (Array.isArray(inv?.media) && inv.media.some((m: any) => m.mediaSlot === "GALLERY")) return true;
          if (inv?.featureSettings) {
            const f = typeof inv.featureSettings === "string" ? JSON.parse(inv.featureSettings) : inv.featureSettings;
            if (Array.isArray(f?.galleryPhotos) && f.galleryPhotos.length > 0) return true;
            if (typeof f?.galleryPhotosList === "string" && f.galleryPhotosList.trim()) return true;
            if (typeof f?.galleryDriveFolderUrl === "string" && f.galleryDriveFolderUrl.trim()) return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      missingMessage: "Seksi Galeri Foto dalam status aktif, namun belum ada foto yang diunggah. Silakan unggah foto di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan.",
    },
    {
      id: "story",
      title: "Cerita Kisah Kasih (Love Story)",
      desc: "Perjalanan cinta kedua mempelai",
      hasToggle: true,
      isToggledOn: (inv: any) => getFeatureToggle(inv, "showStory", true),
      hasData: (inv: any) => {
        try {
          if (!inv?.loveStory) return false;
          const ls = typeof inv.loveStory === "string" ? JSON.parse(inv.loveStory) : inv.loveStory;
          return Array.isArray(ls) && ls.length > 0 && ls.some((s: any) => s?.title?.trim() || s?.story?.trim() || s?.desc?.trim());
        } catch {
          return false;
        }
      },
      missingMessage: "Seksi Cerita Kisah Kasih dalam status aktif, namun belum ada cerita yang diisi. Silakan tulis kisah cinta di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan.",
    },
    {
      id: "bank",
      title: "Rekening & Hadiah Digital",
      desc: "Nomor rekening atau amplop digital",
      hasToggle: true,
      isToggledOn: (inv: any) => getFeatureToggle(inv, "showGift", true),
      hasData: (inv: any) => {
        try {
          if (inv?.featureSettings) {
            const f = typeof inv.featureSettings === "string" ? JSON.parse(inv.featureSettings) : inv.featureSettings;
            if (f?.qrisImageUrl) return true;
          }
          if (!inv?.bankAccounts) return false;
          const ba = typeof inv.bankAccounts === "string" ? JSON.parse(inv.bankAccounts) : inv.bankAccounts;
          return Array.isArray(ba) && ba.length > 0 && ba.some((b: any) => b?.accountNumber?.trim() || b?.bankName?.trim());
        } catch {
          return false;
        }
      },
      missingMessage: "Seksi Rekening & Hadiah Digital dalam status aktif, namun belum ada rekening atau amplop digital yang diisi. Silakan lengkapi di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan.",
    },
    {
      id: "music",
      title: "Musik Latar Pengiring",
      desc: "Lagu romantis pengiring pembukaan",
      hasToggle: true,
      isToggledOn: (inv: any) => getFeatureToggle(inv, "showMusic", true),
      hasData: (inv: any) => Boolean(inv?.musicUrl && inv.musicUrl.trim()),
      missingMessage: "Seksi Musik Latar Pengiring dalam status aktif, namun lagu belum dipilih. Silakan pasang musik di Edit Undangan, atau nonaktifkan sakelar seksi ini jika tidak digunakan.",
    },
  ];

  useEffect(() => {
    fetch("/api/client/invitations", { cache: "no-store" })
      .then((res) => res.json())
      .then(async (invs) => {
        if (Array.isArray(invs) && invs.length > 0) {
          const invBasic = invs[0];
          setInvitation(invBasic);
          setCustomDomain(invBasic.customDomain || "");

          // Ambil staffPin dari endpoint individual yang mendekripsi PIN (ownership check di server)
          let currentPin = invBasic.staffPin || "";
          if (invBasic.id) {
            try {
              const detailRes = await fetch(`/api/client/invitations/${invBasic.id}`);
              if (detailRes.ok) {
                const detail = await detailRes.json();
                currentPin = detail.staffPin || currentPin;
                setInvitation(detail);
              }
            } catch {}
          }

          setFormData({
            subdomain: invBasic.subdomain || "",
            status: invBasic.status || "DRAFT",
            staffPin: currentPin,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("Gagal memuat pengaturan undangan");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.platformName) setPlatformName(d.platformName);
        if (d?.cnameTarget || d?.cname_target) setCnameTarget(d.cnameTarget || d.cname_target);
        if (d?.serverPublicIp || d?.server_public_ip) setServerPublicIp(d.serverPublicIp || d.server_public_ip);
        if (d?.addon_custom_domain_price !== undefined || d?.addonCustomDomainPrice !== undefined) {
          setCustomDomainPrice(Number(d.addon_custom_domain_price ?? d.addonCustomDomainPrice) || 150000);
        }
        if (d?.addon_custom_domain_enabled !== undefined) {
          setIsCustomDomainEnabled(d.addon_custom_domain_enabled !== false);
        }
        if (d?.retentionInvitationGraceDays !== undefined || d?.retention_invitation_grace_days !== undefined) {
          setRetentionGraceDays(Number(d.retentionInvitationGraceDays ?? d.retention_invitation_grace_days) || 7);
        }
        if (d?.retentionGalleryDefaultDays !== undefined || d?.retention_gallery_default_days !== undefined) {
          setRetentionGalleryDays(Number(d.retentionGalleryDefaultDays ?? d.retention_gallery_default_days) || 30);
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
      setHaltReason(null);
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
              const firstFail = failedRules[0];
              const msg = typeof (firstFail as any).getMissingMessage === "function"
                ? (firstFail as any).getMissingMessage(invitation)
                : firstFail.missingMessage;
              setHaltReason(msg);
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
      setHaltReason(null);
      setEmptyOptionals([]);
      setFinalReviewChecks({});
    }, 200);
  };

  const executePublish = async () => {
    if (!invitation?.id || savingSec) return;
    setLaunchStage("PUBLISHING");
    setSavingSec("status");
    setErrorMsg(null);

    try {
      const { media, user, order, guests, rsvps, wishes, ...cleanInvitation } = invitation;
      const payload = {
        ...cleanInvitation,
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
        payload = { staffPin: formData.staffPin ? formData.staffPin.trim() : null };
      }

      const res = await fetch(`/api/client/invitations/${invitation.id}`, {
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
      const portSuffix = port ? `:${port}` : "";
      if (hostname === "localhost" || hostname.endsWith(".localhost")) {
        return `${protocol}//localhost${portSuffix}/${slug}`;
      }
      const root = getApexRootDomain();
      return `${protocol}//${root}${portSuffix}/${slug}`;
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

  const canonicalUrl = getCanonicalUrl(currentSlug);
  const subdomainUrl = getInvitationPublicUrl(currentSub);
  const guestSampleUrl = getInvitationPublicUrl(currentSub, "Nama Tamu");
  const receptionistUrl = subdomainUrl ? `${subdomainUrl.replace(/\/$/, "")}/receptionist` : "";
  const memoriesUrl = subdomainUrl ? `${subdomainUrl.replace(/\/$/, "")}/memories` : "";
  const shareMomentUrl = subdomainUrl ? `${subdomainUrl.replace(/\/$/, "")}/sharemoment` : "";
  const planType = (invitation?.order?.planType || invitation?.planType || "TRADITIONAL").toUpperCase();
  const hasQrCheckin = planType === "MODERN" || planType === "PREMIUM";
  const hasGuestMemories = planType === "PREMIUM";

  const reviewItems: any[] = [
    {
      id: "canonical",
      badge: "Pintu Utama / URL Asli",
      title: "Pintu Utama Website Undangan (Single Source of Truth)",
      desc: "Jangkar URL permanen berbasis slug resmi yang selalu aktif selama masa retensi akun dan tidak akan pernah terhapus.",
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
    reviewItems.push({
      id: "receptionist",
      badge: "Meja Resepsionis & QR",
      title: "Portal Scanner Petugas Resepsi",
      desc: `Portal check-in kehadiran tamu hari-H dengan autentikasi PIN Panitia (${formData.staffPin || invitation?.staffPin ? "PIN Telah Diatur" : "Memerlukan PIN"}).`,
      url: receptionistUrl,
      checkLabel: "Saya mengonfirmasi portal resepsionis ini siap diserahkan ke panitia hari-H beserta PIN Keamanan.",
    });
  }

  if (hasGuestMemories) {
    reviewItems.push(
      {
        id: "memories",
        badge: "Galeri Kenangan Tamu",
        title: "Album & Live Streaming Momen Tamu",
        desc: "Portal galeri live untuk menampilkan seluruh foto candid dan ucapan hangat para tamu (dapat diproyeksikan di layar proyektor venue acara).",
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
    const groom = invitation?.groomNickname || invitation?.groomName || "Mempelai Pria";
    const bride = invitation?.brideNickname || invitation?.brideName || "Mempelai Wanita";
    const shareText = `Halo, kami mengundang Anda untuk menghadiri pernikahan ${groom} & ${bride}.\n\nInformasi lengkap serta susunan acara dapat dilihat melalui tautan resmi kami berikut:\n${officialUrl}\n\nTerima kasih atas doa dan kehadirannya.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const getEventDateFormatted = () => {
    try {
      const ev = typeof invitation?.eventData === "string" ? JSON.parse(invitation.eventData) : invitation?.eventData;
      if (Array.isArray(ev) && ev[0]?.date) {
        const evDate = new Date(ev[0].date);
        if (!isNaN(evDate.getTime())) {
          return evDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }
      }
    } catch {}
    return null;
  };

  const getValidityDate = () => {
    const hasCustomDomain = Boolean(invitation?.customDomain && String(invitation.customDomain).trim());
    const daysToAdd = hasCustomDomain ? 365 : retentionGraceDays;
    try {
      const ev = typeof invitation?.eventData === "string" ? JSON.parse(invitation.eventData) : invitation?.eventData;
      if (Array.isArray(ev) && ev[0]?.date) {
        const evDate = new Date(ev[0].date);
        if (!isNaN(evDate.getTime())) {
          const expiry = new Date(evDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          return expiry.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }
      }
    } catch {}
    return hasCustomDomain ? "1 Tahun Pasca Hari H" : `${retentionGraceDays} Hari Pasca Hari H`;
  };

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-20">
      
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* ──────── HERO LAUNCHPAD: STATUS PUBLIKASI & AUDIT SEKUANSIAL ──────── */}
      {formData.status === "PUBLISHED" ? (
        /* BANNER SELEBRASI RESMI: KATA SAMBUTAN FORMAL & HUB TAUTAN RESMI */
        <div className="bg-stone-900 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            {/* Header Lencana */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Undangan Resmi Telah Mengudara · Terverifikasi Sistem</span>
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                {invitation?.themeId ? `Tema: ${invitation.themeId}` : ""}
              </span>
            </div>

            {/* Sambutan Formal & Netral Layanan Klien */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 leading-tight">
                Selamat Berbahagia untuk {invitation?.groomName || "Mempelai Pria"} &amp; {invitation?.brideName || "Mempelai Wanita"}
              </h2>
              <p className="text-xs sm:text-sm text-stone-300/90 leading-relaxed max-w-2xl">
                Website undangan pernikahan resmi Anda kini telah aktif mengudara dan siap dibagikan kepada keluarga, sahabat, serta seluruh tamu kehormatan.
              </p>
            </div>

            {/* Official Launch Box: Tautan Resmi & Akses */}
            <div className="p-4 sm:p-5 bg-stone-950/80 rounded-2xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Tautan Undangan Resmi (Enkripsi SSL Aktif)</span>
                </span>
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  Aktif &amp; Terlindungi
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs sm:text-sm font-mono font-bold text-amber-300 hover:text-amber-200 hover:underline break-all"
                >
                  {officialUrl}
                </a>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyOfficialUrl}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition border border-stone-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>{copiedOfficialUrl ? "Tersalin!" : "Salin Tautan"}</span>
                  </button>

                  <a
                    href={
                      normalizedStatus === "DRAFT"
                        ? (officialUrl.includes("?") ? `${officialUrl}&preview=true` : `${officialUrl}?preview=true`)
                        : officialUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl text-xs font-semibold transition border border-stone-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Buka Web</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  <button
                    type="button"
                    onClick={handleShareWa}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Bagikan Tautan ke WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="hidden sm:inline">Bagikan</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Informasi Detail Masa Aktif & Tanggal Acara */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-stone-800/50 border border-stone-800 text-xs space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Masa Berlaku Website:</span>
                <p className="text-stone-200 font-medium">
                  Aktif hingga <strong className="text-amber-300">{getValidityDate()}</strong>
                </p>
                <p className="text-[10px] text-stone-400 leading-normal">
                  {invitation?.customDomain
                    ? "Dihitung otomatis 1 tahun pasca tanggal acara (Layanan Custom Domain Aktif)."
                    : `Dihitung otomatis ${retentionGraceDays} hari pasca tanggal acara pernikahan Anda (Masa Aktif Subdomain).`}
                </p>
                {invitation?.planType === "PREMIUM" && (
                  <p className="text-[10px] text-purple-300/90 pt-1 border-t border-stone-700/60 leading-normal">
                    Galeri Kenangan Tamu (/memories) aktif {retentionGalleryDays >= 30 && retentionGalleryDays % 30 === 0 ? `${retentionGalleryDays / 30} bulan (${retentionGalleryDays} hari)` : `${retentionGalleryDays} hari`} pasca-acara.
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-stone-800/50 border border-stone-800 text-xs space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Tanggal Acara Utama:</span>
                <p className="text-stone-200 font-medium">
                  {getEventDateFormatted() ? (
                    <strong className="text-stone-100">{getEventDateFormatted()}</strong>
                  ) : (
                    <span className="text-stone-400 italic">Belum ditentukan</span>
                  )}
                </p>
                <p className="text-[10px] text-stone-400 leading-normal">
                  Referensi hitung mundur dan arsip digital pernikahan.
                </p>
              </div>
            </div>

            {/* Banner Keterhubungan Buku Tamu */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-stone-900 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-100">Buku Tamu Telah Terhubung Otomatis</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                    Tautan khusus untuk setiap tamu kini telah aktif. Anda dapat langsung membagikan undangan personal dengan nama tamu masing-masing melalui menu Buku Tamu.
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/guests"
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Buka Buku Tamu</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* HERO LAUNCHPAD: MODE SEBELUM PUBLIKASI & AUDIT RADAR SEKUANSIAL */
        <div
          className={`text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            launchStage === "SCANNING"
              ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-amber-500/40 shadow-[0_0_50px_-10px_rgba(245,158,11,0.25)]"
              : launchStage === "HALT_MANDATORY"
              ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-rose-500/40 shadow-[0_0_50px_-10px_rgba(244,63,94,0.25)]"
              : launchStage === "REVIEW_OPTIONAL"
              ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-amber-500/40 shadow-[0_0_50px_-10px_rgba(245,158,11,0.25)]"
              : launchStage === "READY_ALL"
              ? "bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-emerald-500/40 shadow-[0_0_50px_-10px_rgba(16,185,129,0.25)]"
              : "bg-stone-900 border border-stone-800 shadow-xl"
          }`}
        >
          {/* Keyframes Animasi Khusus Apple / Luxury Lens Dissolve */}
          <style>{`
            @keyframes luxCardMorphIn {
              0% {
                opacity: 0;
                transform: translateY(16px) scale(0.985);
                filter: blur(6px);
              }
              60% {
                filter: blur(0px);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0px);
              }
            }
            .animate-lux-morph {
              animation: luxCardMorphIn 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          {/* Aura Cahaya Reaktif Latar Belakang */}
          <div
            className={`absolute top-0 right-0 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ease-out ${
              launchStage === "SCANNING"
                ? "w-96 h-96 bg-amber-500/20 translate-x-8 -translate-y-8 animate-pulse"
                : launchStage === "HALT_MANDATORY"
                ? "w-80 h-80 bg-rose-500/20 translate-x-8 -translate-y-8"
                : launchStage === "REVIEW_OPTIONAL"
                ? "w-80 h-80 bg-amber-500/20 translate-x-8 -translate-y-8"
                : launchStage === "READY_ALL"
                ? "w-96 h-96 bg-emerald-500/20 translate-x-8 -translate-y-8 animate-pulse"
                : "w-80 h-80 bg-amber-600/10"
            }`}
          />

          {/* STAGE 1: IDLE */}
          {launchStage === "IDLE" && (
            <div
              className={`relative z-10 space-y-4 transition-all duration-300 ${
                isInitiatingScan ? "opacity-0 -translate-y-2 filter blur-sm scale-[0.99]" : "animate-lux-morph"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Status: Draft (Penyusunan Konten)</span>
                </span>
                <span className="text-[11px] text-stone-400">
                  {AUDIT_RULES.length} Komponen Kesiapan Siap Diperiksa
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-100">
                  Peluncuran Undangan Resmi
                </h2>
                <p className="text-xs sm:text-sm text-stone-400 max-w-2xl leading-relaxed">
                  Lakukan verifikasi menyeluruh kelayakan data sebelum website resmi diaktifkan. Setelah peluncuran, desain tema dan alamat tautan resmi akan dikunci demi menjaga keutuhan tautan tamu dan cetak fisik.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-stone-800/80">
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Pemeriksaan otomatis mencakup tautan, nama mempelai, tanggal acara, media, dan PIN keamanan.</span>
                </div>

                <button
                  type="button"
                  onClick={startSequentialAudit}
                  disabled={isInitiatingScan}
                  className={`w-full sm:w-auto px-6 py-3.5 font-bold rounded-xl text-xs transition-all duration-300 shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                    isInitiatingScan
                      ? "bg-amber-500/80 text-stone-900 scale-95 opacity-90"
                      : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 active:scale-95 hover:shadow-amber-500/20"
                  }`}
                >
                  {isInitiatingScan ? (
                    <>
                      <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyiapkan Pemindai...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Mulai Pemeriksaan &amp; Publikasikan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: SCANNING (FOKUS PENUH DENGAN SLIDING TICKER 3 BARIS) */}
          {launchStage === "SCANNING" && (
            <div
              className={`relative z-10 space-y-5 transition-all duration-300 ${
                isReturningToIdle ? "opacity-0 translate-y-2 filter blur-sm" : "animate-lux-morph"
              }`}
            >
              {/* Radar Scanner Visual & Progress Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-xl border border-amber-500/40 animate-ping opacity-30"></div>
                    <svg className="w-5 h-5 text-amber-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-100">Memeriksa Kesiapan Peluncuran...</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Memverifikasi Bagian {Math.min(activeScanIndex + 1, 10)} dari 10 ({Math.round((Math.min(activeScanIndex + 1, 10) / 10) * 100)}%)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cancelAudit}
                  disabled={isReturningToIdle}
                  className="text-xs text-stone-400 hover:text-white px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 transition cursor-pointer self-start sm:self-auto active:scale-95"
                >
                  {isReturningToIdle ? "Membatalkan..." : "Batalkan"}
                </button>
              </div>

              {/* JENDELA SLIDING TICKER 3 BARIS (Item selesai bergulir naik ke atas) */}
              <div
                className="relative h-[156px] overflow-hidden rounded-2xl bg-stone-950/70 border border-stone-800 p-0 select-none shadow-inner"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                }}
              >
                <div
                  className="transition-transform duration-500 ease-out will-change-transform"
                  style={{
                    transform: `translateY(-${activeScanIndex * 52}px)`,
                  }}
                >
                  {/* Slot 0: Inisialisasi */}
                  <div className="h-[52px] px-4 flex items-center justify-between gap-3 border-b border-stone-800/40 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-stone-300">Inisialisasi Sistem Pemindai Undangan</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">Siap</span>
                  </div>

                  {/* Slot 1-10: Item Audit Sekuensial */}
                  {AUDIT_RULES.map((rule, idx) => {
                    const evalStatus = evaluateRule(rule, invitation, formData);
                    const isCurrent = activeScanIndex === idx;
                    const isPast = activeScanIndex > idx;

                    return (
                      <div
                        key={rule.id}
                        className={`h-[52px] px-4 flex items-center justify-between gap-3 border-b border-stone-800/40 transition-all duration-300 ${
                          isCurrent
                            ? "bg-amber-500/15 border border-amber-500/30 text-white font-bold scale-[1.01]"
                            : isPast
                            ? "opacity-80 text-stone-300"
                            : "opacity-35 text-stone-500"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isPast ? (
                            evalStatus === "PASSED" ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : evalStatus === "DISABLED" ? (
                              <div className="w-6 h-6 rounded-full bg-stone-800/50 border border-stone-700 flex items-center justify-center shrink-0">
                                <span className="w-2 h-0.5 bg-stone-400 rounded-full"></span>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                            )
                          ) : isCurrent ? (
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-stone-800/40 flex items-center justify-center shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-600"></span>
                            </div>
                          )}

                          <div className="truncate">
                            <span className={`text-xs block truncate ${isCurrent ? "text-amber-200 font-bold" : ""}`}>
                              {rule.title}
                            </span>
                            <span className="text-[10px] text-stone-400 block truncate">{rule.desc}</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isPast ? (
                            evalStatus === "PASSED" ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                Terverifikasi
                              </span>
                            ) : evalStatus === "DISABLED" ? (
                              <span className="text-[10px] font-bold text-stone-400 bg-stone-800/60 px-2 py-0.5 rounded-md border border-stone-700">
                                Nonaktif (Dilewati)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                                Wajib Diisi
                              </span>
                            )
                          ) : isCurrent ? (
                            <span className="text-[10px] font-bold text-amber-300 animate-pulse">
                              Memindai...
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-stone-600">
                              Antrean
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Slot 11: Penyelesaian */}
                  <div className="h-[52px] px-4 flex items-center justify-between gap-3 border-b border-stone-800/40 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                      </div>
                      <span className="text-xs font-medium text-stone-300">Menyelesaikan Evaluasi Kelayakan...</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400">Finalisasi</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: HALT MANDATORY (DATA WAJIB BELUM LENGKAP - ELEGAN & POLITE) */}
          {launchStage === "HALT_MANDATORY" && (
            <div
              className={`relative z-10 space-y-5 transition-all duration-300 ${
                isReturningToIdle ? "opacity-0 translate-y-2 filter blur-sm" : "animate-lux-morph"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <span className="px-3 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                  <span>Verifikasi Terhenti Sementara</span>
                </span>
                <span className="text-[11px] text-rose-400/90 font-medium">
                  Syarat Wajib Memerlukan Perhatian
                </span>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-stone-900 to-stone-900 border border-rose-500/30 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-rose-200">
                    Pemeriksaan Belum Lengkap
                  </h4>
                  <p className="text-xs text-rose-300/90 leading-relaxed">
                    {haltReason || "Terdapat data wajib yang belum diisi. Mohon lengkapi data tersebut sebelum menerbitkan undangan."}
                  </p>
                  <p className="text-[11px] text-stone-400 pt-1">
                    Silakan tekan tombol di bawah untuk melengkapi data yang diperlukan. Seluruh form pengaturan akan kembali terbuka secara otomatis.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={cancelAudit}
                  disabled={isReturningToIdle}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 font-semibold rounded-xl text-xs transition border border-stone-700 cursor-pointer"
                >
                  {isReturningToIdle ? "Membuka Pengaturan..." : "Kembali ke Pengaturan"}
                </button>

                {invitation?.id && (
                  <Link
                    href={`/dashboard/invitation/${invitation.id}`}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Buka Edit Undangan</span>
                    <svg className="w-3.5 h-3.5 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* STAGE 4: REVIEW OPTIONAL (DATA WAJIB LENGKAP, DATA OPSIONAL KOSONG) */}
          {launchStage === "REVIEW_OPTIONAL" && (
            <div
              className={`relative z-10 space-y-5 transition-all duration-300 ${
                isReturningToIdle ? "opacity-0 translate-y-2 filter blur-sm" : "animate-lux-morph"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <h3 className="text-base font-bold text-stone-100">Seluruh Syarat Wajib Terpenuhi</h3>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed max-w-2xl">
                  Data utama Anda telah lengkap dan siap mengudara. Kami mencatat beberapa bagian opsional berikut belum Anda isi:
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {emptyOptionals.map((item, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-stone-800/80 border border-stone-700 text-amber-300 text-[11px] font-medium flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={cancelAudit}
                    disabled={isReturningToIdle}
                    className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 rounded-xl text-xs font-semibold transition border border-stone-700 cursor-pointer"
                  >
                    {isReturningToIdle ? "Memulihkan..." : "Kembali & Lengkapi Data"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLaunchStage("READY_ALL")}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Tetap Lanjutkan ke Tinjauan Akhir</span>
                    <svg className="w-3.5 h-3.5 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>

                {/* Catatan Diskret Santun (Bukan Popup Mengganggu) */}
                <p className="text-[11px] text-stone-500 text-right leading-relaxed">
                  Catatan: Setelah proses publikasi, pemilihan tema dan alamat URL resmi akan dikunci demi menjaga keutuhan tautan para tamu serta cetak fisik.
                </p>
              </div>
            </div>
          )}

          {/* STAGE 5: READY ALL / FINAL PRE-FLIGHT REVIEW CHECKLIST */}
          {launchStage === "READY_ALL" && (
            <div
              className={`relative z-10 space-y-5 transition-all duration-300 ${
                isReturningToIdle ? "opacity-0 translate-y-2 filter blur-sm" : "animate-lux-morph"
              }`}
            >
              {/* Header Status & Progress Tinjauan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Verifikasi Data Lengkap · Tinjauan Akhir Instrumen URL</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {reviewItems.filter((i) => !!finalReviewChecks[i.id]).length} / {reviewItems.length}
                  </span>
                  <span className="text-[11px] text-stone-400">URL Dikonfirmasi</span>
                </div>
              </div>

              {/* Deskripsi Edukasi Pre-Flight */}
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-100">
                  Konfirmasi Instrumen URL Resmi Sebelum Rilis
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed max-w-3xl">
                  Seluruh {AUDIT_RULES.length} komponen data telah lolos uji kelayakan. Harap tinjau dan centang konfirmasi pada setiap instrumen URL berikut untuk memastikan Anda memahami fungsinya sebelum tombol rilis resmi diaktifkan.
                </p>
              </div>

              {/* Daftar Kartu URL Interaktif & Checkbox Gatekeeper */}
              <div className="space-y-3">
                {reviewItems.map((item) => {
                  const isChecked = !!finalReviewChecks[item.id];
                  const isCopied = copiedReviewKey === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl transition-all duration-200 border ${
                        isChecked
                          ? "bg-stone-950/80 border-amber-500/40 shadow-xs"
                          : "bg-stone-950/50 border-stone-800 hover:border-stone-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/25">
                            {item.badge}
                          </span>
                          <h4 className="text-xs font-bold text-stone-200">{item.title}</h4>
                        </div>

                        {/* Tombol Aksi Tautan (Buka Tab Baru & Salin) */}
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          {item.url && (
                            <>
                              <a
                                href={
                                  normalizedStatus === "DRAFT" && (item.id === "canonical" || item.id === "subdomain" || item.id === "guest")
                                    ? (item.url.includes("?") ? `${item.url}&preview=true` : `${item.url}?preview=true`)
                                    : item.url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-[11px] font-medium transition flex items-center gap-1.5"
                                title="Buka tautan di tab baru"
                              >
                                <span>Buka Web</span>
                                <svg className="w-3 h-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleCopyReviewUrl(item.url, item.id)}
                                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer"
                                title="Salin tautan"
                              >
                                <span>{isCopied ? "Tersalin!" : "Salin"}</span>
                                <svg className="w-3 h-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-400 leading-relaxed">{item.desc}</p>

                      {/* Box Teks URL */}
                      <div className="my-2 p-2 rounded-xl bg-stone-900/90 border border-stone-800/80 flex items-center overflow-hidden">
                        <span className="font-mono text-xs text-amber-200/90 break-all select-all">
                          {item.url || "Belum dikonfigurasi"}
                        </span>
                      </div>

                      {/* Checkbox Konfirmasi Klien */}
                      <div className="pt-1">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setFinalReviewChecks((prev) => ({
                                ...prev,
                                [item.id]: e.target.checked,
                              }))
                            }
                            className="mt-0.5 w-4 h-4 rounded border-stone-700 bg-stone-900 text-amber-500 focus:ring-amber-500/30 focus:ring-2 cursor-pointer accent-amber-500 shrink-0"
                          />
                          <span
                            className={`text-xs transition ${
                              isChecked ? "text-stone-200 font-semibold" : "text-stone-400 group-hover:text-stone-300"
                            }`}
                          >
                            {item.checkLabel}
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Baris Tombol Aksi Bawah */}
              <div className="pt-3 border-t border-stone-800/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={cancelAudit}
                    disabled={isReturningToIdle}
                    className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 rounded-xl text-xs font-semibold transition border border-stone-700 cursor-pointer"
                  >
                    {isReturningToIdle ? "Memulihkan..." : "Kembali ke Pengaturan"}
                  </button>

                  <button
                    type="button"
                    onClick={executePublish}
                    disabled={!allUrlsReviewed || savingSec === "status"}
                    className={`w-full sm:w-auto px-6 py-3 font-bold rounded-xl text-xs transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
                      allUrlsReviewed && savingSec !== "status"
                        ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-stone-950 shadow-amber-500/25 cursor-pointer"
                        : "bg-stone-800 text-stone-500 border border-stone-700/60 cursor-not-allowed opacity-75"
                    }`}
                  >
                    {savingSec === "status" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Memproses Rilis...</span>
                      </>
                    ) : (
                      <>
                        <span>Rilis Undangan Resmi</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>

                {/* Helper & Catatan Penguncian */}
                <div className="space-y-1 text-right">
                  {!allUrlsReviewed && (
                    <p className="text-[11px] text-amber-400/90 leading-relaxed flex items-center justify-end gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        Harap centang seluruh {reviewItems.length} verifikasi instrumen URL di atas untuk mengaktifkan tombol rilis resmi.
                      </span>
                    </p>
                  )}
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Catatan: Setelah proses rilis resmi, pemilihan tema dan alamat URL akan dikunci demi menjaga keutuhan tautan para tamu serta cetak fisik.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 6: PUBLISHING (PROSES PENGUNCIAN & RENDERING) */}
          {launchStage === "PUBLISHING" && (
            <div className="relative z-10 py-6 text-center space-y-3 animate-lux-morph">
              <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h4 className="text-sm font-bold text-stone-100">Menerbitkan Website Undangan Resmi...</h4>
              <p className="text-xs text-stone-400">
                Memanggang file HTML mandiri dan sinkronisasi CDN global (Zero-Flicker)...
              </p>
            </div>
          )}
        </div>
      )}

      {/* ──────── PENGATURAN TEKNIS LAINNYA (SLIDE ATAS / GULIR MENGHILANG SECARA ELEGAN SAAT INSPEKSI) ──────── */}
      <div
        className={`space-y-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform will-change-transform ${
          (launchStage !== "IDLE" && launchStage !== "SUCCESS") || isInitiatingScan
            ? "opacity-0 -translate-y-12 max-h-0 pointer-events-none overflow-hidden scale-[0.985] mt-0 invisible"
            : "opacity-100 translate-y-0 max-h-[5000px] pointer-events-auto overflow-visible scale-100 mt-6 visible"
        }`}
        style={{
          transitionProperty: "opacity, transform, max-height, margin, visibility, filter",
        }}
      >
        {/* CARD 1: SUBDOMAIN */}
        <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Alamat Tautan Subdomain</h3>
              <p className="text-xs text-stone-500">Tentukan alamat URL eksklusif undangan pernikahan Anda</p>
            </div>
            {formData.status !== "PUBLISHED" && (
              <button
                type="button"
                onClick={() => toggleEdit("subdomain")}
                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                {editMode.subdomain ? "Tutup" : "Edit"}
              </button>
            )}
          </div>

          {formData.status === "PUBLISHED" ? (
            /* Mode Rincian Terkunci Pasca Publikasi */
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tautan Subdomain:</span>
                  <span className="px-2 py-0.5 bg-stone-200 text-stone-700 text-[10px] font-semibold rounded-md flex items-center gap-1">
                    <svg className="w-3 h-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Terkunci Pasca Publikasi</span>
                  </span>
                </div>
                <a
                  href={getInvitationPublicUrl(formData.subdomain || invitation?.subdomain || "")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs sm:text-sm font-mono font-bold text-amber-900 hover:underline break-all"
                >
                  {getInvitationPublicUrl(formData.subdomain || invitation?.subdomain || "")}
                </a>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                  Tautan ini telah terkunci secara otomatis demi melindungi keterhubungan QR Code di cetakan fisik Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyOfficialUrl}
                className="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
              >
                {copiedOfficialUrl ? "Tersalin!" : "Salin Tautan"}
              </button>
            </div>
          ) : !editMode.subdomain ? (
            /* Summary Mode Saat Draft */
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Tautan Subdomain:</span>
                {formData.subdomain ? (
                  <a
                    href={getInvitationPublicUrl(formData.subdomain)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs sm:text-sm font-mono font-bold text-amber-900 hover:underline break-all"
                  >
                    {getInvitationPublicUrl(formData.subdomain)}
                  </a>
                ) : (
                  <span className="text-xs sm:text-sm font-mono text-stone-400 italic">
                    Belum dikonfigurasi
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleEdit("subdomain")}
                className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
              >
                Ubah Tautan
              </button>
            </div>
          ) : (
            /* Form Edit Mode Saat Draft */
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-stone-700">Nama Subdomain</label>
                  {subdomainStatus.state === "checking" && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Memeriksa...</span>
                    </span>
                  )}
                  {subdomainStatus.state === "available" && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <span>Tersedia</span>
                    </span>
                  )}
                  {subdomainStatus.state === "unavailable" && (
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                      <span>Sudah dipakai</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 overflow-hidden focus-within:border-amber-700 focus-within:ring-2 focus-within:ring-amber-700/20">
                  <span className="pl-3.5 pr-1 text-xs text-stone-400 font-mono select-none">
                    {typeof window !== "undefined" && window.location.protocol === "http:" ? "http://" : "https://"}
                  </span>
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setFormData({ ...formData, subdomain: val });
                    }}
                    placeholder="mempelai-wanita-pria"
                    className="flex-1 py-3 px-1 text-xs text-stone-900 font-mono font-bold bg-transparent focus:outline-none"
                  />
                  <span className="pr-3.5 pl-1 text-xs text-stone-400 font-mono select-none">.{getApexRootDomain()}</span>
                </div>

                {subdomainStatus.message && (
                  <p
                    className={`text-[10px] mt-1.5 ${
                      subdomainStatus.state === "available"
                        ? "text-emerald-700"
                        : subdomainStatus.state === "unavailable"
                        ? "text-rose-600"
                        : "text-stone-500"
                    }`}
                  >
                    {subdomainStatus.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                {saveSuccess.subdomain && (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    Tersimpan
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveSection("subdomain")}
                  disabled={
                    savingSec === "subdomain" ||
                    subdomainStatus.state === "unavailable" ||
                    subdomainStatus.state === "checking"
                  }
                  className={`px-5 py-2 font-bold rounded-xl text-xs transition flex items-center gap-1.5 ${
                    subdomainStatus.state === "unavailable" || subdomainStatus.state === "checking"
                      ? "bg-stone-200 text-stone-400 border border-stone-300 cursor-not-allowed"
                      : "bg-stone-900 hover:bg-stone-800 text-white cursor-pointer"
                  }`}
                >
                  {savingSec === "subdomain" ? "Menyimpan..." : "Simpan Subdomain"}
                </button>
              </div>
            </div>
          )}
        </div>

      {/* CARD 3: SECURITY PIN */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">PIN Keamanan Panitia</h3>
            <p className="text-xs text-stone-500">Sandi rahasia (6 karakter) untuk mengakses Resepsionis, Booth, dan Proyektor</p>
          </div>
          <button
            type="button"
            onClick={() => toggleEdit("staffPin")}
            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            {editMode.staffPin ? "Tutup" : "Edit"}
          </button>
        </div>

        {!editMode.staffPin ? (
          /* Summary Mode */
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">PIN Saat Ini:</span>
              <span className="inline-block mt-1 text-lg font-mono font-black tracking-widest text-amber-900">
                {formData.staffPin}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleEdit("staffPin")}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto"
            >
              Ubah PIN
            </button>
          </div>
        ) : (
          /* Form Edit Mode */
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">Masukkan PIN Baru</label>
              <input
                type="text"
                maxLength={10}
                value={formData.staffPin}
                onChange={(e) => setFormData({ ...formData, staffPin: e.target.value })}
                placeholder="Contoh: 123456"
                className="w-full py-3 px-4 rounded-xl border border-stone-200 bg-stone-50 text-sm font-mono font-bold focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 transition"
              />
              <p className="text-[10px] mt-1.5 text-stone-500">
                Bisa berupa angka atau huruf. Akan diminta saat membuka link fitur operasional.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              {saveSuccess.staffPin && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  Tersimpan
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSection("staffPin")}
                disabled={savingSec === "staffPin" || !formData.staffPin}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingSec === "staffPin" ? "Menyimpan..." : "Simpan PIN"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────── CUSTOM DOMAIN ──────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900 leading-tight">Domain Sendiri</h2>
            <p className="text-[11px] text-stone-400 mt-0.5">Gunakan domain pribadi Anda (mis. undangan-kami.com) sebagai pengganti subdomain {platformName || "platform kami"}.</p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            !invitation?.customDomain && !isCustomDomainEnabled
              ? "bg-amber-100/70 text-amber-900 border-amber-300"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            {!invitation?.customDomain && !isCustomDomainEnabled ? "Segera Hadir" : "Premium"}
          </span>
        </div>

        {planType !== "PREMIUM" && !invitation?.customDomain ? (
          /* Mode Terkunci: Eksklusif Paket Premium */
          <div className="p-5 rounded-2xl border border-violet-200 bg-violet-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-800 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Eksklusif untuk Paket Premium</h4>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed max-w-xl">
                  Layanan integrasi nama domain pribadi (.com / .id) dan retensi galeri kenangan tamu 1 tahun penuh tersedia eksklusif pada Paket Premium. Tingkatkan paket Anda untuk menikmati fitur ini.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <a
                href={invitation?.id ? `/dashboard/invitation/${invitation.id}` : "#"}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                <span>Upgrade ke Premium</span>
              </a>
            </div>
          </div>
        ) : !invitation?.customDomain && !isCustomDomainEnabled ? (
          /* Mode Segera Hadir / Belum Tersedia */
          <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50/80 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Layanan Integrasi Domain Pribadi Segera Hadir</h4>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed max-w-xl">
                  Fitur integrasi nama domain pribadi (.com / .id / lainnya) sedang dalam tahap finalisasi dan belum dibuka untuk umum. Undangan Anda tetap dapat diakses eksklusif melalui tautan subdomain yang sudah aktif.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-block px-3.5 py-2 bg-stone-200 text-stone-500 text-xs font-bold rounded-xl cursor-not-allowed select-none">
                Belum Tersedia
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Panduan DNS */}
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDnsGuide((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition cursor-pointer"
          >
            <span className="text-xs font-bold text-stone-700">Cara setup — 3 langkah mudah</span>
            <svg
              className={`w-4 h-4 text-stone-400 transition-transform ${showDnsGuide ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDnsGuide && (
            <div className="px-4 pb-4 space-y-3 border-t border-stone-100 pt-3 bg-stone-50/50">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Setelah membeli domain di registrar (Niagahoster, Namecheap, Domainesia, dll), ikuti langkah berikut:
              </p>

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-xs font-bold text-stone-800">Login ke panel DNS domain Anda</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Buka bagian DNS Management / DNS Zone di registrar tempat Anda membeli domain.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">2</div>
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-xs font-bold text-stone-800">Tambahkan 2 DNS Record berikut di registrar domain Anda:</p>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Sesuai standar registrar, pasang <strong>Record A</strong> untuk domain utama (apex) dan <strong>Record CNAME</strong> untuk awalan www.
                    </p>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-stone-200 text-[11px] shadow-xs">
                    <div className="grid grid-cols-12 bg-stone-100 px-3 py-2 text-[10px] font-bold text-stone-600 uppercase tracking-wider border-b border-stone-200">
                      <span className="col-span-2">Tipe</span>
                      <span className="col-span-3">Host / Name</span>
                      <span className="col-span-5">Value / Target</span>
                      <span className="col-span-2 text-right">Aksi</span>
                    </div>

                    {/* Baris 1: Record A untuk Root Domain Apex */}
                    <div className="grid grid-cols-12 px-3 py-2.5 bg-white items-center border-b border-stone-100 text-stone-800 font-mono">
                      <span className="col-span-2 font-bold text-emerald-700 font-sans text-xs">A</span>
                      <div className="col-span-3">
                        <span className="font-bold">@</span>
                        <span className="text-[10px] text-stone-400 block font-sans font-normal">(Root Apex)</span>
                      </div>
                      <div className="col-span-5">
                        <span className="font-bold text-stone-900 break-all">{serverPublicIp || "IP Server Belum Diatur"}</span>
                        <span className="text-[10px] text-stone-400 block font-sans font-normal">IP Publik Server VPS</span>
                      </div>
                      <div className="col-span-2 text-right font-sans">
                        {serverPublicIp ? (
                          <button
                            type="button"
                            onClick={() => handleCopyDns(serverPublicIp, "ip")}
                            className="px-2 py-1 text-[10px] font-bold rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 transition cursor-pointer"
                          >
                            {copiedKey === "ip" ? "Disalin!" : "Salin"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">N/A</span>
                        )}
                      </div>
                    </div>

                    {/* Baris 2: Record CNAME untuk www */}
                    <div className="grid grid-cols-12 px-3 py-2.5 bg-stone-50/50 items-center text-stone-800 font-mono">
                      <span className="col-span-2 font-bold text-amber-700 font-sans text-xs">CNAME</span>
                      <div className="col-span-3">
                        <span className="font-bold">www</span>
                        <span className="text-[10px] text-stone-400 block font-sans font-normal">(Subdomain)</span>
                      </div>
                      <div className="col-span-5">
                        <span className="font-bold text-stone-900 break-all">{cnameTarget || "Target CNAME Belum Diatur"}</span>
                        <span className="text-[10px] text-stone-400 block font-sans font-normal">Host Target CNAME</span>
                      </div>
                      <div className="col-span-2 text-right font-sans">
                        {cnameTarget ? (
                          <button
                            type="button"
                            onClick={() => handleCopyDns(cnameTarget, "cname")}
                            className="px-2 py-1 text-[10px] font-bold rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 transition cursor-pointer"
                          >
                            {copiedKey === "cname" ? "Disalin!" : "Salin"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-stone-100/70 border border-stone-200 text-[10px] text-stone-600 leading-relaxed">
                    <strong>Catatan Subdomain Khusus:</strong> Jika Anda ingin menggunakan subdomain tertentu (contoh: <code>wedding.namakamu.com</code>), cukup tambahkan 1 record <strong>CNAME</strong> dengan Host <code>wedding</code> mengarah ke <code>{cnameTarget || "target CNAME"}</code>.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-xs font-bold text-stone-800">Daftarkan domain di bawah ini & hubungi Admin</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Setelah DNS propagasi (biasanya 5–30 menit), isi field domain di bawah dan simpan. Lalu kirim pesan ke Admin agar SSL-nya diaktifkan.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  <strong>Propagasi DNS</strong> bisa memakan waktu hingga 48 jam tergantung registrar, namun biasanya selesai dalam 5–30 menit.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input domain */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-stone-700">Domain Anda</label>
          <div className="space-y-3">
            {!showBuyModal ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Integrasikan Domain Pribadi Anda</h4>
                  <p className="text-[11px] text-amber-700/80 mt-1">Punya domain sendiri dari Niagahoster/lainnya? Kami bantu pasangkan ke undangan ini (Gratis SSL & Perpanjangan Aktif 1 Tahun). Biaya Jasa Integrasi: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(customDomainPrice)}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBuyModal(true)}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition whitespace-nowrap"
                >
                  Pesan Jasa Integrasi
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-2">
                  <h5 className="text-red-800 font-bold text-xs mb-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    PENTING: BUKAN PENDAFTARAN DOMAIN BARU
                  </h5>
                  <p className="text-red-700 text-[11px] leading-relaxed">
                    Sistem <b>TIDAK</b> akan mendaftarkan domain baru untuk Anda. Kami hanya menyambungkan domain yang <b>SUDAH ANDA BELI SENDIRI</b> dari registrar (Niagahoster, Rumahweb, dll) ke server undangan ini. Jangan memesan layanan ini jika Anda belum memiliki domain.
                  </p>
                </div>
                
                <label className="block text-[11px] font-bold text-stone-700">Masukkan Nama Domain Anda (Contoh: budi-ani.com)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => {
                      setCustomDomain(e.target.value.toLowerCase().replace(/\s/g, ""));
                      setCustomDomainError(null);
                    }}
                    placeholder="contoh: undangan-kami.com"
                    className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 bg-white text-sm font-mono focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 transition"
                  />
                </div>
                
                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-stone-200">
                  <input 
                    type="checkbox" 
                    id="confirm-domain" 
                    className="mt-0.5 rounded text-amber-700 focus:ring-amber-700 cursor-pointer"
                    checked={isDomainOwned}
                    onChange={(e) => setIsDomainOwned(e.target.checked)}
                  />
                  <label htmlFor="confirm-domain" className="text-[11px] text-stone-600 leading-snug cursor-pointer select-none">
                    Saya menyatakan bahwa saya <b>TELAH MEMBELI & MEMILIKI</b> nama domain di atas secara sah. Saya memahami bahwa dana yang telah dibayarkan untuk Jasa Integrasi ini tidak dapat di-refund jika ternyata domain belum dibeli.
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={savingCustomDomain || !customDomain || !invitation?.id || !isDomainOwned}
                    onClick={async () => {
                      if (!isDomainOwned) {
                        setCustomDomainError("Anda harus mencentang persetujuan kepemilikan domain.");
                        return;
                      }
                      setSavingCustomDomain(true);
                      setCustomDomainError(null);
                      try {
                        const response = await fetch("/api/client/custom-domain/buy", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            invitationId: invitation.id,
                            requestedDomain: customDomain
                          })
                        });
                        const resData = await response.json();
                        if (response.ok && resData.paymentUrl) {
                          window.location.href = resData.paymentUrl;
                        } else {
                          setCustomDomainError(resData.error || "Gagal membuat invoice");
                        }
                      } catch (err: any) {
                        setCustomDomainError(err.message || "Terjadi kesalahan jaringan");
                      }
                      setSavingCustomDomain(false);
                    }}
                    className={`px-4 py-2 bg-amber-800 text-white font-bold rounded-xl text-xs whitespace-nowrap transition flex items-center justify-center min-w-[120px] ${(!customDomain || !isDomainOwned) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-900'}`}
                  >
                    {savingCustomDomain ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Memproses...</span>
                      </span>
                    ) : (
                      "Bayar Jasa"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {customDomainError && (
            <p className="text-[11px] text-red-600 font-medium">{customDomainError}</p>
          )}
          {customDomainSuccess && (
            <p className="text-[11px] text-emerald-600 font-semibold">Domain berhasil disimpan. Hubungi Admin untuk aktivasi SSL.</p>
          )}
          {invitation?.customDomain && !customDomainSuccess && (
            <p className="text-[11px] text-stone-400">
              Domain aktif saat ini: <span className="font-mono font-bold text-stone-700">{invitation.customDomain}</span>
            </p>
          )}
        </div>
      </>
    )}
  </div>
      </div>

    </div>
  );
}
