"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function BoothClient({ invitationId }: { invitationId: string }) {

  // Booth States: 'SCAN', 'CONFIRM_GUEST', 'RECORDING', 'PREVIEW', 'SUCCESS'
  const [stage, setStage] = useState<"SCAN" | "CONFIRM_GUEST" | "RECORDING" | "PREVIEW" | "SUCCESS">("SCAN");
  const [tokenInput, setTokenInput] = useState("");
  const [guest, setGuest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recording states
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const recordedPlaybackRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // 1. Scan Token Handler
  const handleVerifyToken = async (tokenToVerify?: string) => {
    const token = tokenToVerify || tokenInput.trim();
    if (!token) {
      setErrorMsg("Masukkan Token atau Pindai QR Code tamu.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/booth/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: token, invitationId }),
      });
      const data = await res.json();

      if (data.success) {
        setGuest(data.guest);
        setStage("CONFIRM_GUEST");
      } else {
        setErrorMsg(data.error || "QR Code tidak valid.");
      }
    } catch (err) {
      setErrorMsg("Terjadi gangguan koneksi jaringan.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Start Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      setMediaStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      setStage("RECORDING");
    } catch (err) {
      setErrorMsg("Gagal mengakses kamera & mikrofon perangkat.");
    }
  };

  // 3. Start Recording
  const startRecording = () => {
    if (!mediaStream) return;
    setRecordedChunks([]);
    setRecordingSeconds(0);

    const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: "video/webm" });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.start();
    setIsRecording(true);

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        if (prev >= 30) {
          stopRecording();
          return 30;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // 4. Stop Recording
  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }

    setTimeout(() => {
      setStage("PREVIEW");
    }, 400);
  };

  useEffect(() => {
    if (stage === "PREVIEW" && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      if (recordedPlaybackRef.current) {
        recordedPlaybackRef.current.src = url;
      }
    }
  }, [stage, recordedChunks]);

  // 5. Submit Video to Server
  const handleUploadVideo = async () => {
    if (recordedChunks.length === 0 || !guest) return;

    setLoading(true);
    setErrorMsg(null);

    const videoBlob = new Blob(recordedChunks, { type: "video/webm" });
    const formData = new FormData();
    formData.append("qrToken", tokenInput.trim() || guest.qrToken);
    formData.append("video", videoBlob, "wish.webm");

    try {
      const res = await fetch("/api/booth/upload-video", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setStage("SUCCESS");
        setTimeout(() => {
          resetBooth();
        }, 6000);
      } else {
        setErrorMsg(data.error || "Gagal mengunggah video.");
      }
    } catch (err) {
      setErrorMsg("Koneksi gagal saat mengunggah video.");
    } finally {
      setLoading(false);
    }
  };

  const resetBooth = () => {
    setStage("SCAN");
    setTokenInput("");
    setGuest(null);
    setErrorMsg(null);
    setRecordedChunks([]);
    setRecordedVideoUrl(null);
    setRecordingSeconds(0);
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#2d2926] flex flex-col justify-between p-6 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#eadecf] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-800 flex items-center justify-center text-white font-bold font-serif text-lg">
            L
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-wide text-amber-900">
              VIDEO WISHES BOOTH
            </h1>
            <p className="text-xs text-[#786f66]">Perekam Ucapan &amp; Doa Restu Tamu di Lokasi Acara</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-[#6e675f] hover:text-amber-900 border border-[#d8cdbf] rounded-lg px-3.5 py-1.5 transition bg-white"
        >
          Tutup Booth
        </Link>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-xl bg-white border border-[#eadecf] rounded-3xl p-8 shadow-sm relative">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
              {errorMsg}
            </div>
          )}

          {/* STAGE 1: SCAN QR CODE */}
          {stage === "SCAN" && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-serif font-bold text-[#1e1c1a] mb-1">Pindai QR Code Undangan</h2>
                <p className="text-[#6e675f] text-sm">
                  Arahkan scanner barcode ke QR Code tamu atau ketikkan token tamu di bawah:
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyToken()}
                  placeholder="Tempel / Ketik Token QR Tamu..."
                  className="w-full p-4 bg-[#faf7f2] border border-[#d8cdbf] rounded-2xl text-center font-mono text-base text-amber-900 focus:border-amber-800 outline-none"
                />

                <button
                  onClick={() => handleVerifyToken()}
                  disabled={loading}
                  className="w-full py-4 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-2xl transition shadow-sm disabled:opacity-50 text-sm"
                >
                  {loading ? "Memvalidasi..." : "Verifikasi Tamu"}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: CONFIRM GUEST */}
          {stage === "CONFIRM_GUEST" && guest && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">Tamu Terdaftar</span>
                <h2 className="text-3xl font-serif font-bold text-[#1e1c1a] mt-1">{guest.name}</h2>
                <p className="text-[#6e675f] text-sm mt-1">Kategori: {guest.category || "Umum"}</p>
              </div>

              <p className="text-[#524d45] text-sm bg-[#faf7f2] p-4 rounded-xl border border-[#eadecf] leading-relaxed">
                Silakan rekam video ucapan dan doa terbaik Anda untuk kedua mempelai (maksimal 30 detik).
              </p>

              <div className="flex gap-3">
                <button
                  onClick={resetBooth}
                  className="flex-1 py-3.5 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={startCamera}
                  className="flex-2 py-3.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-2xl transition text-sm shadow-sm"
                >
                  Buka Kamera &amp; Mulai
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: RECORDING */}
          {stage === "RECORDING" && (
            <div className="text-center space-y-4">
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-800/30 bg-black aspect-video flex items-center justify-center shadow-inner">
                <video ref={videoPreviewRef} playsInline muted className="w-full h-full object-cover" />

                {isRecording && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white font-bold px-3 py-1 rounded-full text-xs flex items-center gap-2 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                    REC {30 - recordingSeconds}s tersisa
                  </div>
                )}
              </div>

              <div className="pt-2">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl transition shadow-md text-sm"
                  >
                    Mulai Rekam Ucapan
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-full py-4 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-2xl transition text-sm shadow-sm"
                  >
                    Selesai Merekam
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STAGE 4: PREVIEW & CONFIRM */}
          {stage === "PREVIEW" && (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-serif font-bold text-[#1e1c1a]">Pratinjau Video Ucapan</h2>
              <div className="rounded-2xl overflow-hidden border-2 border-amber-800/20 bg-black aspect-video">
                <video ref={recordedPlaybackRef} controls playsInline className="w-full h-full object-cover" />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={startCamera}
                  disabled={loading}
                  className="flex-1 py-3.5 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  Rekam Ulang
                </button>
                <button
                  onClick={handleUploadVideo}
                  disabled={loading}
                  className="flex-2 py-3.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-2xl transition text-sm shadow-sm disabled:opacity-50"
                >
                  {loading ? "Menyimpan ke Cloud..." : "Kirim Video Ucapan"}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 5: SUCCESS */}
          {stage === "SUCCESS" && (
            <div className="text-center space-y-6 py-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center mx-auto text-emerald-700">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h2 className="text-3xl font-serif font-bold text-[#1e1c1a]">Terima Kasih Banyak!</h2>
                <p className="text-[#524d45] text-base mt-2">
                  Video ucapan Anda telah berhasil tersimpan dan diteruskan ke mempelai.
                </p>
                <p className="text-xs text-amber-800/80 mt-4">
                  Layar akan kembali otomatis dalam beberapa detik untuk tamu berikutnya...
                </p>
              </div>

              <button
                onClick={resetBooth}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm"
              >
                Tamu Berikutnya
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#8c8276]">
        Luxenary Video Wishes Booth — Single-Use QR Security Active
      </footer>
    </div>
  );
}
