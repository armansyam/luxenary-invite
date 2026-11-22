"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { compressImageToWebP } from "@/lib/clientImageCompressor";
import type { FreeSectionText } from "@/lib/themeBuilder/texts";
import { isSlotUsed, type ThemeMediaSlots } from "@/lib/themeMediaSlots";

/** Slot yang dipakai tema terpilih; PhotoInput untuk slot lain tidak ditampilkan. */
export const ThemeSlotsContext = createContext<ThemeMediaSlots | null>(null);

let cachedUploadLimits: { video: number; photo: number } | null = null;
let pendingUploadLimits: Promise<{ video: number; photo: number }> | null = null;

function loadUploadLimits(): Promise<{ video: number; photo: number }> {
  if (cachedUploadLimits) return Promise.resolve(cachedUploadLimits);
  if (!pendingUploadLimits) {
    pendingUploadLimits = fetch("/api/public/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        cachedUploadLimits = {
          video: Number(d?.max_video_upload_mb) || 50,
          photo: Number(d?.max_photo_upload_mb) || 15,
        };
        return cachedUploadLimits;
      })
      .catch(() => ({ video: 50, photo: 15 }))
      .finally(() => {
        pendingUploadLimits = null;
      });
  }
  return pendingUploadLimits;
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  subtitle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-bold text-stone-700">{label}</label>
        {subtitle && <span className="text-[10px] text-amber-700 font-semibold">{subtitle}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full p-2.5 rounded-xl text-xs text-stone-900 border transition ${
          disabled
            ? "bg-stone-100/90 border-stone-200 text-stone-500 cursor-not-allowed select-none"
            : "bg-stone-50 border-stone-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
        }`}
      />
    </div>
  );
}

/** Ukuran asli foto/video di peramban; null bila format tidak bisa dibaca peramban (peringatan orientasi dilewati). */
async function readMediaSize(file: File, isVideo: boolean): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    if (isVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("metadata video tidak terbaca"));
      });
      return video.videoWidth && video.videoHeight ? { width: video.videoWidth, height: video.videoHeight } : null;
    }
    const img = new Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoInput(props: Parameters<typeof PhotoInputField>[0]) {
  const declared = useContext(ThemeSlotsContext);
  if (!isSlotUsed(declared, props.slot ?? "")) return null;
  const places = (declared as Record<string, { places: string[] }> | null)?.[props.slot ?? ""]?.places ?? [];
  return <PhotoInputField {...props} desc={places.length ? `${props.desc} Dipakai di: ${places.join(", ")}.` : props.desc} />;
}

export function PhotoInputField({
  label,
  desc,
  value,
  onChange,
  placeholder,
  allowVideo = false,
  invitationId = "",
  slot = "photo",
  defaultUrl = "",
  fallbackColor = "",
  onUploadStart,
  onUploadEnd,
  onUploaded,
  maxVideoMb,
  maxPhotoMb,
  expectOrientation,
}: {
  label: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  allowVideo?: boolean;
  defaultUrl?: string;
  fallbackColor?: string;
  invitationId?: string;
  slot?: string;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  /** Jawaban penuh /api/client/upload setelah unggahan berhasil (mis. saran kepekatan scrim foto latar). */
  onUploaded?: (res: { suggestedBgScrim?: number }) => void;
  maxVideoMb?: number;
  maxPhotoMb?: number;
  /** Orientasi yang dibutuhkan slot ini; unggahan yang berlawanan tetap disimpan tetapi diberi peringatan terpotong. */
  expectOrientation?: "portrait" | "landscape";
}) {
  const [uploading, setUploading] = useState(false);
  const [orientationNote, setOrientationNote] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadError, setUploadError] = useState<{
    title: string;
    message: string;
    fileName?: string;
    fileSize?: string;
  } | null>(null);
  const [dynamicLimits, setDynamicLimits] = useState<{ video: number; photo: number }>({
    video: maxVideoMb || cachedUploadLimits?.video || 50,
    photo: maxPhotoMb || cachedUploadLimits?.photo || 15,
  });

  useEffect(() => {
    if (maxVideoMb && maxPhotoMb) {
      setDynamicLimits({ video: maxVideoMb, photo: maxPhotoMb });
      return;
    }
    let cancelled = false;
    void loadUploadLimits().then((limits) => {
      if (!cancelled) {
        setDynamicLimits({
          video: maxVideoMb || limits.video,
          photo: maxPhotoMb || limits.photo,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [maxVideoMb, maxPhotoMb]);

  const isVideo = Boolean(value && /\.(mp4|webm|mov)(\?.*)?$/i.test(value));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const isVideoFile = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
    const dynamicMaxVideoMb = dynamicLimits.video;
    const dynamicMaxPhotoMb = dynamicLimits.photo;
    const maxVideoSize = dynamicMaxVideoMb * 1024 * 1024;
    const maxPhotoSize = dynamicMaxPhotoMb * 1024 * 1024;

    if (isVideoFile && file.size > maxVideoSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError({
        title: `Ukuran Video Terlalu Besar (Maksimal ${dynamicMaxVideoMb} MB)`,
        message: `File video "${file.name}" berukuran ${sizeMB} MB. Batas maksimal ukuran video adalah ${dynamicMaxVideoMb} MB agar halaman undangan tetap ringan dibuka oleh tamu undangan. Silakan kompres atau potong durasi video (ideal 10–20 detik) terlebih dahulu.`,
        fileName: file.name,
        fileSize: `${sizeMB} MB`,
      });
      e.target.value = "";
      return;
    }

    if (!isVideoFile && file.size > maxPhotoSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError({
        title: `Ukuran Foto Terlalu Besar (Maksimal ${dynamicMaxPhotoMb} MB)`,
        message: `File foto "${file.name}" berukuran ${sizeMB} MB. Batas maksimal ukuran foto adalah ${dynamicMaxPhotoMb} MB. Silakan gunakan foto yang telah dikompres.`,
        fileName: file.name,
        fileSize: `${sizeMB} MB`,
      });
      e.target.value = "";
      return;
    }

    setUploading(true);
    setOrientationNote(null);
    onUploadStart?.();
    try {
      const size = expectOrientation ? await readMediaSize(file, isVideoFile) : null;
      let fileToUpload = file;
      if (!isVideoFile) {
        fileToUpload = await compressImageToWebP(file, {
          maxWidth: slot?.toUpperCase() === "QRIS" ? 800 : 1600,
          maxHeight: slot?.toUpperCase() === "QRIS" ? 800 : 1600,
          quality: 0.82,
        });
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      if (invitationId) formData.append("invitationId", invitationId);
      if (slot) formData.append("slot", slot);

      const res = await fetch("/api/client/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setUploadError(null);
        onChange(data.url);
        onUploaded?.(data);
        if (size) {
          const kind = isVideoFile ? "Video" : "Foto";
          const dims = `${size.width}×${size.height}`;
          if (expectOrientation === "landscape" && size.height > size.width) {
            setOrientationNote(`${kind} ini vertikal (${dims}). Di PC/laptop cover desktop tampil layar penuh, jadi bagian atas dan bawah akan terpotong. Gunakan ${kind.toLowerCase()} landscape 16:9, atau hapus agar Cover Mobile tampil utuh di kolom undangan.`);
          } else if (expectOrientation === "portrait" && size.width > size.height) {
            setOrientationNote(`${kind} ini horizontal (${dims}). Di HP cover tampil layar penuh, jadi sisi kiri dan kanan akan terpotong. Gunakan ${kind.toLowerCase()} portrait 9:16 atau 4:5.`);
          }
        }
      } else {
        setUploadError({
          title: "Gagal Mengunggah Media",
          message: data.error || "Terjadi kendala saat memproses file di server. Silakan coba beberapa saat lagi.",
          fileName: file.name,
        });
      }
    } catch (err: any) {
      setUploadError({
        title: "Koneksi Terputus",
        message: err?.message || "Terjadi gangguan jaringan saat mengunggah file ke server. Silakan periksa koneksi internet Anda.",
        fileName: file.name,
      });
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  };

  return (
    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-colors space-y-2.5 sm:space-y-3 ${uploadError ? "border-rose-300 bg-rose-50/30" : "border-stone-200 bg-stone-50/60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-stone-900">{label}</h4>
          <p className="text-[10px] text-stone-500 leading-tight mt-0.5">{desc}</p>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-800 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{uploadError.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-rose-400 hover:text-rose-700 p-0.5 rounded transition cursor-pointer"
              title="Tutup pesan error"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed pl-5.5">{uploadError.message}</p>
          {uploadError.fileName && (
            <div className="pl-5.5 flex items-center gap-2 pt-0.5 text-[10px] text-rose-600 font-mono">
              <span className="truncate max-w-[220px]">{uploadError.fileName}</span>
              {uploadError.fileSize && (
                <>
                  <span>•</span>
                  <span className="font-bold">{uploadError.fileSize}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {value && orientationNote && (
        <div className="flex items-start gap-1.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] leading-relaxed text-amber-900" role="status">
          <svg className="w-4 h-4 text-amber-600 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{orientationNote}</span>
        </div>
      )}

      <div className="flex items-center gap-3 p-2 bg-white border border-stone-200 rounded-xl">
        <div className="relative w-12 h-16 sm:w-14 sm:h-[4.5rem] rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0 flex items-center justify-center">
          {value ? (
            isVideo ? (
              <video src={value} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={value} alt={label} className="w-full h-full object-cover" />
            )
          ) : defaultUrl ? (
            <img src={defaultUrl} alt={`${label} bawaan tema`} className="w-full h-full object-cover" />
          ) : fallbackColor ? (
            <div className="w-full h-full" style={{ backgroundColor: fallbackColor }} aria-label={`${label}: warna utama tema`} />
          ) : (
            <svg className="w-5 h-5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label={`${label}: belum ada gambar`}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-stone-900 block leading-tight">
            {uploading
              ? "Mengunggah..."
              : value
                ? isVideo ? "Video terpasang" : "Foto terpasang"
                : defaultUrl
                  ? "Bawaan tema"
                  : fallbackColor
                    ? "Warna utama tema"
                    : "Belum ada gambar"}
          </span>
          <p className="text-[11px] text-stone-500 leading-snug mt-0.5">
            {value
              ? defaultUrl || fallbackColor ? "Hapus untuk kembali ke bawaan tema." : "Ganti atau hapus kapan saja."
              : defaultUrl || fallbackColor
                ? "Dipakai sampai Anda mengunggah."
                : allowVideo
                  ? `Foto maks ${dynamicLimits.photo} MB, video maks ${dynamicLimits.video} MB.`
                  : `Foto maks ${dynamicLimits.photo} MB.`}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <label className={`px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg text-[11px] transition ${uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
              {value || defaultUrl || fallbackColor ? "Ganti gambar" : "Unggah gambar"}
              <input
                type="file"
                accept={allowVideo ? "image/*,video/mp4,video/webm,video/quicktime,.mov" : "image/*"}
                className="sr-only"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                title={defaultUrl || fallbackColor ? "Hapus gambar unggahan dan kembali ke bawaan tema" : "Hapus gambar unggahan"}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold rounded-lg text-[11px] transition cursor-pointer disabled:opacity-60"
              >
                Hapus gambar
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[10px] text-stone-500 hover:text-stone-800 underline cursor-pointer ml-auto"
            >
              {showUrlInput ? "Tutup URL" : "Tempel URL"}
            </button>
          </div>
        </div>
      </div>

      {showUrlInput && (
        <div className="pt-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/30 font-mono"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Isian "Teks Seksi Tambahan Tema" per kelompok seksi. Dirender sebagai komponen sendiri karena di dalam EditInvitation
 * React Compiler menganggap updateCustomLabel (yang menyentuh ref iframe pratinjau) dibaca saat render (react-hooks/refs).
 */
export function FreeSectionTextFields({
  freeTexts,
  getValue,
  onChange,
}: {
  freeTexts: FreeSectionText[];
  getValue: (key: string, fallback: string) => string;
  onChange: (key: string, value: string) => void;
}) {
  const groups = [...new Set(freeTexts.map((t) => t.group))];
  return (
    <>
      {groups.map((group) => (
        <div key={group} className="space-y-2 border-t border-stone-200 pt-2 first:border-t-0 first:pt-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{group}</p>
          {freeTexts.filter((t) => t.group === group).map((text) => {
            const common = {
              id: `free-${text.key}`,
              maxLength: text.maxLength,
              value: getValue(text.key, text.value),
              onChange: (e: { target: { value: string } }) => onChange(text.key, e.target.value),
              placeholder: text.value,
              className: "w-full p-2.5 bg-white border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30",
            };
            return (
              <div key={text.key}>
                <label htmlFor={common.id} className="block text-[11px] font-bold text-stone-700 mb-1">{text.label}</label>
                {text.multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function SectionHeaderToggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {sub && <span className="text-[10px] text-stone-400 hidden sm:inline">{sub}</span>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-amber-800" : "bg-stone-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      {label && <span className="text-xs font-semibold text-stone-700">{label}</span>}
    </div>
  );
}

export function SectionHeaderActions({
  isDirty,
  isSaving,
  onSave,
}: {
  isDirty: boolean;
  isSaving?: boolean;
  onSave: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
  closedLabel?: string;
  openLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
      {isDirty && (
        <div className="flex items-center gap-1.5 text-xs animate-in fade-in duration-200">
          <span className="text-amber-800 font-medium">Perubahan belum tersimpan</span>
          <span className="text-stone-300">•</span>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="font-bold text-amber-900 hover:text-stone-900 underline cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      )}
    </div>
  );
}
